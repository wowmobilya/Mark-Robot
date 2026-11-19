/* Cache-only boundary around the pinned, unmodified upstream generation worker. */
import '../../../reference-voice-assets.js?v=1';
import '../../../reference-voice.js?v=1';
const manifest=globalThis.WFReferenceVoiceAssets;
const appBase=new URL('../../../',import.meta.url).href;
globalThis.fetch=globalThis.WFReferenceVoiceCore.createCacheFetch({
  caches:globalThis.caches,digest:bytes=>crypto.subtle.digest('SHA-256',bytes),cacheName:manifest.cacheName,
  assets:manifest.assets,appBase,virtualBase:new URL('./model/',import.meta.url).href
});
await import('./upstream-worker.js');
