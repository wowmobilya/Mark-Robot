/* A random installation credential. Both installed WOW apps reuse it when their browser shares origin storage. */
(function(root){
  'use strict';
  let pending;
  function obtain(){
    return new Promise((resolve,reject)=>{
      const request=root.indexedDB.open('wow-installation-v1',1);
      request.onupgradeneeded=()=>request.result.createObjectStore('identity');
      request.onerror=()=>reject(request.error);
      request.onblocked=()=>reject(Error('DEVICE_STORAGE'));
      request.onsuccess=()=>{
        const db=request.result,tx=db.transaction('identity','readwrite'),keys=tx.objectStore('identity');
        let value;
        const read=keys.get('credential');read.onsuccess=()=>{
          value=read.result;
          if(typeof value!=='string'||!/^[0-9a-f]{64}$/.test(value)){
            value=Array.from(root.crypto.getRandomValues(new Uint8Array(32)),x=>x.toString(16).padStart(2,'0')).join('');
            keys.put(value,'credential');
          }
        };
        tx.oncomplete=()=>{db.close();resolve(value);};
        tx.onabort=()=>{db.close();reject(tx.error||Error('DEVICE_STORAGE'));};
      };
    });
  }
  root.WFInstallation=Object.freeze({proof(){if(!pending)pending=obtain().catch(()=>{pending=null;return '';});return pending;}});
})(globalThis);
