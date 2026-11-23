import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {createAnnouncementActions} from '../supabase/functions/wow-cloud/modules/platform-announcements.mjs';
import {formatPushPayload} from '../supabase/functions/wow-cloud/push-events.mjs';
import {communicationsFixture} from './fixtures/communications.mjs';

const device=createRequire(import.meta.url)('../modules/platform/push/wow-push-device.js');

test('founder announcements confirm recipients, persist tenant inboxes and queue private, revocable push',async t=>{
  const f=await communicationsFixture();t.after(()=>f.db.close());
  for(const name of ['platform-companies','platform-announcements','platform-announcements']){
    await f.db.exec(await readFile(new URL('../supabase/modules/'+name+'.sql',import.meta.url),'utf8'));
  }
  await f.db.query('insert into public.wow_platform_owners(user_id) values($1)',[f.foreign.userId]);
  for(const deviceId of [randomUUID(),'admin-approval-'+randomUUID()]){
    await f.db.query("insert into public.wow_push_subscriptions(workspace_id,account_id,session_id,session_version,device_id,endpoint,endpoint_hash,p256dh,auth_key) values($1,$2,$3,1,$4,$4,encode(sha256(convert_to($4,'UTF8')),'hex'),repeat('A',87),repeat('B',22))",
      [f.workspace,f.owner.userId,f.owner.sessionId,deviceId]);
  }
  const announcementRpc=async(actor,action,data)=>(await f.db.query('select public.wow_announcement_service($1,$2,$3,$4) as result',
    [actor.userId,actor.sessionId,action,JSON.stringify(data)])).rows[0].result;
  const actions=createAnnouncementActions({announcementRpc});
  const call=async(action,body={},actor=f.foreign)=>actions[action]({body,actor});
  const draft={title:'Private title',text:'Private details\nSecond line',category:'maintenance',push:true,workspaceId:f.workspace,requestId:randomUUID()};
  await assert.rejects(call('platform.announcement.preview',draft,f.owner),/ACCESS_DENIED/);
  await assert.rejects(call('platform.announcement.send',{...draft,confirmation:'x'}),/INVALID_CONFIRMATION/);
  const preview=await call('platform.announcement.preview',draft);
  assert.equal(preview.recipients,4);
  const added=await f.member(f.workspace,'custom',[]);
  const firstConfirmation={...draft,confirmation:preview.confirmation};
  await assert.rejects(call('platform.announcement.send',firstConfirmation),/INVALID_CONFIRMATION/);
  const reviewed=await call('platform.announcement.preview',draft);
  assert.equal(reviewed.recipients,5);
  const confirmed={...draft,confirmation:reviewed.confirmation};
  await assert.rejects(call('platform.announcement.send',{...confirmed,text:'Changed'}),/INVALID_CONFIRMATION/);
  const sent=await call('platform.announcement.send',confirmed);
  assert.deepEqual(sent,{id:sent.id,recipients:5,pushJobs:1,replayed:false});
  assert.deepEqual(await call('platform.announcement.send',confirmed),{...sent,replayed:true});
  await assert.rejects(call('platform.announcement.send',{...confirmed,title:'Changed'}),/IDEMPOTENCY_MISMATCH/);
  assert.equal((await call('announcement.inbox',{},f.foreign)).unread,0);
  await assert.rejects(call('announcement.read',{id:sent.id},f.foreign),/ACCESS_DENIED/);
  const inbox=await call('announcement.inbox',{},added);
  assert.equal(inbox.unread,1);
  assert.equal(inbox.announcements[0].body,draft.text);
  const delivery=async()=> (await f.db.query("select e.id,e.details,wow_notify.payload(e.kind,e.record_id->>'id',e.workspace_id,e.recipient_id) notice from public.wow_push_events e join public.wow_push_jobs j on j.event_id=e.id where e.kind='platform.announcement'")).rows;
  const [push]=await delivery();
  assert.equal((await delivery()).length,1);
  assert.deepEqual(push.details,{});
  assert.deepEqual(push.notice,{route:'notifications'});
  for(const language of ['ar','en','tr','fr','ru']){
    const payload=formatPushPayload({id:push.id,kind:'platform.announcement',details:push.notice},{language,companyName:'Private company'});
    assert.doesNotMatch(JSON.stringify(payload),/Private/);
    assert.equal(device.create(null).target(payload).route,'notifications');
  }
  await call('announcement.read',{id:sent.id},f.owner);
  assert.equal((await call('announcement.inbox',{},f.owner)).unread,0);
  assert.equal((await call('announcement.inbox',{},added)).unread,1);
  assert.equal((await delivery())[0].notice,null);
  const [{access}]=(await f.db.query("select has_function_privilege('authenticated','public.wow_announcement_service(uuid,uuid,text,jsonb)','execute') as access")).rows;
  assert.equal(access,false);
});
