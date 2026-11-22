import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {createProviderTestDatabase} from '../supabase/testing/provider-fixtures.mjs';

test('only the platform founder can assign reusable plans, and tenant admission counts durable enrollments and reserved bytes',async t=>{
 const db=await createProviderTestDatabase();t.after(()=>db.close());
 for(const name of ['files','chat','gallery','platform-companies','tenant-limits','tenant-limits']){
   await db.exec(await readFile(new URL('../supabase/modules/'+name+'.sql',import.meta.url),'utf8'));
 }
 const founder=randomUUID(),founderSession=randomUUID(),other=randomUUID(),otherSession=randomUUID();
 const workspaceId=randomUUID(),separate=randomUUID(),planId=randomUUID();
 for(const [uid,sid,wid] of [[founder,founderSession,workspaceId],[other,otherSession,separate]]){
   await db.query('insert into auth.users(id) values($1)',[uid]);
   await db.query('insert into auth.sessions(id,user_id) values($1,$2)',[sid,uid]);
   await db.query('insert into wow_workspaces(id,name) values($1,$2)',[wid,wid]);
   await db.query("insert into wow_accounts(id,workspace_id,login_email,username,name,role) values($1,$2,$3,$4,$4,'owner')",[uid,wid,uid+'@fixture.invalid',uid]);
   await db.query('insert into wow_sessions(session_id,account_id,session_version) values($1,$2,1)',[sid,uid]);
 }
 await db.query('insert into wow_platform_owners(user_id) values($1)',[founder]);
 const rpc=async(action,data,uid=founder,sid=founderSession)=>(await db.query('select wow_platform_limits($1,$2,$3,$4) result',[uid,sid,action,JSON.stringify(data)])).rows[0].result;
 const get=wid=>rpc('platform.limits.get',{workspaceId:wid});
 const save=(data)=>rpc('platform.plans.save',{id:planId,name:'Fixture',deviceLimit:1,storageBytes:50,version:0,...data});
 const assign=(data)=>rpc('platform.limits.set',{workspaceId,planId,expiresAt:null,version:0,...data});
 const media=(wid,uid,key,bytes)=>db.query("insert into wow_media_uploads(workspace_id,account_id,record_id,storage_path,content_type,size) values($1,$2,'1',$3,'image/png',$4) on conflict do nothing",[wid,uid,key,bytes]);
 const push=id=>db.query("insert into wow_push_subscriptions(workspace_id,account_id,session_id,session_version,device_id,endpoint,endpoint_hash,p256dh,auth_key) values($1,$2,$3,1,$4,$4,encode(sha256(convert_to($4,'UTF8')),'hex'),repeat('A',87),repeat('B',22))",[workspaceId,founder,founderSession,id]);
 assert.deepEqual(await rpc('platform.plans.list',{}),{plans:[]});
 assert.equal((await get(workspaceId)).plan,null);
 await assert.rejects(rpc('platform.plans.list',{},other,otherSession),/ACCESS_DENIED/);
 await assert.rejects(rpc('platform.plans.list',{},founder,otherSession),/ACCESS_DENIED/);
 assert.equal((await db.query("select has_function_privilege('authenticated','public.wow_platform_limits(uuid,uuid,text,jsonb)','execute') allowed")).rows[0].allowed,false);
 const created=await save({});assert.equal(created.plan.version,1);assert.deepEqual(await save({}),created);
 await assert.rejects(save({name:'Changed'}),/CONFLICT/);
 await assert.rejects(save({id:randomUUID()}),/PLAN_NAME_EXISTS/);
 await assert.rejects(save({deviceLimit:-1}),/INVALID_LIMITS/);
 assert.equal((await assign({})).version,1);assert.equal((await assign({})).version,1);
 assert.equal((await get(separate)).planId,null);
 assert.equal((await get(workspaceId)).usedDevices,0);
 await push('first-device');await assert.rejects(push('another-device'),/DEVICE_LIMIT_REACHED/);
 await db.query('update wow_push_subscriptions set active=false where workspace_id=$1',[workspaceId]);
 await push('another-device');
 await media(workspaceId,founder,'first',38);await media(workspaceId,founder,'first',38);
 const galleryId=randomUUID();
 await db.query("insert into wow_gallery_assets(id,workspace_id,account_id,purpose,content_type,digest,size_bytes,path) values($1,$2,$3,'presentation','png',repeat('a',64),12,$4)",[galleryId,workspaceId,founder,'object-'+galleryId]);
 await assert.rejects(media(workspaceId,founder,'exceeds',1),/STORAGE_LIMIT_REACHED/);
 await db.query("update wow_gallery_assets set lifecycle='trash' where id=$1",[galleryId]);
 assert.equal((await get(workspaceId)).usedBytes,50);
 await db.query("update wow_gallery_assets set lifecycle='removed' where id=$1",[galleryId]);
 assert.equal((await get(workspaceId)).usedBytes,38);
 const file=(bytes)=>db.query("insert into wow_collab.files(workspace_id,owner_id,request_id,original_spec,name,kind,mime,bytes,original_bytes,digest) values($1,$2,$3,'{}','file','image','image/png',$4,$4,repeat('a',64))",[workspaceId,founder,randomUUID(),bytes]);
 await file(12);await assert.rejects(file(1),/STORAGE_LIMIT_REACHED/);
 await assert.rejects(db.query("insert into wow_collab.chat_assets(workspace_id,owner_id,request_id,purpose,name,kind,mime,bytes,digest) values($1,$2,$3,'profile','file','image','image/png',1,repeat('a',64))",[workspaceId,founder,randomUUID()]),/STORAGE_LIMIT_REACHED/);
 await media(separate,other,'other-tenant',100);
 assert.equal((await get(workspaceId)).usedBytes,50);
 const shrinking=await save({version:1,storageBytes:10});
 assert.equal(shrinking.plan.version,2);assert.equal((await get(workspaceId)).usedBytes,50);
 await assert.rejects(assign({expiresAt:'2020-01-01T00:00:00Z'}),/CONFLICT/);
 const expired=await assign({version:1,expiresAt:'2020-01-01T00:00:00Z'});assert.equal(expired.expired,true);
 await assert.rejects(file(1),/SUBSCRIPTION_EXPIRED/);
 await assert.rejects(push('late-device'),/SUBSCRIPTION_EXPIRED/);
 assert.equal((await get(workspaceId)).usedDevices,1);
 assert.equal((await assign({version:2,planId:null})).planId,null);
 await file(1);
});
