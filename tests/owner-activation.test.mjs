import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {createRequire} from 'node:module';
import {createProviderTestDatabase} from '../supabase/testing/provider-fixtures.mjs';
import {createHandler,sha256} from '../supabase/functions/wow-cloud/core.mjs';
import {createRestDependencies} from '../supabase/functions/wow-cloud/rest.mjs';
import {createOwnerActivationActions} from '../supabase/functions/wow-cloud/modules/owner-activation.mjs';
const require=createRequire(import.meta.url),policy=require('../accounts-policy.js');
const origin='https://owner-activation.example',project='https://owner-provider.example';
const jwt=id=>'fixture.'+Buffer.from(JSON.stringify({session_id:id})).toString('base64url')+'.fixture';

async function application(db){
  for(const name of ['platform-companies','account-installations'])await db.exec(await readFile(new URL('../supabase/modules/'+name+'.sql',import.meta.url),'utf8'));
  const deviceProof='a'.repeat(64);
  const workspaceId=randomUUID(),otherWorkspace=randomUUID(),ownerId=randomUUID(),workerId=randomUUID();
  await db.query("insert into public.wow_workspaces(id,name) values($1,'Owner activation'),($2,'Other workspace')",[workspaceId,otherWorkspace]);
  for(const [id,role]of [[ownerId,'owner'],[workerId,'sales']]){
    await db.query('insert into auth.users(id,email,email_confirmed_at) values($1,$2,now())',[id,id+'@wow.invalid']);
    await db.query("insert into public.wow_accounts(id,workspace_id,login_email,username,name,role,permissions) values($1,$2,$3,$4,$4,$5,array['products.view'])",[id,workspaceId,id+'@wow.invalid',role,role]);
  }
  const sessions=new Map(),proofs=new Map(),generated=[],revoked=[];
  let clock=Date.parse('2026-11-21T20:00:00Z'),wrongProviderUser=false;
  async function session(userId){
    const sid=randomUUID(),token=jwt(sid);sessions.set(token,{userId,sessionId:sid});
    await db.query('insert into auth.sessions(id,user_id) values($1,$2)',[sid,userId]);
    return {access_token:token,refresh_token:randomUUID(),expires_in:3600,user:{id:userId}};
  }
  const remote=createRestDependencies({url:project,serviceKey:'sb_secret_owner_fixture',fetch:async(raw,options)=>{
    const url=new URL(raw),body=options.body?JSON.parse(options.body):{};
    assert.equal(options.headers.apikey,'sb_secret_owner_fixture');
    try{
      if(url.pathname==='/rest/v1/rpc/wow_device_session')return Response.json((await db.query('select public.wow_device_session($1,$2::jsonb) result',[body.p_action,JSON.stringify(body.p_data)])).rows[0].result);
      if(url.pathname==='/rest/v1/rpc/wow_service')return Response.json((await db.query('select public.wow_service($1,$2::jsonb) result',[body.p_action,JSON.stringify(body.p_data)])).rows[0].result);
      if(url.pathname==='/auth/v1/admin/generate_link'){
        assert.equal(options.headers.authorization,undefined);assert.equal(options.redirect,'error');
        assert.deepEqual(Object.keys(body).sort(),['email','type']);assert.equal(body.type,'magiclink');
        let user=(await db.query('select id,email from auth.users where email=$1',[body.email])).rows[0];
        if(!user){user={id:randomUUID(),email:body.email};await db.query('insert into auth.users(id,email) values($1,$2)',[user.id,user.email]);}
        const tokenHash=await sha256(randomUUID());proofs.set(tokenHash,{userId:user.id,expiresAt:clock+60000,used:false});generated.push({userId:user.id,tokenHash});
        return Response.json({id:wrongProviderUser?workerId:user.id,email:user.email,hashed_token:tokenHash,verification_type:'magiclink',action_link:'https://provider.example/private',email_otp:'123456'});
      }
      if(url.pathname==='/auth/v1/verify'){
        assert.equal(options.redirect,'error');assert.deepEqual(Object.keys(body).sort(),['token_hash','type']);assert.equal(body.type,'email');
        const proof=proofs.get(body.token_hash);
        if(!proof||proof.used||proof.expiresAt<=clock)return Response.json({message:'Expired or used proof'},{status:403});
        proof.used=true;return Response.json(await session(proof.userId));
      }
      const access=options.headers.authorization?.replace(/^Bearer /,''),active=sessions.get(access);
      if(url.pathname==='/auth/v1/user'){
        if(!active)return Response.json({message:'Invalid session'},{status:401});
        return Response.json((await db.query('select * from auth.users where id=$1',[active.userId])).rows[0]);
      }
      if(url.pathname==='/auth/v1/logout'){
        assert.equal(url.searchParams.get('scope'),'local');assert(active);revoked.push(active);
        await db.query('delete from auth.sessions where id=$1',[active.sessionId]);sessions.delete(access);return new Response(null,{status:204});
      }
      assert.fail(url.pathname);
    }catch(error){if(error.code==='P0001')return Response.json({code:error.code,message:error.message},{status:400});throw error;}
  }});
  const ownerSession=await session(ownerId),workerSession=await session(workerId);
  for(const value of [ownerSession,workerSession]){
    const actor=sessions.get(value.access_token);await remote.deviceSession('session.open',{...actor,installationHash:await sha256(actor.userId+':'+deviceProof)});
  }
  const activation=createOwnerActivationActions({...remote,origins:[origin],productionOrigin:origin});
  const handler=createHandler({...remote,policy,origins:[origin],moduleActions:activation.actions,publicActions:activation.publicActions});
  async function api(action,payload={},access,requestOrigin=origin){
    const response=await handler(new Request(project+'/functions/v1/wow-cloud',{method:'POST',headers:{Origin:requestOrigin,'content-type':'application/json',...(access?{Authorization:'Bearer '+access}:{})},body:JSON.stringify({action,...action==='auth.activateOwner'?{installationProof:deviceProof}:{},...payload})}));
    return {status:response.status,...await response.json()};
  }
  async function link(){const result=await api('auth.ownerActivationLink',{},ownerSession.access_token);assert.equal(result.status,200);return result;}
  const decode=url=>JSON.parse(Buffer.from(new URL(url).hash.slice('#wf-owner-activate='.length),'base64url').toString());
  return {workspaceId,otherWorkspace,ownerId,workerId,ownerSession,workerSession,api,link,decode,proofs,generated,revoked,sessions,
    advance:ms=>{clock+=ms;},wrongProviderUser:()=>{wrongProviderUser=true;}};
}

