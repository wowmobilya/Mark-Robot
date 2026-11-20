'use strict';

// Run from tests/: node tests/robot-face.test.cjs
// Or pass the component path: node this-file.cjs /path/to/robot-face.js
// Isolated DOM and browser-speech substitutes exercise lifecycle logic only.
// Browser layout, voice availability and audible output require device verification.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const test = require('node:test');
const source = fs.readFileSync(process.argv[2] || path.resolve(__dirname, '../robot-face.js'), 'utf8');
let assertionCount = 0;
function check(condition, message) { assertionCount++; assert.ok(condition, message); }

function fixture({lang = 'ar', voices = [{lang: 'ar-SA', localService: true}], supported = true, recordings = false, audioPlay, snapshot, preferences = {autoExpressions:true,idleMotion:true}, offline = false, offlineReady = true, reference = true, referenceReady = true} = {}) {
  const observers = [];
  const timers = new Map();
  let timerId = 0;
  function changed(target, name) {
    for (const observer of [...observers]) {
      if (observer.targets.some(item => item.target === target &&
          (!item.options.attributeFilter || item.options.attributeFilter.includes(name)))) {
        observer.callback([{target, attributeName: name}]);
      }
    }
  }
  class Element {
    constructor(tag = 'div') {
      this.tagName = tag.toUpperCase();
      this.attributes = {}; this.dataset = {}; this.children = []; this.listeners = {}; this.map = {};
      this.isConnected = true; this.textContent = ''; this.classes = new Set(); this.style = {setProperty:(key,value)=>{this.styles ||= {}; this.styles[key]=value;}};
      this.classList = {contains: name => this.classes.has(name)};
    }
    setAttribute(name, value) { this.attributes[name] = String(value); changed(this, name); }
    getAttribute(name) { return this.attributes[name] ?? null; }
    append(child) { this.children.push(child); child.parentNode = this; }
    querySelector(selector) { return this.map[selector] || null; }
    closest() { return dashboard; }
    addEventListener(name, listener) { (this.listeners[name] ||= new Set()).add(listener); }
    removeEventListener(name, listener) { this.listeners[name]?.delete(listener); }
    dispatchEvent(event) {
      event.target ||= this;
      event.currentTarget = this;
      for (const listener of [...(this.listeners[event.type] || [])]) listener(event);
      if (event.bubbles && !event.stopped && this.parentNode) this.parentNode.dispatchEvent(event);
      return true;
    }
    click(isTrusted = true) { this.dispatchEvent(new CustomEvent('click', {bubbles: true, isTrusted})); }
    set innerHTML(value) {
      this.html = value;
      for (const selector of ['#wfRobotTitle span', '.wf-robot-status', '.wf-robot-speak', '.wf-robot-report', '.wf-robot-mouth', '.wf-robot-display']) {
        const node = new Element(selector.includes('speak') || selector.includes('report') ? 'button' : selector.includes('display') ? 'div' : 'span');
        node.parentNode = this;
        this.map[selector] = node;
        if (node.tagName === 'BUTTON') node.map.span = new Element('span');
        if (selector === '.wf-robot-display') node.setAttribute('aria-hidden','true');
      }
    }
  }
  class CustomEvent {
    constructor(type, options = {}) {
      this.type = type; this.bubbles = !!options.bubbles; this.detail = options.detail;
      this.isTrusted = options.isTrusted === true;
      this.persisted = options.persisted; this.stopped = false;
    }
    stopPropagation() { this.stopped = true; }
  }
  class MutationObserver {
    constructor(callback) { this.callback = callback; this.targets = []; observers.push(this); }
    observe(target, options) { this.targets.push({target, options}); }
    disconnect() { this.targets = []; }
  }
  const root = new Element('html'); root.lang = lang;
  const dashboard = new Element('section'); dashboard.classes.add('active');
  const settingsPage = new Element('section');
  let activePage = dashboard;
  const track = new Element('div'); track.parentNode = dashboard;
  for (let i = 0; i < 4; i++) track.append(new Element());
  const doc = new Element('document'); doc.documentElement = root; doc.hidden = false;
  doc.querySelector = selector => selector === '.wf-greeting-faces' ? track : selector === '.page.active' && activePage.classes.has('active') ? activePage : null;
  doc.getElementById = id => track.children.find(child => child.id === id) || null;
  doc.createElement = tag => new Element(tag);
  const win = new Element('window');
  class Utterance { constructor(text) { this.text = text; } }
  const synth = new Element();
  Object.assign(synth, {voices, calls: [], cancelCount: 0, speaking: false, pending: false, paused: false});
  synth.getVoices = () => synth.voices;
  synth.speak = request => { synth.calls.push(request); synth.current = request; synth.pending = true; };
  synth.cancel = () => { synth.cancelCount++; synth.speaking = false; synth.pending = false; synth.current?.onend?.(); };
  synth.start = () => { synth.pending = false; synth.speaking = true; synth.current?.onstart?.(); };
  synth.end = () => { synth.pending = false; synth.speaking = false; synth.current?.onend?.(); };
  synth.error = error => { synth.pending = false; synth.speaking = false; synth.current?.onerror?.({error}); };
  win.speechSynthesis = supported ? synth : undefined;
  win.SpeechSynthesisUtterance = supported ? Utterance : undefined;
  const audioRequests = [];
  class Audio {
    constructor(url) { this.src = url; this.pauseCount = 0; this.currentTime=0;this.paused=true;audioRequests.push(this); }
    play() { this.paused=false;this.playCount = (this.playCount || 0) + 1; return audioPlay ? audioPlay(this) : Promise.resolve(); }
    pause() { this.paused=true;this.pauseCount++; }
    removeAttribute(name) { delete this[name]; }
    load() { this.loaded = true; }
  }
  if (recordings) win.Audio = Audio;
  win.wfBusinessOverviewSnapshot = snapshot;
  win.WFRobotSettings = {getPreferences:()=>({...preferences})};
  // Lifecycle fixtures use a transparent pronunciation adapter; separate suites
  // validate real financial snapshots and the exact money wording.
  win.WFArabicReportSpeech = win.WFTurkishReportSpeech = {prepare:value=>[{text:value.narration,charIndex:0,charLength:value.narration.length}]};
  const offlineVoice = {calls:[],cancels:0,getStatus:()=>({ready:offlineReady}),speak(request){this.calls.push(request);return{cancel:()=>{this.cancels++;}};}};
  if (offline) win.WFOfflineVoice = offlineVoice;
  const referenceVoice = {calls:[],handles:[],cancels:0,pauses:0,resumes:0,unlocks:0,disposals:0,rates:[],cancelledDownloads:[],prepares:[],releases:0,
    list:()=>[{locale:'ar',locales:['ar','en','tr','fr','ru'],name:'Mark · local reference',bytes:921000000}],
    getStatus:()=>({locale:lang,ready:referenceReady,installed:referenceReady,state:referenceReady?'ready':'not-installed',engineState:'idle',engineError:'',name:'Mark · local reference',total:921000000}),
    preparePlayback(){this.unlocks++;return{dispose:()=>this.disposals++};},
    prepare(locale){this.prepares.push(locale);return Promise.resolve();},
    release(){this.releases++;},
    cancelDownload(locale){this.cancelledDownloads.push(locale);},
    speak(request){this.calls.push(request);let cancelled=false,paused=false,finished=false;
      const onEnd=request.onEnd;request.onEnd=(...args)=>{finished=true;onEnd?.(...args);};
      const handle={setRate:value=>{this.rates.push(value);return true;},cancel:()=>{if(!cancelled&&!finished){cancelled=true;this.cancels++;}},pause:()=>{if(cancelled||finished||paused)return false;paused=true;this.pauses++;request.onPause?.({reason:'user'});return true;},
        resume:()=>{if(cancelled||finished||!paused)return false;paused=false;this.resumes++;request.onResume?.();return true;}};this.handles.push(handle);return handle;}};
  if (reference) win.WFReferenceVoice = referenceVoice;
  const reportEvents = [];
  for (const type of ['wf-robot-report-open','wf-robot-report-playback','wf-robot-report-boundary','wf-robot-report-voice']) win.addEventListener(type,event=>reportEvents.push({type,...event.detail}));
  const activity = [];
  track.addEventListener('wf-robot-speaking', event => activity.push(event.detail.active));
  vm.runInNewContext(source, {
    document: doc, window: win, MutationObserver, CustomEvent, AbortController,
    setTimeout: (fn, ms) => { const id = ++timerId; timers.set(id, {fn, ms}); return id; },
    clearTimeout: id => timers.delete(id),
  });
  const face = doc.getElementById('wfGreetingRobot');
  return {
    face, track, doc, win, root, dashboard, synth, activity, observers, timers, audioRequests, reportEvents, offlineVoice, referenceVoice,
    speak: face.querySelector('.wf-robot-speak'),
    report: face.querySelector('.wf-robot-report'),
    readReport() { win.dispatchEvent(new CustomEvent('wf-robot-report-control',{detail:{action:'replay'}})); },
    display: face.querySelector('.wf-robot-display'),
    send(type,detail) { win.dispatchEvent(new CustomEvent(type,{detail})); },
    status: face.querySelector('.wf-robot-status'),
    reveal() { face.setAttribute('aria-hidden', 'false'); face.inert = false; },
    hide() { face.setAttribute('aria-hidden', 'true'); face.inert = true; },
    language(next) { root.lang = next; changed(root, 'lang'); },
    leaveDashboard() { dashboard.classes.delete('active'); changed(dashboard, 'class'); },
    visitPage(name) {
      const previous = activePage;
      activePage = name === 'settings' ? settingsPage : dashboard;
      if (previous === activePage) return;
      previous.classes.delete('active'); activePage.classes.add('active');
      changed(previous, 'class'); changed(activePage, 'class');
    },
    hideDocument() { doc.hidden = true; doc.dispatchEvent(new CustomEvent('visibilitychange')); },
    voicesChanged(next) { synth.voices = next; synth.dispatchEvent(new CustomEvent('voiceschanged')); },
    timeout(minMs=0) { for (const timer of [...timers.values()])if(timer.ms>=minMs)timer.fn(); },
    pagehide(persisted) { win.dispatchEvent(new CustomEvent('pagehide', {persisted})); },
  };
}

