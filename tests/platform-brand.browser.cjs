const assert=require('node:assert/strict');
const path=require('node:path');
const {chromium}=require('playwright');

(async()=>{
  const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,headless:true});
  try{
    const page=await browser.newPage({viewport:{width:360,height:780}});
    let outbound=0;await page.route('https://untrusted.invalid/**',route=>{outbound++;return route.abort();});
    await page.setContent('<meta charset=utf-8><main></main>');
    await page.addStyleTag({path:path.resolve('platform/company-brand.css')});
    await page.addScriptTag({path:path.resolve('platform/company-brand.js')});
    await page.evaluate(()=>{
      const canvas=document.createElement('canvas');canvas.width=156;canvas.height=54;const ctx=canvas.getContext('2d');ctx.fillStyle='#444599';ctx.fillRect(0,0,156,54);
      const logo=canvas.toDataURL();window.upload=logo.split(',')[1];window.saved=[];
      const companies=[{id:'00112233-4455-6677-8899-aabbccddeeff',name:'شركة النجوم'},{id:'00112233-4455-6677-8899-ffeeddccbbaa',name:'Firma S'}];
      const view=window.WFPlatformBrand.create({config:{projectUrl:'https://fixture.invalid'},language:'ar',request:async(action,body)=>{
        if(action==='company.setBrand'){window.saved.push(body);return {revision:6};}
        return body.workspaceId===companies[0].id?{revision:5,image:logo}:{revision:1,url:'https://untrusted.invalid/pixel'};
      }});
      for(const company of companies){
        const row=document.createElement('article'),title=document.createElement('strong'),detail=document.createElement('details'),summary=document.createElement('summary');
        title.textContent=company.name;summary.textContent='تفاصيل';detail.append(summary);row.append(title,detail);document.querySelector('main').append(row);view.attach(row,detail,company);
      }
    });
    await page.waitForFunction(()=>document.querySelector('article .platform-brand-avatar img')?.naturalWidth===156);
    assert.equal(await page.locator('article').last().locator('.platform-brand-title .platform-brand-avatar').innerText(),'FS');
    await page.locator('summary').first().click();
    const file=await page.evaluate(()=>window.upload);
    await page.locator('input[type=file]').first().setInputFiles({name:'custom.png',mimeType:'image/png',buffer:Buffer.from(file,'base64')});
    await page.getByRole('button',{name:'حفظ الشعار'}).first().click();
    await page.getByText('تم حفظ الشعار').waitFor();
    assert.equal(await page.evaluate(()=>window.saved[0].revision),5);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    assert.equal(outbound,0);console.log('Passed company logo read, safe fallback and upload at 360px in '+browser.version());
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
