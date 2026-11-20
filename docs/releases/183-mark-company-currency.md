# Release 183 — Mark Robot, company settings, and exchange sources

## Mark Robot

- The reader expands from the existing smart card, uses its original face and app colors, and opens below the application header. Minimize keeps reading and the retained report; Exit stops the report. The card and upper launcher reopen it without generating a second report.
- Assistant names are localized. Syrian dialect is mentioned only inside settings.
- An exact SHA-256 gated adapter uses the pinned engine's existing q8 path and removes speculative reference/CFG warmups. Essential model and decoder initialization still finish before readiness. Early initialization messages and codec ports are queued; GPU and worker failures are surfaced.
- No model weights, vendor files, pack manifest hashes, or installed-pack identifiers changed. The installed approximately 922 MB package is reused.
- Speech speed from 0.75× to 1.25× uses streaming WSOLA at the original sample rate. A live change applies to already generated, unscheduled PCM without restarting the report. Only about 0.35–0.47 seconds is committed at the previous speed.
- A short Syrian Arabic generated preview has play, pause, resume, and stop controls. Its speed is a draft until saved; restoring the saved speed preserves other draft fields.
- Existing wake lock and Media Session controls remain. Background and screen-lock playback depend on browser/OS support; full page/browser termination ends playback.

## Settings and company documents

- Company tax number and tax office, local stamp and signature images, actual logo shape/size/background preview, and a separate bank editor within Company.
- Signature is above the stamp in seller document sections. The buyer's section is unchanged. These images use existing local media storage and backup behavior.
- Settings saves merge only edited fields into the current stored row in one transaction, preserving concurrent settings and media. Zero tax rates remain valid.
- A dedicated Smart card section controls visible pages, order, first page, rotation timing, and density. Draft changes can be saved or cancelled. Hiding the robot page does not destroy active speech.
- Notifications appear at the top of the active window, dismiss automatically, and retain the app's theme.

## Exchange sources

- Named options: international reference, TCMB, Ziraat, İşbank, Garanti BBVA, Sultan İnegöl, Mizan İstanbul, and another manual source, with five-language labels.
- TCMB reference uses Frankfurter's TCMB provider and is labeled as a daily reference midpoint. TCMB buying/selling uses its official XML bulletin when browser access is available; manual entry remains explicit.
- Bank and Sultan options open their official boards and record manual buying/selling quotes. No generic feed is presented as a named bank's quote. Mizan İstanbul has an optional user-provided HTTPS board link; its exact official Istanbul board was not verified.
- Source, quote side, publication date, and application time are distinct and included in backups. Saved/manual rates are not overwritten at startup.
- Automatic quotes must be dated, no more than 14 days old, no more than one day in the future, and must not regress a newer publication from the same source/side. Rejected or failed writes preserve current rates.
- Existing invoice and financial records are not rewritten when a rate source changes.

## Validation and limits

- Full Node suite before the notification-only change: 413 tests, 411 passed. Two pre-existing failures remain: the navigation drawer fixture lacks `closest`, and the primary-color test hardcodes stale asset versions. The current reference asset test was updated for the new bootstrap.
- Actual pinned runtime initialization and decoder factory tests cover the fast-start adapter. No target-device GPU was available for audible synthesis or cold-start latency measurements; instant first playback is not guaranteed by these tests.
- Tempo tests cover the bundled Arabic Mark sample at every supported speed, arbitrary decoder packet boundaries, voiced frequencies, actual sentence timing, cancellation, and pause/rate-change/resume. Subjective listening quality on the user's phone remains a device check.
- All versioned local assets exist; inline scripts parse. Live deployment/UI verification is performed separately after publication.

Source documentation: https://frankfurter.dev/providers/tcmb/ and https://frankfurter.dev/javascript/
