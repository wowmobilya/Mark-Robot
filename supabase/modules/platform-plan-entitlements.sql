-- WOW paid entitlements: limits are enforced only after explicit subscription assignment.
begin;
alter table wow_limits.plans
 add column if not exists voice_minutes integer check(voice_minutes between 0 and 100000),
 add column if not exists video_minutes integer check(video_minutes between 0 and 100000);
alter table wow_limits.subscriptions
 add column if not exists extra_devices integer not null default 0 check(extra_devices between 0 and 100),
 add column if not exists double_bundle boolean not null default false;
-- Founder remains able to edit every base quota.
create or replace function wow_limits.plan_json(p wow_limits.plans) returns jsonb language sql immutable strict set search_path='' as $$
 select jsonb_build_object('id',p.id,'name',p.name,'deviceLimit',p.device_limit,'storageBytes',p.storage_bytes,
 'version',p.version,'userLimit',p.user_limit,'price',trim_scale(p.price)::text,'currency',p.currency,
 'durationDays',p.duration_days,'voiceMinutes',p.voice_minutes,'videoMinutes',p.video_minutes);
$$;
-- Count linked staff phones from verified installation bindings, excluding the owner.
-- Push subscriptions alone are not a trustworthy tally of installed phones.
create or replace function wow_limits.devices_used(wid uuid) returns bigint language sql stable set search_path='' as $$
 select greatest(count(*) - case when coalesce(bool_or(a.role='owner'),false) then 1 else 0 end,0)
 from public.wow_account_installations i join public.wow_accounts a on a.id=i.account_id
 where a.workspace_id=wid and a.deleted_at is null;
$$;
-- Only media-connected durations count; unanswered calls consume no time.
-- This is the current UTC month and uses the last server-authorized expiry.
create or replace function wow_limits.seconds_used(wid uuid,media_kind text,at_time timestamptz default now(),omitted uuid default null)
returns numeric language sql stable set search_path='' as $$
 with period as (select date_trunc('month',at_time at time zone 'UTC') at time zone 'UTC' as start_at)
 select coalesce(sum(greatest(0,extract(epoch from
  least(coalesce(c.ended_at,least(c.expires_at,at_time)),at_time)-
  greatest(c.started_at,period.start_at)))),0)::numeric
 from wow_voice.calls c cross join period
 where c.workspace_id=wid and c.kind=media_kind and c.started_at is not null
  and c.started_at<at_time and coalesce(c.ended_at,c.expires_at)>period.start_at
  and (omitted is null or c.id<>omitted);
$$;
create or replace function wow_limits.minutes_used(wid uuid,media_kind text) returns numeric language sql stable set search_path='' as $$
 select round(wow_limits.seconds_used(wid,media_kind)/60.0,2);
$$;
-- A transaction-scoped advisory lock serializes simultaneous employee activations.
create or replace function wow_limits.admit_installation() returns trigger language plpgsql security definer set search_path='' as $$
declare wid uuid;role_name text;sub wow_limits.subscriptions;cap integer;
begin
 select a.workspace_id,a.role into wid,role_name from public.wow_accounts a where a.id=new.account_id;
 if wid is null or role_name='owner' then return null;end if;
 perform pg_advisory_xact_lock(hashtextextended('wow-plan-phone:'||wid::text,0));
 select * into sub from wow_limits.subscriptions where workspace_id=wid;
 if sub.plan_id is null then return null;end if;
 if sub.expires_at<=now() then raise exception using message='SUBSCRIPTION_EXPIRED',errcode='P0001';end if;
 select device_limit into cap from wow_limits.plans where id=sub.plan_id;
 if cap is not null and wow_limits.devices_used(wid)>cap+sub.extra_devices then
  raise exception using message='DEVICE_LIMIT_REACHED',errcode='P0001';end if;
 return null;
end $$;
drop trigger if exists wow_plan_installation_admission on public.wow_account_installations;
create trigger wow_plan_installation_admission after insert on public.wow_account_installations
for each row execute function wow_limits.admit_installation();
-- Call records are from authenticated WebRTC signaling; stop issuing heartbeats at quota.
create or replace function wow_limits.admit_call() returns trigger language plpgsql security definer set search_path='' as $$
declare sub wow_limits.subscriptions;cap_minutes integer;cap_seconds numeric;used_other numeric;elapsed numeric;remaining numeric;msg text;
begin
 select * into sub from wow_limits.subscriptions where workspace_id=new.workspace_id;
 if sub.plan_id is null then return new;end if;
 select case when new.kind='audio' then voice_minutes else video_minutes end into cap_minutes
  from wow_limits.plans where id=sub.plan_id;
 if cap_minutes is null then return new;end if;
 cap_seconds=cap_minutes*(case when sub.double_bundle then 2 else 1 end)*60;
 msg=case when new.kind='audio' then 'VOICE_MINUTES_EXHAUSTED' else 'VIDEO_MINUTES_EXHAUSTED' end;
 perform pg_advisory_xact_lock(hashtextextended('wow-plan-call:'||new.workspace_id::text,0));
 if tg_op='INSERT' then
   if wow_limits.seconds_used(new.workspace_id,new.kind)>=cap_seconds then
     raise exception using message=msg,errcode='P0001';end if;
 elsif new.status='active' and new.started_at is not null then
   used_other=wow_limits.seconds_used(new.workspace_id,new.kind,now(),new.id);
   elapsed=greatest(0,extract(epoch from now()-greatest(new.started_at,
     date_trunc('month',now() at time zone 'UTC') at time zone 'UTC')));
   remaining=cap_seconds-used_other-elapsed;
   if remaining<=0 then
     new.status='completed';new.ended_at=now();new.expires_at=now();
   else
     new.expires_at=least(new.expires_at,now()+make_interval(secs=>greatest(1,floor(remaining)::integer)));
   end if;
 end if;
 return new;
