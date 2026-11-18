const test=require('node:test'),assert=require('node:assert/strict');const {formatTime,requestRates}=require('../rate-refresh');
test('time uses local timezone, twelve hours and localized day period and digits',()=>{
 const date=new Date(2026,10,17,15,7).toISOString();
 assert.match(formatTime(date,'en'),/3:07.*PM/);assert(!formatTime(date,'en').includes('15:'));
 assert.match(formatTime(date,'ar'),/3:07/);assert.match(formatTime(date,'ar'),/م/);
 for(const lang of ['tr','fr','ru'])assert(formatTime(date,lang).length>4);
 assert.match(formatTime('15:07:00','en'),/3:07.*PM/);
});
test('validates rates, falls back to original second source and keeps numeric precision',async()=>{
 let calls=0;const rates=await requestRates(async()=>({ok:true,json:async()=>++calls===1?{rates:{TRY:-3,EUR:0}}:{conversion_rates:{TRY:47.123456,EUR:.873456}}}));
 assert.equal(calls,2);assert.deepEqual(rates,{usdTry:47.1235,usdEur:.8735,updatedAt:null});
});
test('failure is explicit and does not invent a successful quote',async()=>{
 await assert.rejects(()=>requestRates(async()=>{throw new Error('offline')}),/rate-unavailable/);
});

test('preserves the provider quote timestamp independently of local refresh time',async()=>{
 const r=await requestRates(async()=>({ok:true,json:async()=>({rates:{TRY:40,EUR:.9},time_last_update_unix:1700000000})}));
 assert.equal(r.updatedAt,new Date(1700000000*1000).toISOString());
});

test('quote history validates observations and replaces duplicate provider timestamps',()=>{
 const {appendQuote,sparkPoints}=require('../rate-refresh');
 const first={at:'2026-11-10T00:00:00Z',try:40,eur:.9};
 const second={at:'2026-11-11T00:00:00Z',try:41,eur:.9};
 let history=appendQuote([],second);
 history=appendQuote(history,first);
 assert.deepEqual(history,[first,second]);
 assert.deepEqual(appendQuote(history,{...second,try:42}).map(p=>p.try),[40,42]);
 assert.deepEqual(appendQuote(history,{...second,try:0}),history);
 assert.equal(sparkPoints([40]),'');
 assert.equal(sparkPoints([40,40]),'2.00,12.00 98.00,12.00');
 assert.equal(sparkPoints([40,41]),'2.00,22.00 98.00,2.00');
});
