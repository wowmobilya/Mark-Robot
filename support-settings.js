/* Private conversation between the signed-in account and the platform founder. */
(function(root){
  'use strict';
  const doc=root.document, workspace=doc.getElementById('page-settings')?.querySelector('.wf-settings-workspace');
  const client=root.WFCloudClient?.getClient?.();
  if(!workspace||!client||doc.getElementById('stab-support'))return;
  const words={
    ar:['الشكاوى والردود','شكوى جديدة','نص الشكوى','صورة اختيارية','إرسال','رجوع','لا توجد شكاوى بعد.','رد جديد','المؤسس','أنت','الرد','تلزم جلسة متصلة بحساب الشركة.','تعذّر إتمام العملية. أعد المحاولة.','اختر صورة أصغر بصيغة JPEG أو PNG أو WebP.','تحديث','التالي','صورة الشكوى','غير مقروء','كل الشكاوى','أرسل شكواك إلى مؤسس المنصة.'],
    en:['Complaints and replies','New complaint','Complaint text','Optional photo','Send','Back','No complaints yet.','New reply','Founder','You','Reply','Sign in to your company account online.','Could not complete the request. Try again.','Choose a smaller JPEG, PNG or WebP photo.','Refresh','Next','Complaint photo','Unread','All complaints','Send your complaint to the platform founder.'],
    tr:['Şikâyetler ve yanıtlar','Yeni şikâyet','Şikâyet metni','İsteğe bağlı fotoğraf','Gönder','Geri','Henüz şikâyet yok.','Yeni yanıt','Kurucu','Siz','Yanıtla','Şirket hesabınıza çevrimiçi giriş yapın.','İstek tamamlanamadı. Tekrar deneyin.','Daha küçük bir JPEG, PNG veya WebP fotoğrafı seçin.','Yenile','İleri','Şikâyet fotoğrafı','Okunmamış','Tüm şikâyetler','Şikâyetinizi platform kurucusuna gönderin.'],
    fr:['Réclamations et réponses','Nouvelle réclamation','Texte de la réclamation','Photo facultative','Envoyer','Retour','Aucune réclamation.','Nouvelle réponse','Fondateur','Vous','Répondre','Connectez-vous en ligne au compte de votre société.','La demande a échoué. Réessayez.','Choisissez une image JPEG, PNG ou WebP plus petite.','Actualiser','Suivant','Photo de la réclamation','Non lu','Toutes les réclamations','Envoyez votre réclamation au fondateur de la plateforme.'],
    ru:['Обращения и ответы','Новое обращение','Текст обращения','Фото по желанию','Отправить','Назад','Пока обращений нет.','Новый ответ','Основатель','Вы','Ответить','Войдите в аккаунт компании при подключении к сети.','Не удалось выполнить запрос. Повторите попытку.','Выберите фото JPEG, PNG или WebP меньшего размера.','Обновить','Далее','Фото обращения','Не прочитано','Все обращения','Отправьте обращение основателю платформы.']
  };
  const loc=()=>words[doc.documentElement.lang]?doc.documentElement.lang:'ar', t=k=>words[loc()][k];
  const el=(tag,value,cls)=>{const n=doc.createElement(tag);if(value!=null)n.textContent=value;if(cls)n.className=cls;return n;};
  const button=(text,fn)=>{const n=el('button',text,'btn btn-s');n.type='button';n.onclick=fn;return n;};
  const tab=button(t(0),()=>root.switchTab('support'));tab.className='tab-btn';tab.id='wf-settings-tab-support';tab.dataset.wfPermission='settings.view';tab.setAttribute('aria-controls','stab-support');
  const panel=el('section',null,'wf-accounts');panel.id='stab-support';panel.style.display='none';panel.setAttribute('aria-labelledby',tab.id);
  workspace.querySelector('.tabs').append(tab);workspace.querySelector('.wf-settings-content').append(panel);
  const host=workspace.querySelector('.wf-settings-content'),sidebar=doc.getElementById('sidebar'),dialog=el('dialog',null,'wf-app-dialog');
  const dismiss=button(t(5),()=>dialog.close());dialog.append(dismiss);doc.body.append(dialog);
  dialog.setAttribute('aria-label',t(0));const shortcut=button(t(0),()=>{
    if(!stateKey()||dialog.open)return;root.closeSidebar?.();dialog.append(panel);dialog.showModal();active=true;panel.style.display='block';list();
  });shortcut.hidden=true;sidebar?.append(shortcut);
  const stateKey=()=>{const s=client.getSnapshot();return s?.authenticated&&s.connection==='online'&&root.navigator.onLine!==false&&s.currentAccount?.id&&s.workspaceId?JSON.stringify([s.workspaceId,s.currentAccount.id]):'';};
  let active=false,seq=0,scope='',notice,body;
  const live=key=>active&&seq===key&&scope&&stateKey()===scope;
  function frame(){
    ++seq;scope=stateKey();notice=el('p',null,'wf-account-notice');notice.setAttribute('role','status');body=el('div');
    panel.replaceChildren(el('h3',t(0)),notice,body);if(!scope)notice.textContent=t(11);return seq;
  }
  function error(key,n=12){if(live(key))notice.textContent=t(n);}
  function failPhoto(){throw Object.assign(new Error(),{photo:true});}
  async function encode(file){
    if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>12*1024*1024)failPhoto();
    const img=new Image(),url=URL.createObjectURL(file);
    try{
      img.src=url;await img.decode();if(!img.naturalWidth||img.naturalWidth*img.naturalHeight>40000000)failPhoto();
      const canvas=doc.createElement('canvas');
      for(const width of [1024,768,512]){
        const ratio=Math.min(1,width/Math.max(img.naturalWidth,img.naturalHeight));
        canvas.width=Math.max(1,Math.round(img.naturalWidth*ratio));canvas.height=Math.max(1,Math.round(img.naturalHeight*ratio));
        const ctx=canvas.getContext('2d');ctx.fillStyle='white';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(img,0,0,canvas.width,canvas.height);
        const result=canvas.toDataURL('image/jpeg',.75);
        if(result.startsWith('data:image/jpeg;base64,')&&result.length-23<=262144)return {mime:'image/jpeg',base64:result.slice(23)};
      }
      failPhoto();
    }catch{failPhoto();}finally{URL.revokeObjectURL(url);}
  }
  function composer(key,id){
    const form=el('form',null,'wf-account-details'),label=el('label',t(id?7:2),'wf-account-field'),input=el('textarea',null,'fi');
    input.maxLength=3000;input.required=true;input.dir='auto';input.rows=4;label.append(input);form.append(label);
    let fileInput;
    if(!id){const photo=el('label',t(3),'wf-account-field');fileInput=el('input',null,'fi');fileInput.type='file';fileInput.accept='image/jpeg,image/png,image/webp';photo.append(fileInput);form.append(photo);}
    const send=el('button',t(id?10:4),'btn btn-p');send.type='submit';form.append(send);body.append(form);
    let requestId=crypto.randomUUID();
    form.oninput=()=>{requestId=crypto.randomUUID();};
    form.onsubmit=async event=>{
      event.preventDefault();const text=input.value.trim();if(!text||!live(key)||send.disabled)return;
      send.disabled=true;input.readOnly=true;if(fileInput)fileInput.disabled=true;notice.textContent='';
      try{
        const data={requestId,text};if(id)data.caseId=id;
        if(fileInput?.files[0])data.photo=await encode(fileInput.files[0]);if(!live(key))return;
        const result=await client.request(id?'support.reply':'support.create',data);
        if(live(key))await open(id||result.caseId);
      }catch(e){error(key,e?.photo?13:12);}
      finally{send.disabled=false;input.readOnly=false;if(fileInput)fileInput.disabled=false;}
    };
  }
  function fresh(){const key=frame();if(!scope)return;body.append(button(t(5),()=>list()),el('p',t(19)));composer(key);body.querySelector('textarea').focus();}
  async function open(id,cursor){
    const key=frame();if(!scope||!id)return;body.append(button(t(5),()=>list()));
    try{
      const data=await client.request('support.open',cursor?{caseId:id,cursor}:{caseId:id});if(!live(key))return;
      if(data.nextCursor)body.append(button(t(15),()=>open(id,data.nextCursor)));
      if(cursor)body.append(button(t(14),()=>open(id)));
      for(const msg of data.messages){const row=el('article',null,'wf-account-details'),caption=el('strong',t(msg.fromFounder?8:9)),content=el('p',msg.text);content.dir='auto';row.append(caption,content);
        if(msg.createdAt&&Number.isFinite(Date.parse(msg.createdAt)))row.append(el('time',new Date(msg.createdAt).toLocaleString(loc())));body.append(row);}
      const photo=data.case?.photo;
      if(photo?.mime==='image/jpeg'&&typeof photo.base64==='string'&&photo.base64.length<=262144&&/^\/9j\/[A-Za-z0-9+/]*={0,2}$/.test(photo.base64)){
        const img=el('img');img.alt=t(16);img.src='data:image/jpeg;base64,'+photo.base64;img.style.maxWidth='100%';img.style.height='auto';body.append(img);
      }
      composer(key,id);
    }catch{error(key);}
  }
  async function list(cursor){
    const key=frame();if(!scope)return;
    body.append(button(t(1),fresh),button(t(14),()=>list()));if(cursor)body.append(button(t(18),()=>list()));
    try{
      const data=await client.request('support.list',cursor?{cursor}:{});if(!live(key))return;
      if(Number.isInteger(data.unreadCases)&&data.unreadCases>0)notice.textContent=t(17)+' · '+data.unreadCases;
      if(!data.cases.length)body.append(el('p',t(6)));
      for(const item of data.cases){
        const row=el('article',null,'wf-account-details'),link=button(item.text,()=>open(item.id));link.dir='auto';row.append(link);
        if(item.unread)row.append(el('strong',t(17)));body.append(row);
      }
      if(data.nextCursor)body.append(button(t(15),()=>list(data.nextCursor)));
    }catch{error(key);}
  }
  function close(){active=false;++seq;scope='';panel.style.display='none';tab.classList.remove('active');panel.replaceChildren();}
  const previous=root.switchTab;
  root.switchTab=function(key){const result=previous?.apply(this,arguments);
    if(key!=='support'||result===false||!root.WFAccountAccess?.allow?.('settings.view'))close();
    else{active=true;panel.style.display='block';tab.classList.add('active');list();}return result;};
  dialog.addEventListener('close',()=>{close();host.append(panel);});
  function changed(){
    const next=stateKey();shortcut.hidden=!next||root.WFAccountAccess?.allow?.('settings.view')===true;
    if(dialog.open&&!next){dialog.close();close();return;}
    if(active&&!dialog.open&&root.WFAccountAccess?.allow?.('settings.view')!==true){close();return;}
    if(active&&scope!==next)list();
  }
  root.WFPlatformSupport=Object.freeze({open(){
    if(!stateKey())return false;
    if(root.WFAccountAccess?.allow?.('settings.view')){root.showPage?.('settings');tab.click();}
    else if(dialog.open)list();else shortcut.click();
    return true;
  }});
  changed();
  client.subscribe(changed);root.addEventListener('offline',changed);root.addEventListener('online',changed);root.addEventListener('wf-account-access-change',changed);
  doc.getElementById('wfSettingsDialog')?.addEventListener('close',close);
  new MutationObserver(()=>{tab.textContent=shortcut.textContent=t(0);dismiss.textContent=t(5);dialog.setAttribute('aria-label',t(0));if(active)list();}).observe(doc.documentElement,{attributes:true,attributeFilter:['lang']});
})(window);
