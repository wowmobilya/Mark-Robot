# مارك ربوت — WOW FURNITURE backend

This directory contains the backend foundation and encrypted Web Push implementation for the existing app. The final website address is **https://markrobot.wowfurniture.com.tr**, now verified over HTTPS with status 200. The previous `galeri.wowfurniture.com.tr` origin remains allowed for controlled data handover, but currently returns 404 without a redirect. Changing origins does not move a browser's IndexedDB data; owner-device data handover remains a separate acceptance gate.

**Status — 2026-11-21, activation release 213:** `wow-cloud` is ACTIVE at version 2 on `sldthbnigivpsqixccah`, with bundle SHA-256 `9bfc7a5d3eb3aa6c9bab5a018b2cdf3abe88c22491454a92fcb5446e65c21c72`. A dedicated WOW owner and workspace are provisioned. All 18 live Auth/refresh/sync/private-Storage checks passed, followed by six provider-backed owner-activation checks: proof generation, redemption, snapshot, replay rejection (401), probe-session sign-out and preservation of the principal session. The release 213 frontend was published from `34d0b98a8d273a76df90913337f6a4eb65582e73`: [Pages run 44942692832](https://github.com/wowmobilya/Mark-Robot/actions/runs/44942692832) succeeded, and actual HTTPS 200 responses verified the early fragment scrubber, `enabled:true` configuration and service worker 213. No actual phone UI, delivered push, AI/email provider operation or historical-data migration is claimed. See the [deployment record and remaining acceptance gates](../docs/release-acceptance.md).

The initial foundation migration `mark_robot_release_211` followed a successful full-schema rollback rehearsal. Its 12 production SQL files matched `c7ea6e7ab2349d6b461d78c1245653bd3c6e4caa`. The audit immediately after that migration matched the counts and SHA-256 fingerprints of all 84 legacy tables and metadata for 163 Storage objects; the seven existing buckets, existing Storage policies, and then-existing Auth user/session state and trigger matched. File contents were not fetched or rehashed. That historical audit preceded the dedicated owner provisioning and its intentional new records. The 62 foundation tables had RLS enabled, and the 97 application functions and seven private schemas denied browser-role access.

The fixed, service-only Vault signer migration has now been applied. Six Vault slots are configured, and the sixth WOW Cron job, `wow-push-retry`, is active. An authenticated private-worker probe returned 200 with `sent:0`; this establishes worker access and configuration, not notification delivery. The first five Cron jobs were already active; correspondence had observed successful runs at 19:01 and 19:02 UTC. The live offline-owner grant returned HTTP 200 and passed 16 checks using the application’s browser-verifier code, including ES256, exact 24-hour expiry, and pin/user/workspace/device/epoch binding without private fields. Actual-device cold reopening, backup restoration and external provider delivery remain independent gates.

## Files

| File | Purpose |
|---|---|
| `wow-schema.sql` | Additive foundation schema, service RPC, session/account guards, atomic business sync, private media, owner push queue, Dashboard views |
| `functions/wow-cloud/index.ts` | One Edge entry point for the app API and the separately authenticated private push worker |
| `functions/wow-cloud/core.mjs` | Verified Auth actor, request limits, field projection/preservation, trusted costs, CAS batch preparation, module dispatch |
| `functions/wow-cloud/rest.mjs` | Native Auth, PostgREST and Storage calls; fixed module RPC allowlist |
| `functions/wow-cloud/push-events.mjs` | Financial event derivation plus bounded financial, chat, gallery and operations copy in Arabic, English, Turkish, French and Russian |
| `functions/wow-cloud/push-security.mjs` | Push endpoint allowlist, real P-256 key validation, input bounds and token comparison |
| `functions/wow-cloud/push-worker.mjs` | Encrypted Web Push, fresh recipient check, bounded parallel sends, retry/dead-endpoint classification |
| `modules/notifications.sql` | Atomic handoff from private chat, gallery and operations outboxes into the same leased queue |
| `management/initialize-push.mjs` | Management-only initialization helper; not imported by the public Edge entry point |
| `testing/provider-fixtures.mjs` | Shared local PostgreSQL harness; provider-owned integration surfaces are explicit test doubles |
| `config.toml` | Edge configuration, including application-level JWT verification |
| `modules/` | Separately owned feature modules; apply after the foundation and assemble their action maps in the entry point |

The three copied policy/cost modules under `functions/wow-cloud/` must match their browser counterparts whenever either changes. The deployment bundle needs all imported files; management and testing files are not public request handlers.

## Verification

Release 214 prepares a narrow startup guard: remote-owner entry skips legacy Google Drive onboarding and automatic backup after the browser exposed that prompt. Its focused storage/activation checks passed 49/49 and service-worker/push checks passed 29/29; source verification still reports 192 assets, 129 scripts and 4,000,864 bytes. The 1,620-test full-suite result below belongs to release 213; no full local rerun is claimed for this follow-up, which is awaiting publication/CI.

The final release 213 working tree passed **1,620/1,620 local release tests**, with no failures or skipped tests, and the source check verified **192 assets, 129 scripts and 4,000,864 bytes**. The suite includes owner proof replay/expiry/scope rejection, candidate-session cleanup, early fragment removal, owner reload continuation and employee isolation. Historically, baseline `c7ea6e7` passed 1,566 tests and the earlier source check (192 assets, 128 scripts, 3,996,233 bytes). The later five-test targeted run corrected only the push gate's synthetic cash-receipt fixture; the full final run includes that regression. No production finance rule was changed.

Run from the repository root:

```sh
npm ci --prefix supabase --ignore-scripts
npm test --prefix supabase
```

The local suite exercises protected fields and trusted cost capture, actor/session binding, authenticated module dispatch, CORS, opaque/legacy API-key headers, lost upload acknowledgements, historical-origin suppression, bounded media reference lookup, actual `aes128gcm` encryption/decryption, VAPID signature verification, five notification languages, push endpoint validation, and worker authentication.

It also compiles and executes the actual foundation schema in PostgreSQL via pinned PGlite. The local harness substitutes only provider-owned Auth/Storage/Vault/Cron/Net surfaces; business tables, policies, triggers, functions, transactions and `pgcrypto` execute in PostgreSQL. This caught a PL/pgSQL name collision before deployment. It is not a replacement for live provider integration tests.

Both rollback-only gates passed in the revised full-schema rehearsal through the authorized management connection before deployment:

- `../tests/wow-cloud-server-transaction.sql`: anonymous/authenticated grants, Storage isolation, owner and worker timeout rules, direct Dashboard suspension, epoch revocation, batch replay, whole-batch CAS rollback, invoice uniqueness, typed IDs, tombstones, immutable media timestamps, reference pagination, last-owner protection, and one-time proof replay.
- `../tests/wow-cloud-server-push-transaction.sql`: run **before real push initialization**. It checks secret isolation, endpoint ownership, owner-only finance recipients, atomic event creation, exact retry deduplication, import suppression, queue leases, expired-lease recovery, provider retry, dead endpoint cancellation, account bans, endpoint rotation and epoch revocation.

These gates create synthetic Auth rows without passwords or usable login credentials and roll them back. They do not borrow real user identities. The push gate also rolls back its synthetic Vault/Cron/Net rows. Keep each complete `BEGIN … ROLLBACK` transaction intact. `pg_net` sends only after commit, so no test notification is sent. Sequence gaps after rollback are normal. The local harness verifies zero fixture identities, workspaces, secrets and network calls remain.

Live owner Auth/refresh/sync/private-Storage and one-time activation checks have passed. Remaining gates include restricted employee/customer flows, two-device offline reconciliation, device-bound cold reopening, backup restoration, and a permitted device receiving an encrypted push with the app closed. The server signer is configured through its service-only Vault lookup; the matching public pin is published in frontend configuration. Live grant issuance and all 16 verifier checks have passed; actual device reopening remains separately recorded. A provider HTTP success is not proof that the operating system displayed a notification.

## Trust and data boundaries

The browser sends a real Supabase Auth access token. Edge verifies it with Auth before extracting `session_id`. Body fields never select the actor. Each protected SQL operation independently checks the Auth session and user, workspace, account status/expiry, current `session_version`, and the app session inside its transaction. A banned/deleted/anonymous Auth user is rejected. Workers expire after 30 minutes of inactivity or eight hours from login; owners are exempt from those two worker limits. Refresh and snapshot calls do not count as activity.

Raw WOW tables and private RPCs are denied to `anon` and `authenticated`; service operations are restricted to `service_role`. Browser permissions cannot be upgraded by sending a role or calling a module by name. The optional server-assembled `moduleActions` map cannot replace public/core actions. Every module receives `{body,actor,request}` after Auth verification, must construct its own allowed payload, and must call the live SQL actor guard before reading or changing data. REST allows only `wow_gallery_service`, `wow_chat_service`, `wow_files_service` and `wow_finance_service` as module RPC targets.

The existing pure policy and data-policy code runs on the server. A worker's visible changes are merged into the latest raw record; omitted hidden finance fields survive. New invoice lines capture costs from server product records. SQL rechecks session epoch, business revisions and referenced product revisions while holding the workspace transaction lock. A single conflict rolls back the whole batch, including payment/invoice pairs and notification events.

Record IDs retain JSON number/string type. Record revisions increment by one; the separate global change cursor orders pulls. A push acknowledgement never advances the client's pull cursor. Tombstones remain available. Batch responses cannot be replayed after an account's epoch changes.

The private `mark-robot-private` bucket has a restrictive policy that excludes browser access even if a broad permissive policy is added later. App images use immutable content paths and signed URLs lasting 60 seconds. Canonical upload metadata comes from the original persisted staging row, so a lost upload acknowledgement cannot change a retry's batch hash. Workers must prove a currently visible referring record before a media URL is signed. Reference expansion is seek-paginated with an explicit budget; exhaustion returns `MEDIA_LOOKUP_LIMIT` without advancing sync, rather than silently losing an asset. Chat/files cleanup accepts only the fixed server-generated path grammar `(chat|files)/workspaceUUID/accountUUID/assetUUID/sha256`.

## API contract

All app actions use `POST /functions/v1/wow-cloud` with JSON `{action,...}`. Success is `{ok:true,...}`. Errors are `{ok:false,error:{code,message,conflicts?,retryAfter?}}` with the corresponding HTTP status. Public actions are explicitly limited to `auth.enrollOwner`, `auth.signIn`, `auth.refresh`, `auth.activateOwner` and the four named customer-auth proof/options actions. `auth.ownerActivationLink` is authenticated and owner-only.

| Action | Input and behavior |
|---|---|
| `auth.enrollOwner` | `{setupToken,name,username,password}`; management-issued, scoped, expiring, single-use proof |
| `auth.signIn` | `{workspaceId?,username,password}`; omission resolves only when exactly one active WOW workspace exists |
| `auth.refresh` | `{refreshToken}`; never reopens or extends an expired worker app session |
| `auth.ownerActivationLink` | Active owner requests a self-bound, one-time provider proof link; no arbitrary email, user or redirect input |
| `auth.activateOwner` | `{tokenHash,workspaceId,userId}`; verifies the provider proof and real active owner/workspace, then opens a normal session; failed candidates are signed out locally |
| `auth.signOut` | Closes that app/Auth session and deactivates its push subscriptions |
| `session.snapshot`, `session.touch` | `{workspaceId,identity}`; explicit touch renews eligible worker activity |
| `accounts.create/update/status/restore/setPassword/changePassword/revokeSessions` | Owner management, except authenticated self-password change |
| `permissions.assert`, `activity.record` | Live permission assertion; client activity is labeled separately from server audit |
| `sync.push` | `{batchId,deviceId,origin?,operations:[{store,id,kind,baseRevision,value?}]}`; maximum 100 operations; atomic CAS and idempotency |
| `sync.pull` | `{cursor,limit}` → `{changes,cursor,hasMore}`; bounded pages including tombstones |
| `sync.inspect` | Owner-only `{records:[{store,id}]}` → current records; absent records return revision 0 and `deleted:true` |
| `media.upload` | `{id,data:dataURL}` → canonical immutable private object metadata; commit metadata through normal sync |
| `media.download` | `{id,storagePath}` → short-lived URL for that exact current permitted path |
| `push.config` | `{publicKey}` for the owner or a cloud account with `chat.view`, `gallery.view`, `orders.view` or `myorders.view` |
| `push.subscribe` | Eligible account sends `{subscription:{endpoint,keys,expirationTime},deviceId,language}` and receives `{subscribed,subscriptionId,bindingId,financial}` |
| `push.unsubscribe` | `{endpoint,deviceId}` removes the current authenticated session’s exact device binding |
| `push.test` | `{deviceId}` queues a rate-limited generic test for that account, session and device. `{queued,eventId}` acknowledges the request |

Auth responses contain `{session:{access_token,refresh_token,expires_at},workspaceId,identity}`. Identity includes `{configured,revision,currentAccount,accounts,audit}`. Account IDs are Auth user IDs. Workers see their own identity; owners can manage workspace accounts.

`sync.push.origin` is `live` by default. Only owners may explicitly use `bootstrap` or `restore`; those origins suppress historical financial alerts and are recorded in audit. Origin participates in the retry hash and must remain immutable in the durable outbox. Incoming client `pushEvents` are ignored. Server code derives drafts from validated committed candidates and previous server records.

## Financial and shared notifications

Invoice creation, important edits and deletion produce proforma events. Payments produce events from the canonical payment store; invoice payment mirrors do not create a second notification. Cashbox entries produce expense/receipt events with amounts from integer units. Invoice totals are labeled USD because that is the application's stored total basis; payment original currencies are preserved when present. Deleted-record notices use the previous server record.

Event rows and recipient jobs are created inside the same business transaction. Each event/subscription pair is unique. The queue wakes the private worker after commit through `pg_net`; a one-minute Cron job retries if the wake or delivery fails. The worker claims bounded leased pages, uses four concurrent sends, encrypts with `aes128gcm`, signs with VAPID, and checks the live recipient again immediately before sending. It rechecks the current workspace and account, Auth and app session, subscription binding, account epoch, and event-specific eligibility. A 404/410 response deactivates the dead endpoint. Temporary errors retry with a bounded delay and attempt count; expired leases return to the queue.

Financial details and operations alerts go only to opted-in owners. Chat notifications contain generic copy and the room and message identifiers. Membership, mute, read and clear positions, hiding, deletion and disappearance are checked again before delivery. Gallery notifications contain generic copy and a typed product or order identifier. The gallery’s own visibility, ownership, publication and revision queries select the recipient and destination. The private operations query rechecks owner status and the current incident revision.

Apply `modules/notifications.sql` after the updated foundation, chat, gallery and operations SQL. Any of the three outboxes wakes the existing Vault-authenticated worker after commit. Its existing minute job also catches missed wakes. Each claim atomically consumes up to 16 unhandled rows per source, creating jobs only for devices already opted in when the event occurred. An ineligible or stale outbox row is consumed without a delivery. Stable source and device keys make transaction retries idempotent. Raw message text, order notes, prices and incident details stay out of shared pushes.

Each encrypted payload includes the workspace, account, device, server-issued binding, account epoch and expiration. Acting on a queued notification requires the same locally active binding. Staff delivery expires with the app session, including its 30-minute inactivity and eight-hour absolute limits. The client keeps 60 recent received events and resolves clicks through fixed permission-checked module routes. Previously enrolled devices refresh their binding on the next authenticated app open. Endpoint and encryption-key rotation cancel queued jobs tied to the previous binding. Provider transport uses explicitly permitted HTTPS hosts and rejects redirects.

Delivery is at least once. The service worker deduplicates event IDs; browser permission, OS policy, connectivity and vendor delivery behavior still control when an alert is displayed. Signing out/unlinking or revoking the account stops new sends after the server check. An already dispatched encrypted message cannot be recalled.

## Deployment sequence

1. Confirm access to the intended, healthy Supabase project, its plan and required Vault/Auth/Storage capabilities. No new project or paid upgrade is performed by these files. The schema enables `pgcrypto`, `pg_net` and `pg_cron`; Vault must be available. Apply `wow-schema.sql`, then reviewed module migrations in dependency order.
2. Run both full rollback gates before initializing real push. Run module gates and verify actual provider/RLS/Storage behavior. Do not publish a partial module set.
3. Deploy the single `wow-cloud` Edge function with `verify_jwt=false`. Its protected app actions perform their own Auth verification. `/functions/v1/wow-cloud/push-worker` accepts only POST with the separate high-entropy `X-Wow-Worker-Token` stored in Vault; it is not an app action or public initializer.
4. Read built-in `SUPABASE_URL` and prefer `JSON.parse(SUPABASE_SECRET_KEYS).default`; retain the legacy `SUPABASE_SERVICE_ROLE_KEY` only as a compatibility fallback. Opaque keys go in `apikey` only. Authorization carries a real user JWT where required. Default CORS origins are the new and previous production origins; remove the previous origin after the verified migration.
5. Create one workspace and one management-issued enrollment proof. Generate the raw token privately; store only its SHA-256 hash. Credentials may be provisioned privately under the owner's authorization, followed by the one-click owner proof flow; no credential belongs in public configuration. A visitor or an administrator of an old app is never inferred to be an owner.
6. Initialize push through an authenticated transient management context using `management/initialize-push.mjs`, the runtime's own `SUPABASE_URL`/server key and `generateVAPIDKeys` from pinned `npm:web-push@4.0.0`. Never expose this helper as an unauthenticated route. It returns only public metadata. Remove/disable the transient management entry point after verification.
7. Enroll an owner and eligible restricted account on separate devices. Test actual closed-app financial, chat and gallery delivery, mute/read and revocation, and opening the correct authorized item. Test an installed iOS Home Screen app and an Android or desktop browser. Verify the account/sync/media flows with a restricted worker. Verify the old-origin local-data migration, then publish the combined app and domain change.

Management seed template (replace the hash placeholder only after private token generation):

```sql
with workspace as (
  insert into public.wow_workspaces(name) values ('WOW FURNITURE — مارك ربوت') returning id
)
insert into public.wow_setup_claims(token_hash,workspace_id,expires_at)
select 'REPLACE_WITH_64_HEX_SHA256', id, now()+interval '24 hours' from workspace
returning workspace_id, expires_at;
```

Run the workspace seed once; proof renewal targets the same still-unconfigured workspace. Never put the raw proof in Git, a URL, an app config file or a SQL notebook.

`wow_push_configure` derives the worker URL from the management initializer's verified project origin. The SQL stores the origin and checks the exact route again before every wake; no project ID is hardcoded in production source. It creates five named Vault secrets (`wow_push_vapid_public`, `wow_push_vapid_private`, `wow_push_worker_token`, `wow_push_worker_url`, `wow_push_vapid_subject`) and the exact `wow-push-retry` Cron job. Idempotent initialization preserves existing keys; mismatched origins, partial configuration and conflicting Cron definitions fail closed. Private values are never returned by the public API or Dashboard control views.

## Dashboard controls and operational limits

`wow_control_accounts`, the foundation record/metrics views and `wow_control_push` expose clear management information. Push health includes active owner devices, events in the previous day, pending deliveries, acknowledged sends and failures. Raw endpoint/key material stays out of these views. Account status/permission/expiry changes made directly in the Dashboard bump the session epoch and cancel stale owner push subscriptions. The last active owner cannot be removed.

Auth administration and membership changes span two services. New Auth creation has compensating deletion if membership creation fails. Password rotation invalidates app sessions before the Auth update; if that external call fails, the old password may remain while other sessions are already revoked. The UI must show the error and allow a controlled retry. The owner login/refresh and private Storage acceptance checks have passed; other account roles and provider-failure recovery still require their own live acceptance.

Previously issued media URLs can remain usable until their 60-second expiry. Revoking access cannot erase already downloaded files or offline browser data. Notifications are generated from successful server commits; a change that remains offline in the outbox produces its notification only after it synchronizes.

## Primary references and pinned packages

- [Supabase API-key migration and Edge headers](https://supabase.com/docs/guides/getting-started/migrating-to-new-api-keys)
- [Supabase Edge authorization headers](https://supabase.com/docs/guides/functions/auth-headers)
- [Supabase database security](https://supabase.com/docs/guides/database/secure-data)
- [Private Storage downloads](https://supabase.com/docs/guides/storage/serving/downloads)
- [Scheduling Edge functions](https://supabase.com/docs/guides/functions/schedule-functions)
- [pg_net transaction behavior](https://supabase.com/docs/guides/database/extensions/pg_net)
- [web-push maintained package and encryption API](https://github.com/web-push-libs/web-push)
- [PGlite API and local PostgreSQL](https://pglite.dev/docs/)

`web-push` is pinned to **4.0.0**, verified as current on 2026-11-21. Test-only PGlite is pinned to **0.5.17**. Lockfiles record transitive dependencies. The production entry point dynamically imports Web Push only for the private worker, keeping ordinary app requests independent of its crypto initialization.
