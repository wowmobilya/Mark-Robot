const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..');
const sha=data=>crypto.createHash('sha256').update(data).digest('hex');

test('every installed local reference asset matches its published bytes and hash',()=>{
  const context={};vm.runInNewContext(fs.readFileSync(path.join(root,'reference-voice-assets.js'),'utf8'),context);
  const manifest=context.WFReferenceVoiceAssets;
  assert.equal(manifest.assets.reduce((sum,a)=>sum+a.bytes,0),manifest.bytes);
  assert.equal(new Set(manifest.assets.map(a=>a.url)).size,manifest.assets.length);
  for(const asset of manifest.assets){
    assert.match(asset.sha256,/^[0-9a-f]{64}$/);assert(asset.bytes>0);
    if(asset.url.startsWith('./')){
      const bytes=fs.readFileSync(path.join(root,asset.url.split('?')[0]));
      assert.equal(bytes.length,asset.bytes,asset.url+' size');assert.equal(sha(bytes),asset.sha256,asset.url+' SHA256');
    }else assert(asset.url.startsWith('https://huggingface.co/Zyphra/ZONOS3-Mini/resolve/'+manifest.modelRevision+'/web/'));
  }
  const model=path.join(root,manifest.engineBase,'model');
  const heads=JSON.parse(fs.readFileSync(path.join(model,'laci/index.json'),'utf8'));
  for(const language of ['ar','tr','en_us','fr_fr','ru'])assert(fs.existsSync(path.join(model,'laci',heads[language])));
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(model,'voices/voices.json'),'utf8')),[]);
});

function serviceWorker(){
  const handlers={},network=[],cached=[],entries=new Map();
  const cache={match:async request=>entries.get(request.url||String(request))?.clone(),add:async request=>cached.push(request.url),put:async()=>{}};
  const self={location:{origin:'https://example.test'},addEventListener:(name,handler)=>handlers[name]=handler,skipWaiting(){},clients:{claim:async()=>{}}};
  class LocalRequest extends Request{constructor(input,options){super(new URL(input,'https://example.test/'),options);}}
  vm.runInNewContext(fs.readFileSync(path.join(root,'sw.js'),'utf8'),{
    self,URL,Request:LocalRequest,Response,Promise,importScripts(){},
    caches:{open:async()=>cache,match:async request=>cache.match(request),keys:async()=>[],delete:async()=>true},
    fetch:async request=>{network.push(request.url);return new Response('network bytes');}
  });
  return {handlers,network,cached,entries,async get(url,options){let result;handlers.fetch({request:new Request(url,options),respondWith(promise){result=promise;}});return result;}};
}

test('reference worker imports use the installed cache and cannot trigger a model/runtime download',async()=>{
  const f=serviceWorker(),url='https://example.test/vendor/zonos3/a50e141/engine.js';
  f.entries.set(url,new Response('verified runtime'));
  assert.equal(await(await f.get(url)).text(),'verified runtime');assert.equal(f.network.length,0);
  const missing=await f.get('https://example.test/vendor/zonos3/a50e141/worker.js');
  assert.equal(missing.type,'error');assert.equal(f.network.length,0);
  assert.equal(await(await f.get(url,{cache:'no-store'})).text(),'network bytes');
  assert.deepEqual(f.network,[url],'only the explicit installer request uses the network');
});

test('the application shell installs reference metadata needed by cold offline worker imports',async()=>{
  const f=serviceWorker();let installed;
  f.handlers.install({waitUntil(promise){installed=promise;}});await installed;
  assert(f.cached.includes('https://example.test/reference-voice-assets.js?v=1'));
  assert(f.cached.includes('https://example.test/reference-voice.js?v=1'));
  assert(!f.cached.some(url=>/shard-\d+\.bin/.test(url)),'opening the program must not download large voice shards');
});
