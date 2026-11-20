const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '../settings-actions.js'), 'utf8');

// Execute the complete coordinator against an event-capable DOM. The editor
// fixtures own their fields and persistence; the coordinator must use their
// original controls instead of writing/resetting those fields itself.
function fixture() {
  const frames = [], pending = [], observers = [], writes = [], cleanScopes = [], historyCalls = [], guards = new Map();
  let document;
  class Event {
    constructor(type, options = {}) { this.type = type; this.bubbles = false; Object.assign(this, options); }
    preventDefault() { this.defaultPrevented = true; }
    stopImmediatePropagation() { this.stopped = true; }
  }
  class Element {
    constructor(tag = 'div') {
      this.tagName = tag.toUpperCase(); this.children = []; this.parentElement = null;
      this.attributes = new Map(); this.dataset = {}; this.listeners = new Map(); this.classes = new Set();
      this.disabled = false; this.hidden = false; this.open = false; this.value = ''; this.clicks = 0;
      this.styleValues = new Map(); this.style = {setProperty: (key, value) => this.styleValues.set(key, value), getPropertyValue: key => this.styleValues.get(key) || ''};
      this.classList = {contains: name => this.classes.has(name), add: (...names) => names.forEach(name => this.classes.add(name)), remove: (...names) => names.forEach(name => this.classes.delete(name)), toggle: (name, force) => { const add = force ?? !this.classes.has(name); add ? this.classes.add(name) : this.classes.delete(name); return add; }};
    }
    set className(value) { this.classes = new Set(value.split(/\s+/).filter(Boolean)); }
    get className() { return [...this.classes].join(' '); }
    append(...nodes) { for (const node of nodes) { node.remove(); node.parentElement = this; this.children.push(node); } }
    remove() { if (this.parentElement) this.parentElement.children = this.parentElement.children.filter(node => node !== this); this.parentElement = null; }
    contains(node) { return this === node || this.children.some(child => child.contains(node)); }
    setAttribute(name, value) { this.attributes.set(name, String(value)); }
    getAttribute(name) { return this.attributes.get(name) ?? null; }
    hasAttribute(name) { return this.attributes.has(name); }
    removeAttribute(name) { this.attributes.delete(name); }
    matches(selector) {
      return selector.split(',').some(part => {
        part = part.trim();
        if (part === ':disabled') {
          for (let node = this; node; node = node.parentElement) if (node.disabled && (node === this || node.tagName === 'FIELDSET')) return true;
          return false;
        }
        if (part.includes('>')) { const [parent, child] = part.split('>').map(value => value.trim()); return this.matches(child) && !!this.parentElement?.matches(parent); }
        if (part.startsWith('#')) return this.id === part.slice(1);
        if (part.startsWith('.')) return part.slice(1).split('.').every(name => this.classList.contains(name));
        if (part.startsWith('[')) return this.hasAttribute(part.slice(1, -1));
        return this.tagName === part.toUpperCase();
      });
    }
    closest(selector) { for (let node = this; node; node = node.parentElement) if (node.matches(selector)) return node; return null; }
    querySelectorAll(selector) {
      if (selector === ':scope > header button') return this.children.filter(child => child.tagName === 'HEADER').flatMap(child => child.querySelectorAll('button'));
      return this.children.flatMap(child => [...(child.matches(selector) ? [child] : []), ...child.querySelectorAll(selector)]);
    }
    querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
    addEventListener(type, callback, options) { const list = this.listeners.get(type) || []; list.push({callback, capture: options === true || !!options?.capture}); this.listeners.set(type, list); }
    dispatchEvent(event) {
      event.target ??= this;
      const ancestors = []; for (let node = this.parentElement; node; node = node.parentElement) ancestors.push(node);
      const call = (node, capture) => {
        for (const listener of node.listeners.get(event.type) || []) {
          if (listener.capture !== capture || event.stopped) continue;
          const result = listener.callback.call(node, event); if (result?.then) pending.push(result);
        }
      };
      for (const node of [...ancestors].reverse()) { if (event.stopped) break; call(node, true); }
      if (!event.stopped) call(this, true);
      if (!event.stopped) call(this, false);
      if (!event.stopped && event.type === 'click' && this.onclick) { const result = this.onclick(event); if (result?.then) pending.push(result); }
      if (event.bubbles) for (const node of ancestors) { if (event.stopped) break; call(node, false); }
      return !event.defaultPrevented;
    }
    click() { if (this.matches(':disabled')) return; this.clicks++; this.dispatchEvent(new Event('click', {bubbles: true})); }
    focus() { document.activeElement = this; }
    close() { this.open = false; this.closes = (this.closes || 0) + 1; this.dispatchEvent(new Event('close')); }
  }
  document = new Element('document'); document.documentElement = new Element('html'); document.documentElement.lang = 'en'; document.documentElement.dir = 'ltr';
  document.body = new Element('body'); document.append(document.documentElement); document.documentElement.append(document.body);
  document.createElement = tag => new Element(tag); document.getElementById = id => document.querySelector('#' + id);
  const make = (tag, id, parent = document.body, classes = '') => { const node = new Element(tag); node.id = id; node.className = classes; parent.append(node); return node; };
  const page = make('section', 'page-settings', document.body, 'page active');
  const tabs = make('div', 'settings-tabs', page), dialog = make('dialog', 'wfSettingsDialog', page); dialog.open = true;
  const header = make('header', 'settings-header', dialog), close = make('button', 'settings-close', header); close.onclick = () => dialog.close();
  const content = make('div', 'settings-content', dialog, 'wf-settings-content');
  const nav = make('nav', 'bottomNav', dialog), primary = make('button', 'bnav-2', nav, 'bnav-btn');
  const window = new Element('window'); window.innerHeight = 700;
  window.goBack = function (...args) { historyCalls.push({receiver: this, args}); return 'legacy-back'; };
  window.WFAppUpdates = {markClean: scope => cleanScopes.push(scope), registerGuard: (key, guard) => guards.set(key, guard)};
  const ownerNames = {company: 'WFCompanyIdentity', bank: 'WFCompanyIdentity', invoice: 'WFCompanyIdentity', currency: 'WFCurrencySources', 'smart-card': 'WFSmartCardSettings', 'app-identity': 'WFAppIdentity', 'product-categories': 'WFProductCategories', robot: 'WFRobotSettings'};
  const editors = new Map();
  const activeEditor = () => editors.get(page.querySelector('.tab-btn.active')?.id.replace('wf-settings-tab-', ''));
  for (const name of new Set(Object.values(ownerNames))) window[name] = {getSettingsActions: () => activeEditor()?.descriptor() || null};
  const notify = () => window.dispatchEvent(new Event('wf-settings-actions-change'));
  function addEditor(section, options = {}) {
    const tab = make('button', 'wf-settings-tab-' + section, tabs, 'tab-btn');
    const scope = make('section', 'stab-' + section, content), fieldset = make('fieldset', 'fields-' + section, scope), field = make('input', 'field-' + section, fieldset);
    const row = make('div', 'actions-' + section, fieldset, options.rowClass || 'wf-app-identity-actions');
    const save = make('button', 'save-' + section, row), cancel = make('button', 'cancel-' + section, row);
    const editor = {section, key: section, tab, scope, fieldset, field, row, save, cancel, committed: 'Stored ' + section, busy: false, error: false, ...options};
    field.value = editor.committed;
    editor.descriptor = () => editor.hub ? null : {key: editor.key, scope, save, cancel: editor.cancelTarget || cancel, dirty: field.value !== editor.committed, busy: editor.busy, error: editor.error, ...(editor.canSave !== undefined ? {canSave: editor.canSave} : {}), ...(editor.intent ? {intent: editor.intent} : {})};
    save.onclick = () => {
      if (editor.onSave) return editor.onSave(editor);
      editor.committed = field.value; editor.error = false; writes.push({section, value: field.value}); notify();
    };
    cancel.onclick = () => {
      field.value = editor.committed; editor.error = false;
      editor.onCancel?.(editor); notify();
    };
    editors.set(section, editor); return editor;
  }
  const initial = addEditor('invoice'); initial.tab.classList.add('active');
  const context = {window, document, CustomEvent: Event, requestAnimationFrame: callback => frames.push(callback), MutationObserver: class { constructor(callback) { this.callback = callback; observers.push(this); } observe(target, options) { this.target = target; this.options = options; } }};
  vm.runInNewContext(source, context);
  function flush() { let count = 0; while (frames.length && count++ < 100) frames.shift()(); assert(count < 100, 'settings state notifications must settle'); }
  flush(); document.dispatchEvent(new Event('DOMContentLoaded'));
  return {document, window, page, dialog, close, content, nav, primary, initial, editors, writes, cleanScopes, historyCalls, guards, Event, make, addEditor, flush,
    api: window.WFSettingsActions,
    notify() { notify(); flush(); },
    select(section) { if (!editors.has(section)) { const tab = make('button', 'wf-settings-tab-' + section, tabs, 'tab-btn'); editors.set(section, {tab, descriptor: () => null}); } for (const [key, editor] of editors) editor.tab.classList.toggle('active', key === section); notify(); flush(); },
    edit(editor, value, type = 'input') { editor.field.value = value; editor.field.dispatchEvent(new Event(type, {bubbles: true})); flush(); },
    escape() { const event = new Event('cancel'); if (dialog.dispatchEvent(event)) dialog.close(); flush(); return event; },
    async settle() { await Promise.all(pending.splice(0)); flush(); },
    language(lang) { document.documentElement.lang = lang; for (const observer of observers) if (observer.target === document.documentElement) observer.callback([{target: document.documentElement, attributeName: 'lang'}]); flush(); }
  };
}

