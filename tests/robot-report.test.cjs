const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {segmentsFor,segmentAt,sheetGeometry,snapSheet,reportLocale,reportVoiceState,reportControlAction,voiceSetupFor}=require('../robot-report.js');
test('preserves exact Arabic speech offsets and decimal amounts',()=>{
 const narration='مبيعات اليوم: 12.50 دولار أمريكي. الديون: 9.25 دولار أمريكي.';
 const first='مبيعات اليوم: 12.50 دولار أمريكي.';
 const segments=[{text:first,start:0,end:first.length},{text:narration.slice(first.length+1),start:first.length+1,end:narration.length}];
 assert.deepEqual(segmentsFor({narration,narrationSegments:segments}),segments);
 assert.equal(segmentAt(segments,first.length+1),1);
 assert.equal(segmentAt(segments,10),0);
});
test('does not split decimal punctuation or invent timing when offsets are absent',()=>{
 const narration='Sales: 12.50. Balance: 9.25.';
 assert.deepEqual(segmentsFor({narration}),[{text:narration,start:0,end:narration.length}]);
 assert.equal(segmentAt([],2),-1);
 assert.equal(segmentAt([{start:0,end:10}],-1),-1);
});
test('rejects inconsistent segments and leaves unavailable reports empty',()=>{
 assert.deepEqual(segmentsFor({narration:''}),[]);
 assert.deepEqual(segmentsFor({narration:'Good',narrationSegments:[{text:'Wrong',start:0,end:5}]}),[{text:'Good',start:0,end:4}]);
});
test('overlapping, reversed, truncated and skipped narration segments cannot mislabel visible content',()=>{
 const narration='First. Second.';
 const first={text:'First.',start:0,end:6},second={text:'Second.',start:7,end:14};
 for(const narrationSegments of [[first,first],[second,first],[first],[second],[{text:'First.',start:0,end:99}]]){
  assert.deepEqual(segmentsFor({narration,narrationSegments}),[{text:narration,start:0,end:narration.length}]);
 }
 assert.deepEqual(segmentsFor({narration,narrationSegments:[first,second]}),[first,second]);
});
test('the unified phone reader uses most of the visible screen independent of the dashboard robot',()=>{
 const geometry=sheetGeometry({width:390,height:844,anchorBottom:400,mainLeft:0,mainRight:390});
 assert(geometry.height>=730);assert.equal(geometry.compact,false);
 assert.equal(geometry.top,80);assert(geometry.top+geometry.height<=836);
 assert(geometry.left>=8&&geometry.left+geometry.width<=382);
});
test('short landscape placement keeps a usable report and footer within the visible viewport',()=>{
 for(const [width,height] of [[844,390],[740,360],[360,250]]){
  const geometry=sheetGeometry({width,height,anchorBottom:330,mainLeft:0,mainRight:width});
  assert.equal(geometry.compact,true);
  assert(geometry.height>=height-72-(width<768?16:32));
  assert(geometry.top>=8);
  assert(geometry.top+geometry.height<=height-8);
  assert(geometry.left>=8&&geometry.left+geometry.width<=width-8);
 }
});
test('visual viewport offsets and wide desktop caps remain inside the visible area',()=>{
 const mobile=sheetGeometry({width:320,height:410,offsetLeft:30,offsetTop:70,anchorBottom:280,mainLeft:0,mainRight:390});
 assert(mobile.left>=38&&mobile.left+mobile.width<=342);
 assert(mobile.top>=78&&mobile.top+mobile.height<=472);
 const desktop=sheetGeometry({width:1920,height:1080,anchorBottom:350,mainLeft:280,mainRight:1880});
 assert(desktop.height>=900);assert.equal(desktop.width,1100);assert(desktop.left>292);
});
test('expanded and compact docking stays within the visible viewport after a resize',()=>{
 for(const size of [{width:390,height:844},{width:844,height:390},{width:280,height:260,offsetLeft:15,offsetTop:90}]){
  const top=sheetGeometry({...size,dock:'top',expanded:true}),bottom=sheetGeometry({...size,dock:'bottom',expanded:false});
  assert(top.height>=bottom.height);
  if(size.height>=600)assert(top.height>bottom.height);
  assert(top.top>=(size.offsetTop||0)+8);
  assert(bottom.top+bottom.height<=size.height+(size.offsetTop||0)-8);
  assert(top.left+top.width<=size.width+(size.offsetLeft||0)-8);
 }
});
test('compact landscape never shrinks below the space needed by reading and playback controls',()=>{
 for(const [width,height,expected] of [[844,390,286],[740,360,272],[390,844,360]]){
  for(const dock of ['top','bottom']){
   const geometry=sheetGeometry({width,height,dock,expanded:false});
   assert(geometry.height>=expected);
   assert(geometry.top+geometry.height<=height-8);
  }
 }
});
test('a deliberate vertical drag snaps the reader while small accidental movement leaves it unchanged',()=>{
 assert.equal(typeof snapSheet,'function','dragging needs a bounded snap decision');
 assert.deepEqual(snapSheet({deltaY:100,height:844,dock:'top',expanded:true}),{dock:'bottom',expanded:false});
 assert.deepEqual(snapSheet({deltaY:-100,height:844,dock:'bottom',expanded:false}),{dock:'top',expanded:true});
 assert.deepEqual(snapSheet({deltaY:12,height:844,dock:'bottom',expanded:true}),{dock:'bottom',expanded:true});
});
test('voice setup uses download and cancellation actions instead of a dead replay control',()=>{
 for(const playback of ['ready','preparing','speaking','failed','finished']){
  assert.equal(reportControlAction('missing',playback),'install');
  assert.equal(reportControlAction('error',playback),'install');
  assert.equal(reportControlAction('downloading',playback),'cancel-download');
  assert.equal(reportControlAction('unsupported',playback),null);
 }
 assert.equal(reportControlAction('ready','speaking'),'pause');
 assert.equal(reportControlAction('ready','preparing'),'pause');
 assert.equal(reportControlAction('ready','paused'),'resume');
 assert.equal(reportControlAction('ready','finished'),'replay');
 assert.equal(reportControlAction(undefined,'ready'),'replay');
});

