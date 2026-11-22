/* Adapt only the logo surround; preserve the uploaded artwork and its proportions. */
(()=>{'use strict';
 const cache=new Map();
 function adapt(img){
  const host=img.closest('#wfSidebarBrand,#settingsLogoPrev');if(!host||!img.complete||!img.naturalWidth)return;
  const source=img.currentSrc||img.src;
  if(cache.has(source)){paint(host,cache.get(source));return;}
  try{
   const canvas=document.createElement('canvas');canvas.width=canvas.height=24;
   const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(img,0,0,24,24);
   const pixels=ctx.getImageData(0,0,24,24).data;let r=0,g=0,b=0,n=0;
   for(let y=0;y<24;y++)for(let x=0;x<24;x++){if(x>2&&x<21&&y>2&&y<21)continue;const i=(y*24+x)*4;if(pixels[i+3]<220)continue;r+=pixels[i];g+=pixels[i+1];b+=pixels[i+2];n++;}
   const color=n?[Math.round(r/n),Math.round(g/n),Math.round(b/n)]:[255,255,255];
   cache.set(source,color);paint(host,color);
  }catch(_){paint(host,[255,255,255]);}
 }
 function paint(host,rgb){host.style.setProperty('--logo-surface',`rgb(${rgb.join(',')})`);host.classList.add('wf-adaptive-logo');if(host.id==='wfSidebarBrand')document.documentElement.style.setProperty('--wf-logo-tint',host.style.getPropertyValue('--logo-surface'));}
 function refresh(){document.querySelectorAll('#wfSidebarLogo,#settingsLogoPrev img').forEach(adapt);}
 document.addEventListener('load',event=>{if(event.target.matches?.('#wfSidebarLogo,#settingsLogoPrev img'))adapt(event.target);},true);
 const preview=document.getElementById('settingsLogoPrev');if(preview)new MutationObserver(refresh).observe(preview,{childList:true,subtree:true});
 refresh();
})();
