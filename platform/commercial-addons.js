/* WOW commercial add-ons: real founder-authorized quota data, five languages.
   No payment capture, automated charges, or unverified online state. */
(() => {
  'use strict';
  const trans={
    ar:{title:'حدود الاشتراك والإضافات',owner:'جهاز المالك الرئيسي',free:'مستثنى',devices:'هواتف الموظفين',storage:'تخزين السيرفر',voice:'المكالمات الصوتية',video:'مكالمات الفيديو',period:'شهريًا',used:'المستخدم',allowed:'المتاح',extra:'أجهزة موظفين إضافية',extraPrice:'10 دولارات لكل جهاز شهريًا',double:'مضاعفة الاتصال والتخزين',doublePrice:'20 دولارًا شهريًا: تخزين ×2 وصوت ×2 وفيديو ×2',quote:'إجمالي الإضافات شهريًا',save:'حفظ الإضافات',reset:'إلغاء التغييرات',up:'زيادة جهاز',down:'تقليل جهاز',updated:'حُفظت الإضافات بنجاح. لا يُحصّل البرنامج رسومًا تلقائية.',unavailable:'إضافات الاشتراك غير متاحة قبل تحديث الخادم أو إسناد باقة WOW.',loading:'جارٍ حفظ التغيير...',expired:'الاشتراك منتهي',privacy:'إضافة حدود الخدمة منفصلة عن الدفع والتحصيل. تُراجع الفواتير بمعرفة الإدارة.'},
    en:{title:'Subscription limits and add-ons',owner:'Primary company owner',free:'Exempt',devices:'Employee phones',storage:'Server storage',voice:'Voice calls',video:'Video calls',period:'per month',used:'Used',allowed:'Allowed',extra:'Extra employee devices',extraPrice:'$10 per device / month',double:'Double calls and storage',doublePrice:'$20 / month: 2× storage, voice and video',quote:'Monthly add-on total',save:'Save add-ons',reset:'Discard changes',up:'Add a phone',down:'Remove a phone',updated:'Add-ons saved. No automatic payment is collected.',unavailable:'Add-ons require the upgraded server and an assigned WOW subscription.',loading:'Saving changes...',expired:'Subscription expired',privacy:'Service limits are separate from payment collection and must be invoiced by management.'},
    tr:{title:'Abonelik sınırları ve ekler',owner:'Ana şirket sahibi',free:'Hariç',devices:'Çalışan telefonları',storage:'Sunucu depolaması',voice:'Sesli aramalar',video:'Görüntülü aramalar',period:'aylık',used:'Kullanılan',allowed:'Limit',extra:'Ek çalışan cihazları',extraPrice:'Cihaz başına aylık 10 $',double:'Arama ve depolamayı ikiye katla',doublePrice:'Aylık 20 $: depolama, ses ve video ×2',quote:'Aylık ek ücret toplamı',save:'Ekleri kaydet',reset:'Değişiklikleri geri al',up:'Telefon ekle',down:'Telefon çıkar',updated:'Ekler kaydedildi. Otomatik ücret alınmaz.',unavailable:'Ekler için güncel sunucu ve atanmış WOW paketi gerekir.',loading:'Kaydediliyor...',expired:'Abonelik süresi dolmuş',privacy:'Hizmet sınırları tahsilattan ayrıdır; faturalama yöneticinin sorumluluğundadır.'},
    fr:{title:'Quotas et options',owner:'Propriétaire principal',free:'Exempté',devices:'Téléphones des employés',storage:'Stockage serveur',voice:'Appels vocaux',video:'Appels vidéo',period:'par mois',used:'Utilisé',allowed:'Limite',extra:'Appareils employés supplémentaires',extraPrice:'10 $ par appareil et par mois',double:'Doubler appels et stockage',doublePrice:'20 $ par mois : stockage, voix et vidéo ×2',quote:'Total mensuel des options',save:'Enregistrer les options',reset:'Annuler',up:'Ajouter un téléphone',down:'Retirer un téléphone',updated:'Options enregistrées, sans prélèvement automatique.',unavailable:'Options indisponibles sans serveur à jour et abonnement WOW affecté.',loading:'Enregistrement…',expired:'Abonnement expiré',privacy:'Les quotas sont indépendants de la facturation, assurée par l’administration.'},
    ru:{title:'Лимиты и дополнения',owner:'Основной владелец',free:'Не учитывается',devices:'Телефоны сотрудников',storage:'Хранилище сервера',voice:'Голосовые звонки',video:'Видеозвонки',period:'в месяц',used:'Использовано',allowed:'Лимит',extra:'Дополнительные телефоны сотрудников',extraPrice:'10 $ за телефон в месяц',double:'Удвоить звонки и хранилище',doublePrice:'20 $ в месяц: хранилище, аудио и видео ×2',quote:'Доплаты за месяц',save:'Сохранить дополнения',reset:'Отменить',up:'Добавить телефон',down:'Убрать телефон',updated:'Дополнения сохранены. Автоматических списаний нет.',unavailable:'Нужны обновлённый сервер и назначенный тариф WOW.',loading:'Сохранение…',expired:'Подписка истекла',privacy:'Лимиты не являются автоматическим платежом: счета оформляет администратор.'}
  };
  const make=(tag,cls,text)=>{const x=document.createElement(tag);if(cls)x.className=cls;if(text!==undefined)x.textContent=text;return x;};
  function mount(host,state,onSave){
    if(!host||!host.isConnected)return;
    const t=trans[document.documentElement.lang]||trans.ar;
    host.replaceChildren();
    if(state?.available!==true){
      host.append(make('p','platform-addon-unavailable',t.unavailable));return;
    }
    let extra=Number(state.extraStaffDevices)||0,doubled=state.doubledBundle===true,version=state.version;
    const basePhones=Number(state.staffDevicesIncluded)||2,extraPrice=Number(state.extraDeviceUsdMonthly)||10;
    const bundlePrice=Number(state.doubleBundleUsdMonthly)||20;
    const baseStorage=Number(state.storageAllowedBytes)/(doubled?2:1);
    const baseVoice=Number(state.voiceSecondsAllowed)/(doubled?2:1);
    const baseVideo=Number(state.videoSecondsAllowed)/(doubled?2:1);
    const nf=new Intl.NumberFormat(document.documentElement.lang,{maximumFractionDigits:1});
    const money=n=>new Intl.NumberFormat(document.documentElement.lang,{style:'currency',currency:'USD',maximumFractionDigits:2}).format(n);
    const block=make('section','platform-addon-card'),header=make('header','platform-addon-header');
    header.append(make('h3','',t.title),make('span','platform-addon-badge',state.subscriptionExpired?t.expired:t.free+' · '+t.owner));
    const grid=make('div','platform-addon-quotas');
    const metrics=[
      {key:'devices',included:basePhones,used:Number(state.staffDevicesUsed),render:n=>nf.format(n),unit:''},
      {key:'storage',included:baseStorage,used:Number(state.storageUsedBytes),render:n=>nf.format(n/1000000000),unit:'GB'},
      {key:'voice',included:baseVoice,used:Number(state.voiceSecondsUsed),render:n=>nf.format(n/60),unit:'min'},
      {key:'video',included:baseVideo,used:Number(state.videoSecondsUsed),render:n=>nf.format(n/60),unit:'min'}
    ];
    for(const row of metrics){
      const tile=make('div','platform-addon-quota');tile.dataset.quota=row.key;
      const key=make('strong','platform-addon-quota-name',t[row.key]);
      const values=make('div','platform-addon-quota-values');
      const used=make('span','',t.used+' · '+row.render(Number.isFinite(row.used)?row.used:0)+' '+row.unit);
      const allowance=make('bdi','platform-addon-quota-allowed');
      const track=make('div','platform-addon-quota-track');track.setAttribute('role','progressbar');track.setAttribute('aria-label',t[row.key]);
      const fill=make('span','platform-addon-quota-fill');
      track.append(fill);values.append(allowance,used);tile.append(key,values,track);grid.append(tile);
      row.allowance=allowance;row.fill=fill;row.track=track;
    }
    const form=make('form','platform-addon-editor'),counter=make('div','platform-addon-counter');
    const heading=make('div','platform-addon-counter-copy');
    heading.append(make('strong','',t.extra),make('small','',t.extraPrice));
    const buttons=make('div','platform-addon-steps');
    const minus=make('button','platform-addon-decrease','−'),count=make('output','platform-addon-count'),plus=make('button','platform-addon-increase','+');
    minus.type=plus.type='button';minus.setAttribute('aria-label',t.down);plus.setAttribute('aria-label',t.up);
    count.setAttribute('aria-live','polite');buttons.append(minus,count,plus);counter.append(heading,buttons);
    const bundleLabel=make('label','platform-addon-bundle'),box=make('input');
    box.type='checkbox';box.className='platform-addon-checkbox';box.checked=doubled;
    const copy=make('span','platform-addon-bundle-copy');
    copy.append(make('strong','',t.double),make('small','',t.doublePrice));bundleLabel.append(box,copy);
    const total=make('div','platform-addon-total');total.append(make('span','',t.quote),make('strong','platform-addon-total-value'));
    const actions=make('div','platform-addon-actions'),save=make('button','platform-addon-save',t.save),reset=make('button','platform-addon-reset',t.reset);
    save.type='submit';reset.type='button';actions.append(reset,save);
    const status=make('p','platform-addon-status');status.setAttribute('role','status');
    const footer=make('p','platform-addon-disclaimer',t.privacy);
    const render=()=>{
      count.textContent=nf.format(extra);box.checked=doubled;
      for(const metric of metrics){
        const limit=metric.key==='devices'?basePhones+extra:
          metric.included*(doubled?2:1);
        metric.allowance.textContent=t.allowed+' · '+metric.render(limit)+' '+metric.unit;
        const ratio=limit>0?Math.min(100,Math.max(0,metric.used/limit*100)):0;
        metric.fill.style.inlineSize=ratio.toFixed(2)+'%';
        metric.track.setAttribute('aria-valuemin','0');metric.track.setAttribute('aria-valuemax',String(limit));
        metric.track.setAttribute('aria-valuenow',String(Math.min(metric.used,limit)));
      }
      total.querySelector('strong').textContent=money(extra*extraPrice+(doubled?bundlePrice:0));
      minus.disabled=extra<=0;plus.disabled=extra>=99;
      const dirty=extra!==Number(state.extraStaffDevices)||doubled!==(state.doubledBundle===true);
      save.disabled=!dirty||!!state.subscriptionExpired;reset.disabled=!dirty;
    };
    minus.onclick=()=>{if(extra>0){extra--;render();}};
    plus.onclick=()=>{if(extra<99){extra++;render();}};
    box.onchange=()=>{doubled=box.checked;render();};
    reset.onclick=()=>{extra=Number(state.extraStaffDevices)||0;doubled=state.doubledBundle===true;render();status.textContent='';};
    form.onsubmit=async event=>{
      event.preventDefault();if(save.disabled)return;
      save.disabled=true;save.setAttribute('aria-busy','true');status.textContent=t.loading;
      try{
        const data=await onSave({extraDevices:extra,doubleBundle:doubled,version});
        if(host.isConnected){mount(host,data,onSave);host.querySelector('.platform-addon-status').textContent=t.updated;}
      }catch{status.textContent=t.unavailable;}
      finally{save.removeAttribute('aria-busy');if(host.isConnected)render();}
    };
    form.append(counter,bundleLabel,total,actions,status);
    block.append(header,grid,form,footer);host.append(block);render();
  }
  window.WFPlatformCommercialAddons=Object.freeze({mount});
})();
