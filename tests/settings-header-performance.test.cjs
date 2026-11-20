const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// Execute the actual header synchronizer. Count mutations that would wake the
// existing settings-actions observer, and retain real node identity between calls.
function fixture() {
  const counts = {captionClones: 0, labels: 0, icons: 0};
  class Element {
    constructor(tag, className = '', value = '') { this.tagName = tag.toUpperCase(); this.className = className; this.value = value; this.children = []; this.attributes = new Map(); }
    get textContent() { return this.value + this.children.map(child => child.textContent).join(''); }
    set textContent(value) { this.value = value; this.children = []; }
    get outerHTML() { return '<' + this.tagName.toLowerCase() + [...this.attributes].map(([key, value]) => ' ' + key + '="' + value + '"').join('') + '>' + this.value + this.children.map(child => child.outerHTML).join('') + '</' + this.tagName.toLowerCase() + '>'; }
    append(...children) { for (const child of children) { child.parent = this; this.children.push(child); } }
    remove() { this.parent.children.splice(this.parent.children.indexOf(this), 1); this.parent = null; }
    setAttribute(key, value) { this.attributes.set(key, String(value)); }
    removeAttribute(key) { this.attributes.delete(key); }
    getAttribute(key) { return this.attributes.get(key) ?? null; }
    matches(selector) { return selector[0] === '.' ? this.className.split(' ').includes(selector.slice(1)) : this.tagName === selector.toUpperCase(); }
    querySelectorAll(selector) { const selectors = selector.split(',').map(item => item.trim()); return this.children.flatMap(child => [...(selectors.some(part => child.matches(part)) ? [child] : []), ...child.querySelectorAll(selector)]); }
    querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
    cloneNode(deep) { if (this.tagName === 'BUTTON') counts.captionClones++; const copy = new Element(this.tagName, this.className, this.value); copy.id = this.id; copy.attributes = new Map(this.attributes); if (deep) copy.append(...this.children.map(child => child.cloneNode(true))); return copy; }
  }
  function opener(id, caption, glyph = 'company') {
    const button = new Element('button'); button.id = 'wf-settings-tab-' + id;
    const label = new Element('span', '', caption), description = new Element('small', 'wf-settings-card-description', 'Description');
    let icon = null;
    if (glyph) {
      icon = new Element('svg', 'wf-ui-icon'); icon.setAttribute('id', 'source-' + id); icon.setAttribute('viewBox', '0 0 24 24');
      const shape = new Element('path'); shape.setAttribute('d', glyph); icon.append(shape); button.append(icon);
    }
    button.append(label, description); return {button, label, description, icon};
  }
  let labelText = '', sectionTitle = '';
  const titleLabel = {get textContent() { return labelText; }, set textContent(value) { counts.labels++; labelText = value; }};
  const titleSymbol = {
    children: [], get firstElementChild() { return this.children[0] || null; },
    replaceChildren(...children) { counts.icons++; this.children = children; },
    set innerHTML(value) { counts.icons++; this.markup = value; this.children = [new Element('svg')]; }
  };
  const source = fs.readFileSync(path.join(__dirname, '../settings-navigation.js'), 'utf8');
  const start = source.indexOf(' let opener,');
  const end = source.indexOf(" window.addEventListener('wf-settings-actions-change'", start);
  assert(start > 0 && end > start, 'the production header synchronizer is present');
  const context = vm.createContext({titleLabel, titleSymbol, window: {WFCompanyIdentity: {getSectionTitle: () => sectionTitle}}});
  vm.runInContext(source.slice(start, end) + '\nthis.sync=updateDialogTitle;this.select=button=>{opener=button;updateDialogTitle();};', context);
  return {counts, titleLabel, titleSymbol, opener, select: context.select, sync: context.sync, set section(value) { sectionTitle = value; }};
}

