const {test} = require('node:test');
const assert = require('node:assert/strict');
const {fieldChanges, mergeSettings, commitPatch, marksHTML, taxHTML, taxLines, documentLogoStyle, validateFile} = require('../company-identity.js');
const sign = 'data:image/png;base64,c2lnbg==', stamp = 'data:image/png;base64,c3RhbXA=';
const escape = text => text.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');

test('editing a tax number submits only the changed company field and preserves leading zeroes', () => {
  const original = {companyName:'Existing company',taxNumber:'',email:'',phone:'123',ibanUSD:'first',kdvRate:'0'};
  const submitted = {...original,taxNumber:' 00120034 ',ibanUSD:'bank draft',kdvRate:'20'};
  delete submitted.phone;
  const patch = fieldChanges('company', original, submitted);
  assert.deepEqual(patch, {taxNumber:'00120034'});
  const stored = {...original,email:'changed on another tab',ibanUSD:'current',nextNoExt:7241};
  const saved = mergeSettings(stored,patch);
  assert.equal(saved.email,'changed on another tab');
  assert.equal(saved.ibanUSD,'current');
  assert.equal(saved.nextNoExt,7241);
  assert.equal(saved.phone,'123');
});

test('saving a bank edit separately keeps account currencies, tax, artwork, invoice numbering and current logo preferences', async () => {
  let database = {id:'main',ibanUSD:'new USD',ibanTRY:'keep TRY',ibanEUR:'keep EUR',taxNumber:'007',stamp,signature:sign,nextNoExt:6520,branding:{logoSize:'normal',extension:17},bankName:'Old'};
  const state = {settings:{...database,ibanUSD:'stale USD',companyName:'Company'}};
  const disk = async ([op]) => {
    assert.equal(op.type,'merge');
    database = op.merge(database,op.value); return [database];
  };
  const bankPatch = fieldChanges('bank',{bankName:'Old',ibanUSD:'stale USD',taxNumber:'007'}, {bankName:'Updated',ibanUSD:'stale USD',taxNumber:'unsaved company draft'});
  await commitPatch(state,bankPatch,disk,async row=>row);
  await commitPatch(state,{branding:{logoShape:'circle'}},disk,async row=>row);
  assert.deepEqual(state.settings,{...database,companyName:'Company'});
  assert.equal(database.ibanUSD,'new USD'); assert.equal(database.ibanTRY,'keep TRY'); assert.equal(database.ibanEUR,'keep EUR');
  assert.equal(database.taxNumber,'007'); assert.equal(database.nextNoExt,6520); assert.equal(database.stamp,stamp); assert.equal(database.signature,sign);
  assert.deepEqual(database.branding,{logoSize:'normal',extension:17,logoShape:'circle'});
});

test('failed transaction keeps the live settings and input patch available for retry', async () => {
  const state = {settings:{stamp,bankName:'Before'}}, original = state.settings, patch = {stamp:'',bankName:'After'};
  await assert.rejects(commitPatch(state,patch,async()=>{throw new Error('quota');},async row=>row),/quota/);
  assert.equal(state.settings,original); assert.deepEqual(original,{stamp,bankName:'Before'});
  await commitPatch(state,patch,async([op])=>[op.merge(state.settings,op.value)],async row=>row);
  assert.equal(state.settings.stamp,''); assert.equal(state.settings.bankName,'After');
});

test('invoice rendering escapes tax input, prints the signature above the stamp, and ignores untrusted image URLs', () => {
  const st = {taxNumber:'00012',taxOffice:'<b> A & B',signature:sign,stamp};
  const html = taxHTML(st,'tr',escape);
  assert.match(html,/Vergi No/); assert.match(html,/00012/); assert.match(html,/Vergi dairesi/); assert.match(html,/&lt;b&gt; A &amp; B/);
  assert.deepEqual(taxLines({},'en'),[]);
  const art = marksHTML(st,'ar');
  assert(art.includes(sign) && art.includes(stamp) && art.indexOf(sign)<art.indexOf(stamp));
  assert.equal(marksHTML({stamp:'https://example.test/a.png',signature:'data:image/svg+xml;base64,QQ=='},'en'),'');
  assert.equal(marksHTML({},'en'),'');
  assert(documentLogoStyle({branding:{logoShape:'circle',logoSize:'large',logoBackground:'#abc123'}}).includes('border-radius:50%'));
  assert(!documentLogoStyle({branding:{logoShape:'rounded',logoBackground:'url(external)'}}).includes('external'));
});

