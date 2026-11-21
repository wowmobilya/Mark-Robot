'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const corePath = path.join(__dirname, '..', 'product-cost-core.js');
const uiPath = path.join(__dirname, '..', 'product-costs.js');
const core = fs.existsSync(corePath) ? require(corePath) : {};
const ui = fs.existsSync(uiPath) ? require(uiPath) : {};
const fn = name => { assert.equal(typeof core[name], 'function', name + ' is implemented'); return core[name]; };
const rates = {usdTry:40, usdEur:0.92};
const draft = extra => ({currency:'USD', materials:[], labor:'', overhead:'', rates:{...rates}, ...extra});
const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-8, `${actual} should equal ${expected}`);

test('cost calculation multiplies each material quantity and includes labor and overhead once', () => {
  const result = fn('calculateCosting')(draft({materials:[
    {id:'wood', name:'Wood', unit:'m²', quantity:'2', unitPrice:'10'},
    {id:'screws', name:'Screws', unit:'piece', quantity:'3', unitPrice:'0.5'}
  ], labor:'4', overhead:'2'}));
  assert.equal(result.materialTotal, 21.5);
  assert.equal(result.total, 27.5);
  assert.equal(result.unitCostUSD, 27.5);
  assert.equal(result.known, true);
});

test('an entirely unentered cost stays unknown while explicit zero is a known cost', () => {
  const calculate = fn('calculateCosting');
  assert.equal(calculate(draft()).unitCostUSD, null);
  assert.equal(calculate(draft({materials:[{name:'', unit:'', quantity:'', unitPrice:''}]})).known, false);
  const free = calculate(draft({labor:'0'}));
  assert.equal(free.unitCostUSD, 0);
  assert.equal(free.known, true);
});

test('incomplete material rows cannot silently become free materials', () => {
  const calculate = fn('calculateCosting');
  for (const row of [
    {name:'Wood', quantity:'', unitPrice:'10'},
    {name:'Wood', quantity:'2', unitPrice:''},
    {name:'', quantity:'2', unitPrice:'10'}
  ]) assert.throws(() => calculate(draft({materials:[row]})), error => error.code === 'MATERIAL_INCOMPLETE');
});

test('invalid, negative and non-finite amounts are rejected instead of coerced to zero', () => {
  const calculate = fn('calculateCosting');
  for (const value of ['abc', '12x', '-1', Infinity, NaN, true, {}, '1e999']) {
    assert.throws(() => calculate(draft({labor:value})), error => error.code === 'INVALID_AMOUNT');
  }
  assert.throws(() => calculate(draft({materials:[{name:'Wood', quantity:-2, unitPrice:10}]})), error => error.code === 'INVALID_AMOUNT');
  assert.throws(() => calculate(draft({materials:[{name:'Wood', quantity:1e200, unitPrice:1e200}]})), error => error.code === 'INVALID_AMOUNT');
});

test('saved TRY and EUR costs use their saved rates to calculate canonical USD', () => {
  const calculate = fn('calculateCosting');
  near(calculate(draft({currency:'TRY',labor:1000})).unitCostUSD, 25);
  near(calculate(draft({currency:'EUR',labor:23})).unitCostUSD, 25);
});

test('USD cost needs no foreign exchange quote and foreign costs require their own valid quote', () => {
  const calculate = fn('calculateCosting');
  assert.equal(calculate(draft({labor:10,rates:{}})).unitCostUSD,10);
  for (const value of [0,-1,Infinity,'',null,'bad']) {
    assert.throws(() => calculate(draft({currency:'TRY',labor:100,rates:{usdTry:value}})), error => error.code === 'INVALID_RATE');
  }
  assert.throws(() => calculate(draft({currency:'GBP',labor:10})), error => error.code === 'INVALID_CURRENCY');
});

