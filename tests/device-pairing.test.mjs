import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID,randomBytes,createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {createProviderTestDatabase} from '../supabase/testing/provider-fixtures.mjs';
import {createCompanyJoin} from '../supabase/functions/wow-cloud/modules/company-join.mjs';

test('one scan creates an independent scoped device session for staff or owner',async t=>{
 const db=await createProviderTestDatabase();t.after(()=>db.close());
 const file=path=>readFile(new URL('../supabase/'+path,import.meta.url),'utf8');
 for(const path of JSON.parse(await file('release.json')).migrations.slice(1))await db.exec(await file(path));
 const workspace=randomUUID(),other=randomUUID(),origin='https://company.test',request=new Request(origin,{headers:{origin}});
 for(const id of [workspace,other])await db.query('insert into wow_workspaces(id,name) values($1::uuid,$1::uuid::text)',[id]);
 async function addAccount(wid,role){
  const userId=randomUUID(),sessionId=randomUUID(),email=userId+'@wow.invalid';
  await db.query('insert into auth.users(id,email) values($1,$2)',[userId,email]);
  await db.query('insert into auth.sessions(id,user_id) values($1,$2)',[sessionId,userId]);
  await db.query('insert into wow_accounts(id,workspace_id,login_email,username,name,role) values($1,$2,$3,$4,$4,$5)',[userId,wid,email,userId.slice(0,8),role]);
  await device('session.open',{userId,sessionId,installationHash:'1'.repeat(64)});
  return {userId,sessionId};
 }
 const rpc=async(name,op,data)=>(await db.query('select public.'+name+'($1,$2::jsonb) as result',[op,JSON.stringify(data)])).rows[0].result;
 const device=(op,data)=>rpc('wow_device_session',op,data);
 const owner=await addAccount(workspace,'owner'),worker=await addAccount(workspace,'sales'),foreign=await addAccount(other,'owner');
 const auth={generateLink:async email=>({id:email.split('@')[0],email,verification_type:'magiclink',hashed_token:email}),
  verifyOtp:async email=>({access_token:email}),getUser:async email=>({id:email.split('@')[0]}),signOut:async()=>{}};
 const svc=createCompanyJoin({moduleRpc:rpc,auth,origins:[origin]});
 const issue=async(actor,target)=>svc.actions['device.issuePairing']({body:{accountId:target.userId},actor,request});
 await assert.rejects(issue(worker,worker),/ACCESS_DENIED/);await assert.rejects(issue(owner,foreign),/ACCESS_DENIED/);
 for(const target of [worker,owner]){
  const {url}=await issue(owner,target);
  const proof=JSON.parse(Buffer.from(new URL(url).hash.slice('#wf-device-pair='.length),'base64url'));
  const installationProof=randomBytes(32).toString('hex'),installationHash=createHash('sha256').update(target.userId+':'+installationProof).digest('hex');
  const actor={userId:target.userId,sessionId:randomUUID(),installationHash};
  await db.query('insert into auth.sessions(id,user_id) values($1,$2)',[actor.sessionId,actor.userId]);
  const redeem=()=>svc.publicActions['auth.devicePair']({request,body:proof,installationProof,authenticate:async(_,pairingDigest)=>device('session.open',{...actor,pairingDigest})});
  const result=await redeem();assert.equal(result.identity.currentAccount.id,target.userId);
  await assert.rejects(redeem(),/ACCESS_DENIED/);
  await device('session.snapshot',actor);
  await device('session.snapshot',{...target,installationHash:'1'.repeat(64)});
  await assert.rejects(device('session.snapshot',{...actor,installationHash:'2'.repeat(64)}),/DEVICE_ALREADY_BOUND/);
 }
 assert.equal(Number((await db.query('select wow_limits.devices_used($1) n',[workspace])).rows[0].n),3);
});
