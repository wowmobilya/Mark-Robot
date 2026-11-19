const test=require('node:test');
const assert=require('node:assert/strict');
const {segmentsFor,segmentAt,sheetGeometry}=require('../robot-report.js');
test('preserves exact Arabic speech offsets and decimal amounts',()=>{
 const narration='مبيعات اليوم: 12.50 دولار أمريكي. الديون: 9.25 دولار أمريكي.';
 const first='مبيعات اليوم: 12.50 دولار أمريكي.';
 const segments=[{text:first,start:0,end:first.length},{text:narration.slice(first.length+1),start:first.length+1,end:narration.length}];
 assert.deepEqual(segmentsFor({narration,narrationSegments:segments}),segments);
 assert.equal(segmentAt(segments,first.length+1),1);
 assert.equal(segmentAt(segments,10),0);
});
test('does not split decimal punctuation or invent timing when offsets are absent',()=>{
 const narration='Sales: 12.50. Balance: 9.25.';
 assert.deepEqual(segmentsFor({narration}),[{text:narration,start:0,end:narration.length}]);
 assert.equal(segmentAt([],2),-1);
 assert.equal(segmentAt([{start:0,end:10}],-1),-1);
});
test('rejects inconsistent segments and leaves unavailable reports empty',()=>{
 assert.deepEqual(segmentsFor({narration:''}),[]);
 assert.deepEqual(segmentsFor({narration:'Good',narrationSegments:[{text:'Wrong',start:0,end:5}]}),[{text:'Good',start:0,end:4}]);
});
test('overlapping, reversed, truncated and skipped narration segments cannot mislabel visible content',()=>{
 const narration='First. Second.';
 const first={text:'First.',start:0,end:6},second={text:'Second.',start:7,end:14};
 for(const narrationSegments of [[first,first],[second,first],[first],[second],[{text:'First.',start:0,end:99}]]){
  assert.deepEqual(segmentsFor({narration,narrationSegments}),[{text:narration,start:0,end:narration.length}]);
 }
 assert.deepEqual(segmentsFor({narration,narrationSegments:[first,second]}),[first,second]);
});
test('normal phone placement starts below the robot, without the old 42-percent overlap',()=>{
 const geometry=sheetGeometry({width:390,height:844,anchorBottom:400,mainLeft:0,mainRight:390});
 assert.equal(geometry.top,410);assert.equal(geometry.compact,false);
 assert.equal(geometry.top+geometry.height,836);
 assert(geometry.left>=8&&geometry.left+geometry.width<=382);
});
test('short landscape placement keeps a usable report and footer within the visible viewport',()=>{
 for(const [width,height] of [[844,390],[740,360],[360,250]]){
  const geometry=sheetGeometry({width,height,anchorBottom:330,mainLeft:0,mainRight:width});
  assert.equal(geometry.compact,true);
  assert(geometry.height>=Math.min(280,height-16));
  assert(geometry.top>=8);
  assert(geometry.top+geometry.height<=height-8);
  assert(geometry.left>=8&&geometry.left+geometry.width<=width-8);
 }
});
test('visual viewport offsets and wide desktop caps remain inside the visible area',()=>{
 const mobile=sheetGeometry({width:320,height:410,offsetLeft:30,offsetTop:70,anchorBottom:280,mainLeft:0,mainRight:390});
 assert(mobile.left>=38&&mobile.left+mobile.width<=342);
 assert(mobile.top>=78&&mobile.top+mobile.height<=472);
 const desktop=sheetGeometry({width:1920,height:1080,anchorBottom:350,mainLeft:280,mainRight:1880});
 assert.equal(desktop.top,360);assert.equal(desktop.width,1100);assert(desktop.left>292);
});
