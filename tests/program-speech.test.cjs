const test = require('node:test');
const assert = require('node:assert/strict');
const { existsSync, readFileSync } = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const file = path.resolve(__dirname, '../program-speech.js');
const reader = existsSync(file) ? require(file) : null;
const normalize = (...args) => {
  assert(reader, 'The selected-text reader must be implemented');
  return reader.normalizeText(...args);
};
const plain = value => value.replace(/[\u064b-\u065f\u0670]/g, '');
test('the company name has an explicit Arabic pronunciation without rewriting embedded identifiers', () => {
  assert.equal(normalize('مساعد WOW FURNITURE. wow furniture', 'ar'), 'مساعد واو فِرْنِتْشَر. واو فِرْنِتْشَر');
  assert.equal(normalize('PROD_WOW FURNITURE_7', 'ar'), 'PROD_WOW FURNITURE_7');
  assert.equal(normalize('WOW FURNITURE', 'tr'), 'WOW FURNITURE');
});
function spy() {
  const calls = [];
  return { calls, moneyWords(value, currency) { calls.push([value, currency]); return '[' + currency + ':' + value.toFixed(2) + ']'; } };
}

test('Arabic currency tokens accept Arabic separators and preserve all surrounding text', () => {
  const api = spy();
  assert.equal(normalize('الرصيد: USD ١٬٢٥٠٫٠٥؛ EUR ٠٫٥٠. المعرّف INV-007.', 'ar', api),
    'الرصيد: [USD:1250.05]؛ [EUR:0.50]. المعرّف INV-007.');
  assert.deepEqual(api.calls, [[1250.05, 'USD'], [0.50, 'EUR']]);
});

test('English-style Arabic and English amounts accept explicit ISO codes and symbols', () => {
  for (const locale of ['ar', 'en']) {
    const api = spy();
    assert.equal(normalize('USD 1,250.05; $0.50; 2.00 €; ₺3.00; £4.00', locale, api),
      '[USD:1250.05]; [USD:0.50]; [EUR:2.00]; [TRY:3.00]; [GBP:4.00]');
  }
});

test('the live Intl US$ prefix and suffix are unambiguously US dollars', () => {
  const api = spy();
  assert.equal(normalize('\u200f0.00 US$; US$1,250.05; -US$0.50; ١٬٠٠٠٫٠٥ US$', 'ar', api),
    '\u200f[USD:0.00]; [USD:1250.05]; [USD:-0.50]; [USD:1000.05]');
  assert.equal(normalize('$1.00 US$; CAD US$0.00; INV-US$0.00', 'ar', spy()),
    '$1.00 US$; CAD US$0.00; INV-US$0.00');
});

test('Turkish grouping and decimal commas also accept Arabic and Persian digits', () => {
  const api = spy();
  assert.equal(normalize('Toplam: 1.250,05 USD; ₺٠,٥٠; ۱۲,۰۵ SYP.', 'tr', api),
    'Toplam: [USD:1250.05]; [TRY:0.50]; [SYP:12.05].');
  assert.deepEqual(api.calls, [[1250.05, 'USD'], [0.50, 'TRY'], [12.05, 'SYP']]);
});

test('space-grouped French and Russian amounts follow their locale when an API is supplied', () => {
  for (const locale of ['fr', 'ru']) assert.equal(normalize('1\u202f250,05 EUR', locale, spy()), '[EUR:1250.05]');
});

test('negative signs beside either a prefix currency or its number keep the monetary sign', () => {
  const api = spy();
  assert.equal(normalize('-$1,250.05; USD -0.05; −€0.50; -2.00 TRY', 'ar', api),
    '[USD:-1250.05]; [USD:-0.05]; [EUR:-0.50]; [TRY:-2.00]');
  assert.equal(normalize('-$-1.00; USD --2.00', 'ar', spy()), '-$-1.00; USD --2.00');
});

