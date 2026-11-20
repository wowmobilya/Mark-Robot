/* Optional on-device speech conditioned on the selected recording. This is a
   local approximation, not an exported Artlist/ElevenLabs Mark voice. */
(() => {
  'use strict';
  const LANGUAGES=Object.freeze({ar:'ar',tr:'tr',en:'en_us',fr:'fr_fr',ru:'ru'});
  const NAME='Mark · local reference';
  const fail=code=>Object.assign(new Error(code),{code});
  const localeKey=value=>String(value||'').toLowerCase().split(/[-_]/)[0];
  const hex=bytes=>[...new Uint8Array(bytes)].map(value=>value.toString(16).padStart(2,'0')).join('');
  const absent=new Set(['edit/manifest.json','aligner/manifest.json','zac-full_mr/manifest.json']);

  function embeddingKey(locale,dialect){
    const key=localeKey(locale);
    if(!LANGUAGES[key])throw fail('locale-unsupported');
    // Existing Egyptian preferences must keep the approved Syrian recording.
    return key;
  }

  function generationBody({text,locale,embedding,embeddingName,stream=false}){
    const language=LANGUAGES[localeKey(locale)];
    if(!language)throw fail('locale-unsupported');
    if(typeof text!=='string'||!text.trim()||text.length>800)throw fail('text-length');
    if(typeof embedding!=='string'||!embedding)throw fail('voice-reference-missing');
    return {text,language,speaker_mode:'embedding',speaker_embedding_base64:embedding,
      speaker_embedding_name:embeddingName||'voice.npy',stream,format:stream?'pcm':'wav',
      laci:true,speaker_cfg_scale:1,controls_cfg_scale:1,seed:1,
      stream_codebooks:stream?1:10,max_tokens:2000,
      ...(stream?{stream_decode:'prefix',stream_codebooks_scope:'first'}:{})};
  }

  function createCacheFetch({caches,digest,cacheName,assets,appBase,virtualBase}){
    const urls=new Map(),modelPaths=new Map();
    for(const asset of assets){
      const url=new URL(asset.url,appBase).href;
      const item={...asset,url};urls.set(url,item);
      if(asset.modelPath)modelPaths.set(new URL(asset.modelPath,virtualBase).href,item);
    }
    // There is deliberately no network fallback here. This function is also
    // installed in the upstream worker, whose JSON/companion fetches otherwise
    // bypass its best-effort binary cache.
    return async function cachedFetch(input,init={}){
      const url=new URL(typeof input==='string'||input instanceof URL?String(input):input.url,appBase);
      const method=String(init.method||input?.method||'GET').toUpperCase();
      if(method!=='GET')throw fail('voice-asset-not-allowed');
      const item=modelPaths.get(url.href)||urls.get(url.href);
      if(!item){
        if(url.href.startsWith(virtualBase)&&absent.has(url.href.slice(virtualBase.length)))return new Response(null,{status:404});
        throw fail('voice-asset-not-allowed');
      }
      const cache=await caches.open(cacheName),response=await cache.match(item.url);
      if(!response?.ok)throw fail('pack-not-installed');
      if(response.headers.get('X-WF-SHA256')!==item.sha256||Number(response.headers.get('Content-Length'))!==item.bytes)throw fail('integrity-failed');
      const bytes=await response.arrayBuffer();
      if(bytes.byteLength!==item.bytes||hex(await digest(bytes))!==item.sha256)throw fail('integrity-failed');
      return new Response(bytes,{headers:{'Content-Type':item.type||'application/octet-stream','Content-Length':String(item.bytes)}});
    };
  }

  async function fastStartRuntime(source,digest=bytes=>crypto.subtle.digest('SHA-256',bytes)){
    // Adapt only this exact, already installed upstream build. Weight files and
    // all inference arithmetic stay unchanged. q8 is upstream's baseline path;
    // benchmarking/repacking and speculative reference/CFG warmups are optional.
    const pinned='fd9c2a0530b7d6898e68caa808933f523d8d318dc3f00b29b24962337773bacf';
    if(typeof source!=='string'||hex(await digest(new TextEncoder().encode(source)))!==pinned)throw fail('integrity-failed');
    const changes=[
      ['i??=await Ha(t,n);','i??={skinny:`q8`,large:`q8`};'],
      ['await Xo(v,y,p);',''],
      ['n.addEventListener(`uncapturederror`,e=>console.error(`WebGPU error:`,e.error.message))',
        'n.addEventListener(`uncapturederror`,t=>{console.error(`WebGPU error:`,t.error.message);e?.(`WebGPU operation failed: `+t.error.message)})']
    ];
    for(const [before,after] of changes){
      if(source.split(before).length!==2)throw fail('integrity-failed');
      source=source.replace(before,after);
    }
    return source;
  }

  const core={LANGUAGES,NAME,localeKey,embeddingKey,generationBody,createCacheFetch,fastStartRuntime};
  if(typeof module==='object'&&module.exports){module.exports=core;return;}
  globalThis.WFReferenceVoiceCore=Object.freeze(core);
  if(typeof document==='undefined')return;
  const base=window.WFOfflineVoiceCore,player=window.WFOfflineVoice,manifest=window.WFReferenceVoiceAssets;
  if(!base||!player||!manifest)return;
  const appBase=new URL('./',document.baseURI).href;
  const assets=manifest.assets.map(asset=>({...asset,url:new URL(asset.url,appBase).href}));
  const voice={locale:'ref',id:manifest.id,engine:'zonos3-reference',name:NAME,language:'العربية / Türkçe',
    quality:'reference',gender:'male',runtime:[],files:assets,bytes:assets.reduce((sum,asset)=>sum+asset.bytes,0),sharedBytes:0,
    sourceURL:manifest.sourceURL,licenseURL:new URL(manifest.licenseURL,appBase).href};
  const supported=!!(window.isSecureContext&&window.caches&&window.crypto?.subtle&&window.Worker&&navigator.gpu);
  const IDLE_MS=300000,REQUEST_TIMEOUT_MS=90000,MAX_STREAM_SAMPLES=44100*150;
  let deviceAvailable=null,deviceCheck=null,worker=null,workerReady=false,engineState='idle',engineError='',job=null,preparation=null,nextId=0,activeHandle=null,idleTimer=null,speechOwner=0,playbackOwner=null;
  const emit=(type,detail)=>window.dispatchEvent(new CustomEvent(type,{detail}));
  const publish=(type,value)=>{for(const locale of Object.keys(LANGUAGES))emit(type,{...value,locale,name:NAME});};
  const manager=base.createManager({caches:window.caches,fetch:window.fetch.bind(window),
    digest:bytes=>crypto.subtle.digest('SHA-256',bytes),origin:location.origin,supported,voices:[voice],shared:[],
    estimate:navigator.storage?.estimate?()=>navigator.storage.estimate():null,
    onChange:value=>publish('wf-reference-voice-change',value),onProgress:value=>publish('wf-reference-voice-progress',value)});

  async function checkDevice(){
    if(!supported){deviceAvailable=false;return false;}
    deviceCheck??=(async()=>{
      try{
        const adapter=await navigator.gpu.requestAdapter({powerPreference:'high-performance'});
        deviceAvailable=!!adapter&&adapter.limits.maxBufferSize>=manifest.minBufferBytes&&adapter.limits.maxStorageBufferBindingSize>=manifest.minBufferBytes;
      }catch(_){deviceAvailable=false;}
      return deviceAvailable;
    })();
    return deviceCheck;
  }

  function getStatus(locale='ar'){
    const key=localeKey(locale),value={...manager.getStatus('ref'),locale:key,name:NAME,engineReady:workerReady,engineState,engineError};
    if(!LANGUAGES[key])return {...value,state:'unsupported',ready:false,available:false,reason:'locale-unsupported'};
    if(!supported||deviceAvailable===false)return {...value,state:'unsupported',ready:false,available:false,reason:'webgpu-unavailable'};
    if(deviceAvailable===null)return {...value,state:'checking',ready:false,available:false,reason:''};
    return value;
  }

  async function refresh(locale){
    await checkDevice();await manager.refresh('ref');
    publish('wf-reference-voice-change',getStatus(locale||'ar'));
    return locale?getStatus(locale):Object.keys(LANGUAGES).map(getStatus);
  }

  function setEngineState(state,reason=''){
    if(engineState===state&&engineError===reason)return;
    engineState=state;engineError=reason;
    publish('wf-reference-voice-change',getStatus('ar'));
  }

  function terminate(code='cancelled'){
    clearTimeout(idleTimer);idleTimer=null;
    if(worker){worker.terminate();worker=null;}workerReady=false;
    const tasks=[job,preparation];job=preparation=null;
    setEngineState(code==='cancelled'?'idle':'error',code==='cancelled'?'':code);
    for(const task of tasks){if(!task)continue;clearTimeout(task.timer);task.cleanup();const problem=fail(code);if(code==='cancelled')problem.name='AbortError';task.reject(problem);}
  }

  function scheduleIdle(){
    clearTimeout(idleTimer);idleTimer=null;
    if(!worker||job||preparation||playbackOwner!==null)return;
    const instance=worker;
    idleTimer=setTimeout(()=>{if(worker===instance&&!job&&!preparation&&playbackOwner===null)terminate();},IDLE_MS);
  }

  function armTimeout(task){
    clearTimeout(task.timer);
    task.timer=null;
    // An intentionally paused or full audio queue is not stalled inference.
    // Abort remains active while playback owns this packet's credit.
    if(task.delivering)return;
    task.timer=setTimeout(()=>{if(job===task||preparation===task)terminate(workerReady?'speech-timeout':'engine-start-timeout');},REQUEST_TIMEOUT_MS);
  }

  function complete(task,value){
    if(job===task)job=null;else if(preparation===task)preparation=null;else return;
    clearTimeout(task.timer);task.cleanup();workerReady=true;if(!job)setEngineState('ready');
    task.resolve(task.type==='prepare'?getStatus(task.locale):value);scheduleIdle();
  }

  function ensureWorker(){
    if(worker)return worker;
    worker=new Worker(new URL('reference-voice-host.js?v=4',appBase),{type:'module'});
    const instance=worker;
    worker.onmessage=event=>{
      if(worker!==instance)return;
      const data=event.data||{};
      if(data.type==='fatal'){terminate(data.error||'engine-failed');return;}
      const task=data.id===job?.id?job:data.id===preparation?.id?preparation:null;
      if(!task)return;
      if(data.error){terminate(data.error);return;}
      if(data.type==='progress'){
        armTimeout(task);if(data.phase==='ready')workerReady=true;
        if(['loading','initializing','ready','generating','streaming'].includes(data.phase))setEngineState(data.phase);
        const progress={locale:task.locale,loaded:data.loaded,total:data.total,...(data.phase?{phase:data.phase}:{})};
        emit('wf-reference-voice-loading',progress);try{task.onProgress?.(progress);}catch(_){}return;
      }
      if(data.type==='ready'&&task.type==='prepare'){complete(task);return;}
      if(data.type==='audio'&&task.type==='stream'){
        if(task.delivering||data.sequence!==task.sequence||data.sampleRate!==44100||!(data.samples instanceof ArrayBuffer)||!data.samples.byteLength||data.samples.byteLength%4){terminate('invalid-audio');return;}
        const samples=new Float32Array(data.samples);
        if(task.samples+samples.length>MAX_STREAM_SAMPLES||!samples.every(Number.isFinite)){terminate('invalid-audio');return;}
        workerReady=true;setEngineState('streaming');task.samples+=samples.length;task.sequence++;task.delivering=true;armTimeout(task);
        let accepted;
        try{accepted=task.onAudio({samples,sampleRate:data.sampleRate});}
        catch(_){terminate('playback-failed');return;}
        Promise.resolve(accepted).then(()=>{
          if(worker!==instance||job!==task)return;
          task.delivering=false;armTimeout(task);
          try{instance.postMessage({id:task.id,type:'audio-ack',sequence:data.sequence});}
          catch(_){terminate('engine-failed');return;}
          if(task.ended)complete(task);
        },()=>{if(worker===instance&&job===task)terminate('playback-failed');});
        return;
      }
      if(data.type==='end'&&task.type==='stream'){
        if(!task.samples){terminate('invalid-audio');return;}
        if(task.delivering)task.ended=true;else complete(task);return;
      }
      if(task.type==='synthesize'&&data.blob instanceof Blob&&data.blob.type==='audio/wav'&&data.blob.size>=46){complete(task,data.blob);return;}
      terminate('invalid-audio');
    };
    worker.onerror=()=>{if(worker===instance)terminate('worker-startup-failed');};
    return worker;
  }

  function request(type,text,options={}){
    const locale=options.locale||options.lang||'ar';
    if(type!=='prepare'&&(typeof text!=='string'||!text.trim()||text.length>800))return Promise.reject(fail('text-length'));
    if(!getStatus(locale).ready)return Promise.reject(fail(getStatus(locale).reason||'pack-not-installed'));
    if(options.signal?.aborted)return Promise.reject(base.aborted());
    if(type==='stream'&&typeof options.onAudio!=='function')return Promise.reject(fail('invalid-audio'));
    if(type!=='prepare'&&job)return Promise.reject(fail('speech-busy'));
    if(type==='prepare'){
      if(workerReady)return Promise.resolve(getStatus(locale));
      if(preparation)return preparation.promise;
    }
    clearTimeout(idleTimer);idleTimer=null;
    let instance;try{instance=ensureWorker();}catch(_){setEngineState('error','worker-startup-failed');return Promise.reject(fail('worker-startup-failed'));}
    const id=++nextId,task={id,type,locale:localeKey(locale),onAudio:options.onAudio,onProgress:options.onProgress,samples:0,sequence:0,delivering:false,ended:false};
    task.promise=new Promise((resolve,reject)=>{task.resolve=resolve;task.reject=reject;});
    const abort=()=>{if(job===task||preparation===task)terminate();};
    task.cleanup=()=>options.signal?.removeEventListener('abort',abort);
    if(type==='prepare')preparation=task;else job=task;
    if(!workerReady)setEngineState('initializing');
    armTimeout(task);
    try{
      options.signal?.addEventListener('abort',abort,{once:true});
      instance.postMessage({id,type,text,locale:task.locale,dialect:'sy'});
    }catch(_){terminate('engine-failed');}
    return task.promise;
  }

  const synthesize=(text,options={})=>request('synthesize',text,options);
  const stream=(text,options={})=>request('stream',text,options);
  const prepare=(locale='ar')=>request('prepare',null,{locale});
  const release=()=>{if(job||playbackOwner!==null)return false;terminate();return true;};

  async function download(locale='ar',options={}){
    if(!LANGUAGES[localeKey(locale)])throw fail('locale-unsupported');
    if(!await checkDevice())throw fail('webgpu-unavailable');
    await manager.download('ref',{...options,onProgress:value=>options.onProgress?.({...value,locale:localeKey(locale),name:NAME})});
    return getStatus(locale);
  }

  function speak(options={}){
    const owner=++speechOwner;playbackOwner=owner;clearTimeout(idleTimer);idleTimer=null;
    const dispose=()=>{if(playbackOwner===owner){playbackOwner=null;activeHandle=null;scheduleIdle();}};
    try{activeHandle=player.speakGenerated({...options,streaming:true,continuous:false},{getStatus,
      stream:(text,context)=>stream(text,{...context,dialect:options.dialect}),
      synthesize:(text,context)=>synthesize(text,{...context,dialect:options.dialect}),dispose});}
    catch(problem){dispose();throw problem;}
    return activeHandle;
  }

  window.WFReferenceVoice=Object.freeze({getStatus,refresh,download,synthesize,stream,prepare,release,speak,
    preparePlayback:()=>player.preparePlayback({streaming:true}),
    list:()=>Object.keys(LANGUAGES).map(locale=>({locale,id:voice.id,name:NAME,language:locale,bytes:voice.bytes,sharedBytes:0,quality:'reference',sourceURL:voice.sourceURL,licenseURL:voice.licenseURL})),
    cancelDownload:()=>manager.cancelDownload('ref'),
    remove:async(locale='ar')=>{activeHandle?.cancel();terminate();await manager.remove('ref');return refresh(locale);}});
  window.addEventListener('pagehide',()=>{activeHandle?.cancel();terminate();});
  refresh();
})();
