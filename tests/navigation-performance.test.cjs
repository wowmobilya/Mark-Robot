const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),acorn=require('acorn'),walk=require('acorn-walk');
const source=fs.readFileSync(path.join(__dirname,'../ui-navigation.js'),'utf8'),functions={};
walk.simple(acorn.parse(source,{ecmaVersion:'latest'}),{FunctionDeclaration(node){if(['syncScroll','syncHome','scheduleHome','syncSectionHeadings'].includes(node.id.name))functions[node.id.name]=source.slice(node.start,node.end);}});
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
