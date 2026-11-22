(function(root){
  'use strict';
  const labels={
    ar:['تأكيد','إلغاء','موافق'],en:['Confirm','Cancel','OK'],tr:['Onayla','İptal','Tamam'],
    fr:['Confirmer','Annuler','OK'],ru:['Подтвердить','Отмена','ОК']
  };
  let active=null;
  function open(message,notice){
    if(active)return Promise.resolve(false);
    const doc=root.document,language=String(doc.documentElement.lang||'ar').split('-')[0];
    const [confirm,cancel,ok]=labels[language]||labels.en;
    const dialog=doc.createElement('dialog'),description=doc.createElement('p'),actions=doc.createElement('div');
    const previous=doc.activeElement;
    description.id='wfDialogMessage';description.textContent=String(message);
    dialog.className='wf-app-dialog';dialog.setAttribute('role',notice?'dialog':'alertdialog');
    dialog.setAttribute('aria-labelledby',description.id);
    actions.className='wf-app-dialog-actions';
    function button(label,primary){
      const el=doc.createElement('button');el.type='button';el.className='btn '+(primary?'btn-p':'btn-s');el.textContent=label;
      actions.append(el);return el;
    }
    const negative=notice?null:button(cancel,false),positive=button(notice?ok:confirm,true);
    dialog.append(description,actions);doc.body.append(dialog);active=dialog;
    return new Promise(resolve=>{
      const finish=value=>{
        if(active!==dialog)return;
        active=null;if(dialog.open)dialog.close();dialog.remove();
        if(previous?.isConnected)previous.focus({preventScroll:true});
        resolve(value);
      };
      if(negative)negative.onclick=()=>finish(false);
      positive.onclick=()=>finish(true);
      dialog.oncancel=e=>{e.preventDefault();finish(false);};
      dialog.onclose=()=>finish(false);
      try{dialog.showModal();(negative||positive).focus();}catch{finish(false);}
    });
  }
  root.WFDialog=Object.freeze({confirm:message=>open(message,false),alert:message=>open(message,true)});
})(window);
