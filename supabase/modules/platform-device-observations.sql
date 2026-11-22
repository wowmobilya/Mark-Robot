-- Diagnostic device hints. Client reports are informative, never identity proofs.
-- The platform founder can inspect sessions without touching tenant sessions or devices.
begin;
create table if not exists public.wow_client_device_observations(
 session_id uuid primary key references auth.sessions(id) on delete cascade,
 account_id uuid not null references public.wow_accounts(id) on delete cascade,
 workspace_id uuid not null references public.wow_workspaces(id),
 form_factor text not null check(form_factor in ('phone','tablet','desktop','unknown')),
 platform_name text not null check(length(platform_name) between 1 and 80),
 browser_name text not null check(length(browser_name) between 1 and 80),
 browser_agent text not null check(length(browser_agent)<=512),
 screen_width integer check(screen_width between 0 and 10000),
 screen_height integer check(screen_height between 0 and 10000),
 first_reported_at timestamptz not null default now(),
 last_reported_at timestamptz not null default now()
);
create index if not exists wow_client_device_observations_workspace on public.wow_client_device_observations(workspace_id,last_reported_at desc);
alter table public.wow_client_device_observations enable row level security;
revoke all on public.wow_client_device_observations from public,anon,authenticated;
create or replace function public.wow_client_devices_rpc(p_user uuid,p_session uuid,p_action text,p_data jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare ctx jsonb; wid uuid; requested uuid; kind text; platform_name text; browser_name text; agent text;
        sw integer;sh integer;items jsonb;total_count integer; page_offset integer;
begin
 if p_action='report' then
   ctx=public.wow_actor(p_user,p_session,null,false,false);
   wid=(ctx->>'workspaceId')::uuid;
   kind=p_data->>'formFactor';platform_name=p_data->>'platformName';
   browser_name=p_data->>'browserName';agent=coalesce(p_data->>'userAgent','');
   if kind not in ('phone','tablet','desktop','unknown')
     or platform_name is null or length(platform_name) not between 1 and 80
     or browser_name is null or length(browser_name) not between 1 and 80
     or length(agent)>512 then raise exception using message='INVALID_REQUEST',errcode='P0001';end if;
   sw=nullif(p_data->>'screenWidth','')::integer;sh=nullif(p_data->>'screenHeight','')::integer;
   if (sw is not null and (sw<0 or sw>10000)) or (sh is not null and (sh<0 or sh>10000))
     then raise exception using message='INVALID_REQUEST',errcode='P0001';end if;
   insert into public.wow_client_device_observations
     (session_id,account_id,workspace_id,form_factor,platform_name,browser_name,browser_agent,screen_width,screen_height)
   values(p_session,p_user,wid,kind,platform_name,browser_name,agent,sw,sh)
   on conflict(session_id) do update set form_factor=excluded.form_factor,platform_name=excluded.platform_name,
     browser_name=excluded.browser_name,browser_agent=excluded.browser_agent,
     screen_width=excluded.screen_width,screen_height=excluded.screen_height,last_reported_at=now()
   where public.wow_client_device_observations.account_id=p_user
     and public.wow_client_device_observations.workspace_id=wid;
   return jsonb_build_object('recorded',true);
 elsif p_action='list' then
   perform public.wow_platform_require(p_user,p_session);
   requested=(p_data->>'workspaceId')::uuid;
   page_offset=coalesce((p_data->>'offset')::integer,0);
   if requested is null or page_offset<0 or page_offset>10000 then raise exception using message='INVALID_REQUEST',errcode='P0001';end if;
   if not exists(select 1 from public.wow_workspaces w where w.id=requested)then raise exception using message='COMPANY_NOT_FOUND',errcode='P0001';end if;
   select count(*) into total_count from public.wow_sessions s join public.wow_accounts a on a.id=s.account_id
     where a.workspace_id=requested;
   select coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) into items from (
     select s.session_id as id,a.username,a.name,a.role,
       s.started_at as "startedAt",s.last_active_at as "lastActivityAt",s.closed_at as "closedAt",
       -- Provider IP and UA may describe WOW's Edge runtime. Neither is proof of a user's location/device.
       host(su.ip) as "providerIp",su.user_agent as "providerAgent",
       o.form_factor as "reportedDevice",o.platform_name as "reportedPlatform",o.browser_name as "reportedBrowser",
       o.browser_agent as "reportedAgent",o.screen_width as "reportedWidth",o.screen_height as "reportedHeight",
       o.last_reported_at as "reportedAt"
     from public.wow_sessions s
     join public.wow_accounts a on a.id=s.account_id
     left join auth.sessions su on su.id=s.session_id and su.user_id=a.id
     left join public.wow_client_device_observations o on o.session_id=s.session_id and o.account_id=a.id
     where a.workspace_id=requested
     order by s.started_at desc,s.session_id limit 40 offset page_offset) t;
   return jsonb_build_object('readOnly',true,
     'workspace',jsonb_build_object('id',requested),
     'section','devices','offset',page_offset,'total',total_count,
     'ipSource','Supabase Auth server connection; may be WOW Edge egress, not the end-user IP',
     'reportedDeviceConfidence','Client-reported and unverified; an unclosed session is not proof of presence',
     'items',items);
 end if;
 raise exception using message='INVALID_ACTION',errcode='P0001';
end $$;
revoke all on function public.wow_client_devices_rpc(uuid,uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.wow_client_devices_rpc(uuid,uuid,text,jsonb) to service_role;
commit;