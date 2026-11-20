# Release 188 — Settings actions in the original smart menu

## User-facing behavior

The existing curved bottom navigation now owns **Back, Save and Cancel** for
editable settings on both mobile and desktop. Each action delegates to the
currently open section's original validation, save and rollback handlers.

- Company details, logo, registration, stamp/signature and bank editors retain
  their independent transactions inside the same full-screen settings view.
- Invoice settings, app identity, product categories, smart-card preferences,
  robot preferences and currency-source choices expose their actual draft state.
- Save is disabled when nothing changed. A current online currency feed offers
  Refresh. Pending writes disable navigation and repeated submissions.
- Cancel restores the active section's saved values, including the robot's live
  speech-rate preview. Failed writes leave input available for another attempt.
- Back, the header close button, Escape, browser/hardware Back and category
  selection protect unfinished edits with an inline message in the same menu.
- Appearance and language retain automatic saving and display Done with an
  automatic-save explanation. Operational and information sections display Done.
- Closing an editor returns the menu to ordinary application navigation and
  restores its Home icon and accessible name.

## Implementation

`settings-actions.js` coordinates existing controls through read-only
`getSettingsActions()` descriptors supplied by the settings modules.
`settings-actions.css` adapts the same `#bottomNav` element and its raised center
circle; the original per-form action rows are hidden only after coordination is
available. Status feedback stays visible and uses a live region.

The dialog uses the available visual viewport height, a separately scrolling
content area and bottom safe-area padding. Labels and status messages cover
Arabic, English, Turkish, French and Russian. Release metadata and service-worker
asset URLs are updated together to avoid mixing old handlers with the new menu.

## Validation

- All 548 Node tests passed across 57 test files, including new action routing,
  scoped rollback, async failure, busy guards, category switching, currency
  normalization, browser Back and Home restoration regressions.
- Browser interactions verified real Save and Cancel behavior, invoice
  validation, dirty navigation warnings, per-section actions and automatic-save
  language switching.
- Responsive browser QA covered 320px and 390px phone widths, a short landscape
  viewport and desktop. Arabic RTL and French LTR were visually checked.
- No horizontal overflow or duplicate form action rows were observed in the
  checked views; focused final fields remained above the menu.

The managed preview inserts its reload client at a literal closing body tag.
For preview testing only, the inline PDF document's closing body string was
JavaScript-escaped in a temporary copy so the injected client did not break the
app script. The production HTML retains its original PDF string.
