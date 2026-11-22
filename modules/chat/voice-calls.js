/* WOW private voice calls: audio-only WebRTC. All signaling uses revocable WOW sessions.
   TURN is optional and supplied by the server; no raw call media is stored. */
(function(root){
 'use strict';
 if(root.WFVoiceCalls)return;
 const locales=['ar','en','tr','fr','ru'];
 const words={
  call:['اتصال صوتي','Voice call','Sesli arama','Appel vocal','Голосовой звонок'],
  incoming:['مكالمة صوتية واردة','Incoming voice call','Gelen sesli arama','Appel vocal entrant','Входящий звонок'],
  ringing:['جارٍ الاتصال…','Ringing…','Aranıyor…','Sonnerie…','Вызов…'],
  connecting:['جارٍ توصيل الصوت…','Connecting audio…','Ses bağlanıyor…','Connexion audio…','Подключение звука…'],
  connected:['المكالمة متصلة','Call connected','Arama bağlandı','Appel connecté','Звонок подключён'],
  accept:['رد','Answer','Yanıtla','Répondre','Ответить'],
  reject:['رفض','Decline','Reddet','Refuser','Отклонить'],
  end:['إنهاء','End call','Bitir','Terminer','Завершить'],
  mute:['كتم الميكروفون','Mute microphone','Mikrofonu kapat','Couper le micro','Выключить микрофон'],
  unmute:['فتح الميكروفون','Unmute microphone','Mikrofonu aç','Activer le micro','Включить микрофон'],
  play:['تشغيل صوت الطرف الآخر','Play caller audio','Sesi oynat','Lire le son','Включить звук'],
  failed:['تعذّر توصيل المكالمة. تحقق من الشبكة والصلاحيات.','Call connection failed. Check network and permissions.','Arama bağlanamadı. Ağ ve izinleri kontrol edin.','Connexion impossible. Vérifiez le réseau et les permissions.','Не удалось соединиться. Проверьте сеть и разрешения.'],
  microphone:['يلزم السماح بالميكروفون لإجراء المكالمة.','Microphone permission is required for voice calls.','Arama için mikrofon izni gerekir.','Autorisez le microphone pour appeler.','Для звонка нужен доступ к микрофону.'],
  relay:['قد لا ينجح الاتصال على بعض الشبكات حتى يتم إعداد TURN.','Some networks require TURN relay configuration.','Bazı ağlar TURN sunucusu gerektirir.','Certains réseaux nécessitent un relais TURN.','Для некоторых сетей нужен TURN-сервер.'],
  unavailable:['المكالمات الصوتية غير متاحة حاليًا.','Voice calls are currently unavailable.','Sesli arama şu anda kullanılamıyor.','Appel vocal indisponible.','Голосовые звонки недоступны.']
 };
 function mount({container,request,getSession,lang=()=>root.document?.documentElement.lang||'ar'}){
  const doc=container.ownerDocument||root.document;
  const host=doc.createElement('aside'),bar=doc.createElement('div'),audio=doc.createElement('audio');
  host.className='wf-voice-host';bar.className='wf-voice-panel';bar.setAttribute('role','status');bar.setAttribute('aria-live','polite');
  audio.autoplay=true;audio.playsInline=true;audio.hidden=true;host.append(bar,audio);container.append(host);
  let live=true,current=null,mic=null,connection=null,muted=false,cursor='0',pendingIce=[],connecting=false,needsPlay=false,error='';
  let fetching=false,receiving=false,relayReady=true;
  const locale=()=>locales.includes(lang())?lang():'ar';
  const t=key=>words[key][locales.indexOf(locale())];
  const button=(label,handler,style='')=>{
   const node=doc.createElement('button');node.type='button';node.className='btn wf-voice-button '+style;node.textContent=label;
   node.addEventListener('click',()=>{Promise.resolve().then(handler).catch(reason=>{if(live){error=reason?.name==='NotAllowedError'?t('microphone'):t('failed');draw();}});});
   return node;
  };
  function releaseMedia(){
   if(connection){connection.onicecandidate=null;connection.ontrack=null;connection.onconnectionstatechange=null;connection.close();connection=null;}
   if(mic){for(const track of mic.getTracks())track.stop();mic=null;}
   audio.pause?.();audio.srcObject=null;pendingIce=[];muted=false;cursor='0';connecting=false;needsPlay=false;relayReady=true;
  }
  function closeLocal(){releaseMedia();current=null;error='';draw();}
  function draw(){
   if(!live)return;
   bar.replaceChildren();
   if(!current){host.hidden=true;return;}
   host.hidden=false;bar.dir=locale()==='ar'?'rtl':'ltr';
   const title=doc.createElement('div');title.className='wf-voice-heading';
   const caller=current.peerName||'';
   title.textContent=(current.direction==='incoming'&&current.status==='ringing'?t('incoming'):t('call'))+(caller?' · '+caller:'');
   bar.append(title);
   const line=doc.createElement('p');
   line.textContent=error||current.status==='ringing'?error||t('ringing'):
      connection?.connectionState==='connected'?t('connected'):t('connecting');
   bar.append(line);
   const actions=doc.createElement('div');actions.className='wf-voice-controls';
   if(current.direction==='incoming'&&current.status==='ringing'){
    actions.append(button(t('accept'),answer,'wf-voice-accept'),button(t('reject'),()=>finish(true)));
   }else{
    if(current.status==='active'&&mic){
     actions.append(button(muted?t('unmute'):t('mute'),()=>{
      muted=!muted;for(const track of mic.getAudioTracks())track.enabled=!muted;draw();
     }));
    }
    if(needsPlay)actions.append(button(t('play'),async()=>{await audio.play();needsPlay=false;draw();}));
    actions.append(button(t('end'),()=>finish(false)));
   }
   bar.append(actions);
   if(current.status==='active'&&!relayReady){
    const hint=doc.createElement('small');hint.textContent=t('relay');bar.append(hint);
   }
  }
  async function microphone(){
   if(mic)return mic;
   if(!root.navigator?.mediaDevices?.getUserMedia)throw Object.assign(Error('MICROPHONE_UNAVAILABLE'),{name:'NotAllowedError'});
   mic=await root.navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true},video:false});
   if(!live||!current){for(const tr of mic.getTracks())tr.stop();mic=null;throw Error('CALL_ENDED');}
   return mic;
  }
  async function rtc(){
   if(connection)return connection;
   if(!root.RTCPeerConnection)throw Error('WEBRTC_UNSUPPORTED');
   const id=current?.id;if(!id)throw Error('CALL_ENDED');
   const config=await request('call.ice',{callId:id});
   if(!live||current?.id!==id)throw Error('CALL_ENDED');
   relayReady=config.relayReady===true;
   const pc=new root.RTCPeerConnection({iceServers:Array.isArray(config.iceServers)?config.iceServers:[]});
   connection=pc;
   for(const track of (await microphone()).getTracks())pc.addTrack(track,mic);
   pc.ontrack=event=>{
    if(!live||current?.id!==id)return;
    audio.srcObject=event.streams?.[0]||new root.MediaStream([event.track]);
    Promise.resolve(audio.play?.()).catch(()=>{needsPlay=true;draw();});
   };
   pc.onicecandidate=event=>{
    if(!live||current?.id!==id||!event.candidate)return;
    request('call.signal',{callId:id,kind:'ice',payload:event.candidate.toJSON()}).catch(()=>{});
   };
   pc.onconnectionstatechange=()=>{if(!live||current?.id!==id)return;
    if(pc.connectionState==='failed')error=t('failed');
    draw();
   };
   draw();return pc;
  }
  async function start(room){
   if(!live||current||!getSession?.()?.authenticated||room?.kind!=='direct'||!room.peer?.id||
      !root.RTCPeerConnection||!root.navigator?.mediaDevices?.getUserMedia)return;
   current={id:null,roomId:room.id,peerId:room.peer.id,peerName:room.peer.name||room.name||'',direction:'outgoing',status:'ringing'};
   draw();
   try{
    await microphone();
    const result=await request('call.start',{roomId:room.id,targetId:room.peer.id});
    if(!live||!current){if(result?.id)request('call.end',{callId:result.id}).catch(()=>{});return;}
    current={...current,...result};draw();
   }catch(e){closeLocal();throw e;}
  }
  async function answer(){
   const call=current,id=call?.id;
   if(!live||!id||call.direction!=='incoming'||call.status!=='ringing')return;
   await microphone();
   const result=await request('call.accept',{callId:id});
   if(!live||current?.id!==id)return;
   current.status=result.status;await rtc();draw();
  }
  async function finish(rejected){
   const id=current?.id,action=rejected?'call.decline':'call.end';
   closeLocal();if(id)await request(action,{callId:id}).catch(()=>{});
  }
  async function processSignals(){
   if(!live||!current?.id||receiving)return;
   receiving=true;const id=current.id;
   try{
    const data=await request('call.events',{callId:id,after:cursor});
    if(!live||current?.id!==id)return;
    if(!['ringing','active'].includes(data.status)){closeLocal();return;}
    if(data.status==='active'){
     current.status='active';
     // A slower room-list refresh may already have marked this accepted.
     // Negotiation must still start once even after that state transition.
     if(current.direction==='outgoing'&&!connection&&!connecting){
      connecting=true;
      try{
       const pc=await rtc();if(current?.id!==id)return;
       const offer=await pc.createOffer();await pc.setLocalDescription(offer);
       await request('call.signal',{callId:id,kind:'offer',payload:{type:'offer',sdp:offer.sdp}});
      }finally{connecting=false;}
     }
    }
    if(data.status==='active'&&Array.isArray(data.signals)){
     for(const signal of data.signals){
      if(!live||current?.id!==id)break;
      cursor=signal.id;
      if(signal.kind==='ice'){
       if(connection?.remoteDescription)await connection.addIceCandidate(signal.payload).catch(()=>{});
       else pendingIce.push(signal.payload);
      }else if(signal.kind==='offer'&&current.direction==='incoming'){
       const pc=await rtc();await pc.setRemoteDescription(signal.payload);
       for(const candidate of pendingIce.splice(0))await pc.addIceCandidate(candidate).catch(()=>{});
       const answer=await pc.createAnswer();await pc.setLocalDescription(answer);
       await request('call.signal',{callId:id,kind:'answer',payload:{type:'answer',sdp:answer.sdp}});
      }else if(signal.kind==='answer'&&current.direction==='outgoing'&&connection){
       await connection.setRemoteDescription(signal.payload);
       for(const candidate of pendingIce.splice(0))await connection.addIceCandidate(candidate).catch(()=>{});
      }
     }
    }
    draw();
   }catch(e){if(live&&current?.id===id){error=t('failed');draw();}}
   finally{receiving=false;}
  }
  async function poll(){
   if(!live||fetching||!getSession?.()?.authenticated)return;
   fetching=true;
   try{
    const result=await request('call.inbox',{});
    if(!live)return;
    const calls=Array.isArray(result.calls)?result.calls:[];
    if(!current){
     const incoming=calls.find(c=>c?.direction==='incoming'&&c.status==='ringing');
     if(incoming){current=incoming;draw();}
    }else if(current.id){
     const latest=calls.find(c=>c.id===current.id);
     if(!latest){closeLocal();return;}
     if(current.status!==latest.status){current.status=latest.status;draw();}
    }
   }catch(_){/* Keep an ongoing peer connection alive during transient API errors. */}
   finally{fetching=false;}
  }
  const timer=root.setInterval(()=>{if(live&&current?.id&&root.document?.visibilityState!=='hidden')processSignals();},1350);
  function callButton(room){
   const enabled=!!root.RTCPeerConnection&&!!root.navigator?.mediaDevices?.getUserMedia&&!!room?.peer?.id;
   const control=button(t('call'),()=>start(room),'wf-voice-launch');
   control.disabled=!enabled;control.title=enabled?t('call'):t('unavailable');return control;
  }
  host.hidden=true;
  return {callButton,poll,dispose(){if(!live)return;const id=current?.id;live=false;root.clearInterval(timer);
    releaseMedia();host.remove();if(id)request('call.end',{callId:id}).catch(()=>{});},
    updateLanguage(){draw();}};
 }
 root.WFVoiceCalls=Object.freeze({mount});
})(globalThis);
