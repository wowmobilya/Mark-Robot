const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const acorn = require('acorn');
const {mountInvoiceWorkspace} = require('../invoice-workspace.js');

// A small DOM boundary lets the presentation code move the original controls
// and decorate live rows. Visual sizing is checked separately in the browser.
function fixture() {
  class Text {
    constructor(value) { this.nodeType = 3; this.nodeValue = String(value); }
    get textContent() { return this.nodeValue; }
    remove() { this.parentElement?.removeChild(this); }
  }
  class Element {
    constructor(tag) { this.tagName = tag.toUpperCase(); this.nodeType = 1; this.nodes = []; this.attributes = new Map(); this.className = ''; this.style = {}; this.listeners = []; this.value = ''; this.clicks = 0; }
    get children() { return this.nodes.filter(node => node.nodeType === 1); }
    get childNodes() { return this.nodes; }
    get firstElementChild() { return this.children[0] || null; }
    get classList() { const self = this; return {contains(name) { return self.className.split(' ').includes(name); }, add(name) { if (!this.contains(name)) self.className = (self.className + ' ' + name).trim(); }}; }
    get textContent() { return this.nodes.map(node => node.textContent).join(''); }
    set textContent(value) { this.replaceChildren(new Text(value)); }
    set innerHTML(value) { this.markup = value; this.replaceChildren(); }
    setAttribute(key, value) { this.attributes.set(key, String(value)); if (['id', 'class', 'type'].includes(key)) this[key === 'class' ? 'className' : key] = String(value); }
    getAttribute(key) { return this.attributes.get(key) ?? null; }
    hasAttribute(key) { return this.attributes.has(key); }
    removeChild(child) { this.nodes.splice(this.nodes.indexOf(child), 1); child.parentElement = null; }
    remove() { this.parentElement?.removeChild(this); }
    append(...nodes) { for (const node of nodes) { node.remove(); node.parentElement = this; this.nodes.push(node); } }
    prepend(...nodes) { for (const node of nodes.reverse()) { node.remove(); node.parentElement = this; this.nodes.unshift(node); } }
    after(node) { const parent = this.parentElement; node.remove(); node.parentElement = parent; parent.nodes.splice(parent.nodes.indexOf(this) + 1, 0, node); }
    replaceChildren(...nodes) { for (const node of this.nodes) node.parentElement = null; this.nodes = []; this.append(...nodes); }
    matches(selector) {
      return selector.split(',').some(part => {
        const value = part.trim();
        if (value.startsWith('#')) return this.id === value.slice(1);
        const attribute = /^(\w+)?\[([^=\]]+)(?:="([^"]*)")?\]$/.exec(value);
        if (attribute) return (!attribute[1] || this.tagName === attribute[1].toUpperCase()) && (attribute[3] === undefined ? this.hasAttribute(attribute[2]) : this.getAttribute(attribute[2]) === attribute[3]);
        const [tag, ...classes] = value.split('.');
        return (!tag || this.tagName === tag.toUpperCase()) && classes.every(name => this.classList.contains(name));
      });
    }
    closest(selector) { for (let node = this; node; node = node.parentElement) if (node.matches(selector)) return node; return null; }
    querySelectorAll(selector) { return this.children.flatMap(child => [...(child.matches(selector) ? [child] : []), ...child.querySelectorAll(selector)]); }
    querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
    addEventListener(type, handler) { this.listeners.push({type, handler}); }
    click() { this.clicks++; }
    key(key, extra = {}) { const event = {key, currentTarget: this, target: this, preventDefault() { this.prevented = true; }, stopPropagation() { this.stopped = true; }, ...extra}; for (const listener of this.listeners) if (listener.type === 'keydown') listener.handler(event); return event; }
  }
  const document = new Element('document');
  document.createElement = tag => new Element(tag);
  document.getElementById = id => document.querySelector('#' + id);
  const make = (tag, id, parent, className = '', value) => { const node = new Element(tag); node.id = id; node.className = className; if (value !== undefined) node.textContent = value; parent.append(node); return node; };
  const root = make('html', '', document); root.lang = 'en'; root.dir = 'ltr'; document.documentElement = root;
  const page = make('section', 'page-create-invoice', root);
  const header = make('div', '', page, 'sct-sticky-header'); make('h1', 'invFormTitle', header, '', 'Create invoice');
  const chips = make('div', '', header, 'chip-row'); for (const id of ['curInvNum', 'invCBMChip']) make('strong', id, make('div', '', chips));
  const actions = make('div', '', header);
  for (const name of ['saveInvoice', 'previewInvoice', 'openUnifiedShareModal']) { const button = make('button', '', actions); button.setAttribute('onclick', name + (name === 'openUnifiedShareModal' ? '(event)' : '()')); const label = make('span', '', button, '', name); label.setAttribute('data-i18n', name); }
  const builder = make('div', '', page, 'inv-builder'), main = make('div', '', builder), essentials = make('div', 'step1Body', main);
  const originalRow = make('div', '', essentials), fields = {};
  for (const [id, tag] of [['invCoSel','select'], ['invNumDisplay','div'], ['invCurrency','select'], ['invCountry','input'], ['invProvince','input'], ['invRegDate','input'], ['invLoadDate','input']]) {
    const group = make('div', '', originalRow, 'fg'); make('label', '', group, 'fl', id); fields[id] = make(tag, id, group); fields[id].value = id === 'invCurrency' ? 'TRY' : 'Keep ' + id;
  }
  fields.invProvince.parentElement.style.display = 'none';
  const paymentGroup = make('div', '', essentials, 'fg'), payment = make('select', 'invPayMethodSelect', paymentGroup), paymentOption = make('option', '', payment, '', '💵 Cash'); paymentOption.value = 'cash'; paymentOption.setAttribute('data-wf-ui', '💵 Cash'); payment.value = 'cash';
  const shippingRow = make('div', 'shippingTruckRow', essentials), shippingGroup = make('div', '', shippingRow, 'fg'), shipping = make('select', 'invShippingSelect', shippingGroup), shippingOption = make('option', '', shipping, '', '👤 Buyer pays shipping costs'); shippingOption.value = 'client'; shippingOption.setAttribute('data-wf-ui', '👤 Buyer pays shipping costs'); shipping.value = 'client';
  const noteGroup = make('div', '', essentials); make('label', '', noteGroup, 'fl', 'Notes'); const notes = make('textarea', 'invNotes', noteGroup); notes.value = 'Customer note — لا تترجم';
  const pickerBody = make('div', 'step5Body', main), list = make('div', 'prSelectorList', pickerBody), choice = make('div', '', list, 'ps-item');
  const search = make('input', 'invPrSearch', pickerBody); search.setAttribute('placeholder', '🔍 Search for a product...');
  choice.setAttribute('onclick', "addItemToInv_id('fixture')"); make('div', '', choice, 'ps-thumb'); make('div', '', choice, 'ps-name', '🛋️ Original product'); make('div', '', choice, 'ps-price', '₺493.60');
  const items = make('div', 'step6Body', main), tableContainer = make('div', '', items), table = make('table', '', tableContainer), head = make('thead', '', table), headerRow = make('tr', '', head);
  for (const name of ['#', 'Image', 'Name', 'Dimensions', 'Color', 'Quantity', 'Price', 'Total', 'CBM', '']) make('th', '', headerRow, '', name);
  const tbody = make('tbody', 'invItemsTbody', table), row = make('tr', '', tbody), cells = [];
  for (let index = 0; index < 10; index++) cells.push(make('td', '', row));
  cells[0].textContent = '1'; make('div', '', cells[1], '', '🛋️'); cells[2].textContent = '🛋️ Original product';
  const dimensions = make('div', '', cells[3]);
  for (const [index, value] of [90, 50, 45].entries()) { const input = make('input', '', dimensions); input.value = String(value); input.title = ['Length','Width','Height'][index]; input.setAttribute('onchange', `changeInvItemDim(0,0,'${['l','w','h'][index]}',this.value)`); }
  const color = make('select', '', cells[4]); color.value = 'CUSTOM'; color.setAttribute('onchange', 'changeInvItemColor(0,this.value)');
  const custom = make('input', '', cells[4]); custom.type = 'text'; custom.value = 'Ocean blue';
  const reset = make('button', '', cells[4], '', '✕'); reset.setAttribute('onclick', "changeInvItemColor(0,'STANDARD')");
  const quantityGroup = make('div', '', cells[5]); make('button', '', quantityGroup, '', '−'); const quantity = make('input', '', quantityGroup); quantity.value = '3'; quantity.setAttribute('onchange', 'setQty(0,this.value)'); make('button', '', quantityGroup, '', '+');
  const price = make('input', '', cells[6]); price.value = '12.34'; price.setAttribute('onchange', 'setPrice(0,this.value)'); cells[7].textContent = '₺1,480.80'; cells[8].textContent = '0.3000';
  const remove = make('button', '', cells[9], '', '🗑️'); remove.setAttribute('onclick', 'removeItem(0)');
  const totals = make('div', '', items); make('div', 'sumSectionLabel', totals, '', 'Summary');
  const window = {renderInvTable() { return 42; }, renderPrSelector() { return 43; }};
  const api = mountInvoiceWorkspace(document, window);
  return {document, window, root, api, page, fields, notes, choice, cells, price, quantity, color, custom, reset, dimensions, payment, paymentOption, shipping, shippingOption, search, headers: headerRow.children};
}

