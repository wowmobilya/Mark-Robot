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
 select count(*) from public.wow_account_installations i join public.wow_accounts a on a.id=i.account_id
 where a.workspace_id=wid and a.role<>'owner' and a.deleted_at is null;
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
update wow_limits.plans set device_limit=2,storage_bytes=2000000000,
 voice_minutes=500,video_minutes=250,version=version+1
where id in ('a0e8f0db-7cf8-4d2a-a230-10f4ddc44a01','a0e8f0db-7cf8-4d2a-a230-10f4ddc44a02','a0e8f0db-7cf8-4d2a-a230-10f4ddc44a03')
and (device_limit,storage_bytes,voice_minutes,video_minutes) is distinct from (2,2000000000,500,250);
revoke all on function wow_limits.plan_json(wow_limits.plans),wow_limits.devices_used(uuid),
 wow_limits.seconds_used(uuid,text,timestamptz,uuid),wow_limits.minutes_used(uuid,text),
 wow_limits.admit_installation(),wow_limits.admit_call() from public,anon,authenticated;
commit;
