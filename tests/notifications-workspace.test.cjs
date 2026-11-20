const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const file = path.join(__dirname, '../notifications-workspace.js');
function fixture(initial = 'dashboard', options = {}) {
  const observers = [], frames = [], events = new Map(), calls = {legacy: 0, back: 0, network: 0, speech: 0};
  let document;
  function notify(target, type, detail = {}) {
    for (const observer of observers) for (const entry of observer.targets) {
      if ((entry.target === target || entry.options.subtree && entry.target.contains(target)) &&
          (type === 'childList' ? entry.options.childList : entry.options.attributes && (!entry.options.attributeFilter || entry.options.attributeFilter.includes(detail.attributeName)))) {
        observer.records.push({target, type, ...detail}); break;
      }
    }
  }
  class Element {
    constructor(tagName = 'div') {
      this.tagName = tagName.toUpperCase(); this.nodeType = 1; this.children = []; this.attributes = {}; this.dataset = {}; this.events = new Map(); this.classes = new Set(); this.visible = true; this.style = {};
      this.classList = {contains: name => this.classes.has(name), add: (...names) => names.forEach(name => this.classList.toggle(name, true)), remove: (...names) => names.forEach(name => this.classList.toggle(name, false)), toggle: (name, enabled = !this.classes.has(name)) => {
        if (enabled !== this.classes.has(name)) { if (enabled) this.classes.add(name); else this.classes.delete(name); notify(this, 'attributes', {attributeName: 'class'}); } return enabled;
      }};
    }
    get className() { return [...this.classes].join(' '); }
    set className(value) { this.classes = new Set(value.split(/\s+/).filter(Boolean)); notify(this, 'attributes', {attributeName: 'class'}); }
    get parentElement() { return this.parentNode; }
    get isConnected() { return document?.documentElement.contains(this) || false; }
    get hidden() { return this.hasAttribute('hidden'); }
    set hidden(value) { if (value) this.setAttribute('hidden', ''); else this.removeAttribute('hidden'); }
    setAttribute(name, value) { value = String(value); if (this.attributes[name] !== value) { this.attributes[name] = value; notify(this, 'attributes', {attributeName: name}); } }
    getAttribute(name) { return this.attributes[name] ?? null; }
    hasAttribute(name) { return name in this.attributes; }
    removeAttribute(name) { if (name in this.attributes) { delete this.attributes[name]; notify(this, 'attributes', {attributeName: name}); } }
    append(...nodes) { for (const node of nodes) this.insertBefore(node, null); }
    insertBefore(node, before) {
      node.remove(); node.parentNode = this;
      this.children.splice(before ? this.children.indexOf(before) : this.children.length, 0, node);
      notify(this, 'childList', {addedNodes: [node], removedNodes: []});
    }
    remove() { if (this.parentNode) { const old = this.parentNode; old.children.splice(old.children.indexOf(this), 1); this.parentNode = null; notify(old, 'childList', {addedNodes: [], removedNodes: [this]}); } }
    contains(node) { return this === node || this.children.some(child => child.contains(node)); }
    matches(selector) {
      return selector.split(',').some(part => {
        const value = part.trim();
        if (value.startsWith('#')) return this.id === value.slice(1);
        if (value.startsWith('.')) return value.slice(1).split('.').every(name => this.classes.has(name));
        if (value === '[hidden]') return this.hidden;
        if (value === '[inert]') return this.inert;
        if (value === '[role="dialog"]') return this.getAttribute('role') === 'dialog';
        return this.tagName.toLowerCase() === value;
      });
    }
    closest(selector) { for (let node = this; node; node = node.parentNode) if (node.matches(selector)) return node; return null; }
    querySelectorAll(selector) { return this.children.flatMap(child => [...(child.matches(selector) ? [child] : []), ...child.querySelectorAll(selector)]); }
    querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
    getClientRects() { for (let node = this; node; node = node.parentNode) if (!node.visible || node.hidden || node.classes.has('page') && !node.classes.has('active')) return []; return this.isConnected ? [{}] : []; }
    addEventListener(name, listener) { this.events.set(name, listener); }
    focus() { document.activeElement = this; }
    click() { this.events.get('click')?.({target: this}); }
  }
  const html = new Element('html'), body = new Element('body'), main = new Element('main'), home = new Element('nav'), settings = new Element('button');
  html.lang = 'en'; html.dir = 'ltr'; main.id = 'mainContent'; settings.id = 'headerSettingsBtn'; html.append(body); body.append(home, main); home.append(settings);
  const pages = {}, headings = {};
  for (const name of ['dashboard', 'products', 'cart', 'settings']) {
    const page = new Element('section'), row = new Element('header');
    page.id = 'page-' + name; page.className = 'page' + (name === initial ? ' active' : ''); row.className = 'wf-heading-row'; page.append(row); main.append(page); pages[name] = page; headings[name] = row;
  }
  document = {documentElement: html, body, activeElement: body, createElement: tag => new Element(tag),
    getElementById: id => html.querySelector('#' + id), querySelector: selector => html.querySelector(selector), querySelectorAll: selector => html.querySelectorAll(selector)};
  function dispatch(name, detail = {}) {
    let stopped = false;
    const event = {...detail, stopImmediatePropagation() { stopped = true; }};
    const listeners = [...(events.get(name) || [])];
    if (!options.legacyFirst) listeners.sort((a, b) => Number(b.capture) - Number(a.capture));
    for (const listener of listeners) { if (stopped) break; listener.fn(event); }
  }
  const location = {hash: '#' + initial}, entries = [{state: {page: initial}, hash: '#' + initial}]; let position = 0;
  const history = {get state() { return entries[position].state; }, get length() { return entries.length; },
    pushState(state, _, hash) { entries.splice(++position); entries.push({state, hash}); location.hash = hash; },
    replaceState(state, _, hash) { entries[position] = {state, hash}; location.hash = hash; },
    back() { this.go(-1); }, forward() { this.go(1); },
    go(delta) { const next = position + delta; if (next < 0 || next >= entries.length) return; position = next; location.hash = entries[position].hash; dispatch('popstate', {state: this.state}); dispatch('hashchange'); }};
  const window = {document, location, history, getComputedStyle: () => ({visibility: 'visible'}),
    requestAnimationFrame: callback => frames.push(callback),
    addEventListener(name, fn, options) { if (!events.has(name)) events.set(name, []); events.get(name).push({fn, capture: options === true || options?.capture === true}); },
    removeEventListener(name, fn) { events.set(name, (events.get(name) || []).filter(entry => entry.fn !== fn)); },
    MutationObserver: class {constructor(callback) { this.callback = callback; this.targets = []; this.records = []; observers.push(this); } observe(target, options) { this.targets.push({target, options}); } disconnect() { this.targets = []; this.records = []; }},
    fetch() { calls.network++; }, WFProgramSpeech: {speak() { calls.speech++; }}, wfToggleDesktopSidebar() { calls.menu = (calls.menu || 0) + 1; }};
  Object.defineProperty(window, 'Notification', {get() { throw new Error('Notifications page must not request browser notification access'); }});
  function current() { return document.querySelector('.page.active')?.id.slice(5) || 'dashboard'; }
  window.showPage = (id, push = true) => {
    const target = document.getElementById('page-' + id); if (!target) return;
    document.querySelectorAll('.page').forEach(page => page.classList.toggle('active', page === target));
    html.classList.toggle('wf-section-mode', id !== 'dashboard');
    if (push) history[location.hash === '#' + id ? 'replaceState' : 'pushState']({page: id}, '', '#' + id);
  };
  window.goBack = () => { calls.back++; window.showPage('dashboard'); };
  // Model the legacy router's destructive bubble listener so route tests catch it.
  window.addEventListener('popstate', event => {
    if (options.legacyFirst && window.WFNotifications?.handleHistory?.(event)) return;
    calls.legacy++; window.showPage('dashboard');
  });
  function flush() {
    let turns = 0;
    while (frames.length || observers.some(observer => observer.records.length)) {
      assert(++turns < 60, 'notification observers must settle without a mutation loop');
      for (const observer of observers) if (observer.records.length) observer.callback(observer.records.splice(0));
      for (const callback of frames.splice(0)) callback();
    }
  }
  assert(fs.existsSync(file), 'Notifications workspace must exist');
  const context = vm.createContext({window, MutationObserver: window.MutationObserver});
  vm.runInContext(fs.readFileSync(file, 'utf8'), context); flush();
  return {window, document, html, main, home, pages, headings, calls, history, location, entries, frames, observers, Element, dispatch, current, flush, context,
    button: document.getElementById('wfNotificationsButton'), page: document.getElementById('page-notifications')};
}

