const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
test('recessed save dock keeps original action and localized text without claiming a save',()=>{
 const js=fs.readFileSync(path.join(__dirname,'../settings-navigation.js'),'utf8');
 assert(js.includes("page.querySelector('button[onclick=\"saveSettings()\"]')"));assert(js.includes('footer.append(save)'));assert(js.includes('save.prepend(symbol)'));
 assert(!js.includes('save.onclick='));assert(!js.includes('save.innerHTML='));assert(!js.includes('dbPut'));assert(js.includes("symbol.setAttribute('aria-hidden','true')"));
});
test('curved dock has a 48px action, safe-area clearance and keyboard/reduced-motion support',()=>{
 const css=fs.readFileSync(path.join(__dirname,'../settings-responsive.css'),'utf8').split('/* Sculpted save dock:')[1];
 for(const rule of ['radial-gradient(circle 31px at 50% 0','width:48px;height:48px','112px + env(safe-area-inset-bottom','scroll-margin-bottom:118px',':focus-visible','prefers-reduced-motion','@media print'])assert(css.includes(rule),rule);
});
