import {failure} from '../core.mjs';

const billingUrl='https://dash.cloudflare.com/?to=/:account/billing';
const query=`query TurnUsage($account: string!, $from: Date, $through: Date) {
  viewer { accounts(filter:{accountTag:$account}) {
    callsTurnUsageAdaptiveGroups(limit:1,filter:{date_geq:$from,date_leq:$through}) { sum { egressBytes } }
  } }
}`;

export function createRelayActions({platformRelay,managed,accountId,analyticsToken,fetchImpl=fetch,now=()=>new Date()}){
  let cached=null;
  async function usage(from,through,time){
    if(!accountId||!/^[a-f0-9]{32}$/i.test(accountId)||!analyticsToken)return null;
    if(cached?.from===from&&cached.through===through&&time-cached.time<60000)return cached.bytes;
    try{
      const result=await fetchImpl('https://api.cloudflare.com/client/v4/graphql',{method:'POST',
        redirect:'error',signal:AbortSignal.timeout(4000),headers:{Authorization:'Bearer '+analyticsToken,'Content-Type':'application/json'},
        body:JSON.stringify({query,variables:{account:accountId,from,through}})});
      if(!result.ok)return null;
      const response=await result.json();
      if(response.errors?.length)return null;
      const groups=response.data?.viewer?.accounts?.[0]?.callsTurnUsageAdaptiveGroups;
      if(!Array.isArray(groups)||groups.length>1)return null;
      const bytes=groups.length?groups[0]?.sum?.egressBytes:0;
      if(!Number.isSafeInteger(bytes)||bytes<0)return null;
      cached={from,through,time,bytes};
      return bytes;
    }catch{return null;}
  }
  async function status(actor,requested=null,accept=false){
    const enabled=await platformRelay(actor,requested,accept)===true;
    const date=now(),usageThrough=date.toISOString().slice(0,10),usageFrom=usageThrough.slice(0,8)+'01';
    return {enabled,configured:managed===true,active:enabled&&managed===true,includedGb:1000,overageUsdPerGb:0.05,
      remainingGb:null,usageScope:'turn_only',turnEgressBytes:await usage(usageFrom,usageThrough,date.getTime()),usageFrom,usageThrough,billingUrl};
  }
  return {
    'platform.relay.get':({actor})=>status(actor),
    'platform.relay.set':async({actor,body})=>{
      if(typeof body.enabled!=='boolean'||(body.enabled&&body.acceptPricing!==true))throw failure('INVALID_REQUEST',422);
      if(body.enabled&&!managed){await platformRelay(actor,null,false);throw failure('SERVER_CONFIGURATION',503);}
      return status(actor,body.enabled,body.acceptPricing===true);
    }
  };
}
