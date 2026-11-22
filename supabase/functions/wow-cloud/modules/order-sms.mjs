import {failure} from '../core.mjs';
const uuid=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
const locales=['ar','en','tr','fr','ru'];
const copy={ar:['الطلب','الصنف','الكمية','سعر الوحدة'],en:['Order','Item','Quantity','Unit price'],tr:['Sipariş','Ürün','Adet','Birim fiyat'],fr:['Commande','Article','Quantité','Prix unitaire'],ru:['Заказ','Товар','Количество','Цена за единицу']};
const esc=x=>String(x??'').replace(/[&<>"']/g,k=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[k]));
function printable(order,lang){
 const [title,item,quantity,price]=copy[lang];
 const rows=order.lines.map(l=>'<tr><td>'+esc(l.name)+'</td><td>'+esc(l.quantity)+'</td><td>'+
  (l.price==null?'':esc(new Intl.NumberFormat(lang,{style:'currency',currency:l.currency}).format(l.price/100)))+'</td></tr>').join('');
 return '<!doctype html><html lang="'+lang+'" dir="'+(lang==='ar'?'rtl':'ltr')+'"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+esc(title)+'</title><style>body{font:16px system-ui,sans-serif;margin:5%;color:#172c29}table{border-collapse:collapse;width:100%}th,td{text-align:start;padding:.65em;border-bottom:1px solid #aaa}</style><main><p>'+esc(order.company)+'</p><h1>'+esc(title)+' '+esc(order.number)+'</h1><time>'+esc(String(order.created).slice(0,10))+'</time><table><thead><tr><th>'+item+'</th><th>'+quantity+'</th><th>'+price+'</th></tr></thead><tbody>'+rows+'</tbody></table></main></html>';
}
export function createOrderSms({moduleRpc,config={},fetch:call=globalThis.fetch}){
 let tenants={};try{tenants=JSON.parse(config.tenants||'{}')||{};}catch{}
 const configured=w=>{const c=tenants[w];return config.enabled&&config.signingKey?.length>=32&&config.projectUrl?.startsWith('https://')&&c&&
  typeof c.username==='string'&&c.username&&typeof c.password==='string'&&c.password&&Array.isArray(c.senders)&&c.senders.length&&c.senders.every(s=>typeof s==='string'&&/^[\p{L}0-9 .-]{3,11}$/u.test(s))?c:null;};
 const rpc=(action,data)=>moduleRpc('wow_order_sms',action,data);
 const signatureKey=()=>crypto.subtle.importKey('raw',new TextEncoder().encode(config.signingKey),{name:'HMAC',hash:'SHA-256'},false,['sign','verify']);
 const bytes=(id,lang)=>new TextEncoder().encode('wow-order-download:v1:'+id+':'+lang);
 async function provider(c,path,body){
  const auth=btoa(c.username+':'+c.password);
  const r=await call('https://api.netgsm.com.tr/sms/rest/v2/'+path,{method:body?'POST':'GET',redirect:'error',cache:'no-store',signal:AbortSignal.timeout(12000),headers:{Authorization:'Basic '+auth,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
  if(!r.ok)throw failure('PROVIDER_UNAVAILABLE',503);return r.json();
 }
 const preview=async({actor,body})=>{if(!uuid.test(body.orderId))throw failure('INVALID_ORDER',422);
  return rpc('preview',{userId:actor.userId,sessionId:actor.sessionId,orderId:body.orderId});};
 const actions={
  'orderSms.preview':async input=>{const {workspace,...rest}=await preview(input),c=configured(workspace);return {...rest,configured:!!c,senders:c?.senders||[],sender:c?.senders[0]||null};},
  'orderSms.send':async input=>{
   const {actor,body}=input,{workspace}=await preview(input),c=configured(workspace);
   if(!c)throw failure('PROVIDER_NOT_CONFIGURED',503);
   const id=body.commandId,sender=body.sender??c.senders[0],lang=body.language??'tr';
   if(body.consent!==true||!uuid.test(id)||!Number.isSafeInteger(body.version)||!c.senders.includes(sender)||!locales.includes(lang))throw failure('INVALID_ORDER_SMS',422);
   let headers;try{headers=await provider(c,'msgheader');}catch{throw failure('PROVIDER_UNAVAILABLE',503);}
   if(headers?.code!=='00'||!Array.isArray(headers.msgheaders)||!headers.msgheaders.includes(sender))throw failure('PROVIDER_NOT_CONFIGURED',503);
   const raw=new Uint8Array(await crypto.subtle.sign('HMAC',await signatureKey(),bytes(id,lang)));
   const signature=Array.from(raw,n=>n.toString(16).padStart(2,'0')).join('');
   const link=new URL('/functions/v1/wow-cloud/order-download/'+id+'/'+lang+'/'+signature,config.projectUrl).href;
   const job=await rpc('reserve',{userId:actor.userId,sessionId:actor.sessionId,workspace,orderId:body.orderId,version:body.version,id,sender,language:lang,consent:true});
   if(!job.claimed)return {status:job.status};
   let status='uncertain';
   try{
    const res=await provider(c,'send',{msgheader:sender,encoding:'UTF-8',messages:[{no:job.destination.replace(/^\+90(?=\d{10}$)/,'').replace(/^\+/, '00'),msg:copy[lang][0]+': '+link}]});
    if(res.code==='00'&&res.jobid)status='accepted';else if(typeof res.code==='string'&&res.code!=='00'&&!['100','101'].includes(res.code))status='failed';
   }catch{}
   await rpc('finish',{id,status});return {status};
  }
 };
 async function download(req){
  const headers={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','X-Robots-Tag':'noindex','Content-Security-Policy':"sandbox; default-src 'none'; style-src 'unsafe-inline'; frame-ancestors 'none'"};
  const miss=()=>new Response(null,{status:404,headers});if(req.method!=='GET'||config.signingKey?.length<32||!config.signingKey)return miss();
  const [id,lang,sig]=new URL(req.url).pathname.split('/').slice(-3);if(!uuid.test(id)||!locales.includes(lang)||!/^[0-9a-f]{64}$/.test(sig))return miss();
  if(!await crypto.subtle.verify('HMAC',await signatureKey(),Uint8Array.from(sig.match(/../g),s=>parseInt(s,16)),bytes(id,lang)))return miss();
  const result=await rpc('download',{id});if(!result)return miss();
  return new Response(printable(result,lang),{headers:{...headers,'Content-Type':'text/html; charset=utf-8','Content-Disposition':'attachment; filename="order.html"'}});
 }
 return {actions,download,configured:Object.keys(tenants).some(w=>uuid.test(w)&&!!configured(w))};
}
