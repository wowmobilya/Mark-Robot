import test from 'node:test';
import {assertPrivateFile} from './fixtures/private-file.mjs';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {buildModelTransferPlan,main} from '../scripts/wow-model-migration-plan.mjs';

const workspaceId='11111111-1111-4111-8111-111111111111';
function fixture(){
 const legacy={projectRef:'sldthbnigivpsqixccah',count:3,inventory:[
  {id:1,title:'W 514',stock:33,is_active:true,price:null,image_url:null,cat:null},
  {id:2,title:'W 512',stock:36,is_active:true,price:null,image_url:null,cat:null},
  {id:3,title:'W 522',stock:12,is_active:true,price:4000,image_url:'https://legacy.invalid/product.png',cat:'orta'}
 ]};
 const primary={workspaceId,dataRevision:7,fullPrimarySyncVerified:true,products:[
   {id:'wow-existing-514',name:'W 514',code:'W 514',revision:3,priceA:14.50,image:'wfmedia:existing'},
   {id:'model-522',name:'W 522',code:'W 522',revision:9,priceA:23.60}
 ],listings:[
   {productId:'model-522',version:3,stock:11,published:true,priceMinor:2360,currency:'USD'}
 ]};
 return {legacy,primary};
}
test('WOW master retains existing product and price while an unmatched model stays unpublished',()=>{
 const {legacy,primary}=fixture(),r=buildModelTransferPlan({legacy,primary});
 assert.equal(r.applyReady,false);assert.equal(r.summary.source,3);
 const matched=r.decisions.find(x=>x.source.id===1);
 assert.equal(matched.decision,'link-existing');assert.equal(matched.destination.id,'wow-existing-514');
 assert.equal(matched.destination.revision,3);
 assert.equal(matched.primaryDraft,null);
 assert.equal(matched.listing.stock,33);assert.equal(matched.listing.published,false);
 assert.equal(matched.listing.priceMinor,null);
 const newProduct=r.decisions.find(x=>x.source.id===2);
 assert.equal(newProduct.decision,'create-unpublished-draft');assert.equal(newProduct.listing.published,false);
 assert.equal(newProduct.primaryDraft.name,'W 512');assert.equal(newProduct.primaryDraft.priceA,undefined);
 assert.equal(newProduct.primaryDraft.image,undefined);
 const conflict=r.decisions.find(x=>x.source.id===3);
 assert.equal(conflict.decision,'hold');assert(conflict.conflicts.includes('STOCK_RECONCILIATION_REQUIRED'));
 assert.equal(conflict.listing,null);assert.equal(r.summary.missingImageProof,1);
 assert.equal(r.summary.missingLegacyPrice,2);
 assert.deepEqual(r.warnings.map(x=>x.code),['LEGACY_PRICE_NOT_AUTHORITY','SOURCE_MEDIA_BYTES_UNVERIFIED']);
 assert(!JSON.stringify(r).includes('23.60'));
});
test('do not match before the complete native WOW sync',()=>{
 const {legacy,primary}=fixture();primary.fullPrimarySyncVerified=false;
 const r=buildModelTransferPlan({legacy,primary});
 assert.equal(r.summary.held,3);assert(r.decisions.every(x=>x.conflicts.includes('PRIMARY_SYNC_NOT_VERIFIED')));
});
test('ordered Galeri pieces keep their weight and configured numeric fields in a new WOW draft',()=>{
 const {legacy,primary}=fixture();
 legacy.dimension_fields=[{field_key:'depth',field_label:'Depth',field_unit:'mm',order_num:1,is_visible:true}];
 legacy.inventory[1].dims=[{name:'Top',icon:'fa-box-open',w:90,h:0,kg:2.5,depth:15},{name:'Base',kg:1}];
 const original=buildModelTransferPlan({legacy,primary}),draft=original.decisions.find(x=>x.source.id===2).primaryDraft;
 assert.deepEqual(draft.dims,[{name:'Top',w:90,h:0,weight:2.5,specs:{depth:15}},{name:'Base',weight:1}]);
 assert.equal(original.dimensionFields[0].unit,'mm');
 legacy.inventory[1].dims[0].depth=20;
 assert.notEqual(buildModelTransferPlan({legacy,primary}).evidenceDigest,original.evidenceDigest);
 legacy.inventory[1].dims[1].unknown=3;
 assert.throws(()=>buildModelTransferPlan({legacy,primary}),/DIMENSION_DEFINITION_REQUIRED/);
});
test('exact code matching cannot silently join two distinct WOW models',()=>{
 const {legacy,primary}=fixture();
 primary.products.push({id:'duplicate-model',name:'Another',code:'W514',revision:2});
 const r=buildModelTransferPlan({legacy,primary});
 assert.equal(r.decisions.find(x=>x.source.id===1).decision,'hold');
 assert(r.decisions.find(x=>x.source.id===1).conflicts.includes('AMBIGUOUS_MODEL_CODE'));
});
test('a verified explicit mapped primary ID takes precedence, but a conflict is reported',()=>{
 const {legacy,primary}=fixture();
 const r=buildModelTransferPlan({legacy,primary,mapping:{products:[{sourceId:2,targetId:'wow-existing-514'}]}});
 const linked=r.decisions.find(x=>x.source.id===2);
 assert.equal(linked.decision,'hold');
 assert.equal(linked.destination.id,'wow-existing-514');
 assert(linked.conflicts.includes('MULTIPLE_LEGACY_IDS_ONE_PRIMARY'));
 const originallyMatched=r.decisions.find(x=>x.source.id===1);
 assert.equal(originallyMatched.decision,'hold');
 assert(originallyMatched.conflicts.includes('MULTIPLE_LEGACY_IDS_ONE_PRIMARY'));
 assert.equal(r.applyReady,false);
});
test('typed IDs, count mismatch, negative inventory and unmapped targets fail closed',()=>{
 const {legacy,primary}=fixture();
 legacy.count=4;assert.throws(()=>buildModelTransferPlan({legacy,primary}),/LEGACY_INVENTORY_COUNT_MISMATCH/);
 legacy.count=3;legacy.inventory[1].id=1;assert.throws(()=>buildModelTransferPlan({legacy,primary}),/DUPLICATE_LEGACY_MODEL/);
 legacy.inventory[1].id='1';assert.equal(buildModelTransferPlan({legacy,primary}).summary.source,3);
 legacy.inventory[1].stock=-1;assert.throws(()=>buildModelTransferPlan({legacy,primary}),/INVALID_LEGACY_STOCK/);
 legacy.inventory[1].stock=36;assert.throws(()=>buildModelTransferPlan({legacy,primary,mapping:{products:[{sourceId:1,targetId:'missing'}]}}),/MAPPED_PRIMARY_MISSING/);
 primary.products[0].revision=0;assert.throws(()=>buildModelTransferPlan({legacy,primary}),/PRIMARY_REVISION_REQUIRED/);
});
test('CLI produces a create-only private report, never a live SQL mutation',async(t)=>{
 const dir=await mkdtemp(path.join(tmpdir(),'wow-transfer-plan-'));t.after(()=>rm(dir,{recursive:true,force:true}));
 const {legacy,primary}=fixture(),a=path.join(dir,'legacy.json'),b=path.join(dir,'primary.json'),c=path.join(dir,'report.json');
 await writeFile(a,JSON.stringify(legacy));await writeFile(b,JSON.stringify(primary));
 const result=await main([a,b,c]);assert.equal(result.applyReady,false);assert.equal(result.mode,'preview-only');
 const persisted=JSON.parse(await readFile(c,'utf8'));assert.equal(persisted.decisions.length,3);
 await assertPrivateFile(c);
 await assert.rejects(()=>main([a,b,c]),/EEXIST/);
 await assert.rejects(()=>main([a,b,a]),/OUTPUT_OVERWRITES_INPUT/);
});

test('the tool directly ingests the original Galeri export and WOW native database rows',()=>{
 const {legacy,primary}=fixture();
 const native={
   workspaceId:primary.workspaceId,dataRevision:primary.dataRevision,fullPrimarySyncVerified:true,
   records:primary.products.map(x=>({store:'products',record_id:x.id,revision:x.revision,
      deleted_at:null,payload:{id:x.id,name:x.name,code:x.code,priceA:x.priceA}})),
   listings:primary.listings.map(x=>({product_id:x.productId,version:x.version,stock:x.stock,published:x.published}))
 };
 const source={projectRef:legacy.projectRef,tables:{inventory:legacy.inventory},counts:{inventory:legacy.inventory.length}};
 const planned=buildModelTransferPlan({legacy:source,primary:native});
 assert.equal(planned.summary.linked,1);
 assert.equal(planned.summary.proposed,1);
 assert.equal(planned.summary.held,1);
 assert.equal(planned.applyReady,false);
});
