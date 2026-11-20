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
      if (this.id === 'wfHomeCustomizerActions') return rect(12, win.innerHeight - (parseFloat(this.style.getPropertyValue('--wf-home-actions-bottom')) || 12) - 62, win.innerWidth - 24, 62);
      if (this.classList.contains('is-dragging')) return rect(parseFloat(this.style.left), parseFloat(this.style.top), parseFloat(this.style.width), 110);
      if (this.parentNode?.id === 'wfHomeLayout') {
        const peers = this.parentNode.children.filter(el => !el.hidden && !el.classList.contains('is-dragging'));
        let top = 100 - doc.scrollingElement.scrollTop;
        for (const peer of peers) { if (peer === this) break; top += (parseFloat(peer.style.height) || 110) + 10; }
        return rect(12, top, win.innerWidth - 24, parseFloat(this.style.height) || 110);
      }
      if (this.classList.contains('wf-home-card-grip')) { const r = this.closest('.wf-home-edit-shell').getBoundingClientRect(); return rect(r.left + 4, r.top + 4, r.width - 100, 44); }
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
    assert.equal(inline, true); assert.equal(panel.parentNode, page);
    const menu = new Element('details'), trigger = new Element('summary');
    menu.id = 'wfHomeDock'; menu.className = 'dash-visibility'; menu.dataset.inline = 'true'; trigger.id = 'wfHomeEdit';
    trigger.setAttribute('aria-controls', panel.id); trigger.setAttribute('aria-expanded', 'false');
    menu.append(trigger); doc.body.append(menu);
    const api = {
      menu, trigger, isOpen: () => menu.open,
      open() { if (menu.open) return true; menu.open = true; panel.hidden = false; trigger.setAttribute('aria-expanded', 'true'); onOpen(); return true; },
      close(returnFocus = false) { if (!menu.open) return false; menu.open = false; panel.hidden = true; trigger.setAttribute('aria-expanded', 'false'); onClose({returnFocus}); if (returnFocus) trigger.focus(); return true; },
      reposition() {}
    };
    trigger.addEventListener('click', () => api.isOpen() ? api.close(true) : api.open());
    doc.addEventListener('keydown', event => { if (event.key === 'Escape' && menu.open) { event.preventDefault(); api.close(true); } });
    return api;
  }};
  class Clock extends Date { static now() { return clock; } }
  const context = vm.createContext({window: win, document: doc, Intl, Date: Clock, MutationObserver});
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../home-customizer.js'), 'utf8'), context);
  const byId = id => doc.getElementById(id), tile = key => cards.get(key).closest('.wf-home-edit-shell');
  const grip = key => tile(key).querySelector('.wf-home-card-grip');
  const hide = key => tile(key).querySelector('.wf-home-card-hide');
  const restore = key => byId('wfHomeHiddenSections').querySelectorAll('.wf-home-restore-section').find(el => el.getAttribute('aria-label') === text('show', doc.documentElement.lang, {name: text(key, doc.documentElement.lang)}));
  const emit = (target, type, values = {}) => { const event = new Event(type, {bubbles: true, ...values}); target.dispatchEvent(event); return event; };
  const order = () => grid.children.filter(el => el.dataset.homeSection).map(el => el.dataset.homeSection);
  return {
    doc, win, model, guards, writes, records, page, grid, cards, originals, controls, activations, byId, tile, grip, hide, restore, emit, order, toasts,
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

test('two native heading taps select then move the first card without capture retargeting or clearing its selection', () => {
  const f = uiFixture(); f.win.WFHomeCustomizer.open();
  nativeTap(f, 'welcome', 1);
  assert.equal(f.grip('welcome').getAttribute('aria-pressed'), 'true');
  assert.equal(f.grid.hasPointerCapture(1), false);
  nativeTap(f, 'rates', 2);
  assert.deepEqual(f.order(), ['sales', 'metrics', 'rates', 'welcome', 'recent', 'insights']);
  assert.equal(f.grip('welcome').getAttribute('aria-pressed'), 'false');
  assert.equal(f.grid.hasPointerCapture(2), false); assert.equal(f.grid.querySelector('.wf-home-drop-space'), null);
  assert.equal(f.writes.length, 0); assert.deepEqual(f.model.get(), defaults());
});

test('the same edge entry edits live cards inline and Escape restores their original nodes and focus', () => {
  const f = uiFixture(), edit = f.byId('wfHomeEdit'), toolbar = f.byId('wfHomeCustomizer'), actions = f.byId('wfHomeCustomizerActions');
  assert.equal(edit.tagName, 'SUMMARY'); assert.equal(toolbar.tagName, 'SECTION'); assert.equal(toolbar.parentNode, f.page);
  assert.equal(toolbar.nextSibling, f.grid); assert.equal(toolbar.hidden, true); assert.equal(actions.parentNode, f.doc.body); assert.equal(actions.hidden, true);
  assert.equal(f.doc.querySelector('[role="dialog"]'), null); assert.equal(f.byId('wfHomeDockBackdrop'), null);
  assert.equal(f.byId('wfHomeCustomizerAdvanced'), null); assert.equal(f.byId('wfHomeCustomizerMove'), null);
  edit.focus(); edit.click();
  assert(f.win.WFHomeCustomizer.isOpen()); assert.equal(f.doc.activeElement.id, 'wfHomeCustomizerTitle');
  assert(f.page.classList.contains('wf-home-editing')); assert(f.doc.documentElement.classList.contains('wf-home-editing'));
  assert.equal(actions.hidden, false); assert.equal(toolbar.hidden, false);
  for (const key of keys) { assert.equal(f.model.element(key), f.cards.get(key)); assert.equal(f.cards.get(key).parentNode, f.tile(key)); assert(f.cards.get(key).contains(f.controls.get(key))); }
  f.controls.get('welcome').click(); assert.equal(f.activations.get('welcome'), 1);
  assert.equal(f.writes.length, 0); assert.equal(f.guards.get('home-customizer')(), false);
  const escape = f.emit(toolbar, 'keydown', {key: 'Escape'}); assert(escape.defaultPrevented);
  assert.equal(f.win.WFHomeCustomizer.isOpen(), false); assert.equal(f.doc.activeElement, edit);
  assert.equal(f.doc.querySelectorAll('.wf-home-edit-shell').length, 0); assert.equal(f.doc.querySelectorAll('.wf-home-card-tools').length, 0);
  for (const key of keys) { assert.equal(f.cards.get(key).parentNode, f.grid); assert.equal(f.cards.get(key).classList.contains('wf-home-edit-card'), false); }
  assert.equal(f.page.classList.contains('wf-home-editing'), false); assert.equal(actions.hidden, true);
  assert.equal(f.page.style.getPropertyValue('--wf-home-edit-clearance'), ''); assert.deepEqual(f.order(), [...keys]);
});

test('tap selection reorders the actual card shells as a draft and Cancel restores the complete layout', () => {
  const f = uiFixture(); f.win.WFHomeCustomizer.open();
  const source = f.tile('welcome'), original = f.cards.get('welcome');
  f.grip('welcome').click(); assert(source.classList.contains('is-selected')); assert.equal(f.grip('welcome').getAttribute('aria-pressed'), 'true');
  f.grip('sales').click();
  assert.deepEqual(f.order(), ['sales', 'welcome', 'metrics', 'rates', 'recent', 'insights']);
  assert.equal(f.tile('welcome'), source); assert.equal(f.model.element('welcome'), original); assert.equal(f.doc.activeElement, f.grip('welcome'));
  assert.equal(source.classList.contains('is-selected'), false); assert.deepEqual(f.model.get(), defaults()); assert.equal(f.writes.length, 0);
  f.grip('rates').click(); f.grip('rates').click(); assert.equal(f.tile('rates').classList.contains('is-selected'), false);
  f.hide('recent').click(); f.tile('welcome').querySelector('.wf-home-card-width').click(); assert(f.guards.get('home-customizer')());
  f.byId('wfHomeCustomizerCancel').click();
  assert.deepEqual(f.preview, defaults()); assert.deepEqual(f.order(), [...keys]); assert.equal(f.cards.get('recent').hidden, false);
  assert.equal(f.cards.get('welcome').dataset.homeSize, 'normal'); assert.equal(f.writes.length, 0); assert.equal(f.guards.get('home-customizer')(), false);
});

test('keyboard reordering skips hidden sections, preserves focused controls and respects ends and repeat events', () => {
  const f = uiFixture(); f.win.WFHomeCustomizer.open(); f.hide('sales').click();
  const handle = f.grip('metrics'); handle.focus();
  const up = f.emit(handle, 'keydown', {key: 'ArrowUp', repeat: false}); assert(up.defaultPrevented);
  assert.equal(f.preview.order[0], 'metrics'); assert.equal(f.order()[0], 'metrics'); assert.equal(f.doc.activeElement, handle);
  f.emit(handle, 'keydown', {key: 'End'}); assert.equal(f.preview.order.at(-1), 'metrics');
  const last = [...f.preview.order]; f.emit(handle, 'keydown', {key: 'ArrowDown'}); assert.deepEqual(f.preview.order, last);
  f.emit(handle, 'keydown', {key: 'ArrowUp', repeat: true}); assert.deepEqual(f.preview.order, last);
  f.emit(handle, 'keydown', {key: 'Home'}); assert.equal(f.preview.order[0], 'metrics'); assert(f.preview.hidden.includes('sales'));
  assert.deepEqual(f.model.get(), defaults()); assert.equal(f.writes.length, 0);
  f.win.WFHomeCustomizer.close(); assert.deepEqual(f.preview, defaults()); assert.equal(f.doc.activeElement, f.byId('wfHomeEdit'));
});

test('a save error keeps the inline draft and original cards available until a successful localized retry', () => {
  const f = uiFixture(); f.win.WFHomeCustomizer.open(); f.hide('sales').click(); f.tile('welcome').querySelector('.wf-home-card-width').click();
  f.fail = true; f.byId('wfHomeCustomizerSave').click();
  const status = f.byId('wfHomeCustomizerStatus');
  assert(f.win.WFHomeCustomizer.isOpen()); assert.equal(status.hidden, false); assert.equal(status.textContent, text('error', 'ar'));
  assert(f.page.contains(status)); assert.equal(status.getAttribute('role'), 'alert'); assert.equal(status.scrollCalls.length, 1);
  assert.deepEqual(f.model.get(), defaults()); assert(f.guards.get('home-customizer')()); assert.equal(f.writes.length, 0);
  assert.equal(f.cards.get('sales').parentNode, f.tile('sales')); assert.equal(f.cards.get('sales').hidden, true);
  f.translate('fr'); assert.equal(status.textContent, text('error', 'fr')); assert.equal(f.byId('wfHomeCustomizer').dir, 'ltr');
  f.fail = false; f.byId('wfHomeCustomizerSave').click();
  assert.equal(f.win.WFHomeCustomizer.isOpen(), false); assert.deepEqual(f.model.get().hidden, ['sales']); assert.equal(f.model.get().sizes.welcome, 'wide');
  assert.equal(f.writes.length, 1); assert.equal(f.writes[0][0], storageKey); assert.equal(f.guards.get('home-customizer')(), false);
  assert.equal(f.cards.get('sales').parentNode, f.grid); assert.equal(f.cards.get('sales').inert, true);
  assert.equal(status.hidden, true); assert.equal(f.toasts[0][0], text('saved', 'fr'));
});

test('all sections can be hidden, saved and restored inline through the existing edge entry', () => {
  const f = uiFixture(); f.win.WFHomeCustomizer.open();
  for (const key of keys) f.hide(key).click();
  assert.equal(f.grid.hidden, true); assert.equal(f.byId('wfHomeLayoutEmpty').hidden, false); assert.equal(f.byId('wfHomeHiddenSections').hidden, false);
  for (const key of keys) { assert.equal(f.restore(key).hidden, false); assert.equal(f.cards.get(key).inert, true); }
  f.byId('wfHomeCustomizerSave').click(); assert.equal(f.model.get().hidden.length, 6); assert.equal(f.grid.hidden, true);
  f.byId('wfHomeEdit').click(); f.restore('metrics').click();
  assert.equal(f.grid.hidden, false); assert.equal(f.byId('wfHomeLayoutEmpty').hidden, true); assert.equal(f.cards.get('metrics').hidden, false);
  assert.equal(f.doc.activeElement, f.grip('metrics')); assert.equal(f.restore('metrics').hidden, true);
  f.byId('wfHomeCustomizerSave').click();
  assert.equal(f.model.get().hidden.length, 5); assert(!f.model.get().hidden.includes('metrics'));
  assert.equal(f.cards.get('metrics').parentNode, f.grid); assert(f.cards.get('metrics').contains(f.originals.get('metrics')));
});

test('width and reset controls preview changes without persisting until Save', () => {
  const f = uiFixture(); f.win.WFHomeCustomizer.open();
  const width = f.tile('welcome').querySelector('.wf-home-card-width'); width.click();
  assert.equal(f.preview.sizes.welcome, 'wide'); assert.equal(f.tile('welcome').dataset.homeSize, 'wide'); assert.equal(width.getAttribute('aria-pressed'), 'true');
  assert.equal(f.model.get().sizes.welcome, 'normal'); assert.equal(f.writes.length, 0);
  f.byId('wfHomeCustomizerSave').click(); assert.equal(f.model.get().sizes.welcome, 'wide');
  f.win.WFHomeCustomizer.open(); f.byId('wfHomeCustomizerReset').click();
  assert.deepEqual(f.preview, defaults()); assert.equal(f.model.get().sizes.welcome, 'wide'); assert.equal(f.writes.length, 1);
  f.byId('wfHomeCustomizerCancel').click(); assert.equal(f.cards.get('welcome').dataset.homeSize, 'wide');
});

test('ordinary card touches do not drag and a handle tap remains a tap until the movement threshold is crossed', () => {
  const f = uiFixture(); f.win.WFHomeCustomizer.open();
  f.emit(f.controls.get('welcome'), 'pointerdown', {pointerId: 1, button: 0, isPrimary: true, clientX: 100, clientY: 150});
  f.emit(f.win, 'pointermove', {pointerId: 1, clientX: 100, clientY: 300});
  assert.equal(f.grid.querySelector('.wf-home-drop-space'), null); assert.equal(f.grid.hasPointerCapture(1), false);
  f.emit(f.grip('welcome'), 'pointerdown', {pointerId: 2, button: 0, isPrimary: true, clientX: 100, clientY: 130});
  const small = f.emit(f.win, 'pointermove', {pointerId: 2, clientX: 102, clientY: 133}); assert.equal(!!small.defaultPrevented, false);
  assert.equal(f.grid.querySelector('.wf-home-drop-space'), null);
  f.emit(f.win, 'pointerup', {pointerId: 2, clientX: 102, clientY: 133}); f.grip('welcome').click(1);
  assert(f.tile('welcome').classList.contains('is-selected')); assert.equal(f.grid.hasPointerCapture(2), false); assert.deepEqual(f.preview.order, [...keys]);
});

test('a finger drag moves the real section, commits only the draft and suppresses its trailing click', () => {
  const f = uiFixture(); f.win.WFHomeCustomizer.open(); const shell = f.tile('welcome'), card = f.cards.get('welcome');
  startDrag(f);
  assert(shell.classList.contains('is-dragging')); assert.equal(card.parentNode, shell); assert.equal(shell.parentNode, f.grid);
  assert.equal(f.grid.querySelectorAll('.wf-home-drop-space').length, 1); assert.equal(f.doc.querySelector('.wf-home-drag-ghost'), null);
  assert.equal(f.grid.querySelector('.wf-home-drop-space').style.height, '110px'); assert.equal(f.guards.get('home-customizer')(), true);
  f.emit(f.win, 'pointerup', {pointerId: 1, clientX: 110, clientY: 805});
  assert.equal(f.preview.order.at(-1), 'welcome'); assert.equal(f.order().at(-1), 'welcome'); assert.equal(f.tile('welcome'), shell);
  assert.equal(f.grid.querySelector('.wf-home-drop-space'), null); assert.equal(shell.classList.contains('is-dragging'), false);
  assert.equal(shell.getAttribute('style'), null); assert.equal(f.grid.hasPointerCapture(1), false); assert.equal(f.doc.activeElement, f.grip('welcome'));
  assert.deepEqual(f.model.get().order, [...keys]); assert.equal(f.writes.length, 0);
  const click = f.emit(f.hide('welcome'), 'click', {detail: 1}); assert(click.defaultPrevented); assert.deepEqual(f.preview.hidden, []);
  f.advance(401); f.hide('welcome').click(1); assert(f.preview.hidden.includes('welcome'));
});

test('transferring implicit touch capture from the heading to the layout does not cancel the active drag', () => {
  const f = uiFixture(); f.win.WFHomeCustomizer.open();
  const handle = f.grip('welcome'), shell = f.tile('welcome');
  // Touch starts with implicit capture on the touched heading. The first move
  // activates the drag, and the following event transfers capture to layout.
  handle.setPointerCapture(1);
  f.emit(handle, 'pointerdown', {pointerId: 1, pointerType: 'touch', button: 0, isPrimary: true, clientX: 100, clientY: 130});
  f.emit(f.win, 'pointermove', {pointerId: 1, pointerType: 'touch', target: handle, clientX: 110, clientY: 805});
  assert(shell.classList.contains('is-dragging')); assert(f.grid.hasPointerCapture(1));
  handle.releasePointerCapture(1);
  const lost = f.emit(handle, 'lostpointercapture', {pointerId: 1, pointerType: 'touch'});
  assert.equal(lost.target, handle);
  assert(shell.classList.contains('is-dragging')); assert(f.grid.hasPointerCapture(1));
  assert.equal(f.grid.querySelectorAll('.wf-home-drop-space').length, 1);
  f.emit(f.grid, 'gotpointercapture', {pointerId: 1, pointerType: 'touch'}); f.frame();
  f.emit(f.win, 'pointerup', {pointerId: 1, pointerType: 'touch', target: f.grid, clientX: 110, clientY: 805});
  assert.equal(f.order().at(-1), 'welcome'); assert.equal(f.grid.querySelector('.wf-home-drop-space'), null);
  assert.equal(f.grid.hasPointerCapture(1), false); assert.equal(f.writes.length, 0);
});

test('interrupted drags restore styles and leave no placeholder, capture or partial order', async t => {
  const cancellations = {
    pointercancel: f => f.emit(f.win, 'pointercancel', {pointerId: 1, clientX: 110, clientY: 805}),
    lostcapture: f => f.emit(f.grid, 'lostpointercapture', {pointerId: 1}),
    blur: f => f.emit(f.win, 'blur'),
    resize: f => f.emit(f.win, 'resize'),
    secondPointer: f => f.emit(f.grip('sales'), 'pointerdown', {pointerId: 2, button: 0, isPrimary: false, clientX: 100, clientY: 250}),
    hiddenDocument: f => { f.doc.hidden = true; f.emit(f.doc, 'visibilitychange'); },
    escape: f => f.emit(f.grip('welcome'), 'keydown', {key: 'Escape'})
  };
  for (const [name, interrupt] of Object.entries(cancellations)) await t.test(name, () => {
    const f = uiFixture(); f.win.WFHomeCustomizer.open(); const shell = f.tile('welcome');
    shell.setAttribute('style', '--original: retained;'); const originalStyle = shell.getAttribute('style'); f.doc.scrollingElement.style.scrollBehavior = 'smooth';
    startDrag(f); assert.equal(f.doc.scrollingElement.style.scrollBehavior, 'auto'); interrupt(f);
    assert(f.win.WFHomeCustomizer.isOpen()); assert.equal(shell.classList.contains('is-dragging'), false);
    assert.equal(f.grid.querySelector('.wf-home-drop-space'), null); assert.equal(f.grid.hasPointerCapture(1), false);
    assert.equal(shell.getAttribute('style'), originalStyle); assert.equal(f.doc.scrollingElement.style.scrollBehavior, 'smooth');
    assert.deepEqual(f.order(), [...keys]); assert.deepEqual(f.preview, defaults()); assert.equal(f.writes.length, 0); assert.equal(f.guards.get('home-customizer')(), false);
    f.byId('wfHomeCustomizerCancel').click(); assert.equal(f.doc.querySelector('.wf-home-edit-shell'), null); assert.equal(f.doc.querySelector('.wf-home-drop-space'), null);
  });
});

test('edge scrolling uses the actual page scroller and the action bar stays above the navigation circle', () => {
  const f = uiFixture(); f.page.overflowY = 'auto'; f.page.scrollHeight = 2000; f.page.clientHeight = 600;
  f.win.WFHomeCustomizer.open();
  const actions = f.byId('wfHomeCustomizerActions');
  assert.equal(actions.style.getPropertyValue('--wf-home-actions-bottom'), '98px');
  assert.equal(actions.style.getPropertyValue('--wf-home-actions-width'), '366px');
  assert.equal(f.page.style.getPropertyValue('--wf-home-edit-clearance'), '180px');
  startDrag(f); f.frame();
  assert(f.page.scrollTop > 0); assert.equal(f.doc.scrollingElement.scrollTop, 0);
  f.emit(f.win, 'pointercancel', {pointerId: 1, clientX: 110, clientY: 805});
  assert.equal(f.grid.querySelector('.wf-home-drop-space'), null); assert.deepEqual(f.model.get(), defaults());
});

test('editor actions stay above a shortened visual viewport and follow its scroll offset', () => {
  const f = uiFixture({viewport: {height: 400}}); f.win.WFHomeCustomizer.open();
  const actions = f.byId('wfHomeCustomizerActions');
  assert.equal(actions.style.getPropertyValue('--wf-home-actions-bottom'), '412px');
  assert.equal(actions.getBoundingClientRect().bottom, 388, 'fixed CSS bottom is measured from the 800 px layout viewport');
  f.win.visualViewport.offsetTop = 100; f.emit(f.win.visualViewport, 'scroll'); f.frame();
  assert.equal(actions.style.getPropertyValue('--wf-home-actions-bottom'), '312px');
  assert.equal(actions.getBoundingClientRect().bottom, 488, 'visual viewport panning moves the footer without a window resize');
});

test('editor actions avoid only navigation controls that intersect the visual viewport', () => {
  const f = uiFixture({viewport: {height: 400}}); f.win.WFHomeCustomizer.open();
  const nav = f.byId('bottomNav'), circle = f.byId('bnavCircle'), actions = f.byId('wfHomeCustomizerActions');
  nav.rect = {left: 0, top: 380, right: 390, bottom: 450};
  circle.rect = {left: 160, top: 360, right: 230, bottom: 430};
  f.emit(f.win.visualViewport, 'resize'); f.frame();
  assert.equal(actions.getBoundingClientRect().bottom, 352, 'visible circle has an eight pixel clearance');
  nav.rect = {left: 450, top: 380, right: 840, bottom: 450};
  circle.rect = {left: 610, top: 360, right: 680, bottom: 430};
  f.emit(f.win.visualViewport, 'scroll'); f.frame();
  assert.equal(actions.getBoundingClientRect().bottom, 388, 'offscreen navigation must not displace the footer');
});
