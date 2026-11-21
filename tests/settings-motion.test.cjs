const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'../settings-navigation.js'),'utf8');
const start=source.indexOf(' let panelAnimation;'),end=source.indexOf(' // The directory retains normal navigation.',start);
assert(start>=0&&end>start);
function fixture(){
 const calls={switches:[],animations:[],focus:[],placements:0},events={},root={dataset:{}},media={matches:false};
 const panels=Object.fromEntries(['company','bank','invoice'].map(key=>[key,{animate(frames,options){const animation={key,frames,options,cancelled:0,cancel(){this.cancelled++;}};calls.animations.push(animation);return animation;}}]));
 const dialog={open:false,addEventListener(type,callback){events[type]=callback;}},page={active:true,classList:{contains(){return page.active;}}};
 const window={switchTab(key){calls.switches.push({key,receiver:this});return 'selected:'+key;},matchMedia(){return media;}};
 const context=vm.createContext({window,document:{documentElement:root,getElementById:id=>panels[id.slice(5)]},dialog,page,
  opener:{focus(options){calls.focus.push(options);}},placeNavigation(){calls.placements++;}});
 vm.runInContext(source.slice(start,end),context);
 return {window,dialog,page,root,media,calls,closeEvent:()=>events.close()};
}

test('selecting hidden settings prepares the real section without starting an invisible panel animation',()=>{
 const f=fixture();assert.equal(f.window.switchTab('company'),'selected:company');
 assert.equal(f.calls.switches.length,1);assert.equal(f.calls.switches[0].receiver,f.window);assert.equal(f.calls.animations.length,0);
});

test('open section changes replace only their previous short compositor animation',()=>{
 const f=fixture();f.dialog.open=true;f.window.switchTab('company');f.window.switchTab('bank');
 assert.equal(f.calls.animations.length,2);assert.equal(f.calls.animations[0].cancelled,1);assert.equal(f.calls.animations[1].cancelled,0);
 for(const animation of f.calls.animations){assert(animation.options.duration<=150);assert.deepEqual(Object.keys(animation.frames[0]),['opacity','transform']);}
});

test('a queued close event cannot cancel or steal focus from a newly reopened editor',()=>{
 const f=fixture();f.dialog.open=true;f.window.switchTab('company');f.dialog.open=false;f.dialog.open=true;f.window.switchTab('invoice');
 const current=f.calls.animations.at(-1);f.closeEvent();
 assert.equal(current.cancelled,0);assert.equal(f.calls.placements,0);assert.equal(f.calls.focus.length,0);
 f.dialog.open=false;f.closeEvent();assert.equal(current.cancelled,1);assert.equal(f.calls.placements,1);assert.equal(f.calls.focus.length,1);assert.equal(f.calls.focus[0].preventScroll,true);
});

test('app and operating-system reduced motion keep the editor response immediate',()=>{
 const f=fixture();f.dialog.open=true;f.root.dataset.wfMotion='reduced';f.window.switchTab('bank');assert.equal(f.calls.animations.length,0);
 delete f.root.dataset.wfMotion;f.media.matches=true;f.window.switchTab('invoice');assert.equal(f.calls.animations.length,0);
 f.media.matches=false;f.window.switchTab('company');assert.equal(f.calls.animations.length,1);
 f.page.active=false;f.dialog.open=false;f.closeEvent();assert.equal(f.calls.focus.length,0);
});
