'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const file=path.resolve(__dirname,'../speech-controls.js');

function fixture({initial={active:false},apiPresent=true,methods,report=true}={}){
 const events=new Map(),calls=[],observers=[];let current=initial,activePage=null;
 class Element{
  constructor(tag){this.tagName=tag.toUpperCase();this.children=[];this.attributes={};this.dataset={};this.events=new Map();this.hidden=false;this.disabled=false;this.textContent='';this.innerHTML='';this.classes=new Set();this.classList={contains:name=>this.classes.has(name),add:name=>this.classes.add(name),remove:name=>this.classes.delete(name),toggle:(name,on)=>on?this.classes.add(name):this.classes.delete(name)};}
  append(...children){for(const child of children){if(child.parentNode)child.parentNode.children=child.parentNode.children.filter(item=>item!==child);this.children.push(child);child.parentNode=this;}}
  setAttribute(name,value){this.attributes[name]=String(value);}
  getAttribute(name){return this.attributes[name]??null;}
  addEventListener(type,handler){this.events.set(type,handler);}
  contains(node){return node===this||this.children.some(child=>child.contains(node));}
  getClientRects(){return this.hidden?[]:[{}];}
  querySelector(selector){return this.querySelectorAll(selector)[0]||null;}
  querySelectorAll(selector){const name=selector.startsWith('.')?selector.slice(1):'';return this.children.flatMap(child=>[...(child.classList.contains(name)?[child]:[]),...child.querySelectorAll(selector)]);}
 }
 const body=new Element('body'),html=new Element('html'),classes=html.classes;html.lang='ar';
 const nav=new Element('nav'),home=new Element('div');nav.classList.add('navbar');home.classList.add('wf-header-controls');nav.append(home);
 const main=new Element('main');main.id='mainContent';
 const page1=new Element('section'),page2=new Element('section'),row1=new Element('header'),row2=new Element('header');
 row1.classList.add('wf-heading-row');row2.classList.add('wf-heading-row');page1.append(row1);page2.append(row2);main.append(page1,page2);body.append(nav,main);
 const find=(node,id)=>node.id===id?node:node.children.map(child=>find(child,id)).find(Boolean);
 const document={body,documentElement:html,createElement:tag=>new Element(tag),getElementById:id=>find(body,id)||null,querySelector:selector=>selector==='.navbar'?nav:selector==='.page.active'?activePage:null};
 const api={getState:()=>current,...(methods||{pause(){calls.push('pause');},resume(){calls.push('resume');return Promise.resolve();},stop(){calls.push('stop');}}),
  speak(){calls.push('unexpected-speak');},preview(){calls.push('unexpected-preview');}};
 const window={document,...(apiPresent?{WFProgramSpeech:api}:{}),...(report?{WFRobotReport:{show(){calls.push('show-report');return true;},close(){calls.push('close-report');emit('wf-robot-report-visibility',{open:false,minimized:false,locale:'ar'});return true;}}}:{}),
  addEventListener(type,handler){if(!events.has(type))events.set(type,new Set());events.get(type).add(handler);}};
 const emit=(type,detail)=>{for(const handler of events.get(type)||[])handler({detail});};
 assert(fs.existsSync(file),'Persistent speech controls must be implemented');
 const context={window,MutationObserver:class{constructor(callback){this.callback=callback;observers.push(this);}observe(target){this.target=target;}}};const source=fs.readFileSync(file,'utf8');vm.runInNewContext(source,context);
 return {window,document,body,nav,home,main,row1,row2,classes,calls,api,node:id=>find(body,id),
  update(value){current=value;emit('wf-program-speech-state',value);},ready(){emit('wf-robot-ready');},
  reportOpen(open,minimized=false,transition){open?classes.add('wf-robot-report-open'):classes.delete('wf-robot-report-open');emit('wf-robot-report-visibility',{open,minimized,locale:'ar',transition});},
  navigate(page){activePage=page===1?page1:page===2?page2:null;activePage?classes.add('wf-section-mode'):classes.delete('wf-section-mode');for(const observer of observers.filter(item=>item.target===main))observer.callback([{target:activePage||main,attributeName:'class'}]);},
  click(id,trusted=true){find(body,id)?.events.get('click')?.({isTrusted:trusted,preventDefault(){},stopPropagation(){}});},
  reload(){vm.runInNewContext(source,context);}};
}
const active=(extra={})=>({active:true,paused:false,canPause:true,kind:'report',phase:'streaming',state:'speaking',message:'مارك يقرأ التقرير',locale:'ar',voiceName:'Mark · local reference',...extra});

