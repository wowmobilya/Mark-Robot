'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const core=require('../purchase-planner-core.js'),statement=require('../account-statement-core.js'),labelCore=require('../package-label-core.js'),labelHelpers=require('../package-labels.js');
const source=fs.readFileSync(path.join(__dirname,'../purchase-planner.js'),'utf8');
const tick=()=>new Promise(resolve=>setImmediate(resolve));
function deferred(){let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return{promise,resolve,reject};}
class Events{
  constructor(){this.listeners=new Map();}
  addEventListener(type,callback,options={}){const entries=this.listeners.get(type)||[];entries.push({callback,once:!!options.once});this.listeners.set(type,entries);}
  removeEventListener(type,callback){this.listeners.set(type,(this.listeners.get(type)||[]).filter(entry=>entry.callback!==callback));}
  dispatch(type,detail={}){let result;for(const entry of [...(this.listeners.get(type)||[])]){if(entry.once)this.removeEventListener(type,entry.callback);result=entry.callback({type,target:this,preventDefault(){},...detail});}return result;}
}
class Element extends Events{
  constructor(tag){super();this.tagName=tag.toUpperCase();this.children=[];this.attributes=new Map();this.dataset={};this.style={};this.className='';this.value='';this.hidden=false;this.disabled=false;this.clientWidth=350;this._text='';}
  get textContent(){return this._text+this.children.map(child=>child.textContent).join('');}
  set textContent(value){this._text=String(value);this.children=[];}
  append(...nodes){for(const node of nodes){node.remove();node.parentElement=this;this.children.push(node);}}
  remove(){if(this.parentElement){const parent=this.parentElement;parent.children=parent.children.filter(node=>node!==this);this.parentElement=null;}}
  replaceChildren(...nodes){this.children.forEach(node=>node.parentElement=null);this.children=[];this._text='';this.append(...nodes);}
  setAttribute(key,value){this.attributes.set(key,String(value));}
  getAttribute(key){return this.attributes.get(key)??null;}
  all(){return this.children.flatMap(child=>[child,...child.all()]);}
  querySelectorAll(query){const tokens=query.split(',').map(token=>token.trim());return this.all().filter(node=>tokens.some(token=>token.startsWith('.')?node.className.split(' ').includes(token.slice(1)):token.startsWith('#')?node.id===token.slice(1):node.tagName.toLowerCase()===token));}
  querySelector(query){return this.querySelectorAll(query)[0]||null;}
  focus(){}scrollIntoView(){}click(){if(!this.disabled)return this.dispatch('click');}
}
function fixture(options={}){
  let language='en',definition,timerId=0,clock='2026-11-21T10:00:00.000Z',stored=structuredClone(options.settings||{id:'main',companyName:'WOW Buyer',logo:'/wow.png'});
  const state={settings:structuredClone(stored),products:options.products||[{id:'p1',name:'MASTER-400',barcode:'MODEL-400',color:'Oak',dimensions:'80×40×50',image:'/model.png',priceA:27183.99}],
    invoices:options.invoices||[{id:'i1',invNo:'PRIVATE-INVOICE-53',companyName:'PRIVATE-CUSTOMER-77',regDate:'2026-06-01',grandTotal:123,items:[{productId:'p1',name:'SAVED-400',color:'Oak',dimensions:'80×40×50',qty:6,packets:5,priceUSD:123}]}]};
  const calls={writes:[],prints:0,frames:[],scans:[],downloads:[],registrations:[],fetches:[],imageDecodes:[]},timers=new Map(),guards=new Map(),body=new Element('body');
  const doc=Object.assign(new Events(),{body,documentElement:new Element('html'),baseURI:'https://wow.example/app/',visibilityState:'visible',hidden:false});
  function create(tag){
    const node=new Element(tag);
    if(tag==='iframe'){
      const view=new Events(),media=Object.assign(new Events(),{matches:false}),document={images:[],fonts:{ready:Promise.resolve()},documentElement:{scrollHeight:1123},html:'',open(){},close(){},
        write(html){this.html=html;this.images=[...html.matchAll(/<img\b[^>]*src="([^"]+)"[^>]*>/g)].map(match=>Object.assign(new Events(),{src:match[1],complete:true,naturalWidth:options.failImages?0:1,naturalHeight:options.failImages?0:1,decode:()=>Promise.resolve()}));const print=node.className==='wf-purchase-print-frame';this.fonts.ready=(print?options.printGate:options.previewGate)?.promise||Promise.resolve();}};
      Object.assign(view,{document,focus(){},matchMedia:()=>media,print(){calls.prints++;if(options.printFailure)throw Error('PRINT');if(options.synchronousPrint)view.dispatch('afterprint');}});
      node.contentWindow=view;node.contentDocument=document;node.printMedia=media;calls.frames.push(node);
    }
    return node;
  }
  doc.createElement=create;doc.getElementById=id=>body.all().find(node=>node.id===id)||null;
  const make=(tag,className='',text)=>{const node=create(tag);node.className=className;if(text!==undefined)node.textContent=text;return node;};
  const shell={page:make('section'),actions:make('div'),body:make('div')};shell.page.append(shell.actions,shell.body);body.append(shell.page);
  const window=Object.assign(new Events(),{document:doc,console,WFOperations:{make,state:()=>state,locale:()=>language,register(spec){definition=spec;return shell;},open(){definition.onEnter();}},
    WFPurchasePlannerCore:core,WOWStatementCore:statement,WFPackageLabelCore:labelCore,WFPackageLabelHelpers:labelHelpers,
    WFTouchKeyboard:{register:(id,settings)=>calls.registrations.push({id,settings})},WFAppUpdates:{registerGuard:(id,callback)=>guards.set(id,callback)},wfCompanyLogo:value=>value||'/wow.png',
    getComputedStyle:()=>({getPropertyValue:()=>'#3f7c94'}),openBarcodeScanner:mode=>calls.scans.push(mode),requestAnimationFrame:callback=>{queueMicrotask(callback);return 1;},crypto:{randomUUID:()=>`order-${++timerId}`},
    AbortController,async fetch(url){calls.fetches.push(url);if(options.fetchGate)await options.fetchGate.promise;if(options.fetchFailure)throw Error('FETCH');return{ok:true,blob:async()=>new Blob([new Uint8Array([1,2,3])],{type:'image/png'})};},
    Image:class extends Events{constructor(){super();this.complete=true;this.naturalWidth=options.failImages?0:1;this.naturalHeight=options.failImages?0:1;}decode(){calls.imageDecodes.push(this.src);return options.failImageDecode?Promise.reject(Error('IMAGE')):Promise.resolve();}},
    FileReader:class{readAsDataURL(blob){blob.arrayBuffer().then(value=>{this.result='data:'+blob.type+';base64,'+Buffer.from(value).toString('base64');this.onload();});}}
  });
  class Clock extends Date{constructor(...args){super(...(args.length?args:[clock]));}static now(){return Date.parse(clock);}}
  class TestURL extends URL{static createObjectURL(blob){calls.downloads.push(blob);return'blob:test';}static revokeObjectURL(){}}
  const sandbox={window,console,URL:TestURL,Blob,Date:Clock,
    setTimeout(callback,delay){const id=++timerId;timers.set(id,{callback,delay});return id;},clearTimeout:id=>timers.delete(id),
    async wfWriteBatch(operations){calls.writes.push(operations);if(options.writeGate)await options.writeGate.promise;if(options.writeFailure)throw Error('STORAGE');const result=[];for(const op of operations){assert.equal(op.store,'settings');stored=op.merge(stored,op.value);result.push(structuredClone(stored));}return result;},
    async wfHydrateDBValue(value){if(options.hydrateGate)await options.hydrateGate.promise;return value;}};
  const context=vm.createContext(sandbox);vm.runInContext(source,context);
  return{state,window,doc,shell,calls,guards,context,api:window.WFPurchasePlanner,stored:()=>stored,
    byId:id=>doc.getElementById(id),buttons:()=>body.querySelectorAll('button'),button:text=>body.querySelectorAll('button').find(node=>node.textContent===text),
    fill(id,value){const element=doc.getElementById(id);assert(element,id);element.value=value;element.dispatch('input');},
    change(id,value){const element=doc.getElementById(id);assert(element,id);element.value=value;element.dispatch('change');},
    language(value){language=value;definition.onLanguage();},clock(value){clock=value;},
    async flushTimers(delay){for(const [id,timer]of [...timers])if(timer.delay===delay){timers.delete(id);await timer.callback();}},
    finish(){calls.frames.filter(frame=>frame.className==='wf-purchase-print-frame').at(-1)?.contentWindow.dispatch('afterprint');},
    dispose(){options.writeGate?.resolve();options.printGate?.resolve();options.previewGate?.resolve();options.hydrateGate?.resolve();options.fetchGate?.resolve();this.finish();timers.clear();}
  };
}

test('opening is read-only, scanning selects master data once, and automatic draft saving preserves quantities and source privacy',async()=>{
  const app=fixture(),invoices=JSON.stringify(app.state.invoices),products=JSON.stringify(app.state.products);
  try{
    app.api.open();assert.equal(app.calls.writes.length,0);assert(app.shell.body.textContent.includes('New draft'));
    assert.equal(app.api.acceptBarcode('MODEL-400'),true);assert.equal(app.api.acceptBarcode('MODEL-400'),true);
    assert.equal(app.shell.body.querySelectorAll('.wf-purchase-order-line').length,1);assert.equal(app.byId('wfPurchaseQty-0').value,'');
    app.button('Use period quantities').click();assert.equal(app.byId('wfPurchaseQty-0').value,'6');
    app.fill('wfPurchaseSupplier','Factory One');await app.api.flushDraft();
    const draft=app.stored().procurementOrders.draft;assert.equal(draft.lines[0].quantity,'6');assert.equal(draft.lines[0].name,'MASTER-400');assert.equal(draft.lines[0].code,'MODEL-400');assert.equal(draft.lines[0].unitPrice,'');
    assert.equal(app.stored().procurementOrders.orders.length,0);assert.equal(JSON.stringify(app.state.invoices),invoices);assert.equal(JSON.stringify(app.state.products),products);
    assert(!JSON.stringify(draft).includes('PRIVATE-CUSTOMER'));assert(!JSON.stringify(draft).includes('PRIVATE-INVOICE'));assert.equal(app.guards.get('purchase-planner')(),false);
    app.button('Scan with camera').click();assert.deepEqual(app.calls.scans,['purchase']);assert(app.calls.registrations.some(entry=>entry.id==='wfPurchaseSearch'));
  }finally{app.dispose();}
});

test('a saved draft prepares an order at the issue time, preserves that date on re-open, and prints only on explicit user action',async()=>{
  const app=fixture();
  try{
    app.clock('2026-01-02T00:00:00Z');app.api.open();app.api.acceptBarcode('MASTER-400 - Packet 2/3');app.fill('wfPurchaseQty-0','4');app.fill('wfPurchaseSupplier','Factory');await app.api.flushDraft();
    assert.equal(app.stored().procurementOrders.draft.createdAt,'2026-01-02T00:00:00.000Z');
    app.clock('2026-11-21T10:00:00Z');assert.equal(await app.api.save(),true);let orders=app.stored().procurementOrders.orders;
    assert.equal(orders.length,1);assert.equal(orders[0].createdAt,'2026-11-21T10:00:00.000Z');assert.equal(app.calls.prints,0);
    const preview=app.calls.frames.find(frame=>frame.className==='wf-purchase-paper');assert(!preview.contentDocument.html.includes('PRIVATE-CUSTOMER'));assert(!preview.contentDocument.html.includes('PRIVATE-INVOICE'));assert(!preview.contentDocument.html.includes('27183.99'));assert(preview.contentDocument.html.includes('#3f7c94'));
    app.clock('2026-12-25T10:00:00Z');assert.equal(await app.api.save(),true);assert.equal(app.stored().procurementOrders.orders.length,1);assert.equal(app.stored().procurementOrders.orders[0].createdAt,'2026-11-21T10:00:00.000Z');
    await app.api.print();assert.equal(app.calls.prints,1);assert.equal(app.guards.get('purchase-planner')(),true);
    await app.api.print();assert.equal(app.calls.prints,1);assert.equal(app.api.acceptBarcode('MODEL-400'),false);
    app.language('ar');app.finish();await tick();assert.equal(app.guards.get('purchase-planner')(),false);assert.equal(app.byId('wfPurchasePrintLanguage').value,'en','document language remains independent of the app language');
    assert.equal(app.stored().procurementOrders.orders[0].locale,'en');
  }finally{app.dispose();}
});

test('edits during a pending automatic save are persisted afterward, and a failed write retains the visible draft',async()=>{
  const gate=deferred(),app=fixture({writeGate:gate});
  try{
    app.api.open();app.api.acceptBarcode('MODEL-400');app.fill('wfPurchaseQty-0','2');app.fill('wfPurchaseSupplier','First');
    const first=app.api.flushDraft();await tick();app.fill('wfPurchaseQty-0','9');app.fill('wfPurchaseSupplier','Latest');const second=app.api.flushDraft();gate.resolve();await first;await second;
    assert.equal(app.stored().procurementOrders.draft.lines[0].quantity,'9');assert.equal(app.stored().procurementOrders.draft.supplier.name,'Latest');assert.equal(app.stored().procurementOrders.draftRevision,2);
  }finally{app.dispose();}
  const failed=fixture({writeFailure:true});
  try{failed.api.open();failed.api.acceptBarcode('MODEL-400');failed.fill('wfPurchaseQty-0','3');failed.fill('wfPurchaseSupplier','Unsaved');assert.equal(await failed.api.flushDraft(),false);assert.equal(failed.byId('wfPurchaseSupplier').value,'Unsaved');assert.equal(failed.stored().procurementOrders,undefined);assert.equal(failed.guards.get('purchase-planner')(),true);}finally{failed.dispose();}
});

test('a later draft published during hydration is never adopted as the local draft revision or overwritten',async()=>{
  const gate=deferred(),app=fixture({hydrateGate:gate});
  try{
    app.api.open();app.api.acceptBarcode('MODEL-400');app.fill('wfPurchaseQty-0','2');app.fill('wfPurchaseSupplier','Local A');
    const saving=app.api.flushDraft();await tick();
    const section=app.stored().procurementOrders;section.draftRevision=2;section.draft={...section.draft,supplier:{name:'Other writer B',contact:''}};
    app.state.settings.procurementOrders=structuredClone(section);gate.resolve();
    assert.equal(await saving,false,'a superseded commit must be shown as a draft conflict');
    assert.equal(app.byId('wfPurchaseSupplier').value,'Local A');assert.equal(app.guards.get('purchase-planner')(),true);
    assert(app.shell.body.textContent.includes('The saved draft changed elsewhere'));
    app.fill('wfPurchaseSupplier','Local A edited');assert(app.shell.body.textContent.includes('The saved draft changed elsewhere'),'editing must not hide the unresolved conflict');
    assert.equal(await app.api.flushDraft(),false);assert.equal(app.stored().procurementOrders.draft.supplier.name,'Other writer B');assert.equal(app.stored().procurementOrders.draftRevision,2);
    await app.button('Retry').click();assert.equal(app.stored().procurementOrders.draft.supplier.name,'Other writer B');assert.equal(app.stored().procurementOrders.draftRevision,2);
  }finally{app.dispose();}
});

test('saved catalog snapshots remain unchanged, editing a saved draft creates a new order, and changing currency clears rather than reinterprets prices',async()=>{
  const app=fixture();
  try{
    app.api.open();app.api.acceptBarcode('MODEL-400');app.fill('wfPurchaseQty-0','3');app.fill('wfPurchaseSupplier','Factory');app.fill('wfPurchasePrice-0','12.50');await app.api.save();
    const first=structuredClone(app.stored().procurementOrders.orders[0]);app.state.products[0].name='Renamed catalog';app.state.products[0].image='/changed.png';
    app.change('wfPurchaseCurrency','EUR');assert.equal(app.byId('wfPurchasePrice-0').value,'');assert(app.shell.body.textContent.includes('Prices were cleared'));
    await app.api.save();assert.equal(app.stored().procurementOrders.orders.length,2);assert.equal(JSON.stringify(app.stored().procurementOrders.orders[0]),JSON.stringify(first));assert.equal(app.stored().procurementOrders.orders[1].currency,'EUR');assert.equal(app.stored().procurementOrders.orders[1].lines[0].unitPrice,null);
  }finally{app.dispose();}
});

test('rendering remains bounded and incomplete records show needs-review instead of a false unsold claim',async()=>{
  const products=Array.from({length:500},(_,index)=>({id:'p'+index,name:'MODEL '+index,barcode:'CODE'+index,color:'Oak'}));
  const app=fixture({products,invoices:[{id:'broken',regDate:'2026-06-01',items:[{productId:'p0',name:'MODEL 0',color:'Oak',qty:'invalid'}]}]});
  try{app.api.open();assert.equal(app.shell.body.querySelectorAll('.wf-purchase-product').length,36);const sales=app.shell.body.querySelector('.wf-purchase-sales');assert(sales.textContent.includes('Records to review'));assert(!sales.textContent.includes('No recorded activity'));app.fill('wfPurchaseSearch','MODEL 499');await app.flushTimers(120);assert.equal(app.shell.body.querySelectorAll('.wf-purchase-product').length,1);}finally{app.dispose();}
});

test('print asset readiness and native failures never leave the workflow permanently locked',async()=>{
  const gate=deferred(),app=fixture({printGate:gate});
  try{app.api.open();app.api.acceptBarcode('MODEL-400');app.fill('wfPurchaseQty-0','1');app.fill('wfPurchaseSupplier','Factory');await app.api.save();const printing=app.api.print();await tick();assert.equal(app.calls.prints,0);await app.api.print();assert.equal(app.calls.frames.filter(frame=>frame.className==='wf-purchase-print-frame').length,1);gate.resolve();await printing;assert.equal(app.calls.prints,1);app.window.dispatch('focus');assert.equal(app.guards.get('purchase-planner')(),true);app.finish();await tick();assert.equal(app.guards.get('purchase-planner')(),false);}finally{app.dispose();}
  const failed=fixture({printFailure:true});
  try{failed.api.open();failed.api.acceptBarcode('MODEL-400');failed.fill('wfPurchaseQty-0','1');failed.fill('wfPurchaseSupplier','Factory');await failed.api.save();await failed.api.print();assert.equal(failed.calls.prints,1);assert.equal(failed.guards.get('purchase-planner')(),false);assert(failed.shell.body.textContent.includes('Images or printing could not be prepared'));}finally{failed.dispose();}
});

test('CSV and HTML exports use the same supplier-safe snapshot and no export starts on page entry',async()=>{
  const app=fixture();
  try{app.api.open();assert.equal(app.calls.downloads.length,0);app.api.acceptBarcode('MODEL-400');app.fill('wfPurchaseQty-0','1');app.fill('wfPurchaseSupplier','Factory');await app.api.save();await app.button('Download CSV').click();await app.button('Download HTML').click();assert.equal(app.calls.downloads.length,2);for(const blob of app.calls.downloads){const text=await blob.text();assert(!text.includes('PRIVATE-CUSTOMER'));assert(!text.includes('PRIVATE-INVOICE'));assert(!text.includes('27183.99'));assert(text.includes('Factory'));}const html=await app.calls.downloads[1].text();assert(html.includes('src="data:image/png;base64,'));assert(!html.includes('src="/model.png"'));assert.equal(app.calls.fetches.length,2);}finally{app.dispose();}
});

test('HTML image embedding failures are visible and never download a silently incomplete document',async()=>{
  const app=fixture({fetchFailure:true});
  try{app.api.open();app.api.acceptBarcode('MODEL-400');app.fill('wfPurchaseQty-0','1');app.fill('wfPurchaseSupplier','Factory');await app.api.save();await app.button('Download HTML').click();assert.equal(app.calls.downloads.length,0);assert(app.shell.body.textContent.includes('Images or printing could not be prepared'));assert.equal(app.guards.get('purchase-planner')(),false);}finally{app.dispose();}
});

test('a saved order retains visible preview failure and keeps printing disabled for corrupt embedded images',async()=>{
  const app=fixture({failImages:true,products:[{id:'p1',name:'Model',barcode:'MODEL-400',color:'Oak',dimensions:'80×40×50',image:'data:image/png;base64,AAAA'}],settings:{id:'main',companyName:'WOW',logo:'data:image/png;base64,AAAA'}});
  try{
    app.api.open();app.api.acceptBarcode('MODEL-400');app.fill('wfPurchaseQty-0','1');app.fill('wfPurchaseSupplier','Factory');
    assert.equal(await app.api.save(),true,'the immutable order was saved even though preview preparation failed');assert.equal(app.stored().procurementOrders.orders.length,1);
    assert(app.shell.body.textContent.includes('Images or printing could not be prepared'));assert.equal(app.button('Print / Save PDF').disabled,true);
    await app.button('Download CSV').click();assert.equal(app.calls.downloads.length,1,'the image-free supplier CSV remains available');assert.equal(app.button('Print / Save PDF').disabled,true,'an export cannot enable an unprepared preview');
  }finally{app.dispose();}
});

test('HTML export validates existing data images and rejects decode failures before creating a download',async()=>{
  for(const failure of [{failImages:true},{failImageDecode:true}]){
    const app=fixture({...failure,products:[{id:'p1',name:'Model',barcode:'MODEL-400',color:'Oak',dimensions:'80×40×50',image:'data:image/png;base64,AAAA'}],settings:{id:'main',companyName:'WOW',logo:'data:image/png;base64,AAAA'}});
    try{
      app.api.open();app.api.acceptBarcode('MODEL-400');app.fill('wfPurchaseQty-0','1');app.fill('wfPurchaseSupplier','Factory');await app.api.save();
      await app.button('Download HTML').click();assert.equal(app.calls.downloads.length,0);assert.equal(app.calls.fetches.length,0,'embedded images need decoding, not a network request');
      assert(app.shell.body.textContent.includes('Images or printing could not be prepared'));assert.equal(app.guards.get('purchase-planner')(),false);
    }finally{app.dispose();}
  }
});

test('a preview that becomes ready during HTML export stays printable after the export finishes',async()=>{
  const previewGate=deferred(),fetchGate=deferred(),app=fixture({previewGate,fetchGate});
  try{
    app.api.open();app.api.acceptBarcode('MODEL-400');app.fill('wfPurchaseQty-0','1');app.fill('wfPurchaseSupplier','Factory');
    const saving=app.api.save();await tick();assert.equal(app.button('Print / Save PDF').disabled,true);
    const exporting=app.button('Download HTML').click();await tick();previewGate.resolve();await saving;
    fetchGate.resolve();await exporting;assert.equal(app.calls.downloads.length,1);assert.equal(app.button('Print / Save PDF').disabled,false);
    await app.api.print();assert.equal(app.calls.prints,1);app.finish();
  }finally{app.dispose();}
});

test('malformed imported order history remains visible for review without crashing or being overwritten by a new order',async()=>{
  for(const procurementOrders of [{version:1,orders:[null,{}]},{version:99,orders:[]}]){
    const app=fixture({settings:{id:'main',companyName:'WOW',procurementOrders}}),before=JSON.stringify(procurementOrders.orders);
    try{app.api.open();assert(app.shell.body.querySelector('.wf-purchase-history').textContent.includes('Records to review'));app.api.acceptBarcode('MODEL-400');app.fill('wfPurchaseQty-0','1');app.fill('wfPurchaseSupplier','Factory');assert.equal(await app.api.save(),false);assert.equal(JSON.stringify(app.stored().procurementOrders.orders),before);}finally{app.dispose();}
  }
});
