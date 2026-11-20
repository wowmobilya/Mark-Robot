const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const core = require('../product-label-core.js');

test('a saved print language remains independent of the current app language', () => {
  for (const appLocale of ['ar', 'tr', 'en', 'fr', 'ru']) {
    assert.equal(core.resolveLocale('fr', appLocale), 'fr');
  }
  assert.equal(core.resolveLocale(undefined, 'tr'), 'tr');
  assert.equal(core.resolveLocale('unsupported', 'ru'), 'ru');
  assert.equal(core.resolveLocale('', 'unsupported'), 'ar');
});

test('locale normalization accepts supported values and uses a validated fallback', () => {
  assert.equal(core.normalizeLocale(' EN '), 'en');
  assert.equal(core.normalizeLocale(null, 'tr'), 'tr');
  assert.equal(core.normalizeLocale('de', 'fr'), 'fr');
  assert.equal(core.normalizeLocale('de', 'de'), 'ar');
  assert.deepEqual([...core.locales], ['ar', 'tr', 'en', 'fr', 'ru']);
  assert(Object.isFrozen(core.locales));
});

test('catalog search normalizes Arabic marks and digits, Turkish letters, accents and compatibility forms', () => {
  const cases = [
    ['  أَرِيكَة إيطالية آفاق ٱلْبَاب ٤٢ ۴۲  ', 'اريكة ايطالية افاق الباب 42 42'],
    ['İSTANBUL IĞDIR ışık', 'istanbul igdir isik'],
    ['CAFÉ Étagère', 'cafe etagere'],
    ['ＭＯＤＥＬ １２３', 'model 123'],
    ['  КОМПЛЕКТ 42  ', 'комплект 42'],
    [0, '0'],
    [null, ''],
    [undefined, ''],
    [{name:'not text'}, ''],
    [['MODEL'], ''],
    [Infinity, '']
  ];
  for (const [value, expected] of cases) assert.equal(core.normalizeSearch(value), expected);
});

test('product search requires every whitespace token across name, barcode, code and type without changing stored values', () => {
  const product = Object.freeze({name:'  Étagère İZMİR  ', barcode:'٠٠۱۲', code:'K-٤٢', type:'SET'});
  assert.equal(core.matchesProduct(product, ' izmir\t0012\nset K-42 '), true);
  assert.equal(core.matchesProduct(product, 'set etagere'), true);
  assert.equal(core.matchesProduct(product, 'izmir missing'), false);
  assert.equal(core.matchesProduct(product, '  \n\t '), true);
  assert.equal(core.matchesProduct({name:'Model', barcode:0}, '0 model'), true);
  assert.equal(core.matchesProduct({name:null, barcode:{}, code:[], type:false}, 'object'), false);
  assert.equal(core.matchesProduct(null, 'model'), false);
  assert.deepEqual(product, {name:'  Étagère İZMİR  ', barcode:'٠٠۱۲', code:'K-٤٢', type:'SET'});
});

test('product review reports missing fields safely and preserves useful partial physical rows', () => {
  const all = ['missingName', 'missingImage', 'missingDimensions'];
  assert.deepEqual(core.reviewProduct(null), all);
  assert.deepEqual(core.reviewProduct({name:' \t ', image:'\n'}), all);
  assert.deepEqual(core.reviewProduct({name:{}, image:42}), all);
  const product = Object.freeze({name:0, image:'/photo.png', dims:Object.freeze([Object.freeze({l:200, w:0, h:0})])});
  assert.deepEqual(core.reviewProduct(product), []);
  assert.equal(product.name, 0);
  assert.equal(product.dims[0].l, 200);
  assert.deepEqual(core.reviewProduct({name:'W400', image:null, dims:[{l:'invalid', w:-1, h:Infinity}]}),
    ['missingImage', 'missingDimensions']);
});

