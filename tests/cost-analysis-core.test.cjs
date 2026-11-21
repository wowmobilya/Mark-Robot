const test = require('node:test');
const assert = require('node:assert/strict');
const analysis = require('../cost-analysis-core.js');

function product(id, name, cost, prices = {}) {
  return {id,name,barcode:'SKU-'+id,color:'Walnut',costing:{unitCostUSD:cost,currency:'TRY',updatedAt:'2026-11-20T13:00:00Z'},...prices};
}
const items = [
  product(1,'Étoile',60,{priceA:100,priceB:50,priceC:0}),
  product(2,'Arda',null,{priceA:10,priceB:80}),
  product(3,'Zero',0,{priceA:0,priceB:0}),
  product(4,'Legacy','20',{priceUSD:25})
];
const report = (options,products=items) => analysis.analyze(products,options);
const ids = result => result.rows.map(row=>row.id);

test('the selected saved tier controls unit profit, margin and loss counts', () => {
  const a=report({tier:'A'}), b=report({tier:'B'}), c=report({tier:'C'});
  const one=r=>r.rows.find(row=>row.id===1);
  assert.deepEqual([one(a).cost,one(a).price,one(a).profit,one(a).margin],[60,100,40,0.4]);
  assert.deepEqual([one(b).price,one(b).profit,one(b).margin],[50,-10,-0.2]);
  assert.deepEqual([one(c).price,one(c).profit,one(c).margin],[0,-60,null]);
  assert.deepEqual(b.counts,{all:4,belowCost:1,missingCost:1,missingPrice:1});
  assert.deepEqual([one(a).costCurrency,one(a).costUpdatedAt],['TRY','2026-11-20T13:00:00Z']);
});

test('legacy A falls back only when its field is absent; empty, invalid and zero tier prices stay distinct', () => {
  const rows=report({tier:'A'},[
    product('legacy','Legacy',10,{priceUSD:15}),product('null','Null',10,{priceA:null,priceUSD:15}),
    product('zero','Zero',10,{priceA:0,priceUSD:15}),product('blank','Blank',10,{priceA:' ',priceUSD:15}),
    product('bad','Bad',10,{priceA:-3,priceUSD:15})
  ]).rows;
  const at=id=>rows.find(row=>row.id===id);
  assert.equal(at('legacy').price,15); assert.equal(at('legacy').priceSource,'priceUSD');
  for(const id of ['null','blank','bad'])assert.equal(at(id).price,null);
  assert.equal(at('zero').price,0); assert.equal(at('zero').profit,-10); assert.equal(at('zero').margin,null);
  assert.equal(report({tier:'B'}).rows.find(row=>row.id===4).price,null);
});

test('keeps authoritative saved USD costs separate from drafts, current raw BOM prices and invoice snapshots', () => {
  const p=product(1,'Frozen',12,{priceA:26,costSnapshot:{unitCostUSD:200}});
  p.costing.materials=[{name:'Panel',quantity:12,unitPrice:400}]; p.costing.rates={usdTry:0};
  const before=JSON.stringify(p), row=report({},[p]).rows[0];
  assert.equal(row.cost,12); assert.equal(row.profit,14); assert.equal(JSON.stringify(p),before);
  p.costing.unitCostUSD=null;
  assert.equal(report({},[p]).rows[0].profit,null);
  for(const v of [undefined,'',NaN,Infinity,-1,true,{}])assert.equal(report({},[product(1,'P',v,{priceA:10})]).rows[0].cost,null);
});

test('uses one confirmed display quote, converts losses with the same sign and preserves zero', () => {
  const rates=analysis.savedRates({manualUsdTry:40},{value:39,eur:0.92});
  assert.deepEqual(rates,{usdTry:40,usdEur:0.92});
  const b=report({tier:'B',currency:'TRY',rates});
  const one=b.rows.find(row=>row.id===1), zero=b.rows.find(row=>row.id===3);
  assert.deepEqual([one.cost,one.price,one.profit,one.margin],[2400,2000,-400,-0.2]);
  assert.deepEqual([zero.cost,zero.price,zero.profit,zero.margin],[0,0,0,null]);
  assert.equal(b.rate,40); assert.equal(b.currency,'TRY');
  assert.deepEqual(analysis.savedRates({manualUsdTry:0,manualUsdEur:'bad'},{value:15,eur:null}),{usdTry:15,usdEur:null});
  assert.deepEqual(analysis.savedRates({},null),{usdTry:null,usdEur:null});
});

test('a missing display rate keeps monetary values unknown while USD-based margin and status remain known', () => {
  const b=report({tier:'B',currency:'EUR',rates:{usdTry:39,usdEur:0}});
  const one=b.rows.find(row=>row.id===1);
  assert.equal(b.rate,null); assert.deepEqual([one.cost,one.price,one.profit,one.margin],[null,null,null,-0.2]);
  assert.equal(b.counts.belowCost,1); assert.equal(b.counts.missingCost,1);
  assert.equal(report({tier:'A',currency:'USD',rates:null}).rows.find(row=>row.id===1).price,100);
  const extreme=report({tier:'A'},[product(1,'P',1e308,{priceA:1e-310})]).rows[0];
  assert.equal(extreme.margin,null);
});

test('search, tier filters and sorted results stay consistent and sort unknowns last', () => {
  assert.deepEqual(ids(report({tier:'B',filter:'belowCost'})),[1]);
  assert.deepEqual(ids(report({tier:'A',filter:'missingCost'})),[2]);
  assert.deepEqual(ids(report({tier:'B',filter:'missingPrice'})),[4]);
  assert.deepEqual(ids(report({search:'ETOILE'})),[1]);
  assert.deepEqual(ids(report({search:'sku-3'})),[3]);
  assert.deepEqual(ids(report({search:'ışık',locale:'tr'},[product(1,'IŞIK',12,{priceA:25})])),[1]);
  assert.deepEqual(ids(report({tier:'A',sort:'marginAsc'})),[4,1,2,3]);
  assert.deepEqual(ids(report({tier:'A',sort:'profitDesc'})),[1,4,3,2]);
  const search=report({search:'missing'});
  assert.equal(search.rows.length,0); assert.equal(search.counts.all,4);
  assert.deepEqual(report({},[]).counts,{all:0,belowCost:0,missingCost:0,missingPrice:0});
});
