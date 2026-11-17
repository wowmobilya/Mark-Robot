const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
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
 for(const asset of ['ui-identity.css?v=30','ui-navigation.js?v=11']){assert(read('index.html').includes(asset));assert(read('sw.js').includes(asset));}
});
