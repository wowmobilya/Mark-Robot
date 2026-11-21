# Mark Robot Operations Implementation Plan

> **For agentic workers:** Use superpowers:subagent-driven-development or superpowers:executing-plans task by task. User has explicitly chosen autonomous execution with specialist agents and authorized implementation.

**Goal:** Make the paid application independent of the owner's browser activity, with bounded recovery, understandable administration, scoped AI and efficient device caching.

**Architecture:** Retain the existing WOW visual shell and Supabase Edge/PostgreSQL authority. Add operational SQL, protected module APIs and owner UI; coordinate durable offline transport as a separate shared module. Generative AI is optional server infrastructure with bounded data and costs.

**Tech Stack:** Existing JavaScript PWA, Deno Edge service, PostgreSQL, pg_cron, pg_net, Web Push, IndexedDB, pinned PGlite test harness.

**Spec:** `docs/superpowers/specs/2026-11-21-mark-robot-operations.md`

**Status, 2026-11-21:** Verified commit `bf428ba3bff01c20babfa6711d206ee1e822976a` passed 1,562/1,562 tests with no failures or skips and all four remote native Chromium fixtures in the [PR run](https://github.com/wowmobilya/WOW-Galeri/actions/runs/44914543018) and [push run](https://github.com/wowmobilya/WOW-Galeri/actions/runs/44914539861). Local Chromium launch remains blocked by executor socket creation; remote synthetic acceptance is complete. Checked implementation items do not establish hosted service operation or physical-phone delivery. The intended paid project denied connector access again; no Supabase, DNS, provider or push activation has been accepted. See `docs/verification-report.md` for aggregate evidence.

## Global constraints

- Target only `sldthbnigivpsqixccah`; actual access remains blocked.
- Preserve existing WOW colors/design and existing local business data.
- Keep target changes additive and inventoried; no destructive reset or historical-data deletion.
- Do not change DNS before local-origin migration and deployment gates pass.
- No secrets, signing keys, SMTP keys or service credentials in client/public source.
- Keep synthetic browser evidence distinct from live provider delivery and physical-phone acceptance.

## Review focus

- A stale cloud-owner binding must not authorize a different local employee.
- A lost response must not duplicate a financial/stock/chat command.
- Offline storage exhaustion must not silently discard pending work.
- Automation must stop at its exact scope, respect disabled state and avoid retry storms.
- Untrusted record text must not alter AI instructions or gain write/secret access.

### Task 1: Shared capability and module integration

- [x] Extend the explicit client/server permission catalog and owner-only server route.
- [x] Remove the public PDF signing key and false certification; verify two-page AES-256 exports with a real PDF parser and rendered fixture.
- [x] Organize prepared cloud/push files under `modules/platform` and update references.
- [x] Integrate native section assets and Edge action maps; verify shell precache and static paths locally.
- [x] Run focused local authorization and identity-change checks; close the independent customer-auth findings on role changes, per-message challenges and correct session logout.

### Task 2: Operational server and owner dashboard

Files: `supabase/modules/operations.sql`, `supabase/functions/wow-cloud/modules/operations.mjs`, `modules/server/*`, `tests/operations-server*`.

- [x] Implement service-only `wow_operations_service` and a bounded `wow_operations_tick` with a private incident/run ledger and exact Cron registration.
- [x] Test expiry recovery, duplicate suppression, disabled automation, owner-only access and unchanged business data in local PostgreSQL.
- [x] Add native dashboard metrics and safe controls with truthful configuration/last-check states.

### Task 3: Assistant

Files: `supabase/modules/assistant.sql`, `supabase/functions/wow-cloud/modules/assistant.mjs`, `modules/assistant/*`, `tests/assistant*`.

- [x] Implement scoped deterministic search and bounded projections through current server authorization.
- [x] Add a server-only provider adapter, stable request receipts, usage budget, timeout and failure circuit.
- [x] Verify cross-account denial, malicious record text, no tool execution, stale request isolation and cost limits with local provider fixtures.
- [x] Add native assistant UI with result references, provider status and explicit suggestions.

### Task 4: Device cache and queued module writes

Owner: offline platform specialist. Files: `modules/platform/offline/*`, registry integration and dedicated stateful tests.

- [x] Add scoped IndexedDB cache, pending commands, bounded explicit blob cache and status panel.
- [x] Integrate delta projections and exact module idempotency contracts.
- [x] Test reload, quota failure, two tabs, lost replies, identity changes and stale delta recovery in local fixtures.

### Task 5: Native Galeri features and history boundary

- [x] Implement and locally test customer registration, verified email and recovery; independent auth security findings are closed. Hosted SMTP, templates and actual `#challenge=…&token_hash=…` links remain acceptance gates.
- [x] Implement native correspondence, editable templates, archive, explicit device handoff and server mail with idempotency, bounded retries and authenticated provider events.
- [x] Implement owner-approved public share snapshots, image handling and the same-domain HTML adapter; its hosting is not deployed.
- [x] Connect reference currency quotes and the optional metals provider with source/unit/time validation; add the one-to-three-item low-stock badge.
- [x] Add read-only preflight for 28 historical source families. It always retains `applyReady:false`; Storage bytes remain unverified (`objects.contentVerified:false`).
- [ ] Obtain private authorized source exports and explicit identity/product/file-ownership maps; build and validate repeatable historical import adapters before applying any history.
- [x] Complete and independently review local background music parity: original 128,832-byte bundled file, explicit trusted gesture, pause on inactive retained routes/speech/session changes, bounded scoped preferences, and SHA-pinned full-cache/single-range delivery with a 200 KiB stream guard. Evidence: `docs/gallery-music.md`, `tests/gallery-music.test.mjs`, `tests/service-worker-install.test.cjs`, `tests/reference-pack-integration.test.cjs`.

**Finance source clarification:** Native per-box low-balance thresholds and exact units already cover the working warning feature. The public legacy page only showed a repeated in-page balance toast; its overdue/payroll toggles had no visible reminder implementation. Private legacy jobs cannot be confirmed or excluded without target access. New opt-in server-scheduled reminders would be an optional enhancement, currently unimplemented and inactive, not a base-rollout gate. Implemented proforma/payment/expense event push still requires real-phone acceptance.

Evidence and live requirements: `docs/release-acceptance.md`, `docs/customer-email-access.md`, `docs/customer-correspondence.md`, `docs/public-gallery-sharing.md`, `docs/quote-providers.md`, `docs/galeri-history-transfer.md`.

### Task 6: Combined acceptance and deployment gates

- [x] Prepare the permanent operations/recovery guide and an evidence-linked acceptance ledger that separates local implementation from live observations.
- [x] Record the final regression (1,562/1,562, zero failures/skips), source verification (192 assets, 128 scripts, 3,995,963 bytes), zero reported audit vulnerabilities and independent local review. [Source job](https://github.com/wowmobilya/WOW-Galeri/actions/runs/44914543018/job/136877221453); aggregate record: `docs/verification-report.md`.
- [x] Pass all four [remote Chromium fixtures](https://github.com/wowmobilya/WOW-Galeri/actions/runs/44914543018/job/136877221302): gallery controls/RTL/PDF, native notification after closing WOW tabs and stopping its worker with a simulated provider, native muted music lifecycle, and actual-root-worker cached `206` ranges/offline playback advancing without a second MP3 fetch. These use isolated synthetic data and no production services.
- [ ] Resolve intended-project access, inspect actual plan/region/schema/data and back up before migration.
- [ ] Run live Auth/Storage/Edge, two-device and closed-app push tests; verify SMTP/templates/emitted link fragments, correspondence delivery, public sharing, enabled quote/AI providers and backup restoration.
- [ ] Record actual phone layout, audible music and its lifecycle, offline behavior and latency on the user's network.
- [ ] Publish the combined verified version, then verify new-origin migration before domain cutover.
