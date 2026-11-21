const test = require('node:test');
const assert = require('node:assert/strict');
const core = require('../invoice-archive-core.js');

const date = '2026-03-05T12:00:00.000Z';
const invoice = () => ({
  id:'inv-1', invNo:'W-42', companyName:'İpek', companyLogo:'/buyer.png',
  delivered:true, deliveredAt:'2026-02-01', currency:'TRY', grandTotal:31.5,
  payments:[{id:'pay-1',amountUSD:7}], items:[
    {productId:'p',name:'Sold oak table',image:'/sale.png',productSnapshot:{name:'Table',dims:[{l:42}]}}
  ]
});
const captureCosts = (row, at) => ({...row, items:row.items.map(item =>
  Object.hasOwn(item,'costSnapshot') ? item : {...item, costSnapshot:{unitCostUSD:12,capturedAt:at}})});

test('capture detaches nested sale details and snapshots both logos, using only the invoice for customer and line identity', () => {
  const original = invoice();
  const saved = core.capture(original,{issuerLogo:'/issuer.png',capturedAt:date,captureCosts,archiving:true});
  original.items[0].image='/changed.png';
  original.items[0].productSnapshot.dims[0].l=99;
  original.companyLogo='/new-buyer.png';
  assert.deepEqual(saved.packageLabelSnapshot,{version:1,companyLogo:'/issuer.png',customerLogo:'/buyer.png',capturedAt:date});
  assert.equal(saved.items[0].image,'/sale.png');
  assert.equal(saved.items[0].name,'Sold oak table');
  assert.equal(saved.items[0].productSnapshot.dims[0].l,42);
  assert.equal(original.items[0].costSnapshot,undefined);
  assert.deepEqual(saved.items[0].costSnapshot,{unitCostUSD:12,capturedAt:date});
  assert.equal(saved.archiveCostCapturedAt,date);
  const later=core.capture(saved,{issuerLogo:'/new-issuer.png',capturedAt:'2030-05-06',captureCosts});
  assert.deepEqual(later,saved);
});

test('preserve the historical issuer, empty logos and explicitly unknown costs; recording at sale is distinct from archive-time costing', () => {
  const row=invoice();
  row.issuerLogo='/invoice-issuer.png';
  row.companyLogo=null;
  row.items[0].costSnapshot=null;
  const first=core.capture(row,{issuerLogo:'/current-issuer.png',capturedAt:date,captureCosts,archiving:true});
  assert.equal(first.packageLabelSnapshot.companyLogo,'/invoice-issuer.png');
  assert.equal(first.packageLabelSnapshot.customerLogo,null);
  assert.equal(first.items[0].costSnapshot,null);
  assert.equal(first.archiveCostCapturedAt,undefined);
  const savedAtSale=core.capture(invoice(),{issuerLogo:'/issuer.png',capturedAt:date,captureCosts});
  assert.equal(savedAtSale.archiveCostCapturedAt,undefined);
  first.packageLabelSnapshot.companyLogo=null;
  assert.equal(core.capture(first,{issuerLogo:'/new.png',capturedAt:'2028-12-11'}).packageLabelSnapshot.companyLogo,null);
  const unknown={...row,packageLabelSnapshot:null};
  assert.equal(core.capture(unknown,{issuerLogo:'/new.png',capturedAt:date,archiving:true}).packageLabelSnapshot,null);
});

test('merges the transition into the newest row and restore preserves its ID, payments, delivery, label and cost snapshots', () => {
  const row=invoice();
  row.payments.push({id:'concurrent',amountUSD:8});
  const archived=core.mergeTransition(row,{id:row.id,action:'archive',capturedAt:date,issuerLogo:'/issuer.png'},{captureCosts});
  assert.equal(row.archived,undefined);
  assert.equal(archived.archivedAt,date);
  const duplicate=core.mergeTransition(archived,{id:row.id,action:'archive',capturedAt:'2033-01-01'},{captureCosts(){throw Error('recaptured');}});
  assert.deepEqual(duplicate,archived);
  const restored=core.mergeTransition(archived,{id:row.id,action:'restore'});
  assert.deepEqual(restored,{...archived,archived:false,archivedAt:null});
  assert.equal(archived.archived,true);
  assert.equal(restored.delivered,true);
  assert.deepEqual(restored.payments,row.payments);
  assert.throws(()=>core.mergeTransition(undefined,{id:row.id,action:'archive'}),/MISSING_INVOICE/);
  assert.throws(()=>core.mergeTransition(row,{id:'other',action:'archive'}),/MISSING_INVOICE/);
  assert.throws(()=>core.mergeTransition(row,{id:row.id,action:'delete'}),/INVALID_ACTION/);
});

