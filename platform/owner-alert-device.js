(() => {
  'use strict';
  const texts={
    ar:['تفعيل إشعارات هذا الجهاز','إيقاف إشعارات هذا الجهاز','افتح إعدادات الموقع في المتصفح واسمح بالإشعارات.','على iPhone أو iPad أضف تطبيق الإدارة إلى الشاشة الرئيسية من قائمة المشاركة، ثم افتحه منها.','إشعارات الجهاز غير متاحة في هذا المتصفح.','تعذّر ربط إشعارات الجهاز. تحقق من الاتصال ثم أعد المحاولة.','إشعارات طلبات التفعيل مفعّلة.'],
    en:['Enable notifications on this device','Turn off device notifications','Allow notifications in your browser’s site settings.','On iPhone or iPad, use Share to add Admin to the Home Screen, then open it there.','Device notifications are unavailable in this browser.','Could not connect device notifications. Check your connection and retry.','Owner request notifications are enabled.'],
    tr:['Cihaz bildirimlerini etkinleştir','Cihaz bildirimlerini kapat','Tarayıcının site ayarlarından bildirimlere izin verin.','iPhone veya iPad’de Paylaş menüsünden Yönetim’i Ana Ekrana ekleyip oradan açın.','Bu tarayıcıda bildirimler kullanılamıyor.','Bildirimler bağlanamadı. Bağlantınızı kontrol edip tekrar deneyin.','Sahip talebi bildirimleri etkin.'],
    fr:['Activer les notifications de cet appareil','Désactiver les notifications','Autorisez les notifications dans les paramètres du site.','Sur iPhone ou iPad, ajoutez Administration à l’écran d’accueil via Partager et ouvrez-la depuis cet écran.','Notifications indisponibles dans ce navigateur.','Connexion aux notifications impossible. Vérifiez votre connexion et réessayez.','Les notifications de demande sont activées.'],
    ru:['Включить уведомления на устройстве','Отключить уведомления','Разрешите уведомления в настройках сайта.','На iPhone или iPad добавьте панель на экран «Домой» через «Поделиться» и откройте её оттуда.','Уведомления недоступны в этом браузере.','Не удалось подключить уведомления. Проверьте сеть и повторите попытку.','Уведомления о запросах включены.']
  };
  const key='wow.platform.approval-push';
  const read=()=>{try{return JSON.parse(localStorage.getItem(key));}catch{return null;}};
  const preferenceKey=userId=>key+'.off:'+userId;
  const optedOut=userId=>{try{return localStorage.getItem(preferenceKey(userId))==='1';}catch{return false;}};
  const savePreference=(userId,off)=>{
    try{if(off)localStorage.setItem(preferenceKey(userId),'1');else localStorage.removeItem(preferenceKey(userId));}catch{}
  };
  const getReg=async()=>{
    const reg=await navigator.serviceWorker.getRegistration(location.href);
    if(!reg?.active||reg.scope!==new URL('./',location.href).href||!reg.pushManager)throw Error();
    return reg;
  };
  async function unlink(){
    const reg=await getReg(),sub=await reg.pushManager.getSubscription();
    if(sub&&!await sub.unsubscribe())throw Error();
  }
  function mount({box,request,language,userId}){
    const w=texts[language]||texts.ar,b=document.createElement('button'),status=document.createElement('p');
    b.type='button';status.setAttribute('role','status');b.textContent=w[0];box.append(b,status);
    let alive=true,enabled=false,busy=false,prepared=null;
    const ios=/iP(?:ad|hone|od)/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
    const needsInstall=ios&&!navigator.standalone&&!matchMedia('(display-mode: standalone)').matches;
    const problem=()=>needsInstall?3:!window.isSecureContext||!window.Notification||!navigator.serviceWorker||!window.PushManager?4:Notification.permission==='denied'?2:0;
    const render=(reason=0)=>{
      if(!alive)return;
      const unavailable=problem();b.disabled=busy||!!unavailable;
      b.textContent=w[enabled?1:0];b.setAttribute('aria-pressed',String(enabled));status.textContent=(unavailable||reason)?w[unavailable||reason]:'';
    };
    async function bind(sub){
      if(!alive||!prepared)return;
      const {deviceId}=prepared;
      // A retry after a lost server response must reuse the original device identifier.
      try{localStorage.setItem(key,JSON.stringify({userId,deviceId}));}catch{}
      const result=await request('push.subscribe',{deviceId,language,subscription:sub.toJSON()});
      if(!alive)return;
      if(result.subscribed!==true)throw Error();
      enabled=true;
    }
    function subscribe(){
      return prepared.reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:prepared.serverKey});
    }
    async function prepare(){
      if(!alive||busy||enabled||problem()||!userId||(prepared&&Notification.permission!=='granted'))return;
      busy=true;render();let reason=0;
      try{
        const [reg,config]=await Promise.all([getReg(),request('push.config')]);
        if(!alive)return;
        if(!/^[A-Za-z0-9_-]{87}$/.test(config.publicKey))throw Error();
        const serverKey=Uint8Array.from(atob(config.publicKey.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));
        const saved=read(),same=saved?.userId===userId&&/^admin-approval-[a-f0-9-]{36}$/.test(saved.deviceId);
        let sub=await reg.pushManager.getSubscription();if(!alive)return;
        const oldKey=sub?.options?.applicationServerKey&&new Uint8Array(sub.options.applicationServerKey);
        const keyChanged=oldKey&&(oldKey.length!==serverKey.length||serverKey.some((value,index)=>oldKey[index]!==value));
        if(sub&&(!same||keyChanged||optedOut(userId))){
          if(!await sub.unsubscribe())throw Error();sub=null;
        }
        if(!alive)return;
        prepared={reg,serverKey,deviceId:same?saved.deviceId:'admin-approval-'+crypto.randomUUID()};
        if(!optedOut(userId)&&Notification.permission==='granted'){
          sub=sub||await subscribe();
          await bind(sub);
        }
      }catch{reason=5;}finally{busy=false;render(reason||(enabled?6:0));}
    }
    const toggle=()=>{if(box.open)prepare();};
    box.addEventListener('toggle',toggle);
    b.onclick=async()=>{
      if(!prepared){await prepare();return;}
      busy=true;render();let reason=0;
      try{
        if(enabled){
          const sub=await prepared.reg.pushManager.getSubscription();if(!alive)return;
          if(sub){await request('push.unsubscribe',{deviceId:prepared.deviceId,endpoint:sub.endpoint});if(!await sub.unsubscribe())throw Error();}
          if(!alive)return;
          savePreference(userId,true);enabled=false;
        }else{
          // Subscribe on the click stack so the installed iOS app receives a native permission prompt.
          const sub=await subscribe();
          if(alive){savePreference(userId,false);await bind(sub);}
        }
      }catch(error){reason=error?.name==='NotAllowedError'?2:5;}
      finally{busy=false;render(reason||(enabled?6:0));}
    };
    render();
    const foreground=()=>{if(!document.hidden)prepare();};
    navigator.serviceWorker?.addEventListener('controllerchange',foreground);
    document.addEventListener('visibilitychange',foreground);
    window.addEventListener('online',foreground);
    prepare();
    return {dispose(){
      alive=false;box.removeEventListener('toggle',toggle);
      navigator.serviceWorker?.removeEventListener('controllerchange',foreground);
      document.removeEventListener('visibilitychange',foreground);
      window.removeEventListener('online',foreground);
    },detach(){
      if(read()?.userId===userId){localStorage.removeItem(key);unlink().catch(()=>{});}
    }};
  }
  window.WFPlatformOwnerAlertDevice={mount};
})();
