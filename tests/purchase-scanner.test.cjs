'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const source=html.slice(html.indexOf('function openBarcodeScanner(mode)'),html.indexOf('function getTierPrice('));
function setup(extra={}) {
  const nodes=new Map(['manualBarcodeInput','scannerStatus','scannerVideo','scannerModal','prName'].map(id=>[id,{value:'',textContent:'',srcObject:null,play:async()=>{},classList:{contains:()=>true}}]));
  let sales=0,closed=0,seen=[],intervals=[];
  const S={scannerMode:'purchase',scannerStream:null,scannerInterval:null,products:[{id:'p1',name:'W400',barcode:'400'}],invItems:[]};
  const context={S,window:{},document:{getElementById:id=>nodes.get(id)},t:key=>key,wfUiText:x=>x,
    showToast:()=>{},openModal:()=>{},closeModal:()=>closed++,addItemToInv:()=>sales++,
    navigator:{mediaDevices:{getUserMedia:async()=>({getTracks:()=>[]})}},
    setInterval:fn=>{intervals.push(fn);return intervals.length;},clearInterval:()=>{},
    ...extra};
  context.window.WFPurchasePlanner={acceptBarcode:raw=>{seen.push(raw);return true;}};
  vm.runInNewContext(source,context);
  return {context,nodes,S,get sales(){return sales;},get closed(){return closed;},seen,intervals};
}
test('purchase scans dispatch only to the planner, preserving invoice and product editors',()=>{
  const run=setup();run.nodes.get('prName').value='Original editor';
  const before=structuredClone(run.S.invItems);
  assert.equal(run.context.processBarcodeResult('  W400  '),true);
  assert.deepEqual(run.seen,['W400']);assert.equal(run.sales,0);
  assert.equal(run.nodes.get('prName').value,'Original editor');assert.deepEqual(run.S.invItems,before);
  assert.equal(run.closed,1);
});
test('unmatched or unavailable purchase scanner never falls through to sales',()=>{
  const run=setup();run.context.window.WFPurchasePlanner.acceptBarcode=()=>false;
  assert.equal(run.context.processBarcodeResult('400'),false);assert.equal(run.closed,0);assert.equal(run.sales,0);
  delete run.context.window.WFPurchasePlanner;
  assert.equal(run.context.processBarcodeResult('W400'),false);assert.equal(run.nodes.get('prName').value,'');
});
test('existing invoice scanner retains its action and missing product names do not crash',()=>{
  const run=setup();run.S.scannerMode='invoice';run.S.products.unshift({id:'no-name'});
  assert.equal(run.context.processBarcodeResult('400'),true);assert.equal(run.sales,1);assert.deepEqual(run.seen,[]);
});
test('a camera permission result arriving after close stops its tracks and does not restart detection',async()=>{
  let resolveCamera,stopped=0;
  const run=setup({navigator:{mediaDevices:{getUserMedia:()=>new Promise(resolve=>{resolveCamera=resolve;})}}});
  const opening=run.context.startCamera();run.context.closeScanner();
  resolveCamera({getTracks:()=>[{stop(){stopped++;}}]});await opening;
  assert.equal(stopped,1);assert.equal(run.S.scannerStream,null);assert.equal(run.nodes.get('scannerVideo').srcObject,null);
});

test('camera detection never overlaps work and discards a late result after closing',async()=>{
  let resolveDetection,calls=0;
  class Detector {detect(){calls++;return new Promise(resolve=>{resolveDetection=resolve;});}}
  const run=setup({BarcodeDetector:Detector});run.context.window.BarcodeDetector=Detector;
  run.S.scannerStream={getTracks:()=>[]};
  run.context.startBarcodeDetection(run.nodes.get('scannerVideo'));
  const first=run.intervals[0]();await run.intervals[0]();assert.equal(calls,1);
  run.context.closeScanner();resolveDetection([{rawValue:'400'}]);await first;
  assert.deepEqual(run.seen,[]);assert.equal(run.sales,0);
});

test('the fallback decoder releases controls arriving after the scanner has closed',async()=>{
  let resolveControls,stops=0;
  class Reader {decodeFromVideoElement(){return new Promise(resolve=>{resolveControls=resolve;});}}
  const run=setup({qblLoadFallback:async()=>({BrowserMultiFormatReader:Reader})});
  run.S.scannerStream={getTracks:()=>[]};
  const starting=run.context.wfStartBarcodeFallback(run.nodes.get('scannerVideo'),0);
  await new Promise(resolve=>setImmediate(resolve));
  run.context.closeScanner();resolveControls({stop(){stops++;}});await starting;
  assert.equal(stops,1);assert.equal(run.S.scannerFallbackControls,null);
});
