import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID,createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {createProviderTestDatabase} from '../supabase/testing/provider-fixtures.mjs';
import {formatPushPayload} from '../supabase/functions/wow-cloud/push-events.mjs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const device=require('../modules/platform/push/wow-push-device.js');
const read=path=>readFile(new URL(path,import.meta.url),'utf8');

async function setup(){
 const db=await createProviderTestDatabase(),manifest=JSON.parse(await read('../supabase/release.json'));
 for(const migration of manifest.migrations.slice(1))await db.exec(await read('../supabase/'+migration));
 const workspace=randomUUID(),owner=randomUUID(),customer=randomUUID(),ownerSid=randomUUID(),customerSid=randomUUID();
 await db.query("insert into public.wow_workspaces(id,name) values($1,'WOW')",[workspace]);
 for(const [id,sid,email,username,role] of [[owner,ownerSid,'test-owner@example.invalid','owner','owner'],
  [customer,customerSid,'test-customer@example.invalid','customer','customer']]){
  await db.query("insert into auth.users(id,email,email_confirmed_at) values($1,$2,now())",[id,email]);
  await db.query("insert into auth.sessions(id,user_id) values($1,$2)",[sid,id]);
  await db.query("insert into public.wow_accounts(id,workspace_id,login_email,username,name,role,permissions) values($1,$2,$3,$4,$4,$5,$6)",
   [id,workspace,email,username,role,role==='owner'?[]:['chat.view','chat.edit']]);
  await db.query("insert into public.wow_sessions(session_id,account_id,session_version) values($1,$2,1)",[sid,id]);
 }
 const room=(await db.query('select wow_collab.direct_room($1,$2,$3) id',[workspace,owner,customer])).rows[0].id;
 return {db,workspace,owner,customer,ownerSid,customerSid,room};
}
const makeCall=async(db,uid,sid,room,kind='audio')=>(await db.query(
 "select public.wow_voice_service('start',$1::jsonb) result",
 [JSON.stringify({userId:uid,sessionId:sid,roomId:room,kind})])).rows[0].result;

test('incoming call queues an opt-in push, not an artificial text message',async t=>{
 const {db,workspace,owner,customer,ownerSid,customerSid,room}=await setup();t.after(()=>db.close());
 const deviceId='wow-test-call-device',subId=randomUUID(),endpoint='https://fcm.googleapis.com/fcm/send/test-fixture';
 const endpointHash=createHash('sha256').update(endpoint).digest('hex');
 await db.query("insert into public.wow_push_subscriptions(id,workspace_id,account_id,session_id,session_version,device_id,endpoint,endpoint_hash,p256dh,auth_key,language) values($1,$2,$3,$4,1,$5,$6,$7,$8,$9,'ar')",
  [subId,workspace,customer,customerSid,deviceId,endpoint,endpointHash,'A'.repeat(87),'B'.repeat(22)]);
 const active=(await db.query('select count(*)::int n from public.wow_push_active_devices where account_id=$1',[customer])).rows[0].n;
 assert.equal(active,1);
 const call=await makeCall(db,owner,ownerSid,room,'video');
 assert.equal(call.status,'ringing');
 const events=(await db.query("select * from public.wow_push_events where kind='call'")).rows;
 assert.equal(events.length,1);assert.equal(events[0].record_store,'voice');assert.equal(events[0].recipient_id,customer);
 const jobs=(await db.query('select * from public.wow_push_jobs where event_id=$1',[events[0].id])).rows;
 assert.equal(jobs.length,1);assert.equal(jobs[0].subscription_id,subId);
 const details=(await db.query("select wow_notify.payload('call',$1,$2,$3) body",
  [call.id,workspace,customer])).rows[0].body;
 // Another invitee can already have answered a group. The pending recipient still gets the invitation.
 await db.query("update wow_voice.calls set status='active' where id=$1",[call.id]);
 const pendingInvite=(await db.query("select wow_notify.payload('call',$1,$2,$3) body",[call.id,workspace,customer])).rows[0].body;
 assert.equal(pendingInvite.callId,call.id);
 await db.query("update wow_voice.calls set status='ringing' where id=$1",[call.id]);
 assert.equal(details.callId,call.id);assert.equal(details.roomId,room);
 assert.equal(details.mediaKind,'video');assert.equal(details.callerName,'owner');
 const payload=formatPushPayload({id:events[0].id,kind:'call',details,createdAt:Date.now()},
  {workspaceId:workspace,userId:customer,deviceId,bindingId:randomUUID(),sessionVersion:1,
   validUntil:details.expiresAt,language:'ar',companyName:'Fixture\nCompany'});
 assert.equal(payload.kind,'call');assert.equal(payload.route,'chat');
 assert.deepEqual(payload.params,{roomId:room,callId:call.id});
 assert.match(payload.title,/فيديو/);
 assert.match(payload.title,/^Fixture Company · /);
 assert.deepEqual(device.create(null).target(payload),{route:'chat',permission:'chat.view',
  params:{roomId:room,callId:call.id}});
 assert.equal((await db.query('select count(*)::int n from wow_collab.messages')).rows[0].n,0);
 await db.query("select public.wow_voice_service('accept',$1::jsonb)",
  [JSON.stringify({callId:call.id,userId:customer,sessionId:customerSid})]);
 const stale=(await db.query("select wow_notify.payload('call',$1,$2,$3) body",
  [call.id,workspace,customer])).rows[0].body;
 assert.equal(stale,null);
});

