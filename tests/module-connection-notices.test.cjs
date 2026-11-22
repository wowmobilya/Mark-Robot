'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm');
const {readFileSync}=require('node:fs'),path=require('node:path');
const policy=require('../accounts-policy.js');
const source=readFileSync(path.join(__dirname,'../modules/platform/registry.js'),'utf8');
const settle=()=>new Promise(resolve=>setImmediate(resolve));
const deferred=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return {promise,resolve,reject};};

function fixture({language='en',connection='idle',linkedOwner=false,configured=true,localRole='owner',offlineGrant=false,published=false,section='communications'}={}){
  class Element{
    constructor(tag='div'){this.tagName=tag.toUpperCase();this.children=[];this.dataset={};this.attributes=new Map();this.listeners=new Map();this.ownText='';this.disabled=false;
      this.classList={add(){},toggle(){}};}
    set textContent(value){this.ownText=String(value);this.children=[];}
    get textContent(){return this.ownText+this.children.map(child=>child.textContent).join('');}
    append(...children){this.children.push(...children);}
    replaceChildren(...children){this.ownText='';this.children=children;}
    setAttribute(key,value){this.attributes.set(key,String(value));}
    getAttribute(key){return this.attributes.get(key)||null;}
    addEventListener(name,handler){if(!this.listeners.has(name))this.listeners.set(name,[]);this.listeners.get(name).push(handler);}
    async fire(name){if(this.disabled)return;for(const handler of this.listeners.get(name)||[])await handler({target:this});}
  }
  const account=(id,role='owner')=>({id,role,status:'active',sessionVersion:1,permissions:['communications.view','settings.view']});
  let local={configured:true,currentAccount:account('local-owner',localRole)},route=section,refreshAction=async()=>{};
  let state={mode:'local',authenticated:false,linkedOwner,connection,workspaceId:'workspace',userId:null,currentAccount:null,authGeneration:0};
  const subscriptions=new Set(),events=new Map(),definitions=new Map(),mounts=[],calls={refresh:0,settings:0};
  const surface={body:new Element(),page:new Element(),actions:new Element()};
  const document={createElement:tag=>new Element(tag),getElementById:()=>new Element(),querySelector:()=>({id:'page-'+route})};
  const root={document,navigator:{onLine:true},WFAccountPolicy:policy,showPage:id=>{route=id;},
    WFAccountAccess:{service:{getSnapshot:()=>local},can:key=>policy.can(local.currentAccount,key)},
    WFCloud:{getSnapshot:()=>state,getConfig:()=>({endpoint:'https://cloud.fixture.invalid'}),isConfigured:()=>configured,
      subscribe:fn=>subscriptions.add(fn),refresh:async()=>{calls.refresh++;return refreshAction();}},
    WFCloudSettings:{open(){calls.settings++;}},
    WFOperations:{locale:()=>language,icon:()=>'',register:def=>{definitions.set(def.id,def);return surface;},notify(){}},
    addEventListener(name,fn){if(!events.has(name))events.set(name,[]);events.get(name).push(fn);}};
  if(published){
    root.WOW_CLOUD_CONFIG={productionOrigin:'https://markrobot.wowfurniture.com.tr'};
    root.location={origin:root.WOW_CLOUD_CONFIG.productionOrigin,assign(url){calls.destination=url;}};
    root.WFCloud.entryUrl=()=>root.location.origin+'/?wf-cloud=employee&workspace=00000000-0000-4000-8000-000000000001#dashboard';
  }
  if(offlineGrant){
    // The grant verifier supplies this authorized saved-copy projection; its
    // signature/device checks are exercised in offline-platform-grant.test.mjs.
    const projection={mode:'local',authenticated:false,offlineVerified:true,workspaceId:'workspace',userId:'cloud-owner',
      currentAccount:account('cloud-owner'),role:'owner',sessionVersion:1,authGeneration:0,lastVerifiedAt:1000,grantSeal:'verified-grant'};
    root.WFModuleStore={create:()=>({})};
    root.WFOfflineOwnerGrant={retirement:()=>'initial',create:()=>({active:()=>projection,update:async()=>{},recheck(){},retire(){}})};
  }
  vm.runInNewContext(source,{window:root,queueMicrotask,Date,URL});
  root.WFModules.register({id:section,permission:policy.permissionForRoute(section),title:{en:'Customer communications'},mount({container}){
    const record={disposed:false};mounts.push(record);container.append(Object.assign(new Element('p'),{textContent:'Private correspondence'}));
    return {dispose(){record.disposed=true;}};
  }});
  const publish=()=>{for(const fn of subscriptions)fn();};
  const walk=node=>[node,...node.children.flatMap(walk)];
  return {root,surface,mounts,calls,notice:()=>surface.body.children[0],buttons:()=>walk(surface.body).filter(node=>node.tagName==='BUTTON'),
    setCloud(patch){state={...state,...patch};publish();},
    setLocal(patch){local={...local,...patch};for(const fn of events.get('wf-account-access-change')||[])fn();},
    onRefresh(fn){refreshAction=fn;},
    verify(){state={...state,authenticated:true,connection:'online',authGeneration:state.authGeneration+1,userId:'cloud-owner',sessionVersion:1,currentAccount:account('cloud-owner')};publish();},
    setLanguage(next){language=next;definitions.get('communications').onLanguage();}};
}

