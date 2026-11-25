-- Owner-only, read-only subscription overview. Workspace is derived from the authenticated session.
begin;
create or replace function public.wow_owner_subscription(p_user uuid,p_session uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare ctx jsonb; wid uuid; sub wow_limits.subscriptions; plan wow_limits.plans; catalog jsonb;
begin
 ctx=public.wow_actor(p_user,p_session,null,false,false);
 if ctx->'account'->>'role' is distinct from 'owner' then
   raise exception using message='ACCESS_DENIED',errcode='P0001';
 end if;
 wid=(ctx->>'workspaceId')::uuid;
 if wid is null then raise exception using message='ACCESS_DENIED',errcode='P0001';end if;
 select * into sub from wow_limits.subscriptions where workspace_id=wid;
 select * into plan from wow_limits.plans where id=sub.plan_id;
 select coalesce(jsonb_agg(wow_limits.plan_json(p) order by p.duration_days,p.id),'[]'::jsonb)
 into catalog from wow_limits.plans p
 where p.id in ('a0e8f0db-7cf8-4d2a-a230-10f4ddc44a01'::uuid,'a0e8f0db-7cf8-4d2a-a230-10f4ddc44a02'::uuid,'a0e8f0db-7cf8-4d2a-a230-10f4ddc44a03'::uuid);
 return jsonb_build_object(
   'plan',wow_limits.plan_json(plan),'hasSubscription',sub.plan_id is not null,
   'expiresAt',sub.expires_at,'checkedAt',now(),'catalog',catalog,
   'effectiveDeviceLimit',plan.device_limit+coalesce(sub.extra_devices,0),
   'effectiveStorageBytes',plan.storage_bytes*(case when coalesce(sub.double_bundle,false) then 2 else 1 end),
   'effectiveVoiceMinutes',plan.voice_minutes*(case when coalesce(sub.double_bundle,false) then 2 else 1 end),
   'effectiveVideoMinutes',plan.video_minutes*(case when coalesce(sub.double_bundle,false) then 2 else 1 end),
   'usedDevices',wow_limits.devices_used(wid),'usedBytes',wow_limits.storage_used(wid),
   'usedVoiceMinutes',wow_limits.minutes_used(wid,'audio'),'usedVideoMinutes',wow_limits.minutes_used(wid,'video'));
end $$;
revoke all on function public.wow_owner_subscription(uuid,uuid) from public,anon,authenticated;
grant execute on function public.wow_owner_subscription(uuid,uuid) to service_role;
commit;