test('clean editors do not save; edits route through the original hidden source control exactly once', () => {
  const f = fixture(), editor = f.initial;
  assert.equal(f.api.getState().state, 'clean');
  assert.equal(f.api.canRun('primary'), false);
  assert.equal(f.api.run('primary'), false);
  assert.equal(editor.save.clicks, 0); assert.equal(f.writes.length, 0);
  assert.equal(editor.save.dataset.wfDockedAction, 'save'); assert.equal(editor.cancel.dataset.wfDockedAction, 'cancel');
  assert.equal(editor.row.hasAttribute('data-wf-docked-row'), true);
  editor.row.hidden = true;
  f.edit(editor, 'Edited invoice');
  assert.equal(f.api.getState().canSave, true);
  assert.equal(f.api.run('primary'), true); f.flush();
  assert.equal(editor.save.clicks, 1); assert.deepEqual(f.writes, [{section: 'invoice', value: 'Edited invoice'}]);
  assert.equal(f.api.getState().state, 'saved'); assert.equal(f.api.getState().primaryLabel, 'Saved');
  assert.equal(f.api.run('primary'), false); assert.equal(editor.save.clicks, 1);
});

test('a clean feed refresh is explicitly enabled without treating every clean form as savable', () => {
  const f = fixture(), feed = f.addEditor('currency', {intent: 'refresh', canSave: true}); f.select('currency');
  assert.equal(f.api.getState().dirty, false); assert.equal(f.api.getState().primaryLabel, 'Refresh');
  assert.equal(f.api.getState().primaryIcon, 'refresh'); assert.equal(f.api.canRun('primary'), true);
  assert.equal(f.api.run('primary'), true); f.flush(); assert.equal(feed.save.clicks, 1);
  f.select('invoice'); assert.equal(f.api.canRun('primary'), false); assert.equal(f.initial.save.clicks, 0);
});

