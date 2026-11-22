import test from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes,randomUUID} from 'node:crypto';
import {createChatActions,turnConfiguration} from '../supabase/functions/wow-cloud/modules/chat.mjs';

test('only an active joined caller receives transient Cloudflare relay credentials',async()=>{
  const actor={userId:randomUUID(),sessionId:randomUUID()},body={callId:randomUUID()};
  const voiceTurn={cloudflareKeyId:randomBytes(16).toString('hex'),cloudflareToken:randomBytes(32).toString('hex')};
  let invited=true,requests=0;
  const moduleRpc=async()=>({status:'active',participants:[{id:actor.userId,status:invited?'invited':'joined'}]});
  const relayUrls=['turn:turn.cloudflare.com:3478?transport=udp','turns:turn.cloudflare.com:443?transport=tcp'];
  const fetchImpl=async(url,options)=>{
    requests++;
    assert.equal(url,'https://rtc.live.cloudflare.com/v1/turn/keys/'+voiceTurn.cloudflareKeyId+'/credentials/generate-ice-servers');
    assert.equal(options.headers.Authorization,'Bearer '+voiceTurn.cloudflareToken);
    assert.equal(options.redirect,'error');
    assert.equal(JSON.parse(options.body).ttl,7200);
    return Response.json({iceServers:[{urls:['stun:stun.cloudflare.com:3478']},
      {urls:[...relayUrls,'turn:turn.cloudflare.com:53?transport=udp'],username:'session-user',credential:'session-secret'}]});
  };
  const relayEnabled=async()=>true;
  const ice=createChatActions({moduleRpc,storage:{},voiceTurn,fetchImpl,relayEnabled})['chat.call.ice'];
  assert.equal(turnConfiguration(voiceTurn).configured,true);
  await assert.rejects(ice({actor,body}));
  assert.equal(requests,0);
  invited=false;
  const off=createChatActions({moduleRpc,storage:{},voiceTurn,fetchImpl})['chat.call.ice'];
  assert.equal((await off({actor,body})).relayReady,false);
  assert.equal(requests,0);
  const result=await ice({actor,body});
  assert.equal(requests,1);
  assert.equal(result.relayReady,true);
  assert.deepEqual(result.iceServers[1],{urls:relayUrls,username:'session-user',credential:'session-secret'});
  assert.ok(!JSON.stringify(result).includes(voiceTurn.cloudflareToken));
  for(const fetchImpl of [async()=>new Response(null,{status:403}),async()=>{throw Error('timeout');},async()=>Response.json({})]){
    const fallback=await createChatActions({moduleRpc,storage:{},voiceTurn,fetchImpl,relayEnabled})['chat.call.ice']({actor,body});
    assert.equal(fallback.relayReady,false);
    assert.equal(fallback.iceServers.length,1);
    assert.equal(fallback.expiresIn,0);
  }
});
