import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {randomUUID,webcrypto,createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {createProviderTestDatabase} from '../supabase/testing/provider-fixtures.mjs';
const Grant=createRequire(import.meta.url)('../modules/platform/offline/grant.js');

test('the complete repeatable release installs and the production Edge entrypoint dispatches scoped modules and readiness',async(t)=>{
 const release=JSON.parse(await readFile(new URL('../supabase/release.json',import.meta.url),'utf8'));
 const db=await createProviderTestDatabase();t.after(()=>db.close());
 const migrations=await Promise.all(release.migrations.map(async name=>(await readFile(new URL('../supabase/'+name,import.meta.url),'utf8'))
   .replace(/^create extension if not exists pg_net;$/m,'-- local provider pg_net')
   .replace(/^create extension if not exists pg_cron with schema pg_catalog;$/m,'-- local provider Cron')));
 for(const migration of migrations.slice(1))await db.exec(migration);
 for(const migration of migrations)await db.exec(migration);
 const unprotected=await db.query("select ns.nspname,c.relname from pg_class c join pg_namespace ns on ns.oid=c.relnamespace where c.relkind in ('r','p') and not c.relrowsecurity and ((ns.nspname='public' and c.relname like 'wow\\_%' escape '\\') or ns.nspname like 'wow\\_%' escape '\\')");
 assert.deepEqual(unprotected.rows,[],'every application table has RLS enabled');
 const exposed=await db.query("select ns.nspname,p.proname from pg_proc p join pg_namespace ns on ns.oid=p.pronamespace where p.prosecdef and ((ns.nspname='public' and p.proname like 'wow\\_%' escape '\\') or ns.nspname like 'wow\\_%' escape '\\') and (has_function_privilege('anon',p.oid,'execute') or has_function_privilege('authenticated',p.oid,'execute'))");
 assert.deepEqual(exposed.rows,[],'privileged application functions are not browser RPCs');
 const w=randomUUID(),uid=randomUUID(),sid=randomUUID();
 await db.query('insert into public.wow_workspaces(id,name) values($1,$2)',[w,'Full release']);
 await db.query('insert into auth.users(id) values($1)',[uid]);
 await db.query("insert into public.wow_accounts(id,workspace_id,login_email,username,name,role,permissions) values($1,$2,'release@example.test','release','Release','owner','{}')",[uid,w]);
 await db.query('insert into auth.sessions(id,user_id) values($1,$2)',[sid,uid]);
 await db.query('insert into public.wow_sessions(session_id,account_id,session_version) values($1,$2,1)',[sid,uid]);
 const signer=await webcrypto.subtle.generateKey({name:'ECDSA',namedCurve:'P-256'},true,['sign','verify']);
 const signingJwk=await webcrypto.subtle.exportKey('jwk',signer.privateKey),publicJwk={crv:signingJwk.crv,kty:signingJwk.kty,x:signingJwk.x,y:signingJwk.y};
 await db.query('insert into vault.secrets(name,secret) values($1,$2)',['wow_offline_owner_signing_jwk',JSON.stringify(signingJwk)]);
 const originalFetch=globalThis.fetch,originalDeno=globalThis.Deno;let serve,calls=0;
 const ownerProofs=new Set();
 t.after(()=>{globalThis.fetch=originalFetch;if(originalDeno===undefined)delete globalThis.Deno;else globalThis.Deno=originalDeno;});
 const base='https://'+release.projectRef+'.supabase.co';
 const env={SUPABASE_URL:base,SUPABASE_SERVICE_ROLE_KEY:'local-fixture-service',WOW_ALLOWED_ORIGINS:release.productionOrigin};
 globalThis.Deno={env:{get:key=>env[key]},serve:handler=>{serve=handler;}};
 const allowed=new Set(['wow_service','wow_device_session','wow_gallery_service','wow_files_service','wow_chat_service','wow_finance_service','wow_operations_service','wow_assistant_service','wow_customer_auth_service','wow_public_share_service','wow_communications_service']);
 globalThis.fetch=async(url,options)=>{
  calls++;assert.equal(new URL(url).origin,base,'provider fixtures never make an external request');
  const path=new URL(url).pathname;
  if(path==='/auth/v1/user')return Response.json({id:uid,email:'release@example.test',is_anonymous:false});
  if(path==='/auth/v1/admin/generate_link'){
   const body=JSON.parse(options.body);assert.deepEqual(body,{type:'magiclink',email:'release@example.test'});
   assert.equal(options.redirect,'error');const hashed_token=createHash('sha256').update(randomUUID()).digest('hex');ownerProofs.add(hashed_token);
   return Response.json({id:uid,email:'release@example.test',verification_type:'magiclink',hashed_token});
  }
  if(path==='/auth/v1/verify'){
   const body=JSON.parse(options.body);assert.equal(body.type,'email');assert.equal(options.redirect,'error');
   if(!ownerProofs.delete(body.token_hash))return Response.json({message:'Invalid one-time proof'},{status:403});
   const ownerSid=randomUUID();await db.query('insert into auth.sessions(id,user_id) values($1,$2)',[ownerSid,uid]);
   return Response.json({access_token:'header.'+Buffer.from(JSON.stringify({session_id:ownerSid})).toString('base64url')+'.signature',refresh_token:randomUUID(),expires_in:3600});
  }
  const fn=path.split('/').at(-1);
  try{
   if(fn==='wow_operations_health')return Response.json((await db.query('select public.wow_operations_health() v')).rows[0].v);
   if(fn==='wow_offline_owner_signing_key'){
    assert.deepEqual(JSON.parse(options.body),{});assert.equal(options.headers.authorization,'Bearer local-fixture-service');
    return Response.json((await db.query('select public.wow_offline_owner_signing_key() v')).rows[0].v);
   }
   assert(allowed.has(fn),'unexpected provider route '+path);
   const body=JSON.parse(options.body);
   return Response.json((await db.query('select public.'+fn+'($1,$2::jsonb) v',[body.p_action,JSON.stringify(body.p_data)])).rows[0].v);
  }catch(error){return Response.json({code:error.code,message:error.message,details:error.detail},{status:400});}
 };
 await import('../supabase/functions/wow-cloud/index.ts');assert.equal(typeof serve,'function');
 const catalog=await db.query('select permission from public.wow_permission_catalog order by permission');
 assert.deepEqual(catalog.rows.map(row=>row.permission),globalThis.WFAccountPolicy.permissionKeys.slice().sort(),'SQL and application capabilities have one exact catalog');
 const jwt='header.'+Buffer.from(JSON.stringify({session_id:sid})).toString('base64url')+'.signature';
 const call=(action,body={},authenticated=true)=>serve(new Request(base+'/functions/v1/wow-cloud',{method:'POST',headers:{'content-type':'application/json',origin:release.productionOrigin,...(authenticated?{authorization:'Bearer '+jwt}:{})},body:JSON.stringify({action,...body})}));
 assert.equal((await serve(new Request(base+'/functions/v1/wow-cloud/health'))).status,503,'a project without a heartbeat is not ready');
 for(const action of ['gallery.snapshot','chat.rooms','files.list','finance.list','payroll.list','metals.list','assistant.status','operations.snapshot','offline.ownerGrant','customerAuth.snapshot','gallery.share.status','communications.status','auth.ownerActivationLink']){
  const count=calls;assert.equal((await call(action,{},false)).status,401,action);assert.equal(calls,count,'unauthenticated input never reaches provider services');
 }
 for(const [action,body] of [['gallery.snapshot',{}],['chat.init',{}],['files.list',{}],['finance.list',{tab:'boxes'}],['payroll.list',{tab:'resources'}],['metals.list',{tab:'holdings'}],['assistant.status',{}],['operations.check',{}],['customerAuth.snapshot',{}],['gallery.share.status',{}],['communications.status',{}]]){
  const response=await call(action,body),value=await response.json();assert.equal(response.status,200,action+': '+JSON.stringify(value));
  assert.equal(value.ok,true);if(action==='assistant.status')assert.equal(value.provider.configured,false,'absence of provider secrets stays explicit');
 }
 const options=await call('auth.customerOptions',{workspaceId:w},false);
 assert.equal(options.status,200);assert.deepEqual(await options.json(),{ok:true,registrationEnabled:false,recoveryEnabled:false});
 const ownerLinkResponse=await call('auth.ownerActivationLink'),ownerLink=await ownerLinkResponse.json();assert.equal(ownerLinkResponse.status,200);
 const ownerProof=JSON.parse(Buffer.from(new URL(ownerLink.url).hash.slice('#wf-owner-activate='.length),'base64url').toString());
 const ownerActivationResponse=await call('auth.activateOwner',{...ownerProof,installationProof:'a'.repeat(64)},false),ownerActivation=await ownerActivationResponse.json();
 assert.equal(ownerActivationResponse.status,200);assert.equal(ownerActivation.identity.currentAccount.id,uid);assert.equal(ownerActivation.workspaceId,w);
 assert.equal((await call('auth.activateOwner',{...ownerProof,installationProof:'a'.repeat(64)},false)).status,401,'a consumed activation proof cannot open another session');
 const publicResponse=await serve(new Request(base+'/functions/v1/wow-cloud/public-share/'+randomUUID()+'/metadata'));
 assert.equal(publicResponse.status,503,'public publication stays disabled without the verified same-origin route');
 assert.equal((await serve(new Request(base+'/functions/v1/wow-cloud/mail-webhook'))).status,405);
 const unknownWebhook=await serve(new Request(base+'/functions/v1/wow-cloud/mail-webhook',{method:'POST',body:'{}'}));
 assert.notEqual(unknownWebhook.status,200,'an unsigned callback cannot acknowledge email delivery');
 const health=await serve(new Request(base+'/functions/v1/wow-cloud/health'));assert.equal(health.status,200);
 const readiness=await health.json();assert.equal(typeof readiness.turnConfigured,'boolean');assert.deepEqual(readiness.statementChannels,{email:false,whatsapp:false});
 assert.deepEqual(Object.keys(readiness).sort(),['checkedAt','ok','orderSmsConfigured','service','statementChannels','turnConfigured'],'readiness has no workspace or credential data');
 const count=calls;assert.equal((await call('wow_storage_maintenance',{p_action:'claim'})).status,400);assert.equal(calls,count,'private maintenance RPCs are not app actions');
 const devicePair=await webcrypto.subtle.generateKey({name:'ECDSA',namedCurve:'P-256'},false,['sign','verify']);
 const device={privateKey:devicePair.privateKey,publicJwk:await webcrypto.subtle.exportKey('jwk',devicePair.publicKey)};
 const grantConfig={origin:release.productionOrigin,endpoint:base+'/functions/v1/wow-cloud',permissionKeys:globalThis.WFAccountPolicy.permissionKeys,
  pin:createHash('sha256').update(JSON.stringify(publicJwk)).digest('base64url')};
 const who={localOwner:'account_'+'a'.repeat(32),localEpoch:1};
 const proof=await Grant.enrollment(device,grantConfig,who,webcrypto,Date.now);
 const grantResponse=await call('offline.ownerGrant',proof),envelope=await grantResponse.json();
 assert.equal(grantResponse.status,200);assert(!JSON.stringify(envelope).includes(signingJwk.d),'private signer material never leaves Edge');
 await Grant.verify(envelope,grantConfig,device,{...who,user:uid,workspace:w,serverEpoch:1},webcrypto,Date.now);
 const afterGrant=calls;assert.equal((await call('wow_offline_owner_signing_key')).status,400);assert.equal(calls,afterGrant,'private signer lookup is not an app action');
 assert.equal((await serve(new Request(base+'/functions/v1/wow-cloud/health',{method:'POST'}))).status,405);
});
