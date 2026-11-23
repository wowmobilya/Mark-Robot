const {test}=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const {chromium}=require('playwright');
test('owner inbox identifies applicant, opens scoped settings, and asks for push consent only on click',async()=>{
  const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,headless:true});
  try{
    const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
    await page.route('https://admin.test/platform/',r=>r.fulfill({contentType:'text/html',body:'<meta name="viewport" content="width=device-width"><nav></nav>'}));
    await page.goto('https://admin.test/platform/');
    await page.addStyleTag({path:path.join(__dirname,'../platform/owner-alerts.css')});
    for(const name of ['owner-alert-device.js','owner-alerts.js'])await page.addScriptTag({path:path.join(__dirname,'../platform',name)});
    const id='adb5b000-9c21-49b4-92ec-0eb273230ab4';
    await page.evaluate(id=>{
      window.prompts=0;window.subscribed=0;window.pending=true;window.workerActive=true;
      let permission='default',subscription;
      Object.defineProperty(window,'Notification',{value:{get permission(){return permission;},requestPermission:async()=>{prompts++;return permission='granted';}}});
      Object.defineProperty(navigator.serviceWorker,'getRegistration',{value:async()=>({active:workerActive,scope:location.href,pushManager:{
        getSubscription:async()=>subscription,subscribe:async()=>{if(permission!=='granted'){await Notification.requestPermission();}return subscription={toJSON:()=>({endpoint:'test'}),unsubscribe:async()=>{subscription=null;return true;}};}
      }})});
      const request=async(action,data)=>{
        if(action==='push.config')return {publicKey:'A'.repeat(87)};
        if(action==='push.subscribe'){subscribed++;return {subscribed:true};}
        if(action==='push.unsubscribe'){subscribed--;return {};}
        return {total:pending?1:0,requests:pending?[{workspaceId:id,company:'شركة الأثاث',applicant:'أحمد علي',username:'ahmad'}]:[]};
      };
      window.remount=()=>{
        window.handle?.dispose();
        window.handle=window.WFPlatformOwnerAlerts.mount({nav:document.querySelector('nav'),request,language:'ar',userId:'test-user'});
      };
      window.expire=()=>{subscription=null;subscribed=0;};
      remount();
    },id);
    await page.locator('summary').click();
    const request=page.getByRole('link',{name:/شركة الأثاث/});
    assert.match(await request.innerText(),/أحمد علي · @ahmad/);
    assert.equal(await request.getAttribute('href'),'#company/'+id+'/activation');
    assert.equal(await page.evaluate(()=>prompts),0);
    await page.getByRole('button',{name:'تفعيل إشعارات هذا الجهاز'}).click();
    await page.getByText('إشعارات طلبات التفعيل مفعّلة.').waitFor();
    assert.deepEqual(await page.evaluate(()=>[prompts,subscribed]),[1,1]);
    await page.evaluate(()=>{expire();workerActive=false;remount();});
    await page.waitForFunction(()=>document.querySelector('.platform-owner-alerts button')?.disabled===false);
    await page.evaluate(()=>{
      workerActive=true;
      navigator.serviceWorker.dispatchEvent(new Event('controllerchange'));
    });
    await page.waitForFunction(()=>subscribed===1);
    assert.equal(await page.evaluate(()=>prompts),1);
    await page.locator('summary').click();
    await page.getByRole('button',{name:'إيقاف إشعارات هذا الجهاز'}).click();
    await page.waitForFunction(()=>subscribed===0);
    await page.evaluate(()=>remount());
    await page.locator('summary').click();
    await page.getByRole('button',{name:'تفعيل إشعارات هذا الجهاز'}).waitFor();
    assert.deepEqual(await page.evaluate(()=>[prompts,subscribed]),[1,0]);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    await request.click();assert.equal(new URL(page.url()).hash,'#company/'+id+'/activation');
    await page.evaluate(()=>{pending=false;window.dispatchEvent(new Event('wow-owner-approval-changed'));});
    await page.locator('summary').click();await page.getByText('لا توجد طلبات معلّقة.').waitFor();
    await page.evaluate(()=>handle.dispose());
  }finally{await browser.close();}
});


test('admin service worker displays only approval notices and scopes their destination',async()=>{
  const http=require('node:http'),fs=require('node:fs');
  const server=http.createServer((req,res)=>{
    if(req.url==='/platform/sw.js'){res.setHeader('Content-Type','application/javascript');res.end(fs.readFileSync(path.join(__dirname,'../platform/sw.js')));}
    else if(req.url==='/platform/install.js'){res.setHeader('Content-Type','application/javascript');res.end(fs.readFileSync(path.join(__dirname,'../platform/install.js')));}
    else {res.setHeader('Content-Type','text/html');res.end('<title>Admin</title><select id="lang"><option>en</option></select><button id="installPlatform"></button><p id="installHint"></p>');}
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  let browser;
  try{
    browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,headless:true});
    const ctx=await browser.newContext({permissions:['notifications']}),page=await ctx.newPage();
    const origin='http://127.0.0.1:'+server.address().port,base=origin+'/platform/';
    await page.goto(base);const cdp=await ctx.newCDPSession(page);
    const registration=new Promise(resolve=>cdp.on('ServiceWorker.workerRegistrationUpdated',({registrations})=>{
      const r=registrations.find(r=>r.scopeURL===base&&!r.isDeleted);if(r)resolve(r.registrationId);
    }));
    await cdp.send('ServiceWorker.enable');await page.evaluate(async()=>{await navigator.serviceWorker.register('sw.js');await navigator.serviceWorker.ready;});
    const id='a1b2c300-0ea1-42d4-886c-c4f7ccaded11',registrationId=await registration;
    const message={kind:'owner.approval',language:'ar',route:'owner-approval',params:{workspaceId:id},validUntil:new Date(Date.now()+60000).toISOString()};
    await cdp.send('ServiceWorker.deliverPushMessage',{origin,registrationId,data:JSON.stringify({...message,kind:'support.reply'})});
    await cdp.send('ServiceWorker.deliverPushMessage',{origin,registrationId,data:JSON.stringify({...message,params:{workspaceId:'../bad'}})});
    await cdp.send('ServiceWorker.deliverPushMessage',{origin,registrationId,data:JSON.stringify(message)});
    await page.waitForFunction(async()=>!!(await (await navigator.serviceWorker.ready).getNotifications()).length);
    const notices=await page.evaluate(async()=> (await (await navigator.serviceWorker.ready).getNotifications()).map(n=>({tag:n.tag,title:n.title,data:n.data,body:n.body})));
    assert.deepEqual(notices,[{title:'WOW Admin',tag:'wow-owner-approval/'+id,data:{workspaceId:id},body:'طلب تفعيل مالك جديد في إدارة الشركات.'}]);
    await page.addScriptTag({url:base+'install.js'});
    await page.waitForFunction(()=>!!navigator.serviceWorker.controller);
    const worker=ctx.serviceWorkers().find(sw=>sw.url()===base+'sw.js');
    await worker.evaluate(async()=>{
      const [notification]=await self.registration.getNotifications();
      const click=new Event('notificationclick');click.notification=notification;
      let handled;click.waitUntil=promise=>{handled=promise;};self.dispatchEvent(click);await handled.catch(err=>{if(err.name!=='InvalidAccessError')throw err;});
    });
    await page.waitForURL(base+'#company/'+id+'/activation',{timeout:5000});
  }finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
});
