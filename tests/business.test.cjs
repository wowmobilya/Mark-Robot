const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
const css=fs.readFileSync(path.join(__dirname,'../business-ui.css'),'utf8');
test('business presentation is screen-only and uses shared brand tokens',()=>{
 assert(css.indexOf('@media screen')<css.indexOf(':root'));
 assert(css.includes('var(--brand-primary)'));assert(css.includes('[data-theme="dark"]'));
 let level=0;for(const c of css){if(c==='{')level++;if(c==='}')level--;assert(level>=0);}assert.equal(level,0);
 assert(!css.includes('display:none'));assert(!css.includes('pointer-events:none'));
});
test('business grids and filter rows have small-screen wrapping',()=>{
 assert(css.includes('minmax(min(100%,300px),1fr)'));
 assert(css.includes('@media(max-width:700px)'));
 assert(css.includes('flex-wrap:wrap!important'));
 assert(css.includes('object-fit:contain'));
});
