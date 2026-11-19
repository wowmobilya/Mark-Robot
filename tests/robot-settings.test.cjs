const test = require('node:test');
const assert = require('node:assert/strict');
const {normalize, mergeSettings, packActionDisabled, createPreferenceStore, movement, createMotionTracker} = require('../robot-settings.js');

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
  assert.deepEqual(normalize(), {autoExpressions: true, idleMotion: true, trackingSensitivity: 'normal'});
  assert.deepEqual(normalize({autoExpressions: false, idleMotion: false, trackingSensitivity: 'high', cameraEnabled: true}),
    {autoExpressions: false, idleMotion: false, trackingSensitivity: 'high'});
  assert.equal(normalize({trackingSensitivity: 'invalid'}).trackingSensitivity, 'normal');
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
