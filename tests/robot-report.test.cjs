const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {segmentsFor,segmentAt,reportLocale,reportVoiceState,reportControlAction,voiceSetupFor}=require('../robot-report.js');
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
 const nodes=[],events=new Map(),documentEvents=new Map(),timers=new Map(),calls=[],observers=[],materialValues={};let timerId=0,styleReads=0;
 let document;
 class Element{
  constructor(tag){this.tagName=tag.toUpperCase();this.children=[];this.events={};this.attributes={};this.dataset={};this.inert=false;this.hidden=false;this.disabled=false;
   this.tabIndex=['BUTTON','A','INPUT'].includes(this.tagName)?0:-1;this.scrollTop=0;this.scrolls=[];this._classes=new Set();
   this.classList={add:(...names)=>names.forEach(name=>this._classes.add(name)),remove:(...names)=>names.forEach(name=>this._classes.delete(name)),contains:name=>this._classes.has(name),toggle:(name,value)=>value?this._classes.add(name):this._classes.delete(name)};
   this.style={setProperty(name,value){this[name]=value;},getPropertyValue(name){return this[name]||'';}};nodes.push(this);}
  set className(value){this._classes=new Set(value.split(/\s+/).filter(Boolean));}get className(){return [...this._classes].join(' ');}
  append(...children){for(const child of children){if(child.parentNode)child.parentNode.children=child.parentNode.children.filter(item=>item!==child);child.parentNode=this;this.children.push(child);}}
  replaceChildren(...children){this.children=[];this.append(...children);}
  replaceWith(other){const siblings=this.parentNode.children;siblings[siblings.indexOf(this)]=other;other.parentNode=this.parentNode;}
  get firstElementChild(){return this.children[0]||null;}
  setAttribute(name,value){this.attributes[name]=String(value);if(name==='tabindex')this.tabIndex=Number(value);}
  getAttribute(name){return this.attributes[name]??null;}removeAttribute(name){delete this.attributes[name];}
  addEventListener(name,listener){this.events[name]=listener;}
  removeEventListener(name){delete this.events[name];}
  focus(){document.activeElement=this;}
  contains(element){return element===this||this.children.some(child=>child.contains(element));}
  closest(selector){let current=this;while(current){if(selector==='[inert],[hidden]'?(current.hidden||current.inert):selector.startsWith('.')?current.classList.contains(selector.slice(1)):selector.startsWith('#')?current.id===selector.slice(1):false)return current;current=current.parentNode;}return null;}
  querySelectorAll(){return nodes.filter(node=>node!==this&&this.contains(node)&&(node.tagName==='BUTTON'||node.tabIndex>=0));}
  getBoundingClientRect(){return this.rect||{top:0,bottom:44,left:0,right:390,width:390,height:44};}
  scrollTo(options){this.scrollTop=options.top;this.scrolls.push(options);}
  setPointerCapture(id){this.pointer=id;}releasePointerCapture(){this.pointer=null;}
  get isConnected(){return true;}
 }
 const html=new Element('html');html.lang='ar';
 const body=new Element('body'),main=new Element('main');main.id='mainContent';main.rect={top:0,bottom:844,left:0,right:390,width:390,height:844};
 const dashboard=new Element('section');dashboard.id='page-dashboard';dashboard.classList.add('active','page');main.append(dashboard);
 const settings=new Element('section');settings.id='page-settings';settings.classList.add('page');main.append(settings);let activePage=dashboard;
 const card=new Element('div');card.className='wf-greeting-flip';dashboard.append(card);
 const faces=new Element('div');faces.className='wf-greeting-faces';card.append(faces);
 const behind=new Element('button');body.append(main,behind);
 document={documentElement:html,body,activeElement:behind,createElement:tag=>new Element(tag),getElementById:id=>nodes.find(node=>node.id===id)||null,querySelector:selector=>selector==='#mainContent'?main:selector==='#page-dashboard'?dashboard:selector==='.page.active'?activePage:selector==='.wf-greeting-flip'?card:selector==='.wf-greeting-faces'?faces:null,
  querySelectorAll:()=>nodes.filter(node=>node.tagName==='BUTTON'||node.tabIndex>=0),addEventListener:(name,listener)=>documentEvents.set(name,listener),removeEventListener:name=>documentEvents.delete(name)};
 class CustomEvent{constructor(type,{detail}={}){this.type=type;this.detail=detail;}}
 const window={addEventListener(name,listener){const group=events.get(name)||[];group.push(listener);events.set(name,group);},dispatchEvent(event){if(event.type==='wf-robot-report-control')calls.push(event.detail.action);for(const listener of events.get(event.type)||[])listener(event);},
  showPage(name){activePage.classList.remove('active');activePage=name==='dashboard'?dashboard:settings;activePage.classList.add('active');},
  WFProgramSpeech:{pause(){calls.push('pause');},resume(){calls.push('resume');},stop(){calls.push('stop');}},visualViewport:{width:390,height:844,offsetLeft:0,offsetTop:0,addEventListener(){}}};
 const schedule=callback=>{const id=++timerId;timers.set(id,callback);return id;};
 vm.runInNewContext(fs.readFileSync(path.resolve(__dirname,'../robot-report.js'),'utf8'),{window,document,CustomEvent,Intl,innerWidth:390,innerHeight:844,
  matchMedia:()=>({matches:true}),getComputedStyle:()=>{styleReads++;return {visibility:'visible',getPropertyValue:name=>materialValues[name]||''};},setTimeout:schedule,clearTimeout:id=>timers.delete(id),requestAnimationFrame:schedule,cancelAnimationFrame:id=>timers.delete(id),
  MutationObserver:class{constructor(callback){this.callback=callback;observers.push(this);}observe(target,options){this.target=target;this.options=options;}}});
 const get=className=>nodes.find(node=>node.classList.contains(className));
 return {window,document,nodes,calls,behind,main,dashboard,card,faces,get,observers,materialValues,get styleReads(){return styleReads;},
  emit(type,detail){window.dispatchEvent(new CustomEvent(type,{detail}));},
  click(className){get(className).events.click({isTrusted:true});},
  key(key,shiftKey=false){let prevented=false;documentEvents.get('keydown')?.({key,shiftKey,preventDefault(){prevented=true;}});return prevented;},
  flush(){for(const[id,callback]of [...timers]){timers.delete(id);callback();}}};
}
function exampleReport(){
 const narration='Sales: 12.50. Balance: 9.25.';
 return {date:'2026-11-20',narration,narrationSegments:[{text:'Sales: 12.50.',start:0,end:13},{text:'Balance: 9.25.',start:14,end:28}]};
}

