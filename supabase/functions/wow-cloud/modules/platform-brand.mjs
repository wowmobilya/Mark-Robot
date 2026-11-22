import {failure,sha256} from '../core.mjs';

const uuid=/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i;
function png(value){
  if(typeof value!=='string'||value.length>262144||!value.startsWith('iVBORw0KGgo')||!/^[A-Za-z0-9+/]+={0,2}$/.test(value))throw failure('INVALID_MEDIA',422);
  let bytes;try{bytes=Uint8Array.from(atob(value),c=>c.charCodeAt(0));}catch{throw failure('INVALID_MEDIA',422);}
  if(bytes.length<45||bytes.length>196608)throw failure('INVALID_MEDIA',422);
  const view=new DataView(bytes.buffer),width=view.getUint32(16),height=view.getUint32(20);
  if(view.getUint32(8)!==13||view.getUint32(12)!==0x49484452||!width||!height||Math.max(width,height)>512||
    view.getUint32(bytes.length-12)!==0||view.getUint32(bytes.length-8)!==0x49454e44)throw failure('INVALID_MEDIA',422);
  return bytes;
}

export function createBrandActions({brandRpc,storage}){
  return {
    'platform.company.brand':async({actor,body})=>{
      if(!uuid.test(body.workspaceId))throw failure('INVALID_COMPANY',422);
      const info=await brandRpc(actor,'read',{workspaceId:body.workspaceId});
      if(info.storagePath){
        if(!new RegExp('^'+body.workspaceId+'/[a-f0-9]{64}/[a-f0-9]{64}\\.(png|jpg|jpeg|webp|gif|avif)$','i').test(info.storagePath))throw failure('INVALID_MEDIA',422);
        return {revision:info.revision,url:await storage.sign(info.storagePath,120)};
      }
      return {revision:info.revision,...info.builtin?{builtin:true}:info.image?{image:info.image}:{}};
    },
    'platform.company.setBrand':async({actor,body})=>{
      if(!uuid.test(body.workspaceId)||!Number.isSafeInteger(body.revision)||body.revision<0)throw failure('INVALID_REQUEST',422);
      const bytes=png(body.png),hash=await sha256(bytes),id='brand-'+hash;
      const storagePath=body.workspaceId+'/'+await sha256(JSON.stringify(id))+'/'+hash+'.png';
      const data={workspaceId:body.workspaceId,revision:body.revision,record:{id,storagePath,size:bytes.length}};
      const staged=await brandRpc(actor,'stage',data);if(staged.unchanged)return staged;
      await storage.put(storagePath,bytes,'image/png');
      return brandRpc(actor,'commit',data);
    }
  };
}
