const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = path.join(__dirname, '..', 'home-dock.js');
const readDock = () => {
  assert(fs.existsSync(source), 'The legacy edge dock controller must be available');
  return require(source);
};

function fixture({saved, dir = 'rtl', width = 390, height = 844, active = true, inline = false} = {}) {
  let doc, frame = 0, reads = 0;
  const frames = new Map(), observers = [], records = new Map(), writes = [], events = [], created = [];
  if (saved !== undefined) records.set('wf.dashboard.dockPosition', typeof saved === 'string' ? saved : JSON.stringify(saved));
  class Target {
    constructor() { this.listeners = new Map(); }
    addEventListener(type, callback) { if (!this.listeners.has(type)) this.listeners.set(type, []); this.listeners.get(type).push(callback); }
    emit(type, values = {}) {
      const event = {type, target: this, preventDefault() { this.defaultPrevented = true; }, stopPropagation() { this.stopped = true; }, ...values};
      for (const callback of this.listeners.get(type) || []) callback(event);
      return event;
    }
  }
  class Style {
    constructor() { this.values = new Map(); this.priorities = new Map(); }
    setProperty(key, value, priority = '') { this.values.set(key, value); this.priorities.set(key, priority); }
    getPropertyValue(key) { return this.values.get(key) || ''; }
    getPropertyPriority(key) { return this.priorities.get(key) || ''; }
  }
  class Element extends Target {
    constructor(tag) { super(); this.tagName = tag.toUpperCase(); this.ownerDocument = doc; this.style = new Style(); this.dataset = {}; this.children = []; this.attributes = new Map(); this.className = ''; this.hidden = false; this.open = false; this.scrollTop = 0; this.scrollHeight = 500; this.clientHeight = 300; }
    get classList() { const self = this; return {contains: value => self.className.split(' ').includes(value), add(value) { self.className += ' ' + value; }, remove(value) { self.className = self.className.split(' ').filter(item => item !== value).join(' '); }}; }
    setAttribute(key, value) { this.attributes.set(key, String(value)); if (key === 'id') this.id = String(value); }
    getAttribute(key) { return this.attributes.get(key) ?? null; }
    append(...children) { for (const child of children) { child.parentNode = this; this.children.push(child); } }
    insertBefore(child, reference) { const index = this.children.indexOf(reference); child.parentNode = this; this.children.splice(index < 0 ? this.children.length : index, 0, child); }
    contains(target) { for (let node = target; node; node = node.parentNode) if (node === this) return true; return false; }
    querySelector(selector) { for (const child of this.children) { if (selector[0] === '#' ? child.id === selector.slice(1) : selector[0] === '.' ? child.classList.contains(selector.slice(1)) : child.tagName === selector.toUpperCase()) return child; const nested = child.querySelector(selector); if (nested) return nested; } return null; }
    get offsetWidth() { return this.tagName === 'SUMMARY' ? 14 : Math.min(this.width || 195, parseFloat(this.style.getPropertyValue('max-width')) || Infinity); }
    get offsetHeight() { return this.tagName === 'SUMMARY' ? 86 : Math.min(this.height || 400, parseFloat(this.style.getPropertyValue('max-height')) || Infinity); }
    getClientRects() { return this.hidden ? [] : [this.getBoundingClientRect()]; }
    getBoundingClientRect() {
      reads++;
      if (this.rect) return {...this.rect, width: this.rect.right - this.rect.left, height: this.rect.bottom - this.rect.top};
      const source = this.tagName === 'SUMMARY' ? this.parentNode : this;
      const left = parseFloat(source.style.getPropertyValue('left')) || 0, top = parseFloat(source.style.getPropertyValue('top')) || 0;
      return {left, top, right: left + this.offsetWidth, bottom: top + this.offsetHeight, width: this.offsetWidth, height: this.offsetHeight};
    }
    focus() { doc.activeElement = this; }
    setPointerCapture(id) { this.captured = id; }
    releasePointerCapture(id) { if (this.captured === id) this.captured = null; }
  }
  doc = new Element('document'); doc.ownerDocument = doc;
  doc.createElement = tag => { const element = new Element(tag); created.push(element); return element; }; doc.getElementById = id => doc.querySelector('#' + id);
  doc.documentElement = new Element('html'); doc.documentElement.dir = dir; doc.documentElement.clientWidth = width; doc.append(doc.documentElement);
  doc.body = new Element('body'); doc.documentElement.append(doc.body); doc.activeElement = doc.body;
  const make = (tag, id, classes, rect) => { const element = new Element(tag); element.id = id; element.className = classes; element.rect = rect; doc.body.append(element); return element; };
  const page = make('section', 'page-dashboard', active ? 'page active' : 'page');
  const header = make('header', '', 'navbar', {left: 0, right: width, top: 0, bottom: 72});
  const nav = make('nav', 'bottomNav', '', {left: 0, right: width, top: height - 64, bottom: height});
  const circle = make('button', 'bnavCircle', '', {left: 160, right: 220, top: height - 80, bottom: height - 20});
  const panel = new Element('div'); panel.id = 'wfHomeCustomizer'; panel.className = inline ? 'wf-home-customizer' : 'dash-dock-panel';
  const title = new Element('strong'); title.id = 'wfHomeCustomizerTitle'; title.tabIndex = -1; panel.append(title);
  const body = new Element('div'); body.className = 'dash-dock-layout'; panel.append(body);
  const layout = new Element('div'); layout.id = 'wfHomeLayout';
  if (inline) page.append(panel, layout);
  const win = new Target(); win.innerWidth = width; win.innerHeight = height; win.document = doc; doc.defaultView = win;
  win.localStorage = {getItem: key => records.get(key) ?? null, setItem(key, value) { writes.push([key, value]); records.set(key, value); }};
  win.visualViewport = new Target(); Object.assign(win.visualViewport, {width, height, offsetLeft: 0, offsetTop: 0});
  win.getComputedStyle = element => ({display: element.hidden ? 'none' : 'block', visibility: 'visible', opacity: '1', getPropertyValue: key => element.style.getPropertyValue(key)});
  win.requestAnimationFrame = callback => { frames.set(++frame, callback); return frame; };
  win.cancelAnimationFrame = id => frames.delete(id);
  const Observer = class { constructor(callback) { this.callback = callback; this.targets = []; observers.push(this); } observe(element) { this.targets.push(element); } };
  win.ResizeObserver = win.MutationObserver = Observer;
  const options = {panel, onOpen() { events.push(['open']); }, onClose(value) { events.push(['close', value.returnFocus]); }};
  if (inline) options.inline = true;
  const dock = readDock().create(options);
  const flush = () => { const batch = [...frames.values()]; frames.clear(); batch.forEach(callback => callback()); };
  flush();
  return {doc, win, page, panel, title, body, layout, header, nav, circle, dock, events, records, writes, frames, created, flush,
    observe(element) { for (const observer of observers) if (observer.targets.includes(element)) observer.callback([]); },
    get reads() { return reads; }, resetReads() { reads = 0; },
    pointer(type, x, y, extra = {}) { return dock.trigger.emit(type, {button: 0, isPrimary: true, pointerId: 7, clientX: x, clientY: y, ...extra}); }};
}

