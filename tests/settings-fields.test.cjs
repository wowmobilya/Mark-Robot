const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const names=['CompanyName','Address','Phone','Email','Website','Mersis','BankName','Beneficiary','IbanUSD','IbanTRY','IbanEUR','Swift','AccountNo','AuthPerson','DefaultNotes'];
test('existing company and banking fields round-trip through the real save and load handlers',async()=>{
 const elements=Object.fromEntries(names.map((name,i)=>['st'+name,{value:'test-'+i}]));
 for(const [id,value] of Object.entries({stPrefixExt:'a',stNextNoExt:'5000',stPrefixRet:'b',stNextNoRet:'3000',stPrefixWhl:'c',stNextNoWhl:'1000',stKdvRate:'20',stManualUsdTry:'40',stManualUsdEur:'0.9'}))elements[id]={value};
 let writes;
 const context={S:{settings:{keepUnrelated:'yes'}},wfPendingSettingsLogo:undefined,document:{getElementById:id=>elements[id]||null},wfWriteBatch:async batch=>{writes=batch},updateRateUI(){},updateKdvDisplay(){},goBack(){},showToast(){},t:key=>key};
 vm.createContext(context);
 const load=html.slice(html.indexOf('function loadSettingsToForm(){'),html.indexOf('function handleSettingsLogo('));
 vm.runInContext(load,context);await context.saveSettings();
 assert.equal(writes[0].store,'settings');assert.equal(writes[0].value.keepUnrelated,'yes');
 for(const name of names)elements['st'+name].value='';context.loadSettingsToForm();
 names.forEach((name,i)=>assert.equal(elements['st'+name].value,'test-'+i));
 assert.equal(context.S.settings.nextNoExt,5000);assert.equal(context.S.settings.manualUsdTry,40);
});
test('all seven original settings sections remain, with native mobile picker and reduced-motion support',()=>{
 for(const key of ['company','bank','invoice','currency','data','language','about'])assert(html.includes(`id="stab-${key}"`));
 const js=fs.readFileSync(path.join(__dirname,'../settings-navigation.js'),'utf8');new vm.Script(js);
 assert(js.includes("document.createElement('select')"));assert(js.includes('original.apply(this,arguments)'));
 assert(js.includes('prefers-reduced-motion'));assert(!js.includes('wfWriteBatch'));
});
