# Product cost and profit analysis

The analysis page compares each product’s saved unit cost with its saved selling price at tier A, B or C. It shows unit cost, selling price, unit profit and gross margin. Selecting a tier updates the comparison and the counts of products below cost, missing a cost or missing a price for that tier.

The supplied Home Center program calculates materials, labor and overhead in `calculateItemTotalCost`. Its product report around lines 9250–9290 of `هوم سنتر اتاكيت-1.html` compares selling price, total cost and profit per product. WOW uses its own saved cost sheets and three catalog price tiers for this portfolio view.

## Values and sources

- Unit cost is the saved `product.costing.unitCostUSD` returned by `WFCostCore.savedUnitCost`. The row shows the cost sheet’s original denomination and save date when available. Opening a product name leads to its cost sheet.
- Prices are the product’s saved USD fields `priceA`, `priceB` and `priceC`. Older products without `priceA` can use `priceUSD` for A. The page marks that fallback. Explicit empty, invalid and negative values are unknown. Saved zero is retained. The product editor can persist an empty B or C as zero, and the invoice workflow may substitute A when B or C is empty or zero.
- Unit profit equals selling price minus cost. Margin equals unit profit divided by selling price. A zero selling price can produce a real loss and has an undefined margin. Product counts summarize the catalog. Monetary figures are per unit.
- USD is the default display. TRY and EUR use one confirmed exchange rate for the entire comparison. A saved manual quote for the selected currency takes precedence over its corresponding field in the saved exchange-rate record. Unavailable quotes leave converted monetary values unknown. The underlying USD margin and below-cost status continue to be available.
- The page reads product data and saved rates. Changing tiers, currency, search or sorting updates the view in memory. Product costs, prices, invoice snapshots and application settings are preserved.

## Interface and integration

The route is `cost-analysis` under Products. Its files are `cost-analysis-core.js`, `cost-analysis.js` and `cost-analysis.css`. Load the analysis core after `product-cost-core.js`; the page registers with `WFOperations` and exposes `WFCostAnalysis.open()` and `WFCostAnalysis.refresh()`.

Search matches product name, barcode, ID, color and type, with accent folding. The list sorts by product name, margin or profit. Known values sort ahead of unknown values when sorting by financial measures. Up to 50 matching products are initially shown, and the page can reveal the remainder in groups of 50. The interface supports Arabic, Turkish, English, French and Russian. The narrow layout stacks the figures with their labels under the product name.

## Verification

Nine tests in `tests/cost-analysis-core.test.cjs` and `tests/cost-analysis-page.test.cjs` passed. They cover all three tiers, saved cost provenance, missing and zero values, signed currency conversion, missing or invalid rates, sorting and search, product counts, read-only operation, all five languages, navigation to a cost sheet, progressive display, and stale asynchronous quote reads. Local page tests use the controller and a DOM test fixture. They do not measure browser layout.
