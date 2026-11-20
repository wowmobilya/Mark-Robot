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
  // Syrian speech has its own small, closed vocabulary. It uses the same
  // validated digits and report clauses, never substitutions over report text.
  const SY_DIGITS = ['صِفْر', 'وَاحِد', 'تْنَيْن', 'تَلَاتَة', 'أَرْبَعَة', 'خَمْسَة', 'سِتَّة', 'سَبْعَة', 'تَمَانْيَة', 'تِسْعَة'];
  const SY_SHORT_DIGITS = ['صِفْر', 'وَاحِدَة', 'تْنَيْن', 'تَلَات', 'أَرْبَع', 'خَمْس', 'سِتّ', 'سَبْع', 'تَمَان', 'تِسْع'];
  const SY_TEENS = ['عَشَرَة', 'حْدَعْش', 'طْنَعْش', 'تَلَتَّعْش', 'أَرْبَعْتَعْش', 'خَمِسْتَعْش', 'سِتَّعْش', 'سَبَعْتَعْش', 'تْمَنْتَعْش', 'تِسَعْتَعْش'];
  const SY_TENS = ['', '', 'عِشْرِين', 'تَلَاتِين', 'أَرْبَعِين', 'خَمْسِين', 'سِتِّين', 'سَبْعِين', 'تَمَانِين', 'تِسْعِين'];
  const SY_HUNDREDS = ['', 'مِيَّة', 'مِيتَيْن', 'تَلَتْمِيَّة', 'أَرْبَعْمِيَّة', 'خَمْسْمِيَّة', 'سِتْمِيَّة', 'سَبْعْمِيَّة', 'تَمَانْمِيَّة', 'تِسْعْمِيَّة'];
  const SY_SCALE_DUALS = ['', 'أَلْفَيْن', 'مِلْيُونَيْن', 'مِلْيَارَيْن', 'تِرِيلْيُونَيْن', 'كُوَادْرِلْيُونَيْن'];
  const SY_MONTHS = ['كَانُون التَّانِي', 'شُبَاط', 'آذَار', 'نِيسَان', 'أَيَّار', 'حَزِيرَان', 'تَمُّوز', 'آب', 'أَيْلُول', 'تِشْرِين الْأَوَّل', 'تِشْرِين التَّانِي', 'كَانُون الْأَوَّل'];
  const SY_CENT = { singular: 'سِنْت', dual: 'سِنْتَيْن', plural: 'سِنْتَات' };
  const SY_PIASTRE = { singular: 'قِرْش', dual: 'قِرْشَيْن', plural: 'قُرُوش' };
  const SY_MONEY_UNITS = {
    USD: {
      major: { singular: CURRENCIES.USD, dual: 'دُولَارَيْن أَمْرِيكِيِّين', plural: 'دُولَارَات أَمْرِيكِيَّة' },
      minor: SY_CENT,
      minorAlone: { singular: 'سِنْت أَمْرِيكِيّ', dual: 'سِنْتَيْن أَمْرِيكِيِّين', plural: 'سِنْتَات أَمْرِيكِيَّة' }
    },
    TRY: {
      major: { singular: CURRENCIES.TRY, dual: 'لِيرْتَيْن تُرْكِيِّتَيْن', plural: 'لِيرَات تُرْكِيَّة', feminine: true },
      minor: SY_PIASTRE,
      minorAlone: { singular: 'قِرْش تُرْكِيّ', dual: 'قِرْشَيْن تُرْكِيِّين', plural: 'قُرُوش تُرْكِيَّة' }
    },
    EUR: {
      major: { singular: CURRENCIES.EUR, dual: 'يُورُوَيْن', plural: 'يُورُوهَات' },
      minor: SY_CENT,
      minorAlone: { ...SY_CENT, suffix: ' مِن الْيُورُو' }
    },
    SYP: {
      major: { singular: CURRENCIES.SYP, dual: 'لِيرْتَيْن سُورِيِّتَيْن', plural: 'لِيرَات سُورِيَّة', feminine: true },
      minor: SY_PIASTRE,
      minorAlone: { singular: 'قِرْش سُورِيّ', dual: 'قِرْشَيْن سُورِيِّين', plural: 'قُرُوش سُورِيَّة' }
    }
  };
  const SY_REPORT = {
    title: 'هَاد تَقْرِير الشُّغْل الْيَوْمِيّ.',
    date: 'تَارِيخ التَّقْرِير',
    sales: 'مَبِيعَات الْيَوْم',
    collections: 'الدَّفْعَات الْيَوْم',
    refunds: 'الْمَبَالِغ اللِّي رَجَّعْنَاهَا الْيَوْم',
    receivables: 'الْمَبَالِغ اللِّي إِلْنَا عِنْد الزَّبَايِن',
    credits: 'الْأَرْصِدَة اللِّي لِلزَّبَايِن عِنْدْنَا',
    unpaid: 'الْفَوَاتِير اللِّي ضَلّ عَلَيْهَا رَصِيد',
    overdue: 'الْفَوَاتِير اللِّي تَأَخَّر وَقْت دَفْعَهَا',
    delivery: 'الْفَوَاتِير اللِّي بَعْدَا نَاطْرَة التَّسْلِيم',
    clients: 'عَدَد الزَّبَايِن',
    products: 'عَدَد الْمُنْتَجَات',
    cash: 'هَيّ أَرْصِدَة الصَّنَادِيق الْمُسَجَّلَة.',
    basis: 'الْحِسَابَات عَلَى أَسَاس الدُّولَار الْأَمْرِيكِيّ الْمَحْفُوظ.',
    deposit: 'دَفْعَات الْيَوْم بْتِشْمَل السِّجِلَّات اللِّي إِلْهَا هَاد التَّارِيخ. الْعُرْبُون اللِّي مَا إِلُه تَارِيخ لَحَالُه, مَا بْيِدْخُل بِتَحْصِيل الْيَوْم.',
    noData: 'مَا فِي مُعَامَلَات مَحْفُوظَة لَحَدّ هَاد التَّارِيخ.'
  };
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
  function underHundred(value, oblique, feminine = false, dialect) {
    if (dialect === 'sy') {
      if (value < 10) return (feminine ? SY_SHORT_DIGITS : SY_DIGITS)[value];
      if (value < 20) return feminine && value === 10 ? 'عَشْر' : SY_TEENS[value - 10];
      const tens = SY_TENS[Math.floor(value / 10)];
      return value % 10 ? SY_DIGITS[value % 10] + ' وَ' + tens : tens;
    }
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
  function underThousand(value, oblique, construct = false, feminine = false, dialect) {
    const hundred = Math.floor(value / 100), rest = value % 100;
    if (dialect === 'sy') {
      const prefix = SY_HUNDREDS[hundred];
      return prefix && rest ? prefix + ' وَ' + underHundred(rest, false, feminine, dialect) : prefix || underHundred(rest, false, feminine, dialect);
    }
    let prefix = HUNDREDS[hundred];
    if (hundred === 2) prefix = construct && !rest ? (oblique ? 'مِائَتَيْ' : 'مِائَتَا') : (oblique ? 'مِائَتَيْنِ' : 'مِائَتَانِ');
    return prefix && rest ? prefix + ' وَ' + underHundred(rest, oblique, feminine) : prefix || underHundred(rest, oblique, feminine);
  }
  function scaledGroup(value, scale, oblique, dialect) {
    const [singular, dual, dualOblique, plural] = SCALES[scale];
    if (value === 1) return singular;
    if (value === 2 && dialect === 'sy') return SY_SCALE_DUALS[scale];
    if (value === 2) return oblique ? dualOblique : dual;
    if (value <= 10) return underHundred(value, oblique, dialect === 'sy', dialect) + ' ' + plural;
    // Repeat the scale for small remainders: 102,000 is "one hundred thousand
    // and two thousand", never an ambiguous "one hundred and two thousand".
    const rest = value % 100;
    if (value > 100 && rest > 0 && rest <= 10) {
      return underThousand(value - rest, oblique, true, false, dialect) + ' ' + singular + ' وَ' + scaledGroup(rest, scale, oblique, dialect);
    }
    return underThousand(value, oblique, true, false, dialect) + ' ' + singular;
  }
  function integerWords(digits, oblique = false, feminine = false, dialect) {
    if (!/^\d+$/.test(String(digits))) fail('invalid-number');
    let value = BigInt(digits);
    if (value > MAX_SAFE) fail('unsafe-number');
    if (!value) return DIGITS[0];
    const groups = [];
    let scale = 0;
    while (value) {
      const group = Number(value % 1000n);
      if (group) groups.unshift(scale ? scaledGroup(group, scale, oblique, dialect) : underThousand(group, oblique, false, feminine, dialect));
      value /= 1000n;
      scale++;
    }
    return groups.join(' وَ');
  }
  function count(value, dialect) {
    if (!Number.isSafeInteger(value) || value < 0) fail('invalid-count');
    const formatter = new Intl.NumberFormat('ar');
    const digits = asciiDigits(formatter.formatToParts(value).filter(part => part.type === 'integer').map(part => part.value).join(''));
    return { display: formatter.format(value), speech: integerWords(digits, false, false, dialect) };
  }
  function namedAmount(digits, unit, dialect) {
    const value = BigInt(digits);
    let speech;
    if (value === 1n) speech = unit.singular + (unit.feminine ? ' وَاحِدَة' : ' وَاحِد');
    else if (value === 2n) speech = unit.dual;
    else {
      const shortForm = dialect === 'sy' ? value >= 3n && value <= 10n : unit.feminine;
      let number = integerWords(digits, false, shortForm, dialect);
      // A final dual magnitude is in construct with the currency noun:
      // مائتا دولار / ألفا دولار / مليونا دولار, without changing its value.
      if (dialect !== 'sy' && value >= 100n && value % 100n === 0n) number = number.replace(/َانِ$/, 'َا');
      const noun = value >= 3n && value <= 10n ? unit.plural : value > 10n ? unit.many || unit.singular : unit.singular;
      speech = number + ' ' + noun;
    }
    return speech + (unit.suffix || '');
  }
  function money(value, currency = 'USD', dialect) {
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
    const units = (dialect === 'sy' ? SY_MONEY_UNITS : MONEY_UNITS)[code];
    let speech;
    if (units) {
      if (!hundredths) speech = namedAmount(integer, units.major, dialect);
      else if (!whole) speech = namedAmount(fraction, units.minorAlone, dialect);
      else speech = namedAmount(integer, units.major, dialect) + ' وَ' + namedAmount(fraction, units.minor, dialect);
    } else {
      const digits = dialect === 'sy' ? SY_DIGITS : DIGITS;
      speech = integerWords(integer, false, false, dialect) + (hundredths ? ' فَاصِلَة ' + [...fraction].map(digit => digits[Number(digit)]).join(' ') : '') + ' ' + CURRENCIES[code];
    }
    return { display: formatter.format(value), speech: sign + speech, roundedZero: !whole && !hundredths };
  }
  // Shared with explicit monetary tokens in the program reader; no display or
  // business state is changed. Uses the same rounding/currency/safety checks.
  function moneyWords(value, currency = 'USD', options = {}) { return money(value, currency, options?.dialect).speech; }
  function date(value, dialect) {
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
      speech: dialect === 'sy'
        ? (day === 1 ? 'أَوَّل' : integerWords(String(day), false, false, dialect)) + ' ' + SY_MONTHS[month - 1] + ', سَنِة ' + integerWords(String(year), false, false, dialect)
        : ordinal + ' مِنْ شَهْرِ ' + MONTHS[month - 1] + ', عَامِ ' + integerWords(String(year), true)
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
  function joinedSpeech(parts, speech) {
    const first = parts[0], last = parts[parts.length - 1];
    return { speech, charIndex: first.charIndex, charLength: last.charIndex + last.charLength - first.charIndex };
  }
  // Only runs after the full displayed source and every offset have passed
  // validation. A grouped sentence owns the exact, contiguous source range it
  // describes; skipped zero clauses never renumber the remaining boundaries.
  function compactSyrian(parts, snapshot) {
    const daily = {
      sales: ['مَبِيعَات', 'صَافِي الْمَبِيعَات', snapshot.daily.invoiceCount],
      collections: ['دَفْعَات', 'مَجْمُوع الدَّفْعَات', snapshot.daily.paymentCount],
      refunds: ['مَبَالِغ مُعَادَة', 'مَجْمُوع الْمَبَالِغ الْمُعَادَة', snapshot.daily.paymentCount]
    };
    const absent = {
      receivables: 'مُسْتَحَقَّات إِلْنَا عِنْد الزَّبَايِن', credits: 'أَرْصِدَة لِلزَّبَايِن عَلَيْنَا',
      unpaid: 'فَوَاتِير عَلَيْهَا رَصِيد', overdue: 'فَوَاتِير مُتَأَخِّرَة بِالدَّفْعِ'
    };
    const group = key => Object.prototype.hasOwnProperty.call(daily, key) ? 'daily'
      : ['receivables', 'credits'].includes(key) ? 'balances'
      : ['unpaid', 'overdue'].includes(key) ? 'invoices' : '';
    const cash = parts.filter(part => part.key === 'cash');
    // A zero total alone cannot prove absence of activity: credit notes can
    // offset sales, zero-value payments can exist, and cash can balance out.
    const emptyFinancial = snapshot.daily.invoiceCount === 0 && snapshot.daily.paymentCount === 0 &&
      snapshot.daily.excludedUndatedDeposits === 0 && snapshot.counts.invoices === 0 &&
      parts.filter(part => group(part.key) || part.key === 'delivery').every(part => part.value === 0) &&
      cash.every(part => part.value === 0 && snapshot.cashboxes[part.rowIndex].entries === 0);
    if (emptyFinancial) {
      const financial = parts.filter(part => group(part.key) || part.key === 'delivery');
      return parts.filter(part => part.key === 'title' || part.key === 'date').concat(
        joinedSpeech(financial, 'بِهَاد التَّقْرِير مَا فِي حَرَكَة مَالِيَّة مُسَجَّلَة لِلْيَوْم, وَلَا أَرْصِدَة عَلَيْنَا أَو إِلْنَا أَو بِالصَّنَادِيقِ.'),
        parts.filter(part => ['clients', 'products'].includes(part.key) && part.value !== 0)
      );
    }
    const result = [];
    for (let index = 0; index < parts.length;) {
      const part = parts[index], kind = group(part.key);
      if (kind && part.value === 0) {
        const run = [part];
        while (group(parts[index + run.length]?.key) === kind && parts[index + run.length].value === 0) run.push(parts[index + run.length]);
        let speech;
        if (kind === 'daily') {
          const missing = run.filter(item => daily[item.key][2] === 0).map(item => daily[item.key][0]);
          const zeroTotals = run.filter(item => daily[item.key][2] !== 0).map(item => daily[item.key][1]);
          speech = 'الْيَوْم ' + (zeroTotals.length ? zeroTotals.join(' وَ') + ' صِفِر' : '') +
            (zeroTotals.length && missing.length ? ', وَ' : '') +
            (missing.length ? 'مَا فِي ' + missing.join(' وَلَا ') + ' مُسَجَّلَة' : '') + '.';
        } else speech = 'مَا فِي ' + run.map(item => absent[item.key]).join(' وَلَا ') + '.';
        result.push(joinedSpeech(run, speech));
        index += run.length;
      } else if (part.key === 'cash-heading') {
        const run = [part];
        while (parts[index + run.length]?.key === 'cash') run.push(parts[index + run.length]);
        if (cash.every(item => item.value === 0)) {
          const hasEntries = snapshot.cashboxes.some(row => row.entries > 0);
          result.push(joinedSpeech(run, !cash.length ? 'مَا فِي صَنَادِيق مُسَجَّلَة.' : hasEntries
            ? 'أَرْصِدَة الصَّنَادِيق الْمُسَجَّلَة كِلَّهَا صِفِر, مَع وُجُود حَرَكَة مُسَجَّلَة.'
            : 'الصَّنَادِيق مَا فِيهَا حَرَكَة مُسَجَّلَة.'));
        } else result.push(part, ...cash.filter(item => item.value !== 0 || snapshot.cashboxes[item.rowIndex].entries > 0));
        index += run.length;
      } else {
        // Existing catalogue counts matter; empty catalogue/delivery rows add
        // no useful spoken detail. The broader legacy no-data sentence is
        // redundant here and does not establish absence of historical records.
        if (!(part.value === 0 && ['clients', 'products', 'delivery'].includes(part.key)) && part.key !== 'no-data') result.push(part);
        index++;
      }
    }
    return result;
  }
  function prepare(snapshot, options = {}) {
    if (!snapshot || snapshot.locale !== 'ar' || snapshot.reportComplete !== true || snapshot.complete !== true) fail('incomplete-report');
    if (!snapshot.daily || !snapshot.balances || !snapshot.counts || !Array.isArray(snapshot.cashboxes)) fail('invalid-snapshot');
    if (typeof snapshot.narration !== 'string' || !snapshot.narration || snapshot.narration.length > 16000 || !Array.isArray(snapshot.narrationSegments)) fail('invalid-narration');
    const dialect = options?.dialect === 'sy' ? 'sy' : undefined;
    const spoken = (key, formal) => dialect === 'sy' ? SY_REPORT[key] : formal;
    const specs = [];
    const clause = (display, speech, key, value) => ({ display, speech, key, value });
    const segment = clauses => specs.push({ display: clauses.map(item => item.display).join(' '), clauses });
    const single = (display, speech, key) => segment([clause(display, speech, key)]);
    const reportAmount = (value, currency) => {
      const amount = money(value, currency, dialect);
      // Preserve displayed precision without mistaking a genuine sub-cent
      // amount (including a negative one) for absence of financial activity.
      if (dialect === 'sy' && value !== 0 && amount.roundedZero) amount.speech +=
        ' بَعْد التَّقْرِيب, وَقِيمْتُه الْأَصْلِيَّة صْغِيرَة وَ' + (value < 0 ? 'سَالْبَة' : 'مُوجَبَة');
      return amount;
    };
    const amountLine = (label, vocalized, value, key) => {
      const amount = reportAmount(value, 'USD');
      return clause(label + ': ' + amount.display + '.', vocalized + ': ' + amount.speech + '.', key, value);
    };
    const countLine = (label, vocalized, value, key) => {
      const amount = count(value, dialect);
      return clause(label + ': ' + amount.display + '.', vocalized + ': ' + amount.speech + '.', key, value);
    };
    const reportDate = date(snapshot.date, dialect);
    segment([
      clause('تقرير الأعمال اليومي.', spoken('title', 'تَقْرِيرُ الْأَعْمَالِ الْيَوْمِيُّ.'), 'title'),
      clause('تاريخ التقرير: ' + reportDate.display + '.', spoken('date', 'تَارِيخُ التَّقْرِيرِ') + ': ' + reportDate.speech + '.', 'date')
    ]);
    segment([amountLine('مبيعات اليوم', spoken('sales', 'مَبِيعَاتُ الْيَوْمِ'), snapshot.daily.salesUSD, 'sales')]);
    segment([amountLine('دفعات اليوم', spoken('collections', 'دَفَعَاتُ الْيَوْمِ'), snapshot.daily.collectionsUSD, 'collections')]);
    segment([amountLine('مبالغ معادة اليوم', spoken('refunds', 'مَبَالِغُ مُعَادَةٌ الْيَوْمَ'), snapshot.daily.refundsUSD, 'refunds')]);
    segment([amountLine('مستحق لنا على العملاء', spoken('receivables', 'مُسْتَحَقٌّ لَنَا عَلَى الْعُمَلَاءِ'), snapshot.balances.receivables, 'receivables')]);
    segment([amountLine('أرصدة لصالح العملاء', spoken('credits', 'أَرْصِدَةٌ لِصَالِحِ الْعُمَلَاءِ'), snapshot.balances.customerCredits, 'credits')]);
    segment([
      countLine('فواتير برصيد متبقٍ', spoken('unpaid', 'فَوَاتِيرُ بِرَصِيدٍ مُتَبَقٍّ'), snapshot.counts.unpaid, 'unpaid'),
      countLine('فواتير متأخرة الاستحقاق', spoken('overdue', 'فَوَاتِيرُ مُتَأَخِّرَةُ الْاِسْتِحْقَاقِ'), snapshot.counts.overdue, 'overdue')
    ]);
    segment([countLine('بانتظار التسليم', spoken('delivery', 'بِانْتِظَارِ التَّسْلِيمِ'), snapshot.counts.pendingDelivery, 'delivery')]);
    segment([
      countLine('العملاء', spoken('clients', 'الْعُمَلَاءُ'), snapshot.counts.clients, 'clients'),
      countLine('المنتجات', spoken('products', 'الْمُنْتَجَاتُ'), snapshot.counts.products, 'products')
    ]);
    const amounts = snapshot.cashboxes.map(row => {
      if (!row || row.complete !== true || row.salesComplete !== true) fail('incomplete-cashbox');
      count(row.entries);
      return reportAmount(row.balance, row.currency);
    });
    const cashHeading = 'أرصدة الصناديق المسجلة:';
    specs.push({
      display: cashHeading + ' ' + amounts.map(amount => amount.display).join('، ') + '.',
      clauses: [clause(cashHeading, spoken('cash', 'أَرْصِدَةُ الصَّنَادِيقِ الْمُسَجَّلَةِ.'), 'cash-heading')].concat(amounts.map((amount, index) => ({
        ...clause(amount.display + (index === amounts.length - 1 ? '.' : '،'), amount.speech + '.', 'cash', snapshot.cashboxes[index].balance), rowIndex: index
      })))
    });
    single('الحسابات على أساس USD المحفوظ.', spoken('basis', 'الْحِسَابَاتُ عَلَى أَسَاسِ الدُّولَارِ الْأَمْرِيكِيِّ الْمَحْفُوظِ.'), 'basis');
    count(snapshot.daily.excludedUndatedDeposits);
    count(snapshot.counts.invoices);
    count(snapshot.daily.paymentCount);
    if (dialect === 'sy') count(snapshot.daily.invoiceCount);
    if (snapshot.daily.excludedUndatedDeposits) single(DEPOSIT_NOTE, spoken('deposit', 'دَفَعَاتُ الْيَوْمِ تَشْمَلُ السِّجِلَّاتِ ذَاتَ التَّارِيخِ الْمُحَدَّدِ; الْعُرْبُونُ بِلَا تَارِيخٍ مُسْتَقِلٍّ لَا يَدْخُلُ فِي تَحْصِيلِ الْيَوْمِ.'), 'deposit-note');
    if (!snapshot.counts.invoices && !snapshot.daily.paymentCount && !snapshot.cashboxes.some(row => row.entries)) single(NO_DATA, spoken('noData', 'لَا تُوجَدُ مُعَامَلَاتٌ مَحْفُوظَةٌ حَتَّى هَذَا التَّارِيخِ.'), 'no-data');
    if (snapshot.narration !== specs.map(spec => spec.display).join(' ') || snapshot.narrationSegments.length !== specs.length) fail('source-mismatch');
    const parts = [];
    let offset = 0;
    specs.forEach((spec, index) => {
      const source = snapshot.narrationSegments[index];
      if (!source || source.text !== spec.display || source.start !== offset || source.end !== offset + spec.display.length) fail('offset-mismatch');
      let cursor = 0;
      for (const part of spec.clauses) {
        const start = spec.display.indexOf(part.display, cursor);
        if (start < 0) fail('source-mismatch');
        parts.push({ ...part, charIndex: offset + start, charLength: part.display.length });
        cursor = start + part.display.length;
      }
      offset += spec.display.length + 1;
    });
    const spokenParts = dialect === 'sy' ? compactSyrian(parts, snapshot) : parts;
    return spokenParts.flatMap(part => boundedSpeech(part.speech, part.charIndex, part.charLength));
  }

  const api = Object.freeze({ prepare, moneyWords });
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.WFArabicReportSpeech = api;
})(typeof window === 'object' ? window : globalThis);
