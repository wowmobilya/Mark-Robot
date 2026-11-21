'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const providerModule=require('../accounts-local-provider.js');
const clone=value=>value==null?value:structuredClone(value),tick=()=>new Promise(resolve=>setImmediate(resolve));

// A transaction-level IndexedDB stand-in: requests complete asynchronously,
// read/write transactions serialize, abort discards staged data, and request
// success is distinct from the transaction's durable completion event.
function databaseFixture({existing=false,missingStore=false}={}){
  let persisted=null,created=existing,hasStore=existing&&!missingStore,active=null,hold=false,writeFailure=null;
  const queue=[],completions=[],opens=[],connections=[],schemas=[];
  function start(){if(active||!queue.length)return;active=queue.shift();active.draft=clone(persisted);active.started=true;setImmediate(()=>drain(active));}
  function end(tx){if(active===tx)active=null;setImmediate(start);}
  function abort(tx,error){
    if(tx.done)return;tx.done=true;tx.error=error||tx.error||Error('AbortError');
    setImmediate(()=>{tx.onerror?.();tx.onabort?.();end(tx);});
  }
  function complete(tx){
    if(tx.done)return;tx.done=true;if(tx.mode==='readwrite')persisted=clone(tx.draft);
    tx.oncomplete?.();end(tx);
  }
  function drain(tx){
    if(!tx||tx.done)return;
    const entry=tx.requests.shift();
    if(entry){
      try{entry.request.result=entry.work();entry.request.onsuccess?.();}
      catch(error){entry.request.error=error;entry.request.onerror?.();abort(tx,error);return;}
      setImmediate(()=>drain(tx));return;
    }
    if(hold)completions.push(()=>complete(tx));else complete(tx);
  }
  function connection(){
    const db={closed:false,objectStoreNames:{contains:name=>hasStore&&name==='identity'},
      createObjectStore(name,options){schemas.push({name,...options});hasStore=true;},
      close(){this.closed=true;},
      transaction(name,mode){
        assert.equal(name,'identity');assert(!this.closed,'a closed connection must be reopened');assert(hasStore);
        const tx={mode,requests:[],started:false,done:false,error:null,draft:null,
          abort(){abort(tx,tx.error);},objectStore(store){assert.equal(store,'identity');
            const request=work=>{const req={};tx.requests.push({request:req,work});return req;};
            return {get:key=>request(()=>{assert.equal(key,'state');return clone(tx.draft);}),
              put:row=>{const detached=clone(row);return request(()=>{assert.equal(mode,'readwrite');if(writeFailure){const error=writeFailure;writeFailure=null;throw error;}tx.draft=detached;return detached.key;});}};
          }};
        queue.push(tx);setImmediate(start);return tx;
      }};
    connections.push(db);return db;
  }
  const indexedDB={open(name,version){
    const request={};opens.push({name,version});
    setImmediate(()=>{request.result=connection();if(!created){created=true;request.onupgradeneeded?.();}request.onsuccess?.();});
    return request;
  }};
  return {indexedDB,opens,schemas,connections,stored:()=>clone(persisted?.value??null),hold:value=>{hold=value;},
    failWrite:error=>{writeFailure=error;},
    async waitForCompletion(){for(let i=0;i<20&&!completions.length;i++)await tick();assert(completions.length,'transaction reached its completion gate');},
    release(){assert(completions.length);completions.shift()();},
    interruptConnection(){const db=connections.at(-1);db.closed=true;db.onclose?.();}};
}
const state=(revision,name)=>({schemaVersion:1,revision,accounts:[{id:name}],audit:[]});

test('identity provider creates an independent store and preserves exact committed state across reopening',async()=>{
  const db=databaseFixture(),provider=providerModule.create({indexedDB:db.indexedDB});
  assert.equal(await provider.read(),null);
  assert.deepEqual(db.opens,[{name:'WowFurnitureIdentityDB',version:1}]);
  assert.deepEqual(db.schemas,[{name:'identity',keyPath:'key'}]);
  const first=state(1,'owner');await provider.commit(0,first);first.accounts[0].id='mutated caller';
  assert.equal((await provider.read()).accounts[0].id,'owner');
  provider.close();assert.equal((await provider.read()).revision,1);assert.equal(db.opens.length,2);
  db.interruptConnection();assert.equal((await provider.read()).accounts[0].id,'owner');assert.equal(db.opens.length,3);
});

test('provider acknowledges writes only after transaction completion, not successful put requests',async()=>{
  const db=databaseFixture(),provider=providerModule.create({indexedDB:db.indexedDB});await provider.read();db.hold(true);
  let resolved=false;const pending=provider.commit(0,state(1,'owner')).then(()=>{resolved=true;});
  await db.waitForCompletion();assert.equal(resolved,false);assert.equal(db.stored(),null);
  db.release();await pending;assert.equal(resolved,true);assert.equal(db.stored().revision,1);
});

test('two tabs racing the first owner commit cannot overwrite one another',async()=>{
  const db=databaseFixture(),first=providerModule.create({indexedDB:db.indexedDB}),second=providerModule.create({indexedDB:db.indexedDB});
  await Promise.all([first.read(),second.read()]);
  const outcomes=await Promise.allSettled([first.commit(0,state(1,'first')),second.commit(0,state(1,'second'))]);
  assert.equal(outcomes.filter(outcome=>outcome.status==='fulfilled').length,1);
  assert.equal(outcomes.find(outcome=>outcome.status==='rejected').reason.code,'CONFLICT');
  assert.equal((await first.read()).accounts[0].id,'first');assert.equal((await second.read()).revision,1);
});

test('aborted and invalid-revision transactions preserve the previous identity ledger',async()=>{
  const db=databaseFixture(),provider=providerModule.create({indexedDB:db.indexedDB});await provider.commit(0,state(1,'owner'));
  await assert.rejects(provider.commit(1,state(9,'invalid')),{code:'IDENTITY_STATE'});
  assert.equal(db.stored().accounts[0].id,'owner');assert.equal(db.stored().revision,1);
  db.failWrite(Object.assign(Error('storage full'),{name:'QuotaExceededError'}));
  await assert.rejects(provider.commit(1,state(2,'lost')),{code:'IDENTITY_STORAGE'});
  assert.equal((await provider.read()).accounts[0].id,'owner');assert.equal(db.stored().revision,1);
  await provider.commit(1,state(2,'saved'));assert.equal((await provider.read()).accounts[0].id,'saved');
});

test('an unavailable or malformed identity database is an error, never an empty owner-setup state',async()=>{
  const unavailable=providerModule.create({indexedDB:{open(){throw Error('blocked');}}});
  await assert.rejects(unavailable.read(),{code:'IDENTITY_STORAGE'});
  const db=databaseFixture({existing:true,missingStore:true}),malformed=providerModule.create({indexedDB:db.indexedDB});
  await assert.rejects(malformed.read(),{code:'IDENTITY_STORAGE'});
  assert.equal(db.connections[0].closed,true);assert.equal(db.schemas.length,0);
});
