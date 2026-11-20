const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const vm = require('node:vm');
const { build, localize } = require('../business-overview.js');
const { prepare, moneyWords } = require('../arabic-report-speech.js');

const empty = () => ({ companies: [], products: [], invoices: [], payments: [], cashEntries: [] });
function fixture(change = () => {}, date = '2026-11-19') {
  const snapshot = build(empty(), { date });
  change(snapshot);
  return localize(snapshot, 'ar');
}
const plain = value => value.replace(/[\u064b-\u065f\u0670]/g, '');
const source = (snapshot, chunk) => snapshot.narration.slice(chunk.charIndex, chunk.charIndex + chunk.charLength);
const speechFor = (snapshot, prefix, options) => prepare(snapshot, options).filter(chunk => source(snapshot, chunk).startsWith(prefix)).map(chunk => plain(chunk.text)).join(' ');
const rejects = (snapshot, reason, options) => assert.throws(() => prepare(snapshot, options), error => error.code === 'unsupported-report' && error.reason === reason);

test('real committed report templates become vocalized local speech without changing the snapshot', () => {
  const date = '2026-11-19';
  const state = empty();
  state.companies = [{ id: 'client' }];
  state.products = [{ id: 'sofa' }];
  state.invoices = [{ id: 'invoice', companyId: 'client', date, grandTotal: 100.05, depositUSD: 20, currency: 'USD', items: [] }];
  state.payments = [{ id: 'receipt', invoiceId: 'invoice', date, amount: 30.01, amountBasis: 'USD', currency: 'USD', receiptType: 'cash' }];
  const snapshot = localize(build(state, { date }), 'ar');
  const before = JSON.stringify(snapshot), chunks = prepare(snapshot);
  assert.equal(JSON.stringify(snapshot), before);
  assert.equal(speechFor(snapshot, 'مبيعات اليوم:'), 'مبيعات اليوم: مائة دولار أمريكي وخمسة سنتات.');
  assert.equal(speechFor(snapshot, 'دفعات اليوم:'), 'دفعات اليوم: ثلاثون دولار أمريكي وسنت واحد.');
  assert.equal(speechFor(snapshot, 'مستحق لنا على العملاء:'), 'مستحق لنا على العملاء: خمسون دولار أمريكي وأربعة سنتات.');
  assert(chunks.some(chunk => source(snapshot, chunk).startsWith('دفعات اليوم تشمل السجلات')));
  assert(!chunks.some(chunk => source(snapshot, chunk).startsWith('لا توجد معاملات')));
  for (const chunk of chunks) {
    assert(/[\u064b-\u0652]/.test(chunk.text));
    assert(!/[0-9٠-٩۰-۹]|USD|TRY|EUR|SYP/.test(chunk.text));
    assert(!/[،؛؟]/.test(chunk.text));
    assert(chunk.text.length <= 220);
  }
});

test('each playback boundary refers to an exact original sentence or cash span', () => {
  const snapshot = fixture(), chunks = prepare(snapshot);
  let previous = -1;
  for (const chunk of chunks) {
    assert(Number.isSafeInteger(chunk.charIndex) && Number.isSafeInteger(chunk.charLength));
    assert(chunk.charIndex >= previous);
    assert(chunk.charLength > 0 && chunk.charIndex + chunk.charLength <= snapshot.narration.length);
    assert(snapshot.narrationSegments.some(segment => chunk.charIndex >= segment.start && chunk.charIndex + chunk.charLength <= segment.end));
    assert(source(snapshot, chunk).trim());
    previous = chunk.charIndex;
  }
  assert.equal(source(snapshot, chunks[0]), 'تقرير الأعمال اليومي.');
  assert(source(snapshot, chunks[1]).startsWith('تاريخ التقرير:'));
  const zero = new Intl.NumberFormat('ar').format(0);
  assert(chunks.some(chunk => source(snapshot, chunk) === 'فواتير برصيد متبقٍ: ' + zero + '.'));
  assert(chunks.some(chunk => source(snapshot, chunk) === 'فواتير متأخرة الاستحقاق: ' + zero + '.'));
  assert(chunks.some(chunk => source(snapshot, chunk) === 'العملاء: ' + zero + '.'));
  assert(chunks.some(chunk => source(snapshot, chunk) === 'المنتجات: ' + zero + '.'));
  const cash = snapshot.narrationSegments[9];
  const cashChunks = chunks.filter(chunk => chunk.charIndex >= cash.start && chunk.charIndex < cash.end);
  assert.equal(cashChunks.length, 5);
  assert.equal(cashChunks.map(chunk => source(snapshot, chunk)).join(' '), cash.text);
  assert(chunks.some(chunk => source(snapshot, chunk) === 'لا توجد معاملات محفوظة حتى هذا التاريخ.'));
});