test('inherited fieldset disabling, inert scopes and ARIA guards block both original actions', () => {
  const f = fixture(), editor = f.initial; f.edit(editor, 'Unsaved value');
  editor.fieldset.disabled = true; f.notify();
  assert.equal(editor.save.disabled, false, 'the source itself is not explicitly disabled');
  assert.equal(f.api.getState().canSave, false); assert.equal(f.api.getState().canCancel, false);
  assert.equal(f.api.run('primary'), false); assert.equal(f.api.run('cancel'), false);
  editor.fieldset.disabled = false;
  for (const [attribute, value] of [['aria-disabled', 'true'], ['aria-busy', 'true']]) {
    editor.save.setAttribute(attribute, value); f.notify(); assert.equal(f.api.run('primary'), false); editor.save.removeAttribute(attribute);
  }
  editor.scope.setAttribute('inert', ''); f.notify(); assert.equal(f.api.run('primary'), false); assert.equal(f.api.run('cancel'), false);
  editor.scope.removeAttribute('inert'); f.notify(); assert.equal(f.api.canRun('primary'), true);
  assert.equal(editor.save.clicks, 0); assert.equal(editor.cancel.clicks, 0); assert.equal(f.writes.length, 0);
});

test('an asynchronous save blocks repeated Save, Cancel, Back, header close and Escape until completion', async () => {
  const f = fixture(), editor = f.initial;
  let release; const barrier = new Promise(resolve => { release = resolve; });
  editor.onSave = async () => { editor.busy = true; f.notify(); await barrier; editor.committed = editor.field.value; f.writes.push({section: 'invoice', value: editor.committed}); editor.busy = false; f.notify(); };
  f.edit(editor, 'Pending invoice'); assert.equal(f.api.run('primary'), true); f.flush();
  assert.equal(f.api.getState().state, 'busy'); assert.equal(f.api.getState().primaryLabel, 'Saving');
  assert.equal(f.guards.get('settings-actions')(), true);
  for (const action of ['primary', 'cancel', 'back']) assert.equal(f.api.run(action), false, action);
  f.close.click(); f.flush(); const escape = f.escape();
  assert.equal(escape.defaultPrevented, true); assert.equal(f.dialog.open, true); assert.equal(editor.cancel.clicks, 0);
  assert.equal(editor.save.clicks, 1); assert.equal(f.writes.length, 0);
  release(); await f.settle();
  assert.equal(f.writes.length, 1); assert.equal(f.api.getState().state, 'saved'); assert.equal(f.api.getState().busy, false);
  assert.equal(f.guards.get('settings-actions')(), false);
});

