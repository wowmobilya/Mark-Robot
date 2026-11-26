'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {webcrypto}=require('node:crypto');
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
function boot({hash=fragment(proof),query='?wf-cloud=owner&workspace='+workspace,configuredWorkspace=workspace,handler,replaceFails=false,storageMap=new Map(),durableMap=new Map(),durableBlocked=false,sessionBlocked=false,clock=Date.now(),locks}={}){
 const location=new URL('https://markrobot.example/'+query+hash),events=[],calls=[],writes=[],logs=[],listeners=new Map();
 const storage=(map,blocked)=>({getItem:key=>{if(blocked)throw Error('storage unavailable');return map.get(key)||null;},setItem:(key,value)=>{if(blocked)throw Error('storage unavailable');writes.push([key,value]);map.set(key,value);},removeItem:key=>{if(blocked)throw Error('storage unavailable');events.push(['remove',key]);map.delete(key);}});
 const context={URL,URLSearchParams,atob,AbortController,setTimeout,clearTimeout,crypto:webcrypto,Date:class extends Date{static now(){return clock;}},navigator:{onLine:true,locks},console:{log:(...args)=>logs.push(args),warn:(...args)=>logs.push(args),error:(...args)=>logs.push(args)},location,
  history:{replaceState(_state,_title,url){events.push(['scrub',url]);if(replaceFails)throw Error('history unavailable');location.href=new URL(url,location).href;}},
  document:{visibilityState:'visible',open(){events.push(['document-open']);},close(){events.push(['document-close']);},addEventListener(type,fn){(listeners.get(type)||listeners.set(type,[]).get(type)).push(fn);}},stop(){events.push(['stop']);},
  addEventListener(type,fn){(listeners.get(type)||listeners.set(type,[]).get(type)).push(fn);},
  localStorage:storage(durableMap,durableBlocked),sessionStorage:storage(storageMap,sessionBlocked),
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
 return {context,client:context.WFCloud,location,events,calls,writes,logs,observedBeforeClient,storageMap,durableMap,advance:ms=>{clock+=ms;},fire:async(type,event={})=>{await Promise.all((listeners.get(type)||[]).map(fn=>fn(event)));}};
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
 const reload=boot({hash:'#dashboard',storageMap:first.storageMap,durableMap:first.durableMap,handler:async()=>{await pending;return {ok:true,status:200,json:async()=>authResponse()};}});
 assert.equal(reload.client.getSnapshot().authenticated,false);
 assert.deepEqual(reload.calls.map(call=>call.body),[{action:'auth.refresh',refreshToken:'activation-refresh'}]);
 release();await reload.client.ready;assert.equal(reload.client.getSnapshot().currentAccount.id,owner);
 assert.equal(reload.client.isRemote(),true);assert.equal(reload.client.isLinkedOwner(),false);
});
test('employee entry clears inherited owner continuations without trying to restore them',async()=>{
 const first=boot();await first.client.ready;
 first.storageMap.set('wf_wow_cloud_linked_owner_v2',JSON.stringify({refreshToken:'inherited-local-owner'}));
 const worker=boot({hash:'#dashboard',query:'?wf-cloud=employee&workspace='+workspace,storageMap:first.storageMap,durableMap:first.durableMap});await worker.client.ready;
 assert.equal(worker.client.getSnapshot().authenticated,false);assert.equal(worker.calls.length,0);assert.equal(worker.storageMap.size,0);assert.equal(worker.durableMap.size,0);
});
test('employee entry removes malformed inherited owner records without authenticating',async()=>{
 const key='wf_wow_cloud_remote_owner_v1',storageMap=new Map([[key,'not-json']]),durableMap=new Map([[key,'{unfinished']]);
 const worker=boot({hash:'#dashboard',query:'?wf-cloud=employee&workspace='+workspace,storageMap,durableMap});await worker.client.ready;
 assert.equal(worker.client.getSnapshot().authenticated,false);assert.equal(worker.calls.length,0);
 assert.equal(storageMap.has(key),false);assert.equal(durableMap.has(key),false);
});
test('employee entry removes an inherited owner even when reading its record fails',async t=>{
 for(const source of ['local','session'])await t.test(source,async()=>{
  const key='wf_wow_cloud_remote_owner_v1',first=boot({durableBlocked:source==='session'});await first.client.ready;
  const map=source==='local'?first.durableMap:first.storageMap,get=map.get;
  map.get=function(name){if(name===key)throw Error('temporary owner record read failure');return get.call(this,name);};
  const worker=boot({hash:'#dashboard',query:'?wf-cloud=employee&workspace='+workspace,durableBlocked:source==='session',durableMap:first.durableMap,storageMap:first.storageMap});await worker.client.ready;
  map.get=get;
  assert.equal(worker.client.getSnapshot().authenticated,false);assert.equal(worker.calls.length,0);
  assert.equal(map.has(key),false,'employee cleanup must attempt removal even when reading the owner record fails');
  const reopened=boot({hash:'#dashboard',query:'',durableBlocked:source==='session',durableMap:first.durableMap,storageMap:first.storageMap});
  reopened.client.localIdentityChanged();await reopened.client.ready;
  assert.equal(reopened.client.getSnapshot().authenticated,false);assert.equal(reopened.calls.length,0);
 });
});
test('owner reload rejects workspace, user, epoch, role, expiry and revocation mismatches',async t=>{
 for(const kind of ['workspace','user','epoch','role','expired','revoked'])await t.test(kind,async()=>{
  const first=boot();await first.client.ready;const value=authResponse();
  if(kind==='workspace')value.workspaceId=other;
  if(kind==='user')value.identity.currentAccount.id=other;
  if(kind==='epoch')value.identity.currentAccount.sessionVersion=2;
  if(kind==='role')value.identity.currentAccount.role='manager';
  if(kind==='expired')value.identity.currentAccount.expiresAt='2000-01-01T00:00:00Z';
  const reload=boot({hash:'#dashboard',storageMap:first.storageMap,durableMap:first.durableMap,handler:async body=>kind==='revoked'&&body.action==='auth.refresh'
   ?{ok:false,status:401,json:async()=>({ok:false,error:{code:'SESSION_REVOKED'}})}
   :{ok:true,status:200,json:async()=>body.action==='auth.refresh'?value:{ok:true}}});
  await reload.client.ready;assert.equal(reload.client.getSnapshot().authenticated,false);assert.equal(reload.storageMap.size,0);assert.equal(reload.durableMap.size,0);
  if(kind!=='revoked')assert.equal(reload.calls.at(-1).body.action,'auth.signOut');
 });
});
test('owner continuation rejects changed deployment scope before sending a refresh token',async()=>{
 const first=boot();await first.client.ready;
 const reload=boot({hash:'#dashboard',configuredWorkspace:other,storageMap:first.storageMap,durableMap:first.durableMap});await reload.client.ready;
 assert.equal(reload.calls.length,0);assert.equal(reload.client.getSnapshot().authenticated,false);assert.equal(reload.storageMap.size,0);assert.equal(reload.durableMap.size,0);
});
test('owner logout removes the continuation so a later reload stays signed out',async()=>{
 const first=boot();await first.client.ready;await first.client.signOut();assert.equal(first.storageMap.size,0);assert.equal(first.durableMap.size,0);
 const reload=boot({hash:'#dashboard',storageMap:first.storageMap,durableMap:first.durableMap});await reload.client.ready;
 assert.equal(reload.client.getSnapshot().authenticated,false);assert.equal(reload.calls.length,0);
});
test('logout during owner continuation verification retires the late server session',{timeout:1500},async()=>{
 const first=boot();await first.client.ready;let release;
 const pending=new Promise(resolve=>{release=resolve;});
 const reload=boot({hash:'#dashboard',storageMap:first.storageMap,durableMap:first.durableMap,handler:async body=>{
  if(body.action==='auth.refresh')await pending;
  return {ok:true,status:200,json:async()=>body.action==='auth.refresh'?authResponse():{ok:true}};
 }});
 await reload.client.signOut();release();await reload.client.ready;
 assert.equal(reload.client.getSnapshot().authenticated,false);assert.equal(reload.storageMap.size,0);assert.equal(reload.durableMap.size,0);
 assert.equal(reload.calls.at(-1).body.action,'auth.signOut');assert.equal(reload.calls.at(-1).headers.Authorization,'Bearer activation-access');
});

