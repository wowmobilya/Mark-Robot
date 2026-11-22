'use strict';
const assert=require('node:assert/strict');
const path=require('node:path');
const fs=require('node:fs');
const {chromium}=require('playwright');

(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,
   args:['--no-sandbox','--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream','--autoplay-policy=no-user-gesture-required']});
 try{
   const page=await browser.newPage();
   const origin='http://localhost:18789';
   const manager=fs.readFileSync(path.resolve(__dirname,'../modules/chat/call-manager.js'),'utf8');
   await page.route(origin+'/**',route=>{
     const url=new URL(route.request().url());
     if(url.pathname==='/manager.js')return route.fulfill({contentType:'text/javascript',body:manager});
     return route.fulfill({contentType:'text/html',body:url.pathname==='/'?
       '<iframe name="caller" src="/caller"></iframe><iframe name="callee" src="/callee"></iframe>':'<script src="/manager.js"></script>'});
   });
   await page.goto(origin);
   // Only the signaling transport and authorized server responses are simulated.
   // Media capture, codec negotiation, DTLS/ICE, tracks and RTP stats are native Chromium.
   await page.evaluate(()=>{
     const topics=new Map(),ids=[crypto.randomUUID(),crypto.randomUUID()],room=crypto.randomUUID();
     let current=null;
     window.setup=(peer,index)=>{
       const me=ids[index],newId=()=>crypto.randomUUID();
       peer.received=[];peer.errors=[];peer.connections=[];
       const Native=peer.RTCPeerConnection;
       peer.RTCPeerConnection=class extends Native{constructor(config){super(config);peer.connections.push(this);}};
       peer.WFCallRealtime={create({topic,onBroadcast,onPresence}){
         let listeners=topics.get(topic);
         if(!listeners){listeners=new Map();topics.set(topic,listeners);}
         const presence=()=>[...listeners.keys()].map(key=>({key}));
         const notify=()=>{for(const subscriber of listeners.values())setTimeout(()=>subscriber.onPresence(presence()),0);};
         return {
           connect:async()=>{listeners.set(me,{onBroadcast,onPresence});notify();},
           isConnected:()=>listeners.has(me),presence,
           broadcast:async payload=>{for(const [uid,s] of listeners)if(uid!==me)setTimeout(()=>s.onBroadcast(structuredClone(payload)),0);},
           stop:()=>{listeners.delete(me);notify();}
         };
       }};
       const api={getSession:()=>({userId:me,authenticated:true}),realtimeCredentials:async()=>({}),
         async request(name,data){
           switch(name.slice('chat.call.'.length)){
             case 'start':current={id:newId(),roomId:room,callerId:me,kind:data.kind,status:'ringing',
               participants:ids.map(id=>({id,status:id===me?'joined':'invited'}))};break;
             case 'accept':current.status='active';current.participants.find(p=>p.id===me).status='joined';break;
             case 'inbox':return {calls:current?.status==='ringing'?[{...structuredClone(current),participantStatus:'invited'}]:[]};
             case 'end':case 'leave':current.status='completed';break;
             case 'history':return {history:[]};
             case 'ice':return {iceServers:[]};
             case 'status':case 'connected':case 'heartbeat':break;
             default:throw Error('Unexpected call action');
           }
           return structuredClone(current);
         }};
       peer.manager=peer.WFCallManager.create({api,onRemote:(id,stream)=>{if(stream)peer.received.push(stream);},
         onError:error=>peer.errors.push(error)});
       peer.room={id:room};
     };
     setup(frames.caller,0);setup(frames.callee,1);
   });
   const a=page.frame({name:'caller'}),b=page.frame({name:'callee'});
   await Promise.all([a,b].map(f=>f.evaluate(()=>manager.selectRoom(room))));
   for(const mode of ['audio','video']){
     await a.evaluate(kind=>manager.start(room,kind),mode);
     await b.waitForFunction(()=>manager.getState().call?.status==='ringing');
     await b.evaluate(()=>manager.accept());
     for(const f of [a,b]){
       await f.waitForFunction(async kind=>{
         const pc=connections.at(-1);
         if(pc?.connectionState!=='connected')return false;
         const stats=Array.from((await pc.getStats()).values()).filter(s=>s.type==='inbound-rtp'&&s.packetsReceived>0);
         return stats.some(s=>s.kind==='audio')&&(kind==='audio'||stats.some(s=>s.kind==='video'&&s.framesDecoded>0));
       },mode,{timeout:15000});
       assert.equal(await f.evaluate(()=>manager.micToggle()),false);
       assert.equal(await f.evaluate(()=>manager.getState().localStream.getAudioTracks()[0].enabled),false);
       await f.evaluate(()=>manager.micToggle());
     }
     if(mode==='video'){
       assert.equal(await a.evaluate(()=>manager.cameraToggle()),false);
       assert.equal(await a.evaluate(()=>manager.cameraToggle()),true);
     }
     const tracks=await a.evaluateHandle(()=>manager.getState().localStream.getTracks());
     await a.evaluate(()=>manager.finish());
     await b.waitForFunction(()=>!manager.getState().call);
     assert.equal(await tracks.evaluate(list=>list.every(t=>t.readyState==='ended')),true);
     await tracks.dispose();
     for(const f of [a,b])assert.equal(await f.evaluate(()=>connections.at(-1).connectionState),'closed');
     console.log(mode+': native RTP exchanged by both peers; hangup released tracks.');
   }
   for(const f of [a,b])assert.deepEqual(await f.evaluate(()=>errors),[]);
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
