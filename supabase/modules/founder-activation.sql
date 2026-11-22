begin;
create table if not exists public.wow_owner_recovery_requests(
 id uuid primary key default gen_random_uuid(),workspace_id uuid not null references public.wow_workspaces(id),
 owner_id uuid not null references public.wow_accounts(id),session_version bigint not null,
 created_at timestamptz not null default now(),expires_at timestamptz not null default now()+interval '30 minutes',consumed_at timestamptz
);
create index if not exists wow_owner_recovery_scope on public.wow_owner_recovery_requests(workspace_id,created_at);
alter table public.wow_owner_recovery_requests enable row level security;
revoke all on public.wow_owner_recovery_requests from public,anon,authenticated;
create or replace function public.wow_founder_activation(p_user uuid,p_session uuid,p_action text,p_data jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare wid uuid=(p_data->>'workspaceId')::uuid;w public.wow_workspaces%rowtype;a public.wow_accounts%rowtype;c public.wow_setup_claims%rowtype;
 expiry timestamptz;mail text;rid uuid;digest text;can_recover boolean;
begin
 perform public.wow_platform_require(p_user,p_session);
 if p_action='company.reissue' then
  -- Match setup.claim lock order: claim(s) first, then the workspace.
  perform 1 from public.wow_setup_claims where workspace_id=wid and used_at is null order by token_hash for update;
 end if;
 select * into w from public.wow_workspaces where id=wid for update;
 if w.id is null then raise exception 'COMPANY_NOT_FOUND';end if;
 select * into a from public.wow_accounts where workspace_id=wid and role='owner' and deleted_at is null order by created_at limit 1;
 select * into c from public.wow_setup_claims where workspace_id=wid and used_at is null order by expires_at desc limit 1;
 select lower(u.email) into mail from auth.users u where u.id=a.id and lower(u.email)=lower(a.login_email) and u.email_confirmed_at is not null and u.deleted_at is null and not coalesce(u.is_anonymous,false) and (u.banned_until is null or u.banned_until<=now()) and u.email not ilike '%@wow.invalid';
 can_recover=mail is not null and w.status='active' and a.status='active' and (a.expires_at is null or a.expires_at>now()) and not exists(select from public.wow_platform_owners where user_id=a.id and active)
  and (select count(*) from public.wow_accounts where workspace_id=wid and role='owner' and deleted_at is null)=1;
 if p_action='company.activation' then
  return jsonb_build_object('state',case when a.id is not null then 'active' when c.token_hash is null then 'unissued' when c.expires_at<=now() then 'expired' else 'pending' end,'expiresAt',case when a.id is null then c.expires_at end,'canRecover',can_recover);
 elsif p_action='company.reissue' then
  if w.status<>'active' or exists(select from public.wow_accounts where workspace_id=wid) then raise exception 'ALREADY_CONFIGURED';end if;
  digest=p_data->>'claimHash';expiry=(p_data->>'expiresAt')::timestamptz;
  if digest is null or digest !~ '^[a-f0-9]{64}$' or expiry is null or expiry<=now() or expiry>now()+interval '61 minutes' then raise exception 'INVALID_REQUEST';end if;
  if c.token_hash=digest and c.expires_at>now() then return jsonb_build_object('workspaceId',wid,'expiresAt',c.expires_at);end if;
  update public.wow_setup_claims set expires_at=now() where workspace_id=wid and used_at is null and expires_at>now();
  insert into public.wow_setup_claims(token_hash,workspace_id,expires_at) values(digest,wid,expiry);
  insert into public.wow_platform_company_audit(actor_id,workspace_id,action) values(p_user,wid,'invite_reissued');
  return jsonb_build_object('workspaceId',wid,'expiresAt',expiry);
 elsif p_action='company.recover' then
  if not can_recover or p_data->'confirmed' is distinct from 'true'::jsonb then raise exception 'ACCESS_DENIED';end if;
  if exists(select from public.wow_owner_recovery_requests where workspace_id=wid and created_at>now()-interval '5 minutes') then raise exception 'RATE_LIMITED';end if;
  update public.wow_owner_recovery_requests set consumed_at=now() where workspace_id=wid and consumed_at is null;
  insert into public.wow_owner_recovery_requests(workspace_id,owner_id,session_version) values(wid,a.id,a.session_version) returning id into rid;
  insert into public.wow_platform_company_audit(actor_id,workspace_id,action) values(p_user,wid,'owner_recovery_requested');
  return jsonb_build_object('requestId',rid,'email',mail);
 end if;
 raise exception 'ACCESS_DENIED';
end $$;
create or replace function public.wow_owner_recovery_consume(p_request uuid,p_owner uuid,p_email text) returns boolean language plpgsql security definer set search_path='' as $$
declare r public.wow_owner_recovery_requests%rowtype;
begin
 select * into r from public.wow_owner_recovery_requests where id=p_request and owner_id=p_owner and consumed_at is null and expires_at>now() for update;
 if not found then return false;end if;
 update public.wow_accounts a set session_version=a.session_version+1 where a.id=p_owner and a.workspace_id=r.workspace_id and a.session_version=r.session_version and a.status='active' and a.role='owner' and a.deleted_at is null and lower(a.login_email)=lower(p_email) and (a.expires_at is null or a.expires_at>now())
 and exists(select from public.wow_workspaces where id=r.workspace_id and status='active') and exists(select from auth.users u where u.id=p_owner and lower(u.email)=lower(a.login_email) and u.email_confirmed_at is not null and u.email not ilike '%@wow.invalid' and u.deleted_at is null and not coalesce(u.is_anonymous,false) and (u.banned_until is null or u.banned_until<=now()))
 and not exists(select from public.wow_platform_owners where user_id=p_owner and active);
 if not found then return false;end if;
 update public.wow_sessions set closed_at=now() where account_id=p_owner and closed_at is null;
 update public.wow_owner_recovery_requests set consumed_at=now() where id=r.id;
 return true;
end $$;
revoke all on function public.wow_founder_activation(uuid,uuid,text,jsonb),public.wow_owner_recovery_consume(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.wow_founder_activation(uuid,uuid,text,jsonb),public.wow_owner_recovery_consume(uuid,uuid,text) to service_role;
commit;
