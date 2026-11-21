/* Native invoice archive. Opening the page or changing a filter is read-only. */
(function (root) {
  'use strict';
  const operations = root.WFOperations;
  const core = root.WFInvoiceArchiveCore;
  if (!operations || !core) return;

  const copy = {
    ar:{
      title:'أرشيف الفواتير', subtitle:'الفواتير المؤرشفة وملصقات طرودها', add:'أرشفة فاتورة', select:'اختر فاتورة نشطة',
      search:'رقم الفاتورة أو اسم العميل', year:'سنة الأرشفة', month:'شهر الأرشفة', allYears:'كل السنوات', allMonths:'كل الأشهر',
      sort:'الترتيب', newest:'الأحدث أولاً', oldest:'الأقدم أولاً', count:'الفواتير المؤرشفة', total:'مجموع الفواتير بالدولار',
      numberMissing:'رقم الفاتورة غير مسجل', clientMissing:'اسم العميل غير مسجل', archivedOn:'تاريخ الأرشفة', labelDate:'تاريخ حفظ بيانات الملصقات',
      cost:'التكلفة المسجلة', archiveCostDate:'تاريخ تسجيل التكلفة عند الأرشفة', noRate:'سعر الصرف غير مسجل', unknown:'غير متاح',
      preview:'معاينة', labels:'طباعة الملصقات', restore:'استعادة', archive:'أرشفة', cancel:'إلغاء',
      askArchive:'أرشفة هذه الفاتورة؟', askRestore:'استعادة هذه الفاتورة؟',
      detailArchive:'ستُنقل إلى الأرشيف. ستُحفظ التكلفة المتاحة بتاريخ اليوم لأي بند لم تُسجَّل تكلفته سابقاً.',
      detailRestore:'ستظهر الفاتورة مجدداً ضمن الفواتير النشطة، مع الاحتفاظ بالدفعات وحالة التسليم.',
      doneArchive:'تمت أرشفة الفاتورة.', doneRestore:'تمت استعادة الفاتورة.', failed:'تعذّر حفظ التغيير. حاول مجدداً.',
      missing:'الفاتورة غير متاحة.', noActive:'لا توجد فواتير نشطة.', empty:'لا توجد فواتير مؤرشفة.', noMatch:'لا توجد فواتير مطابقة.',
      reset:'مسح عوامل التصفية', more:'عرض المزيد', saving:'جارٍ الحفظ…'
    },
    tr:{
      title:'Fatura arşivi', subtitle:'Arşivlenmiş faturalar ve koli etiketleri', add:'Fatura arşivle', select:'Etkin bir fatura seçin',
      search:'Fatura numarası veya müşteri', year:'Arşiv yılı', month:'Arşiv ayı', allYears:'Tüm yıllar', allMonths:'Tüm aylar',
      sort:'Sıralama', newest:'Önce en yeni', oldest:'Önce en eski', count:'Arşivlenmiş faturalar', total:'Fatura toplamı (USD)',
      numberMissing:'Fatura numarası kayıtlı değil', clientMissing:'Müşteri adı kayıtlı değil', archivedOn:'Arşiv tarihi', labelDate:'Etiket bilgilerinin kayıt tarihi',
      cost:'Kayıtlı maliyet', archiveCostDate:'Arşivleme sırasında kaydedilen maliyetin tarihi', noRate:'Kayıtlı kur yok', unknown:'Bilgi yok',
      preview:'Önizle', labels:'Etiket yazdır', restore:'Geri al', archive:'Arşivle', cancel:'İptal',
      askArchive:'Bu fatura arşivlensin mi?', askRestore:'Bu fatura arşivden çıkarılsın mı?',
      detailArchive:'Fatura arşive taşınır. Maliyeti kaydedilmemiş kalemlerin mevcut maliyeti varsa bugünün tarihiyle kaydedilir.',
      detailRestore:'Fatura, ödemeleri ve teslimat durumu korunarak etkin faturalar listesine geri döner.',
      doneArchive:'Fatura arşivlendi.', doneRestore:'Fatura arşivden çıkarıldı.', failed:'Değişiklik kaydedilemedi. Tekrar deneyin.',
      missing:'Faturaya ulaşılamıyor.', noActive:'Etkin fatura yok.', empty:'Arşivlenmiş fatura yok.', noMatch:'Eşleşen fatura yok.',
      reset:'Filtreleri temizle', more:'Daha fazla göster', saving:'Kaydediliyor…'
    },
    en:{
      title:'Invoice archive', subtitle:'Archived invoices and their package labels', add:'Archive an invoice', select:'Choose an active invoice',
      search:'Invoice number or customer', year:'Archive year', month:'Archive month', allYears:'All years', allMonths:'All months',
      sort:'Sort by', newest:'Newest first', oldest:'Oldest first', count:'Archived invoices', total:'Invoice total (USD)',
      numberMissing:'Invoice number unavailable', clientMissing:'Customer name unavailable', archivedOn:'Archived on', labelDate:'Label details captured',
      cost:'Recorded cost', archiveCostDate:'Cost captured at archiving', noRate:'Exchange rate unavailable', unknown:'Unavailable',
      preview:'Preview', labels:'Print labels', restore:'Restore', archive:'Archive', cancel:'Cancel',
      askArchive:'Archive this invoice?', askRestore:'Restore this invoice?',
      detailArchive:'The invoice will move to the archive. Lines without a recorded cost will use any available product cost as of today.',
      detailRestore:'The invoice will return to active invoices with its payments and delivery status intact.',
      doneArchive:'Invoice archived.', doneRestore:'Invoice restored.', failed:'Could not save the change. Please try again.',
      missing:'Invoice unavailable.', noActive:'No active invoices.', empty:'No archived invoices yet.', noMatch:'No matching invoices.',
      reset:'Clear filters', more:'Show more', saving:'Saving…'
    },
    fr:{
      title:'Archives des factures', subtitle:'Factures archivées et étiquettes de colis', add:'Archiver une facture', select:'Choisir une facture active',
      search:'Numéro de facture ou client', year:'Année d’archivage', month:'Mois d’archivage', allYears:'Toutes les années', allMonths:'Tous les mois',
      sort:'Trier par', newest:'Plus récentes', oldest:'Plus anciennes', count:'Factures archivées', total:'Total des factures (USD)',
      numberMissing:'Numéro de facture inconnu', clientMissing:'Nom du client inconnu', archivedOn:'Date d’archivage', labelDate:'Données des étiquettes enregistrées le',
      cost:'Coût enregistré', archiveCostDate:'Coût saisi lors de l’archivage', noRate:'Taux de change indisponible', unknown:'Indisponible',
      preview:'Aperçu', labels:'Imprimer les étiquettes', restore:'Restaurer', archive:'Archiver', cancel:'Annuler',
      askArchive:'Archiver cette facture ?', askRestore:'Restaurer cette facture ?',
      detailArchive:'La facture sera archivée. Pour les lignes sans coût enregistré, le coût disponible du produit sera daté d’aujourd’hui.',
      detailRestore:'La facture rejoindra les factures actives avec ses paiements et son statut de livraison.',
      doneArchive:'Facture archivée.', doneRestore:'Facture restaurée.', failed:'Enregistrement impossible. Veuillez réessayer.',
      missing:'Facture indisponible.', noActive:'Aucune facture active.', empty:'Aucune facture archivée.', noMatch:'Aucune facture correspondante.',
      reset:'Effacer les filtres', more:'Afficher la suite', saving:'Enregistrement…'
    },
    ru:{
      title:'Архив счетов', subtitle:'Архивные счета и этикетки для грузовых мест', add:'Архивировать счёт', select:'Выберите активный счёт',
      search:'Номер счёта или клиент', year:'Год архивации', month:'Месяц архивации', allYears:'Все годы', allMonths:'Все месяцы',
      sort:'Сортировка', newest:'Сначала новые', oldest:'Сначала старые', count:'Счета в архиве', total:'Сумма счетов (USD)',
      numberMissing:'Номер счёта неизвестен', clientMissing:'Имя клиента неизвестно', archivedOn:'Дата архивации', labelDate:'Дата записи данных этикеток',
      cost:'Учтённая себестоимость', archiveCostDate:'Дата записи себестоимости при архивации', noRate:'Курс валюты неизвестен', unknown:'Нет данных',
      preview:'Просмотр', labels:'Печать этикеток', restore:'Восстановить', archive:'В архив', cancel:'Отмена',
      askArchive:'Архивировать этот счёт?', askRestore:'Восстановить этот счёт?',
      detailArchive:'Счёт будет перенесён в архив. Для позиций без учтённой себестоимости доступная себестоимость товара будет записана на сегодняшнюю дату.',
      detailRestore:'Счёт вернётся в список активных. Платежи и статус доставки сохранятся.',
      doneArchive:'Счёт перенесён в архив.', doneRestore:'Счёт восстановлен.', failed:'Не удалось сохранить изменение. Попробуйте ещё раз.',
      missing:'Счёт недоступен.', noActive:'Нет активных счетов.', empty:'Архивных счетов пока нет.', noMatch:'Подходящих счетов нет.',
      reset:'Сбросить фильтры', more:'Показать ещё', saving:'Сохранение…'
    }
  };
  const route = 'invoice-archive';
  const make = operations.make;
  const locales = Object.keys(copy);
  const heading = key => Object.fromEntries(locales.map(lang => [lang, copy[lang][key]]));
  const locale = () => locales.includes(operations.locale()) ? operations.locale() : 'en';
  const words = () => copy[locale()];
  const invoices = () => operations.state()?.invoices || [];
  const find = id => invoices().find(row => row?.id != null && String(row.id) === String(id));
  const perPage = 24;
  let filters = {query:'',year:'',month:'',sort:'newest'};
  let limit = perPage, pending = null, choosing = false, busy = false, error = '';
  let shell, results, status, numbers, prompt, filterPanel;
  const currencyFormats = new Map();

  function money(value, currency) {
    if (value == null) return words().unknown;
    const key = locale() + ':' + currency;
    if (!currencyFormats.has(key)) {
      currencyFormats.set(key, new Intl.NumberFormat(locale(), {style:'currency',currency,currencyDisplay:'code',maximumFractionDigits:2}));
    }
    return currencyFormats.get(key).format(value);
  }

  function day(value) {
    const iso = root.WOWStatementCore.day(value);
    return iso ? new Intl.DateTimeFormat(locale(), {dateStyle:'medium',timeZone:'UTC'}).format(new Date(iso + 'T12:00:00Z')) : words().unknown;
  }

  function icon(name) {
    const span = make('span','wf-archive-icon');
    span.setAttribute('aria-hidden', 'true');
    span.innerHTML = operations.icon(name);
    return span;
  }

  function button(label, callback, primary = false, pictogram, permission) {
    const element = make('button', 'btn ' + (primary ? 'btn-p' : 'btn-s') + ' wf-archive-btn');
    element.type = 'button';
    if (permission) element.setAttribute('data-wf-permission', permission);
    if (pictogram) element.append(icon(pictogram));
    element.append(make('span', '', label));
    element.addEventListener('click', event => {if(permission && root.WFAccountAccess && !root.WFAccountAccess.allow(permission)) return; return callback(event);});
    return element;
  }

  function field(caption, control) {
    const label = make('label', 'wf-archive-field');
    label.append(make('span', '', caption), control);
    return label;
  }

  function select(options, value) {
    const element = make('select','fi');
    for (const [id, caption] of options) {
      const option = make('option','',caption);
      option.value = id;
      element.append(option);
    }
    element.value = value;
    return element;
  }

  function selectionField(key, caption, options) {
    const element = select(options, filters[key]);
    element.addEventListener('change', () => {
      filters[key] = element.value;
      limit = perPage;
      renderResults();
    });
    return field(caption, element);
  }

  function issuerLogo() {
    const current = operations.state()?.settings?.logo;
    return typeof root.wfCompanyLogo === 'function' ? root.wfCompanyLogo(current) : current || './assets/wow-furniture-logo.svg';
  }

  function capture(invoice, {capturedAt = new Date().toISOString(), archiving = !!invoice?.archived} = {}) {
    return core.capture(invoice, {issuerLogo:issuerLogo(), capturedAt, archiving, captureCosts:root.WFCosting?.captureInvoiceCosts});
  }

  async function confirmChange() {
    if (root.WFAccountAccess && !root.WFAccountAccess.allow('archives.edit')) return false;
    if (busy || !pending) return;
    const {id, action} = pending;
    busy = true;
    error = '';
    renderPrompt();
    try {
      await core.commitTransition({
        id, action, capturedAt:new Date().toISOString(), issuerLogo:action === 'archive' ? issuerLogo() : null
      }, {
        writeBatch:wfWriteBatch, hydrate:wfHydrateDBValue, captureCosts:root.WFCosting?.captureInvoiceCosts,
        apply(row) {
          const state = operations.state();
          const index = state.invoices.findIndex(item => item?.id === row.id);
          if (index >= 0) state.invoices[index] = row;
          else state.invoices.push(row);
        }
      });
    } catch (cause) {
      error = cause?.message === 'MISSING_INVOICE' ? 'missing' : 'failed';
      busy = false;
      renderPrompt();
      return;
    }
    busy = false;
    pending = null;
    choosing = false;
    operations.notify(words()[action === 'archive' ? 'doneArchive' : 'doneRestore'], 'ok');
    refresh();
    if (typeof root.renderInvList === 'function') root.renderInvList();
    if (typeof root.updateDash === 'function') root.updateDash();
  }

  function focusPrompt() {
    const first = prompt?.querySelector('h2, select');
    if (first) {
      first.focus({preventScroll:true});
      first.scrollIntoView({block:'nearest'});
    }
  }

  function requestChange(id, action) {
    if (root.WFAccountAccess && !root.WFAccountAccess.allow('archives.edit')) return false;
    if (busy) return;
    const row = find(id);
    choosing = false;
    error = '';
    pending = row ? {id:row.id, action} : null;
    if (!row) error = 'missing';
    showArchive();
    focusPrompt();
  }

  function cancel() {
    if (busy) return;
    pending = null;
    choosing = false;
    error = '';
    renderPrompt();
    shell.actions.querySelector('.wf-archive-btn')?.focus({preventScroll:true});
  }

  function renderPrompt() {
    if (!prompt) return;
    const L = words();
    const actionButton = shell.actions.querySelector('.wf-archive-btn');
    if (actionButton) {
      actionButton.disabled = busy;
      actionButton.setAttribute('aria-expanded', String(choosing || !!pending));
    }
    prompt.setAttribute('aria-busy', String(busy));
    prompt.hidden = !pending && !choosing && !error;
    prompt.replaceChildren();
    if (pending) {
      const row = find(pending.id);
      const archiving = pending.action === 'archive';
      const title = make('h2','',archiving ? L.askArchive : L.askRestore);
      title.tabIndex = -1;
      const summary = make('bdi','wf-archive-ref',row ? [row.invNo,row.companyName].filter(Boolean).join(' · ') || L.numberMissing : L.missing);
      const details = make('p','',archiving ? L.detailArchive : L.detailRestore);
      const buttons = make('div','wf-archive-actions');
      const confirm = button(busy ? L.saving : archiving ? L.archive : L.restore, confirmChange, true, undefined, 'archives.edit');
      const close = button(L.cancel,cancel);
      confirm.disabled = busy || !row;
      close.disabled = busy;
      buttons.append(confirm,close);
      prompt.append(title,summary,details,buttons);
    } else if (choosing) {
      const active = invoices().filter(row => row?.id != null && !row.archived).slice().reverse();
      if (active.length) {
        const picker = select([['',L.select], ...active.map((row,i) => [String(i),[row.invNo,row.companyName].filter(Boolean).join(' · ') || L.numberMissing])], '');
        picker.addEventListener('change', () => {
          if (picker.value !== '') requestChange(active[Number(picker.value)].id, 'archive');
        });
        prompt.append(field(L.select,picker));
      } else {
        prompt.append(make('p','',L.noActive));
      }
      prompt.append(button(L.cancel,cancel));
    }
    if (error) {
      const note = make('p','wf-archive-error',L[error]);
      note.setAttribute('role','alert');
      prompt.append(note);
    }
  }

  function renderFilters() {
    const L = words();
    const search = make('input','fi');
    search.type = 'search';
    search.value = filters.query;
    search.dir = 'auto';
    search.autocomplete = 'off';
    search.id = 'wfArchiveSearch';
    search.addEventListener('input', () => {
      filters.query = search.value;
      limit = perPage;
      renderResults();
    });
    const years = [...new Set(invoices().filter(row => row?.archived).map(row => core.archiveDay(row)?.slice(0,4)).filter(Boolean))].sort().reverse();
    if (filters.year && !years.includes(filters.year)) filters.year = '';
    const months = new Intl.DateTimeFormat(locale(), {month:'long',timeZone:'UTC'});
    const choices = Array.from({length:12}, (_, i) => [String(i + 1).padStart(2,'0'),months.format(Date.UTC(2020,i,15))]);
    const searchField = field(L.search,search);
    searchField.classList.add('wf-archive-search');
    filterPanel.replaceChildren(searchField,
      selectionField('year',L.year,[['',L.allYears],...years.map(year => [year,year])]),
      selectionField('month',L.month,[['',L.allMonths],...choices]),
      selectionField('sort',L.sort,[['newest',L.newest],['oldest',L.oldest]]));
  }

  function metric(name, value, pictogram) {
    const container = make('div','wf-archive-metric');
    const detail = make('div','');
    detail.append(make('dt','',name),make('dd','',value));
    container.append(icon(pictogram),detail);
    return container;
  }

  function fact(list, label, value) {
    const group = make('div','');
    group.append(make('dt','',label),make('dd','',value));
    list.append(group);
  }

  function card(row) {
    const L = words();
    const element = make('article','wf-archive-card');
    const header = make('header','wf-archive-card-head');
    const identity = make('div','wf-archive-identity');
    identity.append(make('h3','',row.invNo || L.numberMissing),make('bdi','',row.companyName || L.clientMissing));
    identity.dir = 'auto';
    const amount = core.amounts(row);
    const total = make('div','wf-archive-amount');
    if (amount.currency !== 'USD') {
      const formatted = amount.native === null ? (amount.usd === null ? L.unknown : L.noRate) + ' · ' + amount.currency : money(amount.native,amount.currency);
      total.append(make('bdi','',formatted),make('small','',money(amount.usd,'USD')));
    } else {
      total.append(make('bdi','',money(amount.usd,'USD')));
    }
    header.append(identity,total);
    const facts = make('dl','wf-archive-facts');
    fact(facts,L.archivedOn,day(row.archivedAt));
    if (row.packageLabelSnapshot?.capturedAt) fact(facts,L.labelDate,day(row.packageLabelSnapshot.capturedAt));
    const cost = root.WFCosting?.invoiceSummary(row);
    if (cost?.status === 'complete' && Number.isFinite(cost.knownCostUSD)) fact(facts,L.cost,money(cost.knownCostUSD,'USD'));
    if (row.archiveCostCapturedAt) fact(facts,L.archiveCostDate,day(row.archiveCostCapturedAt));
    const actions = make('div','wf-archive-actions');
    if (row.id != null) {
      actions.append(button(L.preview,() => root.previewSaved(row.id), false, 'eye', 'invoices.view'),
        button(L.labels,() => root.WFPackageLabels.open(row.id), false, 'print', 'labels.view'),
        button(L.restore,() => requestChange(row.id,'restore'), false, 'restore', 'archives.edit'));
    }
    element.append(header,facts,actions);
    return element;
  }

  function renderResults() {
    if (!results) return;
    const L = words();
    const rows = core.filter(invoices(),filters);
    const totals = core.totals(rows);
    numbers.replaceChildren(metric(L.count,totals.count.toLocaleString(locale()),'archive'), metric(L.total,money(totals.usd,'USD'),'cost'));
    status.textContent = L.count + ' · ' + totals.count.toLocaleString(locale());
    results.replaceChildren();
    if (!rows.length) {
      const filtered = !!(filters.query.trim() || filters.year || filters.month);
      const empty = make('div','wf-archive-empty');
      empty.append(icon('archive'),make('p','',filtered ? L.noMatch : L.empty));
      if (filtered) empty.append(button(L.reset,() => {
        filters = {query:'',year:'',month:'',sort:filters.sort};
        refresh();
        filterPanel.querySelector('input')?.focus();
      }));
      results.append(empty);
      return;
    }
    const fragment = document.createDocumentFragment();
    for (const row of rows.slice(0,limit)) fragment.append(card(row));
    results.append(fragment);
    if (rows.length > limit) {
      const more = button(L.more,() => {
        const old = limit;
        limit += perPage;
        renderResults();
        const next = results.children[old]?.querySelector('h3');
        if (next) { next.tabIndex = -1; next.focus(); }
      });
      more.classList.add('wf-archive-more');
      results.append(more);
    }
  }

  function refresh() {
    if (!shell) return;
    const L = words();
    const add = button(L.add,() => {
      if (busy) return;
      choosing = !choosing;
      pending = null;
      error = '';
      renderPrompt();
      if (choosing) focusPrompt();
    },true,'archive','archives.edit');
    add.setAttribute('aria-controls','wfArchivePrompt');
    shell.actions.replaceChildren(add);
    prompt = make('section','wf-archive-prompt');
    prompt.id = 'wfArchivePrompt';
    numbers = make('dl','wf-archive-metrics');
    filterPanel = make('div','wf-archive-filters');
    results = make('div','wf-archive-results');
    status = make('span','wf-archive-sr');
    status.setAttribute('role','status');
    shell.body.replaceChildren(prompt,numbers,filterPanel,status,results);
    renderPrompt();
    renderFilters();
    renderResults();
  }

  function showArchive() {
    if (root.WFAccountAccess && !root.WFAccountAccess.allow('archives.view')) return false;
    if (shell.page.classList.contains('active')) refresh();
    else operations.open(route);
  }

  shell = operations.register({
    id:route, parent:'invoices', icon:'archive', title:heading('title'), subtitle:heading('subtitle'),
    onEnter:refresh, onLanguage:refresh
  });
  root.WFInvoiceArchive = {
    open:showArchive, archive:id => requestChange(id,'archive'), restore:id => requestChange(id,'restore'), capture, refresh
  };
  const registerGuard = () => root.WFAppUpdates?.registerGuard('invoice-archive', () => busy || (!!pending && shell.page.classList.contains('active')));
  registerGuard();
  document.addEventListener('DOMContentLoaded', registerGuard, {once:true});
  if (shell.page.classList.contains('active')) refresh();
})(window);
