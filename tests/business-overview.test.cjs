const test = require('node:test');
const assert = require('node:assert/strict');
const { build, localize } = require('../business-overview.js');

const date = '2026-11-19';
const invoice = { id: 'i', companyId: 'c', grandTotal: 100, depositUSD: 20, date,
  createdAt: date + 'T10:00:00Z', currency: 'USD', items: [] };
const payment = { id: 'p', invoiceId: 'i', amount: 30, amountBasis: 'USD',
  currency: 'USD', receiptType: 'cash', date };
const empty = () => ({ companies: [], products: [], invoices: [], payments: [], cashEntries: [] });
const fixture = changes => ({ companies: [{ id: 'c' }], products: [{ id: 'pr' }],
  invoices: [{ ...invoice, payments: [payment] }], payments: [payment], cashEntries: [], ...changes });

test('deduplicates receipt snapshots, reconciles deposits and never treats invoice value as cash', () => {
  const input = fixture(), before = JSON.stringify(input);
  const result = build(input, { date });
  assert.equal(result.balances.receivables, 50);
  assert.equal(result.totals.collectionsUSD, 50);
  assert.equal(result.daily.collectionsUSD, 30);
  assert.equal(result.daily.excludedUndatedDeposits, 1);
  assert.equal(result.cashboxes.find(row => row.currency === 'USD').balance, 30);
  assert.equal(JSON.stringify(input), before);
});

test('positive client debt and credits owed to a different client are not offset', () => {
  const result = build(fixture({ companies: [{ id: 'c' }, { id: 'd' }],
    invoices: [{ ...invoice, payments: [payment] }, { ...invoice, id: 'j', companyId: 'd', depositUSD: 0, grandTotal: 50 }],
    payments: [payment, { id: 'q', invoiceId: 'j', amount: 100, currency: 'USD', date }] }), { date });
  assert.deepEqual(result.balances, { receivables: 50, customerCredits: 50, net: 0 });
});

test('historical payment FX and native invoice amounts use their own recorded rates', () => {
  const result = build(fixture({
    invoices: [{ ...invoice, grandTotal: 10, depositUSD: 0, currency: 'TRY', usdTry: 40 }],
    payments: [{ ...payment, amount: 400, amountBasis: undefined, currency: 'TRY', usdTry: 40 }]
  }), { date });
  assert.equal(result.complete, true);
  assert.equal(result.balances.receivables, 0);
  const row = result.cashboxes.find(item => item.currency === 'TRY');
  assert.equal(row.sales, 400);
  assert.equal(row.balance, 400);
});

test('missing and estimated historical FX both prevent confirmed narration', () => {
  for (const rate of [undefined, 40]) {
    const result = build(fixture({
      invoices: [{ ...invoice, grandTotal: 10, depositUSD: 0, currency: 'TRY', usdTry: rate }],
      payments: [{ ...payment, amount: 400, amountBasis: undefined, currency: 'TRY' }]
    }), { date });
    assert.equal(result.complete, false);
    assert.equal(localize(result, 'ar').narration, '');
    assert.ok(localize(result, 'ar').unavailableReason);
  }
});

test('cash transfers affect both native balances without adding collections or sales', () => {
  const cashEntries = [
    { id: 'cashbox-entry/open', type: 'opening', date, legs: [{ currency: 'USD', units: 10000 }] },
    { id: 'cashbox-entry/in', type: 'receipt', date, legs: [{ currency: 'USD', units: 1000 }] },
    { id: 'cashbox-entry/out', type: 'expense', date, legs: [{ currency: 'USD', units: -2000 }] },
    { id: 'cashbox-entry/transfer', type: 'transfer', date, legs: [{ currency: 'USD', units: -5000 }, { currency: 'TRY', units: 200000 }] }
  ];
  const result = build(fixture({ cashEntries }), { date });
  assert.equal(result.cashboxes.find(row => row.currency === 'USD').balance, 70);
  assert.equal(result.cashboxes.find(row => row.currency === 'TRY').balance, 2000);
  assert.equal(result.totals.collectionsUSD, 50);
  assert.equal(result.totals.salesUSD, 100);
});

test('an explicitly recorded deposit is counted once and belongs to its recorded day', () => {
  const deposit = { ...payment, id: 'deposit', amount: 20, isDeposit: true };
  const result = build(fixture({ invoices: [{ ...invoice, payments: [deposit, payment] }],
    payments: [deposit, payment] }), { date });
  assert.equal(result.balances.receivables, 50);
  assert.equal(result.totals.collectionsUSD, 50);
  assert.equal(result.daily.collectionsUSD, 50);
  assert.equal(result.daily.excludedUndatedDeposits, 0);
});

test('credit notes and refunds retain their signed accounting direction', () => {
  const result = build(fixture({ invoices: [{ ...invoice, depositUSD: 0, grandTotal: -20 }],
    payments: [{ ...payment, amount: -5 }] }), { date });
  assert.equal(result.totals.salesUSD, -20);
  assert.equal(result.totals.refundsUSD, 5);
  assert.equal(result.balances.customerCredits, 15);
  assert.equal(result.cashboxes.find(row => row.currency === 'USD').balance, -5);
});

test('excludes future and cancelled invoices and never invents a payment due date from delivery', () => {
  const result = build(fixture({ invoices: [
    { ...invoice, depositUSD: 0, deliveryDate: '2026-11-01' },
    { ...invoice, id: 'future', date: '2026-11-20', createdAt: '2026-11-20T00:00:00Z' },
    { ...invoice, id: 'cancelled', status: 'cancelled' }
  ], payments: [] }), { date });
  assert.equal(result.totals.salesUSD, 100);
  assert.equal(result.counts.invoices, 1);
  assert.equal(result.counts.overdue, 0);
  assert.equal(result.counts.pendingDelivery, 1);
});

test('on-account payments reduce only the named client account', () => {
  const result = build(fixture({ payments: [payment,
    { id: 'advance', companyId: 'c', amount: 60, currency: 'USD', date }] }), { date });
  assert.equal(result.balances.customerCredits, 10);
  assert.equal(result.balances.receivables, 0);
});

test('empty states report real zero totals in all five languages without claiming supplier balances', () => {
  const result = build(empty(), { date });
  assert.equal(result.reportComplete, true);
  for (const locale of ['ar', 'tr', 'en', 'fr', 'ru']) {
    const report = localize(result, locale);
    assert.equal(report.locale, locale);
    assert.ok(report.narration.length > 50);
    assert.equal(report.unavailableReason, undefined);
  }
  assert.equal(result.capabilities.supplierPayables, false);
});

test('orphaned payments and undated invoices are not presented as confirmed totals', () => {
  for (const change of [{ payments: [{ ...payment, invoiceId: 'missing' }] },
    { invoices: [{ ...invoice, date: '', createdAt: '' }] }]) {
    const result = build(fixture(change), { date });
    assert.equal(result.reportComplete, false);
    assert.equal(localize(result, 'en').narration, '');
  }
  const undated = build(fixture({ invoices: [{ ...invoice, date: '', createdAt: '' }] }), { date });
  assert.equal(undated.cashboxes.find(row => row.currency === 'USD').salesComplete, false);
});

test('duplicate invoices and conflicting copies of a payment require review and are not double-counted', () => {
  const result = build(fixture({ invoices: [invoice, { ...invoice }, { ...invoice, id: 'j', payments: [{ ...payment, amount: 99 }] }] }), { date });
  assert.equal(result.counts.invoices, 2);
  assert.equal(result.totals.collectionsUSD, 70);
  assert.equal(result.reportComplete, false);
  assert.equal(localize(result).narration, '');
});
