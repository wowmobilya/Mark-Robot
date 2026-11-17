/* Scroll-aware chrome keeps section actions accessible on compact screens. */
(()=>{'use strict';
 const root=document.documentElement;
 const compact=matchMedia('(max-width:1024px)');
 let last=scrollY,travel=0,direction=0,queued=false;
 function reveal(){root.classList.remove('wf-header-hidden');const page=document.querySelector('.page.active');root.classList.toggle('wf-section-mode',!!page&&page.id!=='page-dashboard');travel=0;last=scrollY;}
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
 if(typeof original==='function')window.showPage=function(...args){reveal();const value=original.apply(this,args);reveal();return value;};
 const sidebar=document.getElementById('sidebar');if(sidebar)new MutationObserver(()=>{if(sidebar.classList.contains('open'))reveal();}).observe(sidebar,{attributes:true,attributeFilter:['class']});
 reveal();
})();
