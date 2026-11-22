(() => {
  const card = document.querySelector('.wf-greeting-flip');
  if (!card) return;
  const dashboard = card.closest('.page');
  const track = card.querySelector('.wf-greeting-faces');
  if (!dashboard || !track) return;
  const allFaces = [...track.children];
  let faces = allFaces.slice();
  if (!faces.length) return;
  const labelIds = {
    greetingCard:'greetingSub', tipCardStandalone:'tipLabel tipText',
    wfGreetingWeather:'wfWeatherTitle', wfGreetingLogo:'wfGreetingLogoTitle', wfGreetingRobot:'wfRobotTitle', wfPrayer:'wfPrayerTitle'
  };
  const robot = faces.find(panel => panel.id === 'wfGreetingRobot');
  let initialFace = Math.max(0, faces.indexOf(robot));
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
  const carouselWords = {
    ar: {card:'البطاقة الذكية',pages:'صفحات البطاقة الذكية',slide:'صفحة',open:'عرض',names:['الترحيب','نصيحة اليوم','الطقس','هوية البرنامج','مارك روبوت','مواقيت الصلاة'],hint:'اختر صفحة من المؤشر الجانبي. استخدم الأسهم للتنقل، أو اضغط المساحة الخالية لعرض الصفحة التالية.'},
    tr: {card:'Akıllı kart',pages:'Akıllı kart sayfaları',slide:'Sayfa',open:'Göster',names:['Karşılama','Günün önerisi','Hava durumu','Uygulama kimliği','Mark Robot','Namaz vakitleri'],hint:'Yandaki göstergeden bir sayfa seçin. Ok tuşlarıyla ilerleyin veya sonraki sayfa için boş alana dokunun.'},
    en: {card:'Smart card',pages:'Smart card pages',slide:'Slide',open:'Show',names:['Welcome','Today’s tip','Weather','App identity','Mark Robot','Prayer times'],hint:'Choose a page with the side indicator. Use the arrow keys, or press the empty card area to show the next page.'},
    fr: {card:'Carte intelligente',pages:'Pages de la carte',slide:'Page',open:'Afficher',names:['Accueil','Conseil du jour','Météo','Identité de l’application','Robot Mark','Horaires de prière'],hint:'Choisissez une page avec l’indicateur latéral. Utilisez les flèches ou appuyez sur une zone vide pour passer à la page suivante.'},
    ru: {card:'Умная карточка',pages:'Страницы карточки',slide:'Слайд',open:'Показать',names:['Приветствие','Совет дня','Погода','Оформление приложения','Робот Марк','Время молитвы'],hint:'Выберите страницу боковым индикатором. Используйте стрелки или нажмите на свободную область для перехода дальше.'}
  };
  const playbackWords = {
    ar:['تشغيل التنقل التلقائي','إيقاف التنقل التلقائي'],
    tr:['Otomatik geçişi başlat','Otomatik geçişi duraklat'],
    en:['Play automatic switching','Pause automatic switching'],
    fr:['Démarrer le défilement automatique','Mettre en pause le défilement automatique'],
    ru:['Включить автоматическое переключение','Приостановить автоматическое переключение']
  };
  const faceNames = ['greetingCard','tipCardStandalone','wfGreetingWeather','wfGreetingLogo','wfGreetingRobot','wfPrayer'];
  const interactive = 'button,a,input,select,textarea,summary,[role="button"],[role="link"],[contenteditable="true"]';
  const pager = document.createElement('nav');
  pager.className = 'wf-smart-pager';
  pager.style.setProperty('--wf-smart-pages', String(faces.length));
  const hint = document.createElement('span');
  hint.id = 'wfSmartCardHint';
  hint.className = 'wf-smart-sr-only';
  card.setAttribute('role', 'group');
  card.removeAttribute('aria-labelledby');
  card.setAttribute('aria-describedby', hint.id);
  card.setAttribute('aria-keyshortcuts', 'ArrowDown ArrowUp ArrowRight ArrowLeft Home End Enter Space');
  card.tabIndex = 0;
  let pageButtons = faces.map((panel, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'wf-smart-page';
    button.dataset.faceIndex = String(index);
    button.setAttribute('aria-controls', panel.id);
    button.addEventListener('click', event => { event.stopPropagation(); chooseFace(faces.indexOf(panel)); });
    pager.append(button);
    panel.setAttribute('role', 'group');
    if (labelIds[panel.id]) panel.setAttribute('aria-labelledby', labelIds[panel.id]);
    return button;
  });
  const allButtons = new Map(allFaces.map((panel, i) => [panel, pageButtons[i]]));
  const playback = document.createElement('button');
  playback.type = 'button';
  playback.className = 'wf-smart-playback';
  playback.innerHTML = '<svg class="wf-smart-play-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="m9 5 10 7-10 7Z"/></svg><svg class="wf-smart-pause-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M8 5v14M16 5v14"/></svg>';
  track.id ||= 'wfSmartCardFaces';
  playback.setAttribute('aria-controls', track.id);
  pager.append(playback);
  card.querySelectorAll('.greeting-msg,.tip-card-text').forEach(text => { text.tabIndex = 0; });
  card.append(pager, hint);
  const endpoint = 'https://api.open-meteo.com/v1/forecast?latitude=40.08&longitude=29.51&timezone=Europe%2FIstanbul&forecast_days=7&current=temperature_2m,weather_code,is_day&daily=rain_sum,showers_sum,weather_code';
  let timer, animation, forecast, fetched = 0, loading = false, failed = false;
  let intervalSeconds = 10;
  const autoplayKey = 'wf.smartCard.autoplay';
  let savedAutoplay = null;
  try { savedAutoplay = localStorage.getItem(autoplayKey); } catch (_) {}
  let autoplay = savedAutoplay === 'true';
  let motionOptIn = savedAutoplay === 'true';
  let face = initialFace, robotSpeaking = false, reportOpen = false, interacting = false;
  let pendingFace = null, destination = null, transition = 0;

  function autoplayEnabled() {
    return autoplay && (motionOptIn || !(reduced.matches || document.documentElement.dataset.wfMotion === 'reduced'));
  }

  function setAutoplay(enabled) {
    if (enabled !== autoplay) {
      if (window.WFSmartCardSettings) window.WFSmartCardSettings.setAutoplay(enabled);
      else try { localStorage.setItem(autoplayKey, String(enabled)); } catch (_) {}
    }
    autoplay = enabled;
    if (enabled) motionOptIn = true;
    clearTimeout(timer);
    if (!enabled) { cancelFlip(); showFace(face); }
    syncPager();
    schedule();
  }

  function syncPager() {
    const locale = document.documentElement.lang || 'ar';
    const text = carouselWords[locale] || carouselWords.en;
    const number = new Intl.NumberFormat(locale);
    pager.setAttribute('aria-label', text.pages);
    const action = (playbackWords[locale] || playbackWords.en)[autoplayEnabled() ? 1 : 0];
    playback.setAttribute('aria-label', action);
    playback.title = action;
    playback.dataset.autoplay = String(autoplayEnabled());
    hint.textContent = text.hint;
    card.setAttribute('aria-label', text.card);
    faces.forEach((panel, index) => {
      const name = text.names[faceNames.indexOf(panel.id)] || text.slide;
      const button = pageButtons[index];
      button.setAttribute('aria-label', `${text.open} ${name} (${number.format(index + 1)} / ${number.format(faces.length)})`);
      button.title = name;
      button.setAttribute('aria-current', index === face ? 'page' : 'false');
      button.tabIndex = index === face ? 0 : -1;
      panel.setAttribute('aria-roledescription', text.slide);
    });
  }

  function applyPreferences(prefs, resetFace) {
    const previous = faces[face];
    cancelFlip();
    const ordered = prefs.order.filter(id => prefs.visible.includes(id))
      .map(id => allFaces.find(panel => panel.id === id)).filter(Boolean);
    if (!ordered.length) return;
    faces = ordered;
    pageButtons = faces.map(panel => allButtons.get(panel));
    pageButtons.forEach((button, index) => { button.dataset.faceIndex = String(index); });
    pager.replaceChildren(...pageButtons, playback);
    pager.hidden = faces.length === 1;
    pager.style.setProperty('--wf-smart-pages', String(faces.length));
    initialFace = Math.max(0, faces.findIndex(panel => panel.id === prefs.initial));
    autoplay = prefs.autoplay;
    motionOptIn = autoplay;
    intervalSeconds = prefs.interval;
    card.dataset.smartDensity = prefs.density;
    showFace(resetFace || !faces.includes(previous) ? initialFace : faces.indexOf(previous));
    schedule();
  }

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
    logoTitle.textContent = window.WFAppIdentity?.current?.()?.name || brand;
    weatherStatus.textContent = forecast ? rain : failed ? unavailable : pending;
    document.getElementById('wfGreetingWeather').dataset.weatherState = forecast ? 'ready' : failed ? 'unavailable' : 'loading';
    syncPager();
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
      label.className = 'wf-weather-day-label';
      amount.className = 'wf-weather-amount';
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
    logoTarget.replaceChildren(image ? image.cloneNode(false) : document.createTextNode('∞'));
    const identity = window.WFAppIdentity?.current?.();
    if (identity?.name) logoTitle.textContent = identity.name;
  }

  function showFace(index) {
    face = index;
    allFaces.forEach(panel => {
      const inactive = panel !== faces[face];
      panel.inert = inactive;
      panel.setAttribute('aria-hidden', String(inactive));
    });
    card.dataset.smartFace = faces[face].id;
    syncPager();
    if (faces[face].id === 'wfGreetingWeather') refreshWeather();
  }

  async function flip(index = (face + 1) % faces.length) {
    const next = (index + faces.length) % faces.length;
    if (animation) { pendingFace = next; return; }
    if (next === face) { schedule(); return; }
    const turn = ++transition;
    destination = next;
    if (reduced.matches || document.documentElement.dataset.wfMotion === 'reduced' || !track.animate) {
      showFace(next);
      destination = null;
      schedule();
      return;
    }
    animation = track.animate([
      {transform:'rotateX(0deg) translateY(0)',opacity:1},
      {transform:'rotateX(32deg) translateY(-3px)',opacity:0}
    ], {duration:160, easing:'cubic-bezier(.4,0,1,1)', fill:'forwards'});
    try {
      await animation.finished;
      if (turn !== transition) return;
      showFace(next);
      animation.cancel();
      animation = track.animate([
        {transform:'rotateX(-24deg) translateY(3px)',opacity:0},
        {transform:'rotateX(0deg) translateY(0)',opacity:1}
      ], {duration:220, easing:'cubic-bezier(.2,.7,.2,1)'});
      await animation.finished;
    } catch (_) {
      // Leaving the dashboard cancels the in-progress transition.
    } finally {
      if (turn !== transition) return;
      animation = null;
      destination = null;
      const queued = pendingFace;
      pendingFace = null;
      if (queued !== null && queued !== face && dashboard.classList.contains('active')) flip(queued);
      else schedule();
    }
  }

  function chooseFace(index, focusPager = false) {
    if (faces.length < 2) return;
    const next = (index + faces.length) % faces.length;
    setAutoplay(false);
    if (focusPager) pageButtons[next].focus({preventScroll:true});
    flip(next);
  }

  function cancelFlip() {
    transition++;
    animation?.cancel();
    animation = null;
    pendingFace = null;
    destination = null;
  }

  function schedule() {
    clearTimeout(timer);
    if (faces.length < 2 || !autoplayEnabled() || interacting || document.hidden || !dashboard.classList.contains('active') || animation || robotSpeaking || reportOpen || robot?.dataset.speaking === 'true' || robot?.dataset.tracking === 'true' ||
        (card.matches(':focus-within') && document.activeElement !== playback) ||
        (card.matches(':hover') && !playback.matches(':hover'))) return;
    timer = setTimeout(() => flip(), intervalSeconds * 1000);
  }

  playback.addEventListener('click', event => {
    event.stopPropagation();
    setAutoplay(!autoplayEnabled());
  });
  card.addEventListener('pointerdown', () => { interacting = true; clearTimeout(timer); });
  for (const name of ['pointerup', 'pointercancel']) document.addEventListener(name, () => {
    if (interacting) { interacting = false; schedule(); }
  });
  card.addEventListener('click', event => {
    const selection = window.getSelection();
    if (event.target.closest(interactive) || (selection && !selection.isCollapsed)) return;
    const text = event.target.closest('.greeting-msg,.tip-card-text');
    if (text && text.scrollHeight > text.clientHeight + 1) return;
    chooseFace((pendingFace ?? destination ?? face) + 1);
  });
  card.addEventListener('keydown', event => {
    const pageButton = event.target.closest('.wf-smart-page');
    if (event.target !== card && !pageButton) return;
    const current = pageButton ? Number(pageButton.dataset.faceIndex) : pendingFace ?? destination ?? face;
    const rtl = document.documentElement.dir === 'rtl';
    let target = null;
    if (event.key === 'ArrowDown') target = current + 1;
    else if (event.key === 'ArrowUp') target = current - 1;
    else if (event.key === 'ArrowRight') target = current + (rtl ? -1 : 1);
    else if (event.key === 'ArrowLeft') target = current + (rtl ? 1 : -1);
    else if (event.key === 'Home') target = 0;
    else if (event.key === 'End') target = faces.length - 1;
    else if (!pageButton && (event.key === 'Enter' || event.key === ' ')) target = current + 1;
    if (target !== null) { event.preventDefault(); chooseFace(target, Boolean(pageButton)); }
  });
  for (const name of ['focusin', 'pointerenter', 'pointerleave']) card.addEventListener(name, schedule);
  card.addEventListener('focusout', () => queueMicrotask(schedule));
  card.addEventListener('wf-robot-speaking', event => {
    robotSpeaking = Boolean(event.detail?.active);
    if (robotSpeaking && animation) { cancelFlip(); showFace(face); }
    schedule();
  });
  window.addEventListener('wf-robot-motion', event => {
    if (event.detail?.active && animation) { cancelFlip(); showFace(face); }
    schedule();
  });
  window.addEventListener('wf-robot-report-visibility', event => {
    reportOpen = Boolean(event.detail?.open);
    if (reportOpen && animation) { cancelFlip(); showFace(face); }
    schedule();
  });
  function syncMotion() {
    if (animation && (reduced.matches || document.documentElement.dataset.wfMotion === 'reduced')) {
      const next = pendingFace ?? destination ?? face;
      cancelFlip();
      showFace(next);
    }
    syncPager();
    schedule();
  }
  reduced.addEventListener('change', syncMotion);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { interacting = false; cancelFlip(); }
    schedule();
  });
  new MutationObserver(() => {
    if (!dashboard.classList.contains('active')) {
      interacting = false;
      cancelFlip();
      showFace(initialFace);
    }
    schedule();
  }).observe(dashboard, {attributes:true, attributeFilter:['class']});
  new MutationObserver(() => { render(); syncMotion(); }).observe(document.documentElement, {attributes:true, attributeFilter:['lang', 'dir', 'data-wf-motion']});
  if (navLogo) new MutationObserver(syncLogo).observe(navLogo, {childList:true, subtree:true, attributes:true, attributeFilter:['src']});
  const appName = document.querySelector('.navbar .wf-nav-wordmark > bdi');
  if (appName) new MutationObserver(syncLogo).observe(appName, {childList:true, subtree:true, characterData:true});
  syncLogo();
  render();
  window.addEventListener('wf-smart-card-change', event => applyPreferences(event.detail.prefs, event.detail.resetFace));
  if (window.WFSmartCardSettings) applyPreferences(window.WFSmartCardSettings.current(), true);
  else { showFace(initialFace); schedule(); }
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
