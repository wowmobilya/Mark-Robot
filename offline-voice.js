/* Optional local speech. Only download() uses the network; synthesis reads
   verified CacheStorage files in a worker. Business data is never sent or stored. */
(() => {
  'use strict';
  const CACHE='infinity-offline-voice-v1',VERSION=1;
  const MODEL_BASE='https://huggingface.co/diffusionstudio/piper-voices/resolve/840e38a7e26d813bd6221b78cfbaefa3585b3f71/';
  const runtime=[
    {id:'ort-js',url:'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.18.0/dist/ort.wasm.min.js',bytes:142930,sha256:'90533a3fd7006df7f897c0d63c468996da5c8e430e39964d92ebe586c4996614',type:'text/javascript'},
    {id:'ort-wasm',url:'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.18.0/dist/ort-wasm-simd.wasm',bytes:10595041,sha256:'f533b5f21790563d7556c611c3835ac65848ee326da2689aac54ed7d9cc8c6a4',type:'application/wasm'},
    {id:'piper-js',url:'https://cdn.jsdelivr.net/npm/@mintplex-labs/piper-tts-web@1.0.5/dist/piper-o91UDS6e.js',bytes:158217,sha256:'b5ac96981729547606fd026b8e3829aad81e9e3c22308869d50473259c563283',type:'text/javascript'},
    {id:'piper-wasm',url:'https://cdn.jsdelivr.net/npm/@diffusionstudio/piper-wasm@1.0.0/build/piper_phonemize.wasm',bytes:635212,sha256:'b777cd107a91d2bcc6a1ea46f2c26a662a7407394fe84589198aeaa83dd7a9d6',type:'application/wasm'},
    {id:'piper-data',url:'https://cdn.jsdelivr.net/npm/@diffusionstudio/piper-wasm@1.0.0/build/piper_phonemize.data',bytes:18077249,sha256:'29f1025eb23a5b5c192cd14a6efbce4509402ff265405072ee6f7d1a09b78f8c',type:'application/octet-stream'}
  ];
  const arabicReportVoice={"locale":"ar","engine":"nabra","id":"ar-nabra-7m-af-msa-fp16","name":"Nabra","language":"العربية","quality":"fp16","gender":"female","runtime":[{"id":"nabra-ort-js","url":"https://cdn.jsdelivr.net/npm/onnxruntime-web@1.31.1/dist/ort.wasm.bundle.min.mjs","bytes":77024,"sha256":"51bd7168175767324ab0acfcfc4ca94a096a3826e3ebac9ccc4f195eb865f8dd","type":"text/javascript"},{"id":"nabra-ort-wasm","url":"https://cdn.jsdelivr.net/npm/onnxruntime-web@1.31.1/dist/ort-wasm-simd-threaded.wasm","bytes":14848852,"sha256":"4b884c203b0fa48d057be3332c65513ff85aa3c5bddd6946acc0fab7ecda001d","type":"application/wasm"},{"id":"nabra-g2p","url":"./vendor/nabra/phonemizer.mjs?v=1","bytes":2109197,"sha256":"33c3675f0e340d5498656044509fd24045d7165797d1a4ac49934492ed09ebb1","type":"text/javascript"}],"files":[{"id":"model","url":"https://huggingface.co/oddadmix/Nabra-7M-Distill-ONNX/resolve/bbac0f1e6b001bfae89871be366a4b000180deb2/onnx/model_fp16.onnx","bytes":15969086,"sha256":"cafb38ee0d39629c1e228fd7f120bb8dbec896342880f3ac8318cfc10e3f19ff","type":"application/octet-stream"},{"id":"voice","url":"https://huggingface.co/oddadmix/Nabra-7M-Distill-ONNX/resolve/bbac0f1e6b001bfae89871be366a4b000180deb2/voices/af_msa.bin","bytes":522240,"sha256":"129d447a7c9bdce1d5b6cb5ecb789bbfd9f427b7775131a97dfa5638583b3b92","type":"application/octet-stream"}],"bytes":16491326,"sharedBytes":17035073,"sourceURL":"https://huggingface.co/oddadmix/Nabra-7M-Distill-ONNX/tree/bbac0f1e6b001bfae89871be366a4b000180deb2","licenseURL":"https://huggingface.co/oddadmix/Nabra-7M-Distill-ONNX/resolve/bbac0f1e6b001bfae89871be366a4b000180deb2/README.md","workerType":"module"};
  const definitions=[
    ['tr','tr_TR-fettah-medium','Fettah','Türkçe','tr/tr_TR/fettah/medium/',63201294,'5d14d5222f36aea2b8fc8dba097fcb18dcf8f5b33e5b2aa76b5e0b44602aa8d7',4877,'0738ecd770d4102fa967a784ae89f64d846b1b5f104076e410c978fefa70b3e7'],
    ['en','en_US-ljspeech-medium','LJ Speech','English','en/en_US/ljspeech/medium/',63531379,'6f52a751e2349abe7a76735eb09dc1875298c77ea2342ffd2fef79ff81b87f22',4972,'141d612cc0a95ed7efc1ca936b845c2364967f2e9217c5dbfcf69fc4d6c65860'],
    ['fr','fr_FR-siwis-medium','Siwis','Français','fr/fr_FR/siwis/medium/',63201294,'641d1ab097da2b81128c076810edb052b385decc8be3381814802a64a73baf99',4875,'39479916c2db192b5ac9764daddd0c744d83e023ad890c6976c0633ae4df8959'],
    ['ru','ru_RU-dmitri-medium','Dmitri','Русский','ru/ru_RU/dmitri/medium/',63201294,'f073356ebc4bd0f80c5af58df2953a5988bd5bdab1eb38635ce960b071fbefcb',4824,'667ef3117bc642c2892dff7690d8bdc8ca4228aeaa783b2dc1416df632855e0d']
  ];
  const sharedBytes=runtime.reduce((sum,item)=>sum+item.bytes,0);
  const retiredArabic={id:'ar_JO-kareem-medium',files:[
    MODEL_BASE+'ar/ar_JO/kareem/medium/ar_JO-kareem-medium.onnx',
    MODEL_BASE+'ar/ar_JO/kareem/medium/ar_JO-kareem-medium.onnx.json'
  ]};
  const catalog=[arabicReportVoice,...definitions.map(([locale,id,name,language,path,bytes,sha256,configBytes,configHash])=>({locale,id,name,language,quality:'medium',bytes:bytes+configBytes,sharedBytes,
    sourceURL:'https://huggingface.co/diffusionstudio/piper-voices/tree/840e38a7e26d813bd6221b78cfbaefa3585b3f71/'+path,
    licenseURL:MODEL_BASE+path+'MODEL_CARD',files:[
      {id:'model',url:MODEL_BASE+path+id+'.onnx',bytes,sha256,type:'application/octet-stream'},
      {id:'config',url:MODEL_BASE+path+id+'.onnx.json',bytes:configBytes,sha256:configHash,type:'application/json'}
    ]}))];
  const localeKey=value=>String(value||'').toLowerCase().split(/[-_]/)[0];
  const error=code=>Object.assign(new Error(code),{code});
  const aborted=()=>Object.assign(new Error('cancelled'),{name:'AbortError',code:'cancelled'});
  const checkAbort=signal=>{if(signal?.aborted)throw aborted();};
  const hex=buffer=>[...new Uint8Array(buffer)].map(value=>value.toString(16).padStart(2,'0')).join('');
  function splitText(text,max=280){
    const result=[];let cursor=0;
    for(const section of text.split(/(?<=[.!?؟])\s+|\n+/u)){
      const start=text.indexOf(section,cursor);cursor=start+section.length;
      let offset=0;
      while(offset<section.length){
        while(/\s/u.test(section[offset]||'')&&offset<section.length)offset++;
        if(offset>=section.length)break;
        let end=Math.min(section.length,offset+max);
        if(end<section.length){const space=section.lastIndexOf(' ',end);if(space>offset+max/3)end=space;else if(/[\uD800-\uDBFF]/.test(section[end-1]))end--;}
        const part=section.slice(offset,end).trimEnd();if(part)result.push({text:part,charIndex:start+offset,charLength:part.length});
        offset=end;
      }
    }
    return result;
  }
  function pcmToWav(samples,sampleRate){
    const buffer=new ArrayBuffer(44+samples.length*2),view=new DataView(buffer);
    const word=(offset,value)=>{for(let i=0;i<value.length;i++)view.setUint8(offset+i,value.charCodeAt(i));};
    word(0,'RIFF');view.setUint32(4,buffer.byteLength-8,true);word(8,'WAVE');word(12,'fmt ');view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,1,true);view.setUint32(24,sampleRate,true);view.setUint32(28,sampleRate*2,true);view.setUint16(32,2,true);view.setUint16(34,16,true);word(36,'data');view.setUint32(40,samples.length*2,true);
    for(let i=0;i<samples.length;i++){const sample=Math.max(-1,Math.min(1,Number.isFinite(samples[i])?samples[i]:0));view.setInt16(44+i*2,Math.round(sample*(sample<0?32768:32767)),true);}
    return buffer;
  }
  const MAX_RENDERED_AUDIO_BYTES=32*1024*1024,MAX_RENDERED_AUDIO_SECONDS=20*60;
  function createWavSequence(){
    // Both local workers return canonical mono PCM16 WAV. Keep their PCM bytes
    // verbatim: one source avoids waiting for synthesis between spoken clauses.
    // Blob slices do not expand samples to float arrays while buffering a report.
    const parts=[],boundaries=[];let firstHeader=null,sampleRate=0,totalBytes=0;
    return {
      async append(blob,chunk){
        if(!blob||!Number.isSafeInteger(blob.size)||blob.size<46||typeof blob.slice!=='function')throw error('invalid-audio');
        const dataBytes=blob.size-44;
        if(totalBytes+dataBytes>MAX_RENDERED_AUDIO_BYTES)throw error('speech-too-long');
        const header=new Uint8Array(await blob.slice(0,44).arrayBuffer());
        if(header.byteLength!==44)throw error('invalid-audio');
        const view=new DataView(header.buffer,header.byteOffset,header.byteLength),rate=view.getUint32(24,true);
        const label=(offset,value)=>[...value].every((letter,index)=>header[offset+index]===letter.charCodeAt(0));
        if(!label(0,'RIFF')||!label(8,'WAVE')||!label(12,'fmt ')||!label(36,'data')||
          view.getUint32(4,true)!==blob.size-8||view.getUint32(16,true)!==16||view.getUint16(20,true)!==1||
          view.getUint16(22,true)!==1||view.getUint16(32,true)!==2||view.getUint16(34,true)!==16||
          view.getUint32(40,true)!==dataBytes||dataBytes%2||rate<8000||rate>96000||
          view.getUint32(28,true)!==rate*2||(sampleRate&&sampleRate!==rate))throw error('invalid-audio');
        if((totalBytes+dataBytes)/(rate*2)>MAX_RENDERED_AUDIO_SECONDS)throw error('speech-too-long');
        if(!firstHeader){firstHeader=header;sampleRate=rate;}
        boundaries.push({start:totalBytes/(sampleRate*2),charIndex:chunk.charIndex,charLength:chunk.charLength});
        parts.push(blob.slice(44));totalBytes+=dataBytes;
      },
      finish(){
        if(!firstHeader||!totalBytes)throw error('invalid-audio');
        const header=firstHeader.slice(),view=new DataView(header.buffer);view.setUint32(4,totalBytes+36,true);view.setUint32(40,totalBytes,true);
        return {blob:new Blob([header,...parts],{type:'audio/wav'}),boundaries:boundaries.map(item=>({...item})),duration:totalBytes/(sampleRate*2)};
      }
    };
  }
  function speechChunks(text,chunks){
    if(chunks===undefined){const result=splitText(text);if(result.length>160)throw error('speech-too-long');return result;}
    if(!Array.isArray(chunks)||!chunks.length||chunks.length>160)throw error('invalid-speech-chunks');
    let end=0,previous=null;
    return chunks.map(chunk=>{
      if(!chunk||typeof chunk.text!=='string'||!chunk.text.trim()||chunk.text.length>800||
        !Number.isInteger(chunk.charIndex)||!Number.isInteger(chunk.charLength)||
        (chunk.charIndex<end&&!(previous&&chunk.charIndex===previous.charIndex&&chunk.charLength===previous.charLength))||
        chunk.charLength<1||chunk.charIndex+chunk.charLength>text.length)throw error('invalid-speech-chunks');
      end=chunk.charIndex+chunk.charLength;previous=chunk;
      return {text:chunk.text,charIndex:chunk.charIndex,charLength:chunk.charLength};
    });
  }
  async function validAsset(cache,asset){
    const response=await cache.match(asset.url);
    return !!response&&response.ok&&response.headers.get('X-WF-SHA256')===asset.sha256&&Number(response.headers.get('Content-Length'))===asset.bytes;
  }
  function createManager({caches,fetch,digest,origin,supported=true,onChange=()=>{},onProgress=()=>{},voices=catalog,shared=runtime,estimate}){
    const map=new Map(voices.map(voice=>[voice.locale,voice])),states=new Map();let active=null;
    const find=locale=>map.get(localeKey(locale));
    const runtimeFor=voice=>voice.runtime||shared;
    const marker=voice=>new URL('/__infinity_voice__/'+voice.id+'.json',origin).href;
    const diagnosticToken=(value,fallback='')=>typeof value==='string'&&/^[A-Za-z][A-Za-z0-9_-]{0,63}$/.test(value)?value:fallback;
    const clearDiagnostics={stage:'',file:'',errorName:''};
    const initial=voice=>({locale:voice.locale,id:voice.id,state:supported?'checking':'unsupported',installed:false,ready:false,available:false,loaded:0,total:voice.bytes+voice.sharedBytes,progress:0,reason:supported?'':'browser-unsupported',...clearDiagnostics});
    for(const voice of voices)states.set(voice.locale,initial(voice));
    const getStatus=locale=>({...states.get(localeKey(locale))||{locale:localeKey(locale),id:'',state:'unsupported',installed:false,ready:false,available:false,loaded:0,total:0,progress:0,reason:'locale-unsupported',...clearDiagnostics}});
    function set(voice,patch){const value={...getStatus(voice.locale),...patch};states.set(voice.locale,value);onChange({...value});return {...value};}
    async function refresh(locale){
      if(!supported)return locale?getStatus(locale):voices.map(voice=>getStatus(voice.locale));
      const selected=locale?[find(locale)].filter(Boolean):voices;
      try{
        const cache=await caches.open(CACHE);
        for(const voice of selected){
          if(active?.locale===voice.locale)continue;
          const runtimeReady=(await Promise.all(runtimeFor(voice).map(asset=>validAsset(cache,asset)))).every(Boolean);
          let marked=false;try{const record=await cache.match(marker(voice));const data=record?await record.json():null;marked=data?.version===VERSION&&data?.model===voice.files[0].sha256;}catch(_){}
          const ready=marked&&runtimeReady&&(await Promise.all(voice.files.map(asset=>validAsset(cache,asset)))).every(Boolean);
          set(voice,{state:ready?'ready':'not-installed',installed:ready,ready,available:ready,reason:'',loaded:ready?voice.bytes+voice.sharedBytes:0,total:voice.bytes+voice.sharedBytes,progress:ready?1:0,...clearDiagnostics});
        }
      }catch(_){for(const voice of selected)set(voice,{state:'unsupported',ready:false,installed:false,available:false,reason:'storage-unavailable',...clearDiagnostics});}
      return locale?getStatus(locale):voices.map(voice=>getStatus(voice.locale));
    }
    async function download(locale,options={}){
      const voice=find(locale);if(!voice)throw error('locale-unsupported');if(!supported)throw error('browser-unsupported');if(active)throw error('download-busy');checkAbort(options.signal);
      const controller=new AbortController(),relay=()=>controller.abort();options.signal?.addEventListener('abort',relay,{once:true});active={locale:voice.locale,controller};
      let diagnostic={stage:'open-cache',file:''};
      const at=(stage,asset)=>{
        diagnostic={stage,file:diagnosticToken(asset?.id)};
        set(voice,{...diagnostic,errorName:'',phase:['verify','store','final-check','marker'].includes(stage)?'verify':'download'});
      };
      set(voice,{state:'downloading',ready:false,installed:false,available:false,reason:'',loaded:0,progress:0,phase:'download',...diagnostic,errorName:''});
      try{
        const cache=await caches.open(CACHE),assets=[...runtimeFor(voice),...voice.files],missing=[];
        if(voice.locale==='ar'&&voice.engine==='nabra'){
          // Only an explicit Arabic pack installation retires the replaced voice.
          // Preserve other languages, their partial downloads, and all business data.
          await Promise.all(retiredArabic.files.map(url=>cache.delete(url)));
          await cache.delete(marker(retiredArabic));
          let piperNeeded=false;
          for(const other of voices.filter(item=>item.locale!=='ar'&&item.engine!=='nabra')){
            if(await cache.match(marker(other))){piperNeeded=true;break;}
            if((await Promise.all(other.files.map(asset=>cache.match(asset.url)))).some(Boolean)){piperNeeded=true;break;}
          }
          if(!piperNeeded)await Promise.all(shared.map(asset=>cache.delete(asset.url)));
        }
        for(const asset of assets){at('check-cache',asset);if(!await validAsset(cache,asset))missing.push(asset);}
        const total=missing.reduce((sum,asset)=>sum+asset.bytes,0);let completed=0;
        at('check-storage');
        if(estimate){let storage;try{storage=await estimate();}catch(_){}if(Number.isFinite(storage?.quota)&&Number.isFinite(storage?.usage)&&storage.quota-storage.usage<total*1.15)throw error('storage-full');}
        const report=(loaded,phase='download')=>{const value=set(voice,{loaded,total,progress:total?Math.min(1,loaded/total):1,phase});onProgress(value);options.onProgress?.(value);};
        report(0);
        for(const asset of missing){
          at('fetch',asset);
          checkAbort(controller.signal);
          const response=await fetch(asset.url,{signal:controller.signal,credentials:'omit',cache:'no-store',referrerPolicy:'no-referrer'});
          if(!response.ok||response.type==='opaque')throw error('download-failed');
          at('stream',asset);
          const chunks=[];let loaded=0;
          if(response.body?.getReader){
            const reader=response.body.getReader();
            try{while(true){checkAbort(controller.signal);const result=await reader.read();if(result.done)break;loaded+=result.value.byteLength;if(loaded>asset.bytes)throw error('integrity-failed');chunks.push(result.value);report(completed+loaded);}}
            catch(problem){try{await reader.cancel();}catch(_){}throw problem;}
          }else{const bytes=new Uint8Array(await response.arrayBuffer());loaded=bytes.byteLength;chunks.push(bytes);report(completed+loaded);}
          checkAbort(controller.signal);if(loaded!==asset.bytes)throw error('integrity-failed');at('verify',asset);report(completed+loaded,'verify');
          const blob=new Blob(chunks,{type:asset.type});const bytes=await blob.arrayBuffer();
          if(hex(await digest(bytes))!==asset.sha256)throw error('integrity-failed');checkAbort(controller.signal);
          at('store',asset);
          await cache.put(asset.url,new Response(blob,{headers:{'Content-Type':asset.type,'Content-Length':String(asset.bytes),'X-WF-SHA256':asset.sha256}}));
          completed+=loaded;
        }
        checkAbort(controller.signal);
        for(const asset of assets){at('final-check',asset);if(!await validAsset(cache,asset))throw error('integrity-failed');}
        at('marker');
        await cache.put(marker(voice),new Response(JSON.stringify({version:VERSION,model:voice.files[0].sha256}),{headers:{'Content-Type':'application/json'}}));
        set(voice,{state:'ready',installed:true,ready:true,available:true,loaded:total,total,progress:1,phase:'ready',reason:'',stage:'ready',file:'',errorName:''});return getStatus(locale);
      }catch(problem){
        const errorName=diagnosticToken(problem?.name,'Error');
        const reason=errorName==='AbortError'?'cancelled':errorName==='QuotaExceededError'?'storage-full':['cancelled','storage-full','integrity-failed','download-failed','storage-unavailable'].includes(problem?.code)?problem.code:'download-failed';
        set(voice,{state:reason==='cancelled'?'not-installed':'error',installed:false,ready:false,available:false,reason,...diagnostic,errorName});
        // DOMException.code is read-only. Wrap rather than mutate the browser's
        // exception; status exposes only bounded identifiers, never its message.
        const failure=error(reason);Object.defineProperty(failure,'cause',{value:problem,configurable:true});if(reason==='cancelled')failure.name='AbortError';throw failure;
      }finally{options.signal?.removeEventListener('abort',relay);active=null;}
    }
    async function remove(locale){
      const voice=find(locale);if(!voice)throw error('locale-unsupported');if(active)throw error('download-busy');
      const cache=await caches.open(CACHE);await cache.delete(marker(voice));await Promise.all(voice.files.map(asset=>cache.delete(asset.url)));
      // Runtime files are shared by other packs and remain useful after removal.
      return set(voice,{state:'not-installed',installed:false,ready:false,available:false,loaded:0,total:voice.bytes+voice.sharedBytes,progress:0,reason:'',...clearDiagnostics});
    }
    return {list:()=>voices.map(({files,runtime:voiceRuntime,...voice})=>({...voice})),getStatus,refresh,download,remove,cancelDownload:locale=>{if(active?.locale===localeKey(locale))active.controller.abort();}};
  }
  const core={CACHE,VERSION,runtime,catalog,retiredArabic,localeKey,error,aborted,checkAbort,hex,splitText,speechChunks,pcmToWav,createWavSequence,MAX_RENDERED_AUDIO_BYTES,validAsset,createManager};
  if(typeof module!=='undefined'&&module.exports){module.exports=core;return;}
  if(typeof document==='undefined'){self.WFOfflineVoiceCore=core;return;}
  function supported(){
    try{return !!(window.isSecureContext&&window.caches&&window.crypto?.subtle&&window.Worker&&window.WebAssembly&&WebAssembly.validate(new Uint8Array([0,97,115,109,1,0,0,0,1,5,1,96,0,1,123,3,2,1,0,10,10,1,8,0,65,0,253,15,253,98,11])));}catch(_){return false;}
  }
  const emit=(type,detail)=>window.dispatchEvent(new CustomEvent(type,{detail}));
  const manager=createManager({caches:window.caches,fetch:window.fetch.bind(window),digest:bytes=>crypto.subtle.digest('SHA-256',bytes),origin:location.origin,supported:supported(),
    estimate:navigator.storage?.estimate?()=>navigator.storage.estimate():null,onChange:value=>emit('wf-offline-voice-change',value),onProgress:value=>emit('wf-offline-voice-progress',value)});
  let worker=null,workerEngine='',requestId=0,job=null,activeSpeech=null;
  function terminate(){if(worker){worker.terminate();worker=null;}workerEngine='';if(job){const task=job;job=null;clearTimeout(task.timeout);task.cleanup();task.reject(aborted());}}
  function workerRequest(locale,text,signal){
    if(job)return Promise.reject(error('speech-busy'));checkAbort(signal);
    const engine=catalog.find(voice=>voice.locale===localeKey(locale))?.engine||'piper';
    if(worker&&workerEngine!==engine)terminate();
    if(!worker){
      worker=engine==='nabra'?new Worker(new URL('nabra-report-worker.js?v=2',document.baseURI),{type:'module'}):new Worker(new URL('offline-voice-worker.js?v=4',document.baseURI));
      workerEngine=engine;
      const instance=worker;
      worker.onmessage=event=>{if(worker!==instance||!job||event.data?.id!==job.id)return;const task=job;job=null;clearTimeout(task.timeout);task.cleanup();if(event.data.error){worker?.terminate();worker=null;task.reject(error(event.data.error));}else task.resolve(event.data.blob);};
      worker.onerror=()=>{if(worker!==instance)return;if(job){const task=job;job=null;clearTimeout(task.timeout);task.cleanup();task.reject(error('engine-failed'));}worker?.terminate();worker=null;};
    }
    return new Promise((resolve,reject)=>{
      const id=++requestId,abort=()=>{if(job?.id===id)terminate();};
      job={id,resolve,reject,cleanup:()=>signal?.removeEventListener('abort',abort),timeout:setTimeout(()=>{if(job?.id===id){const task=job;job=null;task.cleanup();worker?.terminate();worker=null;task.reject(error('speech-timeout'));}},90000)};
      signal?.addEventListener('abort',abort,{once:true});worker.postMessage({id,locale:localeKey(locale),text});
    });
  }
  async function synthesize(text,options={}){
    const locale=options.locale||options.lang||'ar';if(typeof text!=='string'||!text.trim()||text.length>800)throw error('text-length');
    if(!manager.getStatus(locale).ready)throw error('pack-not-installed');checkAbort(options.signal);
    return workerRequest(locale,text,options.signal);
  }
  const playbackLeases=new WeakSet();
  function preparePlayback(){
    // Call synchronously from the user's tap, before IndexedDB or a first download.
    // The same unlocked element plays the later report on mobile browsers.
    const audio=new Audio(),lease={audio,unlock:null,disposed:false,dispose(){
      if(lease.disposed)return;lease.disposed=true;audio.pause();audio.removeAttribute('src');audio.load();
    }};
    playbackLeases.add(lease);
    const silence=URL.createObjectURL(new Blob([pcmToWav(new Float32Array(441),22050)],{type:'audio/wav'}));
    audio.src=silence;
    try{lease.unlock=Promise.resolve(audio.play()).then(()=>audio.pause()).catch(()=>{}).finally(()=>URL.revokeObjectURL(silence));}
    catch(_){URL.revokeObjectURL(silence);lease.unlock=Promise.resolve();}
    return lease;
  }
  function speak(options={}){
    activeSpeech?.cancel();
    const lease=playbackLeases.has(options.playback)&&!options.playback.disposed?options.playback:preparePlayback();
    playbackLeases.delete(lease);
    const controller=new AbortController(),audio=lease.audio;let stopped=false,url='',finished=false;
    const text=typeof options.text==='string'?options.text:'',locale=options.locale||'ar';
    const clearAudioEvents=()=>{audio.onplaying=audio.onwaiting=audio.onended=audio.onerror=audio.ontimeupdate=null;};
    const cleanup=()=>{clearAudioEvents();lease.dispose();if(url){URL.revokeObjectURL(url);url='';}if(activeSpeech===handle)activeSpeech=null;};
    const handle={cancel(){if(stopped||finished)return;stopped=true;controller.abort();cleanup();}};activeSpeech=handle;
    async function playClip(blob,boundaries){
      checkAbort(controller.signal);
      url=URL.createObjectURL(blob);audio.src=url;audio.volume=Number.isFinite(options.volume)?Math.max(0,Math.min(1,options.volume)):1;
      audio.preservesPitch=true;audio.playbackRate=Number.isFinite(options.rate)?Math.max(.75,Math.min(1.3,options.rate)):1;
      await new Promise((resolve,reject)=>{
        let boundaryIndex=0,settled=false;
        const publishBoundaries=time=>{while(!stopped&&boundaryIndex<boundaries.length&&boundaries[boundaryIndex].start<=time){
          const boundary=boundaries[boundaryIndex++];options.onBoundary?.({charIndex:boundary.charIndex,charLength:boundary.charLength,name:'sentence',type:'sentence'});
        }};
        const finish=problem=>{if(settled)return;settled=true;controller.signal.removeEventListener('abort',abort);clearAudioEvents();problem?reject(problem):resolve();};
        const abort=()=>{audio.pause();finish(aborted());};
        audio.onplaying=()=>{if(stopped)return;options.onStart?.();publishBoundaries(Number.isFinite(audio.currentTime)?audio.currentTime:0);};
        // currentTime is already in media seconds, independently of playbackRate.
        audio.ontimeupdate=()=>publishBoundaries(audio.currentTime);
        audio.onwaiting=()=>options.onWaiting?.();audio.onended=()=>{publishBoundaries(Infinity);finish();};audio.onerror=()=>finish(error('playback-failed'));
        controller.signal.addEventListener('abort',abort,{once:true});
        try{Promise.resolve(audio.play()).catch(problem=>finish(error(problem?.name==='NotAllowedError'?'playback-blocked':'playback-failed')));}catch(_){finish(error('playback-failed'));}
      });
      URL.revokeObjectURL(url);url='';checkAbort(controller.signal);
    }
    (async()=>{
      try{
        if(!text.trim()||text.length>16000)throw error('text-length');if(!manager.getStatus(locale).ready)throw error('pack-not-installed');
        const chunks=speechChunks(text,options.chunks);
        await lease.unlock;checkAbort(controller.signal);
        if(options.continuous===true){
          const sequence=createWavSequence();options.onWaiting?.();
          for(let index=0;index<chunks.length;index++){
            const blob=await synthesize(chunks[index].text,{locale,signal:controller.signal});checkAbort(controller.signal);
            await sequence.append(blob,chunks[index]);checkAbort(controller.signal);
            options.onProgress?.({completed:index+1,total:chunks.length,phase:'preparing'});
          }
          const rendered=sequence.finish();await playClip(rendered.blob,rendered.boundaries);
        }else{
          // The compatibility path prepares one sentence ahead while it plays.
          // Settling errors here avoids an unhandled rejection during playback.
          const generate=chunk=>{const pending={ready:false,promise:null};pending.promise=synthesize(chunk.text,{locale,signal:controller.signal}).then(blob=>({blob}),problem=>({problem})).then(result=>{pending.ready=true;return result;});return pending;};
          let next=generate(chunks[0]);
          for(let index=0;index<chunks.length;index++){
            const chunk=chunks[index];
            if(!next.ready)options.onWaiting?.();
            const result=await next.promise;checkAbort(controller.signal);if(result.problem)throw result.problem;
            next=index+1<chunks.length?generate(chunks[index+1]):null;
            await playClip(result.blob,[{...chunk,start:0}]);
          }
        }
        finished=true;cleanup();options.onEnd?.();
      }catch(problem){finished=true;controller.abort();cleanup();if(!stopped&&problem?.name!=='AbortError')options.onError?.(problem);}
    })();
    return handle;
  }
  window.WFOfflineVoice={...manager,synthesize,speak,preparePlayback,remove:async locale=>{activeSpeech?.cancel();terminate();return manager.remove(locale);}};
  window.addEventListener('pagehide',()=>{activeSpeech?.cancel();terminate();});
  manager.refresh();
})();
