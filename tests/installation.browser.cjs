const test=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const {chromium}=require('playwright');
test('the app and admin on the same origin reuse one installation across tabs and reload',async()=>{
  const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH});
  try{
    async function profile(){
      const context=await browser.newContext();
      await context.route('**/*',route=>new URL(route.request().url()).pathname==='/installation.js'
        ?route.fulfill({path:path.resolve(__dirname,'../modules/platform/cloud/installation.js'),contentType:'text/javascript'})
        :route.fulfill({contentType:'text/html',body:'<script src="/installation.js"></script>'}));
      return context;
    }
    const one=await profile(),two=await profile();
    const first=await one.newPage(),admin=await one.newPage(),other=await two.newPage();
    await Promise.all([first.goto('https://wow.test/'),admin.goto('https://wow.test/platform/'),other.goto('https://wow.test/')]);
    const proof=page=>page.evaluate(()=>WFInstallation.proof());
    const [a,b,c]=await Promise.all([proof(first),proof(admin),proof(other)]);
    assert(/^[0-9a-f]{64}$/.test(a));assert.equal(a,b);assert.notEqual(a,c);
    await first.reload();assert.equal(await proof(first),a);
    assert.equal(await first.evaluate(()=>localStorage.length+sessionStorage.length),0);
  }finally{await browser.close();}
});

