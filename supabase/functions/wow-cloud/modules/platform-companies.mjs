import {sha256,failure} from '../core.mjs';

export function createPlatformActions({platformRpc,requirePlatformFounder,manageDevices,inspectCompany,subscriptionSummaries,deviceObservations,ownerApprovalAlerts}){
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
  for(const action of ['company.list','company.rename','company.audit','company.status','company.create','limits.get','limits.set','plans.list','plans.save']){
    handlers['platform.'+action]=async({actor,body})=>{
      let data={...body};
      delete data.action;
      if(action==='company.create'){
        if(typeof body.setupToken!=='string'||!/^[a-f0-9]{64}$/.test(body.setupToken))throw failure('INVALID_REQUEST',422);
        data={name:body.name,claimHash:await sha256(body.setupToken),expiresAt:new Date(Date.now()+3600000).toISOString()};
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
