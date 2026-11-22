import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {createProviderTestDatabase} from '../supabase/testing/provider-fixtures.mjs';

test('1000 isolated workspace records and suspended workspace refuse sync in a synthetic database',async t=>{
 const db=await createProviderTestDatabase();t.after(()=>db.close());
 const w1=randomUUID(),w2=randomUUID(),u1=randomUUID(),u2=randomUUID(),s1=randomUUID(),s2=randomUUID();
 await db.query("insert into public.wow_workspaces(id,name,data_revision) values($1,'A',1),($2,'B',1)",[w1,w2]);
 await db.query("insert into auth.users(id) values($1),($2)",[u1,u2]);
 await db.query("insert into auth.sessions(id,user_id) values($1,$2),($3,$4)",[s1,u1,s2,u2]);
 await db.query("insert into public.wow_accounts(id,workspace_id,login_email,username,name,role) values($1,$2,'a@example.test','owner-a','A','owner'),($3,$4,'b@example.test','owner-b','B','owner')",[u1,w1,u2,w2]);
 await db.query("insert into public.wow_sessions(session_id,account_id,session_version) values($1,$2,1),($3,$4,1)",[s1,u1,s2,u2]);
 await db.query("insert into public.wow_workspaces(name) select 'fixture-'||g from generate_series(1,998) g");
 await db.query("insert into public.wow_records(workspace_id,store,record_id,payload,revision,change_id,updated_by) values($1,'products','\"same\"'::jsonb,'{\"owner\":\"A\"}'::jsonb,1,1,$2),($3,'products','\"same\"'::jsonb,'{\"owner\":\"B\"}'::jsonb,1,1,$4)",[w1,u1,w2,u2]);
 const run=async(userId,sessionId,spoof)=> (await db.query("select public.wow_service('sync.pull',$1::jsonb) as result",[JSON.stringify({userId,sessionId,workspaceId:spoof,cursor:0,limit:20})])).rows[0].result;
 let a=await run(u1,s1,w2),b=await run(u2,s2,w1);assert.equal(a.context.workspaceId,w1);assert.equal(b.context.workspaceId,w2);assert.equal(a.records.length,1);assert.equal(b.records.length,1);assert.equal(a.records[0].value.owner,'A');assert.equal(b.records[0].value.owner,'B');
 await db.query("update public.wow_workspaces set status='suspended' where id=$1",[w1]);await assert.rejects(run(u1,s1,w2),/ACCOUNT_UNAVAILABLE/);assert.equal((await run(u2,s2,w1)).records[0].value.owner,'B');
 assert.equal((await db.query('select count(*)::int as n from public.wow_workspaces')).rows[0].n,1000);
});