test('currency changes convert every entered money field without changing quantities or empty inputs', () => {
  const original = draft({currency:'TRY',materials:[{id:'a',name:'Wood',unit:'m²',quantity:'2',unitPrice:'400'}, {id:'b',name:'',unit:'',quantity:'',unitPrice:''}],labor:'200',overhead:''});
  const before = structuredClone(original);
  const converted = fn('convertDraftCurrency')(original,'EUR');
  assert.equal(converted.currency,'EUR');
  near(Number(converted.materials[0].unitPrice),9.2);
  near(Number(converted.labor),4.6);
  assert.equal(converted.materials[0].quantity,'2');
  assert.equal(converted.materials[1].unitPrice,'');
  assert.equal(converted.overhead,'');
  assert.deepEqual(original,before);
  const roundTrip = core.convertDraftCurrency(converted,'TRY');
  near(Number(roundTrip.materials[0].unitPrice),400);
});

test('currency conversion fails atomically when the destination rate is invalid', () => {
  const original = draft({labor:'10',rates:{usdTry:40,usdEur:0}});
  const before = structuredClone(original);
  assert.throws(() => fn('convertDraftCurrency')(original,'EUR'), error => error.code === 'INVALID_RATE');
  assert.deepEqual(original,before);
});

test('changing a rate snapshot preserves canonical costs while converting the draft amounts', () => {
  const original = draft({currency:'TRY',labor:'1000'});
  const updated = fn('rebaseDraftRates')(original,{usdTry:50,usdEur:1});
  assert.equal(Number(updated.labor),1250);
  assert.equal(updated.rates.usdTry,50);
  near(fn('calculateCosting')(updated).unitCostUSD,25);
});

test('persisted costing keeps missing component values null and preserves monetary precision', () => {
  const saved = fn('prepareCosting')(draft({labor:'0.12345678'}),'2026-11-20T12:00:00.000Z');
  assert.equal(saved.version,1);
  assert.equal(saved.unitCostUSD,0.12345678);
  assert.equal(saved.overhead,null);
  assert.equal(saved.updatedAt,'2026-11-20T12:00:00.000Z');
  assert.deepEqual(saved.rates,rates);
});

test('margin and markup have distinct denominators and zero sales has no percentage', () => {
  const compare = fn('comparePrice');
  const result = compare(60,100);
  assert.equal(result.profitUSD,40);
  near(result.margin,0.4);
  near(result.markup,2/3);
  assert.equal(compare(10,0).margin,null);
  assert.equal(compare(null,100).profitUSD,null);
  assert.equal(compare(0,100).margin,1);
});

test('invoice capture clones data, respects existing snapshots, and freezes unknown costs', () => {
  const capture = fn('captureInvoiceCosts');
  const products = [{id:'p1',costing:{version:1,currency:'USD',unitCostUSD:25,rates,updatedAt:'yesterday'}}, {id:'p2'}];
  const invoice = {id:'inv',items:[
    {productId:'p1',qty:2},
    {productId:'p1',qty:1,costSnapshot:{version:1,unitCostUSD:0,capturedAt:'old'}},
    {productId:'p1',qty:1,costSnapshot:null},
    {productId:'p2',qty:1}
  ]};
  const before = structuredClone(invoice);
  const result = capture(invoice,products,'2026-11-20T12:00:00.000Z');
  assert.equal(result.items[0].costSnapshot.unitCostUSD,25);
  assert.equal(result.items[0].costSnapshot.capturedAt,'2026-11-20T12:00:00.000Z');
  assert.deepEqual(result.items[1].costSnapshot,before.items[1].costSnapshot);
  assert.equal(result.items[2].costSnapshot,null);
  assert.equal(result.items[3].costSnapshot,null);
  assert.deepEqual(invoice,before);
  products[0].costing.unitCostUSD=999;
  assert.equal(capture(result,products).items[0].costSnapshot.unitCostUSD,25);
});

test('invalid stored product cost is unknown and cannot become an infinite invoice snapshot', () => {
  const capture=fn('captureInvoiceCosts');
  for(const value of [null,'',-1,Infinity,'bad',true]){
    const result=capture({items:[{productId:'p'}]},[{id:'p',costing:{unitCostUSD:value}}]);
    assert.equal(result.items[0].costSnapshot,null);
  }
});

test('invoice profit subtracts quantity-adjusted saved cost from discounted sales excluding tax', () => {
  const result = fn('invoiceSummary')({subtotalUSD:120,discountUSD:20,kdvAmtUSD:20,grandTotal:120,items:[{qty:3,totalUSD:120,costSnapshot:{unitCostUSD:25}}]});
  assert.equal(result.status,'complete');
  assert.equal(result.knownCostUSD,75);
  assert.equal(result.netSalesUSD,100);
  assert.equal(result.profitUSD,25);
  assert.equal(result.margin,0.25);
  assert.equal(result.unknownCount,0);
});

