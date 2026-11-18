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
 function sparkPoints(values) {
  if(values.length<2)return '';
  const min=Math.min(...values),max=Math.max(...values);
  return values.map((value,index)=>{
   const x=2+index*96/(values.length-1);
   const y=max===min?12:22-(value-min)*20/(max-min);
   return x.toFixed(2)+','+y.toFixed(2);
  }).join(' ');
 }
 if(typeof module!=='undefined'&&module.exports){module.exports={formatTime,requestRates,appendQuote,sparkPoints};return;}
 const copy={
  ar:{refresh:'تحديث الأسعار',loading:'جارٍ تحديث الأسعار…',ok:'تم تحديث الأسعار',failed:'تعذر التحديث؛ الأسعار السابقة محفوظة',manual:'تم التحديث مع إبقاء الأسعار اليدوية',unsaved:'تم التحديث؛ تعذر حفظه على الجهاز',last:'آخر تحديث'},
  tr:{refresh:'Kurları yenile',loading:'Kurlar güncelleniyor…',ok:'Kurlar güncellendi',failed:'Güncellenemedi; önceki kurlar korundu',manual:'Manuel kurlar korunarak güncellendi',unsaved:'Güncellendi; cihaza kaydedilemedi',last:'Son güncelleme'},
  en:{refresh:'Refresh rates',loading:'Updating rates…',ok:'Rates updated',failed:'Update failed; previous rates kept',manual:'Updated; manual rates kept',unsaved:'Updated; could not save on this device',last:'Last updated'},
  fr:{refresh:'Actualiser les taux',loading:'Actualisation des taux…',ok:'Taux actualisés',failed:'Échec ; taux précédents conservés',manual:'Actualisé ; taux manuels conservés',unsaved:'Actualisé ; enregistrement impossible',last:'Dernière actualisation'},
  ru:{refresh:'Обновить курсы',loading:'Обновление курсов…',ok:'Курсы обновлены',failed:'Не удалось обновить; прежние курсы сохранены',manual:'Обновлено; ручные курсы сохранены',unsaved:'Обновлено; не удалось сохранить',last:'Обновлено'}
 };
 const text=()=>copy[S.lang]||copy.en;
 const top=document.querySelector('#currBar .curr-bar-top'),button=top?.querySelector('.curr-refresh');
 if(!top||!button)return;
 const label=document.createElement('span');label.className='wf-refresh-label';button.append(label);
 const status=document.createElement('div');status.className='wf-rate-status';status.setAttribute('role','status');status.setAttribute('aria-live','polite');status.setAttribute('aria-atomic','true');top.after(status);
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
 const arrows=new Intl.NumberFormat('en',{style:'percent',maximumFractionDigits:2,signDisplay:'exceptZero'});
 const cards=Array.from(top.parentElement.querySelectorAll('.curr-item'),card=>{
  const pair=card.getAttribute('onclick')?.match(/'([^']+)'/)?.[1];
  const trend=document.createElement('span');
  trend.className='wf-market-trend wf-quote-trend';
  trend.dir='ltr';
  card.append(trend);
  return {pair,card,trend,lastTrend:''};
 });
 function renderTrends(){
  for(const quote of cards){
   const {pair,card,trend}=quote;
   const manual=(pair.includes('try')&&S.settings.manualUsdTry)||(pair.includes('eur')&&S.settings.manualUsdEur);
   const prices=manual?[]:history.map(pairs[pair]);
   const hasTrend=prices.length>1;
   const delta=hasTrend?(prices.at(-1)-prices.at(-2))/prices.at(-2):0;
   const change=arrows.format(delta);
   const direction=!hasTrend?'empty':Number(Math.abs(delta*100).toFixed(2))===0?'flat':delta>0?'up':'down';
   const signature=hasTrend?JSON.stringify([history.at(-1).at,direction,change]):'empty';
   if(quote.lastTrend===signature)continue;
   quote.lastTrend=signature;
   card.dataset.quoteTrend=direction;
   const arrow = document.createElement('span');
   arrow.className = 'wf-quote-arrow';
   arrow.setAttribute('aria-hidden', 'true');
   arrow.textContent = direction === 'up' ? '↗' : direction === 'down' ? '↘' : '–';
   trend.replaceChildren(arrow, document.createTextNode(hasTrend ? change : ''));
   trend.hidden=false;
   trend.title=hasTrend ? '' : ({ar:'الاتجاه غير متاح بعد',en:'Trend unavailable',tr:'Yön henüz mevcut değil',fr:'Tendance indisponible',ru:'Тенденция недоступна'}[S.lang] || 'Trend unavailable');
  }
 }
 let pending=null,state='';
 function render(){
  const words=text();label.textContent=pending?words.loading:words.refresh;
  button.setAttribute('aria-label',label.textContent);button.title=label.textContent;
  button.classList.toggle('wf-refreshing',Boolean(pending));button.setAttribute('aria-busy',String(Boolean(pending)));
  document.querySelectorAll('button[onclick="fetchRate()" ]').forEach(el=>{el.disabled=Boolean(pending);});
  status.textContent=state?words[state]:'';status.dataset.state=state;
  const time=document.getElementById('rateTime');if(time){time.textContent=S.rateTime?words.last+' · '+formatTime(S.rateTime,S.lang):words.last+' · —';time.dir='auto';}
 }
 const originalUpdate=root.updateRateUI;
 if(typeof originalUpdate==='function')root.updateRateUI=function(){const result=originalUpdate.apply(this,arguments);
  if(!history.length&&S.rateUpdatedAt&&!S.settings.manualUsdTry&&!S.settings.manualUsdEur){
   remember({at:S.rateUpdatedAt,try:S.usdTry,eur:S.usdEur});
  }
  render();renderTrends();return result;};
 root.fetchRate=function(){
  if(pending)return pending;
  state='loading';
  pending=(async()=>{
   const previous={usdTry:S.usdTry,usdEur:S.usdEur};
   let rates;try{rates=await requestRates(root.fetch.bind(root));}catch(_){state='failed';return false;}
   S.usdTry=S.settings.manualUsdTry||rates.usdTry;S.usdEur=S.settings.manualUsdEur||rates.usdEur;
   S.rateTime=new Date().toISOString();S.rateUpdatedAt=rates.updatedAt;
   const last=history.at(-1);
   if(rates.updatedAt||last?.try!==rates.usdTry||last?.eur!==rates.usdEur){
    remember({at:rates.updatedAt||S.rateTime,try:rates.usdTry,eur:rates.usdEur});
   }
   root.updateRateUI();
   root.wfAnimateRateChanges?.(previous);
   state=(S.settings.manualUsdTry||S.settings.manualUsdEur)?'manual':'ok';
   try{await dbPut('settings',{id:'usdTry',value:S.usdTry,eur:S.usdEur,time:S.rateTime,updatedAt:S.rateUpdatedAt});}catch(_){state='unsaved';}
   return true;
  })().finally(()=>{pending=null;render();
   if(document.getElementById('page-settings')?.classList.contains('active'))root.showToast?.(text()[state],['failed','unsaved'].includes(state)?'in':'ok');
  });
  render();return pending;
 };
 new MutationObserver(render).observe(document.documentElement,{attributes:true,attributeFilter:['lang','dir']});
 render();renderTrends();
})(typeof window==='undefined'?globalThis:window);
