/* Honest refresh state and localized twelve-hour quote timestamps. */
(function(root){'use strict';
 const sources=['https://api.exchangerate-api.com/v4/latest/USD','https://open.er-api.com/v6/latest/USD'];
 const locales={ar:'ar-u-nu-arab',tr:'tr-TR',en:'en-US',fr:'fr-FR',ru:'ru-RU'};
 function formatTime(value,lang){
  if(!value)return '';
  let date=new Date(value);
  if(Number.isNaN(date.getTime())){
   const parts=String(value).match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
   if(!parts)return String(value);
   date=new Date();date.setHours(Number(parts[1]),Number(parts[2]),Number(parts[3]||0),0);
  }
  const formatter=new Intl.DateTimeFormat(locales[lang]||locales.en,{hour:'numeric',minute:'2-digit',hour12:true});
  if(lang==='ar')return formatter.formatToParts(date).map(part=>part.type==='dayPeriod'?(date.getHours()<12?'صباحاً':'مساءً'):part.value).join('');
  return formatter.format(date);
 }
 async function requestRates(fetcher){
  for(const url of sources){try{
   const response=await fetcher(url,{signal:AbortSignal.timeout(5000)});
   if(response.ok===false)continue;
   const data=await response.json(),usdTry=data.rates?.TRY??data.conversion_rates?.TRY,usdEur=data.rates?.EUR??data.conversion_rates?.EUR;
   if(typeof usdTry==='number'&&Number.isFinite(usdTry)&&usdTry>0&&typeof usdEur==='number'&&Number.isFinite(usdEur)&&usdEur>0)return {usdTry:Number(usdTry.toFixed(4)),usdEur:Number(usdEur.toFixed(4))};
  }catch(_) {}}
  throw new Error('rate-unavailable');
 }
 if(typeof module!=='undefined'&&module.exports){module.exports={formatTime,requestRates};return;}
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
 if(typeof originalUpdate==='function')root.updateRateUI=function(){const result=originalUpdate.apply(this,arguments);render();return result;};
 root.fetchRate=function(){
  if(pending)return pending;
  state='loading';
  pending=(async()=>{
   const previous={usdTry:S.usdTry,usdEur:S.usdEur};
   let rates;try{rates=await requestRates(root.fetch.bind(root));}catch(_){state='failed';return false;}
   S.usdTry=S.settings.manualUsdTry||rates.usdTry;S.usdEur=S.settings.manualUsdEur||rates.usdEur;
   S.rateTime=new Date().toISOString();root.updateRateUI();
   root.wfAnimateRateChanges?.(previous);root.wfUpdateMarketIndicators?.(previous);
   state=(S.settings.manualUsdTry||S.settings.manualUsdEur)?'manual':'ok';
   try{await dbPut('settings',{id:'usdTry',value:S.usdTry,eur:S.usdEur,time:S.rateTime});}catch(_){state='unsaved';}
   return true;
  })().finally(()=>{pending=null;render();
   if(document.getElementById('page-settings')?.classList.contains('active'))root.showToast?.(text()[state],['failed','unsaved'].includes(state)?'in':'ok');
  });
  render();return pending;
 };
 new MutationObserver(render).observe(document.documentElement,{attributes:true,attributeFilter:['lang','dir']});
 render();
})(typeof window==='undefined'?globalThis:window);
