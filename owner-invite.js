(function(root){
  'use strict';
  const labels={
    ar:['دعوة مالك الشركة','مسح رمز QR بالكاميرا','رابط دعوة المالك','فتح الدعوة','إيقاف الكاميرا','تعذرت قراءة الدعوة. تحقق من رابط WOW ورمز الإعداد.','تعذّر فتح الكاميرا. تحقق من الإذن أو الصق الرابط.'],
    en:['Company owner invitation','Scan the QR code with camera','Owner invitation link','Open invitation','Stop camera','Check the WOW invitation link and setup code.','Camera unavailable. Check permission or paste the link.'],
    tr:['Şirket sahibi daveti','Kamerayla QR kodunu tara','Sahip davet bağlantısı','Daveti aç','Kamerayı kapat','WOW davet bağlantısını ve kurulum kodunu kontrol edin.','Kamera açılamadı. İzni kontrol edin veya bağlantıyı yapıştırın.'],
    fr:['Invitation du propriétaire','Scanner le code QR avec la caméra','Lien d’invitation du propriétaire','Ouvrir l’invitation','Arrêter la caméra','Vérifiez le lien WOW et le code de configuration.','Caméra indisponible. Vérifiez l’autorisation ou collez le lien.'],
    ru:['Приглашение владельца','Сканировать QR-код камерой','Ссылка-приглашение владельца','Открыть приглашение','Остановить камеру','Проверьте ссылку WOW и код настройки.','Камера недоступна. Проверьте разрешение или вставьте ссылку.']
  };
  const scriptUrl=root.document?.currentScript?.src;
  let decoderLoad;
  function decoder(){
    if(root.ZXingBrowser)return Promise.resolve(root.ZXingBrowser);
    if(root.qblLoadFallback)return root.qblLoadFallback();
    if(!decoderLoad)decoderLoad=new Promise((resolve,reject)=>{
      const script=document.createElement('script');
      script.src=new URL('vendor/zxing-browser.min.js?v=26',scriptUrl).href;
      const fail=()=>{script.remove();decoderLoad=null;reject(new Error('SCANNER_UNAVAILABLE'));};
      script.onload=()=>root.ZXingBrowser?resolve(root.ZXingBrowser):fail();
      script.onerror=fail;document.head.append(script);
    });
    return decoderLoad;
  }
  function parse(value,base){
    try{
      const url=new URL(value),target=new URL('platform/',base);
      if(url.origin!==target.origin||!['https:','http:'].includes(url.protocol)||url.username||url.password||
        ![target.pathname,target.pathname+'index.html'].includes(url.pathname))return null;
      const workspace=url.searchParams.get('setup'),claim=/^#invite=([a-f0-9]{64})$/.exec(url.hash);
      if(!claim||!/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(workspace)||[...url.searchParams].length!==1)return null;
      target.searchParams.set('setup',workspace);target.hash='invite='+claim[1];return target.href;
    }catch{return null;}
  }
  if(typeof module==='object'&&module.exports){module.exports={parse};return;}
  const doc=root.document;
  function mount(container,base,lang,options={}){
    const create=tag=>doc.createElement(tag),details=create('details'),summary=create('summary'),panel=create('div'),
      start=create('button'),stop=create('button'),label=create('label'),labelText=create('span'),input=create('input'),
      open=create('button'),video=create('video'),status=create('p');
    details.className='wf-owner-invite';details.append(summary,panel);panel.append(start,video,stop,label,open,status);label.append(labelText,input);
    video.playsInline=true;video.muted=true;video.hidden=stop.hidden=true;input.type='url';input.autocomplete='off';input.dir='ltr';
    input.spellcheck=false;start.type=stop.type=open.type='button';status.setAttribute('role','status');
    const text=i=>options.labels?.(lang)?.[i]||(labels[lang]||labels.en)[i];
    function translate(value){lang=value;[summary,start,labelText,open,stop].forEach((node,i)=>{node.textContent=text(i);});}
    let generation=0,stream=null,timer;
    function end(){generation++;clearTimeout(timer);stream?.getTracks().forEach(track=>track.stop());stream=null;
      video.srcObject=null;video.hidden=stop.hidden=true;start.disabled=false;}
    function accept(raw){const url=options.parse?options.parse(raw,base):parse(raw,base);if(!url){status.textContent=text(5);return false;}
      end();input.value='';if(options.onAccept)options.onAccept(url);else root.location.assign(url);return true;}
    start.onclick=async()=>{
      end();const ticket=generation;start.disabled=true;stop.hidden=false;status.textContent='';
      try{
        const acquired=await navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:{ideal:'environment'}}});
        if(ticket!==generation){acquired.getTracks().forEach(track=>track.stop());return;}
        stream=acquired;video.srcObject=acquired;video.hidden=false;await video.play();
        let native;
        if(root.BarcodeDetector)try{
          const supported=await root.BarcodeDetector.getSupportedFormats?.();
          if(!supported||supported.includes('qr_code'))native=new root.BarcodeDetector({formats:['qr_code']});
        }catch{}
        const reader=native?null:new (await decoder()).BrowserQRCodeReader();
        async function scan(){
          if(ticket!==generation)return;
          let raw;
          try{if(native)raw=(await native.detect(video))[0]?.rawValue;else if(video.readyState>=2)raw=reader.decode(video).getText();}catch{}
          if(ticket!==generation)return;
          if(raw&&accept(raw))return;
          timer=setTimeout(scan,250);
        }
        await scan();
      }catch{if(generation===ticket){end();status.textContent=text(6);}}
    };
    stop.onclick=end;open.onclick=()=>accept(input.value.trim());details.ontoggle=()=>{if(!details.open)end();};
    function hide(){if(doc.hidden)end();}
    root.addEventListener('pagehide',end);doc.addEventListener('visibilitychange',hide);
    container.append(details);translate(lang);
    return {updateLanguage:translate,stop:end,dispose(){end();root.removeEventListener('pagehide',end);doc.removeEventListener('visibilitychange',hide);details.remove();}};
  }
  root.WFOwnerInvite={mount,parse,loadQrTools:decoder};
})(globalThis);
