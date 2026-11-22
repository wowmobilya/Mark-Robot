// Optional real-browser boundary checks: node --test tests/touch-keyboard.browser.cjs
const {test,after}=require('node:test');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..');let browser;
after(async()=>{await browser?.close();});

async function fixture(t,{touch=true,lang='en',html='',localAccounts=false}={}){
  browser ||= await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
  const context=await browser.newContext({hasTouch:touch,viewport:{width:1280,height:900}});
  const page=await context.newPage();t.after(()=>context.close());
  if(localAccounts){
    // A local, secure origin gives the real identity provider IndexedDB and Web Crypto.
    await page.route('https://keyboard.test/',route=>route.fulfill({contentType:'text/html',body:'<!doctype html>'}));
    await page.goto('https://keyboard.test/');
    await page.setViewportSize({width:390,height:844});
  }
  await page.setContent('<!doctype html><html lang="'+lang+'"><head><style>body{font:16px sans-serif}input,textarea,button{min-height:32px}label{display:block;margin:8px}section{padding:10px}</style></head><body><section id="workspace"><label>Name <input id="name" value="draft"></label><label>Other <input id="other" value="untouched"></label>'+html+'</section></body></html>');
  for(const file of ['touch-keyboard.css','touch-keyboard.js'])if(fs.existsSync(path.join(root,file))){if(file.endsWith('.css'))await page.addStyleTag({path:path.join(root,file)});else await page.addScriptTag({path:path.join(root,file)});}
  await page.evaluate(()=>{window.seen=[];for(const event of ['input','change','blur'])document.addEventListener(event,e=>{if(e.target.closest?.('#workspace'))seen.push([e.target.id||e.target.name,event,e.target.value]);},true);});
  return page;
}
const action=(page,key)=>page.locator('#wfTouchKeyboard [data-action="'+key+'"]').click();
const key=(page,value)=>page.locator('#wfTouchKeyboard [data-key]').evaluateAll((buttons,text)=>{const button=buttons.find(b=>b.dataset.key===text);if(!button)throw new Error('No key '+text);button.click();},value);
const select=async(page,start,end=start)=>page.locator('#wfTouchKeyboardEditor:not([hidden])').evaluate((el,range)=>{el.setSelectionRange(...range);},[start,end]);
const paste=async(page,text)=>page.locator('#wfTouchKeyboardEditor:not([hidden])').evaluate((el,text)=>{const data=new DataTransfer();data.setData('text/plain',text);el.dispatchEvent(new ClipboardEvent('paste',{bubbles:true,cancelable:true,clipboardData:data}));},text);

test('a wide touch PC gets the app keyboard while an ordinary desktop keeps direct typing',async t=>{
  const desktop=await fixture(t,{touch:false});await desktop.locator('#name').fill('Hardware');
  assert.equal(await desktop.locator('#name').inputValue(),'Hardware');assert.equal(await desktop.locator('#wfTouchKeyboard[open]').count(),0);
  const touch=await fixture(t);await touch.locator('#name').click();
  assert.equal(await touch.locator('#wfTouchKeyboard[open]').count(),1,'touch capability, not narrow viewport, selects the keyboard');
  assert.equal(await touch.locator('#wfTouchKeyboardEditor').getAttribute('inputmode'),'none');
  assert.equal(await touch.locator('#wfTouchKeyboardEditor').evaluate(el=>el.readOnly),true);
  assert.equal(await touch.locator('#name').evaluate(el=>el.readOnly),false,'source fields retain their original editability');
});