test('dirty Back, header close and Escape use the same inline guard; real Cancel restores the draft', () => {
  const f = fixture(), editor = f.initial; f.edit(editor, 'Discard me');
  assert.equal(f.api.run('back'), false); f.flush();
  assert.equal(f.api.getState().state, 'leave'); assert.equal(f.document.activeElement, f.primary);
  assert.match(f.api.getState().message, /Save or cancel/); assert.equal(f.dialog.open, true);
  assert.equal(editor.field.value, 'Discard me'); assert.equal(editor.cancel.clicks, 0);
  f.edit(editor, 'Still a draft'); assert.equal(f.api.getState().state, 'dirty');
  f.close.click(); f.flush(); assert.equal(f.api.getState().state, 'leave'); assert.equal(f.dialog.open, true);
  f.edit(editor, 'Escape draft'); const event = f.escape(); assert.equal(event.defaultPrevented, true);
  assert.equal(f.api.getState().state, 'leave'); assert.equal(f.document.querySelectorAll('dialog').length, 1);
  assert.equal(f.api.run('cancel'), true); f.flush();
  assert.equal(editor.cancel.clicks, 1); assert.equal(editor.field.value, 'Stored invoice'); assert.equal(f.writes.length, 0);
  assert.equal(f.api.getState().dirty, false); assert.equal(f.api.getState().message, 'Changes cancelled');
  assert.equal(f.dialog.open, true); assert.equal(f.cleanScopes.at(-1), editor.scope);
  assert.equal(f.api.run('back'), true); f.flush(); assert.equal(f.dialog.open, false);
  assert.equal(f.nav.classList.contains('wf-settings-dock'), false);
});

test('nested editor Back invokes its original cancel and returns to its directory without closing settings', () => {
  const f = fixture(), editor = f.addEditor('company', {key: 'company:identity', onCancel: current => { current.hub = true; }}); f.select('company');
  assert.equal(f.api.requestBack(), true); f.flush();
  assert.equal(editor.cancel.clicks, 1); assert.equal(f.dialog.open, true);
  assert.equal(f.api.getState().editable, false); assert.equal(f.api.getState().primaryLabel, 'Done');
  assert.equal(f.api.run('primary'), true); f.flush(); assert.equal(f.dialog.open, false);
});

