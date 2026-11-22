import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {randomUUID,randomBytes} from 'node:crypto';
import {createProviderTestDatabase} from '../supabase/testing/provider-fixtures.mjs';
test('binding belongs to the first installation, release and block are separately authorized',async t=>{
  const db=await createProviderTestDatabase();t.after(()=>db.close());
  for(const name of ['platform-companies','account-installations'])await db.exec(await readFile(new URL('../supabase/modules/'+name+'.sql',import.meta.url),'utf8'));
  const workspace=randomUUID(),other=randomUUID();
  for(const wid of [workspace,other])await db.query("insert into public.wow_workspaces(id,name) values($1,'Fixture')",[wid]);
  async function account(wid,role){
    const id=randomUUID(),sid=randomUUID();
    await db.query('insert into auth.users(id) values($1)',[id]);await db.query('insert into auth.sessions(id,user_id) values($1,$2)',[sid,id]);
    await db.query('insert into public.wow_accounts(id,workspace_id,login_email,username,name,role) values($1,$2,$3,$4,$4,$5)',[id,wid,id+'@example.invalid',id.slice(0,8),role]);
    return {userId:id,sessionId:sid};
  }
  const owner=await account(workspace,'owner'),staff=await account(workspace,'sales'),foreign=await account(other,'owner'),founder=await account(other,'owner');
  await db.query('insert into public.wow_platform_owners(user_id) values($1)',[founder.userId]);
  const a=randomBytes(32).toString('hex'),b=randomBytes(32).toString('hex');
  const session=async(user,proof,op='session.open')=>(await db.query('select public.wow_device_session($1,$2) result',[op,{...user,installationHash:proof}])).rows[0].result;
  const manage=async(user,op,target,opts={})=>(await db.query('select public.wow_manage_devices($1,$2,$3,$4) result',[user.userId,user.sessionId,op,{workspaceId:workspace,accountId:target?.userId,confirmed:true,...opts}])).rows[0].result;
  async function fresh(user){const sessionId=randomUUID();await db.query('insert into auth.sessions(id,user_id) values($1,$2)',[sessionId,user.userId]);return {...user,sessionId};}
  await session(founder,null);await session(owner,a);await session(foreign,a);await session(staff,a);
  const second=await fresh(staff);
  await assert.rejects(session(second,b),/DEVICE_ALREADY_BOUND/);
  await session(staff,a,'session.snapshot');await assert.rejects(session(staff,b,'session.snapshot'),/DEVICE_ALREADY_BOUND/);
  await assert.rejects(manage(foreign,'accounts.releaseDevice',staff),/ACCESS_DENIED/);
  await assert.rejects(manage(staff,'accounts.releaseDevice',owner),/ACCESS_DENIED/);
  await assert.rejects(manage(owner,'accounts.releaseDevice',owner),/ACCESS_DENIED/);
  await assert.rejects(manage(owner,'company.releaseDevice',staff),/ACCESS_DENIED/);
  const view=await manage(owner,'accounts.devices',staff);assert.equal(view.total,1);assert(!JSON.stringify(view).includes(a));assert(!JSON.stringify(view).includes('digest'));
  await assert.rejects(manage(owner,'accounts.releaseDevice',staff,{expectedBoundAt:'2000-01-01T00:00:00Z'}),/CONFLICT/);
  assert.equal((await manage(owner,'accounts.deviceStatus',staff,{blocked:true})).blocked,true);
  await assert.rejects(session(second,a),/DEVICE_BLOCKED/);await assert.rejects(manage(owner,'accounts.releaseDevice',staff),/DEVICE_BLOCKED/);
  await manage(owner,'accounts.deviceStatus',staff,{blocked:false});
  await assert.rejects(session(staff,a,'session.snapshot'),/SESSION_REVOKED/);
  await assert.rejects(session(second,b),/DEVICE_ALREADY_BOUND/);
  await manage(owner,'accounts.releaseDevice',staff);await session(second,b);
  assert.equal((await manage(founder,'company.devices',null)).total,2);
  await manage(founder,'company.releaseDevice',owner);
  await assert.rejects(session(owner,a,'session.snapshot'),/SESSION_REVOKED/);
  await session(await fresh(owner),b);
  assert.equal((await db.query("select has_function_privilege('authenticated','public.wow_device_session(text,jsonb)','execute') allowed")).rows[0].allowed,false);
});

