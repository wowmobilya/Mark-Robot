import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {formatPushPayload} from '../supabase/functions/wow-cloud/push-events.mjs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),pushDevice=require('../modules/platform/push/wow-push-device.js');
import {communicationsFixture} from './fixtures/communications.mjs';
import {createSupportActions} from '../supabase/functions/wow-cloud/modules/platform-support.mjs';

test('member complaints reach only their author and verified platform founders, with protected photos, quota, replay and read receipts',async t=>{
 const f=await communicationsFixture();t.after(()=>f.db.close());
 for(const name of ['platform-companies','tenant-limits','statement-delivery','tenant-seats','platform-support','platform-support','voice-calls','voice-call-push','platform-support-push','platform-support-push']){
   await f.db.exec(await readFile(new URL('../supabase/modules/'+name+'.sql',import.meta.url),'utf8'));
 }
 await f.db.query('insert into wow_platform_owners(user_id) values($1)',[f.foreign.userId]);
 for(const [account,wid] of [[f.customer,f.workspace],[f.foreign,f.foreignWorkspace],[f.owner,f.workspace]]){
  const device=randomUUID();
  await f.db.query("insert into wow_push_subscriptions(workspace_id,account_id,session_id,session_version,device_id,endpoint,endpoint_hash,p256dh,auth_key) values($1,$2,$3,1,$4,$4,encode(sha256(convert_to($4,'UTF8')),'hex'),repeat('A',87),repeat('B',22))",[wid,account.userId,account.sessionId,device]);
 }
 async function deliveries(kind){
  return (await f.db.query("select e.id,e.recipient_id,e.workspace_id,e.details,wow_notify.payload(e.kind,e.record_id->>'id',e.workspace_id,e.recipient_id) notice from wow_push_events e join wow_push_jobs j on j.event_id=e.id where e.kind=$1",[kind])).rows;
 }
 const actions=createSupportActions({supportRpc:async(actor,action,data)=>(await f.db.query('select wow_support_service($1,$2,$3,$4) v',[actor.userId,actor.sessionId,action,JSON.stringify(data)])).rows[0].v});
 const call=async(action,body={},actor=f.customer)=>actions[action]({actor,body});
 const jpeg=await readFile(new URL('../docs/qa/release209-worker-mobile.jpg',import.meta.url));
 const photo={mime:'image/jpeg',base64:jpeg.toString('base64')};
 const req={requestId:randomUUID(),text:'First issue',photo,workspaceId:f.foreignWorkspace,fromFounder:true};
 const created=await call('support.create',req);
 assert.deepEqual(await call('support.create',req),created);
 await assert.rejects(call('support.create',{...req,text:'Different'}),/IDEMPOTENCY_MISMATCH/);
 const {caseId}=created,ref={caseId};
 const [incoming]=await deliveries('support.ticket');
 assert.equal((await deliveries('support.ticket')).length,1);
 assert.equal(incoming.recipient_id,f.foreign.userId);assert.equal(incoming.workspace_id,f.foreignWorkspace);
 assert.deepEqual(incoming.details,{});assert.deepEqual(incoming.notice,{route:'founder-support'});
 for(const language of ['ar','en','tr','fr','ru']){
  const payload=formatPushPayload({id:incoming.id,kind:'support.ticket',details:{...incoming.notice,text:'private',photo:'private'}},
   {companyName:'PRIVATE COMPANY',language});
  assert.equal(payload.route,'founder-support');assert.deepEqual(payload.params,{});
  assert.equal(pushDevice.create(null).target(payload).route,'founder-support');
  assert(!JSON.stringify(payload).includes('private'));assert(!payload.title.includes('PRIVATE'));
 }
 await f.db.query('update wow_platform_owners set active=false where user_id=$1',[f.foreign.userId]);
 assert.equal((await deliveries('support.ticket'))[0].notice,null);
 await f.db.query('update wow_platform_owners set active=true where user_id=$1',[f.foreign.userId]);
 for(const actor of [f.staff,f.owner,f.foreign]){
   assert.equal((await call('support.list',{},actor)).cases.length,0);
   await assert.rejects(call('support.open',ref,actor),/ACCESS_DENIED/);
   await assert.rejects(call('support.reply',{...ref,text:'No',requestId:randomUUID()},actor),/ACCESS_DENIED/);
 }
 await assert.rejects(call('platform.support.list',{},f.owner),/ACCESS_DENIED/);
 const founderList=await call('platform.support.list',{},f.foreign);
 assert.equal(founderList.unreadCases,1);assert.equal(founderList.cases[0].hasPhoto,true);assert.equal(founderList.cases[0].photo,undefined);
 const opened=await call('platform.support.open',ref,f.foreign);
 assert.equal(opened.messages.length,1);assert.equal(opened.messages[0].fromFounder,false);assert.equal(opened.case.unread,false);
 assert.equal((await deliveries('support.ticket'))[0].notice,null);
 const stored=Buffer.from(opened.case.photo.base64,'base64');
 assert.ok(stored.length<=jpeg.length);
 assert.equal((await f.db.query('select wow_limits.storage_used($1) used',[f.workspace])).rows[0].used,stored.length);
 assert.equal((await call('platform.support.list',{},f.foreign)).unreadCases,0);
 const reply={...ref,requestId:randomUUID(),text:'We have reviewed your photo'};
 await call('platform.support.reply',reply,f.foreign);await call('platform.support.reply',reply,f.foreign);
 assert.equal((await call('support.list')).unreadCases,1);
 const replies=await deliveries('support.reply');assert.equal(replies.length,1);
 assert.equal(replies[0].recipient_id,f.customer.userId);assert.equal(replies[0].workspace_id,f.workspace);
 assert.deepEqual(replies[0].notice,{route:'member-support'});
 assert.equal(pushDevice.create(null).target(formatPushPayload({id:replies[0].id,kind:'support.reply',details:replies[0].notice},{language:'en'})).route,'member-support');
 const member=await call('support.open',ref);
 assert.equal((await deliveries('support.reply'))[0].notice,null);
 assert.deepEqual(member.messages.map(m=>m.text),['First issue',reply.text]);assert.equal(member.messages[1].fromFounder,true);
 assert.equal((await call('support.list')).unreadCases,0);
 await call('support.reply',{...ref,requestId:randomUUID(),text:'Thank you'});
 assert.equal((await call('platform.support.list',{},f.foreign)).unreadCases,1);
 for(const bad of [{mime:'image/svg+xml',base64:photo.base64},{...photo,base64:'/+D/2Q=='},{...photo,base64:'A'.repeat(262148)}])
  await assert.rejects(call('support.create',{...req,requestId:randomUUID(),photo:bad}),/INVALID_PHOTO/);
 const plan=randomUUID();
 await f.db.query("insert into wow_limits.plans(id,name,storage_bytes,updated_by) values($1,'Fixture',0,$2)",[plan,f.foreign.userId]);
 await f.db.query('insert into wow_limits.subscriptions(workspace_id,plan_id) values($1,$2)',[f.workspace,plan]);
 await assert.rejects(call('support.create',{...req,requestId:randomUUID()}),/STORAGE_LIMIT_REACHED/);
 await call('support.create',{text:'No photo',requestId:randomUUID()});
 assert.equal((await f.db.query("select has_function_privilege('authenticated','public.wow_support_service(uuid,uuid,text,jsonb)','execute') ok")).rows[0].ok,false);
 await f.db.query('update wow_sessions set closed_at=now() where session_id=$1',[f.customer.sessionId]);
 await assert.rejects(call('support.open',ref),/SESSION_REVOKED/);
});
