/* Piper/ONNX inference worker. Runtime and models are explicitly downloaded and
   SHA-256 verified by offline-voice.js. This worker has no network fallback. */
'use strict';
importScripts('./offline-voice.js?v=5');
const core=self.WFOfflineVoiceCore;
let runtimeReady=null,session=null,voiceKey='',config=null,phonemizeFactory=null,piperBinary=null,piperData=null;
const objectURLs=[];
const nativeFetch=self.fetch.bind(self);
self.fetch=(input,options)=>{
  const url=typeof input==='string'?input:input?.url||String(input);
  return url.startsWith('blob:')?nativeFetch(input,options):Promise.reject(core.error('offline-only'));
};
async function bytesFor(asset){
  const cache=await caches.open(core.CACHE),response=await cache.match(asset.url);
  if(!response)throw core.error('pack-not-installed');
  const bytes=await response.arrayBuffer();
  if(bytes.byteLength!==asset.bytes||core.hex(await crypto.subtle.digest('SHA-256',bytes))!==asset.sha256)throw core.error('integrity-failed');
  return bytes;
}
function blobURL(bytes,type){const url=URL.createObjectURL(new Blob([bytes],{type}));objectURLs.push(url);return url;}
async function runtime(){
  if(runtimeReady)return runtimeReady;
  runtimeReady=(async()=>{
    const assets=Object.fromEntries(core.runtime.map(asset=>[asset.id,asset]));
    const ortCode=blobURL(await bytesFor(assets['ort-js']),'text/javascript');importScripts(ortCode);
    ort.env.wasm.numThreads=1;ort.env.wasm.simd=true;ort.env.wasm.proxy=false;
    ort.env.wasm.wasmPaths={'ort-wasm-simd.wasm':blobURL(await bytesFor(assets['ort-wasm']),'application/wasm')};
    ort.env.logLevel='error';
    const piperCode=blobURL(await bytesFor(assets['piper-js']),'text/javascript');
    ({createPiperPhonemize:phonemizeFactory}=await import(piperCode));
    piperBinary=new Uint8Array(await bytesFor(assets['piper-wasm']));piperData=await bytesFor(assets['piper-data']);
  })();
  return runtimeReady;
}
async function loadVoice(locale){
  const voice=core.catalog.find(item=>item.locale===locale);if(!voice)throw core.error('locale-unsupported');
  await runtime();if(voiceKey===voice.id&&session)return;
  if(session){await session.release();session=null;voiceKey='';}
  const [model,configuration]=await Promise.all(voice.files.map(bytesFor));
  config=JSON.parse(new TextDecoder().decode(configuration));
  if(config.phoneme_type!=='espeak'||!config.espeak?.voice||!config.audio?.sample_rate)throw core.error('model-unsupported');
  session=await ort.InferenceSession.create(model,{executionProviders:['wasm'],graphOptimizationLevel:'all'});voiceKey=voice.id;
}
async function phonemes(text){
  let output=null,problem=null;
  const module=await phonemizeFactory({wasmBinary:piperBinary,getPreloadedPackage:()=>piperData,
    print:line=>{try{const value=JSON.parse(line);if(Array.isArray(value.phoneme_ids))output=value.phoneme_ids;}catch(_){}},
    printErr:()=>{problem=core.error('phonemizer-failed');},onAbort:()=>{problem=core.error('phonemizer-failed');},
    locateFile:path=>{if(path.endsWith('.data')||path.endsWith('.wasm'))return 'blob:offline-only';return path;}
  });
  module.callMain(['-l',config.espeak.voice,'--input',JSON.stringify([{text}]),'--espeak_data','/espeak-ng-data']);
  if(problem)throw problem;if(!output?.length)throw core.error('phonemizer-failed');
  return output;
}
let working=false;
self.onmessage=async event=>{
  const {id,locale,text}=event.data||{};
  if(working){self.postMessage({id,error:'speech-busy'});return;}
  if(typeof text!=='string'||!text.trim()||text.length>800){self.postMessage({id,error:'text-length'});return;}
  working=true;
  try{
    await loadVoice(locale);const ids=await phonemes(text);
    const inference=config.inference||{};
    const feeds={input:new ort.Tensor('int64',BigInt64Array.from(ids,BigInt),[1,ids.length]),input_lengths:new ort.Tensor('int64',BigInt64Array.from([ids.length],BigInt),[1]),
      scales:new ort.Tensor('float32',Float32Array.from([inference.noise_scale??.667,inference.length_scale??1,inference.noise_w??.8]),[3])};
    if(config.num_speakers>1)feeds.sid=new ort.Tensor('int64',BigInt64Array.from([0n]),[1]);
    const result=await session.run(feeds),samples=result.output?.data;
    if(!(samples instanceof Float32Array)||!samples.length)throw core.error('engine-failed');
    self.postMessage({id,blob:new Blob([core.pcmToWav(samples,config.audio.sample_rate)],{type:'audio/wav'})});
  }catch(problem){self.postMessage({id,error:problem?.code||'engine-failed'});}
  finally{working=false;}
};
