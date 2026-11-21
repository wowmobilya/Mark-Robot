/* Device-local identity persistence is deliberately independent of business backups. */
(function(root,factory){
  'use strict';
  if(typeof module==='object'&&module.exports)module.exports=factory();
  else root.WFAccountsLocalProvider=factory();
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  function failure(code,cause){const error=new Error(code);error.code=code;if(cause)error.cause=cause;return error;}
  function create(options={}){
    const indexedDB=options.indexedDB||globalThis.indexedDB;
    const name=options.name||'WowFurnitureIdentityDB';
    let connection=null,opening=null;
    function open(){
      if(connection)return Promise.resolve(connection);
      if(opening)return opening;
      opening=new Promise((resolve,reject)=>{
        if(!indexedDB){reject(failure('IDENTITY_STORAGE'));return;}
        let request,timer,settled=false;
        const fail=error=>{if(settled)return;settled=true;clearTimeout(timer);reject(failure('IDENTITY_STORAGE',error));};
        try{request=indexedDB.open(name,1);}catch(error){fail(error);return;}
        request.onupgradeneeded=()=>{if(!request.result.objectStoreNames.contains('identity'))request.result.createObjectStore('identity',{keyPath:'key'});};
        request.onerror=()=>fail(request.error);
        request.onblocked=()=>{timer=setTimeout(()=>fail(new Error('IDENTITY_BLOCKED')),8000);};
        request.onsuccess=()=>{
          clearTimeout(timer);
          const db=request.result;
          if(settled){db.close();return;}
          if(!db.objectStoreNames.contains('identity')){db.close();fail(new Error('IDENTITY_SCHEMA'));return;}
          settled=true;connection=db;
          db.onversionchange=()=>{db.close();if(connection===db)connection=null;};
          db.onclose=()=>{if(connection===db)connection=null;};
          resolve(db);
        };
      }).finally(()=>{opening=null;});
      return opening;
    }
    async function read(){
      const db=await open();
      return new Promise((resolve,reject)=>{
        let result=null,tx;
        try{
          tx=db.transaction('identity','readonly');
          const request=tx.objectStore('identity').get('state');
          request.onsuccess=()=>{result=request.result?.value??null;};
          tx.oncomplete=()=>resolve(result);
          tx.onerror=()=>reject(failure('IDENTITY_STORAGE',tx.error));
          tx.onabort=()=>reject(failure('IDENTITY_STORAGE',tx.error));
        }catch(error){reject(failure('IDENTITY_STORAGE',error));}
      });
    }
    async function commit(expectedRevision,next){
      const db=await open();
      return new Promise((resolve,reject)=>{
        let tx,reason;
        try{
          tx=db.transaction('identity','readwrite');
          const store=tx.objectStore('identity'),request=store.get('state');
          request.onsuccess=()=>{
            const current=request.result?.value;
            const revision=current==null?0:current.revision;
            if(revision!==expectedRevision){reason=failure('CONFLICT');tx.abort();return;}
            if(!next||next.revision!==expectedRevision+1){reason=failure('IDENTITY_STATE');tx.abort();return;}
            store.put({key:'state',value:next});
          };
          tx.oncomplete=()=>resolve();
          tx.onerror=()=>{reason=reason||failure('IDENTITY_STORAGE',tx.error);};
          tx.onabort=()=>reject(reason||failure('IDENTITY_STORAGE',tx.error));
        }catch(error){if(tx)try{tx.abort();}catch(_){}reject(failure('IDENTITY_STORAGE',error));}
      });
    }
    return {read,commit,close(){connection?.close();connection=null;}};
  }
  return {create};
});
