const test = require('node:test');
const assert = require('node:assert/strict');
const { identity, copy, paginateProfile } = require('../developer-profile.js');
const fs = require('node:fs');
const vm = require('node:vm');
const acorn = require('acorn');

test('developer profile follows committed app identity instead of company invoice identity', () => {
  const logo = 'data:image/png;base64,iVBORw0KGgo=';
  const settings = { companyName: 'Invoice Company', logo: 'invoice-logo', appIdentity: { name: 'My workspace', logo } };
  const before = structuredClone(settings);
  assert.deepEqual(identity(null, settings), { name: 'My workspace', logo });
  assert.deepEqual(identity({ current: () => ({ name: 'Active app', logo }) }, settings), { name: 'Active app', logo });
  assert.deepEqual(settings, before);
});

test('malformed restored identity cannot introduce unsafe image sources or remove defaults', () => {
  assert.deepEqual(identity(null, { appIdentity: { name: '', logo: 'javascript:alert(1)' } }), { name: 'WOW FURNITURE', logo: './assets/wow-furniture-logo.svg' });
  assert.equal(identity({ current() { throw new Error('Unavailable'); } }, { appIdentity: { name: 'Saved app' } }).name, 'Saved app');
  assert.equal(identity(null, { appIdentity: { name: 'x'.repeat(61), logo: 'data:image/svg+xml,<svg/>' } }).name, 'WOW FURNITURE');
  assert.equal(identity(null, { appIdentity: { name: 'WOW FURNITURE\u202e' } }).name, 'WOW FURNITURE');
});

test('legacy app branding resolves to WOW even when the identity manager is unavailable', () => {
  const logo = 'data:image/png;base64,iVBORw0KGgo=';
  for (const name of ['INFINITY', 'infinity', 'إنفنتي', 'انفنتي', ' INFINITY\u202e ']) {
    const settings = {appIdentity:{name, logo}};
    const before = structuredClone(settings);
    assert.deepEqual(identity(null, settings), {name:'WOW FURNITURE', logo:'./assets/wow-furniture-logo.svg'});
    assert.deepEqual(identity({current() { throw new Error('Unavailable'); }}, settings), {name:'WOW FURNITURE', logo:'./assets/wow-furniture-logo.svg'});
    assert.deepEqual(settings, before, 'rendering does not mutate stored preferences');
  }
});

test('profile copy covers all five languages and the requested name and development focus', () => {
  for (const language of ['ar', 'en', 'tr', 'fr', 'ru']) {
    assert.deepEqual(Object.keys(copy[language]).sort(), Object.keys(copy.en).sort());
    assert(Object.values(copy[language]).every(value => typeof value === 'string' && value.trim()));
  }
  assert.equal(copy.ar.name, 'المهندس معتز بالله حاج شعبان');
  assert.equal(copy.ar.robotics, 'الروبوتات والأتمتة');
  assert.equal(copy.ar.ai, 'الذكاء الاصطناعي');
});


test('bounded profile pages preserve every section and every character in order', () => {
  assert.equal(typeof paginateProfile, 'function');
  const sections = [
    {key:'about', blocks:[{key:'bio', title:'About', text:'Alpha beta gamma delta epsilon zeta.'}]},
    {key:'focus', blocks:[{key:'one', title:'One', text:'Sales and clients.'}, {key:'two', title:'Two', text:'Robotics and automation.'}]}
  ];
  const pages = paginateProfile(sections, blocks => blocks.reduce((total, block) => total + block.text.length + 3, 0) <= 24);
  assert(pages.length > 3, 'a short viewport must create more views, not truncate content');
  for (const page of pages) assert(page.blocks.reduce((total, block) => total + block.text.length + 3, 0) <= 24);
  for (const section of sections) for (const block of section.blocks) {
    assert.equal(pages.filter(page => page.section === section.key).flatMap(page => page.blocks)
      .filter(part => part.key === block.key).map(part => part.text).join(''), block.text);
  }
  assert.deepEqual([...new Set(pages.map(page => page.section))], ['about', 'focus']);
});

test('profile pagination fits unbroken and mixed-script text without losing unicode data', () => {
  const text = 'ABCDEFGHIJK🙂LMNOPQRSTUVWXYZ العربية Русский';
  const pages = paginateProfile([{key:'code', blocks:[{key:'code', title:'Code', text}]}],
    blocks => blocks.every(block => Array.from(block.text).length <= 9));
  assert(pages.length > 1);
  assert(pages.every(page => page.blocks.every(block => Array.from(block.text).length <= 9)));
  assert.equal(pages.flatMap(page => page.blocks).map(block => block.text).join(''), text);
  assert(pages.every(page => page.blocks.every(block => !/^[\uDC00-\uDFFF]|[\uD800-\uDBFF]$/.test(block.text))), 'page boundaries must not split surrogate pairs');
});

test('opening the profile with reset renders its first page immediately', () => {
  const source = fs.readFileSync(require.resolve('../developer-profile.js'), 'utf8');
  const controller = acorn.parse(source, {ecmaVersion:'latest'}).body.find(statement =>
    statement.type === 'ExpressionStatement' && statement.expression.callee?.type === 'ArrowFunctionExpression');
  const functions = controller.expression.callee.body.body.filter(statement => statement.type === 'FunctionDeclaration' &&
    ['showPage', 'rebuildPages'].includes(statement.id.name));
  const node = () => ({textContent:'', setAttribute(name, value) { this[name] = value; }});
  const host = {replaceChildren(page) { this.page = page; }}, counter = node(), previous = node(), next = node();
  const context = vm.createContext({
    dialog:{open:true}, measure:{clientWidth:280, clientHeight:180, scrollWidth:280, scrollHeight:180, replaceChildren() {}},
    pages:[], currentPage:0, labels:copy.en, paginateProfile, host, counter, previous, next, sectionLabel:node(),
    contentSections:() => [{key:'about', blocks:[{key:'bio', title:'Profile', text:'Complete first page.'}]}],
    renderBlocks:blocks => blocks
  });
  vm.runInContext(functions.map(statement => source.slice(statement.start, statement.end)).join('\n'), context);
  context.rebuildPages(true);
  assert.equal(host.page[0].text, 'Complete first page.');
  assert.equal(counter.textContent, '1 / 1');
  assert.equal(previous.disabled, true); assert.equal(next.disabled, true);
  assert.equal(context.currentPage, 0);
});
