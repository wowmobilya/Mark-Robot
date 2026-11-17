const {chromium}=require('playwright');const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
 const p=await browser.newPage();const errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto(process.env.TEST_URL||'http://127.0.0.1:3023/',{waitUntil:'load'});
 await p.evaluate(()=>{wfBackupCloseRestoreModal();S.companies=[{id:'test-co',name:'WOW Design Studio',type:'external',country:'TR',city:'İnegöl',phone:'12345'}];S.products=[{id:'test-pr',name:'WOW K400',type:'coffee_table',priceA:125,priceB:115,priceC:105}];S.invoices=[{id:'test-inv',invNo:'WOW-2026-001',companyId:'test-co',companyName:'WOW Design Studio',companyType:'external',currency:'USD',grandTotal:1250,depositUSD:250,items:[],date:'2026-11-17',tier:'A'}];S.payments=[];});
 for(const theme of ['light','dark']) for(const size of [{width:320,height:568},{width:390,height:844},{width:768,height:1024},{width:1440,height:900}]) {
  await p.setViewportSize(size);await p.evaluate(t=>document.documentElement.dataset.theme=t,theme);
  for(const name of ['companies','products','invoices','dashboard']) {
   await p.evaluate(n=>showPage(n),name);await p.waitForTimeout(220);
   assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${name} overflow ${theme} ${size.width}`);
   if(name!=='dashboard') {
    for(const el of await p.locator(`#page-${name} .co-toolbar-row button`).all()){if(await el.isVisible()){const b=await el.boundingBox();assert(b.x>=-1&&b.x+b.width<=size.width+1,`button bounds ${name} ${size.width}`);}}
   }
   if(size.width===390 || size.width===1440)await p.screenshot({path:`/tmp/business-${name}-${theme}-${size.width}.png`,fullPage:true});
  }
 }
 await p.setViewportSize({width:390,height:844});await p.evaluate(()=>showPage('companies'));await p.locator('#coGrid .co-card').click();await p.waitForTimeout(500);assert(await p.locator('#coGrid .co-card.is-open').count());
 await p.evaluate(()=>showPage('products'));await p.locator('#prGrid .pr-card-new').click();await p.waitForTimeout(500);assert(await p.locator('#prGrid .pr-card-new.is-open').count());
 await p.evaluate(()=>showPage('invoices'));await p.locator('#invListContainer .inv-card').click();await p.waitForTimeout(500);assert(await p.locator('#invListContainer .inv-card.is-open').count());
 await p.evaluate(()=>setInvTab('archived'));assert(await p.locator('#invListContainer .co-empty-state').count());await p.evaluate(()=>setInvTab('all'));assert(await p.locator('#invListContainer .inv-card').count());
 assert.deepEqual(errors,[]);await browser.close();console.log('PASS business pages: 32 size/theme/page combinations, card actions, archive filter, no runtime errors');
})().catch(e=>{console.error(e);process.exit(1)});