test('a verified owner can reopen the ordinary app URL in a new tab without another setup',async()=>{
 const first=boot();await first.client.ready;
 assert.equal(first.durableMap.size,1,'owner continuation must survive closing its original tab');
 assert.equal(first.storageMap.size,0,'a durable continuation must not leave a stale session copy');
 const saved=JSON.parse([...first.durableMap.values()][0]);
 assert.equal(saved.workspaceId,workspace);assert.equal(saved.userId,owner);assert.equal(saved.cloudVersion,1);
 assert(!JSON.stringify(saved).includes(token));assert(!JSON.stringify(saved).includes('activation-access'));
 const reopened=boot({hash:'#assistant',query:'',durableMap:first.durableMap});
 assert.equal(reopened.client.isRemoteMode(),true);assert.equal(reopened.context.WFCloudClient.isRemoteMode(),true);
 assert.equal(reopened.client.getSnapshot().authenticated,false,'saved data never substitutes for live verification');
 await reopened.client.ready;
 assert.equal(reopened.client.getSnapshot().authenticated,true);assert.equal(reopened.client.getSnapshot().role,'owner');
 assert.deepEqual(reopened.calls.map(call=>call.body.action),['auth.refresh']);assert.equal(reopened.location.hash,'#assistant');
});

test('explicit owner password sign-in creates the same durable device continuation',async()=>{
 const first=boot({hash:'#dashboard'});await first.client.ready;
 await first.client.signIn({username:'owner',password:'Fixture-password-never-store'});
 assert.equal(first.durableMap.size,1);assert(!JSON.stringify([...first.durableMap]).includes('Fixture-password-never-store'));
 const reopened=boot({hash:'#dashboard',query:'',durableMap:first.durableMap});await reopened.client.ready;
 assert.equal(reopened.client.getSnapshot().authenticated,true);
});

