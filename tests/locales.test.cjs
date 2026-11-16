const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const acorn=require('acorn');
const walk=require('acorn-walk');
const root=path.join(__dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const languages=['ar','tr','en','fr','ru'];
const scripts=[...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map(m=>m[1]);
const staticValue=n=>n?.type==='Literal'?n.value:n?.type==='ObjectExpression'?Object.fromEntries(n.properties.filter(p=>p.type==='Property').map(p=>[p.key.name||p.key.value,staticValue(p.value)])):undefined;
const context={window:{},document:{documentElement:{lang:'en'},querySelectorAll:()=>[]}};
vm.runInNewContext(fs.readFileSync(path.join(root,'ui-i18n.js'),'utf8'),context);
const copy=context.window.WOWUICopy;
test('all scripts parse, including bundled localization and account statements',()=>{
 for(const code of scripts)acorn.parse(code,{ecmaVersion:'latest'});
 for(const file of ['ui-i18n.js','ui-icons.js','account-statement.js','account-statement-core.js','sw.js'])new vm.Script(fs.readFileSync(path.join(root,file),'utf8'));
});
test('every interface language map has all five languages',()=>{
 const missing=[];let checked=0;
 for(const code of [...scripts,fs.readFileSync(path.join(root,'account-statement.js'),'utf8')])walk.ancestor(acorn.parse(code,{ecmaVersion:'latest'}),{ObjectExpression(n,anc){
  const names=n.properties.filter(p=>p.type==='Property').map(p=>p.key.name||p.key.value);
  if(!names.includes('ar')||!names.includes('en'))return;
  const vars=anc.filter(a=>a.type==='VariableDeclarator').map(a=>a.id.name);
  const functions=anc.filter(a=>a.type==='FunctionDeclaration').map(a=>a.id.name);
  // TR is built from WF_UI_COPY; its actual keys are checked in the browser.
  // The legacy number routine is never used for French/Russian, which have dedicated algorithms.
  if(vars.includes('TR')||functions.includes('_toWordsCore')||functions.includes('numberToWords'))return;
  checked++;
  for(const lang of languages)if(!names.includes(lang))missing.push({function:functions.at(-1),variable:vars.at(-1),lang});
 }});
 assert(checked>450);assert.deepEqual(missing,[]);
});
test('authored UI dictionary has complete, working translations',()=>{
 assert(Object.keys(copy).length>500);
 for(const[key,entry]of Object.entries(copy))for(const lang of languages){
  assert.equal(typeof entry[lang],'string',key+' / '+lang);
  assert.equal(context.window.wfUiText(key,lang),entry[lang]);
  assert(!entry[lang].includes('\ufffd'),key+' contains corrupt text');
 }
});
test('every static binding points to a complete dictionary entry',()=>{
 const decode=s=>s.replace(/&#x([0-9a-f]+);/gi,(_,n)=>String.fromCodePoint(parseInt(n,16))).replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(+n)).replace(/&quot;/g,'"').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>');
 let checked=0;for(const match of html.matchAll(/data-wf-ui(?:-(?:placeholder|title|aria-label|alt))?="([^"]*)"/g)){assert(copy[decode(match[1])],match[1]);checked++;}assert(checked>250);
});
test('account statement labels share the same keys in all five languages',()=>{
 const src=fs.readFileSync(path.join(root,'account-statement.js'),'utf8');
 let checked=0;walk.simple(acorn.parse(src,{ecmaVersion:'latest'}),{VariableDeclarator(n){if(!['TEXT','METHODS'].includes(n.id.name))return;const data=staticValue(n.init);for(const l of languages)assert.deepEqual(Object.keys(data[l]).sort(),Object.keys(data.en).sort());checked++;}});assert.equal(checked,2);
});
test('Russian quantity labels do not retain English plural suffixes',()=>{
 const count=context.window.wfItemCount;assert.equal(count(1,'ru'),'1 позиция');assert.equal(count(2,'ru'),'2 позиции');assert.equal(count(5,'ru'),'5 позиций');assert.equal(count(21,'ru'),'21 позиция');
});
