begin;
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
      or (record_store='support' and kind in ('support.ticket','support.reply'))))
);
create or replace function wow_notify.payload(p_kind text,p_source text,p_workspace uuid,p_recipient uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare notice jsonb;
begin
  if p_kind='owner.approval' then
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

create index if not exists wow_owner_approval_waiting on public.wow_owner_approval_requests(requested_at,workspace_id) where approved_at is null;

create or replace function public.wow_platform_owner_alerts(p_user uuid,p_session uuid,p_offset integer)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
 perform public.wow_platform_require(p_user,p_session);
 if p_offset is null or p_offset<0 then raise exception 'INVALID_REQUEST';end if;
 with waiting as (
   select r.workspace_id as id,w.name as company,a.name as applicant,a.username,r.requested_at
   from public.wow_owner_approval_requests r
   join public.wow_accounts a on a.id=r.owner_id and a.workspace_id=r.workspace_id and a.role='owner' and a.status='suspended' and a.deleted_at is null
   join public.wow_workspaces w on w.id=r.workspace_id and w.status='active'
   where r.approved_at is null
 ), page as (select * from waiting order by requested_at,id limit 20 offset p_offset)
 select jsonb_build_object('total',(select count(*) from waiting),'requests',coalesce(jsonb_agg(jsonb_build_object(
   'workspaceId',id,'company',company,'applicant',applicant,'username',username) order by requested_at,id),'[]'::jsonb))
 into result from page;
 return result;
end $$;
revoke all on function public.wow_platform_owner_alerts(uuid,uuid,integer) from public,anon,authenticated;
grant execute on function public.wow_platform_owner_alerts(uuid,uuid,integer) to service_role;

create or replace function wow_notify.enqueue_owner_approval() returns trigger
language plpgsql security definer set search_path='' as $$
declare recipient record; event_id_new uuid;
begin
 if new.approved_at is not null then return new;end if;
 for recipient in select distinct d.workspace_id,d.account_id from public.wow_push_active_devices d
   join public.wow_platform_owners founder on founder.user_id=d.account_id and founder.active
   where d.bound_at<=new.requested_at
 loop
   insert into public.wow_push_events(workspace_id,recipient_id,record_store,record_id,record_revision,kind,action,details,created_at)
   values(recipient.workspace_id,recipient.account_id,'owner-approval',jsonb_build_object('id',new.owner_id,'recipient',recipient.account_id),
     0,'owner.approval','created','{}',new.requested_at)
   on conflict(workspace_id,record_store,record_id,record_revision,kind) do nothing returning id into event_id_new;
   if event_id_new is not null then
     insert into public.wow_push_jobs(event_id,subscription_id) select event_id_new,d.id from public.wow_push_active_devices d
     where d.workspace_id=recipient.workspace_id and d.account_id=recipient.account_id and d.bound_at<=new.requested_at
     on conflict(event_id,subscription_id) do nothing;
   end if;
 end loop;
 return new;
end $$;
revoke all on function wow_notify.enqueue_owner_approval() from public,anon,authenticated;
drop trigger if exists wow_owner_request_push on public.wow_owner_approval_requests;
create trigger wow_owner_request_push after insert on public.wow_owner_approval_requests for each row execute function wow_notify.enqueue_owner_approval();
-- The admin service worker is a separate subscription from the company app.
-- Keep unrelated tenant payloads out of this scope, even when the founder also owns a company.
create or replace function wow_notify.filter_admin_push_job() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if exists(select from public.wow_push_subscriptions s where s.id=new.subscription_id and starts_with(s.device_id,'admin-approval-'))
    and not exists(select from public.wow_push_events e where e.id=new.event_id and e.kind='owner.approval') then return null;end if;
 return new;
end $$;
revoke all on function wow_notify.filter_admin_push_job() from public,anon,authenticated;
drop trigger if exists wow_admin_subscription_scope on public.wow_push_jobs;
create trigger wow_admin_subscription_scope before insert on public.wow_push_jobs for each row execute function wow_notify.filter_admin_push_job();
commit;
