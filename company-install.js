(() => {
  'use strict';
  const url=new URL(location.href),inInvitation=url.pathname.endsWith('/platform/')||url.pathname.endsWith('/platform/index.html');
  const workspace=inInvitation?url.searchParams.get('setup'):url.searchParams.get('wf-cloud')==='employee'?url.searchParams.get('workspace'):null;
  if(!/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(workspace||''))return;
  const entry=new URL('/',url.origin);
  entry.searchParams.set('wf-cloud','employee');entry.searchParams.set('workspace',workspace);
  const manifest=new URL(window.WOW_CLOUD_CONFIG.endpoint+'/company.webmanifest');
  manifest.searchParams.set('site',url.origin);manifest.searchParams.set('workspace',workspace);
  const previous=document.querySelector('link[rel~="manifest"]'),link=document.createElement('link');
  link.rel='manifest';link.crossOrigin='anonymous';link.href=manifest.href;
  if(previous)previous.replaceWith(link);else document.head.append(link);
  const icon=document.querySelector('link[rel~="apple-touch-icon"]'),title=document.querySelector('meta[name="apple-mobile-web-app-title"]');
  if(icon)icon.href=new URL('/apple-touch-icon.png',url.origin).href;
  if(title)title.content='Mark Robot';
  window.WFCompanyInstall=Object.freeze({manifest:manifest.href,entry:entry.href});
})();
