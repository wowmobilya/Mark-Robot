const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function fixture() {
  const observers = [], pending = [];
  let document;
  function mutation(record) { pending.push(record); }
  class Event {
    constructor(type, options = {}) { this.type = type; Object.assign(this, options); }
    preventDefault() { this.defaultPrevented = true; }
    stopPropagation() { this.stopped = true; }
  }
  class Element {
    constructor(tag) { this.tagName = tag.toUpperCase(); this.nodeType = 1; this.children = []; this.parentNode = null; this.attributes = new Map(); this.listeners = new Map(); this.className = ''; this.id = ''; this.hidden = false; this.inert = false; this._text = ''; }
    get parentElement() { return this.parentNode; }
    get nextElementSibling() { return this.parentNode?.children[this.parentNode.children.indexOf(this) + 1] || null; }
    get previousElementSibling() { return this.parentNode?.children[this.parentNode.children.indexOf(this) - 1] || null; }
    get classList() { const self = this; return { contains(v) { return self.className.split(' ').includes(v); }, add(...values) { const next = [...new Set([...self.className.split(' ').filter(Boolean), ...values])].join(' '); if (next !== self.className) { self.className = next; mutation({ type: 'attributes', target: self, attributeName: 'class' }); } }, remove(...values) { const next = self.className.split(' ').filter(v => !values.includes(v)).join(' '); if (next !== self.className) { self.className = next; mutation({ type: 'attributes', target: self, attributeName: 'class' }); } }, toggle(v, force) { const active = force ?? !this.contains(v); active ? this.add(v) : this.remove(v); return active; } }; }
    set textContent(value) { this._text = String(value); this.children = []; }
    get textContent() { return this._text + this.children.map(child => child.textContent).join(''); }
    set innerHTML(value) { this._html = value; }
    get innerHTML() { return this._html || ''; }
    append(...nodes) { for (const node of nodes) { node.remove(); this.children.push(node); node.parentNode = this; mutation({ type: 'childList', target: this, addedNodes: [node] }); } }
    before(node) { const parent = this.parentNode; node.remove(); parent.children.splice(parent.children.indexOf(this), 0, node); node.parentNode = parent; mutation({ type: 'childList', target: parent, addedNodes: [node] }); }
    remove() { if (this.parentNode) { this.parentNode.children.splice(this.parentNode.children.indexOf(this), 1); this.parentNode = null; } }
    setAttribute(name, value) { this.attributes.set(name, String(value)); if (['id', 'lang', 'dir'].includes(name)) this[name] = String(value); mutation({ type: 'attributes', target: this, attributeName: name }); }
    getAttribute(name) { return this.attributes.get(name) ?? (name === 'class' ? this.className : null); }
    matches(selector) { return selector.split(',').some(part => { part = part.trim(); if (part[0] === '.') return part.slice(1).split('.').every(value => this.classList.contains(value)); if (part[0] === '#') return this.id === part.slice(1); if (part[0] === '[') return part === '[inert]' ? this.inert : this.attributes.has(part.slice(1, -1)); const split = part.split('.'); return this.tagName === split[0].toUpperCase() && split.slice(1).every(value => this.classList.contains(value)); }); }
    closest(selector) { for (let node = this; node; node = node.parentNode) if (node.matches(selector)) return node; return null; }
    contains(node) { for (; node; node = node.parentNode) if (node === this) return true; return false; }
    querySelectorAll(selector) { const found = []; for (const child of this.children) { if (child.matches(selector)) found.push(child); found.push(...child.querySelectorAll(selector)); } return found; }
    querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
    addEventListener(type, listener) { const handlers = this.listeners.get(type) || []; handlers.push(listener); this.listeners.set(type, handlers); }
    dispatchEvent(event) { event.target ??= this; for (let node = this; node; node = event.bubbles && !event.stopped ? node.parentNode : null) { event.currentTarget = node; if (event.type === 'click') node.onclick?.(event); for (const listener of node.listeners.get(event.type) || []) listener(event); } return !event.defaultPrevented; }
    click() { if (!this.disabled && !this.closest('[inert]')) this.dispatchEvent(new Event('click', { bubbles: true })); }
    focus() { document.activeElement = this; }
  }
  document = new Element('document'); document.nodeType = 9;
  document.documentElement = new Element('html'); document.documentElement.lang = 'ar'; document.documentElement.dir = 'rtl'; document.append(document.documentElement);
  document.body = new Element('body'); document.documentElement.append(document.body); document.activeElement = document.body;
  document.createElement = tag => new Element(tag); document.getElementById = id => document.querySelector('#' + id);
  const make = (tag, id, parent = document.body, cls = '') => { const node = new Element(tag); node.id = id; node.className = cls; parent.append(node); return node; };
  const page = id => make('section', 'page-' + id, document.body, 'page');
  const clients = page('companies'), companyForm = page('add-company'), invoices = page('invoices'), invoiceForm = page('create-invoice'), payment = page('payment-management');
  const clientGrid = make('div', 'coGrid', clients), invoiceGrid = make('div', 'invListContainer', invoices);
  const counters = { card: 0, operation: 0, details: 0, accordion: 0, receipt: 0, invoiceEdit: 0 };
  function card(parent, name) {
    const node = make('div', '', parent, 'co-card');
    const content = make('div', '', node, 'co-card-content'); make('div', '', content, 'co-name').textContent = name;
    const detail = make('div', '', content, 'co-details-toggle'), detailBody = make('div', name + '-details', content, 'co-details-body');
    detail.textContent = 'Details'; detail.onclick = () => { counters.details++; detailBody.classList.toggle('open'); };
    make('div', '', node, 'co-card-toggle-hint').textContent = 'Back';
    const actions = make('div', '', node, 'co-card-actions'), operation = make('button', '', actions, 'btn');
    actions.onclick = event => event.stopPropagation(); operation.onclick = () => counters.operation++;
    node.onclick = event => { event.stopPropagation(); if (event.target.closest('.co-card-actions')) return; counters.card++; const open = node.classList.contains('is-open'); parent.querySelectorAll('.co-card').forEach(other => other.classList.remove('is-open')); node.classList.toggle('is-open', !open); };
    return { node, content, detail, detailBody, actions, operation };
  }
  const first = card(clientGrid, 'Client One'), second = card(clientGrid, 'Client Two');
  const fields = make('div', '', companyForm, 'fg');
  const firstLabel = make('label', '', fields, 'fl'), phone = make('input', 'coPhone', fields); firstLabel.textContent = 'Phone'; phone.type = 'text'; phone.value = '00123';
  const secondLabel = make('label', '', fields, 'fl'), email = make('input', 'coEmail', fields); secondLabel.textContent = 'Email'; email.type = 'text'; email.value = 'original@example.test';
  const step = make('div', '', invoiceForm, 'inv-step'), header = make('div', '', step, 'inv-step-hdr'), body = make('div', 'step1Body', step, 'inv-step-body');
  header.setAttribute('onclick', "toggleStep('step1')"); header.onclick = () => { counters.accordion++; body.classList.toggle('collapsed'); };
  const table = make('div', '', invoiceForm, 'inv-tbl-wrap');
  const invoiceTable = make('table', '', table), invoiceHead = make('thead', '', invoiceTable), headingRow = make('tr', '', invoiceHead);
  const invoiceHeadings = ['#', 'Image', 'Name', 'Dimensions', 'Color', 'Quantity', 'Price', 'Total', 'CBM', ''].map(text => { const th = make('th', '', headingRow); th.textContent = text; return th; });
  const invoiceBody = make('tbody', 'invItemsTbody', invoiceTable);
  function invoiceRow(name) {
    const row = make('tr', '', invoiceBody), cells = invoiceHeadings.map(() => make('td', '', row)); cells[2].textContent = name;
    const dim = make('input', '', cells[3], 'fc'); dim.setAttribute('title', 'Length'); dim.value = '120';
    const color = make('select', '', cells[4], 'fc'); color.value = 'STANDARD';
    const qty = make('input', '', cells[5], 'qty-inp'); qty.value = '2';
    const price = make('input', '', cells[6], 'il-inp'); price.value = '75.00';
    const edit = () => counters.invoiceEdit++;
    for (const field of [dim, color, qty, price]) field.addEventListener('change', edit);
    return { row, name: cells[2], dim, color, qty, price, edit };
  }
  const firstItem = invoiceRow('Coffee table');
  const depositRow = make('div', '', invoiceForm), depositLabel = make('span', '', depositRow), deposit = make('input', 'sumDeposit', depositRow);
  depositLabel.textContent = 'Deposit'; deposit.value = '125';
  const receiptGrid = make('div', 'pmReceiptTypeGrid', payment), receiptLabel = make('span', 'pmReceiptTypeLabel', payment); receiptLabel.textContent = 'Receipt method';
  const choices = ['cash', 'transfer', 'card'].map((kind, index) => { const node = make('div', kind, receiptGrid, 'pm-receipt-type' + (index ? '' : ' sel')); node.onclick = () => { counters.receipt++; choices.forEach(other => other.classList.remove('sel')); node.classList.add('sel'); }; return node; });
  const window = {};
  const MutationObserver = class { constructor(callback) { this.callback = callback; this.targets = []; observers.push(this); } observe(target, options) { this.targets.push({ target, options }); } };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../business-workspace.js'), 'utf8'), { document, window, MutationObserver });
  function flush() { const records = pending.splice(0); for (const observer of observers) { const relevant = records.filter(record => observer.targets.some(({ target, options }) => (record.target === target || options.subtree && target.contains(record.target)) && (record.type === 'childList' ? options.childList : options.attributes && (!options.attributeFilter || options.attributeFilter.includes(record.attributeName))))); if (relevant.length) observer.callback(relevant); } }
  flush();
  return { document, window, make, card, counters, clientGrid, invoiceGrid, first, second, firstLabel, secondLabel, phone, email, header, body, table, invoiceHeadings, invoiceBody, invoiceRow, firstItem, deposit, depositLabel, choices, flush,
    key(node, key) { return node.dispatchEvent(new Event('keydown', { key, bubbles: true })); },
    change(node) { return node.dispatchEvent(new Event('change', { bubbles: true })); } };
}