function reportUIFixture(){
 const nodes=[],events=new Map(),documentEvents=new Map(),timers=new Map(),calls=[],observers=[];let timerId=0;
 let document;
 class Element{
  constructor(tag){this.tagName=tag.toUpperCase();this.children=[];this.events={};this.attributes={};this.dataset={};this.inert=false;this.hidden=false;this.disabled=false;
   this.tabIndex=['BUTTON','A','INPUT'].includes(this.tagName)?0:-1;this.scrollTop=0;this.scrolls=[];this._classes=new Set();
   this.classList={add:(...names)=>names.forEach(name=>this._classes.add(name)),remove:(...names)=>names.forEach(name=>this._classes.delete(name)),contains:name=>this._classes.has(name),toggle:(name,value)=>value?this._classes.add(name):this._classes.delete(name)};
   this.style={setProperty(name,value){this[name]=value;}};nodes.push(this);}
  set className(value){this._classes=new Set(value.split(/\s+/).filter(Boolean));}get className(){return [...this._classes].join(' ');}
  append(...children){for(const child of children){child.parentNode=this;this.children.push(child);}}
  replaceChildren(...children){this.children=[];this.append(...children);}
  replaceWith(other){const siblings=this.parentNode.children;siblings[siblings.indexOf(this)]=other;other.parentNode=this.parentNode;}
  get firstElementChild(){return this.children[0]||null;}
  setAttribute(name,value){this.attributes[name]=String(value);if(name==='tabindex')this.tabIndex=Number(value);}
  getAttribute(name){return this.attributes[name]??null;}removeAttribute(name){delete this.attributes[name];}
  addEventListener(name,listener){this.events[name]=listener;}
  removeEventListener(name){delete this.events[name];}
  focus(){document.activeElement=this;}
  contains(element){return element===this||this.children.some(child=>child.contains(element));}
  closest(){let current=this;while(current){if(current.hidden||current.inert)return current;current=current.parentNode;}return null;}
  querySelectorAll(){return nodes.filter(node=>node!==this&&this.contains(node)&&(node.tagName==='BUTTON'||node.tabIndex>=0));}
  getBoundingClientRect(){return this.rect||{top:0,bottom:44,left:0,right:390,width:390,height:44};}
  scrollTo(options){this.scrollTop=options.top;this.scrolls.push(options);}
  setPointerCapture(id){this.pointer=id;}releasePointerCapture(){this.pointer=null;}
  get isConnected(){return true;}
 }
 const html=new Element('html');html.lang='ar';
 const body=new Element('body'),main=new Element('main');main.id='mainContent';main.rect={top:0,bottom:844,left:0,right:390,width:390,height:844};
 const dashboard=new Element('section');dashboard.id='page-dashboard';dashboard.classList.add('active');main.append(dashboard);
 const behind=new Element('button');body.append(main,behind);
 document={documentElement:html,body,activeElement:behind,createElement:tag=>new Element(tag),querySelector:selector=>selector==='#mainContent'?main:selector==='#page-dashboard'?dashboard:null,
  querySelectorAll:()=>nodes.filter(node=>node.tagName==='BUTTON'||node.tabIndex>=0),addEventListener:(name,listener)=>documentEvents.set(name,listener),removeEventListener:name=>documentEvents.delete(name)};
 class CustomEvent{constructor(type,{detail}={}){this.type=type;this.detail=detail;}}
 const window={addEventListener(name,listener){const group=events.get(name)||[];group.push(listener);events.set(name,group);},dispatchEvent(event){if(event.type==='wf-robot-report-control')calls.push(event.detail.action);for(const listener of events.get(event.type)||[])listener(event);},
  WFProgramSpeech:{pause(){calls.push('pause');},resume(){calls.push('resume');},stop(){calls.push('stop');}},visualViewport:{width:390,height:844,offsetLeft:0,offsetTop:0,addEventListener(){}}};
 const schedule=callback=>{const id=++timerId;timers.set(id,callback);return id;};
 vm.runInNewContext(fs.readFileSync(path.resolve(__dirname,'../robot-report.js'),'utf8'),{window,document,CustomEvent,Intl,innerWidth:390,innerHeight:844,
  matchMedia:()=>({matches:true}),getComputedStyle:()=>({visibility:'visible'}),setTimeout:schedule,clearTimeout:id=>timers.delete(id),requestAnimationFrame:schedule,cancelAnimationFrame:id=>timers.delete(id),
  MutationObserver:class{constructor(callback){this.callback=callback;observers.push(this);}observe(target){this.target=target;}}});
 const get=className=>nodes.find(node=>node.classList.contains(className));
 return {window,document,nodes,calls,behind,main,dashboard,get,observers,
  emit(type,detail){window.dispatchEvent(new CustomEvent(type,{detail}));},
  click(className){get(className).events.click({isTrusted:true});},
  key(key,shiftKey=false){let prevented=false;documentEvents.get('keydown')?.({key,shiftKey,preventDefault(){prevented=true;}});return prevented;},
  flush(){for(const[id,callback]of [...timers]){timers.delete(id);callback();}}};
}
function exampleReport(){
 const narration='Sales: 12.50. Balance: 9.25.';
 return {date:'2026-11-20',narration,narrationSegments:[{text:'Sales: 12.50.',start:0,end:13},{text:'Balance: 9.25.',start:14,end:28}]};
}

