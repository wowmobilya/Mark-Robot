const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const policy = require('../accounts-policy.js');
const data = require('../accounts-data-policy.js');
const labels = require('../package-label-core.js');
const manufacturing = require('../manufacturing-core.js');
const tasks = require('../daily-tasks-core.js');
const archive = require('../invoice-archive-core.js');
const costCore = require('../product-cost-core.js');
const actor = (role, permissions = policy.presets(role), extra = {}) => ({role, permissions, status:'active', ...extra});
const custom = (...permissions) => actor('custom', permissions);
const denied = callback => assert.throws(callback, error => error?.code === 'ACCESS_DENIED');
const at = '2026-11-21T12:00:00.000Z';
const product = () => ({id:'p1',name:'MODEL A',type:'coffee_table',barcode:'MODEL A',color:'Oak',image:'wfmedia:picture',packets:2,qty:3,
  dimensions:'60×40×30',dims:[{l:60,w:40,h:30,price:120}],dimPieces:[{l:62,w:42,h:32,weight:5,packets:2,costUSD:40}],
  priceUSD:120,priceA:120,priceB:100,costing:{unitCostUSD:40,materials:[{name:'Wood',unitPrice:20}]},
  productSnapshot:{name:'MODEL A',type:'coffee_table',image:'',priceUSD:120,costing:{unitCostUSD:40}},futureSecret:{profit:80}});
const invoice = () => ({id:'i1',invNo:'A-5000',companyId:'c1',companyName:'Customer name',companyLogo:'wfmedia:client-logo',
  buyerName:'Buyer',regDate:'2026-11-21',createdAt:at,grandTotal:360,remainingUSD:200,depositUSD:160,currency:'USD',
  notes:'Financial terms',payments:[{id:'pay1',amount:160}],items:[{...product(),productId:'p1',costSnapshot:{unitCostUSD:40}}],
  packageLabelSnapshot:{version:1,companyLogo:'wfmedia:old-company-logo',customerLogo:null,capturedAt:at,bankAccount:'secret'},
  futurePrivateData:{price:99}});
const settings = () => ({id:'main',companyName:'WOW',logo:'wfmedia:company-logo',website:'wow.example',bankName:'Private bank',ibanUSD:'private',
  beneficiary:'Private account',swift:'PRIVATE',accountNo:'hidden',manualUsdTry:33,kdvRate:20,nextNoExt:5000,prefixExt:'A',
  appIdentity:{version:1,name:'My WOW',logo:'wfmedia:app-logo',installIconMode:'app',secret:'not public'},
  branding:{logoShape:'circle',logoSize:'large',logoBackground:'#ffffff',bank:'private'},
  dailyTasks:{version:1,revision:1,items:[]},materialLibrary:{version:1,materials:[{id:'m1',unitPrice:10}]},
  procurementOrders:{version:1,orders:[{id:'o1',total:999}]},labelReprintHistory:{version:1,revision:1,entries:[]},
  productLabels:{locale:'tr'},futureSecret:'private'});

test('owner retains detached original data while unknown stores, invalid actors and disabled users are denied', () => {
  for (const [store, value] of [['products',product()],['invoices',invoice()],['settings',settings()],['media',{id:'img',data:'image'}]]) {
    const projected = data.projectRead(actor('owner'), store, value);
    assert.deepEqual(projected, value); assert.notEqual(projected, value);
  }
  assert.deepEqual(data.projectRead(actor('owner'), 'unknown', [invoice()]), []);
  assert.equal(data.projectRead(actor('owner'), 'unknown', invoice()), undefined);
  for (const account of [null,actor('custom'),actor('sales', undefined, {status:'disabled'}),actor('unknown')]) {
    assert.deepEqual(data.projectRead(account, 'invoices', [invoice()]), []);
    denied(() => data.validateWrite(account, {store:'products',value:product()}, undefined, product()));
  }
});

