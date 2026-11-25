/* WOW 241 — decorative server-login experience. This never authenticates or stores credentials. */
(() => {
  'use strict';
  const messages={
    ar:{eyebrow:'WOW · مركز التحكم',heading:'مرحباً بك في مركز السيرفر',intro:'إدارة محمية ومراقبة اتصال حقيقية، بتصميم مارك روبوت.',idle:'تهيئة واجهة السيرفر',checking:'جارٍ فحص استجابة السيرفر…',ready:'السيرفر يستجيب',unavailable:'السيرفر أبلغ عن عدم الجاهزية',unreachable:'لا يمكن الوصول إلى السيرفر',unverified:'تعذّر التحقق من حالة السيرفر',verifying:'جارٍ التحقق من بيانات الدخول…',denied:'راجع رسالة تسجيل الدخول أدناه'},
    en:{eyebrow:'WOW · CONTROL CENTER',heading:'Welcome to your server',intro:'Protected administration and real connectivity checks, powered by Mark Robot.',idle:'Preparing server interface',checking:'Checking server response…',ready:'Server responded',unavailable:'Server reported unavailable',unreachable:'Cannot reach server',unverified:'Could not verify server status',verifying:'Verifying your sign-in…',denied:'Review the sign-in message below'},
    tr:{eyebrow:'WOW · KONTROL MERKEZİ',heading:'Sunucu kontrol merkezine hoş geldiniz',intro:'Mark Robot ile korumalı yönetim ve gerçek bağlantı kontrolü.',idle:'Sunucu arayüzü hazırlanıyor',checking:'Sunucu yanıtı denetleniyor…',ready:'Sunucu yanıt verdi',unavailable:'Sunucu kullanılamıyor',unreachable:'Sunucuya ulaşılamıyor',unverified:'Sunucu durumu doğrulanamadı',verifying:'Giriş doğrulanıyor…',denied:'Aşağıdaki giriş bildirimini inceleyin'},
    fr:{eyebrow:'WOW · CENTRE DE CONTRÔLE',heading:'Bienvenue sur votre serveur',intro:'Administration protégée et état du serveur vérifié par Mark Robot.',idle:'Préparation de l’interface',checking:'Vérification du serveur…',ready:'Le serveur répond',unavailable:'Serveur indisponible',unreachable:'Serveur inaccessible',unverified:'État du serveur non vérifié',verifying:'Vérification de la connexion…',denied:'Consultez le message de connexion ci-dessous'},
    ru:{eyebrow:'WOW · ЦЕНТР УПРАВЛЕНИЯ',heading:'Добро пожаловать на сервер',intro:'Защищённое управление и настоящая проверка связи с Mark Robot.',idle:'Подготовка интерфейса',checking:'Проверка сервера…',ready:'Сервер отвечает',unavailable:'Сервер сообщил о недоступности',unreachable:'Сервер недоступен',unverified:'Статус сервера не подтверждён',verifying:'Проверка входа…',denied:'Проверьте сообщение о входе ниже'}
  };
  const node=(tag,cls,txt)=>{
    const n=document.createElement(tag);if(cls)n.className=cls;
    if(txt!=null)n.textContent=txt;return n;
  };
  // The original Mark face is drawn as features only: no image background, frame or body.
  function face(){
    const el=node('div','platform-auth-face');
    el.setAttribute('aria-hidden','true');
    const eyes=[205,395].map((x,index)=>'<g transform="translate('+x+' 147.84)">'+
      '<g class="platform-auth-brow-motion '+(index?'right':'left')+'"><path class="platform-auth-brow" d="M -31 -59 Q -4 -71 29 -61"/></g>'+
      '<g class="platform-auth-blink"><g class="platform-auth-gaze"><ellipse rx="33" ry="43"/>'+
      '<ellipse class="platform-auth-eye-glint" cx="-10" cy="-18" rx="10" ry="13"/>'+
      '<circle class="platform-auth-eye-glint" cx="13" cy="19" r="4"/></g></g></g>').join('');
    el.innerHTML='<svg viewBox="86 48 428 252" focusable="false" aria-hidden="true">'+eyes+
      '<path class="platform-auth-nose" d="M 299 183 Q 293 193 296 196 Q 300 199 305 196"/>'+
      '<path class="platform-auth-mouth" d="M 276 248 C 289 260 310 262 325 248"/></svg>';
    return el;
  }
  const poses={
    idle:'M 276 248 C 289 260 310 262 325 248',
    checking:'M 280 251 C 292 256 308 256 320 250',
    verifying:'M 280 251 C 292 256 308 256 320 250',
    ready:'M 267 244 C 286 269 314 270 333 244',
    unavailable:'M 278 254 C 291 246 308 246 322 254',
    unreachable:'M 278 254 C 291 248 309 248 322 254',
    unverified:'M 280 253 C 293 252 307 252 320 252',
    denied:'M 279 251 C 292 249 308 249 321 254'
  };
  function healthUrl(endpoint){
    if(!endpoint||typeof endpoint!=='string')return null;
    try{const u=new URL(endpoint,location.href);u.pathname=u.pathname.replace(/\/$/,'')+'/health';u.search='';u.hash='';return u.href;}
    catch{return null;}
  }
  function mount({content,form=null,language='ar',endpoint,feedback}={}){
    if(!content||content.querySelector('.platform-auth-experience'))return null;
    const msg=messages[language]||messages.ar;
    document.documentElement.classList.add('platform-auth-screen');
    const hero=node('section','platform-auth-experience');
    hero.setAttribute('aria-label',msg.eyebrow);
    const head=node('div','platform-auth-overline',msg.eyebrow),stage=node('div','platform-auth-stage');
    const orbit=node('span','platform-auth-orbit'),spark=node('span','platform-auth-ring');
    orbit.setAttribute('aria-hidden','true');spark.setAttribute('aria-hidden','true');
    const expression=face();stage.append(orbit,spark,expression);
    const copy=node('div','platform-auth-description');
    copy.append(node('h2','',msg.heading),node('p','',msg.intro));
    const stateRow=node('div','platform-auth-state'),light=node('i','platform-auth-state-light');
    const stateMessage=node('strong','',msg.idle);
    stateRow.setAttribute('role','status');stateRow.setAttribute('aria-live','polite');
    stateRow.append(light,stateMessage);
    const network=node('div','platform-auth-network'),terminal=node('span','platform-auth-terminal','>_');
    const route=node('span','platform-auth-route'),rack=node('span','platform-auth-rack');
    network.setAttribute('aria-hidden','true');
    network.dir='ltr';
    for(let tier=0;tier<3;tier++)rack.append(node('i'));
    network.append(terminal,route,rack);
    hero.append(head,stage,copy,network,stateRow);
    content.prepend(hero);
    let disposed=false,pending=false,controller=null,phase='idle';
    const mouth=expression.querySelector('.platform-auth-mouth');
    function change(next){
      if(disposed)return;
      phase=next;hero.dataset.phase=next;
      mouth.setAttribute('d',poses[next]||poses.idle);
      stateMessage.textContent=msg[next]||msg.idle;
    }
    async function check(){
      if(disposed||pending||!hero.isConnected)return;
      const url=healthUrl(endpoint);
      if(!url){change('unverified');return;}
      if(navigator.onLine===false){change('unreachable');return;}
      controller?.abort();controller=new AbortController();const current=controller;
      change('checking');
      const timeout=setTimeout(()=>current.abort(),7500);
      try{
        const response=await fetch(url,{method:'GET',cache:'no-store',credentials:'omit',redirect:'error',signal:current.signal});
        const data=await response.json().catch(()=>null);
        if(disposed||pending||controller!==current)return;
        if(data?.service!=='mark-robot')change('unverified');
        else if(response.ok&&data.ok===true)change('ready');
        else change(response.status>=500&&data.ok===false?'unavailable':'unverified');
      }catch{if(!disposed&&!pending&&controller===current)change('unreachable');}
      finally{clearTimeout(timeout);}
    }
    const observer=new MutationObserver(()=>{
      if(disposed||!hero.isConnected)return;
      const working=form?.querySelector('button[type="submit"]')?.disabled===true;
      if(working){
        if(!pending){pending=true;controller?.abort();}
        change('verifying');
      }else if(pending){
        pending=false;
        const error=(feedback?.textContent||'').trim();
        if(error)change('denied');
        else void check();
      }
      else if(feedback?.textContent?.trim()&&phase!=='denied')change('denied');
    });
    if(form)observer.observe(form,{attributes:true,subtree:true,attributeFilter:['disabled','aria-busy']});
    if(feedback)observer.observe(feedback,{childList:true,characterData:true,subtree:true});
    const online=()=>{if(!pending)void check();},offline=()=>{controller?.abort();change('unreachable');};
    window.addEventListener('online',online);window.addEventListener('offline',offline);
    void check();
    return {setPhase:change,dispose(){
      disposed=true;controller?.abort();observer.disconnect();
      window.removeEventListener('online',online);window.removeEventListener('offline',offline);
      hero.remove();
      document.documentElement.classList.remove('platform-auth-screen');
    }};
  }
  window.WFPlatformLoginExperience=Object.freeze({mount});
})();
