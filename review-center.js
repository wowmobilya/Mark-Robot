/* Read-only follow-up from saved invoices and the explicit reprint audit. */
(function(root){
 'use strict';
 const own=(value,key)=>Object.prototype.hasOwnProperty.call(value||{},key);
 const string=value=>typeof value==='string'||typeof value==='number'?String(value):'';
 function prepareContext(state){
  const products=new Map();
  for(const product of Array.isArray(state?.products)?state.products:[])if(product?.id!=null&&!products.has(String(product.id)))products.set(String(product.id),product);
  return {settings:state?.settings||{},products};
 }
 function inspectInvoice(invoice,context,core,sourceHelpers){
  const valid=invoice&&typeof invoice==='object'&&!Array.isArray(invoice),record=valid?invoice:{};
  const source=valid?sourceHelpers.resolveInvoiceSource({invoices:[record],settings:context.settings},record.id):{invoice,companyLogo:''};
  const historical=!!record.archived||own(record,'packageLabelSnapshot');
  const products=[];
  if(!historical){
   const seen=new Set();
   for(const line of Array.isArray(record.items)?record.items:[]){const id=string(line?.productId??line?.itemId);if(!seen.has(id)&&context.products.has(id)){seen.add(id);products.push(context.products.get(id));}}
  }
  const model=core.normalizeInvoice(source.invoice,{companyLogo:source.companyLogo,products});
  const inspected=core.inspectLabelBatch(model);
  // The label workspace treats a supplied but unsafe image as a print blocker.
  const issues=inspected.issues.map(issue=>issue.code==='unsafeImage'?{...issue,severity:'error'}:issue);
  if(!issues.length)return null;
  return {kind:issues.some(issue=>issue.severity==='error')?'blocked':'optional',invoiceId:record.id??null,
   invoiceNumber:string(record.invNo||record.name),customerName:string(record.companyName||record.buyerName),archived:!!record.archived,issues};
 }
 function pendingEntries(entries){
  if(!Array.isArray(entries))throw new Error('INVALID_HISTORY');
  return entries.filter(entry=>entry?.status==='requested'||entry?.status==='awaiting_confirmation')
   .map(entry=>({kind:'pending',requestId:entry.id,invoiceId:entry.invoiceId,invoiceNumber:string(entry.invoiceNumber),customerName:string(entry.customerName),selectedLabelCount:entry.selectedLabelCount,status:entry.status}));
 }
 const helpers=Object.freeze({prepareContext,inspectInvoice,pendingEntries});
 if(typeof module==='object'&&module.exports){module.exports=helpers;return;}
 const ops=root.WFOperations,core=root.WFPackageLabelCore,sourceHelpers=root.WFPackageLabelHelpers;
 if(!ops||!core?.inspectLabelBatch||!sourceHelpers||root.WFReviewCenter)return;
 const locales=['ar','en','tr','fr','ru'];
 const copy={
  title:['مركز المتابعة','Review center','Kontrol merkezi','Centre de suivi','Центр проверки'],
  subtitle:['تأكيدات الطباعة ومراجعة بيانات الفواتير المحفوظة','Print confirmations and saved invoice data to review','Baskı onayları ve kayıtlı fatura kontrolleri','Confirmations d’impression et données de factures à vérifier','Подтверждения печати и проверка сохранённых счетов'],
  all:['كل المتابعات','All follow-up','Tüm kontroller','Tout le suivi','Все проверки'],
  pending:['طلبات طباعة معلّقة','Pending print requests','Bekleyen baskı istekleri','Demandes d’impression en attente','Ожидающие запросы печати'],
  blocked:['فواتير تحتاج تصحيح الملصقات','Invoices with label blockers','Etiket verisi düzeltilmesi gereken faturalar','Factures avec des erreurs d’étiquettes','Счета с ошибками данных этикеток'],
  optional:['فواتير ببيانات اختيارية ناقصة','Invoices with optional details missing','İsteğe bağlı bilgisi eksik faturalar','Factures avec des détails facultatifs manquants','Счета без необязательных сведений'],
  note:['المتابعة تقرأ البيانات فقط. ملاحظات البيانات الاختيارية لا تمنع الطباعة.','This view reads saved data only. Optional details do not block printing.','Bu görünüm kayıtlı verileri yalnızca okur. İsteğe bağlı bilgiler baskıyı engellemez.','Cette vue lit uniquement les données enregistrées. Les détails facultatifs ne bloquent pas l’impression.','Здесь только читаются сохранённые данные. Необязательные сведения не мешают печати.'],
  pendingNote:['لا يُثبت إغلاق نافذة الطباعة خروج الورق؛ راجع الطلب في السجل.','Closing the print dialog does not confirm paper output; review the request in history.','Baskı penceresinin kapanması kâğıt çıktısını doğrulamaz; isteği geçmişten kontrol edin.','Fermer la fenêtre d’impression ne confirme pas la sortie papier ; vérifiez la demande dans l’historique.','Закрытие окна печати не подтверждает выход бумаги; проверьте запрос в истории.'],
  refresh:['تحديث المتابعة','Refresh review','Kontrolleri yenile','Actualiser le suivi','Обновить проверку'],
  history:['سجل إعادة الطباعة','Reprint history','Yeniden baskı geçmişi','Historique des réimpressions','История повторной печати'],
  openInvoice:['معاينة الفاتورة','Preview invoice','Faturayı önizle','Aperçu de la facture','Просмотр счёта'],
  labels:['مراجعة الملصقات','Review labels','Etiketleri kontrol et','Vérifier les étiquettes','Проверить этикетки'],
  reviewRequest:['مراجعة الطلب','Review request','İsteği kontrol et','Vérifier la demande','Проверить запрос'],
  archived:['مؤرشفة','Archived','Arşivlenmiş','Archivée','В архиве'],
  unnamed:['رقم الفاتورة غير مسجل','Invoice number unavailable','Fatura numarası kayıtlı değil','Numéro de facture inconnu','Номер счёта отсутствует'],
  loading:['جارٍ مراجعة البيانات…','Reviewing saved data…','Kayıtlı veriler kontrol ediliyor…','Vérification des données…','Проверка сохранённых данных…'],
  failed:['تعذّرت قراءة المتابعة. حدّث للمحاولة مجددًا.','Could not read the review. Refresh to try again.','Kontroller okunamadı. Yenileyerek tekrar deneyin.','Impossible de lire le suivi. Actualisez pour réessayer.','Не удалось выполнить проверку. Обновите и повторите.'],
  historyFailed:['تعذّرت قراءة سجل الطباعة؛ عدد الطلبات المعلقة غير متاح.','Print history could not be read; the pending count is unavailable.','Baskı geçmişi okunamadı; bekleyen istek sayısı bilinmiyor.','L’historique est illisible ; le nombre de demandes en attente est indisponible.','История печати недоступна; число ожидающих запросов неизвестно.'],
  empty:['لا توجد متابعات ضمن هذا القسم.','No follow-up in this section.','Bu bölümde kontrol edilecek kayıt yok.','Aucun suivi dans cette rubrique.','В этом разделе нет записей для проверки.'],
  missing:['السجل لم يعد متاحًا. حدّث القائمة.','This record is no longer available. Refresh the list.','Kayıt artık yok. Listeyi yenileyin.','Cet enregistrement n’est plus disponible. Actualisez la liste.','Запись больше недоступна. Обновите список.'],
  more:['عرض المزيد','Show more','Daha fazla göster','Afficher plus','Показать ещё'],
  showing:['عرض {shown} من {total}','Showing {shown} of {total}','{total} kayıttan {shown} gösteriliyor','{shown} sur {total} affichés','Показано {shown} из {total}'],
  labelCount:['{count} ملصق','{count} labels','{count} etiket','{count} étiquettes','Этикетки: {count}'],
  missingInvoice:['بيانات الفاتورة غير قابلة للقراءة','Invoice data cannot be read','Fatura verisi okunamıyor','Données de facture illisibles','Данные счёта не читаются'],
  missingInvoiceNumber:['رقم الفاتورة ناقص','Invoice number is missing','Fatura numarası eksik','Numéro de facture manquant','Нет номера счёта'],
  emptyInvoice:['الفاتورة لا تحتوي منتجات','Invoice has no products','Faturada ürün yok','Facture sans produits','В счёте нет товаров'],
  missingProduct:['بيانات المنتج المحفوظة غير متوفرة','Saved product data is unavailable','Kayıtlı ürün verisi yok','Données du produit enregistré indisponibles','Нет сохранённых данных товара'],
  missingName:['اسم منتج ناقص','Product name is missing','Ürün adı eksik','Nom du produit manquant','Нет названия товара'],
  invalidQuantity:['كمية منتج غير صالحة','Invalid product quantity','Geçersiz ürün miktarı','Quantité de produit invalide','Неверное количество товара'],
  invalidPackets:['عدد طرود غير صالح','Invalid package count','Geçersiz paket sayısı','Nombre de colis invalide','Неверное количество упаковок'],
  tooManyLabels:['عدد الملصقات يتجاوز حد الدفعة','Label count exceeds the batch limit','Etiket sayısı parti sınırını aşıyor','Nombre d’étiquettes supérieur à la limite du lot','Число этикеток превышает лимит партии'],
  unsupportedBarcode:['اسم منتج لا يدعمه الباركود الحالي','Product name is unsupported by this barcode','Ürün adı bu barkodda desteklenmiyor','Nom du produit non pris en charge par ce code-barres','Название товара не поддерживается этим штрихкодом'],
  missingType:['نوع منتج غير محفوظ','Product type is not saved','Ürün türü kayıtlı değil','Type de produit non enregistré','Тип товара не сохранён'],
  missingImage:['صورة منتج غير محفوظة','Product image is not saved','Ürün görseli kayıtlı değil','Image du produit non enregistrée','Изображение товара не сохранено'],
  unsafeImage:['عنوان صورة غير مدعوم','Unsupported image address','Desteklenmeyen görsel adresi','Adresse d’image non prise en charge','Неподдерживаемый адрес изображения'],
  assumedPackets:['عدد الطرود غير محفوظ؛ يستخدم الملصق طردًا واحدًا','Package count is not saved; labels use one package','Paket sayısı kayıtlı değil; etikette bir paket kullanılır','Nombre de colis non enregistré ; les étiquettes utilisent un colis','Число упаковок не сохранено; используется одна упаковка']
 };
 const text=(key,values={})=>(copy[key]||copy.failed)[Math.max(0,locales.indexOf(ops.locale()))].replace(/\{(\w+)\}/g,(_,name)=>values[name]??'');
 const titles=key=>Object.fromEntries(locales.map((lang,i)=>[lang,copy[key][i]]));
 const make=ops.make,route='review-center',bound=[],filters=new Map();
 let shell,list,status,total,more,refreshButton,rows=[],counts=null,filter='all',limit=30,revision=0,historyError=false;
 const fixed=(tag,cls,key)=>{const node=make(tag,cls,text(key));bound.push([node,key]);return node;};
 const format=value=>new Intl.NumberFormat(ops.locale()||'en').format(value);
 function button(key,action,primary=false,persistent=false){const node=make('button','btn '+(primary?'btn-p':'btn-s'));node.type='button';node.append(persistent?fixed('span','',key):make('span','',text(key)));node.addEventListener('click',action);return node;}
 function currentInvoice(id){return (ops.state().invoices||[]).find(row=>row?.id!=null&&String(row.id)===String(id));}
 function action(row,kind){
  root.WFTouchKeyboard?.close?.('navigation',false);
  if(kind==='history'){root.WFLabelReprintHistory?.open(row?.invoiceId);return;}
  const invoice=currentInvoice(row.invoiceId);if(!invoice){ops.notify?.(text('missing'),'in');refresh();return;}
  if(kind==='preview')root.previewSaved?.(invoice.id);
  else root.WFPackageLabels?.open(invoice.id);
 }
 function render(){
  for(const [key,{count,button:control}]of filters){count.textContent=counts&&counts[key]!=null?format(counts[key]):'—';control.setAttribute('aria-pressed',String(filter===key));control.setAttribute('aria-label',text(key)+': '+count.textContent);}
  const selected=filter==='all'?rows:rows.filter(row=>row.kind===filter);
  list.replaceChildren();
  for(const row of selected.slice(0,limit)){
   const card=make('article','wf-ops-card wf-review-item');card.dataset.kind=row.kind;
   const heading=make('div','wf-review-item-heading');heading.append(make('span','wf-review-kind',text(row.kind)),make('h2','',row.invoiceNumber||text('unnamed')));
   if(row.archived)heading.append(make('span','wf-review-archived',text('archived')));
   card.append(heading);if(row.customerName)card.append(make('p','wf-review-client',row.customerName));
   if(row.kind==='pending'){
    card.append(make('p','',text('labelCount',{count:format(row.selectedLabelCount)})),make('p','wf-ops-muted',text('pendingNote')));
   }else{
    const issues=make('ul','wf-review-issues'),summary=new Map();
    for(const issue of row.issues)summary.set(issue.code,(summary.get(issue.code)||0)+1);
    for(const [code,count]of summary)issues.append(make('li','',text(code)+(count>1?' · '+format(count):'')));
    card.append(issues);
   }
   const actions=make('div','wf-ops-row wf-review-actions');
   const add=(key,kind,available,primary=false)=>{const item=button(key,()=>action(row,kind),primary);item.disabled=!available;actions.append(item);};
   if(row.kind==='pending')add('reviewRequest','history',!!root.WFLabelReprintHistory?.open,true);
   else add('labels','labels',row.invoiceId!=null&&!!root.WFPackageLabels?.open,true);
   add('openInvoice','preview',row.invoiceId!=null&&typeof root.previewSaved==='function');
   card.append(actions);list.append(card);
  }
  if(!selected.length)list.append(make('p','wf-ops-card wf-ops-empty',text(historyError&&(filter==='all'||filter==='pending')?'historyFailed':'empty')));
  more.hidden=selected.length<=limit;
  total.textContent=text('showing',{shown:format(Math.min(limit,selected.length)),total:format(selected.length)});
  status.hidden=!historyError;status.textContent=historyError?text('historyFailed'):'';
 }
 async function refresh(){
  if(!shell.page.classList.contains('active'))return;
  const token=++revision,state=ops.state(),invoices=Array.isArray(state.invoices)?state.invoices.slice():[],context=prepareContext(state),next=[];
  refreshButton.disabled=true;list.setAttribute('aria-busy','true');status.hidden=false;status.textContent=text('loading');
  let auditError=false;
  try{
   try{if(!root.WFLabelReprintHistory?.getEntries)throw new Error('HISTORY_UNAVAILABLE');next.push(...pendingEntries(root.WFLabelReprintHistory.getEntries()));}catch(_){auditError=true;}
   for(let i=0;i<invoices.length;i++){
    if(token!==revision||!shell.page.classList.contains('active'))return;
    const row=inspectInvoice(invoices[i],context,core,sourceHelpers);if(row)next.push(row);
    if(i&&i%40===0)await new Promise(resolve=>root.requestAnimationFrame(resolve));
   }
   if(token!==revision)return;
   rows=next;historyError=auditError;counts={all:auditError?null:rows.length,pending:auditError?null:rows.filter(row=>row.kind==='pending').length,blocked:rows.filter(row=>row.kind==='blocked').length,optional:rows.filter(row=>row.kind==='optional').length};
   render();
  }catch(_){if(token!==revision)return;rows=[];counts=null;historyError=false;render();status.hidden=false;status.textContent=text('failed');}
  finally{if(token===revision){refreshButton.disabled=false;list.setAttribute('aria-busy','false');}}
 }
 function translate(){for(const [node,key]of bound)node.textContent=text(key);overview.setAttribute('aria-label',text('all'));if(list)render();}
 shell=ops.register({id:route,parent:'invoices',title:titles('title'),subtitle:titles('subtitle'),onEnter:refresh,onLanguage:translate});
 refreshButton=button('refresh',refresh,false,true);refreshButton.id='wfReviewRefresh';shell.actions.append(refreshButton,button('history',()=>action(null,'history'),false,true));
 const overview=make('div','wf-review-overview');overview.setAttribute('role','group');overview.setAttribute('aria-label',text('all'));
 for(const key of ['all','pending','blocked','optional']){const control=make('button','wf-review-summary');control.type='button';control.dataset.filter=key;const count=make('strong','','—');control.append(count,fixed('span','',key));control.addEventListener('click',()=>{filter=key;limit=30;render();});overview.append(control);filters.set(key,{button:control,count});}
 status=make('p','wf-ops-status');status.id='wfReviewStatus';status.setAttribute('role','status');status.hidden=true;
 total=make('p','wf-ops-muted wf-review-total');list=make('div','wf-review-results');list.id='wfReviewResults';
 more=button('more',()=>{limit+=30;render();},false,true);more.hidden=true;
 shell.body.append(overview,fixed('p','wf-ops-muted','note'),status,total,list,more);
 root.addEventListener('wf-label-reprint-history-change',()=>{if(shell.page.classList.contains('active'))refresh();});
 root.WFReviewCenter=Object.freeze({open:()=>ops.open(route),refresh});
})(typeof window==='object'?window:globalThis);
