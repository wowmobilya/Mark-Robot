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
  sidebar.inert=!open;
  const handle=document.getElementById('wfSidebarClose');
  if(handle)handle.hidden=!open;
  sidebar.querySelectorAll('.nav-item').forEach(button=>{
   if(button.classList.contains('active'))button.setAttribute('aria-current','page');
   else button.removeAttribute('aria-current');
  });
  const lang=root.lang||'ar';const copy={ar:['فتح القائمة','طيّ القائمة'],tr:['Menüyü aç','Menüyü kapat'],en:['Open sidebar','Close sidebar'],fr:['Ouvrir le menu','Fermer le menu'],ru:['Открыть меню','Закрыть меню']}[lang]||['Open sidebar','Close sidebar'];
  document.querySelectorAll('#desktopSidebarToggle,#wfSidebarClose,.wf-section-menu').forEach(button=>{if(button.dataset.open!==String(open)){button.innerHTML=open?foldSvg:menuSvg;button.dataset.open=String(open);}button.setAttribute('aria-expanded',String(open));button.setAttribute('aria-label',copy[open?1:0]);button.title=copy[open?1:0];});
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
 compact.addEventListener('change',()=>{window.closeSidebar();reveal();});
 document.addEventListener('keydown',event=>{
  if(!compact.matches||!sidebar.classList.contains('open'))return;
  if(event.key==='Escape'){
   event.preventDefault();
   window.closeSidebar();
   return;
  }
  if(event.key!=='Tab')return;
  const buttons=sidebar.querySelectorAll('button');
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
