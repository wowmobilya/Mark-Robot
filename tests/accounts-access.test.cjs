'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const acorn=require('acorn'),{webcrypto}=require('node:crypto');
const core=require('../accounts-core.js'),policy=require('../accounts-policy.js'),dataPolicy=require('../accounts-data-policy.js'),costCore=require('../product-cost-core.js');
const cloudAPI=require('../modules/platform/cloud/wow-cloud-client.js');
const accessSource=fs.readFileSync(path.join(__dirname,'../accounts-access.js'),'utf8');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const PASSWORD='Correct horse-2026';
const credential={algorithm:'PBKDF2-HMAC-SHA256',iterations:600000,salt:'00112233445566778899aabbccddeeff',hash:'14b26192bfcf425ce5fde54aec7d04e6e48b850adeddb8433742f0e1b389016e'};
const copy=value=>value==null?value:structuredClone(value),flush=()=>new Promise(resolve=>setImmediate(resolve));
function row(id,role='owner',permissions=policy.presets(role)){
  const at='2026-11-21T10:00:00.000Z';
  return {id,name:id,username:id,role,permissions,status:'active',department:'',note:'',createdAt:at,updatedAt:at,lastLoginAt:null,expiresAt:null,deletedAt:null,
    sessionVersion:1,failedAttempts:0,lockedUntil:null,credential:copy(credential)};
}
function identity(rows=[row('owner'),row('worker','carpentry')]){return {schemaVersion:1,revision:1,accounts:rows,audit:[]};}
function extract(name){let start=html.indexOf('function '+name+'(');assert(start>=0,name+' must exist');if(html.slice(start-6,start)==='async ')start-=6;return html.slice(start,acorn.parseExpressionAt(html,start,{ecmaVersion:'latest'}).end);}
function runtime({initial=identity(),readFailure=false,missingPolicy=false,tabStorage=new Map(),storageBlocked=false,search='',cloud=null}={}){
  let saved=copy(initial),clock=Date.parse('2026-11-21T10:00:00.000Z'),reloads=0,readHold=null;
  const channels=[],frames=[],intervals=[],toasts=[],events=new Map(),reloadEvents=[],emittedEvents=[],observers=[];
  let frameRuns=0;
  const adapter={async read(){if(readFailure)throw Error('unavailable');if(readHold)await readHold;return copy(saved);},async commit(expected,next){if((saved?.revision||0)!==expected)throw Error('CONFLICT');saved=copy(next);}};
  let document;
  function mutation(record){
    for(const observer of observers){
      if(!observer.targets.some(({target,options})=>{
        let ancestor=record.target;while(ancestor&&ancestor!==target)ancestor=options.subtree?ancestor.parentElement:null;
        return ancestor===target&&(record.type==='childList'?options.childList:options.attributes&&(!options.attributeFilter||options.attributeFilter.includes(record.attributeName)));
      }))continue;
      observer.records.push(record);
      if(!observer.queued){observer.queued=true;queueMicrotask(()=>{observer.queued=false;const records=observer.records.splice(0);if(records.length)observer.callback(records,observer);});}
    }
  }
  class MutationObserver{
    constructor(callback){this.callback=callback;this.targets=[];this.records=[];this.queued=false;observers.push(this);}
    observe(target,options){this.targets.push({target,options});}
    disconnect(){this.targets=[];this.records=[];}
  }
  class StyleDeclaration{
    constructor(element){this.element=element;this.properties=new Map();}
    getPropertyValue(key){return this.properties.get(key)?.value||'';}
    getPropertyPriority(key){return this.properties.get(key)?.priority||'';}
    setProperty(key,value,priority=''){if(String(value)===''){this.removeProperty(key);return;}this.properties.set(key,{value:String(value),priority:String(priority)});mutation({type:'attributes',attributeName:'style',target:this.element});}
    removeProperty(key){const old=this.getPropertyValue(key);if(this.properties.delete(key))mutation({type:'attributes',attributeName:'style',target:this.element});return old;}
    get display(){return this.getPropertyValue('display');}set display(value){this.setProperty('display',value);}
  }
  class Element{
    constructor(tag='div'){this.tagName=tag.toUpperCase();this.children=[];this.parentElement=null;this.dataset={};this.attrs={};this.listeners={};this.hidden=false;this.value='';this.style=new StyleDeclaration(this);this._text='';this.className='';}
    set textContent(value){this._text=String(value);this.children=[];}get textContent(){return this._text+this.children.map(child=>child.textContent).join('');}
    get previousElementSibling(){return this.parentElement?.children[this.parentElement.children.indexOf(this)-1]||null;}
    get inert(){return this.hasAttribute('inert');}set inert(value){if(value)this.setAttribute('inert','');else this.removeAttribute('inert');}
    append(...nodes){for(const node of nodes){node.remove();node.parentElement=this;this.children.push(node);mutation({type:'childList',target:this,addedNodes:[node],removedNodes:[]});}}
    remove(){const parent=this.parentElement;if(parent){parent.children=parent.children.filter(node=>node!==this);this.parentElement=null;mutation({type:'childList',target:parent,addedNodes:[],removedNodes:[this]});}}
    after(node){const parent=this.parentElement;if(!parent)return;node.remove();parent.children.splice(parent.children.indexOf(this)+1,0,node);node.parentElement=parent;}
    setAttribute(key,value){this.attrs[key]=String(value);if(key.startsWith('data-'))this.dataset[key.slice(5).replace(/-([a-z])/g,(_,c)=>c.toUpperCase())]=String(value);mutation({type:'attributes',attributeName:key,target:this});}
    getAttribute(key){if(key.startsWith('data-'))return this.dataset[key.slice(5).replace(/-([a-z])/g,(_,c)=>c.toUpperCase())]??this.attrs[key]??null;return this.attrs[key]??null;}
    hasAttribute(key){return this.getAttribute(key)!==null;}
    removeAttribute(key){const existed=this.hasAttribute(key);delete this.attrs[key];if(key.startsWith('data-'))delete this.dataset[key.slice(5).replace(/-([a-z])/g,(_,c)=>c.toUpperCase())];if(existed)mutation({type:'attributes',attributeName:key,target:this});}
    matches(selector){return selector.split(',').some(part=>{part=part.trim();
      const pieces=part.trim().split(/\s+/);if(pieces.length>1){if(!this.matches(pieces.pop()))return false;let ancestor=this.parentElement;while(pieces.length){const expected=pieces.pop();while(ancestor&&!ancestor.matches(expected))ancestor=ancestor.parentElement;if(!ancestor)return false;ancestor=ancestor.parentElement;}return true;}
      if(part.startsWith('#'))return this.id===part.slice(1);if(part.startsWith('.'))return part.slice(1).split('.').every(name=>this.className.split(' ').includes(name));if(part.startsWith('['))return this.hasAttribute(part.slice(1,-1));return this.tagName===part.toUpperCase();
    });}
    querySelectorAll(selector){return this.children.flatMap(child=>[...(child.matches(selector)?[child]:[]),...child.querySelectorAll(selector)]);}
    querySelector(selector){return this.querySelectorAll(selector)[0]||null;}
    addEventListener(type,handler){(this.listeners[type]??=[]).push(handler);}
    focus(){document.activeElement=this;}reportValidity(){return true;}
  }
  document=new Element('document');document.documentElement=new Element('html');document.documentElement.lang='en';document.body=new Element('body');document.append(document.documentElement);document.documentElement.append(document.body);
  document.createElement=tag=>new Element(tag);document.getElementById=id=>document.querySelector('#'+id);document.visibilityState='visible';
  for(const id of ['sidebar','mainContent','bottomNav']){const node=new Element();node.id=id;document.body.append(node);}
  const page=new Element('section');page.id='page-manufacturing';page.className='page active';document.getElementById('mainContent').append(page);
  const context={document,crypto:webcrypto,console,URL,Date,TextEncoder,Promise,Map,Set,
    WFAccountPolicy:missingPolicy?null:policy,WFAccountDataPolicy:dataPolicy,WFCostCore:costCore,
    WFAccountsCore:{createService:options=>core.createService({...options,now:()=>clock})},WFAccountsLocalProvider:{create:()=>adapter},
    MutationObserver,BroadcastChannel:class{constructor(){channels.push(this);}postMessage(){}},
    requestAnimationFrame:callback=>frames.push(callback),setInterval:callback=>intervals.push(callback),
    Event:class{constructor(type){this.type=type;}},dispatchEvent(event){emittedEvents.push({type:event.type,canPrint:context.WFAccountAccess?.can('manufacturing.print')||false});events.get(event.type)?.(event);return true;},
    addEventListener(type,callback){events.set(type,callback);},location:{search,reload(){reloads++;reloadEvents.push(copy(saved?.audit||[]));}},WFDialog:{confirm:async()=>true},
    localStorage:{setItem(){}},sessionStorage:{
      getItem(key){if(storageBlocked)throw Error('Storage blocked');return tabStorage.get(key)??null;},
      setItem(key,value){if(storageBlocked)throw Error('Storage blocked');tabStorage.set(key,String(value));},
      removeItem(key){if(storageBlocked)throw Error('Storage blocked');tabStorage.delete(key);}
    },showToast:(...args)=>toasts.push(args)};
  if(cloud)context.WFCloudClient={isRemoteMode:()=>true,getClient:()=>cloud};
  context.window=context;vm.createContext(context);vm.runInContext(accessSource,context);
  const access=context.WFAccountAccess;
  return {context,access,document,channels,intervals,events,toasts,adapter,saved:()=>copy(saved),reloads:()=>reloads,reloadEvents,emittedEvents,frameRuns:()=>frameRuns,pendingFrames:()=>frames.length,
    advance:ms=>{clock+=ms;},async signed(username='worker'){await access.ready;await access.service.signIn({username,password:PASSWORD});await access.beforeInit();return access;},
    holdReads(){let release;readHold=new Promise(resolve=>{release=resolve;});return()=>{readHold=null;release();};},
    async admin(){const service=core.createService({...adapter,crypto:webcrypto,policy,now:()=>clock});await service.signIn({username:'owner',password:PASSWORD});return service;},
    async settle(){let drained=0;for(let i=0;i<4;i++){while(frames.length){assert(++drained<=50,'permission controls must not create an animation-frame loop');frameRuns++;frames.shift()();}await flush();}assert.equal(frames.length,0,'permission controls must settle');}};
}
function remoteService(role='owner',verifiedFounder=false){
  let error=null,barrier=null;const calls=[];
  const account=row('remote-'+role,role);delete account.credential;
  const state={configured:true,revision:1,currentAccount:account,accounts:[account],audit:[]};
  const client=cloudAPI.create({mode:'remote',config:{enabled:true,endpoint:'https://test.supabase.co/functions/v1/wow-cloud',publishableKey:'public-test-key'},
    fetch:async(_url,options)=>{
      const request=JSON.parse(options.body);calls.push(request.action);if(barrier)await barrier;
      if(error?.code==='NETWORK')throw new TypeError('Network unavailable');
      const status=error?.status||200,body=error?{ok:false,error}:{ok:true,workspaceId:'workspace-1',identity:state,
        ...(request.action==='platform.identity'?{verifiedFounder}:{}),
        ...(request.action==='auth.signIn'?{session:{access_token:'fixture-access',refresh_token:'fixture-refresh',expires_at:Math.floor(Date.now()/1000)+3600}}:{})};
      return {ok:status>=200&&status<300,status,json:async()=>copy(body)};
    }});
  return {client,calls,fail:value=>{error=value;},hold(){let release;barrier=new Promise(resolve=>{release=resolve;});return()=>{barrier=null;release();};}};
}
function businessDatabase(initial){
  const saved=new Map(Object.entries(initial).map(([store,rows])=>[store,new Map(rows.map(row=>[row.id,copy(row)]))]));
  let writeFailure=null;
  const database={transaction(names,mode){
    const stores=Array.isArray(names)?names:[names],draft=new Map(stores.map(name=>[name,new Map([...(saved.get(name)||new Map())].map(([id,row])=>[id,copy(row)]))]));
    let pending=0,aborted=false,finished=false;
    const tx={error:null,abort(){if(aborted||finished)return;aborted=true;setImmediate(()=>tx.onabort?.());},objectStore(name){
      assert(stores.includes(name));const rows=draft.get(name);
      const request=work=>{const req={};pending++;setImmediate(()=>{if(aborted)return;try{req.result=work();req.onsuccess?.();}catch(error){tx.error=error;tx.abort();}pending--;finish();});return req;};
      return {get:id=>request(()=>copy(rows.get(id))),getAll:()=>request(()=>copy([...rows.values()])),getAllKeys:()=>request(()=>[...rows.keys()]),
        put:value=>request(()=>{if(writeFailure){const error=writeFailure;writeFailure=null;throw error;}rows.set(value.id,copy(value));return value.id;}),delete:id=>request(()=>rows.delete(id))};
    }};
    function finish(){if(pending||aborted||finished)return;setImmediate(()=>{if(pending||aborted||finished)return;finished=true;if(mode==='readwrite')for(const [name,rows]of draft)saved.set(name,rows);tx.oncomplete?.();});}
    finish();return tx;
  }};
  return {database,get:(store,id)=>copy(saved.get(store)?.get(id)),failWrite:error=>{writeFailure=error;}};
}
function installStorage(h,initial){
  const business=businessDatabase(initial),ctx=h.context;
  Object.assign(ctx,{db:business.database,WF_MEDIA_STORE:'media',WF_MEDIA_PERSISTED:new Set(),wfDehydrateClone:copy,
    initDB:async()=>business.database,wfStorageWriteError(){},wfDriveOnDatabaseCommit(){},wfReconnectDB:async()=>business.database});
  vm.runInContext(extract('wfWriteBatch')+'\n'+extract('wfReadRaw'),ctx);
  return business;
}

