-- Immutable, consented statement snapshots. Only the server worker can read PDF bytes.
begin;
create table if not exists wow_mail.statements(
 id uuid primary key,workspace_id uuid not null references public.wow_workspaces,author uuid not null references public.wow_accounts,
 epoch bigint not null,company_id jsonb not null,channel text not null check(channel in('email','whatsapp')),
 destination text not null,scheduled_at timestamptz not null,zone text not null,created_at timestamptz not null default now(),
 fingerprint text not null,pdf bytea, label text not null,
 status text not null default 'queued' check(status in('queued','sending','accepted','failed','uncertain','cancelled')),
 started_at timestamptz,receipt text
);
alter table wow_mail.statements enable row level security;
revoke all on wow_mail.statements from public,anon,authenticated;
create index if not exists wow_statement_due on wow_mail.statements(scheduled_at) where status='queued';
create index if not exists wow_statement_scope on wow_mail.statements(workspace_id,company_id,created_at desc);
create or replace function wow_limits.storage_used(wid uuid) returns bigint language sql stable set search_path='' as $$
 select coalesce((select sum(size) from public.wow_media_uploads where workspace_id=wid),0)
      + coalesce((select sum(bytes) from wow_collab.files where workspace_id=wid and state<>'removed'),0)
      + coalesce((select sum(bytes) from wow_collab.chat_assets where workspace_id=wid and state<>'removed'),0)
      + coalesce((select sum(size_bytes) from public.wow_gallery_assets where workspace_id=wid and lifecycle<>'removed'),0)
      + coalesce((select sum(octet_length(pdf)) from wow_mail.statements where workspace_id=wid and pdf is not null),0);
$$;
drop trigger if exists wow_plan_admission on wow_mail.statements;
create trigger wow_plan_admission after insert on wow_mail.statements for each row execute function wow_limits.admit();
create or replace function wow_mail.statement_access(ctx jsonb) returns boolean language sql immutable set search_path='' as $$
 select wow_mail.can(ctx,'payments.export') and wow_mail.can(ctx,'invoices.view') and wow_mail.can(ctx,'customers.view')
 and wow_mail.can(ctx,'communications.edit') and wow_mail.can(ctx,'communications.export');
