'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const file=path.join(__dirname,'../modules/platform/cloud/wow-cloud-client.js');
const moduleAPI=fs.existsSync(file)?require(file):{};
const config={enabled:true,projectRef:'test-project',endpoint:'https://test.supabase.co/functions/v1/wow-cloud',publishableKey:'public-test-key',dashboardUrl:'https://supabase.com/dashboard/project/test-project'};
const copy=value=>value==null?value:structuredClone(value);
function identity(role='owner',version=1){const currentAccount={id:'user-'+role,name:'WOW '+role,username:role,role,status:'active',permissions:role==='owner'?['accounts.edit','products.view','products.edit']:['products.view'],sessionVersion:version,expiresAt:null};return {configured:true,revision:version,currentAccount,accounts:[currentAccount],audit:[]};}
function response(body,status=200){return {ok:status>=200&&status<300,status,json:async()=>copy(body)};}
function harness({mode='local',saved=null,role='owner',create=moduleAPI.create}={}){
  let clock=1000000,stored=copy(saved),fail=null,handler=null,calls=[];
  let local={configured:true,currentAccount:{id:'fixture-local-owner',role:'owner',status:'active',sessionVersion:1}};
  const adapter={read:()=>copy(stored),write:value=>{stored=copy(value);},clear:()=>{stored=null;}};
  const auth=()=>({ok:true,workspaceId:'workspace-1',identity:identity(role),session:{access_token:'access-'+role,refresh_token:'refresh-'+role,expires_at:Math.floor(clock/1000)+3600}});
  const fetch=async(url,options)=>{const body=JSON.parse(options.body);calls.push({url,body,headers:options.headers});if(fail)throw fail;if(handler)return handler(body,options);return response(body.action.startsWith('auth.')&&body.action!=='auth.signOut'?auth():{ok:true,workspaceId:'workspace-1',identity:identity(role)});};
  assert.equal(typeof moduleAPI.create,'function','cloud client module must exist');
  const client=create({config,mode,fetch,sessionStore:adapter,now:()=>clock,getLocalSnapshot:()=>copy(local)});
  return {client,calls,stored:()=>copy(stored),advance:ms=>{clock+=ms;},setRole:value=>{role=value;},fail:value=>{fail=value;},handle:value=>{handler=value;},auth,
    replaceStored:value=>{stored=copy(value);},setLocal:value=>{local=copy(value);}};
}
const login=client=>client.signIn({username:'owner',password:'Owner password 2026'});

test('local mode is default and does not invent an authenticated cloud owner',async()=>{
  const h=harness();await h.client.ready;const state=h.client.getSnapshot();
  assert.equal(h.client.isRemote(),false);assert.equal(h.client.cacheName(),'WowFurnitureDB');assert.equal(state.authenticated,false);
  assert.equal(state.currentAccount,null);assert.equal(h.calls.length,0);
});

test('owner pairing sends credentials only to auth and persists only the owner refresh continuation',async()=>{
  const h=harness();await login(h.client);const state=h.client.getSnapshot(),saved=h.stored();
  assert.equal(state.authenticated,true);assert.equal(state.workspaceId,'workspace-1');assert.equal(h.client.isLinkedOwner(),true);
  assert.equal(saved.refreshToken,'refresh-owner');assert(!JSON.stringify(saved).includes('access-owner'));assert(!JSON.stringify(saved).includes('Owner password'));
  assert(!JSON.stringify(state).includes('refresh-owner'));assert(!JSON.stringify(state).includes('access-owner'));
  assert.equal(h.calls[0].body.action,'auth.signIn');assert.equal(h.calls[0].headers.apikey,'public-test-key');
  await h.client.request('sync.pull',{cursor:0});assert.equal(h.calls.at(-1).headers.Authorization,'Bearer access-owner');
});

test('employee mode uses an authenticated separate cache and keeps all tokens in memory',async()=>{
  const h=harness({mode:'remote',role:'sales'});await h.client.ready;
  assert.throws(()=>h.client.cacheName(),{code:'AUTH_REQUIRED'});
  await h.client.signIn({username:'worker',password:'Worker password 2026'});
  assert.equal(h.stored(),null);assert.equal(h.client.isLinkedOwner(),false);assert.equal(h.client.isRemote(),true);
  assert.equal(h.client.cacheName(),'WowFurnitureRemoteDB_v1_workspace-1_user-sales');
  assert.equal(h.client.can('accounts.edit'),false);assert.equal(h.client.getSnapshot().configured,true);
});