test('mounting and refreshing retains the actual fields, handlers, values and hidden invoice-type state', () => {
  const f = fixture(), before = [f.price, f.quantity, f.color, f.custom, f.notes, ...Object.values(f.fields)].map(node => ({node, value: node.value, change: node.getAttribute('onchange')}));
  for (let pass = 0; pass < 4; pass++) f.api.refresh();
  for (const {node, value, change} of before) { assert.equal(node.value, value); assert.equal(node.getAttribute('onchange'), change); }
  assert.equal(f.fields.invProvince.parentElement.style.display, 'none');
  assert.equal(f.fields.invCurrency.closest('.wf-invoice-essentials').id, 'wfInvoiceEssentials');
  assert.equal(f.notes.closest('details').className, 'wf-invoice-option');
  assert.equal(f.document.querySelectorAll('.wf-invoice-option').length, 2);
  assert.equal(f.cells[2].textContent, '🛋️ Original product');
  for (const index of [3,4,5,6,7,8]) assert.equal(f.cells[index].querySelectorAll('.wf-invoice-cell-label').length, 1);
  assert.equal(f.reset.querySelectorAll('[data-wf-invoice-icon]').length, 1);
  assert.equal(f.reset.textContent, '', 'the original X is replaced by one decorative SVG, without two close glyphs');
  assert.equal(f.fields.invCurrency.parentElement.querySelector('label').htmlFor, 'invCurrency');
  assert.equal(f.payment.value, 'cash'); assert.equal(f.shipping.value, 'client');
  assert.equal(f.paymentOption.textContent, '💵 Cash'); assert.equal(f.shippingOption.textContent, '👤 Buyer pays shipping costs');
  assert.equal(f.search.getAttribute('placeholder'), '🔍 Search for a product...', 'authored translation bindings remain owned by localization');
  assert.equal(f.window.renderInvTable(), 42, 'the original handler and return value are retained');
  assert.equal(f.window.renderPrSelector(), 43);
  assert.equal(mountInvoiceWorkspace(f.document, f.window), f.api);
});

