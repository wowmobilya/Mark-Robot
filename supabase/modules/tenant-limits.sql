-- Deploy after platform-companies, files, chat and gallery. Existing workspaces
-- acquire limits only when a platform administrator assigns a subscription.
begin;
create schema if not exists wow_limits;
revoke all on schema wow_limits from public, anon, authenticated;
create table if not exists wow_limits.plans (
 id uuid primary key, name text not null check(length(btrim(name)) between 1 and 100),
 device_limit integer check(device_limit >= 0),
 storage_bytes bigint check(storage_bytes between 0 and 9007199254740991),
 version integer not null default 1, updated_by uuid not null references auth.users(id)
);
create unique index if not exists wow_plan_unique_name on wow_limits.plans(lower(name));
create table if not exists wow_limits.subscriptions (
 workspace_id uuid primary key references public.wow_workspaces(id),
 plan_id uuid references wow_limits.plans(id), expires_at timestamptz,
 version integer not null default 1, check(expires_at is null or plan_id is not null and isfinite(expires_at))
);
alter table wow_limits.plans enable row level security;
alter table wow_limits.subscriptions enable row level security;
revoke all on wow_limits.plans,wow_limits.subscriptions from public,anon,authenticated;
create index if not exists wow_media_uploads_workspace_size on public.wow_media_uploads(workspace_id) include(size);
create index if not exists wow_push_enrollments_workspace on public.wow_push_subscriptions(workspace_id,account_id,device_id) where active;

create or replace function wow_limits.storage_used(wid uuid) returns bigint language sql stable set search_path='' as $$
 select coalesce((select sum(size) from public.wow_media_uploads where workspace_id=wid),0)
      + coalesce((select sum(bytes) from wow_collab.files where workspace_id=wid and state<>'removed'),0)
      + coalesce((select sum(bytes) from wow_collab.chat_assets where workspace_id=wid and state<>'removed'),0)
      + coalesce((select sum(size_bytes) from public.wow_gallery_assets where workspace_id=wid and lifecycle<>'removed'),0);
$$;
create or replace function wow_limits.devices_used(wid uuid) returns bigint language sql stable set search_path='' as $$
 select count(distinct (account_id,device_id)) from public.wow_push_subscriptions where workspace_id=wid and active;
$$;
create or replace function wow_limits.plan_json(p wow_limits.plans) returns jsonb language sql immutable strict set search_path='' as $$
 select jsonb_build_object('id',p.id,'name',p.name,'deviceLimit',p.device_limit,'storageBytes',p.storage_bytes,'version',p.version);
$$;

-- An AFTER trigger observes the final ON CONFLICT outcome. Failed admissions
-- roll back the reservation before the Edge handler can upload any bytes.
create or replace function wow_limits.admit() returns trigger language plpgsql security definer set search_path='' as $$
declare subscription wow_limits.subscriptions; plan wow_limits.plans;
begin
 if tg_table_name='wow_push_subscriptions' then
   if not new.active then return null;end if;
   if tg_op='UPDATE' and old.active and (old.workspace_id,old.account_id,old.device_id)=(new.workspace_id,new.account_id,new.device_id) then return null;end if;
 end if;
 perform 1 from public.wow_workspaces where id=new.workspace_id for no key update;
 select * into subscription from wow_limits.subscriptions where workspace_id=new.workspace_id;
 if subscription.plan_id is null then return null;end if;
 if subscription.expires_at<=now() then raise exception 'SUBSCRIPTION_EXPIRED';end if;
 select * into strict plan from wow_limits.plans where id=subscription.plan_id for share;
 if tg_table_name='wow_push_subscriptions' then
   if plan.device_limit is not null and wow_limits.devices_used(new.workspace_id)>plan.device_limit then raise exception 'DEVICE_LIMIT_REACHED';end if;
 elsif plan.storage_bytes is not null and wow_limits.storage_used(new.workspace_id)>plan.storage_bytes then
   raise exception 'STORAGE_LIMIT_REACHED';
 end if;
 return null;
end $$;
drop trigger if exists wow_plan_admission on public.wow_push_subscriptions;
create trigger wow_plan_admission after insert or update of active,device_id,account_id,workspace_id on public.wow_push_subscriptions for each row execute function wow_limits.admit();
-- File sizes and data paths are immutable in the upload services. Completion,
-- deletion acknowledgements and retries of already reserved bytes remain usable.
drop trigger if exists wow_plan_admission on public.wow_media_uploads;
create trigger wow_plan_admission after insert on public.wow_media_uploads for each row execute function wow_limits.admit();
drop trigger if exists wow_plan_admission on wow_collab.files;
create trigger wow_plan_admission after insert on wow_collab.files for each row execute function wow_limits.admit();
drop trigger if exists wow_plan_admission on wow_collab.chat_assets;
create trigger wow_plan_admission after insert on wow_collab.chat_assets for each row execute function wow_limits.admit();
drop trigger if exists wow_plan_admission on public.wow_gallery_assets;
create trigger wow_plan_admission after insert on public.wow_gallery_assets for each row execute function wow_limits.admit();