test('explicit local mode preserves the device workspace without consuming its saved cloud owner',async()=>{
 const first=boot();await first.client.ready;
 const local=boot({hash:'#dashboard',query:'?wf-cloud=local',durableMap:first.durableMap});local.client.localIdentityChanged();await local.client.ready;
 assert.equal(local.client.isRemoteMode(),false);assert.equal(local.context.WFCloudClient.isRemoteMode(),false);
 assert.equal(local.calls.length,0);assert.equal(local.durableMap.size,1);
 const forced=local.context.WFCloudClient.create({mode:'local',getLocalSnapshot:()=>({configured:false,currentAccount:null})});await forced.ready;
 assert.equal(forced.isRemoteMode(),false);assert.equal(local.calls.length,0);
});

test('expired or wrong deployment owner continuations cannot select automatic cloud access',async t=>{
 const first=boot();await first.client.ready;
 for(const kind of ['expired','future','endpoint','workspace','user','epoch'])await t.test(kind,async()=>{
  const durableMap=new Map(first.durableMap),[key,raw]=[...durableMap][0],saved=JSON.parse(raw);
  if(kind==='expired'){saved.verifiedAt=Date.now()-31*86400000;saved.expiresAt=Date.now()-86400000;}
  if(kind==='future'){saved.verifiedAt=Date.now()+86400000;saved.expiresAt=saved.verifiedAt+30*86400000;}
  if(kind==='endpoint')saved.endpoint='https://another.example/functions/cloud';
  if(kind==='workspace')saved.workspaceId=other;
  if(kind==='user')saved.userId='not-a-user';
  if(kind==='epoch')saved.cloudVersion=0;
  durableMap.set(key,JSON.stringify(saved));
  const reopened=boot({hash:'#dashboard',query:'',durableMap});reopened.client.localIdentityChanged();await reopened.client.ready;
  assert.equal(reopened.client.isRemoteMode(),false);assert.equal(reopened.calls.length,0);assert.equal(reopened.client.getSnapshot().authenticated,false);
 });
});

test('online and focus retry a saved owner after a startup outage in one shared recovery',{timeout:2500},async t=>{
 for(const failure of ['network','server'])await t.test(failure,async()=>{
  const first=boot();await first.client.ready;let attempts=0,release,entered;
  const started=new Promise(resolve=>{entered=resolve;}),pending=new Promise(resolve=>{release=resolve;});
  const reload=boot({hash:'#dashboard',durableMap:first.durableMap,handler:async body=>{
   assert.equal(body.action,'auth.refresh');attempts++;
   if(attempts===1){if(failure==='network')throw TypeError('offline');return {ok:false,status:503,json:async()=>({ok:false,error:{code:'SERVICE_UNAVAILABLE'}})};}
   entered();await pending;return {ok:true,status:200,json:async()=>authResponse()};
  }});
  await reload.client.ready;assert.equal(reload.client.getSnapshot().authenticated,false);assert.equal(reload.durableMap.size,1);
  const online=reload.fire('online'),focus=reload.fire('focus'),refresh=reload.client.refresh();
  await started;assert.equal(attempts,2);release();await Promise.all([online,focus,refresh]);
  assert.equal(reload.client.getSnapshot().authenticated,true);assert.equal(attempts,2);
 });
});

