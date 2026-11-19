const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const core = require('../reference-voice.js');
const playbackCore = require('../offline-voice.js');

const digest = bytes => Promise.resolve(crypto.createHash('sha256').update(Buffer.from(bytes)).digest());
const hash = text => crypto.createHash('sha256').update(text).digest('hex');
const appBase = 'https://example.test/app/';
const virtualBase = appBase + 'vendor/zonos3/pinned/model/';

function cacheFixture() {
  const text = '{"format":"zonos3-web-v1"}';
  const asset = {id:'backbone-manifest',url:'./assets/reference/backbone.json',modelPath:'backbone/manifest.json',bytes:Buffer.byteLength(text),sha256:hash(text),type:'application/json'};
  const entries = new Map();
  const cache = {async match(url) { return entries.get(String(url))?.clone(); }};
  const caches = {async open(name) { assert.equal(name,'voices'); return cache; }};
  const put = value => entries.set(new URL(asset.url,appBase).href,new Response(value,{headers:{'Content-Length':String(asset.bytes),'X-WF-SHA256':asset.sha256,'Content-Type':asset.type}}));
  return {asset,entries,put,text,fetch:core.createCacheFetch({caches,digest,cacheName:'voices',assets:[asset],appBase,virtualBase})};
}

test('reference model requests read verified cached bytes without a network fallback',async()=>{
  const f=cacheFixture();f.put(f.text);
  const result=await f.fetch(virtualBase+'backbone/manifest.json');
  assert.equal(await result.text(),f.text);
  await assert.rejects(f.fetch('https://unlisted.test/model.bin'),{code:'voice-asset-not-allowed'});
  await assert.rejects(f.fetch(virtualBase+'backbone/manifest.json',{method:'POST'}),{code:'voice-asset-not-allowed'});
});

test('a missing or modified cache file cannot be used for speech',async()=>{
  const f=cacheFixture();
  await assert.rejects(f.fetch(virtualBase+'backbone/manifest.json'),{code:'pack-not-installed'});
  f.put('x'.repeat(f.asset.bytes));
  await assert.rejects(f.fetch(virtualBase+'backbone/manifest.json'),{code:'integrity-failed'});
});

test('omitted upstream features return an intentional local 404, not a failed network probe',async()=>{
  const f=cacheFixture();
  for(const path of ['edit/manifest.json','aligner/manifest.json','zac-full_mr/manifest.json']) {
    assert.equal((await f.fetch(virtualBase+path)).status,404);
  }
  await assert.rejects(f.fetch(virtualBase+'unexpected/manifest.json'),{code:'voice-asset-not-allowed'});
});

test('reference selection retains the approved locale and Arabic dialect',()=>{
  assert.equal(core.embeddingKey('ar-SY','sy'),'ar');
  assert.equal(core.embeddingKey('ar','eg'),'ar-EG');
  assert.equal(core.embeddingKey('tr-TR','eg'),'tr');
  assert.equal(core.embeddingKey('fr-FR'),'fr');
  assert.throws(()=>core.embeddingKey('xx'),{code:'locale-unsupported'});
});

test('reference synthesis uses buffered PCM WAV and local embedding input',()=>{
  const body=core.generationBody({text:'مليون دولار أمريكي وخمسة سنتات. الرصيد صفر.',locale:'ar',embedding:'c3BlYWtlcg==',embeddingName:'ar.npy'});
  assert.equal(body.language,'ar');assert.equal(body.text,'مليون دولار أمريكي وخمسة سنتات. الرصيد صفر.');
  assert.equal(body.speaker_mode,'embedding');assert.equal(body.speaker_embedding_base64,'c3BlYWtlcg==');
  assert.equal(body.format,'wav');assert.equal(body.stream,false);assert.equal(body.laci,true);
  assert.equal(body.speaker_cfg_scale,1);assert.equal(body.controls_cfg_scale,1);
  assert.equal(core.generationBody({text:'sıfır dolar',locale:'tr',embedding:'x',embeddingName:'tr.npy'}).language,'tr');
  assert.equal(core.generationBody({text:'zero dollars',locale:'en-US',embedding:'x',embeddingName:'en.npy'}).language,'en_us');
  assert.throws(()=>core.generationBody({text:'x'.repeat(801),locale:'ar',embedding:'x'}),{code:'text-length'});
});

async function flushUntil(check) {
  for(let attempt=0;attempt<40&&!check();attempt++)await new Promise(resolve=>setImmediate(resolve));
  assert(check(),'asynchronous operation reached the expected state');
}

