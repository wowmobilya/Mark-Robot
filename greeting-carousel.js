(() => {
  const card = document.querySelector('.wf-greeting-flip');
  if (!card) return;
  const dashboard = card.closest('.page');
  const track = card.querySelector('.wf-greeting-faces');
  const faces = [...track.children];
  const labels = ['greetingSub', 'tipLabel tipText', 'wfWeatherTitle', 'wfGreetingLogoTitle'];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const weatherTitle = document.getElementById('wfWeatherTitle');
  const weatherStatus = document.getElementById('wfWeatherStatus');
  const temperature = document.getElementById('wfWeatherTemp');
  const week = document.getElementById('wfWeatherDays');
  const logoTitle = document.getElementById('wfGreetingLogoTitle');
  const logoTarget = document.getElementById('wfGreetingLogoImage');
  const navLogo = document.getElementById('navLogo');
  const words = {
    ar: ['إينغول، بورصة', 'المطر خلال ٧ أيام', 'جارٍ تحديث الطقس…', 'الطقس غير متاح الآن', 'واو موبيليا', 'مم'],
    tr: ['İnegöl, Bursa', '7 günlük yağmur', 'Hava durumu yükleniyor…', 'Hava durumu şu an alınamıyor', 'WOW Mobilya', 'mm'],
    en: ['İnegöl, Bursa', '7-day rain forecast', 'Updating weather…', 'Weather unavailable', 'WOW Furniture', 'mm'],
    fr: ['İnegöl, Bursa', 'Pluie sur 7 jours', 'Météo en cours…', 'Météo indisponible', 'WOW Furniture', 'mm'],
    ru: ['Инегёль, Бурса', 'Дождь на 7 дней', 'Загрузка погоды…', 'Погода недоступна', 'WOW Furniture', 'мм'],
  };
  const endpoint = 'https://api.open-meteo.com/v1/forecast?latitude=40.08&longitude=29.51&timezone=Europe%2FIstanbul&forecast_days=7&current=temperature_2m,weather_code,is_day&daily=rain_sum,showers_sum,weather_code';
  let timer, animation, forecast, fetched = 0, loading = false, failed = false;
  let face = 0, manual = false;

  function weatherIcon(code, daylight = true) {
    if (!Number.isFinite(code)) return '';
    if (code === 0) return daylight ? '☀️' : '🌙';
    if (code < 3) return daylight ? '🌤️' : '☁️';
    if (code === 3) return '☁️';
    if (code < 50) return '🌫️';
    if (code >= 95) return '⛈️';
    if ((code >= 70 && code < 80) || code >= 85) return '🌨️';
    return code < 60 ? '🌦️' : '🌧️';
  }

  function render() {
    const locale = document.documentElement.lang || 'ar';
    const [place, rain, pending, unavailable, brand, unit] = words[locale] || words.en;
    weatherTitle.textContent = place;
    logoTitle.textContent = brand;
    weatherStatus.textContent = forecast ? rain : failed ? unavailable : pending;
    if (!forecast) { temperature.textContent = ''; week.replaceChildren(); return; }
    const format = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 });
    const weekday = new Intl.DateTimeFormat(locale, { weekday: 'short', timeZone: 'Europe/Istanbul' });
    temperature.textContent = weatherIcon(forecast.current.weather_code, forecast.current.is_day !== 0) + ' ' + format.format(Math.round(forecast.current.temperature_2m)) + ' °C';
    const {time, rain_sum, showers_sum} = forecast.daily;
    week.replaceChildren(...time.map((date, i) => {
      const day = document.createElement('div');
      const label = document.createElement('span');
      const amount = document.createElement('strong');
      const mm = rain_sum[i] + showers_sum[i];
      label.textContent = weekday.format(new Date(date + 'T12:00:00Z'));
      amount.textContent = format.format(mm) + ' ' + unit;
      day.classList.toggle('rainy', mm > 0);
      const icon = document.createElement('span');
      icon.className = 'wf-weather-icon';
      icon.textContent = weatherIcon(forecast.daily.weather_code?.[i]);
      day.append(label, icon, amount);
      return day;
    }));
  }

  async function refreshWeather() {
    if (loading || Date.now() - fetched < 20 * 60 * 1000) return;
    loading = true;
    failed = false;
    render();
    try {
      const response = await fetch(endpoint, {signal: AbortSignal.timeout(8000)});
      if (!response.ok) throw new Error('Weather unavailable');
      const data = await response.json();
      if (!Number.isFinite(data.current?.temperature_2m) || data.daily?.time?.length !== 7 ||
          !['rain_sum', 'showers_sum'].every(key => data.daily[key]?.length === 7 && data.daily[key].every(Number.isFinite))) {
        throw new Error('Incomplete forecast');
      }
      forecast = data;
      fetched = Date.now();
    } catch (_) {
      failed = true;
    } finally {
      loading = false;
      render();
    }
  }

  function syncLogo() {
    const image = navLogo?.querySelector('img');
    logoTarget.replaceChildren(image ? image.cloneNode(false) : document.createTextNode('W'));
  }

  function showFace(index) {
    face = index;
    faces.forEach((panel, i) => panel.setAttribute('aria-hidden', String(i !== face)));
    card.setAttribute('aria-labelledby', labels[face]);
    if (face === 2) refreshWeather();
  }

  async function flip() {
    if (animation) return;
    const next = (face + 1) % faces.length;
    if (reduced.matches || document.documentElement.dataset.wfMotion === 'reduced' || !track.animate) {
      showFace(next);
      schedule();
      return;
    }
    animation = track.animate([{transform:'rotateX(0deg)'}, {transform:'rotateX(90deg)'}], {duration:220, easing:'ease-in', fill:'forwards'});
    try {
      await animation.finished;
      showFace(next);
      animation.cancel();
      animation = track.animate([{transform:'rotateX(-90deg)'}, {transform:'rotateX(0deg)'}], {duration:280, easing:'ease-out'});
      await animation.finished;
    } catch (_) {
      // Leaving the dashboard cancels the in-progress transition.
    } finally {
      animation = null;
      schedule();
    }
  }

  function schedule() {
    clearTimeout(timer);
    if (manual || document.hidden || !dashboard.classList.contains('active') || animation ||
        reduced.matches || document.documentElement.dataset.wfMotion === 'reduced' ||
        card.matches(':focus, :hover')) return;
    timer = setTimeout(flip, [8000, 14000, 14000, 8000][face]);
  }

  card.addEventListener('click', () => { manual = true; clearTimeout(timer); flip(); });
  card.addEventListener('keydown', event => {
    if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); card.click(); }
  });
  for (const name of ['focus', 'blur', 'pointerenter', 'pointerleave']) card.addEventListener(name, schedule);
  reduced.addEventListener('change', schedule);
  document.addEventListener('visibilitychange', schedule);
  new MutationObserver(() => {
    if (!dashboard.classList.contains('active')) {
      manual = false;
      animation?.cancel();
      showFace(0);
    }
    schedule();
  }).observe(dashboard, {attributes:true, attributeFilter:['class']});
  new MutationObserver(() => { render(); schedule(); }).observe(document.documentElement, {attributes:true, attributeFilter:['lang', 'data-wf-motion']});
  if (navLogo) new MutationObserver(syncLogo).observe(navLogo, {childList:true, subtree:true, attributes:true, attributeFilter:['src']});
  syncLogo();
  render();
  showFace(0);
  schedule();
})();