test('a cloud worker cannot silently become the local owner companion',async()=>{
  const h=harness({role:'sales'});await assert.rejects(login(h.client),{code:'REMOTE_MODE_REQUIRED'});
  assert.equal(h.client.getSnapshot().authenticated,false);assert.equal(h.stored(),null);assert.equal(h.client.isLinkedOwner(),false);
});

test('owner continuation is verified against server before restoring and remains owner-only',async()=>{
  const first=harness();await login(first.client);const saved=first.stored();
  const h=harness({saved});assert.equal(h.client.getSnapshot().authenticated,false);await h.client.ready;
  assert.equal(h.calls[0].body.action,'auth.refresh');assert.equal(h.calls[0].body.refreshToken,'refresh-owner');assert.equal(h.client.getSnapshot().currentAccount.role,'owner');
  const rejected=harness({saved,role:'sales'});await rejected.client.ready;assert.equal(rejected.client.getSnapshot().authenticated,false);assert.equal(rejected.stored(),null);
});

test('worker inactivity locks only remote identity and never falls back to local mode',async()=>{
  const h=harness({mode:'remote',role:'sales'});await login(h.client);h.advance(30*60*1000);
  assert.equal(h.client.getSnapshot().currentAccount,null);assert.equal(h.client.getSnapshot().configured,true);assert.equal(h.client.isRemote(),true);
  await assert.rejects(h.client.request('sync.pull',{}),{code:'AUTH_REQUIRED'});
  assert.throws(()=>h.client.cacheName(),{code:'AUTH_REQUIRED'});
});

test('owner session survives employee inactivity while worker touch never extends the eight-hour limit',async()=>{
  const owner=harness();await login(owner.client);owner.advance(9*60*60*1000);assert.equal(owner.client.getSnapshot().currentAccount.role,'owner');
  const worker=harness({mode:'remote',role:'sales'});await login(worker.client);
  for(let i=0;i<23;i++){worker.advance(20*60*1000);assert.equal(worker.client.touch(),true);}
  worker.advance(20*60*1000);assert.equal(worker.client.getSnapshot().currentAccount,null);
});

test('session refresh uses genuine activity for touch instead of renewing idle during polling',async()=>{
  const h=harness({mode:'remote',role:'sales'});await login(h.client);await h.client.refresh();assert.equal(h.calls.at(-1).body.action,'session.snapshot');
  h.advance(1000);h.client.touch();await h.client.refresh();assert.equal(h.calls.at(-1).body.action,'session.touch');
});

test('concurrent protected calls share one token refresh',async()=>{
  const h=harness();await login(h.client);h.advance(3590*1000);
  await Promise.all([h.client.request('sync.pull',{cursor:0}),h.client.request('permissions.assert',{permission:'products.view'})]);
  assert.equal(h.calls.filter(call=>call.body.action==='auth.refresh').length,1);
});

test('revoked server sessions clear access without switching employee mode or leaking tokens',async()=>{
  const h=harness({mode:'remote',role:'sales'});await login(h.client);
  h.handle(()=>response({ok:false,error:{code:'SESSION_REVOKED',message:'Session revoked'}},401));
  await assert.rejects(h.client.request('sync.pull',{}),{code:'SESSION_REVOKED'});
  assert.equal(h.client.getSnapshot().authenticated,false);assert.equal(h.client.isRemote(),true);assert.equal(h.stored(),null);
});

test('ordinary permission denial does not revoke a valid owner session',async()=>{
  const h=harness();await login(h.client);h.handle(()=>response({ok:false,error:{code:'PERMISSION_DENIED',message:'Denied'}},403));
  await assert.rejects(h.client.request('permissions.assert',{permission:'unknown'}),{code:'PERMISSION_DENIED'});
  assert.equal(h.client.getSnapshot().authenticated,true);
});

