/* Company identity controls reuse the existing fields, upload handlers and Save. */
(() => {
  'use strict';
  const panel = document.getElementById('stab-company');
  const identity = panel?.querySelector('.wf-company-identity');
  const nameField = document.getElementById('stCompanyName');
  const logo = document.getElementById('settingsLogoPrev');
  if (!identity || !nameField || !logo || document.getElementById('wfBrandingSettings')) return;

  const copy = {
    ar: { preview: 'معاينة الهوية', background: 'لون خلفية الشعار', shape: 'شكل شعار الشركة', size: 'حجم الشعار', rounded: 'حواف ناعمة', square: 'مربع', circle: 'دائري', compact: 'صغير', normal: 'عادي', large: 'كبير', hint: 'تظهر تعديلات الشعار هنا مباشرة. اضغط حفظ لاعتماد الشكل والحجم والخلفية.' },
    en: { preview: 'Identity preview', background: 'Logo background color', shape: 'Company logo shape', size: 'Logo size', rounded: 'Rounded', square: 'Square', circle: 'Circle', compact: 'Compact', normal: 'Normal', large: 'Large', hint: 'Logo changes appear here immediately. Choose Save to apply the shape, size and background.' },
    tr: { preview: 'Kimlik önizlemesi', background: 'Logo arka plan rengi', shape: 'Şirket logosunun şekli', size: 'Logo boyutu', rounded: 'Yuvarlatılmış', square: 'Kare', circle: 'Daire', compact: 'Küçük', normal: 'Normal', large: 'Büyük', hint: 'Logo değişiklikleri burada hemen görünür. Şekil, boyut ve arka planı uygulamak için Kaydet’i seçin.' },
    fr: { preview: 'Aperçu de l’identité', background: 'Couleur de fond du logo', shape: 'Forme du logo de l’entreprise', size: 'Taille du logo', rounded: 'Arrondi', square: 'Carré', circle: 'Cercle', compact: 'Compact', normal: 'Normal', large: 'Grand', hint: 'Les modifications du logo apparaissent immédiatement. Enregistrez pour appliquer la forme, la taille et le fond.' },
    ru: { preview: 'Предпросмотр оформления', background: 'Цвет фона логотипа', shape: 'Форма логотипа компании', size: 'Размер логотипа', rounded: 'Скруглённый', square: 'Квадрат', circle: 'Круг', compact: 'Маленький', normal: 'Обычный', large: 'Большой', hint: 'Изменения логотипа видны сразу. Сохраните, чтобы применить форму, размер и фон.' }
  };
  const shapes = ['rounded', 'square', 'circle'];
  const sizes = ['compact', 'normal', 'large'];
  const textNodes = [];
  let dirty = false;
  function storedPreferences() {
    const value = S.settings.branding;
    return {
      logoBackground: /^#[0-9a-f]{6}$/i.test(value?.logoBackground) ? value.logoBackground.toLowerCase() : '#ffffff',
      logoShape: shapes.includes(value?.logoShape) ? value.logoShape : 'rounded',
      logoSize: sizes.includes(value?.logoSize) ? value.logoSize : 'normal'
    };
  }
  let baseline = storedPreferences();
  let draft = { ...baseline };
  const section = document.createElement('section');
  section.id = 'wfBrandingSettings';
  section.className = 'wf-branding-settings';
  identity.before(section);
  section.append(identity);
  identity.classList.add('wf-branding-identity');
  const uploadActions = [...identity.children].find(child => child !== logo);
  uploadActions?.classList.add('wf-branding-upload-actions');

  function translated(tag, key, className) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    textNodes.push([node, key]);
    return node;
  }
  const previewCopy = document.createElement('div');
  previewCopy.className = 'wf-branding-preview-copy';
  const previewLabel = translated('small', 'preview');
  const previewName = document.createElement('strong');
  previewName.dir = 'auto';
  previewCopy.append(previewLabel, previewName);
  logo.after(previewCopy);
  const nameGroup = nameField.closest('.fg');
  if (nameGroup) {
    nameGroup.classList.add('wf-branding-name-field');
    section.append(nameGroup);
  }
  const options = document.createElement('div');
  options.className = 'wf-branding-options';
  section.append(options);
  const controls = [];
  for (const [key, labelKey, values] of [['logoShape', 'shape', shapes], ['logoSize', 'size', sizes]]) {
    const group = document.createElement('fieldset');
    group.className = 'wf-branding-group';
    group.append(translated('legend', labelKey));
    const choices = document.createElement('div');
    choices.className = 'wf-branding-choices';
    group.append(choices);
    for (const value of values) {
      const choice = document.createElement('label');
      choice.className = 'wf-branding-choice';
      const input = document.createElement('input');
      input.type = 'radio';
      input.name = 'wf-branding-' + key;
      input.value = value;
      input.checked = draft[key] === value;
      const symbol = document.createElement('span');
      symbol.className = 'wf-branding-choice-symbol';
      symbol.dataset.choice = value;
      symbol.setAttribute('aria-hidden', 'true');
      choice.append(input, symbol, translated('span', value));
      input.addEventListener('change', () => {
        if (!input.checked) return;
        draft = { ...draft, [key]: value };
        dirty = true;
        syncPreview();
      });
      controls.push([input, key, value]);
      choices.append(choice);
    }
    options.append(group);
  }
  const backgroundGroup = document.createElement('div');
  backgroundGroup.className = 'wf-branding-background';
  const colorLabel = translated('label', 'background');
  const color = document.createElement('input');
  color.type = 'color';
  color.id = 'wfCompanyLogoBackground';
  colorLabel.htmlFor = color.id;
  color.addEventListener('input', () => {
    draft = { ...draft, logoBackground: color.value };
    dirty = true;
    syncPreview();
  });
  backgroundGroup.append(colorLabel, color);
  options.append(backgroundGroup);
  const hint = translated('p', 'hint', 'wf-branding-hint');
  hint.id = 'wfBrandingHint';
  section.append(hint);

  function companyName() {
    return String(S.settings.companyName || 'WOW Furniture').trim() || 'WOW Furniture';
  }
  function syncPreview() {
    section.dataset.logoShape = draft.logoShape;
    section.dataset.logoSize = draft.logoSize;
    color.value = draft.logoBackground;
    logo.style.setProperty('background', draft.logoBackground, 'important');
    const name = nameField.value.trim() || companyName();
    if (previewName.textContent !== name) previewName.textContent = name;
    previewName.title = name;
    for (const [input, key, value] of controls) input.checked = draft[key] === value;
    const image = logo.querySelector('img');
    if (image) image.alt = '';
  }
  function setCompanyText(host, name, accentTag) {
    if (!host) return;
    host.dir = 'auto';
    host.title = name;
    host.setAttribute('aria-label', name);
    if (host.dataset.wfCompanyName === name) return;
    host.dataset.wfCompanyName = name;
    const words = name.split(/\s+/);
    const accent = document.createElement(accentTag);
    accent.textContent = words.shift();
    host.replaceChildren(accent, document.createTextNode(words.length ? ' ' + words.join(' ') : ''));
  }
  function applyStored() {
    // Application identity has its own settings. Company edits and upload
    // previews must never replace that independent navigation identity.
    if (window.WFAppIdentity) {
      window.WFAppIdentity.apply();
      return;
    }
    const preferences = storedPreferences();
    document.documentElement.dataset.wfBrandShape = preferences.logoShape;
    document.documentElement.dataset.wfBrandSize = preferences.logoSize;
    const name = companyName();
    // Only the name node changes; the independent page-position badge stays intact.
    setCompanyText(document.querySelector('.navbar .wf-nav-wordmark > bdi'), name, 'strong');
    setCompanyText(document.querySelector('#wfSidebarBrand > strong'), name, 'span');
    const navName = document.getElementById('navTitle');
    if (navName) {
      navName.title = name;
      navName.setAttribute('aria-label', name);
    }
  }
  function translate() {
    const labels = copy[document.documentElement.lang] || copy.en;
    for (const [node, key] of textNodes) node.textContent = labels[key];
    section.setAttribute('aria-label', labels.preview);
    const upload = uploadActions?.querySelector('input[type="file"]');
    const uploadLabel = uploadActions?.querySelector('button')?.textContent?.trim();
    if (upload && uploadLabel) upload.setAttribute('aria-label', uploadLabel);
  }
  function reloadPreferences() {
    baseline = storedPreferences();
    draft = { ...baseline };
    dirty = false;
    applyStored();
    syncPreview();
  }
  nameField.addEventListener('input', syncPreview);
  new MutationObserver(syncPreview).observe(logo, { childList: true, subtree: true, attributes: true, attributeFilter: ['src'] });
  const navLogo = document.getElementById('navLogo');
  if (navLogo) new MutationObserver(applyStored).observe(navLogo, { childList: true, subtree: true, attributes: true, attributeFilter: ['src'] });
  new MutationObserver(translate).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });

  const originalLoad = window.loadSettingsToForm;
  if (typeof originalLoad === 'function') window.loadSettingsToForm = function (...args) {
    const result = originalLoad.apply(this, args);
    reloadPreferences();
    return result;
  };
  const originalTranslate = window.applyTr;
  if (typeof originalTranslate === 'function') window.applyTr = function (...args) {
    const result = originalTranslate.apply(this, args);
    if (!dirty) { baseline = storedPreferences(); draft = { ...baseline }; }
    applyStored();
    translate();
    syncPreview();
    return result;
  };
  window.WFCompanyBranding = {
    changes: () => Object.fromEntries(Object.entries(draft).filter(([key, value]) => baseline[key] !== value)),
    getDraft: () => ({ ...draft }),
    snapshot: () => ({ baseline: { ...baseline }, draft: { ...draft }, dirty }),
    restore: snapshot => {
      baseline = { ...snapshot.baseline };
      draft = { ...snapshot.draft };
      dirty = snapshot.dirty;
      syncPreview();
    },
    refresh: syncPreview,
    reload: reloadPreferences
  };
  translate();
  applyStored();
  syncPreview();
})();
