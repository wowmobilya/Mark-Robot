# Release 200 — Four automatic print templates

Date: 2026-11-21 (Europe/Istanbul)

The user added two thermal roll sizes while release 199 was being verified.
This release adds both as distinct, remembered paper options in the same native
package-label page. Tanex TW-2004 stays the default on a new device.

| Template | Physical page | Labels per page | Artwork orientation |
| --- | --- | --- | --- |
| Tanex TW-2004 | A4, 210 × 297 mm | 4 | Entire artwork enlarged 40.21%, rotated 90° |
| Tanex TW-2008 | A4, 210 × 297 mm | 8 | Original calibrated artwork unchanged |
| Zebra 100 × 150 | 100 × 150 mm | 1 | Entire artwork enlarged 46.53%, rotated 90° |
| Zebra 150 × 100 | 150 × 100 mm | 1 | Entire artwork enlarged 46.53%, upright |

The roll templates each keep a minimum 1.5 mm inside the label edge. Their preview
and native-print iframe use the selected dimensions. Nine package labels become
nine roll pages, with the original packet order and complete barcode payloads.
The stated 250-label roll capacity does not truncate longer invoices.

The profile selector and all contextual descriptions cover Arabic, Turkish,
English, French and Russian. A width hint on the landscape roll clarifies that
150 mm wide media needs compatible printer hardware. The browser prepares the
selected page size; printer-driver stock settings and media calibration remain
hardware responsibilities.

[Zebra's driver-size instructions](https://support.zebra.com/article/000021255?language=en_US)
explain choosing stock width/height and calibrating the feed. Printer width varies
by model; see the [ZT600 series specifications](https://www.zebra.com/us/en/products/spec-sheets/printers/industrial/zt600-series.html).
The app does not assume a printer model, print density, media gap or ribbon mode.

## Native UI corrections from live review

Operations fields now use the existing theme's background, text, border and
46 px minimum touch height. Their back buttons create and preserve the native SVG
at mount time and change direction with the interface language. Browser history
closes an open invoice preview or mobile drawer before navigating, including when
the previous route is Notifications.

## Verification

The four paper profiles have geometry, pagination, content, barcode and safe-inset
regressions. Controller tests cover both roll orientations, native frame sizing,
remembered selection, active-job locking and returning from a roll to A4.
The original Tanex HTML is byte-identical across five batch sizes for both profiles
when the two roll options are added. Details are in
[the roll report](200-zebra-roll-report.md).

[Label geometry fixture](../qa/package-labels.html) contains synthetic data and
never accesses the business database. [Responsive workspaces](../qa/workspaces.html)
opens the actual app at 320, 390 or 1280 px widths without creating test records.
The complete Node suite passed **857 tests with zero failures**. JavaScript syntax,
CRLF-aware whitespace, asset versions and the shared navigation guards passed.
Live verification is recorded after deployment below.

## Final verification

Pending release 200 deployment. Physical feed alignment and barcode scanning on a
user printer have not been tested.
