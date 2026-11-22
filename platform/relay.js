(() => {
  'use strict';
  const words={
    ar:['تمرير المكالمات','يساعد تمرير الصوت والفيديو عبر Cloudflare عند تعذّر الاتصال المباشر بين الهاتفين.','الحالة','مفعّل','متوقف','إعداد خدمة Cloudflare غير مكتمل.','الحصة الشهرية المشتركة','سعر كل جيجابايت إضافية','استهلاك تمرير المكالمات','المتبقي من حصة الفوترة','غير متاح','الحصة مشتركة مع خدمات Realtime الأخرى. عدّاد المكالمات يخص الشهر الميلادي بتوقيت UTC.','أسعار Cloudflare','فوترة Cloudflare','راجعت التسعير وأوافق على احتساب التجاوز من حساب Cloudflare.','تفعيل التمرير','إيقاف التمرير','عند الإيقاف يتوقف إصدار التصاريح الجديدة. قد تبقى التصاريح السابقة صالحة لساعتين.','تحديث','تعذّر التحقق من الحالة. حدّث البيانات قبل إجراء تغيير آخر.','جارٍ التحقق…'],
    en:['Call relay','Relay voice and video through Cloudflare when the phones cannot connect directly.','Status','Enabled','Off','Cloudflare relay setup is incomplete.','Shared monthly allowance','Price per additional GB','Call relay usage','Remaining billing allowance','Unavailable','Other Realtime services share this allowance. Call relay usage covers the UTC calendar month.','Cloudflare pricing','Cloudflare billing','I reviewed the rates and accept overage charges to this Cloudflare account.','Enable relay','Turn off relay','Turning off the relay stops new credentials. Existing credentials can last up to two hours.','Refresh','Could not verify the status. Refresh before making another change.','Checking…'],
    tr:['Arama aktarımı','Telefonlar doğrudan bağlanamadığında ses ve görüntüyü Cloudflare üzerinden aktarır.','Durum','Etkin','Kapalı','Cloudflare aktarım kurulumu eksik.','Ortak aylık kota','Ek GB başına fiyat','Arama aktarımı kullanımı','Kalan fatura kotası','Kullanılamıyor','Diğer Realtime hizmetleri bu kotayı paylaşır. Arama kullanımı UTC takvim ayını kapsar.','Cloudflare fiyatları','Cloudflare faturaları','Fiyatları inceledim ve bu Cloudflare hesabına yansıtılan aşım ücretlerini kabul ediyorum.','Aktarımı etkinleştir','Aktarımı kapat','Kapatınca yeni erişim bilgisi verilmez. Mevcut bilgiler iki saate kadar geçerli kalabilir.','Yenile','Durum doğrulanamadı. Başka bir değişiklik yapmadan önce yenileyin.','Kontrol ediliyor…'],
    fr:['Relais d’appels','Transmet la voix et la vidéo via Cloudflare lorsque les téléphones ne peuvent pas se connecter directement.','État','Activé','Désactivé','La configuration du relais Cloudflare est incomplète.','Quota mensuel partagé','Prix par Go supplémentaire','Consommation du relais','Quota de facturation restant','Indisponible','Les autres services Realtime partagent ce quota. La consommation du relais couvre le mois civil en UTC.','Tarifs Cloudflare','Facturation Cloudflare','J’ai consulté les tarifs et j’accepte les frais de dépassement sur ce compte Cloudflare.','Activer le relais','Désactiver le relais','La désactivation interrompt la délivrance de nouveaux accès. Les accès existants restent valables jusqu’à deux heures.','Actualiser','Impossible de vérifier l’état. Actualisez avant toute nouvelle modification.','Vérification…'],
    ru:['Ретрансляция','Передаёт голос и видео через Cloudflare, когда телефоны не могут соединиться напрямую.','Состояние','Включено','Выключено','Настройка ретрансляции Cloudflare не завершена.','Общая месячная квота','Цена за дополнительный ГБ','Трафик ретрансляции','Остаток квоты по счёту','Недоступно','Квота общая с другими сервисами Realtime. Трафик измеряется за календарный месяц по UTC.','Тарифы Cloudflare','Счета Cloudflare','Я ознакомился с тарифами и принимаю оплату за превышение квоты в этом аккаунте Cloudflare.','Включить ретрансляцию','Выключить ретрансляцию','После выключения новые разрешения не выдаются. Текущие действуют до двух часов.','Обновить','Не удалось проверить состояние. Обновите данные перед изменением.','Проверка…']
  };
  const serviceWords={
    ar:['معلومات السيرفر','خدمة Mark Robot','متاح','تعذّر الوصول','آخر فحص','فتح مشروع Supabase','فحص الخدمة'],
    en:['Server information','Mark Robot service','Available','Unreachable','Last checked','Open Supabase project','Check service'],
    fr:['Informations serveur','Service Mark Robot','Disponible','Injoignable','Dernière vérification','Ouvrir le projet Supabase','Vérifier le service'],
    tr:['Sunucu bilgileri','Mark Robot hizmeti','Erişilebilir','Ulaşılamıyor','Son kontrol','Supabase projesini aç','Hizmeti denetle'],
    ru:['Сведения о сервере','Сервис Mark Robot','Доступен','Недоступен','Последняя проверка','Открыть проект Supabase','Проверить сервис']
  };
  const capabilities={
    ar:['زمن الاستجابة','تمرير المكالمات','رسائل الطلبات SMS','كشوف الحساب بالبريد','كشوف الحساب عبر واتساب','مُعدّ','غير مُعدّ'],
    en:['Response time','Call relay','Order SMS','Statements by email','Statements via WhatsApp','Configured','Unconfigured'],
    tr:['Yanıt süresi','Arama aktarma','Sipariş SMS','E-posta ile ekstre','WhatsApp ile ekstre','Yapılandırıldı','Yapılandırılmadı'],
    fr:['Temps de réponse','Relais des appels','SMS de commande','Relevés par e-mail','Relevés via WhatsApp','Configuré','Non configuré'],
    ru:['Время отклика','Ретрансляция звонков','SMS о заказе','Выписки по почте','Выписки в WhatsApp','Настроено','Не настроено']
  };
  function mount(host,lang,request){
    const t=words[lang]||words.ar;
    const make=(tag,text)=>{const e=document.createElement(tag);if(text!=null)e.textContent=text;return e;};
    const description=make('p',t[1]),body=make('div'),feedback=make('p'),refresh=make('button',t[18]);
    feedback.setAttribute('role','status');refresh.type='button';host.append(description,body,feedback,refresh);
    const unit=new Intl.NumberFormat(lang,{style:'unit',unit:'gigabyte',unitDisplay:'short',maximumFractionDigits:3});
    const usd=new Intl.NumberFormat(lang,{style:'currency',currency:'USD',currencyDisplay:'code',maximumFractionDigits:4});
    const value=(n,fmt)=>Number.isFinite(n)&&n>=0?fmt.format(n):t[10];
    function link(title,href){const a=make('a',title);a.href=href;a.target='_blank';a.rel='noopener noreferrer';return a;}
    const config=window.WOW_CLOUD_CONFIG,service=serviceWords[lang]||serviceWords.ar;
    const info=make('section'),health=make('p'),checked=make('p'),check=make('button',service[6]);
    info.className='platform-server-info';health.setAttribute('role','status');check.type='button';
    const endpoint=new URL(config.endpoint,location.href);
    const address=make('bdi',endpoint.hostname);
    const details=make('dl'),labels=capabilities[lang]||capabilities.ar;
    info.append(make('h3',service[0]),address,health,details,checked,check);
    if(/^[a-z0-9]{20}$/.test(config.projectRef)&&endpoint.hostname===config.projectRef+'.supabase.co'){
      info.append(link(service[5],'https://supabase.com/dashboard/project/'+config.projectRef));
    }
    host.append(info);
    async function checkService(){
      if(check.disabled)return;
      check.disabled=true;health.textContent=t[20];checked.textContent='';
      details.replaceChildren();const started=performance.now();
      const stop=new AbortController(),timeout=setTimeout(()=>stop.abort(),10000);
      try{
        const url=new URL(endpoint);url.pathname=url.pathname.replace(/\/$/,'')+'/health';url.search='';url.hash='';
        const response=await fetch(url,{method:'GET',cache:'no-store',credentials:'omit',redirect:'error',signal:stop.signal});
        const data=await response.json();
        if(!response.ok||data.ok!==true||data.service!=='mark-robot')throw Error();
        health.textContent=service[1]+' · '+service[2];
        const timing=new Intl.NumberFormat(lang,{style:'unit',unit:'millisecond'}).format(Math.round(performance.now()-started));
        details.append(make('dt',labels[0]),make('dd',timing));
        const flags=[data.turnConfigured,data.orderSmsConfigured,data.statementChannels?.email,data.statementChannels?.whatsapp];
        flags.forEach((flag,index)=>details.append(make('dt',labels[index+1]),make('dd',typeof flag==='boolean'?labels[flag?5:6]:t[10])));
      }catch{health.textContent=service[1]+' · '+service[3];}
      finally{
        clearTimeout(timeout);check.disabled=false;
        checked.textContent=service[4]+' · '+new Intl.DateTimeFormat(lang,{dateStyle:'medium',timeStyle:'medium'}).format(new Date());
      }
    }
    check.onclick=checkService;checkService();
    function draw(state){
      if(typeof state?.enabled!=='boolean'||typeof state?.configured!=='boolean'||typeof state?.active!=='boolean')throw Error();
      const readings=make('dl');
      function add(label,text){const entry=make('dd');entry.append(make('bdi',text));readings.append(make('dt',label),entry);}
      add(t[2],!state.configured?t[5]:state.active?t[3]:t[4]);
      add(t[6],value(state.includedGb,unit));add(t[7],value(state.overageUsdPerGb,usd));
      add(t[8],value(state.turnEgressBytes==null?null:state.turnEgressBytes/1e9,unit));
      add(t[9],value(state.remainingGb,unit));
      const resources=make('div');resources.className='platform-relay-links';
      resources.append(link(t[12],'https://developers.cloudflare.com/realtime/sfu/platform/pricing/'),link(t[13],'https://dash.cloudflare.com/?to=/:account/billing'));
      const form=make('form'),submit=make('button',t[state.enabled?16:15]);submit.type='submit';
      const checkbox=make('input');checkbox.type='checkbox';checkbox.required=true;
      if(!state.enabled){
        const label=make('label');label.append(checkbox,make('span',t[14]));form.append(label);submit.disabled=true;
        const canEnable=state.configured&&Number.isFinite(state.includedGb)&&Number.isFinite(state.overageUsdPerGb);
        checkbox.disabled=!canEnable;checkbox.onchange=()=>{submit.disabled=!canEnable||!checkbox.checked;};
      }
      form.append(submit);
      form.onsubmit=event=>{
        event.preventDefault();if(refresh.disabled||submit.disabled)return;
        perform('relay.set',state.enabled?{enabled:false}:{enabled:true,acceptPricing:true});
      };
      body.replaceChildren(readings,make('p',t[11]),resources,make('p',t[17]),form);
    }
    async function perform(action,params={}){
      if(refresh.disabled)return;
      refresh.disabled=true;body.replaceChildren();feedback.textContent=t[20];
      try{const value=await request(action,params);if(host.isConnected){draw(value);feedback.textContent='';}}
      catch{if(host.isConnected)feedback.textContent=t[19];}
      finally{refresh.disabled=false;}
    }
    refresh.onclick=()=>perform('relay.get');perform('relay.get');
  }
  window.WFPlatformRelay=Object.freeze({mount});
})();
