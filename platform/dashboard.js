(() => {
  'use strict';
  const theme=matchMedia('(prefers-color-scheme: dark)');
  const updateTheme=()=>{document.documentElement.dataset.theme=theme.matches?'dark':'light';};
  updateTheme();theme.addEventListener?.('change',updateTheme);
  const dict={
    ar:['إدارة الشركات','اسم مستخدم المؤسس','كلمة المرور','تسجيل الدخول','تسجيل الخروج','اسم الشركة','إنشاء شركة','نشطة','موقوفة','إيقاف','تفعيل','السابق','التالي','الحسابات','رمز إعداد مالك الشركة، صالح لساعة','تعذّر إتمام العملية. تحقق من الاتصال والصلاحيات.','فتح برنامج الشركة','تأكيد تغيير حالة الشركة؟','الاشتراك والاستخدام','حفظ','السعة التخزينية بالبايت','عدد الأجهزة','الخطة','تاريخ انتهاء الاشتراك','الاستخدام'],
    en:['Company administration','Founder username','Password','Sign in','Sign out','Company name','Create company','Active','Suspended','Suspend','Activate','Previous','Next','Accounts','Owner setup code, valid for one hour','Request failed. Check your connection and permissions.','Open company program','Confirm company status change?','Subscription and usage','Save','Storage limit in bytes','Device limit','Plan','Subscription expiry','Usage'],
    tr:['Şirket yönetimi','Kurucu kullanıcı adı','Parola','Oturum aç','Çıkış','Şirket adı','Şirket oluştur','Etkin','Askıda','Askıya al','Etkinleştir','Önceki','Sonraki','Hesaplar','Bir saat geçerli sahip kurulum kodu','İstek başarısız. Bağlantı ve izinleri kontrol edin.','Şirket programını aç','Şirket durumu değiştirilsin mi?','Abonelik ve kullanım','Kaydet','Depolama sınırı (bayt)','Cihaz sınırı','Plan','Abonelik bitişi','Kullanım'],
    fr:['Administration des sociétés','Identifiant du fondateur','Mot de passe','Connexion','Déconnexion','Nom de société','Créer une société','Active','Suspendue','Suspendre','Activer','Précédent','Suivant','Comptes','Code de configuration du propriétaire valable une heure','Échec de la requête. Vérifiez la connexion et vos droits.','Ouvrir le programme','Confirmer le changement de statut ?','Abonnement et utilisation','Enregistrer','Limite de stockage en octets','Limite d’appareils','Formule','Fin de l’abonnement','Utilisation'],
    ru:['Управление компаниями','Имя пользователя основателя','Пароль','Войти','Выйти','Название компании','Создать компанию','Активна','Приостановлена','Приостановить','Активировать','Назад','Далее','Аккаунты','Код настройки владельца действует один час','Не удалось выполнить запрос. Проверьте сеть и права.','Открыть программу','Изменить статус компании?','Подписка и использование','Сохранить','Объём хранилища в байтах','Лимит устройств','Тариф','Окончание подписки','Использование']
  };
  const lang=document.querySelector('#lang'),content=document.querySelector('#content'),status=document.querySelector('#status');
  const config=window.WOW_CLOUD_CONFIG,t=i=>dict[lang.value][i];
  const el=(tag,text)=>{const node=document.createElement(tag);if(text!=null)node.textContent=text;return node;};
  let token='',verifiedName='',offset=0,generation=0,expiryTimer,setup=null,draft=null;
  let scanner=null,supportInbox=null,supportAlerts={enabled:false,seen:new Set()};
  function clear(){showDestination=null;expandedCompany=null;supportInbox?.dispose();supportInbox=null;supportAlerts={enabled:false,seen:new Set()};scanner?.dispose();scanner=null;failureIndex=null;generation++;clearTimeout(expiryTimer);token='';verifiedName='';offset=0;setup=null;draft=null;content.replaceChildren();status.textContent='';}
  const authWords={
    ar:['تحقق من اسم المستخدم وكلمة المرور.','محاولات كثيرة. انتظر قليلًا ثم أعد المحاولة.','تعذّر الاتصال بالخادم. تحقق من الشبكة ثم أعد المحاولة.','يحتاج هذا الحساب إلى صلاحية مؤسس المنصة لإدارة الشركات.','انتهت جلسة الدخول. سجّل الدخول مجددًا.','إلغاء','تعديل الاسم'],
    en:['Check your username and password.','Too many attempts. Wait a moment before trying again.','Could not reach the server. Check your network and try again.','This account needs platform founder access to manage companies.','Your session expired. Sign in again.','Cancel','Rename'],
    tr:['Kullanıcı adınızı ve parolanızı kontrol edin.','Çok fazla deneme. Biraz bekleyip tekrar deneyin.','Sunucuya ulaşılamadı. Ağınızı kontrol edip tekrar deneyin.','Şirketleri yönetmek için platform kurucusu yetkisi gerekir.','Oturumunuz sona erdi. Yeniden giriş yapın.','İptal','Adını değiştir'],
    fr:['Vérifiez votre identifiant et votre mot de passe.','Trop de tentatives. Patientez avant de réessayer.','Serveur inaccessible. Vérifiez votre connexion et réessayez.','Ce compte doit avoir les droits du fondateur de la plateforme pour gérer les sociétés.','Votre session a expiré. Reconnectez-vous.','Annuler','Renommer'],
    ru:['Проверьте имя пользователя и пароль.','Слишком много попыток. Немного подождите и попробуйте снова.','Не удалось связаться с сервером. Проверьте подключение и повторите попытку.','Для управления компаниями нужны права основателя платформы.','Сеанс истёк. Войдите снова.','Отмена','Переименовать']
  };
  const word=i=>authWords[lang.value][i];
  let failureIndex=null;
  function failure(index){return Object.assign(new Error(),{index});}
  function fail(error){if(error?.index===-1)return;failureIndex=error?.index??null;status.textContent=failureIndex==null?t(15):word(failureIndex);}
  async function platformFetch(url,init){
    try{return await fetch(url,init);}catch{throw failure(2);}
  }
  async function request(action,params={}){
    const active=token,reply=await platformFetch(config.endpoint,{method:'POST',cache:'no-store',credentials:'omit',redirect:'error',headers:{'Content-Type':'application/json',apikey:config.publishableKey,Authorization:'Bearer '+active},body:JSON.stringify({action:'platform.'+action,...params})});
    if(active!==token)throw failure(-1);
    if(reply.status===429)throw failure(1);
    if(reply.status===401){clear();login();throw failure(4);}
    if(reply.status===403&&action==='company.list'){
      const reason=await reply.json().catch(()=>({}));
      clear();login();throw (reason.code==='ACCESS_DENIED'||reason.error==='ACCESS_DENIED'||reason.error?.code==='ACCESS_DENIED')?failure(3):new Error();
    }
    const result=await reply.json();if(!reply.ok||result.ok!==true)throw Error();return result;
  }
  function field(container,index,type='text'){
    const label=el('label',t(index)),input=el('input');input.type=type;label.append(input);container.append(label);return input;
  }
  function btn(container,index,fn){
    const b=el('button',t(index));b.type='button';b.onclick=async()=>{b.disabled=true;try{await fn();}catch(reason){fail(reason);}finally{b.disabled=false;}};container.append(b);return b;
  }
  function submit(form,index,fn){const b=el('button',t(index));b.type='submit';form.append(b);form.onsubmit=async e=>{e.preventDefault();if(b.disabled)return;b.disabled=true;try{await fn();}catch(reason){fail(reason);}finally{b.disabled=false;}};}
  function login(){
    scanner?.dispose();content.replaceChildren();const form=el('form'),email=field(form,1,'text'),pass=field(form,2,'password');
    form.className='platform-login';
    const visibility={ar:['إظهار','إخفاء'],en:['Show','Hide'],tr:['Göster','Gizle'],fr:['Afficher','Masquer'],ru:['Показать','Скрыть']}[lang.value];
    const row=el('div'),toggle=el('button',visibility[0]);row.className='platform-password';toggle.type='button';
    pass.id='platform-founder-password';const passLabel=pass.parentElement;passLabel.htmlFor=pass.id;
    passLabel.after(row);row.append(pass,toggle);
    toggle.setAttribute('aria-label',visibility[0]+' '+t(2));toggle.setAttribute('aria-controls',pass.id);toggle.setAttribute('aria-pressed','false');
    toggle.onclick=()=>{const show=pass.type==='password';pass.type=show?'text':'password';
      toggle.setAttribute('aria-pressed',String(show));toggle.textContent=visibility[show?1:0];toggle.setAttribute('aria-label',toggle.textContent+' '+t(2));};
    email.required=pass.required=true;email.autocomplete='username';pass.autocomplete='current-password';content.append(form);
    scanner=window.WFOwnerInvite?.mount(content,new URL('../',location.href),lang.value);
    submit(form,3,async()=>{
      const result=await platformFetch(config.endpoint,{method:'POST',cache:'no-store',credentials:'omit',redirect:'error',headers:{apikey:config.publishableKey,'Content-Type':'application/json'},body:JSON.stringify({action:'auth.signIn',workspaceId:config.workspaceId,username:email.value.trim(),password:pass.value})});
      pass.value='';if(pass.type!=='password')toggle.click();if(!form.isConnected)return;
      if(result.status===401)throw failure(0);
      if(result.status===429)throw failure(1);
      if(!result.ok)throw Error();const {session,identity}=await result.json();token=session.access_token;verifiedName=identity?.currentAccount?.name||'';
      expiryTimer=setTimeout(()=>{clear();login();fail(failure(4));},Math.min(3600000,session.expires_at*1000-Date.now()));await list();
    });
  }
  const salesWords={
    ar:['الحد الأقصى للمستخدمين النشطين','حد تخزين الملفات','وحدة التخزين','سعر الاشتراك','العملة','مدة الاشتراك بالأيام','بلا حد','المستخدمون النشطون','تخزين الملفات الخاصة','تسجيلات الإشعارات','المستخدم','المتبقي','إدارة حسابات الشركة','اترك الحد فارغًا للسماح باستخدام غير محدود.','بدون خطة','غير متاح','حُفظت الخطة','حُفظ الاشتراك','الحد المسموح'],
    en:['Active user limit','File storage limit','Storage unit','Subscription price','Currency','Duration in days','Unlimited','Active users','Private file storage','Notification registrations','Used','Available','Manage company accounts','Leave a limit blank for unlimited use.','No plan','Unavailable','Plan saved','Subscription saved','Allowed'],
    tr:['Etkin kullanıcı sınırı','Dosya depolama sınırı','Depolama birimi','Abonelik fiyatı','Para birimi','Gün olarak süre','Sınırsız','Etkin kullanıcılar','Özel dosya depolama','Bildirim kayıtları','Kullanılan','Kalan','Şirket hesaplarını yönet','Sınırsız kullanım için sınırı boş bırakın.','Plan yok','Kullanılamıyor','Plan kaydedildi','Abonelik kaydedildi','İzin verilen'],
    fr:['Limite de comptes actifs','Limite de stockage des fichiers','Unité de stockage','Prix de l’abonnement','Devise','Durée en jours','Illimité','Comptes actifs','Stockage des fichiers privés','Inscriptions aux notifications','Utilisé','Disponible','Gérer les comptes de la société','Laissez une limite vide pour un usage illimité.','Sans formule','Indisponible','Formule enregistrée','Abonnement enregistré','Autorisé'],
    ru:['Лимит активных пользователей','Лимит хранилища файлов','Единица объёма','Цена подписки','Валюта','Срок в днях','Без ограничений','Активные пользователи','Хранилище частных файлов','Регистрации уведомлений','Использовано','Доступно','Управление аккаунтами компании','Оставьте лимит пустым для использования без ограничений.','Без тарифа','Недоступно','Тариф сохранён','Подписка сохранена','Лимит']
  };
  const sale=i=>salesWords[lang.value][i];
  const storageUnits={GB:1000000000,MB:1000000,KB:1000,B:1};
  function namedField(form,text,type='text'){
    const label=el('label',text),input=el('input');input.type=type;label.append(input);form.append(label);return input;
  }
  function storageText(bytes){
    const unit=Object.keys(storageUnits).find(u=>bytes>=storageUnits[u])||'B';
    return new Intl.NumberFormat(lang.value,{maximumFractionDigits:2}).format(bytes/storageUnits[unit])+' '+unit;
  }
  async function planEditor(container){
    const {plans}=await request('plans.list');if(!container.isConnected)return;
    container.replaceChildren();
    const form=el('form'),pick=el('select'),fresh=el('option','＋');fresh.value='';pick.append(fresh);
    form.className='platform-plan-editor';pick.setAttribute('aria-label',t(22));for(const plan of plans){const o=el('option',plan.name);o.value=plan.id;pick.append(o);}
    form.append(pick);const name=field(form,22),users=namedField(form,sale(0),'number'),amount=namedField(form,sale(1),'number');
    const unitLabel=el('label',sale(2)),unit=el('select');for(const u of Object.keys(storageUnits))unit.append(el('option',u));unitLabel.append(unit);form.append(unitLabel);
    const price=namedField(form,sale(3),'number'),currency=namedField(form,sale(4)),duration=namedField(form,sale(5),'number');
    const devices=field(form,21,'number');name.required=true;name.maxLength=100;
    for(const input of [users,devices,duration]){input.min='0';input.step='1';input.max='2147483647';}
    users.max='1000000';duration.min='1';duration.max='36500';amount.min=price.min='0';amount.step='any';price.step='0.0001';price.max='999999999999.9999';currency.maxLength=3;currency.pattern='[A-Za-z]{3}';
    currency.addEventListener('input',()=>{currency.value=currency.value.toUpperCase();});
    let id=crypto.randomUUID();
    pick.onchange=()=>{
      const plan=plans.find(p=>p.id===pick.value);id=plan?.id||crypto.randomUUID();name.value=plan?.name||'';
      devices.value=plan?.deviceLimit??'';users.value=plan?.userLimit??'';
      const bytes=plan?.storageBytes;
      unit.value=bytes==null||bytes===0?'GB':Object.keys(storageUnits).find(u=>bytes%storageUnits[u]===0);
      amount.value=bytes==null?'':bytes/storageUnits[unit.value];
      price.value=plan?.price??'';currency.value=plan?.currency??'';duration.value=plan?.durationDays??'';
    };
    const integer=value=>value===''?null:Number(value);
    form.append(el('small',sale(13)));
    submit(form,19,async()=>{
      const plan=plans.find(p=>p.id===pick.value);
      const bytes=amount.value===''?null:Number(amount.value)*storageUnits[unit.value];
      if(bytes!==null&&!Number.isSafeInteger(bytes)){amount.setCustomValidity(sale(1));amount.reportValidity();amount.setCustomValidity('');return;}
      if((currency.value==='')!==(price.value==='')){const missing=currency.value?price:currency;missing.setCustomValidity(missing.parentElement.textContent);missing.reportValidity();missing.setCustomValidity('');return;}
      await request('plans.save',{id,name:name.value.trim(),userLimit:integer(users.value),storageBytes:bytes,deviceLimit:integer(devices.value),
        price:price.value||null,currency:currency.value||null,durationDays:integer(duration.value),version:plan?.version||0});
      await planEditor(container);status.textContent=sale(16);
    });container.append(form);
  }
  async function subscription(container,company){
    const [state,{plans}]=await Promise.all([request('limits.get',{workspaceId:company.id}),request('plans.list')]);
    if(!container.isConnected)return;
    container.replaceChildren();const form=el('form'),label=el('label',t(22)),select=el('select'),none=el('option',sale(14));
    none.value='';select.append(none);for(const p of plans){const o=el('option',p.name);o.value=p.id;select.append(o);}select.value=state.planId||'';
    label.append(select);form.append(label);const expiry=field(form,23,'datetime-local');
    const localDate=date=>new Date(date.getTime()-date.getTimezoneOffset()*60000).toISOString().slice(0,16);
    container.classList.add('platform-subscription');
    const originalDate=state.expiresAt?localDate(new Date(state.expiresAt)):'';
    expiry.value=originalDate;
    select.onchange=()=>{
      if(select.value===(state.planId||'')){expiry.value=originalDate;return;}
      const days=plans.find(p=>p.id===select.value)?.durationDays;
      expiry.value='';
      if(days){const date=new Date();date.setDate(date.getDate()+days);expiry.value=localDate(date);}
    };
    submit(form,19,async()=>{
      const expiresAt=expiry.value===originalDate?(state.expiresAt||null):expiry.value?new Date(expiry.value).toISOString():null;
      await request('limits.set',{workspaceId:company.id,planId:select.value||null,expiresAt,version:state.version});
      await subscription(container,company);status.textContent=sale(17);
    });
    const usage=el('dl');
    if(state.plan?.price!=null&&state.plan.currency)usage.append(el('dt',sale(3)),el('dd',String(state.plan.price)+' '+state.plan.currency));
    if(state.plan?.durationDays!=null)usage.append(el('dt',sale(5)),el('dd',state.plan.durationDays));
    for(const [title,used,limit,format] of [[sale(7),state.usedUsers,state.plan?.userLimit,String],[sale(8),state.usedBytes,state.plan?.storageBytes,storageText],[sale(9),state.usedDevices,state.plan?.deviceLimit,String]]){
      const valid=Number.isSafeInteger(used);
      const values=el('dd');
      for(const [caption,value] of [[sale(10),valid?format(used):sale(15)],[sale(18),limit==null?sale(6):format(limit)],[sale(11),limit==null?sale(6):valid?format(Math.max(limit-used,0)):sale(15)]]){
        const item=el('span');item.className='platform-usage-value';item.append(el('small',caption),el('bdi',value));values.append(item);
      }
      usage.append(el('dt',title),values);
    }
    container.append(usage,form);
  }
  const activationWords={
    ar:['إعداد المالك','مالك نشط','دعوة بانتظار التفعيل','انتهت صلاحية الدعوة','لم تُصدر دعوة','إصدار دعوة جديدة','إرسال بريد استعادة الحساب','تأكيد إرسال رابط الاستعادة إلى البريد الموثّق للمالك','طُلب إرسال رابط الاستعادة.','تُلغي الدعوة الجديدة أي دعوة معلّقة لهذه الشركة.'],
    en:['Owner setup','Owner active','Invitation pending','Invitation expired','No invitation issued','Issue new invitation','Send recovery email','Confirm sending a recovery link to the owner’s verified mailbox','Recovery email requested.','A new invitation replaces any pending invitation for this company.'],
    tr:['Sahip kurulumu','Sahip etkin','Davet bekliyor','Davet süresi doldu','Davet gönderilmedi','Yeni davet oluştur','Kurtarma e-postası gönder','Sahibin doğrulanmış adresine kurtarma bağlantısı gönderimini onayla','Kurtarma e-postası istendi.','Yeni davet bu şirketin bekleyen davetinin yerini alır.'],
    fr:['Configuration du propriétaire','Propriétaire actif','Invitation en attente','Invitation expirée','Aucune invitation','Émettre une invitation','Envoyer le courriel de récupération','Confirmer l’envoi du lien de récupération à l’adresse vérifiée du propriétaire','Courriel de récupération demandé.','La nouvelle invitation remplace celle en attente pour cette société.'],
    ru:['Настройка владельца','Владелец активен','Ожидается активация','Приглашение истекло','Приглашение не выдавалось','Создать приглашение','Отправить письмо для восстановления','Подтвердите отправку ссылки на проверенную почту владельца','Письмо для восстановления запрошено.','Новое приглашение заменит ожидающее приглашение этой компании.']
  };
  const inviteCode=()=>Array.from(crypto.getRandomValues(new Uint8Array(32)),v=>v.toString(16).padStart(2,'0')).join('');
  async function ownerSetup(container,company){
    const w=activationWords[lang.value],activation=await request('company.activation',{workspaceId:company.id});
    if(!container.isConnected)return;
    const i=['active','pending','expired','unissued'].indexOf(activation.state);
    if(i<0)throw Error();
    container.replaceChildren(el('h3',w[0]),el('p',w[i+1]));
    if(activation.expiresAt&&i!==0){const at=new Date(activation.expiresAt);if(Number.isFinite(at.valueOf()))container.append(el('time',at.toLocaleString(lang.value)));}
    const recovering=i===0;
    if(recovering&&activation.canRecover!==true)return;
    const button=el('button',w[recovering?6:5]);button.type='button';container.append(button);
    button.onclick=()=>{
      button.hidden=true;
      const form=el('form'),message=el('p',w[recovering?7:9]),cancel=el('button',word(5));
      form.setAttribute('aria-label',w[0]);form.append(message,cancel);container.append(form);
      cancel.type='button';cancel.onclick=()=>{form.remove();button.hidden=false;button.focus();};
      form.onkeydown=e=>{if(e.key==='Escape'){e.preventDefault();cancel.click();}};
      let staged='';
      submit(form,19,async()=>{
        if(recovering){await request('company.recover',{workspaceId:company.id,confirmed:true});if(!container.isConnected)return;
          container.replaceChildren(el('p',w[8]));}
        else{staged||=inviteCode();await request('company.reissue',{workspaceId:company.id,setupToken:staged});
          if(!container.isConnected)return;setup={code:staged,workspace:company.id};await list();}
      });form.querySelector('button[type=submit]').textContent=w[recovering?6:5];cancel.focus();
    };
  }
  const destinations={
    ar:['الشركات','الباقات','الدعم','أقسام الإدارة','لا توجد شركات بعد.'],
    en:['Companies','Plans','Support','Administration sections','No companies yet.'],
    tr:['Şirketler','Paketler','Destek','Yönetim bölümleri','Henüz şirket yok.'],
    fr:['Sociétés','Formules','Support','Sections d’administration','Aucune société pour le moment.'],
    ru:['Компании','Тарифы','Поддержка','Разделы управления','Компаний пока нет.']
  };
  const companyMenu={ar:'إدارة الشركة',en:'Manage company',tr:'Şirketi yönet',fr:'Gérer la société',ru:'Управление компанией'};
  let showDestination=null,expandedCompany=null;
  const pageFromUrl=()=>['plans','support'].includes(location.hash.slice(1))?location.hash.slice(1):'companies';
  window.addEventListener('hashchange',()=>showDestination?.());
  async function list(){
    const ticket=++generation,state=await request('company.list',{offset});if(ticket!==generation)return;
    scanner?.dispose();scanner=null;content.replaceChildren();failureIndex=null;status.textContent='';const nav=el('div'),menu=el('nav'),form=el('form');
    const labels=destinations[lang.value],ids=['companies','plans','support'],panels={},links={};
    nav.className='platform-account-bar';menu.className='platform-section-menu';menu.setAttribute('aria-label',labels[3]);
    content.append(nav,menu);
    for(const [i,id] of ids.entries()){
      const link=el('a'),panel=el('section'),title=el('h2',labels[i]);
      title.tabIndex=-1;title.id='platform-title-'+id;
      link.className='platform-section-link';link.href='#'+id;link.append(el('span',labels[i]));
      panel.className='platform-page';panel.id='platform-page-'+id;panel.hidden=true;
      panel.setAttribute('aria-labelledby',title.id);panel.append(title);content.append(panel);
      link.setAttribute('aria-controls',panel.id);menu.append(link);panels[id]=panel;links[id]=link;
    }
    const companies=panels.companies,plansBox=el('div');panels.plans.append(plansBox);companies.append(form);
    let lastPage=null,loadingPlans=false;
    showDestination=()=>{
      const id=pageFromUrl(),changed=id!==lastPage;
      for(const key of ids){
        panels[key].hidden=key!==id;
        if(key===id)links[key].setAttribute('aria-current','page');else links[key].removeAttribute('aria-current');
      }
      if(id==='plans'&&!plansBox.children.length&&!loadingPlans){
        loadingPlans=true;
        planEditor(plansBox).catch(error=>{
          if(!plansBox.isConnected)return;fail(error);
          const retry=el('button',labels[1]);retry.onclick=()=>{plansBox.replaceChildren();showDestination?.();};plansBox.append(retry);
        }).finally(()=>{loadingPlans=false;});
      }
      if(changed&&lastPage!==null){
        panels[id].querySelector('h2').focus({preventScroll:true});menu.scrollIntoView({block:'nearest'});
      }
      lastPage=id;
    };
    const label={ar:'مدير المنصة الموثّق',en:'Verified platform administrator',tr:'Doğrulanmış platform yöneticisi',fr:'Administrateur de plateforme vérifié',ru:'Подтверждённый администратор платформы'}[lang.value];
    const founder=el('strong',verifiedName),badge=el('span','✓');
    badge.className='wf-founder-check';badge.setAttribute('role','img');badge.setAttribute('aria-label',label);badge.title=label;
    badge.hidden=navigator.onLine===false;founder.append(badge);nav.append(founder);
    btn(nav,4,async()=>{const previous=token;clear();login();await fetch(config.projectUrl+'/auth/v1/logout?scope=local',{method:'POST',headers:{apikey:config.publishableKey,Authorization:'Bearer '+previous},credentials:'omit'});});
    const settings=el('a',{ar:'إعدادات الحساب',en:'Account settings',tr:'Hesap ayarları',fr:'Paramètres du compte',ru:'Настройки аккаунта'}[lang.value]);
    const settingsUrl=new URL('../',location.href);settingsUrl.searchParams.set('wf-cloud','employee');settingsUrl.searchParams.set('workspace',config.workspaceId);settingsUrl.searchParams.set('wf-accounts','cloud');settingsUrl.hash='settings';settings.href=settingsUrl.href;nav.append(settings);
    supportInbox?.dispose();
    supportInbox=window.WFPlatformSupport?.mount({nav,container:panels.support,routeLink:links.support,request,lang:lang.value,alerts:supportAlerts});
    showDestination();
    const name=field(form,5);name.required=true;name.maxLength=100;
    submit(form,6,async()=>{
      const company=name.value.trim();if(!company)return;
      if(draft?.company!==company)draft={company,code:inviteCode()};
      const created=await request('company.create',{name:company,setupToken:draft.code});
      setup={code:draft.code,workspace:created.workspaceId};draft=null;offset=0;await list();
    });
    if(setup){
      const link=el('a',setupLabels[lang.value][5]),url=new URL(location.pathname,location.origin);
      url.searchParams.set('setup',setup.workspace);url.hash='invite='+setup.code;link.href=url.href;
      const invitation=el('section');invitation.className='platform-invite-card';invitation.append(link,el('p',t(14)),el('output',setup.code));companies.append(invitation);
      if(window.ZXingBrowser?.BrowserQRCodeSvgWriter){const qr=new window.ZXingBrowser.BrowserQRCodeSvgWriter().write(url.href,660,660,new Map([[0,'M']]));qr.classList.add('platform-setup-qr');qr.setAttribute('shape-rendering','crispEdges');qr.style.background='white';qr.setAttribute('role','img');qr.setAttribute('aria-label',setupLabels[lang.value][5]);invitation.append(qr);}
    }
    for(const company of state.companies){
      const row=el('article'),active=company.status==='active',link=el('a',t(16));
      const url=new URL('../',location.href);url.searchParams.set('wf-cloud','employee');url.searchParams.set('workspace',company.id);
      link.href=url.href;
      row.append(el('strong',company.name),el('span',t(active?7:8)),el('span',t(13)+' · '+company.accounts),link);
      const details=el('details'),summary=el('summary',companyMenu[lang.value]),tools=el('div');
      details.className='platform-company-tools';details.open=expandedCompany===company.id;
      details.ontoggle=()=>{
        if(!details.isConnected)return;
        if(details.open)expandedCompany=company.id;else if(expandedCompany===company.id)expandedCompany=null;
      };
      details.append(summary,tools);row.append(details);
      const accounts=el('a',sale(12)),accountsUrl=new URL(url);
      accountsUrl.searchParams.set('wf-accounts','cloud');accountsUrl.hash='settings';accounts.href=accountsUrl.href;tools.append(accounts);
      const editArea=el('section');editArea.className='platform-inline-editor';
      function editCompany(trigger,renaming){
        const editor=el('form'),title=el('strong',renaming?word(6):t(17)),cancel=el('button',word(5));
        editArea.replaceChildren(editor);editor.append(title);editor.setAttribute('aria-label',title.textContent);
        let input;
        if(renaming){input=field(editor,5);input.value=company.name;input.required=true;input.maxLength=100;}
        else editor.append(el('span',company.name+' · '+t(active?9:10)));
        const close=()=>{editArea.replaceChildren();trigger.focus();};
        cancel.type='button';cancel.onclick=close;editor.append(cancel);
        editor.onkeydown=event=>{if(event.key==='Escape'){event.preventDefault();close();}};
        submit(editor,renaming?19:active?9:10,async()=>{
          if(renaming){
            const value=input.value.trim();if(!value)return;if(value===company.name){close();return;}
            await request('company.rename',{workspaceId:company.id,name:value});
          }else await request('company.status',{workspaceId:company.id,status:active?'suspended':'active'});
          await list();
        });
        (input||cancel).focus();
      }
      const statusBtn=btn(tools,active?9:10,()=>editCompany(statusBtn,false));
      const rename=btn(tools,5,()=>editCompany(rename,true));rename.textContent=word(6);
      const activationBox=el('section'),activation=btn(tools,6,()=>ownerSetup(activationBox,company));activation.textContent=activationWords[lang.value][0];
      const limitsBox=el('section');btn(tools,18,()=>subscription(limitsBox,company));details.append(editArea,activationBox,limitsBox);companies.append(row);
    }
    if(!state.companies.length)companies.append(el('p',labels[4]));
    const pages=el('nav');companies.append(pages);
    if(offset)btn(pages,11,async()=>{offset=Math.max(0,offset-50);await list();});
    if(offset+50<state.total)btn(pages,12,async()=>{offset+=50;await list();});
  }
  let invite=new URLSearchParams(location.hash.slice(1)).get('invite');
  if(invite)history.replaceState(null,'',location.pathname+location.search);
  const setupLabels={
    ar:['إعداد مالك الشركة','رمز الإعداد','اسم المالك','اسم المستخدم','إنشاء حساب المالك','رابط إعداد المالك'],
    en:['Set up company owner','Setup code','Owner name','Username','Create owner account','Owner setup link'],
    tr:['Şirket sahibi kurulumu','Kurulum kodu','Sahip adı','Kullanıcı adı','Sahip hesabı oluştur','Sahip kurulum bağlantısı'],
    fr:['Configurer le propriétaire','Code de configuration','Nom du propriétaire','Identifiant','Créer le compte propriétaire','Lien de configuration'],
    ru:['Настройка владельца','Код настройки','Имя владельца','Имя пользователя','Создать аккаунт владельца','Ссылка настройки владельца']
  };
  function enroll(workspace){
    content.replaceChildren();const labels=setupLabels[lang.value];document.title=labels[0];document.querySelector('h1').textContent=labels[0];
    const form=el('form');content.append(form);
    const inputs=['password','text','text','password'].map((type,i)=>{
      const label=el('label',i===3?t(2):labels[i+1]),input=el('input');input.type=type;input.required=true;
      input.autocomplete=['off','name','username','new-password'][i];label.append(input);form.append(label);return input;
    });
    if(/^[a-f0-9]{64}$/.test(invite))inputs[0].value=invite;inputs[3].minLength=12;submit(form,6,async()=>{
      const [code,name,user,pass]=inputs;
      const reply=await fetch(config.endpoint,{method:'POST',cache:'no-store',credentials:'omit',redirect:'error',headers:{apikey:config.publishableKey,'Content-Type':'application/json'},body:JSON.stringify({action:'auth.enrollOwner',workspaceId:workspace,setupToken:code.value.trim(),name:name.value.trim(),username:user.value.trim(),password:pass.value})});
      if(!reply.ok)throw Error();
      const url=new URL('../',location.href);url.searchParams.set('wf-cloud','employee');url.searchParams.set('workspace',workspace);location.replace(url.href);
    });form.querySelector('button').textContent=labels[4];
  }
  function render(){document.documentElement.lang=lang.value;document.documentElement.dir=lang.value==='ar'?'rtl':'ltr';document.title=t(0);document.querySelector('h1').textContent=t(0);const ws=new URLSearchParams(location.search).get('setup');if(/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(ws))enroll(ws);else if(token)list().catch(fail);else login();}
  function lockDisconnected(){
    if(!token)return;
    clear();login();status.textContent=word(2);
  }
  window.addEventListener('offline',lockDisconnected);
  window.addEventListener('pagehide',()=>{if(token){clear();login();}});
  window.addEventListener('online',()=>{if(token)list().catch(fail);});
  lang.onchange=()=>{if(failureIndex!=null)status.textContent=word(failureIndex);render();};render();
})();
