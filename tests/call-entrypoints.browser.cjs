const {test}=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const {chromium}=require('playwright');

test('phone inbox and team pick a real peer before calling, while group and direct rooms keep their own call paths',async t=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH});t.after(()=>browser.close());
 const page=await browser.newPage({viewport:{width:390,height:844}});
 page.setDefaultTimeout(5000);await page.route('https://calls.test/',r=>r.fulfill({contentType:'text/html',body:'<main id="chat"></main>'}));await page.goto('https://calls.test/');
 for(const name of ['files/core.js','chat/core.js','chat/call-ui.js','chat/workspace.js'])await page.addScriptTag({path:path.join(__dirname,'../modules',name)});
 await page.evaluate(()=>{
  const me={id:crypto.randomUUID(),name:'Owner',username:'owner',owner:true},other={id:crypto.randomUUID(),name:'Coworker',username:'coworker'};
  const team={id:crypto.randomUUID(),kind:'team',name:'Team'},group={id:crypto.randomUUID(),kind:'group',name:'Group'},direct={id:crypto.randomUUID(),kind:'direct',name:other.name,peer:other};
  window.calls=[];window.pair=false;window.directRoom=false;window.allow=true;
  window.WFCallManager={create:()=>({start:async(r,k)=>calls.push([r.kind,k]),poll:async()=>{},selectRoom:async()=>{},stop(){}})};
  const api={can:()=>allow,getSession:()=>({userId:me.id,role:'owner'}),request:async(a,p)=>{
   switch(a){
    case 'chat.init':return {me};
    case 'chat.rooms':return {rooms:directRoom?[team,group,direct]:[team,group]};
    case 'chat.members':return {members:[]};
    case 'chat.people':if(!p.staffOnly)throw Error('wrong search scope');return {people:pair?[me,other]:[me]};
    case 'chat.direct':if(!pair||p.targetId!==other.id)throw Error('wrong peer');directRoom=true;return {roomId:direct.id};
    case 'chat.feed':return {messages:[],prefs:{},typing:[]};
    default:return {};
   }
  }};
  window.mountFixture=()=>WFChat.mount({container:document.getElementById('chat'),api,lang:'ar'});window.app=mountFixture();
 });
 const inbox=page.locator('.wf-chat-side .wf-calling-picker'),head=page.locator('.wf-chat-head'),dialog=()=>page.locator('dialog[open]');
 await page.locator('.wf-chat-room').first().waitFor();await inbox.getByRole('button',{name:'اتصال صوتي'}).click();
 assert.match(await dialog().locator('.wf-chat-call-empty').innerText(),/إعدادات الشركة/);assert.deepEqual(await page.evaluate(()=>calls),[]);
 await dialog().evaluate(d=>d.close());await page.evaluate(()=>{pair=true;});
 await page.getByRole('button',{name:'Team',exact:false}).click();
 await head.locator('.wf-calling-picker').getByRole('button',{name:'اتصال فيديو'}).click();
 await dialog().getByRole('button',{name:'تحديد'}).click();
 await dialog().getByRole('button',{name:'اتصال فيديو'}).waitFor();assert.deepEqual(await page.evaluate(()=>calls),[]);
 await dialog().getByRole('button',{name:'اتصال فيديو'}).click();assert.deepEqual(await page.evaluate(()=>calls),[['direct','video']]);
 await head.locator('.wf-calling-shortcuts').getByRole('button',{name:'اتصال صوتي'}).click();
 await page.locator('.wf-chat-room').filter({hasText:'Group'}).click();
 await head.locator('.wf-calling-shortcuts').getByRole('button',{name:'اتصال فيديو'}).click();
 assert.deepEqual(await page.evaluate(()=>calls),[['direct','video'],['direct','audio'],['group','video']]);
 await page.evaluate(()=>{app.dispose();allow=false;app=mountFixture();});await page.locator('.wf-chat-room').first().waitFor();
 assert.equal(await page.locator('.wf-calling-shortcuts button').count(),0);
});
