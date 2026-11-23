(() => {
  'use strict';
  const language=document.getElementById('lang'),button=document.getElementById('installPlatform'),hint=document.getElementById('installHint');
  const words={
    ar:['تثبيت تطبيق الإدارة','من قائمة المتصفح اختر «تثبيت التطبيق» أو «إضافة إلى الشاشة الرئيسية».','في Safari، افتح «مشاركة» ثم «إضافة إلى الشاشة الرئيسية».'],
    en:['Install admin app','Open the browser menu and choose Install app or Add to Home Screen.','In Safari, open Share and choose Add to Home Screen.'],
    tr:['Yönetim uygulamasını yükle','Tarayıcı menüsünden Uygulamayı yükle veya Ana ekrana ekle seçeneğini kullanın.','Safari’de Paylaş ve ardından Ana Ekrana Ekle seçeneğini kullanın.'],
    fr:['Installer l’application admin','Dans le menu du navigateur, choisissez Installer ou Ajouter à l’écran d’accueil.','Dans Safari, touchez Partager puis Sur l’écran d’accueil.'],
    ru:['Установить приложение управления','В меню браузера выберите «Установить» или «На главный экран».','В Safari нажмите «Поделиться», затем «На экран Домой».']
  };
  const standalone=matchMedia('(display-mode: standalone)');
  const company=window.WFCompanyInstall;
  if(company){
    const release=document.querySelector('.platform-release'),brand=document.querySelector('.platform-brand img');
    if(release)release.textContent='Mark Robot';
    if(brand)brand.src='../app-icon-192.png';
  }
  const companyWords={
    ar:['تثبيت برنامج الشركة','من قائمة المتصفح، اختر تثبيت التطبيق أو إضافته إلى الشاشة الرئيسية.','في Safari اضغط «مشاركة»، ثم «إضافة إلى الشاشة الرئيسية». فعّل «فتح كتطبيق ويب» إذا ظهر، واضغط «إضافة».'],
    en:['Install company app','In the browser menu, choose Install app or Add to Home Screen.','In Safari, choose Share, then Add to Home Screen. Enable Open as Web App if shown, then tap Add.'],
    tr:['Şirket uygulamasını yükle','Tarayıcı menüsünde Uygulamayı yükle veya Ana ekrana ekle seçeneğini seçin.','Safari’de Paylaş ve Ana Ekrana Ekle’yi seçin. Görünüyorsa Web Uygulaması Olarak Aç’ı açın ve Ekle’ye dokunun.'],
    fr:['Installer l’application de la société','Dans le menu du navigateur, choisissez Installer ou Ajouter à l’écran d’accueil.','Dans Safari, touchez Partager puis Sur l’écran d’accueil. Activez Ouvrir comme app web si proposé, puis touchez Ajouter.'],
    ru:['Установить приложение компании','Выберите в меню браузера «Установить приложение» или «На главный экран».','В Safari нажмите «Поделиться», затем «На экран Домой». Если доступно, включите «Открывать как веб-приложение» и нажмите «Добавить».']
  };
  const ios=/iPad|iPhone|iPod/.test(navigator.userAgent)||navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1;
  let pending=null;
  function render(){
    const copy=company?companyWords:words;
    const [install,other,apple]=copy[language.value]||copy.ar;
    button.textContent=install;hint.textContent=ios?apple:other;
    button.hidden=standalone.matches||navigator.standalone===true;
    if(button.hidden)hint.hidden=true;
    else if(company&&ios)hint.hidden=false;
  }
  window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();pending=event;});
  window.addEventListener('appinstalled',()=>{pending=null;button.hidden=true;hint.hidden=true;});
  window.addEventListener('wow-company-install-ready',()=>{if(company&&!button.hidden&&!pending)hint.hidden=false;});
  button.addEventListener('click',async()=>{
    const event=pending;pending=null;
    if(event){try{await event.prompt();await event.userChoice;}catch{hint.hidden=false;}}
    else hint.hidden=!hint.hidden;
  });
  standalone.addEventListener?.('change',render);language.addEventListener('change',render);render();
  navigator.serviceWorker?.addEventListener('message',event=>{
    if(event.data?.type==='wow-platform-open-owner-request'&&event.source?.scriptURL===new URL('./sw.js',location.href).href&&
      /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(event.data.workspaceId))location.hash='company/'+event.data.workspaceId+'/activation';
    if(event.data?.type==='wow-platform-open-support'&&event.source?.scriptURL===new URL('./sw.js',location.href).href)location.hash='support';
  });
  if('serviceWorker' in navigator&&window.isSecureContext){
    const directory=company?'../':'./';
    navigator.serviceWorker.register(directory+'sw.js',{scope:directory,updateViaCache:'none'}).catch(()=>{});
  }
})();
