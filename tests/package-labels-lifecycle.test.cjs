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
function descendants(node) { return node.children.flatMap(child=>[child,...descendants(child)]); }
function pickerParts(app) {
  const picker=app.ui.paperPicker,all=descendants(picker.dialog);
  return {picker,byId:id=>all.find(node=>node.id===id),
    family:id=>all.find(node=>node.dataset.paperFamily===id),direction:name=>all.find(node=>node.dataset.wfOrientation===name)};
}
function fixture(options={}) {
  const first={id:'i1',invNo:'A1',companyName:'First customer',companyLogo:png,items:[{productId:'p1',name:'W400',type:'coffee_table',color:'Oak',qty:1,packets:1,image:png}]};
  const second={id:'i2',invNo:'A2',companyName:'Second customer',companyLogo:png,items:[{productId:'p2',name:'W900',type:'side_table',color:'Black',qty:2,packets:2,image:png}]};
  const state={invoices:[first,second],products:[],settings:{logo:png}};
  const calls={prints:0,frames:[],images:[],renderTurns:0,navigation:[],brand:0};
  const guards=new Map(),timers=new Map();let context, timerId=0, mode=options.printMode||'async';
  const fields=['printButton','detail','preview','empty','stage','invoiceTitle','customerName','counts','summary','identity','issueList','issues','counter','previous','next','status','retry','viewInvoice','change','list','more','filters','chooser','search','printRecovery','printRecoveryHint','mediaIcon','badge','stockText','geometryNote','stockSizeNote','scaleNote','preferenceHint','printerHint',
    'selectionPanel','selectionCount','allLabels','lostLabels','selectionHint','selectionTools','labelSearch','clearLabels','labelOptions','moreLabels','historyHost'];
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
    const node=element();node.tagName=tag;
    node.focus=()=>{document.activeElement=node;};
    if(tag==='dialog'){
      node.showModal=()=>{node.open=true;node.setAttribute('open','');};
      node.close=()=>{node.open=false;node.removeAttribute('open');node.dispatch('close');};
    }
    node.querySelectorAll=selector=>descendants(node).filter(item=>item.tagName===selector);
    return node;
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
  ui.paperPicker=helpers.createPaperPicker({document,make:sandbox.make,core,t:key=>context.t(key),getLocale:()=>context.ops.locale(),
    getApplied:()=>vm.runInContext('profileId',context),isLocked:()=>Boolean(vm.runInContext('activePrint',context)),
    onOpenChange:()=>context.updateControls(),onApply:id=>context.changeProfile(id)});
  sandbox.paperPicker=ui.paperPicker;
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
    assert.equal(app.read('ready'),true);assert.equal(app.ui.paperPicker.trigger.dataset.profileId,'tw2004');
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
    assert.equal(app.ui.paperPicker.trigger.disabled,true);
    assert.equal(app.context.changeProfile('tw2004'),false);
    assert.equal(app.read('profileId'),'tw2008');assert.equal(app.read('batch.pageCount'),2);
    assert.equal(app.read('activePrint'),job);assert.equal(app.calls.prints,1);
    app.finish();await tick();assert.equal(app.ui.paperPicker.trigger.disabled,false);
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

test('80 by 100 mm thermal stock is remembered and printed as roll pages without inventing a roll capacity',async()=>{
  const app=fixture(),preferences=new Map();app.state.invoices[0].items[0].qty=9;
  app.window.localStorage={setItem:(key,value)=>preferences.set(key,value)};
  try{
    assert.equal(app.context.changeProfile('thermal80x100'),true);await tick();
    assert.equal(app.read('ready'),true);assert.equal(app.read('batch.pageCount'),9);
    assert.equal(app.ui.scaleNote.textContent,'rollScale');
    assert.equal(app.ui.stockSizeNote.textContent,'sizeRoll');
    assert.equal(app.ui.counts.children[1].children[1].textContent,'rollPages');
    assert.equal(app.ui.printerHint.hidden,false);assert.equal(app.ui.printerHint.textContent,'printerSize');
    assert(Math.abs(parseFloat(app.read('previewFrame.style.width'))-80*96/25.4)<0.01);
    assert(Math.abs(parseFloat(app.read('previewFrame.style.height'))-100*96/25.4)<0.01);
    assert.equal(preferences.get('wf_package_label_profile_v1'),'thermal80x100');
    await app.context.print();const frame=app.read('activePrint.frame');
    assert.equal(frame.style.width,'80mm');assert.equal(frame.style.height,'100mm');
    assert.equal(frame.contentDocument.querySelectorAll('.page').length,9);
    assert.equal(frame.contentDocument.querySelectorAll('.barcode').length,9);
    assert.equal(app.context.changeProfile('zebra100x150'),false);
    app.finish();await tick();
    assert.equal(app.context.changeProfile('tw2004'),true);await tick();
    assert.equal(app.read('batch.pageCount'),3);assert.equal(app.ui.printerHint.hidden,true);
  }finally{app.dispose();}
});

for(const [width,height] of [[70,100],[100,100],[100,200],[100,50],[50,100],[80,500],[500,80],[100,80],[100,70],[200,100]]){
  test(`${width} by ${height} mm thermal stock keeps its own dimensions, caption and remembered print job`,async()=>{
    const id=`thermal${width}x${height}`,app=fixture(),preferences=new Map();
    app.state.invoices[0].items[0].qty=9;
    app.window.localStorage={setItem:(key,value)=>preferences.set(key,value)};
    try{
      assert.equal(app.context.changeProfile(id),true);await tick();
      assert.equal(app.read('ready'),true);assert.equal(app.read('batch.pageCount'),9);
      assert.equal(app.ui.badge.textContent,'thermal');assert(app.ui.stockText.textContent.includes(`${width} × ${height} mm`));
      assert(app.ui.stockText.textContent.endsWith(width===height?'square':width>height?'landscape':'portrait'));
      assert.equal(app.ui.stockSizeNote.textContent,'sizeRoll');
      assert.equal(preferences.get('wf_package_label_profile_v1'),id);
      assert(Math.abs(parseFloat(app.read('previewFrame.style.width'))-width*96/25.4)<0.01);
      assert(Math.abs(parseFloat(app.read('previewFrame.style.height'))-height*96/25.4)<0.01);
      await app.context.print();const frame=app.read('activePrint.frame');
      assert.equal(frame.style.width,`${width}mm`);assert.equal(frame.style.height,`${height}mm`);
      assert.equal(frame.contentDocument.querySelectorAll('.page').length,9);
      assert.equal(frame.contentDocument.querySelectorAll('.barcode').length,9);
      assert.equal(app.context.changeProfile('tw2004'),false);
      app.finish();await tick();assert.equal(app.context.changeProfile('tw2004'),true);await tick();
      assert.equal(app.read('batch.pageCount'),3);
    }finally{app.dispose();}
  });
}

for(const [id,pages,badge] of [['tw2004Landscape',3,'TANEX TW-2004'],['tw2008Landscape',2,'TANEX TW-2008']]){
  test(`${id} preserves its Tanex stock identity and prints landscape A4 with the original sheet count`,async()=>{
    const app=fixture();app.state.invoices[0].items[0].qty=9;
    try{
      assert.equal(app.context.changeProfile(id),true);await tick();
      assert.equal(app.ui.badge.textContent,badge);assert(app.ui.stockText.textContent.includes(id==='tw2004Landscape'?'4 / A4':'8 / A4'));
      assert(app.ui.stockText.textContent.endsWith('landscape'));
      assert.equal(app.read('ready'),true);assert.equal(app.read('batch.pageCount'),pages);
      assert(Math.abs(parseFloat(app.read('previewFrame.style.width'))-297*96/25.4)<0.01);
      assert(Math.abs(parseFloat(app.read('previewFrame.style.height'))-210*96/25.4)<0.01);
      await app.context.print();const frame=app.read('activePrint.frame');
      assert.equal(frame.style.width,'297mm');assert.equal(frame.style.height,'210mm');
      assert.equal(frame.contentDocument.querySelectorAll('.page').length,pages);
      assert.equal(frame.contentDocument.querySelectorAll('.barcode').length,9);
      assert.equal(app.context.changeProfile('thermal100x50'),false);
    }finally{app.dispose();}
  });
}

test('picker draft leaves the prepared invoice unchanged until Apply, and native printing locks it',async()=>{
  const app=fixture(),writes=[];app.state.invoices[0].items[0].qty=9;
  app.window.localStorage={setItem:(key,value)=>writes.push(value)};
  try{
    await app.context.prepare(true);
    const {picker,byId,direction}=pickerParts(app),batch=app.read('batch'),frames=app.calls.frames.length;
    picker.trigger.dispatch('click');assert.equal(picker.isOpen(),true);
    direction('landscape').dispatch('click');
    assert.equal(picker.dialog.dataset.profileId,'tw2008Landscape');assert.equal(app.read('batch'),batch);
    assert.equal(app.ui.printButton.disabled,true);await app.context.print();assert.equal(app.calls.prints,0);
    assert.equal(app.calls.frames.length,frames);assert.deepEqual(writes,[]);
    byId('wfPackageProfileApply').dispatch('click');await tick();
    assert.equal(picker.isOpen(),false);assert.deepEqual(writes,['tw2008Landscape']);
    assert.equal(app.read('profileId'),'tw2008Landscape');assert.equal(app.read('batch.pageCount'),2);
    assert.equal(app.calls.frames.length,frames+1,'Apply generates one sheet preview');
    await app.context.print();assert.equal(picker.trigger.disabled,true);
    assert.equal(picker.open(),false);assert.equal(app.read('activePrint.frame.style.width'),'297mm');
    app.finish();await tick();assert.equal(picker.open(),true);
    direction('portrait').dispatch('click');byId('wfPackageProfileApply').dispatch('click');await tick();
    assert.equal(app.read('profileId'),'tw2008');assert.deepEqual(writes,['tw2008Landscape','tw2008']);
  }finally{app.dispose();}
});

test('nine media families reach every supported profile and draw only the selected stock grid',()=>{
  const app=fixture(),{picker,byId,direction}=pickerParts(app);
  try{
    picker.open();
    const families=descendants(picker.dialog).filter(node=>node.dataset.paperFamily),ids=new Set();
    assert.equal(families.length,9);
    for(const family of families){
      family.dispatch('click');
      for(const key of ['portrait','landscape','square']){
        const control=direction(key);if(control.hidden)continue;
        control.dispatch('click');
        const id=picker.dialog.dataset.profileId,paper=core.profiles[id],diagram=byId('wfPackageProfileDiagram');
        ids.add(id);assert.equal(control.getAttribute('aria-pressed'),'true');
        assert.equal(family.getAttribute('aria-pressed'),'true');
        assert.equal(diagram.children.length,paper.columns*paper.rows);
        assert.equal(diagram.dataset.media,paper.mediaType||'sheet');
        assert(Math.abs(parseFloat(diagram.style.width)/parseFloat(diagram.style.height)-paper.pageWidthMM/paper.pageHeightMM)<1e-9);
      }
    }
    assert.deepEqual([...ids].sort(),Object.keys(core.profiles).sort());
    assert.equal(app.calls.frames.length,0);
    assert.equal(picker.trigger.dataset.profileId,'tw2008');
  }finally{app.dispose();}
});

test('closing by Cancel, Escape, backdrop or route discards the draft and keeps the existing ready preview',async()=>{
  const app=fixture(),{picker,byId,family,direction}=pickerParts(app),writes=[];
  try{
    app.window.localStorage={setItem:(key,id)=>writes.push(id)};
    await app.context.prepare(true);
    const batch=app.read('batch'),frames=app.calls.frames.length;
    for(const method of ['cancel','escape','nativeCancel','backdrop','route']){
      assert.equal(picker.open(),true);
      family('thermal80x500').dispatch('click');
      assert.equal(picker.dialog.dataset.profileId,'thermal80x500','a family starts in its displayed orientation');
      direction('landscape').dispatch('click');
      family('thermal80x500').dispatch('click');
      assert.equal(picker.dialog.dataset.profileId,'thermal500x80');
      if(method==='cancel')byId('wfPackageProfileCancel').dispatch('click');
      else if(method==='escape')picker.dialog.dispatch('keydown',{key:'Escape',preventDefault(){},stopPropagation(){}});
      else if(method==='nativeCancel')picker.dialog.dispatch('cancel',{preventDefault(){}});
      else if(method==='backdrop')picker.dialog.dispatch('click');
      else picker.close(false);
      assert.equal(picker.isOpen(),false);assert.equal(picker.trigger.dataset.profileId,'tw2008');
      assert.equal(app.read('batch'),batch);assert.equal(app.calls.frames.length,frames);
      assert.equal(app.ui.printButton.disabled,false);
      if(method!=='route')assert.equal(app.document.activeElement,picker.trigger);
      assert.deepEqual(writes,[]);
    }
  }finally{app.dispose();}
});

test('modal keeps keyboard focus, relocalizes the live draft, and restores fallback background state',()=>{
  const app=fixture(),{picker,byId,family,direction}=pickerParts(app);
  try{
    picker.dialog.showModal=undefined;picker.dialog.close=undefined;
    const shell=element(),alreadyInert=element();alreadyInert.inert=true;
    app.document.body.append(shell,alreadyInert,picker.dialog);
    picker.open();assert.equal(shell.inert,true);assert.equal(alreadyInert.inert,true);
    assert.equal(picker.trigger.getAttribute('aria-expanded'),'true');
    const first=family('tw2004'),last=byId('wfPackageProfileApply');
    const tab=shiftKey=>picker.dialog.dispatch('keydown',{key:'Tab',shiftKey,preventDefault(){}});
    tab(true);assert.equal(app.document.activeElement,last);
    tab(false);assert.equal(app.document.activeElement,first);
    tab(true);assert.equal(app.document.activeElement,last);
    family('thermal100x100').dispatch('click');
    assert.equal(direction('square').hidden,false);assert.equal(direction('portrait').hidden,true);assert.equal(direction('landscape').hidden,true);
    app.context.t=key=>'AR '+key;app.context.ops.locale=()=>'ar';picker.refresh();
    assert.equal(picker.dialog.dataset.profileId,'thermal100x100');assert.equal(picker.dialog.dir,'rtl');
    assert.equal(byId('wfPackageProfileApply').textContent,'AR applyPaper');
    picker.close();assert.equal(shell.inert,false);assert.equal(alreadyInert.inert,true);
    assert.equal(app.document.activeElement,picker.trigger);assert.equal(picker.trigger.getAttribute('aria-expanded'),'false');
  }finally{app.dispose();}
});

test('the actual picker captions cover Arabic, Turkish, English, French and Russian',()=>{
  const declarations=mount.body.body.filter(node=>node.type==='VariableDeclaration');
  const words=declarations.find(node=>node.declarations.some(declaration=>declaration.id.name==='pickerWords'));
  const local=vm.runInNewContext(source.slice(words.start,words.end)+';pickerWords');
  const keys=['oneLabel','pickerTitle','changePaper','sheetPaper','rollPaper','cancelPaper','applyPaper','paperPreview'];
  assert.deepEqual(Object.keys(local).sort(),['ar','en','fr','ru','tr']);
  for(const language of Object.keys(local)){
    for(const key of keys)assert(local[language][key]?.trim(),language+' '+key);
    if(language!=='en')assert.notEqual(local[language].pickerTitle,local.en.pickerTitle);
  }
});

test('lost-label mode starts empty and rapid selection previews only original labels without reloading the invoice assets',async()=>{
  const app=fixture();app.state.invoices[0].items[0].qty=3;app.state.invoices[0].items[0].packets=3;
  const original=JSON.stringify(app.state.invoices[0]);
  try{
    await app.context.prepare(true);
    const preloads=app.calls.images.filter(image=>image.kind==='preload').length,barcodes=app.read('barcodeImages');
    assert.equal(app.context.changeSelectionMode('selected'),true);await tick();
    assert.equal(app.read('batch.labelCount'),0);assert.equal(app.ui.printButton.disabled,true);assert.equal(app.ui.preview.hidden,true);
    await app.context.print();assert.equal(app.calls.prints,0);
    const id=app.read('fullBatch.labels[5].labelId'),other=app.read('fullBatch.labels[8].labelId');
    assert.equal(app.context.toggleLabel(id),true);assert.equal(app.context.toggleLabel(other),true);await tick();
    assert.equal(app.read('ready'),true);assert.deepEqual(Array.from(app.read('batch.labels'),label=>label.sequenceNumber),[6,9]);
    assert.equal(app.read('batch.labels[0].currentPacket'),2);assert.equal(app.read('batch.labels[0].unitIndex'),3);
    assert.equal(app.read('batch.originalLabelCount'),9);assert.equal(app.read('batch.model.items[0].qty'),3);
    assert.equal(app.read('previewFrame.contentDocument.querySelectorAll(".barcode").length'),2);
    assert.equal(app.read('barcodeImages'),barcodes);
    assert.equal(app.calls.images.filter(image=>image.kind==='preload').length,preloads);
    assert.equal(JSON.stringify(app.state.invoices[0]),original);
    app.context.toggleLabel(id);app.context.toggleLabel(other);await tick();
    assert.equal(app.read('batch.labelCount'),0);assert.equal(app.ui.printButton.disabled,true);
    await app.context.print();assert.equal(app.calls.prints,0);
  }finally{app.dispose();}
});

test('paper, orientation, language and all-label mode preserve a selected original label; source edits and another invoice clear it safely',async()=>{
  const app=fixture();app.state.invoices[0].items[0].qty=4;app.state.invoices[0].items[0].packets=2;
  try{
    await app.context.prepare(true);app.context.changeSelectionMode('selected');
    const id=app.read('fullBatch.labels[6].labelId');app.context.toggleLabel(id);await tick();
    const preloadCount=app.calls.images.filter(image=>image.kind==='preload').length;
    app.context.changeProfile('thermal100x50');await tick();
    assert.equal(app.read('batch.labels[0].labelId'),id);assert.equal(app.read('batch.labels[0].sequenceNumber'),7);
    assert.equal(app.read('batch.labels[0].currentPacket'),2);assert.equal(app.read('batch.pageCount'),1);
    app.context.ops.locale=()=>'ar';app.context.renderMeta();
    assert.equal(app.read('selectedLabelIds.has(batch.labels[0].labelId)'),true);
    app.context.changeSelectionMode('all');await tick();assert.equal(app.read('batch.labelCount'),8);
    app.context.changeSelectionMode('selected');await tick();assert.equal(app.read('batch.labels[0].labelId'),id);
    assert.equal(app.calls.images.filter(image=>image.kind==='preload').length,preloadCount);
    app.state.invoices[0].items[0].color='Changed';await app.context.prepare(true);
    assert.equal(app.read('selectedLabelIds.size'),0);assert.equal(app.read('batch.labelCount'),0);assert.equal(app.read('selectionMode'),'selected');
    assert.equal(app.ui.printButton.disabled,true);assert.equal(app.read('selectionWasReset'),true);
    app.context.toggleLabel(app.read('fullBatch.labels[0].labelId'));await tick();
    app.context.chooseInvoice('i2');await app.context.prepare(true);
    assert.equal(app.read('selectedLabelIds.size'),0);assert.equal(app.read('batch.labelCount'),0);assert.equal(app.read('selectionMode'),'selected');
    await app.context.print();assert.equal(app.calls.prints,0);
  }finally{app.dispose();}
});

test('lost-label thumbnails use the invoice photo, retain their DOM on selection, and isolate late image failures',async()=>{
  const app=fixture();app.state.invoices[0].items[0].image='/saved-blue-table.png';
  app.state.products=[{id:'p1',name:'Current catalog name',image:'/new-catalog-photo.png'}];
  try{
    await app.context.prepare(true);app.context.changeSelectionMode('selected');await tick();
    const label=app.read('fullBatch.labels[0]'),card=app.read('labelControls.get(fullBatch.labels[0].labelId)');
    const photo=descendants(card).find(node=>node.tagName==='img'),fallback=descendants(card).find(node=>node.className==='wf-package-label-no-photo');
    assert.equal(photo.src,'https://wow.example/saved-blue-table.png');assert.equal(photo.src,label.image);
    assert.equal(photo.alt,'');assert.equal(photo.loading,'lazy');assert.equal(fallback.hidden,true);
    assert.equal(card.getAttribute('role'),'checkbox');assert.match(card.getAttribute('aria-label'),/W400.*#1.*packet 1\/1.*unit 1\/1/);
    const preloads=app.calls.images.filter(image=>image.kind==='preload').length;
    card.dispatch('click');await tick();assert.equal(app.read('selectedLabelIds.has(fullBatch.labels[0].labelId)'),true);
    assert.equal(app.read('labelControls.get(fullBatch.labels[0].labelId)'),card);
    assert.equal(descendants(card).find(node=>node.tagName==='img'),photo);assert.equal(app.calls.images.filter(image=>image.kind==='preload').length,preloads);
    photo.dispatch('error');assert.equal(photo.removed,true);assert.equal(fallback.hidden,false);
    assert.equal(app.read('ready'),true);assert.equal(app.ui.printButton.disabled,false);assert.equal(card.getAttribute('aria-checked'),'true');
    app.context.chooseInvoice('i2');await app.context.prepare(true);await tick();
    const current=app.read('labelControls.get(fullBatch.labels[0].labelId)'),currentFallback=descendants(current).find(node=>node.className==='wf-package-label-no-photo');
    photo.dispatch('error');assert.equal(currentFallback.hidden,true);assert.equal(app.read('selectedLabelIds.size'),0);
  }finally{app.dispose();}
});

test('a saved missing label photo stays explicit instead of borrowing the current catalog image',async()=>{
  const app=fixture();app.state.invoices[0].archived=true;app.state.invoices[0].items[0].image=null;
  app.state.products=[{id:'p1',image:'/unrelated-new-photo.png'}];
  try{
    await app.context.prepare(true);app.context.changeSelectionMode('selected');await tick();
    const card=app.read('labelControls.get(fullBatch.labels[0].labelId)'),nodes=descendants(card);
    assert.equal(nodes.some(node=>node.tagName==='img'),false);
    const fallback=nodes.find(node=>node.className==='wf-package-label-no-photo');assert.equal(fallback.hidden,false);assert(nodes.some(node=>node.textContent==='noPhoto'));
    card.dispatch('click');await tick();assert.equal(app.read('batch.labelCount'),1);assert.equal(app.read('batch.labels[0].sequenceNumber'),1);
  }finally{app.dispose();}
});

test('large label lists are bounded and search keeps hidden selections while matching an exact original number in Arabic digits',async()=>{
  const app=fixture();app.state.invoices[0].items[0].qty=2000;
  try{
    await app.context.prepare(true);app.context.changeSelectionMode('selected');await tick();
    assert.equal(app.read('labelControls.size'),80);assert.equal(app.ui.moreLabels.hidden,false);
    assert.equal(descendants(app.ui.labelOptions).filter(node=>node.tagName==='img').length,80,'only the bounded visible choices create thumbnail nodes');
    const id=app.read('fullBatch.labels[199].labelId');app.context.toggleLabel(id);await tick();
    vm.runInContext("labelQuery='#٢٠٠';",app.context);app.context.renderLabelChoices();
    assert.equal(app.read('labelControls.size'),1);assert.equal(app.read('labelControls.has(fullBatch.labels[199].labelId)'),true);
    assert.equal(app.read('labelControls.get(fullBatch.labels[199].labelId).getAttribute("aria-checked")'),'true');
    vm.runInContext("labelQuery='no such product';",app.context);app.context.renderLabelChoices();
    assert.equal(app.read('labelControls.size'),0);assert.equal(app.read('selectedLabelIds.has(fullBatch.labels[199].labelId)'),true);
    assert.equal(app.read('batch.labelCount'),1);
    vm.runInContext("labelQuery='Oak';",app.context);app.context.renderLabelChoices();
    assert.equal(app.read('labelControls.size'),80);assert.equal(app.read('batch.labels[0].sequenceNumber'),200);
  }finally{app.dispose();}
});

test('a selective print records the exact immutable request before native printing and dialog close is never a printed confirmation',async()=>{
  const gate=deferred(),app=fixture(),auditCalls=[];
  app.state.invoices[0].items[0].qty=3;app.state.invoices[0].items[0].packets=3;
  app.window.WFLabelReprintHistory={
    async recordRequested(job,reason){auditCalls.push({method:'requested',job,reason,prints:app.calls.prints});await gate.promise;return 'audit-1';},
    async recordDialogClosed(id){auditCalls.push({method:'dialog_closed',id});},
    async recordFailed(id,error){auditCalls.push({method:'failed',id,error});}
  };
  const original=JSON.stringify(app.state.invoices);
  try{
    await app.context.prepare(true);app.context.changeSelectionMode('selected');
    const id=app.read('fullBatch.labels[5].labelId');app.context.toggleLabel(id);await tick();
    const pending=app.context.print();await tick();
    assert.equal(auditCalls.length,1);assert.equal(auditCalls[0].prints,0);assert.equal(app.calls.prints,0);
    assert.equal(app.context.toggleLabel(id),false);assert.equal(app.context.changeProfile('tw2004'),false);
    const job=auditCalls[0].job;
    assert(Object.isFrozen(job));assert(Object.isFrozen(job.labels));assert(Object.isFrozen(job.labels[0]));
    assert.equal(job.invoiceId,'i1');assert.equal(job.invoiceNumber,'A1');assert.equal(job.customerName,'First customer');
    assert.equal(job.selectedLabelCount,1);assert.equal(job.originalLabelCount,9);assert.equal(job.labels[0].sequenceNumber,6);
    assert.equal(job.labels[0].currentPacket,2);assert.equal(job.labels[0].unitIndex,3);assert.equal(job.labels[0].quantity,3);
    assert.equal(job.profileId,'tw2008');assert.equal(job.paperProfile.pageWidthMM,210);assert.equal(auditCalls[0].reason.reason,'lost');
    assert.match(job.sourceFingerprint,/^wfpl-v1-[0-9a-f]{16}$/);assert(!job.sourceFingerprint.includes('data:'));
    gate.resolve();await pending;assert.equal(app.calls.prints,1);
    assert.equal(app.read('activePrint.frame.contentDocument.querySelectorAll(".barcode").length'),1);
    app.finish();await tick();assert.deepEqual(auditCalls.map(call=>call.method),['requested','dialog_closed']);
    assert.equal(auditCalls[1].id,'audit-1');assert.equal(JSON.stringify(app.state.invoices),original);
  }finally{gate.resolve();app.dispose();}
});

test('unavailable reprint history blocks native printing, and a failed native call records failure without changing quantities',async()=>{
  for(const failure of ['missing','storage','native']){
    const app=fixture({printMode:failure==='native'?'throw':'async'}),auditCalls=[];
    if(failure!=='missing')app.window.WFLabelReprintHistory={
      async recordRequested(){auditCalls.push('requested');if(failure==='storage')throw new Error('STORAGE');return 'audit-1';},
      async recordDialogClosed(){auditCalls.push('closed');},async recordFailed(id,error){auditCalls.push([id,error]);}
    };
    const original=JSON.stringify(app.state.invoices);
    try{
      await app.context.prepare(true);app.context.changeSelectionMode('selected');app.context.toggleLabel(app.read('fullBatch.labels[0].labelId'));await tick();
      await app.context.print();
      assert.equal(app.read('activePrint'),null);assert.equal(app.read('ready'),false);
      assert.equal(JSON.stringify(app.state.invoices),original);
      if(failure==='native'){assert.equal(app.calls.prints,1);assert.deepEqual(auditCalls,['requested',['audit-1','PRINT']]);}
      else{assert.equal(app.calls.prints,0);assert.equal(app.read('errorKey'),'auditError');}
    }finally{app.dispose();}
  }
});

test('an invoice changed while its audit request saves cannot open a stale selective print',async()=>{
  const gate=deferred(),app=fixture(),failed=[];
  app.window.WFLabelReprintHistory={async recordRequested(){await gate.promise;return 'audit-stale';},async recordFailed(id,error){failed.push([id,error]);}};
  try{
    await app.context.prepare(true);app.context.changeSelectionMode('selected');app.context.toggleLabel(app.read('fullBatch.labels[0].labelId'));await tick();
    const pending=app.context.print();await tick();app.state.invoices[0].items[0].qty=2;gate.resolve();await pending;
    assert.equal(app.calls.prints,0);assert.deepEqual(failed,[['audit-stale','STALE']]);assert.equal(app.read('activePrint'),null);
    await app.context.prepare(true);assert.equal(app.read('batch.labelCount'),0);assert.equal(app.read('selectedLabelIds.size'),0);
  }finally{gate.resolve();app.dispose();}
});

test('lost-label actions and errors have complete Arabic, Turkish, English, French and Russian captions',()=>{
  const declaration=mount.body.body.find(node=>node.type==='VariableDeclaration'&&node.declarations.some(item=>item.id.name==='selectionWords'));
  const local=vm.runInNewContext(source.slice(declaration.start,declaration.end)+';selectionWords');
  const keys=Object.keys(local.en);
  assert.deepEqual(Object.keys(local).sort(),['ar','en','fr','ru','tr']);
  for(const [language,values] of Object.entries(local)){
    assert.deepEqual(Object.keys(values),keys,language);
    for(const key of keys)assert(values[key]?.trim(),language+' '+key);
    if(language!=='en')assert.notEqual(values.lostLabels,local.en.lostLabels);
  }
});