// Visibility choices affect the dashboard only. The exchange view reuses its rate card.
(() => {
  const dashboard=document.getElementById('page-dashboard');
  if (!dashboard) return;
  const sections=[
    ['welcome','.wf-greeting-flip'],['sales','.wf-dash-sales'],['metrics','.stats-grid'],
    ['rates','#wfDashRates'],['recent','.wf-dash-primary'],['insights','.wf-dash-secondary']
  ];
  const translations={
    ar:['تخصيص الرئيسية','البطاقة الذكية','إجمالي المبيعات','إحصاءات النشاط','أسعار الصرف','آخر الفواتير','نظرة على الأعمال'],
    tr:['Paneli düzenle','Karşılama','Toplam satış','İstatistikler','Döviz kurları','Son faturalar','İş görünümü'],
    en:['Customize dashboard','Welcome card','Total sales','Activity counts','Exchange rates','Recent invoices','Business overview'],
    fr:['Personnaliser l’accueil','Accueil','Ventes','Statistiques','Taux de change','Factures récentes','Vue d’ensemble'],
    ru:['Настроить панель','Приветствие','Продажи','Статистика','Курсы валют','Последние счета','Обзор бизнеса']
  };
  const storageKey='wf.dashboard.hiddenSections';
  let hidden=[];
  try { const saved=JSON.parse(localStorage.getItem(storageKey)); if(Array.isArray(saved)) hidden=saved; } catch {}
  const menu=document.createElement('details');
  menu.className='dash-visibility';
  const trigger=document.createElement('summary'),panel=document.createElement('div');
  const toolbar=document.createElement('div'),design=document.createElement('div'),move=document.createElement('button');
  const wordsByLanguage={
    ar:['التصميم','الملخّص','تبديل جانب اللوحة'],en:['Layout','Summary','Move panel to the other side'],
    tr:['Düzen','Özet','Paneli diğer tarafa taşı'],fr:['Disposition','Résumé','Déplacer le panneau'],
    ru:['Макет','Сводка','Переместить панель']
  };
  panel.className='dash-dock-panel';
  toolbar.className='dash-dock-toolbar';
  design.className='dash-dock-layout';
  panel.id='dashboard-customization-panel';
  trigger.setAttribute('aria-controls',panel.id);
  move.type='button';
  move.textContent='⇆';
  const heading=document.createElement('strong'),close=document.createElement('button');
  close.type='button';
  close.textContent='×';
  close.onclick=()=>{menu.open=false;trigger.focus();};
  trigger.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" aria-hidden="true"><path d="M4 7h7m5 0h4M4 17h2m5 0h9"/><circle cx="13.5" cy="7" r="2.5"/><circle cx="8.5" cy="17" r="2.5"/></svg>';
  toolbar.append(heading,move,close);
  panel.append(toolbar,design);
  menu.append(trigger,panel);
  document.body.append(menu);
  const backdrop=document.createElement('div');
  backdrop.className='wf-dashboard-dock-backdrop';backdrop.hidden=true;
  document.body.insertBefore(backdrop,menu);
  backdrop.addEventListener('pointerdown',()=>{menu.open=false;});
  menu.addEventListener('toggle',()=>{backdrop.hidden=!menu.open;});
  const positionKey='wf.dashboard.dockPosition';
  let position,drag,suppressClick=false;
  try {position=JSON.parse(localStorage.getItem(positionKey));}catch{}
  function place(){
    const width=document.documentElement.clientWidth,height=window.innerHeight;
    const edgeGap=6;
    const maxX=Math.max(0,width-trigger.offsetWidth-2*edgeGap);
    const maxY=Math.max(0,height-trigger.offsetHeight-12);
    const x=Number.isFinite(position?.x)?position.x:document.documentElement.dir==='rtl'?0:1;
    const y=Number.isFinite(position?.y)?position.y:0.52;
    menu.style.right='auto';
    menu.style.left=(edgeGap+(drag?Math.max(0,Math.min(1,x)):Number(x>=0.5))*maxX)+'px';
    menu.style.top=(6+Math.max(0,Math.min(1,y))*maxY)+'px';
    menu.dataset.side=x<0.5?'left':'right';
    panel.style.left=Math.max(6-menu.offsetLeft,Math.min(0,width-panel.offsetWidth-menu.offsetLeft-6))+'px';
    panel.style.right='auto';
    const below=height-menu.offsetTop-trigger.offsetHeight;
    const down=below>=menu.offsetTop;
    panel.style.top=down?'calc(100% + 5px)':'auto';
    panel.style.bottom=down?'auto':'calc(100% + 5px)';
    panel.style.maxHeight=Math.max(0,(down?below:menu.offsetTop)-12)+'px';
  }
  function save(){try{localStorage.setItem(positionKey,JSON.stringify(position));}catch{}}
  move.onclick=()=>{position={x:menu.dataset.side==='left'?1:0,y:position?.y??0.52};place();save();};
  trigger.addEventListener('pointerdown',e=>{
    if(e.button!==0||!e.isPrimary)return;
    suppressClick=false;
    drag={id:e.pointerId,x:e.clientX,y:e.clientY,left:menu.offsetLeft,top:menu.offsetTop};
    trigger.setPointerCapture(e.pointerId);
  });
  trigger.addEventListener('pointermove',e=>{
    if(!drag||drag.id!==e.pointerId)return;
    const dx=e.clientX-drag.x,dy=e.clientY-drag.y;
    if(!suppressClick&&Math.hypot(dx,dy)<5)return;
    suppressClick=true;
    menu.open=false;
    const fraction=(n,max)=>Math.max(0,Math.min(1,n/Math.max(1,max)));
    position={x:fraction(drag.left+dx-6,document.documentElement.clientWidth-trigger.offsetWidth-12),
      y:fraction(drag.top+dy-6,innerHeight-trigger.offsetHeight-12)};
    place();
  });
  trigger.addEventListener('lostpointercapture',()=>{if(drag&&suppressClick)save();drag=null;place();});
  trigger.addEventListener('click',e=>{if(suppressClick&&e.detail){e.preventDefault();}suppressClick=false;});
  menu.addEventListener('toggle',place);
  new ResizeObserver(place).observe(trigger);
  window.addEventListener('resize',place);
  place();
  const captions=[];
  sections.forEach(([key,selector],index)=>{
    const region=dashboard.querySelector(selector);
    if(!region)return;
    const label=document.createElement('label'),input=document.createElement('input'),caption=document.createElement('span');
    if(!region.id)region.id='dash-section-'+key;
    input.type='checkbox';input.setAttribute('aria-controls',region.id);
    input.checked=!hidden.includes(key);
    region.classList.toggle('dashboard-off',!input.checked);
    input.onchange=()=>{
      region.classList.toggle('dashboard-off',!input.checked);
      if(input.checked && !matchMedia('(prefers-reduced-motion: reduce)').matches && document.documentElement.dataset.wfMotion!=='reduced'){
        region.animate([{opacity:.45,transform:'translateY(-3px)'},{opacity:1,transform:'translateY(0)'}],{duration:170});
      }
      hidden=sections.filter(([,s])=>dashboard.querySelector(s)?.classList.contains('dashboard-off')).map(([id])=>id);
      try{localStorage.setItem(storageKey,JSON.stringify(hidden));}catch{}
    };
    captions.push([caption,index+1]);label.append(input,caption);design.append(label);
  });
  function translate(){
    const words=translations[document.documentElement.lang]||translations.ar;
    heading.textContent=words[0];
    close.setAttribute('aria-label',window.wfUiText?.('Close')||'إغلاق');
    trigger.title=words[0];trigger.setAttribute('aria-label',words[0]);
    const [,,moveLabel]=wordsByLanguage[document.documentElement.lang]||wordsByLanguage.en;

    move.title=moveLabel;
    move.setAttribute('aria-label',moveLabel);
    for(const [caption,index] of captions)caption.textContent=words[index];
  }
  menu.addEventListener('keydown',event=>{if(event.key==='Escape'){menu.open=false;trigger.focus();}});
  document.addEventListener('pointerdown',event=>{if(menu.open&&!menu.contains(event.target))menu.open=false;});
  new MutationObserver(translate).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
  translate();
})();