async function browserFixture(t) {
  const requests=[],workers=[],events=[],audioElements=[],objectURLs=new Set();
  let nextURL=0,networkCalls=0,failNextPost=false;
  class FakeURL extends URL {
    static createObjectURL(){const url='blob:reference-test-'+(++nextURL);objectURLs.add(url);return url;}
    static revokeObjectURL(url){objectURLs.delete(url);}
  }
  class Audio {
    constructor(){this.currentTime=0;this.pauses=0;audioElements.push(this);}
    play(){queueMicrotask(()=>this.onplaying?.());return Promise.resolve();}
    pause(){this.pauses++;}
    removeAttribute(name){if(name==='src')this.src='';}
    load(){}
  }
  class Worker {
    constructor(url,options){this.url=String(url);this.options=options;this.terminated=false;workers.push(this);}
    postMessage(message){
      if(failNextPost){failNextPost=false;throw new Error('simulated postMessage failure');}
      requests.push({worker:this,...message});
    }
    terminate(){this.terminated=true;}
  }
  const asset={id:'fixture-model',url:appBase+'reference.bin',bytes:1,sha256:hash('x'),type:'application/octet-stream'};
  const manifest={id:'reference-test',minBufferBytes:134217728,assets:[asset]};
  const assets=[...playbackCore.runtime,...playbackCore.catalog.flatMap(voice=>[...(voice.runtime||[]),...voice.files]),asset];
  const removed=new Set();
  const cache={
    async match(input){
      const url=String(input);if(removed.has(url))return undefined;
      const item=assets.find(value=>value.url===url);
      if(item)return new Response('',{headers:{'Content-Length':String(item.bytes),'X-WF-SHA256':item.sha256}});
      const voice=playbackCore.catalog.find(value=>url.includes('/__infinity_voice__/'+value.id+'.json'));
      const model=url.includes('/__infinity_voice__/reference-test.json')?asset.sha256:voice?.files[0].sha256;
      return model?new Response(JSON.stringify({version:playbackCore.VERSION,model})):undefined;
    },
    async delete(url){removed.add(String(url));return true;}
  };
  const window={isSecureContext:true,caches:{open:async()=>cache},crypto:crypto.webcrypto,Worker,WebAssembly,
    WFReferenceVoiceAssets:manifest,
    fetch:async()=>{networkCalls++;throw new Error('the installed voice coordinator must not fetch from the network');},
    dispatchEvent:event=>events.push(event),addEventListener(){}};
  class CustomEvent {constructor(type,options){this.type=type;this.detail=options.detail;}}
  const context=vm.createContext({window,document:{baseURI:appBase},location:{origin:new URL(appBase).origin},
    navigator:{gpu:{requestAdapter:async()=>({limits:{maxBufferSize:268435456,maxStorageBufferBindingSize:268435456}})}},
    Audio,Worker,URL:FakeURL,Blob,Response,CustomEvent,WebAssembly,AbortController,crypto:crypto.webcrypto,setTimeout,clearTimeout});
  for(const name of ['offline-voice.js','reference-voice.js']) {
    vm.runInContext(fs.readFileSync(path.resolve(__dirname,'..',name),'utf8'),context,{filename:name});
  }
  const api=window.WFReferenceVoice;
  t.after(()=>api.remove());
  await flushUntil(()=>api.getStatus('ar').ready);
  return {api,requests,workers,events,audioElements,objectURLs,
    get networkCalls(){return networkCalls;},
    failNextPost(){failNextPost=true;},
    progress(index,loaded=1,total=2){const request=requests[index];assert(request);request.worker.onmessage({data:{id:request.id,type:'progress',loaded,total}});},
    respond(index){
      const request=requests[index];assert(request);
      const blob=new Blob([playbackCore.pcmToWav(new Float32Array(2400),24000)],{type:'audio/wav'});
      request.worker.onmessage({data:{id:request.id,blob}});
    }
  };
}

test('a reused reference worker reports progress in the current request locale',async t=>{
  const f=await browserFixture(t);
  const arabic=f.api.synthesize('الرصيد صفر.',{locale:'ar'});
  assert.equal(f.requests.length,1);f.respond(0);await arabic;
  const turkish=f.api.synthesize('Bakiye sıfır.',{locale:'tr'});
  turkish.catch(()=>{});
  assert.equal(f.requests.length,2);
  assert.equal(f.requests[1].worker,f.requests[0].worker,'sequential requests reuse the loaded reference worker');
  f.progress(1,3,8);f.respond(1);await turkish;
  const progress=f.events.filter(event=>event.type==='wf-reference-voice-loading');
  assert.equal(progress.length,1);
  assert.deepEqual({...progress[0].detail},{locale:'tr',loaded:3,total:8});
});

test('a failed worker post is cleaned up immediately so reference synthesis can retry',async t=>{
  const f=await browserFixture(t);f.failNextPost();
  await assert.rejects(f.api.synthesize('الرصيد صفر.',{locale:'ar'}));
  const retry=f.api.synthesize('Bakiye sıfır.',{locale:'tr'});
  retry.catch(()=>{});
  await flushUntil(()=>f.requests.length===1);
  assert.equal(f.workers[0].terminated,true,'the failed worker is released without waiting for the request timeout');
  assert.equal(f.workers.length,2);
  assert.equal(f.requests[0].worker,f.workers[1]);
  f.respond(0);
  assert((await retry) instanceof Blob);
});

test('reference replacement stays on the worker transport and a stale handle cannot cancel its successor',async t=>{
  const f=await browserFixture(t);let starts=0;
  const old=f.api.speak({text:'الرصيد صفر.',locale:'ar',continuous:true,onStart(){starts++;}});
  await flushUntil(()=>f.requests.length===1);f.respond(0);await flushUntil(()=>starts===1);
  const current=f.api.speak({text:'Bakiye sıfır.',locale:'tr',continuous:true,onStart(){starts++;}});
  await flushUntil(()=>f.requests.length===2);
  old.cancel();
  const activeWorker=f.requests[1].worker;
  assert.equal(activeWorker.terminated,false);
  assert.match(activeWorker.url,/reference-voice-host\.js\?v=1$/,'the request does not fall back to a different local voice');
  f.respond(1);await flushUntil(()=>starts===2);
  assert.equal(f.networkCalls,0,'the installed-voice coordinator does not perform an HTTP request');
  const audio=f.audioElements[1],pauses=audio.pauses;
  current.cancel();
  assert.equal(activeWorker.terminated,true,'stopping buffered playback releases the actual reference worker');
  assert(audio.pauses>pauses);
  assert.equal(f.objectURLs.size,0);
});