const flush=async()=>{for(let turn=0;turn<8;turn++)await Promise.resolve();};
const noAlternative=f=>check(!f.offlineVoice.calls.length&&!f.synth.calls.length,'No Nabra or platform voice is selected');
const state=f=>f.win.WFProgramSpeech.getState();

test('opening the written report never prepares playback or starts voice',async()=>{
  let reads=0;const f=fixture({snapshot:()=>{reads++;return{narration:'The displayed report'};}});
  f.reveal();f.report.click();await flush();
  assert.equal(reads,1);
  assert.equal(f.reportEvents.find(event=>event.type==='wf-robot-report-open')?.snapshot.narration,'The displayed report');
  assert.equal(f.referenceVoice.calls.length,0);
  assert.equal(f.referenceVoice.unlocks,0);
  assert.equal(state(f).active,false);
  f.send('wf-robot-report-control',{action:'replay'});await flush();
  assert.equal(f.referenceVoice.calls.length,1,'the explicit reader action starts the existing voice owner');
  assert.equal(reads,1,'first reading uses the exact visible snapshot without another data wait');
});

test('the decorative robot face cannot open reports or start voice',async()=>{
  let reads=0;const f=fixture({snapshot:()=>{reads++;return{narration:'Daily figures'};}});
  f.reveal();f.display.click();
  f.display.dispatchEvent({type:'keydown',key:'Enter',isTrusted:true,preventDefault(){},stopPropagation(){}});
  await flush();
  assert.equal(reads,0);assert.equal(f.referenceVoice.calls.length,0);
  assert.equal(f.display.getAttribute('role'),null);
  assert.equal(f.display.getAttribute('tabindex'),null);
  assert.equal(f.display.getAttribute('aria-hidden'),'true');
});

