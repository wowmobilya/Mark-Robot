'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const acorn = require('acorn');
const core = require('../product-label-core.js');

const source = fs.readFileSync(path.join(__dirname, '../product-labels.js'), 'utf8');
const parsed = acorn.parse(source, {ecmaVersion:'latest'});
const controller = parsed.body.find(statement => statement.type === 'ExpressionStatement' &&
  statement.expression.type === 'CallExpression' && statement.expression.callee.type === 'ArrowFunctionExpression');
assert(controller, 'the production product-label controller is present');
const statements = controller.expression.callee.body.body;
// Execute the production state declarations and controller functions. DOM creation,
// page layout and native printing are the external boundaries supplied by this fixture.
const boundaries = new Set(['mount', 'refreshText', 'renderSelection', 'renderPreview',
  'modelFor', 'buildPaper', 'fitPaper', 'checkPaper', 'scalePreview', 'enhanceActions', 'showError', 'showPane', 'renderQueue']);
const functions = statements.filter(statement => statement.type === 'FunctionDeclaration' && !boundaries.has(statement.id.name));
const declarations = statements.filter(statement => statement.type === 'VariableDeclaration' && statement.kind === 'let');
const localeDeclaration = statements.filter(statement => statement.type === 'VariableDeclaration')
  .flatMap(statement => statement.declarations).find(declaration => declaration.id.name === 'printLocaleFor');
const controllerCode = [
  ...declarations.map(statement => source.slice(statement.start, statement.end)),
  ...functions.map(statement => source.slice(statement.start, statement.end)),
  ...(localeDeclaration ? ['const ' + source.slice(localeDeclaration.start, localeDeclaration.end) + ';'] : [])
].join('\n');

function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return {promise, resolve, reject};
}
const tick = () => new Promise(resolve => setImmediate(resolve));

class Events {
  constructor() { this.listeners = new Map(); }
  addEventListener(type, callback, options = {}) {
    const entries = this.listeners.get(type) || [];
    entries.push({callback, once:!!options.once}); this.listeners.set(type, entries);
  }
  removeEventListener(type, callback) {
    this.listeners.set(type, (this.listeners.get(type) || []).filter(entry => entry.callback !== callback));
  }
  dispatch(type, detail = {}) {
    for (const entry of [...(this.listeners.get(type) || [])]) {
      if (entry.once) this.removeEventListener(type, entry.callback);
      entry.callback({type, target:this, ...detail});
    }
  }
}

function element() {
  const attributes = new Map(), classes = new Set();
  return Object.assign(new Events(), {
    style:{}, dataset:{}, children:[], hidden:false, disabled:false, isConnected:true, value:'', textContent:'',
    classList:{add:name => classes.add(name), remove:name => classes.delete(name), contains:name => classes.has(name),
      toggle(name, on) { if (on) classes.add(name); else classes.delete(name); }},
    setAttribute(name, value) { attributes.set(name, String(value)); },
    getAttribute(name) { return attributes.get(name) ?? null; },
    removeAttribute(name) { attributes.delete(name); },
    append(...children) { for (const child of children) { this.children.push(child); child.parentElement = this; } },
    replaceChildren(...children) { this.children = []; this.append(...children); },
    remove() { this.removed = true; this.isConnected = false; },
    querySelector() { return null; }, querySelectorAll() { return []; }, focus() {}, scrollIntoView() {}
  });
}

