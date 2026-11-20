const currencies = ['TRY', 'SYP', 'USD', 'EUR'];
const prefix = 'cashbox-entry/';
const labels = {receipt:'قبض', expense:'صرف', transfer:'تحويل', opening:'رصيد افتتاحي', invoice:'دفعة فاتورة نقدية'};
const TEXT = {
  ar: {
    title:'صناديق العملات', cashbox:'الصندوق', type:'نوع الحركة', amount:'المبلغ', target:'إلى صندوق', received:'المبلغ المستلم بعملة الوجهة', note:'البيان', save:'حفظ الحركة', saving:'جارٍ الحفظ…', history:'سجل الصندوق',
    loading:'جارٍ قراءة الرصيد…', balance:'الرصيد المسجّل', empty:'لا توجد حركات مسجّلة في هذا الصندوق.', loadError:'تعذّرت قراءة الرصيد. أعد فتح الصندوق.', saved:'تم حفظ الحركة.', saveError:'تعذّر حفظ الحركة. احتفظ ببياناتك وحاول مجددًا.',
    amountInvalid:'أدخل مبلغًا موجبًا بدقة منزلتين على الأكثر.', amountPositive:'أدخل مبلغًا أكبر من صفر.', typeInvalid:'اختر الصندوق ونوع الحركة.', targetInvalid:'اختر صندوقًا آخر للتحويل.',
    receipt:'قبض', expense:'صرف', transfer:'تحويل', opening:'رصيد افتتاحي', invoice:'دفعة فاتورة نقدية', movement:'حركة مسجّلة', TRY:'الليرة التركية', SYP:'الليرة السورية', USD:'الدولار الأمريكي', EUR:'اليورو'
  },
  en: {
    title:'Cashboxes', cashbox:'Cashbox', type:'Movement type', amount:'Amount', target:'To cashbox', received:'Amount received in the destination currency', note:'Note', save:'Save movement', saving:'Saving…', history:'Cashbox history',
    loading:'Reading balance…', balance:'Recorded balance', empty:'No movements are recorded in this cashbox.', loadError:'The balance could not be read. Reopen the cashbox.', saved:'Movement saved.', saveError:'The movement could not be saved. Keep your input and try again.',
    amountInvalid:'Enter a positive amount with up to two decimal places.', amountPositive:'Enter an amount greater than zero.', typeInvalid:'Choose a cashbox and movement type.', targetInvalid:'Choose a different destination cashbox.',
    receipt:'Receipt', expense:'Expense', transfer:'Transfer', opening:'Opening balance', invoice:'Cash invoice payment', movement:'Recorded movement', TRY:'Turkish lira', SYP:'Syrian pound', USD:'US dollar', EUR:'Euro'
  },
  tr: {
    title:'Para kasaları', cashbox:'Kasa', type:'İşlem türü', amount:'Tutar', target:'Hedef kasa', received:'Hedef para biriminde alınan tutar', note:'Açıklama', save:'İşlemi kaydet', saving:'Kaydediliyor…', history:'Kasa hareketleri',
    loading:'Bakiye okunuyor…', balance:'Kayıtlı bakiye', empty:'Bu kasada kayıtlı hareket yok.', loadError:'Bakiye okunamadı. Kasayı yeniden açın.', saved:'İşlem kaydedildi.', saveError:'İşlem kaydedilemedi. Girdiğiniz bilgileri koruyup yeniden deneyin.',
    amountInvalid:'En fazla iki ondalık basamaklı pozitif bir tutar girin.', amountPositive:'Sıfırdan büyük bir tutar girin.', typeInvalid:'Kasa ve işlem türünü seçin.', targetInvalid:'Aktarım için başka bir kasa seçin.',
    receipt:'Tahsilat', expense:'Ödeme', transfer:'Transfer', opening:'Açılış bakiyesi', invoice:'Nakit fatura ödemesi', movement:'Kayıtlı hareket', TRY:'Türk lirası', SYP:'Suriye lirası', USD:'ABD doları', EUR:'Euro'
  },
  fr: {
    title:'Caisses', cashbox:'Caisse', type:'Type de mouvement', amount:'Montant', target:'Caisse de destination', received:'Montant reçu dans la devise de destination', note:'Libellé', save:'Enregistrer le mouvement', saving:'Enregistrement…', history:'Historique de la caisse',
    loading:'Lecture du solde…', balance:'Solde enregistré', empty:'Aucun mouvement enregistré dans cette caisse.', loadError:'Impossible de lire le solde. Rouvrez la caisse.', saved:'Mouvement enregistré.', saveError:'Impossible d’enregistrer le mouvement. Conservez votre saisie et réessayez.',
    amountInvalid:'Saisissez un montant positif avec deux décimales au maximum.', amountPositive:'Saisissez un montant supérieur à zéro.', typeInvalid:'Choisissez une caisse et un type de mouvement.', targetInvalid:'Choisissez une autre caisse de destination.',
    receipt:'Encaissement', expense:'Décaissement', transfer:'Transfert', opening:'Solde initial', invoice:'Paiement de facture en espèces', movement:'Mouvement enregistré', TRY:'Livre turque', SYP:'Livre syrienne', USD:'Dollar américain', EUR:'Euro'
  },
  ru: {
    title:'Кассы', cashbox:'Касса', type:'Тип операции', amount:'Сумма', target:'Касса получателя', received:'Полученная сумма в валюте получателя', note:'Примечание', save:'Сохранить операцию', saving:'Сохранение…', history:'История кассы',
    loading:'Загрузка баланса…', balance:'Учтённый баланс', empty:'В этой кассе нет записанных операций.', loadError:'Не удалось загрузить баланс. Откройте кассу заново.', saved:'Операция сохранена.', saveError:'Не удалось сохранить операцию. Сохраните введённые данные и повторите попытку.',
    amountInvalid:'Введите положительную сумму, не более двух знаков после запятой.', amountPositive:'Введите сумму больше нуля.', typeInvalid:'Выберите кассу и тип операции.', targetInvalid:'Выберите другую кассу для перевода.',
    receipt:'Поступление', expense:'Расход', transfer:'Перевод', opening:'Начальный остаток', invoice:'Оплата счёта наличными', movement:'Записанная операция', TRY:'Турецкая лира', SYP:'Сирийский фунт', USD:'Доллар США', EUR:'Евро'
  }
};
const localeKey = value => {
  const key = String(value || 'ar').toLowerCase().split(/[-_]/)[0];
  return Object.hasOwn(TEXT,key) ? key : 'en';
};
export function cashboxText(key, language = 'ar') { return TEXT[localeKey(language)][key] ?? TEXT.en[key] ?? key; }
// Entry validation/storage keep their existing contract. Only known validation
// messages are translated at the UI boundary; raw storage details are not UI copy.
export function cashboxErrorMessage(error, language = 'ar') {
  const key = ['amountInvalid','amountPositive','typeInvalid','targetInvalid'].find(key => TEXT.ar[key] === error?.message);
  return cashboxText(key || 'saveError',language);
}