test('legacy labels target their own following field without changing saved values or validation types', () => {
  const f = fixture();
  assert.equal(f.firstLabel.htmlFor, 'coPhone'); assert.equal(f.secondLabel.htmlFor, 'coEmail');
  assert.equal(f.phone.type, 'text'); assert.equal(f.email.type, 'text');
  assert.equal(f.phone.value, '00123'); assert.equal(f.email.value, 'original@example.test');
  assert.equal(f.phone.inputMode, 'tel'); assert.equal(f.email.inputMode, 'email');
  assert.equal(f.deposit.getAttribute('aria-labelledby'), f.depositLabel.id); assert.equal(f.deposit.value, '125');
});

test('invoice accordion keyboard activation calls the original handler once and follows external collapse changes', () => {
  const f = fixture();
  assert.equal(f.header.getAttribute('aria-controls'), 'step1Body'); assert.equal(f.header.getAttribute('aria-expanded'), 'true');
  f.key(f.header, 'Enter'); assert.equal(f.counters.accordion, 1); assert.equal(f.header.getAttribute('aria-expanded'), 'false'); assert.equal(f.body.inert, true);
  f.body.classList.remove('collapsed'); f.flush(); assert.equal(f.header.getAttribute('aria-expanded'), 'true'); assert.equal(f.body.inert, false);
  f.key(f.header, 'Tab'); assert.equal(f.counters.accordion, 1);
  assert.equal(f.table.tabIndex, 0); assert.equal(f.table.getAttribute('role'), 'region');
});