test('silent report preparation is adopted by explicit Read without cancelling the first phrase',async()=>{
  const f=fixture({snapshot:()=>({narration:'The exact report shown on the card.'})}),order=[];
  let prepared,adopted=false;
  f.referenceVoice.preload=options=>{prepared=options;order.push('preload');return{promise:Promise.resolve(),cancel(){if(!adopted)order.push('cancel');}};};
  const speak=f.referenceVoice.speak.bind(f.referenceVoice);
  f.referenceVoice.speak=options=>{assert.equal(options.text,prepared.text);assert.equal(options.chunks,prepared.chunks);adopted=true;order.push('speak');return speak(options);};
  f.reveal();f.report.click();await flush();
  assert.deepEqual(order,['preload']);assert.equal(f.referenceVoice.unlocks,0);assert.equal(state(f).active,false);
  f.readReport();await flush();assert.deepEqual(order,['preload','speak']);
  f.send('wf-robot-report-visibility',{open:false,minimized:true});
  assert.deepEqual(order,['preload','speak']);assert.equal(f.referenceVoice.cancels,0);
  assert.equal(f.speak.disabled,false,'the original card retains its Stop button while reading is folded');
  assert.equal(f.speak.getAttribute('aria-label'),'إيقاف');
  f.speak.click();assert.equal(f.referenceVoice.cancels,1);
});

test('folding a silent report cancels unused preparation without starting audio',async()=>{
  const f=fixture({snapshot:()=>({narration:'Written report'})});let cancelled=0;
  f.referenceVoice.preload=()=>({promise:Promise.resolve(),cancel(){cancelled++;}});
  f.reveal();f.report.click();await flush();f.send('wf-robot-report-visibility',{open:false,minimized:true});
  assert.equal(cancelled,1);assert.equal(f.referenceVoice.calls.length,0);assert.equal(f.referenceVoice.unlocks,0);
});

test('leaving during written-report loading cannot open it later or leave its button disabled',async()=>{
  let resolve;const f=fixture({snapshot:()=>new Promise(done=>{resolve=done;})});
  f.reveal();f.report.click();assert.equal(f.report.disabled,true);
  f.leaveDashboard();resolve({narration:'Late written report'});await flush();
  assert.equal(f.reportEvents.some(event=>event.type==='wf-robot-report-open'),false);
  assert.equal(f.report.disabled,false);assert.equal(f.referenceVoice.calls.length,0);
});

test('mounting and dashboard controls require a visible robot and a trusted action',async()=>{
  let reads=0;const f=fixture({snapshot:()=>{reads++;return{narration:'Daily figures'};}});
  check(f.track.children.length===5&&f.face.getAttribute('aria-hidden')==='true'&&f.face.inert,'Fifth face mounts hidden');
  check(!f.referenceVoice.calls.length&&!f.activity.some(Boolean),'Mounting never starts speech');
  f.speak.click();f.report.click();await flush();
  check(!f.referenceVoice.calls.length&&!reads,'Hidden dashboard controls cannot start speech');
  f.reveal();f.speak.click(false);f.report.click(false);await flush();
  check(!f.referenceVoice.calls.length&&!reads,'Programmatic dashboard clicks cannot start speech');
  check(!f.face.html.includes('wf-robot-expression'),'Manual expression selector stays removed');
  f.speak.click();const request=f.referenceVoice.calls[0];
  check(!!request&&request.locale==='ar','Trusted identity generation uses Mark in the current language');
  check(f.face.dataset.voiceActive==='true'&&f.face.dataset.speaking==='false','Queued speech never animates a fake start');
  check(f.activity.join(',')==='true','Queued speech acquires its activity owner');
  request.onStart();check(f.face.dataset.speaking==='true'&&f.face.dataset.expression==='happy','Actual audio starts the mouth');
  request.onEnd();check(!state(f).active&&f.activity.join(',')==='true,false','Natural end releases ownership');
  check(f.referenceVoice.cancels===0,'Natural completion does not cancel another session');noAlternative(f);
 });

for(const backend of [undefined,'local','device','reference'])test('legacy '+String(backend)+' preferences always select Syrian Mark',async()=>{
  const preferences={speechBackend:backend,arabicDialect:'eg',continuousSpeech:true,speechRate:1.1,speechVolume:.6};
  const f=fixture({offline:true,preferences,snapshot:()=>({narration:'Reference report'})});f.reveal();f.readReport();await flush();
  const request=f.referenceVoice.calls[0];check(!!request,'The reference engine owns the report');
  check(request.dialect==='sy'&&request.continuous===false,'Legacy dialect and full buffering cannot reappear');
  check(request.rate===1.1&&request.volume===.6,'Rate and volume preferences remain effective');
  noAlternative(f);request.onStart();preferences.speechBackend=backend==='local'?'device':'local';preferences.arabicDialect='eg';
  f.send('wf-robot-preferences',{});
  check(state(f).active&&f.referenceVoice.cancels===0,'An obsolete preference cannot interrupt or change the canonical voice');
  f.win.WFProgramSpeech.stop();request.onStart();request.onEnd();
  check(!state(f).active&&f.face.dataset.speaking==='false','Stale Mark callbacks cannot revive a stopped session');
});

