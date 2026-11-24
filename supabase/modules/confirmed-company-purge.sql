begin;
create schema if not exists wow_purge;
revoke all on schema wow_purge from public,anon,authenticated;

-- A committed intent keeps a multi-batch Storage removal suspended across retries.
create table if not exists wow_purge.intents (
 workspace_id uuid primary key references public.wow_workspaces(id),
 actor_id uuid not null references auth.users(id),
 confirmed_at timestamptz not null default now()
);
alter table wow_purge.intents enable row level security;
revoke all on wow_purge.intents from public,anon,authenticated;

create or replace function wow_purge.guard_pending() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if exists(select from wow_purge.intents where workspace_id=old.id)
    and (new.status<>'suspended' or new.name<>old.name) then
   raise exception 'COMPANY_DELETION_PENDING';
 end if;
 return new;
end $$;
revoke all on function wow_purge.guard_pending() from public,anon,authenticated;
drop trigger if exists wow_guard_pending_purge on public.wow_workspaces;
create trigger wow_guard_pending_purge before update of name,status on public.wow_workspaces
for each row execute function wow_purge.guard_pending();

create or replace function wow_purge.company(p_user uuid,p_session uuid,p_action text,p_data jsonb)
returns jsonb language plpgsql security definer set search_path='' as $purge$
declare
 wid uuid;
 ws public.wow_workspaces;
 fk record;
 occupied boolean;
 linked boolean;
 blocked boolean;
 pending boolean;
 objects jsonb;
 unknown_storage boolean;
 account_ids uuid[];
 auth_ids uuid[];
