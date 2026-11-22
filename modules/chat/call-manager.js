/* Standalone WOW callManager: WebRTC mesh (max 4) + private Supabase
   Realtime Broadcast/Presence. No changes to existing chat messages. */
(function(root){
 'use strict';
 if(root.WFCallManager)return;
 const UUID=/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
 const fail=code=>Object.assign(new Error(code),{code});
 const valid=id=>typeof id==='string'&&UUID.test(id);
 const videoLimits={width:{ideal:640,max:960},height:{ideal:360,max:540},frameRate:{ideal:15,max:24}};
 function create({api,invitation,onState=()=>{},onRemote=()=>{},onPresence=()=>{},onHistory=()=>{},onError=()=>{}}){
  if(!api?.realtimeCredentials||!root.WFCallRealtime||!root.RTCPeerConnection)throw fail('CALLS_UNSUPPORTED');
  let alive=true,room=null,channel=null,callChannel=null,call=null,local=null,ice=null,muted=false;
  let peers=new Map(),joining=false,busy=false,polling=false,mediaToken=0,heartAt=0,connectedAck=false;
  const getMe=()=>api.getSession?.()?.userId||api.getSession?.()?.currentAccount?.id;
  const me=getMe();
  if(!valid(me))throw fail('CALLS_AUTH_REQUIRED');
  let notified=valid(invitation?.roomId)&&valid(invitation?.callId)?invitation:null;
  const request=(name,data={})=>api.request('chat.call.'+name,data);
  const emit=()=>{if(alive)onState({call,muted,localStream:local,peers:[...peers.keys()],busy});};
  const message=err=>{if(alive)onError(err?.code||err?.name||'CALL_FAILED');};
  const channelFor=(topic,onBroadcast,onPres)=>root.WFCallRealtime.create({
    topic,credentials:()=>api.realtimeCredentials(),onBroadcast,onPresence:onPres||(()=>{}),
    onStatus:state=>{if(state==='denied'&&call)finish(false).catch(()=>{});}
  });
  function disconnectPeer(uid,p){
   peers.delete(uid);
   p.pc.onnegotiationneeded=null;p.pc.onicecandidate=null;p.pc.ontrack=null;p.pc.onconnectionstatechange=null;
   try{p.pc.close();}catch(_){}onRemote(uid,null);
  }
  function cleanup(){
   mediaToken++;
   for(const [uid,p] of peers)disconnectPeer(uid,p);
   if(local){for(const tr of local.getTracks())tr.stop();local=null;}
   callChannel?.stop();callChannel=null;call=null;ice=null;muted=false;connectedAck=false;heartAt=0;busy=false;emit();
  }
  const callValid=c=>c&&valid(c.id)&&valid(c.roomId)&&['ringing','active'].includes(c.status);
  function accepted(c){return c?.participants?.filter(p=>p.status==='joined'&&valid(p.id))||[];}
  function incoming(c){return c?.callerId!==me&&!c.participants?.some(p=>p.id===me&&p.status==='joined');}
  async function fetchHistory(){
   if(!room||!alive)return;const id=room.id;
   try{const response=await request('history',{roomId:id});if(alive&&room?.id===id)onHistory(response.history||[]);}catch(_){}
  }
  async function joinRoom(next){
   if(!alive)return;
   const id=next?.id;
   if(room?.id===id)return;
   channel?.stop();channel=null;room=next||null;
   onPresence([]);onHistory([]);if(!room||!valid(room.id))return;
   channel=channelFor('wow-call-room:'+room.id,data=>{
    if(data?.callId&&valid(data.callId)&&['ring','accept','decline','end','leave'].includes(data.type))
      poll().catch(message);
   },states=>{if(alive)onPresence(states.map(x=>({id:x.key,online:true})));});
   await channel.connect().catch(message);
   fetchHistory();
  }
  async function publishRoom(type,c=call){
   if(!c||!channel||room?.id!==c.roomId)return;
   await channel.broadcast({type,callId:c.id,roomId:c.roomId}).catch(()=>{});
  }
  async function openCallChannel(){
   if(!call||call.status!=='active'||callChannel||!local)return;
   const callId=call.id;
   callChannel=channelFor('wow-call:'+callId,payload=>signal(payload).catch(message),()=>{
    if(alive&&call?.id===callId)syncPeers().catch(message);
   });
   try{
    await callChannel.connect();
    if(!alive||call?.id!==callId)return;
    await callChannel.broadcast({type:'hello',callId,from:me});
    await syncPeers();
   }catch(error){callChannel?.stop();callChannel=null;message(error);}
  }
  async function sendSignal(to,data){
   if(!callChannel||!call?.id||!callChannel.isConnected())throw fail('REALTIME_DISCONNECTED');
   return callChannel.broadcast({type:'signal',callId:call.id,from:me,to,...data});
  }
  async function buildPeer(peerId){
   if(!call||!callChannel?.isConnected()||!local||!valid(peerId)||peerId===me)return null;
   if(peers.has(peerId))return peers.get(peerId);
   if(peers.size>=3)throw fail('VOICE_GROUP_LIMIT');
   if(!accepted(call).some(p=>p.id===peerId))return null;
   const token=mediaToken,callId=call.id;
   const result=ice||await request('ice',{callId});
   if(!alive||token!==mediaToken||call?.id!==callId||!accepted(call).some(p=>p.id===peerId))return null;
   if(peers.has(peerId))return peers.get(peerId);
   ice=result;
   const conf={iceServers:ice.iceServers||[]};
   const pc=new root.RTCPeerConnection(conf);
   const peer={pc,polite:me.localeCompare(peerId)>0,makingOffer:false,ignoreOffer:false,
    answerPending:false,pending:[],retry:false,ready:false};
   peers.set(peerId,peer);
   pc.onicecandidate=event=>{
    if(!event.candidate||token!==mediaToken||call?.id!==callId)return;
    sendSignal(peerId,{candidate:event.candidate.toJSON()}).catch(message);
   };
   pc.ontrack=event=>{if(!alive||!call)return;
    const stream=event.streams?.[0]||new root.MediaStream([event.track]);
    onRemote(peerId,stream);
   };
   pc.onconnectionstatechange=()=>{
    if(!alive||!call)return;
    if(pc.connectionState==='connected'){
     peer.ready=true;if(!connectedAck){connectedAck=true;request('connected',{callId:call.id}).catch(()=>{});}
     emit();
    }else if(pc.connectionState==='failed'&&!peer.retry){
     peer.retry=true;try{pc.restartIce?.();}catch(_){}
    }else if(pc.connectionState==='closed'){onRemote(peerId,null);}
   };
   pc.onnegotiationneeded=async()=>{
    try{
     if(!alive||!call||!callChannel?.isConnected())return;
     peer.makingOffer=true;
     await pc.setLocalDescription();
     if(pc.localDescription)await sendSignal(peerId,{description:{type:pc.localDescription.type,sdp:pc.localDescription.sdp}});
    }catch(error){message(error);}finally{peer.makingOffer=false;}
   };
   for(const tr of local.getTracks())pc.addTrack(tr,local);
   emit();return peer;
  }
  async function syncPeers(){
   if(!call||call.status!=='active'||!callChannel?.isConnected()||!local)return;
   const present=callChannel.presence();
   const online=new Set(present.map(p=>p.key));
   // Presence is advisory only. SQL decides actual call membership.
   for(const p of accepted(call))if(p.id!==me&&online.has(p.id)){
    const peer=await buildPeer(p.id);
    if(peer?.pc.signalingState==='have-local-offer'&&peer.pc.localDescription){
     await sendSignal(p.id,{description:{type:'offer',sdp:peer.pc.localDescription.sdp}}).catch(()=>{});
    }
   }
  }
  async function signal(frame){
   if(!frame||frame.type!=='signal'||!call||frame.callId!==call.id||
     frame.to!==me||!valid(frame.from)||frame.from===me||
     !accepted(call).some(p=>p.id===frame.from))return;
   const peer=await buildPeer(frame.from);if(!peer)return;
   const pc=peer.pc;
   try{
    if(frame.description){
     const description=frame.description;
     if(!['offer','answer'].includes(description.type)||typeof description.sdp!=='string'||description.sdp.length>24000)return;
     const collision=description.type==='offer'&&(peer.makingOffer||pc.signalingState!=='stable');
     peer.ignoreOffer=!peer.polite&&collision;if(peer.ignoreOffer)return;
     peer.answerPending=description.type==='answer';
     await pc.setRemoteDescription(description);
     peer.answerPending=false;
     for(const candidate of peer.pending.splice(0))await pc.addIceCandidate(candidate).catch(()=>{});
     if(description.type==='offer'){
      await pc.setLocalDescription();
      await sendSignal(frame.from,{description:{type:'answer',sdp:pc.localDescription.sdp}});
     }
    }else if(frame.candidate){
     const c=frame.candidate;
     if(typeof c.candidate!=='string'||c.candidate.length>2048||
       (c.sdpMid!=null&&typeof c.sdpMid!=='string')||
       (c.sdpMLineIndex!=null&&(!Number.isInteger(c.sdpMLineIndex)||c.sdpMLineIndex<0)))return;
     if(pc.remoteDescription)await pc.addIceCandidate(c).catch(e=>{if(!peer.ignoreOffer)throw e;});
     else if(peer.pending.length<80)peer.pending.push(c);
    }
   }catch(error){message(error);}
  }
  async function acquire(kind,token){
   if(!root.navigator?.mediaDevices?.getUserMedia)throw fail('MICROPHONE_UNAVAILABLE');
   const stream=await root.navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true},
    video:kind==='video'?videoLimits:false});
   if(!alive||mediaToken!==token){for(const tr of stream.getTracks())tr.stop();throw fail('CALL_CANCELLED');}
   local=stream;emit();return stream;
  }
  async function start(target,kind='audio'){
   if(!alive||call||busy||!target||!valid(target.id)||!['audio','video'].includes(kind))throw fail('CALL_BUSY');
   if(!root.isSecureContext||!root.navigator?.mediaDevices?.getUserMedia)throw fail('CALLS_HTTPS_REQUIRED');
   busy=true;const token=++mediaToken;emit();
   try{
    await acquire(kind,token);
    const row=await request('start',{roomId:target.id,kind});
    if(!alive||token!==mediaToken){
     if(valid(row?.id))await request('end',{callId:row.id}).catch(()=>{});
     throw fail('CALL_CANCELLED');
    }
    call={...row,kind};busy=false;emit();await publishRoom('ring');
    if(room?.id!==row.roomId)poll().catch(()=>{});
    return row;
   }catch(error){if(token===mediaToken){cleanup();message(error);}throw error;}
  }
  async function accept(){
   if(!callValid(call)||!call.participants?.some(p=>p.id===me&&p.status==='invited')||busy)return;
   if(!root.isSecureContext)throw fail('CALLS_HTTPS_REQUIRED');
   busy=true;const cid=call.id,token=++mediaToken;emit();
   try{
    await acquire(call.kind,token);
    const row=await request('accept',{callId:cid});
    if(!alive||call?.id!==cid||token!==mediaToken){
     await request('leave',{callId:cid}).catch(()=>{});throw fail('CALL_CANCELLED');
    }
    call=row;busy=false;emit();await publishRoom('accept');await openCallChannel();
   }catch(error){
    if(token===mediaToken){
     // Keep the invitation available if permission was declined before acceptance.
     if(!local&&call?.id===cid){busy=false;emit();}else cleanup();
     message(error);
    }
    throw error;
   }
  }
  async function decline(){
   const row=call;if(!row)return;cleanup();
   await request('decline',{callId:row.id}).catch(message);await publishRoom('decline',row);fetchHistory();
  }
  async function finish(all=false){
   const row=call;if(!row)return;cleanup();
   await request(all||row.callerId===me?'end':'leave',{callId:row.id}).catch(message);
   await publishRoom('end',row);fetchHistory();
  }
  async function refreshCall(){
   if(!call||busy)return;const cid=call.id;
   try{
    const row=await request('status',{callId:cid});
    if(!alive||call?.id!==cid)return;
    if(!callValid(row)||!row.participants?.some(p=>p.id===me&&['invited','joined'].includes(p.status))){cleanup();fetchHistory();return;}
    call=row;
    const joined=new Set(accepted(row).map(p=>p.id));
    for(const [uid,peer] of peers)if(!joined.has(uid))disconnectPeer(uid,peer);
    emit();
    if(call.status==='active'&&local)await openCallChannel();
    if(local&&call.status==='active'&&Date.now()-heartAt>14000){
     heartAt=Date.now();request('heartbeat',{callId:cid}).catch(message);
    }
   }catch(error){
    if(call?.id===cid&&([401,403].includes(error?.status)||['AUTH_REQUIRED','SESSION_EXPIRED','SESSION_REVOKED','ACCESS_DENIED','VOICE_CALL_UNAVAILABLE'].includes(error?.code)))cleanup();
    message(error);
   }
  }
  async function poll(){
   if(!alive||polling||busy)return;
   const session=api.getSession?.();
   if(!session?.authenticated||getMe()!==me){if(call||local)cleanup();return;}
   polling=true;
   try{
    if(call)await refreshCall();
    else if(notified){
     const target=notified;
     const row=await request('status',{callId:target.callId});
     notified=null;
     if(alive&&!call&&api.getSession?.()?.authenticated&&getMe()===me&&callValid(row)&&
       row.id===target.callId&&row.roomId===target.roomId&&row.callerId!==me&&row.participants?.some(p=>p.id===me&&p.status==='invited')){
      call=row;emit();
     }
    }else{
     const result=await request('inbox');
     if(!alive||call)return;
     const requestCall=(result.calls||[]).find(c=>c.participantStatus==='invited'&&c.callerId!==me);
     if(requestCall){
      const row=await request('status',{callId:requestCall.id});
      if(!alive||call||!callValid(row))return;
      call=row;emit();
     }
    }
   }catch(error){
    if(notified&&([401,403,404].includes(error?.status)||['ACCESS_DENIED','VOICE_CALL_UNAVAILABLE'].includes(error?.code)))notified=null;
    message(error);
   }finally{polling=false;}
  }
  function micToggle(){
   if(!local)return false;muted=!muted;
   for(const tr of local.getAudioTracks())tr.enabled=!muted;emit();return !muted;
  }
  async function cameraToggle(){
   if(!call||!local||!root.navigator?.mediaDevices?.getUserMedia)throw fail('CALLS_UNSUPPORTED');
   const track=local.getVideoTracks()[0];
   if(track&&track.readyState!=='ended'&&track.enabled){
    track.enabled=false;emit();return false;
   }
   if(track&&track.readyState!=='ended'){track.enabled=true;emit();return true;}
   const token=mediaToken;
   const stream=await root.navigator.mediaDevices.getUserMedia({video:videoLimits,audio:false});
   if(!alive||!call||token!==mediaToken){stream.getTracks().forEach(t=>t.stop());throw fail('CALL_CANCELLED');}
   const next=stream.getVideoTracks()[0];local.addTrack(next);
   for(const p of peers.values()){
    const sender=p.pc.getSenders().find(s=>s.track?.kind==='video');
    if(sender)await sender.replaceTrack(next);
    else p.pc.addTrack(next,local);
   }
   emit();return true;
  }
  async function switchMode(kind){
   if(!['audio','video'].includes(kind)||!call)return;
   if(kind==='video'&&!local?.getVideoTracks().some(t=>t.readyState==='live'&&t.enabled))await cameraToggle();
   if(kind==='audio'&&local?.getVideoTracks().some(t=>t.enabled))await cameraToggle();
  }
  function stop(){
   alive=false;channel?.stop();channel=null;
   const prev=call;cleanup();
   if(prev&&(prev.callerId===me||accepted(prev).some(p=>p.id===me)))request(prev.callerId===me?'end':'leave',{callId:prev.id}).catch(()=>{});
  }
  emit();
  return Object.freeze({selectRoom:joinRoom,start,accept,decline,finish,poll,micToggle,cameraToggle,switchMode,stop,
   getState:()=>({call,muted,localStream:local,peers:[...peers.keys()],busy})});
 }
 root.WFCallManager=Object.freeze({create});
 if(typeof module==='object'&&module.exports)module.exports={create};
})(globalThis);
