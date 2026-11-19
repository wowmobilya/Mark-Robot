/* Local pronunciation for the closed set of Turkish business-report templates.
   Committed narration and its offsets remain authoritative. Number words are
   derived from the displayed rounding; this module never changes report data. */
(function (root) {
  'use strict';

  const MAX_SAFE = BigInt(Number.MAX_SAFE_INTEGER);
  const MAX_CHUNK_LENGTH = 220;
  const DIGITS = ['sıfır', 'bir', 'iki', 'üç', 'dört', 'beş', 'altı', 'yedi', 'sekiz', 'dokuz'];
  const TENS = ['', 'on', 'yirmi', 'otuz', 'kırk', 'elli', 'altmış', 'yetmiş', 'seksen', 'doksan'];
  const SCALES = ['', 'bin', 'milyon', 'milyar', 'trilyon', 'katrilyon'];
  // The factor converts the report's displayed hundredths into minor units.
  // Three-decimal currencies have ten minor units per displayed hundredth.
  const CURRENCIES = {
    USD: ['dolar', 'sent', 1], TRY: ['Türk lirası', 'kuruş', 1],
    EUR: ['avro', 'sent', 1], SYP: ['Suriye lirası', 'kuruş', 1],
    GBP: ['İngiliz sterlini', 'peni', 1], SAR: ['Suudi riyali', 'helale', 1],
    AED: ['Birleşik Arap Emirlikleri dirhemi', 'fils', 1], QAR: ['Katar riyali', 'dirhem', 1],
    JOD: ['Ürdün dinarı', 'fils', 10], KWD: ['Kuveyt dinarı', 'fils', 10],
    BHD: ['Bahreyn dinarı', 'fils', 10], OMR: ['Umman riyali', 'baisa', 10],
    EGP: ['Mısır lirası', 'kuruş', 1], IQD: ['Irak dinarı', 'fils', 10],
    LBP: ['Lübnan lirası', 'kuruş', 1], CHF: ['İsviçre frangı', 'santim', 1],
    CAD: ['Kanada doları', 'sent', 1], AUD: ['Avustralya doları', 'sent', 1],
    RUB: ['Rus rublesi', 'kopek', 1], JPY: ['Japon yeni', null, 0],
    CNY: ['Çin yuanı', 'fen', 1]
  };
  const MONTHS = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
  const DEPOSIT_NOTE = 'Günlük ödemeler açık tarihlere dayanır; ayrı tarihi olmayan avanslar günlük tahsilata eklenmez.';
  const NO_DATA = 'Bu tarihe kadar kayıtlı işlem yok.';

  function fail(reason) {
    const error = new Error('unsupported-report');
    error.code = 'unsupported-report';
    error.reason = reason;
    throw error;
  }
  function underThousand(value) {
    const words = [], hundreds = Math.floor(value / 100), tens = Math.floor(value % 100 / 10), ones = value % 10;
    if (hundreds) words.push(hundreds === 1 ? 'yüz' : DIGITS[hundreds] + ' yüz');
    if (tens) words.push(TENS[tens]);
    if (ones) words.push(DIGITS[ones]);
    return words.join(' ');
  }
  function integerWords(digits) {
    if (!/^\d+$/.test(String(digits))) fail('invalid-number');
    let value = BigInt(digits);
    if (value > MAX_SAFE) fail('unsafe-number');
    if (!value) return DIGITS[0];
    const groups = [];
    let scale = 0;
    while (value) {
      const group = Number(value % 1000n);
      if (group) {
        // Turkish omits "bir" only before yüz and bin, not milyon or above.
        groups.unshift(scale === 1 && group === 1 ? 'bin' : underThousand(group) + (scale ? ' ' + SCALES[scale] : ''));
      }
      value /= 1000n;
      scale++;
    }
    return groups.join(' ');
  }
  function count(value) {
    if (!Number.isSafeInteger(value) || value < 0) fail('invalid-count');
    const formatter = new Intl.NumberFormat('tr');
    const digits = formatter.formatToParts(value).filter(part => part.type === 'integer').map(part => part.value).join('');
    return { display: formatter.format(value), speech: integerWords(digits) };
  }
  function money(value, currency = 'USD') {
    if (typeof value !== 'number' || !Number.isFinite(value)) fail('invalid-money');
    // Match business-overview.localize's currency normalization exactly.
    const code = /^[A-Z]{3}$/.test(currency) ? currency : 'USD';
    if (!Object.prototype.hasOwnProperty.call(CURRENCIES, code)) fail('unsupported-currency');
    const formatter = new Intl.NumberFormat('tr', { style: 'currency', currencyDisplay: 'name', currency: code, minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const parts = formatter.formatToParts(value);
    const integer = parts.filter(part => part.type === 'integer').map(part => part.value).join('');
    const fraction = parts.find(part => part.type === 'fraction')?.value || '';
    if (!/^\d+$/.test(integer) || !/^\d{2}$/.test(fraction)) fail('invalid-money-format');
    // Read exact displayed digits rather than multiplying the binary float.
    const displayedCents = BigInt(integer) * 100n + BigInt(fraction);
    if (displayedCents > MAX_SAFE) fail('unsafe-money');
    const sign = displayedCents && parts.some(part => part.type === 'minusSign') ? 'eksi ' : '';
    const [major, minor, factor] = CURRENCIES[code];
    let spoken = integerWords(integer);
    if (Number(fraction) && !minor) {
      // JPY has no current minor unit. Preserve any recorded fraction as a
      // decimal, including its leading zero, without inventing a unit.
      const decimal = fraction.replace(/0+$/, '');
      spoken += ' virgül ' + [...decimal].map(digit => DIGITS[Number(digit)]).join(' ') + ' ' + major;
    } else {
      spoken += ' ' + major;
      if (Number(fraction)) spoken += ' ' + integerWords(String(Number(fraction) * factor)) + ' ' + minor;
    }
    return { display: formatter.format(value), speech: sign + spoken };
  }
  function date(value) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) fail('invalid-date');
    const instant = new Date(value + 'T12:00:00Z');
    if (!Number.isFinite(instant.getTime()) || instant.toISOString().slice(0, 10) !== value) fail('invalid-date');
    const year = Number(value.slice(0, 4)), month = Number(value.slice(5, 7)), day = Number(value.slice(8, 10));
    if (!year) fail('invalid-date');
    return {
      display: new Intl.DateTimeFormat('tr', { dateStyle: 'long', timeZone: 'UTC' }).format(instant),
      speech: integerWords(String(day)) + ' ' + MONTHS[month - 1] + ' ' + integerWords(String(year))
    };
  }
  function boundedSpeech(text, charIndex, charLength) {
    const chunks = [], words = text.replace(/،/g, ',').replace(/؛/g, ';').replace(/؟/g, '?').split(/\s+/);
    let current = '';
    for (const word of words) {
      if (word.length > MAX_CHUNK_LENGTH) fail('oversized-word');
      if (current && current.length + 1 + word.length > MAX_CHUNK_LENGTH) {
        chunks.push({ text: current, charIndex, charLength });
        current = '';
      }
      current += (current ? ' ' : '') + word;
    }
    if (current) chunks.push({ text: current, charIndex, charLength });
    return chunks;
  }
  function prepare(snapshot) {
    if (!snapshot || snapshot.locale !== 'tr' || snapshot.reportComplete !== true || snapshot.complete !== true) fail('incomplete-report');
    if (!snapshot.daily || !snapshot.balances || !snapshot.counts || !Array.isArray(snapshot.cashboxes)) fail('invalid-snapshot');
    if (typeof snapshot.narration !== 'string' || !snapshot.narration || snapshot.narration.length > 16000 || !Array.isArray(snapshot.narrationSegments)) fail('invalid-narration');
    const specs = [];
    const clause = (display, speech) => ({ display, speech });
    const segment = clauses => specs.push({ display: clauses.map(item => item.display).join(' '), clauses });
    const single = (display, speech = display) => segment([clause(display, speech)]);
    const amountLine = (label, value) => {
      const amount = money(value);
      return clause(label + ': ' + amount.display + '.', label + ': ' + amount.speech + '.');
    };
    const countLine = (label, value) => {
      const amount = count(value);
      return clause(label + ': ' + amount.display + '.', label + ': ' + amount.speech + '.');
    };
    const reportDate = date(snapshot.date);
    segment([
      clause('Günlük işletme raporu.', 'Günlük işletme raporu.'),
      clause('Rapor tarihi: ' + reportDate.display + '.', 'Rapor tarihi: ' + reportDate.speech + '.')
    ]);
    segment([amountLine('Bugünkü satışlar', snapshot.daily.salesUSD)]);
    segment([amountLine('Bugünkü ödemeler', snapshot.daily.collectionsUSD)]);
    segment([amountLine('Bugünkü iadeler', snapshot.daily.refundsUSD)]);
    segment([amountLine('Müşterilerden alacaklar', snapshot.balances.receivables)]);
    segment([amountLine('Müşteri lehine bakiyeler', snapshot.balances.customerCredits)]);
    segment([
      countLine('Bakiyesi olan faturalar', snapshot.counts.unpaid),
      countLine('Vadesi geçen faturalar', snapshot.counts.overdue)
    ]);
    segment([countLine('Teslimat bekleyen', snapshot.counts.pendingDelivery)]);
    segment([
      countLine('Müşteriler', snapshot.counts.clients),
      countLine('Ürünler', snapshot.counts.products)
    ]);
    const amounts = snapshot.cashboxes.map(row => {
      if (!row || row.complete !== true || row.salesComplete !== true) fail('incomplete-cashbox');
      count(row.entries);
      return money(row.balance, row.currency);
    });
    const cashHeading = 'Kayıtlı kasa bakiyeleri:';
    specs.push({
      display: cashHeading + ' ' + amounts.map(amount => amount.display).join('، ') + '.',
      clauses: [clause(cashHeading, 'Kayıtlı kasa bakiyeleri.')].concat(amounts.map((amount, index) => clause(amount.display + (index === amounts.length - 1 ? '.' : '،'), amount.speech + '.')))
    });
    single('Hesaplar kayıtlı USD esasındadır.', 'Hesaplar kayıtlı dolar esasındadır.');
    count(snapshot.daily.excludedUndatedDeposits);
    count(snapshot.counts.invoices);
    count(snapshot.daily.paymentCount);
    if (snapshot.daily.excludedUndatedDeposits) single(DEPOSIT_NOTE);
    if (!snapshot.counts.invoices && !snapshot.daily.paymentCount && !snapshot.cashboxes.some(row => row.entries)) single(NO_DATA);
    if (snapshot.narration !== specs.map(spec => spec.display).join(' ') || snapshot.narrationSegments.length !== specs.length) fail('source-mismatch');
    const chunks = [];
    let offset = 0;
    specs.forEach((spec, index) => {
      const original = snapshot.narrationSegments[index];
      if (!original || original.text !== spec.display || original.start !== offset || original.end !== offset + spec.display.length) fail('offset-mismatch');
      let cursor = 0;
      for (const part of spec.clauses) {
        const start = spec.display.indexOf(part.display, cursor);
        if (start < 0) fail('source-mismatch');
        chunks.push(...boundedSpeech(part.speech, offset + start, part.display.length));
        cursor = start + part.display.length;
      }
      offset += spec.display.length + 1;
    });
    return chunks;
  }

  const api = Object.freeze({
    prepare,
    moneyWords: (value, currency = 'USD') => money(value, currency).speech,
    currencies: Object.freeze(Object.keys(CURRENCIES))
  });
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.WFTurkishReportSpeech = api;
})(typeof window === 'object' ? window : globalThis);
