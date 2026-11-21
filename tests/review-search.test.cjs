const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const labels=require('../package-label-core.js'),sources=require('../package-labels.js'),review=require('../review-center.js'),search=require('../global-search.js');
const validInvoice=(id='i')=>({id,invNo:'A-001',companyName:'Buyer',items:[{name:'MODEL',type:'other',image:'/saved.png',qty:2,packets:2}]});
const flush=()=>new Promise(resolve=>setImmediate(resolve));

test('allocation-free inspection matches print diagnostics and preserves every physical label identity',()=>{
 for(const invoice of [validInvoice(),{...validInvoice(),items:[{name:'كرسي',qty:1.5,packets:0}]},{...validInvoice(),items:[{name:'كرسي',qty:1,packets:1}]},{...validInvoice(),items:[{name:'Large',qty:2001,packets:1}]},{}]){
  const model=labels.normalizeInvoice(invoice),inspection=labels.inspectLabelBatch(model),batch=labels.buildLabelBatch(model);
  assert.deepEqual(inspection.issues,batch.issues);assert.equal('labels' in inspection,false);assert(Object.isFrozen(inspection));
 }
 const model=labels.normalizeInvoice({...validInvoice(),items:[{name:'A',qty:2000,packets:1}]}),inspection=labels.inspectLabelBatch(model);
 assert.equal(inspection.totalLabels,2000);assert.equal(inspection.items.length,1);
 const batch=labels.buildLabelBatch(model);assert.equal(batch.labels.length,2000);assert.equal(batch.labels[1999].sequenceNumber,2000);assert.equal(batch.labels[1999].labelId,JSON.stringify(['i',0,1,2000]));
});

test('review distinguishes actual blockers from optional details and honors saved snapshot precedence',()=>{
 const state={settings:{logo:'/issuer.png'},products:[{id:'p',name:'CATALOG',type:'other',image:'/current.png',packets:2}]},context=review.prepareContext(state);
 const legacy={id:'legacy',invNo:'L',items:[{productId:'p',qty:1}]};
 assert.equal(review.inspectInvoice(legacy,context,labels,sources),null);
 const historical={...legacy,packageLabelSnapshot:{companyLogo:'',customerLogo:''}};
 const before=JSON.stringify(historical),row=review.inspectInvoice(historical,context,labels,sources);
 assert.equal(row.kind,'blocked');assert(row.issues.some(issue=>issue.code==='missingName'));assert.equal(JSON.stringify(historical),before);
 const optional={...validInvoice(),items:[{name:'MODEL',qty:1}]};assert.equal(review.inspectInvoice(optional,context,labels,sources).kind,'optional');
 const invalid={...validInvoice(),items:[{name:'MODEL',qty:0,packets:1,image:'javascript:alert(1)'}]},blocked=review.inspectInvoice(invalid,context,labels,sources);
 assert.equal(blocked.kind,'blocked');assert(blocked.issues.some(issue=>issue.code==='unsafeImage'&&issue.severity==='error'));
 assert.equal(review.inspectInvoice(validInvoice(),context,labels,sources),null);
});

test('pending audit records stay separate from invoices and never claim that dialog closure printed paper',()=>{
 const records=['requested','awaiting_confirmation','printed','failed','cancelled'].map((status,id)=>({id,invoiceId:'i',status,selectedLabelCount:3})),before=JSON.stringify(records);
 const result=review.pendingEntries(records);assert.equal(result.length,2);assert.deepEqual(result.map(row=>row.status),['requested','awaiting_confirmation']);assert(result.every(row=>row.kind==='pending'));
 assert.equal(JSON.stringify(records),before);assert.throws(()=>review.pendingEntries({}),/INVALID_HISTORY/);
});

test('local record search normalizes Arabic, Turkish, French, Cyrillic and formatted identifiers without changing saved text',()=>{
 const state={companies:[{id:1,name:'İstanbul Işık',phone:'+90 (555) 111-2233'},{id:2,name:'إِبْرَاهِيم'}],products:[{id:'p',name:'Étagère',barcode:'AB-12'},{id:'r',name:'СТОЛ'}],invoices:[{id:'i',invNo:'A٠٠١',companyName:'إبراهيم',archived:true}]},before=JSON.stringify(state),index=search.buildSearchIndex(state);
 for(const [query,id]of [['istanbul isik',1],['90 555',1],['ابراهيم',2],['etagere','p'],['ab12','p'],['стол','r'],['a001','i']])assert(search.searchEntries(index,query).rows.some(row=>row.id===id),query);
 assert.equal(search.searchEntries(index,'a001').rows[0].archived,true);assert.equal(JSON.stringify(state),before);assert(Object.isFrozen(index));
});

