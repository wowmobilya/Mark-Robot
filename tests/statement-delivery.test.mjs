import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {communicationsFixture} from './fixtures/communications.mjs';
import {createStatementDelivery} from '../supabase/functions/wow-cloud/modules/statement-delivery.mjs';
test('a consented statement snapshot is scheduled once and provider dispatch rechecks recipient and access',async t=>{
 const f=await communicationsFixture();t.after(()=>f.db.close());
 for(const file of ['platform-companies','tenant-limits','statement-delivery'])await f.db.exec(await readFile(new URL('../supabase/modules/'+file+'.sql',import.meta.url),'utf8'));
 const rpc=async(name,a,p)=>(await f.db.query('select public.'+name+'($1,$2::jsonb) result',[a,JSON.stringify(p)])).rows[0].result;
 const seen=[],config={emailEnabled:true,emailFrom:'statement@example.test',emailWorkspace:f.workspace,emailKey:randomUUID(),waEnabled:true,waWorkspace:f.workspace,waPhone:'1234',waVersion:'v22.0',waToken:randomUUID(),waTemplate:'statement',waLocale:'en'};
 const svc=createStatementDelivery({moduleRpc:rpc,statementWorker:(a,p)=>rpc('wow_statement_worker',a,p),config,fetch:async(url,req)=>{
   seen.push(url);if(url.endsWith('/emails')){assert(JSON.parse(req.body).attachments[0].content);return Response.json({id:randomUUID()});}
   if(url.endsWith('/media'))return Response.json({id:'54321'});
   assert.equal(JSON.parse(req.body).template.components[0].parameters[0].document.id,'54321');return Response.json({messages:[{id:'wamid.'+randomUUID()}]});
 }});
 const act=(name,body,actor=f.owner)=>svc.actions['statement.'+name]({actor,body});
 const msg={id:randomUUID(),companyId:7,channel:'email',destination:f.company.email,workspaceId:f.workspace,label:'Statement',consent:true,scheduledAt:new Date(Date.now()+3600000).toISOString(),zone:'Europe/Istanbul',pdf:Buffer.from('%PDF-1.4\n%%EOF').toString('base64')};
 assert((await act('list',{companyId:7})).providers.email);
 await assert.rejects(act('schedule',{...msg,consent:false}),/INVALID_REQUEST/);await assert.rejects(act('schedule',msg,f.staff),/ACCESS_DENIED/);await assert.rejects(act('schedule',msg,f.foreign),/ACCESS_DENIED/);
 assert.equal((await act('schedule',msg)).status,'queued');assert.equal((await act('schedule',msg)).status,'queued');await svc.process();assert.equal(seen.length,0);
 const due=()=>f.db.query("update wow_mail.statements set scheduled_at=now()-interval '1 minute' where status='queued'");
 await due();await svc.process();assert.equal(seen.length,1);await svc.process();assert.equal(seen.length,1);
 const wa={...msg,id:randomUUID(),channel:'whatsapp',destination:'+905551234567'};await act('schedule',wa);await due();await svc.process();assert.equal(seen.length,3);
 const revoke={...msg,id:randomUUID()};await act('schedule',revoke);await due();await f.db.query('update public.wow_accounts set session_version=session_version+1 where id=$1',[f.owner.userId]);await svc.process();assert.equal(seen.length,3);
 assert.equal((await f.db.query('select count(*)::int n from wow_mail.statements where pdf is not null')).rows[0].n,0);
});
