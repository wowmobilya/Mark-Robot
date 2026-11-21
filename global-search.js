/* Fast, local search across saved records. Search never edits or persists data. */
(function(root){
 'use strict';
 const string=value=>typeof value==='string'||typeof value==='number'?String(value):'';
 function normalizeSearch(value){
  return string(value).normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/ı/g,'i').replace(/[أإآٱ]/g,'ا').replace(/ى/g,'ي').replace(/ـ/g,'')
   .replace(/[٠-٩]/g,value=>String(value.charCodeAt(0)-0x660)).replace(/[۰-۹]/g,value=>String(value.charCodeAt(0)-0x6f0))
   .replace(/[^\p{L}\p{N}]+/gu,' ').trim().replace(/\s+/g,' ');
 }
 function buildSearchIndex(state){
  const index=[];
  for(const kind of ['companies','products','invoices'])for(const row of Array.isArray(state?.[kind])?state[kind]:[]){
   if(!row||row.id==null)continue;
   const title=string(kind==='invoices'?row.invNo||row.name:row.name||row.buyerName);
   const details=kind==='companies'?[row.buyerName,row.phone,row.email,row.city,row.country]:kind==='products'?[row.barcode,row.hsCode,row.color]:[row.companyName,row.buyerName,row.regDate||row.date];
   const fields=[title,row.id,...details,row.type].map(string),text=normalizeSearch(fields.join(' '));
   index.push(Object.freeze({kind,id:row.id,title,details:details.map(string).filter(Boolean),archived:kind==='invoices'&&!!row.archived,text,compact:text.replace(/ /g,'')}));
  }
  return Object.freeze(index);
 }
 function searchEntries(index,query,{kind='all',offset=0,size=30}={}){
  const normalized=normalizeSearch(query),tokens=normalized.split(' ').filter(Boolean),rows=[],counts={all:0,companies:0,products:0,invoices:0};
  const start=Math.max(0,Math.trunc(Number(offset)||0)),pageSize=Math.max(1,Math.min(50,Math.trunc(Number(size)||30)));
  let total=0;
  for(const entry of index){
   if(tokens.length&&!tokens.every(token=>entry.text.includes(token)||entry.compact.includes(token)))continue;
   counts.all++;counts[entry.kind]++;
   if(kind!=='all'&&entry.kind!==kind)continue;
   if(tokens.length&&total>=start&&rows.length<pageSize)rows.push(entry);
   total++;
  }
  return {rows,total,counts,query:normalized,offset:start,size:pageSize};
 }
 const helpers=Object.freeze({normalizeSearch,buildSearchIndex,searchEntries});
 if(typeof module==='object'&&module.exports){module.exports=helpers;return;}
 const ops=root.WFOperations;if(!ops||root.WFGlobalSearch)return;
 const locales=['ar','en','tr','fr','ru'];
 const copy={
  title:['البحث الشامل','Global search','Genel arama','Recherche globale','Общий поиск'],
  subtitle:['ابحث في العملاء والمنتجات والفواتير المحفوظة','Search saved clients, products and invoices','Kayıtlı müşteri, ürün ve faturaları arayın','Rechercher les clients, produits et factures enregistrés','Поиск сохранённых клиентов, товаров и счетов'],
  search:['بحث','Search','Ara','Rechercher','Поиск'],
  placeholder:['الاسم أو رقم الفاتورة أو الباركود أو الهاتف','Name, invoice number, barcode or phone','Ad, fatura numarası, barkod veya telefon','Nom, numéro de facture, code-barres ou téléphone','Имя, номер счёта, штрихкод или телефон'],
  all:['الكل','All','Tümü','Tout','Все'],companies:['العملاء','Clients','Müşteriler','Clients','Клиенты'],products:['المنتجات','Products','Ürünler','Produits','Товары'],invoices:['الفواتير','Invoices','Faturalar','Factures','Счета'],
  prompt:['اكتب كلمة أو رقمًا للبحث في السجلات المحفوظة.','Type a name or number to search your saved records.','Kayıtlı verilerde aramak için bir ad veya numara yazın.','Saisissez un nom ou un numéro pour chercher dans les données enregistrées.','Введите имя или номер для поиска в сохранённых записях.'],
  empty:['لا توجد نتائج مطابقة.','No matching records.','Eşleşen kayıt yok.','Aucun résultat correspondant.','Подходящих записей нет.'],
  count:['عرض {from}–{to} من {total}','Showing {from}–{to} of {total}','{total} kayıttan {from}–{to} gösteriliyor','{from}–{to} sur {total} affichés','Показано {from}–{to} из {total}'],
  previous:['السابق','Previous','Önceki','Précédent','Назад'],next:['التالي','Next','Sonraki','Suivant','Далее'],
  refresh:['تحديث السجلات','Refresh records','Kayıtları yenile','Actualiser les données','Обновить записи'],clear:['مسح البحث','Clear search','Aramayı temizle','Effacer la recherche','Очистить поиск'],
  editClient:['فتح بيانات العميل','Open client details','Müşteri bilgilerini aç','Ouvrir les coordonnées du client','Открыть данные клиента'],
  editProduct:['فتح بيانات المنتج','Open product details','Ürün bilgilerini aç','Ouvrir les données du produit','Открыть данные товара'],
  statement:['كشف الحساب','Account statement','Hesap ekstresi','Relevé de compte','Выписка по счёту'],
  card:['بطاقة المعرض','Showroom card','Mağaza etiketi','Fiche d’exposition','Карточка для выставки'],
  preview:['معاينة الفاتورة','Preview invoice','Faturayı önizle','Aperçu de la facture','Просмотр счёта'],
  labels:['إتيكيت الطرود','Package labels','Koli etiketleri','Étiquettes de colis','Этикетки упаковок'],
  archived:['مؤرشفة','Archived','Arşivlenmiş','Archivée','В архиве'],unnamed:['بدون اسم','Unnamed','Adsız','Sans nom','Без названия'],
  missing:['السجل لم يعد متاحًا. حُدّثت نتائج البحث.','This record is no longer available. Search results were refreshed.','Kayıt artık yok. Arama sonuçları yenilendi.','Cet enregistrement n’est plus disponible. Les résultats ont été actualisés.','Запись больше недоступна. Результаты обновлены.']
 };
 const text=(key,values={})=>copy[key][Math.max(0,locales.indexOf(ops.locale()))].replace(/\{(\w+)\}/g,(_,name)=>values[name]??'');
 const titles=key=>Object.fromEntries(locales.map((lang,i)=>[lang,copy[key][i]]));
 const make=ops.make,route='global-search',bound=[],filters=new Map();
 let shell,input,list,total,previous,next,filterBar,index=[],kind='all',offset=0,queued=false;
 const fixed=(tag,cls,key)=>{const node=make(tag,cls,text(key));bound.push([node,key]);return node;};
 const format=value=>new Intl.NumberFormat(ops.locale()||'en').format(value);
 const actions={editClient:()=>root.editCo,editProduct:()=>root.editPr,statement:()=>root.wfOpenStatement,preview:()=>root.previewSaved,card:()=>root.WFProductLabels?.open,labels:()=>root.WFPackageLabels?.open};
 function activate(entry,key){
  const current=(ops.state()[entry.kind]||[]).find(row=>row?.id!=null&&String(row.id)===String(entry.id)),handler=actions[key]?.();
  if(!current){ops.notify?.(text('missing'),'in');refresh();return;}
  if(typeof handler!=='function')return;
  root.WFTouchKeyboard?.close?.('navigation',false);
  handler(current.id);
 }
 function button(key,handler,persistent=false){const node=make('button','btn btn-s');node.type='button';node.append(persistent?fixed('span','',key):make('span','',text(key)));node.addEventListener('click',handler);return node;}
 function render(){
  queued=false;
  let result=searchEntries(index,input.value,{kind,offset});
  if(offset&&offset>=result.total){offset=0;result=searchEntries(index,input.value,{kind,offset});}
  for(const [key,{button:control,count}]of filters){control.setAttribute('aria-pressed',String(key===kind));count.textContent=format(result.counts[key]);control.setAttribute('aria-label',text(key)+': '+count.textContent);}
  list.replaceChildren();
  for(const entry of result.rows){
   const item=make('article','wf-ops-card wf-global-result');item.dataset.kind=entry.kind;
   const heading=make('div','wf-global-result-heading');heading.append(make('span','wf-global-kind',text(entry.kind)),make('h2','',entry.title||text('unnamed')));
   if(entry.archived)heading.append(make('span','wf-global-archived',text('archived')));
   item.append(heading);if(entry.details.length)item.append(make('p','wf-global-details',entry.details.slice(0,4).join(' · ')));
   const bar=make('div','wf-ops-row wf-global-actions');
   for(const key of entry.kind==='companies'?['editClient','statement']:entry.kind==='products'?['editProduct','card']:['preview','labels']){
    const action=button(key,()=>activate(entry,key));action.disabled=typeof actions[key]?.()!=='function';bar.append(action);
   }
   item.append(bar);list.append(item);
  }
  if(!result.rows.length)list.append(make('p','wf-ops-card wf-ops-empty',text(result.query?'empty':'prompt')));
  total.textContent=result.query?text('count',{from:format(result.rows.length?offset+1:0),to:format(offset+result.rows.length),total:format(result.total)}):'';
  previous.disabled=!result.query||offset===0;next.disabled=!result.query||offset+result.size>=result.total;
  total.hidden=!result.query;
 }
 function schedule(){if(!queued){queued=true;root.requestAnimationFrame(render);}}
 function refresh(){index=buildSearchIndex(ops.state());render();}
 function translate(){for(const [node,key]of bound)node.textContent=text(key);input.placeholder=text('placeholder');input.setAttribute('aria-label',text('placeholder'));filterBar.setAttribute('aria-label',text('search'));render();}
 shell=ops.register({id:route,parent:'dashboard',title:titles('title'),subtitle:titles('subtitle'),onEnter:refresh,onLanguage:translate});
 shell.actions.append(button('refresh',refresh,true));
 const search=make('section','wf-ops-card wf-global-search-box'),field=make('label','wf-global-search-field');
 input=make('input','fi');input.id='wfGlobalSearchInput';input.type='search';input.autocomplete='off';input.enterKeyHint='search';input.spellcheck=false;
 field.htmlFor=input.id;field.append(fixed('span','','search'),input);
 const clear=button('clear',()=>{input.value='';offset=0;render();input.focus({preventScroll:true});},true);search.append(field,clear);
 input.addEventListener('input',()=>{offset=0;schedule();});input.addEventListener('search',()=>{offset=0;schedule();});
 filterBar=make('div','wf-global-filters');filterBar.setAttribute('role','group');
 for(const key of ['all','companies','products','invoices']){const control=make('button','wf-global-filter');control.type='button';control.dataset.filter=key;const count=make('span','wf-global-count');control.append(fixed('span','',key),count);control.addEventListener('click',()=>{kind=key;offset=0;render();});filters.set(key,{button:control,count});filterBar.append(control);}
 total=make('p','wf-ops-muted wf-global-total');total.setAttribute('role','status');list=make('div','wf-global-results');list.id='wfGlobalSearchResults';
 const pager=make('nav','wf-global-pager');previous=button('previous',()=>{offset=Math.max(0,offset-30);render();},true);next=button('next',()=>{offset+=30;render();},true);pager.append(previous,next);
 shell.body.append(search,filterBar,total,list,pager);
 const registerKeyboard=()=>root.WFTouchKeyboard?.register?.(input.id,{action:'search',onSubmit:()=>{offset=0;render();}});
 registerKeyboard();root.document.addEventListener('DOMContentLoaded',registerKeyboard,{once:true});
 root.WFGlobalSearch=Object.freeze({open:()=>ops.open(route),refresh});
 translate();
})(typeof window==='object'?window:globalThis);