test('identity initialization failures leave every synchronous guard closed',async()=>{
  for(const options of [{readFailure:true},{missingPolicy:true}]){
    const h=runtime(options);await assert.rejects(h.access.ready);await h.settle();
    assert.equal(h.access.can('data.export'),false);assert.equal(h.access.canRoute('dashboard'),false);
    assert.throws(()=>h.access.assert('settings.edit'),/ACCESS_DENIED/);
    assert.throws(()=>h.access.projectRead('settings',{id:'main',bank:'private'}),/ACCESS_DENIED/);
    assert.equal(h.document.documentElement.dataset.wfAccountState,'locked');
  }
});
test('owner and employee links never fall back to local bootstrap when the cloud client cannot load',async()=>{
 for(const mode of ['owner','employee']){
  const tabStorage=new Map([['wf_owner_session_v1','inherited-owner-continuation']]);
  const h=runtime({initial:null,search:'?wf-cloud='+mode+'&workspace=11111111-1111-4111-8111-111111111111',tabStorage});
  await assert.rejects(h.access.ready,{code:'CLOUD_UNCONFIGURED'});await h.settle();
  assert.equal(h.access.isRemote(),true);assert.equal(h.access.hasAccounts(),true);
  assert.equal(h.access.can('settings.edit'),false);assert.equal(h.access.canRoute('dashboard'),false);
  assert.equal(h.document.documentElement.dataset.wfAccountState,'locked');
  assert.equal(h.channels.length,0,'a remote entry must not create the local owner service');
  assert.equal(tabStorage.has('wf_owner_session_v1'),false);
 }
});