test('the old edge launcher opens and closes once with immediate callbacks and focus recovery', () => {
  const f = fixture(), {dock} = f;
  assert.equal(dock.menu.tagName, 'DETAILS'); assert.equal(dock.trigger.tagName, 'SUMMARY');
  assert.equal(dock.menu.parentNode, f.doc.body); assert.equal(dock.trigger.getAttribute('aria-controls'), 'wfHomeCustomizer');
  assert.equal(f.panel.parentNode, dock.menu); assert.equal(dock.menu.dataset.inline, undefined);
  assert.equal(f.doc.getElementById('wfHomeDockBackdrop').parentNode, f.doc.body);
  assert.equal(dock.trigger.getAttribute('aria-expanded'), 'false'); assert.equal(dock.menu.dataset.side, 'left');
  const click = dock.trigger.emit('click', {detail: 1}); assert(click.defaultPrevented); assert(dock.isOpen());
  assert.deepEqual(f.events, [['open']]); dock.open(); assert.equal(f.events.length, 1);
  assert.equal(dock.trigger.getAttribute('aria-expanded'), 'true');
  dock.trigger.emit('click', {detail: 0}); assert(!dock.isOpen()); assert.equal(f.doc.activeElement, dock.trigger);
  assert.deepEqual(f.events, [['open'], ['close', true]]); dock.close(); assert.equal(f.events.length, 2);
});