for(const lang of ['ar','tr','en','fr','ru'])test('the '+lang+' fixed Mark recording keeps the approved language and Syrian Arabic selection',()=>{
  const f=fixture({lang,supported:false,recordings:true,preferences:{arabicDialect:'eg',speechRate:1.15,speechVolume:.4}});f.reveal();f.speak.click();
  const audio=f.audioRequests[0];
  check(audio?.src===`assets/robot-identity/${lang}.mp3?v=${lang==='ar'?3:2}`,'The approved bundled recording is selected');
  check(audio.playCount===1&&audio.playbackRate===1.15&&audio.volume===.4,'Trusted click primes the recording with saved controls');
  check(!f.referenceVoice.calls.length&&!f.synth.calls.length,'A fixed greeting does not synthesize or switch voices');
  check(f.face.dataset.speaking==='false','A play promise does not imply audible playback');
  audio.onplaying();check(f.face.dataset.speaking==='true','The real playing event starts speech animation');
  audio.onended();check(!state(f).active&&audio.pauseCount===1,'Completion frees the recording');
});

test('recording startup failures may use Mark but never another voice',async()=>{
  for(const audioPlay of [undefined,()=>Promise.reject(new Error('blocked')),()=>{throw new Error('unsupported codec');}]){
    const f=fixture({recordings:true,offline:true,audioPlay});f.reveal();f.speak.click();
    if(!audioPlay)f.audioRequests[0].onerror();await flush();
    check(f.referenceVoice.calls.length===1,'The installed Mark engine can recover a greeting startup failure');
    check(f.face.dataset.speaking==='false','Fallback generation cannot fake audio start');noAlternative(f);
    f.referenceVoice.calls[0].onStart();f.referenceVoice.calls[0].onEnd();
    check(f.activity.join(',')==='true,false','A recovered greeting retains one owner');
  }
});

test('a partially heard greeting is not repeated after an audio error',()=>{
  const f=fixture({recordings:true,offline:true});f.reveal();f.speak.click();const audio=f.audioRequests[0];
  audio.onplaying();audio.onwaiting();audio.onerror();
  check(!state(f).active&&!f.referenceVoice.calls.length,'An error after playback does not replay the greeting');noAlternative(f);
});

for(const kind of ['recording','report','program','preview'])test(kind+' playback continues across carousel, routes and background visibility',async()=>{
  const f=fixture({recordings:kind==='recording'||kind==='preview',snapshot:()=>({narration:'Persistent report'})});
  if(kind==='program')f.win.WFProgramSpeech.speak({text:'Selected text',event:{isTrusted:true}});
  else if(kind==='preview'){f.visitPage('settings');f.win.WFProgramSpeech.preview({event:{isTrusted:true}});}
  else{f.reveal();if(kind==='report')f.readReport();else f.speak.click();await flush();}
  const audio=f.audioRequests[0],request=f.referenceVoice.calls[0];
  if(audio)audio.onplaying();else request.onStart();
  for(const [name,change]of [['carousel',()=>f.hide()],['settings route',()=>f.visitPage('settings')],['background tab',()=>f.hideDocument()],['dashboard route',()=>f.visitPage('dashboard')],['history route',()=>f.send('hashchange')]]){
    change();check(state(f).active,'Existing '+kind+' retains ownership through '+name);
    check(f.referenceVoice.cancels===0&&(!audio||audio.pauseCount===0),'Visibility never stops owned '+kind+' audio');
  }
  if(audio)audio.onended();else request.onEnd();check(!state(f).active,'Natural completion still ends background speech');
});

for(const [name,stop]of [
  ['language change',f=>f.language('tr')],['real page hide',f=>f.pagehide(true)],
  ['disabled speech',(f,p)=>{p.speechEnabled=false;f.send('wf-robot-preferences',{});}],
  ['muted speech',(f,p)=>{p.speechVolume=0;f.send('wf-robot-preferences',{});}],
  ['changed volume',(f,p)=>{p.speechVolume=.4;f.send('wf-robot-preferences',{});}],
])test(name+' safely cancels the current owner and ignores its late callbacks',()=>{
  const preferences={speechVolume:1,speechRate:1};const f=fixture({preferences});
  f.win.WFProgramSpeech.speak({text:'Owned text',event:{isTrusted:true}});const request=f.referenceVoice.calls[0];request.onStart();
  stop(f,preferences);request.onStart();request.onEnd();
  check(f.referenceVoice.cancels===1&&!state(f).active&&f.face.dataset.speaking==='false','Only the current owner is cancelled');noAlternative(f);
});

