# HomeCenter labels, costing and archive

## Requested outcome

Integrate the supplied `هوم سنتر اتاكيت-1.html` into the existing WOW Galeri
application. The physical labels must retain the original content, positioning
and A4 geometry. Each new feature has its own page using the current WOW visual
identity and five interface languages. The user authorized implementation,
delegated routine design decisions, and requested specialized agents.

## Binding print specification

The print page offers four physical stock profiles. The user's latest instruction
makes **Tanex TW-2004** the initial default and retains the last selected profile
for the next job. Invoice choice, packet multiplication, local barcodes, sheet
pagination and preview refresh run automatically. A native print dialog remains
the final printer control.

### Tanex TW-2004 — default, four labels

- A4 portrait: 210 × 297 mm; two columns × two rows, each 99.1 × 139 mm.
- Origins and pitches come from the manufacturer's Word template:
  `https://www.tanexlabel.com/sablondosya/TW-200499.1x139mm.docx`.
  Top/left are 567/284 twips, column pitch 5783 twips, row pitch 7881 twips.
- Enlarge the entire unchanged artwork uniformly and rotate it to use the tall
  die cell. Preserve proportions, all content and a safe inset; do not stretch
  or individually reposition artwork components.

### Zebra thermal rolls — both requested orientations

- `100 × 150 mm`: one portrait label per page, artwork oriented at 90°.
- `150 × 100 mm`: one landscape label per page, artwork upright.
- Both retain every original element and enlarge uniformly by 46.53% with a
  minimum 1.5 mm inset. There is no A4 page in either roll profile.
- A roll contains 250 labels per the supplied stock description; this is not a
  job limit. The driver controls media gap, calibration and feeding.
- The 150 mm feed width requires compatible printer hardware.

### Tanex TW-2008 — original calibrated template

- A4 portrait: 210 × 297 mm; 2 columns × 4 rows.
- Labels: 97 × 66.2 mm. Horizontal gap 8 mm; vertical gap 4 mm.
- Internal page padding: top 11.5 mm, bottom 3 mm, left 1 mm, right 4.4 mm.
- Preserve the original template's mixed mm/px positions and content: customer
  logo, issuer logo, ORDER NO, product photograph/name/type, ITEM NAME, COLOR,
  STANDART fallback, packet x/total, CODE128, MADE IN TÜRKIYE.
- No additional printed dimensions, prices, costs, flags or labels.
- Invoice line snapshots are authoritative; do not silently replace them with
  current product details. Validate missing data before printing.
- Use local barcode generation with the unchanged original payload and wait
  for every image to be ready before enabling printing.

The official TW-2008 stock is 99.1 × 67.7 mm (often rounded by sellers). Its
original supplied artwork and positioning remain exactly as above; the stock
size is descriptive and does not replace the user's original calibration.

## Implementation decisions

Use isolated modules in the existing static application, with narrow hooks in
the invoice save flow and existing delivery archive. Keep existing IndexedDB
stores, media deduplication, backup, keyboard, navigation, themes and showroom
cards. A shared operations shell creates dedicated label, costing and archive
pages. It does not alter the physical print document.

Costing stores material usage, unit costs, labor and overhead. Source amounts
retain their selected currency and captured exchange rates; USD remains the
canonical accounting currency. Unknown cost is distinct from an entered zero.
Invoice snapshots preserve historical cost; tax and deposits are not profit.

Archive uses the existing invoice records and flags. Capture historical label
identity and missing costs on an explicit save/archive, never reconstruct an
unavailable historical cost. Restore preserves invoice identity, payments and
delivery status. Writes commit before in-memory state changes.

## Verification

Test physical dimensions and unchanged content against the supplied renderer,
multi-page counts and packet ordering, variant separation, barcode errors,
financial arithmetic/currency conversion, snapshot stability, restore behavior,
failed writes, navigation history, Arabic RTL and five-language responsive UI.
Run the established project checks, inspect mobile/desktop browser layouts,
review the combined changes independently, then publish the verified release.

## Additional roll stock: 80 × 100 mm

The user also requested a separate 80 × 100 mm thermal roll option. Use one
label per page, rotate the complete original artwork by 90 degrees at scale 1,
and preserve its content and proportions. The resulting artwork is 66.2 × 97 mm,
with 6.9 mm side clearance and 1.5 mm top/bottom clearance. Do not infer a brand,
printer model or roll capacity. Remember this selection like the other four
profiles, and regenerate preview/pagination automatically.

## Additional thermal stocks: 70 × 100, 100 × 100, 100 × 200 mm

Provide each size as a separate remembered choice with one label per page.
70 × 100 retains the original artwork at 100%, rotated 90 degrees; the
100 × 100 square keeps it upright and centered at 100%; 100 × 200 rotates and
uniformly enlarges it to fit the available width. Do not infer a brand or roll
capacity. The complete requested set contains eight print profiles, including
the two Tanex A4 sheets. Keep width and height distinct in all selectors.
