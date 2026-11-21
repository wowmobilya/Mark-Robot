const test = require('node:test');
const assert = require('node:assert/strict');
const {readFileSync} = require('node:fs');
const vm = require('node:vm');
const {defaults, normalize, mergeSettings, packActionDisabled, voiceStatusKey, voicePhaseKey, voicePackEntries, createPreferenceStore, movement, createMotionTracker} = require('../robot-settings.js');

test('voice failures use the actual adapter reason without guessing a cause', () => {
  assert.equal(voiceStatusKey({state: 'error', reason: 'integrity-failed'}), 'voiceIntegrity');
  assert.equal(voiceStatusKey({state: 'error', reason: 'download-failed'}), 'voiceDownloadFailed');
  assert.equal(voiceStatusKey({state: 'error', reason: 'storage-full'}), 'voiceStorageFull');
  assert.equal(voiceStatusKey({state: 'unsupported', reason: 'storage-unavailable'}), 'voiceStorageUnavailable');
  assert.equal(voiceStatusKey({state: 'unsupported', reason: 'browser-unsupported'}), 'voiceUnsupported');
  assert.equal(voiceStatusKey({state: 'unsupported', reason: 'webgpu-unavailable'}), 'voiceWebGPU');
  assert.equal(voiceStatusKey({state: 'not-installed', reason: 'cancelled'}), 'voiceCancelled');
  assert.equal(voiceStatusKey({state: 'error', reason: 'unknown-error'}), 'voiceError');
  assert.equal(voiceStatusKey({state: 'ready', reason: ''}), 'voiceReady');
});

test('actual storage failure stage takes priority over the previous verification phase', () => {
  assert.equal(voicePhaseKey({stage:'store',phase:'verify'}), 'voicePhaseStore');
  assert.equal(voicePhaseKey({stage:'marker',phase:'verify'}), 'voicePhaseStore');
  assert.equal(voicePhaseKey({stage:'check-storage',phase:'download'}), 'voicePhaseStorage');
  assert.equal(voicePhaseKey({stage:'fetch',phase:'verify'}), 'voicePhaseDownload');
  assert.equal(voicePhaseKey({stage:'final-check',phase:'download'}), 'voicePhaseVerify');
  assert.equal(voicePhaseKey({phase:'verify'}), 'voicePhaseVerify');
  assert.equal(voicePhaseKey({}), '');
});

test('one pack download disables other actions while leaving its own Cancel available', () => {
  assert.equal(packActionDisabled({state: 'not-installed'}, true, false), true);
  assert.equal(packActionDisabled({state: 'ready'}, true, false), true);
  assert.equal(packActionDisabled({state: 'downloading'}, true, true), false);
  assert.equal(packActionDisabled({state: 'downloading'}, true, false), true);
  assert.equal(packActionDisabled({state: 'not-installed'}, false, false), false);
  assert.equal(packActionDisabled({state: 'ready'}, false, false), false);
  assert.equal(packActionDisabled({state: 'checking'}, false, false), true);
  assert.equal(packActionDisabled({state: 'unsupported'}, false, false), true);
});

test('normalizes preferences without restoring camera activation', () => {
  assert.deepEqual(normalize(), {autoExpressions: true, idleMotion: true, trackingSensitivity: 'normal', speechEnabled:true, speechRate:1, speechVolume:1, arabicDialect:'sy', speechBackend:'reference', continuousSpeech:false});
  assert.deepEqual(normalize({autoExpressions: false, idleMotion: false, trackingSensitivity: 'high', cameraEnabled: true}),
    {...defaults, autoExpressions: false, idleMotion: false, trackingSensitivity: 'high'});
  assert.equal(normalize({trackingSensitivity: 'invalid'}).trackingSensitivity, 'normal');
});

test('speech controls preserve mute and rate while enforcing Mark with Syrian Arabic', () => {
  const chosen=normalize({speechEnabled:false,speechRate:1.2,speechVolume:0,arabicDialect:'eg',speechBackend:'device',continuousSpeech:false});
  assert.equal(chosen.speechEnabled,false); assert.equal(chosen.speechRate,1.2); assert.equal(chosen.speechVolume,0);
  assert.equal(chosen.arabicDialect,'sy'); assert.equal(chosen.speechBackend,'reference'); assert.equal(chosen.continuousSpeech,false);
  assert.equal(normalize({speechRate:8}).speechRate,1.25); assert.equal(normalize({speechRate:-2}).speechRate,.75);
  assert.equal(normalize({speechVolume:9}).speechVolume,1); assert.equal(normalize({speechVolume:-1}).speechVolume,0);
  for(const value of [NaN,Infinity,'1.1',null]) assert.equal(normalize({speechRate:value}).speechRate,1);
  assert.equal(normalize({arabicDialect:'xx',speechBackend:'remote'}).arabicDialect,'sy');
  assert.equal(normalize({speechBackend:'remote'}).speechBackend,'reference');
});

