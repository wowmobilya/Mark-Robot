/* Pure text normalization retained for existing explicit speech features.
   The former global reader button is no longer mounted. */
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
})(typeof window === 'object' ? window : globalThis);