test('function-backed Cancel uses the editor reset hook and preserves its unrelated saved state', () => {
  const f = fixture(), editor = f.initial; let resets = 0;
  editor.cancelTarget = () => { resets++; editor.field.value = editor.committed; editor.error = false; f.notify(); };
  f.edit(editor, 'Function reset draft'); assert.equal(f.api.run('cancel'), true); f.flush();
  assert.equal(resets, 1); assert.equal(editor.cancel.clicks, 0); assert.equal(editor.field.value, 'Stored invoice');
  assert.equal(editor.committed, 'Stored invoice'); assert.equal(f.writes.length, 0); assert.equal(f.api.getState().dirty, false);
  assert.equal(f.cleanScopes.at(-1), editor.scope);
});

test('failed asynchronous saves keep the original draft available for retry instead of claiming success', async () => {
  const f = fixture(), editor = f.initial; let fail = true;
  editor.onSave = async () => {
    editor.busy = true; editor.error = false; f.notify(); await Promise.resolve();
    if (fail) editor.error = true;
    else { editor.committed = editor.field.value; f.writes.push({section: 'invoice', value: editor.committed}); }
    editor.busy = false; f.notify();
  };
  f.edit(editor, 'Preserve on failure'); assert.equal(f.api.run('primary'), true); await f.settle();
  assert.equal(editor.field.value, 'Preserve on failure'); assert.equal(editor.committed, 'Stored invoice');
  assert.equal(f.dialog.open, true); assert.equal(f.writes.length, 0); assert.equal(f.api.getState().dirty, true);
  assert.equal(f.api.getState().state, 'dirty'); assert.equal(f.api.getState().canSave, true); assert.match(f.api.getState().message, /Not saved/);
  fail = false; assert.equal(f.api.run('primary'), true); await f.settle();
  assert.equal(f.writes.length, 1); assert.equal(f.api.getState().state, 'saved'); assert.equal(editor.save.clicks, 2);
});

test('native validation keeps the draft and clears its error status only when editing resumes', () => {
  const f = fixture(), editor = f.initial;
  editor.onSave = () => editor.field.dispatchEvent(new f.Event('invalid'));
  f.edit(editor, 'Invalid draft'); f.api.run('primary'); f.flush();
  assert.equal(f.api.getState().dirty, true); assert.match(f.api.getState().message, /highlighted fields/);
  assert.equal(f.writes.length, 0); assert.equal(f.dialog.open, true);
  f.edit(editor, 'Corrected draft'); assert.equal(f.api.getState().message, 'Changes ready to save');
});

test('a failed save followed by a manual revert becomes clean and never announces Saved', () => {
  const f = fixture(), editor = f.initial;
  // Editors without an error flag still communicate failure by retaining the
  // dirty draft. A later revert must not complete that older save attempt.
  editor.onSave = () => false;
  f.edit(editor, 'Rejected write'); f.api.run('primary'); f.flush();
  assert.equal(f.api.getState().state, 'dirty'); assert.equal(f.writes.length, 0);
  editor.field.value = editor.committed; f.notify();
  assert.equal(f.api.getState().state, 'clean'); assert.equal(f.api.getState().primaryLabel, 'Save');
  assert.equal(f.api.getState().message, 'No unsaved changes'); assert.equal(editor.save.clicks, 1);
});

test('browser and hardware Back use the dirty guard and restore the original history handler after settings closes', () => {
  const f = fixture(), editor = f.initial;
  f.edit(editor, 'Protect from Back'); assert.equal(f.window.goBack('hardware'), false); f.flush();
  assert.equal(f.api.getState().state, 'leave'); assert.equal(f.dialog.open, true); assert.equal(f.historyCalls.length, 0);
  editor.busy = true; f.notify(); assert.equal(f.window.goBack('browser'), false); assert.equal(f.historyCalls.length, 0);
  editor.busy = false; f.notify(); f.api.run('cancel'); f.flush();
  assert.equal(f.window.goBack('clean-settings'), true); f.flush(); assert.equal(f.dialog.open, false); assert.equal(f.historyCalls.length, 0);
  const receiver = {route: 'outside-settings'};
  assert.equal(f.window.goBack.call(receiver, 'after-close', 2), 'legacy-back');
  assert.equal(f.historyCalls[0].receiver, receiver); assert.deepEqual(f.historyCalls[0].args, ['after-close', 2]);
  f.dialog.open = true; f.page.classList.remove('active');
  assert.equal(f.window.goBack('other-page'), 'legacy-back'); assert.equal(f.historyCalls.length, 2);
});