test('selection replacement and grapheme backspace update the live draft and commit once',async t=>{
  const page=await fixture(t);await page.locator('#name').evaluate(el=>el.value='ab👨‍👩‍👧‍👦cd');await page.locator('#name').click();
  await select(page,2,13);await key(page,'x');assert.equal(await page.locator('#name').inputValue(),'abxcd');
  await paste(page,'é');assert.equal(await page.locator('#name').inputValue(),'abxécd');
  await action(page,'backspace');assert.equal(await page.locator('#name').inputValue(),'abxcd');
  await paste(page,'e\u0301');await action(page,'backspace');assert.equal(await page.locator('#name').inputValue(),'abxcd','a combining accent is deleted with its letter');
  assert.equal(await page.evaluate(()=>seen.filter(e=>e[1]==='change').length),0);
  await action(page,'done');assert.equal(await page.locator('#other').inputValue(),'untouched');
  assert.equal(await page.evaluate(()=>seen.filter(e=>e[1]==='change').length),1);assert.equal(await page.locator('#wfTouchKeyboard[open]').count(),0);
  await page.waitForTimeout(30);assert.equal(await page.locator('#wfTouchKeyboard[open]').count(),0,'closing does not reopen through focus restoration');
});

test('numeric drafts retain a trailing decimal and normalize Arabic digits without losing a pending sign',async t=>{
  const page=await fixture(t,{html:'<label>Amount <input id="amount" type="number" step="any" value="12.5"></label>'});await page.locator('#amount').click();
  await action(page,'select');await key(page,'-');assert.equal(await page.locator('#amount').inputValue(),'12.5','an incomplete sign is held in the editor');
  await key(page,'2');await key(page,'.');assert.equal(await page.locator('#wfTouchKeyboardEditor').inputValue(),'-2.');
  assert.equal(await page.locator('#amount').inputValue(),'-2');await key(page,'5');assert.equal(await page.locator('#amount').inputValue(),'-2.5');
  await action(page,'select');await paste(page,'١٢٫٧٥');assert.equal(await page.locator('#amount').inputValue(),'12.75');
  await key(page,'.');assert.equal(await page.locator('#amount').inputValue(),'12.75','a second decimal is rejected');
  await action(page,'done');assert.deepEqual(await page.evaluate(()=>seen.filter(e=>e[0]==='amount'&&e[1]==='change')),[['amount','change','12.75']]);
});

test('file, date, select, readonly and disabled controls keep their existing behavior',async t=>{
  const page=await fixture(t,{html:'<input id="file" type="file"><input id="date" type="date"><select id="choice"><option>A</option><option>B</option></select><input id="readonly" readonly value="calculated"><fieldset disabled><input id="disabled" value="locked"></fieldset>'});
  const result=await page.evaluate(()=>['file','date','choice','readonly','disabled'].map(id=>{const el=document.getElementById(id);const event=new PointerEvent('pointerdown',{bubbles:true,cancelable:true,pointerType:'touch'});el.dispatchEvent(event);return [id,event.defaultPrevented];}));
  assert.deepEqual(result,[['file',false],['date',false],['choice',false],['readonly',false],['disabled',false]]);assert.equal(await page.locator('#wfTouchKeyboard[open]').count(),0);
});

test('all five layouts enter their own characters and Turkish shift preserves dotted I',async t=>{
  const page=await fixture(t);await page.locator('#name').click();await action(page,'clear');
  for(const [lang,char]of [['ar','ض'],['tr','ğ'],['en','q'],['fr','é'],['ru','й']]){await page.locator('#wfTouchKeyboard [data-language="'+lang+'"]').click();await key(page,char);}
  assert.equal(await page.locator('#name').inputValue(),'ضğqéй');await page.locator('[data-language="tr"]').click();await action(page,'shift');await key(page,'İ');
  assert.equal(await page.locator('#name').inputValue(),'ضğqéйİ');
  await page.evaluate(()=>document.documentElement.lang='fr');await page.waitForTimeout(20);assert.equal(await page.locator('#name').inputValue(),'ضğqéйİ','interface translation preserves the draft');
});

