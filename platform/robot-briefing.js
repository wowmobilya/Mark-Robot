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
      'أتحقق الآن من حالة الخادم. سأعطيك النتيجة عند اكتمال الفحص.',
      'انتهيت من الفحص. الخادم يستجيب، ولم تظهر تنبيهات نشطة في التقرير.',
      'الخادم يستجيب، وهناك أمور تحتاج إلى انتباهك. دعني أخبرك بما وجدته.',
      'الخادم يستجيب، لكنني لم أتمكّن من جلب تقرير المراقبة الجديد.',
      'القراءة المتاحة قديمة. حدّث الفحص حتى أتمكّن من إخبارك بالحالة الحالية.',
      'ردّ الخادم بأنه غير جاهز حاليًا. أعد الفحص بعد قليل.',
      'لم أتمكّن من الوصول إلى الخادم من هذا الجهاز. تحقّق من الاتصال، ثم أعد الفحص.',
      'لم أتمكّن من التحقّق من حالة الخادم. جرّب تحديث الفحص.'],
    en:['Hello, engineer. Mark here.',
      'I’m ready to check the server. Press refresh to get started.',
      'I’m checking the server now. I’ll have the result when the check finishes.',
      'I’ve finished checking. The server responded, and the report shows no active alerts.',
      'The server responded, and a few things need your attention. Here’s what I found.',
      'The server responded, but I couldn’t get a fresh monitoring report.',
      'The latest reading is out of date. Refresh the check for the current status.',
      'The server says it isn’t ready right now. Try checking again shortly.',
      'I couldn’t reach the server from this device. Check the connection and try again.',
      'I couldn’t verify the server status. Try refreshing the check.'],
    tr:['Merhaba mühendis. Ben Mark.',
      'Sunucuyu kontrol etmeye hazırım. Başlamak için yenile düğmesine basın.',
      'Sunucuyu kontrol ediyorum. İşlem tamamlandığında sonuç hazır olacak.',
      'Kontrol tamamlandı. Sunucu yanıt verdi ve raporda etkin uyarı yok.',
      'Sunucu yanıt verdi. Dikkat etmeniz gereken noktaları anlatayım.',
      'Sunucu yanıt verdi ancak güncel izleme raporunu alamadım.',
      'Son ölçüm güncel değil. Mevcut durumu öğrenmek için kontrolü yenileyin.',
      'Sunucu şu anda hazır olmadığını bildirdi. Biraz sonra tekrar kontrol edin.',
      'Bu cihazdan sunucuya ulaşamadım. Bağlantıyı kontrol edip tekrar deneyin.',
      'Sunucu durumunu doğrulayamadım. Kontrolü yenilemeyi deneyin.'],
    fr:['Bonjour. C’est Mark.',
      'Je suis prêt à vérifier le serveur. Appuyez sur Actualiser pour commencer.',
      'Je vérifie le serveur. Le résultat sera disponible à la fin du contrôle.',
      'Le contrôle est terminé. Le serveur répond et le rapport ne signale aucune alerte active.',
      'Le serveur répond. Voici les points qui demandent votre attention.',
      'Le serveur répond, mais je n’ai pas pu récupérer un nouveau rapport de suivi.',
      'La dernière mesure date. Relancez le contrôle pour connaître l’état actuel.',
      'Le serveur indique qu’il n’est pas prêt. Réessayez dans un instant.',
      'Je n’arrive pas à joindre le serveur depuis cet appareil. Vérifiez la connexion et réessayez.',
      'Je n’ai pas pu vérifier l’état du serveur. Relancez le contrôle.'],
    ru:['Здравствуйте, инженер. Это Марк.',
      'Я готов проверить сервер. Нажмите кнопку обновления.',
      'Я проверяю сервер. Результат появится после завершения проверки.',
      'Проверка завершена. Сервер ответил, активных предупреждений в отчёте нет.',
      'Сервер ответил. Вот что требует вашего внимания.',
      'Сервер ответил, но свежий отчёт мониторинга получить не удалось.',
      'Последние данные устарели. Повторите проверку, чтобы узнать текущее состояние.',
      'Сервер сообщил, что пока не готов. Повторите проверку чуть позже.',
      'С этого устройства не удалось связаться с сервером. Проверьте подключение и попробуйте снова.',
      'Не удалось подтвердить состояние сервера. Попробуйте повторить проверку.']
  };

  const arabicGreetings=['مرحبًا يا مهندسي. معك مارك.','مرحبًا يا مهندسي معتز. معك مارك.','مرحبًا يا أستاذي. معك مارك.'];

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
      const voice=chooseVoice(synth?.getVoices()||[],locale);
      if(!voice||!window.SpeechSynthesisUtterance){message.textContent=noVoice;return;}
      const {state,details,readings=[]}=read();
      const words=narration[locale];
      const opening=words[1+states.indexOf(states.includes(state)?state:'unverified')];
      const relevant=state==='attention'?details.slice(0,3):state==='partial'?details.slice(0,1):[];
      const greeting=locale==='ar'?arabicGreetings[plays%arabicGreetings.length]:plays===0?words[0]:'';
      const measurements=['ready','attention'].includes(state)?readings:[];
      const text=[greeting,opening,...relevant,...measurements].filter(Boolean).join(' ');
      const utterance=new SpeechSynthesisUtterance(text);
      utterance.lang=voice.lang;
      utterance.voice=voice;
      utterance.rate=locale==='ar'?.92:.98;
      utterance.onend=()=>finish(utterance,false);
      utterance.onerror=()=>finish(utterance,true);
      current=utterance;
      button.textContent=stopLabel;
      try{synth.speak(utterance);plays++;}catch{finish(utterance,true);}
    });
    return dispose;
  }

  window.WFPlatformRobotBriefing=Object.freeze({mount});
})();
