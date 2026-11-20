# Release 194 — Direct home editing, an inline robot report, and smoother speech delivery

## Requested experience

The home page should be arranged by dragging its actual cards up and down, without a separate customization window or visible reorder arrows. The robot should respond to its explicit buttons, with its report expanding from the same smart card. Speech should preserve the saved Syrian reference identity while reducing short starts, stalls, and unnecessary preparation delays.

## Home customization

- The familiar 14 × 86 edge tab opens editing directly on the dashboard. Its expanded hit area stays in the edge gutter so it does not intercept the smart-card pager.
- The original card nodes receive temporary edit headers. Drag a header to move its card; surrounding cards make room. Edge scrolling supports longer pages. Touching card contents still allows normal page scrolling.
- A tap on one header and then another provides a second placement method. Keyboard movement remains available without visible arrow buttons.
- Visibility controls hide individual cards; a dedicated in-page list restores hidden sections. All six sections can be hidden, saved, and recovered after reload.
- Save commits the layout, Cancel restores the saved arrangement, and Reset previews the default arrangement. Storage failures preserve the draft for retry.
- The compact action bar clears bottom navigation, the raised Home button, and changing visual viewport bounds. Desktop width choices and existing layout storage remain compatible.
- Pointer capture begins only after movement crosses the drag threshold. Capture-transfer events from a child handle cannot cancel the new drag. Cancelled gestures and pointer interruptions leave saved preferences untouched.

## Robot and report

- The report is a normal region inside the original smart card. The card grows with the report and uses the page's own scrolling. There is no separate dialog, backdrop, modal focus trap, or background scroll lock.
- Opening the report displays text silently. Speech starts from Read, and identity playback starts from its own button. The decorative robot face no longer opens or speaks a report.
- Collapse retains an active reading; the existing top toolbar and original speaker/Stop button remain available. Exit and Stop cancel deliberately.
- Explicit opening may silently prepare one first phrase. Read adopts that work and the exact visible report snapshot, avoiding a duplicate fetch or restart. Unused preparation is cancelled when the unread report is folded.
- Opening from another page returns to the dashboard without the route observer immediately folding the report. Hiding the smart card retains access to active speech controls.
- RTL, all five interface languages, dark/light themes, and reduced-motion behavior are preserved.

## Speech delivery

- Short adjacent clauses are grouped into bounded phrases. The real Arabic introduction becomes one 122-character opening instead of a short title followed by a synthesis gap.
- A serial producer prepares up to three following phrases while earlier audio plays or is normalized. Already prepared native WAVs may share a playback source with their original sample-based text boundaries.
- A very short opening waits for at most one additional complete phrase; it does not require synthesis of the entire report.
- Matching silent preparation is adopted with progress callbacks, cancellation ownership, and stale-work protection. Truncated WAVs cannot enter the phrase cache.
- Long spoken amounts retain repeated source-span boundaries and continue through the existing Syrian number/currency formatter.
- Saved voice recordings, reference embeddings, installed model assets, and speaker selection are unchanged. No browser or alternate speaker fallback was introduced. Existing packs do not need reinstallation for this app-code update.

## Verification

- **693 automated tests passed; zero failures, cancellations, or skipped tests.** Command: `NODE_PATH=/workspace/scratch/6a38ea1660a2/WOW-Galeri/node_modules node --test tests/*.test.cjs tests/*.test.mjs`.
- Coverage includes native-tap targeting, drag threshold/capture transfer, hidden-section drop indices, save/reload/cancel behavior, shortened visual viewports, inline hosting, silent open, report navigation, speech ownership, variable synthesis delay, cancellation, pause/resume, late errors, large amounts, truncated audio, and offline worker imports.
- Managed-browser checks covered desktop, 390 and 320 pixel mobile widths, and 844 × 390 landscape; light/dark themes; native pointer dragging; two-tap placement; save/reload persistence; recovery after all six sections were saved hidden; inline report expansion/folding; and the expanded smart card inside home-edit wrappers.
- The Arabic reference sample and original identity MP3 fully decoded. A playback regression preserved all 561,540 PCM samples of the 12.733-second Arabic WAV.
- Changed JavaScript passes syntax checks, the HTML retains its original CRLF endings, and changed runtime assets agree with the service-worker cache. Worker imports follow the current reference coordinator; compatibility coordinator URLs remain cached.

The managed browser could not run the installed WebGPU speech model, so these checks do not establish actual-device synthesis latency, an exact acoustic match to the original proprietary recording, or human-level Syrian delivery. Physical Android/iOS finger input and newly synthesized speech require device verification.

## Release integration

Based on release 193, repository tree `d762c40c24ee9cdc549d2f3cbd36f3f5de28d2cd` (remote commit `6ae64b6603560c1ed4c75dac70ec102ca6f58031`). Release marker: **194**. Service-worker cache: `wow-furniture-v194-inline-home-robot-voice`.

Current changed entry points: home layout JS/CSS v2; home dock JS v2; home customizer JS v3/CSS v4; robot report JS v9/CSS v6; robot face JS v13/CSS v9; speech controls JS v4; offline voice JS v10; reference voice JS v5, host v6, engine v3.
