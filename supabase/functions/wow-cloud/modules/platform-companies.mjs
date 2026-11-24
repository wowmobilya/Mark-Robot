import {sha256,failure} from '../core.mjs';

export function createPlatformActions({platformRpc,storage,requirePlatformFounder,manageDevices,inspectCompany,subscriptionSummaries,deviceObservations,ownerApprovalAlerts}){
  const handlers={'platform.identity':async({actor})=>{
    try{await requirePlatformFounder(actor);return {verifiedFounder:true};}
    catch(error){if(error?.code==='ACCESS_DENIED')return {verifiedFounder:false};throw error;}
  }};
  handlers['platform.company.ownerAlerts']=async({actor,body})=>{
    const offset=body.offset??0;
    if(!Number.isSafeInteger(offset)||offset<0||offset>2147483647)throw failure('INVALID_REQUEST',422);
    return ownerApprovalAlerts(actor,offset);
  };
  handlers['device.observe']=async({actor,body})=>deviceObservations(actor,'report',body);
  handlers['platform.company.inspect']=async({actor,body})=>{
    if(typeof body.workspaceId!=='string'||!/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(body.workspaceId)||
      !['summary','accounts','companies','products','invoices','payments','settings','audit','gallery-orders','gallery-listings','files','calls','devices'].includes(body.section)||
      !Number.isSafeInteger(body.offset)||body.offset<0||body.offset>10000)throw failure('INVALID_REQUEST',422);
    // Founder identity and company scope are reverified by the service-only PostgreSQL RPC.
    return body.section==='devices'?deviceObservations(actor,'list',{workspaceId:body.workspaceId,offset:body.offset}):inspectCompany(actor,body.workspaceId,body.section,body.offset);
  };
  handlers['platform.company.subscriptionSummaries']=async({actor,body})=>{
    const ids=body.workspaceIds;
    if(!Array.isArray(ids)||ids.length>50||ids.some(id=>typeof id!=='string'||
      !/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(id)))throw failure('INVALID_REQUEST',422);
    return subscriptionSummaries(actor,ids);
  };
  for(const action of ['company.list','company.rename','company.audit','company.status','company.create','company.deletePreview','company.deleteEmpty','limits.get','limits.set','plans.list','plans.save']){
    handlers['platform.'+action]=async({actor,body})=>{
      let data={...body};
      delete data.action;
      if(['company.deletePreview','company.deleteEmpty'].includes(action)){
        const uuid=/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
        if(typeof body.workspaceId!=='string'||!uuid.test(body.workspaceId))throw failure('INVALID_REQUEST',422);
        if(action==='company.deleteEmpty' && (body.confirmed!==true||typeof body.confirmName!=='string'||body.confirmName.length>100||
          (body.confirmWord1!=='حذف'||(body.acceptsLinkedData===true&&body.confirmWord2!=='حذف'))||
          !Number.isSafeInteger(body.expectedRevision)||body.expectedRevision<0))throw failure('CONFIRMATION_REQUIRED',422);
        data={workspaceId:body.workspaceId,...(action==='company.deleteEmpty'?{confirmed:true,confirmName:body.confirmName,expectedRevision:body.expectedRevision,confirmWord1:body.confirmWord1,confirmWord2:body.confirmWord2,acceptsLinkedData:body.acceptsLinkedData===true}:{})};
      }
      if(action==='company.create'){
        if(typeof body.setupToken!=='string'||!/^[a-f0-9]{64}$/.test(body.setupToken))throw failure('INVALID_REQUEST',422);
        data={name:body.name,claimHash:await sha256(body.setupToken),expiresAt:new Date(Date.now()+3600000).toISOString()};
      }
      if(action==='company.deleteEmpty'){
        const deadline=Date.now()+25000;
        let result=await platformRpc(actor,action,data);
        while(result?.deleted===false){
          const batch=result.pendingStorage;
          if(result.workspaceId!==data.workspaceId||!Array.isArray(batch)||!batch.length||batch.length>20||
             batch.some(item=>item?.bucket!=='mark-robot-private'||!storage.ownsWorkspaceObject(data.workspaceId,item.path)))
            throw failure('INVALID_STORAGE_PATH',422);
          await storage.removeWorkspaceObjects(data.workspaceId,batch.map(item=>item.path));
          if(Date.now()>=deadline)return {workspaceId:data.workspaceId,deleted:false,cleanupPending:true};
          result=await platformRpc(actor,action,data);
        }
        if(result?.deleted!==true||result.workspaceId!==data.workspaceId)throw failure('SERVICE_UNAVAILABLE',503);
        return result;
      }
      return platformRpc(actor,action,data);
    };
  }
  for(const scope of ['accounts','company'])for(const name of ['devices','deviceStatus','releaseDevice']){
    const action=scope+'.'+name;
    handlers[(scope==='company'?'platform.':'')+action]=async({actor,body})=>manageDevices(actor,action,{
      workspaceId:body.workspaceId,accountId:body.accountId,offset:body.offset,expectedBoundAt:body.expectedBoundAt,confirmed:body.confirmed,blocked:body.blocked
    });
  }
  return handlers;
}
