const {test}=require('node:test');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const core=fs.existsSync(path.join(root,'touch-keyboard.js'))?require('../touch-keyboard.js'):{};
test('editing core replaces only the selected range and removes complete graphemes',()=>{
  assert.equal(typeof core.editText,'function');
  assert.deepEqual(core.editText({value:'ab😀cd',start:2,end:4},'insert','x'),{value:'abxcd',start:3,end:3,inputType:'insertText',data:'x'});
  assert.deepEqual(core.editText({value:'Ae\u0301B',start:3,end:3},'backspace'),{value:'AB',start:1,end:1,inputType:'deleteContentBackward',data:null});
  assert.equal(core.editText({value:'👨‍👩‍👧‍👦!',start:11,end:11},'backspace').value,'!');
  assert.equal(core.editText({value:'abcd',start:1,end:3},'delete').value,'ad');
});
test('editing core honors selection and maxlength without splitting a surrogate',()=>{
  assert.equal(typeof core.editText,'function');
  assert.equal(core.editText({value:'abc',start:3,end:3},'insert','😀',4).value,'abc');
  assert.equal(core.editText({value:'abcdef',start:2,end:5},'insert','XY',6).value,'abXYf');
  assert.equal(core.editText({value:'abc',start:3,end:3},'insert','\ntext').value,'abc\ntext');
});
test('editing core normalizes localized numbers and separates unfinished drafts from publishable values',()=>{
  assert.equal(typeof core.normalizeNumber,'function');
  assert.equal(core.normalizeNumber(' ١٢٫٧٥ '),'12.75');assert.equal(core.normalizeNumber('۳,۵'),'3.5');
  assert.equal(core.numberValue('-'),null);assert.equal(core.numberValue('.'),null);assert.equal(core.numberValue('-.'),null);
  assert.equal(core.numberValue('12.'),'12');assert.equal(core.numberValue('-2.5'),'-2.5');assert.equal(core.numberValue(''),'');
  assert.equal(core.numberValue('1e'),null);assert.equal(core.numberValue('1e3'),'1e3');assert.equal(core.numberValue('Infinity'),null);assert.equal(core.numberValue('1.2.3'),null);
});

