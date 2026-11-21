'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const planner = require('../purchase-planner-core.js');
const core = require('../procurement-followup-core.js');

const key = planner.modelKey('p"7', 'Grey', '90×40');
const at = day => '2026-11-' + day + 'T10:00:00.000Z';
const line = (extra={}) => ({productId:'p"7', name:'Desk', color:'Grey', dimensions:'90×40', quantity:5, ...extra});
const order = (id='a', lines=[line()]) => planner.prepareOrder({id, createdAt:at('01'), currency:'USD', supplier:{name:'Factory'}, lines});
const settings = (...orders) => ({id:'main', independent:{logo:'keep'}, procurementOrders:{version:1,orders}});
const event = (id,type,day,extra={}) => ({id,type,at:at(day),...extra});
const receipt = (id,day,quantity) => event(id,'receipt',day,{lines:[{key,quantity}]});
const append = (s,orderId,expectedRevision,event) => core.mergeChange(s,{orderId,expectedRevision,event});
const invoice = (id,day,qty,extra={}) => ({id,invNo:'N'+id,delivered:true,deliveredAt:at(day),items:[line({qty})],...extra});
const report = (s,invoices=[]) => core.buildReport({settings:s,invoices},{now:at('15')});
const codes = r => r.diagnostics.map(d => d.code);

test('authoritative partial receipts, due date, cancellation, reversal and reopen', () => {
  const initial=settings(order()), original=JSON.stringify(initial);
  let s=append(initial,'a',0,event('o','ordered','02',{operator:'Ali',expectedDate:'2026-11-10'}));
  s=append(s,'a',1,receipt('r','04',3));
  assert.deepEqual([report(s).orders[0].status,report(s).orders[0].overdue],['partial',true]);
  assert.throws(()=>append(s,'a',2,receipt('excess','05',3)),/OVER_RECEIPT/);
  s=append(s,'a',2,event('c','cancel','05'));
  assert.equal(report(s).orders[0].outstandingUnits,2);
  assert.equal(report(s).orders[0].overdue,false);
  assert.throws(()=>append(s,'a',3,receipt('late','06',1)),/INVALID_TRANSITION/);
  assert.throws(()=>append(s,'a',3,event('v','void_receipt','06',{receiptId:'r',note:' '})),/INVALID_REVERSAL/);
  s=append(s,'a',3,event('v','void_receipt','06',{receiptId:'r',note:'Count corrected'}));
  assert.equal(report(s).orders[0].status,'cancelled');
  assert.throws(()=>append(s,'a',4,event('v2','void_receipt','07',{receiptId:'r',note:'Again'})),/INVALID_REVERSAL/);
  s=append(s,'a',4,event('re','reopen','07'));
  assert.equal(report(s).orders[0].status,'ordered');
  s=append(s,'a',5,event('date','expected','08',{expectedDate:''}));
  s=append(s,'a',6,receipt('all','09',5));
  const row=report(s).orders[0];
  assert.deepEqual([row.status,row.receivedUnits,row.balanceUnits,row.outstandingUnits,row.overdue,row.revision],['received',5,5,0,false,7]);
  assert.equal(row.events[3].note,'Count corrected');
  assert.equal(initial.procurementOrders.orders,s.procurementOrders.orders);
  assert.equal(initial.independent,s.independent);
  assert.equal(JSON.stringify(initial),original);
});

test('same/different order concurrency and full-payload idempotency', () => {
  const first=receipt('r','03',2);
  let s=append(settings(order(),order('b')),'a',0,first);
  s=append(s,'b',0,receipt('rb','04',3));
  s=append(s,'a',1,receipt('r2','05',1));
  assert.equal(append(s,'a',0,structuredClone(first)),s);
  assert.throws(()=>append(s,'a',0,receipt('other','05',2)),/FOLLOWUP_CHANGED/);
  for(const changed of [{note:''},{operator:'Ali'},{at:at('04')},{lines:[{key,quantity:3}]}])
    assert.throws(()=>append(s,'a',0,{...first,...changed}),/EVENT_ID_COLLISION/);
  assert.throws(()=>append(s,'b',1,first),/EVENT_ID_COLLISION/);
  assert.deepEqual(core.getLedger(s).records.map(r=>r.revision),[2,1]);
});

