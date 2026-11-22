import {failure} from '../core.mjs';

const maxBytes=192*1024;

function privateJpeg(photo){
  const invalid=()=>{throw failure('INVALID_PHOTO',422);};
  if(photo?.mime!=='image/jpeg'||typeof photo.base64!=='string'||photo.base64.length>maxBytes*4/3||
    !/^[A-Za-z0-9+/]+={0,2}$/.test(photo.base64))invalid();
  let data;
  try{data=atob(photo.base64);}catch{invalid();}
  const byte=i=>data.charCodeAt(i),word=i=>(byte(i)<<8)|byte(i+1);
  if(data.length>maxBytes||word(0)!==0xffd8)invalid();
  let i=2,frame=false,scan=false;
  const parts=[data.slice(0,2)];
  while(i<data.length){
    const start=i;
    if(byte(i++)!==255)invalid();
    while(byte(i)===255)i++;
    const marker=byte(i++);
    if(marker===217){
      if(!frame||!scan||i!==data.length)invalid();
      parts.push(data.slice(start,i));
      return {mime:'image/jpeg',base64:btoa(parts.join(''))};
    }
    const length=word(i),end=i+length;
    if(length<2||end>data.length||!(marker>=192&&marker<=254)||marker>=208&&marker<=216)invalid();
    if([192,193,194].includes(marker)){
      const height=word(i+3),width=word(i+5),components=byte(i+7);
      if(frame||length!==8+3*components||![1,3,4].includes(components)||width<1||height<1||
         width>4096||height>4096||width*height>6000000)invalid();
      frame=true;
    }
    // APP and COM markers may carry GPS, previews or free-form metadata.
    if(!(marker>=224&&marker<=239)&&marker!==254)parts.push(data.slice(start,end));
    i=end;
    if(marker===218){
      if(!frame||length<6)invalid();
      const scanStart=i;
      while(i<data.length){
        if(byte(i)!==255){i++;continue;}
        let j=i+1;while(byte(j)===255)j++;
        if(byte(j)===0||byte(j)>=208&&byte(j)<=215){i=j+1;continue;}
        break;
      }
      if(i===scanStart)invalid();
      parts.push(data.slice(scanStart,i));scan=true;
    }
  }
  invalid();
}

export function createSupportActions({supportRpc}){
  const handlers={};
  for(const action of ['support.list','support.create','support.open','support.reply','platform.support.list','platform.support.open','platform.support.reply']){
    handlers[action]=({actor,body})=>{
      const data={};
      for(const key of ['caseId','requestId','text','cursor'])if(body[key]!=null)data[key]=body[key];
      if(action==='support.create'&&body.photo!=null)data.photo=privateJpeg(body.photo);
      return supportRpc(actor,action,data);
    };
  }
  return handlers;
}
