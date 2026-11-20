# Release 195 — Drag the existing customization list

## User correction

The user meant dragging section names among one another inside the existing “تخصيص الرئيسية” menu shown in their screenshot. Release194 incorrectly moved editing onto the dashboard cards. This correction restores the original menu and adds direct reordering to its existing six rows.

## Behavior

- Same narrow edge tab and compact menu; same title, swap-side/close controls, visibility checkboxes, Reset, Cancel, and Save.
- Drag any section name up or down immediately after opening the menu. The existing row follows the pointer and a measured placeholder marks its destination among the same six names.
- No second ordering list, no visible reorder arrow buttons, and no edit headers or wrappers on dashboard cards.
- Checkbox interaction is independent of dragging. Hidden sections remain in the same list for reordering and restoration.
- Optional sizes appear within the same rows. Tap-selection and keyboard movement remain available as alternatives.
- Reordering previews through the existing layout model. Save persists the draft; Cancel, dismissal, and interrupted gestures preserve the saved arrangement. Failed saves retain the draft for retry.
- Capture begins after actual movement, child capture-transfer events do not cancel a drag, and autoscrolling stays within the menu's original list bounds.
- Arabic names remain on the right and checkboxes on the left. Short landscape views keep the footer available and visually compact the introductory count/instruction while retaining accessible text.

The robot/report and reference-speech improvements from release194 remain in place. This release changes only home customization, its tests, and release/cache references.

## Verification

- **696 automated tests passed**, with zero failures, skipped tests, or cancellations: all `tests/*.test.cjs` and `tests/*.test.mjs` using the existing installed dependencies.
- Independent review: **53 home customizer, dock, and layout tests passed**, including31 customizer cases covering same-list movement, independent checkboxes, hidden rows, save/cancel/retry, native tap targeting, capture transfer, cancellation, and bounded autoscroll.
- Managed browser: dragged a name among existing menu rows, confirmed dashboard order followed the draft and all visibility values stayed unchanged, then saved/reloaded and verified persistence. The menu contains six rows and the dashboard contains no edit wrappers.
- Checked mobile widths320/390 and844×390 landscape. The original panel shape, Arabic checkbox placement, scrolling body, and footer controls were inspected in the rendered page.
- Changed JavaScript syntax, HTML line-ending preservation, exact runtime/precache references, and whitespace checks passed.

Release marker: **195**. Cache: `wow-furniture-v195-existing-menu-drag`. Entry points: `home-customizer.js?v=4`, `home-customizer.css?v=5`.