test('program pause and resume retain ownership and wait for actual resumed audio',async()=>{
  const f=fixture();const api=f.win.WFProgramSpeech;
  check(!api.speak({text:'Selected text',event:{isTrusted:false}}),'Program reading requires a trusted action');
  check(api.speak({text:'Selected text',event:{isTrusted:true}}),'Explicit program reading can start with the carousel hidden');
  const request=f.referenceVoice.calls[0],before=api.getState();
  for(const field of ['active','paused','canPause','kind','phase','reason','message','locale','voiceName'])check(field in before,'Shared state exposes '+field);
  check(before.active&&!before.paused&&before.canPause&&before.kind==='program','Preparation owns a pausable program session');
  check(before.locale==='ar'&&before.voiceName==='Mark · local reference'&&typeof before.message==='string','Shared status identifies the selected voice and language');
  request.onStart();check(f.face.dataset.speaking==='true','Initial audio really starts');
  check(api.pause()!==false,'Pause reaches the current stream handle');
  check(f.referenceVoice.pauses===1&&api.getState().active&&api.getState().paused&&f.face.dataset.speaking==='false','Pause is active but silent');
  request.onStart();request.onWaiting();
  check(api.getState().paused&&f.face.dataset.speaking==='false','Late start or waiting callbacks cannot undo an intentional pause');
  check(await api.resume()===true&&f.referenceVoice.resumes===1,'Resume reaches the same handle');
  check(!api.getState().paused&&api.getState().active&&f.face.dataset.speaking==='false','Resume does not fabricate audible playback');
  request.onStart();check(f.face.dataset.speaking==='true','A real resumed start restores the mouth');
  request.onPause({reason:'browser'});
  check(api.getState().paused&&api.getState().reason==='browser'&&!!api.getState().message,'Browser interruption has an explanatory paused state');
  api.stop();request.onStart();request.onResume?.();
  check(!api.getState().active&&f.face.dataset.speaking==='false'&&f.referenceVoice.cancels===1,'Stop rejects all later pause/resume/start callbacks');
  check(api.pause()===false&&await api.resume()===false,'Idle controls do not affect another audio owner');
});

test('recording pause and resume preserve the media position and require a real playing event',async()=>{
  const f=fixture({recordings:true});const api=f.win.WFProgramSpeech;
  api.preview({event:{isTrusted:true}});const audio=f.audioRequests[0];audio.onplaying();audio.currentTime=4.25;
  check(api.pause()!==false&&state(f).paused&&state(f).active,'A fixed greeting can be intentionally paused');
  check(audio.pauseCount===1&&audio.currentTime===4.25,'Pause retains the existing recording position');
  audio.onplaying();check(state(f).paused&&f.face.dataset.speaking==='false','A stale media playing event cannot clear pause');
  check(await api.resume()===true,'Resume uses the same media element');await flush();
  check(audio.playCount===2&&audio.currentTime===4.25&&!state(f).paused&&f.face.dataset.speaking==='false','Resume does not restart or fake playback');
  audio.onplaying();check(f.face.dataset.speaking==='true','Actual resumed playback starts animation');api.stop();
});

test('generation phases and explanatory failures reach shared state without voice substitution',()=>{
  const f=fixture({offline:true});f.win.WFProgramSpeech.speak({text:'Dynamic report',event:{isTrusted:true}});const request=f.referenceVoice.calls[0];
  request.onProgress({phase:'loading',loaded:30,total:100});
  check(state(f).phase==='loading'&&!!state(f).message&&f.face.dataset.speaking==='false','Model loading is shown before audio');
  request.onProgress({phase:'initializing'});check(state(f).phase==='initializing','GPU initialization has its own phase');
  request.onError(Object.assign(new Error('worker-startup-failed'),{code:'worker-startup-failed'}));
  check(!state(f).active&&state(f).state==='failed'&&state(f).reason==='worker-startup-failed'&&!!state(f).message,'The actual failure code and readable status survive cleanup');
  request.onStart();check(f.face.dataset.speaking==='false','Failure cannot be revived by late worker callbacks');noAlternative(f);
});

test('missing Mark never falls back to available Nabra or a device voice',async()=>{
  const f=fixture({reference:false,offline:true,recordings:true,snapshot:()=>({narration:'Current report'})});f.reveal();f.readReport();await flush();
  noAlternative(f);check(f.reportEvents.some(event=>event.type==='wf-robot-report-open'&&event.snapshot.narration==='Current report'),'Unavailable speech still exposes the actual written report');
  check(f.reportEvents.some(event=>event.type==='wf-robot-report-voice'&&event.state==='unsupported'),'The missing reference adapter is explained');
  check(!f.win.WFProgramSpeech.speak({text:'No replacement',event:{isTrusted:true}}),'Program reading also requires Mark');
  f.voicesChanged([{lang:'ar',localService:true}]);f.send('wf-offline-voice-change',{locale:'ar',ready:true,state:'ready',name:'Nabra'});
  check(state(f).state==='unavailable','Unrelated installed voices cannot erase Mark unavailability');
  check(f.win.WFProgramSpeech.preview({event:{isTrusted:true}})&&f.audioRequests.length===1,'The bundled Mark recording remains available');
});

test('a pending report can be stopped or replaced without late playback',async()=>{
  for(const replacement of ['stop','program']){
    let resolve;const f=fixture({snapshot:()=>new Promise(done=>{resolve=done;})});f.reveal();f.readReport();
    check(state(f).active&&f.face.dataset.speaking==='false','Snapshot work owns a silent, cancellable report');
    if(replacement==='stop')f.send('wf-robot-report-control',{action:'stop'});else f.win.WFProgramSpeech.speak({text:'New program owner',event:{isTrusted:true}});
    resolve({narration:'Stale report'});await flush();
    check(f.referenceVoice.calls.length===(replacement==='program'?1:0),'A late snapshot cannot start a displaced report');
    if(replacement==='program')check(f.referenceVoice.calls[0].text==='New program owner','The successor retains ownership');
  }
});

test('an authorized pending report follows its owner across navigation and background tabs',async()=>{
  let resolve;const f=fixture({snapshot:()=>new Promise(done=>{resolve=done;})});f.reveal();f.readReport();
  f.hide();f.visitPage('settings');f.hideDocument();resolve({narration:'The authorized report'});await flush();
  check(f.referenceVoice.calls[0]?.text==='The authorized report'&&state(f).active,'An accepted request continues after its source UI disappears');
  f.referenceVoice.calls[0].onStart();check(state(f).active,'Background audio start is not rejected for visibility');
});

