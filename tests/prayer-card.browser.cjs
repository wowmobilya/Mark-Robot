const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const fs=require('node:fs/promises');
const path=require('node:path');
const base=path.resolve(__dirname,'..');
(async()=>{
  const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||undefined});
  try{
    for(const [width,lang] of [[360,'ar'],[1024,'en']]){
      const context=await browser.newContext({viewport:{width,height:800},timezoneId:'America/New_York',
        permissions:['geolocation'],geolocation:{latitude:39.939382,longitude:32.819713}});
      const page=await context.newPage(),errors=[];
      page.on('pageerror',e=>errors.push(e.message));
      await page.route('**/*',route=>new URL(route.request().url()).origin==='https://prayer-fixture.invalid'
        ?route.fulfill({contentType:'text/html',body:'<meta name="viewport" content="width=device-width"><main id="mainContent"><section id="page-dashboard"><div class="wf-greeting-faces"></div></section></main>'})
        :route.abort());
      await page.route('**/assets/prayer/makkah-sai-excerpt.mp3',route=>route.fulfill({path:path.join(base,'assets/prayer/makkah-sai-excerpt.mp3'),contentType:'audio/mpeg'}));
      await page.goto('https://prayer-fixture.invalid');
      await page.evaluate(()=>{const AudioElement=window.Audio;window.Audio=class extends AudioElement{
        constructor(){super();window.fixtureAudio=this;this.muted=true;}
      };});
      await page.evaluate(lang=>{
        document.documentElement.lang=lang;document.documentElement.dir=lang==='ar'?'rtl':'ltr';
        window.testActor='fixture';window.WFAccountAccess={actor:()=>({id:window.testActor})};
      },lang);
      await page.clock.install({time:new Date('2019-01-01T09:56:40Z')});
      await page.addStyleTag({path:path.join(base,'prayer-card.css')});
      for(const file of ['vendor/tz-lookup/tz.js','vendor/adhan/adhan.umd.min.js','prayer-card.js'])await page.addScriptTag({content:await fs.readFile(path.join(base,file),'utf8')});
      await page.evaluate(()=>{const face=document.querySelector('#wfPrayer');face.inert=false;face.setAttribute('aria-hidden','false');});
      await page.locator('#wfPrayer button').click();
      const dialog=page.locator('dialog'),buttons=dialog.locator('button');
      await buttons.nth(1).click();
      await dialog.locator('.wf-prayer-times').waitFor();assert.equal(await dialog.locator('dd').count(),5);
      assert.equal(await dialog.locator('small').innerText(),'Europe/Istanbul');
      assert.ok(await dialog.evaluate(el=>el.scrollWidth<=el.clientWidth));
      await dialog.locator('select').last().selectOption('excerpt');
      await dialog.locator('button').nth(2).click();
      await page.waitForFunction(()=>window.fixtureAudio.duration>19&&window.fixtureAudio.duration<20&&!window.fixtureAudio.paused);
      await dialog.locator('button').nth(2).click();
      await dialog.locator('select').last().selectOption('notice');
      await dialog.locator('.btn-p').click();
      await dialog.waitFor({state:'detached'});
      assert.ok(await page.locator('.wf-prayer-remaining').innerText());
      assert.ok(await page.locator('.wf-prayer-progress').isVisible());
      await page.clock.fastForward(30000);await page.locator('.wf-prayer-notice:not([hidden])').waitFor();
      await page.evaluate(()=>{window.testActor='other';window.dispatchEvent(new Event('wf-account-access-change'));});
      assert.equal(await page.locator('.wf-prayer-notice').isHidden(),true);
      await page.locator('#wfPrayer button').click();assert.equal(await dialog.locator('input[type=text]').inputValue(),'');
      assert.equal(await dialog.locator('select').last().inputValue(),'off');assert.deepEqual(errors,[]);
      await context.close();
    }
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
