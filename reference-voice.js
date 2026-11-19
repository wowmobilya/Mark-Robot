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
    return key==='ar'&&dialect==='eg'?'ar-EG':key;
  }

  function generationBody({text,locale,embedding,embeddingName}){
    const language=LANGUAGES[localeKey(locale)];
    if(!language)throw fail('locale-unsupported');
    if(typeof text!=='string'||!text.trim()||text.length>800)throw fail('text-length');
    if(typeof embedding!=='string'||!embedding)throw fail('voice-reference-missing');
    return {text,language,speaker_mode:'embedding',speaker_embedding_base64:embedding,
      speaker_embedding_name:embeddingName||'voice.npy',stream:false,format:'wav',
      laci:true,speaker_cfg_scale:1,controls_cfg_scale:1,seed:1,
      stream_codebooks:10,max_tokens:2000};
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

  const core={LANGUAGES,NAME,localeKey,embeddingKey,generationBody,createCacheFetch};
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
  let deviceAvailable=null,deviceCheck=null,worker=null,job=null,nextId=0,activeHandle=null,idleTimer=null,speechOwner=0;
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
    const key=localeKey(locale),value={...manager.getStatus('ref'),locale:key,name:NAME};
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

  function terminate(code='cancelled'){
    clearTimeout(idleTimer);idleTimer=null;
    if(worker){worker.terminate();worker=null;}
    if(job){const task=job;job=null;clearTimeout(task.timer);task.cleanup();const problem=fail(code);if(code==='cancelled')problem.name='AbortError';task.reject(problem);}
  }

  function synthesize(text,options={}){
    const locale=options.locale||options.lang||'ar';
    if(typeof text!=='string'||!text.trim()||text.length>800)return Promise.reject(fail('text-length'));
    if(!getStatus(locale).ready)return Promise.reject(fail(getStatus(locale).reason||'pack-not-installed'));
    if(options.signal?.aborted)return Promise.reject(base.aborted());
    if(job)return Promise.reject(fail('speech-busy'));
    clearTimeout(idleTimer);idleTimer=null;
    if(!worker){
      worker=new Worker(new URL('reference-voice-host.js?v=1',appBase),{type:'module'});
      const instance=worker;
      worker.onmessage=event=>{
        if(worker!==instance||!job||event.data?.id!==job.id)return;
        if(event.data.type==='progress'){emit('wf-reference-voice-loading',{locale:job.locale,loaded:event.data.loaded,total:event.data.total});return;}
        const task=job;job=null;clearTimeout(task.timer);task.cleanup();
        if(event.data.error){worker.terminate();worker=null;task.reject(fail(event.data.error));}
        else if(event.data.blob instanceof Blob){
          task.resolve(event.data.blob);
          idleTimer=setTimeout(()=>{if(!job&&worker===instance)terminate();},30000);
        }
        else task.reject(fail('invalid-audio'));
      };
      worker.onerror=()=>{if(worker===instance)terminate('engine-failed');};
    }
    return new Promise((resolve,reject)=>{
      const id=++nextId,abort=()=>{if(job?.id===id)terminate();};
      job={id,locale:localeKey(locale),resolve,reject,cleanup:()=>options.signal?.removeEventListener('abort',abort),
        timer:setTimeout(()=>{if(job?.id===id)terminate('speech-timeout');},90000)};
      options.signal?.addEventListener('abort',abort,{once:true});
      try{worker.postMessage({id,text,locale:localeKey(locale),dialect:options.dialect==='eg'?'eg':'sy'});}
      catch(_){terminate('engine-failed');}
    });
  }

  async function download(locale='ar',options={}){
    if(!LANGUAGES[localeKey(locale)])throw fail('locale-unsupported');
    if(!await checkDevice())throw fail('webgpu-unavailable');
    await manager.download('ref',{...options,onProgress:value=>options.onProgress?.({...value,locale:localeKey(locale),name:NAME})});
    return getStatus(locale);
  }

  function speak(options={}){
    const owner=++speechOwner;
    activeHandle=player.speakGenerated(options,{getStatus,synthesize:(text,context)=>synthesize(text,{...context,dialect:options.dialect}),
      dispose:()=>{if(owner===speechOwner)terminate();}});
    return activeHandle;
  }

  window.WFReferenceVoice=Object.freeze({getStatus,refresh,download,synthesize,speak,
    preparePlayback:player.preparePlayback,
    list:()=>Object.keys(LANGUAGES).map(locale=>({locale,id:voice.id,name:NAME,language:locale,bytes:voice.bytes,sharedBytes:0,quality:'reference',sourceURL:voice.sourceURL,licenseURL:voice.licenseURL})),
    cancelDownload:()=>manager.cancelDownload('ref'),
    remove:async(locale='ar')=>{activeHandle?.cancel();terminate();await manager.remove('ref');return refresh(locale);}});
  window.addEventListener('pagehide',()=>{activeHandle?.cancel();terminate();});
  refresh();
})();
