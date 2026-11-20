/* Rate sources use TRY per USD and TRY per EUR on Turkish boards.
   The rest of the app stores TRY per USD and EUR per USD. */
(function (root) {
  'use strict';
  const languages = ['ar', 'en', 'tr', 'fr', 'ru'];
  const catalog = {
    market: {group:'reference', names:['السعر المرجعي الدولي','International reference','Uluslararası referans kuru','Taux de référence international','Международный справочный курс']},
    tcmb: {group:'reference', names:['البنك المركزي التركي','Central Bank of Türkiye','Türkiye Cumhuriyet Merkez Bankası','Banque centrale de Turquie','Центральный банк Турции'], url:'https://www.turkiye.gov.tr/doviz-kurlari'},
    ziraat: {group:'banks', category:'deposit', board:true, names:['بنك زراعات','Ziraat Bank','Ziraat Bankası','Banque Ziraat','Банк Ziraat'], url:'https://www.ziraatbank.com.tr/tr/fiyatlar-ve-oranlar'},
    isbank: {group:'banks', category:'deposit', board:true, names:['بنك إيش','İşbank','Türkiye İş Bankası','Banque İşbank','Банк İşbank'], url:'https://www.isbank.com.tr/doviz-kurlari'},
    garanti: {group:'banks', category:'deposit', board:true, names:['بنك غارانتي BBVA','Garanti BBVA','Garanti BBVA','Banque Garanti BBVA','Банк Garanti BBVA'], url:'https://www.garantibbva.com.tr/tr/doviz-kurlari'},
    sultan: {group:'offices', names:['صرافة سلطان · إينغول','Sultan Exchange · İnegöl','Sultan Döviz · İnegöl','Bureau de change Sultan · İnegöl','Обменный пункт Sultan · Инегёль'], url:'https://sultandoviz.com/'},
    mizan: {group:'offices', names:['صرافة ميزان · إسطنبول','Mizan Exchange · Istanbul','Mizan Döviz · İstanbul','Bureau de change Mizan · Istanbul','Обменный пункт Mizan · Стамбул']},
    manual: {group:'offices', names:['مصدر يدوي آخر','Other manual source','Diğer manuel kaynak','Autre source manuelle','Другой ручной источник']}
  };
  // Ship the official bank directory separately so its data can be maintained
  // without changing accounting or fetch behavior. Every bank remains manual.
  let bankDirectory=root.WFCurrencyBankCatalog;
  if (!bankDirectory && typeof module!=='undefined' && module.exports) {
    try { bankDirectory=require('./currency-bank-catalog.js'); } catch (_) {}
  }
  for (const bank of bankDirectory?.banks || []) {
    if (!bank || !/^[a-z][a-z0-9-]{1,79}$/.test(bank.id) ||
      (Object.hasOwn(catalog,bank.id) && catalog[bank.id].group!=='banks')) continue;
    const previous=catalog[bank.id];
    const rateUrl=safeUrl(bank.rateUrl) || previous?.url || '';
    catalog[bank.id]={group:'banks',category:bank.category,officialName:bank.officialName,aliases:bank.aliases || [],
      names:languages.map(locale=>bank.name?.[locale] || bank.officialName || previous?.names[languages.indexOf(locale)] || bank.id),
      url:rateUrl || safeUrl(bank.url),board:Boolean(rateUrl),status:bank.status || ''};
  }
  const copy = {
    source:['مصدر أسعار الصرف','Exchange rate source','Kur kaynağı','Source des taux de change','Источник курсов'],
    reference:['أسعار مرجعية','Reference rates','Referans kurları','Taux de référence','Справочные курсы'],
    banks:['البنوك التركية','Turkish banks','Türk bankaları','Banques turques','Турецкие банки'],
    offices:['الصرافون والمصادر اليدوية','Exchange offices and manual sources','Döviz büroları ve manuel kaynaklar','Bureaux de change et sources manuelles','Обменные пункты и ручные источники'],
    side:['نوع السعر','Quote type','Kur türü','Type de cours','Тип курса'],
    midpoint:['سعر مرجعي','Reference rate','Referans kuru','Cours de référence','Справочный курс'],
    buy:['شراء الجهة للعملة','Provider buys currency','Kurumun döviz alış kuru','Achat par l’établissement','Покупка валюты учреждением'],
    sell:['بيع الجهة للعملة','Provider sells currency','Kurumun döviz satış kuru','Vente par l’établissement','Продажа валюты учреждением'],
    feed:['جلب من المصدر','Fetch from source','Kaynaktan al','Obtenir auprès de la source','Получить из источника'],
    manual:['إدخال يدوي','Manual entry','Manuel giriş','Saisie manuelle','Ручной ввод'],
    method:['طريقة التحديث','Update method','Güncelleme yöntemi','Mode de mise à jour','Способ обновления'],
    open:['فتح شاشة المصدر ↗','Open source board ↗','Kaynak ekranını aç ↗','Ouvrir le tableau des cours ↗','Открыть табло курсов ↗'],
    customUrl:['رابط الشاشة (اختياري)','Board URL (optional)','Ekran bağlantısı (isteğe bağlı)','Adresse du tableau (facultatif)','Ссылка на табло (необязательно)'],
    usd:['ليرة لكل دولار أمريكي','TRY per US dollar','1 ABD doları karşılığı TRY','TRY pour 1 dollar US','TRY за 1 доллар США'],
    eur:['ليرة لكل يورو','TRY per euro','1 euro karşılığı TRY','TRY pour 1 euro','TRY за 1 евро'],
    manualHint:['انقل سعري الدولار واليورو من العمود نفسه في شاشة المصدر. تُحسب أسعار التحويل الأخرى منهما.','Copy both rates from the same column on the board. Other conversion rates are calculated from these two values.','USD ve euro kurlarını ekrandaki aynı sütundan girin. Diğer dönüşümler bu iki kurdan hesaplanır.','Recopiez les deux taux de la même colonne du tableau. Les autres conversions sont calculées à partir de ces deux valeurs.','Введите оба курса из одного столбца табло. Остальные курсы пересчитываются из этих значений.'],
    tcmbHint:['سعر يومي مرجعي من البنك المركزي التركي عبر Frankfurter.','Daily central bank reference midpoint via Frankfurter.','Frankfurter üzerinden günlük merkez bankası referans orta kuru.','Cours moyen de référence quotidien de la banque centrale via Frankfurter.','Ежедневный средний справочный курс центрального банка через Frankfurter.'],
    xmlHint:['نشرة الصرف الرسمية للبنك المركزي التركي. إذا تعذّر جلبها يمكنك إدخال الأسعار من شاشة المصدر.','Official TCMB foreign-exchange bulletin. If the feed is unavailable, enter both rates from the board.','TCMB resmî döviz bülteni. Veri alınamazsa iki kuru da kaynak ekranından girebilirsiniz.','Bulletin officiel des devises de la TCMB. Si le flux est indisponible, saisissez les deux cours du tableau.','Официальный валютный бюллетень TCMB. Если он недоступен, введите оба курса с табло.'],
    marketHint:['سعر مرجعي يومي من Frankfurter، أو من ExchangeRate-API عند تعذّر الجلب.','Daily reference from Frankfurter, or ExchangeRate-API if unavailable.','Günlük referans kuru Frankfurter üzerinden, erişilemezse ExchangeRate-API üzerinden alınır.','Référence quotidienne de Frankfurter, ou d’ExchangeRate-API en cas d’indisponibilité.','Ежедневный справочный курс от Frankfurter, при недоступности — от ExchangeRate-API.'],
    apply:['تحديث واعتماد الأسعار','Update and apply rates','Kurları güncelle ve uygula','Actualiser et appliquer les taux','Обновить и применить курсы'],
    enter:['اعتماد الأسعار المدخلة','Apply entered rates','Girilen kurları uygula','Appliquer les taux saisis','Применить введённые курсы'],
    loading:['جارٍ التحديث…','Updating…','Güncelleniyor…','Actualisation…','Обновление…'],
    ok:['تم اعتماد الأسعار','Rates applied','Kurlar uygulandı','Taux appliqués','Курсы применены'],
    failed:['تعذّر جلب أسعار المصدر. بقيت الأسعار الحالية محفوظة.','Could not retrieve the source rates. Your current rates were kept.','Kaynağın kurları alınamadı. Mevcut kurlar korundu.','Les cours de cette source sont indisponibles. Les taux actuels sont conservés.','Не удалось получить курсы источника. Текущие курсы сохранены.'],
    stale:['نشرة المصدر قديمة أو تاريخها غير صالح. بقيت الأسعار الحالية محفوظة.','The source publication is outdated or has an invalid date. Current rates were kept.','Kaynağın bülteni eski veya tarihi geçersiz. Mevcut kurlar korundu.','La publication est ancienne ou sa date est incorrecte. Les taux actuels sont conservés.','Публикация устарела или содержит неверную дату. Текущие курсы сохранены.'],
    unsaved:['تعذّر حفظ التحديث. بقيت الأسعار السابقة.','Could not save the update. Previous rates were kept.','Güncelleme kaydedilemedi. Önceki kurlar korundu.','Enregistrement impossible. Les taux précédents sont conservés.','Не удалось сохранить изменения. Предыдущие курсы сохранены.'],
    invalid:['أدخل سعرين موجبين ورابط HTTPS صالحًا إن وجد.','Enter two positive rates and a valid HTTPS URL if supplied.','İki pozitif kur girin. Bağlantı girdiyseniz HTTPS adresi kullanın.','Saisissez deux taux positifs et, le cas échéant, une adresse HTTPS valide.','Введите два положительных курса и корректную HTTPS-ссылку, если она указана.'],
    active:['الأسعار المعتمدة','Applied rates','Uygulanan kurlar','Taux appliqués','Применённые курсы'],
    legacy:['المصدر غير مسجّل','Source unrecorded','Kaynak kaydedilmemiş','Source non enregistrée','Источник не записан'],
    defaults:['أسعار التطبيق الأولية','Initial app rates','Başlangıç kurları','Taux initiaux de l’application','Исходные курсы приложения'],
    published:['تاريخ النشرة','Published','Bülten tarihi','Publication','Дата публикации'],
    applied:['وقت الاعتماد','Applied','Uygulama zamanı','Application','Дата применения'],
    chooseSource:['اختر مصدر السعر','Choose a rate source','Kur kaynağını seçin','Choisir une source de taux','Выберите источник курсов'],
    chooserHint:['اختر الجهة، ثم حدّد السعر وطريقة اعتماده.','Choose a provider, then set the quote and how to apply it.','Kurumu seçin, ardından kur türünü ve uygulama yöntemini belirleyin.','Choisissez l’établissement, puis le cours et son mode d’application.','Выберите учреждение, затем тип курса и способ его применения.'],
    all:['الكل','All','Tümü','Tous','Все'],
    search:['ابحث عن بنك أو مصدر','Search for a bank or source','Banka veya kaynak ara','Rechercher une banque ou une source','Поиск банка или источника'],
    clearSearch:['مسح البحث','Clear search','Aramayı temizle','Effacer la recherche','Очистить поиск'],
    noResults:['لا توجد مصادر مطابقة لهذا البحث.','No sources match this search.','Bu aramayla eşleşen kaynak yok.','Aucune source ne correspond à cette recherche.','По этому запросу источников не найдено.'],
    results:['المصادر','Sources','Kaynaklar','Sources','Источники'],
    back:['المصادر','Sources','Kaynaklar','Sources','Источники'],
    currentSource:['المصدر المعتمد','Applied source','Uygulanan kaynak','Source appliquée','Применённый источник'],
    editCurrent:['إعدادات المصدر','Source settings','Kaynak ayarları','Réglages de la source','Настройки источника'],
    pendingChoice:['لن تتغيّر أسعارك المحفوظة حتى تضغط زر الاعتماد.','Your saved rates change only after you apply this source.','Kaynağı uygulayana kadar kayıtlı kurlarınız değişmez.','Vos taux enregistrés changent uniquement après application.','Сохранённые курсы изменятся только после применения источника.'],
    deposit:['بنوك الودائع','Deposit banks','Mevduat bankaları','Banques de dépôt','Депозитные банки'],
    participation:['البنوك التشاركية','Participation banks','Katılım bankaları','Banques participatives','Банки участия'],
    development:['بنوك التنمية والاستثمار','Development and investment banks','Kalkınma ve yatırım bankaları','Banques de développement et d’investissement','Банки развития и инвестиций'],
    website:['الموقع الرسمي','Official website','Resmî internet sitesi','Site officiel','Официальный сайт'],
    bankManual:['اعتماد يدوي من سعر البنك. اختر عمود الشراء أو البيع نفسه للدولار واليورو.','Apply the bank’s quote manually. Use the same buying or selling column for USD and EUR.','Banka kurunu elle uygulayın. USD ve EUR için aynı alış veya satış sütununu kullanın.','Appliquez manuellement le cours bancaire. Utilisez la même colonne d’achat ou de vente pour USD et EUR.','Введите банковский курс вручную. Для USD и EUR используйте один столбец покупки или продажи.'],
    directory:['دليل البنوك التركية','Turkish bank directory','Türkiye banka rehberi','Répertoire des banques turques','Каталог банков Турции'],
    directorySource:['الدليل الرسمي','Official directory','Resmî liste','Répertoire officiel','Официальный перечень'],
    managed:['بإدارة صندوق ضمان الودائع TMSF','Under TMSF management','TMSF yönetiminde','Sous la gestion du TMSF','Под управлением TMSF']
  };
  const langIndex = lang => Math.max(0, languages.indexOf(lang));
  const word = (key,lang) => copy[key][langIndex(lang)];
  const name = (id,lang) => catalog[id]?.names[langIndex(lang)] || String(id);
  const known = id => typeof id==='string' && Object.hasOwn(catalog,id);
  function searchText(value) {
    return String(value??'').normalize('NFKD').toLowerCase()
      .replace(/[\u0300-\u036f\u064b-\u065f\u0670\u0640]/g,'').replace(/[أإآٱ]/g,'ا').replace(/ى/g,'ي').replace(/ة/g,'ه').replace(/ı/g,'i');
  }
  function searchSources({query='',group='all',category='all',lang='ar'}={}) {
    const tokens=searchText(query).trim().split(/\s+/).filter(Boolean);
    const order=['reference','banks','offices'];
    return Object.keys(catalog).filter(id=>{
      const item=catalog[id];
      if (group!=='all' && item.group!==group) return false;
      if (group==='banks' && category!=='all' && item.category!==category) return false;
      const haystack=searchText([id,item.officialName,...(item.aliases||[]),...item.names].join(' '));
      return tokens.every(token=>haystack.includes(token));
    }).sort((a,b)=>order.indexOf(catalog[a].group)-order.indexOf(catalog[b].group) || name(a,lang).localeCompare(name(b,lang),lang));
  }
  function modes(id,side) {
    return id==='tcmb'&&side!=='reference'?['feed','manual']:(id==='market'||id==='tcmb'?['feed']:['manual']);
  }
  function safeUrl(value) {
    if (typeof value !== 'string' || value.length>2048) return '';
    try {
      const url=new URL(value.trim());
      return url.protocol==='https:' && !url.username && !url.password ? url.href : '';
    } catch { return ''; }
  }
  function sides(id) {
    if (id==='market') return ['reference'];
    if (id==='tcmb' || id==='manual') return ['reference','buy','sell'];
    return ['buy','sell'];
  }
  function normalizeSource(raw) {
    if (!raw || !known(raw.id) || !sides(raw.id).includes(raw.side)) return null;
    const {id,side,mode,via}=raw;
    const manual=mode==='manual' && id!=='market' && (id!=='tcmb'||side!=='reference');
    const feed=mode==='feed' && ((id==='market'&&['frankfurter','exchangerate'].includes(via)) ||
      (id==='tcmb'&&via===(side==='reference'?'frankfurter':'tcmb')));
    if (!manual && !feed) return null;
    const source={id,side,mode,via:feed?via:null};
    if (feed && via!=='exchangerate') source.dateOnly=true;
    if (['manual','mizan'].includes(id) && safeUrl(raw.url)) source.url=safeUrl(raw.url);
    return source;
  }
  function parseRate(value) {
    const input=String(value??'').trim().replace(/[٠-٩]/g,c=>String(c.charCodeAt(0)-1632)).replace(/[۰-۹]/g,c=>String(c.charCodeAt(0)-1776)).replace(/[٫,]/g,'.');
    const num=/^\d+(?:\.\d+)?$/.test(input)?Number(input):NaN;
    return Number.isFinite(num)&&num>0 ? num : NaN;
  }
  function validRates(usdTry,usdEur) {
    return [usdTry,usdEur,1/usdTry,1/usdEur,usdTry/usdEur,usdEur/usdTry].every(v=>typeof v==='number' && Number.isFinite(v) && v>0);
  }
  function fromBoard(usd,eur) {
    const usdTry=parseRate(usd),eurTry=parseRate(eur),usdEur=usdTry/eurTry;
    if (!validRates(usdTry,usdEur)) throw Error('invalid');
    return {usdTry,usdEur};
  }
  function validDate(day) {
    return typeof day==='string' && /^\d{4}-\d\d-\d\d$/.test(day) && Number.isFinite(Date.parse(day)) && new Date(day).toISOString().slice(0,10)===day;
  }
  function referenceRows(rows) {
    if (!Array.isArray(rows)) throw Error('failed');
    const rate=code=>rows.filter(row=>row?.base==='USD' && row.quote===code);
    const usdTry=rate('TRY'),usdEur=rate('EUR');
    if (usdTry.length!==1||usdEur.length!==1) throw Error('failed');
    const [lira]=usdTry,[euro]=usdEur;
    if (!validDate(lira.date)||euro.date!==lira.date||!validRates(lira.rate,euro.rate)) throw Error('failed');
    return {usdTry:lira.rate,usdEur:euro.rate,updatedAt:lira.date};
  }
  function bulletin(doc,side) {
    const header=doc.documentElement;
    if (header?.nodeName!=='Tarih_Date' || !['buy','sell'].includes(side)) throw Error('failed');
    const date=(header.getAttribute('Tarih')||'').split('.').reverse().join('-');
    if (!validDate(date)) throw Error('failed');
    const field=side==='buy'?'ForexBuying':'ForexSelling';
    const boardRate=code=>{
      const rows=header.querySelectorAll('Currency[CurrencyCode="'+code+'"]');
      if (rows.length!==1) throw Error('failed');
      return parseRate(rows[0].querySelector(field)?.textContent)/parseRate(rows[0].querySelector('Unit')?.textContent);
    };
    return {...fromBoard(boardRate('USD'),boardRate('EUR')),updatedAt:date};
  }
  async function getQuote(choice,fetcher,market) {
    const source=normalizeSource({...choice,via:choice.id==='tcmb'&&choice.side!=='reference'?'tcmb':'frankfurter'});
    if (!source || (choice.url && ['mizan','manual'].includes(choice.id) && !safeUrl(choice.url))) throw Error('invalid');
    if (source.mode==='manual') return {...fromBoard(choice.usd,choice.eur),source,updatedAt:null};
    if (source.id==='market') {
      const data=await market();
      const actual=normalizeSource({...source,via:data.via});
      if (!actual || !validRates(data.usdTry,data.usdEur)) throw Error('failed');
      return {...data,source:actual};
    }
    const midpoint=source.side==='reference';
    const url=midpoint?'https://api.frankfurter.dev/v2/providers/tcmb/rates?base=USD&quotes=TRY,EUR':'https://www.tcmb.gov.tr/kurlar/today.xml';
    const response=await fetcher(url,{cache:'no-store',signal:AbortSignal.timeout(6500)});
    if (!response.ok) throw Error('failed');
    const rates=midpoint?referenceRows(await response.json()):bulletin(new DOMParser().parseFromString(await response.text(),'application/xml'),source.side);
    return {...rates,source};
  }
  function describe(raw,lang) {
    const source=normalizeSource(raw);
    if (!source) return word('legacy',lang);
    const via=source.via==='frankfurter'?'Frankfurter':source.via==='exchangerate'?'ExchangeRate-API':'';
    return [name(source.id,lang),word(source.side==='reference'?'midpoint':source.side,lang),source.mode==='manual'?word('manual',lang):via].filter(Boolean).join(' · ');
  }
  function sameQuote(row,expected) {
    return (row?.time||null)===(expected.time||null) && (row?.updatedAt||null)===(expected.updatedAt||null) && JSON.stringify(normalizeSource(row?.source))===JSON.stringify(normalizeSource(expected.source));
  }
  function validatePublication(row,previous={},now=Date.now()) {
    const source=normalizeSource(row.source);
    if (source?.mode!=='feed') return;
    const at=typeof row.updatedAt==='string'?Date.parse(row.updatedAt):NaN;
    const day=86400000;
    if (!Number.isFinite(at) || at>now+day || at<now-14*day) throw Error('stale');
    const oldSource=normalizeSource(previous.source),oldAt=Date.parse(previous.updatedAt);
    if (oldSource?.mode==='feed' && oldSource.id===source.id && oldSource.side===source.side && Number.isFinite(oldAt)) {
      const daily=source.dateOnly || oldSource.dateOnly;
      if ((daily?Math.floor(at/day):at)<(daily?Math.floor(oldAt/day):oldAt)) throw Error('stale');
    }
  }
  function initialRates(settings={},row=null) {
    const positive=(value,fallback)=>Number.isFinite(Number(value))&&Number(value)>0?Number(value):fallback;
    return {usdTry:positive(settings.manualUsdTry,positive(row?.value,46.98)),
      usdEur:positive(settings.manualUsdEur,positive(row?.eur,.92)),
      rateTime:row?.time||null,rateUpdatedAt:row?.updatedAt||null,
      rateSource:normalizeSource(row?.source),rateHasSaved:!!row};
  }
  async function commitQuote(row,expected,background) {
    validatePublication(row,expected);
    const connection=await initDB();
    if (root.WF_RESTORE_WRITE_LOCK) throw Error('unsaved');
    return new Promise((resolve,reject)=>{
      const tx=connection.transaction('settings','readwrite'),store=tx.objectStore('settings');
      const oldRate=store.get('usdTry'),main=store.get('main');
      tx.oncomplete=()=>{resolve();};
      tx.onabort=()=>reject(tx.error||Error('unsaved'));
      main.onsuccess=()=>{
        const settings=main.result;
        const manualChanged=['manualUsdTry','manualUsdEur'].some(key=>(settings?.[key]||null)!==(expected[key]||null));
        if ((background && (oldRate.result || settings?.manualUsdTry || settings?.manualUsdEur)) || manualChanged || !sameQuote(oldRate.result,expected)) {tx.abort();return;}
        if (settings?.manualUsdTry || settings?.manualUsdEur) store.put({...settings,manualUsdTry:null,manualUsdEur:null});
        store.put({...oldRate.result,...row});
      };
    });
  }
  function dateLabel(value,lang,dateOnly=false) {
    if (!value) return '';
    const date=new Date(value);
    if (!Number.isFinite(date.getTime())) return String(value);
    return new Intl.DateTimeFormat(lang==='ar'?'ar-u-nu-latn':lang,dateOnly?{dateStyle:'medium',timeZone:'UTC'}:{dateStyle:'medium',timeStyle:'short'}).format(date);
  }
  function mount(onApply) {
    const panel=document.getElementById('stab-currency'),rates=panel?.querySelector('.wf-settings-rates');
    if (!rates) return null;
    const old=rates.nextElementSibling;
    if (old?.contains(document.getElementById('stManualUsdTry'))) old.hidden=true;
    rates.querySelector('button[onclick="fetchRate()"]')?.remove();
    const make=(tag,cls,text)=>{const el=document.createElement(tag);if(cls)el.className=cls;if(text)el.textContent=text;return el;};
    const paths={
      reference:'<path d="m3 9 9-6 9 6M4 10h16M5 11v7m5-7v7m4-7v7m5-7v7M3 21h18"/>',
      banks:'<path d="M4 21V6l8-3v18M12 9h8v12M7 8h2m-2 4h2m-2 4h2m7-3h2m-2 4h2M2 21h20"/>',
      offices:'<path d="M4 8h15m-4-4 4 4-4 4M20 16H5m4-4-4 4 4 4"/>',
      all:'<rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/>',
      search:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
      back:'<path d="m14 5-7 7 7 7M7 12h14"/>',
      open:'<path d="M14 3h7v7m0-7L10 14M10 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5"/>',
      check:'<path d="m5 12 4 4L19 6"/>',
      feed:'<path d="M20 8a8 8 0 0 0-14-3L3 8m0-5v5h5M4 16a8 8 0 0 0 14 3l3-3m0 5v-5h-5"/>',
      manual:'<path d="m14 5 5 5M4 20l4-1L21 6l-4-4L4 15Z"/>',
      buy:'<path d="M12 3v13m-5-5 5 5 5-5M4 19v2h16v-2"/>',
      sell:'<path d="M12 17V4m-5 5 5-5 5 5M4 19v2h16v-2"/>'
    };
    function icon(key) {const el=make('span','wf-fx-icon');el.setAttribute('aria-hidden','true');el.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">'+(paths[key]||paths.banks)+'</svg>';return el;}
    const form=make('form','wf-fx-source');form.noValidate=true;
    const picker=make('section','wf-fx-picker');
    const current=make('div','wf-fx-current'),currentBody=make('div','wf-fx-current-body'),currentLabel=make('small'),currentName=make('strong'),currentMeta=make('span'),currentQuotes=make('div','wf-fx-current-quotes');
    const editCurrent=make('button','wf-fx-current-edit');editCurrent.type='button';
    currentBody.append(currentLabel,currentName,currentMeta);current.append(icon('check'),currentBody,editCurrent,currentQuotes);
    const pickerHeading=make('header','wf-fx-picker-heading'),pickerTitle=make('h3'),pickerHint=make('p');pickerHeading.append(pickerTitle,pickerHint);
    const searchLabel=make('label','wf-fx-search'),search=make('input'),searchName=make('span','wf-fx-sr-only');
    search.type='search';search.name='source-search';search.autocomplete='off';search.id='wfFxSourceSearch';searchLabel.htmlFor=search.id;
    const clearSearch=make('button','wf-fx-search-clear');clearSearch.type='button';clearSearch.textContent='×';
    searchLabel.append(icon('search'),searchName,search,clearSearch);
    const groups=make('div','wf-fx-groups');groups.setAttribute('role','tablist');
    const bankFilters=make('div','wf-fx-bank-filters');bankFilters.setAttribute('role','group');
    const resultsTop=make('div','wf-fx-results-top'),resultCount=make('span');resultCount.setAttribute('role','status');resultCount.setAttribute('aria-live','polite');resultsTop.append(resultCount);
    const list=make('div','wf-fx-source-list');list.id='wfFxSourceList';list.setAttribute('role','tabpanel');list.tabIndex=0;
    const empty=make('p','wf-fx-empty'),directory=make('p','wf-fx-directory');
    picker.append(current,pickerHeading,searchLabel,groups,bankFilters,resultsTop,list,empty,directory);
    const details=make('section','wf-fx-details'),back=make('button','wf-fx-back');back.type='button';back.append(icon('back'),make('span'));
    const sourceHead=make('header','wf-fx-detail-head'),sourceBadge=make('span','wf-fx-provider-badge'),sourceText=make('div'),sourceTitle=make('h3'),officialName=make('span','wf-fx-official'),sourceTags=make('div','wf-fx-provider-tags');sourceTitle.tabIndex=-1;sourceTitle.id='wfFxProviderTitle';
    sourceText.append(sourceTitle,officialName,sourceTags);sourceHead.append(sourceBadge,sourceText);details.setAttribute('aria-labelledby',sourceTitle.id);
    const pendingHint=make('p','wf-fx-pending-hint');
    const choiceGrid=make('div','wf-fx-choice-grid'),sideBox=make('fieldset'),sideTitle=make('legend'),sideControls=make('div','wf-fx-segments'),modeBox=make('fieldset'),modeTitle=make('legend'),modeControls=make('div','wf-fx-segments');
    sideBox.append(sideTitle,sideControls);modeBox.append(modeTitle,modeControls);choiceGrid.append(sideBox,modeBox);
    const help=make('p','wf-fx-help'),board=make('a','wf-fx-board');board.target='_blank';board.rel='noopener noreferrer';board.append(make('span'),icon('open'));
    const inputs=make('div','wf-fx-fields wf-fx-inputs');
    inputs.innerHTML='<label><span data-word="usd"></span><input class="fc" name="usd" inputmode="decimal" dir="ltr" autocomplete="off"></label><label><span data-word="eur"></span><input class="fc" name="eur" inputmode="decimal" dir="ltr" autocomplete="off"></label><label class="wf-fx-wide"><span data-word="customUrl"></span><input class="fc" type="url" name="url" placeholder="https://" dir="ltr" autocomplete="off"></label>';
    const fields=Object.fromEntries(['usd','eur','url'].map(key=>[key,inputs.querySelector('[name="'+key+'"]')]));
    const submit=make('button','btn btn-p wf-fx-apply');submit.type='submit';submit.append(icon('check'),make('span'));
    const actions=make('div','wf-fx-details-actions');actions.append(submit);
    details.append(back,sourceHead,pendingHint,choiceGrid,help,board,inputs,actions);
    const status=make('p','wf-fx-status');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
    form.append(picker,details,status);rates.before(form);
    const active=make('div','wf-fx-summary');rates.append(active);
    let lastSource,selected='market',selectedSide='reference',selectedMode='feed',busy=false,result='',view='picker',group='reference',bankCategory='all',query='';
    const locale=()=>languages.includes(S.lang)?S.lang:'ar';
    const w=key=>word(key,locale());
    const groupButtons=new Map();
    for (const value of ['reference','banks','offices','all']) {
      const button=make('button','wf-fx-group');button.type='button';button.dataset.fxGroup=value;button.id='wfFxGroup-'+value;button.setAttribute('role','tab');button.setAttribute('aria-controls',list.id);button.append(icon(value),make('span'));
      button.addEventListener('click',()=>{if(busy)return;group=value;bankCategory='all';renderPicker();});
      groupButtons.set(value,button);groups.append(button);
    }
    groups.addEventListener('keydown',event=>{
      if (!['ArrowLeft','ArrowRight','Home','End'].includes(event.key) || busy) return;
      const values=[...groupButtons.keys()],index=values.indexOf(group),rtl=document.documentElement.dir==='rtl';
      let next=event.key==='Home'?0:event.key==='End'?values.length-1:(index+(event.key==='ArrowRight'?(rtl?-1:1):(rtl?1:-1))+values.length)%values.length;
      event.preventDefault();groupButtons.get(values[next]).click();groupButtons.get(values[next]).focus();
    });
    const bankButtons=new Map();
    for(const value of ['all','deposit','participation','development']) {
      const button=make('button','wf-fx-bank-filter');button.type='button';button.dataset.fxBankCategory=value;
      button.addEventListener('click',()=>{if(busy)return;bankCategory=value;renderPicker();});bankButtons.set(value,button);bankFilters.append(button);
    }
    function boardLink() {
      const item=catalog[selected],url=item.url || (['mizan','manual'].includes(selected)?safeUrl(fields.url.value):'');
      board.hidden=!url;
      if(url)board.href=url;else board.removeAttribute('href');
      board.querySelector('span').textContent=w(item.group==='banks'&&!item.board?'website':'open');
    }
    function clearManualFields() {fields.usd.value='';fields.eur.value='';}
    function selectProvider(id) {
      if(busy||!known(id))return;
      if(selected!==id){
        const saved=normalizeSource(S.rateSource);selected=id;selectedSide=saved?.id===id?saved.side:sides(id)[0];selectedMode=saved?.id===id?saved.mode:modes(id,selectedSide)[0];
        clearManualFields();fields.url.value=saved?.id===id?saved.url||'':'';
      }
      result='';view='details';render();sourceTitle.focus();
    }
    function renderPicker() {
      const lang=locale(),saved=normalizeSource(S.rateSource);
      pickerTitle.textContent=w('chooseSource');pickerHint.textContent=w('chooserHint');searchName.textContent=w('search');search.placeholder=w('search');search.disabled=busy;
      clearSearch.hidden=!query;clearSearch.disabled=busy;clearSearch.setAttribute('aria-label',w('clearSearch'));
      groups.setAttribute('aria-label',w('source'));bankFilters.setAttribute('aria-label',w('banks'));
      for(const [value,button]of groupButtons){button.querySelector('span:last-child').textContent=w(value);button.setAttribute('aria-selected',String(group===value));button.tabIndex=group===value?0:-1;button.disabled=busy;}
      list.setAttribute('aria-labelledby',groupButtons.get(group).id);
      bankFilters.hidden=group!=='banks';
      for(const[value,button]of bankButtons){button.textContent=w(value);button.setAttribute('aria-pressed',String(value===bankCategory));button.disabled=busy;}
      const ids=searchSources({query,group,category:bankCategory,lang});resultCount.textContent=w('results')+' · '+ids.length;empty.textContent=w('noResults');empty.hidden=ids.length>0;
      const focused=document.activeElement?.closest?.('[data-fx-provider]')?.dataset.fxProvider;
      list.replaceChildren();
      for(const id of ids){
        const item=catalog[id],button=make('button','wf-fx-provider');button.type='button';button.dataset.fxProvider=id;button.setAttribute('aria-pressed',String(id===selected));button.disabled=busy;
        const body=make('span','wf-fx-provider-copy'),title=make('strong','',name(id,lang)),subtitle=make('small');
        const category=item.status==='sdif-management'?w('managed'):item.group==='banks'&&copy[item.category]?w(item.category):w(item.group);
        subtitle.textContent=category;body.append(title,subtitle);
        button.append(icon(item.group),body);
        if(saved?.id===id){const applied=make('span','wf-fx-applied-tag',w('currentSource'));button.append(applied);}
        else{const arrow=make('span','wf-fx-provider-arrow');arrow.append(icon('back'));button.append(arrow);}
        button.addEventListener('click',()=>selectProvider(id));list.append(button);
      }
      if(focused)list.querySelector('[data-fx-provider="'+focused+'"]')?.focus({preventScroll:true});
      const bankCount=Object.values(catalog).filter(item=>item.group==='banks').length;
      directory.replaceChildren();directory.hidden=!(group==='banks'||group==='all');
      if(!directory.hidden){
        directory.append(document.createTextNode(w('directory')+' · '+bankCount+(bankDirectory?.asOf?' · '+dateLabel(bankDirectory.asOf,lang,true):'')));
        const source=bankDirectory?.sources?.find(item=>safeUrl(item.url));
        if(source){const link=make('a','',w('directorySource'));link.href=source.url;link.target='_blank';link.rel='noopener noreferrer';directory.append(link);}
      }
    }
    function renderChoices(container,values,value,kind,choose) {
      const focused=document.activeElement?.dataset?.['fx'+kind[0].toUpperCase()+kind.slice(1)];
      container.replaceChildren();
      for(const option of values){
        const label=w(kind==='side'&&option==='reference'?'midpoint':option);
        const button=make(values.length===1?'span':'button','wf-fx-segment');button.append(icon(option==='reference'?'reference':option),make('span','',label));
        if(values.length>1){button.type='button';button.setAttribute('aria-pressed',String(value===option));button.disabled=busy;button.dataset['fx'+kind[0].toUpperCase()+kind.slice(1)]=option;button.addEventListener('click',()=>{if(!busy)choose(option);});}
        else button.classList.add('wf-fx-single');
        container.append(button);
      }
      if(focused)container.querySelector('[data-fx-'+kind+'="'+focused+'"]')?.focus({preventScroll:true});
    }
    function render() {
      const lang=locale(),saved=normalizeSource(S.rateSource),signature=JSON.stringify(saved);
      if(signature!==lastSource){lastSource=signature;if(saved){selected=saved.id;selectedSide=saved.side;selectedMode=saved.mode;fields.url.value=saved.url||'';}}
      const choices=sides(selected);if(!choices.includes(selectedSide))selectedSide=choices[0];
      const methods=modes(selected,selectedSide);if(!methods.includes(selectedMode))selectedMode=methods[0];
      const item=catalog[selected];
      picker.hidden=view!=='picker';details.hidden=view!=='details';rates.hidden=view!=='details';form.dataset.view=view;
      form.setAttribute('aria-busy',String(busy));
      renderPicker();
      back.querySelector('span:last-child').textContent=w('back');back.disabled=busy;
      sourceTitle.textContent=name(selected,lang);officialName.textContent=item.officialName||'';officialName.hidden=!item.officialName||item.officialName===sourceTitle.textContent;
      sourceBadge.replaceChildren(icon(item.group));sourceTags.replaceChildren(make('span','wf-fx-mode-tag',w(selectedMode)));
      if(saved?.id===selected)sourceTags.append(make('span','wf-fx-applied-tag',w('currentSource')));
      if(item.status==='sdif-management')sourceTags.append(make('span','wf-fx-mode-tag',w('managed')));
      pendingHint.textContent=w('pendingChoice');sideTitle.textContent=w('side');modeTitle.textContent=w('method');
      renderChoices(sideControls,choices,selectedSide,'side',value=>{selectedSide=value;clearManualFields();result='';render();});
      renderChoices(modeControls,methods,selectedMode,'mode',value=>{selectedMode=value;result='';render();});
      for(const node of inputs.querySelectorAll('[data-word]'))node.textContent=w(node.dataset.word);
      inputs.hidden=selectedMode!=='manual';fields.url.parentElement.hidden=!['mizan','manual'].includes(selected);
      for(const input of Object.values(fields))input.disabled=busy||inputs.hidden||input.parentElement.hidden;
      help.textContent=w(selectedMode==='manual'?(item.group==='banks'?'bankManual':'manualHint'):selected==='market'?'marketHint':selectedSide==='reference'?'tcmbHint':'xmlHint');boardLink();
      submit.querySelector('span:last-child').textContent=w(busy?'loading':selectedMode==='manual'?'enter':'apply');submit.disabled=busy;
      status.textContent=result?w(result):'';status.dataset.state=result;
      const legacyManual=Boolean(S.settings.manualUsdTry||S.settings.manualUsdEur);
      const desc=legacyManual?w('manual'):saved?describe(saved,lang):w(S.rateTime||S.rateHasSaved?'legacy':'defaults');
      const dates=[];if(S.rateUpdatedAt&&!legacyManual)dates.push(w('published')+' · '+dateLabel(S.rateUpdatedAt,lang,saved?.dateOnly));if(S.rateTime)dates.push(w('applied')+' · '+dateLabel(S.rateTime,lang));
      active.replaceChildren(...[desc,...dates].map(value=>make('span','',value)));active.setAttribute('aria-label',w('active'));
      currentLabel.textContent=w('currentSource');currentName.textContent=desc;currentMeta.textContent=dates[0]||'';
      editCurrent.textContent=w('editCurrent');editCurrent.hidden=!saved;editCurrent.disabled=busy;
      const number=new Intl.NumberFormat(lang==='ar'?'ar-u-nu-latn':lang,{maximumFractionDigits:4});
      currentQuotes.replaceChildren();
      for(const[code,value]of [['USD',S.usdTry],['EUR',S.usdTry/S.usdEur]])if(Number.isFinite(value)&&value>0){const quote=make('span');quote.dir='ltr';quote.append(make('small','',code+' / TRY'),make('b','',number.format(value)));currentQuotes.append(quote);}
    }
    search.addEventListener('input',()=>{query=search.value;if(query.trim()){group='all';bankCategory='all';}renderPicker();});
    clearSearch.addEventListener('click',()=>{query='';search.value='';renderPicker();search.focus();});
    back.addEventListener('click',()=>{if(busy)return;view='picker';render();list.querySelector('[data-fx-provider="'+selected+'"]')?.focus();});
    editCurrent.addEventListener('click',()=>{const saved=normalizeSource(S.rateSource);if(saved)selectProvider(saved.id);});
    fields.url.addEventListener('input',boardLink);
    form.addEventListener('submit',event=>{
      event.preventDefault();
      if(!busy&&view==='details')onApply({id:selected,side:selectedSide,mode:selectedMode,usd:fields.usd.value,eur:fields.eur.value,url:fields.url.disabled?'':fields.url.value.trim()});
    });
    document.getElementById('wf-settings-tab-currency')?.addEventListener('click',()=>{if(!busy){view='picker';render();}});
    new MutationObserver(render).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
    render();
    return {render,setState(state,pending){result=state;busy=pending;render();},open(){root.openSettingsPage();document.querySelector('button[onclick="switchTab(\'currency\')"]')?.click();if(normalizeSource(S.rateSource)?.mode==='manual')selectProvider(S.rateSource.id);}};
  }
  const api={catalog,name,word,sides,modes,searchSources,safeUrl,normalizeSource,fromBoard,referenceRows,bulletin,getQuote,describe,validatePublication,initialRates,commitQuote,dateLabel,mount};
  if (typeof module!=='undefined' && module.exports) module.exports=api;
  else root.WFCurrencySources=api;
})(typeof window==='undefined'?globalThis:window);
