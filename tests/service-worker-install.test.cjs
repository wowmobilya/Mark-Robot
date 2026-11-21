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
function fixture({fail=()=>false,seed=false}={}){
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
  const context={importScripts(){},URL,Request:class{constructor(value,options={}){this.url=url(value);this.cache=options.cache;}},
    caches:{async keys(){return [...stores.keys()];},async open(name){if(!stores.has(name))stores.set(name,new Map());return cache(name);},async delete(name){return stores.delete(name);}},
    self:{location:{origin:'https://example.test'},addEventListener(name,fn){handlers[name]=fn;},skipWaiting(){skip++;return Promise.resolve();},clients:{claim:async()=>{}}},console};
  vm.runInNewContext(source+'\nthis.qa={CACHE_NAME,urlsToCache};',context);
  const seeded=Array.isArray(seed)?seed:seed?context.qa.urlsToCache.filter(value=>value.startsWith('./')&&/[?&]v=/.test(value)):[];
  for(const asset of seeded)previous.set(url(asset),response('previous:'+url(asset)));
  function install(){let pending;handlers.install({waitUntil(value){pending=value;}});return pending;}
  function activate(){let pending;handlers.activate({waitUntil(value){pending=value;}});return pending;}
  return{context,install,activate,calls,stores,get maximum(){return maximum;},get skip(){return skip;}};
}
test('offline installation bounds network work and activates only after the required shell is ready',async()=>{
  const f=fixture(),pending=f.install();assert.equal(f.skip,0);await pending;
  assert(f.maximum<=6,'at most six asset requests at once');assert.equal(f.skip,1);
  const stored=f.stores.get(f.context.qa.CACHE_NAME);
  assert(stored.has(url('./index.html')));assert(stored.has(url('./')));
  assert.equal(f.calls.filter(value=>value===url('./')||value===url('./index.html')).length,1,'fetch the HTML once for both cache aliases');
  for(const asset of ['purchase-planner.js?v=1','invoice-preview.css?v=1','label-reprint-history.js?v=1'])assert(stored.has(url('./'+asset)));
});
test('updates reuse exactly versioned prior assets and fetch fresh unversioned configuration and HTML',async()=>{
  const f=fixture({seed:true});await f.install();
  assert.equal(f.calls.some(value=>/[?&]v=/.test(value)),false,'unchanged versioned assets do not download twice');
  assert(f.calls.includes(url('./index.html')));assert(f.calls.includes(url('./google-drive-config.js')));
  const stored=f.stores.get(f.context.qa.CACHE_NAME);
  assert.match(stored.get(url('./package-labels.js?v=7')).tag,/^previous:/);
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
  const f=fixture({seed:['./index.html','./speech-controls.js?v=4',unchanged,...aliases]});
  await f.install();
  assert(f.calls.includes(url('./speech-controls.js?v=5')),'changed code must be downloaded');
  assert(f.calls.includes(url('./purchase-planner.js?v=1')),'new modules must be downloaded');
  assert.equal(f.calls.includes(url(unchanged)),false,'only exact unchanged URLs may be reused');
  assert.equal(f.calls.includes(url('./speech-controls.js?v=4')),false);
  await f.activate();
  assert.equal(f.stores.has('wow-furniture-v205-test'),false);
  const current=f.stores.get(f.context.qa.CACHE_NAME);
  for(const alias of aliases)assert.match(current.get(url(alias)).tag,/^previous:/);
  assert.equal(current.has(url('./speech-controls.js?v=4')),false);
});
test('failed HTML, CSS or JavaScript installation leaves every previous-cache entry intact',async()=>{
  for(const asset of ['./index.html','./invoice-preview.css?v=1','./purchase-planner.js?v=1']){
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
