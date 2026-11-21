'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const acorn = require('acorn');
const core = require('../package-label-core.js');
const helpers = require('../package-labels.js');

const source = fs.readFileSync(path.join(__dirname, '../package-labels.js'), 'utf8');
const parsed = acorn.parse(source, {ecmaVersion:'latest'});
const wrapper = parsed.body.find(node => node.type === 'ExpressionStatement').expression.callee;
const mount = wrapper.body.body.find(node => node.type === 'FunctionDeclaration' && node.id.name === 'mount');
assert(mount, 'the production package label controller exists');
const declarations = mount.body.body.filter(node => node.type === 'VariableDeclaration' && node.kind === 'let');
const functions = mount.body.body.filter(node => node.type === 'FunctionDeclaration' && !['textNode','button','enhance','translate'].includes(node.id.name));
// Run the real controller state and methods. Only DOM creation, image decoding,
// native dialogs and app navigation are represented by controllable boundaries.
const controllerCode = [...declarations, ...functions].map(node => source.slice(node.start,node.end)).join('\n');
const vendor = {window:{}};
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../vendor/JsBarcode.code128.min.js'),'utf8'),vendor);
const png = 'data:image/png;base64,AA==';
const tick = () => new Promise(resolve => setImmediate(resolve));
function deferred() {
  let resolve, reject;
  const promise = new Promise((yes,no) => {resolve=yes;reject=no;});
  return {promise,resolve,reject};
}
class Events {
  constructor() { this.listeners=new Map(); }
  addEventListener(type, callback, options={}) {
    const listeners=this.listeners.get(type)||[];listeners.push({callback,once:!!options.once});this.listeners.set(type,listeners);
  }
  removeEventListener(type, callback) { this.listeners.set(type,(this.listeners.get(type)||[]).filter(entry=>entry.callback!==callback)); }
  dispatch(type, detail={}) {
    for(const entry of [...(this.listeners.get(type)||[])]){
      if(entry.once)this.removeEventListener(type,entry.callback);
      entry.callback({type,target:this,...detail});
    }
  }
}
function element() {
  const attributes=new Map();
  return Object.assign(new Events(),{
    children:[],style:{},dataset:{},disabled:false,hidden:false,textContent:'',value:'',isConnected:true,clientWidth:600,
    setAttribute(name,value){attributes.set(name,String(value));},getAttribute(name){return attributes.get(name)??null;},removeAttribute(name){attributes.delete(name);},
    append(...children){for(const child of children){this.children.push(child);child.parentElement=this;}},
    replaceChildren(...children){for(const child of this.children){child.isConnected=false;child.removed=true;}this.children=[];this.append(...children);},
    remove(){this.removed=true;this.isConnected=false;},focus(){},querySelector(){return null;},querySelectorAll(){return[];}
  });
}
function fixture(options={}) {
  const first={id:'i1',invNo:'A1',companyName:'First customer',companyLogo:png,items:[{productId:'p1',name:'W400',type:'coffee_table',color:'Oak',qty:1,packets:1,image:png}]};
  const second={id:'i2',invNo:'A2',companyName:'Second customer',companyLogo:png,items:[{productId:'p2',name:'W900',type:'side_table',color:'Black',qty:2,packets:2,image:png}]};
  const state={invoices:[first,second],products:[],settings:{logo:png}};
  const calls={prints:0,frames:[],images:[],renderTurns:0,navigation:[],brand:0};
  const guards=new Map(),timers=new Map();let context, timerId=0, mode=options.printMode||'async';
  const fields=['printButton','detail','preview','empty','stage','invoiceTitle','customerName','counts','summary','identity','issueList','issues','counter','previous','next','status','retry','viewInvoice','change','list','more','filters','chooser','search','printRecovery','printRecoveryHint','profileSelect','badge','stockText','geometryNote','stockSizeNote','scaleNote','preferenceHint','printerHint'];
  const ui=Object.fromEntries(fields.map(name=>[name,element()]));ui.printRecovery.hidden=true;ui.printRecoveryHint.hidden=true;
  const document=Object.assign(new Events(),{body:element(),baseURI:'https://wow.example/app/',visibilityState:'visible',hidden:false,activeElement:null});
  const animationFrame=callback=>{calls.renderTurns++;queueMicrotask(()=>callback(0));return calls.renderTurns;};
  function image(src,kind) {
    const img=Object.assign(new Events(),{complete:true,naturalWidth:1,naturalHeight:1,src:src||''});
    const failure=typeof options.failImage==='function'?options.failImage(src,kind):options.failImage===src;
    if(!src||failure){img.naturalWidth=0;img.naturalHeight=0;}
    img.decode=()=>{
      calls.images.push({src:img.src,kind});
      const gate=kind==='preload'?options.preloadGate:kind==='print'?options.printGate:options.previewGate;
      return gate?.promise||Promise.resolve();
    };
    return img;
  }
  function frameElement() {
    const frame=element(),view=new Events(),media=Object.assign(new Events(),{matches:false});
    if(options.legacyMedia){
      media.addListener=callback=>Events.prototype.addEventListener.call(media,'change',callback);
      media.removeListener=callback=>Events.prototype.removeEventListener.call(media,'change',callback);
      media.addEventListener=undefined;media.removeEventListener=undefined;
    }
    const doc={html:'',images:[],fonts:{ready:Promise.resolve()},open(){},close(){},
      write(html){
        this.html=html;const kind=frame.className==='wf-package-print-frame'?'print':'preview';
        this.images=Array.from(html.matchAll(/<img\b([^>]*)>/g),match=>image(match[1].match(/\bsrc="([^"]*)"/)?.[1]?.replace(/&amp;/g,'&'),kind));
        this.fonts.ready=(kind==='print'?options.printFontsGate:options.previewFontsGate)?.promise||Promise.resolve();
      },
      querySelectorAll(selector){
        const className=selector==='.page'?'page':selector==='.barcode'?'barcode':selector==='.label-card'?'label-card':null;
        return className?Array.from(this.html.matchAll(new RegExp('class="'+className+'"','g')),()=>element()):[];
      }
    };
    Object.assign(view,{document:doc,matchMedia:()=>media,focus(){},print(){
      calls.prints++;
      if(mode==='throw')throw new Error('PRINT');
      if(mode==='sync')view.dispatch('afterprint');
    }});
    frame.contentWindow=view;frame.contentDocument=doc;frame.printMedia=media;calls.frames.push(frame);return frame;
  }
  document.createElement=tag=>{
    if(tag==='iframe')return frameElement();
    if(tag==='canvas')return {width:0,height:0,getContext:()=>({fillRect(){},fillStyle:''}),toDataURL:()=>png};
    return element();
  };
  const window=Object.assign(new Events(),{
    document,requestAnimationFrame:animationFrame,matchMedia:()=>({matches:false}),JsBarcode:vendor.window.JsBarcode,
    Image:function(){const img=image('pending','preload');Object.defineProperty(img,'src',{get(){return this.source||'';},set(value){this.source=value;const failure=typeof options.failImage==='function'?options.failImage(value,'preload'):options.failImage===value;this.naturalWidth=failure?0:1;this.naturalHeight=failure?0:1;}});return img;},
    WFAppUpdates:{registerGuard:(name,check)=>guards.set(name,check)},
    wfCompanyLogo:value=>{calls.brand++;return value||'/default-wow.png';}
  });
  const page={page:element(),body:element(),actions:element()};
  const ops={state:()=>state,locale:()=>'en',open:id=>{calls.navigation.push(id);context.enter();}};
  const sandbox={window,document,ops,core,helpers,console,URL,Promise,Map,Set,t:key=>key,page,labels:[],texts:[],
    make:(tag,className,value)=>{const node=document.createElement(tag);node.className=className||'';if(value!==undefined)node.textContent=value;return node;},
    setTimeout(callback,delay){const id=++timerId;timers.set(id,{callback,delay});return id;},clearTimeout:id=>timers.delete(id),
    ...ui};
  context=vm.createContext(sandbox);vm.runInContext(controllerCode,context);vm.runInContext("selectedId='i1';profileId='tw2008';",context);
  const read=expression=>vm.runInContext(expression,context);
  return {context,ui,state,window,document,calls,guards,timers,read,
    printFrames:()=>calls.frames.filter(frame=>frame.className==='wf-package-print-frame'),
    setPrintMode:value=>{mode=value;},
    finish(){read('activePrint')?.frame.contentWindow.dispatch('afterprint');},
    dispose(){vm.runInContext('revision++;',context);read('activePrint')?.cleanup(false);for(const key of ['preloadGate','previewGate','printGate','previewFontsGate','printFontsGate'])options[key]?.resolve();}
  };
}

test('removing an invoice invalidates every pending preparation before it can revive stale readiness',async()=>{
  const gate=deferred(),app=fixture({preloadGate:gate});
  try{
    const pending=app.context.prepare(true);await tick();const revision=app.read('revision');
    assert.equal(app.read('busy'),true);app.state.invoices=[];
    await app.context.prepare(true);
    assert(app.read('revision')>revision,'missing-source paths must invalidate older tokens');
    assert.equal(app.read('busy'),false);
    assert.equal(app.read('batch'),null);
    assert.equal(app.ui.stage.children.length,0);
    gate.resolve();await pending;
    assert.equal(app.read('ready'),false);assert.equal(app.read('selectedRecord'),null);
    assert.equal(app.ui.printButton.disabled,true);
  }finally{app.dispose();}
});

test('a newer selection wins when older preview image decoding completes later',async()=>{
  const gate=deferred(),app=fixture({previewGate:gate});
  try{
    const old=app.context.prepare(true);await tick();
    app.context.open('i2');await tick();gate.resolve();await old;await tick();
    assert.equal(app.read('selectedId'),'i2');assert.equal(app.read('batch.invNo'),'A2');
    assert.equal(app.ui.invoiceTitle.textContent,'A2');assert.equal(app.read('ready'),true);
    assert.equal(app.read('busy'),false);
  }finally{app.dispose();}
});

test('an active native sheet owns its original invoice while a later open request is queued and prepared after close',async()=>{
  const app=fixture();
  try{
    await app.context.prepare(true);await app.context.print();
    const job=app.read('activePrint'),frame=job.frame;
    app.context.open('i2');await tick();
    assert.equal(app.read('activePrint'),job);assert.equal(app.read('selectedId'),'i1');
    assert.equal(app.ui.invoiceTitle.textContent,'A1');assert.notEqual(frame.removed,true);
    await app.context.print();assert.equal(app.calls.prints,1);
    assert(frame.contentDocument.html.includes('W400'));assert(!frame.contentDocument.html.includes('W900'));
    app.finish();await tick();
    assert.equal(frame.removed,true);assert.equal(app.read('selectedId'),'i2');
    assert.equal(app.read('batch.invNo'),'A2');assert.equal(app.ui.invoiceTitle.textContent,'A2');assert.equal(app.read('ready'),true);
    await app.context.print();assert.equal(app.calls.prints,2);
    job.cleanup(true);assert(app.read('activePrint'),'late cleanup from an old job cannot remove the new job');
  }finally{app.dispose();}
});

test('a nonblocking print sheet retains its document and update guard across focus and visibility transitions',async()=>{
  const app=fixture();
  try{
    await app.context.prepare(true);await app.context.print();
    const frame=app.read('activePrint').frame,guard=app.guards.get('package-label-print');
    assert.equal(guard?.(),true);assert.equal(app.ui.printButton.getAttribute('aria-busy'),'true');
    app.window.dispatch('blur');app.document.visibilityState='hidden';app.document.dispatch('visibilitychange');
    app.document.visibilityState='visible';app.document.dispatch('visibilitychange');app.window.dispatch('focus');
    for(const timer of [...app.timers.values()])timer.callback();
    assert.notEqual(frame.removed,true,'a focus return or timer cannot prove the mobile print sheet closed');
    assert(app.read('activePrint'));assert.equal(guard(),true);assert.equal(app.ui.printRecovery.hidden,false);
    app.finish();await tick();assert.equal(guard(),false);assert.equal(app.read('activePrint'),null);
  }finally{app.dispose();}
});

test('modern and legacy print media events clean up only after entering and leaving print media',async()=>{
  for(const legacyMedia of [false,true]){
    const app=fixture({legacyMedia});
    try{
      await app.context.prepare(true);await app.context.print();const frame=app.read('activePrint').frame;
      frame.printMedia.dispatch('change',{matches:false});assert(app.read('activePrint'));
      frame.printMedia.matches=true;frame.printMedia.dispatch('change',{matches:true});assert(app.read('activePrint'));
      frame.printMedia.matches=false;frame.printMedia.dispatch('change',{matches:false});await tick();
      assert.equal(app.read('activePrint'),null);assert.equal(frame.removed,true);
    }finally{app.dispose();}
  }
});

test('explicit recovery cannot discard active print media and releases an otherwise stranded job only after confirmation',async()=>{
  const app=fixture();
  try{
    await app.context.prepare(true);await app.context.print();const frame=app.read('activePrint').frame;
    frame.printMedia.matches=true;app.context.recoverPrint();assert(app.read('activePrint'));
    frame.printMedia.matches=false;app.context.recoverPrint();await tick();
    assert.equal(Boolean(app.read('activePrint')),false);assert.equal(frame.removed,true);
    assert.equal(app.ui.printRecovery.hidden,true);assert.equal(app.guards.get('package-label-print')(),false);
  }finally{app.dispose();}
});

test('synchronous native completion and a thrown native print call leave no abandoned job',async()=>{
  for(const printMode of ['sync','throw']){
    const app=fixture({printMode});
    try{
      await app.context.prepare(true);await app.context.print();await tick();
      assert.equal(app.calls.prints,1);assert.equal(app.read('activePrint'),null);
      assert.equal(app.read('busy'),false);assert(app.printFrames().every(frame=>frame.removed));
      assert.equal(app.guards.get('package-label-print')?.(),false);
      if(printMode==='throw')assert.equal(app.read('errorKey'),'error');
      else assert.equal(app.read('statusKey'),'printed');
    }finally{app.dispose();}
  }
});

test('native print waits for every print document image and fonts while duplicate activations share one job',async()=>{
  const images=deferred(),fonts=deferred(),app=fixture({printGate:images,printFontsGate:fonts});
  try{
    await app.context.prepare(true);const pending=app.context.print();await tick();
    assert.equal(app.calls.prints,0);assert.equal(app.printFrames().length,1);assert.equal(app.ui.printButton.disabled,true);
    await app.context.print();assert.equal(app.printFrames().length,1);
    images.resolve();await tick();assert.equal(app.calls.prints,0);
    fonts.resolve();await pending;assert.equal(app.calls.prints,1);
  }finally{app.dispose();}
});

test('an in-place invoice edit or issuer identity change invalidates an already prepared print',async()=>{
  for(const kind of ['invoice','issuer']){
    const app=fixture();
    try{
      await app.context.prepare(true);
      if(kind==='invoice')app.state.invoices[0].items[0].color='Changed';else app.state.settings.logo='/new-logo.png';
      await app.context.print();assert.equal(app.calls.prints,0);
      assert.equal(app.read('ready'),false);assert.equal(app.read('errorKey'),'changed');
      await app.context.prepare(true);await app.context.print();assert.equal(app.calls.prints,1);
    }finally{app.dispose();}
  }
});

test('an invoice edited while print assets are loading never opens a dialog for the old document',async()=>{
  const gate=deferred(),app=fixture({printGate:gate});
  try{
    await app.context.prepare(true);const pending=app.context.print();await tick();
    app.state.invoices[0].items[0].packets=2;gate.resolve();await pending;
    assert.equal(app.calls.prints,0);assert.equal(app.read('activePrint'),null);
    assert.equal(app.read('ready'),false);assert.equal(app.read('errorKey'),'changed');
  }finally{app.dispose();}
});

test('supplied unsafe image sources block printing but genuinely absent optional logos remain optional',async()=>{
  const app=fixture();
  try{
    app.state.invoices[0].companyLogo='javascript:alert(1)';await app.context.prepare(true);
    assert.equal(app.read('ready'),false);assert.equal(app.read('errorKey'),'blocked');
    assert.equal(app.read('batch.issues.find(issue=>issue.code==="unsafeImage").severity'),'error');
    await app.context.print();assert.equal(app.calls.prints,0);
    app.state.invoices[0].companyLogo=null;app.state.invoices[0].packageLabelSnapshot={companyLogo:'',customerLogo:null};
    await app.context.prepare(true);assert.equal(app.read('ready'),true);
  }finally{app.dispose();}
});

test('the current issuer uses the established WOW logo resolver and a saved blank issuer remains blank',async()=>{
  const app=fixture();
  try{
    app.state.settings.logo='';await app.context.prepare(true);
    assert.equal(app.read('batch.companyLogo'),'https://wow.example/default-wow.png');assert(app.calls.brand>0);
    app.state.invoices[0].packageLabelSnapshot={companyLogo:'',customerLogo:null};
    const count=app.calls.brand;await app.context.prepare(true);
    assert.equal(app.read('batch.companyLogo'),'');assert.equal(app.calls.brand,count);
  }finally{app.dispose();}
});

test('new identity captures use the resolved WOW brand while an existing snapshot remains unchanged',()=>{
  const app=fixture();
  try{
    app.state.settings.logo='';
    const saved=app.context.captureInvoiceIdentity(app.state.invoices[0]);
    assert.equal(saved.packageLabelSnapshot.companyLogo,'/default-wow.png');
    assert.equal(app.state.invoices[0].packageLabelSnapshot,undefined);
    const existing={...saved,packageLabelSnapshot:{companyLogo:'',customerLogo:null}},count=app.calls.brand;
    assert.equal(app.context.captureInvoiceIdentity(existing).packageLabelSnapshot,existing.packageLabelSnapshot);
    assert.equal(app.calls.brand,count,'an existing explicit blank identity does not consult the current logo');
  }finally{app.dispose();}
});

test('dynamic invoice captions do not accumulate detached nodes and archive captions translate on the live DOM',()=>{
  const app=fixture();
  try{
    for(const name of ['button','translate']){
      const node=mount.body.body.find(entry=>entry.type==='FunctionDeclaration'&&entry.id.name===name);
      vm.runInContext(source.slice(node.start,node.end),app.context);
    }
    let control;
    for(let index=0;index<80;index++)control=app.context.button('title','btn',()=>{});
    assert.equal(app.context.texts.length,0,'removed invoice-card controls are not retained in the static localization registry');
    const caption=control.children[0],archive=element();
    app.document.querySelectorAll=selector=>selector==='[data-wf-package-text]'?[caption]:selector==='[data-wf-ops-label="invoice-archive"]'?[archive]:[];
    app.context.t=key=>'translated '+key;app.context.ops.label=key=>'localized '+key;
    app.context.translate();
    assert.equal(caption.textContent,'translated title');assert.equal(archive.textContent,'localized invoice-archive');
  }finally{app.dispose();}
});

test('archived and identity-snapshotted invoices never refill missing or null saved product fields from the live catalog',async()=>{
  for(const historical of [{archived:true},{packageLabelSnapshot:{companyLogo:'',customerLogo:null}}]){
    const app=fixture();
    try{
      Object.assign(app.state.invoices[0],historical);
      app.state.invoices[0].items=[{productId:'p1',qty:1,packets:null,productSnapshot:{name:null,image:null,type:null}}];
      app.state.products=[{id:'p1',name:'NEW LIVE NAME',image:png,type:'coffee_table',packets:5}];
      await app.context.prepare(true);
      assert.equal(app.read('batch.model.items[0].name'),'');
      assert.equal(app.read('batch.model.items[0].image'),'');
      assert.equal(app.read('batch.model.items[0].packets'),null);
      assert.equal(app.read('ready'),false);assert.equal(app.read('errorKey'),'blocked');
    }finally{app.dispose();}
  }
});

test('an image first used on a later sheet still blocks readiness if it cannot load',async()=>{
  const app=fixture({failImage:'https://wow.example/broken.png'});
  try{
    app.state.invoices[0].items[0].qty=8;
    app.state.invoices[0].items.push({productId:'late',name:'LATE',type:'other',qty:1,packets:1,image:'/broken.png'});
    await app.context.prepare(true);
    assert.equal(app.read('batch.pageCount'),2);assert.equal(app.read('ready'),false);assert.equal(app.read('errorKey'),'imageError');
    await app.context.print();assert.equal(app.calls.prints,0);
  }finally{app.dispose();}
});

test('a large print job contains every sheet and label and yields before opening native printing',async()=>{
  const app=fixture();
  try{
    app.state.invoices[0].items[0].qty=41;await app.context.prepare(true);
    const turns=app.calls.renderTurns;await app.context.print();
    const frame=app.read('activePrint').frame;
    assert.equal(frame.contentDocument.querySelectorAll('.page').length,6);
    assert.equal(frame.contentDocument.querySelectorAll('.barcode').length,41);
    assert.equal(frame.contentDocument.images.length,41*4);
    assert(app.calls.renderTurns>turns,'large printing gives the browser a render turn');
    assert.equal(app.calls.prints,1);
  }finally{app.dispose();}
});

test('paper selection automatically rebuilds the same invoice into four or eight labels per sheet and remembers the choice',async()=>{
  const app=fixture(),preferences=new Map();
  app.window.localStorage={getItem:key=>preferences.get(key),setItem:(key,value)=>preferences.set(key,value)};
  app.state.invoices[0].items[0].qty=9;
  try{
    await app.context.prepare(true);
    const labels=JSON.stringify(app.read('batch.labels'));
    assert.equal(app.read('batch.pageCount'),2);
    assert.equal(app.context.changeProfile('tw2004'),true);await tick();
    assert.equal(app.read('batch.profileId'),'tw2004');assert.equal(app.read('batch.pageCount'),3);
    assert.equal(JSON.stringify(app.read('batch.labels')),labels);
    assert.equal(app.read('ready'),true);assert.equal(app.ui.profileSelect.value,'tw2004');
    assert.equal(preferences.get('wf_package_label_profile_v1'),'tw2004');
    assert.equal(app.context.changeProfile('tw2008'),true);await tick();
    assert.equal(app.read('batch.pageCount'),2);assert.equal(app.read('ready'),true);
    assert.equal(preferences.get('wf_package_label_profile_v1'),'tw2008');
  }finally{app.dispose();}
});

test('an open print job locks paper choice and retains every original sheet',async()=>{
  const app=fixture();app.state.invoices[0].items[0].qty=9;
  try{
    await app.context.prepare(true);await app.context.print();
    const job=app.read('activePrint');
    assert.equal(app.ui.profileSelect.disabled,true);
    assert.equal(app.context.changeProfile('tw2004'),false);
    assert.equal(app.read('profileId'),'tw2008');assert.equal(app.read('batch.pageCount'),2);
    assert.equal(app.read('activePrint'),job);assert.equal(app.calls.prints,1);
    app.finish();await tick();assert.equal(app.ui.profileSelect.disabled,false);
  }finally{app.dispose();}
});

test('Zebra rolls resize both preview and native print to 100 by 150 mm with one label per page',async()=>{
  const app=fixture(),preferences=new Map();
  app.window.localStorage={setItem:(key,value)=>preferences.set(key,value)};
  app.state.invoices[0].items[0].qty=9;
  try{
    assert.equal(app.context.changeProfile('zebra100x150'),true);await tick();
    assert.equal(app.read('ready'),true);assert.equal(app.read('batch.pageCount'),9);
    assert.equal(app.ui.scaleNote.textContent,'rollScale');
    assert(Math.abs(parseFloat(app.read('previewFrame.style.width'))-100*96/25.4)<0.01);
    assert(Math.abs(parseFloat(app.read('previewFrame.style.height'))-150*96/25.4)<0.01);
    await app.context.print();
    const frame=app.read('activePrint.frame');
    assert.equal(frame.style.width,'100mm');assert.equal(frame.style.height,'150mm');
    assert.equal(frame.contentDocument.querySelectorAll('.page').length,9);
    assert.equal(frame.contentDocument.querySelectorAll('.barcode').length,9);
    assert.equal(preferences.get('wf_package_label_profile_v1'),'zebra100x150');
  }finally{app.dispose();}
});

test('the separate 150 by 100 mm roll preference uses landscape paper and restores the A4 job when selected',async()=>{
  const app=fixture();app.state.invoices[0].items[0].qty=9;
  try{
    app.context.changeProfile('zebra150x100');await tick();
    assert.equal(app.read('batch.pageCount'),9);assert.equal(app.ui.printerHint.textContent,'widePrinter');
    assert(Math.abs(parseFloat(app.read('previewFrame.style.width'))-150*96/25.4)<0.01);
    assert(Math.abs(parseFloat(app.read('previewFrame.style.height'))-100*96/25.4)<0.01);
    await app.context.print();const frame=app.read('activePrint.frame');
    assert.equal(frame.style.width,'150mm');assert.equal(frame.style.height,'100mm');
    app.finish();await tick();app.context.changeProfile('tw2004');await tick();
    assert.equal(app.read('batch.pageCount'),3);assert.equal(app.ui.printerHint.hidden,true);
    assert(Math.abs(parseFloat(app.read('previewFrame.style.width'))-210*96/25.4)<0.01);
  }finally{app.dispose();}
});