test('all five languages distinguish the base unit-price input from the chosen total currency without editing either value', () => {
  const f = fixture(), labels = new Set();
  for (const language of ['ar', 'en', 'tr', 'fr', 'ru']) for (const currency of ['USD', 'TRY', 'EUR']) {
    f.root.lang = language; f.root.dir = language === 'ar' ? 'rtl' : 'ltr'; f.fields.invCurrency.value = currency; f.api.refresh();
    const priceLabel = f.cells[6].querySelector('.wf-invoice-cell-label'), totalLabel = f.cells[7].querySelector('.wf-invoice-cell-label');
    labels.add(priceLabel.textContent); assert.match(priceLabel.textContent, /\(USD\)/); assert.equal(priceLabel.getAttribute('dir'), f.root.dir);
    assert.equal(totalLabel.textContent, 'Total · ' + currency); assert.equal(f.headers[7].getAttribute('data-wf-invoice-currency'), currency);
    assert.equal(f.headers[6].getAttribute('data-wf-invoice-currency'), 'USD'); assert.equal(f.price.value, '12.34');
    assert(f.cells[7].textContent.endsWith('₺1,480.80'), 'presentation does not recalculate or replace the total');
    assert.equal(f.notes.value, 'Customer note — لا تترجم');
  }
  assert.equal(labels.size, 5);
});

