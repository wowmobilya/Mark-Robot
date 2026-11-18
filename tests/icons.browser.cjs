const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
 const page=await browser.newPage({viewport:{width:1280,height:900}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(process.env.TEST_URL||'http://127.0.0.1:3010/',{waitUntil:'load'});await page.waitForTimeout(500);await page.evaluate(()=>{wfBackupCloseRestoreModal();showPage('dashboard')});await page.waitForTimeout(250);
 assert.equal(await page.locator('#sidebar .nav-icon svg').count(),11);assert.equal(await page.locator('.stat-icon svg').count(),4);
 assert.deepEqual(await page.locator('.curr-flag .wf-ui-icon').evaluateAll(es=>es.map(e=>e.dataset.wfUiIcon)),['dollar-sign','euro','turkish-lira','dollar-sign','euro','turkish-lira']);
 for(const lang of ['ar','tr','en','fr','ru']){await page.evaluate(l=>setLang(l),lang);await page.waitForTimeout(100);assert.equal(await page.locator('#sidebar .nav-icon svg').count(),11);assert.equal(await page.locator('.curr-flag svg').count(),6);assert.equal(await page.locator('.wf-language-card svg').count(),5);}
 await page.evaluate(()=>{S.products=[{id:10,name:'🛋️ Personal model',type:'coffee_table',priceUSD:10,priceA:10,priceB:8,priceC:7}];showPage('products')});await page.waitForTimeout(250);
 assert.equal(await page.evaluate(()=>S.products[0].name),'🛋️ Personal model');assert((await page.locator('#prGrid').innerText()).includes('🛋️ Personal model'));assert.equal(await page.locator('.pr-card-new-actions button svg').count(),3);
 for(const v of [{width:1024,height:768},{width:390,height:844}]){await page.setViewportSize(v);await page.evaluate(()=>showPage('dashboard'));await page.waitForTimeout(300);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.equal(await page.locator('.bnav-icon svg').count(),5);}
 await page.evaluate(()=>toggleTheme());await page.waitForTimeout(200);assert.equal(await page.locator('#themeBtn svg').count(),1);await page.evaluate(()=>toggleTheme());
 assert.deepEqual(errors,[]);await browser.close();console.log('PASS navigation, currencies, five languages, saved product names, dark theme and mobile/tablet icons');
})().catch(e=>{console.error(e);process.exit(1)});
