'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const core = require('../material-library-core.js');
const costs = require('../product-cost-core.js');

class Element {
  constructor(tag,className = '',text = '') {
    this.tag = tag; this.className = className; this.content = String(text ?? ''); this.children = []; this.parent = null;
    this.dataset = {}; this.attributes = {}; this.handlers = {}; this.value = ''; this.hidden = false; this.disabled = false;
    this.classList = {add:(...names) => {this.className += ' ' + names.join(' ');},contains:name => this.className.split(/\s+/).includes(name)};
  }
  set textContent(value) {this.content = String(value); this.replaceChildren();}
  get textContent() {return this.content + this.children.map(child => child.textContent).join('');}
  get isConnected() {return this.connected || !!this.parent?.isConnected;}
  get lastElementChild() {return this.children.at(-1);}
  append(...children) {for (const child of children) {if (child.tag === 'fragment') this.append(...child.children); else {child.parent = this; this.children.push(child);}}}
  replaceChildren(...children) {for (const child of this.children) child.parent = null; this.children = []; this.append(...children);}
  setAttribute(key,value) {this.attributes[key] = String(value);}
  addEventListener(event,handler) {this.handlers[event] = handler;}
  descendants() {return this.children.flatMap(child => [child,...child.descendants()]);}
  matches(selector) {
    if (selector.startsWith('.')) return this.classList.contains(selector.slice(1));
    if (selector.startsWith('[data-')) {const key = selector.slice(6,-1).replace(/-([a-z])/g,(_,value) => value.toUpperCase()); return Object.hasOwn(this.dataset,key);}
    if (selector === 'span:last-child') return this.tag === 'span' && this.parent?.lastElementChild === this;
    return this.tag === selector;
  }
  querySelectorAll(selector) {return this.descendants().filter(node => node.matches(selector));}
  querySelector(selector) {return this.querySelectorAll(selector)[0] || null;}
  contains(node) {return node === this || this.descendants().includes(node);}
  fire(event,value) {if (value !== undefined) this.value = value; return this.handlers[event]?.({stopPropagation(){}});}
  click() {if (!this.disabled) return this.fire('click');}
  focus() {}
}

function fixture(initial = {}, libraryCore = core) {
  const state = {settings:{},products:[],invoices:[],usdTry:50,usdEur:0.8,...structuredClone(initial)};
  const tables = {settings:new Map([['main',structuredClone(state.settings)]]),products:new Map(state.products.map(row => [row.id,structuredClone(row)]))};
  const pages = new Map(), guards = new Map(), events = new Map(), toasts = [];
  let locale = 'en', active, fail = false, count = 0;
  const make = (...args) => new Element(...args);
  const root = {
    document:{createDocumentFragment:() => make('fragment')},WFCostCore:costs,WFMaterialLibraryCore:libraryCore,console,
    WFAppUpdates:{registerGuard:(name,callback) => guards.set(name,callback)},WFTouchKeyboard:{close(){}},
    Event:class {constructor(type) {this.type = type;}},wfNewRecordId:() => 'stable-id',
    addEventListener:(name,handler) => {const listeners = events.get(name) || []; listeners.push(handler); events.set(name,listeners);},
    dispatchEvent:event => {for (const handler of events.get(event.type) || []) handler(event);},
    WFOperations:{make,locale:() => locale,state:() => state,icon:() => '<svg></svg>',notify:(message,type) => toasts.push({message,type}),
      register(definition) {const page = make('section'), body = make('div'), actions = make('div'); page.connected = true; page.append(body,actions); const shell = {page,body,actions,definition}; pages.set(definition.id,shell); return shell;},
      open(id) {const shell = pages.get(id); assert(shell,id + ' registered'); active = id; shell.definition.onEnter(); return true;}
    },
    async wfWriteBatch(operations) {
      count++; if (fail) throw new Error('quota');
      return operations.map(op => {const next = op.merge(tables[op.store].get(op.id),op.value); tables[op.store].set(op.id,structuredClone(next)); return structuredClone(next);});
    },
    wfHydrateDBValue:async row => structuredClone(row)
  };
  root.dbGet = async (store,id) => structuredClone(tables[store].get(id));
  root.window = root;
  const context = vm.createContext(root);
  for (const file of ['product-costs.js','material-library.js']) vm.runInContext(fs.readFileSync(path.join(__dirname,'..',file),'utf8'),context);
  const nodes = () => [...pages.values()].flatMap(shell => [shell.page,...shell.page.descendants()]);
  return {root,state,tables,pages,toasts,writes:() => count,active:() => active,fail:value => {fail = value;},guard:key => guards.get(key)?.(),
    id:id => nodes().find(node => node.id === id),
    find:(page,selector) => pages.get(page).page.querySelector(selector),
    button:(page,label) => pages.get(page).page.descendants().find(node => node.tag === 'button' && node.textContent === label),
    lang:value => {locale = value; for (const shell of pages.values()) shell.definition.onLanguage();}
  };
}

