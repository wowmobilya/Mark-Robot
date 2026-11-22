import {sha256,failure} from '../core.mjs';

export function createPlatformActions({platformRpc,requirePlatformFounder}){
  const handlers={'platform.identity':async({actor})=>{
    try{await requirePlatformFounder(actor);return {verifiedFounder:true};}
    catch(error){if(error?.code==='ACCESS_DENIED')return {verifiedFounder:false};throw error;}
  }};
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
  return handlers;
}