test('context changes route only to the current editor and discard neither hidden drafts nor unrelated settings', () => {
  const f = fixture(), invoice = f.initial, robot = f.addEditor('robot', {rowClass: 'wf-robot-settings-save'});
  const feedback = f.make('p', 'robot-feedback', robot.row); feedback.setAttribute('role', 'status');
  f.edit(invoice, 'Unrelated invoice draft'); f.api.requestBack(); f.flush();
  f.select('robot'); assert.equal(f.api.getState().state, 'clean'); assert.equal(f.api.getState().key, 'robot');
  assert.equal(robot.row.hasAttribute('data-wf-docked-row'), false, 'robot feedback row stays visible');
  assert.equal(feedback.dataset.wfDockedAction, undefined);
  f.edit(robot, 'Updated robot'); assert.equal(f.api.run('primary'), true); f.flush();
  assert.equal(robot.save.clicks, 1); assert.equal(invoice.save.clicks, 0); assert.equal(invoice.field.value, 'Unrelated invoice draft');
  f.select('invoice'); assert.equal(f.api.getState().state, 'dirty'); assert.equal(f.api.getState().primaryLabel, 'Save');
  assert.equal(f.api.run('cancel'), true); f.flush(); assert.equal(invoice.field.value, 'Stored invoice'); assert.equal(robot.committed, 'Updated robot');
});

test('category Edit and New cannot replace a dirty or busy draft and resume their original handlers once clean', () => {
  const f = fixture(), editor = f.addEditor('product-categories', {key: 'product-categories:chairs'}); f.select('product-categories');
  let switches = 0;
  const edit = f.make('button', 'edit-other-category', editor.scope, 'wf-category-edit');
  const add = f.make('button', 'new-category', editor.scope, 'wf-category-new');
  edit.onclick = () => { switches++; editor.key = 'product-categories:tables'; };
  add.onclick = () => { switches++; editor.key = 'product-categories:new'; };
  f.edit(editor, 'Unfinished category');
  for (const button of [edit, add]) { button.click(); f.flush(); assert.equal(switches, 0); assert.equal(f.api.getState().state, 'leave'); }
  assert.equal(editor.field.value, 'Unfinished category'); assert.equal(editor.cancel.clicks, 0); assert.equal(f.dialog.open, true);
  editor.busy = true; editor.field.value = editor.committed; f.notify();
  for (const button of [edit, add]) { button.click(); f.flush(); assert.equal(switches, 0); assert.equal(f.api.getState().state, 'busy'); }
  editor.busy = false; f.notify();
  edit.click(); f.flush(); assert.equal(switches, 1); assert.equal(f.api.getState().key, 'product-categories:tables');
  add.click(); f.flush(); assert.equal(switches, 2); assert.equal(f.api.getState().key, 'product-categories:new');
  assert.equal(f.writes.length, 0);
});

test('automatic and read-only sections expose Done, and localization updates all action labels', () => {
  const f = fixture();
  for (const section of ['appearance', 'language', 'about']) {
    f.dialog.open = true; f.select(section);
    assert.equal(f.api.getState().state, section === 'about' ? 'readonly' : 'automatic');
    assert.equal(f.api.getState().editable, false); assert.equal(f.api.getState().primaryLabel, 'Done');
    assert.equal(f.api.getState().canSave, false); assert.equal(f.api.getState().canCancel, false);
    assert.equal(f.api.run('primary'), true); f.flush(); assert.equal(f.dialog.open, false);
  }
  f.dialog.open = true; f.select('invoice'); f.edit(f.initial, 'Localize me');
  for (const [locale, save, cancel, back] of [['ar', 'حفظ', 'إلغاء', 'رجوع'], ['en', 'Save', 'Cancel', 'Back'], ['tr', 'Kaydet', 'İptal', 'Geri'], ['fr', 'Enregistrer', 'Annuler', 'Retour'], ['ru', 'Сохранить', 'Отмена', 'Назад']]) {
    f.language(locale); const state = f.api.getState(); assert.equal(state.primaryLabel, save); assert.equal(state.cancelLabel, cancel); assert.equal(state.backLabel, back);
  }
  assert.equal(f.initial.save.clicks, 0); assert.equal(f.writes.length, 0);
});