test('money speech follows displayed rounding, names cents and normalizes displayed negative zero', () => {
  const examples = [
    [0, 'صفر دولار أمريكي'],
    [0.05, 'خمسة سنتات أمريكية'],
    [0.5, 'خمسون سنتا أمريكيا'],
    [1.005, 'دولار أمريكي واحد وسنت واحد'],
    [9.999, 'عشرة دولارات أمريكية'],
    [1250.05, 'ألف ومائتان وخمسون دولار أمريكي وخمسة سنتات'],
    [-1250.05, 'سالب ألف ومائتان وخمسون دولار أمريكي وخمسة سنتات'],
    [-0, 'صفر دولار أمريكي'],
    [-0.004, 'صفر دولار أمريكي'],
    [-0.005, 'سالب سنت أمريكي واحد']
  ];
  for (const [value, expected] of examples) {
    const snapshot = fixture(s => { s.daily.salesUSD = value; });
    assert.equal(speechFor(snapshot, 'مبيعات اليوم:'), 'مبيعات اليوم: ' + expected + '.', String(value));
  }
});

test('whole monetary magnitudes never read zero decimals or spell each zero', () => {
  const examples = [
    [1, 'دولار أمريكي واحد'], [2, 'دولاران أمريكيان'], [3, 'ثلاثة دولارات أمريكية'],
    [200, 'مائتا دولار أمريكي'], [1000, 'ألف دولار أمريكي'], [2000, 'ألفا دولار أمريكي'],
    [1000000, 'مليون دولار أمريكي'], [2000000, 'مليونا دولار أمريكي'],
    [3000000, 'ثلاثة ملايين دولار أمريكي'], [1000000000, 'مليار دولار أمريكي'],
    [1000000.05, 'مليون دولار أمريكي وخمسة سنتات']
  ];
  for (const [value, expected] of examples) {
    const snapshot = fixture(s => { s.daily.salesUSD = value; });
    assert.equal(speechFor(snapshot, 'مبيعات اليوم:'), 'مبيعات اليوم: ' + expected + '.', String(value));
  }
});

test('all four native cash currencies retain their own amount, unit and original range', () => {
  const snapshot = fixture(s => {
    [1250.05, -202.02, 0.01, 1000000.99].forEach((value, index) => { s.cashboxes[index].balance = value; });
  });
  const cash = snapshot.narrationSegments[9];
  const chunks = prepare(snapshot).filter(chunk => chunk.charIndex > cash.start && chunk.charIndex < cash.end);
  assert.deepEqual(chunks.map(chunk => plain(chunk.text)), [
    'ألف ومائتان وخمسون دولار أمريكي وخمسة سنتات.',
    'سالب مائتان واثنتان ليرة تركية وقرشان.',
    'سنت واحد من اليورو.',
    'مليون ليرة سورية وتسعة وتسعون قرشا.'
  ]);
  assert.equal(chunks.map(chunk => source(snapshot, chunk)).join(' '), cash.text.slice('أرصدة الصناديق المسجلة: '.length));
});

test('stored report dates use the requested Gregorian day, month and year without wall-clock substitution', () => {
  const examples = [
    ['2024-02-29', 'التاسع والعشرون من شهر فبراير, عام ألفين وأربعة وعشرين'],
    ['2000-01-01', 'الأول من شهر يناير, عام ألفين'],
    ['2026-08-11', 'الحادي عشر من شهر أغسطس, عام ألفين وستة وعشرين'],
    ['2026-08-12', 'الثاني عشر من شهر أغسطس, عام ألفين وستة وعشرين'],
    ['2026-11-20', 'العشرون من شهر نوفمبر, عام ألفين وستة وعشرين'],
    ['2026-11-21', 'الحادي والعشرون من شهر نوفمبر, عام ألفين وستة وعشرين'],
    ['2026-11-30', 'الثلاثون من شهر نوفمبر, عام ألفين وستة وعشرين'],
    ['2026-12-31', 'الحادي والثلاثون من شهر ديسمبر, عام ألفين وستة وعشرين']
  ];
  for (const [date, expected] of examples) assert.equal(speechFor(fixture(() => {}, date), 'تاريخ التقرير:'), 'تاريخ التقرير: ' + expected + '.');
});

test('large groups and dual thousands are explicit, with no lost place value', () => {
  const examples = [
    [2, 'اثنان'], [12, 'اثنا عشر'], [21, 'واحد وعشرون'], [99, 'تسعة وتسعون'],
    [100, 'مائة'], [200, 'مائتان'], [5225, 'خمسة آلاف ومائتان وخمسة وعشرون'],
    [102000, 'مائة ألف وألفان'], [201000, 'مائتا ألف وألف'],
    [3000000, 'ثلاثة ملايين'], [2000000000, 'ملياران'],
    [1000000000000, 'تريليون']
  ];
  for (const [value, expected] of examples) {
    const snapshot = fixture(s => { s.counts.clients = value; });
    assert.equal(speechFor(snapshot, 'العملاء:'), 'العملاء: ' + expected + '.', String(value));
  }
});

