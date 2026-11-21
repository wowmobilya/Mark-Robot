# Release 207 verification — supplier order follow-up

Date: 21 November 2026. Base: deployed release 206, commit `43b6d97a61a0aac49d1bf50bbb85752ddb01747c`.

## Delivered behavior

- Dedicated `purchase-followup` route, sidebar entry, saved-order links and mobile navigation between purchasing and follow-up.
- Confirmed full/partial receipts, expected dates, cancelled unreceived remainders, reopening and receipt reversal with a required reason. Events remain in the audit history.
- Exact product/color/dimension matching and deterministic FIFO allocation from recorded receipts to later confirmed invoice deliveries. Archived duplicates count once. Conflicting copies and uncertain credits are diagnosed and excluded.
- Supplier HTML/CSV documents retain their existing privacy boundary. This feature does not write invoices, stock, catalog prices or accounting records, and does not send anything to suppliers.
- Five languages and RTL, 20-row pages, lazily expanded receipt line details, no background polling and no new runtime dependency.

## Automated verification

The complete repository suite was executed with:

```sh
node --test tests/*.test.cjs tests/*.test.mjs
```

Result at candidate verification: **1,142 passed, zero failed, zero skipped**, approximately 5.39 seconds in this executor. This run includes the final automatic freshness behavior.

Focused coverage includes exact write receipts/idempotency, same-order conflicts, independent concurrent orders, atomic rollback after staged puts, safe integer arithmetic, timestamp ordering, future data, reversal projection, resource ceilings, lost publication retries, dirty/busy update guards and all five locales. The actual `wfWriteBatch` and settings hydration implementations are exercised, not a parallel persistence implementation.

The offline install tests verify that current local scripts/styles exist, match the HTML versions, and do not activate an incomplete update when required assets fail. `index.html` keeps its original CRLF format and the same nine pre-existing bare-LF lines. Whitespace validation accounts for that existing CRLF format.

## Independent review and defects corrected

1. **Mixed-release data loss:** the exact deployed206 writer erased a new top-level receipt ledger through an old tab's second ordinary settings save. The single authoritative ledger now lives at `settings.procurementOrders.followup`, inside a section 206 already protects. The regression fixture preserves the actual 206 writer from the base commit; both receipts survive the same sequence.
2. **Late publication:** an old draft/order hydration could erase a newer visible receipt. Planner publication now preserves concurrent receipt changes and explicitly restored/removed parent sections.
3. **Cross-tab consistency:** a receipt ledger from a newer tab could reference a supplier order missing locally. Publication now brings the missing immutable order snapshot with the ledger, preserves current drafts/orders, and rejects conflicting order identities. Existing order images are not reloaded for a routine receipt.
4. **Chronology and credits:** receipts before a known precise order creation time are rejected; future events/deliveries do not affect the current calculation; reversals cannot precede their receipt; uncertain credit representations are excluded.

The independent reviewer compared results against a separate reference for 60 randomized FIFO/reversal histories. Supplier HTML and CSV exports were byte-for-byte unchanged in all five languages after adding receipt/operator notes and a delivered invoice carrying private customer, invoice-reference and sale-price markers.

## Browser verification

The managed preview uses real application modules. `operations-207.html` is an explicitly synthetic fixture with a session-only data adapter, no network connections and no production writes. The wrapper also opens the actual application at controlled widths.

- At 320px: saved order A initially requested 8 units, received 4, allocated 4 and had recorded balance 0. Requesting an extra 3 when only 2 of the model remained was rejected without changing history.
- A valid partial receipt of 3 changed received to 7, unreceived to 1 and balance to 3; the older delivered invoice still allocated 4.
- Expected date changed successfully. Receiving the final unit made the order fully received with 8 received and balance 4.
- Reversing that last receipt with a reason restored 7 received / 1 unreceived. Cancellation and reopening preserved those quantities and the complete event trail. Refresh retained the committed result.
- Arabic, Turkish, English, French and Russian rendered without horizontal document overflow at 320px; the same detail view also fit 390px and 1280px. The dark theme and RTL/LTR switches were exercised.
- Opening the workspace automatically reads the latest saved orders and delivered invoices; search/language changes reuse that report without additional database reads. The final browser trial saved one more unit and refreshed: received5, unreceived3, allocated4 and balance1 remained consistent.
- The actual application loaded release 207 at `#purchase-followup`, displayed its empty state, and exposed the contextual mobile actions. Search focused its original field; the purchase/follow-up routes were navigable.
- The 320px metric grid was adjusted after visual inspection to remove empty final squares. The included screenshot shows synthetic data after that fix.

Screenshot: `release207-followup-mobile.jpg`. The browser's clipped screenshot endpoint timed out; the supported full viewport capture succeeded. Browser extension metadata errors were observed in developer logs; no feature error was observed in the tested workflows.

## Bounded performance measurement

`buildReport` was measured in Node v24.22.3 / V8 13.6.233.17-node.63, Linux x64 kernel 6.18.57, AMD EPYC 9V74. After one 121.78ms warm-up, five measured runs took 75.88,63.85,72.62,56.54 and49.26ms: **median 63.85ms**.

Input: 1,000 one-line orders, 1,000 confirmed receipt events and 10,000 delivered invoice lines. Each line represents 1,000,000 units, with 1,000 distinct exact variants. The result used 1,000 allocation entries for 1 billion allocated units; 9 billion excess delivered units remained explicitly unallocated. Fixture construction/validation was outside the timed interval. This measures the local in-memory calculation, not a user's device, complete page load or database/network latency.

## Practical limits

Physical arrivals require explicit confirmation. FIFO is a calculation against recorded receipts; it does not identify the physical lot or infer opening warehouse stock. Old delivered invoices without a precise confirmed delivery timestamp are diagnosed. Configured operator names are not an authenticated identity guarantee. Capacity limits reject additional events explicitly rather than trimming operational history. Production validation is read-only; all mutation trials use synthetic data.