test('daily reports keep the exact snapshot, real sentence boundaries and fresh replay semantics',async()=>{
  let requested,reads=0;const narration='Actual daily business figures.';
  const f=fixture({snapshot:options=>{requested=options;reads++;return Promise.resolve({narration});}});f.reveal();f.readReport();await flush();
  check(requested.locale==='ar'&&f.referenceVoice.calls[0]?.text===narration&&reads===1,'Current localized data is read exactly once');
  const request=f.referenceVoice.calls[0];request.onStart();request.onBoundary({charIndex:0,charLength:12});request.onBoundary({charIndex:13,charLength:8});
  const boundaries=f.reportEvents.filter(event=>event.type==='wf-robot-report-boundary');
  check(boundaries.length===2&&boundaries[1].charIndex===13&&boundaries[1].charLength===8,'Only actual supplied speech boundaries reach highlighting');
  f.send('wf-robot-report-control',{action:'stop'});check(f.referenceVoice.cancels===1&&f.reportEvents.at(-1).state==='stopped','Reader Stop cancels its report');
  f.hide();f.visitPage('settings');f.send('wf-robot-report-control',{action:'replay'});await flush();
  check(reads===2&&f.referenceVoice.calls.length===2,'An authorized reader control replays fresh data from another page');
  const replay=f.referenceVoice.calls[1];replay.onStart();replay.onEnd();
  check(f.reportEvents.at(-1).state==='finished'&&!state(f).active,'Natural report completion reaches the reader');
});

test('a synchronous pause at report start rejects late highlight boundaries until resume',async()=>{
  const f=fixture({snapshot:()=>({narration:'First sentence. Second sentence.'})});
  f.reveal();f.readReport();await flush();
  const request=f.referenceVoice.calls[0],api=f.win.WFProgramSpeech;
  let pausedAtStart=false;
  f.win.addEventListener('wf-program-speech-state',event=>{
    if(!pausedAtStart&&event.detail.state==='speaking'){
      pausedAtStart=true;api.pause();
    }
  });
  request.onStart();request.onBoundary({charIndex:0,charLength:15});
  check(pausedAtStart&&api.getState().paused,'A consumer may pause synchronously when real playback starts');
  check(f.reportEvents.filter(event=>event.type==='wf-robot-report-playback').at(-1)?.state==='paused','A start callback cannot overwrite the paused reader with a stale speaking state');
  check(!f.reportEvents.some(event=>event.type==='wf-robot-report-boundary'),'A boundary delivered after that pause cannot advance the report highlight');
  await api.resume();request.onStart();request.onBoundary({charIndex:16,charLength:16});
  const boundaries=f.reportEvents.filter(event=>event.type==='wf-robot-report-boundary');
  check(boundaries.length===1&&boundaries[0].charIndex===16,'Actual resumed audio can advance the current report');
});

test('empty or unrecognized reports cannot invent financial speech',async()=>{
  const empty=fixture({snapshot:()=>({narration:'',unavailableReason:'partial data'})});empty.reveal();empty.readReport();await flush();
  check(!empty.referenceVoice.calls.length&&!state(empty).active,'An incomplete snapshot cannot speak invented totals');
  check(empty.reportEvents.find(event=>event.type==='wf-robot-report-open')?.snapshot.unavailableReason==='partial data','The written reader retains the source qualification');
  for(const adapter of [{prepare(){throw new Error('unsupported-report');}},{prepare:()=>[]}]){
    const f=fixture({offline:true,snapshot:()=>({narration:'Invalid source'})});f.win.WFArabicReportSpeech=adapter;f.reveal();f.readReport();await flush();
    check(!f.referenceVoice.calls.length&&f.reportEvents.some(event=>event.type==='wf-robot-report-voice'&&event.reason==='report-text-unsupported'),'Unrecognized narration is rejected before generation');noAlternative(f);
  }
});

for(const [lang,adapterName,spoken]of [['ar','WFArabicReportSpeech','صفر دولار أمريكي. مليون دولار أمريكي.'],['tr','WFTurkishReportSpeech','sıfır dolar. bir milyon dolar.']])test(lang+' financial normalization preserves displayed offsets and exact source text',async()=>{
  const narration='0.00 USD; 1,000,000.00 USD',snapshot={narration};
  const chunks=[{text:spoken,charIndex:0,charLength:narration.length}];
  const f=fixture({lang,snapshot:()=>snapshot});f.win[adapterName]={prepare:value=>{check(value===snapshot,'Normalization receives the displayed snapshot object');return chunks;}};
  f.reveal();f.readReport();await flush();const request=f.referenceVoice.calls[0];
  check(request.text===narration&&request.chunks===chunks,'Mark receives prepared wording and original displayed offsets together');
  request.onStart();request.onBoundary({charIndex:0,charLength:narration.length});
  const boundary=f.reportEvents.filter(event=>event.type==='wf-robot-report-boundary').at(-1);
  check(boundary.charIndex===0&&boundary.charLength===narration.length,'Spoken amounts highlight their actual source range');
});

