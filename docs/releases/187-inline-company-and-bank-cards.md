# Release 187: full-screen workspaces, same-window sections and clear navigation

Follow-up to the live review of release 186 and the user's clarified navigation
preference. Company sections now open within the existing company settings
window. Back, Cancel and successful Save return to its section cards. Section
drafts, branding previews and independent commits keep their existing semantics.
There is no second company-section dialog or backdrop.

The full 67-bank list exposed a CSS sizing conflict: the scroll-bounded grid
contracted rows to 44 px, while multiline labels plus vertical padding needed
more space. Content-sized rows and a scoped logical minimum now allow names and
classifications to remain inside their cards and grow when translations wrap.
Colors, type, icons and selection styles remain those of the application.

The normal selection-reading button also moves with the active inner-page
heading instead of floating above the sidebar. The minimized Mark player retains
ownership of the header while it is shown, and closing it restores normal
controls. These fixes update application files only; voice model assets remain
unchanged.

Primary settings, editor, preview and share windows use the viewport, with the
existing app colors and clear headers/actions. Full-screen surfaces no longer
blur the covered page. Short confirmations and specialist media/calculator
surfaces retain their task-specific layouts. Bank sources use responsive columns
and the settings body's scroll area, avoiding a second cramped scrolling list.

Sidebar parents with available actions expand their choices before navigating.
The first explicit View action opens the section; existing Add actions retain
their handlers. Leaf destinations remain direct. The shared open/current state,
keyboard controls and localized descriptions remain coherent.

Settings panel transitions no longer force a synchronous full layout with
offsetWidth. Native short animations cancel on rapid changes and respect both
system and saved reduced-motion preferences. Reader colors no longer recalculate
on scroll-only root style updates; real theme/color changes coalesce before the
next paint and only changed palette tokens are written.

## Language and performance review

The cashbox screen previously kept Arabic labels and direction after switching
languages. Its labels, currency names, transaction names, loading/empty/error
states and validation messages now follow Arabic, Turkish, English, French or
Russian. Changing language keeps the draft currency, transfer target, amounts
and note, repaints the already loaded history, and does not reread storage.
Accounting validation, stored entries, payment inclusion and balance arithmetic
remain unchanged. The sidebar and cashbox page title use the shared dictionary.

Navigation avoids redundant root class/style mutations on unchanged scrolling,
and skips document-height reads on inner pages. Repeated Home state no longer
rewrites labels, icons or classes; captured and window scroll events share a
single update per animation frame. Header normalization writes classes only
when they change. These paths have behavioral regression tests, including the
report palette's scroll-only changes and real theme/color updates.

The exchange trend cache includes the selected language, and a language change
refreshes its tooltip and percentage formatting without fetching or saving rates.
Product-category and robot-preview statuses keep semantic state rather than
retaining stale text from the prior language. Late speech events cannot restore
an old-language message. Speech playback and category persistence are unchanged.

Generated product update review and Excel sharing windows have localized,
functional top Close controls and accessible titles.

## Verification

The final local gate passed **505/505 tests**, including accounting, settings,
voice, media controls, persistence, asset wiring, navigation and localization.
All **49 top-level application JS/MJS files** pass syntax validation, and all
**77 local HTML asset references** resolve. Inline scripts parse in the language
suite. The CRLF-aware diff check is clean.

The expanded locale audit covers 1,868 language maps, 455 five-language arrays,
15,685 translated-string checks, 20 placeholder checks, 283 assembled primary
keys per language, 1,310 shared dictionary entries and 245 distinct authored
binding/call keys. It does not translate stored user content or official bank
identifiers. A deployed browser review follows this gate.
The unchanged voice model and reference assets preserve the existing installed
pack. This release does not replace the original Mark recording's generator;
exact original-voice runtime access remains a separate dependency described in
`docs/research/mark-original-voice-access-2026-11-20.md`.
