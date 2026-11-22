-- Deploy after tenant-limits.sql. Existing plans retain unlimited seats and
-- unspecified commercial terms. Existing assignments and customer data stay intact.
begin;
alter table wow_limits.plans
 add column if not exists user_limit integer check (user_limit between 0 and 1000000),
 add column if not exists price numeric(16,4) check (price >= 0 and price <> 'NaN'::numeric),
 add column if not exists currency text check(currency ~ '^[A-Z]{3}$'),
 add column if not exists duration_days integer check(duration_days between 1 and 36500);
do $$ begin
 if not exists(select from pg_constraint where conrelid='wow_limits.plans'::regclass and conname='wow_plan_price_currency_pair') then
   alter table wow_limits.plans add constraint wow_plan_price_currency_pair check ((price is null)=(currency is null));
 end if;
end $$;

create or replace function wow_limits.plan_json(p wow_limits.plans) returns jsonb language sql immutable strict set search_path='' as $$
 select jsonb_build_object('id',p.id,'name',p.name,'deviceLimit',p.device_limit,'storageBytes',p.storage_bytes,'version',p.version,
   'userLimit',p.user_limit,'price',trim_scale(p.price)::text,'currency',p.currency,'durationDays',p.duration_days);
$$;
create or replace function wow_limits.users_used(wid uuid) returns bigint language sql stable set search_path='' as $$
 select count(*) from public.wow_accounts a where a.workspace_id=wid and a.status='active' and a.deleted_at is null
   and (a.expires_at is null or a.expires_at>now());
$$;

-- Use the same workspace lock as assigning a subscription. AFTER observes
-- the actual INSERT/ON CONFLICT result. Reducing a cap preserves existing seats.
create or replace function wow_limits.admit_user() returns trigger language plpgsql security definer set search_path='' as $$
declare sub wow_limits.subscriptions; cap integer;
begin
 if new.status<>'active' or new.deleted_at is not null or new.expires_at<=now() then return null;end if;
 if tg_op='UPDATE' and old.workspace_id=new.workspace_id and old.status='active'
   and old.deleted_at is null and (old.expires_at is null or old.expires_at>now()) then return null;end if;
 perform 1 from public.wow_workspaces where id=new.workspace_id for no key update;
 select * into sub from wow_limits.subscriptions where workspace_id=new.workspace_id;
 if sub.plan_id is null then return null;end if;
 if sub.expires_at<=now() then raise exception 'SUBSCRIPTION_EXPIRED';end if;
 select user_limit into strict cap from wow_limits.plans where id=sub.plan_id for share;
 if cap is not null and wow_limits.users_used(new.workspace_id)>cap then raise exception 'USER_LIMIT_REACHED';end if;
 return null;
end $$;
drop trigger if exists wow_plan_user_admission on public.wow_accounts;
create trigger wow_plan_user_admission after insert or update of workspace_id,status,deleted_at,expires_at
 on public.wow_accounts for each row execute function wow_limits.admit_user();
revoke all on function wow_limits.admit_user(),wow_limits.users_used(uuid) from public,anon,authenticated;

create or replace function public.wow_platform_limits(p_user uuid,p_session uuid,p_action text,p_data jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare wid uuid;pid uuid;label text;device_max integer;byte_max bigint;expiry timestamptz;expected integer;
 seats integer; amount numeric; denomination text; days integer;
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
   -- Clients from older releases omit these fields. Retain their stored values.
   seats=plan.user_limit;amount=plan.price;denomination=plan.currency;days=plan.duration_days;
   if p_data?'userLimit' then
     if jsonb_typeof(p_data->'userLimit') not in ('number','null') or (p_data->>'userLimit') !~ '^[0-9]{1,7}$' then raise exception 'INVALID_LIMITS';end if;
     seats=(p_data->>'userLimit')::integer;
   end if;
   if p_data?'durationDays' then
     if jsonb_typeof(p_data->'durationDays') not in ('number','null') or (p_data->>'durationDays') !~ '^[0-9]{1,5}$' then raise exception 'INVALID_LIMITS';end if;
     days=(p_data->>'durationDays')::integer;
   end if;
   if p_data?'price' then
     if jsonb_typeof(p_data->'price') not in ('string','null') or (p_data->>'price') !~ '^[0-9]{1,12}([.][0-9]{1,4})?$' then raise exception 'INVALID_LIMITS';end if;
     amount=(p_data->>'price')::numeric;
   end if;
   if p_data?'currency' then
     if jsonb_typeof(p_data->'currency') not in ('string','null') then raise exception 'INVALID_LIMITS';end if;
     denomination=p_data->>'currency';
   end if;
   if seats not between 0 and 1000000 or days not between 1 and 36500 or denomination !~ '^[A-Z]{3}$'
      or (amount is null)<>(denomination is null) then raise exception 'INVALID_LIMITS';end if;
   if plan.id is not null and (plan.name,plan.device_limit,plan.storage_bytes,plan.user_limit,plan.price,plan.currency,plan.duration_days)
      is not distinct from (label,device_max,byte_max,seats,amount,denomination,days)
      and expected in (plan.version,plan.version-1) then return jsonb_build_object('plan',wow_limits.plan_json(plan));end if;
   if expected<>coalesce(plan.version,0) then raise exception 'CONFLICT';end if;
   insert into wow_limits.plans(id,name,device_limit,storage_bytes,user_limit,price,currency,duration_days,updated_by) values(pid,label,device_max,byte_max,seats,amount,denomination,days,p_user)
    on conflict(id) do update set name=excluded.name,device_limit=excluded.device_limit,storage_bytes=excluded.storage_bytes,
      user_limit=excluded.user_limit,price=excluded.price,currency=excluded.currency,duration_days=excluded.duration_days,version=wow_limits.plans.version+1,updated_by=p_user
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
   'usedUsers',wow_limits.users_used(wid),'usedDevices',wow_limits.devices_used(wid),'usedBytes',wow_limits.storage_used(wid));
exception when unique_violation then raise exception 'PLAN_NAME_EXISTS';
 when invalid_text_representation or numeric_value_out_of_range or datetime_field_overflow or invalid_datetime_format then raise exception 'INVALID_LIMITS';
end $$;
revoke all on all functions in schema wow_limits from public,anon,authenticated;
revoke all on function public.wow_platform_limits(uuid,uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.wow_platform_limits(uuid,uuid,text,jsonb) to service_role;
commit;