test('standalone exact decimal zero is spoken naturally without touching bare quantities or IDs', () => {
  assert.equal(plain(normalize('0.00 / -0.00 / ٠٫٠٠ / 0 / 20.00 / INV-0.00 / 2026-0.00-19', 'ar')),
    'صفر / صفر / صفر / 0 / 20.00 / INV-0.00 / 2026-0.00-19');
  assert.equal(normalize('0,00; -0,00; 0.00; 10,00; SKU_0,00', 'tr'),
    'sıfır; sıfır; 0.00; 10,00; SKU_0,00');
});

test('invalid grouping, unsupported separator conventions and excess decimals remain untouched', () => {
  const arabic = ['USD 1,00', 'USD 12,34.05', 'USD 1.250,05', 'USD ١٬٢٥٠.٠٥',
    'USD 1.005', 'USD 01.00', 'USD 0.00.00', 'USD 1e3', 'USD 1 000.00'];
  for (const text of arabic) {
    const api = spy();
    assert.equal(normalize(text, 'ar', api), text);
    assert.deepEqual(api.calls, [], text);
  }
  for (const text of ['USD 1,234', 'USD 1,250.05', 'USD 01,00', 'USD 1.00']) {
    assert.equal(normalize(text, 'tr', spy()), text);
  }
});

test('ambiguous currencies, adjacent amounts and embedded identifiers are not partially rewritten', () => {
  for (const text of ['CAD $0.00', '$1.00 EUR', 'USD 0.00 TRY', '1.00 USD 2.00',
    'INV-USD 0.00', 'INV-$1.00', 'SKU/1.00 USD', 'USD 1.00/code',
    'USD100.00', '100.00USD', 'ref_USD 5.00', 'A0.00B', '0.00.1', '0,00,1']) {
    assert.equal(normalize(text, 'ar', spy()), text, text);
  }
});

test('unsafe and lossy decimal-to-number conversions preserve the original source', () => {
  for (const text of ['USD 90071992547409.92', 'USD 90071992547409.91',
    'USD 999999999999999999999999.99']) {
    const api = spy();
    assert.equal(normalize(text, 'ar', api), text);
    assert.deepEqual(api.calls, []);
  }
});

test('real Arabic money normalization preserves .05 versus .50 and zero versus a true negative', () => {
  const api = require('../arabic-report-speech.js');
  assert.equal(plain(normalize('USD 1,000,000.00; USD 0.05; USD 0.50; USD -0.00; USD -0.05', 'ar', api)),
    'مليون دولار أمريكي; خمسة سنتات أمريكية; خمسون سنتا أمريكيا; صفر دولار أمريكي; سالب خمسة سنتات أمريكية');
});

test('a missing or rejecting money helper never invents monetary wording', () => {
  assert.equal(normalize('USD 0.00; EUR 100.00', 'ar', {}), 'USD 0.00; EUR 100.00');
  assert.equal(normalize('USD 1.00', 'ar', {moneyWords() { throw new Error('unsupported'); }}), 'USD 1.00');
  assert.equal(normalize('USD 1.00', 'en'), 'USD 1.00');
});

test('long input and excessive normalized output are refused without truncation', () => {
  assert.equal(normalize('x'.repeat(16000), 'ar').length, 16000);
  assert.equal(normalize('9'.repeat(16000), 'ar'), '9'.repeat(16000));
  assert.throws(() => normalize('x'.repeat(16001), 'ar'), error => error.code === 'text-length');
  assert.throws(() => normalize('USD 1.00', 'ar', {moneyWords() { return 'x'.repeat(16001); }}), error => error.code === 'text-length');
  assert.throws(() => normalize(123, 'ar'), error => error.code === 'invalid-text');
});

test('loading without a header exposes the pure API without starting speech or creating UI', () => {
  assert(existsSync(file));
  let calls = 0;
  const window = { document: {getElementById() { return null; }}, WFProgramSpeech: {speak() { calls++; }} };
  vm.runInNewContext(readFileSync(file, 'utf8'), {window, Intl, Object, Number, String, Error, BigInt});
  assert.equal(typeof window.WFProgramSpeechReader.normalizeText, 'function');
  assert.equal(calls, 0);
});

