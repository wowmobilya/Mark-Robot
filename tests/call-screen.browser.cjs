const {test}=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const {chromium}=require('playwright');

test('focused incoming, connected, compact and restored calls on mobile and desktop',async t=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,
   args:['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream']});t.after(()=>browser.close());
 for(const [width,height] of [[320,640],[844,390],[1280,800]]){
   const page=await browser.newPage({viewport:{width,height}});page.setDefaultTimeout(5000);
   await page.route('https://voice.test/',r=>r.fulfill({contentType:'text/html',body:'<html lang="ar" dir="rtl"><body><main id="page-chat"><section class="wf-chat"><div id="test-chat"></div></section></main></body></html>'}));
   await page.goto('https://voice.test/');
   for(const css of ['styles.css','call-ui.css'])await page.addStyleTag({path:path.join(__dirname,'../modules/chat',css)});
   await page.addScriptTag({path:path.join(__dirname,'../modules/chat/call-ui.js')});
   await page.evaluate(async()=>{
     const me=crypto.randomUUID(),peer=crypto.randomUUID();
     window.vibrations=[];Object.defineProperty(navigator,'vibrate',{configurable:true,value:pattern=>{vibrations.push(pattern);return true;}});
     window.fixtureStream=await navigator.mediaDevices.getUserMedia({audio:true,video:true});
     const state={call:{id:crypto.randomUUID(),roomId:crypto.randomUUID(),callerId:peer,kind:'video',status:'ringing',
       participants:[{id:me,status:'invited'},{id:peer,name:'Mark',status:'joined'}]},busy:false,muted:false};
     let callbacks;
     window.emit=()=>callbacks.onState(state);
     window.fixtureState=state;
     window.WFCallManager={create(options){callbacks=options;return {poll:async()=>{},stop(){},
       accept(){state.call.status='active';state.call.participants[0].status='joined';state.localStream=fixtureStream;emit();},
       micToggle(){state.muted=!state.muted;fixtureStream.getAudioTracks()[0].enabled=!state.muted;emit();},
       cameraToggle(){const track=fixtureStream.getVideoTracks()[0];track.enabled=!track.enabled;emit();},
       switchCamera(){window.cameraFlips=(window.cameraFlips||0)+1;},
       finish(){state.call=null;emit();},decline(){state.call=null;emit();}
     };}};
     window.markConnected=()=>{state.connected=true;state.call.startedAt=new Date().toISOString();callbacks.onRemote(peer,fixtureStream.clone());emit();};
     window.view=WFChatCallUI.mount({container:document.getElementById('test-chat'),api:{getSession:()=>({userId:me}),can:()=>true}});emit();
   });
   const dialog=page.getByRole('dialog',{name:'Mark'});await dialog.waitFor();
   assert.equal(await page.evaluate(()=>vibrations.some(v=>Array.isArray(v)&&v.length>1)),true,'foreground incoming call vibrates when supported');
   const size=await dialog.boundingBox();
   if(width<780||height<580){assert.equal(Math.round(size.width),width);assert.equal(Math.round(size.height),height);}
   await dialog.getByRole('button',{name:'قبول'}).click();await dialog.getByText('جارٍ الاتصال…',{exact:true}).waitFor();
   assert.equal(await page.evaluate(()=>vibrations.some(v=>v===0)),true,'answer stops vibration immediately');
   await page.evaluate(()=>markConnected());
   await dialog.locator('.wf-call-preview video').waitFor();await dialog.locator('.wf-calling-videos video').waitFor();
   await dialog.getByRole('button',{name:'كتم صوت الطرف الآخر'}).click();
   assert.equal(await dialog.locator('.wf-calling-videos video').evaluate(el=>el.muted),true);
   await dialog.getByRole('button',{name:'تشغيل صوت الطرف الآخر'}).click();
   assert.equal(await dialog.locator('.wf-calling-videos video').evaluate(el=>el.muted),false);
   await dialog.getByRole('button',{name:'تبديل الكاميرا'}).click();
   assert.equal(await page.evaluate(()=>cameraFlips),1);
   await page.evaluate(()=>{fixtureState.quality='fair';emit();});
   await dialog.getByText(/إشارة متوسطة/).waitFor();
   await dialog.getByRole('button',{name:'كتم الصوت'}).click();await dialog.getByRole('button',{name:'تشغيل الميكروفون'}).waitFor();
   await dialog.getByRole('button',{name:'إيقاف الكاميرا'}).click();assert.equal(await dialog.locator('.wf-call-preview').isVisible(),false);
   await dialog.getByRole('button',{name:'تصغير المكالمة'}).click();assert.equal(await dialog.isVisible(),false);
   assert.equal(await page.evaluate(()=>fixtureStream.getVideoTracks()[0].readyState),'live');
   const restore=page.getByRole('button',{name:/فتح شاشة المكالمة/});assert.equal(await restore.evaluate(el=>el===document.activeElement),true);
   await page.locator('.wf-call-restore').getByRole('button',{name:'تشغيل الميكروفون'}).click();
   assert.equal(await page.evaluate(()=>fixtureStream.getAudioTracks()[0].enabled),true);
   await restore.click();await dialog.waitFor();await dialog.getByRole('button',{name:'تشغيل الكاميرا'}).click();
   assert.equal(await dialog.locator('.wf-call-preview').isVisible(),true);
   await page.evaluate(()=>{fixtureState.call.kind='audio';emit();});assert.equal(await dialog.getByRole('button',{name:'إيقاف الكاميرا'}).count(),0);
   await page.evaluate(()=>{fixtureState.call.participants.push({id:crypto.randomUUID(),name:'Lina',status:'joined'},{id:crypto.randomUUID(),name:'Tarek',status:'invited'});emit();});
   const group=page.getByRole('dialog',{name:/Lina/});await group.getByText(/المشاركون 3\/4/).waitFor();
   assert.equal(await group.locator('.wf-calling-videos .wf-calling-tile:visible').count(),3);
   await group.getByText(/Tarek ·/).waitFor();await group.getByRole('button',{name:'إنهاء'}).click();
   assert.equal(await group.isVisible(),false);assert.equal(await restore.isVisible(),false);
   await page.evaluate(()=>{view.dispose();fixtureStream.getTracks().forEach(t=>t.stop());});await page.close();
 }
});