test('partial costs remain visibly partial and do not imply full invoice profit', () => {
  const result = fn('invoiceSummary')({subtotalUSD:100,discountUSD:0,items:[{qty:2,totalUSD:60,costSnapshot:{unitCostUSD:10}},{qty:1,totalUSD:40}]});
  assert.equal(result.status,'partial');
  assert.equal(result.knownCostUSD,20);
  assert.equal(result.unknownCount,1);
  assert.equal(result.profitUSD,null);
  assert.equal(result.margin,null);
});

test('summary never reads current product costs and rejects invalid quantities and malformed snapshots', () => {
  const summarize = fn('invoiceSummary');
  const unknown = summarize({subtotalUSD:100,items:[{productId:'p',qty:1,unitCostUSD:2,costing:{unitCostUSD:2}}]});
  assert.equal(unknown.status,'unknown');
  assert.equal(unknown.profitUSD,null);
  for(const value of [null,'',-1,Infinity,true]){
    const malformed=summarize({items:[{qty:2,costSnapshot:{unitCostUSD:value}}]});
    assert.equal(malformed.unknownCount,1);
  }
  const invalid=summarize({items:[{qty:-1,costSnapshot:{unitCostUSD:25}}]});
  assert.equal(invalid.status,'invalid');
  assert.equal(invalid.profitUSD,null);
});

test('zero quantity does not invent uncosted units and all-zero sales has no margin', () => {
  const result=fn('invoiceSummary')({subtotalUSD:0,items:[{qty:0},{qty:1,costSnapshot:{unitCostUSD:0}}]});
  assert.equal(result.unknownCount,0);
  assert.equal(result.profitUSD,0);
  assert.equal(result.margin,null);
});

test('cost save waits for commit, preserves latest unrelated record changes, and then updates local state', async () => {
  assert.equal(typeof ui.persistProductCosting,'function');
  const original={id:'p',name:'Original',image:'hydrated-image',priceA:100};
  const state={products:[original]};
  let commit;
  const writeBatch=async operations=>{
    const op=operations[0];
    assert.equal(op.type,'merge');assert.equal(op.store,'products');assert.equal(op.id,'p');
    const latest={id:'p',name:'Edited elsewhere',image:'stored-image',priceA:120,customFlag:true};
    const row=op.merge(latest,op.value);
    await new Promise(resolve=>{commit=resolve;});
    return [row];
  };
  const pending=ui.persistProductCosting({state,productId:'p',draft:draft({labor:25}),writeBatch,hydrate:row=>({...row,image:'hydrated-image'})});
  assert.equal(state.products[0],original);
  commit();
  const saved=await pending;
  assert.equal(saved.name,'Edited elsewhere');
  assert.equal(saved.priceA,120);
  assert.equal(saved.customFlag,true);
  assert.equal(saved.image,'hydrated-image');
  assert.equal(saved.costing.unitCostUSD,25);
  assert.equal(state.products[0],saved);
});

test('write failure preserves both product state and the editable draft without a false saved result', async () => {
  assert.equal(typeof ui.persistProductCosting,'function');
  const original={id:'p',name:'Original',costing:{unitCostUSD:10}};
  const state={products:[original]},input=draft({labor:'25'}),before=structuredClone(input);
  const error=new Error('Disk full');
  await assert.rejects(ui.persistProductCosting({state,productId:'p',draft:input,writeBatch:async()=>{throw error;}}),error);
  assert.equal(state.products[0],original);
  assert.deepEqual(input,before);
});

test('deletion during an edit cannot resurrect a removed product through a costing save', async () => {
  assert.equal(typeof ui.persistProductCosting,'function');
  const original={id:'p',name:'Original'},state={products:[original]};
  await assert.rejects(ui.persistProductCosting({state,productId:'p',draft:draft({labor:25}),writeBatch:async operations=>[operations[0].merge(undefined,operations[0].value)]}),error=>error.code==='MISSING_PRODUCT');
  assert.equal(state.products[0],original);
});
