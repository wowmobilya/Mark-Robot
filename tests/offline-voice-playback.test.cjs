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
function audioRuntime(options={}){
 let now=0,timerId=0;const timers=new Map(),contexts=[];
 const clock={setTimeout(callback,delay=0){const id=++timerId;timers.set(id,{callback,at:now+Math.max(0,delay)});return id;},
  clearTimeout(id){timers.delete(id);},advance(seconds){const target=now+seconds*1000;
   for(let count=0;count<10000;count++){const next=[...timers].filter(([,timer])=>timer.at<=target).sort((a,b)=>a[1].at-b[1].at)[0];if(!next)break;
    now=next[1].at;timers.delete(next[0]);next[1].callback();
   }now=target;
  },get pending(){return timers.size;}};
 class AudioContext{
  constructor(){this.state='suspended';this.elapsed=0;this.since=now;this.sampleRate=44100;this.destination={};this.sources=[];this.gains=[];this.resumes=0;contexts.push(this);}
  get currentTime(){return this.elapsed+(this.state==='running'?(now-this.since)/1000:0);}
  setState(state){if(this.state===state)return;this.elapsed=this.currentTime;this.since=now;this.state=state;for(const node of this.sources)node.reschedule?.();this.onstatechange?.();}
  resume(){this.resumes++;if(options.resume)return options.resume(this,contexts);this.setState('running');return Promise.resolve();}
  suspend(){this.setState('suspended');return Promise.resolve();}
  close(){this.setState('closed');return Promise.resolve();}
  createBuffer(channels,length,sampleRate){assert.equal(channels,1);const data=new Float32Array(length);
   return {length,sampleRate,duration:length/sampleRate,copyToChannel(samples,channel){assert.equal(channel,0);data.set(samples);},getChannelData(){return data;}};
  }
  createGain(){const gain={gain:{value:1},connect(){},disconnect(){gain.disconnected=true;}};this.gains.push(gain);return gain;}
  createBufferSource(){const context=this;let timer;
   const node={buffer:null,playbackRate:{value:1},connect(){},disconnect(){node.disconnected=true;},
    start(at=0){node.startedAt=at;node.endsAt=at+node.buffer.duration/node.playbackRate.value;node.reschedule();},
    reschedule(){clock.clearTimeout(timer);if(node.startedAt===undefined||node.stopped||node.ended||context.state!=='running')return;
     timer=clock.setTimeout(()=>{node.ended=true;node.onended?.();},Math.max(0,node.endsAt-context.currentTime)*1000);
    },stop(){node.stopped=true;clock.clearTimeout(timer);}};
   this.sources.push(node);return node;
  }
  get reportSources(){return this.sources.filter(node=>node.buffer?.length>1);}
 }
 return {AudioContext,contexts,clock};
}
function streamedVoice(){
 const calls=[];let releases=0;
 return {calls,get releases(){return releases;},getStatus:()=>({ready:true}),
  synthesize:async()=>{throw new Error('streaming playback must not buffer a whole sentence');},dispose(){releases++;},
  stream(text,{locale,signal,onAudio,onProgress}){return new Promise((resolve,reject)=>{
   const finish=problem=>{signal.removeEventListener('abort',abort);problem?reject(problem):resolve();};
   const abort=()=>finish(Object.assign(new Error('cancelled'),{name:'AbortError'}));signal.addEventListener('abort',abort,{once:true});
   calls.push({text,locale,signal,finish:()=>finish(),fail:finish,progress:value=>onProgress?.(value),
    emit(samples,sampleRate=44100){return Promise.resolve(onAudio({samples,sampleRate})).catch(problem=>{finish(problem);throw problem;});}});
  });}
 };
}
async function fixture({webAudio=false,audioOptions={},audioSession,voiceLoudness}={}){
 const clips=[],urls=new Map(),revoked=[],workers=[],audioElements=[],requests=[],events=[];let id=0;
 class FakeURL extends URL{
  static createObjectURL(blob){const url='blob:test-'+(++id);urls.set(url,blob);clips.push({url,blob});return url;}
  static revokeObjectURL(url){revoked.push(url);urls.delete(url);}
 }
 class Audio{
  constructor(){this.currentTime=0;this.sources=[];this.played=[];this.pauses=0;audioElements.push(this);}
  set src(value){this._src=value;this.sources.push(value);this.currentTime=0;}
  get src(){return this._src;}
  play(){this.played.push(this.src);if(audioOptions.play)return audioOptions.play(this);queueMicrotask(()=>this.onplaying?.());return Promise.resolve();}
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
 const web=webAudio?audioRuntime(audioOptions):null;
 const window={isSecureContext:true,caches:{open:async()=>cache},crypto:webcrypto,Worker,WebAssembly,WFVoiceLoudness:voiceLoudness,...(web?{AudioContext:web.AudioContext}:{}),
  fetch:async()=>{throw new Error('speech must remain offline');},dispatchEvent:event=>events.push(event),addEventListener(){}};
 const documentListeners=new Map(),document={baseURI:'https://example.test/',hidden:false,
  addEventListener(type,listener){if(!documentListeners.has(type))documentListeners.set(type,new Set());documentListeners.get(type).add(listener);},
  removeEventListener(type,listener){documentListeners.get(type)?.delete(listener);}};
 class CustomEvent{constructor(type,options){this.type=type;this.detail=options.detail;}}
 vm.runInNewContext(source,{window,document,navigator:{audioSession},location:{origin:'https://example.test'},
  Audio,Worker,URL:FakeURL,Blob,Response,CustomEvent,WebAssembly,AbortController,crypto:webcrypto,
  setTimeout:web?web.clock.setTimeout:setTimeout,clearTimeout:web?web.clock.clearTimeout:clearTimeout});
 await flushUntil(()=>window.WFOfflineVoice.getStatus('ar').ready);
 return {api:window.WFOfflineVoice,requests,clips,urls,revoked,audioElements,workers,...web,
  setHidden(value){document.hidden=value;for(const listener of documentListeners.get('visibilitychange')||[])listener();},
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

test('PCM playback starts before its first sentence stream or remaining report has finished',async()=>{
 const f=await fixture({webAudio:true}),voice=streamedVoice(),boundaries=[];let started=0,ended=0,waiting=0;
 const playback=f.api.preparePlayback({streaming:true});
 const handle=f.api.speakGenerated({text:'First. Next.',locale:'ar',streaming:true,playback,
  onStart(){started++;},onEnd(){ended++;},onWaiting(){waiting++;},onBoundary:event=>boundaries.push(event)},voice);
 try{
  await flushUntil(()=>voice.calls.length===1);
  await voice.calls[0].emit(new Float32Array(4410).fill(.25));
  const context=f.contexts[0];assert.equal(context.resumes,1,'the context is unlocked from preparePlayback');
  assert.equal(started,0,'queuing future audio does not claim it is already speaking');
  f.clock.advance(.15);
  assert.equal(started,1);assert.equal(ended,0);assert.equal(waiting,0);
  assert.equal(voice.calls.length,1,'first audio plays while the first stream is still open');
  assert.deepEqual(boundaries.map(item=>[item.charIndex,item.charLength]),[[0,6]]);
  assert.equal(context.reportSources.length,1);assert.equal(context.reportSources[0].buffer.getChannelData(0)[0],.25);
  assert.equal(f.requests.length,0,'no other voice engine is used');
 }finally{handle.cancel();}
});

test('live engine stages reach the reader but late stages cannot overwrite a newer sentence or cancelled reading',async()=>{
 const f=await fixture({webAudio:true}),voice=streamedVoice(),progress=[];
 const handle=f.api.speakGenerated({text:'First. Next.',locale:'ar',streaming:true,onProgress:value=>progress.push(value)},voice);
 try{
  await flushUntil(()=>voice.calls.length===1);voice.calls[0].progress({phase:'loading',loaded:10,total:100});
  assert.deepEqual(progress.map(value=>[value.phase,value.loaded,value.total]),[['loading',10,100]]);
  await voice.calls[0].emit(new Float32Array(4410).fill(.25));voice.calls[0].finish();await flushUntil(()=>voice.calls.length===2);
  const count=progress.length;voice.calls[0].progress({phase:'initializing'});assert.equal(progress.length,count);
  voice.calls[1].progress({phase:'generating'});assert.equal(progress.at(-1).phase,'generating');
  handle.cancel();voice.calls[1].progress({phase:'streaming'});assert.equal(progress.at(-1).phase,'generating');
 }finally{handle.cancel();}
});

test('pending audio activation fails promptly and a fresh user playback lease can recover',async()=>{
 const f=await fixture({webAudio:true,audioOptions:{resume(context,contexts){
  if(contexts.length===1)return new Promise(()=>{});context.setState('running');return Promise.resolve();
 }}}),voice=streamedVoice(),progress=[];let problem,started=0;
 const blocked=f.api.speakGenerated({text:'Report.',locale:'ar',streaming:true,onProgress:event=>progress.push(event.phase),onError:value=>{problem=value;},onStart(){started++;}},voice);
 try{
  await new Promise(resolve=>setImmediate(resolve));f.clock.advance(5);await new Promise(resolve=>setImmediate(resolve));
  assert.equal(problem?.code,'playback-blocked','an unresolved resume must not leave the reader preparing indefinitely');
  assert.deepEqual(progress,['audio-unlock']);assert.equal(voice.calls.length,0);assert.equal(started,0);
  assert.equal(voice.releases,1);assert.equal(f.contexts[0].state,'closed');assert.equal(f.clock.pending,0);
  const nextVoice=streamedVoice(),playback=f.api.preparePlayback({streaming:true});
  const next=f.api.speakGenerated({text:'Retry.',locale:'ar',streaming:true,playback,onStart(){started++;}},nextVoice);
  try{await flushUntil(()=>nextVoice.calls.length===1);await nextVoice.calls[0].emit(new Float32Array(4410).fill(.25));f.clock.advance(.15);assert.equal(started,1);}
  finally{next.cancel();}
 }finally{blocked.cancel();}
});

test('a context suspended while the first PCM is generating resumes before scheduling audible speech',async()=>{
 const f=await fixture({webAudio:true}),voice=streamedVoice(),progress=[];let started=0,problem;
 const handle=f.api.speakGenerated({text:'Report.',locale:'ar',streaming:true,onProgress:event=>progress.push(event.phase),onStart(){started++;},onError:value=>{problem=value;}},voice);
 try{
  await flushUntil(()=>voice.calls.length===1);const context=f.contexts[0];await context.suspend();
  await voice.calls[0].emit(new Float32Array(4410).fill(.25));
  assert.equal(context.state,'running');assert.equal(context.resumes,2,'the previously unlocked context is resumed once');
  assert.deepEqual(progress,['audio-resume']);assert.equal(started,0);f.clock.advance(.15);assert.equal(started,1);assert.equal(problem,undefined);
 }finally{handle.cancel();}
});

test('blocked recovery from an audio interruption reports an error without pretending playback started',async()=>{
 const f=await fixture({webAudio:true,audioOptions:{resume(context){
  if(context.resumes>1)return new Promise(()=>{});context.setState('running');return Promise.resolve();
 }}}),voice=streamedVoice();let started=0,ended=0,problem;
 const handle=f.api.speakGenerated({text:'Report.',locale:'ar',streaming:true,onStart(){started++;},onEnd(){ended++;},onError:value=>{problem=value;}},voice);
 try{
  await flushUntil(()=>voice.calls.length===1);await voice.calls[0].emit(new Float32Array(44100).fill(.25));
  const context=f.contexts[0];await context.suspend();f.clock.advance(.5);
  assert.equal(started,0,'the audio clock is suspended even though wall-clock timers run');
  f.clock.advance(5);await new Promise(resolve=>setImmediate(resolve));
  assert.equal(problem?.code,'playback-interrupted');assert.equal(context.resumes,2);assert.equal(ended,0);
  assert(context.reportSources.every(node=>node.stopped));assert.equal(voice.releases,1);assert.equal(f.clock.pending,0);
 }finally{handle.cancel();}
});

test('intentional PCM pause preserves its queue for a later resume without reporting an interruption',async()=>{
 const f=await fixture({webAudio:true}),voice=streamedVoice(),pauses=[];let started=0,resumed=0,ended=0,problem;
 const handle=f.api.speakGenerated({text:'Report.',locale:'ar',streaming:true,onStart(){started++;},onPause:event=>pauses.push(event.reason),onResume(){resumed++;},onEnd(){ended++;},onError:value=>{problem=value;}},voice);
 try{
  await flushUntil(()=>voice.calls.length===1);await voice.calls[0].emit(new Float32Array(44100).fill(.25));f.clock.advance(.2);assert.equal(started,1);
  handle.pause();const context=f.contexts[0],pausedAt=context.currentTime;assert.equal(context.state,'suspended');
  f.clock.advance(120);await new Promise(resolve=>setImmediate(resolve));
  assert.equal(context.currentTime,pausedAt);assert.equal(problem,undefined);assert.equal(ended,0);assert.equal(voice.releases,0);assert.deepEqual(pauses,['user']);
  await handle.resume();assert.equal(context.state,'running');assert.equal(resumed,1);assert.equal(started,2,'audible queued speech resumes at its prior position');
  voice.calls[0].finish();f.clock.advance(1);await flushUntil(()=>ended===1);assert.equal(voice.releases,1);
 }finally{handle.cancel();}
});

test('a synchronous pause in onStart holds its original boundary until playback resumes',async()=>{
 const f=await fixture({webAudio:true}),voice=streamedVoice(),boundaries=[];let started=0,handle;
 handle=f.api.speakGenerated({text:'Report.',locale:'ar',streaming:true,
  onStart(){started++;if(started===1)handle.pause();},onBoundary:value=>boundaries.push(value)},voice);
 try{
  await flushUntil(()=>voice.calls.length===1);await voice.calls[0].emit(new Float32Array(44100).fill(.25));f.clock.advance(.15);
  assert.equal(f.contexts[0].state,'suspended');assert.equal(boundaries.length,0,'pause takes effect before a sentence is highlighted');
  await handle.resume();assert.equal(started,2);assert.deepEqual(boundaries.map(value=>[value.charIndex,value.charLength]),[[0,7]]);
 }finally{handle.cancel();}
});

test('a hidden page keeps playing and holds an OS interruption until foreground recovery',async()=>{
 const f=await fixture({webAudio:true}),voice=streamedVoice(),pauses=[];let started=0,resumed=0,problem;
 const handle=f.api.speakGenerated({text:'Report.',locale:'ar',streaming:true,onStart(){started++;},onPause:event=>pauses.push(event.reason),onResume(){resumed++;},onError:value=>{problem=value;}},voice);
 try{
  await flushUntil(()=>voice.calls.length===1);await voice.calls[0].emit(new Float32Array(44100).fill(.25));f.setHidden(true);f.clock.advance(.2);
  const context=f.contexts[0];assert.equal(started,1);assert.equal(context.state,'running');assert.deepEqual(pauses,[],'hiding alone does not stop audio');
  context.setState('interrupted');const interruptedAt=context.currentTime;f.clock.advance(120);await new Promise(resolve=>setImmediate(resolve));
  assert.equal(context.currentTime,interruptedAt);assert.equal(problem,undefined);assert.equal(voice.releases,0);assert.deepEqual(pauses,['background']);
  f.setHidden(false);await flushUntil(()=>context.state==='running');assert.equal(resumed,1);assert.equal(started,2);
 }finally{handle.cancel();}
});

test('returning to the foreground never overrides an intentional PCM pause',async()=>{
 const f=await fixture({webAudio:true}),voice=streamedVoice();let resumed=0;
 const handle=f.api.speakGenerated({text:'Report.',locale:'ar',streaming:true,onResume(){resumed++;}},voice);
 try{
  await flushUntil(()=>voice.calls.length===1);await voice.calls[0].emit(new Float32Array(44100).fill(.25));handle.pause();
  const context=f.contexts[0];f.setHidden(true);f.clock.advance(120);f.setHidden(false);await new Promise(resolve=>setImmediate(resolve));
  assert.equal(context.state,'suspended');assert.equal(resumed,0);assert.equal(context.resumes,1);
  await handle.resume();assert.equal(resumed,1);
 }finally{handle.cancel();}
});

test('playback AudioSession ownership spans overlapping leases and does not overwrite another session type',async()=>{
 const audioSession={type:'ambient'},f=await fixture({webAudio:true,audioSession,audioOptions:{resume(context){
  assert.equal(audioSession.type,'playback','media session type is selected before gesture activation');context.setState('running');return Promise.resolve();
 }}});
 const first=f.api.preparePlayback({streaming:true}),next=f.api.preparePlayback({streaming:true});
 assert.equal(await first.unlock,null);assert.equal(await next.unlock,null);
 assert.equal(audioSession.type,'playback');first.dispose();assert.equal(audioSession.type,'playback');next.dispose();assert.equal(audioSession.type,'ambient');
 const changed=f.api.preparePlayback({streaming:true});audioSession.type='play-and-record';changed.dispose();assert.equal(audioSession.type,'play-and-record');
});

test('PCM packets stay contiguous at the selected rate and finish only after the last original-text boundary drains',async()=>{
 const f=await fixture({webAudio:true}),voice=streamedVoice(),boundaries=[],progress=[];let started=0,ended=0,waiting=0;
 const handle=f.api.speakGenerated({text:'123. Next.',locale:'ar',streaming:true,rate:1.25,volume:0,
  chunks:[{text:'one hundred twenty three.',charIndex:0,charLength:4},{text:'Next.',charIndex:5,charLength:5}],
  onStart(){started++;},onEnd(){ended++;},onWaiting(){waiting++;},onBoundary:event=>boundaries.push(event),onProgress:event=>progress.push(event)},voice);
 try{
  await flushUntil(()=>voice.calls.length===1);assert.equal(voice.calls[0].text,'one hundred twenty three.');
  await voice.calls[0].emit(new Float32Array(4410).fill(.25));await voice.calls[0].emit(new Float32Array(4410).fill(.5));voice.calls[0].finish();
  await flushUntil(()=>voice.calls.length===2);await voice.calls[1].emit(new Float32Array(4410).fill(.75));voice.calls[1].finish();
  await flushUntil(()=>progress.length===2);
  const context=f.contexts[0],nodes=context.reportSources;
  const second=nodes.find(node=>node.buffer.getChannelData(0)[0]===.75);
  assert(second);assert.equal(nodes[0].buffer.getChannelData(0)[0],.25);
  assert(nodes.every(node=>node.playbackRate.value===1));assert.equal(context.gains[0].gain.value,0,'muted volume is retained');
  for(let i=1;i<nodes.length;i++)assert.equal(nodes[i].startedAt,nodes[i-1].endsAt);
  assert(Math.abs(second.startedAt-nodes[0].startedAt-.2/1.25)<1e-8);
  assert(Math.abs(nodes.at(-1).endsAt-second.startedAt-.1/1.25)<1e-8);
  assert.equal(ended,0,'finishing synthesis does not finish playback');
  f.clock.advance(nodes[0].startedAt+.01);assert.equal(started,1);assert.deepEqual(boundaries.map(item=>[item.charIndex,item.charLength]),[[0,4]]);
  f.clock.advance(second.startedAt-context.currentTime+.01);assert.deepEqual(boundaries.map(item=>[item.charIndex,item.charLength]),[[0,4],[5,5]]);
  assert.equal(ended,0);f.clock.advance(nodes.at(-1).endsAt-context.currentTime+.01);await flushUntil(()=>ended===1);
  assert.equal(waiting,0,'already buffered neighboring packets never show preparation');assert.equal(voice.releases,1);
 }finally{handle.cancel();}
});

test('cancelling PCM playback stops queued sound immediately and ignores late audio and callbacks',async()=>{
 const f=await fixture({webAudio:true}),voice=streamedVoice();let started=0,ended=0,errors=0,boundaries=0;
 const handle=f.api.speakGenerated({text:'First. Next.',locale:'ar',streaming:true,onStart(){started++;},onEnd(){ended++;},onError(){errors++;},onBoundary(){boundaries++;}},voice);
 await flushUntil(()=>voice.calls.length===1);await voice.calls[0].emit(new Float32Array(22050).fill(.5));
 const context=f.contexts[0];f.clock.advance(.15);const nodes=context.reportSources.slice();assert.equal(started,1);
 handle.cancel();assert(nodes.every(node=>node.stopped));assert.equal(context.state,'closed');assert.equal(voice.releases,1);
 await voice.calls[0].emit(new Float32Array(4410).fill(.25));voice.calls[0].finish();f.clock.advance(10);await new Promise(resolve=>setImmediate(resolve));
 assert.equal(context.sources.length,nodes.length+1,'late PCM creates no sources beyond the unlock primer');
 assert.equal(started,1);assert.equal(boundaries,1);assert.equal(ended,0);assert.equal(errors,0);assert.equal(f.clock.pending,0);
 handle.cancel();assert.equal(voice.releases,1);
});

test('PCM producers pause when playback is far behind instead of buffering an entire fast-generated report',async()=>{
 const f=await fixture({webAudio:true}),voice=streamedVoice();let accepted=false;
 const handle=f.api.speakGenerated({text:'Long report.',locale:'ar',streaming:true},voice);
 try{
  await flushUntil(()=>voice.calls.length===1);
  const pending=voice.calls[0].emit(new Float32Array(44100*20).fill(.25)).then(()=>{accepted=true;});
  await new Promise(resolve=>setImmediate(resolve));const context=f.contexts[0];
  assert(context.reportSources.length>0,'playback starts while a large PCM packet is being consumed');
  assert.equal(accepted,false,'the producer receives backpressure');
  assert(Math.max(...context.reportSources.map(node=>node.endsAt))<20,'the full report is not queued in advance');
  for(let second=0;second<15&&!accepted;second++){f.clock.advance(1);await new Promise(resolve=>setImmediate(resolve));}
  await pending;assert(accepted);assert(context.reportSources.every(node=>node.buffer.duration<=1.3),'large PCM packets use bounded audio buffers');
 }finally{handle.cancel();}
});

test('PCM preparation is shown only for a real underrun and clears when audible playback resumes',async()=>{
 const f=await fixture({webAudio:true}),voice=streamedVoice(),states=[];
 const handle=f.api.speakGenerated({text:'Report.',locale:'ar',streaming:true,onStart(){states.push('speaking');},onWaiting(){states.push('waiting');}},voice);
 try{
  await flushUntil(()=>voice.calls.length===1);assert.deepEqual(states,[],'opening a stream does not emit a false underrun');
  await voice.calls[0].emit(new Float32Array(4410).fill(.25));f.clock.advance(.15);assert.deepEqual(states,['speaking']);
  f.clock.advance(.3);assert.deepEqual(states,['speaking','waiting']);f.clock.advance(1);assert.equal(states.length,2);
  await voice.calls[0].emit(new Float32Array(4410).fill(.5));assert.equal(states.length,2,'queued future audio has not resumed yet');
  f.clock.advance(.15);assert.deepEqual(states,['speaking','waiting','speaking']);
 }finally{handle.cancel();}
});

test('malformed PCM is rejected before it reaches the speakers and releases its voice once',async()=>{
 const impostor=Object.defineProperty({length:1,byteLength:4,0:.25},Symbol.toStringTag,{value:'Float32Array'});
 for(const [samples,frequency] of [[new Float32Array(),44100],[new Float32Array([NaN]),44100],[new Float64Array([.25]),44100],[new Float32Array([.25]),0],[impostor,44100]]){
  const f=await fixture({webAudio:true}),voice=streamedVoice();let problem,started=0,ended=0;
  const handle=f.api.speakGenerated({text:'Report.',locale:'ar',streaming:true,onError:value=>{problem=value;},onStart(){started++;},onEnd(){ended++;}},voice);
  try{
   await flushUntil(()=>voice.calls.length===1);await assert.rejects(voice.calls[0].emit(samples,frequency));await flushUntil(()=>problem);
   assert.equal(problem.code,'invalid-audio');assert.equal(f.contexts[0].reportSources.length,0);assert.equal(started,0);assert.equal(ended,0);
   assert.equal(voice.releases,1);assert.equal(f.contexts[0].state,'closed');assert.equal(f.clock.pending,0);
  }finally{handle.cancel();}
 }
});

test('a PCM stream failure stops already queued sound and never reports successful completion',async()=>{
 const f=await fixture({webAudio:true}),voice=streamedVoice();let problem,ended=0;
 const handle=f.api.speakGenerated({text:'Report.',locale:'ar',streaming:true,onError:value=>{problem=value;},onEnd(){ended++;}},voice);
 try{
  await flushUntil(()=>voice.calls.length===1);await voice.calls[0].emit(new Float32Array(44100).fill(.25));
  const nodes=f.contexts[0].reportSources.slice();voice.calls[0].fail(Object.assign(new Error('engine-failed'),{code:'engine-failed'}));
  await flushUntil(()=>problem);assert.equal(problem.code,'engine-failed');assert(nodes.every(node=>node.stopped));
  f.clock.advance(2);assert.equal(ended,0);assert.equal(voice.releases,1);assert.equal(f.clock.pending,0);
 }finally{handle.cancel();}
});

test('cancellation releases a producer waiting for PCM queue capacity',async()=>{
 const f=await fixture({webAudio:true}),voice=streamedVoice();let errors=0;
 const handle=f.api.speakGenerated({text:'Report.',locale:'ar',streaming:true,onError(){errors++;}},voice);
 await flushUntil(()=>voice.calls.length===1);
 const pending=voice.calls[0].emit(new Float32Array(44100*20).fill(.25));
 const rejected=assert.rejects(pending,{name:'AbortError'});
 await new Promise(resolve=>setImmediate(resolve));handle.cancel();await rejected;
 assert(f.contexts[0].reportSources.every(node=>node.stopped));assert.equal(voice.releases,1);assert.equal(errors,0);assert.equal(f.clock.pending,0);
});

test('a new PCM reading survives stale callbacks and cancellation from the previous reading',async()=>{
 const f=await fixture({webAudio:true}),oldVoice=streamedVoice(),newVoice=streamedVoice();let started=0,errors=0;
 const old=f.api.speakGenerated({text:'Old report.',locale:'ar',streaming:true,onError(){errors++;}},oldVoice);
 await flushUntil(()=>oldVoice.calls.length===1);await oldVoice.calls[0].emit(new Float32Array(4410).fill(.25));
 const current=f.api.speakGenerated({text:'Current report.',locale:'ar',streaming:true,onStart(){started++;},onError(){errors++;}},newVoice);
 try{
  await flushUntil(()=>newVoice.calls.length===1);assert.equal(oldVoice.releases,1);
  await oldVoice.calls[0].emit(new Float32Array(4410).fill(.75));old.cancel();oldVoice.calls[0].fail(new Error('late failure'));
  await newVoice.calls[0].emit(new Float32Array(4410).fill(.5));f.clock.advance(.15);
  assert.equal(started,1);assert.equal(errors,0);assert.equal(newVoice.releases,0);assert.equal(f.contexts[1].state,'running');
 }finally{old.cancel();current.cancel();}
});

test('streaming requests retain sentence playback when Web Audio is unavailable',async()=>{
 const f=await fixture();let rendered=0,started=0,released=0;
 const voice={getStatus:()=>({ready:true}),stream(){throw new Error('PCM requires Web Audio');},synthesize:async()=>{rendered++;return wav([0,.25,-.25]);},dispose(){released++;}};
 const handle=f.api.speakGenerated({text:'First. Next.',locale:'ar',streaming:true,onStart(){started++;}},voice);
 try{await flushUntil(()=>started===1);assert.equal(rendered,2);assert.equal(f.audioElements[0].played.length,2);assert.equal(f.requests.length,0);}
 finally{handle.cancel();}assert.equal(released,1);
});

test('buffered Mark fallback pauses and resumes the same audio position without synthesizing again',async()=>{
 const f=await fixture(),pauses=[];let rendered=0,started=0,resumed=0,ended=0;
 const voice={getStatus:()=>({ready:true}),synthesize:async()=>{rendered++;return wav(new Float32Array(2400));}};
 const handle=f.api.speakGenerated({text:'Report.',locale:'ar',streaming:true,onStart(){started++;},onPause:event=>pauses.push(event.reason),onResume(){resumed++;},onEnd(){ended++;}},voice);
 try{
  await flushUntil(()=>started===1);const audio=f.audioElements[0],url=audio.src;audio.advance(.04);
  handle.pause();assert.deepEqual(pauses,['user']);assert.equal(audio.currentTime,.04);
  await handle.resume();await flushUntil(()=>started===2);assert.equal(resumed,1);assert.equal(audio.src,url);assert.equal(audio.currentTime,.04);assert.equal(rendered,1);
  audio.onended();await flushUntil(()=>ended===1);
 }finally{handle.cancel();}
});

test('pausing buffered preparation keeps the later clip silent until explicit resume',async()=>{
 const f=await fixture();let generated,started=0;
 const voice={getStatus:()=>({ready:true}),synthesize:()=>new Promise(resolve=>{generated=resolve;})};
 const handle=f.api.speakGenerated({text:'Report.',locale:'ar',onStart(){started++;}},voice);
 try{
  await flushUntil(()=>generated);handle.pause();generated(wav(new Float32Array(2400)));await new Promise(resolve=>setImmediate(resolve));
  assert.equal(f.audioElements[0].played.length,1,'only the gesture primer played');assert.equal(started,0);
  await handle.resume();await flushUntil(()=>started===1);assert.equal(f.audioElements[0].played.length,2);
 }finally{handle.cancel();}
});

for(const late of [false,true])test('an intentional native pause survives '+(late?'a stale play rejection after resume':'its pending play rejection'),async()=>{
 const attempts=[];let errors=0,started=0,ended=0,generated=0;
 const f=await fixture({audioOptions:{play(audio){
  if(audio.played.length===1)return Promise.resolve();
  return new Promise((resolve,reject)=>attempts.push({resolve,reject}));
 }}});
 const voice={getStatus:()=>({ready:true}),synthesize:async()=>{generated++;return wav(new Float32Array(4800));}};
 const handle=f.api.speakGenerated({text:'Report.',locale:'ar',onStart(){started++;},onEnd(){ended++;},onError(){errors++;}},voice);
 try{
  await flushUntil(()=>attempts.length===1);const audio=f.audioElements[0],url=audio.src;handle.pause();
  let resumed;if(late){resumed=handle.resume();await flushUntil(()=>attempts.length===2);}
  attempts[0].reject(Object.assign(new Error('play interrupted by pause'),{name:'AbortError'}));
  await new Promise(resolve=>setImmediate(resolve));assert.equal(errors,0);assert.equal(audio.src,url);assert.equal(generated,1);
  if(!late){resumed=handle.resume();await flushUntil(()=>attempts.length===2);}
  attempts[1].resolve();audio.onplaying();await resumed;
  assert.equal(started,1);assert.equal(errors,0);audio.onended();await flushUntil(()=>ended===1);
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

test('native phrase playback preserves generation progress and never plays a partial phrase during a slow generation',async()=>{
 const f=await fixture(),calls=[],phases=[],boundaries=[],states=[];let ended=0;
 const voice={getStatus:()=>({ready:true}),synthesize(text,options){return new Promise((resolve,reject)=>calls.push({text,...options,resolve,reject}));}};
 const playback=f.api.preparePlayback();
 const handle=f.api.speakGenerated({text:'First. Next.',locale:'ar',streaming:false,continuous:false,playback,
  onProgress:value=>phases.push(value.phase),onStart:()=>states.push('speaking'),onWaiting:()=>states.push('waiting'),
  onBoundary:value=>boundaries.push(value.charIndex),onEnd:()=>ended++},voice);
 try{
  await flushUntil(()=>calls.length===1);const audio=f.audioElements[0];
  assert.equal(typeof calls[0].onProgress,'function');calls[0].onProgress({phase:'generating'});
  assert.deepEqual(phases,['generating']);assert.equal(audio.played.length,1,'only the gesture primer plays before a whole phrase is ready');
  calls[0].resolve(wav(new Float32Array(48000).fill(.2)));await flushUntil(()=>calls.length===2&&states.includes('speaking'));
  assert.equal(f.audioElements.length,1,'the original gesture-unlocked media element owns the report');
  const first=audio.src,events=states.length;audio.advance(1.4);
  assert.equal(audio.src,first);assert.equal(states.length,events,'slow next generation cannot interrupt the current complete phrase');
  calls[0].onProgress({phase:'late-stale-progress'});assert(!phases.includes('late-stale-progress'));
  audio.onended();await flushUntil(()=>states.at(-1)==='waiting');assert.equal(ended,0);
  calls[1].resolve(wav(new Float32Array(24000).fill(.4)));await flushUntil(()=>audio.src!==first&&states.at(-1)==='speaking');
  assert.deepEqual(boundaries,[0,7]);audio.onended();await flushUntil(()=>ended===1);
 }finally{handle.cancel();}
});

test('native phrase playback rejects malformed generated WAV before exposing it to the media element',async()=>{
 const f=await fixture();let problem,started=0;
 const voice={getStatus:()=>({ready:true}),synthesize:async()=>new Blob(['broken generated audio'],{type:'audio/wav'})};
 const handle=f.api.speakGenerated({text:'Report.',locale:'ar',streaming:false,onStart(){started++;},onError:value=>{problem=value;}},voice);
 try{
  await flushUntil(()=>problem||started);assert.equal(problem?.code,'invalid-audio');
  assert.equal(started,0);assert.equal(f.audioElements[0].played.length,1);assert.equal(f.urls.size,0);
 }finally{handle.cancel();}
});

test('native Mark phrases balance loudness before playback while retaining user volume and original text spans',async()=>{
 const calls=[],boundaries=[];let started=0;
 const f=await fixture({voiceLoudness:{async normalize(blob,options){calls.push({blob,options});return wav(new Float32Array(2400).fill(.5));}}});
 const original=wav(new Float32Array(2400).fill(.05)),voice={getStatus:()=>({ready:true}),synthesize:async()=>original};
 const handle=f.api.speakGenerated({text:'Report.',locale:'ar',normalizeGenerated:true,volume:.35,onStart(){started++;},onBoundary:value=>boundaries.push(value)},voice);
 try{
  await flushUntil(()=>started===1);assert.equal(calls.length,1);assert.equal(calls[0].blob,original);assert.equal(calls[0].options.locale,'ar');
  assert.equal(calls[0].options.signal.aborted,false);assert.equal(f.audioElements[0].volume,.35);
  const bytes=await f.clips.at(-1).blob.arrayBuffer();assert.equal(new DataView(bytes).getInt16(44,true),16384);
  assert.deepEqual(boundaries.map(value=>[value.charIndex,value.charLength]),[[0,7]]);
 }finally{handle.cancel();}
});

test('phrase lookahead starts the next inference while the first phrase is still being normalized',async()=>{
 const calls=[];let normalized,started=0;
 const gate=new Promise(resolve=>{normalized=resolve;});
 const f=await fixture({voiceLoudness:{async normalize(blob){await gate;return blob;}}});
 const voice={getStatus:()=>({ready:true}),synthesize(text,options){return new Promise(resolve=>calls.push({text,...options,resolve}));}};
 const handle=f.api.speakGenerated({text:'First complete sentence. Next complete sentence.',locale:'ar',lookaheadPhrases:3,
  normalizeGenerated:true,onStart(){started++;}},voice);
 try{
  await flushUntil(()=>calls.length===1);calls[0].resolve(wav(new Float32Array(48000).fill(.2)));
  await flushUntil(()=>calls.length===2);
  assert.equal(started,0,'loudness processing still holds the first phrase');
  assert.equal(calls[1].text,'Next complete sentence.');
 }finally{handle.cancel();normalized();}
});

test('the first native clip buffers a tiny opening with the next complete phrase instead of stopping after two words',async()=>{
 const f=await fixture(),calls=[],boundaries=[];let started=0,ended=0;
 const voice={getStatus:()=>({ready:true}),synthesize(text,options){return new Promise(resolve=>calls.push({text,...options,resolve}));}};
 const handle=f.api.speakGenerated({text:'Report ready. Date and figures follow. Final sentence.',locale:'ar',
  lookaheadPhrases:2,minimumBufferSeconds:2.5,onStart(){started++;},onEnd(){ended++;},onBoundary:value=>boundaries.push(value.charIndex)},voice);
 try{
  await flushUntil(()=>calls.length===1);calls[0].resolve(wav(new Float32Array(24000).fill(.2)));
  await flushUntil(()=>calls.length===2);
  assert.equal(started,0,'a one-second intro cannot be exposed before the next phrase');
  calls[1].resolve(wav(new Float32Array(48000).fill(.3)));
  await flushUntil(()=>started===1&&calls.length===3);
  const audio=f.audioElements[0],blob=f.urls.get(audio.src),bytes=await blob.arrayBuffer();
  assert.equal(bytes.byteLength,44+72000*2,'one native clip contains both complete phrases');
  assert.deepEqual(boundaries,[0]);audio.advance(1);assert.deepEqual(boundaries,[0,14]);
  assert.equal(ended,0,'pending later generation is not a completed report');
  handle.cancel();assert.equal(calls[2].signal.aborted,true);assert.equal(f.urls.size,0);
 }finally{handle.cancel();}
});

test('bounded phrase lookahead fills during playback and joins ready clips without losing boundaries or samples',async()=>{
 const f=await fixture(),calls=[],boundaries=[];let started=0,ended=0;
 const voice={getStatus:()=>({ready:true}),synthesize(text,options){return new Promise(resolve=>calls.push({text,...options,resolve}));}};
 const handle=f.api.speakGenerated({text:'First. Second. Third. Fourth. Fifth.',locale:'ar',lookaheadPhrases:2,
  onStart(){started++;},onEnd(){ended++;},onBoundary:value=>boundaries.push(value.charIndex)},voice);
 try{
  await flushUntil(()=>calls.length===1);calls[0].resolve(wav(new Float32Array(48000).fill(.1)));
  await flushUntil(()=>calls.length===2&&started===1);
  calls[1].resolve(wav(new Float32Array(48000).fill(.2)));await flushUntil(()=>calls.length===3);
  calls[2].resolve(wav(new Float32Array(48000).fill(.3)));await new Promise(resolve=>setImmediate(resolve));
  assert.equal(calls.length,3,'only two phrases are generated ahead of the current clip');
  const audio=f.audioElements[0];audio.onended();await flushUntil(()=>started===2&&calls.length===4);
  const joined=await f.urls.get(audio.src).arrayBuffer();assert.equal(joined.byteLength,44+96000*2);
  assert.equal(new DataView(joined).getInt16(44,true),6553);assert.equal(new DataView(joined).getInt16(44+48000*2,true),9830);
  audio.advance(2);assert.deepEqual(boundaries,[0,7,15]);
  calls[3].resolve(wav(new Float32Array(24000).fill(.4)));await flushUntil(()=>calls.length===5);
  calls[4].resolve(wav(new Float32Array(24000).fill(.5)));await new Promise(resolve=>setImmediate(resolve));
  audio.onended();await flushUntil(()=>started===3);assert.equal(ended,0);
  audio.advance(1);assert.deepEqual(boundaries,[0,7,15,22,30]);audio.onended();await flushUntil(()=>ended===1);
  assert.equal(f.urls.size,0);
 }finally{handle.cancel();}
});

test('cancelling buffered preparation prevents queued inference and ignores late completed phrases',async()=>{
 const f=await fixture(),calls=[];let started=0,ended=0,errors=0;
 const voice={getStatus:()=>({ready:true}),synthesize(text,options){return new Promise(resolve=>calls.push({text,...options,resolve}));}};
 const handle=f.api.speakGenerated({text:'First. Second. Third. Fourth.',locale:'ar',lookaheadPhrases:3,minimumBufferSeconds:2.5,
  onStart(){started++;},onEnd(){ended++;},onError(){errors++;}},voice);
 await flushUntil(()=>calls.length===1);calls[0].resolve(wav(new Float32Array(24000).fill(.2)));
 await flushUntil(()=>calls.length===2);handle.cancel();assert.equal(calls[1].signal.aborted,true);
 calls[1].resolve(wav(new Float32Array(48000).fill(.3)));await new Promise(resolve=>setImmediate(resolve));
 assert.equal(calls.length,2);assert.equal(started,0);assert.equal(ended,0);assert.equal(errors,0);assert.equal(f.urls.size,0);
});

test('a truncated opening continuation fails without playing a tiny intro or reporting completion',async()=>{
 const f=await fixture(),calls=[];let started=0,ended=0,problem;
 const voice={getStatus:()=>({ready:true}),synthesize(text,options){return new Promise(resolve=>calls.push({text,...options,resolve}));}};
 const handle=f.api.speakGenerated({text:'Report ready. Date and figures. Remaining details.',locale:'ar',lookaheadPhrases:2,minimumBufferSeconds:2.5,
  onStart(){started++;},onEnd(){ended++;},onError:value=>{problem=value;}},voice);
 try{
  await flushUntil(()=>calls.length===1);calls[0].resolve(wav(new Float32Array(24000).fill(.2)));
  await flushUntil(()=>calls.length===2);const complete=pcmToWav(new Float32Array(48000),24000);
  calls[1].resolve(new Blob([complete.slice(0,-2)],{type:'audio/wav'}));await flushUntil(()=>problem);
  assert.equal(problem.code,'invalid-audio');assert.equal(started,0);assert.equal(ended,0);assert.equal(f.urls.size,0);
  assert(calls.every(call=>call.signal.aborted));
 }finally{handle.cancel();}
});

test('the stored Arabic speech sample reaches native playback with every PCM byte and its final release intact',async()=>{
 const f=await fixture(),original=fs.readFileSync(path.resolve(__dirname,'../assets/reference-voice/samples/ar.wav'));let started=0,ended=0;
 const voice={getStatus:()=>({ready:true}),synthesize:async()=>new Blob([original],{type:'audio/wav'})};
 const handle=f.api.speakGenerated({text:'Stored Arabic report sample.',locale:'ar',lookaheadPhrases:3,minimumBufferSeconds:2.5,
  onStart(){started++;},onEnd(){ended++;}},voice);
 try{
  await flushUntil(()=>started===1);const audio=f.audioElements[0],played=Buffer.from(await f.urls.get(audio.src).arrayBuffer());
  assert.equal(played.length,1123124);assert.equal(new DataView(played.buffer,played.byteOffset,44).getUint32(24,true),44100);
  assert.deepEqual(played,original,'the queue cannot trim, repeat, or omit samples from a generated phrase');
  audio.onended();await flushUntil(()=>ended===1);assert.equal(f.urls.size,0);
 }finally{handle.cancel();}
});

test('changing tempo while paused changes already-generated PCM from the same position',async()=>{
 const f=await fixture({webAudio:true}),voice=streamedVoice(),boundaries=[],progress=[];let ended=0;
 const handle=f.api.speakGenerated({text:'First. Next.',locale:'ar',streaming:true,onBoundary:e=>boundaries.push(e.charIndex),
  onProgress:e=>progress.push(e),onEnd(){ended++;}},voice);
 try{
  await flushUntil(()=>voice.calls.length===1);
  await voice.calls[0].emit(new Float32Array(44100*2).fill(.25));voice.calls[0].finish();
  await flushUntil(()=>voice.calls.length===2);
  await voice.calls[1].emit(new Float32Array(44100).fill(.75));voice.calls[1].finish();
  await flushUntil(()=>progress.length===2);f.clock.advance(.2);handle.pause();
  const context=f.contexts[0],committed=context.reportSources,firstStart=committed[0].startedAt;
  const oldDuration=committed.at(-1).endsAt-firstStart;
  assert(committed.at(-1).endsAt-context.currentTime<=.47,'little audio is committed at the old speed');
  handle.setRate(.75);f.clock.advance(2);assert.equal(context.currentTime,.2);
  assert.deepEqual(boundaries,[0]);await handle.resume();f.clock.advance(5);await flushUntil(()=>ended===1);
  const nodes=context.reportSources,second=nodes.find(node=>node.buffer.getChannelData(0)[0]===.75);
  assert(Math.abs(second.startedAt-firstStart-oldDuration-(2-oldDuration)/.75)<=1/44100);
  assert(Math.abs(nodes.at(-1).endsAt-second.startedAt-1/.75)<=1/44100);
  for(let i=1;i<nodes.length;i++)assert.equal(nodes[i].startedAt,nodes[i-1].endsAt);
  assert.deepEqual(boundaries,[0,7]);assert.equal(voice.calls.length,2);assert.equal(voice.releases,1);
 }finally{handle.cancel();}
});

test('HTML audio speed changes preserve the current media time through pause and resume',async()=>{
 const f=await fixture(),voice={getStatus:()=>({ready:true}),synthesize:async()=>wav(new Float32Array(2400))};let started=0;
 const handle=f.api.speakGenerated({text:'Report.',locale:'ar',rate:.85,onStart(){started++;}},voice);
 try{
  await flushUntil(()=>started===1);const audio=f.audioElements[0];audio.advance(.04);handle.pause();handle.setRate(1.2);
  assert.equal(audio.playbackRate,1.2);assert.equal(audio.preservesPitch,true);assert.equal(audio.currentTime,.04);
  await handle.resume();assert.equal(audio.currentTime,.04);assert.equal(audio.sources.length,2);
 }finally{handle.cancel();}
});

test('a synchronous pause at HTML audio start retains its original boundary until resume',async()=>{
 const f=await fixture(),voice={getStatus:()=>({ready:true}),synthesize:async()=>wav(new Float32Array(2400))},boundaries=[];
 let started=0,handle;
 handle=f.api.speakGenerated({text:'Report.',locale:'ar',onStart(){if(++started===1)handle.pause();},
  onBoundary:value=>boundaries.push(value.charIndex)},voice);
 try{
  await flushUntil(()=>started===1);
  assert.deepEqual(boundaries,[],'a start callback that pauses must not consume the pending sentence boundary');
  f.audioElements[0].advance(.01);
  assert.deepEqual(boundaries,[],'a queued timeupdate while paused must preserve the pending boundary');
  await handle.resume();await flushUntil(()=>started===2);
  assert.deepEqual(boundaries,[0],'resumed audio publishes the original boundary exactly once');
 }finally{handle.cancel();}
});
