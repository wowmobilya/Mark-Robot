'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),http=require('node:http'),path=require('node:path');
const {chromium}=require('playwright');
const base=path.resolve(__dirname,'..');
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.webmanifest':'application/manifest+json','.png':'image/png'};
test('direct admin install is separate from WOW and offline launch keeps reconnect inside the admin app',async()=>{
  const server=http.createServer((req,res)=>{
    const url=new URL(req.url,'http://localhost');
    const pathname=decodeURIComponent(url.pathname.replace(/\/$/,'/index.html'));
    const file=path.resolve(base,'.'+pathname);
    if(!file.startsWith(base+path.sep)||!fs.statSync(file,{throwIfNoEntry:false})?.isFile())return res.writeHead(404).end();
    res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');fs.createReadStream(file).pipe(res);
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const context=await chromium.launchPersistentContext('',{executablePath:process.env.CHROMIUM_PATH||undefined,headless:true,viewport:{width:360,height:780},locale:'en'});
  try{
    const origin='http://127.0.0.1:'+server.address().port,admin=origin+'/platform/';

    const page=await context.newPage();await page.goto(admin);await page.evaluate(()=>navigator.serviceWorker.ready);
    await page.waitForFunction(()=>navigator.serviceWorker.controller?.scriptURL.endsWith('/platform/sw.js'));
    const cdp=await context.newCDPSession(page);
    const manifest=await cdp.send('Page.getAppManifest');assert.deepEqual(manifest.errors,[]);
    const config=JSON.parse(manifest.data);
    for(const key of ['id','start_url','scope'])assert.equal(new URL(config[key],manifest.url).href,admin);
    const check=await cdp.send('Page.getInstallabilityErrors');assert.deepEqual(check.installabilityErrors,[]);
    for(const icon of config.icons){const image=await page.request.get(new URL(icon.src,manifest.url).href);assert.equal(image.status(),200);assert.equal((await image.body()).readUInt32BE(16),Number(icon.sizes.split('x')[0]));}
    await page.selectOption('#lang','en');assert.equal(await page.locator('#backToWow').count(),0);
    await page.locator('#installPlatform').click();if(await page.locator('#installHint').isVisible())assert.match(await page.locator('#installHint').innerText(),/Home Screen/);
    const standalone=await chromium.launchPersistentContext('',{executablePath:process.env.CHROMIUM_PATH||undefined,headless:true,args:['--app='+admin]});
    try{
      const app=standalone.pages()[0];await app.waitForURL(admin);
      await app.waitForFunction(()=>matchMedia('(display-mode: standalone)').matches&&document.querySelector('#installPlatform')?.hidden);
      assert.equal(await app.locator('#installPlatform').isVisible(),false);
      assert.equal(await app.locator('input[type=password]').isVisible(),true);
      assert.equal(await app.locator('#backToWow').count(),0);
    }finally{await standalone.close();}
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    assert.deepEqual(await page.evaluate(()=>caches.keys()),[]);
    await context.setOffline(true);await page.reload();assert.match(await page.locator('main').innerText(),/internet/i);assert.equal(await page.locator('input').count(),0);
    assert.equal(await page.locator('a[href="../"]').count(),0);
    await assert.rejects(()=>page.goto(admin+'?setup=test',{timeout:5000}));

  }finally{await context.close();await new Promise(resolve=>server.close(resolve));}
});
