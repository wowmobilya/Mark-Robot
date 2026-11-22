'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),path=require('node:path');
const {chromium}=require('playwright');
const base=path.resolve(__dirname,'..'),entry='https://lazy.test/modules/finance/entry.js?v=1';
test('finance routes defer their code, retry failed downloads, and abandon removed views',async()=>{
  const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,headless:true});
  try{
    const page=await browser.newPage();const requests=[];
    let rejectWorkspace=true,delay,release;
    await page.route('https://lazy.test/**',async route=>{
      const u=new URL(route.request().url());
      if(u.pathname==='/'){
        return route.fulfill({contentType:'text/html; charset=utf-8',body:`<main id="target"></main><script>window.routes=new Map();window.WFModules={register:d=>routes.set(d.id,d)}</script><script src="${entry}"></script>`});
      }
      const file=u.pathname.slice(1);
      if(!['modules/finance/core.js','modules/finance/workspace.js','modules/finance/entry.js'].includes(file))return route.abort();
      requests.push(path.basename(file));
      if(file.endsWith('workspace.js')){
        if(rejectWorkspace){rejectWorkspace=false;return route.abort();}
        if(delay)await delay;
      }
      return route.fulfill({path:path.join(base,file),contentType:'application/javascript; charset=utf-8'});
    });
    await page.goto('https://lazy.test/');assert.deepEqual(requests,['entry.js']);
    await page.evaluate(()=>{
      window.allowed=false;window.actions=[];
      window.openRoute=(route='finance',container=target)=>routes.get(route).mount({route,container,lang:'en',params:{},api:{
        can:()=>allowed,getSession:()=>({workspaceId:'fixture'}),listOutbox:async()=>[],request:async(action)=>{actions.push(action);return {items:[],rows:[],hasMore:false};}
      }});
    });
    assert.deepEqual(await page.evaluate(()=>[...routes.keys()]),['finance','payroll','metals']);
    await page.evaluate(()=>openRoute());assert.deepEqual(requests,['entry.js']);
    await page.evaluate(()=>{allowed=true;});await assert.rejects(()=>page.evaluate(()=>openRoute()),/FINANCE_ASSET_UNAVAILABLE/);
    assert.deepEqual(requests.slice(1).sort(),['core.js','workspace.js']);assert.deepEqual(await page.evaluate(()=>actions),[]);
    delay=new Promise(resolve=>{release=resolve;});
    await page.evaluate(()=>{window.oldMount=openRoute();target.replaceChildren();window.newMount=openRoute('payroll');});
    await page.waitForFunction(()=>document.querySelector('script[src*="workspace.js"]'));release();
    await page.evaluate(()=>Promise.all([oldMount,newMount]));
    assert.equal(await page.locator('.wf-fin').count(),1);
    assert(await page.evaluate(()=>actions.length>0&&actions.every(a=>!a.startsWith('finance.'))));
    assert.deepEqual(requests.sort(),['core.js','entry.js','workspace.js','workspace.js']);
    for(const id of ['finance','payroll','metals']){
      assert(await page.evaluate(id=>Object.entries(routes.get(id).title).every(([locale,label])=>WFFinanceCore.t(locale,id)===label),id));
    }
  }finally{await browser.close();}
});
