# Release 210 — keep the owner signed in

## Problem and correction

Release 209 applied its employee session policy to the owner: 30 idle minutes,
an eight-hour session lifetime, and a page reload all required another login.
The owner must retain full administrative access while employee accounts keep
their assigned permissions and lock policy.

Verified owner sessions now remain active during inactivity. A successful
owner login or first-owner setup issues a random continuation capability for
the current browser tab. On reload, the account service checks that capability
against the active owner, current session version, and its persisted SHA-256
digest before restoring access. No password is saved in browser session storage.

Employee sessions continue to lock on reload, after 30 idle minutes, and at
eight hours. Employee login, explicit account switching, and logout clear and
revoke the previous owner continuation. Account suspension, role changes,
password changes, session revocation, storage failure, and account expiry
continue to enforce their existing checks. A worker never falls back to an owner.

Restoration is attempted once per service instance, observes authentication
cancellation, and rereads identity state after asynchronous hashing. Up to
eight independent owner tabs are retained; reauthentication replaces its own
capability before applying the limit. Public snapshots and audit records contain
neither raw capabilities nor their private hash lists.

The sidebar labels an owner's deliberate action as **Switch account**. Login
and account-detail explanations distinguish owner and employee behavior in
Arabic, English, Turkish, French, and Russian.

## Compatibility

Existing identity rows remain valid. No business records are migrated or removed.
The browser adapter uses tab-scoped `sessionStorage`; a separate tab without an
issued capability still needs authentication. If that storage is unavailable,
password-authenticated access stays in memory and a reload requires another login.

Release 209 did not save authenticated continuation proof. Someone already
locked out by that release must sign in once after updating. The correction
does not infer owner identity from account existence, names, or last-login dates.

## Verification

- Reproduced the old owner idle and reload failures before the fix.
- Added 20 owner-continuation regressions and three application-access integration
  cases, including forged/stale capabilities, logout, worker switching, private
  output, storage failures, version revocation, cancellation, and capacity.
- Independent review reproduced and corrected an eight-tab replacement edge case.
- Full unit/integration gate: `node --test tests/*.test.cjs tests/*.test.mjs`:
  **1,260 passed, zero failed**.
- Project test command `npm test`: **6 passed, zero failed**.
- Offline installation tests verify that the new account assets are downloaded
  and that HTML and service-worker asset versions agree.
- JavaScript parsing and CRLF-aware diff checks passed.

Browser verification on the user's own signed-in device was unavailable. The
tests use synthetic accounts and do not change production account records.
