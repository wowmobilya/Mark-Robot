begin;
create schema if not exists wow_storage_company;
revoke all on schema wow_storage_company from public,anon,authenticated;

-- S3-compatible object keys are ASCII. Keep the original display name in wow_workspaces.
create or replace function wow_storage_company.slug(display_name text) returns text
language plpgsql immutable strict set search_path='' as $slug$
declare
 label text:=normalize(display_name,NFKD);
 pair text[];
begin
 foreach pair slice 1 in array array[
   ['حسين','Hussein'],['الجاسم','al-Jassem'],['محمد','Mohammad'],['مارك','Mark'],['ربوت','Robot'],['روبوت','Robot'],
   ['ش','sh'],['خ','kh'],['غ','gh'],['ث','th'],['ذ','dh'],['ظ','z'],['ؤ','w'],['ئ','y'],['ة','a'],
   ['ß','ss'],['Æ','AE'],['æ','ae'],['Œ','OE'],['œ','oe'],['ı','i'],['Ł','L'],['ł','l']
 ] loop label:=replace(label,pair[1],pair[2]);end loop;
 label:=translate(label,'ابتجحدرزسصضطعفقكلمنهويىء','abtjhdrzssdtafqklmnhwyaa');
 -- Remove canonical combining marks after decomposing accented Turkish and European letters.
 label:=regexp_replace(label,U&'[\0300-\036f\064b-\065f\0670]','','g');
 label:=trim(both '-' from regexp_replace(label,'[^a-zA-Z0-9]+','-','g'));
 return coalesce(nullif(rtrim(left(label,80),'-'),''),'Company');
end $slug$;

create or replace function wow_storage_company.folder_key(wid uuid, display_name text) returns text
language sql immutable strict set search_path='' as $$
 select 'companies/'||wow_storage_company.slug(display_name)||'--'||wid::text
$$;
create table if not exists wow_storage_company.folder_history(
 folder text primary key,
 workspace_id uuid not null references public.wow_workspaces(id) on delete cascade,
 activated_at timestamptz not null default now()
);
create index if not exists wow_storage_company_folder_owner on wow_storage_company.folder_history(workspace_id,folder);
alter table wow_storage_company.folder_history enable row level security;
revoke all on wow_storage_company.folder_history from public,anon,authenticated;
create or replace function wow_storage_company.remember() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 insert into wow_storage_company.folder_history(folder,workspace_id) values(wow_storage_company.folder_key(new.id,new.name),new.id)
 on conflict(folder) do update set activated_at=now();
 return new;
end $$;
drop trigger if exists wow_remember_storage_folder on public.wow_workspaces;
create trigger wow_remember_storage_folder after insert or update of name on public.wow_workspaces
for each row execute function wow_storage_company.remember();
insert into wow_storage_company.folder_history(folder,workspace_id)
select wow_storage_company.folder_key(id,name),id from public.wow_workspaces on conflict(folder) do nothing;
create or replace function wow_storage_company.folder(wid uuid) returns text
language sql stable set search_path='' as $$
 select wow_storage_company.folder_key(id,name) from public.wow_workspaces where id=wid
$$;
create or replace function wow_storage_company.folders(wid uuid) returns setof text
language sql stable set search_path='' as $$
 select folder from wow_storage_company.folder_history where workspace_id=wid
$$;

create or replace function wow_storage_company.owner(path text) returns uuid
language plpgsql immutable strict set search_path='' as $$
declare
 parts text[]:=string_to_array(path,'/');
 wid text;
 outer_id text;
 uuid_pattern constant text:='^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$';
begin
 if length(path)>1024 or path~'[[:cntrl:]]' or strpos(path,chr(92))>0 or parts && array['','.','..'] then return null;end if;
 if parts[1]='companies' then
   if cardinality(parts)<3 or parts[2]!~'^[a-zA-Z0-9][a-zA-Z0-9_-]{0,100}--[0-9a-f-]{36}$' then return null;end if;
   outer_id:=right(parts[2],36);
   if outer_id!~uuid_pattern then return null;end if;
   parts:=parts[3:cardinality(parts)];
   if parts=array['.keep'] then return outer_id::uuid;end if;
 end if;
 if cardinality(parts)>=3 and parts[1] in ('chat','files') then wid:=parts[2];
 elsif cardinality(parts)>=2 then wid:=parts[1];
 else return null;end if;
 if wid!~uuid_pattern or (outer_id is not null and outer_id<>wid) then return null;end if;
 return wid::uuid;
