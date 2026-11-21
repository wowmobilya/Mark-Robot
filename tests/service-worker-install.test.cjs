'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'..','sw.js'),'utf8');
const base='https://example.test/app/';
const url=value=>new URL(typeof value==='string'?value:value.url,base).href;
const response=tag=>({ok:true,tag,clone(){return response(tag);}});
function fixture({fail=()=>false,seed=false,networkResponse}={}){
  let active=0,maximum=0,skip=0;const calls=[],handlers={},stores=new Map();
  const previous=new Map();if(seed)stores.set('wow-furniture-v205-test',previous);
  const cache=name=>({
    async match(request){return stores.get(name)?.get(url(request))?.clone();},
    async put(request,value){stores.get(name).set(url(request),value.clone());},
    async add(request){
      calls.push(url(request));maximum=Math.max(maximum,++active);
      try{await new Promise(resolve=>setImmediate(resolve));if(fail(url(request)))throw new Error('asset unavailable');await this.put(request,response('network:'+url(request)));}
      finally{active--;}
    }
  });
  const context={importScripts(){},URL,Response:{error:()=>({ok:false,type:'error'})},Request:class{constructor(value,options={}){this.url=url(value);this.cache=options.cache;}},
    fetch:async request=>{calls.push(url(request));if(fail(url(request)))throw new Error('network unavailable');return networkResponse?.(request)||response('network:'+url(request));},
    caches:{async keys(){return [...stores.keys()];},async open(name){if(!stores.has(name))stores.set(name,new Map());return cache(name);},async delete(name){return stores.delete(name);},async match(request){for(const data of stores.values())if(data.has(url(request)))return data.get(url(request)).clone();}},
    self:{location:{origin:'https://example.test',href:base+'sw.js'},addEventListener(name,fn){handlers[name]=fn;},skipWaiting(){skip++;return Promise.resolve();},clients:{claim:async()=>{}}},console};
  vm.runInNewContext(source+'\nthis.qa={CACHE_NAME,urlsToCache};',context);
  const seeded=Array.isArray(seed)?seed:seed?context.qa.urlsToCache.filter(value=>value.startsWith('./')&&/[?&]v=/.test(value)):[];
  for(const asset of seeded)previous.set(url(asset),response('previous:'+url(asset)));
  function install(){let pending;handlers.install({waitUntil(value){pending=value;}});return pending;}
  function activate(){let pending;handlers.activate({waitUntil(value){pending=value;}});return pending;}
  function request(asset,options={}){let pending;handlers.fetch({request:{url:url(asset),method:'GET',mode:'cors',...options},respondWith(value){pending=value;}});return pending;}
  return{context,install,activate,request,calls,stores,get maximum(){return maximum;},get skip(){return skip;}};
}
test('offline installation bounds network work and activates only after the required shell is ready',async()=>{
  const f=fixture(),pending=f.install();assert.equal(f.skip,0);await pending;
  assert(f.maximum<=6,'at most six asset requests at once');assert.equal(f.skip,1);
  const stored=f.stores.get(f.context.qa.CACHE_NAME);
  assert(stored.has(url('./index.html')));assert(stored.has(url('./')));
  assert.equal(f.calls.filter(value=>value===url('./')||value===url('./index.html')).length,1,'fetch the HTML once for both cache aliases');
  for(const asset of ['purchase-planner.js?v=3','invoice-preview.css?v=1','label-reprint-history.js?v=2','accounts-access.js?v=4','accounts-settings.css?v=1','modules/platform/cloud/wow-cloud-client.js?v=1','modules/platform/cloud/wow-cloud-sync.js?v=1','modules/platform/cloud/wow-cloud-settings.js?v=1','modules/platform/push/wow-push-device.js?v=2','modules/platform/push/wow-push-client.js?v=2','modules/platform/push/wow-push-settings.js?v=2','modules/platform/push/wow-push-sw.js?v=2'])assert(stored.has(url('./'+asset)));
});
test('updates reuse exactly versioned prior assets and fetch fresh unversioned configuration and HTML',async()=>{
  const f=fixture({seed:true});await f.install();
  assert.equal(f.calls.some(value=>/[?&]v=/.test(value)),false,'unchanged versioned assets do not download twice');
  assert(f.calls.includes(url('./index.html')));assert(f.calls.includes(url('./google-drive-config.js')));
  const stored=f.stores.get(f.context.qa.CACHE_NAME);
  assert.match(stored.get(url('./package-labels.js?v=8')).tag,/^previous:/);
});
test('a required script failure retains the old worker, while optional audio failure does not block the shell',async()=>{
  const required=fixture({fail:value=>value.includes('/purchase-planner.js')});
  await assert.rejects(required.install());assert.equal(required.skip,0);
  const optional=fixture({fail:value=>value.includes('/assets/robot-identity/')});
  await optional.install();assert.equal(optional.skip,1);assert(optional.stores.get(optional.context.qa.CACHE_NAME).has(url('./index.html')));
});
test('an update downloads new versions and retains installed speech compatibility imports after activation',async()=>{
  const aliases=[1,2,4].map(version=>'./reference-voice.js?v='+version);
  const unchanged='./vendor/JsBarcode.code128.min.js?v=3.11.5';
  const f=fixture({seed:['./index.html','./speech-controls.js?v=4','./accounts-core.js?v=1','./accounts-access.js?v=1',unchanged,...aliases]});
  await f.install();
  assert(f.calls.includes(url('./speech-controls.js?v=5')),'changed code must be downloaded');
  assert(f.calls.includes(url('./purchase-planner.js?v=3')),'new modules must be downloaded');
  for(const asset of ['accounts-core.js?v=3','accounts-access.js?v=4','modules/platform/cloud/wow-cloud-client.js?v=1','modules/platform/cloud/wow-cloud-sync.js?v=1','modules/platform/push/wow-push-sw.js?v=2'])assert(f.calls.includes(url('./'+asset)),'current owner and cloud code must replace the previous assets');
  assert.equal(f.calls.includes(url(unchanged)),false,'only exact unchanged URLs may be reused');
  assert.equal(f.calls.includes(url('./speech-controls.js?v=4')),false);
  await f.activate();
  assert.equal(f.stores.has('wow-furniture-v205-test'),false);
  const current=f.stores.get(f.context.qa.CACHE_NAME);
  for(const alias of aliases)assert.match(current.get(url(alias)).tag,/^previous:/);
  assert.equal(current.has(url('./speech-controls.js?v=4')),false);
});
test('failed HTML, CSS or JavaScript installation leaves every previous-cache entry intact',async()=>{
  for(const asset of ['./index.html','./invoice-preview.css?v=1','./purchase-planner.js?v=3']){
    const f=fixture({seed:['./index.html','./speech-controls.js?v=4','./reference-voice.js?v=1'],fail:value=>value===url(asset)});
    const previous=f.stores.get('wow-furniture-v205-test'),before=[...previous].map(([key,value])=>[key,value.tag]);
    await assert.rejects(f.install());
    assert.equal(f.skip,0,asset+' must not activate the incomplete shell');
    assert.deepEqual([...f.stores.get('wow-furniture-v205-test')].map(([key,value])=>[key,value.tag]),before);
  }
});
test('the released HTML and offline shell use the same existing local script and stylesheet versions',()=>{
  const f=fixture(),root=path.join(__dirname,'..'),html=fs.readFileSync(path.join(root,'index.html'),'utf8');
  const assets=new Set(f.context.qa.urlsToCache.map(value=>url(value)));
  const references=[...html.matchAll(/(?:src|href)=["']([^"']+\.(?:m?js|css)(?:\?[^"']*)?)["']/g)]
    .map(match=>match[1]).filter(value=>! /^(?:https?:|data:|blob:)/.test(value));
  assert(references.length>100,'check the complete application shell');
  for(const reference of references)assert(assets.has(url(reference)),reference+' must use the same precached version');
  for(const asset of f.context.qa.urlsToCache.filter(value=>value.startsWith('./')&&value!=='./'))
    assert(fs.existsSync(path.join(root,asset.split('?')[0])),asset+' must exist before release');
});
test('warm navigation uses exact active-release asset hits without issuing network requests',async()=>{
  const f=fixture();await f.install();f.calls.length=0;
  const asset='./modules/platform/cloud/wow-cloud-client.js?v=1',cached=f.stores.get(f.context.qa.CACHE_NAME).get(url(asset));
  assert.equal((await f.request(asset)).tag,cached.tag);assert.equal(f.calls.length,0);
  f.stores.get(f.context.qa.CACHE_NAME).delete(url(asset));
  assert.match((await f.request(asset)).tag,/^network:/);assert.deepEqual(f.calls,[url(asset)]);
});
test('configuration, navigation, unlisted versions and sensitive requests keep the network path',async()=>{
  const f=fixture();await f.install();f.calls.length=0;
  await f.request('./modules/platform/cloud/wow-cloud-config.js?v=1');
  await f.request('./index.html',{mode:'navigate'});
  await f.request('./modules/platform/cloud/wow-cloud-client.js?v=900');
  await f.request('./modules/platform/cloud/wow-cloud-client.js?v=1',{cache:'no-store'});
  await f.request('https://example.supabase.co/rest/v1/private',{headers:{has:()=>true}});
  await f.request('./sensitive',{headers:{has:key=>key==='authorization'}});
  assert.deepEqual(f.calls,[url('./modules/platform/cloud/wow-cloud-config.js?v=1'),url('./index.html'),url('./modules/platform/cloud/wow-cloud-client.js?v=900'),url('./modules/platform/cloud/wow-cloud-client.js?v=1'),'https://example.supabase.co/rest/v1/private',url('./sensitive')]);
  assert.equal(f.stores.get(f.context.qa.CACHE_NAME).has('https://example.supabase.co/rest/v1/private'),false);
  assert.equal(f.stores.get(f.context.qa.CACHE_NAME).has(url('./sensitive')),false);
});

test('withdrawable share HTML and images stay network-only and cannot replay a poisoned cache offline',async()=>{
 let offline=false;
 const f=fixture({fail:value=>offline&&value.includes('/share/')} );await f.install();
 const targets=['https://example.test/share/aaaaaaaa-1111-4111-8111-111111111111/',
  'https://example.test/share/aaaaaaaa-1111-4111-8111-111111111111/image/0123456789abcdef.jpeg'];
 for(const target of targets){
  await f.request(target,{mode:'navigate'});await new Promise(resolve=>setImmediate(resolve));
  assert.equal(f.stores.get(f.context.qa.CACHE_NAME).has(target),false,'no publication enters the application cache');
  f.stores.get(f.context.qa.CACHE_NAME).set(target,response('withdrawn copy'));
 }
 offline=true;
 for(const target of targets){const result=await f.request(target,{mode:'navigate'});
  assert.equal(result.ok,false);assert.equal(result.type,'error','no cached snapshot and no app-shell fallback');}
 assert.equal((await f.request('./modules/gallery/core.js?v=1')).ok,true,'ordinary installed code remains available');
});

test('credential callbacks never enter CacheStorage request keys or navigation fallback',async()=>{
 let offline=false;const f=fixture({fail:()=>offline});await f.install();
 for(const key of ['token_hash','access_token','refresh_token','id_token','code','challenge','wf-customer']){
  const target=url('./?'+key+'=fixture-only-proof');
  await f.request(target,{mode:'navigate'});await new Promise(resolve=>setImmediate(resolve));
  assert.equal(f.stores.get(f.context.qa.CACHE_NAME).has(target),false,key);
  f.stores.get(f.context.qa.CACHE_NAME).set(target,response('old credential URL'));
  offline=true;assert.equal((await f.request(target,{mode:'navigate'})).type,'error');offline=false;
 }
});

test('a response declaring private or no-store is not manually cached',async()=>{
 for(const control of ['no-store','private, max-age=600','max-age=0, no-store']){
  const f=fixture({networkResponse:request=>({...response('private'),headers:{get:key=>key==='cache-control'?control:null}})});
  await f.install();const target=url('./dynamic-result');await f.request(target);await new Promise(resolve=>setImmediate(resolve));
  assert.equal(f.stores.get(f.context.qa.CACHE_NAME).has(target),false,control);
 }
});
