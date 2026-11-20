const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

function fixture({supported = true, rejects = []} = {}) {
  const events = new Map(), handlers = new Map(), calls = [];
  let current = {active: false, state: 'ready'};
  const mediaSession = {metadata: null, playbackState: 'none', setActionHandler(action, fn) {
    if (rejects.includes(action)) throw new Error('unsupported');
    handlers.set(action, fn);
  }};
  const window = {navigator: supported ? {mediaSession} : {}, MediaMetadata: class {constructor(value) {Object.assign(this, value);}},
    WFProgramSpeech: {getState: () => current, pause() {calls.push('pause');}, resume() {calls.push('resume'); return Promise.resolve();}, stop() {calls.push('stop');}},
    addEventListener: (type, fn) => events.set(type, fn)};
  const file = path.resolve(__dirname, '../speech-media.js');
  assert(fs.existsSync(file), 'Media controls must be implemented');
  vm.runInNewContext(fs.readFileSync(file, 'utf8'), {window});
  return {mediaSession, handlers, calls, emit(value) {current = value; events.get('wf-program-speech-state')?.({detail: value});}, hide() {events.get('pagehide')?.({});}};
}

test('lock-screen controls follow the current owned speech and never expose report data', async () => {
  const f = fixture();
  assert.equal(f.handlers.size, 0);
  f.emit({active: true, state: 'preparing', kind: 'report', locale: 'ar', voiceName: 'Mark · local reference', message: 'Private customer amount'});
  assert.match(f.mediaSession.metadata.title, /تقرير/);
  assert(!JSON.stringify(f.mediaSession.metadata).includes('Private'));
  assert.equal(f.mediaSession.playbackState, 'paused');
  f.emit({active: true, state: 'speaking', kind: 'report', locale: 'ar'});
  assert.equal(f.mediaSession.playbackState, 'playing');
  f.emit({active: true, state: 'preparing', kind: 'report', locale: 'ar'});
  assert.equal(f.mediaSession.playbackState, 'playing', 'buffering is not an intentional pause');
  f.handlers.get('pause')();
  f.emit({active: true, state: 'paused', paused: true, kind: 'report', locale: 'ar'});
  await f.handlers.get('play')();
  f.handlers.get('stop')();
  assert.deepEqual(f.calls, ['pause', 'resume', 'stop']);
  const stale = f.handlers.get('play');
  f.emit({active: false, state: 'stopped'});
  await stale();
  assert.deepEqual(f.calls, ['pause', 'resume', 'stop']);
  assert.equal(f.mediaSession.playbackState, 'none');
  assert.equal(f.mediaSession.metadata, null);
  assert.equal(f.handlers.get('pause'), null);
});

test('partial support and page teardown never break playback', () => {
  const absent = fixture({supported: false});
  absent.emit({active: true, state: 'speaking'});
  const f = fixture({rejects: ['stop']});
  f.emit({active: true, state: 'speaking', kind: 'program', locale: 'tr'});
  assert.equal(typeof f.handlers.get('pause'), 'function');
  f.hide();
  assert.equal(f.mediaSession.playbackState, 'none');
  assert.equal(f.handlers.get('play'), null);
});
