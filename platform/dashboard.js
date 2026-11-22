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
  function clear(){failureIndex=null;generation++;clearTimeout(expiryTimer);token='';verifiedName='';offset=0;setup=null;draft=null;content.replaceChildren();status.textContent='';}
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
    content.replaceChildren();const form=el('form'),email=field(form,1,'text'),pass=field(form,2,'password');
    email.required=pass.required=true;email.autocomplete='username';pass.autocomplete='current-password';content.append(form);
    submit(form,3,async()=>{
      const result=await platformFetch(config.endpoint,{method:'POST',cache:'no-store',credentials:'omit',redirect:'error',headers:{apikey:config.publishableKey,'Content-Type':'application/json'},body:JSON.stringify({action:'auth.signIn',workspaceId:config.workspaceId,username:email.value.trim(),password:pass.value})});
      pass.value='';if(!form.isConnected)return;
      if(result.status===401)throw failure(0);
      if(result.status===429)throw failure(1);
      if(!result.ok)throw Error();const {session,identity}=await result.json();token=session.access_token;verifiedName=identity?.currentAccount?.name||'';
      expiryTimer=setTimeout(()=>{clear();login();fail(failure(4));},Math.min(3600000,session.expires_at*1000-Date.now()));await list();
    });
  }
  async function planEditor(container){
    const {plans}=await request('plans.list');if(!container.isConnected)return;
    container.replaceChildren();
    const form=el('form'),pick=el('select'),fresh=el('option','＋');fresh.value='';pick.append(fresh);
    pick.setAttribute('aria-label',t(22));for(const plan of plans){const o=el('option',plan.name);o.value=plan.id;pick.append(o);}
    form.append(pick);const name=field(form,22),devices=field(form,21,'number'),bytes=field(form,20,'number');
    name.required=true;name.maxLength=100;
    devices.min=bytes.min='0';devices.step=bytes.step='1';
    let id=crypto.randomUUID();
    pick.onchange=()=>{const plan=plans.find(p=>p.id===pick.value);id=plan?.id||crypto.randomUUID();name.value=plan?.name||'';devices.value=plan?.deviceLimit??'';bytes.value=plan?.storageBytes??'';};
    submit(form,19,async()=>{const plan=plans.find(p=>p.id===pick.value);
      await request('plans.save',{id,name:name.value.trim(),deviceLimit:devices.value===''?null:Number(devices.value),storageBytes:bytes.value===''?null:Number(bytes.value),version:plan?.version||0});await planEditor(container);
    });container.append(form);
  }
  async function subscription(container,company){
    const [state,{plans}]=await Promise.all([request('limits.get',{workspaceId:company.id}),request('plans.list')]);
    if(!container.isConnected)return;
    container.replaceChildren();const form=el('form'),label=el('label',t(22)),select=el('select'),none=el('option','—');
    none.value='';select.append(none);for(const p of plans){const o=el('option',p.name);o.value=p.id;select.append(o);}select.value=state.planId||'';
    label.append(select);form.append(label);const expiry=field(form,23,'datetime-local');
    if(state.expiresAt){const at=new Date(state.expiresAt);expiry.value=new Date(at.getTime()-at.getTimezoneOffset()*60000).toISOString().slice(0,16);}
    submit(form,19,async()=>{await request('limits.set',{workspaceId:company.id,planId:select.value||null,expiresAt:expiry.value?new Date(expiry.value).toISOString():null,version:state.version});await subscription(container,company);});
    const scope={ar:['تسجيلات الإشعارات','بايت من حجوزات الملفات الخاصة'],en:['Notification registrations','bytes reserved for private uploads'],tr:['Bildirim kayıtları','özel yüklemeler için ayrılmış bayt'],fr:['Inscriptions aux notifications','octets réservés aux fichiers privés'],ru:['Регистрации уведомлений','байт под частные загрузки']}[lang.value];
    container.append(el('p',scope[0]+' · '+state.usedDevices+' / '+(state.plan?.deviceLimit??'∞')+' · '+scope[1]+' · '+state.usedBytes+' / '+(state.plan?.storageBytes??'∞')),form);
  }
  async function list(){
    const ticket=++generation,state=await request('company.list',{offset});if(ticket!==generation)return;
    content.replaceChildren();failureIndex=null;status.textContent='';const nav=el('nav'),form=el('form');content.append(nav,form);
    const label={ar:'مدير المنصة الموثّق',en:'Verified platform administrator',tr:'Doğrulanmış platform yöneticisi',fr:'Administrateur de plateforme vérifié',ru:'Подтверждённый администратор платформы'}[lang.value];
    const founder=el('strong',verifiedName),badge=el('span','✓');
    badge.className='wf-founder-check';badge.setAttribute('role','img');badge.setAttribute('aria-label',label);badge.title=label;
    badge.hidden=navigator.onLine===false;founder.append(badge);nav.append(founder);
    btn(nav,4,async()=>{const previous=token;clear();login();await fetch(config.projectUrl+'/auth/v1/logout?scope=local',{method:'POST',headers:{apikey:config.publishableKey,Authorization:'Bearer '+previous},credentials:'omit'});});
    const settings=el('a',{ar:'إعدادات الحساب',en:'Account settings',tr:'Hesap ayarları',fr:'Paramètres du compte',ru:'Настройки аккаунта'}[lang.value]);
    const settingsUrl=new URL('../',location.href);settingsUrl.searchParams.set('wf-cloud','employee');settingsUrl.searchParams.set('workspace',config.workspaceId);settingsUrl.searchParams.set('wf-accounts','cloud');settingsUrl.hash='settings';settings.href=settingsUrl.href;nav.append(settings);
    const plansBox=el('section');content.append(plansBox);btn(nav,22,()=>planEditor(plansBox));
    const name=field(form,5);name.required=true;name.maxLength=100;
    submit(form,6,async()=>{
      const company=name.value.trim();if(!company)return;
      if(draft?.company!==company)draft={company,code:Array.from(crypto.getRandomValues(new Uint8Array(32)),v=>v.toString(16).padStart(2,'0')).join('')};
      const created=await request('company.create',{name:company,setupToken:draft.code});
      setup={code:draft.code,workspace:created.workspaceId};draft=null;offset=0;await list();
    });
    if(setup){
      const link=el('a',setupLabels[lang.value][5]),url=new URL(location.pathname,location.origin);
      url.searchParams.set('setup',setup.workspace);url.hash='invite='+setup.code;link.href=url.href;
      content.append(link,el('p',t(14)),el('output',setup.code));
      if(window.ZXingBrowser?.BrowserQRCodeSvgWriter){const qr=new window.ZXingBrowser.BrowserQRCodeSvgWriter().write(url.href,660,660,new Map([[0,'M']]));qr.classList.add('platform-setup-qr');qr.setAttribute('shape-rendering','crispEdges');qr.style.background='white';qr.setAttribute('role','img');qr.setAttribute('aria-label',setupLabels[lang.value][5]);content.append(qr);}
    }
    for(const company of state.companies){
      const row=el('article'),active=company.status==='active',link=el('a',t(16));
      const url=new URL('../',location.href);url.searchParams.set('wf-cloud','employee');url.searchParams.set('workspace',company.id);
      link.href=url.href;
      row.append(el('strong',company.name),el('span',t(active?7:8)),el('span',t(13)+' · '+company.accounts),link);
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
      const statusBtn=btn(row,active?9:10,()=>editCompany(statusBtn,false));
      const rename=btn(row,5,()=>editCompany(rename,true));rename.textContent=word(6);
      const limitsBox=el('section');btn(row,18,()=>subscription(limitsBox,company));content.append(row,editArea,limitsBox);
    }
    const pages=el('nav');content.append(pages);
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
  window.addEventListener('offline',()=>{const badge=content.querySelector('.wf-founder-check');if(badge)badge.hidden=true;});
  window.addEventListener('online',()=>{if(token)list().catch(fail);});
  lang.onchange=()=>{if(failureIndex!=null)status.textContent=word(failureIndex);render();};render();
})();