test('network loss preserves owner binding for durable offline queueing but never reports online success',async()=>{
  const h=harness();await login(h.client);h.fail(TypeError('network failed'));
  await assert.rejects(h.client.request('sync.push',{}),{code:'NETWORK'});
  assert.equal(h.client.getSnapshot().connection,'offline');assert.equal(h.client.getSnapshot().workspaceId,'workspace-1');assert.equal(h.client.isLinkedOwner(),true);
});

test('logout clears owner continuation immediately while preserving the binding and mode',async()=>{
  const h=harness();await login(h.client);h.fail(TypeError('offline'));
  const logout=h.client.signOut();assert.equal(h.client.getSnapshot().authenticated,false);assert.equal(h.stored(),null);
  await assert.rejects(logout,{code:'NETWORK'});assert.equal(h.client.getSnapshot().workspaceId,'workspace-1');assert.equal(h.client.isRemote(),false);
});

test('a pending login cannot reauthenticate after logout',async()=>{
  const h=harness();let release,entered;const wait=new Promise(resolve=>{entered=resolve;}),hold=new Promise(resolve=>{release=resolve;});
  h.handle(async body=>{if(body.action==='auth.signIn'){entered();await hold;return response(h.auth());}return response({ok:true});});
  const pending=login(h.client);await wait;await h.client.signOut();release();await assert.rejects(pending,{code:'AUTH_REQUIRED'});
  assert.equal(h.client.getSnapshot().authenticated,false);assert.equal(h.stored(),null);
});

test('owner enrollment requires explicit proof and does not persist it',async()=>{
  const h=harness();await assert.rejects(h.client.bootstrapOwner({name:'Owner',username:'owner',password:'Owner password 2026'}),{code:'SETUP_PROOF_REQUIRED'});
  await h.client.enrollOwner({setupToken:'single-use-proof',name:'Owner',username:'owner',password:'Owner password 2026'});
  assert.equal(h.calls[0].body.setupToken,'single-use-proof');assert(!JSON.stringify(h.client.getSnapshot()).includes('single-use-proof'));assert(!JSON.stringify(h.stored()).includes('single-use-proof'));
});

test('account adapter uses current revision and backend action names',async()=>{
  const h=harness({mode:'remote'});await login(h.client);
  await h.client.updateAccount('worker',{name:'New name'});assert.deepEqual(h.calls.at(-1).body,{action:'accounts.update',accountId:'worker',payload:{name:'New name'},expectedRevision:1});
  await h.client.assertPermission('products.edit');assert.equal(h.calls.at(-1).body.permission,'products.edit');
});

test('an obsolete protected response cannot sign out a newer authenticated session',async()=>{
  const h=harness();await login(h.client);let release,entered;
  const wait=new Promise(resolve=>{entered=resolve;}),hold=new Promise(resolve=>{release=resolve;});
  h.handle(async body=>{if(body.action==='sync.pull'){entered();await hold;return response({ok:false,error:{code:'SESSION_REVOKED'}},401);}return response(h.auth());});
  const obsolete=h.client.request('sync.pull',{});await wait;await login(h.client);release();
  await assert.rejects(obsolete,{code:'SESSION_REVOKED'});assert.equal(h.client.getSnapshot().authenticated,true);
});

test('token refresh cannot silently accept a changed account permission epoch',async()=>{
  const h=harness();await login(h.client);h.advance(3590*1000);
  h.handle(()=>response({...h.auth(),identity:identity('owner',2)}));
  await assert.rejects(h.client.request('sync.pull',{}),{code:'SESSION_REVOKED'});assert.equal(h.client.getSnapshot().authenticated,false);
});

test('copied employee links never retain the owner account-management query',async()=>{
  const h=harness();await login(h.client);const link=new URL(h.client.entryUrl('https://wow.example/Mark-Robot/?wf-accounts=cloud&private-context=1#settings'));
  assert.equal(link.searchParams.get('wf-cloud'),'employee');assert.deepEqual([...link.searchParams.keys()],['wf-cloud','workspace']);assert.equal(link.pathname,'/Mark-Robot/');
});

