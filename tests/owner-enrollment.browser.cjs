const {test}=require('node:test');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright'),{randomBytes,randomUUID}=require('node:crypto');
test('invited owner gets field-specific corrections and a confirmed pending receipt',async()=>{
  const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH});
  const root=path.resolve(__dirname,'..'),workspaceId=randomUUID(),invite=randomBytes(32).toString('hex');
  try{
    for(const [width,height] of [[320,680],[390,844],[768,1024],[1440,900]]){
      const ctx=await browser.newContext({locale:'ar',viewport:{width,height},serviceWorkers:'block'});
      const page=await ctx.newPage();let submissions=0;
      await page.route('**/*',async route=>{
        const req=route.request(),url=new URL(req.url());
        if(req.method()==='POST'){
          submissions++;const body=req.postDataJSON();assert.equal(body.workspaceId,workspaceId);assert.equal(body.setupToken,invite);
          assert.equal(body.action,'auth.enrollOwner');assert.equal('confirmPassword' in body,false);
          return route.fulfill({status:submissions===1?409:200,headers:{'access-control-allow-origin':'*'},json:submissions===1?{ok:false,error:{code:'USERNAME_TAKEN'}}:{ok:true,pendingApproval:true,workspaceId}});
        }
        if(url.hostname!=='enroll.test')return route.abort();
        const file=path.join(root,url.pathname.endsWith('/')?url.pathname+'index.html':url.pathname);
        if(!fs.existsSync(file))return route.fulfill({status:404,body:''});return route.fulfill({path:file});
      });
      await page.goto('https://enroll.test/platform/?setup='+workspaceId+'#invite='+invite);
      const field=i=>page.locator('#owner-field-'+i),submit=page.locator('.platform-enrollment button[type=submit]');
      assert.equal(await field(0).isVisible(),false);
      await field(1).fill('مالك الشركة');await field(2).fill('مالك الشركة');await field(3).fill('Example-test-75');await field(4).fill('other');await submit.click();
      assert.equal(await field(4).getAttribute('aria-invalid'),'true');await field(4).fill('Example-test-75');await submit.click();
      assert.equal(await field(2).getAttribute('aria-invalid'),'true');assert.equal(submissions,0);await field(2).fill('مالك.الشركة');
      await submit.click();await page.getByText(/USERNAME_TAKEN/).waitFor();assert(await field(2).evaluate(el=>el===document.activeElement));
      await field(2).fill('مالك.الشركة2');await submit.click();await page.getByText(/وصل طلبك إلى لوحة تحكم الأدمن/).waitFor();
      await page.locator('#lang').selectOption('en',{force:true});await page.getByText(/Your request is in the admin panel/).waitFor();
      assert.equal(submissions,2);assert.equal(await page.locator('.platform-enrollment input').count(),0);
      assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await ctx.close();
    }
  }finally{await browser.close();}
});
