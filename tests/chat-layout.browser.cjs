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
    for(const [width,height,dir] of [[390,844,'rtl'],[768,1024,'ltr'],[1280,720,'rtl']]){
      const page=await browser.newPage({viewport:{width,height}});
      await page.setContent('<html class="wf-section-mode" dir="'+dir+'"><body><main class="main"><section id="page-chat" class="page active wf-ops-page wf-module-page"><header class="sct-sticky-header"><h1>Chat</h1></header><div class="wf-module-statusbar"><button>Online</button></div><div class="wf-ops-body"></div></section></main></body></html>');
      await page.addStyleTag({content:styles});
      for(const file of ['modules/files/core.js','modules/chat/core.js','modules/chat/workspace.js'])
        await page.addScriptTag({path:path.join(repo,file)});
      await page.evaluate((dir)=>{
        const me={id:'00000000-0000-4000-8000-000000000001',role:'owner'};
        const room={id:'00000000-0000-4000-8000-000000000002',kind:'group',name:'Workshop'};
        const api={can:()=>true,getSession:()=>({currentAccount:me}),async request(action){
          switch(action){
            case 'chat.init':return {me};
            case 'chat.rooms':return {rooms:[room]};
            case 'chat.members':return {members:[]};
            case 'chat.feed':return {messages:Array.from({length:50},(_,i)=>({id:String(i+1),roomId:room.id,authorId:me.id,author:'A',text:'Item '+i,createdAt:new Date(i*60000).toISOString()})),prefs:{wallpaper:'plain',readId:'0'},readByPeer:'0'};
            default:return {};
          }
        }};
        WFChat.mount({api,container:document.querySelector('.wf-ops-body'),lang:dir==='rtl'?'ar':'en',params:{roomId:room.id}});
      },dir);
      await page.locator('.wf-chat-line').first().waitFor();
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
      await page.close();
    }
  }finally{await browser.close();}
});
