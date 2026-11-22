(()=>{
 const words={
 ar:['استعادة حساب المالك','كلمة مرور جديدة من 12 إلى 128 محرفاً','حفظ','تم تغيير كلمة المرور. سجّل الدخول مجدداً.','تعذّرت الاستعادة. اطلب رابطاً جديداً.'],
 en:['Recover owner account','New password (12 to 128 characters)','Save','Password changed. Sign in again.','Recovery failed. Request a new link.'],
 tr:['Sahip hesabını kurtar','Yeni parola (12–128 karakter)','Kaydet','Parola değiştirildi. Tekrar giriş yapın.','Kurtarma başarısız. Yeni bir bağlantı isteyin.'],
 fr:['Récupérer le compte propriétaire','Nouveau mot de passe (12 à 128 caractères)','Enregistrer','Mot de passe modifié. Reconnectez-vous.','Échec de la récupération. Demandez un nouveau lien.'],
 ru:['Восстановление учётной записи владельца','Новый пароль (12–128 символов)','Сохранить','Пароль изменён. Войдите снова.','Не удалось восстановить доступ. Запросите новую ссылку.']};
 const pref=navigator.language.split('-')[0],lang=words[pref]?pref:'en',w=words[lang],doc=document;
 doc.documentElement.lang=lang;doc.documentElement.dir=lang==='ar'?'rtl':'ltr';
 const el=id=>doc.getElementById(id),form=el('reset'),pass=el('pass'),save=el('save'),status=el('status');
 doc.title=el('title').textContent=w[0];el('label').textContent=w[1];save.textContent=w[2];
 let proof=takeOwnerProof();
 if(!proof?.requestId||!proof.tokenHash){form.hidden=true;status.textContent=w[4];return;}
 form.onsubmit=async e=>{
  e.preventDefault();if(save.disabled)return;
  const length=Array.from(pass.value).length;if(length<12||length>128){pass.setCustomValidity(w[1]);pass.reportValidity();return;}
  save.disabled=true;
  try{const config=window.WOW_CLOUD_CONFIG;const res=await fetch(config.endpoint,{method:'POST',redirect:'error',cache:'no-store',credentials:'omit',
   headers:{'Content-Type':'application/json',apikey:config.publishableKey},body:JSON.stringify({action:'auth.platformOwnerRecovery',...proof,newPassword:pass.value})});
   if(!res.ok||!(await res.json()).changed)throw Error();status.textContent=w[3];
  }catch{status.textContent=w[4];}finally{pass.value='';proof=null;form.hidden=true;}
 };pass.oninput=()=>pass.setCustomValidity('');
})();
