// Register the cash desk before navigation, search and pagination bind their controls.
(() => {
 const exchange=document.getElementById('page-exchange');
 const group=document.querySelector('#sidebar .wf-nav-settings');
 if(!exchange || !group)return;
 const page=document.createElement('section');
 page.id='page-cashboxes';page.className='page';
 page.innerHTML='<header class="sct-sticky-header"><button type="button" class="sct-back-btn" onclick="goBack()"><span data-i18n="btn_back">رجوع</span></button><div class="sct-sticky-title"><h1>صناديق العملات</h1></div></header>';
 exchange.after(page);
 const link=document.createElement('button');
 link.type='button';link.className='nav-item';
 link.innerHTML='<span class="nav-icon" aria-hidden="true"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="3" y="5" width="18" height="15" rx="3"/><path d="M16 11h5v4h-5zM5 5V3h12"/></svg></span><span>صناديق العملات</span>';
 link.onclick=()=>showPage('cashboxes');
 group.append(link);
 new MutationObserver(()=>link.classList.toggle('active',page.classList.contains('active'))).observe(page,{attributes:true,attributeFilter:['class']});
 const oldLink=location.hash==='#exchange' && new URLSearchParams(location.search).has('cashboxes');
 if(location.hash==='#cashboxes'||oldLink){
   const open=()=>{showPage('cashboxes',false);history.replaceState({page:'cashboxes'},'','#cashboxes');};
   if(document.documentElement.classList.contains('wf-booting')){
     const boot=new MutationObserver(()=>{if(!document.documentElement.classList.contains('wf-booting')){boot.disconnect();open();}});
     boot.observe(document.documentElement,{attributes:true,attributeFilter:['class']});
   }else open();
 }
})();
/* Keep dashboard controls steady and show reading progress while scrolling. */
(()=>{'use strict';
 const root=document.documentElement;
 const compact=matchMedia('(max-width:1024px)');
 const sidebar=document.getElementById('sidebar');
 const opener=document.getElementById('desktopSidebarToggle');
 let returnFocus=opener;
 opener.setAttribute('aria-controls','sidebar');
 const rates=document.getElementById('currBar');
 let queued=false;
 let outsideClicks=0,lastOutsideClick=0,hintTimer;
 function trackOutsideClick(event){
  const drawer=document.getElementById('sidebar'),handle=document.getElementById('wfSidebarClose');
  const open=compact.matches?drawer?.classList.contains('open'):!root.classList.contains('wf-sidebar-collapsed');
  if(!open||!handle||handle.hidden){outsideClicks=0;return;}
  if(!event.target.closest||event.target.closest('#sidebar,#wfSidebarClose,button,a,input,select,textarea,[role="button"],[onclick]'))return;
  const now=Date.now();outsideClicks=now-lastOutsideClick<=5000?outsideClicks+1:1;lastOutsideClick=now;
  if(outsideClicks<3)return;outsideClicks=0;
  handle.classList.add('wf-dismiss-hint');clearTimeout(hintTimer);
  hintTimer=setTimeout(()=>handle.classList.remove('wf-dismiss-hint'),2400);
  let status=document.getElementById('wfDrawerHint');
  if(!status){status=document.createElement('span');status.id='wfDrawerHint';status.className='wf-visually-hidden';status.setAttribute('role','status');status.setAttribute('aria-live','polite');document.body.append(status);}
  status.textContent={ar:'لإغلاق القائمة استخدم زر طيّ القائمة.',en:'Use the Close sidebar button to close the menu.',tr:'Menüyü kapatmak için menüyü kapat düğmesini kullanın.',fr:'Utilisez le bouton Fermer le menu pour le fermer.',ru:'Чтобы закрыть меню, нажмите кнопку «Закрыть меню».'}[root.lang]||'Use the Close sidebar button to close the menu.';
 }
 document.addEventListener('click',trackOutsideClick);

 function syncScroll(){const dashboard=document.querySelector('#page-dashboard.active');const distance=Math.max(0,document.documentElement.scrollHeight-innerHeight);const y=Math.max(0,scrollY);root.classList.toggle('wf-dashboard-scrolled',!!dashboard&&y>24);root.style.setProperty('--wf-scroll-progress',dashboard&&distance?`${Math.min(100,y/distance*100)}%`:'0%');root.classList.remove('wf-header-hidden');}
 function reveal(){const page=document.querySelector('.page.active');const rateHost=document.getElementById(page?.id==='page-exchange'?'wfExchangeRates':'wfDashRates');if(rates&&rateHost&&rates.parentElement!==rateHost)rateHost.append(rates);root.classList.toggle('wf-section-mode',!!page&&page.id!=='page-dashboard');syncScroll();syncControls();}
 const menuSvg='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16"/></svg>';
 const foldSvg='<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="3"/><path d="M9 4v16m7-12-4 4 4 4"/></svg>';
 function syncControls(){
  syncBackButtons();
  syncSectionHeadings();
  const open=compact.matches?sidebar.classList.contains('open'):!root.classList.contains('wf-sidebar-collapsed');
  sidebar.inert=compact.matches && !open;
  const handle=document.getElementById('wfSidebarClose');
  if(handle)handle.hidden=!open;
  sidebar.querySelectorAll('.nav-item').forEach(button=>{
   const caption=button.children[1]?.textContent.trim();
   if(caption){button.setAttribute('aria-label',caption);button.title=caption;}
   if(button.classList.contains('active'))button.setAttribute('aria-current','page');
   else button.removeAttribute('aria-current');
  });
  const lang=root.lang||'ar';const copy={ar:['فتح القائمة','طيّ القائمة'],tr:['Menüyü aç','Menüyü kapat'],en:['Open sidebar','Close sidebar'],fr:['Ouvrir le menu','Fermer le menu'],ru:['Открыть меню','Закрыть меню']}[lang]||['Open sidebar','Close sidebar'];
  document.querySelectorAll('#desktopSidebarToggle,#wfSidebarClose,.wf-section-menu').forEach(button=>{if(button.dataset.open!==String(open)){button.innerHTML=button===handle&&open?'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg>':open?foldSvg:menuSvg;button.dataset.open=String(open);}button.setAttribute('aria-expanded',String(open));button.setAttribute('aria-label',copy[open?1:0]);button.title=copy[open?1:0];});
 }
 // Equal side columns keep the full title group centered independently of actions.
 function syncSectionHeadings(){
  document.querySelectorAll('.page .sct-sticky-title,.page .co-toolbar-title,.page .page-toolbar-title').forEach(title=>{
   const row=title.parentElement;
   if(!row||!Array.from(row.children).some(child=>child.classList.contains('sct-back-btn')))return;
   row.classList.add('wf-heading-row');title.classList.add('wf-centered-heading');
   let menu=row.querySelector(':scope > .wf-section-menu');
   if(!menu){
    menu=document.createElement('button');
    menu.type='button';
    menu.className='wf-section-menu';
    menu.setAttribute('aria-controls','sidebar');
    menu.addEventListener('click',()=>window.wfToggleDesktopSidebar());
    row.append(menu);
   }
   let actions=Array.from(row.children).find(child=>child.classList.contains('wf-heading-actions'));
   const extra=Array.from(row.children).filter(child=>child!==title&&child!==actions&&child!==menu&&!child.classList.contains('sct-back-btn'));
   if(extra.length){if(!actions){actions=document.createElement('div');actions.className='wf-heading-actions';row.append(actions);}extra.forEach(child=>actions.append(child));}
  });
  document.querySelectorAll('.modal-hdr').forEach(row=>{if(row.querySelector('.modal-title')&&row.querySelector('.modal-close'))row.classList.add('wf-centered-modal-header');});
  const scanner=document.querySelector('#scannerModal .modal > div:first-child');
  if(scanner&&scanner.querySelector('.modal-close')){scanner.classList.add('wf-centered-modal-header');scanner.firstElementChild.classList.add('wf-modal-heading');}
 }
 // Replace only the back pictogram; never replace buttons, labels or onclick handlers.
 function syncBackButtons(){
  const rtl=root.dir==='rtl'||(!root.dir&&root.lang==='ar');
  const label={ar:'رجوع',tr:'Geri',en:'Back',fr:'Retour',ru:'Назад'}[root.lang]||'Back';
  document.querySelectorAll('.page .sct-back-btn').forEach(button=>{
   let icon=button.querySelector('[data-wf-back-icon]');
   if(!icon){
    button.querySelectorAll('[data-wf-ui-icon="arrow-left"],[data-wf-ui-icon="arrow-right"]').forEach(old=>old.remove());
    Array.from(button.childNodes).filter(node=>node.nodeType===3).forEach(node=>{node.nodeValue=node.nodeValue.replace(/^[\s]*[←→]\s*/, '');});
    icon=document.createElement('span');icon.className='wf-ui-icon';icon.setAttribute('data-wf-back-icon','');icon.setAttribute('data-wf-ui-icon','back');icon.setAttribute('aria-hidden','true');button.prepend(icon);
   }
   const direction=rtl?'right':'left';
   if(icon.dataset.direction!==direction){
    const path=rtl?'M5 12h14m-6-6 6 6-6 6':'M19 12H5m6-6-6 6 6 6';
    icon.innerHTML=`<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="${path}"/></svg>`;
    icon.dataset.direction=direction;
   }
   button.setAttribute('aria-label',label);button.title=label;
  });
 }
 function update(){
  queued=false;
  syncScroll();
 }
 addEventListener('scroll',()=>{if(!queued){queued=true;requestAnimationFrame(update);}},{passive:true});
 let swipeStart;
 sidebar.addEventListener('touchstart', event => {
  swipeStart = compact.matches && event.touches.length === 1 ? event.touches[0] : null;
 }, {passive:true});
 sidebar.addEventListener('touchcancel', () => { swipeStart = null; });
 sidebar.addEventListener('touchend', event => {
  if (!swipeStart || !sidebar.classList.contains('open')) return;
  const end = event.changedTouches[0];
  const dx = end.clientX - swipeStart.clientX, dy = end.clientY - swipeStart.clientY;
  swipeStart = null;
  const outward = getComputedStyle(sidebar).direction === 'rtl' ? dx : -dx;
  if (outward > 70 && outward > 2 * Math.abs(dy)) window.closeSidebar();
 }, {passive:true});
 compact.addEventListener('change',()=>{window.closeSidebar();reveal();});
 document.addEventListener('keydown',event=>{
  if(document.querySelector('.wf-nav-dialog[open]')||!compact.matches||!sidebar.classList.contains('open'))return;
  if(event.key==='Escape'){
   event.preventDefault();
   window.closeSidebar();
   return;
  }
  if(event.key!=='Tab')return;
  const buttons=[...sidebar.querySelectorAll('button:not([disabled]),input:not([disabled])')].filter(control=>control.getClientRects().length);
  const first=buttons[0],last=buttons[buttons.length-1];
  if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
  else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
 });
 const original=window.showPage;
 if(typeof original==='function')window.showPage=function(...args){root.classList.toggle('wf-section-mode',args[0]!=='dashboard');root.classList.remove('wf-header-hidden');const value=original.apply(this,args);reveal();return value;};
 if(sidebar)new MutationObserver(()=>{const open=compact.matches&&sidebar.classList.contains('open');root.classList.toggle('wf-mobile-menu-open',open);syncControls();if(open){reveal();document.getElementById('wfSidebarClose')?.focus({preventScroll:true});}else if(compact.matches&&returnFocus?.getClientRects().length&&document.activeElement===document.body){returnFocus.focus({preventScroll:true});}}).observe(sidebar,{attributes:true,attributeFilter:['class']});
 new MutationObserver(syncControls).observe(root,{attributes:true,attributeFilter:['class','dir','lang']});
 const quotes=document.getElementById('currBar');
 function decorateQuotes(){quotes?.querySelectorAll('.wf-market-trend').forEach(tag=>{if(tag.querySelector('.wf-market-arrow'))return;const match=tag.textContent.match(/([▲▼])\s*$/);if(!match)return;const value=tag.textContent.slice(0,match.index).trim();const arrow=document.createElement('span');arrow.className='wf-market-arrow';arrow.setAttribute('aria-hidden','true');arrow.textContent=match[1];tag.replaceChildren(document.createTextNode(value+' '),arrow);});}
 if(quotes){new MutationObserver(decorateQuotes).observe(quotes,{childList:true,subtree:true});decorateQuotes();}
 reveal();
})();

