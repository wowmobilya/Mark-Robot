import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {communicationsFixture} from './fixtures/communications.mjs';
import {createOrderSms} from '../supabase/functions/wow-cloud/modules/order-sms.mjs';

test('only confirmed tenant order SMS reaches a registered sender and the scoped attachment expires',async t=>{
 const f=await communicationsFixture();t.after(()=>f.db.close());
 await f.db.exec(await readFile(new URL('../supabase/modules/order-sms.sql',import.meta.url),'utf8'));
 await f.db.query("insert into wow_customer.profiles(account_id,workspace_id,company,country,calling_code,phone) values($1,$2,'Test','TR','+90','5551234567')",[f.customer.userId,f.workspace]);
 await f.db.query("insert into public.wow_gallery_lines(order_id,product_id,name,price_minor,currency,quantity,position) values($1,'1','<Item>',1200,'TRY',1,0)",[f.order]);
 const config={enabled:true,tenants:JSON.stringify({[f.workspace]:{username:randomUUID(),password:randomUUID(),senders:['Fixture','Unavailable']}}),signingKey:randomUUID(),projectUrl:'https://example.test'};
 const received=[];
 const sms=createOrderSms({config,moduleRpc:async(_,a,p)=>(await f.db.query('select public.wow_order_sms($1,$2::jsonb) v',[a,JSON.stringify(p)])).rows[0].v,
  fetch:async(url,opts)=>{if(url.endsWith('/msgheader'))return Response.json({code:'00',msgheaders:['Fixture']});
   const body=JSON.parse(opts.body);received.push(body);return Response.json({code:'00',jobid:'test-id'});}});
 const action=(name,body,actor=f.owner)=>sms.actions['orderSms.'+name]({actor,body});
 const p=await action('preview',{orderId:f.order});assert(p.configured);assert.equal(p.destinationMasked,'•••• 4567');
 const data={orderId:f.order,version:p.version,commandId:randomUUID(),consent:true,language:'en'};
 await assert.rejects(action('send',data,f.foreign),/ACCESS_DENIED/);await assert.rejects(action('send',data,f.staff),/ACCESS_DENIED/);
 await assert.rejects(action('send',{...data,consent:false}),/INVALID_ORDER_SMS/);await assert.rejects(action('send',{...data,sender:'Unavailable'}),/PROVIDER_NOT_CONFIGURED/);
 assert.equal((await action('send',data)).status,'accepted');assert.equal((await action('send',data)).status,'accepted');assert.equal(received.length,1);
 const link=received[0].messages[0].msg.split(' ').pop();assert.equal(received[0].messages[0].no,'5551234567');
 assert.equal((await sms.download(new Request(link.replace('/en/','/tr/')))).status,404);
 const r=await sms.download(new Request(link));assert.equal(r.status,200);const html=await r.text();assert.match(html,/&lt;Item&gt;/);assert.doesNotMatch(html,/private staff note/);
 await f.db.query("update public.wow_order_sms_jobs set expires_at=now()-interval '2 seconds' where id=$1",[data.commandId]);assert.equal((await sms.download(new Request(link))).status,404);
});
