/* The visible report uses the exact committed snapshot and speech offsets. */
(() => {
  'use strict';
  function segmentsFor(snapshot) {
    const narration=typeof snapshot?.narration==='string'?snapshot.narration:'';
    const segments=Array.isArray(snapshot?.narrationSegments)?snapshot.narrationSegments:[];
    let cursor=0;
    const exact=segments.length&&segments.every(s=>{
      if(!s||typeof s.text!=='string'||!Number.isInteger(s.start)||!Number.isInteger(s.end)||s.start<cursor||s.end<=s.start||s.end>narration.length||narration.slice(s.start,s.end)!==s.text||narration.slice(cursor,s.start).trim())return false;
      cursor=s.end;return true;
    })&&!narration.slice(cursor).trim();
    if(exact)return segments;
    return narration?[{text:narration,start:0,end:narration.length}]:[];
  }
  function segmentAt(segments,index) {
    if(!Number.isFinite(index)||index<0)return -1;
    return segments.findIndex((s,i)=>index>=s.start&&(index<s.end||i===segments.length-1&&index===s.end));
  }
  const voiceCopy={
    ar:{title:'صوت التقرير',missing:'صوت التقرير على جهازك',install:'تنزيل صوت التقرير',retry:'إعادة تنزيل الصوت',cancel:'إلغاء التنزيل',downloading:'جارٍ تنزيل صوت التقرير…',failed:'تعذّر تنزيل صوت التقرير',unsupported:'الصوت غير متاح على هذا الجهاز',local:'تنزيل مرة واحدة، ثم يعمل محليًا دون إنترنت.',size:'نحو {size} م.ب',transfer:'{loaded} من {total} م.ب',generic:'لم يكتمل التنزيل. حاول مجددًا؛ يبقى التقرير متاحًا للقراءة.',network:'تحقّق من اتصالك بالإنترنت، ثم حاول مجددًا.',storage:'لا توجد مساحة كافية لحفظ الصوت. حرّر مساحة ثم حاول مجددًا.',blocked:'تعذّر حفظ الصوت على هذا الجهاز. اسمح للموقع بالتخزين ثم حاول مجددًا.',unavailable:'يمكنك متابعة قراءة التقرير المكتوب.'},
    en:{title:'Report voice',missing:'Report voice on this device',install:'Download report voice',retry:'Retry voice download',cancel:'Cancel download',downloading:'Downloading report voice…',failed:'Report voice download failed',unsupported:'Voice is unavailable on this device',local:'Download once, then use it locally offline.',size:'About {size} MB',transfer:'{loaded} of {total} MB',generic:'The download did not finish. Try again; the written report is still available.',network:'Check your internet connection, then try again.',storage:'There is not enough space to save the voice. Free some space and try again.',blocked:'The voice could not be saved on this device. Allow site storage, then try again.',unavailable:'You can continue reading the written report.'},
    tr:{title:'Rapor sesi',missing:'Bu cihazda rapor sesi',install:'Rapor sesini indir',retry:'Ses indirmeyi yeniden dene',cancel:'İndirmeyi iptal et',downloading:'Rapor sesi indiriliyor…',failed:'Rapor sesi indirilemedi',unsupported:'Bu cihazda ses kullanılamıyor',local:'Bir kez indirin, ardından cihazda çevrimdışı kullanın.',size:'Yaklaşık {size} MB',transfer:'{loaded} / {total} MB',generic:'İndirme tamamlanmadı. Tekrar deneyin; yazılı rapor okunabilir.',network:'İnternet bağlantınızı kontrol edip tekrar deneyin.',storage:'Sesi kaydetmek için yeterli alan yok. Yer açıp tekrar deneyin.',blocked:'Ses bu cihaza kaydedilemedi. Site depolamasına izin verip tekrar deneyin.',unavailable:'Yazılı raporu okumaya devam edebilirsiniz.'},
    fr:{title:'Voix du rapport',missing:'La voix du rapport sur cet appareil',install:'Télécharger la voix du rapport',retry:'Réessayer le téléchargement',cancel:'Annuler le téléchargement',downloading:'Téléchargement de la voix…',failed:'Le téléchargement de la voix a échoué',unsupported:'La voix est indisponible sur cet appareil',local:'Un seul téléchargement, puis une utilisation locale hors ligne.',size:'Environ {size} Mo',transfer:'{loaded} sur {total} Mo',generic:'Le téléchargement est incomplet. Réessayez ; le rapport écrit reste disponible.',network:'Vérifiez votre connexion Internet, puis réessayez.',storage:'L’espace est insuffisant pour enregistrer la voix. Libérez de l’espace et réessayez.',blocked:'La voix n’a pas pu être enregistrée. Autorisez le stockage du site, puis réessayez.',unavailable:'Vous pouvez continuer à lire le rapport écrit.'},
    ru:{title:'Голос отчёта',missing:'Голос отчёта на этом устройстве',install:'Скачать голос отчёта',retry:'Повторить загрузку голоса',cancel:'Отменить загрузку',downloading:'Загрузка голоса отчёта…',failed:'Не удалось загрузить голос отчёта',unsupported:'Голос недоступен на этом устройстве',local:'Скачайте один раз, затем используйте на устройстве без интернета.',size:'Около {size} МБ',transfer:'{loaded} из {total} МБ',generic:'Загрузка не завершена. Повторите попытку; текст отчёта доступен.',network:'Проверьте подключение к интернету и повторите попытку.',storage:'Недостаточно места для голоса. Освободите место и повторите попытку.',blocked:'Не удалось сохранить голос. Разрешите сайту хранить данные и повторите попытку.',unavailable:'Вы можете продолжить чтение текста отчёта.'}
  };
  function reportLocale(value,fallback='en') {
    const language=typeof value==='string'?value.toLowerCase().split(/[-_]/)[0]:'';
    return voiceCopy[language]?language:fallback;
  }
  function reportVoiceState(detail,previous={}) {
    if(!['missing','downloading','ready','error','unsupported'].includes(detail?.state))return null;
    const number=(value,fallback=0)=>typeof value==='number'&&Number.isFinite(value)?Math.max(0,value):fallback;
    const total=number(detail.total,number(previous.total));
    const loaded=Math.min(total||Infinity,number(detail.loaded));
    const ratio=number(detail.progress,total?loaded/total:0);
    return {state:detail.state,progress:Math.min(1,ratio),loaded,total,reason:typeof detail.reason==='string'?detail.reason:'',
      ...(typeof detail.voiceName==='string'?{voiceName:detail.voiceName.slice(0,120)}:previous.voiceName?{voiceName:previous.voiceName}:{})};
  }
  function reportControlAction(voiceState,playbackState) {
    if(voiceState==='downloading')return 'cancel-download';
    if(voiceState==='missing'||voiceState==='error')return 'install';
    if(voiceState==='unsupported')return null;
    return playbackState==='paused'?'resume':playbackState==='preparing'||playbackState==='speaking'?'pause':'replay';
  }
  function voiceSetupFor(voice,locale) {
    const language=reportLocale(locale),L=voiceCopy[language];
    if(!voice||voice.state==='ready')return {visible:false};
    const format=value=>new Intl.NumberFormat(language,{maximumFractionDigits:1}).format(value/1000000);
    const replace=(text,values)=>text.replace(/\{(\w+)\}/g,(_,key)=>values[key]??'');
    const downloading=voice.state==='downloading',error=voice.state==='error',unsupported=voice.state==='unsupported';
    const percent=Math.round(Math.min(1,Math.max(0,voice.progress||0))*100);
    const size=voice.total>0?replace(L.size,{size:format(voice.total)}):'';
    const reason=String(voice.reason||'').toLowerCase();
    const textUnsupported={ar:'تعذّرت مطابقة نص هذا التقرير للقراءة الصوتية. التقرير المكتوب متاح؛ راجع بياناته ثم افتحه مجددًا.',en:'This report could not be matched for accurate speech. The written report is available; review its data and reopen it.',tr:'Bu rapor doğru seslendirme için eşleştirilemedi. Yazılı rapor kullanılabilir; verileri kontrol edip yeniden açın.',fr:'Ce rapport ne peut pas être lu avec précision. Le texte reste disponible ; vérifiez ses données puis rouvrez-le.',ru:'Не удалось подготовить точное чтение этого отчёта. Текст доступен; проверьте данные и откройте отчёт снова.'};
    const integrity={ar:'لم يطابق أحد ملفات الصوت النسخة المطلوبة. أعد التنزيل.',en:'A voice file did not match the required version. Download again.',tr:'Bir ses dosyası gereken sürümle eşleşmedi. Yeniden indirin.',fr:'Un fichier vocal ne correspond pas à la version attendue. Relancez le téléchargement.',ru:'Файл голоса не соответствует требуемой версии. Загрузите снова.'};
    const referenceUnavailable={ar:'الصوت المحلي المبني على عيّنة مارك يحتاج جهازًا ومتصفحًا يدعمان WebGPU. راجع التوافق في إعدادات الروبوت.',en:'The local voice based on the Mark sample needs a WebGPU-compatible device and browser. Check compatibility in Robot settings.',tr:'Mark örneğine dayalı yerel ses, WebGPU uyumlu cihaz ve tarayıcı gerektirir. Robot ayarlarından uyumluluğu kontrol edin.',fr:'La voix locale fondée sur l’extrait Mark nécessite un appareil et un navigateur compatibles WebGPU. Vérifiez les réglages du robot.',ru:'Локальный голос по образцу голоса «Марк» требует устройства и браузера с WebGPU. Проверьте совместимость в настройках робота.'};
    const referenceNote={ar:'محاكاة محلية تعتمد على عيّنة مارك؛ قد تختلف عن التسجيل الأصلي.',en:'A local approximation based on the Mark sample; it may differ from the original recording.',tr:'Mark örneğine dayalı yerel bir benzetimdir; özgün kayıttan farklı olabilir.',fr:'Une approximation locale fondée sur l’extrait Mark, pouvant différer de l’enregistrement original.',ru:'Локальная имитация по образцу голоса «Марк»; голос может отличаться от исходной записи.'};
    const failure=/quota|space|storage-full/.test(reason)?L.storage:/storage|cache|indexeddb|permission/.test(reason)?L.blocked:/integrity|checksum|verification/.test(reason)?integrity[language]:/network|offline|fetch/.test(reason)?L.network:L.generic;
    const transfer=voice.total>0?replace(L.transfer,{loaded:format(voice.loaded),total:format(voice.total)}):L.local;
    return {visible:true,label:L.title,title:reason==='report-text-unsupported'?L.title:downloading?L.downloading:error?L.failed:unsupported?L.unsupported:L.missing,
      hint:reason==='report-text-unsupported'?textUnsupported[language]:/webgpu|reference-unavailable/.test(reason)?referenceUnavailable[language]:downloading?transfer:error?failure:unsupported?L.unavailable:[size,L.local,voice.voiceName==='Mark · local reference'?referenceNote[language]:''].filter(Boolean).join(' · '),
      progress:percent,progressText:new Intl.NumberFormat(language,{style:'percent',maximumFractionDigits:0}).format(percent/100),showProgress:downloading,
      actionLabel:downloading?L.cancel:error?L.retry:unsupported?L.unsupported:L.install,
      actionIcon:downloading?'close':error?'retry':'download'};
  }
  if(typeof module==='object'&&module.exports){module.exports={segmentsFor,segmentAt,reportLocale,reportVoiceState,reportControlAction,voiceSetupFor};return;}
  const card=document.querySelector('.wf-greeting-flip');
  if(!card)return;
  const copy={
    ar:{title:'تقرير اليوم',date:'تاريخ التقرير',written:'التقرير المكتوب',close:'إغلاق التقرير',stop:'إيقاف القراءة',replay:'إعادة القراءة',follow:'متابعة القراءة تلقائيًا',manual:'التمرير بيدك · متابعة القراءة',ready:'التقرير جاهز',preparing:'جارٍ تجهيز القراءة…',speaking:'الروبوت يقرأ التقرير',finished:'اكتملت القراءة',stopped:'توقفت القراءة',unavailable:'التقرير ظاهر. فعّل صوت اللغة من إعدادات الروبوت لسماعه.',failed:'تعذّر تشغيل الصوت. يمكنك قراءة التقرير أو المحاولة مجددًا.',empty:'بيانات التقرير غير مكتملة الآن.',today:'حركة اليوم',balances:'الديون والأرصدة',activity:'الفواتير والعملاء',cash:'الصناديق والملاحظات'},
    en:{title:'Today’s report',date:'Report date',written:'Written report',close:'Close report',stop:'Stop reading',replay:'Read again',follow:'Follow the reading',manual:'Manual scrolling · Follow reading',ready:'Report ready',preparing:'Preparing the reading…',speaking:'The robot is reading',finished:'Reading complete',stopped:'Reading stopped',unavailable:'Your report is visible. Enable a language voice in Robot settings to hear it.',failed:'Audio could not start. Read the report or try again.',empty:'Report data is incomplete right now.',today:'Today’s activity',balances:'Debts and balances',activity:'Invoices and clients',cash:'Cashboxes and notes'},
    tr:{title:'Bugünün raporu',date:'Rapor tarihi',written:'Yazılı rapor',close:'Raporu kapat',stop:'Okumayı durdur',replay:'Yeniden oku',follow:'Okumayı takip et',manual:'Elle kaydırma · Okumayı takip et',ready:'Rapor hazır',preparing:'Okuma hazırlanıyor…',speaking:'Robot raporu okuyor',finished:'Okuma tamamlandı',stopped:'Okuma durduruldu',unavailable:'Rapor görünür. Dinlemek için Robot ayarlarında dil sesini etkinleştirin.',failed:'Ses başlatılamadı. Raporu okuyabilir veya tekrar deneyebilirsiniz.',empty:'Rapor verileri şu anda eksik.',today:'Bugünün hareketleri',balances:'Borçlar ve bakiyeler',activity:'Faturalar ve müşteriler',cash:'Kasalar ve notlar'},
    fr:{title:'Rapport du jour',date:'Date du rapport',written:'Rapport écrit',close:'Fermer le rapport',stop:'Arrêter la lecture',replay:'Relire',follow:'Suivre la lecture',manual:'Défilement manuel · Suivre la lecture',ready:'Rapport prêt',preparing:'Préparation de la lecture…',speaking:'Le robot lit le rapport',finished:'Lecture terminée',stopped:'Lecture arrêtée',unavailable:'Le rapport est affiché. Activez une voix dans les réglages du robot pour l’écouter.',failed:'Le son n’a pas démarré. Lisez le rapport ou réessayez.',empty:'Les données du rapport sont incomplètes.',today:'Activité du jour',balances:'Créances et soldes',activity:'Factures et clients',cash:'Caisses et notes'},
    ru:{title:'Отчёт за сегодня',date:'Дата отчёта',written:'Текст отчёта',close:'Закрыть отчёт',stop:'Остановить чтение',replay:'Прочитать снова',follow:'Следовать за чтением',manual:'Ручная прокрутка · Следовать за чтением',ready:'Отчёт готов',preparing:'Подготовка чтения…',speaking:'Робот читает отчёт',finished:'Чтение завершено',stopped:'Чтение остановлено',unavailable:'Отчёт показан. Включите голос языка в настройках робота, чтобы прослушать его.',failed:'Не удалось включить звук. Прочитайте отчёт или повторите попытку.',empty:'Данные отчёта пока неполны.',today:'Операции за день',balances:'Долги и остатки',activity:'Счета и клиенты',cash:'Кассы и примечания'}
  };
  const readerCopy={"ar": {"identity": "مارك روبوت", "close": "تصغير ومتابعة القراءة", "pause": "إيقاف مؤقت", "resume": "متابعة القراءة", "paused": "القراءة متوقفة مؤقتًا", "speaking": "مارك يقرأ التقرير", "compact": "حجم أصغر", "expand": "تكبير النافذة", "moveTop": "إلى الأعلى", "moveBottom": "إلى الأسفل", "drag": "اسحب للأعلى أو للأسفل", "unavailable": "التقرير ظاهر. جهّز مارك في إعدادات الروبوت لسماعه."}, "en": {"identity": "Mark Robot", "close": "Minimize and keep reading", "pause": "Pause", "resume": "Resume", "paused": "Reading paused", "speaking": "Mark is reading the report", "compact": "Smaller view", "expand": "Expand reader", "moveTop": "Move to top", "moveBottom": "Move to bottom", "drag": "Drag up or down", "unavailable": "The report is visible. Set up Mark in Robot settings to hear it."}, "tr": {"identity": "Mark Robot", "close": "Küçült ve okumaya devam et", "pause": "Duraklat", "resume": "Devam et", "paused": "Okuma duraklatıldı", "speaking": "Mark raporu okuyor", "compact": "Daha küçük", "expand": "Pencereyi büyüt", "moveTop": "Yukarı taşı", "moveBottom": "Aşağı taşı", "drag": "Yukarı veya aşağı sürükleyin", "unavailable": "Rapor görünür. Dinlemek için Robot ayarlarından Mark sesini hazırlayın."}, "fr": {"identity": "Robot Mark", "close": "Réduire et poursuivre la lecture", "pause": "Pause", "resume": "Reprendre", "paused": "Lecture en pause", "speaking": "Mark lit le rapport", "compact": "Vue réduite", "expand": "Agrandir le lecteur", "moveTop": "Vers le haut", "moveBottom": "Vers le bas", "drag": "Glisser vers le haut ou le bas", "unavailable": "Le rapport est affiché. Configurez Mark dans les réglages du robot pour l’écouter."}, "ru": {"identity": "Робот Марк", "close": "Свернуть и продолжить чтение", "pause": "Пауза", "resume": "Продолжить", "paused": "Чтение приостановлено", "speaking": "Марк читает отчёт", "compact": "Уменьшить", "expand": "Увеличить окно", "moveTop": "Переместить вверх", "moveBottom": "Переместить вниз", "drag": "Перетащите вверх или вниз", "unavailable": "Отчёт показан. Настройте голос «Марк» в параметрах робота для прослушивания."}};
  for(const locale of Object.keys(readerCopy))Object.assign(copy[locale],readerCopy[locale]);
  const inlineCopy={
    ar:{read:'قراءة التقرير',ready:'التقرير جاهز · شغّل الصوت من زر القراءة',collapse:'طيّ التقرير',keepReading:'طيّ التقرير ومتابعة القراءة',disabled:'الصوت معطّل في إعدادات الروبوت؛ يمكنك قراءة التقرير هنا.',muted:'صوت الروبوت مكتوم؛ يمكنك قراءة التقرير هنا.'},
    en:{read:'Read aloud',ready:'Report ready · Choose Read aloud to start the voice',collapse:'Collapse report',keepReading:'Collapse report and keep reading',disabled:'Voice is disabled in Robot settings. You can read the report here.',muted:'The robot is muted. You can read the report here.'},
    tr:{read:'Sesli oku',ready:'Rapor hazır · Sesi başlatmak için Sesli oku düğmesini kullanın',collapse:'Raporu daralt',keepReading:'Raporu daralt ve okumaya devam et',disabled:'Robot ayarlarında ses kapalı. Raporu buradan okuyabilirsiniz.',muted:'Robotun sesi kısık. Raporu buradan okuyabilirsiniz.'},
    fr:{read:'Lire à voix haute',ready:'Rapport prêt · Choisissez Lire à voix haute pour démarrer',collapse:'Replier le rapport',keepReading:'Replier le rapport et poursuivre la lecture',disabled:'La voix est désactivée dans les réglages du robot. Le rapport reste lisible ici.',muted:'Le robot est en sourdine. Le rapport reste lisible ici.'},
    ru:{read:'Читать вслух',ready:'Отчёт готов · Для озвучивания нажмите «Читать вслух»',collapse:'Свернуть отчёт',keepReading:'Свернуть отчёт и продолжить чтение',disabled:'Голос отключён в настройках робота. Отчёт можно прочитать здесь.',muted:'Звук робота выключен. Отчёт можно прочитать здесь.'}
  };
  for(const locale of Object.keys(inlineCopy))Object.assign(copy[locale],inlineCopy[locale]);
  const windowLabels={
    ar:['تصغير','خروج','الخروج وإيقاف القراءة'],en:['Minimize','Exit','Exit and stop reading'],
    tr:['Küçült','Çıkış','Çık ve okumayı durdur'],fr:['Réduire','Quitter','Quitter et arrêter la lecture'],
    ru:['Свернуть','Выход','Выйти и остановить чтение']
  };
  const rateLabels={ar:'سرعة القراءة',en:'Reading speed',tr:'Okuma hızı',fr:'Vitesse de lecture',ru:'Скорость чтения'};
  const rateActions={ar:['قراءة أبطأ','قراءة أسرع'],en:['Read slower','Read faster'],tr:['Daha yavaş oku','Daha hızlı oku'],fr:['Lire plus lentement','Lire plus vite'],ru:['Читать медленнее','Читать быстрее']};
  const hiddenCardCopy={ar:'البطاقة الذكية مخفية. أظهرها من تخصيص الرئيسية لفتح التقرير.',en:'The smart card is hidden. Show it in Customize home to open the report.',tr:'Akıllı kart gizli. Raporu açmak için ana sayfa düzeninden kartı gösterin.',fr:'La carte intelligente est masquée. Affichez-la dans la personnalisation de l’accueil pour ouvrir le rapport.',ru:'Умная карточка скрыта. Покажите её в настройке главной страницы, чтобы открыть отчёт.'};
  const paths={report:'<path d="M6 3h9l4 4v14H5V3h1Zm8 0v5h5M8 12h8M8 16h6"/>',today:'<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M7 3v4m10-4v4M3 11h18m-13 5 3 2 5-4"/>',balances:'<path d="M3 7h17v13H3zM3 7V5l14-2v4m0 5h4v4h-4z"/>',activity:'<rect x="4" y="3" width="16" height="18" rx="3"/><path d="m8 9 2 2 5-5M8 15h8m-8 3h5"/>',cash:'<path d="M3 7h18v14H3zM3 7l3-4h12l3 4M8 12h8m-4-3v9"/>',close:'<path d="m6 6 12 12M18 6 6 18"/>',play:'<path d="m8 5 11 7-11 7z"/>',stop:'<rect x="5" y="5" width="14" height="14" rx="2"/>',follow:'<path d="M12 3v14m-5-5 5 5 5-5M4 20h16"/>',download:'<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>',retry:'<path d="M20 7v5h-5M4 17v-5h5M6 7a7 7 0 0 1 12-1l2 3M4 15l2 3a7 7 0 0 0 12-1"/>'};
  paths.pause='<path d="M8 5v14M16 5v14"/>';paths.minimize='<path d="M5 12h14"/>';
  const node=(tag,className,text)=>{const n=document.createElement(tag);if(className)n.className=className;if(text!=null)n.textContent=text;return n;};
  function icon(name){const n=node('span','wf-report-symbol');n.setAttribute('aria-hidden','true');n.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">'+(paths[name]||paths.report)+'</svg>';return n;}
  const sheet=node('section','wf-robot-report-sheet');sheet.id='wfRobotReportSheet';sheet.hidden=true;sheet.setAttribute('role','region');sheet.setAttribute('aria-labelledby','wfRobotReportTitle');sheet.tabIndex=-1;
  const toolbar=node('div','wf-report-toolbar');
  const minimize=node('button','wf-report-minimize'),minimizeText=node('span');
  const close=node('button','wf-report-close'),closeText=node('span');
  for(const button of [minimize,close])button.type='button';
  minimize.append(icon('minimize'),minimizeText);close.append(icon('close'),closeText);
  const head=node('header','wf-report-header'),titleWrap=node('div','wf-report-title-wrap');
  const identity=node('span','wf-report-identity'),title=node('h2','',copy.ar.title),date=node('small');
  toolbar.append(identity,minimize,close);
  const status=node('p','wf-report-status');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
  const speedWrap=node('div','wf-report-speed'),speedLabel=node('span'),speedControls=node('div','wf-report-rate-controls');
  const speedDown=node('button','wf-report-rate-down','−'),speed=node('output','wf-report-rate'),speedUp=node('button','wf-report-rate-up','+');
  speedLabel.id='wfReportRateLabel';speedWrap.setAttribute('role','group');speedWrap.setAttribute('aria-labelledby',speedLabel.id);
  speedDown.type=speedUp.type='button';speedControls.dir='ltr';speedControls.append(speedDown,speed,speedUp);speedWrap.append(speedLabel,speedControls);
  speed.setAttribute('aria-labelledby',speedLabel.id);speed.setAttribute('aria-live','polite');speed.setAttribute('aria-atomic','true');
  function readingRate(state){
    const value=Number(state?.rate ?? window.WFRobotSettings?.getPreferences?.().speechRate ?? 1);
    return Number.isFinite(value)?Math.max(.75,Math.min(1.25,Math.round(value*20)/20)):1;
  }
  function syncRate(state=window.WFProgramSpeech?.getState?.()){
    const rate=readingRate(state),disabled=typeof window.WFProgramSpeech?.setRate!=='function' || !!state?.active && state.kind!=='report';
    const text=new Intl.NumberFormat(locale,{maximumFractionDigits:2}).format(rate)+'×';speed.dataset.rate=String(rate);
    if(speed.textContent!==text)speed.textContent=text;
    speedWrap.setAttribute('aria-disabled',String(disabled));speedDown.disabled=disabled||rate<=.75;speedUp.disabled=disabled||rate>=1.25;
  }
  function changeRate(delta){
    const owner=window.WFProgramSpeech,state=owner?.getState?.();
    const rate=readingRate(state),next=Math.max(.75,Math.min(1.25,Math.round((rate+delta)*20)/20));
    if(next!==rate&&(!state?.active || state.kind==='report'))owner?.setRate?.(next);
    syncRate();
  }
  speedDown.addEventListener('click',()=>{if(!speedDown.disabled)changeRate(-.05);});
  speedUp.addEventListener('click',()=>{if(!speedUp.disabled)changeRate(.05);});
  title.id='wfRobotReportTitle';titleWrap.append(title,date,status);head.append(titleWrap,speedWrap);
  const progress=node('div','wf-report-progress');progress.setAttribute('aria-hidden','true');progress.append(node('span'));
  const body=node('div','wf-report-body');body.tabIndex=0;
  const voiceSetup=node('section','wf-report-voice'),voiceContent=node('div','wf-report-voice-content'),voiceTitleRow=node('div','wf-report-voice-title'),voiceTitle=node('strong'),voicePercent=node('bdi','wf-report-voice-percent'),voiceHint=node('p'),voiceMeter=node('div','wf-report-voice-meter');
  voiceSetup.hidden=true;voiceTitleRow.append(voiceTitle,voicePercent);voiceContent.append(voiceTitleRow,voiceHint,voiceMeter);voiceSetup.append(icon('download'),voiceContent);voiceMeter.append(node('span'));voiceMeter.setAttribute('role','progressbar');voiceMeter.setAttribute('aria-valuemin','0');voiceMeter.setAttribute('aria-valuemax','100');voiceTitle.setAttribute('role','status');voiceTitle.setAttribute('aria-live','polite');
  const footer=node('div','wf-report-footer'),play=node('button','wf-report-play'),playText=node('span'),stop=node('button','wf-report-stop'),stopText=node('span'),follow=node('button','wf-report-follow'),followText=node('span');play.type=stop.type=follow.type='button';play.append(icon('play'),playText);stop.append(icon('stop'),stopText);follow.append(icon('follow'),followText);footer.append(play,stop,follow);
  body.append(voiceSetup);sheet.append(toolbar,head,footer,progress,body);card.append(sheet);
  let locale='ar',segments=[],paragraphs=[],active=-1,following=true,speechState='ready',returnFocus=null,closing=0,frame=0,snapshot=null,pendingPlayback={state:'ready'};
  const voiceStates=new Map();
  let preparation=null,minimized=false,cardAnimation=null;
  const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches||document.documentElement.dataset.wfMotion==='reduced';
  const control=action=>window.dispatchEvent(new CustomEvent('wf-robot-report-control',{detail:{action}}));
  function labels(){return copy[locale]||copy.en;}
  function setState(state,reason){
    speechState=state;const L=labels(),voice=voiceStates.get(locale),setup=voiceSetupFor(voice,locale),action=reportControlAction(voice?.state,state);
    const owner=window.WFProgramSpeech?.getState?.(),silent=owner?.state==='disabled'||owner?.state==='muted';
    sheet.dataset.playback=setup.visible?'ready':state;sheet.dataset.voice=voice?.state||'ready';
    const progressText=state==='preparing'&&preparation?' · '+preparation.completed+'/'+preparation.total:'';
    const statusText=(silent?L[owner.state]:setup.visible?L.ready:reason||L[state]||L.ready)+progressText;if(status.textContent!==statusText)status.textContent=statusText;
    voiceSetup.hidden=!setup.visible;
    if(setup.visible){
      voiceSetup.dataset.state=voice.state;voiceSetup.setAttribute('aria-label',setup.label);
      if(voiceTitle.textContent!==setup.title)voiceTitle.textContent=setup.title;
      voiceHint.textContent=setup.hint;voicePercent.hidden=voiceMeter.hidden=!setup.showProgress;
      voicePercent.textContent=setup.progressText;voiceMeter.setAttribute('aria-label',setup.title);voiceMeter.setAttribute('aria-valuenow',String(setup.progress));voiceMeter.firstElementChild.style.width=setup.progress+'%';
      for(const paragraph of paragraphs){paragraph.classList.remove('is-reading');paragraph.removeAttribute('aria-current');}active=-1;progress.firstElementChild.style.width='0%';
    }
    const actionText=setup.visible?setup.actionLabel:action==='pause'?L.pause:action==='resume'?L.resume:state==='ready'?L.read:L.replay,actionIcon=setup.visible?setup.actionIcon:action==='pause'?'pause':'play';
    if(playText.textContent!==actionText)playText.textContent=actionText;
    if(play.dataset.icon!==actionIcon){play.firstElementChild.replaceWith(icon(actionIcon));play.dataset.icon=actionIcon;}
    play.disabled=!segments.length||action===null||silent;followText.textContent=following?L.follow:L.manual;follow.setAttribute('aria-pressed',String(following));
    stopText.textContent=L.stop;stop.disabled=!['preparing','speaking','paused'].includes(state);
    if(state==='finished'&&!setup.visible)progress.firstElementChild.style.width='100%';
  }
  function readingBounds(){
    const viewport=window.visualViewport,top=viewport?.offsetTop||0,bottom=top+(viewport?.height||innerHeight);
    const navbar=document.querySelector('.navbar')?.getBoundingClientRect();
    const bottomNav=document.querySelector('#bottomNav')?.getBoundingClientRect();
    return {top:Math.max(top,navbar?.height&&navbar.bottom<bottom/2?navbar.bottom:top)+20,
      bottom:Math.min(bottom,bottomNav?.height&&bottomNav.top>top?bottomNav.top:bottom)-20};
  }
  function revealHeading(){
    frame=0;if(sheet.hidden||sheet.classList.contains('is-closing'))return;
    const bounds=readingBounds(),rect=head.getBoundingClientRect();
    head.style.setProperty('--wf-report-scroll-top',bounds.top+'px');
    if(rect.top<bounds.top||rect.bottom>bounds.bottom)head.scrollIntoView?.({block:'start',behavior:reduced()?'auto':'smooth'});
  }
  function animateCard(from,to,duration){
    cardAnimation?.cancel();cardAnimation=null;
    if(reduced()||!card.animate||Math.abs(from-to)<1)return;
    const animation=card.animate([{height:from+'px'},{height:to+'px'}],{duration,easing:'cubic-bezier(.22,.8,.22,1)'});
    cardAnimation=animation;
    animation.finished.then(()=>{if(cardAnimation===animation){cardAnimation=null;animation.cancel();}}).catch(()=>{});
  }
  function open(detail){
    if(!detail?.snapshot)return;
    if(detail.reveal!==false){clearTimeout(closing);sheet.classList.remove('is-closing');}
    snapshot=detail.snapshot;locale=copy[detail.locale]?detail.locale:'en';segments=segmentsFor(snapshot);paragraphs=[];active=-1;following=true;
    const L=labels();sheet.lang=locale;sheet.dir=locale==='ar'?'rtl':'ltr';title.textContent=L.title;minimizeText.textContent=L.collapse;minimize.title=L.keepReading;minimize.setAttribute('aria-label',L.keepReading);
    closeText.textContent=windowLabels[locale][1];close.title=windowLabels[locale][2];close.setAttribute('aria-label',close.title);body.setAttribute('aria-label',L.written);
    speedLabel.textContent=rateLabels[locale];
    speedDown.title=rateActions[locale][0];speedDown.setAttribute('aria-label',speedDown.title);
    speedUp.title=rateActions[locale][1];speedUp.setAttribute('aria-label',speedUp.title);
    identity.textContent=document.querySelector('#wfGreetingRobot #wfRobotTitle span')?.textContent?.trim() || L.identity;
    try{date.textContent=L.date+' · '+new Intl.DateTimeFormat(locale,{dateStyle:'long',timeZone:'UTC'}).format(new Date(snapshot.date+'T12:00:00Z'));}catch(_){date.textContent=snapshot.date||'';}
    body.replaceChildren(voiceSetup);
    if(!segments.length){const warning=node('p','wf-report-empty',snapshot.unavailableReason||L.empty);body.append(warning);}
    else {
      const groups=segments.length<11?[['written',0,Infinity]]:[['today',0,4],['balances',4,6],['activity',6,9],['cash',9,Infinity]];
      for(const [name,start,end] of groups){
        if(start>=segments.length)continue;
        const group=node('section','wf-report-group');group.dataset.tone=name;
        const heading=node('h3');heading.append(icon(name),node('span','',L[name]));group.append(heading);
        for(let i=start;i<Math.min(end,segments.length);i++){
          const p=node('p','wf-report-sentence',segments[i].text);p.dataset.segment=String(i);paragraphs[i]=p;group.append(p);
        }
        body.append(group);
      }
    }
    progress.firstElementChild.style.width='0%';
    if(detail.reveal!==false)show();
    else if(!sheet.hidden){syncRate();setState(pendingPlayback.state||'ready',pendingPlayback.reason);}
  }
  function show(){
    if(!snapshot||!card.isConnected)return false;
    const dashboard=card.closest('.page');
    if(dashboard&&!dashboard.classList.contains('active')){
      window.showPage?.('dashboard');
      if(!dashboard.classList.contains('active'))return false;
      // The asynchronous page observer must recognize this explicit return,
      // rather than treating it as a request to fold the newly opened report.
      routePage=dashboard;
    }
    if(card.closest('[inert],[hidden]')){window.showToast?.(hiddenCardCopy[locale]||hiddenCardCopy.en,'in');return false;}
    const startHeight=card.getBoundingClientRect().height;
    clearTimeout(closing);closing=0;sheet.classList.remove('is-closing');
    minimized=false;const wasHidden=sheet.hidden;
    if(wasHidden)returnFocus=document.activeElement;
    sheet.hidden=false;sheet.inert=false;sheet.removeAttribute('aria-hidden');card.dataset.reportExpanded='true';
    document.documentElement.classList.add('wf-robot-report-open');
    syncRate();setState(pendingPlayback.state||'ready',pendingPlayback.reason);
    window.dispatchEvent(new CustomEvent('wf-robot-report-visibility',{detail:{open:true,locale,inline:true}}));
    if(wasHidden){
      animateCard(startHeight,card.getBoundingClientRect().height,260);
      minimize.focus({preventScroll:true});
      if(frame)cancelAnimationFrame(frame);frame=requestAnimationFrame(()=>{frame=0;if(active>=0&&following)followActive();else revealHeading();});
    }
    return true;
  }
  function dismiss(stopPlayback=false,restoreFocus=true){
    if(sheet.hidden||sheet.classList.contains('is-closing'))return false;
    const startHeight=card.getBoundingClientRect().height;
    minimized=!stopPlayback;
    if(stopPlayback){
      const owner=window.WFProgramSpeech,playback=owner?.getState?.();
      if(!playback || playback.kind==='report')owner?.stop?.();
    }
    // Folding keeps the same voice owner alive; Exit alone stops it. The header
    // controls stay available while the report returns into its original card.
    window.dispatchEvent(new CustomEvent('wf-robot-report-visibility',{detail:{open:false,minimized,locale,inline:true,transition:stopPlayback?'closing':'minimizing'}}));
    if(frame)cancelAnimationFrame(frame);frame=0;
    sheet.inert=true;sheet.setAttribute('aria-hidden','true');sheet.classList.add('is-closing');
    const collapsedHeight=document.querySelector('.wf-greeting-faces')?.getBoundingClientRect().height||0;
    animateCard(startHeight,collapsedHeight,230);
    clearTimeout(closing);closing=setTimeout(()=>{
      closing=0;sheet.hidden=true;sheet.inert=false;sheet.classList.remove('is-closing');delete card.dataset.reportExpanded;
      cardAnimation?.cancel();cardAnimation=null;document.documentElement.classList.remove('wf-robot-report-open');
      window.dispatchEvent(new CustomEvent('wf-robot-report-visibility',{detail:{open:false,minimized,locale,inline:true}}));
      const launcher=minimized?document.querySelector('#wfSpeechControlsReport'):null;
      const focusTarget=launcher?.isConnected&&!launcher.closest('[inert],[hidden]')?launcher:returnFocus;
      if(restoreFocus&&focusTarget?.isConnected&&!focusTarget.closest('[inert],[hidden]'))focusTarget.focus({preventScroll:true});
    },reduced()?0:230);
    return true;
  }
  function closeReader(){
    if(!sheet.hidden){dismiss(true);return true;}
    if(!minimized)return false;
    minimized=false;
    const owner=window.WFProgramSpeech,playback=owner?.getState?.();
    if(playback?.active&&playback.kind==='report')owner.stop?.();
    window.dispatchEvent(new CustomEvent('wf-robot-report-visibility',{detail:{open:false,minimized:false,locale}}));
    return true;
  }
  function followActive(){
    const paragraph=paragraphs[active];if(!paragraph||!following||sheet.hidden)return;
    const r=paragraph.getBoundingClientRect(),bounds=readingBounds();
    if(r.top<bounds.top||r.bottom>bounds.bottom)window.scrollBy?.({top:r.top-bounds.top,behavior:reduced()?'auto':'smooth'});
  }
  function boundary(detail){
    if(!snapshot||voiceSetupFor(voiceStates.get(locale),locale).visible)return;
    const index=Number(detail?.charIndex),found=segmentAt(segments,index);if(found<0)return;
    const length=Number(detail?.charLength),end=Math.min(snapshot.narration.length,index+(Number.isFinite(length)&&length>0?length:1));
    for(let i=0;i<paragraphs.length;i++){
      paragraphs[i].classList.toggle('is-reading',segments[i].start<end&&segments[i].end>index);
      if(i===found)paragraphs[i].setAttribute('aria-current','true');else paragraphs[i].removeAttribute('aria-current');
    }
    if(found!==active){active=found;followActive();}
    progress.firstElementChild.style.width=Math.min(100,Math.max(0,index/Math.max(1,snapshot.narration.length)*100))+'%';
  }
  function manual(event){if(event.isTrusted&&!sheet.hidden){following=false;followText.textContent=labels().manual;follow.setAttribute('aria-pressed','false');}}
  body.addEventListener('wheel',manual,{passive:true});body.addEventListener('touchstart',manual,{passive:true});body.addEventListener('pointerdown',manual);
  body.addEventListener('keydown',event=>{if(['ArrowDown','ArrowUp','PageDown','PageUp','Home','End',' '].includes(event.key))manual(event);});
  window.addEventListener('wheel',manual,{passive:true});window.addEventListener('touchstart',manual,{passive:true});
  follow.addEventListener('click',()=>{following=true;followText.textContent=labels().follow;follow.setAttribute('aria-pressed','true');followActive();});
  play.addEventListener('click',event=>{if(event.isTrusted!==true||play.disabled)return;const action=reportControlAction(voiceStates.get(locale)?.state,speechState);if(action==='pause'||action==='resume')window.WFProgramSpeech?.[action]?.();else if(action)control(action);});
  stop.addEventListener('click',()=>window.WFProgramSpeech?.stop?.());
  minimize.addEventListener('click',()=>dismiss(false));close.addEventListener('click',()=>dismiss(true));
  // Report text is part of the card, but never a carousel-next or speech action.
  sheet.addEventListener('click',event=>event.stopPropagation());
  card.addEventListener('click',event=>{
    if(sheet.hidden||sheet.contains(event.target))return;
    if(!event.target?.closest?.('button,a,input,select,textarea,summary,[role="button"],[role="link"],[contenteditable="true"]'))event.stopImmediatePropagation();
  },true);
  card.addEventListener('keydown',event=>{
    if(!sheet.hidden&&event.target===card&&['ArrowDown','ArrowUp','ArrowRight','ArrowLeft','Home','End','Enter',' '].includes(event.key))event.stopImmediatePropagation();
  },true);
  document.addEventListener('keydown',event=>{
    if(sheet.hidden||sheet.classList.contains('is-closing'))return;
    if(event.key==='Escape'&&sheet.contains(document.activeElement)){event.preventDefault();dismiss(false);}
  });
  window.addEventListener('wf-robot-report-open',event=>{preparation=null;open(event.detail);});
  window.addEventListener('wf-robot-report-show',show);
  window.addEventListener('wf-robot-report-playback',event=>{pendingPlayback={state:event.detail?.state||'ready',reason:event.detail?.reason};if(!sheet.hidden)setState(pendingPlayback.state,pendingPlayback.reason);});
  window.addEventListener('wf-robot-report-preparation',event=>{
    const {completed,total}=event.detail||{};
    if(!Number.isInteger(completed)||!Number.isInteger(total)||total<1||total>160||completed<0||completed>total)return;
    preparation={completed,total};if(!sheet.hidden&&pendingPlayback.state==='preparing')setState('preparing');
  });
  window.addEventListener('wf-robot-report-voice',event=>{
    const language=reportLocale(event.detail?.locale,locale),voice=reportVoiceState(event.detail,voiceStates.get(language));if(!voice)return;
    voiceStates.set(language,voice);if(language===locale&&!sheet.hidden)setState(pendingPlayback.state,pendingPlayback.reason);
  });
  window.addEventListener('wf-program-speech-state',event=>{if(!sheet.hidden){syncRate(event.detail);setState(pendingPlayback.state||'ready',pendingPlayback.reason);}});
  window.addEventListener('wf-robot-report-boundary',event=>boundary(event.detail));
  window.addEventListener('pagehide',()=>dismiss(false,false));window.addEventListener('hashchange',()=>dismiss(false,false));
  // The persistent speech toolbar also uses these colors outside #mainContent.
  let materialFrame=0;
  function materialSignature(){
    const root=document.documentElement;
    const style=(root.getAttribute('style')||'').split(';').map(value=>value.trim()).filter(value=>value&&!/^--wf-scroll-progress\s*:/.test(value)).join(';');
    return (root.getAttribute('data-theme')||'')+'|'+style;
  }
  let lastMaterialSignature=materialSignature();
  function syncCardMaterials(){
    materialFrame=0;
    const workspace=document.querySelector('#mainContent');
    if(!workspace)return;
    const styles=getComputedStyle(workspace);
    for(const token of ['paper','wash','canvas','hairline','ink']){
      const value=styles.getPropertyValue?.('--'+token).trim();
      if(value&&document.body.style.getPropertyValue('--wf-reader-'+token)!==value)document.body.style.setProperty('--wf-reader-'+token,value);
    }
  }
  syncCardMaterials();
  new MutationObserver(()=>{
    // Scroll progress also lives on the root style. It must not re-read the
    // whole workspace's computed palette on every scrolling frame.
    const signature=materialSignature();if(signature===lastMaterialSignature)return;
    lastMaterialSignature=signature;
    if(!materialFrame)materialFrame=requestAnimationFrame(syncCardMaterials);
  }).observe(document.documentElement,{attributes:true,attributeFilter:['data-theme','style']});
  const main=document.querySelector('#mainContent');let routePage=document.querySelector('.page.active');
  if(main)new MutationObserver(records=>{
    // Highlighted report sentences, carousel states and row selection classes
    // do not change the current page and need no document-wide route lookup.
    if(!records.some(record=>record.target.classList?.contains('page')))return;
    const next=document.querySelector('.page.active');if(next!==routePage){routePage=next;dismiss(false,false);}
  }).observe(main,{attributes:true,subtree:true,attributeFilter:['class']});
  new MutationObserver(()=>{if(card.closest('[inert],[hidden]'))dismiss(false,false);}).observe(card,{attributes:true,attributeFilter:['hidden','inert']});
  new MutationObserver(()=>{if(!sheet.hidden&&document.documentElement.lang!==locale)dismiss(false,false);}).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
  window.WFRobotReport=Object.freeze({show,minimize:()=>dismiss(false),close:closeReader,hasReport:()=>!!snapshot,isMinimized:()=>minimized,isOpen:()=>!sheet.hidden&&!sheet.classList.contains('is-closing')});
})();