function minor(value) {
  const match = /^(\d{1,12})(?:\.(\d{1,2}))?$/.exec(String(value).trim());
  if (!match) throw Error('أدخل مبلغًا موجبًا بدقة منزلتين على الأكثر.');
  const amount = Number(match[1])*100 + Number((match[2] || '').padEnd(2,'0'));
  if (!amount) throw Error('أدخل مبلغًا أكبر من صفر.');
  return amount;
}

export function makeEntry({currency,type,amount,target,received,note}, id, date) {
  if (!currencies.includes(currency) || !Object.hasOwn(labels,type) || type==='invoice') throw Error('اختر الصندوق ونوع الحركة.');
  const units = minor(amount);
  const legs = [{currency, units:['expense','transfer'].includes(type) ? -units : units}];
  if (type==='transfer') {
    if (!currencies.includes(target) || target===currency) throw Error('اختر صندوقًا آخر للتحويل.');
    legs.push({currency:target, units:minor(received)});
  }
  return {id:prefix+id, date, type, note, legs};
}

export function cashRows(entries, payments, currency) {
  const rows = [];
  for (const entry of entries) {
    if (!entry.id?.startsWith(prefix)) continue;
    for (const leg of entry.legs || []) {
      if (leg.currency===currency && Number.isSafeInteger(leg.units))
        rows.push({date:entry.date, type:entry.type, units:leg.units, note:entry.note});
    }
  }
  for (const {raw:p} of payments) {
    if (p.receiptType!=='cash') continue;
    const original = p.originalAmount!=null && !!p.originalCurrency;
    const denomination = original ? p.originalCurrency : p.amountBasis==='USD' ? 'USD' : p.currency;
    if ((denomination==='TL'?'TRY':denomination)!==currency) continue;
    const units = Math.round(Number(original?p.originalAmount:p.amount)*100);
    if (Number.isSafeInteger(units) && units) rows.push({date:p.date || '',type:'invoice', units, note:p.note || ''});
  }
  return rows.sort((a,b)=>String(b.date).localeCompare(String(a.date)));
}

