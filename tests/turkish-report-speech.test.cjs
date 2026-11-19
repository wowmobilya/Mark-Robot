const test = require('node:test');
const assert = require('node:assert/strict');
const { existsSync, readFileSync } = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { build, localize } = require('../business-overview.js');

const modulePath = path.resolve(__dirname, '../turkish-report-speech.js');
const speech = existsSync(modulePath) ? require(modulePath) : null;
const api = () => {
  assert(speech, 'The Turkish speech module must be implemented');
  return speech;
};
const prepare = snapshot => api().prepare(snapshot);
const empty = () => ({ companies: [], products: [], invoices: [], payments: [], cashEntries: [] });
function fixture(change = () => {}, date = '2026-11-19') {
  const snapshot = build(empty(), { date });
  change(snapshot);
  return localize(snapshot, 'tr');
}
const source = (snapshot, chunk) => snapshot.narration.slice(chunk.charIndex, chunk.charIndex + chunk.charLength);
const speechFor = (snapshot, prefix) => prepare(snapshot).filter(chunk => source(snapshot, chunk).startsWith(prefix)).map(chunk => chunk.text).join(' ');
const rejects = (snapshot, reason) => assert.throws(() => prepare(snapshot), error => error.code === 'unsupported-report' && error.reason === reason);

test('committed Turkish report amounts are spoken as money without changing balances or source text', () => {
  const date = '2026-11-19', state = empty();
  state.companies = [{ id: 'client' }];
  state.products = [{ id: 'sofa' }];
  state.invoices = [{ id: 'invoice', companyId: 'client', date, grandTotal: 100.05, depositUSD: 20, currency: 'USD', items: [] }];
  state.payments = [{ id: 'receipt', invoiceId: 'invoice', date, amount: 30.01, amountBasis: 'USD', currency: 'USD', receiptType: 'cash' }];
  const snapshot = localize(build(state, { date }), 'tr');
  const before = JSON.stringify(snapshot), chunks = prepare(snapshot);
  assert.equal(JSON.stringify(snapshot), before);
  assert.equal(speechFor(snapshot, 'Bugünkü satışlar:'), 'Bugünkü satışlar: yüz dolar beş sent.');
  assert.equal(speechFor(snapshot, 'Bugünkü ödemeler:'), 'Bugünkü ödemeler: otuz dolar bir sent.');
  assert.equal(speechFor(snapshot, 'Müşterilerden alacaklar:'), 'Müşterilerden alacaklar: elli dolar dört sent.');
  assert(chunks.some(chunk => source(snapshot, chunk).startsWith('Günlük ödemeler açık tarihlere dayanır;')));
  assert(!chunks.some(chunk => source(snapshot, chunk).startsWith('Bu tarihe kadar kayıtlı işlem yok.')));
  assert(chunks.every(chunk => !/[0-9٠-٩۰-۹]|USD|TRY|EUR|SYP|[،؛؟]/.test(chunk.text)));
});

test('all playback spans refer to exact committed clauses and include every cashbox', () => {
  const snapshot = fixture(), chunks = prepare(snapshot);
  let previous = -1;
  for (const chunk of chunks) {
    assert(Number.isSafeInteger(chunk.charIndex) && Number.isSafeInteger(chunk.charLength));
    assert(chunk.charIndex >= previous);
    assert(chunk.charLength > 0 && chunk.charIndex + chunk.charLength <= snapshot.narration.length);
    assert(snapshot.narrationSegments.some(segment => chunk.charIndex >= segment.start && chunk.charIndex + chunk.charLength <= segment.end));
    assert(source(snapshot, chunk).trim());
    assert(chunk.text.length <= 220);
    previous = chunk.charIndex;
  }
  assert.equal(source(snapshot, chunks[0]), 'Günlük işletme raporu.');
  assert.equal(source(snapshot, chunks[1]), 'Rapor tarihi: 19 Kasım 2026.');
  for (const clause of ['Bakiyesi olan faturalar: 0.', 'Vadesi geçen faturalar: 0.', 'Müşteriler: 0.', 'Ürünler: 0.']) {
    assert(chunks.some(chunk => source(snapshot, chunk) === clause));
  }
  const cash = snapshot.narrationSegments[9];
  const cashChunks = chunks.filter(chunk => chunk.charIndex >= cash.start && chunk.charIndex < cash.end);
  assert.equal(cashChunks.length, 5);
  assert.equal(cashChunks.map(chunk => source(snapshot, chunk)).join(' '), cash.text);
  assert(chunks.some(chunk => source(snapshot, chunk) === 'Bu tarihe kadar kayıtlı işlem yok.'));
});