// A small DOM boundary runs the production module and real draft listeners in
// Node. It does not simulate rendering or OS-keyboard visibility; those checks
// live in touch-keyboard.browser.cjs and the managed-preview smoke test.
function domFixture({touch=true,lang='en',pickers=false}={}){
  const observers=[],frames=[];let doc;
  class Event {
    constructor(type,options={}){this.type=type;Object.assign(this,options);this.defaultPrevented=false;}
    preventDefault(){if(this.cancelable)this.defaultPrevented=true;}
    stopPropagation(){this.stopped=true;}
    stopImmediatePropagation(){this.immediate=true;this.stopped=true;}
  }
  class Element {
    constructor(tag){this.nodeType=1;this.tagName=tag.toUpperCase();this.children=[];this.attributes=new Map();this.listeners=[];this.style={};this.className='';this.id='';this.name='';this.type=this.tagName==='INPUT'?'text':'';this.inputMode='';this._value='';this.hidden=false;this.readOnly=false;this.disabled=false;this.open=false;this.maxLength=-1;this.selectionStart=0;this.selectionEnd=0;
      this.dataset=new Proxy({}, {set:(target,key,value)=>{target[key]=String(value);this.attributes.set('data-'+key.replace(/[A-Z]/g,c=>'-'+c.toLowerCase()),String(value));return true;}});
    }
    get value(){return this._value;}
    set value(value){value=String(value);this._value=this.type==='number'&&value!==''&&!/^-?(?:\d+(?:\.\d+)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(value)?'':value;}
    get parentElement(){return this.parentNode;}
    get isConnected(){return this===doc||!!this.parentNode?.isConnected;}
    get labels(){return doc.querySelectorAll('label').filter(label=>label.control===this);}
    get control(){return this.tagName==='LABEL'?(doc.getElementById(this.htmlFor)||this.querySelector('input,textarea')):null;}
    get classList(){const self=this;return {add(...items){self.className=[...new Set([...self.className.split(' ').filter(Boolean),...items])].join(' ');},remove(...items){self.className=self.className.split(' ').filter(x=>!items.includes(x)).join(' ');},contains(item){return self.className.split(' ').includes(item);}};}
    setAttribute(name,value){this.attributes.set(name,String(value));if(['id','type','name','dir','title'].includes(name))this[name]=String(value);if(name==='class')this.className=String(value);if(name==='inputmode')this.inputMode=String(value);if(name==='readonly')this.readOnly=true;if(name==='hidden')this.hidden=true;if(name==='disabled')this.disabled=true;}
    getAttribute(name){if(name==='id')return this.id||null;if(name==='type')return this.type||null;if(name==='readonly')return this.readOnly?'':null;if(name==='hidden')return this.hidden?'':null;if(name==='disabled')return this.disabled?'':null;if(name==='open')return this.open?'':null;return this.attributes.get(name)??null;}
    removeAttribute(name){this.attributes.delete(name);if(name==='readonly')this.readOnly=false;if(name==='hidden')this.hidden=false;if(name==='disabled')this.disabled=false;}
    append(...nodes){for(const child of nodes){child.remove();this.children.push(child);child.parentNode=this;}}
    remove(){if(this.parentNode){const siblings=this.parentNode.children;siblings.splice(siblings.indexOf(this),1);this.parentNode=null;}}
    replaceChildren(...nodes){for(const child of this.children)child.parentNode=null;this.children=[];this.append(...nodes);}
    replaceWith(node){const parent=this.parentNode;if(!parent)return;const index=parent.children.indexOf(this);node.remove();parent.children[index]=node;node.parentNode=parent;this.parentNode=null;}
    contains(node){for(let current=node;current;current=current.parentNode)if(current===this)return true;return false;}
    matches(selector){
      if(selector.includes(','))return selector.split(',').some(s=>this.matches(s.trim()));
      if(selector===':disabled')return this.disabled||!!this.parentElement?.closest('fieldset[disabled]');
      const not=selector.match(/^(.+):not\((.+)\)$/);if(not)return this.matches(not[1])&&!this.matches(not[2]);
      if(selector[0]==='#')return this.id===selector.slice(1);if(selector[0]==='.')return this.classList.contains(selector.slice(1));
      const attribute=/^(\w+)?\[([^=\]]+)(?:="([^"]*)")?\]$/.exec(selector);
      if(attribute)return(!attribute[1]||this.tagName===attribute[1].toUpperCase())&&(attribute[3]===undefined?this.getAttribute(attribute[2])!==null:this.getAttribute(attribute[2])===attribute[3]);
      return this.tagName===selector.toUpperCase();
    }
    closest(selector){for(let current=this;current;current=current.parentNode)if(current.matches(selector))return current;return null;}
    querySelectorAll(selector){const result=[];for(const child of this.children){if(child.matches(selector))result.push(child);result.push(...child.querySelectorAll(selector));}return result;}
    querySelector(selector){return this.querySelectorAll(selector)[0]||null;}
    addEventListener(type,handler,options=false){this.listeners.push({type,handler,capture:typeof options==='object'?!!options.capture:options});}
    dispatchEvent(event){
      event.target??=this;const parents=[];for(let node=this.parentNode;node;node=node.parentNode)parents.push(node);
      const invoke=(node,capture)=>{for(const listener of node.listeners){if(listener.type===event.type&&listener.capture===capture){listener.handler.call(node,event);if(event.immediate)break;}}if(!capture&&!event.immediate&&typeof node['on'+event.type]==='function')node['on'+event.type](event);};
      for(const parent of [...parents].reverse()){invoke(parent,true);if(event.stopped)return!event.defaultPrevented;}
      invoke(this,true);if(!event.immediate)invoke(this,false);
      if(event.bubbles&&!event.stopped)for(const parent of parents){invoke(parent,false);if(event.stopped)break;}
      return!event.defaultPrevented;
    }
    click(){return this.dispatchEvent(new Event('click',{bubbles:true,cancelable:true}));}
    focus(){if(doc.activeElement===this)return;doc.activeElement?.blur();doc.activeElement=this;this.dispatchEvent(new Event('focusin',{bubbles:true}));}
    blur(){if(doc.activeElement!==this)return;doc.activeElement=doc.body;this.dispatchEvent(new Event('blur'));this.dispatchEvent(new Event('focusout',{bubbles:true}));}
    setSelectionRange(start,end){this.selectionStart=start;this.selectionEnd=end;}
    select(){this.setSelectionRange(0,this.value.length);}
    showModal(){this.open=true;this.querySelector('button')?.focus();}
    close(){this.open=false;this.dispatchEvent(new Event('close'));}
    getClientRects(){return this.isConnected&&!this.closest('[hidden],dialog:not([open])')?[{width:300,height:44}]:[];}
    getBoundingClientRect(){return{left:0,top:0,right:800,bottom:600};}
  }
  doc=new Element('document');doc.nodeType=9;doc.createElement=tag=>new Element(tag);doc.getElementById=id=>doc.querySelector('#'+id);
  doc.documentElement=new Element('html');doc.documentElement.lang=lang;doc.append(doc.documentElement);doc.body=new Element('body');doc.documentElement.append(doc.body);doc.activeElement=doc.body;
  const make=(tag,id,parent=doc.body)=>{const node=new Element(tag);node.id=id||'';parent.append(node);return node;};
  const scope=make('section','workspace'),name=make('input','name',scope),other=make('input','other',scope);name.value='draft';other.value='untouched';
  if(pickers){make('input','prHsCode',scope);make('input','prDesc',scope);}
  const window={document:doc,navigator:{maxTouchPoints:touch?5:0},matchMedia:()=>({matches:false}),PointerEvent:Event,addEventListener(){},getComputedStyle:()=>({visibility:'visible',display:'block'}),localStorage:{getItem(){return null;},setItem(){}},qblEnableSound(){},qblStopCamera(){}};
  const context=vm.createContext({window,document:doc,Intl,Event,InputEvent:Event,FocusEvent:Event,KeyboardEvent:Event,
    MutationObserver:class{constructor(callback){this.callback=callback;this.targets=[];observers.push(this);}observe(target,options){this.targets.push({target,options});}disconnect(){this.targets=[];}},
    requestAnimationFrame(callback){frames.push(callback);return frames.length;},cancelAnimationFrame(){},setTimeout,clearTimeout,setInterval,clearInterval});
  vm.runInContext(fs.readFileSync(path.join(root,'touch-keyboard.js'),'utf8'),context);
  const api=window.WFTouchKeyboard,events=[];
  for(const type of ['input','change'])scope.addEventListener(type,event=>events.push([event.target.id,type,event.target.value]));
  const byId=id=>doc.getElementById(id),dispatch=(node,type,props={})=>node.dispatchEvent(new Event(type,{bubbles:true,cancelable:true,...props}));
  return {doc,window,api,scope,name,other,make,byId,dispatch,events,
    tap(field){dispatch(field,'pointerdown',{pointerType:touch?'touch':'mouse',pointerId:1,button:0,clientX:20,clientY:50});dispatch(field,'pointerup',{pointerType:touch?'touch':'mouse',pointerId:1,button:0,clientX:20,clientY:50});return dispatch(field,'click',{detail:1});},
    action(action){byId('wfTouchKeyboard').querySelector('[data-action="'+action+'"]').click();},
    key(value){const node=byId('wfTouchKeyboard').querySelectorAll('[data-key]').find(node=>node.dataset.key===value);assert(node,'key '+value+' is present');node.click();},
    select(start,end=start){byId('wfTouchKeyboardEditor').setSelectionRange(start,end);},
    paste(value){dispatch(byId('wfTouchKeyboardEditor'),'paste',{clipboardData:{getData(){return value;}}});},
    flush(target,attributeName='hidden'){for(const observer of [...observers])if(observer.targets.some(item=>item.target===target&&item.options.attributes))observer.callback([{type:'attributes',target,attributeName}]);},
    frames(){for(const callback of frames.splice(0))callback();}
  };
}

