const test=require('node:test');
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const core=require('../reference-voice.js');

const hostURL='https://example.test/app/reference-voice-host.js?v=2';
const appBase='https://example.test/app/';
const headers={'content-type':'audio/pcm','x-audio-sample-rate':'44100','x-audio-channels':'1','x-audio-format':'float32'};
async function flushUntil(check){
  const deadline=Date.now()+2000;
  while(!check()&&Date.now()<deadline)await new Promise(resolve=>setTimeout(resolve,1));
  assert(check(),'the host reached the expected streaming state');
}

function fixture(t,{responseHeaders=headers,initGate=Promise.resolve()}={}){
  const posts=[],calls=[],embedding=new Uint8Array([1,2,3,4]);let controller,initCount=0;
  const asset={id:'embedding',url:'./embedding.npy',bytes:4,type:'application/octet-stream',sha256:crypto.createHash('sha256').update(embedding).digest('hex')};
  const manifest={engineBase:'./vendor/zonos3/pinned/',cacheName:'voices',assets:[asset],embeddings:{ar:asset.url,tr:asset.url}};
  const stream=new ReadableStream({start(value){controller=value;}});
  const api={engine:{onFatal(){},async init(onProgress){initCount++;onProgress({loaded:4,total:8});await initGate;}},
    async localFetch(url,options){calls.push({url,options,body:JSON.parse(options.body)});return new Response(stream,{headers:responseHeaders});}};
  const context=vm.createContext({URL,Response,ReadableStream,ArrayBuffer,Uint8Array,Float32Array,DataView,TextDecoder,AbortController,
    crypto:crypto.webcrypto,WFReferenceVoiceAssets:manifest,WFReferenceVoiceCore:core,__engine:api,__hostURL:hostURL,
    caches:{async open(){return{async match(url){assert.equal(url,appBase+'embedding.npy');return new Response(embedding,{headers:{'X-WF-SHA256':asset.sha256,'Content-Length':'4'}});}};}},
    btoa:text=>Buffer.from(text,'binary').toString('base64'),postMessage:(message,transfer)=>posts.push({message,transfer})});
  context.self=context;
  const script=fs.readFileSync(path.resolve(__dirname,'../reference-voice-host.js'),'utf8')
    .replace(/^import '\.\/reference-voice[^\n]+\n/gm,'')
    .replaceAll('import.meta.url','__hostURL')
    .replace("import(new URL('engine.js',engineBase).href)",'Promise.resolve(__engine)');
  vm.runInContext(script,context,{filename:'reference-voice-host.js'});
  t.after(()=>{try{controller.close();}catch(_){}});
  return{posts,calls,get initCount(){return initCount;},
    send:message=>context.self.onmessage({data:message}),
    enqueue:bytes=>controller.enqueue(bytes),close:()=>controller.close(),
    acknowledge(message){return context.self.onmessage({data:{id:message.id,type:'audio-ack',sequence:message.sequence}});}};
}

test('reference host releases fragmented PCM before end and waits for audio credit',async t=>{
  const f=fixture(t),running=f.send({id:1,type:'stream',locale:'ar',text:'الرصيد صفر.'});
  await flushUntil(()=>f.calls.length===1);
  assert.equal(f.calls[0].body.stream,true);assert.equal(f.calls[0].body.format,'pcm');
  const bytes=new Uint8Array(new Float32Array([0.25,-0.5,0.75]).buffer);
  f.enqueue(bytes.slice(0,3));await new Promise(resolve=>setImmediate(resolve));
  assert.equal(f.posts.filter(post=>post.message.type==='audio').length,0);
  f.enqueue(bytes.slice(3,7));
  await flushUntil(()=>f.posts.some(post=>post.message.type==='audio'));
  const first=f.posts.find(post=>post.message.type==='audio');
  assert.deepEqual([...new Float32Array(first.message.samples)],[0.25]);
  assert.equal(first.message.sampleRate,44100);assert.equal(first.transfer[0],first.message.samples);
  assert.equal(f.posts.some(post=>post.message.type==='end'),false);
  f.enqueue(bytes.slice(7));f.close();await new Promise(resolve=>setImmediate(resolve));
  assert.equal(f.posts.filter(post=>post.message.type==='audio').length,1,'only one unacknowledged buffer reaches playback');
  await f.acknowledge(first.message);
  await flushUntil(()=>f.posts.filter(post=>post.message.type==='audio').length===2);
  const second=f.posts.filter(post=>post.message.type==='audio')[1];
  assert.deepEqual([...new Float32Array(second.message.samples)],[-0.5,0.75]);
  await f.acknowledge(second.message);await running;
  assert.equal(f.posts.at(-1).message.type,'end');
});

test('reference host prepares and generates concurrently through one model initialization',async t=>{
  let ready;const gate=new Promise(resolve=>{ready=resolve;});
  const f=fixture(t,{initGate:gate});
  const prepare=f.send({id:1,type:'prepare',locale:'ar'});
  const speech=f.send({id:2,type:'stream',locale:'tr',text:'Bakiye sıfır.'});
  await flushUntil(()=>f.initCount===1);ready();await prepare;
  await flushUntil(()=>f.calls.length===1);
  assert.equal(f.initCount,1);assert.equal(f.calls[0].body.language,'tr');
  assert(f.posts.some(post=>post.message.id===1&&post.message.type==='ready'));
  f.enqueue(new Uint8Array(new Float32Array([0.2]).buffer));f.close();
  await flushUntil(()=>f.posts.some(post=>post.message.type==='audio'));
  await f.acknowledge(f.posts.find(post=>post.message.type==='audio').message);await speech;
});

test('reference host rejects non-PCM metadata before exposing audio',async t=>{
  const f=fixture(t,{responseHeaders:{...headers,'x-audio-channels':'2'}});
  const running=f.send({id:1,type:'stream',locale:'ar',text:'الرصيد صفر.'});
  await flushUntil(()=>f.calls.length===1);f.close();await running;
  assert.equal(f.posts.at(-1).message.error,'invalid-audio');
  assert.equal(f.posts.some(post=>post.message.type==='audio'),false);
});

test('reference host rejects empty, incomplete and non-finite PCM',async t=>{
  for(const bytes of [new Uint8Array(),new Uint8Array([1,2,3]),new Uint8Array(new Float32Array([NaN]).buffer)]){
    const f=fixture(t),running=f.send({id:1,type:'stream',locale:'ar',text:'الرصيد صفر.'});
    await flushUntil(()=>f.calls.length===1);if(bytes.length)f.enqueue(bytes);f.close();await running;
    assert.equal(f.posts.at(-1).message.error,'invalid-audio');
    assert.equal(f.posts.some(post=>post.message.type==='end'),false);
  }
});
