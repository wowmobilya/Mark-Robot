import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID,randomBytes} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {communicationsFixture} from './fixtures/communications.mjs';
import {createCompanyJoin} from '../supabase/functions/wow-cloud/modules/company-join.mjs';
import {createCustomerAuthActions} from '../supabase/functions/wow-cloud/modules/customer-auth.mjs';

test('manual and QR join request binds one hidden identity; only its own company owner may approve it',async t=>{
 const f=await communicationsFixture();t.after(()=>f.db.close());
 await f.db.exec(await readFile(new URL('../supabase/modules/company-join.sql',import.meta.url),'utf8'));
 const origin='https://company.test',creds=new Map(),rpc=async(_,a,d)=>(await f.db.query('select public.wow_company_join($1,$2::jsonb) v',[a,JSON.stringify(d)])).rows[0].v;
 const auth={createUser:async({email,password})=>{if(creds.has(email))throw Error('DUPLICATE');const id=randomUUID();await f.db.query('insert into auth.users(id,email,email_confirmed_at) values($1,$2,now())',[id,email]);creds.set(email,{id,email,password});return {id,email};},
  signIn:async(e,p)=>{if(creds.get(e)?.password!==p)throw Error();return {access_token:e};},getUser:async e=>creds.get(e),signOut:async()=>{}};
 const svc=createCompanyJoin({moduleRpc:rpc,auth,origins:[origin]}),request=new Request(origin,{headers:{Origin:origin}});
 const input={username:'fixture-join',name:'Fixture',workspaceId:f.workspace,requestId:randomUUID(),claimToken:randomBytes(32).toString('hex'),password:randomUUID()};
 const submit=(body=input)=>svc.publicActions['auth.companyJoin']({body,request});
 const owner=(name,body={},actor=f.owner)=>svc.actions['companyJoin.'+name]({actor,body});
 const membership=async()=>Number((await f.db.query("select count(*) n from public.wow_accounts where username=$1",[input.username])).rows[0].n);
 assert.equal((await submit()).state,'pending');assert.equal((await submit()).id,input.requestId);assert.equal(creds.size,1);assert.equal(await membership(),0);
 await assert.rejects(submit({...input,claimToken:'0'.repeat(64)}),/ACCESS_DENIED/);await assert.rejects(submit({...input,workspaceId:f.foreignWorkspace}),/ACCESS_DENIED/);
 assert.equal((await owner('list',{id:input.requestId},f.foreign)).total,0);await assert.rejects(owner('list',{},f.customer),/ACCESS_DENIED/);
 const row=(await owner('list',{id:input.requestId})).requests[0];assert.deepEqual(Object.keys(row).sort(),['createdAt','id','name','state','username']);
 const decide={id:input.requestId,decision:'approved',role:'owner',permissions:['settings.edit']};
 await assert.rejects(owner('decide',decide,f.foreign),/ACCESS_DENIED/);
 assert.equal((await owner('decide',decide)).state,'approved');assert.equal((await owner('decide',decide)).state,'approved');assert.equal(await membership(),1);
 const record=(await f.db.query('select role,permissions from public.wow_accounts where username=$1',[input.username])).rows[0];assert.equal(record.role,'customer');assert(!record.permissions.includes('settings.edit'));
 assert.equal((await submit()).state,'approved');await assert.rejects(owner('decide',{...decide,decision:'rejected'}),/CONFLICT/);
 const rejected={...input,requestId:randomUUID(),claimToken:randomBytes(32).toString('hex'),username:'rejected-fixture'};await submit(rejected);assert.equal((await owner('decide',{id:rejected.requestId,decision:'rejected'})).state,'rejected');assert.equal((await submit(rejected)).state,'rejected');
 assert.equal((await f.db.query("select has_function_privilege('anon','public.wow_company_join(text,jsonb)','execute') v")).rows[0].v,false);
 const legacy=createCustomerAuthActions({provider:{configured:true},origins:[origin],enabled:true,requireCompanyApproval:true});await assert.rejects(legacy.publicActions['auth.customerRegister']({body:{},request}),/JOIN_APPROVAL_REQUIRED/);
});
