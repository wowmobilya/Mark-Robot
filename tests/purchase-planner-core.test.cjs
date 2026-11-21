'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const core=require('../purchase-planner-core.js');
const product=(extra={})=>({id:'p1',name:'MASTER-400',barcode:'MODEL-400',color:'Oak',dimensions:'80×40×50',image:'/catalog.png',type:'coffee_table',priceA:999,...extra});
const line=(extra={})=>({productId:'p1',name:'SAVED-400',color:'Oak',dimensions:'80×40×50',qty:3,packets:7,image:'/saved.png',priceUSD:222,...extra});
const invoice=(extra={})=>({id:'i1',invNo:'SALE-123',regDate:'2026-06-15',createdAt:'2026-06-15T16:00:00Z',grandTotal:666,companyName:'PRIVATE CUSTOMER',items:[line()],...extra});
const state=(invoices=[invoice()],products=[product()])=>({invoices,products,settings:{companyName:'WOW Buyer',materialLibrary:{version:1,materials:[]}}});
const options={mode:'year',year:2026,today:'2026-11-21'};
const orderDraft=(extra={})=>({id:'procure-a1',createdAt:'2026-07-01T15:00:00Z',supplier:{name:'Supplier Factory',contact:'Contact person'},buyer:{companyName:'WOW Buyer',logo:'/wow.png',address:'Own address',phone:'Own phone'},locale:'en',currency:'USD',notes:'Order note',lines:[{key:core.modelKey('p1','Oak','80×40×50'),productId:'p1',name:'MASTER-400',code:'MODEL-400',color:'Oak',dimensions:'80×40×50',image:'/product.png',quantity:'4',unitPrice:''}],period:{mode:'year',year:'2026'},delivery:'all',...extra});

test('periods use inclusive calendar dates, handle leap years and do not count future invoices as past activity',()=>{
  assert.deepEqual(core.period({mode:'last90'},'2024-03-01'),{mode:'last90',from:'2023-12-03',to:'2024-03-01',asOf:'2024-03-01'});
  assert.equal(core.period({year:'٢٠٢٤'},'2026-11-21').to,'2024-12-31');
  assert.throws(()=>core.period({year:2027},'2026-11-21'),/FUTURE_PERIOD/);
  assert.throws(()=>core.period({mode:'custom',from:'2026-12-01',to:'2026-12-31'},'2026-11-21'),/FUTURE_PERIOD/);
  for(const period of [{mode:'custom',from:'2026-02-30',to:'2026-03-01'},{mode:'custom',from:'2026-07-02',to:'2026-07-01'},{mode:'year',year:1899},{mode:'unknown'}])assert.throws(()=>core.period(period,'2026-11-21'));
  const data=state(['2025-12-31','2026-01-01','2026-11-21','2026-11-22','2026-12-31','2027-01-01'].map((regDate,index)=>invoice({id:String(index),regDate})));
  const annual=core.buildSales(data,options);assert.equal(annual.totalUnits,6);assert.equal(annual.invoiceCount,2);
  const days=core.buildSales(data,{mode:'custom',from:'2026-01-01',to:'2026-11-21',today:'2026-11-21'});assert.equal(days.totalUnits,6);
});

test('saved quantities count units rather than packets and include active plus archived invoices exactly once',()=>{
  const a=invoice(),archived={...a,archived:true,archivedAt:'2026-07-10'},b=invoice({id:'i2',archived:true,regDate:'2026-07-01',items:[line({qty:2,packets:99})]});
  const data=state([a,archived,b]),before=JSON.stringify(data),report=core.buildSales(data,options);
  assert.equal(report.totalUnits,5);assert.equal(report.invoiceCount,2);assert.equal(report.rows[0].recordedUnits,5);assert.equal(report.rows[0].invoiceCount,2);
  assert(report.diagnostics.some(issue=>issue.code==='duplicateInvoice'));assert.equal(report.complete,true);assert.equal(JSON.stringify(data),before);
  assert.equal(report.rows[0].name,'SAVED-400');assert.equal(report.rows[0].catalogName,'MASTER-400');assert.deepEqual(report.rows[0].names,['SAVED-400']);
  assert(Object.isFrozen(report));assert(Object.isFrozen(report.rows[0].records));
});

test('conflicting invoice duplicates are never double counted and make the resulting total provisional',()=>{
  const report=core.buildSales(state([invoice(),invoice({items:[line({qty:99})]})]),options);
  assert.equal(report.totalUnits,3);assert.equal(report.complete,false);assert(report.diagnostics.some(issue=>issue.code==='duplicateConflict'));
});