test('material editor keeps touch-input nodes and separate drafts across all five languages/routes; failed saves remain guarded', async () => {
  const f = fixture(); f.root.WFMaterialLibrary.open(); f.id('wfMaterialAdd').click();
  const name = f.id('wfMaterialName'); name.fire('input','Oak'); f.id('wfMaterialUnit').fire('input','m²'); f.id('wfMaterialUnitPrice').fire('input','10');
  assert(f.guard('material-library')); assert.equal(f.writes(),0);
  for (const lang of ['ar','tr','en','fr','ru']) {f.lang(lang); assert.equal(f.id('wfMaterialName'),name); assert.equal(name.value,'Oak');}
  f.lang('en'); f.id('wfMaterialAdd').click(); f.id('wfMaterialName').fire('input','Steel');
  f.root.WFMaterialLibrary.open();
  const oak = f.pages.get('material-library').page.descendants().find(node => node.classList.contains('wf-mat-item') && node.textContent.includes('Oak'));
  oak.click(); assert.equal(f.id('wfMaterialName').value,'Oak'); assert.equal(f.id('wfMaterialUnitPrice').value,'10');
  f.fail(true); await f.id('wfMaterialSave').click();
  assert(f.guard('material-library')); assert.equal(core.listMaterials(f.state.settings).length,0); assert.equal(f.id('wfMaterialName').value,'Oak');
  f.fail(false); await f.id('wfMaterialSave').click();
  assert.equal(core.listMaterials(f.state.settings)[0].unitPriceUSD,10); assert(f.guard('material-library'),'the independent Steel draft still protects updates');
  assert.equal(f.toasts.at(-1).type,'ok');
});

test('actual catalog-to-cost navigation copies saved prices into a draft and reprices only after explicit apply and save', async () => {
  const material = core.prepareMaterial({id:'wood',name:'Oak',unit:'m²',currency:'TRY',unitPrice:500,rates:{usdTry:50,usdEur:0.8}},'old');
  const invoice = {id:'sale',items:[{productId:'p',costSnapshot:null}]};
  const f = fixture({settings:{materialLibrary:{version:1,materials:[material]}},products:[{id:'p',name:'Chair',priceA:50,costing:{currency:'EUR',materials:[],labor:0,overhead:null,rates:{usdTry:40,usdEur:0.9},unitCostUSD:0,updatedAt:'old'}}],invoices:[invoice]});
  f.root.WFCosting.open('p'); f.id('wfCostChooseLibrary').click(); assert.equal(f.active(),'material-library');
  f.find('material-library','.wf-mat-item').click(); f.button('material-library','Add to product cost draft').click();
  assert.equal(f.active(),'product-costs'); assert.equal(f.writes(),0); assert.equal(f.state.products[0].costing.materials.length,0);
  const quantity = f.find('product-costs','.wf-cost-material-fields').querySelectorAll('input').find(node => node.id.endsWith('-quantity'));
  quantity.fire('input','2'); await f.id('wfCostSave').click();
  assert.equal(f.state.products[0].costing.materials[0].catalogId,'wood'); assert.equal(f.state.products[0].costing.unitCostUSD,20);
  const changed = core.prepareMaterial({...material,unitPrice:1000},'new');
  f.state.settings.materialLibrary.materials = [changed]; f.root.WFCosting.open('p');
  assert.equal(f.state.products[0].costing.unitCostUSD,20); assert.equal(f.writes(),1);
  const labor = f.id('wfCostLabor'); f.find('product-costs','.wf-cost-library-apply').click();
  assert.equal(f.id('wfCostLabor'),labor,'price application preserves other touch inputs and their draft binding');
  labor.fire('input','9'); await f.id('wfCostSave').click();
  assert.equal(f.state.products[0].costing.unitCostUSD,50);
  assert.equal(f.state.products[0].costing.materials[0].catalogUpdatedAt,'new');
  assert.deepEqual(f.state.invoices,[invoice]);
  assert(!f.guard('product-costs'));
});

