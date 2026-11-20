const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {createSession, moveOrder, dropTarget, copy, text} = require('../home-customizer.js');
const {keys, defaults, normalize, createModel, storageKey} = require('../home-layout.js');

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

// Exercise editor transactions and controls through the dock's public contract.
// The dock's pointer/viewport behavior has its own tests and browser checks.
function uiFixture() {
  let doc, fail = false, preview, frame = 0;
  const writes = [], guards = new Map(), observers = [], frames = new Map(), toasts = [];
  class Event {
    constructor(type, values = {}) { this.type = type; this.detail = 0; Object.assign(this, values); }
    preventDefault() { this.defaultPrevented = true; }
    stopPropagation() { this.stopped = true; }
    stopImmediatePropagation() { this.stopped = this.immediate = true; }
  }
  class Element {
    constructor(tag) { this.tagName = tag.toUpperCase(); this.children = []; this.listeners = []; this.attributes = new Map(); this.dataset = {}; this.style = {}; this.className = ''; this.hidden = false; this.scrollTop = 0; this.open = false; }
    get classList() { const self = this; return {add(...values) { self.className = [...new Set([...self.className.split(' ').filter(Boolean), ...values])].join(' '); }, remove(...values) { self.className = self.className.split(' ').filter(value => !values.includes(value)).join(' '); }, contains(value) { return self.className.split(' ').includes(value); }}; }
    set textContent(value) { this._text = String(value); this.replaceChildren(); }
    get textContent() { return (this._text || '') + this.children.map(child => child.textContent || '').join(''); }
    setAttribute(key, value) { this.attributes.set(key, String(value)); if (key === 'id') this.id = String(value); }
    getAttribute(key) { return this.attributes.get(key) ?? null; }
    get firstChild() { return this.children[0] || null; }
    get isConnected() { return this === doc || !!this.parentNode?.isConnected; }
    append(...nodes) { for (const child of nodes) { child.remove(); child.parentNode = this; this.children.push(child); } }
    insertBefore(child, reference) { if (child === reference) return; child.remove(); const index = reference ? this.children.indexOf(reference) : this.children.length; this.children.splice(index < 0 ? this.children.length : index, 0, child); child.parentNode = this; }
    remove() { if (!this.parentNode) return; const siblings = this.parentNode.children; siblings.splice(siblings.indexOf(this), 1); this.parentNode = null; }
    replaceChildren(...nodes) { for (const child of this.children) child.parentNode = null; this.children = []; this.append(...nodes); }
    contains(target) { for (let at = target; at; at = at.parentNode) if (at === this) return true; return false; }
    matches(selector) { return selector.startsWith('#') ? this.id === selector.slice(1) : selector.startsWith('.') ? this.classList.contains(selector.slice(1)) : this.tagName === selector.toUpperCase(); }
    closest(selector) { for (let at = this; at; at = at.parentNode) if (at.matches(selector)) return at; return null; }
    querySelector(selector) { for (const child of this.children) { if (child.matches(selector)) return child; const found = child.querySelector(selector); if (found) return found; } return null; }
    addEventListener(type, listener, options = false) { this.listeners.push({type, listener, capture: options === true || !!options.capture}); }
    dispatchEvent(event) {
      event.target ||= this;
      const parents = []; for (let at = this.parentNode; at; at = at.parentNode) parents.push(at);
      const invoke = (element, capture) => { for (const item of element.listeners) if (item.type === event.type && item.capture === capture) { item.listener(event); if (event.immediate) break; } };
      for (const parent of [...parents].reverse()) { invoke(parent, true); if (event.stopped) return; }
      invoke(this, true); if (!event.immediate) invoke(this, false);
      if (event.bubbles && !event.stopped) for (const parent of parents) { invoke(parent, false); if (event.stopped) break; }
      return !event.defaultPrevented;
    }
    click(detail = 0) { this.dispatchEvent(new Event('click', {bubbles: true, detail})); }
    focus() { doc.activeElement = this; }
    showModal() { this.open = true; }
    close() { this.open = false; this.dispatchEvent(new Event('close')); }
    setPointerCapture() {} releasePointerCapture() {}
    getBoundingClientRect() { return this.rect || {left: 0, right: 800, top: 80, bottom: 600}; }
  }
  doc = new Element('document'); doc.createElement = tag => new Element(tag); doc.getElementById = id => doc.querySelector('#' + id);
  doc.documentElement = new Element('html'); doc.documentElement.lang = 'ar'; doc.append(doc.documentElement);
  doc.body = new Element('body'); doc.documentElement.append(doc.body); doc.activeElement = doc.body;
  const page = new Element('section'); page.id = 'page-dashboard'; doc.body.append(page);
  const grid = new Element('div'); grid.id = 'wfHomeLayout'; page.append(grid);
  const win = new Element('window'); win.innerWidth = 1000; win.innerHeight = 800;
  const storage = {getItem: () => null, setItem(key, value) { if (fail) throw Error('Storage full'); writes.push([key, value]); }};
  const model = {...createModel(storage, prefs => { preview = prefs; }, detail => win.dispatchEvent(new Event('wf-home-layout-change', {detail}))), defaults, normalize, keys};
  win.WFHomeLayout = model;
  win.WFAppUpdates = {registerGuard: (name, guard) => guards.set(name, guard)};
  win.showToast = (...args) => toasts.push(args);
  win.requestAnimationFrame = callback => { frames.set(++frame, callback); return frame; };
  win.cancelAnimationFrame = id => frames.delete(id);
  win.WFHomeDock = {create({panel, onOpen, onClose}) {
    const menu = new Element('details'), trigger = new Element('summary');
    menu.id = 'wfHomeDock'; menu.className = 'dash-visibility'; trigger.id = 'wfHomeEdit';
    trigger.setAttribute('aria-controls', panel.id); trigger.setAttribute('aria-expanded', 'false');
    menu.append(trigger, panel); doc.body.append(menu);
    const api = {
      menu, trigger, isOpen: () => menu.open,
      open() { if (menu.open) return true; menu.open = true; trigger.setAttribute('aria-expanded', 'true'); onOpen(); return true; },
      close(returnFocus = false) { if (!menu.open) return false; menu.open = false; trigger.setAttribute('aria-expanded', 'false'); onClose({returnFocus}); if (returnFocus) trigger.focus(); return true; },
      swapSide() { menu.dataset.side = menu.dataset.side === 'right' ? 'left' : 'right'; },
      reposition() {}
    };
    trigger.addEventListener('click', () => api.isOpen() ? api.close(true) : api.open());
    doc.addEventListener('keydown', event => { if (event.key === 'Escape' && menu.open) { event.preventDefault(); api.close(true); } });
    return api;
  }};
  const context = vm.createContext({window: win, document: doc, Intl, Date, MutationObserver: class { constructor(callback) { observers.push(callback); } observe() {} }});
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../home-customizer.js'), 'utf8'), context);
  const byId = id => doc.getElementById(id), tile = key => [...byId('wfHomeCustomizer').querySelector('.wf-home-editor-grid').children].find(card => card.dataset.section === key);
  const emit = (target, type, values = {}) => { const event = new Event(type, {bubbles: true, ...values}); target.dispatchEvent(event); return event; };
  return {doc, win, model, guards, writes, page, grid, byId, tile, emit, toasts, get preview() { return preview; }, set fail(value) { fail = value; }, translate(lang) { doc.documentElement.lang = lang; observers.forEach(callback => callback()); }};
}