test('legacy voice choices migrate without losing rate, volume or unrelated saved preferences', () => {
  for (const backend of ['reference', 'local', 'device']) {
    const migrated=mergeSettings({companyName:'Saved company',robot:{speechBackend:backend,arabicDialect:'eg',continuousSpeech:true,
      speechRate:1.2,speechVolume:.4,autoExpressions:false,futureOption:'keep'}}, {}, {});
    assert.equal(migrated.robot.speechBackend,'reference');assert.equal(migrated.robot.arabicDialect,'sy');assert.equal(migrated.robot.continuousSpeech,false);
    assert.equal(migrated.robot.speechRate,1.2);assert.equal(migrated.robot.speechVolume,.4);assert.equal(migrated.robot.autoExpressions,false);
    assert.equal(migrated.robot.futureOption,'keep');assert.equal(migrated.companyName,'Saved company');
  }
});

test('one shared reference card retains its own manager and real status across languages', () => {
  const local = {list:()=>[{locale:'ar',name:'Nabra',bytes:10},{locale:'tr',name:'Piper',bytes:20}],getStatus:locale=>({locale,state:'ready',ready:true})};
  const reference = {list:()=>['ar','tr','en','fr','ru'].map(locale=>({locale,name:'Mark · local reference',bytes:921000000})),
    getStatus:locale=>({locale,name:'Mark · local reference',state:'downloading',ready:false,total:921000000,loaded:100000000})};
  const entries = voicePackEntries(local, reference, 'tr');
  assert.equal(entries.filter(entry=>entry.backend==='reference').length, 1);
  const shared = entries.find(entry=>entry.backend==='reference');
  assert.equal(shared.key,'reference'); assert.equal(shared.locale,'tr'); assert.equal(shared.api,reference);
  assert.equal(shared.status.total,921000000); assert.equal(shared.status.state,'downloading');
  assert.equal(entries.length,1,'other installed voice packs do not become settings choices');
  const missing = voicePackEntries(local, null, 'ar').find(entry=>entry.backend==='reference');
  assert.equal(missing.status.state,'unsupported'); assert.equal(missing.status.reason,'reference-unavailable');
});

function settingsUIFixture({localReady = false, referenceReady = false, engineReady = false, preferences = {}, scheduledFrames = false, connect = async () => { throw Error('No database fixture'); }} = {}) {
  const nodes = [], trace = [], listeners = new Map(), frames = new Map();let frameId=0,referenceReads=0;
  class Element {
    constructor(tag) { this.tagName=tag.toUpperCase();this.children=[];this.events={};this.attributes={};this.dataset={};this.style={setProperty(){}};this.textContent='';this.classes=new Set();this.classList={contains:name=>this.classes.has(name),add:name=>this.classes.add(name),remove:name=>this.classes.delete(name),toggle:(name,enabled)=>enabled?this.classes.add(name):this.classes.delete(name)};nodes.push(this); }
    append(...values) { for(const value of values){this.children.push(value);value.parentNode=this;} }
    replaceChildren(...values) { this.children=[];this.append(...values); }
    setAttribute(name,value) { this.attributes[name]=String(value); }
    getAttribute(name) { return this.attributes[name]??null; }
    removeAttribute(name) { delete this.attributes[name]; }
    addEventListener(name,listener) { this.events[name]=listener; }
    removeEventListener(name) { delete this.events[name]; }
    querySelector(selector) { return this.map?.[selector]||null; }
    get firstChild() { return this.children[0]||null; }
  }
  const root=new Element('html');root.lang='ar';
  const page=new Element('section');page.id='page-settings';page.classes.add('active');
  const workspace=new Element('div'),tabs=new Element('div'),content=new Element('div');workspace.map={'.tabs':tabs,'.wf-settings-content':content};
  const document={documentElement:root,hidden:false,querySelector:selector=>selector==='#page-settings .wf-settings-workspace'?workspace:null,
    getElementById:id=>nodes.find(node=>node.id===id)||null,createElement:tag=>new Element(tag),addEventListener(){},removeEventListener(){}};
  const state={settings:{robot:{speechBackend:'reference',arabicDialect:'sy',...preferences}}};
  const refStatus={state:referenceReady?'ready':'not-installed',ready:referenceReady,engineReady,total:922000000};let releaseDownload,finishPrepare,speechActive=false,audioActive=false;
  class CustomEvent {constructor(type,options={}){this.type=type;this.detail=options.detail;}}
  const window={isSecureContext:true,switchTab(){},applyTr(){},addEventListener(name,listener){const list=listeners.get(name)||[];list.push(listener);listeners.set(name,list);},removeEventListener(){},dispatchEvent(event){for(const listener of listeners.get(event.type)||[])listener(event);},
    WFOfflineVoice:{list:()=>['ar','en','tr','fr','ru'].map(locale=>({locale,name:'Light '+locale,bytes:30})),getStatus:locale=>({locale,state:localReady?'ready':'not-installed',ready:localReady}),
      async remove(locale){trace.push({kind:'remove-local',locale,ownerActive:speechActive});audioActive=false;}},
    WFReferenceVoice:{list:()=>['ar','en','tr','fr','ru'].map(locale=>({locale,name:'Mark · local reference',bytes:922000000})),getStatus:locale=>{referenceReads++;return {...refStatus,locale,name:'Mark · local reference'};},
      download(locale,options){trace.push({kind:'download',locale,options});refStatus.state='downloading';options.onProgress?.();return new Promise(resolve=>{releaseDownload=()=>{refStatus.state='not-installed';resolve();};});},
      prepare(locale){trace.push({kind:'prepare',locale});return new Promise((resolve,reject)=>{finishPrepare=problem=>{if(problem)reject(problem);else{refStatus.engineReady=true;resolve({...refStatus});}};});},
      async remove(){trace.push({kind:'remove-reference'});},cancelDownload(){}},
    WFProgramSpeech:{speak(options){trace.push({kind:'speak',options});speechActive=audioActive=true;window.dispatchEvent(new CustomEvent('wf-program-speech-state',{detail:{state:'ready',active:false}}));window.dispatchEvent(new CustomEvent('wf-program-speech-state',{detail:{state:'preparing',active:true,voiceName:'Mark · local reference'}}));return true;},preview(options){trace.push({kind:'recording',options});return true;},
      stop(){trace.push({kind:'stop'});speechActive=audioActive=false;window.dispatchEvent(new CustomEvent('wf-program-speech-state',{detail:{state:'stopped',active:false}}));}}};
  if(scheduledFrames){window.requestAnimationFrame=callback=>{frames.set(++frameId,callback);return frameId;};window.cancelAnimationFrame=id=>frames.delete(id);}
  vm.runInNewContext(readFileSync(require.resolve('../robot-settings.js'),'utf8'),{window,document,S:state,initDB:connect,navigator:{mediaDevices:{}},MutationObserver:class{observe(){}disconnect(){}},CustomEvent,AbortController,Intl,setTimeout,clearTimeout});
  return {nodes,trace,root,page,state,window,speechState:()=>({active:speechActive,audioActive}),
    reading:nodes.find(node=>node.dataset.wfReadingPreview==='true'),
    status:nodes.find(node=>node.className==='wf-robot-reading-preview-status'),
    backend:nodes.find(node=>node.name==='speechBackend'),
    reference:nodes.find(node=>node.dataset.backend==='reference'),
    emitSpeech:detail=>window.dispatchEvent(new CustomEvent('wf-program-speech-state',{detail})),
    engineStatus:nodes.find(node=>node.className==='wf-robot-engine-status'),
    updateReference(value){Object.assign(refStatus,value);window.dispatchEvent(new CustomEvent('wf-reference-voice-loading',{detail:{phase:'ready'}}));},
    get pendingFrames(){return frames.size;},get referenceReads(){return referenceReads;},
    flushFrames(){for(const [id,callback]of [...frames]){frames.delete(id);callback();}},
    releaseDownload:()=>releaseDownload(),finishPrepare:problem=>finishPrepare(problem)};
}

