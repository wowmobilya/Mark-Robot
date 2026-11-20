# Showroom workspace refinement

Improve the existing release 196 showroom-card section inside Products, using the current WOW theme and inline navigation. The user delegated design and implementation and previously authorized publication.

The screen should place product selection beside a generous preview on larger screens and offer two compact panes on phones. A readable face view and an exact A4 view use the same underlying card. Selection, active product and the current print-language choice survive closing and reopening during the session. Product selection and preview are separate actions. Search handles all five supported languages and Arabic/Persian numerals. Missing source information is visible without guessing values or modifying product records.

Preview preparation must wait for images, check generated codes and detect overflow. Native print jobs keep their snapshot and lock until completion; a second request cannot remove a live print frame. Language saves stay serialized and block app replacement while pending.

## Preserved physical output

- One landscape A4 sheet per selected product.
- Exactly two identical upright 100 × 150 mm faces joined as a 200 × 150 mm piece.
- Existing outer cut boundary, central fold, interior layout and print sizing.
- Independent Arabic, Turkish, English, French and Russian print language.
- No product-data mutation or automatic translation of user content.

This change does not add a separate draft editor. The existing product-edit action is labeled clearly and remains the source of catalog corrections.

## Automated verification — 2026-11-20

The complete Node suite passed **740 tests across 70 files**, including the product-label behavior and six existing localization/syntax checks. Explicit syntax checks passed for both product-label JavaScript modules and the service worker. Source comparison with base `8e769a34edb2e5200b11ec9292e33949f32efc12` confirmed unchanged physical geometry, unchanged face-interior markup and a byte-identical 9,109-byte print-CSS tail (SHA-256 `edcc03a75f318e4e132c233a07c6b97a7ffed886772a4b84ae21f3e1883fc195`). CRLF-aware diff checking passed. Browser and hosted-release outcomes are outside this verification record.