test('FIFO across orders, exact timestamps, simultaneous receipt tie and snapshots', () => {
  let s=settings(order('b'),order());
  s=append(s,'b',0,receipt('rb','05',5));s=append(s,'a',0,receipt('ra','03',5));
  const invoices=[invoice(2,'06',5),invoice('1','04',3),invoice('early','02',3),invoice('other','10',9,{items:[line({qty:9,color:'Black'})]})];
  const state={settings:s,invoices,products:[{id:'p"7',color:'black',dimensions:'new'}]},before=JSON.stringify(state);
  const r=core.buildReport(state,{now:at('15')});
  assert.deepEqual(r.orders.map(o=>[o.id,o.allocatedUnits,o.balanceUnits]),[['b',3,2],['a',5,0]]);
  assert.deepEqual(r.orders[1].lines[0].allocations.map(a=>[a.invoiceId,a.receiptId,a.quantity]),[['1','ra',3],['2','ra',2]]);
  assert.equal(r.totals.unallocatedUnits,12);assert.equal(r.complete,true);
  assert.equal(JSON.stringify(state),before);
  const tieA=append(settings(order('z'),order('a')),'z',0,receipt('rz','05',4));
  const tie=append(tieA,'a',0,receipt('ra','05',4));
  assert.equal(report(tie,[invoice('same','05',1)]).orders.find(o=>o.id==='a').allocatedUnits,1);
});

test('precise delivery confirmation and duplicate quarantine preserve known quantities', () => {
  const s=append(settings(order()),'a',0,{...receipt('r','04',5),at:'2026-11-04T09:00:00.000000002Z'});
  const physical=invoice('ok','05',2), dated=at('05');
  const invoices=[
    physical,{...physical,archived:true,items:[{...physical.items[0],image:'other',costSnapshot:{}}]},
    invoice(1,'05',1),invoice('1','06',3),invoice('early','04',1,{deliveredAt:'2026-11-04T11:00:00.000000001+02:00'}),
    ...['2026-02-30T10:00:00Z','2026-11-04','2026-11-04T24:00:00Z','','2026-11-04T10:00:00'].map((v,i)=>invoice('u'+i,'05',1,{regDate:dated,deliveredAt:v})),
    invoice('cancel','05',3,{cancelled:true}),invoice('pending','05',4,{delivered:false}),invoice('credit','05',9,{grandTotal:-1}),
    invoice('snapshot','05',1,{items:[{productId:'p"7',qty:'١',productSnapshot:{color:'GREY',dimensions:'90×40'}}]}),
    invoice('blank','05',1,{items:[line({qty:1,color:'',productSnapshot:{color:'Grey'}})]}),invoice('bad','05',1,{items:[line({qty:0})]})
  ];
  const r=report(s,invoices);assert.equal(r.complete,false);assert.equal(r.totals.allocatedUnits,3);
  for(const code of ['duplicateInvoice','duplicateConflict','undatedDelivery','missingVariant','invalidQuantity','creditQuantityUnknown'])assert(codes(r).includes(code),code);
  assert.equal(r.totals.unallocatedUnits,7);
  assert.deepEqual(report(s,invoices.slice().reverse()).orders,r.orders);
});

test('undo recalculates allocation and current invoice corrections replace earlier calculations', () => {
  let s=append(settings(order(),order('b')),'a',0,receipt('ra','02',5));s=append(s,'b',0,receipt('rb','03',5));
  assert.deepEqual(report(s,[invoice('i','04',4)]).orders.map(o=>o.allocatedUnits),[4,0]);
  s=append(s,'a',1,event('v','void_receipt','07',{receiptId:'ra',note:'Not received'}));
  assert.deepEqual(report(s,[invoice('i','04',3)]).orders.map(o=>o.allocatedUnits),[0,3]);
  assert.equal(report(s,[invoice('i','04',3,{cancelled:true})]).totals.allocatedUnits,0);
});

