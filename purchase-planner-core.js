/* Read-only recorded-invoice quantities and independent buyer-issued orders.
   Never edits sales invoices, inventory, customer data, or catalog prices. */
(function(root,factory){
  'use strict';
  const api=typeof module==='object'&&module.exports?factory(require('./account-statement-core.js'),require('./package-label-core.js')):factory(root.WOWStatementCore,root.WFPackageLabelCore);
  if(typeof module==='object'&&module.exports)module.exports=api;else root.WFPurchasePlannerCore=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(statement,labelCore){
  'use strict';
  const locales=Object.freeze(['ar','tr','en','fr','ru']),currencies=Object.freeze(['USD','TRY','EUR','SYP']);
  const own=(value,key)=>Object.prototype.hasOwnProperty.call(value||{},key);
  const record=value=>value&&typeof value==='object'&&!Array.isArray(value)?value:{};
  const text=value=>typeof value==='string'?value:typeof value==='number'&&Number.isFinite(value)?String(value):'';
  const digits=value=>text(value).replace(/[٠-٩۰-۹]/g,digit=>String('٠١٢٣٤٥٦٧٨٩'.includes(digit)?'٠١٢٣٤٥٦٧٨٩'.indexOf(digit):'۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)));
  const normalize=value=>digits(value).normalize('NFKD').replace(/\p{M}/gu,'').replace(/[أإآٱ]/g,'ا').toLowerCase().trim().replace(/\s+/g,' ');
  const identity=value=>text(value).normalize('NFKC').trim().toLocaleLowerCase('en-US').replace(/\s+/g,' ');
  function brandColor(value){const color=text(value).trim();return /^#[\da-f]{6}$/i.test(color)?color.toLowerCase():/^#[\da-f]{3}$/i.test(color)?'#'+color.slice(1).split('').map(part=>part+part).join('').toLowerCase():'#3f7c94';}
  const fail=code=>{const error=new Error(code);error.code=code;throw error;};
  const clone=value=>Array.isArray(value)?value.map(clone):value&&typeof value==='object'?Object.fromEntries(Object.entries(value).map(([key,entry])=>[key,clone(entry)])):value;
  function freeze(value){if(value&&typeof value==='object'){for(const child of Object.values(value))freeze(child);Object.freeze(value);}return value;}
  function quantity(value){if(!['number','string'].includes(typeof value)||!text(value).trim())return null;const number=Number(digits(value));return Number.isSafeInteger(number)&&number>0?number:null;}
  function optionalPrice(value){
    if(value===undefined||value===null||typeof value==='string'&&!value.trim())return null;
    if(!['number','string'].includes(typeof value))fail('INVALID_PRICE');
    const number=typeof value==='number'?value:Number(digits(value).replace('٫','.')),cents=Math.round(number*100);
    if(!Number.isFinite(number)||number<0||!Number.isSafeInteger(cents)||Math.abs(number*100-cents)>1e-6)fail('INVALID_PRICE');
    return cents;
  }
  function savedValue(sources,field){for(const source of sources)if(own(source,field)&&source[field]!==undefined)return source[field];return undefined;}
  function recordDate(invoice){
    for(const field of ['regDate','orderDate','createdAt','date']){
      const day=statement.day(invoice?.[field]);if(day)return{day,field};
    }return null;
  }
  const excluded=invoice=>Boolean(invoice.deleted||invoice.isDeleted||invoice.cancelled||invoice.canceled||invoice.voided||['draft','void','cancelled','canceled'].includes(text(invoice.status).toLowerCase()));
  function period(options={},today=statement.today()){
    today=statement.day(today);if(!today)fail('INVALID_DATE');
    const mode=options.mode||'year';let from,to;
    if(mode==='year'){
      const year=options.year===undefined?Number(today.slice(0,4)):Number(digits(options.year));
      if(!Number.isInteger(year)||year<1900||year>9999)fail('INVALID_YEAR');
      from=year+'-01-01';to=year+'-12-31';
    }else if(mode==='last90'){
      to=today;from=new Date(Date.parse(today+'T00:00:00Z')-89*86400000).toISOString().slice(0,10);
    }else if(mode==='custom'){
      from=statement.day(options.from);to=statement.day(options.to);if(!from||!to||from>to)fail('INVALID_PERIOD');
    }else fail('INVALID_PERIOD');
    if(from>today)fail('FUTURE_PERIOD');
    return freeze({mode,from,to,asOf:to<today?to:today});
  }
  function modelKey(productId,color,dimensions){return JSON.stringify([text(productId),identity(color),identity(dimensions)]);}
  function modelCode(value,fallback){const code=text(value).trim();return code&&code.length<=512&&!/[\u0000-\u001f\u007f]/.test(code)&&!/^(?:https?:|javascript:|data:|\{|\[)/i.test(code)?code:text(fallback);}
  function modelFields(source,snapshot={}){
    const sources=[record(source),record(snapshot)];
    return{name:text(savedValue(sources,'name')),color:text(savedValue(sources,'color')),dimensions:text(savedValue(sources,'dimensions')),
      image:labelCore.safeImageSource(savedValue(sources,'image')),type:text(savedValue(sources,'type'))};
  }
  function buildSales(state,options={}){
    if(!Array.isArray(state?.invoices)||!Array.isArray(state?.products))fail('DATA_UNAVAILABLE');
    const range=period(options,options.today||statement.today()),delivery=options.delivery==='delivered'?'delivered':'all';
    const products=new Map(),rows=new Map(),diagnostics=[],seen=new Map(),years=new Set([Number(range.asOf.slice(0,4))]);
    let invoiceCount=0,totalUnits=0,excludedCount=0;
    const warn=(code,invoice,index,extra={})=>diagnostics.push({code,invoiceId:text(invoice?.id),invoiceNumber:text(invoice?.invNo),lineIndex:index,...extra});
    for(const product of state.products){
      const id=text(product?.id);if(!id||!text(product?.name).trim()){warn('invalidProduct',null,undefined,{productId:id});continue;}
      if(products.has(id)){warn('duplicateProduct',null,undefined,{productId:id});continue;}
      products.set(id,product);
      const fields=modelFields(product),color=fields.color||'STANDARD',key=modelKey(id,color,fields.dimensions);
      rows.set(key,{key,productId:id,...fields,color,code:modelCode(product.barcode,product.name),catalogName:fields.name,inCatalog:true,catalogVariant:true,recordedUnits:0,invoiceCount:0,names:[],records:[],latestDay:''});
    }
    for(const [invoiceIndex,invoice] of state.invoices.entries()){
      if(!invoice||typeof invoice!=='object'||Array.isArray(invoice)){warn('invalidInvoice',null,undefined,{sourceIndex:invoiceIndex});continue;}
      const id=text(invoice.id),date=recordDate(invoice);
      if(!id){warn('missingInvoiceId',invoice);continue;}
      const signature=JSON.stringify([invoice.invNo,date?.day,invoice.delivered,invoice.grandTotal??invoice.grandTotalUSD,invoice.items,excluded(invoice)]);
      if(seen.has(id)){warn(seen.get(id)===signature?'duplicateInvoice':'duplicateConflict',invoice);continue;}
      seen.set(id,signature);
      if(excluded(invoice)){excludedCount++;continue;}
      if(date)years.add(Number(date.day.slice(0,4)));
      if(!date){warn('undatedInvoice',invoice);continue;}
      if(date.day<range.from||date.day>range.asOf)continue;
      if(delivery==='delivered'&&invoice.delivered!==true)continue;
      if(date.field!=='regDate')warn('dateFallback',invoice,undefined,{dateField:date.field});
      // A monetary credit does not establish which physical units were returned.
      // Do not invent negative quantities from a credit-note amount.
      const amount=invoice.grandTotal??invoice.grandTotalUSD;
      if(amount!==undefined&&amount!==null&&amount!==''&&Number(amount)<0){warn('creditQuantityUnknown',invoice);continue;}
      invoiceCount++;
      if(!Array.isArray(invoice.items)||!invoice.items.length){warn('emptyInvoice',invoice);continue;}
      const invoiceKeys=new Set();
      for(const [lineIndex,line] of invoice.items.entries()){
        if(!line||typeof line!=='object'||Array.isArray(line)){warn('invalidLine',invoice,lineIndex);continue;}
        const productId=text(line.productId??line.itemId),qty=quantity(line.qty??line.quantity),fields=modelFields(line,line.productSnapshot);
        if(!productId){warn('unlinkedProduct',invoice,lineIndex,{name:fields.name});continue;}
        if(qty===null){warn('invalidQuantity',invoice,lineIndex,{productId,name:fields.name});continue;}
        if(!fields.name.trim()){warn('missingProductName',invoice,lineIndex,{productId});continue;}
        if(!products.has(productId))warn('missingCatalogProduct',invoice,lineIndex,{productId,name:fields.name});
        if(!fields.color)warn('missingVariant',invoice,lineIndex,{productId,name:fields.name});
        const key=modelKey(productId,fields.color,fields.dimensions),product=products.get(productId);
        if(!rows.has(key))rows.set(key,{key,productId,...fields,code:modelCode(product?.barcode,fields.name),catalogName:text(product?.name),inCatalog:Boolean(product),catalogVariant:false,recordedUnits:0,invoiceCount:0,names:[],records:[],latestDay:''});
        const row=rows.get(key);
        if(!Number.isSafeInteger(row.recordedUnits+qty)||!Number.isSafeInteger(totalUnits+qty)){warn('quantityOverflow',invoice,lineIndex,{productId,name:fields.name});continue;}
        row.recordedUnits+=qty;totalUnits+=qty;
        if(!invoiceKeys.has(key)){row.invoiceCount++;invoiceKeys.add(key);}
        if(!row.names.includes(fields.name))row.names.push(fields.name);
        if(date.day>=row.latestDay){row.name=fields.name;row.latestDay=date.day;}
        row.records.push({invoiceId:id,invoiceNumber:text(invoice.invNo),date:date.day,dateField:date.field,lineIndex,quantity:qty,name:fields.name,color:fields.color,archived:Boolean(invoice.archived),delivered:invoice.delivered===true});
      }
    }
    return freeze({version:1,period:range,delivery,basis:'recorded-invoices',invoiceCount,totalUnits,excludedCount,
      years:[...years].sort((a,b)=>b-a),rows:[...rows.values()].sort((a,b)=>b.recordedUnits-a.recordedUnits||a.name.localeCompare(b.name)),diagnostics,
      complete:!diagnostics.some(issue=>!['duplicateInvoice','dateFallback','missingCatalogProduct'].includes(issue.code))});
  }
  function resolveProductScan(products,raw){
    const code=text(raw).trim();
    if(!code||code.length>512||/[\u0000-\u001f\u007f]/.test(code)||/^(?:https?:|javascript:|data:|\{|\[)/i.test(code))return{status:'unsupported',productId:null};
    // Both accepted formats are generated by existing product/package labels.
    // Invoice QR payloads, URLs and arbitrary structured content are not copied.
    const model=code.replace(/\s+-\s+Packet\s+\d+\/\d+$/i,'').trim(),match=identity(model);
    const found=(Array.isArray(products)?products:[]).filter(product=>text(product?.id)&&[product.barcode,product.name].some(value=>identity(value)===match));
    const ids=[...new Set(found.map(product=>text(product.id)))];
    return{status:ids.length===1?'found':ids.length?'ambiguous':'missing',productId:ids.length===1?ids[0]:null};
  }
  function orderTotals(lines){
    let totalQuantity=0,knownTotalCents=0,unknownPrices=0;
    for(const line of lines){
      const qty=quantity(line.quantity);if(qty===null)fail('INVALID_ORDER_QUANTITY');
      const price=optionalPrice(line.unitPrice),total=price===null?null:price*qty;
      if(!Number.isSafeInteger(totalQuantity+qty)||total!==null&&!Number.isSafeInteger(total)||total!==null&&!Number.isSafeInteger(knownTotalCents+total))fail('ORDER_TOO_LARGE');
      totalQuantity+=qty;if(total===null)unknownPrices++;else knownTotalCents+=total;
    }
    return{totalQuantity,knownTotalCents,unknownPrices,totalCents:unknownPrices?null:knownTotalCents};
  }
  function prepareOrder(source,options={}){
    const data=record(source),id=text(options.id||data.id),createdAt=text(options.createdAt||data.createdAt||new Date().toISOString());
    if(!id||!statement.day(createdAt))fail('INVALID_ORDER');
    if(!text(data.supplier?.name).trim())fail('SUPPLIER_REQUIRED');
    if(!currencies.includes(data.currency))fail('INVALID_CURRENCY');
    const locale=locales.includes(data.locale)?data.locale:'en';
    if(!Array.isArray(data.lines)||!data.lines.length)fail('ORDER_ITEMS_REQUIRED');
    if(data.lines.length>500)fail('ORDER_TOO_LARGE');
    const seen=new Set(),lines=data.lines.map((line,index)=>{
      const productId=text(line?.productId),name=text(line?.name).trim(),key=text(line?.key)||modelKey(productId,line?.color,line?.dimensions);
      if(!productId||!name||seen.has(key))fail('INVALID_ORDER_ITEM');seen.add(key);
      const qty=quantity(line.quantity);if(qty===null)fail('INVALID_ORDER_QUANTITY');
      const unitPriceCents=optionalPrice(line.unitPrice),unitPrice=unitPriceCents===null?null:unitPriceCents/100;
      // Explicit allowlist: no sales prices, customer identities, invoice refs,
      // history, cost snapshots or source QR payload can enter the order.
      return{position:index+1,key,productId,name,code:modelCode(line.code,name),color:text(line.color),dimensions:text(line.dimensions),image:labelCore.safeImageSource(line.image),
        quantity:qty,unitPrice,unitPriceCents,totalCents:unitPriceCents===null?null:unitPriceCents*qty};
    });
    const buyer=record(data.buyer),totals=orderTotals(lines);
    return freeze({version:1,id,orderNumber:text(data.orderNumber).trim()||'PO-'+createdAt.slice(0,10).replace(/-/g,'')+'-'+id.slice(-6).toUpperCase(),createdAt,locale,currency:data.currency,
      supplier:{name:text(data.supplier.name).trim(),contact:text(data.supplier.contact).trim()},
      buyer:{companyName:text(buyer.companyName),address:text(buyer.address),phone:text(buyer.phone),email:text(buyer.email),website:text(buyer.website),logo:labelCore.safeImageSource(buyer.logo),brandColor:brandColor(buyer.brandColor)},
      notes:text(data.notes).trim(),lines,totals});
  }
  function listOrders(settings){const value=settings?.procurementOrders;return value?.version===1&&Array.isArray(value.orders)?value.orders:[];}
  function prepareDraft(source){
    const data=record(source),buyer=record(data.buyer);
    if(data.version!==undefined&&data.version!==1||!text(data.id)||!statement.day(data.createdAt)||!Array.isArray(data.lines)||data.lines.length>500)fail('INVALID_ORDER');
    return{version:1,id:text(data.id),createdAt:text(data.createdAt),orderNumber:text(data.orderNumber),locale:locales.includes(data.locale)?data.locale:'en',currency:currencies.includes(data.currency)?data.currency:'USD',
      supplier:{name:text(data.supplier?.name),contact:text(data.supplier?.contact)},buyer:{companyName:text(buyer.companyName),address:text(buyer.address),phone:text(buyer.phone),email:text(buyer.email),website:text(buyer.website),logo:labelCore.safeImageSource(buyer.logo),brandColor:brandColor(buyer.brandColor)},notes:text(data.notes),
      period:{mode:text(data.period?.mode)||'year',year:text(data.period?.year),from:text(data.period?.from),to:text(data.period?.to)},delivery:data.delivery==='delivered'?'delivered':'all',
      lines:data.lines.map(line=>({key:text(line.key),productId:text(line.productId),name:text(line.name),code:modelCode(line.code,line.name),color:text(line.color),dimensions:text(line.dimensions),image:labelCore.safeImageSource(line.image),quantity:text(line.quantity),unitPrice:text(line.unitPrice)}))};
  }
  function validSection(section){if(section!==undefined&&section!==null&&(section.version!==1||!Array.isArray(section.orders)))fail('ORDER_HISTORY_INVALID');}
  function mergeOrder(latest,intent){
    const base=record(latest),section=base.procurementOrders;
    validSection(section);
    const rows=listOrders(base),ids=new Set();
    for(const row of rows){if(!text(row?.id)||ids.has(text(row.id))||row.version!==1||!Array.isArray(row.lines))fail('ORDER_HISTORY_INVALID');ids.add(text(row.id));}
    const order=clone(intent.order),existing=rows.find(row=>text(row.id)===text(order.id));
    if(existing){if(JSON.stringify(existing)===JSON.stringify(order))return base;fail('ORDER_ID_EXISTS');}
    return{...base,id:'main',procurementOrders:{...section,version:1,orders:[...rows,order]}};
  }
  function mergeDraft(latest,intent){
    const base=record(latest),section=base.procurementOrders;validSection(section);
    const revision=section?.draftRevision||0;
    if(revision!==intent.expectedRevision)fail('DRAFT_CHANGED');
    if(!Number.isSafeInteger(revision)||revision<0||revision===Number.MAX_SAFE_INTEGER)fail('ORDER_HISTORY_INVALID');
    return{...base,id:'main',procurementOrders:{...section,version:1,orders:listOrders(base),draft:clone(intent.draft),draftRevision:revision+1}};
  }
  function publishSection(state,section,before){
    const current=state.settings?.procurementOrders;
    const validRows=rows=>Array.isArray(rows)&&rows.every(row=>row&&row.version===1&&text(row.id)&&Array.isArray(row.lines));
    if(current!==before&&(!current||current.version!==1||!validRows(current.orders)))return current;
    if(current?.version===1&&validRows(current.orders)&&validRows(section.orders)){
      const orders=new Map([...(section.orders||[]),...(current.orders||[])].map(row=>[row.id,row]));
      section={...section,orders:[...orders.values()]};
      if((current.draftRevision||0)>(section.draftRevision||0)){section.draft=current.draft;section.draftRevision=current.draftRevision;}
    }
    // Receipt writes share this protected section with the planner. An older
    // draft/order can finish loading its images after a new receipt publishes.
    const revision=value=>value?.version===1&&Number.isSafeInteger(value.revision)&&value.revision>=0?value.revision:null;
    const visible=current?.followup,incoming=section.followup;
    const changed=visible!==before?.followup,visibleRevision=revision(visible),incomingRevision=revision(incoming);
    if(current&&changed&&(visibleRevision===null||incomingRevision===null||visibleRevision>=incomingRevision)){
      section={...section};
      if(Object.prototype.hasOwnProperty.call(current,'followup'))section.followup=visible;
      else delete section.followup;
    }
    state.settings={...(state.settings||{}),procurementOrders:section};return section;
  }
  async function persistDraft(draft,{state,writeBatch,hydrate,expectedRevision}){
    const before=state.settings?.procurementOrders;
    const prepared=prepareDraft(draft);
    const [stored]=await writeBatch([{store:'settings',type:'merge',id:'main',value:{draft:prepared,expectedRevision},merge:mergeDraft}]);
    const saved=hydrate?await hydrate(stored):stored;
    if(!saved?.procurementOrders?.draft||saved.procurementOrders.draftRevision!==expectedRevision+1)fail('ORDER_SAVE_FAILED');
    // The receipt belongs to this write, even when hydration finishes after a
    // newer writer has already published another draft into application state.
    const committed=Object.freeze({...saved.procurementOrders,draft:freeze(clone(saved.procurementOrders.draft))});
    publishSection(state,saved.procurementOrders,before);
    return committed;
  }
  async function persistOrder(order,{state,writeBatch,hydrate}){
    const before=state.settings?.procurementOrders;
    const [stored]=await writeBatch([{store:'settings',type:'merge',id:'main',value:{order},merge:mergeOrder}]);
    const saved=hydrate?await hydrate(stored):stored,section=saved?.procurementOrders;
    if(!section?.orders?.some(row=>row.id===order.id))fail('ORDER_SAVE_FAILED');
    // Publish only this owned section; settings saved concurrently remain intact.
    publishSection(state,section,before);
    return section.orders.find(row=>row.id===order.id);
  }
  const printWords={
    ar:{title:'طلب توريد مبدئي',issued:'طلب صادر عن المشتري · الأسعار المقترحة تحتاج موافقة المورد',number:'رقم الطلب',date:'التاريخ',buyer:'المشتري',supplier:'المورد',contact:'التواصل',model:'الموديل',code:'رمز الموديل',color:'اللون',dimensions:'الأبعاد',qty:'الكمية',price:'سعر الوحدة',amount:'المبلغ',currency:'العملة',notes:'ملاحظات الطلب',unspecified:'غير محدد',total:'مجموع البنود المسعّرة',completeTotal:'مجموع أسعار البنود',unknown:'بنود أسعارها غير محددة',terms:'الضرائب والشحن وشروط التوريد غير محسوبة؛ تحتاج اتفاقًا مع المورد.',signature:'اعتماد المورد / المشتري',units:'قطعة'},
    tr:{title:'PROFORMA SİPARİŞ',issued:'Alıcı tarafından düzenlenen talep · Önerilen fiyatlar tedarikçi onayı gerektirir',number:'Sipariş no.',date:'Tarih',buyer:'Alıcı',supplier:'Tedarikçi',contact:'İletişim',model:'Model',code:'Model kodu',color:'Renk',dimensions:'Ölçüler',qty:'Adet',price:'Birim fiyat',amount:'Tutar',currency:'Para birimi',notes:'Sipariş notları',unspecified:'Belirtilmedi',total:'Fiyatlı kalemler toplamı',completeTotal:'Kalem fiyatları toplamı',unknown:'Fiyatı belirtilmeyen kalem',terms:'Vergi, nakliye ve tedarik koşulları hesaplanmamıştır; tedarikçiyle mutabakat gerekir.',signature:'Tedarikçi / alıcı onayı',units:'adet'},
    en:{title:'PROFORMA ORDER',issued:'Buyer-issued request · Proposed prices require supplier approval',number:'Order no.',date:'Date',buyer:'Buyer',supplier:'Supplier',contact:'Contact',model:'Model',code:'Model code',color:'Color',dimensions:'Dimensions',qty:'Quantity',price:'Unit price',amount:'Amount',currency:'Currency',notes:'Order notes',unspecified:'Unspecified',total:'Priced items subtotal',completeTotal:'Items price total',unknown:'Items without a specified price',terms:'Tax, shipping and supply terms are not included; agreement with the supplier is required.',signature:'Supplier / buyer approval',units:'units'},
    fr:{title:'COMMANDE PRO FORMA',issued:'Demande émise par l’acheteur · Prix proposés soumis à l’accord du fournisseur',number:'N° de commande',date:'Date',buyer:'Acheteur',supplier:'Fournisseur',contact:'Contact',model:'Modèle',code:'Code modèle',color:'Couleur',dimensions:'Dimensions',qty:'Quantité',price:'Prix unitaire',amount:'Montant',currency:'Devise',notes:'Notes de commande',unspecified:'Non précisé',total:'Sous-total des articles chiffrés',completeTotal:'Total des prix des articles',unknown:'Articles sans prix précisé',terms:'Taxes, transport et conditions de fourniture non inclus ; accord du fournisseur requis.',signature:'Accord fournisseur / acheteur',units:'unités'},
    ru:{title:'ПРОФОРМА ЗАКАЗА',issued:'Заявка покупателя · Предложенные цены требуют согласия поставщика',number:'Номер заказа',date:'Дата',buyer:'Покупатель',supplier:'Поставщик',contact:'Контакт',model:'Модель',code:'Код модели',color:'Цвет',dimensions:'Размеры',qty:'Количество',price:'Цена за единицу',amount:'Сумма',currency:'Валюта',notes:'Примечания',unspecified:'Не указано',total:'Подытог позиций с ценой',completeTotal:'Сумма цен позиций',unknown:'Позиций без указанной цены',terms:'Налоги, доставка и условия поставки не включены; необходимо согласование с поставщиком.',signature:'Согласование поставщика / покупателя',units:'шт.'}
  };
  const escape=value=>text(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function renderDocument(order){
    if(order?.version!==1||!Array.isArray(order.lines))fail('INVALID_ORDER');
    const locale=locales.includes(order.locale)?order.locale:'en',L=printWords[locale],en=printWords.en,accent=brandColor(order.buyer?.brandColor);
    const tint='#'+accent.slice(1).match(/../g).map(value=>Math.round(parseInt(value,16)*.06+255*.94).toString(16).padStart(2,'0')).join('');
    const caption=key=>escape(L[key])+(locale==='en'?'':'<small lang="en" dir="ltr">'+escape(en[key])+'</small>');
    const money=cents=>cents===null?escape(L.unspecified):escape(new Intl.NumberFormat(locale,{minimumFractionDigits:2,maximumFractionDigits:2}).format(cents/100))+' '+escape(order.currency);
    const image=(source,alt,cls)=>{const safe=labelCore.safeImageSource(source);return safe?'<img class="'+cls+'" src="'+escape(safe)+'" alt="'+escape(alt)+'">':'';};
    // Render an explicit supplier-facing projection, never serialize the source
    // order or sales report into HTML, hidden inputs, QR codes or data attributes.
    return '<!doctype html><html lang="'+locale+'" dir="'+(locale==='ar'?'rtl':'ltr')+'"><head><meta charset="utf-8"><title>'+escape(L.title)+' · '+escape(order.orderNumber)+'</title><style>'+`
      @page{size:A4 portrait;margin:12mm}*{box-sizing:border-box}html,body{margin:0;padding:0;background:white;color:#202629;font:11px Arial,sans-serif}body{width:186mm;margin:auto}header{display:flex;align-items:center;justify-content:space-between;gap:12px;border-bottom:2px solid ${accent};padding:0 0 10px}.logo{width:42mm;max-height:23mm;object-fit:contain}.brand{font-size:19px;font-weight:700}h1{font-size:21px;margin:9px 0 3px;color:${accent}}h1 small{font-size:12px}p{margin:5px 0;line-height:1.5;overflow-wrap:anywhere}small{display:block;font-size:8px;font-weight:normal;color:#687079;line-height:1.4}.issued{font-size:10px;color:${accent}}.meta{display:flex;gap:18px;margin:12px 0}.parties{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin:12px 0 16px}.party{border:1px solid #dedede;border-radius:7px;padding:10px}h2{font-size:11px;margin:0 0 7px;color:${accent}}table{width:100%;border-collapse:collapse;table-layout:fixed}thead{display:table-header-group}th,td{border-bottom:1px solid #ddd;padding:7px 5px;text-align:start;vertical-align:top;overflow-wrap:anywhere}th{background:${tint};color:${accent};font-size:10px}tr{break-inside:avoid;page-break-inside:avoid}.photo{width:18mm;height:16mm;object-fit:contain;margin-bottom:3px}.model{font-weight:bold;font-size:12px}.detail{font-size:9px;color:#596168;line-height:1.6}.number{font-variant-numeric:tabular-nums;direction:ltr;unicode-bidi:isolate}.summary{margin:14px 0 8px;display:flex;gap:15px;justify-content:flex-end;break-inside:avoid}.summary p{border:1px solid #ddd;padding:9px;min-width:32mm}.notes{white-space:pre-wrap;padding:10px;background:#f7f7f7;border-radius:7px;break-inside:avoid}footer{font-size:9px;margin-top:15px;border-top:1px solid #ddd;padding-top:8px;break-inside:avoid}.signature{margin-top:18px;color:#687079}@media print{body{width:auto}img{break-inside:avoid}*{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
    `+'</style></head><body><header><div><div class="brand">'+escape(order.buyer?.companyName)+'</div><h1>'+caption('title')+'</h1></div>'+image(order.buyer?.logo,order.buyer?.companyName,'logo')+'</header><p class="issued">'+caption('issued')+'</p><div class="meta"><div>'+caption('number')+'<strong class="number">'+escape(order.orderNumber)+'</strong></div><div>'+caption('date')+'<strong class="number">'+escape(statement.day(order.createdAt))+'</strong></div><div>'+caption('currency')+'<strong>'+escape(order.currency)+'</strong></div></div><div class="parties"><section class="party"><h2>'+caption('buyer')+'</h2><strong>'+escape(order.buyer?.companyName)+'</strong>'+[order.buyer?.address,order.buyer?.phone,order.buyer?.email,order.buyer?.website].filter(Boolean).map(value=>'<p>'+escape(value)+'</p>').join('')+'</section><section class="party"><h2>'+caption('supplier')+'</h2><strong>'+escape(order.supplier?.name)+'</strong><p>'+escape(order.supplier?.contact)+'</p></section></div><table><colgroup><col style="width:6%"><col style="width:47%"><col style="width:11%"><col style="width:18%"><col style="width:18%"></colgroup><thead><tr><th>#</th><th>'+caption('model')+'</th><th>'+caption('qty')+'</th><th>'+caption('price')+'</th><th>'+caption('amount')+'</th></tr></thead><tbody>'+order.lines.map((line,index)=>'<tr><td class="number">'+(index+1)+'</td><td>'+image(line.image,line.name,'photo')+'<div class="model">'+escape(line.name)+'</div><div class="detail">'+escape(L.code)+': '+escape(line.code||line.name)+(line.color?'<br>'+escape(L.color)+': '+escape(line.color):'')+(line.dimensions?'<br>'+escape(L.dimensions)+': '+escape(line.dimensions):'')+'</div></td><td class="number">'+escape(line.quantity)+'</td><td class="number">'+money(line.unitPriceCents)+'</td><td class="number">'+money(line.totalCents)+'</td></tr>').join('')+'</tbody></table><div class="summary"><p>'+caption('qty')+'<strong class="number">'+escape(order.totals.totalQuantity)+'</strong> '+escape(L.units)+'</p><p>'+caption(order.totals.unknownPrices?'total':'completeTotal')+'<strong class="number">'+money(order.totals.unknownPrices===order.lines.length?null:order.totals.knownTotalCents)+'</strong>'+(order.totals.unknownPrices?'<small>'+escape(L.unknown)+': '+escape(order.totals.unknownPrices)+'</small>':'')+'</p></div>'+(order.notes?'<section class="notes"><h2>'+caption('notes')+'</h2>'+escape(order.notes)+'</section>':'')+'<footer><p>'+caption('terms')+'</p><p class="signature">'+caption('signature')+' ____________________</p></footer></body></html>';
  }
  function renderCSV(order){
    const L=printWords[order?.locale]||printWords.en;
    if(order?.version!==1||!Array.isArray(order.lines))fail('INVALID_ORDER');
    const amount=value=>value===null?L.unspecified:(value/100).toFixed(2);
    const rows=[[L.title],[L.number,order.orderNumber],[L.date,statement.day(order.createdAt)],[L.buyer,order.buyer?.companyName],
      [L.contact,[order.buyer?.address,order.buyer?.phone,order.buyer?.email,order.buyer?.website].filter(Boolean).join(' · ')],
      [L.supplier,order.supplier?.name],[L.contact,order.supplier?.contact],[L.currency,order.currency],[],
      ['#',L.model,L.code,L.color,L.dimensions,L.qty,L.price,L.amount],
      ...order.lines.map((line,index)=>[index+1,line.name,line.code,line.color,line.dimensions,line.quantity,amount(line.unitPriceCents),amount(line.totalCents)]),[],
      [L.qty,order.totals.totalQuantity],[order.totals.unknownPrices?L.total:L.completeTotal,amount(order.totals.unknownPrices===order.lines.length?null:order.totals.knownTotalCents)],
      ...(order.totals.unknownPrices?[[L.unknown,order.totals.unknownPrices]]:[]),[L.notes,order.notes],[L.issued],[L.terms]];
    const cell=value=>{let string=text(value);if(typeof value!=='number'&&/^[\s]*[=+\-@]/.test(string))string="'"+string;return '"'+string.replace(/"/g,'""')+'"';};
    return '\ufeff'+rows.map(row=>row.map(cell).join(',')).join('\r\n');
  }
  function orderActivity(order,state,today=statement.today()){
    const from=statement.day(order.createdAt);if(!from)fail('INVALID_DATE');
    const to=statement.day(today);if(!to)fail('INVALID_DATE');
    if(from>to)return freeze({from,to,complete:true,diagnostics:[],lines:order.lines.map(line=>({key:line.key,productId:line.productId,name:line.name,recordedUnits:0}))});
    const report=buildSales(state,{mode:'custom',from,to,today:to}),byKey=new Map(report.rows.map(row=>[row.key,row]));
    return freeze({from,to,complete:report.complete,diagnostics:report.diagnostics,lines:order.lines.map(line=>({key:line.key,productId:line.productId,name:line.name,recordedUnits:byKey.get(line.key)?.recordedUnits||0}))});
  }
  return Object.freeze({locales,currencies,normalize,quantity,optionalPrice,recordDate,period,modelKey,buildSales,resolveProductScan,orderTotals,prepareOrder,prepareDraft,listOrders,mergeOrder,mergeDraft,persistOrder,persistDraft,renderDocument,renderCSV,orderActivity,printWords});
});
