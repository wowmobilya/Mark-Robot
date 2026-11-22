begin;
-- Reads or updates only the existing settings/main logo. This is the same record synced by the company app.
create or replace function public.wow_platform_brand(p_user uuid,p_session uuid,p_action text,p_data jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare wid uuid:=(p_data->>'workspaceId')::uuid; current_row public.wow_records; media public.wow_records; upload public.wow_media_uploads;
 value text; item jsonb:=p_data->'record'; payload jsonb; logo_key text; rev bigint; changed bigint; previous_key text;
begin
 perform public.wow_platform_require(p_user,p_session);
 perform public.wow_actor(p_user,p_session,null,false,false);
 if p_action='read' then perform 1 from public.wow_workspaces where id=wid;
 else perform 1 from public.wow_workspaces where id=wid for update;end if;
 if not found then raise exception 'COMPANY_NOT_FOUND';end if;
 select * into current_row from public.wow_records where workspace_id=wid and store='settings' and record_id='"main"'::jsonb;
 rev=coalesce(current_row.revision,0);value=current_row.payload->>'logo';
 if p_action='read' then
   if current_row.deleted_at is not null then return jsonb_build_object('revision',rev);end if;
   if left(value,8)='wfmedia:' then
     select * into media from public.wow_records where workspace_id=wid and store='media' and record_id=to_jsonb(substr(value,9)) and deleted_at is null;
     if media.payload->>'storagePath' ~ ('^'||wid::text||'/[a-f0-9]{64}/[a-f0-9]{64}\.(png|jpg|jpeg|webp|gif|avif)$') and
       media.payload->>'contentType' in ('image/png','image/jpeg','image/webp','image/gif','image/avif') then
       return jsonb_build_object('revision',rev,'storagePath',media.payload->>'storagePath');
     end if;
   elsif length(value)<=1400000 and value ~ '^data:image/(png|jpeg|webp|avif|gif);base64,[A-Za-z0-9+/]+=*$' then return jsonb_build_object('revision',rev,'image',value);
   elsif value in ('assets/wow-furniture-logo.png','./assets/wow-furniture-logo.png','assets/wow-furniture-logo.svg','./assets/wow-furniture-logo.svg') then return jsonb_build_object('revision',rev,'builtin',true);
   end if;
   return jsonb_build_object('revision',rev);
 end if;
 if p_action not in ('stage','commit') then raise exception 'UNKNOWN_ACTION';end if;
 logo_key=item->>'id';
 if logo_key is null or logo_key !~ '^brand-[a-f0-9]{64}$' or item->>'storagePath' is null or item->>'storagePath' !~ ('^'||wid::text||'/[a-f0-9]{64}/[a-f0-9]{64}\.png$')
   or (item->>'size')::bigint not between 1 and 196608 or current_row.deleted_at is not null then raise exception 'INVALID_MEDIA';end if;
 if value='wfmedia:'||logo_key then return jsonb_build_object('revision',rev,'unchanged',true);end if;
 if rev is distinct from (p_data->>'revision')::bigint then raise exception 'CONFLICT';end if;
 if p_action='stage' then
   insert into public.wow_media_uploads(workspace_id,account_id,record_id,storage_path,content_type,size)
     values(wid,p_user,to_jsonb(logo_key),item->>'storagePath','image/png',(item->>'size')::bigint) on conflict(storage_path) do nothing;
   return jsonb_build_object('staged',true);
 end if;
 update public.wow_media_uploads set ready=true,updated_at=now() where workspace_id=wid and record_id=to_jsonb(logo_key)
  and storage_path=item->>'storagePath' and content_type='image/png' and size=(item->>'size')::bigint returning * into upload;
 if not found then raise exception 'INVALID_MEDIA';end if;
 payload=jsonb_build_object('id',logo_key,'kind','image','contentType','image/png','size',upload.size,'storagePath',upload.storage_path,'updatedAt',upload.created_at);
 insert into public.wow_records(workspace_id,store,record_id,payload,revision,updated_by) values(wid,'media',to_jsonb(logo_key),payload,1,p_user)
 on conflict(workspace_id,store,record_id) do update set payload=excluded.payload,deleted_at=null,revision=wow_records.revision+1,updated_at=now(),updated_by=p_user,change_id=nextval('public.wow_change_sequence');
 payload=jsonb_set(coalesce(current_row.payload,'{"id":"main"}'::jsonb),'{logo}',to_jsonb('wfmedia:'||logo_key));
 changed=nextval('public.wow_change_sequence');
 insert into public.wow_records(workspace_id,store,record_id,payload,revision,change_id,updated_by) values(wid,'settings','"main"'::jsonb,payload,rev+1,changed,p_user)
 on conflict(workspace_id,store,record_id) do update set payload=excluded.payload,revision=excluded.revision,change_id=excluded.change_id,updated_by=p_user,updated_at=now();
 if left(value,8)='wfmedia:' and not jsonb_path_exists(payload,'$.** ? (@ == $ref)',jsonb_build_object('ref',value)) then
   previous_key=substr(value,9);delete from public.wow_media_links where workspace_id=wid and store='settings' and record_id='"main"'::jsonb and media_key=previous_key;
 end if;
 insert into public.wow_media_links(workspace_id,media_key,store,record_id) values(wid,logo_key,'settings','"main"'::jsonb) on conflict do nothing;
 update public.wow_workspaces set data_revision=changed where id=wid;
 insert into public.wow_platform_company_audit(actor_id,workspace_id,action) values(p_user,wid,'company.logo');
 return jsonb_build_object('revision',rev+1);
end $$;
revoke all on function public.wow_platform_brand(uuid,uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.wow_platform_brand(uuid,uuid,text,jsonb) to service_role;
commit;
