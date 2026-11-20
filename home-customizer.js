/* Home layout editing is a draft transaction. This surface never copies live
   dashboard cards or writes business data; WFHomeLayout owns the saved layout. */
(function () {
  'use strict';
  const languages = ['ar', 'en', 'tr', 'fr', 'ru'];
  const copy = {
    hiddenSections: ['الأقسام المخفية', 'Hidden sections', 'Gizli bölümler', 'Sections masquées', 'Скрытые разделы'],
    selected: ['تم تحديد {name}. اضغط اسم قسم آخر لنقله إلى مكانه، أو اضغطه مجددًا للإلغاء.', '{name} selected. Tap another heading to move it there, or tap again to cancel.', '{name} seçildi. Taşımak için başka bir başlığa, iptal için tekrar buna dokunun.', '{name} sélectionné. Touchez un autre titre pour le déplacer, ou retouchez pour annuler.', 'Выбран раздел {name}. Нажмите другой заголовок для перемещения или этот ещё раз для отмены.'],
    pickedUp: ['اسحب {name} إلى مكانه الجديد.', 'Move {name} to its new position.', '{name} bölümünü yeni yerine taşıyın.', 'Déplacez {name} vers sa nouvelle position.', 'Переместите {name} на новое место.'],
    selectionCancelled: ['أُلغي التحريك.', 'Move cancelled.', 'Taşıma iptal edildi.', 'Déplacement annulé.', 'Перемещение отменено.'],
    home: ['الرئيسية', 'Home', 'Ana sayfa', 'Accueil', 'Главная'],
    edit: ['تعديل', 'Edit', 'Düzenle', 'Modifier', 'Изменить'],
    title: ['تخصيص الرئيسية', 'Customize dashboard', 'Paneli düzenle', 'Personnaliser l’accueil', 'Настроить панель'],
    advanced: ['الترتيب والحجم', 'Order and size', 'Sıra ve boyut', 'Ordre et taille', 'Порядок и размер'],
    movePanel: ['تبديل جانب اللوحة', 'Move panel to the other side', 'Paneli diğer tarafa taşı', 'Déplacer le panneau', 'Переместить панель'],
    draftHint: ['عاين التغييرات ثم احفظ', 'Preview changes, then save', 'Önizleyin, sonra kaydedin', 'Prévisualisez, puis enregistrez', 'Просмотрите и сохраните'],
    hint: ['اسحب أسماء الأقسام لفوق أو لتحت لترتيبها.', 'Drag section names up or down to reorder them.', 'Sıralamak için bölüm adlarını yukarı veya aşağı sürükleyin.', 'Faites glisser les noms des sections pour les réordonner.', 'Перетаскивайте названия разделов вверх или вниз.'],
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
  let model, session, panel, dock, body, list, status, live, summary, emptyHint, title, editButton, advancedButton;
  let mounted = false, guarded = false, writing = false, advanced = false, errorKey = '', selected = null, drag = null, frame = 0, suppressClickUntil = 0;
  const texts = [], tiles = new Map();
  const editing = () => !!session?.get();
  function label(tag, key, className) { const element = node(tag, className); texts.push([element, key]); return element; }
  function button(key, className, action, iconName) {
    const element = node('button', 'wf-home-editor-button ' + (className || '')); element.type = 'button';
    if (iconName) element.append(icon(iconName)); if (key) element.append(label('span', key));
    if (action) element.addEventListener('click', action); return element;
  }
  function announce(key, values) { live.textContent = t(key, values); }
  function counter(prefs) { summary.textContent = t('count', {shown: number(prefs.order.length - prefs.hidden.length), total: number(prefs.order.length)}); }
  function registerGuard() {
    if (!guarded && window.WFAppUpdates?.registerGuard) {
      window.WFAppUpdates.registerGuard('home-customizer', () => writing || !!drag?.active || !!session?.dirty()); guarded = true;
    }
  }
  function clearSelection() {
    selected = null;
    for (const item of tiles.values()) { item.card.classList.remove('is-selected'); item.handle.setAttribute('aria-pressed', 'false'); }
  }
  function draw() {
    const prefs = session?.get(); if (!prefs) return;
    const focused = document.activeElement, restoreFocus = list.contains(focused);
    prefs.order.forEach((key, index) => {
      const item = tiles.get(key), visible = !prefs.hidden.includes(key), wide = prefs.sizes[key] === 'wide';
      if (list.children[index] !== item.card) list.insertBefore(item.card, list.children[index] || null);
      item.card.dataset.size = wide ? 'wide' : 'normal'; item.card.dataset.visible = String(visible);
      item.card.classList.toggle('is-selected', selected === key); item.handle.setAttribute('aria-pressed', String(selected === key));
      item.visibility.checked = visible; item.visibility.setAttribute('aria-label', t(key));
      item.visibility.title = t(visible ? 'hide' : 'show', {name: t(key)});
      item.widths.forEach((control, i) => control.setAttribute('aria-pressed', String(wide === (i === 1))));
    });
    if (restoreFocus && focused.isConnected && document.activeElement !== focused) focused.focus({preventScroll: true});
    counter(prefs); emptyHint.hidden = prefs.hidden.length !== prefs.order.length; dock?.reposition();
  }
  function changed(action, announcement, values) {
    if (!editing()) return;
    endDrag(false); clearSelection(); if (action() === false) return;
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
  function setAdvanced(value) {
    endDrag(false); advanced = !!value; advancedButton.setAttribute('aria-expanded', String(advanced));
    for (const item of tiles.values()) item.controls.hidden = !advanced;
    dock?.reposition();
  }
  function buildTile(key) {
    const card = node('article', 'wf-home-section-tile'); card.dataset.section = key; card.setAttribute('role', 'listitem');
    // Keep the existing visibility control separate from the name. Dragging or
    // selecting a name must never toggle its checkbox through a wrapping label.
    const choice = node('div', 'wf-home-section-choice'), visibility = node('input', 'wf-home-visibility');
    visibility.type = 'checkbox'; visibility.id = 'wfHomeVisibility-' + key;
    const region = model.element?.(key); if (region?.id) visibility.setAttribute('aria-controls', region.id);
    visibility.addEventListener('change', () => {
      if (!editing()) return;
      changed(() => session.toggle(key), 'visibilityChanged', {name: t(key), state: t(session.get().hidden.includes(key) ? 'visible' : 'hidden')});
    });
    const handle = button('', 'wf-home-drag-handle', () => tapMove(key)); handle.dataset.section = key;
    const name = label('span', key, 'wf-home-section-name'); name.id = 'wfHomeSectionTitle-' + key;
    handle.append(name, icon('grip')); handle.setAttribute('aria-describedby', 'wfHomeCustomizerKeyboard');
    card.setAttribute('aria-labelledby', name.id);
    handle.addEventListener('pointerdown', event => pointerStart(event, key));
    handle.addEventListener('contextmenu', event => { event.preventDefault(); endDrag(false); });
    handle.addEventListener('keydown', event => {
      if (!editing() || !['ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault(); event.stopPropagation(); if (event.repeat) return;
      const prefs = session.get(), index = prefs.order.indexOf(key);
      move(key, event.key === 'Home' ? 0 : event.key === 'End' ? prefs.order.length - 1 : index + (event.key === 'ArrowUp' ? -1 : 1));
    });
    const visibilityTarget = node('label', 'wf-home-visibility-target'); visibilityTarget.append(visibility); choice.append(visibilityTarget, handle);
    const controls = node('div', 'wf-home-section-controls'); controls.hidden = true;
    const widths = node('div', 'wf-home-width-options'); widths.setAttribute('role', 'group');
    const widthButtons = ['normal', 'wide'].map(size => {
      const control = button(size, '', () => changed(() => session.resize(key, size), 'widthChanged', {name: t(key), width: t(size)}));
      widths.append(control); return control;
    });
    controls.append(widths); card.append(choice, controls); list.append(card);
    tiles.set(key, {card, handle, visibility, controls, widthGroup: widths, widths: widthButtons});
  }
  function translate() {
    if (!mounted) return;
    endDrag(false); clearSelection();
    for (const [element, key] of texts) element.textContent = t(key);
    panel.dir = lang() === 'ar' ? 'rtl' : 'ltr';
    editButton.title = t('title'); editButton.setAttribute('aria-label', t('title'));
    byId('wfHomeCustomizerClose').setAttribute('aria-label', t('close'));
    byId('wfHomeCustomizerMove').setAttribute('aria-label', t('movePanel')); byId('wfHomeCustomizerMove').title = t('movePanel');
    byId('wfHomeCustomizerReset').setAttribute('aria-label', t('reset')); byId('wfHomeCustomizerReset').title = t('reset');
    for (const [key, item] of tiles) {
      item.handle.setAttribute('aria-label', t('drag', {name: t(key)})); item.handle.title = t('drag', {name: t(key)});
      item.widthGroup.setAttribute('aria-label', t('width', {name: t(key)}));
    }
    status.textContent = errorKey ? t(errorKey) : '';
    if (editing()) draw(); else counter(model.get());
  }
  function finish() {
    endDrag(false); clearSelection(); if (editing()) session.cancel();
    errorKey = ''; status.textContent = ''; status.hidden = true; live.textContent = ''; counter(model.get());
  }
  function cancel() { return dock?.close(true) || false; }
  function save() {
    if (writing || !editing()) return;
    endDrag(false); writing = true;
    try { session.save(); dock.close(true); window.showToast?.(t('saved'), 'ok'); }
    catch (_) { errorKey = 'error'; status.textContent = t('error'); status.hidden = false; body.scrollTop = 0; dock.reposition(); }
    finally { writing = false; }
  }
  function begin() {
    registerGuard(); session = createSession(model); session.begin(); clearSelection();
    errorKey = ''; status.hidden = true; status.textContent = ''; live.textContent = '';
    setAdvanced(false); translate(); body.scrollTop = 0; title.focus({preventScroll: true});
  }
  function open() {
    if (!mount()) return false;
    if (dock.isOpen()) { title.focus({preventScroll: true}); return true; }
    return dock.open();
  }
  function measureTiles() {
    return [...tiles].filter(([key]) => key !== drag?.key).map(([key, item]) => {
      const rect = item.card.getBoundingClientRect(); return {key, left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom};
    });
  }
  function updateDrop() {
    if (!drag?.active) return;
    const hole = drag.placeholder.getBoundingClientRect();
    if (drag.y >= hole.top && drag.y <= hole.bottom) return;
    const target = dropTarget(session.get().order, drag.key, measureTiles(), {x: drag.x, y: drag.y});
    if (!target || target.index === drag.target?.index) return;
    const sibling = tiles.get(target.key)?.card; if (!sibling) return;
    const before = new Map();
    for (const [key, item] of tiles) {
      if (key === drag.key) continue;
      item.animation?.cancel(); before.set(key, item.card.getBoundingClientRect());
    }
    list.insertBefore(drag.placeholder, target.after ? sibling.nextSibling : sibling); drag.target = target;
    if (!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      for (const [key, rect] of before) {
        const item = tiles.get(key), dy = rect.top - item.card.getBoundingClientRect().top;
        if (dy && item.card.animate) item.animation = item.card.animate([{transform: 'translateY(' + dy + 'px)'}, {transform: 'none'}], {duration: 150, easing: 'ease-out'});
      }
    }
  }
  function dragFrame(now) {
    frame = 0; if (!drag?.active) return;
    const dt = Math.min(32, Math.max(0, now - (drag.time || now))); drag.time = now;
    const area = body.getBoundingClientRect(), edge = Math.min(48, Math.max(12, (area.bottom - area.top) / 4));
    const velocity = drag.y < area.top + edge ? -Math.min(1, (area.top + edge - drag.y) / edge) : drag.y > area.bottom - edge ? Math.min(1, (drag.y - area.bottom + edge) / edge) : 0;
    if (velocity && dt) body.scrollTop = Math.max(0, Math.min(drag.scrollMaximum, body.scrollTop + velocity * 460 * dt / 1000));
    // Use list-local coordinates: the familiar panel's reveal animation may
    // create a containing block, and the list can scroll during a finger drag.
    const origin = list.getBoundingClientRect();
    // A lifted absolute row must not enlarge its own scroll container when the
    // finger moves beyond the last item; otherwise autoscroll can chase itself.
    const top = Math.max(0, Math.min(drag.listHeight - drag.height, drag.y - drag.grabY - origin.top));
    drag.card.style.left = drag.left - origin.left + 'px'; drag.card.style.top = top + 'px';
    updateDrop(); frame = window.requestAnimationFrame(dragFrame);
  }
  function pointerStart(event, key) {
    if (!editing() || writing || event.isPrimary === false || event.button !== 0 || drag) return;
    const item = tiles.get(key); if (!item || event.target.closest('.wf-home-drag-handle') !== item.handle) return;
    drag = {key, card: item.card, handle: item.handle, pointerId: event.pointerId, startX: event.clientX, startY: event.clientY,
      x: event.clientX, y: event.clientY, active: false, target: null};
  }
  function pointerMove(event) {
    if (!drag || drag.pointerId !== event.pointerId) return;
    drag.x = event.clientX; drag.y = event.clientY;
    if (!drag.active && Math.hypot(drag.x - drag.startX, drag.y - drag.startY) < 7) return;
    event.preventDefault();
    if (!drag.active) {
      clearSelection();
      // Capture only a confirmed drag; an ordinary name tap keeps its target.
      try { list.setPointerCapture(event.pointerId); } catch (_) {}
      const rect = drag.card.getBoundingClientRect(), origin = list.getBoundingClientRect(); drag.active = true;
      drag.originalStyle = drag.card.getAttribute('style'); drag.scrollBehavior = body.style.scrollBehavior; body.style.scrollBehavior = 'auto';
      drag.left = rect.left; drag.grabY = drag.startY - rect.top; drag.height = rect.height; drag.listHeight = origin.height;
      drag.scrollMaximum = Math.max(0, body.scrollHeight - body.clientHeight);
      const placeholder = node('div', 'wf-home-drop-space'); placeholder.setAttribute('aria-hidden', 'true'); placeholder.style.height = rect.height + 'px';
      list.insertBefore(placeholder, drag.card); drag.placeholder = placeholder; drag.target = {index: session.get().order.indexOf(drag.key)};
      drag.card.style.left = rect.left - origin.left + 'px'; drag.card.style.top = rect.top - origin.top + 'px';
      drag.card.style.width = rect.width + 'px'; drag.card.style.height = rect.height + 'px';
      drag.card.classList.add('is-dragging'); list.classList.add('is-dragging'); announce('pickedUp', {name: t(drag.key)});
      frame = window.requestAnimationFrame(dragFrame);
    }
  }
  function endDrag(commit) {
    if (!drag) return;
    const current = drag; drag = null; window.cancelAnimationFrame(frame); frame = 0;
    try { list.releasePointerCapture(current.pointerId); } catch (_) {}
    if (!current.active) return;
    current.placeholder.remove(); current.card.classList.remove('is-dragging'); list.classList.remove('is-dragging');
    if (current.originalStyle == null) current.card.removeAttribute('style'); else current.card.setAttribute('style', current.originalStyle);
    body.style.scrollBehavior = current.scrollBehavior || ''; for (const item of tiles.values()) item.animation?.cancel();
    suppressClickUntil = Date.now() + 400;
    if (commit && current.target && editing()) {
      const total = session.get().order.length; session.move(current.key, current.target.index);
      errorKey = ''; status.textContent = ''; status.hidden = true; draw();
      announce('moved', {name: t(current.key), position: number(current.target.index + 1), total: number(total)});
    } else if (editing()) { draw(); announce('selectionCancelled'); }
    if (editing()) current.handle.focus({preventScroll: true});
  }
  function pointerEnd(event) {
    if (drag?.pointerId !== event.pointerId) return;
    if (drag.active) { event.preventDefault(); drag.x = event.clientX; drag.y = event.clientY; if (event.type === 'pointerup') updateDrop(); }
    endDrag(event.type === 'pointerup');
  }
  function mount() {
    if (mounted) return true;
    const page = byId('page-dashboard'); model = window.WFHomeLayout;
    if (!page || !model || !window.WFHomeDock) return false;
    panel = node('div', 'dash-dock-panel wf-home-customizer'); panel.id = 'wfHomeCustomizer';
    panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-labelledby', 'wfHomeCustomizerTitle'); panel.setAttribute('aria-describedby', 'wfHomeCustomizerHint');
    const header = node('div', 'dash-dock-toolbar');
    title = label('strong', 'title'); title.id = 'wfHomeCustomizerTitle'; title.tabIndex = -1;
    const swap = button('', 'dash-dock-move', () => dock.swapSide()); swap.id = 'wfHomeCustomizerMove'; swap.textContent = '⇆';
    const close = button('', 'wf-home-editor-close', cancel); close.id = 'wfHomeCustomizerClose'; close.textContent = '×'; header.append(title, swap, close);
    body = node('div', 'dash-dock-layout wf-home-editor-body');
    summary = node('p', 'wf-home-editor-count'); body.append(summary);
    const hint = label('p', 'hint', 'wf-home-editor-hint'); hint.id = 'wfHomeCustomizerHint'; body.append(hint);
    const keyboard = label('p', 'keyboard', 'wf-home-editor-live'); keyboard.id = 'wfHomeCustomizerKeyboard'; body.append(keyboard);
    emptyHint = label('p', 'allHidden', 'wf-home-editor-empty'); emptyHint.hidden = true; body.append(emptyHint);
    list = node('div', 'wf-home-editor-grid'); list.id = 'wfHomeCustomizerSections'; list.setAttribute('role', 'list'); body.append(list);
    model.get().order.forEach(buildTile);
    const tools = node('div', 'wf-home-editor-tools');
    advancedButton = button('advanced', 'wf-home-editor-advanced', () => setAdvanced(!advanced)); advancedButton.id = 'wfHomeCustomizerAdvanced';
    advancedButton.setAttribute('aria-expanded', 'false'); advancedButton.setAttribute('aria-controls', list.id);
    const reset = button('', 'wf-home-editor-reset', () => changed(() => session.reset(), 'resetDone'), 'reset'); reset.id = 'wfHomeCustomizerReset'; tools.append(advancedButton, reset);
    const footer = node('footer', 'wf-home-editor-footer');
    status = node('p', 'wf-home-editor-status'); status.id = 'wfHomeCustomizerStatus'; status.setAttribute('role', 'alert'); status.hidden = true; body.insertBefore(status, body.firstChild);
    const draftHint = label('p', 'draftHint', 'wf-home-editor-hint'); draftHint.id = 'wfHomeCustomizerDraftHint';
    const actions = node('div', 'wf-home-editor-actions'), cancelButton = button('cancel', '', cancel), saveButton = button('save', 'is-primary', save);
    cancelButton.id = 'wfHomeCustomizerCancel'; saveButton.id = 'wfHomeCustomizerSave'; actions.append(cancelButton, saveButton); footer.append(tools, draftHint, actions);
    live = node('p', 'wf-home-editor-live'); live.setAttribute('role', 'status'); live.setAttribute('aria-live', 'polite'); live.setAttribute('aria-atomic', 'true');
    panel.append(header, body, footer, live); dock = window.WFHomeDock.create({panel, onOpen: begin, onClose: finish}); editButton = dock.trigger;
    editButton.setAttribute('aria-haspopup', 'dialog');
    panel.addEventListener('click', event => { if (Date.now() < suppressClickUntil && event.detail !== 0) { event.preventDefault(); event.stopImmediatePropagation(); } }, true);
    list.addEventListener('lostpointercapture', event => { if (event.target === list && drag?.pointerId === event.pointerId) endDrag(false); });
    window.addEventListener('pointermove', pointerMove, {passive: false}); window.addEventListener('pointerup', pointerEnd, {passive: false}); window.addEventListener('pointercancel', pointerEnd);
    document.addEventListener('pointerdown', event => { if (drag && event.pointerId !== drag.pointerId) endDrag(false); }, true);
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && editing() && (drag || selected)) { event.preventDefault(); event.stopImmediatePropagation(); endDrag(false); clearSelection(); announce('selectionCancelled'); }
    }, true);
    window.addEventListener('blur', () => endDrag(false)); document.addEventListener('visibilitychange', () => { if (document.hidden) endDrag(false); });
    window.addEventListener('resize', () => endDrag(false), {passive: true}); window.visualViewport?.addEventListener('resize', () => endDrag(false), {passive: true});
    mounted = true; translate(); registerGuard(); new MutationObserver(translate).observe(document.documentElement, {attributes: true, attributeFilter: ['lang']}); return true;
  }
  window.WFHomeCustomizer = {open, close: cancel, isOpen: () => !!dock?.isOpen()};
  document.addEventListener('wf-home-layout-edit', open); window.addEventListener('wf-home-layout-ready', mount);
  window.addEventListener('wf-home-layout-change', event => { if (mounted && event.detail?.prefs) counter(event.detail.prefs); });
  document.addEventListener('DOMContentLoaded', () => { mount(); registerGuard(); }, {once: true}); mount();
})();
