# Release 199 — Automatic Tanex labels, product costs and invoice archive

Date: 2026-11-21 (Europe/Istanbul)

## Result

The existing WOW Galeri application now has three native sections: Package labels,
Product costs, and Invoice archive. They use the existing navigation, themes,
Arabic RTL layout, five interface languages and touch keyboard. Invoice cards,
product cards and section controls open the relevant page directly.

Selecting a saved invoice automatically loads its line data, multiplies quantities
by packet counts, generates the original CODE128 payloads locally and prepares the
correct number of sheets. Paper selection automatically rebuilds that same batch;
the last choice is remembered on the printing device. New devices start with
Tanex TW-2004.

| Paper | Stock size | Per A4 | Artwork |
| --- | --- | --- | --- |
| TW-2004, default | 99.1 × 139 mm | 4 | Entire original design enlarged 40.21%, rotated, centered with a 1.5 mm minimum inset |
| TW-2008, original | 99.1 × 67.7 mm | 8 | Original 97 × 66.2 mm artwork and calibrated spacing preserved |

The invoice's saved name, type, color, image, packet counts and logos are used.
Printed captions and layout remain those in the supplied Home Center template.
No prices or costs are added to package labels. The existing showroom-label
modules are byte-identical to release 198.

## Automatic data handling

- A separate costing page calculates materials, labor, overhead and actual margin.
  USD, TRY and EUR entry uses captured exchange rates and canonical USD costs.
- Invoice saves capture absent cost and print-identity snapshots. Existing saved
  values, explicitly unknown costs and blank identities remain historical.
- The archive uses existing invoice records. Restore retains payments, delivery
  status, invoice identity and snapshots.
- Costing, archive and delivery writes merge against the latest database row and
  publish in-memory state only after a successful, hydrated commit. Concurrent
  payments and catalog-image changes are preserved.
- Missing or unsupported print assets block printing. All images and fonts finish
  loading before the native print job starts. The current invoice and stock stay
  locked until the dialog closes; later selections are prepared afterward.
- All eleven feature assets are included in the release's offline cache.

## Verification

The combined Node suite passed 846 tests with zero failures. Focused regressions
execute the real print controller, invoice save, storage/media transaction,
delivery confirmation and shared mobile navigation with controlled boundaries.
They cover quantities, packet ordering, 4/8-up pagination, original artwork,
profile persistence, async print races, image readiness, cost conversion,
unknown/zero costs, stable material IDs and archive restoration.

Independent reviews reproduced and fixed unresolved media after costing saves,
material-ID reuse, stale delivery writes, and print lifecycle races. JavaScript
syntax, CRLF-aware whitespace, script order and offline asset coverage were
checked separately.

Official Tanex Word-template geometry was cross-checked with a shaded copy
rendered to PDF. The original TW-2008 HTML stayed byte-identical across five batch
sizes when paper profiles were introduced. Details:
[Paper profiles](199-paper-profiles-report.md),
[Print workflow](199-print-review.md),
[Costing](199-costing-report.md),
[Archive](199-archive-report.md).

A self-contained fixture view of the actual renderer is available at
[Package label QA](../qa/package-labels.html). It contains synthetic data and does
not access or write the business database. Final deployed browser verification
is recorded below when completed. Physical printer feed and driver scaling need
a real test sheet; software checks cannot establish those hardware properties.

## Deployed browser verification

The package-label page and both Tanex options were verified in the published
application. The synthetic nine-label fixture produced 4/4/1 labels across three
A4 pages for TW-2004 and 8/1 across two A4 pages for TW-2008. Browser measurements
confirmed approximately 92.816 × 135.998 mm for the enlarged artwork and
96.999 × 66.200 mm for the original artwork, within CSS pixel rounding.

A subsequent user request added two Zebra roll sizes in release 200. That release
also supplies native input theming and persistent back icons found during the
live check. No physical printer has been exercised.
