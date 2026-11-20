const test=require('node:test'),assert=require('node:assert/strict');
const fx=require('../currency-sources');
const rejectNetwork=()=>assert.fail('Unexpected network request');
const manual={id:'sultan',side:'sell',mode:'manual',usd:'40,25',eur:'50'};
const posted={id:'usdTry',value:40.25,eur:.805,time:'2025-01-02T14:00:00Z',updatedAt:null,source:{id:'sultan',side:'sell',mode:'manual',via:null}};

test('manually entered Turkish board quotes use the chosen side and preserve accounting units',async()=>{
  const data=await fx.getQuote(manual,rejectNetwork,rejectNetwork);
  assert.equal(data.usdTry,40.25);assert.equal(data.usdEur,.805);assert.equal(data.usdTry/data.usdEur,50);
  assert.equal(data.updatedAt,null);assert.deepEqual(data.source,posted.source);
  assert.deepEqual(fx.fromBoard('٤٠٫٢٥','۵۰'),{usdTry:40.25,usdEur:.805});
  for(const x of ['0','-10','3abc','1e4','',Infinity,'1.2.4']) assert.throws(()=>fx.fromBoard(x,50));
});
test('TCMB reference uses a single dated provider and never falls through to a different provider',async()=>{
  const rows=[{base:'USD',quote:'TRY',date:'2025-01-02',rate:40},{base:'USD',quote:'EUR',date:'2025-01-02',rate:.9}];
  const tcmb={id:'tcmb',side:'reference',mode:'feed'};
  const data=await fx.getQuote(tcmb,async(url)=>{
    assert.equal(url,'https://api.frankfurter.dev/v2/providers/tcmb/rates?base=USD&quotes=TRY,EUR');
    return {ok:true,json:async()=>rows};
  },rejectNetwork);
  assert.equal(data.source.via,'frankfurter'); assert.equal(data.source.dateOnly,true); assert.equal(data.updatedAt,'2025-01-02');
  await assert.rejects(()=>fx.getQuote(tcmb,async()=>({ok:false}),rejectNetwork));
  assert.throws(()=>fx.referenceRows([rows[0],{...rows[1],date:'2025-01-01'}]));
  assert.throws(()=>fx.referenceRows([rows[0],{...rows[1],base:'EUR'}]));
  assert.throws(()=>fx.referenceRows(rows.map(r=>({...r,date:'2025-02-31'}))));
});
test('TCMB bulletin reads ForexBuying or ForexSelling and accounts for unit on each row',()=>{
  const rates={USD:{Unit:'1',ForexBuying:'40',ForexSelling:'41'},EUR:{Unit:'100',ForexBuying:'5000',ForexSelling:'5200'}};
  const doc={documentElement:{nodeName:'Tarih_Date',getAttribute:()=> '02.01.2025',querySelectorAll(selector){
    const values=rates[selector.includes('USD')?'USD':'EUR'];
    return [{querySelector:key=>({textContent:values[key]})}];
  }}};
  assert.deepEqual(fx.bulletin(doc,'buy'),{usdTry:40,usdEur:.8,updatedAt:'2025-01-02'});
  assert.deepEqual(fx.bulletin(doc,'sell'),{usdTry:41,usdEur:41/52,updatedAt:'2025-01-02'});
  rates.EUR.Unit='0';assert.throws(()=>fx.bulletin(doc,'buy'));
});
test('manual-only providers cannot be attributed to an online feed; restored preferences are validated',async()=>{
  assert.equal(fx.normalizeSource({...manual,id:'toString'}),null);
  for(const id of ['mizan','sultan','ziraat','isbank','garanti','manual']) {
    assert.equal(fx.normalizeSource({id,side:'buy',mode:'feed',via:'tcmb'}),null);
  }
  assert.equal(fx.normalizeSource({id:'tcmb',side:'buy',mode:'feed',via:'frankfurter'}),null);
  const x=fx.normalizeSource({...manual,id:'mizan',url:'javascript:alert(1)'});
  assert.equal(x.url,undefined); assert.equal(fx.catalog.mizan.url,undefined);
  await assert.rejects(()=>fx.getQuote({...manual,id:'mizan',url:'http://example.com'},rejectNetwork,rejectNetwork));
  assert.equal(fx.safeUrl('https://user:password@example.com'),'');
  assert.equal(fx.safeUrl('https://example.com/rates'),'https://example.com/rates');
  const result=await fx.getQuote({id:'market',mode:'feed',side:'reference'},rejectNetwork,async()=>({usdTry:42,usdEur:.9,updatedAt:null,via:'exchangerate'}));
  assert.equal(result.source.via,'exchangerate');assert.equal(result.source.dateOnly,undefined);
  for(const lang of ['ar','en','tr','fr','ru']) for(const id of Object.keys(fx.catalog)) assert.ok(fx.name(id,lang));
});
function database(rows,{fail=false}={}) {
  return {transaction(name,mode){
    assert.equal(name,'settings');assert.equal(mode,'readwrite');
    const next=new Map(rows),requests=[];
    const store={get(key){const req={result:next.get(key)};requests.push(req);return req;},put(value){next.set(value.id,value);}};
    let aborted=false;
    const tx={objectStore:()=>store,abort(){aborted=true;}};
    queueMicrotask(()=>{
      for(const req of requests) req.onsuccess?.();
      if(aborted||fail)tx.onabort();
      else{rows.clear();for(const [key,value] of next) rows.set(key,value);tx.oncomplete();}
    });
    return tx;
  }};
}
test('atomic writes merge raw current settings, preserve media and metadata, and protect all existing rates on boot',async()=>{
  const main={id:'main',companyName:'Concurrent edit',logo:{__mediaId:'unchanged'},manualUsdTry:37,manualUsdEur:null};
  const rows=new Map([['main',main],['usdTry',{id:'usdTry',value:37,eur:.8,time:null,memo:'keep'}]]);
  const expected={manualUsdTry:37,time:null,source:null};
  global.initDB=async()=>database(rows);
  try {
    await assert.rejects(()=>fx.commitQuote(posted,expected,true));
    assert.equal(rows.get('main'),main);
    await fx.commitQuote(posted,expected,false);
    assert.deepEqual(rows.get('main'),{...main,manualUsdTry:null,manualUsdEur:null});
    assert.deepEqual(rows.get('usdTry'),{...posted,memo:'keep'});
    await assert.rejects(()=>fx.commitQuote({...posted,value:1},expected,false));
    assert.equal(rows.get('usdTry').value,40.25);
  } finally {delete global.initDB;}
});
test('a transaction failure keeps both saved overrides and rates unchanged',async()=>{
  const rows=new Map([['main',{id:'main',manualUsdEur:.85}]]);
  global.initDB=async()=>database(rows,{fail:true});
  try {
    await assert.rejects(()=>fx.commitQuote(posted,{manualUsdEur:.85},false));
    assert.equal(rows.get('main').manualUsdEur,.85);assert.equal(rows.has('usdTry'),false);
  } finally {delete global.initDB;}
});
test('freshness protects automatic quotes from stale, future and publication rollback without rejecting manual quotes',async()=>{
  const source={id:'market',side:'reference',mode:'feed',via:'exchangerate'};
  const now=Date.parse('2026-11-20T12:00:00Z');
  const previous={source,updatedAt:'2026-11-20T08:00:00Z'};
  assert.throws(()=>fx.validatePublication({source,updatedAt:'2020-01-02'},previous,now),/stale/);
  assert.throws(()=>fx.validatePublication({source,updatedAt:'2026-11-22'},previous,now),/stale/);
  assert.throws(()=>fx.validatePublication({source,updatedAt:'2026-11-19'},previous,now),/stale/);
  assert.throws(()=>fx.validatePublication({source,updatedAt:null},previous,now),/stale/);
  const daily={...source,via:'frankfurter'};
  assert.doesNotThrow(()=>fx.validatePublication({source:daily,updatedAt:'2026-11-20'},previous,now));
  assert.doesNotThrow(()=>fx.validatePublication({source:daily,updatedAt:'2026-11-18'}, {},now));
  assert.doesNotThrow(()=>fx.validatePublication(posted,previous,now));
  global.initDB=async()=>assert.fail('Stale data must be rejected before opening a write transaction');
  try {await assert.rejects(()=>fx.commitQuote({...posted,source,updatedAt:'2020-01-02'},previous,false),/stale/);}
  finally {delete global.initDB;}
});
test('manual settings apply even without a saved rate row and restored source metadata is normalized',()=>{
  assert.deepEqual(fx.initialRates({manualUsdTry:41,manualUsdEur:.82}),{usdTry:41,usdEur:.82,rateTime:null,rateUpdatedAt:null,rateSource:null,rateHasSaved:false});
  const result=fx.initialRates({},posted);
  assert.equal(result.usdTry,40.25);assert.equal(result.usdEur,.805);assert.equal(result.rateHasSaved,true);assert.deepEqual(result.rateSource,posted.source);
  assert.equal(fx.initialRates({}, {...posted,source:{id:'sultan',mode:'feed',side:'sell',via:'frankfurter'}}).rateSource,null);
});

