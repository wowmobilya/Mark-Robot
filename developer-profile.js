/* Shared developer profile for the WOW workspace and admin console. */
(() => {
  'use strict';
  const DEFAULT_NAME = 'WOW FURNITURE', DEFAULT_LOGO = './assets/wow-furniture-logo.svg';
  const copy = {
    ar: {
      heading: 'برمجة وتطوير', name: 'المهندس معتز بالله حاج شعبان', role: 'برمجيات وأنظمة ذكية',
      bio: 'تطوير أنظمة أعمال ذكية تجمع تنظيم البيانات، واجهات الاستخدام الواضحة وأتمتة الإجراءات اليومية، لتحويل احتياجات العمل إلى تجربة عملية مترابطة.',
      approach: 'تشمل مجالات الاهتمام والتطوير الروبوتات والذكاء الاصطناعي، وتكامل البرمجيات مع الأجهزة، مع التركيز على سهولة الاستخدام وقابلية تطوير الأنظمة.',
      focus: 'مجالات العمل والتطوير', business: 'أنظمة الأعمال', businessBody: 'المبيعات والعملاء والمنتجات والتقارير في تجربة واحدة.',
      robotics: 'الروبوتات والأتمتة', roboticsBody: 'منطق التحكم وربط البرمجيات بالأجهزة وسير العمل.',
      ai: 'الذكاء الاصطناعي', aiBody: 'تصميم المساعدات الذكية وتجارب التفاعل مع البيانات.',
      app: 'عن التطبيق', appBody: 'مساحة عمل لإدارة الفواتير والعملاء والمنتجات، ومتابعة الأعمال والتقارير من الهاتف والكمبيوتر.',
      code: 'لمحة برمجية', close: 'إغلاق معلومات المطوّر'
    },
    en: {
      heading: 'Programming & development', name: 'Eng. Mutez Billah Haj Shaban', role: 'Software & intelligent systems',
      bio: 'Developing intelligent business systems that bring organized data, clear interfaces and everyday workflow automation together, turning business needs into a connected, practical experience.',
      approach: 'Areas of interest and development include robotics, artificial intelligence and software–hardware integration, with attention to usability and systems that can evolve.',
      focus: 'Development focus', business: 'Business systems', businessBody: 'Sales, clients, products and reporting in one experience.',
      robotics: 'Robotics & automation', roboticsBody: 'Control logic, software–hardware integration and workflows.',
      ai: 'Artificial intelligence', aiBody: 'Designing intelligent assistants and ways to interact with data.',
      app: 'About the app', appBody: 'A workspace for invoices, clients and products, with business overviews and reports on phones and computers.',
      code: 'Code sketch', close: 'Close developer profile'
    },
    tr: {
      heading: 'Programlama ve geliştirme', name: 'Müh. Mutez Billah Haj Shaban', role: 'Yazılım ve akıllı sistemler',
      bio: 'Düzenli verileri, anlaşılır arayüzleri ve günlük iş akışı otomasyonunu bir araya getiren akıllı iş sistemleri geliştirerek işletme ihtiyaçlarını bağlantılı ve pratik bir deneyime dönüştürme.',
      approach: 'İlgi ve geliştirme alanları robotik, yapay zekâ ve yazılım–donanım entegrasyonunu kapsar; kullanılabilirlik ve gelişime açık sistemler ön plandadır.',
      focus: 'Geliştirme alanları', business: 'İş sistemleri', businessBody: 'Satış, müşteriler, ürünler ve raporlar tek bir deneyimde.',
      robotics: 'Robotik ve otomasyon', roboticsBody: 'Kontrol mantığı, yazılım–donanım entegrasyonu ve iş akışları.',
      ai: 'Yapay zekâ', aiBody: 'Akıllı asistanlar ve verilerle etkileşim deneyimleri tasarlama.',
      app: 'Uygulama hakkında', appBody: 'Telefonda ve bilgisayarda fatura, müşteri ve ürün yönetimi; iş özetleri ve raporlar için çalışma alanı.',
      code: 'Kod taslağı', close: 'Geliştirici profilini kapat'
    },
    fr: {
      heading: 'Programmation et développement', name: 'Ing. Mutez Billah Haj Shaban', role: 'Logiciels et systèmes intelligents',
      bio: 'Développer des systèmes de gestion intelligents qui réunissent données organisées, interfaces claires et automatisation du quotidien, pour traduire les besoins métier en une expérience pratique et cohérente.',
      approach: 'Les domaines d’intérêt et de développement comprennent la robotique, l’intelligence artificielle et l’intégration logiciel–matériel, avec une attention à l’usage et à l’évolution des systèmes.',
      focus: 'Domaines de développement', business: 'Systèmes de gestion', businessBody: 'Ventes, clients, produits et rapports dans une même expérience.',
      robotics: 'Robotique et automatisation', roboticsBody: 'Logique de commande, intégration logiciel–matériel et processus.',
      ai: 'Intelligence artificielle', aiBody: 'Concevoir des assistants intelligents et des interactions avec les données.',
      app: 'À propos de l’application', appBody: 'Un espace pour gérer factures, clients et produits, consulter l’activité et les rapports sur téléphone ou ordinateur.',
      code: 'Esquisse de code', close: 'Fermer le profil du développeur'
    },
    ru: {
      heading: 'Программирование и разработка', name: 'Инженер Мутаз Биллах Хадж Шаабан', role: 'ПО и интеллектуальные системы',
      bio: 'Разработка интеллектуальных бизнес-систем, объединяющих упорядоченные данные, понятные интерфейсы и автоматизацию повседневных процессов, чтобы превратить задачи бизнеса в удобную связанную среду.',
      approach: 'Направления интереса и разработки включают робототехнику, искусственный интеллект и интеграцию программ с оборудованием, с вниманием к удобству и развитию систем.',
      focus: 'Направления разработки', business: 'Бизнес-системы', businessBody: 'Продажи, клиенты, товары и отчёты в единой среде.',
      robotics: 'Робототехника и автоматизация', roboticsBody: 'Логика управления, взаимодействие программ с оборудованием и рабочие процессы.',
      ai: 'Искусственный интеллект', aiBody: 'Проектирование интеллектуальных помощников и взаимодействия с данными.',
      app: 'О приложении', appBody: 'Рабочая среда для счетов, клиентов и товаров, обзора бизнеса и отчётов на телефоне и компьютере.',
      code: 'Эскиз кода', close: 'Закрыть профиль разработчика'
    }
  };
  function identity(api, settings) {
    let raw;
    try { raw = api?.current?.(); } catch (_) {}
    raw ||= settings?.appIdentity || {};
    const value = typeof raw.name === 'string' ? raw.name.replace(/[\u0000-\u001f\u007f\u202a-\u202e\u2066-\u2069]/g, '').trim() : '';
    if (/^(?:infinity|إنفنتي|انفنتي)$/i.test(value)) return {name:DEFAULT_NAME, logo:DEFAULT_LOGO};
    const name = value && value.length <= 60 ? value : DEFAULT_NAME;
    const logo = typeof raw.logo === 'string' && raw.logo.length <= 2100000 && /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(raw.logo) ? raw.logo : DEFAULT_LOGO;
    return { name, logo };
  }

  const profileLabels = {
    ar: {approachTitle:'منهج التطوير', markRobot:'مارك روبوت'},
    en: {approachTitle:'Development approach', markRobot:'Mark Robot'},
    tr: {approachTitle:'Geliştirme yaklaşımı', markRobot:'Mark Robot'},
    fr: {approachTitle:'Approche de développement', markRobot:'Robot Mark'},
    ru: {approachTitle:'Подход к разработке', markRobot:'Робот Марк'}
  };
  for (const [locale, labels] of Object.entries(profileLabels)) Object.assign(copy[locale], labels);
  if (typeof module === 'object' && module.exports) module.exports = {identity, copy};
  if (typeof document === 'undefined') return;
  const dialog = document.getElementById('wfDevDialog');
  const header = dialog?.querySelector(':scope > header'), profile = dialog?.querySelector('.wf-dev-profile');
  const name = dialog?.querySelector('#wfDevName'), bio = dialog?.querySelector('.wf-dev-bio');
  if (!dialog || !header || !profile || !name || !bio || dialog.dataset.wfDeveloperProfile === 'ready') return;
  dialog.dataset.wfDeveloperProfile = 'ready'; dialog.classList.add('wf-developer-profile');
  const node = (tag, className, content) => { const element = document.createElement(tag); if (className) element.className = className; if (content != null) element.textContent = content; return element; };
  const symbol = type => {
    const paths = {
      business:'<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M7 5V3h10v2M7 11h3m4 0h3M7 16h3m4 0h3"/>',
      robotics:'<rect x="4" y="7" width="16" height="13" rx="4"/><path d="M12 3v4M2 12h2m16 0h2M8 3h8M9 16h6"/><circle cx="9" cy="12" r="1"/><circle cx="15" cy="12" r="1"/>',
      ai:'<rect x="6" y="6" width="12" height="12" rx="3"/><path d="M9 2v4m6-4v4M9 18v4m6-4v4M2 9h4m-4 6h4m12-6h4m-4 6h4M10 10h4v4h-4z"/>',
      code:'<path d="m7 7-5 5 5 5m10-10 5 5-5 5M14 4l-4 16"/>',
      approach:'<path d="M4 6h8m4 0h4M4 12h2m4 0h10M4 18h10m4 0h2"/><circle cx="14" cy="6" r="2"/><circle cx="8" cy="12" r="2"/><circle cx="16" cy="18" r="2"/>',
      app:'<rect x="3" y="4" width="18" height="16" rx="3"/><path d="M3 9h18m-11 0v11"/>',
      close:'<path d="m6 6 12 12M18 6 6 18"/>'
    };
    const element = node('span', 'wf-dev-icon'); element.setAttribute('aria-hidden', 'true');
    element.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">' + paths[type] + '</svg>';
    return element;
  };
  const headerLabel = header.querySelector('strong'), close = header.querySelector('[data-dialog-close]');
  const extras = [...dialog.children].filter(child => child !== header && child !== profile);
  const originalDescription = bio.querySelector('p');
  for (const child of [...bio.children]) if (child !== name) { if (child !== originalDescription) extras.push(child); child.remove(); }
  extras.forEach(element => element.remove());
  headerLabel?.removeAttribute('data-i18n'); name.removeAttribute('data-i18n');
  const tools = node('div', 'wf-dev-tools'), mark = node('span', 'wf-dev-mark');
  mark.setAttribute('role', 'img');
  mark.innerHTML = '<svg viewBox="85 48 430 250" aria-hidden="true" focusable="false">' +
    '<g transform="translate(192 146)"><ellipse rx="30" ry="44"/><circle class="wf-dev-mark-glint" cx="-9" cy="-15" r="8"/></g>' +
    '<g transform="translate(408 146)"><ellipse rx="30" ry="44"/><circle class="wf-dev-mark-glint" cx="-9" cy="-15" r="8"/></g>' +
    '<path class="wf-dev-mark-mouth" d="M 269 237 C 284 253 314 253 331 237"/></svg>';
  tools.append(mark);
  if (close) {
    close.removeAttribute('data-wf-ui-aria-label');
    close.replaceChildren(symbol('close'));
    tools.append(close);
  }
  const codeMark = symbol('code');
  codeMark.classList.add('wf-dev-code-mark');
  const tag = node('div', 'wf-dev-tag');
  if (headerLabel) tag.append(codeMark, headerLabel);
  const role = node('p', 'wf-dev-role');
  bio.append(role);
  header.append(tag, tools);

  const body = node('div', 'wf-dev-body'), overview = node('div', 'wf-dev-overview');
  body.tabIndex = 0;
  body.setAttribute('role', 'region');
  body.setAttribute('aria-labelledby', name.id);
  body.append(profile, overview);

  function card(type, contentClass = '') {
    const section = node('section', 'wf-dev-block' + (contentClass ? ' ' + contentClass : ''));
    const title = node('h3');
    const heading = node('div', 'wf-dev-block-heading');
    heading.append(symbol(type), title);
    section.append(heading);
    overview.append(section);
    return {section, title};
  }
  const summary = card('approach', 'wf-dev-summary');
  const introduction = node('p'), approach = node('p');
  summary.section.append(introduction, approach);

  const terminal = card('code', 'wf-dev-code');
  const snippet = node('pre'), source = node('code');
  snippet.dir = 'ltr';
  snippet.append(source);
  terminal.section.append(snippet);
  function codeLine(label, value, suffix = '') {
    return [node('span', 'wf-dev-code-key', label), node('span', 'wf-dev-code-value', value), document.createTextNode(suffix)];
  }

  const focus = node('section', 'wf-dev-focus'), focusTitle = node('h3');
  const disciplines = node('div', 'wf-dev-disciplines');
  const fields = ['business', 'robotics', 'ai'].map(key => {
    const tile = node('article', 'wf-dev-discipline');
    tile.dataset.focus = key;
    const title = node('h4'), detail = node('p');
    tile.append(symbol(key), title, detail);
    disciplines.append(tile);
    return {key, title, detail};
  });
  focus.append(focusTitle, disciplines);
  overview.append(focus);

  const app = card('app', 'wf-dev-app');
  const brand = node('div', 'wf-dev-app-identity'), logo = node('img'), appName = node('bdi');
  logo.width = 423; logo.height = 165; logo.alt = '';
  appName.dir = 'auto';
  logo.addEventListener('error', () => { if (logo.getAttribute('src') !== DEFAULT_LOGO) logo.src = DEFAULT_LOGO; });
  const appDescription = node('p');
  brand.append(logo, appName);
  app.section.append(brand, appDescription);
  if (extras.length) body.append(...extras);
  dialog.append(body);

  function refresh() {
    const labels = copy[document.documentElement.lang] || copy.en;
    const appIdentity = identity(window.WFAppIdentity, typeof S === 'object' ? S.settings : {});
    if (headerLabel) headerLabel.textContent = labels.heading;
    name.textContent = labels.name;
    role.textContent = labels.role;
    mark.setAttribute('aria-label', labels.markRobot);
    if (close) { close.title = labels.close; close.setAttribute('aria-label', labels.close); }
    summary.title.textContent = labels.approachTitle;
    introduction.textContent = labels.bio;
    approach.textContent = labels.approach;
    terminal.title.textContent = labels.code;
    source.replaceChildren(...codeLine('const ', 'workspace', ' = {\n'),
      ...codeLine('  name: ', JSON.stringify(appIdentity.name), ',\n'),
      ...codeLine('  focus: ', '["business", "robotics", "AI"]', '\n};'));
    focusTitle.textContent = labels.focus;
    for (const {key, title, detail} of fields) {
      title.textContent = labels[key];
      detail.textContent = labels[key + 'Body'];
    }
    app.title.textContent = labels.app;
    logo.src = appIdentity.logo;
    appName.textContent = appIdentity.name;
    appDescription.textContent = labels.appBody;
  }
  let wasOpen = dialog.open;
  new MutationObserver(() => {
    if (dialog.open && !wasOpen) { refresh(); body.scrollTop = 0; }
    wasOpen = dialog.open;
  }).observe(dialog, {attributes:true, attributeFilter:['open']});
  new MutationObserver(refresh).observe(document.documentElement, {attributes:true, attributeFilter:['lang']});
  refresh();
})();
