const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
test('bottom circle recovers from a hidden nav and stays inside both viewport edges',()=>{
 let width=0,left=0,queued,observer;const circle={offsetWidth:48,style:{}};
 const nav={style:{setProperty(){}},getBoundingClientRect:()=>({left:0,width}),querySelector:()=>null};
 const button={getBoundingClientRect:()=>({left,width:64})};
 const context={document:{documentElement:{},getElementById:id=>id==='bottomNav'?nav:id==='bnavCircle'?circle:button},getComputedStyle:()=>({display:width?'flex':'none'}),requestAnimationFrame:fn=>(queued=fn,1),ResizeObserver:class{observe(){}},MutationObserver:class{constructor(fn){observer=fn}observe(){}},window:{bnavMoveToIndex(){},addEventListener(){},visualViewport:{addEventListener(){}}}};
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../bottomnav-fit.js'),'utf8'),context);queued();assert.equal(circle.style.left,undefined);
 width=320;left=0;observer();queued();assert.equal(circle.style.left,'8px');
 left=300;context.window.bnavMoveToIndex(0);queued();assert.equal(circle.style.left,'268px');
 assert(Number.parseFloat(circle.style.left)+48<=width);
});
test('save dock reserves form space and client type icons have correct semantics',()=>{
 const css=fs.readFileSync(path.join(__dirname,'../settings-responsive.css'),'utf8');assert(css.includes('position:fixed'));assert(css.includes('padding-bottom:calc(94px'));assert(css.includes('scroll-margin-bottom:100px'));
 const js=fs.readFileSync(path.join(__dirname,'../ui-icons.js'),'utf8');assert(js.includes("action.includes('internal_retail'))iconName='store'"));assert(js.includes("action.includes('internal_wholesale'))iconName='warehouse'"));assert(js.includes("action.includes('external'))iconName='globe'"));
});
