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

test('administrator approval automatically opens the enrolled owner workspace and announces activation',async t=>{
  const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH});
  t.after(()=>browser.close());
  const ctx=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block',reducedMotion:'reduce'});
  const page=await ctx.newPage(),root=path.resolve(__dirname,'..'),workspaceId=randomUUID(),id=randomUUID();
  const account={id,username:'test.owner',name:'Test Owner',role:'owner',status:'active',sessionVersion:1,permissions:['accounts.edit'],expiresAt:null};
  const identity={configured:true,currentAccount:account,accounts:[account],revision:1,audit:[]};
  const session={access_token:'fixture-access',refresh_token:'fixture-refresh',expires_at:Math.floor(Date.now()/1000)+3600};
  let approvalToken,approved=false;const actions=[];
  await page.route('**/*',async route=>{
    const req=route.request(),url=new URL(req.url());
    if(req.method()==='POST'){
      const body=req.postDataJSON(),action=body.action;actions.push(action);let response={ok:true,workspaceId};
      if(action==='auth.enrollOwner'){
        approvalToken=body.approvalToken;assert.match(approvalToken,/^[a-f0-9]{64}$/);response.pendingApproval=true;
      }else if(action==='auth.ownerApprovalStatus'){
        assert.equal(body.approvalToken,approvalToken);response.state=approved?'approved':'pending';
      }else if(action==='auth.signIn'||action==='auth.refresh'){
        assert.equal(approved,true);if(action==='auth.refresh')assert.equal(body.refreshToken,session.refresh_token);
        Object.assign(response,{session,identity});
      }else if(action==='session.snapshot'||action==='session.touch'){response.identity=identity;}
      else if(action==='sync.pull'){Object.assign(response,{changes:[],cursor:0,hasMore:false});}
      return route.fulfill({headers:{'access-control-allow-origin':'*'},json:response});
    }
    if(url.hostname!=='enroll.test')return route.abort();
    const file=path.join(root,url.pathname.endsWith('/')?url.pathname+'index.html':url.pathname);
    return fs.existsSync(file)?route.fulfill({path:file}):route.fulfill({status:404,body:''});
  });
  await page.goto('https://enroll.test/platform/?setup='+workspaceId+'#invite='+randomBytes(32).toString('hex'));
  for(const [i,value] of ['Test Owner',account.username,'Fixture-password-75','Fixture-password-75'].entries())await page.locator('#owner-field-'+(i+1)).fill(value);
  await page.locator('.platform-enrollment button[type=submit]').click();
  await page.waitForResponse(res=>res.request().postDataJSON()?.action==='auth.ownerApprovalStatus');
  assert(new URL(page.url()).pathname.startsWith('/platform/'));approved=true;
  const notice=page.locator('.wf-activation-notice');
  await notice.waitFor({timeout:20000});
  assert.equal(new URL(page.url()).searchParams.get('workspace'),workspaceId);
  assert.equal(await page.locator('html').getAttribute('data-wf-account-state'),'ready');
  assert.equal(await notice.locator('i').count(),9);
  assert.equal(await notice.locator('i').first().evaluate(el=>getComputedStyle(el).animationName),'none');
  assert.equal(await page.evaluate(()=>WFCloud.getSnapshot().currentAccount.id),id);
  assert.equal(await page.evaluate(()=>sessionStorage.getItem('wf.ownerActivation.handoff.v1')),null);
  assert.equal(actions.filter(action=>action==='auth.signIn').length,1);
});
