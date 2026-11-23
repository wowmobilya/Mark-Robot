'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const {chromium}=require('playwright');

test('server login animation uses real health, frameless robot and preserves form in mobile/RTL',async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH});
 try{
  const page=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});
  let state='ready',requests=0;
  await page.route('https://wow-login.invalid/*',async route=>{
   const u=new URL(route.request().url());
   if(u.pathname==='/service/health'){
    requests++;
    if(state==='unreachable')return route.abort('connectionrefused');
    const ok=state==='ready';
    return route.fulfill({status:ok?200:503,json:{service:'mark-robot',ok,checkedAt:'2026-11-23T14:00:00.000Z'}});
   }
   if(u.pathname==='/')return route.fulfill({contentType:'text/html',body:
    '<!doctype html><html lang="ar" dir="rtl" style="--brand-primary:#3f7c94;--bg:#eaf2f6;--card:#fff;--input:#f8fbfc;--text:#102c3c;--text2:#516575;--border:#dbe4e8;--ui-accent:#3f7c94;--ui-control:12px">'+
    '<meta name="viewport" content="width=device-width,initial-scale=1"><main><header><div class="platform-brand"><h1>WOW Admin</h1></div></header>'+
    '<section id="content"><form class="platform-login"><label>الاسم<input autocomplete="username"></label><label>كلمة المرور<input type="password"></label>'+
    '<button type="submit">تسجيل الدخول</button></form></section><p id="status" role="status"></p><nav class="platform-app-actions">WOW</nav></main></html>'});
   return route.abort();
  });
  await page.goto('https://wow-login.invalid/');
  await page.addStyleTag({path:path.resolve(__dirname,'../platform/dashboard.css')});
  await page.addStyleTag({path:path.resolve(__dirname,'../platform/login-experience.css')});
  await page.addScriptTag({path:path.resolve(__dirname,'../platform/login-experience.js')});
  await page.evaluate(()=>{
   window.experience=window.WFPlatformLoginExperience.mount({
    content:document.querySelector('#content'),form:document.querySelector('form'),
    feedback:document.querySelector('#status'),language:'ar',endpoint:'/service'
   });
  });
  const experience=page.locator('.platform-auth-experience');
  await experience.getByText('السيرفر يستجيب').waitFor();
  assert(requests>0,'health requires a real request, not a staged animation');
  assert.equal(await experience.getAttribute('data-phase'),'ready');
  assert.equal(await experience.locator('.platform-auth-face').evaluate(el=>getComputedStyle(el).backgroundColor),'rgba(0, 0, 0, 0)');
  assert.equal(await experience.locator('.platform-auth-face').evaluate(el=>getComputedStyle(el).borderTopWidth),'0px');
  assert.equal(await experience.locator('.platform-auth-mouth').count(),1);
  assert.equal(await experience.locator('.platform-auth-nose').count(),1);
  assert.equal(await experience.locator('.platform-auth-blink').first().evaluate(el=>getComputedStyle(el).animationName),'none');
  for(const size of [{width:320,height:700},{width:360,height:800},{width:390,height:844},{width:1024,height:768}]){
   await page.setViewportSize(size);
   const values=await page.evaluate(()=>{
    const box=document.querySelector('.platform-login').getBoundingClientRect();
    return {scroll:document.documentElement.scrollWidth,width:innerWidth,
      left:box.left,right:box.right,inputs:[...document.querySelectorAll('.platform-login input')].map(x=>x.getBoundingClientRect().width)};
   });
   assert(values.scroll<=values.width+1,JSON.stringify({size,values}));
   assert(values.left>=-1&&values.right<=values.width+1,JSON.stringify({size,values}));
   assert(values.inputs.every(w=>w>110),JSON.stringify({size,values}));
  }
  state='unreachable';
  await page.evaluate(()=>dispatchEvent(new Event('online')));
  await experience.getByText('لا يمكن الوصول إلى السيرفر').waitFor();
  assert.equal(await experience.getAttribute('data-phase'),'unreachable');
  await page.evaluate(()=>{document.querySelector('.platform-login button').disabled=true;});
  await experience.getByText('جارٍ التحقق من بيانات الدخول…').waitFor();
  await page.evaluate(()=>{
   document.querySelector('#status').textContent='فشل الدخول';
   document.querySelector('.platform-login button').disabled=false;
  });
  await experience.getByText('راجع رسالة تسجيل الدخول أدناه').waitFor();
  await page.evaluate(()=>window.experience.dispose());
  assert.equal(await page.locator('.platform-auth-experience').count(),0);
  assert.equal(await page.evaluate(()=>document.documentElement.classList.contains('platform-auth-screen')),false);
 }finally{await browser.close();}
});
