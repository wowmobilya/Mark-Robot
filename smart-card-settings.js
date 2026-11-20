(() => {
  'use strict';
  const pages = ['greetingCard', 'tipCardStandalone', 'wfGreetingWeather', 'wfGreetingLogo', 'wfGreetingRobot'];
  const langs = ['ar','en','tr','fr','ru'];
  const copy = {
    title: ['البطاقة الذكية','Smart card','Akıllı kart','Carte intelligente','Умная карточка'],
    pages: ['الصفحات وترتيبها','Pages and order','Sayfalar ve sıralama','Pages et ordre','Страницы и порядок'],
    hint: ['اختر صفحة واحدة على الأقل. استخدم السهمين لتغيير الترتيب.','Select at least one page. Use the arrows to change the order.','En az bir sayfa seçin. Sıralamayı oklarla değiştirin.','Sélectionnez au moins une page. Utilisez les flèches pour modifier l’ordre.','Выберите хотя бы одну страницу. Используйте стрелки для изменения порядка.'],
    greetingCard: ['الترحيب','Welcome','Karşılama','Accueil','Приветствие'],
    tipCardStandalone: ['نصيحة اليوم','Today’s tip','Günün önerisi','Conseil du jour','Совет дня'],
    wfGreetingWeather: ['الطقس','Weather','Hava durumu','Météo','Погода'],
    wfGreetingLogo: ['هوية البرنامج','App identity','Uygulama kimliği','Identité de l’application','Оформление приложения'],
    wfGreetingRobot: ['مارك روبوت','Mark Robot','Mark Robot','Robot Mark','Робот Марк'],
    up: ['تحريك لأعلى','Move up','Yukarı taşı','Déplacer vers le haut','Передвинуть вверх'],
    down: ['تحريك لأسفل','Move down','Aşağı taşı','Déplacer vers le bas','Передвинуть вниз'],
    initial: ['الصفحة الأولى','Opening page','Açılış sayfası','Page d’ouverture','Начальная страница'],
    autoplay: ['التنقل التلقائي','Automatic rotation','Otomatik geçiş','Défilement automatique','Автопереключение'],
    interval: ['مدة عرض الصفحة بالثواني','Seconds per page','Sayfa başına saniye','Secondes par page','Секунд на страницу'],
    density: ['حجم البطاقة','Card size','Kart boyutu','Taille de la carte','Размер карточки'],
    normal: ['عادي','Standard','Standart','Standard','Обычный'],
    comfortable: ['واسع','Spacious','Geniş','Spacieux','Просторный'],
    preview: ['معاينة الترتيب','Page order preview','Sayfa sırası önizlemesi','Aperçu de l’ordre des pages','Просмотр порядка страниц'],
    next: ['الصفحة التالية','Next page','Sonraki sayfa','Page suivante','Следующая страница'],
    save: ['حفظ','Save','Kaydet','Enregistrer','Сохранить'],
    cancel: ['إلغاء','Cancel','İptal','Annuler','Отмена'],
    saved: ['تم حفظ إعدادات البطاقة','Card settings saved','Kart ayarları kaydedildi','Réglages de la carte enregistrés','Настройки карточки сохранены'],
    error: ['تعذر حفظ إعدادات البطاقة. حاول مجددًا.','Couldn’t save the card settings. Try again.','Kart ayarları kaydedilemedi. Tekrar deneyin.','Impossible d’enregistrer les réglages. Réessayez.','Не удалось сохранить настройки. Попробуйте ещё раз.']
  };
  function normalize(value, legacyAutoplay = false) {
    const pref = value && typeof value === 'object' ? value : {};
    const order = [...new Set((Array.isArray(pref.order) ? pref.order : []).filter(id => pages.includes(id)).concat(pages))];
    const visible = order.filter(id => !Array.isArray(pref.visible) || pref.visible.includes(id));
    if (!visible.length) visible.push(order[0]);
    const initial = pref.initial ?? pages[4];
    return {
      order, visible, initial:visible.includes(initial) ? initial : visible[0],
      autoplay:typeof pref.autoplay === 'boolean' ? pref.autoplay : legacyAutoplay,
      interval:Number.isFinite(pref.interval) ? Math.min(30,Math.max(5,Math.round(pref.interval))) : 10,
      density:pref.density === 'comfortable' ? 'comfortable' : 'normal'
    };
  }
  async function persist(state, changes, legacyAutoplay, writeBatch, hydrate) {
    const [row] = await writeBatch([{
      type:'merge', store:'settings', id:'main', value:{smartCard:changes},
      merge(stored, patch) {
        return {...stored, id:'main', smartCard:normalize({...normalize(stored?.smartCard,legacyAutoplay),...patch.smartCard},legacyAutoplay)};
      }
    }]);
    // Settings belonging to other forms may have changed while the write was pending.
    const smartCard = await hydrate(row.smartCard);
    state.settings.smartCard = smartCard;
    return smartCard;
  }
  if (typeof module === 'object' && module.exports) module.exports = {normalize,persist,pages,copy};
  if (typeof document === 'undefined') return;

  const root = document.documentElement;
  const t = key => copy[key][Math.max(0,langs.indexOf(root.lang))];
  const byId = id => document.getElementById(id);
  const workspace = byId('page-settings')?.querySelector('.wf-settings-workspace');
  if (!workspace) return;
  let legacy = false;
  try { legacy = localStorage.getItem('wf.smartCard.autoplay') === 'true'; } catch (_) {}
  const current = () => normalize(S.settings.smartCard,legacy);
  let draft = null, baseline, writing = false, previewPage, revision = JSON.stringify(current()), queue = Promise.resolve();
  function saveChanges(changes) {
    const result = queue.then(() => persist(S,changes,legacy,wfWriteBatch,wfHydrateDBValue));
    queue = result.catch(() => {});
    return result;
  }
  function notifyActions() { window.dispatchEvent(new CustomEvent('wf-settings-actions-change')); }
  function publish(prefs,resetFace = true) {
    window.dispatchEvent(new CustomEvent('wf-smart-card-change',{detail:{prefs,resetFace}}));
    notifyActions();
  }
  function sync() {
    const prefs = current(), signature = JSON.stringify(prefs);
    if (revision === signature) return;
    revision = signature;
    if (!draft) publish(prefs);
  }
  window.WFSmartCardSettings = {
    current,
    async setAutoplay(autoplay) {
      try { revision = JSON.stringify(await saveChanges({autoplay})); }
      catch (_) { publish(current(),false); window.showToast?.(t('error'),'err'); }
    }
  };
  const node = (tag,cls) => { const el = document.createElement(tag); if (cls) el.className=cls; return el; };
  const texts = [];
  const label = (tag,key,cls) => { const el=node(tag,cls); texts.push([el,key]); return el; };
  const button = (key,cls,fn) => { const el=label('button',key,cls); el.type='button'; el.addEventListener('click',fn); return el; };
  const tab = node('button','tab-btn');
  tab.type='button'; tab.id='wf-settings-tab-smart-card'; tab.setAttribute('onclick',"switchTab('smart-card')");
  tab.setAttribute('aria-controls','stab-smart-card');
  const icon=node('span','wf-smart-settings-icon'); icon.setAttribute('aria-hidden','true');
  icon.innerHTML='<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><rect x="2.5" y="4.5" width="19" height="15" rx="3"/><path d="M6 9h7M6 13h5M17.5 9v.1m0 3v.1m0 3v.1"/></svg>';
  tab.append(icon,label('span','title')); workspace.querySelector('.tabs').append(tab);
  const panel=node('section'); panel.id='stab-smart-card'; panel.style.display='none';
  panel.setAttribute('aria-labelledby',tab.id); workspace.querySelector('.wf-settings-content').append(panel);
  const form=node('fieldset','wf-smart-settings-form'); panel.append(form);
  const list=node('div','wf-smart-settings-list');
  form.append(label('h3','pages'),label('p','hint','wf-smart-settings-hint'),list);
  const rows = new Map();
  let dragId = null;
  function move(id,target) {
    if (!draft || target < 0 || target >= pages.length) return;
    const order = draft.order.filter(item=>item !== id); order.splice(target,0,id);
    change({order});
  }
  for (const id of pages) {
    const row=node('div','wf-smart-settings-row'); row.dataset.page=id;
    const choice=node('label'), input=node('input'); input.type='checkbox';
    choice.append(input,label('span',id)); row.append(choice);
    input.onchange=()=>change({visible:input.checked ? [...draft.visible,id] : draft.visible.filter(item=>item!==id)});
    const arrows=[-1,1].map((delta,i)=>{
      const arrow=node('button','btn btn-s'); arrow.type='button'; arrow.textContent=i?'↓':'↑';
      arrow.onclick=()=>move(id,draft.order.indexOf(id)+delta); row.append(arrow); return arrow;
    });
    row.draggable=true;
    row.ondragstart=event=>{dragId=id; event.dataTransfer.setData('text/plain',id); event.dataTransfer.effectAllowed='move';};
    row.ondragover=event=>{if(dragId) event.preventDefault();};
    row.ondrop=event=>{if(!dragId) return; event.preventDefault(); move(dragId,draft.order.indexOf(id)); dragId=null;};
    row.ondragend=()=>{dragId=null;};
    rows.set(id,{row,input,arrows}); list.append(row);
  }
  const controls=node('div','wf-smart-settings-controls'); form.append(controls);
  function field(key,el) {
    const wrapper=node('label','wf-smart-settings-field'); wrapper.append(label('span',key),el); controls.append(wrapper); return el;
  }
  const first=field('initial',node('select','fc'));
  const density=field('density',node('select','fc'));
  for(const key of ['normal','comfortable']) { const opt=label('option',key); opt.value=key; density.append(opt); }
  const auto=field('autoplay',node('input')); auto.type='checkbox'; auto.setAttribute('role','switch');
  const interval=field('interval',node('select','fc'));
  for(let n=5;n<=30;n++) { const opt=node('option'); opt.value=String(n); interval.append(opt); }
  first.onchange=()=>change({initial:first.value}); density.onchange=()=>change({density:density.value});
  auto.onchange=()=>change({autoplay:auto.checked}); interval.onchange=()=>change({interval:Number(interval.value)});
  const preview=node('div','wf-smart-settings-preview'), summary=node('div'), position=label('small','preview'), pageName=node('strong');
  summary.append(position,pageName); pageName.setAttribute('aria-live','polite');
  const next=button('next','btn btn-s',()=>{previewPage=draft.visible[(draft.visible.indexOf(previewPage)+1)%draft.visible.length]; drawPreview();});
  preview.append(summary,next); form.append(preview);
  const actions=node('div','wf-smart-settings-actions'), status=node('p','wf-smart-settings-status'); status.setAttribute('role','status');
  const cancel=button('cancel','btn btn-s',()=>byId('wfSettingsDialog')?.close());
  const save=button('save','btn btn-p',async()=>{
    if (!draft || writing) return;
    const changes = Object.fromEntries(Object.entries(draft).filter(([key,val])=>JSON.stringify(val)!==JSON.stringify(baseline[key])));
    writing=true; form.disabled=true;
    notifyActions();
    try {
      if (Object.keys(changes).length) await saveChanges(changes);
      revision=JSON.stringify(current());
      draft=null; publish(current()); byId('wfSettingsDialog')?.close(); window.showToast?.(t('saved'),'ok');
    } catch (_) { status.textContent=t('error'); }
    finally { writing=false; form.disabled=false; notifyActions(); }
  });
  actions.append(cancel,save); form.append(actions,status);
  window.WFSmartCardSettings.getSettingsActions = () => {
    const page = byId('page-settings'), dialog = byId('wfSettingsDialog');
    if (!page.classList.contains('active') || panel.hidden || panel.style.display === 'none' || !draft || (dialog && !dialog.open)) return null;
    return { key: 'smart-card', scope: panel, save, cancel,
      dirty: JSON.stringify(baseline) !== JSON.stringify(draft), busy: writing };
  };
  function change(changes) {
    draft=normalize({...draft,...changes},legacy); previewPage=draft.initial;
    status.textContent=''; draw(); publish(draft);
  }
  function drawPreview() {
    if (!draft) return;
    const number=new Intl.NumberFormat(root.lang||'ar');
    pageName.textContent=t(previewPage)+' · '+number.format(draft.visible.indexOf(previewPage)+1)+' / '+number.format(draft.visible.length);
    preview.dataset.density=draft.density; next.disabled=draft.visible.length<2;
  }
  function draw() {
    if (!draft) return;
    const focused=document.activeElement, restoreFocus=list.contains(focused);
    draft.order.forEach((id,index)=>{
      const {row,input,arrows}=rows.get(id);
      if (list.children[index]!==row) list.insertBefore(row,list.children[index]||null);
      input.checked=draft.visible.includes(id); input.disabled=input.checked && draft.visible.length===1;
      arrows[0].disabled=index===0; arrows[1].disabled=index===pages.length-1;
    });
    if(restoreFocus && !focused.disabled && document.activeElement!==focused) focused.focus({preventScroll:true});
    first.replaceChildren(...draft.visible.map(id=>{const opt=node('option'); opt.value=id; opt.textContent=t(id); return opt;}));
    first.value=draft.initial; density.value=draft.density; auto.checked=draft.autoplay; interval.value=String(draft.interval);
    interval.disabled=!draft.autoplay || draft.visible.length===1;
    drawPreview();
  }
  function translate() {
    texts.forEach(([el,key])=>{el.textContent=t(key);});
    for (const [id,{arrows}] of rows) ['up','down'].forEach((action,i)=>{
      const name=t(action)+' · '+t(id); arrows[i].title=name; arrows[i].setAttribute('aria-label',name);
    });
    const number=new Intl.NumberFormat(root.lang||'ar');
    Array.from(interval.options,option=>{option.textContent=number.format(Number(option.value));});
    draw();
  }
  function discard() {
    if (!draft) return;
    draft=null; publish(current());
  }
  const original=window.switchTab;
  window.switchTab=function(key) {
    const result=original.apply(this,arguments);
    panel.style.display=key==='smart-card'?'block':'none';
    if (key==='smart-card') {
      if(!draft){baseline=current(); draft=normalize(baseline,legacy); previewPage=draft.initial; status.textContent=''; draw();}
      notifyActions();
    } else discard();
    return result;
  };
  const updateDash=window.updateDash;
  window.updateDash=function(...args) { const result=updateDash.apply(this,args); sync(); return result; };
  document.addEventListener('DOMContentLoaded',()=>{
    const dialog=byId('wfSettingsDialog'); dialog?.addEventListener('close',discard);
    window.WFAppUpdates?.registerGuard('smart-card-settings',()=>writing || !!draft && JSON.stringify(baseline)!==JSON.stringify(draft));
  },{once:true});
  new MutationObserver(translate).observe(root,{attributes:true,attributeFilter:['lang']});
  translate();
})();