test('delivered filtering uses the real delivery flag, cancellation rules remain separate from archiving, and monetary credits do not invent returned units',()=>{
  const data=state([invoice(),invoice({id:'delivered',delivered:true,archived:true,items:[line({qty:5})]}),invoice({id:'draft',status:'draft'}),invoice({id:'cancelled',cancelled:true}),invoice({id:'credit',delivered:true,grandTotal:-10})]);
  const all=core.buildSales(data,options),delivered=core.buildSales(data,{...options,delivery:'delivered'});
  assert.equal(all.totalUnits,8);assert.equal(delivered.totalUnits,5);assert.equal(all.excludedCount,2);
  assert(all.diagnostics.some(issue=>issue.code==='creditQuantityUnknown'));assert.equal(all.complete,false);
});

test('IDs plus saved color and dimensions separate variants without merging different products that share a name',()=>{
  const data=state([invoice({items:[line(),line({color:'Black',qty:2}),line({dimensions:'90×40×50',qty:4}),line({productId:'p2',qty:1})]})],[product(),product({id:'p2',name:'MASTER-400',barcode:'MODEL-400'})]);
  const report=core.buildSales(data,options),sold=report.rows.filter(row=>row.recordedUnits);
  assert.equal(sold.length,4);assert.equal(report.totalUnits,10);assert.equal(new Set(sold.map(row=>row.key)).size,4);
});

test('historical snapshots are preserved, missing product links and malformed quantities stay visible in diagnostics',()=>{
  const lines=[line({productId:'removed',qty:2}),{productId:'p1',qty:'٤',productSnapshot:{name:'SNAPSHOT-NAME',color:'Red',dimensions:'60×20',image:'/old.png'}},line({productId:undefined}),line({qty:0}),line({qty:1.5}),line({name:''}),null,line({color:undefined})];
  const report=core.buildSales(state([invoice({items:lines}),invoice({id:'undated',regDate:'',createdAt:'',date:'11/12/2026'}),invoice({id:''}),null]),options);
  assert.equal(report.totalUnits,9);assert(report.rows.some(row=>row.name==='SNAPSHOT-NAME'&&row.recordedUnits===4));
  for(const code of ['missingCatalogProduct','unlinkedProduct','invalidQuantity','missingProductName','invalidLine','missingVariant','undatedInvoice','missingInvoiceId','invalidInvoice'])assert(report.diagnostics.some(issue=>issue.code===code),code);
  assert.equal(report.complete,false);
});

test('the saved date fallback is explicit, and catalog changes never rewrite historical invoice names',()=>{
  const data=state([invoice({regDate:'',createdAt:'2026-06-15T23:59:59Z'})]);data.products[0].name='RENAMED';
  const report=core.buildSales(data,options),row=report.rows.find(row=>row.recordedUnits);
  assert.equal(row.name,'SAVED-400');assert.equal(row.catalogName,'RENAMED');assert.equal(row.records[0].name,'SAVED-400');
  assert.equal(row.records[0].date,'2026-06-15');assert.equal(row.records[0].dateField,'createdAt');assert(report.diagnostics.some(issue=>issue.code==='dateFallback'));
});

test('scanner resolution uses only exact catalog codes or known package labels, and rejects invoice/customer QR payloads',()=>{
  const products=[product(),product({id:'p2',name:'MASTER-500',barcode:'MODEL-500'})];
  for(const raw of ['MODEL-400',' model-400 ','MASTER-400','MASTER-400 - Packet 2/3'])assert.deepEqual(core.resolveProductScan(products,raw),{status:'found',productId:'p1'});
  assert.equal(core.resolveProductScan(products,'MASTER').status,'missing');
  assert.equal(core.resolveProductScan([...products,product({id:'p3'})],'MODEL-400').status,'ambiguous');
  for(const raw of ['CUSTOMER: SECRET\nINVOICE: SOURCE-42','https://example.com/?invoice=private','{"model":"MASTER-400","customer":"private"}','javascript:alert(1)','A'.repeat(513)])assert.equal(core.resolveProductScan(products,raw).status,'unsupported');
});

test('unknown supplier prices remain unspecified; explicit zero and known mixed-price subtotals are retained exactly',()=>{
  const allUnknown=core.prepareOrder(orderDraft());assert.equal(allUnknown.lines[0].unitPrice,null);assert.equal(allUnknown.totals.totalCents,null);
  assert(!core.renderDocument(allUnknown).includes('0.00 USD'));assert(core.renderDocument(allUnknown).includes('Unspecified'));
  const mixed=core.prepareOrder(orderDraft({lines:[...orderDraft().lines,{...orderDraft().lines[0],key:'second',productId:'p2',quantity:'3',unitPrice:'0.10'},{...orderDraft().lines[0],key:'zero',productId:'p3',quantity:1,unitPrice:0}]}));
  assert.equal(mixed.totals.totalQuantity,8);assert.equal(mixed.totals.knownTotalCents,30);assert.equal(mixed.totals.unknownPrices,1);assert.equal(mixed.totals.totalCents,null);
  assert.equal(mixed.lines[2].unitPriceCents,0);
  for(const price of [-1,'1.234','NaN',Infinity,true,{}])assert.throws(()=>core.prepareOrder(orderDraft({lines:[{...orderDraft().lines[0],unitPrice:price}]})),/INVALID_PRICE/);
  assert.throws(()=>core.prepareOrder(orderDraft({lines:[{...orderDraft().lines[0],quantity:0}]})),/INVALID_ORDER_QUANTITY/);
});

