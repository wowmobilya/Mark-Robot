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
  assert.deepEqual(normalize(), {autoExpressions: true, idleMotion: true, trackingSensitivity: 'normal', speechEnabled:true, speechRate:1, speechVolume:1, arabicDialect:'sy', speechBackend:'reference', continuousSpeech:true});
  assert.deepEqual(normalize({autoExpressions: false, idleMotion: false, trackingSensitivity: 'high', cameraEnabled: true}),
    {...defaults, autoExpressions: false, idleMotion: false, trackingSensitivity: 'high'});
  assert.equal(normalize({trackingSensitivity: 'invalid'}).trackingSensitivity, 'normal');
});

test('speech controls preserve mute, clamp speed/volume and reject invalid voice choices', () => {
  const chosen=normalize({speechEnabled:false,speechRate:1.2,speechVolume:0,arabicDialect:'eg',speechBackend:'device',continuousSpeech:false});
  assert.equal(chosen.speechEnabled,false); assert.equal(chosen.speechRate,1.2); assert.equal(chosen.speechVolume,0);
  assert.equal(chosen.arabicDialect,'eg'); assert.equal(chosen.speechBackend,'device'); assert.equal(chosen.continuousSpeech,false);
  assert.equal(normalize({speechRate:8}).speechRate,1.25); assert.equal(normalize({speechRate:-2}).speechRate,.75);
  assert.equal(normalize({speechVolume:9}).speechVolume,1); assert.equal(normalize({speechVolume:-1}).speechVolume,0);
  for(const value of [NaN,Infinity,'1.1',null]) assert.equal(normalize({speechRate:value}).speechRate,1);
  assert.equal(normalize({arabicDialect:'xx',speechBackend:'remote'}).arabicDialect,'sy');
  assert.equal(normalize({speechBackend:'remote'}).speechBackend,'reference');
});

test('the new default does not migrate an explicitly saved lightweight or device voice', () => {
  assert.equal(defaults.speechBackend, 'reference');
  for (const backend of ['reference', 'local', 'device']) {
    assert.equal(normalize({speechBackend:backend}).speechBackend, backend);
    assert.equal(mergeSettings({robot:{speechBackend:backend}}, {}, {speechRate:1.1}).robot.speechBackend, backend);
  }
  assert.equal(mergeSettings({robot:{speechBackend:'local'}}, {}, {speechBackend:'reference'}).robot.speechBackend, 'reference');
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
  assert.deepEqual(entries.filter(entry=>entry.backend==='local').map(entry=>entry.key),['local:ar','local:tr']);
  assert(entries.filter(entry=>entry.backend==='local').every(entry=>entry.api===local));
  const missing = voicePackEntries(local, null, 'ar').find(entry=>entry.backend==='reference');
  assert.equal(missing.status.state,'unsupported'); assert.equal(missing.status.reason,'reference-unavailable');
});

