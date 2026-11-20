const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const crypto=require('node:crypto');
const core=require('../reference-voice.js');
const upstream=fs.readFileSync(path.resolve(__dirname,'../vendor/zonos3/a50e141/upstream-worker.js'),'utf8');
const digest=bytes=>Promise.resolve(crypto.createHash('sha256').update(Buffer.from(bytes)).digest());
const fragment=(source,start,end)=>source.slice(source.indexOf(start),source.indexOf(end,source.indexOf(start)));

test('fast startup only adapts the exact verified pinned runtime',async()=>{
  assert.equal(typeof core.fastStartRuntime,'function');
  const prepared=await core.fastStartRuntime(upstream,digest);
  assert(prepared.includes('i??={skinny:`q8`,large:`q8`};'));
  assert(!prepared.includes('await Xo(v,y,p);'));
  await assert.rejects(()=>core.fastStartRuntime(upstream+'\n',digest),{code:'integrity-failed'});
  await assert.rejects(()=>core.fastStartRuntime(upstream.replace('speakerDim','speakerXXX'),digest),{code:'integrity-failed'});
  // These are the original q8 inference/shader paths; the adapter must not
  // change their arithmetic, speaker conditioning, or synthesis protocol.
  for(const [start,end] of [['function K(','function Mi('],['var Fa=','const Ia='],['async function Hr(','function Ur('],['async function Gr(','async function Kr(']]){
    const original=fragment(upstream,start,end);assert(original.length>100,start+' must identify actual executable source');
    assert.equal(fragment(prepared,start,end),original);
  }
});

test('the actual decoder factory keeps baseline q8 weights without benchmarking or repacking',async()=>{
  const prepared=await core.fastStartRuntime(upstream,digest),calls=[];
  const start=prepared.indexOf('static async create('),end=prepared.indexOf('}constructor(',start);
  const factory='async function'+prepared.slice(start+'static async create'.length,end+1);
  const context={e:class{constructor(gpu,weights,plan,sink){Object.assign(this,{gpu,weights,plan,sink});}},oo:['stage.'],
    Ha(){calls.push('benchmark');throw Error('unexpected benchmark');},za(){calls.push('repack');throw Error('unexpected repack');},ao:()=>32};
  const create=vm.runInNewContext('('+factory+')',context);
  const originalWeight={dtype:'q8',shape:[32,32],buf:{},scales:{}},weights={t:new Map([['stage.1.weight',originalWeight]])};
  const decoder=await create({},weights,()=>{});
  assert.deepEqual(JSON.parse(JSON.stringify(decoder.plan)),{skinny:'q8',large:'q8'});
  assert.equal(weights.t.get('stage.1.weight'),originalWeight);assert.deepEqual(calls,[]);
});

test('the actual initialization chain still awaits essential loading and decoder construction before ready',async()=>{
  const prepared=await core.fastStartRuntime(upstream,digest),calls=[];
  let allowModel;const modelGate=new Promise(resolve=>{allowModel=resolve;});
  let allowDecoder;const decoderGate=new Promise(resolve=>{allowDecoder=resolve;});
  const decoder={};
  const context={URL,Map,Di:class{},Si:async()=>{calls.push('device');return{};},Ro(){},ca:async()=>[],
    fa:async()=>()=>{},pa:async(gpu,base,name)=>{calls.push(name);if(name==='backbone')await modelGate;return{meta:{}};},
    me:()=>({speakerDim:192}),Ho:async()=>null,Uo:async()=>new Map(),Fa:class{constructor(){calls.push('backbone-construction');}},
    so:{async create(){calls.push('decoder-construction');await decoderGate;return decoder;}},ue:()=>({}),
    Xo(){assert.fail('speculative reference/CFG warmup must not run');},Go:async()=>null,Jo:async()=>[{codec:()=>decoder}],
    ci:class{constructor(value){calls.push('ready');assert.equal(value.hp.speakerDim,192);assert.equal(value.voices.length,0);}}};
  const initialize=vm.runInNewContext('('+fragment(prepared,'async function Yo(','async function Xo(')+')',context);
  const pending=initialize('https://example.test/model/',false,{},{});
  for(let i=0;i<12;i++)await Promise.resolve();
  assert.deepEqual(calls,['device','backbone']);
  allowModel();for(let i=0;i<18;i++)await Promise.resolve();
  assert(calls.includes('decoder-construction'));assert(!calls.includes('ready'));
  allowDecoder();await pending;
  assert.equal(calls.at(-1),'ready');
});

