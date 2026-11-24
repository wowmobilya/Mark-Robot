-- Install after the company folder registry and the confirmed-company purge.
-- All application row handles and logical keys remain stable.
alter table wow_purge.intents add column if not exists requires_linked_confirmation boolean not null default true;

create or replace function wow_storage_company.object_present(logical_key text)
returns boolean language sql stable security definer set search_path='' as $$
  select exists (
    select from (
      select logical_key as path
      union all
      select h.root||'/'||logical_key
      from wow_storage_company.folders(wow_storage_company.owner(logical_key)) h(root)
    ) keys
    join storage.objects o on o.bucket_id='mark-robot-private' and o.name collate "C"=keys.path collate "C"
  )
$$;

create or replace function wow_storage_company.purge_batch(wid uuid)
returns table(path text,marker boolean) language sql stable security definer set search_path='' as $$
  with roots as (
    select wid::text as root,false as named
    union all select 'chat/'||wid::text,false
    union all select 'files/'||wid::text,false
    union all select h.root,true from wow_storage_company.folders(wid) h(root)
  )
  select page.name, roots.named and page.name=roots.root||'/.keep' as marker
  from roots cross join lateral (
    select o.name from storage.objects o where o.bucket_id='mark-robot-private'
      and o.name collate "C" >= (roots.root||'/') collate "C"
      and o.name collate "C" < (roots.root||'0') collate "C"
      and wow_storage_company.owner(o.name)=wid
    order by o.name collate "C" limit 20
  ) page
  order by marker, page.name collate "C" limit 20
$$;
revoke all on function wow_storage_company.object_present(text),wow_storage_company.purge_batch(uuid)
 from public,anon,authenticated,service_role;

-- Transform only known source fragments so independently updated business logic and grants
-- are preserved. Fail this migration atomically if a future source version needs review.
do $compat$
declare
  change record;
  definition text;
begin
  for change in select * from (values
    ('public.wow_files_service(text,jsonb)'::regprocedure,$before$exists(select from storage.objects o where o.bucket_id='mark-robot-private' and o.name=wow_collab.file_path(f))$before$,$after$wow_storage_company.object_present(wow_collab.file_path(f))$after$),
    ('public.wow_chat_service(text,jsonb)'::regprocedure,$before$exists(select from storage.objects o where o.bucket_id='mark-robot-private' and o.name=wow_collab.asset_path(b))$before$,$after$wow_storage_company.object_present(wow_collab.asset_path(b))$after$),
    ('public.wow_storage_maintenance(text,jsonb)'::regprocedure,$before$exists(select from storage.objects o where o.bucket_id='mark-robot-private' and o.name=target.path)$before$,$after$wow_storage_company.object_present(target.path)$after$),
    ('wow_purge.company(uuid,uuid,text,jsonb)'::regprocedure,$before$ pending boolean;$before$,$after$ pending boolean;
 has_content boolean;$after$),
    ('wow_purge.company(uuid,uuid,text,jsonb)'::regprocedure,$before$select exists(select from wow_purge.intents where workspace_id=wid) into pending;$before$,$after$select coalesce(bool_or(i.requires_linked_confirmation),false) into pending from wow_purge.intents i where i.workspace_id=wid;$after$),
    ('wow_purge.company(uuid,uuid,text,jsonb)'::regprocedure,$before$ select coalesce(jsonb_agg(jsonb_build_object('bucket',bucket_id,'path',name) order by name),'[]') into objects
 from (select bucket_id,name from storage.objects
       where bucket_id='mark-robot-private' and
        (name like wid::text||'/%' or name like 'chat/'||wid::text||'/%' or name like 'files/'||wid::text||'/%')
       order by name limit 20) batch;
 -- Unexpected workspace paths require manual inspection. Never remove another tenant's objects.
 select exists(select from storage.objects where wid::text=any(string_to_array(name,'/')) and
   not (bucket_id='mark-robot-private' and (name like wid::text||'/%' or name like 'chat/'||wid::text||'/%' or name like 'files/'||wid::text||'/%'))) into unknown_storage;
$before$,$after$ select coalesce(jsonb_agg(jsonb_build_object('bucket','mark-robot-private','path',b.path) order by b.path),'[]'::jsonb),
        coalesce(bool_or(not b.marker),false)
   into objects,has_content
 from wow_storage_company.purge_batch(wid) b;
 -- Guards against unknown key shapes, cross-tenant aliases and misplaced objects. This
 -- conservative fallback deliberately checks unowned objects outside the standard roots.
 select exists(select from storage.objects o
   where (wid::text=any(string_to_array(o.name,'/'))
          or (split_part(o.name,'/',1)='companies' and right(split_part(o.name,'/',2),38)='--'||wid::text))
     and not (o.bucket_id='mark-robot-private' and wow_storage_company.owner(o.name) is not distinct from wid
       and (split_part(o.name,'/',1)<>'companies' or
          exists(select from wow_storage_company.folders(wid) f(root) where f.root=split_part(o.name,'/',1)||'/'||split_part(o.name,'/',2)))))
   into unknown_storage;
$after$),
    ('wow_purge.company(uuid,uuid,text,jsonb)'::regprocedure,$before$linked=pending or cardinality(account_ids)>0 or jsonb_array_length(objects)>0;$before$,$after$linked=pending or cardinality(account_ids)>0 or has_content;$after$),
    ('wow_purge.company(uuid,uuid,text,jsonb)'::regprocedure,$before$or fk.ns='wow_purge' then continue;$before$,$after$or fk.ns='wow_purge' or (fk.ns='wow_storage_company' and fk.rel='folder_history') then continue;$after$),
    ('wow_purge.company(uuid,uuid,text,jsonb)'::regprocedure,$before$insert into wow_purge.intents(workspace_id,actor_id) values(wid,p_user) on conflict(workspace_id) do nothing;$before$,$after$insert into wow_purge.intents as i(workspace_id,actor_id,requires_linked_confirmation)
   values(wid,p_user,linked) on conflict(workspace_id) do update
   set requires_linked_confirmation=i.requires_linked_confirmation or excluded.requires_linked_confirmation;$after$)
  ) patch(signature,old_fragment,new_fragment)
  loop
    definition=pg_get_functiondef(change.signature);
    if strpos(definition,change.new_fragment)>0 then continue; end if;
    if strpos(definition,change.old_fragment)=0 or
       strpos(substr(definition,strpos(definition,change.old_fragment)+length(change.old_fragment)),change.old_fragment)>0 then
      raise exception 'Unexpected source for %; refusing partial storage compatibility patch',change.signature;
    end if;
    execute replace(definition,change.old_fragment,change.new_fragment);
  end loop;
end $compat$;

