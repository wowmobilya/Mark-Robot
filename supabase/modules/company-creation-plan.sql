begin;
alter table wow_limits.subscriptions add column if not exists creation_terms jsonb;
-- The first assignment and the setup claim are written in one database transaction.
create or replace function wow_limits.create_company_with_plan(p_user uuid,p_session uuid,p_data jsonb)
returns jsonb language plpgsql security definer set search_path='' as $create$
declare
 choice jsonb=p_data->'subscription'; mode text=choice->>'mode'; plan wow_limits.plans;
 days integer; wid uuid; plan_id uuid; claimed uuid; receipt jsonb; saved jsonb;
 start_at timestamptz=transaction_timestamp(); end_at timestamptz;
begin
 perform public.wow_platform_require(p_user,p_session);
 if jsonb_typeof(choice) is distinct from 'object' or mode is null or mode not in ('paid','trial')
    or (choice->>'planId') is null or (choice->>'planId') !~* '^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$'
    or jsonb_typeof(choice->'durationDays') is distinct from 'number' or (choice->>'durationDays') !~ '^[1-9][0-9]{0,4}$'
    or jsonb_typeof(choice->'planVersion') is distinct from 'number' or (choice->>'planVersion') !~ '^[1-9][0-9]{0,9}$'
    or (p_data->>'claimHash') is null or (p_data->>'claimHash') !~ '^[a-f0-9]{64}$' then raise exception 'INVALID_LIMITS';end if;
 plan_id=(choice->>'planId')::uuid;days=(choice->>'durationDays')::integer;
 if days>36500 then raise exception 'INVALID_LIMITS';end if;
 perform pg_advisory_xact_lock(hashtextextended(p_data->>'claimHash',0));
 select workspace_id into claimed from public.wow_setup_claims where token_hash=p_data->>'claimHash';
 receipt=public.wow_platform_service(p_user,p_session,'company.create',p_data-'subscription');
 wid=(receipt->>'workspaceId')::uuid;
 if claimed is not null then
   select creation_terms into saved from wow_limits.subscriptions where workspace_id=wid;
   if saved is null or saved->>'mode'<>mode or saved->>'planId'<>plan_id::text or saved->>'planVersion'<>choice->>'planVersion' or saved->>'durationDays'<>days::text then raise exception 'CONFLICT';end if;
   return receipt||jsonb_build_object('subscription',saved);
 end if;
 select * into plan from wow_limits.plans p where p.id=plan_id for share;
 if not found then raise exception 'PLAN_NOT_FOUND';end if;
 if plan.version::text<>choice->>'planVersion' then raise exception 'CONFLICT';end if;
 if mode='paid' and plan.duration_days is not null and days<>plan.duration_days then raise exception 'INVALID_LIMITS';end if;
 end_at=start_at+(days*interval '24 hours');
 perform public.wow_platform_limits(p_user,p_session,'platform.limits.set',jsonb_build_object('workspaceId',wid,'planId',plan.id,'expiresAt',end_at,'version',0));
 saved=jsonb_build_object('mode',mode,'planId',plan.id,'planVersion',plan.version,'name',plan.name,'durationDays',days,'startsAt',start_at,'expiresAt',end_at,
   'price',case when mode='trial' then 0 else plan.price end,'currency',plan.currency);
 update wow_limits.subscriptions set creation_terms=saved where workspace_id=wid;
 return receipt||jsonb_build_object('subscription',saved);
end $create$;
revoke all on function wow_limits.create_company_with_plan(uuid,uuid,jsonb) from public,anon,authenticated,service_role;

do $install$
declare def text; marker constant text='if p_action=''company.create'' then';
begin
 def=pg_get_functiondef('public.wow_platform_service(uuid,uuid,text,jsonb)'::regprocedure);
 if strpos(def,'wow_limits.create_company_with_plan')=0 then
   if strpos(def,marker)=0 then raise exception 'Unexpected platform service definition';end if;
   execute replace(def,marker,marker||' if p_data ? ''subscription'' then return wow_limits.create_company_with_plan(p_user,p_session,p_data); end if;');
 end if;
end $install$;


create or replace function public.wow_platform_subscription_summary(p_user uuid,p_session uuid,p_workspaces uuid[])
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
  perform public.wow_platform_require(p_user,p_session);
  if p_workspaces is null or cardinality(p_workspaces)>50 or array_position(p_workspaces,null) is not null then
    raise exception using message='INVALID_REQUEST',errcode='P0001';end if;
  select coalesce(jsonb_agg(jsonb_build_object(
    'workspaceId',q.id,'planId',q.plan_id,'planName',q.plan_name,'durationDays',q.duration_days,
    'subscriptionType',q.subscription_type,'startsAt',q.starts_at,'expiresAt',q.expires_at,'version',q.version,'hasSubscription',q.plan_id is not null)
    order by q.name,q.id),'[]'::jsonb) into result
  from (
    select w.id,w.name,s.plan_id,s.expires_at,s.version,p.name as plan_name,
      case when s.creation_terms->>'planId'=s.plan_id::text and (s.creation_terms->>'expiresAt')::timestamptz=s.expires_at then s.creation_terms->>'mode' end as subscription_type,
      case when s.creation_terms->>'planId'=s.plan_id::text and (s.creation_terms->>'expiresAt')::timestamptz=s.expires_at then s.creation_terms->>'startsAt' end as starts_at,
      case when s.creation_terms->>'planId'=s.plan_id::text and (s.creation_terms->>'expiresAt')::timestamptz=s.expires_at then (s.creation_terms->>'durationDays')::integer else p.duration_days end as duration_days
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
