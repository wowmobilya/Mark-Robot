// Frozen deployed release206 writer (43b6d97a61a0aac49d1bf50bbb85752ddb01747c).
// Regression fixture for mixed-version tabs; dependencies come from the actual storage harness.
async function wfWriteBatch(operations){
  if(window.WF_RESTORE_WRITE_LOCK)throw new Error('Restore in progress');
  if(!operations.length)return [];
  const mediaRows=new Map();
  const prepared=operations.map(op=>({...op,value:op.type==='delete'?undefined:
    (op.store===WF_MEDIA_STORE?op.value:wfDehydrateClone(op.value,mediaRows,undefined,true))}));
  const stores=[...new Set(prepared.map(op=>op.store).concat(mediaRows.size?[WF_MEDIA_STORE]:[]))];
  for(let attempt=0;attempt<2;attempt++){
    if(!db)await initDB();
    if(window.WF_RESTORE_WRITE_LOCK)throw new Error('Restore in progress');
    const connection=db;
    try{return await new Promise((resolve,reject)=>{
    let tx,failed;
    const results=[];
    try{
      tx=connection.transaction(stores,'readwrite');
      tx.oncomplete=()=>{
        for(const id of mediaRows.keys())WF_MEDIA_PERSISTED.add(id);
        resolve(results);
        // Drive backup is scheduled only after the IndexedDB transaction is fully committed.
        try{if(typeof wfDriveOnDatabaseCommit==='function')wfDriveOnDatabaseCommit(stores);}catch(_){ }
      };
      tx.onerror=()=>{failed=tx.error||failed;};
      tx.onabort=()=>{
        const err=failed||tx.error||new Error('IndexedDB write aborted');
        wfStorageWriteError(err);reject(err);
      };
      prepared.forEach((op,i)=>{
        const os=tx.objectStore(op.store);
        if(op.type==='merge'){
          const read=os.get(op.id);
          read.onerror=()=>{failed=read.error;};
          read.onsuccess=()=>{try{const next=op.merge(read.result,op.value);const put=os.put(next);put.onsuccess=()=>{results[i]=next;};put.onerror=()=>{failed=put.error;};}catch(err){failed=err;tx.abort();}};
          return;
        }
        // Older full-row writers do not own the new independent workspaces.
        // Preserve their latest section in this transaction, including an explicit
        // null or its absence after a restore. Intentional section changes use merge.
        const sections=op.type==='delete'?[]:op.store==='settings'&&op.value?.id==='main'?['materialLibrary','labelReprintHistory','dailyTasks','procurementOrders']:op.store==='invoices'&&op.value?.id!=null?['manufacturingTicket']:[];
        if(sections.length){
          const read=os.get(op.value.id);
          read.onerror=()=>{failed=read.error;};
          read.onsuccess=()=>{try{
            const latest=read.result;
            if(op.requireExisting&&!latest)throw new Error('MISSING_INVOICE');
            const next=op.store==='settings'?{...(latest||{}),...op.value}:{...op.value};
            if(latest)for(const section of sections){
              if(Object.prototype.hasOwnProperty.call(latest,section))next[section]=latest[section];
              else delete next[section];
            }
            const put=os.put(next);
            put.onsuccess=()=>{results[i]=op.returnRecord?next:put.result;};
            put.onerror=()=>{failed=put.error;};
          }catch(err){failed=err;tx.abort();}};
          return;
        }
        const r=op.type==='delete'?os.delete(op.id):os.put(op.value);
        r.onsuccess=()=>{results[i]=op.returnRecord&&op.type!=='delete'?op.value:r.result;};
        r.onerror=()=>{failed=r.error;};
      });
      if(mediaRows.size){
        const os=tx.objectStore(WF_MEDIA_STORE);
        for(const row of mediaRows.values())os.put(row);
      }
    }catch(err){
      failed=err;
      if(tx){try{tx.abort();}catch(_){} }
      if(!tx&&['InvalidStateError','NotFoundError'].includes(err?.name))err.wfRetryConnection=true;
      wfStorageWriteError(err);reject(err);
    }
    });}catch(err){
      // Retry only when no transaction was created: nothing can be duplicated.
      if(attempt===0&&err?.wfRetryConnection){await wfReconnectDB(connection);continue;}
      throw err;
    }
  }
}
