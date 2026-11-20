const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const read=name=>fs.readFileSync(path.resolve(__dirname,'..',name),'utf8');
const tick=async()=>{for(let i=0;i<8;i++)await Promise.resolve();};

// Execute the actual company, branding and colour transactions without browser
// automation. The parent owns layout/top-layer verification on the live app.
function fixture(){
  const observers=[],modalCalls=[],writes=[],images=[],clean=[],toasts=[];let doc,database,writeBarrier,failWrite=false;
  class Event{
    constructor(type,options={}){this.type=type;Object.assign(this,options);this.defaultPrevented=false;}
    preventDefault(){this.defaultPrevented=true;}stopPropagation(){this.stopped=true;}stopImmediatePropagation(){this.stopped=true;this.immediate=true;}
  }
  class Style{
    constructor(){this.priorities=new Map();}
    setProperty(key,value,priority=''){this[key]=String(value);this.priorities.set(key,priority);}
    getPropertyValue(key){return this[key]||'';}getPropertyPriority(key){return this.priorities.get(key)||'';}
    removeProperty(key){delete this[key];this.priorities.delete(key);}
  }
  class Element{
    constructor(tag){this.tagName=tag.toUpperCase();this.nodeType=1;this.children=[];this.listeners=[];this.attributes=new Map();this.style=new Style();this.dataset={};this.className='';this.value='';this.hidden=false;this.disabled=false;this.open=false;this.scrollTop=0;}
    get classList(){const self=this;return{add(...items){self.className=[...new Set([...self.className.split(' ').filter(Boolean),...items])].join(' ');},remove(...items){self.className=self.className.split(' ').filter(x=>!items.includes(x)).join(' ');},contains(value){return self.className.split(' ').includes(value);},toggle(value,force){const on=force??!this.contains(value);on?this.add(value):this.remove(value);return on;}};}
    get parentElement(){return this.parentNode;}get childNodes(){return this.children;}get firstElementChild(){return this.children[0]||null;}
    get nextElementSibling(){const children=this.parentNode?.children||[];return children[children.indexOf(this)+1]||null;}
    get isConnected(){return this===doc||!!this.parentNode?.isConnected;}
    get labels(){return doc.querySelectorAll('label').filter(label=>label.htmlFor===this.id);}get control(){return this.tagName==='LABEL'?doc.getElementById(this.htmlFor):null;}
    set textContent(value){this._text=String(value);this.replaceChildren();}get textContent(){return(this._text||'')+this.children.map(child=>child.textContent||'').join('');}
    setAttribute(key,value){this.attributes.set(key,String(value));if(['id','class','type'].includes(key))this[key==='class'?'className':key]=String(value);}
    getAttribute(key){return this.attributes.get(key)??null;}removeAttribute(key){this.attributes.delete(key);}
    append(...nodes){for(const child of nodes){child.remove?.();this.children.push(child);child.parentNode=this;}}
    prepend(...nodes){for(const child of nodes.reverse()){child.remove?.();this.children.unshift(child);child.parentNode=this;}}
    before(child){const parent=this.parentNode;if(!parent)return;child.remove?.();parent.children.splice(parent.children.indexOf(this),0,child);child.parentNode=parent;}
    after(child){const parent=this.parentNode;if(!parent)return;child.remove?.();parent.children.splice(parent.children.indexOf(this)+1,0,child);child.parentNode=parent;}
    remove(){if(this.parentNode){const children=this.parentNode.children;children.splice(children.indexOf(this),1);this.parentNode=null;}}
    replaceChildren(...nodes){for(const child of this.children)child.parentNode=null;this.children=[];this.append(...nodes);}
    contains(child){for(let node=child;node;node=node.parentNode)if(node===this)return true;return false;}
    matches(selector){
      const pieces=selector.trim().split(/\s+(?![^\[]*\])/);if(pieces.length>1){if(!this.matches(pieces.pop()))return false;let node=this.parentNode;while(pieces.length){const part=pieces.pop();while(node&&!node.matches(part))node=node.parentNode;if(!node)return false;node=node.parentNode;}return true;}
      if(selector.startsWith('#'))return this.id===selector.slice(1);
      if(selector.startsWith('.'))return selector.slice(1).split('.').every(value=>this.classList.contains(value));
      const attribute=/^(\w+)?\[([^=\]]+)(?:="([^"]*)")?\]$/.exec(selector);
      if(attribute)return(!attribute[1]||this.tagName===attribute[1].toUpperCase())&&(attribute[3]===undefined?this.attributes.has(attribute[2]):(this[attribute[2]]??this.getAttribute(attribute[2]))===attribute[3]);
      return this.tagName===selector.toUpperCase();
    }
    closest(selector){for(let node=this;node;node=node.parentNode)if(node.matches(selector))return node;return null;}
    querySelectorAll(selector){const found=[];for(const child of this.children){if(child.matches?.(selector))found.push(child);if(child.querySelectorAll)found.push(...child.querySelectorAll(selector));}return found;}
    querySelector(selector){return this.querySelectorAll(selector)[0]||null;}
    cloneNode(deep=false){const clone=new Element(this.tagName);Object.assign(clone,{id:this.id,className:this.className,value:this.value,src:this.src,_text:this._text,hidden:this.hidden,dataset:{...this.dataset}});clone.attributes=new Map(this.attributes);if(deep)clone.append(...this.children.map(child=>child.cloneNode(true)));return clone;}
    addEventListener(type,handler,capture=false){this.listeners.push({type,handler,capture:typeof capture==='object'?!!capture.capture:capture});}
    dispatchEvent(event){event.target??=this;const parents=[];for(let node=this.parentNode;node;node=node.parentNode)parents.push(node);const invoke=(node,capture)=>{for(const listener of node.listeners){if(listener.type===event.type&&listener.capture===capture){listener.handler.call(node,event);if(event.immediate)break;}}};for(const parent of [...parents].reverse()){invoke(parent,true);if(event.stopped)return!event.defaultPrevented;}invoke(this,true);if(!event.immediate)invoke(this,false);if(event.bubbles&&!event.stopped)for(const parent of parents){invoke(parent,false);if(event.stopped)break;}return!event.defaultPrevented;}
    click(){if(!this.disabled)this.dispatchEvent(new Event('click',{bubbles:true,cancelable:true}));}focus(){doc.activeElement=this;}
    showModal(){modalCalls.push(this.id);this.open=true;}close(){if(!this.open)return;this.open=false;this.dispatchEvent(new Event('close'));}
    getBoundingClientRect(){return{height:520,width:620,left:0,top:0};}setPointerCapture(){}getContext(){return{drawImage(){}};}toDataURL(){return'data:image/png;base64,bmV3';}
  }
  doc=new Element('document');doc.nodeType=9;doc.createElement=tag=>new Element(tag);doc.getElementById=id=>doc.querySelector('#'+id);
  doc.documentElement=new Element('html');doc.documentElement.lang='ar';doc.documentElement.dir='rtl';doc.append(doc.documentElement);doc.body=new Element('body');doc.documentElement.append(doc.body);doc.activeElement=doc.body;
  const make=(tag,id,parent=doc.body)=>{const node=new Element(tag);node.id=id;parent.append(node);return node;};
  const page=make('section','page-settings');page.className='active';
  const tabs=make('div','tabs',page),companyTab=make('button','wf-settings-tab-company',tabs);companyTab.className='tab-btn active';
  const bankTab=make('button','wf-settings-tab-bank',tabs);bankTab.className='tab-btn';
  const invoiceTab=make('button','wf-settings-tab-invoice',tabs);invoiceTab.className='tab-btn';
  const parent=make('dialog','wfSettingsDialog',page),content=make('div','content',parent);content.className='wf-settings-content';
  const company=make('section','stab-company',content);company.setAttribute('role','tabpanel');
  const bank=make('section','stab-bank',content);bank.style.display='none';const bankCard=make('div','bankCard',bank);bankCard.className='card';
  const invoice=make('section','stab-invoice',content);invoice.style.display='none';
  const identity=make('div','identity',company);identity.className='wf-company-identity';const logo=make('div','settingsLogoPrev',identity);make('img','originalLogo',logo).src='data:image/png;base64,b2xk';
  const uploads=make('div','uploads',identity);make('button','upload',uploads).textContent='تحميل';const logoFile=make('input','logoUpload',uploads);logoFile.type='file';
  const reset=make('button','resetLogo',uploads);reset.setAttribute('onclick','resetSettingsLogo()');
  const stored={id:'main',companyName:'WOW Furniture',address:'Old address',phone:'0123',email:'a@example.test',website:'example.test',mersis:'0001',taxNumber:'0017',taxOffice:'Old office',bankName:'Old bank',beneficiary:'Owner',ibanUSD:'USD',ibanTRY:'TRY',ibanEUR:'EUR',swift:'SWIFT',accountNo:'0012',nextNoExt:5000,logo:'data:image/png;base64,b2xk',signature:'data:image/png;base64,c2lnbg==',stamp:'data:image/png;base64,c3RhbXA=',branding:{logoBackground:'#ffffff',logoShape:'rounded',logoSize:'normal',extension:7}};
  for(const [scope,keys]of [[company,['companyName','address','phone','email','website','mersis']],[bankCard,['bankName','beneficiary','ibanUSD','ibanTRY','ibanEUR','swift','accountNo']],[invoice,['nextNoExt']]])for(const key of keys){const group=make('div','',scope);group.className='fg';const input=make('input','st'+key[0].toUpperCase()+key.slice(1),group);input.value=String(stored[key]);}
  const state={settings:structuredClone(stored)};database=structuredClone(stored);
  const window={document:doc,WFAppIdentity:{apply(){}},WFAppUpdates:{markClean:node=>clean.push(node.id),registerGuard(){}},getComputedStyle:()=>({color:'rgb(63, 124, 148)'}),loadSettingsToForm(){for(const[key,value]of Object.entries(state.settings)){const input=doc.getElementById('st'+key[0].toUpperCase()+key.slice(1));if(input)input.value=String(value);}},switchTab(key){for(const node of [company,bank,invoice])node.style.display=node.id==='stab-'+key?'block':'none';for(const tab of [companyTab,bankTab,invoiceTab])tab.classList.toggle('active',tab.id==='wf-settings-tab-'+key);}};
  const context=vm.createContext({window,document:doc,S:state,Event,DEFAULT_WOW_LOGO:'data:image/png;base64,ZGVmYXVsdA==',wfPendingSettingsLogo:undefined,
    MutationObserver:class{constructor(callback){this.callback=callback;observers.push(this);}observe(target,options){this.target=target;this.options=options;}disconnect(){this.target=null;}},
    Image:class{constructor(){this.naturalWidth=100;this.naturalHeight=100;}decode(){return new Promise(resolve=>images.push(resolve));}},URL:{createObjectURL:()=> 'blob:test',revokeObjectURL(){}},
    wfWriteBatch:async operations=>{if(writeBarrier)await writeBarrier;if(failWrite)throw Error('storage full');writes.push(operations);database=operations[0].merge(database,operations[0].value);return[database];},wfHydrateDBValue:async row=>row,
    wfRunSave:async(key,action)=>{try{return await action();}catch{return false;}},showToast:(...args)=>toasts.push(args),t:key=>key,updateRateUI(){},updateKdvDisplay(){}});
  vm.runInContext(read('branding-settings.js'),context);vm.runInContext(read('company-identity.js'),context);vm.runInContext(read('color-picker.js'),context);parent.showModal();
  const byId=id=>doc.getElementById(id),dispatch=(node,type,extra={})=>node.dispatchEvent(new Event(type,{bubbles:true,...extra}));
  return{window,doc,page,parent,company,content,state,context,byId,dispatch,writes,images,modalCalls,clean,toasts,logo,
    flush(target,attributeName){for(const observer of [...observers])if(observer.target===target&&(!observer.options.attributeFilter||observer.options.attributeFilter.includes(attributeName)))observer.callback([{type:'attributes',target,attributeName}]);},
    open(key){byId(key==='bank'?'wfCompanyOpenBank':'wfCompanyOpen-'+key).click();},
    choose(value){const hex=byId('wfColorHex');hex.value=value;dispatch(hex,'input');},
    set failWrite(value){failWrite=value;},blockWrite(){writeBarrier=new Promise(resolve=>this.releaseWrite=()=>{writeBarrier=null;resolve();});},get database(){return database;}};
}

