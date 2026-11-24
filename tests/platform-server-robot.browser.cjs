'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const {chromium}=require('playwright');

test('admin robot uses actual server and tenant readings and marks unreachable service without layout overflow',async()=>{
  const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH});
  try{
    const page=await browser.newPage({viewport:{width:320,height:760},reducedMotion:'reduce'});
    const at=new Date().toISOString();
    let transport='ready';
    await page.route('https://robot.test/',route=>route.fulfill({contentType:'text/html',
      body:'<meta name="viewport" content="width=device-width, initial-scale=1"><main style="--brand-primary:#3f7c94;--card:#fff;--text:#102030;--text2:#43586a;--input:#fafcfd;--border:#d9e3ea;--ui-accent:#3f7c94"><section id="platform-page-home"><section class="platform-home-hero"></section></section></main>'}));
    await page.route('https://robot.test/service/health',route=>{
      if(transport==='unreachable')return route.abort('connectionrefused');
      const ready=transport==='ready';
      return route.fulfill({status:ready?200:503,json:{ok:ready,service:'mark-robot',checkedAt:at}});
    });
    await page.goto('https://robot.test/');
    await page.addStyleTag({path:path.resolve(__dirname,'../platform/server-robot.css')});
    await page.addStyleTag({path:path.resolve(__dirname,'../platform/home-command-center.css')});
    await page.addScriptTag({path:path.resolve(__dirname,'../platform/server-robot.js')});
    const id='adb5b000-9c21-49b4-92ec-0eb273230ab4';
    await page.evaluate(({id,at})=>{
      window.robotRequests=[];
      window.WFPlatformServerRobot.mount({
        host:document.querySelector('.platform-home-hero'),state:{companies:[{id,name:'Fixture company',status:'active'}],total:1},
        language:'en',endpoint:'/service',
        async request(action,params){
          window.robotRequests.push({action,params});
          if(action==='operationsReport'&&window.reportDown)throw Error('offline');
          if(action==='operationsReport')return {
            checkedAt:at,healthy:false,database:{bytes:315e6,clientConnections:2,maxConnections:75},
            scheduler:{lastRunAt:at,staleWorkspaces:1},push:{pending:7,overdue:3},activeIncidents:1,
            incidents:[{active:true,code:'PUSH_BACKLOG',lastSeenAt:at}],recentFailures:[{code:'XX000',at}]
          };
          if(action==='limits.get')return {usedUsers:1,planId:'fixture',effectiveStorageBytes:500e6,effectiveDeviceLimit:2,usedBytes:500e6,usedDevices:1,usedVoiceMinutes:12.34,usedVideoMinutes:0};
          throw Error('UNEXPECTED_ACTION');
        }
      });
    },{id,at});
    const robot=page.locator('.platform-server-robot');
    await robot.getByText('Server responded. Some items need attention.').waitFor();
    assert.equal(await robot.getAttribute('data-state'),'attention');
    assert.equal(await robot.locator('.platform-server-robot-head time').getAttribute('datetime'),at);
    assert.equal(await robot.locator('.platform-robot-blink').first().evaluate(node=>getComputedStyle(node).animationName),'none');
    assert.equal(await robot.locator('.platform-server-robot-face').evaluate(node=>getComputedStyle(node).color),'rgb(63, 124, 148)');
    await robot.getByText('315 MB').waitFor();
    await robot.getByText('2 / 75').waitFor();
    await robot.getByText('Overdue notifications').waitFor();
    await robot.getByText('Recent failures', {exact:true}).click();
    await robot.getByText('PUSH_BACKLOG').waitFor();
    await robot.getByLabel('Select a company').selectOption(id);
    await robot.getByText('12.34',{exact:true}).waitFor();
    await robot.getByText('0',{exact:true}).waitFor();
    await robot.getByText('Usage has reached the limit').waitFor();
    assert.equal(await robot.getByRole('link',{name:'Open company devices'}).getAttribute('href'),'#company/'+id+'/devices');
    assert.equal(await robot.getByRole('link',{name:'Open usage details'}).getAttribute('href'),'#company/'+id+'/usage');
    assert.deepEqual(await page.evaluate(()=>window.robotRequests[1]),{action:'limits.get',params:{workspaceId:id}});
    for(const width of [320,390,768,1024,1280,1440,1920]){
      await page.setViewportSize({width,height:844});
      const bounds=await robot.evaluate(el=>{
        const r=el.getBoundingClientRect();
        return {fits:r.left>=-1&&r.right<=innerWidth+1,overflow:document.documentElement.scrollWidth>innerWidth,
          panels:getComputedStyle(el.querySelector('.platform-server-robot-sections')).gridTemplateColumns.split(' ').length};
      });
      assert(bounds.fits&&!bounds.overflow&&bounds.panels===(width<=740?1:2),JSON.stringify({width,bounds}));
      await robot.getByText('315 MB').waitFor();
    }
    await page.setViewportSize({width:320,height:760});
    assert.equal(await robot.getByRole('link',{name:/Registered companies/}).getAttribute('href'),'#companies');
    await robot.getByText('What needs attention?').waitFor();
    await page.evaluate(()=>{window.reportDown=true;});
    await robot.getByRole('button',{name:'Refresh server status'}).click();
    await robot.getByText('Server responded. Monitoring could not be refreshed.').waitFor();
    await robot.getByText('Showing the previous readings. Refresh to try again.').waitFor();
    await robot.getByText('315 MB').waitFor();
    transport='unavailable';
    await robot.getByRole('button',{name:'Refresh server status'}).click();
    await robot.getByText('The server reported that it is unavailable').waitFor();
    transport='unreachable';
    await robot.getByRole('button',{name:'Refresh server status'}).click();
    await robot.getByText('Could not reach the server from this device').waitFor();
  }finally{
    await browser.close();
  }
});