test('DOM: touch interception keeps originals editable and uses a readonly mirror; non-touch desktop is untouched',()=>{
  const desktop=domFixture({touch:false});assert.equal(desktop.tap(desktop.name),true);assert.equal(desktop.api.isOpen,false);assert.equal(desktop.name.readOnly,false);
  const f=domFixture();assert.equal(f.tap(f.name),false);assert.equal(f.api.isOpen,true);assert.equal(f.name.readOnly,false);
  assert.equal(f.byId('wfTouchKeyboardEditor').readOnly,true);assert.equal(f.byId('wfTouchKeyboardEditor').getAttribute('inputmode'),'none');
  f.key('x');assert.equal(f.name.value,'draftx');assert.equal(f.other.value,'untouched');assert.deepEqual(f.events,[['name','input','draftx']]);
  f.action('done');assert.deepEqual(f.events,[['name','input','draftx'],['name','change','draftx']]);assert.equal(f.api.isOpen,false);f.frames();assert.equal(f.api.isOpen,false);
});

test('DOM: numeric keypad preserves partial decimals, localized paste and the source input handlers',()=>{
  const f=domFixture(),amount=f.make('input','amount',f.scope);amount.type='number';amount.value='12.5';f.tap(amount);f.action('select');f.key('-');assert.equal(amount.value,'12.5');
  f.key('2');f.key('.');assert.equal(f.byId('wfTouchKeyboardEditor').value,'-2.');assert.equal(amount.value,'-2');f.key('5');assert.equal(amount.value,'-2.5');
  f.action('select');f.paste('١٢٫٧٥');assert.equal(amount.value,'12.75');f.key('.');assert.equal(amount.value,'12.75');f.action('done');
  assert.deepEqual(f.events.filter(row=>row[1]==='change'),[['amount','change','12.75']]);
});

