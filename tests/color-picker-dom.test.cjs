const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const read=name=>fs.readFileSync(path.resolve(__dirname,'..',name),'utf8');

// A deterministic DOM boundary: execute the actual picker and existing draft /
// storage handlers. Browser layout and top-layer behavior remain live UI checks.
function fixture(){
  const observers=[];
  class Event {
    constructor(type,options={}){this.type=type;Object.assign(this,options);this.defaultPrevented=false;}
    preventDefault(){this.defaultPrevented=true;}
    stopPropagation(){this.stopped=true;}
    stopImmediatePropagation(){this.stopped=true;this.immediate=true;}
  }
  class Style {
    constructor(){this.priorities=new Map();}
    setProperty(key,value,priority=''){this[key]=String(value);this.priorities.set(key,priority);}
    getPropertyValue(key){return this[key]||'';}
    getPropertyPriority(key){return this.priorities.get(key)||'';}
    removeProperty(key){delete this[key];this.priorities.delete(key);}
  }
  let doc;
  class Element {
    constructor(tag){this.tagName=tag.toUpperCase();this.nodeType=1;this.children=[];this.listeners=[];this.attributes=new Map();this.style=new Style();this.dataset={};this.className='';this.value='';this.hidden=false;this.disabled=false;this.open=false;}
    get classList(){const self=this;return {add(...values){self.className=[...new Set([...self.className.split(' ').filter(Boolean),...values])].join(' ');},contains(value){return self.className.split(' ').includes(value);}};}
    get parentElement(){return this.parentNode;}
    get childNodes(){return this.children;}
    get nextElementSibling(){const list=this.parentNode?.children||[];return list[list.indexOf(this)+1]||null;}
    get isConnected(){return this===doc||!!this.parentNode?.isConnected;}
    get options(){return this.children.filter(child=>child.tagName==='OPTION');}
    get labels(){return doc.querySelectorAll('label').filter(label=>label.htmlFor===this.id);}
    get control(){return this.tagName==='LABEL'?doc.getElementById(this.htmlFor):null;}
    setAttribute(key,value){this.attributes.set(key,String(value));if(['id','class','type'].includes(key))this[key==='class'?'className':key]=String(value);}
    getAttribute(key){return this.attributes.get(key)??null;}
    append(...nodes){for(const child of nodes){child.remove?.();this.children.push(child);child.parentNode=this;}}
    prepend(...nodes){for(const child of nodes.reverse()){child.remove?.();this.children.unshift(child);child.parentNode=this;}}
    before(child){const parent=this.parentNode;if(!parent)return;child.remove?.();parent.children.splice(parent.children.indexOf(this),0,child);child.parentNode=parent;}
    after(child){const parent=this.parentNode;if(!parent)return;child.remove?.();parent.children.splice(parent.children.indexOf(this)+1,0,child);child.parentNode=parent;}
    remove(){if(this.parentNode){const list=this.parentNode.children;list.splice(list.indexOf(this),1);this.parentNode=null;}}
    replaceChildren(...nodes){for(const child of this.children)child.parentNode=null;this.children=[];this.append(...nodes);}
    contains(child){for(let item=child;item;item=item.parentNode)if(item===this)return true;return false;}
    matches(selector){
      if(selector.startsWith('.'))return this.classList.contains(selector.slice(1));
      if(selector.startsWith('#'))return this.id===selector.slice(1);
      const match=/^(\w+)?\[([^=\]]+)(?:="([^"]*)")?\]$/.exec(selector);
      if(match)return(!match[1]||this.tagName===match[1].toUpperCase())&&(match[3]===undefined?this.attributes.has(match[2]):(this[match[2]]??this.getAttribute(match[2]))===match[3]);
      return this.tagName===selector.toUpperCase();
    }
    closest(selector){for(let item=this;item;item=item.parentNode)if(item.matches(selector))return item;return null;}
    querySelectorAll(selector){const out=[];for(const child of this.children){if(child.matches?.(selector))out.push(child);if(child.querySelectorAll)out.push(...child.querySelectorAll(selector));}return out;}
    querySelector(selector){return this.querySelectorAll(selector)[0]||null;}
    addEventListener(type,handler,capture=false){this.listeners.push({type,handler,capture:typeof capture==='object'?!!capture.capture:capture});}
    dispatchEvent(event){
      event.target??=this;const parents=[];for(let item=this.parentNode;item;item=item.parentNode)parents.push(item);
      const invoke=(element,capture)=>{for(const listener of element.listeners){if(listener.type===event.type&&listener.capture===capture){listener.handler.call(element,event);if(event.immediate)break;}}};
      for(const parent of [...parents].reverse()){invoke(parent,true);if(event.stopped)return!event.defaultPrevented;}
      invoke(this,true);if(!event.immediate)invoke(this,false);
      if(event.bubbles&&!event.stopped)for(const parent of parents){invoke(parent,false);if(event.stopped)break;}
      return!event.defaultPrevented;
    }
    click(){this.dispatchEvent(new Event('click',{bubbles:true,cancelable:true}));}
    focus(){doc.activeElement=this;}
    showModal(){this.open=true;}
    close(){if(!this.open)return;this.open=false;this.dispatchEvent(new Event('close'));}
    setPointerCapture(){}
    getBoundingClientRect(){return{left:0,top:0,width:200,height:100};}
  }
  doc=new Element('document');doc.nodeType=9;
  doc.createElement=tag=>new Element(tag);doc.getElementById=id=>doc.querySelector('#'+id);
  doc.documentElement=new Element('html');doc.documentElement.lang='ar';doc.documentElement.dir='rtl';doc.append(doc.documentElement);
  doc.body=new Element('body');doc.documentElement.append(doc.body);doc.activeElement=doc.body;
  const make=(tag,id,parent=doc.body)=>{const element=new Element(tag);element.id=id;parent.append(element);return element;};
  const parent=make('dialog','wfSettingsDialog'),company=make('dialog','wfCompanySectionDialog',parent);
  const panel=make('section','stab-company',company),identity=make('div','identity',panel);identity.className='wf-company-identity';
  const logo=make('div','settingsLogoPrev',identity),uploads=make('div','uploads',identity);make('button','upload',uploads).textContent='تحميل';
  const nameGroup=make('div','nameGroup',panel);nameGroup.className='fg';const name=make('input','stCompanyName',nameGroup);name.value='WOW Furniture';
  const tintLabel=make('label','tintLabel',parent);tintLabel.htmlFor='wfLogoTint';
  const mode=make('select','wfLogoTint',parent);for(const value of ['auto','brand','custom'])make('option','',mode).value=value;mode.value='auto';
  const tint=make('input','wfLogoColor',parent);tint.type='color';tint.value='#427a92';tint.hidden=true;
  const stored=new Map(),writes=[];
  const state={settings:{companyName:'WOW Furniture',branding:{logoBackground:'#ffffff',logoShape:'rounded',logoSize:'normal'},bankName:'Unrelated bank',taxNumber:'007'}};
  const window={document:doc,WFAppIdentity:{apply(){}},getComputedStyle:()=>({color:'rgb(63, 124, 148)'})};
  const context=vm.createContext({window,document:doc,S:state,Event,
    MutationObserver:class{constructor(callback){this.callback=callback;observers.push(this);}observe(target,options){this.target=target;this.options=options;}disconnect(){this.target=null;}},
    localStorage:{getItem:key=>stored.get(key)||null,setItem(key,value){stored.set(key,value);writes.push({key,value});}}});
  vm.runInContext(read('branding-settings.js'),context);
  const settings=read('settings-navigation.js');
  vm.runInContext(settings.slice(settings.lastIndexOf("(() => {\n  const mode = document.getElementById('wfLogoTint');")),context);
  vm.runInContext(read('color-picker.js'),context);
  parent.showModal();company.showModal();
  const byId=id=>doc.getElementById(id),dispatch=(element,type,extra={})=>element.dispatchEvent(new Event(type,{bubbles:true,...extra}));
  return{window,doc,byId,dispatch,state,stored,writes,parent,company,logo,mode,tint,
    choose(value){const input=byId('wfColorHex');input.value=value;dispatch(input,'input');},
    flush(target,attributeName){for(const observer of [...observers])if(observer.target===target)observer.callback([{type:'attributes',target,attributeName}]);},
    insert:make};
}

