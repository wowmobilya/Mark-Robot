/* In-page actions for an authenticated recipient's chat notification. */
(function(root){
  'use strict';
  const locales=['ar','en','tr','fr','ru'];
  const words={
    show:['عرض الرسالة','View message','Mesajı görüntüle','Voir le message','Показать сообщение'],
    reply:['الرد','Reply','Yanıt','Répondre','Ответить'],
    send:['إرسال الرد','Send reply','Yanıtı gönder','Envoyer la réponse','Отправить ответ'],
    sent:['تم إرسال الرد','Reply sent','Yanıt gönderildi','Réponse envoyée','Ответ отправлен'],
    unavailable:['تعذّر عرض الرسالة','Message unavailable','Mesaj görüntülenemiyor','Message indisponible','Сообщение недоступно'],
    failed:['تعذّر إرسال الرد','Could not send reply','Yanıt gönderilemedi','Échec de l’envoi','Не удалось отправить ответ']
  };
  const id=value=>typeof value==='string'&&/^[1-9]\d{0,17}$/.test(value);
  function mount(host,item,api){
    const initial=api.getSession(),{roomId,messageId}=item.params||{};
    const allowed=()=>{
      const now=api.getSession();
      return now?.authenticated&&now.userId===initial?.userId&&now.workspaceId===initial?.workspaceId&&
        now.sessionVersion===initial?.sessionVersion&&now.authGeneration===initial?.authGeneration&&api.can('chat.view');
    };
    if(item.kind!=='chat'||!initial?.userId||!initial.workspaceId||!allowed()||!id(messageId)||
      !/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(roomId))return {dispose(){}};
    const doc=host.ownerDocument,box=doc.createElement('div');
    const locale=typeof api.locale==='function'?api.locale():api.locale;
    const label=k=>words[k][Math.max(0,locales.indexOf(locale))];
    const el=(tag,text)=>{const n=doc.createElement(tag);if(text)n.textContent=text;return n;};
    const button=(key)=>{const b=el('button',label(key));b.type='button';b.className='btn';return b;};
    const view=button('show'),status=el('p'),result=el('div'),abort=new AbortController();
    let objectUrl,timer,expires=Infinity;
    const live=()=>!abort.signal.aborted&&allowed()&&Date.now()<expires;
    function dispose(){abort.abort();clearTimeout(timer);if(objectUrl)root.URL.revokeObjectURL(objectUrl);objectUrl=null;box.remove();}
    status.setAttribute('role','status');box.append(view,result,status);host.append(box);
    view.onclick=async()=>{
      if(!live()||view.disabled)return;view.disabled=true;status.textContent='';
      try{
        const feed=await api.request('chat.feed',{roomId,before:String(BigInt(messageId)+1n)});
        const message=feed.messages?.find(m=>m.id===messageId&&m.roomId===roomId);
        if(!message)throw Error();
        if(message.expiresAt){
          expires=Date.parse(message.expiresAt);
          if(expires-Date.now()<2147483647)timer=setTimeout(dispose,Math.max(0,expires-Date.now()));
        }
        if(!live())return;
        result.replaceChildren(el('p',message.text));
        if(message.asset?.kind==='image'){
          const handle=await api.request('chat.asset',{roomId,messageId});
          if(!live())return;
          const blob=await root.WFFileCore.downloadBlob(handle,abort.signal);
          if(!live()||!/^image\/(jpeg|png|webp|gif|avif)$/i.test(blob.type))return;
          objectUrl=root.URL.createObjectURL(blob);const image=el('img');
          image.src=objectUrl;image.alt=message.asset.name||label('show');image.style.maxWidth='100%';result.append(image);
        }
        view.hidden=true;
      }catch{if(live()){status.textContent=label('unavailable');view.disabled=false;}}
    };
    if(api.can('chat.edit')){
      const form=el('form'),field=el('textarea'),send=button('send');let attempt;
      field.className='fi';field.maxLength=8000;field.required=true;field.setAttribute('aria-label',label('reply'));field.placeholder=label('reply');
      send.type='submit';form.append(field,send);box.append(form);
      form.onsubmit=async event=>{
        event.preventDefault();if(!live()||!api.can('chat.edit')||send.disabled)return;
        const text=field.value.trim();if(!text)return;
        if(attempt?.text!==text)attempt={text,requestId:root.crypto.randomUUID()};
        send.disabled=true;field.readOnly=true;
        try{
          const receipt=await api.request('chat.send',{roomId,replyId:messageId,...attempt});
          if(!id(receipt?.id))throw Error();
          if(live()){field.value='';attempt=null;status.textContent=label('sent');}
        }catch{if(live())status.textContent=label('failed');}
        finally{if(live()){field.readOnly=false;send.disabled=false;}}
      };
    }
    return {dispose};
  }
  root.WFPushChat=Object.freeze({mount});
})(typeof window==='object'?window:globalThis);
