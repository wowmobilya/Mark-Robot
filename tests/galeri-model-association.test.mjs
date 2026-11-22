import test from 'node:test';
import assert from 'node:assert/strict';
import {associateLegacyModels} from '../scripts/galeri-model-association.mjs';
test('exact unique model codes attach to existing WOW models but do not import',()=>{
 const result=associateLegacyModels({legacyInventory:[{id:3,title:'W 522',stock:12,price:4000,image_url:'secret'},{id:8,title:'W 490C',stock:10}],wowProducts:[{id:'wow-1',name:'W-522',priceA:5,image:'another'},{id:29,code:'W490C',name:'Coffee table'}]});
 assert.equal(result.mode,'read-only');assert.equal(result.applyReady,false);
 assert.equal(result.summary.uniqueLinked,2);assert.deepEqual(result.linked.map(x=>x.legacyId),[8,3]);
 assert.ok(result.linked.every(x=>!Object.hasOwn(x,'stock')&&!Object.hasOwn(x,'price')&&!Object.hasOwn(x,'image')));
 assert.ok(!JSON.stringify(result).includes('secret'));
});
test('unmatched models and absent WOW records never create a replacement',()=>{
 const r=associateLegacyModels({legacyInventory:[{id:1,title:'W 514'}],wowProducts:[]});
 assert.equal(r.summary.unmatched,1);assert.equal(r.summary.uniqueLinked,0);assert.equal(r.unmatched[0].reason,'NO_WOW_MODEL');
});
test('duplicate codes are ambiguous and cannot be joined by name or guessed by stock',()=>{
 const r=associateLegacyModels({legacyInventory:[{id:1,title:'W 514'},{id:2,title:'W-514'},{id:3,title:'W 522'}],wowProducts:[{id:1,code:'W514'},{id:5,sku:'W522',name:'Display cabinet'},{id:6,name:'W 522'}]});
 assert.equal(r.summary.uniqueLinked,0);assert.equal(r.summary.ambiguous,2);
 assert.deepEqual(r.ambiguous.map(x=>x.modelCode),['W514','W522']);
});
test('different typed IDs, aliases and inactive records are handled without false links',()=>{
 const r=associateLegacyModels({legacyInventory:[{id:1,title:'T 419'},{id:'1',title:'K 523'}],wowProducts:[{id:7,name:'T 419',deleted:true},{id:8,name:'Not a model'},{id:9,sku:'K523'}]});
 assert.equal(r.summary.uniqueLinked,1);assert.equal(r.linked[0].legacyId,'1');
 assert.equal(r.summary.unmatched,1);assert.equal(r.summary.invalid,2);
});
test('reject malformed arrays and unsafe IDs',()=>{
 assert.throws(()=>associateLegacyModels({legacyInventory:{},wowProducts:[]}),/INVALID_PRODUCT_ARRAY/);
 const r=associateLegacyModels({legacyInventory:[{id:{x:1},title:'W514'}],wowProducts:[]});
 assert.equal(r.summary.invalid,1);
});