test('logout unregisters device push while the bearer is valid and still locks when push cleanup fails',async t=>{
  const h=harness({mode:'remote',role:'sales'});await login(h.client);
  const previous=globalThis.WFPush;t.after(()=>{if(previous===undefined)delete globalThis.WFPush;else globalThis.WFPush=previous;});
  globalThis.WFPush={async beforeSignOut(){
    assert.equal(h.client.getSnapshot().authenticated,true);
    await h.client.request('push.unsubscribe',{deviceId:'test-device'});
    throw Error('device subscription unavailable');
  }};
  await h.client.signOut();
  assert.deepEqual(h.calls.slice(-2).map(call=>[call.body.action,call.headers.Authorization]),[['push.unsubscribe','Bearer access-sales'],['auth.signOut','Bearer access-sales']]);
  assert.equal(h.client.getSnapshot().authenticated,false);
});

test('a delayed device push cleanup cannot clear a later sign-in',async t=>{
  const h=harness();await login(h.client);let release;
  const previous=globalThis.WFPush;t.after(()=>{if(previous===undefined)delete globalThis.WFPush;else globalThis.WFPush=previous;});
  globalThis.WFPush={beforeSignOut:()=>new Promise(resolve=>{release=resolve;})};
  const signingOut=h.client.signOut();await login(h.client);release();await signingOut;
  assert.equal(h.client.getSnapshot().authenticated,true);assert.equal(h.stored().userId,'user-owner');
});

test('a stalled device push cleanup reaches the logout deadline and revokes the cloud session',async t=>{
  const h=harness();await login(h.client);
  const priorPush=globalThis.WFPush,priorTimeout=globalThis.setTimeout;let expireCleanup;
  t.after(()=>{if(priorPush===undefined)delete globalThis.WFPush;else globalThis.WFPush=priorPush;});
  t.mock.method(globalThis,'setTimeout',(fn,delay,...args)=>{
    if(delay===4000){expireCleanup=fn;return;}
    return priorTimeout(fn,delay,...args);
  });
  globalThis.WFPush={beforeSignOut:()=>new Promise(()=>{})};
  const signingOut=h.client.signOut();expireCleanup();await signingOut;
  assert.equal(h.client.getSnapshot().authenticated,false);assert.equal(h.stored(),null);
  assert.equal(h.calls.at(-1).body.action,'auth.signOut');assert.equal(h.calls.at(-1).headers.Authorization,'Bearer access-owner');
});

test('a lost response body is retryable and retains the same batch identity',async()=>{
  const h=harness();await login(h.client);let first=true;
  h.handle(()=>{if(first){first=false;return {ok:true,status:200,json:async()=>{throw new TypeError('body stream interrupted');}};}return response({ok:true});});
  const payload={batchId:'batch-fixture',operations:[]};
  await assert.rejects(h.client.request('sync.push',payload),{code:'NETWORK'});
  assert.equal(h.client.getSnapshot().connection,'offline');
  await h.client.request('sync.push',payload);
  assert.deepEqual(h.calls.filter(c=>c.body.action==='sync.push').map(c=>c.body.batchId),['batch-fixture','batch-fixture']);
});

test('response body remains under the network deadline after headers arrive',async t=>{
  const h=harness();await login(h.client);let expire,bodyStarted;const started=new Promise(r=>{bodyStarted=r;});
  const original=globalThis.setTimeout;
  t.mock.method(globalThis,'setTimeout',(fn,ms,...args)=>ms===15000?(expire=fn,123456):original(fn,ms,...args));
  h.handle((body,opts)=>({ok:true,status:200,json:()=>new Promise((resolve,reject)=>{bodyStarted();opts.signal.addEventListener('abort',()=>reject(new DOMException('aborted','AbortError')));})}));
  const request=h.client.request('sync.push',{batchId:'deadline-fixture'});await started;expire();
  await assert.rejects(request,{code:'NETWORK'});assert.equal(h.client.getSnapshot().connection,'offline');
});

