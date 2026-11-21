# Release 199 — Product costing implementation

## Scope

The new `product-costs` destination is a dedicated application page registered
with `WFOperations`. It uses the shared section header and the existing WOW
theme. Product selection/search, material entry, labor, overhead, totals, selling
price comparison, save feedback and discard controls all live within this page.
Cost information is internal; the module does not add it to customer invoices,
package labels or other print output.

Owned implementation files:

- `product-cost-core.js`: pure arithmetic, validation, currency conversion and
  immutable invoice snapshots, exported as `WFCostCore` and CommonJS.
- `product-costs.js`: page and per-product session drafts; explicit atomic save.
- `product-costs.css`: scoped responsive screen styles, including a narrow
  single-column layout and an explicit print exclusion.
- `tests/product-cost-core.test.cjs`: financial and persistence boundary tests.

## Data and calculations

Each saved product may contain:

```js
costing: {
  version: 1,
  currency: 'USD', // USD, TRY or EUR
  materials: [{id, name, unit, quantity, unitPrice}],
  labor,
  overhead,
  rates: {usdTry, usdEur},
  unitCostUSD,
  updatedAt
}
```

The cost for one selling unit is the sum of material quantity × unit price,
plus labor and overhead. The source currency and a saved rate snapshot are kept
alongside the canonical USD cost. Conversion uses the existing app convention:
one USD equals `usdTry` TRY and `usdEur` EUR.

Changing the currency converts every entered monetary field. Material
quantities and blank fields stay unchanged. The “Use current rates” action also
adjusts monetary fields to preserve the same canonical USD amount while
replacing the quote snapshot. Invalid required rates reject conversion before
changing the draft. No intermediate monetary rounding is imposed; display is
formatted to two decimals.

Entirely unentered cost is `null`, distinct from an explicitly entered zero.
Incomplete material rows, negative amounts and non-finite numbers prevent
saving. Optional labor/overhead fields remain `null` when blank. The screen
compares saved A/B/C selling prices against the current draft cost. Margin is
`(sellingPrice - cost) / sellingPrice`; markup is a separate pure helper result
using cost as its denominator. A zero selling price has no defined margin.

## Persistence and drafts

Drafts are keyed by product ID and remain in this browser session when the user
changes route, selects another product, or changes the interface language.
Editing a field only updates that product's draft. The input elements remain
mounted while totals recalculate and labels translate, preserving the shared
touch keyboard's field references. Inputs publish through standard `input` and
`change` events, use stable IDs, and use `inputmode="decimal"` for amounts.

Save validates the draft and passes a `type: 'merge'` operation to
`wfWriteBatch`. The merge reads the latest stored product inside the
transaction and patches only `costing`, retaining unrelated changes. A product
deleted while being edited is not recreated. `S.products` is updated only after
the transaction resolves. On write failure, the saved product object and
editable draft are retained. Repeat saves are disabled during the transaction.
A later display refresh failure is not reported as a failed committed save.

The app update guard remains active while any product draft is unsaved or a
save is pending. Discard is explicit and confirmed inline for the selected
product only. The page does not create a second browser persistence store for
drafts.

## Public integration API

Load `product-cost-core.js`, followed by `product-costs.js`, after
`operations-workspace.js`, and include `product-costs.css`.

```js
WFCosting.open(productId?)
WFCosting.captureInvoiceCosts(invoice, capturedAt?)
WFCosting.invoiceSummary(invoice)
```

`captureInvoiceCosts` is synchronous. It returns a deep-cloned invoice and adds
`costSnapshot` only where that property is absent. It preserves existing
snapshots, including an explicit `null` meaning the cost was unknown when
captured. It works with normal image data and dehydrated media-reference
strings. A known snapshot is:

```js
{
  version: 1,
  unitCostUSD,
  currency,
  rates: {usdTry, usdEur},
  costingUpdatedAt,
  capturedAt
}
```

`invoiceSummary` reads only saved line snapshots, never current product costs.
It returns `status` (`complete`, `partial`, `unknown`, `empty`, or `invalid`),
`lineCount`, `knownCount`, `unknownCount`, `invalidCount`, `knownQuantity`,
`unknownQuantity`, `knownCostUSD`, `totalCostUSD`, `netSalesUSD`, `profitUSD`, and
`margin`.

Costs are quantity-adjusted. Net sales use the invoice subtotal less discount,
excluding KDV, deposits and payments. Complete snapshots produce total cost and
profit; partial/unknown/invalid cost coverage keeps `totalCostUSD`, `profitUSD`
and `margin` null. `knownCostUSD` remains available as an explicitly partial
cost total. Zero-quantity lines do not create uncosted units.

## Verification completed by the costing implementer

- Wrote and ran the focused tests before implementation; all 20 initially
  failed on the missing exported behavior.
- `node --test tests/product-cost-core.test.cjs`: 20 passed, 0 failed.
- `node --check product-cost-core.js` and `node --check product-costs.js`:
  passed.
- `npm test`: 6 passed, 0 failed.
- Parsed the costing copy map: all 59 keys have entries in Arabic, Turkish,
  English, French and Russian.
- Reviewed the page's stable input lifecycle and per-product draft ownership.

## Integration review follow-up

The integration review reproduced a media-cache defect with the real application
storage functions: a newer product image written by another tab remained an
unrenderable `wfmedia:` reference after saving its cost. The save adapter now
awaits `wfHydrateDBValue`, loading any missing media before publishing the merged
product into application state.

`tests/operations-integration.test.cjs` executes the actual costing save adapter,
invoice save handler, archive transition core and application media transaction
functions. Its four checks cover the media-cache regression, material identifier
uniqueness, atomic archive
logo persistence with explicit unknown costs, and the real invoice snapshot
hook while canonical totals remain USD. The media regression failed before the
fix and passed afterwards.

The review also identified that the old session-local material ID counter could
reuse a saved row ID after a reload. New row IDs now use the app record-ID
generator (with UUID/time fallbacks) and check all saved and pending draft row
IDs for collisions. Repeated imported row IDs are normalized without dropping
rows or changing their amounts. Regression coverage verifies preserved rows,
distinct new identifiers, and identifiers reserved by other saved/draft rows.

Browser verification is reserved for the root integrator to avoid competing
browser sessions. This report does not claim physical-device, printer, or
browser viewport verification by this implementer.
