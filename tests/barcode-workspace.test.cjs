const test = require('node:test');
const assert = require('node:assert/strict');
const {stageOf, restoreReader} = require('../barcode-workspace.js');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const acorn = require('acorn');

test('the barcode workspace follows the visible stage during asynchronous transitions', () => {
  const tier={style:{opacity:'0',pointerEvents:'none'}};
  const result={style:{opacity:'0',maxHeight:'0'}};
  assert.equal(stageOf(tier,result),'scan');
  tier.style.opacity='1';tier.style.pointerEvents='all';
  assert.equal(stageOf(tier,result),'tier');
  result.style.opacity='1';result.style.maxHeight='1200px';
  assert.equal(stageOf(tier,result),'tier','the visible chooser still owns interaction');
  tier.style.opacity='0';tier.style.pointerEvents='none';
  assert.equal(stageOf(tier,result),'result');
  result.style.maxHeight='0';
  assert.equal(stageOf(tier,result),'scan');
});

test('cancelling a result price change makes the collapsed reader available again', () => {
  const reader={style:{maxHeight:'0',overflow:'hidden',transform:'translateY(-20px)',opacity:'0'}};
  restoreReader(reader);
  assert.equal(reader.style.maxHeight,'');
  assert.equal(reader.style.overflow,'');
  assert.equal(reader.style.transform,'');
  assert.equal(reader.style.opacity,'0','the original transition remains the visibility owner');
});

// Keep the real legacy transition functions in these tests. Only browser timers,
// camera hardware and the product renderer are replaced at their boundaries.
const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
const script = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)]
  .map(match => match[1]).find(source => source.includes('function qblTransitionToResult('));
const names = new Set(['initQblPage', 'qblTransitionToTierSelect', 'qblTransitionToResult',
  'qblCancelTierSelect', 'qblResetToScan', 'qblChangeTier', 'qblSelectTierAndTransition',
  'qblShowPhase1', 'qblHidePhase2', 'qblShowPhase3', 'qblHidePhase3', 'qblShowNotFound']);
const legacy = acorn.parse(script, {ecmaVersion: 'latest'}).body
  .filter(node => node.type === 'FunctionDeclaration' && names.has(node.id.name))
  .map(node => script.slice(node.start, node.end)).join('\n');

function workspace() {
  let now = 0, nextTimer = 0;
  const timers = new Map(), observers = [], mutations = [], ids = {}, rendered = [];
  const camera = {starts: 0, stops: 0};
  function element(id, styles = {}) {
    const attrs = new Map(), classes = new Set();
    const node = {id, dataset: {}, children: [], inert: false, hidden: false, value: '',
      style: new Proxy(styles, {get: (target, key) => target[key] || '', set(target, key, value) {
        target[key] = value === '0' && key === 'maxHeight' ? '0px' : value;
        mutations.push({target: node, type: 'attributes', attributeName: 'style'}); return true;
      }}),
      classList: {contains: key => classes.has(key), add(key) {const oldValue = [...classes].join(' '); classes.add(key); mutations.push({target: node, type: 'attributes', attributeName: 'class', oldValue});},
        remove(key) {const oldValue = [...classes].join(' '); classes.delete(key); mutations.push({target: node, type: 'attributes', attributeName: 'class', oldValue});}},
      setAttribute: (key, value) => attrs.set(key, String(value)), getAttribute: key => attrs.get(key) ?? null,
      querySelector: selector => selector.startsWith('#') ? ids[selector.slice(1)] || null : null,
      querySelectorAll: () => [], prepend() {}, contains: child => child === node || node.children.includes(child),
      addEventListener() {}, focus() {context.document.activeElement = node;}, isConnected: true};
    ids[id] = node; return node;
  }
  const page = element('page-quick-barcode'); page.classList.add('active');
  const scan = element('qblPhase1', {opacity: '1', pointerEvents: 'all'});
  const tier = element('qblPhase2', {opacity: '0', pointerEvents: 'none'});
  const result = element('qblPhase3', {opacity: '0', maxHeight: '0px'});
  for (const id of ['qblPhase2Blur', 'qblTierCard', 'qblInput', 'qblStatus', 'qblDropdown', 'qblCameraWrap', 'qblProductCard', 'qblNotFound']) element(id);
  const buttons = Object.fromEntries(['A', 'B', 'C'].map(key => [key, element('tier-' + key)]));
  page.children.push(scan, tier, result); tier.children.push(...Object.values(buttons));
  const product = {id: 'one', name: 'Original product', type: 'coffee_table', priceA: 100, priceB: 70, priceC: 50};
  const context = vm.createContext({QBL: {stream: null, interval: null, currentProduct: null, selectedTier: null, phase: 1, pendingQty: 1},
    qblDropdownOpen: false, qblActiveType: null, qblKeyboard: null,
    document: {hidden: false, getElementById: id => ids[id] || null, addEventListener() {},
      querySelector: selector => buttons[selector.match(/data-tier="([ABC])"/)?.[1]] || null},
    setTimeout(callback, delay) {const id = ++nextTimer; timers.set(id, {at: now + Number(delay || 0), callback}); return id;},
    clearTimeout: id => timers.delete(id), requestAnimationFrame: callback => context.setTimeout(callback, 0),
    MutationObserver: class {constructor(callback) {this.callback = callback; this.targets = []; observers.push(this);} observe(target, options) {this.targets.push({target, options});}},
    getCurrentPage: () => page.classList.contains('active') ? 'quick-barcode' : 'dashboard',
    updateQblTexts() {}, qblSyncModes() {}, qblTx: key => key, showToast() {},
    qblBuildTierButtons() {for (const button of Object.values(buttons)) {button.style.opacity = '1'; button.style.transform = '';}},
    qblBuildResult(value, choice) {rendered.push({product: value, tier: choice});},
    qblStartCamera() {camera.starts++;}, qblStopCamera() {camera.stops++;}, addEventListener() {}});
  context.window = context;
  vm.runInContext(legacy, context);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../barcode-workspace.js'), 'utf8'), context);
  function flush() {
    for (let pass = 0; mutations.length && pass < 20; pass++) {
      const records = mutations.splice(0);
      for (const observer of observers) {
        const relevant = records.filter(record => observer.targets.some(({target, options}) => target === record.target &&
          (!options.attributeFilter || options.attributeFilter.includes(record.attributeName))));
        if (relevant.length) observer.callback(relevant);
      }
    }
  }
  function advance(duration) {
    const end = now + duration; flush();
    for (;;) {
      const task = [...timers].filter(([, value]) => value.at <= end).sort((a, b) => a[1].at - b[1].at || a[0] - b[0])[0];
      if (!task) break;
      timers.delete(task[0]); now = task[1].at; task[1].callback(); flush();
    }
    now = end; flush();
  }
  function find(value = product) {context.QBL.currentProduct = value; context.qblTransitionToTierSelect(value); flush();}
  flush(); return {context, page, scan, tier, result, camera, rendered, product, find, advance, flush};
}

