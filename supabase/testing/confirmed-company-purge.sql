-- Integration smoke test. Every fixture, including the temporary founder, is rolled back.
-- Run as one transaction in an administrative test connection after all modules are installed.
begin;
do $test$
declare
 founder uuid=gen_random_uuid(); sid uuid=gen_random_uuid(); aid uuid=gen_random_uuid();
 wid uuid; req jsonb; preview jsonb; res jsonb; denied boolean=false;
begin
 insert into auth.users(id,email) values(founder,founder::text||'@wow.invalid');
 insert into auth.sessions(id,user_id) values(sid,founder);
 insert into public.wow_platform_owners(user_id) values(founder);
 insert into public.wow_workspaces(name) values ('purge-rollback-fixture') returning id into wid;
 preview=public.wow_platform_service(founder,sid,'company.deletePreview',jsonb_build_object('workspaceId',wid));
 if preview->>'hasLinkedData' is distinct from 'false' or preview->>'allowed' is distinct from 'true' then raise exception 'empty preview failed';end if;
 req=jsonb_build_object('workspaceId',wid,'confirmed',true,'confirmName','purge-rollback-fixture','expectedRevision',preview->'revision','confirmWord1','حذف');
 res=public.wow_platform_service(founder,sid,'company.deleteEmpty',req);
 if res->>'deleted' is distinct from 'true' then raise exception 'single confirmation failed';end if;
 insert into public.wow_workspaces(name) values ('purge-owner-fixture') returning id into wid;
 insert into auth.users(id,email) values(aid,aid::text||'@wow.invalid');
 insert into public.wow_accounts(id,workspace_id,login_email,username,name,role)
 values(aid,wid,aid::text||'@wow.invalid',aid::text,'Test owner','owner');
 preview=public.wow_platform_service(founder,sid,'company.deletePreview',jsonb_build_object('workspaceId',wid));
 if preview->>'hasLinkedData' is distinct from 'true' or preview->>'allowed' is distinct from 'true' then raise exception 'linked preview failed';end if;
 req=jsonb_build_object('workspaceId',wid,'confirmed',true,'confirmName','purge-owner-fixture','expectedRevision',preview->'revision','confirmWord1','حذف');
 begin perform public.wow_platform_service(founder,sid,'company.deleteEmpty',req);
 exception when raise_exception then if sqlerrm='CONFIRMATION_REQUIRED' then denied=true;else raise;end if; end;
 if not denied then raise exception 'missing second confirmation accepted';end if;
 req=req||jsonb_build_object('confirmWord2','حذف','acceptsLinkedData',true);
 res=public.wow_platform_service(founder,sid,'company.deleteEmpty',req);
 if res->>'deleted' is distinct from 'true' or exists(select from public.wow_accounts where id=aid) or exists(select from auth.users where id=aid)
 or not exists(select from public.wow_platform_company_deletion_log where workspace_id=wid and actor_id=founder) then raise exception 'linked delete verification failed';end if;
 if public.wow_platform_service(founder,sid,'company.deleteEmpty',req)->>'deleted' is distinct from 'true' then raise exception 'retry failed';end if;
 if has_function_privilege('service_role','wow_purge.company(uuid,uuid,text,jsonb)','execute') or has_schema_privilege('anon','wow_purge','usage') then raise exception 'private permissions failed';end if;
end $test$;
rollback;