test('an unverified section shows a busy check without setup controls in all five languages',async()=>{
  const notices=new Set();
  for(const language of ['ar','en','tr','fr','ru']){
    const f=fixture({language,connection:'checking',linkedOwner:true});await settle();
    assert.equal(f.notice().getAttribute('role'),'status');
    assert.equal(f.notice().getAttribute('aria-busy'),'true');
    assert.equal(f.buttons().length,0,'verification must not offer a server-setup detour');
    assert.equal(f.mounts.length,0,'a pending check is not authorization');
    notices.add(f.notice().textContent);
  }
  assert.equal(notices.size,5,'each supported language has a verification notice');
});

for(const connection of ['offline','error'])test('a linked owner retries '+connection+' through cloud verification, then mounts only after a verified session',async()=>{
  const f=fixture({connection,linkedOwner:true}),held=deferred();await settle();
  const retry=f.buttons()[0];assert.equal(retry?.textContent,'Try again');assert.equal(f.mounts.length,0);
  f.onRefresh(()=>held.promise);const click=retry.fire('click');await settle();
  assert.equal(f.calls.refresh,1);assert.equal(f.calls.settings,0);
  assert.equal(f.notice().getAttribute('aria-busy'),'true');assert.equal(f.buttons().length,0);
  assert.equal(f.mounts.length,0);assert(!f.surface.body.textContent.includes('Private correspondence'));
  f.verify();held.resolve();await click;await settle();
  assert.equal(f.mounts.length,1);assert(f.surface.body.textContent.includes('Private correspondence'));
  assert.equal(f.calls.settings,0);
});

test('a failed linked-owner retry stays locked and offers another retry without opening settings',async()=>{
  const f=fixture({connection:'error',linkedOwner:true});await settle();
  f.onRefresh(async()=>{throw Object.assign(Error('NETWORK'),{code:'NETWORK'});});
  await f.buttons()[0].fire('click');await settle();
  assert.equal(f.calls.refresh,1);assert.equal(f.calls.settings,0);assert.equal(f.mounts.length,0);
  assert.equal(f.buttons()[0]?.textContent,'Try again');assert.equal(f.buttons()[0]?.disabled,false);
  assert.notEqual(f.notice().getAttribute('aria-busy'),'true');
});