test('all company sections navigate inside the one existing settings dialog and Back restores the hub',()=>{
  const f=fixture(),editor=f.byId('wfCompanySectionDialog'),hub=f.byId('wfCompanyHub');
  assert.equal(editor.tagName,'SECTION');assert(f.company.contains(editor));assert.equal(editor.hidden,true);assert.equal(editor.getAttribute('aria-modal'),null);
  for(const key of ['basic','logo','registration','marks','bank']){
    f.open(key);assert.equal(f.parent.open,true);assert.equal(hub.hidden,true);assert.equal(editor.hidden,false);assert.equal(editor.dataset.companySection,key);
    assert.deepEqual(f.modalCalls,['wfSettingsDialog']);assert.equal(f.parent.style.getPropertyValue('height'),'');assert.equal(f.parent.style.getPropertyValue('block-size'),'');
    const tile=f.byId(key==='bank'?'wfCompanyOpenBank':'wfCompanyOpen-'+key);assert.equal(tile.getAttribute('aria-haspopup'),null);assert.equal(tile.getAttribute('aria-expanded'),'true');
    f.byId('wfCompanySectionBack').click();assert.equal(hub.hidden,false);assert.equal(editor.hidden,true);assert.equal(f.parent.open,true);assert.equal(f.doc.activeElement,tile);assert.equal(tile.getAttribute('aria-expanded'),'false');
  }
});

