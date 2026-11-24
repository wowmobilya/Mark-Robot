const {test}=require('node:test'),assert=require('node:assert/strict');
const {chromium}=require('playwright'),path=require('node:path');
const {randomUUID}=require('node:crypto');
test('founder can provision, scan the owner setup URL, and save a plan in mobile layout',async()=>{
  const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,headless:true});
  try{
    const page=await browser.newPage({viewport:{width:390,height:844},hasTouch:true});
    const linked=[{accountId:randomUUID(),name:'Fixture employee',username:'test.employee',role:'sales',boundAt:new Date().toISOString()},{accountId:randomUUID(),name:'Fixture owner',username:'test.owner',role:'owner',boundAt:new Date().toISOString()}];
    let qrDownloads=0;
    let relayConfigured=false,relayEnabled=false,serverHealthy=true;const relayWrites=[];
    const events=[],wid=randomUUID(),scope='https://platform.test';let plans=[],assigned=null,expiresAt=null,addonExtra=0,addonDouble=false,created=false,rejection='wrong',companyName='Test',companyStatus='active',activation='pending',canRecover=false;
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
          case 'platform.company.subscriptionSummaries':
            response={checkedAt:new Date().toISOString(),subscriptions:body.workspaceIds.map(id=>({
              workspaceId:id,planId:assigned?.id||null,planName:assigned?.name||null,expiresAt,hasSubscription:!!assigned}))};break;
          case 'platform.company.inspect':
            assert.equal(body.workspaceId,wid);
            response={readOnly:true,capturedAt:new Date().toISOString(),workspace:{id:wid,name:companyName,status:companyStatus},
              section:body.section,offset:body.offset,total:0,items:[],
              summary:{recordsByType:{},accounts:0,registeredDevices:linked.length,unclosedSessions:0,galleryOrders:0,files:0}};
            if(body.section==='devices'){
              const reportedAt=new Date().toISOString();
              response.items=[
                {name:'Fixture mobile session',username:'mobile',reportedDevice:'phone',reportedPlatform:'iOS',providerIp:'203.0.113.7',reportedAt},
                {name:'Fixture desktop session',username:'desktop',reportedDevice:'desktop',reportedPlatform:'Windows',providerIp:'2001:db8::7',reportedAt}
              ];
              response.total=response.items.length;
            }
            break;
          case 'platform.company.create':assert.match(body.setupToken,/^[0-9a-f]{64}$/);created=true;response={workspaceId:wid};break;
          case 'platform.company.devices':
            assert.equal(body.workspaceId,wid);response={devices:linked,total:linked.length};break;
          case 'platform.company.deviceStatus':
            assert.equal(body.workspaceId,wid);assert.equal(body.expectedBoundAt,linked[1].boundAt);assert.equal(body.confirmed,true);assert.equal(body.accountId,linked[1].accountId);
            linked[1].blocked=body.blocked;response={blocked:body.blocked};break;
          case 'platform.company.releaseDevice':
            assert.equal(body.workspaceId,wid);assert.equal(body.confirmed,true);
            assert.equal(body.accountId,linked[1].accountId);assert.equal(body.expectedBoundAt,linked[1].boundAt);linked.pop();response={released:true};break;
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
          case 'platform.fx.get':response={available:true,source:'TCMB',rateType:'forex_selling',date:'2026-11-20',
            rates:{USD:50.4936,EUR:55.3970,TRY:1}};break;
          case 'platform.limits.get':assert.equal(body.workspaceId,wid);response={usedUsers:3,usedBytes:500000000,usedDevices:1,usedVoiceMinutes:12.34,usedVideoMinutes:0,effectiveVoiceMinutes:500,effectiveVideoMinutes:null,planId:assigned?.id||null,plan:assigned,expiresAt,version:0,extraDevices:addonExtra,doubleBundle:addonDouble};break;
          case 'platform.limits.set':
            assert.equal(body.workspaceId,wid);
            if(!assigned){assert.ok(Date.parse(body.expiresAt)>Date.now()+29*86400000);expiresAt=body.expiresAt.replace('00.000Z','13.072Z');}
            else if(body.planId)assert.equal(body.expiresAt,expiresAt);
            else {assert.equal(body.expiresAt,null);expiresAt=null;}
            if(body.planId){assert.equal(body.extraDevices,2);assert.equal(body.doubleBundle,true);}
            addonExtra=body.extraDevices;addonDouble=body.doubleBundle;
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
      if(f==='vendor/zxing-browser.min.js')qrDownloads++;
      if(f==='platform/admin-icon-192.png')return route.fulfill({path:path.join(__dirname,'..',f),contentType:'image/png'});
      if(!['platform/index.html','ui-identity.css','platform/dashboard.css','platform/login-experience.css','platform/login-experience.js','platform/dashboard.js','platform/admin-shell.js','platform/qr-invite.js','platform/analytics.js','platform/admin-audio.js','platform/pricing-cards.js','platform/support.js','platform/preferences.js','platform/relay.js','owner-invite.js','vendor/zxing-browser.min.js','platform/company-inspect.css','platform/company-inspect.js','platform/subscription-clocks.js','platform/developer-entry.js','developer-profile.js','developer-profile.css'].includes(f))return route.abort();
      return route.fulfill({path:path.join(__dirname,'..',f),contentType:f.endsWith('.js')?'application/javascript':f.endsWith('.css')?'text/css':'text/html; charset=utf-8'});
    });
    await page.goto(scope+'/platform/#support');assert.equal(qrDownloads,0,'login does not download the QR engine');
    // Screenshot regression: the remember checkbox must never stretch the grid.
    for(const width of [320,360,390]){
      await page.setViewportSize({width,height:760});
      const metrics=await page.evaluate(()=>{
        const form=document.querySelector('.platform-login'),check=form?.querySelector('label.platform-remember input');
        const checkbox=check?.getBoundingClientRect(),label=check?.closest('label')?.getBoundingClientRect();
        const bounds=form?.getBoundingClientRect(),title=document.querySelector('main>header')?.getBoundingClientRect();
        return {viewport:innerWidth,scroll:document.documentElement.scrollWidth,
          form:bounds&&{left:bounds.left,right:bounds.right,width:bounds.width},
          checkbox:checkbox&&{width:checkbox.width,height:checkbox.height,left:checkbox.left,right:checkbox.right},
          label:label&&{left:label.left,right:label.right,width:label.width},
          header:title&&{left:title.left,right:title.right}};
      });
      assert(metrics.scroll<=width,JSON.stringify(metrics));
      assert(metrics.form.left>=0&&metrics.form.right<=width,JSON.stringify(metrics));
      assert(metrics.checkbox&&metrics.checkbox.width<=24&&metrics.checkbox.height<=24,JSON.stringify(metrics));
      assert(metrics.label.left>=0&&metrics.label.right<=width,JSON.stringify(metrics));
      assert(metrics.header.right<=width+1,JSON.stringify(metrics));
    }
    await page.setViewportSize({width:390,height:844});
    await page.locator('#lang').selectOption('en',{force:true});
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
    await page.locator('#lang').selectOption('ar',{force:true});assert.match(await page.locator('#status').innerText(),/صلاحية مؤسس/);
    assert.equal(events.includes('platform.support.list'),false);
    await page.locator('#lang').selectOption('en',{force:true});rejection='ok';
    await page.getByLabel('Founder username').fill('fixture');await page.getByLabel('Password',{exact:true}).fill(randomUUID());
    await page.getByRole('button',{name:'Sign in'}).click();
    await page.getByText('No support messages.',{exact:true}).waitFor();
    const menu=page.getByRole('navigation',{name:'Administration sections'});
    assert.equal(await menu.getByRole('link',{name:'Support'}).getAttribute('aria-current'),'page');
    // This shell is driven by the real founder view, not decorative mock controls.
    const sideButton=page.locator('#platformMenuButton'),drawer=page.locator('#platformSideDrawer');
    await sideButton.click();assert.equal(await sideButton.getAttribute('aria-expanded'),'true');
    await drawer.getByRole('link',{name:'Companies'}).click();
    assert.equal(await drawer.isVisible(),false);
    await menu.getByRole('link',{name:'Support'}).click();
    await sideButton.click();
    await drawer.getByRole('button',{name:'Compact'}).click();
    assert.equal(await page.locator('html').getAttribute('data-admin-density'),'compact');
    await drawer.getByRole('button',{name:'Comfortable'}).click();
    assert.equal(await page.locator('html').getAttribute('data-admin-density'),'comfortable');
    await drawer.getByRole('button',{name:'Close menu'}).click();
    assert.equal(await page.evaluate(()=>localStorage.getItem('wow.platform.density')),'comfortable');
    const themeBefore=await page.locator('html').getAttribute('data-theme');
    await page.locator('#platformThemeToggle').click();
    assert.notEqual(await page.locator('html').getAttribute('data-theme'),themeBefore);
    await page.locator('#platformThemeToggle').click();
    assert.equal(await page.locator('html').getAttribute('data-theme'),themeBefore);
    const settingsLink=menu.getByRole('link',{name:'Settings',includeHidden:true});
    await sideButton.click();await drawer.getByRole('link',{name:'Settings'}).first().click();
    const settingsPage=page.locator('#platform-page-settings');
    await settingsPage.getByRole('heading',{name:'Founder account'}).waitFor();
    assert.equal(await settingsLink.getAttribute('aria-current'),'page');
    // Sounds share the original WOW media. Buttons remain muted until opt-in.
    const audio=page.locator('.platform-audio-widget');
    await audio.waitFor();
    assert.equal(await audio.locator('.platform-audio-feedback').getAttribute('aria-pressed'),'false');
    await audio.locator('.platform-audio-feedback').click();
    assert.equal(await audio.locator('.platform-audio-feedback').getAttribute('aria-pressed'),'true');
    await audio.locator('.platform-audio-feedback').click();
    assert.equal(await audio.locator('.platform-audio-feedback').getAttribute('aria-pressed'),'false');
    assert.equal(await settingsPage.locator('.platform-password-settings summary').innerText(),'Change password');
    assert.equal(await settingsPage.getByRole('heading',{name:'Settings',exact:true}).isVisible(),true);
    await page.locator('.platform-header-actions').getByRole('link',{name:'Support inbox'}).click();
    await page.locator('#platform-page-support').waitFor();
    await menu.getByRole('link',{name:'Home'}).click();
    await page.locator('#platform-page-home').waitFor();
    const dockGeometry=await menu.evaluate(element=>{
      const orbit=element.querySelector('.platform-nav-orbit');
      const surface=element.querySelector('.platform-nav-surface');
      return {height:element.getBoundingClientRect().height,orbit:orbit.getBoundingClientRect().width,
        mask:getComputedStyle(surface,'::before').maskImage,circle:getComputedStyle(orbit).backgroundColor};
    });
    assert.equal(dockGeometry.height,64);
    assert.equal(dockGeometry.orbit,48);
    assert.match(dockGeometry.mask,/4945/);
    assert.equal(dockGeometry.circle,'rgb(63, 124, 148)');
    await sideButton.click();await drawer.getByRole('link',{name:'Settings'}).first().click();
    for(const [code,title] of [['ar','الإعدادات'],['tr','Ayarlar'],['fr','Réglages'],['ru','Настройки'],['en','Settings']]){
      await page.locator('#lang').selectOption(code,{force:true});
      await settingsPage.getByRole('heading',{name:title,exact:true}).waitFor();
      assert.equal(await page.locator('html').getAttribute('dir'),code==='ar'?'rtl':'ltr');
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    }
    for(const width of [320,360,375,390,430,768,820,1024,1180,1280,1440]){
      await page.setViewportSize({width,height:844});
      await page.waitForFunction(()=>document.querySelector('.platform-section-menu a')?.hash==='#companies');
      const metrics=await menu.evaluate(element=>({position:getComputedStyle(element).position,bottom:element.getBoundingClientRect().bottom,
        height:element.getBoundingClientRect().height,orbit:element.querySelector('.platform-nav-orbit').getClientRects().length,
        links:[...element.querySelectorAll('a')].filter(a=>a.getClientRects().length).map(a=>({height:a.getBoundingClientRect().height,width:a.getBoundingClientRect().width,path:a.hash})), 
        overflow:document.documentElement.scrollWidth>innerWidth}));
      assert(!metrics.overflow);
      assert(metrics.links.every(link=>link.height>=44&&link.width>=44));
      if(width<=1024){assert.equal(metrics.position,'fixed');assert(Math.abs(metrics.bottom-844)<2);assert.equal(metrics.height,64);assert.equal(metrics.orbit,0);assert.equal(metrics.links.length,5);assert.equal(metrics.links[2].path,'#home');}
      else if(width>1024){assert.equal(metrics.position,'sticky');assert.equal(metrics.links[2].path,'#home');}
    }
    // iPhone/iPad/Android/tablet/desktop breakpoints and orientation changes.
    await page.setViewportSize({width:863,height:388});
    const landscape=await page.evaluate(()=>({
      bottom:document.querySelector('.platform-section-menu').getBoundingClientRect().bottom,
      position:getComputedStyle(document.querySelector('.platform-section-menu')).position,
      overflow:document.documentElement.scrollWidth>innerWidth,
      menu:!!document.querySelector('#platformMenuButton')?.getClientRects().length
    }));
    assert.equal(landscape.position,'fixed');assert(Math.abs(landscape.bottom-388)<2);
    assert.equal(landscape.overflow,false);assert.equal(landscape.menu,true);
    await page.setViewportSize({width:390,height:844});
    await menu.getByRole('link',{name:'Companies'}).click();
    await page.getByText('No companies yet.').waitFor();
    await page.waitForFunction(()=>{
      const menu=document.querySelector('.platform-section-menu'),orbit=menu.querySelector('.platform-nav-orbit');
      const active=menu.querySelector('[aria-current="page"]'),center=element=>{const rect=element.getBoundingClientRect();return rect.left+rect.width/2;};
      return active?.hash==='#companies'&&!orbit.hidden&&Math.abs(center(active)-center(orbit))<1;
    });
    await menu.getByRole('link',{name:'Home'}).click();
    const homePage=page.locator('#platform-page-home');
    assert.equal(await homePage.getByRole('heading',{name:'WOW Control Center',exact:true}).count(),1,'one control-center heading');
    await homePage.locator('.platform-home-directory').getByText('No company records on this page').waitFor();
    for(const width of [320,390,768,1024,1280,1440]){
      await page.setViewportSize({width,height:844});
      const layout=await homePage.evaluate(el=>({overflow:document.documentElement.scrollWidth>innerWidth,
        fits:[...el.querySelectorAll('.platform-server-robot,.platform-analytics,.platform-home-directory')].every(child=>{
          const r=child.getBoundingClientRect();return r.left>=-1&&r.right<=innerWidth+1;
        })}));
      assert(!layout.overflow&&layout.fits,JSON.stringify({width,layout}));
    }
    await page.setViewportSize({width:390,height:844});
    const stats=page.locator('.platform-analytics');
    await stats.getByRole('heading',{name:'Platform pulse'}).waitFor();
    assert.equal(await stats.locator('[data-metric=companies] .platform-analytics-value').textContent(),'0');
    assert.equal(await stats.locator('[data-metric=active] .platform-analytics-value').textContent(),'0');
    assert.equal(await stats.locator('.platform-analytics-traffic-value').textContent(),'Unavailable');
    assert.equal(events.filter(x=>x==='platform.relay.get').length,0,'no eager traffic polling');
    await stats.getByRole('button',{name:'Read usage'}).click();
    await stats.getByText('1.25 GB').waitFor();
    assert.equal(await stats.locator('.platform-analytics-track').getAttribute('aria-valuenow'),'1.25');
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
    await page.locator('.platform-create-panel summary').click();
    await page.getByLabel('Company name').fill('Test');await page.getByRole('button',{name:'Create company'}).click();
    const link=await page.getByText('Owner setup link').getAttribute('href');assert.equal(new URL(link).searchParams.get('setup'),wid);
    assert.equal(await page.locator('[data-metric=companies] .platform-analytics-value').textContent(),'1');
    assert.equal(await page.locator('[data-metric=active] .platform-analytics-value').textContent(),'1');
    assert.equal(await page.locator('[data-metric=paused] .platform-analytics-value').textContent(),'0');
    assert.equal(await page.locator('[data-metric=accounts] .platform-analytics-value').textContent(),'0');
    await page.waitForFunction(()=>Number.parseFloat(document.querySelector('.platform-analytics-donut').style.getPropertyValue('--platform-active-share'))===100);
    const profileLink=page.getByRole('link',{name:'Company page · Test',exact:true});
    assert.equal(await profileLink.getAttribute('href'),'#company/'+wid);
    assert.equal(await page.getByRole('button',{name:'Open company program'}).count(),0);
    await page.locator('.platform-qr-actions button').first().waitFor();
    assert.equal(await page.locator('.platform-qr-actions button').count(),4);
    const rendered=page.locator('svg.platform-setup-qr');await rendered.waitFor();
    assert.equal(await rendered.locator('[data-wow-robot-qr]').count(),1);
    assert.equal(await rendered.locator('svg[viewBox="60 -70 480 480"] use').count(),2);const decoded=await page.evaluate(async()=>{const svg=document.querySelector('svg.platform-setup-qr').cloneNode(true);svg.style.background='white';const url='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(new XMLSerializer().serializeToString(svg));const img=new Image();img.src=url;await img.decode();const canvas=document.createElement('canvas');canvas.width=img.naturalWidth;canvas.height=img.naturalHeight;const c=canvas.getContext('2d');c.fillStyle='white';c.fillRect(0,0,canvas.width,canvas.height);c.drawImage(img,0,0);return new ZXingBrowser.BrowserQRCodeReader(new Map([[1,true]])).decodeFromCanvas(canvas).getText();});assert.equal(decoded,link);
    const finder=page.locator('.platform-overview-search input');
    await finder.fill('does-not-exist');
    assert.equal(await page.locator('.platform-company-card').isVisible(),false);
    await page.getByText('No matching companies on this page').waitFor();
    await finder.fill('Test');
    assert.equal(await page.locator('.platform-company-card').isVisible(),true);
    await page.locator('.platform-overview-status select').selectOption('suspended');
    assert.equal(await page.locator('.platform-company-card').isVisible(),false);
    await page.locator('.platform-overview-status select').selectOption('all');
    assert.equal(await page.locator('.platform-company-card').isVisible(),true);
    await finder.fill('');
    const sessionLink=page.getByRole('link',{name:'Devices & sessions · Test',exact:true});
    assert.equal(await sessionLink.getAttribute('href'),'#company/'+wid+'/devices');
    await profileLink.click();
    await page.getByRole('heading',{name:'Company settings · Test'}).waitFor();
    await page.getByRole('link',{name:'Devices & sessions',exact:true}).click();
    await page.locator('.wf-inspect-inline .wf-inspect-device-icon[data-device=phone]').waitFor();
    assert.equal(await page.locator('.wf-inspect-inline .wf-inspect-device-icon[data-device=desktop]').count(),1);
    assert.deepEqual(await page.locator('.wf-inspect-inline .wf-inspect-provider-ip').allTextContents(),['203.0.113.7','2001:db8::7']);
    await page.getByText(/Supabase IP may belong to the WOW relay server/).waitFor();
    await page.getByRole('link',{name:'Company usage',exact:true}).click();
    const usage=page.locator('.platform-company-usage');
    const voice=usage.locator('dt').filter({hasText:'Monthly voice minutes'}).locator('xpath=following-sibling::dd[1]').locator('bdi');
    const video=usage.locator('dt').filter({hasText:'Monthly video minutes'}).locator('xpath=following-sibling::dd[1]').locator('bdi');
    await voice.first().waitFor();
    assert.deepEqual(await voice.allTextContents(),['12.34','500','487.66']);
    assert.deepEqual(await video.allTextContents(),['0','Unlimited','Unlimited']);
    await page.getByRole('link',{name:'Overview',exact:true}).click();
    await page.getByRole('link',{name:'Back to companies'}).click();
    await profileLink.waitFor();
    await page.goBack();
    await page.locator('.platform-company-link-pill[data-link-state=pending]').waitFor();
    assert.match(await page.locator('.platform-company-link-pill').innerText(),/Awaiting invitation acceptance/);
    assert.equal(await page.locator('.platform-company-connectivity>small').isVisible(),true);
    // iPhone SE through desktop: company cards and their actions must stay on-screen.
    for(const size of [{width:320,height:640},{width:360,height:780},{width:390,height:844},
       {width:430,height:932},{width:768,height:1024},{width:1024,height:768},
       {width:1366,height:768},{width:1920,height:1080},{width:863,height:388}]){
      await page.setViewportSize(size);
      const box=await page.locator('.platform-company-card-v2').evaluate(card=>{
        const r=card.getBoundingClientRect();
        const buttons=[...card.querySelectorAll('.platform-company-primary-actions button,.platform-company-refresh,.platform-company-tools summary')].map(x=>{
          const box=x.getBoundingClientRect();return {width:box.width,height:box.height,right:box.right,left:box.left};
        });
        return {left:r.left,right:r.right,overflow:document.documentElement.scrollWidth>innerWidth,buttons};
      });
      assert(!box.overflow&&box.left>=-1&&box.right<=size.width+1,JSON.stringify({size,box}));
      assert(box.buttons.every(btn=>btn.height>=40&&btn.left>=-1&&btn.right<=size.width+1),JSON.stringify({size,box}));
    }
    await page.setViewportSize({width:390,height:844});
    assert.equal(await page.getByText('No support messages.',{exact:true}).isVisible(),false);
    assert.equal(await page.getByRole('img',{name:'Verified platform administrator'}).count(),1);
    assert.equal(await page.getByRole('button',{name:'Open company program'}).count(),1);
    await page.getByRole('button',{name:'Open company program'}).click();
    assert.equal(await page.locator('.wf-inspect').getAttribute('aria-modal'),'true');
    await page.locator('.wf-inspect-back').click();
    assert(await page.locator('.platform-company-page .platform-company-tools').evaluate(details=>details.open));
    await page.getByRole('button',{name:'Manage company accounts'}).click();
    await page.locator('.wf-inspect-nav-item[data-section=accounts][aria-current=page]').waitFor();
    await page.locator('.wf-inspect-back').click();
    await page.getByRole('button',{name:'Linked devices'}).click();
    const ownerDevice=page.locator('.platform-linked-device').filter({hasText:'Fixture owner'});
    await ownerDevice.getByRole('button',{name:'Block device'}).click();await ownerDevice.getByRole('form').getByRole('button',{name:'Block device'}).click();
    await ownerDevice.getByText('Device blocked').waitFor();assert.equal(await ownerDevice.getByRole('button',{name:'Release device'}).count(),0);
    await ownerDevice.getByRole('button',{name:'Unblock device'}).click();await ownerDevice.getByRole('form').getByRole('button',{name:'Unblock device'}).click();
    await ownerDevice.getByRole('button',{name:'Release device'}).click();await ownerDevice.getByRole('button',{name:'Cancel'}).click();
    assert.equal(events.includes('platform.company.releaseDevice'),false);
    await ownerDevice.getByRole('button',{name:'Release device'}).click();await ownerDevice.getByRole('button',{name:'Confirm release'}).click();
    await ownerDevice.waitFor({state:'detached'});await page.locator('.platform-linked-device').getByText('Fixture employee').waitFor();
    const company=page.locator('.platform-company-card-v2'),editor=page.locator('.platform-inline-editor form');
    await company.getByRole('button',{name:'Rename'}).click();const companyInput=editor.getByLabel('Company name');await companyInput.tap();assert.equal(await companyInput.evaluate(el=>el===document.activeElement&&!el.readOnly&&el.inputMode!=='none'),true);await companyInput.fill('Edited');
    await editor.getByRole('button',{name:'Save'}).click();await company.getByText('Edited').waitFor();
    await company.getByRole('button',{name:'Suspend'}).click();await page.keyboard.press('Escape');
    assert.equal(await editor.count(),0);assert.equal(companyStatus,'active');
    await company.getByRole('button',{name:'Suspend'}).click();await editor.getByRole('button',{name:'Suspend'}).click();
    await company.getByText('Suspended').waitFor();
    await company.getByRole('button',{name:'Owner setup'}).click();await page.getByRole('button',{name:'Issue new invitation'}).click();
    await page.getByRole('form',{name:'Owner setup'}).getByRole('button',{name:'Issue new invitation'}).click();
    await page.waitForFunction(previous=>document.querySelector('a[href*="#invite="]').href!==previous,link);
    for(const [state,label] of [['owner_suspended','Owner account suspended'],['owner_expired','Owner account expired'],['owner_unavailable','Owner account unavailable']]){
      activation=state;
      await company.getByRole('button',{name:'Owner setup'}).click();
      await company.locator('.platform-company-tools').getByText(label,{exact:true}).waitFor();
      assert.equal(await company.getByRole('button',{name:'Issue new invitation'}).count(),0);
      assert.equal(await company.getByRole('button',{name:'Activate owner account'}).count(),0);
      assert.equal(await company.locator('.platform-company-link-pill').textContent(),label);
    }
    activation='active';await company.getByRole('button',{name:'Owner setup'}).click();await page.getByText('Owner active').waitFor();
    assert.equal(await page.getByRole('button',{name:'Send recovery email'}).count(),0);
    canRecover=true;await company.getByRole('button',{name:'Owner setup'}).click();await page.getByRole('button',{name:'Send recovery email'}).click();
    const recovery=page.getByRole('form',{name:'Owner setup'});assert.equal(events.includes('platform.company.recover'),false);
    await recovery.getByRole('button',{name:'Send recovery email'}).click();await page.getByText('Recovery email requested.').waitFor();
    await menu.getByRole('link',{name:'Plans'}).click();
    const pricing=page.locator('.platform-pricing-dashboard');
    await pricing.waitFor();
    assert.equal(await pricing.locator('.platform-pricing-card').count(),3);
    assert.equal(await pricing.locator('[data-tier=month] .platform-plan-price').innerText(),'$100');
    assert.equal(await pricing.locator('[data-tier=month] .platform-plan-fx-value').innerText(),'≈ ₺5.049,36');
    assert.match(await pricing.locator('[data-tier=month] .platform-plan-fx-note').innerText(),/TCMB.*2026-11-20/);
    assert.equal(await pricing.locator('[data-tier=twoYears] .wf-plan-art svg path').first().getAttribute('d'),
      'M84 16 127 36v44c0 29-15 47-43 61-28-14-43-32-43-61V36L84 16Z');
    assert.equal(events.filter(action=>action==='platform.fx.get').length,1);
    // Original WhatsApp silhouette, direct Turkish phone and the exact
    // user-supplied mailbox are all reachable without any admin action.
    const contact=pricing.locator('.platform-sales-contact');
    await contact.waitFor();
    assert.equal(await contact.locator('.platform-sales-phone').getAttribute('href'),'tel:+905386263700');
    assert.equal(await contact.locator('.platform-sales-email').getAttribute('href'),'mailto:www.mutez@gmail.com');
    assert.equal(await contact.locator('.platform-sales-email').innerText(),'www.mutez@gmail.com');
    assert.equal(await contact.locator('.platform-sales-whatsapp').getAttribute('href'),'https://wa.me/905386263700');
    assert.equal(await contact.locator('svg.platform-whatsapp-logo path').count(),1);
    assert.equal(await pricing.locator('.platform-plan-activate svg.platform-whatsapp-logo path').count(),3);
    const logoPath=await pricing.locator('.platform-plan-activate svg.platform-whatsapp-logo path').first().getAttribute('d');
    assert.match(logoPath,/^M17\.472 14\.382/);
    assert.equal(await contact.locator('.platform-sales-email').evaluate(e=>e.getBoundingClientRect().height>=44),true);
    // Every activation opens the same Turkish WhatsApp number with the chosen
    // price and duration, never a silent billing or plan-assignment request.
    for(const [tier,amount,days] of [['month','100','30'],['year','1000','365'],['twoYears','1800','730']]){
      const entry=pricing.locator('[data-tier='+tier+'] .platform-plan-activate');
      const href=await entry.getAttribute('href');
      const link=new URL(href);
      assert.equal(link.origin,'https://wa.me');
      assert.equal(link.pathname,'/905386263700');
      assert.equal(link.searchParams.has('text'),true);
      const message=link.searchParams.get('text');
      assert.match(message,/WOW Furniture/);
      assert.match(message,new RegExp(days+' days'));
      assert.match(message,new RegExp(amount==='100'?'100':amount==='1000'?'1,000':'1,800'));
      assert.equal(await entry.getAttribute('target'),'_blank');
      assert.match(await entry.getAttribute('rel'),/noopener/);
      assert.equal(await entry.evaluate(el=>el.getBoundingClientRect().height>=44),true);
    }
    assert.equal(events.filter(action=>action==='platform.plans.save').length,0);
    assert.match(await pricing.locator('[data-tier=year] .platform-plan-price').innerText(),/^\$1,000(?:\.00)?$/);
    await pricing.locator('[data-tier=month] .platform-plan-edit').click();
    assert.equal(await page.getByLabel('Subscription price').inputValue(),'100');
    assert.equal(await page.getByLabel('Currency').inputValue(),'USD');
    assert.equal(await page.getByLabel('Duration in days').inputValue(),'30');
    assert.equal(await page.getByLabel('Monthly voice minutes').inputValue(),'500');
    assert.equal(await page.getByLabel('Monthly video minutes').inputValue(),'250');
    assert.equal(await page.getByLabel('Device limit').inputValue(),'2');
    assert.equal(await page.getByLabel('File storage limit').inputValue(),'2');
    assert.equal(await pricing.locator('[data-tier=month] [data-feature]').count(),6);
    assert.equal(events.filter(item=>item==='platform.plans.save').length,0,'template does not silently save or charge');
    for(const size of [{width:320,height:700},{width:375,height:812},{width:430,height:932},
      {width:820,height:1180},{width:1024,height:768},{width:1366,height:768},{width:1920,height:1080}]){
      await page.setViewportSize(size);
      const metrics=await pricing.evaluate(element=>({
        overflow:document.documentElement.scrollWidth>innerWidth,
        cards:[...element.querySelectorAll('.platform-pricing-card')].map(card=>{
          const rect=card.getBoundingClientRect(),btn=card.querySelector('button').getBoundingClientRect();
          return {left:rect.left,right:rect.right,buttonHeight:btn.height,buttonLeft:btn.left,buttonRight:btn.right};
        })
      }));
      assert(!metrics.overflow,JSON.stringify({size,metrics}));
      const contactMetrics=await contact.evaluate(panel=>({
        bounds:panel.getBoundingClientRect().toJSON(),
        links:[...panel.querySelectorAll('a')].map(a=>a.getBoundingClientRect().toJSON())
      }));
      assert(contactMetrics.bounds.left>=-1&&contactMetrics.bounds.right<=size.width+1,JSON.stringify({size,contactMetrics}));
      assert(contactMetrics.links.every(link=>link.width>=44&&link.height>=44&&link.left>=-1&&link.right<=size.width+1),
        JSON.stringify({size,contactMetrics}));
      assert(metrics.cards.every(c=>c.left>=-1&&c.right<=size.width+1&&c.buttonHeight>=44&&c.buttonLeft>=-1&&c.buttonRight<=size.width+1),
        JSON.stringify({size,metrics}));
    }
    await page.setViewportSize({width:390,height:844});
    await page.locator('.platform-plan-editor > select').selectOption('');
    await page.getByLabel('Plan',{exact:true}).last().fill('Test plan');await page.getByLabel('Active user limit').fill('5');
    await page.getByLabel('File storage limit').fill('1.5');await page.getByLabel('Storage unit').selectOption('GB');
    await page.getByLabel('Subscription price').fill('14.9975');await page.getByLabel('Currency').fill('eur');await page.getByLabel('Duration in days').fill('30');
    await page.getByLabel('Device limit').fill('3');await page.getByRole('button',{name:'Save'}).click();await page.waitForFunction(()=>!document.querySelector('form button:disabled'));
    assert(events.includes('platform.plans.save'));
    await page.goBack();await company.getByRole('button',{name:'Subscription and usage'}).waitFor();
    await company.getByRole('button',{name:'Subscription and usage'}).click();
    const assignment=page.locator('form').filter({has:page.getByLabel('Subscription expiry')});
    await assignment.getByRole('combobox').selectOption({label:'Test plan'});
    await assignment.getByLabel('Extra staff phones').fill('2');
    await assignment.getByLabel('Double calls and storage').check();
    assert.match(await assignment.locator('.platform-addon-price').innerText(),/\$40/);
    await assignment.getByRole('button',{name:'Save'}).click();
    const userUsage=page.getByText('Active users',{exact:true}).locator('+ dd').locator('bdi');
    await userUsage.nth(1).getByText('5',{exact:true}).waitFor();
    assert.deepEqual(await userUsage.allTextContents(),['3','5','2']);
    assert.deepEqual(await page.getByText('Private file storage',{exact:true}).locator('+ dd bdi').allTextContents(),['500 MB','1.5 GB','1 GB']);
    await page.getByText('14.9975 EUR',{exact:true}).waitFor();
    const oldForm=await assignment.elementHandle();await assignment.getByRole('button',{name:'Save'}).click();
    await page.waitForFunction(form=>!form.isConnected,oldForm);await assignment.getByRole('combobox').selectOption('');assert.equal(await assignment.getByLabel('Subscription expiry').inputValue(),'');
    await assignment.getByRole('button',{name:'Save'}).click();await userUsage.nth(1).getByText('Unlimited',{exact:true}).waitFor();
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    await page.locator('#lang').selectOption('ar',{force:true});
    await company.getByRole('button',{name:'الاشتراك والاستخدام'}).click();
    await page.locator('.platform-usage-value bdi').first().waitFor();
    for(const width of [320,390,1024]){
      await page.setViewportSize({width,height:840});
      const metrics=await page.locator('.platform-subscription').evaluate(panel=>{
        const values=[...panel.querySelectorAll('dd:has(.platform-usage-value)')].map(row=>[...row.children].map(item=>{
          const box=item.getBoundingClientRect();return {left:box.left,right:box.right,width:box.width,caption:item.querySelector('small')?.textContent};
        }));
        return {rtl:getComputedStyle(panel).direction==='rtl',width:innerWidth,scroll:document.documentElement.scrollWidth,values,
          controls:[...panel.querySelectorAll('input:not([type=checkbox]),select,button')].map(node=>node.getBoundingClientRect().height),
          checkboxLabel:panel.querySelector('.platform-addon-toggle')?.getBoundingClientRect().height};
      });
      assert(metrics.rtl&&metrics.scroll<=width,JSON.stringify(metrics));assert.equal(metrics.values.length,5,'users, storage, linked devices, voice and video have separate usage rows');
      for(const row of metrics.values){assert.equal(row.length,3);for(const value of row)assert(value.caption&&value.width>=42&&value.left>=0&&value.right<=width);assert(row[0].left>row[1].left&&row[1].left>row[2].left);}
      assert(metrics.controls.every(height=>height>=44));assert(metrics.checkboxLabel>=44,'checkbox has a >=44px labelled touch target');
    }
    await page.goto(scope+'/platform/');await page.locator('#lang').selectOption('en',{force:true});
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
    await page.getByLabel('Setup code').waitFor();assert.equal(new URL(page.url()).hash,'');assert.equal((await page.getByLabel('Setup code').inputValue()).length,64);
  }finally{await browser.close();}
});
test('trusted founder device rotates, revalidates founder access and forgets logout across tabs',async()=>{
  const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,headless:true});
  try{
    const context=await browser.newContext(),page=await context.newPage();
    let refresh='',revision=0,permitted=true,revoked=false,password='not-a-real-password';
    const workspace=randomUUID(),founder=randomUUID(),events=[];
    const directory=Array.from({length:14},(_,i)=>({id:randomUUID(),name:'Office '+(i+1),accounts:i,status:'active'}));
    const endpoint='https://founder.test';
    await context.route('**/*',async route=>{
      const url=new URL(route.request().url()),file=url.pathname.slice(1);
      if(file.endsWith('wow-cloud-config.js'))return route.fulfill({contentType:'text/javascript',body:'window.WOW_CLOUD_CONFIG='+JSON.stringify({endpoint:endpoint+'/api',workspaceId:workspace,publishableKey:'fixture'})});
      if(file==='api'){
        const body=route.request().postDataJSON();events.push(body.action);
        if(body.action==='accounts.changePassword'){
          assert.equal(body.founderOnly,true);assert.equal(body.reauthenticate,true);
          if(body.currentPassword!==password)return route.fulfill({status:403,json:{ok:false,error:{code:'CURRENT_PASSWORD_INCORRECT'}}});
          password=body.newPassword;refresh='';return route.fulfill({json:{ok:true,reauthenticate:true}});
        }
        if(body.action==='auth.signIn'&&body.password!==password)return route.fulfill({status:401,json:{ok:false}});
        if(body.action==='auth.refresh'&&(revoked||body.refreshToken!==refresh))return route.fulfill({status:401,json:{ok:false}});
        if(['auth.refresh','auth.signIn'].includes(body.action)){
          refresh=randomUUID();revision++;
          return route.fulfill({json:{ok:true,workspaceId:workspace,identity:{currentAccount:{id:founder,name:'Founder',status:'active',sessionVersion:1}},
            session:{access_token:'access-'+revision,refresh_token:refresh,expires_at:Math.floor(Date.now()/1000)+3600}}});
        }
        if(body.action==='platform.company.list')return route.fulfill({status:permitted?200:403,json:permitted?{ok:true,total:directory.length,companies:directory.slice(body.offset,body.offset+50)}:{ok:false,error:{code:'ACCESS_DENIED'}}});
        if(body.action==='platform.company.inspect'){
          const workspace=directory.find(row=>row.id===body.workspaceId);assert.equal(body.section,'summary');
          return route.fulfill({json:{ok:true,workspace,summary:{accounts:workspace.accounts}}});
        }
        if(body.action==='platform.company.activation')return route.fulfill({json:{ok:true,state:'awaiting_approval',name:'Pending owner',username:'owner.test',canApprove:true}});
        return route.fulfill({json:{ok:true,cases:[],unreadCases:0}});
      }
      if(file==='platform/'||file==='platform/index.html')return route.fulfill({path:path.join(__dirname,'../platform/index.html')});
      if(['platform/dashboard.js','platform/dashboard.css','platform/admin-shell.js','platform/analytics.js','platform/qr-invite.js','platform/admin-audio.js','platform/pricing-cards.js','platform/preferences.js','platform/support.js','platform/company-brand.css','ui-identity.css'].includes(file))return route.fulfill({path:path.join(__dirname,'..',file)});
      return route.abort();
    });
    const signin=async trusted=>{
      await page.getByLabel('Founder username').fill('local-fixture');
      await page.getByLabel('Password',{exact:true}).fill(password);
      if(trusted)await page.getByRole('checkbox').check();
      await page.getByRole('button',{name:'Sign in',exact:true}).click();await page.locator('.wf-founder-check').waitFor();
    };
    const open=async()=>{await page.goto(endpoint+'/platform/');await page.locator('#lang').selectOption('en',{force:true});};
    await open();await signin(false);await open();await page.getByLabel('Founder username').waitFor();assert(!events.includes('auth.refresh'));
    await signin(true);const first=refresh;
    await page.evaluate(()=>{location.hash='companies';});
    const cards=page.locator('#platform-page-companies > .platform-company-card:visible');
    await cards.first().waitFor();assert.equal(await cards.count(),12);
    for(const width of [360,900,1440]){
      await page.setViewportSize({width,height:900});
      const grid=await cards.evaluateAll(rows=>rows.map(row=>row.getBoundingClientRect().toJSON()));
      assert(grid.every(row=>row.left>=0&&row.right<=width&&row.height>44));
      if(width===360)assert(grid[1].top>=grid[0].bottom);
      else assert.equal(grid[0].top,grid[1].top);
    }
    await page.setViewportSize({width:360,height:780});
    await page.locator('#lang').selectOption('ar',{force:true});
    const firstCard=page.getByRole('article',{name:directory[0].name,exact:true});
    const devicesLink=firstCard.locator('.platform-company-device-link');
    await devicesLink.waitFor();
    assert.equal(await firstCard.evaluate(card=>getComputedStyle(card).direction),'rtl');
    const bounds=await devicesLink.boundingBox();
    assert(bounds.width>=44&&bounds.height>=44);
    await devicesLink.focus();await page.keyboard.press('Enter');
    await page.waitForURL('**/#company/'+directory[0].id+'/devices');
    await page.getByRole('link',{name:'العودة إلى الشركات',exact:true}).click();
    await page.locator('#lang').selectOption('en',{force:true});
    await page.getByRole('button',{name:'Next',exact:true}).click();
    await cards.filter({hasText:'Office 14'}).waitFor();assert.equal(await cards.count(),2);
    await page.getByRole('button',{name:'Previous',exact:true}).click();await cards.filter({hasText:'Office 12'}).waitFor();
    await page.evaluate(id=>{location.hash='company/'+id+'/activation';},directory[13].id);
    await page.getByRole('heading',{name:'Company settings · Office 14'}).waitFor();
    await page.getByRole('button',{name:'Activate owner account'}).waitFor();
    assert.equal(await cards.count(),0);
    await page.getByRole('link',{name:'Back to companies'}).click();
    await cards.first().waitFor();assert.equal(await cards.count(),12);
    const stored=await page.evaluate(()=>Object.values(localStorage).join());assert(stored.includes(first)&&!stored.includes('not-a-real-password')&&!stored.includes('access-'));
    await page.reload();await page.locator('.wf-founder-check').waitFor();assert.notEqual(refresh,first);
    await page.evaluate(()=>dispatchEvent(new Event('offline')));assert.equal(await page.locator('.wf-founder-check').count(),0);
    await page.evaluate(()=>dispatchEvent(new Event('online')));await page.locator('.wf-founder-check').waitFor();
    const peer=await context.newPage();await peer.goto(endpoint+'/platform/');await peer.locator('.wf-founder-check').waitFor();
    await page.locator('#lang').selectOption('en',{force:true});
    page.once('dialog',dialog=>dialog.accept());
    await page.locator('#platformMenuButton').click();
    await page.locator('#platformSideDrawer .platform-drawer-signout').click();
    await peer.locator('.platform-login').waitFor();assert(events.includes('auth.signOut'));await peer.close();
    await signin(true);permitted=false;await page.reload();await page.locator('.platform-login').waitFor();await page.waitForFunction(()=>!Object.keys(localStorage).some(k=>k.startsWith('wow.platform.remember')));
    assert.equal(await page.locator('.wf-founder-check').count(),0);permitted=true;
    await page.locator('#lang').selectOption('en',{force:true});await signin(true);revoked=true;await page.reload();await page.waitForFunction(()=>!Object.keys(localStorage).some(k=>k.startsWith('wow.platform.remember')));assert.equal(await page.locator('.wf-founder-check').count(),0);
    revoked=false;await open();await signin(true);await page.evaluate(()=>{location.hash='settings'});
    const secret=page.locator('.platform-password-settings'),nextSecret=randomUUID();
    await secret.locator('summary').click();await secret.getByLabel('Current password').fill(randomUUID());
    await secret.getByLabel('New password (12–128 characters)',{exact:true}).fill(nextSecret);await secret.getByLabel('Confirm new password').fill(randomUUID());
    await secret.getByRole('button',{name:'Change password'}).click();await secret.getByText('The new passwords do not match.').waitFor();
    assert(!events.includes('accounts.changePassword'));
    await secret.getByLabel('Confirm new password').fill(nextSecret);await secret.getByRole('button',{name:'Change password'}).click();
    await secret.getByText('The current password is incorrect.').waitFor();assert.equal(await secret.getByLabel('Current password').inputValue(),'');
    await secret.getByLabel('Current password').fill(password);await secret.getByRole('button',{name:'Change password'}).click();
    await page.getByText('Password changed. Sign in with your new password.').waitFor();
    const retained=await page.evaluate(()=>[Object.keys(localStorage),Object.values(localStorage).join(),Object.values(sessionStorage).join()]);
    assert(!retained[0].some(key=>key.startsWith('wow.platform.remember')));assert(!retained.slice(1).join().includes(nextSecret));
    assert.equal(new URL(page.url()).pathname,'/platform/');await signin(false);
  }finally{await browser.close();}
});
