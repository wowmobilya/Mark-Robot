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
  const make=(tag,cls,text)=>{const node=document.createElement(tag);if(cls)node.className=cls;if(text!==undefined)node.textContent=text;return node;};
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
      card.append(visualNode,eyebrow,name,price,duration,monthly,label,button);
      grid.append(card);
    }
    const panel=make('section','platform-pricing-dashboard');
    panel.append(heading,grid,make('p','platform-plan-disclaimer',w.noCharge+' '+w.adjust));
    const editor=host.querySelector('.platform-plan-editor');
    if(editor)editor.before(panel);else host.append(panel);
  }
  window.WFPlatformPricing=Object.freeze({mount,tiers});
})();