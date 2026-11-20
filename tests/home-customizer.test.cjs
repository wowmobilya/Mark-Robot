const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {createSession, moveOrder, dropTarget, copy, text} = require('../home-customizer.js');
const {keys, defaults, normalize, createModel, storageKey, mount: mountLayout} = require('../home-layout.js');

function modelFixture() {
  const records = new Map(), writes = []; let fail = false, presented;
  const storage = {getItem: key => records.get(key) ?? null, setItem(key, value) { if (fail) throw Error('Storage full'); writes.push([key, value]); records.set(key, value); }};
  const model = {...createModel(storage, prefs => { presented = prefs; }), defaults, normalize, keys};
  return {model, writes, records, get presented() { return presented; }, set fail(value) { fail = value; }};
}

test('reorder, visibility, width and reset remain drafts until an explicit successful save', () => {
  const f = modelFixture(), editor = createSession(f.model), original = f.model.get();
  editor.begin(); editor.move('rates', 0); editor.toggle('sales'); editor.resize('welcome', 'wide');
  assert.equal(editor.dirty(), true); assert.equal(f.writes.length, 0); assert.deepEqual(f.model.get(), original);
  assert.equal(f.presented.order[0], 'rates'); assert(f.presented.hidden.includes('sales'));
  assert.equal(f.presented.sizes.welcome, 'wide');
  editor.save(); assert.equal(editor.get(), null); assert.equal(editor.dirty(), false);
  assert.equal(f.writes.length, 1); assert.equal(f.writes[0][0], storageKey);
  const saved = f.model.get(); assert.equal(saved.order[0], 'rates');
  editor.begin(); editor.reset(); assert.deepEqual(f.presented, defaults());
  assert.deepEqual(f.model.get(), saved); assert.equal(f.writes.length, 1);
  editor.cancel(); assert.deepEqual(f.presented, saved);
});

test('failed storage preserves the open draft and allows retry or complete cancellation', () => {
  const f = modelFixture(), editor = createSession(f.model); editor.begin(); editor.move('recent', 0); editor.toggle('metrics');
  const draft = editor.get(); f.fail = true;
  assert.throws(() => editor.save(), /Storage full/); assert.deepEqual(editor.get(), draft); assert(editor.dirty());
  assert.deepEqual(f.model.get(), defaults());
  f.fail = false; editor.save(); assert.deepEqual(f.model.get(), draft);
  editor.begin(); editor.resize('welcome', 'wide'); editor.cancel();
  assert.deepEqual(f.presented, draft); assert.equal(editor.get(), null);
});

test('all six sections may be hidden independently and mutable snapshots cannot corrupt the draft', () => {
  const f = modelFixture(), editor = createSession(f.model); editor.begin();
  for (const key of keys) editor.toggle(key);
  assert.deepEqual(editor.get().hidden, [...keys]);
  const snapshot = editor.get(); snapshot.order.reverse(); snapshot.hidden.length = 0;
  assert.deepEqual(editor.get().order, [...keys]); assert.equal(editor.get().hidden.length, 6);
  editor.save(); editor.begin(); editor.toggle('metrics');
  assert.deepEqual(editor.get().hidden, keys.filter(key => key !== 'metrics'));
});

test('keyboard order operations keep all sections exactly once and stop at boundaries', () => {
  const order = [...keys]; assert.deepEqual(moveOrder(order, 'welcome', -1), order);
  assert.deepEqual(moveOrder(order, 'insights', 6), order);
  assert.deepEqual(moveOrder(order, 'missing', 0), order);
  const moved = moveOrder(order, 'welcome', 5);
  assert.equal(moved[5], 'welcome'); assert.equal(new Set(moved).size, 6); assert.deepEqual(order, [...keys]);
});

test('drop placement handles a single column, paired RTL/LTR tiles and the end of the layout', () => {
  const order = ['a', 'b', 'c'];
  const column = [{key: 'a', left: 0, right: 300, top: 0, bottom: 90}, {key: 'b', left: 0, right: 300, top: 100, bottom: 190}, {key: 'c', left: 0, right: 300, top: 200, bottom: 290}];
  assert.deepEqual(dropTarget(order, 'a', column, {x: 100, y: 320}), {key: 'c', after: true, index: 2});
  assert.deepEqual(dropTarget(order, 'c', column, {x: 100, y: -20}), {key: 'a', after: false, index: 0});
  const row = [{key: 'a', left: 0, right: 300, top: 100, bottom: 200}, {key: 'b', left: 320, right: 620, top: 100, bottom: 200}, {key: 'c', left: 0, right: 620, top: 220, bottom: 300}];
  assert.equal(dropTarget(order, 'c', row, {x: 580, y: 150}, false).after, true);
  assert.equal(dropTarget(order, 'c', row, {x: 580, y: 150}, true).after, false);
  assert.equal(dropTarget(['a'], 'a', column, {x: 0, y: 0}), null);
});

