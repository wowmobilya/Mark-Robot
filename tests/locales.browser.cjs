/* Run against a local server by default. Set TEST_URL and CHROMIUM_PATH to override. */
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
 const page=await browser.newPage({viewport:{width:1280,height:900}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const base=process.env.TEST_URL||'http://127.0.0.1:3010/';await page.goto(base,{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>typeof setLang==='function'&&typeof WOWStatementUI==='object');await page.waitForTimeout(600);
 await page.evaluate(()=>{
  wfBackupCloseRestoreModal();
  S.products=[{id:4242,name:'منتج العميل TEST-4242',type:'coffee_table',barcode:'TEST-4242',desc:'SET',dimensions:'40×30×20',color:'STANDARD',cbm:.1,packets:1,weight:1,priceUSD:10,priceA:10,priceB:8,priceC:7}];
  S.companies=[{id:7001,name:'CLIENT-TEST',type:'external',country:'TR',currency:'USD'}];
  S.invoices=[{id:9001,invNo:'A9001',companyId:7001,companyName:'CLIENT-TEST',clientType:'external',type:'external',date:'2026-11-16',regDate:'2026-11-16',currency:'USD',usdTry:40,usdEur:.9,grandTotal:10,subtotal:10,depositUSD:0,items:[{productId:4242,name:'منتج العميل TEST-4242',qty:1,priceUSD:10,totalUSD:10,color:'STANDARD',cbm:.1,weight:1,packets:1}]}];S.payments=[];
 });
 const pages=await page.evaluate(()=>[...document.querySelectorAll('section.page')].map(e=>e.id.replace('page-','')));
 for(const lang of ['ar','tr','en','fr','ru']){
  await page.evaluate(lang=>{wfBackupCloseRestoreModal();setLang(lang)},lang);
  const coverage=await page.evaluate(()=>{
   const all=[...new Set([...Object.keys(TR.en),...[...document.querySelectorAll('[data-i18n]')].map(e=>e.dataset.i18n)])];
   const missing=Object.fromEntries(['ar','tr','en','fr','ru'].map(l=>[l,all.filter(k=>!Object.hasOwn(TR[l],k))]));
   return {missing,saved:localStorage.getItem('wf_lang'),dir:document.documentElement.dir};
  });for(const keys of Object.values(coverage.missing))assert.deepEqual(keys,[]);assert.equal(coverage.saved,lang);assert.equal(coverage.dir,lang==='ar'?'rtl':'ltr');
  for(const route of pages){
   const snapshot=await page.evaluate(route=>{showPage(route);wfBackupCloseRestoreModal();const root=document.getElementById('page-'+route);const bindings=[...root.querySelectorAll('[data-wf-ui]')];const known=new Set(Object.values(WOWUICopy).flatMap(c=>Object.values(c)));const valid=new Set(Object.values(WOWUICopy).map(c=>c[S.lang]));const foreign=[];
    for(const el of root.querySelectorAll('*')){if(el.children.length||!el.getClientRects().length)continue;let e=el,hidden=false;while(e){const style=getComputedStyle(e);if(style.opacity==='0'||style.visibility==='hidden'||style.display==='none'){hidden=true;break;}e=e.parentElement;}if(hidden)continue;for(const text of [el.textContent.trim(),el.getAttribute('placeholder'),el.getAttribute('title')].filter(Boolean))if(known.has(text)&&!valid.has(text))foreign.push(text);}
    return {foreign,bad:bindings.filter(e=>e.textContent!==wfUiText(e.dataset.wfUi)).map(e=>e.dataset.wfUi),undefined:/\bundefined\b/.test(root.innerText)}},route);
   assert.deepEqual(snapshot.bad,[],lang+' / '+route);assert.deepEqual(snapshot.foreign,[],lang+' / '+route+' contains copy from another language');assert(!snapshot.undefined,lang+' / '+route+' renders undefined');
  }
  await page.evaluate(()=>{showPage('quick-barcode');wfBackupCloseRestoreModal();qblStopCamera()});
  assert.equal(await page.locator('#qblPageTitle').textContent(),await page.evaluate(()=>QBL_TEXTS[S.lang].page_title));
  assert.equal(await page.locator('#qblInput').getAttribute('placeholder'),await page.evaluate(()=>QBL_TEXTS[S.lang].placeholder));
  await page.locator('#qblInput').fill('TEST-4242');await page.locator('#qblInput').press('Enter');
  await page.waitForFunction(()=>QBL.phase===2);await page.locator('#qblTierBtns [data-tier="A"]').click();await page.waitForFunction(()=>QBL.phase===3);await page.waitForTimeout(400);
  await page.evaluate(()=>qblChangeQty(2));assert.equal(await page.evaluate(()=>QBL.pendingQty),3);
  const next=lang==='ru'?'fr':'ru';await page.evaluate(l=>setLang(l),next);await page.waitForTimeout(80);
  assert.equal(await page.evaluate(()=>QBL.pendingQty),3);assert.equal(await page.locator('#qblQtyNum').textContent(),'3');assert.equal(await page.evaluate(()=>QBL.selectedTier),'A');
  await page.evaluate(l=>setLang(l),lang);await page.evaluate(()=>qblAddToInvoice());
  const cart=await page.evaluate(()=>({qty:QBL_CART.items.reduce((n,i)=>n+i.qty,0),label:document.getElementById('qblCartTitle').textContent,want:QBL_CART_TEXTS[S.lang].title,name:QBL_CART.items[0].product.name}));assert(cart.qty>=3);assert.equal(cart.label,cart.want);assert.equal(cart.name,'منتج العميل TEST-4242');
  await page.evaluate(()=>{qblOpenCart();qblRenderCartList()});const itemText=await page.locator('#qblCartList').innerText();assert(!itemText.includes('undefined'));await page.evaluate(()=>qblClearCart());
  const deletion=await page.evaluate(()=>{openDM('TEST',()=>{});const title=document.getElementById('dmTitle').textContent;const keyword=document.getElementById('dmInput').placeholder;closeDM();return {title,expected:DM_TEXTS[S.lang].title,keyword,want:DM_KEYWORDS[S.lang]}});assert.equal(deletion.title,deletion.expected);assert.equal(deletion.keyword,deletion.want);
  const delivery=await page.evaluate(()=>{openDeliverModal(9001);const title=document.getElementById('deliverModalTitle').textContent;closeDeliverModal();return {title,expected:DELIVER_MODAL_TEXTS.deliver[S.lang].title}});assert.equal(delivery.title,delivery.expected);
  await page.evaluate(()=>{wfOpenStatement(7001)});
  assert.equal(await page.locator('#wfsaTitle').textContent(),await page.evaluate(()=>WOWStatementUI.text[S.lang].title));assert.equal(await page.locator('#wfsaLang option').count(),5);
  for(const tab of ['ledger','invoices','payments','overview']){await page.locator('#wfsa [data-tab="'+tab+'"]').click();assert(!(await page.locator('#wfsa').innerText()).includes('undefined'));}
  await page.locator('#wfsa [data-action="close"]').click();
  const print=await page.evaluate(()=>{const html=buildInvoiceHTML(S.invoices[0],S.lang,S.printOpts);return {html,want:PDF_TR[S.lang].proforma}});
  assert(print.html.includes(print.want));assert(!print.html.includes('undefined'));
  await page.reload({waitUntil:'domcontentloaded'});await page.waitForTimeout(300);assert.equal(await page.evaluate(()=>S.lang),lang);
  // Repopulate only in memory after reloading; no application records are saved.
  await page.evaluate(()=>{wfBackupCloseRestoreModal();S.products=[{id:4242,name:'منتج العميل TEST-4242',type:'coffee_table',barcode:'TEST-4242',desc:'SET',dimensions:'40×30×20',color:'STANDARD',cbm:.1,packets:1,weight:1,priceUSD:10,priceA:10,priceB:8,priceC:7}];S.companies=[{id:7001,name:'CLIENT-TEST',type:'external'}];S.invoices=[{id:9001,invNo:'A9001',companyId:7001,companyName:'CLIENT-TEST',type:'external',date:'2026-11-16',regDate:'2026-11-16',currency:'USD',grandTotal:10,subtotal:10,depositUSD:0,items:[]}];S.payments=[]});
  console.log('PASS',lang,': all pages, barcode search/tier/cart, quantity preservation, statement, print, persistence');
 }
 await page.evaluate(()=>{showPage('create-invoice');document.getElementById('invNotes').value='Custom delivery note';setLang('fr');setLang('ru')});assert.equal(await page.locator('#invNotes').inputValue(),'Custom delivery note');
 await page.setViewportSize({width:390,height:844});await page.evaluate(()=>{showPage('quick-barcode');wfBackupCloseRestoreModal();qblStopCamera()});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 assert.deepEqual(errors,[]);await browser.close();console.log('PASS mobile barcode layout and no JavaScript errors');
})().catch(e=>{console.error(e);process.exit(1)});
