# Procurement follow-up design — release 207

The user asked to continue autonomously, complete the purchasing workflow and know whether ordered models sell, while protecting customer data and avoiding unnecessary resource usage. This extends the published release 206 planner using the existing buildless JavaScript application and IndexedDB/settings merge infrastructure. No new dependency or external service is needed.

## Chosen approach

Keep immutable supplier order snapshots in `settings.procurementOrders`. Add an append-only operational ledger in `settings.procurementOrders.followup`, plus a dedicated `purchase-followup` workspace. This provides actual confirmed receipt quantities without rewriting purchase documents, sales invoices or catalog prices. A full warehouse valuation/accounting migration is outside this increment. Simply comparing all sales since an order date would count the same units against multiple orders; a deterministic FIFO calculation on confirmed receipts avoids that duplication.

## Behavior and truthfulness

- Every saved order initially appears as prepared. Users can record that it was ordered, set an optional expected delivery date, confirm all outstanding quantities or enter a partial receipt.
- Events capture the current timestamp and configured operator. Receipt quantities cannot exceed outstanding ordered quantities. A void event with a reason reverses an erroneous receipt without deleting history. Cancel/reopen applies to the unreceived remainder and never erases receipts.
- The interface derives prepared/ordered/partially received/received/cancelled states, outstanding units and overdue expected dates. No supplier message or purchase transaction is sent.
- Delivered invoices with a valid precise `deliveredAt` timestamp consume matching confirmed receipts chronologically. Match canonical product ID, color and dimensions. Allocate quantities arithmetically, never one object per physical unit. Deliveries before a receipt cannot consume that future receipt; unmatched units remain explicitly unallocated. Archived duplicates count once; conflicting duplicates, missing timestamps, unknown quantities, credits and incomplete variants are diagnostics.
- The result is labelled a FIFO calculation for recorded procurement receipts. It is not physical lot identification or the complete warehouse balance. The user sees received quantities, quantities allocated to delivered invoices and the remaining recorded procurement balance separately. No opening warehouse quantity is invented.
- Recalculate from current invoices/active receipt events so invoice corrections and voided receipt records do not double count old derived allocations. Never persist a fabricated sale or change an invoice.
- Preserve supplier-export privacy. No tracker data, source customer, source invoice reference or sale price is added to supplier HTML/CSV/PDF.
- Arabic/RTL, the other four existing languages, narrow phone layouts, existing brand variables, bounded lists and reduced motion remain required.

## Core contract

New UMD module `procurement-followup-core.js`, global `WFProcurementFollowupCore` (CommonJS in tests), consumes `WFPurchasePlannerCore` and `WOWStatementCore`.

Storage: `{version:1,revision,records:[{orderId,revision,events:[]}]}` under `settings.procurementOrders.followup`. Missing storage means empty; malformed/future versions are rejected before mutations. Per-order optimistic revisions allow separate orders to change independently. Global revisions prevent stale asynchronous hydration publishing older state. Event IDs are idempotent only when their full payload matches.

`mergeChange(latestSettings,intent)` reads the authoritative order from `latestSettings.procurementOrders` and validates every transition against the authoritative ledger. Intent is `{orderId,expectedRevision,event}`. Event is `{id,type,at,operator?,note?,expectedDate?,receiptId?,lines?:[{key,quantity}]}`. Types: `ordered`, `expected`, `receipt`, `void_receipt`, `cancel`, `reopen`. `key` is the canonical `modelKey(productId,color,dimensions)` computed from an order line. Receipt `at` is also its effective receipt time; the UI captures now. The `expected` event accepts a valid ISO day or empty string to remove it. `void_receipt` requires a nonempty note and a receipt ID. Preserve all unrelated settings fields.

`buildReport(state,{now?})` returns `{version:1,complete,diagnostics,totals,orders}`. Each order exposes `{id,orderNumber,supplier,status,revision,expectedDate,overdue,orderedUnits,receivedUnits,outstandingUnits,allocatedUnits,balanceUnits,lines,events}`. Each line exposes `{key,productId,name,color,dimensions,orderedUnits,receivedUnits,outstandingUnits,allocatedUnits,balanceUnits,allocations}`. Allocation entries are internal `{invoiceId,invoiceNumber,deliveredAt,quantity,receiptId}`. Diagnostics use `{code,orderId?,invoiceId?,lineIndex?}`; missing data never displays a healthy zero.

`persistChange(intent,{state,writeBatch,hydrate?})` commits a settings merge, returns the exact committed record, and publishes only its owned ledger plus required immutable order snapshots if its revision is current/newer. It never silently adopts an unrelated receipt revision. `getLedger(settings)` validates/read-only returns ledger; `buildReport` remains pure. Resource ceilings must fail explicitly rather than prune pending operational history.

## UI contract

New `procurement-followup.js` and `.css`, global `WFProcurementFollowup={open(orderId?),refresh,hasUnsavedChanges}`. Parent is `purchase-planner`. Register a standalone sidebar route and a follow-up button for saved orders in the planner. Show searchable/filterable compact order cards, 20 at a time, summary counts and selected-order details. Build report once per refresh, not for every keystroke. Detail actions use explicit named buttons, busy guards, fresh revision checks and clear error messages. Partial receipt editing and a required reversal reason are unsaved work protected from automatic reload. Changes dispatch `wf-procurement-followup-change`.

## Verification

Core tests cover partial/full/over receipt, idempotency, concurrent same/different order edits, reversal/reopen, numeric/quoted IDs, precise chronology, two orders sharing one model, variant mismatch, duplicated/cancelled/archived/undated invoices, safe integer overflow and preservation of independent settings. Actual controller tests cover double clicks, dirty/busy update guards, stale save callbacks, failed writes, bounded rendering, translation and error recovery. Integration tests use the real settings transaction/publishing functions. Browser QA uses synthetic data for receipt and FIFO examples; production verification is read-only.

## Mixed-release compatibility found during review

The authoritative ledger is nested in the existing protected procurementOrders section, not a new root settings key. Deployed release206 tabs already preserve the entire section when saving ordinary settings. Planner merges preserve unknown nested fields. New planner publication retains a newer nested ledger when an older write finishes hydration, and follow-up publication retains concurrently saved drafts/orders. There is one authoritative ledger.
