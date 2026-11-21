const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const core = require('../package-label-core.js');

const png = 'data:image/png;base64,AA==';
const jpg = 'data:image/jpeg;base64,AQ==';
const make = (items, extra = {}, options = {}) => core.buildLabelBatch(core.normalizeInvoice({id:'i1', invNo:'A5148', items, ...extra}, options));
const codes = result => result.issues.map(issue => issue.code);

test('the physical grid retains the supplied A4 label dimensions and asymmetric padding', () => {
  assert.deepEqual(core.geometry, {
    pageWidthMM:210, pageHeightMM:297, marginTopMM:11.5, marginBottomMM:3,
    marginLeftMM:1, marginRightMM:4.4, columns:2, rows:4,
    cardWidthMM:97, cardHeightMM:66.2, gapColumnMM:8, gapRowMM:4,
    fontSizeTitleRatio:0.15, fontSizeTypeRatio:0.12, fontSizeDetailsRatio:0.09,
    imageSizeRatio:0.33, barcodeWidthMM:40, barcodeHeightMM:15,
    barcodePosition:'bottom', madeInTurkeyPosition:'bottom-right'
  });
  assert(Object.isFrozen(core.geometry));
  const g = core.geometry;
  assert.equal(g.columns*g.rows, 8);
  assert.equal(g.cardWidthMM*g.columns+g.gapColumnMM, 202);
  assert.equal(g.cardHeightMM*g.rows+g.gapRowMM*(g.rows-1), 276.8);
});

test('saved invoice values, then its product snapshot, take precedence over the live catalog', () => {
  const snapshot = {name:'SAVED', type:'side_table', color:'Oak', packets:2, image:png, dims:[{l:80}]};
  const line = {productId:7, name:'ORDER NAME', color:'Walnut', qty:3, productSnapshot:snapshot};
  const invoice = {id:'archive', invNo:'A9000', companyLogo:jpg, items:[line]};
  const model = core.normalizeInvoice(invoice, {companyLogo:png, products:[{id:'7', name:'NEW NAME', type:'tv_table', color:'White', packets:9, image:'/new.png'}]});
  assert.equal(model.invNo, 'A9000');
  assert.equal(model.customerLogo, jpg);
  assert.equal(model.companyLogo, png);
  assert.deepEqual({...model.items[0], productSnapshot:undefined}, {
    lineIndex:0, productId:'7', name:'ORDER NAME', type:'SIDE TBL', color:'Walnut',
    qty:3, packets:2, image:png, productSnapshot:undefined
  });
  assert.notEqual(model.items[0].productSnapshot, snapshot);
  assert.notEqual(model.items[0].productSnapshot.dims, snapshot.dims);
  assert(Object.isFrozen(model));
  assert(Object.isFrozen(model.items));
  assert(Object.isFrozen(model.items[0]));
  assert(Object.isFrozen(model.items[0].productSnapshot.dims));
  assert.equal(invoice.items[0].type, undefined);
  assert.equal(snapshot.name, 'SAVED');
});

test('explicit empty saved fields do not silently refill from newer product data', () => {
  const model = core.normalizeInvoice({invNo:'A1', items:[{productId:'p', qty:1, packets:1, name:'Saved', type:'other', color:'', image:null}]}, {
    products:[{id:'p', color:'Changed', image:'/new.png'}]
  });
  assert.equal(model.items[0].color, '');
  assert.equal(model.items[0].image, '');
  assert(codes(model).includes('missingImage'));
  const html = core.renderDocument(core.buildLabelBatch(model));
  assert(html.includes('STANDART'));
  assert(!html.includes('/new.png'));
});

test('legacy product IDs and original template field names can use the current product as a fallback', () => {
  const model = core.normalizeInvoice({name:'فاتورة أولى', logoDataUrl:png, items:[{itemId:42, quantity:'2'}]}, {
    products:[{id:'42', name:'OLD-42', type:'طاولة قهوة', color:'Blue', packetCount:3, imageUrl:jpg}]
  });
  assert.equal(model.invNo, 'فاتورة أولى');
  assert.equal(model.customerLogo, png);
  assert.equal(model.items[0].type, 'COFFEE TBL');
  assert.equal(model.items[0].packets, 3);
  assert.equal(core.buildLabelBatch(model).labelCount, 6);
  assert(core.renderDocument(core.buildLabelBatch(model)).includes('First Invoice'));
});

