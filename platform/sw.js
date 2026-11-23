'use strict';
// Only a plain, public launch gets an offline explanation. Private requests,
// recovery callbacks and database responses never enter Cache Storage.
const offlineCopy={
  ar:['إدارة الشركات','تحتاج لوحة الإدارة إلى الإنترنت. أعد الاتصال ثم أعد المحاولة.','إعادة المحاولة'],
  en:['Company administration','The admin app needs internet access. Reconnect and try again.','Try again'],
  tr:['Şirket yönetimi','Yönetim için internet gerekir. Bağlanıp yeniden deneyin.','Yeniden dene'],
  fr:['Administration des sociétés','Une connexion Internet est nécessaire. Reconnectez-vous et réessayez.','Réessayer'],
  ru:['Управление компаниями','Для управления нужен интернет. Подключитесь и повторите попытку.','Повторить']
};
self.addEventListener('install',event=>event.waitUntil(self.skipWaiting()));
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
self.addEventListener('fetch',event=>{
  const request=event.request,url=new URL(request.url),base=new URL('./',self.location.href);
  if(request.method!=='GET'||request.mode!=='navigate'||url.origin!==base.origin||
    url.search||![base.pathname,base.pathname+'index.html'].includes(url.pathname))return;
  event.respondWith(fetch(request,{cache:'no-store'}).catch(()=>{
    const lang=(request.headers.get('Accept-Language')||self.navigator.language||'ar').slice(0,2);
    const locale=Object.hasOwn(offlineCopy,lang)?lang:'ar',[title,body,retry]=offlineCopy[locale];
    const html='<!doctype html><html lang="'+locale+'" dir="'+(locale==='ar'?'rtl':'ltr')+'"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+title+'</title><style>:root{color-scheme:light dark;font:100%/1.7 system-ui}main{max-width:28rem;margin:12vh auto;padding:1.3rem;border:1px solid #7694a0;border-radius:1rem}a{display:inline-block;padding:.65rem;color:inherit}a:first-of-type{background:#30667c;color:white;border-radius:.65rem}</style><main><h1>'+title+'</h1><p>'+body+'</p><a href="./">'+retry+'</a></main></html>';
    // This public fallback can read appearance preferences without retaining account pages or responses.
    const applyPreferences='<script>(()=>{try{const lang=localStorage.getItem("wf_lang");'
      +'const copy='+JSON.stringify(offlineCopy)+';if(Object.hasOwn(copy,lang)){const [title,body,retry]=copy[lang];'
      +'document.documentElement.lang=lang;document.documentElement.dir=lang==="ar"?"rtl":"ltr";document.title=title;'
      +'document.querySelector("h1").textContent=title;document.querySelector("p").textContent=body;document.querySelector("a").textContent=retry;}'
      +'const theme=localStorage.getItem("wow.platform.theme")||localStorage.getItem("wf_theme");'
      +'if(theme==="dark"||theme==="light")document.documentElement.style.colorScheme=theme;'
      +'}catch{}})();</script>';
    return new Response(html.replace('</html>',applyPreferences+'</html>'),{headers:{'Content-Type':'text/html;charset=UTF-8','Cache-Control':'no-store','Referrer-Policy':'no-referrer'}});
  }));
});
self.addEventListener('push',event=>{
  let data;try{data=event.data?.json();}catch{return;}
  const uuid=/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
  if(data?.kind!=='owner.approval'||data.route!=='owner-approval'||!uuid.test(data.params?.workspaceId)||
    !Number.isFinite(Date.parse(data.validUntil))||Date.parse(data.validUntil)<=Date.now())return;
  const body={ar:'طلب تفعيل مالك جديد في إدارة الشركات.',en:'A company owner is waiting for approval.',tr:'Bir şirket sahibi onay bekliyor.',
    fr:'Un propriétaire attend votre approbation.',ru:'Владелец компании ожидает подтверждения.'}[data.language]||'A company owner is waiting for approval.';
  event.waitUntil(self.registration.showNotification('WOW Admin',{body,tag:'wow-owner-approval/'+data.params.workspaceId,
    icon:new URL('admin-icon-192.png',self.location.href).href,data:{workspaceId:data.params.workspaceId}}));
});
self.addEventListener('notificationclick',event=>{
  const id=event.notification.data?.workspaceId;
  if(/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(id)&&event.notification.tag==='wow-owner-approval/'+id){
    event.notification.close();
    const target=new URL('./#company/'+id+'/activation',self.location.href);
    event.waitUntil((async()=>{
      const clients=await self.clients.matchAll({type:'window'});
      const client=clients.find(c=>{const u=new URL(c.url);return u.origin===target.origin&&!u.search&&[target.pathname,target.pathname+'index.html'].includes(u.pathname);});
      if(client){try{client.postMessage({type:'wow-platform-open-owner-request',workspaceId:id});await client.focus();return;}catch{}}
      await self.clients.openWindow(target.href);
    })());return;
  }
  if(event.notification.tag!=='wow-platform-support')return;
  event.notification.close();
  event.waitUntil((async()=>{
    const target=new URL('./#support',self.location.href);
    const clients=await self.clients.matchAll({type:'window'});
    const platform=clients.find(client=>{const url=new URL(client.url);return url.origin===target.origin&&!url.search&&[target.pathname,target.pathname+'index.html'].includes(url.pathname);});
    if(platform){const focused=await platform.focus();focused.postMessage({type:'wow-platform-open-support'});return;}
    await self.clients.openWindow(target.href);
  })());
});
