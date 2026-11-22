-- Founder-only diagnostic mirror for WOW tenant programs.
-- Never logs into a tenant account, binds a device, refreshes a tenant token or mutates tenant records.
begin;
create table if not exists public.wow_platform_inspection_audit (
 id bigint generated always as identity primary key,
 actor_id uuid not null references auth.users(id),
 workspace_id uuid not null references public.wow_workspaces(id),
 section text not null,
 viewed_at timestamptz not null default now()
);
create index if not exists wow_platform_inspection_audit_scope on public.wow_platform_inspection_audit(workspace_id,viewed_at desc);
alter table public.wow_platform_inspection_audit enable row level security;
revoke all on public.wow_platform_inspection_audit from public,anon,authenticated;

create or replace function public.wow_platform_inspect(
 p_user uuid,p_session uuid,p_workspace uuid,p_section text default 'summary',p_offset integer default 0)
returns jsonb language plpgsql security definer set search_path='' as $$
declare w public.wow_workspaces; entries jsonb='[]'::jsonb; stats jsonb='{}'::jsonb;
        total_rows bigint=0; store_name text;
begin
 perform public.wow_platform_require(p_user,p_session);
 if p_workspace is null or p_section is null or p_section not in
   ('summary','accounts','companies','products','invoices','payments','settings','audit','gallery-orders','gallery-listings','files','calls')
   or p_offset is null or p_offset<0 or p_offset>10000 then
   raise exception using message='INVALID_REQUEST',errcode='P0001';end if;
 select * into w from public.wow_workspaces where id=p_workspace;
 if not found then raise exception using message='COMPANY_NOT_FOUND',errcode='P0001';end if;
 -- The audit entry is in platform-owned storage, never the tenant's sync or audit tables.
 insert into public.wow_platform_inspection_audit(actor_id,workspace_id,section)
 values(p_user,p_workspace,p_section);
 if p_section='summary' then
   select coalesce(jsonb_object_agg(store,n),'{}'::jsonb) into stats
   from (select r.store,count(*) n from public.wow_records r
         where r.workspace_id=p_workspace and r.deleted_at is null group by r.store) q;
   return jsonb_build_object('readOnly',true,'capturedAt',now(),
     'workspace',jsonb_build_object('id',w.id,'name',w.name,'status',w.status,'createdAt',w.created_at,
       'dataRevision',w.data_revision,'controlRevision',w.control_revision),
     'summary',jsonb_build_object('recordsByType',stats,
       'accounts',(select count(*) from public.wow_accounts a where a.workspace_id=p_workspace and a.deleted_at is null),
       'registeredDevices',(select count(*) from public.wow_account_installations i join public.wow_accounts a on a.id=i.account_id where a.workspace_id=p_workspace and a.deleted_at is null),
       'unclosedSessions',(select count(*) from public.wow_sessions s join public.wow_accounts a on a.id=s.account_id where a.workspace_id=p_workspace and s.closed_at is null),
       'galleryOrders',(select count(*) from public.wow_gallery_orders o where o.workspace_id=p_workspace and o.archived_at is null),
       'files',(select count(*) from wow_collab.files f where f.workspace_id=p_workspace and f.state='ready' and not f.archived),
       'lastRecordUpdate',(select max(r.updated_at) from public.wow_records r where r.workspace_id=p_workspace)));
 elsif p_section='accounts' then
   select count(*) into total_rows from public.wow_accounts a where a.workspace_id=p_workspace and a.deleted_at is null;
   select coalesce(jsonb_agg(to_jsonb(q)),'[]'::jsonb) into entries from (
     select a.id,a.name,a.username,a.role,a.department,a.status,a.permissions,a.expires_at as "expiresAt",
            a.created_at as "createdAt",a.updated_at as "updatedAt",
       (select count(*) from public.wow_account_installations i where i.account_id=a.id) as "devicesCount",
       (select count(*) from public.wow_sessions s where s.account_id=a.id and s.closed_at is null) as "unclosedSessions"
     from public.wow_accounts a where a.workspace_id=p_workspace and a.deleted_at is null
     order by a.created_at desc,a.id limit 40 offset p_offset) q;
 elsif p_section in ('companies','products','invoices','payments','settings') then
   store_name=p_section;
   select count(*) into total_rows from public.wow_records r where r.workspace_id=p_workspace and r.store=store_name and r.deleted_at is null;
   select coalesce(jsonb_agg(to_jsonb(q)),'[]'::jsonb) into entries from (
     select r.record_id as id,r.revision,r.updated_at as "updatedAt",
       -- Settings can contain provider secrets; only metadata is exposed to the diagnostic UI.
       case when store_name='settings' then null else r.payload end as value
     from public.wow_records r where r.workspace_id=p_workspace and r.store=store_name and r.deleted_at is null
     order by r.updated_at desc,r.record_id limit 40 offset p_offset) q;
 elsif p_section='audit' then
   select count(*) into total_rows from public.wow_audit a where a.workspace_id=p_workspace;
   select coalesce(jsonb_agg(to_jsonb(q)),'[]'::jsonb) into entries from (
     select a.id,a.actor_id as "actorId",a.target_type as "targetType",a.target_id as "targetId",a.action,a.source,a.created_at as "createdAt"
     from public.wow_audit a where a.workspace_id=p_workspace order by a.id desc limit 40 offset p_offset) q;
 elsif p_section='gallery-orders' then
   select count(*) into total_rows from public.wow_gallery_orders o where o.workspace_id=p_workspace and o.archived_at is null;
   select coalesce(jsonb_agg(to_jsonb(q)),'[]'::jsonb) into entries from (
     select o.id,o.number,o.status,o.customer_name as "customerName",o.created_at as "createdAt",o.updated_at as "updatedAt",o.version
     from public.wow_gallery_orders o where o.workspace_id=p_workspace and o.archived_at is null
     order by o.created_at desc,o.id limit 40 offset p_offset) q;
 elsif p_section='gallery-listings' then
   select count(*) into total_rows from public.wow_gallery_listings l where l.workspace_id=p_workspace;
   select coalesce(jsonb_agg(to_jsonb(q)),'[]'::jsonb) into entries from (
     select l.product_id as "productId",l.published,l.stock,l.price_minor as "priceMinor",l.currency,l.collection,l.version
     from public.wow_gallery_listings l where l.workspace_id=p_workspace
     order by l.product_id limit 40 offset p_offset) q;
 elsif p_section='files' then
   select count(*) into total_rows from wow_collab.files f where f.workspace_id=p_workspace and f.state='ready' and not f.archived;
   select coalesce(jsonb_agg(to_jsonb(q)),'[]'::jsonb) into entries from (
     select f.id,f.name,f.kind,f.mime,f.bytes,f.created_at as "createdAt"
     from wow_collab.files f where f.workspace_id=p_workspace and f.state='ready' and not f.archived
     order by f.created_at desc,f.id limit 40 offset p_offset) q;
 elsif p_section='calls' then
   select count(*) into total_rows from wow_voice.calls c where c.workspace_id=p_workspace;
   select coalesce(jsonb_agg(to_jsonb(q)),'[]'::jsonb) into entries from (
     select c.id,c.kind,c.status,c.created_at as "createdAt",c.started_at as "startedAt",c.ended_at as "endedAt"
     from wow_voice.calls c where c.workspace_id=p_workspace order by c.created_at desc,c.id limit 40 offset p_offset) q;
 end if;
 return jsonb_build_object('readOnly',true,'capturedAt',now(),
   'workspace',jsonb_build_object('id',w.id,'name',w.name,'status',w.status),
   'section',p_section,'offset',p_offset,'total',total_rows,'items',entries);
end $$;
revoke all on function public.wow_platform_inspect(uuid,uuid,uuid,text,integer) from public,anon,authenticated;
grant execute on function public.wow_platform_inspect(uuid,uuid,uuid,text,integer) to service_role;
commit;