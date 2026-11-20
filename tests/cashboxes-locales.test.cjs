const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync(require.resolve('../cashboxes.mjs'),'utf8');
const tick=async()=>{for(let i=0;i<10;i++)await Promise.resolve();};

async function fixture(language='en'){
  const observers=[],reads=[],writes=[],events=[];let failRead=false,failWrite=false,document;
  class Element{
    constructor(tag){this.tagName=tag.toUpperCase();this.children=[];this.attributes={};this.dataset={};this.className='';this.hidden=false;this.disabled=false;this.required=false;this._text='';}
    get classList(){return{contains:key=>this.className.split(' ').includes(key)};}
    append(...nodes){for(const node of nodes){node.parentNode?.children.splice(node.parentNode.children.indexOf(node),1);node.parentNode=this;this.children.push(node);}}
    after(node){const list=this.parentNode.children;node.parentNode=this.parentNode;list.splice(list.indexOf(this)+1,0,node);}
    replaceChildren(...nodes){for(const node of this.children)node.parentNode=null;this.children=[];this.append(...nodes);if(this.tagName==='SELECT'&&!this.children.some(option=>option.value===this._value))delete this._value;}
    set textContent(value){this._text=String(value);this.replaceChildren();}get textContent(){return this._text+this.children.map(node=>node.textContent).join('');}
    set value(value){this._value=String(value);}get value(){return this._value??(this.tagName==='SELECT'?this.children[0]?.value||'':'');}
    get options(){return this.children;}add(option){this.append(option);}
    setAttribute(key,value){this.attributes[key]=String(value);if(key.startsWith('data-'))this.dataset[key.slice(5).replace(/-([a-z])/g,(_,c)=>c.toUpperCase())]=String(value);if(['name','type','id','class','dir'].includes(key))this[key==='class'?'className':key]=String(value);if(['hidden','disabled','required'].includes(key))this[key]=true;}
    getAttribute(key){return this.attributes[key]??null;}
    matches(selector){if(selector[0]==='#')return this.id===selector.slice(1);if(selector[0]==='.')return this.classList.contains(selector.slice(1));const attr=/^\[([^=\]]+)(?:=["']?([^\]"']+)["']?)?\]$/.exec(selector);if(attr)return attr[2]===undefined?Object.hasOwn(this.attributes,attr[1]):this.getAttribute(attr[1])===attr[2];return this.tagName===selector.toUpperCase();}
    querySelectorAll(selector){const found=[];for(const node of this.children){if(node.matches(selector))found.push(node);found.push(...node.querySelectorAll(selector));}return found;}
    querySelector(selector){return this.querySelectorAll(selector)[0]||null;}
    closest(selector){for(let node=this;node;node=node.parentNode)if(node.matches(selector))return node;return null;}
    get elements(){return Object.fromEntries(this.querySelectorAll('[name]').map(input=>[input.name,input]));}
    dispatchEvent(event){events.push(event.type);}
    set innerHTML(html){
      this.replaceChildren();const stack=[this];
      for(const token of html.match(/<[^>]*>|[^<]+/g)||[]){
        if(token.startsWith('</')){stack.pop();continue;}
        if(token.startsWith('<')){const match=/^<([\w-]+)/.exec(token);if(!match)continue;const node=new Element(match[1]);for(const attribute of token.slice(match[0].length,-1).matchAll(/([^\s=]+)(?:=(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g))node.setAttribute(attribute[1],attribute[2]??attribute[3]??attribute[4]??'');stack.at(-1).append(node);if(!['INPUT','BR','IMG','HR'].includes(node.tagName))stack.push(node);
        }else{const text=new Element('text');text._text=token;stack.at(-1).append(text);}
      }
    }
  }
  document=new Element('document');document.createElement=tag=>new Element(tag);document.getElementById=id=>document.querySelector('#'+id);document.documentElement=new Element('html');document.documentElement.lang=language;document.append(document.documentElement);
  const page=new Element('section');page.id='page-cashboxes';page.className='page active';document.documentElement.append(page);const header=new Element('header');page.append(header);const title=new Element('h1');title.setAttribute('data-wf-ui','Cashboxes');header.append(title);
  const nav=new Element('span');nav.setAttribute('data-wf-ui','Cashboxes');document.documentElement.append(nav);
  const entry={id:'cashbox-entry/old',date:'2026-11-20',type:'receipt',note:'بيان العميل CLIENT',legs:[{currency:'TRY',units:12345}]};
  const context=vm.createContext({document,window:{},Intl,console,Option:function(text,value){const node=new Element('option');node.value=value;node.textContent=text;return node;},
    MutationObserver:class{constructor(callback){this.callback=callback;observers.push(this);}observe(target,options){this.target=target;this.options=options;}},
    FormData:class{constructor(form){this.data=Object.entries(form.elements).filter(([,input])=>!input.disabled).map(([key,input])=>[key,input.value]);}[Symbol.iterator](){return this.data[Symbol.iterator]();}},
    CustomEvent:class{constructor(type,options){this.type=type;Object.assign(this,options);}},
    dbGetAllKeysRaw:async()=>{reads.push('keys');if(failRead)throw Error('private storage error');return[entry.id,...writes.map(row=>row.id)];},dbGetAll:async store=>{reads.push(store);return[];},dbGet:async(store,id)=>id===entry.id?entry:writes.find(row=>row.id===id),
    dbPut:async(store,row)=>{assert.equal(store,'settings');if(failWrite)throw Error('private storage error');writes.push(row);},wfNewRecordId:()=> 'test',WOWStatementCore:{collectPayments:()=>({groups:new Map(),unattached:[]})}});
  vm.runInContext(source.replace(/^export /gm,'')+'\nglobalThis.testAPI={mount,cashboxText,cashboxErrorMessage};',context);
  context.testAPI.mount();await tick();const box=page.querySelector('.cashboxes'),form=box.querySelector('form');
  return{context,document,page,box,form,fields:form.elements,title,nav,reads,writes,events,
    language(value){document.documentElement.lang=value;for(const observer of observers)if(observer.target===document.documentElement)observer.callback([{type:'attributes',attributeName:'lang'}]);},
    set failRead(value){failRead=value;},set failWrite(value){failWrite=value;},submit:()=>form.onsubmit({preventDefault(){}})};
}

test('cashbox labels and validation errors are complete in every supported language',async()=>{
  const {cashboxText,cashboxErrorMessage,makeEntry}=await import('../cashboxes.mjs');
  assert.equal(typeof cashboxText,'function');assert.equal(typeof cashboxErrorMessage,'function');
  const names={ar:'الصندوق',en:'Cashbox',tr:'Kasa',fr:'Caisse',ru:'Касса'};
  const failures=[{amount:'-1'},{amount:'0'},{currency:'XXX'},{type:'transfer',target:'TRY'}];
  for(const language of Object.keys(names)){
    assert.equal(cashboxText('cashbox',language),names[language]);
    for(const patch of failures){let error;try{makeEntry({currency:'TRY',type:'receipt',amount:'1',...patch},'x','2026-11-20');}catch(value){error=value;}
      const text=cashboxErrorMessage(error,language);assert(text.length>5);if(language!=='ar')assert(!/[\u0600-\u06ff]/.test(text));}
    assert.equal(cashboxErrorMessage(Error('private record data'),language),cashboxText('saveError',language));
  }
});

test('live cashbox labels, currencies, records and direction change without touching a transfer draft or rereading storage',async()=>{
  const f=await fixture('ar');f.fields.type.value='transfer';await f.fields.type.onchange();f.fields.target.value='USD';f.fields.amount.value='2.15';f.fields.received.value='0.06';f.fields.note.value='ملاحظة العميل Custom';
  const reads=f.reads.length;
  for(const language of ['en','tr','fr','ru','ar']){
    f.language(language);const words=key=>f.context.testAPI.cashboxText(key,language);
    assert.equal(f.box.dir,language==='ar'?'rtl':'ltr');assert.equal(f.title.textContent,words('title'));assert.equal(f.nav.textContent,words('title'));
    assert.equal(f.form.querySelector('button').textContent,words('save'));assert.equal(f.box.querySelector('h3').textContent,words('history'));
    assert.equal(f.fields.currency.options[0].textContent,words('TRY')+' · TRY');assert.equal(f.fields.type.options[2].textContent,words('transfer'));
    assert(f.box.querySelector('output').textContent.startsWith(words('balance')));
    assert.equal(f.box.querySelector('li').querySelector('span').textContent,words('receipt'));
    assert.match(f.box.querySelector('li').querySelector('small').textContent,/بيان العميل CLIENT/);
    assert.deepEqual([f.fields.currency.value,f.fields.type.value,f.fields.target.value,f.fields.amount.value,f.fields.received.value,f.fields.note.value],['TRY','transfer','USD','2.15','0.06','ملاحظة العميل Custom']);
    assert.equal(f.fields.received.required,true);assert.equal(f.reads.length,reads);
  }
});

test('empty balances and read errors use the selected language, including after a language change',async()=>{
  const f=await fixture('fr');f.fields.currency.value='EUR';await f.fields.currency.onchange();
  assert.equal(f.box.querySelector('ol').textContent,f.context.testAPI.cashboxText('empty','fr'));
  f.failRead=true;await f.fields.currency.onchange();assert.equal(f.box.querySelector('output').textContent,f.context.testAPI.cashboxText('loadError','fr'));
  const reads=f.reads.length;f.language('ru');assert.equal(f.box.querySelector('output').textContent,f.context.testAPI.cashboxText('loadError','ru'));assert.equal(f.reads.length,reads);
});

test('validation and storage failures preserve input and successful transfers keep both original legs',async()=>{
  const f=await fixture('tr'),status=f.box.querySelector('[role=status]');f.fields.type.value='transfer';await f.fields.type.onchange();f.fields.target.value='SYP';f.fields.amount.value='2.15';f.fields.received.value='';f.fields.note.value='Client note ملاحظة';
  await f.submit();assert.equal(f.writes.length,0);assert.equal(status.textContent,f.context.testAPI.cashboxText('amountInvalid','tr'));assert.equal(f.fields.amount.value,'2.15');assert.equal(f.fields.note.value,'Client note ملاحظة');
  f.fields.received.value='700';f.failWrite=true;await f.submit();assert.equal(status.textContent,f.context.testAPI.cashboxText('saveError','tr'));assert.equal(f.fields.received.value,'700');assert.equal(f.writes.length,0);
  f.language('fr');assert.equal(status.textContent,f.context.testAPI.cashboxText('saveError','fr'));f.failWrite=false;await f.submit();
  assert.equal(f.writes.length,1);assert.deepEqual(JSON.parse(JSON.stringify(f.writes[0].legs)),[{currency:'TRY',units:-215},{currency:'SYP',units:70000}]);assert.equal(f.writes[0].note,'Client note ملاحظة');
  assert.equal(status.textContent,f.context.testAPI.cashboxText('saved','fr'));assert.equal(f.fields.amount.value,'');assert.equal(f.fields.received.value,'');assert.equal(f.fields.note.value,'');assert.deepEqual(f.events,['wf-cashbox-entry-saved']);
});