test('workshop projections retain physical label and manufacturing sources while removing all nested money', () => {
  const source = manufacturing.merge(invoice(), {kind:'create',id:'i1',ticketId:'ticket',at});
  source.manufacturingTicket.lines[0].item.costing = {secret:40};
  source.manufacturingTicket.lines[0].futurePrice = 200;
  const before = structuredClone(source);
  const result = data.projectRead(actor('assembly'), 'invoices', source);
  assert.equal(result.id, 'i1'); assert.equal(result.invNo, 'A-5000'); assert.equal(result.companyName, 'Customer name');
  assert.equal(result.items[0].image, 'wfmedia:picture');
  assert.equal(result.items[0].productSnapshot.image, '');
  assert.equal(result.packageLabelSnapshot.customerLogo, null);
  assert.equal(result.packageLabelSnapshot.companyLogo, 'wfmedia:old-company-logo');
  assert.equal(manufacturing.isTicket(result.manufacturingTicket), true);
  for (const text of ['grandTotal','remainingUSD','depositUSD','payments','priceUSD','priceA','priceB','costing','costSnapshot','futureSecret','futurePrice','futurePrivateData','bankAccount']) {
    assert(!JSON.stringify(result).includes('"' + text + '"'), text);
  }
  assert.deepEqual(source, before);
  result.items[0].dims[0].l = 5; assert.equal(source.items[0].dims[0].l, 60);
});

test('projected saved images and explicit empty snapshots keep label source precedence intact', () => {
  const source = invoice();
  source.items[0].image = '';
  source.items[0].productSnapshot.image = 'https://example.test/old.png';
  const projected = data.projectRead(actor('assembly'), 'invoices', source);
  const catalog = data.projectRead(actor('assembly'), 'products', [{...product(),image:'https://example.test/new.png'}]);
  const normalized = labels.normalizeInvoice(projected, {products:catalog});
  assert.equal(normalized.items[0].image, '');
  assert.equal(normalized.items[0].qty, 3);
  assert.equal(normalized.items[0].packets, 2);
  assert.equal(labels.inspectLabelBatch(normalized).totalLabels, 6);
});

test('financial workspace access does not imply access to costing or unrelated current customer contacts', () => {
  const sales = data.projectRead(actor('sales'), 'invoices', invoice());
  assert.equal(sales.grandTotal, 360); assert.equal(sales.items[0].priceUSD, 120);
  assert.equal(sales.items[0].costSnapshot, undefined); assert.equal(sales.items[0].costing, undefined);
  assert.equal(sales.items[0].productSnapshot.costing, undefined);
  const company = {id:'c1',name:'Name',logo:'logo',phone:'sensitive phone',email:'sensitive email',website:'private'};
  assert.deepEqual(data.projectRead(custom('payments.view'), 'companies', company), {id:'c1',name:'Name',logo:'logo'});
  assert.deepEqual(data.projectRead(actor('assembly'), 'companies', [company]), []);
  assert.equal(data.projectRead(actor('sales'), 'companies', company).phone, 'sensitive phone');
  assert.equal(data.projectRead(custom('costs.view'), 'invoices', invoice()).items[0].costSnapshot.unitCostUSD, 40);
  assert.deepEqual(data.projectRead(custom('invoices.view'), 'payments', [{id:'pay',amount:200}]), []);
  assert.equal(data.projectRead(custom('reports.view'), 'payments', {id:'pay',amount:200}).amount, 200);
});

test('search and review do not unlock money, and read denial preserves array and missing-row shapes', () => {
  assert.deepEqual(data.projectRead(custom('search.view'), 'invoices', [invoice()]), []);
  assert.deepEqual(data.projectRead(custom('search.view'), 'products', [product()]), []);
  assert.equal(data.projectRead(custom('review.view'), 'invoices', invoice()).grandTotal, undefined);
  assert.equal(data.projectRead(actor('assembly'), 'products', product()).priceUSD, undefined);
  assert.equal(data.projectRead(actor('sales'), 'products', product()).priceUSD, 120);
  assert.equal(data.projectRead(actor('assembly'), 'payments', {id:'pay'}), undefined);
  assert.equal(data.projectRead(actor('assembly'), 'invoices', undefined), undefined);
});

