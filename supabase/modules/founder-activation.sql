begin;
create table if not exists public.wow_owner_approval_requests(
 workspace_id uuid primary key references public.wow_workspaces(id),
 owner_id uuid not null unique references public.wow_accounts(id),
 requested_at timestamptz not null default now(),
 approved_at timestamptz, approved_by uuid references public.wow_platform_owners(user_id),
 check ((approved_at is null)=(approved_by is null))
);
alter table public.wow_owner_approval_requests enable row level security;
revoke all on public.wow_owner_approval_requests from public,anon,authenticated;

create table if not exists public.wow_owner_approval_receipts(
 token_hash text primary key check(token_hash ~ '^[0-9a-f]{64}$'),
 owner_id uuid not null references public.wow_owner_approval_requests(owner_id) on delete cascade,
 expires_at timestamptz not null default now()+interval '24 hours'
);
alter table public.wow_owner_approval_receipts enable row level security;
revoke all on public.wow_owner_approval_receipts from public,anon,authenticated;
create index if not exists wow_owner_receipt_expiry on public.wow_owner_approval_receipts(expires_at);

-- Install the approval gate in the same transaction that consumes the invitation.
-- Existing installations bootstrapped outside the company control panel keep their setup flow.
create or replace function public.wow_pending_owner_status() returns trigger
language plpgsql set search_path='' as $$
begin
 new.status='suspended';
 return new;
end $$;
revoke all on function public.wow_pending_owner_status() from public,anon,authenticated;
drop trigger if exists wow_pending_owner_status on public.wow_accounts;
create trigger wow_pending_owner_status before insert on public.wow_accounts for each row
 when(new.role='owner' and new.id::text=current_setting('wow.pending_owner_id',true))
 execute function public.wow_pending_owner_status();

create or replace function public.wow_stage_owner_approval() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if exists(select 1 from public.wow_platform_company_audit where workspace_id=new.workspace_id and action in ('created','invite_reissued')) then
  if not exists(select from public.wow_accounts where id=new.used_by and workspace_id=new.workspace_id and role='owner' and status='suspended') then
   raise exception 'INVALID_REQUEST';
  end if;
  insert into public.wow_owner_approval_requests(workspace_id,owner_id) values(new.workspace_id,new.used_by);
 end if;
 return new;
end $$;
revoke all on function public.wow_stage_owner_approval() from public,anon,authenticated;
drop trigger if exists wow_stage_owner_approval on public.wow_setup_claims;
create trigger wow_stage_owner_approval after update of used_at on public.wow_setup_claims
 for each row when(old.used_at is null and new.used_at is not null) execute function public.wow_stage_owner_approval();