test('report expansion stays in its original smart card without blocking dashboard controls',()=>{
 const f=reportUIFixture();f.emit('wf-robot-report-open',{snapshot:exampleReport(),locale:'en'});
 const sheet=f.get('wf-robot-report-sheet');
 assert.equal(sheet.parentNode===f.card,true,'the live reader belongs to the original smart card');
 assert.equal(sheet.getAttribute('role'),'region');
 assert.equal(sheet.getAttribute('aria-modal'),null);
 assert.equal(f.behind.inert,false);
 assert.equal(f.get('wf-robot-report-shade'),undefined);
 f.behind.focus();assert.equal(f.key('Tab'),false,'normal document tab order remains available');
 assert.deepEqual(f.calls,[],'expansion is silent');
 const wrapper=f.document.createElement('section');f.dashboard.append(wrapper);wrapper.append(f.card);
 assert.equal(sheet.parentNode===f.card,true,'home customization moves the original card and its report together');
 assert.equal(f.window.WFRobotReport.show(),true);assert.deepEqual(f.calls,[]);
});

test('scroll-only style changes do not recalculate reader colors while real theme changes coalesce',()=>{
 const f=reportUIFixture(),root=f.document.documentElement;
 const observer=f.observers.find(value=>value.target===root&&value.options.attributeFilter.includes('data-theme'));
 const before=f.styleReads;
 for(let i=0;i<100;i++){root.setAttribute('style','--wf-scroll-progress: '+i+'%');observer.callback();}
 f.flush();assert.equal(f.styleReads,before,'idle reader must not force workspace style reads during scrolling');
 f.materialValues['--paper']='#172c37';root.setAttribute('data-theme','dark');observer.callback();
 root.setAttribute('style','--brand-primary: #3f7c94; --wf-scroll-progress: 42%');observer.callback();
 assert.equal(f.styleReads,before,'color reads wait for the next paint');f.flush();
 assert.equal(f.styleReads,before+1);assert.equal(f.document.body.style.getPropertyValue('--wf-reader-paper'),'#172c37');
 root.setAttribute('style','--brand-primary: #3f7c94; --wf-scroll-progress: 99%');observer.callback();f.flush();assert.equal(f.styleReads,before+1);
});

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

test('a compact spoken summary highlights every original paragraph it covers without changing their text',()=>{
 const f=reportUIFixture(),snapshot=exampleReport();
 f.emit('wf-robot-report-open',{snapshot,locale:'en'});f.emit('wf-robot-report-playback',{state:'speaking'});
 const paragraphs=f.nodes.filter(node=>node.classList.contains('wf-report-sentence'));
 f.emit('wf-robot-report-boundary',{charIndex:0,charLength:snapshot.narration.length});
 assert(paragraphs.every(node=>node.classList.contains('is-reading')));
 assert.equal(paragraphs[0].getAttribute('aria-current'),'true');assert.equal(paragraphs[1].getAttribute('aria-current'),null);
 assert.deepEqual(paragraphs.map(node=>node.textContent),['Sales: 12.50.','Balance: 9.25.']);
 f.emit('wf-robot-report-boundary',{charIndex:14,charLength:14});
 assert(!paragraphs[0].classList.contains('is-reading'));assert(paragraphs[1].classList.contains('is-reading'));
});

