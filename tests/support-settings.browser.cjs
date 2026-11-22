const {test}=require('node:test');
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const path=require('node:path');

test('member opens a private complaint from settings, sends an actual re-encoded image and sees replies only inside their own session',async()=>{
  const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,headless:true});
  try{
    const page=await browser.newPage({viewport:{width:360,height:800},hasTouch:true});
    await page.route('https://support.test/**',r=>r.fulfill({body:'<html lang="en"><aside id="sidebar"></aside><div id="page-settings"><div class="wf-settings-workspace"><div class="tabs"></div><div class="wf-settings-content"></div></div></div></html>',contentType:'text/html'}));
    await page.goto('https://support.test/');
    await page.evaluate(()=>{
      window.calls=[];window.actor='unit-member';window.auth=true;window.caseItem=null;window.messages=[];
      window.switchTab=()=>{};window.permitted=true;window.WFAccountAccess={can:()=>permitted,allow:()=>{throw Error("Unexpected permission notification")}};
      window.WFCloudClient={getClient:()=>({getSnapshot:()=>({authenticated:auth,connection:'online',currentAccount:{id:actor},workspaceId:'unit-company'}),subscribe(cb){window.identityChanged=cb;},async request(action,data){
        calls.push({action,data});
        if(action==='support.list')return {cases:caseItem?[caseItem]:[],unreadCases:caseItem?.unread?1:0};
        if(action==='support.create'){
          if(!window.lostResponse){window.lostResponse=true;throw Error('network');}
          window.caseItem={id:crypto.randomUUID(),text:data.text,photo:data.photo,unread:false};messages.push({text:data.text,fromFounder:false});return {caseId:caseItem.id};
        }
        if(action==='support.open'){caseItem.unread=false;return {case:caseItem,messages};}
        if(action==='support.reply'){messages.push({text:data.text,fromFounder:false});return {caseId:caseItem.id};}
        throw Error('Unexpected action');
      }})};
    });
    await page.addScriptTag({path:path.resolve(__dirname,'../support-settings.js')});
    await page.getByRole('button',{name:'Complaints and replies'}).click();await page.getByText('No complaints yet.').waitFor();
    await page.getByRole('button',{name:'New complaint'}).click();await page.getByLabel('Complaint text').fill('<strong>Phone display</strong>');
    const image=Buffer.from(await page.evaluate(()=>{const c=document.createElement('canvas');c.width=c.height=48;return c.toDataURL('image/png').split(',')[1];}),'base64');
    await page.getByLabel('Optional photo').setInputFiles({name:'photo.png',mimeType:'image/png',buffer:image});
    await page.getByRole('button',{name:'Send'}).click();await page.getByText('Could not complete the request. Try again.').waitFor();
    await page.getByRole('button',{name:'Send'}).click();await page.getByRole('img',{name:'Complaint photo'}).waitFor();
    assert.equal(await page.locator('article strong').first().textContent(),'You');assert.equal(await page.locator('article p').textContent(),'<strong>Phone display</strong>');
    const result=await page.evaluate(()=>calls.filter(c=>c.action==='support.create').map(c=>c.data));
    assert.equal(result[0].requestId,result[1].requestId);assert.deepEqual(Buffer.from(result[1].photo.base64,'base64').subarray(0,3),Buffer.from([255,216,255]));assert.equal(result[1].photo.mime,'image/jpeg');
    await page.getByLabel('New reply').fill('Thanks');await page.getByRole('button',{name:'Reply',exact:true}).click();await page.getByText('Thanks',{exact:true}).waitFor();
    await page.evaluate(()=>{caseItem.unread=true;messages.push({text:'We received it',fromFounder:true});});await page.getByRole('button',{name:'Back'}).click();
    await page.getByText('Unread · 1').waitFor();await page.getByRole('button',{name:'<strong>Phone display</strong>'}).click();await page.getByText('Founder',{exact:true}).waitFor();
    await page.evaluate(()=>{window.auth=false;window.identityChanged();});await page.getByText('Sign in to your company account online.').waitFor();
    assert.equal(await page.locator('img,textarea').count(),0);
    await page.evaluate(()=>{window.switchTab('company');window.caseItem=null;window.messages=[];window.actor='customer';window.auth=true;window.permitted=false;window.identityChanged();});
    await page.locator('#sidebar').getByRole('button',{name:'Complaints and replies'}).click();
    await page.getByRole('dialog',{name:'Complaints and replies'}).getByText('No complaints yet.').waitFor();
    assert.equal(await page.getByRole('dialog').locator('#page-settings').count(),0);
    await page.evaluate(()=>{window.auth=false;window.identityChanged();});assert.equal(await page.getByRole('dialog').count(),0);assert.equal(await page.getByText('We received it').count(),0);assert.equal(await page.evaluate(()=>WFPlatformSupport.open()),false);
  }finally{await browser.close();}
});

