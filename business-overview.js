/* Read-only overview of committed records. USD is the app's accounting basis;
   native cash balances and invoice currencies are never added together. */
(function (root) {
  'use strict';
  const Core = typeof module === 'object' && module.exports ? require('./account-statement-core.js') : root.WOWStatementCore;
  if (!Core) return;
  const own = (object, key) => Object.prototype.hasOwnProperty.call(object || {}, key);
  const id = value => value == null ? '' : String(value);
  const currency = value => String(value || 'USD').toUpperCase() === 'TL' ? 'TRY' : String(value || 'USD').toUpperCase();
  const cents = Core.cents;
  const money = value => value / 100;
  const excluded = row => row?.deleted || row?.isDeleted || row?.cancelled || row?.canceled || row?.voided || ['draft', 'void', 'cancelled', 'canceled'].includes(String(row?.status || '').toLowerCase());
  const recordDay = (row, invoice = false) => {
    for (const value of invoice ? [row.regDate, row.orderDate, row.createdAt, row.date] : [row.date, row.paymentDate, row.createdAt]) {
      const day = Core.day(value); if (day) return day;
    }
    return null;
  };
  const text = {
    ar: { title: 'نظرة على أعمالك', asOf: 'حتى', refresh: 'تحديث النظرة', loading: 'جارٍ قراءة السجلات المحفوظة…', unavailable: 'تعذّر قراءة السجلات. أعد المحاولة.', review: 'تحتاج بعض السجلات إلى مراجعة؛ الأرقام غير المكتملة لا تُعرض كإجمالي مؤكد.', receivables: 'مستحق لنا على العملاء', customerCredits: 'أرصدة لصالح العملاء', sales: 'صافي المبيعات', collections: 'الدفعات المحصّلة', refunds: 'المبالغ المعادة', net: 'صافي حسابات العملاء', base: 'الحسابات على أساس USD المحفوظ', clients: 'العملاء', products: 'المنتجات', invoices: 'الفواتير', unpaid: 'فواتير برصيد متبقٍ', overdue: 'فواتير متأخرة الاستحقاق', pendingDelivery: 'بانتظار التسليم', delivered: 'مسلّمة', archived: 'مؤرشفة', today: 'حركة اليوم', dailySales: 'مبيعات اليوم', dailyCollections: 'دفعات اليوم', dailyRefunds: 'مبالغ معادة اليوم', currencies: 'الأرصدة حسب العملة', denomination: 'العملة', nativeSales: 'المبيعات بعملة الفاتورة', cash: 'الرصيد النقدي المسجّل', cashNote: 'النقد يشمل حركات الصندوق والدفعات النقدية المسجلة. التحويل بين الصناديق لا يُضاف إلى المبيعات أو التحصيل.', depositNote: 'دفعات اليوم تشمل السجلات ذات التاريخ المحدد؛ العربون بلا تاريخ مستقل لا يدخل في تحصيل اليوم.', basisNote: 'ذمم العملاء تتبع كشف الحساب، مع فصل أرصدتهم الدائنة. المبيعات بعملتها تستخدم سعر الفاتورة المحفوظ.', partial: 'بحاجة لمراجعة', report: 'تقرير الأعمال اليومي', reportDate: 'تاريخ التقرير', noData: 'لا توجد معاملات محفوظة حتى هذا التاريخ.', recordedCash: 'أرصدة الصناديق المسجلة', reportUnavailable: 'التقرير الصوتي غير متاح حتى مراجعة السجلات غير المكتملة.' },
    en: { title: 'Your business overview', asOf: 'Through', refresh: 'Refresh overview', loading: 'Reading saved records…', unavailable: 'Records could not be read. Please retry.', review: 'Some records need review; incomplete amounts are not presented as confirmed totals.', receivables: 'Due from clients', customerCredits: 'Credits owed to clients', sales: 'Net sales', collections: 'Payments received', refunds: 'Refunds paid', net: 'Net client balances', base: 'Accounts use the recorded USD basis', clients: 'Clients', products: 'Products', invoices: 'Invoices', unpaid: 'Invoices with a balance', overdue: 'Invoices past their due date', pendingDelivery: 'Awaiting delivery', delivered: 'Delivered', archived: 'Archived', today: 'Today’s activity', dailySales: 'Today’s sales', dailyCollections: 'Today’s payments', dailyRefunds: 'Today’s refunds', currencies: 'Balances by currency', denomination: 'Currency', nativeSales: 'Sales in invoice currency', cash: 'Recorded cash balance', cashNote: 'Cash includes recorded cashbox movements and cash receipts. Transfers between cashboxes are not sales or collections.', depositNote: 'Daily payments use explicit dates; deposits without a separate date are excluded from daily collections.', basisNote: 'Client balances follow the statement model, with client credits shown separately. Native sales use each invoice’s saved rate.', partial: 'Needs review', report: 'Daily business report', reportDate: 'Report date', noData: 'No transactions are saved through this date.', recordedCash: 'Recorded cashbox balances', reportUnavailable: 'The spoken report is unavailable until incomplete records are reviewed.' },
    tr: { title: 'İşletmenize genel bakış', asOf: 'Tarihine kadar', refresh: 'Özeti yenile', loading: 'Kayıtlar okunuyor…', unavailable: 'Kayıtlar okunamadı. Tekrar deneyin.', review: 'Bazı kayıtlar incelenmeli; eksik tutarlar kesin toplam olarak gösterilmez.', receivables: 'Müşterilerden alacaklar', customerCredits: 'Müşteri lehine bakiyeler', sales: 'Net satışlar', collections: 'Alınan ödemeler', refunds: 'İade edilen tutarlar', net: 'Net müşteri bakiyesi', base: 'Hesaplar kayıtlı USD esasındadır', clients: 'Müşteriler', products: 'Ürünler', invoices: 'Faturalar', unpaid: 'Bakiyesi olan faturalar', overdue: 'Vadesi geçen faturalar', pendingDelivery: 'Teslimat bekleyen', delivered: 'Teslim edilen', archived: 'Arşivlenen', today: 'Bugünün hareketleri', dailySales: 'Bugünkü satışlar', dailyCollections: 'Bugünkü ödemeler', dailyRefunds: 'Bugünkü iadeler', currencies: 'Para birimine göre bakiyeler', denomination: 'Para birimi', nativeSales: 'Fatura para biriminde satış', cash: 'Kayıtlı kasa bakiyesi', cashNote: 'Kasa, kayıtlı kasa hareketleri ve nakit tahsilatları içerir. Kasalar arası transferler satış veya tahsilat sayılmaz.', depositNote: 'Günlük ödemeler açık tarihlere dayanır; ayrı tarihi olmayan avanslar günlük tahsilata eklenmez.', basisNote: 'Müşteri bakiyeleri hesap ekstresini izler; müşteri alacakları ayrı gösterilir. Satışlarda faturanın kayıtlı kuru kullanılır.', partial: 'İnceleme gerekli', report: 'Günlük işletme raporu', reportDate: 'Rapor tarihi', noData: 'Bu tarihe kadar kayıtlı işlem yok.', recordedCash: 'Kayıtlı kasa bakiyeleri', reportUnavailable: 'Eksik kayıtlar incelenmeden sesli rapor kullanılamaz.' },
    fr: { title: 'Vue de votre activité', asOf: 'Au', refresh: 'Actualiser la synthèse', loading: 'Lecture des données enregistrées…', unavailable: 'Lecture impossible. Réessayez.', review: 'Certains enregistrements sont à vérifier ; les montants incomplets ne sont pas présentés comme des totaux confirmés.', receivables: 'Créances clients', customerCredits: 'Avoirs dus aux clients', sales: 'Ventes nettes', collections: 'Paiements reçus', refunds: 'Remboursements versés', net: 'Solde net des clients', base: 'Comptes sur la base USD enregistrée', clients: 'Clients', products: 'Produits', invoices: 'Factures', unpaid: 'Factures avec un solde', overdue: 'Factures échues', pendingDelivery: 'À livrer', delivered: 'Livrées', archived: 'Archivées', today: 'Activité du jour', dailySales: 'Ventes du jour', dailyCollections: 'Paiements du jour', dailyRefunds: 'Remboursements du jour', currencies: 'Soldes par devise', denomination: 'Devise', nativeSales: 'Ventes en devise de facture', cash: 'Solde de caisse enregistré', cashNote: 'La caisse comprend les mouvements et encaissements en espèces enregistrés. Les transferts entre caisses ne sont ni ventes ni encaissements clients.', depositNote: 'Les paiements du jour ont une date explicite ; les acomptes sans date distincte sont exclus des encaissements du jour.', basisNote: 'Les soldes suivent les relevés clients, avec les avoirs séparés. Les ventes en devise utilisent le taux enregistré sur chaque facture.', partial: 'À vérifier', report: 'Rapport quotidien d’activité', reportDate: 'Date du rapport', noData: 'Aucune opération enregistrée à cette date.', recordedCash: 'Soldes de caisse enregistrés', reportUnavailable: 'Le rapport vocal sera disponible après vérification des données incomplètes.' },
    ru: { title: 'Обзор вашего бизнеса', asOf: 'По состоянию на', refresh: 'Обновить обзор', loading: 'Чтение сохранённых записей…', unavailable: 'Не удалось прочитать данные. Повторите попытку.', review: 'Некоторые записи требуют проверки; неполные суммы не показаны как подтверждённые итоги.', receivables: 'Долги клиентов перед нами', customerCredits: 'Остатки в пользу клиентов', sales: 'Чистые продажи', collections: 'Полученные платежи', refunds: 'Возвраты клиентам', net: 'Чистый баланс клиентов', base: 'Учёт ведётся по сохранённым суммам USD', clients: 'Клиенты', products: 'Товары', invoices: 'Счета', unpaid: 'Счета с остатком', overdue: 'Просроченные счета', pendingDelivery: 'Ожидают доставки', delivered: 'Доставлены', archived: 'В архиве', today: 'Операции за день', dailySales: 'Продажи за день', dailyCollections: 'Платежи за день', dailyRefunds: 'Возвраты за день', currencies: 'Остатки по валютам', denomination: 'Валюта', nativeSales: 'Продажи в валюте счёта', cash: 'Учтённый остаток кассы', cashNote: 'Касса включает сохранённые движения и наличные платежи. Переводы между кассами не являются продажами или оплатой клиентов.', depositNote: 'В платежах за день учитываются явные даты; авансы без отдельной даты исключаются из дневных поступлений.', basisNote: 'Баланс соответствует выпискам клиентов; остатки в пользу клиентов показаны отдельно. Продажи в валюте используют курс, сохранённый в счёте.', partial: 'Нужна проверка', report: 'Ежедневный отчёт о бизнесе', reportDate: 'Дата отчёта', noData: 'На эту дату операций не сохранено.', recordedCash: 'Учтённые остатки касс', reportUnavailable: 'Голосовой отчёт недоступен до проверки неполных записей.' }
  };
  function build(state, options = {}) {
    if (!state || !['companies', 'products', 'invoices', 'payments'].every(key => Array.isArray(state[key]))) throw new Error('DATA_UNAVAILABLE');
    const date = Core.day(options.date || Core.today());
    if (!date) throw new Error('INVALID_DATE');
    const warnings = [];
    const warn = (code, ref = '') => warnings.push({ code, ref: id(ref) });
    const accounts = new Map();
    for (const client of state.companies) if (client && id(client.id) && !accounts.has(id(client.id))) accounts.set(id(client.id), { ...client });
    const invoices = [], seenInvoices = new Set(), invoiceCurrencyIssues = new Set();
    for (const [index, raw] of state.invoices.entries()) {
      if (!raw || typeof raw !== 'object') { warn('invalidInvoice'); continue; }
      const key = id(raw.id) || '__wf_undocumented_' + index;
      if (seenInvoices.has(key)) { warn('duplicateInvoice', key); invoiceCurrencyIssues.add(currency(raw.currency)); continue; }
      seenInvoices.add(key);
      const companyId = id(raw.companyId) || '__wf_unassigned_' + key;
      if (!accounts.has(companyId)) {
        accounts.set(companyId, { id: companyId });
        if (!excluded(raw)) warn('missingClient', key);
      }
      invoices.push({ ...raw, id: key, companyId });
    }
    const collected = Core.collectPayments(invoices, state.payments, warn);
    const payments = [...collected.groups.values()].flat().concat(collected.unattached).map(record => record.raw);
    const invoiceById = new Map(invoices.map(invoice => [id(invoice.id), invoice]));
    for (const payment of payments) {
      const invoiceId = id(payment.invoiceId), companyId = id(payment.companyId ?? payment.customerId);
      if (invoiceId && (!invoiceById.has(invoiceId) || excluded(invoiceById.get(invoiceId)))) warn('unassignedPayment', payment.id);
      if (!invoiceId && companyId && !accounts.has(companyId)) { accounts.set(companyId, { id: companyId }); warn('missingClient', payment.id); }
      if (!invoiceId && !companyId) warn('unassignedPayment', payment.id);
    }
    const modelState = { ...state, companies: [...accounts.values()], invoices: invoices.map(invoice => ({ ...invoice, payments: [] })), payments };
    const units = { receivables: 0, customerCredits: 0, sales: 0, collections: 0, refunds: 0, net: 0 };
    const dailyUnits = { sales: 0, collections: 0, refunds: 0 };
    const counts = { clients: new Set(state.companies.filter(Boolean).map(client => id(client.id))).size, products: new Set(state.products.filter(Boolean).map(product => id(product.id))).size, invoices: 0, unpaid: 0, overdue: 0, pendingDelivery: 0, delivered: 0, archived: 0 };
    const daily = { invoiceCount: 0, paymentCount: 0, excludedUndatedDeposits: 0 };
    let complete = !warnings.length;
    for (const account of accounts.values()) {
      const model = Core.build(modelState, account.id, { to: date });
      if (model.incomplete || model.estimated) complete = false;
      warnings.push(...model.warnings);
      units.receivables += cents(model.totals.due) || 0;
      units.customerCredits += cents(model.totals.credit) || 0;
      units.net += cents(model.totals.closing) || 0;
      units.sales += (cents(model.totals.invoiced) || 0) - (cents(model.totals.creditNotes) || 0);
      units.collections += cents(model.totals.received) || 0;
      units.refunds += cents(model.totals.refunded) || 0;
      for (const invoice of model.invoices) {
        if (!invoice.issued) continue;
        counts.invoices++;
        if (invoice.balance > 0) counts.unpaid++;
        if (invoice.overdueDays > 0) counts.overdue++;
        if (invoice.delivered) counts.delivered++;
        else if (!invoice.archived && invoice.grandTotal >= 0) counts.pendingDelivery++;
        if (invoice.archived) counts.archived++;
      }
      for (const entry of model.entries) if (entry.date === date && ['invoice', 'creditNote'].includes(entry.kind)) {
        dailyUnits.sales += entry.debitCents - entry.creditCents;
        daily.invoiceCount++;
      }
      for (const payment of model.payments) {
        if (payment.dateAssumed) { daily.excludedUndatedDeposits++; continue; }
        if (payment.date !== date || payment.cents == null) continue;
        if (payment.cents >= 0) dailyUnits.collections += payment.cents;
        else dailyUnits.refunds -= payment.cents;
        daily.paymentCount++;
      }
    }
    const issued = invoices.filter(invoice => !excluded(invoice) && (!recordDay(invoice, true) || recordDay(invoice, true) <= date));
    for (const invoice of issued) if (!recordDay(invoice, true)) invoiceCurrencyIssues.add(currency(invoice.currency));
    if (![...Object.values(units), ...Object.values(dailyUnits)].every(Number.isSafeInteger)) { complete = false; warn('unsafeTotal'); }
    const sales = Core.salesByCurrency(issued);
    const cashMap = new Map(['USD', 'TRY', 'EUR', 'SYP'].map(code => [code, { currency: code, units: 0, receipts: 0, expenses: 0, transfers: 0, opening: 0, dailyUnits: 0, entries: 0, complete: true }]));
    const cashRow = code => {
      if (!cashMap.has(code)) cashMap.set(code, { currency: code, units: 0, receipts: 0, expenses: 0, transfers: 0, opening: 0, dailyUnits: 0, entries: 0, complete: true });
      return cashMap.get(code);
    };
    const addCash = (code, amount, kind, day, ref) => {
      const row = cashRow(code);
      if (!day) { row.complete = false; warn('undatedCash', ref); }
      if (day && day > date) return;
      if (!Number.isSafeInteger(amount)) { row.complete = false; warn('invalidCash', ref); return; }
      row.units += amount; row.entries++;
      if (!Number.isSafeInteger(row.units)) { row.complete = false; warn('unsafeCashTotal', ref); }
      if (kind === 'transfer') row.transfers += amount;
      else if (kind === 'opening') row.opening += amount;
      else if (amount >= 0) row.receipts += amount;
      else row.expenses -= amount;
      if (day === date) row.dailyUnits += amount;
    };
    const seenCash = new Set();
    for (const entry of state.cashEntries || []) {
      if (!entry || !id(entry.id).startsWith('cashbox-entry/') || entry.deleted || entry.isDeleted) continue;
      if (seenCash.has(id(entry.id))) { warn('duplicateCash', entry.id); continue; }
      seenCash.add(id(entry.id));
      for (const leg of entry.legs || []) addCash(currency(leg.currency), leg.units, entry.type, recordDay(entry), entry.id);
    }
    // Use the same globally deduplicated real receipts as cashboxes.mjs. An invoice
    // total or its synthetic deposit is never added to the cash balance again.
    for (const payment of payments) {
      if (payment.receiptType !== 'cash') continue;
      const original = payment.originalAmount != null && !!payment.originalCurrency;
      const code = original ? currency(payment.originalCurrency) : payment.amountBasis === 'USD' ? 'USD' : payment.currency ? currency(payment.currency) : null;
      if (!code) { warn('unknownCashCurrency', payment.id); complete = false; continue; }
      addCash(code, cents(original ? payment.originalAmount : payment.amount), 'payment', recordDay(payment), payment.id);
    }
    for (const code of sales.keys()) cashRow(code);
    const cashboxes = [...cashMap.values()].map(row => {
      const native = sales.get(row.currency) || { units: 0, missing: 0 };
      return { currency: row.currency, balance: money(row.units), receipts: money(row.receipts), expenses: money(row.expenses), transferNet: money(row.transfers), opening: money(row.opening), dailyChange: money(row.dailyUnits), entries: row.entries, complete: row.complete, sales: money(native.units), salesComplete: !native.missing && !invoiceCurrencyIssues.has(row.currency) && Number.isSafeInteger(native.units), missingSalesRates: native.missing };
    });
    const safe = complete && cashboxes.every(row => row.complete && row.salesComplete) && !warnings.some(warning => ['duplicateCash', 'invalidCash', 'undatedCash', 'unknownCashCurrency'].includes(warning.code));
    return {
      date, baseCurrency: 'USD', complete, reportComplete: safe,
      balances: { receivables: money(units.receivables), customerCredits: money(units.customerCredits), net: money(units.net) },
      totals: { salesUSD: money(units.sales), collectionsUSD: money(units.collections), refundsUSD: money(units.refunds) },
      daily: { ...daily, salesUSD: money(dailyUnits.sales), collectionsUSD: money(dailyUnits.collections), refundsUSD: money(dailyUnits.refunds) },
      counts, cashboxes, warnings, capabilities: { supplierPayables: false, cashBasis: 'recorded-cashbox-entries-and-cash-receipts' }
    };
  }
  function localize(snapshot, locale = 'en') {
    const lang = own(text, locale) ? locale : 'en', L = text[lang];
    const amount = (value, code = 'USD') => new Intl.NumberFormat(lang, { style: 'currency', currencyDisplay: 'name', currency: /^[A-Z]{3}$/.test(code) ? code : 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
    const count = value => new Intl.NumberFormat(lang).format(value);
    const reportDate = new Intl.DateTimeFormat(lang, { dateStyle: 'long', timeZone: 'UTC' }).format(new Date(snapshot.date + 'T12:00:00Z'));
    const result = { ...snapshot, locale: lang, narration: '', narrationSegments: [] };
    if (!snapshot.reportComplete) { result.unavailableReason = L.reportUnavailable; return result; }
    const sentences = [L.report + '. ' + L.reportDate + ': ' + reportDate + '.',
      L.dailySales + ': ' + amount(snapshot.daily.salesUSD) + '.',
      L.dailyCollections + ': ' + amount(snapshot.daily.collectionsUSD) + '.',
      L.dailyRefunds + ': ' + amount(snapshot.daily.refundsUSD) + '.',
      L.receivables + ': ' + amount(snapshot.balances.receivables) + '.',
      L.customerCredits + ': ' + amount(snapshot.balances.customerCredits) + '.',
      L.unpaid + ': ' + count(snapshot.counts.unpaid) + '. ' + L.overdue + ': ' + count(snapshot.counts.overdue) + '.',
      L.pendingDelivery + ': ' + count(snapshot.counts.pendingDelivery) + '.',
      L.clients + ': ' + count(snapshot.counts.clients) + '. ' + L.products + ': ' + count(snapshot.counts.products) + '.',
      L.recordedCash + ': ' + snapshot.cashboxes.map(row => amount(row.balance, row.currency)).join('، ') + '.', L.base + '.'];
    if (snapshot.daily.excludedUndatedDeposits) sentences.push(L.depositNote);
    if (!snapshot.counts.invoices && !snapshot.daily.paymentCount && !snapshot.cashboxes.some(row => row.entries)) sentences.push(L.noData);
    result.narration = sentences.join(' ');
    let offset = 0;
    result.narrationSegments = sentences.map(sentence => {
      const segment = { text: sentence, start: offset, end: offset + sentence.length };
      offset = segment.end + 1;
      return segment;
    });
    return result;
  }
  function createDisclosurePreferences(storage) {
    const values = new Map();
    const key = host => 'wf-business-details:' + host;
    return {
      get(host) {
        if (!values.has(host)) {
          let expanded = false;
          try { expanded = storage?.getItem(key(host)) === 'open'; } catch (_) {}
          values.set(host, expanded);
        }
        return values.get(host);
      },
      set(host, expanded) {
        const value = expanded === true;
        values.set(host, value);
        try { storage?.setItem(key(host), value ? 'open' : 'closed'); } catch (_) {}
        return value;
      }
    };
  }
  const api = { build, localize, createDisclosurePreferences };
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (typeof document === 'undefined') return;

  async function readCommitted() {
    if (root.WF_RESTORE_WRITE_LOCK) throw new Error('RESTORE_IN_PROGRESS');
    if (typeof initDB !== 'function') throw new Error('DATA_UNAVAILABLE');
    const connection = await initDB();
    return new Promise((resolve, reject) => {
      const stores = ['companies', 'products', 'invoices', 'payments', 'settings'];
      let transaction;
      const data = {};
      try {
        transaction = connection.transaction(stores, 'readonly');
        for (const store of stores) {
          const request = transaction.objectStore(store).getAll();
          request.onsuccess = () => { data[store] = request.result || []; };
        }
        transaction.oncomplete = () => {
          if (root.WF_RESTORE_WRITE_LOCK) { reject(new Error('RESTORE_IN_PROGRESS')); return; }
          const settings = data.settings.find(row => row.id === 'main') || {};
          resolve({ ...data, settings, cashEntries: data.settings.filter(row => id(row.id).startsWith('cashbox-entry/')) });
        };
        transaction.onerror = () => reject(transaction.error || new Error('READ_FAILED'));
        transaction.onabort = () => reject(transaction.error || new Error('READ_ABORTED'));
      } catch (error) { reject(error); }
    });
  }
  root.WFBusinessOverview = { build, localize, readCommitted };
  root.wfBusinessOverviewSnapshot = async function ({ locale = document.documentElement.lang || 'en', date = Core.today() } = {}) {
    try { return localize(build(await readCommitted(), { date }), locale); }
    catch (_) { return { date, locale, narration: '', narrationSegments: [], unavailableReason: (text[locale] || text.en).unavailable }; }
  };
  const node = (tag, className, content) => {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (content != null) element.textContent = content;
    return element;
  };
  let revision = 0, queued = false;
  const hosts = new Set();
  let preferenceStorage;
  try { preferenceStorage = root.localStorage; } catch (_) {}
  const disclosure = createDisclosurePreferences(preferenceStorage);
  const detailLabels = {
    ar: ['عرض تفاصيل الأعمال', 'إخفاء تفاصيل الأعمال'],
    en: ['Show business details', 'Hide business details'],
    tr: ['İşletme ayrıntılarını göster', 'İşletme ayrıntılarını gizle'],
    fr: ['Afficher les détails de l’activité', 'Masquer les détails de l’activité'],
    ru: ['Показать подробности бизнеса', 'Скрыть подробности бизнеса']
  };
  const symbols = {
    receivables: ['sales', '<path d="M3 7h18v13H3zM7 7V4h10v3M8 12h8m-4-3v6m-3-3 3 3 3-3"/>'],
    customerCredits: ['credit', '<path d="M3 7h18v13H3zM7 7V4h10v3M8 12h8m-4 3V9m-3 3 3-3 3 3"/>'],
    sales: ['sales', '<path d="M4 18V6m0 12h16M8 14l4-4 3 2 5-7M16 5h4v4"/>'],
    collections: ['sales', '<rect x="3" y="5" width="18" height="15" rx="3"/><path d="M16 10h5v5h-5zM7 5V3h10"/>'],
    refunds: ['credit', '<path d="M9 7 5 11l4 4M5 11h10a5 5 0 0 1 0 10M6 3h12"/>'],
    net: ['calendar', '<path d="M12 3v18M5 7h14M4 7l-3 7h6l-3-7m16 0-3 7h6l-3-7M8 21h8"/>'],
    clients: ['calendar', '<circle cx="9" cy="8" r="3"/><path d="M3 21v-2a6 6 0 0 1 12 0v2M16 5a3 3 0 0 1 0 6m2 4a5 5 0 0 1 3 5"/>'],
    products: ['invoice', '<path d="m12 3 9 5v9l-9 5-9-5V8l9-5ZM3 8l9 5 9-5m-9 5v9M7 5l9 5"/>'],
    invoices: ['invoice', '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Z"/><path d="M9 7h6M9 11h6M9 15h3"/>'],
    unpaid: ['invoice', '<rect x="3" y="4" width="18" height="16" rx="3"/><path d="M3 9h18M7 14h4m5-2v5"/>'],
    overdue: ['credit', '<circle cx="12" cy="12" r="9"/><path d="M12 7v6l4 2"/>'],
    pendingDelivery: ['invoice', '<path d="M3 6h11v12H3zM14 10h4l3 4v4h-7"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/>'],
    delivered: ['sales', '<path d="m12 3 9 5v9l-9 5-9-5V8l9-5ZM3 8l9 5 9-5m-9 5v9m-5-6 3 3 5-5"/>'],
    archived: ['neutral', '<rect x="3" y="3" width="18" height="5" rx="1"/><path d="M5 8v13h14V8M9 12h6"/>']
  };
  function metricIcon(key) {
    const [tone, path] = symbols[key] || symbols.invoices;
    const icon = node('span', 'wf-business-icon wf-business-tone-' + tone);
    icon.setAttribute('aria-hidden', 'true');
    icon.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">' + path + '</svg>';
    return icon;
  }
  function alignExpandedCard(panel) {
    root.requestAnimationFrame(() => {
      if (!panel.isConnected || panel.dataset.expanded !== 'true') return;
      const page = panel.closest('.page');
      const headers = [document.querySelector('.navbar'), page?.querySelector(':scope > .sct-sticky-header')].filter(Boolean);
      const bottom = Math.max(0, ...headers.map(header => {
        const style = root.getComputedStyle(header), rect = header.getBoundingClientRect();
        return ['fixed', 'sticky'].includes(style.position) && style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity) > 0 && rect.height && rect.bottom > 0 && rect.top < root.innerHeight ? rect.bottom : 0;
      }));
      const gap = bottom + 12;
      panel.style.scrollMarginBlockStart = gap + 'px';
      const reduced = document.documentElement.dataset.wfMotion === 'reduced' || root.matchMedia('(prefers-reduced-motion: reduce)').matches;
      root.scrollTo({ top: Math.max(0, root.scrollY + panel.getBoundingClientRect().top - gap), behavior: reduced ? 'auto' : 'smooth' });
    });
  }
  function syncSalesHeadline(snapshot) {
    const total = document.getElementById('s-total');
    if (!total) return;
    const locale = snapshot.locale || document.documentElement.lang || 'en';
    const L = text[locale] || text.en;
    const value = snapshot.complete && snapshot.totals
      ? new Intl.NumberFormat(locale, { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(snapshot.totals.salesUSD)
      : '—';
    if (total.textContent !== value) total.textContent = value;
    total.title = snapshot.complete ? L.sales + ' · ' + L.base : snapshot.unavailableReason || L.review;
    total.setAttribute('aria-label', L.sales + ': ' + value);
    // cashboxes.mjs observes the headline and paints its native-currency list.
    // Apply the same committed as-of snapshot after that existing observer runs.
    queueMicrotask(() => {
      const list = total.closest('.wf-dash-sales')?.querySelector('.sales-currencies');
      if (!list || !snapshot.cashboxes) return;
      list.setAttribute('aria-label', L.nativeSales);
      const format = new Intl.NumberFormat(locale, { maximumFractionDigits: 2 });
      for (const cell of list.children) {
        const code = cell.querySelector('dt')?.textContent?.trim();
        const amount = cell.querySelector('dd');
        if (!amount || !code) continue;
        const row = snapshot.cashboxes.find(item => item.currency === code);
        amount.replaceChildren(document.createTextNode(row && !row.salesComplete ? '—' : format.format(row?.sales || 0)));
        if (row && !row.salesComplete) amount.append(node('small', '', L.partial));
      }
    });
  }
  function panelFor(host) {
    if (!host) return null;
    let panel = host.querySelector(':scope > .wf-business-overview');
    if (!panel) {
      panel = node('section', 'wf-insight-card wf-business-overview');
      const original = host.querySelector(':scope > .wf-insight-card');
      if (original && !original.querySelector('.wf-catalog-total')) original.replaceWith(panel);
      else host.prepend(panel);
    }
    return panel;
  }
  function render(host, snapshot) {
    const panel = panelFor(host); if (!panel) return;
    const lang = snapshot.locale || document.documentElement.lang || 'en', L = text[lang] || text.en;
    const focusedAction = panel.contains(document.activeElement) ? document.activeElement?.dataset.businessAction : null;
    const hostKey = host.id || 'business-overview';
    let expanded = disclosure.get(hostKey);
    const heading = node('div', 'wf-business-heading');
    const title = node('h3', '', L.title);
    const refresh = node('button', 'wf-business-refresh', '↻');
    refresh.dataset.businessAction = 'refresh';
    refresh.type = 'button'; refresh.title = L.refresh; refresh.setAttribute('aria-label', L.refresh); refresh.addEventListener('click', schedule);
    const details = node('div', 'wf-business-details');
    details.id = 'wf-business-details-' + hostKey.replace(/[^a-zA-Z0-9_-]/g, '-');
    const toggle = node('button', 'wf-business-toggle');
    toggle.type = 'button'; toggle.dataset.businessAction = 'toggle'; toggle.setAttribute('aria-controls', details.id);
    toggle.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>';
    const updateDisclosure = () => {
      const caption = (detailLabels[lang] || detailLabels.en)[expanded ? 1 : 0];
      details.hidden = !expanded; panel.dataset.expanded = String(expanded);
      toggle.setAttribute('aria-expanded', String(expanded)); toggle.setAttribute('aria-label', caption); toggle.title = caption;
    };
    toggle.addEventListener('click', () => { expanded = disclosure.set(hostKey, !expanded); updateDisclosure(); if (expanded) alignExpandedCard(panel); });
    updateDisclosure();
    const actions = node('div', 'wf-business-actions'); actions.append(refresh, toggle);
    heading.append(title, actions);
    panel.replaceChildren(heading);
    if (!snapshot.balances) { toggle.disabled = true; panel.append(node('p', 'wf-business-note', snapshot.unavailableReason || L.loading), details); return; }
    const format = (value, code = 'USD') => new Intl.NumberFormat(lang, { style: 'currency', currency: /^[A-Z]{3}$/.test(code) ? code : 'USD', maximumFractionDigits: 2 }).format(value);
    const count = value => new Intl.NumberFormat(lang).format(value);
    panel.append(node('p', 'wf-business-basis', L.asOf + ' ' + snapshot.date + ' · ' + L.base));
    if (!snapshot.complete) panel.append(node('p', 'wf-business-review', L.review));
    const metrics = node('dl', 'wf-business-metrics wf-business-primary-metrics');
    const extraMetrics = node('dl', 'wf-business-metrics');
    const metric = (target, key, value, emphasis = false) => {
      const cell = node('div', emphasis ? 'wf-business-metric wf-business-emphasis' : 'wf-business-metric');
      const label = node('dt'); label.append(metricIcon(key), node('span', '', L[key]));
      cell.append(label, node('dd', '', snapshot.complete ? format(value) : '—'));
      target.append(cell);
    };
    metric(metrics, 'receivables', snapshot.balances.receivables, true);
    metric(metrics, 'customerCredits', snapshot.balances.customerCredits);
    metric(metrics, 'sales', snapshot.totals.salesUSD);
    metric(extraMetrics, 'collections', snapshot.totals.collectionsUSD);
    metric(extraMetrics, 'refunds', snapshot.totals.refundsUSD);
    metric(extraMetrics, 'net', snapshot.balances.net);
    panel.append(metrics);
    details.append(extraMetrics);
    const daily = node('div', 'wf-business-daily');
    daily.append(node('h4', '', L.today));
    for (const [key, value] of [['dailySales', snapshot.daily.salesUSD], ['dailyCollections', snapshot.daily.collectionsUSD], ['dailyRefunds', snapshot.daily.refundsUSD]]) {
      const row = node('div'); row.append(node('span', '', L[key]), node('bdi', '', snapshot.complete ? format(value) : '—')); daily.append(row);
    }
    if (snapshot.daily.excludedUndatedDeposits) daily.append(node('small', '', L.depositNote));
    details.append(daily);
    const quantities = node('dl', 'wf-business-counts');
    for (const key of ['clients', 'products', 'invoices', 'unpaid', 'overdue', 'pendingDelivery', 'delivered', 'archived']) {
      const value = !snapshot.complete && ['unpaid', 'overdue'].includes(key) ? '—' : count(snapshot.counts[key]);
      const item = node('div'), label = node('dt'); label.append(metricIcon(key), node('span', '', L[key])); item.append(label, node('dd', '', value)); quantities.append(item);
    }
    details.append(quantities);
    const tableWrap = node('div', 'wf-business-currencies');
    const table = node('table'); table.append(node('caption', '', L.currencies));
    const head = node('thead'), headRow = node('tr');
    for (const key of ['denomination', 'nativeSales', 'cash']) { const th = node('th', '', L[key]); th.scope = 'col'; headRow.append(th); }
    head.append(headRow); table.append(head);
    const body = node('tbody');
    for (const row of snapshot.cashboxes) {
      const tr = node('tr'); const th = node('th', '', row.currency); th.scope = 'row'; tr.append(th);
      for (const [value, valid] of [[row.sales, row.salesComplete], [row.balance, row.complete]]) {
        const cell = node('td'); cell.append(node('bdi', '', valid ? format(value, row.currency) : '—'));
        if (!valid) cell.title = L.partial;
        tr.append(cell);
      }
      body.append(tr);
    }
    table.append(body); tableWrap.append(table); details.append(tableWrap);
    const notes = node('details', 'wf-business-definitions');
    notes.append(node('summary', '', L.base), node('p', '', L.basisNote), node('p', '', L.cashNote));
    details.append(notes); panel.append(details);
    if (focusedAction) actions.querySelector('[data-business-action="' + focusedAction + '"]')?.focus({ preventScroll: true });
  }
  async function refresh() {
    const current = ++revision;
    const snapshot = await root.wfBusinessOverviewSnapshot();
    if (current !== revision) return;
    syncSalesHeadline(snapshot);
    for (const host of hosts) if (host.isConnected) render(host, snapshot);
  }
  function schedule() {
    if (queued) return;
    queued = true;
    queueMicrotask(() => { queued = false; refresh(); });
  }
  const original = root.wfRenderDashboardIntelligence;
  if (typeof original === 'function') root.wfRenderDashboardIntelligence = function (total, host = document.getElementById('dashIntelligence')) {
    const result = original.apply(this, arguments);
    if (host) { hosts.add(host); render(host, {}); schedule(); }
    return result;
  };
  for (const key of ['dashIntelligence', 'wfReportsOverview']) {
    const host = document.getElementById(key);
    if (host) hosts.add(host);
  }
  for (const key of ['page-dashboard', 'page-reports']) {
    const page = document.getElementById(key);
    if (page) new MutationObserver(() => { if (page.classList.contains('active')) schedule(); }).observe(page, { attributes: true, attributeFilter: ['class'] });
  }
  new MutationObserver(schedule).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) schedule(); });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', schedule, { once: true });
  else schedule();
})(typeof globalThis !== 'undefined' ? globalThis : this);