test('cancel wins over an already pressed price tier and does not reopen a result', () => {
  const f = workspace(); f.find(); f.context.qblSelectTierAndTransition('A');
  f.context.qblCancelTierSelect(); f.advance(1000);
  assert.equal(f.context.QBL.phase, 1); assert.equal(f.page.dataset.barcodeStage, 'scan');
  assert.equal(f.rendered.length, 0); assert.equal(f.scan.inert, false);
});

test('reset during the result animation cannot collapse the new reader or render a stale product', () => {
  const f = workspace(); f.find(); f.context.qblSelectTierAndTransition('A'); f.advance(220);
  f.context.qblResetToScan(); f.advance(1000);
  assert.equal(f.scan.style.maxHeight, ''); assert.equal(f.scan.style.opacity, '1');
  assert.equal(f.page.dataset.barcodeStage, 'scan'); assert.equal(f.rendered.length, 0);
  assert.equal(f.context.QBL.currentProduct, null);
});

test('leaving during cancellation does not request another camera stream from a hidden page', () => {
  const f = workspace(); f.find(); f.context.qblCancelTierSelect();
  f.page.classList.remove('active'); f.advance(1000);
  assert.equal(f.camera.starts, 0); assert.equal(f.rendered.length, 0);
});

test('the latest pressed tier produces one result and keeps the original product reference', () => {
  const f = workspace(); f.find(); f.context.qblSelectTierAndTransition('A'); f.advance(40);
  f.context.qblSelectTierAndTransition('B'); f.advance(1000);
  assert.equal(f.rendered.length, 1); assert.equal(f.rendered[0].tier, 'B');
  assert.equal(f.rendered[0].product, f.product); assert.equal(f.context.QBL.selectedTier, 'B');
  assert.equal(f.page.dataset.barcodeStage, 'result'); assert.equal(f.result.inert, false);
});

test('changing a result tier and cancelling restores the reader through the original camera handler', () => {
  const f = workspace(); f.find(); f.context.qblSelectTierAndTransition('C'); f.advance(1000);
  f.context.qblChangeTier(); f.advance(120); assert.equal(f.page.dataset.barcodeStage, 'tier');
  f.context.qblCancelTierSelect(); f.advance(400);
  assert.equal(f.page.dataset.barcodeStage, 'scan'); assert.equal(f.scan.style.maxHeight, '');
  assert.equal(f.scan.style.opacity, '1'); assert.equal(f.camera.starts, 1);
});

test('a missing product owns the result stage so background visibility cannot restart the scanner', () => {
  const f = workspace(); f.find(); f.context.qblCancelTierSelect(); f.advance(400);
  f.context.qblShowNotFound('missing'); f.flush();
  assert.equal(f.context.QBL.phase, 3); assert.equal(f.page.dataset.barcodeStage, 'result');
  assert.equal(f.context.QBL.currentProduct, null); assert.equal(f.context.QBL.selectedTier, null);
  assert.equal(f.scan.inert, true); assert.equal(f.result.inert, false);
  assert.equal(f.rendered.length, 0);
  f.context.qblResetToScan(); f.flush();
  assert.equal(f.context.QBL.phase, 1); assert.equal(f.page.dataset.barcodeStage, 'scan');
});
