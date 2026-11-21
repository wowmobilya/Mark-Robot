const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const file = path.join(__dirname, '../label-reprint-history-core.js');
const core = fs.existsSync(file) ? require(file) : {};
const time = '2026-11-21T10:00:00.000Z';
const later = '2026-11-21T10:01:00.000Z';
const job = () => ({
  invoiceId:'invoice-1', invoiceNumber:'W-102', customerName:'İpek', sourceFingerprint:'wfpl-v1-a1b2c3d4',
  profileId:'tw2004', paperProfile:{id:'tw2004', name:'Tanex TW-2004', mediaType:'sheet', pageWidthMM:210, pageHeightMM:297, stockWidthMM:99.1, stockHeightMM:139, columns:2, rows:2},
  originalLabelCount:6, selectedLabelCount:2, mode:'selected', requestedAt:time,
  labels:[
    {labelId:'["invoice-1",0,1,2]',sequenceNumber:2,lineIndex:0,productId:'p1',name:'Oak table',color:'Natural',unitIndex:2,currentPacket:1,totalPackets:3,quantity:2,barcodeText:'Oak table - Packet 1/3'},
    {labelId:'["invoice-1",0,3,1]',sequenceNumber:5,lineIndex:0,productId:'p1',name:'Oak table',color:'Natural',unitIndex:1,currentPacket:3,totalPackets:3,quantity:2,barcodeText:'Oak table - Packet 3/3'}
  ]
});
const request = (id='r1', changes={}) => core.createRequest({...job(),...changes},{id,reason:'lost',now:time,operator:{name:'Configured operator',source:'settings.authPerson'}});
const ask = record => ({type:'request',request:record});
const event = (id,type,at=later,extra={}) => ({type:'event',id,event:{type,at,...extra}});
const initial = () => ({id:'main',companyName:'WOW',authPerson:'Configured operator',materialLibrary:{materials:[{id:'wood'}]}});

test('captures an immutable exact subset without renumbering or changing the invoice data', () => {
  assert.equal(typeof core.createRequest,'function');
  const source=job(), original=structuredClone(source);
  const captured=core.createRequest(source,{id:'request-1',reason:'damaged',reasonNote:'Two damaged stickers',now:time});
  assert.deepEqual(source,original);
  assert.deepEqual(captured.labels.map(label=>label.sequenceNumber),[2,5]);
  assert.deepEqual(captured.labels.map(label=>[label.currentPacket,label.unitIndex]),[[1,2],[3,1]]);
  assert.equal(captured.originalLabelCount,6);assert.equal(captured.selectedLabelCount,2);
  assert.equal(captured.status,'requested');assert.equal(captured.reason,'damaged');
  assert.equal(captured.reasonNote,'Two damaged stickers');
  assert.equal(captured.requestedAt,time);assert.equal(captured.events.length,1);
  assert.equal(captured.events[0].type,'requested');
  assert(Object.isFrozen(captured));assert(Object.isFrozen(captured.labels[0]));assert(Object.isFrozen(captured.paperProfile));
  source.labels[0].name='Changed after request';source.paperProfile.stockWidthMM=1;
  assert.equal(captured.labels[0].name,'Oak table');assert.equal(captured.paperProfile.stockWidthMM,99.1);
  assert.equal(captured.operator,null,'unidentified users are never guessed');
});

test('rejects duplicate or inconsistent label identities and invalid requests before writing', () => {
  const samples=[
    {labels:[]}, {selectedLabelCount:3}, {originalLabelCount:1}, {mode:'all'}, {invoiceId:''},
    {labels:[job().labels[0],job().labels[0]]},
    {labels:[{...job().labels[0],sequenceNumber:7},job().labels[1]]},
    {labels:[{...job().labels[0],currentPacket:4},job().labels[1]]}
  ];
  for(const sample of samples)assert.throws(()=>request('r1',sample),/INVALID_/);
  assert.throws(()=>core.createRequest(job(),{id:'r1',reason:'invented',now:time}),/INVALID_REASON/);
  assert.throws(()=>core.createRequest(job(),{id:'r1',now:'tomorrow'}),/INVALID_DATE/);
});

