/* Header presentation only: preserve all original navigation handlers. */
(function(){
 const nav=document.querySelector('.navbar');if(!nav)return;
 nav.querySelector('.wf-topbar-title')?.remove();
 const settings={ar:'الإعدادات',en:'Settings',tr:'Ayarlar',fr:'Paramètres',ru:'Настройки'};
 function sync(){const lang=document.documentElement.lang||'ar';const b=document.getElementById('headerSettingsBtn');if(b){b.setAttribute('aria-label',settings[lang]||settings.en);b.title=settings[lang]||settings.en;}}
 new MutationObserver(sync).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});sync();
})();
