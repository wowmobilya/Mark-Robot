/* A native, reusable raw-material library. User drafts are separate from the
   committed settings record and from every product/invoice cost snapshot. */
(function (root) {
  'use strict';
  const core = root.WFMaterialLibraryCore, cost = root.WFCostCore, ops = root.WFOperations;
  if (!root.document || !core || !cost || !ops || root.WFMaterialLibrary) return;
  const locales = ['ar','tr','en','fr','ru'];
  const words = {
    title:['مكتبة المواد والخامات','Malzeme kütüphanesi','Material library','Bibliothèque des matières','Библиотека материалов'],
    subtitle:['أسعار ووحدات محفوظة لإعادة استخدامها في كلفة المنتجات','Ürün maliyetlerinde tekrar kullanılacak birimler ve fiyatlar','Saved units and prices to reuse in product costs','Unités et prix enregistrés à réutiliser dans les coûts produits','Сохранённые единицы и цены для расчёта себестоимости товаров'],
    add:['إضافة مادة','Malzeme ekle','Add material','Ajouter une matière','Добавить материал'],
    refresh:['تحديث المكتبة','Kütüphaneyi yenile','Refresh library','Actualiser la bibliothèque','Обновить библиотеку'],
    readFailed:['تعذر تحديث المواد المحفوظة. بقيت مسوّداتك؛ أعد التحديث لتحميل آخر نسخة.','Kayıtlı malzemeler yenilenemedi. Taslaklarınız korundu; son sürüm için tekrar yenileyin.','Saved materials could not be refreshed. Your drafts are preserved; refresh again to load the latest version.','Impossible d’actualiser les matières enregistrées. Vos brouillons sont conservés ; réessayez pour charger la dernière version.','Не удалось обновить сохранённые материалы. Черновики сохранены; повторите обновление для загрузки последней версии.'],
    newMaterial:['مادة جديدة','Yeni malzeme','New material','Nouvelle matière','Новый материал'],
    library:['المواد المحفوظة','Kayıtlı malzemeler','Saved materials','Matières enregistrées','Сохранённые материалы'],
    search:['ابحث بالاسم أو الوحدة أو التصنيف','Ad, birim veya kategori ara','Search name, unit or category','Rechercher un nom, une unité ou une catégorie','Поиск по названию, единице или категории'],
    noResults:['لا توجد مواد مطابقة.','Eşleşen malzeme yok.','No matching materials.','Aucune matière correspondante.','Подходящих материалов нет.'],
    empty:['أضف أول مادة إلى مكتبتك','İlk malzemenizi ekleyin','Add your first library material','Ajoutez votre première matière','Добавьте первый материал'],
    choose:['اختر مادة أو أضف مادة جديدة','Bir malzeme seçin veya ekleyin','Choose a material or add a new one','Choisissez ou ajoutez une matière','Выберите или добавьте материал'],
    chooseHint:['احفظ الاسم والوحدة والسعر مرة واحدة، ثم اختر المادة من صفحة كلفة المنتج.','Adı, birimi ve fiyatı bir kez kaydedin; ardından ürün maliyeti sayfasında seçin.','Save the name, unit and price once, then select the material from the product cost page.','Enregistrez le nom, l’unité et le prix une fois, puis sélectionnez la matière depuis la page de coût du produit.','Сохраните название, единицу и цену один раз, затем выбирайте материал на странице себестоимости товара.'],
    name:['اسم المادة','Malzeme adı','Material name','Nom de la matière','Название материала'],
    unit:['وحدة القياس','Ölçü birimi','Unit of measure','Unité de mesure','Единица измерения'],
    unitHint:['متر، قطعة، كغ…','metre, adet, kg…','meter, piece, kg…','mètre, pièce, kg…','метр, штука, кг…'],
    category:['التصنيف الاختياري','Kategori (isteğe bağlı)','Category (optional)','Catégorie (facultative)','Категория (необязательно)'],
    currency:['عملة السعر','Fiyat para birimi','Price currency','Devise du prix','Валюта цены'],
    price:['سعر الوحدة','Birim fiyat','Unit price','Prix unitaire','Цена за единицу'],
    usdPrice:['سعر الوحدة بالدولار','USD birim fiyatı','Unit price in USD','Prix unitaire en USD','Цена за единицу в USD'],
    priceHint:['السعر لوحدة القياس المحددة. اتركه فارغاً إن لم تعرفه؛ الصفر سعر صفري معلوم.','Fiyat seçilen birim içindir. Bilinmiyorsa boş bırakın; girilen sıfır bilinen sıfır fiyattır.','The price is for the stated unit. Leave it blank if unknown; an entered zero is a known zero price.','Le prix correspond à l’unité indiquée. Laissez vide s’il est inconnu ; un zéro saisi est un prix nul connu.','Цена относится к указанной единице. Оставьте поле пустым, если цена неизвестна; введённый ноль означает известную нулевую цену.'],
    rates:['أسعار الصرف المحفوظة','Kayıtlı kurlar','Saved exchange rates','Taux de change enregistrés','Сохранённые курсы валют'],
    useRates:['استخدام الأسعار الحالية','Güncel kurları kullan','Use current rates','Utiliser les taux actuels','Использовать текущие курсы'],
    rateHint:['تغيير العملة أو تحديث الصرف يحوّل السعر مع الحفاظ على قيمته بالدولار.','Para birimi veya kur değişikliği fiyatı dönüştürür; USD değeri korunur.','Changing currency or refreshing rates converts the price and preserves its USD value.','Changer de devise ou actualiser les taux convertit le prix en conservant sa valeur en USD.','При смене валюты или обновлении курсов цена пересчитывается с сохранением стоимости в USD.'],
    unknown:['السعر غير مدخل','Fiyat girilmedi','Price not entered','Prix non renseigné','Цена не указана'],
    known:['لها سعر','Fiyatı girilmiş','Price entered','Prix renseigné','Цена указана'],
    all:['الكل','Tümü','All','Toutes','Все'],
    linked:['تستخدمها منتجات','Ürünlerde kullanılan','Used in products','Utilisées dans des produits','Используются в товарах'],
    draft:['تعديلات غير محفوظة','Kaydedilmemiş değişiklikler','Unsaved changes','Modifications non enregistrées','Несохранённые изменения'],
    draftHint:['تبقى مسوّدة كل مادة في هذه الجلسة حتى تحفظها أو تتراجع عنها.','Her malzemenin taslağı bu oturumda kaydedilene veya silinene kadar korunur.','Each material draft stays in this session until you save or discard it.','Chaque brouillon reste dans cette session jusqu’à son enregistrement ou son abandon.','Черновик каждого материала остаётся в этой сессии до сохранения или отмены.'],
    save:['حفظ المادة','Malzemeyi kaydet','Save material','Enregistrer la matière','Сохранить материал'],
    saving:['جارٍ الحفظ…','Kaydediliyor…','Saving…','Enregistrement…','Сохранение…'],
    saved:['تم حفظ المادة','Malzeme kaydedildi','Material saved','Matière enregistrée','Материал сохранён'],
    discard:['تراجع عن التعديلات','Değişikliklerden vazgeç','Discard changes','Abandonner les modifications','Отменить изменения'],
    discardQuestion:['إلغاء التعديلات غير المحفوظة لهذه المادة؟','Bu malzemenin kaydedilmemiş değişiklikleri silinsin mi?','Discard the unsaved changes to this material?','Abandonner les modifications non enregistrées de cette matière ?','Отменить несохранённые изменения этого материала?'],
    confirmDiscard:['نعم، تراجع','Evet, vazgeç','Discard draft','Abandonner le brouillon','Отменить черновик'],
    keep:['متابعة التعديل','Düzenlemeye devam et','Keep editing','Continuer à modifier','Продолжить редактирование'],
    usage:['المنتجات المرتبطة','Bağlı ürünler','Linked products','Produits liés','Связанные товары'],
    noUsage:['لم تُستخدم هذه المادة في كلفة منتج محفوظة بعد.','Bu malzeme henüz kayıtlı ürün maliyetlerinde kullanılmadı.','This material is not yet used in a saved product cost.','Cette matière n’est pas encore utilisée dans un coût produit enregistré.','Этот материал пока не используется в сохранённой себестоимости товаров.'],
    usageCount:['{count} منتج مرتبط','{count} bağlı ürün','{count} linked products','{count} produits liés','Связанных товаров: {count}'],
    usageHint:['تحديث المكتبة لا يغيّر كلفة المنتجات أو الفواتير المحفوظة. افتح كلفة المنتج وطبّق السعر الجديد ثم احفظها.','Kütüphaneyi güncellemek kayıtlı ürün veya fatura maliyetlerini değiştirmez. Ürün maliyetini açıp yeni fiyatı uygulayın ve kaydedin.','Updating the library keeps saved product and invoice costs unchanged. Open a product cost, apply the new price, then save it.','Actualiser la bibliothèque conserve les coûts produits et factures enregistrés. Ouvrez le coût d’un produit, appliquez le nouveau prix, puis enregistrez.','Обновление библиотеки сохраняет прежние затраты товаров и счетов. Откройте себестоимость товара, примените новую цену и сохраните.'],
    viewCost:['فتح كلفة المنتج','Ürün maliyetini aç','Open product cost','Ouvrir le coût du produit','Открыть себестоимость товара'],
    selectionFor:['اختيار مادة للمنتج: {name}','Ürün için malzeme seçimi: {name}','Choose a material for: {name}','Choisir une matière pour : {name}','Выбор материала для: {name}'],
    use:['إضافة إلى مسوّدة كلفة المنتج','Ürün maliyeti taslağına ekle','Add to product cost draft','Ajouter au brouillon du coût produit','Добавить в черновик себестоимости'],
    useHint:['سيُنسخ الاسم والوحدة والسعر، مع الاحتفاظ بالرابط. راجع الكمية واحفظ كلفة المنتج.','Ad, birim ve fiyat bağlantıyla birlikte kopyalanır. Miktarı kontrol edip ürün maliyetini kaydedin.','The name, unit and price are copied with a link to the library. Review the quantity and save the product cost.','Le nom, l’unité et le prix sont copiés avec un lien vers la bibliothèque. Vérifiez la quantité et enregistrez le coût produit.','Название, единица и цена копируются со ссылкой на библиотеку. Проверьте количество и сохраните себестоимость товара.'],
    saveFirst:['احفظ المادة قبل إضافتها إلى المنتج.','Ürüne eklemeden önce malzemeyi kaydedin.','Save the material before adding it to the product.','Enregistrez la matière avant de l’ajouter au produit.','Сохраните материал перед добавлением в товар.'],
    returnCost:['العودة إلى كلفة المنتج','Ürün maliyetine dön','Return to product cost','Revenir au coût du produit','Вернуться к себестоимости товара'],
    browse:['متابعة تصفح المكتبة','Kütüphaneye devam et','Continue browsing the library','Continuer à parcourir la bibliothèque','Продолжить просмотр библиотеки'],
    nameRequired:['اكتب اسم المادة.','Malzeme adını yazın.','Enter a material name.','Saisissez un nom de matière.','Введите название материала.'],
    unitRequired:['اكتب وحدة القياس.','Ölçü birimini yazın.','Enter a unit of measure.','Saisissez une unité de mesure.','Введите единицу измерения.'],
    invalidAmount:['أدخل سعراً صحيحاً غير سالب.','Geçerli, negatif olmayan bir fiyat girin.','Enter a valid non-negative price.','Saisissez un prix valide, positif ou nul.','Введите корректную неотрицательную цену.'],
    invalidRate:['سعر صرف مطلوب غير صالح. حدّث أسعار الصرف ثم أعد المحاولة.','Gerekli kur geçersiz. Kurları güncelleyip tekrar deneyin.','A required exchange rate is invalid. Update the rates and try again.','Un taux requis est invalide. Actualisez les taux puis réessayez.','Необходимый курс недействителен. Обновите курсы и повторите попытку.'],
    conflict:['تغيّرت هذه المادة في مكان آخر. تراجع عن المسوّدة لتحميل النسخة المحفوظة ثم أعد التعديل.','Bu malzeme başka bir yerde değişti. Kayıtlı sürümü yüklemek için taslaktan vazgeçip tekrar düzenleyin.','This material changed elsewhere. Discard the draft to load the saved version, then edit again.','Cette matière a été modifiée ailleurs. Abandonnez le brouillon pour charger la version enregistrée, puis modifiez-la.','Этот материал изменён в другом месте. Отмените черновик, чтобы загрузить сохранённую версию, затем повторите правку.'],
    saveError:['تعذر حفظ المادة. بقيت مسوّدتك ويمكنك المحاولة مجدداً.','Malzeme kaydedilemedi. Taslağınız korundu; tekrar deneyebilirsiniz.','The material could not be saved. Your draft is preserved; you can retry.','La matière n’a pas pu être enregistrée. Votre brouillon est conservé ; réessayez.','Не удалось сохранить материал. Черновик сохранён; повторите попытку.'],
    ratesUpdated:['تم تحديث الصرف مع الحفاظ على السعر بالدولار.','Kur güncellendi; USD fiyatı korundu.','Rates updated while preserving the USD price.','Taux actualisés en conservant le prix en USD.','Курсы обновлены с сохранением цены в USD.'],
    missingProduct:['لم يعد المنتج موجوداً. افتح منتجاً آخر من صفحة الكلفة.','Ürün artık mevcut değil. Maliyet sayfasından başka bir ürün açın.','The product no longer exists. Open another product from the cost page.','Ce produit n’existe plus. Ouvrez un autre produit depuis la page de coût.','Товар больше не существует. Откройте другой товар на странице себестоимости.'],
    results:['{shown} من {total} مادة','{total} malzemenin {shown} tanesi','{shown} of {total} materials','{shown} matières sur {total}','Показано {shown} из {total} материалов'],
    more:['عرض المزيد','Daha fazla göster','Show more','Afficher plus','Показать ещё'],
    change:['اختيار مادة أخرى','Başka malzeme seç','Choose another material','Choisir une autre matière','Выбрать другой материал']
  };
  const text = (key, values = {}) => String(words[key]?.[Math.max(0, locales.indexOf(ops.locale()))] || key).replace(/\{(\w+)\}/g, (_, name) => values[name] ?? '');
  const titles = key => Object.fromEntries(locales.map((locale,index) => [locale,words[key][index]]));
  const make = (tag, className, value) => ops.make(tag, className, value);
  const labels = new Map(), drafts = new Map();
  let surface, mounted = false, selectedId = null, selectionProductId = null, pickerOpen = true, filter = 'all', visible = 40, unique = 0, readSequence = 0, readFailed = false, catalogSaving = false;
  let overview, purpose, readNotice, picker, search, filterButtons, list, listCount, moreButton, empty, editor, switchButton, saveButton;
  let fieldset, priceUSD, ratesText, message, discardButton, discardPrompt, usageHost, useButton, useHint;
  const rows = () => core.listMaterials(ops.state().settings);
  const products = () => Array.isArray(ops.state().products) ? ops.state().products : [];
  const selected = () => rows().find(row => String(row.id) === selectedId);
  const serialized = value => JSON.stringify(value);
  const dirty = model => serialized(model.data) !== model.baseline;
  function copy(tag, className, key, values) { const node = make(tag,className,text(key,values)); labels.set(node,{key,values}); return node; }
  function button(key, className, action, symbol) {
    const node = make('button',className); node.type = 'button';
    if (symbol) {const icon = make('span','wf-mat-icon'); icon.innerHTML = ops.icon(symbol); node.append(icon);}
    node.append(copy('span','',key)); node.addEventListener('click',action); return node;
  }
  function money(value, currency = 'USD') {
    try {const amount = cost.amount(value); return amount === null ? '—' : new Intl.NumberFormat(ops.locale(),{style:'currency',currency:cost.currencies.includes(currency) ? currency : 'USD',currencyDisplay:'code',maximumFractionDigits:4}).format(amount);}
    catch (_) {return '—';}
  }
  function fresh(row) {
    const data = {id:String(row.id),name:row.name || '',unit:row.unit || '',category:row.category || '',currency:cost.currencies.includes(row.currency) ? row.currency : 'USD',unitPrice:row.unitPrice ?? '',rates:row.rates ? cost.normalizeRates(row.rates) : cost.normalizeRates(ops.state())};
    return {data,baseline:serialized(data),savedVersion:serialized(row),expectedUpdatedAt:row.updatedAt ?? null,creating:false,saving:false,error:null,note:null,confirmDiscard:false};
  }
  function modelFor(row, refresh = false) {
    if (!row) return drafts.get(selectedId) || null;
    const key = String(row.id); let model = drafts.get(key);
    if (!model || refresh && !model.saving && !dirty(model) && !model.creating && model.savedVersion !== serialized(row)) {model = fresh(row); drafts.set(key,model);}
    return model;
  }
  const model = () => modelFor(selected());
  function errorText(error) {
    return text(({MATERIAL_NAME_REQUIRED:'nameRequired',MATERIAL_UNIT_REQUIRED:'unitRequired',INVALID_AMOUNT:'invalidAmount',INVALID_RATE:'invalidRate',INVALID_CURRENCY:'invalidRate',MATERIAL_CHANGED:'conflict',MATERIAL_REMOVED:'conflict',MATERIAL_ID_EXISTS:'conflict'})[error?.code] || 'saveError');
  }
  function cleanupLabels() {for (const node of labels.keys()) if (!node.isConnected) labels.delete(node);}
  async function readCommittedLibrary() {
    if (typeof dbGet !== 'function') return false;
    const sequence = ++readSequence;
    try {
      const latest = await dbGet('settings','main');
      if (sequence !== readSequence) return false;
      const settings = {...(ops.state().settings || {})};
      if (Object.prototype.hasOwnProperty.call(latest || {},'materialLibrary')) settings.materialLibrary = cost.clone(latest.materialLibrary);
      else delete settings.materialLibrary;
      ops.state().settings = settings; readFailed = false; return true;
    } catch (_) {if (sequence === readSequence) readFailed = true; return false;}
    finally {if (mounted && sequence === readSequence) {readNotice.hidden = !readFailed; readNotice.textContent = text('readFailed');}}
  }
  function nextId() {
    const used = new Set(rows().map(row => String(row.id)).concat([...drafts.keys()]));
    const base = 'wf-material-' + (root.wfNewRecordId?.() || root.crypto?.randomUUID?.() || Date.now().toString(36) + '-' + (++unique));
    let value = base, suffix = 1; while (used.has(value)) value = base + '-' + (++suffix); return value;
  }
  function add() {
    const current = model();
    if (!current?.creating || dirty(current)) {
      const id = nextId(), row = {id,name:'',unit:'',category:'',currency:'USD',unitPrice:'',rates:cost.normalizeRates(ops.state())};
      const next = fresh(row); next.creating = true; drafts.set(id,next); selectedId = id;
    }
    pickerOpen = false; renderList(); renderEditor(); sync(); editor.querySelector('input')?.focus({preventScroll:true});
  }
  function choose(id) {root.WFTouchKeyboard?.close('navigation',false); selectedId = String(id); pickerOpen = false; renderList(); renderEditor(); sync();}
  function sync() {
    const chosen = !!model();
    surface.page.dataset.materialSelected = String(chosen); surface.page.dataset.materialPicker = String(pickerOpen || !chosen);
    empty.hidden = chosen; editor.hidden = !chosen; saveButton.hidden = !chosen;
    switchButton.hidden = !chosen; switchButton.setAttribute('aria-expanded',String(pickerOpen));
  }
  function renderPurpose() {
    purpose.replaceChildren(); purpose.hidden = !selectionProductId;
    if (!selectionProductId) return;
    const product = products().find(item => String(item.id) === selectionProductId);
    const name = product?.name || '—';
    purpose.append(make('strong','',text(product ? 'selectionFor' : 'missingProduct',{name})),copy('p','','useHint'));
    const actions = make('div','wf-ops-row');
    if (product) actions.append(button('returnCost','btn btn-s',() => root.WFCosting?.open(selectionProductId),'back'));
    actions.append(button('browse','btn btn-s',() => {selectionProductId = null; renderPurpose(); refreshComputed();}));
    purpose.append(actions);
  }
  function renderList() {
    if (!mounted) return;
    const saved = rows(), currentRows = saved.concat([...drafts.entries()].filter(([key,value]) => value.creating && !saved.some(row => String(row.id) === key)).map(([,value]) => value.data));
    // Rebuild from current records for this render. Every material lookup below
    // shares one BOM traversal without caching across edits or backup restores.
    const usageIndex = core.buildUsageIndex(products());
    const linkedCount = row => usageIndex.get(String(row.id).trim())?.length || 0;
    const linked = saved.filter(row => linkedCount(row) > 0).length;
    const priced = saved.filter(row => {try{return cost.amount(row.unitPrice) !== null;}catch(_){return false;}}).length;
    overview.replaceChildren(...[['library',saved.length],['known',priced],['linked',linked]].map(([key,value]) => {
      const card = make('div','wf-mat-stat'); card.append(copy('span','',key),make('strong','',new Intl.NumberFormat(ops.locale()).format(value))); return card;
    }));
    const query = search.value.trim().toLocaleLowerCase();
    const found = currentRows.filter(row => (!query || [row.name,row.unit,row.category].join(' ').toLocaleLowerCase().includes(query)) && (filter !== 'linked' || linkedCount(row) > 0) && (filter !== 'unknown' || cost.missing(row.unitPrice)));
    list.replaceChildren();
    for (const row of found.slice(0,visible)) {
      const control = make('button','wf-mat-item'); control.type = 'button'; control.setAttribute('aria-pressed',String(String(row.id) === selectedId));
      const label = make('span','wf-mat-item-name'); label.append(make('strong','',row.name || text('newMaterial')));
      const details = [row.unit,row.category].filter(Boolean).join(' · '); label.append(make('span','wf-ops-muted',details || '—'));
      const draft = drafts.get(String(row.id)); if (draft && dirty(draft)) label.append(copy('span','wf-mat-draft-tag','draft'));
      const value = make('span','wf-mat-item-price',cost.missing(row.unitPrice) ? text('unknown') : money(row.unitPrice,row.currency)); value.dir = 'auto';
      control.append(label,value); control.addEventListener('click',() => choose(row.id)); list.append(control);
    }
    if (!found.length) list.append(copy('p','wf-ops-muted',saved.length ? 'noResults' : 'empty'));
    listCount.textContent = text('results',{shown:Math.min(visible,found.length),total:found.length}); moreButton.hidden = found.length <= visible;
    for (const control of filterButtons.children) control.setAttribute('aria-pressed',String(control.dataset.filter === filter));
    cleanupLabels();
  }
  function field(key,id,value,onChange,numeric = false,placeholder) {
    const group = make('div','wf-mat-field'), label = copy('label','',key); label.htmlFor = id;
    const input = make('input','fi'); input.id = id; input.name = id; input.type = 'text'; input.value = value ?? ''; input.autocomplete = 'off'; input.dir = numeric ? 'ltr' : 'auto';
    if (numeric) input.inputMode = 'decimal';
    if (placeholder) {input.dataset.materialPlaceholder = placeholder; input.placeholder = text(placeholder);}
    const update = () => {onChange(input.value); const current = model(); if (current) {current.error = null; current.note = null;} refreshComputed();};
    input.addEventListener('input',update); input.addEventListener('change',update); group.append(label,input); return group;
  }
  function renderEditor() {
    const current = modelFor(selected(),true); editor.replaceChildren(); if (!current) return;
    const data = current.data;
    fieldset = make('fieldset','wf-ops-card wf-mat-form');
    const fields = make('div','wf-mat-fields');
    fields.append(field('name','wfMaterialName',data.name,value => {data.name = value;}),field('unit','wfMaterialUnit',data.unit,value => {data.unit = value;},false,'unitHint'),field('category','wfMaterialCategory',data.category,value => {data.category = value;}));
    const currencyField = make('div','wf-mat-field'), currencyLabel = copy('label','','currency'); currencyLabel.htmlFor = 'wfMaterialCurrency';
    const currency = make('select','fi'); currency.id = 'wfMaterialCurrency';
    for (const code of cost.currencies) {const option = make('option','',code); option.value = code; currency.append(option);}
    currency.value = data.currency;
    currency.addEventListener('change',() => {
      try {current.data = core.convertMaterialCurrency(current.data,currency.value); current.error = null; current.note = null; renderEditor();}
      catch (error) {currency.value = current.data.currency; current.error = error; refreshComputed();}
    });
    currencyField.append(currencyLabel,currency);
    fields.append(currencyField,field('price','wfMaterialUnitPrice',data.unitPrice,value => {data.unitPrice = value;},true));
    const usd = make('div','wf-mat-usd-price'); usd.append(copy('span','','usdPrice')); priceUSD = make('bdi'); usd.append(priceUSD); fields.append(usd);
    const rates = make('div','wf-mat-rates'); rates.append(copy('span','wf-mat-eyebrow','rates')); ratesText = make('bdi'); rates.append(ratesText);
    const rebase = button('useRates','btn btn-s',() => {
      try {current.data = core.rebaseMaterialRates(current.data,ops.state()); current.error = null; current.note = 'ratesUpdated'; renderEditor();}
      catch (error) {current.error = error; refreshComputed();}
    },'restore');
    rates.append(rebase,copy('p','wf-ops-muted','rateHint'));
    fieldset.append(fields,copy('p','wf-ops-muted','priceHint'),rates); editor.append(fieldset);
    const selection = make('section','wf-ops-card wf-mat-selection');
    useButton = button('use','btn btn-p',() => useSelected(),'plus'); useHint = make('p','wf-ops-muted'); selection.append(useButton,useHint); selection.dataset.materialUse = ''; editor.append(selection);
    const usage = make('section','wf-ops-card wf-mat-usage'); usage.append(copy('h2','','usage'),copy('p','wf-ops-muted','usageHint')); usageHost = make('div','wf-mat-usage-list'); usage.append(usageHost); editor.append(usage);
    const footer = make('section','wf-ops-card wf-mat-footer'); message = make('p','wf-ops-status'); message.setAttribute('role','status');
    discardButton = button('discard','btn btn-s',() => {current.confirmDiscard = true; refreshComputed();});
    discardPrompt = make('div','wf-mat-discard-prompt'); discardPrompt.append(copy('p','','discardQuestion'),button('confirmDiscard','btn btn-s',() => {
      const wasNew = current.creating; drafts.delete(selectedId); if (wasNew) selectedId = null; renderEditor(); renderList(); sync();
    }),button('keep','btn btn-p',() => {current.confirmDiscard = false; refreshComputed();}));
    footer.append(message,copy('p','wf-ops-muted','draftHint'),discardButton,discardPrompt); editor.append(footer);
    refreshComputed(); cleanupLabels();
  }
  function refreshComputed() {
    if (!mounted) return;
    const current = model(); if (!current || !fieldset) return;
    let prepared, validation;
    try {prepared = core.prepareMaterial(current.data,current.expectedUpdatedAt);} catch (error) {validation = error;}
    priceUSD.textContent = prepared?.unitPriceUSD == null ? text('unknown') : money(prepared.unitPriceUSD);
    const quotes = cost.normalizeRates(current.data.rates), number = value => value === null ? '—' : new Intl.NumberFormat(ops.locale(),{maximumFractionDigits:6}).format(value);
    ratesText.textContent = '1 USD = ' + number(quotes.usdTry) + ' TRY · ' + number(quotes.usdEur) + ' EUR';
    const unsaved = dirty(current), error = current.error || (unsaved ? validation : null);
    saveButton.disabled = catalogSaving || !unsaved || !!validation; saveButton.setAttribute('aria-busy',String(catalogSaving));
    const saveCaption = saveButton.querySelector('span:last-child'), saveKey = catalogSaving ? 'saving' : 'save'; labels.set(saveCaption,{key:saveKey}); saveCaption.textContent = text(saveKey);
    fieldset.disabled = catalogSaving; discardButton.disabled = catalogSaving || (!unsaved && !current.creating); discardPrompt.hidden = !current.confirmDiscard || (!unsaved && !current.creating);
    message.dataset.kind = error ? 'error' : unsaved ? 'draft' : 'success'; message.textContent = error ? errorText(error) : text(current.saving ? 'saving' : current.note || (unsaved ? 'draft' : current.creating ? 'newMaterial' : 'saved'));
    const selection = editor.querySelector('[data-material-use]'); selection.hidden = !selectionProductId;
    useButton.disabled = current.creating || catalogSaving || unsaved || !products().some(row => String(row.id) === selectionProductId);
    useHint.textContent = text(current.creating || unsaved ? 'saveFirst' : 'useHint');
    usageHost.replaceChildren();
    const used = current.creating ? [] : core.usage(products(),current.data.id);
    if (!used.length) usageHost.append(copy('p','wf-ops-muted','noUsage'));
    for (const product of used) {
      const action = make('button','btn btn-s wf-mat-usage-item'); action.type = 'button'; action.append(make('span','',String(product.name || '—')),copy('span','wf-ops-muted','viewCost'));
      action.addEventListener('click',() => root.WFCosting?.open(product.id)); usageHost.append(action);
    }
    cleanupLabels();
  }
  async function save() {
    const current = model(); if (!current || catalogSaving || !dirty(current)) return false;
    try {core.prepareMaterial(current.data);} catch (error) {current.error = error; refreshComputed(); return false;}
    const id = current.data.id; ++readSequence; catalogSaving = true; current.saving = true; current.error = null; refreshComputed();
    let saved;
    try {
      saved = await core.persistMaterial({state:ops.state(),draft:current.data,creating:current.creating,expectedUpdatedAt:current.expectedUpdatedAt,
        writeBatch:operations => wfWriteBatch(operations),hydrate:record => typeof wfHydrateDBValue === 'function' ? wfHydrateDBValue(record) : record});
    } catch (error) {
      catalogSaving = false; current.saving = false; current.error = error; current.note = null;
      if (['MATERIAL_CHANGED','MATERIAL_REMOVED','MATERIAL_ID_EXISTS'].includes(error?.code)) {await readCommittedLibrary(); renderList();}
      refreshComputed(); ops.notify(errorText(error),'er'); return false;
    }
    ++readSequence; catalogSaving = false; current.saving = false; readFailed = false; readNotice.hidden = true; drafts.delete(id); const next = fresh(saved); next.note = 'saved'; drafts.set(id,next);
    try {if (selectedId === id) renderEditor(); else refreshComputed(); renderList(); root.dispatchEvent(new Event('wf-material-library-change'));}
    catch (error) {root.console?.error('WOW material saved; display refresh failed',error);}
    ops.notify(text('saved'),'ok'); return true;
  }
  function useSelected() {
    const current = model(), row = selected(), productId = selectionProductId;
    if (!row || !current || current.creating || dirty(current) || catalogSaving || !productId) return;
    if (root.WFCosting?.addCatalogMaterial(row.id,productId)) {selectionProductId = null; root.WFCosting.open(productId);}
  }
  function registerGuard() {root.WFAppUpdates?.registerGuard('material-library',() => [...drafts.values()].some(value => value.saving || dirty(value)));}
  function mount() {
    if (mounted) return; mounted = true;
    purpose = make('section','wf-ops-card wf-mat-purpose'); readNotice = make('p','wf-ops-status'); readNotice.dataset.kind = 'error'; readNotice.hidden = true; readNotice.setAttribute('role','status');
    overview = make('div','wf-mat-overview'); surface.body.append(purpose,readNotice,overview);
    const layout = make('div','wf-mat-layout'); picker = make('section','wf-ops-card wf-mat-picker'); picker.id = 'wfMaterialPicker'; picker.append(copy('h2','','library'));
    search = make('input','fi'); search.id = 'wfMaterialSearch'; search.type = 'search'; search.placeholder = text('search'); search.setAttribute('aria-label',text('search')); search.addEventListener('input',() => {visible = 40; renderList();});
    filterButtons = make('div','wf-mat-filters');
    for (const key of ['all','unknown','linked']) {const control = button(key,'wf-mat-filter',() => {filter = key; visible = 40; renderList();}); control.dataset.filter = key; filterButtons.append(control);}
    listCount = make('p','wf-ops-muted wf-mat-list-count'); listCount.setAttribute('role','status'); list = make('div','wf-mat-list'); moreButton = button('more','btn btn-s',() => {visible += 40; renderList();});
    picker.append(search,filterButtons,listCount,list,moreButton);
    const detail = make('div','wf-mat-detail'); switchButton = button('change','btn btn-s wf-mat-change',() => {pickerOpen = !pickerOpen; sync(); if (pickerOpen) search.focus({preventScroll:true});}); switchButton.setAttribute('aria-controls','wfMaterialPicker');
    empty = make('section','wf-ops-card wf-mat-empty'); const emptyIcon = make('div','wf-mat-empty-icon'); emptyIcon.innerHTML = ops.icon('material');
    empty.append(emptyIcon,copy('h2','','choose'),copy('p','','chooseHint'),button('add','btn btn-p',add,'plus')); editor = make('div','wf-mat-editor');
    detail.append(switchButton,empty,editor); layout.append(picker,detail); surface.body.append(layout);
    saveButton = button('save','btn btn-p',() => save(),'save'); saveButton.id = 'wfMaterialSave';
    const addButton = button('add','btn btn-s',add,'plus'); addButton.id = 'wfMaterialAdd';
    const refreshButton = button('refresh','btn btn-s',() => refresh(),'restore'); refreshButton.id = 'wfMaterialRefresh'; surface.actions.append(refreshButton,addButton,saveButton);
    registerGuard(); root.addEventListener('load',registerGuard,{once:true});
  }
  function translate() {
    if (!mounted) return;
    for (const [node,entry] of labels) {if (node.isConnected) node.textContent = text(entry.key,entry.values); else labels.delete(node);}
    search.placeholder = text('search'); search.setAttribute('aria-label',text('search'));
    for (const input of surface.page.querySelectorAll('[data-material-placeholder]')) input.placeholder = text(input.dataset.materialPlaceholder);
    readNotice.textContent = text('readFailed'); renderPurpose(); renderList(); refreshComputed();
  }
  function enter() {
    mount();
    const pending = drafts.get(selectedId);
    if (selectedId && !selected() && !pending?.creating && (!pending || !dirty(pending))) {drafts.delete(selectedId); selectedId = null; pickerOpen = true;}
    renderPurpose(); renderList(); renderEditor(); sync(); translate();
    return refresh();
  }
  async function refresh() {
    if (!mounted) {mount(); renderPurpose(); renderList(); renderEditor(); sync();}
    if ([...drafts.values()].some(value => value.saving)) return;
    const changed = await readCommittedLibrary();
    if (!changed) return;
    const current = model();
    if (selectedId && !selected() && current && !current.creating && !dirty(current)) {drafts.delete(selectedId); selectedId = null; pickerOpen = true;}
    // A read may finish during touch-keyboard input. Never replace those nodes
    // or discard a dirty local draft; Discard explicitly loads the saved row.
    if (!current || !dirty(current) && !current.saving && !fieldset?.contains?.(root.document.activeElement)) renderEditor();
    renderList(); sync(); refreshComputed();
  }
  surface = ops.register({id:'material-library',title:titles('title'),subtitle:titles('subtitle'),icon:'material',parent:'products',onEnter:enter,onLanguage:translate});
  root.WFMaterialLibrary = Object.freeze({
    open(materialId) {
      selectionProductId = null;
      if (materialId !== undefined && rows().some(row => String(row.id) === String(materialId))) {selectedId = String(materialId); pickerOpen = false;}
      return ops.open('material-library');
    },
    refresh,
    list() {return cost.clone(rows());},
    chooseForProduct(productId) {
      if (!products().some(product => String(product.id) === String(productId))) {ops.notify(text('missingProduct'),'er'); return false;}
      selectionProductId = String(productId); return ops.open('material-library');
    }
  });
})(typeof window === 'object' ? window : globalThis);
