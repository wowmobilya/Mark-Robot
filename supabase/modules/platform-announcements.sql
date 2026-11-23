-- Apply after owner-approval-alerts. Only service-role RPCs expose message contents.
begin;

create table if not exists wow_notify.announcements (
  id uuid primary key default gen_random_uuid(),
  sender uuid not null,
  request_id uuid not null,
  workspace_id uuid references public.wow_workspaces(id) on delete cascade,
  category text not null check (category in ('general','maintenance','update','security','subscription','service')),
  title text not null check (length(title) between 1 and 120),
  body text not null check (length(body) between 1 and 2500),
  with_push boolean not null,
  confirmation text not null check (confirmation ~ '^[0-9a-f]{64}$'),
  recipient_count integer not null check (recipient_count>0),
  push_jobs integer not null default 0 check (push_jobs>=0),
  created_at timestamptz not null default now(),
  unique(sender,request_id)
);
create table if not exists wow_notify.announcement_recipients (
  announcement_id uuid not null references wow_notify.announcements(id) on delete cascade,
  workspace_id uuid not null references public.wow_workspaces(id) on delete cascade,
  account_id uuid not null references public.wow_accounts(id) on delete cascade,
  read_at timestamptz,
  primary key (announcement_id,account_id)
);
create index if not exists announcement_inbox on wow_notify.announcement_recipients(account_id,workspace_id,announcement_id);
create index if not exists announcement_workspace on wow_notify.announcement_recipients(workspace_id);
create index if not exists announcement_sender_time on wow_notify.announcements(sender,created_at);
alter table wow_notify.announcements enable row level security;
alter table wow_notify.announcement_recipients enable row level security;
revoke all on wow_notify.announcements,wow_notify.announcement_recipients from public,anon,authenticated;

