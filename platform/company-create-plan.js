/* Founder new-company offer selection. All limits and prices come from the server plan catalog. */
(() => {
  'use strict';
  const labels={
    ar:['الاشتراك عند إنشاء الشركة','تحديد الباقة لاحقًا','اشتراك مدفوع','فترة تجريبية مجانية','الباقة','مدة الاشتراك بالأيام','البداية عند إنشاء الشركة','الانتهاء المتوقع','سعر الفترة','مجاني','جارٍ تحميل الباقات…','تعذّر تحميل الباقات','إعادة المحاولة','لا توجد باقات محفوظة. أضف باقة من إدارة الباقات.','اختر باقة','السعر غير محدد','تاريخ البداية','تاريخ الانتهاء'],
    en:['Subscription at creation','Assign a plan later','Paid subscription','Free trial','Plan','Duration in days','Starts when the company is created','Estimated end','Period price','Free','Loading plans…','Could not load plans','Retry','No saved plans. Add a plan in plan management.','Choose a plan','Price not set','Start date','End date'],
    tr:['Şirket kurulurken abonelik','Paketi daha sonra seç','Ücretli abonelik','Ücretsiz deneme','Paket','Süre (gün)','Şirket kurulunca başlar','Tahmini bitiş','Dönem ücreti','Ücretsiz','Paketler yükleniyor…','Paketler yüklenemedi','Yeniden dene','Kayıtlı paket yok. Paket yönetiminden ekleyin.','Paket seçin','Fiyat belirtilmedi','Başlangıç tarihi','Bitiş tarihi'],
    fr:['Abonnement à la création','Attribuer un forfait plus tard','Abonnement payant','Essai gratuit','Forfait','Durée en jours','Début à la création de la société','Fin prévue','Prix de la période','Gratuit','Chargement des forfaits…','Impossible de charger les forfaits','Réessayer','Aucun forfait enregistré. Ajoutez-en un dans la gestion des forfaits.','Choisir un forfait','Prix non défini','Date de début','Date de fin'],
    ru:['Подписка при создании','Выбрать тариф позже','Платная подписка','Бесплатный пробный период','Тариф','Длительность в днях','Начало при создании компании','Ожидаемое окончание','Цена за период','Бесплатно','Загрузка тарифов…','Не удалось загрузить тарифы','Повторить','Нет сохранённых тарифов. Добавьте тариф в управлении тарифами.','Выберите тариф','Цена не задана','Дата начала','Дата окончания']
  };
  const element=(tag,text)=>{const node=document.createElement(tag);if(text!=null)node.textContent=text;return node;};
  const option=(value,label)=>{const node=element('option',label);node.value=value;return node;};
  const iconPaths={
    plan:'M3 6h18v12H3zM3 10h18M7 14h4',days:'M4 5h16v16H4zM8 3v4m8-4v4M4 10h16',
    start:'M4 12h15m-6-6 6 6-6 6',end:'M3 12h13m-5-5 5 5-5 5m9-13v16',
    price:'M3 5h12l6 7-8 8L3 10ZM7 8h.01'
  };
  function icon(key){
    const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
    for(const [k,v] of Object.entries({viewBox:'0 0 24 24',width:18,height:18,fill:'none',stroke:'currentColor','stroke-width':1.7,'stroke-linecap':'round','stroke-linejoin':'round','aria-hidden':true}))svg.setAttribute(k,String(v));
    const path=document.createElementNS(svg.namespaceURI,'path');path.setAttribute('d',iconPaths[key]);svg.append(path);return svg;
  }
  const field=(form,title,input,key)=>{const label=element('label'),caption=element('span');caption.className='platform-plan-caption';caption.append(icon(key),document.createTextNode(title));label.append(caption,input);form.append(label);return label;};
  const date=(value,lang)=>new Intl.DateTimeFormat(lang,{dateStyle:'medium',timeStyle:'short'}).format(new Date(value));
  function price(plan,lang,w){
    if(plan.price==null||!plan.currency)return w[15];
    return new Intl.NumberFormat(lang,{style:'currency',currency:plan.currency,maximumFractionDigits:4}).format(Number(plan.price));
  }
  function mount({form,request,language}){
    const w=labels[language]||labels.ar,mode=element('select');
    mode.append(option('',w[1]),option('paid',w[2]),option('trial',w[3]));
    field(form,w[0],mode,'plan');
    const box=element('div'),plan=element('select'),days=element('input'),summary=element('output'),message=element('span'),retry=element('button');
    box.className='platform-create-plan';box.hidden=true;form.append(box);
    field(box,w[4],plan,'plan');field(box,w[5],days,'days');days.type='number';days.min='1';days.max='36500';days.step='1';
    retry.type='button';retry.textContent=w[12];retry.hidden=true;message.setAttribute('role','status');summary.setAttribute('aria-live','polite');
    box.append(summary,message,retry);
    let catalog=null,loading=false;
    function preview(){
      const p=catalog?.find(x=>x.id===plan.value),n=Number(days.value);
      summary.replaceChildren();
      if(!p||!Number.isInteger(n)||n<1||n>36500)return;
      const now=Date.now();
      for(const pair of [[w[6],date(now,language),'start'],[w[7],date(now+n*86400000,language),'end'],[w[8],mode.value==='trial'?w[9]:price(p,language,w),'price']]){
        const line=element('div'),label=element('span',pair[0]+' · '),value=element('strong',pair[1]);line.append(icon(pair[2]),label,value);summary.append(line);
      }
    }
    function selectPeriod(){
      const p=catalog?.find(x=>x.id===plan.value);
      days.value=mode.value==='trial'?'7':String(p?.durationDays||'');days.readOnly=mode.value==='paid'&&p?.durationDays!=null;
      preview();
    }
    async function load(){
      if(loading||catalog!==null)return;loading=true;message.textContent=w[10];retry.hidden=true;
      try{
        const result=await request('plans.list');if(!Array.isArray(result?.plans))throw Error();
        catalog=result.plans;plan.replaceChildren(option('',w[14]));
        for(const p of catalog)plan.append(option(p.id,p.name));
        message.textContent=catalog.length?'':w[13];
      }catch{message.textContent=w[11];retry.hidden=false;}
      finally{loading=false;}
    }
    mode.onchange=()=>{
      box.hidden=!mode.value;plan.disabled=days.disabled=!mode.value;plan.required=days.required=!!mode.value;
      if(mode.value){void load();selectPeriod();}
    };
    plan.onchange=selectPeriod;days.oninput=preview;retry.onclick=load;mode.onchange();
    return {selection(){
      if(!mode.value)return undefined;
      const p=catalog?.find(x=>x.id===plan.value),n=Number(days.value);
      if(!p||!Number.isInteger(n)||n<1||n>36500)throw Error('INVALID_LIMITS');
      return {mode:mode.value,planId:p.id,planVersion:p.version,durationDays:n};
    }};
  }
  function receipt(terms,language){
    const w=labels[language]||labels.ar,box=element('section');box.className='platform-create-plan-receipt';
    box.append(element('strong',(terms.mode==='trial'?w[3]:w[2])+' · '+terms.name));
    for(const [title,value] of [[w[16],date(terms.startsAt,language)],[w[17],date(terms.expiresAt,language)],[w[8],terms.mode==='trial'?w[9]:price(terms,language,w)]])box.append(element('p',title+' · '+value));
    return box;
  }
  window.WFCompanyCreatePlan=Object.freeze({mount,receipt});
})();