test('all editor labels, announcements and save errors are localized in five languages', () => {
  for (const [key, values] of Object.entries(copy)) {
    assert.equal(values.length, 5, key);
    for (const lang of ['ar', 'en', 'tr', 'fr', 'ru']) {
      const translated = text(key, lang, {name: 'Section', shown: 2, total: 6, position: 3, state: 'Visible', width: 'Wide'});
      assert(translated.length > 0); assert.notEqual(translated, key, key + ' / ' + lang); assert(!translated.includes('{'));
    }
  }
});

test('drop indices retain hidden sections in the full saved order before and after a visible target', () => {
  const order = [...keys];
  const rectangles = [
    {key: 'welcome', left: 0, right: 300, top: 0, bottom: 90},
    {key: 'recent', left: 0, right: 300, top: 100, bottom: 190}
  ];
  // Metrics, Rates and Insights are hidden and consequently have no rectangle.
  const before = dropTarget(order, 'sales', rectangles, {x: 100, y: 105});
  assert.deepEqual(before, {key: 'recent', after: false, index: 3});
  assert.deepEqual(moveOrder(order, 'sales', before.index), ['welcome', 'metrics', 'rates', 'sales', 'recent', 'insights']);
  const after = dropTarget(order, 'sales', rectangles, {x: 100, y: 210});
  assert.deepEqual(after, {key: 'recent', after: true, index: 4});
  assert.deepEqual(moveOrder(order, 'sales', after.index), ['welcome', 'metrics', 'rates', 'recent', 'sales', 'insights']);
});

