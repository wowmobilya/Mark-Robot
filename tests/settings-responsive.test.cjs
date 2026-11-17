const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const css=fs.readFileSync(path.join(__dirname,'../settings-responsive.css'),'utf8');
test('settings styles retain panels and use responsive grids and shared identity',()=>{
 assert(css.includes('@media screen'));assert(css.includes('var(--brand-primary)'));
 for(const width of [900,600,360])assert(css.includes(`@media(max-width:${width}px)`));
 assert(css.includes('grid-template-columns:minmax(0,1fr)!important'));
 assert(css.includes('font-size:16px!important'));
 assert(css.includes('.wf-settings-picker-ready .wf-settings-workspace>.tabs {display:none!important}'));assert(!css.includes('pointer-events:none'));
 let level=0;for(const c of css){if(c==='{')level++;if(c==='}')level--;assert(level>=0);}assert.equal(level,0);
});
