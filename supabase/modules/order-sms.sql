begin;
create table if not exists public.wow_order_sms_jobs(
 id uuid primary key,workspace_id uuid not null references public.wow_workspaces,order_id uuid not null references public.wow_gallery_orders,
 actor_id uuid not null references public.wow_accounts,version bigint not null,recipient_digest bytea not null,sender text not null,language text not null,
 status text not null default 'sending' check(status in ('sending','accepted','failed','uncertain')),
 created_at timestamptz not null default now(),expires_at timestamptz not null default now()+interval '1 hour'
);
create index if not exists wow_order_sms_recent on public.wow_order_sms_jobs(workspace_id,created_at);
alter table public.wow_order_sms_jobs enable row level security;
revoke all on public.wow_order_sms_jobs from public,anon,authenticated;
create or replace function public.wow_order_sms(p_action text,p_data jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare j public.wow_order_sms_jobs%rowtype;o public.wow_gallery_orders%rowtype;ctx jsonb;wid uuid;uid uuid;phone text;outcome jsonb;
begin
 if p_action in ('finish','download') then
   select * into j from public.wow_order_sms_jobs where id=(p_data->>'id')::uuid;
   if j.id is null then return null;end if;
   if p_action='finish' then
    update public.wow_order_sms_jobs set status=p_data->>'status' where id=j.id and status='sending' and p_data->>'status' in('accepted','failed','uncertain');return '{}';
   end if;
   if j.expires_at<=now() or j.status='failed' then return null;end if;
   select r.* into o from public.wow_gallery_orders r join public.wow_workspaces w on w.id=r.workspace_id and w.status='active'
    where r.workspace_id=j.workspace_id and r.id=j.order_id and r.version=j.version and r.archived_at is null and r.status<>'cancelled';
   if o.id is null or extensions.digest(wow_customer.contact(o.account_id)->>'phone','sha256') is distinct from j.recipient_digest then return null;end if;
   select jsonb_build_object('number',o.number,'created',o.created_at,'company',w.name,'lines',coalesce((select jsonb_agg(jsonb_build_object(
    'name',l.name,'quantity',l.quantity,'price',case when l.show_base then l.price_minor end,'currency',l.currency) order by l.position)
    from public.wow_gallery_lines l where l.order_id=o.id and not l.hidden and l.show_in_print and l.quantity>0),'[]'::jsonb)) into outcome from public.wow_workspaces w where w.id=j.workspace_id;
   return outcome;
 end if;
 if p_action not in ('preview','reserve') then raise exception 'ACCESS_DENIED';end if;
 uid=(p_data->>'userId')::uuid;
 ctx=public.wow_actor(uid,(p_data->>'sessionId')::uuid,null,p_action='reserve',p_action='reserve');wid=(ctx->>'workspaceId')::uuid;
 if not public.wow_gallery_can(ctx,'orders.edit') or ctx->'account'->>'role'='customer' then raise exception 'ACCESS_DENIED';end if;
 select * into o from public.wow_gallery_orders where id=(p_data->>'orderId')::uuid and workspace_id=wid and archived_at is null and status<>'cancelled';
 if o.id is null then raise exception 'ACCESS_DENIED';end if;
 phone=wow_customer.contact(o.account_id)->>'phone';
 if p_action='preview' then return jsonb_build_object('workspace',wid,'destinationMasked',case when phone is not null then '•••• '||right(phone,4) end,'orderNumber',o.number,'version',o.version);end if;
 if p_data->>'workspace' is distinct from wid::text or p_data->'consent' is distinct from 'true'::jsonb or phone is null or phone !~ '^\+[1-9][0-9]{7,14}$' then raise exception 'INVALID_RECIPIENT';end if;
 perform pg_advisory_xact_lock(hashtextextended(wid::text,97));
 select * into j from public.wow_order_sms_jobs where id=(p_data->>'id')::uuid;
 if j.id is not null then
  if (j.actor_id,j.workspace_id,j.order_id,j.version,j.sender,j.language) is distinct from (uid,wid,o.id,(p_data->>'version')::bigint,p_data->>'sender',p_data->>'language') then raise exception 'IDEMPOTENCY_MISMATCH';end if;
  return jsonb_build_object('status',case when j.status='sending' then 'uncertain' else j.status end);
 end if;
 if o.version is distinct from (p_data->>'version')::bigint then raise exception 'VERSION_CONFLICT';end if;
 if (select count(*) from public.wow_order_sms_jobs where workspace_id=wid and created_at>now()-interval '1 day')>=100 or
  (select count(*) from public.wow_order_sms_jobs where workspace_id=wid and order_id=o.id and created_at>now()-interval '1 day')>=3 then raise exception 'RATE_LIMITED';end if;
 insert into public.wow_order_sms_jobs(id,workspace_id,order_id,actor_id,version,recipient_digest,sender,language) values((p_data->>'id')::uuid,wid,o.id,uid,o.version,extensions.digest(phone,'sha256'),p_data->>'sender',p_data->>'language');
 return jsonb_build_object('claimed',true,'destination',phone);
end $$;
revoke all on function public.wow_order_sms(text,jsonb) from public,anon,authenticated;
grant execute on function public.wow_order_sms(text,jsonb) to service_role;
commit;