end $$;
create or replace function wow_storage_company.canonical(path text) returns text
language sql immutable strict set search_path='' as $$
 select case when wow_storage_company.owner(path) is null then null
   when starts_with(path,'companies/') then nullif(substr(path,length(split_part(path,'/',2))+12),'.keep')
   else path end
$$;

create or replace function public.wow_company_storage_resolve(p_path text,p_mode text) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare
 wid uuid:=wow_storage_company.owner(p_path);
 current_key text;
 existing text[];
begin
 if wid is null or wow_storage_company.canonical(p_path) is distinct from p_path or p_mode not in ('read','write','maintenance') or p_mode is null then
   raise exception 'INVALID_STORAGE_PATH';
 end if;
 current_key:=wow_storage_company.folder(wid)||'/'||p_path;
 if current_key is null then raise exception 'COMPANY_NOT_FOUND';end if;
 select array_agg(keys.key order by (keys.key=current_key) desc,keys.key) into existing
 from (select p_path as key union all select f||'/'||p_path from wow_storage_company.folders(wid) f) keys
 join storage.objects o on o.bucket_id='mark-robot-private' and o.name=keys.key;
 return jsonb_build_object('path',coalesce(existing[1],current_key))
   ||case when p_mode='maintenance' then jsonb_build_object('paths',coalesce(existing,array[]::text[])) else '{}'::jsonb end;
end $$;
revoke all on function public.wow_company_storage_resolve(text,text) from public,anon,authenticated;
grant execute on function public.wow_company_storage_resolve(text,text) to service_role;

-- A destination must be older than the longest issued signed URL (300 seconds)
-- before a worker may retire the original. Its bytes are verified on every retirement.
create or replace function public.wow_company_storage_jobs() returns jsonb
language sql stable security definer set search_path='' as $$
 with active as materialized (
   select w.id,wow_storage_company.folder_key(w.id,w.name) folder from public.wow_workspaces w
   where not exists(select from wow_purge.intents pending where pending.workspace_id=w.id)
 ), candidates as (
   select a.id,null::text source,a.folder||'/.keep' destination from active a
   where not exists(select from storage.objects o where o.bucket_id='mark-robot-private' and o.name=a.folder||'/.keep')
   union all
   select a.id,o.name,a.folder||'/'||coalesce(wow_storage_company.canonical(o.name),'.keep') from active a
   cross join lateral (
     select a.id::text root union all select 'chat/'||a.id::text union all select 'files/'||a.id::text
     union all select f from wow_storage_company.folders(a.id) f where f<>a.folder
   ) old
   join storage.objects o on o.bucket_id='mark-robot-private'
     and o.name collate "C">=old.root||'/' and o.name collate "C"<old.root||'0'
   where wow_storage_company.owner(o.name)=a.id
 ), batch as (
   select c.*,d.name is not null as ready from candidates c
   left join storage.objects d on d.bucket_id='mark-robot-private' and d.name=c.destination
   join wow_storage_company.folder_history h on h.folder=split_part(c.destination,'/',1)||'/'||split_part(c.destination,'/',2)
   where d.name is null or (c.source is not null and greatest(d.created_at,h.activated_at) < now()-interval '6 minutes')
   order by (d.name is not null),c.id,c.source nulls first limit 5
 )
 select jsonb_build_object('jobs',coalesce(jsonb_agg(jsonb_build_object(
   'workspaceId',id,'source',source,'destination',destination,'readyToRetire',ready)), '[]'::jsonb)) from batch
$$;
revoke all on function public.wow_company_storage_jobs() from public,anon,authenticated;
grant execute on function public.wow_company_storage_jobs() to service_role;
revoke all on all functions in schema wow_storage_company from public,anon,authenticated;
commit;
