const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// Execute both complete UI modules. Only the browser surface and storage I/O
// are substituted; save, validation, draft and cancel handlers stay real.
function fixture(module) {
  let document, saved, writeBarrier, releaseWrite, failWrite = false;
  const writes = [], notifications = [];
  class Event {
    constructor(type, options = {}) { this.type = type; Object.assign(this, options); }
    preventDefault() { this.defaultPrevented = true; }
  }
  class Element {
    constructor(tag) { this.tagName = tag.toUpperCase(); this.children = []; this.parentNode = null; this.attributes = new Map(); this.dataset = {}; this.style = {}; this.className = ''; this.value = ''; this.disabled = false; this.hidden = false; this.listeners = new Map(); }
    get classList() { const self = this; return {contains: value => self.className.split(' ').includes(value), add(...values) { self.className = [...new Set([...self.className.split(' ').filter(Boolean), ...values])].join(' '); }, remove(value) { self.className = self.className.split(' ').filter(item => item !== value).join(' '); }, toggle(value, force) { const enabled = force ?? !this.contains(value); enabled ? this.add(value) : this.remove(value); return enabled; }}; }
    get isConnected() { return this === document || !!this.parentNode?.isConnected; }
    get firstElementChild() { return this.children[0] || null; }
    get firstChild() { return this.children[0] || null; }
    get parentElement() { return this.parentNode; }
    set textContent(value) { this._text = String(value); this.replaceChildren(); }
    get textContent() { return (this._text || '') + this.children.map(child => child.textContent || '').join(''); }
    append(...nodes) { for (const node of nodes) { node.remove(); node.parentNode = this; this.children.push(node); } }
    replaceChildren(...nodes) { for (const node of this.children) node.parentNode = null; this.children = []; this.append(...nodes); }
    remove() { if (!this.parentNode) return; this.parentNode.children = this.parentNode.children.filter(node => node !== this); this.parentNode = null; }
    setAttribute(name, value) { this.attributes.set(name, String(value)); if (['id', 'type', 'class'].includes(name)) this[name === 'class' ? 'className' : name] = String(value); }
    getAttribute(name) { if (name.startsWith('data-')) return this.dataset[name.slice(5).replace(/-([a-z])/g, (_, char) => char.toUpperCase())] ?? null; return this.attributes.get(name) ?? this[name] ?? null; }
    removeAttribute(name) { this.attributes.delete(name); }
    matches(selector) {
      if (selector === ':disabled') { for (let current = this; current; current = current.parentNode) if (current.disabled && (current === this || current.tagName === 'FIELDSET')) return true; return false; }
      const pieces = selector.trim().split(/\s+(?![^\[]*\])/);
      if (pieces.length > 1) { if (!this.matches(pieces.pop())) return false; let current = this.parentNode; while (pieces.length) { const part = pieces.pop(); if (part === '>') continue; while (current && !current.matches(part)) current = current.parentNode; if (!current) return false; current = current.parentNode; } return true; }
      if (selector.startsWith('#')) return this.id === selector.slice(1);
      if (selector.startsWith('.')) return selector.slice(1).split('.').every(value => this.classList.contains(value));
      const attr = /^(\w+)?\[([^=\]^]+)(\^?=)?"?([^"\]]*)"?\]$/.exec(selector);
      if (attr) { const value = this.getAttribute(attr[2]); return (!attr[1] || this.tagName === attr[1].toUpperCase()) && (attr[3] === '^=' ? String(value || '').startsWith(attr[4]) : attr[3] === '=' ? value === attr[4] : value != null); }
      return this.tagName === selector.toUpperCase();
    }
    closest(selector) { for (let current = this; current; current = current.parentNode) if (current.matches(selector)) return current; return null; }
    querySelectorAll(selector) { const result = []; for (const child of this.children) { if (child.matches(selector)) result.push(child); result.push(...child.querySelectorAll(selector)); } return result; }
    querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
    addEventListener(type, listener) { const listeners = this.listeners.get(type) || []; listeners.push(listener); this.listeners.set(type, listeners); }
    dispatchEvent(event) { event.target ??= this; this.pendingEvents = Promise.all((this.listeners.get(event.type) || []).map(listener => listener.call(this, event))); return !event.defaultPrevented; }
    async click() { if (this.matches(':disabled')) return; const event = new Event('click'); this.dispatchEvent(event); await this.pendingEvents; if (this.type === 'submit' && !event.defaultPrevented) { const form = this.closest('form'); if (form?.reportValidity()) { form.dispatchEvent(new Event('submit')); await form.pendingEvents; } } }
    reportValidity() { return !this.querySelectorAll('input').some(input => input.required && !input.value); }
    focus() { document.activeElement = this; }
  }
  document = new Element('document'); document.documentElement = new Element('html'); document.documentElement.lang = 'en'; document.documentElement.dir = 'ltr'; document.append(document.documentElement);
  document.body = new Element('body'); document.documentElement.append(document.body); document.baseURI = 'https://example.test/'; document.activeElement = document.body;
  document.createElement = tag => new Element(tag); document.getElementById = id => document.querySelector('#' + id);
  const make = (tag, id, parent = document.body, className = '') => { const node = new Element(tag); node.id = id; node.className = className; parent.append(node); return node; };
  const page = make('section', 'page-settings', document.body, 'active');
  const workspace = make('div', 'workspace', page, 'wf-settings-workspace'), tabs = make('div', 'tabs', workspace, 'tabs');
  const host = make('dialog', 'wfSettingsDialog', workspace); host.open = true;
  const content = make('div', 'content', host, 'wf-settings-content');
  const state = {lang: 'en', settings: {companyName: 'Unrelated company',
    appIdentity: {version: 1, name: 'Saved app', logo: 'data:image/png;base64,iVBORw0KGgo=', installIcon: '', installIconMode: 'default'},
    productCategories: {version: 1, categories: [{id: 'wfcat_chairs', name: 'Chairs', labels: {en: 'Chairs', ar: 'كراسي'}, descriptions: {en: 'Stored description'}, image: 'https://example.test/chairs.jpg', archived: false}]}}, products: [], invoices: []};
  saved = structuredClone(state.settings);
  const window = new Element('window');
  window.addEventListener('wf-settings-actions-change', event => notifications.push(event));
  window.switchTab = key => { for (const panel of content.children) panel.style.display = panel.id === 'stab-' + key ? 'block' : 'none'; for (const tab of tabs.children) tab.classList.toggle('active', tab.id === 'wf-settings-tab-' + key); };
  window.loadSettingsToForm = () => {}; window.applyTr = () => {};
  window.WF_CATEGORY_IMAGES = {coffee_table: '', dresser: '', side_table: '', tv_table: ''};
  const context = {window, document, S: state, Event, CustomEvent: Event, URL, Intl, queueMicrotask,
    MutationObserver: class { observe() {} disconnect() {} },
    dbGet: async () => structuredClone(saved), dbPut: async (store, row) => { if (writeBarrier) await writeBarrier; if (failWrite) throw Error('QuotaExceededError'); saved = structuredClone(row); writes.push({store, row: structuredClone(row)}); }};
  vm.runInNewContext(fs.readFileSync(path.resolve(__dirname, '..', module + '.js'), 'utf8'), context);
  const api = () => window[module === 'app-identity' ? 'WFAppIdentity' : 'WFProductCategories'];
  return {window, document, state, page, host, writes, notifications, api,
    byId: id => document.getElementById(id), select: key => window.switchTab(key),
    async change(input, value, type = 'input') { input.value = value; input.dispatchEvent(new Event(type)); await input.pendingEvents; },
    editCategory() { return document.querySelectorAll('.wf-category-edit').find(button => button.textContent.includes('Chairs')).click(); },
    blockWrite() { writeBarrier = new Promise(resolve => { releaseWrite = resolve; }); },
    releaseWrite() { writeBarrier = null; releaseWrite(); }, set failWrite(value) { failWrite = value; }};
}
const tick = async () => { for (let n = 0; n < 12; n++) await Promise.resolve(); };

