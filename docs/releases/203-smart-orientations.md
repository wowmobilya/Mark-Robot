# Release 203 — Smart orientation controls in the native WOW workspace

Date: 2026-11-21 (Europe/Istanbul)

The package-label page now supports **17 physical print profiles across nine
stock families**. The user's requested 100 × 50 and 80 × 500 mm sizes are included.
The latter is interpreted literally as 500 mm long. Each rectangular stock offers
both orientations; 100 × 100 mm has one square option. The full size list and
physical calculations are in [the profile report](203-orientations-report.md).

## Workflow and appearance

The page keeps WOW's existing colors, typography, panels, buttons and native
navigation. Paired portrait/landscape options appear together in the paper list.
Adjacent orientation buttons switch within the selected stock, without choosing
a different Tanex product or introducing a duplicate square option. The remembered
selection includes orientation. Preview, invoice counts and physical page sizing
update automatically. A running print job locks both controls until its document
is released.

Tanex stock identity and official die measurements come from the original product
profile. Landscape A4 rotates the complete calibrated sheet by 90 degrees
counterclockwise; it preserves the source artwork, margins and cut positions.
TW-2004 labels read upright in landscape. The original portrait profiles and all
eight release-202 print documents remain unchanged.

All five interface languages have orientation and square captions. Wide-roll
notes show the actual required feed width (150, 200 or 500 mm). The 80 × 500 option
shows the actual 500 mm length requirement. These notes do not assume that every
printer supports every configured media size.

## Dedicated workspaces

Package labels, product costing and invoice archiving each have their own native
page and sidebar entry. Saved invoice fields drive the labels. Costing keeps
materials, labor and overhead with explicit unknown costs and saved currency
rates. Archive/restore preserves payments, delivery state and captured identity.

## Navigation correction

Live review reproduced a mismatch between the visible Product Costs page and
the `#invoices` URL after Back. The original inline history listener ran first,
pushed the hierarchical parent and discarded Forward history. It now delegates
operation-page transitions to the shared handler before that fallback. The
handler consumes a navigation once, follows the actual route, and keeps modal
and mobile-drawer Back behavior. Regression tests execute the actual inline
router and check both listener orders, three Back and Forward steps, matching
URLs, manual fragment changes and notifications.

## Verification

Core/profile tests cover all 17 sizes, physical bounds, content and pagination.
Controller tests cover paired orientation controls, remembered selections,
source Tanex identity, native frame dimensions and active-job locking. The
profile report records byte-identical preservation of all eight earlier outputs.

The complete Node suite passed **912 tests with zero failures**. All 85
language/profile combinations passed the independent caption, identity,
orientation-pair and print-lock review. Syntax, CRLF-aware whitespace and all
11 cached asset references passed. Live browser results follow below.
Physical feeding, die registration and barcode scanning have not been tested on
the user's printer.

## Live browser verification

Pending deployment of the tested revision.
