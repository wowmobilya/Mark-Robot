const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'../ui-navigation.js'),'utf8');
const start=source.indexOf('/* Register shortcuts to existing tools'),end=source.indexOf('/* Keep dashboard controls steady',start);
assert(start>=0&&end>start);const controller=source.slice(start,end);

function fixture({deferred=false}={}){
 const nodes=[],observers=[],events={},calls=[];
 class Element{
  constructor(id=''){this.id=id;this.children=[];this.attrs={};this.dataset={};this.disabled=false;this.visible=true;this.textContent='';nodes.push(this);}
  append(...children){this.children.push(...children);for(const child of children)child.parentNode=this;}
  setAttribute(key,value){this.attrs[key]=String(value);}getAttribute(key){return this.attrs[key]??null;}
  matches(selector){return selector===':disabled'&&(this.disabled||this.ancestorDisabled);}
  getClientRects(){return this.visible?[{}]:[];}
  focus(options){calls.push(['focus',this.id,options]);}
  click(){if(!this.disabled)this.onclick?.();}
 }
 const root=new Element('root');root.lang='en';
 const nav=new Element('wf-nav-main'),settings=new Element('settings-group'),operations=new Element('operations-group');
 nav.append(settings,operations);nav.querySelector=selector=>({'.wf-nav-settings':settings,'.wf-ops-nav':operations})[selector]||null;
 let current='dashboard',statement=null;
 const controls={},document={documentElement:root,createElement:()=>new Element(),getElementById:id=>nodes.find(node=>node.id===id)||null,
  querySelector:selector=>selector==='.page.active'?{id:'page-'+current}:selector==='#page-companies [onclick="wfOpenStatement()"]'?statement:null,
  addEventListener(type,callback){(events[type]??=[]).push(callback);}};
 const window={showPage(page){current=page;calls.push(['route',page]);},closeSidebar(){calls.push(['close-sidebar']);}};
 function mount(){
  for(const [key,id]of [['cards','wfProductLabelsOpen'],['statement','statement'],['notifications','wfNotificationsButton']]){
   const button=new Element(id);button.onclick=()=>{calls.push(['original',key]);if(key==='notifications')window.showPage('notifications');};controls[key]=button;
  }
  statement=controls.statement;
 }
 if(!deferred)mount();
 const context=vm.createContext({document,window,WeakSet,MutationObserver:class{constructor(callback){this.callback=callback;}observe(target,options){observers.push({target,options,callback:this.callback});}}});
 const run=()=>vm.runInContext(controller,context);run();
 const link=id=>document.getElementById(id);
 return {root,nav,settings,operations,calls,controls,observers,run,mount,link,
  ready(){for(const callback of events.DOMContentLoaded||[])callback();},
  notify(target){for(const observer of [...observers])if(observer.target===target)observer.callback([]);},
  get current(){return current;}};
}

test('missing feature access is registered once in existing groups before drawer search binds',()=>{
 const f=fixture({deferred:true});
 assert.deepEqual(f.nav.children,[f.settings,f.operations]);
 assert.deepEqual(f.settings.children.map(item=>item.id),['wfAccountStatementNav','wfNotificationsNav']);
 assert.deepEqual(f.operations.children.map(item=>item.id),['wfShowroomCardsNav']);
 for(const id of ['wfAccountStatementNav','wfNotificationsNav','wfShowroomCardsNav']){assert(f.link(id).disabled);f.link(id).click();}
 assert.deepEqual(f.calls,[]);f.run();assert.equal(f.settings.children.length,2);assert.equal(f.operations.children.length,1);
 f.mount();f.ready();for(const id of ['wfAccountStatementNav','wfNotificationsNav','wfShowroomCardsNav'])assert(!f.link(id).disabled);
 assert.equal(f.link('wfNotificationsNav').dataset.page,'notifications');
 assert.equal(f.link('wfAccountStatementNav').getAttribute('aria-haspopup'),'dialog');
 assert.equal(f.link('wfShowroomCardsNav').getAttribute('aria-controls'),'wfProductLabels');
});

test('shortcuts invoke each original control once and retain its parent route',()=>{
 const f=fixture();
 for(const [id,parent,key]of [['wfShowroomCardsNav','products','cards'],['wfAccountStatementNav','companies','statement'],['wfNotificationsNav','notifications','notifications']]){
  f.link(id).click();assert.equal(f.current,parent);assert.equal(f.calls.filter(call=>call[0]==='original'&&call[1]===key).length,1);
 }
 assert.equal(f.calls.filter(call=>call[0]==='close-sidebar').length,3);
 assert.deepEqual(f.calls.filter(call=>call[0]==='route').map(call=>call[1]),['products','companies','notifications']);
 assert(f.calls.filter(call=>call[0]==='focus').every(call=>call[2].preventScroll));
});

test('late source busy and disabled states cannot be bypassed by a cached sidebar or search action',()=>{
 const f=fixture(),link=f.link('wfShowroomCardsNav'),original=f.controls.cards;
 for(const [key,value]of [['aria-busy','true'],['aria-disabled','true']]){
  original.setAttribute(key,value);link.onclick();assert.deepEqual(f.calls,[]);f.notify(original);assert(link.disabled);
  original.setAttribute(key,'false');f.notify(original);assert(!link.disabled);
 }
 original.disabled=true;link.onclick();assert.deepEqual(f.calls,[]);f.notify(original);assert(link.disabled);
 original.disabled=false;original.ancestorDisabled=true;link.onclick();assert.deepEqual(f.calls,[]);
 original.ancestorDisabled=false;f.notify(original);link.click();assert.equal(f.calls.filter(call=>call[0]==='original').length,1);
 assert(f.observers.every(observer=>observer.target===f.root||Object.values(f.controls).includes(observer.target)));
 assert(f.observers.every(observer=>!observer.options.subtree));
});

test('all new captions and accessible names follow the five supported languages',()=>{
 const f=fixture(),captions={ar:['بطاقات المعرض','كشف الحساب','الإشعارات'],en:['Showroom cards','Account statement','Notifications'],tr:['Mağaza etiketleri','Hesap ekstresi','Bildirimler'],fr:['Fiches d’exposition','Relevé de compte','Notifications'],ru:['Карточки для выставки','Выписка по счёту','Уведомления']};
 for(const [locale,labels]of Object.entries(captions)){
  f.root.lang=locale;f.notify(f.root);
  ['wfShowroomCardsNav','wfAccountStatementNav','wfNotificationsNav'].forEach((id,index)=>{
   const link=f.link(id);assert.equal(link.children[1].textContent,labels[index]);assert.equal(link.title,labels[index]);assert.equal(link.getAttribute('aria-label'),labels[index]);
  });
 }
 assert.deepEqual(f.calls,[]);
});
