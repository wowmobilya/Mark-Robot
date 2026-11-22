const test=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const {chromium}=require('playwright');

test('fresh dashboard keeps robot identity in the card and loads Google only for account connection',async t=>{
 const root=path.resolve(__dirname,'..'),browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH});
 t.after(()=>browser.close());
 const page=await browser.newPage({viewport:{width:390,height:844},serviceWorkers:'block'});
 let googleRequests=0;
 await page.route('**/*',async route=>{
  const url=new URL(route.request().url());
  if(url.hostname==='accounts.google.com'){
   googleRequests++;
   return route.fulfill({contentType:'application/javascript',body:'window.google={accounts:{oauth2:{}}};'});
  }
  if(url.origin!=='https://dashboard.test')return route.abort();
  const file=path.resolve(root,'.'+(url.pathname==='/'?'/index.html':url.pathname));
  if(!file.startsWith(root+path.sep))return route.abort();
  try{return await route.fulfill({path:file});}catch{return route.fulfill({status:404,body:''});}
 });
 await page.goto('https://dashboard.test/',{waitUntil:'load'});
 await page.waitForFunction(()=>document.querySelector('#wfGreetingLogoTitle')?.textContent==='Mark Robot'&&document.querySelector('#wfGreetingLogoImage img')?.complete);
 assert.equal(await page.locator('.navbar #navLogo,.navbar #navTitle,.navbar .wf-nav-wordmark>bdi').count(),0);
 assert.equal(await page.locator('#wfCartHeaderButton').count(),1);
 assert.equal(await page.locator('script[src*="statement"]:not([defer])').count(),0);
 assert.equal(googleRequests,0);
 await page.evaluate(()=>wfDriveLoadGIS());
 assert.equal(googleRequests,1);
});
