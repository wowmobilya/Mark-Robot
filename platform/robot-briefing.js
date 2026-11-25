(() => {
  'use strict';

  const labels={
    ar:['ar','استمع إلى ملخص مارك','أوقف القراءة','الصوت المحلي لهذه اللغة غير متاح على هذا الجهاز.','تعذّرت قراءة الملخص.'],
    en:['en','Listen to Mark’s briefing','Stop reading','A local voice for this language is unavailable on this device.','The briefing could not be read.'],
    tr:['tr','Mark’ın özetini dinle','Okumayı durdur','Bu cihazda bu dil için yerel ses yok.','Özet okunamadı.'],
    fr:['fr','Écouter le résumé de Mark','Arrêter la lecture','Aucune voix locale pour cette langue sur cet appareil.','Impossible de lire le résumé.'],
    ru:['ru','Прослушать сводку Mark','Остановить чтение','На устройстве нет локального голоса для этого языка.','Не удалось прочитать сводку.']
  };

  // Each sequence covers idle, checking, ready, attention, partial, stale,
  // unavailable, unreachable and unverified, in that order.
  const states=['idle','checking','ready','attention','partial','staleState','unavailable','unreachable','unverified'];
  const narration={
    ar:['',
      'أنا جاهز لفحص الخادم. اضغط زر التحديث لنبدأ.',
      'أتحقق الآن من حالة الخادم. استمع إلى الملخص مجددًا عند انتهاء الفحص.',
      'انتهيت من الفحص. الخادم يستجيب، والتقرير جاهز.',
      'الخادم يستجيب، وهناك أمور تحتاج إلى انتباهك. دعني أخبرك بما وجدته.',
      'الخادم يستجيب، لكنني لم أتمكّن من جلب تقرير المراقبة الجديد.',
      'القراءة المتاحة قديمة. حدّث الفحص حتى أتمكّن من إخبارك بالحالة الحالية.',
      'ردّ الخادم بأنه غير جاهز حاليًا. أعد الفحص بعد قليل.',
      'لم أتمكّن من الوصول إلى الخادم من هذا الجهاز. تحقّق من الاتصال، ثم أعد الفحص.',
      'لم أتمكّن من التحقّق من حالة الخادم. جرّب تحديث الفحص.'],
    en:['Hello, engineer. Mark here.',
      'I’m ready to check the server. Press refresh to get started.',
      'I’m checking the server now. Listen again when the check finishes.',
      'I’ve finished checking. The server responded, and the report is ready.',
      'The server responded, and a few things need your attention. Here’s what I found.',
      'The server responded, but I couldn’t get a fresh monitoring report.',
      'The latest reading is out of date. Refresh the check for the current status.',
      'The server says it isn’t ready right now. Try checking again shortly.',
      'I couldn’t reach the server from this device. Check the connection and try again.',
      'I couldn’t verify the server status. Try refreshing the check.'],
    tr:['Merhaba mühendis. Ben Mark.',
      'Sunucuyu kontrol etmeye hazırım. Başlamak için yenile düğmesine basın.',
      'Sunucuyu kontrol ediyorum. Kontrol tamamlandığında özeti yeniden dinleyin.',
      'Kontrol tamamlandı. Sunucu yanıt verdi ve rapor hazır.',
      'Sunucu yanıt verdi. Dikkat etmeniz gereken noktaları anlatayım.',
      'Sunucu yanıt verdi ancak güncel izleme raporunu alamadım.',
      'Son ölçüm güncel değil. Mevcut durumu öğrenmek için kontrolü yenileyin.',
      'Sunucu şu anda hazır olmadığını bildirdi. Biraz sonra tekrar kontrol edin.',
      'Bu cihazdan sunucuya ulaşamadım. Bağlantıyı kontrol edip tekrar deneyin.',
      'Sunucu durumunu doğrulayamadım. Kontrolü yenilemeyi deneyin.'],
    fr:['Bonjour. C’est Mark.',
      'Je suis prêt à vérifier le serveur. Appuyez sur Actualiser pour commencer.',
      'Je vérifie le serveur. Écoutez de nouveau le résumé à la fin du contrôle.',
      'Le contrôle est terminé. Le serveur répond et le rapport est prêt.',
      'Le serveur répond. Voici les points qui demandent votre attention.',
      'Le serveur répond, mais je n’ai pas pu récupérer un nouveau rapport de suivi.',
      'La dernière mesure date. Relancez le contrôle pour connaître l’état actuel.',
      'Le serveur indique qu’il n’est pas prêt. Réessayez dans un instant.',
      'Je n’arrive pas à joindre le serveur depuis cet appareil. Vérifiez la connexion et réessayez.',
      'Je n’ai pas pu vérifier l’état du serveur. Relancez le contrôle.'],
    ru:['Здравствуйте, инженер. Это Марк.',
      'Я готов проверить сервер. Нажмите кнопку обновления.',
      'Я проверяю сервер. Прослушайте сводку ещё раз после завершения проверки.',
      'Проверка завершена. Сервер ответил, отчёт готов.',
      'Сервер ответил. Вот что требует вашего внимания.',
      'Сервер ответил, но свежий отчёт мониторинга получить не удалось.',
      'Последние данные устарели. Повторите проверку, чтобы узнать текущее состояние.',
      'Сервер сообщил, что пока не готов. Повторите проверку чуть позже.',
      'С этого устройства не удалось связаться с сервером. Проверьте подключение и попробуйте снова.',
      'Не удалось подтвердить состояние сервера. Попробуйте повторить проверку.']
  };

  const arabicGreetings=['مرحبًا يا مهندسي. معك مارك.','مرحبًا يا مهندسي معتز. معك مارك.','مرحبًا يا أستاذي. معك مارك.'];

  const scriptURL=document.currentScript?.src;
  const audioClips={
    ar:[[0.0,0.0],[0.25,5.9818],[6.4817,8.327],[15.0587,5.8192],[21.1279,8.6056],[29.9835,7.6045],[37.838,9.1513],[47.2393,7.166],[54.6552,9.5693],[64.4745,6.6784],[71.4028,3.2766],[74.9294,3.9965],[79.1759,3.1954]],
    en:[[0.0,2.4059],[2.6559,3.1722],[6.078,3.8223],[10.1503,4.2054],[14.6057,4.5537],[19.4094,3.483],[23.1424,4.101],[27.4933,3.8455],[31.5888,4.3564],[36.1952,3.7991]],
    tr:[[0.0,2.5104],[2.7604,4.7047],[7.715,4.8672],[12.8322,3.892],[16.9741,4.426],[21.6502,3.6571],[25.5573,4.8672],[30.6745,5.2039],[36.1283,4.9369],[41.3152,3.8571]],
    fr:[[0.0,1.9299],[2.1799,4.3564],[6.7862,4.426],[11.4622,3.7643],[15.4765,3.9616],[19.6881,3.6571],[23.5952,4.5421],[28.3873,3.6598],[32.2971,5.5058],[38.0528,3.9616]],
    ru:[[0.0,3.6133],[3.8633,4.1706],[8.2839,5.3664],[13.9003,4.3448],[18.4951,4.0661],[22.8112,4.2841],[27.3452,5.2387],[32.8339,4.6118],[37.6957,7.0034],[44.9491,4.7627]]
  };

  function chooseVoice(voices,locale){
    const local=voices.filter(voice=>voice.localService&&voice.lang.toLowerCase().split(/[-_]/)[0]===locale);
    if(locale!=='ar')return local[0];
    const eligible=local.filter(voice=>!/^ar[-_]sy(?:$|[-_])/i.test(voice.lang)&&!/syr(?:ia|ian)|سوري/i.test(voice.name+' '+voice.voiceURI));
    return eligible.find(voice=>/^ar[-_]sa$/i.test(voice.lang))||eligible.find(voice=>/^ar$/i.test(voice.lang))||eligible[0];
  }

  function mount({host,language,read}){
    const [locale,listen,stopLabel,noVoice,failed]=labels[language]||labels.ar;
    const synth=window.speechSynthesis;
    const wrapper=document.createElement('div');
    const button=document.createElement('button');
    const message=document.createElement('span');
    let current=null;
    let disposed=false;
    let plays=0;
    let recording;
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
      const playback=current;
      finish(playback,false);
      playback.cancel();
    }
    function dispose(){
      if(disposed)return;
      disposed=true;
      document.removeEventListener('visibilitychange',onVisibility);
      window.removeEventListener('pagehide',stop);
      stop();
    }
    function onVisibility(){
      if(document.hidden)stop();
    }
    document.addEventListener('visibilitychange',onVisibility);
    window.addEventListener('pagehide',stop);
    async function playRecording(greetingIndex,stateIndex,details){
      const AudioEngine=window.AudioContext||window.webkitAudioContext;
      if(!AudioEngine){message.textContent=noVoice;return;}
      const controller=new AbortController();
      let context;
      const playback={cancel(){
        controller.abort();
        if(context&&context.state!=='closed')void context.close().catch(()=>{});
      }};
      current=playback;
      button.textContent=stopLabel;
      try{
        context=new AudioEngine();
        await context.resume();
        if(!recording){
          const response=await fetch(new URL('briefing-audio/'+locale+'.mp3',scriptURL||location.href),{signal:controller.signal});
          if(!response.ok)throw new Error('Recording unavailable');
          recording=await context.decodeAudioData(await response.arrayBuffer());
        }
        if(current!==playback)return;
        const parts=[greetingIndex,stateIndex].filter(index=>index>=0);
        let when=context.currentTime+.035;
        for(const [position,index] of parts.entries()){
          const [offset,duration]=audioClips[locale][index];
          const source=context.createBufferSource();
          source.buffer=recording;
          source.connect(context.destination);
          if(position===parts.length-1)source.onended=()=>{
            finish(playback,false);playback.cancel();
          };
          source.start(when,offset,duration);
          when+=duration+.18;
        }
        message.textContent=details.join(' ');
        plays++;
      }catch{
        finish(playback,true);
        playback.cancel();
      }
    }

    button.addEventListener('click',()=>{
      if(disposed)return;
      message.textContent='';
      if(current){stop();return;}
      const voice=chooseVoice(synth?.getVoices()||[],locale);
      const {state,details,readings=[]}=read();
      const words=narration[locale];
      const stateIndex=1+states.indexOf(states.includes(state)?state:'unverified');
      const opening=words[stateIndex];
      const fresh=['ready','attention'].includes(state);
      const relevant=fresh?details.slice(0,3):state==='partial'?details.slice(0,1):[];
      const greeting=locale==='ar'?arabicGreetings[plays%arabicGreetings.length]:plays===0?words[0]:'';
      const measurements=fresh?readings:[];
      const extra=[...relevant,...measurements];
      const greetingIndex=locale==='ar'?words.length+plays%arabicGreetings.length:plays===0?0:-1;
      if(!voice||!window.SpeechSynthesisUtterance){
        void playRecording(greetingIndex,stateIndex,extra);
        return;
      }
      const text=[greeting,opening,...extra].filter(Boolean).join(' ');
      const utterance=new SpeechSynthesisUtterance(text);
      utterance.lang=voice.lang;
      utterance.voice=voice;
      utterance.rate=locale==='ar'?.92:.98;
      const playback={cancel:()=>synth.cancel()};
      let started=false;
      utterance.onstart=()=>{started=true;plays++;};
      utterance.onend=()=>finish(playback,false);
      function speechFailed(){
        if(current!==playback)return;
        finish(playback,started);
        if(!started)void playRecording(greetingIndex,stateIndex,extra);
      }
      utterance.onerror=speechFailed;
      current=playback;
      button.textContent=stopLabel;
      try{synth.speak(utterance);}catch{speechFailed();}
    });
    return dispose;
  }

  window.WFPlatformRobotBriefing=Object.freeze({mount});
})();
