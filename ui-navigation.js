/* Keep dashboard controls steady and show reading progress while scrolling. */
(()=>{'use strict';
 const root=document.documentElement;
 const compact=matchMedia('(max-width:1024px)');
 let queued=false;
 function syncScroll(){const dashboard=document.querySelector('#page-dashboard.active');const distance=Math.max(0,document.documentElement.scrollHeight-innerHeight);const y=Math.max(0,scrollY);root.classList.toggle('wf-dashboard-scrolled',!!dashboard&&y>24);root.style.setProperty('--wf-scroll-progress',dashboard&&distance?`${Math.min(100,y/distance*100)}%`:'0%');root.classList.remove('wf-header-hidden');}
 function reveal(){const page=document.querySelector('.page.active');root.classList.toggle('wf-section-mode',!!page&&page.id!=='page-dashboard');syncScroll();syncControls();}
 const menuSvg='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16"/></svg>';
 const foldSvg='<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="3"/><path d="M9 4v16m7-12-4 4 4 4"/></svg>';
 function syncControls(){
  const brand=document.getElementById('wfSidebarBrand');
  if(brand&&!document.getElementById('wfSidebarClose')){const close=document.createElement('button');close.id='wfSidebarClose';close.type='button';close.setAttribute('aria-controls','sidebar');close.onclick=()=>window.wfToggleDesktopSidebar();document.body.append(close);}
  const page=document.querySelector('.page.active');
  const toolbar=page?.querySelector('.co-toolbar-row,.sct-sticky-header,.page-toolbar-row');
  if(toolbar&&!toolbar.querySelector('.wf-section-menu')){const button=document.createElement('button');button.type='button';button.className='wf-section-menu';button.setAttribute('aria-controls','sidebar');button.onclick=()=>window.wfToggleDesktopSidebar();const target=page.id==='page-settings'?toolbar.firstElementChild:toolbar;target.append(button);}
  const open=compact.matches?document.getElementById('sidebar')?.classList.contains('open'):!root.classList.contains('wf-sidebar-collapsed');
  const handle=document.getElementById('wfSidebarClose');if(handle)handle.hidden=!open;
  const lang=root.lang||'ar';const copy={ar:['فتح القائمة','طيّ القائمة'],tr:['Menüyü aç','Menüyü kapat'],en:['Open sidebar','Close sidebar'],fr:['Ouvrir le menu','Fermer le menu'],ru:['Открыть меню','Закрыть меню']}[lang]||['Open sidebar','Close sidebar'];
  document.querySelectorAll('#desktopSidebarToggle,.wf-section-menu,#wfSidebarClose').forEach(button=>{if(button.dataset.open!==String(open)){button.innerHTML=open?foldSvg:menuSvg;button.dataset.open=String(open);}button.setAttribute('aria-expanded',String(open));button.setAttribute('aria-label',copy[open?1:0]);button.title=copy[open?1:0];});
 }
 function update(){
  queued=false;
  syncScroll();
 }
 addEventListener('scroll',()=>{if(!queued){queued=true;requestAnimationFrame(update);}},{passive:true});
 compact.addEventListener('change',reveal);
 document.addEventListener('focusin',reveal);
 const original=window.showPage;
 if(typeof original==='function')window.showPage=function(...args){root.classList.toggle('wf-section-mode',args[0]!=='dashboard');root.classList.remove('wf-header-hidden');const value=original.apply(this,args);reveal();return value;};
 const sidebar=document.getElementById('sidebar');if(sidebar)new MutationObserver(()=>{const open=compact.matches&&sidebar.classList.contains('open');root.classList.toggle('wf-mobile-menu-open',open);syncControls();if(open)reveal();}).observe(sidebar,{attributes:true,attributeFilter:['class']});
 new MutationObserver(syncControls).observe(root,{attributes:true,attributeFilter:['class','dir','lang']});
 const quotes=document.getElementById('currBar');
 function decorateQuotes(){quotes?.querySelectorAll('.wf-market-trend').forEach(tag=>{if(tag.querySelector('.wf-market-arrow'))return;const match=tag.textContent.match(/([▲▼])\s*$/);if(!match)return;const value=tag.textContent.slice(0,match.index).trim();const arrow=document.createElement('span');arrow.className='wf-market-arrow';arrow.setAttribute('aria-hidden','true');arrow.textContent=match[1];tag.replaceChildren(document.createTextNode(value+' '),arrow);});}
 if(quotes){new MutationObserver(decorateQuotes).observe(quotes,{childList:true,subtree:true});decorateQuotes();}
 reveal();
})();
