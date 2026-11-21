/* Physical Home Center package labels, extracted from the supplied label template.
 * Keep the label CSS and inline positions independent of application styling.
 * This pure module does not read storage, fetch images, edit invoices or print.
 */
(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.WFPackageLabelCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const geometry = Object.freeze({
    pageWidthMM:210, pageHeightMM:297,
    marginTopMM:11.5, marginBottomMM:3, marginLeftMM:1, marginRightMM:4.4,
    columns:2, rows:4, cardWidthMM:97, cardHeightMM:66.2,
    gapColumnMM:8, gapRowMM:4,
    fontSizeTitleRatio:0.15, fontSizeTypeRatio:0.12, fontSizeDetailsRatio:0.09,
    imageSizeRatio:0.33, barcodeWidthMM:40, barcodeHeightMM:15,
    barcodePosition:'bottom', madeInTurkeyPosition:'bottom-right'
  });
  // Tanex's TW-2004 Word template gives margins and cell pitches in twips.
  // Keep those origins while using the published 99.1 × 139 mm die size.
  const twipsToMM = value => value * 25.4 / 1440;
  const defaultProfileId = 'tw2004';
  const largeStockWidthMM = 99.1, largeStockHeightMM = 139;
  function fittedStock(stockWidthMM, stockHeightMM) {
    const insetMM = 1.5;
    const portrait = stockHeightMM > stockWidthMM;
    const artworkWidthMM = portrait ? geometry.cardHeightMM : geometry.cardWidthMM;
    const artworkHeightMM = portrait ? geometry.cardWidthMM : geometry.cardHeightMM;
    return {
      cardWidthMM:stockWidthMM, cardHeightMM:stockHeightMM,
      stockWidthMM, stockHeightMM, insetMM, fitArtwork:true, artworkRotationDeg:portrait ? 90 : 0,
      artworkScale:Math.min(
        (stockWidthMM - 2 * insetMM) / artworkWidthMM,
        (stockHeightMM - 2 * insetMM) / artworkHeightMM
      )
    };
  }
  function rollProfile(name, widthMM, heightMM, labelsPerRoll) {
    const profile = {
      id:`${name.toLowerCase()}${widthMM}x${heightMM}`, name:`${name} ${widthMM} × ${heightMM}`, mediaType:'roll',
      pageWidthMM:widthMM, pageHeightMM:heightMM, columns:1, rows:1,
      marginTopMM:0, marginBottomMM:0, marginLeftMM:0, marginRightMM:0,
      gapColumnMM:0, gapRowMM:0, ...fittedStock(widthMM, heightMM)
    };
    if (labelsPerRoll !== undefined) profile.labelsPerRoll = labelsPerRoll;
    return Object.freeze(profile);
  }
  const profiles = Object.freeze({
    tw2004:Object.freeze({
      id:'tw2004', name:'Tanex TW-2004',
      pageWidthMM:210, pageHeightMM:297,
      marginTopMM:twipsToMM(567), marginBottomMM:0,
      marginLeftMM:twipsToMM(284), marginRightMM:twipsToMM(284),
      columns:2, rows:2, ...fittedStock(largeStockWidthMM, largeStockHeightMM),
      gapColumnMM:twipsToMM(5619 + 164) - largeStockWidthMM, gapRowMM:twipsToMM(7881) - largeStockHeightMM
    }),
    tw2008:Object.freeze({
      ...geometry, id:'tw2008', name:'Tanex TW-2008',
      stockWidthMM:99.1, stockHeightMM:67.7, insetMM:0, artworkRotationDeg:0, artworkScale:1
    }),
    zebra100x150:rollProfile('Zebra', 100, 150, 250),
    zebra150x100:rollProfile('Zebra', 150, 100, 250),
    thermal80x100:rollProfile('Thermal', 80, 100),
    thermal70x100:rollProfile('Thermal', 70, 100),
    thermal100x100:rollProfile('Thermal', 100, 100),
    thermal100x200:rollProfile('Thermal', 100, 200)
  });
  const maxLabels = 2000;
  const own = (value, key) => Object.prototype.hasOwnProperty.call(value, key);
  const record = value => value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  // Existing consumers supply neither an option nor a profile on saved batches.
  const profileFor = id => typeof id === 'string' && own(profiles, id) ? profiles[id] : profiles.tw2008;
  const string = value => typeof value === 'string' ? value :
    typeof value === 'bigint' || (typeof value === 'number' && Number.isFinite(value)) ? String(value) : '';
  const escapeHTML = value => string(value).replace(/[&<>"']/g, character =>
    ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'})[character]);

  const typeNames = Object.freeze({
    coffee_table:'COFFEE TBL', 'طاولة قهوة':'COFFEE TBL',
    side_table:'SIDE TBL', 'طاولة جانبية':'SIDE TBL',
    nesting_table:'ZICON TBL', zicon:'ZICON TBL', 'طاولة زيكون':'ZICON TBL',
    tv_table:'TV TABLE', 'طاولة تلفاز':'TV TABLE',
    dresser:'ENTRANCE', 'مدخل':'ENTRANCE', other:'OTHER', 'أخرى':'OTHER'
  });
  const orderNames = Object.freeze({
    'فاتورة أولى':'First Invoice', 'فاتورة ثانية':'Second Invoice', 'فاتورة تجريبية':'Sample Invoice'
  });

  function normalizeType(value) {
    const original = string(value), key = original.trim().toLowerCase();
    return own(typeNames, key) ? typeNames[key] : original.toUpperCase();
  }

  function positiveInteger(value) {
    if (typeof value !== 'number' && typeof value !== 'string') return null;
    if (typeof value === 'string' && !value.trim()) return null;
    const number = Number(value);
    return Number.isSafeInteger(number) && number > 0 ? number : null;
  }

  // Explicit saved null/empty values are meaningful: a new catalog image must
  // not fill an image deliberately removed from a saved invoice.
  function savedValue(sources, keys) {
    for (const source of sources) {
      for (const key of keys) if (own(source, key) && source[key] !== undefined) return source[key];
    }
    return undefined;
  }

  function cloneFrozen(value, seen = new Map()) {
    if (!value || typeof value !== 'object') return value;
    if (seen.has(value)) return seen.get(value);
    const copy = Array.isArray(value) ? [] : {};
    seen.set(value, copy);
    for (const key of Object.keys(value)) {
      Object.defineProperty(copy, key, {
        value:cloneFrozen(value[key], seen), enumerable:true, configurable:true, writable:true
      });
    }
    return Object.freeze(copy);
  }

  // Raster data, ordinary image URLs, object URLs and local assets only.
  // SVG/data HTML, credentials and URL/attribute control characters are excluded.
  function safeImageSource(value) {
    if (typeof value !== 'string') return '';
    const source = value.trim();
    if (!source || /[\u0000-\u001f\u007f<>"'`\\]/.test(source)) return '';
    if (/^data:/i.test(source)) {
      return /^data:image\/(?:png|jpeg|webp|gif);base64,[A-Za-z0-9+/]+={0,2}$/i.test(source) ? source : '';
    }
    if (/^https?:\/\//i.test(source)) {
      return /^https?:\/\/[^\s\/?#@]+(?:[/?#][^\s]*)?$/i.test(source) ? source : '';
    }
    if (/^blob:/i.test(source)) {
      return /^blob:(?:https?:\/\/[^\s\/?#@]+|null)\/[A-Za-z0-9-]+$/i.test(source) ? source : '';
    }
    if (/^[a-z][a-z0-9+.-]*:/i.test(source) || source.startsWith('//')) return '';
    return /^[./\w\u0080-\uffff-][^:]*$/.test(source) ? source : '';
  }

  function addIssue(issues, code, severity, line, detail) {
    const issue = {code, severity};
    if (line) { issue.lineIndex = line.lineIndex; issue.productId = line.productId; }
    if (detail !== undefined) issue.detail = string(detail);
    issues.push(Object.freeze(issue));
  }

  function imageValue(value, issues, field, line) {
    const original = string(value), safe = safeImageSource(original);
    if (original.trim() && !safe) addIssue(issues, 'unsafeImage', 'warning', line, field);
    return safe;
  }

  function normalizeInvoice(invoice, options = {}) {
    const source = record(invoice), config = record(options), issues = [];
    if (source !== invoice) addIssue(issues, 'missingInvoice', 'error');
    const invNo = string(savedValue([source], ['invNo', 'name']));
    if (!invNo.trim()) addIssue(issues, 'missingInvoiceNumber', 'error');
    const customerLogo = imageValue(savedValue([source], ['companyLogo', 'logoDataUrl']), issues, 'customerLogo');
    const companyLogo = imageValue(config.companyLogo, issues, 'companyLogo');
    const catalog = new Map();
    for (const product of Array.isArray(config.products) ? config.products : []) {
      const entry = record(product), key = string(entry.id);
      if (key && !catalog.has(key)) catalog.set(key, entry);
    }
    const originalItems = Array.isArray(source.items) ? source.items : [];
    if (!originalItems.length) addIssue(issues, 'emptyInvoice', 'error');
    const items = originalItems.map((value, lineIndex) => {
      const line = record(value), snapshot = record(line.productSnapshot);
      const productId = string(savedValue([line], ['productId', 'itemId']));
      const product = catalog.get(productId), sources = [line, snapshot, product || {}];
      const item = {
        lineIndex, productId,
        name:string(savedValue(sources, ['name'])),
        type:normalizeType(savedValue(sources, ['type'])),
        color:string(savedValue(sources, ['color'])),
        qty:positiveInteger(savedValue([line], ['qty', 'quantity'])),
        packets:null, image:'',
        productSnapshot:line.productSnapshot && typeof line.productSnapshot === 'object' ? cloneFrozen(line.productSnapshot) : null
      };
      const packetValue = savedValue(sources, ['packets', 'packetCount']);
      if (packetValue === undefined) {
        item.packets = 1;
        addIssue(issues, 'assumedPackets', 'warning', item);
      } else item.packets = positiveInteger(packetValue);
      item.image = imageValue(savedValue(sources, ['image', 'imageUrl']), issues, 'image', item);
      if (!item.name.trim()) {
        if (productId && !product) addIssue(issues, 'missingProduct', 'error', item);
        addIssue(issues, 'missingName', 'error', item);
      }
      if (!item.type.trim()) addIssue(issues, 'missingType', 'warning', item);
      if (!item.image) addIssue(issues, 'missingImage', 'warning', item);
      if (item.qty === null) addIssue(issues, 'invalidQuantity', 'error', item);
      if (item.packets === null) addIssue(issues, 'invalidPackets', 'error', item);
      return Object.freeze(item);
    });
    return Object.freeze({
      invoiceId:string(source.id), invNo, customerLogo, companyLogo,
      items:Object.freeze(items), issues:Object.freeze(issues)
    });
  }

  function buildLabelBatch(model, options) {
    const source = record(model), issues = Array.isArray(source.issues) ? source.issues.slice() : [];
    const profile = profileFor(record(options).profileId);
    const validItems = [], items = Array.isArray(source.items) ? source.items : [];
    let total = 0;
    for (const item of items) {
      if (!item || !string(item.name).trim() || !positiveInteger(item.qty) || !positiveInteger(item.packets)) continue;
      const count = item.qty * item.packets;
      total += count;
      validItems.push(item);
      // The local CODE128 renderer accepts ASCII. Do not transliterate a model
      // name or substitute another barcode payload without the user's choice.
      if (!/^[\x20-\x7e]+$/.test(item.name)) addIssue(issues, 'unsupportedBarcode', 'error', item, item.name);
    }
    const labels = [], pages = [];
    if (!Number.isSafeInteger(total) || total > maxLabels) {
      addIssue(issues, 'tooManyLabels', 'error', null, String(total));
    } else {
      // Keep each invoice line separate, including same-name products and color
      // variants; retain the source template's packet-major order within it.
      for (const item of validItems) {
        for (let currentPacket = 1; currentPacket <= item.packets; currentPacket++) {
          for (let unitIndex = 1; unitIndex <= item.qty; unitIndex++) {
            labels.push(Object.freeze({
              ...item, unitIndex, currentPacket, totalPackets:item.packets,
              barcodeText:`${item.name} - Packet ${currentPacket}/${item.packets}`
            }));
          }
        }
      }
      const cardsPerPage = profile.columns * profile.rows;
      for (let index = 0; index < labels.length; index += cardsPerPage) pages.push(Object.freeze(labels.slice(index, index + cardsPerPage)));
    }
    return Object.freeze({
      model:source, profileId:profile.id, invoiceId:string(source.invoiceId), invNo:string(source.invNo),
      customerLogo:safeImageSource(source.customerLogo), companyLogo:safeImageSource(source.companyLogo),
      labels:Object.freeze(labels), pages:Object.freeze(pages), issues:Object.freeze(issues),
      labelCount:labels.length, pageCount:pages.length
    });
  }

  function barcodeImage(images, text) {
    const image = images && typeof images.get === 'function' ? images.get(text) :
      images && own(images, text) ? images[text] : '';
    const safe = safeImageSource(image);
    return /^data:image\//i.test(safe) ? safe : '';
  }

  function renderDocument(batch, options = {}) {
    const source = record(batch), settings = profileFor(source.profileId), config = record(options);
    const pages = Array.isArray(source.pages) ? source.pages : [];
    const availableWidthMM = settings.pageWidthMM - settings.marginLeftMM - settings.marginRightMM;
    const availableHeightMM = settings.pageHeightMM - settings.marginTopMM - settings.marginBottomMM;
    const customerLogo = safeImageSource(source.customerLogo), companyLogo = safeImageSource(source.companyLogo);
    const invNo = string(source.invNo), printedNumber = own(orderNames, invNo) ? orderNames[invNo] : invNo || 'A****';
    // Anchor the die grid to physical margins, independent of RTL text flow.
    // A single transform scales all the original artwork around its center.
    // On narrow stock the unrotated layout box extends beyond the page. Clip
    // its overflow at the grid edge so it cannot widen the print viewport.
    const containOverflow = settings.cardWidthMM < geometry.cardWidthMM ? '\n        overflow: hidden;' : '';
    const fittedArtworkCSS = settings.fitArtwork ? `
      .labels-grid {
        position: absolute;
        top: ${settings.marginTopMM}mm;
        left: ${settings.marginLeftMM}mm;
        width: max-content;
        height: max-content;
        margin: 0;${containOverflow}
      }
      .label-card {
        place-self: center;
        transform: rotate(${settings.artworkRotationDeg}deg) scale(${settings.artworkScale});
        transform-origin: center;
      }` : '';

    // Original template: no application CSS, script, CDN or external font load.
    // Only @page sizing and page breaks are hardened; all physical positions,
    // text styling, image margins and decorative elements below are retained.
    let html = `
  <html lang="ar" dir="rtl">
  <head>
    <meta charset="UTF-8" />
    <title>طباعة الاتاكيت</title>
    <style>
      @page {
        size: ${settings.pageWidthMM}mm ${settings.pageHeightMM}mm;
        margin: 0;
      }
      @media print {
        body, html {
          margin: 0; padding: 0;
          width: ${settings.pageWidthMM}mm;
          height: ${settings.pageHeightMM}mm;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        .page {
          width: ${settings.pageWidthMM}mm;
          height: ${settings.pageHeightMM}mm;
          margin: 0;
          padding: 0;
          box-sizing: border-box;
          page-break-after: always;
          break-after: page;
          page-break-inside: avoid;
          break-inside: avoid;
          display: flex;
          align-items: flex-start;
          justify-content: flex-start;
        }
        .page:last-child {
          page-break-after: auto;
          break-after: auto;
        }
        .label-card[style*="background:#f3faf6"] {
          display: none !important;
        }
      }
      body {
        font-family: 'Cairo', Arial, sans-serif;
        direction: rtl;
        margin: 0;
        background: #fff;
      }
      .page {
        position: relative;
        width: ${settings.pageWidthMM}mm;
        height: ${settings.pageHeightMM}mm;
        padding-top: ${settings.marginTopMM}mm;
        padding-bottom: ${settings.marginBottomMM}mm;
        padding-left: ${settings.marginLeftMM}mm;
        padding-right: ${settings.marginRightMM}mm;
        box-sizing: border-box;
      }
      .labels-grid {
        display: grid;
        grid-template-columns: repeat(${settings.columns}, ${settings.cardWidthMM}mm);
        grid-template-rows: repeat(${settings.rows}, ${settings.cardHeightMM}mm);
        column-gap: ${settings.gapColumnMM}mm;
        row-gap: ${settings.gapRowMM}mm;
        width: ${availableWidthMM}mm;
        height: ${availableHeightMM}mm;
        margin: 0 auto;
        justify-content: start;
        align-content: start;
      }
      .label-card {
        border: 1.7px solid #000000;
        border-radius: 4mm;
        background: #ffffff;
        box-sizing: border-box;
        padding: 6mm 5mm 5mm 5mm;
        width: ${geometry.cardWidthMM}mm;
        height: ${geometry.cardHeightMM}mm;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: flex-start;
        position: relative;
        overflow: hidden;
      }
      .label-card img {
        width:60.01mm;
        height:60.01mm;
        object-fit: contain;
        border-radius: 4mm;
        border: 0px solid #ccc;
        margin-top: 3mm;
        margin-bottom: 1.5mm;
      }
      .label-title {
        font-size: ${geometry.cardWidthMM * geometry.fontSizeTitleRatio}pt;
        font-weight: bold;
        color: #256ebd;
        margin: 0 0 1mm 0;
        text-align: center;
        max-width: 90%;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .label-type {
        font-size: ${geometry.cardWidthMM * geometry.fontSizeTypeRatio}pt;
        color: #444;
        margin-bottom: 1mm;
      }
      .label-dim, .label-color, .label-extra {
        font-size: ${geometry.cardWidthMM * geometry.fontSizeDetailsRatio}pt;
        color: #222;
        margin-bottom: 0.8mm;
        text-align: center;
        font-weight: 500;
      }
      .barcode img {
        object-fit: contain;
        border: none;
        display: block;
      }${fittedArtworkCSS}
    </style>
  </head>
  <body>
  `;

    pages.forEach(modelsPage => {
      html += `<div class="page"><div class="labels-grid">`;
      modelsPage.forEach(item => {
        const name = escapeHTML(item.name), image = safeImageSource(item.image);
        const color = string(item.color);
        const packetInfo = `${item.currentPacket} | PACKET : ${item.totalPackets}`;
        const barcode = barcodeImage(config.barcodeImages, string(item.barcodeText));
        html += `
        <div class="label-card">
          ${customerLogo ? `<img src="${escapeHTML(customerLogo)}" alt="لوجو الشركة" style="position: absolute; top: -21mm; left: 30mm; width:35mm; height:60mm; object-fit:contain; border:none;">` : ''}
          ${companyLogo ? `<img src="${escapeHTML(companyLogo)}" alt="شعار الشركة" style="position: absolute; top: -16mm; right: 2mm; width:45mm; height:50mm; object-fit:contain; border:none;">` : ''}
          <div style="font-size: 12pt; color: #666; margin-bottom: 1mm; font-weight: bold; position: relative; right: 90px; left: 0px; top: 101px; bottom: 0px;">
            ORDER NO:
            <span style="font-weight: bold; color: #2368b3; position: relative; right: 0px; left: 0px;">
              ${escapeHTML(printedNumber)}
            </span>
          </div>
          <div style="position: relative; width: 100%; height: 100%;">
            <div style="position: absolute; top: 40px; bottom: auto; left: -10px; right: auto; width: 347px; height: 2px; background-color: #000;"></div>
          </div>
          <div style="position: absolute; bottom: 20mm; left: 50%; transform: translateX(-50%); display: flex; align-items: center; justify-content: center;">
           <div style="
  position: absolute;
  top: -1.2mm;
  bottom: 12mm;
  left: -46.9mm;
  right: -95mm;
  width: 166px;
  height: 146.4px;
  margin: auto;
  background-color: transparent;
  border-radius: 10px;
  border: 2px solid black;
  display: flex;
  align-items: center;
  justify-content: center;
">
            </div>
          </div>
          <div style="position: absolute; top: 8mm; bottom: -15mm; left: -46.5mm; right: 0mm; width: 170px; height: 146px; margin: auto; background-color: transparent; border-radius: 10px; border: 2px solid #000000; display: flex; align-items: center; justify-content: center;">
          </div>
          <div style="position: relative; width: 100%; height: 100%;">
            <div style="position: absolute; top:-10px; bottom: auto; left: -5px; right: auto; width: 160px; height: 2px; background-color: #000;"></div>
            <div style="position: absolute; top:13px; bottom: auto; left: -5px; right: auto; width: 160px; height: 2px; background-color: #000;"></div>
            <div style="position: absolute; top:39px; bottom: auto; left: -5px; right: auto; width: 160px; height: 2px; background-color: #000;"></div>
            <div style="position: absolute; top:67px; bottom: auto; left: -5px; right: auto; width: 160px; height: 2px; background-color: #000;"></div>
            <div style="position: absolute; top:89px; bottom: auto; left: -5px; right: auto; width: 160px; height: 2px; background-color: #000;"></div>
          </div>
          ${image ? `<img src="${escapeHTML(image)}" alt="${name}" style="position: absolute; top: 22.7mm; left: 52.6%; transform: translateX(1%); width:42mm; height:29mm; object-fit:contain; border:1px solid #ccc; border-radius:2mm;">` : ''}
          <div class="label-title" style="position: absolute; bottom: 33mm; left: 22%; transform: translateX(-50%); text-align: center; width: 100%; display: flex; align-items: center; justify-content: center;">
            ${name}
            <div style="height: 20px; width: 2px; background-color: #000; margin: 0 5px;"></div>
            <span style="margin-left: 5mm; font-size: 0.8em; color: #666;">ITEM NAME</span>
          </div>
          <div class="label-type" style="position: relative; width: 300px; height: 30px;">
            <span style="position: absolute; top: -13px; left: -17px; color: #666; font-weight: bold; white-space: nowrap;">
              ITEM: <span style="color: #2368b3;">
                ${escapeHTML(item.type)}
              </span>
            </span>
          </div>
          ${color ? (() => {
            const colors = color.split(/[,–-]/).map(value => value.trim());
            const colorStyles = ['#154578', '#256ebd'];
            const colorHtml = colors.map((value, index) => `<span style="color: ${colorStyles[index] || '#222'};">${escapeHTML(value)}</span>`).join('  ');
            return `<div class="label-color" style="position: absolute; bottom: 21mm; left: 4mm; font-size: 12pt; font-weight: bold;">COLOR: ${colorHtml}</div>`;
          })() : `<div class="label-color" style="position: absolute; bottom: 21mm; left: 4mm; font-size: 12pt; font-weight: bold;"><span style="color: #666666;">COLOR:</span> <span style="color: #2368b3;">STANDART</span></div>`}
          <div class="label-extra" style="position: absolute; bottom: 13.4mm; left: 6mm; font-size: 15pt; text-align: left; font-weight: bold;">
            ${escapeHTML(packetInfo.split(':')[0])}: <span style="color: #FF0000; font-weight: bold;">${escapeHTML(packetInfo.split(':')[1])}</span>
          </div>
          <!-- الباركود فقط بدون نص -->
          <div class="barcode" style="position: absolute; bottom: 1.1mm; left: 62%; transform: translateX(-10%);">
            <img${barcode ? ` src="${escapeHTML(barcode)}"` : ''} alt="باركود ${name}"
              style="width:31mm; height:7mm;" />
          </div>
          <!-- MADE IN TURKEY + العلم التركي -->
          <div style="position: absolute; bottom: 2mm; right: 52mm; display: flex; align-items: center;">
            <span style="font-size: 12pt; font-weight: bold; color: #0a295a; margin-right: 4px;">MADE IN TÜRKIYE</span>
          </div>
        </div>
      `;
      });
      for (let index = modelsPage.length; index < settings.columns * settings.rows; index++) {
        html += `<div class="label-card" style="background:#f3faf6;"></div>`;
      }
      html += `</div></div>`;
    });
    return html + `</body></html>`;
  }

  return Object.freeze({geometry, defaultProfileId, profiles, maxLabels, normalizeInvoice, buildLabelBatch, renderDocument, safeImageSource});
});
