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
  // Keep the original save button and localized label, replacing only its pictogram.
  save.querySelectorAll('.wf-ui-icon').forEach(icon=>icon.remove());
  Array.from(save.childNodes).filter(node=>node.nodeType===3).forEach(node=>{node.nodeValue=node.nodeValue.replace(/💾/g,'');});
  const symbol=document.createElement('span');symbol.className='wf-settings-save-symbol';symbol.setAttribute('aria-hidden','true');
  symbol.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 3h12l4 4v14H3V3h2Z"/><path d="M7 3v6h10V3M7 21v-8h10v8"/></svg>';
  save.prepend(symbol);
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

(() => {
 const root = document.documentElement;
 const theme = document.getElementById('wfThemePreference');
 const drawer = document.getElementById('wfSidebarPreference');

 function bindPreference(id, datasetKey, storageKey) {
  const field = document.getElementById(id);
  const values = Array.from(field.options, option => option.value);
  function apply(value) {
   const choice = values.includes(value) ? value : 'auto';
   field.value = choice;
   root.dataset[datasetKey] = choice;
  }
  try { apply(localStorage.getItem(storageKey)); } catch (_) { apply('auto'); }
  field.addEventListener('change', () => {
   apply(field.value);
   try { localStorage.setItem(storageKey, field.value); } catch (_) {}
  });
 }
 bindPreference('wfDensityPreference', 'wfDensity', 'wf_display_density');
 bindPreference('wfMotionPreference', 'wfMotion', 'wf_motion_preference');

 function sync() {
  theme.value = root.dataset.theme === 'dark' ? 'dark' : 'light';
  drawer.value = root.classList.contains('wf-sidebar-collapsed') ? 'closed' : 'open';
 }
 theme.addEventListener('change', () => {
  if (theme.value !== root.dataset.theme) window.toggleTheme();
 });
 drawer.addEventListener('change', () => window.wfSetSidebarCollapsed(drawer.value === 'closed'));
 new MutationObserver(sync).observe(root, {attributes:true, attributeFilter:['data-theme','class']});
 sync();
})();
