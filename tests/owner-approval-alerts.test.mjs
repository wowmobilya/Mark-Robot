import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {formatPushPayload} from '../supabase/functions/wow-cloud/push-events.mjs';
import pushDevice from '../modules/platform/push/wow-push-device.js';
import {communicationsFixture} from './fixtures/communications.mjs';

test('only verified founders see the applicant or get a scoped owner request push; approval/revocation suppress stale jobs',async t=>{
  const f=await communicationsFixture();t.after(()=>f.db.close());
  for(const name of ['platform-companies','founder-activation','owner-approval-alerts','owner-approval-alerts'])
    await f.db.exec(await readFile(new URL('../supabase/modules/'+name+'.sql',import.meta.url),'utf8'));
  const q=(sql,args)=>f.db.query(sql,args);
  await q('insert into wow_platform_owners(user_id) values($1)',[f.foreign.userId]);
  for(const [actor,workspace,device] of [[f.foreign,f.foreignWorkspace,'admin-approval-'+randomUUID()],[f.customer,f.workspace,randomUUID()]]){
    await q(`insert into wow_push_subscriptions(workspace_id,account_id,session_id,session_version,device_id,endpoint,endpoint_hash,p256dh,auth_key)
      values($1,$2,$3,1,$4,$4,encode(sha256(convert_to($4,'UTF8')),'hex'),repeat('A',87),repeat('B',22))`,
      [workspace,actor.userId,actor.sessionId,device]);
  }
  const applicant=randomUUID();
  await q('insert into auth.users(id,email) values($1,$2)',[applicant,applicant+'@example.test']);
  await q("insert into wow_accounts(id,workspace_id,login_email,username,name,role,status) values($1,$2,$3,'applicant','New owner','owner','suspended')",[applicant,f.workspace,applicant+'@example.test']);
  await q('insert into wow_owner_approval_requests(workspace_id,owner_id) values($1,$2)',[f.workspace,applicant]);
  const list=async(actor,offset=0)=>(await q('select wow_platform_owner_alerts($1,$2,$3) v',[actor.userId,actor.sessionId,offset])).rows[0].v;
  await assert.rejects(list(f.customer),/ACCESS_DENIED/);
  const {total,requests}=await list(f.foreign);assert.equal(total,1);assert.equal(requests[0].workspaceId,f.workspace);
  assert.ok(requests[0].company&&requests[0].applicant&&requests[0].username);
  assert.deepEqual(await list(f.foreign,20),{total:1,requests:[]});
  const jobs=async()=>(await q(`select e.recipient_id,e.workspace_id,wow_notify.payload(e.kind,e.record_id->>'id',e.workspace_id,e.recipient_id) notice
      from wow_push_events e join wow_push_jobs j on j.event_id=e.id where e.kind='owner.approval'`)).rows;
  assert.deepEqual(await jobs(),[{recipient_id:f.foreign.userId,workspace_id:f.foreignWorkspace,notice:{workspaceId:f.workspace}}]);
  const payload=formatPushPayload({id:'event',kind:'owner.approval',details:{workspaceId:f.workspace}},{language:'en',companyName:'PRIVATE COMPANY'});
  assert.equal(payload.title,'WOW Admin');assert.equal(payload.route,'owner-approval');
  assert.deepEqual(pushDevice.create(null).target(payload).params,{workspaceId:f.workspace});
  assert.equal(pushDevice.create(null).target({...payload,params:{workspaceId:'https://example.test'}}),null);
  await q('update wow_platform_owners set active=false where user_id=$1',[f.foreign.userId]);
  await assert.rejects(list(f.foreign),/ACCESS_DENIED/);assert.equal((await jobs())[0].notice,null);
  await q('update wow_platform_owners set active=true where user_id=$1',[f.foreign.userId]);
  await q('update wow_owner_approval_requests set approved_at=now(),approved_by=$1 where workspace_id=$2',[f.foreign.userId,f.workspace]);
  assert.equal((await jobs())[0].notice,null);assert.deepEqual(await list(f.foreign),{total:0,requests:[]});
});
