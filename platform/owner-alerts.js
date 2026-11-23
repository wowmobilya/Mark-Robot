(() => {
  'use strict';
  const copy={
    ar:['طلبات تفعيل المالك','لا توجد طلبات معلّقة.','تعذّر تحميل الطلبات.','إعادة المحاولة','السابق','التالي'],
    en:['Owner activation requests','No pending requests.','Requests could not be loaded.','Retry','Previous','Next'],
    tr:['Sahip etkinleştirme talepleri','Bekleyen talep yok.','Talepler yüklenemedi.','Tekrar dene','Önceki','Sonraki'],
    fr:['Demandes d’activation des propriétaires','Aucune demande en attente.','Chargement impossible.','Réessayer','Précédent','Suivant'],
    ru:['Запросы на активацию владельца','Нет ожидающих запросов.','Не удалось загрузить запросы.','Повторить','Назад','Далее']
  };
  const uuid=/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
  function element(tag,text){
    const node=document.createElement(tag);
    if(text!==undefined)node.textContent=text;
    return node;
  }
  function mount({nav,request,language,userId}){
    const words=copy[language]||copy.ar;
    const box=element('details'),summary=element('summary'),count=element('span'),items=element('ul'),feedback=element('p'),pager=element('div');
    box.className='platform-owner-alerts';
    count.className='platform-owner-count';count.setAttribute('aria-live','polite');count.hidden=true;
    feedback.setAttribute('role','status');summary.append(words[0]+' ',count);
    box.append(summary,feedback,items,pager);nav.append(box);
    const device=window.WFPlatformOwnerAlertDevice?.mount({box,request,language,userId});
    let alive=true,offset=0,serial=0,last='',timer;
    function button(label,action){
      const b=element('button',label);b.type='button';b.onclick=action;return b;
    }
    async function refresh(){
      if(!alive||document.hidden)return;
      const seq=++serial;
      try{
        const data=await request('company.ownerAlerts',{offset});
        if(!alive||seq!==serial)return;
        if(!Array.isArray(data.requests)||!Number.isSafeInteger(data.total)||data.total<0)throw Error();
        if(offset>0&&offset>=data.total){offset=Math.max(0,Math.floor((data.total-1)/20)*20);return refresh();}
        const key=JSON.stringify([offset,data.total,data.requests]);
        if(key===last)return;
        const focused=box.contains(document.activeElement)?document.activeElement:null;
        const focusHref=focused?.getAttribute('href'),focusButton=focused?.tagName==='BUTTON'?focused.textContent:null;
        last=key;count.hidden=false;count.textContent=String(data.total);box.dataset.pending=String(data.total>0);
        feedback.textContent=data.total?'':words[1];items.replaceChildren();pager.replaceChildren();
        for(const row of data.requests){
          if(!uuid.test(row.workspaceId))continue;
          const li=element('li'),link=element('a'),company=element('bdi',row.company);
          const person=element('bdi',row.applicant),user=element('bdi','@'+row.username),by=element('small');
          link.href='#company/'+row.workspaceId+'/activation';by.append(person,' · ',user);
          link.append(company,by);link.addEventListener('click',()=>{box.open=false;});li.append(link);items.append(li);
        }
        if(offset>0)pager.append(button(words[4],()=>{offset-=20;refresh();}));
        if(offset+20<data.total)pager.append(button(words[5],()=>{offset+=20;refresh();}));
        if(focused&&!focused.isConnected){
          const next=[...box.querySelectorAll('a,button')].find(el=>focusHref?el.getAttribute('href')===focusHref:el.textContent===focusButton);
          (next||summary).focus();
        }
      }catch{
        if(!alive||seq!==serial)return;
        last='';count.hidden=true;delete box.dataset.pending;items.replaceChildren();feedback.textContent=words[2];
        pager.replaceChildren(button(words[3],refresh));
      }
    }
    const watch=()=>{clearTimeout(timer);if(!alive||document.hidden)return;refresh();timer=setTimeout(watch,30000);};
    const toggle=()=>{if(box.open)refresh();};
    box.addEventListener('toggle',toggle);document.addEventListener('visibilitychange',watch);
    window.addEventListener('wow-owner-approval-changed',watch);watch();
    return {detachDevice:()=>device?.detach(),dispose(){
      device?.dispose();
      alive=false;clearTimeout(timer);box.removeEventListener('toggle',toggle);document.removeEventListener('visibilitychange',watch);
      window.removeEventListener('wow-owner-approval-changed',watch);box.remove();
    }};
  }
  window.WFPlatformOwnerAlerts={mount};
})();
