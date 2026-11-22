(function(){
  'use strict';
  const labels={
    ar:['شعار الشركة','اختيار صورة','حفظ الشعار','تعذّر تحميل الشعار. حاول مجددًا.','تم حفظ الشعار','تعذّر حفظ الصورة. تحقق من نوعها وحاول مجددًا.','إعادة المحاولة'],
    tr:['Şirket logosu','Görsel seç','Logoyu kaydet','Logo yüklenemedi. Tekrar deneyin.','Logo kaydedildi','Görsel kaydedilemedi. Dosya türünü kontrol edin.','Tekrar dene'],
    en:['Company logo','Choose image','Save logo','Could not load the logo. Try again.','Logo saved','Could not save the image. Check the file type and retry.','Retry'],
    fr:['Logo de l’entreprise','Choisir une image','Enregistrer le logo','Impossible de charger le logo. Réessayez.','Logo enregistré','Échec de l’enregistrement. Vérifiez le format du fichier.','Réessayer'],
    ru:['Логотип компании','Выбрать изображение','Сохранить логотип','Не удалось загрузить логотип. Повторите попытку.','Логотип сохранён','Не удалось сохранить изображение. Проверьте формат файла.','Повторить']
  };
  const el=(tag,text)=>{const node=document.createElement(tag);if(text)node.textContent=text;return node;};
  function source(info,config,id){
    if(info.builtin===true)return '../assets/wow-furniture-logo.png';
    if(typeof info.image==='string'&&info.image.length<=1400000&&/^data:image\/(png|jpeg|gif|avif|webp);base64,[A-Za-z0-9+/]+=*$/.test(info.image))return info.image;
    if(!info.url)return '';
    try{
      const url=new URL(info.url),parts=url.pathname.split('/');
      if(url.protocol==='https:'&&url.origin===new URL(config.projectUrl).origin&&!url.username&&!url.password&&!url.hash&&
        parts.slice(0,6).join('/')==='/storage/v1/object/sign/mark-robot-private'&&parts.length===9&&parts[6]===id&&
        /^[a-f0-9]{64}$/.test(parts[7])&&/^[a-f0-9]{64}\.(png|jpg|jpeg|gif|avif|webp)$/.test(parts[8]))return url.href;
    }catch{}
    return '';
  }
  function artwork(container,url,name){
    const words=String(name||'').trim().split(/\s+/u);const initials=words.slice(0,2).map(word=>Array.from(word)[0]||'').join('');
    container.textContent=initials;
    if(!url)return;
    const img=el('img');img.alt='';img.referrerPolicy='no-referrer';img.decoding='async';
    img.onerror=()=>{if(img.parentNode===container)container.textContent=initials;};container.replaceChildren(img);img.src=url;
  }
  async function encode(file){
    if(!file||!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>8*1024*1024)throw Error();
    const url=URL.createObjectURL(file),img=el('img');
    try{
      img.src=url;await img.decode();
      if(!img.naturalWidth||!img.naturalHeight)throw Error();
      for(let max=512;max>=128;max=Math.floor(max*.75)){
        const scale=Math.min(1,max/Math.max(img.naturalWidth,img.naturalHeight)),canvas=el('canvas');
        canvas.width=Math.max(1,Math.round(img.naturalWidth*scale));canvas.height=Math.max(1,Math.round(img.naturalHeight*scale));
        canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height);
        const encoded=canvas.toDataURL('image/png').split(',')[1];if(encoded?.length<=262144)return encoded;
      }
      throw Error();
    }finally{URL.revokeObjectURL(url);}
  }
  function create({request,config,language}){
    const w=labels[language]||labels.en;let disposed=false;
    const readers=new WeakMap(),observer=typeof IntersectionObserver==='function'?new IntersectionObserver(entries=>{
      for(const entry of entries)if(entry.isIntersecting){observer.unobserve(entry.target);readers.get(entry.target)?.();}
    }):null;
    function attach(row,details,company){
      const title=row.querySelector('strong'),wrap=el('div'),avatar=el('span'),group=el('section'),heading=el('strong',w[0]);
      wrap.className='platform-brand-title';avatar.className='platform-brand-avatar';avatar.setAttribute('aria-hidden','true');title.before(wrap);wrap.append(avatar,title);
      const picker=el('label',w[1]),file=el('input'),save=el('button',w[2]),retry=el('button',w[6]),status=el('span'),preview=el('span');
      preview.className='platform-brand-avatar';preview.setAttribute('aria-hidden','true');
      file.type='file';file.accept='image/png,image/jpeg,image/webp';picker.append(file);save.type=retry.type='button';save.disabled=true;retry.hidden=true;
      group.className='platform-company-brand';status.setAttribute('role','status');group.append(preview,heading,picker,save,retry,status);details.append(group);
      let revision=null,loading=false,busy=false,pending='';
      const paint=url=>{artwork(avatar,url,company.name);artwork(preview,url,company.name);};paint('');
      async function read(){
        if(disposed||loading)return;loading=true;retry.hidden=true;revision=null;save.disabled=true;
        try{const info=await request('company.brand',{workspaceId:company.id});if(disposed||!row.isConnected)return;
          revision=info.revision;const url=source(info,config,company.id);artwork(avatar,url,company.name);artwork(preview,pending?'data:image/png;base64,'+pending:url,company.name);
          status.textContent='';save.disabled=!pending;
        }catch{if(!disposed){retry.hidden=false;status.textContent=w[3];}}finally{loading=false;}
      }
      retry.onclick=read;readers.set(row,read);
      if(observer)observer.observe(row);else queueMicrotask(read);
      details.addEventListener('toggle',()=>{if(details.open&&revision===null&&!loading)read();});
      file.onchange=async()=>{
        const selected=file.files[0];if(!selected)return;
        pending='';save.disabled=true;file.disabled=true;
        try{pending=await encode(selected);if(disposed)return;artwork(preview,'data:image/png;base64,'+pending,company.name);save.disabled=revision===null;status.textContent='';}
        catch{status.textContent=w[5];}finally{file.disabled=false;}
      };
      save.onclick=async()=>{
        if(!pending||revision===null||busy||disposed)return;
        busy=true;save.disabled=file.disabled=true;
        try{const info=await request('company.setBrand',{workspaceId:company.id,revision,png:pending});if(disposed)return;
          revision=info.revision;paint('data:image/png;base64,'+pending);pending='';file.value='';status.textContent=w[4];
        }catch{revision=null;retry.hidden=false;status.textContent=w[5];}finally{busy=false;file.disabled=false;}
      };
    }
    return {attach,dispose(){disposed=true;observer?.disconnect();}};
  }
  window.WFPlatformBrand={create};
})();