test('DOM: the app currency text field uses numbers and preserves its existing decimal validator',()=>{
  const f=domFixture(),amount=f.make('input','ccInput',f.scope);let latest='';amount.oninput=()=>{if(/^\d*(\.\d*)?$/.test(amount.value))latest=amount.value;amount.value=latest;};
  f.tap(amount);f.key('1');f.key('2');f.key('.');assert.equal(f.byId('wfTouchKeyboardEditor').value,'12.');f.key('5');assert.equal(amount.value,'12.5');
  f.action('select');f.key('-');f.key('2');assert.equal(amount.value,'12.5');assert.equal(f.byId('wfTouchKeyboardEditor').value,'12.5','rejected values follow the app validator');
});

test('DOM: native pickers, disabled/read-only data and custom HS/description choosers are not intercepted',()=>{
  const f=domFixture({pickers:true});
  for(const type of ['file','date','color','range','checkbox']){const field=f.make('input',type,f.scope);field.type=type;assert.equal(f.tap(field),true);}
  const readonly=f.make('input','readonly',f.scope);readonly.readOnly=true;assert.equal(f.tap(readonly),true);
  const group=f.make('fieldset','locked',f.scope);group.disabled=true;assert.equal(f.tap(f.make('input','disabled',group)),true);
  const chooser=f.byId('prDesc');chooser.dataset.val='SET';chooser.value='Set';let opened=0;chooser.onclick=()=>opened++;
  assert.equal(f.tap(chooser),true);assert.equal(opened,1);assert.equal(f.api.isOpen,false);assert.equal(chooser.dataset.val,'SET');
  const custom=f.make('input','',f.scope);custom.oninput=()=>chooser.value=custom.value;f.tap(custom);f.key('x');assert.equal(chooser.value,'x');
});

test('DOM: existing normalization and beforeinput cancellation control the final text',()=>{
  const f=domFixture();f.name.value='';f.name.addEventListener('beforeinput',event=>{if(event.data==='x')event.preventDefault();});f.name.oninput=()=>f.name.value=f.name.value.toUpperCase();f.tap(f.name);
  f.key('x');assert.equal(f.name.value,'');f.key('a');assert.equal(f.name.value,'A');assert.equal(f.byId('wfTouchKeyboardEditor').value,'A');
  f.action('undo');assert.equal(f.name.value,'');f.action('done');assert.deepEqual(f.events.filter(row=>row[1]==='change'),[],'editing back to the original has no change event');
});

test('DOM: dynamic row replacement rebinds safely, and Next commits before editing the following field',()=>{
  const f=domFixture();let current=f.name;
  const listen=field=>field.oninput=()=>{const replacement=f.make('input','name',f.scope);replacement.value=field.value;listen(replacement);field.replaceWith(replacement);current=replacement;};listen(current);
  f.tap(current);f.key('a');f.key('b');assert.equal(current.value,'draftab');f.action('next');assert.equal(f.api.activeField,f.other);
  f.action('select');f.key('z');f.action('done');assert.equal(f.other.value,'z');assert.deepEqual(f.events.filter(row=>row[1]==='change'),[['name','change','draftab'],['other','change','z']]);
});

test('DOM: all five layouts and Turkish shift work without changing the interface language',()=>{
  const f=domFixture();f.tap(f.name);f.action('clear');
  for(const [language,char]of [['ar','ض'],['tr','ğ'],['en','q'],['fr','é'],['ru','й']]){f.byId('wfTouchKeyboard').querySelector('[data-language="'+language+'"]').click();f.key(char);}
  assert.equal(f.name.value,'ضğqéй');f.byId('wfTouchKeyboard').querySelector('[data-language="tr"]').click();f.action('shift');f.key('İ');assert.equal(f.name.value,'ضğqéйİ');assert.equal(f.doc.documentElement.lang,'en');
  f.doc.documentElement.lang='fr';f.flush(f.doc.documentElement,'lang');assert.equal(f.name.value,'ضğqéйİ');assert.equal(f.byId('wfTouchKeyboardTitle').textContent,'Clavier');
});

test('DOM: multiline Enter, password masking, max length and blur-only commits preserve field semantics',()=>{
  const f=domFixture(),notes=f.make('textarea','notes',f.scope);notes.value='first';f.tap(notes);f.action('enter');f.key('a');assert.equal(notes.value,'first\na');f.action('done');
  const password=f.make('input','password',f.scope);password.type='password';password.maxLength=4;f.tap(password);assert.equal(f.byId('wfTouchKeyboardEditor').type,'password');f.paste('abc😀');assert.equal(password.value,'abc');f.key('x');f.key('y');assert.equal(password.value,'abcx');
  let saved;password.onblur=()=>saved=password.value;f.action('done');assert.equal(saved,'abcx');
});