test('a terminal owner retry failure removes the saved continuation and stops automatic retries',async()=>{
 const first=boot();await first.client.ready;let attempts=0;
 const reload=boot({hash:'#dashboard',durableMap:first.durableMap,handler:async()=>{
  if(++attempts===1)throw TypeError('offline');return {ok:false,status:401,json:async()=>({ok:false,error:{code:'SESSION_REVOKED'}})};
 }});
 await reload.client.ready;await reload.client.refresh();assert.equal(attempts,2);assert.equal(reload.durableMap.size,0);
 await reload.fire('online');await reload.client.refresh();assert.equal(attempts,2);assert.equal(reload.client.getSnapshot().authenticated,false);
});

test('sign-out in another owner tab fences a delayed restore even without a storage event',{timeout:2500},async()=>{
 const first=boot();await first.client.ready;let release,entered;
 const started=new Promise(resolve=>{entered=resolve;}),pending=new Promise(resolve=>{release=resolve;});
 const second=boot({hash:'#dashboard',durableMap:first.durableMap,handler:async body=>{
  if(body.action==='auth.refresh'){entered();await pending;}return {ok:true,status:200,json:async()=>body.action==='auth.refresh'?authResponse():{ok:true}};
 }});
 await started;await first.client.signOut();release();await second.client.ready;
 assert.equal(second.client.getSnapshot().authenticated,false);assert.equal(second.durableMap.size,0);
 assert.equal(second.calls.at(-1).body.action,'auth.signOut');
});

test('another tab cannot resurrect a signed-out owner from its live in-memory session',async()=>{
 const first=boot();await first.client.ready;
 const second=boot({hash:'#dashboard',durableMap:first.durableMap});await second.client.ready;
 await first.client.signOut();assert.equal(second.client.getSnapshot().authenticated,false);
 await second.client.refresh();assert.equal(second.durableMap.size,0);
});

test('blocked durable storage falls back to this tab and fully blocked storage stays memory-only',async()=>{
 const fallback=boot({durableBlocked:true});await fallback.client.ready;
 assert.equal(fallback.client.getSnapshot().authenticated,true);assert.equal(fallback.storageMap.size,1);
 const reloaded=boot({hash:'#dashboard',durableBlocked:true,storageMap:fallback.storageMap});await reloaded.client.ready;
 assert.equal(reloaded.client.getSnapshot().authenticated,true);
 const fresh=boot({hash:'#dashboard',query:'',durableBlocked:true});fresh.client.localIdentityChanged();await fresh.client.ready;
 assert.equal(fresh.client.isRemoteMode(),false);assert.equal(fresh.client.getSnapshot().authenticated,false);
 const memory=boot({durableBlocked:true,sessionBlocked:true});await memory.client.ready;
 assert.equal(memory.client.getSnapshot().authenticated,true);assert.equal(memory.durableMap.size,0);assert.equal(memory.storageMap.size,0);
});

test('legacy tab-only owner continuations upgrade only after live verification',async()=>{
 const storageMap=new Map([['wf_wow_cloud_remote_owner_v1',JSON.stringify({version:1,mode:'owner',endpoint:'https://test.supabase.co/functions/v1/wow-cloud',workspaceId:workspace,userId:owner,cloudVersion:1,refreshToken:'legacy-refresh'})]]);
 const first=boot({hash:'#dashboard',storageMap});await first.client.ready;
 assert.equal(first.client.getSnapshot().authenticated,true);assert.equal(first.durableMap.size,1);assert.equal(storageMap.size,0);
 assert.equal(first.calls[0].body.refreshToken,'legacy-refresh');
});

