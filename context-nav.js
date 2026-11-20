/* Contextual list filters: relocate existing controls, never duplicate data or handlers. */
(()=>{'use strict';
 const root=document.documentElement;
 const definitions=[['companies','coStatsBar','coTabFilter'],['products','prStatsBar','prTabFilter'],['invoices','invStatsBar','invTabFilter']];
 const entries=definitions.map(([page,id,key])=>{const bar=document.getElementById(id),section=document.getElementById('page-'+page);if(!bar||!section)return null;const anchor=document.createComment('context-filter-home');bar.before(anchor);return {page,bar,section,anchor,key};}).filter(Boolean);
 if(!entries.length)return;
 const compactDock=matchMedia('(max-width:1024px)');
 const dock=document.createElement('nav');dock.id='wfContextNav';dock.hidden=true;
 const home=document.createElement('button');home.type='button';home.className='wf-context-home';home.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="m3 10 9-7 9 7v11h-6v-7H9v7H3Z"/></svg>';home.onclick=()=>window.showPage('dashboard');dock.append(home);document.body.append(dock);
 let current=null,queued=false;
 function sync(){queued=false;const next=compactDock.matches?null:(entries.find(item=>item.section.classList.contains('active'))||null);
  if(current!==next){if(current)current.anchor.after(current.bar);current=next;if(current)dock.append(current.bar);}
  dock.hidden=!current;root.classList.toggle('wf-context-nav-open',!!current);
  const lang=root.lang||'ar',labels={ar:['تصنيفات القسم','الرئيسية'],en:['Section filters','Home'],tr:['Bölüm filtreleri','Ana sayfa'],fr:['Filtres de section','Accueil'],ru:['Фильтры раздела','Главная']}[lang]||['Section filters','Home'];
  dock.setAttribute('aria-label',labels[0]);home.setAttribute('aria-label',labels[1]);home.title=labels[1];
  if(!current)return;
  const state=typeof S==='object'?S:{};
  current.bar.querySelectorAll('.co-stat-pill').forEach(pill=>{const value=pill.getAttribute('onclick')?.match(/'([^']+)'/)?.[1];const selected=value===(state[current.key]||'all');pill.classList.toggle('active',selected);pill.setAttribute('aria-pressed',String(selected));});
 }
 function schedule(){if(!queued){queued=true;requestAnimationFrame(sync);}}
 for(const item of entries){
  for(const pill of item.bar.querySelectorAll('.co-stat-pill')){pill.setAttribute('role','button');pill.tabIndex=0;pill.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();pill.click();}});pill.addEventListener('click',schedule);}
  new MutationObserver(schedule).observe(item.section,{attributes:true,attributeFilter:['class']});
 }
 new MutationObserver(schedule).observe(root,{attributes:true,attributeFilter:['lang','dir']});
 compactDock.addEventListener('change',schedule);
 sync();
})();

/* One curved dock, with controls belonging to the current section. Saves and
   choices click the original controls, preserving validation and busy guards. */
