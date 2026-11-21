'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const clientSource=fs.readFileSync(path.join(__dirname,'../modules/platform/cloud/wow-cloud-client.js'),'utf8');
const firstScript=/<script\b([^>]*)>([\s\S]*?)<\/script>/i.exec(html);
const workspace='11111111-1111-4111-8111-111111111111',owner='22222222-2222-4222-8222-222222222222';
const token='single-use-proof_'.repeat(4),other='33333333-3333-4333-8333-333333333333';
const proof={tokenHash:token,workspaceId:workspace,userId:owner};
const fragment=value=>'#wf-owner-activate='+Buffer.from(JSON.stringify(value)).toString('base64url');
const copy=value=>JSON.parse(JSON.stringify(value));
function authResponse(overrides={}){
 const account={id:owner,name:'Owner',username:'owner',role:'owner',status:'active',permissions:['accounts.edit'],sessionVersion:1,expiresAt:null};
 return {ok:true,workspaceId:workspace,identity:{configured:true,revision:1,currentAccount:account,accounts:[account],audit:[]},session:{access_token:'activation-access',refresh_token:'activation-refresh',expires_at:Math.floor(Date.now()/1000)+3600},...overrides};
}
function boot({hash=fragment(proof),query='?wf-cloud=owner&workspace='+workspace,configuredWorkspace=workspace,handler,replaceFails=false,storageMap=new Map()}={}){
 const location=new URL('https://markrobot.example/'+query+hash),events=[],calls=[],writes=[],logs=[];
 const storage={getItem:key=>storageMap.get(key)||null,setItem:(key,value)=>{writes.push([key,value]);storageMap.set(key,value);},removeItem:key=>{events.push(['remove',key]);storageMap.delete(key);}};
 const context={URL,URLSearchParams,atob,AbortController,setTimeout,clearTimeout,Date,console:{log:(...args)=>logs.push(args),warn:(...args)=>logs.push(args),error:(...args)=>logs.push(args)},location,
  history:{replaceState(_state,_title,url){events.push(['scrub',url]);if(replaceFails)throw Error('history unavailable');location.href=new URL(url,location).href;}},
  document:{open(){events.push(['document-open']);},close(){events.push(['document-close']);}},stop(){events.push(['stop']);},
  localStorage:storage,sessionStorage:storage,
  WOW_CLOUD_CONFIG:{enabled:true,workspaceId:configuredWorkspace,endpoint:'https://test.supabase.co/functions/v1/wow-cloud',publishableKey:'fixture-public'},
  fetch:async(url,options)=>{
   const body=JSON.parse(options.body);calls.push({url,body,headers:options.headers});events.push(['request',body.action]);
   if(handler)return handler(body,options);
   return {ok:true,status:200,json:async()=>authResponse()};
  }};
 location.replace=url=>{events.push(['replace',url]);location.href=new URL(url,location).href;};
 context.window=context;vm.createContext(context);
 // Execute the first parser-blocking script, then model the next script's view.
 // Moving the scrub below any existing script exposes the proof here.
 if(firstScript&&!/\bsrc\s*=/i.test(firstScript[1]))vm.runInContext(firstScript[2],context);
 const observedBeforeClient=location.hash;
 vm.runInContext(clientSource,context);
 return {context,client:context.WFCloud,location,events,calls,writes,logs,observedBeforeClient,storageMap};
}
test('activation proof is scrubbed before an existing script can observe the URL',async()=>{
 const h=boot();assert.equal(h.observedBeforeClient,'');
 assert.equal(h.events[0][0],'scrub');assert(!h.location.href.includes(token));
 assert.equal(Object.hasOwn(h.context,'wfTakeOwnerActivation'),false,'proof handoff is not an enumerable window property');
 await h.client.ready;
 assert.equal(h.logs.length,0);assert(!JSON.stringify([...h.storageMap]).includes(token));
 assert(!JSON.stringify(h.client.getSnapshot()).includes(token));
 assert(!JSON.stringify(h.client.getSnapshot()).includes('activation-refresh'));
});
test('startup automatically consumes the proof in remote mode without awaiting its own ready promise',{timeout:1500},async()=>{
 const h=boot();const state=await h.client.ready;
 assert.equal(state.authenticated,true);assert.equal(state.currentAccount.id,owner);assert.equal(state.currentAccount.role,'owner');
 assert.equal(h.client.isRemote(),true);assert.equal(h.context.WFCloudClient.isRemoteMode(),true);assert.equal(h.client.isLinkedOwner(),false);
 assert.deepEqual(h.calls.map(call=>call.body),[{action:'auth.activateOwner',tokenHash:token,workspaceId:workspace,userId:owner}]);
 assert.equal(h.calls[0].headers.Authorization,undefined,'activation proof is not confused with a bearer token');
 await h.client.request('sync.pull',{});assert.equal(h.calls.at(-1).headers.Authorization,'Bearer activation-access');
 assert.equal(h.writes.length,1,'only the explicit owner route remembers its continuation');
 const saved=JSON.parse(h.writes[0][1]);assert.equal(saved.workspaceId,workspace);assert.equal(saved.userId,owner);assert.equal(saved.refreshToken,'activation-refresh');
 assert(!JSON.stringify(saved).includes('activation-access'));assert(!JSON.stringify(saved).includes(token));
});
test('a consumed proof cannot reactivate a second client or replay on refresh',async()=>{
 const h=boot();await h.client.ready;await h.client.refresh();
 const second=h.context.WFCloudClient.create();await second.ready;
 assert.equal(second.getSnapshot().authenticated,true,'same-session owner continuation is live-verified separately');
 assert.equal(h.calls.filter(call=>call.body.action==='auth.activateOwner').length,1);
 assert.equal(h.calls.filter(call=>call.body.action==='auth.refresh').length,1);assert.equal(h.location.hash,'');
});
test('malformed, overlong, extra-field and route-mismatched links fail closed without sending proof',async t=>{
 const cases=[
  ['malformed',{hash:'#wf-owner-activate=not!base64'}],
  ['overlong',{hash:'#wf-owner-activate='+'a'.repeat(2049)}],
  ['short proof',{hash:fragment({...proof,tokenHash:'short'})}],
  ['extra bearer',{hash:fragment({...proof,access_token:'must-not-be-accepted'})}],
  ['wrong owner shape',{hash:fragment({...proof,userId:'owner'})}],
  ['duplicate fragment',{hash:fragment(proof)+'&wf-owner-activate=other'}],
  ['query workspace',{query:'?wf-cloud=owner&workspace='+other}],
  ['duplicate workspace',{query:'?wf-cloud=owner&workspace='+workspace+'&workspace='+workspace}],
  ['employee route',{query:'?wf-cloud=employee&workspace='+workspace}],
  ['untrusted workspace',{configuredWorkspace:other}],
  ['missing trusted workspace',{configuredWorkspace:''}],
  ['missing route',{query:''}]
 ];
 for(const [name,options] of cases)await t.test(name,async()=>{
  const h=boot(options);const state=await h.client.ready;
  assert.equal(h.observedBeforeClient,'');assert.equal(state.authenticated,false);assert.equal(state.lastError,'OWNER_ACTIVATION_FAILED');
  assert.equal(h.client.isRemote(),true,'an invalid activation must not bootstrap a local owner');
  assert.equal(h.calls.length,0);assert.equal(h.writes.length,0);
 });
});
test('activation rejects scope or role substitution before adoption and retires the returned bearer',async t=>{
 for(const kind of ['workspace','user','role','status','expired','session'])await t.test(kind,async()=>{
  const value=authResponse();
  if(kind==='workspace')value.workspaceId=other;
  if(kind==='user')value.identity.currentAccount.id=other;
  if(kind==='role')value.identity.currentAccount.role='manager';
  if(kind==='status')value.identity.currentAccount.status='suspended';
  if(kind==='expired')value.identity.currentAccount.expiresAt='2000-01-01T00:00:00Z';
  if(kind==='session')value.session.refresh_token='';
  const h=boot({handler:async body=>({ok:true,status:200,json:async()=>body.action==='auth.activateOwner'?copy(value):{ok:true}})});
  const state=await h.client.ready;
  assert.equal(state.authenticated,false);assert.equal(state.currentAccount,null);assert.equal(state.lastError,'OWNER_ACTIVATION_FAILED');
  assert.equal(h.calls.at(-1).body.action,'auth.signOut');assert.equal(h.calls.at(-1).headers.Authorization,'Bearer activation-access');
  assert.equal(h.writes.length,0);
 });
});
test('activation errors expose only the generic failure and consume the proof once',async()=>{
 const h=boot({handler:async()=>({ok:false,status:400,json:async()=>({ok:false,error:{code:'secret-provider-detail-'+token}})})});
 const state=await h.client.ready;
 assert.equal(state.lastError,'OWNER_ACTIVATION_FAILED');assert.equal(state.authenticated,false);
 assert(!JSON.stringify(state).includes(token));assert.equal(h.logs.length,0);
 const second=h.context.WFCloudClient.create();await second.ready;assert.equal(h.calls.length,1);
});
test('logout during activation cannot be overwritten by a delayed owner response',async()=>{
 let release,entered;const started=new Promise(resolve=>{entered=resolve;}),pending=new Promise(resolve=>{release=resolve;});
 const h=boot({handler:async body=>{if(body.action==='auth.activateOwner'){entered();await pending;}return {ok:true,status:200,json:async()=>authResponse()};}});
 await started;await h.client.signOut();release();await h.client.ready;
 assert.equal(h.client.getSnapshot().authenticated,false);assert.equal(h.calls.at(-1).body.action,'auth.signOut');assert.equal(h.writes.length,0);
});
test('ordinary dashboard and remote entry retain their normal startup behavior',async()=>{
 const local=boot({hash:'#dashboard',query:''});local.client.localIdentityChanged();await local.client.ready;
 assert.equal(local.location.hash,'#dashboard');assert.equal(local.client.isRemote(),false);assert.equal(local.calls.length,0);
 const remote=boot({hash:'#dashboard',query:'?wf-cloud=employee&workspace='+workspace});await remote.client.ready;
 assert.equal(remote.location.hash,'#dashboard');assert.equal(remote.client.isRemote(),true);assert.equal(remote.client.getSnapshot().lastError,'');assert.equal(remote.calls.length,0);
});
test('failure to scrub removes the parsing document before navigating to a clean entry',async()=>{
 const h=boot({replaceFails:true});await h.client.ready;
 assert.equal(h.calls.length,0);assert.equal(h.writes.length,0);
 assert(h.events.some(event=>event[0]==='document-open'),'third-party scripts must not run with the proof still in the URL');
 assert(h.events.some(event=>event[0]==='replace'&&!event[1].includes('wf-owner-activate')));
});
test('owner reload validates its session continuation against the live provider before authenticating',{timeout:1500},async()=>{
 const first=boot();await first.client.ready;let release;
 const pending=new Promise(resolve=>{release=resolve;});
 const reload=boot({hash:'#dashboard',storageMap:first.storageMap,handler:async()=>{await pending;return {ok:true,status:200,json:async()=>authResponse()};}});
 assert.equal(reload.client.getSnapshot().authenticated,false);
 assert.deepEqual(reload.calls.map(call=>call.body),[{action:'auth.refresh',refreshToken:'activation-refresh'}]);
 release();await reload.client.ready;assert.equal(reload.client.getSnapshot().currentAccount.id,owner);
 assert.equal(reload.client.isRemote(),true);assert.equal(reload.client.isLinkedOwner(),false);
});
test('employee entry clears inherited owner continuations without trying to restore them',async()=>{
 const first=boot();await first.client.ready;
 first.storageMap.set('wf_wow_cloud_linked_owner_v2',JSON.stringify({refreshToken:'inherited-local-owner'}));
 const worker=boot({hash:'#dashboard',query:'?wf-cloud=employee&workspace='+workspace,storageMap:first.storageMap});await worker.client.ready;
 assert.equal(worker.client.getSnapshot().authenticated,false);assert.equal(worker.calls.length,0);assert.equal(worker.storageMap.size,0);
});
test('owner reload rejects workspace, user, epoch, role, expiry and revocation mismatches',async t=>{
 for(const kind of ['workspace','user','epoch','role','expired','revoked'])await t.test(kind,async()=>{
  const first=boot();await first.client.ready;const value=authResponse();
  if(kind==='workspace')value.workspaceId=other;
  if(kind==='user')value.identity.currentAccount.id=other;
  if(kind==='epoch')value.identity.currentAccount.sessionVersion=2;
  if(kind==='role')value.identity.currentAccount.role='manager';
  if(kind==='expired')value.identity.currentAccount.expiresAt='2000-01-01T00:00:00Z';
  const reload=boot({hash:'#dashboard',storageMap:first.storageMap,handler:async body=>kind==='revoked'&&body.action==='auth.refresh'
   ?{ok:false,status:401,json:async()=>({ok:false,error:{code:'SESSION_REVOKED'}})}
   :{ok:true,status:200,json:async()=>body.action==='auth.refresh'?value:{ok:true}}});
  await reload.client.ready;assert.equal(reload.client.getSnapshot().authenticated,false);assert.equal(reload.storageMap.size,0);
  if(kind!=='revoked')assert.equal(reload.calls.at(-1).body.action,'auth.signOut');
 });
});
test('owner continuation rejects changed deployment scope before sending a refresh token',async()=>{
 const first=boot();await first.client.ready;
 const reload=boot({hash:'#dashboard',configuredWorkspace:other,storageMap:first.storageMap});await reload.client.ready;
 assert.equal(reload.calls.length,0);assert.equal(reload.client.getSnapshot().authenticated,false);assert.equal(reload.storageMap.size,0);
});
test('owner logout removes the continuation so a later reload stays signed out',async()=>{
 const first=boot();await first.client.ready;await first.client.signOut();assert.equal(first.storageMap.size,0);
 const reload=boot({hash:'#dashboard',storageMap:first.storageMap});await reload.client.ready;
 assert.equal(reload.client.getSnapshot().authenticated,false);assert.equal(reload.calls.length,0);
});
test('logout during owner continuation verification retires the late server session',{timeout:1500},async()=>{
 const first=boot();await first.client.ready;let release;
 const pending=new Promise(resolve=>{release=resolve;});
 const reload=boot({hash:'#dashboard',storageMap:first.storageMap,handler:async body=>{
  if(body.action==='auth.refresh')await pending;
  return {ok:true,status:200,json:async()=>body.action==='auth.refresh'?authResponse():{ok:true}};
 }});
 await reload.client.signOut();release();await reload.client.ready;
 assert.equal(reload.client.getSnapshot().authenticated,false);assert.equal(reload.storageMap.size,0);
 assert.equal(reload.calls.at(-1).body.action,'auth.signOut');assert.equal(reload.calls.at(-1).headers.Authorization,'Bearer activation-access');
});
