const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const {pages, normalize, persist, copy} = require('../smart-card-settings.js');

test('smart-card preferences default to six faces and manual playback', () => {
  const original = normalize();
  assert.deepEqual(original.order, pages);
  assert.deepEqual(original.visible, pages);
  assert.equal(original.initial, pages[4]);
  assert.equal(original.autoplay, false);
  const oldPages=pages.slice(0,-1);
  assert.deepEqual(normalize({visible:oldPages,order:oldPages}).visible,pages);
  assert.deepEqual(normalize({visible:[pages[4]],order:oldPages}).visible,[pages[4]]);
  assert.equal(normalize({}, true).autoplay, true);
  assert.equal(normalize({autoplay:false}, true).autoplay, false);
  for (const words of Object.values(copy)) assert.equal(words.filter(Boolean).length,5);
});

test('imported smart-card preferences keep a valid order, opening face and timing', () => {
  const pref = normalize({order:[pages[3],pages[3],'bad'],visible:[],initial:pages[1],interval:90,density:'bad'});
  assert.equal(pref.order.length,6);
  assert.deepEqual(pref.visible,[pages[3]]);
  assert.equal(pref.initial,pages[3]);
  assert.equal(pref.interval,30);
  assert.equal(pref.density,'normal');
  assert.equal(normalize({interval:-1}).interval,5);
  assert.equal(normalize({interval:Infinity}).interval,10);
  assert.deepEqual(normalize(pref),pref);
});

test('saving merges just edited fields into the current database row and leaves other live editors intact',async()=>{
  const state={settings:{companyName:'live edit',logo:'hydrated',smartCard:normalize()}};
  const original={id:'main',companyName:'stored',logo:{mediaId:'123'},smartCard:{interval:27,density:'comfortable'}};
  const write=async ([op])=>{
    assert.deepEqual([op.type,op.store,op.id],['merge','settings','main']);
    const merged=op.merge(original,op.value);
    assert.equal(merged.logo,original.logo);
    return [merged];
  };
  await persist(state,{autoplay:true},false,write,async card=>card);
  assert.equal(state.settings.smartCard.interval,27);
  assert.equal(state.settings.smartCard.density,'comfortable');
  assert.equal(state.settings.smartCard.autoplay,true);
  assert.equal(state.settings.companyName,'live edit');
  assert.equal(state.settings.logo,'hydrated');
  const saved=state.settings.smartCard;
  await assert.rejects(persist(state,{density:'normal'},false,async()=>{throw Error('aborted');},()=>{}));
  assert.equal(state.settings.smartCard,saved);
});