test('startup redirects staff to an allowed route and direct calls cannot read financial fields',async()=>{
  const h=runtime();await h.signed();
  assert.equal(h.access.initialRoute('invoices'),'manufacturing');assert.equal(h.access.can('invoices.view'),false);
  assert.throws(()=>h.access.assert('invoices.print'),/ACCESS_DENIED/);
  const raw={id:'i',invNo:'W-1',companyName:'Client',total:9000,items:[{name:'Table',qty:2,price:4500,costSnapshot:{total:20}}]};
  const view=h.access.projectRead('invoices',raw);
  assert.equal(view.total,undefined);assert.equal(view.items[0].price,undefined);assert.equal(view.items[0].costSnapshot,undefined);
  assert.equal(view.items[0].name,'Table');assert.equal(raw.total,9000);
  assert.equal(h.access.cartKey(),'wf_qbl_cart_account_worker');
});

test('a verified remote owner arriving after startup unlocks the waiting application without a password form submission',async()=>{
  const remote=remoteService(),h=runtime({cloud:remote.client,search:'?wf-cloud=owner'});await h.access.ready;
  let initialized=false;const startup=h.access.beforeInit().then(()=>{initialized=true;});await h.settle();
  assert.equal(initialized,false);assert.equal(h.document.documentElement.dataset.wfAccountState,'locked');
  await remote.client.signIn({username:'owner',password:PASSWORD});await h.settle();
  assert.equal(initialized,true,'verified background authentication must release beforeInit');await startup;
  assert.equal(h.document.documentElement.dataset.wfAccountState,'ready');assert.equal(h.access.can('accounts.edit'),true);assert.equal(h.reloads(),0);
});