test('product review shares physical dimension precedence and never uses shipping packages', () => {
  const metadata = {name:'W400', image:'photo.png'};
  assert.deepEqual(core.reviewProduct({...metadata, dimPieces:[{l:100, w:50, h:40}]}), ['missingDimensions']);
  assert.deepEqual(core.reviewProduct({...metadata, dimL:100, dimW:50, dimH:40}), []);
  assert.deepEqual(core.reviewProduct({...metadata, dims:[], dimL:'100'}), []);
  assert.deepEqual(core.reviewProduct({...metadata, dims:[{l:0, w:0, h:0}], dimL:100}), ['missingDimensions']);
});

test('geometry describes exactly two connected faces that fit on one landscape A4 sheet', () => {
  const g = core.geometry;
  assert.deepEqual(g, {paperWidth:297, paperHeight:210, margin:6, pairWidth:200, pairHeight:150, faceWidth:100, faceHeight:150});
  assert.equal(g.pairWidth, g.faceWidth * 2);
  assert.equal(g.pairHeight, g.faceHeight);
  assert(g.pairWidth + g.margin * 2 <= g.paperWidth);
  assert(g.pairHeight + g.margin * 2 <= g.paperHeight);
  assert(Object.isFrozen(g));
});

test('physical size rows win over legacy dimensions and shipping package dimensions', () => {
  const product = {
    dims:[{l:'100.5', w:60, h:'42'}, {l:50, w:30, h:20}],
    dimL:999, dimW:999, dimH:999,
    dimPieces:[{l:120, w:80, h:70, weight:6, packets:2}]
  };
  assert.deepEqual(core.getDimensions(product), [{l:100.5, w:60, h:42}, {l:50, w:30, h:20}]);
});

test('legacy physical sizes are used when size rows are missing or empty', () => {
  assert.deepEqual(core.getDimensions({dimL:90, dimW:'50', dimH:30}), [{l:90, w:50, h:30}]);
  assert.deepEqual(core.getDimensions({dims:[], dimL:90, dimW:50, dimH:30}), [{l:90, w:50, h:30}]);
  assert.deepEqual(core.getDimensions({dimPieces:[{l:90, w:50, h:30}]}), [{l:0, w:0, h:0}]);
});

test('invalid physical values do not become nonfinite dimensions or erase partial rows', () => {
  assert.deepEqual(core.getDimensions({dims:[{l:'invalid', w:60, h:null}, {l:Infinity, w:-4, h:20}, null]}),
    [{l:0, w:60, h:0}, {l:0, w:0, h:20}, {l:0, w:0, h:0}]);
});

test('all physical rows survive model creation without a fixed-row truncation', () => {
  const dims = Array.from({length:12}, (_, index) => ({l:100+index, w:50, h:40}));
  const model = core.createLabelModel({id:'set-12', name:'SET-12', dims});
  assert.equal(model.rows.length, 12);
  assert.deepEqual(model.rows[11], {l:111, w:50, h:40});
  assert.notEqual(model.rows, dims);
  assert.notEqual(model.rows[0], dims[0]);
});

test('model creation preserves zero volume while distinguishing absent and invalid volumes', () => {
  assert.equal(core.createLabelModel({cbm:0, totalCBM:0.3}).cbm, 0);
  assert.equal(core.createLabelModel({cbm:'0'}).cbm, 0);
  assert.equal(core.createLabelModel({cbm:'0.1250'}).cbm, 0.125);
  assert.equal(core.createLabelModel({totalCBM:0.42}).cbm, 0.42);
  assert.equal(core.createLabelModel({cbm:'', totalCBM:0.42}).cbm, 0.42);
  for (const product of [{}, {cbm:null}, {cbm:'invalid'}, {cbm:Infinity}, {cbm:-1}]) {
    assert.equal(core.createLabelModel(product).cbm, null);
  }
});

