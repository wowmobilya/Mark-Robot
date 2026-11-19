/* Contextual list filters: relocate existing controls, never duplicate data or handlers. */
(()=>{'use strict';
 const root=document.documentElement;
 const definitions=[['companies','coStatsBar','coTabFilter'],['products','prStatsBar','prTabFilter'],['invoices','invStatsBar','invTabFilter']];
 const entries=definitions.map(([page,id,key])=>{const bar=document.getElementById(id),section=document.getElementById('page-'+page);if(!bar||!section)return null;const anchor=document.createComment('context-filter-home');bar.before(anchor);return {page,bar,section,anchor,key};}).filter(Boolean);
 if(!entries.length)return;
 const compactDock=matchMedia('(max-width:1024px)');
 const dock=document.createElement('nav');dock.id='wfContextNav';dock.hidden=true;
 const home=document.createElement('button');home.type='button';home.className='wf-context-home';home.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="m3 10 9-7 9 7v11h-6v-7H9v7H3Z"/></svg>';home.onclick=()=>window.showPage('dashboard');dock.append(home);document.body.append(dock);
 let current=null,queued=false;
 function sync(){queued=false;const next=compactDock.matches?null:(entries.find(item=>item.section.classList.contains('active'))||null);
  if(current!==next){if(current)current.anchor.after(current.bar);current=next;if(current)dock.append(current.bar);}
  dock.hidden=!current;root.classList.toggle('wf-context-nav-open',!!current);
  const lang=root.lang||'ar',labels={ar:['تصنيفات القسم','الرئيسية'],en:['Section filters','Home'],tr:['Bölüm filtreleri','Ana sayfa'],fr:['Filtres de section','Accueil'],ru:['Фильтры раздела','Главная']}[lang]||['Section filters','Home'];
  dock.setAttribute('aria-label',labels[0]);home.setAttribute('aria-label',labels[1]);home.title=labels[1];
  if(!current)return;
  const state=typeof S==='object'?S:{};
  current.bar.querySelectorAll('.co-stat-pill').forEach(pill=>{const value=pill.getAttribute('onclick')?.match(/'([^']+)'/)?.[1];const selected=value===(state[current.key]||'all');pill.classList.toggle('active',selected);pill.setAttribute('aria-pressed',String(selected));});
 }
 function schedule(){if(!queued){queued=true;requestAnimationFrame(sync);}}
 for(const item of entries){
  for(const pill of item.bar.querySelectorAll('.co-stat-pill')){pill.setAttribute('role','button');pill.tabIndex=0;pill.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();pill.click();}});pill.addEventListener('click',schedule);}
  new MutationObserver(schedule).observe(item.section,{attributes:true,attributeFilter:['class']});
 }
 new MutationObserver(schedule).observe(root,{attributes:true,attributeFilter:['lang','dir']});
 compactDock.addEventListener('change',schedule);
 sync();
})();

// On task screens, forward the dock action to the screen's own validated button.
(() => {
  const nav=document.getElementById('bottomNav');
  if (!nav) return;
  const pages=Array.from(document.querySelectorAll('.page'));
  const selectors={
    'add-company':'#coSaveBtn',
    'add-product':'button[onclick="savePr()"]',
    'create-invoice':'button[onclick="saveInvoice()"]',
    'payment-management':'button[onclick="addPaymentToInv()"]',
    exchange:'.curr-refresh',
    reports:'.sct-back-btn',
    'select-client-type':'.sct-back-btn',
    'select-invoice-type':'.sct-back-btn'
  };
  const button=document.createElement('button');
  button.type='button';
  button.className='wf-task-action';
  const icon=document.createElement('span'), label=document.createElement('span');
  icon.setAttribute('aria-hidden','true');
  button.append(icon,label);
  nav.append(button);
  let target;
  const observer=new MutationObserver(updateLabel);
  function updateLabel(){
    if (!target) return;
    const words=target.innerText.trim() || target.getAttribute('aria-label') || target.title;
    label.textContent=words;
    button.disabled=target.disabled || !target.getClientRects().length;
  }
  function sync(){
    const page=pages.find(item=>item.classList.contains('active'));
    const key=page?.id.slice(5);
    observer.disconnect();
    target=selectors[key] && page.querySelector(selectors[key]);
    // Browsing pages always retain the five-button dock; task forms keep their
    // validated primary action and Settings keeps its existing Save behavior.
    const mode=key==='settings'?'settings':target?'action':'main';
    nav.dataset.taskMode=mode;
    const mapped=['dashboard','companies','products','invoices','quick-barcode',
      'select-client-type','add-company','add-product','select-invoice-type',
      'create-invoice','payment-management'];
    const secondary=mode==='main'&&!mapped.includes(key);
    nav.classList.toggle('wf-nav-secondary',secondary);
    if(secondary)nav.querySelectorAll('.bnav-btn').forEach(tab=>{
      tab.classList.remove('bnav-active');
      tab.removeAttribute('aria-current');
    });
    button.hidden=!target;
    if (!target) return;
    const svg=target.querySelector('svg');
    icon.replaceChildren();
    if(svg) icon.append(svg.cloneNode(true));
    else icon.textContent=key==='exchange'?'↻':key==='payment-management'?'+':key==='reports'||key.startsWith('select-')?'‹':'✓';
    updateLabel();
    observer.observe(target,{attributes:true,childList:true,subtree:true,characterData:true});
  }
  button.addEventListener('click',()=>{if(target && !target.disabled && target.getClientRects().length)target.click();});
  const pageObserver=new MutationObserver(sync);
  pages.forEach(page=>pageObserver.observe(page,{attributes:true,attributeFilter:['class']}));
  sync();
})();