// Run the editor against the real home-layout model and its DOM presentation.
// This fixture supplies browser primitives, not a second implementation of editing.
function uiFixture({viewport} = {}) {
  let doc, win, fail = false, preview, nextFrame = 0, animationTime = 0, clock = 1700000000000;
  const writes = [], records = new Map(), guards = new Map(), observers = [], frames = new Map(), toasts = [], activations = new Map();
  class Event {
    constructor(type, values = {}) { this.type = type; this.detail = 0; Object.assign(this, values); }
    preventDefault() { this.defaultPrevented = true; }
    stopPropagation() { this.stopped = true; }
    stopImmediatePropagation() { this.stopped = this.immediate = true; }
  }
  class Style {
    setProperty(name, value) { this[name] = String(value); }
    getPropertyValue(name) { return this[name] || ''; }
    removeProperty(name) { const old = this[name] || ''; delete this[name]; return old; }
    get cssText() { return Object.entries(this).map(([name, value]) => name + ': ' + value + ';').join(' '); }
    set cssText(value) {
      for (const name of Object.keys(this)) delete this[name];
      for (const declaration of String(value).split(';')) {
        const at = declaration.indexOf(':'); if (at > 0) this[declaration.slice(0, at).trim()] = declaration.slice(at + 1).trim();
      }
    }
  }
  class Element {
    constructor(tag) {
      this.tagName = tag.toUpperCase(); this.children = []; this.listeners = []; this.attributes = new Map();
      this.dataset = {}; this.style = new Style(); this.className = ''; this.hidden = false; this.inert = false;
      this.scrollTop = 0; this.scrollHeight = 2000; this.clientHeight = 800; this.open = false; this.captures = new Set();
    }
    get classList() {
      const self = this;
      return {
        add(...values) { self.className = [...new Set([...self.className.split(' ').filter(Boolean), ...values])].join(' '); },
        remove(...values) { self.className = self.className.split(' ').filter(value => !values.includes(value)).join(' '); },
        contains(value) { return self.className.split(' ').includes(value); },
        toggle(value, force) { const active = force === undefined ? !this.contains(value) : !!force; if (active) this.add(value); else this.remove(value); return active; }
      };
    }
    set textContent(value) { this._text = String(value); this.replaceChildren(); }
    get textContent() { return (this._text || '') + this.children.map(child => child.textContent || '').join(''); }
    setAttribute(key, value) {
      if (key === 'style') { this.style.cssText = value; return; }
      this.attributes.set(key, String(value));
      if (key === 'id') this.id = String(value);
      if (key === 'class') this.className = String(value);
      if (key === 'hidden') this.hidden = true;
      if (key === 'inert') this.inert = true;
    }
    getAttribute(key) {
      if (key === 'style') return this.style.cssText || null;
      if (key === 'id') return this.id || null;
      if (key === 'class') return this.className || null;
      if (key === 'hidden') return this.hidden ? '' : null;
      if (key === 'inert') return this.inert ? '' : null;
      return this.attributes.get(key) ?? null;
    }
    removeAttribute(key) {
      this.attributes.delete(key);
      if (key === 'style') this.style.cssText = '';
      if (key === 'hidden') this.hidden = false;
      if (key === 'inert') this.inert = false;
    }
    get firstChild() { return this.children[0] || null; }
    get firstElementChild() { return this.firstChild; }
    get parentElement() { return this.parentNode && !['DOCUMENT', 'WINDOW'].includes(this.parentNode.tagName) ? this.parentNode : null; }
    get nextSibling() { return this.parentNode?.children[this.parentNode.children.indexOf(this) + 1] || null; }
    get nextElementSibling() { return this.nextSibling; }
    get isConnected() { return this === doc || !!this.parentNode?.isConnected; }
    append(...nodes) { for (const child of nodes) { child.remove(); child.parentNode = this; this.children.push(child); } }
    insertBefore(child, reference) {
      if (child === reference) return;
      if (reference && reference.parentNode !== this) throw Error('Reference must be a child');
      child.remove(); const index = reference ? this.children.indexOf(reference) : this.children.length;
      this.children.splice(index, 0, child); child.parentNode = this;
    }
    before(...nodes) { if (this.parentNode) for (const child of nodes) this.parentNode.insertBefore(child, this); }
    after(...nodes) { const next = this.nextSibling; if (this.parentNode) for (const child of nodes) this.parentNode.insertBefore(child, next); }
    remove() { if (!this.parentNode) return; const siblings = this.parentNode.children; siblings.splice(siblings.indexOf(this), 1); this.parentNode = null; }
    replaceChildren(...nodes) { for (const child of this.children) child.parentNode = null; this.children = []; this.append(...nodes); }
    contains(target) { for (let at = target; at; at = at.parentNode) if (at === this) return true; return false; }
    matches(selector) {
      return selector.split(',').some(part => {
        part = part.trim();
        if (part === '[hidden]') return this.hidden;
        if (part === '[inert]') return this.inert;
        const attribute = part.match(/^\[([^=\]]+)(?:=["']?([^"'\]]+)["']?)?\]$/);
        if (attribute) return attribute[2] === undefined ? this.getAttribute(attribute[1]) !== null : this.getAttribute(attribute[1]) === attribute[2];
        if (part.startsWith('#')) return this.id === part.slice(1);
        if (part.startsWith('.')) return part.slice(1).split('.').every(name => this.classList.contains(name));
        return this.tagName === part.toUpperCase();
      });
    }
    closest(selector) { for (let at = this; at; at = at.parentNode) if (at.matches(selector)) return at; return null; }
    querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
    querySelectorAll(selector) {
      const result = [];
      for (const child of this.children) { if (child.matches(selector)) result.push(child); result.push(...child.querySelectorAll(selector)); }
      return result;
    }
    addEventListener(type, listener, options = false) { this.listeners.push({type, listener, capture: options === true || !!options.capture, once: !!options.once}); }
    dispatchEvent(event) {
      event.target ||= this;
      const parents = []; for (let at = this.parentNode; at; at = at.parentNode) parents.push(at);
      const invoke = (element, capture) => {
        event.currentTarget = element;
        for (const item of [...element.listeners]) {
          if (item.type !== event.type || item.capture !== capture) continue;
          item.listener(event); if (item.once) element.listeners.splice(element.listeners.indexOf(item), 1);
          if (event.immediate) break;
        }
      };
      for (const parent of [...parents].reverse()) { invoke(parent, true); if (event.stopped) return !event.defaultPrevented; }
      invoke(this, true); if (!event.immediate) invoke(this, false);
      if (event.bubbles && !event.stopped) for (const parent of parents) { invoke(parent, false); if (event.stopped) break; }
      return !event.defaultPrevented;
    }
    click(detail = 0) { if (!this.disabled) this.dispatchEvent(new Event('click', {bubbles: true, detail})); }
    focus() { if (this.isConnected && !this.closest('[hidden],[inert]')) doc.activeElement = this; }
    scrollIntoView(options) { this.scrollCalls ||= []; this.scrollCalls.push(options); }
    setPointerCapture(id) { this.captures.add(id); }
    releasePointerCapture(id) { this.captures.delete(id); }
    hasPointerCapture(id) { return this.captures.has(id); }
    animate(keyframes, options) { const animation = {keyframes, options, cancelled: false, cancel() { this.cancelled = true; }}; this.animations ||= []; this.animations.push(animation); return animation; }
    get offsetHeight() { return this.hidden ? 0 : this.id === 'wfHomeCustomizerActions' ? 62 : this.getBoundingClientRect().height; }
    getClientRects() { return this.isConnected && !this.closest('[hidden]') ? [this.getBoundingClientRect()] : []; }
    getBoundingClientRect() {
      const rect = (left, top, width, height) => ({x: left, y: top, left, right: left + width, top, bottom: top + height, width, height});
      if (this.rect) { const r = this.rect; return rect(r.left, r.top, r.width ?? r.right - r.left, r.height ?? r.bottom - r.top); }
      if (this.classList.contains('wf-home-editor-body')) return rect(24, 140, 240, 260);
      if (this.id === 'wfHomeCustomizerSections') return rect(28, 180 - this.parentNode.scrollTop, 232, 6 * 62);
      if (this.classList.contains('is-dragging') && this.classList.contains('wf-home-section-tile')) { const r = this.parentNode.getBoundingClientRect(); return rect(r.left + parseFloat(this.style.left), r.top + parseFloat(this.style.top), parseFloat(this.style.width), parseFloat(this.style.height)); }
      if (this.parentNode?.id === 'wfHomeCustomizerSections') {
        const r = this.parentNode.getBoundingClientRect(), peers = this.parentNode.children.filter(el => !el.classList.contains('is-dragging')); let top = r.top;
        for (const peer of peers) { if (peer === this) break; top += (parseFloat(peer.style.height) || 56) + 6; }
        return rect(r.left, top, r.width, parseFloat(this.style.height) || 56);
      }
      if (this.parentNode?.id === 'wfHomeLayout') {
        const peers = this.parentNode.children.filter(el => !el.hidden && !el.classList.contains('is-dragging'));
        let top = 100 - doc.scrollingElement.scrollTop;
        for (const peer of peers) { if (peer === this) break; top += (parseFloat(peer.style.height) || 110) + 10; }
        return rect(12, top, win.innerWidth - 24, parseFloat(this.style.height) || 110);
      }
      if (this.classList.contains('wf-home-drag-handle')) { const r = this.closest('.wf-home-section-tile').getBoundingClientRect(); return rect(r.left + 28, r.top + 4, r.width - 28, 44); }
      return rect(12, 80, win.innerWidth - 24, 640);
    }
  }
  doc = new Element('document'); doc.createElement = tag => new Element(tag); doc.getElementById = id => doc.querySelector('#' + id);
  doc.documentElement = new Element('html'); doc.documentElement.lang = 'ar'; doc.append(doc.documentElement);
  doc.body = new Element('body'); doc.documentElement.append(doc.body); doc.activeElement = doc.body; doc.scrollingElement = doc.documentElement;
  win = new Element('window'); win.innerWidth = 390; win.innerHeight = 800; win.CustomEvent = Event;
  if (viewport) {
    win.visualViewport = new Element('visualviewport');
    Object.assign(win.visualViewport, {width: 390, height: 800, offsetLeft: 0, offsetTop: 0}, viewport);
  }
  win.getComputedStyle = element => ({overflowY: element.overflowY || 'visible'});
  win.matchMedia = () => ({matches: false});
  const MutationObserver = class { constructor(callback) { observers.push(callback); } observe() {} };
  win.MutationObserver = MutationObserver;
  const navbar = new Element('header'); navbar.className = 'navbar'; navbar.rect = {left: 0, top: 0, right: 390, bottom: 72}; doc.body.append(navbar);
  const main = new Element('main'); main.id = 'mainContent'; doc.body.append(main);
  const page = new Element('section'); page.id = 'page-dashboard'; main.append(page);
  const overview = new Element('div'); overview.className = 'wf-dash-overview';
  const workspace = new Element('div'); workspace.className = 'wf-dash-workspace'; page.append(overview, workspace);
  const originals = new Map(), controls = new Map();
  for (const [key, className] of [['welcome', 'wf-greeting-flip'], ['sales', 'wf-dash-sales'], ['metrics', 'stats-grid'], ['rates', 'curr-bar'], ['recent', 'wf-dash-primary'], ['insights', 'wf-dash-secondary']]) {
    const card = new Element('section'); card.className = className; if (key === 'rates') card.id = 'wfDashRates';
    const control = new Element('button'); control.textContent = key; control.addEventListener('click', () => activations.set(key, (activations.get(key) || 0) + 1)); card.append(control);
    originals.set(key, card); controls.set(key, control);
    if (key === 'metrics') originals.get('sales').append(card);
    else if (['welcome', 'sales'].includes(key)) overview.append(card);
    else workspace.append(card);
  }
  const nav = new Element('nav'); nav.id = 'bottomNav'; nav.rect = {left: 0, top: 730, right: 390, bottom: 800}; doc.body.append(nav);
  const circle = new Element('div'); circle.id = 'bnavCircle'; circle.rect = {left: 160, top: 710, right: 230, bottom: 780}; nav.append(circle);
  const storage = {getItem: key => records.get(key) ?? null, setItem(key, value) { if (fail) throw Error('Storage full'); writes.push([key, value]); records.set(key, value); }};
  win.addEventListener('wf-home-layout-change', event => { preview = event.detail.prefs; });
  const model = mountLayout(doc, win, storage), grid = doc.getElementById('wfHomeLayout');
  const cards = new Map(keys.map(key => [key, model.element(key)]));
  win.WFAppUpdates = {registerGuard: (name, guard) => guards.set(name, guard)};
  win.showToast = (...args) => toasts.push(args);
  win.requestAnimationFrame = callback => { frames.set(++nextFrame, callback); return nextFrame; };
  win.cancelAnimationFrame = id => frames.delete(id);
  win.WFHomeDock = {create({panel, onOpen, onClose, inline}) {
    assert.equal(inline, undefined); assert.equal(panel.parentNode, undefined);
    const menu = new Element('details'), trigger = new Element('summary');
    menu.id = 'wfHomeDock'; menu.className = 'dash-visibility'; trigger.id = 'wfHomeEdit';
    trigger.setAttribute('aria-controls', panel.id); trigger.setAttribute('aria-expanded', 'false');
    menu.append(trigger, panel); panel.hidden = true; doc.body.append(menu);
    const api = {
      menu, trigger, isOpen: () => menu.open,
      open() { if (menu.open) return true; menu.open = true; panel.hidden = false; trigger.setAttribute('aria-expanded', 'true'); onOpen(); return true; },
      close(returnFocus = false) { if (!menu.open) return false; menu.open = false; panel.hidden = true; trigger.setAttribute('aria-expanded', 'false'); onClose({returnFocus}); if (returnFocus) trigger.focus(); return true; },
      reposition() {}, swapSide() { menu.dataset.side = menu.dataset.side === 'right' ? 'left' : 'right'; return true; }
    };
    trigger.addEventListener('click', () => api.isOpen() ? api.close(true) : api.open());
    doc.addEventListener('keydown', event => { if (event.key === 'Escape' && menu.open) { event.preventDefault(); api.close(true); } });
    return api;
  }};
  class Clock extends Date { static now() { return clock; } }
  const context = vm.createContext({window: win, document: doc, Intl, Date: Clock, MutationObserver});
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../home-customizer.js'), 'utf8'), context);
  const byId = id => doc.getElementById(id), tile = key => byId('wfHomeCustomizerSections').children.find(el => el.dataset.section === key);
  const grip = key => tile(key).querySelector('.wf-home-drag-handle');
  const visibility = key => byId('wfHomeVisibility-' + key);
  const emit = (target, type, values = {}) => { const event = new Event(type, {bubbles: true, ...values}); target.dispatchEvent(event); return event; };
  const order = () => grid.children.filter(el => el.dataset.homeSection).map(el => el.dataset.homeSection);
  return {
    doc, win, model, guards, writes, records, page, grid, cards, originals, controls, activations, byId, tile, grip, visibility, emit, order, toasts,
    list: byId('wfHomeCustomizerSections'), body: byId('wfHomeCustomizerSections').parentNode,
    listOrder: () => byId('wfHomeCustomizerSections').children.filter(el => el.dataset.section).map(el => el.dataset.section),
    toggle(key) { const el = visibility(key); el.checked = !el.checked; emit(el, 'change'); },
    get preview() { return preview; }, set fail(value) { fail = value; },
    advance(ms) { clock += ms; },
    frame(ms = 16) { clock += ms; animationTime += ms; const pending = [...frames]; frames.clear(); for (const [, callback] of pending) callback(animationTime); },
    translate(lang) { doc.documentElement.lang = lang; observers.forEach(callback => callback()); }
  };
}