test('explicit Mark installation preserves the primed lease and survives navigation',async()=>{
  const order=[],leases=[];let ready=false,downloads=0,resolveDownload,downloadOptions;
  const snapshot={narration:'المبيعات اثنا عشر دولاراً.'},chunks=[{text:'الْمَبِيعَاتُ اثْنَا عَشَرَ دُولَارًا',charIndex:0,charLength:snapshot.narration.length}];
  const f=fixture({referenceReady:false,offline:true,snapshot:()=>{order.push('read');return snapshot;}});
  f.referenceVoice.getStatus=()=>({ready,state:ready?'ready':'not-installed',total:921000000,name:'Mark · local reference'});
  f.referenceVoice.preparePlayback=()=>{order.push('prime');const lease={disposed:false,dispose(){this.disposed=true;}};leases.push(lease);return lease;};
  f.referenceVoice.download=(_locale,options)=>{downloads++;downloadOptions=options;return new Promise(resolve=>{resolveDownload=()=>{ready=true;resolve();};});};
  f.win.WFArabicReportSpeech={prepare:()=>chunks};f.reveal();f.readReport();await flush();
  check(order.join(',')==='prime,read'&&leases[0].disposed,'The click primes audio before asynchronous record reads');
  check(!downloads&&f.reportEvents.some(event=>event.type==='wf-robot-report-voice'&&event.state==='missing'&&event.total===921000000),'Opening a report does not silently download its large pack');
  f.hide();f.visitPage('settings');f.send('wf-robot-report-control',{action:'install'});await flush();
  check(downloads===1&&!downloadOptions.signal.aborted&&f.face.dataset.speaking==='false','Explicit reader installation remains available on another page');
  downloadOptions.onProgress({progress:.5,loaded:100,total:200});
  check(f.reportEvents.at(-1).state==='downloading'&&f.reportEvents.at(-1).progress===.5,'Exact download progress reaches the report reader');
  f.hideDocument();resolveDownload();await flush();const request=f.referenceVoice.calls[0];
  check(request?.text===snapshot.narration&&request.chunks===chunks&&request.playback===leases[1],'The verified install resumes its exact report and original primed lease');
  check(f.face.dataset.speaking==='false','Installation completion is not a fabricated speech start');noAlternative(f);
});

for(const [name,stop]of [['cancel',f=>f.send('wf-robot-report-control',{action:'cancel-download'})],['language change',f=>f.language('tr')],['page teardown',f=>f.pagehide(true)]])test('Mark download cancellation on '+name+' cannot start late audio',async()=>{
  let resolveDownload,signal,ready=false;const f=fixture({referenceReady:false,snapshot:()=>({narration:'Downloaded report'})});
  f.referenceVoice.getStatus=()=>({ready,state:ready?'ready':'not-installed',total:921000000});
  f.referenceVoice.download=(_locale,options)=>{signal=options.signal;return new Promise(resolve=>{resolveDownload=()=>{ready=true;resolve();};});};
  f.reveal();f.send('wf-robot-report-control',{action:'install'});await flush();stop(f);resolveDownload();await flush();
  check(signal.aborted&&!f.referenceVoice.calls.length&&!state(f).active,'Cancelled install cannot resume a stale report');
  if(name==='cancel')check(f.referenceVoice.cancelledDownloads[0]==='ar','Cancellation targets the selected Mark manager');
});

test('saved expression and camera gaze preferences remain independent of persistent audio',()=>{
  const f=fixture({preferences:{autoExpressions:false,idleMotion:false}});f.reveal();f.speak.click();f.referenceVoice.calls[0].onStart();
  check(f.face.dataset.expression==='calm'&&f.face.dataset.idleMotion==='false','Saved expression controls remain effective');
  f.send('wf-robot-motion',{active:true,x:2,y:-2});
  check(f.face.dataset.tracking==='true'&&f.face.styles['--wf-robot-look-x']==='22px'&&f.face.styles['--wf-robot-look-y']==='-12px','Camera gaze is bounded');
  f.hide();check(f.face.dataset.tracking==='false'&&f.face.styles['--wf-robot-look-x']==='0px','A hidden face releases camera gaze');
  check(state(f).active,'Visual cleanup does not stop audio');
});

for(const preferences of [{speechEnabled:false},{speechVolume:0}])test((preferences.speechEnabled===false?'disabled':'muted')+' settings prevent all new speech',async()=>{
  const f=fixture({recordings:true,offline:true,preferences,snapshot:()=>({narration:'Muted report'})});f.reveal();f.speak.click();f.readReport();await flush();
  check(!f.audioRequests.length&&!f.referenceVoice.calls.length,'Disabled speech cannot generate an inaudible report or greeting');noAlternative(f);
  check(!f.win.WFProgramSpeech.speak({text:'Read me',event:{isTrusted:true}}),'Shared program speech obeys the same setting');
  check(state(f).state===(preferences.speechEnabled===false?'disabled':'muted'),'Shared state explains why speech is unavailable');
});

test('recovered Settings sessions do not leak stale ownership into a later dashboard action',async()=>{
  for(const origin of ['preview','program'])for(const ending of ['completed','cancelled'])for(const next of ['report','identity']){
    let reads=0;const f=fixture({recordings:true,snapshot:()=>{reads++;return{narration:'Fresh figures'};}});f.visitPage('settings');
    check(origin==='preview'?f.win.WFProgramSpeech.preview({event:{isTrusted:true}}):f.win.WFProgramSpeech.speak({text:'Settings text',event:{isTrusted:true}}),'Settings starts its explicit speech session');
    const oldAudio=f.audioRequests[0],oldRequest=f.referenceVoice.calls[0];if(origin==='preview')oldAudio.onplaying();else oldRequest.onStart();
    if(ending==='cancelled')f.win.WFProgramSpeech.stop();else if(origin==='preview')oldAudio.onended();else oldRequest.onEnd();
    check(!state(f).active,'The earlier Settings session has ended');
    const recordings=f.audioRequests.length,calls=f.referenceVoice.calls.length;f.visitPage('dashboard');f.reveal();if(next==='report')f.readReport();else f.speak.click();await flush();
    if(next==='report')check(reads===1&&f.referenceVoice.calls.length===calls+1&&f.audioRequests.length===recordings,'Fresh reports recover their own dynamic session');
    else check(f.audioRequests.length===recordings+1&&f.referenceVoice.calls.length===calls,'Identity recovers its own fixed recording session');
    check(f.face.dataset.voiceKind===(next==='report'?'report':'intro'),'The new session kind does not inherit Settings ownership');
    f.hide();check(state(f).active,'The recovered owner also persists when its dashboard face disappears');
  }
});

