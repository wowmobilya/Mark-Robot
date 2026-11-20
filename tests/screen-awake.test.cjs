'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {existsSync, readFileSync} = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const file = path.resolve(__dirname, '../screen-awake.js');
const source = existsSync(file) ? readFileSync(file, 'utf8') : '';
const flush = () => new Promise(resolve => setImmediate(resolve));

function fixture({active = false, hidden = false, supported = true, secure = true, requestError} = {}) {
  const document = new EventTarget(), window = new EventTarget(), requests = [];
  let state = {state: active ? 'preparing' : 'ready', active};
  document.hidden = hidden;
  document.visibilityState = hidden ? 'hidden' : 'visible';
  window.document = document;
  window.isSecureContext = secure;
  window.navigator = supported ? {wakeLock: {request(type) {
    if (requestError) throw requestError;
    let resolve, reject;
    const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
    requests.push({type, resolve, reject});
    return promise;
  }}} : {};
  window.WFProgramSpeech = {getState: () => state};
  vm.runInNewContext(source, {window, document, navigator: window.navigator});
  return {
    window, document, requests,
    update(active, nextState = active ? 'speaking' : 'ready') {
      state = {state: nextState, active};
      const event = new Event('wf-program-speech-state'); event.detail = state;
      window.dispatchEvent(event);
    },
    setState(active) { state = {state: active ? 'preparing' : 'ready', active}; },
    visibility(hidden) {
      document.hidden = hidden;
      document.visibilityState = hidden ? 'hidden' : 'visible';
      document.dispatchEvent(new Event('visibilitychange'));
    },
    grant(index = requests.length - 1, {releaseError} = {}) {
      const sentinel = new EventTarget();
      sentinel.type = 'screen'; sentinel.released = false;
      sentinel.release = () => {
        if (releaseError) return Promise.reject(releaseError);
        sentinel.platformRelease();
        return Promise.resolve();
      };
      sentinel.platformRelease = () => {
        if (sentinel.released) return;
        sentinel.released = true;
        sentinel.dispatchEvent(new Event('release'));
      };
      assert(requests[index], 'reading must request a screen wake lock');
      requests[index].resolve(sentinel);
      return sentinel;
    }
  };
}

test('preparation requests a screen lock immediately and speaking retains the same lock', async () => {
  const f = fixture();
  assert.equal(f.requests.length, 0);
  f.update(true, 'preparing');
  assert.equal(f.requests.length, 1, 'preparation must acquire before audio starts');
  assert.equal(f.requests[0].type, 'screen');
  f.update(true, 'preparing'); f.update(true);
  assert.equal(f.requests.length, 1, 'pending requests must not overlap');
  const lock = f.grant(); await flush();
  f.update(true);
  assert.equal(lock.released, false);
  assert.equal(f.requests.length, 1, 'progress updates retain an existing lock');
});

test('loading during preparation acquires from the current speech owner', async () => {
  const f = fixture({active: true});
  const lock = f.grant(); await flush();
  assert.equal(lock.released, false);
});

test('an owner becoming ready after the script loads is synchronized', async () => {
  const f = fixture();
  f.setState(true); f.window.dispatchEvent(new Event('wf-robot-ready'));
  const lock = f.grant(); await flush();
  assert.equal(lock.released, false);
});

for (const state of ['stopped', 'ready', 'failed', 'reportUnavailable', 'disabled', 'muted']) {
  test(`${state} releases the screen lock when speech is no longer active`, async () => {
    const f = fixture({active: true}), lock = f.grant(); await flush();
    f.update(false, state); await flush();
    assert.equal(lock.released, true);
    assert.equal(f.requests.length, 1, 'our own release must not reacquire');
  });
}

test('hiding releases the lock and visibility restores it only while the owner remains active', async () => {
  const f = fixture({active: true}), first = f.grant(); await flush();
  f.visibility(true); await flush();
  assert.equal(first.released, true);
  f.update(true, 'preparing');
  assert.equal(f.requests.length, 1);
  f.visibility(false);
  const second = f.grant(1); await flush();
  assert.equal(second.released, false);
  f.visibility(true); f.update(false); f.visibility(false); await flush();
  assert.equal(second.released, true);
  assert.equal(f.requests.length, 2, 'visibility must never restart stopped reading');
});