function startDrag(f, key = 'welcome', pointerId = 1) {
  const rect = f.tile(key).getBoundingClientRect();
  f.emit(f.grip(key), 'pointerdown', {pointerId, button: 0, isPrimary: true, clientX: 100, clientY: rect.top + 30});
  f.emit(f.win, 'pointermove', {pointerId, clientX: 110, clientY: 805});
  f.frame();
}

function nativeTap(f, key, pointerId = 1) {
  const handle = f.grip(key), rect = handle.getBoundingClientRect();
  const point = {pointerId, button: 0, isPrimary: true, clientX: rect.left + 20, clientY: rect.top + 20};
  f.emit(handle, 'pointerdown', point);
  // A click after a captured pointerup is sent to its capture target, even when
  // pointerup's listener releases capture. Preserve that native targeting here.
  const captureTarget = f.doc.querySelectorAll('div').find(el => el.hasPointerCapture(pointerId));
  const target = captureTarget || handle;
  f.emit(f.win, 'pointerup', {...point, target});
  return f.emit(target, 'click', {detail: 1});
}

test('the same edge entry opens the original menu with one six-name list and leaves actual cards unwrapped', () => {
  const f = uiFixture(); f.byId('wfHomeEdit').click();
  const panel = f.byId('wfHomeCustomizer');
  assert.equal(panel.parentNode.id, 'wfHomeDock'); assert.equal(panel.getAttribute('role'), 'dialog');
  assert.equal(f.byId('wfHomeCustomizerTitle').textContent, text('title'));
  assert.equal(f.list.children.length, 6); assert.deepEqual(f.listOrder(), [...keys]);
  assert.equal(f.byId('wfHomeCustomizerAdvanced').getAttribute('aria-expanded'), 'false');
  assert.equal(f.byId('wfHomeCustomizerHint').hidden, false);
  assert.equal(f.doc.querySelector('.wf-home-edit-shell'), null); assert.equal(f.doc.querySelector('.wf-home-card-tools'), null);
  assert.equal(f.byId('wfHomeCustomizerActions'), null);
  for (const key of keys) {
    assert.equal(f.cards.get(key).parentNode, f.grid); assert.equal(f.grip(key).closest('label'), null);
    assert.equal(f.grip(key).closest('[hidden]'), null); assert.equal(f.tile(key).querySelector('.wf-home-section-controls').hidden, true);
  }
  f.emit(f.doc, 'keydown', {key: 'Escape'}); assert.equal(f.win.WFHomeCustomizer.isOpen(), false);
  assert.equal(f.doc.activeElement, f.byId('wfHomeEdit')); assert.equal(f.writes.length, 0);
});

