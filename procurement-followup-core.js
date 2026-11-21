/* Operational purchase history. FIFO uses only confirmed receipts and dated, delivered invoices. */
(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./purchase-planner-core.js'), require('./account-statement-core.js'));
  } else {
    root.WFProcurementFollowupCore = factory(root.WFPurchasePlannerCore, root.WOWStatementCore);
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (planner, statement) {
  'use strict';
  const field = 'followup';
  const limits = Object.freeze({maxEvents:50000, maxEventsPerOrder:5000, maxReceiptLines:200000, maxLinesPerEvent:500});
  const own = (obj, key) => Object.prototype.hasOwnProperty.call(obj || {}, key);
  const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
  const integer = value => Number.isSafeInteger(value) && value >= 0;
  const text = value => typeof value === 'string' ? value : typeof value === 'number' && Number.isFinite(value) ? String(value) : '';
  const idOf = value => text(value).trim() ? text(value) : '';
  const compare = (a,b) => a < b ? -1 : a > b ? 1 : 0;
  function fail(code) { const error = new Error(code); error.code = code; throw error; }
  function freeze(value) {
    if (value && typeof value === 'object' && !Object.isFrozen(value)) {
      for (const child of Object.values(value)) freeze(child);
      Object.freeze(value);
    }
    return value;
  }
  const isoDay = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && statement.day(value) === value;

  // UTC string with nine fractional digits preserves order across offsets and sub-millisecond imports.
  function instant(value) {
    if (typeof value !== 'string') return null;
    const match = /^(\d{4}-\d{2}-\d{2})T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.(\d{1,9}))?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)$/.exec(value);
    if (!match || !isoDay(match[1])) return null;
    const time = Date.parse(value);
    if (!Number.isFinite(time)) return null;
    const utc = new Date(time).toISOString();
    return utc.length === 24 ? utc.slice(0,19) + '.' + (match[2] || '').padEnd(9,'0') + 'Z' : null;
  }
  const eventExtras = {
    ordered:['expectedDate'], expected:['expectedDate'], receipt:['lines'],
    void_receipt:['receiptId'], cancel:[], reopen:[]
  };
  function parseEvent(raw) {
    if (!object(raw) || typeof raw.type !== 'string' || !own(eventExtras,raw.type) || typeof raw.id !== 'string' || !raw.id.trim() ||
        raw.id.length > 512 || !instant(raw.at)) fail('INVALID_EVENT');
    const allowed = ['id','type','at','operator','note',...eventExtras[raw.type]];
    if (Object.keys(raw).some(k => !allowed.includes(k))) fail('INVALID_EVENT');
    const event = {id:raw.id, type:raw.type, at:raw.at};
    for (const [key,max] of [['operator',512],['note',2000]]) {
      if (!own(raw,key)) continue;
      if (typeof raw[key] !== 'string' || raw[key].length > max) fail('INVALID_EVENT');
      event[key] = raw[key];
    }
    if (raw.type === 'expected' || own(raw,'expectedDate')) {
      if (raw.expectedDate !== '' && !isoDay(raw.expectedDate)) fail('INVALID_EXPECTED_DATE');
      event.expectedDate = raw.expectedDate;
    }
    if (raw.type === 'receipt') {
      if (!Array.isArray(raw.lines) || !raw.lines.length) fail('INVALID_RECEIPT');
      if (raw.lines.length > limits.maxLinesPerEvent) fail('FOLLOWUP_CAPACITY');
      const keys = new Set();
      event.lines = Array.from(raw.lines, line => {
        if (!object(line) || Object.keys(line).some(k => k !== 'key' && k !== 'quantity') ||
            typeof line.key !== 'string' || !line.key || keys.has(line.key) ||
            !integer(line.quantity) || !line.quantity) fail('INVALID_RECEIPT');
        keys.add(line.key);
        return {key:line.key, quantity:line.quantity};
      });
    }
    if (raw.type === 'void_receipt') {
      if (typeof raw.receiptId !== 'string' || !raw.receiptId.trim() || !event.note?.trim()) fail('INVALID_REVERSAL');
      event.receiptId = raw.receiptId;
    }
    return event;
  }
  function readLedger(settings) {
    const ledger = {version:1,revision:0,records:[]}, records = new Map(), eventOwners = new Map();
    let receiptLines = 0;
    if (own(settings?.procurementOrders,field)) {
      const saved = settings.procurementOrders[field];
      if (!object(saved) || saved.version !== 1 || !integer(saved.revision) || !Array.isArray(saved.records)) fail('INVALID_FOLLOWUP');
      if (saved.records.length > limits.maxEvents || saved.revision > limits.maxEvents) fail('FOLLOWUP_CAPACITY');
      for (const row of saved.records) {
        const orderId = idOf(row?.orderId);
        if (!orderId || records.has(orderId) || !Array.isArray(row.events) || !row.events.length ||
            row.revision !== row.events.length) fail('INVALID_FOLLOWUP');
        if (row.revision > limits.maxEventsPerOrder || ledger.revision + row.revision > limits.maxEvents) fail('FOLLOWUP_CAPACITY');
        const events = [];
        for (const raw of row.events) {
          let entry;
          try { entry = parseEvent(raw); } catch (err) {
            if (err.code === 'FOLLOWUP_CAPACITY') throw err;
            fail('INVALID_FOLLOWUP');
          }
          if (eventOwners.has(entry.id)) fail('INVALID_FOLLOWUP');
          eventOwners.set(entry.id,orderId);
          receiptLines += entry.lines?.length || 0;
          if (receiptLines > limits.maxReceiptLines) fail('FOLLOWUP_CAPACITY');
          events.push(entry);
        }
        const record = {orderId,revision:row.revision,events};
        records.set(orderId,record);
        ledger.records.push(record);
        ledger.revision += record.revision;
      }
      if (saved.revision !== ledger.revision) fail('INVALID_FOLLOWUP');
    }
    return {ledger,records,eventOwners,receiptLines};
  }
  function getLedger(settings) { return freeze(readLedger(settings).ledger); }

  function initOrder(source, id) {
    if (source.version !== 1 || !Array.isArray(source.lines) || !source.lines.length || source.lines.length > 500) fail('ORDER_HISTORY_INVALID');
    const row = {id,orderNumber:text(source.orderNumber),supplier:{name:text(source.supplier?.name),contact:text(source.supplier?.contact)},
      status:'prepared',revision:0,expectedDate:'',overdue:false,orderedUnits:0,receivedUnits:0,outstandingUnits:0,
      allocatedUnits:0,balanceUnits:0,lines:[],events:[]};
    const byKey = new Map();
    for (const item of source.lines) {
      const productId = idOf(item?.productId), orderedUnits = planner.quantity(item?.quantity);
      if (!productId || !orderedUnits || !Number.isSafeInteger(row.orderedUnits + orderedUnits)) fail('ORDER_HISTORY_INVALID');
      const color = text(item.color), dimensions = text(item.dimensions), key = planner.modelKey(productId,color,dimensions);
      if (byKey.has(key)) fail('ORDER_HISTORY_INVALID');
      const line = {key,productId,name:text(item.name),color,dimensions,orderedUnits,receivedUnits:0,outstandingUnits:orderedUnits,
        allocatedUnits:0,balanceUnits:0,allocations:[]};
      byKey.set(key,line); row.lines.push(line); row.orderedUnits += orderedUnits;
    }
    row.outstandingUnits = row.orderedUnits;
    return {source,row,byKey,created:instant(source.createdAt),active:new Map(),markedOrdered:false,cancelled:false};
  }
  function readOrders(settings) {
    const orders = new Map(), invalid = new Set(), diagnostics = [];
    if (!object(settings)) fail('ORDER_HISTORY_INVALID');
    if (own(settings,'procurementOrders')) {
      const section = settings.procurementOrders;
      if (!object(section) || section.version !== 1 || !Array.isArray(section.orders)) fail('ORDER_HISTORY_INVALID');
      for (const source of section.orders) {
        const id = idOf(source?.id);
        if (invalid.has(id)) continue;
        try {
          if (!id || orders.has(id)) fail('ORDER_HISTORY_INVALID');
          orders.set(id,initOrder(source,id));
        } catch (err) {
          if (err.code !== 'ORDER_HISTORY_INVALID') throw err;
          orders.delete(id); invalid.add(id);
          diagnostics.push(id ? {code:'invalidOrder',orderId:id} : {code:'invalidOrder'});
        }
      }
    }
    return {orders,invalid,diagnostics};
  }
  function apply(order,event) {
    const {row,active,byKey} = order;
    const open = !order.cancelled && row.outstandingUnits > 0;
    switch (event.type) {
      case 'ordered':
        if (row.status !== 'prepared') fail('INVALID_TRANSITION');
        order.markedOrdered = true;
        break;
      case 'expected':
        if (!open) fail('INVALID_TRANSITION');
        break;
      case 'cancel':
        if (!open) fail('INVALID_TRANSITION');
        order.cancelled = true;
        break;
      case 'reopen':
        if (!order.cancelled) fail('INVALID_TRANSITION');
        order.cancelled = false;
        break;
      case 'receipt':
      case 'void_receipt': {
        const receiving = event.type === 'receipt';
        const receipt = receiving ? event : active.get(event.receiptId);
        if (receiving && order.cancelled) fail('INVALID_TRANSITION');
        if (!receipt) fail('INVALID_REVERSAL');
        if (receiving && order.created && instant(event.at) < order.created) fail('INVALID_RECEIPT');
        if (!receiving && instant(event.at) < instant(receipt.at)) fail('INVALID_REVERSAL');
        for (const item of receipt.lines) {
          const line = byKey.get(item.key);
          if (!line) fail('INVALID_RECEIPT');
          if (receiving && item.quantity > line.outstandingUnits) fail('OVER_RECEIPT');
          const delta = receiving ? item.quantity : -item.quantity;
          line.receivedUnits += delta; line.outstandingUnits -= delta; line.balanceUnits = line.receivedUnits;
          row.receivedUnits += delta; row.outstandingUnits -= delta; row.balanceUnits = row.receivedUnits;
        }
        if (receiving) active.set(event.id,event);
        else active.delete(receipt.id);
        break;
      }
    }
    if (own(event,'expectedDate')) row.expectedDate = event.expectedDate;
    row.status = order.cancelled ? 'cancelled' : row.outstandingUnits === 0 ? 'received' :
      row.receivedUnits ? 'partial' : order.markedOrdered ? 'ordered' : 'prepared';
    row.events.push(event);
    row.revision++;
  }
  // Replaying the stored transitions also catches externally imported impossible histories.
  function replay(book,history) {
    for (const record of history.ledger.records) {
      const order = book.orders.get(record.orderId);
      if (!order) fail('INVALID_FOLLOWUP');
      try { for (const event of record.events) apply(order,event); }
      catch (err) { if (!err.code) throw err; fail('INVALID_FOLLOWUP'); }
    }
  }
  const sameEvent = (a,b) => JSON.stringify(a) === JSON.stringify(b); // parseEvent fixes property order.
  function mergeChange(settings,intent) {
    const book = readOrders(settings), history = readLedger(settings);
    replay(book,history);
    const orderId = idOf(intent?.orderId), order = book.orders.get(orderId);
    if (!order) fail(book.invalid.has(orderId) ? 'ORDER_HISTORY_INVALID' : 'MISSING_ORDER');
    if (!integer(intent.expectedRevision)) fail('FOLLOWUP_CHANGED');
    const event = parseEvent(intent.event);
    if (history.eventOwners.has(event.id)) {
      if (history.eventOwners.get(event.id) === orderId && sameEvent(order.row.events.find(e => e.id === event.id),event)) return settings;
      fail('EVENT_ID_COLLISION');
    }
    if (intent.expectedRevision !== order.row.revision) fail('FOLLOWUP_CHANGED');
    if (history.ledger.revision >= limits.maxEvents || order.row.revision >= limits.maxEventsPerOrder ||
        history.receiptLines + (event.lines?.length || 0) > limits.maxReceiptLines) fail('FOLLOWUP_CAPACITY');
    apply(order,event);
    const record = {orderId,revision:order.row.revision,events:order.row.events};
    const records = history.ledger.records.map(r => r.orderId === orderId ? record : r);
    if (!history.records.has(orderId)) records.push(record);
    return {...settings,id:'main',procurementOrders:{...settings.procurementOrders,
      [field]:{version:1,revision:history.ledger.revision+1,records}}};
  }

  // Compare only procurement identity, avoiding expensive media, branding and price data.
  function orderIdentity(source) {
    if (!Array.isArray(source?.lines)) fail('ORDER_HISTORY_INVALID');
    return JSON.stringify([idOf(source.id),source.version,text(source.createdAt),text(source.orderNumber),text(source.supplier?.name),
      source.lines.map(line => [planner.modelKey(line?.productId,line?.color,line?.dimensions),planner.quantity(line?.quantity),text(line?.name)])]);
  }
  function copySnapshot(order) {
    return typeof structuredClone === 'function' ? structuredClone(order) : JSON.parse(JSON.stringify(order));
  }
  async function publishSnapshot(state,saved,hydrate,previous={section:state.settings?.procurementOrders,ledger:state.settings?.procurementOrders?.[field]}) {
    const incoming = readLedger(saved), remoteBook = readOrders(saved);
    replay(remoteBook,incoming);
    const existingIds = new Set(planner.listOrders(state.settings).map(row => idOf(row?.id)));
    const missing = Array.from(remoteBook.orders.values()).filter(order => !existingIds.has(order.row.id)).map(order => order.source);
    // Audit fields are plain data and must never be interpreted as media by a general settings hydrator.
    const section = {version:1,orders:missing.map(copySnapshot)};
    const hydrated = hydrate ? await hydrate({id:'main',procurementOrders:section}) : {procurementOrders:section};
    const newRows = new Map(planner.listOrders(hydrated).map(row => [idOf(row?.id),row]));
    // Hydration can yield to another planner or follow-up write. Re-read the visible section now.
    const current = readLedger(state.settings), visibleSection = state.settings?.procurementOrders;
    if (current.ledger.revision > incoming.ledger.revision) return freeze(current.ledger);
    const changed = previous.ledger !== visibleSection?.[field];
    if (changed && previous.ledger && (!visibleSection?.[field] || current.ledger.revision < previous.ledger.revision)) return freeze(current.ledger);
    if (previous.section && previous.section !== visibleSection) {
      const visibleIds = new Set(planner.listOrders(state.settings).map(row => idOf(row?.id)));
      if (previous.section.orders?.some(row => !visibleIds.has(idOf(row?.id)))) return freeze(current.ledger);
    }
    for (const previous of current.ledger.records) {
      const next = incoming.records.get(previous.orderId);
      if (!next || previous.revision > next.revision || previous.events.some((e,i) => !sameEvent(e,next.events[i]))) {
        if (changed) return freeze(current.ledger);
        fail('FOLLOWUP_CHANGED');
      }
    }
    const localSection = state.settings?.procurementOrders ?? {version:1,orders:[]}, localBook = readOrders({procurementOrders:localSection});
    const orders = localSection.orders.slice();
    for (const [orderId,remote] of remoteBook.orders) {
      const local = localBook.orders.get(orderId);
      if (localBook.invalid.has(orderId) || local && orderIdentity(local.source) !== orderIdentity(remote.source)) fail('ORDER_HISTORY_INVALID');
      if (local) continue;
      const addition = newRows.get(orderId);
      if (!addition || orderIdentity(addition) !== orderIdentity(remote.source)) fail('FOLLOWUP_SAVE_FAILED');
      orders.push(addition);
    }
    const ledger = freeze(incoming.ledger);
    state.settings = {...state.settings,procurementOrders:{...localSection,orders,[field]:ledger}};
    return ledger;
  }

  async function persistChange(intent,{state,writeBatch,hydrate}) {
    const request = {orderId:idOf(intent?.orderId),expectedRevision:intent?.expectedRevision,event:parseEvent(intent?.event)};
    const previous = {section:state.settings?.procurementOrders,ledger:state.settings?.procurementOrders?.[field]};
    const visible = planner.listOrders(state.settings).find(row => idOf(row?.id) === request.orderId);
    const identity = visible && orderIdentity(visible);
    const [stored] = await writeBatch([{store:'settings',type:'merge',id:'main',value:request,merge(latest,prepared) {
      if (!sameEvent(request.event,parseEvent(prepared?.event))) fail('INVALID_EVENT');
      if (identity) {
        const target = planner.listOrders(latest).find(row => idOf(row?.id) === request.orderId);
        if (target && identity !== orderIdentity(target)) fail('ORDER_HISTORY_INVALID');
      }
      return mergeChange(latest,prepared);
    }}]);
    const committed = readLedger(stored), record = committed.records.get(request.orderId);
    const index = record?.events.findIndex(event => event.id === request.event.id) ?? -1;
    if (index < 0 || !sameEvent(record.events[index],request.event)) fail('FOLLOWUP_SAVE_FAILED');
    const exact = {orderId:record.orderId,revision:index+1,events:record.events.slice(0,index+1)};
    await publishSnapshot(state,stored,hydrate,previous);
    return freeze(exact);
  }

  const metrics = ['orderedUnits','receivedUnits','outstandingUnits','allocatedUnits','balanceUnits','unallocatedUnits'];
  const makeTotals = value => Object.fromEntries(metrics.map(metric => [metric,value]));
  function unknownReport(code) {
    return {version:1,complete:false,diagnostics:[{code}],totals:makeTotals(null),orders:[]};
  }
  function invoiceState(invoice) {
    const status = text(invoice.status).toLowerCase().trim();
    const excluded = Boolean(invoice.deleted || invoice.isDeleted || invoice.cancelled || invoice.canceled ||
      invoice.voided || ['draft','void','voided','cancelled','canceled','deleted'].includes(status));
    const kinds = [invoice.type,invoice.invoiceType].map(value => text(value).toLowerCase().replace(/[-_ ]/g,''));
    const credit = invoice.isCreditNote === true || invoice.creditNote === true ||
      kinds.some(kind => kind === 'credit' || kind === 'creditnote') ||
      [invoice.grandTotal,invoice.grandTotalUSD].some(amount => typeof amount === 'number' ? amount < 0 :
        typeof amount === 'string' && Number(planner.normalize(amount).replace('−','-').replace('٫','.')) < 0);
    return {excluded,credit};
  }
  function saleLine(line) {
    if (!object(line)) return null;
    const saved = line.productSnapshot;
    const color = text(line.color === undefined ? saved?.color : line.color);
    const dimensions = text(line.dimensions === undefined ? saved?.dimensions : line.dimensions);
    const productId = idOf(line.productId ?? line.itemId);
    const quantity = planner.quantity(line.qty ?? line.quantity);
    return {productId,color,dimensions,quantity,key:planner.modelKey(productId,color,dimensions)};
  }
  function signature(invoice) {
    // Archive-time cost snapshots and media may differ. Neither participates in a unit allocation.
    const {excluded,credit} = invoiceState(invoice);
    return JSON.stringify([excluded,credit,invoice.delivered === true,instant(invoice.deliveredAt) ?? text(invoice.deliveredAt),
      text(invoice.invNo),text(invoice.grandTotal ?? invoice.grandTotalUSD),Array.isArray(invoice.items) ? invoice.items.map(item => {
        const line = saleLine(item);
        return line ? [line.key,line.quantity] : null;
      }) : null]);
  }
  function eligibleInvoices(invoices,diagnostics,asOf) {
    const groups = new Map();
    for (const invoice of invoices) {
      if (!object(invoice)) { diagnostics.push({code:'invalidInvoice'}); continue; }
      const invoiceId = idOf(invoice.id);
      if (!invoiceId) { diagnostics.push({code:'missingInvoiceId'}); continue; }
      const previous = groups.get(invoiceId);
      if (!previous) { groups.set(invoiceId,{invoice}); continue; }
      previous.duplicate = true;
      if (previous.conflict) continue;
      previous.signature ??= signature(previous.invoice);
      previous.conflict = previous.signature !== signature(invoice);
    }
    const delivered = [];
    for (const [invoiceId,group] of groups) {
      if (group.conflict) { diagnostics.push({code:'duplicateConflict',invoiceId}); continue; }
      if (group.duplicate) diagnostics.push({code:'duplicateInvoice',invoiceId});
      const {invoice} = group, {excluded,credit} = invoiceState(invoice);
      if (excluded || invoice.delivered !== true) continue;
      if (credit) { diagnostics.push({code:'creditQuantityUnknown',invoiceId}); continue; }
      const time = instant(invoice.deliveredAt);
      if (!time) diagnostics.push({code:'undatedDelivery',invoiceId});
      if (time && time > asOf) { diagnostics.push({code:'futureDelivery',invoiceId}); continue; }
      delivered.push({invoiceId,invoice,time});
    }
    return delivered.sort((a,b) => compare(a.time || '',b.time || '') || compare(a.invoiceId,b.invoiceId));
  }
  function receiptQueues(book) {
    const queues = new Map();
    for (const order of book.orders.values()) {
      for (const event of order.active.values()) {
        const time = instant(event.at);
        for (const item of event.lines) {
          const line = order.byKey.get(item.key);
          if (!line.color.trim() || !line.dimensions.trim()) continue;
          if (!queues.has(line.key)) queues.set(line.key,{lots:[],index:0});
          queues.get(line.key).lots.push({row:order.row,line,receiptId:event.id,time,left:item.quantity});
        }
      }
    }
    for (const queue of queues.values()) {
      // Stable tie-breakers avoid depending on backup order or browser locale.
      queue.lots.sort((a,b) => compare(a.time,b.time) || compare(a.row.id,b.row.id) || compare(a.receiptId,b.receiptId));
    }
    return queues;
  }
  function consume(queue,delivery,quantity) {
    let left = quantity;
    while (left && queue && queue.index < queue.lots.length) {
      const lot = queue.lots[queue.index];
      if (lot.time > delivery.time) break;
      const used = Math.min(lot.left,left);
      lot.line.allocations.push({invoiceId:delivery.invoiceId,invoiceNumber:text(delivery.invoice.invNo),
        deliveredAt:delivery.invoice.deliveredAt,quantity:used,receiptId:lot.receiptId});
      lot.line.allocatedUnits += used; lot.row.allocatedUnits += used;
      lot.line.balanceUnits -= used; lot.row.balanceUnits -= used;
      lot.left -= used; left -= used;
      if (!lot.left) queue.index++;
    }
    return left;
  }
  function allocate(book,invoices,diagnostics,add,asOf) {
    const queues = receiptQueues(book);
    for (const delivery of eligibleInvoices(invoices,diagnostics,asOf)) {
      const {invoiceId,invoice,time} = delivery;
      if (!Array.isArray(invoice.items) || !invoice.items.length) { diagnostics.push({code:'emptyInvoice',invoiceId}); continue; }
      for (const [lineIndex,item] of invoice.items.entries()) {
        const line = saleLine(item);
        if (!line) { diagnostics.push({code:'invalidLine',invoiceId,lineIndex}); continue; }
        if (line.quantity === null) { diagnostics.push({code:'invalidQuantity',invoiceId,lineIndex}); continue; }
        const issue = !line.productId ? 'unlinkedProduct' : !line.color.trim() || !line.dimensions.trim() ? 'missingVariant' : '';
        if (issue) diagnostics.push({code:issue,invoiceId,lineIndex});
        const left = issue || !time ? line.quantity : consume(queues.get(line.key),delivery,line.quantity);
        add('unallocatedUnits',left);
      }
    }
  }
  function buildReport(state,options={}) {
    let book, history;
    try { book = readOrders(state?.settings); }
    catch (err) { if (err.code !== 'ORDER_HISTORY_INVALID') throw err; return unknownReport('invalidOrders'); }
    try { history = readLedger(state.settings); replay(book,history); }
    catch (err) {
      if (!['INVALID_FOLLOWUP','FOLLOWUP_CAPACITY'].includes(err.code)) throw err;
      return unknownReport(err.code === 'FOLLOWUP_CAPACITY' ? 'capacity' : 'invalidLedger');
    }
    const diagnostics = book.diagnostics, totals = makeTotals(0);
    const now = options.now === undefined ? new Date() : options.now;
    const timestamp = now instanceof Date && Number.isFinite(now.getTime()) ? now.toISOString() : now;
    const asOf = isoDay(timestamp) ? instant(timestamp+'T23:59:59.999999999Z') : instant(timestamp);
    const today = options.now === undefined ? statement.today() : statement.day(timestamp);
    if (!asOf || !today) fail('INVALID_DATE');
    for (const [orderId,full] of book.orders) {
      if (!full.row.events.some(event => instant(event.at) > asOf)) continue;
      const projected = initOrder(full.source,orderId);
      for (const event of full.row.events) {
        if (instant(event.at) > asOf) {
          diagnostics.push({code:event.type === 'receipt' ? 'futureReceipt' : 'futureEvent',orderId});
          continue;
        }
        try { apply(projected,event); }
        catch (err) {
          if (!err.code) throw err;
          projected.row.status = 'unknown'; projected.active.clear();
          for (const row of [projected.row,...projected.row.lines]) {
            for (const metric of ['receivedUnits','outstandingUnits','allocatedUnits','balanceUnits']) row[metric] = null;
          }
          diagnostics.push({code:'uncertainHistory',orderId}); break;
        }
      }
      projected.row.events = full.row.events; projected.row.revision = full.row.revision;
      projected.row.futureEvents = true; book.orders.set(orderId,projected);
    }
    const orders = Array.from(book.orders.values(),order => order.row);
    for (const row of orders) {
      row.overdue = Boolean(row.status !== 'cancelled' && row.outstandingUnits > 0 && row.expectedDate && row.expectedDate < today);
      row.lines.forEach((line,lineIndex) => {
        if (!line.color.trim() || !line.dimensions.trim()) diagnostics.push({code:'missingVariant',orderId:row.id,lineIndex});
      });
    }
    let overflow = false;
    function add(key,amount) {
      if (totals[key] === null || amount === null) { totals[key] = null; return; }
      if (Number.isSafeInteger(totals[key] + amount)) { totals[key] += amount; return; }
      totals[key] = null;
      if (!overflow) diagnostics.push({code:'quantityOverflow'});
      overflow = true;
    }
    if (Array.isArray(state.invoices)) allocate(book,state.invoices,diagnostics,add,asOf);
    else {
      diagnostics.push({code:'invoicesUnavailable'}); totals.unallocatedUnits = null;
      totals.allocatedUnits = totals.balanceUnits = null;
      for (const row of orders) {
        row.allocatedUnits = row.balanceUnits = null;
        for (const line of row.lines) line.allocatedUnits = line.balanceUnits = null;
      }
    }
    for (const row of orders) for (const key of metrics) if (key !== 'unallocatedUnits') add(key,row[key]);
    return {version:1,complete:diagnostics.every(d => d.code === 'duplicateInvoice'),diagnostics,totals,orders};
  }
  return Object.freeze({getLedger,mergeChange,persistChange,publishSnapshot,buildReport,limits});
});
