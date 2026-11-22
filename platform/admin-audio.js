/* Admin audio preferences: reuse WOW's original ambient track, and generate
   optional low-volume interface feedback. Never autoplay or preload music. */
(() => {
  'use strict';
  const root=document.documentElement;
  const labels={
    ar:{heading:'أصوات WOW',feedback:'مؤثرات الأزرار',feedbackInfo:'نغمات قصيرة عند الأوامر، قابلة للكتم',music:'موسيقى WOW الأصلية',play:'تشغيل',stop:'إيقاف',on:'مفعّلة',off:'مكتومة',paused:'توقّف التشغيل',unavailable:'تعذّر تشغيل الصوت على هذا الجهاز'},
    en:{heading:'WOW sounds',feedback:'Button feedback',feedbackInfo:'Subtle interaction tones, optional',music:'Original WOW ambience',play:'Play',stop:'Stop',on:'Enabled',off:'Muted',paused:'Playback paused',unavailable:'Audio could not start on this device'},
    tr:{heading:'WOW sesleri',feedback:'Düğme sesleri',feedbackInfo:'İsteğe bağlı kısa etkileşim sesleri',music:'Orijinal WOW müziği',play:'Başlat',stop:'Durdur',on:'Açık',off:'Sessiz',paused:'Çalma durdu',unavailable:'Bu cihazda ses başlatılamadı'},
    fr:{heading:'Sons WOW',feedback:'Sons des boutons',feedbackInfo:'Retours discrets, désactivables',music:'Ambiance WOW originale',play:'Écouter',stop:'Arrêter',on:'Activés',off:'Muets',paused:'Lecture arrêtée',unavailable:'Impossible de lire le son'},
    ru:{heading:'Звуки WOW',feedback:'Звуки кнопок',feedbackInfo:'Тихие сигналы по желанию',music:'Оригинальная музыка WOW',play:'Включить',stop:'Остановить',on:'Включены',off:'Выключены',paused:'Воспроизведение остановлено',unavailable:'Не удалось воспроизвести звук'}
  };
  const KEY='wow.platform.uiSounds.v1',pick=()=>labels[root.lang]||labels.ar;
  let enabled=false,ctx=null,last=0,ambient=null,playing=false,widget=null,feedback=null,musicBtn=null,status=null;
  try{enabled=localStorage.getItem(KEY)==='on';}catch{}
  const make=(tag,css,txt)=>{const x=document.createElement(tag);if(css)x.className=css;if(txt!==undefined)x.textContent=txt;return x;};
  function sync(){
    const t=pick();
    if(!widget)return;
    widget.querySelector('.platform-audio-title').textContent=t.heading;
    widget.querySelector('.platform-audio-description').textContent=t.feedbackInfo;
    feedback.textContent=t.feedback+' · '+t[enabled?'on':'off'];
    feedback.setAttribute('aria-pressed',String(enabled));
    musicBtn.textContent=t.music+' · '+t[playing?'stop':'play'];
    musicBtn.setAttribute('aria-pressed',String(playing));
  }
  function tone(kind){
    if(!enabled||document.hidden)return;
    const now=performance.now();if(now-last<75)return;last=now;
    const AudioCtx=window.AudioContext||window.webkitAudioContext;if(!AudioCtx)return;
    try{
      ctx||=new AudioCtx();
      if(ctx.state==='suspended'){void ctx.resume().catch(()=>{});return;}
      const start=ctx.currentTime,frequency={nav:570,success:750,cancel:380,warning:340,tap:530}[kind]||530;
      const oscillator=ctx.createOscillator(),gain=ctx.createGain();
      oscillator.type='sine';oscillator.frequency.setValueAtTime(frequency,start);
      if(kind==='success')oscillator.frequency.exponentialRampToValueAtTime(frequency*1.17,start+.07);
      gain.gain.setValueAtTime(.0001,start);gain.gain.exponentialRampToValueAtTime(.013,start+.009);
      gain.gain.exponentialRampToValueAtTime(.0001,start+.09);
      oscillator.connect(gain).connect(ctx.destination);oscillator.start(start);oscillator.stop(start+.1);
      oscillator.onended=()=>{oscillator.disconnect();gain.disconnect();};
    }catch{/* A blocked or unsupported audio device must never block UI actions. */}
  }
  function pause(){if(ambient){ambient.pause();ambient.currentTime=0;}playing=false;sync();}
  async function toggleMusic(){
    if(playing){pause();return;}
    try{
      ambient||=new Audio(new URL('../assets/gallery/wow-ambient-v1.mp3',location.href));
      ambient.loop=true;ambient.preload='none';ambient.volume=.12;
      ambient.onended=()=>{playing=false;sync();};
      ambient.onerror=()=>{pause();if(status?.isConnected)status.textContent=pick().unavailable;};
      await ambient.play();playing=true;if(status)status.textContent='';sync();
    }catch{pause();if(status?.isConnected)status.textContent=pick().unavailable;}
  }
  function setEnabled(value){
    enabled=!!value;try{localStorage.setItem(KEY,enabled?'on':'off');}catch{}
    sync();if(enabled)tone('success');else if(ctx){void ctx.suspend().catch(()=>{});}
  }
  function mount(host){
    if(!host)return;
    widget=make('section','platform-audio-widget');
    const title=make('strong','platform-audio-title');
    const description=make('p','platform-audio-description');
    const controls=make('div','platform-audio-controls');
    feedback=make('button','platform-audio-feedback');feedback.type='button';
    feedback.addEventListener('click',()=>setEnabled(!enabled));
    musicBtn=make('button','platform-audio-music');musicBtn.type='button';musicBtn.addEventListener('click',toggleMusic);
    status=make('p','platform-audio-status');status.setAttribute('role','status');
    controls.append(feedback,musicBtn);widget.append(title,description,controls,status);host.append(widget);
    sync();return widget;
  }
  document.addEventListener('click',event=>{
    if(!enabled||!event.isTrusted||event.defaultPrevented)return;
    const trigger=event.target.closest?.('button,a[href],summary');
    if(!trigger||trigger.closest('.platform-audio-widget'))return;
    if(!trigger.closest('#content,main>header,.platform-side-drawer,.platform-language-dialog'))return;
    if(trigger.matches(':disabled,[aria-disabled="true"]'))return;
    let kind='tap';
    if(trigger.matches('.platform-section-link,.platform-drawer-link,.platform-header-link'))kind='nav';
    else if(trigger.matches('.platform-tool-status[data-action="suspend"],.platform-device-action[data-action="release"],.platform-device-action[data-action="block"]'))kind='warning';
    else if(trigger.matches('.platform-action-cancel,.platform-signout'))kind='cancel';
    else if(trigger.matches('[type="submit"],.platform-tool-status[data-action="activate"]'))kind='success';
    tone(kind);
  },true);
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&playing)pause();});
  window.addEventListener('pagehide',()=>{pause();if(ctx){void ctx.close().catch(()=>{});ctx=null;}});
  window.WFPlatformAudio=Object.freeze({mount,pause,setEnabled,isEnabled:()=>enabled});
})();