test('appends to the latest settings and protects previous immutable records against ID collision', () => {
  const original=initial(), snapshot=structuredClone(original), first=request();
  const one=core.mergeChange(original,ask(first));
  const two=core.mergeChange({...one,companyName:'Concurrent company edit'},ask(request('r2')));
  assert.deepEqual(original,snapshot);assert.equal(one.labelReprintHistory.entries.length,1);
  assert.equal(two.companyName,'Concurrent company edit');assert.deepEqual(two.materialLibrary,original.materialLibrary);
  assert.equal(two.labelReprintHistory.entries.length,2);assert.equal(two.labelReprintHistory.revision,2);
  const replay=core.mergeChange(two,ask(first));
  assert.equal(replay.labelReprintHistory.entries.length,2);assert.equal(replay.labelReprintHistory.revision,2);
  assert.throws(()=>core.mergeChange(two,ask(request('r1',{customerName:'Different snapshot'}))),/ID_COLLISION/);
  assert.equal(two.labelReprintHistory.entries[0].customerName,'İpek');
});

test('dialog closure never claims physical printing and confirmations remain append-only', () => {
  let saved=core.mergeChange(initial(),ask(request()));
  saved=core.mergeChange(saved,event('r1','dialog_closed'));
  const pending=saved.labelReprintHistory.entries[0];
  assert.equal(pending.status,'awaiting_confirmation');
  assert.deepEqual(pending.events.map(item=>item.type),['requested','dialog_closed']);
  saved=core.mergeChange(saved,event('r1','printed','2026-11-21T10:02:00.000Z'));
  const printed=saved.labelReprintHistory.entries[0];
  assert.equal(printed.status,'printed');
  assert.deepEqual(printed.events.map(item=>item.type),['requested','dialog_closed','printed']);
  assert.equal(pending.status,'awaiting_confirmation');
  assert.deepEqual(printed.labels.map(label=>label.sequenceNumber),[2,5]);
  assert.equal(core.mergeChange(saved,event('r1','dialog_closed')).labelReprintHistory.revision,3);
  assert.equal(core.mergeChange(saved,event('r1','printed')).labelReprintHistory.revision,3);
  assert.throws(()=>core.mergeChange(saved,event('r1','cancelled')),/ALREADY_RESOLVED/);
});

test('failed and cancelled attempts stay distinct from printed, including an unresolved request restored after reload', () => {
  const pending=core.mergeChange(initial(),ask(request()));
  const cancelled=core.mergeChange(pending,event('r1','cancelled'));
  assert.equal(cancelled.labelReprintHistory.entries[0].status,'cancelled');
  const failed=core.mergeChange(pending,event('r1','failed',later,{message:'Print dialog unavailable'}));
  assert.equal(failed.labelReprintHistory.entries[0].status,'failed');
  assert.equal(failed.labelReprintHistory.entries[0].events.at(-1).message,'Print dialog unavailable');
  assert.equal(core.forInvoice(pending,'invoice-1')[0].status,'requested');
  assert.deepEqual(core.summary(core.forInvoice(cancelled,'invoice-1')),{requests:1,requestedLabels:2,printedLabels:0,pending:0,cancelled:1,failed:0});
});