test('shared browser locks serialize owner refresh and reread the latest rotated token',async()=>{
 const first=boot();await first.client.ready;let tail=Promise.resolve(),current='activation-refresh',rotation=0;
 const locks={request(_name,_options,run){const next=tail.then(run);tail=next.catch(()=>{});return next;}},tokens=[];
 const handler=async body=>{
  tokens.push(body.refreshToken);
  if(body.refreshToken!==current)return {ok:false,status:401,json:async()=>({ok:false,error:{code:'AUTH_REQUIRED'}})};
  current='rotated-'+(++rotation);const value=authResponse();value.session.refresh_token=current;
  return {ok:true,status:200,json:async()=>value};
 };
 const a=boot({hash:'#dashboard',durableMap:first.durableMap,locks,handler});
 const b=boot({hash:'#dashboard',durableMap:first.durableMap,locks,handler});
 await Promise.all([a.client.ready,b.client.ready]);
 assert.equal(a.client.getSnapshot().authenticated,true);assert.equal(b.client.getSnapshot().authenticated,true);
 assert.deepEqual(tokens,['activation-refresh','rotated-1']);
 assert.equal(JSON.parse([...first.durableMap.values()][0]).refreshToken,'rotated-2');
});

test('a delayed owner refresh cannot overwrite a newer shared token when browser locks are unavailable',{timeout:2500},async()=>{
 const first=boot();await first.client.ready;let entered,release;
 const started=new Promise(resolve=>{entered=resolve;}),pending=new Promise(resolve=>{release=resolve;});
 const slow=boot({hash:'#dashboard',durableMap:first.durableMap,handler:async()=>{
  entered();await pending;const value=authResponse();value.session.refresh_token='stale-response-refresh';return {ok:true,status:200,json:async()=>value};
 }});
 await started;
 const fast=boot({hash:'#dashboard',durableMap:first.durableMap,handler:async()=>{
  const value=authResponse();value.session.refresh_token='newer-shared-refresh';return {ok:true,status:200,json:async()=>value};
 }});
 await fast.client.ready;release();await slow.client.ready;
 assert.equal(slow.client.getSnapshot().authenticated,true);
 assert.equal(JSON.parse([...first.durableMap.values()][0]).refreshToken,'newer-shared-refresh');
});

test('a stale owner tab cannot erase the newer continuation after a password version change',async()=>{
 const first=boot({handler:async body=>{
  const value=authResponse();if(body.action==='accounts.changePassword')value.identity.currentAccount.sessionVersion=2;
  return {ok:true,status:200,json:async()=>value};
 }});await first.client.ready;
 const second=boot({hash:'#dashboard',durableMap:first.durableMap});await second.client.ready;
 await first.client.changePassword('Fixture-current','Fixture-new-password');
 assert.equal(second.client.getSnapshot().authenticated,false,'the stale permission version must lose access');
 assert.equal(first.durableMap.size,1,'invalidating that stale tab must retain the newer owner continuation');
 assert.equal(first.client.getSnapshot().authenticated,true);assert.equal(JSON.parse([...first.durableMap.values()][0]).cloudVersion,2);
});

test('offline sign-out clears a matching tab fallback left behind by a failed durable-upgrade cleanup',async()=>{
 const fallback=boot({durableBlocked:true});await fallback.client.ready;
 assert.equal(fallback.storageMap.size,1);
 let connected=true;
 const upgrade=boot({hash:'#dashboard',storageMap:fallback.storageMap,handler:async()=>{
  if(!connected)throw TypeError('offline');return {ok:true,status:200,json:async()=>authResponse()};
 }});
 const remove=upgrade.context.sessionStorage.removeItem;
 upgrade.context.sessionStorage.removeItem=key=>{if(key==='wf_wow_cloud_remote_owner_v1')throw Error('temporary removal failure');return remove(key);};
 await upgrade.client.ready;
 assert.equal(upgrade.durableMap.size,1);assert.equal(upgrade.storageMap.size,1);
 upgrade.context.sessionStorage.removeItem=remove;connected=false;
 await assert.rejects(upgrade.client.signOut(),{code:'NETWORK'});
 assert.equal(upgrade.durableMap.size,0);assert.equal(upgrade.storageMap.size,0,'offline logout must retire every matching local copy');
 const reopened=boot({hash:'#dashboard',query:'',storageMap:upgrade.storageMap,durableMap:upgrade.durableMap});
 reopened.client.localIdentityChanged();await reopened.client.ready;
 assert.equal(reopened.client.getSnapshot().authenticated,false);assert.equal(reopened.calls.length,0);
});

