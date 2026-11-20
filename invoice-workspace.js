/* Invoice editing has one set of live controls. This module only arranges and
   labels those controls; the original handlers own records and calculations. */
(() => {
  'use strict';
  function mountInvoiceWorkspace(document, window) {
    const page = document.getElementById('page-create-invoice');
    if (!page || window.WFInvoiceWorkspace) return window.WFInvoiceWorkspace || null;
    const root = document.documentElement;
    const byId = id => document.getElementById(id);
    const languages = ['ar', 'en', 'tr', 'fr', 'ru'];
    const copy = {
      pricing: ['التسعير والدفع', 'Pricing and payment', 'Fiyatlandırma ve ödeme', 'Tarifs et paiement', 'Цены и оплата'],
      delivery: ['الشحن والملاحظات', 'Shipping and notes', 'Sevkiyat ve notlar', 'Livraison et notes', 'Доставка и примечания'],
      search: ['البحث عن منتج', 'Search products', 'Ürün ara', 'Rechercher un produit', 'Поиск товаров'],
      add: ['إضافة إلى الفاتورة', 'Add to invoice', 'Faturaya ekle', 'Ajouter à la facture', 'Добавить в счёт'],
      remove: ['حذف من الفاتورة', 'Remove from invoice', 'Faturadan kaldır', 'Retirer de la facture', 'Удалить из счёта'],
      increase: ['زيادة الكمية', 'Increase quantity', 'Miktarı artır', 'Augmenter la quantité', 'Увеличить количество'],
      decrease: ['تقليل الكمية', 'Decrease quantity', 'Miktarı azalt', 'Réduire la quantité', 'Уменьшить количество'],
      customColor: ['لون مخصص', 'Custom color', 'Özel renk', 'Couleur personnalisée', 'Свой цвет'],
      resetColor: ['إعادة اللون الافتراضي', 'Reset color', 'Rengi sıfırla', 'Réinitialiser la couleur', 'Сбросить цвет'],
      image: ['تكبير صورة المنتج', 'Enlarge product image', 'Ürün görselini büyüt', 'Agrandir la photo', 'Увеличить фото товара'],
      basePrice: ['سعر الوحدة الأساسي (USD)', 'Base unit price (USD)', 'Temel birim fiyatı (USD)', 'Prix unitaire de base (USD)', 'Базовая цена за единицу (USD)']
    };
    const text = key => copy[key][Math.max(0, languages.indexOf(root.lang || 'ar'))];
    const paths = {
      invoice: '<path d="M14 3H5a1 1 0 0 0-1 1v16h16V9Zm0 0v6h6M8 13h8m-8 4h6"/>',
      client: '<circle cx="9" cy="7" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3m2-17a3 3 0 0 1 0 6m1 4a5 5 0 0 1 3 5v2"/>',
      hash: '<path d="m10 3-4 18M18 3l-4 18M4 8h16M2 16h16"/>',
      calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4m10-4v4M3 11h18M7 15h2m4 0h2"/>',
      globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a19 19 0 0 1 0 18 19 19 0 0 1 0-18Z"/>',
      money: '<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="12" cy="12" r="3"/><path d="M7 9H6m12 6h-1"/>',
      truck: '<path d="M3 6h12v11H3Zm12 4h4l3 4v3h-7"/><circle cx="7" cy="18" r="2"/><circle cx="18" cy="18" r="2"/>',
      notes: '<path d="M4 3h16v18H4ZM8 7h8M8 11h8m-8 4h5"/>',
      tag: '<path d="M3 3h8l10 10-8 8L3 11Z"/><circle cx="7" cy="7" r="1"/>',
      tax: '<path d="M4 21V5l3-2 3 2 3-2 3 2 4-2v18l-4-2-3 2-3-2-3 2Zm4-5 8-8"/><circle cx="8" cy="9" r="1"/><circle cx="16" cy="15" r="1"/>',
      package: '<path d="m3 7 9-4 9 4v10l-9 4-9-4Zm0 0 9 5 9-5M12 12v9M7.5 5l9 4"/>',
      save: '<path d="M5 3h12l4 4v14H3V3Zm2 0v6h10V3M7 21v-8h10v8"/>',
      preview: '<path d="M2 12s4-8 10-8 10 8 10 8-4 8-10 8S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
      share: '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m9 10 6-4M9 14l6 4"/>',
      scan: '<path d="M3 7V3h4m10 0h4v4m0 10v4h-4M7 21H3v-4M8 7v10M12 7v10M16 7v10"/>',
      trash: '<path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7"/>',
      plus: '<path d="M12 5v14M5 12h14"/>',
      close: '<path d="m6 6 12 12M18 6 6 18"/>',
      chevron: '<path d="m6 9 6 6 6-6"/>'
    };
    const set = (node, name, value) => { if (node && node.getAttribute(name) !== String(value)) node.setAttribute(name, String(value)); };
    const addClass = (node, name) => { if (node && !node.classList.contains(name)) node.classList.add(name); };
    const make = (tag, className, value) => { const node = document.createElement(tag); node.className = className; if (value !== undefined) node.textContent = value; return node; };
    const cleanUiText = value => String(value).replace(/^\s*(?:(?:\p{Extended_Pictographic}|\p{Regional_Indicator})\uFE0F?\u200D?)+\s*/u, '');
    function icon(host, name) {
      if (!host) return;
      for (const node of [...host.childNodes]) {
        if (node.nodeType === 3) { const clean = cleanUiText(node.nodeValue); if (clean !== node.nodeValue) node.nodeValue = clean; }
        else if (node.nodeType === 1 && node.hasAttribute('data-wf-ui-icon') && !node.hasAttribute('data-wf-invoice-icon')) node.remove();
      }
      let symbol = [...host.children].find(child => child.hasAttribute('data-wf-invoice-icon'));
      if (!symbol) { symbol = make('span', 'wf-invoice-icon'); set(symbol, 'data-wf-ui-icon', 'invoice'); set(symbol, 'aria-hidden', 'true'); host.prepend(symbol); }
      if (symbol.getAttribute('data-wf-invoice-icon') !== name) {
        set(symbol, 'data-wf-invoice-icon', name);
        symbol.innerHTML = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" focusable="false" aria-hidden="true">' + (paths[name] || paths.invoice) + '</svg>';
      }
    }
    function activate(event) {
      if ((event.key === 'Enter' || event.key === ' ') && event.target === event.currentTarget && !event.currentTarget.closest('[inert]')) {
        event.preventDefault(); event.stopPropagation(); if (!event.repeat) event.currentTarget.click();
      }
    }
    const keyboard = new WeakSet();
    function keyboardButton(node) {
      if (!node || keyboard.has(node)) return;
      keyboard.add(node); node.tabIndex = 0; set(node, 'role', 'button'); node.addEventListener('keydown', activate);
    }
    const disclosures = [];
    function disclosure(key, name) {
      const details = make('details', 'wf-invoice-option'), summary = make('summary', 'wf-invoice-option-title');
      const caption = make('span', 'wf-invoice-option-caption'); summary.append(caption); icon(summary, name);
      const arrow = make('span', 'wf-invoice-option-arrow'); icon(arrow, 'chevron'); summary.append(arrow);
      const body = make('div', 'wf-invoice-option-body'); details.append(summary, body);
      disclosures.push({ key, caption }); return { details, body };
    }
    function layout() {
      addClass(page, 'wf-invoice-workspace');
      const title = byId('invFormTitle'), header = title?.closest('.sct-sticky-header');
      const chips = byId('curInvNum')?.closest('.chip-row');
      addClass(header, 'wf-invoice-header');
      if (header && chips && chips.parentElement !== page) { addClass(chips, 'wf-invoice-context'); header.after(chips); }
      const save = [...page.querySelectorAll('button')].find(button => button.getAttribute('onclick') === 'saveInvoice()');
      addClass(save?.parentElement, 'wf-invoice-primary-actions');
      const essentials = byId('step1Body');
      if (essentials && !byId('wfInvoiceEssentials')) {
        const grid = make('div', 'wf-invoice-essentials'); grid.id = 'wfInvoiceEssentials';
        const previousRows = new Set();
        for (const id of ['invCoSel', 'invNumDisplay', 'invCurrency', 'invCountry', 'invProvince', 'invRegDate', 'invLoadDate']) {
          const field = byId(id)?.closest('.fg'); if (!field) continue;
          previousRows.add(field.parentElement); grid.append(field);
          addClass(field, 'wf-invoice-field-' + id);
        }
        essentials.prepend(grid);
        for (const row of previousRows) if (row && !row.children.length && !row.textContent.trim()) row.remove();
        const options = make('div', 'wf-invoice-options'); essentials.append(options);
        const pricing = disclosure('pricing', 'tag'), shipping = disclosure('delivery', 'truck');
        const premium = essentials.querySelector('.premium-split-card'); if (premium) pricing.body.append(premium);
        const payment = byId('invPayMethodSelect')?.closest('.fg'); if (payment) pricing.body.append(payment);
        const shippingRow = byId('shippingTruckRow'); if (shippingRow) shipping.body.append(shippingRow);
        const notes = byId('invNotes')?.parentElement; if (notes) { addClass(notes, 'wf-invoice-notes'); shipping.body.append(notes); }
        options.append(pricing.details, shipping.details);
        for (const child of [...essentials.children]) {
          if (child.tagName === 'DIV' && !child.id && !child.children.length && !child.textContent.trim()) addClass(child, 'wf-invoice-empty-decoration');
        }
      }
      const builder = page.querySelector('.inv-builder'); addClass(builder?.firstElementChild, 'wf-invoice-main');
      addClass(byId('step5Body')?.parentElement, 'wf-invoice-picker');
      const items = byId('step6Body'); addClass(items, 'wf-invoice-items-workspace');
      const totals = byId('sumSectionLabel')?.parentElement;
      if (totals) { addClass(totals, 'wf-invoice-totals'); set(totals, 'role', 'region'); set(totals, 'aria-labelledby', 'sumSectionLabel'); }
      const table = byId('invItemsTbody')?.closest('table');
      if (table) { addClass(table, 'wf-invoice-lines'); set(table, 'role', 'table'); addClass(table.parentElement, 'wf-invoice-lines-container'); }
    }
    function decorateHeader() {
      icon(byId('invFormTitle'), 'invoice');
      for (const [handler, name] of [['saveInvoice()', 'save'], ['previewInvoice()', 'preview'], ['openUnifiedShareModal(event)', 'share']]) {
        const button = [...page.querySelectorAll('button')].find(node => node.getAttribute('onclick') === handler);
        if (button) { icon(button, name); const caption = button.querySelector('[data-i18n]')?.textContent.trim(); if (caption) { set(button, 'aria-label', caption); button.title = caption; } }
      }
      icon(byId('curInvNum')?.parentElement, 'hash'); icon(byId('invCBMChip')?.parentElement, 'package');
    }
    function decorateStatic() {
      decorateHeader();
      for (const [id, name] of [['invCoSel','client'],['invNumDisplay','hash'],['invCurrency','money'],['invCountry','globe'],['invProvince','globe'],['invRegDate','calendar'],['invLoadDate','calendar'],['invShippingSelect','truck'],['invPlate','truck'],['invTruck','hash'],['invPayMethodSelect','money']]) {
        const field = byId(id), label = field?.closest('.fg')?.querySelector('label.fl');
        icon(label, name);
        if (label && field?.matches('input,select,textarea') && !label.htmlFor) label.htmlFor = id;
      }
      const notesLabel = byId('invNotes')?.parentElement?.querySelector('label.fl');
      icon(notesLabel, 'notes'); if (notesLabel && !notesLabel.htmlFor) notesLabel.htmlFor = 'invNotes';
      const tier = byId('invTierGrp'), tax = byId('kdvToggleRow');
      icon(tier?.parentElement?.querySelector('label.fl'), 'tag'); icon(tax?.parentElement?.querySelector('label.fl'), 'tax');
      icon(tax?.querySelector('.kdv-toggle-icon'), 'tax'); icon(byId('invTypeLabel'), 'invoice');
      for (const id of ['step1Arrow','step5Arrow','step6Arrow']) {
        const arrow = byId(id); if (arrow) { for (const node of [...arrow.childNodes]) if (node.nodeType === 3 && /^[\s▼▲]*$/.test(node.nodeValue)) node.nodeValue = ''; icon(arrow, 'chevron'); set(arrow, 'aria-hidden', 'true'); }
      }
      for (const entry of disclosures) if (entry.caption.textContent !== text(entry.key)) entry.caption.textContent = text(entry.key);
      const search = byId('invPrSearch');
      if (search) set(search, 'aria-label', text('search'));
      const scanner = page.querySelector('.btn-scanner-large');
      if (scanner) { icon(scanner, 'scan'); set(scanner, 'aria-label', scanner.title || text('search')); scanner.type = 'button'; }
      for (const choice of tier?.querySelectorAll('.price-tier-btn') || []) { keyboardButton(choice); set(choice, 'aria-pressed', choice.classList.contains('sel')); }
    }
    function decoratePicker() {
      for (const item of byId('prSelectorList')?.querySelectorAll('.ps-item') || []) {
        keyboardButton(item);
        const name = item.querySelector('.ps-name')?.textContent.trim() || '', price = item.querySelector('.ps-price')?.textContent.trim() || '';
        set(item, 'aria-label', text('add') + ' · ' + name + (price ? ' · ' + price : ''));
        let add = item.querySelector('.wf-invoice-picker-add');
        if (!add) { add = make('span', 'wf-invoice-picker-add'); set(add, 'aria-hidden', 'true'); icon(add, 'plus'); item.append(add); }
        const thumb = item.querySelector('.ps-thumb'); if (thumb && !thumb.querySelector('img')) icon(thumb, 'package');
      }
    }
    const cellNames = ['index','image','name','dimensions','color','quantity','price','total','volume','remove'];
    function decorateRows() {
      const tbody = byId('invItemsTbody'), table = tbody?.closest('table'); if (!table) return;
      const headers = [...(table.querySelector('thead')?.querySelectorAll('th') || [])];
      for (const [index, header] of headers.entries()) { header.id ||= 'wfInvoiceColumn-' + index; set(header, 'scope', 'col'); set(header, 'role', 'columnheader'); }
      // renderInvTable emits item.priceUSD and setPrice edits that same base
      // amount. The invoice selector changes converted totals, never this
      // input's units. Do not relabel or convert its live value here.
      const displayCurrency = byId('invCurrency')?.value || '';
      set(headers[6], 'data-wf-invoice-currency', 'USD');
      set(headers[6], 'aria-label', text('basePrice'));
      set(headers[7], 'data-wf-invoice-currency', displayCurrency);
      set(headers[7], 'aria-label', (headers[7]?.textContent.trim() || '') + (displayCurrency ? ' · ' + displayCurrency : ''));
      for (const group of table.querySelectorAll('thead,tbody,tfoot')) set(group, 'role', 'rowgroup');
      for (const row of table.querySelectorAll('tr')) set(row, 'role', 'row');
      for (const row of tbody.querySelectorAll('tr')) {
        const cells = [...row.children]; if (cells.length !== 10) continue;
        addClass(row, 'wf-invoice-line'); const productName = cells[2].textContent.trim();
        for (const [index, cell] of cells.entries()) {
          addClass(cell, 'wf-invoice-cell-' + cellNames[index]); set(cell, 'role', 'cell');
          if (headers[index]) set(cell, 'headers', headers[index].id);
          if (index < 3 || index === 9) continue;
          let caption = [...cell.children].find(child => child.classList.contains('wf-invoice-cell-label'));
          if (!caption) { caption = make('span', 'wf-invoice-cell-label'); set(caption, 'aria-hidden', 'true'); cell.prepend(caption); }
          const label = index === 6 ? text('basePrice') : (headers[index]?.textContent.trim() || '') + (index === 7 && displayCurrency ? ' · ' + displayCurrency : '');
          if (caption.textContent !== label) caption.textContent = label;
          set(caption, 'dir', root.dir || (root.lang === 'ar' ? 'rtl' : 'ltr'));
          for (const input of cell.querySelectorAll('input,select')) {
            const fieldLabel = index === 6 ? label : input.title || (input.type === 'text' && index === 4 ? text('customColor') : label);
            set(input, 'aria-label', fieldLabel + ' · ' + productName);
          }
        }
        const quantity = cells[5].querySelectorAll('button');
        for (const [index, button] of [...quantity].entries()) { button.type = 'button'; set(button, 'aria-label', text(index ? 'increase' : 'decrease') + ' · ' + productName); }
        const remove = cells[9].querySelector('button');
        if (remove) { remove.type = 'button'; icon(remove, 'trash'); set(remove, 'aria-label', text('remove') + ' · ' + productName); remove.title = text('remove'); }
        const reset = cells[4].querySelector('button');
        if (reset) {
          reset.type = 'button';
          for (const node of [...reset.childNodes]) if (node.nodeType === 3 && node.nodeValue.trim() === '✕') node.nodeValue = '';
          icon(reset, 'close'); set(reset, 'aria-label', text('resetColor') + ' · ' + productName);
        }
        for (const child of [...cells[3].children]) if (child.querySelector('input')) addClass(child, 'wf-invoice-dimension-inputs');
        const image = cells[1].querySelector('img');
        if (image) { if (!image.alt) image.alt = productName; if (image.getAttribute('onclick')) { keyboardButton(image); set(image, 'aria-label', text('image') + ' · ' + productName); } }
        else icon(cells[1].firstElementChild, 'package');
      }
    }
    function refresh() { layout(); decorateStatic(); decoratePicker(); decorateRows(); }
    function after(name, callback) {
      const original = window[name]; if (typeof original !== 'function') return;
      window[name] = function(...args) { const result = original.apply(this, args); callback(); return result; };
    }
    after('renderInvTable', decorateRows); after('renderPrSelector', decoratePicker);
    after('updateInvFormLabels', decorateHeader); after('updateStep1Texts', decorateStatic); after('selInvType', decorateStatic); after('selInvTier', decorateStatic);
    let queued = false;
    function schedule() { if (queued) return; queued = true; window.requestAnimationFrame(() => { queued = false; refresh(); }); }
    if (window.MutationObserver) new window.MutationObserver(schedule).observe(root, { attributes: true, attributeFilter: ['lang'] });
    const api = { refresh }; window.WFInvoiceWorkspace = api; refresh(); return api;
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = { mountInvoiceWorkspace };
  if (typeof document !== 'undefined' && typeof window !== 'undefined') mountInvoiceWorkspace(document, window);
})();
