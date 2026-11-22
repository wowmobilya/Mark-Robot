const test=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const {chromium}=require('playwright');
test('the app and admin on the same origin reuse one installation across tabs and reload',async()=>{
  const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH});
  try{
    async function profile(){
      const context=await browser.newContext();
      await context.route('**/*',route=>new URL(route.request().url()).pathname==='/installation.js'
        ?route.fulfill({path:path.resolve(__dirname,'../modules/platform/cloud/installation.js'),contentType:'text/javascript'})
        :route.fulfill({contentType:'text/html',body:'<script src="/installation.js"></script>'}));
      return context;
    }
    const one=await profile(),two=await profile();
    const first=await one.newPage(),admin=await one.newPage(),other=await two.newPage();
    await Promise.all([first.goto('https://wow.test/'),admin.goto('https://wow.test/platform/'),other.goto('https://wow.test/')]);
    const proof=page=>page.evaluate(()=>WFInstallation.proof());
    const [a,b,c]=await Promise.all([proof(first),proof(admin),proof(other)]);
    assert(/^[0-9a-f]{64}$/.test(a));assert.equal(a,b);assert.notEqual(a,c);
    await first.reload();assert.equal(await proof(first),a);
    assert.equal(await first.evaluate(()=>localStorage.length+sessionStorage.length),0);
  }finally{await browser.close();}
});

test('Chromium restores a trusted employee from installed launch URL only after live verification',async()=>{
  const {randomUUID}=require('node:crypto'),workspaceId=randomUUID(),userId=randomUUID(),origin='https://employee.test',events=[];
  const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH});
  try{
    const context=await browser.newContext(),page=await context.newPage();let refresh='',online=true;
    const config={enabled:true,endpoint:origin+'/service',workspaceId,publishableKey:'fixture'};
    await context.route('**/*',async route=>{
      const pathName=new URL(route.request().url()).pathname;
      if(pathName==='/service'){
        if(!online)return route.abort('connectionrefused');const body=route.request().postDataJSON();events.push(body.action);
        if(body.action==='auth.refresh'&&body.refreshToken!==refresh)return route.fulfill({status:401,json:{ok:false,error:{code:'SESSION_REVOKED'}}});
        if(body.action==='auth.signOut')return route.fulfill({json:{ok:true}});
        const account={id:userId,name:'Staff',role:'sales',status:'active',sessionVersion:1,permissions:['chat.view']};
        refresh=randomUUID();return route.fulfill({json:{ok:true,workspaceId,identity:{currentAccount:account,accounts:[account],audit:[]},
          session:{access_token:randomUUID(),refresh_token:refresh,expires_at:Math.floor(Date.now()/1000)+3600}}});
      }
      if(pathName==='/cloud.js')return route.fulfill({path:path.resolve(__dirname,'../modules/platform/cloud/wow-cloud-client.js'),contentType:'text/javascript'});
      return route.fulfill({contentType:'text/html',body:'<script>window.WOW_CLOUD_CONFIG='+JSON.stringify(config)+'</script><script src="/cloud.js"></script>'});
    });
    await page.goto(origin+'/?wf-cloud=employee&workspace='+workspaceId);
    assert(await page.evaluate(()=>WFCloud.canRememberMember()));
    await page.evaluate(()=>WFCloud.signIn({username:'fixture',password:'test input',rememberDevice:true}));
    const next=await context.newPage();await next.goto(origin+'/');
    assert.equal(await next.evaluate(async()=>{await WFCloud.ready;return WFCloud.getSnapshot().authenticated;}),true);assert(events.includes('auth.refresh'));
    online=false;await next.reload();assert.equal(await next.evaluate(async()=>{await WFCloud.ready;return WFCloud.getSnapshot().authenticated;}),false);
    online=true;await next.reload();await next.evaluate(()=>WFCloud.ready);await page.evaluate(()=>WFCloud.signOut());
    await next.waitForFunction(()=>!WFCloud.getSnapshot().authenticated);assert(!events.includes('session.touch'));
  }finally{await browser.close();}
});

