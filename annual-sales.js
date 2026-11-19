/* Calendar-year sales, read from one committed snapshot without changing data. */
(function (root) {
  'use strict';
  const Core = typeof module === 'object' && module.exports ? require('./account-statement-core.js') : root.WOWStatementCore;
  if (!Core) return;
  const monthNames = {
    ar: ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'],
    en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
    tr: ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'],
    fr: ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'],
    ru: ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь']
  };
  const excluded = row => row?.deleted || row?.isDeleted || row?.cancelled || row?.canceled || row?.voided || ['draft', 'void', 'cancelled', 'canceled'].includes(String(row?.status || '').toLowerCase());
  function recordDay(row) {
    for (const value of [row?.regDate, row?.orderDate, row?.createdAt, row?.date]) { const date = Core.day(value); if (date) return date; }
    return null;
  }
  function labels(locale = 'en') { return [...(monthNames[locale] || monthNames.en)]; }
  function years(state, date = Core.today()) {
    const day = Core.day(date); if (!day) throw new Error('INVALID_DATE');
    const result = new Set([Number(day.slice(0, 4))]);
    for (const invoice of state?.invoices || []) { if (!invoice || excluded(invoice)) continue; const value = recordDay(invoice); if (value) result.add(Number(value.slice(0, 4))); }
    return [...result].sort((a, b) => b - a);
  }
  function build(state, options = {}) {
    if (!Array.isArray(state?.invoices)) throw new Error('DATA_UNAVAILABLE');
    const date = Core.day(options.date || Core.today()); if (!date) throw new Error('INVALID_DATE');
    const year = options.year == null ? Number(date.slice(0, 4)) : Number(options.year);
    if (!Number.isInteger(year) || year < 1900 || year > 9999) throw new Error('INVALID_YEAR');
    const start = year + '-01-01', end = year + '-12-31', asOf = date < end ? date : end;
    const months = Array.from({ length: 12 }, (_, index) => {
      const key = year + '-' + String(index + 1).padStart(2, '0');
      return { index, key, totalUSD: 0, invoiceCount: 0, creditNoteCount: 0, complete: true, future: key + '-01' > date };
    });
    const units = Array(12).fill(0), warnings = [], seen = new Map();
    let unknownDate = false;
    function warn(code, ref, day) {
      warnings.push({ code, ref: String(ref || '') });
      if (!day) unknownDate = true;
      else if (day >= start && day <= asOf) months[Number(day.slice(5, 7)) - 1].complete = false;
    }
    for (const [index, invoice] of state.invoices.entries()) {
      if (!invoice || typeof invoice !== 'object') { warn('invalidInvoice', index); continue; }
      const day = recordDay(invoice), key = invoice.id == null || invoice.id === '' ? '__wf_undocumented_' + index : String(invoice.id);
      if (seen.has(key)) {
        const previous = seen.get(key);
        if ((!excluded(invoice) && (!day || day >= start && day <= asOf)) || (!excluded(previous.invoice) && (!previous.day || previous.day >= start && previous.day <= asOf))) {
          warn('duplicateInvoice', key, day); if (previous.day) warn('duplicateInvoice', key, previous.day);
        }
        continue;
      }
      seen.set(key, { invoice, day });
      if (excluded(invoice)) continue;
      if (!day) { warn('undatedInvoice', key); continue; }
      if (day < start || day > asOf) continue;
      const month = months[Number(day.slice(5, 7)) - 1], amount = Core.cents(invoice.grandTotal ?? invoice.grandTotalUSD);
      month.invoiceCount++;
      if (amount == null) { warn('invalidAmount', key, day); continue; }
      units[month.index] += amount;
      if (amount < 0) month.creditNoteCount++;
    }
    if (unknownDate) for (const month of months) if (!month.future) month.complete = false;
    for (const month of months) month.totalUSD = units[month.index] / 100;
    const complete = !unknownDate && months.every(month => month.complete);
    const invoiceCount = months.reduce((sum, month) => sum + month.invoiceCount, 0);
    return { version: 1, year, date, asOf: asOf < start ? null : asOf, baseCurrency: 'USD', months,
      totalUSD: units.reduce((sum, amount) => sum + amount, 0) / 100,
      invoiceCount, creditNoteCount: months.reduce((sum, month) => sum + month.creditNoteCount, 0),
      activeMonths: months.filter(month => month.invoiceCount > 0).length,
      complete, warnings, years: years(state, date) };
  }
  const api = { build, labels, years, recordDay };
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (typeof document === 'undefined') return;
  const copy = {
    ar: { title: 'المبيعات حسب الشهر', year: 'السنة', refresh: 'تحديث المبيعات السنوية', net: 'صافي مبيعات السنة', invoices: 'الفواتير المسجّلة', active: 'أشهر فيها حركة', count: 'فاتورة', credits: 'إشعارات دائنة ضمن العدد', basis: 'USD بالقيم المحفوظة. الإشعارات الدائنة تخصم من المبيعات؛ الدفعات والتحويلات لا تُضاف إليها.', through: 'حتى', fullYear: 'سنة كاملة · 12 شهرًا', future: 'لم يحن بعد', empty: 'لا توجد مبيعات مسجّلة لهذه السنة حتى تاريخ التقرير.', loading: 'جارٍ قراءة المبيعات المحفوظة…', failed: 'تعذّر قراءة المبيعات. أعد المحاولة.', review: 'تحتاج سجلات المبيعات إلى مراجعة؛ لم يُعرض الإجمالي غير المكتمل كرقم مؤكد.', partial: 'بحاجة لمراجعة', recorded: 'سجلات تحتاج لمراجعة', positive: 'مبيعات', negative: 'صافي دائن', zero: 'لا حركة' },
    en: { title: 'Sales by month', year: 'Year', refresh: 'Refresh annual sales', net: 'Yearly net sales', invoices: 'Recorded invoices', active: 'Months with activity', count: 'invoices', credits: 'credit notes included', basis: 'USD at recorded values. Credit notes reduce sales; payments and transfers are excluded.', through: 'Through', fullYear: 'Full year · 12 months', future: 'Not yet due', empty: 'No sales are recorded for this year through the report date.', loading: 'Reading saved sales…', failed: 'Could not read sales. Please retry.', review: 'Sales records need review; incomplete totals are not shown as confirmed amounts.', partial: 'Needs review', recorded: 'records need review', positive: 'Sales', negative: 'Net credit', zero: 'No activity' },
    tr: { title: 'Aylık satışlar', year: 'Yıl', refresh: 'Yıllık satışları yenile', net: 'Yıllık net satışlar', invoices: 'Kayıtlı faturalar', active: 'Hareket olan aylar', count: 'fatura', credits: 'dahil alacak dekontu', basis: 'Kayıtlı USD tutarları. Alacak dekontları satıştan düşülür; ödemeler ve transferler eklenmez.', through: 'Tarihine kadar', fullYear: 'Tam yıl · 12 ay', future: 'Henüz gelmedi', empty: 'Rapor tarihine kadar bu yıl için kayıtlı satış yok.', loading: 'Kayıtlı satışlar okunuyor…', failed: 'Satışlar okunamadı. Tekrar deneyin.', review: 'Satış kayıtları incelenmeli; eksik toplamlar kesin tutar olarak gösterilmez.', partial: 'İnceleme gerekli', recorded: 'kayıt incelenmeli', positive: 'Satış', negative: 'Net alacak', zero: 'Hareket yok' },
    fr: { title: 'Ventes par mois', year: 'Année', refresh: 'Actualiser les ventes annuelles', net: 'Ventes nettes annuelles', invoices: 'Factures enregistrées', active: 'Mois avec activité', count: 'factures', credits: 'avoirs inclus', basis: 'USD aux valeurs enregistrées. Les avoirs réduisent les ventes ; paiements et transferts sont exclus.', through: 'Au', fullYear: 'Année complète · 12 mois', future: 'À venir', empty: 'Aucune vente enregistrée pour cette année à la date du rapport.', loading: 'Lecture des ventes enregistrées…', failed: 'Lecture des ventes impossible. Réessayez.', review: 'Des ventes sont à vérifier ; les totaux incomplets ne sont pas présentés comme confirmés.', partial: 'À vérifier', recorded: 'enregistrements à vérifier', positive: 'Ventes', negative: 'Avoir net', zero: 'Aucune activité' },
    ru: { title: 'Продажи по месяцам', year: 'Год', refresh: 'Обновить годовые продажи', net: 'Чистые продажи за год', invoices: 'Учтённые счета', active: 'Месяцы с операциями', count: 'счетов', credits: 'включено кредит-нот', basis: 'Сохранённые суммы в USD. Кредит-ноты уменьшают продажи; платежи и переводы не добавляются.', through: 'По состоянию на', fullYear: 'Полный год · 12 месяцев', future: 'Ещё не наступил', empty: 'За этот год до даты отчёта продажи не зарегистрированы.', loading: 'Чтение сохранённых продаж…', failed: 'Не удалось прочитать продажи. Повторите попытку.', review: 'Записи продаж требуют проверки; неполные итоги не показаны как подтверждённые суммы.', partial: 'Нужна проверка', recorded: 'записей требуют проверки', positive: 'Продажи', negative: 'Чистый кредит', zero: 'Нет операций' }
  };
  const icons = {
    sales: '<path d="M4 18V6m0 12h16M8 14l4-4 3 2 5-7M16 5h4v4"/>',
    invoice: '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Z"/><path d="M9 7h6M9 11h6M9 15h3"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M7 3v4m10-4v4M3 10h18M8 14h2m4 0h2m-8 3h2"/>',
    up: '<path d="m5 16 5-5 4 3 5-8m-5 0h5v5"/>',
    down: '<path d="m5 8 5 5 4-3 5 8m-5 0h5v-5"/>',
    empty: '<path d="M5 12h14"/>',
    refresh: '<path d="M20 7v5h-5M4 17v-5h5"/><path d="M6 7a7 7 0 0 1 12-1l2 2M4 16l2 2a7 7 0 0 0 12-1"/>'
  };
  function icon(key, tone) { const wrap = document.createElement('span'); wrap.className = 'wf-annual-icon' + (tone ? ' wf-annual-tone-' + tone : ''); wrap.setAttribute('aria-hidden', 'true'); wrap.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">' + icons[key] + '</svg>'; return wrap; }
  function node(tag, className, text) { const el = document.createElement(tag); if (className) el.className = className; if (text != null) el.textContent = text; return el; }
  const host = document.getElementById('wfMonthlySales'); if (!host) return;
  const card = host.closest('.wf-report-sales'); card?.classList.add('wf-annual-sales');
  const heading = document.getElementById('wfSalesHeading');
  const header = node('div', 'wf-annual-header'), title = node('div', 'wf-annual-title');
  if (heading) title.append(heading); header.append(title);
  const yearLabel = node('label', 'wf-annual-year'), yearCaption = node('span'), yearSelect = node('select', 'fc'); yearSelect.id = 'wfAnnualSalesYear'; yearLabel.htmlFor = yearSelect.id; yearLabel.append(yearCaption, yearSelect);
  const refreshButton = node('button', 'wf-annual-refresh'); refreshButton.type = 'button'; refreshButton.append(icon('refresh'));
  const controls = node('div', 'wf-annual-controls'); controls.append(yearLabel, refreshButton); header.append(controls); host.before(header);
  const dateLine = node('p', 'wf-annual-asof'); title.append(dateLine);
  const metrics = node('dl', 'wf-annual-metrics'), note = node('p', 'wf-annual-note'), status = node('p', 'wf-annual-status'), list = node('ol', 'wf-annual-months');
  status.setAttribute('role', 'status'); status.setAttribute('aria-live', 'polite');
  host.replaceChildren(metrics, note, status, list);
  let snapshot = null, selectedYear = Number(Core.today().slice(0, 4)), revision = 0, refreshing = false;
  const locale = () => copy[document.documentElement.lang] ? document.documentElement.lang : 'en';
  function render() {
    const lang = locale(), L = copy[lang];
    if (heading) heading.textContent = L.title;
    yearCaption.textContent = L.year; refreshButton.title = L.refresh; refreshButton.setAttribute('aria-label', L.refresh); note.textContent = L.basis;
    if (!snapshot) { status.textContent = refreshing ? L.loading : L.failed; return; }
    const report = build(snapshot, { year: selectedYear });
    const names = labels(lang), number = new Intl.NumberFormat(lang, { useGrouping: false }), money = new Intl.NumberFormat(lang, { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });
    const yearValues = report.years.includes(selectedYear) ? report.years : [...report.years, selectedYear].sort((a, b) => b - a);
    if (yearSelect.dataset.values !== yearValues.join(',') || yearSelect.dataset.locale !== lang) {
      yearSelect.replaceChildren(...yearValues.map(value => { const option = node('option', '', number.format(value)); option.value = String(value); return option; }));
      yearSelect.dataset.values = yearValues.join(','); yearSelect.dataset.locale = lang;
    }
    yearSelect.value = String(selectedYear);
    const through = report.asOf ? new Intl.DateTimeFormat(lang, { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC', calendar: 'gregory' }).format(new Date(report.asOf + 'T12:00:00Z')) : L.future;
    dateLine.textContent = L.fullYear + ' · ' + (report.asOf ? L.through + ' ' : '') + through;
    function metric(key, symbol, tone, value, detail = '') {
      const item = node('div', 'wf-annual-metric'), content = node('div'), amount = node('dd', '', value);
      if (key === 'active') { const ratio = node('bdi', '', value); ratio.dir = 'ltr'; amount.replaceChildren(ratio); }
      content.append(node('dt', '', L[key]), amount); if (detail) content.append(node('small', '', detail)); item.append(icon(symbol, tone), content); return item;
    }
    metrics.replaceChildren(metric('net', 'sales', report.totalUSD < 0 ? 'negative' : 'sales', report.complete ? money.format(report.totalUSD) : '—', report.complete ? 'USD' : L.partial), metric('invoices', 'invoice', 'invoice', number.format(report.invoiceCount), report.creditNoteCount ? number.format(report.creditNoteCount) + ' ' + L.credits : ''), metric('active', 'calendar', 'calendar', number.format(report.activeMonths) + ' / ' + number.format(12)));
    const peak = Math.max(1, ...report.months.filter(month => month.complete && !month.future).map(month => Math.abs(month.totalUSD)));
    list.setAttribute('aria-label', L.title + ' · ' + number.format(selectedYear));
    list.replaceChildren(...report.months.map(month => {
      const row = node('li', 'wf-annual-month'); row.classList.toggle('is-future', month.future); row.classList.toggle('is-negative', month.totalUSD < 0); row.classList.toggle('needs-review', !month.complete);
      const label = node('div', 'wf-annual-month-label'); label.append(node('strong', '', names[month.index]), node('small', '', month.future ? L.future : number.format(month.invoiceCount) + ' ' + L.count));
      const signedIcon = icon(month.totalUSD < 0 ? 'down' : month.totalUSD > 0 ? 'up' : 'empty', month.totalUSD < 0 ? 'negative' : month.totalUSD > 0 ? 'sales' : 'neutral');
      const bar = node('span', 'wf-annual-bar'), fill = node('span'); bar.setAttribute('aria-hidden', 'true'); fill.style.width = month.complete && !month.future ? (Math.abs(month.totalUSD) / peak * 100) + '%' : '0%'; bar.append(fill);
      const amount = node('bdi', 'wf-annual-amount', month.future ? '—' : month.complete ? money.format(month.totalUSD) : L.partial);
      amount.title = month.future ? L.future : !month.complete ? L.partial : month.totalUSD < 0 ? L.negative : month.totalUSD > 0 ? L.positive : L.zero;
      row.append(signedIcon, label, bar, amount); return row;
    }));
    status.textContent = !report.complete ? L.review : !report.invoiceCount ? L.empty : '';
    status.classList.toggle('needs-review', !report.complete);
  }
  async function refresh() {
    const current = ++revision; refreshing = true; refreshButton.disabled = true; host.setAttribute('aria-busy', 'true'); render();
    try {
      if (!root.WFBusinessOverview?.readCommitted) throw new Error('DATA_UNAVAILABLE');
      const next = await root.WFBusinessOverview.readCommitted();
      if (current !== revision) return;
      snapshot = next; render();
    } catch (_) {
      if (current !== revision) return;
      snapshot = null; metrics.replaceChildren(); list.replaceChildren(); status.textContent = copy[locale()].failed;
    } finally {
      if (current === revision) { refreshing = false; refreshButton.disabled = false; host.setAttribute('aria-busy', 'false'); }
    }
  }
  yearSelect.addEventListener('change', () => { selectedYear = Number(yearSelect.value); render(); });
  refreshButton.addEventListener('click', refresh);
  new MutationObserver(() => { if (snapshot) render(); }).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
  root.wfRenderAnnualSales = refresh;
  if (document.getElementById('page-reports')?.classList.contains('active')) refresh();
})(typeof globalThis !== 'undefined' ? globalThis : this);
