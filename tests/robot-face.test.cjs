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

function fixture({lang = 'ar', voices = [{lang: 'ar-SA', localService: true}], supported = true} = {}) {
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
      this.isConnected = true; this.textContent = ''; this.classes = new Set();
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
    click() { this.dispatchEvent(new CustomEvent('click', {bubbles: true})); }
    set innerHTML(value) {
      this.html = value;
      for (const selector of ['#wfRobotTitle span', '.wf-robot-status', '.wf-robot-speak', '.wf-robot-expression', '.wf-robot-mouth']) {
        const node = new Element(selector.includes('speak') || selector.includes('expression') ? 'button' : 'span');
        node.parentNode = this;
        this.map[selector] = node;
        if (node.tagName === 'BUTTON') node.map.span = new Element('span');
      }
    }
  }
  class CustomEvent {
    constructor(type, options = {}) {
      this.type = type; this.bubbles = !!options.bubbles; this.detail = options.detail;
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
  const activity = [];
  track.addEventListener('wf-robot-speaking', event => activity.push(event.detail.active));
  vm.runInNewContext(source, {
    document: doc, window: win, MutationObserver, CustomEvent,
    setTimeout: (fn, ms) => { const id = ++timerId; timers.set(id, {fn, ms}); return id; },
    clearTimeout: id => timers.delete(id),
  });
  const face = doc.getElementById('wfGreetingRobot');
  return {
    face, track, doc, win, root, dashboard, synth, activity, observers, timers,
    speak: face.querySelector('.wf-robot-speak'),
    expression: face.querySelector('.wf-robot-expression'),
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
  for (const expected of ['happy', 'thinking', 'surprised', 'calm']) {
    f.expression.click(); check(f.face.dataset.expression === expected, 'Expression cycle: ' + expected);
  }
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
  check(f.synth.calls[0]?.lang === 'ar-EG', 'Matching platform voice works without installed voice');
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
  const f = fixture({supported: false}); f.reveal(); f.speak.click(); f.expression.click();
  check(f.speak.disabled && f.synth.calls.length === 0 && f.face.dataset.expression === 'happy', 'Unsupported browsers retain expressions and disable audio');
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
console.log(`${assertionCount} robot speech lifecycle assertions passed.`);
