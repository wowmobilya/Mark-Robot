/* Compact, keyboard-accessible currency pad. Conversion uses the existing rate source. */
(function () {
  const modal = document.getElementById('currCalcModal');
  const panel = modal.querySelector('.curr-calc-modal');
  const input = document.getElementById('ccInput');
  let returnFocus;
  const heading = document.createElement('div');
  heading.className = 'cc-centered-heading';
  heading.append(modal.querySelector('.curr-calc-icon-wrap'), modal.querySelector('.curr-calc-header-info'));
  modal.querySelector('.curr-calc-header').prepend(heading);
  const route = document.createElement('div');
  route.className = 'cc-currency-route'; route.setAttribute('role', 'img'); route.setAttribute('dir', 'ltr');
  route.innerHTML = '<span class="cc-route-symbol cc-route-from" aria-hidden="true"></span><svg aria-hidden="true" viewBox="0 0 32 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 7h22m-5-5 5 5-5 5M27 17H5m5-5-5 5 5 5"/></svg><span class="cc-route-symbol cc-route-to" aria-hidden="true"></span>';
  heading.append(route);
  const reset = modal.querySelector('.curr-calc-footer .btn-s');
  reset.childNodes.forEach(node => { if (node.nodeType === 3) node.textContent = ''; });
  reset.querySelector('.wf-ui-icon')?.remove();
  const resetIcon = document.createElement('span');
  resetIcon.className = 'cc-action-icon';
  resetIcon.setAttribute('aria-hidden', 'true');
  resetIcon.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 1 3 7M3 5v7h7"/></svg>';
  reset.prepend(resetIcon);
  const result = document.getElementById('ccResult');
  const copy = document.createElement('button');
  copy.type = 'button';
  copy.className = 'btn cc-copy-result';
  const copyIcon = document.createElement('span');
  copyIcon.className = 'cc-action-icon';
  copyIcon.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/></svg>';
  const copyLabel = document.createElement('span');
  copy.append(copyIcon, copyLabel);
  reset.after(copy);
  const copyWords = {
    ar: ['نسخ النتيجة','تم نسخ النتيجة','تعذّر نسخ النتيجة'],
    tr: ['Sonucu kopyala','Sonuç kopyalandı','Sonuç kopyalanamadı'],
    en: ['Copy result','Result copied','Could not copy the result'],
    fr: ['Copier le résultat','Résultat copié','Impossible de copier le résultat'],
    ru: ['Скопировать результат','Результат скопирован','Не удалось скопировать результат']
  };
  copy.addEventListener('click', async () => {
    const words = copyWords[S.lang] || copyWords.en;
    if (copy.disabled) return;
    try {
      await navigator.clipboard.writeText(result.textContent);
      showToast(words[1]);
    } catch (_) {
      showToast(words[2], 'in');
    }
  });
  const swap = document.createElement('button');
  swap.type = 'button'; swap.className = 'cc-swap';
  swap.innerHTML = '<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3v18m-4-4 4 4 4-4M16 21V3m-4 4 4-4 4 4"/></svg>';
  modal.querySelector('.curr-calc-arrow').replaceChildren(swap);
  swap.addEventListener('click', () => {
    const cfg = CC_CONFIGS[_ccCurrentKey];
    const reverse = cfg.to.toLowerCase() + '-' + cfg.from.toLowerCase();
    if (!CC_CONFIGS[reverse]) return;
    const value = input.value; const opener = returnFocus;
    openCurrCalc(reverse); returnFocus = opener; setCCInput(value);
  });
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-modal', 'true');
  panel.setAttribute('aria-labelledby', 'ccTitle');
  input.type = 'text';
  input.inputMode = 'none';
  input.autocomplete = 'off';
  input.removeAttribute('oninput');
  input.setAttribute('maxlength', '18');
  input.setAttribute('dir', 'ltr');
  const ratePill = modal.querySelector('.curr-calc-rate-pill');
  ratePill.childNodes.forEach(node => { if (node.nodeType === 3) node.textContent = ''; });
  const stamp = document.createElement('time'); stamp.className = 'cc-rate-stamp'; stamp.setAttribute('dir','auto');
  ratePill.append(stamp);
  function updateStamp() {
    const lang = S.lang || 'ar';
    const missing = {ar:'الوقت غير متاح',tr:'Zaman bilgisi yok',en:'Time unavailable',fr:'Heure indisponible',ru:'Время недоступно'}[lang] || 'Time unavailable';
    const rateManual = (_ccCurrentKey.includes('try') && S.settings.manualUsdTry) || (_ccCurrentKey.includes('eur') && S.settings.manualUsdEur);
    const date = new Date(S.rateUpdatedAt || '');
    if (rateManual || !Number.isFinite(date.getTime())) { stamp.textContent = missing; stamp.removeAttribute('datetime'); return; }
    const locale = {ar:'ar-SY-u-nu-latn',tr:'tr-TR',en:'en-US',fr:'fr-FR',ru:'ru-RU'}[lang] || 'en-US';
    stamp.dateTime = date.toISOString();
    stamp.textContent = new Intl.DateTimeFormat(locale,{year:'numeric',month:'2-digit',day:'2-digit',hour:'numeric',minute:'2-digit',hour12:true}).format(date);
  }
  const pad = document.createElement('div');
  pad.className = 'cc-number-pad';
  pad.setAttribute('dir', 'ltr');
  const keys = ['7','8','9','⌫','4','5','6','C','1','2','3','00','0','.'];
  keys.forEach(key => {
    const button = document.createElement('button');
    button.type = 'button'; button.textContent = key; button.dataset.key = key;
    if (key === '0') button.className = 'cc-key-zero';
    button.addEventListener('click', () => {
      let start = input.selectionStart ?? input.value.length;
      let end = input.selectionEnd ?? start;
      if (key === 'C') { input.value = ''; start = 0; }
      else if (key === '⌫') {
        if (start === end) start = Math.max(0, start - 1);
        input.value = input.value.slice(0, start) + input.value.slice(end);
      } else {
        const value = input.value.slice(0, start) + key + input.value.slice(end);
        if (!/^\d{0,14}(\.\d{0,6})?$/.test(value)) return;
        input.value = value; start += key.length;
      }
      input.focus({preventScroll:true}); input.setSelectionRange(start, start);
      calcCurrencyModal();
    });
    pad.append(button);
  });
  modal.querySelector('.curr-calc-body').append(pad);
  const normalize = value => value.replace(/[٠-٩۰-۹]/g, c => String(c.charCodeAt(0) - (c <= '٩' ? 1632 : 1776))).replace(/[٫,]/g, '.');
  let lastValue = '';
  input.addEventListener('input', () => {
    const value = normalize(input.value);
    if (/^\d{0,14}(\.\d{0,6})?$/.test(value)) lastValue = value;
    input.value = lastValue; calcCurrencyModal();
  });
  const previousOpen = window.openCurrCalc;
  window.openCurrCalc = function (key) {
    if (!CC_CONFIGS[key]) return;
    returnFocus = document.activeElement;
    previousOpen(key); lastValue = ''; updateStamp();
    copyLabel.textContent = (copyWords[S.lang] || copyWords.en)[0];
    copy.disabled = true;
    const cfg = CC_CONFIGS[key];
    const symbol = {USD:'$', EUR:'€', TRY:'₺'};
    route.querySelector('.cc-route-from').textContent = symbol[cfg.from];
    route.querySelector('.cc-route-to').textContent = symbol[cfg.to];
    route.setAttribute('aria-label', cfg.from + ' → ' + cfg.to);
    route.setAttribute('title', cfg.from + ' → ' + cfg.to);
    const swapLabel = {ar:'تبديل اتجاه التحويل',tr:'Döviz yönünü değiştir',en:'Swap conversion direction',fr:'Inverser la conversion',ru:'Изменить направление обмена'}[S.lang] || 'Swap conversion direction';
    swap.setAttribute('aria-label', swapLabel); swap.title = swapLabel;
    document.getElementById('ccFromLabel').textContent = symbol[cfg.from] + ' ' + cfg.from;
    document.getElementById('ccResultLabel').textContent = symbol[cfg.to] + ' ' + cfg.to;
    const quick = document.getElementById('ccQuickBtns');
    const quickAmounts = cfg.from === 'TRY' ? [200,5000,10000,20000,50000,100000] : [20,50,100,200,1000];
    quick.style.setProperty('--cc-quick-columns', quickAmounts.length);
    quick.replaceChildren(...quickAmounts.map(amount => {
      const button = document.createElement('button');
      button.type = 'button'; button.className = 'curr-calc-quick-btn';
      button.textContent = cfg.from === 'TRY' && amount >= 1000 ? (amount / 1000) + 'K' : amount.toLocaleString('en-US');
      button.setAttribute('aria-label', amount + ' ' + cfg.from);
      button.title = amount + ' ' + cfg.from;
      button.addEventListener('click', () => setCCInput(amount));
      return button;
    }));
    const labels = {
      ar: ['حذف رقم', 'مسح المبلغ', 'الفاصلة العشرية', 'إغلاق'],
      tr: ['Rakam sil', 'Tutarı temizle', 'Ondalık ayırıcı', 'Kapat'],
      en: ['Delete digit', 'Clear amount', 'Decimal point', 'Close'],
      fr: ['Effacer un chiffre', 'Effacer le montant', 'Virgule décimale', 'Fermer'],
      ru: ['Удалить цифру', 'Очистить сумму', 'Десятичная точка', 'Закрыть']
    }[S.lang] || ['Delete digit', 'Clear amount', 'Decimal point', 'Close'];
    ['⌫','C','.'].forEach((key,i) => pad.querySelector(`[data-key="${key}"]`).setAttribute('aria-label',labels[i]));
    modal.querySelector('.curr-calc-close').setAttribute('aria-label', labels[3]);
  };
  const previousRateUI = window.updateRateUI;
  window.updateRateUI = function () {
    const result = previousRateUI.apply(this, arguments);
    if (modal.classList.contains('open')) {
      document.getElementById('ccRateInfo').textContent = CC_CONFIGS[_ccCurrentKey].rateText();
      calcCurrencyModal(); updateStamp();
    }
    return result;
  };
  const previousClose = window.closeModal;
  window.closeModal = function (id) {
    previousClose(id);
    if (id === 'currCalcModal' && returnFocus?.isConnected) returnFocus.focus({preventScroll:true});
  };
  window.calcCurrencyModal = function () {
    const cfg = CC_CONFIGS[_ccCurrentKey];
    const output = document.getElementById('ccResult');
    const value = Number(input.value);
    const result = cfg?.convert(value);
    output.textContent = !input.value || input.value === '.' || !Number.isFinite(result) || value < 0 || !Number.isFinite(S.usdTry) || S.usdTry <= 0 || !Number.isFinite(S.usdEur) || S.usdEur <= 0
      ? '—' : cfg.resultSym + result.toLocaleString('en-US', {minimumFractionDigits:cfg.resultDecimals,maximumFractionDigits:cfg.resultDecimals});
    copy.disabled = output.textContent === '—';
    lastValue = input.value;
  };
  modal.addEventListener('keydown', event => {
    if (event.key === 'Escape') { event.preventDefault(); closeModal('currCalcModal'); }
    if (event.key === 'Tab') {
      const items = [...modal.querySelectorAll('button:enabled,input:enabled')].filter(el => el.getClientRects().length);
      const first = items[0], last = items[items.length-1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
  });
})();
