import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID,randomBytes} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {createProviderTestDatabase} from '../supabase/testing/provider-fixtures.mjs';
import {createFounderActivation} from '../supabase/functions/wow-cloud/modules/founder-activation.mjs';

test('reissue expires prior claim; only verified tenant owner mailbox can complete once',async t=>{
 const db=await createProviderTestDatabase();t.after(()=>db.close());
 for(const n of ['platform-companies','founder-activation'])await db.exec(await readFile(new URL('../supabase/modules/'+n+'.sql',import.meta.url),'utf8'));
 const founder=randomUUID(),owner=randomUUID(),sid=randomUUID(),w=randomUUID(),mail=owner+'@example.test',origin='https://example.test';
 await db.query('insert into auth.users(id,email,email_confirmed_at) values($1,$2,now()),($3,$4,now())',[founder,founder+'@example.test',owner,mail]);
 await db.query('insert into auth.sessions(id,user_id) values($1,$2)',[sid,founder]);await db.query('insert into public.wow_platform_owners(user_id) values($1)',[founder]);
 await db.query("insert into public.wow_workspaces(id,name) values($1,'Fixture')",[w]);
 const rpc=async(actor,a,p)=>(await db.query('select public.wow_founder_activation($1,$2,$3,$4::jsonb) v',[actor.userId,actor.sessionId,a,JSON.stringify(p)])).rows[0].v;
 let rid;const sequence=[];
 const svc=createFounderActivation({founderActivation:rpc,origin,enabled:true,consumeOwnerRecovery:async (r,id,m)=>(await db.query('select public.wow_owner_recovery_consume($1,$2,$3) v',[r,id,m])).rows[0].v,
  auth:{ownerRecoveryMail:async (to,href)=>{assert.equal(to,mail);rid=new URL(href).searchParams.get('request');},verifyOwnerRecovery:async()=>({access_token:'test-proof'}),getUser:async()=>({id:owner,email:mail,email_confirmed_at:new Date()}),updateOwnPassword:async()=>sequence.push('reset'),closeAll:async()=>sequence.push('global'),signOut:async()=>{}}});
 const act=(a,p={})=>svc.actions['platform.company.'+a]({actor:{userId:founder,sessionId:sid},body:{workspaceId:w,...p}});
 const code=()=>randomBytes(32).toString('hex');
 const earlier=code(),later=code();await act('reissue',{setupToken:earlier});await act('reissue',{setupToken:later});assert.equal((await act('activation')).state,'pending');
 const count=await db.query('select count(*)::int n from public.wow_setup_claims where workspace_id=$1 and expires_at>now()',[w]);assert.equal(count.rows[0].n,1);
 await db.query("insert into public.wow_accounts(id,workspace_id,login_email,username,name,role) values($1,$2,$3,'fixture','Fixture','owner')",[owner,w,mail]);
 assert.equal((await act('activation')).canRecover,true);await assert.rejects(act('reissue',{setupToken:code()}),/ALREADY_CONFIGURED/);
 await assert.rejects(act('recover',{confirmed:false}),/INVALID_REQUEST/);
 assert((await act('recover',{confirmed:true})).requested);await assert.rejects(act('recover',{confirmed:true}),/RATE_LIMITED/);
 const complete=()=>svc.publicActions['auth.platformOwnerRecovery']({request:new Request(origin,{headers:{Origin:origin}}),body:{requestId:rid,tokenHash:code(),newPassword:code()}});
 assert((await complete()).changed);assert.deepEqual(sequence,['reset','global']);await assert.rejects(complete(),/INVALID_EMAIL_LINK/);
 await db.query('insert into public.wow_platform_owners(user_id) values($1)',[owner]);assert.equal((await act('activation')).canRecover,false);
 assert.equal((await db.query("select has_function_privilege('authenticated','public.wow_owner_recovery_consume(uuid,uuid,text)','execute') v")).rows[0].v,false);
});
