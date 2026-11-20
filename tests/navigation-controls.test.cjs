const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const acorn=require('acorn');
const walk=require('acorn-walk');
const source=fs.readFileSync(require('node:path').join(__dirname,'../ui-navigation.js'),'utf8');
const functions={};
walk.simple(acorn.parse(source,{ecmaVersion:'latest'}),{FunctionDeclaration(node){if(['syncBackButtons','syncControls','controlsRootState','syncSectionHeadings','updatePosition'].includes(node.id.name))functions[node.id.name]=source.slice(node.start,node.end)}});
function fixture(){
 const root={dir:'rtl',lang:'ar',classList:{contains:()=>false}};
 const text={nodeType:3,nodeValue:'← '};const label={nodeType:1,textContent:'رجوع'};
 const oldIcon={remove(){this.removed=true}};
 const handler=()=>42;
 const button={childNodes:[text,label],onclick:handler,attrs:{},icon:null,
  querySelector(){return this.icon},querySelectorAll(){return [oldIcon]},
  prepend(icon){this.icon=icon;this.childNodes.unshift(icon)},setAttribute(k,v){this.attrs[k]=v},getAttribute(k){return this.attrs[k]??null}};
 const document={createElement(){return {dataset:{},attrs:{},setAttribute(k,v){this.attrs[k]=v}}},
  getElementById(){return null},querySelector(){return null},
  querySelectorAll(selector){if(selector==='.page .sct-back-btn')return [button];return []}};
 const context=vm.createContext({root,document,compact:{matches:false},sidebar:{querySelectorAll:()=>[]},menuSvg:'',foldSvg:''});
 vm.runInContext(functions.syncBackButtons+'\n'+functions.syncSectionHeadings+'\n'+functions.controlsRootState+'\n'+functions.syncControls,context);
 return {context,root,button,text,label,oldIcon,handler};
}
test('original back handler and localized label are retained',()=>{
 const f=fixture();vm.runInContext('syncControls()',f.context);
 assert.equal(f.oldIcon.removed,true);
 assert.equal(f.button.onclick,f.handler);assert.equal(f.button.onclick(),42);
 assert.ok(f.button.childNodes.includes(f.label));assert.equal(f.text.nodeValue,'');
 assert.equal(f.button.icon.dataset.direction,'right');assert.equal(f.button.attrs['aria-label'],'رجوع');
});
test('back arrow follows RTL/LTR and updates without duplicate icons',()=>{
 const f=fixture();vm.runInContext('syncBackButtons()',f.context);const icon=f.button.icon;
 for(const [lang,dir,label,direction]of [['en','ltr','Back','left'],['tr','ltr','Geri','left'],['fr','ltr','Retour','left'],['ru','ltr','Назад','left'],['ar','rtl','رجوع','right']]){
  f.root.lang=lang;f.root.dir=dir;vm.runInContext('syncBackButtons()',f.context);
  assert.equal(f.button.icon,icon);assert.equal(icon.dataset.direction,direction);assert.equal(f.button.attrs['aria-label'],label);
  assert.match(icon.innerHTML,direction==='left'?/M19 12H5/:/M5 12h14/);
 }
 assert.equal(f.button.childNodes.length,3);assert.equal(f.button.onclick,f.handler);
});

test('internal headings do not acquire a duplicate title and arbitrary page number',()=>{
 const dashboard={id:'page-dashboard',classList:{contains:()=>false}};
 const internal={id:'page-products',classList:{contains:()=>true},querySelector(){throw Error('the page already has its own heading');}};
 let removals=0;
 const context=vm.createContext({main:{querySelectorAll:()=>[dashboard,internal]},dashboard,position:{remove(){removals++;}}});
 vm.runInContext(functions.updatePosition+';updatePosition()',context);
 assert.equal(removals,1);
});

test('drawer pagination fits translated rows at measured heights and preserves every destination',()=>{
 const filter=source.slice(source.indexOf('  function filter()'),source.indexOf('  for (const [button, step]'));
 const groups=[{className:'wf-nav-group'},{className:'wf-nav-group'},{className:'wf-nav-group'}];
 const heights=[44,69,48,54],items=heights.map((height,index)=>({
   parentElement:{parentElement:groups[Math.floor(index/2)]},querySelector:()=>null,textContent:'entry',
   closest(selector){for(let element=this;element;element=element.parentElement)if(selector==='.wf-nav-group'&&element.className==='wf-nav-group')return element;return null;},
   getBoundingClientRect:()=>({height})
 }));
 const pager={hidden:true},nav={
   get clientHeight(){return pager.hidden?170:122},scrollHeight:236,
   classList:{add(){},remove(){}}
 };
 const context=vm.createContext({nav,pager,items,groups,search:{value:''},normalize:s=>s,
   activePage:0,matchingItems:[],empty:{},previous:{setAttribute(){}},next:{setAttribute(){}},
   pageNumber:{},document:{documentElement:{lang:'en'}},getComputedStyle:()=>({paddingTop:'0',paddingBottom:'0',rowGap:'3'})});
 vm.runInContext(filter+';filter()',context);
 assert.deepEqual(items.map(i=>i.hidden),[false,false,true,true]);
 assert.deepEqual(groups.map(group=>group.hidden),[false,true,true]);
 assert.equal(context.pageNumber.textContent,'1 / 2');
 assert.equal(pager.hidden,false);assert.equal(context.previous.disabled,true);assert.equal(context.next.disabled,false);
 vm.runInContext('activePage++;filter()',context);
 assert.deepEqual(items.map(i=>i.hidden),[true,true,false,false]);
 assert.deepEqual(groups.map(group=>group.hidden),[true,false,true]);
 assert.equal(context.pageNumber.textContent,'2 / 2');
 assert.equal(context.previous.disabled,false);assert.equal(context.next.disabled,true);
});
