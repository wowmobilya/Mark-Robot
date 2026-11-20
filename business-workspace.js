/* Presentation and keyboard access for the existing business workspaces.
   Original records, form controls and business handlers remain their owners. */
(() => {
  'use strict';
  if (typeof document === 'undefined' || window.WFBusinessWorkspace) return;
  const root = document.documentElement;
  const pageIds = ['companies', 'select-client-type', 'add-company', 'invoices',
    'select-invoice-type', 'create-invoice', 'payment-management', 'reports', 'exchange', 'cashboxes'];
  const pages = pageIds.map(id => document.getElementById('page-' + id)).filter(Boolean);
  const languages = ['ar', 'en', 'tr', 'fr', 'ru'];
  const copy = {
    actions: ['الإجراءات', 'Actions', 'İşlemler', 'Actions', 'Действия'],
    hideActions: ['إخفاء الإجراءات', 'Hide actions', 'İşlemleri gizle', 'Masquer les actions', 'Скрыть действия'],
    table: ['جدول يمكن تمريره أفقيًا', 'Horizontally scrollable table', 'Yatay kaydırılabilir tablo', 'Tableau à défilement horizontal', 'Таблица с горизонтальной прокруткой']
  };
  const text = key => copy[key][Math.max(0, languages.indexOf(root.lang || 'ar'))];
  const cards = new WeakMap(), details = new WeakMap();
  const grids = [];
  let nextCard = 0;
  const set = (element, name, value) => {
    const next = String(value);
    if (element.getAttribute(name) !== next) element.setAttribute(name, next);
  };
  const activateOnKey = event => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    if (event.target !== event.currentTarget || event.currentTarget.closest('[inert]')) return;
    event.preventDefault(); event.stopPropagation(); event.currentTarget.click();
  };

  function labelFields(scope) {
    for (const label of scope.querySelectorAll('label.fl')) {
      if (label.htmlFor || label.querySelector('input,select,textarea')) continue;
      let sibling = label.nextElementSibling, field = null;
      while (sibling && !sibling.matches('label')) {
        field = sibling.matches('input,select,textarea') ? sibling : sibling.querySelector('input,select,textarea');
        if (field) break;
        sibling = sibling.nextElementSibling;
      }
      if (field?.id) label.htmlFor = field.id;
    }
  }
  for (const page of pages) {
    page.classList.add('wf-business-page');
    labelFields(page);
  }
  for (const [id, mode, autocomplete] of [
    ['coPhone', 'tel', 'tel'], ['coEmail', 'email', 'email'], ['coWebsite', 'url', 'url']
  ]) {
    const field = document.getElementById(id);
    if (field) { field.inputMode = mode; field.autocomplete = autocomplete; field.dir = 'ltr'; }
  }

  // Preserve the user's place and visible client/invoice identity when actions open.
  function syncCard(card) {
    const item = cards.get(card); if (!item) return;
    const open = card.classList.contains('is-open');
    const caption = text(open ? 'hideActions' : 'actions');
    if (item.caption.textContent !== caption) item.caption.textContent = caption;
    set(item.toggle, 'aria-expanded', open);
    const name = card.querySelector('.co-name,.inv-card-num')?.textContent.trim() || '';
    set(item.toggle, 'aria-label', name ? caption + ' · ' + name : caption);
    item.actions.hidden = !open;
    item.actions.inert = !open;
  }
  function syncDetails(body) {
    const control = details.get(body); if (control) set(control, 'aria-expanded', body.classList.contains('open'));
  }
  function enhanceCard(card) {
    if (cards.has(card)) return;
    const actions = card.querySelector('.co-card-actions,.inv-card-actions');
    if (!actions) return;
    const toggle = document.createElement('button'), caption = document.createElement('span');
    toggle.type = 'button'; toggle.className = 'wf-business-card-toggle';
    const chevron = document.createElement('span'); chevron.setAttribute('aria-hidden', 'true');
    chevron.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8"><path d="m6 9 6 6 6-6"/></svg>';
    toggle.append(caption, chevron);
    if (!actions.id) actions.id = 'wfBusinessActions-' + (++nextCard);
    toggle.setAttribute('aria-controls', actions.id);
    actions.before(toggle);
    card.classList.add('wf-business-card');
    cards.set(card, { actions, toggle, caption });
    toggle.addEventListener('click', event => {
      event.stopPropagation();
      // The original handler owns one-open-card behavior and all selection state.
      card.click();
      syncCard(card);
    });
    card.addEventListener('click', () => syncCard(card));
    card.addEventListener('keydown', event => {
      if (event.key !== 'Escape' || !card.classList.contains('is-open')) return;
      event.preventDefault(); event.stopPropagation(); card.click(); syncCard(card);
      toggle.focus({ preventScroll: true });
    });
    const detailControl = card.querySelector('.co-details-toggle'), detailBody = card.querySelector('.co-details-body');
    if (detailControl && detailBody) {
      set(detailControl, 'role', 'button'); detailControl.tabIndex = 0;
      set(detailControl, 'aria-controls', detailBody.id);
      details.set(detailBody, detailControl);
      detailControl.addEventListener('keydown', activateOnKey);
      detailControl.addEventListener('click', event => {
        // Opening contact details must not also open the card's action menu.
        event.stopPropagation(); syncDetails(detailBody);
      });
      syncDetails(detailBody);
    }
    syncCard(card);
  }
  for (const id of ['coGrid', 'invListContainer']) {
    const grid = document.getElementById(id); if (!grid) continue;
    grids.push(grid);
    grid.querySelectorAll('.co-card,.inv-card').forEach(enhanceCard);
    new MutationObserver(records => {
      for (const record of records) {
        if (record.type === 'childList' && record.target === grid) {
          for (const node of record.addedNodes) if (node.nodeType === 1 && node.matches('.co-card,.inv-card')) enhanceCard(node);
        } else if (record.type === 'attributes') {
          if (cards.has(record.target)) syncCard(record.target);
          else if (details.has(record.target)) syncDetails(record.target);
        }
      }
    }).observe(grid, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
  }

  // Click, keyboard and programmatic collapsing all share the original bodies.
  const accordionBodies = new Map(), accordionInert = new WeakSet();
  function syncAccordion(body) {
    const control = accordionBodies.get(body);
    if (!control) return;
    const collapsed = body.classList.contains('collapsed');
    set(control, 'aria-expanded', !collapsed);
    if (collapsed && !body.inert) { body.inert = true; accordionInert.add(body); }
    else if (!collapsed && accordionInert.has(body)) { body.inert = false; accordionInert.delete(body); }
  }
  const accordionObserver = new MutationObserver(records => records.forEach(record => syncAccordion(record.target)));
  const invoicePage = document.getElementById('page-create-invoice');
  for (const control of invoicePage?.querySelectorAll('.inv-step-hdr') || []) {
    const id = control.getAttribute('onclick')?.match(/toggleStep\(['"]([^'"]+)['"]\)/)?.[1];
    const body = id && document.getElementById(id + 'Body'); if (!body) continue;
    set(control, 'role', 'button'); control.tabIndex = 0;
    set(control, 'aria-controls', body.id);
    control.addEventListener('keydown', activateOnKey);
    control.addEventListener('click', () => syncAccordion(body));
    accordionBodies.set(body, control); syncAccordion(body);
    accordionObserver.observe(body, { attributes: true, attributeFilter: ['class'] });
  }
  for (const wrapper of invoicePage?.querySelectorAll('.inv-tbl-wrap') || []) {
    wrapper.tabIndex = 0; set(wrapper, 'role', 'region'); set(wrapper, 'aria-label', text('table'));
  }
  // Reuse the visible column and item names for controls rebuilt by renderInvTable.
  const invoiceBody = document.getElementById('invItemsTbody');
  const invoiceHeadings = [...(invoiceBody?.closest('table')?.querySelector('thead')?.querySelectorAll('th') || [])];
  const namedInvoiceFields = new WeakSet();
  let nextInvoiceItem = 0;
  invoiceHeadings.forEach((heading, index) => {
    if (!heading.id) heading.id = 'wfBusinessInvoiceColumn-' + index;
  });
  function labelInvoiceRow(row) {
    const cells = [...row.children], name = cells[2];
    if (!name) return;
    if (!name.id) name.id = 'wfBusinessInvoiceItem-' + (++nextInvoiceItem);
    cells.forEach((cell, index) => {
      const heading = invoiceHeadings[index], headingText = heading?.textContent.trim();
      if (!headingText) return;
      for (const field of cell.querySelectorAll('input,select,textarea')) {
        if (!namedInvoiceFields.has(field) && (field.getAttribute('aria-label') || field.getAttribute('aria-labelledby'))) continue;
        namedInvoiceFields.add(field);
        const title = field.getAttribute('title');
        if (title) set(field, 'aria-label', [headingText, title, name.textContent.trim()].filter(Boolean).join(' · '));
        else set(field, 'aria-labelledby', heading.id + ' ' + name.id);
      }
    });
  }
  function labelInvoiceRows() { invoiceBody?.querySelectorAll('tr').forEach(labelInvoiceRow); }
  if (invoiceBody) {
    labelInvoiceRows();
    new MutationObserver(records => {
      for (const record of records) for (const node of record.addedNodes) {
        if (node.nodeType === 1 && node.matches('tr')) labelInvoiceRow(node);
      }
    }).observe(invoiceBody, { childList: true });
  }
  for (const id of ['sumDeposit', 'sumDiscount']) {
    const field = document.getElementById(id), label = field?.previousElementSibling;
    if (!label) continue;
    if (!label.id) label.id = 'wfBusinessLabel-' + id;
    set(field, 'aria-labelledby', label.id);
  }
  const taxToggle = document.getElementById('kdvToggle');
  const taxLabel = document.getElementById('kdvToggleRow')?.querySelector('.kdv-toggle-label');
  if (taxToggle && taxLabel) {
    if (!taxLabel.id) taxLabel.id = 'wfBusinessTaxLabel';
    set(taxToggle, 'aria-labelledby', taxLabel.id);
  }

  // Native radio behavior for the existing receipt-method choices.
  const receiptGrid = document.getElementById('pmReceiptTypeGrid');
  const receiptChoices = receiptGrid ? [...receiptGrid.querySelectorAll('.pm-receipt-type')] : [];
  function syncReceipt() {
    const selected = receiptChoices.find(choice => choice.classList.contains('sel')) || receiptChoices[0];
    for (const choice of receiptChoices) {
      set(choice, 'aria-checked', choice === selected);
      choice.tabIndex = choice === selected ? 0 : -1;
    }
  }
  if (receiptGrid) {
    set(receiptGrid, 'role', 'radiogroup'); set(receiptGrid, 'aria-labelledby', 'pmReceiptTypeLabel');
    for (const choice of receiptChoices) {
      set(choice, 'role', 'radio');
      choice.addEventListener('click', syncReceipt);
      choice.addEventListener('keydown', event => {
        if (choice.closest('[inert]') || choice.getAttribute('aria-disabled') === 'true') return;
        if (event.key === 'Enter' || event.key === ' ') { activateOnKey(event); return; }
        const rtl = root.dir === 'rtl';
        const delta = { ArrowDown: 1, ArrowUp: -1, ArrowRight: rtl ? -1 : 1, ArrowLeft: rtl ? 1 : -1 }[event.key];
        let index;
        if (event.key === 'Home') index = 0;
        else if (event.key === 'End') index = receiptChoices.length - 1;
        else if (delta) index = (receiptChoices.indexOf(choice) + delta + receiptChoices.length) % receiptChoices.length;
        else return;
        event.preventDefault(); event.stopPropagation();
        receiptChoices[index].click(); syncReceipt(); receiptChoices[index].focus();
      });
    }
    new MutationObserver(syncReceipt).observe(receiptGrid, { attributes: true, subtree: true, attributeFilter: ['class'] });
    syncReceipt();
  }
  function translate() {
    for (const grid of grids) grid.querySelectorAll('.co-card,.inv-card').forEach(syncCard);
    for (const wrapper of invoicePage?.querySelectorAll('.inv-tbl-wrap') || []) set(wrapper, 'aria-label', text('table'));
    labelInvoiceRows();
  }
  new MutationObserver(translate).observe(root, { attributes: true, attributeFilter: ['lang'] });
  window.WFBusinessWorkspace = { refreshLabels: translate };
})();
