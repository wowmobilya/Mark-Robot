const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');
test('straight header has no injected cutout surface',()=>{const js=fs.readFileSync('topbar-dock.js','utf8');assert.doesNotMatch(js,/maskImage|wf-header-surface/);});
test('straight header preserves rounded-square controls and hides translucent frames',()=>{const css=fs.readFileSync('topbar-dock.css','utf8');assert.match(css,/border-radius:16px/);assert.match(css,/border-radius:0!important/);assert.ok(css.includes('::after{display:none!important')); });
