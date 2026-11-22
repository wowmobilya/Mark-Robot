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
  const sections=['summary','companies','products','invoices','payments','accounts','gallery-orders','gallery-listings','files','calls','settings','audit','devices'];
  const icons={summary:'⌂',companies:'▦',products:'◈',invoices:'▤',payments:'◉',accounts:'♙',
    'gallery-orders':'▣','gallery-listings':'◫',files:'▧',calls:'⌕',settings:'⚙',audit:'≡',devices:'▤'};

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
  function open({company,request,language='ar',section='summary'}={}){
    if(!company?.id||typeof request!=='function')return;
    active?.close();
    let alive=true,serial=0,current=sections.includes(section)?section:'summary',offset=0,rows=[],lastTotal=0;
    const texts=docs[language]||docs.ar,oldFocus=document.activeElement,main=document.querySelector('body > main');
    const modal=el('section','wf-inspect'),top=el('header','wf-inspect-top'),logo=el('img'),title=el('div','wf-inspect-title'),
      back=el('button','wf-inspect-back',texts.back),actions=el('div','wf-inspect-actions'),refresh=el('button','wf-inspect-refresh',texts.refresh),
      nav=el('nav','wf-inspect-nav'),body=el('main','wf-inspect-body'),hero=el('div','wf-inspect-hero'),
      message=el('p','wf-inspect-message'),results=el('div','wf-inspect-results'),pages=el('nav','wf-inspect-pages');
    logo.src=new URL('./admin-icon-192.png',document.currentScript?.src||location.href).href;logo.width=42;logo.height=42;logo.alt='';
    title.append(el('strong','',company.name),el('small','',texts.title+' · '+texts.mode));
    back.type=refresh.type='button';actions.append(refresh,back);top.append(logo,title,actions);
    hero.append(el('h2','',company.name),el('p','',texts.note),el('p','wf-inspect-readonly',texts.readonly));
    modal.setAttribute('role','dialog');modal.setAttribute('aria-modal','true');modal.setAttribute('aria-label',company.name+' · '+texts.mode);
    modal.tabIndex=-1;modal.dir=language==='ar'?'rtl':'ltr';modal.lang=language;
    modal.append(top,nav,body);body.append(hero,message,results,pages);
    const controls={};
    for(const name of sections){
      const b=el('button','wf-inspect-nav-item');b.type='button';b.dataset.section=name;
      const sym=el('span','wf-inspect-nav-icon',icons[name]);sym.setAttribute('aria-hidden','true');
      b.append(sym,el('span','',texts[name]));b.onclick=()=>{current=name;offset=0;load();};
      nav.append(b);controls[name]=b;
    }
    main?.setAttribute('inert','');main?.setAttribute('aria-hidden','true');document.body.append(modal);modal.focus();
    const close=()=>{
      if(!alive)return;alive=false;serial++;modal.remove();main?.removeAttribute('inert');main?.removeAttribute('aria-hidden');oldFocus?.focus?.({preventScroll:true});if(active?.close===close)active=null;
    };
    active={close};
    back.onclick=close;refresh.onclick=()=>load();
    modal.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();close();}
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

    function deviceRow(record){
      const w=deviceCopy[language]||deviceCopy.ar;
      const item=el('article','wf-inspect-record wf-inspect-device'),top=el('div','wf-inspect-device-head'),
        icon=el('span','wf-inspect-device-icon'),title=el('div','wf-inspect-device-name');
      const type=['phone','tablet','desktop'].includes(record.reportedDevice)?record.reportedDevice:'unknown';
      icon.textContent={phone:'▯',tablet:'▣',desktop:'▤',unknown:'◇'}[type];
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
        valueNode.dir='auto';grid.append(label,valueNode);
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
      if(current==='devices')results.append(el('p','wf-inspect-device-warning',(deviceCopy[language]||deviceCopy.ar).warning));
      if(!rows.length){results.append(el('p','wf-inspect-empty',texts.empty));return;}
      const input=el('input','wf-inspect-search');input.type='search';input.placeholder=texts.search;input.setAttribute('aria-label',texts.search);
      const list=el('div','wf-inspect-record-list');results.append(input,list);
      const paint=()=>{const q=input.value.trim().toLocaleLowerCase();list.replaceChildren();
        for(const row of rows)if(!q||JSON.stringify(row).toLocaleLowerCase().includes(q))list.append(current==='devices'?deviceRow(row):rowItem(row));
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
      const ticket=++serial;message.textContent=texts.loading;message.dataset.type='loading';refresh.disabled=true;
      for(const [name,b] of Object.entries(controls))b.setAttribute('aria-current',name===current?'page':'false');
      try{
        const data=await request('company.inspect',{workspaceId:company.id,section:current,offset});
        if(!alive||ticket!==serial)return;
        if(data?.readOnly!==true||data.workspace?.id!==company.id)throw Error('INVALID_INSPECTION');
        render(data);message.textContent='';message.dataset.type='done';
      }catch(error){if(alive&&ticket===serial){results.replaceChildren();pages.replaceChildren();message.textContent=texts.error;message.dataset.type='error';}}
      finally{if(alive&&ticket===serial)refresh.disabled=false;}
    }
    load();
  }
  root.WFPlatformCompanyInspector=Object.freeze({open,close:()=>active?.close()});
})(window);
