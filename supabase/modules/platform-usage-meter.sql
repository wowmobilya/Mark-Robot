-- Count connected time through the last server-authorized lease, including calls swept later.
begin;

create or replace function wow_limits.seconds_used(wid uuid,media_kind text,at_time timestamptz default now(),omitted uuid default null)
returns numeric language sql stable set search_path='' as $$
 with period as (select date_trunc('month',at_time at time zone 'UTC') at time zone 'UTC' as start_at)
 select coalesce(sum(greatest(0,extract(epoch from
  least(c.ended_at,c.expires_at,at_time)-greatest(c.started_at,period.start_at)))),0)::numeric
 from wow_voice.calls c cross join period
 where c.workspace_id=wid and c.kind=media_kind and c.started_at is not null
  and c.started_at<at_time and c.expires_at>period.start_at and (c.ended_at is null or c.ended_at>period.start_at)
  and (omitted is null or c.id<>omitted);
$$;
revoke all on function wow_limits.seconds_used(uuid,text,timestamptz,uuid) from public,anon,authenticated;

commit;