begin
 perform public.wow_platform_require(p_user,p_session);
 if p_action not in ('company.deletePreview','company.deleteEmpty') then raise exception 'UNKNOWN_ACTION'; end if;
 wid=(p_data->>'workspaceId')::uuid;
 select * into ws from public.wow_workspaces where id=wid for update;
 if not found then
   if p_action='company.deleteEmpty' and exists(select from public.wow_platform_company_deletion_log
     where workspace_id=wid and company_name=p_data->>'confirmName' and actor_id=p_user) then
     return jsonb_build_object('workspaceId',wid,'deleted',true);
   end if;
   raise exception 'COMPANY_NOT_FOUND';
 end if;
 select exists(select from wow_purge.intents where workspace_id=wid) into pending;
 select coalesce(array_agg(a.id),'{}'::uuid[]) into account_ids from public.wow_accounts a where a.workspace_id=wid;
 select coalesce(array_agg(a.id),'{}'::uuid[]) into auth_ids
 from public.wow_accounts a join auth.users u on u.id=a.id
 where a.workspace_id=wid and a.login_email=u.email and u.email ~ '^[0-9a-f-]{36}@wow[.]invalid$'
   and not exists(select from public.wow_platform_owners p where p.user_id=a.id);
 -- Keep the founder workspace protected even after an administrator renames it.
 blocked=lower(ws.name) like '%galer%' or exists(select from public.wow_platform_owners where user_id=any(account_ids));
 select coalesce(jsonb_agg(jsonb_build_object('bucket',bucket_id,'path',name) order by name),'[]') into objects
 from (select bucket_id,name from storage.objects
       where bucket_id='mark-robot-private' and
        (name like wid::text||'/%' or name like 'chat/'||wid::text||'/%' or name like 'files/'||wid::text||'/%')
       order by name limit 20) batch;
 -- Unexpected workspace paths require manual inspection. Never remove another tenant's objects.
 select exists(select from storage.objects where wid::text=any(string_to_array(name,'/')) and
   not (bucket_id='mark-robot-private' and (name like wid::text||'/%' or name like 'chat/'||wid::text||'/%' or name like 'files/'||wid::text||'/%'))) into unknown_storage;
 blocked=blocked or unknown_storage or exists(
   select from wow_notify.announcements a join wow_notify.announcement_recipients r on r.announcement_id=a.id
   where a.workspace_id=wid and r.workspace_id is distinct from wid
 ) or exists(select from wow_notify.announcement_recipients where account_id=any(account_ids) and workspace_id is distinct from wid)
   or exists(select from public.wow_client_device_observations where account_id=any(account_ids) and workspace_id is distinct from wid);
 linked=pending or cardinality(account_ids)>0 or jsonb_array_length(objects)>0;
 if not linked then
   for fk in
     select n.nspname ns,r.relname rel,a.attname col from pg_catalog.pg_constraint k
     join pg_catalog.pg_class r on r.oid=k.conrelid join pg_catalog.pg_namespace n on n.oid=r.relnamespace
     join pg_catalog.pg_attribute a on a.attrelid=k.conrelid and a.attnum=k.conkey[1]
     where k.contype='f' and k.confrelid='public.wow_workspaces'::regclass and cardinality(k.conkey)=1
   loop
     if (fk.ns='public' and fk.rel in ('wow_setup_claims','wow_platform_company_audit','wow_platform_inspection_audit'))
        or (fk.ns='wow_ops' and fk.rel in ('settings','runs')) or fk.ns='wow_purge' then continue; end if;
     execute format('select exists(select from %I.%I where %I=$1)',fk.ns,fk.rel,fk.col) into occupied using wid;
     if occupied then linked=true;exit;end if;
   end loop;
 end if;
 if p_action='company.deletePreview' then
   return jsonb_build_object('workspaceId',wid,'name',ws.name,'revision',ws.control_revision,
     'allowed',not blocked,'hasLinkedData',linked,'permanent',true,
     'blockers',case when blocked then jsonb_build_array(case when unknown_storage then 'unknown.storage' else 'protected.company' end) else '[]'::jsonb end);
 end if;
 if blocked then raise exception 'COMPANY_HAS_DATA'; end if;
 if p_data->'confirmed' is distinct from 'true'::jsonb or p_data->>'confirmName' is distinct from ws.name
    or p_data->>'expectedRevision' is distinct from ws.control_revision::text
    or p_data->>'confirmWord1' is distinct from 'حذف'
    or (linked and (p_data->>'confirmWord2' is distinct from 'حذف' or p_data->'acceptsLinkedData' is distinct from 'true'::jsonb)) then
    raise exception 'CONFIRMATION_REQUIRED';
 end if;
 insert into wow_purge.intents(workspace_id,actor_id) values(wid,p_user) on conflict(workspace_id) do nothing;
 update public.wow_workspaces set status='suspended' where id=wid and status<>'suspended';
 if jsonb_array_length(objects)>0 then
   return jsonb_build_object('workspaceId',wid,'deleted',false,'pendingStorage',objects);
 end if;
 -- Abort the entire transaction on an unexpected FK, trigger failure or other error.
 -- Only this transaction and this workspace may pass the last-owner and finance-mirror guards.
 perform set_config('wow_purge.workspace',wid::text,true);
 delete from public.wow_account_installations where account_id=any(account_ids);
 delete from public.wow_audit where workspace_id=wid;
 delete from public.wow_batches where workspace_id=wid;
 delete from public.wow_client_device_observations where workspace_id=wid;
 delete from public.wow_company_join_requests where workspace_id=wid;
 delete from public.wow_gallery_assets where workspace_id=wid;
 delete from public.wow_gallery_commands where workspace_id=wid;
 delete from public.wow_gallery_listings where workspace_id=wid;
 delete from public.wow_gallery_notification_outbox where workspace_id=wid;
 delete from public.wow_gallery_presentation where workspace_id=wid;
 delete from public.wow_gallery_print_profiles where workspace_id=wid;
 delete from public.wow_gallery_public_share where workspace_id=wid;
 delete from public.wow_gallery_sales where order_id in (select id from public.wow_gallery_orders where workspace_id=wid);
 delete from public.wow_gallery_source_inventory where workspace_id=wid;
 delete from public.wow_login_limits where workspace_id=wid;
 delete from public.wow_media_links where workspace_id=wid;
 delete from public.wow_media_uploads where workspace_id=wid;
 delete from public.wow_order_sms_jobs where workspace_id=wid;
 delete from public.wow_owner_approval_requests where workspace_id=wid;
 delete from public.wow_owner_recovery_requests where workspace_id=wid;
 delete from public.wow_platform_company_audit where workspace_id=wid;
 delete from public.wow_platform_inspection_audit where workspace_id=wid;
 delete from public.wow_push_jobs where event_id in (select id from public.wow_push_events where workspace_id=wid) or subscription_id in (select id from public.wow_push_subscriptions where workspace_id=wid);
 delete from public.wow_setup_claims where workspace_id=wid;
 delete from wow_assist.answers where workspace=wid;
 delete from wow_collab.chat_notifications where workspace_id=wid;
 delete from wow_collab.files where workspace_id=wid;
 delete from wow_collab.hidden where message_id in (select id from wow_collab.messages where room_id in (select id from wow_collab.rooms where workspace_id=wid));
 delete from wow_collab.members where room_id in (select id from wow_collab.rooms where workspace_id=wid);
 delete from wow_collab.profiles where account_id=any(account_ids);
 delete from wow_collab.reactions where message_id in (select id from wow_collab.messages where room_id in (select id from wow_collab.rooms where workspace_id=wid));
 delete from wow_collab.stars where message_id in (select id from wow_collab.messages where room_id in (select id from wow_collab.rooms where workspace_id=wid));
 delete from wow_customer.limits where workspace_id=wid;
 delete from wow_customer.profiles where workspace_id=wid;
 delete from wow_customer.requests where workspace_id=wid;
 delete from wow_customer.settings where workspace_id=wid;
 delete from wow_fin.attachments where workspace=wid;
 delete from wow_fin.attendance where workspace=wid;
 delete from wow_fin.import_chunks where workspace=wid;
 delete from wow_fin.legacy_rows where workspace=wid;
 delete from wow_fin.legs where workspace=wid;
 delete from wow_fin.quotes where workspace=wid;
 delete from wow_fin.receipts where workspace=wid;
 delete from wow_fin.resources where workspace=wid;
 delete from wow_fin.slips where workspace=wid;
 delete from wow_limits.subscriptions where workspace_id=wid;
 delete from wow_mail.events where message_id in (select id from wow_mail.messages where workspace=wid);
 delete from wow_mail.receipts where workspace=wid;
 delete from wow_mail.statements where workspace_id=wid;
 delete from wow_mail.templates where workspace=wid;
 delete from wow_notify.announcement_recipients where workspace_id=wid;
 delete from wow_ops.notifications where workspace_id=wid;
 delete from wow_ops.runs where workspace_id=wid;
 delete from wow_ops.settings where workspace_id=wid;
 delete from wow_ops.storage_jobs where workspace_id=wid;
 delete from wow_support.messages where case_id in (select id from wow_support.cases where workspace_id=wid);
 delete from wow_support.receipts where case_id in (select id from wow_support.cases where workspace_id=wid);
 delete from wow_voice.participants where call_id in (select id from wow_voice.calls where workspace_id=wid);
 delete from public.wow_gallery_lines where order_id in (select id from public.wow_gallery_orders where workspace_id=wid);
 delete from public.wow_push_events where workspace_id=wid;
 delete from public.wow_push_subscriptions where workspace_id=wid;
 delete from public.wow_records where workspace_id=wid;
 delete from wow_assist.requests where workspace=wid;
 delete from wow_collab.folders where workspace_id=wid;
 delete from wow_collab.messages where room_id in (select id from wow_collab.rooms where workspace_id=wid);
 delete from wow_fin.imports where workspace=wid;
 delete from wow_fin.journal where workspace=wid;
 delete from wow_mail.messages where workspace=wid;
 delete from wow_notify.announcements where workspace_id=wid;
 delete from wow_ops.incidents where workspace_id=wid;
 delete from wow_support.cases where workspace_id=wid;
 delete from wow_voice.calls where workspace_id=wid;
 delete from public.wow_gallery_orders where workspace_id=wid;
 delete from public.wow_sessions where account_id=any(account_ids);
 delete from wow_collab.chat_assets where workspace_id=wid;
 delete from wow_collab.rooms where workspace_id=wid;
 delete from public.wow_accounts where workspace_id=wid;
 delete from auth.users where id=any(auth_ids);
 delete from wow_purge.intents where workspace_id=wid;
 delete from public.wow_workspaces where id=wid;
 insert into public.wow_platform_company_deletion_log(workspace_id,company_name,actor_id) values(wid,ws.name,p_user);
 return jsonb_build_object('workspaceId',wid,'deleted',true);
