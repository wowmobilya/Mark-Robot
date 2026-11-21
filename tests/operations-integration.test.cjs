'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const costPage = fs.readFileSync(path.join(root, 'product-costs.js'), 'utf8');
const imageA = 'data:image/png;base64,QUFB';
const imageB = 'data:image/png;base64,QkJC';
const imageC = 'data:image/png;base64,Q0ND';
const slice = (start, end) => {
  const first = html.indexOf(start);
  assert.notEqual(first, -1, start + ' exists');
  const last = html.indexOf(end, first);
  assert.ok(last > first, end + ' follows ' + start);
  return html.slice(first, last);
};

test('material IDs stay unique after reopening saved rows and importing duplicate IDs', () => {
  const page = require('../product-costs.js');
  assert.equal(typeof page.allocateMaterialId,'function');
  assert.equal(typeof page.normalizeMaterialRows,'function');
  const reserved = new Set(['wf-cost-1','wf-cost-1-2']);
  const allocate = () => page.allocateMaterialId(reserved,()=>'wf-cost-1');
  const rows = page.normalizeMaterialRows([
    {id:'wf-cost-1',name:'Wood',unit:'m²',quantity:2,unitPrice:10},
    {id:'wf-cost-1',name:'Metal',unit:'kg',quantity:3,unitPrice:5},
    {name:'Fabric',quantity:1,unitPrice:7}
  ],allocate);
  const added = {id:allocate(),name:'Paint',quantity:1,unitPrice:8};
  assert.equal(rows.length,3);
  assert.deepEqual(rows.map(row=>row.name),['Wood','Metal','Fabric']);
  assert.deepEqual(rows.map(row=>row.quantity),[2,3,1]);
  assert.deepEqual(rows.map(row=>row.unitPrice),[10,5,7]);
  assert.equal(new Set([...rows.map(row=>row.id),added.id]).size,4);
  assert.equal(rows[0].id,'wf-cost-1');
  assert.notEqual(rows[1].id,'wf-cost-1-2','a different product or pending draft can reserve the same base sequence');
});

function fixture(initial = {}) {
  const tables = Object.fromEntries(['products', 'invoices', 'settings', 'payments', 'media'].map(name => [name, new Map((initial[name] || []).map(row => [row.id, structuredClone(row)]))]));
  let context, nextFailure=null;
  const pendingTransactions=[];
  function runNextTransaction(){
    const next=pendingTransactions[0];if(!next)return;
    try{next();}finally{pendingTransactions.shift();if(pendingTransactions.length)queueMicrotask(runNextTransaction);}
  }
  const realmCopy = value => value === undefined ? undefined : vm.runInContext('JSON.parse(' + JSON.stringify(JSON.stringify(value)) + ')', context);
  const db = {objectStoreNames:{contains:name => Object.hasOwn(tables,name)}, transaction(names, mode) {
    if (typeof names === 'string') names = [names];
    // IndexedDB serializes overlapping read/write transactions. Snapshot at
    // activation, not when transaction() is called, so concurrent callers read
    // the previous committed row rather than a test-only stale snapshot.
    let staged;
    let aborted = false;
    const work = [], request = action => {
      const result = {};
      work.push(() => {result.result = realmCopy(action()); result.onsuccess?.();});
      return result;
    };
    const tx = {
      abort() {aborted = true;},
      objectStore(name) {
        assert.ok(names.includes(name), 'transaction contains ' + name);
        return {
          get:id => request(() => staged[name].get(id)),
          put:row => request(() => {assert.equal(mode,'readwrite'); staged[name].set(row.id, structuredClone(row)); return row.id;}),
          delete:id => request(() => {assert.equal(mode,'readwrite'); staged[name].delete(id);})
        };
      }
    };
    pendingTransactions.push(() => {
      staged=Object.fromEntries(names.map(name => [name,new Map(tables[name])]));
      try {
        while (work.length && !aborted) work.shift()();
        if (aborted) {tx.onabort?.(); return;}
        if(mode==='readwrite'&&nextFailure){const error=nextFailure;nextFailure=null;throw error;}
        if (mode === 'readwrite') for (const name of names) tables[name] = staged[name];
        tx.oncomplete?.();
      } catch (error) {tx.error = error; tx.onabort?.();}
    });
    if(pendingTransactions.length===1)queueMicrotask(runNextTransaction);
    return tx;
  }};
  context = vm.createContext({db, Blob, console, structuredClone, setTimeout, clearTimeout,
    WOWStatementCore:require('../account-statement-core.js'), wfStorageWriteError(){}});
  vm.runInContext('window=globalThis; var S={products:[],invoices:[],companies:[],payments:[],settings:{},usdTry:40,usdEur:0.92};', context);
  for (const file of ['product-cost-core.js', 'invoice-archive-core.js']) vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),context);
  vm.runInContext(slice('const WF_MEDIA_STORE=','// A tablet may suspend') +
    slice('async function wfWriteBatch(','const dbPutRaw=') +
    slice('async function wfLoadMediaIds(','async function wfPutMediaRows('), context);
  context.module = {exports:{}};
  context.require = () => context.WFCostCore;
  vm.runInContext(costPage, context);
  return {context, tables, run:source => vm.runInContext(source,context), failNext:error=>{nextFailure=error;},putState:state => vm.runInContext('Object.assign(S,JSON.parse(' + JSON.stringify(JSON.stringify(state)) + '));',context)};
}