test('staff settings preserve application identity and only readable module-owned sections', () => {
  const source = settings(), result = data.projectRead(actor('assembly'), 'settings', source);
  assert.equal(result.companyName, 'WOW'); assert.equal(result.appIdentity.name, 'My WOW'); assert.equal(result.appIdentity.logo, 'wfmedia:app-logo');
  assert.equal(result.branding.logoShape, 'circle'); assert.equal(result.appIdentity.secret, undefined); assert.equal(result.branding.bank, undefined);
  assert.deepEqual(result.dailyTasks, source.dailyTasks); assert.deepEqual(result.labelReprintHistory, source.labelReprintHistory);
  for (const key of ['bankName','ibanUSD','beneficiary','swift','accountNo','manualUsdTry','kdvRate','materialLibrary','procurementOrders','futureSecret']) assert.equal(result[key], undefined, key);
  assert.equal(data.projectRead(actor('manager'), 'settings', source).ibanUSD, 'private');
  assert.equal(data.projectRead(actor('sales'), 'settings', source).nextNoExt, 5000);
  assert.equal(data.projectRead(custom('materials.view'), 'settings', source).materialLibrary.materials[0].unitPrice, 10);
  assert.equal(data.projectRead(actor('assembly'), 'settings', {id:'usdTry',value:33}), undefined);
  assert.equal(data.projectRead(actor('sales'), 'settings', {id:'usdTry',value:33}).value, 33);
  assert.equal(data.projectRead(actor('sales'), 'settings', {id:'unexpected',token:'secret'}), undefined);
});

test('preflights allow the owning edit capability but final checks enforce row identity and unknown operation denial', () => {
  assert.equal(data.validateWrite(actor('sales'), {store:'invoices',value:invoice()}, undefined, invoice()), true);
  assert.equal(data.validateWrite(custom('products.view','products.edit'), {store:'products'}, undefined, product()), true);
  denied(() => data.validateWrite(actor('sales'), {store:'products'}, undefined, product()));
  denied(() => data.validateWrite(actor('sales'), {store:'invoices',type:'clear'}, undefined, invoice()));
  denied(() => data.validateWrite(actor('owner'), {store:'accounts'}, undefined, {id:'x'}));
  denied(() => data.validateWrite(actor('sales'), {store:'invoices',type:'merge',id:'i1'}, invoice(), {...invoice(),id:'other'}));
  denied(() => data.validateWrite(actor('assembly'), {store:'media'}, null, {id:'logo',data:'changed'}));
});

test('manufacturing can commit real ticket changes but cannot alter invoices or create financial rows', () => {
  const before = invoice(), operation = {store:'invoices',type:'merge',id:'i1'};
  const next = manufacturing.merge(before, {kind:'create',id:'i1',ticketId:'ticket',at});
  assert.equal(data.validateWrite(actor('carpentry'), operation, before, next), true);
  const updated = manufacturing.merge(next, {kind:'update',id:'i1',ticketId:'ticket',lineId:'line-1',base:{status:'pending',note:''},changes:{status:'in_progress',note:'Ready for assembly'},at});
  assert.equal(data.validateWrite(actor('carpentry'), operation, next, updated), true);
  for (const patch of [{grandTotal:1},{companyName:'Changed customer'},{updatedAt:at},{items:[]}]) denied(() => data.validateWrite(actor('carpentry'), operation, next, {...updated,...patch}));
  denied(() => data.validateWrite(actor('carpentry'), operation, null, next));
  denied(() => data.validateWrite(custom('manufacturing.view'), operation, before, next));
  denied(() => data.validateWrite(actor('sales'), operation, before, next));
});

