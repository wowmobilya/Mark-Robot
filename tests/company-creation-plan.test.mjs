import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {createProviderTestDatabase} from '../supabase/testing/provider-fixtures.mjs';

test('company creation assigns paid and trial subscriptions atomically and preserves old clients',async t=>{
 const db=await createProviderTestDatabase();t.after(()=>db.close());
 const read=path=>readFile(new URL('../supabase/'+path,import.meta.url),'utf8');
 for(const path of JSON.parse(await read('release.json')).migrations)if(path!=='wow-schema.sql')await db.exec(await read(path));
 const founder=randomUUID(),sid=randomUUID();
 await db.query('insert into auth.users(id) values($1)',[founder]);
 await db.query('insert into auth.sessions(id,user_id) values($1,$2)',[sid,founder]);
 await db.query('insert into public.wow_platform_owners(user_id) values($1)',[founder]);
 const call=(name,body)=>db.query("select public.wow_platform_service($1,$2,$3,$4::jsonb) r",[founder,sid,name,JSON.stringify(body)]).then(x=>x.rows[0].r);
 const pid=randomUUID();
 const packageBody={id:pid,name:'Fixture Monthly',deviceLimit:2,storageBytes:1000,price:'20',currency:'EUR',durationDays:30,voiceMinutes:500,videoMinutes:250,version:0};
 await db.query("select public.wow_platform_limits($1,$2,'platform.plans.save',$3::jsonb)",[founder,sid,JSON.stringify(packageBody)]);
 const body=name=>({name,claimHash:randomUUID().replaceAll('-','').padEnd(64,'c'),expiresAt:new Date(Date.now()+3600000).toISOString()});
 const paid={mode:'paid',planId:pid,planVersion:1,durationDays:30};
 const request={...body('Paid company'),subscription:paid},first=await call('company.create',request);
 assert.equal(first.subscription.mode,'paid');assert.equal(first.subscription.price,20);assert.equal(first.subscription.currency,'EUR');
 assert.equal(Date.parse(first.subscription.expiresAt)-Date.parse(first.subscription.startsAt),30*86400000);
 assert.deepEqual(await call('company.create',request),first);
 await assert.rejects(call('company.create',{...request,subscription:{...paid,mode:'trial',durationDays:7}}),/CONFLICT/);
 const trial=await call('company.create',{...body('Trial company'),subscription:{...paid,mode:'trial',durationDays:7}});
 assert.equal(trial.subscription.price,0);assert.equal(Date.parse(trial.subscription.expiresAt)-Date.parse(trial.subscription.startsAt),7*86400000);
 const trialQuota=(await db.query("select public.wow_platform_limits($1,$2,'platform.limits.get',$3::jsonb) r",[founder,sid,JSON.stringify({workspaceId:trial.workspaceId})])).rows[0].r;
 assert.equal(trialQuota.effectiveDeviceLimit,2);assert.equal(trialQuota.effectiveStorageBytes,1000);
 const summary=()=>db.query('select public.wow_platform_subscription_summary($1,$2,$3::uuid[]) r',[founder,sid,[trial.workspaceId]]).then(x=>x.rows[0].r.subscriptions[0]);
 assert.equal((await summary()).subscriptionType,'trial');assert.equal((await summary()).durationDays,7);
 await db.query("select public.wow_platform_limits($1,$2,'platform.limits.set',$3::jsonb)",[founder,sid,JSON.stringify({version:1,planId:pid,workspaceId:trial.workspaceId,expiresAt:new Date(Date.now()+60*86400000).toISOString()})]);
 assert.equal((await summary()).subscriptionType,null);
 const old=await call('company.create',body('Old client'));assert(old.workspaceId);assert.equal(old.subscription,undefined);
 for(const [name,choice,err] of [['Wrong term',{...paid,durationDays:1},/INVALID_LIMITS/],['Stale price',{...paid,planVersion:2},/CONFLICT/],['Missing plan',{...paid,planId:randomUUID()},/PLAN_NOT_FOUND/]]){
   const attempt=body(name);await assert.rejects(call('company.create',{...attempt,subscription:choice}),err);
   assert.equal((await db.query('select count(*)::int n from public.wow_workspaces where name=$1',[name])).rows[0].n,0);
   assert.equal((await db.query('select count(*)::int n from public.wow_setup_claims where token_hash=$1',[attempt.claimHash])).rows[0].n,0);
 }
});