test('the bell opens one actual empty page without speech, network, unread counts or permission requests', () => {
  const app = fixture();
  assert(app.button); assert(app.page); assert.equal(app.page.parentNode, app.main);
  assert.equal(app.button.getAttribute('aria-controls'), 'page-notifications');
  assert.equal(app.button.getAttribute('aria-label'), 'Notifications');
  assert.equal(app.document.getElementById('wfProgramSpeechButton'), null);
  assert.equal(app.document.getElementById('wfNotificationsEmpty').textContent, 'No notifications yet');
  assert.equal(app.page.querySelectorAll('[role="dialog"]').length, 0);
  assert.equal(app.button.getAttribute('aria-expanded'), null);
  app.button.click(); app.flush();
  assert.equal(app.current(), 'notifications'); assert.equal(app.location.hash, '#notifications');
  assert.equal(app.document.activeElement, app.document.getElementById('wfNotificationsTitle'));
  assert.equal(app.button.getAttribute('aria-current'), 'page');
  app.button.click(); app.flush(); assert.equal(app.history.length, 2, 'reopening the current page cannot add history entries');
  vm.runInContext(fs.readFileSync(file, 'utf8'), app.context); app.flush();
  assert.equal(app.document.querySelectorAll('#page-notifications').length, 1);
  assert.equal(app.document.querySelectorAll('#wfNotificationsButton').length, 1);
  assert.equal(app.calls.network, 0); assert.equal(app.calls.speech, 0);
});

