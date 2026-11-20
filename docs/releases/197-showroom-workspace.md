# Release 197 — Showroom workspace

Refines **Showroom cards / بطاقات المعرض** inside Products so product selection, card review and printing are easier to reach on phones and larger screens.

## Result

- A selection sidebar sits beside the preview on wide workspaces. Compact Products and Preview panes use the available workspace width on smaller screens.
- Product inclusion and preview are separate actions. Search normalizes Arabic marks and Arabic/Persian numerals, Turkish letters and accents; filters show all products, selected products or products with missing source information.
- The selected-card queue opens a card directly. Card-face view makes the content readable; A4 view shows the complete sheet. Both views use the same underlying printed card.
- Toolbar close/reopen preserves the selection and active product during the session. The current print-language choice also survives reopening while its serialized preference save is pending.
- Preview and print preparation share bounded font/image readiness, image decoding, content fitting and overflow validation. A batch error identifies the affected product and opens its preview.
- A native print job retains its isolated frame until completion. Repeated Print cannot replace a live job; browsers without a completion event expose an explicit recovery action after the user closes the print dialog.
- Product data remains read-only within the card workspace. The existing, clearly labeled product-edit action remains available for catalog corrections.
- Runtime asset URLs and the service-worker cache advance together to release 197.

## Preserved output

One landscape A4 sheet still contains two identical upright 100 × 150 mm faces joined into a 200 × 150 mm piece, with the existing outer cut boundary and center fold. The print language remains independently configurable in Arabic, Turkish, English, French and Russian.

Compared with base `8e769a34edb2e5200b11ec9292e33949f32efc12`, the geometry constants and `buildFace()` interior markup are unchanged. The complete print-CSS tail, beginning at the shared-card-geometry marker, is byte-identical: **9,109 bytes**, SHA-256 `edcc03a75f318e4e132c233a07c6b97a7ffed886772a4b84ae21f3e1883fc195`.

## Automated validation

- The complete `node --test tests/*.test.cjs tests/*.test.mjs` suite passed: **740 tests across 70 files**, with zero failures, cancellations, skips or todos.
- This includes the six existing localization/syntax checks and the product-label model, image lifecycle and controller regressions. Controller coverage includes asynchronous and synchronous print completion, duplicate Print, preparation races, failure recovery, pending language saves, reopen behavior, hidden preview geometry and batch-error routing.
- Explicit `node --check` passed for `product-labels.js`, `product-label-core.js` and `sw.js`. The existing syntax test also parsed the inline scripts in `index.html`.
- `git -c core.whitespace=cr-at-eol diff --check` passed. Plain `git diff --check` flags the four changed `index.html` lines solely because the file retains its existing CRLF endings.

Browser, hosted-release and physical-printer results are not asserted by this automated verification record.
