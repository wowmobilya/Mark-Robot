/* Home layout editing is a draft transaction. This surface never copies live
   dashboard cards or writes business data; WFHomeLayout owns the saved layout. */
(function () {
  'use strict';
  const languages = ['ar', 'en', 'tr', 'fr', 'ru'];
  const copy = {
    hiddenSections: ['الأقسام المخفية', 'Hidden sections', 'Gizli bölümler', 'Sections masquées', 'Скрытые разделы'],
    selected: ['تم تحديد {name}. اضغط عنوان بطاقة أخرى لنقله إلى مكانها، أو اضغطه مجددًا للإلغاء.', '{name} selected. Tap another heading to move it there, or tap again to cancel.', '{name} seçildi. Taşımak için başka bir başlığa, iptal için tekrar buna dokunun.', '{name} sélectionné. Touchez un autre titre pour le déplacer, ou retouchez pour annuler.', 'Выбран раздел {name}. Нажмите другой заголовок для перемещения или этот ещё раз для отмены.'],
    pickedUp: ['اسحب {name} إلى مكانه الجديد.', 'Move {name} to its new position.', '{name} bölümünü yeni yerine taşıyın.', 'Déplacez {name} vers sa nouvelle position.', 'Переместите {name} на новое место.'],
    selectionCancelled: ['أُلغي التحريك.', 'Move cancelled.', 'Taşıma iptal edildi.', 'Déplacement annulé.', 'Перемещение отменено.'],
    home: ['الرئيسية', 'Home', 'Ana sayfa', 'Accueil', 'Главная'],
    edit: ['تعديل', 'Edit', 'Düzenle', 'Modifier', 'Изменить'],
    title: ['تخصيص الرئيسية', 'Customize dashboard', 'Paneli düzenle', 'Personnaliser l’accueil', 'Настроить панель'],
    advanced: ['الترتيب والحجم', 'Order and size', 'Sıra ve boyut', 'Ordre et taille', 'Порядок и размер'],
    movePanel: ['تبديل جانب اللوحة', 'Move panel to the other side', 'Paneli diğer tarafa taşı', 'Déplacer le panneau', 'Переместить панель'],
    draftHint: ['عاين التغييرات ثم احفظ', 'Preview changes, then save', 'Önizleyin, sonra kaydedin', 'Prévisualisez, puis enregistrez', 'Просмотрите и сохраните'],
    hint: ['اسحب عنوان البطاقة لفوق أو لتحت لتغيير ترتيبها.', 'Drag a card heading up or down to reorder it.', 'Sıralamak için kart başlığını yukarı veya aşağı sürükleyin.', 'Faites glisser le titre d’une carte vers le haut ou le bas.', 'Перетащите заголовок карточки вверх или вниз.'],
    preview: ['ترتيب الأقسام', 'Section layout', 'Bölüm düzeni', 'Disposition des sections', 'Порядок разделов'],
    previewHint: ['اختر ما يظهر لك وعرض كل قسم، ثم احفظ الترتيب.', 'Choose which sections appear and their width, then save your layout.', 'Görünen bölümleri ve genişliklerini seçip düzeni kaydedin.', 'Choisissez les sections visibles et leur largeur, puis enregistrez.', 'Выберите видимые разделы и их ширину, затем сохраните порядок.'],
    count: ['{shown} من {total} أقسام ظاهرة', '{shown} of {total} sections visible', '{total} bölümden {shown} görünür', '{shown} sections visibles sur {total}', 'Видно разделов: {shown} из {total}'],
    allHidden: ['كل الأقسام مخفية. يمكنك إظهارها مجددًا من الزر الجانبي.', 'All sections are hidden. Reopen the side tab to show them again.', 'Tüm bölümler gizli. Yeniden göstermek için yan sekmeyi açın.', 'Toutes les sections sont masquées. Rouvrez l’onglet latéral pour les afficher.', 'Все разделы скрыты. Откройте боковую вкладку, чтобы показать их снова.'],
    welcome: ['البطاقة الذكية', 'Smart card', 'Akıllı kart', 'Carte intelligente', 'Умная карточка'],
    sales: ['إجمالي المبيعات', 'Total sales', 'Toplam satış', 'Ventes', 'Продажи'],
    metrics: ['إحصاءات النشاط', 'Activity counts', 'İstatistikler', 'Statistiques', 'Статистика'],
    rates: ['أسعار الصرف', 'Exchange rates', 'Döviz kurları', 'Taux de change', 'Курсы валют'],
    recent: ['آخر الفواتير', 'Recent invoices', 'Son faturalar', 'Factures récentes', 'Последние счета'],
    insights: ['نظرة على الأعمال', 'Business overview', 'İş görünümü', 'Vue d’ensemble', 'Обзор бизнеса'],
    welcomeHint: ['الترحيب والنصائح وبطاقاتك اليومية', 'Your welcome, tips and daily cards', 'Karşılama, ipuçları ve günlük kartlar', 'Accueil, conseils et cartes du jour', 'Приветствие, советы и ежедневные карточки'],
    salesHint: ['إجمالي المبيعات وملخص العملات', 'Sales totals and currency summary', 'Satış toplamları ve para birimi özeti', 'Total des ventes et résumé des devises', 'Итоги продаж по валютам'],
    metricsHint: ['الشركات والمنتجات والفواتير', 'Companies, products and invoices', 'Firmalar, ürünler ve faturalar', 'Entreprises, produits et factures', 'Компании, товары и счета'],
    ratesHint: ['العملات والتحويل السريع', 'Currencies and quick conversion', 'Para birimleri ve hızlı dönüşüm', 'Devises et conversion rapide', 'Валюты и быстрый пересчёт'],
    recentHint: ['الوصول السريع إلى أحدث الفواتير', 'Quick access to your latest invoices', 'En son faturalara hızlı erişim', 'Accès rapide aux dernières factures', 'Быстрый доступ к новым счетам'],
    insightsHint: ['متابعة الأداء وحركة العمل', 'Track performance and business activity', 'Performans ve iş hareketlerini izleyin', 'Suivi des performances et de l’activité', 'Обзор результатов и деловой активности'],
    visible: ['ظاهر', 'Visible', 'Görünür', 'Visible', 'Видимый'],
    hidden: ['مخفي', 'Hidden', 'Gizli', 'Masquée', 'Скрытый'],
    show: ['إظهار {name}', 'Show {name}', '{name} bölümünü göster', 'Afficher {name}', 'Показать: {name}'],
    hide: ['إخفاء {name}', 'Hide {name}', '{name} bölümünü gizle', 'Masquer {name}', 'Скрыть: {name}'],
    width: ['عرض قسم {name}', 'Width of {name}', '{name} bölümünün genişliği', 'Largeur de {name}', 'Ширина раздела: {name}'],
    normal: ['عادي', 'Standard', 'Normal', 'Normale', 'Обычная'],
    wide: ['عرض كامل', 'Full width', 'Tam genişlik', 'Pleine largeur', 'Во всю ширину'],
    drag: ['اسحب لترتيب {name}', 'Drag to reorder {name}', '{name} sırasını değiştirmek için sürükleyin', 'Glisser pour déplacer {name}', 'Перетащить раздел: {name}'],
    up: ['تحريك {name} للأعلى', 'Move {name} up', '{name} bölümünü yukarı taşı', 'Monter {name}', 'Переместить вверх: {name}'],
    down: ['تحريك {name} للأسفل', 'Move {name} down', '{name} bölümünü aşağı taşı', 'Descendre {name}', 'Переместить вниз: {name}'],
    keyboard: ['استخدم سهم أعلى أو أسفل لتحريك هذا القسم.', 'Use the up or down arrow to move this section.', 'Bu bölümü taşımak için yukarı veya aşağı oku kullanın.', 'Utilisez les flèches haut et bas pour déplacer cette section.', 'Используйте стрелки вверх и вниз для перемещения раздела.'],
    moved: ['{name} في الموضع {position} من {total}.', '{name} is in position {position} of {total}.', '{name}, {total} bölüm arasında {position}. sırada.', '{name} est en position {position} sur {total}.', '{name}: позиция {position} из {total}.'],
    visibilityChanged: ['{name}: {state}.', '{name}: {state}.', '{name}: {state}.', '{name} : {state}.', '{name}: {state}.'],
    widthChanged: ['{name}: {width}.', '{name}: {width}.', '{name}: {width}.', '{name} : {width}.', '{name}: {width}.'],
    reset: ['استعادة الافتراضي', 'Restore defaults', 'Varsayılana dön', 'Réglages par défaut', 'По умолчанию'],
    resetDone: ['استُعيد الترتيب الافتراضي في المعاينة. احفظ لتطبيقه.', 'The default layout is ready. Save to keep it.', 'Varsayılan düzen hazır. Uygulamak için kaydedin.', 'La disposition par défaut est prête. Enregistrez pour la conserver.', 'Стандартный порядок восстановлен. Сохраните, чтобы применить его.'],
    cancel: ['إلغاء', 'Cancel', 'İptal', 'Annuler', 'Отмена'],
    save: ['حفظ', 'Save', 'Kaydet', 'Enregistrer', 'Сохранить'],
    close: ['إغلاق وإلغاء التعديلات', 'Close and cancel changes', 'Kapat ve değişiklikleri iptal et', 'Fermer et annuler les modifications', 'Закрыть и отменить изменения'],
    saved: ['تم حفظ ترتيب الصفحة الرئيسية', 'Home layout saved', 'Ana sayfa düzeni kaydedildi', 'Disposition de l’accueil enregistrée', 'Порядок главной страницы сохранён'],
    error: ['تعذر حفظ الترتيب. تعديلاتك ما زالت هنا؛ حاول الحفظ مجددًا.', 'The layout could not be saved. Your edits are still here; try saving again.', 'Düzen kaydedilemedi. Değişiklikleriniz burada duruyor; tekrar kaydetmeyi deneyin.', 'La disposition n’a pas pu être enregistrée. Vos modifications sont conservées ici ; réessayez.', 'Не удалось сохранить порядок. Изменения остались в окне; попробуйте ещё раз.']
  };
  function text(key, language = 'ar', values = {}) {
    const value = copy[key]?.[Math.max(0, languages.indexOf(language))] || key;
    return value.replace(/\{(\w+)\}/g, (_, name) => String(values[name] ?? ''));
  }
  function moveOrder(order, key, target) {
    const next = [...order];
    const from = next.indexOf(key);
    if (from < 0 || !Number.isInteger(target) || target < 0 || target >= next.length) return next;
    next.splice(from, 1); next.splice(target, 0, key);
    return next;
  }
  function createSession(model) {
    let baseline = null, draft = null;
    const clone = value => model.normalize(value);
    function change(prefs) {
      if (!draft) return false;
      const next = clone(prefs);
      model.preview(next);
      draft = next;
      return true;
    }
    return {
      begin() { baseline = clone(model.get()); draft = clone(baseline); return clone(draft); },
      get() { return draft ? clone(draft) : null; },
      dirty() { return !!draft && JSON.stringify(draft) !== JSON.stringify(baseline); },
      move(key, target) { return draft ? change({...draft, order: moveOrder(draft.order, key, target)}) : false; },
      toggle(key) {
        if (!draft || !draft.order.includes(key)) return false;
        const hidden = new Set(draft.hidden); hidden.has(key) ? hidden.delete(key) : hidden.add(key);
        return change({...draft, hidden: [...hidden]});
      },
      resize(key, size) {
        if (!draft || !draft.order.includes(key) || !['normal', 'wide'].includes(size)) return false;
        return change({...draft, sizes: {...draft.sizes, [key]: size}});
      },
      reset() { return change(model.defaults()); },
      save() {
        if (!draft) return false;
        model.save(clone(draft)); // A failed write leaves the draft and baseline intact.
        draft = baseline = null;
        return true;
      },
      cancel() {
        if (!draft) return false;
        model.restore();
        draft = baseline = null;
        return true;
      }
    };
  }
  function dropTarget(order, source, rectangles, point, rtl = false) {
    const candidates = order.filter(key => key !== source).map(key => rectangles.find(rect => rect.key === key)).filter(Boolean);
    if (!candidates.length) return null;
    const distance = rect => {
      const dx = Math.max(rect.left - point.x, 0, point.x - rect.right);
      const dy = Math.max(rect.top - point.y, 0, point.y - rect.bottom);
      return dx * dx + dy * dy;
    };
    const target = candidates.reduce((best, rect) => distance(rect) < distance(best) ? rect : best);
    const height = target.bottom - target.top;
    const peer = candidates.some(rect => rect !== target && Math.min(rect.bottom, target.bottom) - Math.max(rect.top, target.top) > Math.min(height, rect.bottom - rect.top) * .6);
    const middle = point.y > target.top + height * .25 && point.y < target.bottom - height * .25;
    const after = peer && middle ? (rtl ? point.x < (target.left + target.right) / 2 : point.x > (target.left + target.right) / 2) : point.y >= (target.top + target.bottom) / 2;
    return {key: target.key, after, index: order.filter(key => key !== source).indexOf(target.key) + (after ? 1 : 0)};
  }
  if (typeof module === 'object' && module.exports) {
    module.exports = {text, copy, moveOrder, createSession, dropTarget};
    return;
  }
  if (typeof window === 'undefined' || typeof document === 'undefined' || window.WFHomeCustomizer) return;

  const paths = {
    edit: '<path d="m14.5 5.5 4 4M4 20l4.5-1 12-12a2.8 2.8 0 0 0-4-4l-12 12L4 20Z"/>',
    layout: '<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M3 10h18M10 10v11"/>',
    close: '<path d="m6 6 12 12M6 18 18 6"/>',
    grip: '<circle cx="9" cy="5" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="19" r="1"/>',
    up: '<path d="m6 14 6-6 6 6"/>',
    down: '<path d="m6 10 6 6 6-6"/>',
    eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
    eyeOff: '<path d="m3 3 18 18M10.6 5.1 12 5c6.5 0 10 7 10 7a19 19 0 0 1-3 3.7M6.6 6.6A21 21 0 0 0 2 12s3.5 7 10 7a12 12 0 0 0 5.4-1.4M10 10a2.8 2.8 0 0 0 4 4"/>',
    reset: '<path d="M3 10a9 9 0 1 1 2 8M3 4v6h6"/>',
    check: '<path d="m5 12 4 4L19 6"/>',
    welcome: '<rect x="3" y="4" width="18" height="16" rx="3"/><path d="M7 9h4M7 14h10M7 17h7"/><circle cx="17" cy="9" r="1.5"/>',
    sales: '<path d="M4 20V10m6 10V4m6 16v-7m5 7H2"/><path d="m14 6 3 3 5-6"/>',
    metrics: '<rect x="3" y="4" width="7" height="7" rx="1.5"/><rect x="14" y="4" width="7" height="7" rx="1.5"/><rect x="3" y="15" width="7" height="6" rx="1.5"/><rect x="14" y="15" width="7" height="6" rx="1.5"/>',
    rates: '<path d="M4 7h16m-4-4 4 4-4 4M20 17H4m4-4-4 4 4 4"/>',
    recent: '<path d="M6 3h9l4 4v14l-3-2-4 2-4-2-3 2V3Z"/><path d="M14 3v5h5M9 12h6m-6 4h6"/>',
    insights: '<path d="M11 3a9 9 0 1 0 10 10H11V3Z"/><path d="M15 3.5A9 9 0 0 1 20.5 9H15V3.5Z"/>'
  };
  const byId = id => document.getElementById(id);
  const lang = () => languages.includes(document.documentElement.lang) ? document.documentElement.lang : 'ar';
  const t = (key, values) => text(key, lang(), values);
  const number = value => new Intl.NumberFormat(lang()).format(value);
  const node = (tag, className) => { const element = document.createElement(tag); if (className) element.className = className; return element; };
  const icon = name => {
    const element = node('span', 'wf-home-editor-icon'); element.setAttribute('aria-hidden', 'true');
    element.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">' + (paths[name] || paths.layout) + '</svg>';
    return element;
  };
  const texts = [], tiles = new Map();
  let model, session, page, layout, toolbar, title, summary, status, live, actions, hiddenArea, hiddenList, dock;
  let mounted = false, guarded = false, writing = false, errorKey = '', selected = null, drag = null, frame = 0, geometryFrame = 0;
  let suppressClickUntil = 0, scroller, resizeObserver;
  const editing = () => !!session?.get();
  function label(tag, key, className) { const el = node(tag, className); texts.push([el, key]); return el; }
  function button(key, className, action, iconName) {
    const el = node('button', 'wf-home-editor-button ' + (className || '')); el.type = 'button';
    if (iconName) el.append(icon(iconName)); if (key) el.append(label('span', key));
    if (action) el.addEventListener('click', action); return el;
  }
  function announce(key, values) { live.textContent = t(key, values); }
  function registerGuard() {
    if (!guarded && window.WFAppUpdates?.registerGuard) {
      window.WFAppUpdates.registerGuard('home-customizer', () => writing || !!drag?.active || !!session?.dirty()); guarded = true;
    }
  }
  function visibleRect(element) {
    if (!element || element.hidden || !element.getClientRects().length) return null;
    const rect = element.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.top < window.innerHeight ? rect : null;
  }
  function positionActions() {
    geometryFrame = 0; if (!editing()) return;
    const viewport = window.visualViewport, left = viewport?.offsetLeft || 0, top = viewport?.offsetTop || 0;
    const right = left + (viewport?.width || window.innerWidth), bottom = top + (viewport?.height || window.innerHeight);
    const pageRect = page.getBoundingClientRect();
    const obstructions = [visibleRect(byId('bottomNav')), visibleRect(byId('bnavCircle'))]
      .filter(rect => rect && rect.bottom > top && rect.top < bottom && rect.right > left && rect.left < right);
    const navTop = Math.min(bottom, ...obstructions.map(rect => rect.top));
    const x = Math.max(left + 12, pageRect.left), edge = Math.min(right - 12, pageRect.right);
    // Fixed-position bottom uses the layout viewport; keyboard/zoom bounds use
    // the visual viewport. Keep their coordinates separate before converting.
    const inset = Math.max(12, window.innerHeight - Math.min(bottom - 12, navTop - 8));
    actions.style.setProperty('--wf-home-actions-left', x + 'px');
    actions.style.setProperty('--wf-home-actions-width', Math.max(0, edge - x) + 'px');
    actions.style.setProperty('--wf-home-actions-bottom', inset + 'px');
    page.style.setProperty('--wf-home-edit-clearance', (actions.offsetHeight + inset + 20) + 'px');
  }
  function scheduleGeometry() { if (editing() && !geometryFrame) geometryFrame = window.requestAnimationFrame(positionActions); }
  function findScroller() {
    for (let el = layout.parentElement; el && el !== document.body; el = el.parentElement) {
      if (/(auto|scroll)/.test(window.getComputedStyle(el).overflowY) && el.scrollHeight > el.clientHeight + 1) return el;
    }
    return document.scrollingElement || document.documentElement;
  }
  function bounds() {
    const viewport = window.visualViewport, offset = viewport?.offsetTop || 0;
    let top = offset + 8, bottom = offset + (viewport?.height || window.innerHeight) - 8;
    const header = visibleRect(document.querySelector('.navbar')), bar = visibleRect(actions);
    if (header) top = Math.max(top, header.bottom + 8);
    if (bar) bottom = Math.min(bottom, bar.top - 8);
    if (scroller !== document.scrollingElement && scroller !== document.documentElement && scroller !== document.body) {
      const rect = scroller.getBoundingClientRect(); top = Math.max(top, rect.top); bottom = Math.min(bottom, rect.bottom);
    }
    return {top, bottom};
  }
  function counter(prefs) { summary.textContent = t('count', {shown: number(prefs.order.length - prefs.hidden.length), total: number(prefs.order.length)}); }
  function draw() {
    const prefs = session?.get(); if (!prefs) return;
    counter(prefs);
    for (const key of prefs.order) {
      const item = tiles.get(key); if (!item) continue;
      const hidden = prefs.hidden.includes(key), wide = prefs.sizes[key] === 'wide';
      item.shell.classList.toggle('is-selected', selected === key);
      item.handle.setAttribute('aria-pressed', String(selected === key));
      item.restore.hidden = !hidden;
      hiddenList.append(item.restore);
      item.width.textContent = t(wide ? 'wide' : 'normal');
      item.width.setAttribute('aria-pressed', String(wide));
      item.width.setAttribute('aria-label', t('width', {name: t(key)}) + ': ' + t(wide ? 'wide' : 'normal'));
    }
    hiddenArea.hidden = !prefs.hidden.length;
    scheduleGeometry();
  }
  function clearSelection() { selected = null; for (const item of tiles.values()) { item.shell.classList.remove('is-selected'); item.handle.setAttribute('aria-pressed', 'false'); } }
  function changed(action, announcement, values) {
    if (!editing()) return;
    endDrag(false); clearSelection();
    if (action() === false) return;
    errorKey = ''; status.textContent = ''; status.hidden = true;
    draw(); if (announcement) announce(announcement, values);
  }
  function move(key, target) {
    const prefs = session?.get(); if (!prefs || target < 0 || target >= prefs.order.length) return;
    changed(() => session.move(key, target), 'moved', {name: t(key), position: number(target + 1), total: number(prefs.order.length)});
    tiles.get(key)?.handle.focus({preventScroll: true});
  }
  function tapMove(key) {
    if (!editing() || Date.now() < suppressClickUntil) return;
    if (!selected) { selected = key; draw(); announce('selected', {name: t(key)}); }
    else if (selected === key) { clearSelection(); announce('selectionCancelled'); }
    else { const source = selected; move(source, session.get().order.indexOf(key)); }
  }
  function buildTile(key) {
    const card = model.element(key); if (!card) return;
    const shell = node('div', 'wf-home-edit-shell wf-home-section'); shell.dataset.homeSection = key;
    const tools = node('div', 'wf-home-card-tools');
    const handle = button('', 'wf-home-card-grip', () => tapMove(key), 'grip'); handle.dataset.section = key;
    handle.append(label('span', key, 'wf-home-card-name')); handle.setAttribute('aria-describedby', 'wfHomeCustomizerKeyboard');
    handle.addEventListener('pointerdown', event => pointerStart(event, key));
    handle.addEventListener('keydown', event => {
      if (!editing() || !['ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault(); event.stopPropagation(); if (event.repeat) return;
      const prefs = session.get(), visible = prefs.order.filter(id => !prefs.hidden.includes(id));
      const index = visible.indexOf(key), next = event.key === 'Home' ? 0 : event.key === 'End' ? visible.length - 1 : index + (event.key === 'ArrowUp' ? -1 : 1);
      if (next >= 0 && next < visible.length) move(key, prefs.order.indexOf(visible[next]));
    });
    const hide = button('', 'wf-home-card-hide', () => {
      changed(() => session.toggle(key), 'visibilityChanged', {name: t(key), state: t('hidden')});
      tiles.get(key).restore.focus({preventScroll: true});
    }, 'eyeOff');
    const width = button('', 'wf-home-card-width', () => {
      const next = session.get().sizes[key] === 'wide' ? 'normal' : 'wide';
      changed(() => session.resize(key, next), 'widthChanged', {name: t(key), width: t(next)});
    });
    const restore = button('', 'wf-home-restore-section', () => {
      changed(() => session.toggle(key), 'visibilityChanged', {name: t(key), state: t('visible')});
      handle.focus({preventScroll: true});
    }, 'eye'); restore.append(label('span', key)); restore.hidden = true;
    tools.append(handle, width, hide); shell.append(tools); hiddenList.append(restore);
    tiles.set(key, {card, shell, tools, handle, hide, width, restore});
  }
  function translate() {
    if (!mounted) return;
    for (const [el, key] of texts) el.textContent = t(key);
    toolbar.dir = actions.dir = hiddenArea.dir = lang() === 'ar' ? 'rtl' : 'ltr';
    dock.trigger.title = t('title'); dock.trigger.setAttribute('aria-label', t('title'));
    for (const [key, item] of tiles) {
      const caption = t('drag', {name: t(key)}); item.handle.setAttribute('aria-label', caption); item.handle.title = caption;
      item.hide.title = t('hide', {name: t(key)}); item.hide.setAttribute('aria-label', item.hide.title);
      item.restore.setAttribute('aria-label', t('show', {name: t(key)}));
    }
    byId('wfHomeCustomizerReset').title = t('reset'); byId('wfHomeCustomizerReset').setAttribute('aria-label', t('reset'));
    status.textContent = errorKey ? t(errorKey) : '';
    if (editing()) draw(); else counter(model.get());
  }
  function attachCards() {
    for (const item of tiles.values()) {
      item.card.before(item.shell); item.shell.append(item.card); item.card.classList.add('wf-home-edit-card');
    }
  }
  function detachCards() {
    for (const item of tiles.values()) {
      if (item.shell.parentNode) { item.shell.before(item.card); item.shell.remove(); }
      item.card.classList.remove('wf-home-edit-card');
    }
  }
  function finish() {
    endDrag(false); clearSelection();
    if (editing()) session.cancel();
    detachCards(); model.restore();
    document.documentElement.classList.remove('wf-home-editing'); page.classList.remove('wf-home-editing');
    actions.hidden = hiddenArea.hidden = true;
    page.style.removeProperty('--wf-home-edit-clearance');
    window.cancelAnimationFrame(geometryFrame); geometryFrame = 0;
    errorKey = ''; status.textContent = ''; status.hidden = true; live.textContent = '';
    counter(model.get());
  }
  function cancel() { return dock?.close(true) || false; }
  function save() {
    if (writing || !editing()) return;
    endDrag(false); writing = true;
    try { session.save(); dock.close(true); window.showToast?.(t('saved'), 'ok'); }
    catch (_) { errorKey = 'error'; status.textContent = t('error'); status.hidden = false; status.scrollIntoView({block: 'nearest'}); }
    finally { writing = false; }
  }
  function begin() {
    registerGuard(); session = createSession(model); session.begin(); clearSelection();
    errorKey = ''; status.hidden = true; status.textContent = ''; live.textContent = '';
    document.documentElement.classList.add('wf-home-editing'); page.classList.add('wf-home-editing');
    actions.hidden = false; attachCards(); model.preview(session.get());
    scroller = findScroller(); translate(); positionActions(); title.focus({preventScroll: true});
  }
  function open() { if (!mount()) return false; return dock.open(); }
  function measureTiles() {
    return [...tiles].filter(([key, item]) => key !== drag?.key && !item.shell.hidden).map(([key, item]) => {
      const rect = item.shell.getBoundingClientRect(); return {key, left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom};
    });
  }
  function updateDrop() {
    if (!drag?.active) return;
    const hole = drag.placeholder.getBoundingClientRect();
    if (drag.y >= hole.top && drag.y <= hole.bottom && drag.x >= hole.left && drag.x <= hole.right) return;
    const prefs = session.get(), target = dropTarget(prefs.order, drag.key, measureTiles(), {x: drag.x, y: drag.y}, lang() === 'ar');
    if (!target || target.index === drag.target?.index) return;
    const sibling = tiles.get(target.key)?.shell; if (!sibling) return;
    const before = new Map();
    for (const [key, item] of tiles) {
      if (key === drag.key || item.shell.hidden) continue;
      item.animation?.cancel(); before.set(key, item.shell.getBoundingClientRect());
    }
    layout.insertBefore(drag.placeholder, target.after ? sibling.nextSibling : sibling);
    drag.target = target;
    if (!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      for (const [key, rect] of before) {
        const item = tiles.get(key), next = item.shell.getBoundingClientRect();
        const dx = rect.left - next.left, dy = rect.top - next.top;
        if ((dx || dy) && item.shell.animate) item.animation = item.shell.animate([{transform: 'translate(' + dx + 'px,' + dy + 'px)'}, {transform: 'none'}], {duration: 160, easing: 'ease-out'});
      }
    }
  }
  function dragFrame(now) {
    frame = 0; if (!drag?.active) return;
    const dt = Math.min(32, Math.max(0, now - (drag.time || now))); drag.time = now;
    // Keep the real section under the hand; the stable layout captures the pointer.
    const dx = window.innerWidth > 700 ? drag.x - drag.startX : 0;
    drag.shell.style.transform = 'translate3d(' + dx + 'px,' + (drag.y - drag.startY) + 'px,0)';
    const area = bounds(), edge = Math.min(56, Math.max(16, (area.bottom - area.top) / 4));
    const velocity = drag.y < area.top + edge ? -Math.min(1, (area.top + edge - drag.y) / edge) : drag.y > area.bottom - edge ? Math.min(1, (drag.y - area.bottom + edge) / edge) : 0;
    if (velocity && dt) {
      const maximum = Math.max(0, scroller.scrollHeight - scroller.clientHeight);
      scroller.scrollTop = Math.max(0, Math.min(maximum, scroller.scrollTop + velocity * 620 * dt / 1000));
    }
    updateDrop(); frame = window.requestAnimationFrame(dragFrame);
  }
  function pointerStart(event, key) {
    if (!editing() || writing || event.isPrimary === false || event.button !== 0 || drag) return;
    const item = tiles.get(key); if (!item || event.target.closest('.wf-home-card-grip') !== item.handle) return;
    drag = {key, shell: item.shell, handle: item.handle, pointerId: event.pointerId, startX: event.clientX, startY: event.clientY,
      x: event.clientX, y: event.clientY, active: false, target: null};
  }
  function pointerMove(event) {
    if (!drag || drag.pointerId !== event.pointerId) return;
    drag.x = event.clientX; drag.y = event.clientY;
    if (!drag.active && Math.hypot(drag.x - drag.startX, drag.y - drag.startY) < 7) return;
    event.preventDefault();
    if (!drag.active) {
      // Leave taps on their original heading; capture only a confirmed drag.
      clearSelection();
      try { layout.setPointerCapture(event.pointerId); } catch (_) {}
      const rect = drag.shell.getBoundingClientRect(); drag.active = true;
      drag.originalStyle = drag.shell.getAttribute('style');
      drag.scrollBehavior = scroller.style.scrollBehavior; scroller.style.scrollBehavior = 'auto';
      const placeholder = node('div', 'wf-home-drop-space'); placeholder.setAttribute('aria-hidden', 'true');
      placeholder.dataset.homeSize = session.get().sizes[drag.key]; placeholder.style.height = rect.height + 'px';
      layout.insertBefore(placeholder, drag.shell); drag.placeholder = placeholder;
      drag.target = {index: session.get().order.indexOf(drag.key)};
      drag.shell.style.left = rect.left + 'px'; drag.shell.style.top = rect.top + 'px'; drag.shell.style.width = rect.width + 'px';
      drag.shell.classList.add('is-dragging'); layout.classList.add('is-dragging');
      announce('pickedUp', {name: t(drag.key)});
      frame = window.requestAnimationFrame(dragFrame);
    }
  }
  function endDrag(commit) {
    if (!drag) return;
    const current = drag; drag = null; window.cancelAnimationFrame(frame); frame = 0;
    try { layout.releasePointerCapture(current.pointerId); } catch (_) {}
    if (!current.active) return;
    current.placeholder.remove(); current.shell.classList.remove('is-dragging'); layout.classList.remove('is-dragging');
    if (current.originalStyle == null) current.shell.removeAttribute('style'); else current.shell.setAttribute('style', current.originalStyle);
    scroller.style.scrollBehavior = current.scrollBehavior || '';
    for (const item of tiles.values()) item.animation?.cancel();
    suppressClickUntil = Date.now() + 400;
    if (commit && current.target && editing()) {
      const total = session.get().order.length; session.move(current.key, current.target.index);
      errorKey = ''; status.textContent = ''; status.hidden = true; draw();
      announce('moved', {name: t(current.key), position: number(current.target.index + 1), total: number(total)});
    } else if (editing()) { model.preview(session.get()); announce('selectionCancelled'); }
    if (editing()) current.handle.focus({preventScroll: true});
  }
  function pointerEnd(event) {
    if (drag?.pointerId !== event.pointerId) return;
    if (drag.active) { event.preventDefault(); drag.x = event.clientX; drag.y = event.clientY; if (event.type === 'pointerup') updateDrop(); }
    endDrag(event.type === 'pointerup');
  }
  function mount() {
    if (mounted) return true;
    page = byId('page-dashboard'); layout = byId('wfHomeLayout'); model = window.WFHomeLayout;
    if (!page || !layout || !model?.element || !window.WFHomeDock) return false;
    toolbar = node('section', 'wf-home-inline-toolbar'); toolbar.id = 'wfHomeCustomizer'; toolbar.hidden = true;
    toolbar.setAttribute('aria-labelledby', 'wfHomeCustomizerTitle');
    const heading = node('div', 'wf-home-inline-heading'); title = label('h2', 'title'); title.id = 'wfHomeCustomizerTitle'; title.tabIndex = -1;
    summary = node('p', 'wf-home-editor-count'); heading.append(title, summary);
    const hint = label('p', 'hint', 'wf-home-editor-hint'); hint.id = 'wfHomeCustomizerHint';
    const keyboard = label('p', 'keyboard', 'wf-home-editor-live'); keyboard.id = 'wfHomeCustomizerKeyboard';
    status = node('p', 'wf-home-editor-status'); status.id = 'wfHomeCustomizerStatus'; status.setAttribute('role', 'alert'); status.hidden = true;
    live = node('p', 'wf-home-editor-live'); live.setAttribute('role', 'status'); live.setAttribute('aria-live', 'polite'); live.setAttribute('aria-atomic', 'true');
    toolbar.append(heading, hint, keyboard, status, live); page.insertBefore(toolbar, layout);
    hiddenArea = node('section', 'wf-home-hidden-sections'); hiddenArea.id = 'wfHomeHiddenSections'; hiddenArea.hidden = true;
    hiddenArea.append(label('h3', 'hiddenSections')); hiddenList = node('div', 'wf-home-hidden-list'); hiddenArea.append(hiddenList); layout.after(hiddenArea);
    model.get().order.forEach(buildTile);
    actions = node('div', 'wf-home-inline-actions'); actions.id = 'wfHomeCustomizerActions'; actions.hidden = true;
    actions.setAttribute('role', 'group'); actions.setAttribute('aria-labelledby', title.id);
    const reset = button('', 'wf-home-editor-reset', () => changed(() => session.reset(), 'resetDone'), 'reset'); reset.id = 'wfHomeCustomizerReset';
    const cancelButton = button('cancel', '', cancel); cancelButton.id = 'wfHomeCustomizerCancel';
    const saveButton = button('save', 'is-primary', save, 'check'); saveButton.id = 'wfHomeCustomizerSave';
    actions.append(reset, cancelButton, saveButton); document.body.append(actions);
    dock = window.WFHomeDock.create({panel: toolbar, onOpen: begin, onClose: finish, inline: true});
    layout.addEventListener('click', event => {
      if (Date.now() < suppressClickUntil && event.detail !== 0) { event.preventDefault(); event.stopImmediatePropagation(); }
    }, true);
    layout.addEventListener('lostpointercapture', event => { if (event.target === layout && drag?.pointerId === event.pointerId) endDrag(false); });
    window.addEventListener('pointermove', pointerMove, {passive: false});
    window.addEventListener('pointerup', pointerEnd, {passive: false}); window.addEventListener('pointercancel', pointerEnd);
    document.addEventListener('pointerdown', event => { if (drag && event.pointerId !== drag.pointerId) endDrag(false); }, true);
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && editing() && (drag || selected)) { event.preventDefault(); event.stopImmediatePropagation(); endDrag(false); clearSelection(); announce('selectionCancelled'); }
    }, true);
    window.addEventListener('blur', () => endDrag(false));
    document.addEventListener('visibilitychange', () => { if (document.hidden) endDrag(false); });
    window.addEventListener('resize', () => { endDrag(false); scheduleGeometry(); }, {passive: true});
    window.visualViewport?.addEventListener('resize', () => { endDrag(false); scheduleGeometry(); }, {passive: true});
    window.visualViewport?.addEventListener('scroll', scheduleGeometry, {passive: true});
    document.addEventListener('scroll', scheduleGeometry, {capture: true, passive: true});
    if (window.ResizeObserver) { resizeObserver = new window.ResizeObserver(scheduleGeometry); for (const el of [actions, document.querySelector('.navbar'), byId('bottomNav'), byId('bnavCircle')]) if (el) resizeObserver.observe(el); }
    mounted = true; translate(); registerGuard();
    new MutationObserver(translate).observe(document.documentElement, {attributes: true, attributeFilter: ['lang']});
    return true;
  }
  window.WFHomeCustomizer = {open, close: cancel, isOpen: () => !!dock?.isOpen()};
  document.addEventListener('wf-home-layout-edit', open);
  window.addEventListener('wf-home-layout-ready', mount);
  window.addEventListener('wf-home-layout-change', event => { if (mounted && event.detail?.prefs) counter(event.detail.prefs); });
  document.addEventListener('DOMContentLoaded', () => { mount(); registerGuard(); }, {once: true});
  mount();
})();