test('two native name taps reorder the existing list and preview the dashboard without toggling visibility', () => {
  const f = uiFixture(); f.win.WFHomeCustomizer.open();
  nativeTap(f, 'welcome', 1); assert.equal(f.grip('welcome').getAttribute('aria-pressed'), 'true'); assert.equal(f.list.hasPointerCapture(1), false);
  nativeTap(f, 'rates', 2);
  const expected = ['sales', 'metrics', 'rates', 'welcome', 'recent', 'insights'];
  assert.deepEqual(f.listOrder(), expected); assert.deepEqual(f.order(), expected);
  assert.equal(f.grip('welcome').getAttribute('aria-pressed'), 'false'); assert.equal(f.list.hasPointerCapture(2), false);
  assert.equal(f.writes.length, 0); assert.deepEqual(f.model.get(), defaults()); assert.deepEqual(f.preview.hidden, []);
  assert.equal(f.guards.get('home-customizer')(), true);
  f.byId('wfHomeCustomizerCancel').click(); assert.deepEqual(f.order(), [...keys]); assert.equal(f.writes.length, 0);
});

test('a name can be selected and deselected, and Escape first cancels selection before closing the menu', () => {
  const f = uiFixture(); f.win.WFHomeCustomizer.open(); nativeTap(f, 'sales'); nativeTap(f, 'sales');
  assert.equal(f.grip('sales').getAttribute('aria-pressed'), 'false');
  nativeTap(f, 'sales'); f.emit(f.doc, 'keydown', {key: 'Escape'});
  assert.equal(f.win.WFHomeCustomizer.isOpen(), true); assert.equal(f.grip('sales').getAttribute('aria-pressed'), 'false');
  f.emit(f.doc, 'keydown', {key: 'Escape'}); assert.equal(f.win.WFHomeCustomizer.isOpen(), false);
});

