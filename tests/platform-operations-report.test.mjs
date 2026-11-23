import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {communicationsFixture} from './fixtures/communications.mjs';
import {createOperationsReportAction} from '../supabase/functions/wow-cloud/modules/platform-operations-report.mjs';

test('the founder report exposes bounded measurements and sanitizes operational errors',async t=>{
  const f=await communicationsFixture();
  t.after(()=>f.db.close());
  for(const name of ['platform-companies','platform-operations-report','platform-operations-report']){
    await f.db.exec(await readFile(new URL('../supabase/modules/'+name+'.sql',import.meta.url),'utf8'));
  }
  await f.db.query('insert into public.wow_platform_owners(user_id) values($1)',[f.foreign.userId]);
  await f.db.query(`insert into wow_ops.settings(workspace_id,last_tick_at,last_result) values
    ($1,now()-interval '20 minutes','{"status":"failed"}'),($2,now(),'{}')`,[f.workspace,f.foreignWorkspace]);
  await f.db.query(`insert into wow_ops.incidents(workspace_id,code,severity,active,details,first_seen_at)
    values ($1,'RLS_DISABLED','critical',true,'{"secret":"customer details"}',now()-interval '1 hour')`,[f.workspace]);
  await f.db.query(`insert into wow_ops.runs(workspace_id,status,error_code,started_at,finished_at)
    select $1,'failed',case when i=1 then 'customer error PRIVATE' else '23505' end,now()-i*interval '1 minute',now()-i*interval '1 minute'
    from generate_series(1,12) i`,[f.workspace]);
  const run=async(actor)=>(await f.db.query('select public.wow_platform_operations_report($1,$2) as report',[actor.userId,actor.sessionId])).rows[0].report;
  const api=createOperationsReportAction({operationsReport:run})['platform.operationsReport'];
  await assert.rejects(api({actor:f.owner}),/ACCESS_DENIED/);
  const result=await api({actor:f.foreign,body:{userId:f.owner.userId,query:'ignored'}});
  assert.equal(result.healthy,false);
  assert.equal(result.activeIncidents,1);
  assert.equal(result.incidents[0].code,'RLS_DISABLED');
  assert.equal(result.scheduler.configured,true);
  assert.equal(result.scheduler.staleWorkspaces,1);
  assert.equal(result.scheduler.enabledWorkspaces,2);
  assert.equal(result.scheduler.failedRuns24h,12);
  assert.equal(result.recentFailures.length,10);
  assert.equal(result.recentFailures[0].code,null);
  assert.equal(result.recentFailures[1].code,'23505');
  assert.ok(result.database.bytes>0);
  assert.ok(result.database.maxConnections>0);
  assert.doesNotMatch(JSON.stringify(result),/PRIVATE|customer details|workspaceId|query/);
  const grant=(await f.db.query("select has_function_privilege('authenticated','public.wow_platform_operations_report(uuid,uuid)','execute') as access")).rows[0];
  assert.equal(grant.access,false);
});
