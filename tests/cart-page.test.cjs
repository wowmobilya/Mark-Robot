const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),acorn=require('acorn');
const {cartSummary}=require('../cart-page.js');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8'),source=fs.readFileSync(path.join(__dirname,'../cart-page.js'),'utf8');
function existingFunction(name){const signature='function '+name+'(';const offset=html.indexOf(signature);assert(offset>=0,name);const start=html.slice(offset-6,offset)==='async '?offset-6:offset;const node=acorn.parseExpressionAt(html,start,{ecmaVersion:'latest'});return html.slice(node.start,node.end);}
const textsStart=html.indexOf('const QBL_CART_TEXTS = ')+ 'const QBL_CART_TEXTS = '.length;
const textsNode=acorn.parseExpressionAt(html,textsStart,{ecmaVersion:'latest'}),cartTexts=html.slice(textsNode.start,textsNode.end);
const legacyNames=['wfValidateCartEntries','qblCartSave','qblCartLoad','qblUpdateCartUI','qblUpdateStickyBar','qblCartChangeQty','qblCartRemoveItem','qblClearCart','qblClearCartConfirm','qblCloseCart','qblOpenCart','qblToggleCart','qblSendToInvoice','getTierPrice'];
const legacy=legacyNames.map(existingFunction).join('\n');