test('an unlinked configured owner uses the existing sign-in settings gate with localized admin wording',async()=>{
  const labels={ar:'الدخول بحساب الأدمن',en:'Sign in as admin',tr:'Yönetici hesabıyla giriş',fr:'Connexion administrateur',ru:'Войти как администратор'};
  for(const [language,caption] of Object.entries(labels)){
    const f=fixture({language});await settle();
    assert.equal(f.buttons()[0]?.textContent,caption);await f.buttons()[0].fire('click');
    assert.equal(f.calls.settings,1);assert.equal(f.calls.refresh,0);assert.equal(f.mounts.length,0);
  }
});

test('setup wording remains for an unconfigured server and a local worker cannot inherit owner retry',async()=>{
  const unconfigured=fixture({configured:false});await settle();assert.equal(unconfigured.buttons()[0]?.textContent,'Set up server connection');
  await unconfigured.buttons()[0].fire('click');assert.equal(unconfigured.calls.settings,1);assert.equal(unconfigured.calls.refresh,0);assert.equal(unconfigured.mounts.length,0);
  const worker=fixture({connection:'offline',linkedOwner:true,localRole:'custom'});await settle();
  assert.equal(worker.buttons().length,0);assert.equal(worker.calls.refresh,0);assert.equal(worker.mounts.length,0);
});

test('a retired owner retry control cannot recover after the local account has changed',async()=>{
  const f=fixture({connection:'offline',linkedOwner:true});await settle();const retry=f.buttons()[0];
  f.setLocal({currentAccount:{id:'local-worker',role:'custom',status:'active',sessionVersion:1,permissions:['communications.view','settings.view']}});await settle();
  await retry.fire('click');await settle();assert.equal(f.calls.refresh,0);assert.equal(f.mounts.length,0);
});

test('a restored cloud session still cannot mount under a different remote local identity',async()=>{
  const f=fixture({connection:'checking',linkedOwner:true});await settle();f.setCloud({mode:'remote'});f.verify();await settle();
  assert.equal(f.mounts.length,0);assert.equal(f.root.WFModules.can('communications.view'),false);
});

for(const connection of ['checking','offline','error'])test('a valid saved-copy grant keeps correspondence live-only while showing the actual '+connection+' state',async()=>{
  const f=fixture({connection,linkedOwner:true,offlineGrant:true});await settle();
  assert.equal(f.root.WFModules.can('gallery.view'),true,'the saved-copy grant is usable for an allowed offline section');
  assert.equal(f.root.WFModules.can('communications.view'),false);assert.equal(f.mounts.length,0);
  let click,held;
  if(connection==='checking'){
    assert.equal(f.notice().getAttribute('aria-busy'),'true');assert.equal(f.buttons().length,0);
  }else{
    assert.equal(f.buttons()[0]?.textContent,'Try again');held=deferred();
    f.onRefresh(()=>{f.setCloud({connection:'checking'});return held.promise;});click=f.buttons()[0].fire('click');await settle();
    assert.equal(f.calls.refresh,1);assert.equal(f.notice().getAttribute('aria-busy'),'true');assert.equal(f.buttons().length,0);
  }
  assert.equal(f.calls.settings,0);assert.equal(f.mounts.length,0);
  f.verify();held?.resolve();if(click)await click;await settle();
  assert.equal(f.mounts.length,1);assert(f.surface.body.textContent.includes('Private correspondence'));
});

test('published chat leads local workers directly to company login and returns to chat',async()=>{
  const f=fixture({published:true,localRole:'custom',section:'chat'});await settle();
  assert.equal(f.root.WFAccountAccess.can('settings.view'),false);
  assert.equal(f.buttons()[0]?.textContent,'Sign in to your company');
  await f.buttons()[0].fire('click');
  const destination=new URL(f.calls.destination);
  assert.equal(destination.origin,f.root.location.origin);
  assert.equal(destination.searchParams.get('wf-cloud'),'employee');
  assert.equal(destination.searchParams.get('workspace'),'00000000-0000-4000-8000-000000000001');
  assert.equal(destination.hash,'#chat');
  assert.equal(f.calls.settings,0);assert.equal(f.mounts.length,0);
});
