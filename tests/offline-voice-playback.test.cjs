'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),{webcrypto}=require('node:crypto');
const {catalog,runtime,pcmToWav,createWavSequence,MAX_RENDERED_AUDIO_BYTES}=require('../offline-voice.js');
const source=fs.readFileSync(path.resolve(__dirname,'../offline-voice.js'),'utf8');
const wav=(values,rate=24000)=>new Blob([pcmToWav(Float32Array.from(values),rate)],{type:'audio/wav'});
const span=(text,charIndex=0)=>({text,charIndex,charLength:text.length});

test('continuous WAV assembly preserves every PCM sample and derives boundaries from original spans',async()=>{
 const first=wav([0,.5,-.5]),second=wav([1,-1]);
 const sequence=createWavSequence();
 await sequence.append(first,span('first',0));await sequence.append(second,span('next',6));
 const result=sequence.finish(),bytes=await result.blob.arrayBuffer(),view=new DataView(bytes);
 assert.equal(bytes.byteLength,54);assert.equal(view.getUint32(4,true),46);assert.equal(view.getUint32(40,true),10);
 const actual=[...new Int16Array(bytes,44)],expected=[0,16384,-16384,32767,-32768];assert.deepEqual(actual,expected);
 assert.deepEqual(result.boundaries,[{start:0,charIndex:0,charLength:5},{start:3/24000,charIndex:6,charLength:4}]);
 assert.equal(result.duration,5/24000);
});

test('continuous rendering rejects malformed audio, changed format and unbounded memory before playback',async()=>{
 const sequence=createWavSequence();await sequence.append(wav([0]),span('a'));
 await assert.rejects(sequence.append(wav([0],22050),span('b',2)),/invalid-audio/);
 await assert.rejects(createWavSequence().append(new Blob(['not a WAV']),span('a')),/invalid-audio/);
 const broken=pcmToWav(new Float32Array(1),24000);new DataView(broken).setUint16(22,2,true);
 await assert.rejects(createWavSequence().append(new Blob([broken]),span('a')),/invalid-audio/);
 await assert.rejects(createWavSequence().append({size:MAX_RENDERED_AUDIO_BYTES+46,slice(){throw new Error('must reject before reading oversized input');}},span('a')),/speech-too-long/);
 assert.throws(()=>createWavSequence().finish(),/invalid-audio/);
});

test('reference playback uses its generator and releases its engine on stop and replacement',async()=>{
 const f=await fixture();let rendered=0,released=0,started=0;
 const source={getStatus:()=>({ready:true}),synthesize:async()=>{rendered++;return wav([0,.2,-.2]);},dispose(){released++;}};
 const old=f.api.speakGenerated({text:'Reference report.',locale:'ar',continuous:true,onStart(){started++;}},source);
 await flushUntil(()=>started===1);
 assert.equal(rendered,1);assert.equal(f.requests.length,0,'no Nabra/Piper generation occurs');
 const next=f.api.speak({text:'Explicit local voice.',locale:'ar',continuous:true});
 await flushUntil(()=>f.requests.length===1);
 assert.equal(released,1,'switching voices releases the reference engine');
 old.cancel();assert.equal(released,1,'a stale handle cannot release a newer engine');
 next.cancel();
 const current=f.api.speakGenerated({text:'Reference again.',locale:'ar',continuous:true,onStart(){started++;}},source);
 await flushUntil(()=>started===2);current.cancel();
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(released,2,'ordinary stop releases the engine after buffered audio starts');
 assert.equal(f.urls.size,0);
});

