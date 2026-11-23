const test=require('node:test'),assert=require('node:assert/strict'),path=require('node:path');
const {chromium}=require('playwright'),{randomUUID}=require('node:crypto');
const {link,readLink}=require('../company-join');
test('applicant and reviewer QR links reject external, confused tenant and credential-bearing URLs',()=>{
 const base='https://company.test/app/',w=randomUUID(),r=randomUUID(),review=link(base,w,r),company=link(base,w);
 assert.equal(readLink(review,base,'review',w),review);assert.equal(readLink(company,base,'company'),company);
 for(const bad of [review.replace(w,randomUUID()),company,review.replace('company.test','outside.test'),review+'&password=x',review.replace('https://','https://user@')])
   assert.equal(readLink(bad,base,'review',w),null);
});
test('applicant gets a non-authorizing request QR and owner explicitly reviews and decides',async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,headless:true});
 const workspace=randomUUID(),base='https://company.test/app/',pw=randomUUID();
 try{
  const page=await browser.newPage({viewport:{width:390,height:844},hasTouch:true}),leaks=[];
  page.on('request',req=>{if(req.url().includes(pw))leaks.push(req.url());});
  await page.route('**/*',route=>route.fulfill({contentType:'text/html',body:'<meta name=viewport content="width=device-width"><main></main>'}));
  await page.goto(link(base,workspace));
  await page.addStyleTag({path:path.resolve(__dirname,'../ui-identity.css')});
  for(const filename of ['vendor/zxing-browser.min.js','owner-invite.js','company-join.js'])await page.addScriptTag({path:path.resolve(__dirname,'..',filename)});
  await page.evaluate(({workspace,base})=>{
   window.receipts=[];window.actions=[];
   window.client={getSnapshot:()=>({authenticated:true,mode:'remote',workspaceId:workspace,currentAccount:{id:'owner',role:'owner'}}),
    async request(action,body,options){actions.push(action);
     if(action==='auth.companyJoin'){
      if(options.authenticated!==false||!body.claimToken.match(/^[a-f0-9]{64}$/)||body.workspaceId!==workspace)throw Error();
      receipts.push({id:body.requestId,name:body.name,username:body.username,state:'pending',createdAt:new Date().toISOString()});
      return {id:body.requestId,state:'pending'};
     }
     if(action==='companyJoin.list')return {requests:receipts.filter(r=>!body.id||r.id===body.id),total:receipts.length};
     if(action==='companyJoin.decide'){receipts.find(r=>r.id===body.id).state=body.decision;return {id:body.id,state:body.decision};}
     throw Error();
    }};
   window.visitor=WFCompanyJoin.mountApplicant({container:document.querySelector('main'),client,base,workspace,lang:'en'});
  },{workspace,base});
  // Realistic iPhone SE, Android phone, tablet and desktop widths must not scroll horizontally.
  for(const viewport of [{width:320,height:568},{width:390,height:844},{width:768,height:1024},{width:1280,height:800}]){
    await page.setViewportSize(viewport);
    const width=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,viewport:innerWidth}));
    assert(width.scroll<=width.viewport,JSON.stringify({viewport,width}));
  }
  await page.setViewportSize({width:390,height:844});
  await page.getByLabel('Name',{exact:true}).fill('Fixture');await page.getByLabel('Username',{exact:true}).fill('fixture');
  await page.getByLabel('Password',{exact:true}).fill(pw);await page.getByRole('button',{name:'Send join request'}).click();
  await page.getByText('Waiting for approval').waitFor();
  async function decode(caption){
   return page.getByRole('img',{name:caption,exact:true}).evaluate(async svg=>{
    const image=new Image();image.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(new XMLSerializer().serializeToString(svg));
    await image.decode();const canvas=document.createElement('canvas');canvas.width=image.naturalWidth;canvas.height=image.naturalHeight;
    const context=canvas.getContext('2d');context.fillStyle='white';context.fillRect(0,0,canvas.width,canvas.height);context.drawImage(image,0,0);
    return new ZXingBrowser.BrowserQRCodeReader(new Map([[1,true]])).decodeFromCanvas(canvas).getText();
   });
  }
  const requestLink=await page.getByRole('textbox',{name:'Review request',exact:true}).inputValue();
  const rid=new URL(requestLink).searchParams.get('reviewJoin');assert.equal(requestLink,link(base,workspace,rid));
  assert.equal((await page.locator('svg').count()),1);assert(!requestLink.includes(pw));assert.equal(await decode('Review request'),requestLink);
  assert.deepEqual(await page.evaluate(()=>actions),['auth.companyJoin']);
  await page.evaluate(({base})=>{visitor.dispose();window.admin=WFCompanyJoin.mountOwner({container:document.querySelector('main'),client,base,lang:'en'});},{base});
  await page.getByText('Join requests',{exact:true}).click();const companyLink=await page.getByRole('textbox',{name:'Company invitation',exact:true}).inputValue();
  assert.equal(companyLink,link(base,workspace));assert.equal(await decode('Company invitation'),companyLink);await page.getByText('Scan a request QR').click();
  await page.getByLabel('Request link',{exact:true}).fill(requestLink.replace(workspace,randomUUID()));
  await page.getByRole('button',{name:'Review request'}).click();await page.getByText('Check the company link or QR.').waitFor();
  await page.getByLabel('Request link',{exact:true}).fill(requestLink);await page.getByRole('button',{name:'Review request'}).click();
  await page.getByRole('button',{name:'Approve',exact:true}).click();
  assert.equal(await page.evaluate(()=>actions.includes('companyJoin.decide')),false);
  await page.getByRole('button',{name:'Confirm',exact:true}).click();await page.getByText('Approved',{exact:true}).waitFor();
  assert.equal(await page.evaluate(()=>actions.filter(s=>s==='companyJoin.decide').length),1);
  assert.deepEqual(leaks,[]);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 }finally{await browser.close();}
});
