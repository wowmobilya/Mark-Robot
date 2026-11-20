'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const file=path.resolve(__dirname,'../speech-controls.js');

function fixture({initial={active:false},apiPresent=true,methods,report=true}={}){
 const events=new Map(),calls=[];let current=initial;
 class Element{
  constructor(tag){this.tagName=tag.toUpperCase();this.children=[];this.attributes={};this.dataset={};this.events=new Map();this.hidden=false;this.disabled=false;this.textContent='';this.innerHTML='';}
  append(...children){for(const child of children){this.children.push(child);child.parentNode=this;}}
  setAttribute(name,value){this.attributes[name]=String(value);}
  getAttribute(name){return this.attributes[name]??null;}
  addEventListener(type,handler){this.events.set(type,handler);}
 }
 const body=new Element('body'),html=new Element('html'),classes=new Set();html.lang='ar';
 html.classList={contains:name=>classes.has(name),add:name=>classes.add(name),remove:name=>classes.delete(name)};
 const find=(node,id)=>node.id===id?node:node.children.map(child=>find(child,id)).find(Boolean);
 const document={body,documentElement:html,createElement:tag=>new Element(tag),getElementById:id=>find(body,id)||null};
 const api={getState:()=>current,...(methods||{pause(){calls.push('pause');},resume(){calls.push('resume');return Promise.resolve();},stop(){calls.push('stop');}}),
  speak(){calls.push('unexpected-speak');},preview(){calls.push('unexpected-preview');}};
 const window={document,...(apiPresent?{WFProgramSpeech:api}:{}),...(report?{WFRobotReport:{show(){calls.push('show-report');return true;}}}:{}),
  addEventListener(type,handler){if(!events.has(type))events.set(type,new Set());events.get(type).add(handler);}};
 const emit=(type,detail)=>{for(const handler of events.get(type)||[])handler({detail});};
 assert(fs.existsSync(file),'Persistent speech controls must be implemented');
 const context={window};const source=fs.readFileSync(file,'utf8');vm.runInNewContext(source,context);
 return {window,document,body,classes,calls,api,node:id=>find(body,id),
  update(value){current=value;emit('wf-program-speech-state',value);},ready(){emit('wf-robot-ready');},
  reportOpen(open){open?classes.add('wf-robot-report-open'):classes.delete('wf-robot-report-open');emit('wf-robot-report-visibility',{open});},
  click(id,trusted=true){find(body,id)?.events.get('click')?.({isTrusted:trusted,preventDefault(){},stopPropagation(){}});},
  reload(){vm.runInNewContext(source,context);}};
}
const active=(extra={})=>({active:true,paused:false,canPause:true,kind:'report',phase:'streaming',state:'speaking',message:'مارك يقرأ التقرير',locale:'ar',voiceName:'Mark · local reference',...extra});

test('the dock follows the active owner across sections and never starts speech on load or refresh',()=>{
 const f=fixture();assert.equal(f.node('wfSpeechControls').hidden,true);f.ready();assert.deepEqual(f.calls,[]);
 f.update(active());const dock=f.node('wfSpeechControls');assert.equal(dock.hidden,false);assert.equal(dock.parentNode,f.body);
 assert.equal(f.node('wfSpeechControlsStatus').textContent,'مارك يقرأ التقرير');assert.equal(dock.getAttribute('dir'),'rtl');
 assert.equal(f.node('wfSpeechControlsToggle').disabled,false);assert.equal(f.node('wfSpeechControlsReport').hidden,false);
 f.classes.add('wf-section-mode');f.ready();assert.equal(dock.hidden,false);assert.deepEqual(f.calls,[]);
 f.update({active:false,state:'finished'});assert.equal(dock.hidden,true);assert.deepEqual(f.calls,[]);
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
 assert.equal(f.node('wfSpeechControlsVoice').textContent,'Mark · Syrian');assert.equal(f.node('wfSpeechControls').getAttribute('dir'),'ltr');
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
 assert.equal(f.body.children.filter(node=>node.id==='wfSpeechControls').length,1);f.click('wfSpeechControlsToggle');assert.deepEqual(f.calls,['pause']);
});