test('known SET and PCS descriptions use the existing five-language labels', () => {
  const cases = [
    ['ar', 'SET', 'طقم'], ['ar', 'PCS', 'قطعة'],
    ['tr', 'طقم', 'Takım'], ['tr', 'Pièces', 'Parça'],
    ['en', 'Комплект', 'Set'], ['en', 'Parça', 'PCS'],
    ['fr', 'Takım', 'Ensemble'], ['fr', 'Шт.', 'Pièces'],
    ['ru', 'Set', 'Комплект'], ['ru', 'قطعة', 'Шт.']
  ];
  for (const [locale, desc, expected] of cases) {
    assert.equal(core.createLabelModel({desc}, {locale}).description, expected);
  }
});

test('custom descriptions and explicit editor overrides remain exactly as supplied', () => {
  assert.equal(core.createLabelModel({desc:'3+2+1'}, {locale:'ar'}).description, '3+2+1');
  assert.equal(core.createLabelModel({desc:'  Oak / قماش  '}, {locale:'fr'}).description, '  Oak / قماش  ');
  assert.equal(core.createLabelModel({desc:'SET'}, {locale:'fr', description:'SET'}).description, 'SET');
  assert.equal(core.createLabelModel({desc:'SET'}, {locale:'fr', description:undefined}).description, 'Ensemble');
  assert.equal(core.createLabelModel({desc:'SET'}, {description:''}).description, '');
  assert.equal(core.createLabelModel({desc:'SET'}, {description:null}).description, '');
  assert.equal(core.createLabelModel({}).description, '');
});

test('the barcode uses only the stored code or name and preserves the exact payload', () => {
  assert.equal(core.createLabelModel({barcode:'MODEL-9', name:'Name'}).barcode, 'MODEL-9');
  assert.equal(core.createLabelModel({barcode:'', name:'MODEL-9'}).barcode, 'MODEL-9');
  assert.equal(core.createLabelModel({barcode:' MODEL 9 '}).barcode, ' MODEL 9 ');
  const absent = core.createLabelModel({id:'record-42', cbm:0.2});
  assert.equal(absent.barcode, '');
  assert.equal(absent.barcodeValid, false);
  assert(absent.issues.includes('missingBarcode'));
});

test('numeric zero barcodes remain the actual payload and only absent codes fall back to the product name', () => {
  for (const barcode of [0, '0', '0000']) {
    const model = core.createLabelModel({name:'MODEL-0', barcode});
    assert.equal(model.barcode, String(barcode));
    assert.equal(model.barcodeValid, true);
  }
  for (const barcode of [undefined, null, '']) {
    assert.equal(core.createLabelModel({name:'MODEL-0', barcode}).barcode, 'MODEL-0');
  }
  const blank = core.createLabelModel({name:'MODEL-0', barcode:'  '});
  assert.equal(blank.barcode, '  ');
  assert.equal(blank.barcodeValid, false);
});

test('unsupported barcode characters are retained as data and are never silently replaced', () => {
  for (const barcode of ['كرسي', 'CAFÉ', 'MODEL\n9', 'MODEL\t9', 'MODEL\u007f', '🪑']) {
    const model = core.createLabelModel({barcode, name:'ASCII-NAME'});
    assert.equal(model.barcode, barcode);
    assert.equal(model.barcodeValid, false);
    assert(model.issues.includes('unsupportedBarcode'));
  }
  assert.equal(core.createLabelModel({barcode:'  '}).barcodeValid, false);
});

test('printable ASCII barcode values fit only through the forty-character boundary', () => {
  assert.equal(core.createLabelModel({barcode:'MODEL_42-9 / [A]'}).barcodeValid, true);
  assert.equal(core.createLabelModel({barcode:'A'.repeat(40)}).barcodeValid, true);
  const long = core.createLabelModel({barcode:'A'.repeat(41), name:'SHORT'});
  assert.equal(long.barcode, 'A'.repeat(41));
  assert.equal(long.barcodeValid, false);
  assert(long.issues.includes('longBarcode'));
});