test('settings merges authorize actual changed fields and reject spoofed permission or mixed module writes', () => {
  const before = settings(), op = {store:'settings',type:'merge',id:'main',permission:'tasks.edit'};
  const intent = {type:'create',task:{id:'t1',title:'Check labels',priority:'normal',dueDate:'',status:'open'},at};
  const next = tasks.mergeChange(before, intent);
  assert.equal(data.validateWrite(actor('assembly'), {...op,value:intent}, before, next), true);
  denied(() => data.validateWrite(actor('assembly'), op, before, {...next,ibanUSD:'changed'}));
  denied(() => data.validateWrite(actor('assembly'), op, before, {...next,procurementOrders:{version:1,orders:[]}}));
  denied(() => data.validateWrite(actor('assembly'), {...op,type:'put'}, before, next));
  denied(() => data.validateWrite(custom('tasks.view'), op, before, next));
  const material = {...before,materialLibrary:{version:1,materials:[]}};
  assert.equal(data.validateWrite(custom('materials.view','materials.edit'), op, before, material), true);
});

test('task deletion requires delete even when intent lies, without preventing a delete-only account', () => {
  const before = tasks.mergeChange(settings(), {type:'create',task:{id:'t1',title:'Check labels',priority:'normal',dueDate:'',status:'open'},at});
  const next = tasks.mergeChange(before, {type:'delete',id:'t1',expectedRevision:1,at});
  const op = {store:'settings',type:'merge',id:'main',value:{type:'update'}};
  denied(() => data.validateWrite(actor('assembly'), op, before, next));
  assert.equal(data.validateWrite(custom('tasks.view','tasks.delete'), op, before, next), true);
  denied(() => data.validateWrite(custom('tasks.view','tasks.delete'), op, settings(), before));
});

test('print preferences and reprint bookkeeping cannot grant arbitrary settings edits', () => {
  const before = settings(), op = {store:'settings',type:'merge',id:'main'};
  const productPrint = {...before,productLabels:{locale:'fr'}};
  assert.equal(data.validateWrite(actor('sales'), op, before, productPrint), true);
  denied(() => data.validateWrite(custom('products.view'), op, before, productPrint));
  denied(() => data.validateWrite(actor('sales'), op, before, {...before,productLabels:{locale:'fr',bank:'hidden'}}));
  denied(() => data.validateWrite(actor('sales'), op, before, {...before,productLabels:{locale:'unknown'}}));
  const history = {...before,labelReprintHistory:{version:1,revision:2,entries:[]}};
  assert.equal(data.validateWrite(actor('assembly'), op, before, history), true);
  assert.equal(data.validateWrite(custom('history.view','history.edit'), op, before, history), true);
  denied(() => data.validateWrite(custom('history.view'), op, before, history));
});

test('invoice numbering permits one increment while prefixes, bank fields and rate changes remain owner-only', () => {
  const before = settings(), op = {store:'settings'};
  assert.equal(data.validateWrite(actor('sales'), op, before, {...before,nextNoExt:5001}), true);
  for (const patch of [{nextNoExt:6000},{nextNoExt:4999},{prefixExt:'OTHER'},{bankName:'Changed'},{manualUsdTry:1}]) denied(() => data.validateWrite(actor('sales'), op, before, {...before,...patch}));
  denied(() => data.validateWrite(actor('assembly'), op, before, {...before,nextNoExt:5001}));
  assert.equal(data.validateWrite(actor('sales'), {store:'settings'}, {id:'nextInvNo',value:5001}, {id:'nextInvNo',value:5002}), true);
  denied(() => data.validateWrite(actor('sales'), op, {id:'usdTry',value:33}, {id:'usdTry',value:1}));
});

test('product costing has its own write capability and cannot change product prices', () => {
  const before = product(), next = {...before,costing:{unitCostUSD:50}}, op = {store:'products',type:'merge',id:'p1'};
  assert.equal(data.validateWrite(custom('costs.view','costs.edit'), op, before, next), true);
  denied(() => data.validateWrite(custom('products.view','products.edit'), op, before, next));
  denied(() => data.validateWrite(custom('costs.view','costs.edit'), op, before, {...next,priceUSD:1}));
  denied(() => data.validateWrite(custom('costs.view','costs.edit'), op, null, next));
});

