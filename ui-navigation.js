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
  // Section headers keep their existing back action, not a second sidebar toggle.
  document.querySelectorAll('.wf-section-menu').forEach(button=>button.remove());
  syncBackButtons();
  const open=compact.matches?document.getElementById('sidebar')?.classList.contains('open'):!root.classList.contains('wf-sidebar-collapsed');
  const handle=document.getElementById('wfSidebarClose');if(handle)handle.hidden=!open;
  const lang=root.lang||'ar';const copy={ar:['فتح القائمة','طيّ القائمة'],tr:['Menüyü aç','Menüyü kapat'],en:['Open sidebar','Close sidebar'],fr:['Ouvrir le menu','Fermer le menu'],ru:['Открыть меню','Закрыть меню']}[lang]||['Open sidebar','Close sidebar'];
  document.querySelectorAll('#desktopSidebarToggle,#wfSidebarClose').forEach(button=>{if(button.dataset.open!==String(open)){button.innerHTML=open?foldSvg:menuSvg;button.dataset.open=String(open);}button.setAttribute('aria-expanded',String(open));button.setAttribute('aria-label',copy[open?1:0]);button.title=copy[open?1:0];});
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
 compact.addEventListener('change',reveal);
 document.addEventListener('focusin',reveal);
 const original=window.showPage;
 if(typeof original==='function')window.showPage=function(...args){root.classList.toggle('wf-section-mode',args[0]!=='dashboard');root.classList.remove('wf-header-hidden');const value=original.apply(this,args);reveal();return value;};
 const sidebar=document.getElementById('sidebar');if(sidebar)new MutationObserver(()=>{const open=compact.matches&&sidebar.classList.contains('open');root.classList.toggle('wf-mobile-menu-open',open);syncControls();if(open)reveal();}).observe(sidebar,{attributes:true,attributeFilter:['class']});
 new MutationObserver(syncControls).observe(root,{attributes:true,attributeFilter:['class','dir','lang']});
 const quotes=document.getElementById('currBar');
 function decorateQuotes(){quotes?.querySelectorAll('.wf-market-trend').forEach(tag=>{if(tag.querySelector('.wf-market-arrow'))return;const match=tag.textContent.match(/([▲▼])\s*$/);if(!match)return;const value=tag.textContent.slice(0,match.index).trim();const arrow=document.createElement('span');arrow.className='wf-market-arrow';arrow.setAttribute('aria-hidden','true');arrow.textContent=match[1];tag.replaceChildren(document.createTextNode(value+' '),arrow);});}
 if(quotes){new MutationObserver(decorateQuotes).observe(quotes,{childList:true,subtree:true});decorateQuotes();}
 function fitDrawerRecess(){
  const drawer=document.getElementById('sidebar'),handle=document.getElementById('wfSidebarClose');if(!drawer||!handle||handle.hidden)return;
  const box=drawer.getBoundingClientRect(),height=handle.getBoundingClientRect().height+12,width=box.width,rtl=root.dir!=='ltr';
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${box.height}"><defs><mask id="cut"><rect width="100%" height="100%" fill="white"/><rect x="${rtl?-24:width-24}" y="${(box.height-height)/2}" width="48" height="${height}" rx="24" fill="black"/></mask></defs><rect width="100%" height="100%" fill="white" mask="url(#cut)"/></svg>`;
  const mask=`url("data:image/svg+xml,${encodeURIComponent(svg)}")`;drawer.style.setProperty('mask-image',mask,'important');drawer.style.setProperty('-webkit-mask-image',mask,'important');drawer.style.setProperty('mask-size','100% 100%','important');handle.style.top=(box.top+box.height/2)+'px';
 }
 reveal();
 const drawerSize=new ResizeObserver(fitDrawerRecess);if(sidebar)drawerSize.observe(sidebar);const edgeHandle=document.getElementById('wfSidebarClose');if(edgeHandle)drawerSize.observe(edgeHandle);
 new MutationObserver(fitDrawerRecess).observe(root,{attributes:true,attributeFilter:['dir','class']});
 fitDrawerRecess();
})();
