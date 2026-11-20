/* Home layout editing is a draft transaction. This surface never copies live
   dashboard cards or writes business data; WFHomeLayout owns the saved layout. */
(function () {
  'use strict';
  const languages = ['ar', 'en', 'tr', 'fr', 'ru'];
  const copy = {
    home: ['الرئيسية', 'Home', 'Ana sayfa', 'Accueil', 'Главная'],
    edit: ['تعديل', 'Edit', 'Düzenle', 'Modifier', 'Изменить'],
    title: ['تعديل الصفحة الرئيسية', 'Edit your home page', 'Ana sayfayı düzenle', 'Modifier l’accueil', 'Настроить главную'],
    hint: ['اسحب الأقسام من المقبض لترتيبها، أو استخدم أزرار التحريك.', 'Drag sections by their handle, or use the move buttons.', 'Bölümleri tutamacından sürükleyin veya taşıma düğmelerini kullanın.', 'Faites glisser les sections par leur poignée ou utilisez les boutons de déplacement.', 'Перетаскивайте разделы за ручку или используйте кнопки перемещения.'],
    preview: ['ترتيب الأقسام', 'Section layout', 'Bölüm düzeni', 'Disposition des sections', 'Порядок разделов'],
    previewHint: ['اختر ما يظهر لك وعرض كل قسم، ثم احفظ الترتيب.', 'Choose which sections appear and their width, then save your layout.', 'Görünen bölümleri ve genişliklerini seçip düzeni kaydedin.', 'Choisissez les sections visibles et leur largeur, puis enregistrez.', 'Выберите видимые разделы и их ширину, затем сохраните порядок.'],
    count: ['{shown} من {total} أقسام ظاهرة', '{shown} of {total} sections visible', '{total} bölümden {shown} görünür', '{shown} sections visibles sur {total}', 'Видно разделов: {shown} из {total}'],
    allHidden: ['كل الأقسام مخفية. يمكنك إظهارها هنا في أي وقت من زر «تعديل».', 'All sections are hidden. You can show them again here using Edit.', 'Tüm bölümler gizli. Düzenle düğmesiyle burada yeniden gösterebilirsiniz.', 'Toutes les sections sont masquées. Le bouton Modifier permet de les réafficher ici.', 'Все разделы скрыты. Нажмите «Изменить», чтобы снова показать их.'],
    welcome: ['البطاقة الذكية', 'Smart card', 'Akıllı kart', 'Carte intelligente', 'Умная карточка'],
    sales: ['ملخص المبيعات', 'Sales summary', 'Satış özeti', 'Résumé des ventes', 'Сводка продаж'],
    metrics: ['الأرقام السريعة', 'Quick figures', 'Hızlı rakamlar', 'Chiffres clés', 'Основные показатели'],
    rates: ['أسعار الصرف', 'Exchange rates', 'Döviz kurları', 'Taux de change', 'Курсы валют'],
    recent: ['آخر الفواتير', 'Recent invoices', 'Son faturalar', 'Factures récentes', 'Последние счета'],
    insights: ['تحليلات العمل', 'Business insights', 'İş analizleri', 'Analyses de l’activité', 'Аналитика бизнеса'],
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
    return {key: target.key, after, index: candidates.indexOf(target) + (after ? 1 : 0)};
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
  let model, session, dialog, toolbar, body, list, status, live, summary, emptyHint, title, editButton, returnFocus;
  let mounted = false, guarded = false, writing = false, errorKey = '', drag = null, autoFrame = 0, suppressClickUntil = 0;
  const texts = [], tiles = new Map();
  function label(tag, key, className) {
    const element = node(tag, className); texts.push([element, key]); return element;
  }
  function button(key, className, action, iconName) {
    const element = node('button', 'wf-home-editor-button ' + (className || '')); element.type = 'button';
    if (iconName) element.append(icon(iconName));
    if (key) element.append(label('span', key));
    if (action) element.addEventListener('click', action);
    return element;
  }
  function announce(key, values) { live.textContent = t(key, values); }
  function counter(prefs) {
    const value = t('count', {shown: number(prefs.order.length - prefs.hidden.length), total: number(prefs.order.length)});
    toolbar.querySelector('.wf-home-toolbar-count').textContent = value;
    summary.textContent = value;
  }
  function registerGuard() {
    if (!guarded && window.WFAppUpdates?.registerGuard) {
      window.WFAppUpdates.registerGuard('home-customizer', () => writing || !!session?.dirty());
      guarded = true;
    }
  }
  function draw() {
    const prefs = session?.get(); if (!prefs) return;
    const focused = document.activeElement, restoreFocus = list.contains(focused);
    prefs.order.forEach((key, index) => {
      const item = tiles.get(key), visible = !prefs.hidden.includes(key), wide = prefs.sizes[key] === 'wide';
      if (list.children[index] !== item.card) list.insertBefore(item.card, list.children[index] || null);
      item.card.dataset.size = wide ? 'wide' : 'normal'; item.card.dataset.visible = String(visible);
      item.rank.textContent = number(index + 1);
      item.visibility.setAttribute('aria-checked', String(visible));
      item.visibility.setAttribute('aria-label', t('show', {name: t(key)}));
      item.visibility.title = t(visible ? 'hide' : 'show', {name: t(key)});
      item.visibilityIcon.replaceChildren(icon(visible ? 'eye' : 'eyeOff'));
      item.visibilityLabel.textContent = t(visible ? 'visible' : 'hidden');
      item.widths.forEach((control, i) => control.setAttribute('aria-pressed', String(wide === (i === 1))));
      item.up.setAttribute('aria-disabled', String(index === 0));
      item.down.setAttribute('aria-disabled', String(index === prefs.order.length - 1));
    });
    if (restoreFocus && focused.isConnected && document.activeElement !== focused) focused.focus({preventScroll: true});
    counter(prefs); emptyHint.hidden = prefs.hidden.length !== prefs.order.length;
  }
  function changed(action, announcement, values) {
    if (!session?.get()) return;
    endDrag(false);
    if (action() === false) return;
    errorKey = ''; status.textContent = ''; status.hidden = true;
    draw(); if (announcement) announce(announcement, values);
  }
  function move(key, delta) {
    const prefs = session?.get(); if (!prefs) return;
    const target = prefs.order.indexOf(key) + delta;
    if (target < 0 || target >= prefs.order.length) return;
    changed(() => session.move(key, target), 'moved', {name: t(key), position: number(target + 1), total: number(prefs.order.length)});
  }
  function miniature(key) {
    const preview = node('div', 'wf-home-section-preview wf-home-section-preview--' + key);
    preview.setAttribute('aria-hidden', 'true');
    const count = key === 'welcome' ? 2 : key === 'recent' ? 3 : 4;
    for (let i = 0; i < count; i++) {
      const part = node('span', 'wf-home-preview-part');
      part.append(node('i'), node('b')); preview.append(part);
    }
    return preview;
  }
  function buildTile(key) {
    const card = node('article', 'wf-home-section-tile'); card.dataset.section = key; card.setAttribute('role', 'listitem');
    const header = node('div', 'wf-home-section-heading'), handle = button('', 'wf-home-drag-handle', null, 'grip');
    handle.dataset.section = key; handle.setAttribute('aria-describedby', 'wfHomeCustomizerHint');
    handle.addEventListener('pointerdown', event => pointerStart(event, key, handle));
    handle.addEventListener('lostpointercapture', () => { if (drag?.handle === handle) endDrag(false); });
    handle.addEventListener('keydown', event => {
      if (!['ArrowUp', 'ArrowDown'].includes(event.key)) return;
      event.preventDefault(); event.stopPropagation(); if (!event.repeat) move(key, event.key === 'ArrowUp' ? -1 : 1);
    });
    handle.addEventListener('click', event => { if (event.detail === 0) announce('keyboard'); });
    const heading = node('div', 'wf-home-section-name'), name = label('h3', key), description = label('p', key + 'Hint');
    name.id = 'wfHomeSectionTitle-' + key; card.setAttribute('aria-labelledby', name.id);
    heading.append(name, description);
    const rank = node('span', 'wf-home-section-rank'); rank.setAttribute('aria-hidden', 'true');
    header.append(handle, icon(key), heading, rank);
    const controls = node('div', 'wf-home-section-controls');
    const visibility = button('', 'wf-home-visibility', () => {
      changed(() => session.toggle(key), 'visibilityChanged', {name: t(key), state: t(session.get().hidden.includes(key) ? 'visible' : 'hidden')});
    });
    visibility.setAttribute('role', 'switch');
    const visibilityIcon = node('span'), visibilityLabel = node('span'); visibility.append(visibilityIcon, visibilityLabel);
    const widths = node('div', 'wf-home-width-options'); widths.setAttribute('role', 'group');
    const widthButtons = ['normal', 'wide'].map(size => {
      const control = button(size, '', () => changed(() => session.resize(key, size), 'widthChanged', {name: t(key), width: t(size)}));
      widths.append(control); return control;
    });
    controls.append(visibility, widths);
    const moves = node('div', 'wf-home-move-controls');
    const up = button('', '', () => move(key, -1), 'up'), down = button('', '', () => move(key, 1), 'down');
    moves.append(up, down); controls.append(moves);
    card.append(header, miniature(key), controls); list.append(card);
    tiles.set(key, {card, handle, rank, visibility, visibilityIcon, visibilityLabel, widthGroup: widths, widths: widthButtons, up, down});
  }
  function translate() {
    if (!mounted) return;
    for (const [element, key] of texts) element.textContent = t(key);
    dialog.dir = lang() === 'ar' ? 'rtl' : 'ltr';
    byId('wfHomeCustomizerClose').setAttribute('aria-label', t('close'));
    for (const [key, item] of tiles) {
      for (const control of ['handle', 'up', 'down']) {
        const caption = t(control === 'handle' ? 'drag' : control, {name: t(key)});
        item[control].setAttribute('aria-label', caption); item[control].title = caption;
      }
      item.widthGroup.setAttribute('aria-label', t('width', {name: t(key)}));
    }
    status.textContent = errorKey ? t(errorKey) : '';
    if (session?.get()) draw(); else counter(model.get());
  }
  function restoreFocus() {
    const target = returnFocus?.isConnected ? returnFocus : editButton;
    if (target?.isConnected) target.focus({preventScroll: true});
    returnFocus = null;
  }
  function finish() {
    endDrag(false);
    if (session?.get()) session.cancel();
    errorKey = ''; status.textContent = ''; status.hidden = true; live.textContent = '';
    document.documentElement.classList.remove('wf-home-customizer-open');
    counter(model.get()); restoreFocus();
  }
  function cancel() {
    if (!dialog?.open) return false;
    endDrag(false); session?.cancel(); dialog.close('cancel'); return true;
  }
  function save() {
    if (writing || !session?.get()) return;
    endDrag(false); writing = true;
    try {
      session.save(); dialog.close('save');
      window.showToast?.(t('saved'), 'ok');
    } catch (_) {
      errorKey = 'error'; status.textContent = t('error'); status.hidden = false;
    } finally { writing = false; }
  }
  function open() {
    if (!mount()) return false;
    registerGuard();
    if (dialog.open) { title.focus({preventScroll: true}); return true; }
    returnFocus = document.activeElement;
    session = createSession(model); session.begin(); errorKey = ''; status.hidden = true; status.textContent = ''; live.textContent = '';
    translate(); body.scrollTop = 0;
    dialog.showModal(); document.documentElement.classList.add('wf-home-customizer-open');
    title.focus({preventScroll: true}); return true;
  }
  function clearDrop() {
    for (const item of tiles.values()) item.card.classList.remove('is-drop-before', 'is-drop-after');
  }
  function updateDrop() {
    if (!drag?.active) return;
    const rectangles = [...tiles].map(([key, item]) => ({key, ...(() => {
      const rect = item.card.getBoundingClientRect(); return {left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom};
    })()}));
    drag.target = dropTarget(session.get().order, drag.key, rectangles, {x: drag.x, y: drag.y}, lang() === 'ar');
    clearDrop();
    if (drag.target) tiles.get(drag.target.key).card.classList.add(drag.target.after ? 'is-drop-after' : 'is-drop-before');
  }
  function autoScroll() {
    if (!drag?.active) return;
    const rect = body.getBoundingClientRect(), edge = Math.min(64, (rect.bottom - rect.top) / 4);
    const direction = drag.y < rect.top + edge ? -Math.min(18, (rect.top + edge - drag.y) * .3) : drag.y > rect.bottom - edge ? Math.min(18, (drag.y - rect.bottom + edge) * .3) : 0;
    if (direction) { const before = body.scrollTop; body.scrollTop += direction; if (body.scrollTop !== before) updateDrop(); }
    autoFrame = window.requestAnimationFrame(autoScroll);
  }
  function pointerStart(event, key, handle) {
    if (!dialog.open || !session?.get() || event.isPrimary === false || event.button !== 0 || event.target.closest('button') !== handle) return;
    endDrag(false);
    drag = {key, handle, pointerId: event.pointerId, x: event.clientX, y: event.clientY, startX: event.clientX, startY: event.clientY, active: false, target: null};
    try { handle.setPointerCapture(event.pointerId); } catch (_) {}
  }
  function pointerMove(event) {
    if (!drag || drag.pointerId !== event.pointerId) return;
    drag.x = event.clientX; drag.y = event.clientY;
    if (!drag.active && Math.hypot(drag.x - drag.startX, drag.y - drag.startY) < 6) return;
    event.preventDefault();
    if (!drag.active) {
      drag.active = true;
      const ghost = node('div', 'wf-home-drag-ghost'); ghost.setAttribute('aria-hidden', 'true');
      const name = node('strong'); name.textContent = t(drag.key); ghost.append(icon(drag.key), name, icon('grip'));
      dialog.append(ghost); drag.ghost = ghost; tiles.get(drag.key).card.classList.add('is-dragging');
      list.classList.add('is-dragging'); autoFrame = window.requestAnimationFrame(autoScroll);
    }
    drag.ghost.style.left = Math.max(8, Math.min(window.innerWidth - 260, drag.x - 120)) + 'px';
    drag.ghost.style.top = Math.max(8, Math.min(window.innerHeight - 72, drag.y - 30)) + 'px';
    updateDrop();
  }
  function endDrag(commit) {
    if (!drag) return;
    const current = drag; drag = null;
    window.cancelAnimationFrame(autoFrame); autoFrame = 0;
    current.ghost?.remove(); tiles.get(current.key)?.card.classList.remove('is-dragging'); list?.classList.remove('is-dragging'); clearDrop();
    try { current.handle.releasePointerCapture(current.pointerId); } catch (_) {}
    if (!current.active) return;
    suppressClickUntil = Date.now() + 350;
    if (commit && current.target && session?.get()) {
      const total = session.get().order.length;
      changed(() => session.move(current.key, current.target.index), 'moved', {name: t(current.key), position: number(current.target.index + 1), total: number(total)});
    }
    if (dialog.open) current.handle.focus({preventScroll: true});
  }
  function pointerEnd(event) {
    if (drag?.pointerId !== event.pointerId) return;
    if (drag.active) event.preventDefault();
    endDrag(event.type === 'pointerup');
  }
  function mount() {
    if (mounted) return true;
    const page = byId('page-dashboard'); model = window.WFHomeLayout;
    if (!page || !model) return false;
    toolbar = node('header', 'wf-home-toolbar'); toolbar.id = 'wfHomeToolbar';
    const heading = node('div', 'wf-home-toolbar-copy');
    heading.append(label('h1', 'home'), node('p', 'wf-home-toolbar-count'));
    editButton = button('edit', 'wf-home-edit-button', open, 'edit'); editButton.id = 'wfHomeEdit';
    editButton.setAttribute('aria-haspopup', 'dialog'); editButton.setAttribute('aria-controls', 'wfHomeCustomizer');
    toolbar.append(heading, editButton); page.insertBefore(toolbar, byId('wfHomeLayout') || page.firstChild);
    dialog = node('dialog', 'wf-home-customizer'); dialog.id = 'wfHomeCustomizer';
    dialog.setAttribute('aria-labelledby', 'wfHomeCustomizerTitle'); dialog.setAttribute('aria-describedby', 'wfHomeCustomizerHint');
    const header = node('header', 'wf-home-editor-header'), headingWrap = node('div', 'wf-home-editor-title');
    title = label('h2', 'title'); title.id = 'wfHomeCustomizerTitle'; title.tabIndex = -1;
    const hint = label('p', 'hint'); hint.id = 'wfHomeCustomizerHint'; headingWrap.append(title, hint);
    const close = button('', 'wf-home-editor-close', cancel, 'close'); close.id = 'wfHomeCustomizerClose';
    header.append(icon('layout'), headingWrap, close);
    body = node('div', 'wf-home-editor-body');
    const intro = node('div', 'wf-home-editor-intro'), introHeading = node('div');
    introHeading.append(label('h3', 'preview'), label('p', 'previewHint')); summary = node('span', 'wf-home-editor-count');
    intro.append(introHeading, summary); body.append(intro);
    emptyHint = label('p', 'allHidden', 'wf-home-editor-empty'); emptyHint.hidden = true; body.append(emptyHint);
    list = node('div', 'wf-home-editor-grid'); list.setAttribute('role', 'list'); body.append(list);
    model.get().order.forEach(buildTile);
    const footer = node('footer', 'wf-home-editor-footer');
    status = node('p', 'wf-home-editor-status'); status.id = 'wfHomeCustomizerStatus'; status.setAttribute('role', 'alert'); status.hidden = true;
    const reset = button('reset', 'wf-home-editor-reset', () => changed(() => session.reset(), 'resetDone'), 'reset'); reset.id = 'wfHomeCustomizerReset';
    const actions = node('div', 'wf-home-editor-actions'), cancelButton = button('cancel', '', cancel), saveButton = button('save', 'is-primary', save, 'check');
    cancelButton.id = 'wfHomeCustomizerCancel'; saveButton.id = 'wfHomeCustomizerSave'; actions.append(cancelButton, saveButton); footer.append(status, reset, actions);
    live = node('p', 'wf-home-editor-live'); live.setAttribute('role', 'status'); live.setAttribute('aria-live', 'polite'); live.setAttribute('aria-atomic', 'true');
    dialog.append(header, body, footer, live); document.body.append(dialog);
    dialog.addEventListener('cancel', event => { event.preventDefault(); cancel(); });
    dialog.addEventListener('close', () => { if (!dialog.open) finish(); });
    dialog.addEventListener('click', event => {
      if (Date.now() < suppressClickUntil && event.detail !== 0) { event.preventDefault(); event.stopImmediatePropagation(); }
    }, true);
    window.addEventListener('pointermove', pointerMove, {passive: false});
    window.addEventListener('pointerup', pointerEnd); window.addEventListener('pointercancel', pointerEnd);
    window.addEventListener('blur', () => endDrag(false));
    mounted = true; translate(); registerGuard();
    new MutationObserver(translate).observe(document.documentElement, {attributes: true, attributeFilter: ['lang']});
    return true;
  }
  window.WFHomeCustomizer = {open, close: cancel, isOpen: () => !!dialog?.open};
  document.addEventListener('wf-home-layout-edit', open);
  window.addEventListener('wf-home-layout-ready', mount);
  window.addEventListener('wf-home-layout-change', event => { if (mounted && event.detail?.prefs) counter(event.detail.prefs); });
  document.addEventListener('DOMContentLoaded', () => { mount(); registerGuard(); }, {once: true});
  mount();
})();
