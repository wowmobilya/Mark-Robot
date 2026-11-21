'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const planner = require('../purchase-planner-core.js');
const core = require('../procurement-followup-core.js');
const source = fs.readFileSync(path.join(__dirname, '../procurement-followup.js'), 'utf8');

class Element {
  constructor(tag, className = '', text = '') {
    Object.assign(this, {tag, className, text, value:'', children:[], dataset:{}, attrs:{}, handlers:{}});
  }
  setAttribute(key, value) { this.attrs[key] = String(value); }
  addEventListener(type, callback) { this.handlers[type] = callback; }
  append(...nodes) { this.children.push(...nodes); }
  replaceChildren(...nodes) { this.children = nodes; this.text = ''; }
  set textContent(value) { this.text = String(value); this.children = []; }
  get textContent() { return this.text + this.children.map(node => node.textContent).join(' '); }
  all() { return [this, ...this.children.flatMap(node => node.all())]; }
  click() { if (!this.disabled) return this.handlers.click?.({target:this}); }
  focus() {}
  scrollIntoView() {}
}
function deferred() {
  let resolve;
  const promise = new Promise(yes => { resolve = yes; });
  return {promise, resolve};
}
function fixture(count = 2, database = true) {
  const orders = Array.from({length:count}, (_, i) => planner.prepareOrder({
    id:'order-' + i, orderNumber:'PO-' + i, createdAt:'2026-01-01T09:00:00Z', currency:'USD',
    supplier:{name:'Factory ' + i}, lines:[{productId:9, name:'Desk', color:'Oak', dimensions:'100 × 50', quantity:5}]
  }));
  let stored = {id:'main', authPerson:'Sam', unrelated:'keep', procurementOrders:{version:1, orders}};
  const state = {settings:structuredClone(stored), products:[], invoices:[], invoiceArchive:[]};
  const make = (...args) => new Element(...args);
  const page = {actions:make('div'), body:make('div'), page:make('section')};
  let definition, locale = 'en', id = 0, builds = 0, writes = 0, readCount = 0, invoiceReads = 0, readFails = false;
  let fault, gate, hydrateFault=false, rawInvoices=[], report;
  const now='2026-11-21T10:00:00.000Z';
  class Clock extends Date {
    constructor(...args){super(...(args.length?args:[now]));}
    static now(){return Date.parse(now);}
  }
  const guards = new Map(), changes = [];
  const window = {document:{}, crypto:{randomUUID:() => 'ev-' + (++id)},
    WFOperations:{state:() => state, make, locale:() => locale, register(spec){definition = spec; return page;}, open(){definition.onEnter(); return true;}},
    WFPurchasePlannerCore:planner, WFProcurementFollowupCore:{...core, buildReport(snapshot){builds++; report=core.buildReport(snapshot,{now});return report;}},
    WFAppUpdates:{registerGuard:(key, callback) => guards.set(key, callback)},
    CustomEvent:class {constructor(type, options){Object.assign(this, {type}, options);}}, dispatchEvent:event => changes.push(event)};
  const context = vm.createContext({window, console, Intl, Date:Clock,
    async dbGetAllRaw(store){invoiceReads++;assert.equal(store,'invoices');return structuredClone(rawInvoices);},
    async dbGetRaw(){readCount++; if(readFails) throw Error('READ'); return structuredClone(stored);},
    async wfWriteBatch([op]){writes++; if(fault) throw Error(fault); stored = op.merge(stored, op.value); return [structuredClone(stored)];},
    async wfHydrateDBValue(row){if(gate) await gate.promise; if(hydrateFault)throw Error('HYDRATE');return row;}
  });
  if(!database){delete context.dbGetRaw;delete context.dbGetAllRaw;}
  vm.runInContext(source, context);
  const all = () => [...page.actions.all(), ...page.body.all()];
  const action = (key) => all().find(node => node.dataset.followupAction === key);
  const byId = key => all().find(node => node.id === key);
  const fill = (key, value, type='input') => {const node=byId(key); assert(node,key);node.value=value;node.handlers[type]({target:node});};
  return {api:window.WFProcurementFollowup,
    async open(id){window.WFProcurementFollowup.open(id);await new Promise(resolve=>setImmediate(resolve));},
    state, definition, guards, changes, page, action, byId, fill, all,
    stored:()=>stored, report:()=>report, addOrder(order){stored=planner.mergeOrder(stored,{order});}, builds:()=>builds, writes:()=>writes, reads:()=>readCount, invoiceReads:()=>invoiceReads, invoices:value=>rawInvoices=value, readFails:value=>readFails=value,
    fault:value=>fault=value, hydrateFault:value=>hydrateFault=value, gate:value=>gate=value, lang(value){locale=value;definition.onLanguage();},
    remote(intent){stored=core.mergeChange(stored,intent);}, publishRemote(){state.settings.procurementOrders.followup=structuredClone(stored.procurementOrders.followup);}};
}
const intent = (orderId, expectedRevision, event) => ({orderId, expectedRevision, event:{at:'2026-11-01T10:00:00Z', ...event}});