$$;
create or replace function public.wow_statement_service(p_action text,p_data jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid=(p_data->>'userId')::uuid; sid uuid=(p_data->>'sessionId')::uuid; ctx jsonb;wid uuid;k jsonb=p_data->'companyId'; j wow_mail.statements;
 dest text;channel_name text=p_data->>'channel'; contact jsonb; mark text; snapshot bytea; send_at timestamptz; result jsonb;
begin
 ctx=public.wow_actor(uid,sid,null,true,p_action<>'statement.list');wid=(ctx->>'workspaceId')::uuid;
 if not wow_mail.statement_access(ctx) then raise exception 'ACCESS_DENIED';end if;
 contact=wow_mail.source(ctx,'company',k);
 if p_action='statement.list' then
   select coalesce(jsonb_agg(to_jsonb(s) order by s."scheduledAt" desc),'[]') into result from
    (select id,channel,status,scheduled_at as "scheduledAt",zone from wow_mail.statements where workspace_id=wid and author=uid and company_id=k order by created_at desc limit 50) s;
   return jsonb_build_object('items',result,'contact',contact,'workspaceId',wid);
 end if;
 perform 1 from public.wow_workspaces where id=wid for no key update;
 select * into j from wow_mail.statements where id=(p_data->>'id')::uuid for update;
 if j.id is not null and (j.workspace_id<>wid or j.author<>uid or j.company_id<>k) then raise exception 'ACCESS_DENIED';end if;
 if p_action='statement.cancel' then
   if j.id is null or j.status not in ('queued','cancelled') then raise exception 'CONFLICT';end if;
   update wow_mail.statements set status='cancelled',pdf=null where id=j.id;return jsonb_build_object('status','cancelled');
 end if;
 if p_data->>'expectedWorkspace' is distinct from wid::text then raise exception 'ACCESS_DENIED';end if;
 if p_action<>'statement.schedule' or p_data->'consent' is distinct from 'true'::jsonb or channel_name not in ('email','whatsapp') then raise exception 'INVALID_REQUEST';end if;
 dest=contact->>(case channel_name when 'email' then 'email' else 'phone' end);
 if coalesce(dest,'')='' or dest is distinct from p_data->>'destination' then raise exception 'INVALID_RECIPIENT_CHANGED';end if;
 mark=encode(extensions.digest(convert_to((p_data-array['userId','sessionId'])::text,'UTF8'),'sha256'),'hex');
 if j.id is not null then if mark<>j.fingerprint then raise exception 'CONFLICT';end if;return jsonb_build_object('status',j.status);end if;
 send_at=(p_data->>'scheduledAt')::timestamptz;
 if send_at is null or send_at<=now() or send_at>now()+interval '1 year' or not exists(select from pg_timezone_names where name=p_data->>'zone') then raise exception 'INVALID_SCHEDULE';end if;
 if length(p_data->>'pdf')>2796204 or length(p_data->>'label') not between 1 and 120 then raise exception 'INVALID_STATEMENT';end if;
 snapshot=decode(p_data->>'pdf','base64');if snapshot is null or octet_length(snapshot) not between 12 and 2097152 or substring(snapshot from 1 for 5)<>decode('255044462d','hex') then raise exception 'INVALID_STATEMENT';end if;
 if (select count(*) from wow_mail.statements where workspace_id=wid and status in ('queued','sending'))>=50 or
 (select count(*) from wow_mail.statements where workspace_id=wid and created_at>now()-interval '24 hours')>=100 then raise exception 'RATE_LIMITED';end if;
 insert into wow_mail.statements(id,workspace_id,author,epoch,company_id,channel,destination,scheduled_at,zone,fingerprint,pdf,label)
 values((p_data->>'id')::uuid,wid,uid,(ctx#>>'{account,sessionVersion}')::bigint,k,channel_name,dest,send_at,p_data->>'zone',mark,snapshot,p_data->>'label');
 return jsonb_build_object('status','queued');
end $$;
create or replace function public.wow_statement_worker(p_action text,p_data jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare j wow_mail.statements;ctx jsonb;contact jsonb;
begin
 if p_action='claim' then
   update wow_mail.statements set status='cancelled',pdf=null where status='queued' and scheduled_at<now()-interval '24 hours';
   update wow_mail.statements set status='uncertain',pdf=null where status='sending' and started_at<now()-interval '10 minutes';
   select s.* into j from wow_mail.statements s join public.wow_workspaces w on w.id=s.workspace_id and w.status='active'
    where s.status='queued' and s.scheduled_at<=now() and s.channel in(select jsonb_array_elements_text(p_data->'channels'))
    and not exists(select from wow_ops.settings o where o.workspace_id=w.id and not o.enabled)
    order by s.scheduled_at,s.id for update of s skip locked limit 1;
   if j.id is null then return '{}';end if;
   select jsonb_build_object('workspaceId',j.workspace_id,'account',public.wow_profile(a)) into ctx from public.wow_accounts a
    join auth.users u on u.id=a.id where a.id=j.author and a.workspace_id=j.workspace_id and a.status='active' and a.deleted_at is null
    and a.session_version=j.epoch and (a.expires_at is null or a.expires_at>now()) and u.deleted_at is null and not coalesce(u.is_anonymous,false)
    and (u.banned_until is null or u.banned_until<=now());
   if wow_mail.statement_access(ctx) then begin contact=wow_mail.source(ctx,'company',j.company_id);exception when others then contact=null;end;end if;
   if j.destination is distinct from contact->>(case j.channel when 'email' then 'email' else 'phone' end) then
    update wow_mail.statements set pdf=null,status='cancelled' where id=j.id;return '{}';end if;
   update wow_mail.statements set status='sending',started_at=now() where id=j.id;
   return jsonb_build_object('id',j.id,'workspace',j.workspace_id,'channel',j.channel,'destination',j.destination,'label',j.label,'pdf',replace(encode(j.pdf,'base64'),chr(10),''));
 elsif p_action='finish' and p_data->>'status' in('accepted','failed','uncertain') then
   update wow_mail.statements set pdf=null,status=p_data->>'status',receipt=left(p_data->>'receipt',180)
    where id=(p_data->>'id')::uuid and status='sending';return '{}';
 end if;raise exception 'INVALID_ACTION';
end $$;
revoke all on function public.wow_statement_service(text,jsonb),public.wow_statement_worker(text,jsonb),wow_mail.statement_access(jsonb) from public,anon,authenticated;
grant execute on function public.wow_statement_service(text,jsonb),public.wow_statement_worker(text,jsonb) to service_role;
create or replace function public.wow_communications_wake() returns bigint
language plpgsql security definer set search_path='' as $$
declare worker record;request_id bigint;
begin
 if not exists(select from wow_mail.messages m join public.wow_workspaces w on w.id=m.workspace
  left join wow_ops.settings s on s.workspace_id=w.id where m.archived_at is null and m.status in('queued','sending','retry')
  and coalesce(m.lease_until,m.next_attempt_at)<=now() and w.status='active' and coalesce(s.enabled,true))
  and not exists(select from wow_mail.statements j where j.status='queued' and j.scheduled_at<=now()
    or j.status='sending' and j.started_at<now()-interval '10 minutes') then return null;end if;
 select * into worker from wow_ops.storage_worker();if worker.endpoint is null then return null;end if;
 update public.wow_push_control set mail_last_wake_at=clock_timestamp() where singleton and (mail_last_wake_at is null or mail_last_wake_at<clock_timestamp()-interval '45 seconds');
 if not found then return null;end if;
 select net.http_post(url:=worker.endpoint,headers:=jsonb_build_object('Content-Type','application/json','X-Wow-Worker-Token',worker.worker_token),body:='{}'::jsonb,timeout_milliseconds:=120000) into request_id;
 return request_id;
end $$;
commit;
