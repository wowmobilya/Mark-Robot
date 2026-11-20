const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const acorn = require('acorn');
const walk = require('acorn-walk');
const fx = require('../currency-sources.js');

const source = fs.readFileSync(require.resolve('../currency-sources.js'), 'utf8');
const ast = acorn.parse(source, {ecmaVersion: 'latest'});
let mount;
walk.simple(ast, {FunctionDeclaration(node) { if (node.id.name === 'mount') mount = node; }});
const names = new Set(['clearManualFields', 'selectProvider', 'discardChoice', 'choiceChanged']);
const functions = mount.body.body.filter(node => node.type === 'FunctionDeclaration' && names.has(node.id.name));
const adapter = mount.body.body.find(node => node.type === 'ExpressionStatement' && node.expression.type === 'AssignmentExpression' &&
  node.expression.left.object?.name === 'api' && node.expression.left.property?.name === 'getSettingsActions');
const closures = [...functions, adapter].map(node => source.slice(node.start, node.end)).join('\n');

// Run the real selection/discard/dirty closures and adapter with the exported
// currency rules. Rendering and focus are UI boundaries; no storage substitute
// is installed, so these draft actions cannot accidentally persist a quote.
function fixture(savedSource = {id: 'market', side: 'reference', mode: 'feed', via: 'frankfurter', dateOnly: true}) {
  const state = {rateSource: structuredClone(savedSource), usdTry: 40.25, usdEur: .805, settings: {companyName: 'Keep company'}};
  const fields = {usd: {value: ''}, eur: {value: ''}, url: {value: savedSource?.url || ''}};
  const visibility = {open: true, active: true, section: 'currency'};
  const details = {id: 'provider-details'}, submit = {id: 'original-apply-button'};
  const context = {
    S: state, fields, details, submit, api: {},
    selected: savedSource?.id || 'market', selectedSide: savedSource?.side || 'reference', selectedMode: savedSource?.mode || 'feed',
    busy: false, result: '', view: 'details',
    normalizeSource: fx.normalizeSource, fromBoard: fx.fromBoard, safeUrl: fx.safeUrl, sides: fx.sides, modes: fx.modes,
    known: id => Object.hasOwn(fx.catalog, id), render() {}, sourceTitle: {focus() {}}, list: {querySelector: () => ({focus() {}})},
    document: {
      getElementById: id => id === 'wfSettingsDialog' ? visibility : id === 'page-settings' ? {classList: {contains: key => key === 'active' && visibility.active}} : null,
      querySelector: () => ({id: 'wf-settings-tab-' + visibility.section})
    }
  };
  vm.createContext(context);
  vm.runInContext(closures, context);
  return {
    state, fields, visibility, details, submit, context,
    actions: () => context.api.getSettingsActions(),
    select: id => context.selectProvider(id),
    snapshot: () => JSON.parse(JSON.stringify({selected: context.selected, side: context.selectedSide, mode: context.selectedMode,
      result: context.result, view: context.view, busy: context.busy, usd: fields.usd.value, eur: fields.eur.value, url: fields.url.value}))
  };
}

test('currency actions distinguish a pending provider from the saved feed and expose the original apply control', () => {
  const f = fixture(), before = structuredClone(f.state);
  let actions = f.actions();
  assert.equal(actions.key, 'currency:market'); assert.equal(actions.scope, f.details); assert.equal(actions.save, f.submit);
  assert.equal(actions.dirty, false); assert.equal(actions.canSave, true); assert.equal(actions.intent, 'refresh');
  f.select('tcmb'); actions = f.actions();
  assert.equal(actions.key, 'currency:tcmb'); assert.equal(actions.dirty, true); assert.equal(actions.canSave, true); assert.equal(actions.intent, 'save');
  assert.deepEqual(f.state, before, 'browsing a provider does not change the saved source or rates');
  f.select('market'); actions = f.actions(); assert.equal(actions.dirty, false); assert.equal(actions.intent, 'refresh');
  f.visibility.open = false; assert.equal(f.actions(), null);
  f.visibility.open = true; f.visibility.active = false; assert.equal(f.actions(), null);
  f.visibility.active = true; f.visibility.section = 'invoice'; assert.equal(f.actions(), null);
  f.visibility.section = 'currency'; f.context.view = 'picker'; assert.equal(f.actions(), null);
});

test('manual currency actions compare numeric board values instead of their input spelling', () => {
  const f = fixture({id: 'manual', side: 'reference', mode: 'manual', via: null});
  assert.equal(f.actions().dirty, false); assert.equal(f.actions().canSave, false);
  for (const [usd, eur] of [['40.25', '50'], ['040.2500', '050.00'], ['٤٠٫٢٥', '۵۰'], [' 40,25 ', ' 50 ']]) {
    f.fields.usd.value = usd; f.fields.eur.value = eur;
    assert.equal(f.actions().dirty, false, usd + ' / ' + eur); assert.equal(f.actions().canSave, false);
  }
  for (const [usd, eur] of [['41', '50'], ['40.25', '51']]) {
    f.fields.usd.value = usd; f.fields.eur.value = eur;
    assert.equal(f.actions().dirty, true, usd + ' / ' + eur); assert.equal(f.actions().canSave, true);
  }
  assert.equal(f.state.usdTry, 40.25); assert.equal(f.state.usdEur, .805);
});