test('minimizing and reopening preserves the exact report and follows boundaries received while hidden',()=>{
 const f=reportUIFixture(),snapshot=exampleReport();
 f.emit('wf-robot-report-open',{snapshot,locale:'en'});f.emit('wf-robot-report-playback',{state:'speaking'});
 const paragraphs=f.nodes.filter(node=>node.classList.contains('wf-report-sentence'));assert.equal(paragraphs.length,2);
 f.emit('wf-robot-report-boundary',{charIndex:0,charLength:13});assert.equal(paragraphs[0].getAttribute('aria-current'),'true');
 f.click('wf-report-minimize');f.flush();assert.equal(f.get('wf-robot-report-sheet').hidden,true);assert.equal(f.window.WFRobotReport.isMinimized(),true);assert.deepEqual(f.calls,[]);
 f.emit('wf-robot-report-boundary',{charIndex:14,charLength:14});
 assert.equal(f.window.WFRobotReport.hasReport(),true);assert.equal(f.window.WFRobotReport.show(),true);
 assert.equal(f.get('wf-robot-report-sheet').hidden,false);assert.equal(paragraphs[1].getAttribute('aria-current'),'true');
 assert.deepEqual(paragraphs.map(p=>p.textContent),['Sales: 12.50.','Balance: 9.25.']);
 assert.equal(f.nodes.filter(node=>node.classList.contains('wf-report-sentence')).length,2,'reopening must reuse the snapshot without rebuilding or reading again');
 assert.deepEqual(f.calls,[]);
});

