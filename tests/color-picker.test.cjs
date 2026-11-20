const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const file=path.resolve(__dirname,'../color-picker.js');
const core=fs.existsSync(file)?require(file):{};

test('color values normalize safely without accepting CSS or unsupported alpha',()=>{
  assert.equal(typeof core.normalizeHex,'function','a reusable color parser is available');
  for(const [input,expected] of [['#3F7C94','#3f7c94'],['abc','#aabbcc'],[' #ABC ','#aabbcc'],['000000','#000000'],['ffffff','#ffffff']]) assert.equal(core.normalizeHex(input),expected);
  for(const input of ['',null,undefined,'#12','#12345','#12345678','transparent','red','url(https://example.test)','rgb(1,2,3)']) assert.equal(core.normalizeHex(input),null);
});

test('the hue and saturation plane preserve round-trip colors and clamp their boundaries',()=>{
  assert.equal(typeof core.hexToHsv,'function');assert.equal(typeof core.hsvToHex,'function');
  for(const color of ['#000000','#ffffff','#3f7c94','#a5cddd','#ff0000','#00ff00','#0000ff','#123456','#fefdfc']) assert.equal(core.hsvToHex(core.hexToHsv(color)),color);
  assert.equal(core.hsvToHex({h:360,s:100,v:100}),'#ff0000');
  assert.equal(core.hsvToHex({h:120,s:200,v:200}),'#00ff00');
  assert.equal(core.hsvToHex({h:20,s:-10,v:-10}),'#000000');
});
