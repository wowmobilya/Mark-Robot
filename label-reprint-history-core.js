/* Reprint audit snapshots and append-only outcomes. This module never writes invoices or stock. */
(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.WFLabelReprintHistoryCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const field = 'labelReprintHistory';
  const limits = Object.freeze({maxEntries:500,maxLabels:20000,maxRequestLabels:2000});
  const statuses = ['requested','awaiting_confirmation','printed','cancelled','failed'];
  const resolved = status => ['printed','cancelled','failed'].includes(status);
  const own = (object,key) => Object.prototype.hasOwnProperty.call(object || {},key);
  const integer = (value,min=0) => Number.isSafeInteger(value) && value >= min;
  const object = value => value && typeof value === 'object' && !Array.isArray(value);
  function string(value, max=1000) {
    const result = typeof value === 'string' ? value : typeof value === 'number' && Number.isFinite(value) ? String(value) : '';
    if (result.length > max) throw Error('INVALID_TEXT');
    return result;
  }
  function identity(value) {
    const result = string(value,1000).trim();
    if (!result) throw Error('INVALID_ID');
    return result;
  }
  function date(value) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T/.test(value) || !Number.isFinite(Date.parse(value))) throw Error('INVALID_DATE');
    return new Date(value).toISOString();
  }
  function frozenCopy(value) {
    if (!value || typeof value !== 'object') return value;
    const copy = Array.isArray(value) ? value.map(frozenCopy) : Object.fromEntries(Object.entries(value).map(([key,item])=>[key,frozenCopy(item)]));
    return Object.freeze(copy);
  }
  function operator(value) {
    if (!object(value) || !string(value.name).trim()) return null;
    return {name:string(value.name),source:string(value.source,100)};
  }
  function paper(value, profileId) {
    const source = object(value) ? value : {};
    const result = {id:profileId,name:string(source.name || profileId,200),mediaType:source.mediaType === 'roll' ? 'roll' : 'sheet'};
    for (const key of ['pageWidthMM','pageHeightMM','stockWidthMM','stockHeightMM','columns','rows']) {
      if (source[key] === undefined) continue;
      if (typeof source[key] !== 'number' || !Number.isFinite(source[key]) || source[key] <= 0) throw Error('INVALID_PROFILE');
      result[key] = source[key];
    }
    return result;
  }
  function createRequest(job, options={}) {
    if (!object(job) || job.mode !== 'selected') throw Error('INVALID_REQUEST');
    const now = date(options.now || new Date().toISOString());
    const requestedAt = date(job.requestedAt || now);
    const reason = options.reason || 'lost';
    if (!['lost','damaged','other'].includes(reason)) throw Error('INVALID_REASON');
    if (!integer(job.originalLabelCount,1) || job.originalLabelCount > limits.maxRequestLabels ||
        !integer(job.selectedLabelCount,1) || !Array.isArray(job.labels) || job.labels.length !== job.selectedLabelCount ||
        job.selectedLabelCount > job.originalLabelCount) throw Error('INVALID_LABEL_COUNT');
    const ids = new Set(), sequences = new Set();
    const labels = job.labels.map(source=>{
      if (!object(source)) throw Error('INVALID_LABEL');
      const labelId = identity(source.labelId);
      if (ids.has(labelId) || sequences.has(source.sequenceNumber) ||
          !integer(source.sequenceNumber,1) || source.sequenceNumber > job.originalLabelCount ||
          !integer(source.lineIndex) || !integer(source.unitIndex,1) || !integer(source.currentPacket,1) ||
          !integer(source.totalPackets,1) || source.currentPacket > source.totalPackets) throw Error('INVALID_LABEL');
      ids.add(labelId); sequences.add(source.sequenceNumber);
      const label = {labelId,sequenceNumber:source.sequenceNumber,lineIndex:source.lineIndex,
        productId:string(source.productId),name:string(source.name),color:string(source.color),unitIndex:source.unitIndex,
        currentPacket:source.currentPacket,totalPackets:source.totalPackets};
      if (source.quantity !== undefined) {
        if (!integer(source.quantity,1) || source.unitIndex > source.quantity) throw Error('INVALID_LABEL');
        label.quantity = source.quantity;
      }
      if (source.barcodeText !== undefined) label.barcodeText = string(source.barcodeText,1500);
      return label;
    });
    const actor = operator(options.operator);
    const profileId = identity(job.profileId);
    return frozenCopy({version:1,id:identity(options.id),invoiceId:identity(job.invoiceId),
      invoiceNumber:string(job.invoiceNumber),customerName:string(job.customerName),sourceFingerprint:string(job.sourceFingerprint,160),
      mode:'selected',profileId,paperProfile:paper(job.paperProfile,profileId),originalLabelCount:job.originalLabelCount,
      selectedLabelCount:job.selectedLabelCount,labels,reason,reasonNote:string(options.reasonNote || '',500),
      requestedAt,operator:actor,status:'requested',events:[{type:'requested',at:requestedAt,operator:actor}]});
  }
  function history(settings) {
    const saved = settings?.[field];
    if (!own(settings,field)) return {version:1,revision:0,prunedCount:0,entries:[]};
    if (!object(saved) || saved.version !== 1 || !integer(saved.revision) || !Array.isArray(saved.entries) ||
        saved.entries.some(entry=>!object(entry) || typeof entry.id !== 'string' || !entry.id || !statuses.includes(entry.status) ||
          !Array.isArray(entry.labels) || !entry.labels.length || !Array.isArray(entry.events) || !entry.events.length) ||
        new Set(saved.entries.map(entry=>entry.id)).size !== saved.entries.length) throw Error('INVALID_HISTORY');
    return saved;
  }
  function sameRequest(a,b) {
    return ['version','id','invoiceId','invoiceNumber','customerName','sourceFingerprint','mode','profileId','paperProfile',
      'originalLabelCount','selectedLabelCount','labels','reason','reasonNote','requestedAt','operator']
      .every(key=>JSON.stringify(a[key]) === JSON.stringify(b[key]));
  }
  function retain(entries, policy) {
    const kept = entries.slice();
    let labelCount = kept.reduce((sum,row)=>sum+row.labels.length,0), pruned = 0;
    while (kept.length > policy.maxEntries || labelCount > policy.maxLabels) {
      const index = kept.findIndex(row=>resolved(row.status));
      if (index < 0) throw Error('HISTORY_CAPACITY');
      labelCount -= kept[index].labels.length; kept.splice(index,1); pruned++;
    }
    return {entries:kept,pruned};
  }
  function mergeChange(stored, intent, policy=limits) {
    const settings = object(stored) ? stored : {id:'main'};
    const before = history(settings);
    let entries = before.entries.slice(), pruned = 0;
    if (intent?.type === 'request') {
      const source = intent.request;
      const request = createRequest(source,{id:source?.id,reason:source?.reason,reasonNote:source?.reasonNote,now:source?.requestedAt,operator:source?.operator});
      const existing = entries.find(row=>row.id === request.id);
      if (existing) {
        if (!sameRequest(existing,request)) throw Error('ID_COLLISION');
        return settings;
      }
      entries.push(request);
      ({entries,pruned} = retain(entries,policy));
    } else if (intent?.type === 'event') {
      const index = entries.findIndex(row=>row.id === intent.id);
      if (index < 0) throw Error('MISSING_REQUEST');
      const previous = entries[index], source = intent.event;
      if (!['dialog_closed','printed','cancelled','failed'].includes(source?.type)) throw Error('INVALID_EVENT');
      const status = source.type === 'dialog_closed' ? 'awaiting_confirmation' : source.type;
      // Repeated afterprint/focus callbacks and repeated confirmations are idempotent.
      if (previous.status === status || source.type === 'dialog_closed' && resolved(previous.status)) return settings;
      if (resolved(previous.status)) throw Error('ALREADY_RESOLVED');
      const nextEvent = {type:source.type,at:date(source.at),operator:operator(source.operator)};
      if (source.type === 'failed') nextEvent.message = string(source.message || '',500);
      entries[index] = frozenCopy({...previous,status,events:[...previous.events,nextEvent]});
    } else throw Error('INVALID_ACTION');
    return {...settings,id:'main',[field]:{version:1,revision:before.revision+1,
      prunedCount:(integer(before.prunedCount) ? before.prunedCount : 0)+pruned,entries}};
  }
  async function commit(intent, {writeBatch,publish}) {
    const [saved] = await writeBatch([{store:'settings',type:'merge',id:'main',value:intent,merge:mergeChange}]);
    const result = history(saved);
    await publish?.(result);
    const id = intent.type === 'request' ? intent.request.id : intent.id;
    const record = result.entries.find(entry=>entry.id === id);
    if (!record) throw Error('MISSING_REQUEST');
    return frozenCopy(record);
  }
  function normalize(value) {
    return String(value ?? '').normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase()
      .replace(/[٠-٩]/g,digit=>String(digit.charCodeAt(0)-1632)).replace(/[۰-۹]/g,digit=>String(digit.charCodeAt(0)-1776)).trim();
  }
  function filter(settings, options={}) {
    const term = normalize(options.query);
    return history(settings).entries.map((entry,index)=>({entry,index})).filter(({entry})=>
      (options.invoiceId == null || entry.invoiceId === String(options.invoiceId)) &&
      (!options.status || options.status === 'all' || (options.status === 'pending' ? !resolved(entry.status) : entry.status === options.status)) &&
      (!term || normalize([entry.invoiceNumber,entry.customerName,entry.invoiceId].join(' ')).includes(term)))
      .sort((a,b)=>String(b.entry.requestedAt).localeCompare(String(a.entry.requestedAt)) || b.index-a.index)
      .map(row=>frozenCopy(row.entry));
  }
  function forInvoice(settings, invoiceId) {
    return invoiceId == null || invoiceId === '' ? [] : filter(settings,{invoiceId});
  }
  function summary(entries) {
    const result = {requests:entries.length,requestedLabels:0,printedLabels:0,pending:0,cancelled:0,failed:0};
    for (const row of entries) {
      result.requestedLabels += row.selectedLabelCount;
      if (row.status === 'printed') result.printedLabels += row.selectedLabelCount;
      else if (row.status === 'cancelled') result.cancelled++;
      else if (row.status === 'failed') result.failed++;
      else result.pending++;
    }
    return result;
  }
  return {field,limits,createRequest,mergeChange,commit,forInvoice,filter,summary,history};
});
