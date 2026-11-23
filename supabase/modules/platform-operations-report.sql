-- A read-only report for the platform founder. Return no tenant data or raw logs.
begin;

create or replace function public.wow_platform_operations_report(p_user uuid,p_session uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare report jsonb;
begin
  perform public.wow_platform_require(p_user,p_session);
  with monitored as (
    select s.last_tick_at,s.last_result->>'status' as status
    from public.wow_workspaces w left join wow_ops.settings s on s.workspace_id=w.id
    where w.status='active' and coalesce(s.enabled,true)
  ), scheduler as (
    select exists(select from cron.job where jobname='wow-operations' and active and schedule='*/5 * * * *'
      and command='select public.wow_operations_tick();') as configured,
      (select max(finished_at) from wow_ops.runs) as last_run_at,
      (select count(*) from monitored where last_tick_at is null or last_tick_at<now()-interval '15 minutes') as stale,
      (select count(*) from monitored where status='failed') as failing,
      (select count(*) from monitored) as enabled,
      (select count(*) from wow_ops.runs where status='failed' and started_at>=now()-interval '24 hours') as failed_runs
  ), push as (
    select coalesce((select enabled from public.wow_push_control where singleton),false) as configured,
      count(*) filter(where status='pending') as pending,
      count(*) filter(where status='pending' and next_attempt_at<now()-interval '10 minutes') as overdue,
      count(*) filter(where status='failed' and created_at>=now()-interval '24 hours') as failed
    from public.wow_push_jobs
    where status='pending' or (status='failed' and created_at>=now()-interval '24 hours')
  ), reviewed_incidents as (
    select i.code,i.severity,i.active,i.first_seen_at,i.last_seen_at,i.resolved_at
    from wow_ops.incidents i join public.wow_workspaces w on w.id=i.workspace_id
    where (w.status='active' or not i.active)
      and i.code in ('PUSH_BACKLOG','PUSH_FAILURES','PUSH_NOT_CONFIGURED','PUSH_SCHEDULE','RLS_DISABLED')
  ), incident_count as (select count(*) as active from reviewed_incidents where active)
  select jsonb_build_object(
    'checkedAt',now(),'healthy',s.configured and s.last_run_at is not null and s.stale=0 and s.failing=0
      and p.configured and p.overdue=0 and i.active=0,
    'database',jsonb_build_object('bytes',pg_database_size(current_database()),'maxConnections',current_setting('max_connections')::integer,
      'clientConnections',(select count(*) from pg_stat_activity where datname=current_database() and backend_type='client backend')),
    'scheduler',jsonb_build_object('configured',s.configured,'lastRunAt',s.last_run_at,'staleWorkspaces',s.stale,
      'enabledWorkspaces',s.enabled,'failedRuns24h',s.failed_runs),
    'push',jsonb_build_object('configured',p.configured,'pending',p.pending,'overdue',p.overdue,'failed24h',p.failed),
    'activeIncidents',i.active,
    'incidents',(select coalesce(jsonb_agg(jsonb_build_object('code',n.code,'severity',n.severity,'active',n.active,
      'firstSeenAt',n.first_seen_at,'lastSeenAt',n.last_seen_at,'resolvedAt',n.resolved_at)
      order by n.active desc,greatest(n.last_seen_at,n.resolved_at) desc,n.code),'[]'::jsonb)
      from (select * from reviewed_incidents where active or greatest(last_seen_at,resolved_at)>=now()-interval '7 days'
        order by active desc,greatest(last_seen_at,resolved_at) desc,code limit 10) n),
    'recentFailures',(select coalesce(jsonb_agg(jsonb_build_object('at',f.at,'code',f.code) order by f.at desc),'[]'::jsonb)
      from (select coalesce(finished_at,started_at) as at,case when error_code~'^[A-Z0-9]{5}$' then error_code end as code
        from wow_ops.runs where status='failed' and started_at>=now()-interval '24 hours'
        order by at desc,id desc limit 10) f))
  into report from scheduler s cross join push p cross join incident_count i;
  return report;
end $$;
revoke all on function public.wow_platform_operations_report(uuid,uuid) from public,anon,authenticated;
grant execute on function public.wow_platform_operations_report(uuid,uuid) to service_role;

commit;