test('the live costing save loads newer product media before publishing the merged product', async () => {
  const f = fixture({products:[{id:'p',name:'Updated product',image:'wfmedia:new',priceA:140}],media:[{id:'new',data:imageB,kind:'image'}]});
  f.putState({products:[{id:'p',name:'Old product',image:imageA,priceA:100}]});
  const start = costPage.indexOf('saved = await persistProductCosting(');
  assert.ok(start >= 0);
  const end = costPage.indexOf('});', start) + 3;
  const liveSaveCall = costPage.slice(start,end).replace('saved = await', 'return await');
  const result = await f.run(`(async()=>{
    const persistProductCosting=module.exports.persistProductCosting, ops={state:()=>S}, id='p';
    const model={data:{currency:'USD',materials:[],labor:'25',overhead:'',rates:{usdTry:40,usdEur:0.92}}};
    ${liveSaveCall}
  })()`);
  assert.equal(result.image,imageB, 'the latest media reference is loaded from the media store');
  assert.equal(f.run('S.products[0].image'),imageB);
  assert.equal(f.run('S.products[0].name'),'Updated product');
  assert.equal(f.run('S.products[0].priceA'),140);
  assert.equal(f.run('S.products[0].costing.unitCostUSD'),25);
  assert.equal(f.tables.products.get('p').image,'wfmedia:new');
});

test('archive transitions use the real storage media transaction and preserve explicit unknown cost snapshots', async () => {
  const original = {id:'i',companyLogo:'wfmedia:buyer',currency:'TRY',usdTry:40,grandTotal:120,subtotalUSD:100,discountUSD:0,items:[
    {productId:'p',qty:2,totalUSD:80,image:'wfmedia:buyer'},
    {productId:'p',qty:1,totalUSD:20,costSnapshot:null}
  ]};
  const f=fixture({invoices:[original],media:[{id:'buyer',data:imageB,kind:'image'}]});
  f.putState({products:[{id:'p',costing:{version:1,currency:'USD',unitCostUSD:25,rates:{usdTry:40,usdEur:.92}}}],invoices:[original]});
  f.context.issuerImage=imageC;
  const saved=await f.run(`WFInvoiceArchiveCore.commitTransition({id:'i',action:'archive',capturedAt:'2026-11-20T12:00:00.000Z',issuerLogo:issuerImage},{
    writeBatch:wfWriteBatch,hydrate:wfHydrateDBValue,
    captureCosts:(invoice,at)=>WFCostCore.captureInvoiceCosts(invoice,S.products,at),
    apply:invoice=>{S.invoices[0]=invoice;}
  })`);
  assert.equal(saved.packageLabelSnapshot.companyLogo,imageC);
  assert.equal(saved.packageLabelSnapshot.customerLogo,imageB);
  assert.equal(saved.items[0].image,imageB);
  assert.equal(saved.items[0].costSnapshot.unitCostUSD,25);
  assert.equal(saved.items[1].costSnapshot,null);
  assert.equal(saved.archiveCostCapturedAt,'2026-11-20T12:00:00.000Z');
  const raw=f.tables.invoices.get('i');
  assert.match(raw.packageLabelSnapshot.companyLogo,/^wfmedia:/);
  assert.equal(raw.packageLabelSnapshot.customerLogo,'wfmedia:buyer');
  assert.equal(f.tables.media.size,2);
  const summary=f.run('WFCostCore.invoiceSummary(S.invoices[0])');
  assert.equal(summary.status,'partial');
  assert.equal(summary.knownCostUSD,50);
  assert.equal(summary.profitUSD,null);
});

