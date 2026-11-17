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
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-modal', 'true');
  panel.setAttribute('aria-labelledby', 'ccTitle');
  input.type = 'text';
  input.inputMode = 'none';
  input.autocomplete = 'off';
  input.removeAttribute('oninput');
  input.setAttribute('maxlength', '18');
  input.setAttribute('dir', 'ltr');
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
    previousOpen(key); lastValue = '';
    const cfg = CC_CONFIGS[key];
    const symbol = {USD:'$', EUR:'€', TRY:'₺'};
    document.getElementById('ccFromLabel').textContent = symbol[cfg.from] + ' ' + cfg.from;
    document.getElementById('ccResultLabel').textContent = symbol[cfg.to] + ' ' + cfg.to;
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
    lastValue = input.value;
  };
  modal.addEventListener('keydown', event => {
    if (event.key === 'Escape') { event.preventDefault(); closeModal('currCalcModal'); }
    if (event.key === 'Tab') {
      const items = [...modal.querySelectorAll('button,input')].filter(el => el.getClientRects().length);
      const first = items[0], last = items[items.length-1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
  });
})();
