import test from 'node:test';
import assert from 'node:assert/strict';
import {createCompanyStorage,workspaceOwnsPath} from '../supabase/functions/wow-cloud/company-storage.mjs';

const id='00000000-0000-4000-8000-000000000001';
const other='00000000-0000-4000-8000-000000000002';
const canonical='chat/'+id+'/room/object/digest';
const folder='companies/Mohammad--'+id+'/';
const named=folder+canonical;
const job={workspaceId:id,source:canonical,destination:named};

function setup({jobs=[],mapped=named,destinationBytes='sample'}={}){
  const actions=[];
  const api=createCompanyStorage({
    base:'https://example.test',serviceHeaders:{},timeoutMs:1000,objectPath:p=>p,
    call:async(path,options)=>{
      actions.push({path,...options});
      if(path.endsWith('_jobs'))return {jobs};
      if(path.endsWith('_resolve'))return {path:mapped};
      if(options.method==='DELETE')return [{name:options.body.prefixes[0]}];
      return {};
    },
    fetcher:async url=>new Response(url.includes('/companies/')?destinationBytes:'sample')
  });
  return {actions,...api};
}

test('named folder and nested canonical key must both belong to the company',async()=>{
  assert.ok(workspaceOwnsPath(id,named));
  assert.ok(workspaceOwnsPath(id,folder+'.keep'));
  for(const path of [folder+canonical.replace(id,other),folder+'../escape',folder+'.keep/file',named.replace('Mohammad--','../')]){
    assert.equal(workspaceOwnsPath(id,path),false);
  }
  assert.equal(await setup().resolve(canonical,'read'),named);
  await assert.rejects(setup({mapped:folder+canonical.replace(id,other)}).resolve(canonical,'read'));
});

test('copy preserves the original and retirement verifies both byte streams and current lookup',async()=>{
  const copy=setup({jobs:[job]});
  await copy.organize();
  assert.ok(copy.actions.some(a=>a.path.endsWith('/copy')));
  assert.ok(!copy.actions.some(a=>a.method==='DELETE'));
  const retire={...job,readyToRetire:true};
  for(const config of [{destinationBytes:'different'},{mapped:canonical}]){
    const trial=setup({...config,jobs:[retire]});
    if(config.destinationBytes)await assert.rejects(trial.organize());
    else await trial.organize();
    assert.ok(!trial.actions.some(a=>a.method==='DELETE'));
  }
  const done=setup({jobs:[retire]});
  await done.organize();
  assert.deepEqual(done.actions.find(a=>a.method==='DELETE')?.body,{prefixes:[canonical]});
});

test('refuses cross-company copy and creates only the named empty-folder marker',async()=>{
  await assert.rejects(setup({jobs:[{...job,workspaceId:other}]}).organize());
  await assert.rejects(setup({jobs:[{...job,source:null}]}).organize());
  const marker=setup({jobs:[{workspaceId:id,source:null,destination:folder+'.keep'}]});
  await marker.organize();
  const upload=marker.actions.find(a=>a.binary);
  assert.equal(upload.body.byteLength,0);
  assert.equal(upload.headers['x-upsert'],'false');
});