test('all source and existing app product types preserve the expected English captions', () => {
  const variants = [
    ['coffee_table','COFFEE TBL'], ['طاولة قهوة','COFFEE TBL'], ['side_table','SIDE TBL'], ['طاولة جانبية','SIDE TBL'],
    ['nesting_table','ZICON TBL'], ['zicon','ZICON TBL'], ['طاولة زيكون','ZICON TBL'], ['tv_table','TV TABLE'],
    ['طاولة تلفاز','TV TABLE'], ['dresser','ENTRANCE'], ['مدخل','ENTRANCE'], ['other','OTHER'], ['أخرى','OTHER'], ['custom chair','CUSTOM CHAIR']
  ];
  for (const [type, expected] of variants) {
    assert.equal(core.normalizeInvoice({items:[{name:'M', qty:1, packets:1, type}]}).items[0].type, expected);
  }
});

test('packet-major ordering retains separate same-name products and line color variants', () => {
  const batch = make([
    {productId:'one', name:'SAME', type:'other', color:'Red', qty:2, packets:2},
    {productId:'two', name:'SAME', type:'other', color:'Blue', qty:1, packets:3},
    {productId:'one', name:'SAME', type:'other', color:'Green', qty:2, packets:1}
  ]);
  assert.equal(batch.labelCount, 9);
  assert.equal(batch.pageCount, 2);
  assert.deepEqual(batch.pages.map(page => page.length), [8,1]);
  assert.deepEqual(batch.labels.map(label => [label.productId,label.color,label.currentPacket,label.totalPackets]), [
    ['one','Red',1,2], ['one','Red',1,2], ['one','Red',2,2], ['one','Red',2,2],
    ['two','Blue',1,3], ['two','Blue',2,3], ['two','Blue',3,3], ['one','Green',1,1], ['one','Green',1,1]
  ]);
  assert.equal(batch.labels[0].barcodeText, 'SAME - Packet 1/2');
  assert.equal(batch.labels[4].barcodeText, 'SAME - Packet 1/3');
});

test('selective reprints preserve original sequence, packet, unit and invoice quantities across every paper profile', () => {
  const invoice={id:'invoice:one',invNo:'A42',items:[
    {productId:'same',name:'SAME',color:'Oak',type:'other',qty:3,packets:3},
    {productId:'same',name:'SAME',color:'Black',type:'other',qty:2,packets:2}
  ]};
  const original=JSON.stringify(invoice),model=core.normalizeInvoice(invoice),first=core.buildLabelBatch(model);
  const wanted=[first.labels[12].labelId,first.labels[5].labelId,first.labels[5].labelId];
  for(const profileId of Object.keys(core.profiles)){
    const full=core.buildLabelBatch(model,{profileId}),selected=core.selectLabelBatch(full,wanted);
    assert.deepEqual(selected.labels.map(label=>label.sequenceNumber),[6,13]);
    assert.deepEqual(selected.labels.map(label=>[label.currentPacket,label.unitIndex,label.totalPackets,label.qty]),[[2,3,3,3],[2,2,2,2]]);
    assert.deepEqual(selected.labels.map(label=>label.barcodeText),['SAME - Packet 2/3','SAME - Packet 2/2']);
    assert.equal(selected.labels[0],full.labels[5],'the selected original label object is retained');
    assert.equal(selected.model,model);assert.equal(selected.labelCount,2);assert.equal(selected.originalLabelCount,13);
    assert.equal(selected.pageCount,Math.ceil(2/(core.profiles[profileId].columns*core.profiles[profileId].rows)));
    assert(Object.isFrozen(selected));assert(Object.isFrozen(selected.labels));assert(Object.isFrozen(selected.pages[0]));
  }
  assert.equal(JSON.stringify(invoice),original);
});

test('stable label IDs distinguish repeated product lines and invoices, and an empty or unknown selection never means all labels', () => {
  const items=[{productId:'p',name:'SAME',type:'other',qty:2,packets:2},{productId:'p',name:'SAME',type:'other',qty:2,packets:2}];
  const first=make(items),second=make(items,{id:'other'});
  assert.equal(new Set(first.labels.map(label=>label.labelId)).size,8);
  assert(first.labels.every(label=>!second.labels.some(other=>label.labelId===other.labelId)));
  for(const selection of [[],undefined,null,['unknown']]){
    const result=core.selectLabelBatch(first,selection);
    assert.equal(result.labelCount,0);assert.equal(result.pageCount,0);assert.equal(result.originalLabelCount,8);
    assert.equal(core.renderDocument(result).includes('class="barcode"'),false);
  }
  assert.equal(first.labelCount,8);assert.deepEqual(first.labels.map(label=>label.sequenceNumber),[1,2,3,4,5,6,7,8]);
});