test('app identity actions follow visibility and use real draft rollback without writing', async () => {
  const f = fixture('app-identity');
  assert.equal(typeof f.api().getSettingsActions, 'function');
  assert.equal(f.api().getSettingsActions(), null);
  f.select('app-identity');
  let actions = f.api().getSettingsActions();
  assert.equal(actions.key, 'app-identity'); assert.equal(actions.scope.id, 'stab-app-identity'); assert.equal(actions.dirty, false); assert.equal(actions.busy, false);
  assert.equal(actions.save, f.document.querySelector('.wf-app-identity-actions').querySelector('button[type="submit"]'));
  assert.equal(actions.cancel, f.document.querySelector('.wf-app-identity-actions').querySelector('button[type="button"]'));
  await f.change(f.byId('wfAppIdentityName'), 'Changed app'); assert.equal(f.api().getSettingsActions().dirty, true);
  await f.change(f.byId('wfAppIdentityName'), '  Saved app  '); assert.equal(f.api().getSettingsActions().dirty, false);
  await f.change(f.byId('wfAppIdentityName'), ''); assert.equal(f.api().getSettingsActions().dirty, true, 'invalid empty drafts still require cancel or correction');
  await actions.cancel.click(); assert.equal(f.byId('wfAppIdentityName').value, 'Saved app'); assert.equal(f.api().getSettingsActions().dirty, false); assert.equal(f.writes.length, 0);
  await f.document.querySelector('.wf-app-identity-card').querySelector('button').click(); assert.equal(f.api().getSettingsActions().dirty, true, 'resetting a saved logo changes the image draft');
  await actions.cancel.click(); assert.equal(f.api().getSettingsActions().dirty, false);
  f.host.open = false; assert.equal(f.api().getSettingsActions(), null);
  f.host.open = true; f.page.classList.remove('active'); assert.equal(f.api().getSettingsActions(), null);
});

