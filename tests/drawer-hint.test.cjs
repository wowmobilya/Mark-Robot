const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),vm=require('vm'),path=require('path'),acorn=require('acorn'),walk=require('acorn-walk');
const source=fs.readFileSync(path.join(__dirname,'../ui-navigation.js'),'utf8');let fn;walk.simple(acorn.parse(source,{ecmaVersion:'latest'}),{FunctionDeclaration(n){if(n.id.name==='trackOutsideClick')fn=source.slice(n.start,n.end)}});
test('three blank outside clicks hint without closing; single/interactive clicks do not',()=>{
 const classes=new Set();const handle={hidden:false,classList:{add:x=>classes.add(x),remove:x=>classes.delete(x)}};let status,now=10000;
 const document={getElementById:id=>id==='sidebar'?{classList:{contains:()=>true}}:id==='wfSidebarClose'?handle:status,createElement:()=>({setAttribute(){}}),body:{append:x=>status=x}};
 const ctx=vm.createContext({document,root:{lang:'ar',classList:{contains:()=>false}},compact:{matches:true},Date:{now:()=>now},setTimeout:()=>1,clearTimeout:()=>{}});vm.runInContext('let outsideClicks=0,lastOutsideClick=0,hintTimer;'+fn,ctx);
 ctx.event={target:{closest:()=>null}};vm.runInContext('trackOutsideClick(event)',ctx);assert.equal(classes.size,0);
 now+=6000;vm.runInContext('trackOutsideClick(event)',ctx);assert.equal(classes.size,0);
 ctx.event={target:{closest:()=>({})}};vm.runInContext('trackOutsideClick(event)',ctx);assert.equal(classes.size,0);
 ctx.event={target:{closest:()=>null}};vm.runInContext('trackOutsideClick(event);trackOutsideClick(event)',ctx);assert(classes.has('wf-dismiss-hint'));assert(status.textContent.includes('طيّ'));assert.equal(handle.hidden,false);
});
test('drawer pointer shares hint lifetime, mirrors direction and respects reduced motion',()=>{
 const css=fs.readFileSync(path.join(__dirname,'../section-headings.css'),'utf8');
 assert.match(css,/#wfSidebarClose\.wf-dismiss-hint::after/);
 assert.match(css,/pointer-events:none/);
 assert.match(css,/html\[dir="ltr"\][\s\S]*--wf-pointer-flip:-1;--wf-pointer-shift:-3px/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)[\s\S]*#wfSidebarClose\.wf-dismiss-hint::after \{animation:none!important/);
 assert.match(source,/setTimeout\(\(\)=>handle.classList.remove\('wf-dismiss-hint'\),2400\)/);
});
test('narrow pointer stays horizontal outside the handle, never above it',()=>{
 const css=fs.readFileSync(path.join(__dirname,'../section-headings.css'),'utf8');
 assert.doesNotMatch(css,/wfDrawerPointerPhone|rotate\(90deg\)|top:-42px/);
 assert.match(css,/overflow:visible!important/);
 assert.match(css,/--wf-pointer-gap:clamp/);
 for(const width of [320,360,390,420]){
  const handleLeft=width-Math.min(300,.86*width)-18;
  const space=width-Math.min(300,.86*width);
  const pointerWidth=Math.min(44,Math.max(16,space-36)),gap=Math.min(16,Math.max(10,space-48));
  assert(handleLeft-pointerWidth-gap>=0, 'arrow fits at '+width);
 }
});
test('pointer has a soft white halo without a mask clipping the glow',()=>{
 const css=fs.readFileSync(path.join(__dirname,'../section-headings.css'),'utf8');
 assert.match(css,/filter:drop-shadow\(0 0 2px #fff\) drop-shadow\(0 0 5px rgba\(255,255,255,.95\)\)/);
 assert.match(css,/background-image:url/);
 assert.doesNotMatch(css,/mask:url/);
});
