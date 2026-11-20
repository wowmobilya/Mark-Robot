const test = require('node:test');
const assert = require('node:assert/strict');
const Home = require('../home-layout.js');

function memory(entries = {}) {
  const data = new Map(Object.entries(entries)), writes = [];
  return { data, writes, fail: false,
    getItem(key) { return data.has(key) ? data.get(key) : null; },
    setItem(key, value) { if (this.fail) throw new Error('Storage full'); writes.push([key, value]); data.set(key, value); }
  };
}

test('normalization keeps known sections once, preserves chosen order, and supports every section hidden', () => {
  const value = Home.normalize({ version: 9, order: ['rates', 'sales', 'rates', 'bad'],
    hidden: [...Home.keys, 'bad', 'rates'], sizes: { sales: 'wide', welcome: 'giant', insights: 'normal' } });
  assert.equal(value.version, 1);
  assert.deepEqual(value.order, ['rates', 'sales', 'welcome', 'metrics', 'recent', 'insights']);
  assert.deepEqual(value.hidden, Home.keys);
  assert.equal(value.sizes.sales, 'wide'); assert.equal(value.sizes.welcome, 'normal'); assert.equal(value.sizes.insights, 'normal');
  assert.deepEqual(Home.normalize(null), Home.defaults());
  const first = Home.defaults(); first.order.reverse(); first.sizes.insights = 'normal';
  assert.equal(Home.defaults().order[0], 'welcome'); assert.equal(Home.defaults().sizes.insights, 'wide');
});

test('legacy hidden choices migrate only when the primary layout record is absent', () => {
  const legacy = { [Home.legacyKey]: JSON.stringify(['sales', 'metrics', 'bad']) };
  assert.deepEqual(Home.readPreferences(memory(legacy)).hidden, ['sales', 'metrics']);
  const preferred = Home.normalize({ order: ['recent'], hidden: ['rates'] });
  assert.deepEqual(Home.readPreferences(memory({ ...legacy, [Home.storageKey]: JSON.stringify(preferred) })), preferred);
  assert.deepEqual(Home.readPreferences(memory({ ...legacy, [Home.storageKey]: '{broken' })), Home.defaults());
  assert.deepEqual(Home.readPreferences({ getItem() { throw new Error('Denied'); } }), Home.defaults());
});

test('preview and cancel change presentation without modifying committed preferences or storage', () => {
  const storage = memory(), applied = [], events = [];
  const model = Home.createModel(storage, prefs => applied.push(prefs), detail => events.push(detail));
  const draft = Home.normalize({ order: ['rates'], hidden: ['sales'], sizes: { rates: 'wide' } });
  model.preview(draft); assert.deepEqual(applied.at(-1), draft); assert.equal(events.at(-1).preview, true);
  assert.deepEqual(model.get(), Home.defaults()); assert.equal(storage.writes.length, 0);
  model.restore(); assert.deepEqual(applied.at(-1), Home.defaults()); assert.equal(events.at(-1).preview, false);
  const exposed = model.get(); exposed.hidden.push('welcome'); exposed.sizes.welcome = 'wide';
  assert.deepEqual(model.get(), Home.defaults());
});

test('saving writes one complete record before committing, and a failed write preserves the saved layout', () => {
  const storage = memory({ [Home.legacyKey]: '["sales"]' }), applied = [], events = [];
  const model = Home.createModel(storage, prefs => applied.push(prefs), detail => events.push(detail));
  const initial = model.get(), draft = Home.normalize({ order: ['insights'], hidden: ['rates'] });
  model.preview(draft); storage.fail = true;
  assert.throws(() => model.save(draft), /Storage full/);
  assert.deepEqual(model.get(), initial); assert.equal(applied.length, 1); assert.equal(events.length, 1);
  assert.equal(storage.getItem(Home.storageKey), null);
  storage.fail = false; model.save(draft);
  assert.equal(storage.writes.length, 1); assert.equal(storage.writes[0][0], Home.storageKey);
  assert.deepEqual(JSON.parse(storage.getItem(Home.storageKey)), draft);
  assert.equal(storage.getItem(Home.legacyKey), '["sales"]');
  assert.deepEqual(model.get(), draft); assert.equal(events.at(-1).preview, false);
  assert.deepEqual(Home.createModel(storage).get(), draft);
});

