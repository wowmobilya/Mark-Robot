const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox','--autoplay-policy=no-user-gesture-required']});
 const page=await browser.newPage({viewport:{width:1024,height:768},hasTouch:true});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(process.env.TEST_URL||'http://127.0.0.1:3010/',{waitUntil:'load'});await page.waitForTimeout(700);
 await page.evaluate(async()=>{
  wfBackupCloseRestoreModal();qblStopCamera();delete window.BarcodeDetector;
  const canvas=document.createElement('canvas');canvas.width=canvas.height=360;
  const img=new Image();img.src=generateQRCodeDataURI('TEST-4242');await img.decode();
  const ctx=canvas.getContext('2d');ctx.fillStyle='white';ctx.fillRect(0,0,360,360);ctx.imageSmoothingEnabled=false;ctx.drawImage(img,0,0,360,360);
  const stream=canvas.captureStream(5);Object.defineProperty(navigator.mediaDevices,'getUserMedia',{configurable:true,value:async()=>stream});
  S.products=[{id:42,name:'TEST-4242',barcode:'TEST-4242',type:'coffee_table',priceA:10}];showPage('quick-barcode');
 });
 await page.waitForFunction(()=>QBL.phase===2,null,{timeout:15000});assert.equal(await page.evaluate(()=>QBL.currentProduct.barcode),'TEST-4242');assert.equal(await page.evaluate(()=>typeof ZXingBrowser.BrowserMultiFormatReader),'function');
 // Slow native detection must never overlap and stopping must release the stream.
 const scan=await page.evaluate(async()=>{qblStopCamera();const canvas=document.createElement('canvas');QBL.stream=canvas.captureStream(5);let active=0,max=0,calls=0;window.BarcodeDetector=class{async detect(){active++;max=Math.max(max,active);calls++;await new Promise(r=>setTimeout(r,650));active--;return []}};qblStartDetection(document.getElementById('qblVideo'));await new Promise(r=>setTimeout(r,1600));qblStopCamera();return {max,calls,stopped:!QBL.stream}});
 assert.equal(scan.max,1);assert(scan.calls>=1);assert(scan.stopped);
 // A camera permission request that resolves after leaving must release its tracks.
 const stale=await page.evaluate(async()=>{let resolve;const stream=document.createElement('canvas').captureStream(5);Object.defineProperty(navigator.mediaDevices,'getUserMedia',{configurable:true,value:()=>new Promise(r=>resolve=r)});showPage('quick-barcode');await new Promise(r=>setTimeout(r,100));showPage('settings');resolve(stream);await new Promise(r=>setTimeout(r,100));return {stopped:stream.getTracks().every(t=>t.readyState==='ended'),stream:!!QBL.stream}});
 assert(stale.stopped);assert(!stale.stream);
 await page.evaluate(()=>{switchTab('language');wfBackupCloseRestoreModal()});assert.equal(await page.locator('.wf-language-card svg').count(),5);
 await page.waitForTimeout(350);const side=await page.evaluate(()=>document.getElementById('sidebar').getBoundingClientRect().left);assert(side>=1023,'closed sidebar covers the tablet content');
 for(const viewport of [{width:1024,height:768},{width:768,height:1024},{width:390,height:844}]){await page.setViewportSize(viewport);await page.waitForTimeout(150);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'settings horizontal overflow');await page.evaluate(()=>{showPage('quick-barcode');qblStopCamera()});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'barcode horizontal overflow');}
 await page.evaluate(()=>{S.products=Array.from({length:500},(_,i)=>({id:i,name:'MODEL '+i,barcode:'CODE'+i,type:'coffee_table'}));qblBuildDropdown('MODEL','coffee_table')});assert.equal(await page.locator('#qblDdList [onclick^="qblPickFromDropdown"]').count(),500);
 assert.deepEqual(errors,[]);await browser.close();console.log('PASS ZXing QR fallback, non-overlapping scans, camera cleanup, tablet/mobile layout, five flags and 500 search results');
})().catch(e=>{console.error(e);process.exit(1)});
