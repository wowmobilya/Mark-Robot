/* Invoice archive transitions use the stored invoice as their only source of sale data. */
(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./account-statement-core.js'));
  } else {
    root.WFInvoiceArchiveCore = factory(root.WOWStatementCore);
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (statement) {
  'use strict';
  const own = (record, key) => Object.prototype.hasOwnProperty.call(record || {}, key);

  function clone(value) {
    if (typeof structuredClone === 'function') return structuredClone(value);
    if (value == null || typeof value !== 'object') return value;
    if (value instanceof Date) return new Date(value);
    if (Array.isArray(value)) return value.map(clone);
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, clone(entry)]));
  }

  function capture(invoice, {issuerLogo = null, capturedAt, captureCosts, archiving = false} = {}) {
    if (!invoice || typeof invoice !== 'object') throw Error('MISSING_INVOICE');
    const snapshot = clone(invoice);
    const saved = captureCosts ? captureCosts(snapshot, capturedAt) : snapshot;
    if (!own(saved, 'packageLabelSnapshot')) {
      saved.packageLabelSnapshot = {
        version:1,
        companyLogo:own(invoice, 'issuerLogo') ? invoice.issuerLogo : issuerLogo,
        customerLogo:own(invoice, 'companyLogo') ? invoice.companyLogo : invoice.logoDataUrl ?? null,
        capturedAt
      };
    }
    if (archiving && !saved.archiveCostCapturedAt && Array.isArray(saved.items) && saved.items.some((line, index) =>
      line?.costSnapshot != null && !own(invoice.items?.[index], 'costSnapshot'))) {
      saved.archiveCostCapturedAt = capturedAt;
    }
    return saved;
  }

  function mergeTransition(stored, intent, {captureCosts} = {}) {
    if (!stored || stored.id == null || stored.id !== intent.id) throw Error('MISSING_INVOICE');
    if (intent.action === 'restore') {
      return stored.archived ? {...stored, archived:false, archivedAt:null} : stored;
    }
    if (intent.action !== 'archive') throw Error('INVALID_ACTION');
    if (stored.archived) return stored;
    if (!statement.day(intent.capturedAt)) throw Error('INVALID_DATE');
    const next = capture(stored, {...intent, captureCosts, archiving:true});
    return {...next, archived:true, archivedAt:intent.capturedAt};
  }

  async function commitTransition(intent, {writeBatch, hydrate, apply, captureCosts}) {
    // wfWriteBatch deduplicates image data in value before opening its read/write transaction.
    // merge receives the latest stored row and the prepared logo (possibly a media reference).
    const [committed] = await writeBatch([{
      store:'invoices', type:'merge', id:intent.id, value:intent,
      merge:(stored, prepared) => mergeTransition(stored, prepared, {captureCosts})
    }]);
    const invoice = await hydrate(committed);
    apply(invoice);
    return invoice;
  }

  function finite(value) {
    if (typeof value !== 'number' && (typeof value !== 'string' || !value.trim())) return null;
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  }

  function usdCents(invoice) {
    const usd = finite(invoice?.grandTotal ?? invoice?.grandTotalUSD);
    return usd === null ? null : statement.cents(usd);
  }

  function amounts(invoice) {
    const cents = usdCents(invoice);
    const usd = cents === null ? null : cents / 100;
    let currency = String(invoice?.currency || 'USD').trim().toUpperCase();
    if (currency === 'TL') currency = 'TRY';
    if (currency === 'USD' || usd === null) return {usd, currency, native:usd};
    const key = {TRY:'usdTry', EUR:'usdEur', SYP:'usdSyp'}[currency];
    const rate = key ? finite(invoice[key] ?? invoice.rates?.[key] ?? invoice.exchangeRates?.[key]) : null;
    const nativeCents = rate > 0 ? statement.cents(usd * rate) : null;
    return {usd, currency, native:nativeCents === null ? null : nativeCents / 100};
  }

  function totals(rows) {
    let cents = 0;
    for (const row of rows) {
      const amount = usdCents(row);
      if (amount === null || !Number.isSafeInteger(cents + amount)) return {count:rows.length, usd:null};
      cents += amount;
    }
    return {count:rows.length, usd:cents / 100};
  }

  function normalize(value) {
    return String(value ?? '').normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase()
      .replace(/[٠-٩]/g, digit => String(digit.charCodeAt(0) - 1632))
      .replace(/[۰-۹]/g, digit => String(digit.charCodeAt(0) - 1776)).trim();
  }

  function archiveDay(row) {
    return statement.day(row?.archivedAt);
  }

  function filter(rows, {query, year, month, sort = 'newest'} = {}) {
    const search = normalize(query);
    const result = [];
    for (const row of rows || []) {
      if (!row?.archived) continue;
      if (search && ![row.invNo, row.companyName, row.buyerName].some(field => normalize(field).includes(search))) continue;
      const day = archiveDay(row);
      if (year && day?.slice(0, 4) !== String(year)) continue;
      if (month && day?.slice(5, 7) !== String(month).padStart(2, '0')) continue;
      const timestamp = day && (String(row.archivedAt).includes('T') ? Date.parse(row.archivedAt) : Date.parse(day));
      result.push({row, time:Number.isFinite(timestamp) ? timestamp : null});
    }
    result.sort((a, b) => {
      if (a.time === null || b.time === null) return Number(a.time === null) - Number(b.time === null);
      return sort === 'oldest' ? a.time - b.time : b.time - a.time;
    });
    return result.map(entry => entry.row);
  }

  return {clone, capture, mergeTransition, commitTransition, amounts, totals, archiveDay, filter};
});
