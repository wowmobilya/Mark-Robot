import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
const source=await readFile(new URL('../modules/platform/push/wow-push-chat.js',import.meta.url),'utf8');
function fixture(){
  const roomId=randomUUID(),messageId='6',requests=[],revoked=[];
  const doc={createElement(tag){return {tag,ownerDocument:doc,children:[],style:{},setAttribute(){},remove(){this.removed=true;},append(...nodes){this.children.push(...nodes);},replaceChildren(...nodes){this.children=nodes;}};}};
  const env={AbortController,crypto:{randomUUID},clearTimeout,setTimeout,URL:{createObjectURL:()=> 'blob:test',revokeObjectURL:v=>revoked.push(v)},WFFileCore:{downloadBlob:async()=>new Blob([],{type:'image/png'})}};
  vm.runInNewContext(source,env);
  let session={authenticated:true,userId:randomUUID(),workspaceId:randomUUID(),sessionVersion:1},fail=false;
  const api={getSession:()=>session,can:()=>true,locale:()=>'en',async request(name,data){
    requests.push([name,data]);if(fail)throw Error();
    if(name==='chat.feed')return {messages:[{id:messageId,roomId,text:'',asset:{kind:'image'}}]};
    if(name==='chat.asset')return {};return {id:'7'};
  }};
  const host=doc.createElement('li'), control=env.WFPushChat.mount(host,{kind:'chat',params:{roomId,messageId}},api);
  const [view,result,status,form]=host.children[0].children;
  return {roomId,view,result,status,form,requests,revoked,control,logout:()=>{session={};},fail:v=>{fail=v;}};
}
test('notification reply retries the same operation and waits for server confirmation',async()=>{
  const f=fixture(),field=f.form.children[0],event={preventDefault(){}};field.value='reply';f.fail(true);
  await f.form.onsubmit(event);assert.equal(field.value,'reply');assert.equal(f.status.textContent,'Could not send reply');
  f.fail(false);await f.form.onsubmit(event);assert.equal(field.value,'');assert.equal(f.status.textContent,'Reply sent');
  assert.equal(f.requests[0][1].requestId,f.requests[1][1].requestId);
  assert.equal(f.requests[1][1].roomId,f.roomId);assert.equal(f.requests[1][1].replyId,'6');
  field.value='another';f.logout();await f.form.onsubmit(event);assert.equal(f.requests.length,2);
});
test('preview obtains authorized message and attachment on demand and revokes blob URL',async()=>{
  const f=fixture();assert.equal(f.requests.length,0);await f.view.onclick();
  assert.deepEqual(f.requests.map(r=>r[0]),['chat.feed','chat.asset']);assert.equal(f.result.children.at(-1).src,'blob:test');
  f.control.dispose();assert.deepEqual(f.revoked,['blob:test']);
  const other=fixture();other.logout();await other.view.onclick();assert.equal(other.requests.length,0);
});