test('settings renders only Mark and Syrian Arabic with a generated preview and an explicit save gate', () => {
  const f=settingsUIFixture({referenceReady:true,preferences:{speechBackend:'device',arabicDialect:'eg',continuousSpeech:true,speechRate:1.2,speechVolume:.4}});
  assert.equal(f.nodes.filter(node=>node.dataset.backend==='reference').length,1);
  assert.equal(f.nodes.filter(node=>node.className==='wf-robot-voice-row').length,1);
  assert.equal(f.backend,undefined);
  assert.equal(f.nodes.some(node=>['arabicDialect','continuousSpeech'].includes(node.name)),false);
  assert.equal(f.nodes.find(node=>node.name==='speechRate').value,1.2);
  assert.equal(f.nodes.find(node=>node.name==='speechVolume').value,.4);
  assert.equal(f.trace.length,0);
  f.reading.events.click({isTrusted:false});assert.equal(f.trace.length,0);
  const event={isTrusted:true};f.reading.events.click(event);
  assert.equal(f.trace.length,1);assert.equal(f.trace[0].kind,'speak');assert.equal(f.trace[0].options.event,event);
  assert.equal(f.trace[0].options.locale,'ar');assert.match(f.trace[0].options.text,/مرحبا أستاذي.*قهوتي/);assert.equal(f.trace[0].options.kind,'preview');
  assert(f.status.textContent.includes('مارك روبوت · صوت محلي'));
  f.emitSpeech({state:'ready',active:false});assert.equal(f.status.textContent,'انتهت عينة القراءة.');
  f.root.lang='tr';f.window.applyTr();assert.equal(f.status.textContent,'Okuma örneği tamamlandı.');
  const rate=f.nodes.find(node=>node.name==='speechRate');rate.value=1.1;rate.events.input();f.reading.events.click({isTrusted:true});
  assert.equal(f.trace.length,2);assert.equal(f.trace[1].options.rate,1.1);
  f.emitSpeech({state:'ready',active:false});
  const volume=f.nodes.find(node=>node.name==='speechVolume');volume.value=.5;volume.events.input();
  f.reading.events.click({isTrusted:true});assert.equal(f.trace.length,2);assert(f.status.textContent.includes('kaydedin'));
});

