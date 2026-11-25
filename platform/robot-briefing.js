(() => {
  'use strict';

  const labels={
    ar:['ar','استمع إلى ملخص مارك','أوقف القراءة','الصوت المحلي لهذه اللغة غير متاح على هذا الجهاز.','تعذّرت قراءة الملخص.'],
    en:['en','Listen to Mark’s briefing','Stop reading','A local voice for this language is unavailable on this device.','The briefing could not be read.'],
    tr:['tr','Mark’ın özetini dinle','Okumayı durdur','Bu cihazda bu dil için yerel ses yok.','Özet okunamadı.'],
    fr:['fr','Écouter le résumé de Mark','Arrêter la lecture','Aucune voix locale pour cette langue sur cet appareil.','Impossible de lire le résumé.'],
    ru:['ru','Прослушать сводку Mark','Остановить чтение','На устройстве нет локального голоса для этого языка.','Не удалось прочитать сводку.']
  };

  function mount({host,language,read}){
    const [locale,listen,stopLabel,noVoice,failed]=labels[language]||labels.ar;
    const synth=window.speechSynthesis;
    const wrapper=document.createElement('div');
    const button=document.createElement('button');
    const message=document.createElement('span');
    let current=null;
    let disposed=false;
    wrapper.className='platform-robot-briefing';
    button.type='button';
    button.className='platform-server-robot-refresh';
    button.textContent=listen;
    message.className='platform-server-robot-note';
    message.setAttribute('role','status');
    wrapper.append(button,message);
    host.append(wrapper);

    function finish(utterance,error){
      if(current!==utterance)return;
      current=null;
      button.textContent=listen;
      if(error)message.textContent=failed;
    }
    function stop(){
      if(!current)return;
      finish(current,false);
      synth.cancel();
    }
    function dispose(){
      if(disposed)return;
      disposed=true;
      document.removeEventListener('visibilitychange',onVisibility);
      window.removeEventListener('pagehide',dispose);
      stop();
    }
    function onVisibility(){
      if(document.hidden)stop();
    }
    document.addEventListener('visibilitychange',onVisibility);
    window.addEventListener('pagehide',dispose);
    button.addEventListener('click',()=>{
      if(disposed)return;
      message.textContent='';
      if(current){stop();return;}
      const voice=synth?.getVoices().find(item=>item.localService&&item.lang.toLowerCase().split(/[-_]/)[0]===locale);
      if(!voice||!window.SpeechSynthesisUtterance){message.textContent=noVoice;return;}
      const text=read().map(part=>part.trim()).filter(Boolean).join(' ');
      if(!text)return;
      const utterance=new SpeechSynthesisUtterance(text);
      utterance.lang=voice.lang;
      utterance.voice=voice;
      utterance.onend=()=>finish(utterance,false);
      utterance.onerror=()=>finish(utterance,true);
      current=utterance;
      button.textContent=stopLabel;
      try{synth.speak(utterance);}catch{finish(utterance,true);}
    });
    return dispose;
  }

  window.WFPlatformRobotBriefing=Object.freeze({mount});
})();
