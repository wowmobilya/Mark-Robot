/* Inline settings sections and a bottom save action; existing data handlers stay intact. */
(()=>{'use strict';
 const page=document.getElementById('page-settings'),workspace=page?.querySelector('.wf-settings-workspace'),tabs=workspace?.querySelector('.tabs');
 if(!page||!workspace||!tabs||page.classList.contains('wf-settings-inline-ready'))return;
 const buttons=[...tabs.querySelectorAll('.tab-btn')];
 const entries=buttons.map(button=>({button,key:button.getAttribute('onclick')?.match(/switchTab\('([^']+)'\)/)?.[1]})).filter(entry=>entry.key);
 if(!entries.length||typeof window.switchTab!=='function')return;
 page.querySelector('.wf-settings-picker')?.remove();page.classList.remove('wf-settings-picker-ready');
 const save=page.querySelector('button[onclick="saveSettings()"]');
 if(save){
  const footer=document.createElement('div');footer.className='wf-settings-save-footer';footer.id='wf-settings-save-footer';
  // Keep the original save button and localized label, replacing only its pictogram.
  save.querySelectorAll('.wf-ui-icon').forEach(icon=>icon.remove());
  Array.from(save.childNodes).filter(node=>node.nodeType===3).forEach(node=>{node.nodeValue=node.nodeValue.replace(/💾/g,'');});
  const symbol=document.createElement('span');symbol.className='wf-settings-save-symbol';symbol.setAttribute('aria-hidden','true');
  symbol.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 3h12l4 4v14H3V3h2Z"/><path d="M7 3v6h10V3M7 21v-8h10v8"/></svg>';
  save.prepend(symbol);
  footer.append(save);document.body.append(footer);
 }
 const center=document.getElementById('bnav-2');
 if (save && center) {
   const label=document.createElement('span');
   label.className='bnav-label settings-save-label';
   function translateSave(){
     label.textContent=({ar:'حفظ',en:'Save',tr:'Kaydet',fr:'Enregistrer',ru:'Сохранить'})[document.documentElement.lang] || 'Save';
   }
   translateSave();
   new MutationObserver(translateSave).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
   center.append(label);
   center.addEventListener('click',event=>{
     if (!page.classList.contains('active')) return;
     event.stopImmediatePropagation();
     if (dialog.open && actions?.hidden) dialog.close();
     else save.click();
   },true);
 }
 const content = workspace.querySelector('.wf-settings-content');
 const dialog = document.createElement('dialog');
 dialog.id = 'wfSettingsDialog';
 const bar = document.createElement('header');
 const title = document.createElement('h2');
 title.id = 'wfSettingsDialogTitle';
 dialog.setAttribute('aria-labelledby', title.id);
 const close = document.createElement('button');
 close.type = 'button';
 close.textContent = '×';
 close.setAttribute('data-wf-ui-aria-label', 'Close');
 close.setAttribute('aria-label', window.wfUiText?.('Close') || 'Close');
 close.addEventListener('click', () => dialog.close());
 bar.append(title, close);
 workspace.append(dialog);
 dialog.append(bar, content);
 let actions;
 if (save) {
   actions = document.createElement('footer');
   actions.append(save);
   dialog.append(actions);
 }
 const nav=document.getElementById('bottomNav');
 const anchor=document.createComment('dashboard navigation');
 nav?.before(anchor);
 const mobile=matchMedia('(max-width:1024px)');
 function placeNavigation(){
   if (!nav) return;
   if (dialog.open && mobile.matches) dialog.append(nav);
   else if (anchor.nextSibling!==nav) anchor.after(nav);
   const done=dialog.open && actions?.hidden;
   const label=center?.querySelector('.settings-save-label');
   if (label) label.textContent=done ? close.getAttribute('aria-label') :
     (({ar:'حفظ',en:'Save',tr:'Kaydet',fr:'Enregistrer',ru:'Сохранить'})[document.documentElement.lang] || 'Save');
   nav.classList.toggle('settings-close-action',!!done);
 }
 mobile.addEventListener('change',placeNavigation);
 const restore = document.getElementById('wfRestoreModal');
 if (restore) {
   new MutationObserver(() => {
     if (dialog.open && restore.getAttribute('aria-hidden') === 'false') dialog.close();
   }).observe(restore, {attributes: true, attributeFilter: ['aria-hidden']});
 }
 const sections = {
   company: ['بيانات الشركة والشعار', 'Company details and logo', 'Şirket bilgileri ve logo', 'Coordonnées et logo', 'Данные компании и логотип'],
   bank: ['الحسابات البنكية وIBAN', 'Bank accounts and IBAN', 'Banka hesapları ve IBAN', 'Comptes bancaires et IBAN', 'Банковские счета и IBAN'],
   invoice: ['الترقيم والضريبة', 'Numbering and tax', 'Numaralandırma ve vergi', 'Numérotation et taxe', 'Нумерация и налог'],
   currency: ['مصدر الأسعار وأسعار الشراء والبيع', 'Rate source and buy/sell quotes', 'Kur kaynağı ve alış/satış kurları', 'Source des taux et cours d’achat/vente', 'Источник и курсы покупки и продажи'],
   'product-categories': ['تنظيم أقسام المنتجات وصورها', 'Manage product categories and images', 'Ürün kategorileri ve görsellerini yönetin', 'Gérer les catégories et leurs images', 'Управление категориями товаров и изображениями'],
   appearance: ['المظهر والكثافة والحركة', 'Theme, density and motion', 'Tema, yoğunluk ve hareket', 'Thème, densité et animations', 'Тема, плотность и анимация'],
   'app-identity': ['اسم البرنامج وشعاره وأيقونة التثبيت', 'App name, logo and installation icon', 'Uygulama adı, logosu ve yükleme simgesi', 'Nom, logo et icône d’installation', 'Название, логотип и значок установки'],
   'smart-card': ['صفحات البطاقة وترتيبها والتنقل بينها', 'Card pages, order and rotation', 'Kart sayfaları, sıralama ve geçişler', 'Pages, ordre et défilement de la carte', 'Страницы карточки, порядок и переключение'],
   robot: ['الصوت والتعبيرات وتتبع الحركة', 'Voice, expressions and movement tracking', 'Ses, ifadeler ve hareket takibi', 'Voix, expressions et suivi des mouvements', 'Голос, эмоции и отслеживание движения'],
   language: ['لغة واجهة البرنامج', 'Interface language', 'Arayüz dili', 'Langue de l’interface', 'Язык интерфейса'],
   data: ['النسخ الاحتياطي والاستعادة', 'Backup and restore', 'Yedekleme ve geri yükleme', 'Sauvegarde et restauration', 'Резервное копирование'],
   about: ['الإصدار ومعلومات البرنامج', 'Version and app information', 'Sürüm ve uygulama bilgileri', 'Version et informations', 'Версия и сведения'],
 };
 tabs.removeAttribute('role');
 const localeOrder = ['ar', 'en', 'tr', 'fr', 'ru'];
 const descriptions = new Map();
 const groupTitles={
   company:['الأعمال والمالية','Business and finance','İşletme ve finans','Activité et finances','Бизнес и финансы'],
   appearance:['تفضيلات البرنامج','App preferences','Uygulama tercihleri','Préférences','Настройки приложения'],
   data:['البيانات والنظام','Data and system','Veriler ve sistem','Données et système','Данные и система']
 };
 const headings=new Map();
 const saveSections = new Set(['bank', 'invoice']);
 let opener;
 function updateDialogTitle() {
   if (!opener) return;
   const copy = opener.cloneNode(true);
   copy.querySelectorAll('.wf-settings-card-description, .wf-ui-icon').forEach(node => node.remove());
   title.textContent = copy.textContent.trim();
 }
 function translateDescriptions() {
   const locale = Math.max(0, localeOrder.indexOf(document.documentElement.lang));
   for (const [key, description] of descriptions) description.textContent = sections[key][locale];
   for (const [key,heading] of headings) heading.querySelector('.wf-settings-group-label').textContent=groupTitles[key][locale];
   updateDialogTitle();
 }
 for (const key of Object.keys(sections)) {
   const entry = entries.find(value => value.key === key);
   if (!entry) continue;
   const {button} = entry;
   if(groupTitles[key]){
     const heading=document.createElement('h2');
     heading.className='settings-group-title';
     const symbol=document.createElement('span');symbol.className='wf-settings-group-symbol';symbol.setAttribute('aria-hidden','true');
     const paths={company:'<path d="M4 21V5l8-3v19M4 9h8M4 13h8M16 8h5v13M16 12h5M16 16h5M2 21h21"/>',appearance:'<path d="M12 3v2m0 14v2M3 12h2m14 0h2M5.6 5.6 7 7m10 10 1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4"/><circle cx="12" cy="12" r="4"/>',data:'<path d="M12 3 3 7v5c0 5 9 9 9 9s9-4 9-9V7Z"/><path d="m8 12 3 3 5-6"/>'};
     symbol.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">'+paths[key]+'</svg>';
     const label=document.createElement('span');label.className='wf-settings-group-label';heading.append(symbol,label);
     headings.set(key,heading);
     tabs.append(heading);
   }
   tabs.append(button);
   button.removeAttribute('role');
   button.removeAttribute('aria-selected');
   button.tabIndex = 0;
   const description = document.createElement('small');
   description.className = 'wf-settings-card-description';
   description.id = 'wf-settings-description-' + key;
   descriptions.set(key, description);
   button.append(description);
   button.setAttribute('aria-describedby', description.id);
   button.setAttribute('aria-haspopup', 'dialog');
   button.addEventListener('click', () => {
     opener = button;
     updateDialogTitle();
     if (actions) actions.hidden = !saveSections.has(key);
     if (!dialog.open) dialog.showModal();
     placeNavigation();
     content.scrollTop = 0;
     close.focus();
   });
 }
 translateDescriptions();
 new MutationObserver(translateDescriptions).observe(document.documentElement, {attributes: true, attributeFilter: ['lang']});
 new MutationObserver(updateDialogTitle).observe(tabs, {childList: true, subtree: true, characterData: true});
 dialog.addEventListener('close', () => {
   placeNavigation();
   if (page.classList.contains('active')) opener?.focus();
 });
 const original=window.switchTab;
 window.switchTab=function(key){
  const result=original.apply(this,arguments);
  const panel=document.getElementById('stab-'+key);
  if(panel&&!window.matchMedia('(prefers-reduced-motion: reduce)').matches){
   panel.classList.remove('wf-settings-panel-enter');void panel.offsetWidth;panel.classList.add('wf-settings-panel-enter');
  }
  return result;
 };
 // A class follows actual page visibility, including browser Back/Forward navigation.
 function syncPage(){if(dialog.open && !page.classList.contains('active')) dialog.close();document.documentElement.classList.toggle('wf-settings-open',page.classList.contains('active'));}
 new MutationObserver(syncPage).observe(page,{attributes:true,attributeFilter:['class']});
 page.classList.add('wf-settings-inline-ready');syncPage();
})();

(() => {
 const root = document.documentElement;
 const theme = document.getElementById('wfThemePreference');
 const drawer = document.getElementById('wfSidebarPreference');

 function bindPreference(id, datasetKey, storageKey) {
  const field = document.getElementById(id);
  const values = Array.from(field.options, option => option.value);
  function apply(value) {
   const choice = values.includes(value) ? value : 'auto';
   field.value = choice;
   root.dataset[datasetKey] = choice;
  }
  try { apply(localStorage.getItem(storageKey)); } catch (_) { apply('auto'); }
  field.addEventListener('change', () => {
   apply(field.value);
   try { localStorage.setItem(storageKey, field.value); } catch (_) {}
  });
 }
 bindPreference('wfDensityPreference', 'wfDensity', 'wf_display_density');
 bindPreference('wfMotionPreference', 'wfMotion', 'wf_motion_preference');
 bindPreference('wfBusinessPreference', 'wfBusiness', 'wf_furniture_specialty');

 function sync() {
  theme.value = root.dataset.theme === 'dark' ? 'dark' : 'light';
  drawer.value = root.classList.contains('wf-sidebar-collapsed') ? 'closed' : 'open';
 }
 theme.addEventListener('change', () => {
  if (theme.value !== root.dataset.theme) window.toggleTheme();
 });
 drawer.addEventListener('change', () => window.wfSetSidebarCollapsed(drawer.value === 'closed'));
 new MutationObserver(sync).observe(root, {attributes:true, attributeFilter:['data-theme','class']});
 sync();
})();

(() => {
  const mode = document.getElementById('wfLogoTint');
  const color = document.getElementById('wfLogoColor');
  const labels = {
    ar:['لون بطاقة الشعار','من الشعار','لون البرنامج','اختيار لون'],
    en:['Logo card color','From logo','App color','Custom color'],
    tr:['Logo kartı rengi','Logodan','Uygulama rengi','Özel renk'],
    fr:['Couleur de la carte du logo','Du logo','Couleur de l’application','Couleur personnalisée'],
    ru:['Цвет карточки логотипа','Из логотипа','Цвет приложения','Свой цвет']
  };
  function translate() {
    const words = labels[document.documentElement.lang] || labels.en;
    mode.labels[0].textContent = words[0];
    Array.from(mode.options).forEach((option,i) => option.textContent = words[i+1]);
    color.setAttribute('aria-label', words[3]);
  }
  function apply() {
    color.hidden = mode.value !== 'custom';
    const tint = {auto:'var(--wf-logo-tint, var(--brand-primary))',brand:'var(--brand-primary)',custom:color.value};
    document.documentElement.style.setProperty('--wf-card-tint', tint[mode.value]);
  }
  try {
    const saved = JSON.parse(localStorage.getItem('wfLogoCard') || '{}');
    if (['auto','brand','custom'].includes(saved.mode)) mode.value = saved.mode;
    if (/^#[0-9a-f]{6}$/i.test(saved.color)) color.value = saved.color;
  } catch (_) {}
  function save() {
    apply();
    try { localStorage.setItem('wfLogoCard', JSON.stringify({mode:mode.value,color:color.value})); } catch (_) {}
  }
  mode.addEventListener('change', save);
  color.addEventListener('input', save);
  new MutationObserver(translate).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
  translate();
  apply();
})();
