/* Company details, local artwork and the bank editor share one settings row. */
(() => {
  'use strict';
  const languages = ['ar', 'en', 'tr', 'fr', 'ru'];
  const copy = {
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
  const api = { commitPatch, fieldChanges, mergeSettings, taxLines, taxHTML, marksHTML, documentLogoStyle, validateFile };
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (typeof document === 'undefined') return;
  const byId = id => document.getElementById(id);
  const company = byId('stab-company'), bank = byId('stab-bank'), branding = byId('wfBrandingSettings');
  if (!company || !bank || !branding) return;
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
    const el = label('button', key, cls || 'btn btn-s');
    el.type = 'button'; el.addEventListener('click', callback);
    return el;
  }
  const taxCard = node('section', 'card wf-company-section'), taxGrid = node('div', 'fgrid');
  taxCard.append(label('h3','registration'),taxGrid);
  for (const key of ['taxNumber','taxOffice']) {
    const group = node('div','fg'), title = label('label',key,'fl'), input = node('input','fc');
    title.htmlFor = input.id = idOf(key);
    input.type = 'text'; input.dir = key === 'taxNumber' ? 'ltr' : 'auto'; input.maxLength = key === 'taxNumber' ? 48 : 120;
    if (key === 'taxNumber') input.inputMode = 'numeric';
    group.append(title,input); taxGrid.append(group);
  }
  company.append(taxCard);

  const bankCard = node('section','card wf-company-section wf-company-bank'), bankSummary = node('div'), openBank = button('edit',openBankEditor);
  openBank.id = 'wfCompanyOpenBank'; openBank.setAttribute('aria-haspopup','dialog'); openBank.setAttribute('aria-labelledby','wfCompanyBankTitle wfCompanyOpenBank');
  const bankLabel = label('h3','bank'); bankLabel.id = 'wfCompanyBankTitle';
  bankSummary.append(bankLabel,label('p','bankHint')); bankCard.append(bankSummary,openBank); company.append(bankCard);
  const bankDialog = node('dialog','wf-company-bank-dialog'); bankDialog.id = 'wfCompanyBankDialog';
  bankDialog.setAttribute('aria-labelledby','wfCompanyBankDialogTitle');
  const bankTitle = label('h2','bank'); bankTitle.id = 'wfCompanyBankDialogTitle';
  const bankBody = node('div','wf-company-bank-body'), bankFooter = node('footer'), cancelBank = button('cancel',()=>bankDialog.close());
  const bankSave = button('saveBank', saveBankEditor, 'btn btn-p');
  bankFooter.append(cancelBank,bankSave); bankDialog.append(bankTitle,bankBody,bankFooter);
  byId('page-settings').append(bankDialog);
  const bankPlace = document.createComment('bank editor location'); bank.before(bankPlace);
  bank.setAttribute('aria-labelledby',bankTitle.id);
  byId('wf-settings-tab-bank')?.classList.add('wf-company-nested-bank');
  let bankOpening = {}, bankBusy = false;
  function openBankEditor() {
    if (bankDialog.open) return;
    bankOpening = valuesFor('bank');
    bankBody.append(bank); bank.style.display = 'block';
    bankDialog.showModal(); byId('stBankName').focus();
  }
  async function saveBankEditor() {
    if (bankBusy) return;
    bankBusy = true; bankSave.disabled = cancelBank.disabled = true;
    bank.inert = true;
    try {
      const saved = await wfRunSave('saveCompanyBank', async () => {
        await persist(fieldChanges('bank', baseline, valuesFor('bank')));
        bankOpening = valuesFor('bank'); Object.assign(baseline,bankOpening);
        return true;
      });
      if (saved) { bankDialog.close(); showToast(t('settings_saved'),'ok'); }
    } finally { bankBusy = false; bank.inert = false; bankSave.disabled = cancelBank.disabled = false; }
  }
  bankDialog.addEventListener('cancel', e => { if (bankBusy) e.preventDefault(); });
  bankDialog.addEventListener('close', () => {
    for (const [key,value] of Object.entries(bankOpening)) byId(idOf(key)).value = value;
    bankPlace.after(bank); bank.style.display = 'none';
    window.WFAppUpdates?.markClean(bank);
    if (byId('wfSettingsDialog')?.open) openBank.focus();
  });

  const marks = node('section','card wf-company-section wf-company-marks'), tools = node('div','wf-company-art-tools'), proof = node('div','wf-company-art-proof');
  const drawings = node('div','wf-company-art-paper');
  proof.append(label('small','preview'),drawings);
  marks.append(label('h3','marks'),label('p','artworkHint'),tools,proof); company.append(marks);
  const status = node('p','wf-company-art-status'); status.setAttribute('role','status'); marks.append(status);
  const logoStatus = node('p','wf-company-art-status'); logoStatus.setAttribute('role','status'); branding.append(logoStatus);
  const pending = new Map(), artChanges = {}, rev = {}, removeButtons = {}, preview = {};
  let baseline = {}, uploading = false, writing = false;
  for (const key of ['signature','stamp']) {
    const group = node('div','wf-company-art-input'), caption = label('strong',key), picker = node('label','btn btn-s wf-company-art-picker'), input = node('input');
    input.type = 'file'; input.accept = 'image/png,image/jpeg,image/webp'; input.id = 'wfCompanyFile-'+key;
    caption.id = input.id+'-title'; const choose = label('span','choose'); choose.id = input.id+'-choose';
    input.setAttribute('aria-labelledby',caption.id+' '+choose.id); picker.append(choose,input);
    const clear = button('remove',()=>{ rev[key] = (rev[key]||0)+1; deletePending(key); artChanges[key]=''; refreshArtwork(); });
    clear.id = input.id+'-clear'; clear.setAttribute('aria-labelledby',clear.id+' '+caption.id);
    removeButtons[key] = clear; group.append(caption,picker,clear); tools.append(group);
    const slot = node('div','wf-company-art-slot'), img = node('img'), placeholder = label('span',key);
    img.alt = ''; slot.append(img,placeholder); drawings.append(slot); preview[key] = { img,placeholder };
    input.addEventListener('change',()=>upload(key,input));
  }
  const logoInput = branding.querySelector('input[type="file"]'), logoPreview = byId('settingsLogoPrev');
  logoInput.removeAttribute('onchange'); logoInput.accept = 'image/png,image/jpeg,image/webp';
  logoInput.addEventListener('change',()=>upload('logo',logoInput));
  const resetLogo = branding.querySelector('button[onclick="resetSettingsLogo()"]');
  resetLogo?.addEventListener('click', event => {
    event.stopImmediatePropagation();
    rev.logo = (rev.logo||0)+1; deletePending('logo');
    setLogo(DEFAULT_WOW_LOGO); logoStatus.textContent = '';
  },true);
  function setLogo(src) {
    wfPendingSettingsLogo = src;
    const img = node('img'); img.alt = ''; img.src = src; logoPreview.replaceChildren(img);
  }
  function deletePending(key) { pending.delete(key); uploading = pending.size > 0; }
  async function upload(key,input) {
    const file = input.files?.[0]; input.value = '';
    if (!file || writing) return;
    const token = rev[key] = (rev[key]||0)+1;
    const feedback = key === 'logo' ? logoStatus : status;
    feedback.textContent = word('loading',lang());
    const task = readArtwork(file);
    pending.set(key, task); uploading = true;
    try {
      const src = await task;
      if (token !== rev[key]) return;
      if (key === 'logo') setLogo(src);
      else { artChanges[key] = src; refreshArtwork(); }
      feedback.textContent = '';
    } catch (_) {
      if (token === rev[key]) feedback.textContent = word('invalid',lang());
    } finally {
      if (token === rev[key]) deletePending(key);
    }
  }
  function refreshArtwork() {
    let images = 0;
    for (const key of ['signature','stamp']) {
      const src = safeArtwork(artChanges[key] ?? S.settings[key]);
      const {img,placeholder} = preview[key];
      if (src) { img.src = src; images++; } else img.removeAttribute('src');
      img.hidden = !src; placeholder.hidden = !!src; removeButtons[key].hidden = !src;
    }
    drawings.dataset.single = String(images === 1);
  }
  function valuesFor(scope) {
    const values = {};
    for (const key of fields[scope]) {
      const field = byId(idOf(key));
      if (field) values[key] = field.value;
    }
    return values;
  }
  function load() {
    for (const key of ['stamp','signature','logo']) rev[key] = (rev[key]||0)+1;
    pending.clear(); uploading = false; logoStatus.textContent = status.textContent = '';
    delete artChanges.signature; delete artChanges.stamp;
    for (const key of ['taxNumber','taxOffice']) byId(idOf(key)).value = S.settings[key] ?? '';
    baseline = Object.assign({},...Object.keys(fields).map(valuesFor));
    refreshArtwork();
  }
  let formLoaded = false;
  const settingsPage = byId('page-settings');
  const originalLoad = window.loadSettingsToForm;
  window.loadSettingsToForm = function(...args) {
    const result = originalLoad.apply(this,args); load(); formLoaded = true; return result;
  };
  new MutationObserver(() => {
    if (!settingsPage.classList.contains('active')) { formLoaded = false; return; }
    if (!formLoaded) window.loadSettingsToForm();
  }).observe(settingsPage,{attributes:true,attributeFilter:['class']});
  const persist = patch => commitPatch(S, patch, wfWriteBatch, wfHydrateDBValue);
  async function save() {
    if (writing || bankBusy) return false;
    if (uploading) { showToast(word('loading',lang()),'ok'); return false; }
    const dialog = byId('wfSettingsDialog');
    const section = document.querySelector('#page-settings .tab-btn.active')?.id?.replace('wf-settings-tab-','');
    const scopes = dialog?.open && fields[section] ? [section] : Object.keys(fields);
    const patch = {};
    for (const scope of scopes) {
      try { Object.assign(patch, fieldChanges(scope,baseline,valuesFor(scope))); }
      catch (error) {
        const field = byId(idOf(error.message)); if (!field) throw error;
        field.focus();
        field.setCustomValidity(word('numberInvalid',lang())); field.reportValidity(); field.setCustomValidity('');
        return false;
      }
    }
    if (scopes.includes('company')) {
      const prefs = window.WFCompanyBranding.changes();
      if (Object.keys(prefs).length) patch.branding = prefs;
      if (wfPendingSettingsLogo !== undefined) patch.logo = wfPendingSettingsLogo;
      Object.assign(patch,artChanges);
    }
    writing = true;
    const content = dialog?.querySelector('.wf-settings-content');
    if (content) content.inert = true;
    try {
      await persist(patch);
      for (const scope of scopes) Object.assign(baseline,valuesFor(scope));
      if (scopes.includes('company')) {
        wfPendingSettingsLogo = undefined;
        delete artChanges.signature; delete artChanges.stamp;
        window.WFCompanyBranding.reload(); refreshArtwork();
      }
      if (patch.manualUsdTry > 0) S.usdTry = patch.manualUsdTry;
      if (patch.manualUsdEur > 0) S.usdEur = patch.manualUsdEur;
      updateRateUI(); updateKdvDisplay();
      if (dialog?.open) dialog.close(); else goBack();
      showToast(t('settings_saved'),'ok');
      return true;
    } finally { writing = false; if (content) content.inert = false; }
  }

  new MutationObserver(() => { for (const [el,key] of labels) el.textContent = word(key,lang()); }).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
  window.WFCompanyIdentity = { ...api, save };
  load();
  document.addEventListener('DOMContentLoaded', () => {
    window.WFAppUpdates?.registerGuard('company-settings', () => {
      if (writing || uploading || bankBusy) return true;
      if (!byId('page-settings').classList.contains('active')) return false;
      if (Object.keys(artChanges).length || Object.keys(window.WFCompanyBranding.changes()).length || (wfPendingSettingsLogo !== undefined && wfPendingSettingsLogo !== (S.settings.logo || DEFAULT_WOW_LOGO))) return true;
      return Object.keys(fields).some(scope => Object.entries(valuesFor(scope)).some(([key,value]) => baseline[key] !== value));
    });
  }, {once:true});
})();