test('long spelled amounts are bounded without silently dropping words or inventing display offsets', () => {
  const snapshot = fixture(s => { s.daily.salesUSD = 87654321987654.25; s.counts.clients = Number.MAX_SAFE_INTEGER; });
  const chunks = prepare(snapshot);
  assert(chunks.some((chunk, index) => index && chunk.charIndex === chunks[index - 1].charIndex));
  const spoken = speechFor(snapshot, 'مبيعات اليوم:');
  assert(spoken.startsWith('مبيعات اليوم:'));
  assert(spoken.endsWith('دولار أمريكي وخمسة وعشرون سنتا.'));
  for (const chunk of chunks) {
    assert(chunk.text.length <= 220);
    assert(!/^[\u064b-\u065f]/.test(chunk.text));
    assert(source(snapshot, chunk).trim());
  }
});

test('the exact visible source and offsets must agree before financial speech is returned', () => {
  const modifiedText = fixture();
  modifiedText.narration = modifiedText.narration.replace('مبيعات اليوم', 'مبيعات أخرى');
  rejects(modifiedText, 'source-mismatch');
  const modifiedAmount = fixture();
  modifiedAmount.daily.salesUSD = 800;
  rejects(modifiedAmount, 'source-mismatch');
  const modifiedSegment = fixture();
  modifiedSegment.narrationSegments[1].start++;
  rejects(modifiedSegment, 'offset-mismatch');
  const modifiedEnd = fixture();
  modifiedEnd.narrationSegments[1].end--;
  rejects(modifiedEnd, 'offset-mismatch');
  const modifiedParagraph = fixture();
  modifiedParagraph.narrationSegments[1].text += ' ';
  rejects(modifiedParagraph, 'offset-mismatch');
  const missingParagraph = fixture();
  missingParagraph.narrationSegments.pop();
  rejects(missingParagraph, 'source-mismatch');
});

test('unsafe, incomplete or unsupported data never produce a plausible but incorrect report', () => {
  for (const value of [NaN, Infinity, -Infinity, '1.00']) rejects(fixture(s => { s.daily.salesUSD = value; }), 'invalid-money');
  rejects(fixture(s => { s.daily.salesUSD = 90071992547409.92; }), 'unsafe-money');
  for (const value of [-1, 1.5, Number.MAX_SAFE_INTEGER + 1]) rejects(fixture(s => { s.counts.clients = value; }), 'invalid-count');
  const incomplete = fixture(); incomplete.reportComplete = false; rejects(incomplete, 'incomplete-report');
  const incompleteCash = fixture(); incompleteCash.cashboxes[0].complete = false; rejects(incompleteCash, 'incomplete-cashbox');
  const english = localize(build(empty(), { date: '2026-11-19' }), 'en'); rejects(english, 'incomplete-report');
  rejects(fixture(s => { s.cashboxes[0].currency = 'XYZ'; }), 'unsupported-currency');
  const impossibleDate = fixture(); impossibleDate.date = '2026-02-30'; rejects(impossibleDate, 'invalid-date');
  const missingSegments = fixture(); delete missingSegments.narrationSegments; rejects(missingSegments, 'invalid-narration');
});

test('additional known currencies are named and invalid codes follow the visible USD fallback', () => {
  const sterling = fixture(s => { s.cashboxes[0].currency = 'GBP'; s.cashboxes[0].balance = 3.25; });
  assert(prepare(sterling).some(chunk => plain(chunk.text) === 'ثلاثة فاصلة اثنان خمسة جنيه إسترليني.'));
  const invalid = fixture(s => { s.cashboxes[0].currency = 'not-a-code'; });
  assert(prepare(invalid).some(chunk => source(invalid, chunk).includes('دولار أمريكي') && plain(chunk.text).includes('دولار أمريكي')));
});

test('minor-only values identify the currency and retain cent versus kurus versus piastre', () => {
  const examples = [
    ['USD', 0.01, 'سنت أمريكي واحد'], ['USD', 0.02, 'سنتان أمريكيان'],
    ['USD', 0.05, 'خمسة سنتات أمريكية'], ['USD', 0.50, 'خمسون سنتا أمريكيا'],
    ['TRY', 0.05, 'خمسة قروش تركية'], ['TRY', 21.05, 'إحدى وعشرون ليرة تركية وخمسة قروش'],
    ['EUR', 0.05, 'خمسة سنتات من اليورو'], ['EUR', 1.25, 'يورو واحد وخمسة وعشرون سنتا'],
    ['SYP', 0.05, 'خمسة قروش سورية'], ['SYP', 3.02, 'ثلاث ليرات سورية وقرشان']
  ];
  for (const [currency, value, expected] of examples) {
    const snapshot = fixture(s => { s.cashboxes[0].currency = currency; s.cashboxes[0].balance = value; });
    const matching = prepare(snapshot).filter(chunk => source(snapshot, chunk).includes(new Intl.NumberFormat('ar', {style: 'currency', currencyDisplay: 'name', currency, minimumFractionDigits: 2, maximumFractionDigits: 2}).format(value)));
    assert.equal(matching.map(chunk => plain(chunk.text)).join(' '), expected + '.', currency + ' ' + value);
  }
});