test('generated preview controls pause and resume the same owner, change its speed and stop it',()=>{
  const f=settingsUIFixture({referenceReady:true}), api=f.window.WFProgramSpeech, calls=[];
  let current={active:false,rate:1};api.getState=()=>current;
  api.pause=()=>calls.push('pause');api.resume=()=>calls.push('resume');api.stop=()=>calls.push('stop');
  api.setRate=rate=>{calls.push(rate);current.rate=rate;return true;};
  const click=button=>button.events.click({isTrusted:true});
  const emit=value=>{current=value;f.emitSpeech(current);};
  const stop=f.nodes.find(node=>node.dataset.action==='stop');
  click(f.reading);
  emit({active:true,kind:'preview',state:'preparing',canPause:false,rate:1});
  assert(f.reading.disabled);assert.equal(stop.disabled,false);
  emit({active:true,kind:'preview',state:'speaking',canPause:true,rate:1});
  assert.equal(f.reading.dataset.action,'pause');click(f.reading);
  emit({...current,paused:true,state:'paused'});assert.equal(f.reading.dataset.action,'resume');click(f.reading);
  const rate=f.nodes.find(node=>node.name==='speechRate');rate.value=1.15;rate.events.input();click(stop);
  assert.deepEqual(calls,['pause','resume',1.15,'stop']);assert.equal(f.trace.length,1);
  emit({active:false,state:'stopped',rate:1.15});assert.equal(f.reading.dataset.action,'play');assert(stop.disabled);
  emit({active:true,kind:'report',state:'speaking',rate:1,canPause:true});click(f.reading);click(stop);
  assert.deepEqual(calls,['pause','resume',1.15,'stop']);assert.equal(f.trace.length,1);
});

test('restoring the saved preview rate preserves all other drafts and the current audio session',()=>{
  const f=settingsUIFixture({referenceReady:true,preferences:{speechRate:.85,speechVolume:.7}});
  const rate=f.nodes.find(n=>n.name==='speechRate'),volume=f.nodes.find(n=>n.name==='speechVolume');
  const reset=f.nodes.find(n=>n.className==='wf-robot-restore-rate'),feedback=f.nodes.find(n=>n.className==='wf-robot-settings-feedback');
  const owner=f.window.WFProgramSpeech,actual={kind:'preview',active:true,rate:.85},applied=[];
  owner.getState=()=>actual;owner.setRate=value=>{actual.rate=value;applied.push(value);return true;};
  assert(reset.disabled);assert(f.nodes.some(n=>n.textContent.includes('معاينة مؤقتة')));
  rate.value=1.2;rate.events.input();assert.equal(reset.disabled,false);
  reset.events.click({isTrusted:true});assert.equal(Number(rate.value),.85);assert.equal(actual.rate,.85);
  assert.equal(feedback.textContent,'');assert(reset.disabled);
  volume.value=.6;volume.events.input();rate.value=1.1;rate.events.input();
  reset.events.click({isTrusted:true});assert.equal(Number(volume.value),.6);assert(feedback.textContent);
  assert.deepEqual(applied,[1.2,.85,1.1,.85]);assert.deepEqual(f.trace,[]);
});

test('robot bottom-menu Cancel restores every saved control and the active preview rate without persisting',()=>{
  const f=settingsUIFixture({preferences:{speechRate:.85,speechVolume:.7,idleMotion:true}}),api=f.window.WFRobotSettings;
  assert.equal(typeof api.getSettingsActions,'function');assert.equal(api.getSettingsActions(),null);
  f.window.switchTab('robot');const initial=api.getSettingsActions();
  assert.equal(initial.key,'robot');assert.equal(initial.scope.id,'stab-robot');assert.equal(initial.dirty,false);assert.equal(initial.busy,false);
  assert.equal(initial.save,f.nodes.find(n=>n.className==='wf-robot-settings-save-button'));
  const owner=f.window.WFProgramSpeech,current={active:true,kind:'preview',rate:.85};
  owner.getState=()=>current;owner.setRate=value=>{current.rate=value;f.emitSpeech(current);return true;};
  const rate=f.nodes.find(n=>n.name==='speechRate'),volume=f.nodes.find(n=>n.name==='speechVolume');
  const idle=f.nodes.find(n=>n.name==='idleMotion'),sensitivity=f.nodes.find(n=>n.name==='trackingSensitivity');
  rate.value=1.2;rate.events.input();volume.value=.2;volume.events.input();idle.checked=false;idle.events.change();sensitivity.value='high';sensitivity.events.change();
  assert.equal(api.getSettingsActions().dirty,true);assert.equal(current.rate,1.2);
  assert.equal(api.getSettingsActions().cancel(),true);
  assert.equal(Number(rate.value),.85);assert.equal(Number(volume.value),.7);assert.equal(idle.checked,true);assert.equal(sensitivity.value,'normal');
  assert.equal(current.rate,.85);assert.equal(current.active,true);assert.equal(api.getSettingsActions().dirty,false);
  assert.equal(f.nodes.find(n=>n.className==='wf-robot-settings-feedback').textContent,'');
  assert.equal(f.state.settings.robot.speechRate,.85);assert.equal(f.state.settings.robot.speechVolume,.7);
  f.window.switchTab('company');assert.equal(api.getSettingsActions(),null);
});