test('a temporary storage read failure cannot detach the cross-tab logout fence',async()=>{
 const first=boot({handler:async body=>{
  if(body.action==='auth.signOut')throw TypeError('offline');return {ok:true,status:200,json:async()=>authResponse()};
 }});await first.client.ready;
 const second=boot({hash:'#dashboard',durableMap:first.durableMap});await second.client.ready;
 const get=second.context.localStorage.getItem;
 second.context.localStorage.getItem=()=>{throw Error('temporary storage read failure');};
 assert.equal(second.client.getSnapshot().authenticated,true,'already verified access may remain in memory while storage is unreadable');
 second.context.localStorage.getItem=get;
 await assert.rejects(first.client.signOut(),{code:'NETWORK'});assert.equal(first.durableMap.size,0);
 assert.equal(second.client.getSnapshot().authenticated,false,'the original continuation fence must be checked when storage returns');
 await second.client.refresh();assert.equal(first.durableMap.size,0,'a previously signed-out device continuation must never be recreated');
});

test('failed continuation writes preserve the existing cross-tab logout fence',async()=>{
 const first=boot({handler:async body=>{
  if(body.action==='auth.signOut')throw TypeError('offline');return {ok:true,status:200,json:async()=>authResponse()};
 }});await first.client.ready;
 const second=boot({hash:'#dashboard',durableMap:first.durableMap});await second.client.ready;
 const localWrite=second.context.localStorage.setItem,sessionWrite=second.context.sessionStorage.setItem;
 second.context.localStorage.setItem=second.context.sessionStorage.setItem=()=>{throw Error('quota unavailable');};
 await second.client.refresh();assert.equal(second.client.getSnapshot().authenticated,true);
 second.context.localStorage.setItem=localWrite;second.context.sessionStorage.setItem=sessionWrite;
 await assert.rejects(first.client.signOut(),{code:'NETWORK'});
 assert.equal(second.client.getSnapshot().authenticated,false);await second.client.refresh();assert.equal(first.durableMap.size,0);
});

test('a failed durable refresh write cannot detach another tab from explicit device logout',async()=>{
 const first=boot({handler:async body=>{
  if(body.action==='auth.signOut')throw TypeError('offline');
  return {ok:true,status:200,json:async()=>authResponse()};
 }});await first.client.ready;
 let rotating=false;
 const second=boot({hash:'#dashboard',durableMap:first.durableMap,handler:async body=>{
  const value=authResponse();
  if(body.action==='auth.refresh'&&rotating){value.session.refresh_token='rotated-after-quota';value.session.expires_at=Math.floor(Date.now()/1000)+14400;}
  return {ok:true,status:200,json:async()=>value};
 }});await second.client.ready;
 rotating=true;second.advance(2*60*60*1000);
 second.context.localStorage.setItem=()=>{throw Error('quota unavailable');};
 await second.client.request('sync.pull',{});
 assert.equal(second.client.getSnapshot().authenticated,true,'a verified owner may finish work with its in-memory session');
 await assert.rejects(first.client.signOut(),{code:'NETWORK'});
 assert.equal(second.client.getSnapshot().authenticated,false,'a failed durable write must preserve the shared logout fence');
 const reopened=boot({hash:'#dashboard',query:'',durableMap:first.durableMap,storageMap:second.storageMap});
 reopened.client.localIdentityChanged();await reopened.client.ready;
 assert.equal(reopened.client.getSnapshot().authenticated,false);assert.equal(reopened.calls.length,0,'a private tab fallback must not recreate the signed-out device owner');
});

test('later refresh uses a rotated in-memory token when its durable write failed',async t=>{
 for(const outcome of ['success','revoked','shared-advanced'])await t.test(outcome,async()=>{
  const start=Date.now(),seen=[];let current='activation-refresh',refreshes=0;
  const first=boot({clock:start,handler:async body=>{
   if(body.action==='auth.refresh'){
    seen.push(body.refreshToken);refreshes++;
    if(body.refreshToken!==current||outcome==='revoked'&&refreshes>1)return {ok:false,status:401,json:async()=>({ok:false,error:{code:'AUTH_REQUIRED'}})};
    current='rotated-valid-refresh-'+refreshes;const value=authResponse();
    value.session.refresh_token=current;value.session.expires_at=Math.floor(start/1000)+refreshes*7200+3600;
    return {ok:true,status:200,json:async()=>value};
   }
   return {ok:true,status:200,json:async()=>authResponse()};
  }});await first.client.ready;
  first.context.localStorage.setItem=()=>{throw Error('quota unavailable');};
  first.advance(7200000);await first.client.request('sync.pull',{});
  if(outcome==='shared-advanced'){
   const key='wf_wow_cloud_remote_owner_v1',saved=JSON.parse(first.durableMap.get(key));
   current='newer-shared-refresh';saved.refreshToken=current;first.durableMap.set(key,JSON.stringify(saved));
  }
  first.advance(7200000);
  if(outcome==='revoked')await assert.rejects(first.client.request('sync.pull',{}),{code:'AUTH_REQUIRED'});
  else await first.client.request('sync.pull',{});
  assert.deepEqual(seen,['activation-refresh',outcome==='shared-advanced'?'newer-shared-refresh':'rotated-valid-refresh-1']);
  assert.equal(first.client.getSnapshot().authenticated,outcome!=='revoked');
 });
});