test('currencies with unconfigured minor units preserve decimals instead of inventing cent values', () => {
  for (const [currency, unit] of [['KWD', 'دينار كويتي'], ['JOD', 'دينار أردني'], ['BHD', 'دينار بحريني']]) {
    const snapshot = fixture(s => { s.cashboxes[0].currency = currency; s.cashboxes[0].balance = 0.05; });
    assert(prepare(snapshot).some(chunk => plain(chunk.text) === 'صفر فاصلة صفر خمسة ' + unit + '.'));
  }
});

test('the public money helper is pure and applies the same rounding and safety guards', () => {
  assert.equal(plain(moneyWords(0)), 'صفر دولار أمريكي');
  assert.equal(plain(moneyWords(-0.004, 'TRY')), 'صفر ليرة تركية');
  assert.equal(plain(moneyWords(1000000)), 'مليون دولار أمريكي');
  assert.equal(plain(moneyWords(1.005)), 'دولار أمريكي واحد وسنت واحد');
  assert.equal(plain(moneyWords(0.05, 'KWD')), 'صفر فاصلة صفر خمسة دينار كويتي');
  for (const value of [NaN, Infinity, -Infinity, '1.00']) assert.throws(() => moneyWords(value), error => error.reason === 'invalid-money');
  assert.throws(() => moneyWords(90071992547409.92), error => error.reason === 'unsafe-money');
  assert.throws(() => moneyWords(10, 'XYZ'), error => error.reason === 'unsupported-currency');
});

test('browser loading exposes only the pure API and needs neither DOM nor network', () => {
  const context = { window: {}, Intl, Date, BigInt, Object, Number, String, Error };
  vm.runInNewContext(readFileSync(require.resolve('../arabic-report-speech.js'), 'utf8'), context);
  assert.equal(typeof context.window.WFArabicReportSpeech.prepare, 'function');
  assert.equal(typeof context.window.WFArabicReportSpeech.moneyWords, 'function');
  const snapshot = fixture(), before = JSON.stringify(snapshot);
  const chunks = context.window.WFArabicReportSpeech.prepare(snapshot);
  assert(chunks.length > 10);
  assert.equal(JSON.stringify(snapshot), before);
  assert.deepEqual(Object.keys(context.window), ['WFArabicReportSpeech']);
});

test('Syrian report speech uses conversational templates while retaining exact original source ranges', () => {
  const options = { dialect: 'sy' };
  const snapshot = fixture(s => {
    s.daily.salesUSD = 1250.05;
    s.balances.receivables = 21.05;
    s.daily.excludedUndatedDeposits = 1;
  });
  const before = JSON.stringify(snapshot), formal = prepare(snapshot), syrian = prepare(snapshot, options);
  assert.equal(JSON.stringify(snapshot), before);
  assert.equal(plain(syrian[0].text), 'هاد تقرير الشغل اليومي.');
  assert.equal(speechFor(snapshot, 'مبيعات اليوم:', options), 'مبيعات اليوم: ألف وميتين وخمسين دولار أمريكي وخمس سنتات.');
  assert.equal(speechFor(snapshot, 'مستحق لنا على العملاء:', options), 'المبالغ اللي إلنا عند الزباين: واحد وعشرين دولار أمريكي وخمس سنتات.');
  assert.equal(speechFor(snapshot, 'أرصدة لصالح العملاء:', options), 'ما في أرصدة للزباين علينا.');
  assert.equal(speechFor(snapshot, 'فواتير برصيد متبقٍ:', options), 'ما في فواتير عليها رصيد ولا فواتير متأخرة بالدفع.');
  assert.equal(speechFor(snapshot, 'فواتير متأخرة الاستحقاق:', options), '');
  assert.equal(speechFor(snapshot, 'الحسابات على أساس', options), 'الحسابات على أساس الدولار الأمريكي المحفوظ.');
  assert.equal(speechFor(snapshot, 'لا توجد معاملات', options), '');
  assert.match(speechFor(snapshot, 'دفعات اليوم تشمل السجلات', options), /العربون اللي ما إله تاريخ لحاله, ما بيدخل بتحصيل اليوم\./);
  assert(syrian.length < formal.length);
  for (const prefix of ['تقرير الأعمال', 'تاريخ التقرير:', 'مبيعات اليوم:', 'مستحق لنا على العملاء:', 'الحسابات على أساس', 'دفعات اليوم تشمل السجلات']) {
    const original = formal.find(chunk => source(snapshot, chunk).startsWith(prefix));
    const spoken = syrian.find(chunk => source(snapshot, chunk).startsWith(prefix));
    assert.equal(spoken.charIndex, original.charIndex);
    assert.equal(spoken.charLength, original.charLength);
  }
  for (const chunk of syrian) {
    assert(snapshot.narrationSegments.some(segment => chunk.charIndex >= segment.start && chunk.charIndex < segment.end));
    assert(snapshot.narrationSegments.some(segment => chunk.charIndex + chunk.charLength > segment.start && chunk.charIndex + chunk.charLength <= segment.end));
    assert(!/[0-9٠-٩۰-۹]|USD|TRY|EUR|SYP|[،؛؟]/.test(chunk.text));
    assert(chunk.text.length <= 220);
  }
  assert.deepEqual(prepare(snapshot, {}), formal);
  assert.deepEqual(prepare(snapshot, { dialect: 'unknown' }), formal);
});