test('preview and Cancel run the real branding handler without changing its draft or dirty state',()=>{
  const f=fixture(),field=f.byId('wfCompanyLogoBackground'),button=f.byId('wfCompanyLogoBackgroundPicker');
  const before=JSON.stringify(f.window.WFCompanyBranding.snapshot());
  button.click();f.choose('#123456');
  assert.equal(f.byId('wfColorPickerDialog').open,true);assert.equal(f.logo.style.background,'#123456');
  assert.equal(field.value,'#ffffff');assert.equal(JSON.stringify(f.window.WFCompanyBranding.snapshot()),before);assert.equal(f.writes.length,0);
  f.doc.querySelector('.wf-color-cancel').click();
  assert.equal(f.logo.style.background,'#ffffff');assert.equal(JSON.stringify(f.window.WFCompanyBranding.snapshot()),before);
  assert.equal(f.parent.open,true);assert.equal(f.company.open,true);assert.equal(f.doc.activeElement,button);
});

test('Apply sends one input/change pair into the existing company draft and preserves all other fields',()=>{
  const f=fixture(),field=f.byId('wfCompanyLogoBackground'),events=[];
  for(const type of ['input','change'])field.addEventListener(type,()=>events.push(type));
  f.byId('wfCompanyLogoBackgroundPicker').click();f.choose('#abc');f.doc.querySelector('.wf-color-apply').click();
  assert.deepEqual(events,['input','change']);assert.equal(field.value,'#aabbcc');
  assert.equal(f.window.WFCompanyBranding.getDraft().logoBackground,'#aabbcc');assert.equal(f.window.WFCompanyBranding.snapshot().dirty,true);
  assert.equal(f.state.settings.branding.logoBackground,'#ffffff');assert.equal(f.state.settings.branding.logoShape,'rounded');
  assert.equal(f.state.settings.bankName,'Unrelated bank');assert.equal(f.state.settings.taxNumber,'007');assert.equal(f.writes.length,0);
  const opening=JSON.stringify(f.window.WFCompanyBranding.snapshot());
  f.byId('wfCompanyLogoBackgroundPicker').click();f.choose('#000000');f.doc.querySelector('.wf-color-cancel').click();
  assert.equal(JSON.stringify(f.window.WFCompanyBranding.snapshot()),opening);assert.equal(f.logo.style.background,'#aabbcc');
});