test('Back and Cancel roll back only the active section; Save commits only its fields and returns to the hub',async()=>{
  const f=fixture(),name=f.byId('stCompanyName'),bank=f.byId('stBankName');bank.value='unrelated bank draft';
  f.open('basic');name.value='cancelled';f.byId('wfCompanySectionCancel').click();assert.equal(name.value,'WOW Furniture');assert.equal(bank.value,'unrelated bank draft');assert.equal(f.writes.length,0);
  f.open('basic');name.value=' Saved company ';assert.equal(await f.window.WFCompanyIdentity.save(),true);
  assert.equal(f.state.settings.companyName,'Saved company');assert.equal(f.state.settings.bankName,'Old bank');assert.equal(bank.value,'unrelated bank draft');assert.equal(f.parent.open,true);assert.equal(f.byId('wfCompanyHub').hidden,false);
  assert.deepEqual(JSON.parse(JSON.stringify(f.writes[0][0].value)),{companyName:'Saved company'});
  f.open('registration');f.byId('stTaxNumber').value='00000042';await f.window.WFCompanyIdentity.save();assert.equal(f.state.settings.taxNumber,'00000042');assert.equal(f.state.settings.ibanUSD,'USD');assert.equal(f.database.branding.extension,7);
});

test('closing the parent, changing tabs, leaving settings, and changing language roll back the current draft',()=>{
  for(const action of ['parent','tab','page','language']){
    const f=fixture();f.open('basic');f.byId('stCompanyName').value='discard';
    if(action==='parent')f.parent.close();
    if(action==='tab')f.window.switchTab('invoice');
    if(action==='page'){f.page.classList.remove('active');f.flush(f.page,'class');}
    if(action==='language'){f.doc.documentElement.lang='tr';f.flush(f.doc.documentElement,'lang');}
    assert.equal(f.byId('stCompanyName').value,'WOW Furniture',action);assert.equal(f.byId('wfCompanySectionDialog').hidden,true,action);assert.equal(f.byId('wfCompanyHub').hidden,false,action);assert.equal(f.writes.length,0,action);
  }
  const f=fixture();f.open('bank');f.byId('stBankName').value='discard';assert.equal(f.dispatch(f.parent,'cancel',{cancelable:true}),false);assert.equal(f.parent.open,true);assert.equal(f.byId('wfCompanySectionDialog').hidden,true);assert.equal(f.byId('stBankName').value,'Old bank');
});