test('only a verified active owner can generate a self-bound private activation link',async()=>{
  const db=await createProviderTestDatabase();try{
    const app=await application(db);
    assert.equal((await app.api('auth.ownerActivationLink')).status,401);
    assert.equal((await app.api('auth.ownerActivationLink',{},app.workerSession.access_token)).status,403);
    for(const field of ['email','userId','workspaceId','redirectTo'])assert.equal((await app.api('auth.ownerActivationLink',{[field]:'injected'},app.ownerSession.access_token)).status,422);
    assert.equal(app.generated.length,0);
    const link=await app.link(),url=new URL(link.url),proof=app.decode(link.url);
    assert.equal(url.origin,origin);assert.equal(url.pathname,'/');assert.equal(url.searchParams.get('wf-cloud'),'owner');assert.equal(url.searchParams.get('workspace'),app.workspaceId);
    assert.deepEqual(Object.keys(proof).sort(),['tokenHash','userId','workspaceId']);assert.equal(proof.userId,app.ownerId);assert.equal(proof.workspaceId,app.workspaceId);
    assert(!JSON.stringify(link).includes('refresh_token'));assert(!JSON.stringify(link).includes('email_otp'));assert(!JSON.stringify(link).includes('@wow.invalid'));
    await db.query('update auth.users set email=$1 where id=$2',['changed@wow.invalid',app.ownerId]);
    assert.equal((await app.api('auth.ownerActivationLink',{},app.ownerSession.access_token)).status,503);
    assert.equal(app.generated.length,1,'a stale app email must not ask the provider to create a new identity');
    assert.equal((await db.query('select count(*)::int n from auth.users')).rows[0].n,2);
    await db.query('update auth.users set email=$1 where id=$2',[app.ownerId+'@wow.invalid',app.ownerId]);
    app.wrongProviderUser();assert.equal((await app.api('auth.ownerActivationLink',{},app.ownerSession.access_token)).status,503);
  }finally{await db.close();}
});

test('one-time owner proof opens a real app session and replay or expiry returns no credentials',async()=>{
  const db=await createProviderTestDatabase();try{
    const app=await application(db),proof=app.decode((await app.link()).url);
    const result=await app.api('auth.activateOwner',proof);assert.equal(result.status,200);assert.equal(result.workspaceId,app.workspaceId);assert.equal(result.identity.currentAccount.id,app.ownerId);assert.equal(result.identity.currentAccount.role,'owner');
    assert.equal((await app.api('session.snapshot',{},result.session.access_token)).status,200);
    const replay=await app.api('auth.activateOwner',proof);assert.equal(replay.status,401);assert.equal(replay.session,undefined);
    const expired=app.decode((await app.link()).url);app.advance(60001);assert.equal((await app.api('auth.activateOwner',expired)).status,401);
    assert.equal(app.revoked.length,0);assert.equal((await app.api('session.snapshot',{},app.ownerSession.access_token)).status,200);
  }finally{await db.close();}
});

test('activation rejects wrong user, wrong workspace and a non-owner, closing only its new session',async()=>{
  const db=await createProviderTestDatabase();try{
    const app=await application(db);
    for(const variant of ['user','workspace','role']){
      const proof=app.decode((await app.link()).url);
      if(variant==='user')proof.userId=app.workerId;
      if(variant==='workspace')proof.workspaceId=app.otherWorkspace;
      if(variant==='role'){app.proofs.get(proof.tokenHash).userId=app.workerId;proof.userId=app.workerId;}
      const before=app.revoked.length,result=await app.api('auth.activateOwner',proof);
      assert.equal(result.status,401);assert.equal(result.session,undefined);assert.equal(app.revoked.length,before+1);
      assert.equal((await app.api('session.snapshot',{},app.ownerSession.access_token)).status,200);
      assert.equal((await app.api('session.snapshot',{},app.workerSession.access_token)).status,200);
      const active=(await db.query('select count(*)::int n from public.wow_sessions where closed_at is null')).rows[0].n;assert.equal(active,2);
    }
  }finally{await db.close();}
});

test('activation rejects missing origin and malformed or substituted proof fields before provider exchange',async()=>{
  const db=await createProviderTestDatabase();try{
    const app=await application(db),proof=app.decode((await app.link()).url);
    assert.equal((await app.api('auth.activateOwner',proof,null,'')).status,403);
    assert.equal((await app.api('auth.activateOwner',{...proof,tokenHash:'short'})).status,401);
    assert.equal((await app.api('auth.activateOwner',{...proof,workspaceId:'not-a-uuid'})).status,401);
    assert.equal((await app.api('auth.activateOwner',{...proof,refreshToken:'credential'})).status,401);
    assert.equal(app.proofs.get(proof.tokenHash).used,false);assert.equal(app.sessions.size,2);
  }finally{await db.close();}
});