test('published state follows a committed and hydrated transaction, including concurrent edits', async () => {
  const state=[invoice()];
  const fromDatabase={...state[0],notes:'concurrent update',companyLogo:'wf-media:img',payments:[{id:'late'}]};
  let finish;
  const writeBatch=async ([op])=>{
    assert.equal(op.type,'merge');assert.equal(op.store,'invoices');assert.equal(op.id,state[0].id);
    const result=op.merge(fromDatabase,{...op.value,issuerLogo:'wf-media:logo'});
    await new Promise(resolve=>{finish=resolve;});
    return [result];
  };
  const saved=core.commitTransition({id:state[0].id,action:'archive',capturedAt:date,issuerLogo:'/issuer.png'},{
    captureCosts,writeBatch,hydrate:async row=>({...row,companyLogo:'/hydrated.png'}),apply(row){state[0]=row;}
  });
  assert.equal(state[0].archived,undefined);
  finish();await saved;
  assert.equal(state[0].archived,true);
  assert.equal(state[0].notes,'concurrent update');
  assert.deepEqual(state[0].payments,[{id:'late'}]);
  assert.equal(state[0].companyLogo,'/hydrated.png');
  assert.equal(state[0].packageLabelSnapshot.companyLogo,'wf-media:logo');
});

test('failed write leaves prior state untouched, even when merge prepared a new row', async () => {
  const original=invoice();
  let current=original;
  await assert.rejects(core.commitTransition({id:original.id,action:'archive',capturedAt:date},{
    captureCosts,writeBatch:async ([op])=>{op.merge(original,op.value);throw new Error('storage full');},
    hydrate:r=>r,apply:r=>{current=r;}
  }),/storage full/);
  assert.equal(current,original);assert.deepEqual(current,invoice());
});

test('displays canonical USD and only the saved currency conversion, distinguishing unknown and zero', () => {
  const base={grandTotal:100,currency:'TRY',usdTry:35,usdEur:0.91};
  assert.deepEqual(core.amounts(base),{usd:100,currency:'TRY',native:3500});
  assert.equal(core.amounts({...base,currency:'EUR'}).native,91);
  assert.deepEqual(core.amounts({currency:'EUR',grandTotalUSD:0}),{usd:0,currency:'EUR',native:null});
  for(const rate of ['',null,0,-1,{},true,Infinity,'NaN']) assert.equal(core.amounts({...base,usdTry:rate}).native,null);
  assert.equal(core.amounts({...base,grandTotal:''}).usd,null);
  assert.equal(core.amounts({...base,currency:'GBP'}).native,null);
  assert.deepEqual(core.amounts({grandTotal:0}),{usd:0,currency:'USD',native:0});
  assert.equal(core.amounts({grandTotal:1,currency:'TL',rates:{usdTry:35}}).native,35);
  assert.equal(core.amounts({grandTotal:1,currency:'SYP',usdSyp:10000}).native,10000);
  assert.deepEqual(core.totals([{grandTotal:0.1},{grandTotal:0.2}]),{count:2,usd:0.3});
  assert.deepEqual(core.totals([base,{}]),{count:2,usd:null});
});

test('archived date filters and search handle incomplete legacy records without writes or fabricated dates', () => {
  const rows=[null,{id:'no-date',archived:true,createdAt:date},{id:'active',invNo:'A'},{
    id:'old',archived:true,invNo:'R-44',companyName:'İpek',archivedAt:'2025-02-22T02:00:00Z'
  },{id:'new',archived:true,companyName:'Ирина',archivedAt:date}];
  assert.deepEqual(core.filter(rows,{}).map(r=>r.id),['new','old','no-date']);
  assert.deepEqual(core.filter(rows,{sort:'oldest'}).map(r=>r.id),['old','new','no-date']);
  assert.deepEqual(core.filter(rows,{query:'iPEK'}).map(r=>r.id),['old']);
  assert.deepEqual(core.filter(rows,{query:'r-44',year:'2025',month:'02'}).map(r=>r.id),['old']);
  assert.deepEqual(core.filter(rows,{year:'2026',month:'02'}),[]);
  assert.deepEqual(core.filter(rows,{month:'03'}).map(r=>r.id),['new']);
  assert.deepEqual(core.filter(rows,{query:'ирина'}).map(r=>r.id),['new']);
  assert.deepEqual(core.filter([null,undefined,0,{},false],{}),[]);
  assert.equal(rows[1].archivedAt,undefined);
});

