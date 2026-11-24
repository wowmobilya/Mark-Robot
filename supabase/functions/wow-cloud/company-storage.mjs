import {createHash} from 'node:crypto';
import {failure} from './core.mjs';

const uuid=/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/;
const bucket='mark-robot-private';
const unavailable=()=>failure('STORAGE_UNAVAILABLE',503);
const invalid=()=>failure('INVALID_STORAGE_PATH',422);

function splitKey(path){
  if(typeof path!=='string'||path.length>1024)return null;
  const parts=path.split('/');
  return parts.some(p=>!p||p==='.'||p==='..'||/[\\\x00-\x1f]/.test(p))?null:parts;
}
function legacyOwner(parts){
  if(!parts||parts.length<2)return null;
  const id=parts[0]==='chat'||parts[0]==='files' ? (parts.length>=3?parts[1]:null) : parts[0];
  return uuid.test(id)?id:null;
}
function inspectKey(path){
  const parts=splitKey(path);
  if(!parts)return null;
  if(parts[0]!=='companies'){
    const owner=legacyOwner(parts);
    return owner?{owner,canonical:path,named:false}:null;
  }
  if(parts.length<3)return null;
  const folder=parts[1],owner=folder.slice(-36),slug=folder.slice(0,-38);
  if(!uuid.test(owner)||!folder.endsWith('--'+owner)||!/^[A-Za-z0-9][A-Za-z0-9_-]{0,100}$/.test(slug))return null;
  const rest=parts.slice(2);
  if(rest.length===1&&rest[0]==='.keep')return {owner,canonical:null,named:true};
  if(legacyOwner(rest)!==owner)return null;
  return {owner,canonical:rest.join('/'),named:true};
}
export const workspaceOwnsPath=(workspaceId,path)=>uuid.test(workspaceId)&&inspectKey(path)?.owner===workspaceId;

export function createCompanyStorage({base,serviceHeaders,call,fetcher,objectPath,timeoutMs}){
  const rpc=(name,body)=>call('/rest/v1/rpc/'+name,{body,kind:'rpc'});
  async function lookup(canonical,mode){
    const key=inspectKey(canonical);
    if(!key||key.named)throw invalid();
    const result=await rpc('wow_company_storage_resolve',{p_path:canonical,p_mode:mode});
    const keys=[result?.path,...(mode==='maintenance'&&Array.isArray(result?.paths)?result.paths:[])];
    if(keys.some(path=>{
      const actual=inspectKey(path);
      return !actual||actual.owner!==key.owner||actual.canonical!==canonical;
    }))throw unavailable();
    return [...new Set(keys)];
  }
  const resolve=async(canonical,mode)=>(await lookup(canonical,mode))[0];
  async function fingerprint(path){
    const response=await fetcher(base+'/storage/v1/object/authenticated/'+objectPath(path),{
      headers:serviceHeaders,redirect:'error',signal:AbortSignal.timeout(timeoutMs)
    });
    if(!response.ok||!response.body)throw unavailable();
    const hash=createHash('sha256');
    for await(const chunk of response.body)hash.update(chunk);
    return hash.digest('hex');
  }
  async function migrate(job){
    const destination=inspectKey(job?.destination),id=job?.workspaceId;
    if(!destination?.named||destination.owner!==id)throw invalid();
    if(job.source===null){
      if(destination.canonical!==null)throw invalid();
      await call('/storage/v1/object/'+objectPath(job.destination),{
        body:new Uint8Array(),binary:true,kind:'storage',allowDuplicate:true,
        headers:{'content-type':'application/octet-stream','x-upsert':'false'}
      });
      return;
    }
    const source=inspectKey(job.source);
    if(!source||source.owner!==id||source.canonical!==destination.canonical||job.source===job.destination)throw invalid();
    if(job.readyToRetire!==true){
      await call('/storage/v1/object/copy',{body:{bucketId:bucket,sourceKey:job.source,destinationKey:job.destination},kind:'storage',allowDuplicate:true});
      return;
    }
    const [before,after]=await Promise.all([fingerprint(job.source),fingerprint(job.destination)]);
    if(before!==after)throw unavailable();
    if(source.canonical!==null && await resolve(source.canonical,'read')!==job.destination)return;
    const removed=await call('/storage/v1/object/'+bucket,{method:'DELETE',body:{prefixes:[job.source]},kind:'storage',removeObject:true});
    if(!Array.isArray(removed)||removed.length>1||removed.some(object=>object?.name!==job.source))throw unavailable();
  }
  async function organize(){
    const result=await rpc('wow_company_storage_jobs',{});
    if(!Array.isArray(result?.jobs)||result.jobs.length>5)throw unavailable();
    const settled=await Promise.allSettled(result.jobs.map(migrate));
    if(settled.some(x=>x.status==='rejected'))throw unavailable();
  }
  return {resolve,lookup,organize};
}
