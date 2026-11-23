import {failure} from '../core.mjs';

const uuid=/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
const digest=/^[0-9a-f]{64}$/;
const categories=new Set(['general','maintenance','update','security','subscription','service']);

function validText(value,min,max){
  if(typeof value!=='string'||/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f\u202a-\u202e\u2066-\u2069]/.test(value))return false;
  const size=Array.from(value.trim()).length;
  return size>=min&&size<=max;
}

export function createAnnouncementActions({announcementRpc}){
  function draft(body){
    if(!validText(body.title,1,120)||/[\r\n]/.test(body.title)||!validText(body.text,1,2500)||
      !categories.has(body.category)||typeof body.push!=='boolean'||
      (body.workspaceId!=null&&(typeof body.workspaceId!=='string'||!uuid.test(body.workspaceId)))){
      throw failure('INVALID_ANNOUNCEMENT',422);
    }
    return {title:body.title.trim(),text:body.text.trim(),category:body.category,push:body.push,workspaceId:body.workspaceId??null};
  }
  function id(value){
    if(typeof value!=='string'||!uuid.test(value))throw failure('INVALID_REQUEST',422);
    return value;
  }
  return {
    'platform.announcement.preview':({actor,body})=>announcementRpc(actor,'preview',{...draft(body),requestId:id(body.requestId)}),
    'platform.announcement.send':({actor,body})=>{
      if(typeof body.confirmation!=='string'||!digest.test(body.confirmation))throw failure('INVALID_CONFIRMATION',422);
      return announcementRpc(actor,'send',{...draft(body),requestId:id(body.requestId),confirmation:body.confirmation});
    },
    'announcement.inbox':({actor,body})=>announcementRpc(actor,'inbox',{cursor:body.cursor==null?null:id(body.cursor)}),
    'announcement.read':({actor,body})=>announcementRpc(actor,'read',{id:id(body.id)})
  };
}
