const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'../ui-navigation.js'),'utf8');
const start=source.indexOf("(() => {\n  const search = document.getElementById('wfSidebarSearch');"),end=source.indexOf("  const dialog=document.getElementById('wfSearchDialog');",start);
assert(start>=0&&end>start);const controller=source.slice(start,end)+'})();';

function setup(){
 const nodes=[],observers=[],frames=[],resize=[],calls={routes:[],actions:[],legacy:0,sidebar:0};let document,context,viewportResize;
 class Element{
  constructor(tag='div'){this.tagName=tag.toUpperCase();this.children=[];this.dataset={};this.attrs={};this.events={};this.classes=new Set();this.hidden=false;this.disabled=false;this._text='';const styles=new Map();this.style={getPropertyValue:key=>styles.get(key)||'',setProperty:(key,value)=>styles.set(key,value)};nodes.push(this);
   this.classList={add:(...names)=>names.forEach(name=>this.classes.add(name)),remove:(...names)=>names.forEach(name=>this.classes.delete(name)),contains:name=>this.classes.has(name),toggle:(name,value)=>{if(value===undefined)value=!this.classes.has(name);if(value)this.classes.add(name);else this.classes.delete(name);return value;}};}
  set className(value){this.classes=new Set(value.split(/\s+/).filter(Boolean));}get className(){return [...this.classes].join(' ');}
  set textContent(value){this._text=String(value);this.children=[];}get textContent(){return this._text+this.children.map(child=>child.textContent).join('');}
  get parentNode(){return this.parentElement;}get nextElementSibling(){const all=this.parentElement?.children||[];return all[all.indexOf(this)+1]||null;}get previousElementSibling(){const all=this.parentElement?.children||[];return all[all.indexOf(this)-1]||null;}
  append(...children){for(const child of children){child.remove();child.parentElement=this;this.children.push(child);}}
  prepend(child){child.remove();child.parentElement=this;this.children.unshift(child);}
  before(child){const parent=this.parentElement;child.remove();parent.children.splice(parent.children.indexOf(this),0,child);child.parentElement=parent;}
  after(child){const parent=this.parentElement;child.remove();parent.children.splice(parent.children.indexOf(this)+1,0,child);child.parentElement=parent;}
  remove(){if(this.parentElement)this.parentElement.children=this.parentElement.children.filter(child=>child!==this);this.parentElement=null;}
  contains(element){return element===this||this.children.some(child=>child.contains(element));}
  setAttribute(key,value){this.attrs[key]=String(value);}getAttribute(key){if(key.startsWith('data-'))return this.dataset[key.slice(5).replace(/-([a-z])/g,(_,letter)=>letter.toUpperCase())]??this.attrs[key]??null;return this.attrs[key]??null;}removeAttribute(key){delete this.attrs[key];}
  matches(selector){return selector.split(',').some(part=>{const value=part.trim();if(value.startsWith('#'))return this.id===value.slice(1);if(value.startsWith('.'))return value.slice(1).split('.').every(name=>this.classes.has(name));if(value.startsWith('[')){const match=value.match(/^\[([^=\]]+)(?:="([^"]+)")?\]$/);return !!match&&(match[2]===undefined?this.getAttribute(match[1])!==null:this.getAttribute(match[1])===match[2]);}return this.tagName===value.toUpperCase();});}
  closest(selector){for(let current=this;current;current=current.parentElement)if(current.matches(selector))return current;return null;}
  querySelectorAll(selector){return this.children.flatMap(child=>[...(child.matches(selector)?[child]:[]),...child.querySelectorAll(selector)]);}
  querySelector(selector){return this.querySelectorAll(selector)[0]||null;}
  cloneNode(deep){const copy=new Element(this.tagName);copy._text=this._text;copy.dataset={...this.dataset};copy.attrs={...this.attrs};copy.className=this.className;if(deep)copy.append(...this.children.map(child=>child.cloneNode(true)));return copy;}
  addEventListener(type,callback,capture=false){(this.events[type]??=[]).push({callback,capture});}
  getBoundingClientRect(){return {height:44};}
  focus(){document.activeElement=this;}
  click(){return dispatch(this,'click');}
 }
 const make=(tag,id,cls)=>{const element=new Element(tag);if(id)element.id=id;if(cls)element.className=cls;return element;};
 const root=make('html'),body=make('body'),drawer=make('aside','sidebar'),nav=make('nav','wf-nav-main');root.lang='en';root.dir='ltr';root.append(body);body.append(drawer);drawer.append(nav);nav.clientHeight=800;nav.scrollHeight=600;
 const groups=[make('div','','wf-nav-group'),make('div','','wf-nav-group'),make('div','','wf-nav-group')];nav.append(...groups);
 groups.forEach((group,index)=>{const caption=make('div','','side-sec');caption.dataset.i18n='group-'+index;caption.textContent=['Main','Actions','Settings'][index];group.append(caption);});
 for(const id of ['wfSidebarSearch','wfSidebarEmpty','wfSidebarPager','wfSidebarPrev','wfSidebarNext','wfSidebarPage'])drawer.append(make(id==='wfSidebarSearch'?'input':'div',id));
 const definitions=[['dashboard','nav_dashboard',0,'Dashboard'],['companies','nav_companies',0,'Clients'],['products','nav_products',0,'Products'],['invoices','nav_invoices',0,'Invoices'],['cart','cart',0,'Cart'],['select-client-type','nav_add_co',1,'Add client'],['add-product','nav_add_pr',1,'Add product'],['quick-barcode','Quick Barcode',1,'Quick Barcode'],['select-invoice-type','nav_create',1,'Create invoice'],['settings','settings',2,'Settings']];
 const items={},pages={};
 for(const [destination,key,index,caption]of definitions){
  const item=make('button','','nav-item'),icon=make('span','','nav-icon'),label=make('span');label.dataset.i18n=key;label.textContent=caption;item.dataset.page=destination;item.append(icon,label);item.setAttribute('onclick',"showPage('"+destination+"')");
  item.onclick=function(event){calls.actions.push({source:this,destination,event});context.showPage(destination);};groups[index].append(item);items[destination]=item;
  const page=make('section','page-'+destination,'page');body.append(page);pages[destination]=page;
 }
 pages.dashboard.classList.add('active');items.dashboard.classList.add('active');
 const extra=make('section','page-add-company','page');body.append(extra);pages['add-company']=extra;
 document={documentElement:root,body,activeElement:null,createElement:tag=>new Element(tag),getElementById:id=>nodes.find(node=>node.id===id)||null,querySelector:selector=>body.querySelector(selector),querySelectorAll:selector=>selector==='#wf-nav-main .wf-nav-group'?groups:body.querySelectorAll(selector)};
 const location={hash:'#dashboard'};
 context={document,location,innerHeight:844,Intl,requestAnimationFrame:callback=>frames.push(callback),visualViewport:{height:844,addEventListener(type,callback){viewportResize=callback;}},matchMedia:()=>({matches:true}),getComputedStyle:()=>({paddingTop:'0',paddingBottom:'0',rowGap:'3'}),
  MutationObserver:class{constructor(callback){this.callback=callback;this.targets=[];observers.push(this);}observe(target,options){this.targets.push({target,options});}},ResizeObserver:class{constructor(callback){this.callback=callback;resize.push(callback);}observe(){}},
  showPage(destination){calls.routes.push(destination);location.hash='#'+destination;for(const [name,page]of Object.entries(pages))page.classList.toggle('active',name===destination);const selected=destination==='add-company'?'select-client-type':destination;for(const [name,item]of Object.entries(items))item.classList.toggle('active',name===selected);},
  wfToggleDesktopSidebar(){calls.sidebar++;root.classList.remove('wf-sidebar-collapsed');}
 };
 context.window=context;
 // Simulate a pre-existing delegated navigation listener. Parent capture must
 // stop this before it can navigate, including clicks on child labels/icons.
 nav.addEventListener('click',event=>{const item=event.target.closest('.nav-item');if(item&&['companies','products','invoices'].includes(item.dataset.page)){calls.legacy++;context.showPage(item.dataset.page);}});
 function dispatch(target,type,detail={}){
  const event={type,target,...detail,defaultPrevented:false,preventDefault(){this.defaultPrevented=true;},stopPropagation(){this.stopped=true;},stopImmediatePropagation(){this.stopped=true;this.immediate=true;}};
  const ancestry=[];for(let current=target;current;current=current.parentElement)ancestry.push(current);
  for(const element of [...ancestry].reverse()){for(const listener of element.events[type]||[])if(listener.capture){listener.callback.call(element,event);if(event.immediate)break;}if(event.stopped)return event;}
  for(const element of ancestry){if(type==='click')element.onclick?.call(element,event);if(event.immediate)return event;for(const listener of element.events[type]||[])if(!listener.capture){listener.callback.call(element,event);if(event.immediate)break;}if(event.stopped)return event;}
  return event;
 }
 vm.runInNewContext(controller,context);
 const flush=()=>{let turns=0;while(frames.length){assert(++turns<50,'layout work settles');frames.shift()();}};
 const notifyRoot=(run=true)=>{for(const observer of observers)if(observer.targets.some(entry=>entry.target===root))observer.callback([]);if(run)flush();};
 const submenu=destination=>document.getElementById('actions-'+({companies:'nav_companies',products:'nav_products',invoices:'nav_invoices'})[destination]);
 return {context,calls,location,root,drawer,nav,groups,items,pages,document,submenu,dispatch,notifyRoot,frames,flush,notifyResize(){resize.forEach(callback=>callback());viewportResize?.();},
  key(target,key){const event=dispatch(target,'keydown',{key});if(!event.defaultPrevented&&['Enter',' '].includes(key)&&target.tagName==='BUTTON')dispatch(target,'click',{detail:0});return event;},
  expander:destination=>items[destination].parentElement.querySelector('.wf-destination-toggle')};
}

test('parent rows and chevrons expand without navigation; only the explicit View action invokes the saved destination once',()=>{
 const f=setup(),parent=f.items.products,submenu=f.submenu('products');
 f.dispatch(parent.children[1],'click');assert(!submenu.hidden);assert.equal(f.location.hash,'#dashboard');assert.deepEqual(f.calls.routes,[]);assert.equal(f.calls.legacy,0);
 assert.equal(parent.getAttribute('aria-expanded'),'true');assert.equal(f.expander('products').getAttribute('aria-expanded'),'true');assert.equal(parent.getAttribute('aria-controls'),submenu.id);
 assert.equal(submenu.children[0].textContent,'View products');assert.equal(parent.querySelectorAll('button').length,0);assert.equal(f.expander('products').parentElement,parent.parentElement);
 f.expander('products').click();assert(submenu.hidden);assert.equal(parent.getAttribute('aria-expanded'),'false');assert.deepEqual(f.calls.routes,[]);
 parent.click();submenu.children[0].click();assert.deepEqual(f.calls.routes,['products']);assert.equal(f.location.hash,'#products');assert.equal(f.calls.actions.length,1);assert.equal(f.calls.actions[0].source,parent);assert.equal(f.calls.legacy,0);assert.equal(submenu.children[0].getAttribute('aria-current'),'page');
});

test('unrelated root classes do not remeasure rail pagination and resize notifications share one update',()=>{
 const f=setup();let measurements=0;
 Object.defineProperty(f.nav,'clientHeight',{get(){measurements++;return 170;}});f.nav.scrollHeight=600;
 f.root.classList.add('wf-sidebar-collapsed');f.notifyRoot();assert(f.drawer.classList.contains('wf-icon-rail'));assert(measurements>0);measurements=0;
 f.root.classList.add('wf-home-scroll-top');f.notifyRoot();f.root.classList.add('wf-home-customizer-open');f.notifyRoot();assert.equal(measurements,0);
 f.root.lang='fr';f.notifyRoot(false);f.notifyResize();f.notifyResize();assert.equal(f.frames.length,1);assert.equal(measurements,0);f.flush();assert(measurements>0);
 assert.equal(f.submenu('products').children[0].textContent,'Voir les produits');
 f.root.classList.remove('wf-sidebar-collapsed');f.notifyRoot();assert(!f.drawer.classList.contains('wf-icon-rail'));
 f.items.products.click();assert(!f.submenu('products').hidden);assert.deepEqual(f.calls.routes,[]);
});

test('only one child menu stays expanded, current destination is independent, and original Add actions remain intact',()=>{
 const f=setup();f.items.companies.click();f.items.invoices.click();assert(f.submenu('companies').hidden);assert(!f.submenu('invoices').hidden);assert(f.items.dashboard.classList.contains('active'));assert.equal(f.calls.routes.length,0);
 f.items.products.click();const productActions=f.submenu('products').children;productActions[1].click();assert.equal(f.calls.routes.at(-1),'add-product');assert.equal(f.calls.actions.at(-1).source,f.items['add-product']);assert(!f.submenu('products').hidden);assert.equal(productActions[1].getAttribute('aria-current'),'page');
 f.context.showPage('add-company');assert(!f.submenu('companies').hidden);assert(f.submenu('products').hidden);assert.equal(f.submenu('companies').children[1].getAttribute('aria-current'),'page');
 f.items.cart.click();assert.equal(f.location.hash,'#cart');assert(f.submenu('companies').hidden);f.items.dashboard.click();assert.equal(f.location.hash,'#dashboard');
});

test('keyboard activation and directional navigation expand, move focus, and close without invoking a destination',()=>{
 const f=setup(),parent=f.items.companies,submenu=f.submenu('companies');
 f.key(parent,'Enter');assert(!submenu.hidden);f.key(parent,' ');assert(submenu.hidden);
 f.key(parent,'ArrowDown');assert.equal(f.document.activeElement,submenu.children[0]);f.key(submenu.children[0],'ArrowDown');assert.equal(f.document.activeElement,submenu.children[1]);
 f.key(submenu.children[1],'Escape');assert(submenu.hidden);assert.equal(f.document.activeElement,parent);assert.equal(parent.getAttribute('aria-expanded'),'false');assert.deepEqual(f.calls.routes,[]);
 f.root.dir='rtl';f.key(parent,'ArrowLeft');assert(!submenu.hidden);f.key(submenu.children[0],'ArrowRight');assert(submenu.hidden);assert.equal(f.document.activeElement,parent);assert.deepEqual(f.calls.routes,[]);
});

test('rail expansion and language refresh retain explicit actions without premature routes or lost accordion state',()=>{
 const f=setup();f.root.classList.add('wf-sidebar-collapsed');f.notifyRoot();f.items.invoices.click();assert.equal(f.calls.sidebar,1);assert(!f.root.classList.contains('wf-sidebar-collapsed'));assert(!f.submenu('invoices').hidden);assert.deepEqual(f.calls.routes,[]);
 const labels={ar:'عرض الفواتير',en:'View invoices',tr:'Faturaları görüntüle',fr:'Voir les factures',ru:'Открыть счета'};
 for(const [locale,label]of Object.entries(labels)){f.root.lang=locale;f.notifyRoot();assert.equal(f.submenu('invoices').children[0].textContent,label);assert(!f.submenu('invoices').hidden);assert.equal(f.items.invoices.getAttribute('aria-expanded'),'true');}
 f.groups[0].querySelector('.wf-group-toggle').click();assert(f.submenu('invoices').hidden);f.groups[0].querySelector('.wf-group-toggle').click();assert(!f.submenu('invoices').hidden);
 assert.deepEqual(f.calls.routes,[]);f.submenu('invoices').children[1].click();assert.equal(f.calls.routes.at(-1),'select-invoice-type');assert.equal(f.calls.actions.at(-1).source,f.items['select-invoice-type']);
});
