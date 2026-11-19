const test = require('node:test');
const assert = require('node:assert/strict');
const Annual = require('../annual-sales.js');
const Overview = require('../business-overview.js');
const date = '2026-11-19';
const invoice = (id, day, total, changes = {}) => ({ id, companyId: 'c', regDate: day, grandTotal: total, depositUSD: 0, currency: 'USD', items: [], ...changes });
const state = invoices => ({ companies: [{ id: 'c' }], products: [], invoices, payments: [], settings: {}, cashEntries: [] });

test('a selected calendar year always contains January through December, including explicit zero months', () => {
  const result = Annual.build(state([invoice('i1', '2025-08-01', 100)]), { year: 2025, date });
  assert.equal(result.months.length, 12);
  assert.deepEqual(result.months.map(month => month.key), Array.from({ length: 12 }, (_, i) => '2025-' + String(i + 1).padStart(2, '0')));
  assert.equal(result.months[7].totalUSD, 100);
  assert.equal(result.months[0].totalUSD, 0);
  assert.equal(result.months[11].totalUSD, 0);
  assert.equal(result.months.some(month => month.future), false);
  assert.equal(result.totalUSD, 100);
  assert.equal(result.invoiceCount, 1);
  assert.equal(result.activeMonths, 1);
  assert.equal(result.asOf, '2025-12-31');
});

