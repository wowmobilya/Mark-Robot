const test=require('node:test');
const assert=require('node:assert/strict');
const {salesByCurrency}=require('../account-statement-core.js');
test('sales use each invoice rate, retain signed credits and exclude draft and duplicate records',()=>{
  const inv={id:'a',currency:'TL',grandTotal:10,usdTry:40};
  const totals=salesByCurrency([inv,inv,{...inv,id:'b',grandTotal:-2,usdTry:41},{...inv,id:'c',status:'draft'},
    {id:'d',currency:'EUR',grandTotal:2},{id:'e',grandTotal:1.25},{id:'f',currency:'SYP',grandTotal:2,usdSyp:50}]);
  assert.deepEqual(totals.get('TRY'),{units:31800,missing:0});
  assert.deepEqual(totals.get('EUR'),{units:0,missing:1});
  assert.equal(totals.get('USD').units,125);
  assert.equal(totals.get('SYP').units,10000);
});
