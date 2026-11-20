/* Home presentation preferences. Existing cards and business renderers keep ownership
   of their content; this module owns only visibility, placement and presentation size. */
(function (root) {
  'use strict';
  const keys = Object.freeze(['welcome', 'sales', 'metrics', 'rates', 'recent', 'insights']);
  const storageKey = 'wf.dashboard.layout.v1';
  const legacyKey = 'wf.dashboard.hiddenSections';
  function defaults() {
    return { version: 1, order: [...keys], hidden: [],
      sizes: Object.fromEntries(keys.map(key => [key, key === 'insights' ? 'wide' : 'normal'])) };
  }
  function normalize(value) {
    const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
    const fallback = defaults();
    const order = [...new Set((Array.isArray(source.order) ? source.order : []).filter(key => keys.includes(key)).concat(keys))];
    const hidden = keys.filter(key => Array.isArray(source.hidden) && source.hidden.includes(key));
    const sizes = Object.fromEntries(keys.map(key => [key,
      ['normal', 'wide'].includes(source.sizes?.[key]) ? source.sizes[key] : fallback.sizes[key]]));
    return { version: 1, order, hidden, sizes };
  }
  function readPreferences(storage) {
    try {
      const saved = storage?.getItem(storageKey);
      // An existing primary record remains authoritative, including a damaged one.
      // Legacy choices are migrated only when the primary record does not exist.
      if (saved != null) {
        try { return normalize(JSON.parse(saved)); } catch (_) { return defaults(); }
      }
      const legacy = JSON.parse(storage?.getItem(legacyKey) || 'null');
      return normalize({ hidden: Array.isArray(legacy) ? legacy : [] });
    } catch (_) { return defaults(); }
  }
  function createModel(storage, apply = () => {}, announce = () => {}) {
    let committed = readPreferences(storage);
    function present(prefs, preview) {
      const next = normalize(prefs);
      apply(normalize(next));
      announce({ prefs: normalize(next), preview });
      return normalize(next);
    }
    return {
      get: () => normalize(committed),
      preview: prefs => present(prefs, true),
      save(prefs) {
        const next = normalize(prefs);
        if (!storage || typeof storage.setItem !== 'function') throw new Error('HOME_LAYOUT_STORAGE_UNAVAILABLE');
        // A failed write must not replace the saved layout or publish a successful save.
        storage.setItem(storageKey, JSON.stringify(next));
        committed = next;
        return present(committed, false);
      },
      restore: () => present(committed, false)
    };
  }
  const languages = ['ar', 'en', 'tr', 'fr', 'ru'];
  const copy = {
    metrics: ['إحصاءات النشاط', 'Activity and shortcuts', 'Etkinlik ve kısayollar', 'Activité et raccourcis', 'Активность и быстрые действия'],
    emptyTitle: ['رتّب الرئيسية على طريقتك', 'Make this home your own', 'Ana sayfanızı düzenleyin', 'Composez votre accueil', 'Настройте главную страницу'],
    emptyText: ['البطاقات مخفية الآن. افتح التعديل لاختيار ما تريد عرضه.', 'Your cards are hidden. Open Edit to choose what appears here.', 'Kartlar gizli. Burada görünecek kartları Düzenle ile seçin.', 'Vos cartes sont masquées. Ouvrez Modifier pour choisir les éléments à afficher.', 'Карточки скрыты. Откройте редактирование и выберите нужные разделы.'],
    edit: ['تعديل الرئيسية', 'Edit home', 'Ana sayfayı düzenle', 'Modifier l’accueil', 'Изменить главную']
  };
  function mount(doc, win, suppliedStorage) {
    if (win.WFHomeLayout) return win.WFHomeLayout;
    const dashboard = doc.getElementById('page-dashboard');
    if (!dashboard) return null;
    const regions = new Map([
      ['welcome', dashboard.querySelector('.wf-greeting-flip')],
      ['sales', dashboard.querySelector('.wf-dash-sales')],
      ['metrics', dashboard.querySelector('.stats-grid')],
      ['rates', doc.getElementById('wfDashRates')],
      ['recent', dashboard.querySelector('.wf-dash-primary')],
      ['insights', dashboard.querySelector('.wf-dash-secondary')]
    ]);
    const oldContainers = [dashboard.querySelector('.wf-dash-overview'), dashboard.querySelector('.wf-dash-workspace')].filter(Boolean);
    const layout = doc.createElement('div');
    layout.id = 'wfHomeLayout'; layout.className = 'wf-home-layout';
    dashboard.insertBefore(layout, oldContainers[0] || dashboard.firstElementChild);
    let metricsTitle;
    const originalMetrics = regions.get('metrics');
    if (originalMetrics) {
      const section = doc.createElement('section');
      section.id = 'wfHomeMetrics'; section.className = 'wf-home-metrics';
      metricsTitle = doc.createElement('h2'); metricsTitle.id = 'wfHomeMetricsTitle';
      section.setAttribute('aria-labelledby', metricsTitle.id);
      // The activity controls used to be nested inside Sales. Keep the exact controls,
      // but let their own section own visibility instead of inheriting Sales visibility.
      originalMetrics.classList.remove('dashboard-off');
      section.append(metricsTitle, originalMetrics);
      regions.set('metrics', section);
    }
    for (const key of keys) {
      const region = regions.get(key); if (!region) continue;
      if (!region.id) region.id = 'wfHomeSection-' + key;
      region.classList.add('wf-home-section'); region.dataset.homeSection = key;
      layout.append(region);
    }
    for (const container of oldContainers) {
      if (!container.children.length) { container.hidden = true; container.classList.add('wf-home-retired'); }
    }
    const empty = doc.createElement('section'); empty.id = 'wfHomeLayoutEmpty'; empty.className = 'wf-home-empty';
    const emptyTitle = doc.createElement('h2'), emptyText = doc.createElement('p'), edit = doc.createElement('button');
    emptyTitle.id = 'wfHomeLayoutEmptyTitle'; empty.setAttribute('aria-labelledby', emptyTitle.id);
    edit.type = 'button'; edit.className = 'btn btn-p';
    edit.addEventListener('click', () => doc.dispatchEvent(new win.CustomEvent('wf-home-layout-edit', { bubbles: true })));
    empty.append(emptyTitle, emptyText, edit); layout.after(empty);
    dashboard.classList.add('wf-home-customized');
    function translate() {
      const language = Math.max(0, languages.indexOf(doc.documentElement.lang || 'ar'));
      if (metricsTitle) metricsTitle.textContent = copy.metrics[language];
      emptyTitle.textContent = copy.emptyTitle[language]; emptyText.textContent = copy.emptyText[language];
      edit.textContent = copy.edit[language];
    }
    function apply(prefs) {
      const focused = doc.activeElement, keepFocus = layout.contains(focused);
      let index = 0, visible = 0;
      for (const key of prefs.order) {
        const region = regions.get(key); if (!region) continue;
        if (layout.children[index] !== region) layout.insertBefore(region, layout.children[index] || null);
        index++;
        const hidden = prefs.hidden.includes(key);
        region.hidden = hidden; region.inert = hidden;
        region.classList.toggle('dashboard-off', hidden);
        region.dataset.homeSize = prefs.sizes[key];
        if (!hidden) visible++;
      }
      layout.hidden = visible === 0; empty.hidden = visible !== 0;
      layout.dataset.visibleCount = String(visible);
      if (keepFocus && focused.isConnected && !focused.closest('[hidden],[inert]') && doc.activeElement !== focused) focused.focus({ preventScroll: true });
    }
    let storage = suppliedStorage;
    if (storage === undefined) { try { storage = win.localStorage; } catch (_) {} }
    const model = createModel(storage, apply, detail => win.dispatchEvent(new win.CustomEvent('wf-home-layout-change', { detail })));
    const api = { keys, defaults, normalize, get: model.get, preview: model.preview, save: model.save,
      restore: model.restore, element: key => regions.get(key) || null };
    win.WFHomeLayout = api;
    translate(); model.restore();
    if (win.MutationObserver) new win.MutationObserver(translate).observe(doc.documentElement, { attributes: true, attributeFilter: ['lang'] });
    win.dispatchEvent(new win.CustomEvent('wf-home-layout-ready', { detail: { prefs: model.get() } }));
    return api;
  }
  if (typeof module === 'object' && module.exports) module.exports = { keys, storageKey, legacyKey, defaults, normalize, readPreferences, createModel, mount };
  if (typeof document !== 'undefined') mount(document, root);
})(typeof window === 'undefined' ? globalThis : window);