test('native Back and Forward restore the real notification route without the legacy router destroying history', () => {
  const app = fixture(); app.window.showPage('products'); app.flush();
  app.button.click(); app.flush(); assert.equal(app.current(), 'notifications');
  app.window.goBack(); app.flush();
  assert.equal(app.current(), 'products'); assert.equal(app.location.hash, '#products');
  assert.equal(app.document.activeElement, app.button); assert.equal(app.calls.legacy, 0); assert.equal(app.calls.back, 0);
  app.history.forward(); app.flush(); assert.equal(app.current(), 'notifications');
  app.window.showPage('cart'); app.flush(); app.history.back(); app.flush(); assert.equal(app.current(), 'notifications');
  app.history.forward(); app.flush(); assert.equal(app.current(), 'cart'); assert.equal(app.calls.legacy, 0);
  app.window.goBack(); app.flush(); assert.equal(app.calls.back, 1, 'unrelated contextual Back behavior stays delegated');
});

test('the existing popstate listener can delegate before its destructive hierarchical Back path runs', () => {
  const app = fixture('dashboard', {legacyFirst: true});
  app.window.showPage('products'); app.button.click(); app.flush();
  app.history.back(); app.flush();
  assert.equal(app.current(), 'products'); assert.equal(app.location.hash, '#products'); assert.equal(app.calls.legacy, 0);
  app.history.forward(); app.flush();
  assert.equal(app.current(), 'notifications'); assert.equal(app.location.hash, '#notifications'); assert.equal(app.calls.legacy, 0);
  app.window.goBack(); app.flush(); assert.equal(app.current(), 'products');
  app.history.forward(); app.flush(); assert.equal(app.current(), 'notifications');
  const untouched = {state: {page: 'cart'}, stopImmediatePropagation() { assert.fail('unrelated history must not be consumed'); }};
  app.window.showPage('cart'); app.flush();
  assert.equal(app.window.WFNotifications.handleHistory(untouched), false);
});