test('logo section cancellation restores the real branding draft and closes an active color preview',()=>{
  const f=fixture(),before=JSON.stringify(f.window.WFCompanyBranding.snapshot());f.open('logo');
  f.byId('wfCompanyLogoBackgroundPicker').click();f.choose('#123456');f.doc.querySelector('.wf-color-apply').click();assert.equal(f.window.WFCompanyBranding.getDraft().logoBackground,'#123456');
  f.byId('wfCompanyLogoBackgroundPicker').click();f.choose('#987654');assert.equal(f.logo.style.background,'#987654');
  f.doc.documentElement.lang='en';f.flush(f.doc.documentElement,'lang');
  assert.equal(f.byId('wfColorPickerDialog').open,false);assert.equal(JSON.stringify(f.window.WFCompanyBranding.snapshot()),before);assert.equal(f.logo.style.background,'#ffffff');assert.equal(f.writes.length,0);assert.equal(f.byId('wfCompanyHub').hidden,false);
  f.open('logo');f.byId('wfCompanyLogoBackgroundPicker').click();f.choose('#abcdef');f.parent.close();assert.equal(f.byId('wfColorPickerDialog').open,false);assert.equal(f.logo.style.background,'#ffffff');assert.equal(JSON.stringify(f.window.WFCompanyBranding.snapshot()),before);
});