test('real uncaptured WebGPU failures reach the upstream fatal channel',async()=>{
  const prepared=await core.fastStartRuntime(upstream,digest),listeners=new Map(),fatals=[];
  const device={lost:new Promise(()=>{}),addEventListener:(type,callback)=>listeners.set(type,callback)};
  const context={navigator:{gpu:{requestAdapter:async()=>({limits:{maxBufferSize:1,maxStorageBufferBindingSize:1},requestDevice:async()=>device})}},console:{error(){}}};
  const request=vm.runInNewContext('('+fragment(prepared,'async function Si(','const Ci=')+')',context);
  assert.equal(await request(message=>fatals.push(message)),device);
  assert.deepEqual(fatals,[],'ordinary device creation must not report an invented failure');
  listeners.get('uncapturederror')({error:{message:'GPU allocation failed'}});
  assert.equal(fatals.length,1);assert.match(fatals[0],/GPU allocation failed/);
});

test('the asynchronous bootstrap preserves early init messages and the transferred codec port',async()=>{
  let allowCache;const cacheGate=new Promise(resolve=>{allowCache=resolve;});
  let allowInitialization;const initGate=new Promise(resolve=>{allowInitialization=resolve;});
  let runtimeBlob,revoked=false;const received=[],posts=[];
  const original=Buffer.from(upstream),asset={url:'./vendor/zonos3/a50e141/upstream-worker.js',bytes:original.length,
    sha256:crypto.createHash('sha256').update(original).digest('hex'),type:'text/javascript'};
  class BrowserURL extends URL{static createObjectURL(blob){runtimeBlob=blob;return'blob:https://example.test/runtime';}static revokeObjectURL(){revoked=true;}}
  const context=vm.createContext({URL:BrowserURL,Blob,Response,crypto:crypto.webcrypto,console,
    WFReferenceVoiceAssets:{engineBase:'./vendor/zonos3/a50e141/',cacheName:'voice',assets:[asset]},WFReferenceVoiceCore:core,
    caches:{async open(){return{async match(){await cacheGate;return new Response(original,{headers:{'Content-Length':String(original.length),'X-WF-SHA256':asset.sha256}});}};}},
    postMessage:message=>posts.push(message),
    async Yo(...args){received.push(args);await initGate;},Ro:message=>posts.push(message),Vo:Promise.resolve(),Qo(){},Bo:new Set()});
  context.self=context;
  context.__importRuntime=async()=>{
    const transformed=await runtimeBlob.text();
    // Install the actual pinned worker's init dispatcher. Its ready signal
    // remains downstream of the real initialization promise, not this loader.
    vm.runInContext(transformed.slice(transformed.lastIndexOf('self.onmessage=')),context);
  };
  const loader=fs.readFileSync(path.resolve(__dirname,'../reference-voice-engine.js'),'utf8')
    .replace(/^import '\.\/reference-voice[^\n]+\n/gm,'')
    .replaceAll('import.meta.url',JSON.stringify('https://example.test/reference-voice-engine.js?v=1'))
    .replace('import(objectURL)','__importRuntime()');
  const loading=vm.runInContext('(async()=>{'+loader+'})()',context);
  const codecPort={postMessage(){}};
  context.self.onmessage({data:{type:'init',base:'https://example.test/model/',cache:false,voicesPcm:{},codecPort},ports:[codecPort]});
  assert.equal(received.length,0);assert.equal(posts.length,0);
  allowCache();await loading;
  assert.equal(received.length,1);assert.equal(received[0][0],'https://example.test/model/');
  assert.equal(received[0][1],false);assert.equal(received[0][3],codecPort);
  assert.equal(posts.length,0,'loading an adapter must never claim the model is ready');
  allowInitialization();for(let turn=0;turn<5;turn++)await Promise.resolve();
  assert.equal(posts.length,1);assert.equal(posts[0].type,'ready');assert.equal(revoked,true);
});