test('the original edge entry opens a compact nonmodal panel without adding a home toolbar; Escape cancels and restores focus', () => {
  const f = uiFixture(), edit = f.byId('wfHomeEdit'), dialog = f.byId('wfHomeCustomizer');
  assert.equal(f.byId('wfHomeToolbar'), null); assert(!f.page.contains(edit));
  assert.equal(edit.tagName, 'SUMMARY'); assert.equal(dialog.tagName, 'DIV'); assert.equal(dialog.getAttribute('role'), 'dialog');
  edit.focus(); edit.click(); assert.equal(f.win.WFHomeCustomizer.isOpen(), true); assert.equal(f.doc.activeElement.id, 'wfHomeCustomizerTitle');
  assert.equal(f.doc.documentElement.classList.contains('wf-home-customizer-open'), false);
  const control = f.tile('welcome').querySelector('.wf-home-visibility'); f.emit(control, 'change');
  assert(f.preview.hidden.includes('welcome')); assert(f.guards.get('home-customizer')());
  const escape = f.emit(dialog, 'keydown', {key: 'Escape'}); assert(escape.defaultPrevented);
  assert.equal(f.win.WFHomeCustomizer.isOpen(), false); assert.deepEqual(f.preview, defaults()); assert.equal(f.writes.length, 0);
  assert.equal(f.doc.activeElement, edit); assert.equal(f.guards.get('home-customizer')(), false);
});

test('the visible save error retains the compact panel, draft and guard until retry succeeds', () => {
  const f = uiFixture(); f.win.WFHomeCustomizer.open();
  f.emit(f.tile('sales').querySelector('.wf-home-visibility'), 'change'); f.fail = true;
  f.byId('wfHomeCustomizerSave').click(); assert(f.win.WFHomeCustomizer.isOpen());
  const status = f.byId('wfHomeCustomizerStatus'); assert.equal(status.hidden, false); assert.equal(status.textContent, text('error', 'ar'));
  assert(f.byId('wfHomeCustomizer').querySelector('.dash-dock-layout').contains(status));
  assert(!f.byId('wfHomeCustomizer').querySelector('.wf-home-editor-footer').contains(status));
  assert.deepEqual(f.model.get(), defaults()); assert(f.guards.get('home-customizer')());
  f.translate('fr'); assert.equal(status.textContent, text('error', 'fr'));
  f.fail = false; f.byId('wfHomeCustomizerSave').click();
  assert.equal(f.win.WFHomeCustomizer.isOpen(), false); assert.deepEqual(f.model.get().hidden, ['sales']);
  assert.equal(f.writes.length, 1); assert.equal(f.guards.get('home-customizer')(), false);
});