function fixture({printMode = 'async', writeGates = [], styleGate = null, checkFailureId = null} = {}) {
  const calls = {prints:0, errors:[], writes:[], frames:[], checked:0, fit:0, panes:[], builds:0, renderTurns:0};
  const appState = {settings:{productLabels:{locale:'en'}}, products:[{id:'p1', name:'W400', barcode:'00400', dims:[{l:100,w:50,h:40}]}]};
  const fields = ['workspace', 'preview', 'stage', 'languageToggle', 'languageChoices', 'preferenceNote',
    'selection', 'list', 'search', 'summary', 'currentName', 'counter', 'previous', 'next', 'printButton', 'status', 'errorBox'];
  const ui = Object.fromEntries(fields.map(name => [name, element()]));
  const printCaption=element();ui.printButton.append(printCaption);
  ui.printButton.querySelector=selector=>selector==='span'?printCaption:null;
  const timers = new Map(), guards = new Map(); let timerId = 0, mode = printMode, context;
  const animationFrame = callback => { calls.renderTurns++;queueMicrotask(() => callback(0)); return 1; };
  const window = new Events();
  Object.assign(window, {requestAnimationFrame:animationFrame, WFAppUpdates:{registerGuard:(name, check) => guards.set(name, check)}});
  const doc = Object.assign(new Events(), {body:element(), documentElement:{lang:'en',dir:'ltr'}, activeElement:null,
    baseURI:'https://labels.example/', visibilityState:'visible', hidden:false});
  function frameElement() {
    const frame = element(), printWindow = new Events(), printMedia = Object.assign(new Events(),{matches:false});
    const printDoc = {documentElement:{}, body:element(), head:element(), images:[], fonts:{ready:Promise.resolve()},
      open() {}, write() {}, close() {}, createElement:() => element(),
      querySelectorAll(selector) { return selector === '.wf-label-paper' ? this.body.children : []; }};
    printDoc.defaultView = printWindow;
    printDoc.head.append = link => {
      const loaded = () => link.onload();
      if (styleGate) styleGate.promise.then(loaded, () => link.onerror()); else queueMicrotask(loaded);
    };
    Object.assign(printWindow, {document:printDoc, focus() {}, requestAnimationFrame:animationFrame,
      matchMedia:() => printMedia,
      print() {
        calls.prints++;
        if (mode === 'throw') throw new Error('Native print unavailable');
        if (mode === 'sync') printWindow.dispatch('afterprint');
      }});
    frame.contentDocument = printDoc; frame.contentWindow = printWindow;frame.printMedia=printMedia;
    calls.frames.push(frame); return frame;
  }
  doc.createElement = tag => tag === 'iframe' ? frameElement() : element();
  const page = element();
  const sandbox = {
    core, window, doc, page, root:doc.documentElement, console, URL, Promise, Set, Map,
    stylesheet:'https://labels.example/product-labels.css?v=1',
    state:() => appState, language:() => doc.documentElement.lang, byId:() => null,
    make:(tag, className, value, owner = doc) => {
      const result = owner.createElement(tag); result.className = className || '';
      if (value !== undefined) result.textContent = value; return result;
    },
    t:key => key, mount() {}, renderSelection() {}, renderPreview() {}, enhanceActions() {}, scalePreview() {}, showPane(name) {calls.panes.push(name);}, renderQueue() {},
    refreshText() { ui.preferenceNote.textContent = vm.runInContext('savedNoteKey', context); },
    modelFor:product => ({...product, locale:vm.runInContext('printLocale', context)}),
    buildPaper:(model, owner = doc) => {calls.builds++;return Object.assign(element(), {model, ownerDocument:owner,dataset:{productId:model.id}});},
    fitPaper() { calls.fit++; }, checkPaper(paper) { calls.checked++;if(paper.model.id===checkFailureId)throw new Error('OVERFLOW|'+paper.model.name); },
    showError:error => { calls.errors.push(error); ui.errorBox.hidden = false; ui.errorBox.textContent = error.message; },
    requestAnimationFrame:animationFrame,
    setTimeout(callback, delay) { const id = ++timerId; timers.set(id, {callback, delay}); return id; },
    clearTimeout:id => timers.delete(id),
    wfWriteBatch:async operations => {
      const index = calls.writes.length; calls.writes.push(operations);
      if (writeGates[index]) await writeGates[index].promise;
      return operations.map(operation => operation.merge({id:'main', ...appState.settings}, operation.value));
    },
    fixtureUI:ui
  };
  context = vm.createContext(sandbox);
  vm.runInContext(controllerCode, context);
  vm.runInContext(fields.map(name => name + '=fixtureUI.' + name + ';').join('\n') +
    '\nselected=new Set(["p1"]);available=["p1"];currentId="p1";printLocale="en";opened=true;', context);
  const read = expression => vm.runInContext(expression, context);
  return {context, ui, calls, state:appState, guards, timers, read,
    setPrintMode:value => { mode = value; },
    finishPrint() { const frame = read('activePrint')?.frame; if (frame) frame.contentWindow.dispatch('afterprint'); },
    dispose() { read('activePrint')?.cleanup(); }};
}

