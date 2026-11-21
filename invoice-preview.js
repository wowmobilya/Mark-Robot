/* Screen-only invoice fitting. The paper markup remains owned by the exporter. */
(() => {
  'use strict';
  function fitLayout(available, width, height, mode = 'fit') {
    if (![available, width, height].every(Number.isFinite) || available <= 0 || width <= 0 || height < 0) return null;
    const scale = mode === 'fit' ? Math.min(1, available / width) : Math.min(2, Math.max(.1, Number(mode) || 1));
    return {scale, width:mode === 'fit' ? Math.min(available, width * scale) : width * scale, height:height * scale};
  }
  function createPreparationQueue({read, build, apply, onError = () => {}}) {
    let running = null, pending = false;
    async function drain() {
      do {
        pending = false;
        const snapshot = read(); if (!snapshot) continue;
        let result;
        try {
          result = await build(snapshot);
          if (read()?.key === snapshot.key) await apply(result, snapshot);
        } catch (error) { if (read()?.key === snapshot.key) onError(error); }
        finally { result?.dispose?.(); }
      } while (pending);
    }
    function prepare() {
      pending = true;
      if (!running) running = drain().finally(() => {
        running = null;
        // A request can arrive after drain has finished but before this
        // promise settles (for example while reopening an empty preview).
        if (pending) return prepare();
      });
      return running;
    }
    return {prepare};
  }
  const copy = {
    ar:{fit:'ملاءمة الشاشة',actual:'حجم كامل',in:'تكبير',out:'تصغير',language:'لغة الفاتورة',print:'طباعة',share:'مشاركة',settings:'الخيارات',close:'إغلاق',pages:'صفحات',note:'ملاحظة Excel',preparing:'جارٍ ترتيب الصفحات…',failed:'تعذّر ترتيب الصفحات الآن. يمكنك إعادة فتح المعاينة.'},
    en:{fit:'Fit width',actual:'Actual size',in:'Zoom in',out:'Zoom out',language:'Invoice language',print:'Print',share:'Share',settings:'Options',close:'Close',pages:'Pages',note:'Excel note',preparing:'Arranging pages…',failed:'Pages could not be arranged. Reopen the preview to retry.'},
    tr:{fit:'Ekrana sığdır',actual:'Gerçek boyut',in:'Yakınlaştır',out:'Uzaklaştır',language:'Fatura dili',print:'Yazdır',share:'Paylaş',settings:'Seçenekler',close:'Kapat',pages:'Sayfa',note:'Excel notu',preparing:'Sayfalar düzenleniyor…',failed:'Sayfalar düzenlenemedi. Önizlemeyi yeniden açın.'},
    fr:{fit:'Ajuster',actual:'Taille réelle',in:'Agrandir',out:'Réduire',language:'Langue de facture',print:'Imprimer',share:'Partager',settings:'Options',close:'Fermer',pages:'Pages',note:'Note Excel',preparing:'Mise en page…',failed:'Mise en page indisponible. Rouvrez l’aperçu.'},
    ru:{fit:'По ширине',actual:'Полный размер',in:'Увеличить',out:'Уменьшить',language:'Язык счёта',print:'Печать',share:'Отправить',settings:'Параметры',close:'Закрыть',pages:'Страниц',note:'О файле Excel',preparing:'Подготовка страниц…',failed:'Не удалось подготовить страницы. Откройте просмотр снова.'}
  };
  function mount(document, window) {
    const modal = document.getElementById('pdfModal'), wrap = document.getElementById('invoicePaperWrap');
    if (!modal || !wrap || window.WFInvoicePreview) return window.WFInvoicePreview || null;
    const panel = modal.querySelector('.modal'), bar = modal.querySelector('.pdf-bar'), viewport = wrap.parentElement;
    if (!panel || !bar || !viewport) return null;
    const lang = () => copy[document.documentElement.lang] || copy.en;
    const make = (tag, name, text) => {const el=document.createElement(tag);el.className=name;if(text!==undefined)el.textContent=text;return el;};
    const paths = {
      fit:'<path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5M8 8h8v8H8z"/>',
      in:'<path d="M12 5v14M5 12h14"/>',out:'<path d="M5 12h14"/>',
      print:'<path d="M6 9V3h12v6M6 18H3V9h18v9h-3M6 14h12v7H6zM17 12h1"/>',
      share:'<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m9 10 6-4M9 14l6 4"/>',
      settings:'<path d="M4 6h16M4 12h16M4 18h16M8 3v6m8 0v6M9 15v6"/>',close:'<path d="m6 6 12 12M6 18 18 6"/>',
      invoice:'<path d="M14 3H5v18h14V8ZM14 3v5h5M8 12h8m-8 4h8"/>'
    };
    function glyph(name) {const el=make('span','wf-preview-glyph');el.setAttribute('aria-hidden','true');el.innerHTML='<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">'+paths[name]+'</svg>';return el;}
    const localized=[];
    function label(el,key,visible=true,icon) {
      el.type='button';
      const caption=make('span','',lang()[key]);if(icon)el.replaceChildren(glyph(icon),...(visible?[caption]:[]));
      else if(visible)el.replaceChildren(caption);
      localized.push({el,key,caption:visible?caption:null});
      return el;
    }
    function button(key,visible,icon,action) {const el=label(make('button','wf-preview-control'),key,visible,icon);el.addEventListener('click',action);return el;}
    modal.classList.add('wf-invoice-preview');
    modal.setAttribute('role','dialog');modal.setAttribute('aria-modal','true');
    const title=bar.querySelector('.wf15-preview-title-main');
    if(title){title.id='wfInvoicePreviewTitle';modal.setAttribute('aria-labelledby',title.id);}
    const badge=bar.querySelector('.wf15-preview-title-badge');if(badge)badge.replaceChildren(glyph('invoice'));
    viewport.classList.add('wf-invoice-preview-viewport');viewport.tabIndex=0;
    viewport.setAttribute('role','region');viewport.setAttribute('aria-labelledby','wfInvoicePreviewTitle');
    const originalActions=bar.querySelector('.wf15-preview-actions');
    const close=originalActions?.querySelector('.close');if(close){label(close,'close',false,'close');bar.append(close);}
    const language=bar.querySelector('#wf14PreviewLangControl');
    const languageToggle=make('button','wf-preview-language-toggle');languageToggle.id='wfInvoicePreviewLanguage';languageToggle.type='button';
    languageToggle.setAttribute('aria-controls','wf14PreviewLangControl');languageToggle.setAttribute('aria-expanded','false');
    if(language){language.hidden=true;bar.append(languageToggle,language);}
    languageToggle.addEventListener('click',()=>{language.hidden=!language.hidden;languageToggle.setAttribute('aria-expanded',String(!language.hidden));});
    const toolbar=make('div','wf-invoice-preview-toolbar');
    let mode='fit',scale=1,queued=false,wasOpen=false,observedPaper=null,prepareTimer=null,layoutError=false;
    const fit=button('fit',true,'fit',()=>changeZoom('fit'));
    const minus=button('out',false,'out',()=>changeZoom(Math.max(.1,scale-.15)));
    const plus=button('in',false,'in',()=>changeZoom(Math.min(2,scale+.15)));
    const percent=make('output','wf-preview-percent');percent.setAttribute('aria-live','polite');
    const actual=button('actual',true,null,()=>changeZoom(1));actual.textContent='100%';localized.at(-1).caption=null;
    toolbar.append(fit,minus,percent,plus,actual);bar.after(toolbar);
    const footer=make('div','wf-invoice-preview-footer');
    if(originalActions){
      originalActions.classList.add('wf-invoice-preview-actions');
      const print=originalActions.querySelector('[onclick="printInvoice()"]');
      const share=originalActions.querySelector('[onclick="openUnifiedShareModal(event)"]');
      const settings=originalActions.querySelector('[onclick^="openPrintOptionsModal"]');
      if(print){label(print,'print',true,'print');print.className='btn btn-p wf-preview-primary';originalActions.prepend(print);}
      if(share){label(share,'share',true,'share');share.className='btn btn-s';originalActions.append(share);}
      if(settings){label(settings,'settings',true,'settings');settings.className='btn btn-s';originalActions.append(settings);}
      footer.append(originalActions);
    }
    const metadata=make('div','wf-invoice-preview-metadata');
    const pageCount=make('span','wf-preview-page-count');
    const status=make('span','wf-preview-status');status.setAttribute('role','status');status.hidden=true;
    metadata.append(pageCount,status);
    const hint=panel.querySelector('[data-i18n="excel_hint"]');
    if(hint){const note=make('details','wf-preview-export-note'),summary=make('summary','',lang().note);localized.push({el:summary,key:'note',caption:summary});note.append(summary,hint);metadata.append(note);}
    footer.append(metadata);panel.append(footer);
    const open=()=>modal.classList.contains('open');
    function translate(){
      const words=lang();
      for(const item of localized){item.el.setAttribute('aria-label',words[item.key]);item.el.title=words[item.key];if(item.caption&&item.caption.textContent!==words[item.key])item.caption.textContent=words[item.key];}
      const selected=document.getElementById('pdfLangSel')?.value||'en';
      const flags={ar:'🇸🇾',tr:'🇹🇷',en:'🇬🇧',fr:'🇫🇷',ru:'🇷🇺'};
      languageToggle.textContent=(flags[selected]||'🌐')+' '+selected.toUpperCase();
      languageToggle.title=words.language;languageToggle.setAttribute('aria-label',words.language+' · '+selected.toUpperCase());
      for(const control of language?.querySelectorAll('[data-pvlang]')||[]){control.setAttribute('role','radio');control.setAttribute('aria-checked',String(control.dataset.pvlang===selected));}
    }
    function changeZoom(next){mode=next;viewport.scrollTop=0;viewport.scrollLeft=0;schedule();}
    const paperResize=window.ResizeObserver?new window.ResizeObserver(()=>schedule()):null;
    function refresh(){
      queued=false;if(!open())return;
      const paper=wrap.firstElementChild;if(!paper)return;
      if(observedPaper!==paper){paperResize?.disconnect();observedPaper=paper;paperResize?.observe(paper);}
      // Read all dimensions before writing scale; never mutate the exported child.
      const css=window.getComputedStyle(viewport);
      const available=viewport.clientWidth-(parseFloat(css.paddingLeft)||0)-(parseFloat(css.paddingRight)||0)-1;
      const box=fitLayout(available,794,Math.max(paper.offsetHeight,paper.scrollHeight),mode);if(!box)return;
      scale=box.scale;
      for(const [name,value] of [['--wf-invoice-preview-scale',String(scale)],['--wf-invoice-preview-width',box.width+'px'],['--wf-invoice-preview-height',box.height+'px']])if(wrap.style.getPropertyValue(name)!==value)wrap.style.setProperty(name,value);
      if(wrap.dataset.zoom!==(mode==='fit'?'fit':'manual'))wrap.dataset.zoom=mode==='fit'?'fit':'manual';
      percent.textContent=Math.round(scale*100)+'%';fit.setAttribute('aria-pressed',String(mode==='fit'));
      actual.setAttribute('aria-pressed',String(mode===1));minus.disabled=scale<=.1;plus.disabled=scale>=2;
      const pages=paper.querySelectorAll('.wf-pdf-page').length;
      pageCount.textContent=pages?lang().pages+' · '+pages:'';translate();
    }
    function schedule(){if(queued||!open())return;queued=true;window.requestAnimationFrame(refresh);}
    const preparation=createPreparationQueue({
      read(){
        if(!open()||!wrap.firstElementChild||wrap.firstElementChild.hasAttribute('data-wf-canonical'))return null;
        const inv=typeof _lastPreviewInv!=='undefined'?_lastPreviewInv:null;
        if(!inv||typeof window.wfBuildPageSet!=='function')return null;
        const html=wrap.innerHTML;
        return {key:html,html,invNo:inv.invNo||'invoice',language:document.getElementById('pdfLangSel')?.value||'en'};
      },
      async build(snapshot){layoutError=false;status.hidden=false;status.textContent=lang().preparing;return window.wfBuildPageSet(snapshot.html,snapshot.invNo,snapshot.language);},
      apply(result){
        if(!document.getElementById('wf-pdf-layout-css')&&typeof WF_PDF_BASE_CSS==='string'){
          const style=document.createElement('style');style.id='wf-pdf-layout-css';style.textContent=WF_PDF_BASE_CSS.slice(WF_PDF_BASE_CSS.indexOf('  .wf-pdf-page'));document.head.append(style);
        }
        const version=typeof WF_PDF_VERSION==='string'?WF_PDF_VERSION:'preview';
        wrap.innerHTML='<div data-wf-canonical="'+version+'" style="width:794px;max-width:none;margin:0 auto;background:#fff;">'+result.pages.map(page=>page.outerHTML).join('')+'</div>';
        status.hidden=true;schedule();
      },
      onError(){layoutError=true;status.hidden=false;status.textContent=lang().failed;}
    });
    function prepare(){
      schedule();window.clearTimeout(prepareTimer);layoutError=false;status.hidden=true;
      if(!open())return;
      prepareTimer=window.setTimeout(()=>preparation.prepare().finally(()=>{if(!layoutError)status.hidden=true;}),100);
    }
    new window.MutationObserver(()=>{translate();schedule();}).observe(wrap,{childList:true});
    new window.MutationObserver(()=>{
      const current=open();
      if(current&&!wasOpen){mode='fit';viewport.scrollTop=0;viewport.scrollLeft=0;if(language)language.hidden=true;languageToggle.setAttribute('aria-expanded','false');prepare();}
      if(!current){window.clearTimeout(prepareTimer);paperResize?.disconnect();observedPaper=null;}
      wasOpen=current;schedule();
    }).observe(modal,{attributes:true,attributeFilter:['class']});
    new window.MutationObserver(()=>{translate();schedule();}).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
    if(window.ResizeObserver)new window.ResizeObserver(schedule).observe(viewport);
    else window.addEventListener('resize',schedule,{passive:true});
    const api={refresh:schedule,prepare};window.WFInvoicePreview=api;translate();if(open()){wasOpen=true;prepare();}return api;
  }
  if(typeof module!=='undefined'&&module.exports){module.exports={fitLayout,createPreparationQueue,mount};return;}
  if(typeof window!=='undefined'&&typeof document!=='undefined')mount(document,window);
})();