test('robot action state prevents rollback during a pending save and preserves the draft after failure',async()=>{
  let rejectConnection;const connection=new Promise((resolve,reject)=>{rejectConnection=reject;});
  const f=settingsUIFixture({preferences:{speechVolume:.7},connect:()=>connection}),api=f.window.WFRobotSettings;
  assert.equal(typeof api.getSettingsActions,'function');f.window.switchTab('robot');
  const volume=f.nodes.find(n=>n.name==='speechVolume');volume.value=.3;volume.events.input();
  let actionEvents=0;f.window.addEventListener('wf-settings-actions-change',()=>{actionEvents++;});
  const form=f.nodes.find(n=>n.className==='wf-robot-settings-form'),saving=form.events.submit({preventDefault(){}});
  assert.equal(api.getSettingsActions().busy,true);assert.equal(api.getSettingsActions().cancel(),false);
  assert.equal(Number(volume.value),.3);rejectConnection(Error('storage unavailable'));await saving;
  assert.equal(api.getSettingsActions().busy,false);assert.equal(api.getSettingsActions().dirty,true);assert.equal(api.getSettingsActions().save.disabled,false);
  assert.equal(f.state.settings.robot.speechVolume,.7);assert(actionEvents>0);
  assert.equal(api.getSettingsActions().cancel(),true);assert.equal(Number(volume.value),.7);assert.equal(api.getSettingsActions().dirty,false);
});

test('the shared reference download uses the current UI language and its own cancellable request', async () => {
  const f=settingsUIFixture();f.root.lang='tr';f.window.applyTr();
  const action=f.reference.children.find(node=>node.className==='wf-robot-voice-action');
  const pending=action.events.click({isTrusted:true});
  assert.equal(f.trace.length,1);assert.equal(f.trace[0].kind,'download');assert.equal(f.trace[0].locale,'tr');
  assert.equal(action.disabled,false);assert.equal(action.textContent,'İndirmeyi iptal et');
  await action.events.click({isTrusted:true});assert.equal(f.trace[0].options.signal.aborted,true);
  f.releaseDownload();await pending;
  assert.equal(f.trace.filter(item=>item.kind==='speak').length,0);
});

test('reading preview distinguishes pause and preserves the speech owner preparation and error messages', () => {
  const f=settingsUIFixture({referenceReady:true});f.reading.events.click({isTrusted:true});
  f.emitSpeech({active:true,state:'preparing',message:'جارٍ تحميل ملفات Mark من الجهاز…'});
  assert.equal(f.status.textContent,'جارٍ تحميل ملفات Mark من الجهاز…');
  f.emitSpeech({active:true,state:'paused'});
  assert.equal(f.status.textContent,'عينة القراءة متوقفة مؤقتًا.');
  f.emitSpeech({active:false,state:'failed',message:'تعذّر تشغيل Mark. حاول التجهيز مجددًا.'});
  assert.equal(f.status.textContent,'تعذّر تشغيل Mark. حاول التجهيز مجددًا.');
});

test('a failed preview translates on locale changes while keeping runtime details within the same locale', () => {
  const f=settingsUIFixture({referenceReady:true});f.reading.events.click({isTrusted:true});
  const detail='تعذّر تشغيل Mark. حاول التجهيز مجددًا.';
  f.emitSpeech({active:false,state:'failed',locale:'ar',message:detail});
  f.window.applyTr();assert.equal(f.status.textContent,detail,'refreshing the same locale retains the actual failure detail');
  const calls=f.trace.length,playback=f.speechState();
  const failures={
    en:'The sample could not start. Stop any current reading and try again.',
    tr:'Örnek başlatılamadı. Devam eden okumayı durdurup yeniden deneyin.',
    fr:'Impossible de lancer l’extrait. Arrêtez la lecture en cours et réessayez.',
    ru:'Не удалось запустить пример. Остановите текущее чтение и повторите.',
    ar:'تعذّر بدء العينة. أوقف أي قراءة جارية ثم حاول مجددًا.'
  };
  for(const [locale,message] of Object.entries(failures)){
    f.root.lang=locale;f.window.applyTr();assert.equal(f.status.textContent,message);
  }
  assert.equal(f.trace.length,calls,'translating a status never starts, stops or prepares speech');
  assert.deepEqual(f.speechState(),playback);
});

test('active preview translation drops stale provider messages without changing playback or its controls', () => {
  const f=settingsUIFixture({referenceReady:true});f.reading.events.click({isTrusted:true});
  const detail='جارٍ تحميل ملفات Mark من الجهاز…';
  f.emitSpeech({active:true,kind:'preview',state:'preparing',locale:'ar',message:detail,canPause:false});
  f.window.applyTr();assert.equal(f.status.textContent,detail);
  const calls=f.trace.length,playback=f.speechState();
  f.root.lang='en';f.window.applyTr();assert.equal(f.status.textContent,'Preparing the Mark sample…');
  f.emitSpeech({active:true,kind:'preview',state:'preparing',locale:'ar',message:detail,canPause:false});
  assert.equal(f.status.textContent,'Preparing the Mark sample…','a late message from the original locale must stay translated');
  assert.equal(f.reading.dataset.action,'pause');assert.equal(f.reading.disabled,true);
  f.emitSpeech({active:true,kind:'preview',state:'preparing',locale:'en',message:'Loading the local Mark files…',canPause:false});
  f.window.applyTr();assert.equal(f.status.textContent,'Loading the local Mark files…');
  assert.equal(f.trace.length,calls);assert.deepEqual(f.speechState(),playback);
});

