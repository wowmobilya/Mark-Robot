'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {webcrypto,createHash}=require('node:crypto');
const core=require('../accounts-core.js'),policy=require('../accounts-policy.js');
const PASSWORD='Correct horse-2026',START=Date.parse('2026-11-21T10:00:00Z');
const copy=value=>value==null?value:structuredClone(value);
const credential={algorithm:'PBKDF2-HMAC-SHA256',iterations:600000,salt:'00112233445566778899aabbccddeeff',hash:'14b26192bfcf425ce5fde54aec7d04e6e48b850adeddb8433742f0e1b389016e'};
function account(id,role='owner'){
  return {id,name:id,username:id,role,permissions:policy.presets(role),status:'active',department:'',note:'',
    createdAt:new Date(START).toISOString(),updatedAt:new Date(START).toISOString(),lastLoginAt:null,expiresAt:null,deletedAt:null,
    sessionVersion:1,failedAttempts:0,lockedUntil:null,credential:copy(credential)};
}
function tab(initial=null){
  let value=copy(initial);
  const adapter={read:()=>copy(value),write:next=>{value=copy(next);},clear:()=>{value=null;}};
  return {adapter,saved:()=>copy(value),inject:next=>{value=copy(next);}};
}
function harness(initial={schemaVersion:1,revision:1,accounts:[account('owner'),account('worker','carpentry')],audit:[]}){
  let saved=copy(initial),clock=START,readFailure=null,commitFailure=null;
  const read=async()=>{if(readFailure)throw readFailure;return copy(saved);};
  const commit=async(expected,next)=>{if(commitFailure)throw commitFailure;if((saved?.revision||0)!==expected)throw Object.assign(Error('CONFLICT'),{code:'CONFLICT'});saved=copy(next);};
  return {saved:()=>copy(saved),advance:ms=>{clock+=ms;},change:fn=>{fn(saved);saved.revision++;},
    failRead:next=>{readFailure=next;},failCommit:next=>{commitFailure=next;},
    service:(storage,crypto=webcrypto)=>core.createService({read,commit,now:()=>clock,crypto,policy,sessionStore:storage?.adapter})};
}
const login=service=>service.signIn({username:'owner',password:PASSWORD});
const hash=token=>createHash('sha256').update(Buffer.from(token,'hex')).digest('hex');
function cryptoWithDigest(digest){return {getRandomValues:value=>webcrypto.getRandomValues(value),subtle:{
  importKey:(...args)=>webcrypto.subtle.importKey(...args),deriveBits:(...args)=>webcrypto.subtle.deriveBits(...args),digest}};}

test('the authenticated owner remains active through employee idle and maximum session limits',async()=>{
  const h=harness(),owner=h.service();await login(owner);
  h.advance(30*60*1000);assert.equal(owner.getSnapshot().currentAccount?.id,'owner');
  h.advance(9*60*60*1000);assert.equal(await owner.assertPermission('accounts.edit'),true);
  assert.equal(owner.getSnapshot().currentAccount?.role,'owner');
});

test('successful owner setup stores a random capability after its hash is committed and never exposes it publicly',async()=>{
  const h=harness(null),storage=tab();let writes=0;
  const write=storage.adapter.write;
  storage.adapter.write=value=>{writes++;assert(h.saved().accounts[0].ownerResumeHashes.includes(hash(value.capability)));write(value);};
  const owner=h.service(storage),snapshot=await owner.bootstrapOwner({name:'Owner',username:'owner',password:PASSWORD});
  const envelope=storage.saved();assert(envelope,'authenticated owner needs a continuation');
  assert.equal(writes,1);assert.equal(envelope.schemaVersion,1);assert.equal(envelope.accountId,snapshot.currentAccount.id);
  assert.equal(envelope.sessionVersion,1);assert.match(envelope.capability,/^[0-9a-f]{64}$/);
  const serialized=JSON.stringify(snapshot),privateHash=hash(envelope.capability);
  assert(!serialized.includes(envelope.capability));assert(!serialized.includes(privateHash));assert(!serialized.includes('ownerResumeHashes'));
  assert(!JSON.stringify(h.saved()).includes(envelope.capability));assert(!JSON.stringify(h.saved().audit).includes(privateHash));
});

test('only the authenticated owner continuation restores after reload',async()=>{
  const h=harness(),storage=tab(),first=h.service(storage);await login(first);
  assert(storage.saved());h.advance(3*24*60*60*1000);
  const reloaded=h.service(storage);assert.equal(reloaded.getSnapshot().currentAccount,null);
  assert.equal((await reloaded.refresh()).currentAccount?.id,'owner');
  assert.equal(await reloaded.assertPermission('accounts.edit'),true);
  const blank=h.service(tab());assert.equal((await blank.refresh()).currentAccount,null);
});