test('corrupt/revision-inconsistent storage rejects mutations; canonical lines ignore legacy aliases', () => {
  const fixture=settings(order(42,[line({key:'legacy alias'})]));
  for(const section of [null,{version:2,revision:0,records:[]},{version:1,revision:1,records:[]},{version:1,revision:0,records:null}]){
    const bad={...fixture,procurementOrders:{...fixture.procurementOrders,followup:section}};
    assert.throws(()=>append(bad,42,0,receipt('r','03',1)),/INVALID_FOLLOWUP/);
    assert.equal(report(bad).complete,false);assert.equal(report(bad).totals.receivedUnits,null);
  }
  const s=append(fixture,42,0,receipt('r','03',3));
  assert.equal(report(s).orders[0].id,'42');assert.equal(report(s).orders[0].lines[0].key,key);
  const ambiguous=settings(order('ambiguous',[line({key:'one'}),line({key:'two'})]),order('safe'));
  assert.throws(()=>append(ambiguous,'ambiguous',0,receipt('r','03',3)),/ORDER_HISTORY_INVALID/);
  assert.deepEqual(report(ambiguous).orders.map(o=>o.id),['safe']);assert.equal(report(ambiguous).complete,false);
  const orphan={...s,procurementOrders:{...s.procurementOrders,orders:[order('else')]}};
  assert.throws(()=>append(orphan,'else',0,receipt('r','04',1)),/INVALID_FOLLOWUP/);
});

test('safe arithmetic, no unit expansion, missing store is visibly unknown', () => {
  const max=Number.MAX_SAFE_INTEGER;
  let s=settings(order('a',[line({quantity:max})]),order('b',[line({quantity:1})]));
  s=append(s,'a',0,receipt('ra','03',max));
  const r=report(s,[invoice('ok','04',max),invoice('extra','05',1)]);
  assert.equal(r.orders[0].lines[0].allocations.length,1);assert.equal(r.totals.allocatedUnits,max);
  assert.equal(r.totals.orderedUnits,null);assert.equal(r.totals.unallocatedUnits,1);assert(codes(r).includes('quantityOverflow'));
  const unavailable=core.buildReport({settings:s});assert.equal(unavailable.complete,false);assert.equal(unavailable.totals.allocatedUnits,null);
  assert.equal(unavailable.orders[0].balanceUnits,null);
});

test('write returns its own receipt snapshot despite a later revision or retried event; fails closed on a wrong result',async()=>{
  let latest=settings(order()),state={settings:{...latest,independent:{local:true}}};
  const writeBatch=async ([op])=>{latest=op.merge(latest,op.value);return [structuredClone(latest)];};
  const first={orderId:'a',expectedRevision:0,event:receipt('first','02',1)};
  const committed=await core.persistChange(first,{state,writeBatch,hydrate:async value=>{
    await core.persistChange({orderId:'a',expectedRevision:1,event:receipt('newer','03',3)},{state,writeBatch});
    return value;
  }});
  assert.deepEqual(committed.events.map(e=>e.id),['first']);assert.equal(committed.revision,1);
  assert.equal(state.settings.procurementOrders.followup.revision,2);assert.deepEqual(state.settings.independent,{local:true});
  const retry=await core.persistChange(first,{state,writeBatch});assert.deepEqual(retry,committed);
  const before=JSON.stringify(state);
  await assert.rejects(()=>core.persistChange({...first,event:receipt('phantom','03',1)},{state,writeBatch:async()=>[latest]}),/FOLLOWUP_SAVE_FAILED/);
  await assert.rejects(()=>core.persistChange(first,{state,writeBatch:async()=>{throw Error('disk full');}}),/disk full/);
  assert.equal(JSON.stringify(state),before);
});

test('future confirmations, later void and invalid backdating cannot affect current FIFO', () => {
  let s=settings(order());
  assert.throws(()=>append(s,'a',0,{...receipt('r','03',2),at:'2026-10-30T10:00:00Z'}),/INVALID_RECEIPT/);
  s=append(s,'a',0,receipt('r','04',2));
  assert.throws(()=>append(s,'a',1,event('v','void_receipt','03',{receiptId:'r',note:'Earlier'})),/INVALID_REVERSAL/);
  s=append(s,'a',1,event('v','void_receipt','18',{receiptId:'r',note:'Future void'}));
  s=append(s,'a',2,receipt('later','19',5));
  const r=report(s,[invoice('current','06',1),invoice('future','20',2)]);
  assert.equal(r.totals.receivedUnits,2);assert.equal(r.totals.allocatedUnits,1);assert.equal(r.totals.unallocatedUnits,0);
  assert.equal(r.orders[0].revision,3);assert.equal(r.orders[0].events.length,3);assert.equal(r.orders[0].futureEvents,true);
  for(const d of ['futureReceipt','futureDelivery','futureEvent'])assert(codes(r).includes(d));
});

