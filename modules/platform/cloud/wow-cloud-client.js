/* Only a previously verified device owner resumes automatically. Local owners remain independent. */
(function(root,factory){
  'use strict';
  const api=factory(root);
  if(typeof module==='object'&&module.exports)module.exports=api;
  else {root.WFCloudClient=api;root.WFCloud=api.getClient();}
})(typeof window==='object'?window:globalThis,function(root){
  'use strict';
  const OLD_OWNER_KEY='wf_wow_cloud_owner_v1',OWNER_KEY='wf_wow_cloud_linked_owner_v2',REMOTE_OWNER_KEY='wf_wow_cloud_remote_owner_v1',IDLE_MS=30*60*1000,SESSION_MS=8*60*60*1000,OWNER_RETENTION_MS=30*24*60*60*1000;
  const copy=value=>value==null?value:JSON.parse(JSON.stringify(value));
  const freeze=value=>{if(value&&typeof value==='object'&&!Object.isFrozen(value)){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
  const roles=new Set(['owner','manager','sales','carpentry','assembly','warehouse','customer','custom']);
  function failure(code,status=0,details){const error=new Error(code);error.code=code;error.status=status;if(Array.isArray(details?.conflicts))error.conflicts=copy(details.conflicts);return error;}
  function ownerRequest(search){try{return new URLSearchParams(search||'').get('wf-cloud')==='owner';}catch(_){return false;}}
  function remoteRequest(search){try{return ['employee','owner'].includes(new URLSearchParams(search||'').get('wf-cloud'));}catch(_){return false;}}
  const uuid=value=>typeof value==='string'&&/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(value);
  function browserStore(){return {
    read(){root.sessionStorage?.removeItem(OLD_OWNER_KEY);const value=root.sessionStorage?.getItem(OWNER_KEY);return value?JSON.parse(value):null;},
    write(value){if(!root.sessionStorage)throw Error('SESSION_STORAGE');root.sessionStorage.removeItem(OLD_OWNER_KEY);root.sessionStorage.setItem(OWNER_KEY,JSON.stringify(value));},
    clear(){root.sessionStorage?.removeItem(OWNER_KEY);root.sessionStorage?.removeItem(OLD_OWNER_KEY);}
  };}
  function create(options={}){
    // The first head script keeps the fragment out of DOM properties and storage.
    // Consuming its lexical closure here also prevents a second client from replaying it.
    let activation=null;try{if(typeof wfTakeOwnerActivation==='function')activation=wfTakeOwnerActivation();}catch(_){activation={invalid:true};}
    const config=options.config||root.WOW_CLOUD_CONFIG||{};
    const fetcher=options.fetch||root.fetch?.bind(root),now=options.now||Date.now,store=options.sessionStore||browserStore();
    const configured=config.enabled===true&&typeof config.endpoint==='string'&&/^https:\/\//.test(config.endpoint)&&typeof config.publishableKey==='string'&&!!config.publishableKey;
    let workspaceHint=config.workspaceId||'';try{workspaceHint=new URLSearchParams(root.location?.search||'').get('workspace')||workspaceHint;}catch(_){}
    let durableUsable=true,remoteStoreUsable=true,remoteContinuation=null,remoteSource=null,recovering=null;
    const explicitOwner=options.mode!=='local'&&ownerRequest(root.location?.search);
    let ordinaryEntry=!options.mode;try{ordinaryEntry=ordinaryEntry&&!new URLSearchParams(root.location?.search||'').has('wf-cloud');}catch(_){ordinaryEntry=false;}
    function ownerEnvelope(value,legacy=false){
      if(!value||value.mode!=='owner'||value.endpoint!==config.endpoint||!uuid(config.workspaceId)||value.workspaceId!==config.workspaceId||
        value.workspaceId!==workspaceHint||!uuid(value.userId)||!Number.isSafeInteger(value.cloudVersion)||value.cloudVersion<1||
        typeof value.refreshToken!=='string'||!value.refreshToken||value.refreshToken.length>8192)return false;
      if(legacy&&value.version===1)return true;
      return value.version===2&&uuid(value.continuationId)&&Number.isSafeInteger(value.verifiedAt)&&value.verifiedAt>=0&&value.verifiedAt<=now()+30000&&
        Number.isSafeInteger(value.expiresAt)&&value.expiresAt>now()&&value.expiresAt>value.verifiedAt&&value.expiresAt-value.verifiedAt<=OWNER_RETENTION_MS;
    }
    const remoteStorage=source=>source==='local'?root.localStorage:root.sessionStorage;
    function ownerRetirementKey(value){
      if(!value||value.mode!=='owner'||!uuid(value.userId)||!uuid(value.workspaceId)||
        !(uuid(value.continuationId)||value.version===1&&!value.continuationId))return null;
      return REMOTE_OWNER_KEY+':retired:'+JSON.stringify([value.endpoint,value.workspaceId,value.userId,value.cloudVersion,value.continuationId||'legacy']);
    }
    function ownerIsRetired(value,source){
      const key=ownerRetirementKey(value);if(!key)return false;
      // The credential's own cancellation state must be readable before restore.
      if(remoteStorage(source)?.getItem(key)!=null)return true;
      try{return remoteStorage(source==='local'?'session':'local')?.getItem(key)!=null;}catch(_){return false;}
    }
    function retireRemoteOwner(value){
      const key=ownerRetirementKey(value);if(!key)return;
      // A scoped marker never overwrites a newer explicit login when the current
      // credential cannot be read. No credential is copied into this marker.
      for(const source of ['local','session'])try{remoteStorage(source)?.setItem(key,'1');}catch(_){}
    }
    function readOwner(){
      for(const source of ['local','session'])try{
        const storage=remoteStorage(source),raw=storage?.getItem(REMOTE_OWNER_KEY);if(!raw)continue;
        let value;try{value=JSON.parse(raw);}catch(_){}
        if(ownerEnvelope(value,source==='session'&&explicitOwner)){
          let retired;try{retired=ownerIsRetired(value,source);}catch(_){return null;}
          if(!retired)return {value,source};
        }
        storage.removeItem(REMOTE_OWNER_KEY);
      }catch(_){if(source==='local')durableUsable=false;else remoteStoreUsable=false;}
      return null;
    }
    const savedOwner=configured&&(explicitOwner||ordinaryEntry)?readOwner():null;
    const automaticOwner=ordinaryEntry&&!!savedOwner;
    const mode=options.mode==='remote'||!options.mode&&(remoteRequest(root.location?.search)||automaticOwner)?'remote':'local';
    const ownerEntry=mode==='remote'&&(explicitOwner||automaticOwner);
    if(ownerEntry&&savedOwner){remoteContinuation=savedOwner.value;remoteSource=savedOwner.source;}
    const empty=()=>({configured:true,revision:0,currentAccount:null,accounts:[],audit:[]});
    let identity=empty(),session=null,workspaceId='',link=null,generation=0,connection=configured?'idle':'unconfigured',lastError='',refreshing=null;
    let signedAt=0,lastActiveAt=0,pendingActivity=false,lastVerifiedAt=0,storeUsable=true,linkedRecovering=null;
    const listeners=new Set();
    const localSnapshot=options.getLocalSnapshot||(()=>root.WFAccountAccess?.service?.getSnapshot?.());
    let localChecked=typeof options.getLocalSnapshot==='function',localScope=null,localAvailable;
    const localReady=new Promise(resolve=>{localAvailable=resolve;if(localChecked||mode==='remote')resolve();});
    function principal(){
      let state;try{state=localSnapshot();}catch(_){return null;}
      if(state?.configured===false)return {key:'local-unconfigured',ownerId:null,version:0};
      const a=state?.currentAccount;
      if(state?.configured!==true||a?.role!=='owner'||a.status!=='active'||typeof a.id!=='string'||!a.id||
        !Number.isSafeInteger(a.sessionVersion)||a.sessionVersion<1||a.expiresAt&&!(Date.parse(a.expiresAt)>now()))return null;
      return {key:JSON.stringify([a.id,a.sessionVersion]),ownerId:a.id,version:a.sessionVersion};
    }
    function retireOwner(previous){
      if(!previous?.ownerId)return;
      try{
        const slot='wf_offline_owner_retirement_v1:'+JSON.stringify([config.endpoint,previous.ownerId,previous.version]);
        // A missing marker also locks previously issued grants if a replacement write hits a quota.
        root.localStorage?.removeItem(slot);root.localStorage?.setItem(slot,root.crypto.randomUUID());
      }catch(_){}
      try{if(root.dispatchEvent&&root.CustomEvent)root.dispatchEvent(new root.CustomEvent('wf-cloud-local-owner-retired',{
        detail:{endpoint:config.endpoint,localOwner:previous.ownerId,localEpoch:previous.version}}));}catch(_){}
    }
    function dropLocal(previous){
      retireOwner(previous);link=null;workspaceId='';refreshing=null;return invalidateSession('LOCAL_OWNER_CHANGED');
    }
    function reconcileLocal(){
      if(mode!=='local'||!localChecked)return;
      const next=principal(),previous=localScope;localScope=next;
      if(previous&&previous.key!==next?.key)dropLocal(previous);
    }
    function localIdentityChanged(){
      if(mode!=='local')return;
      const initial=!localChecked;
      localChecked=true;reconcileLocal();localAvailable();
      if(initial&&!localScope){clearStored();connection=configured?'signed-out':'unconfigured';}
    }
    function lockLocalAccess(){
      if(mode!=='local')return;
      const previous=localScope;localScope=null;localChecked=false;localAvailable();
      dropLocal(previous);
    }
    if(localChecked&&mode==='local')localScope=principal();
    function clearStored(){try{store.clear();}catch(_){storeUsable=false;}}
    function readLinkedOwner(){
      if(mode!=='local'||!configured||!storeUsable)return null;
      reconcileLocal();
      if(!localChecked||!localScope?.ownerId){clearStored();return null;}
      let saved;try{saved=store.read();}catch(_){storeUsable=false;clearStored();return null;}
      if(!saved)return null;
      if(saved.version!==2||saved.mode!=='local'||saved.endpoint!==config.endpoint||saved.localOwnerId!==localScope.ownerId||
        saved.localVersion!==localScope.version||!Number.isSafeInteger(saved.cloudVersion)||saved.cloudVersion<1||typeof saved.userId!=='string'||!saved.userId||
        typeof saved.refreshToken!=='string'||!saved.refreshToken||typeof saved.workspaceId!=='string'||!saved.workspaceId){clearStored();return null;}
      return saved;
    }
    function clearRemoteStored(all=false){
      const previous=remoteContinuation;remoteContinuation=null;remoteSource=null;recovering=null;
      for(const kind of ['local','session']){
       let retiring=previous;
       try{
        if(!all&&!previous)continue;
        const storage=remoteStorage(kind);let raw;
        try{raw=storage?.getItem(REMOTE_OWNER_KEY);}catch(error){if(!all)throw error;}
        // A stale tab may end its own session, never erase a newer explicit sign-in.
        // Retire matching copies in both stores: a failed promotion cleanup may
        // have left a tab fallback beside the durable copy, including offline.
        if(raw){let current;try{current=JSON.parse(raw);}catch(_){}
          if(!all){const sameContinuation=previous.continuationId?(current?.continuationId===previous.continuationId||current?.version===1&&!current.continuationId):
              !current?.continuationId&&current?.refreshToken===previous.refreshToken;
            if(current?.mode!=='owner'||current.userId!==previous.userId||current.workspaceId!==previous.workspaceId||current.endpoint!==previous.endpoint||
              current.cloudVersion!==previous.cloudVersion||!sameContinuation)continue;}
          retiring=current||previous;
        }
        storage?.removeItem(REMOTE_OWNER_KEY);
       }catch(_){
        retireRemoteOwner(previous);if(retiring!==previous)retireRemoteOwner(retiring);
        if(kind==='local')durableUsable=false;else remoteStoreUsable=false;
       }
      }
    }
    function currentRemoteOwner(){
      if(!remoteContinuation||!remoteSource)return null;
      let raw,value,retired;
      try{raw=remoteStorage(remoteSource)?.getItem(REMOTE_OWNER_KEY);retired=ownerIsRetired(remoteContinuation,remoteSource);}
      catch(_){
        // Storage loss may keep an already verified session in memory. It must
        // never restore a not-yet-verified owner whose logout fence is unreadable.
        // Keep the original fence so a later successful read still sees logout.
        if(session)return null;
        throw failure('AUTH_REQUIRED',401);
      }
      try{value=raw?JSON.parse(raw):null;}catch(_){throw failure('AUTH_REQUIRED',401);}
      if(retired||!ownerEnvelope(value,remoteSource==='session')||value.userId!==remoteContinuation.userId||value.cloudVersion!==remoteContinuation.cloudVersion||
        (remoteContinuation.continuationId?value.continuationId!==remoteContinuation.continuationId:value.refreshToken!==remoteContinuation.refreshToken))throw failure('AUTH_REQUIRED',401);
      return value;
    }
    function reconcileRemote(){if(ownerEntry&&remoteContinuation)try{currentRemoteOwner();}catch(error){invalidateSession(error.code);}}
    function snapshot(){
      expire();
      const account=identity.currentAccount;
      return freeze({...copy(identity),configured:true,mode,authenticated:!!(session&&account),
        workspaceId:workspaceId||link?.workspaceId||workspaceHint||null,userId:account?.id||link?.userId||null,
        sessionVersion:account?.sessionVersion||null,authGeneration:generation,role:account?.role||null,status:account?.status||'signed-out',
        connection,lastError,lastVerifiedAt,linkedOwner:mode==='local'&&!!link});
    }
    function emit(){const state=snapshot();for(const listener of listeners){try{listener(state);}catch(_){}}
      try{if(root.dispatchEvent&&root.CustomEvent)root.dispatchEvent(new root.CustomEvent('wf-cloud-session-change',{detail:state}));}catch(_){}return state;}
    function invalidateSession(reason='AUTH_REQUIRED'){
      generation++;refreshing=null;linkedRecovering=null;session=null;identity=empty();pendingActivity=false;lastVerifiedAt=0;lastError=String(reason);connection=configured?'signed-out':'unconfigured';clearStored();if(mode==='remote')clearRemoteStored();return emit();
    }
    function expire(){reconcileLocal();reconcileRemote();if(session&&identity.currentAccount?.role!=='owner'&&(now()<signedAt||now()<lastActiveAt||now()-signedAt>=SESSION_MS||now()-lastActiveAt>=IDLE_MS)){invalidateSession('SESSION_EXPIRED');}}
    function checkGeneration(expected){reconcileLocal();reconcileRemote();if(expected!==generation||mode==='local'&&(!localChecked||!localScope))throw failure('AUTH_REQUIRED',401);}
    function safeIdentity(value){
      const account=value?.currentAccount;
      if(!value||!account||typeof account.id!=='string'||!account.id||!roles.has(account.role)||account.status!=='active'||
        !Array.isArray(account.permissions)||!account.permissions.every(key=>typeof key==='string')||
        !Number.isSafeInteger(account.sessionVersion)||account.sessionVersion<1||!Array.isArray(value.accounts)||!Array.isArray(value.audit))throw failure('INVALID_RESPONSE',502);
      if(account.expiresAt!=null&&(!Number.isFinite(Date.parse(account.expiresAt))||Date.parse(account.expiresAt)<=now()))throw failure('ACCOUNT_UNAVAILABLE',403);
      const result=copy(value);result.configured=true;
      if(account.role!=='owner'){
        result.accounts=result.accounts.filter(row=>row.id===account.id);
        result.audit=result.audit.filter(row=>row.actorId===account.id||(!row.targetType||row.targetType==='account')&&row.targetId===account.id);
      }
      return result;
    }
    function rememberOwner(){
      // Employee entry never inherits or creates an owner continuation.
      if(mode!=='local'){
        if(!ownerEntry)return;
        if(!session||identity.currentAccount?.role!=='owner'){clearRemoteStored();return;}
        const latest=currentRemoteOwner();
        if(remoteContinuation&&!latest)return;
        // Without Web Locks, another tab can finish a rotation first. Keep its
        // newer shared credential instead of overwriting it with our late reply.
        if(latest&&latest.refreshToken!==remoteContinuation.refreshToken){remoteContinuation=latest;session.refresh_token=latest.refreshToken;return;}
        let value;
        try{value={version:2,mode:'owner',endpoint:config.endpoint,workspaceId,userId:identity.currentAccount.id,
          cloudVersion:identity.currentAccount.sessionVersion,refreshToken:session.refresh_token,
          continuationId:remoteContinuation?.continuationId||root.crypto.randomUUID(),verifiedAt:lastVerifiedAt,expiresAt:lastVerifiedAt+OWNER_RETENTION_MS};}
        catch(_){return;}
        for(const source of ['local','session'])try{
          // An existing durable owner must keep its shared logout fence even
          // when a refresh cannot persist. First-time owners may use tab storage.
          if(source==='session'&&remoteSource==='local'&&remoteContinuation)return;
          if(source==='local'?!durableUsable:!remoteStoreUsable)continue;
          const storage=remoteStorage(source);if(!storage)throw Error('OWNER_STORAGE');
          storage.setItem(REMOTE_OWNER_KEY,JSON.stringify(value));
          remoteContinuation=value;remoteSource=source;
          if(source==='local')try{root.sessionStorage?.removeItem(REMOTE_OWNER_KEY);}catch(_){}
          return;
        }catch(_){if(source==='local')durableUsable=false;else remoteStoreUsable=false;}
        // A failed write cannot detach a previously verified logout fence.
        // First-time owners without any usable store remain memory-only.
        return;
      }
      if(!localChecked||!localScope?.ownerId||!storeUsable||!session||identity.currentAccount?.role!=='owner'){clearStored();return;}
      try{store.write({version:2,mode:'local',endpoint:config.endpoint,workspaceId,userId:identity.currentAccount.id,
        cloudVersion:identity.currentAccount.sessionVersion,localOwnerId:localScope.ownerId,localVersion:localScope.version,refreshToken:session.refresh_token});}
      catch(_){clearStored();storeUsable=false;}
    }
    function adopt(result,expected,{authentication=false,allowEpochChange=false,restoreOwner=false}={}){
      checkGeneration(expected);
      const next=safeIdentity(result.identity);
      if(typeof result.workspaceId!=='string'||!result.workspaceId)throw failure('INVALID_RESPONSE',502);
      if(ownerEntry&&(!uuid(config.workspaceId)||result.workspaceId!==config.workspaceId||result.workspaceId!==workspaceHint||next.currentAccount.role!=='owner'))throw failure('AUTH_REQUIRED',401);
      if(restoreOwner&&((restoreOwner.mode==='owner'?!ownerEntry:mode!=='local')||next.currentAccount.role!=='owner'||next.currentAccount.id!==restoreOwner.userId||
        next.currentAccount.sessionVersion!==restoreOwner.cloudVersion||result.workspaceId!==restoreOwner.workspaceId))throw failure('AUTH_REQUIRED',401);
      if(mode==='local'&&next.currentAccount.role!=='owner')throw failure('REMOTE_MODE_REQUIRED',403);
      const previous=identity.currentAccount;
      if(previous&&!authentication&&!allowEpochChange&&(previous.id!==next.currentAccount.id||previous.sessionVersion!==next.currentAccount.sessionVersion||previous.role!==next.currentAccount.role))throw failure('SESSION_REVOKED',401);
      if(authentication){
        const value=result.session;
        if(!value||typeof value.access_token!=='string'||!value.access_token||typeof value.refresh_token!=='string'||!value.refresh_token||!Number.isFinite(value.expires_at))throw failure('INVALID_RESPONSE',502);
        session={access_token:value.access_token,refresh_token:value.refresh_token,expires_at:value.expires_at};
        signedAt=lastActiveAt=now();pendingActivity=false;
      }
      identity=next;workspaceId=result.workspaceId;lastVerifiedAt=now();connection='online';lastError='';
      if(mode==='local'&&next.currentAccount.role==='owner')link={workspaceId,userId:next.currentAccount.id};
      rememberOwner();return emit();
    }
    function terminalAuth(error){return error?.status===401||['AUTH_REQUIRED','SESSION_REVOKED','SESSION_EXPIRED','ACCOUNT_UNAVAILABLE','ACCOUNT_REVOKED','ACCOUNT_SUSPENDED','ACCOUNT_DELETED'].includes(error?.code);}
    function temporary(error){return error?.code==='NETWORK'||[408,425,429].includes(error?.status)||error?.status>=500;}
    async function transport(action,payload={},token,{quiet=false}={}){
      if(!configured||typeof fetcher!=='function')throw failure('CLOUD_UNCONFIGURED');
      const sentGeneration=generation;
      const headers={'Content-Type':'application/json',apikey:config.publishableKey};if(token)headers.Authorization='Bearer '+token;
      const controller=typeof root.AbortController==='function'?new root.AbortController():null;
      const timeout=controller?setTimeout(()=>controller.abort(),15000):null;
      let response,body;
      try{
        response=await fetcher(config.endpoint,{method:'POST',headers,body:JSON.stringify({...payload,action}),signal:controller?.signal,credentials:'omit',cache:'no-store'});
        try{body=await response.json();}catch(error){
          if(error?.name==='SyntaxError'&&!response.ok&&!controller?.signal.aborted)throw failure('INVALID_RESPONSE',response.status||502);
          throw error;
        }
      }catch(error){
        if(error?.code==='INVALID_RESPONSE')throw error;
        if(!quiet&&sentGeneration===generation){connection='offline';lastError='NETWORK';emit();}
        throw failure('NETWORK');
      }finally{if(timeout)clearTimeout(timeout);}
      if(!response.ok||body?.ok!==true)throw failure(body?.error?.code||'CLOUD_ERROR',response.status||500,body?.error);
      if(!quiet&&sentGeneration===generation){connection='online';lastError='';}return body;
    }
    async function discardReturnedSession(result){
      const token=result?.session?.access_token;
      if(typeof token==='string'&&token)try{await transport('auth.signOut',{},token,{quiet:true});}catch(_){}
    }
    async function refreshToken(token,expected,restoreOwner=false){
      const result=await transport('auth.refresh',{refreshToken:token});
      try{
        checkGeneration(expected);
        if(restoreOwner?.mode==='local'){
          // A retry must not recreate a credential removed or replaced while
          // the server was verifying it. The binding hint alone grants nothing.
          const current=readLinkedOwner();
          if(!current||current.refreshToken!==restoreOwner.refreshToken||current.userId!==restoreOwner.userId||
            current.workspaceId!==restoreOwner.workspaceId||current.cloudVersion!==restoreOwner.cloudVersion)throw failure('AUTH_REQUIRED',401);
        }
        const previous=identity.currentAccount,next=result.identity?.currentAccount;
        if(previous&&(previous.id!==next?.id||previous.role!==next?.role||previous.sessionVersion!==next?.sessionVersion))throw failure('SESSION_REVOKED',401);
        const oldSignedAt=signedAt,oldActiveAt=lastActiveAt,oldPending=pendingActivity;
        // Refreshing a token is not employee activity and does not reset its lifetime.
        const value=adopt(result,expected,{authentication:true,restoreOwner});
        if(!restoreOwner){signedAt=oldSignedAt;lastActiveAt=oldActiveAt;pendingActivity=oldPending;}
        return value;
      }
      catch(error){if(restoreOwner?.mode==='owner'||restoreOwner?.mode==='local')await discardReturnedSession(result);throw error;}
    }
    function ownerRefresh(expected,restore=false){
      const run=async()=>{
        checkGeneration(expected);
        let saved=currentRemoteOwner();
        if(restore&&!saved)throw failure('AUTH_REQUIRED',401);
        // A failed durable write can leave the shared logout fence behind the
        // newer verified token in memory. A changed shared token still wins.
        const sharedAdvanced=saved&&saved.refreshToken!==remoteContinuation?.refreshToken;
        const token=restore||sharedAdvanced?saved?.refreshToken:session?.refresh_token||saved?.refreshToken;
        if(saved)remoteContinuation=saved;
        try{return await refreshToken(token,expected,restore?saved:false);}
        catch(error){
          // Providers rotate refresh tokens. A concurrent tab without Web Locks
          // may already have persisted the current token; retry that token once.
          checkGeneration(expected);const newer=currentRemoteOwner();
          if(!terminalAuth(error)||!newer||newer.refreshToken===token||newer.refreshToken===saved?.refreshToken)throw error;
          remoteContinuation=newer;return refreshToken(newer.refreshToken,expected,restore?newer:false);
        }
      };
      const locks=root.navigator?.locks;
      return remoteSource==='local'&&typeof locks?.request==='function'?
        locks.request('wf-owner-refresh:'+config.endpoint+':'+config.workspaceId,{mode:'exclusive'},run):run();
    }
    function recoverOwner(){
      if(recovering)return recovering;
      if(!ownerEntry||session||!remoteContinuation)return Promise.resolve(snapshot());
      const expected=generation;connection='checking';emit();
      const task=ownerRefresh(expected,true).catch(error=>{
        if(expected===generation){
          if(temporary(error)){connection=error.code==='NETWORK'?'offline':'error';lastError=error.code||'CLOUD_ERROR';emit();}
          else invalidateSession(error.code);
        }
        return snapshot();
      }).finally(()=>{if(recovering===task)recovering=null;});
      recovering=task;return task;
    }
    function recoverLinkedOwner(){
      if(linkedRecovering)return linkedRecovering;
      if(mode!=='local'||session)return Promise.resolve(snapshot());
      const saved=readLinkedOwner();if(!saved)return Promise.resolve(snapshot());
      const expected=generation;connection='checking';emit();
      const task=refreshToken(saved.refreshToken,expected,saved).catch(error=>{
        if(expected===generation){
          if(temporary(error)){
            // Keep only a remembered binding until live identity verification
            // succeeds; no cached account is installed during an outage.
            link={workspaceId:saved.workspaceId,userId:saved.userId};
            connection=error.code==='NETWORK'?'offline':'error';lastError=error.code||'CLOUD_ERROR';emit();
          }else invalidateSession(error.code);
        }
        return snapshot();
      }).finally(()=>{if(linkedRecovering===task)linkedRecovering=null;});
      linkedRecovering=task;return task;
    }
    async function ensureAccess(){
      expire();if(!session||!identity.currentAccount)throw failure('AUTH_REQUIRED',401);
      if(session.expires_at*1000-now()>30000)return;
      if(!refreshing){const expected=generation,token=session.refresh_token;
        const task=(ownerEntry?ownerRefresh(expected):refreshToken(token,expected)).catch(error=>{if(expected===generation&&terminalAuth(error))invalidateSession(error.code);throw error;})
          .finally(()=>{if(refreshing===task)refreshing=null;});refreshing=task;}
      await refreshing;expire();if(!session)throw failure('AUTH_REQUIRED',401);
    }
    // In-memory credentials for short-lived, private Supabase Realtime channels.
    // Caller must hold a live verified session with chat permissions. Never
    // write access tokens to a URL, log, IndexedDB, or exported files.
    async function realtimeCredentials(){
      await ready;const expected=generation;await ensureAccess();checkGeneration(expected);
      const account=identity.currentAccount;
      if(!account||!can('chat.view')||!can('chat.edit')||!/^https:\/\//.test(config.projectUrl||''))
        throw failure('ACCESS_DENIED',403);
      return Object.freeze({projectUrl:config.projectUrl,publishableKey:config.publishableKey,
        accessToken:session.access_token,userId:account.id,workspaceId,sessionVersion:account.sessionVersion});
    }
    async function request(action,payload={},options={}){
      await ready;const expected=generation;
      if(options.authenticated===false)return transport(action,payload);
      await ensureAccess();checkGeneration(expected);
      // The local owner can lock or switch accounts while an access token refreshes.
      // Module callers supply their live local and cloud authorization guard.
      options.assertAuthorized?.();
      try{const result=await transport(action,payload,session.access_token);checkGeneration(expected);options.assertAuthorized?.();return result;}
      catch(error){if(expected===generation&&!error?.local){if(terminalAuth(error))invalidateSession(error.code);else{lastError=error.code||'CLOUD_ERROR';emit();}}throw error;}
    }
    async function authenticate(action,input){
      await ready;checkGeneration(generation);invalidateSession('');const expected=generation;connection='checking';emit();
      try{return adopt(await transport(action,input),expected,{authentication:true});}
      catch(error){if(expected===generation){invalidateSession(error.code);if(error.code==='NETWORK'){connection='offline';emit();}}throw error;}
    }
    async function activateOwner(proof){
      invalidateSession('');const expected=generation;connection='checking';emit();let result;
      try{
        if(!ownerEntry||proof?.invalid||!uuid(config.workspaceId)||!uuid(proof?.workspaceId)||!uuid(proof?.userId)||
          proof.workspaceId!==config.workspaceId||proof.workspaceId!==workspaceHint||
          typeof proof.tokenHash!=='string'||!/^[A-Za-z0-9_-]{32,512}$/.test(proof.tokenHash))throw failure('OWNER_ACTIVATION_FAILED');
        const expectedWorkspace=proof.workspaceId,expectedUser=proof.userId;
        const pending=transport('auth.activateOwner',{tokenHash:proof.tokenHash,workspaceId:expectedWorkspace,userId:expectedUser},undefined,{quiet:true});
        proof=null;result=await pending;checkGeneration(expected);
        const account=result?.identity?.currentAccount;
        if(result.workspaceId!==expectedWorkspace||account?.id!==expectedUser||account.role!=='owner'||account.status!=='active')throw failure('OWNER_ACTIVATION_FAILED');
        return adopt(result,expected,{authentication:true});
      }catch(_){
        await discardReturnedSession(result);
        if(expected===generation)invalidateSession('OWNER_ACTIVATION_FAILED');
        return snapshot();
      }finally{proof=null;result=null;}
    }
    async function signIn({username,password,workspaceId:requestedWorkspace}={}){return authenticate('auth.signIn',{workspaceId:requestedWorkspace||workspaceHint||link?.workspaceId||undefined,username,password});}
    async function enrollOwner(input={}){if(typeof input.setupToken!=='string'||!input.setupToken.trim())throw failure('SETUP_PROOF_REQUIRED');return authenticate('auth.enrollOwner',{setupToken:input.setupToken.trim(),name:input.name,username:input.username,password:input.password});}
    async function customerAuth(action,input={}){
      await ready;if(mode!=='remote')throw failure('REMOTE_MODE_REQUIRED',403);
      if(session)throw failure('CUSTOMER_AUTH_SIGNOUT_REQUIRED',409);
      const expected=generation,result=await transport(action,{...input,workspaceId:workspaceHint||workspaceId||undefined});
      checkGeneration(expected);return result;
    }
    async function signOut(){
      const token=session?.access_token,expected=generation;
      if(token&&typeof root.WFPush?.beforeSignOut==='function'){
        let timer;
        try{
          await Promise.race([root.WFPush.beforeSignOut(),new Promise(resolve=>{timer=setTimeout(resolve,4000);})]);
        }catch(_){/* Offline cleanup must still lock this device. */}
        finally{clearTimeout(timer);}
      }
      if(expected===generation){if(mode==='local')retireOwner(localScope);invalidateSession('');}
      if(token)await transport('auth.signOut',{},token);
      return snapshot();
    }
    async function refresh(){
      await ready;expire();if(!session)return ownerEntry?recoverOwner():mode==='local'?recoverLinkedOwner():snapshot();
      const expected=generation,touched=pendingActivity;pendingActivity=false;
      try{return adopt(await request(touched?'session.touch':'session.snapshot'),expected);}
      catch(error){if(expected===generation){if(touched)pendingActivity=true;if(terminalAuth(error))invalidateSession(error.code);}throw error;}
    }
    async function command(action,payload={},allowEpochChange=false){
      const expected=generation;
      try{return adopt(await request(action,payload),expected,{allowEpochChange});}
      catch(error){if(expected===generation&&terminalAuth(error))invalidateSession(error.code);throw error;}
    }
    function touch(){expire();if(!session)return false;lastActiveAt=now();pendingActivity=true;return true;}
    function can(key){expire();const account=identity.currentAccount;if(!session||!account)return false;return root.WFAccountPolicy?.can?root.WFAccountPolicy.can(account,key):account.permissions.includes(key);}
    function cacheName(){
      if(mode==='local')return 'WowFurnitureDB';
      expire();if(!session||!workspaceId||!identity.currentAccount)throw failure('AUTH_REQUIRED',401);
      // Keep one physical database per account. The sync binding atomically removes
      // its previous permission version's projection before opening a new one.
      return 'WowFurnitureRemoteDB_v1_'+encodeURIComponent(workspaceId)+'_'+encodeURIComponent(identity.currentAccount.id);
    }
    function entryUrl(base=root.location?.href||'https://galeri.wowfurniture.com.tr/'){
      const scope=workspaceId||link?.workspaceId||workspaceHint;if(!scope)throw failure('WORKSPACE_REQUIRED');
      const url=new URL(base);url.searchParams.set('wf-cloud','employee');url.searchParams.set('workspace',scope);url.searchParams.delete('wf-accounts');url.hash='dashboard';return url.href;
    }
    const ready=(async()=>{
      // Employee links can inherit an opener's sessionStorage. Clear the local-link copy before any auth or storage read.
      if(mode==='remote'){
        clearStored();
        if(activation){const proof=activation;activation=null;return activateOwner(proof);}
        if(!ownerEntry){clearRemoteStored(true);return snapshot();}
        if(!configured)return snapshot();
        return recoverOwner();
      }
      activation=null;
      if(!configured)return snapshot();
      await localReady;reconcileLocal();
      return recoverLinkedOwner();
    })();
    if(ownerEntry){
      const resume=()=>{if(root.navigator?.onLine===false||root.document?.visibilityState==='hidden')return;
        return ready.then(()=>{expire();if(!session&&remoteContinuation)return recoverOwner();}).catch(()=>{});};
      for(const type of ['online','focus','pageshow'])root.addEventListener?.(type,resume);
      root.document?.addEventListener?.('visibilitychange',resume);
      root.addEventListener?.('storage',event=>{
        if(event.key===REMOTE_OWNER_KEY||event.key===null||event.key===ownerRetirementKey(remoteContinuation))reconcileRemote();
      });
    }else if(mode==='local'){
      const resume=()=>{if(root.navigator?.onLine===false||root.document?.visibilityState==='hidden')return;
        return ready.then(()=>{expire();if(!session)return recoverLinkedOwner();}).catch(()=>{});};
      for(const type of ['online','focus','pageshow'])root.addEventListener?.(type,resume);
      root.document?.addEventListener?.('visibilitychange',resume);
    }
    return Object.freeze({ready,request,realtimeCredentials,getSnapshot:snapshot,subscribe(listener){listeners.add(listener);return()=>listeners.delete(listener);},
      isConfigured:()=>configured,isRemote:()=>mode==='remote',isRemoteMode:()=>mode==='remote',isLinkedOwner:()=>mode==='local'&&!!link,
      localIdentityChanged,lockLocalAccess,invalidateSession,cacheName,entryUrl,can,touch,refresh,signIn,signOut,enrollOwner,bootstrapOwner:enrollOwner,
      customerAuthOptions:()=>customerAuth('auth.customerOptions'),
      customerRegister:input=>customerAuth('auth.customerRegister',input),
      customerRecover:input=>customerAuth('auth.customerRecover',input),
      customerVerify:input=>customerAuth('auth.customerVerify',input),
      createAccount:payload=>command('accounts.create',{payload}),
      updateAccount:(accountId,payload)=>command('accounts.update',{accountId,payload,expectedRevision:identity.revision}),
      setStatus:(accountId,status,reason='')=>command('accounts.status',{accountId,status,reason,expectedRevision:identity.revision}),
      restoreAccount:accountId=>command('accounts.restore',{accountId,expectedRevision:identity.revision}),
      setPassword:(accountId,password)=>command('accounts.setPassword',{accountId,password}),
      changePassword:(currentPassword,newPassword)=>command('accounts.changePassword',{currentPassword,newPassword},true),
      revokeSessions:accountId=>command('accounts.revokeSessions',{accountId}),
      assertPermission:permission=>request('permissions.assert',{permission}).then(()=>true),
      recordActivity:payload=>command('activity.record',{payload}),
      getConfig:()=>freeze({enabled:configured,projectRef:config.projectRef||'',dashboardUrl:config.dashboardUrl||'',endpoint:config.endpoint||''})});
  }
  let singleton;
  const getClient=()=>singleton||(singleton=create());
  return Object.freeze({create,getClient,isRemoteMode:()=>getClient().isRemoteMode()});
});
