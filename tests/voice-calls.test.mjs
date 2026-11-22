import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID,createHmac} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {createProviderTestDatabase} from '../supabase/testing/provider-fixtures.mjs';
import {createChatActions} from '../supabase/functions/wow-cloud/modules/chat.mjs';

const read=path=>readFile(new URL(path,import.meta.url),'utf8');
const account=(id,sid)=>({userId:id,sessionId:sid});
async function live(){
 const db=await createProviderTestDatabase();
 await db.exec(await read('../supabase/modules/files.sql'));
 await db.exec(await read('../supabase/modules/chat.sql'));
 await db.exec(await read('../supabase/modules/voice-calls.sql'));
 const workspace=randomUUID(),owner=randomUUID(),buyer=randomUUID(),outsider=randomUUID();
 const ownerSid=randomUUID(),buyerSid=randomUUID(),outsiderSid=randomUUID();
 await db.query('insert into public.wow_workspaces(id,name) values($1,$2)',[workspace,'WOW']);
 for(const [id,sid,email,username,role,permissions] of [
  [owner,ownerSid,'owner@example.com','owner','owner',null],
  [buyer,buyerSid,'buyer@example.com','buyer','customer',['chat.view','chat.edit']],
  [outsider,outsiderSid,'other@example.com','other','customer',['chat.view','chat.edit']]
 ]){
  await db.query('insert into auth.users(id,email,email_confirmed_at) values($1,$2,now())',[id,email]);
  await db.query('insert into auth.sessions(id,user_id) values($1,$2)',[sid,id]);
  await db.query('insert into public.wow_accounts(id,workspace_id,login_email,username,name,role,permissions) values($1,$2,$3,$4,$5,$6,$7)',
   [id,workspace,email,username,username,role,permissions||[]]);
  await db.query('insert into public.wow_sessions(session_id,account_id,session_version) values($1,$2,1)',[sid,id]);
 }
 const room=(await db.query('select wow_collab.direct_room($1,$2,$3) id',[workspace,owner,buyer])).rows[0].id;
 const request=async(actor,action,data={})=>(await db.query('select public.wow_voice_service($1,$2::jsonb) value',
  [action,JSON.stringify({...data,...actor})])).rows[0].value;
 return {db,workspace,owner,buyer,outsider,room,request,ownerActor:account(owner,ownerSid),
  buyerActor:account(buyer,buyerSid),outsiderActor:account(outsider,outsiderSid)};
}

test('private voice signaling keeps customer/staff membership and ephemeral SDP inside WOW',async t=>{
 const app=await live();t.after(()=>app.db.close());
 const {request,room,owner,buyer,ownerActor,buyerActor,outsiderActor}=app;
 await assert.rejects(request(outsiderActor,'start',{roomId:room,targetId:owner}),/ACCESS_DENIED/);
 const start=await request(ownerActor,'start',{roomId:room,targetId:buyer});
 assert.equal(start.status,'ringing');assert.equal(start.direction,'outgoing');
 await assert.rejects(request(ownerActor,'start',{roomId:room,targetId:buyer}),/VOICE_BUSY/);
 const inbox=await request(buyerActor,'inbox');assert.equal(inbox.calls.length,1);
 assert.equal(inbox.calls[0].direction,'incoming');assert.equal(inbox.calls[0].peerId,owner);
 await assert.rejects(request(outsiderActor,'events',{callId:start.id,after:'0'}),/ACCESS_DENIED/);
 await assert.rejects(request(ownerActor,'accept',{callId:start.id}),/VOICE_CALL_UNAVAILABLE/);
 assert.equal((await request(buyerActor,'accept',{callId:start.id})).status,'active');
 await request(ownerActor,'signal',{callId:start.id,kind:'offer',payload:{type:'offer',sdp:'v=0\r\ns=WOW'}})
 await request(buyerActor,'signal',{callId:start.id,kind:'answer',payload:{type:'answer',sdp:'v=0\r\ns=WOW'}})
 await request(buyerActor,'signal',{callId:start.id,kind:'ice',payload:{candidate:'candidate:123',sdpMid:'0',sdpMLineIndex:0}})
 const received=await request(ownerActor,'events',{callId:start.id,after:'0'});
 assert.deepEqual(received.signals.map(signal=>signal.kind),['answer','ice']);
 const direct=await request(buyerActor,'events',{callId:start.id,after:'0'});
 assert.deepEqual(direct.signals.map(signal=>signal.kind),['offer']);
 assert.equal((await request(ownerActor,'end',{callId:start.id})).status,'ended');
 assert.equal((await app.db.query('select count(*)::int as n from wow_voice.signals')).rows[0].n,0);
 assert.equal((await request(buyerActor,'inbox')).calls.length,0);
});

