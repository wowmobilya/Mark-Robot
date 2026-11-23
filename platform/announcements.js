(() => {
  'use strict';
  const languages=['ar','en','tr','fr','ru'];
  const words={
    ar:['رسائل وإشعارات المستخدمين','المستلمون','كل المستخدمين النشطين','شركة محدّدة','اختر الشركة','عرض شركات أكثر','نوع الرسالة','العنوان','نص الرسالة','إرسال تنبيه للجهاز أيضاً','مراجعة قبل الإرسال','إرسال الآن','رجوع للتعديل','لم يتم العثور على مستخدمين نشطين.','الرسائل المحفوظة للمستخدمين','تنبيهات الأجهزة في قائمة الإرسال','تغيّر المستلمون. راجع القائمة مجدداً.','تعذّر إتمام الطلب. أعد المحاولة.','راجع العنوان والنص قبل الإرسال.','الحسابات المستلمة'],
    en:['User messages and notifications','Recipients','All active users','Specific company','Choose a company','Show more companies','Message type','Title','Message','Also send a device alert','Review before sending','Send now','Back to edit','No active users found.','User inbox messages saved','Device alerts queued','Recipients changed. Review the audience again.','The request could not be completed. Try again.','Review the title and message before sending.','Recipient accounts'],
    tr:['Kullanıcı mesajları ve bildirimleri','Alıcılar','Tüm etkin kullanıcılar','Belirli şirket','Şirket seçin','Daha fazla şirket göster','Mesaj türü','Başlık','Mesaj','Cihaz bildirimi de gönder','Göndermeden önce incele','Şimdi gönder','Düzenlemeye dön','Etkin kullanıcı bulunamadı.','Kullanıcı kutularına kaydedilen mesajlar','Sıraya alınan cihaz bildirimleri','Alıcılar değişti. Alıcıları tekrar inceleyin.','İstek tamamlanamadı. Tekrar deneyin.','Göndermeden önce başlığı ve mesajı inceleyin.','Alıcı hesapları'],
    fr:['Messages et notifications aux utilisateurs','Destinataires','Tous les utilisateurs actifs','Entreprise précise','Sélectionnez une entreprise','Afficher plus d’entreprises','Type de message','Titre','Message','Envoyer aussi une alerte sur les appareils','Vérifier avant envoi','Envoyer maintenant','Modifier','Aucun utilisateur actif trouvé.','Messages enregistrés dans les boîtes de réception','Alertes mises en file d’attente','Les destinataires ont changé. Vérifiez-les à nouveau.','La demande a échoué. Réessayez.','Vérifiez le titre et le message avant l’envoi.','Comptes destinataires'],
    ru:['Сообщения и уведомления пользователям','Получатели','Все активные пользователи','Выбранная компания','Выберите компанию','Показать другие компании','Тип сообщения','Заголовок','Сообщение','Также отправить уведомление на устройство','Проверить перед отправкой','Отправить сейчас','Вернуться к правкам','Активных пользователей нет.','Сообщения сохранены в ящики пользователей','Уведомления поставлены в очередь','Получатели изменились. Проверьте список ещё раз.','Не удалось выполнить запрос. Повторите попытку.','Проверьте заголовок и текст перед отправкой.','Учётные записи получателей']
  };
  const templates={
    general:['إعلان عام','General announcement','Genel duyuru','Annonce générale','Общее объявление'],
    maintenance:['صيانة مجدولة','Scheduled maintenance','Planlı bakım','Maintenance planifiée','Плановое обслуживание'],
    update:['تحديث التطبيق','App update','Uygulama güncellemesi','Mise à jour de l’application','Обновление приложения'],
    security:['إشعار أمني','Security notice','Güvenlik bildirimi','Avis de sécurité','Уведомление безопасности'],
    subscription:['إشعار الاشتراك','Subscription notice','Abonelik bildirimi','Avis d’abonnement','Уведомление о подписке'],
    service:['حالة الخدمة','Service status','Hizmet durumu','État du service','Состояние сервиса']
  };
  function el(tag,text){const node=document.createElement(tag);if(text!==undefined)node.textContent=text;return node;}
  function option(value,label){const node=el('option',label);node.value=value;return node;}
  function field(label,input){const wrapper=el('label',label);wrapper.append(input);return wrapper;}
  function button(label,action){const node=el('button',label);node.type='button';node.addEventListener('click',action);return node;}

  function mount({container,request,language}){
    const w=words[language]||words.ar,locale=Math.max(0,languages.indexOf(language)),number=new Intl.NumberFormat(languages[locale]);
    const details=el('details'),form=el('form'),fields=el('div'),status=el('p'),review=el('section');
    details.className='platform-create-panel';form.className='platform-create-form platform-announcement-form';
    fields.className='platform-announcement-fields';review.className='platform-announcement-review';status.setAttribute('role','status');review.hidden=true;
    const scope=el('select');scope.append(option('all',w[2]),option('company',w[3]));
    const company=el('select');company.append(option('',w[4]));
    const companyField=field(w[4],company);companyField.hidden=true;
    const category=el('select');for(const [key,labels] of Object.entries(templates))category.append(option(key,labels[locale]));
    const title=el('input'),message=el('textarea'),push=el('input');
    title.required=true;title.maxLength=120;message.required=true;message.maxLength=2500;message.rows=6;push.type='checkbox';
    for(const entry of [title,message])entry.dir='auto';
    const submit=el('button',w[10]);submit.type='submit';
    let cursor=0,hasMore=true,loading=false,pending=false,confirmation=null,previousTemplate='';

    const companiesMore=button(w[5],loadCompanies);companiesMore.hidden=true;
    const pushField=field(w[9],push);pushField.className='platform-announcement-push';pushField.prepend(push);
    fields.append(field(w[1],scope),companyField,companiesMore,field(w[6],category),field(w[7],title),field(w[8],message),pushField,submit);
    form.append(fields,review,status);details.append(el('summary',w[0]),form);container.append(details);

    function syncScope(){
      const targeted=scope.value==='company';
      companyField.hidden=!targeted;companiesMore.hidden=!targeted||!hasMore;
      company.required=targeted;
    }
    async function loadCompanies(){
      if(loading||!hasMore)return;
      loading=true;companiesMore.disabled=true;
      try{
        const data=await request('company.list',{offset:cursor});
        if(!Array.isArray(data.companies))throw Error();
        for(const item of data.companies)if(item.status==='active')company.append(option(item.id,item.name));
        cursor+=data.companies.length;hasMore=data.companies.length>0&&cursor<Number(data.total);
      }catch{status.textContent=w[17];}
      finally{loading=false;companiesMore.disabled=false;syncScope();}
    }
    scope.onchange=()=>{syncScope();if(scope.value==='company'&&!cursor)loadCompanies();};
    category.onchange=()=>{
      const next=templates[category.value][locale];
      if(!title.value.trim()||title.value===previousTemplate)title.value=next;
      previousTemplate=next;
    };
    function showEditor(){confirmation=null;review.hidden=true;review.replaceChildren();fields.hidden=false;submit.focus();}

    async function send(){
      if(pending||!confirmation||!details.isConnected)return;
      pending=true;for(const item of review.querySelectorAll('button'))item.disabled=true;
      try{
        const result=await request('announcement.send',{...confirmation.draft,confirmation:confirmation.hash});
        status.textContent=w[14]+' '+number.format(result.recipients)+' · '+w[15]+' '+number.format(result.pushJobs);
        form.reset();syncScope();previousTemplate='';showEditor();
      }catch(error){
        if(error?.code==='INVALID_CONFIRMATION'){showEditor();status.textContent=w[16];}
        else status.textContent=w[17];
      }finally{pending=false;for(const item of review.querySelectorAll('button'))item.disabled=false;}
    }
    form.onsubmit=async event=>{
      event.preventDefault();if(pending||confirmation)return;
      const audience=scope.value==='company'?company.selectedOptions[0]?.textContent:w[2];
      const draft={title:title.value.trim(),text:message.value.trim(),category:category.value,push:push.checked,
        workspaceId:scope.value==='company'?company.value:null,requestId:crypto.randomUUID()};
      if(!draft.title||!draft.text||draft.workspaceId===''){status.textContent=w[18];return;}
      pending=true;submit.disabled=true;status.textContent='';
      try{
        const result=await request('announcement.preview',draft);
        if(!result.recipients){status.textContent=w[13];return;}
        if(!/^[0-9a-f]{64}$/.test(result.confirmation))throw Error();
        confirmation={draft,hash:result.confirmation};
        const heading=el('h3',draft.title),preview=el('p',draft.text);
        heading.dir=preview.dir='auto';heading.style.overflowWrap=preview.style.overflowWrap='anywhere';preview.style.whiteSpace='pre-line';
        review.replaceChildren(heading,preview,el('p',w[19]+' '+number.format(result.recipients)),el('p',audience));
        if(draft.push)review.append(el('p',w[9]));
        const actions=el('div');actions.dataset.actions='';actions.append(button(w[12],showEditor),button(w[11],send));review.append(actions);
        fields.hidden=true;review.hidden=false;review.querySelector('button').focus();
      }catch{status.textContent=w[17];}finally{pending=false;submit.disabled=false;}
    };
  }
  window.WFPlatformAnnouncements={mount};
})();
