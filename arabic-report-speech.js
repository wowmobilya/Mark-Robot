/* Local pronunciation for the closed set of Arabic business-report templates.
   Displayed, committed narration stays authoritative. No data, settings or
   account balances are changed, and no external diacritizer is used. */
(function (root) {
  'use strict';

  const MAX_SAFE = BigInt(Number.MAX_SAFE_INTEGER);
  const MAX_CHUNK_LENGTH = 220;
  const DIGITS = ['صِفْر', 'وَاحِد', 'اِثْنَانِ', 'ثَلَاثَة', 'أَرْبَعَة', 'خَمْسَة', 'سِتَّة', 'سَبْعَة', 'ثَمَانِيَة', 'تِسْعَة'];
  const TEENS = ['عَشَرَة', 'أَحَدَ عَشَر', 'اِثْنَا عَشَر', 'ثَلَاثَةَ عَشَر', 'أَرْبَعَةَ عَشَر', 'خَمْسَةَ عَشَر', 'سِتَّةَ عَشَر', 'سَبْعَةَ عَشَر', 'ثَمَانِيَةَ عَشَر', 'تِسْعَةَ عَشَر'];
  const FEMININE_DIGITS = ['صِفْر', 'وَاحِدَة', 'اِثْنَتَانِ', 'ثَلَاث', 'أَرْبَع', 'خَمْس', 'سِتّ', 'سَبْع', 'ثَمَانِي', 'تِسْع'];
  const FEMININE_TEENS = ['عَشْر', 'إِحْدَى عَشْرَة', 'اِثْنَتَا عَشْرَة', 'ثَلَاثَ عَشْرَة', 'أَرْبَعَ عَشْرَة', 'خَمْسَ عَشْرَة', 'سِتَّ عَشْرَة', 'سَبْعَ عَشْرَة', 'ثَمَانِيَ عَشْرَة', 'تِسْعَ عَشْرَة'];
  const TENS = ['', '', 'عِشْرُون', 'ثَلَاثُون', 'أَرْبَعُون', 'خَمْسُون', 'سِتُّون', 'سَبْعُون', 'ثَمَانُون', 'تِسْعُون'];
  const HUNDREDS = ['', 'مِائَة', 'مِائَتَانِ', 'ثَلَاثُمِائَة', 'أَرْبَعُمِائَة', 'خَمْسُمِائَة', 'سِتُّمِائَة', 'سَبْعُمِائَة', 'ثَمَانُمِائَة', 'تِسْعُمِائَة'];
  const SCALES = [null,
    ['أَلْف', 'أَلْفَانِ', 'أَلْفَيْنِ', 'آلَاف'],
    ['مِلْيُون', 'مِلْيُونَانِ', 'مِلْيُونَيْنِ', 'مَلَايِين'],
    ['مِلْيَار', 'مِلْيَارَانِ', 'مِلْيَارَيْنِ', 'مِلْيَارَات'],
    ['تِرِيلْيُون', 'تِرِيلْيُونَانِ', 'تِرِيلْيُونَيْنِ', 'تِرِيلْيُونَات'],
    ['كُوَادْرِلْيُون', 'كُوَادْرِلْيُونَانِ', 'كُوَادْرِلْيُونَيْنِ', 'كُوَادْرِلْيُونَات']
  ];
  const CURRENCIES = {
    USD: 'دُولَار أَمْرِيكِيّ', TRY: 'لِيرَة تُرْكِيَّة', EUR: 'يُورُو', SYP: 'لِيرَة سُورِيَّة',
    GBP: 'جُنَيْه إِسْتَرْلِينِيّ', SAR: 'رِيَال سُعُودِيّ', AED: 'دِرْهَم إِمَارَاتِيّ',
    QAR: 'رِيَال قَطَرِيّ', JOD: 'دِينَار أُرْدُنِيّ', KWD: 'دِينَار كُوَيْتِيّ',
    BHD: 'دِينَار بَحْرَيْنِيّ', OMR: 'رِيَال عُمَانِيّ', EGP: 'جُنَيْه مِصْرِيّ',
    IQD: 'دِينَار عِرَاقِيّ', LBP: 'لِيرَة لُبْنَانِيَّة', CHF: 'فَرَنْك سُوِيسْرِيّ',
    CAD: 'دُولَار كَنَدِيّ', AUD: 'دُولَار أُسْتُرَالِيّ', RUB: 'رُوبَل رُوسِيّ',
    JPY: 'يَنّ يَابَانِيّ', CNY: 'يُوَان صِينِيّ'
  };
  const CENT = { singular: 'سِنْت', dual: 'سِنْتَانِ', plural: 'سِنْتَات', many: 'سِنْتًا' };
  const PIASTRE = { singular: 'قِرْش', dual: 'قِرْشَانِ', plural: 'قُرُوش', many: 'قِرْشًا' };
  // Only these currencies have named hundredths here. Other currencies keep
  // exact decimal speech: e.g. 0.05 KWD is not five fils (a dinar has 1000).
  const MONEY_UNITS = {
    USD: {
      major: { singular: CURRENCIES.USD, dual: 'دُولَارَانِ أَمْرِيكِيَّانِ', plural: 'دُولَارَات أَمْرِيكِيَّة' },
      minor: CENT,
      minorAlone: { singular: 'سِنْت أَمْرِيكِيّ', dual: 'سِنْتَانِ أَمْرِيكِيَّانِ', plural: 'سِنْتَات أَمْرِيكِيَّة', many: 'سِنْتًا أَمْرِيكِيًّا' }
    },
    TRY: {
      major: { singular: CURRENCIES.TRY, dual: 'لِيرَتَانِ تُرْكِيَّتَانِ', plural: 'لِيرَات تُرْكِيَّة', feminine: true },
      minor: PIASTRE,
      minorAlone: { singular: 'قِرْش تُرْكِيّ', dual: 'قِرْشَانِ تُرْكِيَّانِ', plural: 'قُرُوش تُرْكِيَّة', many: 'قِرْشًا تُرْكِيًّا' }
    },
    EUR: {
      major: { singular: CURRENCIES.EUR, dual: 'يُورُوَانِ', plural: 'يُورُوهَات' },
      minor: CENT,
      minorAlone: { ...CENT, suffix: ' مِنَ الْيُورُو' }
    },
    SYP: {
      major: { singular: CURRENCIES.SYP, dual: 'لِيرَتَانِ سُورِيَّتَانِ', plural: 'لِيرَات سُورِيَّة', feminine: true },
      minor: PIASTRE,
      minorAlone: { singular: 'قِرْش سُورِيّ', dual: 'قِرْشَانِ سُورِيَّانِ', plural: 'قُرُوش سُورِيَّة', many: 'قِرْشًا سُورِيًّا' }
    }
  };
  const MONTHS = ['يَنَايِر', 'فِبْرَايِر', 'مَارِس', 'أَبْرِيل', 'مَايُو', 'يُونْيُو', 'يُولْيُو', 'أَغُسْطُس', 'سِبْتَمْبَر', 'أُكْتُوبَر', 'نُوفَمْبَر', 'دِيسَمْبَر'];
  const ORDINALS = ['', 'الْأَوَّل', 'الثَّانِي', 'الثَّالِث', 'الرَّابِع', 'الْخَامِس', 'السَّادِس', 'السَّابِع', 'الثَّامِن', 'التَّاسِع', 'الْعَاشِر'];
  const DEPOSIT_NOTE = 'دفعات اليوم تشمل السجلات ذات التاريخ المحدد؛ العربون بلا تاريخ مستقل لا يدخل في تحصيل اليوم.';
  const NO_DATA = 'لا توجد معاملات محفوظة حتى هذا التاريخ.';

  function fail(reason) {
    const error = new Error('unsupported-report');
    error.code = 'unsupported-report';
    error.reason = reason;
    throw error;
  }
  function asciiDigits(value) {
    return String(value).replace(/[\u0660-\u0669\u06f0-\u06f9]/g, digit => String(digit.charCodeAt(0) & 15));
  }
  function underHundred(value, oblique, feminine = false) {
    if (feminine) {
      if (value < 10) return value === 2 && oblique ? 'اِثْنَتَيْنِ' : FEMININE_DIGITS[value];
      if (value < 20) return value === 12 && oblique ? 'اِثْنَتَيْ عَشْرَة' : FEMININE_TEENS[value - 10];
      const tens = oblique ? TENS[Math.floor(value / 10)].replace(/ُون$/, 'ِين') : TENS[Math.floor(value / 10)];
      const units = value % 10 === 1 ? 'إِحْدَى' : underHundred(value % 10, oblique, true);
      return value % 10 ? units + ' وَ' + tens : tens;
    }
    if (value < 10) return value === 2 && oblique ? 'اِثْنَيْنِ' : DIGITS[value];
    if (value < 20) return value === 12 && oblique ? 'اِثْنَيْ عَشَر' : TEENS[value - 10];
    const tens = oblique ? TENS[Math.floor(value / 10)].replace(/ُون$/, 'ِين') : TENS[Math.floor(value / 10)];
    return value % 10 ? underHundred(value % 10, oblique) + ' وَ' + tens : tens;
  }
  function underThousand(value, oblique, construct = false, feminine = false) {
    const hundred = Math.floor(value / 100), rest = value % 100;
    let prefix = HUNDREDS[hundred];
    if (hundred === 2) prefix = construct && !rest ? (oblique ? 'مِائَتَيْ' : 'مِائَتَا') : (oblique ? 'مِائَتَيْنِ' : 'مِائَتَانِ');
    return prefix && rest ? prefix + ' وَ' + underHundred(rest, oblique, feminine) : prefix || underHundred(rest, oblique, feminine);
  }
  function scaledGroup(value, scale, oblique) {
    const [singular, dual, dualOblique, plural] = SCALES[scale];
    if (value === 1) return singular;
    if (value === 2) return oblique ? dualOblique : dual;
    if (value <= 10) return underHundred(value, oblique) + ' ' + plural;
    // Repeat the scale for small remainders: 102,000 is "one hundred thousand
    // and two thousand", never an ambiguous "one hundred and two thousand".
    const rest = value % 100;
    if (value > 100 && rest > 0 && rest <= 10) {
      return underThousand(value - rest, oblique, true) + ' ' + singular + ' وَ' + scaledGroup(rest, scale, oblique);
    }
    return underThousand(value, oblique, true) + ' ' + singular;
  }
  function integerWords(digits, oblique = false, feminine = false) {
    if (!/^\d+$/.test(String(digits))) fail('invalid-number');
    let value = BigInt(digits);
    if (value > MAX_SAFE) fail('unsafe-number');
    if (!value) return DIGITS[0];
    const groups = [];
    let scale = 0;
    while (value) {
      const group = Number(value % 1000n);
      if (group) groups.unshift(scale ? scaledGroup(group, scale, oblique) : underThousand(group, oblique, false, feminine));
      value /= 1000n;
      scale++;
    }
    return groups.join(' وَ');
  }
  function count(value) {
    if (!Number.isSafeInteger(value) || value < 0) fail('invalid-count');
    const formatter = new Intl.NumberFormat('ar');
    const digits = asciiDigits(formatter.formatToParts(value).filter(part => part.type === 'integer').map(part => part.value).join(''));
    return { display: formatter.format(value), speech: integerWords(digits) };
  }
  function namedAmount(digits, unit) {
    const value = BigInt(digits);
    let speech;
    if (value === 1n) speech = unit.singular + (unit.feminine ? ' وَاحِدَة' : ' وَاحِد');
    else if (value === 2n) speech = unit.dual;
    else {
      let number = integerWords(digits, false, unit.feminine);
      // A final dual magnitude is in construct with the currency noun:
      // مائتا دولار / ألفا دولار / مليونا دولار, without changing its value.
      if (value >= 100n && value % 100n === 0n) number = number.replace(/َانِ$/, 'َا');
      const noun = value >= 3n && value <= 10n ? unit.plural : value > 10n ? unit.many || unit.singular : unit.singular;
      speech = number + ' ' + noun;
    }
    return speech + (unit.suffix || '');
  }
  function money(value, currency = 'USD') {
    if (typeof value !== 'number' || !Number.isFinite(value)) fail('invalid-money');
    // Match business-overview.localize's currency normalization exactly.
    const code = /^[A-Z]{3}$/.test(currency) ? currency : 'USD';
    if (!Object.prototype.hasOwnProperty.call(CURRENCIES, code)) fail('unsupported-currency');
    const formatter = new Intl.NumberFormat('ar', { style: 'currency', currencyDisplay: 'name', currency: code, minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const parts = formatter.formatToParts(value);
    const integer = asciiDigits(parts.filter(part => part.type === 'integer').map(part => part.value).join(''));
    const fraction = asciiDigits(parts.find(part => part.type === 'fraction')?.value || '');
    if (!/^\d+$/.test(integer) || !/^\d{2}$/.test(fraction)) fail('invalid-money-format');
    // Read the exact displayed digits, not value * 100, which can round again.
    if (BigInt(integer) * 100n + BigInt(fraction) > MAX_SAFE) fail('unsafe-money');
    const whole = BigInt(integer), hundredths = BigInt(fraction);
    const sign = (whole || hundredths) && parts.some(part => part.type === 'minusSign') ? 'سَالِب ' : '';
    const units = MONEY_UNITS[code];
    let speech;
    if (units) {
      if (!hundredths) speech = namedAmount(integer, units.major);
      else if (!whole) speech = namedAmount(fraction, units.minorAlone);
      else speech = namedAmount(integer, units.major) + ' وَ' + namedAmount(fraction, units.minor);
    } else {
      speech = integerWords(integer) + (hundredths ? ' فَاصِلَة ' + [...fraction].map(digit => DIGITS[Number(digit)]).join(' ') : '') + ' ' + CURRENCIES[code];
    }
    return { display: formatter.format(value), speech: sign + speech };
  }
  // Shared with explicit monetary tokens in the program reader; no display or
  // business state is changed. Uses the same rounding/currency/safety checks.
  function moneyWords(value, currency = 'USD') { return money(value, currency).speech; }
  function date(value) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) fail('invalid-date');
    const instant = new Date(value + 'T12:00:00Z');
    if (!Number.isFinite(instant.getTime()) || instant.toISOString().slice(0, 10) !== value) fail('invalid-date');
    const year = Number(value.slice(0, 4)), month = Number(value.slice(5, 7)), day = Number(value.slice(8, 10));
    if (!year) fail('invalid-date');
    let ordinal;
    if (day <= 10) ordinal = ORDINALS[day];
    else if (day < 20) ordinal = (day === 11 ? 'الْحَادِي' : ORDINALS[day - 10]) + ' عَشَر';
    else if (day === 20) ordinal = 'الْعِشْرُون';
    else if (day < 30) ordinal = (day === 21 ? 'الْحَادِي' : ORDINALS[day - 20]) + ' وَالْعِشْرُون';
    else ordinal = day === 30 ? 'الثَّلَاثُون' : 'الْحَادِي وَالثَّلَاثُون';
    return {
      display: new Intl.DateTimeFormat('ar', { dateStyle: 'long', timeZone: 'UTC' }).format(instant),
      speech: ordinal + ' مِنْ شَهْرِ ' + MONTHS[month - 1] + ', عَامِ ' + integerWords(String(year), true)
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
    if (!snapshot || snapshot.locale !== 'ar' || snapshot.reportComplete !== true || snapshot.complete !== true) fail('incomplete-report');
    if (!snapshot.daily || !snapshot.balances || !snapshot.counts || !Array.isArray(snapshot.cashboxes)) fail('invalid-snapshot');
    if (typeof snapshot.narration !== 'string' || !snapshot.narration || snapshot.narration.length > 16000 || !Array.isArray(snapshot.narrationSegments)) fail('invalid-narration');
    const specs = [];
    const clause = (display, speech) => ({ display, speech });
    const segment = clauses => specs.push({ display: clauses.map(item => item.display).join(' '), clauses });
    const single = (display, speech) => segment([clause(display, speech)]);
    const amountLine = (label, vocalized, value) => {
      const amount = money(value);
      return clause(label + ': ' + amount.display + '.', vocalized + ': ' + amount.speech + '.');
    };
    const countLine = (label, vocalized, value) => {
      const amount = count(value);
      return clause(label + ': ' + amount.display + '.', vocalized + ': ' + amount.speech + '.');
    };
    const reportDate = date(snapshot.date);
    segment([
      clause('تقرير الأعمال اليومي.', 'تَقْرِيرُ الْأَعْمَالِ الْيَوْمِيُّ.'),
      clause('تاريخ التقرير: ' + reportDate.display + '.', 'تَارِيخُ التَّقْرِيرِ: ' + reportDate.speech + '.')
    ]);
    segment([amountLine('مبيعات اليوم', 'مَبِيعَاتُ الْيَوْمِ', snapshot.daily.salesUSD)]);
    segment([amountLine('دفعات اليوم', 'دَفَعَاتُ الْيَوْمِ', snapshot.daily.collectionsUSD)]);
    segment([amountLine('مبالغ معادة اليوم', 'مَبَالِغُ مُعَادَةٌ الْيَوْمَ', snapshot.daily.refundsUSD)]);
    segment([amountLine('مستحق لنا على العملاء', 'مُسْتَحَقٌّ لَنَا عَلَى الْعُمَلَاءِ', snapshot.balances.receivables)]);
    segment([amountLine('أرصدة لصالح العملاء', 'أَرْصِدَةٌ لِصَالِحِ الْعُمَلَاءِ', snapshot.balances.customerCredits)]);
    segment([
      countLine('فواتير برصيد متبقٍ', 'فَوَاتِيرُ بِرَصِيدٍ مُتَبَقٍّ', snapshot.counts.unpaid),
      countLine('فواتير متأخرة الاستحقاق', 'فَوَاتِيرُ مُتَأَخِّرَةُ الْاِسْتِحْقَاقِ', snapshot.counts.overdue)
    ]);
    segment([countLine('بانتظار التسليم', 'بِانْتِظَارِ التَّسْلِيمِ', snapshot.counts.pendingDelivery)]);
    segment([
      countLine('العملاء', 'الْعُمَلَاءُ', snapshot.counts.clients),
      countLine('المنتجات', 'الْمُنْتَجَاتُ', snapshot.counts.products)
    ]);
    const amounts = snapshot.cashboxes.map(row => {
      if (!row || row.complete !== true || row.salesComplete !== true) fail('incomplete-cashbox');
      count(row.entries);
      return money(row.balance, row.currency);
    });
    const cashHeading = 'أرصدة الصناديق المسجلة:';
    specs.push({
      display: cashHeading + ' ' + amounts.map(amount => amount.display).join('، ') + '.',
      clauses: [clause(cashHeading, 'أَرْصِدَةُ الصَّنَادِيقِ الْمُسَجَّلَةِ.')].concat(amounts.map((amount, index) => clause(amount.display + (index === amounts.length - 1 ? '.' : '،'), amount.speech + '.')))
    });
    single('الحسابات على أساس USD المحفوظ.', 'الْحِسَابَاتُ عَلَى أَسَاسِ الدُّولَارِ الْأَمْرِيكِيِّ الْمَحْفُوظِ.');
    count(snapshot.daily.excludedUndatedDeposits);
    count(snapshot.counts.invoices);
    count(snapshot.daily.paymentCount);
    if (snapshot.daily.excludedUndatedDeposits) single(DEPOSIT_NOTE, 'دَفَعَاتُ الْيَوْمِ تَشْمَلُ السِّجِلَّاتِ ذَاتَ التَّارِيخِ الْمُحَدَّدِ; الْعُرْبُونُ بِلَا تَارِيخٍ مُسْتَقِلٍّ لَا يَدْخُلُ فِي تَحْصِيلِ الْيَوْمِ.');
    if (!snapshot.counts.invoices && !snapshot.daily.paymentCount && !snapshot.cashboxes.some(row => row.entries)) single(NO_DATA, 'لَا تُوجَدُ مُعَامَلَاتٌ مَحْفُوظَةٌ حَتَّى هَذَا التَّارِيخِ.');
    if (snapshot.narration !== specs.map(spec => spec.display).join(' ') || snapshot.narrationSegments.length !== specs.length) fail('source-mismatch');
    const chunks = [];
    let offset = 0;
    specs.forEach((spec, index) => {
      const source = snapshot.narrationSegments[index];
      if (!source || source.text !== spec.display || source.start !== offset || source.end !== offset + spec.display.length) fail('offset-mismatch');
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

  const api = Object.freeze({ prepare, moneyWords });
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.WFArabicReportSpeech = api;
})(typeof window === 'object' ? window : globalThis);
