# Portrait and landscape package labels

There are 17 print profiles. Each rectangular stock has portrait and landscape options. The square 100 × 100 mm label has one option. The default is the calibrated four-label Tanex TW-2004 portrait sheet.

| Stock | Available print page sizes, width × height | Labels per page |
| --- | --- | --- |
| Tanex TW-2004, 99.1 × 139 mm label | 210 × 297 mm and 297 × 210 mm A4 | 4 |
| Tanex TW-2008, 99.1 × 67.7 mm label | 210 × 297 mm and 297 × 210 mm A4 | 8 |
| Zebra 100 × 150 mm roll | 100 × 150 mm and 150 × 100 mm | 1 |
| Thermal 70 × 100 mm roll | 70 × 100 mm and 100 × 70 mm | 1 |
| Thermal 80 × 100 mm roll | 80 × 100 mm and 100 × 80 mm | 1 |
| Thermal 100 × 100 mm roll | 100 × 100 mm | 1 |
| Thermal 100 × 200 mm roll | 100 × 200 mm and 200 × 100 mm | 1 |
| Thermal 100 × 50 mm roll | 50 × 100 mm and 100 × 50 mm | 1 |
| Thermal 80 × 500 mm roll | 80 × 500 mm and 500 × 80 mm | 1 |

## Rotated A4 sheets

Each landscape sheet encloses the full calibrated portrait grid in a 297 × 210 mm page. A single 90° counterclockwise turn maps each portrait point `(x, y)` to `(y, 210 − x)` in millimeters. This preserves the relationship between the printed artwork, the labels and the asymmetric sheet margins. The TW-2004 artwork reads upright on the landscape page. TW-2008 retains its four rows of two original labels, which appear as two rows of four after the whole-sheet rotation.

The landscape profile IDs are `tw2004Landscape` and `tw2008Landscape`. Each stores its portrait `sourceProfileId` and a `sheetRotationDeg` of −90. The print document applies page breaks to the outer landscape pages. Text, images, separators and barcodes retain their original HTML.

## New roll sizes

The 100 × 50 mm label prints the full artwork at 71.00% scale, centered in a 68.87 × 47 mm area. In portrait orientation, the 50 × 100 mm label prints the same artwork at 47 × 68.87 mm.

The 80 × 500 mm label prints the full artwork at 116.31% scale in a 77 × 112.82 mm area. The 500 × 80 mm version uses a 112.82 × 77 mm area. The additional length leaves equal unprinted space at both ends. Each option corresponds to one physical page and retains at least 1.5 mm of clearance on every edge.

The new roll IDs are `thermal100x50`, `thermal50x100`, `thermal80x500`, `thermal500x80`, `thermal100x80`, `thermal100x70` and `thermal200x100`. These generic stock sizes have unspecified roll capacity. A printer and driver must support the selected page dimensions and feed width to reproduce the intended physical size.

## Verification

- All 63 package label core and profile tests passed. Landscape tests compare each complete grid and card against the original portrait document, including single-page previews, unfilled final sheets, original grid CSS, dimensions, layout mode and page breaks.
- The eight profiles in release 202 commit `6a96d49` produced byte-identical print HTML for 1, 4, 8, 9 and 36 packages. All 40 comparisons included both logos, a product image, color and barcode.
- Each of the nine new profiles generated 251 complete labels and matching barcodes for a 251-package invoice. Each roll used 251 pages. TW-2004 landscape used 63 A4 pages and TW-2008 landscape used 32.
- These checks verified generated HTML and computed geometric bounds. Physical printer alignment, driver media support and hardware barcode scanning remain unverified.