test('Arabic August uses the same full-name calendar as all twelve months; every locale has twelve distinct labels', () => {
  assert.deepEqual(Annual.labels('ar'), ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر']);
  for (const locale of ['ar', 'en', 'tr', 'fr', 'ru']) {
    const labels = Annual.labels(locale);
    assert.equal(labels.length, 12);
    assert.equal(new Set(labels).size, 12);
    assert(labels.every(label => label.length >= 3 && !/\d/.test(label)));
    labels[7] = 'changed';
    assert.notEqual(Annual.labels(locale)[7], 'changed');
  }
  assert.equal(Annual.labels('tr')[7], 'Ağustos');
  assert.equal(Annual.labels('ru')[7], 'Август');
});

test('signed credits, exclusions and archived invoices match the existing accounting sales basis', () => {
  const data = state([
    invoice('a', '2026-02-01', 100.15),
    invoice('b', '2026-02-03', -20.05),
    invoice('c', '2026-03-01', 30, { archived: true }),
    invoice('d', '2026-03-02', 700, { cancelled: true }),
    invoice('e', '2026-03-03', 800, { deleted: true }),
    invoice('f', '2026-03-04', 900, { status: 'draft' }),
    invoice('g', '2026-03-05', 500, { status: 'void' })
  ]);
  const report = Annual.build(data, { year: 2026, date });
  assert.equal(report.totalUSD, 110.1);
  assert.equal(report.totalUSD, Overview.build(data, { date }).totals.salesUSD);
  assert.equal(report.invoiceCount, 3);
  assert.equal(report.creditNoteCount, 1);
  assert.equal(report.months[1].totalUSD, 80.1);
  assert.equal(report.activeMonths, 2);
  assert.equal(report.complete, true);
});

test('USD accounting values never use current exchange rates or payment/cash amounts', () => {
  const data = state([invoice('try', '2026-01-01', 10, { currency: 'TRY', usdTry: 30 }), invoice('eur', '2026-01-02', 20, { currency: 'EUR', usdEur: .9 })]);
  data.settings.manualUsdTry = 999;
  data.payments = [{ id: 'pay', invoiceId: 'try', amount: 5000, currency: 'USD', date: '2026-01-03' }];
  data.cashEntries = [{ id: 'cashbox-entry/t', type: 'transfer', legs: [{ currency: 'USD', units: 5000000 }] }];
  assert.equal(Annual.build(data, { year: 2026, date }).totalUSD, 30);
});

test('invoice date priority and supported legacy dates match the account-statement calendar', () => {
  const data = state([
    invoice('priority', '2026-01-02', 10, { orderDate: '2026-02-02', createdAt: '2026-03-02T12:00:00Z', date: '2026-04-02' }),
    invoice('order', '', 20, { orderDate: '2026-02-03', createdAt: '2026-03-02T12:00:00Z' }),
    invoice('legacy', '31.08.2026', 30),
    invoice('arabic', '٢٠٢٦-٠٨-٠١', 40)
  ]);
  const report = Annual.build(data, { year: 2026, date });
  assert.equal(report.months[0].totalUSD, 10);
  assert.equal(report.months[1].totalUSD, 20);
  assert.equal(report.months[7].totalUSD, 70);
  assert.equal(Annual.recordDay(data.invoices[0]), '2026-01-02');
});

test('current-year future dates are not counted and future months remain visible as pending', () => {
  const result = Annual.build(state([
    invoice('past', '2026-11-18', 100),
    invoice('tomorrow', '2026-11-20', 200),
    invoice('next-month', '2026-12-05', 300),
    invoice('old', '2025-12-31', 500),
    invoice('future-year', '2027-01-01', 900)
  ]), { year: 2026, date });
  assert.equal(result.totalUSD, 100);
  assert.equal(result.invoiceCount, 1);
  assert.equal(result.months[10].future, false);
  assert.equal(result.months[11].future, true);
  assert.equal(result.months[11].totalUSD, 0);
  assert.deepEqual(result.years, [2027, 2026, 2025]);
  const future = Annual.build(state([invoice('future-year', '2027-01-01', 900)]), { year: 2027, date });
  assert.equal(future.totalUSD, 0);
  assert.equal(future.asOf, null);
  assert(future.months.every(month => month.future));
});

test('duplicate invoice IDs cannot inflate totals and flag affected months for review', () => {
  const result = Annual.build(state([invoice('same', '2026-02-01', 100), invoice('same', '2026-02-02', 900)]), { year: 2026, date });
  assert.equal(result.totalUSD, 100);
  assert.equal(result.invoiceCount, 1);
  assert.equal(result.complete, false);
  assert.equal(result.months[1].complete, false);
  assert(result.warnings.some(warning => warning.code === 'duplicateInvoice'));
});

test('invalid amounts and unassignable dates cannot become confirmed annual totals', () => {
  const amount = Annual.build(state([invoice('bad', '2026-08-01', 'not a number')]), { year: 2026, date });
  assert.equal(amount.complete, false);
  assert.equal(amount.months[7].complete, false);
  assert.equal(amount.invoiceCount, 1);
  const undated = Annual.build(state([invoice('missing', '', 50)]), { year: 2026, date });
  assert.equal(undated.complete, false);
  assert(undated.months.filter(month => !month.future).every(month => !month.complete));
  assert.equal(undated.invoiceCount, 0);
  const ambiguous = Annual.build(state([invoice('ambiguous', '01/02/2026', 50)]), { year: 2026, date });
  assert.equal(ambiguous.complete, false);
});

test('integer-cent aggregation preserves decimal totals and grandfathered grandTotalUSD values', () => {
  const report = Annual.build(state([invoice('a', '2026-01-01', .1), invoice('b', '2026-01-02', .2), invoice('c', '2026-02-01', undefined, { grandTotalUSD: 9.99 })]), { year: 2026, date });
  assert.equal(report.months[0].totalUSD, .3);
  assert.equal(report.totalUSD, 10.29);
});

test('empty state and year discovery are read-only and preserve only valid recorded years plus current year', () => {
  const data = state([invoice('old', '2020-08-01', 10), invoice('cancelled', '2019-08-01', 10, { status: 'cancelled' })]);
  const before = structuredClone(data);
  assert.deepEqual(Annual.years(data, date), [2026, 2020]);
  Annual.build(data, { year: 2020, date });
  assert.deepEqual(data, before);
  const empty = Annual.build(state([]), { year: 2026, date });
  assert.equal(empty.totalUSD, 0);
  assert.equal(empty.complete, true);
  assert.equal(empty.invoiceCount, 0);
  assert.equal(empty.activeMonths, 0);
  assert.throws(() => Annual.build(state([]), { year: 1899, date }), /INVALID_YEAR/);
  assert.throws(() => Annual.build(state([]), { year: 2026.5, date }), /INVALID_YEAR/);
  assert.throws(() => Annual.build(state([]), { year: 2026, date: 'invalid' }), /INVALID_DATE/);
});
