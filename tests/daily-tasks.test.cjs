const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const core=require('../daily-tasks-core.js');
const file=path.join(__dirname,'../daily-tasks.js');
const createController=fs.existsSync(file)?require(file):null;
class Element{
  constructor(tag='div'){this.tagName=tag;this.children=[];this.dataset={};this.attributes={};this.events={};this.value='';this.hidden=false;this.isConnected=true;}
  set textContent(value){this.text=String(value);this.children=[];}get textContent(){return(this.text||'')+this.children.map(node=>node.textContent||'').join(' ');}
  append(...children){this.children.push(...children);}replaceChildren(...children){this.text='';this.children=[];this.append(...children);}
  setAttribute(key,value){this.attributes[key]=String(value);}addEventListener(type,fn){(this.events[type]||=([])).push(fn);}
  async fire(type){await Promise.all((this.events[type]||[]).map(fn=>fn({type,target:this,preventDefault(){}})));}focus(){}
}
const descendants=node=>[node,...node.children.flatMap(descendants)];
function fixture(){
  assert.equal(typeof createController,'function');
  const state={settings:{companyName:'WOW'},invoices:[{id:'i1',invNo:'W-42',companyName:'İpek',items:[{qty:2}],grandTotal:100}],companies:[{id:'c1',name:'İpek'}],products:[{id:'p1',name:'Oak table',stock:5}]};
  let stored=structuredClone(state.settings),writes=0,fail=false,lang='en',id=0;const pages=new Map();
  const root={document:{createElement:tag=>new Element(tag)},crypto:{randomUUID:()=>`task-${++id}`},
    wfReadRaw:async()=>structuredClone(stored),wfWriteBatch:async operations=>{writes++;if(fail)throw Error('storage full');const op=operations[0];assert.equal(op.store,'settings');stored=op.merge(stored,op.value);return[structuredClone(stored)];},
    CustomEvent:class{constructor(type,options){this.type=type;this.detail=options?.detail;}},dispatchEvent(){},
    WFOperations:{state:()=>state,locale:()=>lang,register(definition){const page={body:new Element(),actions:new Element(),definition};pages.set(definition.id,page);return page;},open:()=>true}};
  const api=createController(root,core),page=pages.get('daily-tasks');
  const find=(name,value)=>[...descendants(page.body),...descendants(page.actions)].find(node=>node.dataset[name]===value);
  return{api,state,page,root,find,set fail(value){fail=value;},get writes(){return writes;},stored:()=>stored,setLang(value){lang=value;page.definition.onLanguage();},external(intent){stored=core.mergeChange(stored,intent);}};
}

test('task editor saves only after a committed transaction and uses an explicit existing invoice reference',async()=>{
  const f=fixture(),before=structuredClone({invoices:f.state.invoices,companies:f.state.companies,products:f.state.products});
  await f.find('wfTaskAction','add').fire('click');
  const title=f.find('wfTaskField','title');title.value='Recheck missing table labels';await title.fire('input');
  const kind=f.find('wfTaskField','referenceKind');kind.value='invoice';await kind.fire('change');
  const reference=f.find('wfTaskField','reference');reference.value='i1';await reference.fire('change');
  f.fail=true;await f.find('wfTaskAction','save').fire('click');assert.equal(f.api.getEntries().length,0);assert.equal(title.value,'Recheck missing table labels');
  assert.match(f.page.body.textContent,/saved|save/i);
  f.fail=false;await f.find('wfTaskAction','save').fire('click');
  const row=f.api.getEntries()[0];assert.equal(row.title,'Recheck missing table labels');assert.deepEqual(row.reference,{kind:'invoice',id:'i1',label:'W-42 · İpek'});
  assert.deepEqual({invoices:f.state.invoices,companies:f.state.companies,products:f.state.products},before);
});

test('task completion and confirmed deletion operate on their captured task IDs',async()=>{
  const f=fixture();await f.find('wfTaskAction','add').fire('click');
  const title=f.find('wfTaskField','title');title.value='Verify package';await title.fire('input');await f.find('wfTaskAction','save').fire('click');
  await f.find('wfTaskAction','complete').fire('click');assert.equal(f.api.getEntries()[0].status,'done');
  const filter=f.find('wfTaskFilter','status');filter.value='all';await filter.fire('change');
  await f.find('wfTaskAction','delete').fire('click');assert.equal(f.api.getEntries().length,1);
  await f.find('wfTaskAction','confirmDelete').fire('click');assert.equal(f.api.getEntries().length,0);
});

test('a concurrent task edit is preserved and the user draft stays available for conflict review',async()=>{
  const f=fixture();await f.find('wfTaskAction','add').fire('click');
  const title=f.find('wfTaskField','title');title.value='Original';await title.fire('input');await f.find('wfTaskAction','save').fire('click');
  await f.find('wfTaskAction','edit').fire('click');title.value='My draft';await title.fire('input');
  const row=f.api.getEntries()[0];f.external({type:'update',id:row.id,expectedRevision:row.revision,patch:{title:'Another editor'},at:'2026-11-21T12:00:00.000Z'});
  await f.find('wfTaskAction','save').fire('click');
  assert.equal(f.stored().dailyTasks.items[0].title,'Another editor');assert.equal(title.value,'My draft');
  assert.match(f.page.body.textContent,/changed|latest/i);
  assert.equal(f.api.getEntries()[0].title,'Another editor');
});

test('reading, filtering, and all five languages create no tasks or storage writes',async()=>{
  const f=fixture();await f.page.definition.onEnter();
  for(const lang of ['ar','tr','en','fr','ru']){f.setLang(lang);assert(f.page.body.textContent.length>40);assert(!f.page.body.textContent.includes('undefined'));}
  const query=f.find('wfTaskFilter','query');query.value='missing';await query.fire('input');
  assert.equal(f.writes,0);assert.deepEqual(f.api.getEntries(),[]);
});
