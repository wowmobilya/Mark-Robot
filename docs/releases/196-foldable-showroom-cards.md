# Release 196 — Foldable showroom cards

Adds **Showroom cards / بطاقات المعرض** to the products toolbar and an individual card action to every product.

## Result

- Each selected product produces one landscape A4 sheet with two identical, upright 100 × 150 mm faces joined into one 200 × 150 mm cut piece. Cut the solid outer outline, then fold the dashed center line to make one double-sided 10 × 15 cm card.
- Uses the supplied card template's product header, company logo, photograph, physical size table, volume, description, barcode and website.
- Card printing has its own saved Arabic, Turkish, English, French or Russian preference. Interface and invoice language remain independent.
- Uses all physical dimension rows, including legacy physical dimensions, without substituting shipping package measurements. Zero volume is preserved.
- Code128 is generated with the locally bundled JsBarcode 3.11.5. Non-Latin or overly dense values use the existing QR encoder with the original payload and an explanation in the preview.
- A dedicated print frame waits for styles, fonts and images, checks content fit and reports broken assets or excessive content before printing. Named page styling keeps invoice printing separate.
- Runtime and service-worker asset lists include the new local files.

## Validation

- 81 focused model, locale-persistence, barcode, image-lifecycle, product-workspace, navigation and app-update tests passed.
- All 6 existing localization/syntax checks passed; the complete existing `tests/*.test.cjs` suite also passed.
- Browser smoke checks exercised desktop and 390 px mobile layout, two joined faces, all five print languages while the app stayed Arabic, and preparation/cleanup of a three-product print batch containing an Arabic QR value and a twelve-row size table.
- Independent review found no blocking defect; its missing-volume-unit finding was corrected in all five languages.
- HTML line endings are preserved; whitespace and JavaScript syntax checks pass.

The local preview server's live-reload insertion conflicted with an existing embedded HTML body-closing string. The temporary QA copy escapes that string; no QA fixtures or preview-only code are shipped.

Physical printer output and printer-driver scaling require verification on the user's printer. The print stylesheet requests landscape A4 with 6 mm page margins and fixed-size faces.

