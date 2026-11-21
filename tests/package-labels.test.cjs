'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), vm = require('node:vm');
let helpers;
try { helpers = require('../package-labels.js'); } catch (_) { helpers = {}; }
const scope = {window:{}};
vm.createContext(scope);
vm.runInContext(fs.readFileSync(require.resolve('../vendor/JsBarcode.code128.min.js'), 'utf8'), scope);

test('local package barcode encodes the complete original payload without network fallback', () => {
  assert.equal(typeof helpers.barcodeBits, 'function');
  const result = helpers.barcodeBits('W400 - Packet 1/2', scope.window.JsBarcode);
  assert.equal(result.value, 'W400 - Packet 1/2');
  assert.match(result.bits, /^[01]+$/);
  assert(result.bits.length > 100);
  assert.equal(result.quiet, 10);
  assert.throws(() => helpers.barcodeBits('طاولة - Packet 1/2', scope.window.JsBarcode), /BARCODE/);
});

test('invoice label identity uses the saved issuer and customer even after branding changes', () => {
  assert.equal(typeof helpers.resolveInvoiceSource, 'function');
  const invoice = {id:'i1', companyLogo:'old-customer.png', items:[{name:'W400', qty:1, packets:1}], packageLabelSnapshot:{companyLogo:'old-issuer.png',customerLogo:'archived-customer.png'}};
  const state = {invoices:[invoice], settings:{logo:'new-issuer.png'}};
  const result = helpers.resolveInvoiceSource(state, 'i1');
  assert.equal(result.companyLogo, 'old-issuer.png');
  assert.equal(result.invoice.companyLogo, 'archived-customer.png');
  result.invoice.items[0].name = 'temporary';
  assert.equal(invoice.items[0].name, 'W400');
  assert.throws(() => helpers.resolveInvoiceSource(state, 'missing'), /MISSING_INVOICE/);
});

test('explicit blank snapshotted logos are not filled from current company settings', () => {
  const invoice = {id:'i1',companyLogo:'new-customer.png',items:[],packageLabelSnapshot:{companyLogo:'',customerLogo:null}};
  const result = helpers.resolveInvoiceSource({invoices:[invoice],settings:{logo:'new.png'}}, 'i1');
  assert.equal(result.companyLogo, '');
  assert.equal(result.invoice.companyLogo, null);
});

test('print readiness waits for image decode and rejects a failed or stalled asset', async () => {
  assert.equal(typeof helpers.waitForImage, 'function');
  let resolveDecode, decoded = false;
  const image = new EventTarget();
  Object.assign(image, {complete:true,naturalWidth:30,naturalHeight:20,decode:() => new Promise(resolve => {resolveDecode = () => {decoded=true;resolve();};})});
  const pending = helpers.waitForImage(image, 100);
  await Promise.resolve();
  assert.equal(decoded, false);
  resolveDecode(); await pending;
  const bad = new EventTarget(); Object.assign(bad,{complete:true,naturalWidth:0,naturalHeight:0});
  await assert.rejects(() => helpers.waitForImage(bad, 20), /IMAGE_LOAD/);
  const stalled = new EventTarget(); Object.assign(stalled,{complete:false});
  await assert.rejects(() => helpers.waitForImage(stalled, 5), /IMAGE_TIMEOUT/);
});

test('identity snapshot captures only once and never mutates the source invoice', () => {
  assert.equal(typeof helpers.captureIdentity, 'function');
  const invoice = {id:'i1',companyLogo:'customer.png',items:[{name:'W400'}]};
  const saved = helpers.captureIdentity(invoice, 'issuer.png', '2026-11-21T00:00:00.000Z');
  assert.equal(invoice.packageLabelSnapshot, undefined);
  assert.equal(saved.packageLabelSnapshot.companyLogo, 'issuer.png');
  assert.equal(helpers.captureIdentity(saved, 'different.png').packageLabelSnapshot.companyLogo, 'issuer.png');
  const unknown={...invoice,packageLabelSnapshot:null};
  assert.equal(helpers.captureIdentity(unknown,'new.png').packageLabelSnapshot,null);
  assert.equal(helpers.resolveInvoiceSource({invoices:[unknown],settings:{logo:'new.png'}},'i1').companyLogo,'');
});

test('paper choice defaults to four labels, remembers a valid device preference, and recovers from unavailable storage', () => {
  const core=require('../package-label-core.js'),values=new Map();
  const storage={getItem:key=>values.get(key),setItem:(key,value)=>values.set(key,value)};
  assert.equal(helpers.readProfilePreference(storage,core),'tw2004');
  assert.equal(helpers.writeProfilePreference(storage,'tw2008',core),true);
  assert.equal(helpers.readProfilePreference(storage,core),'tw2008');
  assert.equal(helpers.writeProfilePreference(storage,'unknown',core),false);
  assert.equal(helpers.writeProfilePreference(storage,'constructor',core),false);
  assert.equal(helpers.readProfilePreference(storage,core),'tw2008');
  values.set('wf_package_label_profile_v1','retired-profile');
  assert.equal(helpers.readProfilePreference(storage,core),'tw2004');
  values.set('wf_package_label_profile_v1','__proto__');
  assert.equal(helpers.readProfilePreference(storage,core),'tw2004');
  const blocked={getItem(){throw new Error('blocked');},setItem(){throw new Error('full');}};
  assert.equal(helpers.readProfilePreference(blocked,core),'tw2004');
  assert.equal(helpers.writeProfilePreference(blocked,'tw2008',core),false);
});

test('orientation shortcuts pair every stock without crossing Tanex products or duplicating the square',()=>{
  const core=require('../package-label-core.js');
  const pairs=[['tw2004','tw2004Landscape'],['tw2008','tw2008Landscape'],['zebra100x150','zebra150x100'],['thermal80x100','thermal100x80'],['thermal70x100','thermal100x70'],['thermal100x200','thermal200x100'],['thermal50x100','thermal100x50'],['thermal80x500','thermal500x80']];
  for(const [portrait,landscape] of pairs){
    assert.deepEqual(helpers.orientationChoices(core,portrait),{portrait,landscape});
    assert.deepEqual(helpers.orientationChoices(core,landscape),{portrait,landscape});
  }
  assert.deepEqual(helpers.orientationChoices(core,'thermal100x100'),{square:'thermal100x100'});
  assert.deepEqual(helpers.orientationChoices(core,'constructor'),{});
});
