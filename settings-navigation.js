/* Inline settings sections and a bottom save action; existing data handlers stay intact. */
(()=>{'use strict';
 const page=document.getElementById('page-settings'),workspace=page?.querySelector('.wf-settings-workspace'),tabs=workspace?.querySelector('.tabs');
 if(!page||!workspace||!tabs||page.classList.contains('wf-settings-inline-ready'))return;
 const buttons=[...tabs.querySelectorAll('.tab-btn')];
 const entries=buttons.map(button=>({button,key:button.getAttribute('onclick')?.match(/switchTab\('([^']+)'\)/)?.[1]})).filter(entry=>entry.key);
 if(!entries.length||typeof window.switchTab!=='function')return;
 page.querySelector('.wf-settings-picker')?.remove();page.classList.remove('wf-settings-picker-ready');
 const save=page.querySelector('button[onclick="saveSettings()"]');
 if(save){
  const footer=document.createElement('div');footer.className='wf-settings-save-footer';footer.id='wf-settings-save-footer';
  footer.append(save);document.body.append(footer);
 }
 const original=window.switchTab;
 window.switchTab=function(key){
  const result=original.apply(this,arguments);
  const panel=document.getElementById('stab-'+key);
  if(panel&&!window.matchMedia('(prefers-reduced-motion: reduce)').matches){
   panel.classList.remove('wf-settings-panel-enter');void panel.offsetWidth;panel.classList.add('wf-settings-panel-enter');
  }
  return result;
 };
 // A class follows actual page visibility, including browser Back/Forward navigation.
 function syncPage(){document.documentElement.classList.toggle('wf-settings-open',page.classList.contains('active'));}
 new MutationObserver(syncPage).observe(page,{attributes:true,attributeFilter:['class']});
 page.classList.add('wf-settings-inline-ready');syncPage();
})();
