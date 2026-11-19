const currencies = ['TRY', 'SYP', 'USD', 'EUR'];
const names = {TRY:'الليرة التركية', SYP:'الليرة السورية', USD:'الدولار الأمريكي', EUR:'اليورو'};
const prefix = 'cashbox-entry/';
const labels = {receipt:'قبض', expense:'صرف', transfer:'تحويل', opening:'رصيد افتتاحي', invoice:'دفعة فاتورة نقدية'};

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
  box.dir='rtl';
  box.innerHTML='<form><div class="cashbox-overview"><label>الصندوق<select name="currency"></select></label><output aria-live="polite"></output></div><label>نوع الحركة<select name="type"></select></label><label>المبلغ<input name="amount" type="number" min=".01" step=".01" required inputmode="decimal"></label><label hidden>إلى صندوق<select name="target"></select></label><label hidden>المبلغ المستلم بعملة الوجهة<input name="received" type="number" min=".01" step=".01" inputmode="decimal"></label><label>البيان<input name="note" maxlength="180"></label><button class="btn btn-p" type="submit">حفظ الحركة</button></form><p role="status"></p><h3>سجل الصندوق</h3><ol></ol>';
  page.querySelector('header').after(box);
  const form=box.querySelector('form'), fields=form.elements, status=box.querySelector('[role=status]');
  for (const key of currencies) fields.currency.add(new Option(names[key]+' · '+key,key));
  for (const key of ['receipt','expense','transfer','opening']) fields.type.add(new Option(labels[key],key));
  let version=0, saving=false;
  const format=(units,currency)=>new Intl.NumberFormat('ar-u-nu-latn',{style:'currency',currency}).format(units/100);
  async function render() {
    const revision=++version, currency=fields.currency.value;
    const transfer=fields.type.value==='transfer';
    const previous=fields.target.value;
    fields.target.replaceChildren(...currencies.filter(c=>c!==currency).map(c=>new Option(names[c],c)));
    if (previous && previous!==currency) fields.target.value=previous;
    for (const input of [fields.target,fields.received]) {
      input.closest('label').hidden=!transfer;
      input.disabled=!transfer;
      input.required=transfer;
    }
    box.querySelector('output').textContent='جارٍ قراءة الرصيد…';
    const list=box.querySelector('ol');
    list.replaceChildren();
    try {
      const [keys,invoices,payments]=await Promise.all([dbGetAllKeysRaw('settings'),dbGetAll('invoices'),dbGetAll('payments')]);
      const entries=await Promise.all(keys.filter(k=>String(k).startsWith(prefix)).map(k=>dbGet('settings',k)));
      if (revision!==version) return;
      const {groups,unattached}=WOWStatementCore.collectPayments(invoices,payments);
      const rows=cashRows(entries.filter(Boolean),[...Array.from(groups.values()).flat(),...unattached],currency);
      box.querySelector('output').textContent='الرصيد المسجّل  '+format(rows.reduce((sum,r)=>sum+r.units,0),currency);
      for (const row of rows) {
        const li=document.createElement('li');
        const detail=document.createElement('span'), value=document.createElement('bdi'), meta=document.createElement('small');
        detail.textContent=labels[row.type];
        value.textContent=format(row.units,currency);
        meta.textContent=[String(row.date).slice(0,10),row.note].filter(Boolean).join(' · ');
        li.append(detail,value,meta);
        list.append(li);
      }
      if (!rows.length) list.textContent='لا توجد حركات مسجّلة في هذا الصندوق.';
    } catch {
      if (revision===version) box.querySelector('output').textContent='تعذّرت قراءة الرصيد. أعد فتح الصندوق.';
    }
  }
  const refreshWhenOpen=()=>{if(page.classList.contains('active')) render();};
  new MutationObserver(refreshWhenOpen).observe(page,{attributes:true,attributeFilter:['class']});
  refreshWhenOpen();
  fields.currency.onchange=fields.type.onchange=render;
  form.onsubmit=async event=>{
    event.preventDefault();
    if (saving) return;
    saving=true;
    const button=form.querySelector('button');
    button.disabled=true;
    try {
      const data=Object.fromEntries(new FormData(form));
      const entry=makeEntry(data,wfNewRecordId(),new Date().toISOString());
      await dbPut('settings',entry);
      fields.amount.value=fields.received.value=fields.note.value='';
      status.textContent='تم حفظ الحركة.';
      // A committed save clears this draft; later edits remain independently dirty.
      form.dispatchEvent(new CustomEvent('wf-cashbox-entry-saved',{bubbles:true}));
      await render();
    } catch(error) { status.textContent=error.message || 'تعذّر حفظ الحركة.'; }
    finally { saving=false; button.disabled=false; }
  };
}
