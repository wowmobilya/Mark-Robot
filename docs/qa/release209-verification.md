# Release 209 — local accounts, permissions, and label thumbnails

## Delivered scope

The Accounts and permissions section lives in the existing Settings directory and uses its dialog, shared mobile Save/Cancel/Back controls, current fonts, color variables, and light/dark themes. It does not add an external identity service.

The first owner chooses a username and password in the app. No owner or employee is automatically provisioned in production. Existing unconfigured devices retain their current workflow until the owner enables accounts.

Owners can create employees, assign one of seven role templates, customize permissions by section/action, record a department and administrative note, set an optional expiry date, inspect allowed/hidden sections, and review recorded activity. Roles are owner, manager, sales, carpentry, assembly/installation, warehouse, and custom. There are 18 permission sections; actions are offered only where implemented.

Account lifecycle includes temporary suspension, access revocation, session revocation, password reset/change, recoverable deletion, and restoration. Restored accounts remain suspended until deliberately reactivated. The current owner and the last active owner are protected from accidental removal or loss of owner access. Account lists include status filters and name/username search.

Lost-label cards now show the saved product image alongside the model, original label sequence, package position, and unit position. Selection remains per original label, so replacing one lost label does not renumber or select the rest. Missing or failed images use a translated fallback. Image loading is lazy, initial results are bounded to 80 cards, and selection does not rebuild the whole grid.

## Identity and session behavior

- Passwords use PBKDF2-HMAC-SHA256 with 600,000 iterations, a separate random 16-byte salt per credential, and a 256-bit derived value. Password text is never returned in account snapshots or written into activity events.
- Password length is 12–128 Unicode characters. Username normalization and uniqueness are enforced by the core service.
- Five unsuccessful known-account attempts trigger a persisted 15-minute lockout. Failed login messages do not distinguish an unknown username from an unavailable account.
- Sessions stay in memory. Reloading requires sign-in; 30 minutes of inactivity or an eight-hour absolute limit expires a session.
- Account/password/permission changes increment a session version. Local tabs are notified through BroadcastChannel, with visible-page checks and a 30-second local fallback refresh.
- A restored or newly visible page verifies its identity before synchronous protected actions become available. Revalidation also refreshes navigation when the account remains valid.
- Explicit locking commits its logout event before reloading to clear drafts, previews, hydrated records, and account-specific memory.
- A competing first-owner setup cannot fall back into unconfigured access. Once configuration has been observed, an empty identity read fails closed within that service.

Identity records use a separate `WowFurnitureIdentityDB`. Business invoice backup/restore does not overwrite identities or reactivate previously suspended employees. The provider commits revisions atomically and acknowledges only completed IndexedDB transactions.

## Application enforcement and data integrity

Navigation, sidebar proxies, mobile action slots, direct action entry points, and shared reads/writes enforce the policy. Denied controls are visually suppressed even where legacy CSS uses stronger `!important` layout rules. Original inline display values are restored when a control becomes permitted. Empty sidebar groups, unauthorized search destinations, and unauthorized submenu actions are excluded.

Workshop accounts receive operational invoice/product projections without sale amounts, payment records, product costing, or bank details. Sales users can retain the bank coordinates needed by an authorized invoice or payment document without gaining settings administration. Owner-only operations include accounts administration, app settings, backup export, and restore.

The shared business writer checks fresh account state before opening a transaction, authorizes merged fields against the latest stored row, preserves restricted fields, and returns only the permitted projection after commit. A workshop merge cannot modify invoice finances. New sales invoice lines privately capture the real product cost in the business transaction while returning no cost snapshot to an employee who lacks cost visibility. Existing historical unknown costs remain unknown instead of silently acquiring today's cost.

Successful business commits append bounded activity metadata for the current actor. Print-replacement events also identify the signed-in operator. The core retains up to 500 activity events. Activity-only compare-and-swap contention has a maximum of three retry attempts, with actor/session/permission revalidation each time. Privilege mutations and storage failures keep their stricter fail-closed behavior.

## Browser verification

Tests used a disposable preview origin and synthetic business records/accounts. No production password was entered, no production employee was created, and no production account permission was changed during QA.

Observed workflows:

1. Actual Settings directory opens Accounts using the existing dialog and shared mobile action dock. The first-owner form fits a 320 px wrapper without horizontal overflow; Save/Cancel/Back and closing work.
2. The actual accounts UI lists statuses, opens employee details, edits a role, previews effective permissions, saves it, suspends the account with a reason, soft-deletes it, and restores it as suspended. The corresponding events appear in the detail activity list.
3. The full application starts as a synthetic carpenter in Manufacturing. Its sidebar displays Manufacturing and Daily tasks, with no financial destinations or unauthorized search/print shortcuts. A synthetic invoice successfully produces a manufacturing ticket and saves an in-progress line status and workshop note. The page fits the narrow phone viewport and displays operational fields without invoice amounts.
4. The full application starts as a synthetic salesperson in Invoices. Authorized invoice actions remain available; invoice deletion and owner settings remain unavailable.
5. Accounts were inspected in light and dark appearances. Arabic right-to-left layout fits 320/390 px screens; localized copy exists for Arabic, English, Turkish, French, and Russian.
6. Lost-label selection was exercised at 320 px. Clicking a thumbnail selects only that original label. The preview retains its original package/unit numbers. The missing-photo invoice renders fallback cards without image requests. All five fallback translations were checked.

Screenshots in this directory are actual browser captures of synthetic test data:

- `release208-label-thumbnails.jpg`
- `release209-accounts-setup.jpg`
- `release209-worker-mobile.jpg`

## Automated verification

The complete unit/integration gate is:

```bash
node --test tests/*.test.cjs tests/*.test.mjs
```

Final complete gate: **1,237 tests passed, zero failures**, in approximately seven seconds in the development environment. A subsequent focused access-runtime gate also passed **18/18** after making permission DOM writes idempotent. The checks cover password hashing/lockout, owner invariants, session expiry and revocation, concurrency, provider transaction completion/abort, read projections, actual shared business writer behavior, private cost capture, account UI drafts, navigation shortcuts, label selection, offline-shell installation, and asset version parity.

Additional checks include JavaScript parsing, local asset existence, and:

```bash
git -c core.whitespace=cr-at-eol diff --check
```

### Reproducing the full-app account preview

Synchronize ordinary app assets into a disposable preview directory, then run:

```bash
node docs/qa/build-accounts-app-209.cjs index.html /absolute/preview/dist/accounts-app-209.html
```

The generator refuses to write the derived application inside this checkout. Its generated page uses the actual app code with an in-memory identity provider installed before the access runtime. Open it on the disposable preview origin with `?demo=owner`, `?demo=carpentry`, or `?demo=sales`. The generated page/scripts are not production assets and are not included in the service-worker cache. The standard business database is still used, so the preview origin must contain synthetic business data only.

For isolated account UI checks, `docs/qa/accounts-209.html` provides a memory-only login fixture, authenticated role previews, and first-owner setup. All credentials in these fixtures belong exclusively to disposable synthetic accounts.

## Limits and next stage

This is the requested local-device foundation. It does not provide remote login, multi-device synchronization, server authorization, or encryption of browser business data. Someone with control of the browser profile or developer tools can bypass browser-only controls. Connecting remote employees requires a server/provider that independently authenticates sessions and enforces these permissions on each operation.

Automated tests and preview observations establish the behaviors described above, not an absence of all possible defects or a hardware-printer guarantee. Native print-dialog completion is not treated as proof that paper physically printed.
