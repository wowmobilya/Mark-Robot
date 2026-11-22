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
  minimize:['تصغير المكالمة','Minimize call','Aramayı küçült','Réduire l’appel','Свернуть звонок'],
  restore:['فتح شاشة المكالمة','Return to call','Aramaya dön','Revenir à l’appel','Вернуться к звонку'],
  joined:['انضمّ','Joined','Katıldı','En ligne','В звонке'],
  participants:['المشاركون','Participants','Katılımcılar','Participants','Участники'],
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
  callback:['معاودة الاتصال','Call back','Geri ara','Rappeler','Перезвонить'],
  alertOptions:['تنبيهات المكالمات على هذا الجهاز','Call alerts on this device','Bu cihazdaki arama bildirimleri','Alertes d’appel sur cet appareil','Уведомления о звонках на устройстве'],
  alerts:['تفعيل إشعار المكالمات','Enable call alerts','Arama bildirimlerini aç','Activer les alertes d’appel','Включить уведомления о звонках']
 };
 function mount({container,historyContainer,api,invitation,lang=()=>root.document?.documentElement.lang||'ar'}){
  const doc=container.ownerDocument||root.document;
  const layout=doc.createElement('section'),panel=doc.createElement('dialog'),head=doc.createElement('header');
  const avatar=doc.createElement('div'),kindLabel=doc.createElement('small'),stage=doc.createElement('div'),problem=doc.createElement('p');
  const title=doc.createElement('strong'),info=doc.createElement('span'),videos=doc.createElement('div'),actions=doc.createElement('div');
  const note=doc.createElement('p'),history=doc.createElement('section'),historyTitle=doc.createElement('button'),historyList=doc.createElement('div');
  const selfCard=doc.createElement('div'),selfVideo=doc.createElement('video'),selfLabel=doc.createElement('small');
  const remote=new Map();
  layout.className='wf-calling';panel.className='wf-calling-panel';head.className='wf-calling-header';
  videos.className='wf-calling-videos';actions.className='wf-calling-actions';note.className='wf-calling-notice';
  selfCard.className='wf-calling-tile wf-call-preview';selfVideo.autoplay=true;selfVideo.muted=true;selfVideo.playsInline=true;
  selfLabel.className='wf-calling-label';selfCard.append(selfVideo,selfLabel);
  panel.setAttribute('aria-labelledby','wf-call-person');title.id='wf-call-person';
  let minimized=false,presentedId=null;
  const collapse=doc.createElement('button'),bar=doc.createElement('section'),restore=doc.createElement('button'),compactMic=doc.createElement('button'),compactEnd=doc.createElement('button');
  collapse.type=restore.type=compactMic.type=compactEnd.type='button';collapse.className='wf-call-collapse';bar.className='wf-call-restore';bar.hidden=true;
  bar.append(restore,compactMic,compactEnd);
  collapse.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2"><path d="m5 9 7 7 7-7"/></svg>';
  collapse.onclick=()=>{minimized=true;render();restore.focus({preventScroll:true});};
  restore.onclick=()=>{minimized=false;render();collapse.focus({preventScroll:true});};
  compactMic.onclick=()=>manager?.micToggle();
  compactEnd.onclick=()=>{const c=lastState?.call;if(!c)return;
   const invited=c.participants?.some(p=>p.id===api.getSession?.()?.userId&&p.status==='invited');
   Promise.resolve(invited?manager.decline():manager.finish(c.callerId===api.getSession?.()?.userId)).catch(()=>{error=t('failed');render();});};
  panel.addEventListener('cancel',event=>{event.preventDefault();collapse.click();});
  avatar.className='wf-call-avatar';avatar.setAttribute('aria-hidden','true');stage.className='wf-call-stage';
  problem.className='wf-calling-notice';problem.setAttribute('role','status');
  stage.append(avatar,videos,selfCard);head.append(collapse,kindLabel,title,info);panel.append(head,stage,problem,actions);
  note.setAttribute('role','status');
  history.className='wf-calling-history';historyTitle.className='wf-calling-history-title';
  historyTitle.type='button';historyList.className='wf-calling-history-list';
  historyTitle.setAttribute('aria-expanded','false');historyList.hidden=true;history.append(historyTitle,historyList);
  layout.append(panel,note,history);container.append(layout);doc.body.append(bar);
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
  const glyphs={
   handset:'<path d="M20 17v3a1 1 0 0 1-1 1A18 18 0 0 1 3 5a1 1 0 0 1 1-1h3l2 5-2 2a13 13 0 0 0 6 6l2-2z"/>',
   hangup:'<path d="M3 16v-3a2 2 0 0 1 1-2c5-4 11-4 16 0a2 2 0 0 1 1 2v3h-5v-3a13 13 0 0 0-8 0v3z"/>',
   mic:'<rect x="9" y="2" width="6" height="13" rx="3"/><path d="M5 10v2a7 7 0 0 0 14 0v-2m-7 9v3m-4 0h8"/>',
   camera:'<rect x="2" y="5" width="14" height="14" rx="3"/><path d="m16 10 5-3v10l-5-3"/>',
   play:'<path d="m7 4 13 8-13 8z"/>'
  };
  const control=(key,action,glyph,cls='',off=false)=>{
   const b=button(key,action,cls);b.dataset.callControl=glyph;b.setAttribute('aria-label',t(key));
   b.innerHTML='<svg aria-hidden="true" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.7" fill="none" stroke-linejoin="round" stroke-linecap="round">'+glyphs[glyph]+(off?'<path d="m3 3 18 18"/>':'')+'</svg>';
   const label=doc.createElement('span');label.textContent=t(key);b.append(label);return b;
  };
  const duration=seconds=>String(Math.floor(seconds/60)).padStart(2,'0')+':'+String(seconds%60).padStart(2,'0');
  // In-chat call events: separate visual chips, not synthetic text messages.
  // Existing message IDs, message pagination and chat tables remain unchanged.
  function callbackAction(card,item){
   const room=shownRoom,userId=api.getSession?.()?.userId;
   if(item.status!=='missed'||room?.kind!=='direct'||item.roomId!==room.id||!userId||item.callerId===userId||!api.can?.('chat.edit'))return;
   const kind=item.kind==='video'?'video':'audio',who=room.peer?.name||room.name||'';
   const description=[t('callback'),who,t(kind)].filter(Boolean).join(' · ');
   const control=button('callback',async()=>{
    if(!manager||!enabled||lastState?.busy||lastState?.call)return;
    if(!await root.WFDialog?.confirm(description))return;
    if(!container.isConnected||shownRoom?.id!==room.id||api.getSession?.()?.userId!==userId||!api.can?.('chat.edit')||lastState?.busy||lastState?.call)return;
    await manager.start(room,kind);
   });
   control.setAttribute('aria-label',description);control.disabled=!enabled||!!lastState?.busy||!!lastState?.call;card.append(control);
  }
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
    chip.append(icon,name,time);callbackAction(chip,item);row.append(chip);section.append(row);
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
    card.append(name,when);callbackAction(card,item);historyList.append(card);
   }
   history.hidden=!historyRows.length;feedHistory();
  }
  historyTitle.addEventListener('click',()=>{
   historyList.hidden=!historyList.hidden;historyTitle.setAttribute('aria-expanded',String(!historyList.hidden));
  });
  function remoteUnit(uid){
   let unit=remote.get(uid);
   if(!unit){
    const card=doc.createElement('div'),video=doc.createElement('video'),label=doc.createElement('small'),initial=doc.createElement('span');
    card.className='wf-calling-tile';video.autoplay=true;video.playsInline=true;label.className='wf-calling-label';
    initial.className='wf-call-initial';initial.setAttribute('aria-hidden','true');card.append(initial,video,label);unit={card,video,label,initial};remote.set(uid,unit);
   }
   return unit;
  }
  function updateRemote(uid,stream){
   if(!stream){const old=remote.get(uid);if(old){old.video.pause?.();old.video.srcObject=null;old.card.remove();remote.delete(uid);}render();return;}
   const unit=remoteUnit(uid);
   if(unit.video.srcObject!==stream){unit.video.srcObject=stream;
    Promise.resolve(unit.video.play()).catch(()=>{unit.playBlocked=true;render();});}
   render();
  }
  function render(){
   language=locale();displayHistory();const state=lastState;const c=state?.call;
   for(const start of container.querySelectorAll('[data-call-start]'))start.disabled=!enabled||!!c||!!state?.busy||!api.can?.('chat.edit');
   note.textContent=error;note.hidden=!error||!!c;panel.hidden=!c;layout.classList.toggle('wf-calling-active',!!c||!!error);
   if(!c){if(panel.open)panel.close();bar.hidden=true;presentedId=null;minimized=false;selfVideo.srcObject=null;for(const [id,item] of remote){item.video.srcObject=null;item.card.remove();remote.delete(id);}return;}
   if(presentedId!==c.id){presentedId=c.id;minimized=false;}
   const invited=c.participants?.some(p=>p.id===api.getSession?.()?.userId&&p.status==='invited');
   const kind=t(c.kind==='video'?'video':'audio');
   const caller=invited&&c.participants?.find(p=>p.id===c.callerId)?.name;
   const others=(c.participants||[]).filter(p=>p.id!==api.getSession?.()?.userId);
   const roomName=shownRoom?.id===c.roomId&&shownRoom.name;
   const group=others.length>1||(shownRoom?.id===c.roomId&&shownRoom.kind==='group');
   panel.classList.toggle('wf-group-call',group);
   title.textContent=caller||roomName||others.map(p=>p.name).filter(Boolean).join(' · ')||kind;
   avatar.textContent=Array.from(title.textContent.trim())[0]||'';
   kindLabel.textContent=(invited?t('inbound')+' · '+kind:kind)+(group?' · '+t('participants')+' '+(c.participants||[]).filter(p=>p.status==='joined').length+'/'+c.participants.length:'');
   info.textContent=invited||c.status==='ringing'?t('ringing'):t('connecting');
   if(state.connected)info.textContent=t('connected')+(c.startedAt?' · '+duration(Math.max(0,Math.floor((Date.now()-Date.parse(c.startedAt))/1000))):'');

   if(state.localStream){
    if(selfVideo.srcObject!==state.localStream)selfVideo.srcObject=state.localStream;selfLabel.textContent=t('local');
    selfCard.hidden=!state.localStream.getVideoTracks().some(track=>track.enabled&&track.readyState==='live');
   }else{selfCard.hidden=true;selfVideo.srcObject=null;}
   const groupStage=group&&!invited&&c.status==='active';
   if(groupStage){for(const p of others)if(['joined','invited'].includes(p.status))remoteUnit(p.id);}
   for(const [uid,item] of remote){const track=item.video.srcObject?.getVideoTracks?.()[0],member=others.find(p=>p.id===uid);
    const name=member?.name||t('participants');item.video.hidden=!(track&&track.readyState==='live'&&track.enabled);
    item.initial.textContent=Array.from(name.trim())[0]||'';item.initial.hidden=!item.video.hidden;
    item.label.textContent=name+(groupStage&&member?.status==='invited'?' · '+t('ringing'):'');
    item.card.hidden=groupStage?!member||!['joined','invited'].includes(member.status):item.video.hidden;
    if(item.card.parentNode!==videos)videos.append(item.card);}
   avatar.hidden=[...remote.values()].some(item=>!item.card.hidden);
   const focused=doc.activeElement?.dataset?.callControl;
   actions.replaceChildren();
   const myId=api.getSession?.()?.userId;
   if(invited){
    const accept=control('answer',()=>manager.accept(),'handset','wf-calling-accept');accept.disabled=!!state.busy;
    actions.append(control('reject',()=>manager.decline(),'hangup','wf-calling-danger'),accept);
   }else{
    if(c.status==='active'){
     actions.append(control(state.muted?'unmic':'mic',()=>manager.micToggle(),'mic','',!!state.muted));
     if(c.kind==='video'){
      const cameraOn=state.localStream?.getVideoTracks().some(tr=>tr.enabled&&tr.readyState==='live');
      actions.append(control(cameraOn?'nocamera':'camera',()=>manager.cameraToggle(),'camera','',!cameraOn));
     }
    }
    actions.append(control('end',()=>manager.finish(c.callerId===myId),'hangup','wf-calling-danger'));
   }
   for(const item of remote.values())if(item.playBlocked){
    actions.append(control('play',async()=>{await item.video.play();item.playBlocked=false;render();},'play'));
   }
   problem.textContent=error;problem.hidden=!error;panel.dir=language==='ar'?'rtl':'ltr';
   collapse.setAttribute('aria-label',t('minimize'));collapse.title=t('minimize');
   bar.hidden=!minimized;bar.dir=panel.dir;restore.textContent=t('restore')+' · '+title.textContent;
   compactMic.hidden=invited||c.status!=='active';compactMic.textContent=t(state.muted?'unmic':'mic');compactEnd.textContent=t(invited?'reject':'end');
   if(minimized&&panel.open)panel.close();
   if(!minimized&&!panel.open&&panel.isConnected){if(panel.showModal)panel.showModal();else panel.setAttribute('open','');}
   if(focused)actions.querySelector('[data-call-control="'+focused+'"]')?.focus({preventScroll:true});
  }
  let enabled=!!root.isSecureContext&&!!root.RTCPeerConnection&&!!root.navigator?.mediaDevices?.getUserMedia;
  try{
   if(enabled)manager=root.WFCallManager.create({api,invitation,
    onState:s=>{lastState=s;render();},
    onRemote:updateRemote,
    onPresence:values=>{presence=values;},
    onHistory:rows=>{historyRows=rows;displayHistory();},
    onError:()=>{if(lastState?.call){error=t('failed');render();}}
   });
  }catch(_){enabled=false;}
  const showAlertOption=snapshot=>{
   for(const control of container.querySelectorAll('[data-call-alerts]')){
    control.disabled=!!snapshot?.busy;
    control.setAttribute('aria-label',t(snapshot?.canEnable?'alerts':'alertOptions'));
    control.title=root.WFCallPushStatus?.describe(snapshot)||t('alertOptions');
    control.dataset.callAlerts=snapshot?.status||'';
   }
  };
  const unsubscribeAlerts=root.WFPush?.subscribe?.(showAlertOption);
  function controls(room,pickRecipient){
   const wrapper=doc.createElement('span');wrapper.className='wf-calling-shortcuts';
   const picker=typeof pickRecipient==='function'&&(!room||room.kind==='team');
   if(!api.can?.('chat.edit')||!picker&&(!room||!['direct','group'].includes(room.kind)))return wrapper;
   if(picker)wrapper.classList.add('wf-calling-picker');
   for(const kind of ['audio','video']){
    const key=kind==='video'?'video':'audio';
    const control=button(key,()=>{if(!enabled||lastState?.call||!api.can?.('chat.edit'))return;error='';return picker?pickRecipient(kind):manager.start(room,kind);},'wf-calling-start wf-calling-icon');
    control.textContent='';
    control.setAttribute('aria-label',t(key));
    control.innerHTML=kind==='video'
      ?'<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="13" height="14" rx="3"/><path d="m16 10 5-3v10l-5-3"/></svg>'
      :'<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16.5v3a2 2 0 0 1-3.3 2.2A20 20 0 0 1 2.3 6.3 2 2 0 0 1 4.5 3h3a2 2 0 0 1 2 1.5l.8 2.9a2 2 0 0 1-.6 2L8 11a16 16 0 0 0 5 5l1.6-1.7a2 2 0 0 1 2-.6l2.9.8a2 2 0 0 1 1.5 2Z"/></svg>';
    const label=doc.createElement('span');label.className='wf-calling-label-text';label.textContent=t(key);control.append(label);
    control.dataset.callStart='';control.disabled=!enabled||!!lastState?.call||!!lastState?.busy;
    control.title=enabled?t(key):t('unsupported');wrapper.append(control);
   }
   const push=root.WFPush;
   if(push?.getSnapshot){
    const toggle=button('alertOptions',()=>push.getSnapshot().canEnable?push.enable():root.showPage?.('notifications'),'wf-calling-start wf-calling-icon');
    toggle.textContent='';toggle.setAttribute('aria-label',t('alerts'));toggle.title=t('alerts');
    toggle.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4M12 2v2"/></svg>';
    const snapshot=push.getSnapshot();toggle.dataset.callAlerts=snapshot.status||'';
    toggle.setAttribute('aria-label',t(snapshot.canEnable?'alerts':'alertOptions'));toggle.disabled=!!snapshot.busy;
    toggle.title=root.WFCallPushStatus?.describe(snapshot)||t('alertOptions');wrapper.append(toggle);
   }
   return wrapper;
  }
  async function selectRoom(room){
   shownRoom=room;error='';render();historyRows=[];displayHistory();
   if(manager)await manager.selectRoom(room).catch(()=>{});
  }
  if(manager){
   const tick=()=>{if(doc.visibilityState==='visible'||lastState?.call?.status==='active')manager.poll().catch(()=>{});};
   ticking=root.setInterval(tick,3500);manager.poll().catch(()=>{});
  }
  render();
  function startPrivate(room,kind){
   if(!enabled||lastState?.call||!api.can?.('chat.edit')||room?.kind!=='direct'||!['audio','video'].includes(kind))return;
   return manager.start(room,kind);
  }
  return Object.freeze({controls,startPrivate,selectRoom,renderHistoryInFeed:feedHistory,refresh:()=>manager?.poll(),
   hasActiveCall:()=>!!lastState?.call,updateLanguage:render,
   dispose(){unsubscribeAlerts?.();if(ticking)root.clearInterval(ticking);manager?.stop();bar.remove();historyContainer?.querySelector?.('[data-wf-call-history]')?.remove();layout.remove();}});
 }
 root.WFChatCallUI=Object.freeze({mount});
})(globalThis);
