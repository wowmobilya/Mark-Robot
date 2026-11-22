'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright');
const repo=path.resolve(__dirname,'..');
const source=fs.readFileSync(path.join(repo,'index.html'),'utf8');
const styles=[...source.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>|<link\b[^>]*rel="stylesheet"[^>]*href="([^"]+)"[^>]*>/gi)]
  .map(match=>match[1]||(!match[2]?.includes(':')&&fs.existsSync(path.join(repo,match[2].split('?')[0]))?fs.readFileSync(path.join(repo,match[2].split('?')[0]),'utf8'):'')).join('\n');
test('chat shell keeps the composer above the dock and gives the room list and history independent scrolling',async()=>{
  const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true});
  try{
    for(const [width,height,dir] of [[320,640,'rtl'],[390,844,'rtl'],[768,1024,'ltr'],[1280,720,'rtl']]){
      const page=await browser.newPage({viewport:{width,height}});
      await page.route('https://chat.test/',r=>r.fulfill({contentType:'text/html',body:'<!doctype html>'}));
      await page.goto('https://chat.test/');
      await page.setContent('<html class="wf-section-mode" dir="'+dir+'"><body><main class="main"><section id="page-chat" class="page active wf-ops-page wf-module-page"><header class="sct-sticky-header"><h1>Chat</h1></header><div class="wf-module-statusbar"><button>Online</button></div><div class="wf-ops-body"></div></section></main></body></html>');
      await page.addStyleTag({content:styles});
      for(const file of ['modules/files/core.js','modules/chat/core.js','modules/chat/call-ui.js','modules/chat/workspace.js'])
        await page.addScriptTag({path:path.join(repo,file)});
      await page.evaluate((dir)=>{
        const me={id:'00000000-0000-4000-8000-000000000001',role:'owner'};
        const room={id:'00000000-0000-4000-8000-000000000002',kind:'team',name:'Workshop'};
        const group={...room,id:'00000000-0000-4000-8000-000000000003',kind:'group',name:'Support',unread:2};
        const privateRoom={...room,id:'00000000-0000-4000-8000-000000000004',kind:'direct',name:'Service'};
        const api={can:()=>true,getSession:()=>({currentAccount:me}),async request(action){
          switch(action){
            case 'chat.init':return {me};
            case 'chat.rooms':return {rooms:[room,group,privateRoom]};
            case 'chat.members':return {members:[]};
            case 'chat.feed':return {messages:Array.from({length:50},(_,i)=>({id:String(i+1),roomId:room.id,authorId:me.id,author:'A',text:'Item '+i,createdAt:new Date(i*60000).toISOString()})),prefs:{wallpaper:'plain',readId:'0'},readByPeer:'0'};
            default:return {};
          }
        }};
        WFChat.mount({api,container:document.querySelector('.wf-ops-body'),lang:dir==='rtl'?'ar':'en',params:{roomId:room.id}});
      },dir);
      await page.locator('.wf-chat-line').first().waitFor();
      const callActions=await page.locator('.wf-chat-head .wf-calling-label-text').evaluateAll(labels=>labels.map(label=>{
        const box=label.getBoundingClientRect(),button=label.closest('button').getBoundingClientRect();
        return {label:label.textContent.trim(),width:box.width,height:button.height,start:button.left,end:button.right};
      }));
      assert.equal(callActions.length,2,'Team room contains both named call actions');
      for(const action of callActions)assert(action.label&&action.width>16&&action.height>=44&&action.start>=0&&action.end<=width,JSON.stringify(action));
      await page.locator('.wf-chat-attachments > summary').click();
      const menu=await page.locator('.wf-chat-attachments .wf-chat-more-menu').boundingBox();
      assert(menu&&menu.x>=0&&menu.x+menu.width<=width&&menu.y>=0);
      await page.locator('.wf-chat-attachments > summary').click();
      const metrics=await page.evaluate(()=>{
        const get=s=>document.querySelector(s),measure=s=>get(s).getBoundingClientRect();
        return {bottom:measure('.wf-chat-composer').bottom,feed:measure('.wf-chat-feed').height,history:get('.wf-chat-feed').scrollHeight,
          horizontal:document.documentElement.scrollWidth,side:getComputedStyle(get('.wf-chat-side')).display,
          border:getComputedStyle(get('.wf-chat-head button')).borderTopWidth};
      });
      assert(metrics.feed>=45&&metrics.history>metrics.feed,JSON.stringify(metrics));
      assert(metrics.bottom<=height-(width<=1024?66:0),JSON.stringify(metrics));assert(metrics.horizontal<=width,JSON.stringify(metrics));
      assert.equal(metrics.border,'1px');assert.equal(metrics.side,width<780?'none':'flex');
      if(width<780)await page.locator('.wf-chat-back').click();
      const inbox=page.locator('.wf-chat-sidebar-tools .wf-calling-picker .wf-calling-label-text');
      assert.equal(await inbox.count(),2,'Inbox contains both named call actions');
      for(const label of await inbox.all()){const box=await label.boundingBox();assert(box&&box.width>16&&box.x>=0&&box.x+box.width<=width);}
      const rows=page.locator('.wf-chat-rooms .wf-chat-room'),filters=page.locator('.wf-chat-filters button');
      const search=page.locator('.wf-chat-sidebar-tools input[type=search]');
      await filters.nth(1).click();assert.equal(await rows.count(),1);assert.match(await rows.first().innerText(),/Support/);
      await filters.nth(2).click();assert.equal(await rows.count(),2);
      await search.fill('sup');assert.equal(await rows.count(),1);
      await search.fill('nothing');assert.equal(await rows.count(),0);assert(await page.locator('.wf-chat-empty').isVisible());
      await search.fill('');await filters.first().click();assert.equal(await rows.count(),3);
      await page.close();
    }
  }finally{await browser.close();}
});
