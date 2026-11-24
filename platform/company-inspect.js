/* WOW founder diagnostic view: reads snapshots only, never opens a tenant user session. */
(function(root){
  'use strict';
  const docs={
    ar:{title:'برنامج الشركة',mode:'وضع المبرمج · قراءة فقط',note:'معاينة مستقلة للبيانات السحابية؛ لا تُعدل جلسات الشركة أو أجهزتها.',back:'رجوع للإدارة',refresh:'تحديث المعاينة',
      search:'بحث داخل النتائج الحالية',empty:'لا توجد سجلات في هذا القسم.',loading:'جارٍ قراءة بيانات الشركة…',error:'تعذّر الحصول على البيانات. تأكد من اتصال الخادم وصلاحية المؤسس.',
      previous:'السابق',next:'التالي',page:'سجلات',records:'أنواع السجلات',devices:'الأجهزة المرتبطة',sessions:'جلسات غير مغلقة',updated:'آخر تحديث',orders:'طلبات المعرض',filesCount:'ملفات',
      total:'الإجمالي',readonly:'هذا الوضع للعرض فقط. لا توجد أزرار تعديل أو حذف أو تسجيل دخول باسم موظف.',
      summary:'الرئيسية',companies:'الشركات',products:'المنتجات',invoices:'الفواتير',payments:'المدفوعات',accounts:'الحسابات',settings:'الإعدادات',audit:'سجل العمليات',
      'gallery-orders':'طلبات المعرض','gallery-listings':'عروض المنتجات',files:'الملفات',calls:'المكالمات',devices:'الأجهزة والجلسات'},
    en:{title:'Company program',mode:'Developer inspection · Read only',note:'Independent cloud snapshot; company users, sessions and devices are untouched.',back:'Back to admin',refresh:'Refresh preview',
      search:'Search visible results',empty:'No records in this section.',loading:'Reading company data…',error:'Could not load the company data. Check server access and founder authorization.',
      previous:'Previous',next:'Next',page:'Records',records:'Record types',devices:'Linked devices',sessions:'Unclosed sessions',updated:'Last update',orders:'Gallery orders',filesCount:'Files',
      total:'Total',readonly:'Read-only mode. No editing, deleting, or tenant account impersonation.',
      summary:'Home',companies:'Companies',products:'Products',invoices:'Invoices',payments:'Payments',accounts:'Accounts',settings:'Settings',audit:'Activity log',
      'gallery-orders':'Gallery orders','gallery-listings':'Product listings',files:'Files',calls:'Calls',devices:'Devices & sessions'},
    tr:{title:'Şirket programı',mode:'Geliştirici incelemesi · Salt okunur',note:'Bağımsız bulut görünümü; şirket oturumları ve cihazları etkilenmez.',back:'Yönetime dön',refresh:'Görünümü yenile',
      search:'Görünen sonuçlarda ara',empty:'Bu bölümde kayıt yok.',loading:'Şirket verileri okunuyor…',error:'Şirket verileri yüklenemedi. Sunucu erişimini ve kurucu yetkisini kontrol edin.',
      previous:'Önceki',next:'Sonraki',page:'Kayıtlar',records:'Kayıt türleri',devices:'Bağlı cihazlar',sessions:'Açık kalan oturumlar',updated:'Son güncelleme',orders:'Galeri siparişleri',filesCount:'Dosyalar',
      total:'Toplam',readonly:'Salt okunur. Düzenleme, silme veya şirket hesabını taklit etme yoktur.',
      summary:'Ana sayfa',companies:'Firmalar',products:'Ürünler',invoices:'Faturalar',payments:'Ödemeler',accounts:'Hesaplar',settings:'Ayarlar',audit:'İşlem günlüğü',
      'gallery-orders':'Galeri siparişleri','gallery-listings':'Ürün listeleri',files:'Dosyalar',calls:'Aramalar',devices:'Cihazlar ve oturumlar'},
    fr:{title:'Programme société',mode:'Inspection développeur · Lecture seule',note:'Vue cloud indépendante, sans toucher aux sessions ni aux appareils de la société.',back:"Retour à l'administration",refresh:'Actualiser',
      search:'Rechercher dans les résultats',empty:'Aucun élément dans cette section.',loading:'Lecture des données…',error:'Impossible de lire les données. Vérifiez le serveur et les droits du fondateur.',
      previous:'Précédent',next:'Suivant',page:'Éléments',records:'Types de données',devices:'Appareils liés',sessions:'Sessions non fermées',updated:'Dernière mise à jour',orders:'Commandes galerie',filesCount:'Fichiers',
      total:'Total',readonly:'Lecture seule. Aucun bouton de modification, suppression ou connexion au nom du personnel.',
      summary:'Accueil',companies:'Sociétés',products:'Produits',invoices:'Factures',payments:'Paiements',accounts:'Comptes',settings:'Réglages',audit:'Journal',
      'gallery-orders':'Commandes galerie','gallery-listings':'Produits affichés',files:'Fichiers',calls:'Appels',devices:'Appareils et sessions'},
    ru:{title:'Программа компании',mode:'Проверка разработчика · Только чтение',note:'Независимый снимок облачных данных; сеансы и устройства компании не затронуты.',back:'К администратору',refresh:'Обновить',
      search:'Поиск по результатам',empty:'В разделе нет записей.',loading:'Чтение данных компании…',error:'Не удалось загрузить данные. Проверьте сервер и права основателя.',
      previous:'Назад',next:'Далее',page:'Записи',records:'Типы данных',devices:'Устройства',sessions:'Незакрытые сеансы',updated:'Последнее обновление',orders:'Заказы галереи',filesCount:'Файлы',
      total:'Всего',readonly:'Только чтение. Без изменения, удаления или входа под учётной записью компании.',
      summary:'Главная',companies:'Компании',products:'Товары',invoices:'Счета',payments:'Платежи',accounts:'Аккаунты',settings:'Настройки',audit:'Журнал',
      'gallery-orders':'Заказы галереи','gallery-listings':'Каталог',files:'Файлы',calls:'Звонки',devices:'Устройства и сеансы'}
  };
  const storageCopy={
    ar:['ملفات الشركة','ملف','الحجم الإجمالي','المحادثات','المعرض','ملفات مرفوعة','وسائط الشركة','صورة','مقطع صوتي','فيديو','مستند','الحجم','النوع','آخر تحديث','أُنشئ في','مسار التخزين','لا توجد ملفات مخزّنة لهذه الشركة بعد.','غير معروف','المجموع للملفات ذات الحجم المعروف'],
    en:['Company storage','Files','Total size','Chats','Gallery','Uploaded files','Company media','Image','Audio','Video','Document','Size','Type','Last updated','Created','Storage path','This company has no stored files yet.','Unknown','Total for files with a known size'],
    tr:['Şirket dosyaları','Dosya','Toplam boyut','Sohbetler','Galeri','Yüklenen dosyalar','Şirket medyası','Görsel','Ses','Video','Belge','Boyut','Tür','Son güncelleme','Oluşturulma','Depolama yolu','Bu şirketin henüz depolanan dosyası yok.','Bilinmiyor','Boyutu bilinen dosyaların toplamı'],
    fr:['Fichiers de la société','Fichiers','Taille totale','Discussions','Galerie','Fichiers importés','Médias de la société','Image','Audio','Vidéo','Document','Taille','Type','Mise à jour','Création','Chemin de stockage','Aucun fichier stocké pour cette société.','Inconnu','Total des fichiers de taille connue'],
    ru:['Файлы компании','Файлы','Общий размер','Чаты','Галерея','Загруженные файлы','Медиа компании','Изображение','Аудио','Видео','Документ','Размер','Тип','Обновлено','Создано','Путь в хранилище','У этой компании пока нет файлов в хранилище.','Неизвестно','Сумма файлов с известным размером']
  };
  const sections=['summary','companies','products','invoices','payments','accounts','gallery-orders','gallery-listings','storage','files','calls','settings','audit','devices'];
  const icons={summary:'⌂',companies:'▦',products:'◈',invoices:'▤',payments:'◉',accounts:'♙',
    'gallery-orders':'▣','gallery-listings':'◫',files:'▧',storage:'▤',calls:'⌕',settings:'⚙',audit:'≡',devices:'▤'};

  const storageSymbols={
    folder:'M3 7V5a1 1 0 0 1 1-1h5l2 3h9a1 1 0 0 1 1 1v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z',
    chat:'M21 11a8 8 0 0 1-8 8H8l-5 3 1.5-5A8 8 0 1 1 21 11Z',
    image:'M4 3h16a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1ZM3 17l5-5 4 4 3-3 6 6M15.5 7.5h.01',
    audio:'M9 17V6l10-2v11M9 17a3 2.5 0 1 1-3-2.5A3 2.5 0 0 1 9 17Zm10-2a3 2.5 0 1 1-3-2.5 3 2.5 0 0 1 3 2.5Z',
    video:'M3 6h12v12H3zM15 10l6-4v12l-6-4z',
    document:'M6 2h8l4 4v16H6zM14 2v5h4M9 12h6M9 16h6',
    loading:'M3 12a9 9 0 1 1 9 9M12 6v6l4 2',
    empty:'M3 14l3-9h12l3 9v5H3zM3 14h5l2 3h4l2-3h5',
    error:'M12 3 2 20h20L12 3ZM12 9v5m0 3h.01'
  };
  function storageIcon(name){
    const icon=document.createElementNS('http://www.w3.org/2000/svg','svg');
    for(const [key,value] of Object.entries({viewBox:'0 0 24 24',width:19,height:19,fill:'none',stroke:'currentColor','stroke-width':1.7,'stroke-linecap':'round','stroke-linejoin':'round','aria-hidden':'true',focusable:'false'}))icon.setAttribute(key,String(value));
    const path=document.createElementNS(icon.namespaceURI,'path');path.setAttribute('d',storageSymbols[name]);icon.append(path);
    icon.style.verticalAlign='middle';return icon;
  }
  function storageLabel(node,name,text){
    node.replaceChildren(storageIcon(name),document.createTextNode(' '+text));
    return node;
  }
  const deviceCopy={
    ar:{warning:'هذه مؤشرات تقنية تقديرية وليست إثباتًا لهوية الجهاز أو موقعه. عنوان IP من اتصال Supabase وقد يكون عنوان خادم WOW الوسيط. الجلسة غير المغلقة لا تعني أن الجهاز متصل الآن.',
      phone:'هاتف',tablet:'تابلت',desktop:'كمبيوتر',unknown:'جهاز غير معروف',notReported:'لم يُرسل الجهاز معلوماته بعد',
      account:'الحساب',device:'نوع الجهاز المبلّغ عنه',system:'نظام الجهاز',browser:'المتصفح',ip:'IP اتصال مزوّد الخدمة',started:'بداية الجلسة',last:'آخر نشاط مسجّل',reported:'آخر تقرير',status:'الجلسة',closed:'مغلقة',notClosed:'لم تُغلق',resolution:'أبعاد الشاشة'},
    en:{warning:'These are approximate technical hints, not proof of device identity or location. Supabase IP may belong to the WOW relay server. An unclosed session does not mean the device is online.',
      phone:'Phone',tablet:'Tablet',desktop:'Computer',unknown:'Unknown device',notReported:'No client report yet',
      account:'Account',device:'Client-reported device',system:'Platform',browser:'Browser',ip:'Provider connection IP',started:'Session started',last:'Last recorded activity',reported:'Last report',status:'Session',closed:'Closed',notClosed:'Not closed',resolution:'Screen size'},
    tr:{warning:'Bu bilgiler yaklaşık teknik ipuçlarıdır; cihaz kimliği veya konum kanıtı değildir. Supabase IP adresi WOW ara sunucusuna ait olabilir. Açık oturum çevrimiçi anlamına gelmez.',
      phone:'Telefon',tablet:'Tablet',desktop:'Bilgisayar',unknown:'Bilinmeyen cihaz',notReported:'Cihaz henüz bilgi göndermedi',
      account:'Hesap',device:'Bildirilen cihaz',system:'İşletim sistemi',browser:'Tarayıcı',ip:'Sağlayıcı bağlantı IP',started:'Oturum başlangıcı',last:'Son kayıtlı etkinlik',reported:'Son rapor',status:'Oturum',closed:'Kapalı',notClosed:'Kapatılmadı',resolution:'Ekran boyutu'},
    fr:{warning:'Ces indications techniques sont approximatives, et ne prouvent ni l’identité ni la localisation. L’IP Supabase peut désigner le relais WOW. Une session non fermée ne prouve pas une connexion active.',
      phone:'Téléphone',tablet:'Tablette',desktop:'Ordinateur',unknown:'Appareil inconnu',notReported:'Aucun rapport du client',
      account:'Compte',device:'Appareil déclaré',system:'Système',browser:'Navigateur',ip:'IP connexion fournisseur',started:'Début de session',last:'Dernière activité enregistrée',reported:'Dernier rapport',status:'Session',closed:'Fermée',notClosed:'Non fermée',resolution:'Taille écran'},
    ru:{warning:'Это приблизительные технические сведения, не подтверждающие личность или местоположение. IP Supabase может принадлежать серверу WOW. Незакрытая сессия не означает, что устройство в сети.',
      phone:'Телефон',tablet:'Планшет',desktop:'Компьютер',unknown:'Неизвестное устройство',notReported:'Нет отчёта от клиента',
      account:'Аккаунт',device:'Сообщённое устройство',system:'Система',browser:'Браузер',ip:'IP провайдера',started:'Начало сессии',last:'Последняя активность',reported:'Последний отчёт',status:'Сессия',closed:'Закрыта',notClosed:'Не закрыта',resolution:'Размер экрана'}
  };
  const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!=null)n.textContent=String(text);return n;};
  const clean=(val)=>{
    if(val==null)return '—';
    if(typeof val==='boolean')return val?'✓':'—';
    if(Array.isArray(val))return val.map(x=>typeof x==='object'?JSON.stringify(x):String(x)).join(' · ');
    if(typeof val==='object')return JSON.stringify(val,null,2);
    return String(val);
  };
  const date=val=>{if(!val)return '—';try{return new Intl.DateTimeFormat(document.documentElement.lang||'ar',{dateStyle:'medium',timeStyle:'short'}).format(new Date(val));}catch{return String(val);}};
  let active=null;
  function open({company,request,language='ar',section='summary',host}={}){
    if(!company?.id||typeof request!=='function')return;
    if(!host)active?.close();
    let alive=true,serial=0,current=sections.includes(section)?section:'summary',offset=0,rows=[],lastTotal=0;
    const texts=docs[language]||docs.ar,oldFocus=document.activeElement,main=document.querySelector('body > main');
    const modal=el('section','wf-inspect'),top=el('header','wf-inspect-top'),logo=el('img'),title=el('div','wf-inspect-title'),
      back=el('button','wf-inspect-back',texts.back),actions=el('div','wf-inspect-actions'),refresh=el('button','wf-inspect-refresh',texts.refresh),
      nav=el('nav','wf-inspect-nav'),body=el(host?'div':'main','wf-inspect-body'),hero=el('div','wf-inspect-hero'),
      message=el('p','wf-inspect-message'),results=el('div','wf-inspect-results'),pages=el('nav','wf-inspect-pages');
    logo.src=new URL('./admin-icon-192.png',document.currentScript?.src||location.href).href;logo.width=42;logo.height=42;logo.alt='';
    title.append(el('strong','',company.name),el('small','',texts.title+' · '+texts.mode));
    back.type=refresh.type='button';actions.append(refresh,back);top.append(logo,title,actions);
    hero.append(el('h2','',company.name),el('p','',texts.note),el('p','wf-inspect-readonly',texts.readonly));
    modal.setAttribute('role','dialog');modal.setAttribute('aria-modal','true');modal.setAttribute('aria-label',company.name+' · '+texts.mode);
    modal.tabIndex=-1;modal.dir=language==='ar'?'rtl':'ltr';modal.lang=language;
    modal.append(top,nav,body);body.append(hero,message,results,pages);message.setAttribute('role','status');
    const controls={};
    for(const name of sections){
      const b=el('button','wf-inspect-nav-item');b.type='button';b.dataset.section=name;
      const sym=el('span','wf-inspect-nav-icon',icons[name]);sym.setAttribute('aria-hidden','true');
      if(name==='storage')sym.replaceChildren(storageIcon('folder'));
      b.append(sym,el('span','',name==='storage'?(storageCopy[language]||storageCopy.ar)[0]:texts[name]));b.onclick=()=>{current=name;offset=0;load();};
      nav.append(b);controls[name]=b;
    }
    if(host){
      modal.className='wf-inspect-inline';modal.removeAttribute('role');modal.removeAttribute('aria-modal');
      modal.removeAttribute('tabindex');modal.setAttribute('aria-label',texts.devices);
      top.replaceChildren(el('h3','',texts.devices),refresh);
      nav.remove();hero.remove();host.replaceChildren(modal);
    }else{
      main?.setAttribute('inert','');main?.setAttribute('aria-hidden','true');document.body.append(modal);modal.focus();
    }
    const close=()=>{
      if(!alive)return;alive=false;serial++;modal.remove();
      if(!host){main?.removeAttribute('inert');main?.removeAttribute('aria-hidden');oldFocus?.focus?.({preventScroll:true});if(active?.close===close)active=null;}
    };
    if(!host)active={close};
    back.onclick=close;refresh.onclick=()=>load();
    if(!host)modal.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();close();}
      if(event.key==='Tab'){const all=[...modal.querySelectorAll('button:not([disabled]),input:not([disabled])')].filter(n=>n.getClientRects().length);
        const first=all[0],last=all.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
        else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
      }});
    function rowItem(record){
      const item=el('article','wf-inspect-record');
      const entries=Object.entries(record||{}).filter(([key])=>key!=='value');
      const first=entries.find(([key])=>['name','username','number','action','id','productId'].includes(key));
      const display=first?clean(first[1]):texts.page;
      item.append(el('strong','wf-inspect-record-title',display.length>180?display.slice(0,180)+'…':display));
      const dl=el('dl','wf-inspect-record-data');
      for(const [key,value] of entries){
        const dt=el('dt','',key),dd=el('dd');
        const shown=/At$|_at$/.test(key)?date(value):clean(value);
        dd.textContent=shown.length>300?shown.slice(0,300)+'…':shown;dd.dir='auto';dl.append(dt,dd);
      }
      item.append(dl);
      if(record&&record.value!=null){
        const detail=el('details','wf-inspect-record-detail'),summary=el('summary','',texts[current]),pre=el('pre');
        pre.textContent=JSON.stringify(record.value,null,2);detail.append(summary,pre);item.append(detail);
      }
      return item;
    }

    const storageText=storageCopy[language]||storageCopy.ar;
    function fileSize(bytes){
      if(bytes==null||!Number.isFinite(Number(bytes)))return storageText[17];
      const units=['byte','kilobyte','megabyte','gigabyte','terabyte'];
      let size=Number(bytes),index=0;
      while(size>=1000&&index<units.length-1){size/=1000;index++;}
      return new Intl.NumberFormat(language,{style:'unit',unit:units[index],unitDisplay:'short',maximumFractionDigits:index?1:0}).format(size);
    }
    function storageRow(record){
      const w=storageText;
      const family=(record.mime||'').split('/')[0],kind={image:w[7],audio:w[8],video:w[9]}[family]||w[10];
      const source={chat:w[3],gallery:w[4],files:w[5],media:w[6]}[record.source]||w[6];
      const item=el('article','wf-inspect-record');
      const heading=el('strong','wf-inspect-record-title',record.name||kind);heading.dir='auto';storageLabel(heading,['image','audio','video'].includes(family)?family:'document',record.name||kind);item.append(heading);
      item.append(storageLabel(el('span','wf-inspect-breakdown-chip'),record.source==='chat'?'chat':record.source==='gallery'?'image':'folder',source+' · '+kind));
      const grid=el('dl','wf-inspect-record-data');
      for(const [caption,value] of [[w[11],fileSize(record.bytes)],[w[12],record.mime||w[17]],[w[13],date(record.updatedAt)],[w[14],date(record.createdAt)]]){
        const field=el('dd','',value);field.dir='auto';grid.append(el('dt','',caption),field);
      }
      item.append(grid);
      const details=el('details','wf-inspect-record-detail'),path=el('pre','',record.path);
      path.dir='ltr';details.append(el('summary','',w[15]),path);item.append(details);
      return item;
    }
    function storageSummary(data){
      const w=storageText;
      const heading=storageLabel(el('h3'),'folder',company.name+' / '+w[0]);heading.dir='auto';results.append(heading);
      const grid=el('div','wf-inspect-summary');
      for(const [label,value] of [[w[1],new Intl.NumberFormat(language).format(data.total)],[data.unknownSizes?w[18]:w[2],fileSize(data.totalBytes)]]){
        const card=el('article','wf-inspect-stat');card.append(el('span','',label),el('strong','',value));grid.append(card);
      }
      results.append(grid);
    }
    function deviceRow(record){
      const w=deviceCopy[language]||deviceCopy.ar;
      const item=el('article','wf-inspect-record wf-inspect-device'),top=el('div','wf-inspect-device-head'),
        icon=el('span','wf-inspect-device-icon'),title=el('div','wf-inspect-device-name');
      const type=record.reportedAt&&['phone','tablet','desktop'].includes(record.reportedDevice)?record.reportedDevice:'unknown';
      icon.dataset.device=type;
      icon.setAttribute('aria-hidden','true');
      title.append(el('strong','',clean(record.name||record.username)),el('small','',record.reportedAt?w[type]:w.notReported));
      top.append(icon,title);item.append(top);
      const grid=el('dl','wf-inspect-record-data');
      const rows=[
        [w.account,record.username],[w.device,record.reportedAt?w[type]:null],
        [w.system,record.reportedPlatform],[w.browser,record.reportedBrowser],
        [w.resolution,record.reportedWidth!=null&&record.reportedHeight!=null?
          record.reportedWidth+' × '+record.reportedHeight:null],
        [w.ip,record.providerIp],[w.status,record.closedAt?w.closed:w.notClosed],
        [w.started,date(record.startedAt)],[w.last,date(record.lastActivityAt)],
        [w.reported,record.reportedAt?date(record.reportedAt):w.notReported]
      ];
      for(const [caption,value] of rows){
        const label=el('dt','',caption),valueNode=el('dd','',clean(value));
        valueNode.dir=caption===w.ip?'ltr':'auto';
        if(caption===w.ip)valueNode.className='wf-inspect-provider-ip';
        grid.append(label,valueNode);
      }
      item.append(grid);return item;
    }
    function summary(data){
      const s=data.summary||{},w=data.workspace||{},grid=el('div','wf-inspect-summary');
      for(const [label,value] of [[texts.accounts,s.accounts],[texts.devices,s.registeredDevices],[texts.sessions,s.unclosedSessions],
        [texts.orders,s.galleryOrders],[texts.filesCount,s.files],[texts.updated,date(s.lastRecordUpdate)]]){
        const card=el('article','wf-inspect-stat');card.append(el('span','',label),el('strong','',value??'—'));grid.append(card);
      }
      results.append(grid);
      const listing=el('section','wf-inspect-breakdown'),heading=el('h3','',texts.records),counts=el('div','wf-inspect-breakdown-list');
      for(const [key,value] of Object.entries(s.recordsByType||{})){
        counts.append(el('span','wf-inspect-breakdown-chip',key+' · '+value));
      }
      listing.append(heading,counts);results.append(listing);
      const info=el('section','wf-inspect-breakdown');info.append(el('h3','',texts.title),rowItem(w));results.append(info);
    }
    function render(data){
      rows=data.items||[];lastTotal=Number(data.total)||0;results.replaceChildren();pages.replaceChildren();
      if(current==='summary'){summary(data);return;}
      if(current==='storage')storageSummary(data);
      if(current==='devices')results.append(el('p','wf-inspect-device-warning',(deviceCopy[language]||deviceCopy.ar).warning));
      if(!rows.length){results.append(current==='storage'?storageLabel(el('p','wf-inspect-empty'),'empty',storageText[16]):el('p','wf-inspect-empty',texts.empty));return;}
      const input=el('input','wf-inspect-search');input.type='search';input.placeholder=texts.search;input.setAttribute('aria-label',texts.search);
      const list=el('div','wf-inspect-record-list');results.append(input,list);
      const paint=()=>{const q=input.value.trim().toLocaleLowerCase();list.replaceChildren();
        for(const row of rows)if(!q||JSON.stringify(row).toLocaleLowerCase().includes(q))list.append(current==='devices'?deviceRow(row):current==='storage'?storageRow(row):rowItem(row));
        if(!list.childElementCount)list.append(el('p','wf-inspect-empty',texts.empty));
      };
      input.oninput=paint;paint();
      const status=el('small','',texts.page+' '+(offset+1)+'–'+Math.min(lastTotal,offset+rows.length)+' / '+lastTotal);
      const prev=el('button','',texts.previous),next=el('button','',texts.next);prev.type=next.type='button';
      prev.disabled=offset===0;next.disabled=offset+rows.length>=lastTotal;
      prev.onclick=()=>{offset=Math.max(0,offset-40);load();};next.onclick=()=>{offset+=40;load();};
      pages.append(prev,status,next);
    }
    async function load(){
      const ticket=++serial;message.textContent=texts.loading;message.dataset.type='loading';if(current==='storage')storageLabel(message,'loading',texts.loading);refresh.disabled=true;
      for(const [name,b] of Object.entries(controls))b.setAttribute('aria-current',name===current?'page':'false');
      try{
        const data=await request('company.inspect',{workspaceId:company.id,section:current,offset});
        if(!alive||ticket!==serial)return;
        if(data?.readOnly!==true||data.workspace?.id!==company.id)throw Error('INVALID_INSPECTION');
        render(data);message.textContent='';message.dataset.type='done';
      }catch(error){if(alive&&ticket===serial){results.replaceChildren();pages.replaceChildren();message.textContent=texts.error;if(current==='storage')storageLabel(message,'error',texts.error);message.dataset.type='error';}}
      finally{if(alive&&ticket===serial)refresh.disabled=false;}
    }
    load();
    return {close};
  }
  root.WFPlatformCompanyInspector=Object.freeze({
    open,close:()=>active?.close(),
    mountDevices:options=>open({...options,section:'devices'})
  });
})(window);
