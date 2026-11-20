/* A local notifications destination. Content can be added later without changing
   its route, the shared toolbar control, or the app's existing speech features. */
(function (root) {
  'use strict';
  const document = root.document, html = document?.documentElement;
  const main = document?.getElementById('mainContent'), settings = document?.getElementById('headerSettingsBtn');
  if (!main || !settings?.parentNode || root.WFNotifications || typeof root.showPage !== 'function') return;

  const copy = {
    ar: {title: 'الإشعارات', subtitle: 'مساحة مخصّصة للإشعارات', empty: 'لا توجد إشعارات بعد', description: 'هذه الصفحة جاهزة للإشعارات التي ستضيفها لاحقًا.', back: 'رجوع', menu: 'فتح القائمة', closeMenu: 'طيّ القائمة'},
    en: {title: 'Notifications', subtitle: 'A space for your notifications', empty: 'No notifications yet', description: 'This space is ready for the notifications you add later.', back: 'Back', menu: 'Open sidebar', closeMenu: 'Close sidebar'},
    tr: {title: 'Bildirimler', subtitle: 'Bildirimleriniz için bir alan', empty: 'Henüz bildirim yok', description: 'Bu alan, daha sonra ekleyeceğiniz bildirimler için hazır.', back: 'Geri', menu: 'Menüyü aç', closeMenu: 'Menüyü kapat'},
    fr: {title: 'Notifications', subtitle: 'Un espace pour vos notifications', empty: 'Aucune notification pour le moment', description: 'Cet espace est prêt à accueillir les notifications que vous ajouterez plus tard.', back: 'Retour', menu: 'Ouvrir le menu', closeMenu: 'Fermer le menu'},
    ru: {title: 'Уведомления', subtitle: 'Место для ваших уведомлений', empty: 'Уведомлений пока нет', description: 'Здесь можно будет разместить уведомления, которые вы добавите позже.', back: 'Назад', menu: 'Открыть меню', closeMenu: 'Закрыть меню'}
  };
  const bellIcon = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></svg>';
  function make(tag, className, id) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (id) element.id = id;
    return element;
  }
  const page = make('section', 'page wf-notifications-page', 'page-notifications');
  page.setAttribute('aria-labelledby', 'wfNotificationsTitle');
  const header = make('header', 'sct-sticky-header wf-heading-row');
  const back = make('button', 'sct-back-btn'); back.type = 'button'; back.setAttribute('onclick', 'goBack()');
  const backLabel = make('span'); back.append(backLabel);
  const heading = make('div', 'sct-sticky-title wf-centered-heading');
  const title = make('h1', '', 'wfNotificationsTitle'); title.tabIndex = -1;
  const subtitle = make('p'); heading.append(title, subtitle);
  const menu = make('button', 'wf-section-menu'); menu.type = 'button';
  menu.setAttribute('aria-controls', 'sidebar'); menu.setAttribute('aria-expanded', 'false');
  menu.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4 6h16M4 12h16M4 18h16"/></svg>';
  menu.addEventListener('click', () => root.wfToggleDesktopSidebar?.());
  header.append(back, heading, menu);
  const body = make('div', 'wf-notifications-body'), empty = make('section', 'wf-notifications-empty');
  empty.setAttribute('aria-labelledby', 'wfNotificationsEmpty');
  const illustration = make('div', 'wf-notifications-illustration'); illustration.setAttribute('aria-hidden', 'true'); illustration.innerHTML = bellIcon;
  const emptyTitle = make('h2', '', 'wfNotificationsEmpty'), description = make('p', '', 'wfNotificationsDescription');
  empty.append(illustration, emptyTitle, description); body.append(empty); page.append(header, body); main.append(page);

  const button = make('button', 'icon-btn', 'wfNotificationsButton'); button.type = 'button';
  button.setAttribute('aria-controls', 'page-notifications'); button.innerHTML = bellIcon;
  const home = settings.parentNode; home.insertBefore(button, settings);
  html.classList.add('wf-notifications-enabled');
  const headingSelector = '.wf-heading-row,.wf-label-toolbar';
  let mountedHeading = null, observedPage = null, headings = [], placementQueued = false, lastLocale = '', focusRevision = 0;
  const current = () => document.querySelector('.page.active')?.id.slice(5) || 'dashboard';
  const language = () => {
    const locale = String(html.lang || 'en').toLowerCase().split(/[-_]/)[0];
    return copy[locale] ? locale : 'en';
  };
  function translate() {
    const locale = language();
    if (locale === lastLocale) return;
    lastLocale = locale;
    const text = copy[locale];
    page.lang = locale; page.dir = locale === 'ar' ? 'rtl' : 'ltr';
    title.textContent = text.title; subtitle.textContent = text.subtitle;
    emptyTitle.textContent = text.empty; description.textContent = text.description;
    button.title = text.title; button.setAttribute('aria-label', text.title);
    backLabel.textContent = text.back; back.title = text.back; back.setAttribute('aria-label', text.back);
    const menuText = text[menu.getAttribute('aria-expanded') === 'true' ? 'closeMenu' : 'menu'];
    menu.title = menuText; menu.setAttribute('aria-label', menuText);
  }
  function slot(row, enabled) {
    if (row && row.classList.contains('wf-notifications-slot') !== enabled) row.classList.toggle('wf-notifications-slot', enabled);
  }
  function visible(row) {
    return !row.closest('dialog,[role="dialog"],.modal-ov,[hidden],[inert]') && row.getClientRects().length && root.getComputedStyle(row).visibility === 'visible';
  }
  function place() {
    placementQueued = false;
    const active = document.querySelector('.page.active'), section = active && active.id !== 'page-dashboard';
    if (observedPage !== active) {
      pageObserver.disconnect(); observedPage = active;
      if (active) pageObserver.observe(active, {subtree: true, childList: true, attributes: true, attributeFilter: ['class', 'style', 'hidden', 'inert']});
    }
    headings = section ? [...active.querySelectorAll(headingSelector)] : [];
    const row = headings.find(visible) || null, target = row || home;
    if (button.parentNode !== target) {
      if (target === home && settings.parentNode === home) home.insertBefore(button, settings);
      else target.append(button);
    }
    if (mountedHeading !== row) slot(mountedHeading, false);
    mountedHeading = row; slot(row, true);
    const hidden = Boolean(section && !row);
    if (button.hidden !== hidden) button.hidden = hidden;
    const location = section ? row ? 'section' : 'none' : 'dashboard';
    if (button.dataset.location !== location) button.dataset.location = location;
    if (active === page) {
      if (button.getAttribute('aria-current') !== 'page') button.setAttribute('aria-current', 'page');
    } else if (button.hasAttribute('aria-current')) button.removeAttribute('aria-current');
    translate();
  }
  function schedulePlace() {
    if (placementQueued) return;
    placementQueued = true; root.requestAnimationFrame(place);
  }
  // Watch only the active page, and ignore row/list content updates. A label
  // preview or a large catalog must not repeatedly remeasure its toolbar.
  const pageObserver = new root.MutationObserver(records => {
    const relevant = records.some(record => {
      const target = record.target;
      if (target === button || button.contains(target)) return false;
      if (record.type === 'attributes') return target === observedPage || headings.some(row => target === row || target.contains(row));
      const nodes = [...record.addedNodes, ...record.removedNodes].filter(node => node !== button && node.nodeType === 1);
      return nodes.some(node => node.matches(headingSelector) || node.querySelector(headingSelector) || headings.some(row => node === row || node.contains(row)));
    });
    if (relevant) schedulePlace();
  });
  const shellObserver = new root.MutationObserver(records => {
    if (records.some(record => record.attributeName === 'lang' || record.attributeName === 'dir')) translate();
    if (document.querySelector('.page.active') !== observedPage) schedulePlace();
  });
  shellObserver.observe(html, {attributes: true, attributeFilter: ['class', 'lang', 'dir']});
  const pagesObserver = new root.MutationObserver(records => {
    for (const record of records) for (const node of record.addedNodes) if (node.nodeType === 1 && node.classList.contains('page')) {
      shellObserver.observe(node, {attributes: true, attributeFilter: ['class']});
    }
    if (document.querySelector('.page.active') !== observedPage) schedulePlace();
  });
  for (const item of main.querySelectorAll('.page')) shellObserver.observe(item, {attributes: true, attributeFilter: ['class']});
  pagesObserver.observe(main, {childList: true});

  function focusAfterRoute(before) {
    const destination = current(), revision = ++focusRevision;
    if (destination !== 'notifications' && before !== 'notifications') return;
    root.requestAnimationFrame(() => {
      if (revision !== focusRevision || current() !== destination) return;
      const target = destination === 'notifications' ? title : button;
      if (!target.hidden && target.getClientRects().length) target.focus({preventScroll: true});
    });
  }
  const originalShowPage = root.showPage;
  root.showPage = function (id, pushHistory = true) {
    const before = current(), previousState = root.history.state;
    const hasReturnEntry = before === 'notifications' ? previousState?.wfNotificationsEntry === true : root.location.hash !== '#notifications';
    const result = originalShowPage.apply(this, arguments);
    if (id === 'notifications' && current() === id && pushHistory) {
      root.history.replaceState({...root.history.state, page: id, wfNotificationsEntry: hasReturnEntry,
        wfNotificationsOrigin: before === id ? previousState?.wfNotificationsOrigin || 'dashboard' : before}, '', '#notifications');
    }
    place(); focusAfterRoute(before);
    return result;
  };
  function open() {
    if (current() === 'notifications') { title.focus({preventScroll: true}); return; }
    root.showPage('notifications');
  }
  const originalBack = root.goBack;
  root.goBack = function () {
    if (current() !== 'notifications') return originalBack?.apply(this, arguments);
    if (root.history.state?.wfNotificationsEntry === true) root.history.back();
    else {
      root.showPage('dashboard', false);
      root.history.replaceState({page: 'dashboard'}, '', '#dashboard');
    }
  };
  function route(state) {
    const hash = root.location.hash.slice(1);
    for (const id of [hash, state?.page]) if (typeof id === 'string' && document.getElementById('page-' + id)) return id;
    return 'dashboard';
  }
  // The existing router delegates here before its hierarchical Back behavior.
  // Keep the capture listener as a fallback, without relying on listener order.
  function handleHistory(event) {
    const target = route(event.state);
    if (current() !== 'notifications' && target !== 'notifications') return false;
    event.stopImmediatePropagation();
    root.showPage(target, false);
    return true;
  }
  root.addEventListener('popstate', handleHistory, {capture: true});
  root.addEventListener('hashchange', () => {
    const target = route(root.history.state), before = current();
    if (target === before || before !== 'notifications' && target !== 'notifications') return;
    if (target === 'notifications') root.history.replaceState({...root.history.state, page: target, wfNotificationsEntry: true, wfNotificationsOrigin: before}, '', '#notifications');
    root.showPage(target, false);
  });
  root.addEventListener('resize', schedulePlace, {passive: true});
  root.addEventListener('pageshow', schedulePlace);
  button.addEventListener('click', open);
  root.WFNotifications = Object.freeze({open, handleHistory});
  place();
})(typeof window === 'object' ? window : globalThis);
