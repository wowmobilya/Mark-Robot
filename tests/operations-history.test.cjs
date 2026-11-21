const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const read = name => fs.readFileSync(path.join(__dirname, '..', name), 'utf8');
const html = read('index.html');
function section(source, startText, endText) {
  const start = source.indexOf(startText), end = source.indexOf(endText, start + startText.length);
  assert(start >= 0 && end > start);
  return source.slice(start, end);
}

// Run the real showPage, goBack, popstate handler, closeSidebar and both feature
// handlers against a browser-style history stack. pushState truncates Forward.
function fixture(legacyFirst = false) {
  const observers=[], listeners=[], entries=[{state:{page:'invoices'},hash:'#invoices'}];
  let position=0;
  class Element {
    constructor() { this.children=[]; this.dataset={}; this.attrs={}; this.classes=new Set(); }
    set className(value) { this.classes=new Set(value.split(' ').filter(Boolean)); }
    get classList() {
      return {contains:k=>this.classes.has(k), add:k=>this.classes.add(k), remove:k=>this.classes.delete(k),
        toggle:(k,on)=>on ? this.classes.add(k) : this.classes.delete(k)};
    }
    set textContent(value) { this.caption=value; this.children=[]; }
    get textContent() { return this.caption || ''; }
    append(...children) { this.children.push(...children); }
    setAttribute(k,v) { this.attrs[k]=v; }
    removeAttribute(k) { delete this.attrs[k]; }
    addEventListener(k,listener) { this[k]=listener; }
    querySelector() { return null; }
  }
  const element = (id,cls='') => {const node=new Element();node.id=id;node.className=cls;return node;};
  const main=element('mainContent'), nav=element('wf-nav-main'), sidebar=element('sidebar'), sideOv=element('sideOv'), modal=element('pdfModal');
  const htmlRoot=new Element(); htmlRoot.lang='en';
  for (const id of ['invoices','products','dashboard','notifications']) {
    main.append(element('page-'+id,'page'+(id==='invoices'?' active':'')));
  }
  const document={documentElement:htmlRoot,createElement:()=>new Element(),
    querySelectorAll(selector) {
      if(selector==='.page.active')return main.children.filter(el=>el.classList.contains('active'));
      return [];
    },
    querySelector(selector) {
      if(selector==='.modal-ov.open')return modal.classList.contains('open')?modal:null;
      return this.querySelectorAll(selector)[0]||null;
    },
    getElementById(id) {
      return {mainContent:main,'wf-nav-main':nav,sidebar,sideOv}[id] || main.children.find(el=>el.id===id) || null;
    }};
  const location={hash:'#invoices'};
  function dispatch(type,details={}) {
    let stopped=false;
    const event={...details,stopImmediatePropagation(){stopped=true;}};
    const handlers=listeners.filter(item=>item.type===type);
    if(!legacyFirst)handlers.sort((a,b)=>Number(b.capture)-Number(a.capture));
    for(const {handler} of handlers){if(stopped)break;handler(event);}
  }
  const history={
    get state(){return entries[position].state;},
    pushState(state,_,hash){entries.splice(++position,Infinity,{state,hash});location.hash=hash;},
    replaceState(state,_,hash){entries[position]={state,hash};location.hash=hash;},
    go(delta) {
      if(!entries[position+delta])return false;
      position+=delta;
      location.hash=entries[position].hash;
      dispatch('popstate',{state:this.state});
      dispatch('hashchange');
      return true;
    }
  };
  const root={document,location,history,S:{},scrollTo(){},
    addEventListener(type,handler,options){listeners.push({type,handler,capture:options===true||!!options?.capture});},
    MutationObserver:class{constructor(callback){observers.push(callback);}observe(){}}
  };
  for(const fn of ['wfCancelPendingRenders','wfDebouncedRender','qblStopCamera','qblCloseCart','qblUpdateCartUI','updateQabActive','renderInvList','renderPr','updateInvClientFilterBar','updateDash']){
    root[fn]=()=>{};
  }
  root.window=root;root.root=root;
  const context=vm.createContext(root);
  vm.runInContext(section(html,'let _isPopState=false;','function wfApplySidebarLayout()'),context);
  vm.runInContext(section(html,'const PARENT_MAP = {','/* ============================================================'),context);
  vm.runInContext(read('operations-workspace.js'),context);
  const notifications=read('notifications-workspace.js');
  const routes=section(notifications,'  function route(state)',"  root.addEventListener('resize'");
  vm.runInContext('const current=getCurrentPage;'+routes+'root.WFNotifications={handleHistory};',context);
  const ops=root.WFOperations;
  const entry=ops.register({id:'invoice-archive',parent:'invoices'});
  ops.register({id:'product-costs',parent:'products'});
  ops.register({id:'package-labels',parent:'invoices'});
  return {root,entry,modal,sidebar,sideOv,entries,history,open:id=>ops.open(id),
    setLang(lang){htmlRoot.lang=lang;observers.forEach(fn=>fn());},
    route(){return [root.getCurrentPage(),location.hash];},
    manualHash(hash){history.pushState(null,'',hash);dispatch('hashchange');}
  };
}
for(const legacyFirst of [false,true]) {
  const order=legacyFirst?'inline listener first':'capture listeners first';
  test('native Back and Forward preserve the operation route, URL and every history entry with '+order, () => {
    const f=fixture(legacyFirst);
    for(const name of ['package-labels','product-costs','invoice-archive']) f.open(name);
    assert.deepEqual(f.route(),['invoice-archive','#invoice-archive']);
    const entries=f.entries.map(entry=>entry.hash);
    for(const [delta,id] of [[-1,'product-costs'],[-1,'package-labels'],[-1,'invoices'],[1,'package-labels'],[1,'product-costs'],[1,'invoice-archive']]){
      assert(f.history.go(delta),'history entry should exist');
      assert.deepEqual(f.route(),[id,'#'+id]);
      assert.deepEqual(f.entries.map(entry=>entry.hash),entries);
    }
  });
  test('legacy Back closes the preview, then the drawer, before following the previous notifications route with '+order, () => {
    const f=fixture(legacyFirst);
    f.root.showPage('notifications');
    f.open('invoice-archive');
    f.modal.classList.add('open'); f.sidebar.classList.add('open'); f.sideOv.classList.add('open');
    assert(f.history.go(-1));
    assert.deepEqual(f.route(),['invoice-archive','#invoice-archive']);
    assert.equal(f.modal.classList.contains('open'),false); assert.equal(f.sidebar.classList.contains('open'),true);
    assert(f.history.go(-1));
    assert.deepEqual(f.route(),['invoice-archive','#invoice-archive']);
    assert.equal(f.sidebar.classList.contains('open'),false); assert.equal(f.sideOv.classList.contains('open'),false);
    assert(f.history.go(-1));
    assert.deepEqual(f.route(),['notifications','#notifications']);
    assert(f.history.go(1));
    assert.deepEqual(f.route(),['invoice-archive','#invoice-archive']);
  });
}
test('a manual operations fragment and mismatched traversal state use the valid URL and retain Forward',()=>{
  const f=fixture(true);
  f.open('package-labels');
  f.manualHash('#product-costs');
  assert.deepEqual(f.route(),['product-costs','#product-costs']);
  f.history.replaceState({page:'invoices'},'','#product-costs');
  f.open('invoice-archive');
  assert(f.history.go(-1));
  assert.deepEqual(f.route(),['product-costs','#product-costs']);
  assert(f.history.go(1));
  assert.deepEqual(f.route(),['invoice-archive','#invoice-archive']);
});
test('a late-mounted operations page retains its back icon and translated accessible caption through direction changes', () => {
  const f=fixture(), {back,backIcon,backCaption}=f.entry, ltr=backIcon.innerHTML;
  assert.match(ltr,/<svg/);
  for(const [locale,caption,direction] of [['ar','رجوع','right'],['fr','Retour','left'],['tr','Geri','left'],['ru','Назад','left'],['en','Back','left']]){
    f.setLang(locale);
    assert.equal(back.children[0],backIcon); assert.equal(back.children[1],backCaption);
    assert.equal(backIcon.dataset.direction,direction);
    assert.match(backIcon.innerHTML,/<svg/);
    assert.equal(backIcon.innerHTML===ltr,direction==='left');
    assert.equal(backCaption.textContent,caption); assert.equal(back.attrs['aria-label'],caption);
  }
});
