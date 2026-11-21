const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const core = require('../invoice-archive-core.js');
const costing = require('../product-cost-core.js');
const source = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8').replaceAll('\r\n','\n');
const delivery = source.slice(source.indexOf('let _deliverModalCallback'),source.indexOf("document.addEventListener('DOMContentLoaded'",source.indexOf('function unarchiveInv')));
const pos = source.indexOf('const list=[...S.invoices].reverse().filter(inv=>',source.indexOf('function renderInvList'));
const listFilter = source.slice(pos, source.indexOf('if(!list.length)', pos));

function fixture() {
  const id = 'W-170';
  const row = {
    id, invNo:'A170', companyName:'Sale customer', companyLogo:'wf-media:buyer', delivered:false,
    payments:[], items:[{productId:'p',name:'Saved chair',image:'wf-media:photo',qty:2}]
  };
  const state = {invoices:[structuredClone(row)], products:[{id:'p',costing:{unitCostUSD:25}}], settings:{logo:'/issuer.png'},companies:[],lang:'en'};
  const events = [];
  let stored = structuredClone(row), barrier, fail = false;
  const context = {
    S:state, document:{getElementById:()=>null},
    showToast:message=>events.push(message), renderInvList:()=>events.push('list'), updateDash:()=>events.push('dashboard'),
    WFInvoiceArchiveCore:core,
    WFCosting:{captureInvoiceCosts:(invoice,at)=>costing.captureInvoiceCosts(invoice,state.products,at)},
    wfCompanyLogo:logo=>logo,
    dbPut(){throw Error('delivery overwrote the invoice');},
    async wfWriteBatch([op]) {
      assert.equal(op.store,'invoices');
      assert.equal(op.type,'merge');
      assert.equal(op.id,id);
      const prepared = {...op.value};
      if (prepared.issuerLogo != null) {
        assert.equal(prepared.issuerLogo,'/issuer.png');
        prepared.issuerLogo = 'wf-media:issuer';
      }
      const next = op.merge(stored,prepared);
      if (barrier) await barrier;
      if (fail) throw Error('quota');
      stored = structuredClone(next);
      return [structuredClone(next)];
    },
    wfHydrateDBValue:async value=>JSON.parse(JSON.stringify(value).replaceAll('wf-media:issuer','/issuer.png')
      .replaceAll('wf-media:buyer','/buyer.png').replaceAll('wf-media:photo','/photo.png'))
  };
  context.window=context;
  vm.runInNewContext(delivery,context);
  return {context,id,state,events,stored:()=>stored,edit:r=>{stored=r;},delay:p=>{barrier=p;},fail:v=>{fail=v;}};
}

test('delivery confirmation merges the freshest invoice and publishes hydrated media and status only after commit', async () => {
  const f = fixture();
  f.context.markDelivered(f.id);
  const latest = f.stored();
  latest.payments.push({id:'p1',amountUSD:21});
  latest.totalPaidUSD=21;
  latest.notes='Order changed while delivery confirmation was open';
  latest.items[0].name='Updated sale line';
  let finish;
  f.delay(new Promise(resolve=>{finish=resolve;}));
  const commit=f.context.confirmDeliverModal();
  assert.equal(f.state.invoices[0].delivered,false);
  assert.deepEqual(f.events,[]);
  finish();await commit;
  const saved=f.state.invoices[0];
  assert.equal(saved.delivered,true);
  assert.equal(saved.archived,true);
  assert.equal(saved.archiveCostCapturedAt,saved.archivedAt);
  assert.equal(saved.deliveredAt,saved.archivedAt);
  assert.deepEqual(saved.payments,[{id:'p1',amountUSD:21}]);
  assert.equal(saved.totalPaidUSD,21);
  assert.equal(saved.notes,latest.notes);
  assert.equal(saved.items[0].name,'Updated sale line');
  assert.equal(saved.items[0].image,'/photo.png');
  assert.equal(saved.items[0].costSnapshot.unitCostUSD,25);
  assert.equal(saved.packageLabelSnapshot.companyLogo,'/issuer.png');
  assert.equal(saved.packageLabelSnapshot.customerLogo,'/buyer.png');
  assert.equal(f.stored().packageLabelSnapshot.companyLogo,'wf-media:issuer');
  assert.deepEqual(f.events.slice(-2),['list','dashboard']);
});

test('write rejection supports retry and a concurrent deletion never recreates the invoice', async () => {
  const f=fixture();
  const before=structuredClone(f.state.invoices[0]);
  f.context.markDelivered(f.id);
  f.fail(true);
  await assert.rejects(f.context.confirmDeliverModal(),/quota/);
  assert.deepEqual(f.state.invoices[0],before);
  assert.deepEqual(f.stored(),before);
  assert.deepEqual(f.events,[]);
  f.fail(false);
  f.edit(undefined);
  await assert.rejects(f.context.confirmDeliverModal(),/MISSING_INVOICE/);
  assert.equal(f.stored(),undefined);
  assert.deepEqual(f.state.invoices[0],before);
  assert.deepEqual(f.events,[]);
  f.edit({...before,items:[{...before.items[0],costSnapshot:null}],packageLabelSnapshot:{version:1,companyLogo:null,customerLogo:null,capturedAt:'2025-12-20'}});
  await f.context.confirmDeliverModal();
  assert.equal(f.stored().items[0].costSnapshot,null);
  assert.equal(f.stored().packageLabelSnapshot.companyLogo,null);
  assert.equal(f.stored().packageLabelSnapshot.capturedAt,'2025-12-20');
});

test('repeated delivery preserves original dates and a legacy restore preserves delivery, payments and snapshots', async () => {
  const f=fixture();
  f.edit({...f.stored(), archived:true,archivedAt:'2025-03-06',delivered:true,deliveredAt:'2025-03-05',payments:[{id:1}],items:[{costSnapshot:null}]});
  f.context.markDelivered(f.id);
  const previous=structuredClone(f.stored());
  await f.context.confirmDeliverModal();
  assert.deepEqual(f.stored(),previous);
  f.context.unarchiveInv(f.id);
  await f.context.confirmDeliverModal();
  assert.deepEqual(f.stored(),{...previous,archived:false,archivedAt:null});
  const restorations=[];
  f.context.WFInvoiceArchive={restore:id=>restorations.push(id)};
  f.context.unarchiveInv(f.id);
  f.context.openDeliverModal(f.id,'unarchive');
  assert.deepEqual(restorations,[f.id,f.id]);
});

test('legacy invoice list search tolerates missing invoice numbers and numeric customer and invoice labels', () => {
  const list=(rows,search,invTabFilter='all',invClientFilter='')=>
    Array.from(vm.runInNewContext(listFilter+'list.map(row=>row.id);',{S:{invoices:rows,invTabFilter,invClientFilter},search}));
  const rows=[{id:'none',companyId:'c'},{id:'arch',archived:true,companyName:42},{id:'num',companyId:'c',invNo:731}];
  assert.deepEqual(list(rows,''),['num','none']);
  assert.deepEqual(list(rows,'4','archived'),['arch']);
  assert.deepEqual(list(rows,'73','all','c'),['num']);
});