test('a nonblocking native print sheet keeps its iframe and rejects a second print until afterprint', async () => {
  const app = fixture();
  try {
    await app.context.printSelected();
    assert.equal(app.calls.prints, 1);
    const frame = app.read('activePrint').frame;
    assert.equal(app.ui.printButton.disabled, true, 'the live print sheet keeps Print disabled');
    await app.context.printSelected();
    assert.equal(app.calls.prints, 1, 'a second activation cannot replace the native print job');
    assert.notEqual(frame.removed, true, 'the original print document remains available to the print sheet');
    app.finishPrint();
    assert.equal(frame.removed, true);
    assert.equal(app.read('activePrint'), null);
    assert.equal(app.ui.printButton.disabled, false);
    app.context.window.dispatch('afterprint');
    assert.equal(app.read('activePrint'), null, 'duplicate completion is harmless');
    await app.context.printSelected();
    assert.equal(app.calls.prints, 2, 'a new job is allowed after the earlier sheet closes');
  } finally { app.dispose(); }
});

test('synchronous afterprint unlocks the controller without leaving a stale frame or busy flag', async () => {
  const app = fixture({printMode:'sync'});
  await app.context.printSelected();
  assert.equal(app.calls.prints, 1);
  assert.equal(app.read('activePrint'), null);
  assert.equal(app.read('preparing'), false);
  assert.equal(app.ui.printButton.disabled, false);
  assert.notEqual(app.ui.workspace.getAttribute('aria-busy'), 'true');
  assert(app.calls.frames.every(frame => frame.removed));
  await app.context.printSelected();
  assert.equal(app.calls.prints, 2);
});

test('a native print exception cleans up and allows a later successful retry', async () => {
  const app = fixture({printMode:'throw'});
  try {
    await app.context.printSelected();
    assert.equal(app.calls.prints, 1);
    assert.equal(app.calls.errors.length, 1);
    assert.equal(app.read('activePrint'), null);
    assert.equal(app.read('preparing'), false);
    assert.equal(app.ui.printButton.disabled, false);
    assert(app.calls.frames.every(frame => frame.removed));
    app.setPrintMode('async');
    await app.context.printSelected();
    assert.equal(app.calls.prints, 2);
    assert(app.read('activePrint'));
  } finally { app.dispose(); }
});

test('concurrent print activations during stylesheet preparation share one print job', async () => {
  const style = deferred(), app = fixture({styleGate:style});
  try {
    const first = app.context.printSelected();
    await tick();
    await app.context.printSelected();
    assert.equal(app.calls.frames.length, 1);
    assert.equal(app.calls.prints, 0);
    assert.equal(app.ui.printButton.disabled, true);
    style.resolve(); await first;
    assert.equal(app.calls.prints, 1);
    assert(app.calls.checked > 0, 'the prepared card is checked before native printing');
  } finally { app.dispose(); }
});

test('a pending print-language choice survives closing and reopening before persistence finishes', async () => {
  const write = deferred(), app = fixture({writeGates:[write]});
  app.context.open();
  app.context.chooseLanguage('fr'); await tick();
  assert.equal(app.read('printLocale'), 'fr');
  assert.equal(app.state.settings.productLabels.locale, 'en');
  const guard = app.guards.get('product-label-print');
  assert.equal(guard?.(), true, 'updates wait for the preference write');
  app.context.close(true); app.context.open();
  assert.equal(app.read('printLocale'), 'fr', 'reopening preserves the current pending choice');
  write.resolve(); await app.read('saveQueue');
  assert.equal(app.read('printLocale'), 'fr');
  assert.equal(app.state.settings.productLabels.locale, 'fr');
  assert.equal(app.read('savedNoteKey'), 'saved');
  assert.equal(guard(), false);
});

test('rapid language choices stay ordered and reopening cannot restore an older pending choice', async () => {
  const first = deferred(), last = deferred(), app = fixture({writeGates:[first,last]});
  app.context.open();
  app.context.chooseLanguage('fr'); app.context.chooseLanguage('tr'); await tick();
  app.context.close(false); app.context.open();
  assert.equal(app.read('printLocale'), 'tr');
  first.resolve(); await tick();
  assert.equal(app.calls.writes.length, 2);
  assert.equal(app.read('printLocale'), 'tr');
  assert.equal(app.read('savedNoteKey'), 'saving');
  last.resolve(); await app.read('saveQueue');
  assert.equal(app.state.settings.productLabels.locale, 'tr');
  assert.equal(app.read('printLocale'), 'tr');
  assert.equal(app.read('savedNoteKey'), 'saved');
});

