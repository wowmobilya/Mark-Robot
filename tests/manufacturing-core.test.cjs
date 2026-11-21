const test=require('node:test');
const assert=require('node:assert/strict');
const core=require('../manufacturing-core.js');
const now='2026-11-21T10:00:00.000Z';
const later='2026-11-21T11:00:00.000Z';
function invoice(){return {id:1,invNo:'W432',companyName:'Ada',delivered:false,payments:[{id:'p'}],items:[
  {productId:'table',name:'Oak',qty:2,color:'Red',dimPieces:[{l:33,w:20,h:15}],image:'wfmedia:red',productSnapshot:{type:'coffee_table',packets:3,color:'Black'}},
  {productId:'table',name:'Oak',qty:1,color:'Blue',image:null,productSnapshot:{image:'later.png',packets:1}},
  {productId:'table',name:'Oak',qty:4,color:'Red'}
]};}
const create={kind:'create',id:1,ticketId:'ticket-1',at:now};
const patch=(line,changes,base)=>({kind:'update',id:1,ticketId:'ticket-1',lineId:line.id,base:base||{status:line.status,note:line.note},changes,at:later});

test('one ticket captures sold variants independently, prefers explicit saved values, detaches dimensions and freezes the source invoice identity',()=>{
 const before=invoice(), result=core.merge(before,create), ticket=result.manufacturingTicket;
 assert.deepEqual(before,invoice());assert.equal(ticket.version,1);assert.equal(ticket.id,'ticket-1');
 assert.equal(ticket.createdAt,now);assert.equal(ticket.invoiceNo,'W432');assert.equal(ticket.customerName,'Ada');
 assert.deepEqual(ticket.lines.map(line=>[line.item.name,line.item.color,line.item.qty]),[['Oak','Red',2],['Oak','Blue',1],['Oak','Red',4]]);
 assert.equal(new Set(ticket.lines.map(line=>line.id)).size,3);
 assert.equal(ticket.lines[0].item.packets,3);assert.equal(ticket.lines[0].item.type,'coffee_table');
 assert.equal(ticket.lines[1].item.image,null);assert.equal(ticket.lines[2].item.packets,null);
 before.items[0].dimPieces[0].l=200;assert.equal(ticket.lines[0].item.dimPieces[0].l,33);
 const edited={...result,invNo:'Changed',companyName:'Different',items:[]};
 assert.equal(core.merge(edited,{...create,ticketId:'duplicate',at:later}),edited);
 assert.equal(edited.manufacturingTicket.invoiceNo,'W432');
 assert.equal(core.merge({...before,archived:true},create).manufacturingTicket.archivedAtCapture,true);
});
test('missing invoices, empty orders, invalid quantities and unsupported documents cannot become newly manufactured units',()=>{
 assert.throws(()=>core.merge(null,create),/MISSING_INVOICE/);
 assert.throws(()=>core.merge({...invoice(),items:[]},create),/EMPTY_INVOICE/);
 for(const qty of [0,-1,'',null,'no',false,1.5,Infinity])assert.throws(()=>core.merge({...invoice(),items:[{qty}]},create),/INVALID_QUANTITY/);
 const unsupported={...invoice(),manufacturingTicket:{version:8,lines:[]}};
 assert.throws(()=>core.merge(unsupported,create),/UNSUPPORTED_TICKET/);
});
test('status and notes target a stable line, preserve all other invoice fields, and record an idempotent dated change',()=>{
 const original=core.merge(invoice(),create), first=original.manufacturingTicket.lines[0];
 const change=patch(first,{status:'in_progress',note:'Use matte finish.'});
 const next=core.merge(original,change), line=next.manufacturingTicket.lines[0];
 assert.equal(first.status,'pending');assert.equal(line.status,'in_progress');assert.equal(line.updatedAt,later);
 assert.deepEqual(line.history.at(-1),{at:later,status:'in_progress',note:'Use matte finish.'});
 assert.equal(core.merge(next,change),next);
 const done=core.merge(next,patch(line,{status:'completed'}));
 assert.equal(done.manufacturingTicket.lines[0].status,'completed');
 assert.equal(done.manufacturingTicket.lines[0].note,'Use matte finish.');
 assert.equal(done.manufacturingTicket.lines[1].status,'pending');assert.equal(done.delivered,false);assert.deepEqual(done.payments,[{id:'p'}]);
 assert.throws(()=>core.merge(next,patch(first,{status:'fabricated'})),/INVALID_CHANGE/);
 assert.throws(()=>core.merge(next,{...change,ticketId:'wrong'}),/MISSING_TICKET/);
});
test('different workers can update distinct fields and lines; conflicting notes on the same line never overwrite each other',()=>{
 const start=core.merge(invoice(),create), [a,b]=start.manufacturingTicket.lines;
 let latest=core.merge(start,patch(a,{note:'First note'}));
 latest=core.merge(latest,patch(a,{status:'completed'}));
 latest=core.merge(latest,patch(b,{status:'in_progress'}));
 assert.equal(latest.manufacturingTicket.lines[0].note,'First note');
 assert.equal(latest.manufacturingTicket.lines[1].status,'in_progress');
 assert.throws(()=>core.merge(latest,patch(a,{note:'Stale note'})),/CONFLICT/);
 assert.deepEqual(core.progress(latest.manufacturingTicket),{status:'in_progress',completed:1,total:3});
 assert.equal(core.progress(null).status,'unopened');
 assert(core.matches(latest,{status:'in_progress',search:'blue'}));
 assert(core.matches(latest,{status:'all',search:'W432'}));
 assert(!core.matches(latest,{status:'completed',search:''}));
 assert(!core.matches(latest,{status:'all',search:'anything else'}));
});
test('a failed transaction leaves state untouched; a successful commit hydrates the new ticket before publishing it',async()=>{
 const state={invoices:[invoice()]};const before=structuredClone(state.invoices[0]);let release;
 const options={state,writeBatch:async([op])=>{assert.equal(op.type,'merge');assert.equal(op.store,'invoices');const saved=op.merge({...before,notes:'Latest'},op.value);await new Promise(r=>{release=r;});return [saved];},hydrate:async row=>({...row,hydrated:true})};
 const pending=core.commit(create,options);assert.deepEqual(state.invoices[0],before);release();await pending;
 assert.equal(state.invoices[0].hydrated,true);assert.equal(state.invoices[0].notes,'Latest');
 const saved=state.invoices[0];
 await assert.rejects(core.commit(patch(saved.manufacturingTicket.lines[0],{note:'draft'}),{...options,writeBatch:async([op])=>{op.merge(saved,op.value);throw Error('quota');}}),/quota/);
 assert.equal(state.invoices[0],saved);
});
test('ordinary invoice edits retain the transaction’s freshest manufacturing ticket and do not resurrect a deleted invoice or stale ticket',()=>{
 const newest=core.merge(invoice(),create),stale={...invoice(),notes:'edited',manufacturingTicket:{version:1,id:'stale'}};
 assert.equal(core.preserveTicket(newest,stale).manufacturingTicket.id,'ticket-1');
 assert.equal(core.preserveTicket(newest,stale).notes,'edited');
 assert(!Object.hasOwn(core.preserveTicket(invoice(),stale),'manufacturingTicket'));
 assert.equal(core.preserveTicket({...invoice(),manufacturingTicket:null},stale).manufacturingTicket,null);
 assert.throws(()=>core.preserveTicket(null,stale),/MISSING_INVOICE/);
});
test('a payment committed locally while ticket media hydrates remains visible after the ticket save',async()=>{
 const initial=invoice(), state={invoices:[initial]};let finish,stored;
 const commit=core.commit(create,{state,writeBatch:async([op])=>{stored=op.merge(initial,op.value);return [stored];},
   hydrate:row=>new Promise(resolve=>{finish=()=>resolve(row);}),read:async(store,id)=>{assert.equal(store,'invoices');assert.equal(id,1);return structuredClone(stored);}});
 await Promise.resolve();
 stored={...stored,payments:[...stored.payments,{id:'late',amountUSD:25}]};state.invoices[0]=structuredClone(stored);
 finish();await commit;assert.deepEqual(state.invoices[0].payments,stored.payments);assert.equal(state.invoices[0].manufacturingTicket.id,'ticket-1');
});
test('legacy piece units stay detached and duplicate line identifiers in an imported ticket are rejected',()=>{
 const row=invoice();row.items[0].dimPieces=[{length:200,width:100,height:10,unit:'mm',label:'leg'}];
 const saved=core.merge(row,create);
 row.items[0].dimPieces[0].unit='cm';
 assert.deepEqual(saved.manufacturingTicket.lines[0].item.dimPieces[0],{length:200,width:100,height:10,unit:'mm',label:'leg'});
 saved.manufacturingTicket.lines[1].id=saved.manufacturingTicket.lines[0].id;
 assert(!core.isTicket(saved.manufacturingTicket));
 assert.throws(()=>core.merge(saved,patch(saved.manufacturingTicket.lines[0],{note:'wrong row'})),/UNSUPPORTED_TICKET/);
});
test('two simultaneous creation requests resolve to the ticket created by the first committing writer',async()=>{
 let stored=invoice(),tail=Promise.resolve();const state={invoices:[structuredClone(stored)]};
 const writeBatch=([op])=>{
   const task=tail.then(()=>{stored=op.merge(stored,op.value);return [structuredClone(stored)];});
   tail=task;return task;
 };
 const deps={state,writeBatch,hydrate:async row=>row,read:async()=>structuredClone(stored)};
 const [a,b]=await Promise.all([core.commit(create,deps),core.commit({...create,ticketId:'second'},deps)]);
 assert.equal(a.manufacturingTicket.id,'ticket-1');assert.equal(b.manufacturingTicket.id,'ticket-1');
 assert.equal(state.invoices.length,1);assert.equal(stored.manufacturingTicket.lines.length,3);
});
