(() => {
  'use strict';
  const doc=document,html=doc.documentElement;
  const language=doc.getElementById('lang');
  if(!language)return;
  const options={ar:'العربية',en:'English',tr:'Türkçe',fr:'Français',ru:'Русский'};
  const themes=['system','light','dark'];
  const labels={
    ar:['اللغة','المظهر','حسب الجهاز','فاتح','داكن'],
    en:['Language','Appearance','Use device setting','Light','Dark'],
    tr:['Dil','Görünüm','Cihaz ayarı','Açık','Koyu'],
    fr:['Langue','Apparence','Selon l’appareil','Clair','Sombre'],
    ru:['Язык','Оформление','Как на устройстве','Светлое','Тёмное']
  };
  const media=window.matchMedia('(prefers-color-scheme: dark)');
  const key='wow.platform.theme';
  function read(name){try{return localStorage.getItem(name);}catch{return null;}}
  function save(name,value){try{localStorage.setItem(name,value);}catch{/* The selected value still applies for this visit. */}}
  const savedLanguage=read('wf_lang');
  let locale=Object.hasOwn(options,savedLanguage)?savedLanguage:'ar';
  const primaryTheme=read('wf_theme'),savedTheme=read(key);
  let theme=themes.includes(savedTheme)?savedTheme:['light','dark'].includes(primaryTheme)?primaryTheme:'system';
  function sync(){
    html.lang=locale;html.dir=locale==='ar'?'rtl':'ltr';language.value=locale;
    const strings=labels[locale];
    language.setAttribute('aria-label',strings[0]);
    const effective=theme==='system'?(media.matches?'dark':'light'):theme;
    html.dataset.theme=effective;html.style.colorScheme=effective;
    const browserBar=doc.querySelector('meta[name="theme-color"]');
    const background=getComputedStyle(html).getPropertyValue('--bg').trim();
    if(browserBar&&background)browserBar.content=background;
    for(const pick of doc.querySelectorAll('[data-admin-pref="language"]'))pick.value=locale;
    for(const pick of doc.querySelectorAll('#platformTheme,[data-admin-pref="theme"]')){
      pick.value=theme;pick.setAttribute('aria-label',strings[1]);
      for(const opt of pick.options){const i=themes.indexOf(opt.value);if(i>=0)opt.textContent=strings[i+2];}
    }
    for(const span of doc.querySelectorAll('[data-admin-pref-label]'))span.textContent=strings[span.dataset.adminPrefLabel==='language'?0:1];
  }
  function changeTheme(value){if(!themes.includes(value))return;theme=value;save(key,value);sync();}
  language.addEventListener('change',()=>{
    if(Object.hasOwn(options,language.value)){locale=language.value;save('wf_lang',locale);sync();}
  });
  doc.getElementById('platformTheme')?.addEventListener('change',event=>changeTheme(event.target.value));
  media.addEventListener?.('change',()=>{if(theme==='system')sync();});
  function mount(host){
    if(!host||host.querySelector('.platform-preference-fields'))return;
    const fields=doc.createElement('div');fields.className='platform-preference-fields';
    for(const category of ['language','theme']){
      const row=doc.createElement('label'),name=doc.createElement('span'),pick=doc.createElement('select');
      name.dataset.adminPrefLabel=category;pick.dataset.adminPref=category;
      const values=category==='theme'?themes:Object.keys(options);
      for(const value of values){
        const option=doc.createElement('option');option.value=value;option.textContent=category==='language'?options[value]:value;pick.append(option);
      }
      pick.addEventListener('change',()=>{
        if(category==='theme')changeTheme(pick.value);
        else{language.value=pick.value;language.dispatchEvent(new Event('change',{bubbles:true}));}
      });
      row.append(name,pick);fields.append(row);
    }
    host.append(fields);sync();
  }
  window.WFPlatformPreferences=Object.freeze({mount});sync();
})();
