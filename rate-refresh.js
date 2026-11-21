/* Honest refresh state and localized twelve-hour quote timestamps. */
(function(root){'use strict';
 const sources=['https://api.exchangerate-api.com/v4/latest/USD','https://open.er-api.com/v6/latest/USD'];
 const locales={ar:'ar-u-nu-latn',tr:'tr-TR',en:'en-US',fr:'fr-FR',ru:'ru-RU'};
 function formatTime(value,lang){
  if(!value)return '';
  let date=new Date(value);
  if(Number.isNaN(date.getTime())){
   const parts=String(value).match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
   if(!parts)return String(value);
   date=new Date();date.setHours(Number(parts[1]),Number(parts[2]),Number(parts[3]||0),0);
  }
  const formatter=new Intl.DateTimeFormat(locales[lang]||locales.en,{hour:'numeric',minute:'2-digit',hour12:true});
  if(lang==='ar')return formatter.formatToParts(date).map(part=>part.type==='dayPeriod'?(date.getHours()<12?'ص':'م'):part.value).join('');
  return formatter.format(date);
 }
 async function requestRates(fetcher){
  for(const url of sources){try{
   const response=await fetcher(url,{signal:AbortSignal.timeout(5000)});
   if(response.ok===false)continue;
   const data=await response.json(),usdTry=data.rates?.TRY??data.conversion_rates?.TRY,usdEur=data.rates?.EUR??data.conversion_rates?.EUR;
   if((data.base_code||data.base||'USD')!=='USD'||(data.result && data.result!=='success'))continue;
   if(typeof usdTry==='number'&&Number.isFinite(usdTry)&&usdTry>0&&typeof usdEur==='number'&&Number.isFinite(usdEur)&&usdEur>0){
    const seconds=Number(data.time_last_update_unix||data.time_last_updated),stamp=seconds>0?new Date(seconds*1000):null;
    return {usdTry:Number(usdTry.toFixed(4)),usdEur:Number(usdEur.toFixed(4)),updatedAt:stamp&&!Number.isNaN(stamp.getTime())?stamp.toISOString():null};
   }
  }catch(_) {}}
  throw new Error('rate-unavailable');
 }
 const positive=value=>Number.isFinite(value)&&value>0;
 function appendQuote(history, quote) {
  const time=Date.parse(quote.at);
  if(!Number.isFinite(time)||!positive(quote.try)||!positive(quote.eur))return history;
  const points=history.filter(point=>point.at!==quote.at);
  points.push(quote);
  return points.sort((a,b)=>Date.parse(a.at)-Date.parse(b.at)).slice(-18);
 }
 async function dailyQuotes(fetcher,now=new Date()){
  const end=now.toISOString().slice(0,10);
  const start=new Date(now.getTime()-10*86400000).toISOString().slice(0,10);
  const response=await fetcher('https://api.frankfurter.dev/v1/'+start+'..'+end+'?base=USD&symbols=EUR,TRY',{signal:AbortSignal.timeout(4500)});
  if(!response.ok)throw Error('daily-quotes-unavailable');
  const data=await response.json();
  const quotes=[];
  if(data.base==='USD')for(const [date,rates] of Object.entries(data.rates||{})){
   if(date<start||date>end||!/^\d{4}-\d{2}-\d{2}$/.test(date)||!positive(rates?.TRY)||!positive(rates?.EUR))continue;
   quotes.push({at:date+'T00:00:00.000Z',try:rates.TRY,eur:rates.EUR,source:'frankfurter'});
  }
  quotes.sort((a,b)=>a.at.localeCompare(b.at));
  if(quotes.length<2)throw Error('incomplete-daily-quotes');
  return quotes;
 }
 function sparkPoints(values) {
  if(values.length<2)return '';
  const min=Math.min(...values),max=Math.max(...values);
  return values.map((value,index)=>{
   const x=2+index*96/(values.length-1);
   const y=max===min?12:22-(value-min)*20/(max-min);
   return x.toFixed(2)+','+y.toFixed(2);
  }).join(' ');
 }
 if(typeof module!=='undefined'&&module.exports){module.exports={formatTime,requestRates,appendQuote,sparkPoints,dailyQuotes};return;}
 const copy={
  ar:{refresh:'تحديث الأسعار',loading:'جارٍ تحديث الأسعار…',ok:'تم تحديث الأسعار',failed:'تعذر التحديث؛ الأسعار السابقة محفوظة',manual:'تم التحديث مع إبقاء الأسعار اليدوية',unsaved:'تم التحديث؛ تعذر حفظه على الجهاز',last:'آخر تحديث'},
  tr:{refresh:'Kurları yenile',loading:'Kurlar güncelleniyor…',ok:'Kurlar güncellendi',failed:'Güncellenemedi; önceki kurlar korundu',manual:'Manuel kurlar korunarak güncellendi',unsaved:'Güncellendi; cihaza kaydedilemedi',last:'Son güncelleme'},
  en:{refresh:'Refresh rates',loading:'Updating rates…',ok:'Rates updated',failed:'Update failed; previous rates kept',manual:'Updated; manual rates kept',unsaved:'Updated; could not save on this device',last:'Last updated'},
  fr:{refresh:'Actualiser les taux',loading:'Actualisation des taux…',ok:'Taux actualisés',failed:'Échec ; taux précédents conservés',manual:'Actualisé ; taux manuels conservés',unsaved:'Actualisé ; enregistrement impossible',last:'Dernière actualisation'},
  ru:{refresh:'Обновить курсы',loading:'Обновление курсов…',ok:'Курсы обновлены',failed:'Не удалось обновить; прежние курсы сохранены',manual:'Обновлено; ручные курсы сохранены',unsaved:'Обновлено; не удалось сохранить',last:'Обновлено'}
 };
 const fx=root.WFCurrencySources;
 // A partially updated offline shell must not run the old generic feed for a named source.
 if(!fx){root.fetchRate=async()=>{root.showToast?.((copy[S.lang]||copy.en).failed,'in');return false;};return;}
 const text=()=>copy[S.lang]||copy.en;
 const top=document.querySelector('#currBar .curr-bar-top'),button=top?.querySelector('.curr-refresh');
 if(!top||!button)return;
 const label=document.createElement('span');label.className='wf-refresh-label';button.append(label);
 const status=document.createElement('div');status.className='wf-rate-status';status.setAttribute('role','status');status.setAttribute('aria-live','polite');status.setAttribute('aria-atomic','true');top.after(status);
 const origin=document.createElement('div');origin.className='wf-fx-origin';status.after(origin);
 const historyKey='wf_market_quotes_v1';
 let history=[];
 try {
  const stored=JSON.parse(localStorage.getItem(historyKey)||'[]');
  if(Array.isArray(stored))history=stored.reduce((all,point)=>point?appendQuote(all,point):all,[]);
 } catch (_) {}
 function remember(quote){
  history=appendQuote(history,quote);
  try { localStorage.setItem(historyKey,JSON.stringify(history)); } catch (_) {}
 }
 const pairs={
  'usd-try':point=>point.try,
  'eur-usd':point=>1/point.eur,
  'try-usd':point=>1/point.try,
  'usd-eur':point=>point.eur,
  'eur-try':point=>point.try/point.eur,
  'try-eur':point=>point.eur/point.try,
 };
 const trendFormats=new Map();
 const cards=Array.from(top.parentElement.querySelectorAll('.curr-item'),card=>{
  const pair=card.getAttribute('onclick')?.match(/'([^']+)'/)?.[1];
  const trend=document.createElement('span');
  trend.className='wf-market-trend wf-quote-trend';
  trend.dir='ltr';
  card.append(trend);
  return {pair,card,trend,lastTrend:''};
 });
 // Keep each quote beside its inverse in both the visual and keyboard order.
 const pairOrder=['usd-try','try-usd','eur-usd','usd-eur','eur-try','try-eur'];
 const grid=top.parentElement.querySelector('.curr-bar-grid');
 for(const pair of pairOrder){
  const item=cards.find(item=>item.pair===pair);
  if(item)grid.append(item.card);
 }
 function renderTrends(){
  const lang=Object.hasOwn(locales,S.lang)?S.lang:'en';
  if(!trendFormats.has(lang)){
   const percent=new Intl.NumberFormat(locales[lang],{style:'percent',maximumFractionDigits:2,signDisplay:'exceptZero'});
   const threshold=percent.formatToParts(.0001).filter(part=>part.type!=='plusSign').map(part=>part.value).join('');
   trendFormats.set(lang,{percent,threshold});
  }
  const {percent,threshold}=trendFormats.get(lang);
  for(const quote of cards){
   const {pair,card,trend}=quote;
   const manual=(pair.includes('try')&&S.settings.manualUsdTry)||(pair.includes('eur')&&S.settings.manualUsdEur);
   const latest=history.at(-1);
   const source=fx.normalizeSource(S.rateSource);
   const comparison=source?source.id+'/'+source.side+'/'+source.via:latest?.source;
   const prices=manual||source?.mode==='manual'?[]:history.filter(p=>p.source===comparison).map(pairs[pair]);
   const hasTrend=prices.length>1;
   const delta=hasTrend?(prices.at(-1)-prices.at(-2))/prices.at(-2):0;
   const change=delta!==0 && Math.abs(delta)<0.0001 ? (delta>0?'+':'−')+'<'+threshold : percent.format(delta);
   const direction=!hasTrend?'empty':delta===0?'flat':delta>0?'up':'down';
   const signature=JSON.stringify([lang,hasTrend?history.at(-1).at:null,direction,change]);
   if(quote.lastTrend===signature)continue;
   quote.lastTrend=signature;
   card.dataset.quoteTrend=direction;
   const arrow = document.createElement('span');
   arrow.className = 'wf-quote-arrow';
   arrow.setAttribute('aria-hidden', 'true');
   if(direction==='up'||direction==='down'){
    const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
    svg.setAttribute('viewBox','0 0 20 16');
    const path=document.createElementNS(svg.namespaceURI,'path');
    path.setAttribute('d',direction==='up'?'M2 13l5-6 4 3 7-8m-6 0h6v6':'M2 3l5 6 4-3 7 8m-6 0h6V8');
    svg.append(path);arrow.append(svg);
   }else arrow.textContent='–';
   trend.replaceChildren(arrow, document.createTextNode(hasTrend ? change : ''));
   trend.hidden=false;
   trend.title=hasTrend ? '' : ({ar:'الاتجاه غير متاح بعد',en:'Trend unavailable',tr:'Yön henüz mevcut değil',fr:'Tendance indisponible',ru:'Тенденция недоступна'}[lang]);
  }
 }
 let pending=null,state='';
 const panel=fx.mount(choice=>root.fetchRate({choice}));
 function stateText(){return ['unsaved','invalid','failed','stale','ok'].includes(state)?fx.word(state,S.lang):(text()[state]||'');}
 function render(){
  const words=text();label.textContent=pending?words.loading:words.refresh;
  button.setAttribute('aria-label',label.textContent);button.title=label.textContent;
  button.classList.toggle('wf-refreshing',Boolean(pending));button.setAttribute('aria-busy',String(Boolean(pending)));
  document.querySelectorAll('button[onclick="fetchRate()" ]').forEach(el=>{el.disabled=Boolean(pending);});
  status.textContent=stateText();status.dataset.state=state;
  panel?.setState(state,Boolean(pending));
  origin.textContent=S.settings.manualUsdTry||S.settings.manualUsdEur?fx.word('manual',S.lang):
   S.rateSource?fx.describe(S.rateSource,S.lang):fx.word(S.rateTime||S.rateHasSaved?'legacy':'defaults',S.lang);
  const time=document.getElementById('rateTime');if(time){time.textContent=S.rateTime?words.last+' · '+formatTime(S.rateTime,S.lang):words.last+' · —';time.dir='auto';}
 }
 const originalUpdate=root.updateRateUI;
 if(typeof originalUpdate==='function')root.updateRateUI=function(){const result=originalUpdate.apply(this,arguments);
  render();renderTrends();return result;};
 async function marketFeed(){
  try {
   const daily=await dailyQuotes(root.fetch.bind(root)),latest=daily.at(-1);
   return {usdTry:latest.try,usdEur:latest.eur,updatedAt:latest.at.slice(0,10),via:'frankfurter',daily};
  } catch {
   return {...await requestRates(root.fetch.bind(root)),via:'exchangerate'};
  }
 }
 root.fetchRate=function(options={}){
  if(pending)return pending;
  const manual=Boolean(S.settings.manualUsdTry||S.settings.manualUsdEur);
  const current=fx.normalizeSource(S.rateSource);
  if(options.background && (options.hasSaved||S.rateHasSaved||S.rateTime||current||manual))return Promise.resolve(false);
  if(!options.choice && (manual||current?.mode==='manual')){
   panel?.open();return Promise.resolve(false);
  }
  const choice=options.choice||current||{id:'market',side:'reference',mode:'feed'};
  const previous={usdTry:S.usdTry,usdEur:S.usdEur};
  const expected={time:S.rateTime,updatedAt:S.rateUpdatedAt,source:S.rateSource,manualUsdTry:S.settings.manualUsdTry,manualUsdEur:S.settings.manualUsdEur};
  state='loading';
  pending=(async()=>{
   let quote;
   try {quote=await fx.getQuote(choice,root.fetch.bind(root),marketFeed);}
   catch(error){state=error.message==='invalid'?'invalid':'failed';return false;}
   const row={id:'usdTry',value:quote.usdTry,eur:quote.usdEur,time:new Date().toISOString(),updatedAt:quote.updatedAt,source:quote.source};
   try {await fx.commitQuote(row,expected,options.background);}
   catch(error) {state=error.message==='stale'?'stale':'unsaved';return false;}
   Object.assign(S,{usdTry:row.value,usdEur:row.eur,rateTime:row.time,rateUpdatedAt:row.updatedAt,rateSource:row.source,rateHasSaved:true});
   S.settings.manualUsdTry=null;S.settings.manualUsdEur=null;
   for(const id of ['stManualUsdTry','stManualUsdEur']){const input=document.getElementById(id);if(input)input.value='';}
   const source=quote.source.id+'/'+quote.source.side+'/'+quote.source.via;
   if(quote.daily){
    history=[];
    for(const point of quote.daily)history=appendQuote(history,{...point,source});
   }
   if(quote.source.mode==='feed')remember({at:quote.daily?.at(-1)?.at||row.updatedAt||row.time,try:row.value,eur:row.eur,source});
   state='ok';
   root.updateRateUI();root.wfAnimateRateChanges?.(previous);
   try {if(typeof wfDriveOnDatabaseCommit==='function')wfDriveOnDatabaseCommit(['settings']);} catch {}
   return true;
  })().finally(()=>{pending=null;render();
   if(!options.background&&document.getElementById('page-settings')?.classList.contains('active'))root.showToast?.(stateText(),state==='ok'?'ok':'in');
  });
  render();return pending;
 };
 new MutationObserver(()=>{render();renderTrends();}).observe(document.documentElement,{attributes:true,attributeFilter:['lang','dir']});
 render();renderTrends();
})(typeof window==='undefined'?globalThis:window);

if (typeof document !== 'undefined' && document.getElementById('page-exchange')) {
  import('./cashboxes.mjs?v=2').then(module => module.mount()).catch(console.error);
}