test('offline logout remains retired after owner storage reads or removals fail',async t=>{
 for(const source of ['local','session'])for(const operation of ['getItem','removeItem'])await t.test(source+' '+operation,async()=>{
  const key='wf_wow_cloud_remote_owner_v1',first=boot({durableBlocked:source==='session',handler:async body=>{
   if(body.action==='auth.signOut')throw TypeError('offline');return {ok:true,status:200,json:async()=>authResponse()};
  }});await first.client.ready;
  const storage=source==='local'?first.context.localStorage:first.context.sessionStorage,original=storage[operation];
  storage[operation]=()=>{throw Error('temporary owner storage failure');};
  await assert.rejects(first.client.signOut(),{code:'NETWORK'});
  assert.equal(first.client.getSnapshot().authenticated,false);
  storage[operation]=original;
  const reopened=boot({hash:'#dashboard',query:'',durableBlocked:source==='session',durableMap:first.durableMap,storageMap:first.storageMap});
  reopened.client.localIdentityChanged();await reopened.client.ready;
  assert.equal(reopened.client.getSnapshot().authenticated,false,'a failed cleanup must not leave a reusable owner continuation');
  assert.equal(reopened.calls.length,0,'a locally retired credential must never reach auth.refresh');
  assert.equal((source==='local'?first.durableMap:first.storageMap).has(key),false);
 });
});

test('an unreadable old owner fence cannot erase a newer explicit sign-in during logout',async()=>{
 const key='wf_wow_cloud_remote_owner_v1',first=boot({handler:async body=>{
  if(body.action==='auth.signOut')throw TypeError('offline');return {ok:true,status:200,json:async()=>authResponse()};
 }});await first.client.ready;
 const second=boot({hash:'#dashboard',durableMap:first.durableMap});await second.client.ready;
 await second.client.signIn({username:'owner',password:'Fixture-owner-password'});
 const newer=first.durableMap.get(key);
 first.context.localStorage.getItem=()=>{throw Error('temporary storage read failure');};
 await assert.rejects(first.client.signOut(),{code:'NETWORK'});
 assert.equal(first.durableMap.get(key),newer,'cleanup must be scoped to the previous continuation');
 assert.equal(second.client.getSnapshot().authenticated,true);
 const reopened=boot({hash:'#dashboard',query:'',durableMap:first.durableMap});await reopened.client.ready;
 assert.equal(reopened.client.getSnapshot().authenticated,true);
});

test('cold owner restore stays locked when its cancellation check cannot be read',async()=>{
 const key='wf_wow_cloud_remote_owner_v1',first=boot({handler:async body=>{
  if(body.action==='auth.signOut')throw TypeError('offline');return {ok:true,status:200,json:async()=>authResponse()};
 }});await first.client.ready;
 first.context.localStorage.removeItem=()=>{throw Error('temporary storage removal failure');};
 await assert.rejects(first.client.signOut(),{code:'NETWORK'});
 const durableMap=new Map(first.durableMap);
 durableMap.get=name=>{if(name!==key)throw Error('cancellation state unavailable');return Map.prototype.get.call(durableMap,name);};
 const reopened=boot({hash:'#dashboard',query:'',durableMap});reopened.client.localIdentityChanged();await reopened.client.ready;
 assert.equal(reopened.client.getSnapshot().authenticated,false);
 assert.equal(reopened.calls.length,0,'cold restore must verify its cancellation state before calling the provider');
});

