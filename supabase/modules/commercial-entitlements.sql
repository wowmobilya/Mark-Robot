-- WOW commercial entitlements 232. Additive to tenant-seats, account-installations, voice-calls.
-- Three founder-created WOW plans: 2 non-primary devices, 2GB, 500 voice / 250 video minutes.
-- Extras: $10 per additional employee device per month; $20 monthly doubles storage + both call pools.
-- The primary bound owner installation is free. No charge collection or silent subscription assignment.
begin;
create table if not exists wow_limits.commercial_features (
 plan_id uuid primary key references wow_limits.plans(id) on delete cascade,
 primary_owner_exempt integer not null default 1 check(primary_owner_exempt=1),
 staff_devices integer not null default 2 check(staff_devices between 0 and 100),
 included_storage_bytes bigint not null default 2000000000 check(included_storage_bytes between 0 and 9007199254740991),
 voice_minutes_monthly integer not null default 500 check(voice_minutes_monthly between 0 and 1000000),
 video_minutes_monthly integer not null default 250 check(video_minutes_monthly between 0 and 1000000),
 extra_device_usd_monthly numeric(10,2) not null default 10 check(extra_device_usd_monthly>=0),
 double_bundle_usd_monthly numeric(10,2) not null default 20 check(double_bundle_usd_monthly>=0)
);
create table if not exists wow_limits.commercial_addons (
 workspace_id uuid primary key references public.wow_workspaces(id) on delete cascade,
 extra_staff_devices integer not null default 0 check(extra_staff_devices between 0 and 100),
 doubled_bundle boolean not null default false,
 version integer not null default 1 check(version>0),
 updated_by uuid references auth.users(id),
 updated_at timestamptz not null default now()
);
alter table wow_limits.commercial_features enable row level security;
alter table wow_limits.commercial_addons enable row level security;
revoke all on wow_limits.commercial_features,wow_limits.commercial_addons from public,anon,authenticated;
insert into wow_limits.commercial_features(plan_id)
 values ('a0e8f0db-7cf8-4d2a-a230-10f4ddc44a01'),
        ('a0e8f0db-7cf8-4d2a-a230-10f4ddc44a02'),
        ('a0e8f0db-7cf8-4d2a-a230-10f4ddc44a03')
 on conflict(plan_id) do nothing;

create or replace function wow_limits.staff_installations(wid uuid)
returns bigint language sql stable set search_path='' as $$
 select greatest(0,count(*)-(case when count(*) filter(where a.role='owner')>0 then 1 else 0 end))::bigint
 from public.wow_account_installations i join public.wow_accounts a on a.id=i.account_id
 where a.workspace_id=wid and a.deleted_at is null;
$$;

-- For commercial plans, report actual linked installations (excluding one owner);
-- legacy plans retain their existing push-device accounting.
create or replace function wow_limits.devices_used(wid uuid)
returns bigint language sql stable set search_path='' as $$
 select case when exists(
   select 1 from wow_limits.subscriptions s join wow_limits.commercial_features f on f.plan_id=s.plan_id
   where s.workspace_id=wid)
 then wow_limits.staff_installations(wid)
 else (select count(distinct (account_id,device_id)) from public.wow_push_subscriptions
       where workspace_id=wid and active)
 end;
$$;

-- Count the seconds after the call has actually been marked connected by the
-- authenticated WOW call service; never trust a client-reported duration.
-- The period is the UTC calendar month and each call counts once (not per peer).
create or replace function wow_limits.voice_used_seconds(wid uuid,p_kind text)
returns bigint language sql stable set search_path='' as $$
 with period as(select date_trunc('month',now() at time zone 'UTC') at time zone 'UTC' as starts_at),
 durations as (
   select greatest(0,extract(epoch from
      least(coalesce(c.ended_at,c.expires_at),now())
      - greatest(c.started_at,period.starts_at)))::bigint as seconds
   from wow_voice.calls c cross join period
   where c.workspace_id=wid and c.kind=p_kind and c.started_at is not null
    and least(coalesce(c.ended_at,c.expires_at),now())>period.starts_at
 )
 select coalesce(sum(seconds),0)::bigint from durations;
