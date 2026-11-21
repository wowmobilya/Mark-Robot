# Release 204 — reusable material library

## Original-file evidence and the gap

The uploaded `هوم سنتر اتاكيت-1.html` has an actual shared materials collection:

- Lines 6110–6115 initialize `furnitureMaterials` separately from furniture items.
- `calculateItemTotalCost` at line 6781 resolves each usage by `materialId` and multiplies its quantity by the shared material price.
- `buildMaterialDropdown` at line 6973 offers saved materials grouped by category, with unit, price and quantity controls. Line 7324 saves `{materialId, quantity}` usages.
- The final `openMaterialModal` at line 15289 manages the material name, measurement unit, category, price and currency.

WOW release 203 already had per-product BOM, labor, overhead, saved currency snapshots and price-tier margin comparison. Its material rows were independent copies, without a reusable master catalog. This release adds that missing catalog through a native page while retaining the explicit product-cost save workflow.

## Delivered behavior

The `material-library` route follows the WOW operations shell, theme tokens, navigation header and five interface languages: Arabic, Turkish, English, French and Russian. It provides a searchable list, filters for unknown prices and linked materials, progressive results, an inline material editor, saved exchange-rate details, related-product actions, explicit save, refresh and discard. It uses the existing touch keyboard through ordinary `.fi` controls and input/change events.

Each saved material has its own stable ID. Materials with the same name remain separate records. Each material draft persists independently through route and language changes. A pending save or dirty draft registers with `WFAppUpdates`. Material saves serialize within the page so pending hydration cannot produce out-of-order in-page saves.

From a product cost sheet, **Choose from material library** opens the dedicated library page with the product selection context. **Add to product cost draft** copies the saved name, unit and converted price, preserves its catalog link, and returns to the cost sheet. Quantity starts at one for review. This changes only the draft; saving the product cost remains explicit.

Linked BOM rows show whether their price matches the library. **Apply current library price** changes only the selected row's draft price and catalog timestamp. Opening or refreshing either page does not reprice a product. A changed measurement unit blocks direct application because the existing quantity may represent a different amount. Unknown, missing or invalid library prices never replace a known product cost with zero. An explicit unlink action keeps current values while removing the relationship from the draft.

The library has 58 translated copy keys. Product costs now has 70 translated keys, including linked-material status and actions.

## Data model

The catalog is stored in the existing `settings` store, inside its `main` record:

```js
S.settings.materialLibrary = {
  version: 1,
  materials: [{
    id, name, unit, category,
    currency,             // USD, TRY or EUR
    unitPrice,            // null when unentered; explicit zero is valid
    unitPriceUSD,
    rates: {usdTry, usdEur},
    updatedAt
  }],
  updatedAt
};
```

Product BOM rows retain their existing fields and gain optional linkage metadata:

```js
{
  id, name, unit, quantity, unitPrice,
  catalogId,
  catalogUpdatedAt
}
```

The BOM `unitPrice` is always expressed in `product.costing.currency`. Selection converts the catalog price to USD with the catalog's saved rates, then converts USD into the product draft's currency with that draft's saved rates. Changing the catalog currency converts the entered price; refreshing its rate snapshot preserves canonical USD value. Blank prices remain unknown.

The costing core preserves linkage during validation and preparation. The cost page preserves it while loading and normalizing drafts, including duplicate-row-ID normalization. Historical invoice `costSnapshot` values, including explicit `null`, are untouched.

The existing full backup already serializes `S.settings` and nested product rows, so the library and linkage survive backup/restore without a database version change or separate store.

## Persistence and concurrency

`WFMaterialLibraryCore.persistMaterial` prepares the material and uses an explicit `wfWriteBatch` merge of `settings/main`. It reads the latest stored settings and changes only the identified material. Other materials and unrelated settings survive. A same-material version conflict is reported instead of overwriting the remote edit. Malformed or unsupported catalog versions are not rewritten by material edits.

The helper awaits transaction completion and `wfHydrateDBValue` before publishing state. Failed writes leave application state and drafts intact. The live page reads committed settings on entry/refresh and after a conflict, publishes only the library section, and avoids replacing focused inputs or dirty drafts. Discard then loads the latest saved material rather than repeating a stale-cache conflict.

The pure `preserveLibrary(latest, patch)` helper documents ownership for legacy full-row settings writes: the current stored library wins, including explicit `null`, unknown future versions and intentional absence after restore. Root integration adds equivalent protection to the shared writer, covering legacy invoice-counter/settings/media-migration writers without blocking this module's explicit merges. Backup restore remains an intentional replacement.

## APIs and shell integration

```js
WFMaterialLibrary.open(materialId?)
WFMaterialLibrary.chooseForProduct(productId)
WFMaterialLibrary.refresh()       // asynchronous committed-data refresh
WFMaterialLibrary.list()          // cloned saved rows
WFCosting.addCatalogMaterial(catalogId, productId?) // adds to product draft
```

The page registers through `WFOperations` with ID `material-library`, parent `products`, and icon `material`. The shared shell owns sidebar/search history, route names, mobile context navigation and assets.

Script order:

1. `product-cost-core.js`
2. `material-library-core.js`
3. `product-costs.js`
4. `material-library.js`

The page modules use lazy API calls so library selection can return to the existing product-cost page.

Stable controls for context navigation: `wfMaterialAdd`, `wfMaterialSave`, `wfMaterialRefresh`, `wfMaterialSearch`. Editor controls: `wfMaterialName`, `wfMaterialUnit`, `wfMaterialCategory`, `wfMaterialCurrency`, `wfMaterialUnitPrice`. Product-cost entry action: `wfCostChooseLibrary`.

## Validation

Executed on the working tree:

```text
node --check material-library-core.js
node --check material-library.js
node --check product-cost-core.js
node --check product-costs.js

node --test tests/material-library.test.cjs \
  tests/material-library-page.test.cjs \
  tests/product-cost-core.test.cjs \
  tests/operations-integration.test.cjs
38 tests passed

npm test
6 tests passed
```

Focused coverage includes unknown versus zero prices, invalid money and quotes, conversions through two rate snapshots, rate refresh, immutable linked-price application, changed units, stable metadata through save/reload, same-name records, optimistic conflicts, latest-row merge, awaited hydration, failed writes and immutable invoice snapshots.

VM integration tests execute the actual page modules. They cover catalog-to-cost navigation, explicit draft/save boundaries, all five locale switches with stable inputs, independent drafts, update guards, and conflict/reload/discard/retry. A regression verifies that applying a material price keeps the labor input and its draft binding intact, so the next labor edit is saved correctly.

Responsive CSS was reviewed for narrow single-column layout, wrapping actions, logical RTL properties and bounded input widths. Browser/layout verification remains with the root agent as requested. This subagent did not control the shared browser, commit or deploy.