test('native archive page searches without writing, opens existing preview and label routes, and requires inline confirmation before every commit', async () => {
  const fs=require('node:fs');
  const vm=require('node:vm');
  const path=require('node:path');
  const costing=require('../product-cost-core.js');
  const statement=require('../account-statement-core.js');

  class Element {
    constructor(tag, classes='', text='') {
      this.tag=tag; this.className=classes; this.caption=String(text);
      this.children=[]; this.handlers={}; this.value=''; this.attrs={};
      this.classList={
        contains:token=>this.className.split(' ').includes(token),
        add:token=>{this.className+=' '+token;}
      };
    }
    get textContent(){return this.caption+this.children.map(child=>child.textContent).join('');}
    set textContent(value){this.caption=String(value);this.children=[];}
    append(...nodes){for(const node of nodes)this.children.push(...(node.tag==='#fragment'?node.children:[node]));}
    replaceChildren(...nodes){this.children=[];this.caption='';this.append(...nodes);}
    addEventListener(name,handler){this.handlers[name]=handler;}
    setAttribute(name,value){this.attrs[name]=value;}
    all(){return this.children.flatMap(node=>[node,...node.all()]);}
    querySelector(query){return this.all().find(node=>query.split(',').map(s=>s.trim()).some(s=>s.startsWith('.')?node.classList.contains(s.slice(1)):node.tag===s));}
    focus(){}
    scrollIntoView(){}
  }
  const make=(...args)=>new Element(...args);
  let definition,guard,language='en',calls=0,locked=false;
  let stored={...invoice(),usdTry:2};
  let state={invoices:[structuredClone(stored)],settings:{logo:'/brand.png'},products:[{id:'p',costing:{currency:'USD',unitCostUSD:12}}]};
  const shell={page:make('section'),actions:make('div'),body:make('div')};
  const previews=[],labels=[];
  const context={
    WFInvoiceArchiveCore:core,WOWStatementCore:statement,
    WFOperations:{
      make, icon:()=>'<svg/>',locale:()=>language,state:()=>state,notify(){},
      register(spec){definition=spec;return shell;},
      open(){shell.page.classList.add('active');definition.onEnter();}
    },
    WFCosting:{
      captureInvoiceCosts:(row,at)=>costing.captureInvoiceCosts(row,state.products,at),
      invoiceSummary:costing.invoiceSummary
    },
    WFAppUpdates:{registerGuard(id,callback){assert.equal(id,'invoice-archive');guard=callback;}},
    WFPackageLabels:{open:id=>labels.push(id)},previewSaved:id=>previews.push(id),
    document:{createDocumentFragment:()=>make('#fragment'),addEventListener(){}},
    wfWriteBatch:async ([op])=>{
      calls++;
      if(locked) throw Error('storage full');
      stored=op.merge(stored,op.value);
      return [structuredClone(stored)];
    },
    wfHydrateDBValue:async row=>row
  };
  context.window=context;
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../invoice-archive.js'),'utf8'),context);
  const api=context.WFInvoiceArchive;
  const getButton=(element,name)=>element.all().find(node=>node.tag==='button'&&node.textContent===name);
  const prompt=()=>shell.body.querySelector('.wf-archive-prompt');
  const click=(element,name)=>getButton(element,name).handlers.click();
  api.open();
  for(const lang of ['ar','tr','en','fr','ru']) {
    language=lang;definition.onLanguage();
    assert(definition.title[lang]);
    assert.equal(shell.body.all().filter(node=>node.tag==='select').length,3);
    assert(shell.actions.querySelector('button').textContent);
  }
  language='en';definition.onLanguage();
  await click(shell.actions,'Archive an invoice');
  const picker=prompt().querySelector('select');
  picker.value='0';picker.handlers.change();
  assert.equal(guard(),true);
  assert.equal(calls,0);assert(prompt().textContent.includes('Archive this invoice?'));
  await click(prompt(),'Cancel');
  assert.equal(guard(),false);
  api.archive('inv-1');
  stored.payments.push({id:'late',amountUSD:14});
  stored.items[0].qty=2;
  await click(prompt(),'Archive');
  assert.equal(guard(),false);
  assert.equal(calls,1);
  assert.equal(state.invoices[0].payments.length,2);
  assert.equal(state.invoices[0].items[0].costSnapshot.unitCostUSD,12);
  const card=shell.body.querySelector('.wf-archive-card');
  assert(card.textContent.includes('Cost captured at archiving'));assert(card.textContent.includes('24.00'));
  const search=shell.body.querySelector('input');
  search.value='not found';search.handlers.input();
  assert.equal(shell.body.querySelector('input'),search);
  assert(shell.body.textContent.includes('No matching invoices.'));
  await click(shell.body,'Clear filters');
  await click(shell.body,'Preview');await click(shell.body,'Print labels');
  assert.deepEqual(previews,['inv-1']);assert.deepEqual(labels,['inv-1']);assert.equal(calls,1);
  await click(shell.body,'Restore');
  locked=true;await click(prompt(),'Restore');
  assert.equal(calls,2);assert(shell.body.textContent.includes('Could not save'));
  assert.equal(state.invoices[0].archived,true);assert.equal(guard(),true);
  locked=false;await click(prompt(),'Restore');
  assert.equal(calls,3);assert.equal(guard(),false);
  assert.equal(state.invoices[0].archived,false);assert.equal(state.invoices[0].delivered,true);
  assert.deepEqual(state.invoices[0].payments,stored.payments);
  assert.equal(state.invoices[0].packageLabelSnapshot.companyLogo,'/brand.png');
});
