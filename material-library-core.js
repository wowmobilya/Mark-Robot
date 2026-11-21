/* Reusable raw materials. Catalog prices and product BOM prices each retain
   their own currency snapshot; changes require an explicit user action. */
(function (root, factory) {
  'use strict';
  const cost = typeof module === 'object' && module.exports ? require('./product-cost-core.js') : root.WFCostCore;
  const api = factory(cost);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.WFMaterialLibraryCore = api;
})(typeof globalThis === 'object' ? globalThis : this, function (cost) {
  'use strict';
  const own = (value, key) => Object.prototype.hasOwnProperty.call(value || {}, key);
  function fail(code) { const error = new Error(code); error.code = code; throw error; }
  const id = value => ['string','number'].includes(typeof value) ? String(value).trim() : '';
  function listMaterials(settings = {}) {
    const library = settings?.materialLibrary;
    return Array.isArray(library?.materials) ? library.materials.filter(row => row && typeof row === 'object' && !Array.isArray(row) && id(row.id)) : [];
  }
  function prepareMaterial(source = {}, now = new Date().toISOString()) {
    const materialId = id(source.id);
    if (!materialId) fail('MATERIAL_ID_REQUIRED');
    const name = typeof source.name === 'string' ? source.name.trim() : '';
    const unit = typeof source.unit === 'string' ? source.unit.trim() : '';
    if (!name) fail('MATERIAL_NAME_REQUIRED');
    if (!unit) fail('MATERIAL_UNIT_REQUIRED');
    const currency = source.currency || 'USD';
    if (!cost.currencies.includes(currency)) fail('INVALID_CURRENCY');
    const unitPrice = cost.amount(source.unitPrice, 'unitPrice');
    const rates = cost.normalizeRates(source.rates);
    const unitPriceUSD = unitPrice === null ? null : cost.convertCurrency(unitPrice, currency, 'USD', rates);
    return {id:materialId, name, unit, category:typeof source.category === 'string' ? source.category.trim() : '',
      currency, unitPrice, unitPriceUSD, rates, updatedAt:now};
  }
  function convertMaterialCurrency(source, currency) {
    // Validate both quotes even if the price is still blank.
    const ratio = cost.convertCurrency(1, source.currency || 'USD', currency, source.rates);
    const result = cost.clone(source);
    if (!cost.missing(source.unitPrice)) result.unitPrice = cost.amount(source.unitPrice, 'unitPrice', false) * ratio;
    if (!cost.missing(result.unitPrice) && !Number.isFinite(result.unitPrice)) fail('INVALID_AMOUNT');
    result.currency = currency;
    return result;
  }
  function rebaseMaterialRates(source, rates) {
    const next = cost.normalizeRates(rates), result = cost.clone(source);
    if (cost.missing(source.unitPrice)) {
      cost.convertCurrency(1, 'USD', source.currency || 'USD', next);
      result.rates = next; return result;
    }
    const usd = cost.convertCurrency(1, source.currency || 'USD', 'USD', source.rates);
    const factor = cost.convertCurrency(usd, 'USD', source.currency || 'USD', next);
    if (!cost.missing(source.unitPrice)) result.unitPrice = cost.amount(source.unitPrice, 'unitPrice', false) * factor;
    if (!cost.missing(result.unitPrice) && !Number.isFinite(result.unitPrice)) fail('INVALID_AMOUNT');
    result.rates = next; return result;
  }
  function quotedPrice(material, draft) {
    const saved = prepareMaterial(material, material.updatedAt || null);
    return saved.unitPriceUSD === null ? null : cost.convertCurrency(saved.unitPriceUSD, 'USD', draft.currency || 'USD', draft.rates);
  }
  function createLinkedRow(material, draft, rowId) {
    if (!id(rowId)) fail('MATERIAL_ID_REQUIRED');
    const price = quotedPrice(material, draft);
    return {id:id(rowId), name:material.name.trim(), unit:material.unit.trim(), quantity:1, unitPrice:price ?? '',
      catalogId:id(material.id), catalogUpdatedAt:typeof material.updatedAt === 'string' ? material.updatedAt : null};
  }
  function applyLinkedPrice(draft, rowId, material) {
    const row = (draft.materials || []).find(entry => id(entry.id) === id(rowId));
    if (!row || !material || id(row.catalogId) !== id(material.id)) fail('MATERIAL_LINK_MISMATCH');
    // A price per board cannot be applied to a quantity expressed in square meters.
    if (String(row.unit || '').trim() !== String(material.unit || '').trim()) fail('MATERIAL_UNIT_CHANGED');
    const price = quotedPrice(material, draft);
    if (price === null) fail('MATERIAL_PRICE_UNKNOWN');
    const result = cost.clone(draft), updated = result.materials.find(entry => id(entry.id) === id(rowId));
    updated.unitPrice = price;
    updated.catalogUpdatedAt = typeof material.updatedAt === 'string' ? material.updatedAt : null;
    return result;
  }
  function linkedStatus(row, draft, material) {
    if (!id(row?.catalogId)) return {status:'unlinked', price:null};
    if (!material || id(row.catalogId) !== id(material.id)) return {status:'missing', price:null};
    if (String(row.unit || '').trim() !== String(material.unit || '').trim()) return {status:'unitChanged', price:null};
    try {
      const price = quotedPrice(material, draft);
      if (price === null) return {status:'unknown', price:null};
      const previous = cost.amount(row.unitPrice, 'unitPrice');
      const samePrice = previous !== null && Math.abs(previous - price) <= Math.max(1, Math.abs(price)) * 1e-10;
      return {status:samePrice && row.catalogUpdatedAt === material.updatedAt ? 'current' : 'changed', price};
    } catch (_) { return {status:'invalid', price:null}; }
  }
  function mergeMaterial(latest, intent) {
    const base = latest && typeof latest === 'object' ? latest : intent.seed || {};
    if (base.materialLibrary != null && (base.materialLibrary.version !== 1 || !Array.isArray(base.materialLibrary.materials))) fail('MATERIAL_LIBRARY_INVALID');
    const rows = cost.clone(listMaterials(base)), seen = new Set();
    if (base.materialLibrary && rows.length !== base.materialLibrary.materials.length) fail('MATERIAL_LIBRARY_INVALID');
    for (const row of rows) {if (seen.has(id(row.id))) fail('MATERIAL_LIBRARY_INVALID'); seen.add(id(row.id));}
    const material = cost.clone(intent.material), position = rows.findIndex(row => id(row.id) === id(material.id));
    if (intent.creating) {
      if (position >= 0) fail('MATERIAL_ID_EXISTS');
      rows.push(material);
    } else {
      if (position < 0) fail('MATERIAL_REMOVED');
      if ((rows[position].updatedAt ?? null) !== (intent.expectedUpdatedAt ?? null)) fail('MATERIAL_CHANGED');
      rows[position] = material;
    }
    return {...base, id:'main', materialLibrary:{version:1, materials:rows, updatedAt:material.updatedAt}};
  }
  function preserveLibrary(latest, patch) {
    const result = {...cost.clone(latest || {}), ...cost.clone(patch || {}), id:'main'};
    // Legacy full-row settings writers do not own this section. Also preserve
    // its absence after an intentional backup restore that removed the library.
    if (own(latest, 'materialLibrary')) result.materialLibrary = cost.clone(latest.materialLibrary);
    else if (latest) delete result.materialLibrary;
    return result;
  }
  async function persistMaterial({state, draft, creating, expectedUpdatedAt, writeBatch, hydrate, now}) {
    const material = prepareMaterial(draft, now), seed = cost.clone(state.settings || {});
    const [stored] = await writeBatch([{type:'merge', store:'settings', id:'main',
      value:{material, creating:!!creating, expectedUpdatedAt:expectedUpdatedAt ?? null, seed}, merge:mergeMaterial}]);
    const saved = hydrate ? await hydrate(stored) : stored;
    // Publish only after the transaction and asynchronous media hydration finish.
    // Unrelated forms can publish their own section during hydration.
    const current = state.settings || {}, concurrent = {};
    for (const [key, value] of Object.entries(current)) if (key !== 'materialLibrary' && JSON.stringify(value) !== JSON.stringify(seed[key])) concurrent[key] = value;
    state.settings = {...saved, ...concurrent};
    return listMaterials(saved).find(row => id(row.id) === material.id);
  }
  function usage(products, materialId) {
    return (Array.isArray(products) ? products : []).filter(product => (Array.isArray(product?.costing?.materials) ? product.costing.materials : []).some(row => id(row?.catalogId) === id(materialId)));
  }
  function buildUsageIndex(products) {
    const index = new Map();
    for (const product of Array.isArray(products) ? products : []) {
      const rows = product?.costing?.materials;
      if (!Array.isArray(rows)) continue;
      const linked = new Set();
      for (const row of rows) {
        const materialId = id(row?.catalogId);
        if (!materialId || linked.has(materialId)) continue;
        linked.add(materialId);
        if (!index.has(materialId)) index.set(materialId, []);
        index.get(materialId).push(product);
      }
    }
    return index;
  }
  return Object.freeze({listMaterials, prepareMaterial, convertMaterialCurrency, rebaseMaterialRates,
    quotedPrice, createLinkedRow, applyLinkedPrice, linkedStatus, mergeMaterial, preserveLibrary, persistMaterial, usage, buildUsageIndex});
});
