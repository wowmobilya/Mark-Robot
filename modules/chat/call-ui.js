/* WOW call UI: integrated audio/video calling and separate call-history lane.
   Text messages, chat storage, typing and attachments remain untouched. */
(function(root){
 'use strict';
 if(root.WFChatCallUI)return;
 const locales=['ar','en','tr','fr','ru'];
 const text={
  audio:['اتصال صوتي','Voice call','Sesli ara','Appel vocal','Голосовой звонок'],
  video:['اتصال فيديو','Video call','Görüntülü ara','Appel vidéo','Видеозвонок'],
  inbound:['مكالمة واردة','Incoming call','Gelen arama','Appel entrant','Входящий вызов'],
  ringing:['جارٍ الرنين…','Ringing…','Çalıyor…','Sonnerie…','Вызов…'],
  connected:['متصل','Connected','Bağlandı','Connecté','Соединено'],
  connecting:['جارٍ الاتصال…','Connecting…','Bağlanıyor…','Connexion…','Подключение…'],
  answer:['قبول','Answer','Kabul et','Répondre','Ответить'],
  reject:['رفض','Decline','Reddet','Refuser','Отклонить'],
  end:['إنهاء','Hang up','Bitir','Terminer','Завершить'],
  mic:['كتم الصوت','Mute','Sessize al','Couper micro','Микрофон выкл.'],
  unmic:['تشغيل الميكروفون','Unmute','Mikrofonu aç','Activer micro','Микрофон вкл.'],
  camera:['تشغيل الكاميرا','Camera on','Kamerayı aç','Activer caméra','Камера вкл.'],
  nocamera:['إيقاف الكاميرا','Camera off','Kamerayı kapat','Couper caméra','Камера выкл.'],
  switchVideo:['التحويل إلى فيديو','Switch to video','Videoya geç','Passer en vidéo','Переключить на видео'],
  switchAudio:['صوت فقط','Audio only','Sadece ses','Audio seul','Только аудио'],
  local:['أنت','You','Sen','Vous','Вы'],
  history:['سجل المكالمات','Call history','Arama geçmişi','Historique des appels','История звонков'],
  missed:['مكالمة فائتة','Missed call','Cevapsız','Appel manqué','Пропущен'],
  declined:['مكالمة مرفوضة','Declined call','Reddedildi','Appel refusé','Отклонён'],
  completed:['مكالمة مكتملة','Completed call','Tamamlandı','Appel terminé','Завершён'],
  online:['متصل الآن','Online','Çevrimiçi','En ligne','В сети'],
  offline:['غير متصل','Offline','Çevrimdışı','Hors ligne','Не в сети'],
  failed:['تعذّر الاتصال، تحقّق من الشبكة وصلاحية الميكروفون.','Unable to connect. Check network and microphone permissions.',
    'Bağlantı kurulamadı. Ağ ve mikrofon izinlerini kontrol edin.',
    'Connexion impossible. Vérifiez le réseau et le microphone.','Нет связи. Проверьте сеть и микрофон.'],
  unsupported:['المكالمات تتطلب HTTPS ومتصفحًا يدعم WebRTC.','Calls require HTTPS and WebRTC support.',
    'Aramalar HTTPS ve WebRTC gerektirir.','HTTPS et WebRTC nécessaires.','Нужны HTTPS и WebRTC.'],
  group:['حد المكالمة الجماعية 4 أشخاص','Group calls support up to 4 people',
    'Grup aramaları en fazla 4 kişi','Appels de groupe : 4 personnes maximum','Групповой звонок до 4 человек'],
  play:['تشغيل الصوت','Play audio','Sesi aç','Activer le son','Включить звук'],
  alerts:['تفعيل إشعار المكالمات','Enable call alerts','Arama bildirimlerini aç','Activer les alertes d’appel','Включить уведомления о звонках']
 };
 function mount({container,historyContainer,api,lang=()=>root.document?.documentElement.lang||'ar'}){
  const doc=container.ownerDocument||root.document;
  const layout=doc.createElement('section'),panel=doc.createElement('div'),head=doc.createElement('header');
  const title=doc.createElement('strong'),info=doc.createElement('span'),videos=doc.createElement('div'),actions=doc.createElement('div');
  const note=doc.createElement('p'),history=doc.createElement('section'),historyTitle=doc.createElement('button'),historyList=doc.createElement('div');
  const selfCard=doc.createElement('div'),selfVideo=doc.createElement('video'),selfLabel=doc.createElement('small');
  const remote=new Map();
  layout.className='wf-calling';panel.className='wf-calling-panel';head.className='wf-calling-header';
  videos.className='wf-calling-videos';actions.className='wf-calling-actions';note.className='wf-calling-notice';
  selfCard.className='wf-calling-tile';selfVideo.autoplay=true;selfVideo.muted=true;selfVideo.playsInline=true;
  selfLabel.className='wf-calling-label';selfCard.append(selfVideo,selfLabel);
  panel.append(head,videos,actions,note);head.append(title,info);
  history.className='wf-calling-history';historyTitle.className='wf-calling-history-title';
  historyTitle.type='button';historyList.className='wf-calling-history-list';
  historyTitle.setAttribute('aria-expanded','false');historyList.hidden=true;history.append(historyTitle,historyList);
  layout.append(panel,history);container.append(layout);
  let manager=null,lastState=null,historyRows=[],language='ar',error='',shownRoom=null,presence=[];
  const locale=()=>{const v=typeof lang==='function'?lang():lang;return locales.includes(v)?v:'ar';};
  const t=key=>text[key][locales.indexOf(locale())];let ticking=null;
  const button=(key,action,cls='')=>{
   const b=doc.createElement('button');b.type='button';b.className='btn wf-calling-button '+cls;b.textContent=t(key);
   // Permission requests must start from a trusted user gesture, not a timer.
   b.onclick=()=>{try{Promise.resolve(action()).catch(()=>{error=t('failed');render();});}
    catch(_){error=t('failed');render();}};return b;
  };
  const timestamp=value=>new Date(value||Date.now()).toLocaleString(locale(),{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'});
  const duration=seconds=>String(Math.floor(seconds/60)).padStart(2,'0')+':'+String(seconds%60).padStart(2,'0');
  // In-chat call events: separate visual chips, not synthetic text messages.
  // Existing message IDs, message pagination and chat tables remain unchanged.
  function feedHistory(){
   if(!historyContainer)return;
   historyContainer.querySelector?.('[data-wf-call-history]')?.remove();
   if(!shownRoom||!historyRows.length)return;
   const section=doc.createElement('section');section.dataset.wfCallHistory='true';section.className='wf-chat-call-events';
   section.setAttribute('aria-label',t('history'));
   for(const item of [...historyRows].sort((a,b)=>Date.parse(a.createdAt)-Date.parse(b.createdAt))){
    if(item.roomId!==shownRoom.id)continue;
    const row=doc.createElement('div');row.className='wf-chat-line system wf-chat-call-event';
    const chip=doc.createElement('span');chip.className='wf-chat-call-chip';
    const icon=doc.createElement('span');icon.setAttribute('aria-hidden','true');icon.textContent=item.kind==='video'?'▣':'☎';
    const name=doc.createElement('span');name.textContent=t(item.status==='completed'?'completed':item.status==='declined'?'declined':'missed');
    const time=doc.createElement('small');
    time.textContent=timestamp(item.createdAt)+(item.status==='completed'?' · '+duration(item.durationSeconds||0):'');
    chip.append(icon,name,time);row.append(chip);section.append(row);
   }
   if(section.childElementCount)historyContainer.append(section);
  }
  function displayHistory(){
   historyTitle.textContent=t('history')+' ('+historyRows.length+')';
   historyList.replaceChildren();
   for(const item of historyRows){
    const card=doc.createElement('div'),kind=item.kind==='video'?'video':'audio';
    card.className='wf-calling-history-row';
    const name=doc.createElement('strong');name.textContent=t(item.status==='completed'?'completed':item.status==='declined'?'declined':'missed')+' · '+t(kind);
    const when=doc.createElement('small');when.textContent=timestamp(item.createdAt)+' · '+duration(item.durationSeconds||0);
    card.append(name,when);historyList.append(card);
   }
   history.hidden=!historyRows.length;feedHistory();
  }
  historyTitle.addEventListener('click',()=>{
   historyList.hidden=!historyList.hidden;historyTitle.setAttribute('aria-expanded',String(!historyList.hidden));
  });
  function updateRemote(uid,stream){
   if(!stream){const old=remote.get(uid);if(old){old.video.pause?.();old.video.srcObject=null;old.card.remove();remote.delete(uid);}render();return;}
   let unit=remote.get(uid);
   if(!unit){
    const card=doc.createElement('div'),video=doc.createElement('video'),label=doc.createElement('small');
    card.className='wf-calling-tile';video.autoplay=true;video.playsInline=true;label.className='wf-calling-label';
    card.append(video,label);unit={card,video,label};remote.set(uid,unit);
   }
   if(unit.video.srcObject!==stream){unit.video.srcObject=stream;
    Promise.resolve(unit.video.play()).catch(()=>{unit.playBlocked=true;render();});}
   unit.label.textContent=lastState?.call?.participants?.find(x=>x.id===uid)?.name||uid.slice(0,8);render();
  }
  function render(){
   language=locale();displayHistory();const state=lastState;const c=state?.call;
   panel.hidden=!c;layout.classList.toggle('wf-calling-active',!!c);if(!c){for(const [id,item] of remote){item.video.srcObject=null;item.card.remove();remote.delete(id);}return;}
   title.textContent=(c.status==='ringing'&&c.callerId!==api.getSession?.()?.userId?t('inbound'):t(c.kind==='video'?'video':'audio'));
   info.textContent=c.status==='ringing'?t('ringing'):t('connecting');
   if(c.status==='active'&&c.startedAt)info.textContent=t('connected')+' · '+duration(Math.max(0,Math.floor((Date.now()-Date.parse(c.startedAt))/1000)));
   videos.replaceChildren();
   if(state.localStream){
    selfVideo.srcObject=state.localStream;selfLabel.textContent=t('local');
    selfCard.hidden=!state.localStream.getVideoTracks().some(track=>track.enabled&&track.readyState==='live');
    if(!selfCard.hidden)videos.append(selfCard);
   }
   for(const item of remote.values()){const track=item.video.srcObject?.getVideoTracks?.()[0];
    item.video.hidden=!(track&&track.readyState==='live'&&track.enabled);videos.append(item.card);}
   actions.replaceChildren();
   const myId=api.getSession?.()?.userId;
   const membership=c.participants?.find(p=>p.id===myId);
   if(c.status==='ringing'&&membership?.status==='invited'){
    actions.append(button('answer',()=>manager.accept(),'wf-calling-accept'),button('reject',()=>manager.decline(),'wf-calling-danger'));
   }else{
    if(c.status==='active'){
     actions.append(button(state.muted?'unmic':'mic',()=>manager.micToggle()));
     actions.append(button(state.localStream?.getVideoTracks().some(tr=>tr.enabled)?'nocamera':'camera',()=>manager.cameraToggle()));
     actions.append(button('switchAudio',()=>manager.switchMode('audio')),button('switchVideo',()=>manager.switchMode('video')));
    }
    actions.append(button('end',()=>manager.finish(c.callerId===myId),'wf-calling-danger'));
   }
   for(const item of remote.values())if(item.playBlocked){
    actions.append(button('play',async()=>{await item.video.play();item.playBlocked=false;render();}));
   }
   note.textContent=error;note.hidden=!error;panel.dir=language==='ar'?'rtl':'ltr';
  }
  let enabled=!!root.isSecureContext&&!!root.RTCPeerConnection&&!!root.navigator?.mediaDevices?.getUserMedia;
  try{
   if(enabled)manager=root.WFCallManager.create({api,
    onState:s=>{lastState=s;render();},
    onRemote:updateRemote,
    onPresence:values=>{presence=values;},
    onHistory:rows=>{historyRows=rows;displayHistory();},
    onError:()=>{error=t('failed');render();}
   });
  }catch(_){enabled=false;}
  function controls(room){
   const wrapper=doc.createElement('span');wrapper.className='wf-calling-shortcuts';
   if(!room||!['direct','group'].includes(room.kind)||!api.can?.('chat.edit'))return wrapper;
   for(const kind of ['audio','video']){
    const key=kind==='video'?'video':'audio';
    const control=button(key,()=>{error='';return manager.start(room,kind);},'wf-calling-start wf-calling-icon');
    control.textContent='';
    control.setAttribute('aria-label',t(key));
    control.innerHTML=kind==='video'
      ?'<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="13" height="14" rx="3"/><path d="m16 10 5-3v10l-5-3"/></svg>'
      :'<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16.5v3a2 2 0 0 1-3.3 2.2A20 20 0 0 1 2.3 6.3 2 2 0 0 1 4.5 3h3a2 2 0 0 1 2 1.5l.8 2.9a2 2 0 0 1-.6 2L8 11a16 16 0 0 0 5 5l1.6-1.7a2 2 0 0 1 2-.6l2.9.8a2 2 0 0 1 1.5 2Z"/></svg>';
    control.disabled=!enabled||!!lastState?.call;
    control.title=enabled?t(key):t('unsupported');wrapper.append(control);
   }
   const push=root.WFPush;
   if(push?.getSnapshot?.()?.status==='ready'){
    const toggle=button('alerts',()=>push.enable(),'wf-calling-start wf-calling-icon');
    toggle.textContent='';toggle.setAttribute('aria-label',t('alerts'));toggle.title=t('alerts');
    toggle.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4M12 2v2"/></svg>';
    wrapper.append(toggle);
   }
   return wrapper;
  }
  async function selectRoom(room){
   shownRoom=room;historyRows=[];displayHistory();
   if(manager)await manager.selectRoom(room).catch(()=>{});
  }
  if(manager){
   const tick=()=>{if(doc.visibilityState==='visible'||lastState?.call?.status==='active')manager.poll().catch(()=>{});if(lastState?.call)render();};
   ticking=root.setInterval(tick,3500);manager.poll().catch(()=>{});
  }
  render();
  return Object.freeze({controls,selectRoom,renderHistoryInFeed:feedHistory,refresh:()=>manager?.poll(),
   hasActiveCall:()=>!!lastState?.call,updateLanguage:render,
   dispose(){if(ticking)root.clearInterval(ticking);manager?.stop();historyContainer?.querySelector?.('[data-wf-call-history]')?.remove();layout.remove();}});
 }
 root.WFChatCallUI=Object.freeze({mount});
})(globalThis);
