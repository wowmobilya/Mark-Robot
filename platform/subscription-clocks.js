/* Verified subscription clocks for currently visible company cards. No synthetic dates or background polling. */
(() => {
  'use strict';
  const copy={
    ar:{checking:'جارٍ التحقق من الاشتراك',missing:'لا يوجد اشتراك',unavailable:'بيانات الاشتراك غير متاحة',undated:'لم يُحدد تاريخ انتهاء',expired:'انتهى الاشتراك',soon:'ينتهي قريبًا',remaining:'المتبقي من الاشتراك',ends:'تاريخ الانتهاء',days:'يوم',hours:'ساعة',minutes:'دقيقة'},
    en:{checking:'Checking subscription',missing:'No subscription',unavailable:'Subscription status unavailable',undated:'No expiration date',expired:'Subscription expired',soon:'Expires soon',remaining:'Subscription remaining',ends:'Expiration date',days:'days',hours:'hours',minutes:'minutes'},
    tr:{checking:'Abonelik denetleniyor',missing:'Abonelik yok',unavailable:'Abonelik bilgisi alınamadı',undated:'Bitiş tarihi belirlenmemiş',expired:'Abonelik sona erdi',soon:'Yakında sona erecek',remaining:'Kalan abonelik süresi',ends:'Bitiş tarihi',days:'gün',hours:'saat',minutes:'dk'},
    fr:{checking:"Vérification de l’abonnement",missing:'Aucun abonnement',unavailable:'État indisponible',undated:'Aucune date de fin',expired:'Abonnement expiré',soon:'Expire bientôt',remaining:'Temps restant',ends:'Date d’expiration',days:'jours',hours:'heures',minutes:'min'},
    ru:{checking:'Проверка подписки',missing:'Подписки нет',unavailable:'Данные недоступны',undated:'Дата окончания не задана',expired:'Срок подписки истёк',soon:'Скоро закончится',remaining:'Осталось до окончания',ends:'Дата окончания',days:'дней',hours:'часов',minutes:'мин'}
  };
  const node=(type,klass,label)=>{
    const element=document.createElement(type);
    if(klass)element.className=klass;
    if(label!==undefined)element.textContent=label;
    return element;
  };
  function mount({cards,request,language='ar'}={}){
    if(!Array.isArray(cards)||!cards.length||typeof request!=='function')return {dispose(){}};
    const texts=copy[language]||copy.ar,entries=new Map();
    let disposed=false,clockAdjustment=0,interval=null;
    const date=value=>{
      try{return new Intl.DateTimeFormat(language,{dateStyle:'medium',timeStyle:'short'}).format(new Date(value));}
      catch{return String(value||'');}
    };
    const label=(e,state,headline,detail='')=>{
      e.wrapper.dataset.state=state;
      e.header.textContent=headline;
      e.value.textContent='';
      e.end.textContent=detail;
    };
    for(const {id,host} of cards){
      if(typeof id!=='string'||!host)continue;
      const wrapper=node('section','wf-subscription-clock');
      const icon=node('span','wf-subscription-icon');
      icon.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><rect x="3.2" y="5" width="17.6" height="16" rx="3"/><path d="M7 3.5v4M17 3.5v4M3.5 10h17"/><path d="M12 13.3v3.5l2.5 1.3"/></svg>';
      const copyBox=node('div','wf-subscription-copy'),header=node('span','wf-subscription-head',texts.checking),
        value=node('strong','wf-subscription-value'),end=node('time','wf-subscription-end');
      wrapper.dataset.state='checking';
      wrapper.setAttribute('aria-label',texts.remaining);
      wrapper.setAttribute('role','group');
      copyBox.append(header,value,end);wrapper.append(icon,copyBox);host.append(wrapper);
      entries.set(id,{wrapper,header,value,end,subscription:null});
    }
    function paint(){
      if(disposed)return;
      for(const e of entries.values()){
        const s=e.subscription;
        if(!s)continue;
        if(!s.hasSubscription){label(e,'missing',texts.missing);continue;}
        const deadline=Date.parse(s.expiresAt||'');
        if(!Number.isFinite(deadline)){label(e,'undated',texts.undated,s.planName||'');continue;}
        const diff=deadline-Date.now()-clockAdjustment;
        if(diff<=0){label(e,'expired',texts.expired,texts.ends+' · '+date(deadline));continue;}
        const totalMinutes=Math.ceil(diff/60000),days=Math.floor(totalMinutes/1440),
          hours=Math.floor(totalMinutes%1440/60),minutes=totalMinutes%60;
        e.wrapper.dataset.state=diff<3*86400000?'soon':'active';
        e.header.textContent=diff<3*86400000?texts.soon:texts.remaining;
        e.value.textContent=days+' '+texts.days+' · '+hours+' '+texts.hours+' · '+minutes+' '+texts.minutes;
        e.end.textContent=(s.planName?s.planName+' · ':'')+texts.ends+' · '+date(deadline);
        e.end.dateTime=s.expiresAt;
      }
    }
    const visibility=()=>{if(document.visibilityState==='visible')paint();};
    document.addEventListener('visibilitychange',visibility);
    const ids=[...entries.keys()];
    // This request returns only authenticated founder-visible deadlines, without changing a tenant session.
    request('company.subscriptionSummaries',{workspaceIds:ids}).then(result=>{
      if(disposed)return;
      if(!result||!Array.isArray(result.subscriptions))throw Error('INVALID_RESPONSE');
      const serverClock=Date.parse(result.checkedAt);
      clockAdjustment=Number.isFinite(serverClock)?Date.now()-serverClock:0;
      for(const s of result.subscriptions)if(entries.has(s.workspaceId))entries.get(s.workspaceId).subscription=s;
      for(const e of entries.values())if(!e.subscription)label(e,'unavailable',texts.unavailable);
      paint();
      interval=setInterval(()=>{if(document.visibilityState==='visible')paint();},30000);
    }).catch(()=>{
      if(disposed)return;
      for(const e of entries.values())label(e,'unavailable',texts.unavailable);
    });
    return {dispose(){disposed=true;clearInterval(interval);document.removeEventListener('visibilitychange',visibility);}};
  }
  window.WFPlatformSubscriptionClocks=Object.freeze({mount});
})();