test('the actual invoice save hook snapshots missing costs while retaining USD totals and historical nulls', async () => {
  const ticket={version:1,lines:[{id:'line',status:'completed',item:{image:'wfmedia:workshop'}}]};
  const f=fixture({invoices:[{id:'i',invNo:'A42',manufacturingTicket:ticket}],media:[{id:'workshop',data:imageB,kind:'image'}]});
  f.putState({
    editInvId:'i',invCurrency:'TRY',invType:'external',invTier:'A',invPayMethod:'cash',kdvEnabled:true,printLang:'en',printOpts:{},
    settings:{kdvRate:20},currentInvPayments:[],
    invoices:[{id:'i',invNo:'A42',companyId:'c',createdAt:'2025-01-01T00:00:00Z'}],
    companies:[{id:'c',name:'Buyer',type:'external'}],
    products:[{id:'p',costing:{unitCostUSD:999}},{id:'new',costing:{unitCostUSD:25}}],
    invItems:[{productId:'p',qty:1,totalUSD:60,cbm:0,packets:1,costSnapshot:{unitCostUSD:10,capturedAt:'2025-01-01T00:00:00Z'}},
      {productId:'p',qty:1,totalUSD:60,cbm:0,packets:1,costSnapshot:null},
      {productId:'new',qty:1,totalUSD:80,cbm:0,packets:1}]
  });
  const fields={invCoSel:'c',sumDiscount:'20',sumDeposit:'0',invRegDate:'2026-11-20',invLoadDate:'2026-12-01',invDeliveryDate:'',invPlate:'',invTruck:'',invNotes:''};
  f.context.document={getElementById:id=>({value:fields[id] || ''})};
  for(const name of ['showToast','qblUpdateCartUI','updateDash','showPage']) f.context[name]=()=>{};
  f.context.t=key=>key;
  f.context.getAutoInvNo=()=> 'A99';
  f.context.wfStatementPaymentUSD=()=>0;
  f.run('WFCosting={captureInvoiceCosts:invoice=>WFCostCore.captureInvoiceCosts(invoice,S.products)};');
  f.run(slice('async function saveInvoice(){','function setInvTab('));
  await f.run('saveInvoice()');
  const saved=f.tables.invoices.get('i');
  assert.equal(saved.currency,'TRY');
  assert.equal(saved.subtotalUSD,200);
  assert.equal(saved.discountUSD,20);
  assert.equal(saved.kdvAmtUSD,36);
  assert.equal(saved.grandTotal,216, 'invoice currency does not multiply canonical totals');
  assert.equal(saved.items[0].costSnapshot.unitCostUSD,10);
  assert.equal(saved.items[1].costSnapshot,null);
  assert.equal(saved.items[2].costSnapshot.unitCostUSD,25);
  assert.deepEqual(saved.manufacturingTicket,ticket,'editing from an older tab retains the latest workshop status');
  assert.equal(f.run('S.invoices[0].manufacturingTicket.lines[0].item.image'),imageB,'the committed ticket is hydrated before publication');
});

test('legacy full-row saves preserve independently owned sections and keep the ordinary put return contract',async()=>{
  for(const [store,id,section] of [['settings','main','materialLibrary'],['settings','main','labelReprintHistory'],['settings','main','dailyTasks'],['settings','main','procurementOrders'],['invoices','i','manufacturingTicket']]){
    for(const value of [undefined,null,{version:1,updatedAt:'latest'},{version:7,extension:'future'}]){
      const latest={id,other:'latest'};if(value!==undefined)latest[section]=value;
      const f=fixture({[store]:[latest]});
      f.context.operation={store,value:{id,other:'submitted',[section]:{version:1,updatedAt:'stale'}}};
      assert.equal(await f.run('wfWriteBatch([operation]).then(rows=>rows[0])'),id);
      const saved=f.tables[store].get(id);
      assert.equal(saved.other,'submitted');
      assert.deepEqual(saved[section],value);
      assert.equal(Object.hasOwn(saved,section),value!==undefined,'absence after a restore also wins over a stale tab');
      f.context.operation.returnRecord=true;
      const returned=await f.run('wfWriteBatch([operation]).then(rows=>rows[0])');
      assert.equal(returned.id,id);
      assert.deepEqual(structuredClone(returned),f.tables[store].get(id));
    }
  }
});