test('preservation keeps hidden product costs and invoice snapshots across edits and reordered lines', () => {
  const account = custom('products.view','products.edit','invoices.view','invoices.edit');
  const beforeProduct = product();
  const visibleProduct = data.projectRead(account, 'products', beforeProduct); visibleProduct.name = 'Changed name';
  const savedProduct = data.preserveRestrictedFields(account, 'products', beforeProduct, visibleProduct);
  assert.deepEqual(savedProduct.costing, beforeProduct.costing); assert.equal(savedProduct.name, 'Changed name');
  assert.equal(data.validateWrite(account, {store:'products'}, beforeProduct, savedProduct), true);
  const before = invoice(); before.items.push({...product(),id:'p2',productId:'p2',name:'MODEL B',costSnapshot:{unitCostUSD:70}});
  const projected = data.projectRead(account, 'invoices', before); projected.items.reverse(); projected.items[0].qty = 6;
  const preserved = data.preserveRestrictedFields(account, 'invoices', before, projected);
  assert.equal(preserved.items[0].costSnapshot.unitCostUSD, 70); assert.equal(preserved.items[1].costSnapshot.unitCostUSD, 40);
  assert.equal(preserved.items[0].qty, 6); assert.equal(projected.items[0].costSnapshot, undefined);
  assert.equal(data.validateWrite(account, {store:'invoices'}, before, preserved), true);
  denied(() => data.validateWrite(account, {store:'invoices'}, before, projected));
  const costViewer = custom('products.view','products.edit','costs.view');
  const stale = {...beforeProduct,costing:{unitCostUSD:1}};
  assert.deepEqual(data.preserveRestrictedFields(costViewer, 'products', beforeProduct, stale).costing, beforeProduct.costing);
});

test('ambiguous historical cost matches fail closed instead of assigning another line cost', () => {
  const before = invoice();
  before.items = [{productId:'p1',name:'A',color:'Oak',costSnapshot:{unitCostUSD:20}}, {productId:'p1',name:'B',color:'Pine',costSnapshot:{unitCostUSD:60}}];
  const next = {...before,items:[{productId:'p1',name:'Renamed',color:'Black'}]};
  assert.throws(() => data.preserveRestrictedFields(actor('sales'), 'invoices', before, next), error => error.code === 'ACCESS_DENIED' && error.reason === 'AMBIGUOUS_COST_SNAPSHOT');
  const noId = {...before,items:[{name:'A',costSnapshot:{unitCostUSD:20}}]};
  denied(() => data.preserveRestrictedFields(actor('sales'), 'invoices', noId, {...noId,items:[{name:'Renamed'}]}));
});

test('archive and payment-only changes cannot be used to edit unrelated invoice totals', () => {
  const before = invoice(), op = {store:'invoices',type:'merge',id:'i1'};
  const archived = archive.mergeTransition(before, {id:'i1',action:'archive',capturedAt:at,issuerLogo:'wfmedia:logo'});
  assert.equal(data.validateWrite(custom('archives.view','archives.edit'), op, before, archived), true);
  denied(() => data.validateWrite(custom('archives.view','archives.edit'), op, before, {...archived,grandTotal:1}));
  denied(() => data.validateWrite(custom('invoices.view','invoices.edit'), op, before, archived));
  const payment = {id:'pay2',amount:20};
  const paid = {...before,payments:[...before.payments,payment],totalPaidUSD:180,remainingUSD:180};
  assert.equal(data.validateWrite(custom('payments.view','payments.edit'), {store:'invoices'}, before, paid), true);
  denied(() => data.validateWrite(custom('payments.view','payments.edit'), {store:'invoices'}, before, {...paid,grandTotal:1}));
  const removed = {...before,payments:[],totalPaidUSD:0,remainingUSD:360};
  denied(() => data.validateWrite(custom('payments.view','payments.edit'), {store:'invoices'}, before, removed));
  assert.equal(data.validateWrite(custom('payments.view','payments.delete'), {store:'invoices'}, before, removed), true);
});

