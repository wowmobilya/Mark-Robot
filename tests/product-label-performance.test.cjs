'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const acorn = require('acorn');
const core = require('../product-label-core.js');
const source = fs.readFileSync(require.resolve('../product-labels.js'), 'utf8');
const controller = acorn.parse(source, {ecmaVersion:'latest'}).body.find(node =>
  node.type === 'ExpressionStatement' && node.expression.callee?.type === 'ArrowFunctionExpression');
const statements = controller.expression.callee.body.body;
// Keep the production selection, search, queue, scheduling, asset readiness and
// preview controllers. Native layout and image construction are the boundaries.
const boundaries = new Set(['mount', 'refreshText', 'modelFor', 'buildPaper',
  'fitPaper', 'checkPaper', 'scalePreview', 'enhanceActions', 'icon']);
const code = statements.filter(node => node.type === 'VariableDeclaration' && node.kind === 'let' ||
  node.type === 'FunctionDeclaration' && !boundaries.has(node.id.name))
  .map(node => source.slice(node.start, node.end)).join('\n');

class Element extends EventTarget {
  constructor(tag = 'div', className = '', value = '') {
    super(); this.tagName=tag.toUpperCase();this.className=className;this.textContent=value;
    this.children=[];this.dataset={};this.style={};this.attributes=new Map();this.hidden=false;
    this.isConnected=true;this.value='';this.classList={add(){},remove(){},contains(){return false;}};
  }
  append(...nodes) {for(const node of nodes){if(node.tagName==='#FRAGMENT')this.append(...node.children);else{this.children.push(node);node.parentElement=this;}}}
  replaceChildren(...nodes) {for(const child of this.children)child.isConnected=false;this.children=[];this.append(...nodes);}
  setAttribute(name,value) {this.attributes.set(name,String(value));}
  getAttribute(name) {return this.attributes.get(name)??null;}
  removeAttribute(name) {this.attributes.delete(name);}
  focus() {}
  scrollIntoView() {}
  get firstElementChild() {return this.children[0]||null;}
  querySelectorAll(selector) {
    const nodes=this.children.flatMap(child=>[child,...child.querySelectorAll('*')]);
    if(selector==='*')return nodes;
    if(selector==='input[type="checkbox"]')return nodes.filter(node=>node.tagName==='INPUT'&&node.type==='checkbox');
    if(selector==='img')return nodes.filter(node=>node.tagName==='IMG');
    if(selector.startsWith('.'))return nodes.filter(node=>node.className.split(' ').includes(selector.slice(1)));
    return nodes.filter(node=>node.tagName===selector.toUpperCase());
  }
  querySelector(selector) {return this.querySelectorAll(selector)[0]||null;}
  click() {this.dispatchEvent(new Event('click'));}
}
const tick = () => new Promise(resolve=>setImmediate(resolve));
function deferred() {let resolve;const promise=new Promise(yes=>{resolve=yes;});return {promise,resolve};}

