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
  menu.append(trigger,panel);
  dashboard.prepend(menu);
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
    captions.push([caption,index+1]);label.append(input,caption);panel.append(label);
  });
  function translate(){
    const words=translations[document.documentElement.lang]||translations.ar;
    trigger.textContent=words[0];
    for(const [caption,index] of captions)caption.textContent=words[index];
  }
  menu.addEventListener('keydown',event=>{if(event.key==='Escape'){menu.open=false;trigger.focus();}});
  document.addEventListener('pointerdown',event=>{if(menu.open&&!menu.contains(event.target))menu.open=false;});
  new MutationObserver(translate).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
  translate();
})();
