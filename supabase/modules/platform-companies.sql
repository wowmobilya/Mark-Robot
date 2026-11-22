begin;
create table if not exists public.wow_platform_owners (
 user_id uuid primary key references auth.users(id), active boolean not null default true,
 created_at timestamptz not null default now()
);
create table if not exists public.wow_platform_company_audit (
 id bigint generated always as identity primary key, actor_id uuid not null references auth.users(id),
 workspace_id uuid not null references public.wow_workspaces(id), action text not null,
 at timestamptz not null default now()
);
alter table public.wow_platform_owners enable row level security;
alter table public.wow_platform_company_audit enable row level security;
revoke all on public.wow_platform_owners,public.wow_platform_company_audit from public,anon,authenticated;
create or replace function public.wow_platform_require(p_user uuid,p_session uuid)
returns void language plpgsql stable security definer set search_path='' as $$
begin
 if not exists(select 1 from public.wow_platform_owners p join auth.users u on u.id=p.user_id join auth.sessions s on s.user_id=u.id
   where p.user_id=p_user and p.active and s.id=p_session and (s.not_after is null or s.not_after>now())
     and u.deleted_at is null and (u.banned_until is null or u.banned_until<=now()) and not coalesce(u.is_anonymous,false)) then
   raise exception using message='ACCESS_DENIED',errcode='P0001';
 end if;
end $$;
revoke all on function public.wow_platform_require(uuid,uuid) from public,anon,authenticated;
grant execute on function public.wow_platform_require(uuid,uuid) to service_role;
create or replace function public.wow_platform_service(p_user uuid,p_session uuid,p_action text,p_data jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare wid uuid; company_name text; claim text; expiry timestamptz; target_status text; result jsonb;
begin
 perform public.wow_platform_require(p_user,p_session);
 if p_action='company.create' then
   company_name=btrim(coalesce(p_data->>'name',''));claim=p_data->>'claimHash';
   begin expiry=(p_data->>'expiresAt')::timestamptz; exception when others then raise exception using message='INVALID_COMPANY',errcode='P0001'; end;
   if length(company_name) not between 1 and 100 or claim is null or claim !~ '^[0-9a-f]{64}$' or expiry is null or expiry<=now() or expiry>now()+interval '24 hours' then
     raise exception using message='INVALID_COMPANY',errcode='P0001';
   end if;
   perform pg_advisory_xact_lock(hashtextextended(claim,0));
   select c.workspace_id into wid from public.wow_setup_claims c
    join public.wow_workspaces w on w.id=c.workspace_id and w.name=company_name
    join public.wow_platform_company_audit a on a.workspace_id=w.id and a.actor_id=p_user and a.action='created'
    where c.token_hash=claim and c.used_at is null and c.expires_at>now();
   if found then return jsonb_build_object('workspaceId',wid);end if;
   insert into public.wow_workspaces(name) values(company_name) returning id into wid;
   insert into public.wow_setup_claims(token_hash,workspace_id,expires_at) values(claim,wid,expiry);
   insert into public.wow_platform_company_audit(actor_id,workspace_id,action) values(p_user,wid,'created');
   return jsonb_build_object('workspaceId',wid);
 elsif p_action='company.rename' then
   company_name=btrim(coalesce(p_data->>'name',''));wid=(p_data->>'workspaceId')::uuid;
   if length(company_name) not between 1 and 100 then raise exception using message='INVALID_COMPANY',errcode='P0001';end if;
   update public.wow_workspaces set name=company_name,control_revision=control_revision+1 where id=wid and name<>company_name;
   if found then insert into public.wow_platform_company_audit(actor_id,workspace_id,action) values(p_user,wid,'renamed');
   elsif not exists(select from public.wow_workspaces where id=wid) then raise exception using message='COMPANY_NOT_FOUND',errcode='P0001';end if;
   return jsonb_build_object('workspaceId',wid,'name',company_name);
 elsif p_action='company.status' then
   begin wid=(p_data->>'workspaceId')::uuid; exception when others then raise exception using message='INVALID_COMPANY',errcode='P0001'; end;
   target_status=p_data->>'status';
   if wid is null or target_status is null or target_status not in ('active','suspended') then raise exception using message='INVALID_COMPANY',errcode='P0001';end if;
   update public.wow_workspaces set status=target_status,control_revision=control_revision+1 where id=wid and status<>target_status;
   if not found then
     if not exists(select 1 from public.wow_workspaces where id=wid) then raise exception using message='COMPANY_NOT_FOUND',errcode='P0001';end if;
     return jsonb_build_object('workspaceId',wid,'status',target_status,'changed',false);
   end if;
   insert into public.wow_platform_company_audit(actor_id,workspace_id,action) values(p_user,wid,target_status);
   return jsonb_build_object('workspaceId',wid,'status',target_status,'changed',true);
 elsif p_action='company.list' then
   select coalesce(jsonb_agg(jsonb_build_object('id',id,'name',name,'status',status,'createdAt',created_at,'accounts',account_count) order by created_at desc,id),'[]'::jsonb)
    into result from (select w.id,w.name,w.status,w.created_at,(select count(*) from public.wow_accounts a where a.workspace_id=w.id and a.deleted_at is null) account_count from public.wow_workspaces w order by w.created_at desc,w.id limit 50 offset greatest(0,coalesce((p_data->>'offset')::integer,0))) w;
   return jsonb_build_object('companies',result,'total',(select count(*) from public.wow_workspaces));
 elsif p_action='company.audit' then
   select coalesce(jsonb_agg(jsonb_build_object('workspaceId',workspace_id,'action',action,'at',at) order by id desc),'[]'::jsonb)
    into result from (select id,workspace_id,action,at from public.wow_platform_company_audit order by id desc limit 200) a;
   return jsonb_build_object('events',result);
 end if;
 raise exception using message='UNKNOWN_ACTION',errcode='P0001';
end $$;
revoke all on function public.wow_platform_service(uuid,uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.wow_platform_service(uuid,uuid,text,jsonb) to service_role;
commit;

