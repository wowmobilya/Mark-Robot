/* Fold the two printed faces into one 100 × 150 mm showroom card.
   Product records are read-only; only the independent print-locale preference is saved. */
(() => {
  'use strict';

  function safeImageSource(value, base) {
    if (typeof value !== 'string' || !value.trim()) return '';
    const source = value.trim();
    if (/^data:image\/(?:png|jpe?g|webp|gif|svg\+xml);/i.test(source) || /^blob:https?:/i.test(source)) return source;
    if (/^[a-z][a-z\d+.-]*:/i.test(source) && !/^https?:/i.test(source)) return '';
    try { const url = new URL(source, base); return /^https?:$/.test(url.protocol) ? url.href : ''; } catch (_) { return ''; }
  }
  function barcodePlan(value, encode) {
    const payload = String(value ?? '');
    if (!payload.trim()) return {kind:'missing', value:payload};
    if (!/^[\x20-\x7e]{1,40}$/.test(payload)) return {kind:'qr', value:payload};
    try {
      const target = {};
      encode(target, payload, {format:'CODE128', displayValue:false, width:1, margin:10});
      const data = target.encodings.map(part => part.data).join('');
      const modules = data.length, quiet = 10;
      if (!modules || !/^[01]+$/.test(data) || 86 / (modules + quiet * 2) < .25) return {kind:'qr', value:payload};
      return {kind:'code128', value:payload, data, modules, quiet, widthMm:Math.min(86, Math.max(42, (modules + quiet * 2) * .35))};
    } catch (_) { return {kind:'qr', value:payload}; }
  }
  function captureSelection(products, ids) {
    const byId = new Map(products.map(product => [String(product.id), product]));
    return [...new Set(ids.map(String))].map(id => {
      const product = byId.get(id);
      if (!product) throw new Error('MISSING_PRODUCT|' + id);
      return {...product, dims:Array.isArray(product.dims) ? product.dims.map(row => ({...row})) : product.dims};
    });
  }
  async function persistLocale(state, locale, writeBatch) {
    if (!['ar','tr','en','fr','ru'].includes(locale)) throw new Error('INVALID_LOCALE');
    const [row] = await writeBatch([{
      type:'merge', store:'settings', id:'main', value:{productLabels:{locale}},
      merge(stored, patch) { return {...stored, id:'main', productLabels:{...stored?.productLabels, ...patch.productLabels}}; }
    }]);
    if (!row?.productLabels || row.productLabels.locale !== locale) throw new Error('PREFERENCE_WRITE');
    state.settings.productLabels = {...row.productLabels};
    return state.settings.productLabels;
  }
  function withTimeout(promise, ms, message) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(message)), ms);
      Promise.resolve(promise).then(value => { clearTimeout(timer); resolve(value); }, error => { clearTimeout(timer); reject(error); });
    });
  }
  function waitForImage(image, timeout = 12000) {
    const loadedImage = new Promise((resolve, reject) => {
      let timer;
      const finish = error => {
        clearTimeout(timer); image.removeEventListener('load', loaded); image.removeEventListener('error', failed);
        if (error) reject(error); else resolve(image);
      };
      const loaded = () => finish(image.naturalWidth > 0 && image.naturalHeight > 0 ? null : new Error('IMAGE_LOAD'));
      const failed = () => finish(new Error('IMAGE_LOAD'));
      if (image.complete) { loaded(); return; }
      image.addEventListener('load', loaded, {once:true}); image.addEventListener('error', failed, {once:true});
      timer = setTimeout(() => finish(new Error('IMAGE_TIMEOUT')), timeout);
    });
    return withTimeout(loadedImage.then(async loaded => {
      if (typeof loaded.decode === 'function') {
        try { await loaded.decode(); } catch (_) { throw new Error('IMAGE_LOAD'); }
      }
      return loaded;
    }), timeout, 'IMAGE_TIMEOUT');
  }
  const helpers = {safeImageSource, barcodePlan, captureSelection, persistLocale, withTimeout, waitForImage};
  if (typeof module === 'object' && module.exports) { module.exports = helpers; return; }
  if (typeof document === 'undefined' || window.WFProductLabels || !window.WFProductLabelCore) return;

  const core = window.WFProductLabelCore, doc = document, root = doc.documentElement;
  const byId = id => doc.getElementById(id), state = () => typeof S === 'object' ? S : {};
  const language = () => core.normalizeLocale(root.lang || state().lang);
  const script = doc.currentScript || doc.querySelector('script[src*="product-labels.js"]');
  const stylesheet = new URL('product-labels.css?v=3', script?.src || doc.baseURI).href;
  const words = {
    ar:{
      title:'بطاقات المعرض', card:'بطاقة المعرض', back:'العودة إلى المنتجات', print:'طباعة البطاقات',
      subtitle:'وجهان متصلان · بطاقة 10 × 15 سم بعد الطي', language:'لغة الطباعة', preference:'لغة محفوظة للبطاقات، مستقلة عن لغة البرنامج.',
      saved:'تم حفظ لغة الطباعة الافتراضية.', saving:'جارٍ حفظ اللغة…', saveError:'تغيّرت المعاينة، وتعذّر حفظ اللغة للمرة القادمة. اخترها مجددًا لإعادة المحاولة.',
      selection:'اختيار المنتجات', all:'تحديد النتائج', clear:'إلغاء التحديد', search:'ابحث باسم المنتج أو الباركود', count:'{count} منتج · {count} ورقة A4',
      empty:'لا توجد منتجات محفوظة في هذا القسم.', none:'اختر منتجًا لتظهر بطاقته.', previous:'البطاقة السابقة', next:'البطاقة التالية', page:'الورقة {page} من {count}',
      preparing:'جارٍ تجهيز الصور وفحص البطاقات…', opened:'تم فتح نافذة الطباعة.', ready:'قصّ الحد الخارجي، ثم اطوِ الخط المتقطع في الوسط.',
      qr:'الرمز الطويل أو المكتوب بالعربية يظهر بصيغة QR مع الحفاظ على بياناته الأصلية.',
      imageError:'تعذّر تحميل صورة أو شعار. أعد المحاولة بعد اكتمال تحميل الصورة.',
      layoutError:'بيانات هذا المنتج أطول من مساحة البطاقة. عدّل الاسم أو الوصف أو المقاسات قبل الطباعة:',
      barcodeError:'تعذّر إنشاء رمز قابل للقراءة لهذا المنتج:',
      missingError:'تغيّر أحد المنتجات المختارة. افتح قائمة البطاقات من جديد.',
      assetError:'تعذّر تجهيز الطباعة. أعد المحاولة.', source:'الصورة والمقاسات والوصف من المنتج المحفوظ.', edit:'تعديل المنتج',
      sheet:'A4 أفقي · حد خارجي للقص · خط متقطع للطي', unavailable:'الطباعة غير متاحة في هذا المتصفح.'
    },
    tr:{
      title:'Mağaza etiketleri', card:'Mağaza etiketi', back:'Ürünlere dön', print:'Etiketleri yazdır',
      subtitle:'Birleşik iki yüz · Katlandıktan sonra 10 × 15 cm', language:'Baskı dili', preference:'Etiket dili, uygulama dilinden ayrı kaydedilir.',
      saved:'Varsayılan baskı dili kaydedildi.', saving:'Dil kaydediliyor…', saveError:'Önizleme değişti ancak dil kaydedilemedi. Yeniden denemek için dili seçin.',
      selection:'Ürünleri seç', all:'Sonuçları seç', clear:'Seçimi temizle', search:'Ürün adı veya barkod ara', count:'{count} ürün · {count} A4 sayfa',
      empty:'Bu bölümde kayıtlı ürün yok.', none:'Etiketini görmek için bir ürün seçin.', previous:'Önceki etiket', next:'Sonraki etiket', page:'Sayfa {page} / {count}',
      preparing:'Görseller hazırlanıyor ve etiketler kontrol ediliyor…', opened:'Yazdırma penceresi açıldı.', ready:'Dış çizgiden kesin, ortadaki kesik çizgiden katlayın.',
      qr:'Uzun veya Latin harfleri içermeyen kodlar, özgün verileri korunarak QR olarak gösterilir.',
      imageError:'Bir görsel veya logo yüklenemedi. Görsel yüklendiğinde tekrar deneyin.',
      layoutError:'Bu ürünün bilgileri etikete sığmıyor. Yazdırmadan önce adı, açıklamayı veya ölçüleri düzenleyin:',
      barcodeError:'Bu ürün için okunabilir kod oluşturulamadı:', missingError:'Seçilen ürünlerden biri değişti. Etiket listesini yeniden açın.',
      assetError:'Baskı hazırlanamadı. Tekrar deneyin.', source:'Görsel, ölçüler ve açıklama kayıtlı üründen alınır.', edit:'Ürünü düzenle',
      sheet:'A4 yatay · Dış çizgiden kesin · Kesik çizgiden katlayın', unavailable:'Bu tarayıcıda yazdırma kullanılamıyor.'
    },
    en:{
      title:'Showroom cards', card:'Showroom card', back:'Back to products', print:'Print cards',
      subtitle:'Two connected faces · 10 × 15 cm after folding', language:'Print language', preference:'Card language is saved separately from the app language.',
      saved:'Default print language saved.', saving:'Saving language…', saveError:'The preview changed, but the language could not be saved. Select it again to retry.',
      selection:'Choose products', all:'Select results', clear:'Clear selection', search:'Search product name or barcode', count:'{count} products · {count} A4 sheets',
      empty:'No saved products in this section.', none:'Select a product to preview its card.', previous:'Previous card', next:'Next card', page:'Sheet {page} of {count}',
      preparing:'Preparing images and checking the cards…', opened:'Print dialog opened.', ready:'Cut the outer outline, then fold the dashed center line.',
      qr:'Long or non-Latin codes use QR while preserving the original barcode data.',
      imageError:'An image or logo could not load. Try again when the image is available.',
      layoutError:'This product has more content than the card can hold. Edit its name, description or sizes before printing:',
      barcodeError:'A readable code could not be created for this product:', missingError:'A selected product changed. Open the card list again.',
      assetError:'Could not prepare printing. Please retry.', source:'Image, sizes and description come from the saved product.', edit:'Edit product',
      sheet:'A4 landscape · Solid cut outline · Dashed fold line', unavailable:'Printing is unavailable in this browser.'
    },
    fr:{
      title:'Fiches d’exposition', card:'Fiche d’exposition', back:'Retour aux produits', print:'Imprimer les fiches',
      subtitle:'Deux faces jointes · 10 × 15 cm après pliage', language:'Langue d’impression', preference:'La langue des fiches est enregistrée séparément de celle de l’application.',
      saved:'Langue d’impression par défaut enregistrée.', saving:'Enregistrement de la langue…', saveError:'L’aperçu a changé, mais la langue n’a pas été enregistrée. Sélectionnez-la à nouveau.',
      selection:'Choisir les produits', all:'Sélectionner les résultats', clear:'Effacer la sélection', search:'Rechercher un produit ou un code-barres', count:'{count} produits · {count} feuilles A4',
      empty:'Aucun produit enregistré dans cette section.', none:'Sélectionnez un produit pour voir sa fiche.', previous:'Fiche précédente', next:'Fiche suivante', page:'Feuille {page} sur {count}',
      preparing:'Préparation des images et vérification des fiches…', opened:'Fenêtre d’impression ouverte.', ready:'Découpez le contour extérieur, puis pliez sur les pointillés au centre.',
      qr:'Les codes longs ou non latins utilisent un QR en conservant les données d’origine.',
      imageError:'Une image ou un logo n’a pas pu être chargé. Réessayez lorsque l’image est disponible.',
      layoutError:'Le contenu de ce produit dépasse la fiche. Modifiez son nom, sa description ou ses dimensions avant l’impression :',
      barcodeError:'Impossible de créer un code lisible pour ce produit :', missingError:'Un produit sélectionné a changé. Rouvrez la liste des fiches.',
      assetError:'Impossible de préparer l’impression. Réessayez.', source:'L’image, les dimensions et la description proviennent du produit enregistré.', edit:'Modifier le produit',
      sheet:'A4 paysage · Contour à découper · Pointillés à plier', unavailable:'L’impression n’est pas disponible dans ce navigateur.'
    },
    ru:{
      title:'Карточки для выставки', card:'Карточка для выставки', back:'К товарам', print:'Печать карточек',
      subtitle:'Две соединённые стороны · 10 × 15 см после сгиба', language:'Язык печати', preference:'Язык карточек сохраняется отдельно от языка приложения.',
      saved:'Язык печати по умолчанию сохранён.', saving:'Сохранение языка…', saveError:'Предпросмотр изменён, но язык не сохранён. Выберите его ещё раз.',
      selection:'Выбрать товары', all:'Выбрать результаты', clear:'Снять выбор', search:'Поиск по названию или штрихкоду', count:'Товаров: {count} · Листов A4: {count}',
      empty:'В этом разделе нет сохранённых товаров.', none:'Выберите товар для просмотра карточки.', previous:'Предыдущая карточка', next:'Следующая карточка', page:'Лист {page} из {count}',
      preparing:'Подготовка изображений и проверка карточек…', opened:'Открыто окно печати.', ready:'Вырежьте по внешнему контуру и согните по пунктирной линии в центре.',
      qr:'Длинные коды и коды не на латинице выводятся в QR с сохранением исходных данных.',
      imageError:'Не удалось загрузить изображение или логотип. Повторите попытку после загрузки.',
      layoutError:'Данные товара не помещаются на карточке. Измените название, описание или размеры перед печатью:',
      barcodeError:'Не удалось создать читаемый код для товара:', missingError:'Один из выбранных товаров изменился. Откройте список карточек заново.',
      assetError:'Не удалось подготовить печать. Повторите попытку.', source:'Изображение, размеры и описание взяты из сохранённого товара.', edit:'Изменить товар',
      sheet:'A4 альбомный · Сплошная линия — рез · Пунктир — сгиб', unavailable:'Печать недоступна в этом браузере.'
    }
  };
  const workspaceCopy = {
    catalogTab:['المنتجات','Ürünler','Products','Produits','Товары'],
    previewTab:['المعاينة','Önizleme','Preview','Aperçu','Предпросмотр'],
    allProducts:['الكل','Tümü','All','Tous','Все'],
    onlySelected:['المحدّد','Seçilenler','Selected','Sélectionnés','Выбранные'],
    needsReview:['للمراجعة','Kontrol','Review','À vérifier','Проверить'],
    noResults:['لا توجد نتائج مطابقة. جرّب اسمًا أو رمزًا آخر.','Eşleşen ürün yok. Başka bir ad veya kod deneyin.','No matches. Try another name or code.','Aucun résultat. Essayez un autre nom ou code.','Совпадений нет. Попробуйте другое название или код.'],
    results:['{shown} من {count} نتيجة','{count} sonuçtan {shown}','{shown} of {count} results','{shown} sur {count} résultats','Показано {shown} из {count}'],
    showMore:['عرض المزيد','Daha fazla','Show more','Voir plus','Показать ещё'],
    previewProduct:['معاينة {name}','{name} önizlemesi','Preview {name}','Aperçu de {name}','Просмотр: {name}'],
    missingName:['الاسم ناقص','Ad eksik','Missing name','Nom manquant','Нет названия'],
    missingImage:['بدون صورة','Görsel yok','No image','Sans image','Нет изображения'],
    missingDimensions:['المقاسات ناقصة','Ölçü yok','No sizes','Sans dimensions','Нет размеров'],
    previewOnly:['معاينة فقط · غير محدّد للطباعة','Yalnız önizleme · Baskıya seçilmedi','Preview only · Not selected for printing','Aperçu seul · Non sélectionné','Только просмотр · Не выбрано для печати'],
    includeCard:['إضافة للطباعة','Baskıya ekle','Add to print','Ajouter à l’impression','Добавить к печати'],
    faceView:['وجه البطاقة','Kart yüzü','Card face','Face de la fiche','Сторона карточки'],
    sheetView:['ورقة A4','A4 sayfası','A4 sheet','Feuille A4','Лист A4'],
    printConstruction:['الطباعة دائمًا: وجهان متصلان على كل ورقة A4.','Her A4 sayfasına iki birleşik yüz yazdırılır.','Every A4 sheet prints two connected faces.','Chaque feuille A4 imprime deux faces jointes.','На каждом листе A4 печатаются две соединённые стороны.'],
    checking:['جارٍ فحص البطاقة…','Kart kontrol ediliyor…','Checking the card…','Vérification de la fiche…','Проверка карточки…'],
    cardReady:['البطاقة جاهزة للطباعة','Kart baskıya hazır','Card ready to print','Fiche prête à imprimer','Карточка готова к печати'],
    cardReview:['راجع البيانات الناقصة قبل الطباعة','Yazdırmadan önce eksik bilgileri kontrol edin','Review missing details before printing','Vérifiez les données manquantes avant d’imprimer','Проверьте недостающие данные перед печатью'],
    cardBlocked:['تحتاج البطاقة تصحيحًا قبل الطباعة','Kart yazdırılmadan önce düzeltilmeli','Correct this card before printing','Corrigez cette fiche avant l’impression','Исправьте карточку перед печатью'],
    printCount:['طباعة {count}','Yazdır · {count}','Print · {count}','Imprimer · {count}','Печать · {count}'],
    printSheets:['طباعة {count} ورقة A4','{count} A4 sayfası yazdır','Print {count} A4 sheets','Imprimer {count} feuilles A4','Печать {count} листов A4'],
    selectedCards:['قائمة الطباعة','Baskı listesi','Print list','Liste d’impression','Список печати'],
    previousCards:['البطاقات السابقة','Önceki kartlar','Previous cards','Fiches précédentes','Предыдущие карточки'],
    nextCards:['البطاقات التالية','Sonraki kartlar','Next cards','Fiches suivantes','Следующие карточки'],
    guide:['القص والطي','Kesme ve katlama','Cutting and folding','Découpe et pliage','Вырезание и сгиб'],
    chooseProducts:['اختيار منتجات','Ürün seç','Choose products','Choisir des produits','Выбрать товары'],
    sourceDetails:['تعرض البطاقة بيانات المنتج المحفوظة.','Kart, kayıtlı ürün bilgilerini gösterir.','The card uses the saved product details.','La fiche reprend les données enregistrées du produit.','Карточка использует сохранённые данные товара.'],
    printReturned:['أُغلقت نافذة الطباعة. يمكنك تجهيز طبعة جديدة.','Yazdırma penceresi kapandı. Yeni bir baskı hazırlayabilirsiniz.','Print dialog closed. You can prepare another print.','La fenêtre d’impression est fermée. Vous pouvez préparer une autre impression.','Окно печати закрыто. Можно подготовить новую печать.'],
    printRecovery:['أغلقتُ نافذة الطباعة','Yazdırma penceresini kapattım','I closed the print dialog','J’ai fermé la fenêtre d’impression','Я закрыл окно печати'],
    printRecoveryHint:['اضغط فقط بعد إغلاق نافذة الطباعة إذا بقي القسم مشغولًا.','Bölüm meşgul kalırsa yalnızca yazdırma penceresini kapattıktan sonra basın.','Use only after closing the print dialog if this section remains busy.','Utilisez uniquement après avoir fermé la fenêtre d’impression si cette section reste occupée.','Нажмите только после закрытия окна печати, если раздел остаётся занят.']
  };
  const languageNames = {ar:'العربية', tr:'Türkçe', en:'English', fr:'Français', ru:'Русский'};
  const t = (key, params = {}) => String(words[language()][key] || workspaceCopy[key]?.[core.locales.indexOf(language())] || words.en[key] || key).replace(/\{(\w+)\}/g, (_, name) => params[name] ?? '');
  const make = (tag, className, value, owner = doc) => {
    const element = owner.createElement(tag);
    if (className) element.className = className;
    if (value !== undefined) element.textContent = value;
    return element;
  };
  const svgNS = 'http://www.w3.org/2000/svg';
  const paths = {
    print:'M6 9V3h12v6M6 18H4V9h16v9h-2M6 14h12v7H6zM16 11h2',
    card:'M3 4h18v16H3zM12 4v16M6 8h3M6 12h3M15 8h3M15 12h3',
    back:'m14 5-7 7 7 7', next:'m10 5 7 7-7 7',
    globe:'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM3 12h18M12 3c5 5 5 13 0 18-5-5-5-13 0-18Z',
    edit:'m15 4 5 5M4 20l4-1L21 6l-5-5L3 14l-1 7z', chevron:'m6 9 6 6 6-6',
    eye:'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12ZM15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z',
    plus:'M12 5v14M5 12h14', image:'M3 3h18v18H3zM3 16l5-5 4 4 4-6 5 7M7 7h1',
    check:'m5 12 4 4L19 6', search:'M21 21l-5-5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z'
  };
  function icon(name, owner = doc) {
    const svg = owner.createElementNS(svgNS, 'svg'), path = owner.createElementNS(svgNS, 'path');
    svg.setAttribute('viewBox','0 0 24 24'); svg.setAttribute('fill','none'); svg.setAttribute('stroke','currentColor');
    svg.setAttribute('stroke-width','1.7'); svg.setAttribute('stroke-linecap','round'); svg.setAttribute('stroke-linejoin','round');
    svg.setAttribute('aria-hidden','true'); path.setAttribute('d',paths[name] || paths.card); svg.append(path); return svg;
  }
  const translated = (element, key) => { element.dataset.wfLabelCopy=key; return element; };
  function button(key, className, symbol, action) {
    const element = make('button', className); element.type = 'button';
    if (symbol) element.append(icon(symbol));
    const label = translated(make('span', '', t(key)),key); element.append(label);
    element.addEventListener('click', action); return element;
  }
  let workspace, preview, stage, languageToggle, languageChoices, preferenceNote, selection, list, search, summary, currentName, counter, previous, next, printButton, status, errorBox;
  let selected = new Set(), available = [], currentId = null, printLocale = 'ar', opened = false, preparing = false, activePrint = null, saveQueue = Promise.resolve(), saveRevision = 0, previewRevision = 0, opener = null;
  let savedNoteKey = 'preference', updateGuard = false;
  let catalogPanel, previewPanel, queue, emptyPreview, includeButton, editButton, resultsCount, selectAllButton, clearButton, moreButton, printRecovery;
  let pane = 'preview', viewMode = 'face', selectionFilter = 'all', visibleCount = 40, hasSelectionSession = false, localeInitialized = false, pendingSaves = 0, previewState = null;
  let needsPreviewCheck=false,lastPreviewWidth=0,printFailure=null;
  let catalogSource=null,catalogLength=0,catalogRevision=0,productIndex=new Map(),searchIndex=new Map(),reviewIndex=new Map();
  let filteredCache=null,selectionRevision=0,queueSignature='',queueWindowSignature='';
  const paneButtons = {}, filterButtons = {}, viewButtons = {};
  const page = byId('page-products');
  if (!page) return;

  function products() { return Array.isArray(state().products) ? state().products : []; }
  function selectedIds() { return [...selected]; }
  function indexCatalog(force = false) {
    const source=products();
    if(!force&&catalogSource===source&&catalogLength===source.length)return;
    catalogSource=source;catalogLength=source.length;catalogRevision++;
    productIndex=new Map();searchIndex=new Map();reviewIndex=new Map();
    for(const product of source){
      if(product?.id===null||product?.id===undefined)continue;
      const id=String(product.id);productIndex.set(id,product);
      searchIndex.set(id,[product.name,product.barcode,product.code,product.type].map(core.normalizeSearch).join(' '));
    }
    available=[...productIndex.keys()];filteredCache=null;queueSignature='';
  }
  function options() {
    indexCatalog();
    const query=core.normalizeSearch(search?.value||''),key=query+'|'+selectionFilter+'|'+selectionRevision;
    if(filteredCache?.key===key)return filteredCache.products;
    const tokens=query.split(/\s+/).filter(Boolean),matches=[];
    for(const [id,product]of productIndex){
      if(selectionFilter==='selected'&&!selected.has(id))continue;
      if(tokens.length&&!tokens.every(token=>searchIndex.get(id).includes(token)))continue;
      if(selectionFilter==='review'){
        if(!reviewIndex.has(id))reviewIndex.set(id,core.reviewProduct(product));
        if(!reviewIndex.get(id).length)continue;
      }
      matches.push(product);
    }
    filteredCache={key,products:matches};return matches;
  }
  function registerGuard() {
    if (!updateGuard && window.WFAppUpdates) {
      window.WFAppUpdates.registerGuard('product-label-print', () => preparing || !!activePrint || pendingSaves > 0);
      updateGuard = true;
    }
  }
  function showError(error) {
    const message = String(error?.message || error), name = message.split('|').slice(1).join('|');
    const key = message.startsWith('IMAGE') ? 'imageError' : message.startsWith('OVERFLOW') ? 'layoutError' :
      message.startsWith('BARCODE') ? 'barcodeError' : message.startsWith('MISSING_PRODUCT') ? 'missingError' :
      message.startsWith('PRINT_UNAVAILABLE') ? 'unavailable' : 'assetError';
    errorBox.textContent = t(key) + (['layoutError','barcodeError'].includes(key) && name ? ' ' + name : '');
    errorBox.hidden = false;
  }
  function updateControls(source) {
    if (!workspace) return;
    const busy = preparing || !!activePrint;
    const blocking = selected.has(currentId) && previewState?.id === currentId && previewState.state === 'error';
    printButton.disabled = busy || !selected.size || blocking;
    printButton.setAttribute('aria-busy',String(busy));
    printButton.querySelector('span').textContent = t('printCount',{count:selected.size});
    printButton.setAttribute('aria-label',t('printSheets',{count:selected.size}));
    languageToggle.disabled = busy;
    for (const choice of languageChoices.children) choice.disabled = busy;
    if (selectAllButton) {
      const choices=source||options();
      selectAllButton.disabled=busy||!choices.length||choices.every(product=>selected.has(String(product.id)));
    }
    if (clearButton) clearButton.disabled = busy || !selected.size;
    if (editButton) editButton.disabled = busy || !currentId;
    if (includeButton) {includeButton.hidden = !currentId || selected.has(currentId);includeButton.disabled = busy;}
    if (summary) summary.textContent = t('selection')+' · '+t('count',{count:selected.size});
    for (const check of list?.querySelectorAll('input[type="checkbox"]') || []) check.disabled = busy;
    for (const row of list?.children || []) row.dataset.current = String(row.dataset.productId === currentId);
  }
  function showPane(name, scroll = false) {
    if (!paneButtons[name]) return;
    pane = name; workspace.dataset.pane = name;
    for (const [key,control] of Object.entries(paneButtons)) {control.setAttribute('aria-selected',String(key===name));control.tabIndex=key===name?0:-1;}
    requestAnimationFrame(()=>{if(pane!==name)return;scalePreview();if(name==='preview'&&opened&&needsPreviewCheck)renderPreview();});
    if (scroll) workspace.scrollIntoView({block:'start',behavior:window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches?'auto':'smooth'});
  }
  function activateProduct(id, changePane = true) {
    indexCatalog();if (!productIndex.has(String(id))) return;
    printFailure=null;currentId = String(id); renderPreview(previewState?.state==='error');
    if (changePane) showPane('preview',true);
  }
  function setProductSelected(id, included) {
    indexCatalog();if(preparing||activePrint||!productIndex.has(String(id)))return false;
    id=String(id);
    if(selected.has(id)!==included){selectionRevision++;filteredCache=null;}
    if(included){selected.add(id);if(!currentId)currentId=id;}else selected.delete(id);
    if(selectionFilter==='selected')renderSelection();renderPreview();return true;
  }
  function revealPrintFailure(error) {
    printFailure=error;
    if(error.productId&&available.includes(String(error.productId)))currentId=String(error.productId);
    needsPreviewCheck=true;showPane('preview',true);showError(error);status.dataset.state='error';status.textContent=t('cardBlocked');
  }
  function retainPrintFailure() {
    if(printFailure&&(!printFailure.productId||String(printFailure.productId)===currentId)){
      showError(printFailure);status.dataset.state='error';status.textContent=t('cardBlocked');
    }
  }
  function renderQueue() {
    if (!queue) return;
    indexCatalog();
    const signature=catalogRevision+'|'+selectionRevision+'|'+currentId+'|'+language();
    if(signature===queueSignature)return;queueSignature=signature;
    const fragment=doc.createDocumentFragment(),ids=selectedIds(),size=25;
    const start=Math.floor(Math.max(0,ids.indexOf(currentId))/size)*size,end=Math.min(ids.length,start+size);
    const windowSignature=catalogRevision+'|'+selectionRevision+'|'+start+'|'+language();
    if(windowSignature===queueWindowSignature){
      for(const control of queue.children)if(control.dataset.productId)control.setAttribute('aria-current',String(control.dataset.productId===currentId));
      return;
    }
    queueWindowSignature=windowSignature;
    const restoreFocus=queue.contains?.(doc.activeElement);
    const jump=(direction,from,to,target)=>{
      const control=make('button','wf-label-queue-step');control.type='button';control.dataset.queueStep=direction;
      const label=t(direction==='next'?'nextCards':'previousCards')+' · '+(from+1)+'–'+to;
      control.setAttribute('aria-label',label);control.title=label;
      control.append(icon(direction==='next'?'next':'back'),make('span','',(from+1)+'–'+to));
      control.addEventListener('click',()=>activateProduct(ids[target],false));fragment.append(control);
    };
    if(start>0)jump('previous',Math.max(0,start-size),start,Math.max(0,start-size));
    ids.slice(start,end).forEach((id,offset)=>{
      const product=productIndex.get(id);if(!product)return;const index=start+offset;
      const choice=make('button','wf-label-queue-item');choice.type='button';choice.dataset.productId=id;
      choice.setAttribute('aria-current',String(id===currentId));choice.title=t('previewProduct',{name:product.name||'—'});
      choice.append(make('span','wf-label-queue-number',String(index+1)),make('bdi','',String(product.name??'—')));
      choice.addEventListener('click',()=>activateProduct(id,false));fragment.append(choice);
    });
    if(end<ids.length)jump('next',end,Math.min(ids.length,end+size),end);
    queue.replaceChildren(fragment);queue.scrollLeft=0;queue.hidden=ids.length<2;queue.setAttribute('aria-label',t('selectedCards'));
    if(restoreFocus){for(const control of queue.children)if(control.dataset.productId===currentId){control.focus({preventScroll:true});break;}}
  }
  function refreshText() {
    for (const element of page.querySelectorAll('[data-wf-label-copy]')) element.textContent=t(element.dataset.wfLabelCopy);
    if (!workspace) return;
    workspace.dir = language() === 'ar' ? 'rtl' : 'ltr';
    workspace.querySelector('.wf-label-heading p').textContent = t('subtitle');
    preferenceNote.textContent = t(savedNoteKey);
    search.placeholder = t('search'); search.setAttribute('aria-label',t('search'));
    languageToggle.querySelector('span').textContent = t('language') + ' · ' + languageNames[printLocale];
    for (const choice of languageChoices.children) choice.setAttribute('aria-pressed',String(choice.dataset.locale === printLocale));
    previous.setAttribute('aria-label',t('previous')); next.setAttribute('aria-label',t('next'));
    updateControls();renderQueue();
    if (opened) renderPreview();
    enhanceActions();
  }
  function mount() {
    if (workspace) return;
    workspace = make('article','wf-label-workspace'); workspace.id = 'wfProductLabels'; workspace.hidden = true;
    workspace.tabIndex = -1; workspace.setAttribute('aria-labelledby','wfProductLabelTitle');
    const toolbar = make('header','wf-label-toolbar'), heading = make('div','wf-label-heading');
    const title = translated(make('h2','',t('title')),'title'); title.id = 'wfProductLabelTitle';
    heading.append(title,make('p','',t('subtitle')));
    printButton = button('print','wf-label-print btn btn-p','print',printSelected);
    toolbar.append(button('back','wf-label-back btn btn-s','back',()=>close(true)),heading,printButton);
    const tabs=make('div','wf-label-mobile-tabs');tabs.setAttribute('role','tablist');tabs.setAttribute('aria-label',t('title'));
    for (const [name,key] of [['catalog','catalogTab'],['preview','previewTab']]) {
      const tab=button(key,'wf-label-tab',name==='catalog'?'search':'eye',()=>showPane(name,true));
      tab.id='wfLabelTab-'+name;tab.dataset.pane=name;tab.setAttribute('role','tab');tab.setAttribute('aria-controls','wfLabelPanel-'+name);
      paneButtons[name]=tab;tabs.append(tab);
    }
    tabs.addEventListener('keydown',event=>{
      if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
      event.preventDefault();const target=event.key==='Home'?'catalog':event.key==='End'?'preview':pane==='catalog'?'preview':'catalog';
      showPane(target);paneButtons[target].focus();
    });
    const body=make('div','wf-label-body');
    catalogPanel=make('section','wf-label-catalog-panel');previewPanel=make('section','wf-label-preview-panel');
    for(const [name,panel] of [['catalog',catalogPanel],['preview',previewPanel]]){
      panel.id='wfLabelPanel-'+name;panel.setAttribute('aria-labelledby','wfLabelTab-'+name);
    }
    const languageGroup = make('div','wf-label-language');
    languageToggle = button('language','wf-label-language-toggle','globe',()=>{
      languageChoices.hidden = !languageChoices.hidden; languageToggle.setAttribute('aria-expanded',String(!languageChoices.hidden));
    });
    languageToggle.setAttribute('aria-controls','wfProductLabelLanguages'); languageToggle.setAttribute('aria-expanded','false'); languageToggle.append(icon('chevron'));
    languageChoices = make('div','wf-label-language-choices'); languageChoices.id='wfProductLabelLanguages'; languageChoices.hidden=true; languageChoices.setAttribute('role','group');
    for (const locale of core.locales) {
      const choice = make('button','',languageNames[locale]); choice.type='button'; choice.lang=locale; choice.dir=locale==='ar'?'rtl':'ltr'; choice.dataset.locale=locale;
      choice.addEventListener('click',()=>chooseLanguage(locale)); languageChoices.append(choice);
    }
    preferenceNote = make('small','wf-label-preference-note'); preferenceNote.setAttribute('role','status');
    languageGroup.append(languageToggle,languageChoices,preferenceNote);
    selection = make('details','wf-label-selection'); summary=make('summary'); selection.append(summary);
    const selectionActions=make('div','wf-label-selection-actions');
    selectAllButton=button('all','btn btn-s','check',()=>{
      if(preparing||activePrint)return;
      for(const product of options())selected.add(String(product.id));
      selectionRevision++;filteredCache=null;
      currentId=currentId||selectedIds()[0]||null;renderSelection();renderPreview();
    });
    clearButton=button('clear','btn btn-s',null,()=>{
      if(preparing||activePrint)return;selected.clear();selectionRevision++;filteredCache=null;currentId=null;renderSelection();renderPreview();
    });
    selectionActions.append(selectAllButton,clearButton);
    search=make('input','fc');search.type='search';search.autocomplete='off';search.id='wfProductLabelSearch';
    search.addEventListener('input',()=>{visibleCount=40;renderSelection();});
    const filters=make('div','wf-label-filters');filters.setAttribute('role','group');
    for(const [name,key] of [['all','allProducts'],['selected','onlySelected'],['review','needsReview']]){
      const filter=button(key,'wf-label-filter',null,()=>{selectionFilter=name;visibleCount=40;renderSelection();});
      filterButtons[name]=filter;filters.append(filter);
    }
    resultsCount=make('p','wf-label-results-count');resultsCount.setAttribute('role','status');resultsCount.setAttribute('aria-live','polite');
    list=make('div','wf-label-product-list');
    moreButton=button('showMore','btn btn-s',null,()=>{visibleCount+=40;renderSelection();});
    selection.append(search,filters,selectionActions,resultsCount,list,moreButton);selection.open=true;
    catalogPanel.append(selection);
    const nav=make('div','wf-label-preview-nav');
    previous=button('previous','wf-label-prev','back',()=>move(-1));next=button('next','wf-label-next','next',()=>move(1));
    currentName=make('strong','wf-label-current');currentName.dir='auto';counter=make('span','wf-label-page-count');
    nav.append(previous,currentName,counter,next);
    queue=make('div','wf-label-queue');queue.setAttribute('role','group');
    const viewControls=make('div','wf-label-view-controls');viewControls.setAttribute('role','group');
    for(const [name,key] of [['face','faceView'],['sheet','sheetView']]){
      const control=button(key,'wf-label-view',name==='face'?'card':null,()=>{
        viewMode=name;for(const [value,view]of Object.entries(viewButtons))view.setAttribute('aria-pressed',String(value===name));scalePreview();
      });control.setAttribute('aria-pressed',String(name===viewMode));viewButtons[name]=control;viewControls.append(control);
    }
    status=make('p','wf-label-status');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
    errorBox=make('p','wf-label-error');errorBox.hidden=true;errorBox.setAttribute('role','alert');
    printRecovery=button('printRecovery','wf-label-print-recovery btn btn-s','check',()=>activePrint?.cleanup(true));
    printRecovery.hidden=true;printRecovery.title=t('printRecoveryHint');
    preview=make('div','wf-label-preview');stage=make('div','wf-label-preview-stage');preview.append(stage);
    emptyPreview=make('div','wf-label-empty');emptyPreview.append(icon('card'),translated(make('p','',t('none')),'none'),button('chooseProducts','btn btn-s','search',()=>showPane('catalog',true)));preview.append(emptyPreview);
    let swipe=null;
    preview.addEventListener('touchstart',event=>{if(event.touches.length===1)swipe={x:event.touches[0].clientX,y:event.touches[0].clientY};},{passive:true});
    preview.addEventListener('touchend',event=>{
      if(!swipe||!event.changedTouches.length)return;const point=event.changedTouches[0],dx=point.clientX-swipe.x,dy=point.clientY-swipe.y;swipe=null;
      if(Math.abs(dx)>65&&Math.abs(dx)>Math.abs(dy)*1.6)move((dx<0?1:-1)*(language()==='ar'?-1:1));
    },{passive:true});
    preview.addEventListener('touchcancel',()=>{swipe=null;},{passive:true});
    const source=translated(make('p','wf-label-source-note',t('sourceDetails')),'sourceDetails');
    editButton=button('edit','btn btn-s','edit',()=>{
      if(preparing||activePrint)return;
      const product=products().find(item=>String(item.id)===currentId);if(!product)return;
      close(false); if(typeof window.editPr==='function')window.editPr(product.id);
    });
    includeButton=button('includeCard','btn btn-s','plus',()=>{
      if(!currentId||preparing||activePrint)return;setProductSelected(currentId,true);renderSelection();
    });
    const foot=make('div','wf-label-source');foot.append(source,includeButton,editButton);
    const construction=translated(make('p','wf-label-source-note',t('printConstruction')),'printConstruction');
    const guide=make('details','wf-label-guide');guide.append(translated(make('summary','',t('guide')),'guide'),translated(make('p','',t('sheet')),'sheet'),translated(make('p','',t('ready')),'ready'));
    previewPanel.append(nav,queue,viewControls,construction,status,errorBox,printRecovery,preview,foot,guide);
    body.append(catalogPanel,previewPanel);workspace.append(toolbar,languageGroup,tabs,body);page.append(workspace);showPane(pane);
    if(typeof ResizeObserver==='function')new ResizeObserver(entries=>{
      const width=entries[0]?.contentRect.width||0,becameVisible=width>0&&lastPreviewWidth===0,changed=width!==lastPreviewWidth;lastPreviewWidth=width;
      if(changed)scalePreview();if(becameVisible&&opened&&needsPreviewCheck)renderPreview();
    }).observe(preview);
    else window.addEventListener('resize',scalePreview,{passive:true});
    refreshText();
  }
  function chooseLanguage(locale) {
    if(preparing||activePrint)return;
    printFailure=null;
    localeInitialized=true;pendingSaves++;
    printLocale=core.normalizeLocale(locale);savedNoteKey='saving';languageChoices.hidden=true;languageToggle.setAttribute('aria-expanded','false');
    refreshText();const revision=++saveRevision;
    saveQueue=saveQueue.catch(()=>{}).then(()=>persistLocale(state(),printLocaleFor(locale),wfWriteBatch)).then(()=>{
      if(revision===saveRevision){savedNoteKey='saved';preferenceNote.textContent=t(savedNoteKey);}
    },()=>{
      if(revision===saveRevision){savedNoteKey='saveError';preferenceNote.textContent=t(savedNoteKey);}
    }).finally(()=>{pendingSaves--;updateControls();});
  }
  const printLocaleFor = locale => core.normalizeLocale(locale);
  function renderSelection() {
    const source=options(),shown=source.slice(0,visibleCount),fragment=doc.createDocumentFragment();
    for(const product of shown) {
      const id=String(product.id),row=make('div','wf-label-choice'),select=make('label','wf-label-choice-select'),check=make('input');
      row.dataset.productId=id;row.dataset.current=String(id===currentId);check.type='checkbox';check.checked=selected.has(id);check.value=id;
      check.addEventListener('change',()=>{
        if(!setProductSelected(id,check.checked))check.checked=selected.has(id);
      });
      select.append(check);const src=safeImageSource(product.image,doc.baseURI);
      if(src){const image=make('img');image.src=src;image.alt='';image.loading='lazy';image.addEventListener('error',()=>image.replaceWith(icon('image')),{once:true});select.append(image);}
      else select.append(icon('image'));
      const info=make('span','wf-label-choice-info'),name=make('strong','',String(product.name??'—'));name.dir='auto';
      const code=make('small','',String(product.barcode??product.code??product.type??''));code.dir='auto';info.append(name,code);
      const issues=core.reviewProduct(product);
      if(issues.length)info.append(make('span','wf-label-product-note',issues.map(key=>t(key)).join(' · ')));
      select.append(info);row.append(select);
      const show=button('previewTab','wf-label-choice-preview','eye',()=>activateProduct(id));
      show.title=t('previewProduct',{name:product.name||'—'});show.setAttribute('aria-label',show.title);row.append(show);fragment.append(row);
    }
    if(!source.length)fragment.append(make('p','wf-label-empty',t(products().length?'noResults':'empty')));
    list.replaceChildren(fragment);moreButton.hidden=shown.length>=source.length;
    resultsCount.textContent=t('results',{shown:shown.length,count:source.length});
    for(const [name,control]of Object.entries(filterButtons))control.setAttribute('aria-pressed',String(name===selectionFilter));
    updateControls(source);renderQueue();
  }
  function modelFor(product, settings = state().settings || {}) {
    let logo=settings.logo||'';
    if(typeof window.wfCompanyLogo==='function')logo=window.wfCompanyLogo(logo);
    const model=core.createLabelModel(product,{locale:printLocale,logo,company:settings.companyName,website:settings.website});
    const image=safeImageSource(product.image,doc.baseURI),logoSource=safeImageSource(model.logo,doc.baseURI);
    return {...model,image,logo:logoSource,assetError:!!product.image&&!image || !!model.logo&&!logoSource};
  }
  function svgElement(tag, attributes, owner) {
    const element=owner.createElementNS(svgNS,tag);
    for(const [key,value] of Object.entries(attributes))element.setAttribute(key,String(value));
    return element;
  }
  function addCode(container, model, owner) {
    const plan=barcodePlan(model.barcode,window.JsBarcode);
    container.dataset.code=plan.kind;
    if(plan.kind==='code128') {
      const svg=svgElement('svg',{viewBox:'0 0 '+(plan.modules+plan.quiet*2)+' 46',role:'img','aria-label':model.barcode,'shape-rendering':'crispEdges'},owner);
      svg.style.width=plan.widthMm+'mm';svg.style.height='12mm';
      svg.append(svgElement('rect',{width:plan.modules+plan.quiet*2,height:46,fill:'#fff'},owner));
      for(let start=0;start<plan.data.length;){
        if(plan.data[start]==='0'){start++;continue;}let end=start+1;while(plan.data[end]==='1')end++;
        svg.append(svgElement('rect',{x:start+plan.quiet,y:2,width:end-start,height:42,fill:'#111'},owner));start=end;
      }
      container.append(svg);
    } else if(plan.kind==='qr') {
      try {
        const holder=make('div','wf-label-qr',undefined,owner);
        // This helper produces only geometry from encoded bytes, never user HTML.
        holder.innerHTML=window.generateQRCodeSVG(plan.value);
        const svg=holder.querySelector('svg'),size=Number(svg?.getAttribute('viewBox')?.split(/\s+/).at(-1));
        if(!size || size*.3>24)throw new Error('BARCODE_FIT');
        holder.style.width=holder.style.height=Math.max(18,size*.3)+'mm';
        svg.style.width=svg.style.height='100%';svg.setAttribute('aria-label',plan.value);svg.setAttribute('role','img');
        container.append(holder);
      } catch (_) {container.dataset.printError='BARCODE|'+model.name;}
    } else container.dataset.printError='BARCODE|'+model.name;
    const value=make('bdi','wf-label-barcode-value',model.barcode||'—',owner);value.dir='auto';container.append(value);
  }
  function buildFace(model, owner) {
    const face=make('section','wf-label-face',undefined,owner);face.lang=model.locale;face.dataset.rows=String(Math.max(3,model.rows.length));face.dataset.product=model.name;
    const header=make('header','wf-label-card-header',undefined,owner);
    if(model.logo){const logo=make('img','wf-label-logo',undefined,owner);logo.src=model.logo;logo.alt=model.company||'';header.append(logo);}
    const names=make('div','',undefined,owner);names.dir=model.dir;
    names.append(make('span','wf-label-product-caption',core.text(model.locale,'productName'),owner));
    const name=make('strong','wf-label-product-name',model.name||'—',owner);name.dir='auto';names.append(name);header.append(names);
    const photo=make('div','wf-label-photo',undefined,owner);
    if(model.image){const image=make('img','',undefined,owner);image.src=model.image;image.alt=model.name;image.decoding='async';photo.append(image);}
    else photo.append(make('span','wf-label-no-photo',core.text(model.locale,'noImage'),owner));
    const table=make('table','wf-label-sizes',undefined,owner),thead=make('thead','',undefined,owner),tr=make('tr','',undefined,owner);
    for(const [key,letter] of [['height','H'],['width','W'],['length','L']]){
      const th=make('th','',core.text(model.locale,key)+' · '+letter+' ('+core.text(model.locale,'cm')+')',owner);th.scope='col';th.dir=model.dir;tr.append(th);
    }
    thead.append(tr);table.append(thead);const tbody=make('tbody','',undefined,owner);
    const format=new Intl.NumberFormat(model.locale,{numberingSystem:'latn',maximumFractionDigits:3});
    const rows=model.rows.slice();while(rows.length<3)rows.push({h:0,w:0,l:0});
    for(const row of rows){const line=make('tr','',undefined,owner);for(const key of ['h','w','l']){const td=make('td','',row[key]>0?format.format(row[key]):'—',owner);td.dir='ltr';line.append(td);}tbody.append(line);}
    table.append(tbody);
    const facts=make('div','wf-label-facts',undefined,owner);
    for(const [key,value] of [['volume',model.cbm===null?'—':new Intl.NumberFormat(model.locale,{numberingSystem:'latn',maximumFractionDigits:4}).format(model.cbm)],['description',model.description||'—']]){
      const fact=make('div','',undefined,owner);fact.dir=model.dir;
      fact.append(make('span','',core.text(model.locale,key),owner));const data=make('bdi','',value,owner);data.dir='auto';fact.append(data);facts.append(fact);
    }
    const barcode=make('div','wf-label-barcode',undefined,owner);addCode(barcode,model,owner);face.dataset.code=barcode.dataset.code;
    const website=make('footer','wf-label-website',model.website||model.company||'',owner);website.dir='auto';
    face.append(header,photo,make('div','wf-label-divider',undefined,owner),table,facts,barcode,website);
    if(model.assetError)face.dataset.printError='IMAGE_FORMAT|'+model.name;
    return face;
  }
  function buildPaper(model, owner = doc) {
    const paper=make('div','wf-label-paper',undefined,owner);paper.lang=model.locale;paper.dataset.productId=model.id;paper.setAttribute('aria-label',model.name);
    const guide=make('p','wf-label-sheet-guide',core.text(model.locale,'cut')+' · '+core.text(model.locale,'foldHint'),owner);guide.dir=model.dir;
    const pair=make('div','wf-label-pair',undefined,owner);pair.setAttribute('aria-label',core.text(model.locale,'front')+' / '+core.text(model.locale,'back'));
    pair.append(buildFace(model,owner),buildFace(model,owner));paper.append(guide,pair);return paper;
  }
  function scalePreview() {
    const paper=stage?.querySelector('.wf-label-paper');if(!paper || !opened)return;
    const face=viewMode==='face',mm=96/25.4;
    const width=(face?core.geometry.faceWidth:core.geometry.paperWidth)*mm,height=(face?core.geometry.faceHeight:core.geometry.paperHeight)*mm;
    const style=getComputedStyle(preview),padding=parseFloat(style.paddingLeft)+parseFloat(style.paddingRight)+2;
    const scale=Math.min(face?1.2:1,Math.max(.1,(preview.clientWidth-padding)/width));
    const x=face?(core.geometry.paperWidth-core.geometry.pairWidth)*mm/2:0,y=face?(core.geometry.paperHeight-core.geometry.pairHeight)*mm/2:0;
    const scaledWidth=width*scale+'px',scaledHeight=height*scale+'px';
    const transform='translate('+(-x*scale)+'px,'+(-y*scale)+'px) scale('+scale+')';
    if(stage.dataset.view!==viewMode)stage.dataset.view=viewMode;
    if(stage.style.width!==scaledWidth)stage.style.width=scaledWidth;
    if(stage.style.height!==scaledHeight)stage.style.height=scaledHeight;
    if(paper.style.transform!==transform)paper.style.transform=transform;
  }
  function fitPaper(paper) {
    const view=paper.ownerDocument.defaultView;
    for(const face of paper.querySelectorAll('.wf-label-face')){
      if(face.clientWidth<=0||face.clientHeight<=0)continue;
      const name=face.querySelector('.wf-label-product-name');
      const description=face.querySelector('.wf-label-facts > div:last-child bdi');
      const website=face.querySelector('.wf-label-website');
      const photo=face.querySelector('.wf-label-photo');photo.style.height='';photo.style.flexBasis='';
      for(const [element,minimum,maxHeight] of [[name,12,14],[description,10,14],[website,8,7]]){
        element.style.fontSize='';
        let size=parseFloat(view.getComputedStyle(element).fontSize);
        const tooLarge=()=>element.scrollWidth>element.clientWidth+1 || element.scrollHeight>maxHeight*96/25.4;
        while(size>minimum && tooLarge()){size=Math.max(minimum,size-.5);element.style.fontSize=size+'px';}
      }
      const overflow=face.scrollHeight-face.clientHeight;
      if(overflow>1){
        const height=parseFloat(view.getComputedStyle(photo).height);
        const nextHeight=Math.max(24*96/25.4,height-overflow-4);
        photo.style.height=photo.style.flexBasis=nextHeight+'px';
      }
    }
  }
  function checkPaper(paper) {
    for(const face of paper.querySelectorAll('.wf-label-face')){
      const explicit=face.dataset.printError || face.querySelector('[data-print-error]')?.dataset.printError;
      if(explicit)throw new Error(explicit);
      const bounds=face.getBoundingClientRect();
      if(face.clientWidth<=0||face.clientHeight<=0||bounds.width<=0||bounds.height<=0)throw new Error('LAYOUT_HIDDEN');
      const scaleX=bounds.width/face.clientWidth,scaleY=bounds.height/face.clientHeight;
      if(face.scrollWidth>face.clientWidth+1||face.scrollHeight>face.clientHeight+1)throw new Error('OVERFLOW|'+face.dataset.product);
      for(const element of face.querySelectorAll('header,.wf-label-photo,table,.wf-label-facts,.wf-label-barcode,footer,.wf-label-product-name,.wf-label-facts bdi,.wf-label-barcode-value')){
        const rect=element.getBoundingClientRect();
        if((bounds.left-rect.left)/scaleX>1 || (rect.right-bounds.right)/scaleX>1 ||
          (bounds.top-rect.top)/scaleY>1 || (rect.bottom-bounds.bottom)/scaleY>1 ||
          element.scrollWidth>element.clientWidth+2 || element.scrollHeight>element.clientHeight+2)throw new Error('OVERFLOW|'+face.dataset.product);
      }
    }
  }
  async function preparePapers(papers, owner, isCurrent = () => true) {
    if(!isCurrent())return false;
    if(owner.fonts)await withTimeout(owner.fonts.ready,12000,'FONT_TIMEOUT');
    if(!isCurrent())return false;
    const images=papers.flatMap(paper=>[...paper.querySelectorAll('img')].map(image=>({image,productId:paper.dataset.productId})));
    for(let index=0;index<images.length;index+=6){
      if(!isCurrent())return false;
      await Promise.all(images.slice(index,index+6).map(async({image,productId})=>{
        try{await waitForImage(image);}catch(error){error.productId=productId;throw error;}
      }));
    }
    if(!isCurrent())return false;
    await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
    if(!isCurrent())return false;
    for(let index=0;index<papers.length;index++){
      if(index&&index%4===0){await new Promise(resolve=>requestAnimationFrame(resolve));if(!isCurrent())return false;}
      const paper=papers[index];
      try{fitPaper(paper);checkPaper(paper);}catch(error){error.productId=paper.dataset.productId;throw error;}
    }
    return true;
  }
  async function renderPreview(retry = false) {
    if(!workspace || !opened)return;
    indexCatalog();
    const ids=selectedIds();if(!productIndex.has(currentId))currentId=ids[0]||null;
    const index=ids.indexOf(currentId);
    previous.disabled=index<=0;next.disabled=index<0 || index>=ids.length-1;
    counter.textContent=currentId?(index>=0?t('page',{page:index+1,count:ids.length}):t('previewOnly')):'';
    stage.hidden=!currentId;emptyPreview.hidden=!!currentId;
    renderQueue();updateControls();
    if(!currentId){previewRevision++;previewState=null;needsPreviewCheck=false;stage.replaceChildren();stage.style.height='auto';currentName.textContent='';status.hidden=true;errorBox.hidden=true;return;}
    const productId=currentId,sourceRevision=catalogRevision,locale=printLocale;
    const key=sourceRevision+'|'+productId+'|'+locale;
    const existing=!retry&&previewState?.key===key?stage.querySelector('.wf-label-paper'):null;
    if(existing&&previewState.state!=='hidden'){syncPreviewStatus();return;}
    errorBox.hidden=true;status.hidden=false;const revision=++previewRevision;
    const isCurrent=()=>revision===previewRevision&&opened&&currentId===productId&&catalogRevision===sourceRevision&&printLocale===locale;
    previewState={id:productId,key,state:'checking'};needsPreviewCheck=true;
    status.dataset.state='checking';status.textContent=t('checking');
    try{
      const [product]=captureSelection([productIndex.get(productId)],[productId]),model=modelFor(product),paper=existing||buildPaper(model);
      currentName.textContent=model.name;if(!existing)stage.replaceChildren(paper);
      scalePreview();await preparePapers([paper],doc,isCurrent);
      if(!isCurrent())return;
      previewState={id:productId,key,state:'ready',review:core.reviewProduct(product),qr:!!paper.querySelector('[data-code="qr"]')};needsPreviewCheck=false;
      syncPreviewStatus();scalePreview();updateControls();
    }catch(error){
      if(!isCurrent())return;
      if(error.message==='LAYOUT_HIDDEN'){previewState.state='hidden';needsPreviewCheck=true;retainPrintFailure();return;}
      needsPreviewCheck=false;
      previewState={id:productId,key,state:'error',error};syncPreviewStatus();updateControls();
    }
  }
  function syncPreviewStatus() {
    if(!previewState)return;
    status.hidden=false;errorBox.hidden=previewState.state!=='error';
    if(previewState.state==='error'){
      status.dataset.state='error';status.textContent=t('cardBlocked');showError(previewState.error);
    }else if(previewState.state==='ready'){
      const review=previewState.review||[];
      status.dataset.state=review.length?'review':'ready';status.textContent=t(review.length?'cardReview':'cardReady');
      if(review.length)status.textContent+=' · '+review.map(key=>t(key)).join(' · ');
      if(previewState.qr)status.textContent+=' '+t('qr');
    }else{status.dataset.state='checking';status.textContent=t('checking');}
    retainPrintFailure();
  }
  function move(step) {
    const ids=selectedIds(),index=ids.indexOf(currentId),target=ids[index+step];if(target){currentId=target;renderPreview();}
  }
  function open(productId, source) {
    if(typeof window.getCurrentPage==='function' && window.getCurrentPage()!=='products')window.showPage('products');
    mount();opener=source||doc.activeElement;
    printFailure=null;
    indexCatalog(true);
    const filter=state().prTabFilter||'all',query=(byId('prSearch')?.value||'').trim().toLowerCase();
    const sourceProducts=productId!==undefined?products().filter(product=>String(product.id)===String(productId)):
      products().filter(product=>(filter==='all'||product.type===filter)&&core.matchesProduct(product,query));
    if(productId!==undefined || !hasSelectionSession){selected=new Set(sourceProducts.map(product=>String(product.id)));currentId=selectedIds()[0]||null;search.value='';selectionFilter='all';visibleCount=40;}
    else {selected=new Set(selectedIds().filter(id=>productIndex.has(id)));if(!productIndex.has(currentId))currentId=selectedIds()[0]||null;}
    selectionRevision++;filteredCache=null;
    hasSelectionSession=true;
    if(!localeInitialized){printLocale=core.resolveLocale(state().settings?.productLabels?.locale,language());savedNoteKey='preference';localeInitialized=true;}
    selection.open=true;opened=true;workspace.hidden=false;page.classList.add('wf-label-mode');
    showPane(currentId?'preview':'catalog');
    renderSelection();refreshText();registerGuard();workspace.focus({preventScroll:true});workspace.scrollIntoView({block:'start',behavior:'auto'});
  }
  function close(restoreFocus) {
    if(!opened)return;opened=false;previewRevision++;previewState=null;workspace.hidden=true;page.classList.remove('wf-label-mode');stage.replaceChildren();
    if(restoreFocus && opener?.isConnected)opener.focus({preventScroll:true});
  }
  async function printSelected() {
    if(window.WFAccountAccess&&!window.WFAccountAccess.allow('products.print'))return;
    if(preparing || activePrint || !selected.size)return;
    printFailure=null;errorBox.hidden=true;preparing=true;workspace.setAttribute('aria-busy','true');updateControls();
    status.hidden=false;status.textContent=t('preparing');registerGuard();
    let frame,cleanup;
    try{
      const selectedProducts=captureSelection(products(),selectedIds()),settings={...state().settings};
      const models=selectedProducts.map(product=>modelFor(product,settings));
      frame=make('iframe');frame.title=t('title');frame.setAttribute('aria-hidden','true');frame.tabIndex=-1;
      frame.style.cssText='position:fixed;left:-200vw;top:0;width:1123px;height:794px;border:0;pointer-events:none;';
      doc.body.append(frame);const printDoc=frame.contentDocument,printWindow=frame.contentWindow;
      if(!printDoc || typeof printWindow?.print!=='function')throw new Error('PRINT_UNAVAILABLE');
      let timer,cleaned=false;
      const media=printWindow.matchMedia?.('print');
      let enteredPrint=!!media?.matches;
      const onMedia=event=>{if(event.matches)enteredPrint=true;else if(enteredPrint)cleanup(true);};
      cleanup=(completed=false)=>{
        if(cleaned)return;cleaned=true;
        clearTimeout(timer);printWindow.removeEventListener('afterprint',cleanup);window.removeEventListener('afterprint',cleanup);
        media?.removeEventListener?.('change',onMedia);
        frame.remove();if(activePrint?.frame===frame)activePrint=null;
        if(printRecovery)printRecovery.hidden=true;
        if(completed&&opened){status.textContent=t('printReturned');status.dataset.state='ready';}
        updateControls();
      };
      activePrint={frame,cleanup};
      printDoc.open();printDoc.write('<!doctype html><html><head><meta charset="utf-8"></head><body></body></html>');printDoc.close();
      printDoc.documentElement.lang=printLocale;printDoc.documentElement.dir='ltr';printDoc.title=t('title');
      printDoc.body.className='wf-label-print-document';
      const link=printDoc.createElement('link');link.rel='stylesheet';
      const loaded=new Promise((resolve,reject)=>{link.onload=resolve;link.onerror=()=>reject(new Error('STYLE_LOAD'));});
      // Construction yields between batches, so observe an early stylesheet
      // rejection immediately and report it through the preparation error path.
      loaded.catch(()=>{});
      link.href=stylesheet;printDoc.head.append(link);
      for(let index=0;index<models.length;index++){
        if(index&&index%8===0)await new Promise(resolve=>requestAnimationFrame(resolve));
        printDoc.body.append(buildPaper(models[index],printDoc));
      }
      await withTimeout(loaded,12000,'STYLE_TIMEOUT');
      await preparePapers([...printDoc.querySelectorAll('.wf-label-paper')],printDoc);
      printWindow.addEventListener('afterprint',cleanup,{once:true});window.addEventListener('afterprint',cleanup,{once:true});
      media?.addEventListener?.('change',onMedia);
      // A background transition cannot prove a native print sheet has closed.
      // Browsers without completion events get an explicit user recovery action.
      timer=setTimeout(()=>{if(activePrint?.frame===frame&&printRecovery){printRecovery.hidden=false;showPane('preview',true);}},8000);
      printWindow.focus();printWindow.print();status.textContent=t(activePrint?'opened':'printReturned');
    }catch(error){if(cleanup)cleanup();else frame?.remove();revealPrintFailure(error);}
    finally{preparing=false;workspace.removeAttribute('aria-busy');updateControls();}
  }
  function enhanceActions() {
    const toolbar=page.querySelector('.co-toolbar-row');
    if(toolbar && !byId('wfProductLabelsOpen')){
      const trigger=button('title','wf-label-open btn btn-s','card',event=>open(undefined,event.currentTarget));trigger.id='wfProductLabelsOpen';
      (toolbar.querySelector('.wf-heading-actions')||toolbar).append(trigger);
    }
    for(const card of page.querySelectorAll('#prGrid .pr-card-new')){
      const image=card.querySelector('[id^="prCardImg-"]'),actions=card.querySelector('.pr-card-new-actions');
      if(!image||!actions||actions.querySelector('.wf-label-card-action'))continue;
      const id=image.id.slice('prCardImg-'.length);
      const action=button('card','wf-label-card-action','card',event=>{event.stopPropagation();open(id,event.currentTarget);});
      actions.append(action);
    }
  }
  const render=window.renderPr;
  if(typeof render==='function')window.renderPr=function(...args){const result=render.apply(this,args);enhanceActions();return result;};
  const back=window.goBack;
  if(typeof back==='function')window.goBack=function(...args){if(opened && page.classList.contains('active')){close(true);return;}return back.apply(this,args);};
  const navigate=window.showPage;
  if(typeof navigate==='function')window.showPage=function(...args){if(opened)close(false);return navigate.apply(this,args);};
  new MutationObserver(()=>{refreshText();if(opened)renderSelection();}).observe(root,{attributes:true,attributeFilter:['lang']});
  window.addEventListener('load',registerGuard,{once:true});
  window.WFProductLabels={open,close:()=>close(true),print:printSelected};
  enhanceActions();
})();