test('the dock follows the active owner across sections and never starts speech on load or refresh',()=>{
 const f=fixture();assert.equal(f.node('wfSpeechControls').hidden,true);f.ready();assert.deepEqual(f.calls,[]);
 f.update(active());const dock=f.node('wfSpeechControls');assert.equal(dock.hidden,false);assert.equal(dock.parentNode,f.home);
 assert.equal(f.node('wfSpeechControlsStatus').textContent,'مارك يقرأ التقرير');assert.equal(dock.getAttribute('dir'),'rtl');
 assert.equal(f.node('wfSpeechControlsToggle').disabled,false);assert.equal(f.node('wfSpeechControlsReport').hidden,false);
 f.navigate(1);assert.equal(dock.hidden,false);assert.equal(dock.parentNode,f.row1);assert.deepEqual(f.calls,[]);
 assert(f.row1.classList.contains('wf-speech-toolbar-host'));assert(!f.nav.classList.contains('wf-speech-toolbar-host'));
 f.navigate(2);assert.equal(dock.parentNode,f.row2);assert(!f.row1.classList.contains('wf-speech-toolbar-host'));
 f.navigate(0);assert.equal(dock.parentNode,f.home);assert(!f.row2.classList.contains('wf-speech-toolbar-host'));
 f.update({active:false,state:'finished'});assert.equal(dock.hidden,true);assert.deepEqual(f.calls,[]);
 assert(!f.nav.classList.contains('wf-speech-toolbar-host'));assert(!f.classes.has('wf-speech-toolbar-active'));
});

test('only trusted clicks pause, resume or stop the current reading',async()=>{
 const f=fixture({initial:active()});f.click('wfSpeechControlsToggle',false);f.click('wfSpeechControlsStop',false);assert.deepEqual(f.calls,[]);
 f.click('wfSpeechControlsToggle');assert.deepEqual(f.calls,['pause']);
 f.update(active({paused:true,state:'paused',phase:'',message:'القراءة متوقفة مؤقتًا'}));
 assert.equal(f.node('wfSpeechControlsToggle').getAttribute('aria-label'),'متابعة القراءة');
 f.click('wfSpeechControlsToggle');await Promise.resolve();f.click('wfSpeechControlsStop');assert.deepEqual(f.calls,['pause','resume','stop']);
 f.update({active:false,state:'stopped'});f.click('wfSpeechControlsToggle');f.click('wfSpeechControlsStop');assert.deepEqual(f.calls,['pause','resume','stop']);
});

test('showing the existing report never restarts playback and the dock yields to the open reader',()=>{
 const f=fixture({initial:active()});f.click('wfSpeechControlsReport',false);assert.deepEqual(f.calls,[]);
 f.click('wfSpeechControlsReport');assert.deepEqual(f.calls,['show-report']);
 f.reportOpen(true);assert.equal(f.node('wfSpeechControls').hidden,true);f.reportOpen(false);assert.equal(f.node('wfSpeechControls').hidden,false);
 f.update(active({kind:'program'}));assert.equal(f.node('wfSpeechControlsReport').hidden,true);f.click('wfSpeechControlsReport');assert.deepEqual(f.calls,['show-report']);
});

