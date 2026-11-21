'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
let preview = {};
try { preview = require('../invoice-preview.js'); } catch (error) { if (error.code !== 'MODULE_NOT_FOUND') throw error; }

test('phone fit contains the complete A4 width and reserves its scaled height', () => {
  assert.equal(typeof preview.fitLayout, 'function');
  for (const width of [280, 296, 358, 398, 768, 1200]) {
    const box = preview.fitLayout(width, 794, 2278, 'fit');
    assert.ok(box.width <= width);
    assert.ok(box.scale > 0 && box.scale <= 1);
    assert.equal(Math.round(box.height / box.width * 100), Math.round(2278 / 794 * 100));
  }
  assert.equal(preview.fitLayout(1200, 794, 1139, 'fit').scale, 1);
  assert.equal(preview.fitLayout(0, 794, 1139, 'fit'), null);
});

test('manual zoom retains print geometry and accepts tall invoices', () => {
  assert.equal(typeof preview.fitLayout, 'function');
  const native = preview.fitLayout(320, 794, 5695, 1);
  assert.deepEqual(native, {scale:1,width:794,height:5695});
  const zoom = preview.fitLayout(320, 794, 5695, 1.5);
  assert.equal(zoom.width, 1191);
  assert.equal(zoom.height, 8542.5);
});

const tick = () => new Promise(resolve => setImmediate(resolve));
function gate() { let resolve; const promise = new Promise(done => {resolve = done;}); return {resolve,promise}; }
test('preview preparation ignores stale results and coalesces repeated requests without PDF encoding', async () => {
  assert.equal(typeof preview.createPreparationQueue, 'function');
  let current = 'invoice-a', shown = true;
  const first = gate(), built = [], applied = [], released = [];
  const queue = preview.createPreparationQueue({
    read:() => shown ? {key:current} : null,
    build:async snapshot => {built.push(snapshot.key); if(snapshot.key==='invoice-a') await first.promise; return {key:snapshot.key,dispose(){released.push(snapshot.key);}};},
    apply:result => {applied.push(result.key);current=result.key+'-ready';},
    onError:error => {throw error;}
  });
  const pending = queue.prepare();
  current='invoice-b'; queue.prepare(); queue.prepare(); queue.prepare();
  first.resolve(); await pending; await tick();
  assert.deepEqual(built,['invoice-a','invoice-b']);
  assert.deepEqual(applied,['invoice-b']);
  assert.deepEqual(released,['invoice-a','invoice-b']);
  shown=false; await queue.prepare(); assert.equal(built.length,2);
});

test('closing a preview before preparation completes never replaces its content', async () => {
  assert.equal(typeof preview.createPreparationQueue, 'function');
  let shown=true,applied=0,disposed=0; const held=gate();
  const queue=preview.createPreparationQueue({read:()=>shown?{key:'current'}:null,build:async()=>{await held.promise;return {dispose(){disposed++;}};},apply:()=>{applied++;}});
  const pending=queue.prepare();shown=false;held.resolve();await pending;
  assert.equal(applied,0);assert.equal(disposed,1);
});

test('a request arriving between an empty drain and settlement is not lost', async () => {
  let current=null;const built=[],applied=[];
  const queue=preview.createPreparationQueue({
    read:()=>current&&{key:current},
    build:async snapshot=>{built.push(snapshot.key);return snapshot;},
    apply:result=>{applied.push(result.key);current=null;}
  });
  const waiting=queue.prepare();
  current='new-preview';queue.prepare();
  await waiting;
  assert.deepEqual(built,['new-preview']);assert.deepEqual(applied,['new-preview']);
});

test('a stale failure is silent and the latest request still prepares', async () => {
  let current='old';const held=gate(),errors=[],built=[],applied=[];
  const queue=preview.createPreparationQueue({
    read:()=>({key:current}),
    build:async snapshot=>{built.push(snapshot.key);if(snapshot.key==='old'){await held.promise;throw new Error('old image failed');}return snapshot;},
    apply:result=>{applied.push(result.key);},
    onError:error=>errors.push(error.message)
  });
  const waiting=queue.prepare();current='latest';queue.prepare();held.resolve();await waiting;
  assert.deepEqual(errors,[]);assert.deepEqual(built,['old','latest']);assert.deepEqual(applied,['latest']);
});

test('an active preparation error allows a clean retry and disposes failed application results', async () => {
  let fail=true,disposed=0;const errors=[],applied=[];
  const queue=preview.createPreparationQueue({
    read:()=>({key:'invoice'}),
    build:async()=>({dispose(){disposed++;}}),
    apply:()=>{if(fail)throw new Error('layout rejected');applied.push('invoice');},
    onError:error=>errors.push(error.message)
  });
  await queue.prepare();fail=false;await queue.prepare();
  assert.deepEqual(errors,['layout rejected']);assert.deepEqual(applied,['invoice']);assert.equal(disposed,2);
});

test('opening an already prepared invoice clears a previous failure without rebuilding its pages', async () => {
  const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
  const source=fs.readFileSync(path.join(__dirname,'../invoice-preview.js'),'utf8');
  const start=source.indexOf('    function prepare(){'),end=source.indexOf('    new window.MutationObserver',start);
  assert(start>=0&&end>start);
  const status={hidden:false,textContent:'Previous invoice failed'},timers=[];let builds=0;
  const queue=preview.createPreparationQueue({read:()=>null,build:()=>{builds++;},apply:()=>{}});
  const context=vm.createContext({status,layoutError:true,prepareTimer:42,schedule(){},open:()=>true,preparation:queue,
    window:{clearTimeout(){},setTimeout(callback){timers.push(callback);return timers.length;}}});
  vm.runInContext(source.slice(start,end)+'prepare();',context);
  assert(status.hidden,'a previous invoice error must disappear immediately');
  await timers.shift()();assert(status.hidden);assert.equal(builds,0);
});
