import {failure,sha256} from '../core.mjs';
const uuid=v=>typeof v==='string'&&/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(v);
export function createFounderActivation({founderActivation,auth,consumeOwnerRecovery,origin,enabled=false}){
 const configured=enabled===true&&typeof origin==='string'&&/^https:\/\/[A-Za-z0-9.-]+$/.test(origin);
 const actions={};
 for(const action of ['company.activation','company.approveOwner','company.reissue','company.recover']){
  actions['platform.'+action]=async({actor,body})=>{
   if(!uuid(body.workspaceId))throw failure('INVALID_REQUEST',422);
   const data={workspaceId:body.workspaceId};
   if(action==='company.approveOwner'){
    if(!uuid(body.ownerId))throw failure('INVALID_REQUEST',422);
    data.ownerId=body.ownerId;
   }
   if(action==='company.reissue'){
    if(typeof body.setupToken!=='string'||!/^[a-f0-9]{64}$/.test(body.setupToken))throw failure('INVALID_REQUEST',422);
    Object.assign(data,{claimHash:await sha256(body.setupToken),expiresAt:new Date(Date.now()+3600000).toISOString()});
   }
   if(action==='company.recover'){
    if(body.confirmed!==true)throw failure('INVALID_REQUEST',422);
    if(!configured)throw failure('PROVIDER_NOT_CONFIGURED',503);
    data.confirmed=true;
   }
   const result=await founderActivation(actor,action,data);
   if(action==='company.activation')return {...result,canRecover:configured&&result.canRecover===true};
   if(action==='company.reissue'||action==='company.approveOwner')return result;
   const url=new URL('/platform/recover.html',origin);url.searchParams.set('request',result.requestId);
   await auth.ownerRecoveryMail(result.email,url.href);return {requested:true};
  };
 }
 async function complete({body,request}){
  if(!configured||request.headers.get('origin')!==origin)throw failure('ACCESS_DENIED',403);
  if(!uuid(body.requestId)||typeof body.tokenHash!=='string'||!/^[A-Za-z0-9_-]{32,512}$/.test(body.tokenHash))throw failure('INVALID_EMAIL_LINK',401);
  if(typeof body.newPassword!=='string'||Array.from(body.newPassword).length<12||Array.from(body.newPassword).length>128)throw failure('INVALID_PASSWORD',422);
  const session=await auth.verifyOwnerRecovery(body.tokenHash);
  try{
   const user=await auth.getUser(session.access_token);
   if(!uuid(user?.id)||user.is_anonymous||!user.email_confirmed_at||typeof user.email!=='string'||!await consumeOwnerRecovery(body.requestId,user.id,user.email))throw failure('INVALID_EMAIL_LINK',401);
   await auth.updateOwnPassword(session.access_token,body.newPassword);
   await auth.closeAll(session.access_token);
   return {changed:true};
  }finally{if(session?.access_token)try{await auth.signOut(session.access_token);}catch{}}
 }
 return {actions,publicActions:{'auth.platformOwnerRecovery':complete}};
}