test('late-added fields and fields replaced by their input handler remain editable',async t=>{
  const page=await fixture(t);await page.evaluate(()=>{const field=document.createElement('input');field.id='dynamic';field.value='';document.getElementById('workspace').append(field);const listen=el=>el.addEventListener('input',()=>{const replacement=el.cloneNode();replacement.value=el.value;listen(replacement);el.replaceWith(replacement);});listen(field);});
  await page.locator('#dynamic').click();await key(page,'a');await key(page,'b');await key(page,'c');assert.equal(await page.locator('#dynamic').inputValue(),'abc');
  await action(page,'done');assert.equal(await page.evaluate(()=>seen.filter(e=>e[0]==='dynamic'&&e[1]==='change').length),1);
});

test('Next commits before moving to the next field even when change rebuilds the row',async t=>{
  const page=await fixture(t);await page.evaluate(()=>name=document.getElementById('name'));
  await page.locator('#name').evaluate(el=>el.addEventListener('change',()=>{const other=document.getElementById('other');other.replaceWith(other.cloneNode());}));
  await page.locator('#name').click();await key(page,'x');await action(page,'next');
  assert.equal(await page.evaluate(()=>WFTouchKeyboard.activeField.id),'other');await action(page,'select');await key(page,'z');await action(page,'done');
  assert.equal(await page.locator('#name').inputValue(),'draftx');assert.equal(await page.locator('#other').inputValue(),'z');
});

test('multiline return, hardware editing on touch, password masking and maxlength use the same editor',async t=>{
  const page=await fixture(t,{html:'<textarea id="notes">first</textarea><input id="password" type="password" maxlength="4" value="">'});await page.locator('#notes').click();await action(page,'enter');await page.locator('#wfTouchKeyboardEditor').press('a');
  assert.equal(await page.locator('#notes').inputValue(),'first\na');await action(page,'done');await page.locator('#password').click();
  assert.equal(await page.locator('#wfTouchKeyboardEditor').getAttribute('type'),'password');await paste(page,'abc😀');assert.equal(await page.locator('#password').inputValue(),'abc','maxlength never leaves half a surrogate');
  await key(page,'x');assert.equal(await page.locator('#password').inputValue(),'abcx');await key(page,'y');assert.equal(await page.locator('#password').inputValue(),'abcx');
  await action(page,'done');assert.equal(await page.locator('#wfTouchKeyboardEditor').inputValue(),'');assert.equal(await page.locator('#password').inputValue(),'abcx');
});

test('search registration runs the original action after commit and parent navigation dismisses safely',async t=>{
  const page=await fixture(t,{html:'<input id="lookup" type="search"><button id="noop" type="button">Outside</button>'});
  await page.evaluate(()=>{window.calls=[];WFTouchKeyboard.register('lookup',{action:'search',onOpen(){calls.push('open');},onSubmit(field){calls.push('search:'+field.value);},onClose(detail){calls.push('close:'+detail.reason);}});});
  await page.locator('#lookup').click();await key(page,'q');await action(page,'done');assert.deepEqual(await page.evaluate(()=>calls),['open','close:submit','search:q']);
  await page.locator('#name').click();await key(page,'x');await page.evaluate(()=>document.getElementById('workspace').hidden=true);await page.waitForTimeout(30);
  assert.equal(await page.locator('#wfTouchKeyboard[open]').count(),0);assert.equal(await page.locator('#name').inputValue(),'draftx');assert.equal(await page.evaluate(()=>seen.filter(e=>e[0]==='name'&&e[1]==='change').length),1);
});

test('cancelled beforeinput and existing input normalizers are respected',async t=>{
  const page=await fixture(t);await page.locator('#name').evaluate(el=>{el.value='';el.addEventListener('beforeinput',event=>{if(event.data==='x')event.preventDefault();});el.addEventListener('input',()=>{el.value=el.value.toUpperCase();});});
  await page.locator('#name').click();await key(page,'x');assert.equal(await page.locator('#name').inputValue(),'');await key(page,'a');assert.equal(await page.locator('#name').inputValue(),'A');assert.equal(await page.locator('#wfTouchKeyboardEditor').inputValue(),'A');
  await page.locator('#wfTouchKeyboardEditor').press('Escape');assert.equal(await page.locator('#wfTouchKeyboard[open]').count(),0);
});

