import assert from 'node:assert/strict';
import test from 'node:test';
import {createPlatformActions} from '../supabase/functions/wow-cloud/modules/platform-companies.mjs';
import {createRestDependencies} from '../supabase/functions/wow-cloud/rest.mjs';

const workspaceId='00000000-0000-4000-8000-000000000011';
const other='00000000-0000-4000-8000-000000000012';
const action='platform.company.deleteEmpty';
const body={workspaceId,expectedRevision:7,confirmed:true,confirmName:'Test company',confirmWord1:'حذف'};

test('an empty deletion forwards the single confirmation; linked deletion requires two words',async()=>{
  const calls=[];
  const handlers=createPlatformActions({platformRpc:async(_actor,_action,data)=>{
    calls.push(data);
    return {deleted:true,workspaceId};
  }});
  await handlers[action]({actor:{},body});
  assert.equal(calls[0].acceptsLinkedData,false);
  await assert.rejects(handlers[action]({actor:{},body:{...body,acceptsLinkedData:true}}),{code:'CONFIRMATION_REQUIRED'});
  assert.equal(calls.length,1);
});

test('only server-returned paths scoped to the confirmed workspace reach physical storage',async()=>{
  const path=workspaceId+'/legacy/logo.png';
  const deleted=[];
  const remote=createRestDependencies({url:'https://example.invalid',serviceKey:'test',fetch:async(url,options)=>{
    assert.equal(url,'https://example.invalid/storage/v1/object/mark-robot-private');
    assert.equal(options.method,'DELETE');
    const {prefixes}=JSON.parse(options.body);
    deleted.push(...prefixes);
    return Response.json(prefixes.map(name=>({name})));
  }});
  let pendingPath=path;
  let calls=0;
  const handlers=createPlatformActions({storage:remote.storage,platformRpc:async()=>{
    calls++;
    return calls===1?{deleted:false,workspaceId,pendingStorage:[{bucket:'mark-robot-private',path:pendingPath}]}:{deleted:true,workspaceId};
  }});
  const input={actor:{},body:{...body,acceptsLinkedData:true,confirmWord2:'حذف'}};
  assert.deepEqual(await handlers[action](input),{deleted:true,workspaceId});
  assert.deepEqual(deleted,[path]);
  for(const bad of [other+'/legacy/logo.png','chat/'+other+'/a/b',workspaceId+'/../outside']){
    pendingPath=bad;calls=0;
    await assert.rejects(handlers[action](input),{code:'INVALID_STORAGE_PATH'});
    assert.equal(calls,1);
  }
  assert.deepEqual(deleted,[path]);
});
