# Release 211 — local verification report

Verification checkpoint: **21 November 2026, 17:35 Europe/Istanbul**.

This report records executable local evidence for the assembled Mark Robot / WOW FURNITURE branch. It does not certify a hosted deployment, actual device delivery, the private project's condition, or a completed historical data migration.

## Result

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

Runtime: Node **v24.22.3**, Python **3.12.14**, pypdf **6.21.4**, PGlite **0.5.17**, fake-indexeddb **6.2.4**, server web-push **4.0.0**. The pinned CI workflow installs Node 24 and Python 3.13. Code commit `bf428ba3bff01c20babfa6711d206ee1e822976a` passed both its [pull-request run](https://github.com/wowmobilya/WOW-Galeri/actions/runs/44914543018) and [push run](https://github.com/wowmobilya/WOW-Galeri/actions/runs/44914539861). The remote source job repeated all **1,562 tests with no failures or skips** in 65.11 seconds, verified the same asset/script counts, and reported zero production dependency vulnerabilities. The independent Chromium job completed all four fixtures. [Draft PR 22](https://github.com/wowmobilya/WOW-Galeri/pull/22) remains unmerged.

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

- Intended Supabase project: **`sldthbnigivpsqixccah`**. The authorized connector again returned `You do not have permission to perform this action`. Its actual paid plan, region, private schema, records and backups remain unverified.
- Existing primary URL: **`https://galeri.wowfurniture.com.tr`**. Intended final URL: **`https://markrobot.wowfurniture.com.tr`**, following verified device-data handover. `CNAME` and DNS remain unchanged.
- Repository: **`wowmobilya/WOW-Galeri`**; isolated review branch **`feat/wow-cloud-211`**. The verified upstream base is `39ff395b76f25c5774cf3de2fe15c6d8c5ed9c9d`. The local checkout's 425 baseline file blobs matched its upstream tree before assembling this change.
- Public cloud configuration retains the correct project reference with cloud activation disabled, an empty publishable-key field and no service secrets injected. No target migration or provider activation is inferred from passing fixtures.
- The release manifest contains twelve ordered additive installation files and the actual Edge entrypoint. Inspect and back up the authorized target before applying them; do not substitute a different project or reset existing business data.

## Remaining acceptance

Native browser launch was blocked in this executor, so the fixtures were executed in the authorized GitHub Actions environment with real Chromium. The remote results below supplement the SQL/DOM fixtures; they do not establish actual target login, camera or printer operation, device storage quotas, audible physical output or installed-phone delivery.

| Executed Chromium fixture | Observed outcome |
| --- | --- |
| Gallery | Registered controls, order confirmation, a native PDF download and Arabic mobile / English desktop width passed. Business responses used synthetic fixtures. |
| Push | Both controls passed exact labels in five locales. After all WOW tabs closed and its worker stopped, a DevTools-simulated provider event produced a native browser notification; the reopened Arabic inbox contained the single expected item. No real provider or phone was used. |
| Music lifecycle | The real muted MP3 decoded, advanced and looped after a trusted click. Saved preferences did not autoplay; speech and a hidden retained route interrupted playback, including a pending native start. |
| Installed offline worker | The actual root worker installed 221 explicitly allowlisted public-shell URLs. The cached MP3 matched its SHA-256. With the browser HTTP cache disabled/cleared, online and offline range requests produced exact service-worker 206 responses, and trusted muted playback advanced offline without another track request. |

The first remote push fixture stopped at its exact Arabic-label assertion. Its synthetic document/classic-script responses were aligned with the real application’s UTF-8 declaration, bounded native UI waits and failure diagnostics were added, and all four fixtures passed on rerun without changing product behavior or weakening the assertions. Independent browser fixtures now continue after another fixture fails when browser setup has succeeded; a failing fixture still fails the job. No closed-app phone notification, real SMTP/signup/recovery message, delivered customer correspondence, live model result, public crawler preview, keyed metals quote, target Cron heartbeat or backup restoration has been accepted for this release.

Historical Galeri.TR transfer remains separate. The local tool inventories **28 source families** and validates explicit mappings and relationships; it always returns `applyReady:false`, and Storage bytes retain `objects.contentVerified:false`. Authorized private source/target exports, identity/product/file-ownership maps, verified file bytes and repeatable import adapters are still required. The financial importer does not constitute a full historical importer. Existing WOW data and the old repository must remain available through reconciliation.

Background-music parity is implemented and independently reviewed locally; its behavior, original synthesis and fixture boundaries are recorded in [the music guide](gallery-music.md) and [the acceptance ledger](release-acceptance.md). Native per-cashbox warnings already cover the working low-balance feature. The public legacy overdue/payroll toggles had no visible reminder consumer; new scheduled reminders are optional, unimplemented and inactive. Unseen private jobs remain unknown until target access. Local completion, hosted configuration, observed delivery and data restoration each need their own evidence. See [the operations guide](production-operations.md) for rollout, monitoring and recovery, and [the history transfer boundary](galeri-history-transfer.md) for the migration prerequisites.
