# Procurement Follow-up Implementation Plan

> **For agentic workers:** Use subagent-driven development for the isolated core/UI tasks and an independent whole-change review. Root owns release integration and deployment.

**Goal:** Connect saved supplier orders to confirmed receipts and automatic, clearly labelled delivered-invoice allocation.

**Architecture:** Append-only ledger nested in the existing protected procurementOrders settings section, a pure FIFO report, and an operations workspace. Existing invoice and supplier export stores remain authoritative and unchanged by this ledger.

**Tech Stack:** Existing vanilla JavaScript/CSS, IndexedDB merge writes, Node test runner, managed browser QA.

**Spec:** `docs/superpowers/specs/2026-11-21-procurement-followup-design.md`

## Global constraints

- Preserve the existing brand, five languages, RTL and mobile layout.
- Preserve immutable supplier documents and customer-data privacy.
- No external service/dependency, background polling or supplier communication.
- Actual receipt confirmation is required; FIFO allocation is a calculation, not physical lot identification.
- Preserve CRLF in `index.html` and protect independent settings fields from stale whole-row saves.

## Review focus

- An older tab must not over-receive or overwrite a newer receipt during hydration.
- Duplicate/conflicting invoices and sales before receipts must not double count or consume future stock.
- Source variants and saved historical variants must not be silently conflated.
- Failed writes and reversed receipts must leave honest visible states and immutable audit events.
- Supplier export must remain free of internal sales/tracking data.

## Tasks

- [x] Core agent: implement the exact core contract and focused failing/passing domain/storage tests in `procurement-followup-core.js` and `tests/procurement-followup-core.test.cjs`.
- [x] UI agent: implement `procurement-followup.js/.css`, add the operation name/route and planner links; cover real controller interaction risks in `tests/procurement-followup.test.cjs`.
- [x] Root: integrate script/style versions, route validity, return navigation and mixed-release-safe settings storage in `index.html`/`sw.js`; extend actual persistence integration tests and synthetic QA fixtures.
- [x] Independent reviewer: inspect core, UI and transaction invariants; reproduce material defects and require targeted fixes.
- [x] Root: run the entire test suite, verify phone workflows and record limits in `docs/qa/release207-verification.md`.

Publication follows the verified source commit. The owning conversation and GitHub Pages workflow record the final deployment status.
