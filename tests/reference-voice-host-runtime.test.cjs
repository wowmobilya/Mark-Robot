const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const crypto=require('node:crypto');
const {MessageChannel}=require('node:worker_threads');
const core=require('../reference-voice.js');
const root=path.resolve(__dirname,'..');

async function until(check,timeout=400){
  const deadline=Date.now()+timeout;
  while(!check()&&Date.now()<deadline)await new Promise(resolve=>setTimeout(resolve,1));
  assert(check(),'the actual engine transport reached the expected state');
}

function fixture(t){
  const workers=[],messages=[],channels=[];
  let cacheReads=0,unlock;
  const cacheGate=new Promise(resolve=>{unlock=resolve;});
  const bytes=fs.readFileSync(path.join(root,'vendor/zonos3/a50e141/model/voices/voices.json'));
  const asset={url:'./vendor/zonos3/a50e141/model/voices/voices.json',modelPath:'voices/voices.json',bytes:bytes.length,
    sha256:crypto.createHash('sha256').update(bytes).digest('hex'),type:'application/json'};
  class Worker{
    constructor(url){this.url=String(url);this.listeners=new Map();workers.push(this);}
    addEventListener(type,handler){const list=this.listeners.get(type)||[];list.push(handler);this.listeners.set(type,list);}
    postMessage(){}
    error(){const event={message:'module could not be loaded',filename:this.url,preventDefault(){}};for(const fn of this.listeners.get('error')||[])fn(event);this.onerror?.(event);}
  }
  class Channel extends MessageChannel{constructor(){super();channels.push(this);}}
  const context=vm.createContext({URL,Request,Response,Headers,ReadableStream,TextEncoder,TextDecoder,ArrayBuffer,Uint8Array,Float32Array,DataView,
    AbortController,DOMException,MessageChannel:Channel,Worker,navigator:{gpu:{}},location:{href:'https://example.test/reference-voice-host.js?v=2'},
    crypto:crypto.webcrypto,WFReferenceVoiceCore:core,WFReferenceVoiceAssets:{cacheName:'voices',engineBase:'./vendor/zonos3/a50e141/',assets:[asset]},
    caches:{async open(){return{async match(){cacheReads++;await cacheGate;return new Response(bytes,{headers:{'X-WF-SHA256':asset.sha256,'Content-Length':String(bytes.length)}});}};}},
    postMessage:message=>messages.push(message),btoa:text=>Buffer.from(text,'binary').toString('base64'),console});
  context.self=context;
  const engineSource=fs.readFileSync(path.join(root,'vendor/zonos3/a50e141/engine.js'),'utf8')
    .replaceAll('import.meta.url',JSON.stringify('https://example.test/vendor/zonos3/a50e141/engine.js'))
    .replace(/export\{[^}]+\};?\s*$/,'return {engine:T,localFetch:D};');
  // Run the pinned engine itself: only browser Worker/CacheStorage boundaries
  // are controlled. In particular engine.init and localFetch are not mocked.
  context.__loadEngine=async()=>vm.runInContext('(function(){'+engineSource+'})()',context,{filename:'pinned-engine.js'});
  const hostSource=fs.readFileSync(path.join(root,'reference-voice-host.js'),'utf8')
    .replace(/^import '\.\/reference-voice[^\n]+\n/gm,'')
    .replaceAll('import.meta.url',JSON.stringify('https://example.test/reference-voice-host.js?v=2'))
    .replace("import(new URL('engine.js',engineBase).href)",'__loadEngine()');
  vm.runInContext(hostSource,context,{filename:'reference-voice-host.js'});
  t.after(()=>{unlock();for(const channel of channels){channel.port1.close();channel.port2.close();}});
  return{workers,messages,get cacheReads(){return cacheReads;},unlock,send:message=>context.self.onmessage({data:message})};
}

test('an actual engine child failure before initialization installs its reject callback settles immediately',async t=>{
  const f=fixture(t),preparing=f.send({id:1,type:'prepare',locale:'ar'});
  await until(()=>f.cacheReads>0);
  f.workers.find(worker=>worker.url.endsWith('/worker.js')).error();
  f.unlock();
  await until(()=>f.messages.some(message=>message.error));
  await preparing;
  assert.equal(f.messages.find(message=>message.error).error,'worker-startup-failed');
  assert.equal(f.messages.some(message=>message.type==='ready'),false);
});