test('explicit section merges can update protected data and a missing invoice aborts the entire payment batch',async()=>{
  const f=fixture({settings:[{id:'main',materialLibrary:{version:1,materials:[]}}]});
  await f.run("wfWriteBatch([{store:'settings',type:'merge',id:'main',value:{id:'m'},merge:(latest,material)=>({...latest,materialLibrary:{version:1,materials:[material]}})}])");
  assert.deepEqual(f.tables.settings.get('main').materialLibrary.materials,[{id:'m'}]);
  await assert.rejects(f.run("wfWriteBatch([{store:'payments',value:{id:'p',invoiceId:'gone',amountUSD:10}},{store:'invoices',value:{id:'gone'},requireExisting:true,returnRecord:true}])"),/MISSING_INVOICE/);
  assert.equal(f.tables.payments.size,0);assert.equal(f.tables.invoices.size,0);
});

test('actual payment add and delete handlers publish the latest manufacturing ticket with its media',async()=>{
  const stored={id:'i',companyName:'Buyer',companyId:'c',currency:'USD',grandTotal:100,depositUSD:0,payments:[],manufacturingTicket:{version:1,lines:[{id:'l',status:'in_progress',item:{image:'wfmedia:workshop'}}]}};
  const f=fixture({invoices:[stored],media:[{id:'workshop',data:imageB,kind:'image'}]});
  f.putState({invoices:[{...stored,manufacturingTicket:null}],currentPayInvId:'i',lang:'en'});
  const fields=Object.fromEntries(Object.entries({pmNewAmt:'20',pmNewNote:'Deposit',pmNewDate:'2026-11-21',pmCurrConvAlert:'',pmSmartNotePreview:''}).map(([id,value])=>[id,{value,style:{}}]));
  Object.assign(f.context,{document:{getElementById:id=>fields[id]},PM_STATE:{currency:'USD',invCurrency:'USD',receiptType:'cash'},RECEIPT_TYPE_LABELS:{en:{cash:'Cash'}},symOf:()=>'$ ',wfNewRecordId:()=>'pay',t:key=>key,wfStatementLabel:key=>key});
  for(const name of ['showToast','renderPayHistory','renderInvList','updateDash'])f.context[name]=()=>{};
  f.context.wfStatementInvoicePayments=invoice=>invoice.payments||[];
  f.context.wfStatementPaymentUSD=(payment,invoice)=>f.context.WOWStatementCore.paymentValue(payment,invoice).amountUSD;
  f.context.openDM=(_,callback)=>{f.context.pendingDelete=callback();};
  f.run(slice('async function addPaymentToInv()','function editInv(id)'));
  await f.run('addPaymentToInv()');
  assert.equal(f.tables.payments.get('pay').amountUSD,20);
  assert.equal(f.run('S.invoices[0].totalPaidUSD'),20);
  assert.equal(f.run('S.invoices[0].manufacturingTicket.lines[0].status'),'in_progress');
  assert.equal(f.run('S.invoices[0].manufacturingTicket.lines[0].item.image'),imageB);
  const newer=structuredClone(f.tables.invoices.get('i'));newer.manufacturingTicket.lines[0].status='completed';f.tables.invoices.set('i',newer);
  await f.run("deletePayment('pay','i');pendingDelete");
  assert.equal(f.tables.payments.size,0);
  assert.equal(f.run('S.invoices[0].totalPaidUSD'),0);
  assert.equal(f.run('S.invoices[0].manufacturingTicket.lines[0].status'),'completed');
  assert.equal(f.run('S.invoices[0].manufacturingTicket.lines[0].item.image'),imageB);
});