end $$;
drop trigger if exists wow_voice_plan_admission on wow_voice.calls;
create trigger wow_voice_plan_admission before insert or update of status,started_at,expires_at on wow_voice.calls
for each row execute function wow_limits.admit_call();
-- Only the three approved starter packages; no company is auto-enrolled.
update wow_limits.plans as plan
set device_limit=tier.phones, storage_bytes=tier.bytes, voice_minutes=tier.voice, video_minutes=tier.video, version=plan.version+1
from (values
 ('a0e8f0db-7cf8-4d2a-a230-10f4ddc44a01'::uuid,2,4000000000::bigint,500,250),
 ('a0e8f0db-7cf8-4d2a-a230-10f4ddc44a02'::uuid,3,16000000000::bigint,500,250),
 ('a0e8f0db-7cf8-4d2a-a230-10f4ddc44a03'::uuid,6,32000000000::bigint,1000,500)
) as tier(id,phones,bytes,voice,video)
where plan.id=tier.id and (plan.device_limit,plan.storage_bytes,plan.voice_minutes,plan.video_minutes)
 is distinct from (tier.phones,tier.bytes,tier.voice,tier.video);
revoke all on function wow_limits.plan_json(wow_limits.plans),wow_limits.devices_used(uuid),
 wow_limits.seconds_used(uuid,text,timestamptz,uuid),wow_limits.minutes_used(uuid,text),
 wow_limits.admit_installation(),wow_limits.admit_call() from public,anon,authenticated;

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
   if plan.device_limit is not null and wow_limits.devices_used(new.workspace_id)>plan.device_limit+coalesce(subscription.extra_devices,0) then raise exception 'DEVICE_LIMIT_REACHED';end if;
 elsif plan.storage_bytes is not null and wow_limits.storage_used(new.workspace_id)>plan.storage_bytes*(case when coalesce(subscription.double_bundle,false) then 2 else 1 end) then
   raise exception 'STORAGE_LIMIT_REACHED';
 end if;
 return null;
