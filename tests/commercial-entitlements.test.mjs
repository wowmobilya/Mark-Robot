import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {createProviderTestDatabase} from '../supabase/testing/provider-fixtures.mjs';

const file=name=>readFile(new URL('../supabase/modules/'+name+'.sql',import.meta.url),'utf8');
const templateIds=['a0e8f0db-7cf8-4d2a-a230-10f4ddc44a01',
 'a0e8f0db-7cf8-4d2a-a230-10f4ddc44a02','a0e8f0db-7cf8-4d2a-a230-10f4ddc44a03'];
test('commercial plans exempt one owner device, meter monthly calls and apply the $10/$20 addons only on explicit founder writes',async t=>{
 const db=await createProviderTestDatabase();t.after(()=>db.close());
 for(const item of ['files','chat','gallery','platform-companies','tenant-limits','tenant-seats','account-installations','voice-calls'])await db.exec(await file(item));
 const founder=randomUUID(),founderSession=randomUUID(),company=randomUUID(),other=randomUUID(),owner=randomUUID();
 await db.query("insert into auth.users(id) values($1),($2)",[founder,owner]);
 await db.query("insert into auth.sessions(id,user_id) values($1,$2),($3,$4)",[founderSession,founder,randomUUID(),owner]);
 await db.query('insert into wow_workspaces(id,name) values($1,$2),($3,$4)',[company,'WOW Studio',other,'Other tenant']);
 await db.query("insert into wow_accounts(id,workspace_id,login_email,username,name,role) values($1,$2,'founder@fixture.invalid','founder','Founder','owner'),($3,$4,'owner@fixture.invalid','owner','Owner','owner')",
  [founder,other,owner,company]);
 await db.query('insert into wow_sessions(session_id,account_id,session_version) values($1,$2,1)',[founderSession,founder]);
 await db.query('insert into wow_platform_owners(user_id) values($1)',[founder]);
 for(const [i,id] of templateIds.entries()){
  await db.query("insert into wow_limits.plans(id,name,device_limit,storage_bytes,price,currency,duration_days,updated_by) values($1,$2,2,2000000000,$3,'USD',$4,$5)",
    [id,['WOW Monthly','WOW Annual','WOW Two Years'][i],[100,1000,1800][i],[30,365,730][i],founder]);
 }
 await db.exec(await file('commercial-entitlements'));
 const profile=(await db.query("select wow_limits.commercial_usage($1) value",[company])).rows[0].value;
 assert.equal(profile.available,false);
 await db.query("insert into wow_limits.subscriptions(workspace_id,plan_id,expires_at) values($1,$2,now()+interval '30 days')",[company,templateIds[0]]);
 const get=async(wid=company)=> (await db.query('select wow_platform_addons($1,$2,$3,$4::jsonb) value',
  [founder,founderSession,'addons.get',JSON.stringify({workspaceId:wid})])).rows[0].value;
 const set=async(body)=>(await db.query('select wow_platform_addons($1,$2,$3,$4::jsonb) value',
  [founder,founderSession,'addons.set',JSON.stringify({workspaceId:company,...body})])).rows[0].value;
 const initial=await get();
 assert.equal(initial.primaryOwnerExempt,1);assert.equal(initial.staffDevicesAllowed,2);
 assert.equal(initial.storageAllowedBytes,2000000000);assert.equal(initial.voiceSecondsAllowed,500*60);
 assert.equal(initial.videoSecondsAllowed,250*60);assert.equal(initial.extraMonthlyUsd,'0');
 assert.equal((await get(other)).available,false);
 await assert.rejects(db.query('select wow_platform_addons($1,$2,\'addons.get\',$3::jsonb)',
  [owner,founderSession,JSON.stringify({workspaceId:company})]),/ACCESS_DENIED/);
 const bind=async(accountId)=>db.query("insert into wow_account_installations(account_id,digest) values($1,repeat('a',64))",[accountId]);
 await bind(owner); // the first company owner device is free
 const staff=[];
 for(let i=0;i<3;i++){
  const account=randomUUID();staff.push(account);
  await db.query('insert into auth.users(id) values($1)',[account]);
  await db.query("insert into wow_accounts(id,workspace_id,login_email,username,name,role) values($1,$2,$3,$4,$4,'sales')",
   [account,company,account+'@fixture.invalid','staff'+i]);
 }
 await bind(staff[0]);await bind(staff[1]);
 assert.equal((await get()).staffDevicesUsed,2);
 await assert.rejects(bind(staff[2]),/DEVICE_LIMIT_REACHED/);
 const updated=await set({extraDevices:1,doubleBundle:true,version:0});
 assert.equal(updated.version,1);assert.equal(updated.staffDevicesAllowed,3);
 assert.equal(updated.storageAllowedBytes,4000000000);assert.equal(updated.voiceSecondsAllowed,1000*60);
 assert.equal(updated.videoSecondsAllowed,500*60);assert.equal(updated.extraMonthlyUsd,'30');
 assert.equal((await set({extraDevices:1,doubleBundle:true,version:0})).version,1);
 await assert.rejects(set({extraDevices:2,doubleBundle:true,version:0}),/CONFLICT/);
 await bind(staff[2]);assert.equal((await get()).staffDevicesUsed,3);
 // Server-owned seconds: inserting completed records cannot spoof minutes in a login request.
 const room=randomUUID();
 await db.query("insert into wow_collab.rooms(id,workspace_id,kind,title,creator) values($1,$2,'group','Quota test',$3)",[room,company,owner]);
 await db.query("insert into wow_voice.calls(workspace_id,room_id,caller_id,kind,status,started_at,ended_at) values($1,$2,$3,'audio','completed',now()-interval '650 minutes',now())",
  [company,room,owner]);
 assert((await get()).voiceSecondsUsed>=600*60);
 // Double bundle admits calls above 500 minutes; disabling it blocks new calls.
 const downgraded=await set({extraDevices:1,doubleBundle:false,version:1});
 assert.equal(downgraded.voiceSecondsAllowed,500*60);
 await assert.rejects(db.query("insert into wow_voice.calls(workspace_id,room_id,caller_id,kind) values($1,$2,$3,'audio')",[company,room,owner]),/VOICE_MINUTES_EXCEEDED/);
 const restored=await set({extraDevices:1,doubleBundle:true,version:2});assert.equal(restored.version,3);
 await db.query("insert into wow_voice.calls(workspace_id,room_id,caller_id,kind) values($1,$2,$3,'audio')",[company,room,owner]);
 // Never expose the private founder RPC to anonymous or authenticated clients.
 const privileges=(await db.query("select has_function_privilege('authenticated','public.wow_platform_addons(uuid,uuid,text,jsonb)','execute') allowed")).rows[0].allowed;
 assert.equal(privileges,false);
});
