# Release 220 — WOW phone workspaces and offline status

## Scope
- Review original Galeri.TR source, retaining the canonical WOW product source and owner/customer permissions. The original source is kept intact; no direct historical data import or duplicate model catalog is performed.
- Unify mobile card spacing, readable content, touch targets, responsive studio tabs, primary actions, gallery empty state and editable sheets using the existing WOW theme. Follow the main app locale and RTL direction, without separate styling or a second navigation shell.
- Gallery now recognizes `_sync.source = "device"` from the existing authenticated local transport (instead of a nonexistent `cached` field), includes device save-time context, and uses a five-language uncached-offline explanation. No claims that stale stock/prices are live.
- Status-bar button identifies saved, offline and syncing states. Data privacy and permission gates are unchanged; the interface never bypasses a login or owner grant.

## Offline contract
Signed, time-limited owner offline grant + previously saved device projections enable registered module reads. Pending writes require the original server's idempotent receipt before being shown as posted; pictures may be unavailable until online unless individually saved via the supported file download flow. A first visit without local data displays an explicit explanation. Payments, order approvals, sending, and remote account management are never reported complete without server confirmation. Staff/customer cold-offline authorization and expired grants are not broadened by this release.

## Acceptance
- Unit tests: `node --test tests/gallery-empty-state.test.mjs` plus existing offline-platform tests.
- Chromium: `tests/integrated-workspaces.browser.cjs` and all gallery fixtures at 360, 390, 680, 1000 widths, in Arabic RTL.
- Release gate: `node scripts/verify-release.mjs`, matching page/worker release 220 and all changed versioned assets.
- Deploy only after exact-head checks pass; a live phone still requires the browser/service worker to receive the new release and an authenticated owner grant to access cached private data offline.

## Deferred by design
Legacy Galeri.TR records and media need authoritative WOW model mapping, ownership and price proof before import. A source-only test cannot confirm database transfer, external-domain routing, offline grant signing secrets, or this phone's installed-version status.