test('background employee snapshots do not replace the explicit employee login flow',async()=>{
  const remote=remoteService('sales'),h=runtime({cloud:remote.client,search:'?wf-cloud=employee'});await h.access.ready;
  let initialized=false;const startup=h.access.beforeInit().then(()=>{initialized=true;});await h.settle();
  await remote.client.signIn({username:'worker',password:PASSWORD});await h.settle();
  assert.equal(initialized,false);assert.equal(h.document.documentElement.dataset.wfAccountState,'locked');
  h.document.getElementById('wfAccountLoginUsername').value='worker';h.document.getElementById('wfAccountLoginPassword').value=PASSWORD;
  await h.document.getElementById('wfAccountLoginForm').listeners.submit[0]({preventDefault(){}});await startup;
  assert.equal(h.document.documentElement.dataset.wfAccountState,'ready');assert.equal(h.access.can('accounts.edit'),false);
});

test('a live owner restoration can finish application startup when its follow-up refresh temporarily loses the network',async()=>{
  const remote=remoteService();await remote.client.signIn({username:'owner',password:PASSWORD});remote.fail({code:'NETWORK'});
  const h=runtime({cloud:remote.client,search:'?wf-cloud=owner'});await h.access.beforeInit();await h.settle();
  assert.equal(h.document.documentElement.dataset.wfAccountState,'ready');assert.equal(h.access.can('accounts.edit'),true);assert.equal(h.reloads(),0);
});

test('transient owner refresh failures keep open drafts and retry on online or focus',async()=>{
  for(const error of [{code:'NETWORK'},{code:'SERVICE_UNAVAILABLE',status:503}]){
    const remote=remoteService(),h=runtime({cloud:remote.client,search:'?wf-cloud=owner'});await h.signed('owner');
    const draft=h.document.createElement('textarea');draft.value='Unsaved invoice notes';h.document.getElementById('mainContent').append(draft);
    remote.fail(error);h.intervals[0]();await h.settle();
    assert.equal(h.reloads(),0,error.code+' must not discard the current owner workspace');
    assert.equal(h.document.documentElement.dataset.wfAccountState,'ready');assert.equal(draft.value,'Unsaved invoice notes');assert.equal(h.access.can('accounts.edit'),true);
    for(const event of ['online','focus']){
      remote.fail(null);const before=remote.calls.length;h.events.get(event)?.({});await h.settle();
      assert(remote.calls.length>before,event+' must retry the owner connection');assert.equal(h.reloads(),0);
    }
  }
});

test('transient owner resume failure releases its verification gate while preserving the same workspace',async()=>{
  for(const error of [{code:'NETWORK'},{code:'SERVICE_UNAVAILABLE',status:503}]){
    const remote=remoteService(),h=runtime({cloud:remote.client,search:'?wf-cloud=owner'});await h.signed('owner');
    const release=remote.hold();remote.fail(error);
    h.events.get('pageshow')({persisted:true});assert.equal(h.access.can('invoices.print'),false);
    release();await h.settle();assert.equal(h.reloads(),0);assert.equal(h.document.documentElement.dataset.wfAccountState,'ready');assert.equal(h.access.can('invoices.print'),true);
  }
});

