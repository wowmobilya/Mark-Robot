/* App-shell bootstrap for the exact installed upstream build. No model assets
   are changed, downloaded, or copied into a second persistent cache. */
import './reference-voice-assets.js?v=1';
import './reference-voice.js?v=4';

const manifest=globalThis.WFReferenceVoiceAssets,core=globalThis.WFReferenceVoiceCore;
const appBase=new URL('./',import.meta.url).href,engineBase=new URL(manifest.engineBase,appBase).href;
globalThis.fetch=core.createCacheFetch({caches:globalThis.caches,digest:bytes=>crypto.subtle.digest('SHA-256',bytes),
  cacheName:manifest.cacheName,assets:manifest.assets,appBase,virtualBase:new URL('model/',engineBase).href});

// Keep init and its transferred codec port while verified code is loading.
// Installing the real handler after asynchronous setup must not drop init.
const pending=[];
const queueMessage=event=>pending.push(event);
self.onmessage=queueMessage;
let objectURL;
try{
  const response=await fetch(new URL('upstream-worker.js',engineBase).href);
  const source=await core.fastStartRuntime(await response.text());
  objectURL=URL.createObjectURL(new Blob([source],{type:'text/javascript'}));
  await import(objectURL);
  const receive=self.onmessage;
  if(typeof receive!=='function'||receive===queueMessage)throw new Error('engine-load-failed');
  for(const event of pending)receive(event);
  pending.length=0;
}catch(problem){
  pending.length=0;
  self.onmessage=()=>{};
  postMessage({type:'fatal',message:problem?.code||'engine-load-failed'});
}finally{if(objectURL)URL.revokeObjectURL(objectURL);}