test('supplier documents and CSV never contain source customers, invoice references, sale prices, costs or QR payloads',()=>{
  const privateValues=['SECRET_CUSTOMER_97841','SECRET_SALE_INVOICE_48231','SECRET_ORIGINAL_QR_55291','SECRET_PROFIT_66321','SECRET_COST_99931'];
  const draft=orderDraft({companyName:privateValues[0],invoiceNumber:privateValues[1],qrText:privateValues[2],profit:privateValues[3],analysis:{customerName:privateValues[0],invoiceNumber:privateValues[1]}});
  Object.assign(draft.lines[0],{customerName:privateValues[0],invoiceNumber:privateValues[1],rawBarcode:privateValues[2],profit:privateValues[3],costSnapshot:privateValues[4],priceUSD:38129.43,records:[{companyName:privateValues[0]}]});
  const before=JSON.stringify(draft),order=core.prepareOrder(draft);
  for(const locale of core.locales){const localized={...order,locale},html=core.renderDocument(localized),csv=core.renderCSV(localized);
    for(const secret of [...privateValues,'38129.43']){assert(!JSON.stringify(order).includes(secret),secret);assert(!html.includes(secret),locale+' HTML '+secret);assert(!csv.includes(secret),locale+' CSV '+secret);}
    assert(html.includes('MASTER-400'));assert(html.includes('Supplier Factory'));assert(html.includes('WOW Buyer'));assert(html.includes('PROFORMA ORDER'));assert(csv.includes('MODEL-400'));
  }
  assert.equal(JSON.stringify(draft),before);assert(Object.isFrozen(order));assert(Object.isFrozen(order.lines[0]));
});

test('HTML escapes supplier-entered content, rejects unsafe images, and CSV protects against spreadsheet formula injection',()=>{
  const source=orderDraft({supplier:{name:'<script>alert(1)</script>',contact:'=IMPORTXML("https://example.com")'},notes:'@SUM(A1:A9)'});
  source.lines[0].image='javascript:alert(2)';source.lines[0].name='<img src=x onerror=alert(3)>';source.lines[0].code='PRIVATE CUSTOMER\nSOURCE INVOICE';
  const order=core.prepareOrder(source),html=core.renderDocument(order),csv=core.renderCSV(order);
  assert(!html.includes('<script>'));assert(!html.includes('<img src=x'));assert(!html.includes('javascript:'));assert(html.includes('&lt;script&gt;'));
  assert(!html.includes('PRIVATE CUSTOMER'));assert(!csv.includes('SOURCE INVOICE'));assert(csv.includes("'=IMPORTXML"));assert(csv.includes("'@SUM"));assert(csv.startsWith('\ufeff'));
});

test('saved orders are independent snapshots and append through the latest settings without mutating sales or stock',async()=>{
  const data=state(),beforeInvoices=JSON.stringify(data.invoices),beforeProducts=JSON.stringify(data.products),order=core.prepareOrder(orderDraft());
  let latest={id:'main',logo:'late-logo',dailyTasks:{version:1,tasks:['late']},materialLibrary:{version:1,materials:['latest']},procurementOrders:{version:1,orders:[],draftRevision:3,draft:{id:'draft-new'}}};
  const writeBatch=async operations=>{assert.equal(operations.length,1);const op=operations[0];assert.equal(op.store,'settings');assert.equal(op.type,'merge');latest=op.merge(latest,op.value);return[structuredClone(latest)];};
  const saved=await core.persistOrder(order,{state:data,writeBatch,hydrate:async value=>value});
  assert.equal(saved.id,order.id);assert.equal(latest.logo,'late-logo');assert.deepEqual(latest.dailyTasks.tasks,['late']);assert.deepEqual(latest.materialLibrary.materials,['latest']);assert.equal(latest.procurementOrders.draft.id,'draft-new');
  data.products[0].name='CHANGED CATALOG';data.products[0].image='/different.png';assert.equal(saved.lines[0].name,'MASTER-400');assert.equal(saved.lines[0].image,'/product.png');
  assert.equal(JSON.stringify(data.invoices),beforeInvoices);data.products[0].name='MASTER-400';data.products[0].image='/catalog.png';assert.equal(JSON.stringify(data.products),beforeProducts);
  await core.persistOrder(order,{state:data,writeBatch});assert.equal(latest.procurementOrders.orders.length,1,'retrying the same immutable ID does not duplicate it');
  assert.throws(()=>core.mergeOrder(latest,{order:{...order,notes:'overwrite'}}),/ORDER_ID_EXISTS/);
});

