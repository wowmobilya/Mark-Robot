-- First verified application login binds the company's account to an installation.
-- No existing device, user or session is modified by applying this migration.
begin;
create table if not exists public.wow_account_installations (
  account_id uuid primary key references public.wow_accounts(id) on delete cascade,
  digest text not null check (digest ~ '^[0-9a-f]{64}$'),
  bound_at timestamptz not null default now(),
  blocked boolean not null default false
);
alter table public.wow_account_installations enable row level security;
revoke all on public.wow_account_installations from public,anon,authenticated;

create or replace function public.wow_device_session(p_action text,p_data jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=(p_data->>'userId')::uuid; sid uuid:=(p_data->>'sessionId')::uuid;
 a public.wow_accounts; binding public.wow_account_installations; proof text:=p_data->>'installationHash'; result jsonb;
begin
 if p_action not in ('session.open','session.snapshot') then raise exception 'ACCESS_DENIED';end if;
 -- Both the provider session and application account are verified before a binding is committed.
 select * into a from public.wow_accounts where id=uid;
 if a.id is null then raise exception 'ACCOUNT_UNAVAILABLE';end if;
 perform 1 from public.wow_workspaces where id=a.workspace_id for share;
 select * into a from public.wow_accounts where id=uid for update;
 if p_data->>'activationWorkspace' is not null and (a.role<>'owner' or a.workspace_id::text<>p_data->>'activationWorkspace') then raise exception 'ACCESS_DENIED';end if;
 if exists(select from public.wow_platform_owners where user_id=uid and active) then return public.wow_service(p_action,p_data);end if;
 if p_data->'founderOnly'='true'::jsonb then raise exception 'ACCESS_DENIED';end if;
 select * into binding from public.wow_account_installations where account_id=uid;
 if binding.blocked then raise exception 'DEVICE_BLOCKED';end if;
 if binding.account_id is not null and proof is distinct from binding.digest then raise exception 'DEVICE_ALREADY_BOUND';end if;
 if p_action='session.open' and (proof is null or proof !~ '^[0-9a-f]{64}$') then raise exception 'DEVICE_PROOF_REQUIRED';end if;
 result=public.wow_service(p_action,p_data);
 if p_action='session.open' and binding.account_id is null then
   insert into public.wow_account_installations(account_id,digest) values(uid,proof);
   update public.wow_sessions set closed_at=now() where account_id=uid and session_id<>sid and closed_at is null;
   update public.wow_push_subscriptions set active=false,updated_at=now() where account_id=uid and session_id<>sid and active;
 end if;
 return result;
end $$;

create or replace function public.wow_manage_devices(p_user uuid,p_session uuid,p_action text,p_data jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare actor jsonb; founder boolean; wid uuid; target uuid:=(p_data->>'accountId')::uuid; a public.wow_accounts;
 entry public.wow_account_installations; rows jsonb; n integer; page_offset integer:=greatest(0,coalesce((p_data->>'offset')::int,0)); op text;
begin
 actor=public.wow_actor(p_user,p_session,null,false,false);
 founder=p_action like 'company.%';
 if founder then perform public.wow_platform_require(p_user,p_session);wid=(p_data->>'workspaceId')::uuid;
 else
   if actor->'account'->>'role'<>'owner' then raise exception 'ACCESS_DENIED';end if;
   wid=(actor->>'workspaceId')::uuid;
 end if;
 op=split_part(p_action,'.',2);
 if op='devices' then
   with visible as (select acct.id "accountId",acct.username,acct.name,acct.role,b.bound_at "boundAt",b.blocked
      from public.wow_account_installations b join public.wow_accounts acct on acct.id=b.account_id
      where acct.workspace_id=wid and (target is null or acct.id=target)
      and not exists(select from public.wow_platform_owners f where f.user_id=acct.id and f.active)),
     page as (select * from visible order by "boundAt" desc,"accountId" limit 30 offset page_offset)
   select coalesce((select jsonb_agg(to_jsonb(p) order by p."boundAt" desc,p."accountId") from page p),'[]'::jsonb),(select count(*) from visible) into rows,n;
   return jsonb_build_object('devices',rows,'total',n);
 end if;
 if op not in ('releaseDevice','deviceStatus') or p_data->'confirmed' is distinct from 'true'::jsonb or target is null or target=p_user then raise exception 'ACCESS_DENIED';end if;
 select * into a from public.wow_accounts where id=target and workspace_id=wid for update;
 if a.id is null or (not founder and a.role='owner') or exists(select from public.wow_platform_owners f where f.user_id=target and f.active)
 then raise exception 'ACCESS_DENIED';end if;
 select * into entry from public.wow_account_installations where account_id=target;
 if entry.account_id is null then raise exception 'DEVICE_NOT_BOUND';end if;
 if p_data->>'expectedBoundAt' is not null and (p_data->>'expectedBoundAt')::timestamptz is distinct from entry.bound_at then raise exception 'CONFLICT';end if;
 if op='releaseDevice' then
   if entry.blocked then raise exception 'DEVICE_BLOCKED';end if;
   delete from public.wow_account_installations where account_id=target;
 else
   if jsonb_typeof(p_data->'blocked') is distinct from 'boolean' then raise exception 'INVALID_REQUEST';end if;
   if entry.blocked=(p_data->>'blocked')::boolean then return jsonb_build_object('blocked',entry.blocked);end if;
   update public.wow_account_installations set blocked=(p_data->>'blocked')::boolean where account_id=target;
 end if;
 update public.wow_accounts set session_version=session_version+1,updated_at=now() where id=target;
 update public.wow_sessions set closed_at=now() where account_id=target and closed_at is null;
 update public.wow_push_subscriptions set active=false,updated_at=now() where account_id=target and active;
 insert into public.wow_audit(workspace_id,actor_id,target_id,action) values(wid,p_user,target::text,
    case when op='releaseDevice' then 'device.released' when (p_data->>'blocked')::boolean then 'device.blocked' else 'device.unblocked' end);
 if founder then insert into public.wow_platform_company_audit(actor_id,workspace_id,action) values(p_user,wid,op);end if;
 return case when op='releaseDevice' then jsonb_build_object('released',true) else jsonb_build_object('blocked',(p_data->>'blocked')::boolean) end;
end $$;
revoke all on function public.wow_device_session(text,jsonb),public.wow_manage_devices(uuid,uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.wow_device_session(text,jsonb),public.wow_manage_devices(uuid,uuid,text,jsonb) to service_role;
commit;