test('voice signaling requires authenticated active memberships and limits SDP mutations',async t=>{
 const app=await live();t.after(()=>app.db.close());
 const {request,room,owner,buyer,ownerActor,buyerActor}=app;
 await assert.rejects(request({...ownerActor,sessionId:randomUUID()},'inbox'),/SESSION_REVOKED|AUTH_REQUIRED/);
 const start=await request(ownerActor,'start',{roomId:room,targetId:buyer});
 await assert.rejects(request(ownerActor,'signal',{callId:start.id,kind:'offer',payload:{type:'offer',sdp:'bad'}}),/INVALID_VOICE_SIGNAL/);
 await request(buyerActor,'accept',{callId:start.id});
 await assert.rejects(request(buyerActor,'signal',{callId:start.id,kind:'offer',payload:{type:'offer',sdp:'bad'}}),/INVALID_VOICE_SIGNAL/);
 await assert.rejects(request(ownerActor,'signal',{callId:start.id,kind:'offer',payload:{type:'offer',sdp:'x'.repeat(25000)}}),/INVALID_VOICE_SIGNAL/);
 await request(ownerActor,'signal',{callId:start.id,kind:'offer',payload:{type:'offer',sdp:'v=0'}});
 await assert.rejects(request(ownerActor,'signal',{callId:start.id,kind:'offer',payload:{type:'offer',sdp:'v=0'}}),/VOICE_SIGNAL_DUPLICATE/);
 await app.db.query("update public.wow_accounts set status='suspended' where id=$1",[buyer]);
 await assert.rejects(request(ownerActor,'events',{callId:start.id,after:'0'}),/ACCESS_DENIED/);
});

test('Edge module validates payloads and issues short-lived TURN credentials only to callers',async()=>{
 const calls=[],workspace=randomUUID(),owner=randomUUID(),sid=randomUUID(),turnSecret='test-secret-that-is-longer-than-thirty-two-characters';
 const storage={};
 const actions=createChatActions({storage,moduleRpc:async(name,action,payload)=>{
  calls.push({name,action,payload});
  if(name!=='wow_voice_service')throw Error('Wrong backend');
  if(action==='events')return {status:'active',signals:[]};
  return {id:randomUUID(),status:'ringing'};
 },voiceTurn:{url:'turns:turn.example.com:5349?transport=tcp',secret:turnSecret}});
 const actor=account(owner,sid),room=randomUUID(),peer=randomUUID(),id=randomUUID();
 await actions['chat.call.start']({actor,body:{roomId:room,targetId:peer}});
 assert.equal(calls[0].name,'wow_voice_service');
 assert.deepEqual(calls[0].payload,{roomId:room,targetId:peer,userId:owner,sessionId:sid});
 await assert.rejects(actions['chat.call.signal']({actor,body:{callId:id,kind:'offer',payload:{type:'offer',sdp:''}}}),/INVALID_VOICE_SIGNAL/);
 await assert.rejects(actions['chat.call.signal']({actor,body:{callId:id,kind:'ice',payload:{candidate:'a'.repeat(2200)}}}),/INVALID_VOICE_SIGNAL/);
 const ice=await actions['chat.call.ice']({actor,body:{callId:id}});
 assert.equal(ice.relayReady,true);assert.equal(ice.iceServers.length,2);
 assert(ice.iceServers[1].username.includes(owner));
 const expected=createHmac('sha1',turnSecret).update(ice.iceServers[1].username).digest('base64');
 assert.equal(ice.iceServers[1].credential,expected);
 const withoutTurn=createChatActions({storage,moduleRpc:async()=>({status:'active'}),voiceTurn:{}});
 const fallback=await withoutTurn['chat.call.ice']({actor,body:{callId:id}});
 assert.equal(fallback.relayReady,false);assert.equal(fallback.iceServers.length,1);
});

test('customer signup remains visibly discoverable and WebRTC ships as one versioned WOW module',async()=>{
 const [registration,html,sw,client]=await Promise.all([
  read('../modules/customer-auth/workspace.js'),read('../index.html'),read('../sw.js'),read('../modules/chat/workspace.js')
 ]);
 assert.match(registration,/actions\.append\(button\('register'/);
 assert.match(registration,/if\(!options\.registrationEnabled\)/);
 assert.match(registration,/if\(!options\.recoveryEnabled\)/);
 assert.match(html,/modules\/chat\/voice-calls\.js\?v=1/);
 assert.match(html,/modules\/chat\/voice-calls\.css\?v=1/);
 assert.match(html,/data-release="219"/);
 assert.match(sw,/wow-furniture-v219-cloud/);
 assert.match(sw,/modules\/chat\/voice-calls\.js\?v=1/);
 assert.match(client,/voice\.callButton\(room\)/);
});
