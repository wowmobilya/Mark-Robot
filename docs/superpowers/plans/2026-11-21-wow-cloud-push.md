# WOW cloud and owner push implementation plan

> **For agentic workers:** Execute the owned tasks with independent review. Do not deploy until root completes the integration gates.

**Goal:** Deliver the existing WOW app's authenticated cloud backend and detailed owner Web Push with reliable retry behavior.

**Architecture:** Local transactional outbox → authenticated Edge API → atomic database records and notification queue → Web Push worker. Device opt-in and account binding protect notification details while the app is closed.

**Tech Stack:** Existing browser JavaScript/PWA, IndexedDB, Supabase Postgres/Auth/Storage/Edge, Web Push.

**Spec:** `docs/superpowers/specs/2026-11-21-wow-cloud-push-design.md`

**Status, 2026-11-21:** Backend, client, sync and combined assembly are implemented. Commit `bf428ba3bff01c20babfa6711d206ee1e822976a` passed 1,562/1,562 tests with zero failures/skips and all four remote native Chromium fixtures in the [PR run](https://github.com/wowmobilya/WOW-Galeri/actions/runs/44914543018) and [push run](https://github.com/wowmobilya/WOW-Galeri/actions/runs/44914539861). Local executor socket restrictions still prevent local Chromium launch; remote synthetic browser acceptance is complete. These results do not establish hosted service operation or physical-phone delivery. Connector access to the intended paid target was denied again; Supabase, DNS, provider and push deployment remain open. Aggregate evidence belongs in `docs/verification-report.md`; the expanded plan is `2026-11-21-mark-robot-operations.md` and the current acceptance ledger is `docs/release-acceptance.md`.

## Global constraints

- Preserve current local owner data; merge Galeri.TR into the primary application and move to markrobot.wowfurniture.com.tr only after verified migration.
- No client service secrets; require server-verified identity and current permissions.
- No implicit owner claim; owner financial details and membership-scoped generic collaboration notices have separate eligibility.
- Skip historical bootstrap/restore alerts; stable idempotency across network retries.
- Paid target is sldthbnigivpsqixccah; its access and region remain unverified. Never deploy to the cleaned Masarifi substitute.
- Preserve existing target data and pending WOW device work; use inventoried additive changes, with no destructive reset.

## Review focus

- A lost acknowledgement after media upload must replay the original batch successfully.
- A permission epoch change must not retain a broader projected dataset or hide newly accessible historical rows.
- Failed/offline logout must clear on-device financial notification visibility.
- Push provider acceptance is not proof that a real phone displayed a notification.
- Previously cached application code must update as one coherent release.

## Local implementation and prior retirement work

- [x] Prior retired Masarifi project: verify legacy backup and perform its scoped SQL/Storage/Auth cleanup. This does not describe a backup, reset or migration of the intended paid target.
- [x] Backend agent: implement server-derived events, queue, owner subscription API and dispatch; test authorization, encryption, deduplication, retries and import suppression.
- [x] Client agent: implement device binding, opt-in, test/unsubscribe controls, service-worker receive/click handlers and protected device history.
- [x] Sync reviewer: fix permission-epoch isolation and stable replay; label bootstrap origins; test offline recovery and sign-out locally.
- [x] Root: integrate assets and lifecycle hooks, startup refresh/error presentation and exact versioned cache hits; exercise combined entrypoint and local SQL transaction gates.
- [x] Assemble registration/recovery, correspondence, public share and quote providers; close independent local auth security findings. Add low-stock badge and the read-only 28-family history preflight.
- [x] Complete and independently review local music parity: original small bundled MP3, explicit gesture, pause on retained inactive routes/speech/session change, scoped bounded preferences, and SHA-pinned full-cache/range delivery. See `docs/gallery-music.md`, `tests/gallery-music.test.mjs`, `tests/service-worker-install.test.cjs` and `tests/reference-pack-integration.test.cjs`.
- [x] Document activation, recovery requirements and actual dashboard/device blockers in the operations guide and acceptance ledger.

Native low-balance warnings already use per-box thresholds and exact monetary units. The public legacy source's overdue/payroll options were stored toggles without reminder execution; its only balance reminder was a browser toast. Unseen private jobs remain unknown until target access is restored. New server-scheduled finance reminders are an optional, unimplemented and inactive enhancement outside base acceptance. Existing proforma/payment/expense event push is implemented and retains its live-phone gate.

## Release acceptance and remaining data/deployment gates

- [x] Record final regression (1,562/1,562, zero failures/skips), source verification (192 assets, 128 scripts, 3,995,963 bytes), zero reported audit vulnerabilities and local review. [Source job](https://github.com/wowmobilya/WOW-Galeri/actions/runs/44914543018/job/136877221453); aggregate record: `docs/verification-report.md`.
- [x] Pass all four [remote Chromium fixtures](https://github.com/wowmobilya/WOW-Galeri/actions/runs/44914543018/job/136877221302): gallery controls/RTL/PDF, real browser notification with all WOW tabs closed and the worker stopped using a simulated provider, native muted music lifecycle, and actual-root-worker cached `206` ranges/offline playback advancing without a second MP3 fetch. These use synthetic data and no live services.
- [ ] Restore authorized access to `sldthbnigivpsqixccah`, inventory its existing schema/data/plan/region and verify a recoverable backup before any change.
- [ ] Complete the historical migration: authorized private export, explicit identity/product/file-ownership map, repeatable adapters and Storage-byte verification. Current preflight retains `applyReady:false` and `objects.contentVerified:false`; no history has been imported by it.
- [ ] Validate physical-phone layout, audible music/lifecycle and offline behavior; measure field latency on the user's network.
- [ ] Run deployed Auth/Storage/Edge API smoke checks and inspect advisors; verify configured Vault/Cron/worker behavior and actual closed-app phone notifications.
- [ ] Verify SMTP/templates and real emitted challenge/token fragments, a permitted correspondence delivery, public-share hosting and enabled quote/AI provider requests.
- [ ] Verify independent Storage backup, database restoration and private recovery archive for the actual target.
- [ ] Publish the coherent release after its gates; validate public assets, real UI and device data at the new origin before DNS/`CNAME` cutover.
- [ ] Remove only retired Masarifi Edge entries through its authorized dashboard when available; this is separate from the target application's rollout.
