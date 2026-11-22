const {test}=require('node:test'),assert=require('node:assert/strict');
const {readFileSync}=require('node:fs'),path=require('node:path'),vm=require('node:vm'),{randomUUID}=require('node:crypto');
const source=readFileSync(path.join(__dirname,'../modules/platform/cloud/wow-cloud-client.js'),'utf8');
function harness(){
 const calls=[],storage=new Map(),listeners=[],userId=randomUUID(),workspaceId=randomUUID();
 let now=Date.now(),validRefresh='',version=1,role='sales',revoke=false;
 const locks=new Map(),lock={request(key,callback){const next=(locks.get(key)||Promise.resolve()).catch(()=>{}).then(callback);locks.set(key,next);return next;}};
 const config={enabled:true,endpoint:'https://wow.test/api',publishableKey:'fixture',workspaceId};
 const provider=async(url,options)=>{
   const body=JSON.parse(options.body);calls.push(body.action);
   if(body.action==='auth.refresh'&&(revoke||validRefresh!==body.refreshToken))return Response.json({ok:false,error:{code:'SESSION_REVOKED'}},{status:401});
   const account={id:userId,name:'Fixture',status:'active',role,sessionVersion:version,permissions:['chat.view']};
   const reply={ok:true,workspaceId,identity:{currentAccount:account,accounts:[account],audit:[]}};
   if(body.action==='auth.refresh'||body.action==='auth.signIn'){
     validRefresh=randomUUID();reply.session={access_token:'access-'+randomUUID(),refresh_token:validRefresh,expires_at:Math.floor(now/1000)+3600};
   }return Response.json(reply);
 };
 const getKey=()=>[...storage.keys()].find(k=>k.startsWith('wf_wow_member_v1'));
 function tab({online=true,workspace=workspaceId,installed=false}={}){
   const localStorage={getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)};
   const window={location:{search:installed?'':'?wf-cloud=employee&workspace='+workspace},navigator:{onLine:online,locks:lock},crypto:{randomUUID},
     localStorage,sessionStorage:{getItem:()=>null,removeItem(){}},addEventListener(name,fn){if(name==='storage')listeners.push(fn);}};
   const ctx=vm.createContext({window,module:{exports:{}},URL,URLSearchParams,setTimeout,clearTimeout,AbortController});
   vm.runInContext(source,ctx);
   return ctx.module.exports.create({config,...installed?{}:{mode:'remote'},fetch:provider,now:()=>now});
 }
 return {tab,calls,storage,getKey,advance:ms=>{now+=ms;},trigger:()=>listeners.forEach(fn=>fn({key:getKey()||null})),
   version:()=>version++,switchRole:()=>{role='owner';},revoke:()=>{revoke=true;}};
}
const signIn=(client,rememberDevice=true)=>client.signIn({username:'fixture',password:'temporary test password',rememberDevice});
test('employee remembers only a rotating session and preserves absolute/idle clocks across tabs',async()=>{
 const h=harness(),a=h.tab();await signIn(a,false);assert(!h.getKey());
 await signIn(a);const initial=JSON.parse(h.storage.get(h.getKey()));
 for(const secret of ['temporary test password','access-','chat.view'])assert(!JSON.stringify(initial).includes(secret));
 h.advance(25*60000);const b=h.tab({installed:true});await b.ready;assert(b.getSnapshot().authenticated);
 const next=JSON.parse(h.storage.get(h.getKey()));assert.notEqual(next.refreshToken,initial.refreshToken);
 assert.equal(next.active,initial.active);assert.equal(next.started,initial.started);assert(!h.calls.includes('session.touch'));
 h.advance(5*60000);const c=h.tab();await c.ready;assert.equal(c.getSnapshot().authenticated,false);assert(!h.getKey());
});
test('server acknowledged work advances idle only and explicit logout fences other tabs',async()=>{
 const h=harness(),a=h.tab();await signIn(a);const original=JSON.parse(h.storage.get(h.getKey()));
 for(let i=0;i<15;i++){h.advance(29*60000);assert(a.touch());await a.refresh();}
 const b=h.tab();await b.ready;assert(b.getSnapshot().authenticated);
 const saved=JSON.parse(h.storage.get(h.getKey()));assert.equal(saved.started,original.started);assert(saved.active>original.active);
 h.advance(29*60000);assert(b.touch());await b.refresh();h.advance(16*60000);assert.equal(b.getSnapshot().authenticated,false);
 await signIn(a);const c=h.tab();await c.ready;assert(c.getSnapshot().authenticated);
 await a.signOut();h.trigger();assert(!c.getSnapshot().authenticated&&!h.getKey());
});
test('employee restore requires live verification, exact workspace, role and session epoch',async()=>{
 for(const fail of ['offline','role','version','revocation','scope']){
   const h=harness(),a=h.tab();await signIn(a);
   if(fail==='role')h.switchRole();if(fail==='version')h.version();if(fail==='revocation')h.revoke();
   const calls=h.calls.length,b=h.tab({online:fail!=='offline',...(fail==='scope'?{workspace:randomUUID()}:{})});await b.ready;
   assert.equal(b.getSnapshot().authenticated,false);
   if(['offline','scope'].includes(fail)){assert.equal(h.calls.length,calls);assert(h.getKey());}else assert(!h.getKey());
 }
});

