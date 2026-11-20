const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const acorn=require('acorn');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
test('primary theme has accessible foreground pairs',()=>{
 const lum=h=>{const s=h.match(/../g).map(v=>parseInt(v,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return s[0]*.2126+s[1]*.7152+s[2]*.0722};
 for(const [x,y] of [['ffffff','3f7c94'],['a5cddd','203d49'],['3f7c94','fafcfd']])assert((Math.max(lum(x),lum(y))+.05)/(Math.min(lum(x),lum(y))+.05)>=4.5);
 assert(read('ui-identity.css').includes('--brand-primary:#3f7c94'));
});
test('drawer retains scrolling and usable compact controls',()=>{
 const css=read('ui-identity.css').split('/* Fit the drawer')[1];
 assert(css.includes('overflow-y:auto!important'));assert(css.includes('scrollbar-width:none'));assert(css.includes('min-height:clamp(44px,6.5dvh,50px)'));assert(css.includes('scroll-margin-block:12px'));
});
test('HTML and offline shell reference the same current assets',()=>{
 const htmlAssets=[...read('index.html').matchAll(/<(?:link|script)\b[^>]*\b(?:href|src)=["']([^"']+)["']/g)].map(match=>match[1].replace(/^\.\//,''));
 const cacheDeclaration=acorn.parse(read('sw.js'),{ecmaVersion:'latest'}).body
  .filter(node=>node.type==='VariableDeclaration').flatMap(node=>node.declarations).find(node=>node.id.name==='urlsToCache');
 assert.equal(cacheDeclaration?.init?.type,'ArrayExpression','the offline shell must expose its precached asset list');
 const cachedAssets=cacheDeclaration.init.elements.map(node=>{
  assert.equal(node.type,'Literal');assert.equal(typeof node.value,'string');return node.value.replace(/^\.\//,'');
 });
 for(const file of ['ui-identity.css','ui-navigation.js']){
  const html=htmlAssets.filter(asset=>asset.split('?')[0]===file),cached=cachedAssets.filter(asset=>asset.split('?')[0]===file);
  assert.equal(html.length,1,file+' must load exactly once in HTML');
  assert.match(html[0],/\?v=\d+$/,'the current asset must have an explicit cache version');
  assert.deepEqual(cached,html,file+' must have exactly the same current version in HTML and the offline cache');
 }
});
test('dashboard scroll progress uses the primary color and reduced motion',()=>{
 const css=read('ui-identity.css');
 assert.match(css,/width:var\(--wf-scroll-progress,0%\);background:#3f7c94/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\).*navbar::after\{transition:none!important/);
});
