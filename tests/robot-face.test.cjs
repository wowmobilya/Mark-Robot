'use strict';

// Run from tests/: node tests/robot-face.test.cjs
// Or pass the component path: node this-file.cjs /path/to/robot-face.js
// Isolated DOM and browser-speech substitutes exercise lifecycle logic only.
// Browser layout, voice availability and audible output require device verification.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const source = fs.readFileSync(process.argv[2] || path.resolve(__dirname, '../robot-face.js'), 'utf8');
let assertionCount = 0;
function check(condition, message) { assertionCount++; assert.ok(condition, message); }

function fixture({lang = 'ar', voices = [{lang: 'ar-SA', localService: true}], supported = true, recordings = false, audioPlay, snapshot, preferences = {autoExpressions:true,idleMotion:true}, offline = false, offlineReady = true} = {}) {
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
      for (const selector of ['#wfRobotTitle span', '.wf-robot-status', '.wf-robot-speak', '.wf-robot-report', '.wf-robot-mouth']) {
        const node = new Element(selector.includes('speak') || selector.includes('report') ? 'button' : 'span');
        node.parentNode = this;
        this.map[selector] = node;
        if (node.tagName === 'BUTTON') node.map.span = new Element('span');
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
  const track = new Element('div'); track.parentNode = dashboard;
  for (let i = 0; i < 4; i++) track.append(new Element());
  const doc = new Element('document'); doc.documentElement = root; doc.hidden = false;
  doc.querySelector = selector => selector === '.wf-greeting-faces' ? track : null;
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
    constructor(url) { this.src = url; this.pauseCount = 0; audioRequests.push(this); }
    play() { this.playCount = (this.playCount || 0) + 1; return audioPlay ? audioPlay(this) : Promise.resolve(); }
    pause() { this.pauseCount++; }
    removeAttribute(name) { delete this[name]; }
    load() { this.loaded = true; }
  }
  if (recordings) win.Audio = Audio;
  win.wfBusinessOverviewSnapshot = snapshot;
  win.WFRobotSettings = {getPreferences:()=>preferences};
  const offlineVoice = {calls:[],cancels:0,getStatus:()=>({ready:offlineReady}),speak(request){this.calls.push(request);return{cancel:()=>{this.cancels++;}};}};
  if (offline) win.WFOfflineVoice = offlineVoice;
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
    face, track, doc, win, root, dashboard, synth, activity, observers, timers, audioRequests, reportEvents, offlineVoice,
    speak: face.querySelector('.wf-robot-speak'),
    report: face.querySelector('.wf-robot-report'),
    send(type,detail) { win.dispatchEvent(new CustomEvent(type,{detail})); },
    status: face.querySelector('.wf-robot-status'),
    reveal() { face.setAttribute('aria-hidden', 'false'); face.inert = false; },
    hide() { face.setAttribute('aria-hidden', 'true'); face.inert = true; },
    language(next) { root.lang = next; changed(root, 'lang'); },
    leaveDashboard() { dashboard.classes.delete('active'); changed(dashboard, 'class'); },
    hideDocument() { doc.hidden = true; doc.dispatchEvent(new CustomEvent('visibilitychange')); },
    voicesChanged(next) { synth.voices = next; synth.dispatchEvent(new CustomEvent('voiceschanged')); },
    timeout() { for (const timer of [...timers.values()]) timer.fn(); },
    pagehide(persisted) { win.dispatchEvent(new CustomEvent('pagehide', {persisted})); },
  };
}