test('warming an installed Mark engine never releases it merely because the page is hidden',async()=>{
  const f=fixture();await flush();check(f.referenceVoice.prepares.length===1,'The installed Mark engine prepares once before reading');
  check(!f.referenceVoice.calls.length&&!f.activity.some(Boolean),'Preparation does not pretend to speak');
  f.hideDocument();f.visitPage('settings');f.send('wf-reference-voice-change',{locale:'ar',ready:true});await flush();
  check(f.referenceVoice.releases===0,'Tab and route visibility do not release persistent speech resources');
  check(f.referenceVoice.prepares.length===1,'Repeated readiness events do not restart preparation');
});

test('missing, disabled and muted Mark packs never start initialization implicitly',async()=>{
  for(const options of [{referenceReady:false},{preferences:{speechEnabled:false}},{preferences:{speechVolume:0}}]){
    const f=fixture(options);await flush();check(!f.referenceVoice.prepares.length,'Unavailable or unused speech does not initialize the GPU');
  }
});

test('idle program controls cannot pause, resume or cancel another audio owner',async()=>{
  const f=fixture();f.synth.speaking=true;
  check(f.win.WFProgramSpeech.pause()===false&&await f.win.WFProgramSpeech.resume()===false,'Inactive controls have no speech handle');
  f.win.WFProgramSpeech.stop();
  check(f.synth.cancelCount===0&&f.referenceVoice.cancels===0,'Stop never cancels unrelated audio');
  check(!f.win.WFProgramSpeech.speak({text:'New speech',event:{isTrusted:true}}),'A separate active speech owner is not interrupted');
  noAlternative(f);
});

test('real page teardown removes listeners and stale callbacks cannot revive audio',()=>{
  const f=fixture();f.win.WFProgramSpeech.speak({text:'Owned text',event:{isTrusted:true}});const request=f.referenceVoice.calls[0];request.onStart();
  f.pagehide(true);check(f.referenceVoice.cancels===1&&!state(f).active,'BFCache teardown releases its actual audio session');
  f.pagehide(false);check(!f.win.WFProgramSpeech&&f.observers.every(observer=>observer.targets.length===0),'Final teardown removes the controller and observers');
  check(f.synth.listeners.voiceschanged.size===0,'Final teardown removes platform availability listeners too');
  request.onStart();request.onEnd();check(f.face.dataset.speaking==='false','Post-disposal callbacks cannot restart the mouth');
});
test('pressing the smart card report button reopens a minimized report without restarting or stopping its voice',async()=>{
  let snapshots=0,opened=0,minimized=false;
  const f=fixture({snapshot:()=>{snapshots++;return{narration:'Daily figures'};}});
  f.win.WFRobotReport={isMinimized:()=>minimized,show(){opened++;minimized=false;return true;}};
  f.reveal();f.readReport();await flush();
  const request=f.referenceVoice.calls[0];assert.ok(request);request.onStart();
  minimized=true;f.send('wf-robot-report-visibility',{open:false,minimized:true});
  assert.equal(f.report.getAttribute('aria-label'),'فتح التقرير');
  f.report.click();await flush();
  assert.equal(opened,1);assert.equal(snapshots,1);assert.equal(f.referenceVoice.calls.length,1);assert.equal(f.referenceVoice.cancels,0);assert.equal(state(f).state,'speaking');
});

test('changing speed preserves the active report, paused position and original voice owner',async()=>{
  const preferences={speechRate:1};const f=fixture({preferences,snapshot:()=>({narration:'One continuous report'})});
  f.reveal();f.readReport();await flush();const request=f.referenceVoice.calls[0];request.onStart();
  assert.equal(f.win.WFProgramSpeech.setRate(1.2),true);assert.equal(state(f).rate,1.2);
  assert.equal(f.referenceVoice.rates.at(-1),1.2);assert.equal(f.referenceVoice.calls.length,1);assert.equal(f.referenceVoice.cancels,0);
  f.win.WFProgramSpeech.pause();preferences.speechRate=.8;f.send('wf-robot-preferences',{});
  assert.equal(state(f).paused,true);assert.equal(state(f).rate,.8);assert.equal(f.referenceVoice.rates.at(-1),.8);assert.equal(f.referenceVoice.cancels,0);
  assert.equal(f.win.WFProgramSpeech.setRate(NaN),false);assert.equal(state(f).rate,.8);
});
test('generated preview uses the draft rate while recorded playback changes speed without losing its position',()=>{
  const generated=fixture();generated.win.WFProgramSpeech.speak({text:'Preview',event:{isTrusted:true},kind:'preview',rate:.85});
  assert.equal(state(generated).kind,'preview');assert.equal(generated.referenceVoice.calls[0].rate,.85);
  const f=fixture({recordings:true});f.win.WFProgramSpeech.preview({event:{isTrusted:true},rate:1.1});const recording=f.audioRequests[0];recording.onplaying();recording.currentTime=3.2;
  assert.equal(f.win.WFProgramSpeech.setRate(.9),true);assert.equal(recording.playbackRate,.9);assert.equal(recording.preservesPitch,true);assert.equal(recording.currentTime,3.2);assert.equal(recording.pauseCount,0);
});
