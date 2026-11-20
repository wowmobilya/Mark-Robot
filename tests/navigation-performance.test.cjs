const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),acorn=require('acorn'),walk=require('acorn-walk');
const source=fs.readFileSync(path.join(__dirname,'../ui-navigation.js'),'utf8'),functions={};
walk.simple(acorn.parse(source,{ecmaVersion:'latest'}),{FunctionDeclaration(node){if(['syncScroll','syncHome','scheduleHome','syncSectionHeadings','syncControls','controlsRootState','scheduleControls'].includes(node.id.name))functions[node.id.name]=source.slice(node.start,node.end);}});
function classList(writes,initial=[]){const values=new Set(initial);return {values,contains:name=>values.has(name),add(name){writes.push('add '+name);values.add(name);},remove(name){writes.push('remove '+name);values.delete(name);},toggle(name,enabled){writes.push('toggle '+name);if(enabled)values.add(name);else values.delete(name);}};}

test('unchanged inner-page scroll state performs no root mutation or document-height measurement',()=>{
 const writes=[],style=new Map([['--wf-scroll-progress','0%']]);let dashboard=false,measurements=0;
 const root={classList:classList(writes),style:{getPropertyValue:key=>style.get(key)||'',setProperty(key,value){writes.push('style '+key);style.set(key,value);}},get scrollHeight(){measurements++;return 1600;}};
 const context=vm.createContext({root,document:{querySelector:()=>dashboard?{}:null},scrollY:120,innerHeight:800});vm.runInContext(functions.syncScroll,context);
 vm.runInContext('syncScroll();syncScroll();syncScroll();',context);assert.deepEqual(writes,[]);assert.equal(measurements,0);
 root.classList.values.add('wf-header-hidden');vm.runInContext('syncScroll();syncScroll();',context);assert.deepEqual(writes,['remove wf-header-hidden']);writes.length=0;
 dashboard=true;context.scrollY=200;vm.runInContext('syncScroll()',context);assert.equal(style.get('--wf-scroll-progress'),'25%');assert(root.classList.contains('wf-dashboard-scrolled'));assert.equal(measurements,1);writes.length=0;
 vm.runInContext('syncScroll()',context);assert.deepEqual(writes,[]);assert.equal(measurements,2,'dashboard progress still responds to real layout changes');
 dashboard=false;vm.runInContext('syncScroll()',context);assert.equal(style.get('--wf-scroll-progress'),'0%');assert(!root.classList.contains('wf-dashboard-scrolled'));writes.length=0;
 vm.runInContext('syncScroll()',context);assert.deepEqual(writes,[]);assert.equal(measurements,2);
});

test('unchanged Home scroll state does not rewrite labels, icons, or global state',()=>{
 const writes=[],attrs={};let position=0,title='',graphic='<home>';
 const root={lang:'en',classList:classList(writes)},home={classList:classList(writes),getAttribute:key=>attrs[key],setAttribute(key,value){writes.push('attribute '+key);attrs[key]=value;},get title(){return title;},set title(value){writes.push('title');title=value;}};
 const homeIcon={querySelector:()=>graphic.includes('wf-home-up')?{}:null,get innerHTML(){return graphic;},set innerHTML(value){writes.push('icon');graphic=value;}};
 const context=vm.createContext({root,home,homeIcon,topIcon:null,homeGraphic:'<home>',arrow:'<svg data-wf-home-up></svg>',scrollAmount:()=>position});vm.runInContext(functions.syncHome,context);
 vm.runInContext('syncHome()',context);assert.equal(attrs['aria-label'],'Home');writes.length=0;
 vm.runInContext('syncHome();syncHome()',context);assert.deepEqual(writes,[]);
 position=100;vm.runInContext('syncHome()',context);assert.equal(attrs['aria-label'],'Scroll to top');assert(root.classList.contains('wf-home-scroll-top'));assert(graphic.includes('wf-home-up'));writes.length=0;
 vm.runInContext('syncHome();syncHome()',context);assert.deepEqual(writes,[]);
});

test('captured and window scroll notifications share one Home update per animation frame',()=>{
 const frames=[];let updates=0;
 const context=vm.createContext({requestAnimationFrame:callback=>frames.push(callback),syncHome:()=>updates++});vm.runInContext('let homeQueued=false;'+functions.scheduleHome,context);
 vm.runInContext('scheduleHome();scheduleHome();scheduleHome()',context);assert.equal(frames.length,1);assert.equal(updates,0);frames.shift()();assert.equal(updates,1);
 vm.runInContext('scheduleHome()',context);assert.equal(frames.length,1);frames.shift()();assert.equal(updates,2);
});

