const {test}=require('node:test'),assert=require('node:assert/strict');
const {chromium}=require('playwright'),path=require('node:path');
const {randomUUID}=require('node:crypto');
test('founder can provision, scan the owner setup URL, and save a plan in mobile layout',async()=>{
  const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,headless:true});
  try{
    const page=await browser.newPage({viewport:{width:390,height:844},hasTouch:true});
    let relayConfigured=false,relayEnabled=false,serverHealthy=true;const relayWrites=[];
    const events=[],wid=randomUUID(),scope='https://platform.test';let plans=[],assigned=null,expiresAt=null,created=false,rejection='wrong',companyName='Test',companyStatus='active',activation='pending',canRecover=false;
    await page.route('**/*',async route=>{
      const u=new URL(route.request().url());
      if(u.hostname!=='platform.test')return route.abort();
      if(u.pathname==='/service/health'){assert.equal(route.request().headers().authorization,undefined);return route.fulfill({status:serverHealthy?200:503,json:{service:'mark-robot',ok:serverHealthy}});}
      if(u.pathname==='/service'){
        const body=route.request().postDataJSON();events.push(body.action);let response;
        if(body.action==='auth.signIn'){
          if(rejection==='network')return route.abort('connectionrefused');
          if(rejection==='wrong'||rejection==='limit')return route.fulfill({status:rejection==='wrong'?401:429,json:{ok:false}});
        }
        if(body.action==='platform.company.list'&&rejection==='member')return route.fulfill({status:403,json:{ok:false,error:{code:'ACCESS_DENIED'}}});
        switch(body.action){
          case 'auth.signIn':response={session:{access_token:'local-fixture',expires_at:Math.floor(Date.now()/1000)+300}};break;
          case 'platform.support.list':response={cases:[],unreadCases:0};break;
          case 'platform.company.list':response={total:created?1:0,companies:created?[{id:wid,name:companyName,accounts:0,status:companyStatus}]:[]};break;
          case 'platform.company.create':assert.match(body.setupToken,/^[0-9a-f]{64}$/);created=true;response={workspaceId:wid};break;
          case 'platform.company.activation':response={state:activation,expiresAt:null,canRecover};break;
          case 'platform.company.recover':assert.equal(body.confirmed,true);response={requested:true};break;
          case 'platform.company.reissue':assert.match(body.setupToken,/^[a-f0-9]{64}$/);response={};break;
          case 'platform.company.rename':companyName=body.name;response={};break;
          case 'platform.company.status':companyStatus=body.status;response={};break;
          case 'platform.relay.set':
            assert.equal(relayConfigured,true);assert.equal(body.acceptPricing,body.enabled?true:undefined);
            relayWrites.push(body.enabled);relayEnabled=body.enabled;
            // A successful write and a subsequent read return the authoritative view.
          case 'platform.relay.get':
            response={enabled:relayEnabled,configured:relayConfigured,active:relayEnabled&&relayConfigured,includedGb:1000,overageUsdPerGb:.05,remainingGb:null,turnEgressBytes:1250000000};
            break;
          case 'platform.plans.list':response={plans};break;
          case 'platform.limits.get':assert.equal(body.workspaceId,wid);response={usedUsers:3,usedBytes:500000000,usedDevices:1,planId:assigned?.id||null,plan:assigned,expiresAt,version:0};break;
          case 'platform.limits.set':
            assert.equal(body.workspaceId,wid);
            if(!assigned){assert.ok(Date.parse(body.expiresAt)>Date.now()+29*86400000);expiresAt=body.expiresAt.replace('00.000Z','13.072Z');}
            else if(body.planId)assert.equal(body.expiresAt,expiresAt);
            else {assert.equal(body.expiresAt,null);expiresAt=null;}
            assigned=plans.find(p=>p.id===body.planId);response={};break;
          case 'platform.plans.save':
            assert.equal(body.userLimit,5);assert.equal(body.deviceLimit,3);assert.equal(body.storageBytes,1500000000);
            assert.equal(body.price,'14.9975');assert.equal(body.currency,'EUR');assert.equal(body.durationDays,30);
            plans=[{...body,version:1}];response={};break;
          default:throw Error(body.action);
        }
        return route.fulfill({json:{ok:true,...response}});
      }
      if(u.pathname.endsWith('wow-cloud-config.js'))return route.fulfill({contentType:'application/javascript',body:"window.WOW_CLOUD_CONFIG={workspaceId:'scope',endpoint:'/service',publishableKey:'local'}"});
      let f=u.pathname==='/platform/'?'platform/index.html':u.pathname.slice(1);
      if(f==='platform/admin-icon-192.png')return route.fulfill({path:path.join(__dirname,'..',f),contentType:'image/png'});
      if(!['platform/index.html','ui-identity.css','platform/dashboard.css','platform/dashboard.js','platform/support.js','platform/relay.js','owner-invite.js','vendor/zxing-browser.min.js'].includes(f))return route.abort();
      return route.fulfill({path:path.join(__dirname,'..',f),contentType:f.endsWith('.js')?'application/javascript':f.endsWith('.css')?'text/css':'text/html; charset=utf-8'});
    });
    await page.goto(scope+'/platform/#support');await page.locator('#lang').selectOption('en');
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
    assert.equal(events.includes('platform.support.list'),false);
    await page.locator('#lang').selectOption('en');rejection='ok';
    await page.getByLabel('Founder username').fill('fixture');await page.getByLabel('Password',{exact:true}).fill(randomUUID());
    await page.getByRole('button',{name:'Sign in'}).click();
    await page.getByText('No support messages.',{exact:true}).waitFor();
    const menu=page.getByRole('navigation',{name:'Administration sections'});
    assert.equal(await menu.getByRole('link',{name:'Support'}).getAttribute('aria-current'),'page');
    await menu.getByRole('link',{name:'Companies'}).click();
    await page.getByText('No companies yet.').waitFor();
    await menu.getByRole('link',{name:'Calls'}).click();
    const relay=page.locator('.platform-relay'),enable=relay.getByRole('button',{name:'Enable relay'});
    await relay.getByText('Cloudflare relay setup is incomplete.').waitFor();
    await relay.getByText('Mark Robot service · Available').waitFor();
    assert(await relay.getByText('platform.test',{exact:true}).isVisible());
    serverHealthy=false;await relay.getByRole('button',{name:'Check service'}).click();
    await relay.getByText('Mark Robot service · Unreachable').waitFor();serverHealthy=true;
    await relay.getByRole('button',{name:'Check service'}).click();
    await relay.getByText('Mark Robot service · Available').waitFor();
    assert(await enable.isDisabled());assert.equal(relayWrites.length,0);
    relayConfigured=true;await relay.getByRole('button',{name:'Refresh'}).click();
    await relay.getByText('Off',{exact:true}).waitFor();assert(await enable.isDisabled());
    assert.match(await relay.getByText('Remaining billing allowance').locator('+ dd').innerText(),/Unavailable/);
    assert.match(await relay.getByText('Call relay usage').locator('+ dd').innerText(),/1.25/);
    await relay.getByRole('checkbox').check();await enable.click();await relay.getByText('Enabled',{exact:true}).waitFor();
    await relay.getByRole('button',{name:'Turn off relay'}).click();await relay.getByText('Off',{exact:true}).waitFor();
    assert.deepEqual(relayWrites,[true,false]);await menu.getByRole('link',{name:'Companies'}).click();
    await page.getByLabel('Company name').fill('Test');await page.getByRole('button',{name:'Create company'}).click();
    const link=await page.getByText('Owner setup link').getAttribute('href');assert.equal(new URL(link).searchParams.get('setup'),wid);
    const rendered=page.locator('svg');await rendered.waitFor();const decoded=await page.evaluate(async()=>{const svg=document.querySelector('svg').cloneNode(true);svg.style.background='white';const url='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(new XMLSerializer().serializeToString(svg));const img=new Image();img.src=url;await img.decode();const canvas=document.createElement('canvas');canvas.width=img.naturalWidth;canvas.height=img.naturalHeight;const c=canvas.getContext('2d');c.fillStyle='white';c.fillRect(0,0,canvas.width,canvas.height);c.drawImage(img,0,0);return new ZXingBrowser.BrowserQRCodeReader(new Map([[1,true]])).decodeFromCanvas(canvas).getText();});assert.equal(decoded,link);
    assert.equal(await page.getByText('No support messages.',{exact:true}).isVisible(),false);
    assert.equal(await page.getByRole('img',{name:'Verified platform administrator'}).count(),1);
    assert.equal(await page.getByText('Open company program').getAttribute('target'),null);
    await page.getByText('Manage company',{exact:true}).click();
    const adminUrl=new URL(await page.getByRole('link',{name:'Manage company accounts'}).getAttribute('href'));
    assert.equal(adminUrl.searchParams.get('workspace'),wid);assert.equal(adminUrl.searchParams.get('wf-accounts'),'cloud');
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
    await menu.getByRole('link',{name:'Plans'}).click();await page.getByLabel('Plan',{exact:true}).last().fill('Test plan');await page.getByLabel('Active user limit').fill('5');
    await page.getByLabel('File storage limit').fill('1.5');await page.getByLabel('Storage unit').selectOption('GB');
    await page.getByLabel('Subscription price').fill('14.9975');await page.getByLabel('Currency').fill('eur');await page.getByLabel('Duration in days').fill('30');
    await page.getByLabel('Device limit').fill('3');await page.getByRole('button',{name:'Save'}).click();await page.waitForFunction(()=>!document.querySelector('form button:disabled'));
    assert(events.includes('platform.plans.save'));
    await page.goBack();await company.getByRole('button',{name:'Subscription and usage'}).waitFor();
    await company.getByRole('button',{name:'Subscription and usage'}).click();
    const assignment=page.locator('form').filter({has:page.getByLabel('Subscription expiry')});
    await assignment.getByRole('combobox').selectOption({label:'Test plan'});await assignment.getByRole('button',{name:'Save'}).click();
    const userUsage=page.getByText('Active users',{exact:true}).locator('+ dd').locator('bdi');
    await userUsage.nth(1).getByText('5',{exact:true}).waitFor();
    assert.deepEqual(await userUsage.allTextContents(),['3','5','2']);
    assert.deepEqual(await page.getByText('Private file storage',{exact:true}).locator('+ dd bdi').allTextContents(),['500 MB','1.5 GB','1 GB']);
    await page.getByText('14.9975 EUR',{exact:true}).waitFor();
    const oldForm=await assignment.elementHandle();await assignment.getByRole('button',{name:'Save'}).click();
    await page.waitForFunction(form=>!form.isConnected,oldForm);await assignment.getByRole('combobox').selectOption('');assert.equal(await assignment.getByLabel('Subscription expiry').inputValue(),'');
    await assignment.getByRole('button',{name:'Save'}).click();await userUsage.nth(1).getByText('Unlimited',{exact:true}).waitFor();
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    await page.locator('#lang').selectOption('ar');
    await company.getByRole('button',{name:'الاشتراك والاستخدام'}).click();
    await page.locator('.platform-usage-value bdi').first().waitFor();
    for(const width of [320,390,1024]){
      await page.setViewportSize({width,height:840});
      const metrics=await page.locator('.platform-subscription').evaluate(panel=>{
        const values=[...panel.querySelectorAll('dd:has(.platform-usage-value)')].map(row=>[...row.children].map(item=>{
          const box=item.getBoundingClientRect();return {left:box.left,right:box.right,width:box.width,caption:item.querySelector('small')?.textContent};
        }));
        return {rtl:getComputedStyle(panel).direction==='rtl',width:innerWidth,scroll:document.documentElement.scrollWidth,values,
          controls:[...panel.querySelectorAll('input,select,button')].map(node=>node.getBoundingClientRect().height)};
      });
      assert(metrics.rtl&&metrics.scroll<=width,JSON.stringify(metrics));assert.equal(metrics.values.length,3);
      for(const row of metrics.values){assert.equal(row.length,3);for(const value of row)assert(value.caption&&value.width>=42&&value.left>=0&&value.right<=width);assert(row[0].left>row[1].left&&row[1].left>row[2].left);}
      assert(metrics.controls.every(height=>height>=44));
    }
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
