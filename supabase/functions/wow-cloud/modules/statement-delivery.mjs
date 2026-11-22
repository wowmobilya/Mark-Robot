import {failure} from '../core.mjs';
import {validMailAddress} from './mail-provider.mjs';

export function createStatementDelivery({moduleRpc,statementWorker,config={},fetch:send=globalThis.fetch}){
  const {emailKey,emailFrom,emailWorkspace,waToken,waPhone,waVersion,waTemplate,waLocale,waWorkspace}=config;
  const email=!!(config.emailEnabled&&emailKey&&validMailAddress(emailFrom)&&emailWorkspace);
  const whatsapp=!!(config.waEnabled&&waToken&&/^\d+$/.test(waPhone)&&/^v\d+\.\d+$/.test(waVersion)&&/^[a-z0-9_]+$/.test(waTemplate)&&/^[a-z]{2}(?:_[A-Z]{2})?$/.test(waLocale)&&waWorkspace);
  const permit=(channel,w)=>channel==='email'?email&&w===emailWorkspace:whatsapp&&w===waWorkspace;
  const actions={};
  for(const action of ['statement.list','statement.schedule','statement.cancel']){
    actions[action]=async({body,actor})=>{
      const data={companyId:body.companyId,userId:actor.userId,sessionId:actor.sessionId,id:body.id};
      if(action==='statement.schedule'){
        if(!['email','whatsapp'].includes(body.channel)||!permit(body.channel,body.workspaceId))throw failure('PROVIDER_NOT_CONFIGURED',503);
        if(typeof body.label!=='string'||/[\r\n]/.test(body.label)||typeof body.pdf!=='string'||body.pdf.length>2796204)throw failure('INVALID_STATEMENT',422);
        Object.assign(data,{expectedWorkspace:body.workspaceId,consent:body.consent===true,channel:body.channel,destination:body.destination,pdf:body.pdf,label:body.label,zone:body.zone,scheduledAt:body.scheduledAt});
      }
      const result=await moduleRpc('wow_statement_service',action,data);
      if(action==='statement.list')result.providers={email:permit('email',result.workspaceId),whatsapp:permit('whatsapp',result.workspaceId)};
      return result;
    };
  }
  async function post(url,options){
    const result=await send(url,{...options,method:'POST',redirect:'error',cache:'no-store',signal:AbortSignal.timeout(18000)});
    if(!result.ok)throw Object.assign(Error('PROVIDER_ERROR'),{definitive:result.status>=400&&result.status<500});
    return result.json();
  }
  async function process(){
    const channels=[...(email?['email']:[]),...(whatsapp?['whatsapp']:[])];
    const job=await statementWorker('claim',{channels});
    if(!job?.id)return;
    let status='uncertain',receipt;
    try{
      if(!permit(job.channel,job.workspace))throw Object.assign(Error(),{definitive:true});
      if(job.channel==='email'){
        const result=await post('https://api.resend.com/emails',{headers:{Authorization:'Bearer '+emailKey,'Content-Type':'application/json','Idempotency-Key':'statement/'+job.id},body:JSON.stringify({from:emailFrom,to:[job.destination],subject:job.label,text:job.label,attachments:[{filename:'statement.pdf',content:job.pdf}]})});
        receipt=result.id;
      }else{
        const base='https://graph.facebook.com/'+waVersion+'/'+waPhone,headers={Authorization:'Bearer '+waToken};
        const data=new FormData();data.set('messaging_product','whatsapp');data.set('type','application/pdf');
        data.set('file',new Blob([Uint8Array.from(atob(job.pdf),c=>c.charCodeAt(0))],{type:'application/pdf'}),'statement.pdf');
        const media=await post(base+'/media',{headers,body:data});
        if(typeof media.id!=='string'||!/^\d+$/.test(media.id))throw Error();
        const result=await post(base+'/messages',{headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify({messaging_product:'whatsapp',to:job.destination,type:'template',template:{name:waTemplate,language:{code:waLocale},components:[{type:'header',parameters:[{type:'document',document:{id:media.id,filename:'statement.pdf'}}]}]}})});
        receipt=result.messages?.[0]?.id;
      }
      if(typeof receipt==='string'&&receipt.length)status='accepted';
    }catch(error){status=error?.definitive?'failed':'uncertain';}
    await statementWorker('finish',{id:job.id,status,receipt});
  }
  return {actions,process,configured:{email,whatsapp}};
}
