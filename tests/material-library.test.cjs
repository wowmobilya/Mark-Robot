'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const source = path.join(__dirname, '..', 'material-library-core.js');
const core = fs.existsSync(source) ? require(source) : {};
const costing = require('../product-cost-core.js');
const costUI = require('../product-costs.js');
const fn = name => { assert.equal(typeof core[name], 'function', name + ' is implemented'); return core[name]; };
const rates = {usdTry:50, usdEur:0.8};
const now = '2026-11-21T12:00:00.000Z';
const material = extra => ({id:'wood', name:'Oak', unit:'m²', category:'Wood', currency:'TRY', unitPrice:500, rates, updatedAt:now, ...extra});
const draft = extra => ({currency:'EUR', rates:{usdTry:40, usdEur:0.9}, materials:[], labor:2, overhead:'', ...extra});
const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-8, `${actual} should equal ${expected}`);

test('catalog prices preserve unknown versus explicit zero and reject invalid money and quotes', () => {
  const prepare = fn('prepareMaterial');
  assert.equal(prepare(material({unitPrice:''}), now).unitPriceUSD, null);
  assert.equal(prepare(material({unitPrice:null}), now).unitPrice, null);
  assert.equal(prepare(material({unitPrice:0}), now).unitPriceUSD, 0);
  assert.equal(prepare(material(), now).unitPriceUSD, 10);
  for (const value of ['12x', -1, Infinity, NaN, true]) assert.throws(() => prepare(material({unitPrice:value}), now), error => error.code === 'INVALID_AMOUNT');
  assert.throws(() => prepare(material({rates:{usdTry:0}}), now), error => error.code === 'INVALID_RATE');
  assert.throws(() => prepare(material({name:' '}), now), error => error.code === 'MATERIAL_NAME_REQUIRED');
  assert.throws(() => prepare(material({unit:''}), now), error => error.code === 'MATERIAL_UNIT_REQUIRED');
});

test('changing catalog currency converts the price and keeps missing prices blank without mutating the draft', () => {
  const convert = fn('convertMaterialCurrency'), original = material(), before = structuredClone(original);
  const result = convert(original, 'EUR');
  near(result.unitPrice, 8);
  near(fn('prepareMaterial')(result, now).unitPriceUSD, 10);
  assert.deepEqual(original, before);
  assert.equal(convert(material({unitPrice:''}), 'USD').unitPrice, '');
  assert.throws(() => convert(material({rates:{usdTry:50}}), 'EUR'), error => error.code === 'INVALID_RATE');
});

test('updating a material rate snapshot preserves USD and can repair quotes for a blank price', () => {
  const rebase = fn('rebaseMaterialRates');
  const result = rebase(material(), {usdTry:60,usdEur:0.85});
  near(result.unitPrice,600);
  near(fn('prepareMaterial')(result,now).unitPriceUSD,10);
  const blank = rebase(material({unitPrice:'',rates:{usdTry:0}}),rates);
  assert.equal(blank.unitPrice,''); assert.equal(blank.rates.usdTry,50);
});

test('catalog selection bridges the material and product saved rates and retains the stable link through save and reload', () => {
  const selected = fn('createLinkedRow')(material(), draft(), 'bom-1');
  near(selected.unitPrice, 9);
  assert.equal(selected.quantity, 1);
  assert.equal(selected.catalogId, 'wood');
  assert.equal(selected.catalogUpdatedAt, now);
  const saved = costing.prepareCosting(draft({materials:[selected]}), now);
  const reloaded = costUI.normalizeMaterialRows(saved.materials, () => 'unexpected');
  assert.equal(saved.materials[0].catalogId, 'wood');
  assert.equal(reloaded[0].catalogId, 'wood');
  assert.equal(reloaded[0].catalogUpdatedAt, now);
  near(saved.unitCostUSD, (9 + 2) / 0.9);
});

test('a catalog material with an unknown price cannot turn into a free saved product cost', () => {
  const row = fn('createLinkedRow')(material({unitPrice:null}), draft(), 'bom-1');
  assert.equal(row.unitPrice, '');
  assert.throws(() => costing.prepareCosting(draft({materials:[row]}), now), error => error.code === 'MATERIAL_INCOMPLETE');
  const zero = fn('createLinkedRow')(material({unitPrice:0}), draft(), 'bom-2');
  assert.equal(zero.unitPrice, 0);
});

test('explicit linked refresh changes only the chosen row price and snapshot; unknown prices and changed units remain reviewable', () => {
  const row = {id:'bom-1', name:'Oak for chair', unit:'m²', quantity:3, unitPrice:4, catalogId:'wood', catalogUpdatedAt:'old'};
  const original = draft({materials:[row, {id:'manual', name:'Glue', unit:'kg', quantity:1, unitPrice:2}]}), before = structuredClone(original);
  const updated = fn('applyLinkedPrice')(original, 'bom-1', material());
  near(updated.materials[0].unitPrice, 9);
  assert.equal(updated.materials[0].quantity, 3);
  assert.equal(updated.materials[0].name, 'Oak for chair');
  assert.equal(updated.materials[0].catalogUpdatedAt, now);
  assert.deepEqual(updated.materials[1], original.materials[1]);
  assert.deepEqual(original, before);
  assert.throws(() => core.applyLinkedPrice(original, 'bom-1', material({unitPrice:null})), error => error.code === 'MATERIAL_PRICE_UNKNOWN');
  assert.throws(() => core.applyLinkedPrice(original, 'bom-1', material({unit:'board'})), error => error.code === 'MATERIAL_UNIT_CHANGED');
  assert.throws(() => core.applyLinkedPrice(original, 'bom-1', material({id:'metal'})), error => error.code === 'MATERIAL_LINK_MISMATCH');
});

