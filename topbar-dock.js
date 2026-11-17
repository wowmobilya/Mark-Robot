/* A balanced dashboard identity; original navigation controls keep their handlers. */
(function(){
 const nav=document.querySelector('.navbar');if(!nav||nav.querySelector('.wf-topbar-title'))return;
 const title=document.createElement('div');title.className='wf-topbar-title';
 title.innerHTML='<span class="wf-topbar-orb" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z"/></svg></span><span class="wf-topbar-label"></span>';
 nav.append(title);
 const labels={ar:'لوحة التحكم',en:'Dashboard',tr:'Kontrol paneli',fr:'Tableau de bord',ru:'Панель управления'};
 const settings={ar:'الإعدادات',en:'Settings',tr:'Ayarlar',fr:'Paramètres',ru:'Настройки'};
 function sync(){const lang=document.documentElement.lang||'ar';title.querySelector('.wf-topbar-label').textContent=labels[lang]||labels.en;const b=document.getElementById('headerSettingsBtn');if(b){b.setAttribute('aria-label',settings[lang]||settings.en);b.title=settings[lang]||settings.en;}}
 new MutationObserver(sync).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});sync();
})();