test('autosaved drafts preserve incomplete inputs, enforce optimistic concurrency and keep saved orders and unrelated settings',async()=>{
  const data=state(),order=core.prepareOrder(orderDraft()),draft=orderDraft({supplier:{name:'',contact:''},lines:[{...orderDraft().lines[0],quantity:'',unitPrice:'1.'}]});
  let latest={id:'main',dailyTasks:{version:1,tasks:[1]},procurementOrders:{version:1,orders:[order],draftRevision:2}};
  const writeBatch=async ([op])=>{latest=op.merge(latest,op.value);return[structuredClone(latest)];};
  const saved=await core.persistDraft(draft,{state:data,writeBatch,expectedRevision:2});
  assert.equal(saved.draft.supplier.name,'');assert.equal(saved.draft.lines[0].quantity,'');assert.equal(saved.draft.lines[0].unitPrice,'1.');assert.equal(saved.draftRevision,3);assert.equal(saved.orders.length,1);assert.deepEqual(latest.dailyTasks.tasks,[1]);
  const before=JSON.stringify(latest);await assert.rejects(()=>core.persistDraft({...draft,notes:'old-tab'},{state:data,writeBatch,expectedRevision:2}),/DRAFT_CHANGED/);assert.equal(JSON.stringify(latest),before);
});

test('a failed order or draft write never publishes phantom saved data',async()=>{
  const data=state(),before=JSON.stringify(data),writeBatch=async()=>{throw Error('storage full');};
  await assert.rejects(()=>core.persistOrder(core.prepareOrder(orderDraft()),{state:data,writeBatch}),/storage full/);
  await assert.rejects(()=>core.persistDraft(orderDraft(),{state:data,writeBatch,expectedRevision:0}),/storage full/);
  assert.equal(JSON.stringify(data),before);
});

test('draft persistence returns its exact committed revision while preserving a newer published draft',async()=>{
  const data=state(),draft=orderDraft({supplier:{name:'Writer A',contact:''}});let latest={id:'main'};
  const committed=await core.persistDraft(draft,{state:data,expectedRevision:0,writeBatch:async([op])=>{latest=op.merge(latest,op.value);return[structuredClone(latest)];},hydrate:async value=>{
    latest=core.mergeDraft(latest,{expectedRevision:1,draft:core.prepareDraft({...draft,supplier:{name:'Writer B',contact:''}})});
    data.settings.procurementOrders=structuredClone(latest.procurementOrders);return value;
  }});
  assert.equal(committed.draftRevision,1);assert.equal(committed.draft.supplier.name,'Writer A');
  assert.equal(data.settings.procurementOrders.draftRevision,2);assert.equal(data.settings.procurementOrders.draft.supplier.name,'Writer B');
  await assert.rejects(()=>core.persistDraft(draft,{state:data,expectedRevision:committed.draftRevision,writeBatch:async([op])=>[op.merge(latest,op.value)]}),/DRAFT_CHANGED/);
});

test('history activity counts matching models only from the order date, with no claim that a purchase lot was delivered or sold',()=>{
  const order=core.prepareOrder(orderDraft()),data=state([
    invoice({id:'before',regDate:'2026-06-30'}),invoice({id:'day',regDate:'2026-07-01',items:[line({qty:2})]}),invoice({id:'later',regDate:'2026-09-01',items:[line({qty:4})]}),
    invoice({id:'variant',regDate:'2026-09-01',items:[line({qty:30,color:'Black'})]}),invoice({id:'cancel',regDate:'2026-09-01',cancelled:true})]);
  const activity=core.orderActivity(order,data,'2026-11-21');assert.equal(activity.lines[0].recordedUnits,6);assert.equal(activity.from,'2026-07-01');assert.equal(activity.to,'2026-11-21');
  assert.equal(order.lines[0].quantity,4);assert.equal(data.invoices[1].delivered,undefined);
});

test('corrupt history sections are rejected instead of silently replaced',()=>{
  for(const section of [{version:99,orders:[]},{version:1,orders:{}},{version:1,orders:[{id:'bad'}]}])assert.throws(()=>core.mergeOrder({procurementOrders:section},{order:core.prepareOrder(orderDraft())}),/ORDER_HISTORY_INVALID/);
});
