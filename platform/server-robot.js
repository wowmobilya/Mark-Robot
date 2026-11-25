(() => {
  'use strict';

  const copy={
    ar:{
      center:"مركز وكلاء مارك",
      serverAgent:"وكيل مراقبة السيرفر",
      agents:"وكلاء الشركة",
      runCompany:"تشغيل فحص الشركة",
      accountAgent:"الحسابات والاشتراك",
      deviceAgent:"الأجهزة",
      storageAgent:"التخزين",
      expired:"انتهى الاشتراك",
      soon:"ينتهي الاشتراك خلال ٧ أيام",
      noPlan:"لا توجد باقة معيّنة",
      expires:"تاريخ الانتهاء",
      accounts:"الحسابات",
      used:"المستخدم من السعة",
      full:"وصل الاستخدام إلى الحد",
      nearly:"تجاوز الاستخدام ٨٠٪ من السعة",
      registered:"الأجهزة المسجلة",
      deviceLink:"فتح أجهزة الشركة",
      companyLink:"عرض الشركة",
      outdated:"آخر تقرير مضى عليه أكثر من ١٥ دقيقة. حدّث القراءة.",
      staleState:"القراءة قديمة",
      again:"فحص الشركة مجددًا",
      source:"آخر قراءة من السيرفر",
      directory:"الشركات المسجّلة",
      partial:"الخادم يستجيب، وتعذّر تحديث تقرير المراقبة.",
      last:"آخر تقرير ناجح",
      older:"القراءات أدناه من التقرير السابق. اضغط تحديث للمحاولة مجددًا.",
      today:"أعطال التشغيل خلال ٢٤ ساعة",
      normal:"اكتمل فحص المراقبة دون تنبيهات نشطة.",
      review:"ما الذي يحتاج متابعة؟",
      schedulerOff:"الفحص الدوري للشركات متوقف. راجع إعداد المهمة المجدولة على السيرفر.",
      pushOff:"إرسال الإشعارات متوقف. راجع إعدادات خدمة الإشعارات على السيرفر.",
      backlog:"تأخّر إرسال الإشعارات. راجع طابور الإرسال.",
      staleJobs:"لم يكتمل الفحص الدوري لبعض الشركات في آخر ١٥ دقيقة.",
      other:"افتح تفاصيل الأعطال أدناه لمراجعة السبب.",
      issue:"عطل مسجّل",
      failedPush:"تعذّر تسليم بعض الإشعارات.",
      pushSchedule:"توقيت إرسال الإشعارات يحتاج إلى مراجعة.",
      rls:"تحتاج حماية الوصول إلى البيانات إلى مراجعة.",
      title:'مارك روبوت',server:'تقرير الخادم',idle:'جاهز لفحص الخادم',checking:'جارٍ فحص الخادم…',ready:'الخادم يستجيب',
      attention:'الخادم يستجيب وتوجد حالات تحتاج متابعة',unavailable:'الخادم أبلغ عن عدم الجاهزية',unreachable:'تعذّر الوصول إلى الخادم من هذا الجهاز',
      unverified:'تعذّر التحقق من استجابة الخادم',checked:'آخر فحص',updated:'جُلب التقرير في',refresh:'تحديث حالة الخادم',
      unknown:'غير متاح',latency:'زمن استجابة فحص السيرفر',freeStorage:'المتبقي من حصة التخزين',database:'حجم قاعدة البيانات',connections:'اتصالات قاعدة البيانات',scheduler:'آخر تشغيل للمجدول',
      pending:'إشعارات معلّقة',overdue:'إشعارات متأخرة',stale:'شركات تأخرت مهامها المجدولة',
      incidents:'حالات نشطة',failures:'الأعطال الأخيرة',monitoring:'بيانات مراقبة الخادم غير متاحة.',
      company:'تقرير شركة',select:'اختر شركة',empty:'لا توجد شركات في هذه الصفحة.',previous:'السابق',next:'التالي',
      companyLoading:'جارٍ قراءة استهلاك الشركة…',companyError:'تعذّر قراءة تقرير هذه الشركة.',active:'شركة نشطة',suspended:'شركة موقوفة',
      storage:'تخزين الملفات',phones:'هواتف الموظفين',voice:'دقائق الصوت',video:'دقائق الفيديو',
      month:'دقائق المكالمات للشهر الحالي بتوقيت UTC.',details:'افتح تفاصيل الاستهلاك'
    },
    en:{
      center:"Mark agent center",
      serverAgent:"Server monitor",
      agents:"Company agents",
      runCompany:"Run company check",
      accountAgent:"Accounts and subscription",
      deviceAgent:"Devices",
      storageAgent:"Storage",
      expired:"Subscription expired",
      soon:"Subscription ends within 7 days",
      noPlan:"No plan assigned",
      expires:"Expires",
      accounts:"Accounts",
      used:"Capacity used",
      full:"Usage has reached the limit",
      nearly:"Over 80% of capacity used",
      registered:"Registered devices",
      deviceLink:"Open company devices",
      companyLink:"Open company",
      outdated:"The report is over 15 minutes old. Refresh for current readings.",
      staleState:"Report is out of date",
      again:"Run company check again",
      source:"Last read from the server",
      directory:"Registered companies",
      partial:"Server responded. Monitoring could not be refreshed.",
      last:"Last successful report",
      older:"Showing the previous readings. Refresh to try again.",
      today:"Failed scheduled runs in 24 hours",
      normal:"Monitoring completed with no active alerts.",
      review:"What needs attention?",
      schedulerOff:"Scheduled checks are off. Review the server scheduler.",
      pushOff:"Notifications are switched off. Review the server notification settings.",
      backlog:"Notifications are overdue. Review the delivery queue.",
      staleJobs:"Some companies have missed their scheduled check in the last 15 minutes.",
      other:"Open the failure details below to review the cause.",
      issue:"Recorded failure",
      failedPush:"Some notifications could not be delivered.",
      pushSchedule:"The notification schedule needs review.",
      rls:"Data access protection needs review.",
      title:'Mark Robot',server:'Server report',idle:'Ready to check the server',checking:'Checking the server…',ready:'Server responded',
      attention:'Server responded. Some items need attention.',unavailable:'The server reported that it is unavailable',unreachable:'Could not reach the server from this device',
      unverified:'Could not verify the server response',checked:'Last checked',updated:'Report fetched',refresh:'Refresh server status',
      unknown:'Unavailable',latency:'Health request latency',freeStorage:'Storage quota remaining',database:'Database size',connections:'Database connections',scheduler:'Last scheduled run',
      pending:'Pending notifications',overdue:'Overdue notifications',stale:'Companies with stale scheduled jobs',
      incidents:'Active incidents',failures:'Recent failures',monitoring:'Server monitoring details are unavailable.',
      company:'Company report',select:'Select a company',empty:'No companies on this page.',previous:'Previous',next:'Next',
      companyLoading:'Reading company usage…',companyError:'Could not load this company’s report.',active:'Active company',suspended:'Suspended company',
      storage:'File storage',phones:'Staff phones',voice:'Voice minutes',video:'Video minutes',
      month:'Call minutes cover the current UTC month.',details:'Open usage details'
    },
    tr:{
      center:"Mark aracı merkezi",
      serverAgent:"Sunucu izleme aracı",
      agents:"Şirket araçları",
      runCompany:"Şirket kontrolünü çalıştır",
      accountAgent:"Hesaplar ve abonelik",
      deviceAgent:"Cihazlar",
      storageAgent:"Depolama",
      expired:"Abonelik sona erdi",
      soon:"Abonelik 7 gün içinde sona eriyor",
      noPlan:"Paket atanmamış",
      expires:"Bitiş tarihi",
      accounts:"Hesaplar",
      used:"Kullanılan kapasite",
      full:"Kullanım sınıra ulaştı",
      nearly:"Kapasitenin %80’inden fazlası kullanıldı",
      registered:"Kayıtlı cihazlar",
      deviceLink:"Şirket cihazlarını aç",
      companyLink:"Şirketi aç",
      outdated:"Rapor 15 dakikadan eski. Güncel veriler için yenileyin.",
      staleState:"Rapor güncel değil",
      again:"Şirket kontrolünü tekrarla",
      source:"Sunucudan son okuma",
      directory:"Kayıtlı şirketler",
      partial:"Sunucu yanıt verdi. İzleme raporu güncellenemedi.",
      last:"Son başarılı rapor",
      older:"Önceki ölçümler gösteriliyor. Tekrar denemek için yenileyin.",
      today:"Son 24 saatte başarısız görevler",
      normal:"İzleme tamamlandı. Etkin uyarı yok.",
      review:"Neyi kontrol etmeliyim?",
      schedulerOff:"Zamanlanmış kontroller kapalı. Sunucunun görev zamanlayıcısını kontrol edin.",
      pushOff:"Bildirim gönderimi kapalı. Sunucunun bildirim ayarlarını kontrol edin.",
      backlog:"Bildirimler gecikiyor. Gönderim kuyruğunu kontrol edin.",
      staleJobs:"Bazı şirketlerin son 15 dakika içindeki zamanlanmış kontrolü tamamlanmadı.",
      other:"Nedeni incelemek için aşağıdaki hata ayrıntılarını açın.",
      issue:"Kaydedilen hata",
      failedPush:"Bazı bildirimler teslim edilemedi.",
      pushSchedule:"Bildirim zamanlaması kontrol edilmeli.",
      rls:"Veri erişim koruması kontrol edilmeli.",
      title:'Mark Robot',server:'Sunucu raporu',idle:'Sunucu denetlenebilir',checking:'Sunucu denetleniyor…',ready:'Sunucu yanıt verdi',
      attention:'Sunucu yanıt verdi. Bazı durumlar incelenmeli.',unavailable:'Sunucu hizmetin kullanılamadığını bildirdi',unreachable:'Bu cihazdan sunucuya ulaşılamadı',
      unverified:'Sunucu yanıtı doğrulanamadı',checked:'Son denetim',updated:'Rapor alındı',refresh:'Sunucu durumunu yenile',
      unknown:'Kullanılamıyor',latency:'Sağlık isteği gecikmesi',freeStorage:'Kalan depolama kotası',database:'Veritabanı boyutu',connections:'Veritabanı bağlantıları',scheduler:'Son zamanlanmış çalışma',
      pending:'Bekleyen bildirimler',overdue:'Geciken bildirimler',stale:'Zamanlanmış işi geciken şirketler',
      incidents:'Etkin olaylar',failures:'Son hatalar',monitoring:'Sunucu izleme ayrıntıları kullanılamıyor.',
      company:'Şirket raporu',select:'Şirket seçin',empty:'Bu sayfada şirket yok.',previous:'Önceki',next:'Sonraki',
      companyLoading:'Şirket kullanımı okunuyor…',companyError:'Bu şirketin raporu yüklenemedi.',active:'Etkin şirket',suspended:'Askıya alınmış şirket',
      storage:'Dosya depolama',phones:'Personel telefonları',voice:'Sesli arama dakikası',video:'Videolu arama dakikası',
      month:'Arama dakikaları geçerli UTC ayına aittir.',details:'Kullanım ayrıntılarını aç'
    },
    fr:{
      center:"Centre des agents Mark",
      serverAgent:"Agent de surveillance du serveur",
      agents:"Agents de l’entreprise",
      runCompany:"Vérifier l’entreprise",
      accountAgent:"Comptes et abonnement",
      deviceAgent:"Appareils",
      storageAgent:"Stockage",
      expired:"Abonnement expiré",
      soon:"L’abonnement expire dans 7 jours ou moins",
      noPlan:"Aucun forfait attribué",
      expires:"Expiration",
      accounts:"Comptes",
      used:"Capacité utilisée",
      full:"La limite est atteinte",
      nearly:"Plus de 80 % de la capacité utilisée",
      registered:"Appareils enregistrés",
      deviceLink:"Ouvrir les appareils",
      companyLink:"Ouvrir l’entreprise",
      outdated:"Le rapport date de plus de 15 minutes. Actualisez les mesures.",
      staleState:"Rapport ancien",
      again:"Relancer la vérification",
      source:"Dernière lecture du serveur",
      directory:"Entreprises enregistrées",
      partial:"Le serveur répond. Le rapport de suivi n’a pas pu être actualisé.",
      last:"Dernier rapport reçu",
      older:"Les mesures précédentes sont affichées. Actualisez pour réessayer.",
      today:"Exécutions en échec sur 24 h",
      normal:"Contrôle terminé sans alerte active.",
      review:"Que faut-il vérifier ?",
      schedulerOff:"Les contrôles périodiques sont désactivés. Vérifiez le planificateur du serveur.",
      pushOff:"Les notifications sont désactivées. Vérifiez leur configuration sur le serveur.",
      backlog:"Des notifications sont en retard. Vérifiez la file d’envoi.",
      staleJobs:"Certaines entreprises n’ont pas été contrôlées dans les 15 dernières minutes.",
      other:"Consultez le détail des incidents ci-dessous.",
      issue:"Échec enregistré",
      failedPush:"Certaines notifications n’ont pas été livrées.",
      pushSchedule:"La planification des notifications est à vérifier.",
      rls:"La protection de l’accès aux données est à vérifier.",
      title:'Robot Mark',server:'Rapport serveur',idle:'Prêt à vérifier le serveur',checking:'Vérification du serveur…',ready:'Le serveur a répondu',
      attention:'Le serveur a répondu. Certains éléments sont à vérifier.',unavailable:'Le serveur a signalé son indisponibilité',unreachable:'Le serveur est inaccessible depuis cet appareil',
      unverified:'Impossible de vérifier la réponse du serveur',checked:'Dernière vérification',updated:'Rapport récupéré',refresh:'Actualiser le serveur',
      unknown:'Indisponible',latency:'Latence de la vérification',freeStorage:'Quota de stockage restant',database:'Taille de la base',connections:'Connexions à la base',scheduler:'Dernière exécution planifiée',
      pending:'Notifications en attente',overdue:'Notifications en retard',stale:'Sociétés avec tâches planifiées en retard',
      incidents:'Incidents actifs',failures:'Échecs récents',monitoring:'Les détails de surveillance du serveur sont indisponibles.',
      company:'Rapport société',select:'Choisir une société',empty:'Aucune société sur cette page.',previous:'Précédent',next:'Suivant',
      companyLoading:'Lecture de la consommation…',companyError:'Impossible de charger le rapport.',active:'Société active',suspended:'Société suspendue',
      storage:'Stockage de fichiers',phones:'Téléphones du personnel',voice:'Minutes audio',video:'Minutes vidéo',
      month:'Les minutes concernent le mois UTC en cours.',details:'Ouvrir les détails de consommation'
    },
    ru:{
      center:"Центр агентов Mark",
      serverAgent:"Монитор сервера",
      agents:"Агенты компании",
      runCompany:"Проверить компанию",
      accountAgent:"Аккаунты и подписка",
      deviceAgent:"Устройства",
      storageAgent:"Хранилище",
      expired:"Подписка закончилась",
      soon:"Подписка истекает в течение 7 дней",
      noPlan:"Тариф не назначен",
      expires:"Окончание",
      accounts:"Аккаунты",
      used:"Использовано",
      full:"Лимит достигнут",
      nearly:"Использовано более 80 %",
      registered:"Зарегистрированные устройства",
      deviceLink:"Устройства компании",
      companyLink:"Открыть компанию",
      outdated:"Отчёт старше 15 минут. Обновите показания.",
      staleState:"Устаревший отчёт",
      again:"Повторить проверку компании",
      source:"Последнее получение с сервера",
      directory:"Зарегистрированные компании",
      partial:"Сервер ответил. Данные мониторинга обновить не удалось.",
      last:"Последний успешный отчёт",
      older:"Показаны предыдущие данные. Обновите отчёт ещё раз.",
      today:"Сбои задач за 24 часа",
      normal:"Проверка завершена. Активных предупреждений нет.",
      review:"Что требует внимания?",
      schedulerOff:"Регулярные проверки отключены. Проверьте планировщик сервера.",
      pushOff:"Отправка уведомлений отключена. Проверьте настройки уведомлений сервера.",
      backlog:"Уведомления задерживаются. Проверьте очередь отправки.",
      staleJobs:"У некоторых компаний не прошла плановая проверка за последние 15 минут.",
      other:"Откройте сведения о сбоях ниже.",
      issue:"Зарегистрированный сбой",
      failedPush:"Часть уведомлений не доставлена.",
      pushSchedule:"Проверьте расписание отправки уведомлений.",
      rls:"Проверьте защиту доступа к данным.",
      title:'Робот Mark',server:'Отчёт сервера',idle:'Готов к проверке сервера',checking:'Проверка сервера…',ready:'Сервер ответил',
      attention:'Сервер ответил. Некоторые события требуют внимания.',unavailable:'Сервер сообщил о недоступности',unreachable:'Сервер недоступен с этого устройства',
      unverified:'Ответ сервера не удалось проверить',checked:'Последняя проверка',updated:'Отчёт получен',refresh:'Обновить состояние сервера',
      unknown:'Нет данных',latency:'Задержка проверки сервера',freeStorage:'Остаток квоты хранилища',database:'Размер базы данных',connections:'Подключения к базе',scheduler:'Последний запуск по расписанию',
      pending:'Ожидающие уведомления',overdue:'Просроченные уведомления',stale:'Компании с просроченными заданиями',
      incidents:'Активные инциденты',failures:'Последние ошибки',monitoring:'Сведения мониторинга сервера недоступны.',
      company:'Отчёт компании',select:'Выберите компанию',empty:'На этой странице нет компаний.',previous:'Назад',next:'Далее',
      companyLoading:'Загрузка данных компании…',companyError:'Не удалось загрузить отчёт компании.',active:'Компания активна',suspended:'Компания приостановлена',
      storage:'Хранилище файлов',phones:'Телефоны сотрудников',voice:'Минуты аудио',video:'Минуты видео',
      month:'Минуты за текущий месяц UTC.',details:'Открыть подробный расход'
    }
  };
  const make=(tag,cls,text)=>{
    const node=document.createElement(tag);
    if(cls)node.className=cls;
    if(text!==undefined)node.textContent=text;
    return node;
  };
  const icons={
    server:'<rect x="3" y="3" width="18" height="7" rx="2"/><rect x="3" y="14" width="18" height="7" rx="2"/><path d="M7 6.5h.01M7 17.5h.01M12 7h5M12 18h5"/>',
    companies:'<path d="M4 21V4h11v17M15 10h5v11M2 21h20M7 8h1m3 0h1m-5 4h1m3 0h1m-5 4h1m3 0h1"/>',
    accounts:'<circle cx="9" cy="8" r="3"/><path d="M3 20v-2a6 6 0 0 1 12 0v2M16 7a3 3 0 0 1 0 6m2 2a5 5 0 0 1 3 5"/>',
    devices:'<rect x="3" y="3" width="15" height="12" rx="2"/><path d="M9 15v4m-4 1h7"/><rect x="14" y="9" width="7" height="12" rx="2"/>',
    storage:'<path d="M3 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/>',
    refresh:'<path d="M20 6v5h-5M4 18v-5h5"/><path d="M6 7a7 7 0 0 1 12-1l2 3M4 15l2 3a7 7 0 0 0 12-1"/>',
    ready:'<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>',
    attention:'<path d="m12 3 10 18H2Z"/><path d="M12 9v5m0 3h.01"/>',
    time:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    offline:'<path d="m3 3 18 18M3 9a14 14 0 0 1 3-2m4-1a15 15 0 0 1 11 3M6 13a10 10 0 0 1 5-2m5 1 2 1m-9 4a5 5 0 0 1 6 0m-3 3h.01"/>',
    unknown:'<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 4 2c-1.5 1-1.5 1.5-1.5 3m0 3h.01"/>'
  };
  function icon(name){
    const node=document.createElementNS('http://www.w3.org/2000/svg','svg');
    node.setAttribute('class','platform-agent-icon');node.setAttribute('viewBox','0 0 24 24');
    node.setAttribute('aria-hidden','true');node.setAttribute('focusable','false');
    node.innerHTML=icons[name];return node;
  }
  function titled(tag,cls,label,glyph){
    const node=make(tag,cls,label);node.prepend(icon(glyph));return node;
  }
  const uuid=/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
  const quantity=value=>Number.isFinite(value)&&value>=0;
  const parseTime=value=>typeof value==='string'&&Number.isFinite(Date.parse(value))?new Date(value):null;
  const companyRows=value=>Array.isArray(value)?value.filter(row=>uuid.test(row?.id)&&typeof row.name==='string'&&row.name.trim()):[];

  function makeFace(){
    const face=make('div','platform-server-robot-face');
    face.setAttribute('aria-hidden','true');
    // The original Mark Robot's eyes, glints, eyebrows, and mouth.
    const eyes=[174,426].map(x=>`<g transform="translate(${x} 147.84)">
      <path class="platform-robot-brow" d="M -29 -70 Q 0 -80 29 -70"/>
      <g class="platform-robot-blink">
        <ellipse rx="34" ry="50"/>
        <ellipse class="platform-robot-glint" cx="-10" cy="-18" rx="10" ry="13"/>
        <circle class="platform-robot-glint" cx="13" cy="19" r="4"/>
      </g>
    </g>`).join('');
    face.innerHTML=`<svg viewBox="86 60 428 234" focusable="false">${eyes}
      <path class="platform-robot-nose" d="M 300 198 Q 293 205 300 210 Q 307 205 300 198"/>
      <path class="platform-robot-mouth" d="M 276 248 C 289 260 310 262 325 248"/>
    </svg>`;
    return face;
  }
  async function readHealth(endpoint){
    if(typeof endpoint!=='string'||!endpoint)return {state:'unverified'};
    const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),9000);
    try{
      const url=new URL(endpoint,location.href);
      url.pathname=url.pathname.replace(/\/$/,'')+'/health';url.search='';url.hash='';
      const started=performance.now();
      const response=await fetch(url,{method:'GET',cache:'no-store',credentials:'omit',redirect:'error',signal:controller.signal});
      const data=await response.json().catch(()=>null);
      if(data?.service!=='mark-robot')return {state:'unverified'};
      if(response.ok&&data.ok===true)return {state:'ready',at:parseTime(data.checkedAt),latency:performance.now()-started};
      return {state:response.status>=500&&data.ok===false?'unavailable':'unverified'};
    }catch{
      return {state:'unreachable'};
    }finally{
      clearTimeout(timeout);
    }
  }
  function mount({host,state,request,language='ar',endpoint}){
    if(!host||typeof request!=='function'||host.querySelector('.platform-server-robot'))return;
    const t=copy[language]||copy.ar;
    const number=new Intl.NumberFormat(language,{maximumFractionDigits:2});
    const timeFormat=new Intl.DateTimeFormat(language,{dateStyle:'medium',timeStyle:'medium'});
    const format=value=>quantity(value)?number.format(value):t.unknown;
    const bytes=value=>{
      if(!quantity(value))return t.unknown;
      const [unit,scale]=[['TB',1e12],['GB',1e9],['MB',1e6],['KB',1e3],['B',1]].find(([,size])=>value>=size)||['B',1];
      return number.format(value/scale)+' '+unit;
    };
    const report=make('section','platform-server-robot');
    const header=make('header','platform-server-robot-head'),status=make('p','platform-server-robot-status');
    const title=make('div','platform-server-robot-heading'),face=makeFace();
    const checked=make('time','platform-server-robot-time');
    const refresh=titled('button','platform-server-robot-refresh',t.refresh,'refresh');
    refresh.type='button';status.setAttribute('role','status');status.setAttribute('aria-atomic','true');
    title.append(make('h4','',t.center),status,checked);header.append(face,title,refresh);report.append(header);
    const sections=make('div','platform-server-robot-sections');
    const server=make('section','platform-server-robot-panel'),serverData=make('div');
    const serverHeading=titled('h5','',t.serverAgent,'server');
    server.append(serverHeading,serverData);sections.append(server);
    const company=make('section','platform-server-robot-panel');
    const control=make('label','platform-server-robot-select',t.select),select=make('select');
    control.append(select);
    const pages=make('div','platform-server-robot-pages'),previous=make('button','',t.previous),next=make('button','',t.next);
    previous.type=next.type='button';pages.append(previous,next);
    const companyStatus=make('p','platform-server-robot-note'),timestamp=make('time','platform-server-robot-time');
    companyStatus.setAttribute('role','status');
    const companyData=make('div'),details=make('a','platform-server-robot-link',t.details);details.hidden=true;
    const runCompany=titled('button','platform-server-robot-refresh',t.runCompany,'refresh');
    runCompany.type='button';runCompany.disabled=true;
    const companyHeading=titled('h5','',t.agents,'companies');
    company.append(companyHeading,control,pages,runCompany,companyStatus,timestamp,companyData,details);
    const jumps=make('div','platform-server-robot-jumps');
    jumps.setAttribute('role','group');jumps.setAttribute('aria-label',t.center);
    for(const [label,glyph,heading] of [[t.serverAgent,'server',serverHeading],[t.agents,'companies',companyHeading]]){
      heading.tabIndex=-1;
      const button=titled('button','platform-server-robot-jump',label,glyph);
      button.type='button';
      button.addEventListener('click',()=>{
        const reduceMotion=document.documentElement.dataset.wfMotion==='reduced'||matchMedia('(prefers-reduced-motion: reduce)').matches;
        heading.focus({preventScroll:true});
        heading.scrollIntoView({block:'start',behavior:reduceMotion?'instant':'smooth'});
      });
      jumps.append(button);
    }
    const alertWords={
      ar:['التحكم بالتنبيهات','تحذير التخزين عند (%)'],
      en:['Alert controls','Storage warning threshold (%)'],
      tr:['Uyarı ayarları','Depolama uyarı eşiği (%)'],
      fr:['Réglages des alertes','Seuil d’alerte de stockage (%)'],
      ru:['Настройка уведомлений','Порог заполнения хранилища (%)']
    }[language]||['Alert controls','Storage warning threshold (%)'];
    const alertKey='wow.admin.server-alerts';
    const alertOptions={scheduler:true,push:true,storage:true,connections:true,threshold:80};
    try{
      const saved=JSON.parse(localStorage.getItem(alertKey)||'null');
      for(const key of ['scheduler','push','storage','connections']){
        if(typeof saved?.[key]==='boolean')alertOptions[key]=saved[key];
      }
      if(Number.isInteger(saved?.threshold)&&saved.threshold>=50&&saved.threshold<=99)alertOptions.threshold=saved.threshold;
    }catch{}
    const settings=make('details','platform-server-alert-settings');
    settings.append(make('summary','',alertWords[0]));
    const choices=make('div','platform-server-alert-choices');
    function setAlertOption(key,value){
      alertOptions[key]=value;
      try{localStorage.setItem(alertKey,JSON.stringify(alertOptions));}catch{}
      for(const notice of report.querySelectorAll('[data-alert-source]'))updateAlert(notice);
    }
    function updateAlert(notice){
      const source=notice.dataset.alertSource;
      notice.hidden=!alertOptions[source]||
        (source==='storage'&&Number(notice.dataset.usage)<alertOptions.threshold);
    }
    for(const [key,text] of [['scheduler',t.scheduler],['push',t.pending],['storage',t.storageAgent],['connections',t.connections]]){
      const label=make('label',''),input=make('input');
      input.type='checkbox';input.checked=alertOptions[key];
      input.onchange=()=>setAlertOption(key,input.checked);
      label.append(input,document.createTextNode(text));choices.append(label);
    }
    const thresholdLabel=make('label','',alertWords[1]),threshold=make('input');
    threshold.type='number';threshold.min=50;threshold.max=99;threshold.step=1;
    threshold.value=alertOptions.threshold;
    threshold.onchange=()=>{
      if(threshold.value&&threshold.validity.valid)setAlertOption('threshold',threshold.valueAsNumber);
      else threshold.value=alertOptions.threshold;
    };
    thresholdLabel.append(threshold);choices.append(thresholdLabel);
    settings.append(choices);
    header.append(jumps,settings);
    sections.append(company);
    const directory=make('a','platform-server-robot-directory');
    directory.href='#companies';
    directory.append(titled('span','',t.directory,'companies'));
    if(quantity(state?.total))directory.append(make('strong','',format(state.total)));
    report.append(directory,sections);host.append(report);

    function setTime(node,label,date){
      node.textContent=date?label+' · '+timeFormat.format(date):'';
      if(date)node.dateTime=date.toISOString();else node.removeAttribute('datetime');
    }
    const pose={ready:'M 267 244 C 286 269 314 270 333 244',attention:'M 279 251 C 292 249 308 249 321 254',
      unavailable:'M 278 254 C 291 246 308 246 322 254',unreachable:'M 278 254 C 291 246 308 246 322 254'};
    const mouth=face.querySelector('.platform-robot-mouth');
    function setState(state){
      report.dataset.state=state;
      const glyph=({ready:'ready',attention:'attention',unavailable:'attention',unreachable:'offline',unverified:'unknown',partial:'unknown',staleState:'time',checking:'refresh',idle:'time'})[state];
      status.replaceChildren(icon(glyph),document.createTextNode(t[state]));
      mouth.setAttribute('d',pose[state]||'M 280 251 C 292 256 308 256 320 250');
    }
    function metrics(rows){
      const list=make('dl','platform-server-robot-metrics');
      for(const [label,value,glyph,ratio] of rows){
        const tile=make('div'),term=glyph?titled('dt','',label,glyph):make('dt','',label);
        const reading=make('dd','',value);
        if(Number.isFinite(ratio)){
          tile.className='platform-reading-capacity';
          const ring=make('span','platform-reading-ring',new Intl.NumberFormat(language,{style:'percent'}).format(ratio));
          ring.style.setProperty('--reading-fill',Math.min(100,ratio*100)+'%');
          reading.prepend(ring);
        }
        tile.append(term,reading);list.append(tile);
      }
      return list;
    }
    let previousReport=null;
    function showOperations(data,latency){
      serverData.replaceChildren();
      const fresh=typeof data?.healthy==='boolean' && Boolean(parseTime(data.checkedAt));
      if(fresh)previousReport=data;
      else{
        serverData.append(make('p','platform-server-robot-notice',previousReport?t.older:t.monitoring));
        if(!previousReport){
          if(latency)serverData.append(metrics([[t.latency,latency,'time']]));
          return;
        }
        data=previousReport;
      }
      const {database,scheduler,push}=data;
      const connections=format(database?.clientConnections);
      const lastRun=parseTime(scheduler?.lastRunAt);
      const stamp=make('time','platform-server-robot-time');
      setTime(stamp,t.last,parseTime(data.checkedAt));
      const rows=[
        [t.database,bytes(database?.bytes),'storage'],
        [t.connections,quantity(database?.clientConnections)&&quantity(database?.maxConnections)?connections+' / '+format(database.maxConnections):connections,'server',
          quantity(database?.clientConnections)&&quantity(database?.maxConnections)&&database.maxConnections>0?database.clientConnections/database.maxConnections:null],
        [t.scheduler,lastRun?timeFormat.format(lastRun):t.unknown,'time'],
        [t.pending,format(push?.pending),'time'],
        [t.incidents,format(data.activeIncidents),'attention']
      ];
      if(latency)rows.push([t.latency,latency,'time']);
      if(push?.overdue>0)rows.push([t.overdue,format(push.overdue)]);
      if(scheduler?.staleWorkspaces>0)rows.push([t.stale,format(scheduler.staleWorkspaces)]);
      if(quantity(scheduler?.failedRuns24h))rows.push([t.today,format(scheduler.failedRuns24h)]);
      serverData.append(stamp);
      if(quantity(database?.clientConnections)&&quantity(database?.maxConnections)&&database.maxConnections>0&&database.clientConnections/database.maxConnections>=.85){
        const notice=make('p','platform-agent-attention',t.connections+' · '+connections+' / '+format(database.maxConnections));
        if(database.clientConnections<database.maxConnections){
          notice.dataset.alertSource='connections';updateAlert(notice);
        }
        serverData.append(notice);
      }
      const reasons=[];
      if(scheduler?.configured===false)reasons.push(t.schedulerOff);
      if(push?.configured===false)reasons.push(t.pushOff);
      if(push?.overdue>0)reasons.push(t.backlog);
      if(scheduler?.staleWorkspaces>0)reasons.push(t.staleJobs);
      const codeLabels={PUSH_BACKLOG:t.backlog,PUSH_FAILURES:t.failedPush,PUSH_NOT_CONFIGURED:t.pushOff,PUSH_SCHEDULE:t.pushSchedule,RLS_DISABLED:t.rls};
      for(const item of Array.isArray(data.incidents)?data.incidents:[]){
        if(item.active && Object.hasOwn(codeLabels,item.code) && !reasons.includes(codeLabels[item.code]))reasons.push(codeLabels[item.code]);
      }
      if(reasons.length || data.healthy===false){
        const guide=make('div','platform-server-robot-guide'),list=make('ul');
        for(const reason of reasons){
          const notice=make('li','',reason);
          if([t.schedulerOff,t.staleJobs].includes(reason))notice.dataset.alertSource='scheduler';
          if([t.pushOff,t.backlog,t.failedPush,t.pushSchedule].includes(reason))notice.dataset.alertSource='push';
          if(notice.dataset.alertSource)updateAlert(notice);
          list.append(notice);
        }
        guide.append(make('strong','',t.review));
        if(reasons.length)guide.append(list);else guide.append(make('p','',t.other));
        serverData.append(guide);
      }else if(fresh)serverData.append(make('p','platform-server-robot-note',t.normal));
      serverData.append(metrics(rows));
      const active=Array.isArray(data.incidents)?data.incidents.filter(item=>item.active).map(item=>({code:item.code,at:item.lastSeenAt})):[];
      const failures=Array.isArray(data.recentFailures)?data.recentFailures:[];
      const entries=[...active,...failures].filter(item=>typeof item?.code==='string'&&/^[A-Z0-9_]{2,64}$/i.test(item.code)).slice(0,8);
      if(!entries.length)return;
      const issues=make('details','platform-server-robot-issues'),list=make('ul');
      for(const item of entries){
        const line=make('li'),at=parseTime(item.at),time=make('time');
        line.append(make('span','',Object.hasOwn(codeLabels,item.code)?codeLabels[item.code]:t.issue),make('code','',item.code));
        if(at){time.dateTime=at.toISOString();time.textContent=timeFormat.format(at);line.append(time);}
        list.append(line);
      }
      issues.append(make('summary','',t.failures),list);serverData.append(issues);
    }
    let observer,ageTimer,nextReading=0;
    let visible=typeof IntersectionObserver!=='function';
    const refreshInterval=5*60*1000;
    const maxAge=15*60*1000;
    async function checkServer(){
      if(refresh.disabled||!report.isConnected)return;
      nextReading=Date.now()+refreshInterval;clearTimeout(ageTimer);refresh.disabled=true;setState('checking');
      try{
        const [health,operations]=await Promise.allSettled([readHealth(endpoint),request('operationsReport')]);
        if(!report.isConnected)return;
        const publicHealth=health.status==='fulfilled'?health.value:{state:'unverified'};
        const data=operations.status==='fulfilled'?operations.value:null;
        const attention=data?.healthy===false||(quantity(data?.activeIncidents)&&data.activeIncidents>0);
        const complete=typeof data?.healthy==='boolean'&&Boolean(parseTime(data.checkedAt));
        setState(publicHealth.state==='ready'?(complete?(attention?'attention':'ready'):'partial'):publicHealth.state);
        setTime(checked,t.checked,publicHealth.at||new Date());
        const latency=quantity(publicHealth.latency)?new Intl.NumberFormat(language,{
          style:'unit',unit:'millisecond',maximumFractionDigits:0
        }).format(publicHealth.latency):null;
        showOperations(data,latency);
        clearTimeout(ageTimer);
        if(complete&&publicHealth.state==='ready'){
          const markOld=()=>{
            if(!report.isConnected)return;
            setState('staleState');
            serverData.prepend(make('p','platform-server-robot-notice',t.outdated));
          };
          const remaining=parseTime(data.checkedAt).getTime()+maxAge-Date.now();
          if(remaining<=0)markOld();else ageTimer=setTimeout(markOld,remaining);
        }
      }finally{refresh.disabled=false;}
    }
    refresh.onclick=checkServer;setState('idle');

    let rows=companyRows(state?.companies),offset=quantity(state?.offset)?state.offset:0,total=state?.total,pageCount=state?.companies?.length||0;
    let companyTicket=0;
    function pickCompanies(){
      const placeholder=make('option','',rows.length?t.select:t.empty);
      placeholder.value='';select.replaceChildren(placeholder);
      for(const row of rows){const option=make('option','',row.name);option.value=row.id;select.append(option);}
      select.disabled=!rows.length;
      previous.hidden=offset===0;next.hidden=!(quantity(total)&&offset+pageCount<total);
      pages.hidden=previous.hidden&&next.hidden;
    }
    function companyAgents(row,data){
      const scan=make('div','platform-company-agent-scan');
      const limit=(effective,base)=>Object.hasOwn(data,effective)?data[effective]:data.plan?.[base];
      function agent(glyph,title,measure,used,cap,formatValue,extra,link,label){
        const card=make('section','platform-company-agent');
        card.append(titled('h6','',title,glyph));
        const measured=quantity(used)?formatValue(used):t.unknown;
        const evidence=quantity(cap)?measured+' / '+formatValue(cap):measured;
        const reading=make('p','platform-company-agent-reading');
        reading.append(make('span','',measure),make('strong','',evidence));
        card.append(reading);
        if(quantity(used)&&quantity(cap)){
          if(glyph==='storage'){
            const available=make('p','platform-server-robot-note',t.freeStorage+' · '+bytes(Math.max(0,cap-used)));
            card.append(available);
            if(cap>0){
              const meter=make('meter','platform-storage-meter');
              meter.max=cap;meter.value=Math.min(used,cap);meter.setAttribute('aria-label',title);
              card.append(meter);
            }
          }
          const issue=used>=cap&&(cap>0||used>0)?t.full:cap>0&&used/cap>.8?t.nearly:'';
          if(glyph==='storage'&&cap>0&&used<cap){
            const notice=make('p','platform-agent-attention',t.nearly);
            notice.dataset.alertSource='storage';notice.dataset.usage=used/cap*100;
            updateAlert(notice);card.append(notice);
          }else if(issue)card.append(make('p','platform-agent-attention',issue));
        }
        if(extra)card.append(make('p','platform-server-robot-note',extra));
        const open=make('a','platform-server-robot-link',label);open.href=link;card.append(open);scan.append(card);
      }
      const date=parseTime(data.expiresAt);
      let subscription=data.planId===null?t.noPlan:'';
      if(date){
        const remaining=date.getTime()-Date.now();
        const prefix=remaining<=0?t.expired:remaining<=7*86400000?t.soon:t.expires;
        subscription=prefix+' · '+timeFormat.format(date);
      }
      const route='#company/'+row.id;
      agent('accounts',t.accountAgent,t.accounts,data.usedUsers,limit('effectiveUserLimit','userLimit'),format,subscription,route,t.companyLink);
      agent('devices',t.deviceAgent,t.registered,data.usedDevices,limit('effectiveDeviceLimit','deviceLimit'),format,'',route+'/devices',t.deviceLink);
      agent('storage',t.storageAgent,t.used,data.usedBytes,limit('effectiveStorageBytes','storageBytes'),bytes,'',route+'/usage',t.details);
      return scan;
    }
    async function readCompany(){
      const ticket=++companyTicket,row=rows.find(item=>item.id===select.value);
      details.hidden=true;setTime(timestamp,'',null);companyData.replaceChildren();companyStatus.textContent='';
      runCompany.disabled=true;
      if(!row)return;
      details.href='#company/'+row.id+'/usage';companyStatus.textContent=t.companyLoading;
      try{
        const data=await request('limits.get',{workspaceId:row.id});
        if(!report.isConnected||ticket!==companyTicket)return;
        companyStatus.textContent=row.status==='active'?t.active:row.status==='suspended'?t.suspended:'';
        setTime(timestamp,t.source,new Date());
        companyData.append(companyAgents(row,data),metrics([[t.voice,format(data.usedVoiceMinutes)],[t.video,format(data.usedVideoMinutes)]]),make('p','platform-server-robot-note',t.month));
      }catch{
        if(report.isConnected&&ticket===companyTicket)companyStatus.textContent=t.companyError;
      }finally{
        if(report.isConnected&&ticket===companyTicket){runCompany.disabled=false;runCompany.replaceChildren(icon('refresh'),document.createTextNode(t.again));}
      }
    }
    async function loadPage(target){
      previous.disabled=next.disabled=true;
      try{
        const data=await request('company.list',{offset:target});
        if(!report.isConnected)return;
        if(!Array.isArray(data?.companies))throw Error('INVALID_COMPANY_LIST');
        offset=target;rows=companyRows(data.companies);total=data.total;pageCount=data.companies.length;
        pickCompanies();readCompany();
      }catch{
        if(report.isConnected)companyStatus.textContent=t.companyError;
      }finally{previous.disabled=next.disabled=false;}
    }
    runCompany.onclick=readCompany;select.onchange=readCompany;previous.onclick=()=>loadPage(Math.max(0,offset-50));next.onclick=()=>loadPage(offset+pageCount);
    pickCompanies();
    function refreshVisible(){
      if(visible&&!document.hidden&&navigator.onLine!==false&&Date.now()>=nextReading)void checkServer();
    }
    const refreshTimer=setInterval(refreshVisible,refreshInterval);
    document.addEventListener('visibilitychange',refreshVisible);
    window.addEventListener('online',refreshVisible);
    if(!visible){
      observer=new IntersectionObserver(entries=>{
        visible=entries.some(entry=>entry.isIntersecting);
        refreshVisible();
      });
      observer.observe(report);
    }else refreshVisible();
    return {dispose(){
      observer?.disconnect();clearTimeout(ageTimer);clearInterval(refreshTimer);
      document.removeEventListener('visibilitychange',refreshVisible);
      window.removeEventListener('online',refreshVisible);
      companyTicket++;report.remove();
    }};
  }
  window.WFPlatformServerRobot=Object.freeze({mount});
})();
