/* Keeps the complete WebGPU engine in a terminable worker tree. No report text
   or audio is sent over the network; only the explicit installer can fetch. */
import './reference-voice-assets.js?v=1';
import './reference-voice.js?v=5';

const manifest=globalThis.WFReferenceVoiceAssets,core=globalThis.WFReferenceVoiceCore;
const appBase=new URL('./',import.meta.url).href;
const engineBase=new URL(manifest.engineBase,appBase).href;
const modelBase=new URL('model/',engineBase).href;
const cachedFetch=core.createCacheFetch({caches:globalThis.caches,digest:bytes=>crypto.subtle.digest('SHA-256',bytes),
  cacheName:manifest.cacheName,assets:manifest.assets,appBase,virtualBase:modelBase});
globalThis.fetch=cachedFetch;
let loading=null,api=null,activeId=null,fatal=false,initialized=false,credit=null;
const waitingReady=new Set(),SAMPLE_RATE=44100,MAX_SAMPLES=SAMPLE_RATE*150;

function safeError(problem,fallback='engine-failed'){
  const allowed=['pack-not-installed','integrity-failed','voice-asset-not-allowed','voice-reference-missing','text-length','locale-unsupported','invalid-audio','speech-busy',
    'worker-startup-failed','engine-load-failed','engine-init-failed','generation-failed','webgpu-unavailable','gpu-device-lost','gpu-operation-failed'];
  const code=problem?.code||problem?.message;
  if(allowed.includes(code))return code;
  if(/GPU device lost/i.test(problem?.message||''))return 'gpu-device-lost';
  if(/WebGPU operation failed:/i.test(problem?.message||''))return 'gpu-operation-failed';
  if(/WebGPU is not available|No WebGPU adapter/i.test(problem?.message||''))return 'webgpu-unavailable';
  return fallback;
}

const failure=code=>Object.assign(new Error(code),{code});

function engineFatal(code){
  if(fatal)return;fatal=true;initialized=false;
  postMessage({type:'fatal',error:code});
  credit?.reject(failure(code));credit=null;
}

function asBase64(bytes){
  let text='';for(const value of new Uint8Array(bytes))text+=String.fromCharCode(value);
  return btoa(text);
}

async function ready(id){
  if(fatal)throw new Error('engine-failed');
  if(initialized){postMessage({id,type:'progress',phase:'ready'});return;}
  waitingReady.add(id);postMessage({id,type:'progress',phase:'initializing'});
  loading??=(async()=>{
    // The pinned engine creates child workers at module import, but installs
    // its initialization rejection callback only after reading voices.json.
    // Capture failures from construction onward so that early script errors
    // cannot disappear and leave engine.init() pending forever.
    const NativeWorker=globalThis.Worker;
    let rejectWorker;
    const workerFailed=new Promise((_,reject)=>{rejectWorker=reject;});
    const WatchedWorker=class extends NativeWorker{
      constructor(url,options){
        const generation=new URL(url,engineBase).href===new URL('worker.js',engineBase).href;
        super(generation?new URL('reference-voice-engine.js?v=3',appBase):url,options);
        const failed=()=>{const problem=failure('worker-startup-failed');if(initialized)engineFatal(problem.code);else rejectWorker(problem);};
        this.addEventListener('error',failed);
        this.addEventListener('messageerror',failed);
        this.addEventListener('message',event=>{
          if(event.data?.type!=='fatal')return;
          const code=safeError(new Error(String(event.data.message||'')),'engine-init-failed');
          if(initialized)engineFatal(code);else rejectWorker(failure(code));
        });
      }
    };
    globalThis.Worker=WatchedWorker;
    try{
      try{api=await Promise.race([import(new URL('engine.js',engineBase).href),workerFailed]);}
      catch(problem){throw failure(safeError(problem,'engine-load-failed'));}
      api.engine.onFatal(message=>engineFatal(safeError(new Error(String(message)))));
      try{await Promise.race([api.engine.init(value=>{
        for(const id of waitingReady)postMessage({id,type:'progress',phase:value.loaded>=value.total?'initializing':'loading',loaded:value.loaded,total:value.total});
      },{base:modelBase,cache:false}),workerFailed]);}
      catch(problem){throw failure(safeError(problem,'engine-init-failed'));}
      initialized=true;
    }finally{if(globalThis.Worker===WatchedWorker)globalThis.Worker=NativeWorker;}
  })();
  try{await loading;postMessage({id,type:'progress',phase:'ready'});}
  finally{waitingReady.delete(id);}
}

