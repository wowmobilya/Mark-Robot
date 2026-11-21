/* Workshop tickets keep the invoice as captured. Only line progress can change. */
(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.WFManufacturingCore = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const statuses = Object.freeze(['pending','in_progress','completed']);
  const own = (object,key) => Object.prototype.hasOwnProperty.call(object || {},key);
  const text = value => typeof value === 'string' || typeof value === 'number' ? String(value) : '';

  function isTicket(ticket) {
    return ticket?.version === 1 && typeof ticket.id === 'string' && Array.isArray(ticket.lines) &&
      ticket.lines.length > 0 && new Set(ticket.lines.map(line => line?.id)).size === ticket.lines.length && ticket.lines.every(line => line && typeof line.id === 'string' && line.item &&
      Array.isArray(line.item.dimPieces) && line.item.dimPieces.every(piece => piece && typeof piece === 'object') &&
      statuses.includes(line.status) && typeof line.note === 'string' && Array.isArray(line.history) &&
      line.history.every(change => change && statuses.includes(change.status) && typeof change.note === 'string'));
  }

  function savedValue(line, keys) {
    for (const source of [line,line?.productSnapshot]) {
      for (const key of keys) if (own(source,key)) return source[key];
    }
    return null;
  }

  function snapshot(line, index, at) {
    const raw = line?.qty ?? line?.quantity;
    const qty = typeof raw === 'number' || (typeof raw === 'string' && raw.trim()) ? Number(raw) : NaN;
    if (!Number.isSafeInteger(qty) || qty <= 0) throw Error('INVALID_QUANTITY');
    const pieces = savedValue(line,['dimPieces','dims']);
    const item = {
      productId:line.productId ?? line.itemId ?? null, name:text(savedValue(line,['name'])),
      type:text(savedValue(line,['type'])), color:text(savedValue(line,['color'])),
      image:savedValue(line,['image','imageUrl']), qty, packets:savedValue(line,['packets','packetCount']),
      dimensions:text(savedValue(line,['dimensions'])),
      dimPieces:Array.isArray(pieces) ? JSON.parse(JSON.stringify(pieces.filter(piece => piece && typeof piece === 'object'))) : []
    };
    return {id:'line-'+(index+1), item, status:'pending', note:'', updatedAt:at, history:[]};
  }

  function create(invoice, intent) {
    if (invoice.manufacturingTicket != null) {
      if (!isTicket(invoice.manufacturingTicket)) throw Error('UNSUPPORTED_TICKET');
      return invoice;
    }
    if (!Array.isArray(invoice.items) || !invoice.items.length) throw Error('EMPTY_INVOICE');
    if (typeof intent.ticketId !== 'string' || !intent.ticketId) throw Error('MISSING_TICKET');
    const ticket = {
      version:1, id:intent.ticketId, invoiceId:invoice.id, invoiceNo:text(invoice.invNo), customerName:text(invoice.companyName),
      createdAt:intent.at, updatedAt:intent.at, archivedAtCapture:!!invoice.archived,
      lines:invoice.items.map((line,index) => snapshot(line,index,intent.at))
    };
    return {...invoice, manufacturingTicket:ticket};
  }

  function update(invoice, intent) {
    const ticket = invoice.manufacturingTicket;
    if (!ticket || ticket.id !== intent.ticketId) throw Error('MISSING_TICKET');
    if (!isTicket(ticket)) throw Error('UNSUPPORTED_TICKET');
    const index = ticket.lines.findIndex(line => line.id === intent.lineId);
    if (index < 0) throw Error('MISSING_LINE');
    const line = ticket.lines[index], patch = intent.changes || {}, base = intent.base || {};
    const fields = Object.keys(patch);
    if (!fields.length || fields.some(key => key !== 'status' && key !== 'note') ||
        (own(patch,'status') && !statuses.includes(patch.status)) ||
        (own(patch,'note') && typeof patch.note !== 'string')) throw Error('INVALID_CHANGE');
    const changed = fields.filter(key => patch[key] !== line[key]);
    if (!changed.length) return invoice;
    if (changed.some(key => !own(base,key) || base[key] !== line[key])) throw Error('CONFLICT');
    const next = {...line, ...patch, updatedAt:intent.at};
    next.history = [...line.history,{at:intent.at,status:next.status,note:next.note}];
    const lines = ticket.lines.slice();
    lines[index] = next;
    return {...invoice, manufacturingTicket:{...ticket,lines,updatedAt:intent.at}};
  }

  function merge(invoice, intent) {
    if (!invoice || invoice.id == null || invoice.id !== intent.id) throw Error('MISSING_INVOICE');
    if (typeof intent.at !== 'string' || !Number.isFinite(Date.parse(intent.at))) throw Error('INVALID_DATE');
    if (intent.kind === 'create') return create(invoice,intent);
    if (intent.kind === 'update') return update(invoice,intent);
    throw Error('INVALID_CHANGE');
  }

  function preserveTicket(latest, prepared) {
    if (!latest || latest.id !== prepared.id) throw Error('MISSING_INVOICE');
    const result = {...prepared};
    if (own(latest,'manufacturingTicket')) result.manufacturingTicket = latest.manufacturingTicket;
    else delete result.manufacturingTicket;
    return result;
  }

  async function commit(intent, {state, writeBatch, hydrate, read}) {
    const visible = () => state.invoices.find(invoice => invoice?.id === intent.id);
    let prior = visible();
    const [stored] = await writeBatch([{store:'invoices',type:'merge',id:intent.id,value:intent,merge}]);
    let saved = await hydrate(stored);
    // Another operation in this tab can commit while fresh media is loading.
    // Respect its committed payment/edit/deletion before publishing a hydrated invoice.
    while (read && prior !== visible()) {
      prior = visible();
      saved = await read('invoices',intent.id);
    }
    const index = state.invoices.findIndex(invoice => invoice?.id === intent.id);
    if (!saved) {
      if (index >= 0) state.invoices.splice(index,1);
      throw Error('MISSING_INVOICE');
    }
    if (index < 0) state.invoices.push(saved);
    else state.invoices[index] = saved;
    return saved;
  }

  function progress(ticket) {
    if (ticket == null) return {status:'unopened',completed:0,total:0};
    if (!isTicket(ticket)) return {status:'unsupported',completed:0,total:0};
    const total = ticket.lines.length, completed = ticket.lines.filter(line => line.status === 'completed').length;
    const status = completed === total ? 'completed' : ticket.lines.some(line => line.status !== 'pending') ? 'in_progress' : 'pending';
    return {status,completed,total};
  }

  function normalized(value) {
    return text(value).normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().trim()
      .replace(/[٠-٩]/g,digit => String(digit.charCodeAt(0)-1632))
      .replace(/[۰-۹]/g,digit => String(digit.charCodeAt(0)-1776));
  }

  function matches(invoice, {status = 'all', search = ''} = {}) {
    if (!invoice || invoice.id == null) return false;
    const ticket = invoice.manufacturingTicket;
    if (status !== 'all' && progress(ticket).status !== status) return false;
    const query = normalized(search);
    if (!query) return true;
    const contains = value => normalized(value).includes(query);
    if (isTicket(ticket)) return [ticket.invoiceNo,ticket.customerName].some(contains) ||
      ticket.lines.some(({item,note}) => [item.name,item.color,note].some(contains));
    return [invoice.invNo,invoice.companyName].some(contains) ||
      (Array.isArray(invoice.items) && invoice.items.some(line => contains(savedValue(line,['name'])) || contains(savedValue(line,['color']))));
  }
  return Object.freeze({statuses,isTicket,preserveTicket,merge,commit,progress,matches});
});
