const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path');
const read=n=>fs.readFileSync(path.join(__dirname,'..',n),'utf8');
test('topbar identity is localized without replacing navigation handlers',()=>{
 const js=read('topbar-dock.js');assert(js.includes("nav.querySelector('.wf-topbar-title')"));for(const l of ['ar:','en:','tr:','fr:','ru:'])assert(js.includes(l));assert(!js.includes('onclick='));assert(!js.includes('replaceChildren'));
});
test('topbar has balanced touch targets and respects reduced motion',()=>{
 const css=read('topbar-dock.css');assert(css.includes('max-width:calc(100% - 144px)'));assert(css.includes('width:44px!important'));assert(css.includes('prefers-reduced-motion:reduce'));assert(css.includes('focus-visible'));assert(!css.includes('infinite'));
});