test('without an opted-in device, the application does not fabricate push delivery',async t=>{
 const {db,owner,ownerSid,room}=await setup();t.after(()=>db.close());
 const call=await makeCall(db,owner,ownerSid,room,'audio');
 assert.equal(call.status,'ringing');
 const count=(await db.query("select count(*)::int n from public.wow_push_events where kind='call'")).rows[0].n;
 assert.equal(count,0);
});

test('notification navigation rejects arbitrary routes and forged call identifiers',()=>{
 const room=randomUUID(),callId=randomUUID();
 const base={kind:'call',route:'chat',params:{roomId:room,callId}};
 assert.equal(device.create(null).target(base).params.callId,callId);
 assert.equal(device.create(null).target({...base,route:'settings'}),null);
 assert.equal(device.create(null).target({...base,params:{roomId:room,callId:'../../settings'}}),null);
 assert.equal(device.create(null).target({...base,params:{roomId:'bogus',callId}}),null);
});


test('a notification resumes its exact authorized invitation; closing the chat preserves ringing on other devices',async()=>{
 const {runInNewContext}=await import('node:vm');
 const roomId=randomUUID(),callId=randomUUID(),me=randomUUID(),callerId=randomUUID();
 const response={id:callId,roomId,callerId,status:'ringing',participants:[{id:me,status:'invited'},{id:callerId,status:'joined'}]};
 const context={WFCallRealtime:{},RTCPeerConnection:class {}};
 runInNewContext(await read('../modules/chat/call-manager.js'),context);
 const requests=[];
 const api={getSession:()=>({userId:me,authenticated:true}),realtimeCredentials:async()=>({}),
  async request(action,data){requests.push([action,data.callId]);return response;}};
 const open=room=>context.WFCallManager.create({api,invitation:{roomId:room,callId}});
 const manager=open(roomId);await manager.poll();assert.equal(manager.getState().call.id,callId);manager.stop();
 assert.deepEqual(requests,[['chat.call.status',callId]]);
 const otherRoom=open(randomUUID());await otherRoom.poll();assert.equal(otherRoom.getState().call,null);otherRoom.stop();
 response.participants[0].status='joined';
 const answeredOnOtherDevice=open(roomId);await answeredOnOtherDevice.poll();assert.equal(answeredOnOtherDevice.getState().call,null);
 answeredOnOtherDevice.stop();assert(requests.every(([action])=>action==='chat.call.status'));
});