(() => {
  const search = document.getElementById('wfSidebarSearch');
  const empty = document.getElementById('wfSidebarEmpty');
  const groups = [...document.querySelectorAll('#wf-nav-main .wf-nav-group')];
  if (!search || !empty) return;
  function normalize(text) {
    return text.normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase(document.documentElement.lang || 'ar');
  }
  const nav = document.getElementById('wf-nav-main');
  const pager = document.getElementById('wfSidebarPager');
  const previous = document.getElementById('wfSidebarPrev');
  const next = document.getElementById('wfSidebarNext');
  const pageNumber = document.getElementById('wfSidebarPage');
  const items = [...nav.querySelectorAll('.nav-item')];
  let activePage = 0;
  let matchingItems = [];
  function filter() {
    const query = '';
    matchingItems = items.filter(item => {
      const caption = item.querySelector('[data-i18n], [data-wf-ui]')?.textContent || item.textContent;
      return normalize(caption).includes(query);
    });
    // Measure full translated rows with the real drawer width and current font.
    empty.hidden = matchingItems.length !== 0;
    for (const item of items) item.hidden = !matchingItems.includes(item);
    for (const group of groups) group.hidden = !matchingItems.some(item => item.parentElement === group);
    pager.hidden = true;
    nav.classList.remove('wf-nav-paged');
    const partitions = [[]];
    if (nav.clientHeight && nav.scrollHeight > nav.clientHeight) {
      nav.classList.add('wf-nav-paged');
      pager.hidden = false;
      const style = getComputedStyle(nav);
      const space = nav.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
      const gap = parseFloat(style.rowGap) || 0;
      let used = 0;
      for (const item of matchingItems) {
        const height = item.getBoundingClientRect().height;
        let page = partitions[partitions.length - 1];
        if (page.length && used + gap + height > space) {
          partitions.push(page = []);
          used = 0;
        }
        used += height + (page.length ? gap : 0);
        page.push(item);
      }
    } else {
      partitions[0] = matchingItems;
    }
    const pages = partitions.length;
    activePage = Math.max(0, Math.min(activePage, pages - 1));
    const visible = partitions[activePage];
    for (const item of items) item.hidden = !visible.includes(item);
    for (const group of groups) group.hidden = !visible.some(item => item.parentElement === group);
    pager.hidden = pages === 1;
    previous.disabled = activePage === 0;
    next.disabled = activePage + 1 === pages;
    const lang = document.documentElement.lang || 'ar';
    const labels = {ar:['السابق','التالي'], en:['Previous','Next'], tr:['Önceki','Sonraki'], fr:['Précédent','Suivant'], ru:['Назад','Далее']};
    const [back, forward] = labels[lang] || labels.en;
    previous.setAttribute('aria-label', back);
    next.setAttribute('aria-label', forward);
    const format = new Intl.NumberFormat(lang);
    pageNumber.textContent = format.format(activePage + 1) + ' / ' + format.format(pages);
    empty.hidden = matchingItems.length !== 0;
  }
  for (const [button, step] of [[previous, -1], [next, 1]]) {
    button.addEventListener('click', () => {
      activePage += step;
      filter();
      if (button.disabled) (step > 0 ? previous : next).focus();
    });
  }
  const drawer=nav.closest('#sidebar');
  const root=document.documentElement;
  let expanded=groups.find(group=>group.querySelector('.active'))||groups[0];
  const headings=groups.map((group,index)=>{
    const button=document.createElement('button');
    button.className='wf-group-toggle';
    button.type='button';
    const caption=group.querySelector('.side-sec');
    const label=document.createElement('span');
    if(caption){label.dataset.i18n=caption.dataset.i18n;label.textContent=caption.textContent;}
    else {label.dataset.i18n='settings';label.textContent=group.querySelector('[data-i18n="settings"]').textContent;}
    const controls=[...group.querySelectorAll('.nav-item')];
    controls.forEach((item,i)=>item.id||=('wf-destination-'+index+'-'+i));
    button.setAttribute('aria-controls',controls.map(item=>item.id).join(' '));
    button.append(label);
    group.prepend(button);
    button.onclick=()=>{expanded=expanded===group?null:group;layout();};
    return button;
  });
  function isRail(){
    return matchMedia('(min-width:1025px)').matches&&root.classList.contains('wf-sidebar-collapsed');
  }
  const submenus=[];
  for(const [section,actions] of [
    ['nav_companies',['nav_add_co']],
    ['nav_products',['nav_add_pr','Quick Barcode']],
    ['nav_invoices',['nav_create']]
  ]){
    const find=key=>items.find(item=>item.querySelector('[data-i18n="'+key+'"],[data-wf-ui="'+key+'"]'));
    const parent=find(section);
    if(!parent)continue;
    const submenu=document.createElement('div');
    submenu.className='wf-context-actions';
    submenu.id='actions-'+section;
    submenu.hidden=true;
    parent.after(submenu);
    parent.setAttribute('aria-controls',submenu.id);
    parent.setAttribute('aria-expanded','false');
    for(const key of [section,...actions]){
      const source=find(key);
      if(!source)continue;
      const button=document.createElement('button');
      const label=source.querySelector('[data-i18n],[data-wf-ui]').cloneNode(true);
      button.type='button';
      button.append(label);
      button.onclick=()=>source.onclick.call(source);
      submenu.append(button);
    }
    submenus.push({parent,submenu});
    parent.addEventListener('click',event=>{
      event.stopImmediatePropagation();
      const open=submenu.hidden||isRail();
      if(isRail())window.wfToggleDesktopSidebar();
      expanded=parent.parentElement;
      layout();
      for(const entry of submenus){
        const show=open&&entry.parent===parent;
        entry.submenu.hidden=!show;
        entry.parent.setAttribute('aria-expanded',String(show));
      }
    },true);
  }
  function layout(){
    drawer.style.setProperty('--drawer-viewport',(window.visualViewport?.height||innerHeight)+'px');
    const rail=matchMedia('(min-width:1025px)').matches&&root.classList.contains('wf-sidebar-collapsed');
    drawer.classList.toggle('wf-icon-rail',rail);
    submenus.forEach(({parent,submenu})=>{
      if(rail||parent.parentElement!==expanded){submenu.hidden=true;parent.setAttribute('aria-expanded','false');}
    });
    if(rail){filter();return;}
    pager.hidden=true;
    nav.classList.remove('wf-nav-paged');
    groups.forEach((group,i)=>{
      group.hidden=false;
      headings[i].setAttribute('aria-expanded',String(group===expanded));
      group.querySelectorAll('.nav-item').forEach(item=>item.hidden=group!==expanded);
    });
  }
  new ResizeObserver(layout).observe(nav);
  new MutationObserver(layout).observe(root,{attributes:true,attributeFilter:['class','lang']});
  window.visualViewport?.addEventListener('resize',layout);
  layout();

  const dialog=document.getElementById('wfSearchDialog');
  const toggle=document.getElementById('wfSidebarSearchToggle');
  const results=document.getElementById('wfSearchResults');
  // The search field takes over the existing search button's footprint.
  // Results stay in the drawer, without a popup, overlay or extra header.
  const searchField=document.createElement('div');
  searchField.className='wf-search-inline';
  searchField.hidden=true;
  const clearSearch=document.createElement('button');
  clearSearch.type='button';
  clearSearch.className='wf-search-inline-clear';
  clearSearch.textContent='×';
  toggle.after(searchField);
  searchField.append(search,clearSearch);
  searchField.after(dialog);
  let scrollPosition=0;
  function translateClear(){
    const label={ar:'مسح البحث أو إغلاقه',en:'Clear or close search',tr:'Aramayı temizle veya kapat',fr:'Effacer ou fermer la recherche',ru:'Очистить или закрыть поиск'};
    clearSearch.setAttribute('aria-label',label[root.lang]||label.en);
  }
  new MutationObserver(translateClear).observe(root,{attributes:true,attributeFilter:['lang']});
  translateClear();
  function terms(text){
    return normalize(text).replace(/[أإآٱ]/g,'ا').replace(/ى/g,'ي').replace(/ـ/g,'');
  }
  function renderResults(){
    const query=terms(search.value.trim());
    const words=query.split(/\s+/);
    const matches=items.map(item=>{
      const caption=item.children[1].textContent.trim();
      const name=terms(caption);
      const score=name===query?3:name.startsWith(query)?2:1;
      return {item,caption,name,score};
    }).filter(entry=>words.every(word=>entry.name.includes(word))).sort((a,b)=>b.score-a.score);
    results.replaceChildren();
    for(const {item,caption} of matches){
      const result=document.createElement('button');
      const icon=document.createElement('span');
      icon.className='wf-result-icon';
      icon.setAttribute('aria-hidden','true');
      icon.innerHTML=item.children[0].innerHTML;
      result.append(icon,document.createTextNode(caption));
      result.onclick=()=>{closeSearch(false);expanded=item.parentElement;layout();item.onclick.call(item);};
      results.append(result);
    }
    if(!matches.length)results.textContent=empty.textContent;
  }
  function closeSearch(focus=true){
    if(dialog.hidden)return;
    dialog.hidden=true;
    searchField.hidden=true;
    drawer.classList.remove('wf-searching');
    toggle.setAttribute('aria-expanded','false');
    nav.scrollTop=scrollPosition;
    if(focus)toggle.focus({preventScroll:true});
  }
  toggle.onclick=()=>{
    if(!dialog.hidden){closeSearch();return;}
    if(isRail())window.wfToggleDesktopSidebar();
    scrollPosition=nav.scrollTop;
    search.value='';
    renderResults();
    searchField.hidden=false;
    dialog.hidden=false;
    drawer.classList.add('wf-searching');
    toggle.setAttribute('aria-expanded','true');
    search.focus();
  };
  clearSearch.onclick=()=>{
    if(search.value.trim()){
      search.value='';
      renderResults();
      search.focus();
    }else closeSearch();
  };
  dialog.querySelector('[data-dialog-close]').onclick=()=>closeSearch();
  drawer.addEventListener('keydown',event=>{
    if(!dialog.hidden&&event.key==='Escape'){event.preventDefault();event.stopPropagation();closeSearch();}
  });
  new MutationObserver(()=>{if(!dialog.hidden&&(drawer.inert||drawer.classList.contains('wf-icon-rail')))closeSearch(false);}).observe(drawer,{attributes:true,attributeFilter:['inert','class']});
  search.oninput=renderResults;
  search.onkeydown=e=>{if(e.key==='Enter')results.querySelector('button')?.click();if(e.key==='ArrowDown'){e.preventDefault();results.querySelector('button')?.focus();}};
  results.addEventListener('keydown',event=>{
    const current=event.target.closest('button');
    if(!current)return;
    const next=event.key==='ArrowDown'?current.nextElementSibling:event.key==='ArrowUp'?(current.previousElementSibling||search):null;
    if(next){event.preventDefault();next.focus();}
  });
  document.getElementById('wfDevCredit').onclick=()=>document.getElementById('wfDevDialog').showModal();
  document.querySelectorAll('.wf-nav-dialog').forEach(modal=>{
    modal.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();event.stopPropagation();modal.close();}});
    modal.querySelector('[data-dialog-close]').onclick=()=>modal.close();
    modal.onclick=e=>{if(e.target===modal){const r=modal.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)modal.close();}};
  });
})();