test('the actual immediately saved logo-tint handler receives no preview events and persists only Apply',()=>{
  const f=fixture();f.mode.value='custom';f.dispatch(f.mode,'change');f.flush(f.tint,'hidden');f.writes.length=0;
  const original=f.stored.get('wfLogoCard');f.byId('wfLogoColorPicker').click();f.choose('#112233');
  assert.equal(f.writes.length,0);assert.equal(f.stored.get('wfLogoCard'),original);
  f.doc.querySelector('.wf-color-cancel').click();assert.equal(f.tint.value,'#427a92');assert.equal(f.writes.length,0);
  f.byId('wfLogoColorPicker').click();f.choose('#112233');f.doc.querySelector('.wf-color-apply').click();
  assert.equal(f.writes.length,1);assert.deepEqual(JSON.parse(f.stored.get('wfLogoCard')),{mode:'custom',color:'#112233'});
  assert.equal(f.doc.documentElement.style.getPropertyValue('--wf-card-tint'),'#112233');
  f.mode.value='auto';f.dispatch(f.mode,'change');f.flush(f.tint,'hidden');assert.equal(f.byId('wfLogoColorPicker').hidden,true);
});

test('invalid HEX cannot apply, plane keyboard and pointer controls remain local, and Escape restores',()=>{
  const f=fixture();f.byId('wfCompanyLogoBackgroundPicker').click();f.choose('#12');
  assert.equal(f.doc.querySelector('.wf-color-apply').disabled,true);assert.equal(f.byId('wfColorHex').getAttribute('aria-invalid'),'true');
  f.doc.querySelector('.wf-color-apply').click();assert.equal(f.byId('wfColorPickerDialog').open,true);
  f.choose('#3f7c94');const before=f.byId('wfColorHex').value;
  f.dispatch(f.byId('wfColorPlane'),'keydown',{key:'ArrowDown',shiftKey:true});assert.notEqual(f.byId('wfColorHex').value,before);
  f.dispatch(f.byId('wfColorPlane'),'pointerdown',{button:0,pointerId:1,clientX:50,clientY:20});
  assert.equal(f.byId('wfColorSaturation').value,25);assert.equal(f.byId('wfColorBrightness').value,80);
  f.dispatch(f.byId('wfColorPickerDialog'),'cancel',{cancelable:true});
  assert.equal(f.byId('wfColorPickerDialog').open,false);assert.equal(f.window.WFCompanyBranding.snapshot().dirty,false);
});

test('native input clicks are intercepted and closing a parent cancels the active preview',()=>{
  const f=fixture(),field=f.byId('wfCompanyLogoBackground');
  assert.equal(f.dispatch(field,'click',{cancelable:true}),false,'preventDefault blocks the OS picker');
  assert.equal(f.byId('wfColorPickerDialog').open,true);f.choose('#112233');f.company.close();
  assert.equal(f.byId('wfColorPickerDialog').open,false);assert.equal(f.logo.style.background,'#ffffff');assert.equal(f.parent.open,true);
});

test('all five interface languages translate the reusable picker and theme swatches use the app accent',()=>{
  const f=fixture();
  for(const [language,title]of [['ar','اختيار اللون'],['en','Choose a color'],['tr','Renk seçin'],['fr','Choisir une couleur'],['ru','Выберите цвет']]){
    f.doc.documentElement.lang=language;f.flush(f.doc.documentElement,'lang');
    f.byId('wfCompanyLogoBackgroundPicker').click();assert.equal(f.byId('wfColorPickerTitle').textContent,title);
    assert.equal(f.doc.querySelector('.wf-color-palette').children[0].dataset.color,'#3f7c94');f.window.WFColorPicker.close();
  }
});

test('changing language cannot turn an invalid unfinished HEX value into an applicable choice',()=>{
  const f=fixture();f.byId('wfCompanyLogoBackgroundPicker').click();f.choose('#12');
  f.doc.documentElement.lang='tr';f.flush(f.doc.documentElement,'lang');
  assert.equal(f.byId('wfColorHex').value,'#12');assert.equal(f.doc.querySelector('.wf-color-apply').disabled,true);
  assert.equal(f.byId('wfColorError').hidden,false);f.window.WFColorPicker.close();
});
