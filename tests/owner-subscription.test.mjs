import test from 'node:test';
import assert from 'node:assert/strict';
import {createSupportActions} from '../supabase/functions/wow-cloud/modules/platform-support.mjs';

test('subscription overview only forwards the authenticated actor, not a supplied workspace',async()=>{
  const actor={userId:'owner',sessionId:'session'};
  const calls=[];
  const routes=createSupportActions({supportRpc(){throw Error('unexpected support call');},ownerSubscription(a){calls.push(a);return {hasSubscription:false};}});
  assert.deepEqual(await routes['subscription.overview']({actor,body:{workspaceId:'other',userId:'other',sessionId:'other'}}),{hasSubscription:false});
  assert.deepEqual(calls,[actor]);
  assert.equal(routes['subscription.set'],undefined);
  assert.equal(routes['subscription.upgrade'],undefined);
});
test('a subscription inquiry continues to use the existing support service and request id',async()=>{
  const actor={userId:'owner',sessionId:'session'},calls=[];
  const routes=createSupportActions({supportRpc(a,action,data){calls.push({a,action,data});return {caseId:'case'};}});
  const body={requestId:'request',text:'[MARK ROBOT · CUSTOM PLAN]\nMore storage',workspaceId:'other'};
  assert.deepEqual(await routes['support.create']({actor,body}),{caseId:'case'});
  assert.deepEqual(calls,[{a:actor,action:'support.create',data:{requestId:body.requestId,text:body.text}}]);
});
