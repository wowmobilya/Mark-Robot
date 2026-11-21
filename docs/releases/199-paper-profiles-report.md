# Home Center package label paper profiles

Tanex TW-2004 places four Home Center labels on each portrait A4 sheet. The complete artwork is 40.21% larger in each dimension. Tanex TW-2008 retains the calibrated eight-label layout from the supplied Home Center template.

| Paper | Physical label | Grid | Printed artwork |
| --- | --- | --- | --- |
| Tanex TW-2004 | 99.1 × 139 mm | 2 × 2 | 92.8165 × 136 mm, rotated 90° |
| Tanex TW-2008 | 99.1 × 67.7 mm | 2 × 4 | 97 × 66.2 mm, original orientation |

## Sheet registration

The TW-2004 Word template defines page margins of 284 twips on the left and 567 twips above the first cell. Its fixed-width table uses columns of 5619, 164 and 5619 twips and two rows of 7881 twips. One twip is 25.4/1440 mm. The die origins on A4 are at 5.0094 and 107.0151 mm from the left and at 10.0013 and 149.0133 mm from the top. Indexing starts at the top right, consistent with the supplied template's RTL order.

The renderer uses the nominal label size and the manufacturer's center-to-center spacing. The 0.0121 mm difference between the nominal height and the row pitch comes from rounding in the Word template. Its 15-twip left cell padding affects content inside each cell. For an independent check on placement, a copy with cell shading added and no layout changes was exported with LibreOffice. The shaded areas began at approximately 5.009 and 107.033 mm horizontally and 10.019 and 149.014 mm vertically, within 0.02 mm of the template-derived origins.

The renderer centers the rotated artwork with a minimum inset of 1.5 mm inside the TW-2004 die. Its scale is 136/97, leaving 3.1418 mm of clearance at each side and 1.5 mm above and below. The same transform applies to every logo, separator, border, caption, product photo and barcode. A 31 × 7 mm barcode image box becomes 43.46 × 9.81 mm in artwork orientation. Printer registration and the driver's scale affect the physical output. These figures assume A4 at 100%.

TW-2008 retains the supplied 8 mm column gap, 4 mm row gap and asymmetric page padding. The stock dimensions in the paper selector and the card dimensions in its calibrated print layout are stored separately.

Tanex publishes the stock dimensions and a downloadable placement template. [TW-2004 product sheet](https://www.tanexlabel.com/etiketler/beyaz-etiketler/standart-olculer/standart-olcu-tw-2004/) · [TW-2004 Word template](https://www.tanexlabel.com/sablondosya/TW-200499.1x139mm.docx) · [TW-2008 product sheet](https://www.tanexlabel.com/etiketler/beyaz-etiketler/standart-olculer/standart-olcu-tw-2008/).

## Core API and verification

The app can pass `{profileId: core.defaultProfileId}` to `buildLabelBatch`. The default preference is `tw2004`. Existing integrations that omit the second argument and existing batch objects without a profile continue to use `tw2008`. Each new batch records its paper profile so partial previews and full print jobs use the same grid. Paper selection changes pagination while preserving invoice line, packet, unit and barcode order.

- All 20 tests in `tests/package-label-core.test.cjs` and `tests/package-label-profiles.test.cjs` passed. They cover empty, partial, full, multi-sheet and 2,000-label batches, physical dimensions, safe insets and identical card markup under both profiles.
- The standalone TW-2008 HTML was byte-for-byte identical to the pre-profile renderer for 1, 4, 8, 9 and 36 labels with both logos, a product image and a local barcode.
- The labeled-sheet geometry was checked against the manufacturer template and the layout arithmetic. Local Chromium could not start under the shell's socket restrictions. This check did not include a browser-generated print PDF or a physical printer.