test('receipt radios preserve original selection handlers and synchronize click, arrows and programmatic reset', () => {
  const f = fixture();
  assert.deepEqual(f.choices.map(node => node.tabIndex), [0, -1, -1]);
  f.key(f.choices[0], 'ArrowDown'); assert.equal(f.counters.receipt, 1); assert.equal(f.document.activeElement, f.choices[1]);
  assert.deepEqual(f.choices.map(node => node.getAttribute('aria-checked')), ['false', 'true', 'false']);
  f.key(f.choices[1], 'End'); assert.equal(f.counters.receipt, 2); assert.equal(f.choices[2].tabIndex, 0);
  f.choices[2].classList.remove('sel'); f.choices[0].classList.add('sel'); f.flush();
  assert.deepEqual(f.choices.map(node => node.tabIndex), [0, -1, -1]);
});

test('accordion expansion preserves inert state owned by another feature', () => {
  const f = fixture(); f.body.inert = true;
  f.key(f.header, 'Enter'); f.key(f.header, 'Enter');
  assert.equal(f.header.getAttribute('aria-expanded'), 'true'); assert.equal(f.body.inert, true);
});

test('rendered invoice controls use existing column, dimension and item names without replacing values or handlers', () => {
  const f = fixture(), item = f.firstItem;
  assert.equal(item.qty.getAttribute('aria-labelledby'), f.invoiceHeadings[5].id + ' ' + item.name.id);
  assert.equal(item.price.getAttribute('aria-labelledby'), f.invoiceHeadings[6].id + ' ' + item.name.id);
  assert.equal(item.color.getAttribute('aria-labelledby'), f.invoiceHeadings[4].id + ' ' + item.name.id);
  assert.equal(item.dim.getAttribute('aria-label'), 'Dimensions · Length · Coffee table');
  assert.deepEqual([item.dim.value, item.qty.value, item.price.value], ['120', '2', '75.00']);
  assert.equal(f.counters.invoiceEdit, 0); f.change(item.qty); assert.equal(f.counters.invoiceEdit, 1);
  const added = f.invoiceRow('Side table'); added.price.setAttribute('aria-label', 'Existing explicit price label'); f.flush();
  assert.equal(added.qty.getAttribute('aria-labelledby'), f.invoiceHeadings[5].id + ' ' + added.name.id);
  assert.equal(added.price.getAttribute('aria-label'), 'Existing explicit price label');
  assert.notEqual(added.name.id, item.name.id);
  f.invoiceHeadings[3].textContent = 'Boyutlar'; item.dim.setAttribute('title', 'Uzunluk');
  f.document.documentElement.setAttribute('lang', 'tr'); f.flush();
  assert.equal(item.dim.getAttribute('aria-label'), 'Boyutlar · Uzunluk · Coffee table');
  assert.equal(f.counters.invoiceEdit, 1);
});

