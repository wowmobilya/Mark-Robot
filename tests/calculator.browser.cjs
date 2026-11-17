const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
 const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(process.env.TEST_URL||'http://127.0.0.1:3015/',{waitUntil:'load'});
 await page.evaluate(()=>{wfBackupCloseRestoreModal();showPage('dashboard');S.usdTry=40;S.usdEur=.8;});
 for(const size of [[320,568],[390,844],[768,1024],[1280,800],[844,390],[667,375]]){
  await page.setViewportSize({width:size[0],height:size[1]});
  await page.evaluate(()=>openCurrCalc('usd-try'));await page.waitForTimeout(300);
  const metrics=await page.locator('.curr-calc-body').evaluate(el=>({sh:el.scrollHeight,ch:el.clientHeight,sw:el.scrollWidth,cw:el.clientWidth}));
  assert(metrics.sh<=metrics.ch+1,JSON.stringify({size,metrics}));assert(metrics.sw<=metrics.cw+1);
  const footer=await page.locator('.curr-calc-footer').boundingBox();assert(footer.y+footer.height<=size[1]);
  await page.locator('[data-key="1"]').click();await page.locator('[data-key="00"]').click();
  assert.equal(await page.locator('#ccInput').inputValue(),'100');assert.equal(await page.locator('#ccResult').innerText(),'₺4,000.00');
  await page.locator('[data-key="."]').click();await page.locator('[data-key="5"]').click();
  assert.equal(await page.locator('#ccResult').innerText(),'₺4,020.00');
  await page.locator('[data-key="⌫"]').click();assert.equal(await page.locator('#ccInput').inputValue(),'100.');
  await page.keyboard.press('Escape');assert(!(await page.locator('#currCalcModal').getAttribute('class')).includes('open'));
 }
 for(const [key,expected] of [['usd-try','₺4,000.00'],['usd-eur','€80.0000'],['try-usd','$2.5000'],['eur-usd','$125.0000'],['eur-try','₺5,000.00'],['try-eur','€2.0000']]){
  await page.evaluate(k=>openCurrCalc(k),key);await page.locator('#ccInput').fill('100');assert.equal(await page.locator('#ccResult').innerText(),expected);
 }
 await page.locator('#ccInput').fill('٠');assert.equal(await page.locator('#ccResult').innerText(),'€0.0000');
 await page.locator('#ccInput').fill('12,5');assert.equal(await page.locator('#ccInput').inputValue(),'12.5');
 await page.locator('#ccInput').fill('NaN');assert.equal(await page.locator('#ccInput').inputValue(),'12.5');
 await page.evaluate(()=>{S.usdTry=0;calcCurrencyModal()});assert.equal(await page.locator('#ccResult').innerText(),'—');
 for(const lang of ['ar','tr','en','fr','ru']){await page.evaluate(l=>{setLang(l);openCurrCalc('usd-try')},lang);assert(await page.locator('[data-key="⌫"]').getAttribute('aria-label'));}
 await page.setViewportSize({width:390,height:844});await page.evaluate(()=>{S.usdTry=40;setLang('ar');openCurrCalc('usd-try');setCCInput(1250)});await page.waitForTimeout(300);await page.screenshot({path:'/tmp/calc-mobile.png'});
 await page.evaluate(()=>toggleTheme());await page.screenshot({path:'/tmp/calc-dark.png'});
 assert.deepEqual(errors,[]);await browser.close();console.log('PASS 6 screen sizes, six conversions, decimals, Arabic numerals, invalid rates, Escape, five languages and themes');
})().catch(e=>{console.error(e);process.exit(1)});
