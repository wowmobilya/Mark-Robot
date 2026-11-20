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
  assert.equal(core.embeddingKey('ar','eg'),'ar','an older saved dialect must keep the approved Syrian reference');
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

test('reference streaming keeps all residual codebooks from the first PCM frame',()=>{
  const body=core.generationBody({text:'الرصيد صفر.',locale:'ar',embedding:'c3BlYWtlcg==',stream:true});
  assert.equal(body.stream,true);assert.equal(body.format,'pcm');
  assert.equal(body.stream_decode,'prefix');assert.equal(body.stream_codebooks,10);assert.equal(body.stream_codebooks_scope,'first');
  assert.equal(body.laci,true);assert.equal(body.language,'ar');assert.equal(body.speaker_embedding_base64,'c3BlYWtlcg==');
});

test('short report headings become one bounded natural phrase with its original source range',()=>{
  const text='Daily report. Report date: November twentieth. Sales: $5.00.';
  const input=[{text:'Daily report.',charIndex:0,charLength:13},
    {text:'Report date: November twentieth.',charIndex:14,charLength:32},
    {text:'Sales five dollars.',charIndex:47,charLength:12}];
  assert.equal(typeof core.groupPhrases,'function');
  assert.deepEqual(core.groupPhrases(text,input),[
    {text:'Daily report. Report date: November twentieth.',charIndex:0,charLength:46},
    {text:'Sales five dollars.',charIndex:47,charLength:12}
  ]);
  assert.equal(input[0].text,'Daily report.','planning never rewrites the validated input');
  const long={text:'a'.repeat(215),charIndex:14,charLength:32};
  assert.equal(core.groupPhrases(text,[input[0],long]).length,2,'a short heading must not create an oversized generation');
  assert.equal(core.groupPhrases(text,[input[0],input[2]]).length,2,'omitted source clauses cannot be folded into an unrelated highlight');
});

test('grouping preserves repeated source spans when a large spoken amount needs several pieces',()=>{
  const {build,localize}=require('../business-overview.js'),{prepare}=require('../arabic-report-speech.js');
  for(const amount of [1234567890123.45,87654321987654.25,90071992547409.9]){
    const snapshot=build({companies:[],products:[],invoices:[],payments:[],cashEntries:[]},{date:'2026-11-20'});
    snapshot.daily.salesUSD=amount;
    const report=localize(snapshot,'ar'),chunks=prepare(report,{dialect:'sy'}),grouped=core.groupPhrases(report.narration,chunks);
    assert.doesNotThrow(()=>playbackCore.speechChunks(report.narration,grouped),String(amount));
    assert.equal(grouped.map(chunk=>chunk.text).join(' '),chunks.map(chunk=>chunk.text).join(' '),'every magnitude and fractional word survives');
  }
  const text='Amounts: 1234567890. Next.',chunks=[
    {text:'Amounts.',charIndex:0,charLength:8},
    {text:'one hundred twenty three',charIndex:9,charLength:11},
    {text:'million dollars.',charIndex:9,charLength:11},
    {text:'Next.',charIndex:21,charLength:5}
  ];
  assert.deepEqual(core.groupPhrases(text,chunks),chunks,'neither end of a repeated number span can absorb its neighboring clause');
});

async function flushUntil(check) {
  for(let attempt=0;attempt<40&&!check();attempt++)await new Promise(resolve=>setImmediate(resolve));
  assert(check(),'asynchronous operation reached the expected state');
}

