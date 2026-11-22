/* Synthetic browser flow. Every browser navigation stays on the routed fixture
   origin. The production credential store or primary backend is never used. */
const {chromium}=require('playwright');
const {readFile}=require('node:fs/promises');
const path=require('node:path'),assert=require('node:assert/strict');
const base=path.resolve(__dirname,'..');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 try{
   for(const [width,language] of [[360,'ar'],[390,'tr'],[768,'fr'],[1024,'ru'],[1280,'en']]){
     const page=await browser.newPage({viewport:{width,height:860},acceptDownloads:true});
     const errors=[];page.on('pageerror',e=>errors.push(e.message));
     await page.route('**/*',async route=>{
       const url=new URL(route.request().url());
       if(url.origin!=='https://gallery-fixture.invalid')return route.abort();
       if(url.pathname==='/')return route.fulfill({contentType:'text/html',body:'<!doctype html><html><head><meta name="viewport" content="width=device-width"></head><body><main></main></body></html>'});
       if(url.pathname==='/assets/wow-furniture-logo.png')return route.fulfill({contentType:'image/png',body:await readFile(path.join(base,'assets/wow-furniture-logo.png'))});
       return route.abort();
     });
     await page.goto('https://gallery-fixture.invalid/');
     await page.addStyleTag({content:':root{--brand-primary:#23556d;--ui-accent:#23556d;--text:#122d39;--text2:#54666c;--card:#fff;--border:#cad8dc;--business-soft:#f0f5f6}*{box-sizing:border-box}body{margin:12px;font:16px Arial,sans-serif}'});
     await page.addStyleTag({path:path.join(base,'modules/gallery/styles.css')});
     await page.evaluate(lang=>{
       document.documentElement.lang=lang;document.documentElement.dir=lang==='ar'?'rtl':'ltr';
       window.registrations=new Map();window.WFModules={register:record=>window.registrations.set(record.id,record)};
     },language);
     for(const file of ['core','exports','legacy-layout','workspace'])await page.addScriptTag({path:path.join(base,'modules/gallery',file+'.js')});
     await page.evaluate(lang=>{
       const product={productId:7,name:'Console 7',collection:'console',priceMinor:1235,currency:'USD',published:true,stock:4,dims:[{l:120,w:40,h:80}],hasImage:false};
       window.receipts=[];window.layouts=[];window.mountGallery=(route,params={})=>{
         window.handle?.dispose();const api={getSession:()=>({authenticated:true,currentAccount:{role:'custom'},workspaceId:'fixture',userId:'buyer',authGeneration:1,sessionVersion:1}),
           can:()=>true,notify(){},open:(name,args)=>window.mountGallery(name,args),request:async(action,input)=>{
             if(action==='gallery.snapshot')return {items:[product,{...product,productId:9,name:'Table 9',collection:'table'}],hasMore:false,presentation:{version:0}};
             if(action==='gallery.presentation'){window.layouts.push(input);return {ok:true};}
             if(action==='gallery.order.place'){const o={id:crypto.randomUUID(),number:'G-FIXTURE',status:'pending',createdAt:new Date().toISOString(),customer:'Fixture',items:[{...product,quantity:1,sold:0}]};
               window.receipts.push(o);return {orderId:o.id,number:o.number,version:1};}
             if(action==='gallery.personal')return {items:window.receipts,hasMore:false,print:{version:0}};
             throw Error(action);
           }};
         window.handle=window.registrations.get(route).mount({route,container:document.querySelector('main'),api,lang,params});
       };window.mountGallery('gallery');
     },language);
     const labels=await page.evaluate(lang=>Object.fromEntries(['add','cart','place','accepted','pdf','importLayout','save','layoutFileInvalid'].map(k=>[k,window.WFGalleryCore.t(k,lang)])),language);
     const collection=page.locator('[data-collection="console"]');
     await collection.click();
     assert.equal(await collection.getAttribute('aria-current'),'page');
     assert.equal(await page.locator('.wfg-product').count(),1);
     for(const view of ['grid2','grid3','grid4','masonry','panorama','list']){
       await page.locator('.wfg-toolbar select').selectOption(view);
       assert.equal(await page.locator('.wfg-products.wfg-'+view).count(),1);
       assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
     }
     await page.locator('.wfg-image-button').click();
     const details=page.locator('.wfg-lightbox-details');
     assert.ok((await details.innerText()).includes('Console 7'));
     assert.ok((await details.locator('.wfg-price').innerText()).includes('12'));
     await page.keyboard.press('Escape');
     await page.getByRole('button',{name:labels.add,exact:true}).click();
     await page.getByRole('button',{name:labels.cart+' (1)',exact:true}).click();
     const confirm=page.getByRole('button',{name:labels.place,exact:true});assert.equal(await confirm.isDisabled(),true);
     await page.getByRole('checkbox',{name:labels.accepted}).check();await confirm.click();await page.getByRole('dialog').filter({hasText:'G-FIXTURE'}).waitFor();
     const download=page.waitForEvent('download');await page.getByRole('button',{name:labels.pdf,exact:true}).click();
     const file=await download;assert.equal((await readFile(await file.path())).subarray(0,5).toString(),'%PDF-');
     assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
     await page.evaluate(()=>window.mountGallery('gallery-studio'));
     await page.getByRole('button',{name:labels.importLayout,exact:true}).click();
     const dialog=page.getByRole('dialog'),layoutFile=dialog.locator('input[type=file]');
     const submit=dialog.getByRole('button',{name:labels.save,exact:true});
     await layoutFile.setInputFiles({name:'layout.json',mimeType:'application/json',buffer:Buffer.from('{}')});
     await dialog.getByText(labels.layoutFileInvalid).waitFor();
     assert.equal(await submit.isDisabled(),true);
     const source={projectRef:'sldthbnigivpsqixccah',tables:{home_cards:[{
       id:7,order_num:1,title:'Console',section_key:'console',is_active:true}]},counts:{home_cards:1}};
     await layoutFile.setInputFiles({name:'layout.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(source))});
     await dialog.getByRole('listitem').filter({hasText:'Console'}).waitFor();
     assert.equal(await page.evaluate(()=>window.layouts.length),0);
     await submit.click();await dialog.waitFor({state:'detached'});
     const [saved]=await page.evaluate(()=>window.layouts);
     assert.equal(saved.version,0);assert.equal(saved.value.cards[0].collection,'console');
     assert.deepEqual(errors,[]);await page.close();
   }
   console.log('Gallery browser controls, PDF download and RTL/mobile width passed.');
 }finally{await browser.close();}
})().catch(error=>{console.error(error.message);process.exitCode=1;});