test('malformed, forged, employee and stale-version continuations never grant access',async()=>{
  const h=harness(),storage=tab();await login(h.service(storage));const valid=storage.saved();assert(valid);
  for(const candidate of [null,{}, {...valid,schemaVersion:2},{...valid,accountId:'worker'},
    {...valid,capability:'0'.repeat(64)},{...valid,sessionVersion:valid.sessionVersion+1},{...valid,capability:PASSWORD}]){
    const other=tab(candidate),service=h.service(other);assert.equal((await service.refresh()).currentAccount,null);
    assert.equal(other.saved(),null);
  }
});

test('worker sign-in discards and revokes the prior owner continuation without owner fallback',async()=>{
  const h=harness(),storage=tab(),service=h.service(storage);await login(service);const old=storage.saved();assert(old);
  await service.signIn({username:'worker',password:PASSWORD});assert.equal(storage.saved(),null);
  assert.equal(service.getSnapshot().currentAccount?.id,'worker');
  assert.equal((await h.service(tab(old)).refresh()).currentAccount,null);
  h.advance(30*60*1000);assert.equal((await service.refresh()).currentAccount,null);
  storage.inject(old);assert.equal((await service.refresh()).currentAccount,null,'a live service never re-runs automatic owner restoration');
});

test('a failed account switch cannot leave an owner continuation behind',async()=>{
  const h=harness(),storage=tab(),service=h.service(storage);await login(service);const old=storage.saved();assert(old);
  await assert.rejects(service.signIn({username:'worker',password:'Incorrect password!'}),{code:'LOGIN_FAILED'});
  assert.equal(storage.saved(),null);assert.equal(service.getSnapshot().currentAccount,null);
  assert.equal((await h.service(tab(old)).refresh()).currentAccount,null);
});

test('explicit logout revokes copied continuation while preserving another owner tab',async()=>{
  const h=harness(),a=tab(),b=tab(),first=h.service(a),second=h.service(b);
  await login(first);await login(second);const old=a.saved(),other=b.saved();assert(old);assert(other);
  await first.signOut();assert.equal(a.saved(),null);assert.equal(first.getSnapshot().currentAccount,null);
  assert.equal((await h.service(tab(old)).refresh()).currentAccount,null);
  assert.equal((await h.service(tab(other)).refresh()).currentAccount?.id,'owner');
});

test('independent owner tabs have bounded continuations and evict the oldest only',async()=>{
  const h=harness(),saved=[];
  for(let i=0;i<9;i++){const storage=tab();await login(h.service(storage));saved.push(storage.saved());}
  assert(saved.every(Boolean));assert.equal(new Set(saved.map(row=>row.capability)).size,9);
  assert.equal(h.saved().accounts[0].ownerResumeHashes.length,8);
  assert.equal((await h.service(tab(saved[0])).refresh()).currentAccount,null);
  assert.equal((await h.service(tab(saved[1])).refresh()).currentAccount?.id,'owner');
  assert.equal((await h.service(tab(saved[8])).refresh()).currentAccount?.id,'owner');
});

test('reauthenticating an existing owner tab at capacity preserves the other seven tabs',async()=>{
  const h=harness(),tabs=[];
  for(let i=0;i<8;i++){const storage=tab(),service=h.service(storage);await login(service);tabs.push({storage,service});}
  const oldest=tabs[0].storage.saved();await login(tabs[7].service);
  assert.equal(h.saved().accounts[0].ownerResumeHashes.length,8);
  assert.equal((await h.service(tab(oldest)).refresh()).currentAccount?.id,'owner');
});

test('owner inactivity exemption does not weaken expiry, status, role or session-version checks',async()=>{
  for(const change of [row=>{row.expiresAt=new Date(START+1000).toISOString();},row=>{row.status='suspended';},
    row=>{row.role='manager';row.sessionVersion++;},row=>{row.sessionVersion++;}]){
    const h=harness(),storage=tab(),owner=h.service(storage);await login(owner);const old=storage.saved();assert(old);
    h.change(state=>change(state.accounts[0]));h.advance(1000);
    assert.equal((await owner.refresh()).currentAccount,null);assert.equal(storage.saved(),null);
    assert.equal((await h.service(tab(old)).refresh()).currentAccount,null);
  }
});

test('owner password change refreshes this tab continuation and invalidates all earlier ones',async()=>{
  const h=harness(),a=tab(),b=tab(),owner=h.service(a);await login(owner);await login(h.service(b));
  const first=a.saved(),other=b.saved();assert(first);assert(other);
  await owner.changePassword(PASSWORD,'New correct horse-2026');const current=a.saved();assert(current);
  assert.notEqual(current.capability,first.capability);assert.equal(current.sessionVersion,first.sessionVersion+1);
  assert.equal(owner.getSnapshot().currentAccount?.id,'owner');
  assert.equal((await h.service(tab(current)).refresh()).currentAccount?.id,'owner');
  assert.equal((await h.service(tab(first)).refresh()).currentAccount,null);
  assert.equal((await h.service(tab(other)).refresh()).currentAccount,null);
});

