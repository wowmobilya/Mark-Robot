const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const helpers=require('../product-labels.js');
const scope={window:{}};vm.createContext(scope);vm.runInContext(fs.readFileSync(require.resolve('../vendor/JsBarcode.code128.min.js'),'utf8'),scope);
const encoder=scope.window.JsBarcode;
test('barcode plan keeps real payload and adequate quiet zones instead of compressing dense symbols',()=>{
 const short=helpers.barcodePlan('W400',encoder);
 assert.equal(short.kind,'code128');assert.equal(short.value,'W400');assert.equal(short.quiet,10);
 assert(short.widthMm/(short.modules+20)>=.25);assert(short.widthMm<=86);
 assert.equal(helpers.barcodePlan('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',encoder).kind,'qr');
 assert.equal(helpers.barcodePlan('طاولة ٤٠٠',encoder).kind,'qr');
 assert.equal(helpers.barcodePlan('123456789012345678901234567890',encoder).kind,'code128');
 assert.equal(helpers.barcodePlan('',encoder).kind,'missing');
});
test('image source rejects active and unresolved media schemes and preserves valid images',()=>{
 const base='https://example.test/app/';
 assert.equal(helpers.safeImageSource('javascript:alert(1)',base),'');
 assert.equal(helpers.safeImageSource('wfmedia:abc',base),'');
 assert.equal(helpers.safeImageSource('data:text/html,evil',base),'');
 assert.equal(helpers.safeImageSource('data:image/png;base64,AA==',base),'data:image/png;base64,AA==');
 assert.equal(helpers.safeImageSource('assets/photo.png',base),'https://example.test/app/assets/photo.png');
});
test('print snapshots never substitute a missing product and remain independent of later edits',()=>{
 const source=[{id:1,name:'W400',dims:[{l:60,w:40,h:50}]},{id:'2',name:'W500'}];
 const selected=helpers.captureSelection(source,['2','1','1']);
 assert.deepEqual(selected.map(p=>p.id),['2',1]);
 source[0].name='changed';source[0].dims[0].l=999;
 assert.equal(selected[1].name,'W400');assert.equal(selected[1].dims[0].l,60);
 assert.throws(()=>helpers.captureSelection(source,['gone']),/MISSING_PRODUCT/);
 assert.deepEqual(helpers.captureSelection(source,[]),[]);
});
test('locale preference merges only its own settings, including concurrent company edits',async()=>{
 const state={settings:{companyName:'New name',other:2}};
 const stored={id:'main',companyName:'Saved name',productLabels:{future:7}};
 await helpers.persistLocale(state,'fr',async operations=>{
  assert.equal(operations[0].store,'settings');assert.equal(operations[0].id,'main');
  const merged=operations[0].merge(stored,operations[0].value);
  assert.equal(merged.companyName,'Saved name');assert.equal(merged.productLabels.future,7);
  state.settings.companyName='Concurrent change';return [merged];
 });
 assert.equal(state.settings.companyName,'Concurrent change');
 assert.deepEqual(state.settings.productLabels,{future:7,locale:'fr'});
 await assert.rejects(()=>helpers.persistLocale(state,'zz',async()=>[]),/INVALID_LOCALE/);
});
test('failed preference write keeps saved settings intact',async()=>{
 const state={settings:{productLabels:{locale:'ar'}}};
 await assert.rejects(()=>helpers.persistLocale(state,'tr',async()=>{throw new Error('disk full')}),/disk full/);
 assert.equal(state.settings.productLabels.locale,'ar');
});
test('image readiness distinguishes intentional readiness, broken images and slow loads',async()=>{
 const good=new EventTarget();Object.assign(good,{complete:true,naturalWidth:20,naturalHeight:20});
 await helpers.waitForImage(good,30);
 const broken=new EventTarget();Object.assign(broken,{complete:true,naturalWidth:0,naturalHeight:0});
 await assert.rejects(()=>helpers.waitForImage(broken,30),/IMAGE_LOAD/);
 const slow=new EventTarget();Object.assign(slow,{complete:false,naturalWidth:0,naturalHeight:0});
 const task=helpers.waitForImage(slow,100);slow.naturalWidth=10;slow.naturalHeight=20;slow.dispatchEvent(new Event('load'));await task;
 const stuck=new EventTarget();Object.assign(stuck,{complete:false});
 await assert.rejects(()=>helpers.waitForImage(stuck,5),/IMAGE_TIMEOUT/);
});
test('asset timeout never silently prints before fonts or styles are ready',async()=>{
 assert.equal(await helpers.withTimeout(Promise.resolve('ready'),20,'FONT_TIMEOUT'),'ready');
 await assert.rejects(()=>helpers.withTimeout(new Promise(()=>{}),5,'FONT_TIMEOUT'),/FONT_TIMEOUT/);
});