test('owner revocation and storage failures still lock instead of being mistaken for a transient connection',async()=>{
  for(const error of [{code:'SESSION_REVOKED',status:401},{code:'ACCOUNT_UNAVAILABLE',status:403},{code:'STORAGE_ERROR',status:503},{code:'IDENTITY_STATE_INVALID',status:500}]){
    const remote=remoteService(),h=runtime({cloud:remote.client,search:'?wf-cloud=owner'});await h.signed('owner');remote.fail(error);
    h.events.get('pageshow')({persisted:true});await h.settle();
    assert.equal(h.reloads(),1,error.code);assert.equal(h.document.documentElement.dataset.wfAccountState,'locked');assert.equal(h.access.can('accounts.edit'),false,error.code);
    assert.throws(()=>h.access.projectRead('invoices',[{id:'invoice-1'}]),/ACCESS_DENIED/,error.code);
  }
});

test('remote employee refresh failures retain the existing fail-closed lock behavior',async()=>{
  const remote=remoteService('sales'),h=runtime({cloud:remote.client,search:'?wf-cloud=employee'});await h.signed('worker');remote.fail({code:'NETWORK'});
  h.intervals[0]();await h.settle();assert.equal(h.reloads(),1);assert.equal(h.document.documentElement.dataset.wfAccountState,'locked');assert.equal(h.access.can('invoices.edit'),false);
});

test('synchronous printing/navigation guards see idle expiry before the periodic refresh',async()=>{
  const h=runtime();await h.signed();assert.equal(h.access.can('manufacturing.print'),true);
  h.advance(30*60*1000);
  assert.equal(h.access.can('manufacturing.print'),false);assert.equal(h.access.canRoute('manufacturing'),false);
  assert.throws(()=>h.access.assert('manufacturing.print'),/ACCESS_DENIED/);
  assert.equal(h.access.service.getSnapshot().currentAccount,null);
});

test('verified owner keeps full application access during inactivity and same-tab reload',async()=>{
  const tabStorage=new Map(),h=runtime({tabStorage});await h.signed('owner');
  h.advance(9*60*60*1000);await h.access.refresh();
  assert.equal(h.access.can('accounts.edit'),true);assert.equal(h.access.can('data.export'),true);
  assert.equal(h.reloads(),0);assert.equal(h.document.documentElement.dataset.wfAccountState,'ready');
  assert(tabStorage.size>0,'verified owner needs a tab-local continuation');
  assert(!JSON.stringify([...tabStorage]).includes(PASSWORD),'the password must never be remembered');
  const reloaded=runtime({initial:h.saved(),tabStorage});await reloaded.access.ready;
  assert.equal(reloaded.access.service.getSnapshot().currentAccount?.role,'owner');
  await reloaded.access.beforeInit();
  assert.equal(reloaded.access.can('accounts.edit'),true);assert.equal(reloaded.access.initialRoute('settings'),'settings');
  assert.equal(reloaded.document.documentElement.dataset.wfAccountState,'ready');
});

test('owner continuation stays in its tab and worker switching cannot inherit it',async()=>{
  const tabStorage=new Map(),h=runtime({tabStorage});await h.signed('owner');
  const independent=runtime({initial:h.saved()});await independent.access.ready;
  assert.equal(independent.access.can('accounts.edit'),false);
  assert.equal(independent.access.service.getSnapshot().currentAccount,null);
  await h.access.requestLock();assert.equal(tabStorage.size,0);
  const worker=runtime({initial:h.saved(),tabStorage});await worker.signed();
  assert.equal(worker.access.can('accounts.edit'),false);assert.equal(worker.access.can('manufacturing.print'),true);
  assert.equal(tabStorage.size,0);
  const workerReload=runtime({initial:worker.saved(),tabStorage});await workerReload.access.ready;
  assert.equal(workerReload.access.service.getSnapshot().currentAccount,null);
  assert.equal(workerReload.access.can('accounts.edit'),false);assert.equal(workerReload.access.can('manufacturing.print'),false);
});

test('blocked browser session storage keeps verified access in memory without reopening on reload',async()=>{
  const h=runtime({storageBlocked:true});await h.signed('owner');
  assert.equal(h.access.can('accounts.edit'),true);
  const reloaded=runtime({initial:h.saved(),storageBlocked:true});await reloaded.access.ready;
  assert.equal(reloaded.access.service.getSnapshot().currentAccount,null);
  assert.equal(reloaded.access.can('accounts.edit'),false);
});

test('cross-tab suspension locks rendered work and invalidates an already prepared merge',async()=>{
  const h=runtime();await h.signed();
  const [operation]=await h.access.prepareWrites([{store:'invoices',type:'merge',id:'i',value:{},merge:latest=>({...latest})}]);
  const admin=await h.admin();await admin.setStatus('worker','suspended');
  await h.channels[0].onmessage({data:{revision:h.saved().revision}});await h.settle();
  assert.equal(h.reloads(),1);assert.equal(h.document.documentElement.dataset.wfAccountState,'locked');
  assert.throws(()=>operation.merge({id:'i'},{}),/ACCESS_DENIED/);
  await assert.rejects(h.access.prepareWrites([{store:'products',value:{id:'p',name:'Changed'}}]),/ACCESS_DENIED/);
});

test('owner setup in another tab stops an already open unconfigured legacy session',async()=>{
  const h=runtime({initial:null});await h.access.beforeInit();assert.equal(h.access.can('data.export'),true);
  const external=core.createService({...h.adapter,crypto:webcrypto,policy});
  await external.bootstrapOwner({name:'Owner',username:'owner',password:PASSWORD});
  await h.channels[0].onmessage({data:{revision:h.saved().revision}});await h.settle();
  assert.equal(h.reloads(),1);assert.equal(h.access.can('data.export'),false);
  assert.throws(()=>h.access.projectRead('invoices',[{id:'i',total:7}]),/ACCESS_DENIED/);
});

