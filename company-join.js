(function(root){
 'use strict';
 const words={
  en:['Join a company','Company QR or invitation link','Scan QR','Company link','Open company','Name','Username','Password','Send join request','Waiting for approval','Approved','Rejected','Show this QR to your company administrator.','Join requests','Company invitation','Refresh','Approve','Reject','Confirm','Cancel','No pending requests.','Previous','Next','Scan a request QR','Review request','Request link','Check the company link or QR.','Could not complete the request. Check your connection and try again.','Username already in use.','Sign in','Company name','Copy link','Copied','Choose a password of at least 12 characters.'],
  ar:['الانضمام إلى شركة','رمز الشركة أو رابط الدعوة','مسح الرمز','رابط الشركة','فتح الشركة','الاسم','اسم المستخدم','كلمة المرور','إرسال طلب الانضمام','بانتظار الموافقة','تمت الموافقة','مرفوض','اعرض هذا الرمز على مسؤول شركتك.','طلبات الانضمام','دعوة الشركة','تحديث','موافقة','رفض','تأكيد','إلغاء','لا توجد طلبات معلّقة.','السابق','التالي','مسح رمز طلب','مراجعة الطلب','رابط الطلب','تحقق من رابط الشركة أو رمز QR.','تعذّر إتمام الطلب. تحقق من الاتصال ثم أعد المحاولة.','اسم المستخدم مستخدم بالفعل.','تسجيل الدخول','اسم الشركة','نسخ الرابط','تم النسخ','اختر كلمة مرور من ١٢ حرفًا على الأقل.'],
  tr:['Şirkete katıl','Şirket QR kodu veya davet bağlantısı','QR tara','Şirket bağlantısı','Şirketi aç','Ad','Kullanıcı adı','Parola','Katılma talebi gönder','Onay bekleniyor','Onaylandı','Reddedildi','Bu QR kodunu şirket yöneticinize gösterin.','Katılma talepleri','Şirket daveti','Yenile','Onayla','Reddet','Onayla','Vazgeç','Bekleyen talep yok.','Önceki','Sonraki','Talep QR kodunu tara','Talebi incele','Talep bağlantısı','Şirket bağlantısını veya QR kodunu kontrol edin.','İşlem tamamlanamadı. Bağlantıyı kontrol edip tekrar deneyin.','Kullanıcı adı kullanımda.','Giriş yap','Şirket adı','Bağlantıyı kopyala','Kopyalandı','En az 12 karakterli bir parola seçin.'],
  fr:['Rejoindre une société','Code QR de société ou lien d’invitation','Scanner le QR','Lien de la société','Ouvrir la société','Nom','Identifiant','Mot de passe','Envoyer la demande','En attente de validation','Approuvée','Refusée','Présentez ce code QR à votre administrateur.','Demandes d’adhésion','Invitation de la société','Actualiser','Approuver','Refuser','Confirmer','Annuler','Aucune demande en attente.','Précédent','Suivant','Scanner une demande','Examiner la demande','Lien de demande','Vérifiez le lien ou le code QR de la société.','Échec de la demande. Vérifiez la connexion et réessayez.','Identifiant déjà utilisé.','Connexion','Société','Copier le lien','Copié','Choisissez un mot de passe d’au moins 12 caractères.'],
  ru:['Присоединиться к компании','QR-код или ссылка компании','Сканировать QR','Ссылка компании','Открыть компанию','Имя','Имя пользователя','Пароль','Отправить заявку','Ожидает одобрения','Одобрено','Отклонено','Покажите этот QR-код администратору компании.','Заявки на вступление','Приглашение в компанию','Обновить','Одобрить','Отклонить','Подтвердить','Отмена','Нет ожидающих заявок.','Назад','Далее','Сканировать заявку','Рассмотреть заявку','Ссылка на заявку','Проверьте ссылку или QR-код компании.','Запрос не выполнен. Проверьте подключение и повторите попытку.','Имя пользователя уже занято.','Войти','Название компании','Скопировать ссылку','Скопировано','Придумайте пароль длиной не менее 12 символов.']
 };
 const uuid=/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i;
 function link(base,workspace,id){
  if(!uuid.test(workspace)||id!=null&&!uuid.test(id))return null;
  const url=new URL('./',base);url.searchParams.set('wf-cloud','employee');url.searchParams.set('workspace',workspace);
  if(id){url.searchParams.set('reviewJoin',id);url.searchParams.set('wf-accounts','cloud');url.hash='settings';}
  else url.searchParams.set('join','1');
  return url.href;
 }
 function readLink(raw,base,type,workspace){
  try{const u=new URL(raw),w=u.searchParams.get('workspace'),id=u.searchParams.get('reviewJoin');
   if(workspace&&w!==workspace)return null;
   const expected=link(base,w,type==='review'?id:undefined);
   if(!expected||type==='review'&&!uuid.test(id))return null;
   const canonical=new URL(expected);u.searchParams.sort();canonical.searchParams.sort();
   return u.href===canonical.href?expected:null;
  }catch{return null;}
 }
 if(typeof module==='object'&&module.exports){module.exports={link,readLink};return;}
 const doc=root.document;
 const node=(tag,caption)=>{const n=doc.createElement(tag);if(caption)n.textContent=caption;return n;};
 function btn(label,action){const b=node('button',label);b.type='button';b.className='btn';b.onclick=action;return b;}
 function scanner(container,base,lang,type,workspace,onAccept){
  return root.WFOwnerInvite?.mount(container,base,lang,{
   labels:l=>{const w=words[l]||words.en;return [w[type==='review'?23:1],w[2],w[type==='review'?25:3],w[type==='review'?24:4],null,w[26]];},
   parse:value=>readLink(value,base,type,workspace),onAccept
  });
 }
 async function qr(container,url,caption,lang){
  const w=words[lang]||words.en,box=node('div');box.className='wf-join-qr';
  const label=node('label',caption),input=node('input');input.type='url';input.readOnly=true;input.value=url;input.dir='ltr';
  label.append(input);box.append(label,btn(w[31],async event=>{try{await navigator.clipboard.writeText(url);event.target.textContent=w[32];}catch{input.select();}}));
  container.append(box);
  try{const z=root.ZXingBrowser||await root.qblLoadFallback();if(!box.isConnected)return;
   const svg=new z.BrowserQRCodeSvgWriter().write(url,660,660,new Map([[0,'M']]));svg.setAttribute('role','img');svg.setAttribute('aria-label',caption);
   svg.setAttribute('shape-rendering','crispEdges');svg.style.background='white';box.prepend(svg);
  }catch{/* The selectable canonical link remains available. */}
 }
 function mountApplicant({container,client,base,workspace,lang}){
  if(!client||!uuid.test(workspace))return null;
  const details=node('details'),summary=node('summary'),panel=node('div');details.className='wf-owner-invite';details.append(summary,panel);container.append(details);
  const params=new URLSearchParams(root.location.search);details.open=params.get('join')==='1'&&params.get('workspace')===workspace;
  let locale=lang,receipt=null,reading,busy=false,error='',inputName='',inputUser='',attempt=null;
  const txt=i=>(words[locale]||words.en)[i];
  function draw(){
   reading?.dispose();panel.replaceChildren();summary.textContent=txt(0);const chosen=link(base,workspace);
   if(receipt){panel.append(node('strong',txt({pending:9,approved:10,rejected:11}[receipt.state])));
    if(receipt.state==='pending'){panel.append(node('p',txt(12)));qr(panel,link(base,workspace,receipt.id),txt(24),locale);}
    const sign=node('a',txt(29)),u=new URL(chosen);u.searchParams.delete('join');sign.href=u.href;panel.append(sign);return;}
   reading=scanner(panel,base,locale,'company',null,url=>root.location.assign(url));
   const form=node('form'),inputs=[];form.className='wf-join-form';const message=node('p',error);message.setAttribute('role','status');
   for(const [index,type,auto,max] of [[5,'text','name',100],[6,'text','username',64],[7,'password','new-password',128]]){
    const line=node('label',txt(index)),input=node('input');input.className='fi';input.type=type;input.autocomplete=auto;input.maxLength=max;input.required=true;
    if(index===7){input.minLength=12;input.setAttribute('aria-label',txt(7));}else input.value=index===5?inputName:inputUser;
    line.append(input);form.append(line);inputs.push(input);
   }
   const note=node('small',txt(33)),send=node('button',txt(8));send.className='btn btn-p';send.type='submit';send.disabled=busy;
   form.append(note,send,message);panel.append(form);
   form.onsubmit=async event=>{
    event.preventDefault();if(busy||!form.reportValidity())return;
    inputName=inputs[0].value.trim();inputUser=inputs[1].value.trim();busy=true;send.disabled=true;message.textContent='';
    const key='wf.companyJoin.attempt:'+JSON.stringify([workspace,inputUser]);let saved;
    try{saved=JSON.parse(root.sessionStorage.getItem(key));}catch{}
    if(!saved||!uuid.test(saved.requestId)||!(/^[a-f0-9]{64}$/.test(saved.claimToken))){
     saved=attempt?.key===key?attempt:{requestId:crypto.randomUUID(),claimToken:[...crypto.getRandomValues(new Uint8Array(32))].map(n=>n.toString(16).padStart(2,'0')).join('')};
    }
    attempt={...saved,key};try{root.sessionStorage.setItem(key,JSON.stringify({requestId:saved.requestId,claimToken:saved.claimToken}));}catch{}
    try{const response=await client.request('auth.companyJoin',{workspaceId:workspace,requestId:saved.requestId,claimToken:saved.claimToken,username:inputUser,name:inputName,password:inputs[2].value},{authenticated:false});
     if(response.id!==saved.requestId||!['pending','approved','rejected'].includes(response.state))throw Error();
     receipt={id:response.id,state:response.state};inputs[2].value='';if(details.isConnected)draw();
    }catch(e){error=txt(['USERNAME_TAKEN','USERNAME_EXISTS'].includes(e?.code)?28:27);message.textContent=error;}
    finally{busy=false;send.disabled=false;}
   };
  }
  draw();return {updateLanguage(l){if(l===locale)return;locale=l;draw();},stop(){reading?.stop();},dispose(){reading?.dispose();details.remove();}};
 }
 function mountOwner({container,client,base,lang}){
  const s=client?.getSnapshot(),workspace=s?.workspaceId,actor=s?.currentAccount?.id;
  if(!s?.authenticated||s.mode!=='remote'||s.currentAccount?.role!=='owner'||!uuid.test(workspace))return null;
  const valid=()=>{const cur=client.getSnapshot();return details.isConnected&&cur.authenticated&&cur.workspaceId===workspace&&cur.currentAccount?.id===actor&&cur.currentAccount.role==='owner';};
  const details=node('details'),summary=node('summary'),body=node('div'),rows=node('div'),status=node('p');details.className='wf-owner-invite';
  details.append(summary,body);container.append(details);status.setAttribute('role','status');
  const params=new URLSearchParams(root.location.search);
  let locale=lang,offset=0,selected=params.get('workspace')===workspace&&uuid.test(params.get('reviewJoin'))?params.get('reviewJoin'):null;
  let reading,drawn=false,ticket=0;
  const txt=i=>(words[locale]||words.en)[i];
  async function load(){
   if(!valid())return;const run=++ticket;rows.replaceChildren();status.textContent='';
   try{
    const response=await client.request('companyJoin.list',selected?{id:selected}:{offset});
    if(run!==ticket||!valid())return;
    if(!Array.isArray(response.requests))throw Error();
    const items=selected?response.requests.filter(r=>r.id===selected):response.requests;
    if(!items.length)rows.append(node('p',txt(20)));
    for(const r of items){
     const entry=node('article'),controls=node('div');entry.className='wf-join-request';entry.append(node('strong',r.name),node('span',r.username));
     if(r.createdAt&&Number.isFinite(Date.parse(r.createdAt)))entry.append(node('time',new Date(r.createdAt).toLocaleString(locale)));
     entry.append(node('small',txt({pending:9,approved:10,rejected:11}[r.state])),controls);rows.append(entry);
     if(r.state!=='pending')continue;
     function actions(){
      controls.replaceChildren();
      for(const [decision,i] of [['approved',16],['rejected',17]])controls.append(btn(txt(i),()=>{
       controls.replaceChildren(node('strong',txt(i)+' · '+r.name),btn(txt(19),actions));
       const confirm=btn(txt(18),async()=>{
        if(!valid())return;confirm.disabled=true;
        try{await client.request('companyJoin.decide',{id:r.id,decision});if(valid())await load();}
        catch{status.textContent=txt(27);confirm.disabled=false;}
       });controls.append(confirm);confirm.focus();
      }));
     }
     actions();
    }
    if(selected){rows.append(btn(txt(13),()=>{selected=null;offset=0;load();}));return;}
    if(offset>0)rows.append(btn(txt(21),()=>{offset=Math.max(0,offset-50);load();}));
    if(items.length&&offset+items.length<response.total)rows.append(btn(txt(22),()=>{offset+=items.length;load();}));
   }catch{if(valid()&&run===ticket)status.textContent=txt(27);}
  }
  function open(){
   reading?.dispose();body.replaceChildren();drawn=true;qr(body,link(base,workspace),txt(14),locale);
   reading=scanner(body,base,locale,'review',workspace,url=>{selected=new URL(url).searchParams.get('reviewJoin');offset=0;load();});
   body.append(btn(txt(15),load),status,rows);load();
  }
  summary.textContent=txt(13);details.ontoggle=()=>{if(details.open&&!drawn)open();else if(!details.open)reading?.stop();};
  if(selected){details.open=true;open();}
  return {updateLanguage(l){if(l===locale)return;locale=l;summary.textContent=txt(13);if(drawn)open();},dispose(){ticket++;reading?.dispose();details.remove();}};
 }
 root.WFCompanyJoin={mountApplicant,mountOwner,link,readLink};
})(globalThis);
