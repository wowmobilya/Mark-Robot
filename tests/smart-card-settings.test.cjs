const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const {pages, normalize, persist, copy} = require('../smart-card-settings.js');

test('smart-card preferences default to the original five faces and manual playback', () => {
  const original = normalize();
  assert.deepEqual(original.order, pages);
  assert.deepEqual(original.visible, pages);
  assert.equal(original.initial, pages[4]);
  assert.equal(original.autoplay, false);
  assert.equal(normalize({}, true).autoplay, true);
  assert.equal(normalize({autoplay:false}, true).autoplay, false);
  for (const words of Object.values(copy)) assert.equal(words.filter(Boolean).length,5);
});

test('imported smart-card preferences keep a valid order, opening face and timing', () => {
  const pref = normalize({order:[pages[3],pages[3],'bad'],visible:[],initial:pages[1],interval:90,density:'bad'});
  assert.equal(pref.order.length,5);
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