test('the expanded smart card uses the original SVG and animates from the visible card bounds',()=>{
 const f=reportUIFixture(),originalQuery=f.document.querySelector;
 const svg=f.document.createElement('svg'),clone=f.document.createElement('svg');
 svg.cloneNode=deep=>{assert.equal(deep,true);return clone;};
 const rect={left:40,top:220,width:300,height:200,right:340,bottom:420};
 f.document.querySelector=selector=>selector==='#wfGreetingRobot .wf-robot-face'?svg:
  selector==='#wfGreetingRobot[aria-hidden="false"]'?{getBoundingClientRect:()=>rect}:originalQuery(selector);
 f.emit('wf-robot-report-open',{snapshot:exampleReport(),locale:'en'});
 const sheet=f.get('wf-robot-report-sheet');
 assert.equal(f.get('wf-reader-face').firstElementChild,clone);
 assert.equal(sheet.dataset.dock,'top');assert.equal(sheet.style['--wf-report-top'],'80px');
 assert.equal(Number(sheet.style['--wf-report-origin-w']),300/374);
 assert.equal(Number(sheet.style['--wf-report-origin-h']),200/742);
 assert.equal(sheet.style['--wf-report-origin-x'],'-5px');
 assert.equal(sheet.style['--wf-report-origin-y'],'-131px');
});
test('the report rate selector tracks the real owner and updates without restarting or saving',()=>{
 const f=reportUIFixture(),owner=f.window.WFProgramSpeech;let state={kind:'report',active:true,rate:.85};
 owner.getState=()=>state;owner.setRate=rate=>{state={...state,rate};f.calls.push(rate);return true;};
 f.emit('wf-robot-report-open',{snapshot:exampleReport(),locale:'ar'});
 const speed=f.get('wf-report-rate');assert.equal(speed.value,'0.85');assert.equal(speed.children.length,11);
 assert.equal(speed.getAttribute('aria-label'),'سرعة القراءة');
 speed.value='1.15';speed.events.change();assert.deepEqual(f.calls,[1.15]);assert.equal(speed.value,'1.15');
 state={...state,rate:.75};f.emit('wf-program-speech-state',state);assert.equal(speed.value,'0.75');
 state={kind:'program',active:true,rate:1};f.emit('wf-program-speech-state',state);assert(speed.disabled);
 speed.events.change();assert.deepEqual(f.calls,[1.15]);
});

test('Exit stops playback once, closes the card and removes its minimized state',()=>{
 const f=reportUIFixture();f.emit('wf-robot-report-open',{snapshot:exampleReport(),locale:'ar'});
 assert.equal(f.get('wf-report-close').children[1].textContent,'خروج');
 assert.equal(f.get('wf-report-minimize').children[1].textContent,'تصغير');
 f.emit('wf-robot-report-playback',{state:'speaking'});f.click('wf-report-close');f.click('wf-report-close');f.flush();
 assert.equal(f.window.WFRobotReport.isMinimized(),false);assert.equal(f.get('wf-robot-report-sheet').hidden,true);
 assert.deepEqual(f.calls,['stop']);
});

test('the reader has separate pause, resume and stop actions with actual playback state',()=>{
 const f=reportUIFixture();f.emit('wf-robot-report-open',{snapshot:exampleReport(),locale:'en'});
 f.emit('wf-robot-report-playback',{state:'speaking'});f.click('wf-report-play');
 assert.deepEqual(f.calls,['pause']);
 f.emit('wf-robot-report-playback',{state:'paused'});assert.equal(f.get('wf-robot-report-sheet').dataset.playback,'paused');f.click('wf-report-play');
 assert.deepEqual(f.calls,['pause','resume']);f.click('wf-report-stop');assert.deepEqual(f.calls,['pause','resume','stop']);
});

test('the modal reader contains keyboard focus and restores background controls after minimizing',()=>{
 const f=reportUIFixture();f.emit('wf-robot-report-open',{snapshot:exampleReport(),locale:'en'});
 const sheet=f.get('wf-robot-report-sheet');assert.equal(sheet.getAttribute('aria-modal'),'true');assert.equal(f.behind.inert,true);
 f.behind.focus();assert.equal(f.key('Tab'),true);assert(sheet.contains(f.document.activeElement));
 assert.equal(f.key('Escape'),true);f.flush();assert.equal(f.behind.inert,false);assert.equal(f.document.activeElement,f.behind);assert.deepEqual(f.calls,[]);
});

test('route changes minimize without stopping and a show event restores the reader',()=>{
 const f=reportUIFixture();f.emit('wf-robot-report-open',{snapshot:exampleReport(),locale:'en'});
 f.emit('hashchange');f.flush();assert.equal(f.get('wf-robot-report-sheet').hidden,true);assert.deepEqual(f.calls,[]);
 f.emit('wf-robot-report-show');assert.equal(f.get('wf-robot-report-sheet').hidden,false);
});

