(() => {
  'use strict';
  const doc=document,html=doc.documentElement;
  const language=doc.getElementById('lang');
  if(!language)return;
  const options={ar:'العربية',en:'English',tr:'Türkçe',fr:'Français',ru:'Русский'};
  const themes=['system','light','dark'];
  const languages=[
    {id:'ar',flag:'🇸🇦',name:'العربية',subtitle:'Arabic'},
    {id:'en',flag:'🇬🇧',name:'English',subtitle:'English'},
    {id:'tr',flag:'🇹🇷',name:'Türkçe',subtitle:'Turkish'},
    {id:'fr',flag:'🇫🇷',name:'Français',subtitle:'French'},
    {id:'ru',flag:'🇷🇺',name:'Русский',subtitle:'Russian'}
  ];
  const dialogLabels={
    ar:['لغة البرنامج','اختر لغة الواجهة','اختر لغتك، وسيُحدَّث البرنامج فورًا.','إغلاق','اللغة الحالية'],
    en:['App language','Choose your language','Choose a language to update the interface instantly.','Close','Current language'],
    tr:['Uygulama dili','Dilini seç','Arayüz dilini anında değiştirmek için bir dil seç.','Kapat','Geçerli dil'],
    fr:['Langue de l’application','Choisir une langue','Choisissez la langue de l’interface.','Fermer','Langue actuelle'],
    ru:['Язык приложения','Выберите язык','Выберите язык интерфейса.','Закрыть','Текущий язык']
  };
  const labels={
    ar:['اللغة','المظهر','حسب الجهاز','فاتح','داكن'],
    en:['Language','Appearance','Use device setting','Light','Dark'],
    tr:['Dil','Görünüm','Cihaz ayarı','Açık','Koyu'],
    fr:['Langue','Apparence','Selon l’appareil','Clair','Sombre'],
    ru:['Язык','Оформление','Как на устройстве','Светлое','Тёмное']
  };
  const media=window.matchMedia('(prefers-color-scheme: dark)');
  const key='wow.platform.theme';
  let headerTrigger=null,languageDialog=null,lastTrigger=null;
  const languageButtons=new Map();
  const make=(tag,className,text)=>{const node=doc.createElement(tag);if(className)node.className=className;if(text!=null)node.textContent=text;return node;};
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
    const current=languages.find(item=>item.id===locale);
    if(headerTrigger){
      headerTrigger.querySelector('.platform-language-flag').textContent=current.flag;
      headerTrigger.querySelector('.platform-language-code').textContent=locale.toUpperCase();
      headerTrigger.setAttribute('aria-label',dialogLabels[locale][0]+': '+current.name);
      headerTrigger.title=dialogLabels[locale][0]+' · '+current.name;
    }
    for(const trigger of doc.querySelectorAll('[data-admin-language-trigger]')){
      trigger.textContent=current.flag+'  '+current.name;
      trigger.setAttribute('aria-label',dialogLabels[locale][0]+': '+current.name);
    }
    if(languageDialog){
      languageDialog.querySelector('#platform-language-title').textContent=dialogLabels[locale][1];
      languageDialog.querySelector('#platform-language-description').textContent=dialogLabels[locale][2];
      const close=languageDialog.querySelector('.platform-language-close');
      close.setAttribute('aria-label',dialogLabels[locale][3]);
      for(const item of languages){
        const button=languageButtons.get(item.id);
        const selected=item.id===locale;
        button.setAttribute('aria-pressed',String(selected));
        button.querySelector('.platform-language-current').textContent=selected?'✓':'';
        button.querySelector('.platform-language-current').setAttribute('aria-label',selected?dialogLabels[locale][4]:'');
      }
    }
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
      row.append(name,pick);
      if(category==='language'){
        const openButton=make('button','platform-language-settings-trigger');
        openButton.type='button';openButton.dataset.adminLanguageTrigger='';
        openButton.addEventListener('click',()=>openDialog(openButton));
        row.append(openButton);
      }
      fields.append(row);
    }
    host.append(fields);sync();
  }
  function openDialog(trigger=headerTrigger){
    if(!languageDialog)return;
    lastTrigger=trigger;
    sync();
    if(!languageDialog.open){
      if(typeof languageDialog.showModal==='function')languageDialog.showModal();
      else languageDialog.setAttribute('open','');
    }
    languageButtons.get(locale)?.focus();
  }
  function buildDialog(){
    const header=doc.querySelector('.platform-preferences');
    if(!header)return;
    headerTrigger=make('button','platform-language-open');
    headerTrigger.type='button';headerTrigger.id='platformLanguageOpen';
    headerTrigger.setAttribute('aria-haspopup','dialog');headerTrigger.setAttribute('aria-controls','platform-language-dialog');
    const flag=make('span','platform-language-flag'),code=make('span','platform-language-code');
    flag.setAttribute('aria-hidden','true');headerTrigger.append(flag,code,make('span','platform-language-chevron','⌄'));
    headerTrigger.addEventListener('click',()=>openDialog(headerTrigger));
    header.insertBefore(headerTrigger,language);
    language.classList.add('platform-language-native');language.tabIndex=-1;language.setAttribute('aria-hidden','true');
    languageDialog=make('dialog','platform-language-dialog');languageDialog.id='platform-language-dialog';
    languageDialog.setAttribute('aria-labelledby','platform-language-title');
    languageDialog.setAttribute('aria-describedby','platform-language-description');
    const heading=make('header','platform-language-dialog-heading');
    const headingContent=make('div','platform-language-dialog-heading-copy');
    const title=make('h2','');title.id='platform-language-title';
    const description=make('p','');description.id='platform-language-description';
    headingContent.append(title,description);
    const close=make('button','platform-language-close','×');close.type='button';
    close.addEventListener('click',()=>languageDialog.close());
    heading.append(headingContent,close);languageDialog.append(heading);
    const list=make('div','platform-language-options');list.setAttribute('role','group');
    for(const item of languages){
      const button=make('button','platform-language-choice');button.type='button';button.dataset.langChoice=item.id;
      const icon=make('span','platform-language-choice-flag',item.flag),copy=make('span','platform-language-choice-copy');
      icon.setAttribute('aria-hidden','true');copy.append(make('strong','',item.name),make('small','',item.subtitle));
      const check=make('span','platform-language-current');check.setAttribute('aria-hidden','true');
      button.append(icon,copy,check);
      button.addEventListener('click',()=>{
        if(language.value!==item.id){
          language.value=item.id;
          language.dispatchEvent(new Event('change',{bubbles:true}));
        }
        languageDialog.close();
      });
      languageButtons.set(item.id,button);list.append(button);
    }
    languageDialog.append(list);
    languageDialog.addEventListener('close',()=>{if(lastTrigger?.isConnected)lastTrigger.focus({preventScroll:true});lastTrigger=null;});
    languageDialog.addEventListener('click',event=>{
      if(event.target!==languageDialog)return;
      const rect=languageDialog.getBoundingClientRect();
      if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)languageDialog.close();
    });
    doc.body.append(languageDialog);
  }
  buildDialog();
  window.WFPlatformPreferences=Object.freeze({mount,openLanguageDialog:openDialog});sync();
})();
