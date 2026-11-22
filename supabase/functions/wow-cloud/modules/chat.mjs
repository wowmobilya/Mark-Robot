import {arrayOf,bool,choice,demand,integer,name,privateActions,short,uuid} from './files.mjs';
import {projectDelta} from './delta.mjs';

const id=value=>{demand(typeof value==='string'&&/^[1-9][0-9]{0,17}$/.test(value));return value;};
const optional=(value,fn)=>value==null?null:fn(value);
const emoji=value=>short(value??'',16,true);
const reactions=['👍','❤️','😂','😮','😢','🙏','🎉','🔥','👏','👎',''];
export function turnConfiguration(voiceTurn={}){
    const urlText=typeof voiceTurn.urls==='string'?voiceTurn.urls:voiceTurn.url||'';
    const urls=String(urlText).split(',').map(s=>s.trim()).filter(s=>
      /^turns?:[A-Za-z0-9.-]+(?::[0-9]{2,5})?(?:\?transport=(?:udp|tcp))?$/.test(s)).slice(0,4);
    const secret=voiceTurn.secret;
    const sharedSecret=typeof secret==='string'&&secret.length>=32&&secret.length<=512?secret:null;
    const {cloudflareKeyId,cloudflareToken}=voiceTurn;
    const managed=typeof cloudflareKeyId==='string'&&/^[a-f0-9]{32}$/i.test(cloudflareKeyId)&&
      typeof cloudflareToken==='string'&&/^[A-Za-z0-9._~-]{32,512}$/.test(cloudflareToken);
    return {urls,secret:sharedSecret,managed,configured:managed||!!(urls.length&&sharedSecret)};
}
const relayLifetime=7200;
async function managedRelay(voiceTurn,fetchImpl){
  // Only the joined participant receives the ephemeral credentials. Never return a provider error body.
  const endpoint='https://rtc.live.cloudflare.com/v1/turn/keys/'+voiceTurn.cloudflareKeyId+'/credentials/generate-ice-servers';
  try{
    const response=await fetchImpl(endpoint,{method:'POST',redirect:'error',signal:AbortSignal.timeout(4000),
      headers:{Authorization:'Bearer '+voiceTurn.cloudflareToken,'Content-Type':'application/json'},
      body:JSON.stringify({ttl:relayLifetime})});
    if(!response.ok)return [];
    const {iceServers}=await response.json();
    if(!Array.isArray(iceServers))return [];
    return iceServers.slice(0,8).flatMap(server=>{
      const {username,credential}=server||{};
      if(!username||!credential||typeof username!=='string'||typeof credential!=='string')return [];
      const values=Array.isArray(server.urls)?server.urls:[server.urls];
      const urls=values.filter(url=>typeof url==='string'&&/^turns?:turn\.cloudflare\.com:(3478|443|80|5349)\?transport=(udp|tcp)$/.test(url));
      return urls.length?[{urls,username,credential}]:[];
    });
  }catch{return [];}
}
export function createChatActions({moduleRpc,storage,voiceTurn={},fetchImpl=fetch}){
  const {rpc,sign,upload,collect}=privateActions('chat',moduleRpc,storage);
  const room=b=>({roomId:uuid(b.roomId)});
  const message=b=>({...room(b),messageId:id(b.messageId)});
  const group=b=>({name:name(b.name,100),description:short(b.description??'',500,true),emoji:emoji(b.emoji)});
  const handlers={
    init:async(a)=>{const me=await rpc(a,'init');await collect(a).catch(()=>{});return me;},
    rooms:async(a,b)=>projectDelta(await rpc(a,'rooms'),'rooms',b._known),
    people:(a,b)=>rpc(a,'people',{query:short(b.query??'',100,true),offset:integer(b.offset??0,0,100000),staffOnly:bool(b.staffOnly??false)}),
    profile:(a,b)=>rpc(a,'profile',{name:short(b.name??'',100,true),status:short(b.status??'',160,true),assetId:optional(b.assetId,uuid)}),
    group:(a,b)=>rpc(a,'group',{...group(b),members:b.members?.length?arrayOf(b.members,uuid,98):[]}),
    direct:(a,b)=>rpc(a,'direct',{targetId:uuid(b.targetId)}),
    feed:async(a,b)=>projectDelta(await rpc(a,'feed',{...room(b),before:optional(b.before,id),query:short(b.query??'',160,true),starred:bool(b.starred??false),
      mentioned:bool(b.mentioned??false),kind:optional(b.kind,v=>choice(v,['image','video','audio','files','links']))}),'messages',b._known),
    members:(a,b)=>rpc(a,'members',room(b)),
    member:(a,b)=>rpc(a,'member',{...room(b),targetId:uuid(b.targetId),operation:choice(b.operation,['add','remove','ban','unban','promote','demote'])}),
    'room.update':(a,b)=>rpc(a,'room.update',{...room(b),...group(b),assetId:optional(b.assetId,uuid)}),
    'room.delete':(a,b)=>rpc(a,'room.delete',room(b)),
    send:(a,b)=>rpc(a,'send',{...room(b),requestId:uuid(b.requestId),text:short(b.text??'',8000,true),messageId:optional(b.replyId,id),assetId:optional(b.assetId,uuid),...(b.fileId?{fileId:uuid(b.fileId)}:{})}),
    sendFile:async(a,b)=>{
      const roomId=uuid(b.roomId),requestId=uuid(b.requestId),text=short(b.text??'',8000,true),messageId=optional(b.replyId,id);
      const uploaded=await upload(a,b,()=>({roomId,purpose:'message'}));
      return rpc(a,'send',{roomId,requestId,text,messageId,assetId:uuid(uploaded.asset.id)});
    },
    edit:(a,b)=>rpc(a,'edit',{...message(b),text:short(b.text??'',8000,true)}),
    delete:(a,b)=>rpc(a,'delete',message(b)),
    hide:(a,b)=>rpc(a,'hide',message(b)),
    forward:(a,b)=>rpc(a,'forward',{...message(b),sourceRoomId:uuid(b.sourceRoomId),requestId:uuid(b.requestId)}),
    info:(a,b)=>rpc(a,'info',message(b)),
    react:(a,b)=>rpc(a,'react',{...message(b),emoji:choice(b.emoji,reactions)}),
    star:(a,b)=>rpc(a,'star',{...message(b),active:bool(b.active)}),
    typing:(a,b)=>rpc(a,'typing',{...room(b),typing:bool(b.typing)}),
    read:(a,b)=>rpc(a,'read',message(b)),
    draft:(a,b)=>rpc(a,'draft',{...room(b),text:short(b.text??'',8000,true)}),
    prefs:(a,b)=>{
      const data=room(b);
      if(b.muted!==undefined)data.muted=bool(b.muted);
      if(b.archived!==undefined)data.archived=bool(b.archived);
      if(b.disappearing!==undefined)data.disappearing=choice(b.disappearing,['off','24h','7d','30d']);
      if(b.wallpaper!==undefined){data.wallpaper=choice(b.wallpaper,['plain','cool','warm','custom']);data.assetId=data.wallpaper==='custom'?uuid(b.assetId):null;}
      return rpc(a,'prefs',data);
    },
    clear:(a,b)=>rpc(a,'clear',room(b)),
    upload:(a,b)=>upload(a,b,meta=>{
      const purpose=choice(b.purpose??'message',['message','wallpaper','profile','room']);
      if(purpose!=='message')demand(meta.kind==='image','INVALID_MEDIA');
      return {roomId:purpose==='profile'?null:uuid(b.roomId),purpose};
    }),
    asset:(a,b)=>{
      const purpose=choice(b.purpose??'message',['message','room','profile','wallpaper']);
      return sign(a,'asset.open',purpose==='profile'?{purpose,targetId:uuid(b.targetId)}:{...room(b),purpose,...(purpose==='message'?{messageId:id(b.messageId)}:{})});
    }
  };
  // Authenticated REST RPCs manage authoritative call lifecycle. Realtime
  // Broadcast/Presence carries ephemeral SDP/ICE; the server never stores them.
  const callContext=actor=>({userId:uuid(actor?.userId),sessionId:uuid(actor?.sessionId)});
  const callValidators={
    start:body=>({roomId:uuid(body.roomId),kind:choice(body.kind,['audio','video'])}),
    inbox:()=>({}),
    status:body=>({callId:uuid(body.callId)}),
    accept:body=>({callId:uuid(body.callId)}),
    decline:body=>({callId:uuid(body.callId)}),
    end:body=>({callId:uuid(body.callId)}),
    leave:body=>({callId:uuid(body.callId)}),
    heartbeat:body=>({callId:uuid(body.callId)}),
    connected:body=>({callId:uuid(body.callId)}),
    history:body=>({roomId:uuid(body.roomId)})
  };
  const voiceActions=Object.fromEntries(Object.entries(callValidators).map(([action,normalize])=>
    ['chat.call.'+action,({actor,body})=>moduleRpc('wow_voice_service',action,{...normalize(body||{}),...callContext(actor)})]));
  voiceActions['chat.call.ice']=async({actor,body})=>{
    const callId=uuid(body?.callId);
    const snapshot=await moduleRpc('wow_voice_service','status',{callId,...callContext(actor)});
    if(snapshot.status!=='active'||!snapshot.participants?.some(p=>p.id===actor.userId&&p.status==='joined'))
      demand(false,'VOICE_CALL_UNAVAILABLE');
    const iceServers=[{urls:['stun:stun.cloudflare.com:3478','stun:stun.l.google.com:19302']}];
    const {urls,secret,managed}=turnConfiguration(voiceTurn);
    if(urls.length && secret){
      const expiry=Math.floor(Date.now()/1000)+relayLifetime,username=expiry+':'+uuid(actor.userId);
      const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-1'},false,['sign']);
      const bytes=new Uint8Array(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(username)));
      const credential=btoa(String.fromCharCode(...bytes));
      iceServers.push({urls,username,credential});
    }
    if(managed)iceServers.push(...await managedRelay(voiceTurn,fetchImpl));
    return {iceServers,relayReady:iceServers.length>1,expiresIn:iceServers.length>1?relayLifetime:0};
  };
  return {...Object.fromEntries(Object.entries(handlers).map(([action,run])=>['chat.'+action,({actor,body})=>run(actor,body)])),...voiceActions};
}