function setup({items=[],saved=null,products=[],customer='selected-client',customerValid=true}={}){
 const nodes=[],observers=[],timers=[],events=new Map(),calls={routes:[],writes:[],dirty:[],camera:0,invoices:0,toasts:[],customerSelections:[]};let document;
 class El{
  constructor(tag){this.tagName=tag.toUpperCase();this.children=[];this.attrs={};this.dataset={};this.events={};this.hidden=false;this.disabled=false;this.classes=new Set();this.style={};this._text='';nodes.push(this);
   this.classList={add:(...names)=>names.forEach(n=>this.classes.add(n)),remove:(...names)=>names.forEach(n=>this.classes.delete(n)),contains:n=>this.classes.has(n),toggle:(n,on)=>{if(on===undefined)on=!this.classes.has(n);if(on)this.classes.add(n);else this.classes.delete(n);return on;}};}
  set className(value){this.classes=new Set(value.split(/\s+/).filter(Boolean));}get className(){return [...this.classes].join(' ');}
  set textContent(value){this._text=String(value);for(const child of this.children)child.parentElement=null;this.children=[];}get textContent(){return this._text+this.children.map(child=>child.textContent).join('');}
  append(...children){for(const child of children){child.remove();child.parentElement=this;this.children.push(child);}}
  insertBefore(child,before){child.remove();const index=before?this.children.indexOf(before):this.children.length;this.children.splice(index,0,child);child.parentElement=this;}
  remove(){if(this.parentElement)this.parentElement.children=this.parentElement.children.filter(child=>child!==this);this.parentElement=null;}
  setAttribute(name,value){this.attrs[name]=String(value);}getAttribute(name){return this.attrs[name]??null;}removeAttribute(name){delete this.attrs[name];}
  addEventListener(name,callback){(this.events[name]??=[]).push(callback);}
  click(){if(this.disabled)return;this.onclick?.();for(const callback of this.events.click||[])callback({target:this,isTrusted:true});}
  focus(){document.activeElement=this;}
  matches(selector){return selector.split(',').some(value=>{value=value.trim();if(value.startsWith('#'))return this.id===value.slice(1);if(value.startsWith('.'))return value.slice(1).split('.').every(name=>this.classes.has(name));return this.tagName===value.toUpperCase();});}
  querySelectorAll(selector){return this.children.flatMap(child=>[...(child.matches(selector)?[child]:[]),...child.querySelectorAll(selector)]);}
  querySelector(selector){return this.querySelectorAll(selector)[0]||null;}
 }
 const el=(tag,id,cls)=>{const node=new El(tag);if(id)node.id=id;if(cls)node.className=cls;return node;};
 const root=el('html'),body=el('body'),main=el('main','mainContent'),nav=el('nav','wf-nav-main'),group=el('div','','wf-nav-group'),navbar=el('nav','','navbar'),wordmark=el('div','','wf-nav-wordmark');root.lang='en';root.dir='ltr';root.append(body);body.append(navbar,nav,main);nav.append(group);navbar.append(wordmark);wordmark.append(el('bdi'));
 for(const name of ['dashboard','products','quick-barcode','create-invoice','invoices'])main.append(el('section','page-'+name,'page'+(name==='dashboard'?' active':'')));
 for(const id of ['qblCartOverlay','qblCartBar','qblStickyCart','qblCartFab','qblCartFabCount','qblCartFabLabel','qblCartTitle','qblCartCountBadge','qblCartTotalBadge','qblCartSummaryLabel','qblCartFooterTotal','qblCartInvoiceBtn','qblCartClearBtn','qblStickyInvoiceBtn','qblStickyBadge','qblStickyTotal','qblStickyItems'])body.append(el('div',id));
 const client=el('select','invCoSel');client.value=customer;client.options=customerValid?[{value:''},{value:'selected-client'}]:[{value:''}];body.append(client);
 document={documentElement:root,body,activeElement:null,createElement:tag=>new El(tag),getElementById:id=>nodes.find(node=>node.id===id)||null,
  querySelector:selector=>selector==='#wf-nav-main .wf-nav-group'?group:selector==='.navbar .wf-nav-wordmark'?wordmark:body.querySelector(selector),querySelectorAll:selector=>body.querySelectorAll(selector)};
 const storage=new Map();if(saved!==null)storage.set('wf_qbl_cart',saved);
 const context={document,Intl,console,CustomEvent:class{constructor(type,{detail}={}){this.type=type;this.detail=detail;}},
  localStorage:{getItem:key=>storage.get(key)??null,setItem(key,value){calls.writes.push([key,value]);storage.set(key,value);}},
  MutationObserver:class{constructor(callback){this.callback=callback;}observe(target){observers.push({callback:this.callback,target});}},
  addEventListener(name,callback){(events.get(name)||events.set(name,[]).get(name)).push(callback);},dispatchEvent(event){for(const callback of events.get(event.type)||[])callback(event);},
  setTimeout(callback){timers.push(callback);},getCurrentPage:()=>main.children.find(page=>page.classList.contains('active'))?.id.slice(5)||'dashboard',
  showPage(id){calls.routes.push(id);for(const page of main.children)page.classList.toggle('active',page.id==='page-'+id);context.qblCloseCart?.();if(id==='create-invoice')client.value='';},goBack(){context.showPage('dashboard');},
  onCoSelect(){calls.customerSelections.push(client.value);},
  showToast:(...args)=>calls.toasts.push(args),wfDriveMarkDirty:key=>calls.dirty.push(key),wfItemCount:n=>String(n),
  qblStopCamera:()=>calls.camera++,usdToTry:amount=>amount*40,usdToEur:amount=>amount*.9,wfGetProductDims:()=>[],wfProductSnapshot:(product,tier)=>({id:product.id,tier}),
  renderInvTable:()=>calls.invoices++,updateSummary(){},renderPrSelector(){},WFDialog:{confirm:async()=>context.confirmResult},
  confirmResult:false,S:{lang:'en',products,invItems:[],invTier:'A',selectedClientId:'selected-client',settings:{}}
 };
 context.window=context;vm.createContext(context);vm.runInContext('const QBL_CART={items:[],open:false};const QBL_CART_TEXTS='+cartTexts+';\n'+legacy,context);
 const cart=vm.runInContext('QBL_CART',context);cart.items=items;
 vm.runInContext(source,context);
 const get=id=>document.getElementById(id),row=index=>get('wfCartItems').children[index];
 return {context,cart,calls,storage,get,row,document,root,main,nodes,client,wordmark,
  flush(){while(timers.length)timers.shift()();},
  language(lang){root.lang=context.S.lang=lang;for(const observer of observers.filter(observer=>observer.target===root))observer.callback([]);}};
}

test('cart totals retain existing tier prices and quantities without mutating products or combining tiers',()=>{
 const product=Object.freeze({id:'one',priceA:12.5,priceUSD:99,priceB:8,priceC:0}),items=Object.freeze([Object.freeze({product,tier:'A',qty:2}),Object.freeze({product,tier:'B',qty:3}),Object.freeze({product,tier:'C',qty:1})]);
 const result=cartSummary(items);assert.equal(result.quantity,6);assert.equal(result.total,49);assert.deepEqual(result.rows.map(row=>row.unit),[12.5,8,0]);assert.equal(result.rows[0].item,items[0]);
 assert.equal(cartSummary([{product:{priceUSD:7},tier:'A',qty:2}]).total,14);
});