function mountSales() {
  const total=document.getElementById('s-total');
  const card=total?.closest('.wf-dash-sales');
  if (!card || card.querySelector('.sales-currencies')) return;
  const heading=document.createElement('div');
  heading.className='sales-heading';
  const icon=card.querySelector('.stat-icon');
  if(icon)heading.append(icon);
  heading.append(total.parentElement);
  card.prepend(heading);
  const list=document.createElement('dl');
  list.className='sales-currencies';
  card.append(list);
  const words={ar:['المبيعات حسب عملة الفاتورة','سعر أو مبلغ مفقود'],en:['Sales by invoice currency','Missing rate or amount'],tr:['Fatura para birimine göre satış','Kur veya tutar eksik'],fr:['Ventes par devise de facture','Taux ou montant manquant'],ru:['Продажи по валюте счёта','Нет курса или суммы']};
  function render(){
    if(typeof S==='undefined' || !globalThis.WOWStatementCore?.salesByCurrency)return;
    const lang=S.lang || 'ar', copy=words[lang] || words.en;
    list.setAttribute('aria-label',copy[0]);
    const regionNames=new Intl.DisplayNames([lang],{type:'currency'});
    const format=new Intl.NumberFormat(lang,{maximumFractionDigits:2});
    const cells=[];
    for(const [code,row] of WOWStatementCore.salesByCurrency(S.invoices || [])){
      const cell=document.createElement('div'), label=document.createElement('dt'), amount=document.createElement('dd');
      label.textContent=code;
      let name=code;
      if (/^[A-Z]{3}$/.test(code)) name=regionNames.of(code);
      label.title=name;
      label.setAttribute('aria-label',name);
      amount.textContent=row.missing?'—':format.format(row.units/100);
      if(row.missing){
        const reason=document.createElement('small');
        reason.textContent=copy[1];
        amount.append(reason);
      }
      cell.append(label,amount);cells.push(cell);
    }
    list.replaceChildren(...cells);
  }
  new MutationObserver(render).observe(total,{childList:true,characterData:true,subtree:true});
  new MutationObserver(render).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
  render();
}