test('closing and reopening keeps an intentional print selection, including an empty list', () => {
  const app=fixture();app.state.products.push({id:'p2',name:'W500',barcode:'00500'});
  app.context.open();
  vm.runInContext('selected=new Set(["p2"]);currentId="p2";',app.context);
  app.context.close(true);app.context.open();
  assert.deepEqual([...app.read('selected')],['p2']);assert.equal(app.read('currentId'),'p2');
  vm.runInContext('selected.clear();currentId=null;',app.context);
  app.context.close(true);app.context.open();
  assert.equal(app.read('selected').size,0,'reopening must not silently select every product again');
});

test('failed locale persistence preserves the visible choice and leaves existing settings intact', async () => {
  const write=deferred(),app=fixture({writeGates:[write]});app.context.open();app.context.chooseLanguage('ru');await tick();
  app.context.close(false);app.context.open();write.reject(new Error('Disk full'));await app.read('saveQueue');
  assert.equal(app.read('printLocale'),'ru');assert.equal(app.state.settings.productLabels.locale,'en');
  assert.equal(app.read('savedNoteKey'),'saveError');assert.equal(app.guards.get('product-label-print')(),false);
});

test('background navigation never discards a print sheet without a print completion signal',async()=>{
  const app=fixture();try{
    await app.context.printSelected();const frame=app.read('activePrint').frame;
    app.context.doc.visibilityState='hidden';app.context.doc.dispatch('visibilitychange');
    app.context.doc.visibilityState='visible';app.context.window.dispatch('focus');
    for(const timer of [...app.timers.values()])timer.callback();
    assert.notEqual(frame.removed,true,'focus and timers cannot prove native printing finished');
    assert.equal(app.ui.printButton.disabled,true);
    frame.printMedia.matches=true;frame.printMedia.dispatch('change',{matches:true});
    frame.printMedia.matches=false;frame.printMedia.dispatch('change',{matches:false});
    assert.equal(app.read('activePrint'),null,'an observed print-media exit does release the job');
    assert.equal(app.ui.status.textContent,'printReturned');
  }finally{app.dispose();}
});

test('selection changes do not navigate away from the card being inspected',()=>{
  const app=fixture();app.state.products.push({id:'p2',name:'W500'});app.context.open();
  assert.equal(typeof app.context.setProductSelected,'function');
  app.context.setProductSelected('p2',true);assert.equal(app.read('currentId'),'p1');
  app.context.setProductSelected('p1',false);assert.equal(app.read('currentId'),'p1');
  assert.equal(app.read('selected').has('p1'),false);
});

test('zero-sized hidden preview geometry cannot pass the real layout preflight',()=>{
  const declaration=statements.find(entry=>entry.type==='FunctionDeclaration'&&entry.id.name==='checkPaper');
  const scope=vm.createContext({});vm.runInContext(source.slice(declaration.start,declaration.end),scope);
  const face=Object.assign(element(),{clientWidth:0,clientHeight:0,scrollWidth:0,scrollHeight:0,getBoundingClientRect:()=>({left:0,right:0,top:0,bottom:0,width:0,height:0})});
  const paper={querySelectorAll:()=>[face]};
  assert.throws(()=>scope.checkPaper(paper),/LAYOUT_HIDDEN/);
});

test('a batch layout failure opens the preview of the affected product and keeps its error visible',async()=>{
  const app=fixture({checkFailureId:'p2'});app.state.products.push({id:'p2',name:'LONG PRODUCT',barcode:'p2'});app.context.open();
  app.calls.panes.length=0;await app.context.printSelected();
  assert.equal(app.calls.prints,0);assert.equal(app.read('currentId'),'p2');
  assert(app.calls.panes.includes('preview'),'a hidden mobile preview must be made visible for the error');
  assert.equal(app.ui.errorBox.hidden,false);assert.match(app.ui.errorBox.textContent,/OVERFLOW/);
});

test('large print jobs yield during construction and preserve every selected sheet',async()=>{
  const app=fixture();app.state.products=Array.from({length:25},(_,i)=>({id:'p'+i,name:'Product '+i,barcode:'B'+i}));
  app.context.open();
  try{
    const pending=app.context.printSelected(),initialBuilds=app.calls.builds;await pending;
    assert(initialBuilds<25,'printing must yield before constructing the whole large job');
    assert.equal(app.calls.builds,25);assert.equal(app.calls.checked,25);assert.equal(app.calls.prints,1);
    assert.equal(app.calls.frames[0].contentDocument.body.children.length,25);
    assert(app.calls.renderTurns>2,'large construction and fitting give the browser opportunities to render');
  }finally{app.dispose();}
});