test('money uses displayed rounding and minor units while omitting zero decimals and negative zero', () => {
  const cases = [
    [0, 'sıfır dolar'], [-0, 'sıfır dolar'], [-0.001, 'sıfır dolar'],
    [0.05, 'sıfır dolar beş sent'], [0.5, 'sıfır dolar elli sent'],
    [1.005, 'bir dolar bir sent'], [9.999, 'on dolar'],
    [1250.05, 'bin iki yüz elli dolar beş sent'],
    [-1250.05, 'eksi bin iki yüz elli dolar beş sent'],
    [-0.005, 'eksi sıfır dolar bir sent'], [1000000, 'bir milyon dolar']
  ];
  for (const [value, expected] of cases) {
    assert.equal(api().moneyWords(value, 'USD'), expected, String(value));
    const snapshot = fixture(s => { s.daily.salesUSD = value; });
    assert.equal(speechFor(snapshot, 'Bugünkü satışlar:'), 'Bugünkü satışlar: ' + expected + '.');
  }
});

test('native currencies preserve their own values and fractional units in original source ranges', () => {
  const snapshot = fixture(s => {
    [1250.05, -202.02, 0.01, 1000000.99].forEach((value, index) => { s.cashboxes[index].balance = value; });
  });
  const cash = snapshot.narrationSegments[9];
  const chunks = prepare(snapshot).filter(chunk => chunk.charIndex > cash.start && chunk.charIndex < cash.end);
  assert.deepEqual(chunks.map(chunk => chunk.text), [
    'bin iki yüz elli dolar beş sent.',
    'eksi iki yüz iki Türk lirası iki kuruş.',
    'sıfır avro bir sent.',
    'bir milyon Suriye lirası doksan dokuz kuruş.'
  ]);
  assert.equal(chunks.map(chunk => source(snapshot, chunk)).join(' '), cash.text.slice('Kayıtlı kasa bakiyeleri: '.length));
});

test('known currency minor units keep their actual scale instead of assuming every currency has cents', () => {
  const cases = [
    ['GBP', 3.25, 'üç İngiliz sterlini yirmi beş peni'],
    ['SAR', 1.25, 'bir Suudi riyali yirmi beş helale'],
    ['AED', 1.25, 'bir Birleşik Arap Emirlikleri dirhemi yirmi beş fils'],
    ['QAR', 1.25, 'bir Katar riyali yirmi beş dirhem'],
    ['JOD', 1.25, 'bir Ürdün dinarı iki yüz elli fils'],
    ['KWD', 1.01, 'bir Kuveyt dinarı on fils'],
    ['BHD', 2.05, 'iki Bahreyn dinarı elli fils'],
    ['OMR', 2.05, 'iki Umman riyali elli baisa'],
    ['IQD', 2.05, 'iki Irak dinarı elli fils'],
    ['EGP', 1.25, 'bir Mısır lirası yirmi beş kuruş'],
    ['LBP', 1.25, 'bir Lübnan lirası yirmi beş kuruş'],
    ['CHF', 1.25, 'bir İsviçre frangı yirmi beş santim'],
    ['CAD', 1.25, 'bir Kanada doları yirmi beş sent'],
    ['AUD', 1.25, 'bir Avustralya doları yirmi beş sent'],
    ['RUB', 1.25, 'bir Rus rublesi yirmi beş kopek'],
    ['CNY', 1.25, 'bir Çin yuanı yirmi beş fen'],
    ['JPY', 1, 'bir Japon yeni'],
    ['JPY', 1.05, 'bir virgül sıfır beş Japon yeni'],
    ['JPY', 1.5, 'bir virgül beş Japon yeni']
  ];
  for (const [currency, value, expected] of cases) {
    assert.equal(api().moneyWords(value, currency), expected, currency);
    const snapshot = fixture(s => { s.cashboxes[0].currency = currency; s.cashboxes[0].balance = value; });
    assert(prepare(snapshot).some(chunk => chunk.text === expected + '.'), currency);
  }
  assert.equal(api().moneyWords(3, 'not-a-code'), 'üç dolar');
  assert.throws(() => api().moneyWords(3, 'XYZ'), error => error.reason === 'unsupported-currency');
  assert(Object.isFrozen(api().currencies));
  assert(api().currencies.includes('USD') && api().currencies.includes('TRY') && api().currencies.includes('EUR') && api().currencies.includes('SYP'));
});

test('stored dates use the exact Gregorian day and Turkish month without substituting the current date', () => {
  const cases = [
    ['2024-02-29', 'yirmi dokuz Şubat iki bin yirmi dört'],
    ['2000-01-01', 'bir Ocak iki bin'],
    ['2026-08-11', 'on bir Ağustos iki bin yirmi altı'],
    ['2026-11-21', 'yirmi bir Kasım iki bin yirmi altı'],
    ['2026-12-31', 'otuz bir Aralık iki bin yirmi altı']
  ];
  for (const [date, expected] of cases) assert.equal(speechFor(fixture(() => {}, date), 'Rapor tarihi:'), 'Rapor tarihi: ' + expected + '.');
});

