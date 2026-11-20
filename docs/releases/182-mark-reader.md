# Release 182 — Mark reader and persistent playback

## Requested behavior

Keep Mark as the only reading voice and Syrian Arabic as the only Arabic reference. Reuse the installed model package. Replace indefinite starting states with bounded activation and useful engine diagnostics. Keep reading across application sections, report minimization and background visibility. Provide pause, resume, stop, system media controls, a larger draggable reader, robot eyes, actual spoken-sentence highlighting and automatic following.

## Changes

- Capture child-worker startup failures from construction, before the pinned engine installs its initialization rejection callback. A regression executes the actual bundled engine module and reproduces the former unsettled initialization.
- Bound foreground AudioContext activation and recovery; preserve PCM and worker credit during intentional pauses and background interruptions. Forward real engine progress and preserve sentence boundaries through synchronous pauses.
- Normalize saved voice preferences to reference / sy / non-buffered reading. Keep user rate, volume and enabled preferences. Installed weights, reference assets, hashes, cache marker and vendor runtime are unchanged.
- Separate installed-package status from engine readiness. Preparation retries use the existing package. The settings panel has one Mark card and distinct generated-reading and recorded-greeting previews.
- Retain active ownership across navigation, settings dismissal, hidden cards and tab visibility. Actual page teardown, explicit Stop, disable/mute and incompatible preference/language changes still dispose resources.
- Add app-wide controls and Media Session play/pause/stop handlers. Notification metadata contains generic titles, not report data. Use Audio Session playback where supported and release screen wake locks during pause/background visibility.
- Combine the report, robot eyes and transport into one responsive dark reader. Touch dragging snaps between top/expanded and bottom/compact states; keyboard alternatives remain available. Minimizing retains the exact snapshot and spoken sentence. Highlights follow actual sentence playback; no synthetic word timestamps are presented.

## Verification and limits

- Full repository run: 374 tests, 372 passed. The two failures are the pre-existing navigation mock (`item.closest`) and stale primary-color asset assertion, both previously reproduced at release 179.
- `npm test`: 6 passed. JavaScript syntax, installed asset integrity, update-without-model-redownload, script paths and CRLF-aware whitespace checks passed.
- Cloud browser has no WebGPU, so real model inference and target-device first-audio latency cannot be measured there. Recorded media playback and live UI can be checked separately.
- Local dynamic speech remains an approximation conditioned on the approved Mark recording; it is not an exported original Mark model. Cold GPU initialization and OS background policies remain device-dependent. Closing/terminating the browser process cannot preserve an in-memory speech session.
- Platform references: https://web.dev/articles/media-session and https://developer.mozilla.org/en-US/docs/Web/API/AudioSession .
