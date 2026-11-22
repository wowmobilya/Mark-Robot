/* WOW call Realtime bridge, self-hosted Phoenix v1 protocol client.
 * Uses Supabase private Broadcast + Presence over WSS; no external CDN.
 * Credentials are memory-only and refreshed from the verified WOW cloud client. */
(function(root){
 'use strict';
 if(root.WFCallRealtime)return;
 const UUID=/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
 const err=code=>Object.assign(new Error(code),{code});
 function create({topic,credentials,onBroadcast=()=>{},onPresence=()=>{},onStatus=()=>{}}){
  if(!/^(wow-call-room:|wow-call:)[0-9a-f-]{36}$/.test(topic)||!UUID.test(topic.split(':')[1]))
   throw err('INVALID_REALTIME_TOPIC');
  if(typeof credentials!=='function')throw err('INVALID_REALTIME_CREDENTIALS');
  let alive=true,socket=null,joinRef=null,joined=false,userId='',workspaceId='',epoch=0;
  let timer=null,heartbeat=null,authTimer=null,sequence=0,backoff=0,connectPromise=null;
  const pending=new Map(),presences=new Map();
  const wsReady=()=>socket&&socket.readyState===1;
  const pulse=value=>{try{onStatus(value);}catch(_){}};
  function clear(){
   if(heartbeat)root.clearInterval(heartbeat);heartbeat=null;
   if(authTimer)root.clearInterval(authTimer);authTimer=null;
   if(timer)root.clearTimeout(timer);timer=null;
   for(const [ref,item] of pending){root.clearTimeout(item.timeout);item.reject(err('REALTIME_DISCONNECTED'));pending.delete(ref);}
   presences.clear();joined=false;joinRef=null;connectPromise=null;try{onPresence([]);}catch(_){}
  }
  const push=(event,payload,ack=false,channelTopic='realtime:'+topic)=>{
   if(!wsReady())return Promise.reject(err('REALTIME_DISCONNECTED'));
   const ref=String(++sequence),frame={topic:channelTopic,event,payload,ref,join_ref:channelTopic==='phoenix'?null:joinRef};
   if(JSON.stringify(frame).length>30000)return Promise.reject(err('REALTIME_PAYLOAD_TOO_LARGE'));
   let result=Promise.resolve();
   if(ack)result=new Promise((resolve,reject)=>{
    const timeout=root.setTimeout(()=>{pending.delete(ref);reject(err('REALTIME_ACK_TIMEOUT'));},8000);
    pending.set(ref,{resolve,reject,timeout});
   });
   socket.send(JSON.stringify(frame));return result;
  };
  function track(){
   if(!joined)return;
   push('presence',{type:'presence',event:'track',payload:{user_id:userId,online:true}},true).catch(()=>{});
  }
  function receive(e){
   let value;try{value=JSON.parse(e.data);}catch(_){return;}
   const msg=Array.isArray(value)?{join_ref:value[0],ref:value[1],topic:value[2],event:value[3],payload:value[4]}:value;
   if(!msg||typeof msg!=='object')return;
   if(msg.event==='phx_reply'&&pending.has(String(msg.ref))){
    const wait=pending.get(String(msg.ref));pending.delete(String(msg.ref));root.clearTimeout(wait.timeout);
    if(msg.payload?.status==='ok')wait.resolve(msg.payload.response||{});
    else wait.reject(err('REALTIME_AUTH_OR_ACK_FAILED'));
   }
   if(msg.topic!=='realtime:'+topic||!alive)return;
   if(msg.event==='phx_error'||msg.event==='phx_close'){pulse('disconnected');try{socket?.close();}catch(_){}return;}
   if(msg.event==='system'&&msg.payload?.status==='error'){pulse('error');return;}
   if(msg.event==='broadcast'){
    const message=msg.payload;
    if(message?.type!=='broadcast'||message?.event!=='call'||!message.payload||typeof message.payload!=='object')return;
    try{onBroadcast(message.payload);}catch(_){}
   }
   if(msg.event==='presence_state'&&msg.payload&&typeof msg.payload==='object'){
    presences.clear();for(const [key,records] of Object.entries(msg.payload))if(Array.isArray(records)&&records.length)presences.set(key,records);
    try{onPresence([...presences.entries()].map(([key,entries])=>({key,entries})));}catch(_){}
   }
   if(msg.event==='presence_diff'){
    for(const [key,entries] of Object.entries(msg.payload?.joins||{}))
      if(entries?.metas)presences.set(key,entries.metas);
    for(const [key,left] of Object.entries(msg.payload?.leaves||{})){
     const previous=presences.get(key)||[],gone=new Set((left?.metas||[]).map(m=>m.phx_ref));
     const remaining=previous.filter(m=>!gone.has(m.phx_ref));if(remaining.length)presences.set(key,remaining);else presences.delete(key);
    }
    try{onPresence([...presences.entries()].map(([key,entries])=>({key,entries})));}catch(_){}
   }
  }
  async function renew(){
   if(!joined||!alive)return;
   try{
    const live=await credentials();
    if(!alive||!joined)return;
    if(live.userId!==userId||live.workspaceId!==workspaceId||live.sessionVersion!==epoch)
     throw err('REALTIME_IDENTITY_CHANGED');
    await push('access_token',{access_token:live.accessToken},false);
   }catch(_){pulse('denied');stop();}
  }
  function schedule(){
   if(!alive||timer)return;backoff=Math.min(backoff+1,5);
   timer=root.setTimeout(()=>{timer=null;connect().catch(()=>{});},Math.min(1000*2**backoff,12000));
  }
  async function connect(){
   if(!alive)throw err('REALTIME_DISPOSED');
   if(joined)return true;
   if(connectPromise)return connectPromise;
   const run=(async()=>{
    const data=await credentials();
    if(!alive)throw err('REALTIME_DISPOSED');
    if(!data?.accessToken||typeof data.publishableKey!=='string'||!UUID.test(data.userId)||
      !UUID.test(data.workspaceId)||!Number.isSafeInteger(data.sessionVersion))throw err('REALTIME_AUTH_REQUIRED');
    const origin=new URL(data.projectUrl||'');
    if(origin.protocol!=='https:'||origin.username||origin.password||origin.pathname!=='/'||origin.search||origin.hash)
     throw err('REALTIME_HTTPS_REQUIRED');
    userId=data.userId;workspaceId=data.workspaceId;epoch=data.sessionVersion;
    const url=new URL(origin.href);url.protocol='wss:';url.pathname='/realtime/v1/websocket';
    url.searchParams.set('apikey',data.publishableKey);url.searchParams.set('vsn','1.0.0');
    const ws=new root.WebSocket(url.href);socket=ws;pulse('connecting');
    return new Promise((resolve,reject)=>{
     let resolved=false;
     const fail=reason=>{if(!resolved){resolved=true;reject(reason);}clear();schedule();};
     ws.onmessage=receive;
     ws.onerror=()=>{if(!joined)fail(err('REALTIME_CONNECTION_FAILED'));};
     ws.onclose=()=>{if(!alive)return;if(!joined&&!resolved)fail(err('REALTIME_CONNECTION_FAILED'));else{clear();pulse('disconnected');schedule();}};
     ws.onopen=async()=>{
      if(!alive||socket!==ws)return;
      try{
       const ref=String(++sequence);joinRef=ref;
       const joinPayload={config:{private:true,broadcast:{ack:true,self:false},presence:{enabled:true,key:userId}},access_token:data.accessToken};
       const result=new Promise((yes,no)=>{
        const timeout=root.setTimeout(()=>{pending.delete(ref);no(err('REALTIME_JOIN_TIMEOUT'));},9000);
        pending.set(ref,{resolve:yes,reject:no,timeout});
       });
       ws.send(JSON.stringify({topic:'realtime:'+topic,event:'phx_join',payload:joinPayload,ref,join_ref:ref}));
       await result;
       if(!alive||socket!==ws)return;
       joined=true;resolved=true;backoff=0;pulse('connected');track();
       heartbeat=root.setInterval(()=>push('heartbeat',{},false,'phoenix').catch(()=>{}),20000);
       authTimer=root.setInterval(()=>renew(),22000);resolve(true);
      }catch(error){try{ws.close();}catch(_){}fail(error);}
     };
    });
   })();
   connectPromise=run;
   try{return await run;}finally{if(connectPromise===run)connectPromise=null;}
  }
  async function broadcast(value){
   if(!joined)await connect();
   if(!value||typeof value!=='object')throw err('REALTIME_PAYLOAD_INVALID');
   if(JSON.stringify(value).length>28000)throw err('REALTIME_PAYLOAD_TOO_LARGE');
   return push('broadcast',{type:'broadcast',event:'call',payload:value},true);
  }
  function stop(){
   alive=false;const ws=socket;
   if(joined&&wsReady())push('presence',{type:'presence',event:'untrack',payload:{}},false).catch(()=>{});
   clear();socket=null;if(ws){ws.onclose=null;ws.onmessage=null;try{ws.close();}catch(_){}}
  }
  return Object.freeze({connect,broadcast,stop,isConnected:()=>joined,presence:()=>[...presences.entries()].map(([key,entries])=>({key,entries}))});
 }
 root.WFCallRealtime=Object.freeze({create});
 if(typeof module==='object'&&module.exports)module.exports={create};
})(globalThis);
