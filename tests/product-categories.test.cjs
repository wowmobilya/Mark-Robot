const test=require('node:test'),assert=require('node:assert/strict');
const {defaults,temporaryImages,validId,cleanImage,records,label,all,validateFile,createManager}=require('../product-categories.js');
const image='data:image/webp;base64,UklGRg==';
function fixture(options={}){
 const state={settings:{companyName:'WOW',kdvRate:20,branding:{mode:'full'}},products:[{id:'p1',type:'coffee_table',name:'A',priceA:10}],invoices:[{id:'i1',items:[{type:'coffee_table',name:'A',qty:2}]}]};
 let stored=structuredClone(state.settings),written=[];
 const manager=createManager({getState:()=>state,read:async()=>structuredClone(stored),write:async value=>{if(options.fail)throw new Error('QuotaExceededError');await options.beforeCommit?.(value);stored=structuredClone(value);written.push(value);},images:{coffee_table:'assets/product-categories/coffee-table.webp'},idFactory:()=>options.id||'test_uuid'});
 return {state,manager,written,get stored(){return stored;},set stored(value){stored=value;}};
}
test('four existing category IDs and all five translations remain stable without seeding storage',()=>{
 const a=fixture();assert.deepEqual(a.manager.list().map(c=>c.id),['coffee_table','dresser','side_table','tv_table']);
 for(const category of defaults)for(const lang of ['ar','en','tr','fr','ru'])assert(category.labels[lang]);
 assert.equal(a.manager.list()[0].count,1);assert.equal(a.manager.list()[0].references,1);assert.equal(a.manager.list()[0].image,'assets/product-categories/coffee-table.webp');assert.equal(a.written.length,0);assert.equal(a.state.settings.productCategories,undefined);
});
test('temporary internet photos cover the original categories with HTTPS sources and author credits',()=>{
 assert.deepEqual(Object.keys(temporaryImages).sort(),defaults.map(category=>category.id).sort());
 for(const source of Object.values(temporaryImages)){assert.equal(cleanImage(source.url),source.url);assert(source.author);assert(source.site);assert(source.source.startsWith('https://'));}
});
test('creating a category keeps latest settings, branding, products and invoice snapshots; backup round-trip preserves image',async()=>{
 const a=fixture();a.stored={...a.stored,bankName:'Latest bank',branding:{mode:'logo'}};const products=structuredClone(a.state.products),invoices=structuredClone(a.state.invoices);
 const id=await a.manager.save({labels:{ar:'غرف نوم'},descriptions:{ar:'أثاث الغرفة'},image},'ar');assert.equal(id,'wfcat_test_uuid');assert.equal(a.written.length,1);assert.equal(a.stored.id,'main');assert.equal(a.stored.bankName,'Latest bank');assert.deepEqual(a.stored.branding,{mode:'logo'});assert.equal(a.stored.kdvRate,20);
 assert.deepEqual(a.state.products,products);assert.deepEqual(a.state.invoices,invoices);assert.equal(a.state.settings.productCategories.categories[0].image,image);
 const restored=JSON.parse(JSON.stringify(a.state.settings));const category=all(restored,a.state.products,a.state.invoices).find(c=>c.id===id);assert.equal(label(category,'en'),'غرف نوم');assert.equal(category.image,image);
});
test('editing names never changes IDs or other languages; optional descriptions can be cleared',async()=>{
 const a=fixture();await a.manager.save({id:'coffee_table',labels:{ar:'طاولات وسط'},descriptions:{ar:'الوصف'},image:''},'ar');
 let category=a.manager.list().find(c=>c.id==='coffee_table');assert.equal(label(category,'ar'),'طاولات وسط');assert.equal(label(category,'tr'),'Orta Sehpa');assert.equal(category.image,'');
 await a.manager.save({id:'coffee_table',labels:{ar:'طاولات قهوة'},descriptions:{ar:''},image:''},'ar');category=a.manager.list().find(c=>c.id==='coffee_table');assert.equal(category.id,'coffee_table');assert.equal(category.descriptions.ar,undefined);assert.equal(a.state.products[0].type,'coffee_table');
});
test('archive and reactivate preserve used categories and their product/invoice references',async()=>{
 const a=fixture();await a.manager.archive('coffee_table',true);let category=a.manager.list().find(c=>c.id==='coffee_table');assert(category.archived);assert.equal(category.count,1);assert.equal(category.references,1);assert.equal(a.state.products.length,1);assert.equal(a.state.invoices.length,1);
 await a.manager.archive('coffee_table',false);category=a.manager.list().find(c=>c.id==='coffee_table');assert.equal(category.archived,false);assert.equal(a.state.settings.productCategories.categories.length,1);
});
test('write failure does not publish staged names or images to in-memory settings',async()=>{
 const a=fixture({fail:true});const before=structuredClone(a.state);await assert.rejects(a.manager.save({labels:{en:'New'},image},'en'),/QuotaExceededError/);assert.deepEqual(a.state,before);assert.equal(a.written.length,0);assert.equal(a.manager.busy,false);
});
test('duplicate/empty names and unsafe image sources are rejected before writes',async()=>{
 const a=fixture();await assert.rejects(a.manager.save({labels:{en:'  '},image:''}),/nameRequired/);await assert.rejects(a.manager.save({labels:{en:'coffee table'},image:''}),/duplicate/);await assert.rejects(a.manager.save({labels:{en:'X'},image:'javascript:alert(1)'}),/imageURL/);await assert.rejects(a.manager.save({labels:{en:'X'},descriptions:{en:'a'.repeat(241)},image:''}),/descriptionLong/);assert.equal(a.written.length,0);
 for(const invalid of ['javascript:alert(1)','data:image/svg+xml,<svg/>','http://example.com/a.jpg','https://user:password@example.com/a.jpg','../secret.png','data:image/png;base64,'+'A'.repeat(720001)])assert.equal(cleanImage(invalid),null,invalid.slice(0,50));
 assert.equal(cleanImage('https://example.com/a.jpg'),'https://example.com/a.jpg');assert.equal(cleanImage('assets/product-categories/photo.webp'),'assets/product-categories/photo.webp');assert.equal(cleanImage(image),image);
 assert.throws(()=>validateFile({type:'image/svg+xml',size:123}),/imageType/);assert.throws(()=>validateFile({type:'image/png',size:6*1024*1024}),/imageSize/);assert.throws(()=>validateFile({type:'image/png',size:0}),/imageSize/);assert.doesNotThrow(()=>validateFile({type:'image/jpeg',size:20000}));
});
test('imported categories are normalized safely and legacy types remain visible without changing data',()=>{
 const settings={productCategories:{version:1,categories:[{id:'__proto__',name:'bad'},{id:'wfcat_a',name:'<img onerror=x>',labels:{en:'<script>x</script>'},image:'javascript:x'},{id:'wfcat_a',name:'duplicate'}]}};
 assert.equal(records(settings).length,1);assert(!validId('__proto__'));const list=all(settings,[{type:'legacy_table'},{type:'wfcat_a'}],[{items:[{type:'archive_type'}]}]);assert(list.some(c=>c.id==='legacy_table'&&c.count===1));assert(list.some(c=>c.id==='archive_type'&&c.references===1));assert.equal(list.find(c=>c.id==='wfcat_a').image,'');assert.equal(settings.productCategories.categories.length,3);
});
test('concurrent saves are guarded and data becomes visible only after commit',async()=>{
 let finish,entered;const committing=new Promise(resolve=>entered=resolve),gate=new Promise(resolve=>finish=resolve);const a=fixture({beforeCommit:async()=>{entered();await gate;}});
 const first=a.manager.save({labels:{en:'Storage'},image:''});await committing;assert.equal(a.state.settings.productCategories,undefined);await assert.rejects(a.manager.save({labels:{en:'Second'},image:''}),/busy/);finish();await first;assert.equal(a.written.length,1);assert.equal(label(a.manager.list().find(c=>c.id==='wfcat_test_uuid')),'Storage');
});