test('unchanged settings actions produce no header mutations or additional caption clones', () => {
  const f = fixture(), company = f.opener('company', 'معلومات الشركة'); f.select(company.button);
  const before = {...f.counts}, icon = f.titleSymbol.firstElementChild;
  for (let i = 0; i < 100; i++) f.sync();
  assert.deepEqual(f.counts, before); assert.equal(f.titleSymbol.firstElementChild, icon);
});

test('company subsection changes update only the caption and preserve the existing icon node', () => {
  const f = fixture(), company = f.opener('company', 'معلومات الشركة'); f.select(company.button);
  const before = {...f.counts}, icon = f.titleSymbol.firstElementChild;
  for (const caption of ['البيانات الأساسية', 'الشعار والهوية', '']) {
    f.section = caption; f.sync(); assert.equal(f.titleLabel.textContent, caption || 'معلومات الشركة');
  }
  assert.equal(f.counts.icons, before.icons); assert.equal(f.counts.captionClones, before.captionClones);
  assert.equal(f.titleSymbol.firstElementChild, icon);
});

test('localized captions in all five languages update without rebuilding an unchanged icon', () => {
  const f = fixture(), company = f.opener('company', 'Company'); f.select(company.button);
  const icon = f.titleSymbol.firstElementChild, before = f.counts.icons;
  const captions = {ar: 'معلومات الشركة', en: 'Company information', tr: 'Şirket bilgileri', fr: 'Informations de l’entreprise', ru: 'Данные компании'};
  for (const caption of Object.values(captions)) {
    company.label.textContent = caption; f.sync(); assert.equal(f.titleLabel.textContent, caption);
    const counts = {...f.counts}; f.sync(); assert.deepEqual(f.counts, counts);
  }
  assert.equal(f.counts.icons, before); assert.equal(f.titleSymbol.firstElementChild, icon);
});

test('icon-only source changes are reflected once while the original SVG remains untouched', () => {
  const f = fixture(), company = f.opener('company', 'Company'); f.select(company.button);
  const oldIcon = f.titleSymbol.firstElementChild, before = {...f.counts};
  company.icon.children[0].setAttribute('d', 'updated-shape'); f.sync();
  assert.notEqual(f.titleSymbol.firstElementChild, oldIcon); assert.equal(f.counts.icons, before.icons + 1);
  assert.equal(f.counts.labels, before.labels); assert.equal(f.counts.captionClones, before.captionClones);
  assert.equal(f.titleSymbol.firstElementChild.children[0].getAttribute('d'), 'updated-shape');
  assert.equal(f.titleSymbol.firstElementChild.getAttribute('id'), null); assert.equal(f.titleSymbol.firstElementChild.getAttribute('focusable'), 'false');
  assert.equal(company.icon.getAttribute('id'), 'source-company'); assert.equal(company.icon.getAttribute('focusable'), null);
  const settled = {...f.counts}; f.sync(); assert.deepEqual(f.counts, settled);
});

test('description updates do not mutate the title or its icon', () => {
  const f = fixture(), company = f.opener('company', 'Company'); f.select(company.button);
  const before = {...f.counts}, icon = f.titleSymbol.firstElementChild;
  company.description.textContent = 'A new localized description'; f.sync();
  assert.equal(f.titleLabel.textContent, 'Company'); assert.equal(f.counts.labels, before.labels);
  assert.equal(f.counts.icons, before.icons); assert.equal(f.titleSymbol.firstElementChild, icon);
});

test('switching sections retains distinct fallback symbols without rebuilding them on caption-only changes', () => {
  const f = fixture(), app = f.opener('app-identity', 'App identity', null), generic = f.opener('about', 'About', null);
  f.select(app.button); const identity = f.titleSymbol.markup, before = f.counts.icons;
  app.label.textContent = 'هوية التطبيق'; f.sync(); assert.equal(f.counts.icons, before);
  f.select(generic.button); assert.notEqual(f.titleSymbol.markup, identity);
  const settled = f.counts.icons; generic.label.textContent = 'عن البرنامج'; f.sync(); assert.equal(f.counts.icons, settled);
  f.select(app.button); assert.equal(f.titleSymbol.markup, identity);
});
