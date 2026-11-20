const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const between=(from,to)=>html.slice(html.indexOf(from),html.indexOf(to,html.indexOf(from)));
const schedulerSource=between('const WF_RENDER_TIMERS=','function wfToggleSearch(');
function scheduler(extra={}) {
  let id=0;const timers=new Map(),frames=new Map();
  const context={
    setTimeout(fn){const key=++id;timers.set(key,fn);return key;},
    clearTimeout(key){timers.delete(key);},
    requestAnimationFrame(fn){const key=++id;frames.set(key,fn);return key;},
    cancelAnimationFrame(key){frames.delete(key);},...extra
  };
  vm.createContext(context);vm.runInContext(schedulerSource,context);
  const flush=map=>{const jobs=[...map.values()];map.clear();for(const job of jobs)job();};
  return {context,timers,frames,tick:()=>flush(timers),paint:()=>flush(frames)};
}

test('a burst of list search input produces one render using the final query',()=>{
  const s=scheduler();let query='',seen=[];
  for(const value of ['K','K4','K40','K400']){query=value;s.context.wfDebouncedRender('pr',()=>seen.push(query));}
  assert.equal(s.timers.size,1);s.tick();assert.equal(s.frames.size,1);s.paint();
  assert.deepEqual(seen,['K400']);
});

test('new input cancels an older animation-frame render as well as its timeout',()=>{
  const s=scheduler(),seen=[];
  s.context.wfDebouncedRender('pr',()=>seen.push('old'));s.tick();
  s.context.wfDebouncedRender('pr',()=>seen.push('latest'));
  assert.equal(s.frames.size,0);s.paint();assert.deepEqual(seen,[]);
  s.tick();s.paint();assert.deepEqual(seen,['latest']);
});

test('route changes cancel every outstanding list and barcode initialization job',()=>{
  const s=scheduler(),seen=[];
  s.context.wfDebouncedRender('pr',()=>seen.push('products'));s.tick();
  s.context.wfDebouncedRender('qbl-init',()=>seen.push('camera'));
  s.context.wfDebouncedRender('invoice-products',()=>seen.push('selector'));
  s.context.wfCancelPendingRenders();s.tick();s.paint();
  assert.deepEqual(seen,[]);assert.equal(s.timers.size+s.frames.size,0);
});

test('pagehide cancels a queued camera frame before suspension and retains scanner cleanup',()=>{
  let onPageHide,started=0,stopped=0,interval;
  const s=scheduler({window:{addEventListener(name,handler){if(name==='pagehide')onPageHide=handler;}},
    S:{scannerInterval:42},qblStopCamera:()=>stopped++,clearInterval:value=>{interval=value;}});
  const start=html.indexOf("window.addEventListener('pagehide',()=>{");
  const end=html.indexOf('},{passive:true});',start)+'},{passive:true});'.length;
  vm.runInContext(html.slice(start,end),s.context);
  s.context.wfDebouncedRender('qbl-init',()=>started++);s.tick();assert.equal(s.frames.size,1);
  onPageHide();s.paint();
  assert.equal(started,0);assert.equal(stopped,1);assert.equal(interval,42);
  assert.equal(s.context.S.scannerInterval,null);assert.equal(s.frames.size,0);
});

test('an immediate list render supersedes its pending search without rerendering twice',()=>{
  for(const [name,key] of [
    ['renderCo','co'],['renderPr','pr'],
    ['renderInvList','inv'],['renderPrSelector','invoice-products']
  ]){
    const s=scheduler({document:{getElementById:()=>null}});let stale=0;
    s.context.wfDebouncedRender(key,()=>stale++);s.tick();
    // Execute the actual renderer's entry through its no-host return. Its first
    // operation must cancel pending work even when the old page was removed.
    const start=html.indexOf('function '+name+'(){');
    const returnEnd=html.indexOf('return;',start)+'return;'.length;
    vm.runInContext(html.slice(start,returnEnd)+'}',s.context);
    s.context[name]();s.paint();assert.equal(stale,0,name);
  }
});