function settingsUIFixture({localReady = false} = {}) {
  const nodes = [], trace = [], listeners = new Map();
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
  const state={settings:{robot:{speechBackend:'reference',arabicDialect:'sy'}}};
  const refStatus={state:'not-installed',ready:false,total:921000000};let releaseDownload,speechActive=false,audioActive=false;
  class CustomEvent {constructor(type,options={}){this.type=type;this.detail=options.detail;}}
  const window={isSecureContext:true,switchTab(){},applyTr(){},addEventListener(name,listener){const list=listeners.get(name)||[];list.push(listener);listeners.set(name,list);},removeEventListener(){},dispatchEvent(event){for(const listener of listeners.get(event.type)||[])listener(event);},
    WFOfflineVoice:{list:()=>['ar','en','tr','fr','ru'].map(locale=>({locale,name:'Light '+locale,bytes:30})),getStatus:locale=>({locale,state:localReady?'ready':'not-installed',ready:localReady}),
      async remove(locale){trace.push({kind:'remove-local',locale,ownerActive:speechActive});audioActive=false;}},
    WFReferenceVoice:{list:()=>['ar','en','tr','fr','ru'].map(locale=>({locale,name:'Mark · local reference',bytes:921000000})),getStatus:locale=>({...refStatus,locale,name:'Mark · local reference'}),
      download(locale,options){trace.push({kind:'download',locale,options});refStatus.state='downloading';options.onProgress?.();return new Promise(resolve=>{releaseDownload=()=>{refStatus.state='not-installed';resolve();};});},remove:async()=>{},cancelDownload(){}},
    WFProgramSpeech:{speak(options){trace.push({kind:'speak',options});speechActive=audioActive=true;window.dispatchEvent(new CustomEvent('wf-program-speech-state',{detail:{state:'ready',active:false}}));window.dispatchEvent(new CustomEvent('wf-program-speech-state',{detail:{state:'preparing',active:true,voiceName:'Mark · local reference'}}));return true;},preview(options){trace.push({kind:'recording',options});return true;},
      stop(){trace.push({kind:'stop'});speechActive=audioActive=false;window.dispatchEvent(new CustomEvent('wf-program-speech-state',{detail:{state:'stopped',active:false}}));}}};
  vm.runInNewContext(readFileSync(require.resolve('../robot-settings.js'),'utf8'),{window,document,S:state,navigator:{mediaDevices:{}},MutationObserver:class{observe(){}disconnect(){}},CustomEvent,AbortController,Intl,setTimeout,clearTimeout});
  return {nodes,trace,root,window,speechState:()=>({active:speechActive,audioActive}),
    reading:nodes.find(node=>node.dataset.wfReadingPreview==='true'),
    status:nodes.find(node=>node.className==='wf-robot-reading-preview-status'),
    backend:nodes.find(node=>node.name==='speechBackend'),
    reference:nodes.find(node=>node.dataset.backend==='reference'),
    emitSpeech:detail=>window.dispatchEvent(new CustomEvent('wf-program-speech-state',{detail})),
    releaseDownload:()=>releaseDownload()};
}

test('settings has a separate trusted reading sample, no automatic download, and an explicit save gate', () => {
  const f=settingsUIFixture();
  assert.equal(f.nodes.filter(node=>node.dataset.backend==='reference').length,1);
  assert.equal(f.nodes.filter(node=>node.className==='wf-robot-voice-row').length,6);
  assert.deepEqual(f.backend.children.map(option=>option.value),['reference','local','device']);
  assert.equal(f.trace.length,0);
  f.reading.events.click({isTrusted:false});assert.equal(f.trace.length,0);
  const event={isTrusted:true};f.reading.events.click(event);
  assert.equal(f.trace.length,1);assert.equal(f.trace[0].kind,'speak');assert.equal(f.trace[0].options.event,event);
  assert.equal(f.trace[0].options.locale,'ar');assert(f.trace[0].options.text.includes('هاي تجربة'));
  assert(f.status.textContent.includes('Mark · local reference'));
  f.emitSpeech({state:'ready',active:false});assert.equal(f.status.textContent,'انتهت عينة القراءة.');
  f.root.lang='tr';f.window.applyTr();assert.equal(f.status.textContent,'Okuma örneği tamamlandı.');
  f.backend.value='local';f.backend.events.change();f.reading.events.click({isTrusted:true});
  assert.equal(f.trace.length,1);assert(f.status.textContent.includes('kaydedin'));
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

test('removing an installed lightweight pack stops reference playback and its UI owner before deletion', async () => {
  const f=settingsUIFixture({localReady:true});
  f.reading.events.click({isTrusted:true});
  assert.deepEqual(f.speechState(),{active:true,audioActive:true});
  const localCard=f.nodes.find(node=>node.dataset.backend==='local');
  const remove=localCard.children.find(node=>node.className==='wf-robot-voice-action');
  await remove.events.click({isTrusted:true});
  assert.deepEqual(f.trace.map(item=>item.kind),['speak','stop','remove-local']);
  assert.equal(f.trace.at(-1).ownerActive,false);
  assert.deepEqual(f.speechState(),{active:false,audioActive:false});
  assert.equal(f.status.textContent,'أُوقفت عينة القراءة.');
  assert.equal(f.window.WFRobotSettings.getPreferences().speechBackend,'reference');
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