test('Turkish counts preserve hundred, thousand and larger place values', () => {
  const cases = [
    [0, 'sıfır'], [2, 'iki'], [12, 'on iki'], [21, 'yirmi bir'], [99, 'doksan dokuz'],
    [100, 'yüz'], [200, 'iki yüz'], [1000, 'bin'], [1001, 'bin bir'],
    [5225, 'beş bin iki yüz yirmi beş'], [102000, 'yüz iki bin'], [201000, 'iki yüz bir bin'],
    [1000000, 'bir milyon'], [3000000, 'üç milyon'], [2000000000, 'iki milyar'],
    [1000000000000, 'bir trilyon'],
    [Number.MAX_SAFE_INTEGER, 'dokuz katrilyon yedi trilyon yüz doksan dokuz milyar iki yüz elli dört milyon yedi yüz kırk bin dokuz yüz doksan bir']
  ];
  for (const [value, expected] of cases) {
    const snapshot = fixture(s => { s.counts.clients = value; });
    assert.equal(speechFor(snapshot, 'Müşteriler:'), 'Müşteriler: ' + expected + '.', String(value));
  }
});

test('large safe displayed amounts retain all words within the playback chunk bound', () => {
  const snapshot = fixture(s => { s.daily.salesUSD = 87654321987654.25; s.counts.clients = Number.MAX_SAFE_INTEGER; });
  assert.equal(speechFor(snapshot, 'Bugünkü satışlar:'), 'Bugünkü satışlar: seksen yedi trilyon altı yüz elli dört milyar üç yüz yirmi bir milyon dokuz yüz seksen yedi bin altı yüz elli dört dolar yirmi beş sent.');
  for (const chunk of prepare(snapshot)) {
    assert(chunk.text.length <= 220);
    assert(source(snapshot, chunk).trim());
  }
});

test('changed source text, financial values, segment text or offsets fail closed', () => {
  const mutations = [
    ['source-mismatch', s => { s.narration = s.narration.replace('Bugünkü satışlar', 'Diğer satışlar'); }],
    ['source-mismatch', s => { s.daily.salesUSD = 800; }],
    ['source-mismatch', s => { s.narrationSegments.pop(); }],
    ['offset-mismatch', s => { s.narrationSegments[1].start++; }],
    ['offset-mismatch', s => { s.narrationSegments[1].end--; }],
    ['offset-mismatch', s => { s.narrationSegments[1].text += ' '; }]
  ];
  for (const [reason, mutate] of mutations) {
    const snapshot = fixture(); mutate(snapshot); rejects(snapshot, reason);
  }
});

test('incomplete reports, invalid numbers and impossible dates never yield plausible financial speech', () => {
  for (const value of [NaN, Infinity, -Infinity, '1.00']) {
    rejects(fixture(s => { s.daily.salesUSD = value; }), 'invalid-money');
    assert.throws(() => api().moneyWords(value), error => error.reason === 'invalid-money');
  }
  rejects(fixture(s => { s.daily.salesUSD = 90071992547409.92; }), 'unsafe-money');
  for (const value of [-1, 1.5, Number.MAX_SAFE_INTEGER + 1]) rejects(fixture(s => { s.counts.clients = value; }), 'invalid-count');
  for (const field of ['complete', 'reportComplete']) {
    const snapshot = fixture(); snapshot[field] = false; rejects(snapshot, 'incomplete-report');
  }
  for (const field of ['complete', 'salesComplete']) {
    const snapshot = fixture(); snapshot.cashboxes[0][field] = false; rejects(snapshot, 'incomplete-cashbox');
  }
  const negativeEntries = fixture(); negativeEntries.cashboxes[0].entries = -1; rejects(negativeEntries, 'invalid-count');
  for (const locale of ['ar', 'en', 'tr-TR']) {
    const snapshot = fixture(); snapshot.locale = locale; rejects(snapshot, 'incomplete-report');
  }
  for (const value of ['2026-02-30', '2025-02-29', '0000-01-01', '19/11/2026']) {
    const snapshot = fixture(); snapshot.date = value; rejects(snapshot, 'invalid-date');
  }
  const missingSegments = fixture(); delete missingSegments.narrationSegments; rejects(missingSegments, 'invalid-narration');
  const missingDaily = fixture(); delete missingDaily.daily; rejects(missingDaily, 'invalid-snapshot');
  const excessiveText = fixture(); excessiveText.narration = 'a'.repeat(16001); rejects(excessiveText, 'invalid-narration');
});

test('browser loading exposes a frozen pure API and works without DOM or network services', () => {
  assert(existsSync(modulePath), 'The Turkish speech module must be implemented');
  const context = { window: {}, Intl, Date, BigInt, Object, Number, String, Error };
  vm.runInNewContext(readFileSync(modulePath, 'utf8'), context);
  const browser = context.window.WFTurkishReportSpeech;
  assert.equal(typeof browser.prepare, 'function');
  assert.equal(browser.moneyWords(1000000, 'USD'), 'bir milyon dolar');
  assert(Object.isFrozen(browser) && Object.isFrozen(browser.currencies));
  const snapshot = fixture(), before = JSON.stringify(snapshot);
  assert(browser.prepare(snapshot).length > 10);
  assert.equal(JSON.stringify(snapshot), before);
  assert.deepEqual(Object.keys(context.window), ['WFTurkishReportSpeech']);
});
