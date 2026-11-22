#!/usr/bin/env node
// Read-only product identity reconciliation for Galeri.TR -> WOW.
// Never import rows, assign access, fetch URLs, mutate inventory or guess prices.
import {readFile,writeFile,realpath,stat} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const own=(obj,key)=>Object.prototype.hasOwnProperty.call(obj||{},key);
const typed=value=>(typeof value==='string'&&value.length>0&&value.length<=180)||Number.isSafeInteger(value)?JSON.stringify(value):null;
const modelCode=value=>{
  if(typeof value!=='string')return null;
  const normalized=value.normalize('NFKC').trim().toUpperCase().replace(/[\s_-]+/g,'');
  return /^[A-Z]{1,8}[0-9]{2,8}[A-Z]{0,3}$/.test(normalized)?normalized:null;
};
function wowCodes(row){
  const codes=new Set();
  for(const key of ['code','modelCode','sku']){
    const code=modelCode(row[key]);if(code)codes.add(code);
  }
  // Names are valid candidates only when they are themselves complete model identifiers.
  const name=modelCode(row.name);if(name)codes.add(name);
  return [...codes];
}
const isActive=row=>row&&typeof row==='object'&&!row.deleted&&!row.isDeleted&&!row.deletedAt&&!row.archived&&!row.archivedAt;
export function associateLegacyModels({legacyInventory=[],wowProducts=[]}={}){
  if(!Array.isArray(legacyInventory)||!Array.isArray(wowProducts))throw Error('INVALID_PRODUCT_ARRAY');
  if(legacyInventory.length>50000||wowProducts.length>50000)throw Error('PRODUCT_LIMIT');
  const sources=new Map(),targets=new Map(),invalid=[],unmatched=[],ambiguous=[],linked=[];
  const add=(map,code,row)=>{const list=map.get(code)||new Map();list.set(typed(row.id),row);map.set(code,list);};
  const seenLegacyIds=new Set(),seenWowIds=new Set();
  for(const row of legacyInventory){
    const key=typed(row?.id),code=modelCode(row?.title);
    if(!key||!code){invalid.push({side:'legacy',id:row?.id??null,reason:'INVALID_ID_OR_MODEL'});continue;}
    if(seenLegacyIds.has(key)){invalid.push({side:'legacy',id:row.id,reason:'DUPLICATE_ID'});continue;}
    seenLegacyIds.add(key);add(sources,code,{id:row.id,modelCode:code});
  }
  for(const row of wowProducts){
    const key=typed(row?.id),codes=isActive(row)?wowCodes(row):[];
    if(!key||!codes.length){invalid.push({side:'wow',id:row?.id??null,reason:'NO_VALID_ACTIVE_MODEL_CODE'});continue;}
    if(seenWowIds.has(key)){invalid.push({side:'wow',id:row.id,reason:'DUPLICATE_ID'});continue;}
    seenWowIds.add(key);for(const code of codes)add(targets,code,{id:row.id,modelCode:code});
  }
  for(const [code,candidates] of sources){
    const left=[...candidates.values()],right=[...(targets.get(code)?.values()||[])];
    if(left.length>1||right.length>1){
      ambiguous.push({modelCode:code,legacyIds:left.map(x=>x.id),wowIds:right.map(x=>x.id),reason:'DUPLICATE_MODEL_CODE'});
    } else if(!right.length)unmatched.push({legacyId:left[0].id,modelCode:code,reason:'NO_WOW_MODEL'});
    else linked.push({legacyId:left[0].id,wowId:right[0].id,modelCode:code,evidence:'EXACT_UNIQUE_MODEL_CODE'});
  }
  // A target with several legacy aliases is not an automatic one-to-one association.
  const targetToLegacy=new Map();
  for(const row of linked){const key=typed(row.wowId),list=targetToLegacy.get(key)||[];list.push(row);targetToLegacy.set(key,list);}
  const accepted=[];
  for(const [targetId,rows]of targetToLegacy){
    if(rows.length===1)accepted.push(rows[0]);
    else ambiguous.push({modelCode:rows.map(x=>x.modelCode).join(','),legacyIds:rows.map(x=>x.legacyId),wowIds:[rows[0].wowId],reason:'MULTIPLE_LEGACY_TO_ONE_WOW'});
  }
  accepted.sort((a,b)=>a.modelCode.localeCompare(b.modelCode,'en'));
  unmatched.sort((a,b)=>a.modelCode.localeCompare(b.modelCode,'en'));
  ambiguous.sort((a,b)=>a.modelCode.localeCompare(b.modelCode,'en'));
  const summary={legacyRows:legacyInventory.length,wowRows:wowProducts.length,uniqueLinked:accepted.length,unmatched:unmatched.length,ambiguous:ambiguous.length,invalid:invalid.length};
  return Object.freeze({schema:'wow-legacy-model-association/1',mode:'read-only',applyReady:false,
    reason:'REVIEW_STOCK_PRICE_CURRENCY_MEDIA_ORDERS_AND_DEVICE_PRODUCTS_BEFORE_IMPORT',
    summary,linked:accepted,unmatched,ambiguous,invalid,
    fingerprint:createHash('sha256').update(JSON.stringify({summary,linked:accepted,unmatched,ambiguous,invalid})).digest('hex')});
}
async function readJson(file){
  const info=await stat(file);if(!info.isFile()||info.size>67108864)throw Error('INVALID_FILE');
  return JSON.parse(await readFile(file,'utf8'));
}
export async function main(args){
  if(args.length!==3)throw Error('USAGE: legacy-inventory.json wow-products.json private-report.json');
  const [source,targets,dest]=args.map(value=>path.resolve(value));
  if([source,targets].includes(dest))throw Error('REPORT_OVERWRITES_INPUT');
  const repo=await realpath(path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'));
  const report=path.join(await realpath(path.dirname(dest)),path.basename(dest));
  if(report===repo||report.startsWith(repo+path.sep))throw Error('PRIVATE_REPORT_MUST_STAY_OUTSIDE_REPOSITORY');
  const [legacyInventory,wowProducts]=await Promise.all([readJson(source),readJson(targets)]);
  const result=associateLegacyModels({legacyInventory,wowProducts});
  await writeFile(report,JSON.stringify(result,null,2)+'\n',{flag:'wx',mode:0o600});
  return {mode:result.mode,applyReady:false,...result.summary,fingerprint:result.fingerprint};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  main(process.argv.slice(2)).then(x=>console.log(JSON.stringify(x))).catch(()=>{console.error('MODEL_ASSOCIATION_FAILED');process.exitCode=1;});
}