end $$;
create or replace function public.wow_platform_limits(p_user uuid,p_session uuid,p_action text,p_data jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare wid uuid;pid uuid;label text;device_max integer;byte_max bigint;expiry timestamptz;expected integer;
 seats integer; amount numeric; denomination text; days integer; audio_cap integer; video_cap integer; extra_count integer; double_it boolean; old_extra integer; old_double boolean;
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
   seats=plan.user_limit;amount=plan.price;denomination=plan.currency;days=plan.duration_days;audio_cap=plan.voice_minutes;video_cap=plan.video_minutes;
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
   if p_data?'voiceMinutes' then
     if jsonb_typeof(p_data->'voiceMinutes') not in ('number','null')
       or (p_data->>'voiceMinutes') is not null and (p_data->>'voiceMinutes') !~ '^[0-9]{1,6}$' then raise exception 'INVALID_LIMITS';end if;
     audio_cap=(p_data->>'voiceMinutes')::integer;
   end if;
   if p_data?'videoMinutes' then
     if jsonb_typeof(p_data->'videoMinutes') not in ('number','null')
       or (p_data->>'videoMinutes') is not null and (p_data->>'videoMinutes') !~ '^[0-9]{1,6}$' then raise exception 'INVALID_LIMITS';end if;
     video_cap=(p_data->>'videoMinutes')::integer;
   end if;
   if audio_cap not between 0 and 100000 or video_cap not between 0 and 100000 then raise exception 'INVALID_LIMITS';end if;
   if seats not between 0 and 1000000 or days not between 1 and 36500 or denomination !~ '^[A-Z]{3}$'
      or (amount is null)<>(denomination is null) then raise exception 'INVALID_LIMITS';end if;
   if plan.id is not null and (plan.name,plan.device_limit,plan.storage_bytes,plan.user_limit,plan.price,plan.currency,plan.duration_days,plan.voice_minutes,plan.video_minutes)
      is not distinct from (label,device_max,byte_max,seats,amount,denomination,days,audio_cap,video_cap)
      and expected in (plan.version,plan.version-1) then return jsonb_build_object('plan',wow_limits.plan_json(plan));end if;
   if expected<>coalesce(plan.version,0) then raise exception 'CONFLICT';end if;
   insert into wow_limits.plans(id,name,device_limit,storage_bytes,user_limit,price,currency,duration_days,voice_minutes,video_minutes,updated_by) values(pid,label,device_max,byte_max,seats,amount,denomination,days,audio_cap,video_cap,p_user)
    on conflict(id) do update set name=excluded.name,device_limit=excluded.device_limit,storage_bytes=excluded.storage_bytes,
      user_limit=excluded.user_limit,price=excluded.price,currency=excluded.currency,duration_days=excluded.duration_days,voice_minutes=excluded.voice_minutes,video_minutes=excluded.video_minutes,version=wow_limits.plans.version+1,updated_by=p_user
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
 old_extra=coalesce(sub.extra_devices,0);old_double=coalesce(sub.double_bundle,false);
 extra_count=old_extra;double_it=old_double;
 if p_action='platform.limits.set' then
   if not (p_data ?& array['planId','expiresAt']) then raise exception 'INVALID_LIMITS';end if;
   pid=(p_data->>'planId')::uuid;expiry=(p_data->>'expiresAt')::timestamptz;
   if p_data?'extraDevices' then
     if jsonb_typeof(p_data->'extraDevices')<>'number' or (p_data->>'extraDevices') !~ '^[0-9]{1,3}$' then raise exception 'INVALID_LIMITS';end if;
     extra_count=(p_data->>'extraDevices')::integer;
   end if;
   if p_data?'doubleBundle' then
     if jsonb_typeof(p_data->'doubleBundle')<>'boolean' then raise exception 'INVALID_LIMITS';end if;
     double_it=(p_data->>'doubleBundle')::boolean;
   end if;
   if extra_count not between 0 and 100 or pid is null and (extra_count>0 or double_it) then raise exception 'INVALID_LIMITS';end if;
   if expiry is not null and (not isfinite(expiry) or pid is null) then raise exception 'INVALID_LIMITS';end if;
   if pid is not null and not exists(select from wow_limits.plans where id=pid) then raise exception 'PLAN_NOT_FOUND';end if;
   if (sub.plan_id,sub.expires_at,old_extra,old_double) is distinct from (pid,expiry,extra_count,double_it) then
     if expected<>coalesce(sub.version,0) then raise exception 'CONFLICT';end if;
     insert into wow_limits.subscriptions(workspace_id,plan_id,expires_at,extra_devices,double_bundle)
       values(wid,pid,expiry,extra_count,double_it)
       on conflict(workspace_id) do update set plan_id=excluded.plan_id,expires_at=excluded.expires_at,
         extra_devices=excluded.extra_devices,double_bundle=excluded.double_bundle,
         version=wow_limits.subscriptions.version+1 returning * into sub;
     insert into public.wow_platform_company_audit(actor_id,workspace_id,action) values(p_user,wid,'subscription_updated');
   end if;
 end if;
 select * into plan from wow_limits.plans where id=sub.plan_id;
 return jsonb_build_object('workspaceId',wid,'planId',sub.plan_id,'plan',case when plan.id is not null then wow_limits.plan_json(plan) end,
   'expiresAt',sub.expires_at,'expired',coalesce(sub.expires_at<=now(),false),'version',coalesce(sub.version,0),
   'usedUsers',wow_limits.users_used(wid),'usedDevices',wow_limits.devices_used(wid),'usedBytes',wow_limits.storage_used(wid),
   'extraDevices',coalesce(sub.extra_devices,0),'doubleBundle',coalesce(sub.double_bundle,false),
   'effectiveDeviceLimit',case when plan.device_limit is null then null else plan.device_limit+coalesce(sub.extra_devices,0) end,
   'effectiveStorageBytes',case when plan.storage_bytes is null then null else plan.storage_bytes*(case when coalesce(sub.double_bundle,false) then 2 else 1 end) end,
   'effectiveVoiceMinutes',case when plan.voice_minutes is null then null else plan.voice_minutes*(case when coalesce(sub.double_bundle,false) then 2 else 1 end) end,
   'effectiveVideoMinutes',case when plan.video_minutes is null then null else plan.video_minutes*(case when coalesce(sub.double_bundle,false) then 2 else 1 end) end,
   'usedVoiceMinutes',wow_limits.minutes_used(wid,'audio'),'usedVideoMinutes',wow_limits.minutes_used(wid,'video'),
   'addOnMonthlyUSD',coalesce(sub.extra_devices,0)*10+case when coalesce(sub.double_bundle,false) then 20 else 0 end);
exception when unique_violation then raise exception 'PLAN_NAME_EXISTS';
 when invalid_text_representation or numeric_value_out_of_range or datetime_field_overflow or invalid_datetime_format then raise exception 'INVALID_LIMITS';
end $$;
revoke all on function wow_limits.admit() from public,anon,authenticated;
revoke all on function public.wow_platform_limits(uuid,uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.wow_platform_limits(uuid,uuid,text,jsonb) to service_role;
commit;
