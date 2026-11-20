/* Company sections navigate inside the existing settings window. */
(() => {
  'use strict';
  const languages = ['ar', 'en', 'tr', 'fr', 'ru'];
  const copy = {
    hubHint: ['اختر القسم الذي تريد تعديله. لكل قسم معاينته وحفظه المستقل.', 'Choose a section to edit. Preview and save each section independently.', 'Düzenlemek istediğiniz bölümü seçin. Her bölümü ayrı önizleyip kaydedin.', 'Choisissez une rubrique. Prévisualisez et enregistrez chaque rubrique séparément.', 'Выберите раздел. Просматривайте и сохраняйте изменения в каждом разделе отдельно.'],
    basic: ['البيانات الأساسية', 'Basic information', 'Temel bilgiler', 'Informations générales', 'Основные сведения'],
    basicHint: ['اسم الشركة والعنوان ووسائل التواصل', 'Company name, address and contact details', 'Şirket adı, adres ve iletişim bilgileri', 'Nom, adresse et coordonnées de l’entreprise', 'Название, адрес и контакты компании'],
    logo: ['الشعار والهوية', 'Logo and identity', 'Logo ve kimlik', 'Logo et identité', 'Логотип и оформление'],
    logoHint: ['الشعار وشكله وحجمه وخلفيته مع معاينة مباشرة', 'Logo, shape, size and background with a live preview', 'Canlı önizleme ile logo, şekil, boyut ve arka plan', 'Logo, forme, taille et fond avec aperçu immédiat', 'Логотип, форма, размер и фон с предпросмотром'],
    registrationHint: ['الرقم الضريبي والدائرة الضريبية ورقم MERSİS', 'Tax number, tax office and MERSİS number', 'Vergi numarası, vergi dairesi ve MERSİS numarası', 'Numéro fiscal, centre des impôts et numéro MERSİS', 'Налоговый номер, инспекция и номер MERSİS'],
    marksHint: ['رفع الختم والتوقيع ومعاينة ظهورهما في الفاتورة', 'Upload the stamp and signature and preview them on invoices', 'Kaşe ve imza yükleyin, faturadaki görünümü önizleyin', 'Importer le cachet et la signature et voir leur rendu sur la facture', 'Загрузите печать и подпись и проверьте их вид в счёте'],
    back: ['رجوع', 'Back', 'Geri', 'Retour', 'Назад'],
    save: ['حفظ التغييرات', 'Save changes', 'Değişiklikleri kaydet', 'Enregistrer les modifications', 'Сохранить изменения'],
    saving: ['جارٍ الحفظ…', 'Saving…', 'Kaydediliyor…', 'Enregistrement…', 'Сохранение…'],
    registration: ['بيانات التسجيل الضريبي', 'Tax registration', 'Vergi kaydı', 'Immatriculation fiscale', 'Налоговая регистрация'],
    taxNumber: ['الرقم الضريبي (Vergi No)', 'Tax number (Vergi No)', 'Vergi No', 'Numéro fiscal (Vergi No)', 'Налоговый номер (Vergi No)'],
    taxOffice: ['الدائرة الضريبية', 'Tax office', 'Vergi dairesi', 'Centre des impôts', 'Налоговая инспекция'],
    bank: ['الحسابات البنكية', 'Bank accounts', 'Banka hesapları', 'Comptes bancaires', 'Банковские счета'],
    bankHint: ['اسم البنك والمستفيد وبيانات الحساب وIBAN', 'Bank, beneficiary, account details and IBAN', 'Banka, lehtar, hesap bilgileri ve IBAN', 'Banque, bénéficiaire, coordonnées du compte et IBAN', 'Банк, получатель, реквизиты счёта и IBAN'],
    edit: ['تعديل', 'Edit', 'Düzenle', 'Modifier', 'Изменить'],
    saveBank: ['حفظ البيانات البنكية', 'Save bank details', 'Banka bilgilerini kaydet', 'Enregistrer les coordonnées bancaires', 'Сохранить банковские реквизиты'],
    cancel: ['إلغاء', 'Cancel', 'İptal', 'Annuler', 'Отмена'],
    marks: ['الختم والتوقيع', 'Stamp and signature', 'Kaşe ve imza', 'Cachet et signature', 'Печать и подпись'],
    signature: ['التوقيع', 'Signature', 'İmza', 'Signature', 'Подпись'],
    stamp: ['ختم الشركة', 'Company stamp', 'Şirket kaşesi', 'Cachet de l’entreprise', 'Печать компании'],
    artworkHint: ['يظهر التوقيع فوق الختم في الفاتورة. اختر صورة بخلفية شفافة أو بيضاء بصيغة PNG أو JPG أو WebP، حتى 5 ميغابايت لكل صورة.', 'The signature appears above the stamp on invoices. Use a transparent or white background. PNG, JPG or WebP, up to 5 MB each.', 'Faturada imza kaşenin üzerinde görünür. Şeffaf veya beyaz arka planlı PNG, JPG ya da WebP kullanın. Görsel başına en fazla 5 MB.', 'La signature apparaît au-dessus du cachet sur la facture. Utilisez un fond transparent ou blanc. PNG, JPG ou WebP, 5 Mo par image.', 'Подпись располагается над печатью в счёте. Используйте прозрачный или белый фон. PNG, JPG или WebP, до 5 МБ на изображение.'],
    choose: ['اختيار صورة', 'Choose image', 'Görsel seç', 'Choisir une image', 'Выбрать изображение'],
    remove: ['إزالة', 'Remove', 'Kaldır', 'Retirer', 'Удалить'],
    preview: ['معاينة الفاتورة', 'Invoice preview', 'Fatura önizlemesi', 'Aperçu de la facture', 'Вид в счёте'],
    numberInvalid: ['أدخل رقمًا صالحًا.', 'Enter a valid number.', 'Geçerli bir sayı girin.', 'Saisissez un nombre valide.', 'Введите допустимое число.'],
    loading: ['جارٍ تجهيز الصورة…', 'Preparing image…', 'Görsel hazırlanıyor…', 'Préparation de l’image…', 'Подготовка изображения…'],
    invalid: ['تعذرت قراءة الصورة. اختر PNG أو JPG أو WebP بحجم لا يتجاوز 5 ميغابايت.', 'Could not read the image. Choose a PNG, JPG or WebP up to 5 MB.', 'Görsel okunamadı. En fazla 5 MB boyutunda PNG, JPG veya WebP seçin.', 'Image illisible. Choisissez un PNG, JPG ou WebP de 5 Mo maximum.', 'Не удалось прочитать изображение. Выберите PNG, JPG или WebP до 5 МБ.']
  };
  const word = (key, lang) => copy[key][Math.max(0, languages.indexOf(lang))];
  const fields = {
    company: ['companyName', 'address', 'phone', 'email', 'website', 'mersis', 'taxNumber', 'taxOffice'],
    basic: ['companyName', 'address', 'phone', 'email', 'website'],
    registration: ['mersis', 'taxNumber', 'taxOffice'],
    bank: ['bankName', 'beneficiary', 'ibanUSD', 'ibanTRY', 'ibanEUR', 'swift', 'accountNo'],
    invoice: ['authPerson', 'defaultNotes', 'prefixExt', 'nextNoExt', 'prefixRet', 'nextNoRet', 'prefixWhl', 'nextNoWhl', 'kdvRate'],
    currency: ['manualUsdTry', 'manualUsdEur']
  };
  const idOf = key => 'st' + key.charAt(0).toUpperCase() + key.slice(1);
  function fieldChanges(scope, baseline, values) {
    const patch = {};
    for (const key of fields[scope] || []) {
      if (!(key in values) || !(key in baseline) || values[key] === baseline[key]) continue;
      const value = String(values[key]).trim();
      if (key.startsWith('nextNo') || key === 'kdvRate' || key.startsWith('manualUsd')) {
        if (key.startsWith('manualUsd') && !value) { patch[key] = null; continue; }
        const number = Number(value);
        if (!value || !Number.isFinite(number) || number < 0 || (key === 'kdvRate' && number > 100) || (key.startsWith('manualUsd') && number === 0) || (key.startsWith('nextNo') && (!Number.isSafeInteger(number) || number < 1))) {
          throw new RangeError(key);
        }
        patch[key] = number;
      } else patch[key] = value;
    }
    return patch;
  }
  // A company section owns only these fields; hidden drafts cannot leak into a save.
  function sectionChanges(section, baseline, values) {
    if (['basic', 'registration', 'bank'].includes(section)) return fieldChanges(section, baseline, values);
    const patch = {};
    if (section === 'logo') {
      const branding = {};
      for (const key of ['logoShape', 'logoSize', 'logoBackground']) {
        if (values.branding && key in values.branding && values.branding[key] !== baseline.branding?.[key]) branding[key] = values.branding[key];
      }
      if (Object.keys(branding).length) patch.branding = branding;
      if ('logo' in values && values.logo !== undefined && values.logo !== baseline.logo) patch.logo = values.logo;
    }
    if (section === 'marks') {
      for (const key of ['signature', 'stamp']) {
        if (key in values && values[key] !== undefined && values[key] !== baseline[key]) patch[key] = values[key];
      }
    }
    return patch;
  }
  function mergeSettings(stored, patch) {
    const next = { ...stored, ...patch, id: 'main' };
    if (patch.branding) next.branding = { ...stored?.branding, ...patch.branding };
    return next;
  }
  const hasColor = value => typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value);
  function documentLogoStyle(settings) {
    const brand = settings?.branding;
    if (!brand || !(brand.logoSize || brand.logoShape || hasColor(brand.logoBackground))) return '';
    const size = brand.logoSize === 'compact' ? 48 : brand.logoSize === 'large' ? 68 : 58;
    const radius = brand.logoShape === 'circle' ? '50%' : brand.logoShape === 'square' ? '2px' : '14px';
    const inset = brand.logoShape === 'circle' ? Math.round(size * .15) : 5;
    return 'width:'+size+'px;height:'+size+'px;box-sizing:border-box;overflow:hidden;border-radius:'+radius+';padding:'+inset+'px;background:'+(hasColor(brand.logoBackground) ? brand.logoBackground : '#ffffff')+';';
  }
  function taxLines(settings, lang) {
    return ['taxNumber', 'taxOffice'].filter(key => settings?.[key] != null && String(settings[key]).trim())
      .map(key => [word(key, lang), String(settings[key]).trim()]);
  }
  function taxHTML(settings, lang, escape = wfEsc) {
    return taxLines(settings, lang).map(([label, value]) => '<br>'+label+' <bdi dir="auto">'+escape(value)+'</bdi>').join('');
  }
  function safeArtwork(value) {
    return typeof value === 'string' && value.length <= 4600000 && /^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(value) ? value : '';
  }
  function marksHTML(settings, lang) {
    const keys = ['signature','stamp'].filter(key => safeArtwork(settings?.[key]));
    if (!keys.length) return '';
    const height = keys.length === 1 ? '100%' : '50%';
    return '<div style="position:absolute;inset:17px 3px 3px;display:flex;flex-direction:column;align-items:center;background:white;overflow:hidden;">' +
      keys.map(key => '<div style="width:100%;height:'+height+';min-height:0;"><img alt="'+word(key,lang)+'" src="'+settings[key]+'" style="display:block;width:100%;height:100%;object-fit:contain;"></div>').join('') + '</div>';
  }
  function validateFile(file) {
    if (!file || !['image/png','image/jpeg','image/webp'].includes(file.type) || !(file.size > 0 && file.size <= 5 * 1024 * 1024)) throw new Error('invalid');
  }
  async function readArtwork(file) {
    validateFile(file);
    const url = URL.createObjectURL(file);
    try {
      const image = new Image();
      image.src = url;
      await image.decode();
      if (!image.naturalWidth || !image.naturalHeight || image.naturalWidth * image.naturalHeight > 24000000) throw new Error('invalid');
      const scale = Math.min(1, 896 / Math.max(image.naturalWidth, image.naturalHeight));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
      const src = canvas.toDataURL('image/png');
      if (!safeArtwork(src)) throw new Error('invalid');
      return src;
    } finally { URL.revokeObjectURL(url); }
  }

  async function commitPatch(state, patch, writeBatch, hydrate) {
    if (!Object.keys(patch).length) return;
    const before = { ...state.settings };
    const [row] = await writeBatch([{type:'merge',store:'settings',id:'main',value:patch,merge:mergeSettings}]);
    const latest = await hydrate(row);
    // A different editor can publish during media hydration after our commit.
    const concurrent = Object.fromEntries(Object.entries(state.settings).filter(([key,value]) => before[key] !== value));
    state.settings = mergeSettings(mergeSettings(before, latest), concurrent);
  }
  const api = { commitPatch, fieldChanges, sectionChanges, mergeSettings, taxLines, taxHTML, marksHTML, documentLogoStyle, validateFile };
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (typeof document === 'undefined') return;
  const byId = id => document.getElementById(id);
  const company = byId('stab-company'), bank = byId('stab-bank'), branding = byId('wfBrandingSettings');
  if (!company || !bank || !branding) return;
  const settingsPage = byId('page-settings'), parentDialog = byId('wfSettingsDialog');
  const settingsSaveButton = parentDialog?.querySelector('button[onclick="saveSettings()"]') || settingsPage.querySelector('button[onclick="saveSettings()"]');
  const lang = () => document.documentElement.lang || 'ar';
  const node = (tag, cls) => { const el = document.createElement(tag); if (cls) el.className = cls; return el; };
  const labels = [];
  function label(tag, key, cls) {
    const el = node(tag, cls);
    labels.push([el, key]);
    el.textContent = word(key, lang());
    return el;
  }
  function button(key, callback, cls) {
    const el = node('button', cls || 'btn btn-s');
    el.append(label('span', key));
    el.type = 'button'; el.addEventListener('click', callback);
    return el;
  }
  function icon(paths, cls) {
    const el = node('span', cls || 'wf-company-icon');
    el.setAttribute('aria-hidden', 'true');
    el.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">'+paths+'</svg>';
    return el;
  }
  const basic = node('section', 'wf-company-section'), basicGrid = node('div', 'fgrid');
  basic.id = 'wfCompanyBasic'; basic.append(basicGrid);
  for (const key of fields.basic) {
    const group = byId(idOf(key))?.closest('.fg');
    if (group) { group.classList.toggle('wf-company-field-wide', key === 'companyName' || key === 'address'); basicGrid.append(group); }
  }
  const taxCard = node('section', 'wf-company-section'), taxGrid = node('div', 'fgrid');
  taxCard.id = 'wfCompanyRegistration'; taxCard.append(taxGrid);
  for (const key of ['taxNumber', 'taxOffice']) {
    const group = node('div', 'fg'), title = label('label', key, 'fl'), input = node('input', 'fc');
    title.htmlFor = input.id = idOf(key);
    input.type = 'text'; input.dir = key === 'taxNumber' ? 'ltr' : 'auto'; input.maxLength = key === 'taxNumber' ? 48 : 120;
    if (key === 'taxNumber') input.inputMode = 'numeric';
    group.append(title, input); taxGrid.append(group);
  }
  const mersis = byId('stMersis')?.closest('.fg');
  if (mersis) taxGrid.append(mersis);
  byId('wf-settings-tab-bank')?.classList.add('wf-company-nested-bank');
  bank.querySelector('.wf-settings-panel-title')?.remove();
  bank.removeAttribute('role'); bank.removeAttribute('aria-labelledby');
  const marks = node('section', 'wf-company-section wf-company-marks'), tools = node('div', 'wf-company-art-tools'), proof = node('div', 'wf-company-art-proof');
  marks.id = 'wfCompanyMarks';
  const drawings = node('div', 'wf-company-art-paper');
  proof.append(label('small', 'preview'), drawings);
  marks.append(label('p', 'artworkHint'), tools, proof);
  const status = node('p', 'wf-company-art-status'); status.setAttribute('role', 'status'); marks.append(status);
  const logoStatus = node('p', 'wf-company-art-status'); logoStatus.setAttribute('role', 'status'); branding.append(logoStatus);
  const pending = new Map(), artChanges = {}, rev = {}, removeButtons = {}, preview = {};
  let baseline = {}, uploading = false, writing = false, activeSession = null;
  for (const key of ['signature', 'stamp']) {
    const group = node('div', 'wf-company-art-input'), caption = label('strong', key), picker = node('label', 'btn btn-s wf-company-art-picker'), input = node('input');
    input.type = 'file'; input.accept = 'image/png,image/jpeg,image/webp'; input.id = 'wfCompanyFile-'+key;
    caption.id = input.id+'-title'; const choose = label('span', 'choose'); choose.id = input.id+'-choose';
    input.setAttribute('aria-labelledby', caption.id+' '+choose.id); picker.append(choose, input);
    const clear = button('remove', () => { if (busy()) return; rev[key] = (rev[key] || 0)+1; deletePending(key); artChanges[key] = ''; refreshArtwork(); });
    clear.id = input.id+'-clear'; clear.setAttribute('aria-labelledby', clear.id+' '+caption.id);
    removeButtons[key] = clear; group.append(caption, picker, clear); tools.append(group);
    const slot = node('div', 'wf-company-art-slot'), img = node('img'), placeholder = label('span', key);
    img.alt = ''; slot.append(img, placeholder); drawings.append(slot); preview[key] = { img, placeholder };
    input.addEventListener('change', () => upload(key, input));
  }
  const logoInput = branding.querySelector('input[type="file"]'), logoPreview = byId('settingsLogoPrev');
  logoInput.removeAttribute('onchange'); logoInput.accept = 'image/png,image/jpeg,image/webp';
  logoInput.addEventListener('change', () => upload('logo', logoInput));
  const resetLogo = branding.querySelector('button[onclick="resetSettingsLogo()"]');
  resetLogo?.addEventListener('click', event => {
    event.stopImmediatePropagation();
    if (busy()) return;
    rev.logo = (rev.logo || 0)+1; deletePending('logo');
    setLogo(DEFAULT_WOW_LOGO); logoStatus.textContent = '';
  }, true);

  const hub = node('section', 'wf-company-hub'), tileGrid = node('div', 'wf-company-tiles'), storage = node('div');
  hub.id = 'wfCompanyHub'; storage.id = 'wfCompanySectionStore'; storage.hidden = true;
  hub.append(label('p', 'hubHint', 'wf-company-hub-hint'), tileGrid);
  const sections = {
    basic: { title: 'basic', hint: 'basicHint', panel: basic, paths: '<path d="M4 21V5l8-3v19M4 9h8M4 13h8M16 8h5v13M16 12h5M16 16h5M2 21h21"/>' },
    logo: { title: 'logo', hint: 'logoHint', panel: branding, paths: '<rect x="3" y="3" width="18" height="18" rx="4"/><circle cx="8" cy="8" r="1.5"/><path d="m3 16 5-5 4 4 3-3 6 6"/>' },
    registration: { title: 'registration', hint: 'registrationHint', panel: taxCard, paths: '<rect x="3" y="4" width="18" height="16" rx="3"/><path d="M7 8h3M7 12h10M7 16h7M15 8h2"/>' },
    marks: { title: 'marks', hint: 'marksHint', panel: marks, paths: '<path d="M5 21h14M4 17h16v4H4zM8 17v-3l2-3V6a2 2 0 0 1 4 0v5l2 3v3M8 14h8"/>' },
    bank: { title: 'bank', hint: 'bankHint', panel: bank, paths: '<path d="m3 8 9-5 9 5v2H3zM5 10v8M10 10v8M14 10v8M19 10v8M3 18h18v3H3z"/>' }
  };
  for (const [key, section] of Object.entries(sections)) {
    const tile = node('button', 'wf-company-tile');
    tile.type = 'button'; tile.id = key === 'bank' ? 'wfCompanyOpenBank' : 'wfCompanyOpen-'+key;
    tile.dataset.companySection = key;
    tile.setAttribute('aria-expanded', 'false'); tile.setAttribute('aria-controls', 'wfCompanySectionDialog');
    const text = node('span', 'wf-company-tile-copy'), title = label('strong', section.title), hint = label('small', section.hint);
    title.id = tile.id+'-title'; hint.id = tile.id+'-hint';
    tile.setAttribute('aria-labelledby', title.id); tile.setAttribute('aria-describedby', hint.id);
    text.append(title, hint);
    tile.append(icon(section.paths), text, icon('<path d="m9 5 7 7-7 7"/>', 'wf-company-chevron'));
    tile.addEventListener('click', () => openSection(key));
    tileGrid.append(tile); section.tile = tile; storage.append(section.panel);
    section.panel.classList.add('wf-company-editor-panel');
  }
  company.classList.add('wf-company-hub-panel');
  company.setAttribute('aria-labelledby', 'wfSettingsDialogTitle');
  // Preserve the ID used by the colour/branding integrations, without creating
  // another modal or top-layer surface. The outer settings dialog owns focus.
  const editor = node('section', 'wf-company-editor'); editor.id = 'wfCompanySectionDialog'; editor.hidden = true;
  editor.setAttribute('aria-labelledby', 'wfCompanySectionTitle'); editor.setAttribute('aria-describedby', 'wfCompanySectionHint');
  const editorHeader = node('header'), editorTitles = node('div', 'wf-company-editor-titles');
  const editorTitle = node('h2'), editorHint = node('p');
  editorTitle.id = 'wfCompanySectionTitle'; editorHint.id = 'wfCompanySectionHint';
  const back = button('back', requestClose, 'btn btn-s wf-company-back');
  back.id = 'wfCompanySectionBack';
  back.prepend(icon('<path d="m15 5-7 7 7 7"/>', 'wf-company-back-icon'));
  editorTitles.append(editorTitle, editorHint); editorHeader.append(back, editorTitles);
  const editorBody = node('div', 'wf-company-editor-body'), footer = node('footer');
  const cancel = button('cancel', requestClose), saveButton = button('save', saveSection, 'btn btn-p');
  cancel.id = 'wfCompanySectionCancel';
  saveButton.id = 'wfCompanySectionSave';
  footer.append(cancel, saveButton); editor.append(editorHeader, editorBody, footer); company.replaceChildren(hub, editor, storage);

  function setLogo(src) {
    wfPendingSettingsLogo = src;
    const img = node('img'); img.alt = ''; img.src = src; logoPreview.replaceChildren(img);
  }
  function busy() { return writing || uploading; }
  function notifyActions() { window.dispatchEvent(new CustomEvent('wf-settings-actions-change')); }
  function syncBusy() {
    back.disabled = cancel.disabled = saveButton.disabled = busy();
    editorBody.inert = busy();
    editor.setAttribute('aria-busy', String(busy()));
    saveButton.querySelector('span').textContent = word(writing ? 'saving' : 'save', lang());
    notifyActions();
  }
  function deletePending(key) { pending.delete(key); uploading = pending.size > 0; syncBusy(); }
  async function upload(key, input) {
    const file = input.files?.[0]; input.value = '';
    if (!file || busy()) return;
    const token = rev[key] = (rev[key] || 0)+1;
    const feedback = key === 'logo' ? logoStatus : status;
    feedback.textContent = word('loading', lang());
    const task = readArtwork(file);
    pending.set(key, task); uploading = true; syncBusy();
    try {
      const src = await task;
      if (token !== rev[key]) return;
      if (key === 'logo') setLogo(src);
      else { artChanges[key] = src; refreshArtwork(); }
      feedback.textContent = '';
    } catch (_) {
      if (token === rev[key]) feedback.textContent = word('invalid', lang());
    } finally {
      if (token === rev[key]) deletePending(key);
    }
  }
  function refreshArtwork() {
    let images = 0;
    for (const key of ['signature', 'stamp']) {
      const src = safeArtwork(artChanges[key] ?? S.settings[key]);
      const {img, placeholder} = preview[key];
      if (src) { img.src = src; images++; } else img.removeAttribute('src');
      img.hidden = !src; placeholder.hidden = !!src; removeButtons[key].hidden = !src;
    }
    drawings.dataset.single = String(images === 1);
  }
  function valuesFor(scope) {
    const values = {};
    for (const key of fields[scope] || []) {
      const field = byId(idOf(key));
      if (field) values[key] = field.value;
    }
    return values;
  }
  function sectionValues(key, opening) {
    if (key === 'logo') return { branding: window.WFCompanyBranding.getDraft(), logo: wfPendingSettingsLogo ?? (opening ? opening.logo : S.settings.logo) };
    if (key === 'marks') return Object.fromEntries(['signature', 'stamp'].map(name => [name, artChanges[name] ?? (opening ? opening[name] : S.settings[name])]));
    return valuesFor(key);
  }
  function openSection(key) {
    if (activeSession || busy() || !parentDialog?.open) return;
    const section = sections[key]; if (!section) return;
    const session = { key, values: sectionValues(key), saved: false };
    if (key === 'logo') {
      session.branding = window.WFCompanyBranding.snapshot();
      session.pendingLogo = wfPendingSettingsLogo;
      session.logoNodes = [...logoPreview.childNodes].map(child => child.cloneNode(true));
      logoStatus.textContent = '';
    }
    if (key === 'marks') { session.artChanges = { ...artChanges }; status.textContent = ''; }
    activeSession = session; editor.dataset.companySection = key;
    editorTitle.textContent = word(section.title, lang()); editorHint.textContent = word(section.hint, lang());
    session.scrollTop = parentDialog.querySelector('.wf-settings-content')?.scrollTop || 0;
    hub.hidden = true; editor.hidden = false; section.tile.setAttribute('aria-expanded', 'true');
    company.classList.add('wf-company-editing'); parentDialog.classList.add('wf-company-section-active');
    editorBody.append(section.panel); section.panel.style.removeProperty('display');
    editorBody.scrollTop = 0; syncBusy(); back.focus({ preventScroll: true });
  }
  function requestClose() { if (!busy()) closeSection(); }
  function restoreSection(session) {
    for (const [key, value] of Object.entries(valuesFor(session.key))) {
      if (key in session.values) byId(idOf(key)).value = session.values[key];
    }
    if (session.key === 'logo') {
      wfPendingSettingsLogo = session.pendingLogo;
      logoPreview.replaceChildren(...session.logoNodes);
      window.WFCompanyBranding.restore(session.branding); logoStatus.textContent = '';
    }
    if (session.key === 'marks') {
      delete artChanges.signature; delete artChanges.stamp;
      Object.assign(artChanges, session.artChanges); status.textContent = ''; refreshArtwork();
    }
    window.WFCompanyBranding.refresh();
  }
  function closeSection({ restoreFocus = true } = {}) {
    const session = activeSession; if (!session) return;
    // Restore the colour picker's visual-only preview before rolling back the
    // branding draft, otherwise its later close could repaint a stale colour.
    if (session.key === 'logo') window.WFColorPicker?.close();
    const uploads = session.key === 'logo' ? ['logo'] : session.key === 'marks' ? ['signature', 'stamp'] : [];
    for (const key of uploads) { rev[key] = (rev[key] || 0)+1; pending.delete(key); }
    uploading = pending.size > 0;
    if (!session.saved) restoreSection(session);
    const section = sections[session.key]; storage.append(section.panel); section.panel.style.display = 'none';
    window.WFAppUpdates?.markClean(section.panel);
    activeSession = null; delete editor.dataset.companySection;
    editor.hidden = true; hub.hidden = false; section.tile.setAttribute('aria-expanded', 'false');
    company.classList.remove('wf-company-editing'); parentDialog?.classList.remove('wf-company-section-active');
    const content = parentDialog?.querySelector('.wf-settings-content'); if (content) content.scrollTop = session.scrollTop;
    syncBusy();
    if (restoreFocus && parentDialog?.open && settingsPage.classList.contains('active') && company.style.display !== 'none') section.tile.focus({ preventScroll: true });
  }
  parentDialog?.addEventListener('cancel', event => {
    if (!activeSession) return;
    event.preventDefault();
    requestClose();
  });
  parentDialog?.addEventListener('close', () => closeSection({ restoreFocus: false }));
  const originalSwitchTab = window.switchTab;
  if (typeof originalSwitchTab === 'function') window.switchTab = function(key, ...args) {
    if (activeSession && key !== 'company') closeSection({ restoreFocus: false });
    return originalSwitchTab.call(this, key, ...args);
  };
  new MutationObserver(() => {
    if (activeSession && (company.hidden || company.style.display === 'none')) closeSection({ restoreFocus: false });
  }).observe(company, { attributes: true, attributeFilter: ['style', 'hidden'] });

  const persist = patch => commitPatch(S, patch, wfWriteBatch, wfHydrateDBValue);
  async function saveSection() {
    if (!activeSession || busy()) return false;
    const session = activeSession, key = session.key;
    const patch = sectionChanges(key, session.values, sectionValues(key, session.values));
    writing = true; syncBusy();
    let saved = false;
    try {
      saved = await wfRunSave('saveCompanySection', async () => { await persist(patch); return true; });
      if (saved) {
        // A requested atomic save may finish after the user closes/navigates.
        // Refresh only this section's committed fields, without reopening it
        // or overwriting an unrelated draft in another settings section.
        if (activeSession !== session) for (const field of fields[key] || []) {
          const input = byId(idOf(field)); if (input) input.value = S.settings[field] ?? '';
        }
        Object.assign(baseline, valuesFor(key));
        if (key === 'logo') { wfPendingSettingsLogo = undefined; window.WFCompanyBranding.reload(); }
        if (key === 'marks') { delete artChanges.signature; delete artChanges.stamp; refreshArtwork(); }
        window.WFCompanyBranding.refresh();
        session.saved = true;
      }
    } finally { writing = false; syncBusy(); }
    if (saved) { if (activeSession === session) closeSection(); showToast(t('settings_saved'), 'ok'); }
    return saved;
  }
  function load() {
    for (const key of ['stamp', 'signature', 'logo']) rev[key] = (rev[key] || 0)+1;
    pending.clear(); uploading = false; logoStatus.textContent = status.textContent = '';
    delete artChanges.signature; delete artChanges.stamp;
    for (const key of ['taxNumber', 'taxOffice']) byId(idOf(key)).value = S.settings[key] ?? '';
    baseline = Object.assign({}, ...['company', 'bank', 'invoice', 'currency'].map(valuesFor));
    refreshArtwork(); syncBusy();
  }
  let formLoaded = false;
  const originalLoad = window.loadSettingsToForm;
  window.loadSettingsToForm = function(...args) {
    // Keep the open editor's snapshot and preview stable during unrelated refreshes.
    if (activeSession) return;
    const result = originalLoad.apply(this, args); load(); formLoaded = true; return result;
  };
  new MutationObserver(() => {
    if (!settingsPage.classList.contains('active')) {
      formLoaded = false;
      closeSection({ restoreFocus: false });
      return;
    }
    if (!formLoaded && !activeSession) window.loadSettingsToForm();
  }).observe(settingsPage, { attributes: true, attributeFilter: ['class'] });
  async function save() {
    if (activeSession) return saveSection();
    if (busy() || !parentDialog?.open) return false;
    const section = document.querySelector('#page-settings .tab-btn.active')?.id?.replace('wf-settings-tab-', '');
    // The company hub has no global save. Its inline sections commit their own fields.
    if (!['bank', 'invoice', 'currency'].includes(section)) return false;
    let patch;
    try { patch = fieldChanges(section, baseline, valuesFor(section)); }
    catch (error) {
      const field = byId(idOf(error.message)); if (!field) throw error;
      field.focus(); field.setCustomValidity(word('numberInvalid', lang())); field.reportValidity(); field.setCustomValidity(''); return false;
    }
    writing = true;
    const content = parentDialog.querySelector('.wf-settings-content'); if (content) content.inert = true;
    notifyActions();
    try {
      await persist(patch); Object.assign(baseline, valuesFor(section));
      if (patch.manualUsdTry > 0) S.usdTry = patch.manualUsdTry;
      if (patch.manualUsdEur > 0) S.usdEur = patch.manualUsdEur;
      updateRateUI(); updateKdvDisplay(); parentDialog.close(); showToast(t('settings_saved'), 'ok'); return true;
    } finally { writing = false; if (content) content.inert = false; notifyActions(); }
  }
  function cancelFields(section) {
    if (busy() || activeSession || !parentDialog?.open || !settingsPage.classList.contains('active')) return false;
    const selected = document.querySelector('#page-settings .tab-btn.active')?.id?.replace('wf-settings-tab-', '');
    if (selected !== section) return false;
    for (const key of fields[section] || []) {
      const input = byId(idOf(key));
      if (input && key in baseline) input.value = baseline[key];
    }
    window.WFAppUpdates?.markClean(byId('stab-' + section));
    notifyActions();
    return true;
  }
  function getSettingsActions() {
    if (!settingsPage.classList.contains('active') || !parentDialog?.open) return null;
    if (activeSession) {
      if (editor.hidden || company.hidden || company.style.display === 'none') return null;
      const session = activeSession;
      return { key: 'company:' + session.key, scope: editor, save: saveButton, cancel,
        dirty: Object.keys(sectionChanges(session.key, session.values, sectionValues(session.key, session.values))).length > 0,
        busy: busy() };
    }
    const section = document.querySelector('#page-settings .tab-btn.active')?.id?.replace('wf-settings-tab-', '');
    if (!['bank', 'invoice', 'currency'].includes(section) || !settingsSaveButton) return null;
    const scope = byId('stab-' + section);
    if (!scope || scope.hidden || scope.style.display === 'none') return null;
    let dirty;
    try { dirty = Object.keys(fieldChanges(section, baseline, valuesFor(section))).length > 0; }
    catch (_) { dirty = true; }
    return { key: 'company:' + section, scope, save: settingsSaveButton, cancel: () => cancelFields(section), dirty, busy: busy() };
  }
  function translate() {
    // Translation can rebuild other settings labels/controls. Finish the local
    // edit transaction first so a previous-language draft cannot survive it.
    closeSection();
    for (const [el, key] of labels) el.textContent = word(key, lang());
    syncBusy();
  }
  new MutationObserver(translate).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
  window.WFCompanyIdentity = { ...api, save, getSettingsActions };
  load();
  document.addEventListener('DOMContentLoaded', () => {
    window.WFAppUpdates?.registerGuard('company-settings', () => {
      if (busy()) return true;
      if (!settingsPage.classList.contains('active')) return false;
      if (Object.keys(artChanges).length || Object.keys(window.WFCompanyBranding.changes()).length || (wfPendingSettingsLogo !== undefined && wfPendingSettingsLogo !== (S.settings.logo || DEFAULT_WOW_LOGO))) return true;
      return ['company', 'bank', 'invoice', 'currency'].some(scope => Object.entries(valuesFor(scope)).some(([key, value]) => baseline[key] !== value));
    });
  }, { once: true });
})();