{
  const f = fixture();
  check(f.track.children.length === 5 && f.face.getAttribute('aria-hidden') === 'true' && f.face.inert, 'Fifth face mounts synchronously and initially hidden');
  check(f.synth.calls.length === 0, 'Mount does not auto-speak');
  f.speak.click();
  check(f.synth.calls.length === 0, 'Hidden face cannot start speech');
  f.reveal();
  check(!f.face.html.includes('wf-robot-expression'), 'Manual expression control is removed');
  check(f.speak.getAttribute('aria-label') === 'هوية الروبوت', 'Identity control uses the requested full Arabic label');
  f.speak.click();
  check(f.synth.calls.length === 1 && f.synth.calls[0].lang === 'ar-SA', 'User action selects a matching Arabic voice');
  check(f.face.dataset.voiceActive === 'true' && f.face.dataset.speaking === 'false', 'Queued voice has no fake mouth animation');
  check(f.activity.join(',') === 'true', 'Queued voice emits bubbling carousel-pause event');
  f.synth.start();
  check(f.face.dataset.speaking === 'true' && f.face.dataset.expression === 'happy', 'Audio start drives eyes and mouth');
  f.synth.end();
  check(f.face.dataset.speaking === 'false' && f.face.dataset.expression === 'calm' && f.activity.join(',') === 'true,false', 'Audio end restores expression and releases carousel');
  check(f.synth.cancelCount === 0, 'Natural completion does not cancel other speech');
  f.speak.click(); const stale = f.synth.current; f.synth.start(); f.speak.click();
  check(f.synth.cancelCount === 1 && f.face.dataset.voiceActive === 'false', 'Stop button cancels owned speech');
  stale.onstart(); stale.onend();
  check(f.face.dataset.speaking === 'false' && f.activity.join(',') === 'true,false,true,false', 'Stale callbacks cannot revive canceled speech');
}
for (const [name, stop] of [
  ['hidden face', f => f.hide()], ['dashboard exit', f => f.leaveDashboard()],
  ['hidden document', f => f.hideDocument()], ['language change', f => f.language('tr')],
]) {
  const f = fixture(); f.reveal(); f.speak.click(); f.synth.start(); stop(f);
  check(f.synth.cancelCount === 1 && f.face.dataset.speaking === 'false' && f.activity.join(',') === 'true,false', 'Stops on ' + name);
}
{
  const f = fixture({voices: [{lang: 'en-US', localService: true}]}); f.reveal(); f.speak.click();
  check(f.synth.calls.length === 0 && f.status.textContent.includes('عربي'), 'Rejects wrong-language voice with localized status');
  f.voicesChanged([{lang: 'ar-EG', localService: false}]); f.speak.click();
  check(f.synth.calls.length === 0 && f.status.textContent.includes('دون اتصال'), 'Rejects network-backed platform voices for offline operation');
  f.voicesChanged([{lang: 'ar-EG', localService: true}]); f.speak.click();
  f.synth.error('audio-busy');
  check(f.face.dataset.speaking === 'false' && f.status.textContent.includes('تعذّر'), 'Audio error displays localized failure');
}
{
  const f = fixture({voices: [{lang: 'ar-EG', localService: false, default: true}, {lang: 'ar-SA', localService: true}]});
  f.reveal(); f.speak.click();
  check(f.synth.calls[0]?.voice.localService === true, 'Prefers matching installed voice');
  f.timeout();
  check(f.synth.cancelCount === 1 && f.face.dataset.voiceActive === 'false' && f.status.textContent.includes('تعذّر'), 'Blocked start times out and releases carousel');
}
for (const [lang, prefix] of [['ar', 'ar'], ['tr', 'tr'], ['en-US', 'en'], ['fr', 'fr'], ['ru', 'ru']]) {
  const f = fixture({lang, voices: [{lang: prefix, localService: true}]}); f.reveal(); f.speak.click();
  check(f.synth.calls[0]?.lang === prefix && f.synth.calls[0]?.text.length > 60, 'Localized speech selection: ' + lang);
}
{
  const f = fixture({supported: false}); f.reveal(); f.speak.click();
  check(f.speak.disabled && f.synth.calls.length === 0 && f.face.dataset.expression === 'calm', 'Unsupported browsers retain the idle face and disable speech');
}
{
  const f = fixture(); f.reveal(); f.synth.speaking = true; f.speak.click();
  check(f.synth.calls.length === 0 && f.synth.cancelCount === 0 && f.status.textContent.includes('مشغول'), 'Does not interrupt another feature’s speech');
}
{
  const f = fixture(); f.reveal(); f.speak.click(); f.pagehide(true);
  check(f.synth.cancelCount === 1 && f.synth.listeners.voiceschanged.size === 1, 'BFCache hide stops audio and preserves listeners');
  f.pagehide(false);
  check(f.synth.listeners.voiceschanged.size === 0 && f.observers.every(observer => observer.targets.length === 0), 'Final disposal removes voice listeners and observers');
}