async function browserFixture(t,{stubPlayer=false,onEvent}={}) {
  const requests=[],workers=[],events=[],audioElements=[],playbacks=[],objectURLs=new Set(),timers=new Map(),listeners=new Map();
  let nextURL=0,nextTimer=0,networkCalls=0,failNextPost=false;
  const schedule=(fn,ms)=>{const id=++nextTimer;timers.set(id,{fn,ms});return id;};
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
    dispatchEvent:event=>{events.push(event);onEvent?.(event,window);},addEventListener:(type,fn)=>listeners.set(type,fn)};
  class CustomEvent {constructor(type,options){this.type=type;this.detail=options.detail;}}
  const context=vm.createContext({window,document:{baseURI:appBase},location:{origin:new URL(appBase).origin},
    navigator:{gpu:{requestAdapter:async()=>({limits:{maxBufferSize:268435456,maxStorageBufferBindingSize:268435456}})}},
    Audio,Worker,URL:FakeURL,Blob,Response,ArrayBuffer,Float32Array,CustomEvent,WebAssembly,AbortController,crypto:crypto.webcrypto,setTimeout:schedule,clearTimeout:id=>timers.delete(id)});
  for(const name of ['offline-voice.js','reference-voice.js']) {
    if(name==='reference-voice.js'&&stubPlayer){
      let current=null;
      window.WFOfflineVoice={...window.WFOfflineVoice,preparePlayback:options=>({options}),speakGenerated(options,source){
        current?.cancel();const controller=new AbortController();let done=false;
        const handle={options,source,controller,cancel(){if(done)return;done=true;controller.abort();source.dispose();},finish(){if(done)return;done=true;source.dispose();options.onEnd?.();}};
        playbacks.push(handle);current=handle;return handle;
      }};
    }
    vm.runInContext(fs.readFileSync(path.resolve(__dirname,'..',name),'utf8'),context,{filename:name});
  }
  const api=window.WFReferenceVoice;
  t.after(()=>api.remove());
  await flushUntil(()=>api.getStatus('ar').ready);
  return {api,requests,workers,events,audioElements,playbacks,objectURLs,timers,
    get networkCalls(){return networkCalls;},
    restorePack(){removed.clear();return api.refresh();},
    failNextPost(){failNextPost=true;},
    send(index,data){const request=requests[index];assert(request);request.worker.onmessage({data:{id:request.id,...data}});},
    idle(){for(const[id,value]of [...timers])if(value.ms===300000){timers.delete(id);value.fn();}},
    pagehide(){listeners.get('pagehide')?.();},
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

test('reference audio is delivered before completion and acknowledges only after playback accepts it',async t=>{
  const f=await browserFixture(t),chunks=[];
  let accepted,ended=false;
  const pending=f.api.stream('الرصيد صفر.',{locale:'ar',onAudio:chunk=>{chunks.push(chunk);return new Promise(resolve=>{accepted=resolve;});}}).then(()=>{ended=true;});
  assert.equal(f.requests[0].type,'stream');
  f.send(0,{type:'audio',sequence:0,sampleRate:44100,samples:new Float32Array([0.25,-0.5]).buffer});
  assert.equal(chunks.length,1);assert.deepEqual([...chunks[0].samples],[0.25,-0.5]);assert.equal(ended,false);
  assert.equal(f.requests.length,1,'the host has no credit while the audio queue is full');
  accepted();await flushUntil(()=>f.requests.length===2);
  assert.equal(f.requests[1].type,'audio-ack');assert.equal(f.requests[1].sequence,0);
  f.send(0,{type:'end'});await pending;assert.equal(ended,true);
});

test('warm preparation and synthesis share the same engine without speech-busy',async t=>{
  const f=await browserFixture(t);
  const warm=f.api.prepare('ar');warm.catch(()=>{});
  const speech=f.api.stream('Bakiye sıfır.',{locale:'tr',onAudio(){}});speech.catch(()=>{});
  assert.equal(f.requests.length,2);assert.equal(f.workers.length,1);
  assert.equal(f.requests[0].type,'prepare');assert.equal(f.requests[1].type,'stream');
  f.send(0,{type:'ready'});assert.equal((await warm).engineReady,true);
  f.send(1,{type:'audio',sequence:0,sampleRate:44100,samples:new Float32Array([0.1]).buffer});
  await flushUntil(()=>f.requests.some(request=>request.type==='audio-ack'));
  f.send(1,{type:'end'});await speech;
});

test('finished playback keeps the worker warm and idle release waits for the playback owner',async t=>{
  const f=await browserFixture(t,{stubPlayer:true});
  const old=f.api.speak({text:'الرصيد صفر.',locale:'ar',continuous:true});
  assert.equal(old.options.streaming,false);assert.equal(old.options.continuous,false);
  assert.equal(f.api.preparePlayback().options.streaming,false,'the gesture lease must match native phrase playback');
  const first=old.source.synthesize('الرصيد صفر.',{locale:'ar',signal:old.controller.signal});f.respond(0);await first;
  const worker=f.workers[0];f.idle();assert.equal(worker.terminated,false,'active playback keeps its GPU engine');
  old.finish();assert.equal(worker.terminated,false,'normal completion retains the loaded engine');
  const next=f.api.speak({text:'Bakiye sıfır.',locale:'tr'});
  const second=next.source.synthesize('Bakiye sıfır.',{locale:'tr',signal:next.controller.signal});
  assert.equal(f.requests[1].worker,worker);old.cancel();f.respond(1);await second;
  next.cancel();assert.equal(worker.terminated,false,'stopping already-generated playback retains its engine');
  f.idle();assert.equal(worker.terminated,true,'unused GPU memory is eventually released');
  assert.equal(f.networkCalls,0);
});

test('aborting active reference generation terminates its worker and stale audio cannot reach a successor',async t=>{
  const f=await browserFixture(t),controller=new AbortController(),oldChunks=[],newChunks=[];
  const old=f.api.stream('الرصيد صفر.',{locale:'ar',signal:controller.signal,onAudio:chunk=>oldChunks.push(chunk)});
  const rejected=assert.rejects(old,{name:'AbortError'});controller.abort();await rejected;
  assert.equal(f.workers[0].terminated,true);
  const current=f.api.stream('Bakiye sıfır.',{locale:'tr',onAudio:chunk=>newChunks.push(chunk)});current.catch(()=>{});
  f.send(0,{type:'audio',sequence:0,sampleRate:44100,samples:new Float32Array([0.1]).buffer});
  assert.equal(oldChunks.length,0);assert.equal(newChunks.length,0);assert.equal(f.workers[1].terminated,false);
  f.send(1,{type:'audio',sequence:0,sampleRate:44100,samples:new Float32Array([0.2]).buffer});
  await flushUntil(()=>newChunks.length===1);await new Promise(resolve=>setImmediate(resolve));
  f.send(1,{type:'end'});await current;
});

test('empty and malformed reference streams fail instead of completing successfully',async t=>{
  const f=await browserFixture(t);
  const empty=f.api.stream('الرصيد صفر.',{onAudio(){}});const emptyFailure=assert.rejects(empty,{code:'invalid-audio'});
  f.send(0,{type:'end'});await emptyFailure;
  const malformed=f.api.stream('الرصيد صفر.',{onAudio(){assert.fail('malformed audio must not be delivered');}});
  const malformedFailure=assert.rejects(malformed,{code:'invalid-audio'});
  f.send(1,{type:'audio',sequence:0,sampleRate:22050,samples:new Float32Array([0.1]).buffer});await malformedFailure;
});

test('page teardown releases a warm engine even when no speech request remains',async t=>{
  const f=await browserFixture(t);const warm=f.api.prepare();f.send(0,{type:'ready'});await warm;
  f.pagehide();assert.equal(f.workers[0].terminated,true);
});

test('a GPU failure while idle clears readiness so the next request creates a fresh engine',async t=>{
  const f=await browserFixture(t);const warm=f.api.prepare();f.send(0,{type:'ready'});await warm;
  f.send(0,{type:'fatal',error:'engine-failed'});
  assert.equal(f.workers[0].terminated,true);assert.equal(f.api.getStatus('ar').engineReady,false);
  const retry=f.api.prepare();f.send(1,{type:'ready'});await retry;
  assert.equal(f.workers.length,2);
});

test('intentional audio backpressure suspends the inference timeout until playback accepts the packet',async t=>{
  const f=await browserFixture(t);let accept;
  const speech=f.api.stream('الرصيد صفر.',{onAudio:()=>new Promise(resolve=>{accept=resolve;})});speech.catch(()=>{});
  f.send(0,{type:'audio',sequence:0,sampleRate:44100,samples:new Float32Array([0.25]).buffer});
  for(const[id,timer]of [...f.timers])if(timer.ms===90000){f.timers.delete(id);timer.fn();}
  assert.equal(f.workers[0].terminated,false,'a paused playback queue is not a failed inference request');
  accept();await flushUntil(()=>f.requests.some(request=>request.type==='audio-ack'));
  f.send(0,{type:'end'});await speech;
});

test('engine initialization failures remain visible without invalidating the installed voice pack',async t=>{
  const f=await browserFixture(t),pending=f.api.prepare();const failed=assert.rejects(pending,{code:'worker-startup-failed'});
  f.send(0,{error:'worker-startup-failed'});await failed;
  const status=f.api.getStatus('ar');
  assert.equal(status.installed,true);assert.equal(status.ready,true);assert.equal(status.engineReady,false);
  assert.equal(status.engineState,'error');assert.equal(status.engineError,'worker-startup-failed');
  assert(f.events.some(event=>event.type==='wf-reference-voice-change'&&event.detail.engineError==='worker-startup-failed'));
});

test('a runtime status subscriber cannot duplicate or orphan the active preparation',async t=>{
  const subscribers=[];
  const f=await browserFixture(t,{onEvent(event,window){
    if(event.type==='wf-reference-voice-change'&&event.detail.engineState==='initializing')subscribers.push(window.WFReferenceVoice.prepare());
  }});
  const warm=f.api.prepare();warm.catch(()=>{});for(const pending of subscribers)pending.catch(()=>{});
  assert.equal(f.requests.length,1,'preparation is registered before its initial state is published');
  f.send(0,{type:'ready'});await Promise.all([warm,...subscribers]);
});

test('completed reference phrases replay from RAM with locale and exact text isolation',async t=>{
  const f=await browserFixture(t);
  const first=f.api.synthesize('الرصيد صفر.',{locale:'ar'});f.respond(0);const blob=await first;
  const replay=f.api.synthesize('الرصيد صفر.',{locale:'ar-SY'});replay.catch(()=>{});
  assert.equal(f.requests.length,1,'replaying a completed phrase must not run the GPU again');
  assert.equal(await replay,blob);
  const translated=f.api.synthesize('الرصيد صفر.',{locale:'tr'});f.respond(1);await translated;
  const changed=f.api.synthesize('الرصيد واحد.',{locale:'ar'});f.respond(2);await changed;
  assert.equal(f.requests.length,3,'different text or a different embedding never reuses a prior quote');
  assert.equal(f.networkCalls,0);
});

test('a cached phrase still respects an already aborted owner',async t=>{
  const f=await browserFixture(t);
  const first=f.api.synthesize('الرصيد صفر.',{locale:'ar'});f.respond(0);await first;
  const controller=new AbortController();controller.abort();
  await assert.rejects(f.api.synthesize('الرصيد صفر.',{locale:'ar',signal:controller.signal}),{name:'AbortError'});
  assert.equal(f.requests.length,1);
});

test('completed phrase RAM cache evicts old audio above sixteen MiB',async t=>{
  const f=await browserFixture(t);
  // Three individually valid six-MiB WAVs exceed the sixteen-MiB audio budget.
  const wav=playbackCore.pcmToWav(new Float32Array(3*1024*1024),44100);
  const blobs=[];
  for(let index=0;index<3;index++){
    const pending=f.api.synthesize('عبارة '+index,{locale:'ar'});
    const blob=new Blob([wav],{type:'audio/wav'});blobs.push(blob);
    f.send(index,{blob});await pending;
  }
  const replay=f.api.synthesize('عبارة 1',{locale:'ar'});replay.catch(()=>{});
  assert.equal(f.requests.length,3);
  assert.equal(await replay,blobs[1]);
  const evicted=f.api.synthesize('عبارة 0',{locale:'ar'});f.respond(3);await evicted;
  assert.equal(f.requests.length,4,'the least recently used audio was released');
});

test('completed phrase RAM cache keeps at most thirty-two entries and removal clears it',async t=>{
  const f=await browserFixture(t);
  for(let index=0;index<33;index++){
    const pending=f.api.synthesize('عبارة '+index,{locale:'ar'});f.respond(index);await pending;
  }
  const replay=f.api.synthesize('عبارة 32',{locale:'ar'});replay.catch(()=>{});
  assert.equal(f.requests.length,33);await replay;
  const evicted=f.api.synthesize('عبارة 0',{locale:'ar'});f.respond(33);await evicted;
  assert.equal(f.requests.length,34);
  await f.api.remove();await f.restorePack();
  const afterRemoval=f.api.synthesize('عبارة 32',{locale:'ar'});afterRemoval.catch(()=>{});
  assert.equal(f.requests.length,35,'removal clears financial text and audio from the RAM cache');
  f.respond(34);await afterRemoval;
});

test('back-to-back completions of the same phrase count its audio once in the RAM budget',async t=>{
  const f=await browserFixture(t),wav=playbackCore.pcmToWav(new Float32Array(5*1024*1024/2),44100);
  const blob=()=>new Blob([wav],{type:'audio/wav'});
  const first=f.api.synthesize('عبارة أولى',{locale:'ar'});f.send(0,{blob:blob()});
  // The completed worker job is free before synthesize's cache microtask runs.
  const repeat=f.api.synthesize('عبارة أولى',{locale:'ar'});f.send(1,{blob:blob()});
  await Promise.all([first,repeat]);
  for(let index=2;index<4;index++){
    const pending=f.api.synthesize('عبارة '+index,{locale:'ar'});f.send(index,{blob:blob()});await pending;
  }
  const replay=f.api.synthesize('عبارة أولى',{locale:'ar'});replay.catch(()=>{});
  assert.equal(f.requests.length,4,'three five-MiB phrases fit without counting a replacement twice');
  await replay;
});

test('a completion queued before removal cannot repopulate the cleared phrase cache',async t=>{
  const f=await browserFixture(t);
  const first=f.api.synthesize('الرصيد صفر.',{locale:'ar'});f.respond(0);
  const removed=f.api.remove();await first;await removed;await f.restorePack();
  const next=f.api.synthesize('الرصيد صفر.',{locale:'ar'});next.catch(()=>{});
  assert.equal(f.requests.length,2);f.respond(1);await next;
});

test('opening a report can silently prepare its first natural phrase without audio or duplicate work',async t=>{
  const f=await browserFixture(t),text='Daily report. November twentieth. Sales five dollars.';
  assert.equal(typeof f.api.preload,'function');
  const first=f.api.preload({text,locale:'ar'}),again=f.api.preload({text,locale:'ar'});
  assert.equal(f.requests.length,1);assert.equal(f.requests[0].text,'Daily report. November twentieth.');
  assert.equal(f.audioElements.length,0);assert.equal(f.networkCalls,0);
  f.respond(0);await Promise.all([first.promise,again.promise]);
  assert.equal(f.requests.length,1,'preparation is limited to the opening phrase');assert.equal(f.audioElements.length,0);
});

test('explicit playback adopts the pending silent phrase and its old preparation handle cannot cancel it',async t=>{
  const f=await browserFixture(t),text='الرصيد خمسة دولارات.';let started=0,problem;
  const warm=f.api.preload({text,locale:'ar'});
  const handle=f.api.speak({text,locale:'ar',onStart(){started++;},onError:value=>{problem=value;}});
  try{
    await flushUntil(()=>f.audioElements.length===1);warm.cancel();
    assert.equal(f.requests.length,1);assert.equal(f.workers[0].terminated,false);
    f.respond(0);await warm.promise;await flushUntil(()=>started||problem);
    assert.equal(started,1);assert.equal(problem,undefined);assert.equal(f.requests.length,1);
  }finally{handle.cancel();}
});

test('cancelling an unused silent phrase aborts generation and cannot repopulate the phrase cache',async t=>{
  const f=await browserFixture(t),text='الرصيد خمسة دولارات.';
  const warm=f.api.preload({text,locale:'ar'}),cancelled=assert.rejects(warm.promise,{name:'AbortError'});
  warm.cancel();await cancelled;assert.equal(f.workers[0].terminated,true);assert.equal(f.audioElements.length,0);
  f.respond(0);
  const next=f.api.synthesize(text,{locale:'ar'});assert.equal(f.requests.length,2);f.respond(1);await next;
});

test('a different explicit reading replaces silent preparation without speech-busy or stale audio',async t=>{
  const f=await browserFixture(t);let started=0,problem;
  const warm=f.api.preload({text:'Old report.',locale:'ar'}),cancelled=assert.rejects(warm.promise,{name:'AbortError'});
  const handle=f.api.speak({text:'Current report.',locale:'tr',onStart(){started++;},onError:value=>{problem=value;}});
  try{
    await flushUntil(()=>f.requests.length===2||problem);await cancelled;
    assert.equal(problem,undefined);assert.equal(f.workers[0].terminated,true);assert.equal(f.requests[1].locale,'tr');
    f.respond(0);assert.equal(started,0);f.respond(1);await flushUntil(()=>started===1);
    const skipped=f.api.preload({text:'Another report.',locale:'ar'});await skipped.promise;
    assert.equal(f.requests.length,2,'silent work must not compete with the active reader');
  }finally{handle.cancel();}
});

test('silent preparation publishes its cancellable handle before initialization subscribers can reenter',async t=>{
  let subscribed=false,duplicate;
  const options={text:'الرصيد خمسة دولارات.',locale:'ar'};
  const f=await browserFixture(t,{onEvent(event,window){
    if(subscribed||event.type!=='wf-reference-voice-change'||event.detail.engineState!=='initializing')return;
    subscribed=true;duplicate=window.WFReferenceVoice.preload(options);
    assert.equal(typeof duplicate?.cancel,'function');assert.equal(typeof duplicate.promise?.then,'function');
    duplicate.cancel();
  }});
  const warm=f.api.preload(options);
  await assert.rejects(warm.promise,{name:'AbortError'});
  assert.equal(f.requests.length,0,'synchronous cancellation must prevent the worker post');
  assert.equal(f.workers[0].terminated,true);assert.equal(f.audioElements.length,0);
});

test('truncated generated WAVs fail before caching and can be regenerated on the next attempt',async t=>{
  const f=await browserFixture(t),text='الرصيد خمسة دولارات.';
  const pending=f.api.synthesize(text,{locale:'ar'}),failed=assert.rejects(pending,{code:'invalid-audio'});
  const complete=playbackCore.pcmToWav(new Float32Array(2400),24000);
  f.send(0,{blob:new Blob([complete.slice(0,-2)],{type:'audio/wav'})});await failed;
  const retry=f.api.synthesize(text,{locale:'ar'});assert.equal(f.requests.length,2);f.respond(1);await retry;
});

test('silent preparation never competes with an explicit synthesis that adopted an earlier warm phrase',async t=>{
  const f=await browserFixture(t),text='الرصيد خمسة دولارات.';
  const warm=f.api.preload({text,locale:'ar'}),explicit=f.api.synthesize(text,{locale:'ar'});
  const skipped=f.api.preload({text:'تقرير آخر.',locale:'ar'});await skipped.promise;
  assert.equal(f.requests.length,1);assert.equal(f.workers[0].terminated,false);
  f.respond(0);await Promise.all([warm.promise,explicit]);
});

test('an adopted warm phrase forwards live progress only to the current reader',async t=>{
  const f=await browserFixture(t),oldProgress=[],currentProgress=[];let started=0;
  const text='الرصيد خمسة دولارات.',warm=f.api.preload({text,locale:'ar'});
  const old=f.api.speak({text,locale:'ar',onProgress:value=>oldProgress.push(value.phase)});
  f.send(0,{type:'progress',phase:'loading',loaded:1,total:10});
  assert.deepEqual(oldProgress,['loading'],'the reader receives progress even before its audio unlock settles');
  await new Promise(resolve=>setImmediate(resolve));
  f.send(0,{type:'progress',phase:'generating'});
  assert.deepEqual(oldProgress,['loading','generating'],'adoption must not lose or duplicate generation progress');
  const cancelled=assert.rejects(warm.promise,{name:'AbortError'});old.cancel();await cancelled;
  const current=f.api.speak({text:'التقرير الجديد.',locale:'ar',onProgress:value=>currentProgress.push(value.phase),onStart(){started++;}});
  try{
    await flushUntil(()=>f.requests.length===2);f.send(0,{type:'progress',phase:'stale'});
    f.send(1,{type:'progress',phase:'generating'});
    assert.deepEqual(oldProgress,['loading','generating']);assert.deepEqual(currentProgress,['generating']);
    f.respond(1);await flushUntil(()=>started===1);
  }finally{current.cancel();}
});
