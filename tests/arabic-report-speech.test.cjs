const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const vm = require('node:vm');
const { build, localize } = require('../business-overview.js');
const { prepare } = require('../arabic-report-speech.js');

const empty = () => ({ companies: [], products: [], invoices: [], payments: [], cashEntries: [] });
function fixture(change = () => {}, date = '2026-11-19') {
  const snapshot = build(empty(), { date });
  change(snapshot);
  return localize(snapshot, 'ar');
}
const plain = value => value.replace(/[\u064b-\u065f\u0670]/g, '');
const source = (snapshot, chunk) => snapshot.narration.slice(chunk.charIndex, chunk.charIndex + chunk.charLength);
const speechFor = (snapshot, prefix) => prepare(snapshot).filter(chunk => source(snapshot, chunk).startsWith(prefix)).map(chunk => plain(chunk.text)).join(' ');
const rejects = (snapshot, reason) => assert.throws(() => prepare(snapshot), error => error.code === 'unsupported-report' && error.reason === reason);

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
  assert.equal(speechFor(snapshot, 'مبيعات اليوم:'), 'مبيعات اليوم: مائة فاصلة صفر خمسة دولار أمريكي.');
  assert.equal(speechFor(snapshot, 'دفعات اليوم:'), 'دفعات اليوم: ثلاثون فاصلة صفر واحد دولار أمريكي.');
  assert.equal(speechFor(snapshot, 'مستحق لنا على العملاء:'), 'مستحق لنا على العملاء: خمسون فاصلة صفر أربعة دولار أمريكي.');
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

test('decimal speech uses the exact displayed rounding, two digits, sign and negative zero', () => {
  const examples = [
    [0, 'صفر فاصلة صفر صفر'],
    [0.05, 'صفر فاصلة صفر خمسة'],
    [0.5, 'صفر فاصلة خمسة صفر'],
    [1.005, 'واحد فاصلة صفر واحد'],
    [9.999, 'عشرة فاصلة صفر صفر'],
    [1250.05, 'ألف ومائتان وخمسون فاصلة صفر خمسة'],
    [-1250.05, 'سالب ألف ومائتان وخمسون فاصلة صفر خمسة'],
    [-0, 'سالب صفر فاصلة صفر صفر']
  ];
  for (const [value, expected] of examples) {
    const snapshot = fixture(s => { s.daily.salesUSD = value; });
    assert.equal(speechFor(snapshot, 'مبيعات اليوم:'), 'مبيعات اليوم: ' + expected + ' دولار أمريكي.', String(value));
  }
});

test('all four native cash currencies retain their own amount, unit and original range', () => {
  const snapshot = fixture(s => {
    [1250.05, -202.02, 0.01, 1000000.99].forEach((value, index) => { s.cashboxes[index].balance = value; });
  });
  const cash = snapshot.narrationSegments[9];
  const chunks = prepare(snapshot).filter(chunk => chunk.charIndex > cash.start && chunk.charIndex < cash.end);
  assert.deepEqual(chunks.map(chunk => plain(chunk.text)), [
    'ألف ومائتان وخمسون فاصلة صفر خمسة دولار أمريكي.',
    'سالب مائتان واثنان فاصلة صفر اثنان ليرة تركية.',
    'صفر فاصلة صفر واحد يورو.',
    'مليون فاصلة تسعة تسعة ليرة سورية.'
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
  assert(spoken.endsWith('فاصلة اثنان خمسة دولار أمريكي.'));
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

test('browser loading exposes only the pure API and needs neither DOM nor network', () => {
  const context = { window: {}, Intl, Date, BigInt, Object, Number, String, Error };
  vm.runInNewContext(readFileSync(require.resolve('../arabic-report-speech.js'), 'utf8'), context);
  assert.equal(typeof context.window.WFArabicReportSpeech.prepare, 'function');
  const snapshot = fixture(), before = JSON.stringify(snapshot);
  const chunks = context.window.WFArabicReportSpeech.prepare(snapshot);
  assert(chunks.length > 10);
  assert.equal(JSON.stringify(snapshot), before);
  assert.deepEqual(Object.keys(context.window), ['WFArabicReportSpeech']);
});
