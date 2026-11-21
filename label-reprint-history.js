/* Persistent reprint report. Native afterprint is only a dialog-close signal. */
(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) module.exports = factory;
  else root.WFLabelReprintHistory = factory(root,root.WFLabelReprintHistoryCore);
})(typeof window === 'object' ? window : globalThis, function (root,core) {
  'use strict';
  const ops=root.WFOperations,document=root.document;
  if (!core || !ops || !document) return null;
  const copy={
    ar:{title:'سجل الطباعة',subtitle:'طلبات إعادة طباعة الملصقات ونتائجها المؤكدة',inline:'سجل إعادة طباعة الملصقات',description:'أعداد هذا السجل تخص إعادة الطباعة فقط. تُسجّل النتيجة بعد تأكيد المستخدم.',empty:'لا توجد طلبات إعادة طباعة مسجلة.',noMatch:'لا توجد طلبات تطابق البحث.',search:'رقم الفاتورة أو اسم العميل',filter:'حالة الطلب',all:'كل الحالات',pending:'بانتظار التأكيد',requested:'طلب مسجّل',awaiting_confirmation:'بانتظار تأكيد النتيجة',printed:'طباعة مؤكدة',cancelled:'أُلغيت',failed:'تعذّرت الطباعة',requests:'طلبات إعادة الطباعة',printedLabels:'ملصقات مؤكدة الطباعة',pendingCount:'طلبات غير مؤكدة',confirmTitle:'ما نتيجة إعادة الطباعة؟',confirmHint:'إغلاق نافذة الطباعة لا يؤكد خروج الملصقات من الطابعة.',confirmPrinted:'تمت الطباعة',confirmCancelled:'أُلغيت',saved:'حُفظت نتيجة الطباعة.',saving:'جارٍ الحفظ…',saveError:'تعذّر حفظ السجل. يبقى الطلب غير مؤكد حتى حفظ النتيجة.',readError:'تعذّرت قراءة سجل الطباعة.',capacity:'السجل ممتلئ بطلبات غير مؤكدة. راجع نتائج الطلبات السابقة أولًا.',more:'عرض المزيد',pendingMore:'عرض كل الطلبات غير المؤكدة',invoice:'الفاتورة',customer:'العميل',date:'وقت الطلب',reason:'سبب إعادة الطباعة',lost:'ملصق مفقود',damaged:'تلف الملصق',other:'سبب آخر',paper:'ورق الملصقات',original:'عدد الملصقات الأصلي',selected:'الملصقات المختارة',operator:'الشخص المخوّل في الإعدادات',sequence:'الترتيب الأصلي',product:'المنتج',color:'اللون',packet:'الطرد',unit:'النسخة',labels:'ملصق',unknown:'غير مسجل',events:'تسلسل الطلب',event_requested:'سُجّل طلب إعادة الطباعة',event_dialog_closed:'أُغلقت نافذة الطباعة',event_printed:'أكد المستخدم اكتمال الطباعة',event_cancelled:'أكد المستخدم إلغاء الطباعة',event_failed:'تعذّر تشغيل الطباعة',retention:'يعرض السجل أحدث الطلبات المحفوظة؛ لا تُحذف الطلبات غير المؤكدة.',viewAll:'فتح سجل الطباعة',clearInvoice:'عرض كل الفواتير'},
    tr:{title:'Yazdırma geçmişi',subtitle:'Etiket yeniden yazdırma talepleri ve doğrulanan sonuçları',inline:'Etiket yeniden yazdırma geçmişi',description:'Buradaki sayılar yalnızca yeniden yazdırma içindir. Sonuç kullanıcı onayından sonra kaydedilir.',empty:'Kayıtlı yeniden yazdırma talebi yok.',noMatch:'Aramayla eşleşen talep yok.',search:'Fatura numarası veya müşteri',filter:'Talep durumu',all:'Tüm durumlar',pending:'Onay bekliyor',requested:'Talep kaydedildi',awaiting_confirmation:'Sonuç onayı bekliyor',printed:'Yazdırma doğrulandı',cancelled:'İptal edildi',failed:'Yazdırılamadı',requests:'Yeniden yazdırma talepleri',printedLabels:'Yazdırıldığı doğrulanan etiketler',pendingCount:'Onaylanmamış talepler',confirmTitle:'Yeniden yazdırma sonucu nedir?',confirmHint:'Yazdırma penceresinin kapanması etiketlerin basıldığını doğrulamaz.',confirmPrinted:'Yazdırıldı',confirmCancelled:'İptal edildi',saved:'Yazdırma sonucu kaydedildi.',saving:'Kaydediliyor…',saveError:'Kayıt kaydedilemedi. Sonuç kaydedilene kadar talep onaysız kalır.',readError:'Yazdırma geçmişi okunamadı.',capacity:'Geçmiş onaylanmamış taleplerle dolu. Önce eski sonuçları kontrol edin.',more:'Daha fazla göster',pendingMore:'Onay bekleyen tüm talepler',invoice:'Fatura',customer:'Müşteri',date:'Talep zamanı',reason:'Yeniden yazdırma nedeni',lost:'Kayıp veya eksik',damaged:'Hasarlı etiket',other:'Diğer neden',paper:'Etiket kâğıdı',original:'Asıl etiket sayısı',selected:'Seçilen etiketler',operator:'Ayarlardaki yetkili kişi',sequence:'Asıl sıra',product:'Ürün',color:'Renk',packet:'Koli',unit:'Kopya',labels:'etiket',unknown:'Kayıtlı değil',events:'Talep geçmişi',event_requested:'Yeniden yazdırma talebi kaydedildi',event_dialog_closed:'Yazdırma penceresi kapandı',event_printed:'Kullanıcı yazdırmayı doğruladı',event_cancelled:'Kullanıcı iptali doğruladı',event_failed:'Yazdırma başlatılamadı',retention:'Son kaydedilen talepler gösterilir; onaylanmamış talepler silinmez.',viewAll:'Yazdırma geçmişini aç',clearInvoice:'Tüm faturaları göster'},
    en:{title:'Print history',subtitle:'Label reprint requests and their confirmed outcomes',inline:'Label reprint history',description:'These counts cover reprints only. An outcome is recorded after the user confirms it.',empty:'No label reprint requests recorded.',noMatch:'No requests match your search.',search:'Invoice number or customer',filter:'Request status',all:'All statuses',pending:'Awaiting confirmation',requested:'Request recorded',awaiting_confirmation:'Awaiting outcome confirmation',printed:'Printing confirmed',cancelled:'Cancelled',failed:'Printing failed',requests:'Reprint requests',printedLabels:'Labels confirmed printed',pendingCount:'Unconfirmed requests',confirmTitle:'What was the reprint outcome?',confirmHint:'Closing the print dialog does not confirm that labels were physically printed.',confirmPrinted:'Printed',confirmCancelled:'Cancelled',saved:'Print outcome saved.',saving:'Saving…',saveError:'The record could not be saved. The request stays unconfirmed until its outcome is saved.',readError:'Print history could not be read.',capacity:'History is full of unconfirmed requests. Review earlier outcomes first.',more:'Show more',pendingMore:'View all unconfirmed requests',invoice:'Invoice',customer:'Customer',date:'Requested at',reason:'Reprint reason',lost:'Lost or missing',damaged:'Damaged label',other:'Other reason',paper:'Label stock',original:'Original label count',selected:'Selected labels',operator:'Authorized person in settings',sequence:'Original position',product:'Product',color:'Color',packet:'Package',unit:'Copy',labels:'labels',unknown:'Not recorded',events:'Request timeline',event_requested:'Reprint request recorded',event_dialog_closed:'Print dialog closed',event_printed:'User confirmed printing',event_cancelled:'User confirmed cancellation',event_failed:'Printing could not start',retention:'The report shows recent saved requests; unconfirmed requests are never removed.',viewAll:'Open print history',clearInvoice:'Show all invoices'},
    fr:{title:'Historique d’impression',subtitle:'Demandes de réimpression d’étiquettes et résultats confirmés',inline:'Historique de réimpression des étiquettes',description:'Ces nombres concernent uniquement les réimpressions. Le résultat est enregistré après confirmation de l’utilisateur.',empty:'Aucune demande de réimpression enregistrée.',noMatch:'Aucune demande ne correspond à la recherche.',search:'Numéro de facture ou client',filter:'État de la demande',all:'Tous les états',pending:'En attente de confirmation',requested:'Demande enregistrée',awaiting_confirmation:'Résultat à confirmer',printed:'Impression confirmée',cancelled:'Annulée',failed:'Échec d’impression',requests:'Demandes de réimpression',printedLabels:'Étiquettes confirmées imprimées',pendingCount:'Demandes non confirmées',confirmTitle:'Quel est le résultat de la réimpression ?',confirmHint:'Fermer la fenêtre d’impression ne confirme pas que les étiquettes ont été imprimées.',confirmPrinted:'Imprimées',confirmCancelled:'Annulée',saved:'Résultat enregistré.',saving:'Enregistrement…',saveError:'Impossible d’enregistrer. La demande reste non confirmée jusqu’à l’enregistrement du résultat.',readError:'Impossible de lire l’historique d’impression.',capacity:'L’historique est plein de demandes non confirmées. Vérifiez d’abord les résultats précédents.',more:'Afficher plus',pendingMore:'Voir toutes les demandes non confirmées',invoice:'Facture',customer:'Client',date:'Date de la demande',reason:'Motif de réimpression',lost:'Perte ou manque',damaged:'Étiquette endommagée',other:'Autre motif',paper:'Support d’étiquettes',original:'Nombre initial d’étiquettes',selected:'Étiquettes sélectionnées',operator:'Personne autorisée dans les paramètres',sequence:'Position initiale',product:'Produit',color:'Couleur',packet:'Colis',unit:'Exemplaire',labels:'étiquettes',unknown:'Non renseigné',events:'Chronologie de la demande',event_requested:'Demande de réimpression enregistrée',event_dialog_closed:'Fenêtre d’impression fermée',event_printed:'Impression confirmée par l’utilisateur',event_cancelled:'Annulation confirmée par l’utilisateur',event_failed:'Impossible de lancer l’impression',retention:'Le rapport affiche les demandes récentes enregistrées ; les demandes non confirmées sont conservées.',viewAll:'Ouvrir l’historique d’impression',clearInvoice:'Afficher toutes les factures'},
    ru:{title:'История печати',subtitle:'Запросы на повторную печать этикеток и подтверждённые результаты',inline:'История повторной печати этикеток',description:'Эти числа относятся только к повторной печати. Результат сохраняется после подтверждения пользователем.',empty:'Запросов на повторную печать нет.',noMatch:'По вашему запросу ничего не найдено.',search:'Номер счёта или клиент',filter:'Статус запроса',all:'Все статусы',pending:'Ожидает подтверждения',requested:'Запрос сохранён',awaiting_confirmation:'Ожидает подтверждения результата',printed:'Печать подтверждена',cancelled:'Отменено',failed:'Ошибка печати',requests:'Запросы на повторную печать',printedLabels:'Подтверждённые напечатанные этикетки',pendingCount:'Неподтверждённые запросы',confirmTitle:'Каков результат повторной печати?',confirmHint:'Закрытие окна печати не подтверждает, что этикетки были напечатаны.',confirmPrinted:'Напечатано',confirmCancelled:'Отменено',saved:'Результат печати сохранён.',saving:'Сохранение…',saveError:'Не удалось сохранить запись. Запрос остаётся неподтверждённым до сохранения результата.',readError:'Не удалось прочитать историю печати.',capacity:'История заполнена неподтверждёнными запросами. Сначала проверьте предыдущие результаты.',more:'Показать ещё',pendingMore:'Все неподтверждённые запросы',invoice:'Счёт',customer:'Клиент',date:'Время запроса',reason:'Причина повторной печати',lost:'Потеря или нехватка',damaged:'Повреждённая этикетка',other:'Другая причина',paper:'Бумага для этикеток',original:'Исходное число этикеток',selected:'Выбранные этикетки',operator:'Уполномоченное лицо в настройках',sequence:'Исходная позиция',product:'Товар',color:'Цвет',packet:'Упаковка',unit:'Экземпляр',labels:'этикеток',unknown:'Не указано',events:'История запроса',event_requested:'Запрос на повторную печать сохранён',event_dialog_closed:'Окно печати закрыто',event_printed:'Пользователь подтвердил печать',event_cancelled:'Пользователь подтвердил отмену',event_failed:'Не удалось начать печать',retention:'Показаны последние сохранённые запросы; неподтверждённые запросы не удаляются.',viewAll:'Открыть историю печати',clearInvoice:'Показать все счета'}
  };
  const views=new Map(),active=new Set(),busy=new Set(),errors=new Map();
  let page=null,pageHost=null,cachedHistory=Symbol('unread'),cachedEntries=Object.freeze([]),fallbackId=0;
  const locale=()=>Object.hasOwn(copy,ops.locale())?ops.locale():'ar';
  const t=key=>copy[locale()][key] || key;
  const state=()=>ops.state() || {};
  const make=(tag,className,text)=>{const node=document.createElement(tag);if(className)node.className=className;if(text!==undefined)node.textContent=String(text);return node;};
  const button=(text,callback,className='btn btn-s')=>{const node=make('button',className,text);node.type='button';node.addEventListener('click',callback);return node;};
  const normalized=value=>String(value??'').normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/[٠-٩]/g,digit=>String(digit.charCodeAt(0)-1632)).replace(/[۰-۹]/g,digit=>String(digit.charCodeAt(0)-1776)).trim();
  const pending=row=>row.status==='requested'||row.status==='awaiting_confirmation';
  const actor=()=>{const name=state().settings?.authPerson;return typeof name==='string'&&name.trim()?{name,source:'settings.authPerson'}:null;};
  function formatTime(value){try{return new Intl.DateTimeFormat(locale(),{dateStyle:'medium',timeStyle:'short'}).format(new Date(value));}catch(_){return String(value||t('unknown'));}}
  function getEntries(options={}){
    const current=state().settings?.[core.field];
    if(current!==cachedHistory){cachedEntries=Object.freeze(core.filter(state().settings));cachedHistory=current;}
    const query=normalized(options.query);
    return Object.freeze(cachedEntries.filter(row=>(options.invoiceId==null||row.invoiceId===String(options.invoiceId))&&
      (!options.status||options.status==='all'||(options.status==='pending'?pending(row):row.status===options.status))&&
      (!query||normalized([row.invoiceId,row.invoiceNumber,row.customerName].join(' ')).includes(query))));
  }
  function getSummary(){return core.summary(getEntries());}
  function refresh(force=true){for(const view of views.values())render(view,force);}
  function publish(history){
    const current=state(),saved=current.settings?.[core.field];
    if(!saved||saved.revision<=history.revision)current.settings={...(current.settings||{}),[core.field]:history};
    refresh();
    try{root.dispatchEvent?.(new root.CustomEvent('wf-label-reprint-history-change',{detail:{revision:history.revision}}));}catch(_){}
  }
  function errorKey(cause){return cause?.message==='HISTORY_CAPACITY'?'capacity':cause?.message==='INVALID_HISTORY'?'readError':'saveError';}
  async function commit(intent,invoiceId){
    try{
      const row=await core.commit(intent,{writeBatch:operations=>root.wfWriteBatch(operations),publish});
      errors.delete(String(invoiceId));refresh();return row;
    }catch(cause){errors.set(String(invoiceId),errorKey(cause));refresh();throw cause;}
  }
  async function recordRequested(job,options={}){
    const invoiceId=String(job?.invoiceId??'');
    let id;
    try{
      id=String(root.wfNewRecordId?.()||root.crypto?.randomUUID?.()||Date.now().toString(36)+'_'+(++fallbackId)+'_'+Math.random().toString(36).slice(2));
      const request=core.createRequest(job,{...options,id,now:new Date().toISOString(),operator:actor()});
      active.add(id);
      await commit({type:'request',request},invoiceId);
      return id;
    }catch(cause){if(id)active.delete(id);errors.set(invoiceId,errorKey(cause));refresh();throw cause;}
  }
  async function recordOutcome(id,type,message){
    active.delete(id);
    const row=getEntries().find(entry=>entry.id===id);
    return commit({type:'event',id,event:{type,at:new Date().toISOString(),operator:actor(),message}},row?.invoiceId??'');
  }
  function recordDialogClosed(id){return recordOutcome(id,'dialog_closed');}
  function recordFailed(id,message){return recordOutcome(id,'failed',String(message||'').slice(0,500));}
  async function confirm(id,outcome,view){
    if(busy.has(id))return;
    busy.add(id);render(view,true);
    try{await recordOutcome(id,outcome);view.noticeKey='saved';}
    catch(_){/* commit already exposes the save error without inventing a result. */}
    finally{busy.delete(id);render(view,true);view.notice.focus?.({preventScroll:true});}
  }
  function mount(host,options={}){
    if(!host)return null;
    let view=views.get(host);
    if(!view){
      host.className=((host.className||'')+' wf-label-history').trim();
      const notice=make('p','wf-label-history-notice');notice.setAttribute('role','status');notice.setAttribute('aria-live','polite');notice.tabIndex=-1;
      const pendingBox=make('section','wf-label-history-pending');
      const report=make('details','wf-label-history-report wf-ops-card');
      const heading=make('summary','wf-label-history-heading'),title=make('strong'),badge=make('span','wf-label-history-badge');heading.append(title,badge);
      const description=make('p','wf-ops-muted'),metrics=make('div','wf-label-history-metrics'),list=make('div','wf-label-history-list'),empty=make('p','wf-ops-muted');
      const more=button('',()=>{view.limit+=20;render(view,true);}),all=button('',()=>open(view.invoiceId));
      const retention=make('p','wf-label-history-retention');
      const footer=make('div','wf-label-history-footer');footer.append(more,all);
      report.append(heading,description,metrics,empty,list,footer,retention);host.append(notice,pendingBox,report);
      view={host,notice,pendingBox,report,title,badge,description,metrics,list,empty,more,all,retention,limit:20,expanded:new Set(),labelLimits:new Map(),query:'',status:'all',lastHistory:undefined,lastLang:'',noticeKey:''};
      views.set(host,view);
    }
    const nextId=options.invoiceId==null?null:String(options.invoiceId),isAll=!!options.all;
    if(view.invoiceId!==nextId||view.isAll!==isAll){view.invoiceId=nextId;view.isAll=isAll;view.limit=20;view.lastLang='';}
    host.hidden=!isAll&&!nextId;
    if(isAll)view.report.open=true;
    render(view,false);return view;
  }
  function reportCard(record,view){
    const card=make('details','wf-label-history-record');card.dataset.wfReprintRecord=record.id;card.open=view.expanded.has(record.id);
    const heading=make('summary','wf-label-history-record-heading');
    const identity=make('span','wf-label-history-record-identity');identity.append(make('strong','',record.invoiceNumber||t('unknown')),make('span','',record.customerName||t('unknown')));
    const time=make('time','',formatTime(record.requestedAt));time.dateTime=record.requestedAt;
    const count=make('span','',record.selectedLabelCount+' '+t('labels'));
    const status=make('span','wf-label-history-status',t(record.status));status.dataset.status=record.status;
    heading.append(identity,time,count,status);
    const content=make('div','wf-label-history-record-body');card.append(heading,content);
    card.addEventListener('toggle',()=>{
      if(card.open){view.expanded.add(record.id);if(!content.children.length)fillDetails(content,record,view);}
      else view.expanded.delete(record.id);
    });
    if(card.open)fillDetails(content,record,view);
    return card;
  }
  function fillDetails(container,record,view){
    container.replaceChildren();
    const meta=make('dl','wf-label-history-meta');
    const paper=record.paperProfile||{},dimensions=paper.stockWidthMM&&paper.stockHeightMM?` · ${paper.stockWidthMM} × ${paper.stockHeightMM} mm`:'';
    const pairs=[['invoice',record.invoiceNumber],['customer',record.customerName],['date',formatTime(record.requestedAt)],['reason',t(record.reason)+(record.reasonNote?' · '+record.reasonNote:'')],['paper',(paper.name||record.profileId)+dimensions],['original',record.originalLabelCount],['selected',record.selectedLabelCount]];
    if(record.operator?.name)pairs.push(['operator',record.operator.name]);
    for(const [key,value] of pairs){const item=make('div');item.append(make('dt','',t(key)),make('dd','',value??t('unknown')));meta.append(item);}
    const scroll=make('div','wf-label-history-table-scroll');
    const table=make('table','wf-label-history-table'),caption=make('caption','',t('selected')),thead=make('thead'),head=make('tr'),tbody=make('tbody');
    for(const key of ['sequence','product','color','packet','unit']){const th=make('th','',t(key));th.setAttribute('scope','col');head.append(th);}thead.append(head);
    const limit=view.labelLimits.get(record.id)||50;
    for(const label of record.labels.slice(0,limit)){
      const row=make('tr');row.append(make('td','',label.sequenceNumber));
      const product=make('td','',label.name||t('unknown'));if(label.barcodeText)product.append(make('small','wf-label-history-barcode',label.barcodeText));
      row.append(product,make('td','',label.color||t('unknown')),make('td','',label.currentPacket+' / '+label.totalPackets),make('td','',label.unitIndex+(label.quantity?' / '+label.quantity:'')));tbody.append(row);
    }
    table.append(caption,thead,tbody);scroll.append(table);container.append(meta,scroll);
    if(record.labels.length>limit)container.append(button(t('more')+' ('+limit+' / '+record.labels.length+')',()=>{view.labelLimits.set(record.id,limit+50);fillDetails(container,record,view);}));
    const events=make('ol','wf-label-history-events');events.setAttribute('aria-label',t('events'));
    for(const event of record.events)events.append(make('li','',t('event_'+event.type)+' · '+formatTime(event.at)));
    container.append(events);
    if(pending(record)&&!active.has(record.id))container.append(confirmationActions(record,view));
  }
  function confirmationActions(record,view){
    const actions=make('div','wf-label-history-confirm-actions');
    for(const outcome of ['printed','cancelled']){
      const control=button(t(outcome==='printed'?'confirmPrinted':'confirmCancelled'),()=>confirm(record.id,outcome,view),outcome==='printed'?'btn btn-p':'btn btn-s');
      control.dataset.wfReprintConfirm=outcome;control.dataset.wfReprintId=record.id;control.disabled=busy.has(record.id);actions.append(control);
    }
    return actions;
  }
  function renderPending(view,records){
    view.pendingBox.replaceChildren();
    const rows=records.filter(row=>pending(row)&&!active.has(row.id));
    view.pendingBox.hidden=!rows.length;
    for(const record of rows.slice(0,3)){
      const panel=make('article','wf-label-history-confirm');panel.dataset.wfReprintPending=record.id;
      panel.append(make('h3','',t('confirmTitle')),make('p','wf-label-history-confirm-identity',(record.invoiceNumber||t('unknown'))+' · '+(record.customerName||t('unknown'))+' · '+formatTime(record.requestedAt)));
      const labelNumbers=record.labels.slice(0,12).map(label=>label.sequenceNumber).join(', ')+(record.labels.length>12?' …':'');
      panel.append(make('p','',t('selected')+': '+record.selectedLabelCount+' · '+t('sequence')+': '+labelNumbers),make('p','wf-ops-muted',t('confirmHint')));
      for(const label of record.labels.slice(0,3))panel.append(make('p','',
        (label.name||t('unknown'))+' · '+(label.color||t('unknown'))+' · '+t('packet')+' '+label.currentPacket+'/'+label.totalPackets+' · '+t('unit')+' '+label.unitIndex+(label.quantity?'/'+label.quantity:'')));
      panel.append(confirmationActions(record,view));view.pendingBox.append(panel);
    }
    if(rows.length>3)view.pendingBox.append(button(t('pendingMore')+' ('+rows.length+')',()=>{open(view.invoiceId);if(pageHost){const target=views.get(pageHost);target.status='pending';target.filter.value='pending';target.limit=Math.max(target.limit,rows.length);render(target,true);}}));
  }
  function render(view,force){
    const current=state().settings?.[core.field],lang=locale();
    if(!force&&view.lastHistory===current&&view.lastLang===lang)return;
    view.lastHistory=current;view.lastLang=lang;view.host.dir=lang==='ar'?'rtl':'ltr';view.host.lang=lang;
    view.title.textContent=t(view.isAll?'title':'inline');view.description.textContent=t('description');
    view.more.textContent=t('more');view.all.textContent=t('viewAll');view.all.hidden=view.isAll;
    view.retention.textContent=t('retention');view.retention.hidden=!(current?.prunedCount>0);
    if(view.searchLabel){view.searchLabel.textContent=t('search');view.filterLabel.textContent=t('filter');for(const option of view.filter.children)option.textContent=t(option.value==='all'?'all':option.value);view.clear.textContent=t('clearInvoice');view.clear.hidden=!view.invoiceId;}
    let records;
    try{records=getEntries({invoiceId:view.invoiceId,query:view.query,status:view.status});}
    catch(_){view.notice.textContent=t('readError');view.notice.hidden=false;view.notice.dataset.error='true';view.pendingBox.hidden=true;view.metrics.hidden=true;view.list.replaceChildren();view.empty.hidden=true;return;}
    const error=errors.get(String(view.invoiceId))||(view.isAll?[...errors.values()][0]:null);
    view.notice.textContent=error?t(error):view.noticeKey?t(view.noticeKey):'';view.notice.hidden=!view.notice.textContent;view.notice.dataset.error=String(!!error);
    renderPending(view,records);
    const summary=core.summary(records);view.badge.textContent=String(summary.requests);view.metrics.replaceChildren();view.metrics.hidden=!records.length;
    for(const [key,value] of [['requests',summary.requests],['printedLabels',summary.printedLabels],['pendingCount',summary.pending]]){const item=make('div');item.append(make('strong','',value),make('span','',t(key)));view.metrics.append(item);}
    view.empty.textContent=t(view.query||view.status!=='all'?'noMatch':'empty');view.empty.hidden=!!records.length;
    view.list.replaceChildren(...records.slice(0,view.limit).map(record=>reportCard(record,view)));view.more.hidden=records.length<=view.limit;
  }
  function registerPage(){
    if(page)return page;
    page=ops.register({id:'print-history',parent:'invoices',title:Object.fromEntries(Object.entries(copy).map(([lang,words])=>[lang,words.title])),subtitle:Object.fromEntries(Object.entries(copy).map(([lang,words])=>[lang,words.subtitle])),onEnter:()=>{if(pageHost)render(views.get(pageHost),true);},onLanguage:()=>refresh()});
    pageHost=make('section','wf-label-history-page');page.body.append(pageHost);
    const view=mount(pageHost,{all:true});
    const filters=make('div','wf-label-history-filters');
    view.searchLabel=make('label');view.searchLabel.htmlFor='wfReprintHistorySearch';view.search=make('input','fi');view.search.type='search';view.search.id='wfReprintHistorySearch';view.search.dataset.wfReprintSearch='';view.search.autocomplete='off';
    view.filterLabel=make('label');view.filterLabel.htmlFor='wfReprintHistoryFilter';view.filter=make('select','fi');view.filter.id='wfReprintHistoryFilter';view.filter.dataset.wfReprintFilter='';
    for(const value of ['all','pending','printed','cancelled','failed']){const option=make('option');option.value=value;view.filter.append(option);}view.filter.value='all';
    view.search.addEventListener('input',()=>{view.query=view.search.value;view.limit=20;render(view,true);});view.filter.addEventListener('change',()=>{view.status=view.filter.value;view.limit=20;render(view,true);});
    view.clear=button('',()=>{view.invoiceId=null;view.limit=20;render(view,true);});
    const searchField=make('div'),statusField=make('div');searchField.append(view.searchLabel,view.search);statusField.append(view.filterLabel,view.filter);filters.append(searchField,statusField,view.clear);
    page.body.replaceChildren(filters,pageHost);render(view,true);return page;
  }
  function open(invoiceId){
    registerPage();const view=views.get(pageHost);view.invoiceId=invoiceId==null?null:String(invoiceId);view.query='';view.status='all';view.search.value='';view.filter.value='all';view.limit=20;render(view,true);return ops.open('print-history');
  }
  const api={mount,recordRequested,recordDialogClosed,recordFailed,getEntries,getSummary,registerPage,open};
  if(ops.label?.('print-history'))registerPage();
  return api;
});