create or replace function public.wow_platform_limits(p_user uuid,p_session uuid,p_action text,p_data jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare wid uuid;pid uuid;label text;device_max integer;byte_max bigint;expiry timestamptz;expected integer;
 plan wow_limits.plans;sub wow_limits.subscriptions;result jsonb;
begin
 perform public.wow_platform_require(p_user,p_session);
 if jsonb_typeof(p_data) is distinct from 'object' then raise exception 'INVALID_LIMITS';end if;
 if p_action='platform.plans.list' then
   select coalesce(jsonb_agg(wow_limits.plan_json(p) order by lower(p.name),p.id),'[]') into result from wow_limits.plans p;
   return jsonb_build_object('plans',result);
 end if;
 if p_action not in ('platform.plans.save','platform.limits.set','platform.limits.get') or p_action is null then raise exception 'INVALID_ACTION';end if;
 if p_action<>'platform.limits.get' then
   if jsonb_typeof(p_data->'version') is distinct from 'number' then raise exception 'INVALID_LIMITS';end if;
   expected=(p_data->>'version')::integer;
   if expected<0 then raise exception 'INVALID_LIMITS';end if;
 end if;
 if p_action='platform.plans.save' then
   if not (p_data ?& array['id','name','deviceLimit','storageBytes']) or jsonb_typeof(p_data->'name')<>'string'
     or jsonb_typeof(p_data->'deviceLimit') not in ('number','null') or jsonb_typeof(p_data->'storageBytes') not in ('number','null') then raise exception 'INVALID_LIMITS';end if;
   pid=(p_data->>'id')::uuid;label=btrim(p_data->>'name');device_max=(p_data->>'deviceLimit')::integer;byte_max=(p_data->>'storageBytes')::bigint;
   if pid is null or length(label) not between 1 and 100 or label~'[[:cntrl:]]' or device_max<0 or byte_max not between 0 and 9007199254740991 then raise exception 'INVALID_LIMITS';end if;
   perform pg_advisory_xact_lock(hashtextextended('wow-plan-'||pid::text,0));
   select * into plan from wow_limits.plans where id=pid for update;
   if plan.id is not null and (plan.name,plan.device_limit,plan.storage_bytes) is not distinct from (label,device_max,byte_max)
      and expected in (plan.version,plan.version-1) then return jsonb_build_object('plan',wow_limits.plan_json(plan));end if;
   if expected<>coalesce(plan.version,0) then raise exception 'CONFLICT';end if;
   insert into wow_limits.plans(id,name,device_limit,storage_bytes,updated_by) values(pid,label,device_max,byte_max,p_user)
    on conflict(id) do update set name=excluded.name,device_limit=excluded.device_limit,storage_bytes=excluded.storage_bytes,version=wow_limits.plans.version+1,updated_by=p_user
    returning * into plan;
   return jsonb_build_object('plan',wow_limits.plan_json(plan));
 end if;
 wid=(p_data->>'workspaceId')::uuid;
 if p_action='platform.limits.set' then
   perform 1 from public.wow_workspaces where id=wid for no key update;
 else
   perform 1 from public.wow_workspaces where id=wid;
 end if;
 if not found then raise exception 'COMPANY_NOT_FOUND';end if;
 select * into sub from wow_limits.subscriptions where workspace_id=wid;
 if p_action='platform.limits.set' then
   if not (p_data ?& array['planId','expiresAt']) then raise exception 'INVALID_LIMITS';end if;
   pid=(p_data->>'planId')::uuid;expiry=(p_data->>'expiresAt')::timestamptz;
   if expiry is not null and (not isfinite(expiry) or pid is null) then raise exception 'INVALID_LIMITS';end if;
   if pid is not null and not exists(select from wow_limits.plans where id=pid) then raise exception 'PLAN_NOT_FOUND';end if;
   if (sub.plan_id,sub.expires_at) is distinct from (pid,expiry) then
     if expected<>coalesce(sub.version,0) then raise exception 'CONFLICT';end if;
     insert into wow_limits.subscriptions(workspace_id,plan_id,expires_at) values(wid,pid,expiry)
       on conflict(workspace_id) do update set plan_id=excluded.plan_id,expires_at=excluded.expires_at,version=wow_limits.subscriptions.version+1 returning * into sub;
     insert into public.wow_platform_company_audit(actor_id,workspace_id,action) values(p_user,wid,'subscription_updated');
   end if;
 end if;
 select * into plan from wow_limits.plans where id=sub.plan_id;
 return jsonb_build_object('workspaceId',wid,'planId',sub.plan_id,'plan',case when plan.id is not null then wow_limits.plan_json(plan) end,
   'expiresAt',sub.expires_at,'expired',coalesce(sub.expires_at<=now(),false),'version',coalesce(sub.version,0),
   'usedDevices',wow_limits.devices_used(wid),'usedBytes',wow_limits.storage_used(wid));
exception when unique_violation then raise exception 'PLAN_NAME_EXISTS';
 when invalid_text_representation or numeric_value_out_of_range or datetime_field_overflow or invalid_datetime_format then raise exception 'INVALID_LIMITS';
end $$;
revoke all on all functions in schema wow_limits from public,anon,authenticated;
revoke all on function public.wow_platform_limits(uuid,uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.wow_platform_limits(uuid,uuid,text,jsonb) to service_role;
commit;
