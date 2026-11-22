import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID,createHmac} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {createProviderTestDatabase} from '../supabase/testing/provider-fixtures.mjs';
import {createChatActions} from '../supabase/functions/wow-cloud/modules/chat.mjs';

const read=p=>readFile(new URL(p,import.meta.url),'utf8');
async function fixture(){
 const db=await createProviderTestDatabase();
 // Supabase Realtime owns these in production; minimal PGlite auth fixture.
 // The shared local provider fixture models Supabase Realtime metadata.
 await db.exec(await read('../supabase/modules/files.sql'));
 await db.exec(await read('../supabase/modules/chat.sql'));
 await db.exec(await read('../supabase/modules/voice-calls.sql'));
 await db.exec(await read('../supabase/modules/voice-calls.sql'));
 const workspace=randomUUID(),otherWorkspace=randomUUID(),people={};
 await db.query("insert into public.wow_workspaces(id,name) values($1,'WOW'),($2,'OTHER')",[workspace,otherWorkspace]);
 for(const [username,role,wid] of [['owner','owner',workspace],['customer','customer',workspace],
 ['worker','sales',workspace],['third','sales',workspace],['outside','owner',otherWorkspace]]){
  const id=randomUUID(),sid=randomUUID(),email=username+'@example.com',permissions=role==='owner'?[]:['chat.view','chat.edit'];
  people[username]={id,sid};
  await db.query('insert into auth.users(id,email,email_confirmed_at) values($1,$2,now())',[id,email]);
  await db.query('insert into auth.sessions(id,user_id) values($1,$2)',[sid,id]);
  await db.query('insert into public.wow_accounts(id,workspace_id,login_email,username,name,role,permissions) values($1,$2,$3,$4,$4,$5,$6)',
    [id,wid,email,username,role,permissions]);
  await db.query('insert into public.wow_sessions(session_id,account_id,session_version) values($1,$2,1)',[sid,id]);
 }
 const direct=(await db.query('select wow_collab.direct_room($1,$2,$3) id',
  [workspace,people.owner.id,people.customer.id])).rows[0].id;
 const group=randomUUID();
 await db.query("insert into wow_collab.rooms(id,workspace_id,kind,title,creator) values($1,$2,'group','Team',$3)",
  [group,workspace,people.owner.id]);
 for(const name of ['owner','worker','third']){
  await db.query('insert into wow_collab.members(room_id,account_id,role) values($1,$2,$3)',
    [group,people[name].id,name==='owner'?'owner':'member']);
 }
 const request=async(who,action,data={})=>(await db.query(
  'select public.wow_voice_service($1,$2::jsonb) result',
  [action,JSON.stringify({...data,userId:people[who].id,sessionId:people[who].sid})])).rows[0].result;
 return {db,workspace,people,direct,group,request};
}

test('Direct video call: answer, timer, end and history; original messages untouched',async t=>{
 const x=await fixture();t.after(()=>x.db.close());
 const {request,direct,people,db}=x;
 assert.equal((await request('owner','inbox')).calls.length,0);
 const call=await request('owner','start',{roomId:direct,kind:'video'});
 assert.equal(call.status,'ringing');assert.equal(call.kind,'video');assert.equal(call.participants.length,2);
 await assert.rejects(request('worker','status',{callId:call.id}),/ACCESS_DENIED/);
 await assert.rejects(request('owner','start',{roomId:direct,kind:'audio'}),/VOICE_BUSY/);
 const inbox=await request('customer','inbox');
 assert.equal(inbox.calls[0].callerId,people.owner.id);
 await assert.rejects(request('owner','accept',{callId:call.id}),/VOICE_CALL_UNAVAILABLE/);
 assert.equal((await request('customer','accept',{callId:call.id})).status,'active');
 assert.equal((await request('owner','connected',{callId:call.id})).status,'active');
 assert.equal((await request('owner','heartbeat',{callId:call.id})).status,'active');
 assert.equal((await request('owner','end',{callId:call.id})).status,'completed');
 const history=(await request('customer','history',{roomId:direct})).history;
 assert.equal(history.length,1);assert.equal(history[0].status,'completed');assert.equal(history[0].kind,'video');
 assert(history[0].durationSeconds>=0);
 const declined=await request('owner','start',{roomId:direct,kind:'audio'});
 await request('customer','decline',{callId:declined.id});
 assert.equal((await request('owner','status',{callId:declined.id})).status,'declined');
 const missed=await request('owner','start',{roomId:direct,kind:'audio'});
 await request('owner','end',{callId:missed.id});
 assert.equal((await request('owner','status',{callId:missed.id})).status,'missed');
 assert.equal((await db.query('select count(*)::int n from wow_collab.messages')).rows[0].n,0);
 assert.equal((await db.query('select count(*)::int n from wow_voice.calls')).rows[0].n,3);
});

test('Group calls only invite eligible members (3-person mesh)',async t=>{
 const x=await fixture();t.after(()=>x.db.close());
 const {request,group,db}=x;
 await assert.rejects(request('customer','start',{roomId:group,kind:'audio'}),/ACCESS_DENIED/);
 const call=await request('worker','start',{roomId:group,kind:'audio'});
 assert.equal(call.participants.length,3);
 await assert.rejects(request('outside','status',{callId:call.id}),/ACCESS_DENIED/);
 assert.equal((await request('owner','accept',{callId:call.id})).status,'active');
 assert.equal((await request('third','decline',{callId:call.id})).status,'active');
 assert.equal((await request('worker','connected',{callId:call.id})).status,'active');
 assert.equal((await request('owner','leave',{callId:call.id})).status,'completed');
 assert.equal((await db.query('select count(*)::int n from wow_collab.messages')).rows[0].n,0);
});