test('real WOW settings directory opens support from its card and the push entry, retaining role boundaries',async t=>{
  const dir=path.resolve(__dirname,'..'),fs=require('node:fs/promises');
  const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH});t.after(()=>browser.close());
  const page=await browser.newPage({viewport:{width:390,height:844},serviceWorkers:'block'});
  await page.route('**/*',async route=>{
    const url=new URL(route.request().url());if(url.origin!=='https://settings.test')return route.abort();
    const file=path.resolve(dir,'.'+(url.pathname==='/'?'/index.html':url.pathname));if(!file.startsWith(dir+path.sep))return route.abort();
    if(url.pathname==='/support-settings.js'){
      // Keep all real navigation and account modules. Replace only the scoped data service
      // during support binding and instrument the real permission check for denial alerts.
      const source=await fs.readFile(file,'utf8');
      const binding=`{
        const real=window.WFCloudClient;
        window.fixtureSettings=true;window.fixtureDenials=0;
        const access=window.WFAccountAccess, oldCan=access.can, oldAllow=access.allow;
        access.can=function(key){return key==='settings.view'?window.fixtureSettings:oldCan.apply(this,arguments);};
        access.allow=function(key){if(key==='settings.view'){if(!window.fixtureSettings)window.fixtureDenials++;return window.fixtureSettings;}return oldAllow.apply(this,arguments);};
        window.WFCloudClient={...real,getClient:()=>({getSnapshot:()=>({authenticated:true,connection:'online',workspaceId:'fixture',currentAccount:{id:window.fixtureSettings?'owner':'customer'}}),subscribe(fn){window.fixtureNotify=fn;},request:async()=>({cases:[],unreadCases:0})})};
      `+source+`\nwindow.WFCloudClient=real;}`;
      return route.fulfill({body:binding,contentType:'application/javascript'});
    }
    try{return await route.fulfill({path:file});}catch{return route.fulfill({status:404,body:''});}
  });
  await page.goto('https://settings.test/');await page.waitForFunction(()=>window.WFPlatformSupport&&window.fixtureNotify&&document.querySelector('#wf-settings-description-support'));
  await page.evaluate(()=>{window.setLang('en');window.showPage('settings');});
  const tab=page.locator('#wf-settings-tab-support'),modal=page.locator('#wfSettingsDialog');
  await tab.click();await modal.locator('#stab-support').getByText('No complaints yet.').waitFor();
  await page.keyboard.press('Escape');await modal.waitFor({state:'hidden'});assert.equal(await modal.locator('#stab-support>*').count(),0);
  await page.evaluate(()=>{window.setLang('fr');});await tab.locator('small').getByText('Contacter le fondateur et consulter ses réponses').waitFor();
  await page.evaluate(()=>window.WFPlatformSupport.open());await modal.getByText('Aucune réclamation.').waitFor();
  await modal.locator('header button').first().click();await modal.waitFor({state:'hidden'});
  await page.evaluate(()=>{window.fixtureSettings=false;window.fixtureNotify();window.fixtureNotify();});
  assert.equal(await page.evaluate(()=>window.fixtureDenials),0);
  await page.evaluate(()=>window.WFPlatformSupport.open());const personal=page.locator('dialog.wf-app-dialog[open]');await personal.getByText('Aucune réclamation.').waitFor();
  assert.equal(await modal.isVisible(),false);assert.equal(await page.evaluate(()=>window.fixtureDenials),0);
});
