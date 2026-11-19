const test = require('node:test');
const assert = require('node:assert/strict');
test('transfer posts both native amounts together and rejects an incomplete pair', async () => {
  const { makeEntry, cashRows } = await import('../cashboxes.mjs');
  const data = {currency:'TRY', type:'transfer', amount:'2.15', target:'SYP', received:'700'};
  const entry = makeEntry(data,'1','2026-11-18');
  assert.equal(cashRows([entry],[],'TRY')[0].units,-215);
  assert.equal(cashRows([entry],[],'SYP')[0].units,70000);
  for (const invalid of [{target:'TRY'},{received:''},{amount:'-1'},{amount:'0.001'}])
    assert.throws(()=>makeEntry({...data,...invalid},'2','2026-11-18'));
});
test('cash invoice payment uses native amount exactly once and excludes cards', async () => {
  const {cashRows}=await import('../cashboxes.mjs');
  const {collectPayments}=require('../account-statement-core.js');
  const p={id:'p',invoiceId:'i',receiptType:'cash',amount:10,originalAmount:400,originalCurrency:'TRY'};
  const {groups}=collectPayments([{id:'i',payments:[p]}],[p,{...p,id:'q',receiptType:'card'}]);
  assert.deepEqual(cashRows([],groups.get('i'),'TRY').map(row=>row.units),[40000]);
  assert.deepEqual(cashRows([],groups.get('i'),'USD'),[]);
});