async function flushUntil(check){for(let i=0;i<40&&!check();i++)await new Promise(resolve=>setImmediate(resolve));assert(check(),'asynchronous operation reached expected state');}
async function fixture(){
 const clips=[],urls=new Map(),revoked=[],workers=[],audioElements=[],requests=[],events=[];let id=0;
 class FakeURL extends URL{
  static createObjectURL(blob){const url='blob:test-'+(++id);urls.set(url,blob);clips.push({url,blob});return url;}
  static revokeObjectURL(url){revoked.push(url);urls.delete(url);}
 }
 class Audio{
  constructor(){this.currentTime=0;this.sources=[];this.played=[];this.pauses=0;audioElements.push(this);}
  set src(value){this._src=value;this.sources.push(value);this.currentTime=0;}
  get src(){return this._src;}
  play(){this.played.push(this.src);queueMicrotask(()=>this.onplaying?.());return Promise.resolve();}
  pause(){this.pauses++;}
  removeAttribute(name){if(name==='src')this._src='';}
  load(){}
  advance(time){this.currentTime=time;this.ontimeupdate?.();}
 }
 class Worker{
  constructor(){this.terminated=false;workers.push(this);}
  postMessage(message){requests.push({worker:this,...message});}
  terminate(){this.terminated=true;}
 }
 const assets=[...runtime,...catalog.flatMap(voice=>[...(voice.runtime||[]),...voice.files])];
 const cache={async match(url){
  const asset=assets.find(item=>item.url===String(url));
  if(asset)return new Response('',{headers:{'X-WF-SHA256':asset.sha256,'Content-Length':String(asset.bytes)}});
  const voice=catalog.find(item=>String(url).includes('/__infinity_voice__/'+item.id+'.json'));
  return voice?new Response(JSON.stringify({version:1,model:voice.files[0].sha256})):undefined;
 }};
 const window={isSecureContext:true,caches:{open:async()=>cache},crypto:webcrypto,Worker,WebAssembly,
  fetch:async()=>{throw new Error('speech must remain offline');},dispatchEvent:event=>events.push(event),addEventListener(){}};
 class CustomEvent{constructor(type,options){this.type=type;this.detail=options.detail;}}
 vm.runInNewContext(source,{window,document:{baseURI:'https://example.test/'},navigator:{},location:{origin:'https://example.test'},
  Audio,Worker,URL:FakeURL,Blob,Response,CustomEvent,WebAssembly,AbortController,crypto:webcrypto,setTimeout,clearTimeout});
 await flushUntil(()=>window.WFOfflineVoice.getStatus('ar').ready);
 return {api:window.WFOfflineVoice,requests,clips,urls,revoked,audioElements,workers,
  respond(index,blob=wav(new Float32Array(2400)),problem){const request=requests[index];assert(request);request.worker.onmessage({data:{id:request.id,blob,error:problem}});}};
}

test('continuous speech waits for the complete report and uses one audio source with timed original-text boundaries',async()=>{
 const f=await fixture(),boundaries=[],progress=[];let started=0,ended=0;
 const handle=f.api.speak({text:'First. Next.',locale:'ar',continuous:true,rate:1.2,volume:.4,
  onStart(){started++;},onEnd(){ended++;},onBoundary:event=>boundaries.push(event),onProgress:event=>progress.push(event)});
 try{
  await flushUntil(()=>f.requests.length===1);const audio=f.audioElements[0];assert.equal(audio.played.length,1,'only the trusted-tap silent primer has played');
  f.respond(0);await flushUntil(()=>f.requests.length===2);assert.equal(audio.played.length,1,'no partial report is played');
  f.respond(1);await flushUntil(()=>started===1);
  assert.equal(audio.played.length,2,'one primer plus one complete report play');assert.equal(audio.sources.length,2);
  assert.equal(audio.playbackRate,1.2);assert.equal(audio.volume,.4);assert.equal(audio.preservesPitch,true);
  assert.deepEqual(progress.map(item=>[item.completed,item.total,item.phase]),[[1,2,'preparing'],[2,2,'preparing']]);
  assert.deepEqual(boundaries.map(item=>[item.charIndex,item.charLength]),[[0,6]]);
  audio.advance(.099);assert.equal(boundaries.length,1);audio.advance(.1);
  assert.deepEqual(boundaries.map(item=>[item.charIndex,item.charLength]),[[0,6],[7,5]]);
  audio.advance(.19);assert.equal(boundaries.length,2);audio.onended();await flushUntil(()=>ended===1);
  assert.equal(f.urls.size,0);assert.equal(audio.ontimeupdate,null);
 }finally{handle.cancel();}
});

