import {failure,normalizeUsername,sha256} from '../core.mjs';
const uuid=v=>typeof v==='string'&&/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(v);
export function createCompanyJoin({moduleRpc,auth,origins=[]}){
 const service=(action,data)=>moduleRpc('wow_company_join',action,data);
 const submit=async({body,request})=>{
  if(!origins.includes(request.headers.get('origin')))throw failure('ORIGIN_DENIED',403);
  if(!uuid(body.workspaceId)||!uuid(body.requestId)||typeof body.claimToken!=='string'||!/^[a-f0-9]{64}$/.test(body.claimToken)||typeof body.name!=='string'||!body.name.trim()||Array.from(body.name.trim()).length>100)throw failure('INVALID_REQUEST',422);
  if(typeof body.password!=='string'||Array.from(body.password).length<12||Array.from(body.password).length>128)throw failure('INVALID_PASSWORD',422);
  const control={id:body.requestId,workspaceId:body.workspaceId,proofHash:await sha256(body.claimToken)};
  const prepared=await service('prepare',{...control,username:normalizeUsername(body.username),name:body.name.trim()});
  if(prepared.state!=='preparing')return {id:prepared.id,state:prepared.state};
  const email=prepared.alias;
  if(typeof email!=='string'||!email.endsWith('@wow.invalid')||!uuid(email.split('@')[0]))throw failure('SERVER_CONFIGURATION',503);
  let user;
  try{user=await auth.createUser({email,password:body.password,email_confirm:true,user_metadata:{wow:true}});}
  catch(error){
   // An interrupted attempt may already have created this unique private login identity.
   // Rebind only after possession of the original user-selected password is verified.
   let session;
   try{session=await auth.signIn(email,body.password);user=await auth.getUser(session.access_token);}
   catch{throw error;}finally{if(session?.access_token)try{await auth.signOut(session.access_token);}catch{}}
  }
  if(!uuid(user?.id)||user.email!==email)throw failure('SERVICE_UNAVAILABLE',503);
  const result=await service('bind',{...control,providerUser:user.id});
  return {id:result.id,state:result.state};
 };
 const actions={};
 for(const action of ['companyJoin.list','companyJoin.decide'])actions[action]=async({body,actor})=>{
  if(body.id!=null&&!uuid(body.id)||body.offset!=null&&(!Number.isSafeInteger(body.offset)||body.offset<0)||action==='companyJoin.decide'&&(!uuid(body.id)||!['approved','rejected'].includes(body.decision)))throw failure('INVALID_REQUEST',422);
  return service(action,{id:body.id,offset:body.offset,decision:body.decision,userId:actor.userId,sessionId:actor.sessionId});
 };
 const pair=(operation,data)=>moduleRpc('wow_device_pairing',operation,data);
 const originFor=request=>{
  const origin=request.headers.get('origin');
  if(!origins.includes(origin)||!origin.startsWith('https://'))throw failure('ORIGIN_DENIED',403);
  return origin;
 };
 actions['device.issuePairing']=async({request,actor,body})=>{
  const origin=originFor(request);
  if(!uuid(body.accountId))throw failure('INVALID_REQUEST',422);
  const token=[...crypto.getRandomValues(new Uint8Array(32))].map(n=>n.toString(16).padStart(2,'0')).join('');
  const {workspaceId}=await pair('issue',{...actor,accountId:body.accountId,digest:await sha256(token)});
  const url=new URL('/',origin);url.searchParams.set('wf-cloud','employee');url.searchParams.set('workspace',workspaceId);
  const proof={tokenHash:token,workspaceId,userId:body.accountId};
  url.hash='wf-device-pair='+btoa(JSON.stringify(proof)).replace(/=+$/,'').replace(/\+/g,'-').replace(/\//g,'_');
  return {url:url.href};
 };
 const redeem=async({body,request,installationProof,authenticate})=>{
  originFor(request);
  if(!uuid(body.userId)||!uuid(body.workspaceId)||!/^[a-f0-9]{64}$/.test(body.tokenHash)||!/^[a-f0-9]{64}$/.test(installationProof))throw failure('ACCESS_DENIED',403);
  const digest=await sha256(body.tokenHash),installation=await sha256(body.userId+':'+installationProof);
  const {email}=await pair('claim',{digest,installation,accountId:body.userId,workspaceId:body.workspaceId});
  const generated=await auth.generateLink(email),user=generated.user||generated,properties=generated.properties||generated;
  if(user.id!==body.userId||user.email!==email||properties.verification_type!=='magiclink'||!properties.hashed_token)throw failure('ACCESS_DENIED',403);
  const session=await auth.verifyOtp(properties.hashed_token);
  try{
   const verified=await auth.getUser(session.access_token);
   if(verified.id!==body.userId||verified.is_anonymous===true)throw failure('ACCESS_DENIED',403);
   const result=await authenticate(session,digest);
   if(result.workspaceId!==body.workspaceId||result.identity?.currentAccount?.id!==body.userId)throw failure('ACCESS_DENIED',403);
   return result;
  }catch(error){await auth.signOut(session.access_token).catch(()=>{});throw error;}
 };
 return {actions,publicActions:{'auth.companyJoin':submit,'auth.devicePair':redeem}};
}