test('account login accepts touch typing while the rest of the app stays locked',async t=>{
  for(const reuse of [false,true])await t.test(reuse?'keyboard used before locking':'first keyboard opened at login',async t=>{
    const page=await fixture(t,{localAccounts:true,lang:reuse?'ar':'en'});
    if(reuse)await page.setViewportSize({width:667,height:320});
    await page.addStyleTag({path:path.join(root,'accounts-access.css')});
    for(const file of ['accounts-policy.js','accounts-data-policy.js','accounts-core.js','accounts-local-provider.js','accounts-access.js']){
      await page.addScriptTag({path:path.join(root,file)});
    }
    const username='ضğqéй',password='keyboardtest';
    await page.evaluate(async({username,password})=>{
      await WFAccountAccess.ready;
      await WFAccountAccess.service.bootstrapOwner({name:'Keyboard Test',username,password});
      await WFAccountAccess.service.signOut();
    },{username,password});
    const pad=page.locator('#wfTouchKeyboard'),editor=page.locator('#wfTouchKeyboardEditor');
    const tapKey=character=>pad.locator('[data-key="'+character+'"]').tap();
    if(reuse){
      await page.locator('#name').tap();
      await pad.locator('[data-action="done"]').tap();
    }
    await page.evaluate(()=>{window.loginReady=WFAccountAccess.beforeInit();});
    await page.waitForSelector('#wfTouchKeyboard[open]',{state:'attached'});
    assert.equal(await pad.isVisible(),true,'login autofocus must show the app keyboard');
    const geometry=await pad.evaluate(node=>{
      const box=node.getBoundingClientRect(),done=node.querySelector('[data-action="done"]').getBoundingClientRect();
      const form=document.querySelector('.wf-account-login').getBoundingClientRect();
      return {box:box.toJSON(),done:done.toJSON(),form:form.toJSON(),width:innerWidth,height:innerHeight};
    });
    assert(geometry.box.x>=0&&geometry.box.right<=geometry.width+1);
    assert(geometry.form.x>=0&&geometry.form.right<=geometry.width+1);
    assert(geometry.done.top>=0&&geometry.done.bottom<=geometry.height+1&&geometry.done.height>=44);
    const background=page.locator('#workspace');
    assert.equal(await background.evaluate(el=>el.inert),true);
    assert.equal(await background.isVisible(),false);
    for(const [language,character]of [['ar','ض'],['tr','ğ'],['en','q'],['fr','é'],['ru','й']]){
      await pad.locator('[data-language="'+language+'"]').tap();
      await tapKey(character);
    }
    assert.equal(await page.locator('#wfAccountLoginUsername').inputValue(),username);
    await pad.locator('[data-action="next"]').tap();
    assert.equal(await editor.getAttribute('type'),'password');
    assert.equal(await editor.getAttribute('inputmode'),'none');
    assert.equal(await editor.evaluate(el=>el.readOnly),true);
    await pad.locator('[data-language="en"]').tap();
    for(const character of password)await tapKey(character);
    await pad.locator('[data-action="done"]').tap();
    assert.equal(await page.locator('#wfAccountLoginPassword').inputValue(),password);
    assert.equal(await background.evaluate(el=>el.inert),true);
    await page.locator('#wfAccountLoginForm [type="submit"]').tap();
    await page.evaluate(()=>window.loginReady);
    assert.equal(await page.evaluate(()=>WFAccountAccess.actor().username),username);
    await page.locator('#name').tap();
    await tapKey('x');
    await pad.locator('[data-action="done"]').tap();
    assert.equal(await page.locator('#name').inputValue(),'draftx');
  });
});