/* WF dashboard six-link command deck, page identity and context-aware Home. */
(() => {
  const dashboard=document.getElementById('page-dashboard');
  const sales=dashboard?.querySelector('.wf-dash-sales');
  const metrics=dashboard?.querySelector('.stats-grid');
  const root=document.documentElement;
  if(sales&&metrics){
    const total=sales.querySelector(':scope > div:not(.stats-grid)');
    const symbol=sales.querySelector(':scope > .stat-icon');
    if(total&&symbol){
      const header=document.createElement('div');
      header.className='wf-sales-summary';
      header.append(symbol,total);
      sales.prepend(header);
    }
    sales.append(metrics);
    sales.classList.add('wf-sales-command-card');
    metrics.classList.add('wf-sales-six-actions');
    const icons={
      'select-client-type':'<circle cx="9" cy="8" r="4"/><path d="M3 21v-2a6 6 0 0 1 12 0v2M20 8v8m-4-4h8"/>',
      'add-product':'<path d="m12 2 9 5-9 5-9-5 9-5ZM3 7v10l9 5 9-5V7M12 12v10M18 11v6m-3-3h6"/>',
      'select-invoice-type':'<path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9zM13 2v7h7M12 13v6m-3-3h6"/>'
    };
    const actions=[
      {page:'select-client-type',label:{ar:'إضافة عميل',tr:'Müşteri ekle',en:'Add client',fr:'Ajouter client',ru:'Добавить клиента'}},
      {page:'add-product',label:{ar:'إضافة منتج',tr:'Ürün ekle',en:'Add product',fr:'Ajouter produit',ru:'Добавить товар'}},
      {page:'select-invoice-type',label:{ar:'إنشاء فاتورة',tr:'Fatura oluştur',en:'Create invoice',fr:'Créer facture',ru:'Создать счёт'}}
    ];
    for(const action of actions){
      const button=document.createElement('button');
      button.type='button';button.className='stat-card wf-sales-action';
      const icon=document.createElement('span');icon.className='stat-icon wf-sales-action-icon';icon.setAttribute('aria-hidden','true');
      icon.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+icons[action.page]+'</svg>';
      const label=document.createElement('span');label.className='wf-sales-action-label';
      button.append(icon,label);
      button.addEventListener('click',()=>window.showPage(action.page));
      action.button=button;action.text=label;
      metrics.append(button);
    }
    const translateActions=()=>{
      const lang=root.lang||'ar';
      for(const action of actions){
        const label=action.label[lang]||action.label.en;
        action.text.textContent=label;action.button.title=label;action.button.setAttribute('aria-label',label);
      }
    };
    translateActions();
    new MutationObserver(translateActions).observe(root,{attributes:true,attributeFilter:['lang']});
  }

  const main=document.getElementById('mainContent');
  const wordmark=document.querySelector('.navbar .wf-nav-wordmark');
  const position=document.createElement('span');
  position.className='wf-page-position';
  position.setAttribute('aria-live','polite');
  function updatePosition(){
    if(!main)return;
    const pages=[...main.querySelectorAll('.page[id^="page-"]')];
    const active=pages.find(page=>page.classList.contains('active'));
    if(!active)return;
    const number=pages.indexOf(active)+1;
    const lang=root.lang||'ar';
    const link=[...document.querySelectorAll('#sidebar .nav-item')].find(button=>button.getAttribute('onclick')?.includes("'"+active.id.slice(5)+"'"));
    const local=link?.querySelector('[data-i18n],[data-wf-ui]')?.textContent?.trim();
    const heading=active.querySelector('.sct-sticky-title,.co-toolbar-title,.page-toolbar-title');
    const headingText=heading?.querySelector('h1,h2')?.textContent?.trim() ||
      [...(heading?.childNodes||[])].filter(node=>node!==position).map(node=>node.textContent||'').join(' ').trim();
    const title=local || headingText ||
      ({dashboard:{ar:'الرئيسية',en:'Home',tr:'Ana sayfa',fr:'Accueil',ru:'Главная'},cashboxes:{ar:'صناديق العملات',en:'Currency boxes',tr:'Para kasaları',fr:'Caisses',ru:'Кассы'}}[active.id.slice(5)]?.[lang]) || active.id.slice(5).replaceAll('-',' ');
    const format=new Intl.NumberFormat(({ar:'ar-SY',tr:'tr-TR',fr:'fr-FR',ru:'ru-RU'}[lang]||'en-US'),{useGrouping:false});
    position.textContent=title+' · '+format.format(number)+' / '+format.format(pages.length);
    position.title=position.textContent;
    if(active===dashboard&&wordmark){
      wordmark.append(position);
    }else if(heading){
      heading.append(position);
    }else{
      active.prepend(position);
    }
  }

  const home=document.getElementById('bnav-2');
  const topIcon=document.getElementById('bnavCircleIcon');
  const arrow='<svg data-wf-home-up="true" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20V4m-7 7 7-7 7 7"/></svg>';
  function syncHome(){
    const onHome=dashboard?.classList.contains('active');
    const scrolled=!!onHome&&(window.scrollY>110 || main?.scrollTop>110);
    if(onHome&&topIcon){
      const arrowShowing=!!topIcon.querySelector('[data-wf-home-up]');
      if(scrolled&&!arrowShowing)topIcon.innerHTML=arrow;
      else if(!scrolled&&arrowShowing){
        const svg=home?.querySelector('.bnav-icon svg');
        if(svg)topIcon.replaceChildren(svg.cloneNode(true));
        else topIcon.textContent='🏠';
      }
    }
    if(home){
      const label=scrolled?
        ({ar:'الصعود للأعلى',en:'Scroll to top',tr:'Yukarı çık',fr:'Retour en haut',ru:'Наверх'}[root.lang]||'Scroll to top'):
        ({ar:'الرئيسية',en:'Home',tr:'Ana sayfa',fr:'Accueil',ru:'Главная'}[root.lang]||'Home');
      home.setAttribute('aria-label',label);home.title=label;
    }
    root.classList.toggle('wf-home-scroll-top',scrolled);
  }
  home?.addEventListener('click',event=>{
    if(!dashboard?.classList.contains('active') || !(window.scrollY>30 || main?.scrollTop>30))return;
    event.preventDefault();event.stopImmediatePropagation();
    const behavior=matchMedia('(prefers-reduced-motion:reduce)').matches||root.dataset.wfMotion==='reduced'?'instant':'smooth';
    window.scrollTo({top:0,behavior});if(main?.scrollTop)main.scrollTo({top:0,behavior});
  },true);
  window.addEventListener('scroll',syncHome,{passive:true});
  main?.addEventListener('scroll',syncHome,{passive:true});
  window.addEventListener('resize',syncHome,{passive:true});
  new MutationObserver(()=>{updatePosition();syncHome()}).observe(root,{attributes:true,attributeFilter:['lang']});
  const before=window.showPage;
  if(typeof before==='function')window.showPage=function(...args){
    const ret=before.apply(this,args);updatePosition();syncHome();return ret;
  };
  updatePosition();syncHome();

  // Repeated mobile notifications should never pile up or interrupt every visit.
  const originalToast=window.showToast;
  if(typeof originalToast==='function'){
    const shown=new Map();
    window.showToast=function(message,type){
      if(matchMedia('(max-width:1024px)').matches){
        const key=String(type||'ok')+'|'+String(message);
        const now=Date.now(),prev=shown.get(key)||0;
        if(now-prev<5*60*1000)return;
        shown.set(key,now);
        if(shown.size>60)for(const [k,t] of shown)if(now-t>5*60*1000)shown.delete(k);
        // Remove stale duplicates that may still be on-screen.
        const box=document.getElementById('toastBox');
        box?.querySelectorAll('.toast').forEach(el=>{
          if(el.querySelector('[data-wf-toast-copy]')?.getAttribute('data-wf-toast-copy')===String(message))el.remove();
        });
      }
      return originalToast.apply(this,arguments);
    };
  }
})();
