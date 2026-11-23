(() => {
  'use strict';

  const copy={
    ar:{
      title:'مارك روبوت',server:'تقرير الخادم',idle:'جاهز لفحص الخادم',checking:'جارٍ فحص الخادم…',ready:'الخادم يستجيب',
      attention:'الخادم يستجيب وتوجد حالات تحتاج متابعة',unavailable:'الخادم أبلغ عن عدم الجاهزية',unreachable:'تعذّر الوصول إلى الخادم من هذا الجهاز',
      unverified:'تعذّر التحقق من استجابة الخادم',checked:'آخر فحص',updated:'جُلب التقرير في',refresh:'تحديث حالة الخادم',
      unknown:'غير متاح',database:'حجم قاعدة البيانات',connections:'اتصالات قاعدة البيانات',scheduler:'آخر تشغيل للمجدول',
      pending:'إشعارات معلّقة',overdue:'إشعارات متأخرة',stale:'شركات تأخرت مهامها المجدولة',
      incidents:'حالات نشطة',failures:'الأعطال الأخيرة',monitoring:'بيانات مراقبة الخادم غير متاحة.',
      company:'تقرير شركة',select:'اختر شركة',empty:'لا توجد شركات في هذه الصفحة.',previous:'السابق',next:'التالي',
      companyLoading:'جارٍ قراءة استهلاك الشركة…',companyError:'تعذّر قراءة تقرير هذه الشركة.',active:'شركة نشطة',suspended:'شركة موقوفة',
      storage:'تخزين الملفات',phones:'هواتف الموظفين',voice:'دقائق الصوت',video:'دقائق الفيديو',
      month:'دقائق المكالمات للشهر الحالي بتوقيت UTC.',details:'افتح تفاصيل الاستهلاك'
    },
    en:{
      title:'Mark Robot',server:'Server report',idle:'Ready to check the server',checking:'Checking the server…',ready:'Server responded',
      attention:'Server responded. Some items need attention.',unavailable:'The server reported that it is unavailable',unreachable:'Could not reach the server from this device',
      unverified:'Could not verify the server response',checked:'Last checked',updated:'Report fetched',refresh:'Refresh server status',
      unknown:'Unavailable',database:'Database size',connections:'Database connections',scheduler:'Last scheduled run',
      pending:'Pending notifications',overdue:'Overdue notifications',stale:'Companies with stale scheduled jobs',
      incidents:'Active incidents',failures:'Recent failures',monitoring:'Server monitoring details are unavailable.',
      company:'Company report',select:'Select a company',empty:'No companies on this page.',previous:'Previous',next:'Next',
      companyLoading:'Reading company usage…',companyError:'Could not load this company’s report.',active:'Active company',suspended:'Suspended company',
      storage:'File storage',phones:'Staff phones',voice:'Voice minutes',video:'Video minutes',
      month:'Call minutes cover the current UTC month.',details:'Open usage details'
    },
    tr:{
      title:'Mark Robot',server:'Sunucu raporu',idle:'Sunucu denetlenebilir',checking:'Sunucu denetleniyor…',ready:'Sunucu yanıt verdi',
      attention:'Sunucu yanıt verdi. Bazı durumlar incelenmeli.',unavailable:'Sunucu hizmetin kullanılamadığını bildirdi',unreachable:'Bu cihazdan sunucuya ulaşılamadı',
      unverified:'Sunucu yanıtı doğrulanamadı',checked:'Son denetim',updated:'Rapor alındı',refresh:'Sunucu durumunu yenile',
      unknown:'Kullanılamıyor',database:'Veritabanı boyutu',connections:'Veritabanı bağlantıları',scheduler:'Son zamanlanmış çalışma',
      pending:'Bekleyen bildirimler',overdue:'Geciken bildirimler',stale:'Zamanlanmış işi geciken şirketler',
      incidents:'Etkin olaylar',failures:'Son hatalar',monitoring:'Sunucu izleme ayrıntıları kullanılamıyor.',
      company:'Şirket raporu',select:'Şirket seçin',empty:'Bu sayfada şirket yok.',previous:'Önceki',next:'Sonraki',
      companyLoading:'Şirket kullanımı okunuyor…',companyError:'Bu şirketin raporu yüklenemedi.',active:'Etkin şirket',suspended:'Askıya alınmış şirket',
      storage:'Dosya depolama',phones:'Personel telefonları',voice:'Sesli arama dakikası',video:'Videolu arama dakikası',
      month:'Arama dakikaları geçerli UTC ayına aittir.',details:'Kullanım ayrıntılarını aç'
    },
    fr:{
      title:'Robot Mark',server:'Rapport serveur',idle:'Prêt à vérifier le serveur',checking:'Vérification du serveur…',ready:'Le serveur a répondu',
      attention:'Le serveur a répondu. Certains éléments sont à vérifier.',unavailable:'Le serveur a signalé son indisponibilité',unreachable:'Le serveur est inaccessible depuis cet appareil',
      unverified:'Impossible de vérifier la réponse du serveur',checked:'Dernière vérification',updated:'Rapport récupéré',refresh:'Actualiser le serveur',
      unknown:'Indisponible',database:'Taille de la base',connections:'Connexions à la base',scheduler:'Dernière exécution planifiée',
      pending:'Notifications en attente',overdue:'Notifications en retard',stale:'Sociétés avec tâches planifiées en retard',
      incidents:'Incidents actifs',failures:'Échecs récents',monitoring:'Les détails de surveillance du serveur sont indisponibles.',
      company:'Rapport société',select:'Choisir une société',empty:'Aucune société sur cette page.',previous:'Précédent',next:'Suivant',
      companyLoading:'Lecture de la consommation…',companyError:'Impossible de charger le rapport.',active:'Société active',suspended:'Société suspendue',
      storage:'Stockage de fichiers',phones:'Téléphones du personnel',voice:'Minutes audio',video:'Minutes vidéo',
      month:'Les minutes concernent le mois UTC en cours.',details:'Ouvrir les détails de consommation'
    },
    ru:{
      title:'Робот Mark',server:'Отчёт сервера',idle:'Готов к проверке сервера',checking:'Проверка сервера…',ready:'Сервер ответил',
      attention:'Сервер ответил. Некоторые события требуют внимания.',unavailable:'Сервер сообщил о недоступности',unreachable:'Сервер недоступен с этого устройства',
      unverified:'Ответ сервера не удалось проверить',checked:'Последняя проверка',updated:'Отчёт получен',refresh:'Обновить состояние сервера',
      unknown:'Нет данных',database:'Размер базы данных',connections:'Подключения к базе',scheduler:'Последний запуск по расписанию',
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
      <path class="platform-robot-mouth" d="M 274 252.72 Q 300 273.72 326 252.72"/>
    </svg>`;
    return face;
  }
  async function readHealth(endpoint){
    if(typeof endpoint!=='string'||!endpoint)return {state:'unverified'};
    const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),9000);
    try{
      const url=new URL(endpoint,location.href);
      url.pathname=url.pathname.replace(/\/$/,'')+'/health';url.search='';url.hash='';
      const response=await fetch(url,{method:'GET',cache:'no-store',credentials:'omit',redirect:'error',signal:controller.signal});
      const data=await response.json().catch(()=>null);
      if(data?.service!=='mark-robot')return {state:'unverified'};
      if(response.ok&&data.ok===true)return {state:'ready',at:parseTime(data.checkedAt)};
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
    const refresh=make('button','platform-server-robot-refresh',t.refresh);
    refresh.type='button';status.setAttribute('role','status');status.setAttribute('aria-atomic','true');
    title.append(make('h4','',t.title),status,checked);header.append(face,title,refresh);report.append(header);
    const sections=make('div','platform-server-robot-sections');
    const server=make('section','platform-server-robot-panel'),serverData=make('div');
    server.append(make('h5','',t.server),serverData);sections.append(server);
    const company=make('section','platform-server-robot-panel');
    const control=make('label','platform-server-robot-select',t.select),select=make('select');
    control.append(select);
    const pages=make('div','platform-server-robot-pages'),previous=make('button','',t.previous),next=make('button','',t.next);
    previous.type=next.type='button';pages.append(previous,next);
    const companyStatus=make('p','platform-server-robot-note'),timestamp=make('time','platform-server-robot-time');
    companyStatus.setAttribute('role','status');
    const companyData=make('div'),details=make('a','platform-server-robot-link',t.details);details.hidden=true;
    company.append(make('h5','',t.company),control,pages,companyStatus,timestamp,companyData,details);
    sections.append(company);report.append(sections);host.append(report);

    function setTime(node,label,date){
      node.textContent=date?label+' · '+timeFormat.format(date):'';
      if(date)node.dateTime=date.toISOString();else node.removeAttribute('datetime');
    }
    const pose={ready:'M 264 252.72 Q 300 284.72 336 252.72',attention:'M 274 263.72 Q 300 246.72 326 263.72',
      unavailable:'M 274 263.72 Q 300 239.72 326 263.72',unreachable:'M 274 263.72 Q 300 239.72 326 263.72'};
    const mouth=face.querySelector('.platform-robot-mouth');
    function setState(state){
      report.dataset.state=state;status.textContent=t[state];
      mouth.setAttribute('d',pose[state]||'M 274 252.72 Q 300 263.72 326 252.72');
    }
    function metrics(rows){
      const list=make('dl','platform-server-robot-metrics');
      for(const [label,value] of rows){
        const tile=make('div');tile.append(make('dt','',label),make('dd','',value));list.append(tile);
      }
      return list;
    }
    function showOperations(data){
      serverData.replaceChildren();
      if(typeof data?.healthy!=='boolean'){
        serverData.append(make('p','platform-server-robot-note',t.monitoring));
        return;
      }
      const {database,scheduler,push}=data;
      const connections=format(database?.clientConnections);
      const lastRun=parseTime(scheduler?.lastRunAt);
      const stamp=make('time','platform-server-robot-time');
      setTime(stamp,t.updated,parseTime(data.checkedAt));
      const rows=[
        [t.database,bytes(database?.bytes)],
        [t.connections,quantity(database?.clientConnections)&&quantity(database?.maxConnections)?connections+' / '+format(database.maxConnections):connections],
        [t.scheduler,lastRun?timeFormat.format(lastRun):t.unknown],
        [t.pending,format(push?.pending)],
        [t.incidents,format(data.activeIncidents)]
      ];
      if(push?.overdue>0)rows.push([t.overdue,format(push.overdue)]);
      if(scheduler?.staleWorkspaces>0)rows.push([t.stale,format(scheduler.staleWorkspaces)]);
      serverData.append(stamp,metrics(rows));
      const active=Array.isArray(data.incidents)?data.incidents.filter(item=>item.active).map(item=>({code:item.code,at:item.lastSeenAt})):[];
      const failures=Array.isArray(data.recentFailures)?data.recentFailures:[];
      const entries=[...active,...failures].filter(item=>typeof item?.code==='string'&&/^[A-Z0-9_]{2,64}$/i.test(item.code)).slice(0,8);
      if(!entries.length)return;
      const issues=make('details','platform-server-robot-issues'),list=make('ul');
      for(const item of entries){
        const line=make('li'),at=parseTime(item.at),time=make('time');
        line.append(make('code','',item.code));
        if(at){time.dateTime=at.toISOString();time.textContent=timeFormat.format(at);line.append(time);}
        list.append(line);
      }
      issues.append(make('summary','',t.failures),list);serverData.append(issues);
    }
    let observer;
    async function checkServer(){
      if(refresh.disabled||!report.isConnected)return;
      observer?.disconnect();refresh.disabled=true;setState('checking');
      try{
        const [health,operations]=await Promise.allSettled([readHealth(endpoint),request('operationsReport')]);
        if(!report.isConnected)return;
        const publicHealth=health.status==='fulfilled'?health.value:{state:'unverified'};
        const data=operations.status==='fulfilled'?operations.value:null;
        const attention=data?.healthy===false||(quantity(data?.activeIncidents)&&data.activeIncidents>0);
        setState(publicHealth.state==='ready'&&attention?'attention':publicHealth.state);
        setTime(checked,t.checked,publicHealth.at||new Date());
        showOperations(data);
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
    async function readCompany(){
      const ticket=++companyTicket,row=rows.find(item=>item.id===select.value);
      details.hidden=true;setTime(timestamp,'',null);companyData.replaceChildren();companyStatus.textContent='';
      if(!row)return;
      details.href='#company/'+row.id+'/usage';details.hidden=false;companyStatus.textContent=t.companyLoading;
      try{
        const data=await request('limits.get',{workspaceId:row.id});
        if(!report.isConnected||ticket!==companyTicket)return;
        companyStatus.textContent=row.status==='active'?t.active:row.status==='suspended'?t.suspended:'';
        setTime(timestamp,t.updated,new Date());
        companyData.append(metrics([[t.storage,bytes(data.usedBytes)],[t.phones,format(data.usedDevices)],
          [t.voice,format(data.usedVoiceMinutes)],[t.video,format(data.usedVideoMinutes)]]),make('p','platform-server-robot-note',t.month));
      }catch{
        if(report.isConnected&&ticket===companyTicket)companyStatus.textContent=t.companyError;
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
    select.onchange=readCompany;previous.onclick=()=>loadPage(Math.max(0,offset-50));next.onclick=()=>loadPage(offset+pageCount);
    pickCompanies();
    if(typeof IntersectionObserver==='function'){
      observer=new IntersectionObserver(entries=>{
        if(entries.some(entry=>entry.isIntersecting))void checkServer();
      });
      observer.observe(report);
    }
    return {dispose(){
      observer?.disconnect();companyTicket++;report.remove();
    }};
  }
  window.WFPlatformServerRobot=Object.freeze({mount});
})();