test('overview loads on entry, pages 20 at a time, and reuses its report across search, status and language changes', async () => {
  const app=fixture(48);
  assert.equal(app.builds(),0);
  await app.open();
  const builds=app.builds();
  const cards=()=>app.all().filter(node=>node.className==='wf-followup-card');
  assert.equal(cards().length,20);
  app.action('nextOrders').click();
  assert.equal(cards().length,20);
  app.fill('wfProcurementFollowupSearch','Factory 41');
  assert.equal(cards().length,1);
  app.fill('wfProcurementStatusFilter','received','change');
  assert.equal(cards().length,0);
  for (const [lang, label] of [['ar','حالة الطلب'],['tr','Sipariş durumu'],['fr','État de la commande'],['ru','Статус заказа'],['en','Order status']]) {
    app.lang(lang);assert(app.page.body.textContent.includes(label));
  }
  assert.equal(app.builds(),builds);assert.equal(app.writes(),0);
});

test('partial receipts keep draft and revision on write failure, reject over-receipt, then save once with configured operator', async () => {
  const app=fixture();await app.open('order-0');
  app.action('partial').click();app.fill('wfProcurementQty0','6');await app.action('confirm').click();
  assert.equal(app.writes(),0);
  app.fill('wfProcurementQty0','2');app.fault('STORAGE');await app.action('confirm').click();
  assert.equal(app.byId('wfProcurementQty0').value,'2');
  assert.equal(app.guards.get('purchase-followup')(),true);assert.equal(app.changes.length,0);
  app.fault(null);app.lang('ar');app.lang('en');assert.equal(app.byId('wfProcurementQty0').value,'2');
  const gate=deferred();app.gate(gate);
  const confirm=app.action('confirm');const saving=confirm.click();await confirm.click();
  assert.equal(app.api.hasUnsavedChanges(),true);assert.equal(app.writes(),2);
  gate.resolve();await saving;
  const [event]=core.getLedger(app.stored()).records[0].events;
  assert.equal(event.type,'receipt');assert.equal(event.lines[0].quantity,2);assert.equal(event.operator,'Sam');
  assert.equal(app.api.hasUnsavedChanges(),false);assert.equal(app.changes.length,1);
});

test('late successful callback stays with its original order and uses the current published state', async () => {
  const app=fixture(),gate=deferred();await app.open('order-0');app.gate(gate);
  app.action('all').click();const saving=app.action('confirm').click();
  await new Promise(resolve=>setImmediate(resolve));
  const first=core.getLedger(app.stored()).records[0].events[0];
  app.remote(intent('order-0',1,{id:'voided',type:'void_receipt',receiptId:first.id,note:'Wrong order',at:first.at}));app.publishRemote();
  await app.open('order-1');gate.resolve();await saving;
  assert(app.page.body.textContent.includes('Factory 1'));assert(!app.page.body.textContent.includes('Factory 0'));
  await app.open('order-0');
  assert(app.action('all'));assert(app.page.body.textContent.includes('Wrong order'));
});

test('revision conflict loads the winning write and keeps attempted quantities isolated until explicitly discarded', async () => {
  const app=fixture();await app.open('order-0');app.action('partial').click();app.fill('wfProcurementQty0','4');
  const key=planner.modelKey(9,'Oak','100 × 50');
  app.remote(intent('order-0',0,{id:'other',type:'receipt',lines:[{key,quantity:3}]}));
  app.readFails(true);await app.action('confirm').click();
  assert.equal(app.api.hasUnsavedChanges(),true);assert.equal(app.byId('wfProcurementQty0').value,'4');
  assert.equal(app.action('confirm').disabled,true);
  app.readFails(false);await app.byId('wfProcurementFollowupRefresh').click();
  assert(app.reads()>=2);assert.equal(core.getLedger(app.state.settings).revision,1);
  assert.equal(app.action('confirm').disabled,true);
  app.action('discard').click();app.action('all').click();await app.action('confirm').click();
  assert.deepEqual(core.getLedger(app.stored()).records[0].events.map(ev=>ev.lines[0].quantity),[3,2]);
  assert.equal(app.state.settings.unrelated,'keep');
});

test('receipt reversal needs a reason, preserves receipt history, and cancel/reopen keeps actual units', async () => {
  const app=fixture();await app.open('order-0');await app.action('ordered').click();
  app.action('expected').click();app.fill('wfProcurementExpectedDate','2026-10-01');await app.action('confirm').click();
  app.action('partial').click();app.fill('wfProcurementQty0','2');await app.action('confirm').click();
  app.action('cancel').click();await app.action('confirm').click();
  await app.action('reopen').click();app.action('void_receipt').click();
  await app.action('confirm').click();assert.equal(core.getLedger(app.stored()).records[0].revision,5);
  app.fill('wfProcurementVoidReason','Packing slip counted twice');await app.action('confirm').click();
  const events=core.getLedger(app.stored()).records[0].events;
  assert.deepEqual(events.map(ev=>ev.type),['ordered','expected','receipt','cancel','reopen','void_receipt']);
  assert.equal(events.at(-1).receiptId,events[2].id);
  assert(app.page.body.textContent.includes('Packing slip counted twice'));
});

