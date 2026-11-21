/* Supplier receipts and calculated FIFO allocation. The purchase document stays immutable. */
(function (root) {
  'use strict';
  const ops = root.WFOperations, core = root.WFProcurementFollowupCore, planner = root.WFPurchasePlannerCore;
  if (!ops || !core || !planner || root.WFProcurementFollowup) return;
  const route = 'purchase-followup', pageSize = 20, make = ops.make;
  const words = {
    orders:['كل الطلبات','Tüm siparişler','All orders','Toutes les commandes','Все заказы'],
    unsaved:['تعديل غير محفوظ','Kaydedilmemiş düzenleme','Unsaved edit','Saisie non enregistrée','Несохранённое изменение'],
    search:['بحث برقم الطلب أو المورد أو الموديل','Sipariş, tedarikçi veya model ara','Search order, supplier or model','Rechercher une commande, un fournisseur ou un modèle','Поиск по заказу, поставщику или модели'],
    status:['حالة الطلب','Sipariş durumu','Order status','État de la commande','Статус заказа'],
    any:['كل الحالات','Tüm durumlar','All statuses','Tous les états','Все статусы'],
    prepared:['مجهّز','Hazır','Prepared','Préparée','Подготовлен'],
    ordered:['تم الطلب','Sipariş verildi','Ordered','Commandée','Заказан'],
    partial:['استلام جزئي','Kısmen alındı','Partially received','Partiellement reçue','Частично получен'],
    received:['مستلم بالكامل','Tamamı alındı','Received in full','Reçue en totalité','Полностью получен'],
    cancelled:['ملغى','İptal edildi','Cancelled','Annulée','Отменён'],
    overdue:['متأخر','Gecikmiş','Overdue','En retard','Просрочен'],
    expectedDate:['التاريخ المتوقع','Beklenen tarih','Expected date','Date prévue','Ожидаемая дата'],
    orderedUnits:['الكمية المطلوبة','Sipariş adedi','Ordered units','Unités commandées','Заказано единиц'],
    receivedUnits:['المستلم فعليًا','Teslim alınan','Confirmed received','Réception confirmée','Получено по записи'],
    outstandingUnits:['لم يُستلم','Teslim alınmayan','Unreceived units','Unités non reçues','Не получено'],
    allocatedUnits:['محسوب للفواتير المسلّمة','Teslimlere dağıtılan','Allocated to delivered invoices','Affectées aux factures livrées','Отнесено к доставленным счетам'],
    balanceUnits:['المتبقي من الاستلام المسجّل','Kayıtlı alım bakiyesi','Recorded receipt balance','Solde des réceptions enregistrées','Остаток учтённых поступлений'],
    unallocatedUnits:['كميات مسلّمة بلا استلام مطابق','Alımla eşleşmeyen teslimler','Delivered units without a matching receipt','Unités livrées sans réception correspondante','Доставлено без подходящего поступления'],
    fifo:['توزيع FIFO على الفواتير المسلّمة','Teslimlere FIFO dağılımı','FIFO allocation to delivered invoices','Affectation FIFO aux factures livrées','Распределение по доставленным счетам (FIFO)'],
    basis:['يخص الحساب الاستلامات المسجّلة فقط. تُحسب أقدم القطع المستلمة للموديل واللون والقياس نفسه أولًا مقابل التسليمات اللاحقة، دون تحديد الدفعة الفعلية أو إجمالي المخزون.',
      'Hesap yalnızca kayıtlı alımları kapsar. Aynı model, renk ve ölçünün en eski alımları sonraki teslimatlara önce dağıtılır. Fiziksel parti veya toplam depo stoku bu hesapla belirlenemez.',
      'Only recorded receipts are included. Later deliveries use the earliest available receipts of the same model, color and size. Physical lots and total warehouse stock cannot be identified from this calculation.',
      'Seules les réceptions enregistrées sont prises en compte. Les livraisons utilisent les réceptions antérieures les plus anciennes du même modèle, coloris et format. Ce calcul ne permet pas d’identifier le lot physique ni le stock total.',
      'Учитываются только записанные поступления. К доставке сначала относят самые ранние поступления той же модели, цвета и размера. Этот расчёт не определяет физическую партию и весь складской остаток.'],
    review:['بيانات ناقصة. الكميات المحسوبة تعتمد على السجلات الصالحة فقط.','Eksik veri var. Hesap yalnızca geçerli kayıtlara dayanır.','Some records need review. Calculations use the valid records available.','Des données sont à vérifier. Les calculs utilisent uniquement les enregistrements valides.','Часть записей требует проверки. Расчёт учитывает доступные корректные данные.'],
    invalidLedger:['سجل المتابعة غير صالح','Takip kaydı geçersiz','Invalid follow-up history','Historique de suivi invalide','Некорректная история операций'],
    invalidOrders:['سجل طلبات الموردين غير صالح','Sipariş geçmişi geçersiz','Invalid supplier order history','Historique des commandes invalide','Некорректная история заказов'],
    invalidOrder:['طلب يحتاج إلى تصحيح','Siparişin düzeltilmesi gerekiyor','Supplier order needs correction','Commande à corriger','Заказ требует исправления'],
    invoicesUnavailable:['سجل الفواتير غير متاح','Fatura kayıtlarına erişilemiyor','Invoice records unavailable','Factures indisponibles','Данные счетов недоступны'],
    invalidInvoice:['بيانات فاتورة غير صالحة','Geçersiz fatura kaydı','Invalid invoice record','Facture incorrecte','Некорректная запись счёта'],
    missingInvoiceId:['معرّف الفاتورة مفقود','Fatura kimliği eksik','Missing invoice ID','Identifiant de facture manquant','Отсутствует идентификатор счёта'],
    duplicateInvoice:['فاتورة مكررة حُسبت مرة واحدة','Tekrarlanan fatura bir kez sayıldı','Duplicate invoice counted once','Facture en double comptée une seule fois','Дубликат счёта учтён один раз'],
    duplicateConflict:['نسخ متعارضة للفاتورة نفسها','Aynı faturanın çelişen kopyaları','Conflicting copies of one invoice','Copies divergentes d’une facture','Расхождения между копиями счёта'],
    undatedDelivery:['وقت التسليم الدقيق مفقود','Kesin teslimat zamanı eksik','Precise delivery time missing','Heure de livraison exacte manquante','Нет точного времени доставки'],
    creditQuantityUnknown:['كمية المرتجع غير محددة','İade adedi bilinmiyor','Credit with unknown return quantity','Avoir sans quantité retournée connue','Не указано количество возврата'],
    emptyInvoice:['فاتورة بلا بنود','Faturada kalem yok','Invoice without items','Facture sans lignes','Счёт без позиций'],
    invalidLine:['بند فاتورة غير صالح','Geçersiz fatura kalemi','Invalid invoice line','Ligne de facture incorrecte','Некорректная строка счёта'],
    invalidQuantity:['كمية غير صالحة','Geçersiz adet','Invalid quantity','Quantité invalide','Недопустимое количество'],
    unlinkedProduct:['معرّف المنتج مفقود','Ürün kimliği eksik','Missing product ID','Identifiant produit manquant','Нет идентификатора товара'],
    missingVariant:['لون أو قياس غير مكتمل','Renk veya ölçü eksik','Missing color or dimensions','Couleur ou dimensions manquantes','Отсутствует цвет или размер'],
    quantityOverflow:['تجاوزت الكمية حد الحساب الدقيق','Adet kesin hesap sınırını aşıyor','Quantity exceeds the safe calculation limit','Quantité au-delà de la limite de calcul exact','Количество превышает предел точного расчёта'],
    futureReceipt:['وقت الاستلام لاحق للوقت الحالي','Alım zamanı gelecekte','Receipt time is in the future','Réception datée dans le futur','Время поступления указано в будущем'],
    futureDelivery:['وقت التسليم لاحق للوقت الحالي','Teslimat zamanı gelecekte','Delivery time is in the future','Livraison datée dans le futur','Время доставки указано в будущем'],
    futureEvent:['إجراء مؤرّخ في المستقبل','İşlem tarihi gelecekte','Follow-up event dated in the future','Opération de suivi datée dans le futur','Дата операции указана в будущем'],
    uncertainHistory:['سجل غير مكتمل قد يؤثر على التوزيع','Eksik geçmiş dağılımı etkileyebilir','Incomplete history may affect allocation','Un historique incomplet peut modifier l’affectation','Неполная история может влиять на распределение'],
    limit:['تجاوز السجل الحد المتاح للحساب','Kayıtlar hesaplama sınırını aşıyor','Records exceed the reporting limit','Volume supérieur à la limite de calcul','Превышен предел объёма отчёта'],
    issues:['سجلات تحتاج مراجعة','İncelenecek kayıtlar','Records to review','Données à vérifier','Записи для проверки'],
    unknown:['غير متاح','Bilinmiyor','Unavailable','Indisponible','Нет данных'],
    noOrders:['لا توجد طلبات موردين محفوظة بعد.','Henüz kayıtlı tedarikçi siparişi yok.','No saved supplier orders yet.','Aucune commande fournisseur enregistrée.','Сохранённых заказов поставщикам пока нет.'],
    noMatch:['لا توجد طلبات مطابقة.','Eşleşen sipariş yok.','No matching orders.','Aucune commande correspondante.','Подходящих заказов нет.'],
    loading:['جارٍ تحميل الطلبات والفواتير…','Siparişler ve faturalar yükleniyor…','Loading orders and invoices…','Chargement des commandes et des factures…','Загрузка заказов и счетов…'],
    refresh:['تحديث','Yenile','Refresh','Actualiser','Обновить'],
    next:['التالي','Sonraki','Next','Suivant','Далее'],
    previous:['السابق','Önceki','Previous','Précédent','Назад'],
    models:['الموديلات','Modeller','Models','Modèles','Модели'],
    history:['سجل المتابعة','Takip geçmişi','Follow-up history','Historique du suivi','История операций'],
    noHistory:['لا توجد إجراءات مسجّلة لهذا الطلب بعد.','Bu siparişte henüz işlem yok.','No follow-up recorded for this order yet.','Aucun suivi enregistré pour cette commande.','По этому заказу ещё нет операций.'],
    markOrdered:['تسجيل الطلب لدى المورد','Sipariş verildi olarak işaretle','Mark as ordered','Marquer comme commandée','Отметить как заказанный'],
    editDate:['تعديل التاريخ المتوقع','Beklenen tarihi düzenle','Edit expected date','Modifier la date prévue','Изменить ожидаемую дату'],
    all:['استلام كل الكمية المتبقية','Kalanın tamamını teslim al','Receive all remaining','Réceptionner tout le solde','Принять весь остаток'],
    editPartial:['تسجيل استلام جزئي','Kısmi alım kaydet','Record partial receipt','Réception partielle','Частичная приёмка'],
    void_receipt:['عكس هذا الاستلام','Bu alımı geri al','Reverse this receipt','Contrepasser cette réception','Сторнировать поступление'],
    cancel:['إلغاء الكمية غير المستلمة','Alınmayan kalanı iptal et','Cancel unreceived remainder','Annuler le solde non reçu','Отменить неполученный остаток'],
    reopen:['إعادة فتح الطلب','Siparişi yeniden aç','Reopen order','Rouvrir la commande','Возобновить заказ'],
    confirmReceipt:['تأكيد الكمية المستلمة','Alınan miktarı onayla','Confirm receipt','Confirmer la réception','Подтвердить приёмку'],
    confirmCancel:['تأكيد إلغاء المتبقي','Kalanın iptalini onayla','Confirm cancellation','Confirmer l’annulation','Подтвердить отмену'],
    confirmVoid:['تأكيد عكس الاستلام','Alımın geri alınmasını onayla','Confirm receipt reversal','Confirmer la contrepassation','Подтвердить сторно'],
    saveDate:['حفظ التاريخ','Tarihi kaydet','Save date','Enregistrer la date','Сохранить дату'],
    discard:['تجاهل التعديل','Düzenlemeyi bırak','Discard edit','Abandonner la saisie','Отменить изменение'],
    quantity:['الكمية المستلمة الآن','Şimdi alınan adet','Quantity received now','Quantité reçue maintenant','Получено сейчас'],
    reason:['سبب عكس الاستلام','Geri alma nedeni','Reason for reversal','Motif de la contrepassation','Причина сторно'],
    operator:['اسم المسؤول من الإعدادات','Ayarlardaki görevli adı','Configured operator','Nom configuré de l’opérateur','Имя оператора в настройках'],
    evOrdered:['تم تسجيل الطلب لدى المورد','Sipariş verildi','Marked as ordered','Commande enregistrée','Заказ размещён'],
    evExpected:['تعديل التاريخ المتوقع','Beklenen tarih değiştirildi','Expected date changed','Date prévue modifiée','Ожидаемая дата изменена'],
    dateCleared:['أُزيل التاريخ المتوقع','Beklenen tarih kaldırıldı','Expected date cleared','Date prévue effacée','Ожидаемая дата удалена'],
    evReceipt:['استلام مسجّل','Alım kaydedildi','Receipt recorded','Réception enregistrée','Поступление зарегистрировано'],
    evVoid:['عُكس الاستلام','Alım geri alındı','Receipt reversed','Réception contrepassée','Поступление сторнировано'],
    evCancel:['أُلغي المتبقي','Kalan iptal edildi','Remainder cancelled','Solde annulé','Остаток отменён'],
    evReopen:['أُعيد فتح الطلب','Sipariş yeniden açıldı','Order reopened','Commande rouverte','Заказ возобновлён'],
    saved:['تم الحفظ','Kaydedildi','Saved','Enregistré','Сохранено'],
    saving:['جارٍ الحفظ…','Kaydediliyor…','Saving…','Enregistrement…','Сохранение…'],
    saveError:['تعذّر تأكيد الحفظ. تحقق من السجل ثم أعد المحاولة.','Kayıt doğrulanamadı. Geçmişi kontrol edip yeniden deneyin.','Save could not be confirmed. Check history and retry.','Enregistrement non confirmé. Vérifiez l’historique puis réessayez.','Сохранение не подтверждено. Проверьте историю и повторите.'],
    readError:['تعذّرت قراءة الطلبات أو الفواتير. أعد التحديث.','Sipariş veya fatura kayıtları okunamadı. Yenileyin.','Order or invoice records could not be read. Refresh to retry.','Lecture des commandes ou des factures impossible. Actualisez pour réessayer.','Не удалось прочитать заказы или счета. Обновите данные.'],
    conflict:['تغيّر الطلب. راجع الكميات الحالية ثم تجاهل التعديل السابق لإدخال جديد.','Sipariş değişti. Güncel adetleri kontrol edin ve yeni giriş için önceki düzenlemeyi bırakın.','This order changed. Review current quantities and discard the old edit before starting again.','La commande a changé. Vérifiez les quantités actuelles et abandonnez l’ancienne saisie avant de recommencer.','Заказ изменился. Проверьте текущие количества и отмените прежнее изменение перед новым вводом.'],
    invalidQty:['أدخل كمية صحيحة ضمن الكمية غير المستلمة لموديل واحد على الأقل.','En az bir model için alınmayan adedi aşmayan bir tam sayı girin.','Enter a whole quantity within the unreceived amount for at least one model.','Saisissez une quantité entière dans la limite du solde pour au moins un modèle.','Укажите целое количество в пределах неполученного остатка хотя бы по одной модели.'],
    invalidReason:['اكتب سبب عكس الاستلام.','Alımı geri alma nedenini girin.','Enter a reason for reversing this receipt.','Indiquez le motif de la contrepassation.','Укажите причину сторно поступления.'],
    invalidDate:['أدخل تاريخًا صالحًا أو اتركه فارغًا.','Geçerli bir tarih girin veya boş bırakın.','Enter a valid date or leave it empty.','Saisissez une date valide ou laissez le champ vide.','Введите допустимую дату или оставьте поле пустым.'],
    capacity:['بلغ سجل المتابعة حد السعة. لم تُضف العملية.','Takip kaydı kapasitesine ulaştı. İşlem eklenmedi.','Follow-up history is at capacity. The event could not be added.','La capacité de l’historique est atteinte. L’opération n’a pas été ajoutée.','Достигнут предел истории. Операция не добавлена.'],
    missing:['الطلب غير متاح. راجع سجل الطلبات.','Sipariş bulunamadı. Sipariş kayıtlarını kontrol edin.','Order unavailable. Check the saved orders.','Commande indisponible. Vérifiez les commandes enregistrées.','Заказ недоступен. Проверьте сохранённые заказы.']
  };
  const statuses = ['prepared','ordered','partial','received','cancelled','overdue'];
  const eventLabels = {ordered:'evOrdered',expected:'evExpected',receipt:'evReceipt',void_receipt:'evVoid',cancel:'evCancel',reopen:'evReopen'};
  const editLabels = {ordered:'markOrdered',expected:'editDate',all:'all',partial:'editPartial',cancel:'cancel',reopen:'reopen',void_receipt:'void_receipt'};
  const confirmLabels = {ordered:'markOrdered',expected:'saveDate',all:'confirmReceipt',partial:'confirmReceipt',cancel:'confirmCancel',reopen:'reopen',void_receipt:'confirmVoid'};
  const locale = () => planner.locales.includes(ops.locale()) ? ops.locale() : 'en';
  const t = key => words[key][planner.locales.indexOf(locale())];
  const state = () => ops.state();
  const drafts = new Map(), messages = new Map();
  let report, index = [], selected = '', query = '', status = '', orderPage = 0, linePage = 0, historyPage = 0;
  let busy = false, reading = false, initialized = false, resultsHost, readError = false, useDatabaseInvoices = false;
  const page = ops.register({id:route, parent:'purchase-planner', icon:'review', onEnter:enter, onLanguage:() => {if(initialized) render();}});
  const idOf = id => String(id ?? '');
  const orderNow = () => index.find(row => row.id === selected)?.order;
  const number = value => Number.isSafeInteger(value) ? value.toLocaleString(locale()) : t('unknown');
  function date(value, withTime=false) {
    if (!value) return '';
    const time = new Date(withTime ? value : value + 'T12:00:00');
    return Number.isFinite(time.getTime()) ? time.toLocaleString(locale(), withTime ? {dateStyle:'medium',timeStyle:'short'} : {dateStyle:'medium'}) : t('unknown');
  }
  function button(action, key, handler, primary=false) {
    const node = make('button','btn '+(primary?'btn-p':'btn-s'),t(key));
    node.type = 'button'; node.dataset.followupAction = action; node.addEventListener('click',handler); return node;
  }
  function field(key, node) {
    const label = make('label','wf-followup-field'); label.append(make('span','',t(key)),node); return label;
  }
  function metric(key, value) {
    const pair = make('div','wf-followup-metric');
    pair.append(make('dt','',t(key)),make('dd','',number(value))); return pair;
  }
  function metrics(keys, source) {
    const box = make('dl','wf-followup-metrics');
    for (const key of keys) box.append(metric(key,source[key])); return box;
  }
  function feedback(key, error=true) {
    const node = make('p','wf-ops-status',t(key)); node.setAttribute('role','status'); node.dataset.kind = error?'error':'success'; return node;
  }
  function panel(title) {
    const box = make('section','wf-ops-card wf-followup-panel');
    if (title) box.append(make('h2','',t(title))); return box;
  }
  function paginate(host, count, current, update, suffix) {
    if (count <= pageSize) return;
    const pages = Math.ceil(count/pageSize), bar = make('div','wf-followup-pager');
    const back = button('previous'+suffix,'previous',()=>update(current-1));
    const next = button('next'+suffix,'next',()=>update(current+1));
    back.disabled = current <= 0; next.disabled = current >= pages-1;
    bar.append(back,make('span','',number(current+1)+' / '+number(pages)),next); host.append(bar);
  }
  function rebuild(invoices=state().invoices) {
    try {
      report = core.buildReport({...state(),invoices});
      index = report.orders.map(order=>({order,id:idOf(order.id),search:planner.normalize([order.orderNumber,order.supplier?.name,...order.lines.map(line=>line.name)].join(' '))})).reverse();
    } catch (_) { report=null; index=[]; readError=true; }
    render();
  }
  function guard() { root.WFAppUpdates?.registerGuard?.(route,hasUnsavedChanges); }
  function hasUnsavedChanges() { return Boolean(drafts.size || busy || reading); }
  function enter() {
    initialized=true; guard();
    if (busy || reading) {render();return;}
    if (typeof dbGetRaw==='function' && typeof dbGetAllRaw==='function') return refresh();
    rebuild();
  }
  function open(id) {
    if (id !== undefined) select(id, false);
    else select('',false);
    return ops.open(route);
  }
  function select(id, redraw=true) {
    const next = idOf(id);
    if (selected !== next) { selected=next; linePage=historyPage=0; }
    if (redraw) {render(); page.body.querySelector?.('.wf-followup-title')?.focus?.({preventScroll:true});}
  }
  const hydrate = value => typeof wfHydrateDBValue==='function' ? wfHydrateDBValue(value) : value;
  async function reread() {
    if (typeof dbGetRaw !== 'function') throw Error('READ_UNAVAILABLE');
    await core.publishSnapshot(state(),await dbGetRaw('settings','main') || {},hydrate);
  }
  async function readInvoices() {
    if (typeof dbGetAllRaw !== 'function') throw Error('READ_UNAVAILABLE');
    const local=state().invoices, before=Array.isArray(local)?local.slice():null;
    const invoices=await dbGetAllRaw('invoices');
    // A delivery can be published in the same tab while this read is in flight.
    const after=state().invoices;
    if (after!==local || before?.length!==after?.length || before?.some((invoice,i)=>invoice!==after[i])) return dbGetAllRaw('invoices');
    return invoices;
  }
  async function refresh() {
    if (busy || reading) return false;
    guard();reading=true;useDatabaseInvoices=true;readError=false;render();
    // Read raw invoice rows just for this calculation. Media stays encoded and app-wide invoices stay untouched.
    const [settings,invoices]=await Promise.allSettled([reread(),readInvoices()]);
    readError=settings.status==='rejected'||invoices.status==='rejected';
    reading=false;rebuild(invoices.status==='fulfilled'?invoices.value:null);
    return !readError;
  }
  function render() {
    if (!initialized) return;
    page.actions.replaceChildren();
    const refreshButton=button('refresh','refresh',refresh);refreshButton.id='wfProcurementFollowupRefresh';
    refreshButton.disabled=busy || reading;page.actions.append(refreshButton);
    page.body.replaceChildren();
    if (reading && !report) {
      const loading=make('p','wf-ops-status',t('loading'));
      loading.setAttribute('role','status');page.body.append(loading);
    } else if (readError || !report) page.body.append(feedback('readError'));
    if (!report) return;
    if (selected) renderDetail(); else renderOverview();
  }
  function overviewSummary() {
    const box=panel(), summary=make('dl','wf-followup-metrics wf-followup-summary');
    const overdue=index.filter(row=>row.order.overdue).length;
    summary.append(metric('orders',index.length),metric('overdue',overdue),metric('outstandingUnits',report.totals.outstandingUnits));
    const allocation=make('details','wf-followup-overview-allocation');
    allocation.append(make('summary','',t('fifo')),metrics(['receivedUnits','allocatedUnits','balanceUnits','unallocatedUnits'],report.totals),make('p','wf-followup-basis',t('basis')));
    box.append(summary,allocation);return box;
  }
  function diagnostics() {
    const box=make('details','wf-followup-diagnostics'), counts=new Map();
    for (const issue of report.diagnostics) counts.set(issue.code,(counts.get(issue.code)||0)+1);
    box.append(make('summary','',t('issues')+' · '+number(report.diagnostics.length)));
    for (const [code,count] of counts) {
      const key=code==='capacity'?'limit':Object.hasOwn(words,code)?code:'issues';
      box.append(make('p','',t(key)+' · '+number(count)));
    }
    return box;
  }
  function reviewNotice() {
    if (!report.complete) page.body.append(feedback('review'));
    if (report.diagnostics.length) page.body.append(diagnostics());
  }
  function renderOverview() {
    reviewNotice();
    const invalidStore=report.totals.orderedUnits===null;
    if (!invalidStore) page.body.append(overviewSummary());
    const list=panel('orders'),filters=make('div','wf-followup-filters');
    const search=make('input','fi');search.id='wfProcurementFollowupSearch';search.type='search';search.value=query;search.enterKeyHint='search';
    search.addEventListener('input',()=>{query=search.value;orderPage=0;renderList();});
    const selectStatus=make('select','fi');selectStatus.id='wfProcurementStatusFilter';
    const filtersAvailable=['',...statuses];
    if(drafts.size||status==='unsaved')filtersAvailable.push('unsaved');
    for (const value of filtersAvailable) {const o=make('option','',t(value||'any'));o.value=value;selectStatus.append(o);}
    selectStatus.value=status;selectStatus.addEventListener('change',()=>{status=selectStatus.value;orderPage=0;renderList();});
    filters.append(field('search',search),field('status',selectStatus));resultsHost=make('div','wf-followup-results');
    list.append(filters,resultsHost);page.body.append(list);renderList();
  }
  function renderList() {
    const needle=planner.normalize(query), rows=index.filter(({order,search,id})=>{
      const match=status==='overdue'?order.overdue:status==='unsaved'?drafts.has(id):!status||order.status===status;
      return match&&(!needle||search.includes(needle));
    });
    orderPage=Math.max(0,Math.min(orderPage,Math.ceil(rows.length/pageSize)-1));
    resultsHost.replaceChildren();
    for(const {order,id} of rows.slice(orderPage*pageSize,(orderPage+1)*pageSize)){
      const card=make('button','wf-followup-card');card.type='button';card.dataset.orderId=id;
      const name=make('span','wf-followup-card-name');name.append(make('strong','',order.supplier?.name||t('unknown')),make('small','',order.orderNumber||id));
      const meta=make('span','wf-followup-card-meta');meta.append(make('b','wf-followup-status',t(order.status)));
      if(drafts.has(id))meta.append(make('small','',t('unsaved')));
      if(order.overdue)meta.append(make('small','wf-followup-overdue',t('overdue')+' · '+date(order.expectedDate)));
      card.append(name,meta);card.addEventListener('click',()=>select(id));resultsHost.append(card);
    }
    if (!rows.length) resultsHost.append(make('p','wf-ops-empty',t(index.length?'noMatch':report.complete?'noOrders':'issues')));
    paginate(resultsHost,rows.length,orderPage,next=>{orderPage=next;renderList();},'Orders');
  }
  function renderDetail() {
    const nav=make('div','wf-followup-head');
    nav.append(button('orders','orders',()=>select('')));
    const order=orderNow(), draft=drafts.get(selected);
    page.body.append(nav);
    if (!order) {
      page.body.append(feedback('missing'));reviewNotice();
      if(draft) page.body.append(discardButton(draft));return;
    }
    const head=panel(),title=make('h2','wf-followup-title',order.orderNumber||order.id);
    title.tabIndex=-1;
    const supplier=make('p','wf-followup-supplier',order.supplier?.name || t('unknown'));
    head.append(title,supplier,make('b','wf-followup-status',t(order.status)));
    if (order.expectedDate) head.append(make('p',order.overdue?'wf-followup-overdue':'',t(order.overdue?'overdue':'expectedDate')+' · '+date(order.expectedDate)));
    head.append(metrics(['orderedUnits','receivedUnits','outstandingUnits'],order));
    page.body.append(head);
    if (messages.has(selected)) page.body.append(feedback(messages.get(selected),messages.get(selected)!=='saved'));
    if (draft) renderEditor(order,draft);
    else {
      const actions=make('div','wf-followup-actions');
      const choices=[];
      if(order.status==='prepared') choices.push('ordered');
      if(order.status==='cancelled') choices.push('reopen');
      else if(order.outstandingUnits>0) choices.push('all','partial','expected','cancel');
      for(const choice of choices) {
        const control=button(choice,editLabels[choice],()=>start(order,choice),choice==='all');
        control.disabled=busy||reading||readError||order.futureEvents||order.status==='unknown';actions.append(control);
      }
      if (choices.length) head.append(actions);
    }
    const allocation=panel('fifo');
    allocation.append(metrics(['allocatedUnits','balanceUnits'],order),make('p','wf-followup-basis',t('basis')));
    page.body.append(allocation);reviewNotice();
    renderLines(order);renderHistory(order);
  }
  function variant(line) {
    return [line.name,line.color,line.dimensions].filter(Boolean).join(' · ');
  }
  function renderLines(order) {
    const box=panel('models');box.className+=' wf-followup-lines';
    const start=linePage*pageSize;
    for(const line of order.lines.slice(start,start+pageSize)){
      const row=make('article','wf-followup-line');
      row.append(make('h3','',variant(line)),metrics(['orderedUnits','receivedUnits','outstandingUnits','allocatedUnits','balanceUnits'],line));
      box.append(row);
    }
    paginate(box,order.lines.length,linePage,next=>{linePage=next;render();},'Models');page.body.append(box);
  }
  function receiptCaption(event) {
    const units=event.lines.reduce((sum,line)=>sum+line.quantity,0);
    return date(event.at,true)+' · '+t('receivedUnits')+' '+number(units);
  }
  function renderHistory(order) {
    const box=panel('history');box.className+=' wf-followup-timeline';
    const events=order.events, reversed=new Set(events.filter(event=>event.type==='void_receipt').map(event=>event.receiptId));
    const end=Math.max(0,events.length-historyPage*pageSize);
    for(const event of events.slice(Math.max(0,end-pageSize),end).reverse()){
      const row=make('article','wf-followup-event');
      row.append(make('h3','',t(eventLabels[event.type])),make('time','',event.type==='receipt'?receiptCaption(event):date(event.at,true)));
      if(event.operator)row.append(make('small','',t('operator')+' · '+event.operator));
      if(event.expectedDate!==undefined)row.append(make('p','',event.expectedDate?t('expectedDate')+' · '+date(event.expectedDate):t('dateCleared')));
      if(event.note)row.append(make('p','',event.note));
      if(event.type==='void_receipt'){
        const original=events.find(receipt=>receipt.id===event.receiptId);
        if(original)row.append(make('small','',t('evReceipt')+' · '+receiptCaption(original)));
      }
      if(event.type==='receipt'){
        const detail=make('details','wf-followup-event-lines');
        detail.append(make('summary','',t('models')+' · '+number(event.lines.length)));
        let loaded=false;
        detail.addEventListener('toggle',()=>{
          if(!detail.open || loaded)return;loaded=true;
          const lines=new Map(order.lines.map(line=>[line.key,line]));
          const items=make('div');detail.append(items);
          function showItems(n) {
            items.replaceChildren();
            for(const item of event.lines.slice(n*pageSize,(n+1)*pageSize)){
              items.append(make('p','',variant(lines.get(item.key))+' · '+number(item.quantity)));
            }
            paginate(items,event.lines.length,n,showItems,'EventModels');
          }
          showItems(0);
        });
        row.append(detail);
        if(reversed.has(event.id))row.append(make('b','wf-followup-status',t('evVoid')));
        else if(!drafts.has(selected)) {
          const reverse=button('void_receipt','void_receipt',()=>start(order,'void_receipt',event.id));
          reverse.disabled=busy||reading||readError||order.futureEvents||order.status==='unknown';row.append(reverse);
        }
      }
      box.append(row);
    }
    if(!events.length)box.append(make('p','',t('noHistory')));
    paginate(box,events.length,historyPage,next=>{historyPage=next;render();},'History');page.body.append(box);
  }
  function start(order, mode, receiptId) {
    const orderId=idOf(order.id);
    if(busy || reading || readError || order.futureEvents || order.status==='unknown' || selected!==orderId || drafts.has(orderId) || order.revision!==orderNow()?.revision)return false;
    const draft={orderId,revision:order.revision,mode,receiptId,expectedDate:order.expectedDate||'',reason:'',quantities:new Map(),offset:0,error:'',locked:false,intent:null};
    guard();drafts.set(orderId,draft);messages.delete(orderId);
    if(mode==='ordered'||mode==='reopen')return submit(order,draft);
    render();page.body.querySelector?.('.wf-followup-editor')?.scrollIntoView?.({block:'nearest'});return true;
  }
  function discardButton(draft) {
    const control=button('discard','discard',()=>{
      if(busy || drafts.get(draft.orderId)!==draft)return;
      drafts.delete(draft.orderId);messages.delete(draft.orderId);render();
    });
    control.disabled=busy;return control;
  }
  function input(id,type,value,update) {
    const node=make('input','fi');node.type=type;node.id=id;node.value=value;
    node.addEventListener('input',()=>update(node.value));return node;
  }
  function renderEditor(order,draft) {
    const box=panel(editLabels[draft.mode]);box.className+=' wf-followup-editor';
    const stale=draft.locked||draft.revision!==order.revision||order.futureEvents||order.status==='unknown', blocked=busy||reading||readError||stale;
    function change(fn) {
      return value=>{if(blocked||drafts.get(draft.orderId)!==draft)return;fn(value);draft.intent=null;};
    }
    if(draft.mode==='expected'){
      const control=input('wfProcurementExpectedDate','date',draft.expectedDate,change(value=>{
        draft.expectedDate=value;draft.invalidDate=Boolean(control.validity?.badInput);
      }));
      control.disabled=blocked;box.append(field('expectedDate',control));
    }
    if(draft.mode==='all'||draft.mode==='cancel')box.append(metrics(['outstandingUnits'],order));
    if(draft.mode==='partial'){
      // A conflicting receipt may have closed a line for which this form still holds a value.
      const rows=order.lines.map((line,i)=>({line,i})).filter(({line})=>line.outstandingUnits>0||draft.quantities.has(line.key));
      draft.offset=Math.max(0,Math.min(draft.offset,Math.ceil(rows.length/pageSize)-1));
      for(const {line,i} of rows.slice(draft.offset*pageSize,(draft.offset+1)*pageSize)){
        const label=make('label','wf-followup-quantity');
        const control=input('wfProcurementQty'+i,'text',draft.quantities.get(line.key)||'',change(value=>{
          if(value)draft.quantities.set(line.key,value);else draft.quantities.delete(line.key);
        }));
        control.inputMode='numeric';control.autocomplete='off';control.disabled=blocked;
        label.append(make('strong','',variant(line)),make('small','',t('outstandingUnits')+' · '+number(line.outstandingUnits)),make('span','',t('quantity')),control);box.append(label);
      }
      paginate(box,rows.length,draft.offset,next=>{draft.offset=next;render();},'ReceiptModels');
    }
    if(draft.mode==='void_receipt'){
      const receipt=order.events.find(event=>event.id===draft.receiptId);
      if(receipt)box.append(make('p','',receiptCaption(receipt)));
      const control=make('textarea','fi');control.id='wfProcurementVoidReason';control.rows=2;control.maxLength=2000;control.value=draft.reason;
      const update=change(value=>draft.reason=value);
      control.disabled=blocked;control.addEventListener('input',()=>update(control.value));box.append(field('reason',control));
    }
    if(stale || draft.error) box.append(feedback(stale?'conflict':draft.error));
    if(busy) box.append(feedback('saving',false));
    const actions=make('div','wf-followup-actions');
    const confirm=button('confirm',confirmLabels[draft.mode],()=>submit(order,draft),true);
    confirm.disabled=blocked;actions.append(confirm,discardButton(draft));box.append(actions);page.body.append(box);
  }
  function makeIntent(order,draft) {
    const type=draft.mode==='all'||draft.mode==='partial'?'receipt':draft.mode;
    const event={id:root.crypto?.randomUUID?.()||'pf-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2),type,at:new Date().toISOString()};
    const operator=state().settings?.authPerson;
    if(typeof operator==='string'&&operator.trim())event.operator=operator.trim();
    if(type==='expected'){
      if(draft.invalidDate)throw Error('INVALID_EXPECTED_DATE');
      event.expectedDate=draft.expectedDate;
    }
    if(type==='void_receipt'){
      if(!draft.reason.trim())throw Error('INVALID_REVERSAL');
      event.receiptId=draft.receiptId;event.note=draft.reason.trim();
    }
    if(type==='receipt'){
      event.lines=[];
      for(const line of order.lines) {
        const raw=draft.mode==='all'?String(line.outstandingUnits):planner.normalize(draft.quantities.get(line.key)||'');
        if(raw===''||raw==='0')continue;
        const quantity=Number(raw);
        if(!/^\d+$/.test(raw)||!Number.isSafeInteger(quantity)||quantity<=0||quantity>line.outstandingUnits)throw Error('INVALID_RECEIPT');
        event.lines.push({key:line.key,quantity});
      }
      if(!event.lines.length)throw Error('INVALID_RECEIPT');
    }
    return {orderId:draft.orderId,expectedRevision:draft.revision,event};
  }
  function errorKey(code) {
    return ({INVALID_EXPECTED_DATE:'invalidDate',INVALID_REVERSAL:'invalidReason',INVALID_RECEIPT:'invalidQty',OVER_RECEIPT:'invalidQty',
      MISSING_ORDER:'missing',FOLLOWUP_CAPACITY:'capacity',INVALID_FOLLOWUP:'readError',ORDER_HISTORY_INVALID:'readError'})[code]||'saveError';
  }
  async function submit(order,draft) {
    if(busy||reading||readError||draft.locked||drafts.get(draft.orderId)!==draft||selected!==draft.orderId)return false;
    if(orderNow()?.revision!==draft.revision||orderNow()?.futureEvents||orderNow()?.status==='unknown'){draft.locked=true;render();return false;}
    try {draft.intent ??= makeIntent(order,draft);}
    catch(cause){draft.error=errorKey(cause.code||cause.message);render();return false;}
    busy=true;draft.error='';render();
    try {
      const committed=await core.persistChange(draft.intent,{state:state(),writeBatch:operations=>wfWriteBatch(operations),
        hydrate});
      drafts.delete(draft.orderId);messages.set(draft.orderId,'saved');
      root.dispatchEvent(new root.CustomEvent('wf-procurement-followup-change',{detail:{orderId:draft.orderId,revision:committed.revision}}));
      return true;
    } catch(cause) {
      const code=cause.code||cause.message;
      if(code==='FOLLOWUP_CHANGED'||code==='INVALID_TRANSITION'||code==='EVENT_ID_COLLISION'){
        draft.locked=true;
        try {await reread();readError=false;}catch(_){readError=true;}
      }else draft.error=errorKey(code);
      return false;
    } finally {
      if (useDatabaseInvoices) {
        let invoices=null;
        try {invoices=await readInvoices();}catch(_){readError=true;}
        busy=false;rebuild(invoices);
      } else {busy=false;rebuild();}
    }
  }
  root.WFProcurementFollowup = Object.freeze({open,refresh,hasUnsavedChanges});
})(typeof window!=='undefined'?window:globalThis);