test('closing the minimized reader clears its launcher without recreating or replaying the report',()=>{
 const f=reportUIFixture();f.emit('wf-robot-report-open',{snapshot:exampleReport(),locale:'en'});
 f.click('wf-report-minimize');f.flush();assert(f.window.WFRobotReport.isMinimized());
 assert.equal(f.window.WFRobotReport.close(),true);assert.equal(f.window.WFRobotReport.isMinimized(),false);
 assert.equal(f.window.WFRobotReport.hasReport(),true);assert.equal(f.get('wf-robot-report-sheet').hidden,true);
 assert.equal(f.window.WFRobotReport.close(),false);assert.deepEqual(f.calls,[]);
});
test('the report speed stepper tracks the actual owner in 0.05 steps without restarting or saving',()=>{
 const f=reportUIFixture(),owner=f.window.WFProgramSpeech;let state={kind:'report',active:true,rate:.85};
 owner.getState=()=>state;owner.setRate=rate=>{state={...state,rate};f.calls.push(rate);return true;};
 f.emit('wf-robot-report-open',{snapshot:exampleReport(),locale:'ar'});
 const speed=f.get('wf-report-rate'),down=f.get('wf-report-rate-down'),up=f.get('wf-report-rate-up');assert.equal(speed.tagName,'OUTPUT');assert.equal(speed.dataset.rate,'0.85');
 assert.equal(down.getAttribute('aria-label'),'قراءة أبطأ');assert.equal(up.getAttribute('aria-label'),'قراءة أسرع');
 assert.equal(speed.getAttribute('aria-live'),'polite');assert.equal(f.get('wf-report-speed').children[0].textContent,'سرعة القراءة');
 f.click('wf-report-rate-up');assert.deepEqual(f.calls,[.9]);assert.equal(speed.dataset.rate,'0.9');
 f.click('wf-report-rate-down');assert.deepEqual(f.calls,[.9,.85]);assert.equal(speed.dataset.rate,'0.85');
 state={...state,rate:.75};f.emit('wf-program-speech-state',state);assert.equal(speed.dataset.rate,'0.75');assert(down.disabled);assert(!up.disabled);
 f.click('wf-report-rate-down');assert.deepEqual(f.calls,[.9,.85]);
 state={...state,rate:1.25};f.emit('wf-program-speech-state',state);assert(up.disabled);assert(!down.disabled);
 f.click('wf-report-rate-up');assert.deepEqual(f.calls,[.9,.85]);
 state={kind:'program',active:true,rate:1};f.emit('wf-program-speech-state',state);assert(down.disabled);assert(up.disabled);
 f.click('wf-report-rate-up');assert.deepEqual(f.calls,[.9,.85]);
});
test('the speed control shows only accepted rates and localizes its actions in every supported language',()=>{
 const labels={ar:['سرعة القراءة','قراءة أبطأ','قراءة أسرع'],en:['Reading speed','Read slower','Read faster'],tr:['Okuma hızı','Daha yavaş oku','Daha hızlı oku'],fr:['Vitesse de lecture','Lire plus lentement','Lire plus vite'],ru:['Скорость чтения','Читать медленнее','Читать быстрее']};
 for(const [locale,words]of Object.entries(labels)){
  const f=reportUIFixture(),owner=f.window.WFProgramSpeech;owner.getState=()=>({kind:'report',active:true,rate:1.1});owner.setRate=rate=>{f.calls.push(rate);return false;};
  f.emit('wf-robot-report-open',{snapshot:exampleReport(),locale});
  assert.equal(f.get('wf-report-speed').children[0].textContent,words[0]);
  assert.equal(f.get('wf-report-rate-down').getAttribute('aria-label'),words[1]);assert.equal(f.get('wf-report-rate-up').getAttribute('aria-label'),words[2]);
  f.click('wf-report-rate-down');assert.deepEqual(f.calls,[1.05]);assert.equal(f.get('wf-report-rate').dataset.rate,'1.1');
  assert.equal(f.get('wf-report-rate').textContent,new Intl.NumberFormat(locale,{maximumFractionDigits:2}).format(1.1)+'×');
  assert.equal(f.nodes.some(node=>node.tagName==='SELECT'),false);
 }
});

