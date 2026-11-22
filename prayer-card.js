(function(root){
  'use strict';
  const prayers=['fajr','dhuhr','asr','maghrib','isha'];
  const methods=['Turkey','MuslimWorldLeague','Egyptian','Karachi'];
  const langs=['ar','en','tr','fr','ru'];
  const copy={
    title:['مواقيت الصلاة','Prayer times','Namaz vakitleri','Horaires de prière','Время молитвы'],
    remaining:['الوقت المتبقي','Time remaining','Kalan süre','Temps restant','Осталось'],
    next:['الصلاة القادمة','Next prayer','Sonraki namaz','Prochaine prière','Следующая молитва'],
    names:[['الفجر','الظهر','العصر','المغرب','العشاء'],['Fajr','Dhuhr','Asr','Maghrib','Isha'],['İmsak','Öğle','İkindi','Akşam','Yatsı'],['Fajr','Dhuhr','Asr','Maghrib','Isha'],['Фаджр','Зухр','Аср','Магриб','Иша']],
    open:['المواقيت والإعدادات','Times and settings','Vakitler ve ayarlar','Horaires et réglages','Расписание и настройки'],
    setup:['حدد موقعك لحساب المواقيت','Set your location to calculate times','Vakitler için konum belirleyin','Indiquez votre position','Укажите своё местоположение'],
    locate:['استخدام موقعي','Use my location','Konumumu kullan','Utiliser ma position','Определить местоположение'],
    coords:['خط العرض، خط الطول','Latitude, longitude','Enlem, boylam','Latitude, longitude','Широта, долгота'],
    method:['طريقة الحساب','Calculation method','Hesaplama yöntemi','Méthode de calcul','Метод расчёта'],
    methodNames:[['ديانت التركية','رابطة العالم الإسلامي','الهيئة المصرية','جامعة كراتشي'],['Türkiye (Diyanet calculation)','Muslim World League','Egyptian authority','University of Karachi'],['Türkiye (Diyanet hesabı)','Dünya İslam Birliği','Mısır Genel Kurumu','Karaçi Üniversitesi'],['Turquie (calcul Diyanet)','Ligue islamique mondiale','Autorité égyptienne','Université de Karachi'],['Турция (расчёт Диянет)','Лига исламского мира','Египетское управление','Университет Карачи']],
    asr:['حساب العصر','Asr calculation','İkindi hesabı','Calcul de l’Asr','Расчёт Асра'],
    schools:[['الجمهور','حنفي'],['Standard','Hanafi'],['Standart','Hanefî'],['Standard','Hanafite'],['Стандартный','Ханафитский']],
    mode:['التذكير أثناء فتح البرنامج','Reminder while the app is open','Uygulama açıkken hatırlat','Rappel quand l’application est ouverte','Напоминание в открытом приложении'],
    modes:[['متوقف','تنبيه فقط','أذان مكة'],['Off','Notification only','Makkah adhan'],['Kapalı','Yalnızca bildirim','Mekke ezanı'],['Désactivé','Notification seule','Adhan de La Mecque'],['Выключено','Только уведомление','Азан из Мекки']],
    excerpt:['مقطع من أذان مكة · ١٩ ثانية دون إنترنت','Makkah adhan excerpt · 19 seconds, offline','Mekke ezanından bölüm · 19 saniye, çevrimdışı','Extrait de l’adhan de La Mecque · 19 secondes, hors ligne','Фрагмент азана из Мекки · 19 секунд, офлайн'],
    recording:['تسجيلي على هذا الجهاز','My recording on this device','Bu cihazdaki kaydım','Mon enregistrement sur cet appareil','Моя запись на устройстве'],
    chooseAudio:['اختر ملفًا صوتيًا (حتى ١٢ ميبيبايت)','Choose audio (up to 12 MiB)','Ses dosyası seçin (en fazla 12 MiB)','Choisir un fichier audio (12 Mio maximum)','Выберите аудио (до 12 МиБ)'],
    listen:['استماع / إيقاف','Listen / stop','Dinle / durdur','Écouter / arrêter','Слушать / остановить'],
    save:['حفظ','Save','Kaydet','Enregistrer','Сохранить'],close:['إغلاق','Close','Kapat','Fermer','Закрыть'],
    forget:['مسح موقعي والتذكيرات','Clear my location and reminders','Konumu ve hatırlatmaları sil','Effacer ma position et mes rappels','Удалить местоположение и напоминания'],
    invalid:['تحقق من الإحداثيات أو أذونات الموقع.','Check the coordinates or location permission.','Koordinatları veya konum iznini kontrol edin.','Vérifiez les coordonnées ou l’autorisation de localisation.','Проверьте координаты или разрешение геолокации.'],
    missing:['يتعذر حساب هذه المواقيت في هذا الموقع والتاريخ.','Times unavailable for this date and location.','Bu tarih ve konum için vakit hesaplanamadı.','Horaires indisponibles à cette date et position.','Расписание недоступно для этой даты и места.'],
    soundFail:['تعذر تشغيل الأذان. اضغط للاستماع.','Audio unavailable. Tap to listen.','Ses çalınamadı. Dinlemek için dokunun.','Audio indisponible. Appuyez pour écouter.','Не удалось воспроизвести азан. Нажмите для повтора.'],
    writeFail:['تعذر حفظ الإعدادات على هذا الجهاز.','Could not save on this device.','Bu cihaza kaydedilemedi.','Enregistrement impossible sur cet appareil.','Не удалось сохранить на этом устройстве.']
  };
  function parseLocation(raw){
    const parts=String(raw).trim().split(/[,،;]/).map(x=>x.trim());
    if(parts.length!==2||parts.some(x=>!/^[-+]?\d{1,3}(?:\.\d+)?$/.test(x)))return null;
    const [lat,lon]=parts.map(Number);
    if(Math.abs(lat)>90||Math.abs(lon)>180)return null;
    return {lat:Math.round(lat*1000)/1000,lon:Math.round(lon*1000)/1000};
  }
  function calculate(config,now,library,lookup){
    const zone=lookup(config.lat,config.lon);
    const parts=new Intl.DateTimeFormat('en-US',{timeZone:zone,year:'numeric',month:'numeric',day:'numeric'}).formatToParts(now);
    const date=Object.fromEntries(parts.map(({type,value})=>[type,Number(value)]));
    const params=library.CalculationMethod[config.method]();
    params.madhab=library.Madhab[config.school];
    const rows=[];
    for(let offset=-1;offset<=1;offset++){
      const day=new Date(date.year,date.month-1,date.day+offset,12);
      const times=new library.PrayerTimes(new library.Coordinates(config.lat,config.lon),day,params);
      for(const key of prayers){const at=times[key].getTime();if(Number.isFinite(at))rows.push({key,at,offset});}
    }
    rows.sort((a,b)=>a.at-b.at);
    return {zone,rows};
  }
  if(typeof module==='object'&&module.exports){module.exports={calculate,parseLocation,copy};return;}
  const doc=root.document,track=doc.querySelector('.wf-greeting-faces');
  if(!track||!root.adhan||!root.tzlookup)return;
  const el=(tag,label)=>{const n=doc.createElement(tag);if(label)n.textContent=label;return n;};
  const lang=()=>Math.max(0,langs.indexOf(doc.documentElement.lang.split('-')[0]));
  const t=key=>copy[key][lang()];
  const face=el('section');face.id='wfPrayer';face.className='wf-greeting-extra wf-prayer-face';face.inert=true;
  face.setAttribute('aria-hidden','true');
  const mark=el('span');mark.className='wf-prayer-mark';mark.setAttribute('aria-hidden','true');
  mark.innerHTML='<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 54h46M16 54V34h32v20M19 34c0-9 9-11 13-18 4 7 13 9 13 18M28 54v-8a4 4 0 0 1 8 0v8M9 50V22l3-7 3 7v7M49 29v-7l3-7 3 7v28M33 7a5 5 0 1 0 5 6 5 5 0 0 1-5-6Z"/></svg>';
  const title=el('strong');title.id='wfPrayerTitle';
  const line=el('span'),next=el('b'),open=el('button');open.type='button';open.className='btn';
  const heading=el('div');heading.className='wf-prayer-heading';heading.append(mark,title);
  const remaining=el('small'),progress=el('progress');remaining.className='wf-prayer-remaining';
  progress.max=1;progress.className='wf-prayer-progress';progress.setAttribute('aria-hidden','true');
  face.append(heading,line,next,remaining,progress,open);track.append(face);
  const audio=new Audio();audio.preload='none';
  const audioPath='https://upload.wikimedia.org/wikipedia/commons/a/a7/Adhan%2C_Great_Mosque_of_Mecca_-_Jan_21%2C_2013.webm';
  const recordSource='https://commons.wikimedia.org/wiki/File:Adhan,_Great_Mosque_of_Mecca_-_Jan_21,_2013.webm';
  const excerptPath='./assets/prayer/makkah-sai-excerpt.mp3';
  const audibleMode=mode=>['adhan','local','excerpt'].includes(mode);
  let localUrl='',audioGeneration=0;
  function recording(owner,key,operation,blob){
    return new Promise((resolve,reject)=>{
      const open=indexedDB.open('wf-prayer-audio-v1',1);
      open.onupgradeneeded=()=>open.result.createObjectStore('recordings');
      open.onerror=()=>reject(open.error);
      open.onsuccess=()=>{
        const db=open.result,tx=db.transaction('recordings',operation==='get'?'readonly':'readwrite');
        const store=tx.objectStore('recordings'),id=[owner,key];
        const request=operation==='put'?store.put(blob,id):store[operation](id);
        tx.oncomplete=()=>{db.close();resolve(request.result);};
        tx.onabort=tx.onerror=()=>{db.close();reject(tx.error);};
      };
    });
  }
  const notice=el('aside');notice.className='wf-prayer-notice';notice.setAttribute('role','status');notice.hidden=true;doc.body.append(notice);
  let config=null,scope='',cache=null,cacheDay='',modal=null,lastEvent='',noticeTimer;
  const storeId=()=>{if(doc.documentElement.dataset.wfAccountState==='locked')return '';
    const account=root.WFAccountAccess?.actor?.(),cloud=root.WFCloud?.getSnapshot?.();
    return account?.id?'wf.prayer.v1.'+JSON.stringify([cloud?.workspaceId||'',account.id]):'';};
  function stopAudio(){
    audioGeneration++;audio.pause();audio.removeAttribute('src');audio.load();
    if(localUrl){URL.revokeObjectURL(localUrl);localUrl='';}
  }
  function read(){
    try{const data=JSON.parse(localStorage.getItem(scope));if(!data||!parseLocation(data.lat+','+data.lon)||
      !methods.includes(data.method)||!['Shafi','Hanafi'].includes(data.school)||!['off','notice','adhan','local','excerpt'].includes(data.mode))return null;
      return data;
    }catch{return null;}
  }
  function reload(){
    stopAudio();modal?.close();notice.hidden=true;scope=storeId();config=scope?read():null;cache=null;lastEvent='';
    render();
  }
  const fmt=(at,zone)=>new Intl.DateTimeFormat(langs[lang()],{timeZone:zone,hour:'2-digit',minute:'2-digit'}).format(at);
  const name=key=>t('names')[prayers.indexOf(key)];
  async function play(mode=config?.mode,chosen){
    stopAudio();const token=audioGeneration,owner=scope;
    if(mode==='local'||mode==='excerpt'){
      let blob;
      if(mode==='local')blob=chosen||await recording(owner,config?.audioKey,'get');
      else{
        // Load the complete small MP3 from the offline shell; Safari can seek its local blob.
        const response=await fetch(excerptPath);
        if(!response.ok)throw Error('NO_AUDIO');
        blob=await response.blob();
      }
      if(token!==audioGeneration||owner!==storeId())return;
      if(!(blob instanceof Blob))throw Error('NO_AUDIO');
      localUrl=URL.createObjectURL(blob);audio.src=localUrl;
    }else audio.src=audioPath;
    await audio.play();
  }
  function message(label,offerPlay=false){
    clearTimeout(noticeTimer);notice.replaceChildren(el('strong',label));
    if(offerPlay){const b=el('button',t('listen'));b.type='button';b.onclick=()=>audio.paused?play().catch(()=>{}):stopAudio();notice.append(b);}
    const close=el('button',t('close'));close.type='button';close.onclick=()=>{notice.hidden=true;stopAudio();};notice.append(close);
    notice.hidden=false;noticeTimer=setTimeout(()=>{notice.hidden=true;},offerPlay?200000:45000);
  }
  function alertPrayer(row){
    const owner=scope,id=String(row.at),mode=config.mode;
    if(lastEvent===id)return;
    lastEvent=id;
    const fire=async()=>{
      if(storeId()!==owner||!config||config.mode!==mode)return;
      try{if(localStorage.getItem(owner+'.last')===id)return;localStorage.setItem(owner+'.last',id);}catch{return;}
      const label=t('title')+' · '+name(row.key);message(label,audibleMode(mode));
      if(root.Notification?.permission==='granted'){
        try{const reg=await navigator.serviceWorker?.getRegistration();if(reg&&storeId()===owner)await reg.showNotification(label,{tag:'wf-prayer-'+id,silent:true});}catch{}
      }
      if((audibleMode(mode))&&storeId()===owner)play().catch(()=>{if(storeId()===owner)message(t('soundFail'),true);});
    };
    if(navigator.locks)navigator.locks.request('wf-prayer-'+owner,fire).catch(()=>{});else fire();
  }
  function render(){
    title.textContent=t('title');open.textContent=t('open');open.disabled=!scope;
    line.textContent=config?t('next'):t('setup');next.textContent='';remaining.textContent='';progress.hidden=true;
    if(!config)return;
    const now=Date.now();
    try{
      const zone=cache?.zone||root.tzlookup(config.lat,config.lon);
      const day=new Intl.DateTimeFormat('en-CA',{timeZone:zone}).format(now);
      if(!cache||cacheDay!==day){cache=calculate(config,new Date(now),root.adhan,root.tzlookup);cacheDay=day;}
      const upcoming=cache.rows.find(r=>r.at>now);
      next.textContent=upcoming?name(upcoming.key)+' · '+fmt(upcoming.at,cache.zone):t('missing');
      if(upcoming){
        const minutes=Math.ceil((upcoming.at-now)/60000),locale=langs[lang()];
        const unit=(n,u)=>new Intl.NumberFormat(locale,{style:'unit',unit:u,unitDisplay:'short'}).format(n);
        const parts=[];if(minutes>=60)parts.push(unit(Math.floor(minutes/60),'hour'));
        if(minutes%60)parts.push(unit(minutes%60,'minute'));
        remaining.textContent=t('remaining')+' · '+parts.join(' ');
        const previous=cache.rows[cache.rows.indexOf(upcoming)-1];
        if(previous){progress.value=(now-previous.at)/(upcoming.at-previous.at);progress.hidden=false;}
      }
      const due=cache.rows.find(r=>now>=r.at&&now-r.at<60000);
      if(due&&config.mode!=='off'&&storeId()===scope)alertPrayer(due);
    }catch{cache=null;next.textContent=t('missing');}
  }
  const field=(label,control)=>{const wrap=el('label');wrap.append(el('span',label),control);return wrap;};
  function chooser(values,labels,value){const select=el('select');values.forEach((v,i)=>select.add(new Option(labels[i],v)));select.value=value;return select;}
  function settings(){
    if(!scope||storeId()!==scope||modal)return;
    const owner=scope,dialog=el('dialog');modal=dialog;dialog.className='wf-prayer-settings';
    const header=el('header'),heading=el('h2',t('title')),close=el('button',t('close'));close.type='button';close.onclick=()=>dialog.close();
    header.append(heading,close);dialog.append(header);dialog.setAttribute('aria-label',t('title'));
    const preview=el('div'),status=el('p');status.setAttribute('role','status');
    const coords=el('input');coords.type='text';coords.dir='ltr';coords.value=config?config.lat+', '+config.lon:'';
    const locate=el('button',t('locate'));locate.type='button';
    const method=chooser(methods,t('methodNames'),config?.method||'MuslimWorldLeague');
    const school=chooser(['Shafi','Hanafi'],t('schools'),config?.school||'Shafi');
    const mode=chooser(['off','notice','adhan','local','excerpt'],[...t('modes'),t('recording'),t('excerpt')],config?.mode||'off');
    const file=el('input');file.type='file';file.accept='audio/*';
    const fileField=field(t('chooseAudio'),file);
    const credit=el('div'),source=el('a','Seyfula Islam · Makkah, 2013'),license=el('a','CC BY 3.0');
    source.href=recordSource;license.href='https://creativecommons.org/licenses/by/3.0/';
    for(const link of [source,license]){link.target='_blank';link.rel='noopener noreferrer';}
    credit.append(source,doc.createTextNode(' · '),license);
    const excerptCredit=el('a','Masmaa · CC BY · Sa’i');excerptCredit.href='https://www.masmaa.org/en/audio/call-to-prayer-sai-route';
    excerptCredit.target='_blank';excerptCredit.rel='noopener noreferrer';
    function candidate(){const coordsValue=parseLocation(coords.value);return coordsValue?{...coordsValue,method:method.value,school:school.value,mode:mode.value}:null;}
    function show(){
      preview.replaceChildren();const state=candidate();if(!state)return;
      try{const {zone,rows}=calculate(state,new Date(),root.adhan,root.tzlookup);const grid=el('dl');grid.className='wf-prayer-times';
        for(const key of prayers){const pair=el('div'),row=rows.find(r=>r.offset===0&&r.key===key);
          pair.append(el('dt',name(key)),el('dd',row?fmt(row.at,zone):'—'));grid.append(pair);}
        preview.append(grid,el('small',zone));}catch{status.textContent=t('missing');}
    }
    locate.onclick=()=>{if(!navigator.geolocation){status.textContent=t('invalid');return;}
      locate.disabled=true;navigator.geolocation.getCurrentPosition(pos=>{
        if(!dialog.open||storeId()!==owner)return;
        coords.value=pos.coords.latitude.toFixed(3)+', '+pos.coords.longitude.toFixed(3);
        if(!config&&root.tzlookup(pos.coords.latitude,pos.coords.longitude)==='Europe/Istanbul')method.value='Turkey';
        status.textContent='';locate.disabled=false;show();
      },()=>{if(dialog.open){locate.disabled=false;status.textContent=t('invalid');}},{timeout:12000,maximumAge:300000});
    };
    coords.oninput=method.onchange=school.onchange=show;
    const listen=el('button',t('listen'));listen.type='button';listen.onclick=()=>audio.paused?play(mode.value,file.files[0]).catch(()=>{status.textContent=t('soundFail');}):stopAudio();
    function audioControls(){
      stopAudio();fileField.hidden=mode.value!=='local';credit.hidden=mode.value!=='adhan';
      excerptCredit.hidden=mode.value!=='excerpt';listen.hidden=!audibleMode(mode.value);
    }
    mode.onchange=audioControls;audioControls();
    const save=el('button',t('save'));save.type='button';save.className='btn btn-p';
    save.onclick=async()=>{
      const data=candidate();if(!data||storeId()!==owner){status.textContent=t('invalid');return;}
      save.disabled=true;
      let stagedKey='';
      try{
        const chosen=file.files[0],existing=config?.audioKey;
        calculate(data,new Date(),root.adhan,root.tzlookup);
        if(data.mode==='local'){
          if(chosen){
            if(!chosen.size||chosen.size>12*1024*1024||!chosen.type.startsWith('audio/')||!audio.canPlayType(chosen.type)){
              status.textContent=t('chooseAudio');return;
            }
            stagedKey=crypto.randomUUID();await recording(owner,stagedKey,'put',chosen);data.audioKey=stagedKey;
          }else if(existing)data.audioKey=existing;
          else{status.textContent=t('chooseAudio');return;}
        }
        if(!dialog.open||storeId()!==owner)return;
        localStorage.setItem(owner,JSON.stringify(data));stagedKey='';
        if(existing&&existing!==data.audioKey)recording(owner,existing,'delete').catch(()=>{});
      }catch{status.textContent=t('writeFail');return;}
      finally{save.disabled=false;if(stagedKey)recording(owner,stagedKey,'delete').catch(()=>{});}

      if(data.mode!=='off'&&root.Notification?.permission==='default')root.Notification.requestPermission().catch(()=>{});
      config=data;cache=null;dialog.close();render();
    };
    const forget=el('button',t('forget'));forget.type='button';forget.hidden=!config;forget.onclick=()=>{
      try{localStorage.removeItem(owner);localStorage.removeItem(owner+'.last');}catch{status.textContent=t('writeFail');return;}
      if(config?.audioKey)recording(owner,config.audioKey,'delete').catch(()=>{});
      config=null;cache=null;dialog.close();render();};
    dialog.append(preview,field(t('coords'),coords),locate,field(t('method'),method),field(t('asr'),school),field(t('mode'),mode),fileField,credit,excerptCredit,listen,status,save,forget);
    dialog.addEventListener('close',()=>{stopAudio();dialog.remove();modal=null;});doc.body.append(dialog);dialog.showModal();show();
  }
  open.onclick=settings;
  new MutationObserver(()=>{if(scope!==storeId())reload();else render();}).observe(doc.documentElement,{attributes:true,attributeFilter:['lang','data-wf-account-state']});
  root.addEventListener('wf-account-access-change',()=>{if(scope!==storeId())reload();});
  root.addEventListener('storage',e=>{if(e.key===scope)reload();});
  doc.addEventListener('visibilitychange',()=>{if(!doc.hidden)render();});
  root.addEventListener('pagehide',stopAudio);reload();
  setInterval(()=>{if(scope!==storeId())reload();else render();},15000);
})(globalThis);
