import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {createBrandActions} from '../supabase/functions/wow-cloud/modules/platform-brand.mjs';
import {createProviderTestDatabase} from '../supabase/testing/provider-fixtures.mjs';

test('founder updates actual tenant identity, preserving private settings, quota staging, revision and isolation',async t=>{
  const db=await createProviderTestDatabase();t.after(()=>db.close());
  const {migrations}=JSON.parse(await readFile(new URL('../supabase/release.json',import.meta.url),'utf8'));
  for(const migration of migrations.slice(1))await db.exec(await readFile(new URL('../supabase/'+migration,import.meta.url),'utf8'));
  const [home,target,user,session,other,otherSession]=Array.from({length:6},()=>randomUUID());
  await db.query("insert into wow_workspaces(id,name) values($1,'home'),($2,'target')",[home,target]);
  await db.query('insert into auth.users(id) values($1),($2)',[user,other]);
  await db.query('insert into auth.sessions(id,user_id) values($1,$2),($3,$4)',[session,user,otherSession,other]);
  await db.query("insert into wow_accounts(id,workspace_id,login_email,username,name,role) values($1,$2,'test@fixture.invalid','tester','Tester','owner'),($3,$4,'tenant@fixture.invalid','tenant','Tenant','owner')",[user,home,other,target]);
  await db.query('insert into wow_sessions(session_id,account_id,session_version) values($1,$2,1),($3,$4,1)',[session,user,otherSession,other]);
  await db.query('insert into wow_platform_owners(user_id) values($1)',[user]);
  await db.query("insert into wow_records(workspace_id,store,record_id,payload,revision,updated_by) values($1,'settings',$2,$3,1,$4)",[target,'"main"',JSON.stringify({id:'main',phone:'private fixture',logo:'https://untrusted.invalid/track'}),other]);
  const objects=new Map(),api=createBrandActions({brandRpc:async(actor,action,data)=>(await db.query('select wow_platform_brand($1,$2,$3,$4) r',[actor.userId,actor.sessionId,action,JSON.stringify(data)])).rows[0].r,storage:{
    async put(path,bytes){objects.set(path,bytes);},async sign(path,ttl){assert(objects.has(path));assert.equal(ttl,120);return 'signed-fixture';}
  }});
  const run=(name,body,actor={userId:user,sessionId:session})=>api['platform.company.'+name]({actor,body:{workspaceId:target,...body}});
  const png='iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR42mP8/x8AAwMCAO+j7uQAAAAASUVORK5CYII=';
  assert.deepEqual(await run('brand',{}),{revision:1});
  await assert.rejects(run('setBrand',{revision:1,png},{userId:other,sessionId:otherSession}),/ACCESS_DENIED/);
  await assert.rejects(run('setBrand',{revision:0,png}),/CONFLICT/);
  assert.equal(objects.size,0);
  const plan=randomUUID();
  await db.query("insert into wow_limits.plans(id,name,storage_bytes,updated_by) values($1,'Quota',1,$2)",[plan,user]);
  await db.query('insert into wow_limits.subscriptions(workspace_id,plan_id) values($1,$2)',[target,plan]);
  await assert.rejects(run('setBrand',{revision:1,png}),/LIMIT/);
  assert.equal(objects.size,0);
  await db.query('update wow_limits.plans set storage_bytes=100000 where id=$1',[plan]);
  assert.deepEqual(await run('setBrand',{revision:1,png}),{revision:2});
  assert.equal(objects.size,1);assert([...objects.keys()][0].startsWith(target+'/'));
  assert.deepEqual(await run('brand',{}),{revision:2,url:'signed-fixture'});
  assert.deepEqual(await run('setBrand',{revision:1,png}),{revision:2,unchanged:true});
  const {payload,change_id}= (await db.query("select payload,change_id from wow_records where workspace_id=$1 and store='settings'",[target])).rows[0];
  await db.query("update wow_records set payload=jsonb_set(payload,'{storagePath}',to_jsonb($1::text)) where workspace_id=$2 and store='media'",[[...objects.keys()][0].replace(target,home),target]);
  assert.deepEqual(await run('brand',{}),{revision:2});
  assert.equal(payload.phone,'private fixture');assert.match(payload.logo,/^wfmedia:brand-/);
  assert.equal((await db.query('select data_revision from wow_workspaces where id=$1',[target])).rows[0].data_revision,change_id);
  assert.equal((await db.query('select count(*)::integer as n from wow_media_links where workspace_id=$1',[target])).rows[0].n,1);
  assert.equal((await db.query("select has_function_privilege('anon','public.wow_platform_brand(uuid,uuid,text,jsonb)','execute') as allowed")).rows[0].allowed,false);
});
