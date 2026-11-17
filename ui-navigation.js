/* Scroll-aware chrome keeps section actions accessible on compact screens. */
(()=>{'use strict';
 const root=document.documentElement;
 const compact=matchMedia('(max-width:1024px)');
 let last=scrollY,travel=0,direction=0,queued=false;
 function reveal(){root.classList.remove('wf-header-hidden');const page=document.querySelector('.page.active');root.classList.toggle('wf-section-mode',!!page&&page.id!=='page-dashboard');travel=0;last=scrollY;syncControls();}
 const menuSvg='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16"/></svg>';
 const foldSvg='<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="3"/><path d="M9 4v16m7-12-4 4 4 4"/></svg>';
 function syncControls(){
  const page=document.querySelector('.page.active');
  const toolbar=page?.querySelector('.co-toolbar-row,.sct-sticky-header,.page-toolbar-row');
  if(toolbar&&!toolbar.querySelector('.wf-section-menu')){const button=document.createElement('button');button.type='button';button.className='wf-section-menu';button.setAttribute('aria-controls','sidebar');button.onclick=()=>window.wfToggleDesktopSidebar();const target=page.id==='page-settings'?toolbar.firstElementChild:toolbar;target.append(button);}
  const open=compact.matches?document.getElementById('sidebar')?.classList.contains('open'):!root.classList.contains('wf-sidebar-collapsed');
  const lang=root.lang||'ar';const copy={ar:['فتح القائمة','طيّ القائمة'],tr:['Menüyü aç','Menüyü kapat'],en:['Open sidebar','Close sidebar'],fr:['Ouvrir le menu','Fermer le menu'],ru:['Открыть меню','Закрыть меню']}[lang]||['Open sidebar','Close sidebar'];
  document.querySelectorAll('#desktopSidebarToggle,.wf-section-menu').forEach(button=>{if(button.dataset.open!==String(open)){button.innerHTML=open?foldSvg:menuSvg;button.dataset.open=String(open);}button.setAttribute('aria-expanded',String(open));button.setAttribute('aria-label',copy[open?1:0]);button.title=copy[open?1:0];});
 }
 function update(){
  queued=false;
  const page=document.querySelector('.page.active');
  const locked=root.classList.contains('wf-section-mode')||!compact.matches||page?.id==='page-quick-barcode'||document.querySelector('.modal-ov.open,.sidebar.open,.delete-modal-ov.open,.wf-restore-ov.open');
  const current=Math.max(0,scrollY),delta=current-last;last=current;
  if(locked||current<90){reveal();return;}
  if(Math.abs(delta)<2)return;
  const next=delta>0?1:-1;if(next!==direction){travel=0;direction=next;}
  travel+=Math.abs(delta);
  if(travel>(next>0?48:16)){root.classList.toggle('wf-header-hidden',next>0);travel=0;}
 }
 addEventListener('scroll',()=>{if(!queued){queued=true;requestAnimationFrame(update);}},{passive:true});
 compact.addEventListener('change',reveal);
 document.addEventListener('focusin',reveal);
 const original=window.showPage;
 if(typeof original==='function')window.showPage=function(...args){root.classList.toggle('wf-section-mode',args[0]!=='dashboard');root.classList.remove('wf-header-hidden');const value=original.apply(this,args);reveal();return value;};
 const sidebar=document.getElementById('sidebar');if(sidebar)new MutationObserver(()=>{syncControls();if(sidebar.classList.contains('open'))reveal();}).observe(sidebar,{attributes:true,attributeFilter:['class']});
 new MutationObserver(syncControls).observe(root,{attributes:true,attributeFilter:['class','dir','lang']});
 reveal();
})();