test('card actions keep their original controls, expand one card and do not execute an operation during disclosure', () => {
  const f = fixture(), toggle = f.first.node.querySelector('.wf-business-card-toggle');
  assert.equal(f.first.actions.hidden, true); assert.equal(f.first.actions.inert, true);
  toggle.click(); assert.equal(f.counters.card, 1); assert.equal(f.counters.operation, 0);
  assert.equal(f.first.actions.hidden, false); assert.equal(f.first.node.querySelector('.co-card-content'), f.first.content);
  assert.equal(toggle.getAttribute('aria-expanded'), 'true');
  f.first.operation.click(); assert.equal(f.counters.operation, 1); assert.equal(f.counters.card, 1);
  f.second.node.querySelector('.wf-business-card-toggle').click(); f.flush();
  assert.equal(f.first.actions.hidden, true); assert.equal(f.second.actions.hidden, false);
  f.key(f.second.operation, 'Escape'); assert.equal(f.second.actions.hidden, true); assert.equal(f.document.activeElement, f.second.node.querySelector('.wf-business-card-toggle'));
});

test('client details no longer bubble into the card menu, including keyboard access', () => {
  const f = fixture(); f.first.detail.click();
  assert.equal(f.counters.details, 1); assert.equal(f.counters.card, 0); assert.equal(f.first.detail.getAttribute('aria-expanded'), 'true');
  f.key(f.first.detail, ' '); assert.equal(f.counters.details, 2); assert.equal(f.counters.card, 0); assert.equal(f.first.detail.getAttribute('aria-expanded'), 'false');
});

test('newly rendered cards receive one disclosure and their labels follow the active language', () => {
  const f = fixture(), third = f.card(f.clientGrid, 'Client Three'); f.flush(); f.flush();
  assert.equal(third.node.querySelectorAll('.wf-business-card-toggle').length, 1);
  third.node.querySelector('.wf-business-card-toggle').click();
  f.document.documentElement.setAttribute('lang', 'tr'); f.flush();
  const toggle = third.node.querySelector('.wf-business-card-toggle');
  assert.equal(toggle.textContent, 'İşlemleri gizle'); assert.equal(toggle.getAttribute('aria-label'), 'İşlemleri gizle · Client Three');
  assert.equal(f.counters.operation, 0);
});
