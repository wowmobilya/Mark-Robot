/* Rate sources use TRY per USD and TRY per EUR on Turkish boards.
   The rest of the app stores TRY per USD and EUR per USD. */
(function (root) {
  'use strict';
  const languages = ['ar', 'en', 'tr', 'fr', 'ru'];
  const catalog = {
    market: {group:'reference', names:['السعر المرجعي الدولي','International reference','Uluslararası referans kuru','Taux de référence international','Международный справочный курс']},
    tcmb: {group:'reference', names:['البنك المركزي التركي','Central Bank of Türkiye','Türkiye Cumhuriyet Merkez Bankası','Banque centrale de Turquie','Центральный банк Турции'], url:'https://www.turkiye.gov.tr/doviz-kurlari'},
    ziraat: {group:'banks', names:['بنك زراعات','Ziraat Bank','Ziraat Bankası','Banque Ziraat','Банк Ziraat'], url:'https://www.ziraatbank.com.tr/tr/fiyatlar-ve-oranlar'},
    isbank: {group:'banks', names:['بنك إيش','İşbank','Türkiye İş Bankası','Banque İşbank','Банк İşbank'], url:'https://www.isbank.com.tr/doviz-kurlari'},
    garanti: {group:'banks', names:['بنك غارانتي BBVA','Garanti BBVA','Garanti BBVA','Banque Garanti BBVA','Банк Garanti BBVA'], url:'https://www.garantibbva.com.tr/tr/doviz-kurlari'},
    sultan: {group:'offices', names:['صرافة سلطان · إينغول','Sultan Exchange · İnegöl','Sultan Döviz · İnegöl','Bureau de change Sultan · İnegöl','Обменный пункт Sultan · Инегёль'], url:'https://sultandoviz.com/'},
    mizan: {group:'offices', names:['صرافة ميزان · إسطنبول','Mizan Exchange · Istanbul','Mizan Döviz · İstanbul','Bureau de change Mizan · Istanbul','Обменный пункт Mizan · Стамбул']},
    manual: {group:'offices', names:['مصدر يدوي آخر','Other manual source','Diğer manuel kaynak','Autre source manuelle','Другой ручной источник']}
  };
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
    applied:['وقت الاعتماد','Applied','Uygulama zamanı','Application','Дата применения']
  };
  const langIndex = lang => Math.max(0, languages.indexOf(lang));
  const word = (key,lang) => copy[key][langIndex(lang)];
  const name = (id,lang) => catalog[id].names[langIndex(lang)];
  const known = id => typeof id==='string' && Object.hasOwn(catalog,id);
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
    const form=document.createElement('form');
    form.className='card wf-fx-source';
    form.noValidate=true;
    form.innerHTML='<div class="wf-fx-fields"><label class="wf-fx-wide"><span data-word="source"></span><select class="fc" name="provider"></select></label><label><span data-word="side"></span><select class="fc" name="side"></select></label><label><span data-word="method"></span><select class="fc" name="mode"></select></label></div><p class="wf-fx-help"></p><a class="wf-fx-board" target="_blank" rel="noopener noreferrer" data-word="open"></a><div class="wf-fx-fields wf-fx-inputs"><label><span data-word="usd"></span><input class="fc" name="usd" inputmode="decimal" dir="ltr" autocomplete="off"></label><label><span data-word="eur"></span><input class="fc" name="eur" inputmode="decimal" dir="ltr" autocomplete="off"></label><label class="wf-fx-wide"><span data-word="customUrl"></span><input class="fc" type="url" name="url" placeholder="https://" dir="ltr" autocomplete="off"></label></div><button class="btn btn-p wf-fx-apply" type="submit"></button><p class="wf-fx-status" role="status" aria-live="polite"></p>';
    rates.before(form);
    const fields=form.elements, provider=fields.provider,side=fields.side,mode=fields.mode;
    const board=form.querySelector('a'),inputs=form.querySelector('.wf-fx-inputs'),help=form.querySelector('.wf-fx-help'),submit=form.querySelector('.wf-fx-apply'),status=form.querySelector('.wf-fx-status');
    const active=document.createElement('div');active.className='wf-fx-summary';rates.append(active);
    let lastSource,selected='market',selectedSide='reference',selectedMode='feed',busy=false,result='';
    function options(select,values,labels) {
      select.replaceChildren(...values.map((value,i)=>new Option(labels[i],value)));
    }
    function boardLink() {
      const url=catalog[selected].url || (['mizan','manual'].includes(selected)?safeUrl(fields.url.value):'');
      board.hidden=!url;
      if (url) board.href=url;
      else board.removeAttribute('href');
    }
    function render() {
      const lang=languages.includes(S.lang)?S.lang:'ar',w=key=>word(key,lang);
      const saved=normalizeSource(S.rateSource),signature=JSON.stringify(saved);
      if (signature!==lastSource) {
        lastSource=signature;
        if (saved) {
          selected=saved.id;selectedSide=saved.side;selectedMode=saved.mode;
          fields.url.value=saved.url||'';
        }
      }
      for (const node of form.querySelectorAll('[data-word]')) node.textContent=w(node.dataset.word);
      provider.replaceChildren();
      for (const group of ['reference','banks','offices']) {
        const section=document.createElement('optgroup');section.label=w(group);
        for (const [id,item] of Object.entries(catalog)) if (item.group===group) section.append(new Option(name(id,lang),id));
        provider.append(section);
      }
      provider.value=selected;
      const choices=sides(selected);
      if (!choices.includes(selectedSide)) selectedSide=choices[0];
      options(side,choices,choices.map(s=>w(s==='reference'?'midpoint':s)));side.value=selectedSide;
      const modes=selected==='tcmb'&&selectedSide!=='reference'?['feed','manual']:
        (selected==='market' || selected==='tcmb'?['feed']:['manual']);
      if (!modes.includes(selectedMode)) selectedMode=modes[0];
      options(mode,modes,modes.map(w));mode.value=selectedMode;
      side.disabled=busy||choices.length===1;mode.disabled=busy||modes.length===1;provider.disabled=busy;
      inputs.hidden=selectedMode!=='manual';
      fields.url.parentElement.hidden=!['mizan','manual'].includes(selected);
      for (const input of inputs.querySelectorAll('input')) input.disabled=busy || inputs.hidden || input.parentElement.hidden;
      help.textContent=w(selectedMode==='manual'?'manualHint':selected==='market'?'marketHint':selectedSide==='reference'?'tcmbHint':'xmlHint');
      boardLink();
      submit.textContent=w(busy?'loading':selectedMode==='manual'?'enter':'apply');submit.disabled=busy;form.setAttribute('aria-busy',String(busy));
      status.textContent=result?w(result):'';status.dataset.state=result;
      const legacyManual=Boolean(S.settings.manualUsdTry||S.settings.manualUsdEur);
      const desc=legacyManual?w('manual'):saved?describe(saved,lang):w(S.rateTime||S.rateHasSaved?'legacy':'defaults');
      const details=[desc];
      if (S.rateUpdatedAt && !legacyManual) details.push(w('published')+' · '+dateLabel(S.rateUpdatedAt,lang,saved?.dateOnly));
      if (S.rateTime) details.push(w('applied')+' · '+dateLabel(S.rateTime,lang));
      active.replaceChildren(...details.map(value=>{const line=document.createElement('span');line.textContent=value;return line;}));
      active.setAttribute('aria-label',w('active'));
    }
    function clearManualFields() {fields.usd.value='';fields.eur.value='';}
    provider.addEventListener('change',()=>{
      selected=provider.value;selectedSide=sides(selected)[0];selectedMode='feed';
      clearManualFields();fields.url.value=selected===S.rateSource?.id?S.rateSource.url||'':'';
      result='';render();
    });
    side.addEventListener('change',()=>{selectedSide=side.value;clearManualFields();result='';render();});
    mode.addEventListener('change',()=>{selectedMode=mode.value;result='';render();});
    fields.url.addEventListener('input',boardLink);
    form.addEventListener('submit',event=>{
      event.preventDefault();
      if (!busy) onApply({id:selected,side:selectedSide,mode:selectedMode,usd:fields.usd.value,eur:fields.eur.value,url:fields.url.disabled?'':fields.url.value.trim()});
    });
    new MutationObserver(render).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
    render();
    return {render,setState(state,pending){result=state;busy=pending;render();},open() {
      root.openSettingsPage();document.querySelector('button[onclick="switchTab(\'currency\')"]')?.click();
    }};
  }
  const api={catalog,name,word,sides,safeUrl,normalizeSource,fromBoard,referenceRows,bulletin,getQuote,describe,validatePublication,initialRates,commitQuote,dateLabel,mount};
  if (typeof module!=='undefined' && module.exports) module.exports=api;
  else root.WFCurrencySources=api;
})(typeof window==='undefined'?globalThis:window);