test('the complete bank directory preserves source IDs and remains manual for every bank',async()=>{
  const directory=require('../currency-bank-catalog.js');
  assert.ok(directory.banks.length>=60,'The source chooser must load the complete official bank directory');
  for(const bank of directory.banks){
    assert.equal(fx.catalog[bank.id]?.group,'banks');
    assert.equal(fx.catalog[bank.id].officialName,bank.officialName);
    for(const language of ['ar','en','tr','fr','ru'])assert.equal(fx.name(bank.id,language),bank.name[language]);
    const source={id:bank.id,side:'buy',mode:'manual'};
    const quote=await fx.getQuote({...source,usd:'40',eur:'50'},rejectNetwork,rejectNetwork);
    assert.equal(quote.source.id,bank.id);assert.equal(quote.source.mode,'manual');assert.equal(quote.source.via,null);
    assert.equal(fx.normalizeSource({...source,mode:'feed',via:'frankfurter'}),null);
    assert.equal(fx.initialRates({}, {...posted,source:quote.source}).rateSource.id,bank.id);
    assert.deepEqual(fx.modes(bank.id,'buy'),['manual']);
  }
  assert.equal(fx.normalizeSource({id:'unlisted-bank',side:'buy',mode:'manual'}),null);
  assert.deepEqual(fx.modes('tcmb','reference'),['feed']);
  assert.deepEqual(fx.modes('tcmb','sell'),['feed','manual']);
});

test('source search handles translated names, Turkish accents, renamed-bank aliases, and category filters',()=>{
  const directory=require('../currency-bank-catalog.js');
  assert.ok(fx.searchSources({query:'TURKIYE IS BANKASI',lang:'en'}).includes('isbank'));
  assert.ok(fx.searchSources({query:'زراعات',lang:'ar'}).includes('ziraat'));
  for(const bank of directory.banks){
    for(const alias of bank.aliases||[])assert.ok(fx.searchSources({query:alias}).includes(bank.id),alias);
  }
  const bankIds=fx.searchSources({group:'banks'});
  assert.equal(bankIds.length,directory.banks.length);
  assert.equal(fx.searchSources({group:'banks',query:'sultan'}).length,0);
  for(const category of ['deposit','participation','development']){
    const ids=fx.searchSources({group:'banks',category});
    assert.equal(ids.length,directory.banks.filter(bank=>bank.category===category).length);
    assert.ok(ids.every(id=>fx.catalog[id].category===category));
  }
  assert.equal(fx.searchSources({query:'bank-that-is-not-listed-xyz'}).length,0);
});
