/* Product presentation reuses the existing fields, actions and calculations. */
(() => {
  'use strict';
  const locales = ['ar', 'en', 'tr', 'fr', 'ru'];
  const words = {
    price: ['السعر النشط', 'Active price', 'Etkin fiyat', 'Tarif actif', 'Активная цена'],
    remove: ['حذف المنتج', 'Delete product', 'Ürünü sil', 'Supprimer le produit', 'Удалить товар'],
    package: ['الباكيت', 'Package', 'Paket', 'Colis', 'Упаковка'],
    measurement: ['قياس القطعة', 'Product size', 'Ürün ölçüsü', 'Dimensions du produit', 'Размер товара'],
    removePackage: ['حذف الباكيت', 'Remove package', 'Paketi kaldır', 'Supprimer le colis', 'Удалить упаковку'],
    removeMeasurement: ['حذف القياس', 'Remove size', 'Ölçüyü kaldır', 'Supprimer les dimensions', 'Удалить размер'],
    addMeasurement: ['إضافة قياس', 'Add size', 'Ölçü ekle', 'Ajouter des dimensions', 'Добавить размер']
  };
  const word = (key, language) => words[key]?.[Math.max(0, locales.indexOf(language))] || key;
  function activePrice(product = {}) {
    const tier = ['A', 'B', 'C'].includes(product.activeTier) ? product.activeTier : 'A';
    const raw = tier === 'A' ? product.priceA ?? product.priceUSD : product['price' + tier];
    const value = Number(raw);
    return {tier, value: Number.isFinite(value) && value >= 0 ? value : 0};
  }
  function syncDisclosure(panel, button) {
    if (!panel || !button) return false;
    // The original toggle remains the owner of open/closed state. Its height
    // is only a state signal; CSS lets expanded content use its natural height.
    const expanded = !['', '0', '0px'].includes(panel.style.maxHeight);
    panel.hidden = !expanded;
    button.setAttribute('aria-expanded', String(expanded));
    button.setAttribute('aria-controls', panel.id);
    return expanded;
  }
  function enhanceBrowseResult(row) {
    if (!row) return;
    row.classList.add('qbl-dd-item', 'wf-product-browse-result');
    row.setAttribute('role', 'button'); row.tabIndex = 0;
    if (!row.dataset.wfKeyboardBrowse) {
      row.dataset.wfKeyboardBrowse = 'true';
      row.addEventListener('keydown', event => {
        if (event.target !== row || !['Enter', ' '].includes(event.key)) return;
        event.preventDefault(); event.stopPropagation();
        if (!event.repeat) row.click();
      });
    }
    const spans = [...row.children].filter(child => child.tagName === 'SPAN');
    const name = spans[1], code = spans[2];
    name?.classList.add('qbl-dd-item-name');
    if (code) {
      code.classList.add('qbl-dd-item-type');
      const primaryText = name?.textContent.trim();
      code.hidden = !!primaryText && code.textContent.trim() === primaryText;
    }
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = {activePrice, syncDisclosure, enhanceBrowseResult, word};
  if (typeof document === 'undefined' || typeof window === 'undefined' || window.WFProductWorkspace) return;
  const byId = id => document.getElementById(id);
  const state = () => typeof S === 'object' ? S : {};
  const language = () => {
    const value = document.documentElement.lang || state().lang || 'ar';
    return locales.includes(value) ? value : 'ar';
  };
  const text = key => word(key, language());
  const make = (tag, className, value) => {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (value !== undefined) el.textContent = value;
    return el;
  };
  const addClass = (node, name) => { if (node && !node.classList.contains(name)) node.classList.add(name); };
  const trashIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7"/></svg>';

  function catalog() {
    const grid = byId('prGrid'); if (!grid) return;
    const products = new Map((state().products || []).map(product => [String(product.id), product]));
    for (const card of grid.querySelectorAll('.pr-card-new')) {
      const image = card.querySelector('.pr-card-new-img'), body = card.querySelector('.pr-card-new-body');
      const product = image && products.get(image.id.slice('prCardImg-'.length));
      if (!product || !body) continue;
      const panel = byId('prDetailsPanel-' + product.id);
      const details = byId('prDetailsBtnTxt-' + product.id)?.closest('button');
      if (!card.dataset.wfProductCard) {
        card.dataset.wfProductCard = 'true';
        // The old presentation-only card flip concealed the product identity.
        // Business actions below keep their original elements and handlers.
        card.removeAttribute('onclick');
        card.classList.remove('is-open');
        card.querySelector('.pr-card-new-toggle-hint')?.remove();
        addClass(body.firstElementChild, 'wf-product-card-heading');
        if (details) {
          details.type = 'button';
          addClass(details, 'wf-product-details-toggle');
          addClass(details.parentElement, 'wf-product-details-control');
        }
        if (panel) {
          addClass(panel, 'wf-product-details');
          addClass(panel.firstElementChild, 'wf-product-facts');
          addClass(panel.children[1], 'wf-product-tiers');
        }
        const actions = card.querySelector('.pr-card-new-actions');
        const remove = actions?.querySelector('button[onclick^="deletePr("]');
        if (remove) {
          addClass(remove, 'wf-product-delete');
          const symbol = make('span', 'wf-product-delete-icon'); symbol.innerHTML = trashIcon;
          remove.replaceChildren(symbol);
        }
      }
      let price = body.querySelector('.wf-product-price');
      if (!price) {
        price = make('div', 'wf-product-price');
        price.append(make('span', 'wf-product-price-label'), make('bdi', 'wf-product-price-value'));
        const control = details?.parentElement;
        if (control?.parentElement === body) control.before(price); else body.append(price);
      }
      const value = activePrice(product);
      price.querySelector('.wf-product-price-label').textContent = text('price') + ' · ' + value.tier;
      price.querySelector('.wf-product-price-value').textContent = new Intl.NumberFormat(language(), {
        style: 'currency', currency: 'USD', currencyDisplay: 'code', minimumFractionDigits: 2, maximumFractionDigits: 2
      }).format(value.value);
      const remove = card.querySelector('.wf-product-delete');
      if (remove) {
        remove.setAttribute('aria-label', text('remove') + ' · ' + product.name);
        remove.title = text('remove');
      }
      syncDisclosure(panel, details);
    }
  }

  function form() {
    const host = byId('pr-form-view'); if (!host || byId('wfProductFormLayout')) return;
    const info = byId('prName')?.closest('.card'), image = byId('prImgArea')?.closest('.card');
    const prices = byId('prPriceA')?.closest('.card'), shipping = byId('dimPiecesContainer')?.closest('.card');
    if (![info, image, prices, shipping].every(Boolean)) return;
    const layout = make('div', 'wf-product-form-layout'); layout.id = 'wfProductFormLayout';
    for (const [card, name] of [[info, 'info'], [image, 'image'], [prices, 'prices'], [shipping, 'shipping']]) {
      addClass(card, 'wf-product-' + name); layout.append(card);
    }
    host.append(layout);
    const infoGrid = byId('prName').closest('.fg')?.parentElement;
    addClass(infoGrid, 'wf-product-info-grid');
    for (const id of ['prName', 'prColorSel', 'prDimRowsWrap']) addClass(byId(id)?.closest('.fg'), 'wf-product-field-wide');
    addClass(byId('prDesc')?.closest('.fg'), 'wf-product-description-field');
    if (infoGrid) {
      const calculated = make('div', 'wf-product-calculated');
      for (const id of ['prWeight', 'prPackets', 'prCbmInfo']) {
        const field = byId(id)?.closest('.fg'); if (field) calculated.append(field);
      }
      infoGrid.append(calculated);
    }
    const priceGrid = byId('prPriceA').closest('.fg')?.parentElement;
    addClass(priceGrid, 'wf-product-price-grid');
    for (const tier of ['A', 'B', 'C']) addClass(byId('prPrice' + tier + '_TRY')?.parentElement, 'wf-product-conversions');
    addClass(byId('cbmCalc')?.parentElement?.parentElement, 'wf-product-shipping-totals');
    for (const group of layout.querySelectorAll('.fg')) {
      const label = group.querySelector('label.fl'), field = group.querySelector('input[id],select[id]');
      if (label && field && !label.htmlFor) label.htmlFor = field.id;
    }
    const imageTitle = image.querySelector('.card-title');
    if (imageTitle && byId('prImgInput')) {
      imageTitle.id ||= 'wfProductImageTitle';
      byId('prImgInput').setAttribute('aria-labelledby', imageTitle.id);
    }
  }

  function tiers() {
    const group = byId('prActiveTierGrp'); if (!group) return;
    for (const choice of group.querySelectorAll('.price-tier-btn')) {
      if (!choice.dataset.wfKeyboardChoice) {
        choice.dataset.wfKeyboardChoice = 'true'; choice.setAttribute('role', 'button'); choice.tabIndex = 0;
        choice.addEventListener('keydown', event => {
          if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); choice.click(); }
        });
      }
      choice.setAttribute('aria-pressed', String(choice.classList.contains('sel')));
    }
  }

  function dimensions() {
    const host = byId('prDimRowsWrap'); if (!host) return;
    for (const [index, row] of [...host.children].entries()) {
      addClass(row, 'wf-product-dimension-row');
      const badge = row.firstElementChild;
      addClass(badge, 'wf-product-dimension-label');
      if (badge) badge.textContent = text('measurement') + ' ' + (index + 1);
      for (const input of row.querySelectorAll('input')) {
        addClass(input.parentElement, 'wf-product-dimension-field');
        input.setAttribute('aria-label', text('measurement') + ' ' + (index + 1) + ' · ' + (input.previousElementSibling?.textContent || '').trim());
      }
      const remove = row.querySelector('button');
      if (remove) {
        addClass(remove, 'wf-product-dimension-remove');
        remove.setAttribute('aria-label', text('removeMeasurement') + ' ' + (index + 1)); remove.title = text('removeMeasurement');
      } else addClass(row.lastElementChild, 'wf-product-dimension-spacer');
    }
    const add = byId('prDimAddBtn');
    if (add) { add.setAttribute('aria-label', text('addMeasurement')); add.title = text('addMeasurement'); }
  }

  function packages() {
    const host = byId('dimPiecesContainer'); if (!host) return;
    for (const [index, row] of [...host.children].entries()) {
      addClass(row, 'wf-product-package');
      const grid = row.firstElementChild; if (!grid) continue;
      addClass(grid, 'wf-product-package-grid');
      for (const [position, child] of [...grid.children].entries()) {
        const input = child.querySelector('input');
        if (input) {
          const key = input.getAttribute('oninput')?.match(/'([^']+)'/)?.[1] || '';
          addClass(child, 'wf-product-package-field');
          if (key === 'weight') addClass(child, 'wf-product-package-weight');
          input.setAttribute('aria-label', text('package') + ' ' + (index + 1) + ' · ' + (input.previousElementSibling?.textContent || '').trim());
        } else if (child.querySelector('[id^="dimCBM_"]')) addClass(child, 'wf-product-package-volume');
        else if (child.tagName === 'BUTTON') {
          addClass(child, 'wf-product-package-remove');
          child.setAttribute('aria-label', text('removePackage') + ' ' + (index + 1)); child.title = text('removePackage');
        } else if (position === 0) {
          addClass(child, 'wf-product-package-caption');
          if (child.firstElementChild) child.firstElementChild.textContent = text('package') + ' ' + (index + 1);
        } else addClass(child, 'wf-product-package-decoration');
      }
    }
  }

  function browse() {
    const list = byId('qblDdList'); if (!list) return;
    for (const row of list.children) {
      if (row.tagName === 'DIV' && row.getAttribute('onclick')?.startsWith('qblPickFromDropdown(')) enhanceBrowseResult(row);
    }
  }

  function hook(name, after) {
    const original = window[name]; if (typeof original !== 'function') return;
    window[name] = function(...args) { const result = original.apply(this, args); after(...args); return result; };
  }
  hook('renderPr', catalog);
  hook('togglePrDetails', (id, button) => syncDisclosure(byId('prDetailsPanel-' + id), button));
  hook('renderPrDimRows', dimensions);
  hook('renderDimPieces', packages);
  hook('selActiveTier', tiers);
  hook('qblBuildDropdown', browse);
  function refresh() { form(); catalog(); tiers(); dimensions(); packages(); browse(); }
  window.WFProductWorkspace = {refresh};
  new MutationObserver(refresh).observe(document.documentElement, {attributes: true, attributeFilter: ['lang']});
  refresh();
})();
