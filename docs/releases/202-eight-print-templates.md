# Release 202 — Eight invoice print templates

Date: 2026-11-21 (Europe/Istanbul)

The requested 70 × 100, 100 × 100 and 100 × 200 mm thermal labels are now
independent choices alongside the five previously implemented stocks.
Measurements below are **width × height**. All roll sizes print one label per
physical page, preserving the original content and artwork proportions.

| Template | Label stock | Sheet or roll | Labels per page |
| --- | --- | --- | --- |
| Tanex TW-2008 | Official 99.1 × 67.7 mm; sold as 99 × 67 mm | A4 210 × 297 mm | 8 |
| Tanex TW-2004 | 99.1 × 139 mm | A4 210 × 297 mm | 4 |
| Zebra 100 × 150 | 100 × 150 mm | Portrait roll | 1 |
| Zebra 150 × 100 | 150 × 100 mm | Landscape roll | 1 |
| Thermal 80 × 100 | 80 × 100 mm | Portrait roll | 1 |
| Thermal 70 × 100 | 70 × 100 mm | Portrait roll | 1 |
| Thermal 100 × 100 | 100 × 100 mm | Square roll | 1 |
| Thermal 100 × 200 | 100 × 200 mm | Portrait roll | 1 |

TW-2004 remains the default on a new printing device. The selected template is
remembered; invoice quantity and packet count determine the full label job and
pagination. Invoice selection, asset readiness, local barcode generation and
native printing are shared by all eight profiles. Active print jobs retain their
captured paper choice and document until the native print dialog closes.

The 70 × 100 and square labels retain the original artwork scale. The tall
100 × 200 label scales uniformly to the available width. The square profile
centers its artwork even though it needs no rotation or scale change.
The original TW-2008 layout remains isolated and unchanged.

The chooser enumerates the core's supported profiles. Thermal names and square
orientation are translated for Arabic, Turkish, English, French and Russian.
No brand or roll capacity is assumed for the four generic thermal sizes.

## Verification

The geometry review and unchanged-document comparisons are recorded in
[the additional thermal report](202-additional-thermal-report.md).
Controller regressions exercise all three new sizes through preview, remembered
preference, native frame dimensions, complete page/barcode counts, active-job
locking and returning to A4. The responsive fixture now changes its document URL
when switching sections, so it opens a fresh deep link instead of replaying an
existing iframe history state.

The complete Node suite passed **874 tests with zero failures**. JavaScript
syntax and CRLF-aware whitespace checks also passed. Live verification is
recorded after this exact tested revision is deployed. Physical printer feeding, alignment and barcode scanning have not been
tested on the user's hardware.


## Subsequent requested expansion

Published as `6a96d498bbd03dd3cf60f035fa30a8b9160ed2ae`; Pages deployment
completed successfully. Browser measurements confirmed all eight page sizes,
complete nine-label fixture counts and image readiness. The user then requested
100 × 50, 80 × 500 and both orientations for every stock. Final integrated
verification continues in [release 203](203-smart-orientations.md).
