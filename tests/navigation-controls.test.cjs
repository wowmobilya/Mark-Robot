const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const acorn=require('acorn');
const walk=require('acorn-walk');
const source=fs.readFileSync(require('node:path').join(__dirname,'../ui-navigation.js'),'utf8');
const functions={};
walk.simple(acorn.parse(source,{ecmaVersion:'latest'}),{FunctionDeclaration(node){if(['syncBackButtons','syncControls','syncSectionHeadings'].includes(node.id.name))functions[node.id.name]=source.slice(node.start,node.end)}});
function fixture(){
 const root={dir:'rtl',lang:'ar',classList:{contains:()=>false}};
 const text={nodeType:3,nodeValue:'← '};const label={nodeType:1,textContent:'رجوع'};
 const oldIcon={remove(){this.removed=true}};
 const handler=()=>42;
 const button={childNodes:[text,label],onclick:handler,attrs:{},icon:null,
  querySelector(){return this.icon},querySelectorAll(){return [oldIcon]},
  prepend(icon){this.icon=icon;this.childNodes.unshift(icon)},setAttribute(k,v){this.attrs[k]=v}};
 const obsolete={remove(){this.removed=true}};
 const document={createElement(){return {dataset:{},attrs:{},setAttribute(k,v){this.attrs[k]=v}}},
  getElementById(){return null},querySelector(){return null},
  querySelectorAll(selector){if(selector==='.page .sct-back-btn')return [button];if(selector==='.wf-section-menu')return [obsolete];return []}};
 const context=vm.createContext({root,document,compact:{matches:false},menuSvg:'',foldSvg:''});
 vm.runInContext(functions.syncBackButtons+'\n'+functions.syncSectionHeadings+'\n'+functions.syncControls,context);
 return {context,root,button,text,label,oldIcon,obsolete,handler};
}
test('section menu removed, original back handler and localized label retained',()=>{
 const f=fixture();vm.runInContext('syncControls()',f.context);
 assert.equal(f.obsolete.removed,true);assert.equal(f.oldIcon.removed,true);
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