test('concurrent appends and outcomes merge atomically without touching invoices, accounting, or inventory', async () => {
  let stored=initial(), queue=Promise.resolve();
  const external={invoices:[{id:'invoice-1',items:[{qty:2,packets:3}],grandTotal:100,paid:25}],products:[{id:'p1',stock:9}],payments:[{amount:25}]};
  const original=structuredClone(external), published=[];
  const writeBatch=operations=>{
    const run=queue.then(()=>{
      assert.equal(operations.length,1);
      const op=operations[0];assert.equal(op.store,'settings');assert.equal(op.id,'main');assert.equal(op.type,'merge');
      stored=op.merge(stored,structuredClone(op.value));
      return [structuredClone(stored)];
    });queue=run.catch(()=>{});return run;
  };
  const deps={writeBatch,publish:history=>published.push(history)};
  const ids=await Promise.all([core.commit(ask(request('r1')),deps),core.commit(ask(request('r2')),deps)]);
  assert.deepEqual(ids.map(row=>row.id),['r1','r2']);
  assert.equal(stored.labelReprintHistory.entries.length,2);
  await Promise.all([core.commit(event('r1','printed'),deps),core.commit(event('r2','cancelled'),deps)]);
  assert.deepEqual(core.forInvoice(stored,'invoice-1').map(row=>row.status).sort(),['cancelled','printed']);
  assert.deepEqual(external,original);assert.equal(published.at(-1).revision,4);
});

test('a failed database commit never publishes a phantom reprint', async () => {
  let published=false;
  await assert.rejects(core.commit(ask(request()),{
    writeBatch:async operations=>{operations[0].merge(initial(),operations[0].value);throw Error('storage full');},
    publish:()=>{published=true;}
  }),/storage full/);
  assert.equal(published,false);
});

test('retention removes only oldest resolved requests and blocks instead of dropping unresolved audit details', () => {
  let saved=initial();
  for(const id of ['r1','r2','r3'])saved=core.mergeChange(saved,ask(request(id)),{maxEntries:3,maxLabels:6});
  assert.throws(()=>core.mergeChange(saved,ask(request('r4')),{maxEntries:3,maxLabels:6}),/HISTORY_CAPACITY/);
  saved=core.mergeChange(saved,event('r1','cancelled'),{maxEntries:3,maxLabels:6});
  saved=core.mergeChange(saved,ask(request('r4')),{maxEntries:3,maxLabels:6});
  assert.deepEqual(saved.labelReprintHistory.entries.map(row=>row.id),['r2','r3','r4']);
  assert.equal(saved.labelReprintHistory.prunedCount,1);
  assert.equal(saved.labelReprintHistory.entries[0].status,'requested');
});

test('report reads are invoice-specific, newest first and detached from saved data without modifying history', () => {
  let saved=core.mergeChange(initial(),ask(request('first')));
  saved=core.mergeChange(saved,ask(request('other',{invoiceId:'other-invoice'})));
  saved=core.mergeChange(saved,ask(request('last',{requestedAt:later})));
  const before=JSON.stringify(saved), records=core.forInvoice(saved,'invoice-1');
  assert.deepEqual(records.map(row=>row.id),['last','first']);
  assert(Object.isFrozen(records[0].labels[0]));
  assert.equal(JSON.stringify(saved),before);
  assert.deepEqual(core.forInvoice(saved,'unknown'),[]);
  assert.throws(()=>core.mergeChange({id:'main',labelReprintHistory:{version:99,entries:[]}},ask(request())),/INVALID_HISTORY/);
});

test('full report filters by invoice/customer and outcome without including other invoices or counting cancelled labels as printed', () => {
  let saved=core.mergeChange(initial(),ask(request('first')));
  saved=core.mergeChange(saved,ask(request('other',{invoiceId:'other-invoice',invoiceNumber:'X-99',customerName:'Ирина'})));
  saved=core.mergeChange(saved,event('first','cancelled'));
  assert.deepEqual(core.filter(saved,{query:'ipek'}).map(row=>row.id),['first']);
  assert.deepEqual(core.filter(saved,{query:'W-١٠٢'}).map(row=>row.id),['first']);
  assert.deepEqual(core.filter(saved,{status:'pending'}).map(row=>row.id),['other']);
  assert.deepEqual(core.filter(saved,{status:'printed'}),[]);
  assert.deepEqual(core.filter(saved,{invoiceId:'invoice-1',status:'cancelled'}).map(row=>row.id),['first']);
});
