# Release 201 — Five automatic print templates

Date: 2026-11-21 (Europe/Istanbul)

The user additionally requested 80 × 100 mm thermal media. It is a fifth,
independently selectable and remembered option in the native package-label page.
The previously released four templates remain available, with TW-2004 as the
initial default. All three operations pages retain the current WOW identity.

| Template | Physical page | Labels per page | Artwork |
| --- | --- | --- | --- |
| Tanex TW-2004 | A4, 210 × 297 mm | 4 | Proportionally enlarged, rotated 90° |
| Tanex TW-2008 | A4, 210 × 297 mm | 8 | Original calibrated positions and 97 × 66.2 mm artwork |
| Zebra 100 × 150 | 100 × 150 mm | 1 | Proportionally enlarged, rotated 90° |
| Zebra 150 × 100 | 150 × 100 mm | 1 | Proportionally enlarged, upright |
| Thermal 80 × 100 | 80 × 100 mm | 1 | Original scale, rotated 90°, bounds 66.2 × 97 mm |

The 80 × 100 mm artwork has 6.9 mm side clearance and 1.5 mm top/bottom clearance.
The original label contents, image, logos, packet ordering and barcode payload are
preserved. Roll media is explicitly identified independently of roll capacity;
no brand, printer model or roll quantity is assumed for the new 80 × 100 option.
Both preview and native print use the selected physical page size.

Paper changes regenerate the existing invoice's labels and pagination. The choice
is saved on the printing device. During an open print job the profile is locked,
so another selection cannot replace a document already being printed.

## Verification

- Complete Node suite: **862 passed, zero failed**.
- JavaScript syntax and CRLF-aware whitespace checks passed.
- New controller regression checks remembered 80 × 100 media, nine pages for
  nine labels, real preview/native-frame dimensions, unknown roll capacity,
  print-job locking and returning to A4 pagination.
- Geometry and preservation details are in
  [the 80 × 100 report](201-thermal-80x100-report.md).
- The [paper fixture](../qa/package-labels.html) contains synthetic data only.
  The [workspace fixture](../qa/workspaces.html) opens the actual app at fixed
  mobile/desktop widths without adding business records.

## Deployment and browser verification

Pending deployment of this exact tested revision. Physical printer feeding,
alignment and barcode scanning have not been tested on the user's hardware.
