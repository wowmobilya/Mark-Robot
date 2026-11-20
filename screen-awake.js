/* Keep the display awake only while the shared speech owner is active. */
(function () {
  'use strict';
  const root = typeof window === 'object' ? window : null;
  const document = root?.document;
  let wakeLock;
  try { wakeLock = root?.navigator?.wakeLock; } catch (_) { return; }
  if (!document || root.isSecureContext === false || typeof wakeLock?.request !== 'function') return;

  let active = false;
  let pagePresent = true;
  let held = null;
  let pending = null;
  let revision = 0;
  let denied = false;
  let revoked = false;
  let canRecoverRelease = true;

  function visible() { return pagePresent && !document.hidden && document.visibilityState !== 'hidden'; }

  function release(lock) {
    if (!lock) return;
    try { Promise.resolve(lock.release()).catch(() => {}); }
    catch (_) { /* Navigation may already have invalidated the browser handle. */ }
  }

  function relinquish() {
    revision++;
    const previous = held;
    held = null;
    release(previous);
  }

  async function acquire() {
    if (!active || !visible() || held || pending || denied || revoked) return;
    const ticket = {revision};
    pending = ticket;
    try {
      // Called immediately from the speech-state event, including preparation.
      const lock = await wakeLock.request('screen');
      if (ticket.revision !== revision || !active || !visible()) {
        release(lock);
        return;
      }
      if (lock.released) { revoked = true; return; }
      held = lock;
      lock.addEventListener('release', () => {
        if (held !== lock) return;
        held = null;
        // Recover one unexpected loss; respect a platform that keeps revoking.
        if (canRecoverRelease) {
          canRecoverRelease = false;
          acquire();
        } else revoked = true;
      }, {once: true});
    } catch (_) {
      // Permission, power-saving and invalid-context failures must not affect speech.
      if (ticket.revision === revision) denied = true;
    } finally {
      if (pending === ticket) pending = null;
      // A request cannot be cancelled, so release stale grants before a fresh one.
      if (ticket.revision !== revision) acquire();
    }
  }

  function sync(state) {
    if (!state || typeof state.active !== 'boolean') return;
    const reading = state.active && !state.paused && state.state !== 'paused';
    if (active !== reading) {
      active = reading;
      denied = false;
      revoked = false;
      canRecoverRelease = true;
      relinquish();
    }
    acquire();
  }

  function syncOwner() {
    try { sync(root.WFProgramSpeech?.getState?.()); }
    catch (_) { /* An unavailable speech owner never prevents page interaction. */ }
  }

  root.addEventListener('wf-program-speech-state', event => sync(event.detail));
  root.addEventListener('wf-robot-ready', syncOwner);
  document.addEventListener('visibilitychange', () => {
    if (!visible()) { relinquish(); return; }
    revoked = false;
    canRecoverRelease = true;
    syncOwner();
    acquire();
  });
  root.addEventListener('pagehide', () => {
    pagePresent = false;
    active = false;
    relinquish();
  });
  root.addEventListener('pageshow', () => {
    pagePresent = true;
    syncOwner();
  });
  syncOwner();
})();
