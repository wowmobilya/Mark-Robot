/* Enrich the existing native developer dialog without replacing its handlers. */
(() => {
  'use strict';
  const DEFAULT_NAME = 'INFINITY', DEFAULT_LOGO = './assets/infinity-logo.svg';
  const copy = {
    ar: {
      heading: 'برمجة وتطوير', name: 'المهندس معتز بالله حاج شعبان', role: 'برمجيات وأنظمة ذكية',
      bio: 'تطوير أنظمة أعمال ذكية تجمع تنظيم البيانات، واجهات الاستخدام الواضحة وأتمتة الإجراءات اليومية، لتحويل احتياجات العمل إلى تجربة عملية مترابطة.',
      approach: 'تشمل مجالات الاهتمام والتطوير الروبوتات والذكاء الاصطناعي، وتكامل البرمجيات مع الأجهزة، مع التركيز على سهولة الاستخدام وقابلية تطوير الأنظمة.',
      focus: 'مجالات العمل والتطوير', business: 'أنظمة الأعمال', businessBody: 'المبيعات والعملاء والمنتجات والتقارير في تجربة واحدة.',
      robotics: 'الروبوتات والأتمتة', roboticsBody: 'منطق التحكم وربط البرمجيات بالأجهزة وسير العمل.',
      ai: 'الذكاء الاصطناعي', aiBody: 'تصميم المساعدات الذكية وتجارب التفاعل مع البيانات.',
      app: 'عن التطبيق', appBody: 'مساحة عمل لإدارة الفواتير والعملاء والمنتجات، ومتابعة الأعمال والتقارير من الهاتف والكمبيوتر.',
      code: 'لمحة برمجية', footer: 'من الفكرة إلى واجهة واضحة ونظام قابل للتطوير.', close: 'إغلاق معلومات المطوّر'
    },
    en: {
      heading: 'Programming & development', name: 'Eng. Mutez Billah Haj Shaban', role: 'Software & intelligent systems',
      bio: 'Developing intelligent business systems that bring organized data, clear interfaces and everyday workflow automation together, turning business needs into a connected, practical experience.',
      approach: 'Areas of interest and development include robotics, artificial intelligence and software–hardware integration, with attention to usability and systems that can evolve.',
      focus: 'Development focus', business: 'Business systems', businessBody: 'Sales, clients, products and reporting in one experience.',
      robotics: 'Robotics & automation', roboticsBody: 'Control logic, software–hardware integration and workflows.',
      ai: 'Artificial intelligence', aiBody: 'Designing intelligent assistants and ways to interact with data.',
      app: 'About the app', appBody: 'A workspace for invoices, clients and products, with business overviews and reports on phones and computers.',
      code: 'Code sketch', footer: 'From an idea to a clear interface and a system that can evolve.', close: 'Close developer profile'
    },
    tr: {
      heading: 'Programlama ve geliştirme', name: 'Müh. Mutez Billah Haj Shaban', role: 'Yazılım ve akıllı sistemler',
      bio: 'Düzenli verileri, anlaşılır arayüzleri ve günlük iş akışı otomasyonunu bir araya getiren akıllı iş sistemleri geliştirerek işletme ihtiyaçlarını bağlantılı ve pratik bir deneyime dönüştürme.',
      approach: 'İlgi ve geliştirme alanları robotik, yapay zekâ ve yazılım–donanım entegrasyonunu kapsar; kullanılabilirlik ve gelişime açık sistemler ön plandadır.',
      focus: 'Geliştirme alanları', business: 'İş sistemleri', businessBody: 'Satış, müşteriler, ürünler ve raporlar tek bir deneyimde.',
      robotics: 'Robotik ve otomasyon', roboticsBody: 'Kontrol mantığı, yazılım–donanım entegrasyonu ve iş akışları.',
      ai: 'Yapay zekâ', aiBody: 'Akıllı asistanlar ve verilerle etkileşim deneyimleri tasarlama.',
      app: 'Uygulama hakkında', appBody: 'Telefonda ve bilgisayarda fatura, müşteri ve ürün yönetimi; iş özetleri ve raporlar için çalışma alanı.',
      code: 'Kod taslağı', footer: 'Fikirden anlaşılır bir arayüze ve gelişime açık bir sisteme.', close: 'Geliştirici profilini kapat'
    },
    fr: {
      heading: 'Programmation et développement', name: 'Ing. Mutez Billah Haj Shaban', role: 'Logiciels et systèmes intelligents',
      bio: 'Développer des systèmes de gestion intelligents qui réunissent données organisées, interfaces claires et automatisation du quotidien, pour traduire les besoins métier en une expérience pratique et cohérente.',
      approach: 'Les domaines d’intérêt et de développement comprennent la robotique, l’intelligence artificielle et l’intégration logiciel–matériel, avec une attention à l’usage et à l’évolution des systèmes.',
      focus: 'Domaines de développement', business: 'Systèmes de gestion', businessBody: 'Ventes, clients, produits et rapports dans une même expérience.',
      robotics: 'Robotique et automatisation', roboticsBody: 'Logique de commande, intégration logiciel–matériel et processus.',
      ai: 'Intelligence artificielle', aiBody: 'Concevoir des assistants intelligents et des interactions avec les données.',
      app: 'À propos de l’application', appBody: 'Un espace pour gérer factures, clients et produits, consulter l’activité et les rapports sur téléphone ou ordinateur.',
      code: 'Esquisse de code', footer: 'De l’idée à une interface claire et à un système évolutif.', close: 'Fermer le profil du développeur'
    },
    ru: {
      heading: 'Программирование и разработка', name: 'Инженер Мутаз Биллах Хадж Шаабан', role: 'ПО и интеллектуальные системы',
      bio: 'Разработка интеллектуальных бизнес-систем, объединяющих упорядоченные данные, понятные интерфейсы и автоматизацию повседневных процессов, чтобы превратить задачи бизнеса в удобную связанную среду.',
      approach: 'Направления интереса и разработки включают робототехнику, искусственный интеллект и интеграцию программ с оборудованием, с вниманием к удобству и развитию систем.',
      focus: 'Направления разработки', business: 'Бизнес-системы', businessBody: 'Продажи, клиенты, товары и отчёты в единой среде.',
      robotics: 'Робототехника и автоматизация', roboticsBody: 'Логика управления, взаимодействие программ с оборудованием и рабочие процессы.',
      ai: 'Искусственный интеллект', aiBody: 'Проектирование интеллектуальных помощников и взаимодействия с данными.',
      app: 'О приложении', appBody: 'Рабочая среда для счетов, клиентов и товаров, обзора бизнеса и отчётов на телефоне и компьютере.',
      code: 'Эскиз кода', footer: 'От идеи к понятному интерфейсу и развивающейся системе.', close: 'Закрыть профиль разработчика'
    }
  };
  function identity(api, settings) {
    let raw;
    try { raw = api?.current?.(); } catch (_) {}
    raw ||= settings?.appIdentity || {};
    const value = typeof raw.name === 'string' ? raw.name.replace(/[\u0000-\u001f\u007f\u202a-\u202e\u2066-\u2069]/g, '').trim() : '';
    const name = value && value.length <= 60 ? value : DEFAULT_NAME;
    const logo = typeof raw.logo === 'string' && raw.logo.length <= 2100000 && /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(raw.logo) ? raw.logo : DEFAULT_LOGO;
    return { name, logo };
  }
  if (typeof module === 'object' && module.exports) module.exports = { identity, copy };
  if (typeof document === 'undefined') return;
  const dialog = document.getElementById('wfDevDialog');
  const header = dialog?.querySelector(':scope > header'), profile = dialog?.querySelector('.wf-dev-profile');
  const name = dialog?.querySelector('#wfDevName'), bio = dialog?.querySelector('.wf-dev-bio');
  if (!dialog || !header || !profile || !name || !bio || dialog.dataset.wfDeveloperProfile === 'ready') return;
  dialog.dataset.wfDeveloperProfile = 'ready'; dialog.classList.add('wf-developer-profile');
  const node = (tag, className, content) => { const element = document.createElement(tag); if (className) element.className = className; if (content != null) element.textContent = content; return element; };
  const bound = [];
  const translated = (tag, key, className) => { const element = node(tag, className); bound.push([element, key]); return element; };
  const symbol = (type, tone = '') => {
    const paths = {
      business: '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M7 5V3h10v2M7 11h3m4 0h3M7 16h3m4 0h3"/>',
      robotics: '<rect x="4" y="7" width="16" height="13" rx="4"/><path d="M12 3v4M2 12h2m16 0h2M8 3h8M9 16h6"/><circle cx="9" cy="12" r="1"/><circle cx="15" cy="12" r="1"/>',
      ai: '<rect x="6" y="6" width="12" height="12" rx="3"/><path d="M9 2v4m6-4v4M9 18v4m6-4v4M2 9h4m-4 6h4m12-6h4m-4 6h4M10 10h4v4h-4z"/>',
      code: '<path d="m8 7-5 5 5 5m8-10 5 5-5 5M14 4l-4 16"/>'
    };
    const element = node('span', 'wf-dev-icon' + (tone ? ' wf-dev-tone-' + tone : '')); element.setAttribute('aria-hidden', 'true');
    element.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">' + paths[type] + '</svg>';
    return element;
  };
  const headerLabel = header.querySelector('strong');
  if (headerLabel) { headerLabel.removeAttribute('data-i18n'); bound.push([headerLabel, 'heading']); }
  name.removeAttribute('data-i18n'); bound.push([name, 'name']);
  const existingBio = bio.querySelector('p');
  if (existingBio) { existingBio.removeAttribute('data-i18n'); existingBio.classList.add('wf-dev-description'); bound.push([existingBio, 'bio']); }
  else bio.append(translated('p', 'bio', 'wf-dev-description'));
  const role = translated('small', 'role', 'wf-dev-role'); name.before(role);
  const body = node('div', 'wf-dev-body');
  // Move existing nodes intact: portrait, links, and any original listeners survive.
  for (const child of [...dialog.children]) if (child !== header) body.append(child);
  dialog.append(body);
  body.append(translated('p', 'approach', 'wf-dev-approach'));
  const focus = node('section', 'wf-dev-focus');
  const focusTitle = translated('h3', 'focus'); focusTitle.id = 'wfDevFocusHeading'; focus.setAttribute('aria-labelledby', focusTitle.id);
  const areas = node('ul', 'wf-dev-areas');
  for (const [key, tone] of [['business', 'business'], ['robotics', 'robotics'], ['ai', 'ai']]) {
    const item = node('li'), content = node('div'); content.append(translated('strong', key), translated('p', key + 'Body')); item.append(symbol(key, tone), content); areas.append(item);
  }
  focus.append(focusTitle, areas); body.append(focus);
  const app = node('section', 'wf-dev-app');
  const appLogo = node('img'); appLogo.width = 52; appLogo.height = 52; appLogo.alt = '';
  appLogo.addEventListener('error', () => { if (appLogo.getAttribute('src') !== DEFAULT_LOGO) appLogo.src = DEFAULT_LOGO; });
  const appText = node('div'), appName = node('strong'); appName.dir = 'auto';
  appText.append(translated('small', 'app'), appName, translated('p', 'appBody')); app.append(appLogo, appText); body.append(app);
  const code = node('section', 'wf-dev-code'); code.setAttribute('aria-hidden', 'true'); code.dir = 'ltr';
  const codeHeader = node('div', 'wf-dev-code-header'); codeHeader.append(symbol('code'), translated('span', 'code'));
  const snippet = node('pre'), source = node('code');
  const lines = [
    node('span', 'wf-dev-code-line', 'const workspace = createSystem({'),
    node('span', 'wf-dev-code-line wf-dev-code-identity'),
    node('span', 'wf-dev-code-line', '  focus: ["business", "robotics", "AI"],'),
    node('span', 'wf-dev-code-line', '  experience: "clear & connected"'),
    node('span', 'wf-dev-code-line', '});')
  ];
  lines.forEach((line, index) => { line.style.setProperty('--line-index', String(index)); source.append(line); });
  const cursor = node('span', 'wf-dev-code-cursor', '▍'); lines.at(-1).append(cursor); snippet.append(source); code.append(codeHeader, snippet); body.append(code);
  body.append(translated('p', 'footer', 'wf-dev-footer'));
  const close = header.querySelector('[data-dialog-close]');
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  function translate() {
    const labels = copy[document.documentElement.lang] || copy.en;
    for (const [element, key] of bound) element.textContent = labels[key];
    if (close) { close.title = labels.close; close.setAttribute('aria-label', labels.close); }
  }
  function refreshIdentity() {
    const value = identity(window.WFAppIdentity, typeof S === 'object' ? S.settings : {});
    if (appName.textContent !== value.name) appName.textContent = value.name;
    appName.title = value.name;
    if (appLogo.getAttribute('src') !== value.logo) appLogo.src = value.logo;
    lines[1].textContent = '  identity: ' + JSON.stringify(value.name) + ',';
  }
  function updateMotion() {
    const enabled = dialog.open && !document.hidden && !motion.matches && document.documentElement.dataset.wfMotion !== 'reduced';
    dialog.dataset.motion = enabled ? 'on' : 'off';
  }
  let wasOpen = dialog.open;
  new MutationObserver(() => {
    if (dialog.open && !wasOpen) { translate(); refreshIdentity(); body.scrollTop = 0; }
    wasOpen = dialog.open; updateMotion();
  }).observe(dialog, { attributes: true, attributeFilter: ['open'] });
  new MutationObserver(() => { translate(); updateMotion(); }).observe(document.documentElement, { attributes: true, attributeFilter: ['lang', 'data-wf-motion'] });
  document.addEventListener('visibilitychange', updateMotion);
  motion.addEventListener('change', updateMotion);
  translate(); refreshIdentity(); updateMotion();
})();