function browserFixture() {
  const nodes = new Map(), events = new Map(), calls = [];
  class Element {
    constructor() { this.dataset = {}; this.attributes = {}; this.events = {}; this.hidden = false; this.isConnected = true; this.visible = true; this.classList = {add() {}, remove() {}, contains: () => this.active !== false}; }
    setAttribute(name, value) { this.attributes[name] = value; }
    addEventListener(name, listener) { this.events[name] = listener; }
    removeEventListener(name) { delete this.events[name]; }
    getClientRects() { return this.visible ? [{}] : []; }
    append(child) { nodes.set(child.id, child); child.parentNode = this; }
    insertBefore(child) { this.append(child); }
    remove() { this.isConnected = false; }
    matches(selector) { return this.kind === 'page' ? selector.includes('.page.active') && this.active !== false : selector.includes('dialog[open]') && this.open !== false; }
    closest(selector) { return selector.startsWith('[hidden]') ? null : this.scope?.matches(selector) ? this.scope : null; }
  }
  const body = new Element(), html = new Element(), settings = new Element(); html.lang = 'ar'; settings.parentNode = body; nodes.set('headerSettingsBtn', settings);
  const document = {body, documentElement: html, getElementById: id => nodes.get(id) || null, createElement: () => new Element(), createTreeWalker: () => ({nextNode() { return null; }})};
  let current = {state: 'ready', active: false}, selected = null;
  const window = {document, WFArabicReportSpeech: require('../arabic-report-speech.js'),
    getComputedStyle: element => ({display: element.visible ? 'block' : 'none', visibility: 'visible'}), getSelection: () => selected,
    clearTimeout() {}, setTimeout() { return 1; }, addEventListener: (name, fn) => events.set(name, fn), removeEventListener: name => events.delete(name),
    WFProgramSpeech: {getState: () => current, speak(options) { calls.push(options); return true; }, stop() {}}};
  vm.runInNewContext(readFileSync(file, 'utf8'), {window, Intl, Object, Number, String, Error, BigInt, MutationObserver: class {observe() {} disconnect() {}}});
  return {calls, button: nodes.get('wfProgramSpeechButton'), status: nodes.get('wfProgramSpeechStatus'),
    update(value) { current = value; events.get('wf-program-speech-state')({detail: value}); },
    select(kind, text = 'USD 1.00', visible = true) {
      const scope = new Element(), element = new Element(); scope.kind = kind; scope.visible = visible; element.scope = scope; element.visible = visible;
      const node = {nodeType: 3, parentElement: element};
      const range = {startContainer: node, endContainer: node, commonAncestorContainer: node, toString: () => text, cloneRange() { return this; }};
      selected = {isCollapsed: false, rangeCount: 1, getRangeAt: () => range};
      return scope;
    }};
}

test('voice refreshes are silent until actual activity has occurred', () => {
  const browser = browserFixture();
  assert.equal(browser.status.hidden, true);
  browser.update({state: 'ready', active: false});
  browser.update({state: 'unavailable', active: false});
  assert.equal(browser.status.hidden, true);
  browser.update({state: 'speaking', active: true, voiceName: 'Local voice'});
  assert.equal(browser.status.hidden, false);
  browser.update({state: 'ready', active: false});
  assert.equal(browser.status.textContent, 'انتهت القراءة.');
  browser.status.hidden = true;
  browser.update({state: 'ready', active: false});
  assert.equal(browser.status.hidden, true);
});

test('visible dialog selections use the originating trusted click, while hidden dialogs and untrusted clicks cannot speak', () => {
  const browser = browserFixture();
  browser.select('dialog');
  browser.button.events.click({isTrusted: false});
  assert.equal(browser.calls.length, 0);
  const event = {isTrusted: true}; browser.button.events.click(event);
  assert.equal(browser.calls.length, 1);
  assert.equal(browser.calls[0].event, event);
  assert.equal(plain(browser.calls[0].text), 'دولار أمريكي واحد');
  browser.select('dialog', 'USD 100.00', false);
  browser.button.events.click({isTrusted: true});
  assert.equal(browser.calls.length, 1);
});