test('cancelling during preparation discards late worker output without speaking a partial report',async()=>{
 const f=await fixture();let callbacks=0;
 const handle=f.api.speak({text:'First. Next.',locale:'ar',continuous:true,onStart(){callbacks++;},onEnd(){callbacks++;},onError(){callbacks++;}});
 await flushUntil(()=>f.requests.length===1);f.respond(0);await flushUntil(()=>f.requests.length===2);
 handle.cancel();f.respond(1);await new Promise(resolve=>setImmediate(resolve));
 assert.equal(f.audioElements[0].played.length,1);assert.equal(callbacks,0);assert(f.workers[0].terminated);assert.equal(f.urls.size,0);
});

test('a later synthesis failure is reported before any report audio has played',async()=>{
 const f=await fixture();let started=0,ended=0,problem;
 const handle=f.api.speak({text:'First. Next.',locale:'ar',continuous:true,onStart(){started++;},onEnd(){ended++;},onError:value=>{problem=value;}});
 try{await flushUntil(()=>f.requests.length===1);f.respond(0);await flushUntil(()=>f.requests.length===2);f.respond(1,undefined,'engine-failed');await flushUntil(()=>problem);
  assert.equal(problem.code,'engine-failed');assert.equal(started,0);assert.equal(ended,0);assert.equal(f.audioElements[0].played.length,1);assert.equal(f.urls.size,0);
 }finally{handle.cancel();}
});

test('stopping continuous audio clears boundaries, pauses playback and releases its URL',async()=>{
 const f=await fixture();let started=0,ended=0,boundaries=0;
 const handle=f.api.speak({text:'First. Next.',locale:'ar',continuous:true,onStart(){started++;},onEnd(){ended++;},onBoundary(){boundaries++;}});
 await flushUntil(()=>f.requests.length===1);f.respond(0);await flushUntil(()=>f.requests.length===2);f.respond(1);await flushUntil(()=>started===1);
 const audio=f.audioElements[0],before=audio.pauses;handle.cancel();audio.advance(.2);await new Promise(resolve=>setImmediate(resolve));
 assert(audio.pauses>before);assert.equal(ended,0);assert.equal(boundaries,1);assert.equal(audio.ontimeupdate,null);assert.equal(f.urls.size,0);
});

test('a replacement request survives late messages and errors from the cancelled worker',async()=>{
 const f=await fixture();let oldStarted=0,newStarted=0,newProblem;
 const old=f.api.speak({text:'Old report.',locale:'ar',continuous:true,onStart(){oldStarted++;}});
 await flushUntil(()=>f.requests.length===1);
 const current=f.api.speak({text:'Current report.',locale:'ar',continuous:true,onStart(){newStarted++;},onError:value=>{newProblem=value;}});
 try{
  await flushUntil(()=>f.requests.length===2);assert(f.workers[0].terminated);assert.equal(f.audioElements[0].played.length,1);
  f.respond(0);f.workers[0].onerror();await new Promise(resolve=>setImmediate(resolve));
  assert.equal(newProblem,undefined);assert.equal(f.workers[1].terminated,false);
  f.respond(1);await flushUntil(()=>newStarted===1);assert.equal(oldStarted,0);assert.equal(f.audioElements[1].played.length,2);
 }finally{old.cancel();current.cancel();}
});

test('default streamed speech still starts before its next generated chunk is ready',async()=>{
 const f=await fixture();let started=0;
 const handle=f.api.speak({text:'First. Next.',locale:'ar',onStart(){started++;}});
 try{await flushUntil(()=>f.requests.length===1);f.respond(0);await flushUntil(()=>started===1&&f.requests.length===2);
  assert.equal(f.audioElements[0].played.length,2);assert.equal(f.audioElements[0].sources.length,2);
 }finally{handle.cancel();}
});