test('model creation does not mutate input data, descriptions, options, or measurement rows', () => {
  const product = Object.freeze({id:42, name:'MODEL-42', dims:Object.freeze([Object.freeze({l:90, w:60, h:40})]), cbm:0.15, desc:'SET'});
  const options = Object.freeze({locale:'ru', logo:'data:image/png;base64,AA==', company:'WOW', website:'wow.example'});
  const model = core.createLabelModel(product, options);
  assert.deepEqual(model, {
    id:'42', name:'MODEL-42', rows:[{l:90, w:60, h:40}], cbm:0.15,
    description:'Комплект', barcode:'MODEL-42', barcodeValid:true,
    logo:'data:image/png;base64,AA==', company:'WOW', website:'wow.example',
    locale:'ru', dir:'ltr', issues:[]
  });
  model.rows[0].l = 1;
  assert.equal(product.dims[0].l, 90);
  assert.equal(product.desc, 'SET');
});

test('metadata remains untrusted plain text rather than HTML or generated markup', () => {
  const markup = '<img src=x onerror="throw 1">';
  const model = core.createLabelModel({name:markup, desc:markup}, {company:markup, website:markup, logo:markup});
  assert.equal(model.name, markup);
  assert.equal(model.description, markup);
  assert.equal(model.company, markup);
  assert.equal(model.website, markup);
  assert.equal(model.logo, markup);
});

test('missing dimensions and direction are explicit for an empty Arabic model', () => {
  const model = core.createLabelModel(null);
  assert.equal(model.locale, 'ar');
  assert.equal(model.dir, 'rtl');
  assert.equal(model.name, '');
  assert.equal(model.cbm, null);
  assert.deepEqual(model.rows, [{l:0, w:0, h:0}]);
  assert(model.issues.includes('missingDimensions'));
  assert.equal(core.createLabelModel({}, {locale:'tr'}).dir, 'ltr');
});

test('printed captions cover every supported locale without leaking translation keys', () => {
  const keys = ['productName', 'height', 'width', 'length', 'cm', 'volume', 'description', 'front', 'back', 'fold', 'cut', 'foldHint', 'missingBarcode', 'missingDimensions', 'noImage'];
  for (const locale of ['ar', 'tr', 'en', 'fr', 'ru']) {
    for (const key of keys) {
      const caption = core.text(locale, key);
      assert.equal(typeof caption, 'string', locale + ': ' + key);
      assert(caption.length > 0, locale + ': ' + key);
      if (key !== 'cm') assert.notEqual(caption, key, locale + ': ' + key);
      assert(!/\{(?:width|height)\}/.test(caption), locale + ': unresolved dimension');
    }
  }
  assert.equal(core.text('ar', 'productName'), 'اسم المنتج');
  assert.equal(core.text('tr', 'height'), 'Yükseklik');
  assert.equal(core.text('fr', 'back'), 'Verso');
  assert.equal(core.text('ru', 'cm'), 'см');
});

test('fold guidance interpolates explicit physical dimensions without translating supplied values', () => {
  assert.match(core.text('en', 'foldHint'), /100 × 150 mm/);
  assert.match(core.text('en', 'foldHint', {width:'100.5', height:'150'}), /100\.5 × 150 mm/);
  assert.equal(core.text('unsupported', 'productName'), 'اسم المنتج');
  assert.equal(core.text('en', 'unknownCaption'), 'unknownCaption');
});

test('the same pure core loads as a browser global without a DOM or CommonJS', () => {
  const context = vm.createContext({});
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../product-label-core.js'), 'utf8'), context);
  assert.equal(context.WFProductLabelCore.resolveLocale('ru', 'ar'), 'ru');
  const model = context.WFProductLabelCore.createLabelModel({name:'MODEL-1'}, {locale:'en'});
  assert.equal(model.barcode, 'MODEL-1');
  assert.equal(model.dir, 'ltr');
});
