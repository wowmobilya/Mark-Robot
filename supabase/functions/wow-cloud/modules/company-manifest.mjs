// Public install metadata. A workspace UUID is a login context, never authorization.
export function companyManifest(request,allowedOrigins){
  const url=new URL(request.url),workspace=url.searchParams.get('workspace'),site=url.searchParams.get('site');
  const headers={'Access-Control-Allow-Origin':'*','Content-Type':'application/manifest+json; charset=utf-8','Cache-Control':'public, max-age=300'};
  if(request.method!=='GET'&&request.method!=='HEAD')return new Response(null,{status:405,headers:{Allow:'GET, HEAD'}});
  if(!/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(workspace||'')||!allowedOrigins.includes(site))return new Response(null,{status:400,headers});
  const start=new URL('/',site);start.searchParams.set('wf-cloud','employee');start.searchParams.set('workspace',workspace.toLowerCase());
  const icons=[['app-icon-192.png','192x192','any'],['app-icon-512.png','512x512','any'],['app-icon-maskable-512.png','512x512','maskable']].map(([file,sizes,purpose])=>({src:new URL(file,site).href,sizes,purpose,type:'image/png'}));
  return new Response(request.method==='HEAD'?null:JSON.stringify({id:start.href,start_url:start.href,scope:new URL('/',site).href,
    name:'Mark Robot',short_name:'Mark Robot',display:'standalone',background_color:'#f3f7fa',theme_color:'#153847',icons}),{headers});
}
