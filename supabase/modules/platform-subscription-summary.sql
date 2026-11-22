-- Read-only, bounded founder subscription summary for cards (one request per displayed page).
begin;
create or replace function public.wow_platform_subscription_summary(p_user uuid,p_session uuid,p_workspaces uuid[])
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
  perform public.wow_platform_require(p_user,p_session);
  if p_workspaces is null or cardinality(p_workspaces)>50 or array_position(p_workspaces,null) is not null then
    raise exception using message='INVALID_REQUEST',errcode='P0001';end if;
  select coalesce(jsonb_agg(jsonb_build_object(
    'workspaceId',q.id,'planId',q.plan_id,'planName',q.plan_name,'durationDays',q.duration_days,
    'expiresAt',q.expires_at,'version',q.version,'hasSubscription',q.plan_id is not null)
    order by q.name,q.id),'[]'::jsonb) into result
  from (
    select w.id,w.name,s.plan_id,s.expires_at,s.version,p.name as plan_name,p.duration_days
    from (select distinct unnest(p_workspaces) id) ids
    join public.wow_workspaces w on w.id=ids.id
    left join wow_limits.subscriptions s on s.workspace_id=w.id
    left join wow_limits.plans p on p.id=s.plan_id
  ) q;
  return jsonb_build_object('subscriptions',result,'checkedAt',now());
end $$;
revoke all on function public.wow_platform_subscription_summary(uuid,uuid,uuid[]) from public,anon,authenticated;
grant execute on function public.wow_platform_subscription_summary(uuid,uuid,uuid[]) to service_role;
commit;
