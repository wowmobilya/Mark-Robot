/* Owner handoff uses the provider's expiring, single-use email proof. Ongoing
 * access/refresh credentials are returned only after verified live membership. */
import {failure} from '../core.mjs';
const uuid=value=>typeof value==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
const proof=value=>typeof value==='string'&&/^[A-Za-z0-9_-]{32,512}$/.test(value);
const need=(condition,code='OWNER_ACTIVATION_FAILED',status=401)=>{if(!condition)throw failure(code,status);};
function owner(state,userId){
  const account=state?.identity?.currentAccount;
  return account?.id===userId&&account.role==='owner'&&account.status==='active'&&uuid(state.workspaceId)&&
    Number.isSafeInteger(account.sessionVersion)&&account.sessionVersion>0;
}

export function createOwnerActivationActions({rpc,auth,origins=[],productionOrigin=origins[0]}={}){
  const allowed=new Set(origins);
  let origin;
  try{const parsed=new URL(productionOrigin);if(parsed.protocol==='https:'&&parsed.origin===productionOrigin&&allowed.has(parsed.origin))origin=parsed.origin;}catch(_){}
  const scope=request=>{
    need(origin,'OWNER_ACTIVATION_UNAVAILABLE',503);
    need(request.headers.get('origin')===origin,'ORIGIN_DENIED',403);
  };
  const actions={
    'auth.ownerActivationLink':async({body,actor,request})=>{
      scope(request);
      need(Object.keys(body).every(key=>key==='action'),'INVALID_REQUEST',422);
      const state=await rpc('session.snapshot',actor);
      need(owner(state,actor.userId),'ACCESS_DENIED',403);
      const expectedSessionVersion=state.identity.currentAccount.sessionVersion;
      const credentials=await rpc('account.credentials',{...actor,expectedSessionVersion});
      need(typeof credentials?.email==='string'&&credentials.email.length<=254,'OWNER_ACTIVATION_UNAVAILABLE',503);
      // generate_link may create an Auth principal for an unknown email. An
      // externally changed Auth email must not turn a stale mapping into signup.
      const token=request.headers.get('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1],currentUser=await auth.getUser(token);
      need(currentUser?.id===actor.userId&&currentUser.is_anonymous!==true&&currentUser.email===credentials.email,'OWNER_ACTIVATION_UNAVAILABLE',503);
      const generated=await auth.generateLink(credentials.email),user=generated?.user||generated,properties=generated?.properties||generated;
      need(user?.id===actor.userId&&user.email===credentials.email&&properties?.verification_type==='magiclink'&&proof(properties.hashed_token),'OWNER_ACTIVATION_UNAVAILABLE',503);
      const current=await rpc('session.snapshot',{...actor,expectedSessionVersion});
      need(owner(current,actor.userId)&&current.workspaceId===state.workspaceId,'ACCESS_DENIED',403);
      const payload={tokenHash:properties.hashed_token,workspaceId:state.workspaceId,userId:actor.userId};
      const url=new URL('/',origin);url.searchParams.set('wf-cloud','owner');url.searchParams.set('workspace',state.workspaceId);
      url.hash='wf-owner-activate='+btoa(JSON.stringify(payload)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
      return {url:url.href,workspaceId:state.workspaceId,userId:actor.userId};
    }
  };
  const publicActions={
    'auth.activateOwner':async({body,request,verifyToken,authenticate})=>{
      scope(request);
      need(Object.keys(body).every(key=>['action','tokenHash','workspaceId','userId'].includes(key))&&proof(body.tokenHash)&&uuid(body.workspaceId)&&uuid(body.userId));
      let session,actor;
      try{
        session=await auth.verifyOtp(body.tokenHash);
        // Auth /user verification precedes trust in the JWT's session identifier.
        actor=await verifyToken(session?.access_token);
        need(actor.userId===body.userId);
        const result=await authenticate(session);
        // session.open checks the current workspace/account in SQL. Nothing is
        // returned or adopted until its owner and exact scope are also checked.
        need(owner(result,body.userId)&&result.workspaceId===body.workspaceId);
        return result;
      }catch(error){
        // A failed proof must never revoke another already-open device session.
        if(actor)try{await rpc('session.close',actor);}catch(_){}
        if(typeof session?.access_token==='string'&&session.access_token)try{await auth.signOut(session.access_token);}catch(_){}
        if(error?.status===429)throw failure('RATE_LIMITED',429,{retryAfter:60});
        throw failure(error?.status>=500?'OWNER_ACTIVATION_UNAVAILABLE':'OWNER_ACTIVATION_FAILED',error?.status>=500?503:401);
      }
    }
  };
  return {actions,publicActions};
}