test('committed invoice publication respects newer visible edits and deletion while images load',async()=>{
  for(const replacement of [{id:'i',manufacturingTicket:{version:1,status:'newer'}},undefined]){
    const f=fixture({invoices:[{id:'i'}]});f.putState({invoices:[{id:'i',old:true}]});
    let finish;f.context.hydrationBarrier=new Promise(resolve=>{finish=resolve});
    f.run('wfHydrateDBValue=async row=>{await hydrationBarrier;return row};');
    f.context.replacement=replacement;
    f.context.dbGet=async()=>replacement;
    const pending=f.run("wfPublishCommittedInvoice({id:'i',manufacturingTicket:{status:'older'}},S.invoices[0])");
    f.run('S.invoices=replacement?[replacement]:[]');finish();await pending;
    assert.deepEqual(structuredClone(f.run('S.invoices')),replacement?[replacement]:[]);
  }
});

test('settings publication retains each independent section during hydration and honors explicit removal',async()=>{
  for(const section of ['materialLibrary','labelReprintHistory','dailyTasks','procurementOrders'])for(const replacement of [{version:1,revision:9,items:[{id:'new'}]},null,undefined]){
    const f=fixture();f.putState({settings:{[section]:{version:1,revision:1,items:[]},companyName:'Before'}});
    f.run('var beforeSettings={...S.settings}');
    let finish;f.context.hydrationBarrier=new Promise(resolve=>{finish=resolve});
    f.run('wfHydrateDBValue=async row=>{await hydrationBarrier;return row};');
    f.context.replacement=replacement;f.context.section=section;
    const pending=f.run("wfPublishCommittedSettings({id:'main',companyName:'Saved',[section]:{version:1,revision:2,items:[{id:'old'}]}},beforeSettings)");
    f.run('if(replacement===undefined)delete S.settings[section];else S.settings[section]=replacement');
    finish();await pending;
    assert.equal(f.run('S.settings.companyName'),'Saved');
    assert.deepEqual(structuredClone(f.run('S.settings[section]')),replacement);
    assert.equal(f.run('Object.hasOwn(S.settings,section)'),replacement!==undefined);
  }
  const f=fixture();f.putState({settings:{materialLibrary:{version:1,materials:[]}}});
  f.run('var beforeSettings={...S.settings};S.settings.materialLibrary={version:1,materials:[{id:"before-hydration"}]}');
  await f.run('wfPublishCommittedSettings({id:"main",materialLibrary:{version:1,materials:[]}},beforeSettings)');
  assert.equal(f.run('S.settings.materialLibrary.materials[0].id'),'before-hydration');
});

function reprintRequest(id='print-1',invoiceId='invoice-1'){
  return require('../label-reprint-history-core.js').createRequest({invoiceId,invoiceNumber:'W-42',customerName:'Sale customer',mode:'selected',
    profileId:'tw2004',sourceFingerprint:'wfpl-v1-11223344',originalLabelCount:4,selectedLabelCount:1,
    labels:[{labelId:'original-label-3',sequenceNumber:3,lineIndex:0,productId:'p1',name:'Table',color:'Oak',unitIndex:1,currentPacket:2,totalPackets:2,quantity:2}]},
    {id,now:'2026-11-21T10:00:00.000Z'});
}

test('concurrent independent workspace merges and a stale legacy save retain all four sections through the actual storage writer',async()=>{
  const invoice={id:'invoice-1',items:[{qty:2,packets:2}],grandTotal:100},product={id:'p1',stock:25};
  const f=fixture({settings:[{id:'main',companyName:'Before'}],invoices:[invoice],products:[product]});
  Object.assign(f.context,{reprintCore:require('../label-reprint-history-core.js'),tasksCore:require('../daily-tasks-core.js'),request:reprintRequest()});
  await f.run(`Promise.all([
    reprintCore.commit({type:'request',request},{writeBatch:wfWriteBatch}),
    tasksCore.commit({type:'create',at:'2026-11-21T10:00:00.000Z',task:{id:'task-1',title:'Review W-42',priority:'normal',status:'open'}},{writeBatch:wfWriteBatch}),
    wfWriteBatch([{store:'settings',type:'merge',id:'main',value:{id:'wood'},merge:(latest,value)=>({...latest,materialLibrary:{version:1,materials:[value]}})}]),
    wfWriteBatch([{store:'settings',type:'merge',id:'main',value:{id:'order-1'},merge:(latest,value)=>({...latest,procurementOrders:{version:1,orders:[value]}})}]),
    wfWriteBatch([{store:'settings',value:{id:'main',companyName:'Edited brand',materialLibrary:null,labelReprintHistory:null,dailyTasks:null,procurementOrders:null}}])
  ])`);
  const saved=f.tables.settings.get('main');
  assert.equal(saved.companyName,'Edited brand');assert.equal(saved.materialLibrary.materials[0].id,'wood');
  assert.equal(saved.labelReprintHistory.entries[0].id,'print-1');assert.equal(saved.labelReprintHistory.entries[0].labels[0].sequenceNumber,3);
  assert.equal(saved.dailyTasks.items[0].title,'Review W-42');assert.equal(saved.procurementOrders.orders[0].id,'order-1');
  assert.deepEqual(f.tables.invoices.get('invoice-1'),invoice);assert.deepEqual(f.tables.products.get('p1'),product);assert.equal(f.tables.payments.size,0);
});