function fixture(count = 3, {fonts = Promise.resolve()} = {}) {
  const calls={builds:[],decoded:[],checked:[],reads:0,normalized:0};
  const products=Array.from({length:count},(_,index)=>({
    get id(){calls.reads++;return 'p'+index;},name:'Product '+index,barcode:'B'+index,
    dims:[{l:100,w:50,h:40}],image:''
  }));
  const appState={products,settings:{productLabels:{locale:'en'}}};
  const names=['workspace','preview','stage','languageToggle','languageChoices','preferenceNote','selection',
    'list','search','summary','currentName','counter','previous','next','printButton','status','errorBox',
    'catalogPanel','previewPanel','queue','emptyPreview','includeButton','editButton','resultsCount',
    'selectAllButton','clearButton','moreButton','printRecovery'];
  const ui=Object.fromEntries(names.map(name=>[name,new Element()]));
  ui.printButton.append(new Element('span'));
  const doc={baseURI:'https://labels.example/',documentElement:{lang:'en'},fonts:{ready:fonts},
    activeElement:null,createDocumentFragment:()=>new Element('#fragment')};
  let context;
  const sandbox={
    core:{...core,normalizeSearch(value){calls.normalized++;return core.normalizeSearch(value);}},
    window:{matchMedia:()=>({matches:true})},doc,root:doc.documentElement,page:new Element(),
    console,URL,Promise,Set,Map,AbortController,setTimeout,clearTimeout,
    requestAnimationFrame:callback=>{queueMicrotask(()=>callback(0));return 1;},
    cancelAnimationFrame(){},state:()=>appState,language:()=>doc.documentElement.lang,byId:()=>null,
    t:(key,params={})=>key+Object.values(params).join(' '),
    make:(tag,className,value)=>new Element(tag,className,value),icon:()=>new Element('svg'),
    translated:(element,key)=>{element.dataset.wfLabelCopy=key;return element;},
    mount(){},enhanceActions(){},scalePreview(){},refreshText(){context.renderPreview();},
    modelFor:product=>({...product,locale:vm.runInContext('printLocale',context)}),
    buildPaper(model,owner=doc){
      calls.builds.push(model.id);const paper=new Element('div','wf-label-paper');
      paper.dataset.productId=model.id;paper.ownerDocument=owner;
      const image=new Element('img');image.complete=true;image.naturalWidth=image.naturalHeight=20;
      image.decode=async()=>{calls.decoded.push(model.id);};paper.append(image);return paper;
    },
    fitPaper(){},checkPaper:paper=>calls.checked.push(paper.dataset.productId),
    paneButtons:{catalog:new Element('button'),preview:new Element('button')},filterButtons:{},
    fixtureUI:ui
  };
  context=vm.createContext(sandbox);vm.runInContext(code,context);
  vm.runInContext(names.map(name=>name+'=fixtureUI.'+name+';').join('\n')+
    '\nselected=new Set(state().products.map(product=>String(product.id)));available=[...selected];currentId="p0";opened=true;printLocale="en";',context);
  const read=expression=>vm.runInContext(expression,context);
  return {context,ui,calls,state:appState,read,async settle(){for(let i=0;i<5;i++)await tick();}};
}

test('large print queues use bounded DOM and linear product lookup while every selected card remains reachable',async()=>{
  const app=fixture(500);app.calls.reads=0;app.context.renderQueue();
  assert(app.calls.reads<=2500,'queue lookup must not scan the whole catalog for each selected card');
  assert(app.ui.queue.children.length<=40,'the queue must not mount hundreds of buttons');
  assert.equal(app.read('selectedIds().length'),500,'windowing cannot remove printable products');
  let jumps=0;
  while(app.read('currentId')!=='p499'&&jumps++<100){
    const jump=app.ui.queue.children.find(node=>node.dataset.queueStep==='next');
    if(jump)jump.click();else {
      const last=app.ui.queue.children.find(node=>node.dataset.productId==='p499');
      assert(last,'the last queue window must contain the final selected card');last.click();
    }
    await app.settle();
  }
  assert.equal(app.read('currentId'),'p499');
  assert(app.ui.queue.children.some(node=>node.dataset.productId==='p499'),'the final selected card must be shown in the queue');
  assert.equal(app.context.captureSelection(app.state.products,app.read('selectedIds()')).length,500);
});

test('search leaves the selected queue mounted and reuses normalized catalog data',()=>{
  const app=fixture(500);app.context.renderSelection();const first=app.ui.queue.firstElementChild;
  app.calls.normalized=0;app.ui.search.value='product 49';app.context.renderSelection();
  assert.equal(app.ui.queue.firstElementChild===first,true,'typing must not recreate the selected queue');
  assert(app.calls.normalized<30,'one search must not normalize every field in the catalog again');
  assert.deepEqual(app.ui.list.children.map(node=>node.dataset.productId),
    ['p49','p149','p249','p349','p449','p490','p491','p492','p493','p494','p495','p496','p497','p498','p499'],
    'cached search preserves the existing token-substring matching rules');
});

test('including or excluding products preserves the paper currently being inspected',async()=>{
  const app=fixture();await app.context.renderPreview();const paper=app.ui.stage.firstElementChild;
  app.context.setProductSelected('p2',false);await app.settle();
  assert.equal(app.ui.stage.firstElementChild===paper,true,'changing a print checkbox must not decode or rebuild the current card');
  assert.deepEqual(app.calls.builds,['p0']);assert.equal(app.read('selected.has("p2")'),false);
  app.context.setProductSelected('p0',false);await app.settle();
  assert.equal(app.read('currentId'),'p0');assert.equal(app.ui.stage.firstElementChild===paper,true);
});

