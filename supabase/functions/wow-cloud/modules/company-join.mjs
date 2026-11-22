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
 return {actions,publicActions:{'auth.companyJoin':submit}};
}