function settingsFixture() {
  const nodes=[],published=[],notifications=[];let stored={id:'main',companyName:'Keep company',smartCard:normalize()},barrier,failWrite=false;
  class Element {
    constructor(tag='div') { this.tagName=tag.toUpperCase();this.children=[];this.events={};this.dataset={};this.style={};this.attrs={};this.disabled=false;this.hidden=false;this.value='';this.classes=new Set();this.classList={contains:key=>this.classes.has(key),add:key=>this.classes.add(key),remove:key=>this.classes.delete(key)};nodes.push(this); }
    append(...values) { for(const child of values){child.remove?.();this.children.push(child);child.parentNode=this;} }
    remove() { if(this.parentNode){const siblings=this.parentNode.children;siblings.splice(siblings.indexOf(this),1);this.parentNode=null;} }
    insertBefore(child,before) { child.remove();const at=this.children.indexOf(before);this.children.splice(at<0?this.children.length:at,0,child);child.parentNode=this; }
    replaceChildren(...values) { for(const child of this.children)child.parentNode=null;this.children=[];this.append(...values); }
    contains(child) { for(let node=child;node;node=node.parentNode)if(node===this)return true;return false; }
    setAttribute(key,value) { this.attrs[key]=String(value); }
    getAttribute(key) { return this.attrs[key]??null; }
    querySelector(selector) { return this.map?.[selector]||null; }
    addEventListener(type,callback) { (this.events[type]??=[]).push(callback); }
    dispatchEvent(event) { this['on'+event.type]?.(event);return Promise.all((this.events[event.type]||[]).map(callback=>callback(event))); }
    click() { for(let node=this;node;node=node.parentNode)if(node.disabled&&(node===this||node.tagName==='FIELDSET'))return Promise.resolve();return this.dispatchEvent({type:'click',target:this}); }
    close() { if(this.open){this.open=false;this.dispatchEvent({type:'close'});} }
    focus() { document.activeElement=this; }
    get options() { return this.children; }
  }
  const document=new Element('document'),window=new Element('window'),root=new Element('html');root.lang='en';document.documentElement=root;document.activeElement=root;
  const page=new Element('section');page.id='page-settings';page.classes.add('active');
  const workspace=new Element(),tabs=new Element(),content=new Element();page.map={'.wf-settings-workspace':workspace};workspace.map={'.tabs':tabs,'.wf-settings-content':content};page.append(workspace);workspace.append(tabs,content);
  const dialog=new Element('dialog');dialog.id='wfSettingsDialog';dialog.open=true;page.append(dialog);
  document.getElementById=id=>nodes.find(node=>node.id===id)||null;document.createElement=tag=>new Element(tag);
  window.switchTab=()=>{};window.updateDash=()=>{};window.showToast=()=>{};
  window.addEventListener('wf-smart-card-change',event=>published.push(event.detail.prefs));
  window.addEventListener('wf-settings-actions-change',event=>notifications.push(event.type));
  const state={settings:structuredClone(stored)};
  class CustomEvent { constructor(type,options={}){this.type=type;this.detail=options.detail;} }
  vm.runInNewContext(fs.readFileSync(require.resolve('../smart-card-settings.js'),'utf8'),{
    window,document,S:state,CustomEvent,Intl,localStorage:{getItem:()=>null},MutationObserver:class{observe(){}},
    wfWriteBatch:async([operation])=>{await barrier;if(failWrite)throw Error('Storage full');stored=operation.merge(stored,operation.value);return[stored];},wfHydrateDBValue:async value=>value
  });
  document.dispatchEvent({type:'DOMContentLoaded'});
  return {nodes,page,dialog,window,state,published,notifications,
    get stored(){return stored;},set failWrite(value){failWrite=value;},
    blockWrite(){barrier=new Promise(resolve=>{this.releaseWrite=()=>{barrier=null;resolve();};});}};
}

test('smart-card actions detect reorder changes and Cancel restores the saved live preview',async()=>{
  const f=settingsFixture(),api=f.window.WFSmartCardSettings;
  assert.equal(typeof api.getSettingsActions,'function');assert.equal(api.getSettingsActions(),null);
  f.window.switchTab('smart-card');let actions=api.getSettingsActions();
  assert.equal(actions.key,'smart-card');assert.equal(actions.scope.id,'stab-smart-card');assert.equal(actions.dirty,false);
  const firstRow=f.nodes.find(node=>node.dataset.page==='greetingCard');
  firstRow.children[2].onclick();assert.equal(api.getSettingsActions().dirty,true);
  firstRow.children[1].onclick();assert.equal(api.getSettingsActions().dirty,false);
  firstRow.children[2].onclick();assert.equal(f.published.at(-1).order[0],'tipCardStandalone');
  await actions.cancel.click();assert.equal(api.getSettingsActions(),null);assert.equal(f.dialog.open,false);
  assert.equal(f.published.at(-1).order[0],'greetingCard');assert.equal(f.state.settings.smartCard.order[0],'greetingCard');
  assert(f.notifications.length>0);
});

