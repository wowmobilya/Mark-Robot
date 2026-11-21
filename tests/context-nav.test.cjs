const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../context-nav.js'),'utf8');
const controller=source.slice(source.indexOf('/* One curved dock,')).replace(/  sync\(\);\n\}\)\(\);\s*$/, '  globalThis.navTest={configuration,sync};\n  sync();\n})();');
class El {
 constructor(id='',classes=''){this.id=id;this.children=[];this.attrs={};this.events={};this.dataset={};this.style={};this.selectors=new Map;this.classes=new Set(classes.split(' ').filter(Boolean));this.classList={contains:n=>this.classes.has(n),add:n=>this.classes.add(n),remove:n=>this.classes.delete(n),toggle:(n,on)=>on?this.classes.add(n):this.classes.delete(n)};this.visible=true;this.hidden=false;this.disabled=false;this.clicks=0;this.scrollTop=0;this.textContent='';}
 set className(v){this.classes=new Set(v.split(' ').filter(Boolean));}
 append(...nodes){for(const el of nodes){el.remove();this.children.push(el);el.parentElement=this;}}
 remove(){if(this.parentElement)this.parentElement.children=this.parentElement.children.filter(x=>x!==this);this.parentElement=null;}
 before(el){const p=this.parentElement;el.remove();p.children.splice(p.children.indexOf(this),0,el);el.parentElement=p;}
 after(el){const p=this.parentElement;el.remove();p.children.splice(p.children.indexOf(this)+1,0,el);el.parentElement=p;}
 contains(el){return this===el||this.children.some(child=>child.contains(el));}
 setAttribute(k,v){this.attrs[k]=String(v);}getAttribute(k){return this.attrs[k]??null;}removeAttribute(k){delete this.attrs[k];}hasAttribute(k){return k in this.attrs;}
 addEventListener(k,fn){(this.events[k]??=[]).push(fn);}
 matches(sel){return sel.split(',').some(s=>{s=s.trim();if(s==='.bnav-label:not(.settings-save-label)')return this.classes.has('bnav-label')&&!this.classes.has('settings-save-label');if(s===':disabled'){for(let el=this;el;el=el.parentElement)if(el.disabled&&(el===this||el.tagName==='FIELDSET'))return true;return false;}if(s==='[hidden]')return this.hidden;if(s==='[inert]')return this.hasAttribute('inert');const attr=/^([^\[]*)\[([^=\]]+)(?:="([^"]*)")?\]$/.exec(s);if(attr)return(!attr[1]||this.matches(attr[1]))&&(attr[3]===undefined?this.hasAttribute(attr[2]):this.getAttribute(attr[2])===attr[3]);if(s[0]==='#')return this.id===s.slice(1);if(s[0]==='.')return s.slice(1).split('.').every(c=>this.classes.has(c));return s.toUpperCase()===this.tagName;});}
 closest(sel){for(let el=this;el;el=el.parentElement)if(el.matches(sel))return el;return null;}
 querySelectorAll(sel){if(this.selectors.has(sel))return this.selectors.get(sel);return this.children.flatMap(el=>[...(el.matches(sel)?[el]:[]),...el.querySelectorAll(sel)]);}
 querySelector(sel){return this.querySelectorAll(sel)[0]||null;}
 getClientRects(){for(let el=this;el;el=el.parentElement)if(el.hidden||!el.visible||el.style.display==='none'||el.hasAttribute('data-wf-shared-dock-source')&&el.closest('.wf-shared-actions-docked'))return [];return [{}];}
 click(){this.clicks++;this.onclick?.();for(const fn of this.events.click||[])fn({target:this});}
 focus(){this.focused=true;}scrollIntoView(){this.scrolled=true;}scrollTo(){this.scrollTop=0;}
}
const pages=['dashboard','companies','products','cart','invoices','select-client-type','add-company','add-product','select-invoice-type','create-invoice','payment-management','reports','exchange','cashboxes','quick-barcode','settings','package-labels','product-costs','invoice-archive'];
function setup({mobile=false}={}){
 const root=new El,body=new El,main=new El('mainContent'),nav=new El('bottomNav'),ids={mainContent:main,bottomNav:nav},queue=[],observers=[],calls={routes:[],back:0,menu:0,moves:[]};root.lang='ar';root.dir='rtl';root.append(body);body.append(main,nav);
 for(const p of pages){const el=new El('page-'+p,'page');ids[el.id]=el;main.append(el);}ids['page-dashboard'].classes.add('active');
 const buttons=Array.from({length:5},(_,i)=>{const b=new El('bnav-'+i,'bnav-btn');b.tagName='BUTTON';b.append(new El('','bnav-icon'),new El('','bnav-label'));ids[b.id]=b;nav.append(b);return b;});
 function target(page,selector,id=''){const el=new El(id);el.tagName='BUTTON';const host=ids['page-'+page];host.append(el);host.selectors.set(selector,[el]);if(id)ids[id]=el;return el;}
 const original={};for(const [name,page,sel,id] of [
  ['clientSave','add-company','#coSaveBtn','coSaveBtn'],['clientReset','add-company','#coResetBtn','coResetBtn'],['productSave','add-product','[onclick="savePr()"]'],['productReset','add-product','#prResetBtnWrap','prResetBtnWrap'],['changeType','add-product','#changePrTypeBtn','changePrTypeBtn'],['types','add-product','#prTypeStepCards','prTypeStepCards'],
  ['addClient','companies','[onclick="showPage(\'select-client-type\')"]'],['addProduct','products','[onclick="showPage(\'add-product\')"]'],['addInvoice','invoices','[onclick="showPage(\'select-invoice-type\')"]'],
  ['invoiceSave','create-invoice','[onclick="saveInvoice()"]'],['preview','create-invoice','[onclick="previewInvoice()"]'],['payment','payment-management','[onclick="addPaymentToInv()"]'],['movement','cashboxes','.cashboxes form button[type="submit"]'],['statement','companies','[onclick="wfOpenStatement()"]'],['refresh','exchange','.curr-refresh'],['calculator','exchange','.curr-item[onclick="openCurrCalc(\'usd-try\')"]'],
  ['packagePrint','package-labels','#wfPackagePrint','wfPackagePrint'],['costSave','product-costs','#wfCostSave','wfCostSave'],['costSearch','product-costs','#wfCostProductSearch','wfCostProductSearch'],['archiveSearch','invoice-archive','#wfArchiveSearch','wfArchiveSearch'],
  ['scan','quick-barcode','#qblScanMode','qblScanMode'],['browse','quick-barcode','#qblBrowseMode','qblBrowseMode'],['search','quick-barcode','.qbl-search-trigger'],['cancel','quick-barcode','#qblCancelTierBtn','qblCancelTierBtn'],['changeTier','quick-barcode','[onclick="qblChangeTier()"]'],['addCart','quick-barcode','[onclick="qblAddToInvoice()"]'],['cartInvoice','cart','#wfCartCreateInvoice','wfCartCreateInvoice']
 ])original[name]=target(page,sel,id);
 for(const [page,id] of [['companies','coSearch'],['products','prSearch'],['invoices','invSearch']])target(page,'.wf-search-toggle[aria-controls="'+id+'"]');
 for(const [page,fn] of [['select-client-type','selectTypeAndContinue'],['select-invoice-type','selectInvTypeAndContinue']])for(const type of ['external','internal_retail','internal_wholesale'])original[page+type]=target(page,`[onclick="${fn}('${type}',event)"]`);
 for(const tier of ['A','B','C'])original[tier]=target('quick-barcode',`#qblTierBtns [data-tier="${tier}"]`);
 const tierOverlay=ids.qblPhase2=new El('qblPhase2'),tierCard=ids.qblTierCard=new El('qblTierCard');
 tierOverlay.style.opacity='0';tierOverlay.style.pointerEvents='none';ids['page-quick-barcode'].append(tierOverlay);tierOverlay.append(tierCard);tierCard.append(original.cancel,original.A,original.B,original.C);
 const form=ids['pr-form-view']=new El('pr-form-view');form.visible=false;ids['page-add-product'].append(form);form.append(original.productSave,original.productReset,original.changeType);
 const upperBack={};for(const page of pages){const b=upperBack[page]=target(page,'.sct-back-btn[onclick="goBack()"]');b.className='sct-back-btn';b.setAttribute('onclick','goBack()');}
 const cart=ids.qblCartFab=new El('qblCartFab');body.append(cart);let modals=[];
 const doc={documentElement:root,body,scrollingElement:root,getElementById:id=>ids[id],querySelector:sel=>sel==='.page.active'?pages.map(p=>ids['page-'+p]).find(p=>p.classes.has('active'))||null:body.querySelector(sel),querySelectorAll:sel=>sel==='.page'?pages.map(p=>ids['page-'+p]):sel.startsWith('dialog[open]')?modals:body.querySelectorAll(sel)};
 const events=new Map();
 const win={scrollY:0,addEventListener(type,listener){const listeners=events.get(type)||[];listeners.push(listener);events.set(type,listeners);},dispatchEvent(event){for(const listener of events.get(event.type)||[])listener(event);},showPage:p=>calls.routes.push(p),goBack:()=>calls.back++,wfToggleDesktopSidebar:()=>calls.menu++,scrollTo:()=>{win.scrollY=0;root.scrollTop=0;},bnavMoveToIndex:i=>{calls.moves.push(i);buttons.forEach((b,n)=>{b.classList.toggle('bnav-active',n===i);if(n===i)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');});}};
 const media={matches:mobile,listeners:[],addEventListener(name,callback){this.listeners.push(callback);}};
 const ctx={document:doc,window:win,QBL:{phase:1},requestAnimationFrame:fn=>queue.push(fn),MutationObserver:class{constructor(callback){this.callback=callback;}observe(target,options){observers.push({target,options,callback:this.callback});}disconnect(){}},matchMedia:()=>media,getComputedStyle:el=>({display:el.style.display||(!el.visible||el.hasAttribute('data-wf-shared-dock-source')&&el.closest('.wf-shared-actions-docked')?'none':'block'),visibility:el.style.visibility||'visible',opacity:el.style.opacity||'1',pointerEvents:el.style.pointerEvents||'auto'})};vm.runInNewContext(controller,ctx);
 const flush=()=>{let n=0;while(queue.length&&n++<100)queue.shift()();assert(n<100,'observer work must settle');};flush();
 const sync=()=>{ctx.navTest.sync();flush();};
 const activate=p=>{for(const name of pages)ids['page-'+name].classList.toggle('active',name===p);sync();};
 const click=i=>{let stopped=false;const event={target:buttons[i],preventDefault(){},stopImmediatePropagation(){stopped=true;}};for(const fn of nav.events.click||[]){fn(event);if(stopped)break;}if(!stopped)buttons[i].click();flush();};
 const notifyNav=records=>{for(const observer of observers.filter(item=>item.target===nav))observer.callback(records);flush();};
 const notifyRoot=()=>{for(const observer of observers.filter(item=>item.target===root))observer.callback([{target:root,attributeName:'class'}]);flush();};
 return {ctx,ids,root,body,nav,buttons,calls,original,upperBack,cart,form,tierOverlay,target,activate,click,sync,flush,notifyNav,notifyRoot,setBarcodePhase(phase){ctx.QBL.phase=phase;tierOverlay.style.opacity=phase===2?'1':'0';tierOverlay.style.pointerEvents=phase===2?'auto':'none';sync();},setCompact(value){media.matches=value;media.listeners.forEach(fn=>fn());flush();},emit:type=>{win.dispatchEvent({type});flush();},setModals:m=>modals=m};
}

function recordWrites(element,writes){
 for(const name of ['setAttribute','removeAttribute']){const original=element[name];element[name]=function(...args){writes.push([this.id,name,...args]);return original.apply(this,args);};}
 for(const name of ['add','remove','toggle']){const original=element.classList[name];element.classList[name]=function(...args){writes.push([element.id,'class '+name,...args]);return original.apply(this,args);};}
 for(const name of ['hidden','disabled','title','textContent','innerHTML']){let value=element[name];Object.defineProperty(element,name,{get:()=>value,set(next){writes.push([element.id,name,next]);value=next;},configurable:true});}
 element.dataset=new Proxy(element.dataset,{set(target,name,value){writes.push([element.id,'data '+name,value]);target[name]=value;return true;},deleteProperty(target,name){writes.push([element.id,'delete data '+name]);delete target[name];return true;}});
 element.children.forEach(child=>recordWrites(child,writes));
}

test('settled dock refreshes do not mutate controls, including disabled busy actions',()=>{
 const a=setup({mobile:true});a.activate('add-company');a.original.clientSave.setAttribute('aria-busy','true');a.sync();
 const writes=[];recordWrites(a.nav,writes);a.sync();a.sync();assert.deepEqual(writes,[]);
 assert(a.buttons[4].disabled);assert.equal(a.buttons[4].getAttribute('aria-busy'),'true');
 a.original.clientSave.removeAttribute('aria-busy');a.sync();assert.equal(a.buttons[4].disabled,false);assert.equal(a.buttons[4].getAttribute('aria-busy'),null);
 assert.equal(writes.filter(([id,kind])=>id==='bnav-4'&&kind==='disabled').length,1);writes.length=0;a.sync();assert.deepEqual(writes,[]);
});

test('one availability refresh resolves each visible source once and activation still rechecks its current guard',()=>{
 const a=setup({mobile:true});a.activate('select-client-type');const original=a.original['select-client-typeexternal'];let reads=0;
 const measure=original.getClientRects;original.getClientRects=function(){reads++;return measure.call(this);};
 a.sync();assert.equal(reads,1,'busy and availability share the same resolved original control');
 original.setAttribute('aria-disabled','true');a.click(1);assert.equal(original.clicks,0,'a stale enabled footer cannot bypass a newly disabled source');
 original.removeAttribute('aria-disabled');a.sync();a.click(1);assert.equal(original.clicks,1);
});

test('unrelated root classes skip action scans while boot and Home state still refresh the menu',()=>{
 const a=setup({mobile:true});a.activate('select-client-type');const page=a.ids['page-select-client-type'],original=a.original['select-client-typeexternal'];let reads=0;
 const measure=original.getClientRects;original.getClientRects=function(){reads++;return measure.call(this);};
 a.root.classList.add('wf-dashboard-scrolled');a.notifyRoot();a.root.classList.add('wf-home-customizer-open');a.notifyRoot();assert.equal(reads,0);
 page.style.opacity='0';a.root.classList.add('wf-booting');a.notifyRoot();assert(a.buttons[1].disabled);
 page.style.opacity='1';a.root.classList.remove('wf-booting');a.notifyRoot();assert.equal(a.buttons[1].disabled,false);
 a.root.classList.add('wf-home-scroll-top');a.notifyRoot();assert.equal(a.buttons[2].title,'للأعلى');a.click(1);assert.equal(original.clicks,1);
});

test('mobile form actions use their hidden original sources and restore the desktop controls',()=>{
 const a=setup({mobile:true});a.activate('add-company');
 for(const target of [a.original.clientSave,a.original.clientReset,a.upperBack['add-company']]){assert(target.hasAttribute('data-wf-shared-dock-source'));assert.equal(target.getClientRects().length,0);}
 assert.equal(a.buttons[4].disabled,false);a.click(4);a.click(3);a.click(0);
 assert.equal(a.original.clientSave.clicks,1);assert.equal(a.original.clientReset.clicks,1);assert.equal(a.calls.back,1);
 a.setCompact(false);
 for(const target of [a.original.clientSave,a.original.clientReset,a.upperBack['add-company']]){assert(!target.hasAttribute('data-wf-shared-dock-source'));assert.equal(target.getClientRects().length,1);}
 a.click(4);assert.equal(a.original.clientSave.clicks,2);
 a.setCompact(true);a.activate('products');assert(!a.original.clientSave.hasAttribute('data-wf-shared-dock-source'));
 assert(!a.upperBack.products.hasAttribute('data-wf-shared-dock-source'),'list navigation has no duplicate bottom Back');
});

test('only current whitelisted button actions are docked; data and unmapped actions remain visible',()=>{
 const a=setup({mobile:true});a.activate('add-product');
 assert(!a.original.productSave.hasAttribute('data-wf-shared-dock-source'));
 a.form.visible=true;a.sync();
 assert(a.original.productSave.hasAttribute('data-wf-shared-dock-source'));assert(a.original.changeType.hasAttribute('data-wf-shared-dock-source'));
 assert(!a.original.productReset.hasAttribute('data-wf-shared-dock-source'));assert.equal(a.original.productReset.getClientRects().length,1);
 a.click(4);a.click(3);assert.equal(a.original.productSave.clicks,1);assert.equal(a.original.changeType.clicks,1);
 a.form.visible=false;a.sync();assert(!a.original.productSave.hasAttribute('data-wf-shared-dock-source'));assert(!a.original.changeType.hasAttribute('data-wf-shared-dock-source'));
 a.activate('exchange');assert(!a.original.calculator.hasAttribute('data-wf-shared-dock-source'));assert(a.original.refresh.hasAttribute('data-wf-shared-dock-source'));
 a.activate('select-client-type');assert(!a.original['select-client-typeexternal'].hasAttribute('data-wf-shared-dock-source'));assert(!a.upperBack['select-client-type'].hasAttribute('data-wf-shared-dock-source'));
 a.setBarcodePhase(2);a.activate('quick-barcode');for(const tier of ['A','B','C'])assert(!a.original[tier].hasAttribute('data-wf-shared-dock-source'));
});

test('docked sources respect inherited disabled, busy, inert, hidden stages, and blocking modals',()=>{
 const a=setup({mobile:true}),fieldset=new El;fieldset.tagName='FIELDSET';a.ids['page-add-company'].append(fieldset);fieldset.append(a.original.clientSave);a.activate('add-company');
 fieldset.disabled=true;a.click(4);assert.equal(a.original.clientSave.clicks,0,'stale enabled menu state cannot bypass a disabled fieldset');a.sync();assert(a.buttons[4].disabled);a.click(4);assert.equal(a.original.clientSave.clicks,0);
 fieldset.disabled=false;a.original.clientSave.setAttribute('aria-busy','true');a.sync();assert(a.buttons[4].disabled);a.click(4);assert.equal(a.original.clientSave.clicks,0);
 a.original.clientSave.removeAttribute('aria-busy');fieldset.setAttribute('inert','');a.sync();assert(a.buttons[4].disabled);a.click(4);assert.equal(a.original.clientSave.clicks,0);
 fieldset.removeAttribute('inert');fieldset.hidden=true;a.sync();assert(a.buttons[4].disabled);a.click(4);assert.equal(a.original.clientSave.clicks,0);
 fieldset.hidden=false;a.sync();a.original.clientSave.hidden=true;a.sync();assert(a.buttons[4].disabled);a.click(4);assert.equal(a.original.clientSave.clicks,0);
 a.original.clientSave.hidden=false;a.sync();a.original.clientSave.style.display='none';a.sync();assert(a.buttons[4].disabled);a.click(4);assert.equal(a.original.clientSave.clicks,0);
 delete a.original.clientSave.style.display;a.sync();const modal=new El('other');a.body.append(modal);a.setModals([modal]);a.click(4);assert.equal(a.original.clientSave.clicks,0);
 a.setModals([]);a.click(4);assert.equal(a.original.clientSave.clicks,1);
});

test('list Add and Search use original controls while dock visibility controls duplication',()=>{
 const a=setup({mobile:true});a.activate('products');
 const search=a.ids['page-products'].querySelector('.wf-search-toggle[aria-controls="prSearch"]');
 assert(a.original.addProduct.hasAttribute('data-wf-shared-dock-source'));assert(search.hasAttribute('data-wf-shared-dock-source'));
 a.click(1);a.click(4);assert.equal(a.original.addProduct.clicks,1);assert.equal(search.clicks,1);
 a.original.addProduct.setAttribute('aria-disabled','true');a.sync();assert(a.buttons[1].disabled);a.click(1);assert.equal(a.original.addProduct.clicks,1);
 a.nav.visible=false;a.sync();assert(!a.original.addProduct.hasAttribute('data-wf-shared-dock-source'));assert(!search.hasAttribute('data-wf-shared-dock-source'));
 a.nav.visible=true;a.sync();assert(a.original.addProduct.hasAttribute('data-wf-shared-dock-source'));a.activate('settings');assert(!a.original.addProduct.hasAttribute('data-wf-shared-dock-source'));assert(!a.ids['page-settings'].classList.contains('wf-shared-actions-docked'));
});

test('entry animation and visibility transition completion refresh initially hidden controls without polling',()=>{
 const a=setup({mobile:true}),page=a.ids['page-select-client-type'];
 const finish=(type,propertyName)=>{for(const listener of page.events[type]||[])listener({type,target:page,propertyName});a.flush();};
 page.style.opacity='0';a.activate('select-client-type');assert(a.buttons[1].disabled);
 page.style.opacity='1';finish('animationend');assert.equal(a.buttons[1].disabled,false);a.click(1);assert.equal(a.original['select-client-typeexternal'].clicks,1);
 page.style.opacity='0';a.sync();assert(a.buttons[1].disabled);page.style.opacity='1';finish('transitionend','background-color');assert(a.buttons[1].disabled,'cosmetic transitions do not trigger availability scans');
 finish('transitionend','opacity');assert.equal(a.buttons[1].disabled,false);
 a.activate('products');finish('animationend');assert.equal(a.nav.dataset.section,'products');assert.equal(a.original['select-client-typeexternal'].clicks,1);
});

function attachSettingsCoordinator(a,overrides={}){
 const dialog=new El('wfSettingsDialog'),footer=new El,oldSave=new El,oldLabel=new El('','bnav-label settings-save-label');
 dialog.open=true;dialog.close=()=>{dialog.open=false;};footer.tagName='FOOTER';footer.visible=false;footer.append(oldSave);
 dialog.selectors.set('footer button[onclick="saveSettings()"]',[oldSave]);dialog.append(footer,a.nav);a.ids.wfSettingsDialog=dialog;a.ids['page-settings'].append(dialog);a.setModals([dialog]);a.buttons[2].append(oldLabel);
 const state={open:true,key:'invoice',editable:true,busy:false,canSave:false,canCancel:true,canBack:true,primaryLabel:'Save',primaryIcon:'save',backLabel:'Back',cancelLabel:'Cancel',...overrides},runs=[];
 a.ctx.window.WFSettingsActions={getState:()=>state,canRun:name=>state.open&&!state.busy&&(name==='primary'?(state.editable?state.canSave:state.canBack):name==='cancel'?state.canCancel:state.canBack),run:name=>{runs.push(name);return true;}};
 a.activate('settings');
 return {dialog,oldSave,oldLabel,state,runs,update(values){Object.assign(state,values);a.emit('wf-settings-actions-change');}};
}

test('the shared settings menu renders only original slots and delegates Save, Cancel and Back without Home fallthrough',()=>{
 const a=setup(),s=attachSettingsCoordinator(a,{canSave:true});
 assert.deepEqual(a.buttons.filter(button=>!button.hidden).map(button=>button.id),['bnav-0','bnav-2','bnav-4']);
 assert.deepEqual(a.buttons.filter(button=>!button.hidden).map(button=>button.getAttribute('aria-label')),['Back','Save','Cancel']);
 assert.equal(a.buttons[2].querySelector('.bnav-label:not(.settings-save-label)').getAttribute('aria-hidden'),null);
 assert.equal(s.oldLabel.getAttribute('aria-hidden'),'true');assert.equal(s.runs.length,0);assert.equal(s.oldSave.clicks,0);
 a.ctx.window.scrollY=300;a.buttons[2].addEventListener('click',()=>a.ctx.window.showPage('dashboard'));
 a.click(2);a.click(4);a.click(0);
 assert.deepEqual(s.runs,['primary','cancel','back']);assert.equal(s.oldSave.clicks,0);
 assert.equal(a.calls.routes.length,0);assert.equal(a.calls.back,0);assert.equal(a.ctx.window.scrollY,300);
 for(const button of a.buttons)assert.equal(button.getAttribute('aria-current'),null);
});

test('settings availability is rechecked on activation and busy events disable every visible shared action',()=>{
 const a=setup(),s=attachSettingsCoordinator(a);
 assert.equal(a.buttons[2].disabled,true);a.click(2);assert.equal(s.runs.length,0);
 s.update({canSave:true});assert.equal(a.buttons[2].disabled,false);
 s.state.canSave=false;a.click(2);assert.equal(s.runs.length,0,'a stale enabled button cannot bypass the coordinator guard');
 s.update({canSave:true,busy:true,primaryLabel:'Saving',primaryIcon:'loading'});
 for(const i of [0,2,4]){assert.equal(a.buttons[i].disabled,true);assert.equal(a.buttons[i].getAttribute('aria-busy'),'true');a.click(i);}
 assert.equal(a.buttons[2].title,'Saving');assert.match(a.buttons[2].querySelector('.bnav-icon').innerHTML,/data-wf-nav-icon="loading"/);
 assert.equal(s.runs.length,0);
 s.update({busy:false,canSave:false,primaryLabel:'Saved',primaryIcon:'check'});
 assert.equal(a.buttons[0].disabled,false);assert.equal(a.buttons[4].disabled,false);assert.equal(a.buttons[2].disabled,true);
 for(const i of [0,2,4])assert.equal(a.buttons[i].getAttribute('aria-busy'),null);
});

test('settings context and locale changes refresh labels and icons, and legacy Home refresh cannot replace their accessible names',()=>{
 const a=setup(),s=attachSettingsCoordinator(a,{canSave:true});
 for(const [lang,save,cancel,back]of [['ar','حفظ','إلغاء','رجوع'],['en','Save','Cancel','Back'],['tr','Kaydet','İptal','Geri'],['fr','Enregistrer','Annuler','Retour'],['ru','Сохранить','Отмена','Назад']]){
  a.root.lang=lang;a.root.dir=lang==='ar'?'rtl':'ltr';s.update({primaryLabel:save,cancelLabel:cancel,backLabel:back});
  assert.equal(a.buttons[2].querySelector('.bnav-label:not(.settings-save-label)').textContent,save);
  assert.equal(a.buttons[4].getAttribute('aria-label'),cancel);assert.equal(a.buttons[0].getAttribute('aria-label'),back);
  const center=a.buttons[2];center.setAttribute('aria-label','Home');center.title='Home';a.notifyNav([{target:center,attributeName:'aria-label'},{target:center,attributeName:'title'}]);
  assert.equal(center.getAttribute('aria-label'),save);assert.equal(center.title,save);
 }
 s.update({key:'currency:feed',primaryLabel:'Refresh',primaryIcon:'refresh'});
 assert.equal(a.buttons[2].title,'Refresh');assert.match(a.buttons[2].querySelector('.bnav-icon').innerHTML,/data-wf-nav-icon="refresh"/);
 a.ctx.window.bnavMoveToIndex(4);a.flush();assert.equal(a.buttons[2].classList.contains('bnav-active'),true);
 assert.equal(a.calls.routes.length,0);assert.equal(s.runs.length,0);
});

test('automatic settings show Done without editable controls and leaving settings restores the original Home menu',()=>{
 const a=setup(),s=attachSettingsCoordinator(a,{key:'appearance',editable:false,canSave:false,canCancel:false,primaryLabel:'Done',primaryIcon:'check'});
 assert.deepEqual(a.buttons.filter(button=>!button.hidden).map(button=>button.id),['bnav-2']);
 assert.equal(a.buttons[2].disabled,false);a.click(2);assert.deepEqual(s.runs,['primary']);assert.equal(a.calls.routes.length,0);
 s.update({open:false});s.dialog.open=false;a.body.append(a.nav);a.setModals([]);a.activate('dashboard');
 assert.equal(a.buttons.filter(button=>!button.hidden).length,5);assert.equal(a.buttons[2].getAttribute('aria-label'),'الرئيسية');
 assert.equal(s.oldLabel.getAttribute('aria-hidden'),'true');assert.equal(a.buttons[2].getAttribute('aria-current'),'page');
 a.activate('companies');a.click(2);assert.deepEqual(a.calls.routes,['dashboard']);assert.deepEqual(s.runs,['primary']);
});

test('leaving settings restores the prior Home icon and the next settings visit renders Save again',()=>{
 const a=setup(),icon=a.buttons[2].querySelector('.bnav-icon');
 const home='<svg data-original-home="true"><path d="M3 10 12 3 21 10"/></svg>';icon.innerHTML=home;
 const s=attachSettingsCoordinator(a,{canSave:true});
 assert.match(icon.innerHTML,/data-wf-nav-icon="save"/);assert.notEqual(icon.innerHTML,home);
 s.update({open:false});s.dialog.open=false;a.body.append(a.nav);a.setModals([]);a.activate('dashboard');
 assert.equal(icon.innerHTML,home);assert.equal(icon.dataset.wfContextIcon,undefined);
 s.dialog.open=true;s.dialog.append(a.nav);a.setModals([s.dialog]);s.update({open:true,key:'robot'});a.activate('settings');
 assert.match(icon.innerHTML,/data-wf-nav-icon="save"/);assert.equal(a.buttons[2].getAttribute('aria-label'),'Save');
 s.update({open:false});s.dialog.open=false;a.body.append(a.nav);a.setModals([]);a.activate('dashboard');assert.equal(icon.innerHTML,home);
 assert.equal(s.runs.length,0);assert.equal(a.calls.routes.length,0);
});

test('the settings directory uses normal contextual navigation when its editor is closed and the coordinator remains installed',()=>{
 const a=setup(),icon=a.buttons[2].querySelector('.bnav-icon');
 const home='<svg data-original-home="true"><path d="M3 10 12 3 21 10"/></svg>';icon.innerHTML=home;
 const s=attachSettingsCoordinator(a,{canSave:true});
 s.dialog.open=false;a.body.append(a.nav);a.setModals([]);s.update({open:false});
 assert.equal(a.ids['page-settings'].classList.contains('active'),true,'the section directory remains the active page');
 assert.equal(a.nav.dataset.section,'settings');assert.equal(a.nav.dataset.taskMode,'context');
 assert.equal(a.buttons.filter(button=>!button.hidden).length,5);
 assert.equal(a.buttons[2].getAttribute('aria-label'),'الرئيسية');assert.equal(a.buttons[2].title,'الرئيسية');
 assert.equal(a.buttons[2].querySelector('.bnav-label:not(.settings-save-label)').textContent,'الرئيسية');
 assert.equal(s.oldLabel.getAttribute('aria-hidden'),'true');assert.equal(icon.innerHTML,home);
 a.ctx.window.scrollY=220;a.click(2);assert.equal(a.ctx.window.scrollY,0);assert.equal(a.calls.routes.length,0);
 for(const index of [2,0,1,3,4])a.click(index);
 assert.deepEqual(a.calls.routes,['dashboard','companies','products','invoices','quick-barcode']);
 assert.equal(s.runs.length,0);assert.equal(s.oldSave.clicks,0);assert.equal(a.calls.back,0);
});

test('a separate active modal blocks shared settings actions without forwarding the old footer or navigation',()=>{
 const a=setup(),s=attachSettingsCoordinator(a,{canSave:true}),other=new El('confirmation');other.open=true;a.body.append(other);a.setModals([s.dialog,other]);
 a.click(0);a.click(2);a.click(4);assert.equal(s.runs.length,0);assert.equal(s.oldSave.clicks,0);assert.equal(a.calls.routes.length,0);
 a.setModals([s.dialog]);a.click(2);assert.deepEqual(s.runs,['primary']);
});
test('all actual sections have five scoped controls, correct primary actions, and no actions on entry',()=>{
 const a=setup(),expected={dashboard:2,companies:0,products:0,cart:3,invoices:0,'select-client-type':0,'add-company':4,'add-product':3,'select-invoice-type':0,'create-invoice':4,'payment-management':4,reports:3,exchange:4,cashboxes:4,'quick-barcode':4,settings:2,'package-labels':4,'product-costs':4,'invoice-archive':3};
 for(const page of pages){a.activate(page);const config=a.ctx.navTest.configuration(a.ids['page-'+page]);assert.equal(config.items.length,5,page);assert.equal(config.active,expected[page],page);assert.equal(a.nav.dataset.section,page);assert.equal(a.buttons.filter(b=>b.classList.contains('bnav-active')).length,1);for(const item of config.items){assert(item.icon&&item.label,page);if(item.kind==='route')assert(a.ids['page-'+item.page],item.page);}}
 assert.equal(a.calls.routes.length,0);assert.equal(a.calls.back,0);assert.equal(Object.values(a.original).reduce((n,b)=>n+b.clicks,0),0);
});
test('save, reset, payment and cash form actions click exact original controls and respect busy/hidden guards',()=>{
 const a=setup();for(const [page,index,name] of [['add-company',4,'clientSave'],['add-company',3,'clientReset'],['create-invoice',4,'invoiceSave'],['create-invoice',3,'preview'],['payment-management',4,'payment'],['cashboxes',4,'movement'],['companies',3,'statement'],['exchange',4,'refresh'],['exchange',1,'calculator']]){a.activate(page);a.click(index);assert.equal(a.original[name].clicks,1,name);assert.equal(a.buttons[index].getAttribute('aria-current'),null);}
 a.activate('add-company');a.original.clientSave.disabled=true;a.sync();assert(a.buttons[4].disabled);a.click(4);assert.equal(a.original.clientSave.clicks,1);a.original.clientSave.disabled=false;a.original.clientSave.visible=false;a.sync();assert(a.buttons[4].disabled);a.click(4);assert.equal(a.original.clientSave.clicks,1);
});
test('type choices and product form forward to existing controls without selecting on render',()=>{
 const a=setup();for(const page of ['select-client-type','select-invoice-type'])for(const [index,type] of [[1,'external'],[3,'internal_retail'],[4,'internal_wholesale']]){a.activate(page);a.click(index);assert.equal(a.original[page+type].clicks,1);}
 a.activate('add-product');a.click(3);assert(a.original.types.focused);assert(a.original.types.scrolled);assert.equal(a.original.productSave.clicks,0);a.form.visible=true;a.sync();assert(a.buttons[4].classList.contains('bnav-active'));a.click(4);assert.equal(a.original.productSave.clicks,1);a.click(3);assert.equal(a.original.changeType.clicks,1);
});
test('barcode controls follow scan, browse, tier and result stages without starting the camera on render',()=>{
 const a=setup();a.activate('quick-barcode');assert.equal(a.original.scan.clicks,0);a.click(4);assert.equal(a.original.scan.clicks,1);a.click(0);assert.equal(a.original.browse.clicks,1);a.original.browse.setAttribute('aria-pressed','true');a.sync();assert(a.buttons[0].classList.contains('bnav-active'));
 a.setBarcodePhase(2);for(const [index,tier] of [[1,'A'],[3,'B'],[4,'C']]){a.click(index);assert.equal(a.original[tier].clicks,1);assert(a.buttons[index].title.endsWith(tier));}a.click(0);assert.equal(a.original.cancel.clicks,1);
 a.setBarcodePhase(3);a.click(4);a.click(1);a.click(3);a.click(0);assert.equal(a.original.addCart.clicks,1);assert.equal(a.original.changeTier.clicks,1);assert.equal(a.cart.clicks,0);assert.equal(a.calls.routes.at(-1),'cart');assert.equal(a.calls.back,1);
});
test('the mobile tier overlay exposes its shared menu layer only while visible and Cancel clears the stage',()=>{
 const a=setup({mobile:true}),page=a.ids['page-quick-barcode'];a.activate('quick-barcode');
 a.ctx.QBL.phase=2;a.sync();
 assert.equal(a.nav.getAttribute('data-context-stage'),null);assert.equal(page.getAttribute('data-context-stage'),null);
 assert(a.buttons[0].disabled,'a pending phase change cannot expose controls from an invisible overlay');
 a.setBarcodePhase(2);
 assert.equal(a.nav.getAttribute('data-context-stage'),'price-tier');assert.equal(page.getAttribute('data-context-stage'),'price-tier');
 assert.equal(a.buttons[0].disabled,false);assert(a.original.cancel.hasAttribute('data-wf-shared-dock-source'));
 assert.equal(a.original.cancel.clicks,0);for(const tier of ['A','B','C'])assert.equal(a.original[tier].clicks,0);
 const modal=new El('separate-modal');a.body.append(modal);a.setModals([modal]);a.click(0);a.click(1);
 assert.equal(a.original.cancel.clicks,0);assert.equal(a.original.A.clicks,0,'the raised stage menu still respects unrelated modals');
 a.setModals([]);a.original.cancel.onclick=()=>{a.ctx.QBL.phase=1;a.tierOverlay.style.opacity='0';a.tierOverlay.style.pointerEvents='none';};a.click(0);
 assert.equal(a.original.cancel.clicks,1);assert.equal(a.nav.getAttribute('data-context-stage'),null);assert.equal(page.getAttribute('data-context-stage'),null);
 assert(!a.original.cancel.hasAttribute('data-wf-shared-dock-source'));assert.equal(a.buttons[4].disabled,false);
});
test('tier layer state restores on overlay hiding, desktop resize, dock hiding and routing away',()=>{
 const a=setup({mobile:true}),page=a.ids['page-quick-barcode'];a.setBarcodePhase(2);a.activate('quick-barcode');
 assert.equal(a.nav.getAttribute('data-context-stage'),'price-tier');
 a.tierOverlay.style.pointerEvents='none';a.sync();assert.equal(a.nav.getAttribute('data-context-stage'),null);assert.equal(page.getAttribute('data-context-stage'),null);
 a.tierOverlay.style.pointerEvents='auto';a.sync();assert.equal(a.nav.getAttribute('data-context-stage'),'price-tier');
 a.setCompact(false);assert.equal(a.nav.getAttribute('data-context-stage'),null);assert.equal(page.getAttribute('data-context-stage'),null);assert(!a.original.cancel.hasAttribute('data-wf-shared-dock-source'));
 a.setCompact(true);assert.equal(a.nav.getAttribute('data-context-stage'),'price-tier');
 a.nav.hidden=true;a.sync();assert.equal(a.nav.getAttribute('data-context-stage'),null);assert(!a.original.cancel.hasAttribute('data-wf-shared-dock-source'));
 a.nav.hidden=false;a.sync();assert.equal(a.nav.getAttribute('data-context-stage'),'price-tier');
 a.activate('products');assert.equal(a.nav.getAttribute('data-context-stage'),null);assert.equal(page.getAttribute('data-context-stage'),null);assert(!a.original.cancel.hasAttribute('data-wf-shared-dock-source'));
 a.activate('quick-barcode');assert.equal(a.nav.getAttribute('data-context-stage'),'price-tier');
 page.classList.remove('active');a.sync();assert.equal(a.nav.getAttribute('data-context-stage'),null);assert.equal(page.getAttribute('data-context-stage'),null);
});
test('Cart navigation works with a hidden legacy FAB and invoice transfer requires the enabled page action',()=>{
 const a=setup();a.cart.hidden=true;a.activate('quick-barcode');assert(!a.buttons[3].disabled);a.click(3);assert.equal(a.calls.routes.at(-1),'cart');
 a.activate('cart');assert.equal(a.original.cartInvoice.clicks,0);a.click(4);assert.equal(a.original.cartInvoice.clicks,1);
 a.original.cartInvoice.disabled=true;a.sync();assert(a.buttons[4].disabled);a.click(4);assert.equal(a.original.cartInvoice.clicks,1);
 a.click(1);assert.equal(a.calls.routes.at(-1),'products');a.click(0);assert.equal(a.calls.back,1);
});
test('Home scrolls before routing, active location survives legacy refresh, and five locales translate labels',()=>{
 const a=setup();a.activate('companies');a.ctx.window.scrollY=250;a.click(2);assert.equal(a.ctx.window.scrollY,0);assert.equal(a.calls.routes.length,0);a.click(2);assert.equal(a.calls.routes[0],'dashboard');a.ctx.window.bnavMoveToIndex(4);a.flush();assert(a.buttons[0].classList.contains('bnav-active'));assert.equal(a.buttons[0].getAttribute('aria-current'),'page');
 for(const [lang,label] of [['ar','إضافة عميل'],['en','Add client'],['tr','Müşteri ekle'],['fr','Nouveau client'],['ru','Новый клиент']]){a.root.lang=lang;a.sync();assert.equal(a.buttons[1].title,label);assert.equal(a.buttons[1].getAttribute('aria-label'),label);}
});
test('settings Save works through its CSS-hidden footer; disabled and Close sections never save',()=>{
 const a=setup(),dialog=new El('wfSettingsDialog'),footer=new El,save=new El;footer.tagName='FOOTER';footer.visible=false;dialog.open=true;dialog.close=()=>{dialog.open=false;};dialog.selectors.set('footer button[onclick="saveSettings()"]',[save]);footer.append(save);dialog.append(footer,a.nav);a.ids.wfSettingsDialog=dialog;a.ids['page-settings'].append(dialog);a.setModals([dialog]);a.activate('settings');a.ctx.window.scrollY=300;a.click(2);assert.equal(save.clicks,1);assert.equal(a.ctx.window.scrollY,300);assert.equal(a.calls.routes.length,0);
 save.disabled=true;a.click(2);assert.equal(save.clicks,1);save.disabled=false;footer.hidden=true;a.click(2);assert.equal(save.clicks,1);a.nav.classList.add('settings-close-action');a.click(2);assert.equal(dialog.open,false);
 a.activate('add-company');a.body.append(a.nav);const other=new El;other.open=true;a.body.append(other);a.setModals([other]);a.click(4);assert.equal(a.original.clientSave.clicks,0);
});
test('settings action keeps Save/Close accessibility after the legacy Home controller refreshes and never forwards Home',()=>{
 const a=setup(),dialog=new El('wfSettingsDialog'),footer=new El,save=new El,settingsLabel=new El('','bnav-label settings-save-label');footer.tagName='FOOTER';footer.visible=false;dialog.open=true;dialog.close=()=>{dialog.open=false;};dialog.selectors.set('footer button[onclick="saveSettings()"]',[save]);footer.append(save);dialog.append(footer,a.nav);a.ids.wfSettingsDialog=dialog;a.ids['page-settings'].append(dialog);a.buttons[2].append(settingsLabel);a.setModals([dialog]);a.activate('settings');
 const center=a.buttons[2],homeLabel=center.querySelector('.bnav-label:not(.settings-save-label)');
 assert.equal(center.getAttribute('aria-label'),'حفظ');assert.equal(settingsLabel.textContent,'حفظ');assert.equal(homeLabel.getAttribute('aria-hidden'),'true');
 center.setAttribute('aria-label','الرئيسية');center.title='الرئيسية';a.notifyNav([{target:center,attributeName:'aria-label'},{target:center,attributeName:'title'}]);assert.equal(center.getAttribute('aria-label'),'حفظ');assert.equal(center.title,'حفظ');
 center.addEventListener('click',()=>a.ctx.window.showPage('dashboard'));save.onclick=()=>a.ctx.window.goBack();a.click(2);assert.equal(save.clicks,1);assert.equal(a.calls.back,1,'the original Save may navigate through its own goBack');assert.equal(a.calls.routes.length,0,'the dock must never also forward Home');
 footer.hidden=true;a.nav.classList.add('settings-close-action');a.notifyNav([{target:a.nav,attributeName:'class'}]);assert.equal(center.getAttribute('aria-label'),'إغلاق');assert.equal(settingsLabel.textContent,'إغلاق');a.click(2);assert.equal(dialog.open,false);assert.equal(save.clicks,1);assert.equal(a.calls.routes.length,0);
 a.body.append(a.nav);a.setModals([]);a.activate('dashboard');assert.equal(center.getAttribute('aria-label'),'الرئيسية');assert.equal(homeLabel.getAttribute('aria-hidden'),null);assert.equal(settingsLabel.getAttribute('aria-hidden'),'true');
});
test('original desktop filter controls and counts return to their pages on mobile',()=>{
 const root=new El,body=new El,ids={},observers=[],queue=[],media={matches:false,addEventListener:(name,fn)=>media.change=fn};root.lang='ar';let page='';const S={coTabFilter:'all',prTabFilter:'all',invTabFilter:'all'};
 for(const [key,id,state] of [['companies','coStatsBar','coTabFilter'],['products','prStatsBar','prTabFilter'],['invoices','invStatsBar','invTabFilter']]){const section=ids['page-'+key]=new El,bar=ids[id]=new El;section.append(bar);body.append(section);for(const value of ['all','external']){const pill=new El('','co-stat-pill');pill.setAttribute('onclick',`filter('${value}')`);pill.onclick=()=>S[state]=value;bar.append(pill);}}
 ids['page-companies'].classList.add('active');const doc={documentElement:root,body,getElementById:id=>ids[id],createComment:()=>new El,createElement:()=>new El};vm.runInNewContext(source,{document:doc,S,window:{showPage:p=>page=p},requestAnimationFrame:fn=>queue.push(fn),matchMedia:()=>media,MutationObserver:class{constructor(fn){observers.push(fn);}observe(){}}});
 const flush=()=>{while(queue.length)queue.shift()();},sync=()=>{observers.forEach(fn=>fn());flush();};const dock=body.children.find(x=>x.id==='wfContextNav'),bar=ids.coStatsBar,pill=bar.children[1];assert.equal(bar.parentElement,dock);assert.equal(pill.getAttribute('role'),'button');let prevented=false;pill.events.keydown[0]({key:' ',preventDefault:()=>prevented=true});flush();assert(prevented);assert.equal(S.coTabFilter,'external');assert.equal(pill.getAttribute('aria-pressed'),'true');
 media.matches=true;media.change();flush();assert(dock.hidden);assert.equal(bar.parentElement,ids['page-companies']);assert(!root.classList.contains('wf-context-nav-open'));media.matches=false;ids['page-companies'].classList.remove('active');ids['page-products'].classList.add('active');root.lang='tr';sync();assert.equal(ids.prStatsBar.parentElement,dock);assert.equal(dock.getAttribute('aria-label'),'Bölüm filtreleri');dock.children[0].click();assert.equal(page,'dashboard');
});

test('native operations sections reuse guarded print/save controls and focus their own search fields',()=>{
 const a=setup({mobile:true});
 a.activate('package-labels');a.click(4);assert.equal(a.original.packagePrint.clicks,1);
 a.original.packagePrint.setAttribute('aria-busy','true');a.sync();assert(a.buttons[4].disabled);
 a.click(4);assert.equal(a.original.packagePrint.clicks,1);
 a.click(3);assert.equal(a.calls.routes.at(-1),'invoice-archive');
 a.activate('product-costs');a.click(4);assert.equal(a.original.costSave.clicks,1);
 a.click(3);assert.equal(a.original.costSearch.focused,true);
 a.original.costSave.disabled=true;a.sync();a.click(4);assert.equal(a.original.costSave.clicks,1);
 a.activate('invoice-archive');a.click(4);assert.equal(a.original.archiveSearch.focused,true);
 assert.equal(a.buttons[3].getAttribute('aria-current'),'page');
});