test('catalog writes merge the latest main settings and keep same-name materials separate while detecting same-row conflicts', () => {
  const prepare = fn('prepareMaterial'), merge = fn('mergeMaterial');
  const old = prepare(material({updatedAt:'old'}), 'old');
  const latest = {id:'main', companyName:'Latest brand', logo:'wfmedia:new', materialLibrary:{version:1, materials:[old, prepare(material({id:'other', name:'Oak', unitPrice:800}), 'other-time')], updatedAt:'other-time'}};
  const before = structuredClone(latest);
  const next = merge(latest, {material:prepare(material({unitPrice:600}), now), creating:false, expectedUpdatedAt:'old', seed:{companyName:'Stale brand'}});
  assert.equal(next.companyName, 'Latest brand');
  assert.equal(next.logo, 'wfmedia:new');
  assert.equal(next.materialLibrary.materials.length, 2);
  assert.equal(next.materialLibrary.materials[1].unitPrice, 800);
  assert.deepEqual(latest, before);
  assert.throws(() => merge(next, {material:prepare(material(), now), creating:false, expectedUpdatedAt:'old'}), error => error.code === 'MATERIAL_CHANGED');
  assert.throws(() => merge(latest, {material:old, creating:true}), error => error.code === 'MATERIAL_ID_EXISTS');
  const created = merge(undefined, {material:old, creating:true, seed:{companyName:'Fresh brand'}});
  assert.equal(created.id, 'main');
  assert.equal(created.companyName, 'Fresh brand');
});

test('catalog persistence awaits commit and async media hydration before publishing latest settings', async () => {
  const persist = fn('persistMaterial');
  const state = {settings:{companyName:'Cache'}, products:[{id:'p'}], invoices:[{id:'i', items:[{costSnapshot:null}]}]};
  const before = structuredClone(state), latest = {id:'main', companyName:'Stored', logo:'wfmedia:latest'};
  let commit, hydrate, committed;
  const pending = persist({state, draft:material(), creating:true, now,
    writeBatch:operations => { committed = operations[0].merge(latest, operations[0].value); return new Promise(resolve => {commit = () => resolve([committed]);}); },
    hydrate:record => new Promise(resolve => {hydrate = () => resolve({...record, logo:'data:image/png;base64,latest'});})
  });
  assert.deepEqual(state, before);
  commit(); await Promise.resolve();
  assert.deepEqual(state, before);
  hydrate(); const saved = await pending;
  assert.equal(state.settings.companyName, 'Stored');
  assert.equal(state.settings.logo, 'data:image/png;base64,latest');
  assert.equal(saved.id, 'wood');
  assert.deepEqual(state.products, before.products);
  assert.deepEqual(state.invoices, before.invoices);
});

test('failed catalog commits leave application state and user draft intact', async () => {
  const state = {settings:{companyName:'Kept'}}, input = material(), before = structuredClone({state,input});
  await assert.rejects(fn('persistMaterial')({state, draft:input, creating:true, now, writeBatch:async () => {throw new Error('quota');}}), /quota/);
  assert.deepEqual({state,input}, before);
});

test('legacy settings updates preserve the latest catalog including null/future formats and intentional absence', () => {
  const preserve = fn('preserveLibrary');
  for (const library of [null,{version:99,materials:'future'}, {version:1,materials:[material()]}]) {
    const latest = {id:'main',materialLibrary:library,logo:'wfmedia:latest'};
    const patch = {id:'main',companyName:'New name',materialLibrary:{version:1,materials:[]}};
    const before = structuredClone({latest,patch}), result = preserve(latest,patch);
    assert.deepEqual(result.materialLibrary,library);
    assert.equal(result.companyName,'New name'); assert.equal(result.logo,'wfmedia:latest');
    assert.deepEqual({latest,patch},before);
  }
  assert.equal(Object.hasOwn(preserve({id:'main'},{id:'main',materialLibrary:{version:1,materials:[material()]}}),'materialLibrary'),false);
});

test('refreshing a linked product cannot rewrite historical invoice snapshots', () => {
  const row = fn('createLinkedRow')(material(), draft(), 'bom-1');
  const oldProduct = {id:'p', costing:costing.prepareCosting(draft({materials:[row]}), 'sale-date')};
  const invoice = costing.captureInvoiceCosts({items:[{productId:'p', qty:1}, {productId:'p', qty:1, costSnapshot:null}]}, [oldProduct], 'sale-date');
  const before = structuredClone(invoice);
  const updated = fn('applyLinkedPrice')(draft({materials:[row]}), 'bom-1', material({unitPrice:1000, updatedAt:'new'}));
  const newProduct = {id:'p', costing:costing.prepareCosting(updated, 'new')};
  assert.deepEqual(costing.captureInvoiceCosts(invoice, [newProduct], 'new'), before);
  assert.notEqual(newProduct.costing.unitCostUSD, oldProduct.costing.unitCostUSD);
});