test('refresh discovers another tab’s prepared orders and receipt ledger alongside fresh delivered invoices', async () => {
  const app=fixture(1);
  await app.open();
  const remoteOrder={...app.state.settings.procurementOrders.orders[0],id:'new',orderNumber:'PO-NEW'};
  app.addOrder(remoteOrder);
  const key=planner.modelKey(9,'Oak','100 × 50');
  app.remote(intent('new',0,{id:'receipt',type:'receipt',lines:[{key,quantity:3}]}));
  const invoice={id:7,delivered:true,deliveredAt:'2026-11-05T10:00:00Z',items:[{productId:9,color:'Oak',dimensions:'100 × 50',qty:2}]};
  app.invoices([invoice]);
  await app.api.refresh();
  const row=()=>app.report().orders.find(order=>order.id==='new');
  assert.equal(row().allocatedUnits,2);assert.equal(row().balanceUnits,1);
  assert.deepEqual(app.state.invoices,[],'report-only reads never publish raw invoices into application state');
  app.invoices([{...invoice,items:[{...invoice.items[0],qty:1}]}]);
  await app.api.refresh();assert.equal(row().allocatedUnits,1);assert.equal(row().balanceUnits,2);
  app.invoices([]);await app.api.refresh();assert.equal(row().allocatedUnits,0);
});

test('incomplete inputs use translated guidance and never present unknown model allocations as a healthy zero', async () => {
  const app=fixture(1,false);app.state.invoices=undefined;await app.open('order-0');
  assert.equal(app.report().complete,false);
  assert(app.page.body.textContent.includes('Invoice records unavailable'));
  assert(app.page.body.textContent.includes('Unavailable'));
  app.lang('ar');assert(app.page.body.textContent.includes('سجل الفواتير غير متاح'));
  assert(!app.page.body.textContent.includes('invoicesUnavailable'));
});

test('retry after an unconfirmed publication reuses the original event without recording another receipt', async () => {
  const app=fixture(1);await app.open('order-0');app.action('all').click();
  app.hydrateFault(true);await app.action('confirm').click();
  assert.equal(core.getLedger(app.stored()).revision,1);assert.equal(core.getLedger(app.state.settings).revision,0);
  assert.equal(app.api.hasUnsavedChanges(),true);assert(app.page.body.textContent.includes('Save could not be confirmed'));
  app.hydrateFault(false);await app.action('confirm').click();
  const ledger=core.getLedger(app.state.settings);
  assert.equal(ledger.revision,1);assert.equal(ledger.records[0].events[0].lines[0].quantity,5);
  assert.equal(app.api.hasUnsavedChanges(),false);assert.equal(app.changes.length,1);
});

test('an unfinished form can be found again from the order list, while changing filters never dirties the updater', async () => {
  const app=fixture();await app.open('order-0');app.action('partial').click();app.fill('wfProcurementQty0','3');
  app.action('orders').click();app.fill('wfProcurementStatusFilter','unsaved','change');
  const marked=app.all().filter(node=>node.className==='wf-followup-card');
  assert.equal(marked.length,1);assert(marked[0].textContent.includes('Unsaved edit'));
  marked[0].click();assert.equal(app.byId('wfProcurementQty0').value,'3');app.action('discard').click();
  assert.equal(app.api.hasUnsavedChanges(),false);
});

test('first entry reads a newly prepared supplier order and a delivered invoice committed in a different tab', async () => {
  const app=fixture(1);
  app.addOrder({...app.state.settings.procurementOrders.orders[0],id:'remote',orderNumber:'PO-REMOTE'});
  const key=planner.modelKey(9,'Oak','100 × 50');
  app.remote(intent('order-0',0,{id:'receipt',type:'receipt',lines:[{key,quantity:4}]}));
  app.invoices([{id:'delivery',delivered:true,deliveredAt:'2026-11-05T10:00:00Z',
    items:[{productId:9,color:'Oak',dimensions:'100 × 50',qty:3}]}]);
  assert.deepEqual([app.reads(),app.invoiceReads(),app.builds()],[0,0,0]);
  await app.open();
  assert(app.page.body.textContent.includes('PO-REMOTE'));
  assert.equal(app.report().orders.find(row=>row.id==='remote').status,'prepared');
  const recorded=app.report().orders.find(row=>row.id==='order-0');
  assert.equal(recorded.allocatedUnits,3);assert.equal(recorded.balanceUnits,1);
  app.fill('wfProcurementFollowupSearch','Factory');app.lang('ar');
  await new Promise(resolve=>setImmediate(resolve));
  assert.deepEqual([app.reads(),app.invoiceReads(),app.builds()],[1,1,1]);
  assert.deepEqual(app.state.invoices,[]);
});
