# Release 192 — Faster workspace updates and reliable field navigation

## Purpose

Reduce repeated rendering, DOM writes and layout reads in the existing workspaces. This release builds on the compact invoice/product layouts, independent home customization and shared touch keyboard delivered in release 191.

## Changes

- Search rendering tracks both its debounce timeout and animation frame. A newer query, an immediate render, navigation or `pagehide` cancels obsolete work. Invoice product search now uses the same scheduler. Delayed barcode initialization cannot restart the camera after departure or suspension.
- Navigation changes only the active page and active navigation entries. Ordinary page changes start at the top immediately, without animating through the previous page's scroll position.
- Shared currency formatting reuses one number formatter. Product cards share one localized formatter per catalog render. Conversion still reads the current exchange rate and retains the existing output, rounding and saved USD base prices.
- Invoice product-update review builds a fresh catalog index for multi-line invoices, preserves first-match and typed-ID behavior, and skips the catalog when there are no lines. It does not silently replace invoice snapshots.
- The contextual footer reuses each resolved original control during a refresh and changes labels, disabled/busy states and classes only when necessary. Activation checks the source's current state again. Hidden-stage, inherited-disabled and ARIA guards remain in place.
- Sidebar and shell observers ignore unrelated root classes. Relevant root/viewport bursts share one animation frame. Explicit navigation, accordion expansion and keyboard focus retain their immediate behavior.
- Settings titles keep their icon when only the caption, description or company subsection changes. A real source-icon change still refreshes it once.
- Touch detection reuses a live media-query object. Previous/Next availability shares one field scan per keyboard render; ordinary editing retains its key nodes. When a rendered row replaces its input, observers move to the replacement and its ancestors, so later hiding, readonly changes or disabling a fieldset closes the editor correctly.
- A queued native dialog-close event from the previous field no longer dismisses the newly opened Next/Previous session. True external closure still commits and cleans up once.
- Home customization uses less vertical space on narrow screens while retaining the larger editor and reachable controls.

## Performance evidence

These are targeted measurements, not a whole-application speed percentage.

| Measured operation | Before | Release 192 |
| --- | ---: | ---: |
| Format 20,000 currency amounts, median of five Node runs | 417 ms | 18 ms |
| DOM write calls during one unchanged busy-footer refresh, instrumented fixture | 33 | 0 |
| Original-control visibility reads per ordinary action per refresh | 2 | 1 |
| Action visibility reads after an unrelated root-class change | 2 | 0 |
| Rail pagination height reads after an unrelated root-class change | 3 | 0 |
| Touch media-query allocations across eight desktop interaction sequences | 25 | 1 |

Currency regression checks compare exact old/new strings, exercise changed exchange rates and confirm that 1,000 calls construct one shared formatter. Operation-count tests exercise the production controllers with instrumented DOM boundaries.

## Verification

- **646 Node tests passed; 0 failed, cancelled or skipped**, across 66 `*.test.cjs`/`*.test.mjs` files. This includes scheduler cancellation, the real pagehide callback, financial formatting, first-match catalog review, settings title behavior, footer/source guards, sidebar updates and 23 touch-keyboard tests.
- The asynchronous dialog fixture reproduced the browser's premature-close bug before the guard. Next/Previous, rapid reopen and true external-close regressions pass after the fix.
- Independent review found no remaining issue in the performance scheduler, currency/catalog behavior or keyboard observer/close lifecycles.
- Managed-browser checks exercised the phone and wide-desktop layouts plus landscape barcode clearance. Home visibility remained independent: saving only the Smart Card hid Total Sales, and reloading preserved the choice. Cancel restored the saved layout; reorder and reset remained available.
- Invoice product search selected the test product, quantity 2 at a USD 125 base price recalculated to USD 250, and switching the display currency retained the base price. Product search and route changes remained functional.
- All five keyboard layouts entered text into the same original field. The readonly mirror used `inputmode="none"`; wide touch capability used the same keyboard. After the native-close fix, `prName → prDimL_0 → prName` remained open and focused, and the numeric field retained `12.5`.
- A non-touch desktop retained ordinary field entry. Editing company data enabled Save; Cancel restored the original value and returned to the company sections. The settings header retained its 72-pixel height and curved lower edge without horizontal overflow.
- Changed JavaScript passed syntax checks. Runtime asset URLs agree with service-worker precache entries. The HTML's existing line-ending pattern is preserved.

## Scope and validation limits

The changes retain the application's existing records, storage schema, financial calculations, print templates and export builders. No dependency or external service was added. Preview checks used test records and did not change production business records.

Touch capability was simulated in an isolated preview fixture. Actual iOS/Android software-keyboard visibility, finger gestures and camera decoding were not verified on physical devices. The cloud browser has no usable camera hardware. The optional CLI browser suite is separate from the Node gate because this executor cannot create Chromium's required singleton socket; browser checks used the managed browser.

## Delivery

Release marker: **192**. Service-worker cache: `wow-furniture-v192-responsive-workspaces`. Changed asset URLs advance together in HTML and the precache list so installed clients can fetch the updated controllers and styles.
