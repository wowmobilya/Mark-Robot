/* Personal work planning stored independently from invoices, stock and accounting. */
(function(root,factory){
  'use strict';const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;else root.WFDailyTasksCore=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const field='dailyTasks',limits=Object.freeze({maxTasks:1000});
  const statuses=['open','done','cancelled'],priorities=['low','normal','high'];
  const own=(value,key)=>Object.prototype.hasOwnProperty.call(value||{},key);
  const object=value=>value&&typeof value==='object'&&!Array.isArray(value);
  const integer=value=>Number.isSafeInteger(value)&&value>=0;
  function text(value,max){const result=typeof value==='string'?value:'';if(result.length>max)throw Error('INVALID_TEXT');return result;}
  function identity(value){const id=String(value??'').trim();if(!id||id.length>200)throw Error('INVALID_ID');return id;}
  function timestamp(value){if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}T/.test(value)||!Number.isFinite(Date.parse(value)))throw Error('INVALID_DATE');return new Date(value).toISOString();}
  function day(value){
    if(value==null||value==='')return '';
    if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))throw Error('INVALID_DATE');
    const date=new Date(value+'T00:00:00.000Z');
    if(!Number.isFinite(date.getTime())||date.toISOString().slice(0,10)!==value)throw Error('INVALID_DATE');return value;
  }
  function reference(value){
    if(value==null||value==='')return null;
    if(!object(value)||!['invoice','product','customer'].includes(value.kind))throw Error('INVALID_REFERENCE');
    return {kind:value.kind,id:identity(value.id),label:text(value.label,600)||identity(value.id)};
  }
  function clean(value){
    const title=text(value.title,160).trim();if(!title)throw Error('INVALID_TITLE');
    const priority=value.priority??'normal',status=value.status??'open';
    if(!priorities.includes(priority))throw Error('INVALID_PRIORITY');if(!statuses.includes(status))throw Error('INVALID_STATUS');
    return {title,notes:text(value.notes??'',2000),priority,dueDate:day(value.dueDate),status,reference:reference(value.reference)};
  }
  function data(settings){
    if(!own(settings,field))return {version:1,revision:0,items:[]};
    const saved=settings[field];
    if(!object(saved)||saved.version!==1||!integer(saved.revision)||!Array.isArray(saved.items)||
      saved.items.some(row=>!object(row)||typeof row.id!=='string'||!row.id||!integer(row.revision)||row.revision<1||!statuses.includes(row.status)||!priorities.includes(row.priority))||
      new Set(saved.items.map(row=>row.id)).size!==saved.items.length)throw Error('INVALID_TASKS');
    return saved;
  }
  function frozen(row){return Object.freeze({...row,reference:row.reference?Object.freeze({...row.reference}):null});}
  function mergeChange(stored,intent,policy=limits){
    const settings=object(stored)?stored:{id:'main'},before=data(settings),items=before.items.slice(),at=timestamp(intent?.at);
    if(intent.type==='create'){
      if(items.length>=policy.maxTasks)throw Error('TASK_CAPACITY');
      const id=identity(intent.task?.id);if(items.some(row=>row.id===id))throw Error('ID_COLLISION');
      items.push(frozen({id,...clean(intent.task),createdAt:at,updatedAt:at,revision:1}));
    }else if(intent.type==='update'||intent.type==='delete'){
      const index=items.findIndex(row=>row.id===intent.id);if(index<0)throw Error('MISSING_TASK');
      const previous=items[index];if(previous.revision!==intent.expectedRevision)throw Error('TASK_CHANGED');
      if(intent.type==='delete')items.splice(index,1);
      else{
        if(!object(intent.patch))throw Error('INVALID_PATCH');
        const patch=Object.fromEntries(['title','notes','priority','dueDate','status','reference'].filter(key=>own(intent.patch,key)).map(key=>[key,intent.patch[key]]));
        const values=clean({...previous,...patch});
        if(Object.keys(values).every(key=>JSON.stringify(values[key])===JSON.stringify(previous[key])))return settings;
        items[index]=frozen({...previous,...values,updatedAt:at,revision:previous.revision+1});
      }
    }else throw Error('INVALID_ACTION');
    return {...settings,id:'main',[field]:{version:1,revision:before.revision+1,items}};
  }
  async function commit(intent,{writeBatch,publish}){
    const [settings]=await writeBatch([{store:'settings',type:'merge',id:'main',value:intent,merge:mergeChange}]);
    const saved=data(settings);await publish?.(saved);
    const row=saved.items.find(item=>item.id===(intent.type==='create'?intent.task.id:intent.id));return row?frozen(row):null;
  }
  const normalize=value=>String(value??'').normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().trim();
  function filter(settings,options={}){
    const query=normalize(options.query),today=options.today||'';
    return data(settings).items.filter(row=>(!options.status||options.status==='all'||row.status===options.status)&&
      (!options.priority||options.priority==='all'||row.priority===options.priority)&&
      (!query||normalize([row.title,row.notes,row.reference?.label].join(' ')).includes(query))&&
      (!options.due||options.due==='all'||(options.due==='today'?row.status==='open'&&row.dueDate===today:
        options.due==='overdue'?row.status==='open'&&row.dueDate&&row.dueDate<today:
        options.due==='upcoming'?row.status==='open'&&row.dueDate>today:options.due==='none'?!row.dueDate:false)))
      .slice().sort((a,b)=>Number(b.status==='open')-Number(a.status==='open')||priorities.indexOf(b.priority)-priorities.indexOf(a.priority)||
        (a.dueDate||'9999').localeCompare(b.dueDate||'9999')||String(a.createdAt).localeCompare(String(b.createdAt))||a.id.localeCompare(b.id)).map(frozen);
  }
  function summary(settings,today){
    const result={total:0,open:0,done:0,cancelled:0,today:0,overdue:0};
    for(const row of data(settings).items){result.total++;result[row.status]++;if(row.status==='open'&&row.dueDate){if(row.dueDate===today)result.today++;else if(row.dueDate<today)result.overdue++;}}
    return result;
  }
  return {field,limits,data,day,mergeChange,commit,filter,summary};
});
