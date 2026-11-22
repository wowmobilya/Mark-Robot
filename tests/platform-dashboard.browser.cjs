const {test}=require('node:test'),assert=require('node:assert/strict');
const {chromium}=require('playwright'),path=require('node:path'),fs=require('node:fs');
const {randomUUID}=require('node:crypto');
test('founder can provision, scan the owner setup URL, and save a plan in mobile layout',async()=>{
  const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,headless:true});
  try{
    const page=await browser.newPage({viewport:{width:390,height:844},hasTouch:true});
    const events=[],wid=randomUUID(),scope='https://platform.test';let created=false;
    await page.route('**/*',async route=>{
      const u=new URL(route.request().url());
      if(u.hostname!=='platform.test')return route.abort();
      if(u.pathname==='/service'){
        const body=route.request().postDataJSON();events.push(body.action);let response;
        switch(body.action){
          case 'auth.signIn':response={session:{access_token:'local-fixture',expires_at:Math.floor(Date.now()/1000)+300}};break;
          case 'platform.company.list':response={total:created?1:0,companies:created?[{id:wid,name:'Test',accounts:0,status:'active'}]:[]};break;
          case 'platform.company.create':assert.match(body.setupToken,/^[0-9a-f]{64}$/);created=true;response={workspaceId:wid};break;
          case 'platform.plans.list':response={plans:[]};break;
          case 'platform.plans.save':assert.equal(body.deviceLimit,3);response={};break;
          default:throw Error(body.action);
        }
        return route.fulfill({json:{ok:true,...response}});
      }
      if(u.pathname.endsWith('wow-cloud-config.js'))return route.fulfill({contentType:'application/javascript',body:"window.WOW_CLOUD_CONFIG={workspaceId:'scope',endpoint:'/service',publishableKey:'local'}"});
      let f=u.pathname==='/platform/'?'platform/index.html':u.pathname.slice(1);
      if(!['platform/index.html','platform/dashboard.css','platform/dashboard.js','vendor/zxing-browser.min.js'].includes(f))return route.abort();
      return route.fulfill({path:path.join(__dirname,'..',f),contentType:f.endsWith('.js')?'application/javascript':f.endsWith('.css')?'text/css':'text/html; charset=utf-8'});
    });
    await page.goto(scope+'/platform/');await page.locator('#lang').selectOption('en');
    await page.getByLabel('Founder username').fill('fixture');await page.getByLabel('Password',{exact:true}).fill(randomUUID());
    await page.getByRole('button',{name:'Sign in'}).click();await page.getByLabel('Company name').fill('Test');await page.getByRole('button',{name:'Create company'}).click();
    const link=await page.getByText('Owner setup link').getAttribute('href');assert.equal(new URL(link).searchParams.get('setup'),wid);
    const rendered=page.locator('svg');await rendered.waitFor();const decoded=await page.evaluate(async()=>{const svg=document.querySelector('svg').cloneNode(true);svg.style.background='white';const url='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(new XMLSerializer().serializeToString(svg));const img=new Image();img.src=url;await img.decode();const canvas=document.createElement('canvas');canvas.width=canvas.height=220;const c=canvas.getContext('2d');c.fillStyle='white';c.fillRect(0,0,220,220);c.drawImage(img,0,0);return new ZXingBrowser.BrowserQRCodeReader().decodeFromCanvas(canvas).getText();});assert.equal(decoded,link);
    await page.getByRole('button',{name:'Plan',exact:true}).click();await page.getByLabel('Plan',{exact:true}).last().fill('Test plan');await page.getByLabel('Device limit').fill('3');await page.getByRole('button',{name:'Save'}).click();await page.waitForFunction(()=>!document.querySelector('form button:disabled'));
    assert(events.includes('platform.plans.save'));assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    await page.goto(link);await page.getByLabel('رمز الإعداد').waitFor();assert.equal(new URL(page.url()).hash,'');assert.equal((await page.getByLabel('رمز الإعداد').inputValue()).length,64);
  }finally{await browser.close();}
});
