'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'../bottomnav-fit.js'),'utf8');
function fixture(){
  const events=()=>({listeners:new Map(),addEventListener(type,listener,options){const values=this.listeners.get(type)||[];values.push({listener,once:options?.once});this.listeners.set(type,values);},removeEventListener(type,listener){this.listeners.set(type,(this.listeners.get(type)||[]).filter(item=>item.listener!==listener));},async emit(type){for(const item of [...(this.listeners.get(type)||[])]){if(item.once)this.removeEventListener(type,item.listener);await item.listener();}}});
  const window=events(),timers=new Map();let intervalId=0,clock=100000,requests=0,updates=0,active=true,dialog=false;
  const document=Object.assign(events(),{readyState:'interactive',hidden:false,getElementById:id=>id==='page-dashboard'?{classList:{contains:()=>active}}:null,querySelector:()=>dialog?{}:null});
  const navigator={serviceWorker:{async getRegistration(){requests++;return {async update(){updates++;}};}}};
  vm.runInNewContext(source,{window,document,navigator,Date:{now:()=>clock},setInterval(callback){timers.set(++intervalId,callback);return intervalId;},clearInterval:id=>timers.delete(id)});
  return {window,document,timers,get requests(){return requests;},get updates(){return updates;},set active(value){active=value;},set dialog(value){dialog=value;},advance(ms){clock+=ms;},async poll(){for(const callback of [...timers.values()])await callback();}};
}
test('the later deferred central updater prevents a duplicate timer or service-worker check',async()=>{
  const f=fixture();assert.equal(f.timers.size,0);f.window.WFAppUpdates={check(){assert.fail('fallback must not add an extra check');}};
  await f.window.emit('load');await f.window.emit('pageshow');await f.document.emit('visibilitychange');
  assert.equal(f.timers.size,0);assert.equal(f.requests,0);assert.equal(f.updates,0);
});
test('a missing central updater retains throttled visible-dashboard release checks',async()=>{
  const f=fixture();await f.window.emit('load');assert.equal(f.timers.size,1);
  await f.window.emit('pageshow');assert.equal(f.updates,1);await f.poll();assert.equal(f.updates,1);
  f.advance(60000);f.document.hidden=true;await f.poll();assert.equal(f.updates,1);
  f.document.hidden=false;f.active=false;await f.poll();assert.equal(f.updates,1);
  f.active=true;f.dialog=true;await f.poll();assert.equal(f.updates,1);
  f.dialog=false;await f.poll();assert.equal(f.updates,2);
});
test('a late central updater removes the fallback timer and event listeners',async()=>{
  const f=fixture();await f.window.emit('load');assert.equal(f.timers.size,1);
  f.window.WFAppUpdates={};await f.poll();assert.equal(f.timers.size,0);
  for(const type of ['online','pageshow'])assert.equal(f.window.listeners.get(type)?.length,0);
  assert.equal(f.document.listeners.get('visibilitychange')?.length,0);assert.equal(f.requests,0);
});