test('new invoice and store deletions obey distinct action grants', () => {
  const clean = invoice(); clean.items = [{productId:'p1',name:'A',qty:1,costSnapshot:null}]; clean.payments = [];
  assert.equal(data.validateWrite(actor('sales'), {store:'invoices'}, null, clean), true);
  denied(() => data.validateWrite(actor('sales'), {store:'invoices',type:'delete',id:'i1'}, invoice(), undefined));
  assert.equal(data.validateWrite(actor('manager'), {store:'invoices',type:'delete',id:'i1'}, invoice(), undefined), true);
  denied(() => data.validateWrite(actor('manager'), {store:'settings',type:'delete',id:'main'}, settings(), undefined));
  denied(() => data.validateWrite(actor('sales'), {store:'invoices'}, null, {...clean,items:[{productId:'p1',costSnapshot:{unitCostUSD:999}}]}));
});

test('structural equality ignores key ordering but preserves absent fields and browser UMD isolation', () => {
  assert.equal(data.sameJSON({a:1,b:{x:2,y:3}}, {b:{y:3,x:2},a:1}), true);
  assert.equal(data.sameJSON({}, {a:undefined}), false);
  assert.equal(data.sameJSON({a:[1,2]}, {a:[2,1]}), false);
  const context = vm.createContext({});
  for (const file of ['accounts-policy.js','accounts-data-policy.js']) vm.runInContext(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), context);
  assert(Object.isFrozen(context.WFAccountDataPolicy));
  assert.equal(context.WFAccountDataPolicy.projectRead({role:'owner',status:'active'}, 'products', {id:'p1',price:9}).price, 9);
});

test('actual cashbox entries use payment view/edit/delete grants and reject fields outside their schema', async () => {
  const {makeEntry} = await import('../cashboxes.mjs');
  const entry = makeEntry({currency:'USD',type:'transfer',amount:'15.50',target:'TRY',received:'500',note:'Transfer'}, 'cash-1', at);
  assert.deepEqual(data.projectRead(custom('payments.view'), 'settings', entry), entry);
  assert.equal(data.projectRead(actor('assembly'), 'settings', entry), undefined);
  assert.equal(data.validateWrite(actor('sales'), {store:'settings'}, null, entry), true);
  assert.equal(data.validateWrite(actor('sales'), {store:'settings'}, undefined, entry), true);
  denied(() => data.validateWrite(custom('payments.view'), {store:'settings'}, null, entry));
  denied(() => data.validateWrite(actor('sales'), {store:'settings'}, null, {...entry,bankName:'changed'}));
  denied(() => data.validateWrite(actor('sales'), {store:'settings'}, null, {...entry,legs:[{currency:'USD',units:1550},{currency:'TRY',units:50000}]}));
  denied(() => data.validateWrite(actor('sales'), {store:'settings',type:'delete',id:entry.id}, entry));
  assert.equal(data.validateWrite(custom('payments.view','payments.delete'), {store:'settings',type:'delete',id:entry.id}, entry), true);
});

test('document print/export permits payment coordinates without granting company settings access', () => {
  const source = settings();
  for (const section of ['invoices','payments']) {
    assert.equal(data.projectRead(custom(section + '.view'), 'settings', source).ibanUSD, undefined);
    for (const action of ['print','export']) {
      const account = custom(section + '.view', section + '.' + action);
      const projected = data.projectRead(account, 'settings', source);
      assert.equal(projected.bankName, source.bankName); assert.equal(projected.ibanUSD, source.ibanUSD);
      assert.equal(policy.can(account, 'settings.view'), false);
      assert.equal(policy.can(account, 'settings.edit'), false);
      denied(() => data.validateWrite(account, {store:'settings',type:'merge',id:'main'}, source, {...source,ibanUSD:'changed'}));
    }
  }
  for (const role of ['carpentry','assembly','warehouse']) assert.equal(data.projectRead(actor(role), 'settings', source).ibanUSD, undefined);
});

