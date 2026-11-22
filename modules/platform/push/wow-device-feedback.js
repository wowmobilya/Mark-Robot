(function(root){
  'use strict';
  const keys=['sound','vibration','touch','volume'];
  const langs=['ar','en','tr','fr','ru'];
  const labels={
    title:['الصوت واللمس','Sound and touch','Ses ve dokunma','Son et toucher','Звук и касания'],
    sound:['صوت التنبيهات','Notification sound','Bildirim sesi','Son des notifications','Звук уведомлений'],
    vibration:['اهتزاز التنبيهات','Notification vibration','Bildirim titreşimi','Vibration des notifications','Вибрация уведомлений'],
    touch:['صوت لمس الأزرار','Button sounds','Düğme sesleri','Son des boutons','Звук кнопок'],
    volume:['مستوى الصوت داخل التطبيق','In-app volume','Uygulama ses düzeyi','Volume de l’application','Громкость приложения'],
    preview:['معاينة','Preview','Önizleme','Aperçu','Прослушать']
  };
  const storageKey='wf-device-feedback-v1';
  let prefs={sound:true,vibration:true,touch:false,volume:35},audio;
  try {
    const saved=JSON.parse(root.localStorage.getItem(storageKey)||'{}');
    for(const key of keys.slice(0,3))if(typeof saved[key]==='boolean')prefs[key]=saved[key];
    if(Number.isFinite(saved.volume))prefs.volume=Math.max(0,Math.min(100,saved.volume));
  } catch {}
  const store=root.indexedDB&&root.WFPushDevice?.create(root.indexedDB);
  function context(){
    const AudioContext=root.AudioContext||root.webkitAudioContext;
    if(!AudioContext)return;
    audio||=new AudioContext();
    if(audio.state==='suspended')audio.resume().catch(()=>{});
    return audio;
  }
  function tone(touch=false){
    if(!audio||audio.state!=='running'||!prefs.volume)return;
    const notes=touch?[620]:[660,880];
    notes.forEach((hz,i)=>{
      const osc=audio.createOscillator(),gain=audio.createGain(),start=audio.currentTime+i*.11,end=start+(touch ? 0.045 : 0.18);
      osc.frequency.value=hz;gain.gain.setValueAtTime(.0001,start);
      gain.gain.exponentialRampToValueAtTime(Math.max(.0002,prefs.volume*.0012),start+.009);
      gain.gain.exponentialRampToValueAtTime(.0001,end);
      osc.connect(gain);gain.connect(audio.destination);osc.start(start);osc.stop(end+.01);
      osc.onended=()=>{osc.disconnect();gain.disconnect();};
    });
  }
  function alert(){if(prefs.sound)tone();if(prefs.vibration)root.navigator.vibrate?.([45,65,45]);}
  function save(){
    try{root.localStorage.setItem(storageKey,JSON.stringify(prefs));}catch{}
    store?.setFeedback(prefs).catch(()=>{});
    root.dispatchEvent(new Event('wf-device-feedback'));
  }
  function mount(host,locale){
    const doc=host.ownerDocument,group=doc.createElement('fieldset'),legend=doc.createElement('legend');
    group.className='wf-feedback-settings';group.append(legend);
    const controls=new Map();
    for(const key of keys){
      const label=doc.createElement('label'),input=doc.createElement('input'),caption=doc.createElement('span');
      input.type=key==='volume'?'range':'checkbox';
      if(key==='volume'){input.min=0;input.max=100;}
      label.append(caption,input);group.append(label);controls.set(key,{input,caption});
      input.addEventListener('change',()=>{prefs[key]=key==='volume'?Number(input.value):input.checked;save();});
    }
    const preview=doc.createElement('button');preview.type='button';preview.className='btn';
    preview.onclick=async()=>{const ctx=context();if(ctx?.state==='suspended')await ctx.resume().catch(()=>{});alert();};
    group.append(preview);host.append(group);
    function draw(){
      const lang=Math.max(0,langs.indexOf(locale()));
      legend.textContent=labels.title[lang];preview.textContent=labels.preview[lang];
      for(const [key,{input,caption}] of controls){
        caption.textContent=labels[key][lang];
        if(key==='volume')input.value=prefs.volume;else input.checked=prefs[key];
      }
    }
    draw();root.addEventListener('wf-device-feedback',draw);
    new MutationObserver(draw).observe(doc.documentElement,{attributes:true,attributeFilter:['lang']});
  }
  root.document.addEventListener('click',event=>{
    if(!event.isTrusted||!event.target.closest?.('button:not(:disabled),a[href],[role="button"]'))return;
    if(prefs.touch||prefs.sound)context();
    if(prefs.touch)tone(true);
  },{capture:true,passive:true});
  root.WFDeviceFeedback=Object.freeze({mount,alert});
})(window);