test('keyboard movement includes hidden list rows and preserves focus, boundaries and repeat behavior', () => {
  const f = uiFixture(); f.win.WFHomeCustomizer.open(); f.toggle('sales');
  const handle = f.grip('welcome'); handle.focus(); f.emit(handle, 'keydown', {key: 'ArrowDown'});
  assert.deepEqual(f.listOrder(), ['sales', 'welcome', 'metrics', 'rates', 'recent', 'insights']);
  assert.equal(f.doc.activeElement, handle); assert.equal(f.tile('sales').hidden, false); assert.equal(f.cards.get('sales').hidden, true);
  const order = f.listOrder(); f.emit(handle, 'keydown', {key: 'ArrowDown', repeat: true}); assert.deepEqual(f.listOrder(), order);
  f.emit(handle, 'keydown', {key: 'End'}); assert.equal(f.listOrder().at(-1), 'welcome');
  f.emit(handle, 'keydown', {key: 'ArrowDown'}); assert.equal(f.listOrder().at(-1), 'welcome');
  f.emit(handle, 'keydown', {key: 'Home'}); assert.equal(f.listOrder()[0], 'welcome'); assert.equal(f.writes.length, 0);
});

test('Save persists the same list order and Cancel restores the latest committed layout', () => {
  const f = uiFixture(); f.win.WFHomeCustomizer.open(); f.emit(f.grip('welcome'), 'keydown', {key: 'End'});
  f.byId('wfHomeCustomizerSave').click(); assert.equal(f.writes.length, 1); assert.equal(f.win.WFHomeCustomizer.isOpen(), false);
  const saved = f.model.get(); assert.equal(saved.order.at(-1), 'welcome');
  const reloaded = createModel({getItem: key => f.records.get(key), setItem() {}}, () => {}); assert.deepEqual(reloaded.get(), saved);
  f.win.WFHomeCustomizer.open(); assert.deepEqual(f.listOrder(), saved.order); f.byId('wfHomeCustomizerReset').click();
  assert.deepEqual(f.listOrder(), [...keys]); f.byId('wfHomeCustomizerCancel').click(); assert.deepEqual(f.order(), saved.order);
});

test('failed Save retains the menu and draft with reachable localized retry controls', () => {
  const f = uiFixture(); f.win.WFHomeCustomizer.open(); f.emit(f.grip('recent'), 'keydown', {key: 'Home'}); f.fail = true;
  f.body.scrollTop = 150; f.byId('wfHomeCustomizerSave').click();
  assert.equal(f.win.WFHomeCustomizer.isOpen(), true); assert.equal(f.body.scrollTop, 0);
  assert.equal(f.byId('wfHomeCustomizerStatus').hidden, false); assert.equal(f.byId('wfHomeCustomizerStatus').textContent, text('error'));
  assert.deepEqual(f.model.get(), defaults()); assert.equal(f.listOrder()[0], 'recent');
  f.translate('tr'); assert.equal(f.byId('wfHomeCustomizerStatus').textContent, text('error', 'tr'));
  f.fail = false; f.byId('wfHomeCustomizerSave').click(); assert.equal(f.model.get().order[0], 'recent'); assert.equal(f.writes.length, 1);
});