test('installed Mark prepares in place with visible progress and never deletes an installed package', async () => {
  const f=settingsUIFixture({localReady:true,referenceReady:true});
  const action=f.reference.children.find(node=>node.className==='wf-robot-voice-action');
  const packStatus=f.reference.children.find(node=>node.className==='wf-robot-voice-status');
  assert(packStatus.textContent.includes('مثبّت'));assert.equal(f.engineStatus.dataset.state,'cold');assert.equal(f.trace.length,0);
  const pending=action.events.click({isTrusted:true});
  assert.deepEqual(f.trace.map(item=>item.kind),['prepare']);assert.equal(f.engineStatus.dataset.state,'preparing');assert.equal(action.disabled,true);
  f.finishPrepare();await pending;
  assert.equal(f.engineStatus.dataset.state,'ready');assert.equal(action.hidden,true);
  assert.equal(f.trace.some(item=>item.kind.startsWith('remove')||item.kind==='download'),false);
  f.updateReference({engineReady:false});assert.equal(f.engineStatus.dataset.state,'cold');assert.equal(action.hidden,false);
});

test('background preparation and user preparation share one disabled settings action',async()=>{
  const f=settingsUIFixture({referenceReady:true});
  const action=f.reference.children.find(node=>node.className==='wf-robot-voice-action');
  for(const engineState of ['loading','initializing']){
    f.updateReference({engineState});
    assert.equal(action.disabled,true);assert.equal(action.textContent,'جارٍ تجهيز مارك…');
    await action.events.click({isTrusted:true});assert.equal(f.trace.length,0);
  }
  f.updateReference({engineState:'error',engineError:'gpu-operation-failed'});
  assert.equal(action.disabled,false);assert.match(f.engineStatus.textContent,/معالج الرسومات/);
});

test('shared voice progress is coalesced into one current settings render and stops after disposal',()=>{
  const f=settingsUIFixture({referenceReady:true,scheduledFrames:true}),before=f.referenceReads;
  for(let index=0;index<25;index++)f.updateReference({engineReady:index===24});
  assert.equal(f.pendingFrames,1);assert.equal(f.referenceReads,before);
  f.flushFrames();assert.equal(f.referenceReads,before+1);assert.equal(f.engineStatus.dataset.state,'ready');
  f.updateReference({engineReady:false});assert.equal(f.pendingFrames,1);
  f.window.dispatchEvent({type:'pagehide',persisted:false});assert.equal(f.pendingFrames,0);
  const disposedReads=f.referenceReads;f.updateReference({engineReady:true});f.flushFrames();
  assert.equal(f.referenceReads,disposedReads);
});
test('a preparation failure preserves the installed package and exposes a retry', async () => {
  const f=settingsUIFixture({referenceReady:true}),action=f.reference.children.find(node=>node.className==='wf-robot-voice-action');
  const pending=action.events.click({isTrusted:true});assert.deepEqual(f.trace.map(item=>item.kind),['prepare']);
  f.finishPrepare(Object.assign(new Error('engine-failed'),{code:'engine-failed'}));await pending;
  assert.equal(f.engineStatus.dataset.state,'error');assert(f.engineStatus.textContent.includes('تعذّر'));assert.equal(action.disabled,false);
  const retry=action.events.click({isTrusted:true});f.finishPrepare();await retry;
  assert.deepEqual(f.trace.map(item=>item.kind),['prepare','prepare']);assert.equal(f.engineStatus.dataset.state,'ready');
});

test('missing Mark gives download guidance without playing a substitute or downloading automatically', () => {
  const f=settingsUIFixture({localReady:true});f.reading.events.click({isTrusted:true});
  assert.equal(f.trace.length,0);assert(f.status.textContent.includes('نزّل'));assert.equal(f.engineStatus.hidden,true);
});

test('all UI languages retain one Mark card and distinguish it from the saved recording', () => {
  const f=settingsUIFixture({referenceReady:true,engineReady:true});
  for(const locale of ['ar','en','tr','fr','ru']){
    f.root.lang=locale;f.window.applyTr();
    assert.equal(f.nodes.filter(node=>node.className==='wf-robot-voice-row').length,1);
    const name=locale==='ar'?'مارك':locale==='ru'?'Марк':'Mark';
    assert(f.reference.children[0].textContent.includes(name));
    const recording=f.nodes.find(node=>node.events.click&&node!==f.reading&&node.textContent.includes(name)&&node.parentNode?.className==='wf-robot-speech-actions');
    assert(recording,'the saved recording has a separate labeled action');assert.notEqual(recording.textContent,f.reading.textContent);
    assert(f.engineStatus.textContent&&!f.engineStatus.textContent.startsWith('voiceEngine'));
    assert.equal(f.nodes.some(node=>/Nabra|Piper|WebGPU|Egyptian|Égyptien|مصري/.test(node.textContent)),false);
  }
});

test('settings merge preserves the latest unrelated values and unknown robot preferences', () => {
  const stored = {bankName: 'Latest bank', branding: {mode: 'logo'}, robot: {futureOption: 7, idleMotion: false}};
  const memory = {bankName: 'Stale bank', productCategories: {version: 1}, robot: {anotherOption: 'kept'}};
  const before = JSON.stringify([stored, memory]);
  const result = mergeSettings(stored, memory, {autoExpressions: false, trackingSensitivity: 'low'});
  assert.equal(result.bankName, 'Latest bank'); assert.deepEqual(result.branding, {mode: 'logo'});
  assert.deepEqual(result.productCategories, {version: 1}); assert.equal(result.robot.futureOption, 7);
  assert.equal(result.robot.anotherOption, 'kept'); assert.equal(result.robot.autoExpressions, false);
  assert.equal(result.robot.trackingSensitivity, 'low'); assert.equal(result.id, 'main');
  assert.equal(JSON.stringify([stored, memory]), before);
});

