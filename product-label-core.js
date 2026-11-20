/* Pure product-label data and print captions. All returned text is untrusted
   data for DOM textContent; this module neither renders HTML nor edits products. */
(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.WFProductLabelCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const locales = Object.freeze(['ar', 'tr', 'en', 'fr', 'ru']);
  const geometry = Object.freeze({
    paperWidth:297, paperHeight:210, margin:6,
    pairWidth:200, pairHeight:150, faceWidth:100, faceHeight:150
  });
  const string = value => value == null ? '' : String(value);
  const localeValue = value => typeof value === 'string' ? value.trim().toLowerCase() : '';

  function normalizeLocale(value, fallback = 'ar') {
    const candidate = localeValue(value);
    if (locales.includes(candidate)) return candidate;
    const defaultLocale = localeValue(fallback);
    return locales.includes(defaultLocale) ? defaultLocale : 'ar';
  }

  function resolveLocale(saved, appLocale) {
    return normalizeLocale(saved, normalizeLocale(appLocale));
  }

  function normalizeSearch(value) {
    const input = typeof value === 'string' || typeof value === 'bigint' ||
      (typeof value === 'number' && Number.isFinite(value)) ? String(value) : '';
    return input.normalize('NFKD').replace(/\p{M}/gu, '')
      .replace(/[أإآٱ]/g, 'ا')
      .replace(/[٠-٩]/g, digit => String(digit.charCodeAt(0) - 0x660))
      .replace(/[۰-۹]/g, digit => String(digit.charCodeAt(0) - 0x6f0))
      .replace(/ı/g, 'i').toLowerCase().trim();
  }

  function matchesProduct(product, query) {
    const source = product && typeof product === 'object' && !Array.isArray(product) ? product : {};
    const tokens = normalizeSearch(query).split(/\s+/).filter(Boolean);
    const content = [source.name, source.barcode, source.code, source.type].map(normalizeSearch).join(' ');
    return tokens.every(token => content.includes(token));
  }

  function dimension(value) {
    const number = Number(value);
    return Number.isFinite(number) && number >= 0 ? number : 0;
  }

  function getDimensions(product) {
    const source = product && typeof product === 'object' ? product : {};
    // Physical sizes use the same source precedence as wfGetProductDims.
    // Shipping dimPieces are deliberately never a fallback.
    const rows = Array.isArray(source.dims) && source.dims.length ? source.dims :
      [{l:source.dimL, w:source.dimW, h:source.dimH}];
    return Array.from(rows, row => ({l:dimension(row?.l), w:dimension(row?.w), h:dimension(row?.h)}));
  }

  function reviewProduct(product) {
    const source = product && typeof product === 'object' && !Array.isArray(product) ? product : {};
    const issues = [];
    if (!normalizeSearch(source.name)) issues.push('missingName');
    if (typeof source.image !== 'string' || !source.image.trim()) issues.push('missingImage');
    if (!getDimensions(source).some(row => row.l > 0 || row.w > 0 || row.h > 0)) issues.push('missingDimensions');
    return issues;
  }

  const descriptionLabels = {
    SET:{ar:'طقم', tr:'Takım', en:'Set', fr:'Ensemble', ru:'Комплект'},
    PCS:{ar:'قطعة', tr:'Parça', en:'PCS', fr:'Pièces', ru:'Шт.'}
  };

  function description(value, locale) {
    const original = string(value), match = original.trim();
    for (const [code, labels] of Object.entries(descriptionLabels)) {
      if (match === code || Object.values(labels).includes(match)) return labels[locale];
    }
    return original;
  }

  function volume(product) {
    const absent = value => value == null || (typeof value === 'string' && !value.trim());
    const raw = absent(product.cbm) ? product.totalCBM : product.cbm;
    if (absent(raw) || !['number', 'string'].includes(typeof raw)) return null;
    const number = Number(raw);
    return Number.isFinite(number) && number >= 0 ? number : null;
  }

  function createLabelModel(product, options = {}) {
    const source = product && typeof product === 'object' ? product : {};
    const config = options && typeof options === 'object' ? options : {};
    const locale = normalizeLocale(config.locale);
    const rows = getDimensions(source), issues = [];
    const barcode = string(source.barcode == null || source.barcode === '' ? source.name : source.barcode);
    const present = barcode.trim().length > 0;
    const printable = /^[\x20-\x7e]+$/.test(barcode);
    if (!rows.some(row => row.l > 0 || row.w > 0 || row.h > 0)) issues.push('missingDimensions');
    if (!present) issues.push('missingBarcode');
    else {
      if (!printable) issues.push('unsupportedBarcode');
      if (barcode.length > 40) issues.push('longBarcode');
    }
    return {
      id:string(source.id), name:string(source.name), rows, cbm:volume(source),
      description:config.description !== undefined ? string(config.description) : description(source.desc, locale),
      barcode, barcodeValid:present && printable && barcode.length <= 40,
      logo:string(config.logo), company:string(config.company), website:string(config.website),
      locale, dir:locale === 'ar' ? 'rtl' : 'ltr', issues
    };
  }

  const captions = {
    ar:{
      productName:'اسم المنتج', height:'الارتفاع', width:'العرض', length:'الطول', cm:'سم',
      volume:'الحجم (m³)', description:'الوصف', front:'الوجه الأمامي', back:'الوجه الخلفي',
      fold:'خط الطي', cut:'خط القص',
      foldHint:'قص الإطار الخارجي، ثم اطوِ على خط المنتصف لتكوين بطاقة واحدة بمقاس {width} × {height} مم.',
      missingBarcode:'الباركود غير متاح', missingDimensions:'لا توجد أبعاد محفوظة', noImage:'لا توجد صورة'
    },
    tr:{
      productName:'Ürün adı', height:'Yükseklik', width:'Genişlik', length:'Uzunluk', cm:'cm',
      volume:'Hacim (m³)', description:'Açıklama', front:'Ön yüz', back:'Arka yüz',
      fold:'Katlama çizgisi', cut:'Kesim çizgisi',
      foldHint:'Dış çerçeveyi kesin, ardından ortadaki çizgiden katlayarak {width} × {height} mm boyutunda tek kart oluşturun.',
      missingBarcode:'Barkod kullanılamıyor', missingDimensions:'Kayıtlı ölçü yok', noImage:'Görsel yok'
    },
    en:{
      productName:'Product name', height:'Height', width:'Width', length:'Length', cm:'cm',
      volume:'Volume (m³)', description:'Description', front:'Front', back:'Back',
      fold:'Fold line', cut:'Cut line',
      foldHint:'Cut around the outside border, then fold along the center line to make one {width} × {height} mm card.',
      missingBarcode:'Barcode unavailable', missingDimensions:'No saved dimensions', noImage:'No image'
    },
    fr:{
      productName:'Nom du produit', height:'Hauteur', width:'Largeur', length:'Longueur', cm:'cm',
      volume:'Volume (m³)', description:'Description', front:'Recto', back:'Verso',
      fold:'Ligne de pli', cut:'Ligne de coupe',
      foldHint:'Découpez le contour extérieur, puis pliez sur la ligne centrale pour former une carte de {width} × {height} mm.',
      missingBarcode:'Code-barres indisponible', missingDimensions:'Aucune dimension enregistrée', noImage:'Aucune image'
    },
    ru:{
      productName:'Наименование товара', height:'Высота', width:'Ширина', length:'Длина', cm:'см',
      volume:'Объём (m³)', description:'Описание', front:'Лицевая сторона', back:'Обратная сторона',
      fold:'Линия сгиба', cut:'Линия разреза',
      foldHint:'Вырежьте по внешнему контуру, затем согните по центральной линии, чтобы получить одну карточку размером {width} × {height} мм.',
      missingBarcode:'Штрихкод недоступен', missingDimensions:'Размеры не сохранены', noImage:'Нет изображения'
    }
  };

  function text(locale, key, params = {}) {
    const labels = captions[normalizeLocale(locale)];
    const value = Object.prototype.hasOwnProperty.call(labels, key) ? labels[key] : string(key);
    const values = {width:geometry.faceWidth, height:geometry.faceHeight, ...params};
    return value.replace(/\{([a-zA-Z]+)\}/g, (token, name) =>
      Object.prototype.hasOwnProperty.call(values, name) ? string(values[name]) : token);
  }

  return Object.freeze({locales, normalizeLocale, resolveLocale, normalizeSearch, matchesProduct,
    reviewProduct, geometry, getDimensions, createLabelModel, text});
});
