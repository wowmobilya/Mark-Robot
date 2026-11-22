#!/usr/bin/env node
/* WOW is authoritative. This deterministic, offline import planner never connects to
   production, never writes a business record, and never trusts legacy credentials. */
import {createHash} from 'node:crypto';
import {readFile,realpath,stat,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const projectRef='sldthbnigivpsqixccah';
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const own=(x,k)=>Object.prototype.hasOwnProperty.call(x||{},k);
const object=x=>!!x&&typeof x==='object'&&!Array.isArray(x);
const id=x=>{
 if(typeof x==='string'&&x.length>0&&x.length<=180)return JSON.stringify(x);
 if(Number.isSafeInteger(x))return JSON.stringify(x);
 throw Error('INVALID_TYPED_PRODUCT_ID');
};
const sha=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
function code(value){
 if(typeof value!=='string')return '';
 const cleaned=value.trim().normalize('NFC').toUpperCase().replace(/\s+/g,' ');
 // Strict manufacturer/model code. Never use a fuzzy title or translated category.
 const m=/^([A-Z]{1,4})[\s-]?([0-9]{2,6})([A-Z0-9]{0,5})$/.exec(cleaned);
 return m?m[1]+m[2]+m[3]:'';
}
function validTarget(product){
 if(!object(product))throw Error('INVALID_PRIMARY_PRODUCT');
 id(product.id);
 if(!Number.isSafeInteger(product.revision)||product.revision<1)throw Error('PRIMARY_REVISION_REQUIRED');
 if(typeof product.name!=='string')throw Error('PRIMARY_NAME_REQUIRED');
 return product;
}
function validRow(row){
 if(!object(row))throw Error('INVALID_LEGACY_INVENTORY');
 id(row.id);
 if(typeof row.title!=='string'||!row.title.trim()||row.title.length>180)throw Error('INVALID_LEGACY_MODEL');
 if(!Number.isSafeInteger(row.stock)||row.stock<0||row.stock>1000000)throw Error('INVALID_LEGACY_STOCK');
 if(row.is_active!==undefined&&row.is_active!==null&&typeof row.is_active!=='boolean')throw Error('INVALID_LEGACY_ACTIVE');
 if(row.price!=null&&!(typeof row.price==='string'||typeof row.price==='number'))throw Error('INVALID_LEGACY_PRICE');
 if(row.image_url!=null&&typeof row.image_url!=='string')throw Error('INVALID_LEGACY_IMAGE');
 return row;
}
function classifyAsset(row){
 if(!row.image_url)return 'none';
 // Non-canonical HTTP URLs, inline data, and arbitrary foreign objects are never
 // treated as trusted WOW private media. Transfer bytes/hash with a separate adapter.
 return 'verification-required';
}
function onlyFields(row){
 return {id:row.id,title:row.title,stock:row.stock,is_active:row.is_active!==false,
   modelCode:code(row.title),hasPrice:row.price!=null,asset:classifyAsset(row)};
}
export function buildModelTransferPlan({legacy,primary,mapping={}}={}){
 const inventory=legacy?.inventory??legacy?.tables?.inventory;
 const sourceCount=legacy?.count??legacy?.counts?.inventory;
 if(!object(legacy)||legacy.projectRef!==projectRef||!Array.isArray(inventory)||
   !Number.isSafeInteger(sourceCount)||sourceCount!==inventory.length)throw Error('LEGACY_INVENTORY_COUNT_MISMATCH');
 const inputProducts=primary?.products??primary?.records?.filter(row=>row.store==='products'&&!row.deleted_at);
 const inputListings=primary?.listings;
 if(!object(primary)||!uuid.test(primary.workspaceId)||!Array.isArray(inputProducts)||
   !Array.isArray(inputListings)||!Number.isSafeInteger(primary.dataRevision)||primary.dataRevision<0)
   throw Error('PRIMARY_SNAPSHOT_REQUIRED');
 if(!object(mapping)||!Array.isArray(mapping.products||[])||!Array.isArray(mapping.confirmedAssetDigests||[]))
   throw Error('INVALID_MAPPING');
 if(mapping.workspaceId&&mapping.workspaceId!==primary.workspaceId)throw Error('WRONG_WORKSPACE');
 // Work directly from either WOW's native product records or a sanitized
 // product snapshot. Do not let legacy replace any primary payload field.
 const primaryProducts=inputProducts.map(row=>row.record_id!==undefined?
   {id:row.record_id,name:row.payload?.name??'',code:row.payload?.code??'',revision:row.revision}:row);
 const primaryListings=inputListings.map(row=>row.product_id!==undefined?
   {productId:row.product_id,version:row.version,stock:row.stock,published:row.published}:row);
 const targets=new Map(),byCode=new Map(),listings=new Map();
 for(const item of primaryProducts){
   validTarget(item);const key=id(item.id);if(targets.has(key))throw Error('DUPLICATE_PRIMARY_ID');
   targets.set(key,item);
   const model=code(item.code)||code(item.name);
   if(model){const group=byCode.get(model)||[];group.push(item);byCode.set(model,group);}
 }
 for(const entry of primaryListings){
   if(!object(entry))throw Error('INVALID_LISTING');
   const key=id(entry.productId);if(listings.has(key))throw Error('DUPLICATE_PRIMARY_LISTING');
   if(!targets.has(key))throw Error('ORPHAN_PRIMARY_LISTING');
   if(!Number.isSafeInteger(entry.version)||entry.version<1)throw Error('INVALID_LISTING_VERSION');
   listings.set(key,entry);
 }
 const explicit=new Map();
 for(const link of mapping.products||[]){
   if(!object(link))throw Error('INVALID_MAPPING');
   const source=id(link.sourceId),target=id(link.targetId);
   if(explicit.has(source))throw Error('DUPLICATE_SOURCE_MAPPING');
   if(!targets.has(target))throw Error('MAPPED_PRIMARY_MISSING');
   explicit.set(source,target);
 }
 const sourceIds=new Set(),sourcesByCode=new Map();
 for(const row of inventory){
   validRow(row);const key=id(row.id);if(sourceIds.has(key))throw Error('DUPLICATE_LEGACY_MODEL');
   sourceIds.add(key);const model=code(row.title);
   if(model)sourcesByCode.set(model,(sourcesByCode.get(model)||0)+1);
 }
 for(const key of explicit.keys())if(!sourceIds.has(key))throw Error('MAPPED_LEGACY_MISSING');
 // Compute the entire prospective assignment first: one primary product must
 // never silently consume two legacy models, even if one was auto-matched.
 const proposedTargets=new Map();
 for(const row of inventory){
   const sourceKey=id(row.id),model=code(row.title),candidate=byCode.get(model)||[];
   const target=explicit.has(sourceKey)?explicit.get(sourceKey):
     model&&candidate.length===1&&sourcesByCode.get(model)===1?id(candidate[0].id):null;
   if(target){const all=proposedTargets.get(target)||[];all.push(sourceKey);proposedTargets.set(target,all);}
 }
 const decisions=[],warnings=[];
 const synced=primary.fullPrimarySyncVerified===true;
 for(const row of [...inventory].sort((a,b)=>id(a.id).localeCompare(id(b.id),'en'))){
   const legacyId=id(row.id),model=code(row.title),mapped=explicit.get(legacyId);
   const candidates=model?byCode.get(model)||[]:[];
   const matching=explicit.has(legacyId)?targets.get(mapped):candidates.length===1&&sourcesByCode.get(model)===1?candidates[0]:null;
   const conflicts=[];
   if(!model)conflicts.push('MODEL_CODE_UNVERIFIED');
   if(candidates.length>1||model&&sourcesByCode.get(model)>1)conflicts.push('AMBIGUOUS_MODEL_CODE');
   if(mapped&&candidates.length===1&&id(candidates[0].id)!==mapped)conflicts.push('EXPLICIT_MAPPING_CONFLICT');
   if(matching&&(proposedTargets.get(id(matching.id))||[]).length>1)conflicts.push('MULTIPLE_LEGACY_IDS_ONE_PRIMARY');
   if(matching&&!synced)conflicts.push('PRIMARY_SYNC_NOT_VERIFIED');
   if(!matching&&!synced)conflicts.push('PRIMARY_SYNC_NOT_VERIFIED');
   if(!matching&&candidates.length>1)conflicts.push('UNRESOLVED_PRIMARY_DUPLICATE');
   const prior=matching?listings.get(id(matching.id)):null;
   if(prior&&prior.stock!==row.stock)conflicts.push('STOCK_RECONCILIATION_REQUIRED');
   if(row.price!=null)warnings.push({sourceId:row.id,code:'LEGACY_PRICE_NOT_AUTHORITY'});
   if(row.image_url)warnings.push({sourceId:row.id,code:'SOURCE_MEDIA_BYTES_UNVERIFIED'});
   const source=onlyFields(row);
   const destination=matching?{id:matching.id,revision:matching.revision,mode:'preserve-primary'}:
     {id:'galeri-inventory:'+legacyId,revision:0,mode:'new-primary-draft'};
   if(!matching&&targets.has(id(destination.id)))conflicts.push('TARGET_ID_COLLISION');
   const decision=conflicts.length?'hold':matching?'link-existing':'create-unpublished-draft';
   const desiredListing=prior?null:{productId:destination.id,published:false,stock:row.stock,
     // The primary WOW price and currency remain authoritative; never infer them
     // from an unlabeled legacy numeric price.
     priceMinor:null,currency:'USD',collection:typeof row.cat==='string'?row.cat.slice(0,80):'',
     badge:'',specs:{},expectedVersion:0};
   const draft=decision==='create-unpublished-draft'?{
     id:destination.id,name:row.title.trim().normalize('NFC'),code:row.title.trim().normalize('NFC'),
     type:typeof row.cat==='string'?row.cat.slice(0,80):'',
     // No guessed price, external image pointer, customer identity or old password.
     legacyImport:{source:'Galeri.TR/inventory',sourceId:row.id}
   }:null;
   decisions.push({source,destination,decision,conflicts,listing:decision==='hold'?null:desiredListing,
     primaryDraft:draft,sourceImage:classifyAsset(row),primaryFieldsPreserved:true});
 }
 // A plan is not authority to publish or post historical orders. Every write must
 // go through the same authenticated WOW server, CAS checks, and recovery gate.
 const summary={source:decisions.length,linked:decisions.filter(x=>x.decision==='link-existing').length,
   proposed:decisions.filter(x=>x.decision==='create-unpublished-draft').length,
   held:decisions.filter(x=>x.decision==='hold').length,
   missingImageProof:decisions.filter(x=>x.sourceImage==='verification-required').length,
   missingLegacyPrice:decisions.filter(x=>!x.source.hasPrice).length};
 return {format:'wow-model-unification-plan/1',mode:'preview-only',projectRef,
   workspaceId:primary.workspaceId,primaryDataRevision:primary.dataRevision,fullPrimarySyncVerified:synced,
   applyReady:false,summary,decisions,warnings,
   // Keep an immutable local comparison indicator, not a bearer credential.
   evidenceDigest:sha({source:inventory.map(onlyFields),primary:primaryProducts.map(x=>[x.id,x.revision,x.name,x.code]),
     listings:primaryListings.map(x=>[x.productId,x.version,x.stock]),workspaceId:primary.workspaceId,dataRevision:primary.dataRevision}),
   nextGate:'AUTHENTICATED_OWNER_MIGRATION_WITH_TRANSACTIONAL_RECHECK_AND_MEDIA_BYTES'};
}
async function input(file){
 const s=await stat(file);if(!s.isFile()||s.size>67108864)throw Error('INPUT_TOO_LARGE');
 return JSON.parse(await readFile(file,'utf8'));
}
export async function main(args){
 if(args.length!==3)throw Error('USAGE: wow-model-migration-plan.mjs legacy.json primary.json private-report.json');
 const [a,b,c]=args.map(x=>path.resolve(x));if(c===a||c===b)throw Error('OUTPUT_OVERWRITES_INPUT');
 const repo=await realpath(path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'));
 const dest=path.join(await realpath(path.dirname(c)),path.basename(c));
 if(dest===repo||dest.startsWith(repo+path.sep))throw Error('PRIVATE_REPORT_MUST_STAY_OUTSIDE_REPOSITORY');
 const result=buildModelTransferPlan({legacy:await input(a),primary:await input(b)});
 await writeFile(dest,JSON.stringify(result,null,2)+'\n',{flag:'wx',mode:0o600});
 return {mode:result.mode,...result.summary,evidenceDigest:result.evidenceDigest,applyReady:false};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 main(process.argv.slice(2)).then(result=>console.log(JSON.stringify(result))).catch(error=>{
  console.error(/^[A-Z_ :a-z./]+$/.test(error.message)?error.message:'INVALID_PRIVATE_IMPORT');process.exitCode=1;
 });
}