test('status is the real playback message rendered as text and controls follow the reading language',()=>{
 const f=fixture({initial:active({locale:'en',state:'preparing',phase:'loading',message:'Loading the installed voice…'})});
 assert.equal(f.node('wfSpeechControlsStatus').textContent,'Loading the installed voice…');
 assert.equal(f.node('wfSpeechControlsVoice').textContent,'Mark Robot');assert.equal(f.node('wfSpeechControls').getAttribute('dir'),'ltr');
 assert.equal(f.node('wfSpeechControlsToggle').getAttribute('aria-label'),'Pause reading');
 const message='<img src=x onerror="speech()">';f.update(active({message}));
 assert.equal(f.node('wfSpeechControlsStatus').textContent,message);assert.equal(f.node('wfSpeechControlsStatus').innerHTML,'');
 assert.deepEqual(f.calls,[]);
});

test('missing controls and rejected actions do not crash or start a replacement voice',async()=>{
 const f=fixture({initial:active(),methods:{},report:false});
 assert.equal(f.node('wfSpeechControlsToggle').disabled,true);assert.equal(f.node('wfSpeechControlsStop').disabled,true);assert.equal(f.node('wfSpeechControlsReport').disabled,true);
 for(const id of ['wfSpeechControlsToggle','wfSpeechControlsStop','wfSpeechControlsReport'])assert.doesNotThrow(()=>f.click(id));assert.deepEqual(f.calls,[]);
 const broken=fixture({initial:active({paused:true,state:'paused'}),methods:{resume(){throw new Error('not allowed');},stop(){return Promise.reject(new Error('closed'));}}});
 assert.doesNotThrow(()=>broken.click('wfSpeechControlsToggle'));assert.doesNotThrow(()=>broken.click('wfSpeechControlsStop'));await new Promise(resolve=>setImmediate(resolve));
 assert.deepEqual(broken.calls,[]);
});

test('the dock attaches to a late speech owner and duplicate script loading does not duplicate controls',()=>{
 const f=fixture({initial:active(),apiPresent:false});assert.equal(f.node('wfSpeechControls').hidden,true);
 f.window.WFProgramSpeech=f.api;f.ready();assert.equal(f.node('wfSpeechControls').hidden,false);f.reload();
 assert.equal(f.home.children.filter(node=>node.id==='wfSpeechControls').length,1);f.click('wfSpeechControlsToggle');assert.deepEqual(f.calls,['pause']);
});

test('a minimized silent report can be reopened from the top launcher without restarting speech',()=>{
 const f=fixture();
 f.reportOpen(true);f.reportOpen(false,true);f.update({active:false,state:'finished'});
 assert.equal(f.node('wfSpeechControls').hidden,false);assert.equal(f.node('wfSpeechControlsReport').disabled,false);
 assert.equal(f.node('wfSpeechControlsToggle').hidden,true);assert.equal(f.node('wfSpeechControlsStop').hidden,false);
 assert.equal(f.node('wfSpeechControlsStop').getAttribute('aria-label'),'إغلاق القارئ');
 f.click('wfSpeechControlsReport');assert.deepEqual(f.calls,['show-report']);
 f.reportOpen(true);f.reportOpen(false,false);assert.equal(f.node('wfSpeechControls').hidden,true);
});

test('minimizing reserves the real toolbar bounds invisibly and reveals that slot when the card arrives',()=>{
 const f=fixture({initial:active()});f.reportOpen(true);assert(f.node('wfSpeechControls').hidden);
 f.reportOpen(false,true,'minimizing');const dock=f.node('wfSpeechControls');
 assert.equal(dock.parentNode,f.home);assert.equal(dock.hidden,false);assert.equal(dock.dataset.staging,'true');
 assert(f.nav.classList.contains('wf-speech-toolbar-host'));
 f.reportOpen(false,true);assert.equal(dock.dataset.staging,'false');assert.deepEqual(f.calls,[]);
});

test('the silent minimized reader can be closed directly and returns the toolbar to its original layout',()=>{
 const f=fixture();f.navigate(1);f.reportOpen(false,true);assert(f.classes.has('wf-speech-toolbar-active'));
 f.click('wfSpeechControlsStop',false);assert.deepEqual(f.calls,[]);
 f.click('wfSpeechControlsStop');assert.deepEqual(f.calls,['close-report']);
 assert(f.node('wfSpeechControls').hidden);assert(!f.classes.has('wf-speech-toolbar-active'));assert(!f.row1.classList.contains('wf-speech-toolbar-host'));
});
