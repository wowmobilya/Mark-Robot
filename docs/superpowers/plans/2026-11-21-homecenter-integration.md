# HomeCenter Integration Implementation Plan

> **For agentic workers:** Use specialized implementation agents and independent review. Steps use checkbox syntax for tracking.

**Goal:** Add exact invoice package labels, product costing and an archive as three native WOW pages.

**Architecture:** Preserve current IndexedDB records and extend them with nested costing and label snapshots. Use isolated rendering and calculation cores, and a shared native page shell.

**Tech Stack:** Existing buildless JavaScript, CSS, IndexedDB, local JsBarcode, Node tests.

**Spec:** `docs/superpowers/specs/2026-11-21-homecenter-integration.md`

## Global Constraints

- TW-2008 physical A4 geometry and all printed content remain as supplied.
- TW-2004 is the initial default, four labels per A4 with uniformly enlarged
  artwork and official die positions. The last paper choice is remembered.
- Each feature has a dedicated page, the existing WOW identity and ar/tr/en/fr/ru UI.
- Existing business records, backup, keyboard and showroom card behavior remain supported.
- Unknown cost is not zero; historical snapshots do not follow later product changes.
- No external barcode service, no write before successful validation, no uncommitted state claims.

## Review Focus

- Older invoices with no cost snapshot: clearly unknown or captured at the explicit archive time.
- Same model name with different colors/packet counts: preserve line variants.
- Slow/broken images: prevent printing missing content.
- Existing archived/delivered invoices: restore preserves payments and delivery status.
- Back/Forward and 320 px RTL screens: usable native pages with no outer overflow.

## Task 1: Exact print core

Files: `package-label-core.js`, `tests/package-label-core.test.cjs`.
Interface: `WFPackageLabelCore.normalizeInvoice`, `buildLabelBatch`, `renderDocument`.

- [x] Test count/order, original geometry/content, snapshot precedence and invalid inputs.
- [x] Extract exact original rendering, escape values and inject local barcode image URLs.
- [x] Run the targeted tests and review fidelity against the source.
- [x] Add verified TW-2004 profile, four-label pagination and unchanged scaled artwork.

## Task 2: Product costing

Files: `product-cost-core.js`, `product-costs.js`, `product-costs.css`, tests.
Interface: `WFCosting.open`, `captureInvoiceCosts`, `invoiceSummary`; `WFCostCore` pure helpers.

- [x] Test arithmetic, currency conversion, missing/zero costs and immutable snapshots.
- [x] Implement dedicated native editor with saved rates and transactional product patch.
- [x] Run targeted tests and review persistence/draft behavior.

## Task 3: Archive

Files: `invoice-archive-core.js`, `invoice-archive.js`, `invoice-archive.css`, tests.
Interface: `WFInvoiceArchive.open`, `archive`, `restore`, `capture`, `refresh`.

- [x] Test snapshots, restore, currency display and filtering.
- [x] Implement dedicated searchable archive and explicit archive/restore transitions.
- [x] Run targeted tests and review transactional integration.

## Task 4: Native shell and labels page

Files: `operations-workspace.js/.css`, `package-labels.js/.css`, `index.html`.
Interface: `WFOperations.register/open/state/locale/notify/make/icon/refresh`, `WFPackageLabels.open(invoiceId)`.

- [x] Add three native destinations and direct invoice/product entry points.
- [x] Integrate local barcode generation, stable preview, readiness and print validation.
- [x] Hook invoice cost/issuer snapshot capture and existing delivery archiving.
- [x] Add remembered template selection and automatic regrouping of the same invoice.
- [x] Test history, print behavior and mobile/desktop layouts with fixture data.

## Task 5: Review and release

- [x] Run current relevant suite and project checks; resolve actual failures.
- [x] Independently review the combined diff and original print comparison.
- [x] Update offline cache and asset versions, release notes, push and verify deployment.

## Execution ledger

- Base: `56e189a` (release 198). Isolated branch `feature/homecenter-labels-199`.
- Existing project baseline: six standard tests passed.
- Print agent owns print core; costing agent owns costing modules; controller owns shell/integration.
- Ruling: dedicated page requirement supersedes any earlier suggestion of embedded forms or popup editors.
- Ruling: retain source paper geometry; explicitly select A4 with zero page margins to avoid printer-default scaling.

## Authorized extension: release 204

The user requested implementing useful capabilities found in the uploaded program
that WOW did not yet have. Three independent agents implemented the following
native destinations, followed by an independent manufacturing review:

- [x] Manufacturing tickets from saved invoices, per-line workflow/history and A4 workshop printing.
- [x] Reusable material library, explicit linked BOM price application and separate drafts.
- [x] Read-only unit cost/profit analysis by saved A/B/C tier and confirmed exchange rate.
- [x] Integrate six native routes, contextual navigation, five locales and offline assets.
- [x] Protect manufacturing/library sections from old full-record writers and async media publication races.
- [x] Fix conflict-reload deletion/payment race and provide explicit orphan-note recovery.
- [x] Final full test gate (952/952), publish release 204 and verify its workflows in a real browser.
- [ ] Finish the user-requested release205 visual refinement and modal paper picker; verify all six pages on mobile.

The original calibrated package-label files are unchanged by release 204.