test('saved positions retain their edge and height; malformed values fall back safely', () => {
  const stored = fixture({saved: {x: .8, y: .2}, dir: 'rtl'}); assert.equal(stored.dock.menu.dataset.side, 'right');
  assert.equal(parseFloat(stored.dock.menu.style.getPropertyValue('left')), 376); assert.equal(stored.writes.length, 0);
  const bad = fixture({saved: '{broken', dir: 'ltr'}); assert.equal(bad.dock.menu.dataset.side, 'right');
  const clamped = fixture({saved: {x: -3, y: 9}}); assert.equal(clamped.dock.menu.dataset.side, 'left');
  assert.equal(parseFloat(clamped.dock.menu.style.getPropertyValue('top')), 670);
});

test('pointer drag snaps to an edge, persists only dock position and suppresses the trailing click', () => {
  const f = fixture(), start = f.dock.trigger.getBoundingClientRect();
  f.pointer('pointerdown', 7, start.top + 20); f.pointer('pointermove', 387, start.top + 90);
  f.pointer('pointerup', 387, start.top + 90); f.flush();
  assert.equal(f.dock.menu.dataset.side, 'right'); assert.equal(f.writes.length, 1);
  assert.equal(f.writes[0][0], 'wf.dashboard.dockPosition'); assert.equal(JSON.parse(f.writes[0][1]).x, 1);
  f.dock.trigger.emit('click', {detail: 1}); assert.equal(f.dock.isOpen(), false);
  f.pointer('pointerdown', 383, 450); f.pointer('pointerup', 383, 450);
  f.dock.trigger.emit('click', {detail: 1}); assert(f.dock.isOpen());
});

test('cancelled dragging restores the previous position without writing it', () => {
  const f = fixture({saved: {x: 0, y: .25}}), start = f.dock.trigger.getBoundingClientRect();
  f.pointer('pointerdown', 7, start.top + 10); f.pointer('pointermove', 380, 720); f.flush();
  f.pointer('pointercancel', 380, 720); f.flush();
  assert.equal(f.dock.menu.dataset.side, 'left'); assert.equal(f.dock.trigger.getBoundingClientRect().top, start.top); assert.equal(f.writes.length, 0);
});

test('panel anchoring respects header, raised bottom navigation and panned visual viewport', () => {
  const f = fixture(); f.dock.open(); f.flush();
  const menuTop = parseFloat(f.dock.menu.style.getPropertyValue('top'));
  const panelTop = menuTop + parseFloat(f.panel.style.getPropertyValue('top'));
  assert(panelTop >= 80); assert(panelTop + f.panel.offsetHeight <= 756);
  assert.equal(parseFloat(f.panel.style.getPropertyValue('left')), 22);
  f.win.visualViewport.offsetLeft = 30; f.win.visualViewport.offsetTop = 100;
  f.win.visualViewport.width = 300; f.win.visualViewport.height = 260;
  f.win.visualViewport.emit('resize'); f.flush();
  assert.equal(parseFloat(f.dock.menu.style.getPropertyValue('left')), 30);
  assert(parseFloat(f.dock.menu.style.getPropertyValue('top')) >= 108);
  assert(f.panel.offsetHeight <= 244);
  f.dock.swapSide(); f.flush(); assert.equal(f.dock.menu.dataset.side, 'right'); assert(f.dock.isOpen());
  assert.equal(f.writes.length, 1);
});

