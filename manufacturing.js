(function (root) {
  'use strict';
  const ops=root.WFOperations, core=root.WFManufacturingCore;
  if(!ops || !core) return;
  const languages=['ar','tr','en','fr','ru'];
  const copy={
    title:['بطاقات التصنيع','Üretim fişleri','Manufacturing tickets','Fiches de fabrication','Производственные задания'],
    subtitle:['متابعة تصنيع بنود الفواتير','Fatura kalemlerinin üretim takibi','Track production by invoice line','Suivi de fabrication par ligne de facture','Ход производства по позициям счёта'],
    picker:['اختيار فاتورة','Fatura seç','Choose an invoice','Choisir une facture','Выбор счёта'],
    search:['رقم الفاتورة أو العميل أو الموديل','Fatura, müşteri veya model','Invoice, customer or model','Facture, client ou modèle','Счёт, клиент или модель'],
    progress:['تقدم التصنيع','Üretim durumu','Production progress','Avancement','Ход производства'],
    all:['كل الفواتير','Tüm faturalar','All invoices','Toutes les factures','Все счета'],
    unopened:['بدون بطاقة','Fiş oluşturulmadı','No ticket','Sans fiche','Без задания'],
    pending:['بانتظار التصنيع','Bekliyor','Pending','En attente','Ожидает'],
    in_progress:['قيد التصنيع','Üretimde','In progress','En cours','В работе'],
    completed:['مكتمل','Tamamlandı','Completed','Terminé','Готово'],
    unsupported:['صيغة غير مدعومة','Desteklenmeyen biçim','Unsupported format','Format non pris en charge','Неподдерживаемый формат'],
    empty:['لا توجد فواتير مطابقة.','Eşleşen fatura yok.','No matching invoices.','Aucune facture correspondante.','Подходящих счетов нет.'],
    more:['عرض المزيد','Daha fazla göster','Show more','Afficher la suite','Показать ещё'],
    archived:['فاتورة مؤرشفة','Arşivlenmiş fatura','Archived invoice','Facture archivée','Архивный счёт'],
    create:['إنشاء بطاقة من الفاتورة','Faturadan fiş oluştur','Create ticket from invoice','Créer la fiche depuis la facture','Создать задание из счёта'],
    createHelp:['ستُنسخ بنود الفاتورة المحفوظة إلى بطاقة مستقلة لمتابعة تصنيعها.','Kayıtlı fatura kalemleri üretimi izlemek için fişe kopyalanır.','The ticket will keep a copy of the saved invoice lines for the workshop.','La fiche conservera une copie des lignes enregistrées de la facture pour l’atelier.','В задание для цеха будет скопирован сохранённый состав счёта.'],
    captured:['نُسخت من الفاتورة بتاريخ','Faturadan kopyalanma tarihi','Copied from the saved invoice on','Copiée depuis la facture le','Сохранено из счёта'],
    archivedCapture:['كانت الفاتورة مؤرشفة عند إنشاء البطاقة.','Fiş oluşturulduğunda fatura arşivdeydi.','The invoice was archived when this ticket was created.','La facture était archivée lors de la création de cette fiche.','При создании задания счёт находился в архиве.'],
    unknown:['غير مسجّل','Kayıt yok','Unrecorded','Non renseigné','Нет данных'],
    qty:['الكمية','Adet','Quantity','Quantité','Количество'],
    packets:['الطرود لكل قطعة','Birim başına koli','Packages per unit','Colis par unité','Мест на единицу'],
    type:['النوع','Tür','Type','Type','Тип'],
    color:['اللون','Renk','Color','Couleur','Цвет'],
    dimensions:['الأبعاد','Ölçüler','Dimensions','Dimensions','Размеры'],
    cm:['سم','cm','cm','cm','см'],
    coffee_table:['طاولة قهوة','Orta Sehpa','Coffee table','Table basse','Журнальный столик'],
    side_table:['طاولة جانبية','Yan Sehpa','Side table','Table d’appoint','Приставной столик'],
    dresser:['مدخل','Dresuar','Dresser','Commode','Комод'],
    tv_table:['طاولة تلفاز','TV Ünitesi','TV table','Meuble TV','Тумба под телевизор'],
    other:['أخرى','Diğer','Other','Autre','Другое'],
    line:['البند','Kalem','Line','Ligne','Позиция'],
    lines:['البنود المكتملة','Tamamlanan kalemler','Lines completed','Lignes terminées','Готовые позиции'],
    state:['حالة البند','Kalem durumu','Line status','État de la ligne','Статус позиции'],
    note:['ملاحظة الورشة','Atölye notu','Workshop note','Note d’atelier','Примечание цеха'],
    updated:['آخر تحديث','Son güncelleme','Updated','Mise à jour','Обновлено'],
    save:['حفظ التغيير','Değişikliği kaydet','Save change','Enregistrer','Сохранить'],
    reset:['تجاهل التعديل','Değişikliği sil','Discard edit','Annuler la saisie','Отменить правку'],
    history:['سجل البند','Kalem geçmişi','Line history','Historique de la ligne','История позиции'],
    print:['طباعة البطاقة','Fişi yazdır','Print ticket','Imprimer la fiche','Печать задания'],
    printFailed:['تعذّر فتح معاينة الطباعة. اسمح بفتح نافذة الطباعة ثم أعد المحاولة.','Yazdırma önizlemesi açılamadı. Yazdırma penceresine izin verip tekrar deneyin.','Could not open the print preview. Allow the print window and try again.','Aperçu impossible. Autorisez la fenêtre d’impression, puis réessayez.','Не удалось открыть предпросмотр. Разрешите открытие окна печати и повторите.'],
    closePrint:['إغلاق المعاينة','Önizlemeyi kapat','Close preview','Fermer l’aperçu','Закрыть предпросмотр'],
    preparing:['جارٍ تجهيز الصور والخطوط…','Görseller ve yazı tipleri hazırlanıyor…','Preparing photos and fonts…','Préparation des photos et des polices…','Подготовка фото и шрифтов…'],
    assetsFailed:['تعذّر تحميل صور البطاقة أو خطوطها. أغلق المعاينة وأعد المحاولة.','Fiş görselleri veya yazı tipleri yüklenemedi. Önizlemeyi kapatıp tekrar deneyin.','Ticket photos or fonts could not load. Close the preview and try again.','Impossible de charger les photos ou les polices. Fermez l’aperçu et réessayez.','Не удалось загрузить фото или шрифты. Закройте предпросмотр и повторите попытку.'],
    photoMissing:['الصورة غير متاحة','Fotoğraf kullanılamıyor','Photo unavailable','Photo indisponible','Фото недоступно'],
    saved:['تم حفظ البطاقة.','Fiş kaydedildi.','Ticket saved.','Fiche enregistrée.','Задание сохранено.'],
    failed:['تعذّر الحفظ. أعد المحاولة.','Kaydedilemedi. Tekrar deneyin.','Could not save. Please try again.','Enregistrement impossible. Réessayez.','Не удалось сохранить. Повторите попытку.'],
    invalid:['تحقق من بنود الفاتورة وكمياتها قبل إنشاء البطاقة.','Fiş oluşturmadan önce fatura kalemlerini ve adetlerini kontrol edin.','Check the invoice lines and quantities before creating a ticket.','Vérifiez les lignes et les quantités avant de créer la fiche.','Перед созданием задания проверьте позиции счёта и количество.'],
    conflict:['تغيّر هذا البند في جهاز آخر. راجع النسخة المحفوظة وأعد تطبيق تعديلك.','Bu kalem başka bir oturumda değişti. Kayıtlı sürümü inceleyip düzenlemenizi yeniden uygulayın.','This line changed in another session. Review the saved line and reapply your edit.','Cette ligne a changé dans une autre session. Consultez la version enregistrée, puis reprenez votre modification.','Позиция изменилась в другом сеансе. Проверьте сохранённую версию и внесите правку заново.'],
    savedLine:['آخر حالة وملاحظة محفوظتين','Son kayıtlı durum ve not','Latest saved status and note','Derniers état et note enregistrés','Последние сохранённые статус и примечание'],
    latest:['تحميل البند المحفوظ','Kayıtlı kalemi yükle','Load saved line','Charger la ligne enregistrée','Загрузить сохранённую позицию'],
    missing:['لم تعد الفاتورة أو البطاقة متاحة.','Fatura veya fiş artık kullanılamıyor.','The invoice or ticket is no longer available.','La facture ou la fiche n’est plus disponible.','Счёт или задание больше недоступны.'],
    retainedDraft:['لم تعد الفاتورة متاحة. يمكنك نسخ الملاحظة أدناه قبل تجاهل التعديل غير المحفوظ.','Fatura artık kullanılamıyor. Kaydedilmemiş değişikliği silmeden önce aşağıdaki notu kopyalayabilirsiniz.','The invoice is no longer available. You can copy the note below before discarding this unsaved change.','La facture n’est plus disponible. Vous pouvez copier la note ci-dessous avant d’annuler cette modification non enregistrée.','Счёт больше недоступен. Перед удалением несохранённой правки можно скопировать примечание ниже.'],
    draft:['توجد تعديلات غير محفوظة','Kaydedilmemiş değişiklikler var','Unsaved changes','Modifications non enregistrées','Есть несохранённые изменения']
  };
  const lang=()=>languages.includes(ops.locale())?ops.locale():'en';
  const t=key=>copy[key][languages.indexOf(lang())];
  const headings=key=>Object.fromEntries(languages.map((id,i)=>[id,copy[key][i]]));
  const make=ops.make;
  const getInvoices=()=>ops.state().invoices || [];
  const find=id=>id==null ? null : getInvoices().find(inv=>inv?.id===id) || getInvoices().find(inv=>inv?.id!=null && String(inv.id)===String(id));
  const display=value=>value==null || value==='' ? t('unknown') : String(value);
  const date=timestamp=>{
    const when=new Date(timestamp);
    return Number.isFinite(when.getTime()) ? new Intl.DateTimeFormat(lang(),{dateStyle:'medium',timeStyle:'short'}).format(when) : t('unknown');
  };
  function dimensions(item) {
    const rows=item.dimPieces.map(piece=>({axes:[piece.l??piece.length,piece.w??piece.width,piece.h??piece.height],unit:piece.unit||t('cm')}))
      .filter(piece=>piece.axes.some(value=>value!=null && value!=='' && Number(value)>0));
    if(rows.length)return rows.map(piece=>piece.axes.map(value=>value==null || value==='' ? '—' : value).join(' × ')+' '+piece.unit).join(' / ');
    return display(item.dimensions);
  }
  function safeImage(value) {
    const src=root.WFPackageLabelCore.safeImageSource(value);
    if(!src)return '';
    try {return new URL(src,root.document.baseURI).href;} catch (_) {return '';}
  }
  const keyOf=(ticket,line)=>JSON.stringify([ticket.id,line.id]);
  const drafts=new Map();
  let shell,chooser,list,detail,searchInput,statusSelect,more,printButton;
  let printJob=null;
  let selected=null,query='',filter='all',limit=30,busy=false,error='',mountedLang='';
  function button(label,handler,primary=false) {
    const el=make('button','btn '+(primary?'btn-p':'btn-s'),label);
    el.type='button';el.addEventListener('click',handler);return el;
  }
  function field(caption,input) {
    const label=make('label','wf-mfg-field');label.append(make('span','',caption),input);return label;
  }
  function select(keys,value) {
    const el=make('select','fi');
    for(const key of keys){const o=make('option','',t(key));o.value=key;el.append(o);}
    el.value=value;return el;
  }
  function sourceName(invoice) {
    const record=core.isTicket(invoice?.manufacturingTicket)?invoice.manufacturingTicket:null;
    return [display(record?record.invoiceNo:invoice.invNo), display(record?record.customerName:invoice.companyName)].join(' · ');
  }
  function facts(item) {
    return [['qty',display(item.qty)],['packets',display(item.packets)],['type',['coffee_table','side_table','dresser','tv_table','other'].includes(item.type)?t(item.type):display(item.type)],['color',display(item.color)],['dimensions',dimensions(item)]];
  }
  function renderList() {
    const rows=getInvoices().filter(row=>core.matches(row,{status:filter,search:query})).reverse();
    const fragment=document.createDocumentFragment();
    for(const row of rows.slice(0,limit)){
      const progress=core.progress(row.manufacturingTicket);
      const choice=button('',()=>choose(row.id));
      choice.className='wf-mfg-choice';choice.disabled=busy;
      choice.setAttribute('aria-pressed',String(selected===row.id));
      choice.append(make('bdi','',sourceName(row)),make('small','',t(progress.status)+(progress.total?' · '+progress.completed+'/'+progress.total:'')));
      fragment.append(choice);
    }
    if(!rows.length)fragment.append(make('p','wf-ops-muted',t('empty')));
    list.replaceChildren(fragment);
    more.hidden=rows.length<=limit;
  }
  function mount() {
    const previousOpen=chooser?.open;
    chooser=make('details','wf-ops-card wf-mfg-chooser');
    chooser.open=previousOpen ?? selected===null;
    const heading=make('summary','',t('picker'));
    const filters=make('div','wf-mfg-filters');
    searchInput=make('input','fi');searchInput.id='wfMfgSearch';searchInput.type='search';searchInput.autocomplete='off';
    searchInput.dir='auto';searchInput.value=query;
    searchInput.addEventListener('input',()=>{query=searchInput.value;limit=30;renderList();});
    statusSelect=select(['all','unopened',...core.statuses],filter);
    statusSelect.addEventListener('change',()=>{filter=statusSelect.value;limit=30;renderList();});
    filters.append(field(t('search'),searchInput),field(t('progress'),statusSelect));
    list=make('div','wf-mfg-list');more=button(t('more'),()=>{limit+=30;renderList();});
    chooser.append(heading,filters,list,more);detail=make('div','wf-mfg-detail');
    printButton=button(t('print'),printTicket,true);printButton.id='wfMfgPrint';
    shell.body.replaceChildren(chooser,detail);shell.actions.replaceChildren(printButton);mountedLang=lang();
  }
  function choose(id) {
    if(busy)return;
    const row=find(id);selected=row?.id ?? null;error=row?'':'missing';
    if(chooser && row)chooser.open=false;
    refresh();
  }
  function dirty(draft) {return draft && (draft.note!==draft.base.note || draft.status!==draft.base.status);}
  function draftFor(ticket,line) {
    const key=keyOf(ticket,line);
    if(!drafts.has(key))drafts.set(key,{invoiceId:ticket.invoiceId,invoiceNo:ticket.invoiceNo,lineName:line.item.name,
      base:{status:line.status,note:line.note},status:line.status,note:line.note});
    return drafts.get(key);
  }
  function printActive() {return !!printJob && !printJob.win.closed;}
  function syncPrint() {
    const ticket=find(selected)?.manufacturingTicket;
    printButton.hidden=!core.isTicket(ticket);
    printButton.disabled=printActive() || busy || !core.isTicket(ticket) || ticket.lines.some(line=>dirty(drafts.get(keyOf(ticket,line))));
  }
  function createTicket() {
    if(root.WFAccountAccess&&!root.WFAccountAccess.allow('manufacturing.edit'))return;
    const invoice=find(selected);
    if(!invoice || busy)return;
    return persist({kind:'create',id:invoice.id,ticketId:wfNewRecordId(),at:new Date().toISOString()});
  }
  function saveLine(ticket,line) {
    if(root.WFAccountAccess&&!root.WFAccountAccess.allow('manufacturing.edit'))return;
    const draft=draftFor(ticket,line),changes={};
    if(draft.status!==draft.base.status)changes.status=draft.status;
    if(draft.note!==draft.base.note)changes.note=draft.note;
    if(!Object.keys(changes).length || busy)return;
    return persist({kind:'update',id:ticket.invoiceId,ticketId:ticket.id,lineId:line.id,base:{...draft.base},changes,at:new Date().toISOString()},keyOf(ticket,line));
  }
  async function persist(intent,key) {
    if(busy)return;
    busy=true;error='';
    if(key)drafts.get(key).error='';
    refresh();
    try{
      await core.commit(intent,{state:ops.state(),writeBatch:wfWriteBatch,hydrate:wfHydrateDBValue,read:dbGet});
    }catch(cause){
      const code=cause?.message;
      const reason=code==='CONFLICT'?'conflict':['EMPTY_INVOICE','INVALID_QUANTITY'].includes(code)?'invalid':
        ['MISSING_TICKET','MISSING_LINE','MISSING_INVOICE'].includes(code)?'missing':code==='UNSUPPORTED_TICKET'?'unsupported':'failed';
      if(key)drafts.get(key).error=reason;
      else error=reason;
      busy=false;refresh();return;
    }
    if(key)drafts.delete(key);
    busy=false;refresh();ops.notify(t('saved'),'ok');
  }
  async function reloadLine(ticket,line) {
    if(busy)return;
    const key=keyOf(ticket,line);
    busy=true;refresh();
    try {
      const visible=()=>getInvoices().find(row=>row?.id===ticket.invoiceId);
      let prior=visible(),newest=await dbGet('invoices',ticket.invoiceId);
      // A payment, edit or deletion may commit while the read hydrates photos.
      // Publish only a read made against the current local invoice revision.
      while(prior!==visible()){
        prior=visible();newest=await dbGet('invoices',ticket.invoiceId);
      }
      if(!newest || newest.manufacturingTicket?.id!==ticket.id)throw Error('MISSING_TICKET');
      const rows=getInvoices(),idx=rows.findIndex(row=>row?.id===newest.id);
      if(idx<0)rows.push(newest);else rows[idx]=newest;
      const lineNow=newest.manufacturingTicket.lines.find(entry=>entry.id===line.id);
      if(!lineNow)throw Error('MISSING_TICKET');
      const previous=drafts.get(key);
      // Keep the operator's attempted changes and show the newest saved values for comparison.
      const changedStatus=previous.status!==previous.base.status, changedNote=previous.note!==previous.base.note;
      drafts.set(key,{...previous,base:{status:lineNow.status,note:lineNow.note},status:changedStatus?previous.status:lineNow.status,
        note:changedNote?previous.note:lineNow.note,review:true,error:''});
    } catch(cause) {drafts.get(key).error=cause?.message==='MISSING_TICKET'?'missing':'failed';}
    busy=false;refresh();
  }
  function lineCard(ticket,line,index) {
    const key=keyOf(ticket,line), item=line.item;
    const el=make('article','wf-ops-card wf-mfg-line'); el.dataset.lineId=line.id;
    const head=make('div','wf-mfg-line-head');
    const src=safeImage(item.image);
    if(src){
      const img=make('img','wf-mfg-photo');img.alt='';img.src=src;img.loading='lazy';img.decoding='async';
      img.addEventListener('error',()=>img.hidden=true,{once:true});head.append(img);
    }
    const identity=make('div','');identity.append(make('small','wf-ops-muted',t('line')+' '+(index+1)),make('h3','',display(item.name)));head.append(identity);
    const badge=make('span','wf-mfg-state',t(line.status));badge.dataset.status=line.status;head.append(badge);
    const dl=make('dl','wf-mfg-facts');
    for(const [name,value] of facts(item)){
      const entry=make('div','');entry.append(make('dt','',t(name)),make('dd','',value));dl.append(entry);
    }
    const current=drafts.get(key);
    const state=select(core.statuses,current?.status ?? line.status);state.disabled=busy||!!(root.WFAccountAccess&&!root.WFAccountAccess.can('manufacturing.edit'));
    const note=make('textarea','fi');note.rows=2;note.dir='auto';note.value=current?.note ?? line.note;note.disabled=busy||!!(root.WFAccountAccess&&!root.WFAccountAccess.can('manufacturing.edit'));
    note.id='wfMfgNote-'+ticket.id+'-'+line.id;
    const fields=make('div','wf-mfg-fields');fields.append(field(t('state'),state),field(t('note'),note));
    const actions=make('div','wf-mfg-actions');
    const save=button(t('save'),()=>saveLine(ticket,line),true);save.dataset.wfMfgSave='';
    const discard=button(t('reset'),()=>{drafts.delete(key);renderDetail();});
    const hint=make('span','wf-mfg-draft',t('draft'));actions.append(save,discard,hint);
    function sync(updatePrint=true){
      const draft=drafts.get(key),changed=dirty(draft);
      save.disabled=busy || !changed || draft?.error==='conflict';
      discard.hidden=!changed || draft?.error==='conflict';discard.disabled=busy;
      hint.hidden=!changed;if(updatePrint)syncPrint();
    }
    const edit=()=>{
      const draft=draftFor(ticket,line);
      draft.status=state.value;draft.note=note.value;
      if(!dirty(draft) && !draft.error)drafts.delete(key);
      sync();
    };
    state.addEventListener('change',edit);note.addEventListener('input',edit);sync(false);
    el.append(head,dl,fields,actions);
    if(current?.review)el.append(make('p','wf-ops-status',t('savedLine')+' · '+t(line.status)+(line.note?' · '+line.note:'')));
    if(current?.error){
      const message=make('p','wf-ops-status',t(current.error));message.dataset.kind='error';message.setAttribute('role','alert');el.append(message);
      if(current.error==='conflict') {
        const reload=button(t('latest'),()=>reloadLine(ticket,line));reload.disabled=busy;el.append(reload);
      }
    }
    const time=make('small','wf-ops-muted',t('updated')+' · '+date(line.updatedAt));el.append(time);
    if(line.history.length){
      const history=make('details','wf-mfg-history'), list=make('ol','');
      for(const change of [...line.history].reverse()){
        const row=make('li','');row.append(make('time','',date(change.at)),make('strong','',t(change.status)));
        if(change.note)row.append(make('span','',change.note));list.append(row);
      }
      history.append(make('summary','',t('history')+' · '+line.history.length),list);el.append(history);
    }
    return el;
  }
  function renderRetainedDrafts() {
    for(const [key,draft] of drafts){
      if(!dirty(draft) || find(draft.invoiceId))continue;
      const notice=make('section','wf-ops-card wf-mfg-line');
      notice.append(make('h3','',t('draft')+' · '+display(draft.invoiceNo)+' · '+display(draft.lineName)),
        make('p','',t('retainedDraft')),make('p','',t('state')+' · '+t(draft.status)));
      const note=make('textarea','fi');note.rows=3;note.dir='auto';note.readOnly=true;note.value=draft.note;
      const discard=button(t('reset'),()=>{drafts.delete(key);renderDetail();});discard.disabled=busy;
      notice.append(field(t('note'),note),discard);detail.append(notice);
    }
  }
  function renderDetail() {
    detail.replaceChildren();syncPrint();
    if(error){const message=make('p','wf-ops-status',t(error));message.setAttribute('role','alert');message.dataset.kind='error';detail.append(message);}
    renderRetainedDrafts();
    const row=find(selected);if(!row)return;
    const ticket=row.manufacturingTicket;
    const header=make('section','wf-ops-card wf-mfg-selected');header.append(make('h2','',sourceName(row)));
    if(row.archived)header.append(make('small','wf-ops-muted',t('archived')));
    detail.append(header);
    if(ticket==null) {
      const create=button(t('create'),createTicket,true);create.id='wfMfgCreate';create.disabled=busy;
      header.append(make('p','',t('createHelp')),create);return;
    }
    if(!core.isTicket(ticket)){header.append(make('p','',t('unsupported')));return;}
    const progress=core.progress(ticket);
    header.append(make('p','',t('captured')+' '+date(ticket.createdAt)),make('strong','',t(progress.status)+' · '+t('lines')+' '+progress.completed+'/'+progress.total));
    if(ticket.archivedAtCapture)header.append(make('small','wf-ops-muted',t('archivedCapture')));
    for(const [i,line] of ticket.lines.entries())detail.append(lineCard(ticket,line,i));
  }
  function refresh(){
    if(!shell || !shell.page.classList.contains('active'))return;
    if(mountedLang!==lang())mount();
    if(selected!==null && !find(selected)){selected=null;chooser.open=true;error='missing';}
    shell.body.setAttribute('aria-busy',String(busy));
    renderList();renderDetail();
  }
  function printTicket(){
    if(root.WFAccountAccess&&!root.WFAccountAccess.allow('manufacturing.print'))return;
    const ticket=find(selected)?.manufacturingTicket;
    if(!core.isTicket(ticket) || printButton.disabled)return;
    let win;
    try {win=root.open('','_blank');} catch (_) {win=null;}
    if(!win){ops.notify(t('printFailed'),'er');return;}
    win.opener=null;
    // Keep this detached preview and native print dialog independent of any subsequent app route.
    // Closing the preview is reliable even on platforms that omit afterprint.
    const job={win};printJob=job;syncPrint();
    const watch=root.setInterval(()=>{
      if(!win.closed)return;
      root.clearInterval(watch);
      if(printJob===job){printJob=null;syncPrint();}
    },750);
    const doc=win.document, locale=lang();
    doc.title=t('title')+' · '+display(ticket.invoiceNo);
    doc.documentElement.lang=locale;doc.documentElement.dir=locale==='ar'?'rtl':'ltr';
    const node=(tag,value)=>{const el=doc.createElement(tag);if(value!=null)el.textContent=value;return el;};
    const css=node('style',`
      @page{size:A4 portrait;margin:12mm}*{box-sizing:border-box}body{max-width:185mm;margin:14px auto;padding:0 10px;font:14px/1.5 system-ui,sans-serif;color:#17222b;background:#fff}
      h1,h2,p{margin:0 0 .4em}h1{font-size:24px}h2{font-size:17px}header{padding-bottom:9px;border-bottom:2px solid #263642;margin-bottom:10px}
      article{break-inside:avoid;border:1px solid #a6b0b7;border-radius:7px;margin:8px 0;padding:10px;overflow-wrap:anywhere;display:flow-root}
      img{width:60px;height:60px;object-fit:contain;float:inline-end;margin-inline-start:8px}dl{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:4px 12px;margin:6px 0}
      dt{font-size:11px;color:#46545a}dd{margin:0;font-weight:600}article p{white-space:pre-wrap}button{font:inherit;padding:8px 24px;margin-bottom:14px}
      @media print{body{padding:0;margin:0;max-width:none}button{display:none}}
    `);
    doc.head.append(css);
    const action=node('button',t('print'));action.type='button';action.disabled=true;
    const close=node('button',t('closePrint'));close.type='button';
    close.addEventListener('click',()=>{if(!win.matchMedia?.('print').matches)win.close();});
    action.addEventListener('click',()=>win.print());
    const status=node('p',t('preparing'));status.setAttribute('role','status');
    doc.body.append(action,close,status);
    const head=node('header');head.append(node('h1',t('title')),node('h2',display(ticket.invoiceNo)+' · '+display(ticket.customerName)),
      node('p',t('captured')+' '+date(ticket.createdAt)));doc.body.append(head);
    const waits=[];
    for(const [index,line] of ticket.lines.entries()){
      const item=line.item,block=node('article'),src=safeImage(item.image);
      if(src){
        const image=node('img');image.alt='';
        image.src=src;
        block.append(image);
        const unavailable=node('small',t('photoMissing'));
        waits.push(root.WFPackageLabelHelpers.waitForImage(image).catch(error=>{
          image.replaceWith(unavailable);throw error;
        }));
      }else if(item.image){
        block.append(node('small',t('photoMissing')));waits.push(Promise.reject(Error('INVALID_IMAGE')));
      }
      block.append(node('h2',t('line')+' '+(index+1)+' · '+display(item.name)));
      const dl=node('dl');
      for(const [label,value] of [...facts(item),['state',t(line.status)]]){
        const section=node('div');section.append(node('dt',t(label)),node('dd',value));dl.append(section);
      }
      block.append(dl);
      if(line.note)block.append(node('p',t('note')+' · '+line.note));
      doc.body.append(block);
    }
    if(doc.fonts)waits.push(doc.fonts.ready);
    const failure=t('assetsFailed');
    root.WFPackageLabelHelpers.withTimeout(Promise.all(waits),16000,'PRINT_ASSET_TIMEOUT').then(()=>{
      if(win.closed)return;
      status.hidden=true;action.disabled=false;win.focus();win.print();
    }).catch(()=>{
      if(!win.closed){status.textContent=failure;status.hidden=false;action.disabled=true;}
    });
  }
  function enhance(){
    const host=document.getElementById('invListContainer');
    if(!host)return;
    for(const card of host.querySelectorAll('.inv-card[data-invoice-id]')){
      const actions=card.querySelector('.inv-card-actions');
      if(!actions || actions.querySelector('[data-wf-mfg-action]'))continue;
      const action=button('',event=>{event.stopPropagation();open(card.dataset.invoiceId);});
      action.dataset.wfMfgAction='';
      const caption=make('span','',t('title'));caption.dataset.wfOpsLabel='manufacturing';
      action.append(caption);actions.append(action);
    }
  }
  function open(invoiceId){
    if(invoiceId!=null && !busy){
      const row=find(invoiceId);selected=row?.id ?? null;error=row?'':'missing';
      if(chooser)chooser.open=!row;
    }
    if(shell.page.classList.contains('active')){refresh();return true;}
    return ops.open('manufacturing');
  }
  shell=ops.register({id:'manufacturing',parent:'invoices',icon:'factory',title:headings('title'),subtitle:headings('subtitle'),
    onEnter:refresh,onLanguage:refresh});
  root.WFManufacturing=Object.freeze({open,refresh,enhance});
  const invoiceList=document.getElementById('invListContainer');
  if(invoiceList)new root.MutationObserver(enhance).observe(invoiceList,{childList:true,subtree:true});
  const guard=()=>root.WFAppUpdates?.registerGuard('manufacturing',()=>busy || printActive() || [...drafts.values()].some(dirty));
  guard();document.addEventListener('DOMContentLoaded',guard,{once:true});
  enhance();refresh();
})(window);
