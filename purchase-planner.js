/* Native purchase planning. Supplier documents use their own immutable snapshots. */
(function(root){
  'use strict';
  const ops=root.WFOperations,core=root.WFPurchasePlannerCore,document=root.document;
  if(!ops||!core||!document||root.WFPurchasePlanner)return;
  const words={
    title:['مساعد الشراء وإعادة الطلب','Satın alma ve yeniden sipariş','Purchase and reorder planner','Achats et réapprovisionnement','Планирование закупок'],
    followup:['متابعة الطلب','Siparişi takip et','Track order','Suivre la commande','Отследить заказ'],
    subtitle:['اختر الموديلات وشاهد حركتها وجهّز طلب المورد','Modelleri seçin, hareketi görün ve tedarikçi siparişi hazırlayın','Choose models, review activity and prepare the supplier order','Choisissez les modèles, consultez l’activité et préparez la commande','Выберите модели, проверьте продажи и подготовьте заказ'],
    basis:['الكميات مسجّلة في الفواتير النشطة والمؤرشفة، حسب تاريخ التسجيل. ليست رصيد مخزون أو تأكيد بيع نهائي.','Kayıt tarihine göre etkin ve arşiv faturalarındaki adetlerdir; stok veya kesin satış teyidi değildir.','Units recorded in active and archived invoices, by registration date. This is not stock on hand or confirmation of a finalized sale.','Quantités des factures actives et archivées, selon la date d’enregistrement ; ni stock disponible ni vente définitive confirmée.','Количество в активных и архивных счетах по дате регистрации. Это не остаток склада и не подтверждение окончательной продажи.'],
    period:['الفترة','Dönem','Period','Période','Период'],year:['السنة','Yıl','Year','Année','Год'],last90:['آخر 90 يومًا','Son 90 gün','Last 90 days','90 derniers jours','Последние 90 дней'],custom:['فترة محددة','Özel dönem','Custom period','Période personnalisée','Заданный период'],from:['من','Başlangıç','From','Du','С'],to:['إلى','Bitiş','To','Au','По'],
    delivery:['حالة التسليم','Teslimat','Delivery status','Livraison','Статус доставки'],allInvoices:['كل الفواتير المسجّلة','Tüm kayıtlı faturalar','All recorded invoices','Toutes les factures enregistrées','Все сохранённые счета'],delivered:['المسلّمة فقط','Yalnız teslim edilenler','Delivered only','Livrées uniquement','Только доставленные'],
    search:['ابحث أو اقرأ رمز الموديل','Model ara veya kod okut','Search or scan a model code','Rechercher ou scanner un modèle','Поиск или сканирование кода модели'],lookup:['تحديد الموديل','Modeli bul','Find model','Trouver le modèle','Найти модель'],scan:['قراءة بالكاميرا','Kamerayla tara','Scan with camera','Scanner avec la caméra','Сканировать камерой'],
    recorded:['مسجّل في الفواتير','Faturalarda kayıtlı','Recorded in invoices','Enregistré dans les factures','Записано в счетах'],noSales:['لا توجد حركة مسجّلة في الفترة','Dönemde kayıtlı hareket yok','No recorded activity in this period','Aucune activité enregistrée sur la période','Нет записанных операций за период'],
    chosen:['الموديلات المختارة','Seçilen modeller','Selected models','Modèles sélectionnés','Выбранные модели'],emptySelection:['اختر موديلًا أو اقرأ رمزه للبدء.','Başlamak için model seçin veya kod okutun.','Choose a model or scan its code to start.','Choisissez un modèle ou scannez son code.','Выберите модель или отсканируйте код.'],
    useDemand:['استخدام كميات الفترة','Dönem adetlerini kullan','Use period quantities','Utiliser les quantités de la période','Использовать количество за период'],demandHint:['اقتراح من الطلب التاريخي للفترة المختارة؛ لا يحسب المخزون أو الشحنات القادمة.','Seçili dönem talebine dayanır; stok ve gelecek sevkiyatları hesaba katmaz.','Uses historical demand in the chosen period; does not calculate stock or incoming shipments.','Basé sur la demande passée de la période, sans calcul des stocks ni des livraisons à venir.','По данным выбранного периода, без расчёта остатков и ожидаемых поставок.'],
    orderQty:['كمية الطلب','Sipariş adedi','Order quantity','Quantité commandée','Количество к заказу'],optionalPrice:['سعر المورد · اختياري','Tedarikçi fiyatı · isteğe bağlı','Supplier price · optional','Prix fournisseur · facultatif','Цена поставщика · необязательно'],printLanguage:['لغة مستند المورد','Tedarikçi belgesinin dili','Supplier document language','Langue du document fournisseur','Язык документа поставщику'],
    prepare:['تجهيز وحفظ طلب المورد','Siparişi hazırla ve kaydet','Prepare and save supplier order','Préparer et enregistrer la commande','Подготовить и сохранить заказ'],newOrder:['طلب جديد','Yeni sipariş','New order','Nouvelle commande','Новый заказ'],remove:['إزالة','Kaldır','Remove','Retirer','Убрать'],
    draftSaved:['المسودة محفوظة تلقائيًا','Taslak otomatik kaydedildi','Draft saved automatically','Brouillon enregistré automatiquement','Черновик сохранён автоматически'],draftSaving:['جارٍ حفظ المسودة…','Taslak kaydediliyor…','Saving draft…','Enregistrement du brouillon…','Сохранение черновика…'],draftPending:['تغييرات المسودة قيد الحفظ','Taslak değişiklikleri bekliyor','Draft changes waiting to save','Modifications en attente d’enregistrement','Изменения черновика ожидают сохранения'],saved:['تم حفظ طلب المورد','Tedarikçi siparişi kaydedildi','Supplier order saved','Commande fournisseur enregistrée','Заказ поставщику сохранён'],
    draftNew:['مسودة جديدة · تُحفظ تلقائيًا عند الاختيار أو الكتابة','Yeni taslak · seçim veya yazma sırasında otomatik kaydedilir','New draft · saves automatically when you choose or type','Nouveau brouillon · enregistré dès la sélection ou la saisie','Новый черновик · сохраняется при выборе или вводе'],
    history:['طلباتي المحفوظة','Kayıtlı siparişlerim','My saved orders','Mes commandes enregistrées','Мои сохранённые заказы'],noOrders:['لا توجد طلبات محفوظة بعد.','Henüz kayıtlı sipariş yok.','No saved orders yet.','Aucune commande enregistrée.','Сохранённых заказов пока нет.'],view:['عرض الطلب','Siparişi görüntüle','View order','Voir la commande','Открыть заказ'],preview:['معاينة طلب المورد','Tedarikçi siparişi önizlemesi','Supplier order preview','Aperçu de la commande fournisseur','Предпросмотр заказа поставщику'],print:['طباعة / حفظ PDF','Yazdır / PDF kaydet','Print / Save PDF','Imprimer / Enregistrer PDF','Печать / Сохранить PDF'],html:['تنزيل HTML','HTML indir','Download HTML','Télécharger HTML','Скачать HTML'],csv:['تنزيل CSV','CSV indir','Download CSV','Télécharger CSV','Скачать CSV'],
    private:['مستند المورد يحتوي بيانات طلبك فقط؛ لا ينقل أسماء عملائك أو فواتيرهم أو أسعار البيع.','Tedarikçi belgesi yalnız sipariş bilgilerini içerir; müşterileri, faturalarını ve satış fiyatlarını içermez.','The supplier document contains only your order details, without customer identities, their invoices or sales prices.','Le document fournisseur contient uniquement votre commande, sans clients, factures clients ni prix de vente.','Документ поставщику содержит только заказ, без данных клиентов, их счетов и продажных цен.'],
    activity:['حركة الموديل من تاريخ الطلب','Sipariş tarihinden itibaren model hareketi','Model activity from the order date','Activité du modèle depuis la date de commande','Движение модели с даты заказа'],activityHint:['حسب تاريخ الفاتورة، وليس تتبعًا لوصول هذه الطلبية أو بيع قطعها تحديدًا.','Fatura tarihine dayanır; bu siparişin teslim veya satış takibi değildir.','Based on invoice dates; this does not track receipt or sale of these particular ordered units.','Selon les dates des factures ; ne prouve pas la réception ou la vente de ce lot précis.','По датам счетов; это не отслеживание получения или продажи именно этой партии.'],
    review:['بيانات تحتاج مراجعة','İncelenecek veriler','Records to review','Données à vérifier','Записи для проверки'],more:['عرض المزيد','Daha fazla','Show more','Afficher plus','Показать ещё'],noMatch:['لا توجد موديلات مطابقة.','Eşleşen model yok.','No matching models.','Aucun modèle correspondant.','Подходящих моделей нет.'],historical:['اسم محفوظ في الفواتير','Faturada kayıtlı ad','Name saved in invoices','Nom enregistré dans les factures','Название в сохранённых счетах'],
    scanMissing:['الرمز لا يحدد موديلًا واحدًا في قاعدة المنتجات. اختره من النتائج.','Kod ürün kataloğunda tek bir model belirlemiyor; sonuçlardan seçin.','The code does not identify one catalog model. Choose it from the results.','Le code ne désigne pas un seul modèle du catalogue. Choisissez dans les résultats.','Код не определяет одну модель каталога. Выберите её из результатов.'],scanUnsupported:['استخدم رمز الموديل أو الطرد؛ رمز الفاتورة لا يُنقل إلى الطلب.','Model veya paket kodu kullanın; fatura kodları siparişe aktarılmaz.','Use a model or package code; invoice QR content is not transferred into the order.','Utilisez un code modèle ou colis ; le QR de facture n’est pas transféré dans la commande.','Используйте код модели или упаковки; QR счёта не переносится в заказ.'],
    pricesCleared:['تغيّرت العملة. أُفرغت الأسعار لتدخل أسعار المورد بهذه العملة.','Para birimi değişti; tedarikçi fiyatlarını yeni para biriminde girin.','Currency changed. Prices were cleared so supplier prices can be entered in this currency.','Devise modifiée. Saisissez les prix fournisseur dans la nouvelle devise.','Валюта изменена. Введите цены поставщика в новой валюте.'],
    failed:['تعذّر الحفظ أو العرض. بياناتك الحالية باقية؛ أعد المحاولة.','Kaydedilemedi veya görüntülenemedi. Geçerli veriler korunuyor; yeniden deneyin.','Could not save or display. Your current data is retained; please retry.','Enregistrement ou affichage impossible. Les données actuelles sont conservées ; réessayez.','Не удалось сохранить или показать. Текущие данные сохранены в форме; повторите попытку.'],retry:['إعادة المحاولة','Yeniden dene','Retry','Réessayer','Повторить'],
    invalidPeriod:['تحقق من تاريخ بداية الفترة ونهايتها.','Dönem başlangıç ve bitiş tarihlerini kontrol edin.','Check the start and end dates.','Vérifiez les dates de début et de fin.','Проверьте начальную и конечную даты.'],supplierRequired:['أدخل اسم المورد.','Tedarikçi adını girin.','Enter the supplier name.','Saisissez le nom du fournisseur.','Укажите поставщика.'],quantityRequired:['أدخل كمية صحيحة موجبة لكل موديل.','Her model için pozitif tam adet girin.','Enter a positive whole order quantity for each model.','Saisissez une quantité entière positive pour chaque modèle.','Введите положительное целое количество для каждой модели.'],priceInvalid:['السعر الاختياري يجب أن يكون رقمًا موجبًا أو صفرًا بمنزلتين عشريتين.','İsteğe bağlı fiyat sıfır veya pozitif olmalı, en fazla iki ondalık basamak içermelidir.','Optional prices must be nonnegative numbers with at most two decimal places.','Les prix facultatifs doivent être positifs ou nuls, avec deux décimales au maximum.','Необязательные цены должны быть неотрицательными, не более двух знаков после запятой.'],
    futurePeriod:['اختر فترة تبدأ اليوم أو قبله لعرض الحركة المسجّلة.','Kayıtlı hareket için bugün veya daha önce başlayan bir dönem seçin.','Choose a period starting today or earlier to review recorded activity.','Choisissez une période commençant aujourd’hui ou avant pour consulter l’activité.','Для просмотра операций выберите период, начинающийся сегодня или раньше.'],
    tooManyModels:['قسّم الطلب الكبير إلى طلبات تضم 500 موديل كحد أقصى.','Büyük siparişi en fazla 500 modellik siparişlere bölün.','Split a large order into orders of at most 500 models.','Répartissez la commande en lots de 500 modèles au maximum.','Разделите большой заказ на заказы не более 500 моделей.'],
    draftConflict:['تغيّرت المسودة المحفوظة في مكان آخر؛ بقيت تعديلاتك هنا للمراجعة.','Kayıtlı taslak başka yerde değişti; değişiklikleriniz burada korundu.','The saved draft changed elsewhere; your edits remain here for review.','Le brouillon a changé ailleurs ; vos modifications restent disponibles ici.','Сохранённый черновик изменён в другом месте; ваши изменения остаются здесь.'],
    printBusy:['نافذة الطباعة مفتوحة؛ انتظر إغلاقها.','Yazdırma penceresi açık; kapanmasını bekleyin.','The print dialog is open; wait for it to close.','La fenêtre d’impression est ouverte ; attendez sa fermeture.','Окно печати открыто; дождитесь закрытия.'],printClosed:['أُغلقت نافذة الطباعة؛ يمكن فتح الطلب من السجل.','Yazdırma penceresi kapandı; sipariş geçmişte saklanır.','The print dialog closed; the order remains in history.','La fenêtre d’impression est fermée ; la commande reste dans l’historique.','Окно печати закрыто; заказ остался в истории.'],printError:['تعذّر تجهيز الصور أو الطباعة. أعد المحاولة.','Görseller veya baskı hazırlanamadı; tekrar deneyin.','Images or printing could not be prepared. Please retry.','Impossible de préparer les images ou l’impression. Réessayez.','Не удалось подготовить изображения или печать. Повторите попытку.'],recover:['أغلقت نافذة الطباعة','Yazdırma penceresini kapattım','I closed the print dialog','J’ai fermé la fenêtre d’impression','Окно печати закрыто'],
    issueInvalid:['سجل غير صالح أو بيانات ناقصة','Geçersiz kayıt veya eksik veri','Invalid record or missing data','Enregistrement invalide ou données manquantes','Некорректная запись или отсутствующие данные'],issueDuplicate:['مرجع فاتورة مكرر؛ حُسب مرة واحدة','Tekrarlanan fatura kimliği; bir kez sayıldı','Repeated invoice ID; counted once','Identifiant de facture répété ; compté une fois','Повтор ID счёта; учтён один раз'],issueConflict:['نسخ مختلفة لنفس الفاتورة؛ الإجمالي بحاجة لمراجعة','Aynı faturanın farklı kopyaları; toplamı inceleyin','Conflicting copies of the same invoice; review the total','Copies divergentes de la facture ; total à vérifier','Разные копии одного счёта; проверьте итог'],issueDate:['تاريخ الفاتورة غير متاح','Fatura tarihi bilinmiyor','Invoice date unavailable','Date de facture inconnue','Дата счёта неизвестна'],issueFallback:['استُخدم تاريخ الحفظ لغياب تاريخ التسجيل','Kayıt tarihi olmadığından mevcut tarih alanı kullanıldı','An available saved date was used because the registration date was unavailable','Date sauvegardée utilisée faute de date d’enregistrement','Использована сохранённая дата вместо отсутствующей даты регистрации'],issueLink:['بند غير مرتبط بمعرّف منتج؛ لم يُضف للكميات','Ürün kimliğine bağlı olmayan kalem adetlere eklenmedi','Line without a product ID was not added to model quantities','Ligne sans identifiant produit exclue des quantités','Строка без ID товара не включена в количество'],issueCatalog:['الموديل محفوظ بالفاتورة ولا يوجد حاليًا في الكتالوج','Faturadaki model artık katalogda yok','Saved invoice model is no longer in the catalog','Modèle enregistré absent du catalogue actuel','Модель из счёта отсутствует в текущем каталоге'],issueVariant:['اللون غير محفوظ؛ عُرض كمتغير مستقل','Renk kayıtlı değil; ayrı varyant gösterildi','Saved color is missing; shown as a separate variant','Couleur non enregistrée ; variante distincte','Сохранённый цвет отсутствует; отдельный вариант'],issueCredit:['إشعار دائن لا يحدد عدد القطع المرتجعة؛ استُبعد من الكميات','Alacak kaydı iade adetlerini belirtmiyor; adetten çıkarıldı','Credit record does not establish returned units; excluded from quantities','Avoir sans quantité retournée identifiable ; exclu des quantités','Кредитная запись не определяет возврат единиц; исключена из количества']
  };
  const locale=()=>core.locales.includes(ops.locale())?ops.locale():'en';
  const t=key=>words[key]?.[core.locales.indexOf(locale())]||core.printWords[locale()][key]||core.printWords.en[key]||key;
  const make=ops.make,state=()=>ops.state();
  let draft=null,report=null,query='',limit=36,historyLimit=20,selectedOrder=null,previewFrame=null,previewRevision=0,previewReady=false;
  let dirty=false,editVersion=0,expectedDraftRevision=0,saveTimer=null,autoPromise=null,autoError='',saving=false,activePrint=null,searchTimer=null,pendingTranslate=false;
  let preparedOrder=null,preparedVersion=-1,resizeFrame=0,exportBusy=false;
  let controls={},resultHost,selectedHost,totalsHost,historyHost,diagnosticHost,summaryHost,statusHost,draftStatus,previewHost,previewStage,paperHolder,activityHost,recovery;
  const page=ops.register({id:'purchase-planner',parent:'products',icon:'package',title:Object.fromEntries(core.locales.map((lang,index)=>[lang,words.title[index]])),subtitle:Object.fromEntries(core.locales.map((lang,index)=>[lang,words.subtitle[index]])),onEnter:enter,onLanguage:translate});
  function newId(){return root.crypto?.randomUUID?.()||'po-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,10);}
  function buyer(){const value=state().settings||{};return{companyName:value.companyName||'WOW Furniture',address:value.address||'',phone:value.phone||'',email:value.email||'',website:value.website||'',logo:typeof root.wfCompanyLogo==='function'?root.wfCompanyLogo(value.logo):value.logo||'',brandColor:root.getComputedStyle?.(document.documentElement)?.getPropertyValue('--brand-primary')?.trim()||'#3f7c94'};}
  function fresh(){const today=root.WOWStatementCore.today();return{id:newId(),createdAt:new Date().toISOString(),supplier:{name:'',contact:''},buyer:buyer(),currency:'USD',locale:locale(),notes:'',lines:[],period:{mode:'year',year:today.slice(0,4),from:today.slice(0,4)+'-01-01',to:today},delivery:'all'};}
  function ensure(){if(draft)return;const section=state().settings?.procurementOrders;expectedDraftRevision=section?.draftRevision||0;try{draft=section?.draft?core.prepareDraft(section.draft):fresh();}catch(_){draft=fresh();autoError='draftConflict';}}
  function button(key,fn,primary=false){const node=make('button','btn '+(primary?'btn-p':'btn-s'));node.type='button';node.textContent=t(key);node.addEventListener('click',fn);return node;}
  function field(key,input){const label=make('label','wf-purchase-field');label.append(make('span','',t(key)),input);return label;}
  function input(id,type,value,handler){const node=make('input','fi');node.id=id;node.type=type;node.value=value??'';node.autocomplete='off';node.addEventListener('input',()=>handler(node.value));return node;}
  function select(id,options,value,handler){const node=make('select','fi');node.id=id;for(const [key,label]of options){const option=make('option','',label);option.value=key;node.append(option);}node.value=value;node.addEventListener('change',()=>handler(node.value));return node;}
  function money(cents,currency=draft.currency){return cents===null?t('unspecified'):new Intl.NumberFormat(locale(),{minimumFractionDigits:2,maximumFractionDigits:2}).format(cents/100)+' '+currency;}
  function photo(row){const host=make('span','wf-purchase-photo'),source=root.WFPackageLabelCore.safeImageSource(row.image);if(source){const image=make('img');image.src=source;image.alt=row.name;image.loading='lazy';image.decoding='async';image.addEventListener('error',()=>{image.remove();host.textContent='◇';},{once:true});host.append(image);}else host.textContent='◇';return host;}
  function notice(key,error=false){if(!statusHost)return;statusHost.textContent=t(key);statusHost.dataset.kind=error?'error':'info';statusHost.hidden=!key;}
  function errorText(error){return{INVALID_PERIOD:'invalidPeriod',INVALID_DATE:'invalidPeriod',INVALID_YEAR:'invalidPeriod',FUTURE_PERIOD:'futurePeriod',SUPPLIER_REQUIRED:'supplierRequired',INVALID_ORDER_QUANTITY:'quantityRequired',INVALID_PRICE:'priceInvalid',ORDER_ITEMS_REQUIRED:'emptySelection',ORDER_TOO_LARGE:'tooManyModels',DRAFT_CHANGED:'draftConflict'}[error?.code||error?.message]||'failed';}
  function guard(){root.WFAppUpdates?.registerGuard?.('purchase-planner',()=>Boolean(dirty||autoPromise||saving||activePrint||exportBusy));}
  function touch(){
    if(core.listOrders(state().settings).some(order=>order?.id===draft.id)){draft.id=newId();draft.createdAt=new Date().toISOString();delete draft.orderNumber;}
    dirty=true;editVersion++;preparedOrder=null;if(autoError!=='draftConflict')autoError='';clearTimeout(saveTimer);if(!autoError)saveTimer=setTimeout(()=>flushDraft(),650);computed();guard();
  }
  async function flushDraft(){
    clearTimeout(saveTimer);
    if(autoPromise){await autoPromise;return dirty&&!autoError?flushDraft():!autoError;}
    if(!dirty||autoError==='draftConflict')return !autoError;
    let captured;try{captured=core.prepareDraft(draft);}catch(error){autoError=errorText(error);notice(autoError,true);computed();return false;}
    const version=editVersion,expected=expectedDraftRevision;
    autoPromise=(async()=>{try{
      const section=await core.persistDraft(captured,{state:state(),writeBatch:operations=>wfWriteBatch(operations),hydrate:value=>typeof wfHydrateDBValue==='function'?wfHydrateDBValue(value):value,expectedRevision:expected});
      expectedDraftRevision=section.draftRevision;
      const current=state().settings?.procurementOrders;
      if(current?.draftRevision!==section.draftRevision||JSON.stringify(current.draft)!==JSON.stringify(section.draft))throw new Error('DRAFT_CHANGED');
      if(version===editVersion)dirty=false;autoError='';return true;
    }catch(error){autoError=errorText(error);notice(autoError,true);return false;}})();
    computed();const result=await autoPromise;autoPromise=null;computed();guard();
    if(dirty&&!autoError){clearTimeout(saveTimer);saveTimer=setTimeout(()=>flushDraft(),650);}return result;
  }
  function refreshReport(){
    try{report=core.buildSales(state(),{...draft.period,delivery:draft.delivery});notice('');}catch(error){report=null;notice(errorText(error),true);}
    renderResults();renderSelected();renderDiagnostics();computed();
  }
  function setPeriod(key,value){draft.period[key]=value;touch();limit=36;refreshReport();updatePeriodFields();}
  function updatePeriodFields(){if(!controls.year)return;controls.year.parentElement.hidden=draft.period.mode!=='year';controls.from.parentElement.hidden=controls.to.parentElement.hidden=draft.period.mode!=='custom';}
  function build(){
    ensure();page.body.replaceChildren();page.actions.replaceChildren();controls={};
    controls.prepare=button('prepare',saveOrder,true);controls.newOrder=button('newOrder',()=>{if(saving||activePrint)return;draft=fresh();preparedOrder=null;dirty=true;editVersion++;build();refreshReport();flushDraft();});page.actions.append(controls.prepare);
    const intro=make('p','wf-purchase-intro',t('basis'));
    const filters=make('section','wf-ops-card wf-purchase-filters');
    controls.mode=select('wfPurchasePeriod',[['year',t('year')],['last90',t('last90')],['custom',t('custom')]],draft.period.mode,value=>setPeriod('mode',value));
    const years=new Set([Number(draft.period.year)||new Date().getFullYear()]);for(const invoice of state().invoices||[]){const date=core.recordDate(invoice);if(date)years.add(Number(date.day.slice(0,4)));}
    controls.year=select('wfPurchaseYear',[...years].sort((a,b)=>b-a).map(year=>[String(year),String(year)]),draft.period.year,value=>setPeriod('year',value));
    controls.from=input('wfPurchaseFrom','date',draft.period.from,value=>setPeriod('from',value));controls.to=input('wfPurchaseTo','date',draft.period.to,value=>setPeriod('to',value));
    controls.delivery=select('wfPurchaseDelivery',[['all',t('allInvoices')],['delivered',t('delivered')]],draft.delivery,value=>{draft.delivery=value;touch();refreshReport();});
    filters.append(field('period',controls.mode),field('year',controls.year),field('from',controls.from),field('to',controls.to),field('delivery',controls.delivery));controls.delivery.parentElement.className+=' wf-purchase-delivery';
    summaryHost=make('div','wf-purchase-summary');statusHost=make('p','wf-ops-status');statusHost.hidden=true;statusHost.setAttribute('role','status');statusHost.setAttribute('aria-live','polite');
    diagnosticHost=make('details','wf-purchase-diagnostics');
    const layout=make('div','wf-purchase-layout'),catalog=make('section','wf-ops-card wf-purchase-catalog');
    const searchRow=make('div','wf-purchase-search-row');controls.search=input('wfPurchaseSearch','search',query,value=>{query=value;limit=36;clearTimeout(searchTimer);searchTimer=setTimeout(renderResults,120);});controls.search.placeholder=t('search');controls.search.setAttribute('aria-label',t('search'));controls.search.enterKeyHint='search';
    controls.search.addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();acceptBarcode(controls.search.value);}});
    controls.lookup=button('lookup',()=>acceptBarcode(controls.search.value));controls.scan=button('scan',()=>{if(typeof root.openBarcodeScanner==='function')root.openBarcodeScanner('purchase');else{controls.search.focus();notice('scanMissing');}});
    searchRow.append(controls.search,controls.lookup,controls.scan);resultHost=make('div','wf-purchase-products');controls.more=button('more',()=>{limit+=36;renderResults();});catalog.append(searchRow,resultHost,controls.more);
    const editor=make('section','wf-ops-card wf-purchase-editor');const editorHead=make('div','wf-purchase-heading');editorHead.append(make('h2','',t('chosen')),controls.newOrder);
    selectedHost=make('div','wf-purchase-selected');controls.demand=button('useDemand',()=>{if(!report||saving||activePrint)return;for(const line of draft.lines){const row=report.rows.find(row=>row.key===line.key);if(row?.recordedUnits>0)line.quantity=String(row.recordedUnits);}touch();renderSelected();});
    const demandHint=make('p','wf-purchase-small',t('demandHint'));
    const supplier=make('div','wf-purchase-supplier');controls.supplier=input('wfPurchaseSupplier','text',draft.supplier.name,value=>{draft.supplier.name=value;touch();});controls.contact=input('wfPurchaseContact','text',draft.supplier.contact,value=>{draft.supplier.contact=value;touch();});
    controls.currency=select('wfPurchaseCurrency',core.currencies.map(value=>[value,value]),draft.currency,value=>{const priced=draft.lines.some(line=>String(line.unitPrice??'').trim());draft.currency=value;for(const line of draft.lines)line.unitPrice='';touch();renderSelected();if(priced)notice('pricesCleared');});
    controls.language=select('wfPurchasePrintLanguage',[['ar','العربية'],['tr','Türkçe'],['en','English'],['fr','Français'],['ru','Русский']],draft.locale,value=>{draft.locale=value;touch();});
    controls.notes=make('textarea','fi');controls.notes.id='wfPurchaseNotes';controls.notes.rows=3;controls.notes.value=draft.notes;controls.notes.addEventListener('input',()=>{draft.notes=controls.notes.value;touch();});
    supplier.append(field('supplier',controls.supplier),field('contact',controls.contact),field('currency',controls.currency),field('printLanguage',controls.language));
    totalsHost=make('div','wf-purchase-totals');draftStatus=make('p','wf-purchase-small');draftStatus.setAttribute('role','status');controls.retry=button('retry',()=>{autoError='';flushDraft();});
    editor.append(editorHead,selectedHost,controls.demand,demandHint,supplier,field('notes',controls.notes),totalsHost,draftStatus,controls.retry,make('p','wf-purchase-small',t('private')));layout.append(catalog,editor);
    const history=make('section','wf-ops-card');history.append(make('h2','',t('history')));historyHost=make('div','wf-purchase-history');controls.moreHistory=button('more',()=>{historyLimit+=20;renderHistory();});history.append(historyHost,controls.moreHistory);
    previewHost=make('section','wf-ops-card wf-purchase-preview');previewHost.hidden=true;previewStage=make('div','wf-purchase-preview-stage');paperHolder=make('div','wf-purchase-paper-holder');previewStage.append(paperHolder);activityHost=make('div','wf-purchase-activity');
    page.body.append(intro,filters,summaryHost,statusHost,diagnosticHost,layout,history,previewHost);updatePeriodFields();renderHistory();computed();guard();
    root.WFTouchKeyboard?.register?.('wfPurchaseSearch',{action:'search',onSubmit:field=>acceptBarcode(field.value)});
  }
  function toggleModel(row){
    if(saving||activePrint)return;
    const index=draft.lines.findIndex(line=>line.key===row.key);
    if(index<0&&draft.lines.length>=500){notice('tooManyModels',true);return;}
    if(index>=0)draft.lines.splice(index,1);else draft.lines.push({key:row.key,productId:row.productId,name:row.catalogVariant&&row.catalogName?row.catalogName:row.name,code:row.code,color:row.color,dimensions:row.dimensions,image:row.image,quantity:'',unitPrice:''});
    touch();renderResults();renderSelected();
  }
  function renderResults(){
    if(!resultHost)return;resultHost.replaceChildren();
    const terms=core.normalize(query).split(/\s+/).filter(Boolean),rows=(report?.rows||[]).filter(row=>terms.every(term=>core.normalize([row.name,row.catalogName,row.code,row.color,row.dimensions,...row.names].join(' ')).includes(term)));
    for(const row of rows.slice(0,limit)){
      const displayName=row.catalogVariant&&row.catalogName?row.catalogName:row.name;
      const card=make('div','wf-purchase-product'),choice=make('button','wf-purchase-product-choice');choice.type='button';choice.dataset.productId=row.productId;choice.setAttribute('aria-pressed',String(draft.lines.some(line=>line.key===row.key)));choice.setAttribute('aria-label',displayName+' · '+row.color);
      const copy=make('span','wf-purchase-product-copy');copy.append(make('strong','',displayName),make('span','',row.code+(row.color?' · '+row.color:'')),make('small','',row.dimensions));
      const count=make('span','wf-purchase-sales');count.append(make('strong','',String(row.recordedUnits)),make('small','',t(row.recordedUnits?'recorded':report.complete?'noSales':'review')));
      choice.append(photo(row),copy,count);choice.addEventListener('click',()=>toggleModel(row));card.append(choice);
      if(row.records.length){const detail=make('details','wf-purchase-source-details');detail.append(make('summary','',t('historical')+' · '+row.invoiceCount));for(const record of row.records.slice(0,12))detail.append(make('p','',record.date+' · '+record.invoiceNumber+' · '+record.name+' · '+record.quantity+' '+t('units')));if(row.records.length>12)detail.append(make('small','',String(row.records.length)+' '+t('recorded')));card.append(detail);}
      resultHost.append(card);
    }
    if(!rows.length)resultHost.append(make('p','wf-ops-empty',t('noMatch')));controls.more.hidden=rows.length<=limit;
  }
  function renderSelected(){
    if(!selectedHost)return;selectedHost.replaceChildren();
    for(const [index,line]of draft.lines.entries()){
      const row=make('div','wf-purchase-order-line'),heading=make('div','wf-purchase-line-heading'),copy=make('span');copy.append(make('strong','',line.name),make('small','',line.color+(line.dimensions?' · '+line.dimensions:'')));
      const remove=button('remove',()=>{const found=draft.lines.findIndex(candidate=>candidate.key===line.key);if(found>=0){draft.lines.splice(found,1);touch();renderSelected();renderResults();}});remove.setAttribute('aria-label',t('remove')+' '+line.name);heading.append(photo(line),copy,remove);
      const qty=input('wfPurchaseQty-'+index,'number',line.quantity,value=>{line.quantity=value;touch();});qty.min='1';qty.step='1';qty.inputMode='numeric';qty.placeholder=t('orderQty');
      const price=input('wfPurchasePrice-'+index,'number',line.unitPrice,value=>{line.unitPrice=value;touch();});price.min='0';price.step='0.01';price.inputMode='decimal';price.placeholder=t('unspecified');
      const recorded=report?.rows.find(row=>row.key===line.key)?.recordedUnits||0;
      const fields=make('div','wf-purchase-line-fields');fields.append(field('orderQty',qty),field('optionalPrice',price));row.append(heading,make('p','wf-purchase-small',t('recorded')+': '+recorded+(!recorded&&!report?.complete?' · '+t('review'):'')),fields);selectedHost.append(row);
    }
    if(!draft.lines.length)selectedHost.append(make('p','wf-ops-empty',t('emptySelection')));computed();
  }
  function renderDiagnostics(){
    if(!diagnosticHost)return;diagnosticHost.replaceChildren();const issues=report?.diagnostics||[];diagnosticHost.hidden=!issues.length;if(!issues.length)return;
    diagnosticHost.append(make('summary','',t('review')+' · '+issues.length));
    const keys={duplicateInvoice:'issueDuplicate',duplicateConflict:'issueConflict',undatedInvoice:'issueDate',dateFallback:'issueFallback',unlinkedProduct:'issueLink',missingCatalogProduct:'issueCatalog',missingVariant:'issueVariant',creditQuantityUnknown:'issueCredit',invalidQuantity:'quantityRequired'};
    for(const issue of issues.slice(0,60))diagnosticHost.append(make('p','',(issue.invoiceNumber||issue.invoiceId||issue.productId||'—')+(issue.lineIndex!==undefined?' · #'+(issue.lineIndex+1):'')+' · '+t(keys[issue.code]||'issueInvalid')));
    if(issues.length>60)diagnosticHost.append(make('p','',String(issues.length)+' '+t('review')));
  }
  function computed(){
    if(!draftStatus)return;const storedDraft=state().settings?.procurementOrders?.draft;
    draftStatus.textContent=t(autoPromise?'draftSaving':dirty?'draftPending':storedDraft?.id===draft.id?'draftSaved':'draftNew');if(autoError)draftStatus.textContent=t(autoError);
    controls.retry.hidden=!autoError;controls.retry.disabled=Boolean(saving||activePrint||autoPromise);controls.prepare.disabled=Boolean(saving||activePrint||!draft.lines.length);controls.demand.disabled=Boolean(saving||activePrint||!draft.lines.length||!report);
    for(const key of ['newOrder','scan','lookup','mode','year','from','to','delivery','supplier','contact','currency','language','notes','search'])if(controls[key])controls[key].disabled=Boolean(saving||activePrint);
    for(const node of selectedHost?.querySelectorAll('input,button')||[])node.disabled=Boolean(saving||activePrint);
    for(const node of resultHost?.querySelectorAll('button')||[])node.disabled=Boolean(saving||activePrint);
    for(const node of historyHost?.querySelectorAll('button')||[])node.disabled=Boolean(saving||activePrint);
    if(summaryHost){summaryHost.textContent=report?t('recorded')+': '+report.totalUnits+' '+t('units')+' · '+report.period.from+' — '+report.period.asOf+(report.complete?'':' · '+t('review')):'';}
    totalsHost.replaceChildren();if(draft.lines.length){try{const totals=core.orderTotals(draft.lines);totalsHost.append(make('strong','',totals.totalQuantity+' '+t('units')),make('span','',t(totals.unknownPrices?'total':'completeTotal')+': '+money(totals.unknownPrices===draft.lines.length?null:totals.knownTotalCents)));if(totals.unknownPrices)totalsHost.append(make('small','',t('unknown')+': '+totals.unknownPrices));}catch(error){totalsHost.append(make('span','',t(errorText(error))));}}
  }
  function acceptBarcode(raw){
    ensure();if(saving||activePrint)return false;if(!resultHost)build();if(!report)refreshReport();
    const found=core.resolveProductScan(state().products,raw);
    if(found.status!=='found'){notice(found.status==='unsupported'?'scanUnsupported':'scanMissing',true);return false;}
    const row=report?.rows.find(row=>row.productId===found.productId&&row.catalogVariant);
    if(!row){notice('scanMissing',true);return false;}
    query=row.code||row.catalogName||row.name;controls.search.value=query;limit=36;
    if(!draft.lines.some(line=>line.key===row.key))toggleModel(row);else{renderResults();renderSelected();}
    notice('');selectedHost.scrollIntoView({behavior:'smooth',block:'nearest'});return true;
  }
  async function saveOrder(){
    if(saving||activePrint)return false;let order;
    const existing=core.listOrders(state().settings).find(order=>order?.id===draft.id);
    if(existing){await showOrder(existing.id);return true;}
    try{if(!preparedOrder||preparedVersion!==editVersion){preparedOrder=core.prepareOrder(draft,{createdAt:new Date().toISOString()});preparedVersion=editVersion;}order=preparedOrder;}catch(error){notice(errorText(error),true);return false;}
    saving=true;computed();guard();
    try{if(!await flushDraft())return false;const saved=await core.persistOrder(order,{state:state(),writeBatch:operations=>wfWriteBatch(operations),hydrate:value=>typeof wfHydrateDBValue==='function'?wfHydrateDBValue(value):value});renderHistory();notice('saved');await showOrder(saved.id);return true;}
    catch(error){notice(errorText(error),true);return false;}
    finally{saving=false;computed();guard();if(pendingTranslate){pendingTranslate=false;translate();}}
  }
  function renderHistory(){
    if(!historyHost)return;historyHost.replaceChildren();const section=state().settings?.procurementOrders;
    if(section!=null&&(section.version!==1||!Array.isArray(section.orders))){historyHost.append(make('p','wf-purchase-small',t('review')));controls.moreHistory.hidden=true;return;}
    const orders=core.listOrders(state().settings).slice().reverse();
    for(const order of orders.slice(0,historyLimit)){if(!order||order.version!==1||!order.id||!Array.isArray(order.lines)){historyHost.append(make('p','wf-purchase-small',t('review')));continue;}const row=make('div','wf-purchase-history-row'),copy=make('div');copy.append(make('strong','',order.orderNumber||order.id),make('span','',order.supplier?.name||'—'),make('small','',(root.WOWStatementCore.day(order.createdAt)||'—')+' · '+(order.lines?.length||0)+' '+t('chosen')));const actions=make('div','wf-followup-planner-actions');actions.append(button('view',()=>showOrder(order.id)),button('followup',()=>root.WFProcurementFollowup?.open(order.id)));row.append(copy,actions);historyHost.append(row);}
    if(!orders.length)historyHost.append(make('p','wf-ops-empty',t('noOrders')));controls.moreHistory.hidden=orders.length<=historyLimit;
  }
  async function readyDocument(doc){
    const helpers=root.WFPackageLabelHelpers;if(!helpers)throw new Error('PRINT');
    await helpers.withTimeout(Promise.all([...doc.images].map(image=>helpers.waitForImage(image))),15000,'IMAGE_TIMEOUT');
    if(doc.fonts?.ready)await helpers.withTimeout(doc.fonts.ready,5000,'FONT_TIMEOUT');
  }
  function writeFrame(frame,html){const doc=frame.contentDocument;if(!doc)throw new Error('FRAME');doc.open();doc.write(html);doc.close();return doc;}
  function scalePreview(){
    if(!previewFrame)return;const width=210*96/25.4,scale=Math.min(1,Math.max(.1,(previewStage.clientWidth||width)/width));
    const height=Math.max(297*96/25.4,previewFrame.contentDocument?.documentElement?.scrollHeight||0);
    previewFrame.style.width=width+'px';previewFrame.style.height=height+'px';previewFrame.style.transform='scale('+scale+')';paperHolder.style.width=width*scale+'px';paperHolder.style.height=height*scale+'px';
  }
  function scheduleScale(){if(resizeFrame)return;resizeFrame=root.requestAnimationFrame(()=>{resizeFrame=0;scalePreview();});}
  async function portableOrder(order){
    const copy={...order,buyer:{...order.buyer},lines:order.lines.map(line=>({...line}))},images=new Map(),pending=[];
    const helpers=root.WFPackageLabelHelpers;if(!helpers||typeof root.Image!=='function')throw new Error('IMAGE');
    for(const source of [copy.buyer.logo,...copy.lines.map(line=>line.image)].filter(Boolean))if(!images.has(source)){images.set(source,source);pending.push(source);}
    let next=0;const controllers=new Set();
    async function worker(){while(next<pending.length){const source=pending[next++];let data=source,controller,timer;
      try{
        if(!/^data:image\//i.test(source)){
          controller=new root.AbortController();controllers.add(controller);timer=setTimeout(()=>controller.abort(),12000);
          const url=new URL(source,document.baseURI),response=await root.fetch(url.href,{credentials:'omit',signal:controller.signal});if(!response.ok)throw new Error('IMAGE');const blob=await response.blob();if(!/^image\/(png|jpeg|webp|gif)$/i.test(blob.type))throw new Error('IMAGE');
          data=await new Promise((resolve,reject)=>{const reader=new root.FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(new Error('IMAGE'));reader.readAsDataURL(blob);});
        }
        if(!root.WFPackageLabelCore.safeImageSource(data))throw new Error('IMAGE');
        const image=new root.Image();image.src=data;await helpers.waitForImage(image);images.set(source,data);
      }finally{clearTimeout(timer);if(controller)controllers.delete(controller);}
    }}
    try{await Promise.all(Array.from({length:Math.min(4,pending.length)},worker));}finally{for(const controller of controllers)controller.abort();}
    copy.buyer.logo=images.get(copy.buyer.logo)||'';for(const line of copy.lines)line.image=images.get(line.image)||'';return copy;
  }
  async function download(extension){
    if(!selectedOrder||activePrint||exportBusy)return;const order=selectedOrder,isCSV=extension==='csv';exportBusy=true;guard();
    const buttons=[...(previewHost.querySelector('.wf-purchase-document-actions')?.querySelectorAll('button')||[])].map(button=>({button,disabled:button.disabled}));
    for(const {button}of buttons)button.disabled=true;
    try{const content=isCSV?core.renderCSV(order):core.renderDocument(await portableOrder(order)),url=URL.createObjectURL(new Blob([content],{type:isCSV?'text/csv;charset=utf-8':'text/html;charset=utf-8'}));
      const link=make('a');link.href=url;link.download=(order.orderNumber||'purchase-order').replace(/[^\p{L}\p{N}_.-]/gu,'_')+'.'+extension;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
    }catch(_){notice('printError',true);}finally{exportBusy=false;for(const {button,disabled}of buttons)button.disabled=disabled;if(controls.print)controls.print.disabled=!previewReady||Boolean(activePrint);guard();}
  }
  async function showOrder(id){
    if(activePrint)return;const source=core.listOrders(state().settings).find(order=>order?.id===id);if(!source)return;
    const token=++previewRevision;previewReady=false;
    try{
      selectedOrder=core.prepareOrder(source);previewHost.hidden=false;previewHost.replaceChildren();const heading=make('div','wf-purchase-heading');heading.append(make('h2','',t('preview')+' · '+selectedOrder.orderNumber));
      const actions=make('div','wf-purchase-document-actions');controls.print=button('print',printOrder,true);controls.print.disabled=true;actions.append(button('followup',()=>root.WFProcurementFollowup?.open(source.id)),controls.print,button('html',()=>download('html')),button('csv',()=>download('csv')));recovery=button('recover',()=>{if(activePrint&&!activePrint.media?.matches)activePrint.cleanup(true);});recovery.hidden=true;actions.append(recovery);heading.append(actions);
      activityHost.replaceChildren();const activity=core.orderActivity(selectedOrder,state());activityHost.append(make('h3','',t('activity')),make('p','wf-purchase-small',activity.from+' — '+activity.to+' · '+t('activityHint')));
      for(const line of activity.lines)activityHost.append(make('p','',line.name+' · '+line.recordedUnits+' '+t('recorded')+(line.recordedUnits?'':' · '+t(activity.complete?'noSales':'review'))));if(!activity.complete)activityHost.append(make('p','wf-purchase-small',t('review')));
      previewHost.append(heading,make('p','wf-purchase-small',t('private')),previewStage,activityHost);paperHolder.replaceChildren();const frame=make('iframe','wf-purchase-paper');frame.title=t('preview');frame.setAttribute('sandbox','allow-same-origin');paperHolder.append(frame);previewFrame=frame;
      const doc=writeFrame(frame,core.renderDocument(selectedOrder));scalePreview();await readyDocument(doc);if(token!==previewRevision)return;scalePreview();previewReady=true;controls.print.disabled=exportBusy;
    }catch(_){if(token===previewRevision)notice('printError',true);}
  }
  async function printOrder(){
    if(activePrint||exportBusy||!previewReady||!selectedOrder||controls.print?.disabled)return;const order=selectedOrder,frame=make('iframe','wf-purchase-print-frame');frame.setAttribute('aria-hidden','true');frame.tabIndex=-1;frame.title=t('print');document.body.append(frame);
    let view,media,timer,entered=false,started=false;const job={frame,media:null,cleanup};activePrint=job;computed();controls.print.disabled=true;guard();
    function cleanup(closed=false){if(activePrint!==job)return;clearTimeout(timer);view?.removeEventListener('afterprint',afterPrint);root.removeEventListener('afterprint',afterPrint);media?.removeEventListener?.('change',mediaChanged);media?.removeListener?.(mediaChanged);root.removeEventListener('focus',recover);document.removeEventListener('visibilitychange',visible);activePrint=null;frame.remove();recovery.hidden=true;if(controls.print)controls.print.disabled=false;computed();guard();if(pendingTranslate){pendingTranslate=false;translate();}if(closed)notice('printClosed');}
    function afterPrint(){cleanup(true);}
    function recover(){if(activePrint===job&&started){recovery.hidden=false;recovery.disabled=Boolean(media?.matches);}}
    function visible(){if(document.visibilityState==='visible')recover();}
    function mediaChanged(event){if(event.matches){entered=true;recovery.disabled=true;}else if(entered)cleanup(true);}
    try{
      const doc=writeFrame(frame,core.renderDocument(order));await readyDocument(doc);if(activePrint!==job)return;
      view=frame.contentWindow;if(typeof view?.print!=='function')throw new Error('PRINT');view.addEventListener('afterprint',afterPrint);root.addEventListener('afterprint',afterPrint);media=view.matchMedia?.('print');job.media=media;entered=Boolean(media?.matches);
      if(media?.addEventListener)media.addEventListener('change',mediaChanged);else media?.addListener?.(mediaChanged);root.addEventListener('focus',recover);document.addEventListener('visibilitychange',visible);timer=setTimeout(recover,8000);notice('printBusy');view.focus();started=true;view.print();
    }catch(_){cleanup(false);notice('printError',true);}
  }
  function enter(){ensure();if(!resultHost)build();refreshReport();renderHistory();if(selectedOrder&&!activePrint)showOrder(selectedOrder.id);}
  function translate(){if(!draft)return;if(activePrint||saving){pendingTranslate=true;return;}const id=selectedOrder?.id;build();refreshReport();if(id)showOrder(id);}
  root.WFPurchasePlanner={open:()=>ops.open('purchase-planner'),acceptBarcode,save:saveOrder,print:printOrder,flushDraft,refresh:enter};
  root.addEventListener('resize',scheduleScale,{passive:true});document.addEventListener('visibilitychange',()=>{if(document.hidden&&dirty)flushDraft();});root.addEventListener('pagehide',()=>{if(dirty)flushDraft();});
  if(root.ResizeObserver)new root.ResizeObserver(scheduleScale).observe(page.body);guard();
})(typeof window==='object'?window:globalThis);
