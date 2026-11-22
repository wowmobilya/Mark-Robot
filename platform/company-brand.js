(function(){
  'use strict';
  const labels={
    ar:['شعار الشركة','اختيار صورة','حفظ الشعار','تعذّر تحميل الشعار. حاول مجددًا.','تم حفظ الشعار','تعذّر حفظ الصورة. تحقق من نوعها وحاول مجددًا.','إعادة المحاولة','معاينة الشعار','PNG · JPG · WEBP — بحد أقصى 8 ميجابايت','لم تختر صورة جديدة','الصورة الجديدة جاهزة للحفظ','معاينة الشعار المحفوظ'],
    tr:['Şirket logosu','Görsel seç','Logoyu kaydet','Logo yüklenemedi. Tekrar deneyin.','Logo kaydedildi','Görsel kaydedilemedi. Dosya türünü kontrol edin.','Tekrar dene','Logo önizlemesi','PNG · JPG · WEBP — en fazla 8 MB','Yeni görsel seçilmedi','Yeni görsel kaydedilmeye hazır','Kaydedilen logo önizlemesi'],
    en:['Company logo','Choose image','Save logo','Could not load the logo. Try again.','Logo saved','Could not save the image. Check the file type and retry.','Retry','Logo preview','PNG · JPG · WEBP — maximum 8 MB','No new image selected','New image ready to save','Saved logo preview'],
    fr:['Logo de l’entreprise','Choisir une image','Enregistrer le logo','Impossible de charger le logo. Réessayez.','Logo enregistré','Échec de l’enregistrement. Vérifiez le format du fichier.','Réessayer','Aperçu du logo','PNG · JPG · WEBP — 8 Mo maximum','Aucune nouvelle image','Nouvelle image prête à enregistrer','Aperçu du logo enregistré'],
    ru:['Логотип компании','Выбрать изображение','Сохранить логотип','Не удалось загрузить логотип. Повторите попытку.','Логотип сохранён','Не удалось сохранить изображение. Проверьте формат файла.','Повторить','Предпросмотр логотипа','PNG · JPG · WEBP — до 8 МБ','Новый файл не выбран','Новое изображение готово к сохранению','Предпросмотр сохранённого логотипа']
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
      const title=row.querySelector('strong'),wrap=el('div'),avatar=el('span');
      wrap.className='platform-brand-title';avatar.className='platform-brand-avatar';
      avatar.setAttribute('aria-hidden','true');title.before(wrap);wrap.append(avatar,title);

      // Place the logo editor first in the expanded company tools. The file input
      // stays keyboard-accessible but the native browser file field is visually hidden.
      const group=el('section'),head=el('div'),heading=el('strong',w[0]),hint=el('small',w[8]);
      group.className='platform-company-brand';head.className='platform-brand-head';head.append(heading,hint);
      const illustration=el('div'),preview=el('span'),copy=el('div');
      const previewTitle=el('strong',w[7]),fileName=el('small',w[9]);
      illustration.className='platform-brand-preview-row';
      preview.className='platform-brand-avatar platform-brand-editor-preview';
      preview.setAttribute('role','img');preview.setAttribute('aria-label',w[7]);
      copy.className='platform-brand-preview-copy';fileName.className='platform-brand-filename';
      copy.append(previewTitle,fileName);illustration.append(preview,copy);
      const controls=el('div'),picker=el('label'),pickerIcon=el('span');
      const pickerText=el('span',w[1]),file=el('input'),save=el('button',w[2]),retry=el('button',w[6]),status=el('span');
      controls.className='platform-brand-controls';picker.className='platform-brand-picker';
      pickerIcon.className='platform-brand-picker-icon';pickerIcon.setAttribute('aria-hidden','true');
      file.className='platform-brand-file';file.type='file';file.accept='image/png,image/jpeg,image/webp';
      picker.append(pickerIcon,pickerText,file);
      save.type=retry.type='button';save.className='platform-brand-save';
      retry.className='platform-brand-retry';save.disabled=true;retry.hidden=true;
      status.className='platform-brand-status';status.setAttribute('role','status');
      controls.append(picker,save,retry);
      group.append(head,illustration,controls,status);
      const actionGrid=details.querySelector('.platform-company-actions-grid');
      if(actionGrid)actionGrid.before(group);else details.append(group);

      let revision=null,loading=false,busy=false,pending='',savedUrl='';
      const paint=url=>{
        savedUrl=url;
        artwork(avatar,url,company.name);artwork(preview,url,company.name);
      };
      paint('');
      async function read(){
        if(disposed||loading)return;
        loading=true;retry.hidden=true;revision=null;save.disabled=true;
        try{
          const info=await request('company.brand',{workspaceId:company.id});
          if(disposed||!row.isConnected)return;
          revision=info.revision;savedUrl=source(info,config,company.id);
          artwork(avatar,savedUrl,company.name);
          artwork(preview,pending?'data:image/png;base64,'+pending:savedUrl,company.name);
          status.textContent='';save.disabled=!pending;
        }catch{
          if(!disposed){retry.hidden=false;status.textContent=w[3];}
        }finally{loading=false;}
      }
      retry.onclick=read;readers.set(row,read);
      if(observer)observer.observe(row);else queueMicrotask(read);
      details.addEventListener('toggle',()=>{if(details.open&&revision===null&&!loading)read();});
      file.onchange=async()=>{
        const selected=file.files?.[0];if(!selected)return;
        pending='';save.disabled=true;file.disabled=true;status.textContent='';
        try{
          const compressed=await encode(selected);
          if(disposed||!row.isConnected)return;
          pending=compressed;artwork(preview,'data:image/png;base64,'+pending,company.name);
          fileName.textContent=selected.name;fileName.title=selected.name;
          previewTitle.textContent=w[10];save.disabled=revision===null;
        }catch{
          if(row.isConnected){
            artwork(preview,savedUrl,company.name);
            fileName.textContent=w[9];fileName.removeAttribute('title');
            previewTitle.textContent=w[7];status.textContent=w[5];file.value='';
          }
        }finally{file.disabled=false;}
      };
      save.onclick=async()=>{
        if(!pending||revision===null||busy||disposed)return;
        busy=true;save.disabled=file.disabled=true;
        try{
          const info=await request('company.setBrand',{workspaceId:company.id,revision,png:pending});
          if(disposed||!row.isConnected)return;
          revision=info.revision;paint('data:image/png;base64,'+pending);pending='';file.value='';
          fileName.textContent=w[9];fileName.removeAttribute('title');
          previewTitle.textContent=w[11];status.textContent=w[4];
        }catch{
          revision=null;retry.hidden=false;status.textContent=w[5];
        }finally{busy=false;file.disabled=false;save.disabled=true;}
      };
    }
    return {attach,dispose(){disposed=true;observer?.disconnect();}};
  }
  window.WFPlatformBrand={create};
})();
