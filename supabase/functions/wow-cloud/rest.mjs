/* Small native REST adapter: no browser session persistence and no SDK import.
 * Service credentials remain in Edge environment variables. */
import {failure} from './core.mjs';
import {createCompanyStorage,workspaceOwnsPath} from './company-storage.mjs';
const AUTH_CODES=new Set(['AUTH_REQUIRED','SESSION_REVOKED','SESSION_EXPIRED']);
const FORBIDDEN_CODES=new Set(['DEVICE_ALREADY_BOUND','DEVICE_PROOF_REQUIRED','DEVICE_BLOCKED','ACCESS_DENIED','PERMISSION_DENIED','ACCOUNT_UNAVAILABLE','SETUP_PROOF_INVALID','SETUP_PROOF_REQUIRED','SUBSCRIPTION_EXPIRED','SELF_PROTECTION','LAST_OWNER','CUSTOMER_PRINCIPAL_ROLE_FIXED']);
const CONFLICT_CODES=new Set(['COMPANY_NAME_TAKEN','DEVICE_NOT_BOUND','JOIN_APPROVAL_REQUIRED','DEVICE_LIMIT_REACHED','STORAGE_LIMIT_REACHED','USER_LIMIT_REACHED','PLAN_NAME_EXISTS','VOICE_MINUTES_EXHAUSTED','VIDEO_MINUTES_EXHAUSTED','CONFLICT','IDENTITY_CONFLICT','IDEMPOTENCY_MISMATCH','BATCH_SESSION_CHANGED','DUPLICATE_INVOICE_NUMBER','DUPLICATE_RECORD','USERNAME_TAKEN','ALREADY_CONFIGURED','MEDIA_REVISION_MISMATCH','MEDIA_NOT_UPLOADED','SUBSCRIPTION_BOUND_TO_OTHER_IDENTITY','PUSH_SUBSCRIPTION_REQUIRED']);
const MODULE_RPCS=new Set(['wow_device_pairing','wow_company_join','wow_order_sms','wow_statement_service','wow_gallery_service','wow_chat_service','wow_voice_service','wow_files_service','wow_finance_service','wow_operations_service','wow_assistant_service','wow_communications_service','wow_public_share_service']);
const UUID='[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
const MODULE_OBJECT_PATH=new RegExp('^(?:chat|files)/'+UUID+'/'+UUID+'/'+UUID+'/[0-9a-f]{64}$');
const GALLERY_OBJECT_PATH=new RegExp('^'+UUID+'/gallery/'+UUID+'/'+UUID+'\\.(?:jpeg|png|webp)$');
export const isStorageCleanupPath=path=>typeof path==='string'&&(MODULE_OBJECT_PATH.test(path)||GALLERY_OBJECT_PATH.test(path));
const ownsWorkspaceObject=workspaceOwnsPath;
function rpcError(value) {
  const duplicateCompanyName=value?.code==='23505'&&value.message==='duplicate key value violates unique constraint "wow_workspaces_company_name_key"';
  const code=duplicateCompanyName?'COMPANY_NAME_TAKEN':value?.code==='P0001'&&/^[A-Z][A-Z0-9_]{2,60}$/.test(value.message||'')?value.message:'SERVICE_UNAVAILABLE';
  let details={};try{details=JSON.parse(value?.details||'{}');}catch(_){}
  const status=AUTH_CODES.has(code)?401:FORBIDDEN_CODES.has(code)?403:CONFLICT_CODES.has(code)?409:code==='RATE_LIMITED'?429:
    ['ACCOUNT_NOT_FOUND','PLAN_NOT_FOUND','COMPANY_NOT_FOUND'].includes(code)?404:code.startsWith('INVALID_')||code==='WORKSPACE_REQUIRED'?422:503;
  return failure(code,status,{...(Array.isArray(details.conflicts)?{conflicts:details.conflicts}:{}),...(Number.isFinite(details.retryAfter)?{retryAfter:details.retryAfter}:{})});
}
export function createRestDependencies({url,serviceKey,fetch:fetcher=globalThis.fetch,timeoutMs=12000,companyFolders=false}) {
  if(typeof url!=='string'||!/^https:\/\//.test(url)||!serviceKey)throw failure('SERVER_CONFIGURATION',503);
  // New opaque secret keys authenticate the gateway through apikey, not the
  // bearer header. A real user token overrides Authorization only when needed.
  const base=url.replace(/\/$/,''),serviceHeaders={apikey:serviceKey,
    ...(!serviceKey.startsWith('sb_secret_')?{authorization:'Bearer '+serviceKey}:{})};
  async function call(path,{method='POST',body,token,headers={},binary=false,allowDuplicate=false,removeObject=false,redirect,kind='service'}={}) {
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeoutMs);
    try {
      const response=await fetcher(base+path,{method,headers:{...serviceHeaders,...(token?{authorization:'Bearer '+token}:{}),
        ...(body!==undefined&&!binary?{'content-type':'application/json'}:{}),...headers},body:body===undefined?undefined:binary?body:JSON.stringify(body),
        ...(redirect?{redirect}:removeObject?{redirect:'error'}:{}),signal:controller.signal});
      let data;try{data=await response.json();}catch(_){data={};}
      if(!response.ok) {
        if(removeObject&&response.status===404&&[data?.code,data?.error].includes('NoSuchKey'))return [];
        if(allowDuplicate&&[400,409].includes(response.status)&&(['Duplicate','ResourceAlreadyExists'].includes(data?.error)||['Duplicate','ResourceAlreadyExists'].includes(data?.code)||/already exists/i.test(data?.message||'')))return {duplicate:true};
        if(kind==='rpc')throw rpcError(data);
        if(kind==='auth'&&[400,401,403].includes(response.status))throw failure('AUTH_REQUIRED',401);
        if(response.status===429)throw failure('RATE_LIMITED',429,{retryAfter:60});
        if(kind==='auth-admin'&&response.status===422)throw failure('INVALID_PASSWORD',422);
        throw failure(kind==='storage'?'STORAGE_UNAVAILABLE':'SERVICE_UNAVAILABLE',503);
      }
      return data;
    } catch(error) {
      if(error?.code)throw error;
      throw failure('SERVICE_UNAVAILABLE',503);
    } finally {clearTimeout(timer);}
  }
  const auth={
    async getUser(token){const data=await call('/auth/v1/user',{method:'GET',token,kind:'auth'});return data.user||data;},
    signIn:(email,password)=>call('/auth/v1/token?grant_type=password',{body:{email,password},kind:'auth'}),
    refresh:refreshToken=>call('/auth/v1/token?grant_type=refresh_token',{body:{refresh_token:refreshToken},kind:'auth'}),
    ownerRecoveryMail:(email,redirect)=>call('/auth/v1/recover?redirect_to='+encodeURIComponent(redirect),{body:{email},kind:'auth'}),
    verifyOwnerRecovery:token=>call('/auth/v1/verify',{body:{token_hash:token,type:'recovery'},kind:'auth'}),
    updateOwnPassword:(token,password)=>call('/auth/v1/user',{method:'PUT',body:{password},token,kind:'auth'}),
    closeAll:token=>call('/auth/v1/logout?scope=global',{token,kind:'auth'}),
    generateLink:email=>call('/auth/v1/admin/generate_link',{body:{type:'magiclink',email},redirect:'error'}),
    verifyOtp:tokenHash=>call('/auth/v1/verify',{body:{token_hash:tokenHash,type:'email'},kind:'auth',redirect:'error'}),
    signOut:token=>call('/auth/v1/logout?scope=local',{token,kind:'auth'}),
    async createUser(input){const data=await call('/auth/v1/admin/users',{body:input,kind:'auth-admin'});return data.user||data;},
    deleteUser:id=>call('/auth/v1/admin/users/'+encodeURIComponent(id),{method:'DELETE',kind:'auth-admin'}),
    updatePassword:(id,password)=>call('/auth/v1/admin/users/'+encodeURIComponent(id),{method:'PUT',body:{password},kind:'auth-admin'})
  };
  const objectPath=path=>'mark-robot-private/'+path.split('/').map(encodeURIComponent).join('/');
  const folders=createCompanyStorage({base,serviceHeaders,call,fetcher,objectPath,timeoutMs});
  const resolvePath=(path,mode)=>companyFolders?folders.resolve(path,mode):Promise.resolve(path);
  return {
    organizeCompanyStorage:folders.organize,
    ownerEnrollment:(action,data)=>call('/rest/v1/rpc/wow_owner_enrollment',{body:{p_action:action,p_data:data},kind:'rpc'}),
    rpc:(action,data)=>call('/rest/v1/rpc/wow_service',{body:{p_action:action,p_data:data},kind:'rpc'}),
    deviceSession:(action,data)=>call('/rest/v1/rpc/wow_device_session',{body:{p_action:action,p_data:data},kind:'rpc'}),
    brandRpc:(actor,action,data)=>call('/rest/v1/rpc/wow_platform_brand',{body:{p_user:actor.userId,p_session:actor.sessionId,p_action:action,p_data:data},kind:'rpc'}),
    manageDevices:(actor,action,data)=>call('/rest/v1/rpc/wow_manage_devices',{body:{p_user:actor.userId,p_session:actor.sessionId,p_action:action,p_data:data},kind:'rpc'}),
    pushRpc:(action,data)=>call('/rest/v1/rpc/wow_push_worker',{body:{p_action:action,p_data:data},kind:'rpc'}),
    statementWorker:(action,data)=>call('/rest/v1/rpc/wow_statement_worker',{body:{p_action:action,p_data:data},kind:'rpc'}),
    deletedWorkspaceSweep:()=>call('/rest/v1/rpc/wow_deleted_workspace_storage_sweep',{body:{},kind:'rpc'}),
    maintenanceRpc:(action,data)=>call('/rest/v1/rpc/wow_storage_maintenance',{body:{p_action:action,p_data:data},kind:'rpc'}),
    communicationsRpc:(action,data)=>call('/rest/v1/rpc/wow_communications_worker',{body:{p_action:action,p_data:data},kind:'rpc'}),
    health:()=>call('/rest/v1/rpc/wow_operations_health',{body:{},kind:'rpc'}),
    relayEnabled:()=>call('/rest/v1/rpc/wow_relay_enabled',{body:{},kind:'rpc'}),
    platformRelay:(actor,enabled,acceptPricing)=>call('/rest/v1/rpc/wow_platform_relay',{kind:'rpc',body:{
      p_user:actor.userId,p_session:actor.sessionId,p_enabled:enabled,p_accept_pricing:acceptPricing}}),
    // Fixed service-only credential lookup; never part of module/app dispatch.
    founderActivation:(actor,action,data)=>call('/rest/v1/rpc/wow_founder_activation',{body:{p_user:actor.userId,p_session:actor.sessionId,p_action:action,p_data:data},kind:'rpc'}),
    consumeOwnerRecovery:(id,owner,email)=>call('/rest/v1/rpc/wow_owner_recovery_consume',{body:{p_request:id,p_owner:owner,p_email:email},kind:'rpc'}),
    offlineSigningKey:()=>call('/rest/v1/rpc/wow_offline_owner_signing_key',{body:{},kind:'rpc'}),
    supportRpc:(actor,action,data)=>call('/rest/v1/rpc/wow_support_service',{body:{p_user:actor.userId,p_session:actor.sessionId,p_action:action,p_data:data},kind:'rpc'}),
    announcementRpc:(actor,action,data)=>call('/rest/v1/rpc/wow_announcement_service',{body:{p_user:actor.userId,p_session:actor.sessionId,p_action:action,p_data:data},kind:'rpc'}),
    operationsReport:actor=>call('/rest/v1/rpc/wow_platform_operations_report',{body:{p_user:actor.userId,p_session:actor.sessionId},kind:'rpc'}),
    requirePlatformFounder:actor=>call('/rest/v1/rpc/wow_platform_require',{body:{p_user:actor.userId,p_session:actor.sessionId},kind:'rpc'}),
    inspectCompany:(actor,workspaceId,section,offset)=>call('/rest/v1/rpc/wow_platform_inspect',{
      body:{p_user:actor.userId,p_session:actor.sessionId,p_workspace:workspaceId,p_section:section,p_offset:offset},kind:'rpc'}),
    ownerApprovalAlerts:(actor,offset)=>call('/rest/v1/rpc/wow_platform_owner_alerts',{
      body:{p_user:actor.userId,p_session:actor.sessionId,p_offset:offset},kind:'rpc'}),
    subscriptionSummaries:(actor,workspaces)=>call('/rest/v1/rpc/wow_platform_subscription_summary',{
      body:{p_user:actor.userId,p_session:actor.sessionId,p_workspaces:workspaces},kind:'rpc'}),
    deviceObservations:(actor,action,data)=>call('/rest/v1/rpc/wow_client_devices_rpc',{
      body:{p_user:actor.userId,p_session:actor.sessionId,p_action:action,p_data:data},kind:'rpc'}),
    platformRpc:(actor,action,data)=>call('/rest/v1/rpc/'+(/^(limits|plans)\./.test(action)?'wow_platform_limits':'wow_platform_service'),{
      body:{p_user:actor.userId,p_session:actor.sessionId,p_action:/^(limits|plans)\./.test(action)?'platform.'+action:action,p_data:data},kind:'rpc'}),
    moduleRpc:(name,action,data)=>{
      if(!MODULE_RPCS.has(name))throw failure('SERVER_CONFIGURATION',503);
      return call('/rest/v1/rpc/'+name,{body:{p_action:action,p_data:data},kind:'rpc'});
    },
    auth,
    storage:{
      ownsWorkspaceObject,
      async removeWorkspaceObjects(workspaceId,paths){
        if(!Array.isArray(paths)||!paths.length||paths.length>20||paths.some(path=>!ownsWorkspaceObject(workspaceId,path)))
          throw failure('INVALID_STORAGE_PATH',422);
        const result=await call('/storage/v1/object/mark-robot-private',{
          method:'DELETE',body:{prefixes:paths},kind:'storage',removeObject:true
        });
        if(!Array.isArray(result)||result.length>paths.length||result.some(object=>!paths.includes(object?.name)))
          throw failure('STORAGE_UNAVAILABLE',503);
      },
      // Each call removes exactly one database-generated name in the private bucket.
      remove:async path=>{
        if(!isStorageCleanupPath(path))throw failure('INVALID_STORAGE_PATH',422);
        const paths=companyFolders?await folders.lookup(path,'maintenance'):[path];
        return call('/storage/v1/object/mark-robot-private',{method:'DELETE',body:{prefixes:paths},kind:'storage',removeObject:true}).then(result=>{
          if(!Array.isArray(result)||result.length>paths.length||result.some(object=>!paths.includes(object?.name)))throw failure('STORAGE_UNAVAILABLE',503);
          return result;
        });
      },
      put:async(path,bytes,contentType)=>call('/storage/v1/object/'+objectPath(await resolvePath(path,'write')),{body:bytes,binary:true,kind:'storage',allowDuplicate:true,
        headers:{'content-type':contentType,'cache-control':'max-age=0','x-upsert':'false'}}),
      async sign(path,expiresIn=60){
        const value=await call('/storage/v1/object/sign/'+objectPath(await resolvePath(path,'read')),{body:{expiresIn},kind:'storage'});
        const signed=value.signedURL||value.signedUrl;
        if(typeof signed!=='string')throw failure('STORAGE_UNAVAILABLE',503);
        const resolved=new URL(signed.startsWith('http')?signed:base+'/storage/v1'+signed);
        if(resolved.origin!==new URL(base).origin||!resolved.pathname.startsWith('/storage/v1/object/sign/mark-robot-private/'))throw failure('STORAGE_UNAVAILABLE',503);
        return resolved.href;
      }
    }
  };
}

