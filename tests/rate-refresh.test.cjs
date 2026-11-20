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

test('daily feed supplies two comparable observations on first visit and skips missing days',async()=>{
 const {dailyQuotes}=require('../rate-refresh');
 const feed={base:'USD',rates:{'2025-01-10':{EUR:.98,TRY:36},'2025-01-08':{EUR:.97,TRY:35},'2025-01-09':{EUR:0,TRY:35}}};
 const fetcher=async()=>({ok:true,json:async()=>feed});
 const points=await dailyQuotes(fetcher,new Date('2025-01-12'));
 assert.deepEqual(points.map(p=>p.try),[35,36]);
 feed.base='EUR';
 await assert.rejects(()=>dailyQuotes(fetcher,new Date('2025-01-12')));
});

function rateView(history=[]) {
 const fs=require('node:fs'),vm=require('node:vm'),observers=[];
 class Node {
  constructor(){this.children=[];this.dataset={};this.attributes={};this.classList={toggle(){}};this.textContent='';}
  append(...nodes){this.children.push(...nodes);}
  after(){}
  setAttribute(key,value){this.attributes[key]=String(value);}
  getAttribute(key){return this.attributes[key]??null;}
  replaceChildren(...nodes){this.children=nodes;}
 }
 const pairs=['usd-try','try-usd','eur-usd','usd-eur','eur-try','try-eur'];
 const cards=pairs.map(pair=>{const card=new Node();card.setAttribute('onclick',`openCurrCalc('${pair}')`);return card;});
 const button=new Node(),top=new Node(),grid=new Node(),time=new Node();
 top.querySelector=selector=>selector==='.curr-refresh'?button:null;
 top.parentElement={querySelectorAll:()=>cards,querySelector:()=>grid};
 const document={documentElement:{lang:'en',dir:'ltr'},querySelector:()=>top,querySelectorAll:()=>[button],
  createElement:()=>new Node(),createElementNS:namespace=>Object.assign(new Node(),{namespaceURI:namespace}),
  createTextNode(text){const node=new Node();node.textContent=text;return node;},getElementById:id=>id==='rateTime'?time:null};
 const S={lang:'en',settings:{},usdTry:41,usdEur:.92,rateTime:'2026-11-20T10:00:00Z',rateUpdatedAt:'2026-11-20',rateSource:{id:'market',side:'reference',mode:'feed',via:'frankfurter'}};
 let writes=0,requests=0;
 const window={document,updateRateUI(){},fetch(){requests++;throw Error('Unexpected request');},WFCurrencySources:{
  normalizeSource:value=>value,word:key=>key,describe:value=>value.id,mount:()=>({setState(){}})
 }};
 const localStorage={getItem:()=>JSON.stringify(history),setItem(){writes++;}};
 vm.runInNewContext(fs.readFileSync(require.resolve('../rate-refresh.js'),'utf8'),{
  window,document,S,localStorage,Intl,MutationObserver:class {constructor(callback){this.callback=callback;}observe(){observers.push(this.callback);}}
 });
 return {S,button,cards,counts:()=>({writes,requests}),trends:()=>cards.map(card=>card.children[0]),
  language(lang){S.lang=lang;document.documentElement.lang=lang;document.documentElement.dir=lang==='ar'?'rtl':'ltr';for(const callback of observers)callback([{attributeName:'lang'}]);}
 };
}

test('language-only changes refresh empty trend tooltips in all five languages',()=>{
 const view=rateView(),labels={en:'Trend unavailable',ar:'الاتجاه غير متاح بعد',tr:'Yön henüz mevcut değil',fr:'Tendance indisponible',ru:'Тенденция недоступна'};
 for(const [lang,label]of Object.entries(labels)){
  view.language(lang);
  for(const [index,trend]of view.trends().entries()){
   assert.equal(trend.title,label);
   assert.equal(view.cards[index].dataset.quoteTrend,'empty');
   assert.equal(trend.children[1].textContent,'');
  }
 }
 assert.deepEqual(view.counts(),{writes:0,requests:0});
});

test('language-only changes localize populated trend percentages without changing quotes or provenance',()=>{
 const source='market/reference/frankfurter',view=rateView([
  {at:'2026-11-19T00:00:00Z',try:40,eur:.9,source},
  {at:'2026-11-20T00:00:00Z',try:41,eur:.92,source}
 ]);
 const saved=JSON.stringify({...view.S,lang:undefined}),directions=view.cards.map(card=>card.dataset.quoteTrend);
 for(const lang of ['en','ar','tr','fr','ru']){
  view.language(lang);
  const format=new Intl.NumberFormat(lang==='ar'?'ar-u-nu-latn':lang,{style:'percent',maximumFractionDigits:2,signDisplay:'exceptZero'});
  assert.equal(view.trends()[0].children[1].textContent,format.format(1/40));
  assert.equal(view.trends()[1].children[1].textContent,format.format((1/41-1/40)/(1/40)));
  assert(view.trends().every(trend=>trend.title===''));
  assert.deepEqual(view.cards.map(card=>card.dataset.quoteTrend),directions);
  assert.equal(JSON.stringify({...view.S,lang:undefined}),saved);
 }
 assert.deepEqual(view.counts(),{writes:0,requests:0});
});