test('a late transaction failure rolls back the audit and media together and never publishes or schedules a backup',async()=>{
  const initial={id:'main',companyName:'Before',dailyTasks:{version:1,revision:0,items:[]}};
  const f=fixture({settings:[initial]});
  Object.assign(f.context,{reprintCore:require('../label-reprint-history-core.js'),request:reprintRequest(),image:imageA,published:0,backups:0});
  f.run('wfDriveOnDatabaseCommit=()=>{backups++}');
  f.failNext(Error('disk full after staged puts'));
  await assert.rejects(f.run(`reprintCore.commit({type:'request',request},{writeBatch:operations=>wfWriteBatch([
    ...operations,{store:'products',value:{id:'image-product',image}}
  ]),publish:()=>{published++}})`),/disk full/);
  assert.deepEqual(f.tables.settings.get('main'),initial);assert.equal(f.tables.products.size,0);assert.equal(f.tables.media.size,0);
  assert.equal(f.run('published'),0);assert.equal(f.run('backups'),0);
});

test('the actual writer rejects reprint ID collisions across source invoices and stale concurrent task edits',async()=>{
  const f=fixture({settings:[{id:'main'}]});
  Object.assign(f.context,{reprintCore:require('../label-reprint-history-core.js'),tasksCore:require('../daily-tasks-core.js'),first:reprintRequest('same','invoice-1'),second:reprintRequest('same','invoice-2')});
  const results=await f.run(`Promise.allSettled([
    reprintCore.commit({type:'request',request:first},{writeBatch:wfWriteBatch}),
    reprintCore.commit({type:'request',request:second},{writeBatch:wfWriteBatch})
  ])`);
  assert.deepEqual(Array.from(results,item=>item.status),['fulfilled','rejected']);assert.match(results[1].reason.message,/ID_COLLISION/);
  assert.equal(f.tables.settings.get('main').labelReprintHistory.entries.length,1);assert.equal(f.tables.settings.get('main').labelReprintHistory.entries[0].invoiceId,'invoice-1');
  await f.run("tasksCore.commit({type:'create',at:'2026-11-21T10:00:00.000Z',task:{id:'t',title:'Original'}},{writeBatch:wfWriteBatch})");
  const edits=await f.run(`Promise.allSettled([
    tasksCore.commit({type:'update',id:'t',expectedRevision:1,patch:{status:'done'},at:'2026-11-21T11:00:00.000Z'},{writeBatch:wfWriteBatch}),
    tasksCore.commit({type:'update',id:'t',expectedRevision:1,patch:{title:'Stale overwrite'},at:'2026-11-21T11:01:00.000Z'},{writeBatch:wfWriteBatch})
  ])`);
  assert.deepEqual(Array.from(edits,item=>item.status),['fulfilled','rejected']);assert.match(edits[1].reason.message,/TASK_CHANGED/);
  const row=f.tables.settings.get('main').dailyTasks.items[0];assert.equal(row.title,'Original');assert.equal(row.status,'done');assert.equal(row.revision,2);
});

test('settings hydration publishes newer committed sections when visible state did not independently change',async()=>{
  const f=fixture(),fields=['materialLibrary','labelReprintHistory','dailyTasks','procurementOrders'];
  f.context.sections=fields;f.run('S.settings=Object.fromEntries(sections.map(key=>[key,{revision:1}]));var beforeSettings={...S.settings};');
  await f.run("wfPublishCommittedSettings({id:'main',...Object.fromEntries(sections.map(key=>[key,{revision:2}]))},beforeSettings)");
  for(const field of fields)assert.equal(f.run('S.settings['+JSON.stringify(field)+'].revision'),2);
});