test('Escape and outside presses close through callbacks; navigating away hides the dock without layout reads', () => {
  const f = fixture(); f.dock.open();
  const escape = f.doc.emit('keydown', {key: 'Escape'}); assert(escape.defaultPrevented); assert.equal(f.doc.activeElement, f.dock.trigger);
  f.dock.open(); f.doc.emit('pointerdown', {target: f.doc.body}); assert.deepEqual(f.events.at(-1), ['close', false]);
  f.dock.open(); f.page.classList.remove('active'); f.resetReads(); f.observe(f.page); f.flush();
  assert(!f.dock.isOpen()); assert(f.dock.menu.hidden); assert.equal(f.reads, 0); assert.equal(f.dock.open(), false);
  f.win.emit('resize'); f.win.emit('resize'); assert.equal(f.frames.size, 1); f.flush(); assert.equal(f.reads, 0);
  f.page.classList.add('active'); f.observe(f.page); f.flush(); assert.equal(f.dock.menu.hidden, false);
});

test('a short viewport keeps the full grip and scrollable panel within the visible area', () => {
  const f = fixture({height: 220, width: 844}); f.dock.open(); f.flush();
  const grip = f.dock.trigger.getBoundingClientRect(); assert(grip.top >= 8); assert(grip.bottom <= 212);
  const panelTop = grip.top + parseFloat(f.panel.style.getPropertyValue('top'));
  assert(panelTop >= 8); assert(panelTop + f.panel.offsetHeight <= 212);
  f.body.scrollTop = 30; f.body.emit('scroll'); assert.equal(f.panel.dataset.scrollTop, 'true'); assert.equal(f.panel.dataset.scrollBottom, 'true');
});

test('boot, section navigation and the mobile menu cannot expose an orphaned editor', () => {
  for (const inline of [false, true]) for (const hiddenState of ['wf-booting', 'wf-section-mode', 'wf-mobile-menu-open']) {
    const f = fixture({inline}); f.dock.open();
    f.doc.documentElement.classList.add(hiddenState); f.observe(f.doc.documentElement); f.flush();
    assert.equal(f.dock.isOpen(), false, hiddenState); assert.equal(f.dock.menu.hidden, true, hiddenState);
    assert.equal(f.dock.open(), false, hiddenState);
    if (inline) assert.equal(f.panel.hidden, true, hiddenState);
  }
});

test('inline editing leaves the toolbar in the dashboard and creates only the original edge tab', () => {
  const f = fixture({inline: true}), {dock} = f;
  assert.equal(dock.menu.dataset.inline, 'true'); assert.equal(dock.menu.parentNode, f.doc.body);
  assert.deepEqual(dock.menu.children, [dock.trigger]); assert.deepEqual(f.page.children, [f.panel, f.layout]);
  assert.equal(f.panel.parentNode, f.page); assert.equal(f.panel.classList.contains('dash-dock-panel'), false);
  assert.equal(f.doc.getElementById('wfHomeDockBackdrop'), null);
  assert.deepEqual(f.created.map(element => element.tagName), ['DETAILS', 'SUMMARY']);
  assert.equal(f.panel.hidden, true); assert.equal(dock.trigger.getAttribute('aria-expanded'), 'false');
  dock.open(); dock.open(); f.flush();
  assert.equal(f.panel.hidden, false); assert.equal(dock.menu.open, true); assert.equal(dock.trigger.getAttribute('aria-expanded'), 'true');
  assert.deepEqual(f.events, [['open']]);
  f.win.visualViewport.height = 300; f.win.visualViewport.emit('resize'); f.flush();
  for (const property of ['left', 'top', 'max-width', 'max-height']) assert.equal(f.panel.style.getPropertyValue(property), '', property);
  assert.equal(f.panel.style.right, undefined); assert.equal(f.panel.style.bottom, undefined);
  assert.equal(f.panel.dataset.scrollTop, undefined); assert.equal(f.panel.dataset.scrollBottom, undefined);
  assert.equal(f.panel.parentNode, f.page); assert.deepEqual(f.page.children, [f.panel, f.layout]);
  dock.close(); assert.equal(f.panel.hidden, true); assert.equal(dock.menu.open, false);
  assert.equal(dock.trigger.getAttribute('aria-expanded'), 'false'); assert.deepEqual(f.events.at(-1), ['close', false]);
});