test('Exit stops playback once, closes the card and removes its minimized state',()=>{
 const f=reportUIFixture();f.emit('wf-robot-report-open',{snapshot:exampleReport(),locale:'ar'});
 assert.equal(f.get('wf-report-close').children[1].textContent,'خروج');
 assert.equal(f.get('wf-report-minimize').children[1].textContent,'طيّ التقرير');
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

test('Escape collapses only the focused inline report and never traps document focus',()=>{
 const f=reportUIFixture();f.emit('wf-robot-report-open',{snapshot:exampleReport(),locale:'en'});
 f.behind.focus();assert.equal(f.key('Tab'),false);assert.equal(f.key('Escape'),false);
 assert.equal(f.get('wf-robot-report-sheet').hidden,false);assert.equal(f.behind.inert,false);
 f.get('wf-report-minimize').focus();assert.equal(f.key('Escape'),true);f.flush();
 assert.equal(f.get('wf-robot-report-sheet').hidden,true);assert.equal(f.document.activeElement,f.behind);assert.deepEqual(f.calls,[]);
});

test('route changes minimize without stopping and a show event restores the reader',()=>{
 const f=reportUIFixture();f.emit('wf-robot-report-open',{snapshot:exampleReport(),locale:'en'});
 f.emit('hashchange');f.flush();assert.equal(f.get('wf-robot-report-sheet').hidden,true);assert.deepEqual(f.calls,[]);
 f.emit('wf-robot-report-show');assert.equal(f.get('wf-robot-report-sheet').hidden,false);
});

test('reopening from another section returns to the original smart card without an immediate route collapse',()=>{
 const f=reportUIFixture();f.emit('wf-robot-report-open',{snapshot:exampleReport(),locale:'en'});
 const routeObserver=f.observers.find(item=>item.target===f.main&&item.options.attributeFilter.includes('class'));
 f.window.showPage('settings');routeObserver.callback();f.flush();assert.equal(f.get('wf-robot-report-sheet').hidden,true);
 assert.equal(f.window.WFRobotReport.show(),true);routeObserver.callback();f.flush();
 assert.equal(f.dashboard.classList.contains('active'),true);assert.equal(f.get('wf-robot-report-sheet').hidden,false);
 assert.deepEqual(f.calls,[]);
});

test('a hidden smart card keeps the minimized speech controls available instead of opening an invisible report',()=>{
 const f=reportUIFixture();f.emit('wf-robot-report-open',{snapshot:exampleReport(),locale:'en'});
 f.click('wf-report-minimize');f.flush();f.card.hidden=true;
 assert.equal(f.window.WFRobotReport.show(),false);assert.equal(f.window.WFRobotReport.isMinimized(),true);
 assert.equal(f.get('wf-robot-report-sheet').hidden,true);assert.deepEqual(f.calls,[]);
 f.card.hidden=false;assert.equal(f.window.WFRobotReport.show(),true);
 const visibilityObserver=f.observers.find(item=>item.target===f.card&&item.options.attributeFilter.includes('hidden'));
 f.card.hidden=true;visibilityObserver.callback();f.flush();
 assert.equal(f.get('wf-robot-report-sheet').hidden,true);assert.equal(f.window.WFRobotReport.isMinimized(),true);assert.deepEqual(f.calls,[]);
});

test('report text remains normal page content and cannot activate the carousel or start voice',()=>{
 const f=reportUIFixture();f.emit('wf-robot-report-open',{snapshot:exampleReport(),locale:'en'});
 const sheet=f.get('wf-robot-report-sheet');let stopped=false;
 sheet.events.click({isTrusted:true,stopPropagation(){stopped=true;}});
 assert.equal(stopped,true);assert.deepEqual(f.calls,[]);
 assert.equal(sheet.events.pointerdown,undefined);assert.equal(sheet.events.pointermove,undefined);
 assert.equal(f.get('wf-report-body').events.pointermove,undefined);
 let flipsBlocked=0;
 f.card.events.click({target:f.card,stopImmediatePropagation(){flipsBlocked++;}});
 f.card.events.keydown({target:f.card,key:'ArrowDown',stopImmediatePropagation(){flipsBlocked++;}});
 assert.equal(flipsBlocked,2,'blank-card taps and parent navigation keys cannot flip the expanded source card');
 f.card.events.click({target:{closest:()=>({tagName:'BUTTON'})},stopImmediatePropagation(){flipsBlocked++;}});
 assert.equal(flipsBlocked,2,'explicit source buttons retain their action');
});

test('a refreshed audio snapshot cannot reopen a folded report or cancel its folding transition',()=>{
 const f=reportUIFixture();f.emit('wf-robot-report-open',{snapshot:exampleReport(),locale:'en'});
 f.click('wf-report-minimize');
 f.emit('wf-robot-report-open',{snapshot:exampleReport(),locale:'en',reveal:false});f.flush();
 assert.equal(f.get('wf-robot-report-sheet').hidden,true);assert.equal(f.window.WFRobotReport.isMinimized(),true);
 assert.deepEqual(f.calls,[]);
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
