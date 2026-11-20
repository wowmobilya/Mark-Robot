# Release 193 — Restore the original home customization tab

## User correction

The home editor must retain its previous button and interaction while improving its controls. Release 191 replaced the familiar edge tab with a top-of-page Edit button and a large modal. This release restores the former surface and keeps the useful layout controls inside it.

## Restored experience

- The same 14 × 86 pixel outlined edge tab, sliders icon, rounded inward edge and original “تخصيص الرئيسية” title.
- The original adjacent drawer, capped at half the viewport width or 280 pixels, with its light backdrop, swap-side button and close button.
- Dragging moves the tab vertically and snaps to either screen edge. The existing `wf.dashboard.dockPosition` preference is reused. Interrupted drags return to their previous position; dragging does not accidentally open the panel.
- The extra home-page toolbar and full-screen modal are removed. The dock remains available when every dashboard section is hidden and closes when leaving the dashboard.

## Improvements inside the familiar panel

- A simple list of the six sections with readable visibility checkboxes.
- Optional “الترتيب والحجم” controls reveal section dragging, keyboard/arrow movement and standard/full-width choices. The ordinary view remains compact.
- Changes preview on the existing dashboard cards. Save commits one layout record; Cancel, Escape, outside dismissal and navigation restore the saved layout.
- Failed saves retain the draft and show the error inside the scrolling body, leaving retry/cancel controls reachable in short landscape viewports.
- The dock clears the top bar and mobile navigation and stays above the desktop sidebar on either side. Header/footer controls stay reachable while the section list scrolls.
- Existing layout and hidden-section migration are preserved. No business records, financial calculations or print/export templates are changed.

## Integration

This release is based on release 192 (`3465a547e6a0bbe25ba0305fa82e9e03ab152795`) and retains its search, navigation, keyboard and formatting improvements. Its previous modal-specific compact styles are superseded by the restored compact drawer.

`home-dock.js` owns only the edge tab, placement and lifecycle. `home-customizer.js` owns the draft controls. `home-layout.js` remains the single owner of saved presentation preferences and existing card nodes.

The HTML and service-worker precache load `home-dock.js?v=1`, `home-customizer.js?v=2` and `home-customizer.css?v=3`. Release marker: **193**. Cache: `wow-furniture-v193-original-home-customizer`.

## Verification

- **656 automated tests passed, with no failures or skipped tests**: 652 CommonJS tests plus 4 module tests, including the release 192 regression coverage.
- Eight dock behavioral tests cover synchronous open/close callbacks, focus recovery, saved positions, drag/snap and click suppression, interrupted drags, viewport/nav bounds, outside/Escape/navigation closure, and inactive-page guards.
- Editor tests cover simple/advanced controls, preview/order/width changes, Save/Cancel, errors and retry, all-hidden recovery, keyboard/pointer ordering and translations in all five interface languages.
- Managed-browser checks exercised widths 320, 390 and 1280 pixels, plus 844 × 390 landscape. The original 14 × 86 tab and half-width panel were measured in the rendered DOM.
- Browser checks saved all six sections hidden, reloaded, reopened from the empty-state action and restored visibility. Reordering and width changes previewed correctly; Cancel restored the exact previous layout. Swap-side positioning and navigation-away dismissal were verified.
- Visual review caught and corrected a checkbox-style collision and desktop-sidebar stacking. The error message was moved out of the fixed footer to retain landscape access to Save/Cancel.
- Changed JavaScript passes syntax checks; runtime/precache references agree and the HTML’s existing CRLF line endings are preserved.

Browser checks used the isolated preview and its existing test data. Physical finger gestures and actual iOS/Android devices were not tested; pointer and viewport behavior are covered by automated tests and the managed browser.