test('real shared writer rejects a workshop merge that changes invoice finances',async()=>{
  const h=runtime();await h.signed();const business=installStorage(h,{invoices:[{id:'i',invNo:'W1',total:500,items:[]}],media:[]});
  await assert.rejects(h.context.wfWriteBatch([{store:'invoices',type:'merge',id:'i',value:{},merge:latest=>({...latest,total:1})}]),/ACCESS_DENIED/);
  assert.equal(business.get('invoices','i').total,500);
});

test('real shared writer returns only the permitted projection after a workshop merge',async()=>{
  const h=runtime();await h.signed();
  const business=installStorage(h,{invoices:[{id:'i',invNo:'W1',companyName:'Client',total:500,items:[],manufacturingTicket:{version:1,id:'t',invoiceId:'i',lines:[]}}],media:[]});
  const [result]=await h.context.wfWriteBatch([{store:'invoices',type:'merge',id:'i',value:{},merge:latest=>({...latest,manufacturingTicket:{...latest.manufacturingTicket,updatedAt:'2026-11-21T11:00:00.000Z'}})}]);
  assert.equal(result.total,undefined);assert.equal(result.invNo,'W1');assert.equal(result.manufacturingTicket.updatedAt,'2026-11-21T11:00:00.000Z');
  assert.equal(business.get('invoices','i').total,500);await h.settle();
  const event=h.saved().audit.at(-1);assert.equal(event.action,'manufacturing.edit');assert.equal(event.actorId,'worker');
});

test('raw-key reads preserve owner cashbox keys and never bypass staff record projections',async()=>{
  const h=runtime();await h.signed('owner');
  installStorage(h,{settings:[{id:'cashbox:cash-1',balance:20},{id:'main',bank:'Private'}],media:[]});
  const keys=await h.context.wfReadRaw('settings','getAllKeys');
  assert.deepEqual(Array.from(keys),['cashbox:cash-1','main']);
  const staff=runtime();await staff.signed();installStorage(staff,{settings:[{id:'cashbox:cash-1',balance:20},{id:'main',bank:'Private'}],media:[]});
  const visible=await staff.context.wfReadRaw('settings','getAllKeys');
  assert(!Array.from(visible).includes('cashbox:cash-1'));
});

test('archive merge activity is attributed to archive permission instead of manufacturing',async()=>{
  const h=runtime({initial:identity([row('owner'),row('worker','custom',['archives.view','archives.edit'])])});await h.signed();
  const business=installStorage(h,{invoices:[{id:'i',invNo:'W1',items:[],archived:false}],media:[]});
  await h.context.wfWriteBatch([{store:'invoices',type:'merge',id:'i',value:{kind:'archive'},merge:latest=>({...latest,archived:true})}]);
  await h.settle();assert.equal(business.get('invoices','i').archived,true);
  const event=h.saved().audit.findLast(event=>event.action==='archives.edit');
  assert(event,'successful archive commits must be attributed to their actor');assert.equal(event.actorId,'worker');
});

test('new sales invoices capture raw product costs privately and return no cost snapshot to the employee',async()=>{
  const h=runtime({initial:identity([row('owner'),row('worker','sales')])});await h.signed();
  const products=[{id:'p',name:'Table',priceUSD:100,costing:{version:1,unitCostUSD:37.5,currency:'USD',rates:{usdTry:40,usdEur:0.9},updatedAt:'2026-11-20T10:00:00.000Z'}}];
  const business=installStorage(h,{invoices:[],products,media:[]});
  // Exercise the existing saveInvoice capture step against the employee's projection.
  const draft=costCore.captureInvoiceCosts({id:'new',invNo:'W2',items:[{lineId:'l1',productId:'p',name:'Table',qty:2,priceUSD:100}]},h.access.projectRead('products',products));
  assert.equal(draft.items[0].costSnapshot,null);
  const [saved]=await h.context.wfWriteBatch([{store:'invoices',value:draft,returnRecord:true}]);
  assert.equal(business.get('invoices','new').items[0].costSnapshot.unitCostUSD,37.5);
  assert.equal(saved.items[0].costSnapshot,undefined);assert.equal(saved.items[0].priceUSD,100);
});

test('staff invoice edits preserve historical unknown costs while privately capturing only new lines',async()=>{
  const h=runtime({initial:identity([row('owner'),row('worker','sales')])});await h.signed();
  const old={id:'i',invNo:'W1',items:[{lineId:'old-line',productId:'p1',name:'Old table',qty:1,priceUSD:100,costSnapshot:null}]};
  const products=[{id:'p1',costing:{unitCostUSD:90,currency:'USD'}},{id:'p2',costing:{unitCostUSD:20,currency:'USD'}}];
  const business=installStorage(h,{invoices:[old],products,media:[]});
  const visible=h.access.projectRead('invoices',old);visible.items.push({lineId:'new-line',productId:'p2',name:'New chair',qty:2,priceUSD:40});
  const draft=costCore.captureInvoiceCosts(visible,h.access.projectRead('products',products));
  const [saved]=await h.context.wfWriteBatch([{store:'invoices',value:draft,requireExisting:true,returnRecord:true}]);
  const stored=business.get('invoices','i');assert.equal(stored.items[0].costSnapshot,null);assert.equal(stored.items[1].costSnapshot.unitCostUSD,20);
  assert(saved.items.every(line=>line.costSnapshot===undefined));
});

