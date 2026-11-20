# Foldable showroom cards implementation plan

> **For agentic workers:** Use superpowers:executing-plans; implementation is already authorized by the user's repeated execute/continue requests. Steps use checkbox (`- [x]`) syntax.

**Goal:** Integrate the supplied showroom-card template into the existing products workflow: exactly two connected 100 × 150 mm faces of the same product on each landscape A4, folding into one two-sided card.

**Architecture:** Keep saved products and company identity authoritative. Add a pure label model, an inline product workspace, and a scoped stylesheet with named print pages. Use the uploaded template's hierarchy, vendor its Code128 dependency for offline use, and print from a dedicated same-origin iframe after assets/layout validation.

**Tech Stack:** Existing buildless HTML/JavaScript, IndexedDB through current APIs, CSS physical units, JsBarcode 3.11.5.

**Spec:** User's accepted instructions and references/اتاكيت المعرض-9.html (original retained outside the repository).

## Global constraints

- One A4 landscape sheet is 297 × 210 mm; exactly two 100 × 150 mm faces form ONE 200 × 150 mm connected cut piece.
- Center vertical fold; both faces upright; blank backs fold together; preserve 10 × 15 cm holder size.
- One outer solid cut boundary, one dashed fold guide, zero gap between faces; page margins 6 mm.
- Independent saved print language: ar/tr/en/fr/ru; do not mutate interface or invoice locale.
- Physical dimensions never come from shipping packages. Preserve user-entered names and descriptions. Map reference SPEC visibly to the existing description field.
- In-page workspace; same app brand; no second application shell or editing of original product records merely to print.
- Preserve exact stored barcode payload. Unsupported or too-dense Code128 uses the existing QR encoder with visible explanation, never a fabricated barcode.
- No silent clipping; wait for fonts/images; named @page must not affect invoices; latest service worker includes new local assets.

## Review focus

- Concurrent product deletion/change while selecting or preparing a print: print a fresh immutable selection and never substitute another product.
- Arabic/long mixed-script names, long descriptions and many size rows: fit safely or identify the product requiring editing; preserve text.
- Missing and broken images differ: intentional absence can show placeholder, failed supplied image blocks incomplete print.
- Same barcode data must scan for numeric/ASCII/Unicode values with quiet zones; no shipping or CBM identity substitution.
- Print iframe cleanup and per-device saved preference must remain safe across cancellation, offline failure and app language changes.

## Task 1: Pure label data model

Files: product-label-core.js, tests/product-label-core.test.cjs.

- [x] Write and run failing behavioral tests for physical rows, zero/missing CBM, immutable input, barcode validation and five-locale isolation.
- [x] Implement WFProductLabelCore/createLabelModel, getDimensions, normalizeLocale, resolveLocale, geometry, text.
- [x] Run node --test tests/product-label-core.test.cjs. Expected: all pass.

## Task 2: Integrated workspace and print document

Files: product-labels.js, product-labels.css, tests/product-labels.test.cjs, vendor/JsBarcode.code128.min.js, vendor/JSBARCODE-LICENSE.txt.

- [x] Implement product-toolbar and card actions, inline selection/preview, independent language button and safe preference persistence.
- [x] Build two identical faces from each product snapshot; preserve reference hierarchy, exact geometry, safe barcode/QR rendering and one connected outline.
- [x] Implement dedicated print lifecycle with bounded image/font waits, layout fit/preflight, cancellation-safe cleanup and no source-data mutation.
- [x] Verify locale and lifecycle edge cases with focused tests and actual rendered local UI at mobile and desktop widths.

## Task 3: Release and deploy

Files: index.html, sw.js, docs/releases/196-foldable-showroom-cards.md.

- [x] Register new assets with exact matching runtime/cache URLs and bump release to 196 while preserving HTML CRLF.
- [x] Run npm test and relevant existing product/navigation/update tests; run syntax/whitespace checks. Expected: all pass.
- [x] Independent review; resolve material findings; verify card geometry and preparation with the available browser renderer.
- [ ] Publish through the existing GitHub Pages source, observe build/deployment status, and report actual outcome and physical-printer verification limit.

