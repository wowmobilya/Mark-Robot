const test=require('node:test'),assert=require('node:assert/strict'),{webcrypto}=require('node:crypto');
const {CACHE,runtime,catalog,localeKey,splitText,pcmToWav,createManager}=require('../offline-voice.js');
const origin='https://example.test';
function cacheFixture(){
 const entries=new Map();let failure='';
 const cache={async match(url){return entries.get(String(url))?.clone();},async put(url,response){if(failure&&String(url).includes(failure))throw Object.assign(new Error('quota'),{name:'QuotaExceededError'});entries.set(String(url),response.clone());},async delete(url){return entries.delete(String(url));}};
 return {entries,cache,caches:{open:async name=>{assert.equal(name,CACHE);return cache;}},set failure(value){failure=value;}};
}
async function fixture(options={}){
 const cache=cacheFixture(),payload=new TextEncoder().encode('verified local asset'),sha256=Buffer.from(await webcrypto.subtle.digest('SHA-256',payload)).toString('hex');
 const asset=id=>({id,url:'https://assets.example/'+id,bytes:payload.byteLength,sha256,type:'application/octet-stream'});
 const shared=[asset('runtime')],voices=['ar','tr'].map(locale=>({locale,id:locale+'-voice',name:locale,language:locale,quality:'medium',bytes:payload.byteLength*2,sharedBytes:payload.byteLength,files:[asset(locale+'-model'),asset(locale+'-config')]}));
 const requests=[],changes=[],progress=[];let manager;
 const fetch=async(url,init)=>{requests.push({url,init});if(options.fetch)return options.fetch(url,init,payload);return new Response(payload);};
 manager=createManager({caches:cache.caches,fetch,digest:bytes=>webcrypto.subtle.digest('SHA-256',bytes),origin,voices,shared,supported:options.supported!==false,estimate:options.estimate,onChange:value=>changes.push(value),onProgress:value=>progress.push(value)});
 return {manager,requests,changes,progress,cache,voices,shared,payload};
}
test('five pinned packs include complete model/config and shared runtime hashes with declared download sizes',()=>{
 assert.deepEqual(catalog.map(item=>item.locale),['ar','tr','en','fr','ru']);assert.equal(catalog[1].id,'tr_TR-fettah-medium');
 assert.equal(runtime.reduce((sum,item)=>sum+item.bytes,0),29608649);
 for(const voice of catalog){assert.equal(voice.files.length,2);assert.equal(voice.bytes,voice.files.reduce((sum,item)=>sum+item.bytes,0));for(const asset of [...runtime,...voice.files]){assert(/^[a-f0-9]{64}$/.test(asset.sha256));assert(asset.bytes>0);assert(asset.url.startsWith('https://'));assert(!asset.url.includes('/resolve/main/'));}}
 assert.equal(localeKey('ar-JO'),'ar');assert.equal(localeKey('en_US'),'en');
});
test('loading and checking pack availability performs no network requests',async()=>{
 const a=await fixture();await a.manager.refresh();assert.equal(a.requests.length,0);assert.equal(a.manager.getStatus('ar-JO').state,'not-installed');assert.equal(a.manager.getStatus('ar').ready,false);
 const unsupported=await fixture({supported:false});await unsupported.manager.refresh();assert.equal(unsupported.requests.length,0);assert.equal(unsupported.manager.getStatus('ar').state,'unsupported');await assert.rejects(unsupported.manager.download('ar'),/browser-unsupported/);
});
test('explicit download verifies the entire runtime and voice before exposing ready',async()=>{
 const a=await fixture();const result=await a.manager.download('ar');assert.equal(result.ready,true);assert.equal(result.installed,true);assert.equal(a.requests.length,3);assert(a.changes.slice(0,-1).every(value=>!value.ready));assert(a.progress.some(value=>value.phase==='verify'));
 for(const request of a.requests){assert.equal(request.init.credentials,'omit');assert.equal(request.init.referrerPolicy,'no-referrer');assert.equal(request.init.body,undefined);}
 const before=a.requests.length;await a.manager.refresh('ar');assert.equal(a.manager.getStatus('ar').ready,true);assert.equal(a.requests.length,before);
});
test('a second language reuses verified runtime without downloading it again',async()=>{
 const a=await fixture();await a.manager.download('ar');await a.manager.download('tr');assert.equal(a.requests.length,5);assert.equal(a.requests.filter(request=>request.url.endsWith('/runtime')).length,1);assert(a.manager.getStatus('ar').ready&&a.manager.getStatus('tr').ready);
});
test('missing runtime or config invalidates a previously installed pack',async()=>{
 const a=await fixture();await a.manager.download('ar');await a.cache.cache.delete(a.shared[0].url);await a.manager.refresh('ar');assert.equal(a.manager.getStatus('ar').ready,false);
 await a.manager.download('ar');await a.cache.cache.delete(a.voices[0].files[1].url);await a.manager.refresh('ar');assert.equal(a.manager.getStatus('ar').installed,false);
});
test('corrupt or oversized files never become executable or mark a pack ready',async()=>{
 const a=await fixture({fetch:async()=>new Response('not the expected asset')});await assert.rejects(a.manager.download('ar'),/integrity-failed/);assert.equal(a.manager.getStatus('ar').ready,false);assert.equal(a.cache.entries.size,0);
});
test('storage failure and insufficient quota remain honest errors without touching unrelated data',async()=>{
 const a=await fixture();a.cache.failure='ar-config';await assert.rejects(a.manager.download('ar'));assert.equal(a.manager.getStatus('ar').reason,'storage-full');assert.equal(a.manager.getStatus('ar').ready,false);assert(!a.cache.entries.has(origin+'/__infinity_voice__/ar-voice.json'));
 const low=await fixture({estimate:async()=>({quota:1,usage:0})});await assert.rejects(low.manager.download('ar'),/storage-full/);assert.equal(low.requests.length,0);
});
test('cancelling a download cannot report a complete installation',async()=>{
 const controller=new AbortController();const a=await fixture({fetch:async(_url,_options,payload)=>{controller.abort();return new Response(payload);}});
 await assert.rejects(a.manager.download('ar',{signal:controller.signal}),problem=>problem.code==='cancelled');assert.equal(a.manager.getStatus('ar').state,'not-installed');assert.equal(a.manager.getStatus('ar').ready,false);assert.equal(a.cache.entries.size,0);
});
test('removing one voice preserves another voice and the shared runtime',async()=>{
 const a=await fixture();await a.manager.download('ar');await a.manager.download('tr');await a.manager.remove('ar');await a.manager.refresh();assert.equal(a.manager.getStatus('ar').ready,false);assert.equal(a.manager.getStatus('tr').ready,true);assert(a.cache.entries.has(a.shared[0].url));assert(!a.cache.entries.has(a.voices[0].files[0].url));
});
test('sentence boundaries refer to original text and keep decimals and emoji intact',()=>{
 const original='  مرحبًا بكم. المبيعات 1,250.50 ليرة.\nشكرا لكم! 😀 '+('كلمة '.repeat(90));const chunks=splitText(original,70);
 assert(chunks.length>3);for(const chunk of chunks){assert.equal(original.slice(chunk.charIndex,chunk.charIndex+chunk.charLength),chunk.text);assert(chunk.charLength<=70);assert(!/[\uD800-\uDBFF]$/.test(chunk.text));}
 assert(chunks.some(chunk=>chunk.text.includes('1,250.50')));assert.equal(chunks.map(chunk=>chunk.text).join('').replace(/\s/g,''),original.replace(/\s/g,''));
});
test('WAV output declares real PCM length/rate and clips invalid samples safely',()=>{
 const buffer=pcmToWav(Float32Array.from([0,1,-1,2,NaN]),22050),view=new DataView(buffer);assert.equal(new TextDecoder().decode(new Uint8Array(buffer).slice(0,4)),'RIFF');assert.equal(buffer.byteLength,54);assert.equal(view.getUint32(24,true),22050);assert.equal(view.getInt16(46,true),32767);assert.equal(view.getInt16(48,true),-32768);assert.equal(view.getInt16(50,true),32767);assert.equal(view.getInt16(52,true),0);
});
