const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const core=require('../label-reprint-history-core.js');
const file=path.join(__dirname,'../label-reprint-history.js');
const createController=fs.existsSync(file)?require(file):null;
class Element {
  constructor(tag='div'){this.tagName=tag;this.children=[];this.dataset={};this.attributes={};this.events={};this.hidden=false;this.value='';this.open=false;this.isConnected=true;this.replacements=0;}
  set textContent(value){this.text=String(value);this.children=[];}
  get textContent(){return (this.text||'')+this.children.map(child=>child.textContent||'').join(' ');}
  append(...children){this.children.push(...children);for(const child of children)child.parentElement=this;}
  replaceChildren(...children){this.text='';this.children=[];this.append(...children);this.replacements++;}
  setAttribute(key,value){this.attributes[key]=String(value);}
  getAttribute(key){return this.attributes[key]??null;}
  addEventListener(type,fn){(this.events[type]||=([])).push(fn);}
  async fire(type){await Promise.all((this.events[type]||[]).map(fn=>fn({type,target:this,preventDefault(){}})));}
  focus(){this.focused=true;}
}
const descendants=node=>[node,...node.children.flatMap(descendants)];
const job=()=>({invoiceId:'i1',invoiceNumber:'W-42',customerName:'İpek',mode:'selected',sourceFingerprint:'wfpl-v1-aabbccdd',profileId:'tw2004',
  paperProfile:{id:'tw2004',name:'Tanex TW-2004',stockWidthMM:99.1,stockHeightMM:139},originalLabelCount:4,selectedLabelCount:1,
  labels:[{labelId:'l3',sequenceNumber:3,lineIndex:0,productId:'p1',name:'Table',color:'Oak',unitIndex:1,currentPacket:2,totalPackets:2,quantity:2}]});
function fixture(settings={}){
  assert.equal(typeof createController,'function');
  const state={settings:{authPerson:'Registered person',...settings},invoices:[{id:'i1',invNo:'W-42',items:[{qty:2,packets:2}],grandTotal:100}],products:[{stock:12}]};
  let stored=structuredClone(state.settings),id=0,fail=false,writes=0,lang='en';
  const pages=new Map(),events=[],root={document:{createElement:tag=>new Element(tag),documentElement:{lang:'en'}},crypto:{randomUUID:()=>`job-${++id}`},
    CustomEvent:class{constructor(type,options){this.type=type;this.detail=options?.detail;}},dispatchEvent:event=>events.push(event),
    wfWriteBatch:async operations=>{writes++;if(fail)throw Error('storage full');for(const op of operations){assert.equal(op.store,'settings');stored=op.merge(stored,structuredClone(op.value));}return[structuredClone(stored)];}};
  root.WFOperations={state:()=>state,locale:()=>lang,label:id=>id==='print-history'?'Print history':'',
    register(definition){const page={body:new Element(),actions:new Element(),definition};pages.set(definition.id,page);return page;},
    open(id){pages.get(id)?.definition.onEnter?.();return true;}};
  const api=createController(root,core),host=new Element();api.mount(host,{invoiceId:'i1'});
  return{api,state,host,pages,events,root,get writes(){return writes;},set fail(value){fail=value;},setLang(value){lang=value;api.mount(host,{invoiceId:'i1'});},
    find:(name,value)=>descendants(host).find(node=>node.dataset[name]===value),stored:()=>stored};
}

test('only post-dialog confirmation marks an exact saved request printed; repeated mounts stay read-only',async()=>{
  const f=fixture(),before=structuredClone({invoices:f.state.invoices,products:f.state.products});
  const id=await f.api.recordRequested(job(),{reason:'lost'});
  assert.equal(f.api.getEntries()[0].status,'requested');
  assert(!f.find('wfReprintConfirm','printed'),'no physical-result confirmation while native dialog is active');
  const writes=f.writes,children=f.host.children.slice();
  for(let i=0;i<10;i++)f.api.mount(f.host,{invoiceId:'i1'});
  assert.equal(f.writes,writes);assert.deepEqual(f.host.children,children);
  await f.api.recordDialogClosed(id);
  assert.equal(f.api.getEntries()[0].status,'awaiting_confirmation');
  const confirm=f.find('wfReprintConfirm','printed');assert(confirm);
  await confirm.fire('click');
  assert.equal(f.api.getEntries()[0].status,'printed');
  assert.equal(f.api.getEntries()[0].labels[0].sequenceNumber,3);
  assert.equal(f.api.getEntries()[0].operator.name,'Registered person');
  assert.deepEqual({invoices:f.state.invoices,products:f.state.products},before);
  assert.equal(f.api.getSummary().printedLabels,1);
});