test('malformed, zero, fractional and nonfinite quantities or packet counts never become labels', () => {
  for (const qty of [undefined,null,'',0,-1,1.2,'1.2','invalid',Infinity,NaN,true,[],{}]) {
    const batch = make([{name:'M', type:'other', qty, packets:1}]);
    assert.equal(batch.labelCount, 0, 'quantity '+String(qty));
    assert(codes(batch).includes('invalidQuantity'));
  }
  for (const packets of [null,'',0,-1,1.5,'invalid',Infinity,true,[],{}]) {
    const batch = make([{name:'M', type:'other', qty:1, packets}]);
    assert.equal(batch.labelCount, 0, 'packets '+String(packets));
    assert(codes(batch).includes('invalidPackets'));
  }
  const numericStrings = make([{name:'M', type:'other', qty:'2', packets:'3'}]);
  assert.equal(numericStrings.labelCount, 6);
});

test('an absent legacy packet count retains one packet and reports the assumption', () => {
  const batch = make([{name:'M', type:'other', qty:2}]);
  assert.equal(batch.labelCount, 2);
  assert(codes(batch).includes('assumedPackets'));
  assert(batch.issues.find(issue => issue.code === 'assumedPackets').severity === 'warning');
});

test('missing invoice and product details are surfaced instead of silently dropping referenced products', () => {
  const model = core.normalizeInvoice({items:[{productId:'gone', qty:1, packets:1}]});
  assert(codes(model).includes('missingInvoiceNumber'));
  assert(codes(model).includes('missingProduct'));
  assert(codes(model).includes('missingName'));
  assert(codes(model).includes('missingType'));
  assert(codes(model).includes('missingImage'));
  assert.equal(core.buildLabelBatch(model).labelCount, 0);
  const saved = make([{productId:'gone', name:'SAVED', type:'other', qty:1, packets:1, image:png}]);
  assert.equal(saved.labelCount, 1);
  assert(!codes(saved).includes('missingProduct'));
  assert(codes(core.normalizeInvoice(null)).includes('missingInvoice'));
  assert(codes(core.normalizeInvoice({invNo:'A1', items:[]})).includes('emptyInvoice'));
});

test('oversized batches are rejected before allocating labels, including cumulative counts', () => {
  const huge = make([{name:'HUGE', type:'other', qty:Number.MAX_SAFE_INTEGER, packets:2}]);
  assert.equal(huge.labelCount, 0);
  assert(codes(huge).includes('tooManyLabels'));
  const combined = make([
    {name:'ONE', type:'other', qty:core.maxLabels, packets:1},
    {name:'TWO', type:'other', qty:1, packets:1}
  ]);
  assert.equal(combined.labelCount, 0);
  assert.equal(combined.pageCount, 0);
  assert(codes(combined).includes('tooManyLabels'));
});

test('the accepted batch boundary is complete and unsupported CODE128 names stay unchanged with actionable errors', () => {
  const boundary = make([{name:'MODEL', type:'other', qty:core.maxLabels, packets:1}]);
  assert.equal(boundary.labelCount, core.maxLabels);
  assert.equal(boundary.pageCount, Math.ceil(core.maxLabels/8));
  assert(!codes(boundary).includes('tooManyLabels'));
  for (const name of ['كرسي', 'İZMİR', 'CAFÉ', 'MODEL\n1', '🪑']) {
    const batch = make([{name, type:'other', qty:1, packets:2}]);
    assert.equal(batch.labelCount, 2);
    assert.equal(batch.labels[0].name, name);
    assert.equal(batch.labels[0].barcodeText, `${name} - Packet 1/2`);
    const issue = batch.issues.find(item => item.code === 'unsupportedBarcode');
    assert(issue);
    assert.equal(issue.severity, 'error');
    assert.equal(issue.lineIndex, 0);
  }
  const long = make([{name:'A'.repeat(120), type:'other', qty:1, packets:1}]);
  assert(!codes(long).includes('unsupportedBarcode'));
  assert.equal(long.labels[0].barcodeText, `${'A'.repeat(120)} - Packet 1/1`);
});