function fixture(storage = memory()) {
  let document;
  class Event {
    constructor(type, options = {}) { this.type = type; Object.assign(this, options); }
    preventDefault() { this.defaultPrevented = true; }
    stopPropagation() { this.stopped = true; }
  }
  class Target {
    constructor() { this.listeners = new Map(); }
    addEventListener(type, callback) { const listeners = this.listeners.get(type) || []; listeners.push(callback); this.listeners.set(type, listeners); }
    dispatchEvent(event) {
      event.target ??= this;
      for (let node = this; node; node = event.bubbles && !event.stopped ? node.parentNode : null) {
        event.currentTarget = node;
        if (event.type === 'click') node.onclick?.(event);
        for (const listener of node.listeners.get(event.type) || []) listener(event);
      }
      return !event.defaultPrevented;
    }
  }
  class Element extends Target {
    constructor(tag) { super(); this.tagName = tag.toUpperCase(); this.children = []; this.parentNode = null; this.nodeType = 1; this.id = ''; this.className = ''; this.dataset = {}; this.attributes = new Map(); this.hidden = false; this.inert = false; this._text = ''; }
    get parentElement() { return this.parentNode; }
    get firstElementChild() { return this.children[0] || null; }
    get nextElementSibling() { return this.parentNode?.children[this.parentNode.children.indexOf(this) + 1] || null; }
    get isConnected() { for (let node = this; node; node = node.parentNode) if (node === document) return true; return false; }
    get classList() { const node = this; return {
      contains(value) { return node.className.split(' ').includes(value); },
      add(...values) { node.className = [...new Set([...node.className.split(' ').filter(Boolean), ...values])].join(' '); },
      remove(...values) { node.className = node.className.split(' ').filter(value => !values.includes(value)).join(' '); },
      toggle(value, force) { const active = force ?? !this.contains(value); active ? this.add(value) : this.remove(value); return active; }
    }; }
    set textContent(value) { for (const child of this.children) child.parentNode = null; this.children = []; this._text = String(value); }
    get textContent() { return this._text + this.children.map(child => child.textContent).join(''); }
    setAttribute(name, value) { this.attributes.set(name, String(value)); if (['id', 'lang', 'dir'].includes(name)) this[name] = String(value); }
    getAttribute(name) { return this.attributes.get(name) ?? null; }
    matches(selector) { return selector.split(',').some(part => { part = part.trim(); if (part === '[hidden]') return this.hidden; if (part === '[inert]') return this.inert; if (part[0] === '#') return this.id === part.slice(1); if (part[0] === '.') return part.slice(1).split('.').every(value => this.classList.contains(value)); return this.tagName === part.toUpperCase(); }); }
    closest(selector) { for (let node = this; node; node = node.parentNode) if (node.matches?.(selector)) return node; return null; }
    contains(node) { for (; node; node = node.parentNode) if (node === this) return true; return false; }
    querySelectorAll(selector) { const result = []; for (const child of this.children) { if (child.matches(selector)) result.push(child); result.push(...child.querySelectorAll(selector)); } return result; }
    querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
    remove() {
      if (!this.parentNode) return;
      if (this.contains(document.activeElement)) document.activeElement = document.body;
      this.parentNode.children.splice(this.parentNode.children.indexOf(this), 1); this.parentNode = null;
    }
    append(...nodes) { for (const node of nodes) { node.remove(); this.children.push(node); node.parentNode = this; } }
    insertBefore(node, reference) { if (node === reference) return node; node.remove(); const index = reference ? this.children.indexOf(reference) : this.children.length; if (index < 0) throw new Error('Missing reference'); this.children.splice(index, 0, node); node.parentNode = this; return node; }
    after(node) { this.parentNode.insertBefore(node, this.nextElementSibling); }
    focus() { document.activeElement = this; }
    click() { if (!this.disabled && !this.closest('[hidden],[inert]')) this.dispatchEvent(new Event('click', { bubbles: true })); }
  }
  document = new Element('document'); document.nodeType = 9;
  document.createElement = tag => new Element(tag);
  document.getElementById = id => document.querySelector('#' + id);
  document.documentElement = new Element('html'); document.documentElement.lang = 'ar'; document.documentElement.dir = 'rtl'; document.append(document.documentElement);
  document.body = new Element('body'); document.documentElement.append(document.body); document.activeElement = document.body;
  function make(tag, id, parent, classes = '') { const node = new Element(tag); node.id = id; node.className = classes; parent.append(node); return node; }
  const main = make('main', 'mainContent', document.body), dashboard = make('section', 'page-dashboard', main, 'page active');
  const overview = make('div', '', dashboard, 'wf-dash-overview');
  const welcome = make('div', 'existing-welcome', overview, 'wf-greeting-flip');
  const faces = make('div', '', welcome, 'wf-greeting-faces'), robot = make('div', 'wfGreetingRobot', faces);
  const sales = make('div', 'existing-sales', overview, 'wf-dash-sales wf-sales-command-card');
  const amount = make('div', '', sales), total = make('strong', 's-total', amount); total.textContent = '$125';
  const metrics = make('div', 'existing-metrics', sales, 'stats-grid dashboard-off');
  let actionCalls = 0;
  const buttons = Array.from({ length: 6 }, (_, index) => { const button = make('button', 'original-action-' + index, metrics, 'stat-card'); button.addEventListener('click', () => actionCalls++); return button; });
  const rates = make('div', 'wfDashRates', dashboard), quote = make('div', 'currBar', rates);
  const workspace = make('div', '', dashboard, 'wf-dash-workspace');
  const recent = make('div', 'existing-recent', workspace, 'wf-dash-primary'); make('div', 'dashRecentInv', recent);
  const insights = make('div', 'existing-insights', workspace, 'wf-dash-secondary'); make('div', 'dashIntelligence', insights);
  const exchange = make('section', 'page-exchange', main, 'page'), exchangeRates = make('div', 'wfExchangeRates', exchange);
  const window = new Target(); window.localStorage = storage; window.CustomEvent = Event;
  const observers = [];
  window.MutationObserver = class { constructor(callback) { observers.push(callback); } observe() {} };
  const events = []; window.addEventListener('wf-home-layout-change', event => events.push(event.detail));
  let edits = 0; document.addEventListener('wf-home-layout-edit', () => edits++);
  const api = Home.mount(document, window);
  return { document, window, api, storage, dashboard, overview, workspace, welcome, sales, total, metrics, buttons, rates, quote, recent, insights, robot, exchangeRates, events,
    layout: document.getElementById('wfHomeLayout'), empty: document.getElementById('wfHomeLayoutEmpty'),
    actionCalls: () => actionCalls, edits: () => edits, translate() { observers.forEach(callback => callback()); } };
}