test('truncated successful response remains retryable with the original operation identity',async()=>{
 const h=harness();await login(h.client);let first=true;
 h.handle(()=>first?(first=false,{ok:true,status:200,json:async()=>{throw new SyntaxError('truncated JSON');}}):response({ok:true}));
 const payload={batchId:'truncated-fixture',operations:[]};
 await assert.rejects(h.client.request('sync.push',payload),{code:'NETWORK'});await h.client.request('sync.push',payload);
 assert.deepEqual(h.calls.filter(x=>x.body.action==='sync.push').map(x=>x.body.batchId),['truncated-fixture','truncated-fixture']);
});

test('linked local owner recovers after a temporary startup failure without another password',async t=>{
 for(const kind of ['network','server'])await t.test(kind,async()=>{
  const first=harness();await login(first.client);const saved=first.stored(),h=harness({saved});
  if(kind==='network')h.fail(TypeError('connection unavailable'));
  else h.handle(()=>response({ok:false,error:{code:'SERVICE_UNAVAILABLE'}},503));
  await h.client.ready;
  assert.equal(h.client.getSnapshot().authenticated,false);
  assert.equal(h.stored()?.refreshToken,'refresh-owner','a temporary outage must retain the verified owner continuation');
  h.fail(null);h.handle(null);await h.client.refresh();
  assert.deepEqual(h.calls.map(c=>c.body.action),['auth.refresh','auth.refresh']);
  assert.equal(h.client.getSnapshot().authenticated,true);assert.equal(h.client.getSnapshot().role,'owner');
 });
});

test('linked owner recovery coalesces overlapping retries and stays locked until verification finishes',async()=>{
 const first=harness();await login(first.client);const h=harness({saved:first.stored()});
 h.fail(TypeError('offline'));await h.client.ready;h.fail(null);
 let release;const held=new Promise(resolve=>{release=resolve;});
 h.handle(async()=>{await held;return response(h.auth());});
 const attempts=[h.client.refresh(),h.client.refresh(),h.client.refresh()];
 await new Promise(resolve=>setImmediate(resolve));
 const count=h.calls.filter(c=>c.body.action==='auth.refresh').length,authenticated=h.client.getSnapshot().authenticated;
 release();await Promise.all(attempts);
 assert.equal(count,2,'three retries must share one new verification');assert.equal(authenticated,false);
 assert.equal(h.client.getSnapshot().authenticated,true);
});

test('linked owner recovery rereads the current continuation instead of replaying its startup copy',async()=>{
 const first=harness();await login(first.client);const h=harness({saved:first.stored()});
 h.fail(TypeError('offline'));await h.client.ready;h.fail(null);
 h.replaceStored({...h.stored(),refreshToken:'rotated-fixture-refresh'});
 await h.client.refresh();
 assert.equal(h.calls.at(-1).body.refreshToken,'rotated-fixture-refresh');assert.equal(h.client.getSnapshot().authenticated,true);
});

test('linked owner recovery never uses an absent or differently bound saved continuation',async t=>{
 const first=harness();await login(first.client);
 for(const change of ['removed','owner','epoch','endpoint'])await t.test(change,async()=>{
  const h=harness({saved:first.stored()});h.fail(TypeError('offline'));await h.client.ready;h.fail(null);
  const next=h.stored();
  if(change==='owner')next.localOwnerId='other-owner';
  if(change==='epoch')next.localVersion=2;
  if(change==='endpoint')next.endpoint='https://another.fixture.invalid';
  h.replaceStored(change==='removed'?null:next);await h.client.refresh();
  assert.equal(h.calls.length,1);assert.equal(h.client.getSnapshot().authenticated,false);
 });
});

test('linked owner recovery rejects a changed server account or permission epoch',async t=>{
 const first=harness();await login(first.client);
 for(const change of ['user','epoch','workspace'])await t.test(change,async()=>{
  const h=harness({saved:first.stored()});h.fail(TypeError('offline'));await h.client.ready;h.fail(null);
  h.handle(body=>{if(body.action==='auth.signOut')return response({ok:true});const result=h.auth();
   if(change==='user')result.identity.currentAccount.id='other-owner';
   if(change==='epoch')result.identity.currentAccount.sessionVersion=2;
   if(change==='workspace')result.workspaceId='other-workspace';
   return response(result);
  });
  await h.client.refresh();assert.equal(h.client.getSnapshot().authenticated,false);assert.equal(h.stored(),null);
  assert.equal(h.calls.filter(c=>c.body.action==='auth.refresh').length,2);
 });
});

