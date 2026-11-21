import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {webcrypto,randomUUID,createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {createOfflineGrantActions} from '../supabase/functions/wow-cloud/modules/offline-grant.mjs';
import {createRestDependencies} from '../supabase/functions/wow-cloud/rest.mjs';
import {createProviderTestDatabase} from '../supabase/testing/provider-fixtures.mjs';

const require=createRequire(import.meta.url),Grant=require('../modules/platform/offline/grant.js');
const algorithm={name:'ECDSA',namedCurve:'P-256'},origin='https://offline.fixture.invalid',endpoint='https://backend.fixture.invalid/functions/v1/wow-cloud';
const publicPart=jwk=>({crv:jwk.crv,kty:jwk.kty,x:jwk.x,y:jwk.y});
const pin=jwk=>createHash('sha256').update(JSON.stringify(publicPart(jwk))).digest('base64url');
const deferred=()=>{let resolve;const promise=new Promise(done=>{resolve=done;});return {promise,resolve};};
async function signingKey(){const pair=await webcrypto.subtle.generateKey(algorithm,true,['sign','verify']);return webcrypto.subtle.exportKey('jwk',pair.privateKey);}
async function fixture(options={}) {
 const state={now:1760000000000,account:{id:randomUUID(),role:'owner',status:'active',sessionVersion:1,expiresAt:null},revoked:false,snapshots:0};
 const workspace=randomUUID(),actor={userId:state.account.id,sessionId:randomUUID()},who={localOwner:'account_'+'a'.repeat(32),localEpoch:1};
 const pair=await webcrypto.subtle.generateKey(algorithm,false,['sign','verify']);
 const device={privateKey:pair.privateKey,publicJwk:publicPart(await webcrypto.subtle.exportKey('jwk',pair.publicKey))};
 const cfg={origin,endpoint,permissionKeys:['gallery.view','files.view']};
 const actions=createOfflineGrantActions({origins:[origin],endpoint,permissionKeys:cfg.permissionKeys,now:()=>state.now,
  rpc:async action=>{assert.equal(action,'session.snapshot');state.snapshots++;if(state.revoked)throw Object.assign(Error('SESSION_REVOKED'),{code:'SESSION_REVOKED',status:401});return {workspaceId:workspace,identity:{currentAccount:{...state.account}}};},...options});
 const proof=()=>Grant.enrollment(device,cfg,who,webcrypto,()=>state.now);
 const issue=async(body,aud=origin)=>actions['offline.ownerGrant']({actor,body:body||await proof(),request:new Request(endpoint,{headers:{origin:aud}})});
 const verify=(envelope,jwk)=>Grant.verify(envelope,{...cfg,pin:pin(jwk)},device,{...who,user:actor.userId,workspace,serverEpoch:state.account.sessionVersion},webcrypto,()=>state.now);
 return {state,proof,issue,verify};
}

test('Vault fallback issues a pinned device grant without exposing private key material',async()=>{
 const key=await signingKey();let loads=0;
 const f=await fixture({loadSigningKey:async()=>{loads++;return key;}});
 const envelope=await f.issue(),claims=await f.verify(envelope,key);
 assert.equal(loads,1);assert.equal(claims.exp-claims.iat,86400);
 assert.deepEqual(Object.keys(envelope).sort(),['grant','publicKey']);assert(!JSON.stringify(envelope).includes(key.d));
});

test('a supplied environment key wins and malformed nonempty values never fall back to Vault',async()=>{
 const key=await signingKey();let loads=0;
 for(const supplied of [key,JSON.stringify(key)]){
  const f=await fixture({signingKey:supplied,loadSigningKey:async()=>{loads++;throw Error('must not load');}});
  await f.verify(await f.issue(),key);
 }
 for(const supplied of [' ','{','{}',JSON.stringify(publicPart(key))]){
  const f=await fixture({signingKey:supplied,loadSigningKey:async()=>{loads++;return key;}});
  await assert.rejects(f.issue(),{code:'OFFLINE_GRANT_UNCONFIGURED'});
 }
 assert.equal(loads,0);
});

test('origin, owner, session and device failures never invoke the private key loader',async()=>{
 let loads=0;const f=await fixture({loadSigningKey:async()=>{loads++;return signingKey();}}),proof=await f.proof();
 await assert.rejects(f.issue(proof,'https://untrusted.invalid'),{code:'ACCESS_DENIED'});
 f.state.account.role='sales';await assert.rejects(f.issue(proof),{code:'ACCESS_DENIED'});f.state.account.role='owner';
 f.state.revoked=true;await assert.rejects(f.issue(proof),{code:'SESSION_REVOKED'});f.state.revoked=false;
 await assert.rejects(f.issue({...proof,deviceProof:'A'.repeat(86)}),{code:'ACCESS_DENIED'});
 assert.equal(loads,0);
});

test('concurrent loads share one signer and cache hits cannot postpone the sixty-second rotation boundary',async()=>{
 const first=await signingKey(),second=await signingKey(),gate=deferred(),entered=deferred();let loads=0,current=first;
 const f=await fixture({loadSigningKey:async()=>{loads++;entered.resolve();if(loads===1)await gate.promise;return current;}});
 const requests=[f.issue(),f.issue(),f.issue()],settled=Promise.allSettled(requests);
 await Promise.race([entered.promise,settled]);
 if(loads===0){gate.resolve();await settled;assert.fail('the absent environment key must invoke the Vault loader');}
 await new Promise(resolve=>setImmediate(resolve));assert.equal(loads,1);gate.resolve();
 for(const envelope of await Promise.all(requests))await f.verify(envelope,first);
 f.state.now+=30000;await f.verify(await f.issue(),first);
 f.state.now+=29999;await f.verify(await f.issue(),first);assert.equal(loads,1);
 current=second;f.state.now+=1;
 const rotated=await f.issue();assert.equal(loads,2);await f.verify(rotated,second);
 await assert.rejects(f.verify(rotated,first),{code:'OFFLINE_GRANT_INVALID'});
});

test('failed and malformed loads recover without retaining a rejected promise or serving an expired signer',async()=>{
 const first=await signingKey(),second=await signingKey();let result=Error('fixture-private-material-must-not-leak'),loads=0;
 const f=await fixture({loadSigningKey:async()=>{loads++;if(result instanceof Error)throw result;return result;}});
 const rejects=()=>assert.rejects(f.issue(),error=>{assert.equal(error.code,'OFFLINE_GRANT_UNCONFIGURED');assert(!String(error).includes('fixture-private-material'));assert(!JSON.stringify(error).includes('fixture-private-material'));return true;});
 await rejects();result=null;await rejects();result={d:'fixture-private-material-must-not-leak'};await rejects();
 result=first;await f.verify(await f.issue(),first);assert.equal(loads,4);
 f.state.now+=60000;result=Error('fixture-private-material-must-not-leak');await rejects();
 result=second;await f.verify(await f.issue(),second);assert.equal(loads,6);
});

test('revocation during a delayed Vault load prevents issuance from the earlier owner snapshot',async()=>{
 const key=await signingKey(),gate=deferred(),entered=deferred();
 const f=await fixture({loadSigningKey:async()=>{entered.resolve();await gate.promise;return key;}});
 const pending=f.issue(),settled=Promise.allSettled([pending]);await Promise.race([entered.promise,settled]);
 f.state.revoked=true;gate.resolve();await assert.rejects(pending,{code:'SESSION_REVOKED'});
});

test('issuance uses refreshed owner state and the clock after the awaited key load',async()=>{
 const key=await signingKey(),gate=deferred(),entered=deferred();
 const f=await fixture({loadSigningKey:async()=>{entered.resolve();await gate.promise;return key;}});
 const pending=f.issue(),settled=Promise.allSettled([pending]);await Promise.race([entered.promise,settled]);
 f.state.now+=10000;f.state.account.sessionVersion=2;f.state.account.expiresAt=new Date(f.state.now+40000).toISOString();gate.resolve();
 const claims=await f.verify(await pending,key);assert.equal(claims.serverEpoch,2);assert.equal(claims.iat,Math.floor(f.state.now/1000));assert.equal(claims.exp-claims.iat,40);
});

test('the dedicated REST getter uses only the fixed RPC and remains outside module dispatch',async()=>{
 const key=await signingKey(),calls=[];
 const remote=createRestDependencies({url:'https://backend.fixture.invalid',serviceKey:'sb_secret_fixture',fetch:async(url,options)=>{calls.push({url,options});return Response.json(key);}});
 assert.equal(typeof remote.offlineSigningKey,'function');assert.deepEqual(await remote.offlineSigningKey(),key);
 assert.equal(calls[0].url,'https://backend.fixture.invalid/rest/v1/rpc/wow_offline_owner_signing_key');
 assert.equal(calls[0].options.method,'POST');assert.deepEqual(JSON.parse(calls[0].options.body),{});
 assert.equal(calls[0].options.headers.apikey,'sb_secret_fixture');assert.equal(calls[0].options.headers.authorization,undefined);
 assert.throws(()=>remote.moduleRpc('wow_offline_owner_signing_key','read',{}),{code:'SERVER_CONFIGURATION'});assert.equal(calls.length,1);
});

test('release installs a zero-argument invoker getter restricted to the service role and one Vault name',async(t)=>{
 const db=await createProviderTestDatabase();t.after(()=>db.close());
 // These grants mirror the verified provider defaults; the migration must not add them.
 await db.exec('grant usage on schema vault to service_role;grant select on vault.secrets,vault.decrypted_secrets to service_role;');
 const release=JSON.parse(await readFile(new URL('../supabase/release.json',import.meta.url),'utf8'));
 for(const name of release.migrations.filter(name=>name==='modules/offline-owner.sql'))await db.exec(await readFile(new URL('../supabase/'+name,import.meta.url),'utf8'));
 assert.equal((await db.query("select to_regprocedure('public.wow_offline_owner_signing_key()') is not null as installed")).rows[0].installed,true);
 const key=await signingKey();
 await db.query('insert into vault.secrets(name,secret) values($1,$2),($3,$4)',['wow_offline_owner_signing_jwk',JSON.stringify(key),'unrelated_fixture_secret','must-not-be-returned']);
 const properties=(await db.query("select p.prosecdef,p.pronargs,has_function_privilege('anon',p.oid,'execute') as anon,has_function_privilege('authenticated',p.oid,'execute') as authenticated,has_function_privilege('service_role',p.oid,'execute') as service from pg_proc p where p.oid='public.wow_offline_owner_signing_key()'::regprocedure")).rows[0];
 assert.deepEqual(properties,{prosecdef:false,pronargs:0,anon:false,authenticated:false,service:true});
 for(const role of ['anon','authenticated']){
  await db.exec('set role '+role);
  try{await assert.rejects(db.query('select public.wow_offline_owner_signing_key()'),{code:'42501'});}finally{await db.exec('reset role');}
 }
 await db.exec('set role service_role');
 try{assert.deepEqual((await db.query('select public.wow_offline_owner_signing_key() as key')).rows[0].key,key);}finally{await db.exec('reset role');}
 await db.exec('revoke select on vault.decrypted_secrets from service_role;set role service_role;');
 try{await assert.rejects(db.query('select public.wow_offline_owner_signing_key()'),{code:'42501'});}finally{await db.exec('reset role');}
});