test('DOM: Search commits before its action and navigation closes a draft exactly once',()=>{
  const f=domFixture(),field=f.make('input','lookup',f.scope),calls=[];field.type='search';f.api.register('lookup',{onOpen(){calls.push('open');},onClose({reason}){calls.push(reason);},onSubmit(input){calls.push(input.value);}});
  f.tap(field);f.key('q');f.action('done');assert.deepEqual(calls,['open','submit','q']);
  f.tap(f.name);f.key('x');f.scope.hidden=true;f.flush(f.scope);assert.equal(f.api.isOpen,false);assert.equal(f.name.value,'draftx');assert.deepEqual(f.events.filter(row=>row[0]==='name'&&row[1]==='change'),[['name','change','draftx']]);
});

test('DOM: the actual barcode formatter keeps the caret after its inserted space',()=>{
  const f=domFixture(),field=f.make('input','qblInput',f.scope);
  const html=fs.readFileSync(path.join(root,'index.html'),'utf8'),start=html.lastIndexOf('function onQblInput()'),end=html.indexOf('function qblPickFromDropdown',start);
  const context=vm.createContext({document:f.doc,QBL:{phase:1},qblDropdownOpen:false});vm.runInContext(html.slice(start,end),context);field.oninput=context.onQblInput;
  f.tap(field);for(const character of ['k','4','0','0'])f.key(character);
  assert.equal(field.value,'k 400');assert.equal(f.byId('wfTouchKeyboardEditor').value,'k 400');assert.equal(f.byId('wfTouchKeyboardEditor').selectionStart,5);
});

test('DOM: a redraw from the old model cannot discard an uncommitted quantity draft',()=>{
  const f=domFixture(),field=f.make('input','quantity',f.scope);field.type='number';field.value='1';let quantity=1;
  const commit=event=>quantity=Number(event.target.value);field.addEventListener('change',commit);f.tap(field);f.key('2');assert.equal(field.value,'12');assert.equal(quantity,1);
  const replacement=f.make('input','quantity',f.scope);replacement.type='number';replacement.value=String(quantity);replacement.addEventListener('change',commit);field.replaceWith(replacement);
  f.action('done');assert.equal(replacement.value,'12');assert.equal(quantity,12);assert.deepEqual(f.events.filter(row=>row[0]==='quantity'&&row[1]==='change'),[['quantity','change','12']]);
});

test('DOM: a touch swipe or cancelled pointer can scroll across a field without opening the keyboard',()=>{
  const f=domFixture();
  f.dispatch(f.name,'pointerdown',{pointerType:'touch',pointerId:1,button:0,clientX:20,clientY:50});assert.equal(f.api.isOpen,false,'touch-down alone is not an activation');
  const move=f.dispatch(f.name,'pointermove',{pointerType:'touch',pointerId:1,clientX:23,clientY:10});assert.equal(move,true,'panning is not cancelled');
  f.dispatch(f.name,'pointerup',{pointerType:'touch',pointerId:1,clientX:23,clientY:10});assert.equal(f.api.isOpen,false);assert.equal(f.name.readOnly,false);
  f.dispatch(f.name,'pointerdown',{pointerType:'touch',pointerId:2,button:0,clientX:20,clientY:50});f.dispatch(f.name,'pointercancel',{pointerType:'touch',pointerId:2});assert.equal(f.api.isOpen,false);assert.equal(f.name.readOnly,false);
});

test('DOM: native focus during a tap cannot prematurely commit and remove a custom-value field',()=>{
  const f=domFixture(),field=f.make('input','customColor',f.scope);let color='CUSTOM',commits=0;
  field.onblur=()=>{color=field.value||'STANDARD';commits++;field.remove();};
  f.dispatch(field,'pointerdown',{pointerType:'touch',pointerId:1,button:0,clientX:20,clientY:50});
  field.focus(); // Browser default: readonly input is still focusable.
  f.dispatch(field,'pointerup',{pointerType:'touch',pointerId:1,clientX:20,clientY:50});f.dispatch(field,'click',{detail:1});
  assert.equal(f.api.isOpen,true);assert.equal(field.isConnected,true);assert.equal(color,'CUSTOM');assert.equal(commits,0);
  f.key('r');f.action('done');assert.equal(color,'r');assert.equal(commits,1);
});