test('restricts artwork files and keeps a legitimate zero VAT rate when editing invoice settings', () => {
  validateFile({type:'image/png',size:100});
  assert.throws(()=>validateFile({type:'image/svg+xml',size:100}));
  assert.throws(()=>validateFile({type:'image/jpeg',size:5*1024*1024+1}));
  assert.deepEqual(fieldChanges('invoice',{kdvRate:'20'}, {kdvRate:'0'}),{kdvRate:0});
  assert.throws(()=>fieldChanges('invoice',{nextNoExt:'7000'}, {nextNoExt:''}));
  assert.deepEqual(fieldChanges('currency',{manualUsdTry:'42.5'}, {manualUsdTry:''}),{manualUsdTry:null});
});

test('the application storage transaction commits stamp media alongside a partial settings merge and exports hydrated backup data', async () => {
  const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
  const html = fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
  const script = fs.readFileSync(path.join(__dirname,'../company-identity.js'),'utf8');
  const tables = {settings:new Map([['main',{id:'main',phone:'latest on disk',ibanEUR:'EUR kept',branding:{extension:7}}]]),media:new Map()};
  let abortNext = false;
  const db = {objectStoreNames:{contains:name=>name in tables}, transaction(names,mode) {
    assert.equal(mode,'readwrite');
    const staged = Object.fromEntries(names.map(name=>[name,new Map(tables[name])]));
    const work = [];
    const request = action => {const req = {};work.push(()=>{req.result=action();req.onsuccess?.();});return req;};
    const tx = {objectStore:name=>({
      get:id=>request(()=>staged[name].get(id)),
      put:row=>request(()=>{staged[name].set(row.id,structuredClone(row));return row.id;})
    })};
    queueMicrotask(()=>{
      try {
        while(work.length)work.shift()();
        if(abortNext){abortNext=false;tx.error=new Error('storage full');tx.onabort();return;}
        for(const name of names)tables[name]=staged[name];
        tx.oncomplete();
      } catch (error) {tx.error=error;tx.onabort();}
    });
    return tx;
  }};
  const ctx = vm.createContext({module:{exports:{}},db,Blob,window:{},WF_BACKUP_VERSION:7,DB_NAME:'wow',DB_VER:7,
    S:{settings:{phone:'stale',companyName:'Company'}},wfStorageWriteError(){}});
  const slice=(a,b)=>html.slice(html.indexOf(a),html.indexOf(b,html.indexOf(a)));
  vm.runInContext(script,ctx);
  vm.runInContext(slice("const WF_MEDIA_STORE=","// A tablet may suspend")+
    slice("async function wfWriteBatch(","const dbPutRaw=")+
    slice("async function wfLoadMediaIds(","async function wfPutMediaRows(")+
    slice("function wfBuildBackup(){","function wfExportBackup("),ctx);
  ctx.signature = sign; ctx.stamp = stamp;
  const write=()=>vm.runInContext("module.exports.commitPatch(S,{signature,stamp,taxNumber:'00017',branding:{logoBackground:'#38abcf'}},wfWriteBatch,wfHydrateDBValue)",ctx);
  abortNext=true;
  await assert.rejects(write(),/storage full/);
  assert.equal(tables.media.size,0);assert.equal(ctx.S.settings.stamp,undefined);
  await write();
  assert.equal(tables.media.size,2);
  const raw=tables.settings.get('main');
  assert.match(raw.signature,/^wfmedia:/);assert.match(raw.stamp,/^wfmedia:/);
  assert.equal(raw.ibanEUR,'EUR kept');assert.equal(raw.phone,'latest on disk');assert.equal(raw.branding.extension,7);
  const saved=vm.runInContext('wfBuildBackup().data.settings',ctx);
  assert.equal(saved.stamp,stamp);assert.equal(saved.signature,sign);assert.equal(saved.taxNumber,'00017');assert.equal(saved.companyName,'Company');
});