test('persistence failures are visible and failed updates leave pending requests recoverable',async()=>{
  const f=fixture();f.fail=true;
  await assert.rejects(f.api.recordRequested(job()),/storage full/);
  assert.match(f.host.textContent,/could not|couldn.t|save|saved/i);
  assert.equal(f.api.getEntries().length,0);
  f.fail=false;const id=await f.api.recordRequested(job());f.fail=true;
  await assert.rejects(f.api.recordDialogClosed(id),/storage full/);
  assert.equal(f.api.getEntries()[0].status,'requested');
  assert(f.find('wfReprintConfirm','cancelled'),'dialog has closed even if its status update could not be persisted');
  f.fail=false;await f.find('wfReprintConfirm','cancelled').fire('click');
  assert.equal(f.api.getEntries()[0].status,'cancelled');
  assert.equal(f.api.getSummary().printedLabels,0);
});

test('a pending request restored after reload can be resolved and localization does not create storage writes',async()=>{
  const row=core.createRequest(job(),{id:'restored',now:'2026-11-21T10:00:00.000Z'});
  const settings=core.mergeChange({id:'main'},{type:'request',request:row});
  const f=fixture(settings);assert(f.find('wfReprintConfirm','printed'));
  for(const lang of ['ar','tr','en','fr','ru']){f.setLang(lang);assert(f.host.textContent.length>50);assert(!f.host.textContent.includes('undefined'));}
  assert.equal(f.writes,0);
  await f.find('wfReprintConfirm','cancelled').fire('click');
  assert.equal(f.api.getEntries()[0].status,'cancelled');
  assert.equal(f.api.getEntries()[0].operator,null);
});

test('standalone history filters by real invoice snapshots and outcomes and preserves a bounded collapsed list',async()=>{
  const f=fixture();assert(f.pages.has('print-history'));
  const one=await f.api.recordRequested(job());await f.api.recordDialogClosed(one);
  const two=await f.api.recordRequested({...job(),invoiceId:'i2',invoiceNumber:'X-19',customerName:'Irina'});
  await f.api.recordFailed(two,'native failure');
  const page=f.pages.get('print-history');f.api.open();
  const search=descendants(page.body).find(node=>node.dataset.wfReprintSearch!==undefined);
  const select=descendants(page.body).find(node=>node.dataset.wfReprintFilter!==undefined);
  assert(search);assert(select);
  search.value='Irina';await search.fire('input');
  const rows=()=>descendants(page.body).filter(node=>node.dataset.wfReprintRecord);
  assert.deepEqual(rows().map(row=>row.dataset.wfReprintRecord),[two]);
  search.value='';await search.fire('input');select.value='pending';await select.fire('change');
  assert.deepEqual(rows().map(row=>row.dataset.wfReprintRecord),[one]);
  assert(rows().every(row=>!row.open));
  assert.equal(f.api.getEntries().length,2);
});

test('a malformed saved audit is shown as a read error instead of an invented empty history',()=>{
  const f=fixture({labelReprintHistory:null});
  assert.throws(()=>f.api.getEntries(),/INVALID_HISTORY/);
  assert.match(f.host.textContent,/could not be read/i);
});

test('an older unresolved request can be confirmed from its expanded report without resolving a newer request',async()=>{
  let settings={id:'main'};
  for(let index=1;index<=4;index++)settings=core.mergeChange(settings,{type:'request',request:core.createRequest(job(),{id:'restored-'+index,now:`2026-11-21T10:0${index}:00.000Z`})});
  const f=fixture(settings),older=f.find('wfReprintRecord','restored-1');
  older.open=true;await older.fire('toggle');
  const confirm=descendants(older).find(node=>node.dataset.wfReprintConfirm==='cancelled');assert(confirm);
  await confirm.fire('click');
  assert.equal(f.api.getEntries().find(row=>row.id==='restored-1').status,'cancelled');
  assert.equal(f.api.getEntries().find(row=>row.id==='restored-4').status,'requested');
});
