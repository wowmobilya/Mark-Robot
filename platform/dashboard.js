(() => {
  'use strict';
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
  const trustKey='wow.platform.remember.v1:'+config.endpoint+':'+config.workspaceId;
  const retention=7*86400000;
  let authEpoch=0,rememberedId='',resuming=null;
  function saved(){
    try{
      const raw=localStorage.getItem(trustKey);if(!raw)return null;
      const entry=JSON.parse(raw);
      if(typeof entry.id==='string'&&entry.id&&typeof entry.userId==='string'&&entry.userId&&Number.isInteger(entry.version)&&
        typeof entry.refresh==='string'&&entry.refresh.length>0&&entry.refresh.length<=4096&&
        Number.isFinite(entry.until)&&entry.until>Date.now()&&entry.until<=Date.now()+retention)return entry;
      localStorage.removeItem(trustKey);
    }catch{}
    return null;
  }
  function forget(id=rememberedId){
    try{if(id&&saved()?.id===id)localStorage.removeItem(trustKey);}catch{}
    if(rememberedId===id)rememberedId='';
  }
  function canRemember(){try{return isSecureContext&&!!navigator.locks?.request&&!!window.localStorage;}catch{return false;}}
  function stampSession(result){
    const account=result.identity?.currentAccount,session=result.session;
    return result.workspaceId===config.workspaceId&&account?.status==='active'&&account.id&&Number.isInteger(account.sessionVersion)&&
      typeof session?.refresh_token==='string'&&session.refresh_token.length>0&&session.refresh_token.length<=4096
      ?{userId:account.id,version:account.sessionVersion,refresh:session.refresh_token}:null;
  }
  function schedule(session){
    clearTimeout(expiryTimer);
    const expiry=session.expires_at*1000;
    // Rotate shortly before expiry so edits have a usable bearer. sign-in without opt-in keeps its original lifetime.
    const deadline=rememberedId?Math.min(saved()?.until||0,expiry-30000):expiry;
    expiryTimer=setTimeout(()=>{clear();login();if(saved())resume().catch(fail);else fail(failure(4));},
      Math.max(0,Math.min(3600000,deadline-Date.now())));
  }
  async function resume(){
    if(resuming||token||!canRemember()||navigator.onLine===false||new URL(location.href).searchParams.has('setup'))return;
    const entry=saved();if(!entry)return;
    const epoch=authEpoch;
    const current=()=>authEpoch===epoch&&navigator.onLine!==false&&saved()?.id===entry.id;
    const task=navigator.locks.request(trustKey,async()=>{
      if(!current())return;
      const reply=await platformFetch(config.endpoint,{method:'POST',cache:'no-store',credentials:'omit',redirect:'error',
        headers:{apikey:config.publishableKey,'Content-Type':'application/json'},body:JSON.stringify({action:'auth.refresh',refreshToken:saved().refresh})});
      if(!current())return;
      if([401,403].includes(reply.status)){forget(entry.id);throw failure(4);}
      if(!reply.ok)throw failure(reply.status===429?1:2);
      const data=await reply.json(),stamp=stampSession(data);
      if(!current())return;
      if(!stamp||stamp.userId!==entry.userId||stamp.version!==entry.version||!data.session.access_token){
        forget(entry.id);throw failure(4);
      }
      // Save rotation before a transient list failure; lists still require live founder authorization.
      localStorage.setItem(trustKey,JSON.stringify({...entry,...stamp}));rememberedId=entry.id;
      token=data.session.access_token;verifiedName=data.identity.currentAccount.name;
      try{await list();if(current()&&token)schedule(data.session);}
      catch(error){if(authEpoch===epoch){clear();login();}throw error;}
    });
    resuming=task;try{await task;}finally{if(resuming===task)resuming=null;}
  }
  let brandList=null;
  function clear(){window.WFPlatformShell?.reset();brandList?.dispose();brandList=null;authEpoch++;rememberedId='';showDestination=null;expandedCompany=null;supportInbox?.dispose();supportInbox=null;supportAlerts={enabled:false,seen:new Set()};scanner?.dispose();scanner=null;failureIndex=null;generation++;clearTimeout(expiryTimer);token='';verifiedName='';offset=0;setup=null;draft=null;content.replaceChildren();status.textContent='';}
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
    if(reply.status===401){forget();clear();login();throw failure(4);}
    if(reply.status===403&&action==='company.list'){
      const reason=await reply.json().catch(()=>({}));
      forget();clear();login();throw (reason.code==='ACCESS_DENIED'||reason.error==='ACCESS_DENIED'||reason.error?.code==='ACCESS_DENIED')?failure(3):new Error();
    }
    const result=await reply.json();if(!reply.ok||result.ok!==true)throw Error();return result;
  }
  function field(container,index,type='text'){
    const label=el('label',t(index)),input=el('input');input.type=type;label.append(input);container.append(label);return input;
  }
  function btn(container,index,fn){
    const b=el('button',t(index));b.type='button';b.classList.add('platform-interactive');
    b.onclick=async()=>{
      if(b.disabled)return;
      b.disabled=true;b.dataset.phase='busy';b.setAttribute('aria-busy','true');
      try{await fn();}catch(reason){fail(reason);}
      finally{b.disabled=false;b.dataset.phase='idle';b.removeAttribute('aria-busy');}
    };container.append(b);return b;
  }
  function submit(form,index,fn){
    const b=el('button',t(index));b.type='submit';b.className='platform-interactive platform-submit';
    form.append(b);
    form.onsubmit=async e=>{
      e.preventDefault();if(b.disabled)return;
      b.disabled=true;b.dataset.phase='busy';b.setAttribute('aria-busy','true');
      try{await fn();}catch(reason){fail(reason);}
      finally{b.disabled=false;b.dataset.phase='idle';b.removeAttribute('aria-busy');}
    };
    return b;
  }
  function login(){
    window.WFPlatformShell?.reset();
    headerActions.hidden=true;headerActions.replaceChildren();
    scanner?.dispose();content.replaceChildren();const form=el('form'),email=field(form,1,'text'),pass=field(form,2,'password');
    form.className='platform-login';
    const visibility={ar:['إظهار','إخفاء'],en:['Show','Hide'],tr:['Göster','Gizle'],fr:['Afficher','Masquer'],ru:['Показать','Скрыть']}[lang.value];
    const row=el('div'),toggle=el('button',visibility[0]);row.className='platform-password';toggle.type='button';
    pass.id='platform-founder-password';const passLabel=pass.parentElement;
    // Keep the password caption as a genuine label; no empty wrapping label
    // should enter the login grid when the input moves beside its visibility button.
    passLabel.htmlFor=pass.id;passLabel.className='platform-password-caption';
    // The input already has a real label; do not duplicate it on the wrapper.
    passLabel.after(row);row.append(pass,toggle);
    toggle.setAttribute('aria-label',visibility[0]+' '+t(2));toggle.setAttribute('aria-controls',pass.id);toggle.setAttribute('aria-pressed','false');
    toggle.onclick=()=>{const show=pass.type==='password';pass.type=show?'text':'password';
      toggle.setAttribute('aria-pressed',String(show));toggle.textContent=visibility[show?1:0];toggle.setAttribute('aria-label',toggle.textContent+' '+t(2));};
    email.required=pass.required=true;email.autocomplete='username';pass.autocomplete='current-password';content.append(form);
    const remember=el('input');remember.type='checkbox';
    if(canRemember()){
      const names={ar:'تذكّرني على هذا الجهاز لمدة ٧ أيام',en:'Remember me on this device for 7 days',tr:'Bu cihazda beni 7 gün hatırla',fr:'Se souvenir de moi sur cet appareil pendant 7 jours',ru:'Запомнить меня на этом устройстве на 7 дней'};
      const label=el('label');label.className='platform-remember';label.append(remember,document.createTextNode(names[lang.value]));form.append(label);
    }
    scanner=window.WFOwnerInvite?.mount(content,new URL('../',location.href),lang.value);
    submit(form,3,async()=>{
      const epoch=++authEpoch;
      const result=await platformFetch(config.endpoint,{method:'POST',cache:'no-store',credentials:'omit',redirect:'error',headers:{apikey:config.publishableKey,'Content-Type':'application/json'},body:JSON.stringify({action:'auth.signIn',founderOnly:true,workspaceId:config.workspaceId,username:email.value.trim(),password:pass.value})});
      pass.value='';if(pass.type!=='password')toggle.click();if(!form.isConnected||epoch!==authEpoch||navigator.onLine===false)return;
      if(result.status===401)throw failure(0);
      if(result.status===403)throw failure(3);
      if(result.status===429)throw failure(1);
      if(!result.ok)throw Error();const data=await result.json(),{session,identity}=data;
      if(epoch!==authEpoch||!form.isConnected)return;
      forget(saved()?.id);token=session.access_token;verifiedName=identity?.currentAccount?.name||'';
      try{await list();}catch(error){if(epoch===authEpoch){clear();login();}throw error;}
      if(epoch!==authEpoch||!token)return;
      const stamp=stampSession(data);
      if(remember.checked&&stamp&&canRemember()){
        const entry={...stamp,id:crypto.randomUUID(),until:Date.now()+retention};
        try{localStorage.setItem(trustKey,JSON.stringify(entry));rememberedId=entry.id;}catch{}
      }
      schedule(session);
    });
  }
  const salesWords={
    ar:['الحد الأقصى للمستخدمين النشطين','حد تخزين الملفات','وحدة التخزين','سعر الاشتراك','العملة','مدة الاشتراك بالأيام','بلا حد','المستخدمون النشطون','تخزين الملفات الخاصة','الأجهزة المرتبطة','المستخدم','المتبقي','إدارة حسابات الشركة','اترك الحد فارغًا للسماح باستخدام غير محدود.','بدون خطة','غير متاح','حُفظت الخطة','حُفظ الاشتراك','الحد المسموح'],
    en:['Active user limit','File storage limit','Storage unit','Subscription price','Currency','Duration in days','Unlimited','Active users','Private file storage','Linked employee phones','Used','Available','Manage company accounts','Leave a limit blank for unlimited use.','No plan','Unavailable','Plan saved','Subscription saved','Allowed'],
    tr:['Etkin kullanıcı sınırı','Dosya depolama sınırı','Depolama birimi','Abonelik fiyatı','Para birimi','Gün olarak süre','Sınırsız','Etkin kullanıcılar','Özel dosya depolama','Bağlı çalışan telefonları','Kullanılan','Kalan','Şirket hesaplarını yönet','Sınırsız kullanım için sınırı boş bırakın.','Plan yok','Kullanılamıyor','Plan kaydedildi','Abonelik kaydedildi','İzin verilen'],
    fr:['Limite de comptes actifs','Limite de stockage des fichiers','Unité de stockage','Prix de l’abonnement','Devise','Durée en jours','Illimité','Comptes actifs','Stockage des fichiers privés','Téléphones employés associés','Utilisé','Disponible','Gérer les comptes de la société','Laissez une limite vide pour un usage illimité.','Sans formule','Indisponible','Formule enregistrée','Abonnement enregistré','Autorisé'],
    ru:['Лимит активных пользователей','Лимит хранилища файлов','Единица объёма','Цена подписки','Валюта','Срок в днях','Без ограничений','Активные пользователи','Хранилище частных файлов','Привязанные телефоны сотрудников','Использовано','Доступно','Управление аккаунтами компании','Оставьте лимит пустым для использования без ограничений.','Без тарифа','Недоступно','Тариф сохранён','Подписка сохранена','Лимит']
  };
  const addonWords={
    ar:['دقائق صوت شهريًا','دقائق فيديو شهريًا','هواتف إضافية للموظفين','مضاعفة دقائق المكالمات والتخزين',
      'هاتف المالك الأساسي لا يدخل ضمن الحد','10 USD لكل هاتف إضافي / شهر','20 USD / شهر: مضاعفة الصوت والفيديو والتخزين',
      'الإضافات شهريًا','التكلفة التقديرية لدورة الاشتراك','دقائق اتصال فعلية للشهر الحالي (UTC)'],
    en:['Monthly voice minutes','Monthly video minutes','Extra staff phones','Double calls and storage',
      'The primary owner phone does not use a slot','USD 10 per extra staff phone / month',
      'USD 20 / month: double voice, video and storage','Monthly add-ons','Estimated subscription-period total','Measured call minutes for the current UTC month'],
    tr:['Aylık sesli dakika','Aylık video dakikası','Ek çalışan telefonu','Aramaları ve depolamayı ikiye katla',
      'Ana sahibin telefonu bu sınıra dahil değildir','Ek çalışan telefonu başına aylık 10 USD',
      'Aylık 20 USD: arama ve depolama iki kat','Aylık ek ücretler','Dönem tahmini toplamı','Bu UTC ayında gerçekleşen arama dakikaları'],
    fr:['Minutes audio mensuelles','Minutes vidéo mensuelles','Téléphones employés supplémentaires','Doubler appels et stockage',
      'Le téléphone principal du propriétaire est exclu','10 USD par téléphone employé / mois',
      '20 USD / mois : doubler appels et stockage','Options mensuelles','Total estimé pour la période','Minutes réellement enregistrées ce mois UTC'],
    ru:['Минуты аудио в месяц','Минуты видео в месяц','Дополнительные телефоны персонала','Удвоить звонки и хранилище',
      'Основной телефон владельца не занимает слот','10 USD за дополнительный телефон в месяц',
      '20 USD / месяц: удвоение звонков и хранилища','Доплаты в месяц','Расчёт за период','Фактические минуты звонков за месяц UTC']
  };
  const sale=i=>salesWords[lang.value][i];
  const addon=i=>addonWords[lang.value][i];
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
    const devices=field(form,21,'number');
    const voiceMinutes=namedField(form,addon(0),'number'),videoMinutes=namedField(form,addon(1),'number');
    voiceMinutes.min=videoMinutes.min='0';voiceMinutes.max=videoMinutes.max='100000';
    voiceMinutes.step=videoMinutes.step='1';
    name.required=true;name.maxLength=100;
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
      voiceMinutes.value=plan?.voiceMinutes??'';videoMinutes.value=plan?.videoMinutes??'';
    };
    const integer=value=>value===''?null:Number(value);
    form.append(el('small',sale(13)));
    submit(form,19,async()=>{
      const plan=plans.find(p=>p.id===pick.value);
      const bytes=amount.value===''?null:Number(amount.value)*storageUnits[unit.value];
      if(bytes!==null&&!Number.isSafeInteger(bytes)){amount.setCustomValidity(sale(1));amount.reportValidity();amount.setCustomValidity('');return;}
      if((currency.value==='')!==(price.value==='')){const missing=currency.value?price:currency;missing.setCustomValidity(missing.parentElement.textContent);missing.reportValidity();missing.setCustomValidity('');return;}
      await request('plans.save',{id,name:name.value.trim(),userLimit:integer(users.value),storageBytes:bytes,deviceLimit:integer(devices.value),
        price:price.value||null,currency:currency.value||null,durationDays:integer(duration.value),
        voiceMinutes:integer(voiceMinutes.value),videoMinutes:integer(videoMinutes.value),
        version:plan?.version||0});
      await planEditor(container);status.textContent=sale(16);
    });
    container.append(form);
    window.WFPlatformPricing?.mount(container,plans,(tier,existing)=>{
      if(existing){
        pick.value=existing.id;pick.onchange();
      }else{
        pick.value='';pick.onchange();id=tier.id;
        name.value=tier.name;price.value=tier.price;currency.value='USD';duration.value=tier.days;
        users.value='';devices.value='2';amount.value='2';unit.value='GB';
        voiceMinutes.value='500';videoMinutes.value='250';
      }
      price.focus({preventScroll:true});
      form.scrollIntoView({block:'nearest',behavior:'instant'});
    },request);
  }
  async function subscription(container,company){
    const [state,{plans}]=await Promise.all([request('limits.get',{workspaceId:company.id}),request('plans.list')]);
    if(!container.isConnected)return;
    container.replaceChildren();const form=el('form'),label=el('label',t(22)),select=el('select'),none=el('option',sale(14));
    none.value='';select.append(none);for(const p of plans){const o=el('option',p.name);o.value=p.id;select.append(o);}select.value=state.planId||'';
    label.append(select);form.append(label);const expiry=field(form,23,'datetime-local');
    const localDate=date=>new Date(date.getTime()-date.getTimezoneOffset()*60000).toISOString().slice(0,16);
    container.classList.add('platform-subscription');
    const extras=namedField(form,addon(2),'number');
    extras.min='0';extras.max='100';extras.step='1';extras.value=String(state.extraDevices??0);
    const doubledLabel=el('label'),doubled=el('input'),doubledCaption=el('span',addon(3));
    doubled.type='checkbox';doubled.checked=state.doubleBundle===true;
    doubledLabel.className='platform-addon-toggle';doubledLabel.append(doubled,doubledCaption);
    form.append(doubledLabel);
    const pricing=el('output');pricing.className='platform-addon-price';
    const recalc=()=>{
      const monthCharge=Math.max(0,Number(extras.value)||0)*10+(doubled.checked?20:0);
      const tier=plans.find(p=>p.id===select.value),months=Number(tier?.durationDays||0)<=30?1:Number(tier?.durationDays||0)<=365?12:24;
      const base=Number(tier?.price||0),currency=tier?.currency||'USD';
      const fmt=n=>new Intl.NumberFormat(lang.value,{style:'currency',currency:'USD',maximumFractionDigits:2}).format(n);
      pricing.textContent=addon(7)+': '+fmt(monthCharge)+
        (currency==='USD'&&tier?' · '+addon(8)+': '+fmt(base+monthCharge*months):'');

    };
    extras.addEventListener('input',recalc);doubled.addEventListener('change',recalc);
    select.addEventListener('change',recalc);recalc();
    form.append(el('small',addon(4)),el('small',addon(5)),el('small',addon(6)),pricing);
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
      await request('limits.set',{workspaceId:company.id,planId:select.value||null,expiresAt,
        extraDevices:select.value?Number(extras.value):0,doubleBundle:select.value&&doubled.checked,version:state.version});
      await subscription(container,company);status.textContent=sale(17);
    });
    const usage=el('dl');
    if(state.plan?.price!=null&&state.plan.currency)usage.append(el('dt',sale(3)),el('dd',String(state.plan.price)+' '+state.plan.currency));
    if(state.plan?.durationDays!=null)usage.append(el('dt',sale(5)),el('dd',state.plan.durationDays));
    for(const [title,used,limit,format] of [
       [sale(7),state.usedUsers,state.plan?.userLimit,String],
       [sale(8),state.usedBytes,state.effectiveStorageBytes??state.plan?.storageBytes,storageText],
       [sale(9),state.usedDevices,state.effectiveDeviceLimit??state.plan?.deviceLimit,String],
       [addon(0),state.usedVoiceMinutes,state.effectiveVoiceMinutes??state.plan?.voiceMinutes,String],
       [addon(1),state.usedVideoMinutes,state.effectiveVideoMinutes??state.plan?.videoMinutes,String]
      ]){
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
  async function ownerSetup(container,company,onVerified){
    const w=activationWords[lang.value],activation=await request('company.activation',{workspaceId:company.id});
    if(!container.isConnected)return;
    onVerified?.(activation);
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
    ar:['الشركات','الباقات','الدعم','أقسام الإدارة','لا توجد شركات بعد.','المكالمات'],
    en:['Companies','Plans','Support','Administration sections','No companies yet.','Calls'],
    tr:['Şirketler','Paketler','Destek','Yönetim bölümleri','Henüz şirket yok.','Aramalar'],
    fr:['Sociétés','Formules','Support','Sections d’administration','Aucune société pour le moment.','Appels'],
    ru:['Компании','Тарифы','Поддержка','Разделы управления','Компаний пока нет.','Звонки']
  };
  const deviceWords={
    ar:['الأجهزة المرتبطة','لا توجد أجهزة مرتبطة بهذه الشركة.','فك الارتباط','بعد التأكيد يستطيع صاحب هذا الحساب ربط جهاز آخر بتسجيل الدخول. تحقق من هوية صاحب الطلب.','تأكيد فك الارتباط','تاريخ الربط','مالك الشركة','تم فك ربط الجهاز.'],
    en:['Linked devices','This company has no linked devices.','Release device','After confirmation, this account can link a different device by signing in. Verify who requested the change.','Confirm release','Linked on','Company owner','Device released.'],
    tr:['Bağlı cihazlar','Bu şirkete bağlı cihaz yok.','Cihazı ayır','Onaydan sonra hesap sahibi giriş yaparak başka bir cihaz bağlayabilir. İsteği yapan kişiyi doğrulayın.','Ayırmayı onayla','Bağlanma tarihi','Şirket sahibi','Cihaz bağlantısı kaldırıldı.'],
    fr:['Appareils associés','Aucun appareil associé à cette société.','Dissocier','Après confirmation, ce compte pourra associer un autre appareil en se connectant. Vérifiez l’identité du demandeur.','Confirmer la dissociation','Date d’association','Propriétaire','Appareil dissocié.'],
    ru:['Привязанные устройства','У компании нет привязанных устройств.','Отвязать устройство','После подтверждения владелец сможет привязать другое устройство при входе. Проверьте, кто запросил изменение.','Подтвердить отвязку','Дата привязки','Владелец компании','Устройство отвязано.']
  };
  const blockWords={
    ar:['حظر الجهاز','رفع الحظر','جهاز محظور','سيُمنع الجهاز من دخول حساب هذه الشركة حتى ترفع الحظر. سيبقى مرتبطًا بالحساب.','سيُسمح للجهاز المرتبط بتسجيل الدخول مجددًا ضمن صلاحيات الحساب.'],
    en:['Block device','Unblock device','Device blocked','This device will be denied cloud access to this company account until you unblock it. It stays linked.','The linked device may sign in again with the account’s permissions.'],
    tr:['Cihazı engelle','Engeli kaldır','Cihaz engellendi','Engeli kaldırana kadar cihaz bu şirket hesabına giriş yapamaz. Bağlantısı sürer.','Bağlı cihaz hesap izinleriyle yeniden giriş yapabilir.'],
    fr:['Bloquer l’appareil','Débloquer l’appareil','Appareil bloqué','Cet appareil ne pourra plus accéder au compte cloud de cette société jusqu’au déblocage. Il reste associé.','L’appareil associé pourra se reconnecter avec les droits du compte.'],
    ru:['Заблокировать','Разблокировать','Устройство заблокировано','Доступ устройства к облачному аккаунту компании будет закрыт до снятия запрета. Привязка сохранится.','Привязанное устройство снова сможет войти с правами аккаунта.']
  };
  async function companyDevices(host,workspaceId,offset=0){
    const w=deviceWords[lang.value],result=await request('company.devices',{workspaceId,offset});
    if(!host.isConnected)return;
    if(!Array.isArray(result.devices)||!Number.isSafeInteger(result.total))throw Error();
    if(!result.devices.length&&offset>0)return companyDevices(host,workspaceId,Math.max(0,offset-30));
    host.replaceChildren(el('h3',w[0]));
    if(!result.devices.length)host.append(el('p',w[1]));
    for(const device of result.devices){
      const card=el('div'),identity=el('strong',device.name||device.username);
      card.className='platform-linked-device';identity.dir='auto';card.append(identity);
      if(device.username&&device.name!==device.username)card.append(el('bdi',device.username));
      if(device.role==='owner')card.append(el('small',w[6]));
      const date=new Date(device.boundAt);if(device.boundAt&&Number.isFinite(date.valueOf())){
        const linked=el('time',w[5]+' · '+date.toLocaleString(lang.value));linked.dateTime=date.toISOString();card.append(linked);
      }
      const options=el('div'),b=blockWords[lang.value];
      if(device.blocked)card.append(el('small',b[2]));
      card.append(options);host.append(card);options.className='platform-device-options';
      for(const action of device.blocked?['unblock']:['block','release']){
        const releasing=action==='release',blocking=action==='block',actionName=releasing?w[2]:b[blocking?0:1];
        const trigger=el('button',actionName);trigger.type='button';trigger.className='platform-device-action';trigger.dataset.action=action;options.append(trigger);
        trigger.onclick=()=>{
          options.hidden=true;
          const form=el('form'),cancel=el('button',word(5)),confirm=el('button',releasing?w[4]:actionName);form.className='platform-device-confirm';
          cancel.className='platform-action-cancel';confirm.className='platform-action-confirm';
          confirm.dataset.action=action;
          form.setAttribute('aria-label',actionName+' · '+identity.textContent);cancel.type='button';confirm.type='submit';
          const close=()=>{form.remove();options.hidden=false;trigger.focus();};
          cancel.onclick=close;form.onkeydown=e=>{if(e.key==='Escape'&&!confirm.disabled){e.preventDefault();close();}};
          form.append(el('strong',identity.textContent),el('p',releasing?w[3]:b[blocking?3:4]),cancel,confirm);card.append(form);cancel.focus();
          form.onsubmit=async e=>{
            e.preventDefault();if(confirm.disabled)return;confirm.disabled=cancel.disabled=true;
            try{
              const target={workspaceId,accountId:device.accountId,expectedBoundAt:device.boundAt,confirmed:true};
              const saved=await request(releasing?'company.releaseDevice':'company.deviceStatus',releasing?target:{...target,blocked:blocking});
              if(!host.isConnected)return;if(releasing&&saved.released!==true)throw Error();
              if(releasing)status.textContent=w[7];
              await companyDevices(host,workspaceId,offset);
            }catch(reason){fail(reason);}
            finally{confirm.disabled=cancel.disabled=false;}
          };
        };
      }
    }
    const pages=el('nav');
    if(offset>0)btn(pages,11,()=>companyDevices(host,workspaceId,Math.max(0,offset-30)));
    if(offset+result.devices.length<result.total)btn(pages,12,()=>companyDevices(host,workspaceId,offset+30));
    if(pages.childElementCount)host.append(pages);
  }
  const companyMenu={ar:'إدارة الشركة',en:'Manage company',tr:'Şirketi yönet',fr:'Gérer la société',ru:'Управление компанией'};
  const companyCardWords={
    ar:['ربط البرنامج','جارِ التحقق من تفعيل المالك','المالك مفعّل','بانتظار تفعيل المالك','الدعوة منتهية','لم تصدر دعوة','تعذّر التحقق','تحديث حالة الربط','حالة الاتصال المباشر غير متوفرة','الحسابات','فتح برنامج الشركة'],
    en:['Program link','Checking owner activation','Owner activated','Awaiting owner activation','Invitation expired','No invitation issued','Could not verify','Refresh link status','Live connection status unavailable','Accounts','Open company program'],
    tr:['Program bağlantısı','Sahip etkinliği kontrol ediliyor','Sahip etkin','Sahip etkinleştirmesi bekleniyor','Davet süresi doldu','Davet oluşturulmadı','Kontrol edilemedi','Bağlantı durumunu yenile','Canlı bağlantı durumu mevcut değil','Hesaplar','Şirket programını aç'],
    fr:['Lien au programme','Vérification de l’activation','Propriétaire activé','Activation en attente','Invitation expirée','Aucune invitation','Vérification impossible','Actualiser le statut','Connexion en direct indisponible','Comptes','Ouvrir le programme'],
    ru:['Связь с программой','Проверка активации владельца','Владелец активен','Ожидается активация','Срок приглашения истёк','Приглашение не создано','Не удалось проверить','Обновить статус','Онлайн-статус недоступен','Аккаунты','Открыть программу']
  };
  let showDestination=null,expandedCompany=null;
  const header=document.querySelector('main > header'),headerActions=el('div');
  headerActions.className='platform-header-actions';headerActions.hidden=true;header.append(headerActions);
  // One predictable order across mobile and desktop, matching WOW's primary workspaces.
  function arrangeMenu(){
    const menu=content.querySelector('.platform-section-menu');if(!menu)return;
    const focused=menu.contains(document.activeElement)?document.activeElement:null;
    for(const key of ['home','companies','plans','support','calls','settings']){
      const link=menu.querySelector('a[href="#'+key+'"]');if(link)menu.append(link);
    }
    focused?.focus({preventScroll:true});
  }
  const topLabels={
    ar:['العودة إلى الرئيسية','صندوق رسائل الدعم'],en:['Back to dashboard','Support inbox'],
    tr:['Ana sayfaya dön','Destek gelen kutusu'],fr:['Retour à l’accueil','Boîte de réception du support'],
    ru:['Вернуться на главную','Обращения в поддержку']
  };
  const homeWords={
    ar:{navHome:'الرئيسية',heading:'مركز إدارة WOW',caption:'ملخص موثّق واختصارات مباشرة لإدارة المنصة',quick:'الأقسام السريعة',
      companies:'الشركات',companyNote:'قائمة الشركات والصلاحيات والتفعيل',create:'إضافة شركة',createNote:'إنشاء شركة وإعداد حساب مالكها',
      plans:'الباقات',plansNote:'الأسعار والاشتراكات والحدود',support:'الدعم',supportNote:'طلبات العملاء والردود',
      calls:'المكالمات',callsNote:'العبور واستهلاك المكالمات',settings:'الإعدادات',settingsNote:'المظهر والحساب',
      formHelp:'أنشئ شركة جديدة ثم شارك رابط إعداد المالك الآمن',openForm:'إضافة شركة جديدة'},
    en:{navHome:'Home',heading:'WOW Control Center',caption:'Verified overview and quick routes to your administration',quick:'Quick sections',
      companies:'Companies',companyNote:'Company list, permissions and activation',create:'Add company',createNote:'Create a workspace and invite the owner',
      plans:'Plans',plansNote:'Pricing, subscriptions and limits',support:'Support',supportNote:'Customer requests and replies',
      calls:'Calls',callsNote:'Relay and call usage',settings:'Settings',settingsNote:'Appearance and account',
      formHelp:'Create a company and share its secure owner setup invitation',openForm:'Add a new company'},
    tr:{navHome:'Ana sayfa',heading:'WOW Yönetim Merkezi',caption:'Doğrulanmış özet ve yönetim kısayolları',quick:'Hızlı bölümler',
      companies:'Şirketler',companyNote:'Şirketler, izinler ve etkinleştirme',create:'Şirket ekle',createNote:'Şirket oluşturun ve sahibini davet edin',
      plans:'Paketler',plansNote:'Fiyatlar, abonelikler ve sınırlar',support:'Destek',supportNote:'Müşteri talepleri ve yanıtlar',
      calls:'Aramalar',callsNote:'Aktarım ve kullanım',settings:'Ayarlar',settingsNote:'Görünüm ve hesap',
      formHelp:'Yeni bir şirket oluşturun ve güvenli sahip davetini paylaşın',openForm:'Yeni şirket ekle'},
    fr:{navHome:'Accueil',heading:'Centre de gestion WOW',caption:'Vue vérifiée et accès rapides à l’administration',quick:'Accès rapides',
      companies:'Sociétés',companyNote:'Liste, droits et activation',create:'Ajouter une société',createNote:'Créer et inviter le propriétaire',
      plans:'Formules',plansNote:'Tarifs, abonnements et quotas',support:'Assistance',supportNote:'Demandes et réponses',
      calls:'Appels',callsNote:'Relais et consommation',settings:'Réglages',settingsNote:'Affichage et compte',
      formHelp:'Créez la société puis partagez l’invitation sécurisée',openForm:'Ajouter une société'},
    ru:{navHome:'Главная',heading:'Центр управления WOW',caption:'Проверенная сводка и быстрый переход к управлению',quick:'Быстрые разделы',
      companies:'Компании',companyNote:'Список, права и активация',create:'Добавить компанию',createNote:'Создать компанию и пригласить владельца',
      plans:'Тарифы',plansNote:'Цены, подписки и лимиты',support:'Поддержка',supportNote:'Запросы клиентов и ответы',
      calls:'Звонки',callsNote:'Ретрансляция и использование',settings:'Настройки',settingsNote:'Оформление и аккаунт',
      formHelp:'Создайте компанию и поделитесь защищённым приглашением',openForm:'Добавить компанию'}
  };
  const settingsWords={
    ar:['الإعدادات','تفضيلات هذا الجهاز','حساب المؤسس','إعدادات الحساب'],
    en:['Settings','Device preferences','Founder account','Account settings'],
    tr:['Ayarlar','Cihaz tercihleri','Kurucu hesabı','Hesap ayarları'],
    fr:['Réglages','Préférences de cet appareil','Compte fondateur','Paramètres du compte'],
    ru:['Настройки','Настройки устройства','Аккаунт основателя','Настройки аккаунта']
  };
  const passwordWords={
    ar:['تغيير كلمة المرور','كلمة المرور الحالية','كلمة المرور الجديدة (12–128 حرفاً)','تأكيد كلمة المرور الجديدة','كلمتا المرور غير متطابقتين.','كلمة المرور الحالية غير صحيحة.','تغيّرت كلمة المرور. سجّل الدخول بكلمة المرور الجديدة.'],
    en:['Change password','Current password','New password (12–128 characters)','Confirm new password','The new passwords do not match.','The current password is incorrect.','Password changed. Sign in with your new password.'],
    tr:['Parolayı değiştir','Mevcut parola','Yeni parola (12–128 karakter)','Yeni parolayı doğrula','Yeni parolalar eşleşmiyor.','Mevcut parola yanlış.','Parola değiştirildi. Yeni parolanızla giriş yapın.'],
    fr:['Modifier le mot de passe','Mot de passe actuel','Nouveau mot de passe (12–128 caractères)','Confirmer le nouveau mot de passe','Les nouveaux mots de passe ne correspondent pas.','Le mot de passe actuel est incorrect.','Mot de passe modifié. Connectez-vous avec votre nouveau mot de passe.'],
    ru:['Изменить пароль','Текущий пароль','Новый пароль (12–128 символов)','Подтвердите новый пароль','Новые пароли не совпадают.','Неверный текущий пароль.','Пароль изменён. Войдите с новым паролем.']
  };
  function passwordSettings(account){
    const words=passwordWords[lang.value],section=el('details'),toggle=el('summary',words[0]),form=el('form'),note=el('p');
    section.className='platform-password-settings';note.setAttribute('role','status');
    const current=namedField(form,words[1],'password'),next=namedField(form,words[2],'password'),confirm=namedField(form,words[3],'password');
    current.autocomplete='current-password';next.autocomplete=confirm.autocomplete='new-password';
    for(const input of [current,next,confirm]){input.required=true;input.dir='auto';}
    const save=el('button',words[0]);save.type='submit';form.append(save,note);section.append(toggle,form);account.append(section);
    section.addEventListener('toggle',()=>{if(!section.open){form.reset();note.textContent='';}});
    form.onsubmit=async event=>{
      event.preventDefault();if(save.disabled||!token)return;
      if(Array.from(next.value).length<12||Array.from(next.value).length>128){note.textContent=words[2];next.focus();return;}
      if(next.value!==confirm.value){note.textContent=words[4];confirm.focus();return;}
      const active=token,epoch=authEpoch,remember=rememberedId;save.disabled=true;note.textContent='';
      try{
        const reply=await platformFetch(config.endpoint,{method:'POST',cache:'no-store',credentials:'omit',redirect:'error',
          headers:{'Content-Type':'application/json',apikey:config.publishableKey,Authorization:'Bearer '+active},
          body:JSON.stringify({action:'accounts.changePassword',founderOnly:true,reauthenticate:true,currentPassword:current.value,newPassword:next.value})});
        const result=await reply.json();
        if(epoch!==authEpoch||active!==token)return;
        if(reply.status===401){forget(remember);clear();login();throw failure(4);}
        if(reply.status===429)throw failure(1);
        if(result.error?.code==='CURRENT_PASSWORD_INCORRECT'){current.value='';note.textContent=words[5];current.focus();return;}
        if(!reply.ok||result.ok!==true)throw Error();
        form.reset();forget(remember);clear();login();status.textContent=words[6];content.querySelector('[autocomplete=username]')?.focus();
      }catch(error){if(save.isConnected)note.textContent=error.index==null?t(15):word(error.index);else if(error.index===4)fail(error);}
      finally{save.disabled=false;}
    };
    return section;
  }
  const pageFromUrl=()=>['home','companies','plans','support','calls','settings'].includes(location.hash.slice(1))?location.hash.slice(1):'home';
  window.addEventListener('hashchange',()=>showDestination?.());
  async function list(){
    const ticket=++generation,state=await request('company.list',{offset});if(ticket!==generation)return;
    scanner?.dispose();scanner=null;content.replaceChildren();failureIndex=null;status.textContent='';const nav=el('div'),menu=el('nav'),form=el('form');
    const labels=destinations[lang.value],settingsText=settingsWords[lang.value],homepage=homeWords[lang.value];
    const ids=['home','companies','plans','support','calls','settings'],titles=[homepage.heading,labels[0],labels[1],labels[2],labels[5],settingsText[0]],panels={},links={};
    nav.className='platform-account-bar';menu.className='platform-section-menu';menu.setAttribute('aria-label',labels[3]);
    headerActions.hidden=false;headerActions.replaceChildren();
    const home=el('a'),inbox=el('a');
    for(const [link,id,description] of [[home,'home',topLabels[lang.value][0]],[inbox,'support',topLabels[lang.value][1]]]){
      link.href='#'+id;link.className='platform-header-link';link.setAttribute('aria-label',description);link.title=description;
      headerActions.append(link);
    }
    content.append(nav,menu);
    for(const [i,id] of ids.entries()){
      const link=el('a'),panel=el('section'),title=el('h2',titles[i]);
      title.tabIndex=-1;title.id='platform-title-'+id;
      link.className='platform-section-link';link.href='#'+id;
      const tile=el('span'),caption=el('span',id==='home'?homepage.navHome:title.textContent);
      tile.className='platform-nav-icon';caption.className='platform-nav-label';
      tile.setAttribute('aria-hidden','true');link.append(tile,caption);
      panel.className='platform-page';panel.id='platform-page-'+id;panel.hidden=true;
      panel.setAttribute('aria-labelledby',title.id);panel.append(title);content.append(panel);
      link.setAttribute('aria-controls',panel.id);menu.append(link);panels[id]=panel;links[id]=link;
    }
    arrangeMenu();
    const companies=panels.companies,plansBox=el('div');panels.plans.append(plansBox);
    const hero=el('section'),heroTitle=el('h3',homepage.heading),heroLead=el('p',homepage.caption);
    hero.className='platform-home-hero';hero.append(heroTitle,heroLead);
    const quickHeading=el('h3',homepage.quick),quick=el('nav');
    quick.className='platform-home-quick';quick.setAttribute('aria-label',homepage.quick);
    const shortcuts=[
      ['companies','companies','companyNote'],['create','create','createNote'],['plans','plans','plansNote'],
      ['support','support','supportNote'],['calls','calls','callsNote'],['settings','settings','settingsNote']
    ];
    for(const [key,labelKey,noteKey] of shortcuts){
      const link=el('a'),icon=el('span'),body=el('span'),title=el('strong',homepage[labelKey]),note=el('small',homepage[noteKey]);
      link.className='platform-home-shortcut';link.dataset.shortcut=key;
      link.href='#'+(key==='create'?'companies':key);
      icon.className='platform-home-shortcut-icon';icon.setAttribute('aria-hidden','true');
      body.className='platform-home-shortcut-copy';body.append(title,note);link.append(icon,body);
      quick.append(link);
    }
    panels.home.append(hero,quickHeading,quick);
    const createPanel=el('details'),createSummary=el('summary',homepage.openForm),createHint=el('p',homepage.formHelp);
    createPanel.className='platform-create-panel';createHint.className='platform-create-hint';
    form.className='platform-create-form';form.append(createHint);
    createPanel.append(createSummary,form);companies.append(createPanel);
    let lastPage=null,loadingPlans=false;
    showDestination=()=>{
      const id=pageFromUrl(),changed=id!==lastPage;
      if(changed&&lastPage==='settings'){const details=panels.settings.querySelector('.platform-password-settings');if(details)details.open=false;}
      home.hidden=id==='home';inbox.hidden=id==='support';
      for(const key of ids){
        panels[key].hidden=key!==id;
        if(key===id)links[key].setAttribute('aria-current','page');else links[key].removeAttribute('aria-current');
      }
      if(id==='calls'&&!panels.calls.querySelector('.platform-relay')){
        const host=el('div');host.className='platform-relay';panels.calls.append(host);
        window.WFPlatformRelay.mount(host,lang.value,request);
      }
      if(id==='plans'&&!plansBox.children.length&&!loadingPlans){
        loadingPlans=true;
        planEditor(plansBox).catch(error=>{
          if(!plansBox.isConnected)return;fail(error);
          const retry=el('button',labels[1]);retry.onclick=()=>{plansBox.replaceChildren();showDestination?.();};plansBox.append(retry);
        }).finally(()=>{loadingPlans=false;});
      }
      if(changed&&lastPage!==null){
        const heading=panels[id].querySelector('h2');heading.focus({preventScroll:true});heading.scrollIntoView({block:'nearest'});
      }
      lastPage=id;
    };
    const label={ar:'مدير المنصة الموثّق',en:'Verified platform administrator',tr:'Doğrulanmış platform yöneticisi',fr:'Administrateur de plateforme vérifié',ru:'Подтверждённый администратор платформы'}[lang.value];
    const founder=el('strong',verifiedName||label),badge=el('span','✓');
    badge.className='wf-founder-check';badge.setAttribute('role','img');badge.setAttribute('aria-label',label);badge.title=label;
    badge.hidden=navigator.onLine===false;founder.append(badge);nav.append(founder);
    const signOut=btn(nav,4,async()=>{const previous=token;forget();clear();login();
      await platformFetch(config.endpoint,{method:'POST',cache:'no-store',redirect:'error',credentials:'omit',
        headers:{apikey:config.publishableKey,'Content-Type':'application/json',Authorization:'Bearer '+previous},
        body:JSON.stringify({action:'auth.signOut'})}).then(reply=>{if(!reply.ok)throw failure(2);});});
    signOut.className='platform-signout';
    const preferences=el('section'),account=el('section');
    preferences.className=account.className='platform-settings-group';
    const preferred=el('div');preferred.className='platform-settings-preferences';
    preferences.append(el('h3',settingsText[1]),preferred);
    window.WFPlatformPreferences?.mount(preferred);
    window.WFPlatformAudio?.mount(preferred);
    preferences.hidden=!preferred.childElementCount;
    account.append(el('h3',settingsText[2]));if(verifiedName)account.append(el('bdi',verifiedName));passwordSettings(account);
    panels.settings.append(preferences,account);
    supportInbox?.dispose();
    supportInbox=window.WFPlatformSupport?.mount({nav,container:panels.support,routeLink:links.support,request,lang:lang.value,alerts:supportAlerts});
    showDestination();
    const name=field(form,5);name.required=true;name.maxLength=100;
    panels.home.querySelector('[data-shortcut=create]')?.addEventListener('click',()=>{
      createPanel.open=true;
      requestAnimationFrame(()=>{if(pageFromUrl()==='companies'&&name.isConnected)name.focus({preventScroll:true});});
    });
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
      window.WFOwnerInvite?.loadQrTools().then(({BrowserQRCodeSvgWriter})=>{
        if(!invitation.isConnected||generation!==ticket)return;
        const qr=new BrowserQRCodeSvgWriter().write(url.href,660,660,new Map([[0,'M']]));
        qr.classList.add('platform-setup-qr');qr.setAttribute('shape-rendering','crispEdges');
        qr.style.background='white';qr.setAttribute('role','img');qr.setAttribute('aria-label',setupLabels[lang.value][1]);
        invitation.append(qr);
        window.WFPlatformInviteShare?.attach(invitation,{svg:qr,url:url.href,name:state.companies.find(item=>item.id===setup.workspace)?.name||'WOW'});
      }).catch(()=>{}); // The selectable setup URL and code are already available.
    }
    brandList?.dispose();brandList=window.WFPlatformBrand?.create({request,config,language:lang.value});
    const cardWords=companyCardWords[lang.value];
    // Verify only visible cards, at a bounded concurrency. This existing endpoint
    // confirms owner setup, NOT live presence; never imply that a device is online.
    const verifyQueue=[];let verifying=0;
    const runQueue=()=>{
      while(verifying<3&&verifyQueue.length){
        const task=verifyQueue.shift();if(ticket!==generation||!task.row.isConnected)continue;
        verifying++;
        Promise.resolve().then(task.action).catch(()=>{}).finally(()=>{verifying--;runQueue();});
      }
    };
    const queueVerification=(row,action)=>{verifyQueue.push({row,action});runQueue();};
    const activationObserver=typeof IntersectionObserver==='function'
      ?new IntersectionObserver(entries=>{
        for(const entry of entries){
          if(!entry.isIntersecting)continue;
          activationObserver.unobserve(entry.target);
          entry.target.querySelector('.platform-company-refresh')?.click();
        }
      },{rootMargin:'100px 0px'}):null;
    for(const company of state.companies){
      const row=el('article'),active=company.status==='active',link=el('a',t(16));
      const url=new URL('../',location.href);url.searchParams.set('wf-cloud','employee');url.searchParams.set('workspace',company.id);
      row.className='platform-company-card platform-company-card-v2';link.className='platform-company-launch';
      link.href=url.href;
      const name=el('strong',company.name),stateLabel=el('span',t(active?7:8)),accountLabel=el('span',t(13)+' · '+company.accounts);
      const hero=el('div'),pills=el('div'),actions=el('div'),summaryLine=el('div');
      hero.className='platform-company-hero';pills.className='platform-company-pills';
      actions.className='platform-company-primary-actions';summaryLine.className='platform-company-connectivity';
      name.className='platform-company-name';name.dir='auto';
      stateLabel.className='platform-company-status';stateLabel.dataset.state=active?'active':'suspended';
      accountLabel.className='platform-company-account-count';
      const linkState=el('span',cardWords[1]),health=el('div'),healthTitle=el('span',cardWords[0]),refresh=el('button');
      const live=el('small',cardWords[8]);
      health.className='platform-company-link-status';healthTitle.className='platform-company-link-label';
      linkState.className='platform-company-link-pill';linkState.dataset.linkState='checking';
      linkState.setAttribute('role','status');linkState.setAttribute('aria-live','polite');
      refresh.className='platform-company-refresh';refresh.type='button';refresh.title=refresh.getAttribute('aria-label')||cardWords[7];
      refresh.setAttribute('aria-label',cardWords[7]);refresh.setAttribute('aria-controls','company-health-'+company.id);
      summaryLine.id='company-health-'+company.id;
      const states={active:cardWords[2],pending:cardWords[3],expired:cardWords[4],unissued:cardWords[5]};
      const paintActivation=result=>{
        const nextState=result&&Object.hasOwn(states,result.state)?result.state:'unknown';
        linkState.dataset.linkState=nextState;
        linkState.textContent=states[nextState]||cardWords[6];
      };
      refresh.onclick=()=>{
        if(refresh.disabled||!row.isConnected)return;
        refresh.disabled=true;linkState.dataset.linkState='checking';linkState.textContent=cardWords[1];
        queueVerification(row,async()=>{
          try{
            const activation=await request('company.activation',{workspaceId:company.id});
            if(ticket===generation&&row.isConnected)paintActivation(activation);
          }catch(error){
            if(ticket===generation&&row.isConnected){
              paintActivation(null);
              if(error?.index===4)fail(error);
            }
          }finally{if(row.isConnected)refresh.disabled=false;}
        });
      };
      hero.append(name);pills.append(stateLabel,accountLabel);
      health.append(healthTitle,linkState,refresh);
      summaryLine.append(health,live);
      actions.append(link);
      row.append(hero,pills,summaryLine,actions);
      const details=el('details'),summary=el('summary',companyMenu[lang.value]),tools=el('div');
      details.className='platform-company-tools';tools.className='platform-company-actions-grid';details.open=expandedCompany===company.id;
      details.ontoggle=()=>{
        if(!details.isConnected)return;
        if(details.open)expandedCompany=company.id;else if(expandedCompany===company.id)expandedCompany=null;
      };
      details.append(summary,tools);row.append(details);
      brandList?.attach(row,details,company);
      const accounts=el('a',sale(12)),accountsUrl=new URL(url);
      accountsUrl.searchParams.set('wf-accounts','cloud');accountsUrl.hash='settings';accounts.href=accountsUrl.href;accounts.className='platform-tool-link platform-tool-accounts';tools.append(accounts);
      const editArea=el('section');editArea.className='platform-inline-editor';
      function editCompany(trigger,renaming){
        const editor=el('form'),title=el('strong',renaming?word(6):t(17)),cancel=el('button',word(5));
        cancel.className='platform-action-cancel';
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
      const statusBtn=btn(tools,active?9:10,()=>editCompany(statusBtn,false));statusBtn.className='platform-tool platform-tool-status';
      statusBtn.dataset.action=active?'suspend':'activate';
      const rename=btn(tools,5,()=>editCompany(rename,true));rename.textContent=word(6);rename.className='platform-tool platform-tool-rename';
      const activationBox=el('section'),activation=btn(tools,6,()=>ownerSetup(activationBox,company,paintActivation));activation.textContent=activationWords[lang.value][0];activation.className='platform-tool platform-tool-activation';
      const devicesBox=el('section'),devicesToggle=btn(tools,21,()=>companyDevices(devicesBox,company.id));
      devicesToggle.textContent=deviceWords[lang.value][0];devicesToggle.className='platform-tool platform-tool-devices';devicesBox.className='platform-company-devices';
      const limitsBox=el('section'),limitButton=btn(tools,18,()=>subscription(limitsBox,company));limitButton.className='platform-tool platform-tool-subscription';
      details.append(editArea,activationBox,limitsBox,devicesBox);companies.append(row);
      if(activationObserver)activationObserver.observe(row);
      else refresh.click();
    }
    if(!state.companies.length){const empty=el('p',labels[4]);empty.className='platform-empty-state';companies.append(empty);}
    const pages=el('nav');companies.append(pages);
    if(offset)btn(pages,11,async()=>{offset=Math.max(0,offset-50);await list();});
    if(offset+50<state.total)btn(pages,12,async()=>{offset+=50;await list();});
    // Responsive chrome and local-only company filters reuse the authorized list,
    // without altering the authenticated data source or modifying server state.
    window.WFPlatformShell?.mount({state,companies,menu,links,preferences:preferred});
    window.WFPlatformAnalytics?.mount({host:panels.home,state,request,language:lang.value});
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
      const reply=await fetch(config.endpoint,{method:'POST',cache:'no-store',credentials:'omit',redirect:'error',headers:{apikey:config.publishableKey,'Content-Type':'application/json'},body:JSON.stringify({action:'auth.enrollOwner',installationProof:await window.WFInstallation?.proof(),workspaceId:workspace,setupToken:code.value.trim(),name:name.value.trim(),username:user.value.trim(),password:pass.value})});
      if(!reply.ok)throw Error();
      const url=new URL('../',location.href);url.searchParams.set('wf-cloud','employee');url.searchParams.set('workspace',workspace);location.replace(url.href);
    });form.querySelector('button').textContent=labels[4];
  }
  function render(){document.documentElement.lang=lang.value;document.documentElement.dir=lang.value==='ar'?'rtl':'ltr';document.title=t(0);document.querySelector('h1').textContent=t(0);const ws=new URLSearchParams(location.search).get('setup');if(/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(ws))enroll(ws);else if(token)list().catch(fail);else login();}
  function lockDisconnected(){
    clear();if(!new URL(location.href).searchParams.has('setup'))login();status.textContent=word(2);
  }
  window.addEventListener('offline',lockDisconnected);
  window.addEventListener('pagehide',()=>{clear();});
  window.addEventListener('pageshow',event=>{if(event.persisted){render();resume().catch(fail);}});
  window.addEventListener('storage',event=>{
    if((event.key===trustKey||event.key===null)&&rememberedId&&saved()?.id!==rememberedId){clear();login();}
  });
  window.addEventListener('online',()=>{if(token)list().catch(fail);else resume().catch(fail);});
  lang.onchange=()=>{if(failureIndex!=null)status.textContent=word(failureIndex);render();};render();resume().catch(fail);
})();