(() => {
  const host=document.getElementById('dashIntelligence');
  if (!host) return;
  const modes=['list','tiles','bars','ring','strip'];
  const copy={
    ar:['شكل العرض','قائمة','بطاقات','أشرطة','حلقة','شريط نسبي','أنواع أخرى'],
    en:['Display style','List','Cards','Bars','Ring','Proportions','Other types'],
    tr:['Görünüm','Liste','Kartlar','Çubuklar','Halka','Oranlar','Diğer türler'],
    fr:['Présentation','Liste','Cartes','Barres','Anneau','Proportions','Autres types'],
    ru:['Вид','Список','Карточки','Полосы','Кольцо','Доли','Другие типы']
  };
  const summaryModes=['list','tiles','spotlight','ledger','columns'];
  const summaryLabels={ar:['بطاقة بارزة','سجل','أعمدة'],en:['Spotlight','Ledger','Columns'],fr:['En vedette','Registre','Colonnes'],ru:['Акцент','Реестр','Колонки'],tr:['Vurgu','Defter','Sütunlar']};
  const summaryKey='wf.dashboard.summaryStyle';
  const names={ar:['ملخّص الأعمال','توزيع المنتجات'],en:['Business summary','Product breakdown'],tr:['İş özeti','Ürün dağılımı'],fr:['Résumé d’activité','Répartition des produits'],ru:['Сводка бизнеса','Распределение товаров']};
  let summaryMode='list';
  try{const saved=localStorage.getItem(summaryKey);if(summaryModes.includes(saved))summaryMode=saved;}catch{}
  const key='wf.dashboard.overviewStyle';
  let mode='bars';
  try{const saved=localStorage.getItem(key);if(modes.includes(saved))mode=saved;}catch{}
  const paths={
    list:'M4 6h2m4 0h10M4 12h2m4 0h10M4 18h2m4 0h10',
    tiles:'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',
    spotlight:'M3 4h18v10H3z M3 18h7m4 0h7',
    ledger:'M4 3h16v18H4z M4 9h16M4 15h16M14 9v12',
    columns:'M3 5h5v14H3z M10 5h4v14h-4z M16 5h5v14h-5z',
    bars:'M4 5h10v3H4z M4 11h16v3H4z M4 17h7v3H4z',
    ring:'M12 3a9 9 0 1 0 9 9h-9z M15 3.5v5.5h5.5a8 8 0 0 0-5.5-5.5z',
    strip:'M2 8h20v8H2z M8 8v8m7-8v8'
  };
  const backLabels={ar:'رجوع',en:'Back',tr:'Geri',fr:'Retour',ru:'Назад'};
  function setChoicesOpen(head,open){
    if(!head)return;
    const tray=head.querySelector('.view-choices');
    const trigger=head.querySelector('.view-trigger');
    if(!tray||!trigger)return;
    tray.hidden=!open;
    trigger.setAttribute('aria-expanded',String(open));
    const card=head.closest('.wf-insight-card');
    if(card){
      if(open && !card.classList.contains('wf-view-picking'))
        card.style.minHeight=Math.ceil(card.getBoundingClientRect().height)+'px';
      if(!open)card.style.removeProperty('min-height');
      card.classList.toggle('wf-view-picking',open);
    }
    if(open){
      const back=backLabels[document.documentElement.lang]||backLabels.en;
      trigger.replaceChildren(document.createTextNode('× '+back));
      trigger.setAttribute('aria-label',back);
    }
  }
  function mountChoices(head,values,labels,current,key,caption,onChoose){
    if(!head)return;
    let trigger=head.querySelector('.view-trigger');
    let tray=head.querySelector('.view-choices');
    if(!trigger){
      trigger=document.createElement('button');
      trigger.type='button';trigger.className='view-trigger';
      tray=document.createElement('div');tray.className='view-choices';tray.hidden=true;
      tray.id=key+'-choices';tray.setAttribute('role','group');
      trigger.setAttribute('aria-controls',tray.id);
      trigger.setAttribute('aria-expanded','false');
      trigger.onclick=()=>{
        const opening=tray.hidden;
        host.querySelectorAll('.wf-insight-head').forEach(other=>setChoicesOpen(other,false));
        setChoicesOpen(head,opening);
        if(!opening)draw();
      };
      head.append(trigger,tray);
      values.forEach(value=>{
        const button=document.createElement('button');button.type='button';
        button.innerHTML='<svg aria-hidden="true" viewBox="0 0 24 24"><path d="'+paths[value]+'"/></svg><b></b>';
        button.onclick=()=>{onChoose(value);try{localStorage.setItem(key,value);}catch{}setChoicesOpen(head,false);draw();trigger.focus();};
        tray.append(button);
      });
      head.addEventListener('keydown',event=>{if(event.key==='Escape'&&!tray.hidden){event.stopPropagation();setChoicesOpen(head,false);draw();trigger.focus();}});
    }
    tray.setAttribute('aria-label',caption);
    Array.from(tray.children).forEach((button,i)=>{
      button.querySelector('b').textContent=labels[i];
      button.setAttribute('aria-pressed',String(values[i]===current));
    });
    if(!tray.hidden){
      const back=backLabels[document.documentElement.lang]||backLabels.en;
      trigger.replaceChildren(document.createTextNode('× '+back));
      trigger.setAttribute('aria-label',back);
    }else{
      trigger.replaceChildren(tray.children[values.indexOf(current)].firstChild.cloneNode(true),document.createTextNode(labels[values.indexOf(current)]));
      trigger.setAttribute('aria-label',caption+' · '+labels[values.indexOf(current)]);
    }
  }
  function draw(){
    const words=copy[document.documentElement.lang]||copy.en;
    const labels=names[document.documentElement.lang]||names.en;
    const heads=host.querySelectorAll('.wf-insight-head');
    const summaryWords=[words[1],words[2],...(summaryLabels[document.documentElement.lang]||summaryLabels.en)];
    mountChoices(heads[0],summaryModes,summaryWords,summaryMode,summaryKey,labels[0]+' · '+words[0],value=>summaryMode=value);
    mountChoices(heads[1],modes,words.slice(1,6),mode,key,labels[1]+' · '+words[0],value=>mode=value);
    host.dataset.summaryView=summaryMode;
    host.dataset.view=mode;
    const catalog=host.querySelector('.wf-catalog-total')?.parentElement;
    if(!catalog)return;
    catalog.querySelectorAll('.overview-chart,.overview-other').forEach(el=>el.remove());
    const rows=[...catalog.querySelectorAll('.wf-catalog-row')];
    const count=row=>Number(row.querySelector('b').textContent)||0;
    const total=Number(catalog.querySelector('.wf-catalog-total b').textContent)||0;
    const other=total-rows.reduce((sum,row)=>sum+count(row),0);
    if(other>0 && rows.length){
      const extra=rows[0].cloneNode(true);
      extra.classList.add('overview-other');extra.querySelector('span').textContent=words[6];
      extra.querySelector('b').textContent=String(other);catalog.append(extra);rows.push(extra);
    }
    const colors=['#37768a','#82649a','#ad713c','#46816a','#787f8c'];
    const max=Math.max(1,...rows.map(count)),stops=[];
    let cumulative=0;
    rows.forEach((row,i)=>{
      const n=count(row),color=colors[i%colors.length],start=cumulative;
      cumulative+=total?n*100/total:0;
      if(n)stops.push(color+' '+start+'% '+cumulative+'%');
      row.style.setProperty('--category-color',color);
      row.querySelector('em').style.width=(100*n/max)+'%';
    });
    if(!['ring','strip'].includes(mode))return;
    const chart=document.createElement('div');chart.className='overview-chart';
    chart.setAttribute('aria-hidden','true');
    if(stops.length)chart.style.backgroundImage=(mode==='ring'?'conic-gradient(':'linear-gradient(to right,')+stops.join(',')+')';
    catalog.querySelector('.wf-catalog-label').after(chart);
  }
  // Close floating display choices when working elsewhere in the dashboard.
  document.addEventListener('pointerdown',event=>{
    if(event.target.closest?.('#dashIntelligence .view-trigger, #dashIntelligence .view-choices'))return;
    const opened=host.querySelectorAll('.view-choices:not([hidden])');
    opened.forEach(tray=>setChoicesOpen(tray.parentElement,false));
    if(opened.length)draw();
  });
  new MutationObserver(draw).observe(host,{childList:true});
  new MutationObserver(draw).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
  draw();
})();