test('dragging the dedicated handle changes docking without seeking, restarting or hijacking body scroll',()=>{
 const f=reportUIFixture();f.emit('wf-robot-report-open',{snapshot:exampleReport(),locale:'en'});
 const handle=f.get('wf-report-drag');assert(handle,'the reader needs a dedicated touch handle');
 handle.events.pointerdown({pointerId:1,button:0,clientY:100,preventDefault(){}});
 handle.events.pointermove({pointerId:1,clientY:240,preventDefault(){}});handle.events.pointerup({pointerId:1,clientY:240});
 assert.equal(f.get('wf-robot-report-sheet').dataset.dock,'bottom');assert.equal(f.get('wf-robot-report-sheet').dataset.expanded,'false');
 f.click('wf-report-size');assert.equal(f.get('wf-robot-report-sheet').dataset.expanded,'true');
 f.click('wf-report-dock');assert.equal(f.get('wf-robot-report-sheet').dataset.dock,'top');assert.deepEqual(f.calls,[]);
 assert.equal(f.get('wf-report-body').events.pointermove,undefined);
});
test('download progress accepts the manager ratio and preserves the known size on retry',()=>{
 const missing=reportVoiceState({state:'missing',total:42000000});
 const downloading=reportVoiceState({state:'downloading',progress:.25,loaded:10000000,total:40000000},missing);
 assert.deepEqual(downloading,{state:'downloading',progress:.25,loaded:10000000,total:40000000,reason:''});
 const retry=reportVoiceState({state:'error',reason:'network'},downloading);
 assert.equal(retry.total,40000000);
 assert.equal(voiceSetupFor(downloading,'en').progress,25);
 assert.match(voiceSetupFor(downloading,'en').hint,/10 of 40 MB/);
 assert.match(voiceSetupFor(missing,'en').hint,/About 42 MB/);
 assert.match(voiceSetupFor(retry,'en').hint,/internet connection/);
 assert.equal(reportVoiceState({state:'not-a-state'}),null);
 assert.equal(reportVoiceState({state:'downloading',progress:2,total:100,loaded:200}).progress,1);
 assert.equal(reportVoiceState({state:'downloading',progress:-1,total:100,loaded:-5}).loaded,0);
 assert.equal(reportVoiceState({state:'downloading',progress:NaN,total:100,loaded:50}).progress,.5);
});
test('ready voices hide setup and all five report languages expose the same lifecycle',()=>{
 assert.equal(voiceSetupFor(null,'ar').visible,false);
 const installLabels=new Set(),cancelLabels=new Set();
 for(const locale of ['ar','en','tr','fr','ru']){
  assert.equal(voiceSetupFor(reportVoiceState({state:'ready'}),locale).visible,false);
  for(const state of ['missing','downloading','error','unsupported']){
   const view=voiceSetupFor(reportVoiceState({state,progress:.6,total:42000000,loaded:25200000}),locale);
   assert.equal(view.visible,true);
   assert.equal(view.showProgress,state==='downloading');
   assert.equal(view.progress,60);
   assert(view.title&&view.hint&&view.actionLabel);
   assert(!/\{\w+\}/.test(view.hint));
   if(state==='missing')installLabels.add(view.actionLabel);
   if(state==='downloading')cancelLabels.add(view.actionLabel);
  }
 }
 assert.equal(installLabels.size,5);
 assert.equal(cancelLabels.size,5);
 assert.equal(reportLocale('ar-SA'),'ar');
 assert.equal(reportLocale('tr_TR'),'tr');
 assert.equal(reportLocale('xx','fr'),'fr');
});
test('download failures stay localized and never display raw runtime or server details',()=>{
 const voice=reason=>reportVoiceState({state:'error',reason,total:42000000});
 assert.match(voiceSetupFor(voice('quota-exceeded'),'en').hint,/enough space/);
 assert.match(voiceSetupFor(voice('storage-unavailable'),'en').hint,/site storage/);
 assert.match(voiceSetupFor(voice('offline'),'en').hint,/internet connection/);
 assert.match(voiceSetupFor(voice('integrity-failed'),'en').hint,/required version/);
 assert(!voiceSetupFor(voice('download-failed'),'en').hint.includes('internet connection'));
 const unknown=voiceSetupFor(voice('<server stack> private value'),'ar');
 assert(!unknown.hint.includes('private value'));
 assert.match(unknown.hint,/حاول مجددًا/);
 assert.match(voiceSetupFor(reportVoiceState({state:'unsupported'}),'ar').hint,/التقرير المكتوب/);
});
