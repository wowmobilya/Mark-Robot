import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {createProviderTestDatabase} from '../supabase/testing/provider-fixtures.mjs';
import {createRelayActions} from '../supabase/functions/wow-cloud/modules/platform-relay.mjs';

test('only the platform founder can consent to paid relay issuance or read usage',async t=>{
  const db=await createProviderTestDatabase();t.after(()=>db.close());
  for(const file of ['platform-companies.sql','platform-relay.sql','platform-relay.sql']){
    await db.exec(await readFile(new URL('../supabase/modules/'+file,import.meta.url),'utf8'));
  }
  const founder=randomUUID(),employee=randomUUID(),session=randomUUID(),otherSession=randomUUID();
  await db.query('insert into auth.users(id) values($1),($2)',[founder,employee]);
  await db.query('insert into auth.sessions(id,user_id) values($1,$2),($3,$4)',[session,founder,otherSession,employee]);
  await db.query('insert into public.wow_platform_owners(user_id) values($1)',[founder]);
  const authorized={userId:founder,sessionId:session},other={userId:employee,sessionId:otherSession};
  const platformRelay=async(actor,enabled,accept)=>(await db.query(
    'select public.wow_platform_relay($1,$2,$3,$4) as enabled',[actor.userId,actor.sessionId,enabled,accept])).rows[0].enabled;
  let queries=0;
  const options={platformRelay,managed:true,accountId:founder.replaceAll('-',''),analyticsToken:randomUUID(),
    now:()=>new Date('2026-11-22T14:00:00Z'),fetchImpl:async(url,init)=>{
      queries++;assert.equal(url,'https://api.cloudflare.com/client/v4/graphql');
      assert.equal(JSON.parse(init.body).variables.from,'2026-11-01');
      return Response.json({data:{viewer:{accounts:[{callsTurnUsageAdaptiveGroups:[{sum:{egressBytes:2500}}]}]}}});
    }};
  const api=createRelayActions(options),get=api['platform.relay.get'],set=api['platform.relay.set'];
  await assert.rejects(get({actor:other}),/ACCESS_DENIED/);
  assert.equal(queries,0);
  const state=await get({actor:authorized});assert.equal(state.active,false);assert.equal(state.turnEgressBytes,2500);
  assert.equal(state.remainingGb,null);
  await assert.rejects(set({actor:authorized,body:{enabled:true}}));
  await assert.rejects(set({actor:other,body:{enabled:true,acceptPricing:true}}),/ACCESS_DENIED/);
  assert.equal((await set({actor:authorized,body:{enabled:true,acceptPricing:true}})).active,true);
  assert.equal((await set({actor:authorized,body:{enabled:false}})).enabled,false);
  const unavailable=createRelayActions({...options,managed:false,analyticsToken:null});
  assert.equal((await unavailable['platform.relay.get']({actor:authorized})).turnEgressBytes,null);
  await assert.rejects(unavailable['platform.relay.set']({actor:authorized,body:{enabled:true,acceptPricing:true}}));
  const rights=await db.query("select has_function_privilege('authenticated','public.wow_platform_relay(uuid,uuid,boolean,boolean)','execute') as founder,has_function_privilege('anon','public.wow_relay_enabled()','execute') as anonymous");
  assert.deepEqual(rights.rows[0],{founder:false,anonymous:false});
});
