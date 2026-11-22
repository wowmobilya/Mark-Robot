import {arrayOf,bool,choice,demand,integer,name,privateActions,short,uuid} from './files.mjs';
import {projectDelta} from './delta.mjs';

const id=value=>{demand(typeof value==='string'&&/^[1-9][0-9]{0,17}$/.test(value));return value;};
const optional=(value,fn)=>value==null?null:fn(value);
const emoji=value=>short(value??'',16,true);
const reactions=['👍','❤️','😂','😮','😢','🙏','🎉','🔥','👏','👎',''];
export function createChatActions({moduleRpc,storage,voiceTurn={}}){
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
    send:(a,b)=>rpc(a,'send',{...room(b),requestId:uuid(b.requestId),text:short(b.text??'',8000,true),messageId:optional(b.replyId,id),assetId:optional(b.assetId,uuid)}),
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
  // Voice is scoped to the same verified WOW sessions and direct chat membership.
  // SDP and ICE are temporary private signals; no media passes through this API.
  const voiceContext=actor=>({userId:uuid(actor?.userId),sessionId:uuid(actor?.sessionId)});
  const voiceParams={
    inbox:()=>({}),
    start:body=>({roomId:uuid(body.roomId),targetId:uuid(body.targetId)}),
    accept:body=>({callId:uuid(body.callId)}),
    decline:body=>({callId:uuid(body.callId)}),
    end:body=>({callId:uuid(body.callId)}),
    events:body=>{
      const after=body.after??'0';
      demand(typeof after==='string'&&/^(0|[1-9][0-9]{0,17})$/.test(after),'INVALID_VOICE_REQUEST');
      return {callId:uuid(body.callId),after};
    },
    signal:body=>{
      const kind=choice(body.kind,['offer','answer','ice']),raw=body.payload;
      demand(raw&&typeof raw==='object'&&!Array.isArray(raw),'INVALID_VOICE_SIGNAL');
      let payload;
      if(kind==='ice'){
        demand(typeof raw.candidate==='string'&&raw.candidate.length>0&&raw.candidate.length<=2048,'INVALID_VOICE_SIGNAL');
        demand(raw.sdpMid==null||typeof raw.sdpMid==='string'&&raw.sdpMid.length<=64,'INVALID_VOICE_SIGNAL');
        demand(raw.sdpMLineIndex==null||Number.isSafeInteger(raw.sdpMLineIndex)&&raw.sdpMLineIndex>=0&&raw.sdpMLineIndex<1024,'INVALID_VOICE_SIGNAL');
        payload={candidate:raw.candidate,sdpMid:raw.sdpMid??null,sdpMLineIndex:raw.sdpMLineIndex??null};
      }else{
        demand(raw.type===kind&&typeof raw.sdp==='string'&&raw.sdp.length>0&&raw.sdp.length<=24000,'INVALID_VOICE_SIGNAL');
        payload={type:kind,sdp:raw.sdp};
      }
      return {callId:uuid(body.callId),kind,payload};
    }
  };
  const voiceActions=Object.fromEntries(Object.entries(voiceParams).map(([action,validate])=>
    ['chat.call.'+action,({actor,body})=>moduleRpc('wow_voice_service',action,{...validate(body||{}),...voiceContext(actor)})]));
  voiceActions['chat.call.ice']=async({actor,body})=>{
    const callId=uuid(body?.callId);
    const snapshot=await moduleRpc('wow_voice_service','events',{callId,after:'0',...voiceContext(actor)});
    demand(snapshot?.status==='active','VOICE_CALL_UNAVAILABLE');
    const iceServers=[{urls:['stun:stun.cloudflare.com:3478','stun:stun.l.google.com:19302']}];
    const url=typeof voiceTurn.url==='string'?voiceTurn.url.trim():'',secret=voiceTurn.secret;
    let relayReady=false;
    if(/^turns?:[A-Za-z0-9.-]+(?::[0-9]{2,5})?(?:\?transport=(?:udp|tcp))?$/.test(url)&&
      typeof secret==='string'&&secret.length>=32&&secret.length<=512){
      const expiry=Math.floor(Date.now()/1000)+7500,username=expiry+':'+uuid(actor.userId);
      const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-1'},false,['sign']);
      const bytes=new Uint8Array(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(username)));
      const credential=btoa(String.fromCharCode(...bytes));
      iceServers.push({urls:[url],username,credential});relayReady=true;
    }
    return {iceServers,relayReady,expiresIn:relayReady?7500:0};
  };
  return {...Object.fromEntries(Object.entries(handlers).map(([action,run])=>['chat.'+action,({actor,body})=>run(actor,body)])),...voiceActions};
}
