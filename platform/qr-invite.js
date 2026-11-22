/* WOW owner-invitation QR: uses the original robot-face vector from assets/mark-robot-logo.svg.
   The setup token is sensitive. It is shared only on an explicit user action. */
(() => {
  'use strict';
  const ns='http://www.w3.org/2000/svg';
  const words={
    ar:['مشاركة صورة QR','مشاركة الدعوة كنص','حفظ صورة QR','نسخ الرابط','دعوة مالك الشركة','شارك هذه الدعوة مع مالك الشركة فقط؛ قد تسمح بإنشاء حساب المالك.','حُفظت الصورة','تم نسخ رابط الدعوة','تعذّرت المشاركة؛ يمكنك حفظ الصورة أو نسخ الرابط.'],
    en:['Share QR image','Share invitation text','Save QR image','Copy invitation link','Company owner invitation','Share this invitation only with the company owner; it can enable owner account setup.','Image saved','Invitation link copied','Sharing unavailable; save the image or copy the link.'],
    tr:['QR görselini paylaş','Davet metnini paylaş','QR görselini kaydet','Davet bağlantısını kopyala','Şirket sahibi daveti','Bu daveti yalnızca şirket sahibiyle paylaşın; sahip hesabı oluşturulabilir.','Görsel kaydedildi','Bağlantı kopyalandı','Paylaşım kullanılamıyor; görseli kaydedin veya bağlantıyı kopyalayın.'],
    fr:['Partager l’image QR','Partager le texte','Enregistrer l’image QR','Copier le lien','Invitation du propriétaire','Partagez cette invitation uniquement avec le propriétaire. Elle permet de créer son compte.','Image enregistrée','Lien copié','Partage indisponible ; enregistrez l’image ou copiez le lien.'],
    ru:['Поделиться QR-изображением','Поделиться текстом','Сохранить QR','Копировать ссылку','Приглашение владельца','Делитесь приглашением только с владельцем: оно позволяет создать аккаунт.','Изображение сохранено','Ссылка скопирована','Не удалось поделиться. Сохраните изображение или скопируйте ссылку.']
  };
  const labels=()=>words[document.documentElement.lang]||words.ar;
  const E=(tag,cls,text)=>{const el=document.createElement(tag);if(cls)el.className=cls;if(text!=null)el.textContent=text;return el;};
  const originalRobot=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="60 -70 480 480">
    <rect x="60" y="-70" width="480" height="480" rx="84" fill="#eff5f6"/>
    <defs><g id="eye"><path d="M -29 -70 Q 0 -80 29 -70" fill="none" stroke="#171923" stroke-width="7" stroke-linecap="round"/>
    <ellipse rx="34" ry="50" fill="#171923"/><ellipse cx="-10" cy="-18" rx="10" ry="13" fill="#fff"/>
    <circle cx="13" cy="19" r="4" fill="#d7d7dd"/></g></defs>
    <use href="#eye" transform="translate(174 147.84)"/><use href="#eye" transform="translate(426 147.84)"/>
    <path d="M 274 252.72 Q 300 273.72 326 252.72" fill="none" stroke="#171923" stroke-width="9" stroke-linecap="round"/>
  </svg>`;
  function markQr(svg){
    if(!svg?.classList?.contains('platform-setup-qr')||svg.querySelector('[data-wow-robot-qr]'))return svg;
    const box=document.createElementNS(ns,'rect');
    box.setAttribute('x','282');box.setAttribute('y','282');box.setAttribute('width','96');box.setAttribute('height','96');
    box.setAttribute('rx','18');box.setAttribute('fill','#fff');box.setAttribute('data-wow-robot-qr','');
    const icon=document.importNode(new DOMParser().parseFromString(originalRobot,'image/svg+xml').documentElement,true);
    icon.setAttribute('x','288');icon.setAttribute('y','288');icon.setAttribute('width','84');icon.setAttribute('height','84');
    icon.setAttribute('aria-hidden','true');svg.append(box,icon);
    return svg;
  }
  function download(blob,name){
    const address=URL.createObjectURL(blob),anchor=E('a');anchor.href=address;anchor.download=name;
    anchor.style.display='none';document.body.append(anchor);anchor.click();anchor.remove();
    setTimeout(()=>URL.revokeObjectURL(address),1200);
  }
  function svgPng(svg){
    return new Promise((resolve,reject)=>{
      const source=new Blob([new XMLSerializer().serializeToString(svg)],{type:'image/svg+xml;charset=utf-8'});
      const img=new Image(),url=URL.createObjectURL(source);
      img.onload=()=>{
        URL.revokeObjectURL(url);
        const canvas=document.createElement('canvas');canvas.width=960;canvas.height=1160;
        const ctx=canvas.getContext('2d');
        ctx.fillStyle='#ffffff';ctx.fillRect(0,0,960,1160);
        ctx.fillStyle='#3f7c94';ctx.fillRect(0,0,960,16);
        ctx.textAlign='center';ctx.fillStyle='#213a48';ctx.font='bold 52px system-ui, sans-serif';
        ctx.fillText('WOW FURNITURE',480,115);
        ctx.fillStyle='#5d7180';ctx.font='32px system-ui, sans-serif';ctx.fillText('MARK ROBOT · ADMIN',480,167);
        ctx.fillStyle='#fff';ctx.fillRect(105,205,750,750);ctx.drawImage(img,125,225,710,710);
        ctx.fillStyle='#314b5d';ctx.font='bold 29px system-ui, sans-serif';ctx.fillText('SCAN TO OPEN OWNER INVITATION',480,1020);
        ctx.fillStyle='#738697';ctx.font='25px system-ui, sans-serif';ctx.fillText('WOW · Private invitation',480,1070);
        canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('PNG_EXPORT_FAILED')),'image/png');
      };
      img.onerror=()=>{URL.revokeObjectURL(url);reject(new Error('QR_RENDER_FAILED'));};
      img.src=url;
    });
  }
  function attach(container,{svg,url,name='WOW'}) {
    if(!container||!svg||!url||container.querySelector('.platform-qr-actions'))return;
    markQr(svg);
    const w=labels(),buttons=E('div','platform-qr-actions'),note=E('p','platform-qr-note',w[5]),status=E('p','platform-qr-feedback');
    status.setAttribute('role','status');
    const imagePromise=svgPng(svg).catch(()=>null);
    const filename='WOW-Owner-Invitation.png';
    const text=w[4]+': '+url;
    const copy=async()=>{
      try{await navigator.clipboard.writeText(url);status.textContent=w[7];}
      catch{status.textContent=w[8];}
    };
    const add=(kind,index,action)=>{
      const btn=E('button','platform-qr-'+kind,w[index]);btn.type='button';
      btn.addEventListener('click',async()=>{
        btn.disabled=true;try{await action();}catch(error){if(error?.name!=='AbortError')status.textContent=w[8];}
        finally{if(btn.isConnected)btn.disabled=false;}
      });
      buttons.append(btn);
    };
    add('share-image',0,async()=>{
      const blob=await imagePromise;if(!blob){status.textContent=w[8];return;}
      const file=new File([blob],filename,{type:'image/png'});
      if(typeof navigator.share==='function'&&navigator.canShare?.({files:[file]})){
        await navigator.share({title:w[4],files:[file]});
      }else{download(blob,filename);status.textContent=w[6];}
    });
    add('share-text',1,async()=>{
      if(typeof navigator.share==='function')await navigator.share({title:w[4],text,url});
      else await copy();
    });
    add('save',2,async()=>{const blob=await imagePromise;if(!blob){status.textContent=w[8];return;}download(blob,filename);status.textContent=w[6];});
    add('copy',3,copy);
    container.append(buttons,note,status);
  }
  window.WFPlatformInviteShare=Object.freeze({markQr,attach});
})();
