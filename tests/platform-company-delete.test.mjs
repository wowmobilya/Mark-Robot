import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {createProviderTestDatabase} from '../supabase/testing/provider-fixtures.mjs';
import {createPlatformActions} from '../supabase/functions/wow-cloud/modules/platform-companies.mjs';

test('founder can permanently delete only a confirmed, unused company; receipt survives',async t=>{
  const db=await createProviderTestDatabase();t.after(()=>db.close());
  await db.exec(await readFile(new URL('../supabase/modules/platform-companies.sql',import.meta.url),'utf8'));
  const founder=randomUUID(),sid=randomUUID(),outsider=randomUUID(),otherSid=randomUUID();
  await db.query('insert into auth.users(id) values ($1),($2)',[founder,outsider]);
  await db.query('insert into auth.sessions(id,user_id) values($1,$2),($3,$4)',[sid,founder,otherSid,outsider]);
  await db.query('insert into public.wow_platform_owners(user_id) values($1)',[founder]);
  const invoke=(u,s,action,body={})=>db.query('select public.wow_platform_service($1,$2,$3,$4::jsonb) result',
    [u,s,action,JSON.stringify(body)]).then(x=>x.rows[0].result);
  const create=name=>invoke(founder,sid,'company.create',
    {name,claimHash:randomUUID().replaceAll('-','').padEnd(64,'a'),expiresAt:new Date(Date.now()+3600000).toISOString()});
  const empty=await create('Temporary Company 238');
  await assert.rejects(invoke(outsider,otherSid,'company.deletePreview',{workspaceId:empty.workspaceId}),/ACCESS_DENIED/);
  const preview=await invoke(founder,sid,'company.deletePreview',{workspaceId:empty.workspaceId});
  assert.equal(preview.allowed,true);assert.equal(preview.name,'Temporary Company 238');assert.deepEqual(preview.blockers,[]);
  const params={workspaceId:empty.workspaceId,confirmName:preview.name,expectedRevision:preview.revision,confirmed:true,confirmWord1:'حذف',confirmWord2:'حذف'};
  await assert.rejects(invoke(founder,sid,'company.deleteEmpty',{...params,confirmed:false}),/CONFIRMATION_REQUIRED/);
  await assert.rejects(invoke(founder,sid,'company.deleteEmpty',{...params,confirmName:'Different'}),/CONFIRMATION_REQUIRED/);
  await assert.rejects(invoke(founder,sid,'company.deleteEmpty',{...params,confirmWord1:'delete'}),/CONFIRMATION_REQUIRED/);
  await assert.rejects(invoke(founder,sid,'company.deleteEmpty',{...params,confirmWord2:''}),/CONFIRMATION_REQUIRED/);
  await assert.rejects(invoke(founder,sid,'company.deleteEmpty',{...params,expectedRevision:preview.revision+1}),/CONFIRMATION_REQUIRED/);
  assert.equal((await db.query('select count(*)::int n from public.wow_workspaces where id=$1',[empty.workspaceId])).rows[0].n,1);
  assert.deepEqual(await invoke(founder,sid,'company.deleteEmpty',params),{workspaceId:empty.workspaceId,deleted:true});
  assert.equal((await db.query('select count(*)::int n from public.wow_workspaces where id=$1',[empty.workspaceId])).rows[0].n,0);
  assert.equal((await db.query('select count(*)::int n from public.wow_setup_claims where workspace_id=$1',[empty.workspaceId])).rows[0].n,0);
  const receipt=(await db.query('select workspace_id,company_name,actor_id from public.wow_platform_company_deletion_log')).rows[0];
  assert.equal(receipt.workspace_id,empty.workspaceId);assert.equal(receipt.actor_id,founder);
  assert.equal((await db.query("select has_function_privilege('anon','public.wow_platform_service(uuid,uuid,text,jsonb)','execute') allowed")).rows[0].allowed,false);
});

