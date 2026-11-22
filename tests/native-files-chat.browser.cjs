'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),path=require('node:path');
const {chromium}=require('playwright');
test('phone chat attaches an existing authorized file by reference; gallery file view switches to compact',async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream','--autoplay-policy=no-user-gesture-required']});
 try{
  const page=await browser.newPage({viewport:{width:390,height:844},hasTouch:true});
  await page.route('https://app.test/',r=>r.fulfill({contentType:'text/html',body:'<main id="chat"></main><main id="files"></main>'}));
  await page.goto('https://app.test/');
  for(const name of ['files/core.js','chat/core.js','files/workspace.js','chat/workspace.js'])
   await page.addScriptTag({path:path.join(__dirname,'../modules',name)});
  await page.evaluate(()=>{
   const roomId=crypto.randomUUID(),room={id:roomId,kind:'group',name:'Staff'},me={id:crypto.randomUUID(),role:'owner'};
   const support={id:crypto.randomUUID(),kind:'direct',name:'Support',peer:{id:crypto.randomUUID(),name:'Actual owner',owner:true}};window.supportId=support.id;
   window.messageCount=0;
   const file={id:crypto.randomUUID(),name:'Quote.pdf',kind:'pdf',mime:'application/pdf',bytes:10,originalBytes:10,createdAt:new Date().toISOString()};
   window.captureStreams=[];const capture=navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
   navigator.mediaDevices.getUserMedia=async spec=>{const stream=await capture(spec);captureStreams.push(stream);return stream;};
   window.events=[];window.sentFile=file.id;window.allowed=true;
   const api={can:p=>p!=='files.export'||allowed,getSession:()=>({currentAccount:me}),async request(action,body){
    events.push([action,body]);
    switch(action){
     case 'chat.init':return {me};case 'chat.rooms':return {rooms:[room,support]};case 'chat.members':return {members:[]};
     case 'chat.feed':return {messages:Array.from({length:messageCount},(_,i)=>({id:String(i+1),roomId:body.roomId,authorId:support.peer.id,author:'Actual owner',text:'Message '+(i+1),createdAt:new Date(0).toISOString()})),prefs:{wallpaper:'plain',readId:'0'},readByPeer:'0'};
     case 'files.list':return {files:[file],folders:[],count:1,used:10,quota:100000};
     case 'chat.send':return {id:'1'};default:return {};
    }
   }};
   window.chatMount=(params={roomId})=>WFChat.mount({container:document.querySelector('#chat'),api,lang:'en',params});
   window.m=chatMount();window.fm=WFFiles.mount({container:document.querySelector('#files'),api,lang:'en'});
  });
  await page.getByRole('button',{name:'My files',exact:true}).click();
  await page.getByRole('dialog').getByRole('button',{name:/Quote.pdf/}).click();
  await page.locator('.wf-chat-send-tools').getByRole('button',{name:'Send',exact:true}).click();
  const sent=await page.evaluate(()=>events.find(e=>e[0]==='chat.send')[1]);
  assert.equal(sent.fileId,await page.evaluate(()=>sentFile));assert.equal(sent.data,undefined);
  assert.equal(await page.evaluate(()=>events.some(e=>['files.open','files.upload','chat.upload','chat.sendFile','files.share'].includes(e[0]))),false);
  await page.getByLabel('Layout',{exact:true}).selectOption('dense');assert.equal(await page.locator('.wf-files-entries.dense').count(),1);
  await page.evaluate(()=>{m.dispose();allowed=false;m=chatMount();});
  await page.locator('.wf-chat-send-tools').getByRole('button',{name:'Send',exact:true}).waitFor();
  assert.equal(await page.getByRole('button',{name:'My files',exact:true}).count(),0);
  const tools=page.locator('.wf-chat-send-tools'),info=page.locator('.wf-chat-draft-info');
  for(const [button,tag] of [['Voice note','audio'],['Record video','video']]){
    await tools.getByRole('button',{name:button,exact:true}).click();
    await page.waitForFunction(()=>captureStreams.at(-1)?.getAudioTracks()[0]?.readyState==='live');
    if(tag==='video')await info.locator('video').waitFor();
    await page.waitForTimeout(1100);
    await tools.getByRole('button',{name:'Finish recording',exact:true}).click();
    await info.getByRole('button',{name:'Preview',exact:true}).click();
    const dialog=page.getByRole('dialog'),media=dialog.locator(tag);
    await media.evaluate(node=>node.play());
    await page.waitForFunction(tag=>document.querySelector('dialog[open] '+tag)?.currentTime>0,tag);
    assert.equal(await page.evaluate(()=>captureStreams.at(-1).getTracks().every(tr=>tr.readyState==='ended')),true);
    await dialog.evaluate(node=>node.close());
    if(tag==='audio'){
      await info.getByRole('button',{name:'Cancel',exact:true}).click();
      assert.equal(await page.evaluate(()=>events.filter(([a])=>a==='chat.sendFile').length),0);
    }else{
      await tools.getByRole('button',{name:'Send',exact:true}).click();
      await page.waitForFunction(()=>events.some(([a,p])=>a==='chat.sendFile'&&p.mime.startsWith('video/')&&p.data.length>20));
    }
  }
  await tools.getByRole('button',{name:'Record video',exact:true}).click();await info.locator('video').waitFor();
  await tools.getByRole('button',{name:'Cancel',exact:true}).click();
  assert.equal(await page.evaluate(()=>captureStreams.at(-1).getTracks().every(tr=>tr.readyState==='ended')),true);
  await page.evaluate(()=>{navigator.mediaDevices.getUserMedia=async()=>{throw new DOMException('Denied','NotAllowedError');};});
  await tools.getByRole('button',{name:'Record video',exact:true}).click();await page.getByText('Recording unavailable. You can choose an existing file.').waitFor();
  assert.equal(await tools.getByRole('button',{name:'Attach',exact:true}).isEnabled(),true);
  await page.addStyleTag({content:'.wf-chat-feed{height:160px;overflow:auto}.wf-chat-line{min-height:42px}'});
  await page.evaluate(()=>{m.dispose();events.length=0;messageCount=22;m=chatMount({ownerSupport:true});});
  await page.waitForFunction(()=>events.some(([action,p])=>action==='chat.read'&&p.roomId===supportId&&p.messageId==='22'));
  await page.locator('.wf-chat-feed').evaluate(el=>{el.scrollTop=0;});
  await page.evaluate(()=>{messageCount++;dispatchEvent(new Event('online'));});
  await page.getByRole('button',{name:'New messages (1)'}).waitFor();
  assert.equal(await page.evaluate(()=>events.some(([a,p])=>a==='chat.read'&&p.messageId==='23')),false);
  await page.getByRole('button',{name:'New messages (1)'}).click();
  await page.waitForFunction(()=>events.some(([a,p])=>a==='chat.read'&&p.messageId==='23'));

 }finally{await browser.close();}
});