create or replace function public.wow_announcement_service(p_user uuid,p_session uuid,p_action text,p_data jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
  wid uuid; req uuid; cursor_id uuid; cursor_time timestamptz;
  subject text; message text; category_name text; with_push boolean;
  recipients jsonb; confirmation text; recipient_count integer; queued_count integer=0;
  campaign wow_notify.announcements; items jsonb; unread integer; next_cursor uuid;
begin
  if p_action in ('preview','send') then
    perform public.wow_platform_require(p_user,p_session);
    begin
      wid=(p_data->>'workspaceId')::uuid;req=(p_data->>'requestId')::uuid;
    exception when invalid_text_representation then raise exception 'INVALID_ANNOUNCEMENT';end;
    subject=btrim(p_data->>'title');message=btrim(p_data->>'text');category_name=p_data->>'category';
    if jsonb_typeof(p_data->'title') is distinct from 'string' or jsonb_typeof(p_data->'text') is distinct from 'string'
      or jsonb_typeof(p_data->'push') is distinct from 'boolean' or length(subject) not between 1 and 120
      or length(message) not between 1 and 2500 or subject~E'[\r\n]'
      or coalesce(category_name,'') not in ('general','maintenance','update','security','subscription','service')
      or req is null then raise exception 'INVALID_ANNOUNCEMENT';end if;
    with_push=(p_data->>'push')::boolean;

    if p_action='send' then
      perform pg_advisory_xact_lock(hashtextextended('wow-announcement:'||p_user::text,0));
      select * into campaign from wow_notify.announcements a where a.sender=p_user and a.request_id=req;
      if found then
        if campaign.workspace_id is distinct from wid or campaign.category<>category_name or campaign.title<>subject or campaign.body<>message
          or campaign.with_push<>with_push or campaign.confirmation is distinct from p_data->>'confirmation' then raise exception 'IDEMPOTENCY_MISMATCH';end if;
        return jsonb_build_object('id',campaign.id,'recipients',campaign.recipient_count,'pushJobs',campaign.push_jobs,'replayed',true);
      end if;
    end if;

    select coalesce(jsonb_agg(jsonb_build_object('account_id',a.id,'workspace_id',a.workspace_id) order by a.id),'[]'::jsonb),count(*)
      into recipients,recipient_count
      from public.wow_accounts a join public.wow_workspaces w on w.id=a.workspace_id and w.status='active'
      where a.id<>p_user and a.status='active' and a.deleted_at is null and (a.expires_at is null or a.expires_at>now())
        and (wid is null or wid=w.id);
    confirmation=encode(sha256(convert_to(jsonb_build_array(p_user,req,wid,category_name,subject,message,with_push,recipients)::text,'UTF8')),'hex');
    if p_action='preview' then return jsonb_build_object('recipients',recipient_count,'confirmation',confirmation);end if;
    if confirmation is distinct from p_data->>'confirmation' or recipient_count=0 then raise exception 'INVALID_CONFIRMATION';end if;
    if (select count(*) from wow_notify.announcements a where a.sender=p_user and a.created_at>now()-interval '1 hour')>=12
      then raise exception 'RATE_LIMITED';end if;

    insert into wow_notify.announcements(sender,request_id,workspace_id,category,title,body,with_push,confirmation,recipient_count)
      values(p_user,req,wid,category_name,subject,message,with_push,confirmation,recipient_count) returning * into campaign;
    insert into wow_notify.announcement_recipients(announcement_id,workspace_id,account_id)
      select campaign.id,r.workspace_id,r.account_id from jsonb_to_recordset(recipients) as r(workspace_id uuid,account_id uuid);
    if with_push then
      with events as (
        insert into public.wow_push_events(workspace_id,recipient_id,record_store,record_id,record_revision,kind,action,details,created_at)
          select r.workspace_id,r.account_id,'announcement',jsonb_build_object('id',campaign.id,'recipient',r.account_id),0,
            'platform.announcement','created','{}'::jsonb,campaign.created_at
          from wow_notify.announcement_recipients r where r.announcement_id=campaign.id
            and exists(select from public.wow_push_active_devices d where d.workspace_id=r.workspace_id and d.account_id=r.account_id
              and d.bound_at<=campaign.created_at and d.device_id not like 'admin-approval-%')
          returning id,workspace_id,recipient_id
      )
      insert into public.wow_push_jobs(event_id,subscription_id)
        select e.id,d.id from events e join public.wow_push_active_devices d on d.workspace_id=e.workspace_id and d.account_id=e.recipient_id
          and d.bound_at<=campaign.created_at and d.device_id not like 'admin-approval-%';
      get diagnostics queued_count=row_count;
      update wow_notify.announcements set push_jobs=queued_count where id=campaign.id;
    end if;
    return jsonb_build_object('id',campaign.id,'recipients',recipient_count,'pushJobs',queued_count,'replayed',false);
  end if;

  if p_action is null or p_action not in ('inbox','read') then raise exception 'INVALID_ACTION';end if;
  wid=(public.wow_actor(p_user,p_session,null,false,false)->>'workspaceId')::uuid;
  if p_action='read' then
    begin req=(p_data->>'id')::uuid;exception when invalid_text_representation then raise exception 'INVALID_REQUEST';end;
    update wow_notify.announcement_recipients set read_at=coalesce(read_at,now())
      where announcement_id=req and account_id=p_user and workspace_id=wid;
    if not found then raise exception 'ACCESS_DENIED';end if;
    return jsonb_build_object('read',true);
  end if;

  begin cursor_id=(p_data->>'cursor')::uuid;exception when invalid_text_representation then raise exception 'INVALID_CURSOR';end;
  if cursor_id is not null then
    select a.created_at into cursor_time from wow_notify.announcement_recipients r join wow_notify.announcements a on a.id=r.announcement_id
      where a.id=cursor_id and r.workspace_id=wid and r.account_id=p_user;
    if not found then raise exception 'INVALID_CURSOR';end if;
  end if;
  select coalesce(jsonb_agg(jsonb_build_object('id',d.id,'category',d.category,'title',d.title,'body',d.body,'createdAt',d.created_at,
    'read',d.read_at is not null) order by d.created_at desc,d.id desc),'[]'::jsonb) into items
  from (select a.*,r.read_at from wow_notify.announcement_recipients r join wow_notify.announcements a on a.id=r.announcement_id
    where r.workspace_id=wid and r.account_id=p_user and (cursor_id is null or (a.created_at,a.id)<(cursor_time,cursor_id))
    order by a.created_at desc,a.id desc limit 21) d;
  if jsonb_array_length(items)>20 then next_cursor=(items->19->>'id')::uuid;items=items-20;end if;
  select count(*) into unread from wow_notify.announcement_recipients r where r.workspace_id=wid and r.account_id=p_user and r.read_at is null;
  return jsonb_build_object('announcements',items,'unread',unread,'nextCursor',next_cursor);
end $$;
revoke all on function public.wow_announcement_service(uuid,uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.wow_announcement_service(uuid,uuid,text,jsonb) to service_role;

-- Authentication, event source and payload are checked again when a delivery is leased.
create or replace function wow_notify.announcement_payload(p_source uuid,p_workspace uuid,p_recipient uuid)
returns jsonb language sql stable security definer set search_path='' as $$
  select jsonb_build_object('route','notifications')
  from wow_notify.announcement_recipients r
  join wow_notify.announcements n on n.id=r.announcement_id and n.with_push and n.created_at>now()-interval '24 hours'
  join public.wow_workspaces w on w.id=r.workspace_id and w.status='active'
  join public.wow_accounts a on a.id=r.account_id and a.workspace_id=r.workspace_id and a.status='active' and a.deleted_at is null
    and (a.expires_at is null or a.expires_at>now())
  where r.announcement_id=p_source and r.workspace_id=p_workspace and r.account_id=p_recipient and r.read_at is null;
$$;
revoke all on function wow_notify.announcement_payload(uuid,uuid,uuid) from public,anon,authenticated;

alter table public.wow_push_events drop constraint if exists wow_push_events_source_check;
alter table public.wow_push_events add constraint wow_push_events_source_check check (
  (actor_id is not null and recipient_id is null and
    ((record_store='invoices' and kind='proforma') or
     (record_store='payments' and kind='payment') or
     (record_store='settings' and kind in ('expense','receipt')) or
     (record_store='test' and kind='test'))) or
  (recipient_id is not null and actor_id is null and details='{}'::jsonb and
    jsonb_typeof(record_id)='object' and jsonb_typeof(record_id->'id')='string'
    and record_id ?& array['id','recipient'] and record_id->>'recipient'=recipient_id::text
    and ((record_store='chat' and kind='chat')
      or (record_store='gallery' and kind in ('order.created','order.updated','stock.updated'))
      or (record_store='operations' and kind='operations')
      or (record_store='voice' and kind in ('call','call.missed'))
      or (record_store='owner-approval' and kind='owner.approval')
      or (record_store='announcement' and kind='platform.announcement')
      or (record_store='support' and kind in ('support.ticket','support.reply'))))
);
create or replace function wow_notify.payload(p_kind text,p_source text,p_workspace uuid,p_recipient uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare notice jsonb;
begin
  if p_kind='platform.announcement' then
    return wow_notify.announcement_payload(p_source::uuid,p_workspace,p_recipient);
  elsif p_kind='owner.approval' then
    select jsonb_build_object('workspaceId',r.workspace_id) into notice
    from public.wow_owner_approval_requests r
    join public.wow_accounts applicant on applicant.id=r.owner_id and applicant.workspace_id=r.workspace_id
      and applicant.role='owner' and applicant.status='suspended' and applicant.deleted_at is null
    join public.wow_workspaces company on company.id=r.workspace_id and company.status='active'
    join public.wow_platform_owners founder on founder.user_id=p_recipient and founder.active
    join public.wow_accounts admin on admin.id=founder.user_id and admin.workspace_id=p_workspace
      and admin.status='active' and admin.deleted_at is null and (admin.expires_at is null or admin.expires_at>now())
    where r.owner_id=p_source::uuid and r.approved_at is null;
  elsif p_kind in ('support.ticket','support.reply') then
    select jsonb_build_object('route',case when p_kind='support.ticket' then 'founder-support' else 'member-support' end)
      into notice from wow_support.messages m join wow_support.cases c on c.id=m.case_id
      join public.wow_accounts a on a.id=p_recipient and a.workspace_id=p_workspace and a.status='active' and a.deleted_at is null
      join public.wow_workspaces w on w.id=a.workspace_id and w.status='active'
      left join wow_support.receipts r on r.case_id=c.id and r.reader=p_recipient and r.founder_view=(p_kind='support.ticket')
      where m.id=p_source::uuid and m.sender<>p_recipient and m.seq>coalesce(r.seen,0) and (a.expires_at is null or a.expires_at>now())
        and ((p_kind='support.reply' and m.from_founder and c.author=p_recipient and c.workspace_id=p_workspace)
        or (p_kind='support.ticket' and not m.from_founder and exists(select from public.wow_platform_owners o where o.user_id=p_recipient and o.active)));
  elsif p_kind='chat' then
    select jsonb_strip_nulls(jsonb_build_object('roomId',n.room_id,'messageId',n.message_id::text,'expiresAt',m.expires_at))
      into notice from wow_collab.chat_notifications n join wow_collab.messages m
        on m.id=n.message_id and m.room_id=n.room_id
      where n.message_id=p_source::bigint and n.recipient_id=p_recipient and n.workspace_id=p_workspace
        and public.wow_chat_push_allowed(n.workspace_id,n.recipient_id,n.room_id,n.message_id);
  elsif p_kind in ('call','call.missed') then
    select jsonb_build_object('callId',c.id,'roomId',c.room_id,'mediaKind',c.kind,'callerName',left(caller.name,80),
      'expiresAt',case when p_kind='call' then c.ring_until else c.created_at+interval '24 hours' end)
    into notice from wow_voice.calls c
    join wow_voice.participants p on p.call_id=c.id and p.account_id=p_recipient
    join wow_collab.rooms room on room.id=c.room_id and room.active and room.workspace_id=c.workspace_id
    join wow_collab.members m on m.room_id=c.room_id and m.account_id=p_recipient and m.state='active'
    join public.wow_accounts recipient on recipient.id=p_recipient and recipient.workspace_id=c.workspace_id
    join public.wow_accounts caller on caller.id=c.caller_id and caller.workspace_id=c.workspace_id
    where c.id=p_source::uuid and c.workspace_id=p_workspace and p.account_id<>c.caller_id
      and ((p_kind='call' and c.status in ('ringing','active') and p.status='invited' and c.ring_until>now() and c.expires_at>now())
        or (p_kind='call.missed' and c.ring_until<=now() and c.created_at>now()-interval '24 hours'
          and c.status<>'declined' and p.joined_at is null and p.status in ('invited','left')))
      and
      wow_collab.eligible(recipient) and wow_collab.eligible(caller)
      and wow_collab.room_allowed(recipient.id,recipient.role,room)
      and (recipient.role='owner' or
        'chat.view'=any(recipient.permissions) and 'chat.edit'=any(recipient.permissions))
      and exists(select from wow_collab.members cm where cm.room_id=c.room_id and cm.account_id=c.caller_id and cm.state='active');
  elsif p_kind in ('order.created','order.updated','stock.updated') then
    notice=public.wow_gallery_notice_payload(p_source::uuid,p_recipient);
    if notice->>'workspaceId' is distinct from p_workspace::text
      or notice->>'kind' is distinct from p_kind then return null;end if;
  elsif p_kind='operations' then
    notice=public.wow_operations_notice_payload(p_source::bigint,p_recipient);
    if notice->>'workspaceId' is distinct from p_workspace::text then return null;end if;
  end if;
  return notice;
end $$;
revoke all on function wow_notify.payload(text,text,uuid,uuid) from public,anon,authenticated;

commit;