test('product picker sends one keyboard click and ignores repeats, nested targets and inert ancestors', () => {
  const f = fixture(); f.api.refresh();
  assert.equal(f.choice.listeners.length, 1); assert.equal(f.choice.getAttribute('onclick'), "addItemToInv_id('fixture')");
  const enter = f.choice.key('Enter'); assert(enter.prevented && enter.stopped); f.choice.key(' '); assert.equal(f.choice.clicks, 2);
  f.choice.key('Enter', {repeat: true}); f.choice.key(' ', {target: f.choice.children[0]}); f.choice.key('ArrowDown');
  f.page.setAttribute('inert', ''); f.choice.key('Enter'); assert.equal(f.choice.clicks, 2);
});

test('the existing invoice renderer and edit handlers use USD inputs and convert chosen-currency totals exactly once', () => {
  const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
  const source = name => { const start = html.indexOf('function ' + name + '('); assert(start > -1, name); return html.slice(start, acorn.parseExpressionAt(html, start, {ecmaVersion: 'latest'}).end); };
  const nodes = Object.fromEntries(['invItemsTbody', 'invTblTotal', 'invTblCBM', 'invCBMChip'].map(id => [id, {}]));
  const item = {name: 'Original product', qty: 3, priceUSD: 12.34, priceTRY: 493.6, priceEUR: 11.106, totalUSD: 37.02, totalTRY: 1480.8, totalEUR: 33.318, color: 'STANDARD', cbm: .1, dimPieces: [{l: 90, w: 50, h: 45}]};
  const S = {invItems: [item], invCurrency: 'TRY', lang: 'en', usdTry: 40, usdEur: .9};
  const context = vm.createContext({S, document: {getElementById: id => nodes[id]}, wfRefreshProductUpdateNotice() {}, updateSummary() {}, isKnownColor: () => true, getInvColorOptionsHTML: () => '<option>Standard</option>', wfUiText: value => value});
  const currencyStart = html.indexOf('const usdToTry=');
  vm.runInContext(html.slice(currencyStart, html.indexOf('const CC_CONFIGS', currencyStart)), context);
  for (const name of ['renderInvTable', 'changeQty', 'setQty', 'setPrice', 'changeInvItemDim']) vm.runInContext(source(name), context);
  context.renderInvTable(); assert.match(nodes.invItemsTbody.innerHTML, /value="12\.34" onchange="setPrice\(0,this\.value\)"/); assert.equal(nodes.invTblTotal.textContent, '₺1,480.80');
  context.setPrice(0, '17.125'); assert.equal(item.priceUSD, 17.125); assert.equal(item.priceTRY, 685); assert.equal(item.priceEUR, 15.4125); assert.equal(item.totalUSD, 51.375); assert.equal(nodes.invTblTotal.textContent, '₺2,055.00');
  context.setQty(0, '2'); assert.equal(item.qty, 2); assert.equal(item.priceUSD, 17.125); assert.equal(nodes.invTblTotal.textContent, '₺1,370.00');
  S.invCurrency = 'EUR'; context.renderInvTable(); assert.equal(item.priceUSD, 17.125); assert.match(nodes.invItemsTbody.innerHTML, /value="17\.13" onchange="setPrice\(0,this\.value\)"/); assert.equal(nodes.invTblTotal.textContent, '€30.83');
  context.changeInvItemDim(0, 0, 'l', '95.5'); assert.equal(item.dimPieces[0].l, 95.5); assert.equal(item.dimensions, '95.5×50×45'); assert.equal(item.cbm, .1, 'physical edits preserve saved shipping volume'); assert.equal(item.priceUSD, 17.125);
});