test('shared money formatting keeps existing strings and uses current exchange rates',()=>{
  let constructors=0;
  const NativeNumberFormat=Intl.NumberFormat;
  const state={usdTry:32.5,usdEur:.92};
  const context={S:state,Intl:{NumberFormat:function(...args){constructors++;return new NativeNumberFormat(...args);}}};
  vm.createContext(context);vm.runInContext(between('const usdToTry=','const CC_CONFIGS ='),context);
  for(const amount of [0,-0,.001,.005,1.005,-12.125,1234567.891,Number.MAX_SAFE_INTEGER,Infinity,NaN]){
    for(const currency of ['USD','TRY','EUR']){
      const converted=currency==='TRY'?amount*state.usdTry:currency==='EUR'?amount*state.usdEur:amount;
      const symbol=currency==='TRY'?'₺':currency==='EUR'?'€':'$';
      assert.equal(context.fmtCurr(amount,currency),symbol+converted.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2}));
    }
  }
  for(let i=0;i<1000;i++)context.fmtCurr(i/7,'TRY');
  assert.equal(constructors,1,'one reusable formatter, not one per value');
  state.usdTry=50;assert.equal(context.fmtCurr(2,'TRY'),'₺100.00');
  assert.equal(context.fmtCurr('12.50','USD'),'$12.50','legacy string behavior stays unchanged');
});

function element(id,active=false){
  const tokens=new Set(active?['active']:[]),writes=[];
  return {id,writes,style:{},classList:{
    contains:key=>tokens.has(key),
    add(key){writes.push(['add',key]);tokens.add(key);},
    remove(key){writes.push(['remove',key]);tokens.delete(key);},
    toggle(key,value){const next=value??!tokens.has(key);if(next!==tokens.has(key)){writes.push(['toggle',key]);if(next)tokens.add(key);else tokens.delete(key);}return next;}
  }};
}

test('navigation leaves inactive pages untouched and cancels the old barcode start',()=>{
  const pages=[element('page-dashboard',true),element('page-products'),element('page-quick-barcode'),...Array.from({length:20},(_,i)=>element('page-extra-'+i))];
  const nav=Array.from({length:11},(_,i)=>element('nav-'+i,i===0)),root=element('html');
  let cameras=0,products=0;const scroll=[];
  const document={documentElement:root,
    getElementById:id=>pages.find(page=>page.id===id)||null,
    querySelectorAll:selector=>selector==='.page.active'?pages.filter(page=>page.classList.contains('active')):selector==='.nav-item.active'?nav.filter(item=>item.classList.contains('active')):selector==='.nav-item'?nav:[]};
  const s=scheduler({document,S:{invClientFilter:null},window:{scrollTo:value=>scroll.push(value)},
    renderPr:()=>products++,closeSidebar(){},updateQabActive(){},qblStopCamera(){},qblCloseCart(){},qblUpdateCartUI(){},
    updateQblTexts(){},initQblPage:()=>cameras++,getCurrentPage:()=>pages.find(page=>page.classList.contains('active'))?.id.slice(5)});
  vm.runInContext(between('function showPage(','function getCurrentPage('),s.context);
  s.context.showPage('quick-barcode',false);
  s.context.showPage('products',false);
  s.tick();s.paint();
  assert.equal(cameras,0);assert.equal(products,1);
  assert(pages.slice(3).every(page=>page.writes.length===0),'hidden pages do not trigger their mutation observers');
  assert(!root.writes.some(([,key])=>['wf-header-hidden','wf-booting'].includes(key)),'absent root classes do not cause global refreshes');
  assert.equal(scroll.at(-1).behavior,'auto');
  assert.equal(pages.filter(page=>page.classList.contains('active')).length,1);
});

test('invoice product review indexes the current catalog once and preserves strict first-match identity',()=>{
  const first={id:'same',name:'First',priceA:10},duplicate={id:'same',name:'Second',priceA:20};
  let visits=0;
  const products=[first,duplicate,{id:3,name:'Numeric',priceA:30}];
  products[Symbol.iterator]=function*(){for(let i=0;i<this.length;i++){visits++;yield this[i];}};
  const S={products,invTier:'A',invItems:[{productId:'same',name:'Old',priceUSD:0},{productId:'3',name:'Unmatched',priceUSD:0},{productId:3,name:'Old numeric',priceUSD:0}]};
  const context={S,getTierPrice:p=>p.priceA,wfGetProductDims:()=>[]};vm.createContext(context);
  vm.runInContext(between('function wfProductSnapshot(','function wfProductUpdateSignature('),context);
  const changes=context.wfProductUpdates();
  assert.deepEqual(Array.from(changes,change=>[change.index,change.next.name]),[[0,'First'],[2,'Numeric']]);
  assert.equal(visits,products.length);
  first.name='Updated';assert.equal(context.wfProductUpdates()[0].next.name,'Updated','no persistent cache can hide later product edits');
  assert.equal(S.invItems[0].name,'Old','review does not apply edits without the existing approval action');
  S.invItems=[];visits=0;assert.equal(context.wfProductUpdates().length,0);assert.equal(visits,0,'empty invoices do not scan the catalog');
});