test('app identity adapter stays busy during a write and preserves failed edits for retry', async () => {
  const f = fixture('app-identity'); assert.equal(typeof f.api().getSettingsActions, 'function'); f.select('app-identity');
  await f.change(f.byId('wfAppIdentityName'), 'Updated identity'); f.failWrite = true; f.blockWrite();
  const pending = f.api().getSettingsActions().save.click(); await tick();
  let actions = f.api().getSettingsActions(); assert.equal(actions.busy, true); assert.equal(actions.dirty, true); assert.equal(actions.save.matches(':disabled'), true); assert.equal(actions.cancel.matches(':disabled'), true); assert.equal(f.state.settings.appIdentity.name, 'Saved app');
  f.releaseWrite(); await pending;
  actions = f.api().getSettingsActions(); assert.equal(actions.busy, false); assert.equal(actions.dirty, true); assert.equal(f.byId('wfAppIdentityName').value, 'Updated identity'); assert.equal(f.writes.length, 0);
  const before = f.notifications.length; f.failWrite = false; await actions.save.click();
  assert.equal(f.api().getSettingsActions().dirty, false); assert.equal(f.state.settings.appIdentity.name, 'Updated identity'); assert.equal(f.state.settings.companyName, 'Unrelated company'); assert.equal(f.writes.length, 1); assert(f.notifications.length > before, 'async completion notifies the common menu');
});

test('category actions compare translated names and image drafts and reuse the original cancel', async () => {
  const f = fixture('product-categories'); assert.equal(typeof f.api().getSettingsActions, 'function'); assert.equal(f.api().getSettingsActions(), null); f.select('product-categories');
  let actions = f.api().getSettingsActions(); assert.equal(actions.key, 'product-categories:new'); assert.equal(actions.scope.id, 'stab-product-categories'); assert.equal(actions.dirty, false);
  assert.equal(actions.save, f.document.querySelector('.wf-category-save')); assert.equal(actions.cancel, f.document.querySelector('.wf-category-form-actions').querySelector('button[type="button"]'));
  await f.editCategory(); assert.equal(f.api().getSettingsActions().dirty, false);
  await f.change(f.byId('wfCategoryLanguage'), 'ar', 'change'); assert.equal(f.api().getSettingsActions().dirty, false, 'selecting the editor language alone is clean');
  await f.change(f.byId('wfCategoryName'), 'كراسي جديدة'); await f.change(f.byId('wfCategoryLanguage'), 'en', 'change'); assert.equal(f.api().getSettingsActions().dirty, true, 'edits in another language stay dirty');
  await actions.cancel.click(); actions = f.api().getSettingsActions(); assert.equal(actions.key, 'product-categories:new'); assert.equal(actions.dirty, false); assert.equal(f.byId('wfCategoryName').value, ''); assert.equal(f.writes.length, 0);
  await f.editCategory(); const url = f.document.querySelector('.wf-category-form').querySelector('input[type="url"]');
  await f.change(url, 'https://example.test/new-chair.jpg'); assert.equal(f.api().getSettingsActions().dirty, true, 'unblurred URL edits count');
  await f.change(url, 'https://example.test/chairs.jpg'); assert.equal(f.api().getSettingsActions().dirty, false);
  await f.document.querySelector('.wf-category-remove-image').click(); assert.equal(f.api().getSettingsActions().dirty, true);
  await actions.cancel.click(); assert.equal(f.api().getSettingsActions().dirty, false);
  f.host.open = false; assert.equal(f.api().getSettingsActions(), null);
});

test('category adapter retains failed drafts and reports clean only after the real save completes', async () => {
  const f = fixture('product-categories'); assert.equal(typeof f.api().getSettingsActions, 'function'); f.select('product-categories'); await f.editCategory();
  await f.change(f.byId('wfCategoryName'), 'Updated chairs'); f.failWrite = true; f.blockWrite();
  const pending = f.api().getSettingsActions().save.click(); await tick();
  let actions = f.api().getSettingsActions(); assert.equal(actions.key, 'product-categories:wfcat_chairs'); assert.equal(actions.busy, true); assert.equal(actions.dirty, true); assert.equal(actions.cancel.matches(':disabled'), true); assert.equal(f.writes.length, 0);
  f.releaseWrite(); await pending;
  actions = f.api().getSettingsActions(); assert.equal(actions.busy, false); assert.equal(actions.dirty, true); assert.equal(f.byId('wfCategoryName').value, 'Updated chairs'); assert.equal(f.state.settings.productCategories.categories[0].labels.en, 'Chairs'); assert.equal(f.writes.length, 0);
  const before = f.notifications.length; f.failWrite = false; await actions.save.click();
  assert.equal(f.api().getSettingsActions().dirty, false); assert.equal(f.state.settings.productCategories.categories[0].labels.en, 'Updated chairs'); assert.equal(f.state.settings.companyName, 'Unrelated company'); assert.equal(f.writes.length, 1); assert(f.notifications.length > before, 'async completion notifies the common menu');
});