test('a pending image decode cannot resurrect a discarded logo draft after the parent closes',async()=>{
  const f=fixture();f.open('logo');const input=f.byId('logoUpload');input.files=[{type:'image/png',size:10}];f.dispatch(input,'change');assert.equal(f.images.length,1);
  f.parent.close();assert.equal(f.byId('wfCompanySectionDialog').hidden,true);f.images[0]();await tick();
  assert.equal(f.context.wfPendingSettingsLogo,undefined);assert.equal(f.logo.querySelector('img').src,'data:image/png;base64,b2xk');assert.equal(f.writes.length,0);
  f.parent.showModal();f.open('basic');assert.equal(f.byId('wfCompanySectionDialog').hidden,false);assert.equal(f.byId('wfCompanySectionSave').disabled,false);
});

test('failed saves keep the inline draft for retry and an already requested save may finish after close without reopening',async()=>{
  const f=fixture();f.open('bank');f.byId('stBankName').value='New bank';f.failWrite=true;
  assert.equal(await f.window.WFCompanyIdentity.save(),false);assert.equal(f.byId('wfCompanySectionDialog').hidden,false);assert.equal(f.byId('stBankName').value,'New bank');assert.equal(f.state.settings.bankName,'Old bank');
  f.failWrite=false;f.blockWrite();const saving=f.window.WFCompanyIdentity.save();f.parent.close();assert.equal(f.byId('wfCompanySectionDialog').hidden,true);f.releaseWrite();assert.equal(await saving,true);
  assert.equal(f.parent.open,false);assert.equal(f.byId('wfCompanySectionDialog').hidden,true);assert.equal(f.state.settings.bankName,'New bank');assert.equal(f.byId('stBankName').value,'New bank');assert.equal(f.writes.length,1);
});
