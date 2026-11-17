/* Keep the moving bottom-nav circle inside the measured viewport after hidden states. */
(()=>{'use strict';
 const nav=document.getElementById('bottomNav'),circle=document.getElementById('bnavCircle');
 if(!nav||!circle||typeof window.bnavMoveToIndex!=='function')return;
 const original=window.bnavMoveToIndex;let target=2,frame=0;
 function fit(){
  frame=0;const rect=nav.getBoundingClientRect();if(rect.width<1||getComputedStyle(nav).display==='none')return;
  original.call(window,target);
  const button=document.getElementById('bnav-'+target),br=button?.getBoundingClientRect();
  const half=(circle.offsetWidth||48)/2;
  const raw=br?br.left-rect.left+br.width/2:rect.width/2;
  const center=Math.max(half+4,Math.min(rect.width-half-4,raw));
  nav.style.setProperty('--nav-x',center+'px');circle.style.left=(center-half)+'px';circle.style.right='auto';
 }
 function schedule(){if(!frame)frame=requestAnimationFrame(fit);}
 window.bnavMoveToIndex=function(index){target=index;schedule();};
 new ResizeObserver(schedule).observe(nav);
 new MutationObserver(schedule).observe(document.documentElement,{attributes:true,attributeFilter:['class','dir']});
 window.addEventListener('resize',schedule,{passive:true});
 window.visualViewport?.addEventListener('resize',schedule,{passive:true});
 const active=nav.querySelector('.bnav-active');if(active)target=Number(active.id.replace('bnav-',''))||0;
 schedule();
})();