test('all six sections remain in the same list when hidden, saved, reopened and reordered', () => {
  const f = uiFixture(); f.win.WFHomeCustomizer.open(); for (const key of keys) f.toggle(key);
  assert.equal(f.list.children.length, 6); assert.equal(f.byId('wfHomeCustomizer').querySelector('.wf-home-editor-empty').hidden, false);
  for (const key of keys) { assert.equal(f.tile(key).hidden, false); assert.equal(f.visibility(key).checked, false); assert.equal(f.cards.get(key).hidden, true); }
  f.byId('wfHomeCustomizerSave').click(); f.win.WFHomeCustomizer.open();
  f.emit(f.grip('insights'), 'keydown', {key: 'Home'}); assert.equal(f.listOrder()[0], 'insights');
  f.toggle('insights'); assert.equal(f.cards.get('insights').hidden, false); f.byId('wfHomeCustomizerSave').click();
  assert.deepEqual(f.model.get().hidden, keys.filter(key => key !== 'insights'));
});

test('optional width controls expand inside the same six rows and never gate dragging', () => {
  const f = uiFixture(); f.win.WFHomeCustomizer.open(); const list = f.list;
  f.emit(f.grip('sales'), 'keydown', {key: 'Home'}); assert.equal(f.listOrder()[0], 'sales');
  f.byId('wfHomeCustomizerAdvanced').click(); assert.equal(f.byId('wfHomeCustomizerAdvanced').getAttribute('aria-expanded'), 'true');
  const controls = f.tile('welcome').querySelector('.wf-home-section-controls'); assert.equal(controls.hidden, false);
  controls.querySelector('.wf-home-width-options').children[1].click(); assert.equal(f.preview.sizes.welcome, 'wide');
  assert.equal(f.list, list); assert.equal(f.list.children.length, 6); assert.equal(controls.querySelector('.wf-home-move-controls'), null);
  f.byId('wfHomeCustomizerAdvanced').click(); assert.equal(controls.hidden, true);
  f.byId('wfHomeCustomizerReset').click(); assert.deepEqual(f.listOrder(), [...keys]); assert.equal(f.preview.sizes.welcome, 'normal'); assert.equal(f.writes.length, 0);
});

test('visibility and page-content touches do not start a drag and small name movement remains a tap', () => {
  const f = uiFixture(); f.win.WFHomeCustomizer.open();
  f.emit(f.visibility('welcome'), 'pointerdown', {pointerId: 1, button: 0, clientX: 35, clientY: 200});
  f.emit(f.win, 'pointermove', {pointerId: 1, clientX: 35, clientY: 450}); assert.equal(f.list.hasPointerCapture(1), false);
  f.controls.get('welcome').click(); assert.equal(f.activations.get('welcome'), 1);
  f.emit(f.grip('welcome'), 'pointerdown', {pointerId: 2, button: 0, clientX: 100, clientY: 200});
  f.emit(f.win, 'pointermove', {pointerId: 2, clientX: 102, clientY: 203});
  assert.equal(f.list.querySelector('.wf-home-drop-space'), null); assert.equal(f.list.hasPointerCapture(2), false);
  f.emit(f.win, 'pointerup', {pointerId: 2, clientX: 102, clientY: 203}); f.emit(f.grip('welcome'), 'click', {detail: 1});
  assert.equal(f.grip('welcome').getAttribute('aria-pressed'), 'true'); assert.deepEqual(f.preview.hidden, []);
});

test('dragging lifts only the existing menu row, leaves a full-height slot and commits the draft on release', () => {
  const f = uiFixture(); f.win.WFHomeCustomizer.open(); const original = f.cards.get('welcome'), row = f.tile('welcome');
  startDrag(f); assert.equal(f.list.hasPointerCapture(1), true); assert.equal(row.classList.contains('is-dragging'), true);
  assert.equal(original.parentNode, f.grid); assert.equal(original.classList.contains('is-dragging'), false);
  assert.equal(row.parentNode, f.list); assert.equal(f.list.querySelector('.wf-home-drop-space').style.height, '56px');
  assert.equal(f.writes.length, 0); assert.deepEqual(f.model.get(), defaults()); assert.deepEqual(f.order(), [...keys]);
  assert.equal(f.guards.get('home-customizer')(), true);
  f.emit(f.win, 'pointerup', {pointerId: 1, clientX: 100, clientY: 805});
  assert.equal(f.listOrder().at(-1), 'welcome'); assert.deepEqual(f.order(), f.listOrder()); assert.equal(f.writes.length, 0);
  assert.equal(f.list.hasPointerCapture(1), false); assert.equal(f.list.querySelector('.wf-home-drop-space'), null);
  const trailing = f.emit(f.grip('welcome'), 'click', {detail: 1}); assert.equal(trailing.defaultPrevented, true);
  assert.equal(f.grip('welcome').getAttribute('aria-pressed'), 'false'); assert.deepEqual(f.preview.hidden, []);
  f.advance(401); nativeTap(f, 'welcome'); assert.equal(f.grip('welcome').getAttribute('aria-pressed'), 'true');
});