test('Cart is a normal empty route and opening it never writes, clears a customer, creates an invoice, or opens a popup',()=>{
 const f=setup();assert.equal(f.get('page-cart').parentElement,f.main);assert.equal(f.get('page-cart').getAttribute('role'),null);
 assert.equal(f.get('page-cart').dataset.cartState,'empty');assert(!f.get('wfCartEmpty').hidden);assert(f.get('wfCartCreateInvoice').disabled);
 f.context.qblOpenCart();f.context.qblToggleCart();f.get('wfCartNav').onclick.call(f.get('wfCartNav'));
 assert.deepEqual(f.calls.routes,['cart','cart','cart']);assert.equal(f.context.getCurrentPage(),'cart');assert.equal(f.cart.open,false);
 for(const id of ['qblCartOverlay','qblCartBar'])assert(!f.get(id).classList.contains('open'));
 assert.deepEqual(f.calls.writes,[]);assert.equal(f.calls.invoices,0);assert.equal(f.client.value,'selected-client');assert.equal(f.context.S.selectedClientId,'selected-client');
 f.get('wfCartBrowse').click();assert.equal(f.calls.routes.at(-1),'products');
 const before=f.nodes.length;vm.runInContext(source,f.context);assert.equal(f.nodes.length,before,'loading the module twice cannot duplicate the section or hooks');
});

test('saved carts restore through the existing loader without an initial write, and quantities use the original persistence path',()=>{
 const product={id:'one',name:'Chair',priceA:15,priceB:11},saved=JSON.stringify([{productId:'one',tier:'B',qty:2}]),f=setup({saved,products:[product]});
 assert.equal(f.get('page-cart').dataset.cartState,'restoring');assert(f.get('wfCartEmpty').hidden);assert.deepEqual(f.calls.writes,[]);assert.equal(f.storage.get('wf_qbl_cart'),saved);
 f.context.qblCartLoad();assert.equal(f.get('page-cart').dataset.cartState,'filled');assert.equal(f.cart.items[0].product,product);assert.equal(f.cart.items[0].tier,'B');assert.equal(f.cart.items[0].qty,2);assert.deepEqual(f.calls.writes,[]);
 f.context.qblOpenCart();const row=f.row(0),controls=row.querySelector('.wf-cart-quantity'),plus=controls.children[2],minus=controls.children[0];plus.focus();plus.click();
 assert.equal(f.cart.items[0].qty,3);assert.equal(f.row(0),row);assert.equal(f.document.activeElement,plus);assert.equal(f.calls.writes.length,1);assert.equal(f.calls.dirty[0],'cart');
 assert.deepEqual(JSON.parse(f.storage.get('wf_qbl_cart')),[{productId:'one',tier:'B',qty:3}]);
 minus.click();minus.click();assert.equal(f.cart.items[0].qty,1);assert(minus.disabled);const writes=f.calls.writes.length;minus.click();assert.equal(f.calls.writes.length,writes);
 f.language('ar');f.language('tr');f.language('fr');f.language('ru');f.language('en');assert.equal(f.calls.writes.length,writes);assert.equal(f.client.value,'selected-client');
 const remove=row.querySelector('.wf-cart-remove');remove.focus();remove.click();assert.equal(f.context.getCurrentPage(),'cart');assert.equal(f.get('page-cart').dataset.cartState,'empty');assert.equal(f.document.activeElement,f.get('wfCartBrowse'));assert.deepEqual(JSON.parse(f.storage.get('wf_qbl_cart')),[]);
});

test('all languages expose empty and filled states, product names remain text, and clear requires the original confirmation',async()=>{
 const product={id:'safe',name:'<img src=x onerror=alert(1)>',priceA:9},item={product,tier:'A',qty:1},f=setup({items:[item]});
 const titles={ar:'السلة',en:'Cart',tr:'Sepet',fr:'Panier',ru:'Корзина'};
 for(const [lang,title]of Object.entries(titles)){f.language(lang);assert.equal(f.get('wfCartTitle').textContent,title);assert.equal(f.get('page-cart').dir,lang==='ar'?'rtl':'ltr');assert.equal(f.row(0).querySelector('h3').textContent,product.name);assert.equal(f.row(0).querySelector('h3').children.length,0);assert(f.row(0).querySelector('.wf-cart-remove').getAttribute('aria-label').endsWith(product.name));}
 f.context.qblOpenCart();f.get('wfCartClear').click();await new Promise(resolve=>setImmediate(resolve));assert.equal(f.cart.items[0],item);assert.equal(f.calls.writes.length,0);
 f.context.confirmResult=true;f.get('wfCartClear').click();await new Promise(resolve=>setImmediate(resolve));assert.equal(f.cart.items.length,0);assert.equal(f.calls.writes.length,1);assert.equal(f.context.getCurrentPage(),'cart');assert(f.get('wfCartCreateInvoice').disabled);assert(!f.get('wfCartEmpty').hidden);
});

