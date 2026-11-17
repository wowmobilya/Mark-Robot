/* Header presentation only: preserve all original navigation handlers. */
(function(){
 const nav=document.querySelector('.navbar');if(!nav)return;
 nav.querySelector('.wf-topbar-title')?.remove();
 const settings={ar:'الإعدادات',en:'Settings',tr:'Ayarlar',fr:'Paramètres',ru:'Настройки'};
 function sync(){const lang=document.documentElement.lang||'ar';const b=document.getElementById('headerSettingsBtn');if(b){b.setAttribute('aria-label',settings[lang]||settings.en);b.title=settings[lang]||settings.en;}}
 new MutationObserver(sync).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});sync();
})();

/* A real open-edge recess, not a translucent ring around the control. */
(()=>{
 const selector='.navbar,.page .co-page-sticky,.page .sct-sticky-header,.page .page-sticky-bar';
 let frame;
 const sizes=new ResizeObserver(schedule);
 function schedule(){cancelAnimationFrame(frame);frame=requestAnimationFrame(draw);}
 function draw(){
  document.querySelectorAll(selector).forEach(header=>{
   if(!header.getClientRects().length)return;
   let surface=header.querySelector(':scope > .wf-header-surface');
   if(!surface){surface=document.createElement('span');surface.className='wf-header-surface';surface.setAttribute('aria-hidden','true');header.prepend(surface);header.classList.add('wf-notched-header');sizes.observe(header);}
   const box=header.getBoundingClientRect();
   const controls=[...header.querySelectorAll('#desktopSidebarToggle,#headerSettingsBtn,#themeBtn,.sct-back-btn')].filter(b=>b.getClientRects().length);
   const holes=controls.map(b=>{const r=b.getBoundingClientRect();return `<circle cx="${r.left-box.left+r.width/2}" cy="${box.height-9}" r="32" fill="black"/>`;}).join('');
   const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${box.width}" height="${box.height}"><defs><mask id="notches"><rect width="100%" height="100%" fill="white"/>${holes}</mask></defs><rect width="100%" height="100%" rx="18" fill="white" mask="url(#notches)"/></svg>`;
   surface.style.maskImage=surface.style.webkitMaskImage=`url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
  });
 }
 new MutationObserver(schedule).observe(document.documentElement,{attributes:true,attributeFilter:['class','dir'],subtree:true});
 addEventListener('resize',schedule);schedule();
})();