test('touch capture transfer from name to stable list does not cancel the active drag', () => {
  const f = uiFixture(); f.win.WFHomeCustomizer.open(); startDrag(f);
  f.emit(f.grip('welcome'), 'lostpointercapture', {pointerId: 1});
  assert.equal(f.tile('welcome').classList.contains('is-dragging'), true); assert.equal(f.list.hasPointerCapture(1), true);
  f.emit(f.win, 'pointerup', {pointerId: 1, clientX: 100, clientY: 805}); assert.equal(f.listOrder().at(-1), 'welcome');
});

test('dragging a hidden section changes its list position without showing it', () => {
  const f = uiFixture(); f.win.WFHomeCustomizer.open(); f.toggle('welcome'); startDrag(f);
  f.emit(f.win, 'pointerup', {pointerId: 1, clientX: 100, clientY: 805});
  assert.equal(f.listOrder().at(-1), 'welcome'); assert.equal(f.cards.get('welcome').hidden, true); assert.equal(f.visibility('welcome').checked, false);
});

test('interrupted drags clear capture, styles and placeholder without a partial order or persistence', async t => {
  for (const reason of ['pointercancel', 'blur', 'resize', 'capture-loss', 'second-pointer', 'hidden', 'escape', 'close']) await t.test(reason, () => {
    const f = uiFixture(); f.win.WFHomeCustomizer.open(); const row = f.tile('welcome'); row.style.color = 'red'; const previousStyle = row.getAttribute('style'); startDrag(f);
    if (reason === 'capture-loss') f.emit(f.list, 'lostpointercapture', {pointerId: 1});
    else if (reason === 'second-pointer') f.emit(f.doc, 'pointerdown', {pointerId: 2, isPrimary: false});
    else if (reason === 'hidden') { f.doc.hidden = true; f.emit(f.doc, 'visibilitychange'); }
    else if (reason === 'escape') f.emit(f.doc, 'keydown', {key: 'Escape'});
    else if (reason === 'close') f.byId('wfHomeCustomizerClose').click();
    else f.emit(f.win, reason, {pointerId: 1, clientX: 100, clientY: 805});
    assert.equal(f.list.hasPointerCapture(1), false); assert.equal(f.list.querySelector('.wf-home-drop-space'), null);
    assert.equal(row.getAttribute('style'), previousStyle); assert.deepEqual(f.listOrder(), [...keys]); assert.deepEqual(f.order(), [...keys]); assert.equal(f.writes.length, 0);
  });
});

test('edge scrolling affects only the menu body and preserves pointer alignment under a transformed panel', () => {
  const f = uiFixture(); f.win.WFHomeCustomizer.open(); f.body.clientHeight = 260; f.body.scrollHeight = 1100;
  f.byId('wfHomeCustomizer').style.transform = 'translateY(0)'; startDrag(f);
  const before = f.body.scrollTop; f.frame(32); f.frame(32); assert(f.body.scrollTop > before); assert.equal(f.doc.scrollingElement.scrollTop, 0);
  f.emit(f.win, 'pointermove', {pointerId: 1, clientX: 100, clientY: 325}); f.frame(16);
  const row = f.tile('welcome').getBoundingClientRect(); assert.equal(row.top, 325 - 30);
  f.emit(f.win, 'pointermove', {pointerId: 1, clientX: 100, clientY: 145}); const down = f.body.scrollTop; f.frame(32); assert(f.body.scrollTop < down);
  f.emit(f.win, 'pointercancel', {pointerId: 1, clientX: 100, clientY: 145}); const stopped = f.body.scrollTop; f.frame(32); assert.equal(f.body.scrollTop, stopped);
});

test('dragging below the final menu row cannot grow its scroll range or run beyond the original list', () => {
  const f = uiFixture(); f.win.WFHomeCustomizer.open(); f.body.clientHeight = 260; f.body.scrollHeight = 600;
  startDrag(f); const originalMaximum = 600 - 260;
  // Absolute overflow would normally enlarge scrollHeight. Expose a larger
  // measured value after activation to verify the drag retains its fixed bound.
  f.body.scrollHeight = 2000;
  for (let i = 0; i < 80; i++) f.frame(32);
  assert.equal(f.body.scrollTop, originalMaximum);
  const list = f.list.getBoundingClientRect(), row = f.tile('welcome').getBoundingClientRect();
  assert(row.top >= list.top); assert(row.bottom <= list.bottom);
  f.emit(f.win, 'pointercancel', {pointerId: 1, clientX: 100, clientY: 805});
  assert.equal(f.list.querySelector('.wf-home-drop-space'), null); assert.deepEqual(f.order(), [...keys]);
});

test('language changes update the existing menu and cancel an in-progress drag safely', () => {
  const f = uiFixture(); f.win.WFHomeCustomizer.open(); startDrag(f); f.translate('fr');
  assert.equal(f.byId('wfHomeCustomizer').dir, 'ltr'); assert.equal(f.byId('wfHomeCustomizerTitle').textContent, text('title', 'fr'));
  assert.equal(f.grip('sales').getAttribute('aria-label'), text('drag', 'fr', {name: text('sales', 'fr')}));
  assert.equal(f.list.querySelector('.wf-home-drop-space'), null); assert.deepEqual(f.listOrder(), [...keys]); assert.equal(f.writes.length, 0);
});
