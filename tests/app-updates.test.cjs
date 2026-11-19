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
  const ids=new Map(),timers=new Map();let timerID=0,reloads=0,registerArgs;
  function node(tag){return Object.assign(events(),{tagName:tag.toUpperCase(),dataset:{},children:[],attrs:{},hidden:false,classList:{add(){}},style:{setProperty(){}},append(...children){this.children.push(...children);for(const child of children)if(child.id)ids.set(child.id,child);},setAttribute(name,value){this.attrs[name]=value;},getAttribute(name){return this.attrs[name]??null;},removeAttribute(name){delete this.attrs[name];},getClientRects(){return this.hidden?[]:[{}];},querySelector(){return null;},querySelectorAll(){return [];}});}
  const page=node('section');page.id='page-dashboard';const robot=node('div');ids.set('wfGreetingRobot',robot);
  const document=Object.assign(events(),{currentScript:{dataset:{release:'174'}},documentElement:{lang:'ar'},body:node('body'),visibilityState:'visible',readyState:'complete',activeElement:null,createElement:node,getElementById:id=>ids.get(id)||null,querySelector:selector=>selector==='.page.active'?page:null,querySelectorAll:()=>[]});
  const registration=Object.assign(events(),{updates:0,async update(){this.updates++;}});
  const sw=Object.assign(events(),{controller:Object.assign(events(),worker()),async register(...args){registerArgs=args;return registration;}});
  const context=Object.assign(events(),{document,navigator:{serviceWorker:sw,onLine:true},S:{settings:{},invoices:[],payments:[]},location:{reload:()=>reloads++},getComputedStyle:()=>({visibility:'visible'}),sessionStorage:{getItem:()=>null,setItem(){}},MutationObserver:class{observe(){}},URL,queueMicrotask,console,setTimeout:fn=>{timers.set(++timerID,fn);return timerID;},clearTimeout:id=>timers.delete(id),setInterval:fn=>{timers.set(++timerID,fn);return timerID;},clearInterval:id=>timers.delete(id)});
  context.window=context;vm.runInNewContext(fs.readFileSync(require.resolve('../app-updates.js'),'utf8'),context);
  return {context,sw,registration,robot,page,ids,get registerArgs(){return registerArgs;},get reloads(){return reloads;}};
}
test('browser integration registers the real worker without cache reuse or an extra initial update fetch',async()=>{
  const f=browserFixture();await Promise.resolve();await Promise.resolve();await Promise.resolve();
  assert.equal(f.registerArgs[0],'sw.js');assert.equal(f.registerArgs[1].updateViaCache,'none');assert.equal(f.registration.updates,0);
  f.registration.installing={state:'installed',addEventListener(){}};f.registration.emit('updatefound');assert.equal(f.context.WFAppUpdates.status().available,false);
  f.sw.controller={state:'activated',addEventListener(){}};f.sw.emit('controllerchange');assert.equal(f.context.WFAppUpdates.status().available,true);assert.equal(f.reloads,0);
});
test('browser integration defers real refresh through report loading and pack downloads',async()=>{
  const f=browserFixture();await Promise.resolve();await Promise.resolve();await Promise.resolve();
  f.sw.controller={state:'activated',addEventListener(){}};f.sw.emit('controllerchange');
  f.robot.dataset.voiceActive='true';assert.equal(f.context.WFAppUpdates.refresh(),false);assert.equal(f.reloads,0);
  f.robot.dataset.voiceActive='false';f.context.WFOfflineVoice={list:()=>[{locale:'ar'}],getStatus:()=>({state:'downloading'})};assert.equal(f.context.WFAppUpdates.refresh(),false);
  f.context.WFOfflineVoice.getStatus=()=>({state:'ready'});assert.equal(f.context.WFAppUpdates.refresh(),true);assert.equal(f.reloads,1);
});
test('previously viewed saved product and company images do not prevent refreshing the dashboard',async()=>{
  const f=browserFixture();await new Promise(setImmediate);
  Object.assign(f.context.S,{prImgData:'data:saved',logoData:'data:saved',editPrId:'saved-product',editCoId:'saved-company',editInvId:'saved-invoice',invItems:[{saved:true}]});
  f.sw.controller={state:'activated',addEventListener(){}};f.sw.emit('controllerchange');assert.equal(f.context.WFAppUpdates.status().canReload,true);
  f.page.id='page-add-product';assert.equal(f.context.WFAppUpdates.status().canReload,false);
});
