# Release 206 — mobile invoices and assisted operations

## Invoice preview and lost-label recovery

The mobile preview fits the original invoice page inside the available viewport. Scaling belongs to the preview wrapper; exported page geometry remains 794 × 1139 px. A separate full-size mode permits scrolling and zooming. Print, Share and Options share one compact action row at 320 px. Page preparation no longer starts PDF rasterization and signature generation every time the preview opens.

The package-label page has All labels and Lost labels modes. Lost labels starts with no selection, and printing remains disabled until a label is selected. Search accepts model names, colors and original label/packet positions, including Arabic digits. Selected labels retain their original invoice, line, unit, packet and barcode identities. Changing paper or language preserves selection; changing the source invoice invalidates it. Lists render in bounded batches.

A selected-label print request is persisted before the print dialog opens. Its snapshot includes invoice, customer, paper profile, original label total, selected labels and reason. A browser `afterprint` event records only that the print dialog closed. Printed and Cancelled outcomes require an explicit user choice. These records do not alter invoices, quantities or stock.

The screenshot below uses a synthetic local invoice with bank details hidden for the capture.

![Invoice preview at 320 px](release206-invoice-mobile.jpg)

## Independent workspaces

| Route | Purpose |
| --- | --- |
| `purchase-planner` | Recorded model demand, saved supplier orders, supplier document export and subsequent model activity |
| `print-history` | Detailed reprint requests and confirmed outcomes |
| `review-center` | Pending print confirmations and actual label-data diagnostics |
| `daily-tasks` | Planned work with priority, optional dates and optional record references |
| `global-search` | Search across saved customers, models and invoices using the existing record actions |

Navigation follows the existing application identity and supports Arabic, Turkish, English, French and Russian. Settings use a single short transition, with reduced-motion support and protection against stale close callbacks after reopening.

## Purchase planner contracts

- Demand is computed from saved invoice units for a selected year or date range. Archived invoices are included once; invalid dates, quantities and conflicting records are reported. Variant identity includes product, color and dimensions. The report does not infer warehouse stock.
- A keyboard scanner or the existing camera scanner can select a master model. Invoice QR payloads and unrelated URLs are rejected by this route. It never falls through to the invoice or product editor.
- Drafts autosave after a short quiet interval. Field updates merge into the latest settings row. Commit receipts retain the exact committed draft revision, so delayed hydration cannot silently adopt another window's revision and overwrite its draft. Conflicting local edits remain visible and unsaved.
- Prepared supplier orders are independent snapshots. Editing a prepared order creates a new order; subsequent catalog edits do not rewrite saved documents.
- Supplier documents use an explicit field allowlist: buyer/supplier details, selected product specifications, quantities and optional supplier prices. Original customer identities, source invoice references, sales prices, costing and source QR data are excluded.
- The planner supports printing or saving PDF through the browser, portable HTML with embedded raster images, and CSV. HTML export validates image decoding and stops on failure. Image retrieval is deduplicated and bounded to four concurrent reads. CSV protects formula-like text and is available independently of images.
- Saved-order activity means recorded sales of matching models from the order's calendar date. It is not a claim of receipt or allocation of sales to a particular procurement lot. No automatic supplier message or purchase transaction is sent.

## Security and data integrity

Saved names, descriptions, image attributes and inline action arguments now cross their respective HTML/JavaScript boundaries safely. Numeric and quoted legacy identifiers retain their identity. User-supplied type names cannot resolve inherited object properties as application type definitions.

Backup validation checks the complete record tree, canonical duplicate IDs, nested item/payment/dimension shapes, numeric fields and unsafe prototype keys before opening a clearing transaction. Existing sparse records and unknown future settings sections are retained when their shapes are valid. Tests exercise malformed input against the actual restore entry point and assert that no transaction starts.

Serialized cart preferences are validated before restore. Cart loading builds its next value atomically: invalid input preserves the previous cart and raw storage, while an intentionally empty restored cart clears old in-memory entries. String-valued selectors resolve legacy numeric record IDs without changing the stored identity.

Legacy whole-settings saves preserve the independently managed material library, reprint audit, daily tasks and procurement fields. Transaction failure does not publish uncommitted data or partially register media.

## Resource lifecycle changes

- Hidden speech controls no longer scan and measure workspace headings on descendant mutations.
- Robot route observers ignore sentence highlights and unrelated descendant classes. Multi-locale voice-state bursts produce one settings render per frame.
- Without an available update, the updater avoids form serialization and dialog scans. Update clocks stop while hidden or suspended. Both speech-pack engines block reload during a download.
- The old bottom-navigation updater does not install a duplicate polling timer when the central updater is present.
- Idle local synthesis workers release their worker/WASM memory after five minutes. Active and paused speech retain ownership; failed worker transport clears its outstanding job for retry.
- Camera work stops on close, suspension and late permission completion. Native detection calls do not overlap, and late fallback controls are released.
- Service-worker installation downloads at most six assets concurrently, reuses exact unchanged versioned assets and fetches fresh HTML/configuration. A failed required HTML/CSS/JavaScript download does not activate the partial shell or modify the previous cache. Compatibility URLs used by installed voice workers survive successful activation.

## Verification

Final integrated run on 21 November 2026: **1,111 passed; 0 failed; 0 skipped**. The whitespace check also passed.

The complete automated command is:

```bash
node --test tests/*.test.cjs tests/*.test.mjs
git -c core.whitespace=cr-at-eol diff --check
```

Focused regressions cover stale asynchronous previews, invoice/customer selection, selected-label audit ordering, duplicate print guards, atomic settings/media persistence, draft hydration conflicts, invalid images, supplier privacy across five languages, camera cancellation and resource cleanup. The release gate also checks that every local script/style in the HTML uses the exact version precached by the service worker and that all listed local assets exist.

Browser checks use `docs/qa/workspaces.html` at phone widths and the real application modules. `docs/qa/operations-206.html` supplies explicitly synthetic, session-only data for model demand, prior-year sales, a pending reprint, search and task workflows. It does not read or change production records. The reprint fixture represents a past dialog close; confirming it tests the audit UI without claiming a physical print occurred.

The final browser purchase check selected a master model by barcode, read its 24 recorded units from 2025, applied that quantity and saved a Turkish supplier order. Its preview contained the supplier/model fields and excluded the source customer and invoice. The managed browser did not return a completed download event for the HTML click and disallowed its built-in download manager; the downloaded file was not manually verified. Automated controller tests cover both successful exports and rejected malformed-image exports.

Physical printer output and camera hardware were not available in this environment. Browser print lifecycle and camera races are covered with controlled tests; they are not hardware certification.