test('populated tenant, protected Galeri and stored assets are never removed',async t=>{
  const db=await createProviderTestDatabase();t.after(()=>db.close());
  await db.exec(await readFile(new URL('../supabase/modules/platform-companies.sql',import.meta.url),'utf8'));
  const founder=randomUUID(),session=randomUUID();await db.query('insert into auth.users(id) values($1)',[founder]);
  await db.query('insert into auth.sessions(id,user_id) values($1,$2)',[session,founder]);
  await db.query('insert into public.wow_platform_owners(user_id) values($1)',[founder]);
  const call=(action,body)=>db.query('select public.wow_platform_service($1,$2,$3,$4::jsonb) result',
    [founder,session,action,JSON.stringify(body)]).then(r=>r.rows[0].result);
  const create=async name=>(await call('company.create',
    {name,claimHash:randomUUID().replaceAll('-','').padEnd(64,'b'),expiresAt:new Date(Date.now()+3600000).toISOString()})).workspaceId;
  const protectedId=await create('Galeri.TR'),protectedPreview=await call('company.deletePreview',{workspaceId:protectedId});
  assert.equal(protectedPreview.allowed,false);
  await assert.rejects(call('company.deleteEmpty',{workspaceId:protectedId,confirmName:'Galeri.TR',expectedRevision:protectedPreview.revision,confirmed:true,confirmWord1:'حذف',confirmWord2:'حذف'}),/COMPANY_HAS_DATA/);
  const usedId=await create('Populated Company');
  const accountId=randomUUID();await db.query('insert into auth.users(id) values($1)',[accountId]);
  await db.query("insert into public.wow_accounts(id,workspace_id,login_email,username,name,role) values($1,$2,'fixture@wow.invalid','fixture','Fixture','sales')",[accountId,usedId]);
  const usedPreview=await call('company.deletePreview',{workspaceId:usedId});
  assert.equal(usedPreview.allowed,false);assert(usedPreview.blockers.includes('public.wow_accounts'));
  await assert.rejects(call('company.deleteEmpty',{workspaceId:usedId,confirmName:usedPreview.name,expectedRevision:usedPreview.revision,confirmed:true,confirmWord1:'حذف',confirmWord2:'حذف'}),/COMPANY_HAS_DATA/);
  assert.equal((await db.query('select count(*)::int n from public.wow_accounts where workspace_id=$1',[usedId])).rows[0].n,1);
  const assetId=await create('Company With Files');await db.query("insert into storage.buckets(id,name) values('wow-fixture','wow-fixture')");
  await db.query('insert into storage.objects(bucket_id,name) values($1,$2)',['wow-fixture','files/'+assetId+'/test.pdf']);
  const assetPreview=await call('company.deletePreview',{workspaceId:assetId});
  assert.equal(assetPreview.allowed,false);assert(assetPreview.blockers.includes('storage.objects'));
  assert.equal((await db.query('select count(*)::int n from public.wow_workspaces')).rows[0].n,3);
});

test('deletion action binds a receipt to the confirmed workspace and confirmation strength',async()=>{
  const seen=[];
  const handlers=createPlatformActions({platformRpc:async(actor,action,data)=>{
    seen.push({actor,action,data});
    return {workspaceId:data.workspaceId,deleted:true};
  }});
  const actor={userId:randomUUID(),sessionId:randomUUID()},workspaceId=randomUUID();
  const preview=handlers['platform.company.deletePreview'];
  const remove=handlers['platform.company.deleteEmpty'];
  const body={workspaceId,confirmName:'Example',expectedRevision:0,confirmed:true,confirmWord1:'حذف'};
  await assert.rejects(preview({actor,body:{workspaceId:'not-a-uuid'}}),/INVALID_REQUEST/);
  for(const invalid of [{confirmed:false},{expectedRevision:'0'},{confirmWord1:''},{acceptsLinkedData:true}]){
    await assert.rejects(remove({actor,body:{...body,...invalid}}),/CONFIRMATION_REQUIRED/);
  }
  assert.equal(seen.length,0);
  assert.deepEqual(await remove({actor,body}),{workspaceId,deleted:true});
  const linked={...body,acceptsLinkedData:true,confirmWord2:'حذف'};
  assert.deepEqual(await remove({actor,body:linked}),{workspaceId,deleted:true});
  assert.deepEqual(seen,[
    {actor,action:'company.deleteEmpty',data:{...body,confirmWord2:undefined,acceptsLinkedData:false}},
    {actor,action:'company.deleteEmpty',data:linked}
  ]);
  for(const receipt of [{ok:true},{workspaceId:randomUUID(),deleted:true}]){
    const handlers=createPlatformActions({platformRpc:async()=>receipt});
    await assert.rejects(handlers['platform.company.deleteEmpty']({actor,body}),/SERVICE_UNAVAILABLE/);
  }
});
