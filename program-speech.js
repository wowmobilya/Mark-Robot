/* Explicit selected-text reading. No page-wide scraping, automatic speech,
   business-state changes, microphone access or network requests. */
(function (root) {
  'use strict';
  const MAX_TEXT = 16000;
  const MAX_CENTS = BigInt(Number.MAX_SAFE_INTEGER);
  const DIGITS = '0-9\u0660-\u0669\u06f0-\u06f9';
  const SPACE = '[ \\t\\u00a0\\u202f]';
  // A safe cent amount needs fewer than 30 characters. A bounded scan also
  // avoids excessive backtracking on long, non-monetary numeric identifiers.
  const NUMBER = '[+\\-\\u2212]?[' + DIGITS + '](?:[' + DIGITS + '.,\\u066b\\u066c\\u00a0\\u202f ]{0,60}[' + DIGITS + '])?';
  const SYMBOLS = { '$': 'USD', 'US$': 'USD', '₺': 'TRY', '€': 'EUR', '£': 'GBP' };
  const TOKEN = '([+\\-\\u2212]?)(?:(USD|TRY|EUR|SYP)' + SPACE + '+|(US\\$|[$₺€£])' + SPACE + '*)(' + NUMBER + ')|(' + NUMBER + ')(?:' + SPACE + '+(USD|TRY|EUR|SYP)|' + SPACE + '*(US\\$|[$₺€£]))';
  const ZERO = { ar: 'صِفْر', en: 'zero', tr: 'sıfır', fr: 'zéro', ru: 'ноль' };
  const canonicalMoney = new Intl.NumberFormat('en-US', {useGrouping: false, minimumFractionDigits: 2, maximumFractionDigits: 2});
  const asciiDigits = value => value.replace(/[\u0660-\u0669\u06f0-\u06f9]/g, digit => String(digit.charCodeAt(0) & 15));
  const localeKey = value => String(value || 'en').toLowerCase().split(/[-_]/)[0];
  function fail(code) { const problem = new Error(code); problem.code = code; throw problem; }

  function boundary(text, start, end) {
    const before = text[start - 1] || '', after = text[end] || '';
    // Do not read part of a product ID, date, URL, version or malformed number.
    if (/[\p{L}\p{N}\p{M}_/\\+\-\u2212]/u.test(before + after)) return false;
    if (/[.,\u066b\u066c]/.test(before) && /[\p{L}\p{N}.,\u066b\u066c]/u.test(text[start - 2] || '')) return false;
    if (/[.,\u066b\u066c]/.test(after) && /[\p{L}\p{N}.,\u066b\u066c]/u.test(text[end + 1] || '')) return false;
    return true;
  }

  function amount(value, locale) {
    let text = asciiDigits(value).replace(/\u2212/g, '-');
    const sign = /^[+-]/.test(text) ? text[0] : '';
    if (sign) text = text.slice(1);
    let group, decimal;
    if (locale === 'ar' && /[\u066b\u066c]/.test(text)) { group = '\u066c'; decimal = '\u066b'; }
    else if (locale === 'ar' || locale === 'en') { group = ','; decimal = '.'; }
    else if (locale === 'tr') { group = '.'; decimal = ','; }
    else if (locale === 'fr' || locale === 'ru') { group = ' '; decimal = ','; text = text.replace(/[\u00a0\u202f]/g, ' '); }
    else return null;
    const parts = text.split(decimal);
    if (parts.length > 2 || (parts.length === 2 && !/^\d{1,2}$/.test(parts[1]))) return null;
    let integer = parts[0];
    if (integer.includes(group)) {
      const groups = integer.split(group);
      if (!/^[1-9]\d{0,2}$/.test(groups[0]) || !groups.slice(1).every(part => /^\d{3}$/.test(part))) return null;
      integer = groups.join('');
    }
    if (!/^(?:0|[1-9]\d*)$/.test(integer)) return null;
    const fraction = (parts[1] || '').padEnd(2, '0');
    if (BigInt(integer) * 100n + BigInt(fraction) > MAX_CENTS) return null;
    const parsed = Number((sign === '-' ? '-' : '') + integer + '.' + fraction);
    // Some near-limit cent values cannot survive conversion to JS Number.
    // Preserve the original token rather than quietly losing a cent.
    if (!Number.isFinite(parsed) || canonicalMoney.format(Math.abs(parsed)) !== integer + '.' + fraction) return null;
    return parsed;
  }

  function normalizeText(text, locale, moneyApi) {
    if (typeof text !== 'string') fail('invalid-text');
    if (text.length > MAX_TEXT) fail('text-length');
    locale = localeKey(locale);
    if (!ZERO[locale]) return text;
    if (moneyApi === undefined) moneyApi = locale === 'ar' ? root.WFArabicReportSpeech : locale === 'tr' ? root.WFTurkishReportSpeech : null;
    const changes = [], protectedAmounts = [];
    for (const match of text.matchAll(new RegExp(TOKEN, 'gu'))) {
      const start = match.index, end = start + match[0].length;
      protectedAmounts.push({start, end});
      const prefix = match[4] !== undefined;
      const marker = match[2] || match[3] || match[6] || match[7];
      const currency = SYMBOLS[marker] || marker;
      const raw = prefix ? (match[1] || '') + match[4] : match[5];
      const before = text.slice(0, start), after = text.slice(end);
      // Adjacent currency markers or a currency between two amounts are
      // ambiguous. In particular CAD $1 is never guessed to mean USD 1.
      if (!boundary(text, start, end) || /(?:^|\s)(?:[A-Z]{3}|US\$|[$₺€£])\s*$/.test(before) ||
          /^\s*(?:[A-Z]{3}\b|US\$|[$₺€£])/.test(after) || (!prefix && /^\s+[+\-\u2212]?[0-9\u0660-\u0669\u06f0-\u06f9]/.test(after))) continue;
      const parsed = amount(raw, locale);
      if (parsed === null || typeof moneyApi?.moneyWords !== 'function') continue;
      try {
        const spoken = moneyApi.moneyWords(parsed, currency);
        if (typeof spoken === 'string' && spoken.trim()) changes.push({start, end, text: spoken});
      } catch (_) { /* Unsupported or unsafe tokens remain exactly as selected. */ }
    }
    const decimal = locale === 'ar' ? '[.\u066b]' : locale === 'en' ? '\\.' : ',';
    const zeros = new RegExp('[+\\-\\u2212]?[0\u0660\u06f0]' + decimal + '[0\u0660\u06f0]{2}', 'gu');
    for (const match of text.matchAll(zeros)) {
      const start = match.index, end = start + match[0].length;
      if (boundary(text, start, end) && !protectedAmounts.some(range => start < range.end && end > range.start)) {
        changes.push({start, end, text: ZERO[locale]});
      }
    }
    changes.sort((left, right) => left.start - right.start);
    let result = '', cursor = 0;
    for (const change of changes) { result += text.slice(cursor, change.start) + change.text; cursor = change.end; }
    result += text.slice(cursor);
    if (locale === 'ar') result = result.replace(/(^|[^\p{L}\p{N}_/])WOW[ \t]+FURNITURE(?=$|[^\p{L}\p{N}_/])/giu,
      (_, before) => before + 'واو فِرْنِتْشَر');
    if (result.length > MAX_TEXT) fail('text-length');
    return result;
  }

  const api = Object.freeze({normalizeText});
  if (typeof module === 'object' && module.exports) { module.exports = api; return; }
  root.WFProgramSpeechReader = api;
  const document = root.document;
  const settings = document?.getElementById('headerSettingsBtn');
  if (!settings?.parentNode || document.getElementById('wfProgramSpeechButton')) return;

  const words = {
    ar: {read: 'اقرأ النص المحدد', stop: 'إيقاف القراءة', select: 'حدّد النص في الصفحة، ثم اضغط زر القراءة.', unavailable: 'الصوت غير جاهز. راجع إعدادات الصوت.', muted: 'الصوت مكتوم. ارفع مستوى الصوت في الإعدادات.', preparing: 'جارٍ تحضير القراءة…', waiting: 'جارٍ تحضير الصوت…', speaking: 'جارٍ قراءة النص', ready: 'انتهت القراءة.', stopped: 'توقّفت القراءة.', failed: 'تعذّرت القراءة. جرّب مرة أخرى.', long: 'النص طويل. حدّد جزءًا أصغر من ١٦٬٠٠٠ حرف.'},
    en: {read: 'Read selected text', stop: 'Stop reading', select: 'Select text on this page, then press Read.', unavailable: 'Voice is not ready. Check voice settings.', muted: 'Voice is muted. Increase the volume in Settings.', preparing: 'Preparing to read…', waiting: 'Preparing audio…', speaking: 'Reading selected text', ready: 'Reading finished.', stopped: 'Reading stopped.', failed: 'Could not read this text. Try again.', long: 'Select a shorter passage, up to 16,000 characters.'},
    tr: {read: 'Seçili metni oku', stop: 'Okumayı durdur', select: 'Bu sayfada bir metin seçin, ardından Oku düğmesine basın.', unavailable: 'Ses hazır değil. Ses ayarlarını kontrol edin.', muted: 'Ses kapalı. Ayarlardan ses düzeyini artırın.', preparing: 'Okuma hazırlanıyor…', waiting: 'Ses hazırlanıyor…', speaking: 'Seçili metin okunuyor', ready: 'Okuma tamamlandı.', stopped: 'Okuma durduruldu.', failed: 'Metin okunamadı. Tekrar deneyin.', long: 'En fazla 16.000 karakter içeren daha kısa bir metin seçin.'},
    fr: {read: 'Lire le texte sélectionné', stop: 'Arrêter la lecture', select: 'Sélectionnez du texte sur cette page, puis appuyez sur Lire.', unavailable: 'Voix indisponible. Vérifiez les paramètres vocaux.', muted: 'Le son est coupé. Augmentez le volume dans les paramètres.', preparing: 'Préparation de la lecture…', waiting: 'Préparation audio…', speaking: 'Lecture du texte sélectionné', ready: 'Lecture terminée.', stopped: 'Lecture arrêtée.', failed: 'Lecture impossible. Réessayez.', long: 'Sélectionnez un passage de 16 000 caractères au maximum.'},
    ru: {read: 'Прочитать выделенный текст', stop: 'Остановить чтение', select: 'Выделите текст на этой странице, затем нажмите кнопку чтения.', unavailable: 'Голос недоступен. Проверьте настройки голоса.', muted: 'Звук отключён. Увеличьте громкость в настройках.', preparing: 'Подготовка чтения…', waiting: 'Подготовка звука…', speaking: 'Чтение выделенного текста', ready: 'Чтение завершено.', stopped: 'Чтение остановлено.', failed: 'Не удалось прочитать текст. Повторите попытку.', long: 'Выделите более короткий текст — не более 16 000 символов.'}
  };
  const extra = {
    ar: ['القراءة معطّلة. فعّلها من إعدادات الصوت.', 'هناك صوت آخر قيد التشغيل. أوقفه ثم أعد المحاولة.'],
    en: ['Reading is disabled. Enable it in voice settings.', 'Another voice is playing. Stop it, then try again.'],
    tr: ['Okuma kapalı. Ses ayarlarından etkinleştirin.', 'Başka bir ses çalıyor. Durdurup tekrar deneyin.'],
    fr: ['La lecture est désactivée. Activez-la dans les paramètres vocaux.', 'Un autre son est en cours. Arrêtez-le, puis réessayez.'],
    ru: ['Чтение отключено. Включите его в настройках голоса.', 'Сейчас звучит другой голос. Остановите его и повторите попытку.']
  };
  for (const locale of Object.keys(extra)) [words[locale].disabled, words[locale].busy] = extra[locale];
  const transportCopy = {
    ar: ['إيقاف مؤقت', 'استئناف القراءة', 'القراءة متوقفة مؤقتًا'],
    en: ['Pause reading', 'Resume reading', 'Reading paused'],
    tr: ['Okumayı duraklat', 'Okumayı sürdür', 'Okuma duraklatıldı'],
    fr: ['Mettre en pause', 'Reprendre la lecture', 'Lecture en pause'],
    ru: ['Приостановить чтение', 'Продолжить чтение', 'Чтение приостановлено'],
  };
  for (const locale of Object.keys(transportCopy)) [words[locale].pause, words[locale].resume, words[locale].paused] = transportCopy[locale];
  const button = document.createElement('button');
  button.id = 'wfProgramSpeechButton'; button.type = 'button'; button.className = 'icon-btn';
  button.setAttribute('aria-describedby', 'wfProgramSpeechStatus');
  button.innerHTML = '<svg class="wf-reader-speaker" aria-hidden="true" viewBox="0 0 24 24"><path d="M11 4 6 8H3v8h3l5 4V4Zm4 4a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/></svg><svg class="wf-reader-stop" aria-hidden="true" viewBox="0 0 24 24"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>';
  button.innerHTML += '<svg class="wf-reader-pause" aria-hidden="true" viewBox="0 0 24 24"><path d="M8 6v12M16 6v12"/></svg><svg class="wf-reader-resume" aria-hidden="true" viewBox="0 0 24 24"><path d="m8 5 11 7-11 7z"/></svg>';
  const status = document.createElement('div');
  status.id = 'wfProgramSpeechStatus'; status.className = 'wf-program-speech-status'; status.hidden = true;
  status.setAttribute('role', 'status'); status.setAttribute('aria-live', 'polite');
  settings.parentNode.insertBefore(button, settings);
  document.body.append(status);
  document.documentElement.classList.add('wf-program-speech-enabled');
  let remembered = null, hideTimer = null, disposed = false, hadActivity = false, actionPending = false;
  const selectionScope = '.page.active,dialog[open],[role="dialog"]';
  const language = () => words[localeKey(document.documentElement.lang)] ? localeKey(document.documentElement.lang) : 'en';
  const message = () => words[language()];
  function state() {
    try { return root.WFProgramSpeech?.getState?.() || {state: 'ready', active: false}; }
    catch (_) { return {state: 'unavailable', active: false}; }
  }
  function show(text, persistent = false) {
    root.clearTimeout(hideTimer);
    status.textContent = text; status.lang = language(); status.dir = language() === 'ar' ? 'rtl' : 'ltr'; status.hidden = false;
    if (!persistent) hideTimer = root.setTimeout(() => { status.hidden = true; }, 5000);
  }
  function render(current = state(), announce = false) {
    const active = current.active === true, label = active ? current.canPause ? message()[current.paused ? 'resume' : 'pause'] : message().stop : message().read;
    button.title = label; button.setAttribute('aria-label', label);
    button.setAttribute('aria-pressed', String(active)); button.dataset.active = String(active);
    button.dataset.paused = String(current.paused === true); button.dataset.canPause = String(current.canPause === true);
    button.setAttribute('aria-busy', String(current.state === 'preparing' || current.state === 'waiting'));
    if (announce) {
      const key = current.state === 'error' ? 'failed' : current.state;
      const text = ['preparing', 'failed', 'paused'].includes(key) && current.message ? current.message : message()[key] || (active ? message().speaking : message().unavailable);
      show(text + (active && current.voiceName ? ' — ' + current.voiceName : ''), active);
    }
  }
  function visible(element) {
    if (!element?.isConnected || element.closest('[hidden],[aria-hidden="true"],[inert],script,style,template,.sr-only,.visually-hidden')) return false;
    const style = root.getComputedStyle(element);
    return style.display !== 'none' && style.visibility === 'visible' && element.getClientRects().length > 0;
  }
  const elementFor = node => node?.nodeType === 1 ? node : node?.parentElement;
  function selection() {
    const selected = root.getSelection?.();
    if (!selected || selected.isCollapsed || selected.rangeCount !== 1) return null;
    const range = selected.getRangeAt(0);
    const start = elementFor(range.startContainer), end = elementFor(range.endContainer);
    const scope = start?.closest(selectionScope);
    if (!scope || end?.closest(selectionScope) !== scope || !visible(scope) || !visible(start) || !visible(end)) return null;
    const walker = document.createTreeWalker(range.commonAncestorContainer, 4);
    let node;
    while ((node = walker.nextNode())) {
      if (node.textContent.trim() && range.intersectsNode(node) && !visible(node.parentElement)) return null;
    }
    const text = range.toString().trim();
    return text ? {text, scope, locale: language(), range: range.cloneRange()} : null;
  }
  function remember(event) { remembered = event.isTrusted === true ? selection() : null; }
  function validRemembered() {
    return remembered?.scope.isConnected && remembered.scope.matches(selectionScope) && visible(remembered.scope) && remembered.locale === language() &&
      visible(elementFor(remembered.range.startContainer)) && visible(elementFor(remembered.range.endContainer)) &&
      remembered.range.toString().trim() === remembered.text ? remembered : null;
  }
  function click(event) {
    if (event.isTrusted !== true || disposed) return;
    const current = state();
    if (current.active) {
      remembered = null;
      if (current.canPause) {
        const result = root.WFProgramSpeech?.[current.paused ? 'resume' : 'pause']?.();
        if (result?.catch) result.catch(() => {});
        render(state());
      } else { root.WFProgramSpeech?.stop?.(); render(state()); show(message().stopped); }
      return;
    }
    const selected = selection() || validRemembered(); remembered = null;
    if (!selected) { show(message().select); return; }
    if (current.state === 'muted') { show(message().muted); return; }
    if (typeof root.WFProgramSpeech?.speak !== 'function') { show(message().unavailable); return; }
    try {
      const text = normalizeText(selected.text, selected.locale);
      actionPending = true;
      const accepted = root.WFProgramSpeech.speak({text, event, locale: selected.locale});
      if (!accepted) { const latest = state(); show(message()[latest.state] || message().unavailable); }
      render(state());
    } catch (problem) { show(problem?.code === 'text-length' ? message().long : message().failed); }
    finally { actionPending = false; }
  }
  function updated(event) {
    const current = event.detail || state();
    const active = current.active === true;
    const explicitProblem = actionPending && ['failed', 'error', 'disabled', 'muted', 'unavailable', 'busy'].includes(current.state);
    // Initial voice discovery and idle refreshes are not completed readings.
    render(current, active || hadActivity || explicitProblem);
    hadActivity = active;
  }
  function changedLanguage() { remembered = null; status.hidden = true; render(); }
  function changedPage() { remembered = null; status.hidden = true; render(); }
  const languageObserver = new MutationObserver(changedLanguage);
  languageObserver.observe(document.documentElement, {attributes: true, attributeFilter: ['lang']});
  function pagehide(event) { remembered = null; if (!event.persisted) destroy(); }
  function destroy() {
    if (disposed) return; disposed = true;
    root.clearTimeout(hideTimer); languageObserver.disconnect();
    button.removeEventListener('pointerdown', remember); button.removeEventListener('click', click);
    root.removeEventListener('wf-program-speech-state', updated); root.removeEventListener('hashchange', changedPage);
    root.removeEventListener('pagehide', pagehide); root.removeEventListener('pageshow', changedPage);
    button.remove(); status.remove(); document.documentElement.classList.remove('wf-program-speech-enabled');
  }
  button.addEventListener('pointerdown', remember); button.addEventListener('click', click);
  root.addEventListener('wf-program-speech-state', updated); root.addEventListener('hashchange', changedPage);
  root.addEventListener('pagehide', pagehide); root.addEventListener('pageshow', changedPage);
  render();
})(typeof window === 'object' ? window : globalThis);
