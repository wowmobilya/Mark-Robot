/* Compact mobile navigation over the existing settings panels. No data writes. */
(()=>{'use strict';
 const page=document.getElementById('page-settings'),workspace=page?.querySelector('.wf-settings-workspace'),tabs=workspace?.querySelector('.tabs');
 if(!page||!workspace||!tabs||page.classList.contains('wf-settings-picker-ready'))return;
 const buttons=[...tabs.querySelectorAll('.tab-btn')];
 const entries=buttons.map(button=>({button,key:button.getAttribute('onclick')?.match(/switchTab\('([^']+)'\)/)?.[1]})).filter(entry=>entry.key);
 if(!entries.length||typeof window.switchTab!=='function')return;
 const picker=document.createElement('div');picker.className='wf-settings-picker';
 const icon=document.createElement('span');icon.className='wf-settings-picker-icon';icon.setAttribute('aria-hidden','true');icon.textContent='☷';
 const select=document.createElement('select');select.id='wf-settings-section-picker';
 const title=page.querySelector('.sct-sticky-title');if(title&&!title.id)title.id='wf-settings-heading';
 if(title)select.setAttribute('aria-labelledby',title.id);else select.setAttribute('aria-label','Settings');
 picker.append(icon,select);workspace.prepend(picker);
 function sync(){
  const active=entries.find(entry=>entry.button.classList.contains('active'))||entries[0];
  const signature=entries.map(entry=>entry.key+':'+entry.button.textContent.trim()).join('|');
  if(select.dataset.labels!==signature){
   select.replaceChildren(...entries.map(entry=>{const option=document.createElement('option');option.value=entry.key;option.textContent=entry.button.textContent.trim();return option;}));
   select.dataset.labels=signature;
  }
  select.value=active.key;select.setAttribute('aria-controls','stab-'+active.key);
 }
 const original=window.switchTab;
 window.switchTab=function(key){
  const result=original.apply(this,arguments);sync();
  const panel=document.getElementById('stab-'+key);
  if(panel&&!window.matchMedia('(prefers-reduced-motion: reduce)').matches){
   panel.classList.remove('wf-settings-panel-enter');void panel.offsetWidth;panel.classList.add('wf-settings-panel-enter');
  }
  return result;
 };
 select.addEventListener('change',()=>window.switchTab(select.value));
 new MutationObserver(sync).observe(tabs,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['class']});
 sync();page.classList.add('wf-settings-picker-ready');
})();
