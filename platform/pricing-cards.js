/* WOW founder pricing cards: language-aware previews of authoritative plans.
   Template clicks populate the existing versioned editor; nothing is billed
   or assigned to a company until an explicit save and assignment. */
(() => {
  'use strict';
  const tiers=[
    {key:'month',id:'a0e8f0db-7cf8-4d2a-a230-10f4ddc44a01',name:'WOW Monthly',price:'100',days:30,months:1},
    {key:'year',id:'a0e8f0db-7cf8-4d2a-a230-10f4ddc44a02',name:'WOW Annual',price:'1000',days:365,months:12},
    {key:'twoYears',id:'a0e8f0db-7cf8-4d2a-a230-10f4ddc44a03',name:'WOW Two Years',price:'1800',days:730,months:24}
  ];
  const copy={
    ar:{title:'باقات WOW',lead:'اشتراكات مرتبطة بإدارة الشركات، قابلة للتعديل متى شئت',month:'الشهري',year:'السنوي',twoYears:'سنتان',
      day:'30 يومًا',annual:'365 يومًا',biennial:'730 يومًا',recommended:'الأكثر توفيرًا',saved:'محفوظة في النظام',
      draft:'قالب جاهز للحفظ',edit:'تعديل الباقة',create:'إنشاء الباقة',perMonth:'متوسط الشهر',noCharge:'الأسعار للعرض والإدارة فقط؛ لا يتم تحصيل دفعات تلقائيًا.',
      adjust:'اضبط السعر والمدة وحدود الحسابات والأجهزة والتخزين في المحرر قبل الحفظ',currency:'دولار أمريكي'},
    en:{title:'WOW plans',lead:'Editable, company-linked subscriptions in your existing manager',month:'Monthly',year:'Annual',twoYears:'Two years',
      day:'30 days',annual:'365 days',biennial:'730 days',recommended:'Best value',saved:'Saved in system',
      draft:'Ready to create',edit:'Edit plan',create:'Create plan',perMonth:'Monthly equivalent',noCharge:'Prices are for plan management only; no automatic billing.',
      adjust:'Adjust price, duration, seats, devices and storage in the editor before saving',currency:'US dollars'},
    tr:{title:'WOW paketleri',lead:'Şirketlerle bağlantılı, düzenlenebilir abonelikler',month:'Aylık',year:'Yıllık',twoYears:'İki yıl',
      day:'30 gün',annual:'365 gün',biennial:'730 gün',recommended:'En avantajlı',saved:'Sistemde kayıtlı',
      draft:'Oluşturulmaya hazır',edit:'Paketi düzenle',create:'Paket oluştur',perMonth:'Aylık ortalama',noCharge:'Fiyatlar sadece paket yönetimi içindir; otomatik ödeme alınmaz.',
      adjust:'Kaydetmeden önce fiyat, süre, kullanıcı, cihaz ve depolama sınırlarını düzenleyin',currency:'ABD doları'},
    fr:{title:'Formules WOW',lead:'Abonnements modifiables et liés aux sociétés',month:'Mensuelle',year:'Annuelle',twoYears:'Deux ans',
      day:'30 jours',annual:'365 jours',biennial:'730 jours',recommended:'Le plus avantageux',saved:'Enregistrée',
      draft:'Prête à créer',edit:'Modifier',create:'Créer',perMonth:'Équivalent mensuel',noCharge:'Prix indicatifs pour la gestion ; aucun débit automatique.',
      adjust:'Réglez prix, durée, comptes, appareils et stockage avant enregistrement',currency:'Dollars américains'},
    ru:{title:'Тарифы WOW',lead:'Редактируемые подписки, связанные с компаниями',month:'Месячный',year:'Годовой',twoYears:'Два года',
      day:'30 дней',annual:'365 дней',biennial:'730 дней',recommended:'Самый выгодный',saved:'Сохранён',
      draft:'Готов к созданию',edit:'Изменить тариф',create:'Создать тариф',perMonth:'За месяц',noCharge:'Цены только для управления тарифами; автоматических списаний нет.',
      adjust:'Перед сохранением измените цену, срок, пользователей, устройства и хранилище',currency:'Доллары США'}
  };
  const benefitCopy={
    ar:['هواتف للموظفين (المالك مستثنى)','تخزين سحابي','دقيقة صوت / شهر','دقيقة فيديو / شهر',
        '+10 $ / شهر للهاتف الإضافي','+20 $ / شهر لمضاعفة المكالمات والتخزين','حدود فعلية مرتبطة بالشركة'],
    en:['Staff phones (owner excluded)','Cloud storage','voice minutes / month','video minutes / month',
        '+$10 / month for an extra phone','+$20 / month to double calls and storage','Real company-linked allowances'],
    tr:['Çalışan telefonu (sahip hariç)','Bulut depolama','sesli dakika / ay','video dakika / ay',
        'Ek telefon +10 $ / ay','Arama ve depolama iki katı +20 $ / ay','Şirkete bağlı gerçek limitler'],
    fr:['Téléphones employés (hors propriétaire)','Stockage cloud','minutes audio / mois','minutes vidéo / mois',
        '+10 $ / mois par téléphone','+20 $ / mois : doubler appels et stockage','Limites réellement liées à la société'],
    ru:['Телефоны работников (без владельца)','Облачное хранилище','минут аудио / месяц','минут видео / месяц',
        '+10 $ / месяц за телефон','+20 $ / месяц удвоить звонки и хранилище','Действующие лимиты компании']
  };
  const whatsappNumber='905386263700'; // Turkish mobile, E.164 without the plus for wa.me.
  const activationEmail='www.mutez@gmail.com'; // Customer-supplied address, retained exactly as provided.
  // Recognizable WhatsApp brand mark (Simple Icons WhatsApp, 24x24); inline, no network request.
  const whatsappPath='M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z';
  const contactCopy={
    ar:{heading:'التواصل لتفعيل الاشتراك',info:'طلب التفعيل يُرسل للإدارة ولا يفعّل الباقة تلقائيًا.',whatsapp:'واتساب',call:'اتصال هاتفي',email:'البريد الإلكتروني'},
    en:{heading:'Subscription activation contact',info:'The request goes to the administrator. It does not activate a plan automatically.',whatsapp:'WhatsApp',call:'Call',email:'Email'},
    tr:{heading:'Abonelik etkinleştirme iletişimi',info:'Talep yöneticinize iletilir; paket otomatik etkinleşmez.',whatsapp:'WhatsApp',call:'Telefon',email:'E-posta'},
    fr:{heading:'Contact pour activer l’abonnement',info:'La demande est transmise à l’administrateur, sans activation automatique.',whatsapp:'WhatsApp',call:'Téléphone',email:'E-mail'},
    ru:{heading:'Связь для активации подписки',info:'Запрос отправляется администратору; подписка не включается автоматически.',whatsapp:'WhatsApp',call:'Позвонить',email:'Эл. почта'}
  };
  const activationCopy={
    ar:{button:'طلب التفعيل عبر واتساب',message:(name,amount,days)=>`مرحبًا، أريد طلب تفعيل اشتراك ${name} في WOW Furniture بسعر ${amount} لمدة ${days} يومًا. الرجاء توضيح خطوات التفعيل.`},
    en:{button:'Request activation on WhatsApp',message:(name,amount,days)=>`Hello, I'd like to request activation of the WOW Furniture ${name} plan for ${amount}, duration ${days} days. Please share the activation steps.`},
    tr:{button:'WhatsApp üzerinden etkinleştirme iste',message:(name,amount,days)=>`Merhaba, WOW Furniture ${name} paketini ${days} gün için ${amount} fiyatla etkinleştirmek istiyorum. Aktivasyon adımlarını paylaşır mısınız?`},
    fr:{button:'Demander l’activation sur WhatsApp',message:(name,amount,days)=>`Bonjour, je souhaite demander l'activation de l'abonnement WOW Furniture ${name}, pour ${days} jours au prix de ${amount}. Merci de m'indiquer les étapes.`},
    ru:{button:'Запросить активацию в WhatsApp',message:(name,amount,days)=>`Здравствуйте! Хочу запросить подключение тарифа WOW Furniture «${name}» на ${days} дней за ${amount}. Сообщите, пожалуйста, порядок активации.`}
  };
  const make=(tag,cls,text)=>{const node=document.createElement(tag);if(cls)node.className=cls;if(text!==undefined)node.textContent=text;return node;};
  function svgIcon(kind){
    const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
    svg.classList.add('platform-contact-icon');
    svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('focusable','false');svg.setAttribute('aria-hidden','true');
    const mark=document.createElementNS('http://www.w3.org/2000/svg','path');
    if(kind==='whatsapp'){
      svg.classList.add('platform-whatsapp-logo');
      mark.setAttribute('fill','currentColor');mark.setAttribute('d',whatsappPath);
    }else{
      svg.setAttribute('fill','none');svg.setAttribute('stroke','currentColor');svg.setAttribute('stroke-width','1.9');
      svg.setAttribute('stroke-linecap','round');svg.setAttribute('stroke-linejoin','round');
      mark.setAttribute('d',kind==='call'?'M22 16.92v3a2 2 0 0 1-2.18 2A19.79 19.79 0 0 1 3.09 5.18 2 2 0 0 1 5.08 3h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.8a2 2 0 0 1-.45 2.11L9.1 10.9a16 16 0 0 0 4 4l1.27-1.23a2 2 0 0 1 2.11-.45c.9.34 1.84.57 2.8.7A2 2 0 0 1 22 16.92Z':
        'M4 5h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Zm-2 2 10 7L22 7');
    }
    svg.append(mark);return svg;
  }
  function addIcon(link,kind){link.prepend(svgIcon(kind));return link;}
  function visual(key){
    const markup={
      month:'<rect x="31" y="29" width="106" height="102" rx="22"/><path d="M31 62h106M58 17v28M110 17v28"/><path class="wf-tier-line" d="M61 91h47M61 107h29"/>',
      year:'<circle cx="84" cy="80" r="53"/><circle cx="84" cy="80" r="33" class="wf-tier-orbit"/><path d="M84 43v38l26 21"/><circle class="wf-tier-dot" cx="84" cy="27" r="6"/>',
      twoYears:'<path d="M17 85c16-40 44-45 67-4 23 41 51 36 67-4-16-40-44-45-67-4-23 41-51 36-67 4Z"/><path class="wf-tier-spark" d="M131 26v16m-8-8h16M42 19v12m-6-6h12"/>'
    };
    const wrap=make('div','wf-plan-art');
    const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
    svg.setAttribute('viewBox','0 0 168 158');svg.setAttribute('aria-hidden','true');
    svg.setAttribute('focusable','false');svg.innerHTML=markup[key];
    wrap.append(svg);return wrap;
  }
  function mount(host,plans,onEdit){
    if(!host||!Array.isArray(plans)||typeof onEdit!=='function')return;
    const w=copy[document.documentElement.lang]||copy.ar,heading=make('header','platform-pricing-heading');
    heading.append(make('h3','',w.title),make('p','',w.lead));
    const grid=make('div','platform-pricing-cards');
    for(const item of tiers){
      const plan=plans.find(p=>p.id===item.id)||plans.find(p=>p.name===item.name)||null;
      const card=make('article','platform-pricing-card');card.dataset.tier=item.key;
      if(item.key==='twoYears')card.dataset.recommended='true';
      const visualNode=visual(item.key);
      const eyebrow=make('span','platform-plan-eyebrow',item.key==='twoYears'?w.recommended:w[ item.key]);
      const name=make('h4','',plan?.name||w[item.key]);
      const amount=Number(plan?.price??item.price),currency=plan?.currency||'USD';
      const price=make('strong','platform-plan-price');
      price.append(make('span','',new Intl.NumberFormat(document.documentElement.lang,{style:'currency',currency,maximumFractionDigits:2}).format(amount)));
      const duration=make('small','platform-plan-duration',(plan?.durationDays||item.days)+' '+(item.key==='month'?w.day.replace(/^30\s*/, ''):item.key==='year'?w.annual.replace(/^365\s*/, ''):w.biennial.replace(/^730\s*/, '')));
      const monthly=make('span','platform-plan-per-month',w.perMonth+' · '+new Intl.NumberFormat(document.documentElement.lang,{style:'currency',currency,maximumFractionDigits:2}).format(amount/item.months));
      const label=make('span','platform-plan-label',plan?w.saved:w.draft);
      label.dataset.saved=String(!!plan);
      const button=make('button','platform-plan-edit',plan?w.edit:w.create);button.type='button';
      button.addEventListener('click',()=>onEdit(item,plan));
      const benefits=benefitCopy[document.documentElement.lang]||benefitCopy.ar;
      const values=[
        [String(plan?.deviceLimit??2)+' '+benefits[0],'phone'],
        [new Intl.NumberFormat(document.documentElement.lang,{maximumFractionDigits:1}).format(
          Number(plan?.storageBytes??2000000000)/1e9)+' GB · '+benefits[1],'storage'],
        [String(plan?.voiceMinutes??500)+' '+benefits[2],'voice'],
        [String(plan?.videoMinutes??250)+' '+benefits[3],'video'],
        [benefits[4],'addon-phone'],[benefits[5],'addon-double']
      ];
      const featureList=make('ul','platform-plan-features');
      for(const [copy,key] of values){
        const li=make('li','platform-plan-feature');
        li.dataset.feature=key;
        const symbol=make('span','platform-plan-feature-icon');
        symbol.setAttribute('aria-hidden','true');
        li.append(symbol,make('span','',copy));featureList.append(li);
      }
      const note=make('small','platform-plan-benefits-note',benefits[6]);
      // WhatsApp is an inquiry channel only; saving and assigning plans remain authenticated admin actions.
      const lang=document.documentElement.lang in activationCopy?document.documentElement.lang:'ar';
      const whats=activationCopy[lang];
      const formattedAmount=new Intl.NumberFormat(lang,{style:'currency',currency,maximumFractionDigits:2}).format(amount);
      const activationText=whats.message(plan?.name||w[item.key],formattedAmount,Number(plan?.durationDays??item.days));
      const whatsappUrl=new URL('https://wa.me/'+whatsappNumber);
      whatsappUrl.searchParams.set('text',activationText);
      const activate=addIcon(make('a','platform-plan-activate',whats.button),'whatsapp');
      activate.href=whatsappUrl.toString();
      activate.target='_blank';activate.rel='noopener noreferrer';activate.referrerPolicy='no-referrer';
      activate.setAttribute('aria-label',whats.button+' · '+(plan?.name||w[item.key]));
      const actions=make('div','platform-plan-actions');
      actions.append(activate,button);
      card.append(visualNode,eyebrow,name,price,duration,monthly,featureList,note,label,actions);
      grid.append(card);
    }
    // A single shared contact block avoids duplicating sensitive contact links
    // across the three cards. Email/phone are explicitly user provided.
    const lang=document.documentElement.lang in contactCopy?document.documentElement.lang:'ar',contact=contactCopy[lang];
    const contactPanel=make('address','platform-sales-contact');
    const contactHeading=make('div','platform-sales-contact-heading');
    contactHeading.append(make('strong','',contact.heading),make('small','',contact.info));
    const channels=make('div','platform-sales-contact-links');
    const chat=addIcon(make('a','platform-sales-channel platform-sales-whatsapp',contact.whatsapp),'whatsapp');
    chat.href='https://wa.me/'+whatsappNumber;chat.target='_blank';chat.rel='noopener noreferrer';chat.referrerPolicy='no-referrer';
    const phone=addIcon(make('a','platform-sales-channel platform-sales-phone','+90 538 626 37 00'),'call');
    phone.href='tel:+905386263700';phone.setAttribute('aria-label',contact.call+' · +90 538 626 37 00');
    phone.dir='ltr';
    const email=addIcon(make('a','platform-sales-channel platform-sales-email',activationEmail),'email');
    email.href='mailto:'+activationEmail;email.setAttribute('aria-label',contact.email+' · '+activationEmail);
    email.dir='ltr';
    channels.append(chat,phone,email);contactPanel.append(contactHeading,channels);
    const panel=make('section','platform-pricing-dashboard');
    panel.append(heading,grid,contactPanel,make('p','platform-plan-disclaimer',w.noCharge+' '+w.adjust));
    const editor=host.querySelector('.platform-plan-editor');
    if(editor)editor.before(panel);else host.append(panel);
  }
  window.WFPlatformPricing=Object.freeze({mount,tiers});
})();