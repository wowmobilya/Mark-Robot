const test=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const {randomUUID,randomBytes}=require('node:crypto');
const {chromium}=require('playwright');

test('owner recovery removes the mailbox proof and commits a new password once',async t=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH});
 t.after(()=>browser.close());
 const page=await browser.newPage({locale:'ar',viewport:{width:390,height:844},serviceWorkers:'block'});
 const token=randomBytes(32).toString('hex'),requestId=randomUUID(),password=randomUUID(),root=path.resolve(__dirname,'..');
 let submissions=0;
 await page.route('**/*',async route=>{
  const req=route.request(),url=new URL(req.url());
  if(url.hostname==='recovery.test'){
   const file=path.resolve(root,'.'+url.pathname);
   if(!file.startsWith(root+path.sep))return route.abort();
   return route.fulfill({path:file});
  }
  if(req.method()==='OPTIONS')return route.fulfill({status:204,headers:{'Access-Control-Allow-Origin':'https://recovery.test','Access-Control-Allow-Headers':'*'}});
  if(!url.pathname.endsWith('/wow-cloud'))return route.abort();
  const body=req.postDataJSON();
  assert.deepEqual(body,{action:'auth.platformOwnerRecovery',requestId,tokenHash:token,newPassword:password});submissions++;
  return route.fulfill({json:{ok:true,changed:true},headers:{'Access-Control-Allow-Origin':'https://recovery.test'}});
 });
 await page.goto('https://recovery.test/platform/recover.html?request='+requestId+'#token_hash='+token);
 assert.equal(page.url(),'https://recovery.test/platform/recover.html');assert.equal(submissions,0);
 await page.locator('#pass').fill(password);await page.locator('#save').click();await page.locator('#reset').waitFor({state:'hidden'});
 assert.match(await page.locator('#status').textContent(),/تم تغيير/);assert.equal(submissions,1);assert.equal(await page.locator('#pass').inputValue(),'');
});
