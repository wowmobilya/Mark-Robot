begin;

-- Exposed only through the service-role inspection RPC after founder verification.
create or replace function public.wow_platform_storage_inventory(p_user uuid,p_session uuid,p_workspace uuid,p_offset integer)
returns jsonb language plpgsql security definer set search_path='' as $inventory$
declare
 company public.wow_workspaces;
 inventory jsonb;
begin
 perform public.wow_platform_require(p_user,p_session);
 if p_workspace is null or p_offset is null or p_offset<0 or p_offset>2147483600 then
   raise exception 'INVALID_REQUEST';
 end if;
 select * into company from public.wow_workspaces where id=p_workspace;
 if not found then raise exception 'COMPANY_NOT_FOUND'; end if;
 insert into public.wow_platform_inspection_audit(actor_id,workspace_id,section) values(p_user,p_workspace,'storage');
 with physical as (
   select o.name as path,o.created_at,o.updated_at,o.metadata,
     case when o.name like 'companies/%' then substr(o.name,length(split_part(o.name,'/',2))+12) else o.name end as logical_path
   from storage.objects o
   where o.bucket_id='mark-robot-private' and (
     o.name like p_workspace::text||'/%' or o.name like 'chat/'||p_workspace::text||'/%' or o.name like 'files/'||p_workspace::text||'/%'
     or (o.name like 'companies/%' and right(split_part(o.name,'/',2),38)='--'||p_workspace::text)
   )
 ), scoped as materialized (
   select p.*,case when (p.metadata->>'size') ~ '^[0-9]{1,18}$' then (p.metadata->>'size')::bigint end as bytes
   from physical p where p.logical_path like p_workspace::text||'/%'
     or p.logical_path like 'chat/'||p_workspace::text||'/%' or p.logical_path like 'files/'||p_workspace::text||'/%'
 ), page as (
   select * from scoped order by updated_at desc nulls last,path limit 40 offset p_offset
 ), rows as (
   select p.path, p.created_at as "createdAt",p.updated_at as "updatedAt",p.bytes,
     case when p.logical_path like 'chat/%' then 'chat' when g.id is not null or split_part(p.logical_path,'/',2)='gallery' then 'gallery'
       when p.logical_path like 'files/%' then 'files' else 'media' end as source,
     coalesce(nullif(a.name,''),nullif(f.name,''),case when leaf.filename !~* '^(?:[0-9a-f-]{32,}|[0-9a-f]{64})(?:[.][a-z0-9]{1,10})?$' then leaf.filename end) as name,
     coalesce(nullif(p.metadata->>'mimetype',''),a.mime,f.mime,g.content_type,m.content_type) as mime
   from page p cross join lateral (select regexp_replace(p.logical_path,'^.*/','') filename) leaf
   left join wow_collab.chat_assets a on a.workspace_id=p_workspace and a.id::text=split_part(p.logical_path,'/',4) and p.logical_path='chat/'||a.workspace_id||'/'||a.owner_id||'/'||a.id||'/'||a.digest
   left join wow_collab.files f on f.workspace_id=p_workspace and f.id::text=split_part(p.logical_path,'/',4) and p.logical_path='files/'||f.workspace_id||'/'||f.owner_id||'/'||f.id||'/'||f.digest
   left join public.wow_gallery_assets g on g.workspace_id=p_workspace and g.path in (p.logical_path,p.path)
   left join lateral (select u.content_type from public.wow_media_uploads u where u.workspace_id=p_workspace and u.storage_path in (p.logical_path,p.path) limit 1) m on true
 )
 select jsonb_build_object('readOnly',true,'workspace',jsonb_build_object('id',company.id,'name',company.name),'section','storage','offset',p_offset,
     'total',(select count(*) from scoped),'totalBytes',(select coalesce(sum(bytes),0) from scoped),
     'unknownSizes',(select count(*) from scoped where bytes is null),
     'items',coalesce((select jsonb_agg(to_jsonb(r) order by r."updatedAt" desc nulls last,r.path) from rows r),'[]'::jsonb)) into inventory;
 return inventory;
end $inventory$;
revoke all on function public.wow_platform_storage_inventory(uuid,uuid,uuid,integer) from public,anon,authenticated,service_role;

-- Preserve existing inspector sections and service ACLs.
do $install$
declare definition text; marker constant text='perform public.wow_platform_require(p_user,p_session);';
begin
 definition=pg_get_functiondef('public.wow_platform_inspect(uuid,uuid,uuid,text,integer)'::regprocedure);
 if strpos(definition,'public.wow_platform_storage_inventory')=0 then
   if strpos(definition,marker)=0 then raise exception 'Unexpected inspector definition';end if;
   execute replace(definition,marker,'if p_section=''storage'' then return public.wow_platform_storage_inventory(p_user,p_session,p_workspace,p_offset); end if; '||marker);
 end if;
end $install$;
commit;
