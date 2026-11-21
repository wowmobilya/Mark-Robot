const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const read = name => fs.readFileSync(path.join(__dirname, '..', name), 'utf8');
const html = read('index.html');
const legacyStart = html.indexOf("window.addEventListener('popstate',(e)=>");
const legacy = html.slice(legacyStart, html.indexOf('function toggleSidebar()', legacyStart));

function fixture() {
  const listeners = [], observers = [], visits = [], pushed = [];
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
  const main=new Element(), nav=new Element(), sidebar=new Element(), modal=new Element();
  const htmlRoot=new Element(); htmlRoot.lang='en'; modal.id='pdfModal';
  for (const id of ['invoices','dashboard','notifications']) {
    const page=new Element(); page.id='page-'+id; main.append(page);
  }
  let current='invoices';
  const document={documentElement:htmlRoot,createElement:()=>new Element(),querySelectorAll:()=>[],
    querySelector(selector) {
      if (selector==='.modal-ov.open') return modal.classList.contains('open') ? modal : null;
      if (selector==='.page.active') return this.getElementById('page-'+current);
      return null;
    },
    getElementById(id) {
      return {mainContent:main,'wf-nav-main':nav,sidebar}[id] || main.children.find(el=>el.id===id) || null;
    }};
  const location={hash:'#invoices'};
  const history={pushState(state,_,hash){pushed.push(state.page);location.hash=hash;}};
  const root={document,location,history,
    showPage(id,push=true){current=id;visits.push([id,push]);},
    closeSidebar(){sidebar.classList.remove('open');},
    addEventListener(name,handler,options){if(name==='popstate')listeners.push({handler,capture:options===true||!!options?.capture});},
    MutationObserver:class{constructor(callback){observers.push(callback);}observe(){}}
  };
  const context=vm.createContext({window:root,root,document,history,getCurrentPage:()=>current,closeSidebar:root.closeSidebar,current:()=>current,
    goBack:()=>root.showPage('dashboard'),_isPopState:false});
  vm.runInContext(legacy,context);
  vm.runInContext(read('operations-workspace.js'),context);
  const notifications=read('notifications-workspace.js');
  const start=notifications.indexOf('  function route(state)');
  const end=notifications.indexOf("  root.addEventListener('hashchange'", start);
  assert(start>=0 && end>start);
  vm.runInContext(notifications.slice(start,end)+'root.WFNotifications={handleHistory};',context);
  const entry=root.WFOperations.register({id:'invoice-archive',parent:'invoices'});
  function traverse(target) {
    location.hash='#'+target;
    let stopped=false;
    const event={state:{page:target},stopImmediatePropagation(){stopped=true;}};
    for(const listener of [...listeners].sort((a,b)=>Number(b.capture)-Number(a.capture))){
      if(stopped)break;
      listener.handler(event);
    }
    return stopped;
  }
  return {root,entry,modal,sidebar,visits,pushed,traverse,current:()=>current,
    setLang(lang){htmlRoot.lang=lang;observers.forEach(fn=>fn());}};
}

test('operations history lets legacy Back close the invoice preview and drawer first, then traverses actual pages without pushing', () => {
  const f=fixture();
  f.root.WFOperations.open('invoice-archive');
  f.modal.classList.add('open'); f.sidebar.classList.add('open');
  assert.equal(f.traverse('invoices'),false);
  assert.equal(f.current(),'invoice-archive');
  assert.equal(f.modal.classList.contains('open'),false);
  assert.equal(f.sidebar.classList.contains('open'),true);
  assert.equal(f.traverse('invoices'),false);
  assert.equal(f.sidebar.classList.contains('open'),false);
  assert.equal(f.current(),'invoice-archive');
  assert.deepEqual(f.pushed,['invoice-archive','invoice-archive']);
  assert.equal(f.traverse('invoices'),true);
  assert.equal(f.traverse('invoice-archive'),true);
  assert.deepEqual(f.visits,[['invoice-archive',true],['invoices',false],['invoice-archive',false]]);
  assert.deepEqual(f.pushed,['invoice-archive','invoice-archive']);
});

test('a late-mounted operations page retains its back icon and translated accessible caption through direction changes', () => {
  const f=fixture();
  const {back,backIcon,backCaption}=f.entry;
  const ltr=backIcon.innerHTML;
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

test('notifications as the prior history entry defers to the open preview and drawer on an operations page', () => {
  const f=fixture();
  f.root.WFOperations.open('invoice-archive');
  f.modal.classList.add('open');
  f.sidebar.classList.add('open');
  assert.equal(f.traverse('notifications'),false);
  assert.equal(f.modal.classList.contains('open'),false);
  assert.equal(f.sidebar.classList.contains('open'),true);
  assert.equal(f.current(),'invoice-archive');
  assert.equal(f.traverse('notifications'),false);
  assert.equal(f.sidebar.classList.contains('open'),false);
  assert.deepEqual(f.pushed,['invoice-archive','invoice-archive']);
  assert.equal(f.traverse('notifications'),true);
  assert.equal(f.current(),'notifications');
  // A notification page can itself have an open sidebar before returning to an ordinary page.
  f.sidebar.classList.add('open');
  assert.equal(f.traverse('invoices'),false);
  assert.equal(f.current(),'notifications');
  assert.equal(f.sidebar.classList.contains('open'),false);
  assert.equal(f.traverse('invoices'),true);
  assert.equal(f.current(),'invoices');
});