test('search leaves the initial list empty and bounds every result page while retaining complete counts',()=>{
 const index=search.buildSearchIndex({products:Array.from({length:65},(_,id)=>({id,name:'Model '+id})),invoices:[{id:'i',invNo:'MODEL'}]});
 const empty=search.searchEntries(index,'');assert.equal(empty.rows.length,0);assert.equal(empty.counts.all,66);
 const first=search.searchEntries(index,'model',{kind:'products'}),second=search.searchEntries(index,'model',{kind:'products',offset:30}),last=search.searchEntries(index,'model',{kind:'products',offset:60});
 assert.equal(first.rows.length,30);assert.equal(second.rows.length,30);assert.equal(last.rows.length,5);assert.equal(first.total,65);assert.equal(first.counts.invoices,1);
 assert.equal(second.rows[0].id,30);assert.equal(last.rows[0].id,60);assert.equal(search.searchEntries(index,'model',{size:10000}).rows.length,50);
});

class Element{
 constructor(tag,cls='',text=''){this.tag=tag;this.className=cls;this.content=String(text??'');this.children=[];this.attrs={};this.dataset={};this.events={};this.value='';this.hidden=false;this.disabled=false;this.replaces=0;
  this.classList={contains:key=>this.className.split(' ').includes(key),add:key=>{if(!this.classList.contains(key))this.className+=' '+key;},remove:key=>{this.className=this.className.split(' ').filter(item=>item!==key).join(' ');}};}
 set textContent(value){this.content=String(value);this.children=[];}get textContent(){return this.content+this.children.map(child=>child.textContent).join('');}
 append(...children){this.children.push(...children);for(const child of children)child.parent=this;}
 replaceChildren(...children){this.replaces++;this.children=[];this.content='';this.append(...children);}
 setAttribute(key,value){this.attrs[key]=String(value);}getAttribute(key){return this.attrs[key]??null;}
 addEventListener(type,handler){this.events[type]=handler;}
 fire(type,value){if(value!==undefined)this.value=value;return this.events[type]?.({target:this});}
 click(){if(!this.disabled)return this.fire('click');}
 all(){return this.children.flatMap(child=>[child,...child.all()]);}
 focus(options){this.focused=options;}
}
function fixture(initial={}){
 const state={settings:{},companies:[],products:[],invoices:[],...structuredClone(initial)},pages=new Map(),events=new Map(),calls=[],keyboard=[];
 let language='en',history=[],historyError=false;
 const root={console,WFPackageLabelCore:labels,WFPackageLabelHelpers:sources,requestAnimationFrame:callback=>queueMicrotask(callback),
  document:{addEventListener(){}},WFTouchKeyboard:{register:(...args)=>keyboard.push(args),close(){}},
  editCo:id=>calls.push(['client',id]),editPr:id=>calls.push(['product',id]),previewSaved:id=>calls.push(['invoice',id]),wfOpenStatement:id=>calls.push(['statement',id]),
  WFProductLabels:{open:id=>calls.push(['card',id])},WFPackageLabels:{open:id=>calls.push(['labels',id])},
  WFLabelReprintHistory:{getEntries(){if(historyError)throw new Error('INVALID_HISTORY');return history;},open:id=>calls.push(['history',id])},
  addEventListener(type,callback){const list=events.get(type)||[];list.push(callback);events.set(type,list);},
  WFOperations:{make:(...args)=>new Element(...args),locale:()=>language,state:()=>state,notify:message=>calls.push(['notice',message]),
   register(definition){const page=new Element('section','page'),body=new Element('div'),actions=new Element('div');page.append(actions,body);const shell={definition,page,body,actions};pages.set(definition.id,shell);return shell;},
   open(id){for(const [key,shell]of pages)if(key===id)shell.page.classList.add('active');else shell.page.classList.remove('active');pages.get(id).definition.onEnter();return true;}}
 };
 root.window=root;const context=vm.createContext(root);
 for(const file of ['review-center.js','global-search.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'..',file),'utf8'),context);
 const nodes=()=>[...pages.values()].flatMap(shell=>[shell.page,...shell.page.all()]);
 return {root,state,pages,calls,keyboard,id:id=>nodes().find(node=>node.id===id),
  button:(route,label)=>pages.get(route).page.all().find(node=>node.tag==='button'&&node.textContent===label),
  filter:(route,key)=>pages.get(route).page.all().find(node=>node.dataset.filter===key),
  history:value=>{history=value;},historyError:value=>{historyError=value;},
  event:type=>{for(const callback of events.get(type)||[])callback();},
  language:value=>{language=value;for(const shell of pages.values())shell.definition.onLanguage();}};
}

test('review page is read-only, exposes real invoice actions, and refreshes audit events only while active',async()=>{
 const bad={...validInvoice('bad'),items:[{name:'BAD',qty:0,packets:1}]},optional={...validInvoice('optional'),items:[{name:'OPTIONAL',qty:1,packets:1}]};
 const f=fixture({invoices:[validInvoice(),bad,optional]}),before=JSON.stringify(f.state);
 f.history([{id:'h',invoiceId:'i',invoiceNumber:'A-001',status:'awaiting_confirmation',selectedLabelCount:2}]);
 f.root.WFReviewCenter.open();await flush();
 assert.equal(f.filter('review-center','pending').children[0].textContent,'1');assert.equal(f.filter('review-center','blocked').children[0].textContent,'1');assert.equal(f.filter('review-center','optional').children[0].textContent,'1');
 f.button('review-center','Review request').click();assert.deepEqual(f.calls.at(-1),['history','i']);
 f.filter('review-center','blocked').click();f.button('review-center','Review labels').click();assert.deepEqual(f.calls.at(-1),['labels','bad']);
 assert.equal(JSON.stringify(f.state),before);
 f.history([]);f.event('wf-label-reprint-history-change');await flush();assert.equal(f.filter('review-center','pending').children[0].textContent,'0');
 f.root.WFGlobalSearch.open();const renders=f.id('wfReviewResults').replaces;f.event('wf-label-reprint-history-change');await flush();assert.equal(f.id('wfReviewResults').replaces,renders);
});

test('invalid print history is visible and never becomes a fabricated zero pending count',async()=>{
 const f=fixture({invoices:[validInvoice()]});f.historyError(true);f.root.WFReviewCenter.open();await flush();
 assert.equal(f.filter('review-center','pending').children[0].textContent,'—');assert.equal(f.filter('review-center','all').children[0].textContent,'—');
 assert.match(f.id('wfReviewStatus').textContent,/could not be read/);assert(!f.id('wfReviewStatus').hidden);
 f.historyError(false);await f.root.WFReviewCenter.refresh();assert.equal(f.filter('review-center','pending').children[0].textContent,'0');
});

test('global search keeps one live input and uses original actions after checking that the record still exists',async()=>{
 const f=fixture({companies:[{id:5,name:'İstanbul'}],products:[{id:'p',name:'Étagère'}],invoices:[validInvoice()]}),before=JSON.stringify(f.state);
 f.root.WFGlobalSearch.open();const input=f.id('wfGlobalSearchInput');input.fire('input','istanbul');await flush();
 f.button('global-search','Open client details').click();assert.deepEqual(f.calls.at(-1),['client',5]);assert.equal(JSON.stringify(f.state),before);
 for(const locale of ['ar','en','tr','fr','ru']){f.language(locale);assert.equal(f.id('wfGlobalSearchInput'),input);assert.equal(input.value,'istanbul');assert(!f.pages.get('global-search').body.textContent.includes('undefined'));}
 f.language('en');input.fire('input','etagere');await flush();const stale=f.button('global-search','Open product details');f.state.products=[];stale.click();assert.equal(f.calls.filter(call=>call[0]==='product').length,0);assert.equal(f.calls.at(-1)[0],'notice');
 assert.equal(f.keyboard[0][0],'wfGlobalSearchInput');assert.equal(f.keyboard[0][1].action,'search');
});

test('rapid typing coalesces into one bounded result render and saved strings remain text',async()=>{
 const f=fixture({products:Array.from({length:85},(_,id)=>({id,name:'Model <img src=x> '+id}))});f.root.WFGlobalSearch.open();
 const input=f.id('wfGlobalSearchInput'),results=f.id('wfGlobalSearchResults'),before=results.replaces;
 for(const query of ['m','mo','mod','model'])input.fire('input',query);await flush();
 assert.equal(results.replaces,before+1);assert.equal(results.children.length,30);assert(results.textContent.includes('<img src=x>'));
 f.button('global-search','Next').click();assert.equal(results.children.length,30);f.button('global-search','Next').click();assert.equal(results.children.length,25);
 assert(results.all().every(node=>!node.innerHTML));
});
