/* The visible report uses the exact committed snapshot and speech offsets. */
(() => {
  'use strict';
  function segmentsFor(snapshot) {
    const narration=typeof snapshot?.narration==='string'?snapshot.narration:'';
    const segments=Array.isArray(snapshot?.narrationSegments)?snapshot.narrationSegments:[];
    let cursor=0;
    const exact=segments.length&&segments.every(s=>{
      if(!s||typeof s.text!=='string'||!Number.isInteger(s.start)||!Number.isInteger(s.end)||s.start<cursor||s.end<=s.start||s.end>narration.length||narration.slice(s.start,s.end)!==s.text||narration.slice(cursor,s.start).trim())return false;
      cursor=s.end;return true;
    })&&!narration.slice(cursor).trim();
    if(exact)return segments;
    return narration?[{text:narration,start:0,end:narration.length}]:[];
  }
  function segmentAt(segments,index) {
    if(!Number.isFinite(index)||index<0)return -1;
    return segments.findIndex((s,i)=>index>=s.start&&(index<s.end||i===segments.length-1&&index===s.end));
  }
  function sheetGeometry({width,height,offsetLeft=0,offsetTop=0,anchorBottom,mainLeft=offsetLeft,mainRight=offsetLeft+width}) {
    const viewportRight=offsetLeft+width,viewportBottom=offsetTop+height;
    const desiredTop=Math.max(offsetTop+8,Number.isFinite(anchorBottom)?anchorBottom+10:offsetTop+92);
    // Keep the robot fully above the report whenever that leaves a usable body.
    // Short landscape windows fall back to a compact sheet with reachable controls.
    const minimum=Math.min(280,Math.max(0,height-16));
    const top=Math.max(offsetTop+8,Math.min(desiredTop,viewportBottom-minimum-8));
    const start=Math.max(offsetLeft+8,Math.min(mainLeft+12,viewportRight-268));
    const end=Math.min(viewportRight-8,Math.max(start+260,mainRight-12));
    const available=Math.max(0,Math.min(viewportRight-8-start,end-start));
    const sheetWidth=Math.min(1100,available);
    return {top:Math.round(top),left:Math.round(start+(available-sheetWidth)/2),width:Math.round(sheetWidth),height:Math.max(0,Math.floor(viewportBottom-top-8)),compact:top<desiredTop-1};
  }
  if(typeof module==='object'&&module.exports){module.exports={segmentsFor,segmentAt,sheetGeometry};return;}
  const copy={
    ar:{title:'تقرير اليوم',date:'تاريخ التقرير',written:'التقرير المكتوب',close:'إغلاق التقرير',stop:'إيقاف القراءة',replay:'إعادة القراءة',follow:'متابعة القراءة تلقائيًا',manual:'التمرير بيدك · متابعة القراءة',ready:'التقرير جاهز',preparing:'جارٍ تجهيز القراءة…',speaking:'الروبوت يقرأ التقرير',finished:'اكتملت القراءة',stopped:'توقفت القراءة',unavailable:'التقرير ظاهر. فعّل صوت اللغة من إعدادات الروبوت لسماعه.',failed:'تعذّر تشغيل الصوت. يمكنك قراءة التقرير أو المحاولة مجددًا.',empty:'بيانات التقرير غير مكتملة الآن.',today:'حركة اليوم',balances:'الديون والأرصدة',activity:'الفواتير والعملاء',cash:'الصناديق والملاحظات'},
    en:{title:'Today’s report',date:'Report date',written:'Written report',close:'Close report',stop:'Stop reading',replay:'Read again',follow:'Follow the reading',manual:'Manual scrolling · Follow reading',ready:'Report ready',preparing:'Preparing the reading…',speaking:'The robot is reading',finished:'Reading complete',stopped:'Reading stopped',unavailable:'Your report is visible. Enable a language voice in Robot settings to hear it.',failed:'Audio could not start. Read the report or try again.',empty:'Report data is incomplete right now.',today:'Today’s activity',balances:'Debts and balances',activity:'Invoices and clients',cash:'Cashboxes and notes'},
    tr:{title:'Bugünün raporu',date:'Rapor tarihi',written:'Yazılı rapor',close:'Raporu kapat',stop:'Okumayı durdur',replay:'Yeniden oku',follow:'Okumayı takip et',manual:'Elle kaydırma · Okumayı takip et',ready:'Rapor hazır',preparing:'Okuma hazırlanıyor…',speaking:'Robot raporu okuyor',finished:'Okuma tamamlandı',stopped:'Okuma durduruldu',unavailable:'Rapor görünür. Dinlemek için Robot ayarlarında dil sesini etkinleştirin.',failed:'Ses başlatılamadı. Raporu okuyabilir veya tekrar deneyebilirsiniz.',empty:'Rapor verileri şu anda eksik.',today:'Bugünün hareketleri',balances:'Borçlar ve bakiyeler',activity:'Faturalar ve müşteriler',cash:'Kasalar ve notlar'},
    fr:{title:'Rapport du jour',date:'Date du rapport',written:'Rapport écrit',close:'Fermer le rapport',stop:'Arrêter la lecture',replay:'Relire',follow:'Suivre la lecture',manual:'Défilement manuel · Suivre la lecture',ready:'Rapport prêt',preparing:'Préparation de la lecture…',speaking:'Le robot lit le rapport',finished:'Lecture terminée',stopped:'Lecture arrêtée',unavailable:'Le rapport est affiché. Activez une voix dans les réglages du robot pour l’écouter.',failed:'Le son n’a pas démarré. Lisez le rapport ou réessayez.',empty:'Les données du rapport sont incomplètes.',today:'Activité du jour',balances:'Créances et soldes',activity:'Factures et clients',cash:'Caisses et notes'},
    ru:{title:'Отчёт за сегодня',date:'Дата отчёта',written:'Текст отчёта',close:'Закрыть отчёт',stop:'Остановить чтение',replay:'Прочитать снова',follow:'Следовать за чтением',manual:'Ручная прокрутка · Следовать за чтением',ready:'Отчёт готов',preparing:'Подготовка чтения…',speaking:'Робот читает отчёт',finished:'Чтение завершено',stopped:'Чтение остановлено',unavailable:'Отчёт показан. Включите голос языка в настройках робота, чтобы прослушать его.',failed:'Не удалось включить звук. Прочитайте отчёт или повторите попытку.',empty:'Данные отчёта пока неполны.',today:'Операции за день',balances:'Долги и остатки',activity:'Счета и клиенты',cash:'Кассы и примечания'}
  };
  const paths={report:'<path d="M6 3h9l4 4v14H5V3h1Zm8 0v5h5M8 12h8M8 16h6"/>',today:'<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M7 3v4m10-4v4M3 11h18m-13 5 3 2 5-4"/>',balances:'<path d="M3 7h17v13H3zM3 7V5l14-2v4m0 5h4v4h-4z"/>',activity:'<rect x="4" y="3" width="16" height="18" rx="3"/><path d="m8 9 2 2 5-5M8 15h8m-8 3h5"/>',cash:'<path d="M3 7h18v14H3zM3 7l3-4h12l3 4M8 12h8m-4-3v9"/>',close:'<path d="m6 6 12 12M18 6 6 18"/>',play:'<path d="m8 5 11 7-11 7z"/>',stop:'<rect x="5" y="5" width="14" height="14" rx="2"/>',follow:'<path d="M12 3v14m-5-5 5 5 5-5M4 20h16"/>'};
  const node=(tag,className,text)=>{const n=document.createElement(tag);if(className)n.className=className;if(text!=null)n.textContent=text;return n;};
  function icon(name){const n=node('span','wf-report-symbol');n.setAttribute('aria-hidden','true');n.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">'+(paths[name]||paths.report)+'</svg>';return n;}
  const shade=node('div','wf-robot-report-shade');shade.hidden=true;
  const sheet=node('section','wf-robot-report-sheet');sheet.id='wfRobotReportSheet';sheet.hidden=true;sheet.setAttribute('role','dialog');sheet.setAttribute('aria-modal','false');sheet.setAttribute('aria-labelledby','wfRobotReportTitle');sheet.tabIndex=-1;
  const head=node('header','wf-report-header'),titleWrap=node('div','wf-report-title-wrap'),title=node('h2','',copy.ar.title),date=node('small');title.id='wfRobotReportTitle';titleWrap.append(title,date);
  const close=node('button','wf-report-close');close.type='button';close.append(icon('close'));
  head.append(icon('report'),titleWrap,close);
  const status=node('p','wf-report-status');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
  const progress=node('div','wf-report-progress');progress.setAttribute('aria-hidden','true');progress.append(node('span'));
  const body=node('div','wf-report-body');body.tabIndex=0;
  const footer=node('footer','wf-report-footer'),play=node('button','wf-report-play'),playText=node('span'),follow=node('button','wf-report-follow'),followText=node('span');play.type=follow.type='button';play.append(icon('play'),playText);follow.append(icon('follow'),followText);footer.append(play,follow);
  sheet.append(head,status,progress,body,footer);document.body.append(shade,sheet);
  let locale='ar',segments=[],paragraphs=[],active=-1,following=true,speechState='ready',returnFocus=null,closing=0,frame=0,snapshot=null,pendingPlayback={state:'ready'};
  const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches||document.documentElement.dataset.wfMotion==='reduced';
  const control=action=>window.dispatchEvent(new CustomEvent('wf-robot-report-control',{detail:{action}}));
  function labels(){return copy[locale]||copy.en;}
  function setState(state,reason){
    speechState=state;const L=labels();sheet.dataset.playback=state;
    status.textContent=reason||L[state]||L.ready;
    const speaking=state==='preparing'||state==='speaking';
    playText.textContent=speaking?L.stop:L.replay;play.firstElementChild.replaceWith(icon(speaking?'stop':'play'));
    play.disabled=!segments.length;followText.textContent=following?L.follow:L.manual;follow.setAttribute('aria-pressed',String(following));
    if(state==='finished')progress.firstElementChild.style.width='100%';
  }
  function place(){
    frame=0;if(sheet.hidden)return;
    const viewport=window.visualViewport, width=viewport?.width||innerWidth,height=viewport?.height||innerHeight;
    const anchor=document.querySelector('#wfGreetingRobot')?.getBoundingClientRect();
    const main=document.querySelector('#mainContent')?.getBoundingClientRect();
    const geometry=sheetGeometry({width,height,offsetLeft:viewport?.offsetLeft||0,offsetTop:viewport?.offsetTop||0,anchorBottom:anchor?.height?anchor.bottom:undefined,mainLeft:main?.left,mainRight:main?.right});
    sheet.style.setProperty('--wf-report-top',geometry.top+'px');sheet.style.setProperty('--wf-report-height',geometry.height+'px');shade.style.top=geometry.top+'px';
    sheet.style.left=geometry.left+'px';sheet.style.width=geometry.width+'px';sheet.dataset.compact=String(geometry.compact);
  }
  function schedulePlace(){if(!frame)frame=requestAnimationFrame(place);}
  function open(detail){
    if(!detail?.snapshot)return;
    clearTimeout(closing);sheet.classList.remove('is-closing');
    const wasHidden=sheet.hidden;snapshot=detail.snapshot;locale=copy[detail.locale]?detail.locale:'en';segments=segmentsFor(snapshot);paragraphs=[];active=-1;following=true;
    const L=labels();sheet.lang=locale;sheet.dir=locale==='ar'?'rtl':'ltr';title.textContent=L.title;close.setAttribute('aria-label',L.close);close.title=L.close;body.setAttribute('aria-label',L.written);
    try{date.textContent=L.date+' · '+new Intl.DateTimeFormat(locale,{dateStyle:'long',timeZone:'UTC'}).format(new Date(snapshot.date+'T12:00:00Z'));}catch(_){date.textContent=snapshot.date||'';}
    body.replaceChildren();
    if(!segments.length){const warning=node('p','wf-report-empty',snapshot.unavailableReason||L.empty);body.append(warning);}
    else {
      const groups=segments.length<11?[['written',0,Infinity]]:[['today',0,4],['balances',4,6],['activity',6,9],['cash',9,Infinity]];
      for(const [name,start,end] of groups){
        if(start>=segments.length)continue;
        const group=node('section','wf-report-group');group.dataset.tone=name;
        const heading=node('h3');heading.append(icon(name),node('span','',L[name]));group.append(heading);
        for(let i=start;i<Math.min(end,segments.length);i++){
          const p=node('p','wf-report-sentence',segments[i].text);p.dataset.segment=String(i);paragraphs[i]=p;group.append(p);
        }
        body.append(group);
      }
    }
    progress.firstElementChild.style.width='0%';
    if(wasHidden)returnFocus=document.activeElement;
    shade.hidden=sheet.hidden=false;document.documentElement.classList.add('wf-robot-report-open');
    body.scrollTop=0;place();setState(pendingPlayback.state||'ready',pendingPlayback.reason);
    if(wasHidden)close.focus({preventScroll:true});
    window.dispatchEvent(new CustomEvent('wf-robot-report-visibility',{detail:{open:true}}));
  }
  function dismiss(stop=true){
    if(sheet.hidden)return;if(stop)control('stop');
    sheet.classList.add('is-closing');document.documentElement.classList.remove('wf-robot-report-open');
    window.dispatchEvent(new CustomEvent('wf-robot-report-visibility',{detail:{open:false}}));
    clearTimeout(closing);closing=setTimeout(()=>{sheet.hidden=shade.hidden=true;sheet.classList.remove('is-closing');if(returnFocus?.isConnected)returnFocus.focus({preventScroll:true});},reduced()?0:160);
  }
  function followActive(){
    const paragraph=paragraphs[active];if(!paragraph||!following)return;
    const r=paragraph.getBoundingClientRect(),b=body.getBoundingClientRect();
    if(r.top<b.top+16||r.bottom>b.bottom-16)body.scrollTo({top:body.scrollTop+r.top-b.top-20,behavior:reduced()?'auto':'smooth'});
  }
  function boundary(detail){
    if(sheet.hidden||!snapshot)return;
    const index=Number(detail?.charIndex),found=segmentAt(segments,index);if(found<0)return;
    if(found!==active){paragraphs[active]?.classList.remove('is-reading');paragraphs[active]?.removeAttribute('aria-current');active=found;paragraphs[active].classList.add('is-reading');paragraphs[active].setAttribute('aria-current','true');followActive();}
    progress.firstElementChild.style.width=Math.min(100,Math.max(0,index/Math.max(1,snapshot.narration.length)*100))+'%';
  }
  function manual(event){if(event.isTrusted){if(following)body.scrollTo({top:body.scrollTop,behavior:'instant'});following=false;followText.textContent=labels().manual;follow.setAttribute('aria-pressed','false');}}
  body.addEventListener('wheel',manual,{passive:true});body.addEventListener('touchstart',manual,{passive:true});body.addEventListener('pointerdown',manual);
  body.addEventListener('keydown',event=>{if(['ArrowDown','ArrowUp','PageDown','PageUp','Home','End',' '].includes(event.key))manual(event);});
  follow.addEventListener('click',()=>{following=true;followText.textContent=labels().follow;follow.setAttribute('aria-pressed','true');followActive();});
  play.addEventListener('click',()=>control(['preparing','speaking'].includes(speechState)?'stop':'replay'));
  close.addEventListener('click',()=>dismiss());shade.addEventListener('click',()=>dismiss());
  document.addEventListener('keydown',event=>{
    if(sheet.hidden||sheet.classList.contains('is-closing'))return;
    if(event.key==='Escape'){event.preventDefault();dismiss();return;}
    if(event.key!=='Tab'||document.querySelector('dialog[open]'))return;
    // The robot and header above this modeless sheet remain usable. Covered
    // dashboard controls must not receive invisible keyboard focus beneath it.
    const edge=sheet.getBoundingClientRect().top;
    const available=[...document.querySelectorAll('button,a[href],input,select,textarea,[tabindex]')].filter(element=>{
      if(element.disabled||element.tabIndex<0||element.closest('[inert],[hidden]'))return false;
      const rect=element.getBoundingClientRect();if(!rect.width||!rect.height||getComputedStyle(element).visibility==='hidden')return false;
      return sheet.contains(element)||rect.top>=(window.visualViewport?.offsetTop||0)&&rect.bottom<=edge;
    });
    if(!available.length)return;
    const index=available.indexOf(document.activeElement);
    const next=index<0?available.indexOf(close):(index+(event.shiftKey?-1:1)+available.length)%available.length;
    event.preventDefault();(available[next]||close).focus({preventScroll:true});
  });
  window.addEventListener('wf-robot-report-open',event=>open(event.detail));
  window.addEventListener('wf-robot-report-playback',event=>{pendingPlayback={state:event.detail?.state||'ready',reason:event.detail?.reason};if(!sheet.hidden)setState(pendingPlayback.state,pendingPlayback.reason);});
  window.addEventListener('wf-robot-report-boundary',event=>boundary(event.detail));
  window.addEventListener('resize',schedulePlace,{passive:true});window.visualViewport?.addEventListener('resize',schedulePlace,{passive:true});
  window.visualViewport?.addEventListener('scroll',schedulePlace,{passive:true});
  window.addEventListener('pagehide',()=>dismiss());
  const dashboard=document.querySelector('#page-dashboard');
  if(dashboard)new MutationObserver(()=>{if(!sheet.hidden&&!dashboard.classList.contains('active'))dismiss();}).observe(dashboard,{attributes:true,attributeFilter:['class']});
  const robot=document.querySelector('#wfGreetingRobot');
  if(robot)new MutationObserver(()=>{if(!sheet.hidden&&(robot.inert||robot.getAttribute('aria-hidden')==='true'))dismiss();}).observe(robot,{attributes:true,attributeFilter:['inert','aria-hidden']});
  new MutationObserver(()=>{if(!sheet.hidden&&document.documentElement.lang!==locale)dismiss();}).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
})();
