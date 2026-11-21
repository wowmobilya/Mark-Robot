const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const file=path.join(__dirname,'../daily-tasks-core.js');
const core=fs.existsSync(file)?require(file):{};
const now='2026-11-21T10:00:00.000Z',later='2026-11-21T11:00:00.000Z';
const task=(id='t1',patch={})=>({id,title:'Check missing labels',notes:'Confirm the package copy with the warehouse',priority:'high',dueDate:'2026-11-21',status:'open',reference:{kind:'invoice',id:'i1',label:'W-42 · İpek'},...patch});
const create=(value=task())=>({type:'create',task:value,at:now});
const update=(id,expectedRevision,patch)=>({type:'update',id,expectedRevision,patch,at:later});

test('creates a detached task with planned date, explicit record reference and no business-data edits',()=>{
  assert.equal(typeof core.mergeChange,'function');
  const settings={id:'main',companyName:'WOW',labelReprintHistory:{version:1,revision:4,entries:[]}},before=structuredClone(settings),input=task();
  const saved=core.mergeChange(settings,create(input));
  assert.deepEqual(settings,before);assert.deepEqual(saved.labelReprintHistory,before.labelReprintHistory);
  const row=saved.dailyTasks.items[0];assert.equal(row.title,'Check missing labels');assert.equal(row.dueDate,'2026-11-21');
  assert.equal(row.createdAt,now);assert.equal(row.updatedAt,now);assert.equal(row.revision,1);
  input.reference.label='Changed elsewhere';assert.equal(row.reference.label,'W-42 · İpek');
  assert.equal(saved.dailyTasks.revision,1);
});

test('rejects empty titles, impossible dates and unknown status/priority/reference without silently normalizing them',()=>{
  for(const patch of [{title:' '},{dueDate:'2026-02-30'},{dueDate:'21/11/2026'},{priority:'urgent'},{status:'printing'},{reference:{kind:'account',id:'x'}}])
    assert.throws(()=>core.mergeChange({},create(task('t1',patch))),/INVALID_/);
  assert.throws(()=>core.mergeChange({dailyTasks:null},create()),/INVALID_TASKS/);
});

test('updates the latest task with optimistic revision checks and rejects ID collisions',()=>{
  const one=core.mergeChange({id:'main'},create());
  const edited=core.mergeChange({...one,companyName:'Concurrent edit'},update('t1',1,{title:'Check two missing labels',dueDate:'2026-11-22'}));
  assert.equal(edited.companyName,'Concurrent edit');assert.equal(edited.dailyTasks.items[0].title,'Check two missing labels');
  assert.equal(edited.dailyTasks.items[0].notes,task().notes);assert.equal(edited.dailyTasks.items[0].revision,2);
  assert.equal(one.dailyTasks.items[0].title,'Check missing labels');
  assert.throws(()=>core.mergeChange(edited,update('t1',1,{status:'done'})),/TASK_CHANGED/);
  assert.throws(()=>core.mergeChange(edited,create()),/ID_COLLISION/);
  assert.throws(()=>core.mergeChange(edited,update('missing',1,{status:'done'})),/MISSING_TASK/);
});

test('completion, reopening, cancellation and deletion affect only the selected task',()=>{
  let saved=core.mergeChange({},create());saved=core.mergeChange(saved,create(task('t2')));
  saved=core.mergeChange(saved,update('t1',1,{status:'done'}));assert.equal(saved.dailyTasks.items[0].status,'done');
  saved=core.mergeChange(saved,update('t1',2,{status:'open'}));assert.equal(saved.dailyTasks.items[0].status,'open');
  saved=core.mergeChange(saved,update('t1',3,{status:'cancelled'}));assert.equal(saved.dailyTasks.items[0].status,'cancelled');
  assert.throws(()=>core.mergeChange(saved,{type:'delete',id:'t1',expectedRevision:1,at:later}),/TASK_CHANGED/);
  saved=core.mergeChange(saved,{type:'delete',id:'t1',expectedRevision:4,at:later});
  assert.deepEqual(saved.dailyTasks.items.map(row=>row.id),['t2']);assert.equal(saved.dailyTasks.items[0].status,'open');
});

test('concurrent tasks merge in one settings store and failed commits never publish',async()=>{
  let saved={id:'main',labelReprintHistory:{version:1,revision:2,entries:[]}},queue=Promise.resolve(),published=0;
  const writeBatch=operations=>{const run=queue.then(()=>{assert.equal(operations.length,1);const op=operations[0];assert.equal(op.store,'settings');assert.equal(op.type,'merge');assert.equal(op.id,'main');saved=op.merge(saved,op.value);return[saved];});queue=run.catch(()=>{});return run;};
  await Promise.all([core.commit(create(task('a')),{writeBatch,publish:()=>published++}),core.commit(create(task('b')),{writeBatch,publish:()=>published++})]);
  assert.deepEqual(saved.dailyTasks.items.map(row=>row.id),['a','b']);assert.equal(saved.labelReprintHistory.revision,2);assert.equal(published,2);
  await assert.rejects(core.commit(update('a',1,{status:'done'}),{writeBatch:async()=>{throw Error('disk full');},publish:()=>published++}),/disk full/);
  assert.equal(published,2);assert.equal(saved.dailyTasks.items[0].status,'open');
});

test('task filters and counts use planned local dates without marking a task completed or sending reminders',()=>{
  let saved={};
  for(const row of [task('old',{dueDate:'2026-11-20'}),task('today'),task('future',{dueDate:'2026-11-22',priority:'low'}),task('none',{dueDate:''}),task('done',{status:'done',dueDate:'2026-11-20'})])saved=core.mergeChange(saved,create(row));
  assert.deepEqual(core.filter(saved,{due:'overdue',today:'2026-11-21'}).map(row=>row.id),['old']);
  assert.deepEqual(core.filter(saved,{due:'today',today:'2026-11-21'}).map(row=>row.id),['today']);
  assert.deepEqual(core.filter(saved,{query:'ipek',priority:'low'}).map(row=>row.id),['future']);
  assert.deepEqual(core.summary(saved,'2026-11-21'),{total:5,open:4,done:1,cancelled:0,today:1,overdue:1});
  assert.equal(saved.dailyTasks.items[0].status,'open');assert(Object.isFrozen(core.filter(saved)[0]));
});

test('capacity blocks new tasks instead of deleting existing work',()=>{
  const saved=core.mergeChange({},create());
  assert.throws(()=>core.mergeChange(saved,create(task('t2')),{maxTasks:1}),/TASK_CAPACITY/);
  assert.equal(saved.dailyTasks.items.length,1);
});
