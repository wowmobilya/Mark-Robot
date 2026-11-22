'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const path=require('node:path');
const base=path.resolve(__dirname,'..');
test('admin preferences inherit WOW settings, persist languages and follow system theme only when selected',async()=>{
  const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH});
  try{
    const context=await browser.newContext({colorScheme:'light',viewport:{width:320,height:740}});
    const page=await context.newPage();page.setDefaultTimeout(4000);
    const errors=[];page.on('pageerror',err=>errors.push(err.message));
    await page.route('https://preferences.test/**',async route=>{
      const pathname=new URL(route.request().url()).pathname;
      if(pathname==='/'){
        await route.fulfill({contentType:'text/html',body:`<html dir="rtl"><head><meta charset="utf-8"><meta name="theme-color" content="#153847"><link rel="stylesheet" href="/ui-identity.css"><link rel="stylesheet" href="/platform/dashboard.css"></head><body><main><header><div class="platform-preferences"><select id="lang">${['ar','en','tr','fr','ru'].map(id=>'<option>'+id+'</option>').join('')}</select><select id="platformTheme"><option>system</option><option>light</option><option>dark</option></select></div></header><section id="settings"></section></main><script src="/platform/preferences.js"></script><script>WFPlatformPreferences.mount(document.querySelector('#settings'))</script></body></html>`});return;
      }
      if(['/ui-identity.css','/platform/dashboard.css','/platform/preferences.js'].includes(pathname)){
        await route.fulfill({path:path.join(base,pathname),contentType:pathname.endsWith('.js')?'application/javascript':'text/css'});return;
      }
      await route.abort();
    });
    await page.goto('https://preferences.test/');await page.evaluate(()=>{localStorage.setItem('wf_lang','tr');localStorage.setItem('wf_theme','dark');});await page.reload();
    const settings=page.locator('#settings'),locale=settings.locator('[data-admin-pref=language]'),theme=settings.locator('[data-admin-pref=theme]');
    assert.deepEqual(errors,[]);assert.equal(await locale.count(),1,await settings.innerHTML());await settings.getByLabel('Görünüm').waitFor();
    const reading=()=>page.evaluate(()=>[document.documentElement.lang,document.documentElement.dir,document.documentElement.dataset.theme]);
    assert.deepEqual(await reading(),['tr','ltr','dark']);assert.equal(await theme.inputValue(),'dark');
    // The native select remains the state bridge, while both visible entry points use one flag dialog.
    const languageButton=page.locator('#platformLanguageOpen');
    await languageButton.click();
    let dialog=page.getByRole('dialog',{name:'Dilini seç'});
    assert.equal(await dialog.locator('[data-lang-choice]').count(),5);
    assert.equal(await dialog.locator('[data-lang-choice=tr]').getAttribute('aria-pressed'),'true');
    assert.match(await dialog.locator('[data-lang-choice=ar]').innerText(),/العربية/);
    await dialog.locator('[data-lang-choice=ru]').click();
    assert.deepEqual(await reading(),['ru','ltr','dark']);
    assert.equal(await languageButton.locator('.platform-language-flag').innerText(),'🇷🇺');
    assert.equal(await languageButton.locator('.platform-language-code').innerText(),'RU');
    await settings.locator('[data-admin-language-trigger]').click();
    dialog=page.getByRole('dialog',{name:'Выберите язык'});
    await dialog.locator('[data-lang-choice=ar]').click();
    assert.deepEqual(await reading(),['ar','rtl','dark']);
    await languageButton.click();
    assert.equal(await page.getByRole('dialog').count(),1);
    await page.keyboard.press('Escape');
    assert.equal(await page.getByRole('dialog').count(),0);
    await locale.selectOption('tr');
    assert.deepEqual(await reading(),['tr','ltr','dark']);
    assert.deepEqual(errors,[]);

    await theme.selectOption('system');assert.deepEqual(await reading(),['tr','ltr','light']);
    await page.emulateMedia({colorScheme:'dark'});await page.waitForFunction(()=>document.documentElement.dataset.theme==='dark');
    await theme.selectOption('light');await page.emulateMedia({colorScheme:'light'});await page.emulateMedia({colorScheme:'dark'});
    assert.deepEqual(await reading(),['tr','ltr','light']);
    for(const [id,label] of [['ar','المظهر'],['en','Appearance'],['ru','Оформление'],['fr','Apparence']]){
      await locale.selectOption(id);assert.equal(await page.locator('#lang').inputValue(),id);
      await settings.getByLabel(label).waitFor();
      assert.deepEqual(await reading(),[id,id==='ar'?'rtl':'ltr','light']);
      assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    }
    await page.reload();assert.deepEqual(await reading(),['fr','ltr','light']);
    assert.equal(await page.locator('meta[name=theme-color]').getAttribute('content'),await page.evaluate(()=>getComputedStyle(document.documentElement).getPropertyValue('--bg').trim()));
    assert.equal(await page.evaluate(()=>localStorage.getItem('wf_theme')),'dark');
    assert.equal(await page.evaluate(()=>localStorage.getItem('wf_lang')),'fr');
    await page.addInitScript(()=>{Storage.prototype.getItem=()=>{throw Error()};Storage.prototype.setItem=()=>{throw Error()};});
    await page.reload();await locale.selectOption('ar');await theme.selectOption('dark');assert.deepEqual(await reading(),['ar','rtl','dark']);
  }finally{await browser.close();}
});
