import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {communicationsFixture} from './fixtures/communications.mjs';

test('tenant calls count connected time through their lease, within the UTC calendar month',async t=>{
  const f=await communicationsFixture();t.after(()=>f.db.close());
  for(const name of ['voice-calls','platform-companies','tenant-limits','platform-usage-meter','platform-usage-meter']){
    await f.db.exec(await readFile(new URL('../supabase/modules/'+name+'.sql',import.meta.url),'utf8'));
  }
  for(const [wid,owner] of [[f.workspace,f.owner],[f.foreignWorkspace,f.foreign]]){
    await f.db.query("insert into wow_collab.rooms(id,workspace_id,kind,title,creator) values($1,$1,'team','Fixture room',$2)",[wid,owner.userId]);
  }
  const query=(id,wid,owner,kind,started,ended,expires)=>f.db.query(
    "insert into wow_voice.calls(id,workspace_id,room_id,caller_id,kind,status,started_at,ended_at,expires_at) values($1,$2,$2,$3,$4,$5,$6,$7,$8)",
    [id,wid,owner.userId,kind,ended?'completed':started?'active':'missed',started,ended,expires]);
  const add=(kind,started,ended,expires)=>query(randomUUID(),f.workspace,f.owner,kind,started,ended,expires);
  const expired=randomUUID();
  await query(expired,f.workspace,f.owner,'audio','2026-10-31T23:58:00Z','2026-11-01T00:40:00Z','2026-11-01T00:04:00Z');
  await add('audio','2026-11-01T00:05:00Z','2026-11-01T00:06:00Z','2026-11-01T00:08:00Z');
  await add('video','2026-11-01T00:08:00Z',null,'2026-11-01T00:15:00Z');
  await add('audio',null,null,'2026-11-01T00:08:00Z');
  await add('audio','2026-10-31T23:50:00Z','2026-10-31T23:55:00Z','2026-10-31T23:57:00Z');
  await query(randomUUID(),f.foreignWorkspace,f.foreign,'audio','2026-11-01T00:03:00Z',null,'2026-11-01T00:04:00Z');
  const usage=async(kind,excluded=null)=>Number((await f.db.query(
    "select wow_limits.seconds_used($1,$2,timestamptz '2026-11-01T00:10:00Z',$3) as seconds",[f.workspace,kind,excluded])).rows[0].seconds);
  await f.db.exec("set timezone='America/Los_Angeles'");
  assert.equal(await usage('audio'),300);
  assert.equal(await usage('video'),120);
  assert.equal(await usage('audio',expired),60);
  assert.equal((await f.db.query("select has_function_privilege('authenticated','wow_limits.seconds_used(uuid,text,timestamptz,uuid)','execute') as access")).rows[0].access,false);
});
