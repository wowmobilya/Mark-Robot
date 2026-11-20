const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {activePrice, syncDisclosure, enhanceBrowseResult, word} = require('../product-workspace.js');

test('the catalog summary shows the saved active tier, including a legitimate zero, without changing product data', () => {
  const product = {activeTier:'B',priceA:100,priceUSD:100,priceB:75,priceC:0};
  const before = structuredClone(product);
  assert.deepEqual(activePrice(product),{tier:'B',value:75});
  assert.deepEqual(activePrice({...product,activeTier:'C'}),{tier:'C',value:0});
  assert.deepEqual(activePrice({priceUSD:42}),{tier:'A',value:42});
  assert.deepEqual(activePrice({priceA:0,priceUSD:42}),{tier:'A',value:0});
  assert.deepEqual(product,before);
});

test('invalid and missing catalog prices are not substituted from a different tier', () => {
  assert.deepEqual(activePrice({activeTier:'B',priceA:60}),{tier:'B',value:0});
  assert.deepEqual(activePrice({activeTier:'C',priceC:'invalid'}),{tier:'C',value:0});
  assert.deepEqual(activePrice({activeTier:'C',priceC:-1}),{tier:'C',value:0});
  assert.deepEqual(activePrice({activeTier:'unknown',priceA:'81.5'}),{tier:'A',value:81.5});
});

test('closed details are hidden from interaction and their button exposes its controlled region', () => {
  const panel={id:'prDetailsPanel-product-1',style:{maxHeight:'0'},hidden:false};
  const attrs={};const button={setAttribute:(key,value)=>{attrs[key]=value;}};
  assert.equal(syncDisclosure(panel,button),false);
  assert.equal(panel.hidden,true);
  assert.equal(attrs['aria-expanded'],'false');
  assert.equal(attrs['aria-controls'],panel.id);
  panel.style.maxHeight='600px';
  assert.equal(syncDisclosure(panel,button),true);
  assert.equal(panel.hidden,false);
  assert.equal(attrs['aria-expanded'],'true');
  panel.style.maxHeight='0px';syncDisclosure(panel,button);
  assert.equal(panel.hidden,true);
});

test('the actual legacy details toggle and the accessible state stay synchronized across repeated open and close', () => {
  const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
  const start=html.indexOf('function togglePrDetails(');
  const source=html.slice(start,html.indexOf('const QBL =',start));
  let maxHeight='0px';
  const panel={id:'prDetailsPanel-p1',style:{get maxHeight(){return maxHeight;},set maxHeight(value){maxHeight=value==='0'?'0px':value;},opacity:'0'},hidden:true};
  const arrow={style:{}},label={textContent:''},image={style:{}};
  const nodes={'prDetailsPanel-p1':panel,'prDetailsArrow-p1':arrow,'prDetailsBtnTxt-p1':label,'prCardImg-p1':image};
  const attrs={};const button={setAttribute:(key,value)=>{attrs[key]=value;}};
  const context=vm.createContext({S:{lang:'fr'},document:{getElementById:id=>nodes[id]}});
  vm.runInContext(source,context);
  for(let i=0;i<4;i++) {
    context.togglePrDetails('p1',button);syncDisclosure(panel,button);
    const expanded=i%2===0;
    assert.equal(panel.hidden,!expanded);assert.equal(attrs['aria-expanded'],String(expanded));
    assert.equal(label.textContent,expanded?'Masquer les détails':'Afficher les détails');
  }
});

test('all newly introduced product captions are available in the five interface languages', () => {
  for(const language of ['ar','en','tr','fr','ru'])for(const key of ['price','remove','package','measurement','removePackage','removeMeasurement','addMeasurement']) {
    const caption=word(key,language);assert(caption&&caption!==key,language+' '+key);
  }
});

function browseRow(name,code) {
  const classes=()=>{const values=new Set();return {values,add(...names){names.forEach(name=>values.add(name));}};};
  const span=text=>({tagName:'SPAN',textContent:text,classList:classes(),hidden:false});
  const handlers=[],attributes={onclick:"qblPickFromDropdown('product-1')"};
  const row={tagName:'DIV',children:[span('icon'),span(name),...(code===undefined?[]:[span(code)])],dataset:{},classList:classes(),
    setAttribute(key,value){attributes[key]=value;},addEventListener(type,listener){if(type==='keydown')handlers.push(listener);},
    clicks:0,click(){this.clicks++;}};
  const key=(key,options={})=>{
    const event={key,target:row,repeat:false,prevented:false,stopped:false,preventDefault(){this.prevented=true;},stopPropagation(){this.stopped=true;},...options};
    for(const handler of handlers)handler(event);return event;
  };
  return {row,attributes,handlers,key};
}

test('barcode browse preserves the original selection handler and forwards one focused keyboard activation', () => {
  const f=browseRow('WOW K400','WOW K400');enhanceBrowseResult(f.row);enhanceBrowseResult(f.row);
  assert.equal(f.attributes.onclick,"qblPickFromDropdown('product-1')");
  assert.equal(f.attributes.role,'button');assert.equal(f.row.tabIndex,0);assert.equal(f.handlers.length,1);
  const enter=f.key('Enter');assert.equal(f.row.clicks,1);assert(enter.prevented&&enter.stopped);
  const space=f.key(' ');assert.equal(f.row.clicks,2);assert(space.prevented&&space.stopped);
  f.key('Enter',{repeat:true});f.key(' ' ,{target:f.row.children[1]});f.key('ArrowDown');
  assert.equal(f.row.clicks,2,'repeats, nested targets and navigation keys do not select another product');
});

test('barcode browse hides only an exact duplicate secondary name and retains distinct model codes', () => {
  const f=browseRow('  WOW K400  ','\n WOW K400 \n');enhanceBrowseResult(f.row);
  assert.equal(f.row.children[1].hidden,false);assert.equal(f.row.children[2].hidden,true);
  assert.equal(f.row.children[2].textContent,'\n WOW K400 \n','the source node and text are retained');
  f.row.children[2].textContent='K400-2026';enhanceBrowseResult(f.row);assert.equal(f.row.children[2].hidden,false);
  f.row.children[2].textContent='wow k400';enhanceBrowseResult(f.row);assert.equal(f.row.children[2].hidden,false);
  const onlyName=browseRow('W500');assert.doesNotThrow(()=>enhanceBrowseResult(onlyName.row));assert.equal(onlyName.row.children.length,2);
});