test('a conflicting saved material is reread without replacing typed inputs and discard loads the latest row', async () => {
  const material = core.prepareMaterial({id:'wood',name:'Oak',unit:'m²',currency:'USD',unitPrice:10,rates:{usdTry:50,usdEur:0.8}},'old');
  const f = fixture({settings:{materialLibrary:{version:1,materials:[material]}}});
  f.root.WFMaterialLibrary.open('wood'); await f.root.WFMaterialLibrary.refresh();
  const price = f.id('wfMaterialUnitPrice'); price.fire('input','15');
  const newer = core.prepareMaterial({...material,unitPrice:20},'remote');
  f.tables.settings.set('main',{companyName:'Remote company',materialLibrary:{version:1,materials:[newer]}});
  await f.id('wfMaterialSave').click();
  assert.equal(f.id('wfMaterialUnitPrice'),price); assert.equal(price.value,'15'); assert(f.guard('material-library'));
  assert.equal(core.listMaterials(f.state.settings)[0].unitPrice,20);
  assert.equal(f.state.settings.companyName,undefined,'catalog refresh does not overwrite unrelated settings forms');
  f.button('material-library','Discard changes').click(); f.button('material-library','Discard draft').click();
  assert.equal(f.id('wfMaterialUnitPrice').value,20); assert(!f.guard('material-library'));
  f.id('wfMaterialUnitPrice').fire('input','25'); await f.id('wfMaterialSave').click();
  assert.equal(core.listMaterials(f.state.settings)[0].unitPrice,25); assert(!f.guard('material-library'));
});

test('linked-material filter and overview refresh from current product data with no duplicate product counts', async () => {
  const materials = ['0','wood','metal'].map(id => core.prepareMaterial({id,name:id,unit:'kg',currency:'USD',unitPrice:10},'saved'));
  const scans = {indexed:0,legacy:0}, tracked = {...core,
    buildUsageIndex(products) {scans.indexed++; return core.buildUsageIndex(products);},
    usage(products,id) {scans.legacy++; return core.usage(products,id);}
  };
  const f = fixture({settings:{materialLibrary:{version:1,materials}},products:[
    {id:'p1',name:'One',costing:{materials:[{catalogId:0},{catalogId:'0'},{catalogId:'wood'}]}},
    {id:'p2',name:'Two',costing:{materials:[{catalogId:'wood'},{catalogId:'wood'}]}}
  ]},tracked);
  f.root.WFMaterialLibrary.open(); await f.root.WFMaterialLibrary.refresh();
  f.button('material-library','Used in products').click();
  const displayed = () => f.pages.get('material-library').page.querySelectorAll('.wf-mat-item').map(row => row.querySelector('strong').textContent);
  assert.deepEqual(displayed(),['0','wood']);
  assert.equal(f.pages.get('material-library').page.querySelectorAll('.wf-mat-stat')[2].querySelector('strong').textContent,'2');
  const before = {...scans}; f.id('wfMaterialSearch').fire('input','');
  assert.equal(scans.indexed - before.indexed,1,'one usage index supplies both filter and overview');
  assert.equal(scans.legacy - before.legacy,0,'the list no longer rescans products per material');
  f.root.WFMaterialLibrary.open('wood');
  assert.equal(f.pages.get('material-library').page.querySelectorAll('.wf-mat-usage-item').length,2);
  f.state.products = [{id:'p3',name:'Three',costing:{materials:[{catalogId:'metal'}]}}];
  await f.root.WFMaterialLibrary.refresh();
  assert.deepEqual(displayed(),['metal']);
  assert.equal(f.pages.get('material-library').page.querySelectorAll('.wf-mat-stat')[2].querySelector('strong').textContent,'1');
  assert.equal(f.pages.get('material-library').page.querySelectorAll('.wf-mat-usage-item').length,0);
  assert.equal(f.writes(),0);
});
