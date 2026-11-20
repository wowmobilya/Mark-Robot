/* Keeps the complete WebGPU engine in a terminable worker tree. No report text
   or audio is sent over the network; only the explicit installer can fetch. */
import './reference-voice-assets.js?v=1';
import './reference-voice.js?v=1';

const manifest=globalThis.WFReferenceVoiceAssets,core=globalThis.WFReferenceVoiceCore;
const appBase=new URL('./',import.meta.url).href;
const engineBase=new URL(manifest.engineBase,appBase).href;
const modelBase=new URL('model/',engineBase).href;
const cachedFetch=core.createCacheFetch({caches:globalThis.caches,digest:bytes=>crypto.subtle.digest('SHA-256',bytes),
  cacheName:manifest.cacheName,assets:manifest.assets,appBase,virtualBase:modelBase});
globalThis.fetch=cachedFetch;
let loading=null,api=null,activeId=null,fatal=false,credit=null;
const waitingReady=new Set(),SAMPLE_RATE=44100,MAX_SAMPLES=SAMPLE_RATE*150;

function safeError(problem){
  const allowed=['pack-not-installed','integrity-failed','voice-asset-not-allowed','voice-reference-missing','text-length','locale-unsupported','invalid-audio','speech-busy'];
  return allowed.includes(problem?.code)?problem.code:'engine-failed';
}

function asBase64(bytes){
  let text='';for(const value of new Uint8Array(bytes))text+=String.fromCharCode(value);
  return btoa(text);
}

async function ready(id){
  if(fatal)throw new Error('engine-failed');
  waitingReady.add(id);postMessage({id,type:'progress',phase:'initializing'});
  loading??=(async()=>{
    api=await import(new URL('engine.js',engineBase).href);
    api.engine.onFatal(()=>{
      fatal=true;
      postMessage({type:'fatal',error:'engine-failed'});
      credit?.reject(new Error('engine-failed'));credit=null;
    });
    await api.engine.init(value=>{
      for(const id of waitingReady)postMessage({id,type:'progress',phase:value.loaded>=value.total?'initializing':'loading',loaded:value.loaded,total:value.total});
    },{base:modelBase,cache:false});
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
  }catch(problem){controller.abort();postMessage({id,error:safeError(problem)});}
  finally{if(credit?.id===id)credit=null;activeId=null;}
};
