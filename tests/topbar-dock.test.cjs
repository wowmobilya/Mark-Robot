const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path');
const read=n=>fs.readFileSync(path.join(__dirname,'..',n),'utf8');
test('topbar identity is localized without replacing navigation handlers',()=>{
 const js=read('topbar-dock.js');assert(js.includes("nav.querySelector('.wf-topbar-title')"));for(const l of ['ar:','en:','tr:','fr:','ru:'])assert(js.includes(l));assert(!js.includes('onclick='));assert(!js.includes('replaceChildren'));
});
test('topbar has balanced touch targets and respects reduced motion',()=>{
 const css=read('topbar-dock.css');assert(css.includes('--nav-h:72px'));assert(css.includes('width:48px!important'));assert(css.includes('grid-template-columns:48px minmax(0,1fr) 48px'));assert(css.includes('prefers-reduced-motion:reduce'));assert(css.includes('border-radius:16px!important'));assert(css.includes('focus-visible'));assert(!css.includes('infinite'));
});
