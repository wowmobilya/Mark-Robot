# Additional thermal package label sizes

The 70 × 100 mm, 100 × 100 mm and 100 × 200 mm profiles each print one Home Center package per page. All three use the original artwork and barcode, center the full card, and leave at least 1.5 mm between the artwork and each label edge.

| Thermal label | Artwork rotation | Scale | Printed artwork | Left and right clearance | Top and bottom clearance |
| --- | --- | --- | --- | --- | --- |
| 70 × 100 mm | 90° | 100% | 66.2 × 97 mm | 1.9 mm | 1.5 mm |
| 100 × 100 mm | 0° | 100% | 97 × 66.2 mm | 1.5 mm | 16.9 mm |
| 100 × 200 mm | 90° | 146.53% | 97 × 142.13 mm | 1.5 mm | 28.94 mm |

The original artwork stays upright on square labels. The tall label enlarges every element uniformly until the artwork reaches its allowable width. The narrow label uses the original scale and contains the rotated card within the 70 mm page width.

Select the matching media dimensions and actual size in the print driver. The profile IDs are `thermal70x100`, `thermal100x100` and `thermal100x200`. Roll capacity is unspecified for all three sizes.

## Verification

- All 39 core and paper-profile tests passed. Checks cover page dimensions, orientation, artwork scale and bounds, centering, source content, packet order, barcode identity and single-label previews.
- For each new profile, a 251-package example produced 251 print page elements, 251 real labels and 251 barcodes, with zero placeholder cards.
- Both Tanex profiles, both Zebra profiles and Thermal 80 × 100 produced byte-identical print HTML against release 201 commit `1089318` in all 25 comparisons. Fixtures used 1, 4, 8, 9 and 36 packages and included both logos, a product image, color and barcode.
- Calculated geometry and generated HTML were verified. Physical printer registration and barcode scanning remain unverified.
