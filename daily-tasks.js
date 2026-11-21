/* Explicit daily planning. Dates are plans, and tasks never change business records. */
(function(root,factory){
  'use strict';
  if(typeof module==='object'&&module.exports)module.exports=factory;else root.WFDailyTasks=factory(root,root.WFDailyTasksCore);
})(typeof window==='object'?window:globalThis,function(root,core){
  'use strict';
  const ops=root.WFOperations,document=root.document;if(!ops||!document||!core)return null;
  const locales=['ar','tr','en','fr','ru'];
  const words={
    title:['المهام اليومية','Günlük görevler','Daily tasks','Tâches quotidiennes','Ежедневные задачи'],
    subtitle:['خطّط للعمل وسجّل ما أنجزته','İşi planlayın ve tamamlananları kaydedin','Plan your work and record what is done','Planifiez le travail et notez les tâches terminées','Планируйте работу и отмечайте выполненное'],
    add:['إضافة مهمة','Görev ekle','Add task','Ajouter une tâche','Добавить задачу'],
    newTask:['مهمة جديدة','Yeni görev','New task','Nouvelle tâche','Новая задача'],
    editTask:['تعديل المهمة','Görevi düzenle','Edit task','Modifier la tâche','Изменить задачу'],
    taskTitle:['عنوان المهمة','Görev başlığı','Task title','Titre de la tâche','Название задачи'],
    notes:['ملاحظات','Notlar','Notes','Notes','Заметки'],
    priority:['الأولوية','Öncelik','Priority','Priorité','Приоритет'],
    high:['عالية','Yüksek','High','Haute','Высокий'],
    normal:['عادية','Normal','Normal','Normale','Обычный'],
    low:['منخفضة','Düşük','Low','Basse','Низкий'],
    dueDate:['التاريخ المخطّط','Planlanan tarih','Planned date','Date prévue','Плановая дата'],
    status:['الحالة','Durum','Status','État','Статус'],
    open:['مفتوحة','Açık','Open','Ouverte','Открыта'],
    done:['منجزة','Tamamlandı','Done','Terminée','Выполнена'],
    cancelled:['ملغاة','İptal edildi','Cancelled','Annulée','Отменена'],
    today:['اليوم','Bugün','Today','Aujourd’hui','Сегодня'],
    overdue:['متأخرة عن الموعد','Gecikmiş','Overdue','En retard','Просрочено'],
    upcoming:['قادمة','Yaklaşan','Upcoming','À venir','Предстоящие'],
    noDate:['بلا تاريخ','Tarih yok','No date','Sans date','Без даты'],
    all:['الكل','Tümü','All','Tout','Все'],
    search:['ابحث في المهام','Görevlerde ara','Search tasks','Rechercher des tâches','Поиск задач'],
    save:['حفظ المهمة','Görevi kaydet','Save task','Enregistrer la tâche','Сохранить задачу'],
    cancel:['إغلاق دون حفظ','Kaydetmeden kapat','Close without saving','Fermer sans enregistrer','Закрыть без сохранения'],
    saving:['جارٍ الحفظ…','Kaydediliyor…','Saving…','Enregistrement…','Сохранение…'],
    saved:['تم حفظ المهمة.','Görev kaydedildi.','Task saved.','Tâche enregistrée.','Задача сохранена.'],
    removed:['تم حذف المهمة.','Görev silindi.','Task deleted.','Tâche supprimée.','Задача удалена.'],
    saveError:['تعذّر حفظ المهمة. بقيت تعديلاتك في النموذج.','Görev kaydedilemedi. Düzenlemeleriniz formda korundu.','The task could not be saved. Your edits remain in the form.','Impossible d’enregistrer la tâche. Vos modifications restent dans le formulaire.','Не удалось сохранить задачу. Изменения остались в форме.'],
    readError:['تعذّر تحميل المهام المحفوظة. أعد التحديث.','Kayıtlı görevler yüklenemedi. Yenileyin.','Saved tasks could not be loaded. Refresh and retry.','Impossible de charger les tâches enregistrées. Actualisez.','Не удалось загрузить сохранённые задачи. Обновите список.'],
    conflict:['تغيّرت هذه المهمة. راجع أحدث نسخة قبل حفظ تعديلاتك.','Bu görev değişti. Kaydetmeden önce en son sürümü inceleyin.','This task changed. Review the latest version before saving your edits.','Cette tâche a changé. Consultez la dernière version avant d’enregistrer.','Эта задача изменилась. Проверьте последнюю версию перед сохранением.'],
    reload:['تحميل أحدث نسخة','Son sürümü yükle','Load latest version','Charger la dernière version','Загрузить последнюю версию'],
    required:['أدخل عنوانًا للمهمة.','Bir görev başlığı girin.','Enter a task title.','Saisissez un titre.','Введите название задачи.'],
    invalidDate:['اختر تاريخًا صحيحًا.','Geçerli bir tarih seçin.','Choose a valid date.','Choisissez une date valide.','Выберите корректную дату.'],
    capacity:['وصلت إلى حد المهام المحفوظة. احذف مهمة قديمة قبل الإضافة.','Kayıtlı görev sınırına ulaşıldı. Eklemeden önce eski bir görevi silin.','The task limit has been reached. Delete an old task before adding another.','La limite de tâches est atteinte. Supprimez une ancienne tâche avant d’en ajouter une.','Достигнут лимит задач. Удалите старую задачу перед добавлением новой.'],
    edit:['تعديل','Düzenle','Edit','Modifier','Изменить'],
    complete:['تم الإنجاز','Tamamlandı olarak işaretle','Mark done','Marquer terminée','Отметить выполненной'],
    reopen:['إعادة الفتح','Yeniden aç','Reopen','Rouvrir','Открыть снова'],
    delete:['حذف','Sil','Delete','Supprimer','Удалить'],
    askDelete:['حذف هذه المهمة؟','Bu görev silinsin mi?','Delete this task?','Supprimer cette tâche ?','Удалить эту задачу?'],
    confirmDelete:['حذف المهمة','Görevi sil','Delete task','Supprimer la tâche','Удалить задачу'],
    keep:['الاحتفاظ بها','Sakla','Keep task','Conserver','Сохранить задачу'],
    referenceKind:['ربط بسجل اختياري','İsteğe bağlı kayıt bağlantısı','Optional record link','Lien facultatif vers un dossier','Связать с записью (необязательно)'],
    none:['بدون ربط','Bağlantı yok','No link','Aucun lien','Без связи'],
    invoice:['فاتورة','Fatura','Invoice','Facture','Счёт'],
    product:['منتج','Ürün','Product','Produit','Товар'],
    customer:['عميل','Müşteri','Customer','Client','Клиент'],
    referenceSearch:['ابحث عن السجل','Kayıt ara','Find a record','Rechercher un dossier','Найти запись'],
    reference:['السجل المرتبط','Bağlantılı kayıt','Linked record','Dossier lié','Связанная запись'],
    choose:['اختر سجلًا','Bir kayıt seçin','Choose a record','Choisissez un dossier','Выберите запись'],
    referenceLimit:['تظهر أول 100 نتيجة. ضيّق البحث للوصول إلى السجل.','İlk 100 sonuç gösterilir. Kaydı bulmak için aramayı daraltın.','The first 100 matches are shown. Narrow the search to find the record.','Les 100 premiers résultats sont affichés. Affinez la recherche.','Показаны первые 100 результатов. Уточните поиск.'],
    unavailable:['السجل الأصلي غير متاح','Asıl kayıt mevcut değil','Original record unavailable','Dossier initial indisponible','Исходная запись недоступна'],
    empty:['لا توجد مهام محفوظة. أضف أول مهمة عند الحاجة.','Kayıtlı görev yok. Gerektiğinde ilk görevinizi ekleyin.','No saved tasks yet. Add your first task when needed.','Aucune tâche enregistrée. Ajoutez-en une lorsque nécessaire.','Сохранённых задач пока нет. Добавьте первую задачу при необходимости.'],
    noMatch:['لا توجد مهام تطابق عوامل التصفية.','Filtrelerle eşleşen görev yok.','No tasks match these filters.','Aucune tâche ne correspond aux filtres.','Нет задач по выбранным фильтрам.'],
    more:['عرض المزيد','Daha fazla göster','Show more','Afficher plus','Показать ещё'],
    refresh:['تحديث المهام','Görevleri yenile','Refresh tasks','Actualiser les tâches','Обновить задачи']
  };
  const t=key=>words[key]?.[Math.max(0,locales.indexOf(ops.locale()))]||key;
  const titles=key=>Object.fromEntries(locales.map((lang,index)=>[lang,words[key][index]]));
  const make=(tag,className,value)=>{const node=document.createElement(tag);if(className)node.className=className;if(value!==undefined)node.textContent=String(value);return node;};
  const labels=new Map(),ui={inputs:{},filterInputs:{}};
  const labelled=(tag,className,key)=>{const node=make(tag,className,t(key));labels.set(node,key);return node;};
  function button(key,action,kind=key,className='btn btn-s'){const node=labelled('button',className,key);node.type='button';node.dataset.wfTaskAction=kind;const permission=['delete','confirmDelete'].includes(kind)?'tasks.delete':['add','edit','save','complete','reopen','reload'].includes(kind)?'tasks.edit':null;if(permission)node.dataset.wfPermission=permission;node.addEventListener('click',event=>{if(permission&&root.WFAccountAccess&&!root.WFAccountAccess.allow(permission))return;return action(event);});return node;}
  let editing=null,busy=false,readSequence=0,message='',pendingDelete=null,referenceChoices=new Map(),visible=30,unique=0;
  const filters={query:'',status:'open',due:'all',priority:'all'};
  const state=()=>ops.state()||{};
  const today=()=>{const date=new Date();return [date.getFullYear(),String(date.getMonth()+1).padStart(2,'0'),String(date.getDate()).padStart(2,'0')].join('-');};
  const dirty=()=>editing&&JSON.stringify(editing.data)!==editing.baseline;
  function getEntries(options={}){return Object.freeze(core.filter(state().settings,{today:today(),...options}));}
  function getSummary(){return core.summary(state().settings,today());}
  function publish(saved){
    readSequence++;const current=state(),before=current.settings?.[core.field];
    if(!before||before.revision<=saved.revision)current.settings={...(current.settings||{}),[core.field]:saved};
    try{root.dispatchEvent?.(new root.CustomEvent('wf-daily-tasks-change',{detail:{revision:saved.revision}}));}catch(_){}
  }
  async function readLatest(){
    if(typeof root.wfReadRaw!=='function')return true;
    const sequence=++readSequence;
    try{
      const stored=await root.wfReadRaw('settings','get','main');if(sequence!==readSequence)return false;
      core.data(stored);const settings={...(state().settings||{})};
      if(Object.hasOwn(stored||{},core.field))settings[core.field]=stored[core.field];else delete settings[core.field];
      state().settings=settings;return true;
    }catch(_){message='readError';return false;}
  }
  function errorMessage(cause){return ({TASK_CHANGED:'conflict',MISSING_TASK:'conflict',INVALID_TASKS:'readError',INVALID_TITLE:'required',INVALID_DATE:'invalidDate',TASK_CAPACITY:'capacity'})[cause?.message]||'saveError';}
  async function commit(intent){
    if(root.WFAccountAccess&&!root.WFAccountAccess.allow(intent.type==='delete'?'tasks.delete':'tasks.edit'))return false;
    if(busy)return false;busy=true;message='saving';render();
    try{await core.commit(intent,{writeBatch:operations=>root.wfWriteBatch(operations),publish});message=intent.type==='delete'?'removed':'saved';return true;}
    catch(cause){if(['TASK_CHANGED','MISSING_TASK'].includes(cause?.message))await readLatest();message=errorMessage(cause);return false;}
    finally{busy=false;render();}
  }
  function assignFields(){
    for(const key of ['title','notes','priority','dueDate','status'])ui.inputs[key].value=editing.data[key];
    ui.inputs.referenceKind.value=editing.data.reference?.kind||'';ui.inputs.referenceSearch.value='';referenceOptions();
  }
  async function begin(id){
    if(root.WFAccountAccess&&!root.WFAccountAccess.allow('tasks.edit'))return false;
    if(busy)return;busy=true;render();const loaded=await readLatest();busy=false;
    if(!loaded){render();return;}
    const row=id?getEntries().find(item=>item.id===id):null;
    if(id&&!row){message='conflict';render();return;}
    const data=row?{title:row.title,notes:row.notes,priority:row.priority,dueDate:row.dueDate,status:row.status,reference:row.reference?{...row.reference}:null}:{title:'',notes:'',priority:'normal',dueDate:'',status:'open',reference:null};
    editing={id:row?.id||'wf-task-'+(root.wfNewRecordId?.()||root.crypto?.randomUUID?.()||Date.now().toString(36)+'-'+(++unique)),revision:row?.revision,creating:!row,data,baseline:JSON.stringify(data)};
    message='';pendingDelete=null;assignFields();render();ui.inputs.title.focus?.({preventScroll:true});
  }
  async function save(){
    if(root.WFAccountAccess&&!root.WFAccountAccess.allow('tasks.edit'))return false;
    if(!editing||busy)return;
    if(!editing.data.title.trim()){message='required';render();ui.inputs.title.focus?.();return;}
    const captured=editing,at=new Date().toISOString();
    const intent=captured.creating?{type:'create',task:{id:captured.id,...captured.data},at}:{type:'update',id:captured.id,expectedRevision:captured.revision,patch:{...captured.data},at};
    if(await commit(intent)){editing=null;render();ui.add.focus?.({preventScroll:true});}
  }
  async function changeStatus(row,status){await commit({type:'update',id:row.id,expectedRevision:row.revision,patch:{status},at:new Date().toISOString()});}
  function sourceRows(kind){
    const current=state(),source=kind==='invoice'?current.invoices:kind==='product'?current.products:kind==='customer'?current.companies:[];
    return (Array.isArray(source)?source:[]).filter(row=>row&&row.id!=null).map(row=>({kind,id:String(row.id),label:String(kind==='invoice'?[row.invNo,row.companyName||row.buyerName].filter(Boolean).join(' · '):row.name||row.buyerName||row.id).slice(0,600)}));
  }
  function referenceOptions(){
    if(!editing)return;
    const kind=ui.inputs.referenceKind.value,query=ui.inputs.referenceSearch.value.trim().toLocaleLowerCase(),selected=editing.data.reference;
    const all=sourceRows(kind),found=all.filter(row=>!query||row.label.toLocaleLowerCase().includes(query)),shown=found.slice(0,100);
    if(selected?.kind===kind&&!shown.some(row=>row.id===selected.id))shown.unshift(all.find(row=>row.id===selected.id)||selected);
    referenceChoices=new Map(shown.map(row=>[row.id,row]));ui.inputs.reference.replaceChildren();
    const empty=make('option','',t('choose'));empty.value='';ui.inputs.reference.append(empty);
    for(const row of shown){const option=make('option','',row.label);option.value=row.id;ui.inputs.reference.append(option);}
    ui.inputs.reference.value=selected?.kind===kind?selected.id:'';
    ui.referenceFields.hidden=!kind;ui.referenceHint.hidden=found.length<=100;ui.referenceHint.textContent=t('referenceLimit');
  }
  function field(key,labelKey,tag='input',type='text'){
    const group=make('div','wf-task-field'),label=labelled('label','',labelKey);label.htmlFor='wfTask-'+key;
    const input=make(tag,'fi');input.id='wfTask-'+key;input.dataset.wfTaskField=key;if(tag==='input')input.type=type;
    ui.inputs[key]=input;group.append(label,input);return group;
  }
  function options(input,values){for(const value of values){const option=labelled('option','',value.key||value);option.value=value.value??value;input.append(option);}}
  function filterField(key,labelKey,values){
    const group=make('div','wf-task-filter'),label=labelled('label','',labelKey);label.htmlFor='wfTaskFilter-'+key;
    const input=make(values?'select':'input','fi');input.id='wfTaskFilter-'+key;input.dataset.wfTaskFilter=key;if(!values)input.type='search';else options(input,values);
    input.value=filters[key];input.addEventListener(values?'change':'input',()=>{filters[key]=input.value;visible=30;renderList();});ui.filterInputs[key]=input;group.append(label,input);return group;
  }
  const page=ops.register({id:'daily-tasks',parent:'dashboard',title:titles('title'),subtitle:titles('subtitle'),onEnter:async()=>{await readLatest();render();},onLanguage:()=>{for(const [node,key]of labels)node.textContent=t(key);if(editing)referenceOptions();render();}});
  ui.add=button('add',()=>begin(),'add','btn btn-p');ui.refresh=button('refresh',async()=>{await readLatest();render();});page.actions.append(ui.add,ui.refresh);
  const host=make('section','wf-daily-tasks');ui.notice=make('p','wf-task-notice');ui.notice.setAttribute('role','status');ui.notice.setAttribute('aria-live','polite');
  ui.metrics=make('div','wf-task-metrics');const toolbar=make('div','wf-task-toolbar');toolbar.append(filterField('query','search'),filterField('status','status',['all','open','done','cancelled']),filterField('due','dueDate',['all','today','overdue','upcoming',{value:'none',key:'noDate'}]),filterField('priority','priority',['all','high','normal','low']));
  ui.editor=make('section','wf-task-editor wf-ops-card');ui.editor.hidden=true;ui.editorHeading=make('h2');
  const grid=make('div','wf-task-editor-grid');const titleField=field('title','taskTitle');titleField.className+=' wf-task-wide';ui.inputs.title.maxLength=160;ui.inputs.title.required=true;
  const notesField=field('notes','notes','textarea');notesField.className+=' wf-task-wide';ui.inputs.notes.maxLength=2000;ui.inputs.notes.rows=3;
  grid.append(titleField,notesField,field('priority','priority','select'),field('dueDate','dueDate','input','date'),field('status','status','select'),field('referenceKind','referenceKind','select'));
  options(ui.inputs.priority,['normal','high','low']);options(ui.inputs.status,['open','done','cancelled']);options(ui.inputs.referenceKind,[{value:'',key:'none'},'invoice','product','customer']);
  ui.referenceFields=make('div','wf-task-reference-fields wf-task-wide');ui.referenceFields.append(field('referenceSearch','referenceSearch','input','search'),field('reference','reference','select'));ui.referenceHint=make('p','wf-ops-muted');ui.referenceFields.append(ui.referenceHint);grid.append(ui.referenceFields);
  for(const key of ['title','notes','dueDate','priority','status'])ui.inputs[key].addEventListener(['priority','status'].includes(key)?'change':'input',()=>{if(editing)editing.data[key]=ui.inputs[key].value;});
  ui.inputs.referenceKind.addEventListener('change',()=>{if(editing){editing.data.reference=null;ui.inputs.referenceSearch.value='';referenceOptions();}});
  ui.inputs.referenceSearch.addEventListener('input',referenceOptions);ui.inputs.reference.addEventListener('change',()=>{if(editing)editing.data.reference=referenceChoices.get(ui.inputs.reference.value)?{...referenceChoices.get(ui.inputs.reference.value)}:null;});
  const editorActions=make('div','wf-task-editor-actions');ui.save=button('save',save,'save','btn btn-p');ui.close=button('cancel',()=>{editing=null;message='';render();},'close');ui.reload=button('reload',()=>editing&&begin(editing.id));editorActions.append(ui.save,ui.close,ui.reload);ui.editor.append(ui.editorHeading,grid,editorActions);
  ui.deletePrompt=make('section','wf-task-delete-prompt');ui.deleteTitle=make('p');ui.confirmDelete=button('confirmDelete',async()=>{if(!pendingDelete)return;const row=pendingDelete;if(await commit({type:'delete',id:row.id,expectedRevision:row.revision,at:new Date().toISOString()}))pendingDelete=null;render();},'confirmDelete');ui.keep=button('keep',()=>{pendingDelete=null;render();});ui.deletePrompt.append(ui.deleteTitle,ui.confirmDelete,ui.keep);
  ui.list=make('div','wf-task-list');ui.empty=make('p','wf-ops-muted');ui.more=button('more',()=>{visible+=30;renderList();});
  host.append(ui.notice,ui.metrics,toolbar,ui.editor,ui.deletePrompt,ui.empty,ui.list,ui.more);page.body.append(host);
  function renderList(){
    let rows,summary;
    try{rows=getEntries(filters);summary=getSummary();}
    catch(_){message='readError';ui.notice.textContent=t(message);ui.notice.hidden=false;ui.metrics.replaceChildren();ui.list.replaceChildren();ui.empty.hidden=true;ui.more.hidden=true;return;}
    ui.metrics.replaceChildren();
    for(const key of ['open','today','overdue','done']){const control=make('button','wf-task-metric');control.type='button';control.append(make('strong','',summary[key]),make('span','',t(key)));control.addEventListener('click',()=>{filters.status=key==='done'?'done':'open';filters.due=['today','overdue'].includes(key)?key:'all';ui.filterInputs.status.value=filters.status;ui.filterInputs.due.value=filters.due;visible=30;renderList();});ui.metrics.append(control);}
    ui.empty.hidden=!!rows.length;ui.empty.textContent=t(summary.total?'noMatch':'empty');ui.list.replaceChildren();
    for(const row of rows.slice(0,visible)){
      const card=make('article','wf-task-card');card.dataset.wfTaskId=row.id;card.dataset.status=row.status;
      const head=make('div','wf-task-card-head'),title=make('h3','',row.title),status=make('span','wf-task-tag',t(row.status));head.append(title,status);
      const meta=make('div','wf-task-card-meta'),priority=make('span','wf-task-priority',t('priority')+': '+t(row.priority));priority.dataset.priority=row.priority;meta.append(priority);
      const date=make('span','',row.dueDate||t('noDate'));if(row.status==='open'&&row.dueDate&&row.dueDate<today()){date.className='wf-task-overdue';date.textContent=t('overdue')+' · '+row.dueDate;}meta.append(date);card.append(head,meta);
      if(row.notes)card.append(make('p','wf-task-notes',row.notes));
      if(row.reference)card.append(make('p','wf-task-reference',t(row.reference.kind)+': '+row.reference.label));
      const actions=make('div','wf-task-card-actions');
      const outcome=button(row.status==='open'?'complete':'reopen',()=>changeStatus(row,row.status==='open'?'done':'open'),row.status==='open'?'complete':'reopen');
      const edit=button('edit',()=>begin(row.id));
      const remove=button('delete',()=>{pendingDelete=row;render();ui.keep.focus?.({preventScroll:true});});
      for(const control of [outcome,edit,remove]){control.disabled=busy||!!editing;actions.append(control);}card.append(actions);ui.list.append(card);
    }
    ui.more.hidden=rows.length<=visible;
    for(const node of labels.keys())if(node.isConnected===false)labels.delete(node);
  }
  function render(){
    host.dir=ops.locale()==='ar'?'rtl':'ltr';host.lang=ops.locale();ui.notice.textContent=message?t(message):'';ui.notice.hidden=!message;ui.notice.dataset.error=String(!!message&&!['saving','saved','removed'].includes(message));
    ui.add.disabled=busy||!!editing;ui.refresh.disabled=busy;ui.editor.hidden=!editing;ui.editorHeading.textContent=t(editing?.creating?'newTask':'editTask');
    for(const input of Object.values(ui.inputs))input.disabled=busy;ui.save.disabled=busy;ui.close.disabled=busy;ui.reload.hidden=message!=='conflict'||!editing;ui.reload.disabled=busy;
    ui.deletePrompt.hidden=!pendingDelete;ui.deleteTitle.textContent=t('askDelete')+(pendingDelete?' '+pendingDelete.title:'');ui.confirmDelete.disabled=busy;ui.keep.disabled=busy;
    renderList();
  }
  function registerGuard(){root.WFAppUpdates?.registerGuard?.('daily-tasks',()=>!!busy||!!dirty());}
  registerGuard();root.addEventListener?.('load',registerGuard,{once:true});
  function open(id){if(id){const row=getEntries().find(item=>item.id===String(id));filters.query=row?.title||'';filters.status='all';ui.filterInputs.query.value=filters.query;ui.filterInputs.status.value='all';}render();return ops.open('daily-tasks');}
  render();return {open,getEntries,getSummary,refresh:async()=>{await readLatest();render();},hasUnsavedChanges:()=>!!dirty()};
});
