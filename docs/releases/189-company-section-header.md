# Release 189 — one company section header

Company settings now use the existing window header for the current subsection
title. The company directory keeps its own title; opening Basic information,
Logo and identity, Tax registration, Stamp and signature, or Bank accounts
replaces that title with the selected subsection name.

The redundant inner heading, separator and Back button have been removed. A
short useful description stays inside the scrolling content. Back, Save and
Cancel continue to use the original smart bottom menu and the existing save,
rollback and unsaved-change protection.

Opening a subsection focuses the visible window title without opening the
mobile keyboard. Returning to the directory restores its title and returns
focus to the originating section card. Title synchronization includes the
active subsection and responds to existing settings action events.

## Verification

- 50 focused existing tests passed, covering company transactions, rollback,
  title/focus ownership, the shared settings menu and contextual navigation.
- Browser checks exercised all five company subsections and restored the company
  directory title after each Back/Cancel transition.
- A dirty Basic information draft stayed open after Back and was restored by
  Cancel. The warning remained inside the same bottom menu.
- French and Arabic titles were checked. The Arabic logo section was inspected
  at a 320px viewport with one visible heading and one bottom Back action.
- Service worker cache and affected JavaScript/CSS URLs were advanced together.

The temporary preview retains the documented release-188 preview-only escaped
closing-body string for the preview server injector. The production PDF template
is unchanged. No storage schema or business data changes are included.