$$;

create or replace function wow_limits.commercial_usage(wid uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare sub wow_limits.subscriptions; p wow_limits.plans; f wow_limits.commercial_features;
 addon wow_limits.commercial_addons; base_devices integer; base_storage bigint; multiplier integer;
 used_voice bigint; used_video bigint;
begin
 select * into sub from wow_limits.subscriptions where workspace_id=wid;
 if sub.plan_id is null then return jsonb_build_object('available',false,'reason','UNASSIGNED');end if;
 select * into f from wow_limits.commercial_features where plan_id=sub.plan_id;
 if f.plan_id is null then return jsonb_build_object('available',false,'reason','NOT_COMMERCIAL_PLAN');end if;
 select * into p from wow_limits.plans where id=sub.plan_id;
 select * into addon from wow_limits.commercial_addons where workspace_id=wid;
 base_devices:=coalesce(p.device_limit,f.staff_devices);
 base_storage:=coalesce(p.storage_bytes,f.included_storage_bytes);
 multiplier:=case when coalesce(addon.doubled_bundle,false) then 2 else 1 end;
 used_voice:=wow_limits.voice_used_seconds(wid,'audio');
 used_video:=wow_limits.voice_used_seconds(wid,'video');
 return jsonb_build_object(
  'available',true,'planId',p.id,'planName',p.name,
  'subscriptionExpired',coalesce(sub.expires_at<=now(),false),
  'expiresAt',sub.expires_at,'period','UTC_CALENDAR_MONTH',
  'primaryOwnerExempt',1,'staffDevicesUsed',wow_limits.staff_installations(wid),
  'staffDevicesIncluded',base_devices,'staffDevicesAllowed',base_devices+coalesce(addon.extra_staff_devices,0),
  'storageUsedBytes',wow_limits.storage_used(wid),'storageAllowedBytes',base_storage*multiplier,
  'voiceSecondsUsed',used_voice,'voiceSecondsAllowed',f.voice_minutes_monthly*60*multiplier,
  'videoSecondsUsed',used_video,'videoSecondsAllowed',f.video_minutes_monthly*60*multiplier,
  'extraStaffDevices',coalesce(addon.extra_staff_devices,0),'doubledBundle',coalesce(addon.doubled_bundle,false),
  'extraDeviceUsdMonthly',trim_scale(f.extra_device_usd_monthly)::text,
  'doubleBundleUsdMonthly',trim_scale(f.double_bundle_usd_monthly)::text,
  'extraMonthlyUsd',trim_scale(coalesce(addon.extra_staff_devices,0)*f.extra_device_usd_monthly+
    (case when coalesce(addon.doubled_bundle,false) then f.double_bundle_usd_monthly else 0 end))::text,
  'version',coalesce(addon.version,0));
end $$;

-- An installation is a real authenticated device binding, unlike the optional
-- push subscription. A transaction-level advisory lock makes simultaneous
-- first logins respect the same staff-device allowance.
create or replace function wow_limits.admit_staff_installation()
returns trigger language plpgsql security definer set search_path='' as $$
declare wid uuid; subscribed wow_limits.subscriptions; quota jsonb;
begin
 select a.workspace_id into wid from public.wow_accounts a where a.id=new.account_id;
 if wid is null then return null;end if;
 select * into subscribed from wow_limits.subscriptions where workspace_id=wid;
 if subscribed.plan_id is null or not exists(
   select 1 from wow_limits.commercial_features f where f.plan_id=subscribed.plan_id)
 then return null;end if;
 perform pg_advisory_xact_lock(hashtextextended('wow-staff-binding:'||wid::text,0));
 quota:=wow_limits.commercial_usage(wid);
 if coalesce((quota->>'subscriptionExpired')::boolean,false) then
   raise exception using message='SUBSCRIPTION_EXPIRED',errcode='P0001';end if;
 if (quota->>'staffDevicesUsed')::bigint>(quota->>'staffDevicesAllowed')::bigint then
   raise exception using message='DEVICE_LIMIT_REACHED',errcode='P0001';end if;
 return null;
end $$;
drop trigger if exists wow_commercial_staff_admission on public.wow_account_installations;
create trigger wow_commercial_staff_admission after insert on public.wow_account_installations
 for each row execute function wow_limits.admit_staff_installation();

-- Retain legacy admission checks for unrelated plans. Commercial storage
-- doubles only for this specific tenant, not by mutating a shared plan.
create or replace function wow_limits.admit()
returns trigger language plpgsql security definer set search_path='' as $$
declare subscription wow_limits.subscriptions; plan wow_limits.plans; quota jsonb;
 devices_allowed bigint; storage_allowed bigint;
begin
 if tg_table_name='wow_push_subscriptions' then
   if not new.active then return null;end if;
   if tg_op='UPDATE' and old.active and (old.workspace_id,old.account_id,old.device_id)=(new.workspace_id,new.account_id,new.device_id) then return null;end if;
 end if;
 perform 1 from public.wow_workspaces where id=new.workspace_id for no key update;
 select * into subscription from wow_limits.subscriptions where workspace_id=new.workspace_id;
 if subscription.plan_id is null then return null;end if;
 if subscription.expires_at<=now() then raise exception using message='SUBSCRIPTION_EXPIRED',errcode='P0001';end if;
 select * into strict plan from wow_limits.plans where id=subscription.plan_id for share;
 if exists(select 1 from wow_limits.commercial_features f where f.plan_id=plan.id) then
   quota:=wow_limits.commercial_usage(new.workspace_id);
   devices_allowed:=(quota->>'staffDevicesAllowed')::bigint;
   storage_allowed:=(quota->>'storageAllowedBytes')::bigint;
 else
   devices_allowed:=plan.device_limit;storage_allowed:=plan.storage_bytes;
 end if;
 if tg_table_name='wow_push_subscriptions' then
   if devices_allowed is not null and wow_limits.devices_used(new.workspace_id)>devices_allowed
   then raise exception using message='DEVICE_LIMIT_REACHED',errcode='P0001';end if;
 elsif storage_allowed is not null and wow_limits.storage_used(new.workspace_id)>storage_allowed then
   raise exception using message='STORAGE_LIMIT_REACHED',errcode='P0001';
 end if;
 return null;
end $$;

-- The call service already manages authenticated room membership, statuses and
-- heartbeat expiry. This extra guard rejects further starts/heartbeat extensions
-- once trusted server-side connected time reaches the monthly pool.
create or replace function wow_limits.admit_voice_minutes()
returns trigger language plpgsql security definer set search_path='' as $$
declare sub wow_limits.subscriptions; f wow_limits.commercial_features;
 extra wow_limits.commercial_addons; allowed_seconds bigint; used_seconds bigint;
begin
 if new.status not in ('ringing','active') then return new;end if;
 if tg_op='UPDATE' and new.started_at is not distinct from old.started_at
   and new.expires_at is not distinct from old.expires_at then return new;end if;
 select * into sub from wow_limits.subscriptions where workspace_id=new.workspace_id;
 if sub.plan_id is null then return new;end if;
 select * into f from wow_limits.commercial_features where plan_id=sub.plan_id;
 if f.plan_id is null then return new;end if;
 if sub.expires_at<=now() then raise exception using message='SUBSCRIPTION_EXPIRED',errcode='P0001';end if;
 select * into extra from wow_limits.commercial_addons where workspace_id=new.workspace_id;
 allowed_seconds:=(case when new.kind='video' then f.video_minutes_monthly else f.voice_minutes_monthly end)
    *60*(case when coalesce(extra.doubled_bundle,false) then 2 else 1 end);
 perform pg_advisory_xact_lock(hashtextextended('wow-voice-cap:'||new.workspace_id::text||':'||new.kind,0));
 used_seconds:=wow_limits.voice_used_seconds(new.workspace_id,new.kind);
 if used_seconds>=allowed_seconds then
   raise exception using message='VOICE_MINUTES_EXCEEDED',errcode='P0001';end if;
 return new;
end $$;
drop trigger if exists wow_commercial_voice_admission on wow_voice.calls;
create trigger wow_commercial_voice_admission before insert or update of started_at,expires_at on wow_voice.calls
 for each row execute function wow_limits.admit_voice_minutes();

-- Founder-only additive API, with explicit version compare-and-swap and audit.
-- It sets entitlements but intentionally does not collect or schedule payments.
create or replace function public.wow_platform_addons(
 p_user uuid,p_session uuid,p_action text,p_data jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare wid uuid; sub wow_limits.subscriptions; extra integer;
 doubled boolean; expected integer; current_version integer; existing wow_limits.commercial_addons;
begin
 perform public.wow_platform_require(p_user,p_session);
 if p_action not in ('addons.get','addons.set') or jsonb_typeof(p_data) is distinct from 'object'
 then raise exception using message='INVALID_ACTION',errcode='P0001';end if;
 begin wid:=(p_data->>'workspaceId')::uuid;
 exception when others then raise exception using message='INVALID_REQUEST',errcode='P0001';end;
 if wid is null or not exists(select from public.wow_workspaces w where w.id=wid)
 then raise exception using message='COMPANY_NOT_FOUND',errcode='P0001';end if;
 if p_action='addons.get' then return wow_limits.commercial_usage(wid);end if;
 if jsonb_typeof(p_data->'extraDevices') is distinct from 'number' or
  (p_data->>'extraDevices') !~ '^(0|[1-9][0-9]?)$' or
  jsonb_typeof(p_data->'doubleBundle') is distinct from 'boolean' or
  jsonb_typeof(p_data->'version') is distinct from 'number' or
  (p_data->>'version') !~ '^(0|[1-9][0-9]{0,8})$'
 then raise exception using message='INVALID_REQUEST',errcode='P0001';end if;
 extra:=(p_data->>'extraDevices')::integer;
 doubled:=(p_data->>'doubleBundle')::boolean;
 expected:=(p_data->>'version')::integer;
 perform 1 from public.wow_workspaces w where w.id=wid for no key update;
 select * into sub from wow_limits.subscriptions where workspace_id=wid for update;
 if sub.plan_id is null or not exists(
  select from wow_limits.commercial_features f where f.plan_id=sub.plan_id)
 then raise exception using message='SUBSCRIPTION_REQUIRED',errcode='P0001';end if;
 select * into existing from wow_limits.commercial_addons where workspace_id=wid for update;
 current_version:=coalesce(existing.version,0);
 if existing.workspace_id is not null and
   existing.extra_staff_devices=extra and existing.doubled_bundle=doubled and
   expected in (current_version,current_version-1)
 then return wow_limits.commercial_usage(wid);end if;
 if expected<>current_version then raise exception using message='CONFLICT',errcode='P0001';end if;
 insert into wow_limits.commercial_addons(workspace_id,extra_staff_devices,doubled_bundle,updated_by)
  values(wid,extra,doubled,p_user)
  on conflict(workspace_id) do update set
   extra_staff_devices=excluded.extra_staff_devices,doubled_bundle=excluded.doubled_bundle,
   version=wow_limits.commercial_addons.version+1,updated_at=now(),updated_by=p_user;
 insert into public.wow_platform_company_audit(actor_id,workspace_id,action)
   values(p_user,wid,'commercial_addons_updated');
 return wow_limits.commercial_usage(wid);
end $$;
revoke all on all functions in schema wow_limits from public,anon,authenticated;
revoke all on function public.wow_platform_addons(uuid,uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.wow_platform_addons(uuid,uuid,text,jsonb) to service_role;
commit;
