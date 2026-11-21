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
  let context;
  const realmCopy = value => value === undefined ? undefined : vm.runInContext('JSON.parse(' + JSON.stringify(JSON.stringify(value)) + ')', context);
  const db = {objectStoreNames:{contains:name => Object.hasOwn(tables,name)}, transaction(names, mode) {
    if (typeof names === 'string') names = [names];
    const staged = Object.fromEntries(names.map(name => [name, new Map(tables[name])]));
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
    queueMicrotask(() => {
      try {
        while (work.length && !aborted) work.shift()();
        if (aborted) {tx.onabort?.(); return;}
        if (mode === 'readwrite') for (const name of names) tables[name] = staged[name];
        tx.oncomplete?.();
      } catch (error) {tx.error = error; tx.onabort?.();}
    });
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
  return {context, tables, run:source => vm.runInContext(source,context), putState:state => vm.runInContext('Object.assign(S,JSON.parse(' + JSON.stringify(JSON.stringify(state)) + '));',context)};
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
  const f=fixture({invoices:[{id:'i',invNo:'A42'}]});
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
});
