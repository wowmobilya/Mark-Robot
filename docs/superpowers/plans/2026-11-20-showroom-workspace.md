# Showroom Workspace Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make showroom-card selection, review and printing clearer and safer across phone and desktop layouts.

**Architecture:** Keep the existing Products workspace and isolated print frame. Refactor screen markup/styles, add pure search/review helpers, and share asset/layout preparation between preview and printing.

**Tech Stack:** Existing vanilla JavaScript, CSS, IndexedDB preference writer and Node tests.

**Spec:** `docs/superpowers/specs/2026-11-20-showroom-workspace.md`

## Global Constraints

- Two upright 100 × 150 mm faces joined 200 × 150 mm on landscape A4; preserve the shared print CSS unchanged.
- Arabic, Turkish, English, French and Russian; print language independent of app language.
- Product records remain read-only in the card workspace.
- Keep current app theme, touch keyboard integration and inline navigation.

## Review Focus

- Mobile print dialogs returning before `afterprint`: retain the live snapshot and reject repeated Print.
- Slow preference saves across closing/reopening: keep the visible chosen language.
- Older image requests finishing after another card is selected: do not overwrite the current status.
- Zero/leading-zero barcodes and Arabic numerals: preserve payloads and normalize search only.
- Narrow RTL layouts and long translated controls: no page overflow or unreachable actions.

## Task 1: Product discovery and review

**Files:** `product-label-core.js`, `tests/product-label-core.test.cjs`.

**Interfaces:** Export `normalizeSearch(value)`, `matchesProduct(product, query)` and `reviewProduct(product)`; the last returns missingName/missingImage/missingDimensions keys.

- [x] Add behavioral cases for multilingual token search, missing physical dimensions, immutable source data and zero barcodes.
- [x] Implement helpers and fix the falsy zero-barcode fallback.
- [x] Run `node --test tests/product-label-core.test.cjs`.

## Task 2: Responsive inline workspace

**Files:** `product-labels.js`, screen-only portion of `product-labels.css`.

- [x] Build a selection sidebar, mobile pane tabs, selected-card navigation and face/A4 preview controls.
- [x] Separate inclusion checkboxes from preview actions; show filtered counts and source-data review hints.
- [x] Preserve session selection and independent language through reopen; retain the five-language UI.
- [ ] Verify desktop and phone layouts with representative local product fixtures.

## Task 3: Truthful preview and print lifecycle

**Files:** `product-labels.js`, `tests/product-label-lifecycle.test.cjs`, `tests/product-labels.test.cjs`.

- [x] Reproduce duplicate printing and pending-locale reopen with tests executing the real controller functions.
- [x] Share bounded image/font readiness, fitting and overflow checks between preview and print.
- [x] Keep active print frames locked until cleanup and protect stale preview results.
- [x] Run focused regressions and existing application tests; inspect the final diff and print CSS identity.

## Task 4: Release

**Files:** `index.html`, `sw.js`, `docs/releases/197-showroom-workspace.md`.

- [x] Bump exact runtime asset URLs and cache version together.
- [ ] Publish the verified commit to the existing repository and verify the hosted release.

Execution is authorized by the user's instruction to fix and develop the section autonomously. Publication uses the existing destination and audience.

## Automated verification — 2026-11-20

- Complete Node suite: **740/740 passed across 70 test files**, including the product-label regressions and all six existing localization/syntax checks; zero failed, cancelled, skipped or todo tests.
- Explicit JavaScript syntax checks passed for `product-labels.js`, `product-label-core.js` and `sw.js`; the existing syntax regression parsed the inline HTML scripts.
- Read-only diff review confirmed unchanged geometry constants and unchanged `buildFace()` interior markup against base `8e769a34edb2e5200b11ec9292e33949f32efc12`.
- The complete 9,109-byte shared print-CSS tail is byte-identical to that base, SHA-256 `edcc03a75f318e4e132c233a07c6b97a7ffed886772a4b84ae21f3e1883fc195`.
- CRLF-aware whitespace checking passed with `git -c core.whitespace=cr-at-eol diff --check`. The plain command reports the four intentionally CRLF-terminated changed `index.html` lines.
- This record does not mark browser verification or publication complete.

## Preview environment limitation

The documented managed-preview URL served an older cached release196 fixture despite the current release197 source mapping. Reload did not resolve the mismatch. Representative desktop/mobile fixture QA remains unverified; no application or network security settings were changed to compensate. The live release will be checked after publication.
