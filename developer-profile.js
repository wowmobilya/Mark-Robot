/* A measured, paged developer workspace with no scrolling. */
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
      code: 'لمحة برمجية', footer: 'من الفكرة إلى واجهة واضحة ونظام قابل للتطوير.', close: 'إغلاق معلومات المطوّر', back: 'العودة إلى مساحة العمل'
    },
    en: {
      heading: 'Programming & development', name: 'Eng. Mutez Billah Haj Shaban', role: 'Software & intelligent systems',
      bio: 'Developing intelligent business systems that bring organized data, clear interfaces and everyday workflow automation together, turning business needs into a connected, practical experience.',
      approach: 'Areas of interest and development include robotics, artificial intelligence and software–hardware integration, with attention to usability and systems that can evolve.',
      focus: 'Development focus', business: 'Business systems', businessBody: 'Sales, clients, products and reporting in one experience.',
      robotics: 'Robotics & automation', roboticsBody: 'Control logic, software–hardware integration and workflows.',
      ai: 'Artificial intelligence', aiBody: 'Designing intelligent assistants and ways to interact with data.',
      app: 'About the app', appBody: 'A workspace for invoices, clients and products, with business overviews and reports on phones and computers.',
      code: 'Code sketch', footer: 'From an idea to a clear interface and a system that can evolve.', close: 'Close developer profile', back: 'Back to workspace'
    },
    tr: {
      heading: 'Programlama ve geliştirme', name: 'Müh. Mutez Billah Haj Shaban', role: 'Yazılım ve akıllı sistemler',
      bio: 'Düzenli verileri, anlaşılır arayüzleri ve günlük iş akışı otomasyonunu bir araya getiren akıllı iş sistemleri geliştirerek işletme ihtiyaçlarını bağlantılı ve pratik bir deneyime dönüştürme.',
      approach: 'İlgi ve geliştirme alanları robotik, yapay zekâ ve yazılım–donanım entegrasyonunu kapsar; kullanılabilirlik ve gelişime açık sistemler ön plandadır.',
      focus: 'Geliştirme alanları', business: 'İş sistemleri', businessBody: 'Satış, müşteriler, ürünler ve raporlar tek bir deneyimde.',
      robotics: 'Robotik ve otomasyon', roboticsBody: 'Kontrol mantığı, yazılım–donanım entegrasyonu ve iş akışları.',
      ai: 'Yapay zekâ', aiBody: 'Akıllı asistanlar ve verilerle etkileşim deneyimleri tasarlama.',
      app: 'Uygulama hakkında', appBody: 'Telefonda ve bilgisayarda fatura, müşteri ve ürün yönetimi; iş özetleri ve raporlar için çalışma alanı.',
      code: 'Kod taslağı', footer: 'Fikirden anlaşılır bir arayüze ve gelişime açık bir sisteme.', close: 'Geliştirici profilini kapat', back: 'Çalışma alanına dön'
    },
    fr: {
      heading: 'Programmation et développement', name: 'Ing. Mutez Billah Haj Shaban', role: 'Logiciels et systèmes intelligents',
      bio: 'Développer des systèmes de gestion intelligents qui réunissent données organisées, interfaces claires et automatisation du quotidien, pour traduire les besoins métier en une expérience pratique et cohérente.',
      approach: 'Les domaines d’intérêt et de développement comprennent la robotique, l’intelligence artificielle et l’intégration logiciel–matériel, avec une attention à l’usage et à l’évolution des systèmes.',
      focus: 'Domaines de développement', business: 'Systèmes de gestion', businessBody: 'Ventes, clients, produits et rapports dans une même expérience.',
      robotics: 'Robotique et automatisation', roboticsBody: 'Logique de commande, intégration logiciel–matériel et processus.',
      ai: 'Intelligence artificielle', aiBody: 'Concevoir des assistants intelligents et des interactions avec les données.',
      app: 'À propos de l’application', appBody: 'Un espace pour gérer factures, clients et produits, consulter l’activité et les rapports sur téléphone ou ordinateur.',
      code: 'Esquisse de code', footer: 'De l’idée à une interface claire et à un système évolutif.', close: 'Fermer le profil du développeur', back: 'Retour à l’espace de travail'
    },
    ru: {
      heading: 'Программирование и разработка', name: 'Инженер Мутаз Биллах Хадж Шаабан', role: 'ПО и интеллектуальные системы',
      bio: 'Разработка интеллектуальных бизнес-систем, объединяющих упорядоченные данные, понятные интерфейсы и автоматизацию повседневных процессов, чтобы превратить задачи бизнеса в удобную связанную среду.',
      approach: 'Направления интереса и разработки включают робототехнику, искусственный интеллект и интеграцию программ с оборудованием, с вниманием к удобству и развитию систем.',
      focus: 'Направления разработки', business: 'Бизнес-системы', businessBody: 'Продажи, клиенты, товары и отчёты в единой среде.',
      robotics: 'Робототехника и автоматизация', roboticsBody: 'Логика управления, взаимодействие программ с оборудованием и рабочие процессы.',
      ai: 'Искусственный интеллект', aiBody: 'Проектирование интеллектуальных помощников и взаимодействия с данными.',
      app: 'О приложении', appBody: 'Рабочая среда для счетов, клиентов и товаров, обзора бизнеса и отчётов на телефоне и компьютере.',
      code: 'Эскиз кода', footer: 'От идеи к понятному интерфейсу и развивающейся системе.', close: 'Закрыть профиль разработчика', back: 'Вернуться к работе'
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

  // The page size comes from the actual panel, keeping text readable at short heights.
  function paginateProfile(sections, fits) {
    const pages = [];
    for (const section of sections) {
      let current = [];
      const flush = () => { if (current.length) { pages.push({section:section.key, blocks:current}); current = []; } };
      for (const block of section.blocks) {
        let remaining = String(block.text ?? ''), offset = 0;
        while (true) {
          const whole = {...block, text:remaining, offset};
          if (fits([...current, whole])) { current.push(whole); break; }
          if (current.length) { flush(); continue; }
          if (!remaining) { current.push(whole); break; }
          const characters = Array.from(remaining);
          let low = 1, high = characters.length, best = 0;
          while (low <= high) {
            const middle = Math.floor((low + high) / 2);
            if (fits([{...block, text:characters.slice(0, middle).join(''), offset}])) { best = middle; low = middle + 1; }
            else high = middle - 1;
          }
          let part = characters.slice(0, Math.max(1, best)).join('');
          if (part.length < remaining.length) {
            let boundary = 0;
            for (let index = 0; index < part.length; index++) if (/\s/.test(part[index])) boundary = index + 1;
            if (boundary && part.slice(0, boundary).trim()) part = part.slice(0, boundary);
          }
          current.push({...block, text:part, offset}); flush();
          remaining = remaining.slice(part.length); offset += part.length;
          if (!remaining) break;
        }
      }
      flush();
    }
    return pages;
  }
  const pagerCopy = {
    ar: {about:'نبذة', approachTitle:'الرؤية', previous:'الصفحة السابقة', next:'الصفحة التالية', page:'الصفحة {page} من {count}', back:'إغلاق', mark:'مارك', markRobot:'مارك روبوت'},
    en: {about:'Profile', approachTitle:'Approach', previous:'Previous page', next:'Next page', page:'Page {page} of {count}', back:'Close', mark:'Mark', markRobot:'Mark Robot'},
    tr: {about:'Profil', approachTitle:'Yaklaşım', previous:'Önceki sayfa', next:'Sonraki sayfa', page:'Sayfa {page} / {count}', back:'Kapat', mark:'Mark', markRobot:'Mark Robot'},
    fr: {about:'Profil', approachTitle:'Approche', previous:'Page précédente', next:'Page suivante', page:'Page {page} sur {count}', back:'Fermer', mark:'Mark', markRobot:'Robot Mark'},
    ru: {about:'Профиль', approachTitle:'Подход', previous:'Предыдущая страница', next:'Следующая страница', page:'Страница {page} из {count}', back:'Закрыть', mark:'Марк', markRobot:'Робот Марк'}
  };
  for (const [locale, labels] of Object.entries(pagerCopy)) Object.assign(copy[locale], labels);
  if (typeof module === 'object' && module.exports) module.exports = {identity, copy, paginateProfile};
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
      previous:'<path d="m14 6-6 6 6 6"/>', next:'<path d="m10 6 6 6-6 6"/>', close:'<path d="m6 6 12 12M18 6 6 18"/>'
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
  const tools = node('div', 'wf-dev-tools'), mark = node('span', 'wf-dev-mark'), markLabel = node('span', 'wf-dev-mark-label');
  mark.setAttribute('role', 'img');
  // Reuse Mark's original calm face from robot-face.js without its IDs, motion or audio controls.
  mark.innerHTML = '<svg viewBox="0 0 600 336" aria-hidden="true" focusable="false">' +
    '<g transform="translate(174 147.84)"><path class="wf-dev-mark-brow" d="M -29 -70 Q 0 -80 29 -70"/><ellipse rx="34" ry="50"/><ellipse class="wf-dev-mark-glint" cx="-10" cy="-18" rx="10" ry="13"/><circle class="wf-dev-mark-soft-glint" cx="13" cy="19" r="4"/></g>' +
    '<g transform="translate(426 147.84)"><path class="wf-dev-mark-brow" d="M -29 -70 Q 0 -80 29 -70"/><ellipse rx="34" ry="50"/><ellipse class="wf-dev-mark-glint" cx="-10" cy="-18" rx="10" ry="13"/><circle class="wf-dev-mark-soft-glint" cx="13" cy="19" r="4"/></g>' +
    '<path class="wf-dev-mark-mouth" d="M 274 252.72 Q 300 273.72 326 252.72"/></svg>';
  mark.append(markLabel); tools.append(mark);
  // The real portrait/name and native close button keep their original nodes and handlers.
  if (close) { close.removeAttribute('data-wf-ui-aria-label'); close.replaceChildren(symbol('close')); tools.append(close); }
  header.append(profile, tools);
  const body = node('div', 'wf-dev-body'), panel = node('section', 'wf-dev-panel');
  panel.tabIndex = 0; panel.setAttribute('aria-labelledby', 'wfDevCurrentSection');
  const host = node('div', 'wf-dev-slide-host'), measure = node('div', 'wf-dev-measure');
  measure.setAttribute('aria-hidden', 'true'); measure.inert = true; panel.append(host, measure); body.append(panel);
  const navigation = node('nav', 'wf-dev-navigation'), progress = node('div', 'wf-dev-progress');
  const sectionLabel = node('strong'), counter = node('output'); sectionLabel.id = 'wfDevCurrentSection';
  counter.id = 'wfDevPageCount'; counter.setAttribute('aria-live', 'polite'); counter.setAttribute('aria-atomic', 'true');
  progress.append(sectionLabel, counter);
  const actions = node('div', 'wf-dev-page-actions');
  const previous = node('button', 'wf-dev-page-previous'), next = node('button', 'wf-dev-page-next'), returnAction = node('button', 'wf-dev-return');
  for (const button of [previous, next, returnAction]) button.type = 'button';
  previous.append(symbol('previous')); next.append(symbol('next'));
  returnAction.addEventListener('click', () => { if (close) close.click(); else dialog.close(); });
  actions.append(previous, returnAction, next); navigation.append(progress, actions); dialog.append(body, navigation);
  let labels = copy.en, appIdentity = identity(), pages = [], currentPage = 0, scheduled = 0, resetPending = false;
  let lastWidth = 0, lastHeight = 0;
  function contentSections() {
    const source = 'const workspace = createSystem({\n  identity: ' + JSON.stringify(appIdentity.name) + ',\n  focus: ["business", "robotics", "AI"],\n  experience: "clear & connected"\n});';
    const sections = [
      {key:'about', blocks:[{key:'bio', title:labels.role, text:labels.bio}]},
      {key:'approachTitle', blocks:[{key:'approach', title:labels.focus, text:labels.approach}]},
      {key:'focus', blocks:['business', 'robotics', 'ai'].map(key => ({key, title:labels[key], text:labels[key + 'Body'], icon:key}))},
      {key:'app', blocks:[{key:'app-brand', title:labels.app, text:'', brand:true},
        {key:'app-body', title:'', text:labels.appBody + '\n\n' + labels.footer}]},
      {key:'code', blocks:[{key:'code', title:labels.code, text:source, code:true}]}
    ];
    if (extras.length) sections.push({key:'about', blocks:extras.map((element, index) => ({key:'original-' + index, title:labels.about, text:'', element}))});
    return sections;
  }
  function renderBlocks(blocks, measuring = false) {
    const page = node('div', 'wf-dev-page');
    for (const block of blocks) {
      const article = node('section', 'wf-dev-block' + (block.code ? ' wf-dev-code' : ''));
      if (block.title) {
        const heading = node('h3', '', block.title);
        if (block.icon) { const row = node('div', 'wf-dev-block-heading'); row.append(symbol(block.icon), heading); article.append(row); }
        else article.append(heading);
      }
      if (block.brand) {
        const brand = node('div', 'wf-dev-app-identity'), logo = node('img'), label = node('bdi', '', appIdentity.name);
        logo.width = 423; logo.height = 165; logo.alt = ''; logo.src = appIdentity.logo;
        logo.addEventListener('error', () => { if (logo.getAttribute('src') !== DEFAULT_LOGO) logo.src = DEFAULT_LOGO; });
        label.dir = 'auto'; brand.append(logo, label); article.append(brand);
      }
      if (block.element) article.append(measuring ? block.element.cloneNode(true) : block.element);
      else if (block.text) article.append(node(block.code ? 'pre' : 'p', 'wf-dev-page-text', block.text));
      page.append(article);
    }
    return page;
  }
  function showPage(index) {
    if (!pages.length) return;
    currentPage = Math.min(pages.length - 1, Math.max(0, index));
    const page = pages[currentPage]; host.replaceChildren(renderBlocks(page.blocks));
    sectionLabel.textContent = labels[page.section]; counter.textContent = (currentPage + 1) + ' / ' + pages.length;
    counter.setAttribute('aria-label', labels.page.replace('{page}', String(currentPage + 1)).replace('{count}', String(pages.length)));
    previous.disabled = currentPage === 0; next.disabled = currentPage === pages.length - 1;
  }
  function rebuildPages(reset = false) {
    if (!dialog.open || measure.clientWidth <= 0 || measure.clientHeight <= 0) return;
    const anchor = reset ? null : pages[currentPage], first = anchor?.blocks?.[0];
    pages = paginateProfile(contentSections(), blocks => {
      measure.replaceChildren(renderBlocks(blocks, true));
      return measure.scrollHeight <= measure.clientHeight + .5 && measure.scrollWidth <= measure.clientWidth + .5;
    });
    measure.replaceChildren();
    let target = 0;
    if (anchor && first) {
      target = pages.findIndex(page => page.section === anchor.section && page.blocks.some(block => block.key === first.key && block.offset <= first.offset && block.offset + Math.max(1, block.text.length) > first.offset));
      if (target < 0) target = pages.findIndex(page => page.section === anchor.section);
    }
    showPage(Math.max(0, target));
  }
  function schedulePages(reset = false) {
    resetPending ||= reset;
    if (scheduled) return;
    scheduled = requestAnimationFrame(() => { scheduled = 0; const reset = resetPending; resetPending = false; rebuildPages(reset); });
  }
  function refresh(reset = false) {
    labels = copy[document.documentElement.lang] || copy.en;
    appIdentity = identity(window.WFAppIdentity, typeof S === 'object' ? S.settings : {});
    if (headerLabel) headerLabel.textContent = labels.heading;
    name.textContent = labels.name;
    markLabel.textContent = labels.mark; mark.setAttribute('aria-label', labels.markRobot);
    if (close) { close.title = labels.close; close.setAttribute('aria-label', labels.close); }
    previous.setAttribute('aria-label', labels.previous); next.setAttribute('aria-label', labels.next);
    previous.title = labels.previous; next.title = labels.next;
    returnAction.textContent = labels.back; returnAction.setAttribute('aria-label', labels.close);
    navigation.setAttribute('aria-label', labels.heading); schedulePages(reset);
  }
  previous.addEventListener('click', () => showPage(currentPage - 1)); next.addEventListener('click', () => showPage(currentPage + 1));
  panel.addEventListener('keydown', event => {
    if (event.target.closest('a, button, input, textarea, select, summary')) return;
    const rtl = document.documentElement.dir === 'rtl';
    const step = event.key === 'ArrowRight' ? (rtl ? -1 : 1) : event.key === 'ArrowLeft' ? (rtl ? 1 : -1) : 0;
    if (!step && !['Home', 'End'].includes(event.key)) return;
    event.preventDefault(); showPage(step ? currentPage + step : event.key === 'Home' ? 0 : pages.length - 1);
  });
  let wasOpen = dialog.open;
  new MutationObserver(() => { if (dialog.open && !wasOpen) refresh(true); wasOpen = dialog.open; }).observe(dialog, {attributes:true, attributeFilter:['open']});
  new MutationObserver(() => refresh()).observe(document.documentElement, {attributes:true, attributeFilter:['lang']});
  if (typeof ResizeObserver === 'function') new ResizeObserver(() => {
    const width = measure.clientWidth, height = measure.clientHeight;
    if (width !== lastWidth || height !== lastHeight) { lastWidth = width; lastHeight = height; schedulePages(); }
  }).observe(panel);
  else window.addEventListener('resize', () => schedulePages(), {passive:true});
  document.fonts?.ready.then(() => schedulePages()).catch(() => {});
  refresh(true);
})();