test('a failed privately enriched invoice write neither publishes nor adds a success activity event',async()=>{
  const h=runtime({initial:identity([row('owner'),row('worker','sales')])});await h.signed();
  const business=installStorage(h,{invoices:[],products:[{id:'p',costing:{unitCostUSD:25,currency:'USD'}}],media:[]});
  business.failWrite(Object.assign(Error('quota'),{name:'QuotaExceededError'}));let published=false;
  await assert.rejects(h.context.wfWriteBatch([{store:'invoices',returnRecord:true,value:{id:'new',items:[{productId:'p',qty:1,costSnapshot:null}]}}]).then(()=>{published=true;}),/quota/);
  await h.settle();assert.equal(published,false);assert.equal(business.get('invoices','new'),undefined);
  assert(!h.saved().audit.some(event=>event.action==='invoices.edit'));
});

test('sales document bank coordinates remain printable while workshop accounts and bank management stay denied',async()=>{
  const raw={id:'main',companyName:'WOW',bankName:'Bank',beneficiary:'Company',ibanUSD:'TR-EXAMPLE',swift:'EXAMPLE',nextNoExt:100};
  const sales=runtime({initial:identity([row('owner'),row('worker','sales')])});await sales.signed();
  const view=sales.access.projectRead('settings',raw);assert.equal(view.bankName,'Bank');assert.equal(view.ibanUSD,'TR-EXAMPLE');
  assert.equal(sales.access.can('settings.edit'),false);
  const workshop=runtime();await workshop.signed();const restricted=workshop.access.projectRead('settings',raw);
  assert.equal(restricted.bankName,undefined);assert.equal(restricted.ibanUSD,undefined);assert.equal(restricted.companyName,'WOW');
});

test('explicit account locking records logout before reloading away the active identity transaction',async()=>{
  const h=runtime();await h.signed('owner');await h.access.requestLock();
  assert.equal(h.reloads(),1);assert.equal(h.access.service.getSnapshot().currentAccount,null);
  assert(h.reloadEvents[0].some(event=>event.action==='logout'),'reload must wait for the logout audit commit');
});

test('a restored frozen page cannot print using cached permissions while its identity refresh is pending',async()=>{
  const h=runtime();await h.signed();const admin=await h.admin();await admin.setStatus('worker','suspended');
  const release=h.holdReads();
  try{
    h.events.get('pageshow')({persisted:true});
    assert.equal(h.access.can('manufacturing.print'),false,'resume must verify persistent status before a synchronous privileged action');
    assert.throws(()=>h.access.assert('manufacturing.print'),/ACCESS_DENIED/);
  }finally{release();}
  await h.settle();assert.equal(h.reloads(),1);
});

test('denied controls override important layout rules and restore their original inline display when allowed',async()=>{
  const h=runtime();await h.access.ready;
  await h.access.service.signIn({username:'worker',password:PASSWORD});
  const sidebar=h.document.getElementById('sidebar');
  const deniedGroup=h.document.createElement('div');deniedGroup.className='wf-nav-group';deniedGroup.style.setProperty('display','grid');
  const showroom=h.document.createElement('button');showroom.id='wfShowroomCardsNav';showroom.className='nav-item';showroom.style.setProperty('display','inline-flex','important');
  const statement=h.document.createElement('button');statement.id='wfAccountStatementNav';statement.className='nav-item';
  deniedGroup.append(showroom,statement);sidebar.append(deniedGroup);
  const allowedGroup=h.document.createElement('div');allowedGroup.className='wf-nav-group';
  const manufacturing=h.document.createElement('button');manufacturing.className='nav-item';manufacturing.setAttribute('data-page','manufacturing');manufacturing.style.setProperty('display','inline-grid','important');
  allowedGroup.append(manufacturing);sidebar.append(allowedGroup);
  await h.settle();
  assert.equal(h.access.requiredForElement(showroom),'products.print');assert.equal(h.access.requiredForElement(statement),'payments.view');
  for(const element of [showroom,statement,deniedGroup]){
    assert.equal(element.hasAttribute('data-wf-access-hidden'),true);
    assert.equal(element.style.getPropertyValue('display'),'none');assert.equal(element.style.getPropertyPriority('display'),'important');
  }
  assert.equal(manufacturing.style.getPropertyValue('display'),'inline-grid');assert.equal(manufacturing.style.getPropertyPriority('display'),'important');
  assert.equal(allowedGroup.hasAttribute('data-wf-access-hidden'),false);
  const before=h.frameRuns();for(let i=0;i<10;i++)h.access.syncControls();await h.settle();
  assert.equal(h.frameRuns(),before+1,'repeated sync requests and visibility mutations must coalesce to one frame');
  assert.equal(h.pendingFrames(),0);
  // Before application boot, a valid owner login grants these same DOM controls.
  await h.access.service.signIn({username:'owner',password:PASSWORD});await h.settle();
  for(const element of [showroom,statement,deniedGroup])assert.equal(element.hasAttribute('data-wf-access-hidden'),false);
  assert.equal(showroom.style.getPropertyValue('display'),'inline-flex');assert.equal(showroom.style.getPropertyPriority('display'),'important');
  assert.equal(statement.style.getPropertyValue('display'),'');assert.equal(statement.style.getPropertyPriority('display'),'');
  assert.equal(deniedGroup.style.getPropertyValue('display'),'grid');assert.equal(deniedGroup.style.getPropertyPriority('display'),'');
  assert.equal(manufacturing.style.getPropertyValue('display'),'inline-grid');assert.equal(manufacturing.style.getPropertyPriority('display'),'important');
  const settled=h.frameRuns();await h.settle();assert.equal(h.frameRuns(),settled);
});

