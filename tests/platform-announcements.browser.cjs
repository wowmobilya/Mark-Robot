'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const {chromium}=require('playwright');

test('a founder confirms a targeted message and a tenant inbox clears on sign-out',async()=>{
  const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||undefined});
  try{
    const page=await browser.newPage({viewport:{width:320,height:740}});
    await page.route('https://announcements.test/',route=>route.fulfill({contentType:'text/html',body:
      '<html lang="en"><main id="panel"></main><section id="page-notifications" class="active"><div class="wf-notifications-body"></div></section></html>'}));
    await page.goto('https://announcements.test/');
    for(const asset of ['platform/dashboard.css','modules/platform/push/wow-push-settings.css']){
      await page.addStyleTag({path:path.resolve(__dirname,'..',asset)});
    }
    await page.addScriptTag({path:path.resolve(__dirname,'../platform/announcements.js')});
    await page.evaluate(()=>{
      const workspaceId=crypto.randomUUID(),userId=crypto.randomUUID(),id=crypto.randomUUID();
      window.events=[];
      window.WFPlatformAnnouncements.mount({container:document.querySelector('#panel'),language:'en',async request(action,data){
        events.push({action,data});
        if(action==='company.list')return {companies:[{id:workspaceId,name:'Company A',status:'active'}],total:1};
        if(action==='announcement.preview')return {recipients:4,confirmation:'a'.repeat(64)};
        if(action==='announcement.send'){
          if(events.filter(event=>event.action===action).length===1)throw Error('Initial response lost');
          return {recipients:4,pushJobs:1};
        }
        throw Error('Unexpected admin action');
      }});
      window.identity={authenticated:true,workspaceId,userId,currentAccount:{id:userId,status:'active'},mode:'remote'};
      window.WFCloud={getSnapshot:()=>identity,async request(action,_data,{assertAuthorized}){
        assertAuthorized();
        if(action==='announcement.read')return {read:true};
        if(action==='announcement.inbox')return {announcements:[{id,title:'User inbox message',body:'<strong>Text only</strong>',
          createdAt:'2026-11-23T14:00:00Z',read:false}],unread:1,nextCursor:null};
        throw Error('Unexpected inbox action');
      }};
    });
    await page.getByText('User messages and notifications',{exact:true}).click();
    await page.getByLabel('Recipients').selectOption('company');
    await page.getByLabel('Choose a company').selectOption({label:'Company A'});
    const editor=page.getByLabel('Message',{exact:true});
    const suggestion=page.getByRole('button',{name:'Insert suggested text'});
    const category=page.getByLabel('Message type');
    await category.selectOption('maintenance');
    await suggestion.click();
    assert.match(await editor.inputValue(),/planning service maintenance/);
    assert.equal(await suggestion.isDisabled(),true);
    await category.selectOption('update');
    assert.match(await editor.inputValue(),/planning service maintenance/);
    await page.getByLabel('Title').fill('Ready');
    await editor.fill('Review this message.');
    await page.getByText('Characters · 20 / 2,500',{exact:true}).waitFor();
    await page.getByRole('checkbox').check();
    await page.getByRole('button',{name:'Review before sending'}).click();
    await page.getByText('Recipient accounts 4').waitFor();
    await page.locator('.platform-announcement-review').getByText('Company A',{exact:true}).waitFor();
    assert.equal(await page.evaluate(()=>events.some(event=>event.action==='announcement.send')),false);
    await page.getByRole('button',{name:'Send now'}).click();
    await page.getByText('The request could not be completed. Try again.').waitFor();
    await page.getByRole('button',{name:'Send now'}).click();
    await page.getByText('User inbox messages saved 4 · Device alerts queued 1').waitFor();
    await page.getByText('Characters · 0 / 2,500',{exact:true}).waitFor();
    await suggestion.waitFor({state:'hidden'});
    const sends=await page.evaluate(()=>events.filter(event=>event.action==='announcement.send').map(event=>event.data));
    assert.equal(sends.length,2);
    assert.deepEqual(sends[0],sends[1]);
    await page.addScriptTag({path:path.resolve(__dirname,'../modules/platform/push/wow-announcements.js')});
    await page.getByText('<strong>Text only</strong>',{exact:true}).waitFor();
    await page.getByRole('button',{name:'Mark as read'}).click();
    await page.getByRole('button',{name:'Mark as read'}).waitFor({state:'detached'});
    await page.evaluate(()=>{identity=null;window.dispatchEvent(new Event('wf-cloud-session-change'));});
    await page.getByText('User inbox message',{exact:true}).waitFor({state:'detached'});
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  }finally{await browser.close();}
});
