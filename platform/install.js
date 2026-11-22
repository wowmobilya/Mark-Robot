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
  const ios=/iPad|iPhone|iPod/.test(navigator.userAgent)||navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1;
  let pending=null;
  function render(){
    const [install,other,apple]=words[language.value]||words.ar;
    button.textContent=install;hint.textContent=ios?apple:other;
    button.hidden=standalone.matches||navigator.standalone===true;
    if(button.hidden)hint.hidden=true;
  }
  window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();pending=event;});
  window.addEventListener('appinstalled',()=>{pending=null;button.hidden=true;hint.hidden=true;});
  button.addEventListener('click',async()=>{
    const event=pending;pending=null;
    if(event){try{await event.prompt();await event.userChoice;}catch{hint.hidden=false;}}
    else hint.hidden=!hint.hidden;
  });
  standalone.addEventListener?.('change',render);language.addEventListener('change',render);render();
  navigator.serviceWorker?.addEventListener('message',event=>{
    if(event.data?.type==='wow-platform-open-support'&&event.source?.scriptURL===new URL('./sw.js',location.href).href)location.hash='support';
  });
  if('serviceWorker' in navigator&&window.isSecureContext)navigator.serviceWorker.register('./sw.js',{scope:'./',updateViaCache:'none'}).catch(()=>{});
})();
