const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const core=require('../manufacturing-core.js');
const labels=require('../package-label-core.js');
const printHelpers=require('../package-labels.js');
const source=fs.readFileSync(path.resolve(__dirname,'../manufacturing.js'),'utf8');
const flush=()=>new Promise(resolve=>setImmediate(resolve));
function deferred(){let resolve,reject;const promise=new Promise((ok,fail)=>{resolve=ok;reject=fail;});return {promise,resolve,reject};}

class Node {
  constructor(tag,classes='',text=''){this.tag=tag;this.className=classes;this.content=String(text);this.children=[];this.attrs={};this.handlers={};this.dataset={};this.hidden=false;this.disabled=false;this.value='';this.classList={contains:key=>this.className.split(' ').includes(key)};}
  set textContent(value){this.content=String(value);this.children=[];}
  get textContent(){return this.content+this.children.map(child=>child.textContent).join('');}
  append(...nodes){for(const child of nodes){if(child.tag==='fragment')this.append(...child.children);else{this.children.push(child);child.parent=this;}}}
  replaceChildren(...children){this.children=[];this.content='';this.append(...children);}
  replaceWith(node){const index=this.parent.children.indexOf(this);this.parent.children[index]=node;node.parent=this.parent;}
  setAttribute(key,value){this.attrs[key]=String(value);}
  addEventListener(key,handler){this.handlers[key]=handler;}
  all(){return this.children.flatMap(child=>[child,...child.all()]);}
  invoke(event){return this.handlers[event]?.({stopPropagation(){}});}
  click(){if(!this.disabled)return this.invoke('click');}
}
const make=(...args)=>new Node(...args);
function fixture() {
  const invoice={id:'i',invNo:'W-60',companyName:'Client',archived:false,delivered:false,
    items:[{name:'Oak',color:'Red',image:'/red.png',qty:2,packets:3,dimensions:'90×50×40'}]};
  const state={invoices:[structuredClone(invoice)]},toasts=[];
  let saved=structuredClone(invoice),writeCount=0,definition,guard,language='en',pause,fail=false,popup=null,tick;
  let image=deferred();
  const shell={page:make('section'),body:make('div'),actions:make('div')};
  const document={baseURI:'https://example.test/app/',createDocumentFragment:()=>make('fragment'),getElementById:()=>null,addEventListener(){}};
  const root={
    document,WFManufacturingCore:core,WFPackageLabelCore:labels,
    WFPackageLabelHelpers:{withTimeout:printHelpers.withTimeout,waitForImage:()=>image.promise},
    WFAppUpdates:{registerGuard(name,fn){assert.equal(name,'manufacturing');guard=fn;}},
    WFOperations:{locale:()=>language,make,state:()=>state,register(spec){definition=spec;return shell;},
      open(id){assert.equal(id,'manufacturing');shell.page.className='active';definition.onEnter();return true;},notify:(msg,type)=>toasts.push([msg,type])},
    open:()=>popup,wfNewRecordId:()=> 't-1',wfHydrateDBValue:async row=>structuredClone(row),
    async wfWriteBatch([op]){
      writeCount++;const next=op.merge(saved,op.value);
      if(pause)await pause.promise;
      if(fail)throw Error('Quota');
      saved=structuredClone(next);return [structuredClone(next)];
    },
    dbGet:async()=>structuredClone(saved),
    setInterval(fn){tick=fn;return 1;},clearInterval(){tick=null;},
    URL
  };
  root.window=root;
  vm.runInNewContext(source,root);
  return {root,state,shell,toasts,guard:()=>guard(),writes:()=>writeCount,data:()=>saved,edit:fn=>{saved=fn(saved);},fail:value=>{fail=value;},
    pause:()=>{pause=deferred();return pause;},lang:value=>{language=value;definition.onLanguage();},
    get:(node,id)=>node.all().find(child=>child.id===id),
    find:(node,tag)=>node.all().find(child=>child.tag===tag),
    button:(node,label)=>node.all().find(child=>child.tag==='button'&&child.textContent===label),
    setPopup(){
      const fonts=deferred();image=deferred();
      popup={document:{head:make('head'),body:make('body'),documentElement:{},fonts:{ready:fonts.promise},createElement:make},
        closed:false,native:0,focused:0,focus(){this.focused++;},print(){this.native++;},close(){this.closed=true;},matchMedia:()=>({matches:false})};
      return {popup,fonts,image};
    },tick:()=>tick?.()};
}
test('native ticket creation is explicit; saves guard drafts and pending commits, and retry a failed note update without changing delivery',async()=>{
 const f=fixture(),api=f.root.WFManufacturing;
 api.open('i');assert.equal(f.writes(),0);
 const create=f.get(f.shell.body,'wfMfgCreate');
 assert(create);const barrier=f.pause();const pending=create.click();
 assert(f.guard());assert.equal(f.state.invoices[0].manufacturingTicket,undefined);
 barrier.resolve();await pending;assert(!f.guard());assert.equal(f.writes(),1);
 assert.match(f.shell.body.textContent,/Copied from the saved invoice on/);
 const note=f.find(f.shell.body,'textarea');note.value='Cut the left edge';note.invoke('input');
 assert(f.guard());assert(f.get(f.shell.actions,'wfMfgPrint').disabled);
 f.fail(true);await f.button(f.shell.body,'Save change').click();
 assert(f.guard());assert.equal(f.data().manufacturingTicket.lines[0].note,'');assert.equal(f.find(f.shell.body,'textarea').value,note.value);
 f.fail(false);await f.button(f.shell.body,'Save change').click();assert(!f.guard());
 assert.equal(f.data().manufacturingTicket.lines[0].note,'Cut the left edge');assert.equal(f.data().delivered,false);
 assert.match(f.shell.body.textContent,/Line history/);
 for(const [lang,label] of [['ar','طباعة البطاقة'],['tr','Fişi yazdır'],['fr','Imprimer la fiche'],['ru','Печать задания'],['en','Print ticket']]){
   f.lang(lang);assert.equal(f.get(f.shell.actions,'wfMfgPrint').textContent,label);
 }
 const search=f.get(f.shell.body,'wfMfgSearch');search.value='nothing';search.invoke('input');
 assert.match(f.shell.body.textContent,/No matching invoices/);assert.equal(f.get(f.shell.body,'wfMfgSearch'),search);
});
test('same-line conflict preserves a local draft, exposes the latest saved note and lets the operator reconcile explicitly',async()=>{
 const f=fixture();f.root.WFManufacturing.open('i');await f.get(f.shell.body,'wfMfgCreate').click();
 const note=f.find(f.shell.body,'textarea');note.value='Local revision';note.invoke('input');
 f.edit(row=>core.merge(row,{kind:'update',id:'i',ticketId:'t-1',lineId:'line-1',at:new Date().toISOString(),base:{note:''},changes:{note:'New remote note'}}));
 await f.button(f.shell.body,'Save change').click();
 assert.match(f.shell.body.textContent,/changed in another session/);assert(f.button(f.shell.body,'Save change').disabled);
 await f.button(f.shell.body,'Load saved line').click();
 assert.equal(f.find(f.shell.body,'textarea').value,'Local revision');assert.match(f.shell.body.textContent,/New remote note/);
 await f.button(f.shell.body,'Save change').click();assert.equal(f.data().manufacturingTicket.lines[0].note,'Local revision');assert(!f.guard());
});
test('reloading a conflicted line cannot restore an invoice deleted while its photos hydrate',async()=>{
 const f=fixture();f.root.WFManufacturing.open('i');await f.get(f.shell.body,'wfMfgCreate').click();
 const note=f.find(f.shell.body,'textarea');note.value='Keep the local instruction';note.invoke('input');
 f.edit(row=>core.merge(row,{kind:'update',id:'i',ticketId:'t-1',lineId:'line-1',at:new Date().toISOString(),base:{note:''},changes:{note:'Remote instruction'}}));
 await f.button(f.shell.body,'Save change').click();
 const stale=structuredClone(f.data()),gate=deferred();let first=true;
 f.root.dbGet=async()=>{if(first){first=false;return gate.promise;}return structuredClone(f.data());};
 const loading=f.button(f.shell.body,'Load saved line').click();
 f.edit(()=>null);f.state.invoices.splice(0);
 gate.resolve(stale);await loading;
 assert.equal(f.state.invoices.length,0);
 assert.match(f.shell.body.textContent,/no longer available/);
 const retained=f.find(f.shell.body,'textarea');
 assert(retained,'the deleted invoice’s unsaved note remains accessible');
 assert.equal(retained.value,'Keep the local instruction');assert.equal(retained.readOnly,true);
 assert.match(f.shell.body.textContent,/W-60/);assert.match(f.shell.body.textContent,/Oak/);assert(f.guard());
 for(const [language,caption] of [['ar','تجاهل التعديل'],['tr','Değişikliği sil'],['fr','Annuler la saisie'],['ru','Отменить правку'],['en','Discard edit']]){
   f.lang(language);assert(f.button(f.shell.body,caption));assert.equal(f.find(f.shell.body,'textarea').value,'Keep the local instruction');
 }
 f.button(f.shell.body,'Discard edit').click();
 assert(!f.guard());assert.equal(f.find(f.shell.body,'textarea'),undefined);
 assert.equal(f.state.invoices.length,0);assert.equal(f.data(),null);assert.equal(f.writes(),2);
});
test('reloading a conflicted line preserves a payment committed while its photos hydrate',async()=>{
 const f=fixture();f.root.WFManufacturing.open('i');await f.get(f.shell.body,'wfMfgCreate').click();
 const note=f.find(f.shell.body,'textarea');note.value='Keep the local instruction';note.invoke('input');
 f.edit(row=>core.merge(row,{kind:'update',id:'i',ticketId:'t-1',lineId:'line-1',at:new Date().toISOString(),base:{note:''},changes:{note:'Remote instruction'}}));
 await f.button(f.shell.body,'Save change').click();
 const stale=structuredClone(f.data()),gate=deferred();let first=true;
 f.root.dbGet=async()=>{if(first){first=false;return gate.promise;}return structuredClone(f.data());};
 const loading=f.button(f.shell.body,'Load saved line').click();
 f.edit(row=>({...row,payments:[{id:'late-payment',amountUSD:25}]}));
 f.state.invoices[0]=structuredClone(f.data());
 gate.resolve(stale);await loading;
 assert.deepEqual(f.state.invoices[0].payments,[{id:'late-payment',amountUSD:25}]);
 assert.equal(f.find(f.shell.body,'textarea').value,'Keep the local instruction');
 assert.match(f.shell.body.textContent,/Remote instruction/);
});
test('a failed fresh reload retains both the newest visible invoice and the operator’s unsaved note',async()=>{
 const f=fixture();f.root.WFManufacturing.open('i');await f.get(f.shell.body,'wfMfgCreate').click();
 const note=f.find(f.shell.body,'textarea');note.value='Keep the local instruction';note.invoke('input');
 f.edit(row=>core.merge(row,{kind:'update',id:'i',ticketId:'t-1',lineId:'line-1',at:new Date().toISOString(),base:{note:''},changes:{note:'Remote instruction'}}));
 await f.button(f.shell.body,'Save change').click();
 const stale=structuredClone(f.data()),gate=deferred();let first=true;
 f.root.dbGet=async()=>{if(first){first=false;return gate.promise;}throw Error('Media read failed');};
 const loading=f.button(f.shell.body,'Load saved line').click();
 f.edit(row=>({...row,payments:[{id:'late-payment',amountUSD:25}]}));
 const latest=structuredClone(f.data());f.state.invoices[0]=latest;
 gate.resolve(stale);await loading;
 assert.equal(f.state.invoices[0],latest);
 assert.equal(f.find(f.shell.body,'textarea').value,'Keep the local instruction');
 assert.match(f.shell.body.textContent,/Could not save/);
 assert(f.guard());
});
test('print readiness waits for photos and fonts, remains guarded while the detached preview is open and records no production changes',async()=>{
 const f=fixture();f.root.WFManufacturing.open('i');await f.get(f.shell.body,'wfMfgCreate').click();
 const committed=structuredClone(f.data()), button=f.get(f.shell.actions,'wfMfgPrint');
 button.click();assert.match(f.toasts.at(-1)[0],/Could not open/);assert(!f.guard());
 const {popup,fonts,image}=f.setPopup();
 button.click();assert(f.guard());assert.equal(popup.native,0);
 assert.equal(f.find(popup.document.body,'img').src,'https://example.test/red.png');
 image.resolve();await flush();assert.equal(popup.native,0);
 fonts.resolve();await flush();assert.equal(popup.native,1);assert(f.guard());
 popup.focus();f.tick();assert(f.guard());assert(!popup.closed);
 assert.deepEqual(f.data(),committed);assert.equal(f.writes(),1);
 popup.close();f.tick();assert(!f.guard());assert(!button.disabled);
});
test('a failed saved photo is reported and does not print a partial ticket',async()=>{
 const f=fixture();f.root.WFManufacturing.open('i');await f.get(f.shell.body,'wfMfgCreate').click();
 const {popup,fonts,image}=f.setPopup();f.get(f.shell.actions,'wfMfgPrint').click();
 image.reject(Error('load'));fonts.resolve();await flush();
 assert.equal(popup.native,0);assert.match(popup.document.body.textContent,/could not load/);
 assert(f.find(popup.document.body,'button').disabled);assert(f.guard());
 popup.close();f.tick();assert(!f.guard());
});
