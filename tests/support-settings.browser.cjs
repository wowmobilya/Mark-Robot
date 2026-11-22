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
      window.switchTab=()=>{};window.permitted=true;window.WFAccountAccess={allow:()=>permitted};
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
