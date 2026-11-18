/* Header presentation only: preserve all original navigation handlers. */
(function(){
 const nav=document.querySelector('.navbar');if(!nav)return;
 nav.querySelector('.wf-topbar-title')?.remove();
 const settings={ar:'الإعدادات',en:'Settings',tr:'Ayarlar',fr:'Paramètres',ru:'Настройки'};
 function sync(){const lang=document.documentElement.lang||'ar';const b=document.getElementById('headerSettingsBtn');if(b){b.setAttribute('aria-label',settings[lang]||settings.en);b.title=settings[lang]||settings.en;}}
 new MutationObserver(sync).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});sync();
})();


(() => {
  const card = document.querySelector('.wf-greeting-flip');
  if (!card) return;
  const dashboard = card.closest('.page');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const front = document.getElementById('greetingCard');
  const back = document.getElementById('tipCardStandalone');
  let timer;
  let manual = false;
  function flip() {
    const tip = card.classList.toggle('show-tip');
    front.setAttribute('aria-hidden', String(tip));
    back.setAttribute('aria-hidden', String(!tip));
    card.setAttribute('aria-labelledby', tip ? 'tipLabel tipText' : 'greetingSub');
  }
  function schedule() {
    clearTimeout(timer);
    if (manual || document.hidden || !dashboard.classList.contains('active') ||
        reduced.matches || document.documentElement.dataset.wfMotion === 'reduced' ||
        card.matches(':focus, :hover')) return;
    timer = setTimeout(() => { flip(); schedule(); }, card.classList.contains('show-tip') ? 14000 : 8000);
  }
  card.addEventListener('click', () => { manual = true; clearTimeout(timer); flip(); });
  card.addEventListener('keydown', event => {
    if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); card.click(); }
  });
  for (const name of ['focus','blur','pointerenter','pointerleave']) card.addEventListener(name, schedule);
  reduced.addEventListener('change', schedule);
  document.addEventListener('visibilitychange', schedule);
  new MutationObserver(schedule).observe(dashboard, {attributes:true, attributeFilter:['class']});
  new MutationObserver(schedule).observe(document.documentElement, {attributes:true, attributeFilter:['data-wf-motion']});
  schedule();
})();