test('navigating within a queue window keeps its buttons available to keyboard focus',async()=>{
  const app=fixture(40);app.context.renderQueue();
  const first=app.ui.queue.children.find(node=>node.dataset.productId==='p0');
  app.context.activateProduct('p1',false);await app.settle();
  assert.equal(app.ui.queue.children.includes(first),true,'a neighboring card must not replace the focused queue controls');
  assert.equal(first.getAttribute('aria-current'),'false');
  assert.equal(app.ui.queue.children.find(node=>node.dataset.productId==='p1').getAttribute('aria-current'),'true');
});

test('explicitly reopening a failed card retries preparation and clears its earlier error',async()=>{
  const app=fixture();let fail=true;
  app.context.checkPaper=()=>{if(fail)throw new Error('IMAGE_LOAD');};
  await app.context.renderPreview();assert.equal(app.read('previewState.state'),'error');
  fail=false;app.context.activateProduct('p0',false);await app.settle();
  assert.equal(app.read('previewState.state'),'ready');assert.equal(app.ui.errorBox.hidden,true);
  assert.deepEqual(app.calls.builds,['p0','p0']);
});

test('activation and its pane visibility callbacks share one pending card preparation',async()=>{
  const gate=deferred(),app=fixture(3,{fonts:gate.promise});
  app.context.activateProduct('p1');await tick();
  app.context.renderPreview();await tick();
  const pendingBuilds=app.calls.builds.slice();gate.resolve();await app.settle();
  assert.deepEqual(pendingBuilds,['p1'],'pane/resize checks must not replace an in-flight preview');
  assert.deepEqual(app.calls.checked,['p1']);
});

test('card overflow decisions are identical at compact, full-size and enlarged preview scales',()=>{
  const declaration=statements.find(node=>node.type==='FunctionDeclaration'&&node.id.name==='checkPaper');
  const context=vm.createContext({});vm.runInContext(source.slice(declaration.start,declaration.end),context);
  for(const scale of [.25,.5,1,1.2]){
    const footer={clientWidth:300,scrollWidth:300,clientHeight:13,scrollHeight:13,
      getBoundingClientRect:()=>({left:10*scale,right:310*scale,top:556*scale,bottom:569*scale})};
    const face={dataset:{product:'footer-overflow'},clientWidth:378,clientHeight:567,
      scrollWidth:378,scrollHeight:567,querySelector:()=>null,querySelectorAll:()=>[footer],
      getBoundingClientRect:()=>({left:0,right:378*scale,top:0,bottom:567*scale,width:378*scale,height:567*scale})};
    assert.throws(()=>context.checkPaper({querySelectorAll:()=>[face]}),/OVERFLOW/,'footer overflow at scale '+scale);
    footer.getBoundingClientRect=()=>({left:10*scale,right:310*scale,top:550*scale,bottom:563*scale});
    assert.doesNotThrow(()=>context.checkPaper({querySelectorAll:()=>[face]}),'fitting footer at scale '+scale);
    face.scrollHeight=570;
    assert.throws(()=>context.checkPaper({querySelectorAll:()=>[face]}),/OVERFLOW/,'aggregate content overflow at scale '+scale);
  }
});

test('a superseded preview stops before decoding images and fitting the stale paper',async()=>{
  const gate=deferred(),app=fixture(3,{fonts:gate.promise});
  app.context.renderPreview();app.context.activateProduct('p1',false);gate.resolve();await app.settle();
  assert.deepEqual(app.calls.decoded,['p1']);assert.deepEqual(app.calls.checked,['p1']);
  assert.equal(app.read('previewState.id'),'p1');
});

test('a batch error switches a pending preview to the failed product without relabeling the stale paper',async()=>{
  const gate=deferred(),app=fixture(3,{fonts:gate.promise});
  const pending=app.context.renderPreview();
  app.context.revealPrintFailure(Object.assign(new Error('OVERFLOW|Product 1'),{productId:'p1'}));
  await tick();gate.resolve();await pending;await app.settle();
  assert.equal(app.read('currentId'),'p1');
  assert.equal(app.ui.stage.firstElementChild.dataset.productId,'p1','the visible paper must belong to the reported failed product');
  assert.equal(app.ui.currentName.textContent,'Product 1');
  assert.equal(app.read('previewState.id'),'p1');
  assert.deepEqual(app.calls.decoded,['p1'],'the earlier pending product must not continue decoding');
  assert.equal(app.ui.errorBox.hidden,false);assert.match(app.ui.errorBox.textContent,/Product 1/);
});