async function streamAudio(response,id){
  const invalid=()=>Object.assign(new Error('invalid-audio'),{code:'invalid-audio'});
  if(response.headers.get('content-type')?.split(';')[0].trim()!=='audio/pcm'||response.headers.get('x-audio-format')!=='float32'||Number(response.headers.get('x-audio-sample-rate'))!==SAMPLE_RATE||response.headers.get('x-audio-channels')!=='1'||!response.body)throw invalid();
  const reader=response.body.getReader();let carry=new Uint8Array(0),count=0,sequence=0;
  try{
    while(true){
      const {done,value}=await reader.read();if(done)break;
      if(!(value instanceof Uint8Array))throw invalid();if(!value.byteLength)continue;
      let bytes=value;
      if(carry.length){bytes=new Uint8Array(carry.length+value.length);bytes.set(carry);bytes.set(value,carry.length);}
      const length=bytes.byteLength-bytes.byteLength%4;carry=bytes.slice(length);
      if(!length)continue;
      count+=length/4;if(count>MAX_SAMPLES)throw invalid();
      const samples=new Float32Array(length/4),view=new DataView(bytes.buffer,bytes.byteOffset,length);
      for(let index=0;index<samples.length;index++){const sample=view.getFloat32(index*4,true);if(!Number.isFinite(sample))throw invalid();samples[index]=sample;}
      if(sequence===0)postMessage({id,type:'progress',phase:'streaming'});
      const accepted=new Promise((resolve,reject)=>{credit={id,sequence,resolve,reject};});
      postMessage({id,type:'audio',sequence,sampleRate:SAMPLE_RATE,samples:samples.buffer},[samples.buffer]);
      await accepted;sequence++;
    }
    if(carry.length||!count)throw invalid();
    postMessage({id,type:'end'});
  }finally{reader.releaseLock();}
}

self.onmessage=async event=>{
  const {id,type='synthesize',text,locale,dialect,sequence}=event.data||{};
  if(!Number.isSafeInteger(id))return;
  if(type==='audio-ack'){
    if(credit?.id===id&&credit.sequence===sequence){const accepted=credit;credit=null;accepted.resolve();}return;
  }
  if(type==='prepare'){
    try{await ready(id);postMessage({id,type:'ready'});}catch(problem){postMessage({id,error:safeError(problem)});}return;
  }
  if(type!=='stream'&&type!=='synthesize')return;
  if(activeId!==null){postMessage({id,error:'speech-busy'});return;}
  activeId=id;const controller=new AbortController();
  try{
    const key=core.embeddingKey(locale,dialect),reference=manifest.embeddings[key];
    if(!reference)throw Object.assign(new Error('voice-reference-missing'),{code:'voice-reference-missing'});
    const response=await cachedFetch(new URL(reference,appBase).href);
    const embedding=asBase64(await response.arrayBuffer());
    const body=core.generationBody({text,locale,embedding,embeddingName:key+'.npy',stream:type==='stream'});
    await ready(id);postMessage({id,type:'progress',phase:'generating'});
    // localFetch is an in-process transport to the child worker, not HTTP.
    const audio=await api.localFetch('/v2/generate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:controller.signal});
    if(!audio.ok)throw new Error('engine-failed');
    if(type==='stream'){await streamAudio(audio,id);return;}
    const blob=await audio.blob();
    if(blob.type!=='audio/wav'||blob.size<46)throw Object.assign(new Error('invalid-audio'),{code:'invalid-audio'});
    postMessage({id,blob});
  }catch(problem){controller.abort();postMessage({id,error:safeError(problem,'generation-failed')});}
  finally{if(credit?.id===id)credit=null;activeId=null;}
};
