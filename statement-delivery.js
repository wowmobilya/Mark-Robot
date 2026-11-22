(function(root){
  'use strict';
  const words={
    ar:['جدولة كشف الحساب','موعد الإرسال','البريد الإلكتروني','واتساب','أؤكد موافقة العميل على استلام نسخة PDF المعروضة عبر القناة المحددة.','تأكيد الجدولة','إلغاء الجدولة','إغلاق','معاينة PDF','خدمة الإرسال غير مهيأة لهذه الشركة أو بيانات الاتصال ناقصة.','تعذّر تنفيذ الطلب.','تمت الجدولة','الملف أكبر من 2 ميغابايت. حدّد فترة أقصر.'],
    en:['Schedule statement','Send at','Email','WhatsApp','I confirm customer consent to receive the displayed PDF on the selected channel.','Confirm schedule','Cancel schedule','Close','Preview PDF','Delivery is not configured for this company or contact details are missing.','Request failed.','Scheduled','PDF exceeds 2 MiB. Select a shorter period.'],
    tr:['Ekstre zamanla','Gönderim zamanı','E-posta','WhatsApp','Müşterinin bu PDF dosyasını seçilen kanaldan almayı kabul ettiğini onaylıyorum.','Zamanla','Planı iptal et','Kapat','PDF önizleme','Şirket için gönderim yapılandırılmadı veya iletişim bilgileri eksik.','İstek başarısız.','Planlandı','PDF 2 MiB sınırını aşıyor. Daha kısa dönem seçin.'],
    fr:['Programmer le relevé','Date d’envoi','E-mail','WhatsApp','Je confirme l’accord du client pour recevoir le PDF affiché par le canal choisi.','Confirmer','Annuler l’envoi','Fermer','Aperçu PDF','Envoi non configuré ou coordonnées manquantes.','Échec de la demande.','Programmé','Le PDF dépasse 2 Mio. Choisissez une période plus courte.'],
    ru:['Запланировать выписку','Время отправки','Почта','WhatsApp','Подтверждаю согласие клиента получить этот PDF по выбранному каналу.','Запланировать','Отменить отправку','Закрыть','Предпросмотр PDF','Отправка не настроена или отсутствуют контакты.','Ошибка запроса.','Запланировано','PDF больше 2 МиБ. Сократите период.']
  };
  const required=['payments.export','invoices.view','customers.view','communications.edit','communications.export'];
  function available(){return !!root.WFCloud?.getSnapshot?.().authenticated&&required.every(k=>root.WFCloud.can(k)&&root.WFAccountAccess?.can(k));}
  function open({file,companyId,language,reportTitle}){
    if(!available())return;
    const L=words[language]||words.ar,api=root.WFCloud,initial=api.getSnapshot(),doc=root.document;
    const ui=doc.createElement('dialog'),el=(tag,text)=>{const n=doc.createElement(tag);if(text)n.textContent=text;return n;};
    const live=()=>ui.open&&available()&&api.getSnapshot().workspaceId===initial.workspaceId&&api.getSnapshot().userId===initial.userId&&api.getSnapshot().authGeneration===initial.authGeneration;
    const btn=(txt,fn)=>{const b=el('button',txt);b.type='button';b.onclick=fn;return b;};
    ui.className='wsa-delivery';ui.dir=language==='ar'?'rtl':'ltr';ui.setAttribute('aria-label',L[0]);doc.body.append(ui);
    const body=el('section'),notes=el('p');notes.setAttribute('role','status');
    const url=URL.createObjectURL(file),preview=el('iframe');preview.title=L[8];preview.hidden=true;
    ui.append(el('h2',L[0]),btn(L[7],()=>ui.close()),btn(L[8],()=>{preview.hidden=!preview.hidden;if(!preview.hidden)preview.src=url;}),preview,body,notes);
    const onSession=()=>{if(!live()&&ui.open)ui.close();};ui.addEventListener('close',()=>{root.removeEventListener('wf-cloud-session-change',onSession);URL.revokeObjectURL(url);ui.remove();},{once:true});
    root.addEventListener('wf-cloud-session-change',onSession);ui.showModal();
    const request=(a,p={})=>api.request('statement.'+a,{companyId,...p},{assertAuthorized(){if(!live())throw Error();}});
    async function load(){
      const state=await request('list');if(!live())return;body.replaceChildren();
      const form=el('form'),select=el('select'),date=el('input'),agree=el('input'),submit=el('button',L[5]);
      for(const [channel,label,contact] of [['email',L[2],state.contact.email],['whatsapp',L[3],state.contact.phone]]){
        if(!contact||!state.providers[channel])continue;const o=el('option',label+' · '+contact);o.value=channel;select.append(o);
      }
      if(file.size>2097152||!select.options.length)body.append(el('p',file.size>2097152?L[12]:L[9]));
      else{
        select.setAttribute('aria-label',L[0]);const zone=Intl.DateTimeFormat().resolvedOptions().timeZone,dateLabel=el('label',L[1]+' · '+zone),consent=el('label',L[4]);
        date.type='datetime-local';date.required=true;dateLabel.append(date);agree.type='checkbox';agree.required=true;consent.prepend(agree);
        form.append(select,dateLabel,consent,submit);body.append(form);let attempt;
        form.onsubmit=async e=>{e.preventDefault();if(submit.disabled||!agree.checked||!live())return;submit.disabled=true;
          try{const channel=select.value,when=new Date(date.value);if(!Number.isFinite(+when)||+when<=Date.now())throw Error();
            const destination=state.contact[channel==='email'?'email':'phone'],key=[channel,date.value,destination].join('|');
            if(attempt?.key!==key)attempt={key,id:crypto.randomUUID()};
            const pdf=await root.WFFileCore.base64(file);if(!live())return;
            await request('schedule',{id:attempt.id,consent:true,workspaceId:initial.workspaceId,channel,destination,label:reportTitle,scheduledAt:when.toISOString(),zone,pdf});
            if(live()){notes.textContent=L[11];await load();}
          }catch{if(live())notes.textContent=L[10];}finally{submit.disabled=false;}
        };
      }
      for(const j of state.items){const row=el('p',new Date(j.scheduledAt).toLocaleString(language,{timeZone:j.zone})+' · '+j.zone+' · '+j.channel+' · '+j.status);
        if(j.status==='queued')row.append(btn(L[6],async()=>{try{await request('cancel',{id:j.id});await load();}catch{if(live())notes.textContent=L[10];}}));body.append(row);}
    }
    load().catch(()=>{if(live())notes.textContent=L[10];});
  }
  root.WFStatementDelivery={open,available,label:lang=>(words[lang]||words.ar)[0]};
})(window);