test('legacy credit markers and negative alternative stored totals quarantine uncertain sales', () => {
  const s=append(settings(order()),'a',0,receipt('r','03',5));
  for (const extra of [{type:'creditNote',grandTotal:10},{type:'sale',invoiceType:'credit_note'},{grandTotal:'',grandTotalUSD:-10}]) {
    const r=report(s,[invoice('i','04',5,extra)]);
    assert.equal(r.totals.allocatedUnits,0);assert(codes(r).includes('creditQuantityUnknown'));
  }
  assert.equal(report(s,[invoice('i','04',5,{grandTotal:0})]).totals.allocatedUnits,5);
});

test('remote orders and ledger publish together, hydrate only missing orders, preserve local drafts and reject identity conflicts',async()=>{
  const a=order(),b=order('b'),local=settings(a);local.procurementOrders.draftRevision=4;
  const latest=append(settings(a,b),'b',0,receipt('rb','03',1));
  const state={settings:local},request={orderId:'a',expectedRevision:0,event:receipt('ra','05',1)};
  await core.persistChange(request,{state,writeBatch:async([op])=>[op.merge(latest,op.value)],hydrate:async projection=>{
    assert.deepEqual(projection.procurementOrders.orders.map(o=>o.id),['b']);
    state.settings.procurementOrders.draftRevision=5;
    return projection;
  }});
  assert.deepEqual(state.settings.procurementOrders.orders.map(o=>o.id),['a','b']);
  assert.equal(state.settings.procurementOrders.orders[0],a);assert.equal(state.settings.procurementOrders.draftRevision,5);
  assert.equal(report(state.settings).totals.receivedUnits,2);
  const badLocal=settings(order('a',[line({quantity:37})]),b);
  await assert.rejects(()=>core.publishSnapshot({settings:badLocal},state.settings),/ORDER_HISTORY_INVALID/);
});

test('explicit restore during hydration keeps the restored state and returns the transaction receipt', async () => {
  const base=settings(order()), prior=append(base,'a',0,receipt('first','03',1));
  const state={settings:prior};
  const saved=await core.persistChange({orderId:'a',expectedRevision:1,event:receipt('second','04',1)},{
    state,writeBatch:async ([op])=>[op.merge(prior,op.value)],
    hydrate:async projection=>{state.settings=structuredClone(base);return projection;}
  });
  assert.equal(saved.revision,2);assert(!Object.hasOwn(state.settings.procurementOrders,'followup'));
});

test('idempotency rejects non-scalar types and exact event payload is durable even if hydration touches operational strings',async()=>{
  const s=settings(order());
  assert.throws(()=>append(s,'a',0,event('invalid',['ordered'],'03')),/INVALID_EVENT/);
  const state={settings:s},intent={orderId:'a',expectedRevision:0,event:event('o','ordered','03',{note:'Sample'})};
  const saved=await core.persistChange(intent,{state,writeBatch:async([op])=>[op.merge(s,op.value)],hydrate:async projection=>{
    if (projection.procurementOrders.followup) projection.procurementOrders.followup.records[0].events[0].note='Wrong';
    return projection;
  }});
  assert.equal(saved.events[0].note,'Sample');assert.equal(core.getLedger(state.settings).records[0].events[0].note,'Sample');
});

test('capacity rejects the next append with all operational events retained and permits exact retries at capacity', () => {
  const s=settings(order()),events=Array.from({length:core.limits.maxEventsPerOrder},(_,i)=>event('due-'+i,'expected','04',{expectedDate:''}));
  s.procurementOrders.followup={version:1,revision:events.length,records:[{orderId:'a',revision:events.length,events}]};
  assert.throws(()=>append(s,'a',events.length,receipt('extra','06',1)),/FOLLOWUP_CAPACITY/);
  assert.equal(append(s,'a',0,events[0]),s);
  assert.equal(s.procurementOrders.followup.records[0].events.length,core.limits.maxEventsPerOrder);
});