test('the editor can save all-hidden and recover sections through the original edge entry', () => {
  const f = uiFixture(); f.win.WFHomeCustomizer.open();
  for (const key of keys) f.emit(f.tile(key).querySelector('.wf-home-visibility'), 'change');
  const empty = f.byId('wfHomeCustomizer').querySelector('.wf-home-editor-empty'); assert.equal(empty.hidden, false);
  f.byId('wfHomeCustomizerSave').click(); assert.equal(f.model.get().hidden.length, 6);
  f.byId('wfHomeEdit').click(); f.emit(f.tile('metrics').querySelector('.wf-home-visibility'), 'change');
  assert.equal(empty.hidden, true); f.byId('wfHomeCustomizerSave').click();
  assert(!f.model.get().hidden.includes('metrics')); assert.equal(f.model.get().hidden.length, 5);
});

test('keyboard movement keeps a stable focused control and does not write preferences', () => {
  const f = uiFixture(); f.win.WFHomeCustomizer.open();
  f.byId('wfHomeCustomizerAdvanced').click();
  const handle = f.tile('sales').querySelector('.wf-home-drag-handle'); handle.focus();
  const event = f.emit(handle, 'keydown', {key: 'ArrowUp', repeat: false});
  assert(event.defaultPrevented); assert.equal(f.preview.order[0], 'sales'); assert.equal(f.doc.activeElement, handle);
  f.emit(handle, 'keydown', {key: 'ArrowUp', repeat: false}); assert.equal(f.preview.order[0], 'sales');
  assert.deepEqual(f.model.get(), defaults()); assert.equal(f.writes.length, 0);
  f.byId('wfHomeCustomizerClose').click(); assert.equal(f.win.WFHomeCustomizer.isOpen(), false); assert.deepEqual(f.preview, defaults());
});

test('pointer dragging uses its handle, shows a drop marker, commits only the preview and suppresses a trailing click', () => {
  const f = uiFixture(); f.win.WFHomeCustomizer.open();
  f.byId('wfHomeCustomizerAdvanced').click();
  for (const [index, key] of keys.entries()) f.tile(key).rect = {left: 0, right: 400, top: 100 + index * 120, bottom: 210 + index * 120};
  const handle = f.tile('welcome').querySelector('.wf-home-drag-handle');
  f.emit(handle, 'pointerdown', {pointerId: 1, button: 0, isPrimary: true, clientX: 100, clientY: 130});
  f.emit(f.win, 'pointermove', {pointerId: 1, clientX: 120, clientY: 805});
  assert(f.doc.body.querySelector('.wf-home-drag-ghost'));
  assert(f.tile('insights').classList.contains('is-drop-after'));
  f.emit(f.win, 'pointerup', {pointerId: 1, clientX: 120, clientY: 805});
  assert.equal(f.preview.order[5], 'welcome'); assert.equal(f.writes.length, 0); assert.deepEqual(f.model.get().order, [...keys]);
  assert.equal(f.doc.body.querySelector('.wf-home-drag-ghost'), null);
  const click = f.emit(f.tile('welcome').querySelector('.wf-home-visibility'), 'click', {detail: 1});
  assert(click.defaultPrevented); assert.deepEqual(f.preview.hidden, []);
});

test('the simple checkbox list reveals ordering and width controls on demand and keeps preview edits until Save', () => {
  const f = uiFixture(); f.win.WFHomeCustomizer.open();
  const advanced = f.byId('wfHomeCustomizerAdvanced'), controls = f.tile('welcome').querySelector('.wf-home-section-controls');
  assert.equal(advanced.getAttribute('aria-expanded'), 'false'); assert.equal(controls.hidden, true);
  assert.equal(f.tile('welcome').querySelector('.wf-home-visibility').type, 'checkbox');
  assert.equal(f.tile('welcome').querySelector('.wf-home-visibility').checked, true);
  assert.equal(f.tile('welcome').querySelector('.wf-home-section-preview'), null);
  advanced.click(); assert.equal(controls.hidden, false); assert.equal(advanced.getAttribute('aria-expanded'), 'true');
  f.tile('welcome').querySelector('.wf-home-width-options').children[1].click();
  assert.equal(f.preview.sizes.welcome, 'wide'); assert.equal(f.model.get().sizes.welcome, 'normal');
  advanced.click(); assert.equal(controls.hidden, true); assert.equal(f.preview.sizes.welcome, 'wide');
  f.byId('wfHomeCustomizerSave').click(); assert.equal(f.model.get().sizes.welcome, 'wide');
});

test('the old swap-side control does not discard a layout draft', () => {
  const f = uiFixture(); f.win.WFHomeCustomizer.open();
  f.emit(f.tile('recent').querySelector('.wf-home-visibility'), 'change');
  f.byId('wfHomeCustomizerMove').click();
  assert.equal(f.byId('wfHomeDock').dataset.side, 'right'); assert(f.preview.hidden.includes('recent')); assert(f.win.WFHomeCustomizer.isOpen());
  assert.equal(f.writes.length, 0);
});
