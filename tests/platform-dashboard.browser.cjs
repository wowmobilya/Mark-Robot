const {test}=require('node:test'),assert=require('node:assert/strict');
const {chromium}=require('playwright'),path=require('node:path');
const {randomUUID}=require('node:crypto');
test('founder can provision, scan the owner setup URL, and save a plan in mobile layout',async()=>{
  const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,headless:true});
  try{
    const page=await browser.newPage({viewport:{width:390,height:844},hasTouch:true});
    const events=[],wid=randomUUID(),scope='https://platform.test';let created=false,rejection='wrong',companyName='Test',companyStatus='active',activation='pending',canRecover=false;
    await page.route('**/*',async route=>{
      const u=new URL(route.request().url());
      if(u.hostname!=='platform.test')return route.abort();
      if(u.pathname==='/service'){
        const body=route.request().postDataJSON();events.push(body.action);let response;
        if(body.action==='auth.signIn'){
          if(rejection==='network')return route.abort('connectionrefused');
          if(rejection==='wrong'||rejection==='limit')return route.fulfill({status:rejection==='wrong'?401:429,json:{ok:false}});
        }
        if(body.action==='platform.company.list'&&rejection==='member')return route.fulfill({status:403,json:{ok:false,error:{code:'ACCESS_DENIED'}}});
        switch(body.action){
          case 'auth.signIn':response={session:{access_token:'local-fixture',expires_at:Math.floor(Date.now()/1000)+300}};break;
          case 'platform.company.list':response={total:created?1:0,companies:created?[{id:wid,name:companyName,accounts:0,status:companyStatus}]:[]};break;
          case 'platform.company.create':assert.match(body.setupToken,/^[0-9a-f]{64}$/);created=true;response={workspaceId:wid};break;
          case 'platform.company.activation':response={state:activation,expiresAt:null,canRecover};break;
          case 'platform.company.recover':assert.equal(body.confirmed,true);response={requested:true};break;
          case 'platform.company.reissue':assert.match(body.setupToken,/^[a-f0-9]{64}$/);response={};break;
          case 'platform.company.rename':companyName=body.name;response={};break;
          case 'platform.company.status':companyStatus=body.status;response={};break;
          case 'platform.plans.list':response={plans:[]};break;
          case 'platform.plans.save':assert.equal(body.deviceLimit,3);response={};break;
          default:throw Error(body.action);
        }
        return route.fulfill({json:{ok:true,...response}});
      }
      if(u.pathname.endsWith('wow-cloud-config.js'))return route.fulfill({contentType:'application/javascript',body:"window.WOW_CLOUD_CONFIG={workspaceId:'scope',endpoint:'/service',publishableKey:'local'}"});
      let f=u.pathname==='/platform/'?'platform/index.html':u.pathname.slice(1);
      if(!['platform/index.html','ui-identity.css','platform/dashboard.css','platform/dashboard.js','owner-invite.js','vendor/zxing-browser.min.js'].includes(f))return route.abort();
      return route.fulfill({path:path.join(__dirname,'..',f),contentType:f.endsWith('.js')?'application/javascript':f.endsWith('.css')?'text/css':'text/html; charset=utf-8'});
    });
    await page.goto(scope+'/platform/');await page.locator('#lang').selectOption('en');
    const founderInput=page.getByLabel('Founder username');await founderInput.tap();
    assert.equal(await founderInput.evaluate(el=>el===document.activeElement&&!el.readOnly&&el.inputMode!=='none'),true);
    await founderInput.pressSequentially('fixture');
    for(const [fault,expected] of [['wrong','Check your username and password.'],['limit','Too many attempts.'],['network','Could not reach the server.'],['member','This account needs platform founder access']]){
      rejection=fault;
      await page.getByLabel('Founder username').fill('fixture');
      await page.getByLabel('Password',{exact:true}).fill(randomUUID());
      await page.getByRole('button',{name:'Sign in'}).click();
      await page.waitForFunction(expected=>document.querySelector('#status').textContent.includes(expected),expected);
    }
    assert.equal(await page.locator('.wf-founder-check').count(),0);
    await page.locator('#lang').selectOption('ar');assert.match(await page.locator('#status').innerText(),/صلاحية مؤسس/);
    await page.locator('#lang').selectOption('en');rejection='ok';
    await page.getByLabel('Founder username').fill('fixture');await page.getByLabel('Password',{exact:true}).fill(randomUUID());
    await page.getByRole('button',{name:'Sign in'}).click();await page.getByLabel('Company name').fill('Test');await page.getByRole('button',{name:'Create company'}).click();
    const link=await page.getByText('Owner setup link').getAttribute('href');assert.equal(new URL(link).searchParams.get('setup'),wid);
    const rendered=page.locator('svg');await rendered.waitFor();const decoded=await page.evaluate(async()=>{const svg=document.querySelector('svg').cloneNode(true);svg.style.background='white';const url='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(new XMLSerializer().serializeToString(svg));const img=new Image();img.src=url;await img.decode();const canvas=document.createElement('canvas');canvas.width=img.naturalWidth;canvas.height=img.naturalHeight;const c=canvas.getContext('2d');c.fillStyle='white';c.fillRect(0,0,canvas.width,canvas.height);c.drawImage(img,0,0);return new ZXingBrowser.BrowserQRCodeReader(new Map([[1,true]])).decodeFromCanvas(canvas).getText();});assert.equal(decoded,link);
    assert.equal(await page.getByRole('img',{name:'Verified platform administrator'}).count(),1);
    assert.equal(await page.getByText('Open company program').getAttribute('target'),null);
    const company=page.locator('article'),editor=page.locator('.platform-inline-editor form');
    await company.getByRole('button',{name:'Rename'}).click();const companyInput=editor.getByLabel('Company name');await companyInput.tap();assert.equal(await companyInput.evaluate(el=>el===document.activeElement&&!el.readOnly&&el.inputMode!=='none'),true);await companyInput.fill('Edited');
    await editor.getByRole('button',{name:'Save'}).click();await company.getByText('Edited').waitFor();
    await company.getByRole('button',{name:'Suspend'}).click();await page.keyboard.press('Escape');
    assert.equal(await editor.count(),0);assert.equal(companyStatus,'active');
    await company.getByRole('button',{name:'Suspend'}).click();await editor.getByRole('button',{name:'Suspend'}).click();
    await company.getByText('Suspended').waitFor();
    await company.getByRole('button',{name:'Owner setup'}).click();await page.getByRole('button',{name:'Issue new invitation'}).click();
    await page.getByRole('form',{name:'Owner setup'}).getByRole('button',{name:'Issue new invitation'}).click();
    await page.waitForFunction(previous=>document.querySelector('a[href*="#invite="]').href!==previous,link);
    activation='active';await company.getByRole('button',{name:'Owner setup'}).click();await page.getByText('Owner active').waitFor();
    assert.equal(await page.getByRole('button',{name:'Send recovery email'}).count(),0);
    canRecover=true;await company.getByRole('button',{name:'Owner setup'}).click();await page.getByRole('button',{name:'Send recovery email'}).click();
    const recovery=page.getByRole('form',{name:'Owner setup'});assert.equal(events.includes('platform.company.recover'),false);
    await recovery.getByRole('button',{name:'Send recovery email'}).click();await page.getByText('Recovery email requested.').waitFor();
    await page.getByRole('button',{name:'Plan',exact:true}).click();await page.getByLabel('Plan',{exact:true}).last().fill('Test plan');await page.getByLabel('Device limit').fill('3');await page.getByRole('button',{name:'Save'}).click();await page.waitForFunction(()=>!document.querySelector('form button:disabled'));
    assert(events.includes('platform.plans.save'));assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    await page.goto(scope+'/platform/');await page.locator('#lang').selectOption('en');
    await page.getByText('Company owner invitation').click();
    await page.getByLabel('Owner invitation link').fill('https://outside.invalid/platform/');await page.getByRole('button',{name:'Open invitation'}).click();
    await page.getByText('Check the WOW invitation link and setup code.').waitFor();assert.equal(new URL(page.url()).origin,scope);
    await page.evaluate(link=>{
      const canvas=document.createElement('canvas');canvas.width=canvas.height=100;
      const context=canvas.getContext('2d');context.fillRect(0,0,100,100);
      navigator.mediaDevices.getUserMedia=async()=>{window.cameraTrack=canvas.captureStream(3).getVideoTracks()[0];setTimeout(()=>context.fillRect(1,1,5,5),50);return new MediaStream([window.cameraTrack]);};
      window.BarcodeDetector=class{async detect(){return window.scanEnabled?[{rawValue:link}]:[];}};
    },link);
    await page.getByRole('button',{name:'Scan the QR code with camera'}).click();
    await page.waitForFunction(()=>window.cameraTrack?.readyState==='live');await page.getByRole('button',{name:'Stop camera'}).click();
    assert.equal(await page.evaluate(()=>window.cameraTrack.readyState),'ended');
    await page.evaluate(()=>{window.scanEnabled=true;});await page.getByRole('button',{name:'Scan the QR code with camera'}).click();
    await page.getByLabel('رمز الإعداد').waitFor();assert.equal(new URL(page.url()).hash,'');assert.equal((await page.getByLabel('رمز الإعداد').inputValue()).length,64);
  }finally{await browser.close();}
});