test('a hidden page waits until it becomes visible before requesting', async () => {
  const f = fixture({active: true, hidden: true});
  assert.equal(f.requests.length, 0);
  f.visibility(false);
  const lock = f.grant(); await flush();
  assert.equal(lock.released, false);
});

test('a platform release is reacquired while visible without looping on repeated revocation', async () => {
  const f = fixture({active: true}), first = f.grant(); await flush();
  first.platformRelease();
  const second = f.grant(1); await flush();
  assert.equal(second.released, false);
  second.platformRelease(); f.update(true); await flush();
  assert.equal(f.requests.length, 2, 'repeated platform revocation must not create a request loop');
});

test('a lock granted after stopping is released without reviving reading', async () => {
  const f = fixture({active: true});
  f.update(false, 'stopped');
  const lock = f.grant(); await flush();
  assert.equal(lock.released, true);
  assert.equal(f.requests.length, 1);
});

test('a stale grant cannot take ownership of a newer reading session', async () => {
  const f = fixture({active: true});
  f.update(false); f.update(true, 'preparing');
  const old = f.grant(0); await flush();
  assert.equal(old.released, true);
  assert.equal(f.requests.length, 2);
  const current = f.grant(1); await flush();
  assert.equal(current.released, false);
  f.update(false); await flush();
  assert.equal(current.released, true);
});

test('a late grant after hiding is released and a visible active session gets a fresh lock', async () => {
  const f = fixture({active: true});
  f.visibility(true); f.visibility(false);
  const old = f.grant(0); await flush();
  assert.equal(old.released, true);
  const current = f.grant(1); await flush();
  assert.equal(current.released, false);
});

test('pagehide releases the held lock and late grants', async () => {
  for (const grantFirst of [true, false]) {
    const f = fixture({active: true});
    let lock;
    if (grantFirst) { lock = f.grant(); await flush(); }
    f.window.dispatchEvent(new Event('pagehide'));
    if (!grantFirst) lock = f.grant();
    await flush();
    assert.equal(lock.released, true);
    f.setState(false); f.window.dispatchEvent(new Event('pageshow'));
    assert.equal(f.requests.length, 1);
    f.update(true, 'preparing');
    const restored = f.grant(1); await flush();
    assert.equal(restored.released, false, 'a restored page supports a new reading session');
  }
});

test('denial does not retry on progress or visibility until a new reading session', async () => {
  const f = fixture({active: true});
  assert.equal(f.requests.length, 1);
  f.requests[0].reject(Object.assign(new Error('Denied'), {name: 'NotAllowedError'})); await flush();
  f.update(true); f.visibility(true); f.visibility(false); f.update(true); await flush();
  assert.equal(f.requests.length, 1);
  f.update(false); f.update(true, 'preparing');
  const lock = f.grant(1); await flush();
  assert.equal(lock.released, false);
});

test('an old request rejection does not block a newer reading session', async () => {
  const f = fixture({active: true});
  assert.equal(f.requests.length, 1);
  f.update(false); f.update(true);
  f.requests[0].reject(new Error('Inactive old document')); await flush();
  const current = f.grant(1); await flush();
  assert.equal(current.released, false);
});

test('unsupported or insecure browsers leave speech activity alone', async () => {
  for (const options of [{supported: false}, {secure: false}]) {
    const f = fixture({...options, active: true});
    f.update(true); f.visibility(true); f.visibility(false); f.update(false); await flush();
    assert.equal(f.requests.length, 0);
    assert.equal(f.window.WFProgramSpeech.getState().active, false);
  }
});

test('synchronous request failures and release rejections never escape the lifecycle', async () => {
  const denied = fixture({requestError: new Error('Invalid context')});
  assert.doesNotThrow(() => denied.update(true, 'preparing')); await flush();
  denied.update(false);
  const f = fixture({active: true});
  f.grant(0, {releaseError: new Error('Invalidated context')}); await flush();
  assert.doesNotThrow(() => f.update(false)); await flush();
});