(async () => {
  const flush = async () => { await Promise.resolve(); await Promise.resolve(); };
  {
    const f = fixture({recordings:true, offline:true}); f.reveal();
    check(f.audioRequests.length === 0 && f.offlineVoice.calls.length === 0, 'Bundled identity never auto-starts during mount');
    f.speak.click(false);
    check(f.audioRequests.length === 0, 'Programmatic identity clicks cannot start audio');
    f.speak.click();
    check(f.audioRequests[0]?.src === 'assets/robot-identity/ar.mp3?v=2' && f.audioRequests[0].playCount === 1, 'Trusted click synchronously plays the versioned bundled identity');
    check(f.offlineVoice.calls.length === 0 && f.synth.calls.length === 0, 'Identity prefers the small recording over both pack generation and native speech');
    f.audioRequests[0].onplaying();
    check(f.reportEvents.length === 0 && f.face.dataset.speechBeat !== 'true', 'Recorded identity does not fabricate report or word timing events');
    f.speak.click();
    check(f.audioRequests[0].pauseCount === 1 && f.face.dataset.voiceActive === 'false' && f.timers.size === 0, 'Identity Stop releases recorded audio and every animation timer');
  }
  for (const lang of ['ar','tr','en','fr','ru']) {
    const f = fixture({lang, supported:false, recordings:true}); f.reveal(); f.speak.click();
    check(f.audioRequests[0]?.src === `assets/robot-identity/${lang}.mp3?v=${lang === 'ar' ? 2 : 1}`, 'Exact bundled recording selected for '+lang);
    check(!f.speak.disabled && f.face.dataset.voiceActive === 'true', 'Bundled '+lang+' identity remains available without platform voices');
  }
  {
    const f = fixture({voices: [{lang:'ar', localService:false}], recordings:true}); f.reveal(); f.speak.click();
    check(f.synth.calls.length === 0 && f.audioRequests.length === 1, 'No local voice uses bundled recording, never network speech');
    check(f.face.dataset.voiceActive === 'true' && f.face.dataset.speaking === 'false', 'Recording waits for actual playback before mouth movement');
    const audio = f.audioRequests[0]; audio.onplaying();
    check(f.face.dataset.speaking === 'true', 'Recording playing event starts mouth');
    audio.onwaiting();
    check(f.face.dataset.speaking === 'false', 'Recording buffering stops mouth');
    audio.onplaying(); audio.onended();
    check(f.face.dataset.voiceActive === 'false' && f.synth.cancelCount === 0 && audio.pauseCount === 1, 'Recording completion releases resources without canceling global speech');
  }
  for (const [name, stop] of [
    ['hidden face', f=>f.hide()], ['dashboard exit', f=>f.leaveDashboard()],
    ['hidden tab', f=>f.hideDocument()], ['language switch', f=>f.language('en')],
    ['page hide', f=>f.pagehide(true)], ['repeated identity click', f=>f.speak.click()],
  ]) {
    const f = fixture({recordings:true}); f.reveal(); f.speak.click();
    const audio = f.audioRequests[0]; const staleStart = audio.onplaying; const staleError = audio.onerror;
    audio.onplaying(); stop(f); staleStart(); staleError();
    check(audio.pauseCount === 1 && !audio.src && f.face.dataset.voiceActive === 'false' && f.face.dataset.speaking === 'false' && f.synth.calls.length === 0,
      'Recording cancels safely on '+name+' and ignores stale callbacks');
  }
  {
    const f = fixture({recordings:true, offline:true}); f.reveal(); f.speak.click();
    const audio = f.audioRequests[0]; const staleStart = audio.onplaying; audio.onerror(); staleStart();
    check(audio.pauseCount === 1 && f.offlineVoice.calls.length === 1 && f.synth.calls.length === 0 && f.activity.join(',') === 'true', 'Recording failure before start falls back to the installed pack without releasing the carousel');
    check(f.face.dataset.speaking === 'false', 'Stale recorded playing callback cannot fake playback during pack fallback');
    f.offlineVoice.calls[0].onStart(); f.offlineVoice.calls[0].onEnd();
    check(f.activity.join(',') === 'true,false', 'Pack fallback has one continuous owned speech session');
  }
  {
    const f = fixture({recordings:true, audioPlay:()=>Promise.reject(new Error('blocked'))}); f.reveal(); f.speak.click(); await flush();
    check(f.synth.calls.length === 1 && f.audioRequests[0].pauseCount === 1 && f.activity.join(',') === 'true', 'Rejected audio play recovers through an available local system voice');
    f.synth.start(); f.synth.end();
  }
  {
    const f = fixture({recordings:true, audioPlay:()=>{throw new Error('unsupported codec');}}); f.reveal(); f.speak.click();
    check(f.synth.calls.length === 1 && f.audioRequests[0].pauseCount === 1, 'Synchronous audio failure has the same local-only fallback');
  }
  {
    const f = fixture({recordings:true}); f.reveal(); f.speak.click(); f.timeout();
    check(f.synth.calls.length === 1 && f.audioRequests[0].pauseCount === 1, 'A recording that never starts times out into the local fallback');
  }
  {
    const f = fixture({recordings:true, offline:true}); f.reveal(); f.speak.click(); const audio=f.audioRequests[0];
    audio.onplaying(); audio.onwaiting(); audio.onerror();
    check(f.synth.calls.length === 0 && f.offlineVoice.calls.length === 0 && f.face.dataset.voiceActive === 'false', 'A partially heard identity is never repeated through another voice');
  }
  {
    const f = fixture({recordings:true, voices:[]}); f.reveal(); f.speak.click(); f.audioRequests[0].onerror();
    check(f.face.dataset.voiceActive === 'false' && f.face.dataset.speaking === 'false' && f.status.textContent.includes('تعذّر'), 'No fallback voice produces an honest failure with no mouth animation');
  }
  {
    const f = fixture({recordings:true}); f.reveal(); f.speak.click(); const audio=f.audioRequests[0];
    audio.onplaying(); audio.onpause();
    check(f.face.dataset.speaking === 'false' && f.face.dataset.voiceActive === 'true', 'Media pause immediately suspends the mouth while retaining Stop');
    audio.onplaying(); f.speak.click();
  }
  {
    const f = fixture({supported:false, recordings:true});
    check(f.status.textContent === 'صوت وتعبيرات بلمسة منك', 'Built-in identity keeps the initial header ready without any installed voice');
    f.reveal(); f.speak.click();
    check(f.audioRequests.length === 1 && !f.speak.disabled, 'Bundled intro works without Speech Synthesis support');
    const audio = f.audioRequests[0]; audio.onplaying(); f.hideDocument();
    check(audio.pauseCount === 1 && f.face.dataset.voiceActive === 'false', 'Tab hide cancels recording');
  }
  {
    let reads = 0;
    const f = fixture({voices:[{lang:'ar',localService:false}], recordings:true, snapshot:()=>{reads++; return {narration:'actual report'};}});
    f.reveal(); f.report.click(); await flush();
    check(reads === 1 && f.synth.calls.length === 0 && f.audioRequests.length === 0 && f.status.textContent.includes('التقرير يحتاج'), 'Written report opens without a local voice and never substitutes a static intro');
    check(f.reportEvents.some(event=>event.type==='wf-robot-report-open' && event.snapshot.narration==='actual report') && f.reportEvents.at(-1).state==='unavailable', 'No-voice report emits its snapshot and an honest unavailable playback state');
  }
  {
    let resolve;
    const f = fixture({snapshot:()=>new Promise(done=>resolve=done)}); f.reveal(); f.report.click();
    check(f.face.dataset.voiceActive === 'true' && f.face.dataset.speaking === 'false' && f.report.getAttribute('aria-pressed') === 'true', 'Async report is cancellable while preparing');
    f.report.click(); resolve({narration:'late report'}); await flush();
    check(f.synth.calls.length === 0 && f.face.dataset.voiceActive === 'false' && f.activity.join(',') === 'true,false', 'Stop invalidates a pending report');
  }
  for (const [name, stop] of [['language change',f=>f.language('en')], ['dashboard exit',f=>f.leaveDashboard()]]) {
    let resolve;
    const f = fixture({snapshot:()=>new Promise(done=>resolve=done)}); f.reveal(); f.report.click(); stop(f); resolve({narration:'late report'}); await flush();
    check(f.synth.calls.length === 0 && f.face.dataset.voiceActive === 'false', 'Pending report cancels on '+name);
  }
  {
    let requested;
    const narration = 'Actual daily business figures from committed data.';
    const f = fixture({snapshot:options=>{requested=options;return Promise.resolve({narration});}}); f.reveal(); f.report.click(); await flush();
    check(requested.locale === 'ar' && f.synth.calls[0]?.text === narration && f.activity.join(',') === 'true', 'Daily report awaits localized current snapshot and speaks exact narration once');
    f.synth.start();
    const [expressionId, expressionTimer] = [...f.timers.entries()].find(([,timer])=>timer.ms===3200); f.timers.delete(expressionId); expressionTimer.fn();
    check(f.face.dataset.speaking === 'true' && f.face.dataset.expression === 'calm', 'Actual speech automatically changes expression without another click');
    f.synth.current.onboundary({name:'sentence',charIndex:0,charLength:25});
    f.synth.current.onboundary({name:'word',charIndex:26,charLength:8});
    check(f.reportEvents.filter(event=>event.type==='wf-robot-report-boundary').length === 2 && f.reportEvents.at(-1).charIndex===26, 'Every real sentence and word boundary reaches the report reader');
    check(f.face.dataset.speechBeat === 'true', 'Word boundary drives a mouth beat');
    f.send('wf-robot-report-control',{action:'stop'});
    check(f.synth.cancelCount === 1 && f.face.dataset.speaking === 'false' && f.timers.size === 0, 'Report reader Stop cancels owned speech and animation timers');
    check(f.reportEvents.at(-1).state==='stopped', 'Reader receives stopped state');
    f.send('wf-robot-report-control',{action:'replay'}); await flush();
    check(f.synth.calls.length===2 && f.synth.calls[1].text===narration, 'Reader replay follows the normal fresh-report path');
    f.synth.start(); f.synth.end();
    check(f.reportEvents.at(-1).state==='finished', 'Natural report completion reaches reader');
  }
  {
    const f = fixture({snapshot:()=>Promise.resolve({narration:'',unavailableReason:'partial data'})}); f.reveal(); f.report.click(); await flush();
    check(f.synth.calls.length === 0 && f.face.dataset.voiceActive === 'false' && f.status.textContent.includes('غير متاحة'), 'Incomplete report does not invent or speak totals');
    check(f.reportEvents.find(event=>event.type==='wf-robot-report-open')?.snapshot.unavailableReason==='partial data', 'Incomplete report still exposes its actual qualification to the reader');
  }
  {
    const f = fixture({preferences:{autoExpressions:false,idleMotion:false}});f.reveal();f.speak.click();f.synth.start();
    check(f.face.dataset.expression==='calm' && f.face.dataset.idleMotion==='false', 'Saved expression and idle motion preferences are respected');
    f.send('wf-robot-motion',{active:true,x:2,y:-2});
    check(f.face.dataset.tracking==='true' && f.face.styles['--wf-robot-look-x']==='22px' && f.face.styles['--wf-robot-look-y']==='-12px', 'Camera gaze coordinates are bounded');
    f.hide();check(f.face.dataset.tracking==='false' && f.face.styles['--wf-robot-look-x']==='0px', 'Hidden face immediately drops camera gaze');
  }
  {
    const f = fixture({offline:true, supported:false}); f.reveal(); f.speak.click();
    check(!f.speak.disabled && f.offlineVoice.calls.length===1 && f.face.dataset.speaking==='false', 'Installed pack can generate while unsupported system speech remains unused');
    const request = f.offlineVoice.calls[0]; request.onStart();
    check(f.face.dataset.speaking==='true' && f.face.dataset.expression==='happy', 'Pack mouth starts only when actual audio starts');
    request.onWaiting();
    check(f.face.dataset.speaking==='false' && f.face.dataset.voiceActive==='true', 'Sentence generation gaps stop the mouth without losing Stop');
    request.onStart(); f.hide(); request.onStart(); request.onEnd();
    check(f.offlineVoice.cancels===1 && f.face.dataset.voiceActive==='false' && f.face.dataset.speaking==='false', 'Hide cancels pack playback and rejects stale callbacks');
  }
  {
    const f = fixture({offline:true});f.reveal();f.speak.click();f.offlineVoice.calls[0].onError();
    check(f.synth.calls.length===1 && f.synth.calls[0].voice.localService===true && f.activity.join(',')==='true', 'Pack failure before audio falls back to a local system voice without restarting carousel');
    f.synth.start();f.synth.end();
  }
  {
    const f = fixture({offline:true});f.reveal();f.speak.click();const request=f.offlineVoice.calls[0];request.onStart();request.onWaiting();request.onError();
    check(f.synth.calls.length===0 && f.face.dataset.voiceActive==='false' && f.status.textContent.includes('تعذّر'), 'Failure after a spoken sentence does not repeat the report through fallback');
  }
  {
    const f = fixture({offline:true,offlineReady:false});f.reveal();f.speak.click();
    check(f.offlineVoice.calls.length===0 && f.synth.calls.length===1, 'Partially installed packs never replace a ready native local voice');
  }
  {
    const text='First sentence. Second sentence.';
    const f=fixture({offline:true,voices:[],snapshot:()=>({narration:text})});f.reveal();f.report.click();await flush();
    check(f.offlineVoice.calls[0]?.text===text && f.offlineVoice.calls[0]?.locale==='ar', 'Ready local pack receives the current report in the selected language');
    const request=f.offlineVoice.calls[0];request.onStart();request.onBoundary({charIndex:0,charLength:15});request.onWaiting();request.onStart();request.onBoundary({charIndex:16,charLength:16});
    const boundaries=f.reportEvents.filter(event=>event.type==='wf-robot-report-boundary');
    check(boundaries.length===2 && boundaries[1].charIndex===16 && boundaries[1].charLength===16, 'Only actual sentence offsets from playback reach the reader');
    request.onEnd();
    check(f.reportEvents.at(-1).state==='finished' && f.face.dataset.speaking==='false', 'Pack completion releases reader and mouth state');
  }
  {
    const order=[],leases=[];let downloads=0,ready=false,resolveDownload,downloadOptions;
    const snapshot={narration:'المبيعات: ١٢٫٥٠ دولار.'},chunks=[{text:'الْمَبِيعَاتُ اثْنَا عَشَرَ فَاصِلَة خَمْسَة صِفْر دُولَار',charIndex:0,charLength:snapshot.narration.length}];
    const f=fixture({offline:true,offlineReady:false,voices:[],snapshot:()=>{order.push('read');return snapshot;}});
    f.offlineVoice.getStatus=()=>({state:ready?'ready':'not-installed',ready,total:33526399});
    f.offlineVoice.list=()=>[{locale:'ar',engine:'nabra'}];
    f.offlineVoice.preparePlayback=()=>{order.push('prime');const lease={disposed:false,dispose(){this.disposed=true;}};leases.push(lease);return lease;};
    f.offlineVoice.download=(_locale,options)=>{downloads++;downloadOptions=options;return new Promise(resolve=>resolveDownload=()=>{ready=true;resolve();});};
    f.win.WFArabicReportSpeech={prepare:value=>{check(value===snapshot,'Arabic speech uses the exact displayed committed snapshot');return chunks;}};
    f.reveal();f.report.click();await flush();
    check(order.join(',')==='prime,read'&&leases[0].disposed,'Report primes audio inside the tap before asynchronous records and releases an unused lease');
    check(downloads===0&&f.reportEvents.some(event=>event.type==='wf-robot-report-voice'&&event.state==='missing'&&event.total===33526399),'Opening a missing report pack only offers its real download size');
    f.send('wf-robot-report-control',{action:'install'});await flush();
    check(downloads===1&&!downloadOptions.signal.aborted&&f.face.dataset.speaking==='false','Explicit installation owns a cancellable download and does not animate speech');
    downloadOptions.onProgress({progress:.5,loaded:100,total:200});
    check(f.reportEvents.at(-1).state==='downloading'&&f.reportEvents.at(-1).progress===.5,'Download progress is forwarded as a ratio and exact byte totals');
    resolveDownload();await flush();
    const request=f.offlineVoice.calls[0];
    check(request.text===snapshot.narration&&request.chunks===chunks&&request.playback===leases[1],'Completed install passes vocalized chunks and the same primed audio lease into local speech');
    check(f.face.dataset.speaking==='false','Successful installation alone never marks the robot as speaking');
    request.onStart();check(f.face.dataset.speaking==='true','Downloaded report mouth begins at actual playback');request.onEnd();
  }
  for(const [name,stop] of [['Cancel',f=>f.send('wf-robot-report-control',{action:'cancel-download'})],['hidden robot',f=>f.hide()],['language change',f=>f.language('tr')],['route change',f=>f.leaveDashboard()]]){
    let resolveDownload,signal,disposed=0;
    const f=fixture({offline:true,offlineReady:false,voices:[],snapshot:()=>({narration:'actual report'})});
    f.offlineVoice.getStatus=()=>({ready:false,state:'not-installed',total:33526399});
    f.offlineVoice.preparePlayback=()=>({dispose(){disposed++;}});
    f.offlineVoice.download=(_locale,options)=>{signal=options.signal;return new Promise(resolve=>resolveDownload=resolve);};
    f.reveal();f.send('wf-robot-report-control',{action:'install'});await flush();stop(f);resolveDownload();await flush();
    check(signal.aborted&&disposed===1&&f.offlineVoice.calls.length===0&&f.face.dataset.voiceActive==='false','First voice download cancels without late playback on '+name);
  }
  {
    const f=fixture({offline:true,voices:[],snapshot:()=>({narration:'unexpected report template'})});
    f.offlineVoice.list=()=>[{locale:'ar',engine:'nabra'}];f.win.WFArabicReportSpeech={prepare(){throw new Error('unsupported-report');}};
    f.reveal();f.report.click();await flush();
    check(!f.offlineVoice.calls.length&&f.reportEvents.some(event=>event.type==='wf-robot-report-voice'&&event.reason==='report-text-unsupported'),'Unrecognized financial text never produces guessed speech');
  }
  console.log(`${assertionCount} robot offline speech/report lifecycle assertions passed.`);
})().catch(error=>{console.error(error);process.exitCode=1;});
