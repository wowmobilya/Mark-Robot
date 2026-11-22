/* WOW Admin shell: presentation and local-only controls, never business authorization. */
(() => {
  'use strict';
  const doc=document,html=doc.documentElement,header=doc.querySelector('main > header');
  if(!header)return;
  const words={
    ar:{menu:'القائمة الجانبية',close:'إغلاق القائمة',nav:'أقسام الإدارة',quick:'أدوات سريعة',theme:'تبديل المظهر',density:'حجم الواجهة',compact:'مضغوط',comfortable:'مريح',search:'بحث في شركات هذه الصفحة',filter:'حالة الشركة',all:'كل الحالات',active:'نشطة',suspended:'موقوفة',results:'شركات ظاهرة',empty:'لا توجد شركات مطابقة في هذه الصفحة',page:'في الصفحة الحالية'},
    en:{menu:'Side menu',close:'Close menu',nav:'Administration sections',quick:'Quick tools',theme:'Toggle appearance',density:'Interface size',compact:'Compact',comfortable:'Comfortable',search:'Search companies on this page',filter:'Company status',all:'All statuses',active:'Active',suspended:'Suspended',results:'Showing companies',empty:'No matching companies on this page',page:'On the current page'},
    tr:{menu:'Yan menü',close:'Menüyü kapat',nav:'Yönetim bölümleri',quick:'Hızlı araçlar',theme:'Görünümü değiştir',density:'Arayüz boyutu',compact:'Kompakt',comfortable:'Rahat',search:'Bu sayfadaki şirketleri ara',filter:'Şirket durumu',all:'Tüm durumlar',active:'Aktif',suspended:'Askıda',results:'Gösterilen şirketler',empty:'Bu sayfada eşleşen şirket yok',page:'Geçerli sayfada'},
    fr:{menu:'Menu latéral',close:'Fermer le menu',nav:'Sections administrateur',quick:'Accès rapide',theme:'Changer le thème',density:'Taille de l’interface',compact:'Compact',comfortable:'Confortable',search:'Rechercher sur cette page',filter:'Statut',all:'Tous les statuts',active:'Active',suspended:'Suspendue',results:'Sociétés affichées',empty:'Aucune société correspondante sur cette page',page:'Sur la page actuelle'},
    ru:{menu:'Боковое меню',close:'Закрыть меню',nav:'Разделы управления',quick:'Быстрые действия',theme:'Сменить тему',density:'Размер интерфейса',compact:'Компактный',comfortable:'Обычный',search:'Поиск компаний на странице',filter:'Статус компании',all:'Все статусы',active:'Активна',suspended:'Приостановлена',results:'Показано компаний',empty:'На этой странице нет совпадений',page:'На текущей странице'}
  };
  const create=(tag,className,text)=>{const el=doc.createElement(tag);if(className)el.className=className;if(text!==undefined)el.textContent=text;return el;};
  const pref=()=>window.WFPlatformPreferences;
  const readDensity=()=>{try{const value=localStorage.getItem('wow.platform.density');if(['compact','comfortable'].includes(value))return value;}catch{}
    return matchMedia('(max-width:1024px)').matches?'compact':'comfortable';};
  let density=readDensity(),nav=null,drawerLast=null,resizeObserver=null,navObserver=null;
  let language=()=>words[doc.getElementById('lang')?.value]||words.ar;
  let preferenceHosts=[];
  const button=create('button','platform-menu-button');
  button.type='button';button.id='platformMenuButton';button.hidden=true;
  button.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><path d="M4 6h16M4 12h16M4 18h16"/></svg>';
  button.setAttribute('aria-controls','platformSideDrawer');button.setAttribute('aria-expanded','false');
  header.prepend(button);
  const themeButton=create('button','platform-theme-button');
  themeButton.type='button';themeButton.id='platformThemeToggle';themeButton.hidden=false;
  themeButton.setAttribute('aria-label',words.ar.theme);
  header.querySelector('.platform-preferences')?.append(themeButton);
  const backdrop=create('div','platform-drawer-backdrop');backdrop.hidden=true;
  const drawer=create('aside','platform-side-drawer');drawer.id='platformSideDrawer';
  drawer.hidden=true;drawer.setAttribute('role','dialog');drawer.setAttribute('aria-modal','true');
  doc.body.append(backdrop,drawer);
  const orbit=create('span','platform-nav-orbit');orbit.setAttribute('aria-hidden','true');
  const setDensity=value=>{
    if(!['compact','comfortable'].includes(value))return;
    density=value;html.dataset.adminDensity=value;
    try{localStorage.setItem('wow.platform.density',value);}catch{}
    for(const root of preferenceHosts){for(const item of root.querySelectorAll('[data-platform-density]'))
      item.setAttribute('aria-pressed',String(item.dataset.platformDensity===density));}
  };
  html.dataset.adminDensity=density;
  const appearance=()=>pref()?.getAppearance?.()||{effective:html.dataset.theme||'light'};
  function updateAppearance(){
    const current=appearance(),dark=current.effective==='dark';
    themeButton.textContent='';themeButton.dataset.icon=dark?'sun':'moon';
    themeButton.setAttribute('aria-label',language().theme);
    themeButton.setAttribute('aria-pressed',String(dark));
    for(const item of drawer.querySelectorAll('.platform-drawer-theme'))item.textContent=(dark?'☀ ':'☾ ')+language().theme;
  }
  themeButton.addEventListener('click',()=>pref()?.toggleTheme?.());
  doc.addEventListener('wf-platform-appearance-changed',updateAppearance);
  function densityPicker(){
    const w=language(),wrap=create('section','platform-density-widget'),label=create('strong','',w.density);
    const controls=create('div','platform-density-buttons');
    for(const value of ['compact','comfortable']){
      const item=create('button','platform-density-choice',w[value]);
      item.type='button';item.dataset.platformDensity=value;
      item.setAttribute('aria-pressed',String(density===value));
      item.addEventListener('click',()=>setDensity(value));
      controls.append(item);
    }
    wrap.append(label,controls);return wrap;
  }
  function close(){
    if(drawer.hidden)return;
    drawer.hidden=true;backdrop.hidden=true;html.classList.remove('platform-drawer-open');
    button.setAttribute('aria-expanded','false');
    const focus=drawerLast;drawerLast=null;
    if(focus?.isConnected)focus.focus({preventScroll:true});
  }
  function open(){
    if(button.hidden)return;
    drawerLast=doc.activeElement;drawer.hidden=false;backdrop.hidden=false;
    html.classList.add('platform-drawer-open');button.setAttribute('aria-expanded','true');
    drawer.querySelector('.platform-drawer-close')?.focus({preventScroll:true});
  }
  button.addEventListener('click',()=>drawer.hidden?open():close());
  backdrop.addEventListener('click',close);
  drawer.addEventListener('keydown',event=>{
    if(event.key==='Escape'){event.preventDefault();close();return;}
    if(event.key!=='Tab')return;
    const focusables=[...drawer.querySelectorAll('button:not([disabled]),a[href],input:not([disabled])')]
      .filter(node=>node.getClientRects().length);
    const first=focusables[0],last=focusables.at(-1);
    if(!first)return;
    if(event.shiftKey&&doc.activeElement===first){event.preventDefault();last.focus();}
    else if(!event.shiftKey&&doc.activeElement===last){event.preventDefault();first.focus();}
  });
  function buildDrawer(links){
    const w=language();
    drawer.replaceChildren();
    const top=create('header','platform-drawer-head');
    const identity=create('div','platform-drawer-identity');
    const icon=create('img');icon.src='admin-icon-192.png';icon.alt='';icon.width=42;icon.height=42;
    const heading=create('strong','', 'WOW Admin');
    identity.append(icon,heading);
    const closeButton=create('button','platform-drawer-close','×');closeButton.type='button';closeButton.setAttribute('aria-label',w.close);closeButton.addEventListener('click',close);
    top.append(identity,closeButton);drawer.append(top);
    const label=create('h2','',w.nav),navLinks=create('nav','platform-drawer-links');
    navLinks.setAttribute('aria-label',w.nav);
    for(const [key,source] of Object.entries(links)){
      const link=create('a','platform-drawer-link');
      link.href='#'+key;link.dataset.section=key;
      const mark=create('span','platform-drawer-icon');
      mark.setAttribute('aria-hidden','true');
      const url=getComputedStyle(source).getPropertyValue('--section-icon');
      if(url)mark.style.setProperty('--admin-nav-icon',url);
      link.append(mark,create('span','',source.textContent));
      link.addEventListener('click',close);navLinks.append(link);
    }
    drawer.append(label,navLinks,create('h2','',w.quick));
    const quick=create('div','platform-drawer-quick');
    const theme=create('button','platform-drawer-theme');theme.type='button';
    theme.addEventListener('click',()=>pref()?.toggleTheme?.());
    const settings=create('a','platform-drawer-settings',links.settings?.textContent||'⚙');settings.href='#settings';settings.addEventListener('click',close);
    quick.append(theme,settings);drawer.append(quick,densityPicker());
    const footer=create('footer','platform-drawer-footer');
    const developerText={
      ar:['برمجة وتطوير','م. معتز بالله حاج شعبان'],
      en:['Programming & development','Eng. Mutez Billah Haj Shaban'],
      tr:['Programlama ve geliştirme','Müh. Mutez Billah Haj Shaban'],
      fr:['Programmation et développement','Ing. Mutez Billah Haj Shaban'],
      ru:['Программирование и разработка','Инженер Мутаз Биллах Хадж Шаабан']
    }[doc.getElementById('lang')?.value]||['Programming & development','WOW FURNITURE'];
    const developer=create('button','platform-drawer-developer');
    developer.type='button';
    developer.setAttribute('aria-label',developerText.join(' · '));
    developer.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="15" rx="2.5"/><path d="m9 9-2 2.5L9 14m6-5 2 2.5-2 2.5M8 22h8m-4-3v3"/></svg>';
    const developerCopy=create('span','platform-drawer-developer-copy');
    // Same label/name hierarchy as the original #wfDevCredit in the company sidebar.
    developerCopy.append(create('small','',developerText[0]),create('b','',developerText[1]));
    developer.append(developerCopy);
    developer.addEventListener('click',()=>{close();window.WFPlatformDeveloper?.open();});
    const signout=create('button','platform-drawer-signout',
      ({ar:'تسجيل الخروج',en:'Sign out',tr:'Çıkış yap',fr:'Se déconnecter',ru:'Выйти'})[doc.getElementById('lang')?.value]||'Sign out');
    signout.type='button';signout.addEventListener('click',()=>window.WFPlatformLogout?.());
    // Match the original WOW company application's sidebar: programmer credit is the final item.
    footer.append(signout);drawer.append(footer,developer);
    updateAppearance();syncDrawerActive();
  }
  function syncDrawerActive(){
    const current=location.hash.slice(1)||'home';
    for(const item of drawer.querySelectorAll('.platform-drawer-link')){
      if(item.dataset.section===current)item.setAttribute('aria-current','page');
      else item.removeAttribute('aria-current');
    }
  }
  function positionOrbit(){
    if(!nav||!nav.isConnected)return;
    const active=nav.querySelector('.platform-section-link[aria-current="page"]');
    if(!active)return;
    const menuRect=nav.getBoundingClientRect(),rect=active.getBoundingClientRect();
    if(menuRect.width<1)return;
    const center=rect.left+rect.width/2-menuRect.left;
    nav.style.setProperty('--admin-nav-x',Math.round(center*10)/10+'px');
    orbit.style.setProperty('--admin-orbit-icon',getComputedStyle(active).getPropertyValue('--section-icon'));
  }
  const queueOrbit=()=>requestAnimationFrame(positionOrbit);
  window.addEventListener('resize',queueOrbit,{passive:true});
  window.visualViewport?.addEventListener('resize',queueOrbit,{passive:true});
  window.addEventListener('hashchange',()=>{syncDrawerActive();queueOrbit();});
  function mountOverview(companies,state){
    const cards=[...companies.querySelectorAll(':scope > .platform-company-card')];
    if(!cards.length)return;
    const w=language(),outer=create('section','platform-company-overview');
    const tools=create('div','platform-overview-tools');
    const searchLabel=create('label','platform-overview-search'),search=create('input');
    search.type='search';search.autocomplete='off';search.placeholder=w.search;search.setAttribute('aria-label',w.search);
    searchLabel.append(search);
    const filterLabel=create('label','platform-overview-status'),filter=create('select');
    filter.setAttribute('aria-label',w.filter);
    for(const [value,text] of [['all',w.all],['active',w.active],['suspended',w.suspended]]){
      const opt=create('option','',text);opt.value=value;filter.append(opt);
    }
    filterLabel.append(filter);tools.append(searchLabel,filterLabel);
    const stats=create('p','platform-overview-count'),empty=create('p','platform-overview-empty',w.empty);
    empty.hidden=true;
    const apply=()=>{
      const term=search.value.trim().toLocaleLowerCase(),kind=filter.value;
      let visible=0;
      for(const card of cards){
        const title=card.querySelector('.platform-company-name')?.textContent||'';
        const status=card.querySelector('.platform-company-status')?.dataset.state||'';
        const show=(!term||title.toLocaleLowerCase().includes(term))&&(kind==='all'||kind===status);
        card.hidden=!show;if(show)visible++;
      }
      stats.textContent=w.results+': '+visible+' / '+cards.length+' · '+w.page;
      empty.hidden=visible!==0;
    };
    search.addEventListener('input',apply);filter.addEventListener('change',apply);
    outer.append(tools,stats,empty);
    const panel=companies.querySelector('.platform-create-panel');
    if(panel)panel.after(outer);else companies.prepend(outer);
    apply();
  }
  function mount({state,companies,menu,links,preferences}){
    button.hidden=themeButton.hidden=false;header.classList.add('platform-authenticated');
    button.setAttribute('aria-label',language().menu);
    button.title=language().menu;
    close();
    navObserver?.disconnect();resizeObserver?.disconnect();
    nav=menu;
    orbit.remove();nav.append(orbit);
    navObserver=new MutationObserver(queueOrbit);
    navObserver.observe(nav,{subtree:true,attributes:true,attributeFilter:['aria-current']});
    if(typeof ResizeObserver!=='undefined'){
      resizeObserver=new ResizeObserver(queueOrbit);
      resizeObserver.observe(nav);
      for(const child of nav.querySelectorAll('.platform-section-link'))resizeObserver.observe(child);
    }
    buildDrawer(links);
    if(preferences){
      const control=densityPicker();
      preferences.append(control);
      preferenceHosts=[drawer,preferences];
    }else preferenceHosts=[drawer];
    mountOverview(companies,state);
    updateAppearance();queueOrbit();
  }
  function reset(){
    close();button.hidden=true;themeButton.hidden=false;
    header.classList.remove('platform-authenticated');
    updateAppearance();
    navObserver?.disconnect();navObserver=null;
    resizeObserver?.disconnect();resizeObserver=null;
    nav=null;preferenceHosts=[];
  }
  updateAppearance();
  window.WFPlatformShell=Object.freeze({mount,reset});
})();