function preferencesFixture({fail = false, gate} = {}) {
  const state = {settings: {companyName: 'WOW', robot: {idleMotion: true}}, products: [{id: 'p'}]};
  let stored = {id: 'main', companyName: 'WOW', bankName: 'New bank', robot: {futureOption: 'keep'}};
  const trace = [];
  const connection = {transaction(storeName, mode) {
    trace.push([storeName, mode]);
    const transaction = {error: null, abort() { transaction.onabort?.(); }, objectStore(name) {
      assert.equal(name, 'settings');
      return {
        get(id) {
          assert.equal(id, 'main'); const request = {};
          queueMicrotask(() => { request.result = structuredClone(stored); request.onsuccess(); }); return request;
        },
        put(value) {
          (async () => {
            await gate;
            if (fail) { transaction.error = new Error('QuotaExceededError'); transaction.onabort(); return; }
            stored = structuredClone(value); transaction.oncomplete();
          })();
        },
      };
    }};
    return transaction;
  }};
  const store = createPreferenceStore({getState: () => state, connect: async () => connection});
  return {store, state, trace, get stored() { return stored; }};
}

test('saving is atomic, publishes only after commit and guards simultaneous saves', async () => {
  let release;
  const gate = new Promise(resolve => release = resolve);
  const f = preferencesFixture({gate}); const pending = f.store.save({autoExpressions: false, idleMotion: false});
  await Promise.resolve(); await Promise.resolve();
  assert.equal(f.state.settings.robot.idleMotion, true); assert.equal(f.store.busy, true);
  await assert.rejects(f.store.save({}), /busy/);
  release(); await pending;
  assert.deepEqual(f.trace, [['settings', 'readwrite']]); assert.equal(f.stored.bankName, 'New bank');
  assert.equal(f.stored.robot.futureOption, 'keep'); assert.equal(f.state.settings.robot.autoExpressions, false);
  assert.equal(f.store.busy, false); assert.deepEqual(f.state.products, [{id: 'p'}]);
});

test('failed storage does not publish a draft or alter previous settings', async () => {
  const f = preferencesFixture({fail: true}); const before = structuredClone(f.state);
  await assert.rejects(f.store.save({idleMotion: false}), /QuotaExceededError/);
  assert.deepEqual(f.state, before); assert.equal(f.store.busy, false);
});

function pixels(width = 64, height = 48, value = 0) {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < width * height; i++) { data[i * 4] = data[i * 4 + 1] = data[i * 4 + 2] = value; data[i * 4 + 3] = 255; }
  return data;
}
function square(data, x0, y0, size = 6, value = 180) {
  for (let y = y0; y < y0 + size; y++) for (let x = x0; x < x0 + size; x++) {
    const offset = (y * 64 + x) * 4; data[offset] = data[offset + 1] = data[offset + 2] = value;
  }
  return data;
}

test('movement tracking uses actual changed pixels and mirrors camera coordinates', () => {
  const first = movement(null, pixels(), 64, 48); assert.equal(first.detected, false);
  const moved = movement(first.gray, square(pixels(), 4, 4), 64, 48);
  assert.equal(moved.detected, true); assert(moved.x > .6); assert(moved.y < -.5);
  assert.equal(movement(moved.gray, square(pixels(), 4, 4), 64, 48).detected, false);
});

test('sensor noise and global lighting changes do not fabricate movement', () => {
  const previous = movement(null, pixels(), 64, 48).gray;
  assert.equal(movement(previous, pixels(64, 48, 5), 64, 48).detected, false);
  assert.equal(movement(previous, pixels(64, 48, 255), 64, 48).detected, false);
  const slight = square(pixels(), 4, 4, 6, 16);
  assert.equal(movement(previous, slight, 64, 48, 'low').detected, false);
  assert.equal(movement(previous, slight, 64, 48, 'high').detected, true);
});

function trackerFixture({permission, secure = true, supported = true, playError, frameError} = {}) {
  const updates = [], timers = new Map(), calls = [], frames = [pixels(), square(pixels(), 4, 4)];
  let timerId = 0, visible = true, time = 0, frameReads = 0;
  const listeners = new Map();
  const track = {stops: 0, stop() { this.stops++; }, addEventListener(type, listener) { listeners.set(type, listener); },
    removeEventListener(type, listener) { if (listeners.get(type) === listener) listeners.delete(type); }};
  const stream = {getTracks: () => [track], getVideoTracks: () => [track]};
  const video = {srcObject: null, readyState: 2, pauses: 0, play: async () => { if (playError) throw playError; }, pause() { this.pauses++; }};
  const context = {drawImage() {}, getImageData() { frameReads++; if (frameError) throw new Error('frame failed'); return {data: frames.shift() || pixels()}; }};
  const canvas = {getContext: () => context};
  const mediaDevices = supported ? {getUserMedia: options => { calls.push(options); return permission ? permission(stream) : Promise.resolve(stream); }} : {};
  const tracker = createMotionTracker({mediaDevices, video, canvas, secure, isVisible: () => visible,
    onUpdate: value => updates.push(value), getSensitivity: () => 'normal', now: () => time,
    schedule: (callback, delay) => { const id = ++timerId; timers.set(id, {callback, delay}); return id; }, cancel: id => timers.delete(id),
  });
  return {tracker, updates, timers, calls, track, stream, video, canvas,
    hide() { visible = false; tracker.checkVisibility(); }, show() { visible = true; tracker.checkVisibility(); },
    endTrack() { listeners.get('ended')?.(); },
    frame() { const [id, timer] = timers.entries().next().value; timers.delete(id); time += timer.delay; timer.callback(); },
    get frameReads() { return frameReads; },
  };
}

