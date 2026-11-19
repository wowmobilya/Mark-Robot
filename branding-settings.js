/* Company identity controls reuse the existing fields, upload handlers and Save. */
(() => {
  'use strict';
  const panel = document.getElementById('stab-company');
  const identity = panel?.querySelector('.wf-company-identity');
  const nameField = document.getElementById('stCompanyName');
  const logo = document.getElementById('settingsLogoPrev');
  if (!identity || !nameField || !logo || document.getElementById('wfBrandingSettings')) return;

  const copy = {
    ar: { preview: 'معاينة الهوية', shape: 'شكل الشعار في البرنامج', size: 'حجم الشعار', rounded: 'حواف ناعمة', square: 'مربع', circle: 'دائري', compact: 'صغير', normal: 'عادي', large: 'كبير', hint: 'رتّب الشعار واسم الشركة، ثم اضغط حفظ لاعتماد التغييرات.' },
    en: { preview: 'Identity preview', shape: 'Logo shape in the app', size: 'Logo size', rounded: 'Rounded', square: 'Square', circle: 'Circle', compact: 'Compact', normal: 'Normal', large: 'Large', hint: 'Arrange your logo and company name, then choose Save to apply your changes.' },
    tr: { preview: 'Kimlik önizlemesi', shape: 'Uygulamadaki logo şekli', size: 'Logo boyutu', rounded: 'Yuvarlatılmış', square: 'Kare', circle: 'Daire', compact: 'Küçük', normal: 'Normal', large: 'Büyük', hint: 'Logoyu ve şirket adını düzenleyin, ardından değişiklikleri uygulamak için Kaydet’i seçin.' },
    fr: { preview: 'Aperçu de l’identité', shape: 'Forme du logo dans l’application', size: 'Taille du logo', rounded: 'Arrondi', square: 'Carré', circle: 'Cercle', compact: 'Compact', normal: 'Normal', large: 'Grand', hint: 'Ajustez le logo et le nom de l’entreprise, puis enregistrez vos modifications.' },
    ru: { preview: 'Предпросмотр оформления', shape: 'Форма логотипа в приложении', size: 'Размер логотипа', rounded: 'Скруглённый', square: 'Квадрат', circle: 'Круг', compact: 'Маленький', normal: 'Обычный', large: 'Большой', hint: 'Настройте логотип и название компании, затем нажмите «Сохранить».' }
  };
  const shapes = ['rounded', 'square', 'circle'];
  const sizes = ['compact', 'normal', 'large'];
  const textNodes = [];
  let dirty = false;
  let saving = false;
  function storedPreferences() {
    const value = S.settings.branding;
    return {
      logoShape: shapes.includes(value?.logoShape) ? value.logoShape : 'rounded',
      logoSize: sizes.includes(value?.logoSize) ? value.logoSize : 'normal'
    };
  }
  let draft = storedPreferences();
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
  const hint = translated('p', 'hint', 'wf-branding-hint');
  hint.id = 'wfBrandingHint';
  section.append(hint);

  function companyName() {
    return String(S.settings.companyName || 'WOW Furniture').trim() || 'WOW Furniture';
  }
  function syncPreview() {
    section.dataset.logoShape = draft.logoShape;
    section.dataset.logoSize = draft.logoSize;
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
    draft = storedPreferences();
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
    if (!dirty) draft = storedPreferences();
    applyStored();
    translate();
    syncPreview();
    return result;
  };
  const originalSave = window.saveSettings;
  if (typeof originalSave === 'function') window.saveSettings = async function (...args) {
    if (saving) return false;
    saving = true;
    controls.forEach(([input]) => { input.disabled = true; });
    const originalSettings = S.settings;
    const previous = originalSettings.branding;
    const hadPreferences = Object.hasOwn(originalSettings, 'branding');
    const staged = { ...previous, ...draft };
    // The guarded original save synchronously snapshots S.settings before its
    // first await. Stage only for that snapshot, so backups/readers cannot see an
    // uncommitted preference while IndexedDB is pending.
    try {
      let pending;
      originalSettings.branding = staged;
      try { pending = originalSave.apply(this, args); }
      finally {
        if (S.settings === originalSettings && originalSettings.branding === staged) {
          if (hadPreferences) originalSettings.branding = previous;
          else delete originalSettings.branding;
        }
      }
      const result = await pending;
      // The original function replaces S.settings only after the transaction
      // commits. Keep that committed state even if a later UI refresh fails.
      const committed = S.settings !== originalSettings && S.settings.branding === staged;
      if (result !== false || committed) dirty = false;
      applyStored();
      return result;
    } catch (error) {
      applyStored();
      throw error;
    } finally {
      saving = false;
      controls.forEach(([input]) => { input.disabled = false; });
    }
  };
  translate();
  applyStored();
  syncPreview();
})();