test('the standalone document preserves every caption and graphic with explicit A4 breaks', () => {
  const batch = make([{name:'W400', type:'coffee_table', qty:9, packets:1, color:'Oak-Black', image:'/product.png', dimensions:'DO NOT PRINT DIMENSIONS', cost:4321}],
    {companyLogo:'/customer.png'}, {companyLogo:'/issuer.png'});
  const html = core.renderDocument(batch, {barcodeImages:new Map([['W400 - Packet 1/1',png]])});
  for (const text of ['ORDER NO:', 'A5148', 'W400', 'ITEM NAME', 'ITEM:', 'COFFEE TBL', 'COLOR:', 'Oak', 'Black', 'PACKET :', 'MADE IN TÜRKIYE']) assert(html.includes(text), text);
  for (const css of ['size: 210mm 297mm', 'margin: 0', 'width: 97mm', 'height: 66.2mm', 'padding-top: 11.5mm', 'padding-bottom: 3mm',
    'padding-left: 1mm', 'padding-right: 4.4mm', 'column-gap: 8mm', 'row-gap: 4mm', 'grid-template-columns: repeat(2, 97mm)',
    'grid-template-rows: repeat(4, 66.2mm)', 'border: 1.7px solid #000000', 'border-radius: 4mm', 'padding: 6mm 5mm 5mm 5mm',
    'width:42mm; height:29mm', 'top: -21mm; left: 30mm', 'top: -16mm; right: 2mm', 'width:31mm; height:7mm', 'font-size: 14.549999999999999pt']) {
    assert(html.includes(css), css);
  }
  assert(html.includes('break-after: page'));
  assert(html.includes('.page:last-child'));
  assert(!html.includes('size: auto'));
  assert(!html.includes('DO NOT PRINT DIMENSIONS'));
  assert(!html.includes('4321'));
  assert(!html.includes('flagcdn'));
  assert(!html.includes('metafloor'));
  assert(!html.includes('<script'));
  assert.equal((html.match(/class="page"/g)||[]).length, 2);
  assert.equal((html.match(/class="label-card"/g)||[]).length, 16);
  assert.equal((html.match(/class="barcode"/g)||[]).length, 9);
  assert(html.includes('src="/customer.png"'));
  assert(html.includes('src="/issuer.png"'));
});

test('untrusted invoice, product and color content stays text and cannot inject HTML or attributes', () => {
  const attack = '\"><img src=x onerror=alert(1)><script>alert(2)</script>&';
  const batch = make([{name:attack,type:attack,color:attack,qty:1,packets:1,image:'javascript:alert(1)'}],
    {invNo:attack,companyLogo:'data:image/svg+xml;base64,PHN2Zz4='}, {companyLogo:'https://example.test/x.png\" onerror=\"alert(1)'});
  const html = core.renderDocument(batch, {barcodeImages:{[batch.labels[0].barcodeText]:'data:text/html;base64,AA=='}});
  assert(html.includes('&lt;script&gt;'));
  assert(html.includes('&quot;'));
  assert(!html.includes('<script'));
  assert(!html.includes('<img src=x'));
  assert(!html.includes('src="javascript:'));
  assert(!html.includes('data:image/svg+xml'));
  assert(!html.includes('data:text/html'));
  assert(!html.includes(' onerror="'));
  assert(codes(batch).includes('unsafeImage'));
});

test('safe image sources are narrowly accepted and unsafe protocols, malformed data, and markup rejected', () => {
  const allowed = [png,jpg,'data:image/webp;base64,AA==','data:image/gif;base64,AA==',
    'https://example.test/image.png?x=1&y=2','http://localhost:8080/a.jpg','blob:https://example.test/uuid',
    '/images/product.png','./images/product.webp','../images/logo.png','images/logo.png'];
  const denied = ['javascript:alert(1)','JaVaScRiPt:alert(1)','file:///etc/passwd','data:image/svg+xml;base64,AA==',
    'data:text/html;base64,AA==','data:image/png;base64,<svg>', '//outside.test/a.png','https://u:p@outside.test/a.png',
    'https://example.test/\" onload=\"x','/x\n onerror=x','\\\\outside.test\\x','vbscript:foo'];
  for (const image of allowed) assert.equal(core.safeImageSource(image),image,image);
  for (const image of denied) assert.equal(core.safeImageSource(image),'',image);
});

test('barcodes are injected only from safe local image data without generating network requests', () => {
  const batch = make([{name:'MODEL 1',type:'other',qty:1,packets:2}]);
  const map = {'MODEL 1 - Packet 1/2':png, 'MODEL 1 - Packet 2/2':jpg};
  const html = core.renderDocument(batch, {barcodeImages:map});
  assert(html.includes('src="'+png+'"'));
  assert(html.includes('src="'+jpg+'"'));
  const missing = core.renderDocument(batch);
  assert(!missing.includes('src=""'));
  assert(!missing.includes('https://'));
  assert.equal(batch.labels[0].barcodeText, 'MODEL 1 - Packet 1/2');
});

test('the pure module loads in a browser context without document, network or storage globals', () => {
  const context = vm.createContext({});
  vm.runInContext(fs.readFileSync(path.join(__dirname,'../package-label-core.js'),'utf8'),context);
  assert.equal(context.WFPackageLabelCore.geometry.cardWidthMM,97);
  const model = context.WFPackageLabelCore.normalizeInvoice({invNo:'A1',items:[{name:'M',qty:1,packets:1,type:'other'}]});
  assert.equal(context.WFPackageLabelCore.buildLabelBatch(model).labelCount,1);
});
