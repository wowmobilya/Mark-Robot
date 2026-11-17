const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const css=fs.readFileSync(path.join(__dirname,'../dashboard-visuals.css'),'utf8');
function lum(hex){const rgb=hex.match(/../g).map(c=>parseInt(c,16)/255).map(c=>c<=.04045?c/12.92:((c+.055)/1.055)**2.4);return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722;}
test('dashboard icon foreground/background pairs meet text contrast',()=>{
 for(const [,fg,bg] of css.matchAll(/--tile-ink:#([0-9a-f]{6});--tile-bg:#([0-9a-f]{6})/g)){
  const a=lum(fg),b=lum(bg);assert((Math.max(a,b)+.05)/(Math.min(a,b)+.05)>=4.5,fg+' '+bg);
 }
});
test('currency quotes use a compact market strip and icons inherit contrast',()=>{
 assert(css.includes('flex:1 0 168px'));assert(css.includes('overflow-x:auto!important'));assert(css.includes('scroll-snap-type:x proximity'));assert(css.includes('min-height:68px'));
 assert(css.includes('color:inherit!important'));assert(css.includes('repeat(2,minmax(0,1fr))'));
 assert(!css.includes('content:"'));assert(css.includes('@media screen'));
});