end $purge$;
revoke all on function wow_purge.company(uuid,uuid,text,jsonb) from public,anon,authenticated,service_role;

-- Preserve every other service action and the original service ACL.
do $install$
declare definition text; start_pos integer; end_pos integer; marker text;
begin
 definition=pg_get_functiondef('public.wow_platform_service(uuid,uuid,text,jsonb)'::regprocedure);
 marker=' elsif p_action in (''company.deletePreview'',''company.deleteEmpty'') then';
 start_pos=strpos(definition,marker);
 end_pos=strpos(definition,' elsif p_action=''company.list'' then');
 if start_pos=0 or end_pos<=start_pos then raise exception 'Unexpected platform service definition';end if;
 execute left(definition,start_pos-1)||marker||E'\n   return wow_purge.company(p_user,p_session,p_action,p_data);\n'||substr(definition,end_pos);

 -- A transaction-local marker alone cannot authorize an ordinary caller to bypass a guard.
 marker='if tg_op in (''UPDATE'',''DELETE'') and old.role=';
 definition=pg_get_functiondef('public.wow_guard_account()'::regprocedure);
 if strpos(definition,'wow_purge.intents')=0 then
   if strpos(definition,marker)=0 then raise exception 'Unexpected account guard';end if;
   execute replace(definition,marker,
     'if tg_op=''DELETE'' and current_setting(''wow_purge.workspace'',true)=old.workspace_id::text
        and exists(select from wow_purge.intents where workspace_id=old.workspace_id) then return old;end if;
      '||marker);
 end if;
 marker='if tg_op in (''UPDATE'',''DELETE'') and old.store=';
 definition=pg_get_functiondef('wow_fin.guard_mirror()'::regprocedure);
 if strpos(definition,'wow_purge.intents')=0 then
   if strpos(definition,marker)=0 then raise exception 'Unexpected finance mirror guard';end if;
   execute replace(definition,marker,
     'if tg_op=''DELETE'' and current_setting(''wow_purge.workspace'',true)=old.workspace_id::text then
        if exists(select from wow_purge.intents where workspace_id=old.workspace_id) then return old; end if;
      end if;
      '||marker);
 end if;
end $install$;

commit;