test('mounting separates original activity controls without cloning business cards or moving the sales total out of sales', () => {
  const f = fixture();
  assert.equal(f.api.element('welcome'), f.welcome); assert.equal(f.api.element('sales'), f.sales);
  assert.equal(f.api.element('rates'), f.rates); assert.equal(f.api.element('recent'), f.recent); assert.equal(f.api.element('insights'), f.insights);
  assert.equal(f.metrics.parentElement, f.api.element('metrics')); assert.equal(f.sales.contains(f.metrics), false);
  assert.equal(f.total.closest('.wf-dash-sales'), f.sales); assert.equal(f.welcome.querySelector('#wfGreetingRobot'), f.robot);
  assert.equal(f.metrics.id, 'existing-metrics'); assert.equal(f.metrics.classList.contains('dashboard-off'), false);
  assert.deepEqual(f.metrics.children, f.buttons); f.buttons[0].click(); assert.equal(f.actionCalls(), 1);
  assert.equal(f.overview.hidden, true); assert.equal(f.workspace.hidden, true);
  assert.equal(Home.mount(f.document, f.window), f.api); assert.equal(f.document.querySelectorAll('#wfHomeLayout').length, 1);
});

test('each home section can be the only visible section, independently from sales and activity', () => {
  const f = fixture();
  for (const chosen of Home.keys) {
    f.api.preview({ ...f.api.get(), hidden: Home.keys.filter(key => key !== chosen) });
    for (const key of Home.keys) {
      const hidden = key !== chosen, node = f.api.element(key);
      assert.equal(node.hidden, hidden, key + ' visibility when ' + chosen + ' is selected');
      assert.equal(node.inert, hidden); assert.equal(node.classList.contains('dashboard-off'), hidden);
    }
    assert.equal(f.empty.hidden, true);
  }
  f.api.preview({ hidden: ['sales'] }); f.buttons[0].click(); assert.equal(f.actionCalls(), 1);
  f.total.textContent = '$250'; assert.equal(f.api.element('sales').querySelector('#s-total').textContent, '$250');
});