(() => {
  'use strict';
  const nav=document.getElementById('bottomNav');
  if(!nav || nav.dataset.wfContextReady)return;
  const root=document.documentElement;
  const buttons=Array.from({length:5},(_,i)=>document.getElementById('bnav-'+i));
  if(buttons.some(button=>!button))return;
  nav.dataset.wfContextReady='true';
  const localeOrder=['ar','en','tr','fr','ru'];
  const words={
    navigation:['تنقّل القسم','Section navigation','Bölüm menüsü','Navigation de section','Навигация раздела'],
    home:['الرئيسية','Home','Ana sayfa','Accueil','Главная'],
    top:['للأعلى','Top','Yukarı','En haut','Наверх'],
    back:['رجوع','Back','Geri','Retour','Назад'],
    menu:['القائمة','Menu','Menü','Menu','Меню'],
    companies:['العملاء','Clients','Müşteriler','Clients','Клиенты'],
    products:['المنتجات','Products','Ürünler','Produits','Товары'],
    invoices:['الفواتير','Invoices','Faturalar','Factures','Счета'],
    reports:['التقارير','Reports','Raporlar','Rapports','Отчёты'],
    exchange:['الصرف','Rates','Döviz','Taux','Курсы'],
    cashboxes:['الصناديق','Cashboxes','Kasalar','Caisses','Кассы'],
    settings:['الإعدادات','Settings','Ayarlar','Réglages','Настройки'],
    addClient:['إضافة عميل','Add client','Müşteri ekle','Nouveau client','Новый клиент'],
    addProduct:['إضافة منتج','Add product','Ürün ekle','Nouveau produit','Новый товар'],
    newInvoice:['فاتورة جديدة','New invoice','Yeni fatura','Nouvelle facture','Новый счёт'],
    statement:['كشف حساب','Statement','Hesap özeti','Relevé','Выписка'],
    search:['بحث','Search','Ara','Rechercher','Поиск'],
    external:['خارجي','Export','İhracat','Export','Экспорт'],
    retail:['مفرق','Retail','Perakende','Détail','Розница'],
    wholesale:['جملة','Wholesale','Toptan','Gros','Опт'],
    save:['حفظ','Save','Kaydet','Enregistrer','Сохранить'],
    reset:['تفريغ','Reset','Temizle','Effacer','Очистить'],
    types:['اختيار النوع','Choose type','Tür seç','Choisir le type','Выбрать тип'],
    changeType:['تغيير النوع','Change type','Tür değiştir','Changer le type','Сменить тип'],
    preview:['معاينة','Preview','Önizleme','Aperçu','Просмотр'],
    payment:['إضافة دفعة','Add payment','Ödeme ekle','Ajouter paiement','Добавить платёж'],
    movement:['حفظ الحركة','Save entry','Hareket kaydet','Enregistrer','Записать'],
    calculator:['الحاسبة','Calculator','Hesapla','Calculatrice','Калькулятор'],
    refresh:['تحديث','Refresh','Yenile','Actualiser','Обновить'],
    scan:['باركود','Scan','Tara','Scanner','Сканировать'],
    browse:['تصفّح','Browse','Ürünler','Parcourir','Каталог'],
    cart:['السلة','Cart','Sepet','Panier','Корзина'],
    addCart:['أضف للسلة','Add to cart','Sepete ekle','Ajouter au panier','В корзину'],
    tier:['الفئة','Price tier','Fiyat grubu','Tarif','Тариф'],
    cancel:['إلغاء','Cancel','İptal','Annuler','Отмена'],
    close:['إغلاق','Close','Kapat','Fermer','Закрыть']
  };
  const paths={
    home:'<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z"/>',
    users:'<circle cx="9" cy="7" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3m2-17a3 3 0 0 1 0 6m1 4a5 5 0 0 1 3 5v2"/>',
    package:'<path d="m3 7 9-5 9 5v10l-9 5-9-5Zm0 0 9 5 9-5M12 12v10M7.5 4.5l9 5"/>',
    invoice:'<path d="M14 3H5a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V9Zm0 0v6h6M8 13h8m-8 4h6"/>',
    plus:'<path d="M12 4v16M4 12h16"/>',
    search:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
    statement:'<path d="M6 3h14v15H6Zm-3 3v15h14M9 7h8M9 11h8m-8 3h5"/>',
    globe:'<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a19 19 0 0 1 0 18 19 19 0 0 1 0-18Z"/>',
    store:'<path d="M3 9 5 3h14l2 6M3 9v2a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0V9ZM5 14v7h14v-7M9 21v-6h6v6"/>',
    warehouse:'<path d="m2 8 10-5 10 5v13H2Zm5 13V11h10v10M7 15h10M7 18h10"/>',
    save:'<path d="M5 3h12l4 4v14H3V3Zm2 0v6h10V3M7 21v-8h10v8"/>',
    refresh:'<path d="M20 7v5h-5M4 17v-5h5M6 6a8 8 0 0 1 13 1m-1 11a8 8 0 0 1-13-1"/>',
    types:'<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
    eye:'<path d="M2 12s4-8 10-8 10 8 10 8-4 8-10 8S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
    wallet:'<rect x="3" y="5" width="18" height="15" rx="2"/><path d="M16 11h5v4h-5zM5 5V3h12"/>',
    chart:'<path d="M3 3v18h18M8 17v-5m5 5V6m5 11V9"/>',
    rates:'<path d="M3 7h18m-5-5 5 5-5 5M21 17H3m5-5-5 5 5 5"/>',
    calculator:'<rect x="5" y="2" width="14" height="20" rx="2"/><path d="M8 6h8M8 10h1m6 0h1M8 14h1m6 0h1M8 18h1m6 0h1"/>',
    scan:'<path d="M3 7V3h4m10 0h4v4m0 10v4h-4M7 21H3v-4M8 7v10M12 7v10M16 7v10"/>',
    cart:'<path d="M2 3h3l3 13h11l3-10H6"/><circle cx="9" cy="21" r="1"/><circle cx="19" cy="21" r="1"/>',
    tag:'<path d="M3 3h8l10 10-8 8L3 11Z"/><circle cx="7" cy="7" r="1"/>',
    menu:'<path d="M4 6h16M4 12h16M4 18h16"/>',
    cancel:'<path d="m6 6 12 12M18 6 6 18"/>',
    settings:'<circle cx="12" cy="12" r="3"/><path d="M9 3h6l1 3 3 1 2 5-2 5-3 1-1 3H9l-1-3-3-1-2-5 2-5 3-1Z"/>'
  };
  const t=key=>(words[key]||[key])[Math.max(0,localeOrder.indexOf(root.lang))]||words[key]?.[1]||key;
  const route=(page,label=page,icon=page)=>({kind:'route',page,label,icon});
  const control=(selector,label,icon,scope='page')=>({kind:'control',selector,label,icon,scope});
  const back=()=>({kind:'function',name:'goBack',label:'back',icon:'back'});
  const home=()=>route('dashboard','home','home');
  const clients=()=>route('companies','companies','users');
  const products=()=>route('products','products','package');
  const invoices=()=>route('invoices','invoices','invoice');
  const reports=()=>route('reports','reports','chart');
  const boxes=()=>route('cashboxes','cashboxes','wallet');
  const scan=()=>route('quick-barcode','scan','scan');
  const search=id=>control('.wf-search-toggle[aria-controls="'+id+'"]','search','search');
  const save=selector=>control(selector,'save','save');
  const choice=(fn,type,label,icon)=>control('[onclick="'+fn+'(\''+type+'\',event)"]',label,icon);
  let currentPage=null,currentKey='',slots=[],activeIndex=2,queued=false,ariaQueued=false,lastVisual='';

  function isVisible(element){
    if(!element || element.hidden || !element.getClientRects().length || element.closest('[hidden],[inert]'))return false;
    for(let parent=element;parent&&parent!==document.body;parent=parent.parentElement){
      const style=getComputedStyle(parent);
      if(style.display==='none'||style.visibility==='hidden'||style.opacity==='0'||style.pointerEvents==='none')return false;
    }
    return true;
  }
  function targetFor(action,page=currentPage){
    const host=action?.scope==='document'?document:page;
    return action?.selector&&host?Array.from(host.querySelectorAll(action.selector)).find(isVisible)||null:null;
  }
  function configuration(page){
    const key=page?.id.slice(5)||'dashboard';
    const list={
      dashboard:{active:2,items:[clients(),products(),home(),invoices(),scan()]},
      companies:{active:0,items:[clients(),route('select-client-type','addClient','plus'),home(),control('[onclick="wfOpenStatement()"]','statement','statement'),search('coSearch')]},
      products:{active:0,items:[products(),route('add-product','addProduct','plus'),home(),scan(),search('prSearch')]},
      cart:{active:3,items:[back(),products(),home(),route('cart','cart','cart'),control('#wfCartCreateInvoice','newInvoice','invoice')]},
      invoices:{active:0,items:[invoices(),route('select-invoice-type','newInvoice','plus'),home(),reports(),search('invSearch')]},
      'select-client-type':{active:0,items:[clients(),choice('selectTypeAndContinue','external','external','globe'),home(),choice('selectTypeAndContinue','internal_retail','retail','store'),choice('selectTypeAndContinue','internal_wholesale','wholesale','warehouse')]},
      'add-company':{active:4,items:[back(),clients(),home(),control('#coResetBtn','reset','refresh'),save('#coSaveBtn')]},
      'select-invoice-type':{active:0,items:[invoices(),choice('selectInvTypeAndContinue','external','external','globe'),home(),choice('selectInvTypeAndContinue','internal_retail','retail','store'),choice('selectInvTypeAndContinue','internal_wholesale','wholesale','warehouse')]},
      'create-invoice':{active:4,items:[back(),invoices(),home(),control('[onclick="previewInvoice()"]','preview','eye'),save('[onclick="saveInvoice()"]')]},
      'payment-management':{active:4,items:[back(),invoices(),home(),boxes(),control('[onclick="addPaymentToInv()"]','payment','wallet')]},
      reports:{active:3,items:[back(),invoices(),home(),reports(),boxes()]},
      exchange:{active:4,items:[back(),control('.curr-item[onclick="openCurrCalc(\'usd-try\')"]','calculator','calculator'),home(),boxes(),control('.curr-refresh','refresh','refresh')]},
      cashboxes:{active:4,items:[back(),route('exchange','exchange','rates'),home(),reports(),control('.cashboxes form button[type="submit"]','movement','save')]},
      settings:{active:2,items:[clients(),products(),home(),invoices(),scan()]}
    };
    if(key==='add-product'){
      const form=isVisible(document.getElementById('pr-form-view'));
      return form?{active:4,items:[back(),products(),home(),control('#changePrTypeBtn','changeType','types'),save('[onclick="savePr()"]')]}:
        {active:3,items:[back(),products(),home(),{kind:'focus',selector:'#prTypeStepCards',label:'types',icon:'types'},scan()]};
    }
    if(key==='quick-barcode'){
      const phase=typeof QBL==='object'?QBL.phase:1;
      const cart=route('cart','cart','cart');
      if(phase===2)return {active:0,items:[control('#qblCancelTierBtn','cancel','back'),control('#qblTierBtns [data-tier="A"]','tier','tag'),home(),control('#qblTierBtns [data-tier="B"]','tier','tag'),control('#qblTierBtns [data-tier="C"]','tier','tag')].map((item,i)=>i===1||i>2?{...item,suffix:({1:'A',3:'B',4:'C'})[i]}:item)};
      if(phase===3)return {active:4,items:[back(),control('[onclick="qblChangeTier()"]','tier','tag'),home(),cart,control('[onclick="qblAddToInvoice()"]','addCart','cart')]};
      const browsing=document.getElementById('qblBrowseMode')?.getAttribute('aria-pressed')==='true';
      return {active:browsing?0:4,items:[control('#qblBrowseMode','browse','package'),control('.qbl-search-trigger','search','search'),home(),cart,control('#qblScanMode','scan','scan')]};
    }
    return list[key]||{active:2,items:[back(),null,home(),null,{kind:'function',name:'wfToggleDesktopSidebar',label:'menu',icon:'menu'}]};
  }
  function caption(action){
    if(action.label==='home'&&root.classList.contains('wf-home-scroll-top'))return t('top');
    return t(action.label)+(action.suffix?' '+action.suffix:'');
  }
  function graphic(name){
    const backPath=root.dir==='rtl'?'<path d="M5 12h14m-6-6 6 6-6 6"/>':'<path d="M19 12H5m6-6-6 6 6 6"/>';
    return '<svg data-wf-nav-icon="'+name+'" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">'+(name==='back'?backPath:paths[name]||paths.menu)+'</svg>';
  }
  function available(action){
    if(!action)return false;
    if(action.kind==='route')return !!document.getElementById('page-'+action.page);
    if(action.kind==='function')return typeof window[action.name]==='function';
    const target=targetFor(action);
    return !!target&&!target.disabled&&target.getAttribute('aria-disabled')!=='true'&&target.getAttribute('aria-busy')!=='true';
  }
  function normalizeCurrent(){
    ariaQueued=false;
    buttons.forEach((button,i)=>{
      const current=currentKey!=='settings'&&i===activeIndex&&slots[i]?.kind==='route'&&slots[i].page===currentKey;
      if(current&&button.getAttribute('aria-current')!=='page')button.setAttribute('aria-current','page');
      else if(!current&&button.hasAttribute('aria-current'))button.removeAttribute('aria-current');
    });
    // The older Home controller runs on every scroll/resize. While this button
    // is inside Settings, its actual action and accessible name are Save/Close.
    // Leave the original Save handler's own navigation behavior untouched.
    const settings=document.querySelector('.page.active')?.id==='page-settings';
    const center=buttons[2],homeLabel=center.querySelector('.bnav-label:not(.settings-save-label)'),settingsLabel=center.querySelector('.settings-save-label');
    if(homeLabel){if(settings)homeLabel.setAttribute('aria-hidden','true');else homeLabel.removeAttribute('aria-hidden');}
    if(settingsLabel){if(settings)settingsLabel.removeAttribute('aria-hidden');else settingsLabel.setAttribute('aria-hidden','true');}
    if(settings){
      const dialog=document.getElementById('wfSettingsDialog');
      const close=nav.classList.contains('settings-close-action')||!!(dialog?.open&&dialog.querySelector('footer')?.hidden);
      const label=t(close?'close':'save');
      if(center.getAttribute('aria-label')!==label)center.setAttribute('aria-label',label);
      if(center.title!==label)center.title=label;
      if(settingsLabel&&settingsLabel.textContent!==label)settingsLabel.textContent=label;
    }
  }
  function scheduleAria(){if(!ariaQueued){ariaQueued=true;requestAnimationFrame(normalizeCurrent);}}
  const originalMove=window.bnavMoveToIndex;
  if(typeof originalMove==='function')window.bnavMoveToIndex=function(index){
    const result=originalMove.call(this,currentKey==='settings'?2:activeIndex);
    scheduleAria();return result;
  };
  function scrollToTop(){
    const page=document.querySelector('.page.active'),main=document.getElementById('mainContent');
    const behavior=matchMedia('(prefers-reduced-motion:reduce)').matches||root.dataset.wfMotion==='reduced'?'auto':'smooth';
    window.scrollTo({top:0,behavior});
    if(main?.scrollTop)main.scrollTo({top:0,behavior});
    if(page?.scrollTop)page.scrollTo({top:0,behavior});
  }
  function scrollAmount(){
    return Math.max(0,window.scrollY||0,document.scrollingElement?.scrollTop||0,
      document.getElementById('mainContent')?.scrollTop||0,currentPage?.scrollTop||0);
  }
  function run(action){
    if(!available(action))return;
    if(action.kind==='route'){
      if(action.page===currentKey || action.page==='dashboard'&&scrollAmount()>90)scrollToTop();
      else window.showPage(action.page);
    }else if(action.kind==='function')window[action.name]();
    else{
      const target=targetFor(action);
      if(action.kind==='focus'){
        target.scrollIntoView({block:'center',behavior:root.dataset.wfMotion==='reduced'?'auto':'smooth'});
        const first=target.querySelector('button,[role="button"],[onclick]')||target;
        if(!first.hasAttribute('tabindex')&&!first.matches('button,input,select,textarea,a[href]'))first.tabIndex=-1;
        first.focus({preventScroll:true});
      }else target.click();
    }
    schedule();
  }
  function blockingModal(){
    return Array.from(document.querySelectorAll('dialog[open],.modal-ov.open,.delete-modal-ov.open,.wf-restore-ov.open'))
      .some(modal=>!modal.contains(nav)&&isVisible(modal));
  }
  // Capture before the legacy inline handlers and the scroll-to-top listener.
  // Settings still uses its original dialog and original save control.
  nav.addEventListener('click',event=>{
    const button=event.target.closest('.bnav-btn');
    if(!button||!nav.contains(button))return;
    const index=buttons.indexOf(button);
    if(index<0)return;
    event.preventDefault();event.stopImmediatePropagation();
    if(blockingModal())return;
    if(currentKey==='settings'){
      if(index!==2)return;
      const dialog=document.getElementById('wfSettingsDialog');
      if(!dialog?.open)return;
      if(nav.classList.contains('settings-close-action'))dialog.close();
      else{
        const original=dialog.querySelector('footer button[onclick="saveSettings()"]');
        // Mobile keeps the real footer hidden behind this dock. Its logical
        // hidden state still distinguishes Save sections from Close sections.
        if(original&&!original.closest('footer')?.hidden&&!original.disabled&&original.getAttribute('aria-busy')!=='true')original.click();
      }
      return;
    }
    if(!button.disabled)run(slots[index]);
  },true);
  buttons.forEach(button=>{button.type='button';button.removeAttribute('onclick');button.onclick=null;});
  nav.querySelector('.wf-task-action')?.remove();
  const activeObserver=new MutationObserver(records=>{
    if(records.some(record=>!nav.contains(record.target)))schedule();
  });
  function sync(){
    queued=false;
    const page=document.querySelector('.page.active');
    if(!page)return;
    if(page!==currentPage){
      activeObserver.disconnect();currentPage=page;
      activeObserver.observe(page,{subtree:true,childList:true,attributes:true,
        attributeFilter:['style','class','hidden','disabled','aria-busy','aria-pressed']});
    }
    currentKey=page.id.slice(5);
    const config=configuration(page);
    slots=config.items;activeIndex=config.active;
    nav.dataset.taskMode=currentKey==='settings'?'settings':'context';
    nav.dataset.section=currentKey;
    nav.classList.remove('wf-nav-secondary');
    nav.setAttribute('aria-label',t('navigation'));
    const visual=[currentKey,root.lang,root.dir,activeIndex,root.classList.contains('wf-home-scroll-top'),
      ...slots.map(action=>action&&[action.kind,action.label,action.icon,action.selector,action.suffix].join(':'))].join('|');
    buttons.forEach((button,i)=>{
      const action=slots[i];button.hidden=!action;
      if(!action)return;
      const label=button.querySelector('.bnav-label:not(.settings-save-label)'),icon=button.querySelector('.bnav-icon');
      if(label){label.removeAttribute('data-i18n');if(label.textContent!==caption(action))label.textContent=caption(action);}
      // Home's icon is owned by the existing page-aware scroll-to-top controller.
      if(icon&&i!==2){
        icon.removeAttribute('data-wf-business-icon');
        const markup=graphic(action.icon);
        if(icon.dataset.wfContextIcon!==markup){icon.innerHTML=markup;icon.dataset.wfContextIcon=markup;}
      }
      const settings=currentKey==='settings';
      const text=settings&&i===2?(nav.classList.contains('settings-close-action')?t('close'):t('save')):caption(action);
      if(button.title!==text)button.title=text;
      if(button.getAttribute('aria-label')!==text)button.setAttribute('aria-label',text);
      const target=action.kind==='control'?targetFor(action):null;
      const busy=!!target&&(target.disabled||target.getAttribute('aria-busy')==='true');
      button.disabled=settings?false:!available(action);
      if(busy)button.setAttribute('aria-busy','true');else button.removeAttribute('aria-busy');
      button.classList.toggle('bnav-active',i===activeIndex);
    });
    if(visual!==lastVisual){
      lastVisual=visual;
      if(typeof window.bnavMoveToIndex==='function')window.bnavMoveToIndex(activeIndex);
    }
    normalizeCurrent();
  }
  function schedule(){if(!queued){queued=true;requestAnimationFrame(sync);}}
  const pageObserver=new MutationObserver(schedule),knownPages=new WeakSet();
  function observePages(){
    document.querySelectorAll('.page').forEach(page=>{
      if(knownPages.has(page))return;knownPages.add(page);
      pageObserver.observe(page,{attributes:true,attributeFilter:['class']});
    });
    schedule();
  }
  observePages();
  const main=document.getElementById('mainContent');
  if(main)new MutationObserver(observePages).observe(main,{childList:true});
  new MutationObserver(schedule).observe(root,{attributes:true,attributeFilter:['lang','dir','class']});
  new MutationObserver(scheduleAria).observe(nav,{subtree:true,attributes:true,attributeFilter:['aria-current','aria-label','title','class']});
  const cart=document.getElementById('qblCartFab');
  if(cart)new MutationObserver(schedule).observe(cart,{attributes:true,attributeFilter:['class','style','disabled']});
  window.addEventListener('wf-cart-state',schedule);
  const compact=matchMedia('(max-width:1024px)');compact.addEventListener('change',schedule);
  sync();
})();