test('logout and local account changes fence a linked owner recovery response',async t=>{
 const first=harness();await login(first.client);
 for(const change of ['logout','worker','owner-epoch'])await t.test(change,async()=>{
  const h=harness({saved:first.stored()});h.fail(TypeError('offline'));await h.client.ready;h.fail(null);
  let release;const held=new Promise(resolve=>{release=resolve;});
  h.handle(async body=>{if(body.action==='auth.signOut')return response({ok:true});await held;return response(h.auth());});
  const pending=h.client.refresh();await new Promise(resolve=>setImmediate(resolve));
  const attempts=h.calls.filter(c=>c.body.action==='auth.refresh').length;
  if(change==='logout')await h.client.signOut();
  else {h.setLocal({configured:true,currentAccount:{id:change==='worker'?'local-worker':'fixture-local-owner',role:change==='worker'?'sales':'owner',status:'active',sessionVersion:2}});h.client.localIdentityChanged();}
  release();await pending;
  assert.equal(attempts,2,'the response must actually be in flight before revoking access');
  assert.equal(h.client.getSnapshot().authenticated,false);assert.equal(h.stored(),null);
  assert.equal(h.calls.at(-1).body.action,'auth.signOut','discard the superseded server session');
 });
});

test('removing the linked continuation while recovery is pending prevents the response from restoring it',async()=>{
 const first=harness();await login(first.client);const h=harness({saved:first.stored()});
 h.fail(TypeError('offline'));await h.client.ready;h.fail(null);
 let release;const held=new Promise(resolve=>{release=resolve;});
 h.handle(async body=>{if(body.action==='auth.signOut')return response({ok:true});await held;return response(h.auth());});
 const pending=h.client.refresh();await new Promise(resolve=>setImmediate(resolve));
 const attempts=h.calls.filter(c=>c.body.action==='auth.refresh').length;
 h.replaceStored(null);release();await pending;
 assert.equal(attempts,2);assert.equal(h.client.getSnapshot().authenticated,false);assert.equal(h.stored(),null);
 assert.equal(h.calls.at(-1).body.action,'auth.signOut');
});

function browserRecovery(){
 const vm=require('node:vm'),events=new Map(),root={navigator:{onLine:true},document:{visibilityState:'visible'},location:{search:'?wf-cloud=local'}};
 const on=(type,fn)=>{if(!events.has(type))events.set(type,[]);events.get(type).push(fn);};
 root.addEventListener=on;root.document.addEventListener=on;
 const context=vm.createContext({window:root,module:{exports:{}},URL,URLSearchParams,setTimeout,clearTimeout,Date});
 vm.runInContext(fs.readFileSync(file,'utf8'),context);
 return {create:context.module.exports.create,root,fire:type=>Promise.all((events.get(type)||[]).map(fn=>fn({type})))};
}

test('returning online or to the page retries a locally linked owner automatically',async t=>{
 const first=harness();await login(first.client);
 for(const event of ['online','focus','pageshow','visibilitychange'])await t.test(event,async()=>{
  const browser=browserRecovery(),h=harness({saved:first.stored(),create:browser.create});
  h.fail(TypeError('offline'));await h.client.ready;h.fail(null);
  await browser.fire(event);
  assert.equal(h.calls.filter(c=>c.body.action==='auth.refresh').length,2);assert.equal(h.client.getSnapshot().authenticated,true);
 });
});

test('automatic linked owner retries wait for a visible online page',async()=>{
 const first=harness();await login(first.client);const browser=browserRecovery(),h=harness({saved:first.stored(),create:browser.create});
 h.fail(TypeError('offline'));await h.client.ready;h.fail(null);
 browser.root.navigator.onLine=false;await browser.fire('focus');assert.equal(h.calls.length,1);
 browser.root.navigator.onLine=true;browser.root.document.visibilityState='hidden';await browser.fire('online');assert.equal(h.calls.length,1);
 browser.root.document.visibilityState='visible';await browser.fire('visibilitychange');assert.equal(h.client.getSnapshot().authenticated,true);
});
