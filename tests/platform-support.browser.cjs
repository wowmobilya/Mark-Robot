'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),path=require('node:path');
const {chromium}=require('playwright');
test('founder reads a private photo and retries a reply once with the same request id',async()=>{
  const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||undefined});
  try{
    const page=await browser.newPage({viewport:{width:320,height:740}});await page.route('https://support.test/',r=>r.fulfill({contentType:'text/html',body:'<html dir="rtl"><main><nav></nav><div id="panel"></div></main></html>'}));await page.goto('https://support.test/');
    for(const file of ['ui-identity.css','platform/dashboard.css'])await page.addStyleTag({path:path.resolve(__dirname,'..',file)});
    await page.addScriptTag({path:path.resolve(__dirname,'../platform/support.js')});
    await page.evaluate(()=>{
      const row={id:crypto.randomUUID(),companyName:'شركة الاختبار',authorName:'مرسل الاختبار',text:'مشكلة في العرض',unread:true,createdAt:'2026-10-01T12:00:00Z'},messages=[];
      window.events=[];window.module=WFPlatformSupport.mount({nav:document.querySelector('nav'),container:document.querySelector('#panel'),lang:'ar',async request(action,params){
        events.push({action,params});
        if(action==='support.list')return {cases:[row],unreadCases:Number(row.unread)};
        if(action==='support.open'){row.unread=false;return {case:{...row,photo:{mime:'image/jpeg',base64:'/9j/2Q=='}},messages};}
        if(action==='support.reply'){if(events.filter(x=>x.action===action).length===1)throw Error();messages.push({text:params.text,fromFounder:true,createdAt:row.createdAt});return {caseId:row.id};}
        throw Error();
      }});
    });
    await page.getByRole('button',{name:/صندوق الدعم.*1/}).click();await page.getByRole('button',{name:/شركة الاختبار/}).click();
    const image=page.locator('.platform-support img');assert.equal(await image.getAttribute('src'),null);
    await page.getByRole('button',{name:'عرض الصورة المرفقة'}).click();assert.match(await image.getAttribute('src'),/^data:image\/jpeg;base64,/);
    await page.getByRole('button',{name:'إخفاء الصورة'}).click();assert.equal(await image.getAttribute('src'),null);
    const input=page.getByLabel('كتابة رد');await input.fill('تمت مراجعة الصورة.');await page.getByRole('button',{name:'إرسال الرد'}).click();
    await page.getByText('تعذّر إتمام الطلب. أعد المحاولة.').waitFor();assert.equal(await input.inputValue(),'تمت مراجعة الصورة.');
    await page.getByRole('button',{name:'إرسال الرد'}).click();await page.getByText('تم إرسال الرد.').waitFor();
    assert.equal(await page.locator('.platform-support article').count(),1);const keys=await page.evaluate(()=>events.filter(x=>x.action==='support.reply').map(x=>x.params.requestId));assert.equal(keys[0],keys[1]);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    await page.evaluate(()=>window.module.dispose());assert.equal(await page.locator('.platform-support').count(),0);
    assert.deepEqual(await page.evaluate(()=>[localStorage.length,sessionStorage.length]),[0,0]);
  }finally{await browser.close();}
});
test('read-only inbox polling never prompts, explicit alerts are generic, scoped and deduplicated',async()=>{
  const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||undefined});
  try{
    const page=await browser.newPage();await page.route('https://support.test/platform/',r=>r.fulfill({contentType:'text/html',body:'<nav></nav><main></main>'}));await page.goto('https://support.test/platform/#support');
    await page.addScriptTag({path:path.resolve(__dirname,'../platform/support.js')});
    await page.evaluate(()=>{
      window.sent=[];window.prompted=0;window.refresh=null;window.update='2026-01-01';window.setInterval=fn=>{window.refresh=fn;return 1;};
      Object.defineProperty(window,'Notification',{value:{permission:'default',async requestPermission(){prompted++;this.permission='granted';return 'granted';}}});
      navigator.serviceWorker.getRegistration=async()=>({scope:location.origin+'/platform/',async showNotification(title,options){sent.push({title,options});}});
      window.mountSupport=()=>{
        window.supportHandle?.dispose();
        window.supportHandle=WFPlatformSupport.mount({nav:document.querySelector('nav'),container:document.querySelector('main'),lang:'en',userId:'founder',async request(){
          return {cases:[{id:'case-secret',companyName:'Private company',text:'Private topic',unread:true,createdAt:'2026-01-01',updatedAt:window.update}],unreadCases:1};
        }});
      };
      mountSupport();
    });
    const opt=page.getByRole('button',{name:'Enable support alerts while admin is open'});await opt.waitFor();
    await page.evaluate(()=>refresh());assert.equal(await page.evaluate(()=>prompted),0);
    await opt.click();await page.getByRole('button',{name:'Turn off support alerts'}).waitFor();await page.evaluate(()=>refresh());
    assert.equal(await page.evaluate(()=>sent.length),0);
    await page.evaluate(()=>mountSupport());
    await page.getByRole('button',{name:'Turn off support alerts'}).waitFor();
    assert.equal(await page.evaluate(()=>prompted),1);
    await page.evaluate(async()=>{update='2026-01-02';await refresh();await refresh();});
    const notifications=await page.evaluate(()=>sent);assert.equal(notifications.length,1);
    assert.equal(notifications[0].options.tag,'wow-platform-support');
    assert(!/Private company|Private topic|case-secret/.test(JSON.stringify(notifications)));
    await page.getByRole('button',{name:'Turn off support alerts'}).click();
    await page.evaluate(()=>mountSupport());
    await opt.waitFor();
    await page.evaluate(async()=>{update='2026-01-03';await refresh();});
    assert.equal(await page.evaluate(()=>sent.length),1);
  }finally{await browser.close();}
});
test('worker targets only its authenticated inbox entry on notification click',async()=>{
  const vm=require('node:vm'),fs=require('node:fs');const listeners={},messages=[],opened=[];
  let current=[];
  const mock={location:new URL('https://support.test/platform/sw.js'),addEventListener:(name,fn)=>listeners[name]=fn,
    clients:{matchAll:async()=>current,openWindow:async url=>opened.push(url)}};
  vm.runInNewContext(fs.readFileSync(path.resolve(__dirname,'../platform/sw.js'),'utf8'),{self:mock,URL});
  const invoke=()=>new Promise((resolve,reject)=>listeners.notificationclick({notification:{tag:'wow-platform-support',close(){}},waitUntil:p=>p.then(resolve,reject)}));
  current=[{url:'https://support.test/platform/recover.html'}];await invoke();assert.deepEqual(opened,['https://support.test/platform/#support']);
  current.push({url:'https://support.test/platform/',focus:async()=>({postMessage:m=>messages.push(m.type)})});await invoke();
  assert.deepEqual(messages,['wow-platform-open-support']);assert.equal(opened.length,1);
});
