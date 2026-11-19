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
  const toolbar=document.createElement('div'), design=document.createElement('div'), overview=document.createElement('div');
  const layoutButton=document.createElement('button'), overviewButton=document.createElement('button'), move=document.createElement('button');
  const wordsByLanguage={
    ar:['التصميم','الملخّص','تبديل جانب اللوحة'],en:['Layout','Summary','Move panel to the other side'],
    tr:['Düzen','Özet','Paneli diğer tarafa taşı'],fr:['Disposition','Résumé','Déplacer le panneau'],
    ru:['Макет','Сводка','Переместить панель']
  };
  panel.className='dash-dock-panel';
  toolbar.className='dash-dock-toolbar';
  design.className='dash-dock-layout';
  overview.className='dash-dock-styles';
  overview.id='dashboard-summary-controls';
  design.id='dashboard-layout-controls';
  panel.id='dashboard-customization-panel';
  trigger.setAttribute('aria-controls',panel.id);
  layoutButton.type=overviewButton.type=move.type='button';
  layoutButton.setAttribute('aria-controls',design.id);
  overviewButton.setAttribute('aria-controls',overview.id);
  move.className='dash-dock-move';
  move.textContent='⇆';
  function selectTab(summary){
    design.hidden=summary;
    overview.hidden=!summary;
    layoutButton.setAttribute('aria-pressed',String(!summary));
    overviewButton.setAttribute('aria-pressed',String(summary));
  }
  layoutButton.onclick=()=>selectTab(false);
  overviewButton.onclick=()=>selectTab(true);
  toolbar.append(layoutButton,overviewButton,move);
  panel.append(toolbar,design,overview);
  menu.append(trigger,panel);
  selectTab(false);
  const sideKey='wf.dashboard.dockSide';
  menu.dataset.side=document.documentElement.dir==='rtl'?'left':'right';
  try {const saved=localStorage.getItem(sideKey);if(['left','right'].includes(saved))menu.dataset.side=saved;} catch {}
  move.onclick=()=>{
    menu.dataset.side=menu.dataset.side==='right'?'left':'right';
    try{localStorage.setItem(sideKey,menu.dataset.side);}catch{}
  };
  document.body.append(menu);
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
    trigger.textContent=words[0];
    const [layoutLabel,summaryLabel,moveLabel]=wordsByLanguage[document.documentElement.lang]||wordsByLanguage.en;
    layoutButton.textContent=layoutLabel;
    overviewButton.textContent=summaryLabel;
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
  const picker=document.createElement('label'),title=document.createElement('span'),select=document.createElement('select');
  picker.className='overview-style';
  modes.forEach(mode=>select.add(new Option('',mode)));
  const controls=document.getElementById('dashboard-summary-controls');
  if(!controls)return;
  picker.append(title,select);controls.append(picker);
  const summaryPicker=document.createElement('label'),summaryTitle=document.createElement('span'),summarySelect=document.createElement('select');
  summaryPicker.className='overview-style';
  ['list','tiles'].forEach(value=>summarySelect.add(new Option('',value)));
  summaryPicker.append(summaryTitle,summarySelect);controls.prepend(summaryPicker);
  const summaryKey='wf.dashboard.summaryStyle';
  const names={ar:['ملخّص الأعمال','توزيع المنتجات'],en:['Business summary','Product breakdown'],tr:['İş özeti','Ürün dağılımı'],fr:['Résumé d’activité','Répartition des produits'],ru:['Сводка бизнеса','Распределение товаров']};
  let summaryMode='list';
  try{if(localStorage.getItem(summaryKey)==='tiles')summaryMode='tiles';}catch{}
  summarySelect.value=summaryMode;
  summarySelect.onchange=()=>{
    summaryMode=summarySelect.value;
    host.dataset.summaryView=summaryMode;
    try{localStorage.setItem(summaryKey,summaryMode);}catch{}
  };
  const key='wf.dashboard.overviewStyle';
  let mode='bars';
  try{const saved=localStorage.getItem(key);if(modes.includes(saved))mode=saved;}catch{}
  select.value=mode;
  function draw(){
    const words=copy[document.documentElement.lang]||copy.en;
    const labels=names[document.documentElement.lang]||names.en;
    summaryTitle.textContent=labels[0];
    title.textContent=labels[1];
    Array.from(summarySelect.options).forEach((opt,i)=>opt.textContent=words[i+1]);
    host.dataset.summaryView=summaryMode;
    Array.from(select.options).forEach((opt,i)=>opt.textContent=words[i+1]);
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
  select.onchange=()=>{mode=select.value;try{localStorage.setItem(key,mode);}catch{}draw();};
  new MutationObserver(draw).observe(host,{childList:true});
  new MutationObserver(draw).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
  draw();
})();