test('only the explicit invoice action transfers the same cart through the existing invoice flow',()=>{
 const product={id:'one',name:'Chair',priceA:15,priceB:11},item={product,tier:'B',qty:2},f=setup({items:[item]});
 f.context.qblOpenCart();f.context.WFCartPage.render();f.language('tr');assert.equal(f.cart.items[0],item);assert.equal(f.calls.invoices,0);assert.equal(f.context.S.invItems.length,0);assert.equal(f.calls.writes.length,0);
 f.get('wfCartCreateInvoice').click();assert.equal(f.calls.routes.at(-1),'create-invoice');assert.equal(f.calls.camera,1);assert.equal(f.cart.items[0],item,'existing transfer owns when the cart is consumed');
 assert.equal(f.client.value,'selected-client','restore the same valid customer immediately after invoice initialization');assert.deepEqual(f.calls.customerSelections,['selected-client']);
 f.flush();assert.equal(f.context.S.invItems.length,1);const invoice=f.context.S.invItems[0];assert.equal(invoice.productId,'one');assert.equal(invoice.tier,'B');assert.equal(invoice.qty,2);assert.equal(invoice.priceUSD,11);assert.equal(invoice.totalUSD,22);assert.equal(f.calls.invoices,1);
 assert.equal(f.cart.items.length,0);assert.deepEqual(JSON.parse(f.storage.get('wf_qbl_cart')),[]);assert.equal(f.calls.writes.length,1);assert.equal(f.client.value,'selected-client');
});

test('invoice transfer never invents a customer when none was selected or the prior customer is no longer valid',()=>{
 for(const options of [{customer:''},{customer:'removed-client',customerValid:false}]){
  const f=setup({...options,items:[{product:{id:'one',name:'Chair',priceA:15},tier:'A',qty:1}]});
  f.get('wfCartCreateInvoice').click();assert.equal(f.client.value,'');assert.deepEqual(f.calls.customerSelections,[]);f.flush();assert.equal(f.client.value,'');
 }
});

test('transferring the same product at different tiers preserves every quantity, unit price, and total',()=>{
 const product={id:'same-product',name:'Chair',priceA:12.5,priceB:8,priceC:5};
 const items=[{product,tier:'A',qty:2},{product,tier:'B',qty:3},{product,tier:'C',qty:4}],f=setup({items});
 assert.equal(cartSummary(items).total,69);f.context.qblOpenCart();f.get('wfCartCreateInvoice').click();f.flush();
 const invoice=f.context.S.invItems;assert.equal(invoice.length,3);
 assert.deepEqual(invoice.map(row=>[row.productId,row.tier,row.qty,row.priceUSD,row.totalUSD]),[
  ['same-product','A',2,12.5,25],['same-product','B',3,8,24],['same-product','C',4,5,20]
 ]);
 assert.equal(invoice.reduce((sum,row)=>sum+row.totalUSD,0),69);assert.equal(f.cart.items.length,0);assert.equal(f.calls.writes.length,1);
});

test('leaving the invoice screen before delayed transfer preserves the cart and its saved data',()=>{
 const product={id:'one',name:'Chair',priceA:15},item={product,tier:'A',qty:2},saved=JSON.stringify([{productId:'one',tier:'A',qty:2}]),f=setup({items:[item],saved});
 f.context.qblOpenCart();f.get('wfCartCreateInvoice').click();assert.equal(f.calls.routes.at(-1),'create-invoice');
 f.context.showPage('products');f.flush();
 assert.equal(f.context.getCurrentPage(),'products');assert.equal(f.cart.items.length,1);assert.equal(f.cart.items[0],item);assert.equal(item.qty,2);
 assert.equal(f.storage.get('wf_qbl_cart'),saved);assert.deepEqual(f.calls.writes,[]);assert.equal(f.context.S.invItems.length,0);assert.equal(f.calls.invoices,0);assert.deepEqual(f.calls.toasts,[]);
 f.context.qblOpenCart();assert.equal(f.get('page-cart').dataset.cartState,'filled');
});

test('Cart registers before navigation and the boot router accepts a direct Cart link',()=>{
 const cart=html.indexOf('src="cart-page.js?'),navigation=html.indexOf('src="ui-navigation.js?');assert(cart>=0&&cart<navigation);
 assert.match(html,/href="cart-page\.css\?v=\d+"/);
 const match=html.match(/const validPages=(\[[^;]+\]);/);assert(match);const pages=vm.runInNewContext(match[1]);assert(pages.includes('cart'));
});