test('explicit session revocation invalidates remembered owner sessions',async()=>{
  const h=harness(),storage=tab(),owner=h.service(storage);await login(owner);const old=storage.saved();assert(old);
  await owner.revokeSessions('owner');assert.equal(owner.getSnapshot().currentAccount,null);assert.equal(storage.saved(),null);
  assert.equal((await h.service(tab(old)).refresh()).currentAccount,null);
});

test('identity storage and validation failures clear owner continuation without reopening access',async()=>{
  for(const mode of ['read','invalid']){
    const h=harness(),storage=tab(),owner=h.service(storage);await login(owner);assert(storage.saved());
    if(mode==='read')h.failRead(Error('unavailable'));else h.change(state=>{state.accounts[0].ownerResumeHashes=['bad hash'];});
    await assert.rejects(owner.refresh(),{code:mode==='read'?'STORAGE_ERROR':'IDENTITY_STATE_INVALID'});
    assert.equal(owner.getSnapshot().currentAccount,null);assert.equal(storage.saved(),null);
  }
});

test('optional continuation state rejects excess, duplicate and malformed hashes',async()=>{
  for(const hashes of ['not-array',[null],['x'],Array(9).fill('1'.repeat(64)),['2'.repeat(64),'2'.repeat(64)]]){
    const h=harness();h.change(state=>{state.accounts[0].ownerResumeHashes=hashes;});
    await assert.rejects(h.service().refresh(),{code:'IDENTITY_STATE_INVALID'});
  }
});

test('session storage read or write failures leave password-authenticated access memory-only',async()=>{
  for(const method of ['read','write']){
    const h=harness(),storage=tab();storage.adapter[method]=()=>{throw Error('session storage unavailable');};
    const owner=h.service(storage);await login(owner);assert.equal(owner.getSnapshot().currentAccount?.id,'owner');
    assert.equal(storage.saved(),null);assert.equal((await h.service(tab()).refresh()).currentAccount,null);
  }
});

test('logout still revokes the capability when clearing session storage throws',async()=>{
  const h=harness(),storage=tab(),owner=h.service(storage);await login(owner);const old=storage.saved();assert(old);
  storage.adapter.clear=()=>{throw Error('cannot clear');};await owner.signOut();
  assert.equal(owner.getSnapshot().currentAccount,null);
  assert.equal((await h.service(tab(old)).refresh()).currentAccount,null);
});

test('logout during asynchronous continuation verification wins over restore',async()=>{
  const h=harness(),storage=tab();await login(h.service(storage));assert(storage.saved());
  let release,entered;const ready=new Promise(resolve=>{entered=resolve;}),hold=new Promise(resolve=>{release=resolve;});let first=true;
  const crypto=cryptoWithDigest(async(...args)=>{if(first){first=false;entered();await hold;}return webcrypto.subtle.digest(...args);});
  const restored=h.service(storage,crypto),refresh=restored.refresh();await ready;
  const logout=restored.signOut();release();await refresh;await logout;
  assert.equal(restored.getSnapshot().currentAccount,null);assert.equal(storage.saved(),null);
});

test('a concurrent owner revocation during continuation verification cannot restore stale privilege',async()=>{
  const h=harness(),storage=tab();await login(h.service(storage));assert(storage.saved());
  let release,entered;const ready=new Promise(resolve=>{entered=resolve;}),hold=new Promise(resolve=>{release=resolve;});let first=true;
  const crypto=cryptoWithDigest(async(...args)=>{if(first){first=false;entered();await hold;}return webcrypto.subtle.digest(...args);});
  const restored=h.service(storage,crypto),refresh=restored.refresh();await ready;
  h.change(state=>{state.accounts[0].sessionVersion++;});release();
  assert.equal((await refresh).currentAccount,null);assert.equal(storage.saved(),null);
});

test('logout during new continuation creation cannot write a cancelled owner session',async()=>{
  const h=harness(),storage=tab();
  let release,entered;const ready=new Promise(resolve=>{entered=resolve;}),hold=new Promise(resolve=>{release=resolve;});
  const crypto=cryptoWithDigest(async(...args)=>{entered();await hold;return webcrypto.subtle.digest(...args);});
  const service=h.service(storage,crypto),pending=login(service);await ready;
  const logout=service.signOut();release();await assert.rejects(pending,{code:'AUTH_REQUIRED'});await logout;
  assert.equal(service.getSnapshot().currentAccount,null);assert.equal(storage.saved(),null);
  assert.equal(h.saved().accounts[0].ownerResumeHashes,undefined);
});

test('failed identity commit cannot issue a usable owner continuation',async()=>{
  const h=harness(),storage=tab();h.failCommit(Error('disk unavailable'));const owner=h.service(storage);
  await assert.rejects(login(owner),{code:'STORAGE_ERROR'});assert.equal(storage.saved(),null);
  assert.equal(owner.getSnapshot().currentAccount,null);assert.equal(h.saved().accounts[0].ownerResumeHashes,undefined);
});
