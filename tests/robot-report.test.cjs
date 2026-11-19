const test=require('node:test');
const assert=require('node:assert/strict');
const {segmentsFor,segmentAt,sheetGeometry,reportLocale,reportVoiceState,reportControlAction,voiceSetupFor}=require('../robot-report.js');
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
test('voice setup uses download and cancellation actions instead of a dead replay control',()=>{
 for(const playback of ['ready','preparing','speaking','failed','finished']){
  assert.equal(reportControlAction('missing',playback),'install');
  assert.equal(reportControlAction('error',playback),'install');
  assert.equal(reportControlAction('downloading',playback),'cancel-download');
  assert.equal(reportControlAction('unsupported',playback),null);
 }
 assert.equal(reportControlAction('ready','speaking'),'stop');
 assert.equal(reportControlAction('ready','preparing'),'stop');
 assert.equal(reportControlAction('ready','finished'),'replay');
 assert.equal(reportControlAction(undefined,'ready'),'replay');
});
test('download progress accepts the manager ratio and preserves the known size on retry',()=>{
 const missing=reportVoiceState({state:'missing',total:42000000});
 const downloading=reportVoiceState({state:'downloading',progress:.25,loaded:10000000,total:40000000},missing);
 assert.deepEqual(downloading,{state:'downloading',progress:.25,loaded:10000000,total:40000000,reason:''});
 const retry=reportVoiceState({state:'error',reason:'network'},downloading);
 assert.equal(retry.total,40000000);
 assert.equal(voiceSetupFor(downloading,'en').progress,25);
 assert.match(voiceSetupFor(downloading,'en').hint,/10 of 40 MB/);
 assert.match(voiceSetupFor(missing,'en').hint,/About 42 MB/);
 assert.match(voiceSetupFor(retry,'en').hint,/internet connection/);
 assert.equal(reportVoiceState({state:'not-a-state'}),null);
 assert.equal(reportVoiceState({state:'downloading',progress:2,total:100,loaded:200}).progress,1);
 assert.equal(reportVoiceState({state:'downloading',progress:-1,total:100,loaded:-5}).loaded,0);
 assert.equal(reportVoiceState({state:'downloading',progress:NaN,total:100,loaded:50}).progress,.5);
});
test('ready voices hide setup and all five report languages expose the same lifecycle',()=>{
 assert.equal(voiceSetupFor(null,'ar').visible,false);
 const installLabels=new Set(),cancelLabels=new Set();
 for(const locale of ['ar','en','tr','fr','ru']){
  assert.equal(voiceSetupFor(reportVoiceState({state:'ready'}),locale).visible,false);
  for(const state of ['missing','downloading','error','unsupported']){
   const view=voiceSetupFor(reportVoiceState({state,progress:.6,total:42000000,loaded:25200000}),locale);
   assert.equal(view.visible,true);
   assert.equal(view.showProgress,state==='downloading');
   assert.equal(view.progress,60);
   assert(view.title&&view.hint&&view.actionLabel);
   assert(!/\{\w+\}/.test(view.hint));
   if(state==='missing')installLabels.add(view.actionLabel);
   if(state==='downloading')cancelLabels.add(view.actionLabel);
  }
 }
 assert.equal(installLabels.size,5);
 assert.equal(cancelLabels.size,5);
 assert.equal(reportLocale('ar-SA'),'ar');
 assert.equal(reportLocale('tr_TR'),'tr');
 assert.equal(reportLocale('xx','fr'),'fr');
});
test('download failures stay localized and never display raw runtime or server details',()=>{
 const voice=reason=>reportVoiceState({state:'error',reason,total:42000000});
 assert.match(voiceSetupFor(voice('quota-exceeded'),'en').hint,/enough space/);
 assert.match(voiceSetupFor(voice('storage-unavailable'),'en').hint,/site storage/);
 assert.match(voiceSetupFor(voice('offline'),'en').hint,/internet connection/);
 assert.match(voiceSetupFor(voice('integrity-failed'),'en').hint,/required version/);
 assert(!voiceSetupFor(voice('download-failed'),'en').hint.includes('internet connection'));
 const unknown=voiceSetupFor(voice('<server stack> private value'),'ar');
 assert(!unknown.hint.includes('private value'));
 assert.match(unknown.hint,/حاول مجددًا/);
 assert.match(voiceSetupFor(reportVoiceState({state:'unsupported'}),'ar').hint,/التقرير المكتوب/);
});