test('Syrian monetary pronunciation retains exact rounded values, currency units, signs and magnitudes', () => {
  const options = { dialect: 'sy' };
  const examples = [
    [0, 'USD', 'صفر دولار أمريكي'],
    [-0.004, 'USD', 'صفر دولار أمريكي'],
    [-0.005, 'USD', 'سالب سنت أمريكي واحد'],
    [1.005, 'USD', 'دولار أمريكي واحد وسنت واحد'],
    [2, 'USD', 'دولارين أمريكيين'],
    [9.999, 'USD', 'عشر دولارات أمريكية'],
    [101, 'USD', 'مية وواحد دولار أمريكي'],
    [200, 'USD', 'ميتين دولار أمريكي'],
    [2000, 'USD', 'ألفين دولار أمريكي'],
    [-1250.05, 'USD', 'سالب ألف وميتين وخمسين دولار أمريكي وخمس سنتات'],
    [1000000.05, 'USD', 'مليون دولار أمريكي وخمس سنتات'],
    [2000000, 'USD', 'مليونين دولار أمريكي'],
    [0.5, 'USD', 'خمسين سنت أمريكي'],
    [21.05, 'TRY', 'واحد وعشرين ليرة تركية وخمس قروش'],
    [0.01, 'EUR', 'سنت واحد من اليورو'],
    [3.02, 'SYP', 'تلات ليرات سورية وقرشين'],
    [0.05, 'KWD', 'صفر فاصلة صفر خمسة دينار كويتي']
  ];
  for (const [value, currency, expected] of examples) {
    assert.equal(plain(moneyWords(value, currency, options)), expected, currency + ' ' + value);
    const snapshot = fixture(s => { s.daily.salesUSD = 1; s.cashboxes[0].currency = currency; s.cashboxes[0].balance = value; });
    const cash = snapshot.narrationSegments[9];
    if (value === 0) {
      assert.equal(speechFor(snapshot, 'أرصدة الصناديق المسجلة:', options), 'الصناديق ما فيها حركة مسجلة.');
      continue;
    }
    const chunk = prepare(snapshot, options).find(chunk => chunk.charIndex === cash.start + 'أرصدة الصناديق المسجلة: '.length);
    const qualifier = Math.abs(value) < 0.005 ? ' بعد التقريب, وقيمته الأصلية صغيرة و' + (value < 0 ? 'سالبة' : 'موجبة') : '';
    assert.equal(plain(chunk.text), expected + qualifier + '.');
    assert(source(snapshot, chunk).startsWith(new Intl.NumberFormat('ar', { style: 'currency', currencyDisplay: 'name', currency, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)));
  }
});

test('Syrian counts and Gregorian dates preserve the committed day, year and every large place value', () => {
  const options = { dialect: 'sy' };
  for (const [value, expected] of [
    [2, 'تنين'], [12, 'طنعش'], [21, 'واحد وعشرين'], [99, 'تسعة وتسعين'],
    [100, 'مية'], [200, 'ميتين'], [5225, 'خمس آلاف وميتين وخمسة وعشرين'],
    [102000, 'مية ألف وألفين'], [201000, 'ميتين ألف وألف'],
    [3000000, 'تلات ملايين'], [2000000000, 'مليارين']
  ]) {
    assert.equal(speechFor(fixture(s => { s.counts.clients = value; }), 'العملاء:', options), 'عدد الزباين: ' + expected + '.', String(value));
  }
  for (const [storedDate, expected] of [
    ['2000-01-01', 'أول كانون التاني, سنة ألفين'],
    ['2024-02-29', 'تسعة وعشرين شباط, سنة ألفين وأربعة وعشرين'],
    ['2026-08-11', 'حدعش آب, سنة ألفين وستة وعشرين'],
    ['2026-08-12', 'طنعش آب, سنة ألفين وستة وعشرين'],
    ['2026-11-20', 'عشرين تشرين التاني, سنة ألفين وستة وعشرين'],
    ['2026-12-31', 'واحد وتلاتين كانون الأول, سنة ألفين وستة وعشرين']
  ]) {
    assert.equal(speechFor(fixture(() => {}, storedDate), 'تاريخ التقرير:', options), 'تاريخ التقرير: ' + expected + '.');
  }
  const snapshot = fixture(s => { s.daily.salesUSD = 87654321987654.25; s.counts.clients = Number.MAX_SAFE_INTEGER; });
  const longSpeech = speechFor(snapshot, 'مبيعات اليوم:', options);
  assert.equal(longSpeech, 'مبيعات اليوم: ' + plain(moneyWords(snapshot.daily.salesUSD, 'USD', options)) + '.');
  assert(prepare(snapshot, options).every(chunk => chunk.text.length <= 220 && source(snapshot, chunk).trim()));
});

test('Syrian mode rejects changed visible data, invalid source offsets and unsafe finances exactly as formal mode', () => {
  const options = { dialect: 'sy' };
  const changedSource = fixture(); changedSource.narration = changedSource.narration.replace('مبيعات اليوم', 'مبيعات أخرى');
  rejects(changedSource, 'source-mismatch', options);
  const changedValue = fixture(); changedValue.daily.salesUSD = 800;
  rejects(changedValue, 'source-mismatch', options);
  const changedOffset = fixture(); changedOffset.narrationSegments[1].start++;
  rejects(changedOffset, 'offset-mismatch', options);
  const missingSegment = fixture(); missingSegment.narrationSegments.pop();
  rejects(missingSegment, 'source-mismatch', options);
  const incomplete = fixture(); incomplete.reportComplete = false;
  rejects(incomplete, 'incomplete-report', options);
  const invalidDate = fixture(); invalidDate.date = '2026-02-30';
  rejects(invalidDate, 'invalid-date', options);
  for (const value of [NaN, Infinity, '1.00']) rejects(fixture(s => { s.daily.salesUSD = value; }), 'invalid-money', options);
  rejects(fixture(s => { s.daily.salesUSD = 90071992547409.92; }), 'unsafe-money', options);
  rejects(fixture(s => { s.counts.clients = Number.MAX_SAFE_INTEGER + 1; }), 'invalid-count', options);
  rejects(fixture(s => { s.cashboxes[0].currency = 'XYZ'; }), 'unsupported-currency', options);
});

test('an empty Syrian financial report is brief and still mentions existing clients and products', () => {
  const snapshot = fixture(s => { s.counts.clients = 3; s.counts.products = 12; });
  const before = JSON.stringify(snapshot), chunks = prepare(snapshot, { dialect: 'sy' });
  const text = chunks.map(chunk => plain(chunk.text)).join(' ');
  assert.match(text, /ما في حركة مالية مسجلة لليوم/);
  assert.match(text, /عدد الزباين: تلاتة\./);
  assert.match(text, /عدد المنتجات: طنعش\./);
  assert(!/صفر|مشتريات|لا توجد معاملات|الحسابات على أساس/.test(text));
  assert(chunks.length <= 6);
  assert.equal(JSON.stringify(snapshot), before);
  const trulyEmpty = prepare(fixture(), { dialect: 'sy' }).map(chunk => plain(chunk.text)).join(' ');
  assert(!/عدد الزباين|عدد المنتجات|صفر/.test(trulyEmpty));
});

test('Syrian summaries combine adjacent empty categories while preserving active source spans', () => {
  const snapshot = fixture(s => {
    s.daily.salesUSD = 1250.05;
    s.daily.invoiceCount = 1;
    s.counts.invoices = 1;
  });
  const chunks = prepare(snapshot, { dialect: 'sy' });
  const daily = chunks.find(chunk => chunk.charIndex === snapshot.narrationSegments[2].start);
  assert.equal(plain(daily.text), 'اليوم ما في دفعات ولا مبالغ معادة مسجلة.');
  assert.equal(source(snapshot, daily), snapshot.narrationSegments.slice(2, 4).map(item => item.text).join(' '));
  const balances = chunks.find(chunk => chunk.charIndex === snapshot.narrationSegments[4].start);
  assert.equal(plain(balances.text), 'ما في مستحقات إلنا عند الزباين ولا أرصدة للزباين علينا.');
  assert.equal(source(snapshot, balances), snapshot.narrationSegments.slice(4, 6).map(item => item.text).join(' '));
  assert.equal(speechFor(snapshot, 'فواتير برصيد متبقٍ:', { dialect: 'sy' }), 'ما في فواتير عليها رصيد ولا فواتير متأخرة بالدفع.');
  assert.equal(speechFor(snapshot, 'أرصدة الصناديق المسجلة:', { dialect: 'sy' }), 'الصناديق ما فيها حركة مسجلة.');
  assert.equal(speechFor(snapshot, 'مبيعات اليوم:', { dialect: 'sy' }), 'مبيعات اليوم: ألف وميتين وخمسين دولار أمريكي وخمس سنتات.');
  assert(!chunks.some(chunk => /^(بانتظار التسليم:|العملاء:|المنتجات:)/.test(source(snapshot, chunk))));
});

test('fully active Syrian reports retain every nonzero amount, count and original boundary', () => {
  const snapshot = fixture(s => {
    Object.assign(s.daily, { salesUSD: 1250.05, collectionsUSD: 250.01, refundsUSD: 5.25, invoiceCount: 3, paymentCount: 2 });
    Object.assign(s.balances, { receivables: 1020.05, customerCredits: 12.25 });
    Object.assign(s.counts, { invoices: 4, unpaid: 2, overdue: 1, pendingDelivery: 3, clients: 5, products: 12 });
    [0.01, -21.05, 2000, 125000.50].forEach((balance, index) => Object.assign(s.cashboxes[index], { balance, entries: 1 }));
  });
  const before = JSON.stringify(snapshot), formal = prepare(snapshot), syrian = prepare(snapshot, { dialect: 'sy' });
  const spans = chunks => chunks.map(({ charIndex, charLength }) => ({ charIndex, charLength }));
  assert.deepEqual(spans(syrian), spans(formal));
  assert.equal(JSON.stringify(snapshot), before);
  assert(!syrian.some(chunk => plain(chunk.text).includes('ما في')));
  assert.deepEqual(prepare(snapshot, {}), formal);
  assert.deepEqual(prepare(snapshot, { dialect: 'unknown' }), formal);
});

test('daily summaries never cross an intervening nonzero amount and keep refunds and negative balances exact', () => {
  const snapshot = fixture(s => {
    s.daily.collectionsUSD = 2.01;
    s.daily.paymentCount = 1;
    s.balances.receivables = -1250.05;
    s.cashboxes[1].balance = 0.01;
    s.cashboxes[1].entries = 1;
    s.counts.pendingDelivery = 2;
  });
  const options = { dialect: 'sy' }, chunks = prepare(snapshot, options);
  assert.equal(speechFor(snapshot, 'مبيعات اليوم:', options), 'اليوم ما في مبيعات مسجلة.');
  assert.equal(speechFor(snapshot, 'دفعات اليوم:', options), 'الدفعات اليوم: دولارين أمريكيين وسنت واحد.');
  assert.equal(speechFor(snapshot, 'مستحق لنا على العملاء:', options), 'المبالغ اللي إلنا عند الزباين: سالب ألف وميتين وخمسين دولار أمريكي وخمس سنتات.');
  assert.equal(speechFor(snapshot, 'بانتظار التسليم:', options), 'الفواتير اللي بعدا ناطرة التسليم: تنين.');
  const cash = snapshot.narrationSegments[9], cashChunks = chunks.filter(chunk => chunk.charIndex >= cash.start && chunk.charIndex < cash.end);
  assert.deepEqual(cashChunks.map(chunk => plain(chunk.text)), ['هي أرصدة الصناديق المسجلة.', 'قرش تركي واحد.']);
  const refunded = fixture(s => { s.daily.refundsUSD = 3.02; s.daily.paymentCount = 1; });
  assert.equal(speechFor(refunded, 'مبالغ معادة اليوم:', options), 'المبالغ اللي رجعناها اليوم: تلات دولارات أمريكية وسنتين.');
});

test('net-zero sales and cash balances with real records are never described as absent activity', () => {
  const date = '2026-11-19', state = empty();
  state.companies = [{ id: 'client' }];
  state.invoices = [
    { id: 'sale', companyId: 'client', date, grandTotal: 100, currency: 'USD', items: [] },
    { id: 'return', companyId: 'client', date, grandTotal: -100, currency: 'USD', items: [] }
  ];
  state.cashEntries = [
    { id: 'cashbox-entry/in', date, type: 'movement', legs: [{ currency: 'USD', units: 1000 }] },
    { id: 'cashbox-entry/out', date, type: 'movement', legs: [{ currency: 'USD', units: -1000 }] }
  ];
  const snapshot = localize(build(state, { date }), 'ar');
  assert.equal(snapshot.daily.salesUSD, 0);
  assert.equal(snapshot.daily.invoiceCount, 2);
  assert.equal(snapshot.cashboxes[0].balance, 0);
  assert.equal(snapshot.cashboxes[0].entries, 2);
  const options = { dialect: 'sy' }, text = prepare(snapshot, options).map(chunk => plain(chunk.text)).join(' ');
  assert.match(text, /صافي المبيعات صفر/);
  assert(!/ما في مبيعات|ما في حركة مالية|الصناديق ما فيها حركة/.test(text));
  assert.equal(speechFor(snapshot, 'أرصدة الصناديق المسجلة:', options), 'أرصدة الصناديق المسجلة كلها صفر, مع وجود حركة مسجلة.');
  const zeroReceipt = fixture(s => { s.daily.paymentCount = 1; });
  const zeroReceiptSpeech = prepare(zeroReceipt, options).map(chunk => plain(chunk.text)).join(' ');
  assert.match(zeroReceiptSpeech, /مجموع الدفعات ومجموع المبالغ المعادة صفر/);
  assert(!/ولا دفعات|ما في دفعات|ما في حركة مالية/.test(zeroReceiptSpeech));
});

test('tiny nonzero values retain their sign and are not hidden inside empty-category summaries', () => {
  for (const value of [0.004, -0.004, 0.01, -0.01]) {
    const snapshot = fixture(s => {
      s.daily.salesUSD = value;
      s.balances.customerCredits = value;
      s.cashboxes[0].balance = value;
    });
    const options = { dialect: 'sy' }, chunks = prepare(snapshot, options);
    const sales = speechFor(snapshot, 'مبيعات اليوم:', options);
    assert(sales.startsWith('مبيعات اليوم:'), String(value));
    assert(speechFor(snapshot, 'أرصدة لصالح العملاء:', options).startsWith('الأرصدة اللي للزباين عندنا:'));
    assert(!chunks.some(chunk => /مَا فِي حَرَكَة مَالِيَّة/.test(chunk.text)));
    if (Math.abs(value) < 0.005) {
      assert.match(sales, /بعد التقريب/);
      assert.match(sales, value < 0 ? /صغيرة وسالبة/ : /صغيرة وموجبة/);
    } else assert.equal(sales, 'مبيعات اليوم: ' + plain(moneyWords(value, 'USD', options)) + '.');
    const cash = snapshot.narrationSegments[9];
    assert(chunks.some(chunk => chunk.charIndex === cash.start + 'أرصدة الصناديق المسجلة: '.length));
  }
});

test('compacted Syrian speech validates every omitted source and count before returning any narration', () => {
  const options = { dialect: 'sy' };
  for (const index of [3, 5, 6, 7, 8, 9, 10, 11]) {
    const snapshot = fixture();
    snapshot.narrationSegments[index].end--;
    rejects(snapshot, 'offset-mismatch', options);
  }
  const changedZero = fixture(); changedZero.balances.customerCredits = 25;
  rejects(changedZero, 'source-mismatch', options);
  const hiddenText = fixture(); hiddenText.narration = hiddenText.narration.replace('المنتجات:', 'المشتريات:');
  rejects(hiddenText, 'source-mismatch', options);
  for (const value of [-1, NaN, '0', 1.5, undefined]) rejects(fixture(s => { s.daily.invoiceCount = value; }), 'invalid-count', options);
  rejects(fixture(s => { s.cashboxes[3].salesComplete = false; }), 'incomplete-cashbox', options);
  rejects(fixture(s => { s.cashboxes[3].balance = NaN; }), 'invalid-money', options);
});

test('compacted, skipped and long Syrian clauses retain ordered exact ranges accepted by the audio player', () => {
  const { speechChunks } = require('../offline-voice.js');
  const snapshots = [fixture(), fixture(s => { s.counts.clients = 3; s.counts.products = 2; }), fixture(s => {
    s.daily.salesUSD = 87654321987654.25;
    s.counts.clients = Number.MAX_SAFE_INTEGER;
    s.balances.receivables = 0.004;
    s.cashboxes[1].balance = -21.05;
    s.cashboxes[1].entries = 1;
    s.daily.excludedUndatedDeposits = 1;
  })];
  for (const snapshot of snapshots) {
    const before = JSON.stringify(snapshot), chunks = prepare(snapshot, { dialect: 'sy' });
    assert.deepEqual(speechChunks(snapshot.narration, chunks), chunks);
    for (const chunk of chunks) {
      assert(chunk.text.length <= 220);
      assert(source(snapshot, chunk).trim());
      assert(snapshot.narrationSegments.some(segment => chunk.charIndex >= segment.start && chunk.charIndex < segment.end));
      assert(snapshot.narrationSegments.some(segment => chunk.charIndex + chunk.charLength > segment.start && chunk.charIndex + chunk.charLength <= segment.end));
      assert(!/[0-9٠-٩۰-۹]|USD|TRY|EUR|SYP|[،؛؟]/.test(chunk.text));
    }
    assert.equal(JSON.stringify(snapshot), before);
  }
});
