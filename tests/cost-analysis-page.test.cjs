const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const analysis=require('../cost-analysis-core.js');
const costs=require('../product-cost-core.js');

class Node {
  constructor(tag,cls='',text='') {
    this.tag=tag;this.className=cls;this.textContent=text;this.children=[];this.dataset={};
    this.attributes={};this.listeners={};this.hidden=false;
  }
  append(...items){this.children.push(...items);}
  replaceChildren(...items){this.children=items;}
  setAttribute(key,value){this.attributes[key]=String(value);}
  addEventListener(key,fn){this.listeners[key]=fn;}
  fire(key,value){if(value!==undefined)this.value=value;this.listeners[key]?.();}
  descendants(){return [this,...this.children.flatMap(node=>node.descendants())];}
}
function mount(items, read) {
  let definition, lang='en', opened, lastRead;
  const body=new Node('div'), app={products:items,settings:{}};
  const ops={
    make:(...params)=>new Node(...params),state:()=>app,locale:()=>lang,
    register:entry=>{definition=entry;return {body};},open:id=>{opened=id;return id===definition.id;}
  };
  const context={WFOperations:ops,WFCostAnalysisCore:analysis,WFCostCore:costs,
    dbGet:(store,key)=>{lastRead=[store,key];return read?.();},WFCosting:{open:id=>{opened=id;}}};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../cost-analysis.js'),'utf8'),context);
  const all=()=>body.descendants();
  return {
    api:context.WFCostAnalysis,definition,body,app,all,opened:()=>opened,lastRead:()=>lastRead,
    id:id=>all().find(n=>n.id===id), cls:cls=>all().find(n=>n.className===cls),
    tag:tag=>all().find(n=>n.tag===tag),filter:id=>all().find(n=>n.dataset.filter===id),
    lang:locale=>{lang=locale;definition.onLanguage();}
  };
}

test('normal entry, controls, cost-sheet navigation and five locales use saved data with no writes',async()=>{
  const data=[
    {id:1,name:'Alpha',costing:{unitCostUSD:60,currency:'TRY',updatedAt:'2026-02-01'},priceA:75,priceB:30},
    {id:2,name:'Beta',costing:{unitCostUSD:null},priceA:25},
    {id:3,name:'<img src=x>',priceA:5}
  ], before=JSON.stringify(data);
  const ui=mount(data,()=>({value:40,eur:.9}));
  assert.equal(ui.api.open(),true);assert.equal(ui.opened(),'cost-analysis');
  await ui.definition.onEnter();assert.deepEqual(ui.lastRead(),['settings','usdTry']);
  assert.equal(ui.tag('tbody').children.length,3);
  ui.id('wfAnalysisTier').fire('change','B');ui.filter('belowCost').fire('click');
  assert.equal(ui.tag('tbody').children.length,1);
  assert.equal(ui.tag('tbody').children[0].dataset.loss,'true');
  ui.cls('wf-analysis-open').fire('click');assert.equal(ui.opened(),1);
  ui.id('wfAnalysisCurrency').fire('change','TRY');
  assert.match(ui.cls('wf-analysis-note').textContent,/1 USD = 40 TRY/);
  const input=ui.id('wfAnalysisSearch');input.fire('input','Alpha');
  for(const l of ['ar','tr','en','fr','ru']){
    ui.lang(l);assert.equal(ui.id('wfAnalysisSearch'),input);assert.equal(input.value,'Alpha');
    assert(ui.definition.title[l]);assert(ui.definition.subtitle[l]);assert.equal(ui.tag('tbody').children.length,1);
    assert(ui.all().every(node=>!String(node.textContent).includes('undefined')));
  }
  ui.lang('en');ui.id('wfAnalysisSearch').fire('input','absent');
  assert.equal(ui.tag('tbody').children.length,0);assert(!ui.cls('wf-ops-empty').hidden);
  assert.equal(JSON.stringify(data),before);
});

test('a late rate read cannot overwrite a newer refresh, and failed reads leave USD data usable',async()=>{
  const replies=[];
  const ui=mount([{name:'P',id:1,costing:{unitCostUSD:10},priceA:20}],()=>new Promise((resolve,reject)=>replies.push({resolve,reject})));
  const first=ui.api.refresh(), second=ui.api.refresh();
  ui.id('wfAnalysisCurrency').fire('change','TRY');
  replies[1].resolve({value:40});await second;
  replies[0].resolve({value:99});await first;
  assert.match(ui.cls('wf-analysis-note').textContent,/1 USD = 40 TRY/);
  const third=ui.api.refresh();replies[2].reject(new Error('read failed'));await third;
  assert.match(ui.cls('wf-analysis-note').textContent,/No saved exchange rate/);
  ui.id('wfAnalysisCurrency').fire('change','USD');assert(ui.cls('wf-analysis-note').hidden);
  assert.equal(ui.tag('tbody').children.length,1);
});

test('large catalogs reveal all matches progressively; refresh reads the latest product cost',async()=>{
  const items=Array.from({length:55},(_,id)=>({id,name:'Product '+id,priceA:20,costing:{unitCostUSD:10}}));
  const ui=mount(items);await ui.api.refresh();
  assert.equal(ui.tag('tbody').children.length,50);
  const more=ui.cls('btn btn-s wf-analysis-more');assert(!more.hidden);more.fire('click');
  assert.equal(ui.tag('tbody').children.length,55);assert(more.hidden);
  ui.app.products[0]={...items[0],costing:{unitCostUSD:30}};
  await ui.api.refresh();ui.filter('belowCost').fire('click');
  assert.equal(ui.tag('tbody').children.length,1);
  assert.equal(ui.cls('wf-analysis-open').textContent,'Product 0');
});
