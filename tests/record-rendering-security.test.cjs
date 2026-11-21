'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const acorn = require('acorn');
const walk = require('acorn-walk');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const functions = new Map();
for (const match of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)) {
  if (!match[1].trim()) continue;
  let tree;
  try { tree = acorn.parse(match[1], {ecmaVersion:'latest'}); } catch { continue; }
  walk.simple(tree, {FunctionDeclaration(node) {functions.set(node.id.name, match[1].slice(node.start, node.end));}});
}
const markup = '<img data-wf-xss="yes" src=x onerror="globalThis.__wfXss=1"><script>globalThis.__wfXss=1</script>';
const imageAttack = 'x" onerror="globalThis.__wfXss=1" data-wf-xss="yes';
const quotedId = `a' );globalThis.__wfXss=1;//"<&`;
const goodImage = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB';
const decode = value => value.replace(/&(quot|apos|amp|lt|gt|#\d+|#x[\da-f]+);/gi, (_, code) => ({quot:'"',apos:"'",amp:'&',lt:'<',gt:'>'}[code] ?? String.fromCodePoint(code[1].toLowerCase()==='x'?parseInt(code.slice(2),16):parseInt(code.slice(1),10))));
// A boundary parser, not an HTML sanitizer: preserve quoted attributes while
// distinguishing escaped text from elements/handlers actually created by HTML.
function tags(source) {
  return Array.from(source.matchAll(/<([a-z][\w:-]*)\b((?:"[^"]*"|'[^']*'|[^'">])*)>/gi), match => {
    const attrs = {};
    for (const attr of match[2].matchAll(/([^\s=/'">]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g)) attrs[attr[1].toLowerCase()] = decode(attr[2] ?? attr[3] ?? attr[4] ?? '');
    return {name:match[1].toLowerCase(),attrs};
  });
}
function inert(source) {
  for (const tag of tags(source)) {
    assert.notEqual(tag.name, 'script', 'saved text must not create scripts');
    assert.ok(!Object.hasOwn(tag.attrs, 'data-wf-xss'), 'saved text must not create injected elements or attributes');
    assert.ok(!Object.hasOwn(tag.attrs, 'onerror'), 'image fields must not create event handlers');
  }
}
function node() {
  return {innerHTML:'',value:'',textContent:'',style:{},dataset:{},children:[],appendChild(child){this.children.push(child);},classList:{add(){},remove(){},toggle(){}},addEventListener(){},before(){},querySelector(){return null;},querySelectorAll(){return [];}};
}
function fixture(names, state = {}) {
  const nodes = new Map();
  const get = id => {if(!nodes.has(id))nodes.set(id,node());return nodes.get(id);};
  const words = new Proxy({}, {get:(_,key)=>key==='type_labels'?{}:String(key)});
  const context = vm.createContext({console, URL, Intl, structuredClone,
    document:{getElementById:get,querySelectorAll:()=>[],createElement:node},
    S:{lang:'en',companies:[],products:[],invoices:[],payments:[],settings:{},coTabFilter:'all',prTabFilter:'all',invTabFilter:'all',invType:'external',invTier:'A',invCurrency:'USD',usdTry:40,usdEur:.92,...state},
    TYPE_ICONS:{other:'📦'},COUNTRY_NAMES:{},PAY_METHOD_LABELS:{en:{}},RECEIPT_TYPE_LABELS:{en:{}},QBL_TEXTS:{en:words,ar:words},QBL_CART_TEXTS:{en:words,ar:words},DIM_TEXTS:{en:words,ar:words},PR_DIM_LABELS:{en:words},QBL:{pendingQty:1},QBL_CART:{items:[]},PDF_TR:{en:words,ar:words,tr:words,fr:words,ru:words},FURNITURE_COLORS:{en:[]},DESC_DATA:{en:[]},
    DEFAULT_WOW_LOGO:goodImage,DEFAULT_COMPANY_PLACEHOLDER:goodImage,WF_CURRENCY_NUMBER_FORMAT:new Intl.NumberFormat('en-US',{minimumFractionDigits:2,maximumFractionDigits:2}),
    usdToTry:value=>Number(value)*40,usdToEur:value=>Number(value)*.92,t:key=>key,wfUiText:value=>value,wfCancelPendingRender(){},wfBuildClientFinancialIndex:()=>new Map(),wfStatementLabel:()=> 'Statement',wfUpdateDashboardTrends(){},wfRenderDashboardIntelligence(){},getCurrentPage:()=> 'dashboard',
    wfRefreshProductUpdateNotice(){},isKnownColor:()=>false,getInvColorOptionsHTML:()=>'',qblUpdateQtyTotal(){},calcTotalCBM(){},getTierPrice:p=>Number(p.priceA||p.priceUSD||0),getDeliveryInfo:()=>null,wfProductColorLabel:value=>value,
    wfStatementInvoicePayments:inv=>inv.payments||[],wfStatementPaymentUSD:p=>Number(p.amountUSD||0),wfStatementInvoiceMoney:amount=>'$'+Number(amount).toFixed(2),
    WOWStatementCore:{paymentValue:p=>({originalAmount:Number(p.originalAmount||p.amountUSD||0),originalCurrency:p.originalCurrency||'USD'})},
    wfInvoiceOrderDate:inv=>inv.date||'',wfPdfUpperText:value=>String(value??'').toUpperCase(),wfPdfUpperHTML:value=>value,wfPdfMeasure:value=>String(Number(value)||0),wfLocalizeInvoiceNotes:value=>String(value||''),numberToWords:()=> 'One hundred',renderQrHtmlSync:()=>'',
    event:{stopPropagation(){}},__wfXss:0
  });
  context.window=context;
  for (const name of ['wfEsc','wfJsArg','wfImageSource','normalizeImageSrc','wfCompanyLogo','renderSafeImg','wfRecordAttribute','symOf','usdToTry','usdToEur','toDisplayAmt','fmtCurr',...names]) {
    if(functions.has(name))vm.runInContext(functions.get(name),context);
  }
  return {context,nodes,get,run:(source)=>vm.runInContext(source,context)};
}
function handlerRoundTrip(f, source, fn, expected) {
  const tag = tags(source).find(tag=>tag.attrs.onclick?.includes(fn+'('));
  assert.ok(tag, fn+' action exists');
  let args;
  f.context[fn]=(...actual)=>{args=actual;};
  f.run(tag.attrs.onclick);
  assert.equal(f.context.__wfXss,0,'saved IDs do not execute code');
  assert.equal(args[0],expected,'action receives the exact original ID and type');
}

test('customer cards render saved HTML as text and preserve quoted and numeric action IDs', () => {
  for(const id of [quotedId,42]) {
    const f=fixture(['renderCo'],{companies:[{id,name:markup,buyerName:markup,phone:markup,email:markup,website:markup,city:markup,type:'external',logo:imageAttack}]});
    f.run('renderCo()');const out=f.get('coGrid').innerHTML;inert(out);handlerRoundTrip(f,out,'editCo',id);
    assert.ok(out.includes('&lt;img'),'literal customer text remains visible');
  }
});
test('unknown types matching Object prototype names use safe customer/invoice fallbacks', () => {
  for(const type of ['constructor','__proto__','toString','custom-type']) {
    const f=fixture(['renderCo','renderInvList'],{companies:[{id:'c',name:'Customer',type}],invoices:[{id:'i',companyName:'Customer',companyType:type,grandTotal:100,items:[]}]});
    f.run('renderCo();renderInvList()');assert.ok(f.get('coGrid').innerHTML.includes('t_ext'));assert.ok(f.get('invListContainer').innerHTML.includes('t_ext'));
  }
});
test('product cards escape saved names, image attributes, colors and identifiers', () => {
  const f=fixture(['renderPr'],{products:[{id:quotedId,name:markup,image:imageAttack,type:markup,hsCode:markup,dimensions:markup,color:markup,weight:markup,packets:markup,cbm:markup,priceA:100}]});
  f.run('renderPr()');const out=f.get('prGrid').innerHTML;inert(out);handlerRoundTrip(f,out,'editPr',quotedId);
});
test('invoice cards and dashboard keep customer fields and action arguments inert', () => {
  const invoice={id:quotedId,invNo:markup,companyName:markup,companyLogo:imageAttack,grandTotal:100,currency:'USD',tier:markup,date:markup,province:markup,truck:markup,plate:markup,totalCBM:markup,totalPackets:markup,items:[]};
  const f=fixture(['renderInvList','updateDash'],{invoices:[invoice]});
  f.run('renderInvList()');inert(f.get('invListContainer').innerHTML);handlerRoundTrip(f,f.get('invListContainer').innerHTML,'editInv',quotedId);
  f.run('updateDash()');inert(f.get('dashRecentInv').innerHTML);handlerRoundTrip(f,f.get('dashRecentInv').innerHTML,'previewSaved',quotedId);
});
test('customer/product selectors and highlighted quick search retain text and safe selection IDs', () => {
  const f=fixture(['populateCoSelect','renderPrSelector','qblBuildDropdown'],{companies:[{id:quotedId,name:markup,type:'external'}],products:[{id:quotedId,name:'Chair '+markup,barcode:markup,image:imageAttack,dimensions:markup,priceA:100,type:'other'}]});
  f.run('populateCoSelect()');inert(f.get('invCoSel').innerHTML);
  assert.equal(tags(f.get('invCoSel').innerHTML).find(t=>t.name==='option'&&t.attrs.value)?.attrs.value,quotedId);
  f.run('renderPrSelector()');inert(f.get('prSelectorList').innerHTML);handlerRoundTrip(f,f.get('prSelectorList').innerHTML,'addItemToInv_id',quotedId);
  f.run("qblBuildDropdown('Chair','other')");inert(f.get('qblDdList').innerHTML);handlerRoundTrip(f,f.get('qblDdList').innerHTML,'qblPickFromDropdown',quotedId);
  assert.ok(tags(f.get('qblDdList').innerHTML).some(t=>t.name==='mark'),'safe search highlighting is retained');
});
test('payment history escapes notes, custom receipt labels and exact receipt/invoice IDs', () => {
  const invoice={id:quotedId,companyId:'co',companyName:markup,currency:'USD',grandTotal:100,payments:[{id:quotedId,date:markup,note:markup,receiptType:markup,amountUSD:10}]};
  const f=fixture(['renderPayHistory'],{invoices:[invoice]});
  f.context.invId=quotedId;f.run('renderPayHistory(invId)');const out=f.get('pmHistoryList').innerHTML;inert(out);handlerRoundTrip(f,out,'deletePayment',quotedId);
});
test('invoice preview escapes the original HTML before export for all five print languages', () => {
  const invoice={id:'i',invNo:markup,companyName:markup,companyLogo:imageAttack,companyType:'external',date:markup,city:markup,province:markup,country:markup,plate:markup,truck:markup,currency:'USD',grandTotal:100,subtotalUSD:100,items:[{productId:'p',name:markup,image:imageAttack,hsCode:markup,dimensions:markup,color:markup,setpcs:markup,qty:1,priceUSD:100,totalUSD:100,packets:1,weight:1,cbm:1}],payments:[{id:'pay',date:markup,note:markup,receiptType:markup,amountUSD:10,originalCurrency:markup,originalAmount:10}]};
  const original=structuredClone(invoice);
  for(const lang of ['ar','tr','en','fr','ru']) {
    const f=fixture(['buildInvoiceHTML'],{settings:{companyName:markup,phone:markup}});f.context.invoice=invoice;f.context.printLang=lang;const qr=[];f.context.renderQrHtmlSync=text=>{qr.push(text);return '';};
    const out=f.run('buildInvoiceHTML(invoice,printLang)');inert(out);assert.ok(out.includes('&lt;img')||out.includes('&lt;IMG'),'literal saved text remains printable');assert.ok(qr.some(text=>text.includes(markup)),'QR payload remains original plain text');assert.deepEqual(invoice,original,'preview does not mutate stored fields or quantities');
  }
});
test('valid multilingual names, punctuation, numeric labels and embedded product images survive rendering', () => {
  for(const name of ['طاولة & كرسي','Masa "Özel"','Table <custom>','Commode d’été','Стол №42',2026,null]) {
    const f=fixture(['renderCo','renderPr','renderPrSelector'],{companies:[{id:'c',name,type:'external',logo:goodImage}],products:[{id:'p',name,image:goodImage,type:'other',priceA:100}]});
    f.run('renderCo();renderPr();renderPrSelector()');
    for(const id of ['coGrid','prGrid','prSelectorList']) {
      const out=f.get(id).innerHTML;inert(out);assert.ok(tags(out).some(t=>t.name==='img'&&t.attrs.src===goodImage),'valid embedded image is unchanged');
      assert.ok(decode(out).includes(String(name??'')),'name is preserved as literal display text');
    }
  }
});

test('invoice line editing escapes free dimensions, custom colors and image viewer arguments', () => {
  for(const dimPieces of [null,[{l:imageAttack,w:imageAttack,h:imageAttack}]]) {
    const f=fixture(['renderInvTable'],{invItems:[{name:markup,image:imageAttack,color:imageAttack,dimensions:markup,dimPieces,qty:1,priceUSD:100,totalUSD:100,cbm:1}]});
    f.run('renderInvTable()');const out=f.get('invItemsTbody').innerHTML;inert(out);handlerRoundTrip(f,out,'openImgViewer',imageAttack);
  }
});
test('saved product dimensions remain inert in both product dimension editors', () => {
  const f=fixture(['renderDimPieces','renderPrDimRows'],{dimPieces:[{l:imageAttack,w:imageAttack,h:imageAttack,weight:imageAttack}],prDims:[{l:imageAttack,w:imageAttack,h:imageAttack}]});
  f.run('renderDimPieces();renderPrDimRows()');inert(f.get('dimPiecesContainer').innerHTML);inert(f.get('prDimRowsWrap').children[0].innerHTML);
});
test('quick product/cart views preserve numeric legacy prices and escape embedded text/images', () => {
  const product={id:'p',name:markup,image:imageAttack,type:'other',dimensions:markup,color:markup,weight:markup,cbm:markup,priceA:'125.50'};
  const f=fixture(['qblBuildResult','qblRenderCartList']);f.context.product=product;f.context.QBL_CART.items=[{product,tier:'A',qty:2}];
  f.run("qblBuildResult(product,'A');qblRenderCartList()");
  for(const id of ['qblFinalImg','qblFinalDetails','qblCartList'])inert(f.get(id).innerHTML);
  assert.ok(f.get('qblPriceRows').innerHTML.includes('125.50'));assert.ok(f.get('qblCartList').innerHTML.includes('251.00'));
});
test('image boundary preserves supported embedded/remote/local images and rejects executable nonimage schemes', () => {
  const f=fixture([]);
  for(const src of [goodImage,'data:image/svg+xml,%3Csvg%20xmlns=%22http://www.w3.org/2000/svg%22/%3E','assets/logo.svg','https://example.test/image.png?size=2&x=3','blob:https://example.test/image'])assert.equal(f.context.wfImageSource(src),src);
  for(const src of ['javascript:alert(1)','data:text/html,<script>alert(1)</script>','file:///private/file','https:\u0000//example.test'])assert.equal(f.context.wfImageSource(src,'fallback'),'fallback');
});

function backupFixture(){
  let transactions=0;
  const context=vm.createContext({WF_BACKUP_VERSION:1,WF_MEDIA_STORE:'media',WF_MEDIA_PERSISTED:new Set(),db:{transaction(){transactions++;throw new Error('must not write invalid data');}},wfDehydrateClone:value=>value});
  context.window=context;
  for(const name of ['wfValidateCartEntries','wfValidateBackup','wfReplaceStoresFromBackup'])vm.runInContext(functions.get(name),context);
  return {context,transactions:()=>transactions,valid:value=>context.wfValidateBackup(value)};
}
const backup=()=>({format:'WOW_FURNITURE_BACKUP',version:1,data:{companies:[],products:[],invoices:[],payments:[],settings:{}}});
test('backup validation rejects malformed record trees and ambiguous IDs before any restore clears data',async()=>{
  const cases=[];
  for(const [store,row] of [['companies',{id:'c',name:{bad:true}}],['products',{id:'p',image:{url:'bad'}}],['products',{id:'p',dimPieces:[null]}],['invoices',{id:'i',items:'not-an-array'}],['invoices',{id:'i',items:[{name:'Table',dimPieces:[false]}]}],['invoices',{id:'i',payments:[null]}],['payments',{id:'p',note:[]}]] ) {const b=backup();b.data[store]=[row];cases.push(b);}
  const duplicate=backup();duplicate.data.companies=[{id:1},{id:'1'}];cases.push(duplicate);
  const prototype=backup();prototype.data.settings=JSON.parse('{"__proto__":{"polluted":true}}');cases.push(prototype);
  const infinite=backup();infinite.data.products=[{id:'p',priceA:Infinity}];cases.push(infinite);
  const deep=backup();let tail=deep.data.settings;for(let n=0;n<200;n++)tail=tail.next={};cases.push(deep);
  for(const b of cases){const f=backupFixture();assert.equal(f.valid(b),false,'malformed backup must be rejected');await assert.rejects(f.context.wfReplaceStoresFromBackup(b),/Invalid backup data/);assert.equal(f.transactions(),0);}
});
test('backup validation accepts shared in-memory snapshots but rejects actual cycles',()=>{
  const b=backup();const payment={id:'p',amountUSD:10,note:'Receipt'};b.data.payments=[payment];b.data.invoices=[{id:'i',payments:[payment]}];
  const f=backupFixture();assert.equal(f.valid(b),true,'the live backup builder may share a receipt between arrays');
  b.data.settings.self=b.data.settings;assert.equal(f.valid(b),false,'a cycle cannot be exported as JSON');
});
test('backup validation accepts existing sparse records, multilingual strings, numeric IDs and null optional fields without mutation',()=>{
  const b=backup();b.data.companies=[{id:quotedId,name:'عميل <حرفي> & Özel'}];b.data.products=[{id:23,name:'Стол',dimPieces:null,image:goodImage}];b.data.invoices=[{id:'i',invNo:2026,items:[{productId:23,name:'Table',qty:2,dimPieces:[{l:'30',w:40,h:50}]}],payments:null}];b.data.settings={futureSection:{version:9,data:['kept']}};
  const before=structuredClone(b);assert.equal(backupFixture().valid(b),true);assert.deepEqual(b,before);
});
