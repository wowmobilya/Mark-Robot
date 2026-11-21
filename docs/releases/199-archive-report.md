# Release 199 invoice archive

The dedicated archive page uses the existing invoice store. Its Arabic, Turkish, English, French and Russian interfaces support search by invoice number or customer, archive year and month filters, and date sorting. Each card links to the saved invoice preview and package labels. The page renders the first 24 matching cards and offers the remaining results on demand.

## Invoice values and history

- The count and USD total cover the current results. A missing invoice amount makes the total unavailable. Other currencies use the exchange rate recorded on that invoice.
- The archive records the capture time and the issuer and customer logos alongside the invoice’s saved lines. Repeated archiving preserves the original capture. Existing line names, images, variants and dimensions keep their saved values.
- A full cost appears only when all applicable lines have a known captured cost. A recorded zero is valid. Explicit archive-time capture of a previously missing cost adds its own date to the card.
- Both archive and restore require inline confirmation. Each transition reads the latest invoice in the write transaction. The page publishes the hydrated result after the transaction commits.
- Restore clears the archive flag and date while preserving the invoice ID, payments, delivery status and snapshots. Viewing, searching, previewing and opening the print page leave the archive record untouched.

## Checks

Eight automated checks pass with `node --test tests/invoice-archive-core.test.cjs`. They exercise detached snapshots, saved exchange rates, incomplete legacy records, duplicate archive requests, restore, concurrent payments, write failure and retry. The page-level check runs the actual archive module with a DOM adapter and the product costing core. It covers all five languages, action routing, inline confirmation, filter behavior and the update guard.

Four additional checks in `tests/invoice-delivery-merge.test.cjs` execute the existing delivery callback and legacy list filter. They cover transaction timing, hydrated media, concurrent payments, concurrent deletion, write failure and retry, duplicate delivery, and both restore entry points. All 46 adjacent archive, delivery, invoice workspace, business, update and locale tests passed together.

The local Chromium launch stopped before page load because its process socket was unavailable. The scope of these results is data and DOM behavior. Physical screen layout and browser history belong to the integrated release checks.
