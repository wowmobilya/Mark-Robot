import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {webcrypto} from 'node:crypto';
import {localDOM} from './fixtures/module-dom.mjs';

const require=createRequire(import.meta.url);
const core=require('../modules/gallery/core.js');
const exportsApi=require('../modules/gallery/exports.js');
const source=await readFile(new URL('../modules/gallery/workspace.js',import.meta.url),'utf8');
const descendants=node=>[node,...node.children.flatMap(descendants)];
const settle=async condition=>{
  for(let i=0;i<80;i++){if(condition())return;await new Promise(resolve=>setTimeout(resolve,5));}
  assert.fail('Gallery route did not settle');
};
function fixture(role='owner'){
  const {doc,body}=localDOM(),definitions=new Map(),opened=[],requests=[];
  let musicMounts=0;
  const win={document:doc,crypto:webcrypto,WFModules:{register:def=>definitions.set(def.id,def)},
    showPage:route=>opened.push('main:'+route),
    WFGalleryCore:core,WFGalleryExports:exportsApi,
    WFGalleryMusic:{mount(){musicMounts++;return {dispose(){},updateLanguage(){}};}},
    WFAppIdentity:{sources:()=>({logo:''})},matchMedia:()=>({matches:true}),
    addEventListener(){},removeEventListener(){},setInterval:()=>1,clearInterval(){},
    localStorage:{getItem:()=>null,setItem(){},removeItem(){}}};
  const context=vm.createContext({window:win,globalThis:win,URL,Blob,TextEncoder,AbortController,queueMicrotask,Intl,setTimeout,structuredClone});
  vm.runInContext(source,context);
  const container=doc.createElement('div');body.append(container);
  const api={getSession:()=>({authenticated:true,currentAccount:{id:'fixture-owner',role,status:'active'},userId:'fixture-owner',
        workspaceId:'fixture-company',sessionVersion:1,authGeneration:1}),
    can:key=>role==='owner'||['gallery.view'].includes(key),
    request:async(action,payload)=>{requests.push({action,payload});return {items:[],hasMore:false,presentation:{version:0}};},
    open:route=>opened.push(route),notify(){}};
  return {win,doc,container,definitions,api,opened,requests,musicMounts:()=>musicMounts};
}
test('catalog with no published products hides irrelevant actions and offers management to owner only',async()=>{
  const f=fixture('owner'),handle=f.definitions.get('gallery').mount({route:'gallery',container:f.container,api:f.api,lang:'en'});
  try{
    await settle(()=>f.container.textContent.includes('No products have been published'));
    assert.equal(f.musicMounts(),0,'Music belongs to the management route, not product browsing');
    const controls=descendants(f.container).filter(e=>e.tagName==='BUTTON');
    assert.ok(controls.some(e=>e.textContent==='Retry'));
    const canonical=controls.find(e=>e.textContent==='Open WOW products');
    assert.ok(canonical,'Primary WOW products must be accessible directly');
    await canonical.fire('click');assert.deepEqual(f.opened,['main:products']);
    const management=controls.find(e=>e.textContent==='Showcase settings');
    assert.ok(management,'Owner can reach the existing management section');
    assert.ok(!controls.some(e=>/Download|Select all|Order cart|List/.test(e.textContent)));
    assert.equal(descendants(f.container).some(e=>e.tagName==='INPUT'&&e.type==='search'),false);
    await management.fire('click');assert.deepEqual(f.opened,['main:products','gallery-studio']);
  }finally{handle.dispose();}
});
test('empty catalog for customers does not expose staff management',async()=>{
  const f=fixture('customer'),handle=f.definitions.get('gallery').mount({route:'gallery',container:f.container,api:f.api,lang:'ar'});
  try{
    await settle(()=>f.container.textContent.includes('لا توجد منتجات منشورة'));
    assert.equal(f.musicMounts(),0);
    assert.ok(!descendants(f.container).some(e=>e.tagName==='BUTTON'&&/إدارة عرض|فتح منتجات WOW/.test(e.textContent)));
    assert.equal(f.requests[0].action,'gallery.snapshot');
    assert.equal(f.requests[0].payload.manage,false);
  }finally{handle.dispose();}
});
test('gallery music remains available within its management section',async()=>{
  const f=fixture('owner'),handle=f.definitions.get('gallery-studio').mount({route:'gallery-studio',container:f.container,api:f.api,lang:'en'});
  try{
    await settle(()=>f.requests.length>0);
    assert.equal(f.musicMounts(),1);
    assert.equal(f.requests[0].payload.manage,true);
    await settle(()=>descendants(f.container).some(e=>e.tagName==='BUTTON'&&e.textContent==='Products'));
    const nativeProducts=descendants(f.container).find(e=>e.tagName==='BUTTON'&&e.textContent==='Products');
    await nativeProducts.fire('click');
    assert.deepEqual(f.opened,['main:products'],'Gallery management must open WOW primary products, not an unregistered module');
  }finally{handle.dispose();}
});

test('a WOW model opens its own gallery stock editor without creating a duplicate product',async()=>{
 const f=fixture('owner');
 f.api.request=async(action,payload)=>{
   f.requests.push({action,payload});
   return {items:[{productId:'wow-model-514',name:'W 514',published:false,stock:13,
      priceMinor:2500,currency:'USD',collection:'TV',version:0,specs:{},hasImage:false}],
     hasMore:false,presentation:{version:0}};
 };
 const handle=f.definitions.get('gallery-studio').mount({route:'gallery-studio',
   params:{productId:'wow-model-514'},container:f.container,api:f.api,lang:'en'});
 try{
   await settle(()=>descendants(f.container).some(e=>e.tagName==='DIALOG'&&e.open));
   const dialog=descendants(f.container).find(e=>e.tagName==='DIALOG'&&e.open);
   assert.ok(dialog.textContent.includes('W 514'));
   assert.ok(dialog.textContent.includes('Published'));
   assert.equal(f.requests.length,1,'Opening existing model must not mutate stock');
   assert.equal(f.requests[0].action,'gallery.snapshot');
   assert.equal(f.requests[0].payload.manage,true);
   assert.equal(f.requests[0].payload.offset,0);
 }finally{handle.dispose();}
});
test('missing native WOW model is not replaced with a guessed gallery duplicate',async()=>{
 const f=fixture('owner');
 const handle=f.definitions.get('gallery-studio').mount({route:'gallery-studio',
   params:{productId:'not-synced'},container:f.container,api:f.api,lang:'en'});
 try{
   await settle(()=>f.container.textContent.includes('No duplicate was created'));
   assert.equal(descendants(f.container).filter(e=>e.tagName==='DIALOG'&&e.open).length,0);
   assert.equal(f.requests.length,1);
 }finally{handle.dispose();}
});
