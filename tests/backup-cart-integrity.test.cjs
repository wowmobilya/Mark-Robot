'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const acorn=require('acorn');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
function source(name){let start=html.indexOf('function '+name+'(');if(start<0)return '';if(html.slice(start-6,start)==='async ')start-=6;return html.slice(start,acorn.parseExpressionAt(html,start,{ecmaVersion:'latest'}).end);}
const backup=cart=>({format:'WOW_FURNITURE_BACKUP',version:1,data:{companies:[],products:[],invoices:[],payments:[],settings:{}},preferences:{qblCart:cart}});
function fixture({raw=null,products=[],items=[]}={}){
  let transactions=0,refreshes=0,renders=0;const writes=[],storage=new Map();if(raw!==null)storage.set('wf_qbl_cart',raw);
  const context=vm.createContext({WF_BACKUP_VERSION:1,WF_MEDIA_STORE:'media',WF_MEDIA_PERSISTED:new Set(),S:{products},QBL_CART:{items},
    db:{transaction(){transactions++;throw Error('invalid restore must not open a transaction');}},wfDehydrateClone:value=>value,
    localStorage:{getItem:key=>storage.get(key)??null,setItem(key,value){writes.push(key);storage.set(key,String(value));},removeItem(key){writes.push(key);storage.delete(key);}},
    qblUpdateCartUI(){refreshes++;},qblRenderCartList(){renders++;},wfRestoreTexts:()=>({invalid:'Invalid backup data'})});context.window=context;
  for(const name of ['wfValidateCartEntries','wfValidateBackup','wfReplaceStoresFromBackup','qblCartLoad','wfDriveApplyBackupObject']){const code=source(name);if(code)vm.runInContext(code,context);}
  return {context,storage,writes,transactions:()=>transactions,refreshes:()=>refreshes,renders:()=>renders};
}
test('malformed serialized cart snapshots reject the entire backup before a restore transaction opens',async()=>{
  for(const raw of ['{','null','{}','[null]','[[]]','[{"productId":{}}]','[{"productId":"p","qty":1e309}]','[{"productId":"p","qty":"bad"}]','[{"productId":"p","tier":"constructor","qty":1}]']){
    const f=fixture(),b=backup(raw);assert.equal(f.context.wfValidateBackup(b),false,raw);
    await assert.rejects(f.context.wfReplaceStoresFromBackup(b),/Invalid backup data/);assert.equal(f.transactions(),0);
  }
});
test('missing/null/empty legacy cart preferences and valid numeric or quoted product IDs remain accepted',()=>{
  const values=[undefined,null,'','[]',JSON.stringify([{productId:42,qty:'2',tier:'B'},{productId:`منتج ' "`,qty:1},{productId:0,tier:'',qty:3}])];
  for(const value of values){const f=fixture(),b=backup(value);assert.equal(f.context.wfValidateBackup(b),true);}
});
test('loading an intentionally empty or absent saved cart clears prior memory without rewriting storage',()=>{
  for(const raw of [null,'','[]']){
    const prior=[{product:{id:'old'},tier:'A',qty:9}],f=fixture({raw,items:prior});
    f.context.qblCartLoad();assert.equal(f.context.QBL_CART.items.length,0);assert.equal(f.refreshes(),1);assert.equal(f.renders(),1);assert.deepEqual(f.writes,[]);assert.equal(f.storage.get('wf_qbl_cart')??null,raw);
  }
});
test('a rejected cart parse/shape leaves the complete existing cart and original raw snapshot intact',()=>{
  for(const raw of ['{','[null]',JSON.stringify([{productId:'p',tier:'A',qty:2},null])]){
    const prior=[{product:{id:'old'},tier:'C',qty:7}],f=fixture({raw,products:[{id:'p'}],items:prior});
    f.context.qblCartLoad();assert.equal(f.context.QBL_CART.items,prior);assert.equal(f.context.QBL_CART.items[0].qty,7);assert.equal(f.storage.get('wf_qbl_cart'),raw);assert.deepEqual(f.writes,[]);assert.equal(f.refreshes(),0);
  }
});
test('cart restoration resolves canonical numeric IDs once and retains actual product identity, tier and quantity',()=>{
  const product={id:42,name:'Table',priceB:20},raw=JSON.stringify([{productId:'42',tier:'B',qty:3},{productId:'removed',tier:'A',qty:2}]);
  const f=fixture({raw,products:[product],items:[{product:{id:'old'},qty:99}]});f.context.qblCartLoad();assert.equal(f.context.QBL_CART.items.length,1);const restored=f.context.QBL_CART.items[0];
  assert.equal(restored.product,product);assert.equal(restored.product.id,42);assert.equal(restored.tier,'B');assert.equal(restored.qty,3);assert.equal(f.refreshes(),1);assert.equal(f.renders(),1);assert.deepEqual(f.writes,[]);
});
test('an empty-string legacy backup preference clears the saved cart only after the restore commits',async()=>{
  const f=fixture({raw:JSON.stringify([{productId:'old',qty:9}])});let commit;
  f.context.wfReplaceStoresFromBackup=()=>new Promise(resolve=>{commit=resolve;});
  const work=f.context.wfDriveApplyBackupObject(backup(''));assert.ok(f.storage.has('wf_qbl_cart'));assert.deepEqual(f.writes,[]);commit();await work;
  assert.equal(f.storage.has('wf_qbl_cart'),false);
});
