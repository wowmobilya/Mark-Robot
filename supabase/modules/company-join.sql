begin;
create table if not exists public.wow_company_join_requests(
 id uuid primary key,workspace_id uuid not null references public.wow_workspaces(id),proof_hash text not null check(proof_hash~'^[a-f0-9]{64}$'),
 alias uuid not null unique default gen_random_uuid(),username text not null,name text not null,provider_user uuid unique,
 state text not null default 'preparing' check(state in('preparing','pending','approved','rejected')),created_at timestamptz not null default now(),
 decided_at timestamptz,decided_by uuid references public.wow_accounts(id)
);
create index if not exists wow_company_join_inbox on public.wow_company_join_requests(workspace_id,state,created_at);
alter table public.wow_company_join_requests enable row level security;
revoke all on public.wow_company_join_requests from public,anon,authenticated;

create or replace function public.wow_company_join(p_action text,p_data jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare wid uuid;uid uuid;ctx jsonb;r public.wow_company_join_requests%rowtype;rid uuid=(p_data->>'id')::uuid;
 n text=btrim(p_data->>'name');uname text=p_data->>'username';h text=p_data->>'proofHash';choice text=p_data->>'decision';items jsonb;
begin
 if p_action in('prepare','bind') then
  wid=(p_data->>'workspaceId')::uuid;
  if rid is null or h is null or h!~'^[0-9a-f]{64}$' then raise exception 'INVALID_REQUEST';end if;
  perform 1 from public.wow_workspaces w where w.id=wid and w.status='active' and exists(select from public.wow_accounts a where a.workspace_id=w.id and a.role='owner' and a.status='active' and a.deleted_at is null) for update;
  if not found then raise exception 'ACCESS_DENIED';end if;
  select * into r from public.wow_company_join_requests where id=rid for update;
  if r.id is null and p_action='prepare' then
   if length(coalesce(n,'')) not between 1 and 100 or uname is null or length(uname) not between 3 and 64 or lower(btrim(uname))<>uname then raise exception 'INVALID_REQUEST';end if;
   if exists(select from public.wow_accounts where workspace_id=wid and username=uname and deleted_at is null) then raise exception 'USERNAME_TAKEN';end if;
   if (select count(*) from public.wow_company_join_requests where workspace_id=wid and created_at>now()-interval '1 hour')>=60 then raise exception 'RATE_LIMITED';end if;
   insert into public.wow_company_join_requests(id,workspace_id,proof_hash,username,name) values(rid,wid,h,uname,n) returning * into r;
  end if;
  if r.id is null or r.workspace_id<>wid or r.proof_hash<>h or (p_action='prepare' and (r.username,r.name) is distinct from (uname,n)) then raise exception 'ACCESS_DENIED';end if;
  if p_action='bind' and r.state='preparing' then
   uid=(p_data->>'providerUser')::uuid;
   if not exists(select from auth.users u where u.id=uid and u.email=r.alias::text||'@wow.invalid' and u.deleted_at is null and not coalesce(u.is_anonymous,false)) or exists(select from public.wow_accounts where id=uid) then raise exception 'ACCESS_DENIED';end if;
   update public.wow_company_join_requests set state='pending',provider_user=uid where id=r.id returning * into r;
  end if;
  return jsonb_build_object('id',r.id,'state',r.state,'alias',case when r.state='preparing' then r.alias::text||'@wow.invalid' end);
 end if;
 if p_action not in('companyJoin.list','companyJoin.decide') then raise exception 'ACCESS_DENIED';end if;
 uid=(p_data->>'userId')::uuid;
 ctx=public.wow_actor(uid,(p_data->>'sessionId')::uuid,null,p_action='companyJoin.decide',p_action='companyJoin.decide');
 if ctx->'account'->>'role'<>'owner' then raise exception 'ACCESS_DENIED';end if;
 wid=(ctx->>'workspaceId')::uuid;
 if p_action='companyJoin.list' then
  select coalesce(jsonb_agg(jsonb_build_object('id',id,'name',name,'username',username,'state',state,'createdAt',created_at) order by created_at desc,id),'[]'::jsonb) into items
  from (select * from public.wow_company_join_requests where workspace_id=wid and state<>'preparing' and (rid is null or id=rid) order by created_at desc,id limit 50 offset greatest(0,coalesce((p_data->>'offset')::int,0))) j;
  return jsonb_build_object('requests',items,'total',(select count(*) from public.wow_company_join_requests where workspace_id=wid and state<>'preparing' and (rid is null or id=rid)));
 end if;
 if choice is null or choice not in('approved','rejected') then raise exception 'INVALID_REQUEST';end if;
 select * into r from public.wow_company_join_requests where id=rid and workspace_id=wid for update;
 if r.id is null or r.state='preparing' then raise exception 'ACCESS_DENIED';end if;
 if r.state=choice then return jsonb_build_object('id',r.id,'state',choice);end if;
 if r.state<>'pending' then raise exception 'CONFLICT';end if;
 if choice='approved' then
  if not exists(select from auth.users u where u.id=r.provider_user and u.email=r.alias::text||'@wow.invalid' and u.deleted_at is null and not coalesce(u.is_anonymous,false) and (u.banned_until is null or u.banned_until<=now())) then raise exception 'ACCESS_DENIED';end if;
  insert into public.wow_accounts(id,workspace_id,login_email,username,name,role,permissions)
   values(r.provider_user,wid,r.alias::text||'@wow.invalid',r.username,r.name,'customer',array['gallery.view','myorders.view','myorders.edit']);
 end if;
 update public.wow_company_join_requests set state=choice,decided_by=uid,decided_at=now() where id=r.id;
 insert into public.wow_audit(workspace_id,actor_id,action,target_type,target_id) values(wid,uid,'company_join_'||choice,'company_join',r.id::text);
 return jsonb_build_object('id',r.id,'state',choice);
exception when unique_violation then raise exception 'USERNAME_TAKEN';
end $$;
revoke all on function public.wow_company_join(text,jsonb) from public,anon,authenticated;
grant execute on function public.wow_company_join(text,jsonb) to service_role;
-- Withdraw legacy self-registration including outstanding proofs. Existing customer recovery remains available.
create or replace function wow_customer.require_company_approval() returns trigger language plpgsql set search_path='' as $$
begin
 if new.kind='register' then raise exception 'JOIN_APPROVAL_REQUIRED';end if;
 return new;
end $$;
drop trigger if exists wow_customer_no_auto_membership on wow_customer.requests;
create trigger wow_customer_no_auto_membership before insert or update of state on wow_customer.requests for each row execute function wow_customer.require_company_approval();
commit;
