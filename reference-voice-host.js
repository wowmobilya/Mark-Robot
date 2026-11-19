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
let loading=null,api=null,activeId=null,fatal=false;

function safeError(problem){
  const allowed=['pack-not-installed','integrity-failed','voice-asset-not-allowed','voice-reference-missing','text-length','locale-unsupported','invalid-audio'];
  return allowed.includes(problem?.code)?problem.code:'engine-failed';
}

function asBase64(bytes){
  let text='';for(const value of new Uint8Array(bytes))text+=String.fromCharCode(value);
  return btoa(text);
}

async function ready(){
  if(fatal)throw new Error('engine-failed');
  loading??=(async()=>{
    api=await import(new URL('engine.js',engineBase).href);
    api.engine.onFatal(()=>{
      fatal=true;
      if(activeId!==null)postMessage({id:activeId,error:'engine-failed'});
    });
    await api.engine.init(value=>{
      if(activeId!==null)postMessage({id:activeId,type:'progress',loaded:value.loaded,total:value.total});
    },{base:modelBase,cache:false});
  })();
  await loading;
}

self.onmessage=async event=>{
  const {id,text,locale,dialect}=event.data||{};
  if(!Number.isSafeInteger(id)||activeId!==null)return;
  activeId=id;
  try{
    const key=core.embeddingKey(locale,dialect),reference=manifest.embeddings[key];
    if(!reference)throw Object.assign(new Error('voice-reference-missing'),{code:'voice-reference-missing'});
    const response=await cachedFetch(new URL(reference,appBase).href);
    const embedding=asBase64(await response.arrayBuffer());
    const body=core.generationBody({text,locale,embedding,embeddingName:key+'.npy'});
    await ready();
    // localFetch is an in-process transport to the child worker, not HTTP.
    const audio=await api.localFetch('/v2/generate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
    if(!audio.ok)throw new Error('engine-failed');
    const blob=await audio.blob();
    if(blob.type!=='audio/wav'||blob.size<46)throw Object.assign(new Error('invalid-audio'),{code:'invalid-audio'});
    postMessage({id,blob});
  }catch(problem){postMessage({id,error:safeError(problem)});}
  finally{activeId=null;}
};
