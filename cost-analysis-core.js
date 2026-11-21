/* Read-only product comparisons. Saved prices and unit costs are canonical USD. */
(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./product-cost-core.js'));
  else root.WFCostAnalysisCore = factory(root.WFCostCore);
})(typeof globalThis === 'object' ? globalThis : this, function (costs) {
  'use strict';

  function savedRates(settings, quote) {
    const manual = costs.normalizeRates({usdTry:settings?.manualUsdTry, usdEur:settings?.manualUsdEur});
    const saved = costs.normalizeRates({usdTry:quote?.value, usdEur:quote?.eur});
    return {usdTry:manual.usdTry ?? saved.usdTry, usdEur:manual.usdEur ?? saved.usdEur};
  }

  function amount(value) {
    try { return costs.amount(value); } catch (_) { return null; }
  }

  function searchText(value, locale) {
    return String(value ?? '').toLocaleLowerCase(locale).normalize('NFKD')
      .replace(/\p{M}/gu, '').replace(/ı/g, 'i').trim();
  }

  function analyze(products, options = {}) {
    const tier = ['A','B','C'].includes(options.tier) ? options.tier : 'A';
    const currency = costs.currencies.includes(options.currency) ? options.currency : 'USD';
    const rates = costs.normalizeRates(options.rates);
    const rate = currency === 'USD' ? 1 : currency === 'TRY' ? rates.usdTry : rates.usdEur;
    const locale = options.locale || 'en';
    const needle = searchText(options.search, locale);
    const counts = {all:0, belowCost:0, missingCost:0, missingPrice:0};
    const rows = [];
    function display(value) {
      if (value === null || rate === null) return null;
      if (currency === 'USD') return value;
      try {
        const converted = costs.convertCurrency(Math.abs(value), 'USD', currency, rates);
        return value < 0 ? -converted : converted;
      } catch (_) { return null; }
    }
    for (const product of Array.isArray(products) ? products : []) {
      if (!product || typeof product !== 'object' || Array.isArray(product)) continue;
      const costUSD = costs.savedUnitCost(product.costing);
      const priceSource = tier === 'A' && product.priceA === undefined ? 'priceUSD' : 'price' + tier;
      const priceUSD = amount(product[priceSource]);
      const {profitUSD, margin} = costs.comparePrice(costUSD, priceUSD);
      const missingCost = costUSD === null, missingPrice = priceUSD === null, belowCost = profitUSD !== null && profitUSD < 0;
      counts.all++;
      if (belowCost) counts.belowCost++;
      if (missingCost) counts.missingCost++;
      if (missingPrice) counts.missingPrice++;
      if (options.filter === 'belowCost' && !belowCost ||
          options.filter === 'missingCost' && !missingCost ||
          options.filter === 'missingPrice' && !missingPrice) continue;
      const matchFields = [product.name,product.barcode,product.id,product.color,product.type];
      if (needle && !searchText(matchFields.join(' '), locale).includes(needle)) continue;
      rows.push({
        id:product.id, name:String(product.name ?? ''), barcode:String(product.barcode ?? ''), priceSource,
        costCurrency:costs.currencies.includes(product.costing?.currency) ? product.costing.currency : null,
        costUpdatedAt:typeof product.costing?.updatedAt === 'string' ? product.costing.updatedAt : null,
        cost:display(costUSD), price:display(priceUSD), profit:display(profitUSD),
        costUSD, priceUSD, profitUSD, margin:Number.isFinite(margin) ? margin : null, belowCost
      });
    }
    const collator = new Intl.Collator(locale, {numeric:true, sensitivity:'base'});
    const field = options.sort === 'profitDesc' ? 'profitUSD' : ['marginAsc','marginDesc'].includes(options.sort) ? 'margin' : null;
    rows.sort((a,b) => {
      if (field && a[field] !== b[field]) {
        if (a[field] === null) return 1;
        if (b[field] === null) return -1;
        return options.sort === 'marginAsc' ? a[field] - b[field] : b[field] - a[field];
      }
      return collator.compare(a.name,b.name) || collator.compare(String(a.id ?? ''),String(b.id ?? ''));
    });
    return {tier,currency,rate,counts,rows};
  }
  return Object.freeze({savedRates,analyze});
});
