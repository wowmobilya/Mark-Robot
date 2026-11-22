(() => {
  'use strict';
  const copy={
    ar:['صندوق الدعم','غير مقروء','مقروء','تحديث','لا توجد رسائل دعم.','عرض المزيد','العودة إلى الصندوق','عرض الصورة المرفقة','إخفاء الصورة','صورة مرفقة من صاحب الرسالة','رد الإدارة','رسالة صاحب الطلب','كتابة رد','إرسال الرد','تعذّر إتمام الطلب. أعد المحاولة.','جارٍ التحميل…','إغلاق','تم إرسال الرد.'],
    en:['Support inbox','Unread','Read','Refresh','No support messages.','Show more','Back to inbox','View attached photo','Hide photo','Photo attached by the sender','Administrator reply','Sender message','Write a reply','Send reply','The request failed. Try again.','Loading…','Close','Reply sent.'],
    tr:['Destek kutusu','Okunmadı','Okundu','Yenile','Destek mesajı yok.','Daha fazla','Gelen kutusuna dön','Ekli fotoğrafı göster','Fotoğrafı gizle','Gönderenin eklediği fotoğraf','Yönetici yanıtı','Gönderen mesajı','Yanıt yaz','Yanıtı gönder','İstek başarısız. Tekrar deneyin.','Yükleniyor…','Kapat','Yanıt gönderildi.'],
    fr:['Boîte de support','Non lu','Lu','Actualiser','Aucun message de support.','Afficher plus','Retour à la boîte','Voir la photo jointe','Masquer la photo','Photo jointe par l’expéditeur','Réponse de l’administration','Message de l’expéditeur','Écrire une réponse','Envoyer la réponse','Échec de la demande. Réessayez.','Chargement…','Fermer','Réponse envoyée.'],
    ru:['Обращения','Не прочитано','Прочитано','Обновить','Обращений пока нет.','Показать ещё','К списку','Показать фото','Скрыть фото','Фото отправителя','Ответ администратора','Сообщение отправителя','Написать ответ','Отправить ответ','Не удалось выполнить запрос. Повторите попытку.','Загрузка…','Закрыть','Ответ отправлен.']
  };
  const alertCopy={
    ar:['تفعيل تنبيهات الدعم أثناء فتح الإدارة','إيقاف تنبيهات الدعم','لديك تحديث جديد في صندوق الدعم.','لم يُسمح بإشعارات الجهاز.','عرض رسائل أقدم'],
    en:['Enable support alerts while admin is open','Turn off support alerts','There is an update in your support inbox.','Device notifications were not allowed.','Show older messages'],
    tr:['Yönetim açıkken destek bildirimlerini aç','Destek bildirimlerini kapat','Destek kutunuzda yeni bir güncelleme var.','Cihaz bildirimlerine izin verilmedi.','Eski mesajları göster'],
    fr:['Activer les alertes tant que l’administration est ouverte','Désactiver les alertes de support','Votre boîte de support a été mise à jour.','Les notifications de l’appareil ne sont pas autorisées.','Voir les messages précédents'],
    ru:['Включить уведомления, пока управление открыто','Отключить уведомления поддержки','В обращениях есть обновление.','Уведомления устройства не разрешены.','Показать предыдущие сообщения']
  };
  function mount({nav,container,routeLink,request,lang,alerts={enabled:false,seen:new Set()}}){
    const notices=alertCopy[lang]||alertCopy.ar;
    const strings=copy[lang]||copy.ar;
    const make=(tag,text)=>{const e=document.createElement(tag);if(text!=null)e.textContent=text;return e;};
    const button=(text,fn)=>{const e=make('button',text);e.type='button';e.onclick=fn;return e;};
    const date=value=>{const d=new Date(value);return Number.isFinite(d.valueOf())?d.toLocaleString(lang):'';};
    let serial=0,countSeq=0,alive=true,view='closed',rows=[],next=null;
    const toggle=routeLink||button(strings[0],()=>view==='closed'?list():close()),badge=make('span');
    badge.className='platform-support-count';badge.hidden=true;badge.setAttribute('aria-live','polite');toggle.append(badge);if(!routeLink)nav.append(toggle);
    const panel=make('section'),body=make('div'),status=make('p');panel.className='platform-support';panel.hidden=true;
    panel.id='platform-support-inbox';if(!routeLink){toggle.setAttribute('aria-controls',panel.id);toggle.setAttribute('aria-expanded','false');}
    status.setAttribute('role','status');panel.append(body,status);container.append(panel);
    const current=key=>alive&&panel.isConnected&&key===serial;
    function showCount(value){if(!Number.isSafeInteger(value)||value<0)return;badge.hidden=!value;badge.textContent=value?(routeLink?(value>99?'99+':String(value)):' · '+strings[1]+' '+value):'';if(routeLink)routeLink.setAttribute('aria-label',routeLink.firstChild.textContent+(value?' · '+strings[1]+' '+value:''));}
    const available=window.isSecureContext&&'Notification' in window&&'serviceWorker' in navigator;
    const signature=row=>row.id+'|'+(row.updatedAt||row.createdAt||'');
    function remember(items){for(const row of items)alerts.seen.add(signature(row));while(alerts.seen.size>512)alerts.seen.delete(alerts.seen.values().next().value);}
    async function signal(result){
      if(!alerts.enabled||!available||Notification.permission!=='granted')return;
      const unread=(result.cases||[]).filter(row=>row.unread);
      if(!unread.some(row=>!alerts.seen.has(signature(row))))return;
      const registration=await navigator.serviceWorker.getRegistration(location.href);
      if(!alive||!alerts.enabled||registration?.scope!==new URL('./',location.href).href)return;
      remember(unread);
      await registration.showNotification('WOW Admin',{body:notices[2],tag:'wow-platform-support',icon:new URL('./admin-icon-192.png',location.href).href});
    }
    async function refreshCount(){const seq=++countSeq;try{const result=await request('support.list',{});if(alive&&seq===countSeq){showCount(result.unreadCases);await signal(result);}}catch{/* Opening the inbox exposes a retry on errors. */}}
    function alertControl(){
      if(!available)return;
      const control=button(notices[alerts.enabled?1:0],async()=>{
        if(alerts.enabled){alerts.enabled=false;alerts.seen.clear();control.textContent=notices[0];control.setAttribute('aria-pressed','false');return;}
        control.disabled=true;
        try{
          const permission=Notification.permission==='granted'?'granted':await Notification.requestPermission();
          if(!alive)return;
          if(permission!=='granted'){status.textContent=notices[3];return;}
          const baseline=await request('support.list',{});if(!alive)return;
          const reg=await navigator.serviceWorker.getRegistration(location.href);
          if(!reg||reg.scope!==new URL('./',location.href).href){status.textContent=strings[14];return;}
          if(!alive)return;alerts.seen.clear();remember(baseline.cases||[]);alerts.enabled=true;
          control.textContent=notices[1];control.setAttribute('aria-pressed','true');
        }catch{if(alive)status.textContent=strings[14];}finally{control.disabled=false;}
      });
      control.setAttribute('aria-pressed',String(alerts.enabled));body.append(control);
    }
    function close(){++serial;view='closed';rows=[];next=null;body.replaceChildren();status.textContent='';panel.hidden=true;toggle.setAttribute('aria-expanded','false');toggle.focus();}
    function heading(title){if(routeLink&&view==='list')return;const h=make('h2',title);h.tabIndex=-1;body.append(h);h.focus({preventScroll:true});}
    async function list(append=false){
      const key=++serial;view='list';panel.hidden=false;if(!routeLink)toggle.setAttribute('aria-expanded','true');status.textContent=strings[15];
      if(!append){rows=[];next=null;body.replaceChildren();heading(strings[0]);}
      try{
        const seq=++countSeq,result=await request('support.list',append&&next?{cursor:next}:{});
        if(!current(key))return;if(seq===countSeq)showCount(result.unreadCases);
        const seen=new Set(rows.map(item=>item.id));rows.push(...(result.cases||[]).filter(item=>!seen.has(item.id)));next=result.nextCursor||null;
        body.replaceChildren();heading(strings[0]);body.append(button(strings[3],()=>list()));if(!routeLink)body.append(button(strings[16],close));alertControl();
        if(!rows.length)body.append(make('p',strings[4]));
        for(const row of rows){
          const b=button('',()=>open(row.id));b.className='platform-support-row';
          b.append(make('strong',row.companyName),make('span',row.authorName),make('small',row.unread?strings[1]:strings[2]),make('p',row.text),make('time',date(row.createdAt)));body.append(b);
        }
        if(next)body.append(button(strings[5],()=>list(true)));status.textContent='';
      }catch{if(current(key)){status.textContent=strings[14];body.append(button(strings[3],()=>list()));}}
    }
    async function open(id,sent=false){
      const key=++serial;view='detail';body.replaceChildren(button(strings[6],()=>list()));status.textContent=strings[15];
      try{
        const result=await request('support.open',{caseId:id});if(!current(key))return;
        const report=result.case;if(!report||report.id!==id)throw Error();
        heading(report.companyName||strings[0]);body.append(make('p',report.authorName),make('time',date(report.createdAt)),make('p',report.text));refreshCount();
        const photo=report.photo;
        if(photo?.mime==='image/jpeg'&&typeof photo.base64==='string'&&/^[A-Za-z0-9+/]+=*$/.test(photo.base64)){
          const img=make('img');img.alt=strings[9];img.hidden=true;
          const show=button(strings[7],()=>{img.hidden=!img.hidden;if(img.hidden)img.removeAttribute('src');else img.src='data:image/jpeg;base64,'+photo.base64;show.textContent=strings[img.hidden?7:8];show.setAttribute('aria-expanded',String(!img.hidden));});
          show.setAttribute('aria-expanded','false');body.append(show,img);
        }
        const history=make('div'),historyMore=button(notices[4],loadOlder);body.append(historyMore,history);
        let cursor=result.nextCursor||null;const seenMessages=new Set();historyMore.hidden=!cursor;
        function renderMessages(messages,older=false){
          const batch=document.createDocumentFragment();
          for(const message of messages||[]){
            if(message.id&&seenMessages.has(message.id))continue;
            if(message.id)seenMessages.add(message.id);
            const item=make('article');item.append(make('strong',strings[message.fromFounder?10:11]),make('time',date(message.createdAt)),make('p',message.text));batch.append(item);
          }
          if(older)history.prepend(batch);else history.append(batch);
        }
        async function loadOlder(){
          if(!cursor||historyMore.disabled)return;historyMore.disabled=true;
          try{const earlier=await request('support.open',{caseId:id,cursor});if(!current(key))return;renderMessages(earlier.messages,true);cursor=earlier.nextCursor||null;historyMore.hidden=!cursor;}
          catch{if(current(key))status.textContent=strings[14];}finally{historyMore.disabled=false;}
        }
        renderMessages(result.messages);
        const form=make('form'),label=make('label',strings[12]),input=make('textarea'),send=make('button',strings[13]);send.type='submit';
        input.required=true;input.maxLength=3000;input.rows=3;label.append(input);form.append(label,send);body.append(form);status.textContent=sent?strings[17]:'';
        let previous=null,requestId;
        form.onsubmit=async e=>{
          e.preventDefault();if(send.disabled||!input.value.trim())return;
          const text=input.value.trim();if(text!==previous){requestId=crypto.randomUUID();previous=text;}
          send.disabled=true;input.readOnly=true;
          try{await request('support.reply',{caseId:id,requestId,text});if(current(key))await open(id,true);}
          catch{if(current(key)){send.disabled=false;input.readOnly=false;status.textContent=strings[14];}}
        };
      }catch{if(current(key)){status.textContent=strings[14];body.append(button(strings[3],()=>open(id)));}}
    }
    const onTarget=()=>{if(location.hash==='#support'&&view==='closed')list();};
    const onWorker=event=>{if(event.data?.type==='wow-platform-open-support'&&event.source?.scriptURL===new URL('./sw.js',location.href).href&&view!=='list'){if(routeLink&&location.hash!=='#support')location.hash='support';else list();}};
    window.addEventListener('hashchange',onTarget);navigator.serviceWorker?.addEventListener('message',onWorker);
    if(location.hash==='#support')onTarget();else refreshCount();
    const timer=setInterval(()=>{if(document.visibilityState==='visible')refreshCount();},60000);
    return {dispose(){alive=false;++serial;++countSeq;clearInterval(timer);window.removeEventListener('hashchange',onTarget);navigator.serviceWorker?.removeEventListener('message',onWorker);body.replaceChildren();panel.remove();if(!routeLink)toggle.remove();else badge.remove();}};
  }
  window.WFPlatformSupport=Object.freeze({mount});
})();