test('initialization and non-user calls never request camera permission', async () => {
  const f = trackerFixture(); assert.equal(f.calls.length, 0);
  assert.equal(await f.tracker.start(), false); assert.equal(f.calls.length, 0);
  f.show(); assert.equal(f.calls.length, 0);
});

test('explicit camera activation requests no microphone and processes small frames at eight fps', async () => {
  const f = trackerFixture(); assert.equal(await f.tracker.start({userInitiated: true}), true);
  assert.equal(f.calls[0].audio, false); assert.equal(f.calls[0].video.facingMode.ideal, 'user');
  assert.equal(f.canvas.width, 64); assert.equal(f.canvas.height, 48); assert.equal(f.timers.size, 1);
  assert.equal([...f.timers.values()][0].delay, 125);
  f.frame(); f.frame();
  assert.equal(f.frameReads, 2); assert(f.updates.at(-1).x > 0); assert(f.updates.at(-1).y < 0);
  f.tracker.stop(); assert.equal(f.track.stops, 1); assert.equal(f.video.srcObject, null); assert.equal(f.timers.size, 0);
  assert.deepEqual(f.updates.at(-1), {active: false, state: 'off', x: 0, y: 0});
});

test('hiding either app/robot surfaces stops tracks and returning does not restart', async () => {
  const f = trackerFixture(); await f.tracker.start({userInitiated: true}); f.hide();
  assert.equal(f.track.stops, 1); assert.equal(f.tracker.state, 'hidden'); assert.equal(f.timers.size, 0);
  f.show(); assert.equal(f.calls.length, 1); assert.equal(f.tracker.active, false);
});

test('late camera permission after cancellation immediately closes the returned stream', async () => {
  let grant;
  const f = trackerFixture({permission: stream => new Promise(resolve => grant = () => resolve(stream))});
  const pending = f.tracker.start({userInitiated: true}); assert.equal(f.tracker.state, 'requesting');
  f.tracker.stop(); grant(); assert.equal(await pending, false);
  assert.equal(f.track.stops, 1); assert.equal(f.video.srcObject, null); assert.equal(f.timers.size, 0);
});

test('hiding during permission prompt prevents capture after permission resolves', async () => {
  let grant;
  const f = trackerFixture({permission: stream => new Promise(resolve => grant = () => resolve(stream))});
  const pending = f.tracker.start({userInitiated: true}); f.hide(); grant(); await pending;
  assert.equal(f.track.stops, 1); assert.equal(f.tracker.state, 'hidden');
});

test('denied, missing, busy and unsupported camera states are distinct without leaked tracks', async () => {
  for (const [name, state] of [['NotAllowedError', 'denied'], ['NotFoundError', 'missing'], ['NotReadableError', 'busy']]) {
    const f = trackerFixture({permission: () => Promise.reject(Object.assign(new Error(name), {name}))});
    await f.tracker.start({userInitiated: true}); assert.equal(f.tracker.state, state); assert.equal(f.tracker.active, false);
  }
  for (const options of [{secure: false}, {supported: false}]) {
    const f = trackerFixture(options); await f.tracker.start({userInitiated: true});
    assert.equal(f.tracker.state, 'unsupported'); assert.equal(f.calls.length, 0);
  }
});

test('playback/frame failures and revoked tracks release camera resources', async () => {
  const failedPlay = trackerFixture({playError: new Error('play failed')});
  await failedPlay.tracker.start({userInitiated: true}); assert.equal(failedPlay.track.stops, 1); assert.equal(failedPlay.tracker.state, 'failed');
  const failedFrame = trackerFixture({frameError: true}); await failedFrame.tracker.start({userInitiated: true}); failedFrame.frame();
  assert.equal(failedFrame.track.stops, 1); assert.equal(failedFrame.timers.size, 0);
  const ended = trackerFixture(); await ended.tracker.start({userInitiated: true}); ended.endTrack();
  assert.equal(ended.track.stops, 1); assert.equal(ended.tracker.state, 'ended'); assert.equal(ended.timers.size, 0);
});

test('destroy stops capture and permanently prevents reactivation', async () => {
  const f = trackerFixture(); await f.tracker.start({userInitiated: true}); f.tracker.destroy();
  assert.equal(await f.tracker.start({userInitiated: true}), false); assert.equal(f.calls.length, 1); assert.equal(f.track.stops, 1);
});