create or replace function public.wow_owner_enrollment(p_action text,p_data jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare result jsonb;prior record;
begin
 if p_action='approval.login' then
  select a.login_email into prior from public.wow_owner_approval_requests r
   join public.wow_accounts a on a.id=r.owner_id and a.workspace_id=r.workspace_id
   join public.wow_workspaces w on w.id=r.workspace_id
   where r.owner_id=(p_data->>'userId')::uuid and r.workspace_id=(p_data->>'workspaceId')::uuid
    and r.approved_at is null and w.status='active' and a.role='owner' and a.status='suspended' and a.deleted_at is null;
  if found then return jsonb_build_object('email',prior.login_email);end if;
  return '{}';
 elsif p_action='approval.issue' then
  delete from public.wow_owner_approval_receipts where expires_at<=now();
  insert into public.wow_owner_approval_receipts(token_hash,owner_id)
   select p_data->>'tokenHash',owner_id from public.wow_owner_approval_requests
   where owner_id=(p_data->>'userId')::uuid and workspace_id=(p_data->>'workspaceId')::uuid
   on conflict(token_hash) do nothing;
  return '{}';
 elsif p_action='approval.status' then
  select r.approved_at,a.status into prior from public.wow_owner_approval_receipts t
   join public.wow_owner_approval_requests r on r.owner_id=t.owner_id
   join public.wow_accounts a on a.id=r.owner_id and a.workspace_id=r.workspace_id
   join public.wow_workspaces w on w.id=r.workspace_id
   where t.token_hash=p_data->>'tokenHash' and t.expires_at>now() and r.workspace_id=(p_data->>'workspaceId')::uuid
    and w.status='active' and a.role='owner' and a.deleted_at is null and (a.expires_at is null or a.expires_at>now());
  if found and prior.approved_at is null and prior.status='suspended' then return jsonb_build_object('state','pending');end if;
  if found and prior.approved_at is not null and prior.status='active' then return jsonb_build_object('state','approved');end if;
  raise exception 'AUTH_REQUIRED';
 elsif p_action='setup.inspect' then
  -- A lost response can be retried with the original invite, username and password.
  select c.workspace_id,a.id,a.login_email,(r.approved_at is null) pending into prior
   from public.wow_setup_claims c join public.wow_owner_approval_requests r on r.workspace_id=c.workspace_id and r.owner_id=c.used_by
   join public.wow_accounts a on a.id=r.owner_id and a.workspace_id=r.workspace_id
   where c.token_hash=p_data->>'claimHash' and c.used_at is not null and c.expires_at>now()
    and a.username=p_data->>'username' and a.role='owner' and a.deleted_at is null;
  if found then return jsonb_build_object('workspaceId',prior.workspace_id,'enrolledUser',prior.id,'email',prior.login_email,'pendingApproval',prior.pending);end if;
 elsif p_action='setup.claim' then
  if exists(select 1 from public.wow_platform_company_audit where workspace_id=(p_data->>'workspaceId')::uuid and action in ('created','invite_reissued')) then
   perform set_config('wow.pending_owner_id',p_data->>'userId',true);
  end if;
 else raise exception 'ACCESS_DENIED';
 end if;
 result=public.wow_service(p_action,p_data);
 if p_action='setup.claim' and exists(select 1 from public.wow_owner_approval_requests
  where workspace_id=(result->>'workspaceId')::uuid and owner_id=(p_data->>'userId')::uuid and approved_at is null) then
  return result || jsonb_build_object('pendingApproval',true);
 end if;
 return result;
end $$;
revoke all on function public.wow_owner_enrollment(text,jsonb) from public,anon,authenticated;
grant execute on function public.wow_owner_enrollment(text,jsonb) to service_role;
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
 expiry timestamptz;mail text;rid uuid;digest text;can_recover boolean;r public.wow_owner_approval_requests%rowtype;
begin
 perform public.wow_platform_require(p_user,p_session);
 if p_action='company.reissue' then
  -- Match setup.claim lock order: claim(s) first, then the workspace.
  perform 1 from public.wow_setup_claims where workspace_id=wid and used_at is null order by token_hash for update;
 end if;
 select * into w from public.wow_workspaces where id=wid for update;
 if w.id is null then raise exception 'COMPANY_NOT_FOUND';end if;
 select * into a from public.wow_accounts where workspace_id=wid and role='owner' and deleted_at is null order by created_at limit 1;
 select * into r from public.wow_owner_approval_requests where workspace_id=wid and owner_id=a.id;
 select * into c from public.wow_setup_claims where workspace_id=wid and used_at is null order by expires_at desc limit 1;
 select lower(u.email) into mail from auth.users u where u.id=a.id and lower(u.email)=lower(a.login_email) and u.email_confirmed_at is not null and u.deleted_at is null and not coalesce(u.is_anonymous,false) and (u.banned_until is null or u.banned_until<=now()) and u.email not ilike '%@wow.invalid';
 can_recover=mail is not null and w.status='active' and a.status='active' and (a.expires_at is null or a.expires_at>now()) and not exists(select from public.wow_platform_owners where user_id=a.id and active)
  and (select count(*) from public.wow_accounts where workspace_id=wid and role='owner' and deleted_at is null)=1;
 if p_action='company.activation' then
  if r.owner_id is not null and r.approved_at is null and a.status='suspended' and (a.expires_at is null or a.expires_at>now()) then
   return jsonb_build_object('state','awaiting_approval','ownerId',a.id,'name',a.name,'username',a.username,'requestedAt',r.requested_at,'canApprove',w.status='active' and a.status='suspended');
  end if;
  return jsonb_build_object('state',case
   when a.expires_at<=now() then 'owner_expired'
   when a.status='suspended' then 'owner_suspended'
   when a.status in ('revoked','deleted') then 'owner_unavailable'
   when a.status='active' then 'active'
   when exists(select from public.wow_accounts where workspace_id=wid) then 'owner_unavailable'
   when c.token_hash is null then 'unissued'
   when c.expires_at<=now() then 'expired' else 'pending' end,'expiresAt',case when a.id is null then c.expires_at end,'canRecover',can_recover);
 elsif p_action='company.approveOwner' then
  if r.owner_id is null or r.owner_id is distinct from (p_data->>'ownerId')::uuid or w.status<>'active' or a.expires_at<=now() then raise exception 'ACCESS_DENIED';end if;
  if r.approved_at is null then
   update public.wow_accounts set status='active',session_version=session_version+1,updated_at=now()
    where id=r.owner_id and workspace_id=wid and role='owner' and status='suspended' and deleted_at is null and (expires_at is null or expires_at>now())
     and exists(select from auth.users u where u.id=r.owner_id and u.deleted_at is null and not coalesce(u.is_anonymous,false) and (u.banned_until is null or u.banned_until<=now()));
   if not found then raise exception 'ACCESS_DENIED';end if;
   update public.wow_owner_approval_requests set approved_at=now(),approved_by=p_user where workspace_id=wid;
   insert into public.wow_platform_company_audit(actor_id,workspace_id,action) values(p_user,wid,'owner_approved');
  elsif a.status<>'active' then raise exception 'ACCESS_DENIED';
  end if;
  return jsonb_build_object('state','active');
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