export function mount() {
  mountSales();
  const page = document.querySelector('#page-cashboxes');
  if (!page || page.querySelector('.cashboxes')) return;
  const box = document.createElement('section');
  box.className='card cashboxes';
  box.innerHTML='<form><div class="cashbox-overview"><label><span data-cashbox-copy="cashbox"></span><select name="currency"></select></label><output aria-live="polite"></output></div><label><span data-cashbox-copy="type"></span><select name="type"></select></label><label><span data-cashbox-copy="amount"></span><input name="amount" type="number" min=".01" step=".01" required inputmode="decimal"></label><label hidden><span data-cashbox-copy="target"></span><select name="target"></select></label><label hidden><span data-cashbox-copy="received"></span><input name="received" type="number" min=".01" step=".01" inputmode="decimal"></label><label><span data-cashbox-copy="note"></span><input name="note" maxlength="180" dir="auto"></label><button class="btn btn-p" type="submit" data-cashbox-copy="save"></button></form><p role="status"></p><h3 data-cashbox-copy="history"></h3><ol></ol>';
  page.querySelector('header').after(box);
  const form=box.querySelector('form'), fields=form.elements, status=box.querySelector('[role=status]');
  const language=()=>localeKey(document.documentElement.lang);
  const text=key=>cashboxText(key,language());
  for (const key of currencies) fields.currency.add(new Option(text(key)+' · '+key,key));
  for (const key of ['receipt','expense','transfer','opening']) fields.type.add(new Option(text(key),key));
  let version=0, saving=false, viewState='idle', displayedRows=[], statusMessage=null;
  const formatters=new Map();
  const format=(units,currency)=>{
    const lang=language(), key=lang+':'+currency;
    if(!formatters.has(key))formatters.set(key,new Intl.NumberFormat(lang==='ar'?'ar-u-nu-latn':lang,{style:'currency',currency}));
    return formatters.get(key).format(units/100);
  };
  function paintStatus() {
    status.textContent=statusMessage?.key ? text(statusMessage.key) : statusMessage?.error ? cashboxErrorMessage(statusMessage.error,language()) : '';
    form.querySelector('button').textContent=text(saving?'saving':'save');
  }
  function paintRows() {
    const output=box.querySelector('output'), list=box.querySelector('ol'), currency=fields.currency.value;
    list.replaceChildren();
    if(viewState!=='ready') { output.textContent=viewState==='loading'?text('loading'):viewState==='error'?text('loadError'):''; return; }
    output.textContent=text('balance')+'  '+format(displayedRows.reduce((sum,row)=>sum+row.units,0),currency);
    for(const row of displayedRows) {
      const li=document.createElement('li'), detail=document.createElement('span'), value=document.createElement('bdi'), meta=document.createElement('small');
      detail.textContent=text(Object.hasOwn(labels,row.type)?row.type:'movement');
      value.textContent=format(row.units,currency);
      // These are saved user values, never translation keys or authored UI.
      meta.textContent=[String(row.date).slice(0,10),row.note].filter(Boolean).join(' · ');
      meta.dir='auto'; li.append(detail,value,meta); list.append(li);
    }
    if(!displayedRows.length)list.textContent=text('empty');
  }
  function translate() {
    box.dir=language()==='ar'?'rtl':'ltr';
    for(const label of box.querySelectorAll('[data-cashbox-copy]'))label.textContent=text(label.dataset.cashboxCopy);
    for(const option of fields.currency.options)option.textContent=text(option.value)+' · '+option.value;
    for(const option of fields.type.options)option.textContent=text(option.value);
    for(const option of fields.target.options)option.textContent=text(option.value);
    for(const label of document.querySelectorAll('[data-wf-ui="Cashboxes"]'))label.textContent=text('title');
    // Repaint the already read rows, preserving selected options and every
    // draft input. A language change does not need another storage request.
    paintRows(); paintStatus();
  }
  async function render() {
    const revision=++version, currency=fields.currency.value;
    const transfer=fields.type.value==='transfer';
    const previous=fields.target.value;
    fields.target.replaceChildren(...currencies.filter(c=>c!==currency).map(c=>new Option(text(c),c)));
    if (previous && previous!==currency) fields.target.value=previous;
    for (const input of [fields.target,fields.received]) {
      input.closest('label').hidden=!transfer;
      input.disabled=!transfer;
      input.required=transfer;
    }
    viewState='loading'; displayedRows=[]; paintRows();
    try {
      const [keys,invoices,payments]=await Promise.all([dbGetAllKeysRaw('settings'),dbGetAll('invoices'),dbGetAll('payments')]);
      const entries=await Promise.all(keys.filter(k=>String(k).startsWith(prefix)).map(k=>dbGet('settings',k)));
      if (revision!==version) return;
      const {groups,unattached}=WOWStatementCore.collectPayments(invoices,payments);
      displayedRows=cashRows(entries.filter(Boolean),[...Array.from(groups.values()).flat(),...unattached],currency);
      viewState='ready'; paintRows();
    } catch {
      if (revision===version) { viewState='error'; paintRows(); }
    }
  }
  const refreshWhenOpen=()=>{if(page.classList.contains('active')) render();};
  new MutationObserver(refreshWhenOpen).observe(page,{attributes:true,attributeFilter:['class']});
  new MutationObserver(translate).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
  translate();
  refreshWhenOpen();
  fields.currency.onchange=fields.type.onchange=render;
  form.onsubmit=async event=>{
    event.preventDefault();
    if (saving) return;
    saving=true;
    const button=form.querySelector('button');
    button.disabled=true; paintStatus();
    try {
      const data=Object.fromEntries(new FormData(form));
      const entry=makeEntry(data,wfNewRecordId(),new Date().toISOString());
      await dbPut('settings',entry);
      fields.amount.value=fields.received.value=fields.note.value='';
      statusMessage={key:'saved'}; paintStatus();
      // A committed save clears this draft; later edits remain independently dirty.
      form.dispatchEvent(new CustomEvent('wf-cashbox-entry-saved',{bubbles:true}));
      await render();
    } catch(error) { statusMessage={error}; paintStatus(); }
    finally { saving=false; button.disabled=false; paintStatus(); }
  };
}