test('smart-card pending and failed saves retain their own dirty state and original controls',async()=>{
  const f=settingsFixture(),api=f.window.WFSmartCardSettings;
  assert.equal(typeof api.getSettingsActions,'function');f.window.switchTab('smart-card');
  const firstRow=f.nodes.find(node=>node.dataset.page==='greetingCard');firstRow.children[2].onclick();
  f.blockWrite();f.failWrite=true;const actions=api.getSettingsActions(),saving=actions.save.click();
  assert.equal(api.getSettingsActions().busy,true);await actions.cancel.click();assert.equal(f.dialog.open,true);
  f.releaseWrite();await saving;
  assert.equal(api.getSettingsActions().busy,false);assert.equal(api.getSettingsActions().dirty,true);
  assert.equal(f.state.settings.smartCard.order[0],'greetingCard');assert(f.nodes.find(node=>node.className==='wf-smart-settings-status').textContent);
  f.failWrite=false;await api.getSettingsActions().save.click();
  assert.equal(api.getSettingsActions(),null);assert.equal(f.state.settings.smartCard.order[0],'tipCardStandalone');assert.equal(f.stored.companyName,'Keep company');
});

test('the live carousel uses configured visibility, order, keyboard controls, and rotation time without detaching the robot',()=>{
  class Node extends EventTarget {
    constructor(id='') {
      super(); this.id=id; this.style={setProperty(){}}; this.dataset={}; this.children=[];
      this.classList={contains:key=>key==='active'}; this.attrs={};
    }
    append(...children){this.children.push(...children);}
    replaceChildren(...children){this.children=children;}
    setAttribute(k,v){this.attrs[k]=v;}
    removeAttribute(k){delete this.attrs[k];}
    querySelector(){return null;}
    querySelectorAll(){return [];}
    matches(){return false;}
  }
  const document=new Node(), window=new Node(), card=new Node(), dashboard=new Node(), track=new Node();
  const byId=new Map([...pages,'wfWeatherTitle','wfWeatherStatus','wfWeatherTemp','wfWeatherDays','wfGreetingLogoTitle','wfGreetingLogoImage'].map(id=>[id,new Node(id)]));
  track.children=pages.map(id=>byId.get(id));
  card.closest=selector=>selector==='.page'?dashboard:null; card.querySelector=()=>track;
  document.documentElement=new Node(); document.documentElement.lang='en';
  document.getElementById=id=>byId.get(id); document.querySelector=sel=>sel==='.wf-greeting-flip'?card:null;
  document.createElement=()=>new Node(); document.createTextNode=()=>new Node();
  const delays=[]; const localStorage={getItem:()=>null};
  const prefs=normalize({order:[pages[3],pages[0]],visible:[pages[0],pages[3]],initial:pages[3],autoplay:true,interval:23});
  let toggled; window.WFSmartCardSettings={current:()=>prefs,setAutoplay:v=>{toggled=v;}};
  const source=fs.readFileSync(require.resolve('../greeting-carousel.js'),'utf8').split('// Visibility choices')[0];
  vm.runInNewContext(source,{document,window,localStorage,Intl,matchMedia:()=>new Node(),
    MutationObserver:class {observe(){}},setTimeout:(_fn,ms)=>{delays.push(ms);},clearTimeout(){}});
  const pager=card.children[0], robot=byId.get(pages[4]);
  assert.equal(card.dataset.smartFace,pages[3]); assert.equal(robot.inert,true);
  assert.ok(track.children.includes(robot)); assert.equal(delays.at(-1),23000);
  assert.deepEqual(pager.children.slice(0,-1).map(node=>node.attrs['aria-controls']),[pages[3],pages[0]]);
  card.dispatchEvent(Object.assign(new Event('keydown'),{key:'End'}));
  assert.equal(card.dataset.smartFace,pages[0]); assert.equal(toggled,false);
  window.dispatchEvent(Object.assign(new Event('wf-smart-card-change'),{detail:{prefs:normalize({visible:[pages[4]]}),resetFace:true}}));
  assert.equal(robot.inert,false); assert.equal(card.dataset.smartFace,pages[4]); assert.equal(pager.hidden,true);
});
