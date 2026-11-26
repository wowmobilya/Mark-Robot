-- Apply after account-installations.sql and platform-primary-owner-device.sql.
begin;
create table if not exists public.wow_pairing_codes (
 account_id uuid primary key references public.wow_accounts(id) on delete cascade,
 issuer uuid not null, issuer_session uuid not null, version bigint not null, workspace_id uuid not null,
 digest text not null unique, expires_at timestamptz not null, installation text
);
create table if not exists public.wow_paired_installations (
 account_id uuid references public.wow_account_installations(account_id) on delete cascade,
 digest text not null, primary key(account_id,digest)
);
alter table public.wow_pairing_codes enable row level security;
alter table public.wow_paired_installations enable row level security;
revoke all on public.wow_pairing_codes,public.wow_paired_installations from public,anon,authenticated;

create or replace function wow_limits.devices_used(wid uuid)
returns bigint language sql stable set search_path='' as $$
 select greatest(count(*) - case when coalesce(bool_or(a.role='owner'),false) then 1 else 0 end,0)
 + (select count(*) from public.wow_paired_installations p join public.wow_accounts b on b.id=p.account_id where b.workspace_id=wid and b.deleted_at is null)
 from public.wow_account_installations i join public.wow_accounts a on a.id=i.account_id
 where a.workspace_id=wid and a.deleted_at is null;
$$;

create or replace function public.wow_device_pairing(p_action text,p_data jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare target uuid:=(p_data->>'accountId')::uuid; uid uuid:=(p_data->>'userId')::uuid;
 sid uuid:=(p_data->>'sessionId')::uuid; ctx jsonb; a public.wow_accounts; g public.wow_pairing_codes;
 h text:=p_data->>'digest'; device text:=p_data->>'installation'; email text;
begin
 if h is null or h !~ '^[0-9a-f]{64}$' then raise exception 'ACCESS_DENIED';end if;
 if p_action='claim' then
  select * into g from public.wow_pairing_codes where digest=h and expires_at>clock_timestamp() and installation is null for update;
  if g.account_id is null or device is null or device !~ '^[0-9a-f]{64}$' or target is distinct from g.account_id then raise exception 'ACCESS_DENIED';end if;
  uid=g.issuer;sid=g.issuer_session;
 elsif p_action<>'issue' then raise exception 'ACCESS_DENIED';end if;
 ctx=public.wow_actor(uid,sid,null,false,false);
 select * into a from public.wow_accounts where id=target and workspace_id=(ctx->>'workspaceId')::uuid and status='active' and deleted_at is null;
 if ctx->'account'->>'role' is distinct from 'owner' or a.id is null or a.role='customer' or (a.role='owner' and a.id<>uid)
  or (a.id<>uid and exists(select from public.wow_platform_owners where user_id=a.id and active))
  or (a.expires_at is not null and a.expires_at<=now()) then raise exception 'ACCESS_DENIED';end if;
 if p_action='issue' then
  insert into public.wow_pairing_codes values(a.id,uid,sid,a.session_version,a.workspace_id,h,now()+interval '2 minutes',null)
  on conflict(account_id) do update set issuer=excluded.issuer,issuer_session=excluded.issuer_session,version=excluded.version,
    workspace_id=excluded.workspace_id,digest=excluded.digest,expires_at=excluded.expires_at,installation=null;
  insert into public.wow_audit(workspace_id,actor_id,action,target_id) values(a.workspace_id,uid,'device.pairing_issued',a.id::text);
  return jsonb_build_object('workspaceId',a.workspace_id);
 end if;
 if a.workspace_id is distinct from (p_data->>'workspaceId')::uuid or a.session_version<>g.version then raise exception 'ACCESS_DENIED';end if;
 select u.email into email from auth.users u where u.id=a.id and u.email=a.login_email and u.deleted_at is null and not coalesce(u.is_anonymous,false);
 if email is null then raise exception 'ACCESS_DENIED';end if;
 update public.wow_pairing_codes set installation=device where digest=h;
 return jsonb_build_object('email',email);
end $$;

do $$ begin
 if to_regprocedure('public.wow_primary_device_session(text,jsonb)') is null then
  alter function public.wow_device_session(text,jsonb) rename to wow_primary_device_session;
 end if;
end $$;
create or replace function public.wow_device_session(p_action text,p_data jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=(p_data->>'userId')::uuid; device text:=p_data->>'installationHash'; grant_hash text:=p_data->>'pairingDigest';
 a public.wow_accounts; binding public.wow_account_installations; g public.wow_pairing_codes; sub wow_limits.subscriptions; cap integer; result jsonb;
begin
 if p_action not in('session.open','session.snapshot') then raise exception 'ACCESS_DENIED';end if;
 if grant_hash is null and not exists(select from public.wow_paired_installations where account_id=uid and digest=device) then
  return public.wow_primary_device_session(p_action,p_data);
 end if;
 select * into a from public.wow_accounts where id=uid;
 perform 1 from public.wow_workspaces where id=a.workspace_id for share;
 select * into a from public.wow_accounts where id=uid for update;
 select * into binding from public.wow_account_installations where account_id=uid;
 if binding.blocked or a.id is null or coalesce((p_data->>'founderOnly')::boolean,false) or p_data->>'activationWorkspace' is not null then raise exception 'ACCESS_DENIED';end if;
 if grant_hash is not null then
  delete from public.wow_pairing_codes where digest=grant_hash and installation=device and account_id=uid and version=a.session_version
    and workspace_id=a.workspace_id and expires_at>clock_timestamp() returning * into g;
  if g.account_id is null or p_action<>'session.open' then raise exception 'ACCESS_DENIED';end if;
  perform public.wow_actor(g.issuer,g.issuer_session,null,false,false);
  if binding.account_id is null or binding.digest=device then return public.wow_primary_device_session(p_action,p_data);end if;
  perform pg_advisory_xact_lock(hashtextextended('wow-plan-phone:'||a.workspace_id::text,0));
  insert into public.wow_paired_installations values(uid,device) on conflict do nothing;
  if found then
   select * into sub from wow_limits.subscriptions where workspace_id=a.workspace_id;
   select device_limit into cap from wow_limits.plans where id=sub.plan_id;
   if sub.expires_at<=now() then raise exception 'SUBSCRIPTION_EXPIRED';end if;
   if cap is not null and wow_limits.devices_used(a.workspace_id)>cap+coalesce(sub.extra_devices,0) then raise exception 'DEVICE_LIMIT_REACHED';end if;
  end if;
 elsif not exists(select from public.wow_paired_installations where account_id=uid and digest=device) then raise exception 'ACCESS_DENIED';end if;
 result=public.wow_service(p_action,p_data);
 return result;
end $$;
revoke all on function public.wow_device_pairing(text,jsonb),public.wow_device_session(text,jsonb) from public,anon,authenticated;
grant execute on function public.wow_device_pairing(text,jsonb),public.wow_device_session(text,jsonb) to service_role;
commit;