test('a cancellation storage event immediately locks another open owner tab',async()=>{
 const key='wf_wow_cloud_remote_owner_v1',first=boot({handler:async body=>{
  if(body.action==='auth.signOut')throw TypeError('offline');return {ok:true,status:200,json:async()=>authResponse()};
 }});await first.client.ready;
 const second=boot({hash:'#dashboard',durableMap:first.durableMap});await second.client.ready;
 const observed=[];second.client.subscribe(state=>observed.push(state.authenticated));
 first.context.localStorage.removeItem=()=>{throw Error('temporary storage removal failure');};
 await assert.rejects(first.client.signOut(),{code:'NETWORK'});
 const cancellationKey=[...first.durableMap.keys()].find(name=>name!==key);
 assert(cancellationKey,'failed cleanup must publish cancellation state');
 await second.fire('storage',{key:cancellationKey});
 assert.deepEqual(observed,[false],'the storage event must publish signed-out state without a separate snapshot or refresh');
});

test('offline sign-out also retires the legacy predecessor of an incompletely cleaned-upgrade',async()=>{
 const key='wf_wow_cloud_remote_owner_v1';
 const storageMap=new Map([[key,JSON.stringify({version:1,mode:'owner',endpoint:'https://test.supabase.co/functions/v1/wow-cloud',workspaceId:workspace,userId:owner,cloudVersion:1,refreshToken:'legacy-predecessor-refresh'})]]);
 let connected=true;
 const upgrade=boot({hash:'#dashboard',storageMap,handler:async()=>{
  if(!connected)throw TypeError('offline');return {ok:true,status:200,json:async()=>authResponse()};
 }});
 const remove=upgrade.context.sessionStorage.removeItem;
 upgrade.context.sessionStorage.removeItem=key=>{if(key==='wf_wow_cloud_remote_owner_v1')throw Error('temporary cleanup failure');return remove(key);};
 await upgrade.client.ready;assert.equal(upgrade.durableMap.size,1);assert.equal(upgrade.storageMap.size,1);
 upgrade.context.sessionStorage.removeItem=remove;connected=false;
 await assert.rejects(upgrade.client.signOut(),{code:'NETWORK'});
 assert.equal(upgrade.storageMap.size,0);assert.equal(upgrade.durableMap.size,0);
 const reopened=boot({hash:'#dashboard',storageMap:upgrade.storageMap,durableMap:upgrade.durableMap});await reopened.client.ready;
 assert.equal(reopened.client.getSnapshot().authenticated,false);assert.equal(reopened.calls.length,0);
});

test('approved enrollment handoff verifies the session and celebrates once',async()=>{
 const key='wf.ownerActivation.handoff.v1',row={workspaceId:workspace,userId:owner,createdAt:Date.now(),refreshToken:'approved-fixture'};
 const start=(change={},result=authResponse())=>boot({hash:'',query:'?wf-cloud=employee&workspace='+workspace,clock:row.createdAt,
  storageMap:new Map([[key,JSON.stringify({...row,...change})]]),handler:async()=>({ok:true,status:200,json:async()=>result})});
 const h=start();await h.client.ready;
 assert.equal(h.storageMap.has(key),false);assert.deepEqual(h.calls[0].body,{action:'auth.refresh',refreshToken:row.refreshToken});
 assert.equal(h.client.getSnapshot().currentAccount.id,owner);assert(h.client.takeApprovalNotice());assert(!h.client.takeApprovalNotice());
 const expired=start({createdAt:row.createdAt-120001});await expired.client.ready;assert.equal(expired.calls.length,0);
 const wrong=start({},authResponse({workspaceId:other}));await wrong.client.ready;
 assert.equal(wrong.client.getSnapshot().authenticated,false);assert(!wrong.client.takeApprovalNotice());assert.equal(wrong.calls.at(-1).body.action,'auth.signOut');
});
test('device QR cleans the URL and adopts only the requested worker session',async()=>{
 const response=authResponse();response.identity.currentAccount.role='sales';
 const hash='#wf-device-pair='+Buffer.from(JSON.stringify({...proof,tokenHash:'a'.repeat(64)})).toString('base64url');
 const h=boot({hash,query:'?wf-cloud=employee&workspace='+workspace,configuredWorkspace:other,
  handler:async()=>({ok:true,status:200,json:async()=>response})});
 assert.equal(h.observedBeforeClient,'');assert.equal((await h.client.ready).currentAccount.role,'sales');
 assert.deepEqual(h.calls.map(call=>call.body.action),['auth.devicePair']);
});
