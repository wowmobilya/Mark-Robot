'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),wid='22222222-2222-4222-8222-222222222222';
const listen=server=>new Promise(resolve=>server.listen(0,'127.0.0.1',()=>resolve('http://127.0.0.1:'+server.address().port)));
const stop=server=>new Promise(resolve=>{server.close(resolve);server.closeAllConnections();});

test('invitation installs the company app and preserves workspace after a clean launch',async t=>{
  const {companyManifest}=await import('../supabase/functions/wow-cloud/modules/company-manifest.mjs');
  let origin;
  const api=http.createServer(async(req,res)=>{
    const result=companyManifest(new Request('http://localhost'+req.url),[origin]);
    res.writeHead(result.status,Object.fromEntries(result.headers));res.end(await result.text());
  });
  const endpoint=await listen(api);t.after(()=>stop(api));
  const files=http.createServer((req,res)=>{
    const url=new URL(req.url,'http://localhost');
    if(url.pathname.endsWith('/wow-cloud-config.js')){
      res.writeHead(200,{'Content-Type':'text/javascript'});return res.end('window.WOW_CLOUD_CONFIG='+JSON.stringify({endpoint,enabled:true,publishableKey:'fixture'}));
    }
    const file=path.resolve(root,'.'+url.pathname.replace(/\/$/,'/index.html'));
    if(!file.startsWith(root+path.sep)||!fs.statSync(file,{throwIfNoEntry:false})?.isFile())return res.writeHead(404).end();
    const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.webmanifest':'application/manifest+json','.png':'image/png'};
    res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream'});fs.createReadStream(file).pipe(res);
  });
  origin=await listen(files);t.after(()=>stop(files));
  const options={executablePath:process.env.CHROMIUM_PATH||undefined,headless:true};
  const app=origin+'/?wf-cloud=employee&workspace='+wid,invite=origin+'/platform/?setup='+wid+'#invite='+'a'.repeat(64);
  const context=await chromium.launchPersistentContext('',{...options,viewport:{width:390,height:844},userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit Safari',hasTouch:true});t.after(()=>context.close());
  const page=await context.newPage();await page.goto(invite);
  assert.equal(await page.locator('link[rel="apple-touch-icon"]').getAttribute('href'),origin+'/apple-touch-icon.png');
  await page.selectOption('#lang','en',{force:true});assert.equal(await page.locator('#installPlatform').innerText(),'Install company app');
  assert.match(await page.locator('#installHint').innerText(),/Safari.*Add to Home Screen/);
  const cdp=await context.newCDPSession(page),initial=await cdp.send('Page.getAppManifest');
  assert.deepEqual(initial.errors,[]);const data=JSON.parse(initial.data);
  assert.equal(data.start_url,app);assert.equal(data.id,app);assert(!initial.data.includes('invite'));
  assert.deepEqual((await cdp.send('Page.getInstallabilityErrors')).installabilityErrors,[]);
  const clean=await chromium.launchPersistentContext('',options);t.after(()=>clean.close());const opened=await clean.newPage();
  await opened.goto(app,{waitUntil:'domcontentloaded'});await opened.waitForFunction(()=>Boolean(window.WFCompanyInstall));
  const installed=await (await clean.newCDPSession(opened)).send('Page.getAppManifest');
  assert.equal(JSON.parse(installed.data).id,data.id);
  const other=await fetch(endpoint+'/company.webmanifest?workspace='+wid+'&site=https://untrusted.example');assert.equal(other.status,400);
});