test('a reused bottom navigation control restores its display after its denied route metadata is removed',async()=>{
  const h=runtime();await h.signed();
  const button=h.document.createElement('button');button.className='bnav-btn';button.style.setProperty('display','inline-flex');button.setAttribute('data-page','invoices');
  h.document.getElementById('bottomNav').append(button);await h.settle();
  assert.equal(button.style.getPropertyValue('display'),'none');assert.equal(button.style.getPropertyPriority('display'),'important');
  assert.equal(button.hasAttribute('data-wf-access-hidden'),true);
  button.removeAttribute('data-page');await h.settle();
  assert.equal(h.access.requiredForElement(button),null);assert.equal(button.hasAttribute('data-wf-access-hidden'),false);
  assert.equal(button.style.getPropertyValue('display'),'inline-flex');assert.equal(button.style.getPropertyPriority('display'),'');
  assert.equal(h.pendingFrames(),0);
});

test('resuming a valid session announces access after the verification gate reopens',async()=>{
  const h=runtime();await h.signed();await h.settle();h.emittedEvents.length=0;
  const release=h.holdReads();
  try{
    h.events.get('pageshow')({persisted:true});await h.settle();
    assert.equal(h.access.can('manufacturing.print'),false);
    assert(!h.emittedEvents.some(event=>event.type==='wf-account-access-change'&&event.canPrint));
  }finally{release();}
  await h.settle();
  assert.equal(h.access.can('manufacturing.print'),true);assert.equal(h.reloads(),0);
  const accessEvents=h.emittedEvents.filter(event=>event.type==='wf-account-access-change');
  assert(accessEvents.length>0,'navigation must receive a fresh access event even when the account metadata has not changed');
  assert.equal(accessEvents.at(-1).canPrint,true,'listeners must see restored permissions when the event is dispatched');
});

test('founder check requires the current online server grant and clears on offline',async()=>{
 for(const grant of [false,true]){
   const remote=remoteService('owner',grant);
   const h=runtime({search:'?wf-cloud=employee',cloud:remote.client});
   await h.signed('remote-owner');await h.settle();
   const badge=h.document.getElementById('wfAccountSession').children[2];
   assert(remote.calls.includes('platform.identity'));assert.equal(badge.hidden,!grant);
   h.context.navigator={onLine:false};h.events.get('offline')();assert.equal(badge.hidden,true);
 }
 const local=runtime();await local.signed('owner');await local.settle();
 assert.equal(local.document.getElementById('wfAccountSession').children[2].hidden,true);
});

test('pending owner sign-in remains locked until live approval, then opens the app and celebrates',async()=>{
  const remote=remoteService(),workspaceId='11111111-1111-4111-8111-111111111111';
  let first=true,poll;
  const service={...remote.client,signIn:async input=>{
    if(first){first=false;assert.match(input.approvalToken,/^[0-9a-f]{64}$/);return {workspaceId,pendingApproval:true};}
    assert.equal(input.password,PASSWORD);return remote.client.signIn(input);
  },request:async(action,body,options)=>{
    if(action!=='auth.ownerApprovalStatus')return remote.client.request(action,body,options);
    assert.equal(body.workspaceId,workspaceId);assert.equal(options.authenticated,false);
    return {workspaceId,state:'approved'};
  }};
  const h=runtime({cloud:service,search:'?wf-cloud=employee&workspace='+workspaceId});
  h.context.setTimeout=(fn,delay)=>{if(delay===4000)poll=fn;return 1;};h.context.clearTimeout=()=>{};
  await h.access.ready;const opening=h.access.beforeInit();await h.settle();
  h.document.getElementById('wfAccountLoginUsername').value='owner';h.document.getElementById('wfAccountLoginPassword').value=PASSWORD;
  const form=h.document.getElementById('wfAccountLoginForm'),submission=form.listeners.submit[0]({preventDefault(){}});
  await h.settle();assert.equal(h.document.documentElement.dataset.wfAccountState,'locked');assert.match(h.document.getElementById('wfAccountLoginStatus').textContent,/under review/);
  poll();await submission;await opening;
  assert.equal(h.document.documentElement.dataset.wfAccountState,'ready');
  const notice=h.document.querySelector('.wf-activation-notice');
  assert.match(notice.textContent,/Congratulations/);assert.equal(notice.querySelectorAll('i').length,9);
});