test('trusted new invoice cost capture uses the raw catalog while the staff result still hides costs', () => {
  const account = actor('sales'), rawProducts = [{id:'p1',costing:{currency:'USD',unitCostUSD:40,rates:{usdTry:33}}}];
  const candidate = {id:'new',createdAt:at,items:[{productId:'p1',name:'A',qty:3,priceUSD:120,costSnapshot:null}],payments:[]};
  const before = structuredClone(candidate), catalogBefore = structuredClone(rawProducts);
  assert.equal(data.validateWrite(account, {store:'invoices'}, null, candidate), true);
  const captured = data.captureTrustedInvoiceCosts(account, null, candidate, rawProducts, costCore, at);
  assert.equal(captured.items[0].costSnapshot.unitCostUSD, 40);
  assert.equal(captured.items[0].costSnapshot.capturedAt, at);
  assert.equal(data.projectRead(account, 'invoices', captured).items[0].costSnapshot, undefined);
  assert.deepEqual(candidate, before); assert.deepEqual(rawProducts, catalogBefore);
  denied(() => data.validateWrite(account, {store:'invoices'}, null, {...candidate,items:[{...candidate.items[0],costSnapshot:{unitCostUSD:1}}]}));
});

test('trusted capture preserves existing known and explicit unknown costs and prices only uncaptured lines', () => {
  const account = actor('sales'), latest = {id:'i1',items:[
    {productId:'p1',name:'A',costSnapshot:{version:1,unitCostUSD:10,capturedAt:'2025-01-01'}},
    {productId:'p2',name:'B',costSnapshot:null},
    {productId:'p3',name:'C'}
  ]};
  const candidate = {id:'i1',updatedAt:at,items:[
    {productId:'p2',name:'B',costSnapshot:null},
    {productId:'p1',name:'Renamed A',costSnapshot:null},
    {productId:'p3',name:'C',costSnapshot:null},
    {productId:'p4',name:'D',costSnapshot:null}
  ]};
  const raw = ['p1','p2','p3','p4'].map((id,index) => ({id,costing:{currency:'USD',unitCostUSD:(index+1)*100}}));
  const captured = data.captureTrustedInvoiceCosts(account, latest, candidate, raw, costCore);
  assert.equal(captured.items[0].costSnapshot, null);
  assert.deepEqual(captured.items[1].costSnapshot, latest.items[0].costSnapshot);
  assert.equal(captured.items[2].costSnapshot.unitCostUSD, 300);
  assert.equal(captured.items[3].costSnapshot.unitCostUSD, 400);
  assert.equal(captured.items[3].costSnapshot.capturedAt, at);
});

test('trusted cost capture leaves owner/cost viewers and non-invoice writers unchanged and rejects ambiguity', () => {
  const candidate = {id:'i1',items:[{productId:'p1',name:'New variant',costSnapshot:null}]};
  for (const account of [actor('owner'),actor('manager'),actor('assembly'),custom('invoices.view','invoices.edit','costs.view')])
    assert.equal(data.captureTrustedInvoiceCosts(account, null, candidate, null, null), candidate);
  const latest = {id:'i1',items:[
    {productId:'p1',name:'A',color:'Oak',costSnapshot:{unitCostUSD:10}},
    {productId:'p1',name:'B',color:'Pine',costSnapshot:{unitCostUSD:20}}
  ]};
  assert.throws(() => data.captureTrustedInvoiceCosts(actor('sales'), latest, candidate, [], costCore, at), error => error.code === 'ACCESS_DENIED' && error.reason === 'AMBIGUOUS_COST_SNAPSHOT');
  denied(() => data.captureTrustedInvoiceCosts(actor('sales'), null, candidate, null, costCore, at));
});