test('inline dashboard touches and repeated trigger clicks keep the draft open and refocus its title', () => {
  const f = fixture({inline: true}); f.dock.open();
  for (const target of [f.doc.body, f.layout, f.panel, f.body]) {
    const press = f.doc.emit('pointerdown', {target});
    assert.equal(press.defaultPrevented, undefined); assert.equal(f.dock.isOpen(), true);
  }
  for (const detail of [1, 0]) {
    const click = f.dock.trigger.emit('click', {detail});
    assert.equal(click.defaultPrevented, true); assert.equal(f.dock.isOpen(), true);
    assert.equal(f.dock.menu.open, true); assert.equal(f.panel.hidden, false); assert.equal(f.doc.activeElement, f.title);
  }
  assert.deepEqual(f.events, [['open']]);
});

test('Escape and dashboard navigation close inline editing through the cancellation callback', () => {
  const f = fixture({inline: true}); f.dock.open();
  const escape = f.doc.emit('keydown', {key: 'Escape'});
  assert.equal(escape.defaultPrevented, true); assert.equal(escape.stopped, true);
  assert.equal(f.dock.isOpen(), false); assert.equal(f.panel.hidden, true); assert.equal(f.doc.activeElement, f.dock.trigger);
  assert.deepEqual(f.events.at(-1), ['close', true]);
  f.dock.open(); f.page.classList.remove('active'); f.resetReads(); f.observe(f.page); f.flush();
  assert.equal(f.dock.isOpen(), false); assert.equal(f.panel.hidden, true); assert.equal(f.dock.menu.hidden, true);
  assert.deepEqual(f.events, [['open'], ['close', true], ['open'], ['close', false]]);
  assert.equal(f.reads, 0); assert.equal(f.dock.open(), false);
  f.page.classList.add('active'); f.observe(f.page); f.flush();
  assert.equal(f.dock.menu.hidden, false); assert.equal(f.panel.hidden, true); assert.equal(f.dock.isOpen(), false);
});

test('inline mode preserves the original tab shape, dimensions and stored viewport-safe position', () => {
  for (const options of [{saved: {x: 0, y: .25}, dir: 'rtl'}, {saved: {x: 1, y: .9}, dir: 'ltr', height: 220}]) {
    const legacy = fixture(options), f = fixture({...options, inline: true}); f.dock.open();
    assert.equal(f.dock.trigger.innerHTML, legacy.dock.trigger.innerHTML);
    assert.match(f.dock.trigger.innerHTML, /class="wf-dock-shape" viewBox="0 0 14 86"/);
    assert.equal(f.dock.trigger.offsetWidth, 14); assert.equal(f.dock.trigger.offsetHeight, 86);
    assert.equal(f.dock.menu.className, legacy.dock.menu.className); assert.equal(f.dock.menu.dataset.side, legacy.dock.menu.dataset.side);
    for (const property of ['left', 'top', '--wf-dock-left']) assert.equal(f.dock.menu.style.getPropertyValue(property), legacy.dock.menu.style.getPropertyValue(property), property);
    assert.equal(f.writes.length, 0);
  }
});

test('moving or cancelling the edge tab drag leaves the inline editing draft open', () => {
  const f = fixture({inline: true}), start = f.dock.trigger.getBoundingClientRect(); f.dock.open();
  f.pointer('pointerdown', 7, start.top + 20); f.pointer('pointermove', 387, start.top + 90); f.flush();
  assert.equal(f.dock.isOpen(), true); assert.equal(f.panel.hidden, false); assert.deepEqual(f.events, [['open']]);
  f.pointer('pointerup', 387, start.top + 90); f.flush();
  f.dock.trigger.emit('click', {detail: 1});
  assert.equal(f.dock.menu.dataset.side, 'right'); assert.equal(f.dock.isOpen(), true); assert.deepEqual(f.events, [['open']]);
  assert.equal(f.writes.length, 1); assert.equal(f.writes[0][0], 'wf.dashboard.dockPosition');
  const placed = f.dock.trigger.getBoundingClientRect();
  f.pointer('pointerdown', 383, placed.top + 20); f.pointer('pointermove', 7, 500); f.flush();
  f.pointer('pointercancel', 7, 500); f.flush();
  assert.equal(f.dock.menu.dataset.side, 'right'); assert.equal(f.dock.trigger.getBoundingClientRect().top, placed.top);
  assert.equal(f.dock.isOpen(), true); assert.equal(f.writes.length, 1); assert.deepEqual(f.events, [['open']]);
});