test('equivalent canonical source URLs stay clean while invalid and changed URLs remain pending', () => {
  for (const id of ['manual', 'mizan']) {
    const f = fixture({id, side: 'sell', mode: 'manual', via: null, url: 'https://example.test/'});
    for (const value of ['https://example.test/', 'https://example.test', ' https://EXAMPLE.TEST:443 ']) {
      f.fields.url.value = value;
      assert.equal(f.actions().dirty, false, id + ': ' + value); assert.equal(f.actions().canSave, false);
    }
    for (const value of ['https://example.test/rates', '', 'javascript:alert(1)', 'https://user:password@example.test/', 'http://example.test/']) {
      f.fields.url.value = value;
      assert.equal(f.actions().dirty, true, id + ': ' + value); assert.equal(f.actions().canSave, true);
    }
  }
  const empty = fixture({id: 'manual', side: 'reference', mode: 'manual', via: null});
  empty.fields.url.value = 'not a URL'; assert.equal(empty.actions().dirty, true, 'an invalid URL must not compare equal to an absent saved URL');
});

test('invalid manual rates remain dirty and apply errors are visible through the adapter', () => {
  const f = fixture({id: 'manual', side: 'reference', mode: 'manual', via: null});
  for (const [usd, eur] of [['', '50'], ['40.25', ''], ['0', '50'], ['-1', '50'], ['40.25', 'zero'], ['1e2', '50'], ['40.25', '1.2.3']]) {
    f.fields.usd.value = usd; f.fields.eur.value = eur;
    assert.equal(f.actions().dirty, true, usd + ' / ' + eur); assert.equal(f.actions().canSave, true);
  }
  for (const result of ['invalid', 'failed', 'stale', 'unsaved']) { f.context.result = result; assert.equal(f.actions().error, true, result); }
  for (const result of ['', 'loading', 'ok']) { f.context.result = result; assert.equal(f.actions().error, false, result); }
});

test('currency Cancel executes the real reset, returns to the picker and preserves committed data', () => {
  const f = fixture({id: 'mizan', side: 'sell', mode: 'manual', via: null, url: 'https://saved.test/rates'}), before = structuredClone(f.state);
  f.select('ziraat'); f.fields.usd.value = '42'; f.fields.eur.value = '52'; f.fields.url.value = 'https://draft.test/'; f.context.result = 'invalid';
  f.actions().cancel();
  assert.deepEqual(f.snapshot(), {selected: 'mizan', side: 'sell', mode: 'manual', result: '', view: 'picker', busy: false, usd: '', eur: '', url: 'https://saved.test/rates'});
  assert.equal(f.actions(), null); assert.deepEqual(f.state, before);
  f.select('mizan'); assert.equal(f.actions().dirty, false); assert.equal(f.actions().canSave, false);
  const unsaved = fixture(null); unsaved.select('ziraat'); unsaved.fields.usd.value = '44'; unsaved.actions().cancel();
  assert.deepEqual(unsaved.snapshot(), {selected: 'market', side: 'reference', mode: 'feed', result: '', view: 'picker', busy: false, usd: '', eur: '', url: ''});
  assert.equal(unsaved.state.rateSource, null);
});

test('a busy currency apply blocks cancellation until the owner finishes', () => {
  const f = fixture({id: 'manual', side: 'reference', mode: 'manual', via: null});
  f.select('tcmb'); f.fields.usd.value = '42'; f.fields.eur.value = '52'; f.context.busy = true; f.context.result = 'loading';
  const pending = f.snapshot(), saved = structuredClone(f.state), actions = f.actions();
  assert.equal(actions.busy, true); actions.cancel();
  assert.deepEqual(f.snapshot(), pending, 'the same callback cannot discard an in-flight apply'); assert.deepEqual(f.state, saved);
  f.context.busy = false; f.context.result = 'failed';
  assert.equal(f.actions().busy, false); assert.equal(f.actions().error, true); f.actions().cancel();
  assert.equal(f.context.view, 'picker'); assert.equal(f.context.selected, 'manual'); assert.equal(f.fields.usd.value, ''); assert.deepEqual(f.state, saved);
});

test('a previously obtained Cancel callback restores the latest committed source', () => {
  const f = fixture(); f.select('ziraat'); const cancel = f.actions().cancel;
  f.state.rateSource = {id: 'tcmb', side: 'sell', mode: 'feed', via: 'tcmb', dateOnly: true};
  f.state.usdTry = 43; f.state.usdEur = .86;
  const committed = structuredClone(f.state); cancel();
  assert.equal(f.context.selected, 'tcmb'); assert.equal(f.context.selectedSide, 'sell'); assert.equal(f.context.selectedMode, 'feed');
  assert.equal(f.context.view, 'picker'); assert.deepEqual(f.state, committed);
});