test('reordering keeps original identities and focus; cancel restores committed order, visibility and widths', () => {
  const f = fixture(), original = Home.keys.map(key => f.api.element(key));
  f.buttons[0].focus();
  const order = ['metrics', 'rates', 'recent', 'welcome', 'insights', 'sales'];
  f.api.preview({ order, hidden: ['sales'], sizes: { rates: 'wide', insights: 'normal' } });
  assert.deepEqual(f.layout.children, order.map(key => f.api.element(key)));
  assert.equal(f.document.activeElement, f.buttons[0]);
  assert.equal(f.rates.dataset.homeSize, 'wide'); assert.equal(f.insights.dataset.homeSize, 'normal');
  assert.deepEqual(f.api.get(), Home.defaults()); assert.equal(f.storage.writes.length, 0);
  f.api.restore(); assert.deepEqual(f.layout.children, original); assert.equal(f.sales.hidden, false);
  assert.equal(f.rates.dataset.homeSize, 'normal'); assert.equal(f.insights.dataset.homeSize, 'wide');
});

test('all-hidden layout shows a separate edit action and preserves the shared exchange-rate node', () => {
  const f = fixture();
  f.api.preview({ hidden: [...Home.keys] });
  assert.equal(f.layout.hidden, true); assert.equal(f.empty.hidden, false);
  assert.equal(f.empty.parentElement, f.dashboard); assert.equal(f.layout.contains(f.empty), false);
  f.empty.querySelector('button').click(); assert.equal(f.edits(), 1);
  f.exchangeRates.append(f.quote);
  f.api.restore(); assert.equal(f.quote.parentElement, f.exchangeRates); assert.equal(f.quote.hidden, false);
  f.rates.append(f.quote); f.api.preview({ hidden: ['rates'] });
  assert.equal(f.quote.parentElement, f.rates); assert.equal(f.rates.hidden, true); assert.equal(f.quote.hidden, false);
});

test('initial migration, saved layouts and translated empty-state labels survive mounting without business writes', () => {
  const storage = memory({ [Home.legacyKey]: JSON.stringify(Home.keys.filter(key => key !== 'welcome')) });
  const f = fixture(storage);
  assert.equal(f.welcome.hidden, false); assert.equal(f.sales.hidden, true); assert.equal(f.api.element('metrics').hidden, true);
  assert.equal(storage.writes.length, 0);
  const desired = Home.normalize({ order: ['recent', 'metrics'], hidden: ['welcome'], sizes: { metrics: 'wide' } });
  f.api.save(desired);
  const next = fixture(storage);
  assert.deepEqual(next.api.get(), desired); assert.equal(next.layout.children[0], next.recent);
  assert.equal(next.welcome.hidden, true); assert.equal(next.api.element('metrics').dataset.homeSize, 'wide');
  next.document.documentElement.lang = 'en'; next.translate();
  assert.equal(next.empty.querySelector('button').textContent, 'Edit home');
  assert.equal(next.document.getElementById('wfHomeMetricsTitle').textContent, 'Activity and shortcuts');
  assert.equal(next.actionCalls(), 0); assert.equal(storage.writes.length, 1);
});