test('a direct notification link has a working Back fallback and manual hash navigation keeps its return entry', () => {
  const direct = fixture(); direct.history.replaceState({page: 'notifications'}, '', '#notifications'); direct.window.showPage('notifications', false); direct.flush();
  direct.window.goBack(); direct.flush(); assert.equal(direct.current(), 'dashboard');
  const app = fixture(); app.window.showPage('cart'); app.flush();
  app.history.pushState(null, '', '#notifications'); app.dispatch('hashchange'); app.flush();
  assert.equal(app.current(), 'notifications'); app.window.goBack(); app.flush(); assert.equal(app.current(), 'cart');
  app.history.forward(); app.flush(); assert.equal(app.current(), 'notifications');
});

test('one bell follows visible section and showroom headers and remains available during report speech', () => {
  const app = fixture(), bell = app.button;
  assert.equal(bell.parentNode, app.home);
  app.window.showPage('cart'); app.flush(); assert.equal(bell.parentNode, app.headings.cart);
  const dialog = new app.Element('dialog'), ignored = new app.Element('header'); ignored.className = 'wf-heading-row'; dialog.append(ignored); app.pages.cart.append(dialog);
  const alternative = new app.Element('header'); alternative.className = 'wf-heading-row'; app.pages.cart.append(alternative); app.headings.cart.hidden = true; app.flush();
  assert.equal(bell.parentNode, alternative, 'dialog and hidden headers cannot claim the global control');
  app.html.classList.add('wf-speech-toolbar-active'); app.flush(); assert.equal(bell.parentNode, alternative); assert.equal(bell.hidden, false);
  app.window.showPage('products'); app.flush();
  const labels = new app.Element('article'), toolbar = new app.Element('header'); toolbar.className = 'wf-label-toolbar'; labels.append(toolbar); app.pages.products.append(labels); app.headings.products.hidden = true; app.flush();
  assert.equal(bell.parentNode, toolbar); assert(toolbar.classList.contains('wf-notifications-slot'));
  app.window.showPage('dashboard'); app.flush(); assert.equal(bell.parentNode, app.home); assert.equal(bell.hidden, false);
  assert(!toolbar.classList.contains('wf-notifications-slot')); assert.equal(app.document.querySelectorAll('#wfNotificationsButton').length, 1);
});

test('all five app languages update accessible labels and the same empty page without resetting navigation', () => {
  const app = fixture(); app.button.click(); app.flush(); const historyLength = app.history.length;
  const titles = {ar: 'الإشعارات', en: 'Notifications', tr: 'Bildirimler', fr: 'Notifications', ru: 'Уведомления'};
  for (const [locale, title] of Object.entries(titles)) {
    app.html.lang = locale; app.html.dir = locale === 'ar' ? 'rtl' : 'ltr';
    for (const observer of app.observers) if (observer.targets.some(entry => entry.target === app.html)) observer.callback([{target: app.html, type: 'attributes', attributeName: 'lang'}]);
    app.flush();
    assert.equal(app.button.getAttribute('aria-label'), title); assert.equal(app.document.getElementById('wfNotificationsTitle').textContent, title);
    assert.equal(app.page.lang, locale); assert.equal(app.page.dir, locale === 'ar' ? 'rtl' : 'ltr');
    assert(app.document.getElementById('wfNotificationsEmpty').textContent); assert(app.document.getElementById('wfNotificationsDescription').textContent);
    assert.equal(app.current(), 'notifications'); assert.equal(app.history.length, historyLength);
  }
});

test('catalog row updates do not repeatedly measure or move the mounted bell', () => {
  const app = fixture(); app.window.showPage('products'); app.flush();
  let measurements = 0; const row = app.headings.products, original = row.getClientRects;
  row.getClientRects = function() { measurements++; return original.call(this); };
  const list = new app.Element('div'); app.pages.products.append(list); app.flush(); measurements = 0;
  for (let i = 0; i < 100; i++) { const item = new app.Element('div'); item.className = 'product-row'; list.append(item); item.classList.add('selected'); }
  app.flush(); assert.equal(measurements, 0, 'business content updates must not trigger a header placement pass');
  assert.equal(app.button.parentNode, row);
});
