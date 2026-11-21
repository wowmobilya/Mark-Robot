/* The product costing page owns drafts only. Its explicit save atomically merges
   the latest product record, leaving all other product fields with their owner. */
(function (root) {
  'use strict';
  const core = typeof module === 'object' && module.exports ? require('./product-cost-core.js') : root.WFCostCore;
  function allocateMaterialId(reserved, createId) {
    const base = String(createId?.() || 'wf-cost-material');
    let id = base, suffix = 1;
    while (reserved.has(id)) id = base + '-' + (++suffix);
    reserved.add(id);
    return id;
  }
  function normalizeMaterialRows(rows, createId) {
    const seen = new Set();
    return (Array.isArray(rows) ? rows : []).map(value => {
      const row = value && typeof value === 'object' ? value : {};
      const existing = ['string','number'].includes(typeof row.id) ? String(row.id).trim() : '';
      const id = existing && !seen.has(existing) ? existing : allocateMaterialId(seen, createId);
      seen.add(id);
      const normalized = {id, name:row.name ?? '', unit:row.unit ?? '', quantity:row.quantity ?? '', unitPrice:row.unitPrice ?? ''};
      if (['string','number'].includes(typeof row.catalogId) && String(row.catalogId).trim()) {
        normalized.catalogId = String(row.catalogId).trim();
        normalized.catalogUpdatedAt = typeof row.catalogUpdatedAt === 'string' ? row.catalogUpdatedAt : null;
      }
      return normalized;
    });
  }
  async function persistProductCosting({state, productId, draft, writeBatch, hydrate, now}) {
    const costing = core.prepareCosting(draft, now), id = (state.products || []).find(product => String(product.id) === String(productId))?.id;
    if (id === undefined) { const error = new Error('MISSING_PRODUCT'); error.code = 'MISSING_PRODUCT'; throw error; }
    const [stored] = await writeBatch([{type:'merge', store:'products', id, value:{costing}, merge(latest, patch) {
      if (!latest) { const error = new Error('MISSING_PRODUCT'); error.code = 'MISSING_PRODUCT'; throw error; }
      return {...latest, costing:patch.costing};
    }}]);
    const saved = hydrate ? await hydrate(stored) : stored;
    const index = state.products.findIndex(product => String(product.id) === String(id));
    if (index >= 0) state.products[index] = saved;
    return saved;
  }
  if (typeof module === 'object' && module.exports) { module.exports = {persistProductCosting, allocateMaterialId, normalizeMaterialRows}; return; }
  if (!root.document || !core || !root.WFOperations || root.WFCosting) return;
  const doc = root.document, ops = root.WFOperations;
  const locales = ['ar', 'tr', 'en', 'fr', 'ru'];
  const words = {
    title:['كلفة المنتجات','Ürün maliyetleri','Product costs','Coût des produits','Себестоимость товаров'],
    subtitle:['المواد والعمالة والمصاريف لكل منتج','Her ürünün malzeme, işçilik ve genel giderleri','Materials, labor and overhead for each product','Matières, main-d’œuvre et frais par produit','Материалы, труд и накладные расходы по товарам'],
    products:['المنتجات','Ürünler','Products','Produits','Товары'],
    search:['ابحث بالاسم أو الباركود','Ad veya barkod ile ara','Search name or barcode','Rechercher un nom ou un code-barres','Поиск по названию или штрихкоду'],
    choose:['اختر منتجاً لحساب كلفته','Maliyet için bir ürün seçin','Choose a product to calculate its cost','Choisissez un produit pour calculer son coût','Выберите товар для расчёта себестоимости'],
    chooseHint:['احفظ تفاصيل المواد والعمل والمصاريف للمنتج، ثم قارن كلفته بأسعار البيع.','Ürünün malzeme, işçilik ve giderlerini kaydedip satış fiyatlarıyla karşılaştırın.','Save materials, labor and overhead, then compare the cost with selling prices.','Enregistrez les matières, la main-d’œuvre et les frais, puis comparez aux prix de vente.','Сохраните материалы, труд и накладные расходы, затем сравните себестоимость с ценами продажи.'],
    change:['اختيار منتج آخر','Başka ürün seç','Choose another product','Choisir un autre produit','Выбрать другой товар'],
    noProducts:['أضف منتجاً أولاً من قسم المنتجات.','Önce ürünler bölümünden bir ürün ekleyin.','Add a product in the products section first.','Ajoutez d’abord un produit dans la section Produits.','Сначала добавьте товар в разделе товаров.'],
    noResults:['لا توجد نتائج مطابقة.','Eşleşen ürün yok.','No matching products.','Aucun produit correspondant.','Подходящих товаров нет.'],
    all:['الكل','Tümü','All','Tous','Все'],
    costed:['لها كلفة','Maliyet girilmiş','Cost entered','Coût renseigné','Себестоимость указана'],
    uncosted:['دون كلفة','Maliyet girilmemiş','Cost not entered','Coût non renseigné','Себестоимость не указана'],
    showMore:['عرض المزيد','Daha fazla göster','Show more','Afficher plus','Показать ещё'],
    results:['{shown} من {total} منتج','{total} ürünün {shown} tanesi','{shown} of {total} products','{shown} produits sur {total}','Показано {shown} из {total} товаров'],
    costUnit:['كلفة وحدة المنتج','Bir ürünün maliyeti','Cost per product unit','Coût par unité de produit','Себестоимость единицы товара'],
    unitHint:['احسب مواد وعمل ومصاريف وحدة واحدة أو طقم واحد مطابق لوحدة البيع.','Satış birimiyle aynı olacak şekilde bir ürünün veya takımın maliyetini girin.','Enter the cost for one item or set matching the product’s selling unit.','Saisissez le coût d’un article ou d’un ensemble correspondant à l’unité de vente.','Укажите стоимость одного изделия или комплекта в соответствии с единицей продажи.'],
    currency:['عملة إدخال الكلفة','Maliyet para birimi','Cost entry currency','Devise de saisie du coût','Валюта ввода затрат'],
    rates:['أسعار الصرف المحفوظة','Kaydedilmiş kurlar','Saved exchange rates','Taux de change enregistrés','Сохранённые курсы валют'],
    useRates:['استخدام الأسعار الحالية','Güncel kurları kullan','Use current rates','Utiliser les taux actuels','Использовать текущие курсы'],
    rateHint:['عند تغيير العملة أو تحديث الصرف تتحول المبالغ مع بقاء الكلفة بالدولار نفسها.','Para birimi veya kurlar değiştiğinde tutarlar dönüşür; USD maliyeti korunur.','Changing currency or refreshing rates converts the amounts and keeps the same USD cost.','Changer de devise ou actualiser les taux convertit les montants en conservant le coût en USD.','При смене валюты или обновлении курсов суммы пересчитываются с сохранением стоимости в USD.'],
    materials:['المواد والخامات','Malzemeler','Materials','Matières et composants','Материалы и комплектующие'],
    material:['المادة {number}','Malzeme {number}','Material {number}','Matière {number}','Материал {number}'],
    addMaterial:['إضافة مادة','Malzeme ekle','Add material','Ajouter une matière','Добавить материал'],
    chooseLibrary:['اختيار من مكتبة المواد','Malzeme kütüphanesinden seç','Choose from material library','Choisir dans la bibliothèque','Выбрать из библиотеки материалов'],
    libraryLinked:['مرتبطة بالمكتبة: {name}','Kütüphane bağlantısı: {name}','Linked to library: {name}','Liée à la bibliothèque : {name}','Связь с библиотекой: {name}'],
    libraryCurrent:['السعر مطابق للسعر المحفوظ في المكتبة.','Fiyat kütüphanedeki kayıtlı fiyatla aynı.','The price matches the saved library price.','Le prix correspond au prix enregistré dans la bibliothèque.','Цена соответствует сохранённой цене в библиотеке.'],
    libraryChanged:['السعر الحالي في المكتبة: {price}. يمكنك تطبيقه على هذه المسوّدة.','Güncel kütüphane fiyatı: {price}. Bu taslağa uygulayabilirsiniz.','Current library price: {price}. You can apply it to this draft.','Prix actuel dans la bibliothèque : {price}. Vous pouvez l’appliquer à ce brouillon.','Текущая цена в библиотеке: {price}. Можно применить её к этому черновику.'],
    libraryUnknown:['سعر المكتبة غير مدخل؛ تبقى كلفة هذا الصف كما هي.','Kütüphane fiyatı girilmedi; bu satırın maliyeti korunur.','The library price is not entered; this row keeps its current cost.','Le prix de la bibliothèque n’est pas renseigné ; ce coût reste inchangé.','Цена в библиотеке не указана; текущая стоимость строки сохраняется.'],
    libraryMissing:['المادة المرتبطة غير موجودة في المكتبة. بقيت تفاصيل الكلفة محفوظة.','Bağlı malzeme kütüphanede bulunamadı. Kayıtlı maliyet ayrıntıları korunur.','The linked material is not in the library. The saved cost details are preserved.','La matière liée est absente de la bibliothèque. Les détails du coût sont conservés.','Связанный материал отсутствует в библиотеке. Сохранённые данные затрат остаются.'],
    libraryUnitChanged:['وحدة المكتبة مختلفة. اختر المادة مجدداً وراجع الكمية قبل استبدال هذا الصف.','Kütüphane birimi farklı. Satırı değiştirmeden önce malzemeyi yeniden seçip miktarı kontrol edin.','The library unit differs. Select the material again and review the quantity before replacing this row.','L’unité de la bibliothèque diffère. Sélectionnez à nouveau la matière et vérifiez la quantité avant de remplacer cette ligne.','Единица в библиотеке отличается. Выберите материал заново и проверьте количество перед заменой строки.'],
    applyLibrary:['تطبيق سعر المكتبة الحالي','Güncel kütüphane fiyatını uygula','Apply current library price','Appliquer le prix actuel','Применить текущую цену библиотеки'],
    unlinkLibrary:['فصل الرابط والإبقاء على القيم','Bağlantıyı kaldır, değerleri koru','Unlink and keep values','Dissocier en conservant les valeurs','Отвязать с сохранением значений'],
    libraryAdded:['أُضيفت المادة إلى المسوّدة. راجع الكمية ثم احفظ الكلفة.','Malzeme taslağa eklendi. Miktarı kontrol edip maliyeti kaydedin.','Material added to the draft. Review the quantity, then save the cost.','Matière ajoutée au brouillon. Vérifiez la quantité, puis enregistrez le coût.','Материал добавлен в черновик. Проверьте количество и сохраните себестоимость.'],
    libraryApplied:['طُبّق السعر على المسوّدة. احفظ الكلفة لاعتماده.','Fiyat taslağa uygulandı. Onaylamak için maliyeti kaydedin.','Price applied to the draft. Save the cost to commit it.','Prix appliqué au brouillon. Enregistrez le coût pour le confirmer.','Цена применена к черновику. Сохраните себестоимость для подтверждения.'],
    name:['اسم المادة','Malzeme adı','Material name','Nom de la matière','Название материала'],
    unit:['وحدة القياس','Ölçü birimi','Unit','Unité','Единица измерения'],
    unitPlaceholder:['متر، قطعة، كغ…','metre, adet, kg…','meter, piece, kg…','mètre, pièce, kg…','метр, штука, кг…'],
    quantity:['الكمية','Miktar','Quantity','Quantité','Количество'],
    unitPrice:['كلفة الوحدة','Birim maliyet','Unit cost','Coût unitaire','Стоимость единицы'],
    rowTotal:['إجمالي المادة','Malzeme toplamı','Material total','Total de la matière','Итого по материалу'],
    remove:['حذف المادة','Malzemeyi kaldır','Remove material','Retirer la matière','Удалить материал'],
    noMaterials:['أضف المواد المستخدمة أو أدخل العمالة والمصاريف أدناه.','Kullanılan malzemeleri ekleyin veya aşağıda işçilik ve gider girin.','Add the materials used, or enter labor and overhead below.','Ajoutez les matières utilisées ou saisissez la main-d’œuvre et les frais ci-dessous.','Добавьте материалы либо укажите затраты на труд и накладные расходы ниже.'],
    labor:['العمالة','İşçilik','Labor','Main-d’œuvre','Труд'],
    overhead:['المصاريف الإضافية','Genel giderler','Overhead','Frais généraux','Накладные расходы'],
    costTotal:['إجمالي الكلفة','Toplam maliyet','Total cost','Coût total','Общая себестоимость'],
    usdTotal:['الكلفة بالدولار','USD maliyeti','Cost in USD','Coût en USD','Себестоимость в USD'],
    selling:['مقارنة أسعار البيع','Satış fiyatı karşılaştırması','Selling price comparison','Comparaison des prix de vente','Сравнение с ценами продажи'],
    tier:['السعر {tier}','Fiyat {tier}','Price {tier}','Tarif {tier}','Цена {tier}'],
    profit:['الربح لكل وحدة','Birim kâr','Profit per unit','Bénéfice par unité','Прибыль на единицу'],
    margin:['هامش الربح','Kâr marjı','Profit margin','Marge bénéficiaire','Маржа прибыли'],
    marginHint:['الهامش = (سعر البيع − الكلفة) ÷ سعر البيع. الأسعار بالدولار، قبل ضريبة الفاتورة وخصمها.','Marj = (satış fiyatı − maliyet) ÷ satış fiyatı. Fiyatlar USD, fatura vergisi ve indirimi öncesidir.','Margin = (selling price − cost) ÷ selling price. Prices are in USD, before invoice tax and discount.','Marge = (prix de vente − coût) ÷ prix de vente. Prix en USD, avant taxe et remise de facture.','Маржа = (цена продажи − себестоимость) ÷ цена продажи. Цены в USD, до налога и скидки по счёту.'],
    unknown:['لم تُدخل الكلفة','Maliyet girilmedi','Cost not entered','Coût non renseigné','Себестоимость не указана'],
    unknownHint:['اترك المبلغ فارغاً إذا لم يُدخل بعد. الصفر المدخل يعني كلفة صفرية معلومة.','Henüz girilmemiş tutarı boş bırakın. Girilen sıfır, bilinen sıfır maliyettir.','Leave an unentered amount blank. An entered zero is a known zero cost.','Laissez vide un montant non renseigné. Un zéro saisi représente un coût nul connu.','Оставьте неуказанную сумму пустой. Введённый ноль означает известную нулевую стоимость.'],
    save:['حفظ الكلفة','Maliyeti kaydet','Save cost','Enregistrer le coût','Сохранить себестоимость'],
    saving:['جارٍ الحفظ…','Kaydediliyor…','Saving…','Enregistrement…','Сохранение…'],
    saved:['تم حفظ الكلفة','Maliyet kaydedildi','Cost saved','Coût enregistré','Себестоимость сохранена'],
    savedAt:['آخر حفظ: {date}','Son kayıt: {date}','Last saved: {date}','Dernier enregistrement : {date}','Сохранено: {date}'],
    draft:['تعديلات غير محفوظة','Kaydedilmemiş değişiklikler','Unsaved changes','Modifications non enregistrées','Несохранённые изменения'],
    draftHint:['تبقى تعديلات كل منتج محفوظة في هذه الجلسة حتى تحفظها أو تتراجع عنها.','Her ürünün taslağı bu oturumda kaydedene veya vazgeçene kadar korunur.','Each product’s draft stays in this session until you save or discard it.','Le brouillon de chaque produit reste dans cette session jusqu’à son enregistrement ou son abandon.','Черновик каждого товара сохраняется в этой сессии до сохранения или отмены.'],
    discard:['تراجع عن التعديلات','Değişikliklerden vazgeç','Discard changes','Abandonner les modifications','Отменить изменения'],
    discardQuestion:['إلغاء التعديلات غير المحفوظة لهذا المنتج؟','Bu ürünün kaydedilmemiş değişiklikleri silinsin mi?','Discard the unsaved changes for this product?','Abandonner les modifications non enregistrées de ce produit ?','Отменить несохранённые изменения этого товара?'],
    confirmDiscard:['نعم، تراجع','Evet, vazgeç','Discard draft','Abandonner le brouillon','Отменить черновик'],
    keep:['متابعة التعديل','Düzenlemeye devam et','Keep editing','Continuer à modifier','Продолжить редактирование'],
    incomplete:['أكمل اسم المادة وكميتها وكلفة الوحدة.','Malzeme adı, miktarı ve birim maliyetini tamamlayın.','Complete the material name, quantity and unit cost.','Complétez le nom, la quantité et le coût unitaire de la matière.','Укажите название материала, количество и стоимость единицы.'],
    invalidAmount:['أدخل أرقاماً صحيحة غير سالبة.','Geçerli, negatif olmayan sayılar girin.','Enter valid non-negative numbers.','Saisissez des nombres valides et positifs ou nuls.','Введите корректные неотрицательные числа.'],
    invalidRate:['سعر الصرف المطلوب غير صالح. حدّث أسعار الصرف ثم أعد المحاولة.','Gerekli kur geçersiz. Kurları güncelleyip tekrar deneyin.','A required exchange rate is invalid. Update the rates and try again.','Un taux requis est invalide. Actualisez les taux puis réessayez.','Необходимый курс недействителен. Обновите курсы и повторите попытку.'],
    missingProduct:['لم يعد هذا المنتج موجوداً. اختر منتجاً آخر.','Bu ürün artık mevcut değil. Başka bir ürün seçin.','This product no longer exists. Choose another product.','Ce produit n’existe plus. Choisissez-en un autre.','Этого товара больше нет. Выберите другой товар.'],
    saveError:['تعذر حفظ الكلفة. بقيت تعديلاتك، ويمكنك المحاولة مجدداً.','Maliyet kaydedilemedi. Değişiklikleriniz korundu; tekrar deneyebilirsiniz.','The cost could not be saved. Your changes are preserved; you can retry.','Le coût n’a pas pu être enregistré. Vos modifications sont conservées ; réessayez.','Не удалось сохранить себестоимость. Изменения сохранены в черновике; повторите попытку.'],
    ratesUpdated:['تم تحديث الصرف مع الحفاظ على الكلفة بالدولار.','Kurlar güncellendi; USD maliyeti korundu.','Rates updated while keeping the USD cost.','Taux actualisés en conservant le coût en USD.','Курсы обновлены с сохранением стоимости в USD.'],
    addProduct:['إضافة منتج','Ürün ekle','Add product','Ajouter un produit','Добавить товар']
  };
  const text = (key, values = {}) => String(words[key]?.[Math.max(0, locales.indexOf(ops.locale()))] || key).replace(/\{(\w+)\}/g, (_, name) => values[name] ?? '');
  const titles = key => Object.fromEntries(locales.map((locale, index) => [locale, words[key][index]]));
  const labels = new Map(), drafts = new Map();
  let surface, mounted = false, selectedId = null, filter = 'all', visibleCount = 40, selectorOpen = true;
  let picker, search, filters, productList, listCount, more, editor, empty, overview, switchButton, saveButton, discardButton, message;
  let rowHost, totals, comparisons, rateText, currencySelect, formFieldset, discardPrompt, editorHeading;
  let unique = 0;
  function uid() {
    const reserved = new Set();
    const include = rows => {for (const row of Array.isArray(rows) ? rows : []) if (row?.id != null) reserved.add(String(row.id));};
    for (const item of products()) include(item.costing?.materials);
    for (const draft of drafts.values()) include(draft.data.materials);
    return allocateMaterialId(reserved, () => 'wf-cost-' + (root.wfNewRecordId?.() || root.crypto?.randomUUID?.() || Date.now().toString(36) + '-' + (++unique)));
  }
  const make = (tag, className, value) => ops.make(tag, className, value);
  function copy(tag, className, key, values) { const node = make(tag, className, text(key, values)); labels.set(node, {key, values}); return node; }
  function button(key, className, action, symbol) {
    const node = make('button', className); node.type = 'button';
    const permission = key === 'addProduct' ? 'products.edit' : ['save','useRates','addMaterial','chooseLibrary','remove','applyLibrary','unlinkLibrary'].includes(key) ? 'costs.edit' : null;
    if (permission) node.dataset.wfPermission = permission;
    if (symbol) { const icon = make('span', 'wf-cost-icon'); icon.innerHTML = ops.icon(symbol); node.append(icon); }
    node.append(copy('span', '', key)); node.addEventListener('click', event => {if(permission && root.WFAccountAccess && !root.WFAccountAccess.allow(permission)) return; return action(event);}); return node;
  }
  const products = () => Array.isArray(ops.state().products) ? ops.state().products : [];
  const product = () => products().find(item => String(item.id) === selectedId);
  const currentRates = () => core.normalizeRates(ops.state());
  const snapshot = value => JSON.stringify(value);
  function fromProduct(item) {
    const saved = item.costing || {};
    return {currency:core.currencies.includes(saved.currency) ? saved.currency : 'USD',
      materials:normalizeMaterialRows(saved.materials, uid),
      labor:saved.labor ?? '', overhead:saved.overhead ?? '',
      rates:saved.rates ? core.normalizeRates(saved.rates) : currentRates()};
  }
  function modelFor(item) {
    const id = String(item.id), savedVersion = snapshot(item.costing || null);
    let model = drafts.get(id);
    if (!model || !model.saving && !dirty(model) && model.savedVersion !== savedVersion) {
      const data = fromProduct(item);
      model = {data, baseline:snapshot(data), savedVersion, saving:false, confirmDiscard:false, error:null, note:null};
      drafts.set(id, model);
    }
    return model;
  }
  const dirty = model => snapshot(model.data) !== model.baseline;
  const selectedModel = () => { const item = product(); return item ? modelFor(item) : null; };
  const money = (value, code = 'USD') => value === null || value === undefined ? '—' : new Intl.NumberFormat(ops.locale(), {style:'currency', currency:code, currencyDisplay:'code', maximumFractionDigits:2}).format(value);
  const percent = value => value === null ? '—' : new Intl.NumberFormat(ops.locale(), {style:'percent', maximumFractionDigits:1}).format(value);
  function errorText(error) {
    return text(({MATERIAL_INCOMPLETE:'incomplete', INVALID_AMOUNT:'invalidAmount', INVALID_RATE:'invalidRate', INVALID_CURRENCY:'invalidRate', MISSING_PRODUCT:'missingProduct', MATERIAL_LINK_MISMATCH:'libraryMissing', MATERIAL_PRICE_UNKNOWN:'libraryUnknown', MATERIAL_UNIT_CHANGED:'libraryUnitChanged'})[error?.code] || 'saveError');
  }
  function cleanLabels() { for (const node of labels.keys()) if (!node.isConnected) labels.delete(node); }
  function localizedRefresh() {
    if (!mounted) return;
    for (const [node, entry] of labels) { if (node.isConnected) node.textContent = text(entry.key, entry.values); else labels.delete(node); }
    search.placeholder = text('search'); search.setAttribute('aria-label', text('search'));
    for (const control of surface.page.querySelectorAll('[data-cost-placeholder]')) control.placeholder = text(control.dataset.costPlaceholder);
    renderCatalog(); refreshComputed();
  }
  function mount() {
    if (mounted) return;
    mounted = true; surface.page.classList.add('wf-cost-page');
    overview = make('div', 'wf-cost-overview'); surface.body.append(overview);
    const layout = make('div', 'wf-cost-layout');
    picker = make('section', 'wf-ops-card wf-cost-picker'); picker.setAttribute('aria-labelledby', 'wfCostProductsTitle');
    const title = copy('h2', '', 'products'); title.id = 'wfCostProductsTitle'; picker.append(title);
    search = make('input', 'fi wf-cost-search'); search.id = 'wfCostProductSearch'; search.type = 'search'; search.placeholder = text('search'); search.setAttribute('aria-label', text('search'));
    search.addEventListener('input', () => {visibleCount = 40; renderCatalog();}); picker.append(search);
    filters = make('div', 'wf-cost-filters'); filters.setAttribute('role', 'group');
    for (const key of ['all', 'costed', 'uncosted']) {
      const control = button(key, 'wf-cost-filter', () => {filter = key; visibleCount = 40; renderCatalog();}); control.dataset.filter = key; filters.append(control);
    }
    listCount = make('p', 'wf-ops-muted wf-cost-list-count'); listCount.setAttribute('role', 'status');
    productList = make('div', 'wf-cost-product-list');
    more = button('showMore', 'btn btn-s wf-cost-more', () => {visibleCount += 40; renderCatalog();});
    picker.append(filters, listCount, productList, more);
    const right = make('div', 'wf-cost-detail');
    switchButton = button('change', 'btn btn-s wf-cost-change', () => {selectorOpen = !selectorOpen; syncSelection(); if (selectorOpen) search.focus({preventScroll:true});});
    switchButton.setAttribute('aria-controls', 'wfCostProductPicker'); picker.id = 'wfCostProductPicker';
    empty = make('section', 'wf-ops-card wf-cost-empty');
    const emptyIcon = make('div', 'wf-cost-empty-icon'); emptyIcon.innerHTML = ops.icon('cost');
    empty.append(emptyIcon, copy('h2', '', 'choose'), copy('p', '', 'chooseHint'));
    editor = make('section', 'wf-cost-editor'); editor.hidden = true;
    right.append(switchButton, empty, editor); layout.append(picker, right); surface.body.append(layout);
    saveButton = button('save', 'btn btn-p wf-cost-save', () => save(), 'save'); saveButton.id = 'wfCostSave'; surface.actions.append(saveButton);
    registerGuard();
    root.addEventListener('load', registerGuard, {once:true});
  }
  function registerGuard() {
    root.WFAppUpdates?.registerGuard('product-costs', () => [...drafts.values()].some(model => model.saving || dirty(model)));
  }
  function syncSelection() {
    const chosen = !!product();
    surface.page.dataset.costSelected = String(chosen); surface.page.dataset.costPicker = String(selectorOpen || !chosen);
    switchButton.hidden = !chosen; switchButton.setAttribute('aria-expanded', String(selectorOpen));
    empty.hidden = chosen; editor.hidden = !chosen; saveButton.hidden = !chosen;
  }
  function renderCatalog() {
    if (!mounted) return;
    const all = products(), costed = all.filter(item => core.savedUnitCost(item.costing) !== null).length;
    overview.replaceChildren(...[['products', all.length], ['costed', costed], ['uncosted', all.length - costed]].map(([key, value]) => {
      const box = make('div', 'wf-cost-stat'); box.append(copy('span', '', key), make('strong', '', String(value))); return box;
    }));
    const normalize = value => String(value ?? '').normalize('NFKD').replace(/\p{M}/gu, '').toLocaleLowerCase(ops.locale());
    const query = normalize(search.value);
    const filtered = all.filter(item => {
      const hasCost = core.savedUnitCost(item.costing) !== null;
      return (filter === 'all' || (filter === 'costed' ? hasCost : !hasCost)) && normalize([item.name, item.barcode, item.type].join(' ')).includes(query);
    });
    for (const control of filters.children) control.setAttribute('aria-pressed', String(control.dataset.filter === filter));
    const fragment = doc.createDocumentFragment();
    for (const item of filtered.slice(0, visibleCount)) {
      const id = String(item.id), control = make('button', 'wf-cost-product'); control.type = 'button'; control.dataset.productId = id;
      control.setAttribute('aria-pressed', String(id === selectedId));
      const name = make('strong', '', String(item.name || '—')); name.dir = 'auto';
      const value = core.savedUnitCost(item.costing), cost = make('span', 'wf-cost-product-value', value === null ? text('uncosted') : money(value)); cost.dir = 'auto';
      const content = make('span', 'wf-cost-product-text'); content.append(name, cost);
      if (drafts.has(id) && dirty(drafts.get(id))) content.append(copy('small', 'wf-cost-draft-tag', 'draft'));
      const arrow = make('span', 'wf-cost-product-arrow', ops.locale() === 'ar' ? '‹' : '›'); arrow.setAttribute('aria-hidden', 'true');
      control.append(content, arrow); control.addEventListener('click', () => choose(id)); fragment.append(control);
    }
    if (!filtered.length) {
      const notice = copy('p', 'wf-ops-empty', all.length ? 'noResults' : 'noProducts'); fragment.append(notice);
      if (!all.length) fragment.append(button('addProduct', 'btn btn-s', () => root.showPage?.('add-product'), 'plus'));
    }
    productList.replaceChildren(fragment);
    listCount.textContent = text('results', {shown:Math.min(visibleCount, filtered.length), total:filtered.length});
    more.hidden = filtered.length <= visibleCount; cleanLabels();
  }
  function choose(id) {
    if (!products().some(item => String(item.id) === String(id))) return;
    root.WFTouchKeyboard?.close('navigation', false);
    selectedId = String(id); selectorOpen = false; modelFor(product()); renderEditor(); renderCatalog(); syncSelection();
    editorHeading?.focus({preventScroll:true});
  }
  function field(key, id, value, numeric, onChange, placeholder) {
    const group = make('div', 'wf-cost-field'), label = copy('label', '', key); label.htmlFor = id;
    const input = make('input', 'fi'); input.id = id; input.name = id; input.type = 'text'; input.value = value ?? ''; input.autocomplete = 'off';
    if (numeric) {input.inputMode = 'decimal'; input.dir = 'ltr';} else input.dir = 'auto';
    if (placeholder) {input.dataset.costPlaceholder = placeholder; input.placeholder = text(placeholder);}
    const update = () => {onChange(input.value); const model = selectedModel(); if (model) {model.error = null; model.note = null;} refreshComputed();};
    input.addEventListener('input', update); input.addEventListener('change', update);
    group.append(label, input); return group;
  }
  function sectionHeading(key, action) {
    const header = make('header', 'wf-cost-section-heading'); header.append(copy('h2', '', key)); if (action) header.append(action); return header;
  }
  function renderEditor() {
    const item = product(), model = item && modelFor(item);
    if (!model) {editor.replaceChildren(); syncSelection(); return;}
    const data = model.data; editor.replaceChildren();
    const identity = make('div', 'wf-ops-card wf-cost-identity');
    identity.append(copy('span', 'wf-cost-eyebrow', 'costUnit'));
    editorHeading = make('h2', '', String(item.name || '—')); editorHeading.dir = 'auto'; editorHeading.tabIndex = -1;
    identity.append(editorHeading, copy('p', '', 'unitHint'));
    formFieldset = make('fieldset', 'wf-cost-form'); formFieldset.disabled = model.saving;
    const currencyCard = make('section', 'wf-ops-card wf-cost-currency');
    const currencyField = make('div', 'wf-cost-field'), currencyLabel = copy('label', '', 'currency'); currencyLabel.htmlFor = 'wfCostCurrency';
    currencySelect = make('select', 'fi'); currencySelect.id = 'wfCostCurrency';
    for (const code of core.currencies) {const option = make('option', '', code); option.value = code; currencySelect.append(option);}
    currencySelect.value = data.currency;
    currencySelect.addEventListener('change', () => {
      try {model.data = core.convertDraftCurrency(model.data, currencySelect.value); model.error = null; model.note = null; renderEditor();}
      catch (error) {currencySelect.value = model.data.currency; model.error = error; refreshComputed();}
    });
    currencyField.append(currencyLabel, currencySelect);
    const rates = make('div', 'wf-cost-rates'); rates.append(copy('span', 'wf-cost-eyebrow', 'rates'));
    rateText = make('bdi', 'wf-cost-rate-value'); rates.append(rateText);
    const useRates = button('useRates', 'btn btn-s', () => {
      try {model.data = core.rebaseDraftRates(model.data, currentRates()); model.error = null; model.note = 'ratesUpdated'; renderEditor();}
      catch (error) {model.error = error; refreshComputed();}
    }, 'restore');
    currencyCard.append(currencyField, rates, useRates, copy('p', 'wf-cost-rate-hint', 'rateHint'));
    const materials = make('section', 'wf-ops-card wf-cost-materials');
    const add = button('addMaterial', 'btn btn-s', () => {
      model.data.materials.push({id:uid(), name:'', unit:'', quantity:'', unitPrice:''}); model.error = null; model.note = null;
      renderMaterialRows(); refreshComputed(); rowHost.lastElementChild?.querySelector('input')?.focus({preventScroll:true});
    }, 'plus'); add.id = 'wfCostAddMaterial';
    const materialActions = make('div','wf-ops-row wf-cost-material-actions');
    const chooseLibrary = button('chooseLibrary','btn btn-s',() => root.WFMaterialLibrary?.chooseForProduct(selectedId),'material'); chooseLibrary.id = 'wfCostChooseLibrary';
    materialActions.append(chooseLibrary,add);
    materials.append(sectionHeading('materials', materialActions)); rowHost = make('div', 'wf-cost-material-list'); materials.append(rowHost);
    const extras = make('section', 'wf-ops-card wf-cost-extras');
    extras.append(field('labor', 'wfCostLabor', data.labor, true, value => {model.data.labor = value;}), field('overhead', 'wfCostOverhead', data.overhead, true, value => {model.data.overhead = value;}));
    formFieldset.append(currencyCard, materials, extras);
    const summaryCard = make('section', 'wf-ops-card wf-cost-summary'); summaryCard.append(sectionHeading('costTotal')); totals = make('div', 'wf-cost-totals'); summaryCard.append(totals, copy('p', 'wf-ops-muted', 'unknownHint'));
    const comparisonCard = make('section', 'wf-ops-card wf-cost-comparison'); comparisonCard.append(sectionHeading('selling')); comparisons = make('div', 'wf-cost-tiers'); comparisonCard.append(comparisons, copy('p', 'wf-ops-muted', 'marginHint'));
    const footer = make('div', 'wf-ops-card wf-cost-footer');
    message = make('p', 'wf-ops-status wf-cost-message'); message.setAttribute('role', 'status'); message.id = 'wfCostSaveStatus';
    discardButton = button('discard', 'btn btn-s', () => {model.confirmDiscard = true; refreshComputed();});
    discardPrompt = make('div', 'wf-cost-discard-prompt'); discardPrompt.append(copy('p', '', 'discardQuestion'));
    const confirm = button('confirmDiscard', 'btn btn-s', () => {drafts.delete(selectedId); modelFor(product()); renderEditor(); renderCatalog();});
    const keep = button('keep', 'btn btn-p', () => {model.confirmDiscard = false; refreshComputed();});
    discardPrompt.append(confirm, keep);
    footer.append(message, copy('p', 'wf-ops-muted', 'draftHint'), discardButton, discardPrompt);
    editor.append(identity, formFieldset, summaryCard, comparisonCard, footer);
    renderMaterialRows(); refreshComputed(); cleanLabels();
  }
  function renderMaterialRows() {
    const model = selectedModel(); if (!model || !rowHost) return;
    rowHost.replaceChildren();
    for (const [index, row] of model.data.materials.entries()) {
      const card = make('div', 'wf-cost-material-row'); card.dataset.rowId = row.id;
      const header = make('div', 'wf-cost-material-heading'); header.append(copy('h3', '', 'material', {number:index + 1}));
      const remove = button('remove', 'btn btn-s wf-cost-remove', () => {
        root.WFTouchKeyboard?.close('navigation', false);
        const position = model.data.materials.indexOf(row); if (position >= 0) model.data.materials.splice(position, 1);
        model.error = null; model.note = null; renderMaterialRows(); refreshComputed();
      }, 'close'); header.append(remove);
      const fields = make('div', 'wf-cost-material-fields'), prefix = 'wfCostMaterial-' + row.id.replace(/[^a-z0-9_-]/gi, '_');
      const name = field('name', prefix + '-name', row.name, false, value => {row.name = value;}); name.classList.add('wf-cost-material-name');
      fields.append(name, field('unit', prefix + '-unit', row.unit, false, value => {row.unit = value;}, 'unitPlaceholder'),
        field('quantity', prefix + '-quantity', row.quantity, true, value => {row.quantity = value;}),
        field('unitPrice', prefix + '-price', row.unitPrice, true, value => {if (row.catalogId && String(row.unitPrice ?? '') !== value) row.catalogUpdatedAt = null; row.unitPrice = value;}));
      const total = make('div', 'wf-cost-row-total'); total.append(copy('span', '', 'rowTotal'), make('bdi', 'wf-cost-row-amount', '—'));
      card.append(header, fields, total); rowHost.append(card);
      if (row.catalogId) {
        const linked = make('div','wf-cost-library-link');
        const label = make('button','wf-cost-library-name'); label.type = 'button'; label.dataset.wfPermission = 'materials.view'; label.addEventListener('click',() => root.WFMaterialLibrary?.open(row.catalogId));
        const status = make('p','wf-cost-library-status'); status.setAttribute('role','status');
        const actions = make('div','wf-ops-row');
        const apply = button('applyLibrary','btn btn-s wf-cost-library-apply',() => {
          try {
            const materialCore = root.WFMaterialLibraryCore, material = materialCore?.listMaterials(ops.state().settings).find(entry => String(entry.id) === String(row.catalogId));
            const applied = materialCore.applyLinkedPrice(model.data,row.id,material).materials.find(entry => entry.id === row.id);
            // Keep the enclosing draft object alive: labor/overhead controls
            // already hold that object while their touch-keyboard session runs.
            row.unitPrice = applied.unitPrice; row.catalogUpdatedAt = applied.catalogUpdatedAt;
            model.error = null; model.note = 'libraryApplied'; renderMaterialRows(); refreshComputed();
          } catch (error) {model.error = error; model.note = null; refreshComputed();}
        },'restore');
        const unlink = button('unlinkLibrary','btn btn-s',() => {delete row.catalogId; delete row.catalogUpdatedAt; model.error = null; model.note = null; renderMaterialRows(); refreshComputed();});
        actions.append(apply,unlink); linked.append(label,status,actions); card.append(linked);
      }
    }
    if (!model.data.materials.length) rowHost.append(copy('p', 'wf-ops-muted', 'noMaterials'));
    cleanLabels();
  }
  function refreshComputed() {
    if (!mounted) return;
    const item = product(), model = item && modelFor(item);
    if (!model || !totals) {if (saveButton) saveButton.hidden = true; return;}
    let result = null, validation = null;
    try {result = core.calculateCosting(model.data);} catch (error) {validation = error;}
    const code = model.data.currency;
    const entries = [['materials', result?.materials.length ? result.materialTotal : null], ['labor', result?.labor ?? null], ['overhead', result?.overhead ?? null], ['costTotal', result?.total ?? null], ['usdTotal', result?.unitCostUSD ?? null]];
    totals.replaceChildren(...entries.map(([key, value]) => {
      const row = make('div', 'wf-cost-total-row' + (key === 'usdTotal' ? ' wf-cost-total-primary' : ''));
      row.append(copy('span', '', key), make('bdi', '', money(value, key === 'usdTotal' ? 'USD' : code))); return row;
    }));
    for (const card of rowHost?.querySelectorAll('[data-row-id]') || []) {
      const row = model.data.materials.find(entry => entry.id === card.dataset.rowId); let value = null;
      try {const qty = core.amount(row.quantity), price = core.amount(row.unitPrice); if (qty !== null && price !== null && Number.isFinite(qty * price)) value = qty * price;} catch (_) {}
      card.querySelector('.wf-cost-row-amount').textContent = money(value, code);
      const link = card.querySelector('.wf-cost-library-link');
      if (link && root.WFMaterialLibraryCore) {
        const materialCore = root.WFMaterialLibraryCore, material = materialCore.listMaterials(ops.state().settings).find(entry => String(entry.id) === String(row.catalogId));
        const status = materialCore.linkedStatus(row,model.data,material);
        link.dataset.status = status.status;
        link.querySelector('.wf-cost-library-name').textContent = text('libraryLinked',{name:material?.name || row.name});
        const key = {current:'libraryCurrent',changed:'libraryChanged',unknown:'libraryUnknown',missing:'libraryMissing',unitChanged:'libraryUnitChanged',invalid:'invalidRate'}[status.status] || 'libraryMissing';
        link.querySelector('.wf-cost-library-status').textContent = text(key,{price:money(status.price,code)});
        link.querySelector('.wf-cost-library-apply').disabled = model.saving || status.status !== 'changed';
      }
    }
    comparisons.replaceChildren(...['A', 'B', 'C'].map(tier => {
      let price = null, comparison;
      try {price = core.amount(tier === 'A' ? item.priceA ?? item.priceUSD : item['price' + tier]);} catch (_) {}
      comparison = core.comparePrice(result?.unitCostUSD ?? null, price);
      const card = make('div', 'wf-cost-tier'); card.dataset.loss = String(comparison.profitUSD !== null && comparison.profitUSD < 0);
      card.append(copy('h3', '', 'tier', {tier}), make('bdi', 'wf-cost-selling-price', money(price)));
      for (const [key, value] of [['profit', money(comparison.profitUSD)], ['margin', percent(comparison.margin)]]) {
        const row = make('div', 'wf-cost-tier-row'); row.append(copy('span', '', key), make('bdi', '', value)); card.append(row);
      }
      return card;
    }));
    const quotes = core.normalizeRates(model.data.rates), format = value => value === null ? '—' : new Intl.NumberFormat(ops.locale(), {maximumFractionDigits:6}).format(value);
    rateText.textContent = '1 USD = ' + format(quotes.usdTry) + ' TRY · ' + format(quotes.usdEur) + ' EUR';
    const unsaved = dirty(model);
    saveButton.disabled = model.saving || !unsaved || !!validation; saveButton.setAttribute('aria-busy', String(model.saving));
    const saveCaption = saveButton.querySelector('span:last-child'); labels.set(saveCaption, {key:model.saving ? 'saving' : 'save'}); saveCaption.textContent = text(model.saving ? 'saving' : 'save');
    formFieldset.disabled = model.saving; discardButton.disabled = model.saving || !unsaved;
    discardPrompt.hidden = !model.confirmDiscard || !unsaved;
    const error = model.error || validation;
    message.dataset.kind = error ? 'error' : unsaved ? 'draft' : 'success';
    if (error) message.textContent = errorText(error);
    else if (model.saving) message.textContent = text('saving');
    else if (model.note) message.textContent = text(model.note);
    else if (unsaved) message.textContent = text('draft');
    else if (item.costing?.updatedAt) {
      const date = new Date(item.costing.updatedAt);
      message.textContent = Number.isNaN(date.getTime()) ? text('saved') : text('savedAt', {date:new Intl.DateTimeFormat(ops.locale(), {dateStyle:'medium', timeStyle:'short'}).format(date)});
    } else message.textContent = text('unknown');
    cleanLabels();
  }
  async function save() {
    if (root.WFAccountAccess && !root.WFAccountAccess.allow('costs.edit')) return false;
    const item = product(), model = item && modelFor(item); if (!model || model.saving || !dirty(model)) return false;
    const id = String(item.id);
    try {core.calculateCosting(model.data);} catch (error) {model.error = error; refreshComputed(); return false;}
    model.saving = true; model.error = null; refreshComputed();
    let saved;
    try {
      saved = await persistProductCosting({state:ops.state(), productId:id, draft:model.data,
        writeBatch:operations => wfWriteBatch(operations),
        hydrate:record => typeof wfHydrateDBValue === 'function' ? wfHydrateDBValue(record) : record});
    } catch (error) {
      model.saving = false; model.error = error; model.note = null;
      if (selectedId === id) refreshComputed(); ops.notify(errorText(error), 'er'); return false;
    }
    model.saving = false;
    // A display failure after commit must never be reported as a failed save.
    drafts.delete(id); const next = modelFor(saved); next.note = 'saved';
    try {if (selectedId === id) renderEditor(); renderCatalog(); root.renderPr?.();}
    catch (error) {root.console?.error('WOW cost saved; display refresh failed', error);}
    ops.notify(text('saved'), 'ok'); return true;
  }
  function enter() {
    mount();
    if (selectedId && !product()) {selectedId = null; selectorOpen = true;}
    renderCatalog(); renderEditor(); syncSelection(); localizedRefresh();
  }
  surface = ops.register({id:'product-costs', title:titles('title'), subtitle:titles('subtitle'), icon:'cost', parent:'products', onEnter:enter, onLanguage:localizedRefresh});
  root.addEventListener('wf-material-library-change',() => {if (mounted) refreshComputed();});
  root.WFCosting = Object.freeze({
    open(productId) {
      if (root.WFAccountAccess && !root.WFAccountAccess.allow('costs.view')) return false;
      if (productId !== undefined && products().some(item => String(item.id) === String(productId))) {selectedId = String(productId); selectorOpen = false;}
      return ops.open('product-costs');
    },
    addCatalogMaterial(catalogId, productId = selectedId) {
      if (root.WFAccountAccess && !root.WFAccountAccess.allow('costs.edit')) return false;
      const item = products().find(entry => String(entry.id) === String(productId));
      if (!item) {ops.notify(text('missingProduct'),'er'); return false;}
      const model = modelFor(item); if (model.saving) return false;
      try {
        const materialCore = root.WFMaterialLibraryCore, material = materialCore?.listMaterials(ops.state().settings).find(entry => String(entry.id) === String(catalogId));
        if (!material) {const error = new Error('MATERIAL_LINK_MISMATCH'); error.code = 'MATERIAL_LINK_MISMATCH'; throw error;}
        model.data.materials.push(materialCore.createLinkedRow(material,model.data,uid())); model.error = null; model.note = 'libraryAdded'; return true;
      } catch (error) {ops.notify(errorText(error),'er'); return false;}
    },
    captureInvoiceCosts(invoice, capturedAt) {return core.captureInvoiceCosts(invoice, products(), capturedAt);},
    invoiceSummary:core.invoiceSummary
  });
})(typeof window === 'object' ? window : globalThis);
