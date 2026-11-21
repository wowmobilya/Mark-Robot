# Mark Robot — verification and release status

Current source: **release 215**, with the final local regression, source verification and independent review completed. The dated published baseline is **release 214, commit `d1ef471e79e97bca8093d04ef10c49f3bc2f5a87`**, verified on 21 November 2026. Check [GitHub Actions](https://github.com/wowmobilya/Mark-Robot/actions) for delivery and CI evidence tied to the current commit. Evidence below distinguishes source verification, exact-commit deployment, read-only backend observations and acceptance that still requires real devices or providers.

## Release 214 — observed CI and deployment

| Gate | Observed result |
| --- | --- |
| Complete Node regression suite | **1,621 passed; 0 failed, cancelled, skipped or todo.** Duration 52.476 seconds in [source job 136964182334](https://github.com/wowmobilya/Mark-Robot/actions/runs/44943025851/job/136964182334). |
| Release source verifier | 192 referenced assets, 129 parsed scripts, 4,000,864 referenced bytes on the same commit. |
| Server production dependency audit | `npm audit --prefix supabase --omit=dev --audit-level=high`: zero reported vulnerabilities. |
| Remote Chromium | All four isolated browser fixtures passed in [job 136964182536](https://github.com/wowmobilya/Mark-Robot/actions/runs/44943025851/job/136964182536): gallery/RTL/PDF, simulated-provider closed-tab push, muted native music lifecycle, and actual-root-worker offline MP3 byte ranges/playback. |
| GitHub Pages | [Run 44943025847](https://github.com/wowmobilya/Mark-Robot/actions/runs/44943025847) succeeded. The deploy log names commit `d1ef471e79e97bca8093d04ef10c49f3bc2f5a87` and environment URL `https://markrobot.wowfurniture.com.tr/`. |

The complete [quality run 44943025851](https://github.com/wowmobilya/Mark-Robot/actions/runs/44943025851) succeeded. Its results apply to the dated release 214 baseline; later source and deployment results are recorded separately. Browser fixtures use simulated business/provider responses and muted playback, so successful CI does not establish actual phone delivery or audible output.

## Backend observation — approximately 20:15 UTC, 21 November 2026

A read-only provider check reported project `sldthbnigivpsqixccah` as `ACTIVE_HEALTHY` and `wow-cloud` as `ACTIVE`, version 2, with bundle SHA-256 `9bfc7a5d3eb3aa6c9bab5a018b2cdf3abe88c22491454a92fcb5446e65c21c72`. Migration history contained `20261121190038 / mark_robot_release_211` and `20261121192913 / mark_robot_offline_owner_signing`.

All six WOW Cron jobs were enabled. Successful/failed completions in the preceding-hour query were: `wow-assistant-receipts` 4/0; `wow-customer-auth-prune` 1/0; `wow-customer-correspondence` 60/0; `wow-operations` 12/0; `wow-push-retry` 51/0; `wow-storage-maintenance` 6/0. These are observed job completions, not evidence of provider delivery, model generation, or a backup restore. The [acceptance ledger](release-acceptance.md) records the last observed completion times and the earlier live owner/Auth/Storage/activation/grant results.

## Release 215 — final local verification

The stable [owner-startup and release-version source](releases/215-owner-startup.md) passed the final checks after independent review of all changed areas:

| Gate | Observed result |
| --- | --- |
| Complete Node regression suite | **1,675 passed; 0 failed and 0 skipped.** Command: `node --test --test-concurrency=2 tests/*.test.cjs tests/*.test.mjs`. Duration: `61941.180697 ms`. |
| Release source verifier | Release 215; **192 referenced assets, 129 parsed scripts, 4,011,300 referenced bytes**. |
| Focused authentication checks | **106/106 passed**. These overlap the complete suite and are not added to its total. |
| Independent review | Review of all changed areas cleared blocking findings, including owner continuation/logout behavior under storage failures within the documented limits. |

Publication of release 215 had not been recorded at this final local checkpoint. Successful CI and Pages deployment for the source commit must be established separately through [GitHub Actions](https://github.com/wowmobilya/Mark-Robot/actions). Neither these local results nor deployment alone establish actual-device updates, provider delivery or historical-data handover.

## Historical release 211 checkpoint

Original verification checkpoint: **21 November 2026, 17:35 Europe/Istanbul**. The following results describe that earlier local and CI state, not the current deployment. The earlier access-denied, disabled-cloud and unchanged-domain conditions were superseded by the deployment and observations above.

| Gate | Observed result |
| --- | --- |
| Complete Node regression suite | **1,562 passed; 0 failed, cancelled, skipped or todo.** Duration 50.96 seconds. |
| Release source verifier | `RELEASE_SOURCE_VERIFIED`: 192 referenced assets, 128 parsed scripts, 3,995,963 referenced bytes. |
| Whitespace | `git -c core.whitespace=cr-at-eol diff --check` completed successfully. |
| Root dependency audit | `npm audit --json --ignore-scripts`: zero reported vulnerabilities. |
| Server production dependency audit | `npm audit --omit=dev --json --ignore-scripts` in `supabase`: zero reported vulnerabilities. |
| Modified/new-file credential scan | 194 files scanned; no matches for the configured private-key, provider-token, GitHub-token, Supabase-secret or long credential-assignment patterns. No private export/key/archive paths in the publication set. This is a bounded pattern scan, not proof of the absence of all secrets or defects. |
| Independent specialist review | Findings in the reviewed authorization, customer recovery, financial quotes, public sharing, correspondence, storage/notification and music lifecycle/cache boundaries closed. |
| Remote Chromium | All four synthetic native-browser fixtures passed on code commit `bf428ba3bff01c20babfa6711d206ee1e822976a`. Physical phones, audible speaker output and the hosted target remain separate. |

Commands:

```sh
npm run verify:release
node --test --test-concurrency=2 tests/*.test.cjs tests/*.test.mjs
git -c core.whitespace=cr-at-eol diff --check
npm audit --json --ignore-scripts
npm audit --prefix supabase --omit=dev --json --ignore-scripts
```

Runtime at that checkpoint: Node **v24.22.3**, Python **3.12.14**, pypdf **6.21.4**, PGlite **0.5.17**, fake-indexeddb **6.2.4**, server web-push **4.0.0**. The pinned CI workflow installs Node 24 and Python 3.13. Code commit `bf428ba3bff01c20babfa6711d206ee1e822976a` passed both its [pull-request run](https://github.com/wowmobilya/Mark-Robot/actions/runs/44914543018) and [push run](https://github.com/wowmobilya/Mark-Robot/actions/runs/44914539861). The remote source job repeated all **1,562 tests with no failures or skips** in 65.11 seconds, verified the same asset/script counts, and reported zero production dependency vulnerabilities. The independent Chromium job completed all four fixtures. [PR 22](https://github.com/wowmobilya/Mark-Robot/pull/22) was subsequently merged on 21 November at `17:05:55 UTC`, with merge commit `2863c246f450ca54ea97a6434b3779905f3a00e3`.

The first complete run found five failures. Four occurred before the speech/cache assertions because the worker fixture omitted the real browser's `WorkerLocation.href`; that fixture now provides the worker URL and resolves requests against it. The fifth asserted that random Base64 ciphertext could not contain the short sequence `E1`. It now independently decrypts the exact PostgreSQL receipt with AES-256-GCM, verifies its IV and authenticated ciphertext size, and requires a different key or account/session binding to fail authentication. A full 1,530-test baseline passed after both corrections. The complete 1,562-test follow-up above also includes the music lifecycle and immutable-cache regressions; no product checks were disabled.

## What the suite exercises

- The actual assembled Edge entrypoint, all migrations in the release manifest installed twice, current capability catalog, RLS and private function privileges. Provider-owned network integrations use explicit fixtures.
- Canonical WOW products, companies, invoices, payments and cashbox authority; exact financial values, duplicate prevention, compensating actions, stock reservation/reversal and owner-only financial notifications.
- Customer email proof bound to its particular request and workspace; fixed customer principals that cannot become staff/owners during password recovery; cleanup that does not revoke another user's unrelated session.
- Correspondence recipient and sender revalidation, expiry/anonymous-account denial, internationalized-domain mailbox compatibility, immutable provider payloads, bounded retry, idempotency and signed delivery-event processing.
- Scoped IndexedDB queues and media, reload and multiple-tab leases, quota failures, permission changes, stale replies and account switching. Pending work is preserved rather than silently reported as delivered.
- Push encryption and routing, account-bound service-worker storage, hidden/withdrawn public shares and sensitive email callback URLs excluded from application cache replay.
- Optional gallery music with trusted-gesture playback, scoped bounded preferences and interruption on speech, account changes, or a retained inactive route. The actual 128,832-byte MP3 is SHA-256-pinned; cache/network HTML fallbacks, truncation and same-length corruption are rejected. Warm offline byte ranges return the exact original bytes without a network request.
- Reference quote decimal fidelity and maximum observation age; private AI source projections, encrypted answer receipts, metering and cross-account denial.
- Real generated PDF parsing/decryption, application locale coverage, registered DOM controls and exact client/server policy copies.

Focused suites overlap the complete run and one another; their counts are not added to the aggregate result.

## Project and publication boundary

- Supabase target: **`sldthbnigivpsqixccah`**. The earlier permission denial is historical; the read-only observation above confirms the active project, function and migration records. Successful access and job execution do not prove subscription terms, backup completeness or successful restoration.
- Published origin: **`https://markrobot.wowfurniture.com.tr`**. Commit `8e1a5b8c54519ea03c6ab9c24790c97d73c3d518` changed `CNAME`; the later DNS/HTTPS acceptance and release 214 Pages log are recorded in the [acceptance ledger](release-acceptance.md). The previous `https://galeri.wowfurniture.com.tr` origin returned 404 without a redirect in the recorded handover check. Old-origin IndexedDB and pending device work still require explicit handover.
- Canonical repository: **`wowmobilya/Mark-Robot`**, renamed from `wowmobilya/WOW-Galeri`; PR 22 from **`feat/wow-cloud-211`** is merged. The 425-file match to original base `39ff395b76f25c5774cf3de2fe15c6d8c5ed9c9d` remains historical baseline evidence only.
- Published public configuration has the intended project reference, `enabled:true`, a publishable key and the offline-grant public pin. The service endpoint is `https://sldthbnigivpsqixccah.supabase.co/functions/v1/wow-cloud`; private service/signing/provider secrets remain server-side. Backend deployment is supported by the provider observation, not inferred from passing fixtures.
- The current [release manifest](../supabase/release.json) lists thirteen ordered additive SQL files, including the service-only offline-owner signer, and the actual Edge entrypoint. Both deployed migration records were observed above. Further changes still require inspection and backups of the intended target; they do not authorize reset or historical-data deletion.

## Remaining acceptance

At the original checkpoint, native browser launch was blocked in the local executor, so the fixtures were executed in GitHub Actions with real Chromium. The historical results below and the successful release 214 rerun supplement SQL/DOM fixtures. Separate live owner/Auth/Storage checks are recorded in the acceptance ledger; the browser fixtures themselves do not establish camera or printer operation, device storage quotas, audible physical output or installed-phone delivery.

| Executed Chromium fixture | Observed outcome |
| --- | --- |
| Gallery | Registered controls, order confirmation, a native PDF download and Arabic mobile / English desktop width passed. Business responses used synthetic fixtures. |
| Push | Both controls passed exact labels in five locales. After all WOW tabs closed and its worker stopped, a DevTools-simulated provider event produced a native browser notification; the reopened Arabic inbox contained the single expected item. No real provider or phone was used. |
| Music lifecycle | The real muted MP3 decoded, advanced and looped after a trusted click. Saved preferences did not autoplay; speech and a hidden retained route interrupted playback, including a pending native start. |
| Installed offline worker | The actual root worker installed 221 explicitly allowlisted public-shell URLs. The cached MP3 matched its SHA-256. With the browser HTTP cache disabled/cleared, online and offline range requests produced exact service-worker 206 responses, and trusted muted playback advanced offline without another track request. |

The first remote push fixture stopped at its exact Arabic-label assertion. Its synthetic document/classic-script responses were aligned with the real application’s UTF-8 declaration, bounded native UI waits and failure diagnostics were added, and all four fixtures passed on rerun without changing product behavior or weakening the assertions. Independent browser fixtures continue after another fixture fails when browser setup has succeeded; a failing fixture still fails the job. The later provider observation confirms scheduled-job completions, but no closed-app phone notification, real SMTP/signup/recovery message, delivered customer correspondence, live model result, public crawler preview, keyed metals quote, external monitor alert or backup restoration has been accepted here. The recorded live `assistant.status` read returned `provider.configured:false`; no generation was attempted by that check.

Historical Galeri.TR transfer remains separate. The local tool inventories **28 source families** and validates explicit mappings and relationships; it always returns `applyReady:false`, and Storage bytes retain `objects.contentVerified:false`. Authorized private source/target exports, identity/product/file-ownership maps, verified file bytes and repeatable import adapters are still required. The financial importer does not constitute a full historical importer. Existing WOW data and the old repository must remain available through reconciliation.

Background-music parity is implemented and independently reviewed locally; its behavior, original synthesis and fixture boundaries are recorded in [the music guide](gallery-music.md) and [the acceptance ledger](release-acceptance.md). Native per-cashbox warnings already cover the working low-balance feature. The public legacy overdue/payroll toggles had no visible reminder consumer; new scheduled reminders are optional, unimplemented and inactive. Observing the six WOW jobs above does not establish additional historical reminder behavior. Local completion, hosted configuration, observed delivery and data restoration each need their own evidence. See [the operations guide](production-operations.md) for rollout, monitoring and recovery, and [the history transfer boundary](galeri-history-transfer.md) for the migration prerequisites.