test('normalizing an existing heading does not emit repeated class mutations',()=>{
 const writes=[],row={children:[],classList:classList(writes)},title={classList:classList(writes),parentElement:row},back={classList:classList(writes,['sct-back-btn'])},menu={classList:classList(writes,['wf-section-menu'])};
 row.children=[back,title,menu];row.querySelector=()=>menu;
 const document={querySelectorAll:selector=>selector.startsWith('.page ')?[title]:[],querySelector:()=>null};
 const context=vm.createContext({document});vm.runInContext(functions.syncSectionHeadings,context);vm.runInContext('syncSectionHeadings()',context);assert.equal(writes.length,2);writes.length=0;
 vm.runInContext('syncSectionHeadings();syncSectionHeadings()',context);assert.deepEqual(writes,[]);
});

test('sidebar controls retain route and accessible state without rewriting settled attributes',()=>{
 const writes=[];let active='products';
 function element(id){
  const attrs={},node={id,children:[],classList:classList(writes),getAttribute:key=>attrs[key]??null,hasAttribute:key=>key in attrs,setAttribute(key,value){writes.push(id+' '+key);attrs[key]=String(value);},removeAttribute(key){writes.push(id+' remove '+key);delete attrs[key];}};
  node.dataset=new Proxy({},{set(target,key,value){writes.push(id+' data '+key);target[key]=value;return true;}});
  for(const key of ['title','hidden','inert','innerHTML']){let value=key==='hidden'||key==='inert'?false:'';Object.defineProperty(node,key,{get:()=>value,set(next){writes.push(id+' '+key);value=next;}});}
  return node;
 }
 const root={lang:'en',dir:'ltr',classList:classList(writes)},sidebar=element('sidebar'),handle=element('close'),opener=element('open');
 const items=['products','select-invoice-type'].map(destination=>{const button=element(destination);button.children=[{}, {textContent:destination==='products'?'Products':'New invoice'}];button.setAttribute('onclick',"showPage('"+destination+"')");return button;});
 sidebar.querySelectorAll=()=>items;
 const document={getElementById:()=>handle,querySelector:()=>({id:'page-'+active}),querySelectorAll:()=>[opener,handle]};
 const context=vm.createContext({root,sidebar,document,compact:{matches:true},menuSvg:'menu',foldSvg:'fold',syncBackButtons(){},syncSectionHeadings(){}});
 vm.runInContext('let lastControlsRoot="";'+functions.controlsRootState+functions.syncControls+';syncControls()',context);writes.length=0;
 vm.runInContext('syncControls();syncControls()',context);assert.deepEqual(writes,[]);assert.equal(items[0].getAttribute('aria-current'),'page');assert(sidebar.inert);assert(handle.hidden);
 active='create-invoice';vm.runInContext('syncControls()',context);assert.equal(items[0].getAttribute('aria-current'),null);assert.equal(items[1].getAttribute('aria-current'),'page');assert.equal(items[1].getAttribute('onclick'),"showPage('select-invoice-type')");
 sidebar.classList.values.add('open');vm.runInContext('syncControls()',context);assert.equal(sidebar.inert,false);assert.equal(handle.hidden,false);assert.equal(opener.getAttribute('aria-expanded'),'true');writes.length=0;
 vm.runInContext('syncControls()',context);assert.deepEqual(writes,[]);
});

test('root mutations only schedule relevant shell changes and share one refresh per frame',()=>{
 const writes=[],frames=[],root={lang:'en',dir:'ltr',classList:classList(writes)};
 const context=vm.createContext({root,updates:0,requestAnimationFrame:callback=>frames.push(callback)});
 vm.runInContext(functions.controlsRootState+functions.scheduleControls+';let controlsQueued=false,lastControlsRoot=controlsRootState();function syncControls(){updates++;lastControlsRoot=controlsRootState();}',context);
 root.classList.values.add('wf-home-scroll-top');vm.runInContext('scheduleControls()',context);assert.equal(frames.length,0);
 root.lang='ar';root.dir='rtl';vm.runInContext('scheduleControls();scheduleControls();scheduleControls()',context);assert.equal(frames.length,1);assert.equal(context.updates,0);frames.shift()();assert.equal(context.updates,1);
 root.classList.values.add('wf-sidebar-collapsed');vm.runInContext('scheduleControls()',context);assert.equal(frames.length,1);frames.shift()();assert.equal(context.updates,2);
 root.lang='fr';vm.runInContext('scheduleControls()',context);root.lang='ar';frames.shift()();assert.equal(context.updates,2,'transient state restored before the frame needs no full scan');
});
