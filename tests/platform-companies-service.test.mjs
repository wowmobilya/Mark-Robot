import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {createProviderTestDatabase} from '../supabase/testing/provider-fixtures.mjs';

test('platform owner creates empty tenant, suspends it and records audit; company identities cannot administer platform',async t=>{
 const db=await createProviderTestDatabase();t.after(()=>db.close());
 await db.exec(await readFile(new URL('../supabase/modules/platform-companies.sql',import.meta.url),'utf8'));
 const admin=randomUUID(),session=randomUUID(),outsider=randomUUID(),otherSession=randomUUID();
 await db.query('insert into auth.users(id) values($1),($2)',[admin,outsider]);
 await db.query('insert into auth.sessions(id,user_id) values($1,$2),($3,$4)',[session,admin,otherSession,outsider]);
 await db.query('insert into public.wow_platform_owners(user_id) values($1)',[admin]);
 const call=async(u,s,action,data)=>(await db.query('select public.wow_platform_service($1,$2,$3,$4::jsonb) as result',[u,s,action,JSON.stringify(data)])).rows[0].result;
 const request={name:'Company A',claimHash:'a'.repeat(64),expiresAt:new Date(Date.now()+3600000).toISOString()};
 await assert.rejects(call(outsider,otherSession,'company.create',request),/ACCESS_DENIED/);
 let created=await call(admin,session,'company.create',request);assert(created.workspaceId);
 assert.equal((await db.query('select count(*)::int as n from public.wow_accounts where workspace_id=$1',[created.workspaceId])).rows[0].n,0);
 assert.equal((await db.query('select count(*)::int as n from public.wow_setup_claims where workspace_id=$1',[created.workspaceId])).rows[0].n,1);
 await assert.rejects(call(outsider,otherSession,'company.status',{workspaceId:created.workspaceId,status:'suspended'}),/ACCESS_DENIED/);
 await call(admin,session,'company.status',{workspaceId:created.workspaceId,status:'suspended'});
 assert.equal((await db.query('select status from public.wow_workspaces where id=$1',[created.workspaceId])).rows[0].status,'suspended');
 await call(admin,session,'company.rename',{workspaceId:created.workspaceId,name:'Renamed'});
 let listing=await call(admin,session,'company.list',{});assert.equal(listing.companies.length,1);assert.equal(listing.companies[0].status,'suspended');
 let audit=await call(admin,session,'company.audit',{});assert.equal(audit.events.length,3);assert.equal(listing.companies[0].name,'Renamed');
 assert.equal((await db.query("select has_function_privilege('anon','public.wow_platform_service(uuid,uuid,text,jsonb)','execute') as allowed")).rows[0].allowed,false);
});

test('provisioning rejects absent claims and inactive or banned platform sessions',async t=>{
 const db=await createProviderTestDatabase();t.after(()=>db.close());await db.exec(await readFile(new URL('../supabase/modules/platform-companies.sql',import.meta.url),'utf8'));
 const admin=randomUUID(),sid=randomUUID();await db.query('insert into auth.users(id) values($1)',[admin]);await db.query('insert into auth.sessions(id,user_id) values($1,$2)',[sid,admin]);await db.query('insert into public.wow_platform_owners(user_id) values($1)',[admin]);
 const call=data=>db.query("select public.wow_platform_service($1,$2,'company.create',$3::jsonb)",[admin,sid,JSON.stringify(data)]);
 await assert.rejects(call({name:'A',expiresAt:new Date(Date.now()+3600000).toISOString()}),/INVALID_COMPANY/);
 await db.query("update auth.users set banned_until=now()+interval '1 hour' where id=$1",[admin]);
 await assert.rejects(call({name:'A',claimHash:'b'.repeat(64),expiresAt:new Date(Date.now()+3600000).toISOString()}),/ACCESS_DENIED/);
 assert.equal((await db.query('select count(*)::int n from public.wow_workspaces')).rows[0].n,0);
});
