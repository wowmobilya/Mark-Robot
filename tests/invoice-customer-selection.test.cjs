'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const acorn=require('acorn');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const source=name=>{let start=html.indexOf('function '+name+'(');assert.ok(start>=0);if(html.slice(start-6,start)==='async ')start-=6;return html.slice(start,acorn.parseExpressionAt(html,start,{ecmaVersion:'latest'}).end);};
function fixture(company,selectedId){
  const nodes=new Map(),writes=[],notices=[];
  const get=id=>{if(!nodes.has(id))nodes.set(id,{value:'',textContent:'',style:{},innerHTML:''});return nodes.get(id);};
  get('invCoSel').value=selectedId;
  const S={lang:'en',companies:company?[company]:[],products:[],invoices:[],payments:[],settings:{nextNoExt:5000},invItems:[{productId:'p',name:'Table',qty:2,priceUSD:10,totalUSD:20,cbm:1,packets:2}],currentInvPayments:[],invType:'external',invCurrency:'USD',invTier:'A',invPayMethod:'cash',usdTry:40,usdEur:.92,printLang:'en',printOpts:{}};
  const context=vm.createContext({S,document:{getElementById:get},COUNTRY_NAMES:{TR:'Türkiye'},t:key=>key,showToast:message=>notices.push(message),getAutoInvNo:()=> 'W-5000',wfNewRecordId:()=> 'invoice-1',wfStatementPaymentUSD:p=>Number(p.amountUSD||0),
    async wfWriteBatch(operations){writes.push(structuredClone(operations));return operations.map(op=>structuredClone(op.value));},
    async wfPublishCommittedSettings(row){S.settings=row;},async wfPublishCommittedInvoice(row){S.invoices.push(row);},qblUpdateCartUI(){},updateDash(){},showPage(){},buildInvoiceHTML:()=>'',openModal(){},scheduleInvoicePdfPreparation(){}});
  context.window=context;
  for(const name of ['onCoSelect','saveInvoice','previewInvoice'])vm.runInContext(source(name),context);
  return {context,S,get,writes,notices};
}
test('numeric and quoted customer IDs resolve from the DOM select while save retains the original relationship type',async()=>{
  for(const id of [42,0,`عميل ' " <42>`]){
    const company={id,name:'عميل & Müşteri',country:'TR',type:'external',city:'İstanbul'};
    const f=fixture(company,String(id));const original=structuredClone(company);
    f.context.onCoSelect();assert.equal(f.get('step1Badge').textContent,company.name);assert.equal(f.get('invCountry').value,'Türkiye');
    const preview=f.context.previewInvoice(false);assert.equal(preview.companyName,company.name);assert.equal(preview.city,company.city);
    await f.context.saveInvoice();assert.equal(f.writes.length,1);const saved=f.writes[0].find(op=>op.store==='invoices').value;
    assert.equal(saved.companyId,id,'stored relation uses the actual customer ID, not the string DOM value');assert.equal(saved.companyName,company.name);assert.equal(saved.grandTotal,20);assert.equal(saved.items[0].qty,2);assert.deepEqual(company,original);
  }
});
test('a missing or removed selected customer cannot create an invoice or advance its counter',async()=>{
  for(const selected of ['', 'removed-customer', '42']){
    const f=fixture({id:'other',name:'Existing customer',type:'external'},selected);const before=structuredClone(f.S);
    await f.context.saveInvoice();assert.equal(f.writes.length,0);assert.deepEqual(f.S,before);assert.deepEqual(f.notices,['no_company']);
  }
});
