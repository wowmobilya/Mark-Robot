const test=require('node:test'),assert=require('node:assert/strict');
const {blocking,createCoordinator,createChecker,createDraftTracker,visibleElement}=require('../app-updates.js');
const worker=(state='activated')=>({state});
function coordinator(options={}){
  let safety={visible:true,idle:true,route:'dashboard'},stored=null,reloads=0,clock=1000;
  const boot=options.boot??worker();
  const api=createCoordinator({bootController:boot,release:'174',getSafety:()=>safety,readGuard:()=>stored,writeGuard:value=>{stored=value;return true;},reload:()=>reloads++,now:()=>clock,...options});
  return {api,boot,set:value=>safety={...safety,...value},get reloads(){return reloads;},get stored(){return stored;},advance:value=>clock+=value};
}
test('only a different activated controller becomes an available update',()=>{
  const a=coordinator();
  for(const value of [null,a.boot,worker('installing'),worker('installed'),worker('activating'),worker('redundant')])assert.equal(a.api.changed(value),false);
  assert.equal(a.api.status().available,false);
  const next=worker();assert.equal(a.api.changed(next),true);assert.equal(a.api.status().available,true);assert.equal(a.api.changed(next),false);assert.equal(a.reloads,0);
});
test('the first controller claim is an installation, not an update notification',()=>{
  const a=coordinator({bootController:null});assert.equal(a.api.changed(worker()),false);assert.equal(a.api.status().available,false);
  assert.equal(a.api.changed(worker()),true);
});
test('no pending update performs no form safety scans, while an actual update checks the latest guard',()=>{
  let reads=0,safety={visible:true,idle:true,route:'dashboard'};
  const a=coordinator({getSafety:()=>{reads++;return safety;}});
  for(let index=0;index<100;index++)assert.equal(a.api.status().canReload,false);
  assert.equal(a.api.attempt(true),false);assert.equal(reads,0);
  a.api.changed(worker());assert(reads>0);safety={...safety,dirty:true};
  assert.equal(a.api.attempt(true),false);assert.equal(a.api.status().reason,'draft');assert.equal(a.reloads,0);
});
test('automatic reload rechecks current drafts and runs only once on a clean idle dashboard',()=>{
  const a=coordinator();a.api.changed(worker());assert.equal(a.api.status().canAutoReload,true);
  a.set({dirty:true});assert.equal(a.api.attempt(),false);assert.equal(a.api.attempt(true),false);assert.equal(a.reloads,0);
  a.set({dirty:false});assert.equal(a.api.attempt(),true);assert.equal(a.reloads,1);assert.equal(a.api.attempt(true),false);
  assert.deepEqual(a.stored,{key:'from-release:174',at:1000});
});
test('dialogs, editing, speech, camera, pending writes, packs and hidden pages block both refresh paths',()=>{
  for(const key of ['dirty','editing','dialog','busy','speech','camera','downloading']){
    const a=coordinator();a.api.changed(worker());a.set({[key]:true});assert.equal(a.api.attempt(),false,key);assert.equal(a.api.attempt(true),false,key);
  }
  assert.equal(blocking({visible:false}),'hidden');
  const a=coordinator();a.api.changed(worker());a.set({visible:false});assert.equal(a.api.attempt(true),false);
});
test('a clean section may be refreshed explicitly while automatic refresh waits for the dashboard and idle state',()=>{
  const a=coordinator();a.api.changed(worker());a.set({route:'products'});assert.equal(a.api.attempt(),false);assert.equal(a.api.attempt(true),true);
  const b=coordinator();b.api.changed(worker());b.set({idle:false});assert.equal(b.api.attempt(),false);
});
test('the same release cannot enter an automatic reload loop across page boots',()=>{
  const stored={key:'from-release:174',at:0};
  const a=coordinator({readGuard:()=>stored,now:()=>24*60*60*1000});a.api.changed(worker());assert.equal(a.api.attempt(),false);assert.equal(a.api.status().canAutoReload,false);assert.equal(a.api.attempt(true),true);
  const b=coordinator({release:'175',readGuard:()=>stored});b.api.changed(worker());assert.equal(b.api.attempt(),true);
});
test('unavailable loop-guard storage disables automatic refresh but preserves an explicit safe refresh',()=>{
  const a=coordinator({writeGuard:()=>false});a.api.changed(worker());assert.equal(a.api.attempt(),false);assert.equal(a.api.status().canAutoReload,false);assert.equal(a.api.attempt(true),true);
});
test('Later prevents delayed automatic reload; another actual controller can offer its own update',()=>{
  const a=coordinator();a.api.changed(worker());a.api.dismiss();assert.equal(a.api.attempt(),false);assert.equal(a.api.status().dismissed,true);
  a.api.reveal();assert.equal(a.api.status().dismissed,false);a.api.dismiss();a.api.changed(worker());assert.equal(a.api.status().dismissed,false);
});
test('update checks coalesce focus and online events and never run hidden or offline',async()=>{
  let visible=true,online=true,clock=0,calls=0,finish;
  const check=createChecker({visible:()=>visible,online:()=>online,now:()=>clock,registration:async()=>({update(){calls++;return new Promise(resolve=>finish=resolve);}})});
  const first=check();assert.equal(check(),first);assert.equal(check(true),first);await new Promise(setImmediate);
  assert.equal(calls,1);finish();assert.equal(await first,true);assert.equal(await check(),false);
  clock=10000;visible=false;assert.equal(await check(true),false);visible=true;online=false;assert.equal(await check(true),false);assert.equal(calls,1);
  online=true;const second=check();await new Promise(setImmediate);finish();assert.equal(await second,true);assert.equal(calls,2);
});
test('a registration or network failure is recoverable without throwing into the workspace',async()=>{
  let fail=true,clock=0;
  const check=createChecker({visible:()=>true,online:()=>true,now:()=>clock,registration:async()=>{if(fail)throw new Error('offline');return {update:async()=>{}};}});
  assert.equal(await check(),false);fail=false;clock=10000;assert.equal(await check(),true);
});
function drafts(){const root={isConnected:true,value:'saved',revision:{}},api=createDraftTracker({snapshot:item=>item.value,revision:item=>item.revision});return {root,api};}
test('typing, reverting and programmatic field changes are distinguished from focus alone',()=>{
  const {root,api}=drafts();api.begin(root);assert.equal(api.dirty(),false);
  root.value='draft';api.touch(root);assert.equal(api.dirty(),true);root.value='saved';assert.equal(api.dirty(),false);
  root.value='picker selection';assert.equal(api.dirty(),true);api.clean(root);assert.equal(api.dirty(),false);
});
test('uploads and changes held outside visible inputs remain dirty until a real save or discard',()=>{
  const {root,api}=drafts();api.begin(root);api.touch(root,true);assert.equal(api.dirty(),true);
  root.revision={archivedAnotherCategory:true};assert.equal(api.dirty(),true,'unrelated settings changes do not clear a draft');
  api.clean(root);assert.equal(api.dirty(),false);
  api.touch(root);assert.equal(api.dirty(),true,'an input event without a captured baseline is conservative');
});
test('failed submits and unrelated later writes cannot mark drafts saved',()=>{
  const {root,api}=drafts();api.begin(root);api.touch(root,true);api.submitted(root);api.settled(root);assert.equal(api.dirty(),true);
  root.revision={archivedAnotherCategory:true};api.settled(root);assert.equal(api.dirty(),true);
  api.submitted(root);root.revision={committedOwnSave:true};assert.equal(api.dirty(),true,'wait for the save activity to settle');api.settled(root);assert.equal(api.dirty(),false);
});
test('a write before submit is not mistaken for that submit succeeding; new edits cancel the pending acknowledgement',()=>{
  const {root,api}=drafts();api.begin(root);api.touch(root,true);root.revision={other:true};api.submitted(root);api.settled(root);assert.equal(api.dirty(),true);
  api.submitted(root);api.touch(root,true);root.revision={saved:true};api.settled(root);assert.equal(api.dirty(),true);
  root.isConnected=false;assert.equal(api.dirty(),false);
});
test('legacy opacity-hidden, offscreen and parent-hidden dialogs do not block updates forever',()=>{
  const viewport={top:0,left:0,right:400,bottom:800},rect={top:30,left:10,right:390,bottom:700};
  const el={getClientRects:()=>[rect],getBoundingClientRect:()=>rect,getAttribute:()=>null,css:{opacity:'1',display:'block',visibility:'visible'}};
  const style=node=>node.css;assert.equal(visibleElement(el,style,viewport),true);
  el.css.opacity='0';assert.equal(visibleElement(el,style,viewport),false);el.css.opacity='1';
  rect.left=401;rect.right=800;assert.equal(visibleElement(el,style,viewport),false);rect.left=10;rect.right=390;
  el.parentElement={getAttribute:()=>null,css:{opacity:'0'}};assert.equal(visibleElement(el,style,viewport),false);
  el.parentElement.css={opacity:'1'};el.parentElement.hidden=true;assert.equal(visibleElement(el,style,viewport),false);
});
function browserFixture(){
  const vm=require('node:vm'),fs=require('node:fs'),events=()=>({handlers:{},addEventListener(name,fn){(this.handlers[name]??=[]).push(fn);},emit(name,event={}){for(const fn of this.handlers[name]||[])fn(event);}});
  const ids=new Map(),timers=new Map();let timerID=0,reloads=0,registerArgs,scans=0;
  function node(tag){return Object.assign(events(),{tagName:tag.toUpperCase(),dataset:{},children:[],attrs:{},hidden:false,classList:{add(){}},style:{setProperty(){}},append(...children){this.children.push(...children);for(const child of children)if(child.id)ids.set(child.id,child);},setAttribute(name,value){this.attrs[name]=value;},getAttribute(name){return this.attrs[name]??null;},removeAttribute(name){delete this.attrs[name];},getClientRects(){return this.hidden?[]:[{}];},querySelector(){return null;},querySelectorAll(){return [];}});}
  const page=node('section');page.id='page-dashboard';const robot=node('div');ids.set('wfGreetingRobot',robot);
  const document=Object.assign(events(),{currentScript:{dataset:{release:'174'}},documentElement:{lang:'ar'},body:node('body'),visibilityState:'visible',readyState:'complete',activeElement:null,createElement:node,getElementById:id=>ids.get(id)||null,querySelector:selector=>selector==='.page.active'?page:null,querySelectorAll:()=>{scans++;return [];}});
  const registration=Object.assign(events(),{updates:0,async update(){this.updates++;}});
  const sw=Object.assign(events(),{controller:Object.assign(events(),worker()),async register(...args){registerArgs=args;return registration;}});
  const context=Object.assign(events(),{document,navigator:{serviceWorker:sw,onLine:true},S:{settings:{},invoices:[],payments:[]},location:{reload:()=>reloads++},getComputedStyle:()=>({visibility:'visible'}),sessionStorage:{getItem:()=>null,setItem(){}},MutationObserver:class{observe(){}},URL,queueMicrotask,console,setTimeout:(fn,delay)=>{timers.set(++timerID,{fn,delay,interval:false});return timerID;},clearTimeout:id=>timers.delete(id),setInterval:(fn,delay)=>{timers.set(++timerID,{fn,delay,interval:true});return timerID;},clearInterval:id=>timers.delete(id)});
  context.window=context;vm.createContext(context);
  vm.runInContext('let wfPendingSettingsLogo; const DEFAULT_WOW_LOGO="default-logo"; function resetSettingsLogo(){wfPendingSettingsLogo=DEFAULT_WOW_LOGO;}',context);
  vm.runInContext(fs.readFileSync(require.resolve('../app-updates.js'),'utf8'),context);
  return {context,document,node,evaluate:source=>vm.runInContext(source,context),sw,registration,robot,page,ids,timers,get scans(){return scans;},get registerArgs(){return registerArgs;},get reloads(){return reloads;}};
}
test('browser integration registers the real worker without cache reuse or an extra initial update fetch',async()=>{
  const f=browserFixture();await Promise.resolve();await Promise.resolve();await Promise.resolve();
  assert.equal(f.registerArgs[0],'sw.js');assert.equal(f.registerArgs[1].updateViaCache,'none');assert.equal(f.registration.updates,0);
  f.registration.installing={state:'installed',addEventListener(){}};f.registration.emit('updatefound');assert.equal(f.context.WFAppUpdates.status().available,false);
  f.sw.controller={state:'activated',addEventListener(){}};f.sw.emit('controllerchange');assert.equal(f.context.WFAppUpdates.status().available,true);assert.equal(f.reloads,0);
});
test('ordinary typing and speech status do not scan dialog or header geometry without an update',async()=>{
  const f=browserFixture();await new Promise(setImmediate);const before=f.scans;
  const {target}=draftRoot(f,'page-add-company');
  f.document.emit('pointerdown',{target});
  for(let index=0;index<20;index++){f.document.emit('input',{target});f.context.emit('wf-robot-speaking');}
  assert.equal(f.scans,before);
  f.sw.controller={state:'activated',addEventListener(){}};f.sw.emit('controllerchange');assert(f.scans>before);
});
test('update clocks stop in hidden or suspended pages and resume once after a cached-page return',async()=>{
  const f=browserFixture();await new Promise(setImmediate);
  f.sw.controller={state:'activated',addEventListener(){}};f.sw.emit('controllerchange');
  assert.equal([...f.timers.values()].filter(timer=>timer.interval).length,1);
  f.document.visibilityState='hidden';f.document.emit('visibilitychange');assert.equal(f.timers.size,0);
  f.context.emit('wf-robot-speaking');assert.equal(f.timers.size,0);
  f.document.visibilityState='visible';f.document.emit('visibilitychange');
  assert.equal([...f.timers.values()].filter(timer=>timer.interval).length,1);
  f.context.emit('pagehide',{persisted:true});assert.equal(f.timers.size,0);
  f.context.emit('focus');f.context.emit('wf-robot-speaking');assert.equal(f.timers.size,0);
  f.context.emit('pageshow',{persisted:true});
  assert.equal([...f.timers.values()].filter(timer=>timer.interval).length,1);
  assert.equal([...f.timers.values()].filter(timer=>timer.delay===60000).length,1);
  assert.equal(f.reloads,0);
});
test('browser integration defers real refresh through report loading and pack downloads',async()=>{
  const f=browserFixture();await Promise.resolve();await Promise.resolve();await Promise.resolve();
  f.sw.controller={state:'activated',addEventListener(){}};f.sw.emit('controllerchange');
  f.robot.dataset.voiceActive='true';assert.equal(f.context.WFAppUpdates.refresh(),false);assert.equal(f.reloads,0);
  f.robot.dataset.voiceActive='false';f.context.WFOfflineVoice={list:()=>[{locale:'ar'}],getStatus:()=>({state:'downloading'})};assert.equal(f.context.WFAppUpdates.refresh(),false);
  f.context.WFOfflineVoice.getStatus=()=>({state:'ready'});assert.equal(f.context.WFAppUpdates.refresh(),true);assert.equal(f.reloads,1);
});
test('an active shared Mark pack download blocks refresh after returning to the dashboard',async()=>{
  const f=browserFixture();await new Promise(setImmediate);
  f.context.WFReferenceVoice={list:()=>[{locale:'ar'},{locale:'en'}],getStatus:()=>({state:'downloading'})};
  f.sw.controller={state:'activated',addEventListener(){}};f.sw.emit('controllerchange');
  assert.equal(f.context.WFAppUpdates.status().reason,'busy');assert.equal(f.context.WFAppUpdates.refresh(),false);
  assert.equal(f.reloads,0);f.context.WFReferenceVoice.getStatus=()=>({state:'ready'});
  assert.equal(f.context.WFAppUpdates.refresh(),true);assert.equal(f.reloads,1);
});
test('previously viewed saved product and company images do not prevent refreshing the dashboard',async()=>{
  const f=browserFixture();await new Promise(setImmediate);
  Object.assign(f.context.S,{prImgData:'data:saved',logoData:'data:saved',editPrId:'saved-product',editCoId:'saved-company',editInvId:'saved-invoice',invItems:[{saved:true}]});
  f.sw.controller={state:'activated',addEventListener(){}};f.sw.emit('controllerchange');assert.equal(f.context.WFAppUpdates.status().canReload,true);
  f.page.id='page-add-product';assert.equal(f.context.WFAppUpdates.status().canReload,false);
});
function draftRoot(f,id,fields=[]){
  const root=f.node('section');root.id=id;root.isConnected=true;root.querySelectorAll=()=>fields;f.ids.set(id,root);
  const target=f.node('button');target.closest=selector=>selector==='button'?target:root;target.matches=()=>false;
  return {root,target};
}
test('a pending lexical company-logo reset blocks refresh until reverted or saved',async()=>{
  const f=browserFixture();await new Promise(setImmediate);f.context.S.settings.logo='custom-company-logo';
  const {target}=draftRoot(f,'stab-company');target.setAttribute('onclick','resetSettingsLogo()');
  f.document.emit('pointerdown',{target});f.evaluate('resetSettingsLogo()');f.document.emit('click',{target});
  f.sw.controller={state:'activated',addEventListener(){}};f.sw.emit('controllerchange');
  assert.equal(f.context.wfPendingSettingsLogo,undefined,'pending logo is lexical, not a window property');
  assert.equal(f.context.WFAppUpdates.status().reason,'draft');assert.equal(f.context.WFAppUpdates.refresh(),false);assert.equal(f.reloads,0);
  f.evaluate('wfPendingSettingsLogo=undefined');assert.equal(f.context.WFAppUpdates.status().canReload,true);
});
test('resetting an already-default company logo does not manufacture an unsaved draft',async()=>{
  for(const saved of ['default-logo',undefined]){
    const f=browserFixture();await new Promise(setImmediate);f.context.S.settings.logo=saved;
    const {target}=draftRoot(f,'stab-company');target.setAttribute('onclick','resetSettingsLogo()');
    f.document.emit('pointerdown',{target});f.evaluate('resetSettingsLogo()');f.document.emit('click',{target});
    f.sw.controller={state:'activated',addEventListener(){}};f.sw.emit('controllerchange');assert.equal(f.context.WFAppUpdates.status().canReload,true);
  }
});
test('only a cashbox commit acknowledgment clears its draft, and later edits block refresh again',async()=>{
  const f=browserFixture();await new Promise(setImmediate);
  const currency={name:'currency',value:'TRY'},type={name:'type',value:'receipt'},amount={name:'amount',value:''};
  const {target}=draftRoot(f,'page-cashboxes',[currency,type,amount]);
  f.document.emit('pointerdown',{target});currency.value='USD';type.value='expense';amount.value='15';f.document.emit('input',{target});f.document.emit('submit',{target});
  f.sw.controller={state:'activated',addEventListener(){}};f.sw.emit('controllerchange');
  assert.equal(f.context.WFAppUpdates.refresh(),false,'pending or failed save has no commit acknowledgment');
  amount.value='';f.document.emit('wf-cashbox-entry-saved',{target});
  assert.equal(currency.value,'USD');assert.equal(type.value,'expense');assert.equal(f.context.WFAppUpdates.status().canReload,true,'retained selectors are no longer a dirty draft');
  amount.value='8';f.document.emit('input',{target});assert.equal(f.context.WFAppUpdates.refresh(),false);assert.equal(f.reloads,0);
});
test('cashbox module emits its acknowledgment after committed clearing, never after a failed write',async()=>{
  const vm=require('node:vm'),fs=require('node:fs');
  function cashFixture(){
    const notices=[];let finish,fail;
    const field=value=>({value,options:[],add(option){this.options.push(option);if(!this.value)this.value=option.value;},replaceChildren(...options){this.options=options;this.value=options[0]?.value||'';},closest:()=>({hidden:false,dataset:{}})});
    const fields={currency:field('USD'),type:field('expense'),amount:field('15'),target:field('TRY'),received:field(''),note:field('draft')},button={disabled:false,dataset:{}},status={},output={},list={replaceChildren(){},append(){}};
    const form={elements:fields,querySelector:()=>button,dispatchEvent:event=>notices.push({type:event.type,bubbles:event.bubbles,amount:fields.amount.value,note:fields.note.value})};
    const box={querySelector:selector=>({'form':form,'[role=status]':status,'output':output,'ol':list})[selector],querySelectorAll:()=>[]};
    const page={querySelector:selector=>selector==='header'?{after(){}}:null,classList:{contains:()=>false}};
    const context={document:{documentElement:{lang:'ar'},getElementById:()=>null,querySelector:()=>page,querySelectorAll:()=>[],createElement:()=>box},MutationObserver:class{observe(){}},Option:class{constructor(label,value){this.textContent=label;this.value=value;}},CustomEvent:class{constructor(type,options){this.type=type;Object.assign(this,options);}},FormData:class{constructor(){return Object.entries(fields).map(([key,field])=>[key,field.value]);}},wfNewRecordId:()=> 'test',dbPut:()=>new Promise((resolve,reject)=>{finish=resolve;fail=reject;}),dbGetAllKeysRaw:async()=>[],dbGetAll:async()=>[],WOWStatementCore:{collectPayments:()=>({groups:new Map(),unattached:[]})},Intl,Date};
    vm.runInNewContext(fs.readFileSync(require.resolve('../cashboxes.mjs'),'utf8').replaceAll('export function ','function ')+'\nmount();',context);
    return {fields,notices,submit:()=>form.onsubmit({preventDefault(){}}),commit:()=>finish(),reject:()=>fail(new Error('write failed'))};
  }
  const success=cashFixture(),pending=success.submit();assert.deepEqual(success.notices,[]);assert.equal(success.fields.amount.value,'15');success.commit();await pending;
  assert.deepEqual(success.notices,[{type:'wf-cashbox-entry-saved',bubbles:true,amount:'',note:''}]);assert.equal(success.fields.currency.value,'USD');assert.equal(success.fields.type.value,'expense');
  const failure=cashFixture(),rejected=failure.submit();failure.reject();await rejected;assert.deepEqual(failure.notices,[]);assert.equal(failure.fields.amount.value,'15');assert.equal(failure.fields.note.value,'draft');
});