test('Session revocation and realtime topic RLS block unauthorized listening',async t=>{
 const x=await fixture();t.after(()=>x.db.close());
 const {request,direct,group,people,db}=x;
 await assert.rejects(request('owner','start',{roomId:randomUUID(),kind:'audio'}),/ACCESS_DENIED/);
 await assert.rejects(request('owner','start',{roomId:direct,kind:'screen'}),/INVALID_VOICE_REQUEST/);
 const call=await request('owner','start',{roomId:direct,kind:'audio'});
 await request('customer','accept',{callId:call.id});
 await db.query("select set_config('request.jwt.claims',$1,false)",
 [JSON.stringify({sub:people.customer.id,session_id:people.customer.sid,role:'authenticated'})]);
 await db.query("select set_config('realtime.topic',$1,false)",['wow-call-room:'+direct]);
 assert.equal((await db.query('select private_voice.allowed() allowed')).rows[0].allowed,true);
 await db.query("select set_config('realtime.topic',$1,false)",['wow-call:'+call.id]);
 assert.equal((await db.query('select private_voice.allowed() allowed')).rows[0].allowed,true);
 await db.query("select set_config('realtime.topic',$1,false)",['wow-call-room:'+group]);
 assert.equal((await db.query('select private_voice.allowed() allowed')).rows[0].allowed,false);
 await db.query("select set_config('realtime.topic',$1,false)",['public:unrelated']);
 assert.equal((await db.query('select private_voice.allowed() allowed')).rows[0].allowed,false);
 await db.query("select set_config('realtime.topic',$1,false)",['wow-call:'+call.id]);
 await db.query("update public.wow_sessions set last_active_at=now()-interval '31 minutes' where session_id=$1",[people.customer.sid]);
 assert.equal((await db.query('select private_voice.allowed() allowed')).rows[0].allowed,false);
 await db.query("update public.wow_sessions set closed_at=now() where session_id=$1",[people.customer.sid]);
 await db.query("select set_config('realtime.topic',$1,false)",['wow-call:'+call.id]);
 assert.equal((await db.query('select private_voice.allowed() allowed')).rows[0].allowed,false);
 await assert.rejects(request('customer','status',{callId:call.id}),/SESSION_REVOKED/);
});

test('TURN credentials are short-lived and never reveal the shared secret',async()=>{
 const user=randomUUID(),sid=randomUUID(),callId=randomUUID(),roomId=randomUUID(),events=[];
 const secret='TEST-THIS-IS-A-LONG-RANDOM-SECRET-ROTATE-IN-PRODUCTION';
 const actor={userId:user,sessionId:sid};
 const moduleRpc=async(name,action,data)=>{
  events.push({name,action,data});assert.equal(name,'wow_voice_service');
  if(action==='status')return {status:'active',participants:[{id:user,status:'joined'}]};
  return {ok:true};
 };
 const calls=createChatActions({moduleRpc,storage:{},
  voiceTurn:{urls:'turn:turn.example.invalid:3478?transport=udp,turns:turn.example.invalid:5349?transport=tcp',secret}});
 await calls['chat.call.start']({actor,body:{roomId,kind:'video'}});
 assert.deepEqual(events[0].data,{roomId,kind:'video',userId:user,sessionId:sid});
 const ice=await calls['chat.call.ice']({actor,body:{callId}});
 assert.equal(ice.relayReady,true);assert.equal(ice.iceServers.length,2);assert.equal(ice.iceServers[1].urls.length,2);
 assert.equal(ice.iceServers[1].credential,createHmac('sha1',secret).update(ice.iceServers[1].username).digest('base64'));
 const fallback=await createChatActions({moduleRpc,storage:{},voiceTurn:{}})['chat.call.ice']({actor,body:{callId}});
 assert.equal(fallback.relayReady,false);
});

test('WOW familiar chat UI, in-chat events, customer signup and release source preserved',async()=>{
 const [signup,html,sw,workspace,ui,manager,channel,manifest]=await Promise.all([
 read('../modules/customer-auth/workspace.js'),read('../index.html'),read('../sw.js'),
 read('../modules/chat/workspace.js'),read('../modules/chat/call-ui.js'),
 read('../modules/chat/call-manager.js'),read('../modules/chat/realtime-channel.js'),
 read('../supabase/release.json')]);
 assert.match(signup,/actions\.append\(button\('register'/);
 assert.match(signup,/if\(!options\.registrationEnabled\)/);
 assert.match(html,/modules\/chat\/call-ui\.js\?v=7/);
 assert.match(html,/modules\/chat\/realtime-channel\.js\?v=1/);
 assert.match(html,/data-release="228"/);assert.match(sw,/wow-furniture-v228-cloud/);
 assert.match(workspace,/callUI\.controls\(room\)/);
 assert.match(workspace,/callUI\?\.renderHistoryInFeed\?\.\(\)/);
 assert.match(workspace,/wf-chat-bubble/);assert.match(ui,/wf-chat-call-chip/);
 assert.match(manager,/WFCallManager/);assert.match(channel,/config:\{private:true/);
 assert.equal(JSON.parse(manifest).version,228);
});