test('saved and validation statuses retranslate with severity intact, while a cleared status stays cleared',()=>{
 const fs=require('node:fs'),vm=require('node:vm'),acorn=require('acorn'),walk=require('acorn-walk');
 const source=fs.readFileSync(require.resolve('../product-categories.js'),'utf8'),ast=acorn.parse(source,{ecmaVersion:'latest'}),declarations=[],functions=[];
 // Run the actual status/draft/translation closures. Category persistence is
 // already exercised above; this isolates the missed language refresh boundary.
 walk.simple(ast,{
  VariableDeclaration(node){if(node.declarations.some(item=>['copy','t','status','editingLanguage','statusKey','statusError'].includes(item.id.name)))declarations.push(source.slice(node.start,node.end));},
  FunctionDeclaration(node){if(['announce','renderStatus','setDraft','translateSettings','refresh'].includes(node.id.name))functions.push(source.slice(node.start,node.end));}
 });
 const errors=new Set(),statusNode={textContent:'',attributes:{},classList:{toggle:(key,on)=>on?errors.add(key):errors.delete(key)},setAttribute(key,value){this.attributes[key]=value;}};
 const field=()=>({value:''}),fields={languageField:field(),nameField:field(),descriptionField:field(),urlField:field(),fileField:field()};
 const context={language:'ar',locales:['ar','en','tr','fr','ru'],statusNode,...fields,currentLanguage:()=>context.language,
  document:{querySelectorAll:()=>[],getElementById:()=>null},state:()=>({prType:'coffee_table'}),renderPreview(){},renderList(){},updateBusy(){},renderChooser(){},renderFilters(){},patchCatalog(){},renderBarcodeTabs(){},updateBanner(){},patchChart(){}};
 vm.createContext(context);vm.runInContext(declarations.join('\n')+'\n'+functions.join('\n')+'\nstatus=statusNode;formTitle={textContent:""};'+Object.keys(fields).map(key=>key+'=globalThis.'+key+';').join(''),context);
 const run=code=>vm.runInContext(code,context);
 run('setDraft({id:"coffee_table",labels:{ar:"اسم العميل"},descriptions:{ar:"وصف العميل"},image:"",archived:false})');
 const originalDraft=run('JSON.stringify(draft)');
 for(const [key,isError]of [['saved',false],['archiveSaved',false],['saving',false],['imageLoading',false],['nameRequired',true],['duplicate',true],['imageURL',true],['failed',true]]){
  context.key=key;context.isError=isError;context.language='ar';run('announce(key,isError)');
  for(const language of ['en','tr','fr','ru','ar']){
   context.language=language;run('translateSettings()');
   assert.equal(statusNode.textContent,run('t(key)'),key+' '+language);
   assert.equal(statusNode.attributes.role,isError?'alert':'status');assert.equal(errors.has('is-error'),isError);
   assert.equal(run('JSON.stringify(draft)'),originalDraft);assert.equal(fields.nameField.value,'اسم العميل');assert.equal(fields.descriptionField.value,'وصف العميل');
   run('refresh()');assert.equal(statusNode.textContent,run('t(key)'));
  }
 }
 run('setDraft(null)');assert.equal(statusNode.textContent,'');assert.equal(statusNode.attributes.role,'status');assert.equal(errors.has('is-error'),false);
 context.language='fr';run('translateSettings();refresh()');assert.equal(statusNode.textContent,'','cancelled/new-draft status must not return after translation');
 run('announce("imageLoading");announce("")');context.language='tr';run('translateSettings()');assert.equal(statusNode.textContent,'','cleared upload status must not return');
});
