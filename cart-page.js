/* The cart is a normal application section. Existing cart actions own all writes. */
(function(root){
  'use strict';
  function cartSummary(items){
    const rows=(Array.isArray(items)?items:[]).map(item=>{
      const product=item.product||{},prices={A:product.priceA||product.priceUSD||0,B:product.priceB||0,C:product.priceC||0};
      const unit=prices[item.tier]||0;
      return {item,unit,total:unit*item.qty};
    });
    return {rows,quantity:rows.reduce((total,row)=>total+row.item.qty,0),total:rows.reduce((total,row)=>total+row.total,0)};
  }
  if(typeof module!=='undefined'&&module.exports)module.exports={cartSummary};
  if(typeof document==='undefined'||root.WFCartPage)return;
  const main=document.getElementById('mainContent'),group=document.querySelector('#wf-nav-main .wf-nav-group');
  const state=()=>typeof QBL_CART==='object'?QBL_CART:null;
  if(!main||!group||!state())return;
  const languages=['ar','en','tr','fr','ru'];
  const copy={
    title:['السلة','Cart','Sepet','Panier','Корзина'],
    subtitle:['راجع المنتجات والكميات قبل إنشاء الفاتورة.','Review products and quantities before creating an invoice.','Fatura oluşturmadan önce ürünleri ve adetleri kontrol edin.','Vérifiez les produits et les quantités avant de créer une facture.','Проверьте товары и количество перед созданием счёта.'],
    empty:['السلة فارغة','Your cart is empty','Sepetiniz boş','Votre panier est vide','Корзина пуста'],
    emptyHint:['تصفّح منتجاتك أو افتح الباركود لإضافة منتجات إلى السلة.','Browse your products or open the barcode reader to add products to the cart.','Ürünlerinize göz atın veya sepete ürün eklemek için barkod okuyucuyu açın.','Parcourez vos produits ou ouvrez le lecteur de codes-barres pour remplir le panier.','Откройте товары или сканер штрихкодов, чтобы добавить товары в корзину.'],
    restoring:['جارٍ استعادة السلة…','Restoring your cart…','Sepet geri yükleniyor…','Restauration du panier…','Восстановление корзины…'],
    products:['المنتجات','Products','Ürünler','Produits','Товары'],
    browse:['تصفّح المنتجات','Browse products','Ürünlere göz at','Parcourir les produits','Открыть товары'],
    scan:['إضافة بالباركود','Add by barcode','Barkodla ekle','Ajouter par code-barres','Добавить по штрихкоду'],
    summary:['ملخص السلة','Cart summary','Sepet özeti','Récapitulatif du panier','Итоги корзины'],
    lines:['أصناف المنتجات','Product lines','Ürün çeşitleri','Références','Позиций'],
    quantity:['الكمية','Quantity','Adet','Quantité','Количество'],
    total:['الإجمالي','Total','Toplam','Total','Итого'],
    unit:['للوحدة','per unit','birim başına','par unité','за единицу'],
    tier:['فئة السعر','Price tier','Fiyat grubu','Tarif','Тариф'],
    decrease:['تقليل الكمية','Decrease quantity','Adedi azalt','Réduire la quantité','Уменьшить количество'],
    increase:['زيادة الكمية','Increase quantity','Adedi artır','Augmenter la quantité','Увеличить количество'],
    remove:['إزالة المنتج','Remove product','Ürünü kaldır','Retirer le produit','Удалить товар'],
    clear:['مسح السلة','Clear cart','Sepeti temizle','Vider le panier','Очистить корзину'],
    invoice:['إنشاء الفاتورة','Create invoice','Fatura oluştur','Créer une facture','Создать счёт'],
    invoiceHint:['ينقل هذا الزر المنتجات إلى شاشة الفاتورة لتراجعها قبل الحفظ.','This moves the products to the invoice screen for review before saving.','Bu düğme ürünleri kaydetmeden önce inceleyebileceğiniz fatura ekranına taşır.','Les produits seront transférés vers la facture pour vérification avant l’enregistrement.','Товары будут перенесены в счёт для проверки перед сохранением.'],
    back:['رجوع','Back','Geri','Retour','Назад']
  };
  const locale=()=>languages.includes(document.documentElement.lang)?document.documentElement.lang:'ar';
  const word=key=>copy[key][languages.indexOf(locale())];
  const number=value=>new Intl.NumberFormat(locale()).format(value);
  const money=value=>new Intl.NumberFormat(locale(),{style:'currency',currency:'USD'}).format(value);
  const node=(tag,cls,text)=>{const el=document.createElement(tag);if(cls)el.className=cls;if(text!==undefined)el.textContent=text;return el;};
  const paths={cart:'<path d="M3 3h3l3 12h10l3-9H7M9 19h.01M19 19h.01"/>',product:'<path d="m3 7 9-4 9 4v10l-9 4-9-4Zm0 0 9 5 9-5M12 12v9M7 5l10 5"/>',trash:'<path d="M3 6h18M8 6V3h8v3M5 6l1 15h12l1-15M10 10v7m4-7v7"/>',invoice:'<path d="M6 3h9l4 4v14H5V3Zm8 0v5h5M8 12h8M8 16h6"/>',scan:'<path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5M7 7v10m4-10v10m3-10v10m3-10v10"/>'};
  function icon(name){const el=node('span','wf-cart-icon');el.setAttribute('aria-hidden','true');el.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">'+paths[name]+'</svg>';return el;}
  const labels=[];
  function textNode(tag,cls,key){const el=node(tag,cls);labels.push([el,key]);return el;}
  function button(cls,key,action,graphic){const el=node('button',cls);el.type='button';if(graphic)el.append(icon(graphic));el.append(textNode('span','',key));el.addEventListener('click',action);return el;}
  const page=node('section','page');page.id='page-cart';page.setAttribute('aria-labelledby','wfCartTitle');
  const header=node('header','sct-sticky-header'),back=button('sct-back-btn','back',()=>root.goBack());
  const heading=node('div','sct-sticky-title'),title=textNode('h1','','title');title.id='wfCartTitle';heading.append(title);
  header.append(back,heading);page.append(header);
  const intro=textNode('p','wf-cart-intro','subtitle');page.append(intro);
  const loading=textNode('p','wf-cart-loading','restoring');loading.setAttribute('role','status');loading.hidden=true;page.append(loading);
  const empty=node('section','wf-cart-empty');empty.id='wfCartEmpty';
  const emptyTitle=textNode('h2','','empty'),emptyHint=textNode('p','','emptyHint'),emptyActions=node('div','wf-cart-empty-actions');
  const emptyBrowse=button('btn btn-p','browse',()=>root.showPage('products'),'product');emptyBrowse.id='wfCartBrowse';
  emptyActions.append(emptyBrowse,button('btn','scan',()=>root.showPage('quick-barcode'),'scan'));empty.append(icon('cart'),emptyTitle,emptyHint,emptyActions);page.append(empty);
  const content=node('div','wf-cart-content');content.id='wfCartContent';
  const products=node('section','wf-cart-products'),productsHead=node('header','wf-cart-products-head'),productsTitle=textNode('h2','','products'),count=node('span','wf-cart-count');
  productsTitle.id='wfCartProductsTitle';products.setAttribute('aria-labelledby',productsTitle.id);productsHead.append(productsTitle,count);
  const list=node('div','wf-cart-items');list.id='wfCartItems';list.setAttribute('role','list');products.append(productsHead,list);
  const summary=node('aside','wf-cart-summary'),summaryTitle=textNode('h2','','summary');summaryTitle.id='wfCartSummaryTitle';summary.setAttribute('aria-labelledby',summaryTitle.id);
  const details=node('dl'),lineCount=node('dd'),quantity=node('dd'),total=node('dd','wf-cart-grand-total');
  for(const [key,value]of [['lines',lineCount],['quantity',quantity],['total',total]]){const row=node('div');row.append(textNode('dt','',key),value);details.append(row);}
  function transfer(){
    if(create.disabled)return;
    const selected=document.getElementById('invCoSel')?.value||'';
    root.qblSendToInvoice();
    // The existing flow initializes the invoice synchronously, then transfers
    // its products after 350 ms. Restore only the same still-valid customer
    // immediately after that initialization; no timer or new choice is needed.
    if(!selected||root.getCurrentPage?.()!=='create-invoice')return;
    const customer=document.getElementById('invCoSel');
    if(customer&&customer.value!==selected&&Array.from(customer.options).some(option=>option.value===selected&&!option.disabled)){
      customer.value=selected;root.onCoSelect?.();
    }
  }
  const create=button('btn btn-p wf-cart-create','invoice',transfer,'invoice');create.id='wfCartCreateInvoice';
  const clear=button('btn wf-cart-clear','clear',()=>{if(!clear.disabled)root.qblClearCartConfirm();},'trash');clear.id='wfCartClear';
  summary.append(summaryTitle,details,create,textNode('p','wf-cart-invoice-hint','invoiceHint'),button('btn wf-cart-add','scan',()=>root.showPage('quick-barcode'),'scan'),clear);
  content.append(products,summary);page.append(content);main.append(page);
  const destination=node('button','nav-item');destination.type='button';destination.id='wfCartNav';destination.dataset.page='cart';
  const navIcon=icon('cart');navIcon.classList.add('nav-icon');const navLabel=textNode('span','','title'),badge=node('span','nav-badge');badge.id='wfCartNavCount';destination.append(navIcon,navLabel,badge);destination.onclick=()=>root.qblOpenCart();group.append(destination);
  // The dashboard shortcut shares the wordmark's existing slot. The reading
  // player already hides that slot when it needs the toolbar's full width.
  const wordmark=document.querySelector('.navbar .wf-nav-wordmark'),headerLink=node('button','wf-cart-header-link'),headerCount=node('span');
  headerLink.id='wfCartHeaderButton';headerLink.type='button';headerLink.hidden=true;headerLink.append(icon('cart'),headerCount);headerLink.addEventListener('click',()=>root.qblOpenCart());wordmark?.append(headerLink);
  const rows=new Map();let lastState='',restoring=false;
  try{restoring=!state().items.length&&JSON.parse(root.localStorage.getItem('wf_qbl_cart')||'[]')?.length>0;}catch(_){/* Existing restoration owns invalid stored data. */}
  function closeLegacy(){
    state().open=false;
    for(const id of ['qblCartOverlay','qblCartBar'])document.getElementById(id)?.classList.remove('open');
    document.getElementById('qblStickyCart')?.classList.remove('visible');main.classList.remove('cart-bar-visible');
  }
  function rowFor(item){
    if(rows.has(item))return rows.get(item);
    const el=node('article','wf-cart-item');el.setAttribute('role','listitem');
    const imageBox=node('div','wf-cart-image'),fallback=icon('product'),image=node('img');image.loading='lazy';image.alt='';imageBox.append(fallback,image);
    image.addEventListener('error',()=>{image.hidden=true;fallback.hidden=false;});
    const info=node('div','wf-cart-item-info'),name=node('h3'),meta=node('div','wf-cart-item-meta'),tier=node('span','wf-cart-tier'),unit=node('span'),dimensions=node('span','wf-cart-dimensions');meta.append(tier,unit);info.append(name,meta,dimensions);
    const controls=node('div','wf-cart-quantity');controls.setAttribute('role','group');const minus=node('button','','−'),amount=node('output'),plus=node('button','','+');minus.type=plus.type='button';controls.append(minus,amount,plus);
    const price=node('strong','wf-cart-item-total'),remove=node('button','wf-cart-remove');remove.type='button';remove.append(icon('trash'));
    const change=delta=>{const index=state().items.indexOf(item);if(index>=0)root.qblCartChangeQty(index,delta);};
    minus.addEventListener('click',()=>{if(!minus.disabled)change(-1);});plus.addEventListener('click',()=>change(1));
    remove.addEventListener('click',()=>{
      const index=state().items.indexOf(item),focused=document.activeElement===remove;if(index<0)return;
      root.qblCartRemoveItem(index);
      if(focused){const next=state().items[Math.min(index,state().items.length-1)];(rows.get(next)?.remove||emptyBrowse).focus();}
    });
    el.append(imageBox,info,controls,price,remove);
    const entry={el,image,fallback,name,tier,unit,dimensions,controls,minus,amount,plus,price,remove};rows.set(item,entry);return entry;
  }
  function render(){
    const cart=state();if(!cart)return;
    closeLegacy();const data=cartSummary(cart.items),hasItems=data.rows.length>0,pending=restoring&&!hasItems;
    page.lang=locale();page.dir=locale()==='ar'?'rtl':'ltr';
    for(const [el,key]of labels){const text=word(key);if(el.textContent!==text)el.textContent=text;}
    loading.hidden=!pending;empty.hidden=hasItems||pending;content.hidden=!hasItems;intro.hidden=!hasItems;
    page.dataset.cartState=pending?'restoring':hasItems?'filled':'empty';
    create.disabled=clear.disabled=!hasItems;badge.textContent=number(data.quantity);count.textContent=number(data.rows.length);
    lineCount.textContent=number(data.rows.length);quantity.textContent=number(data.quantity);total.textContent=money(data.total);
    headerLink.hidden=!hasItems;headerCount.textContent=number(data.quantity);headerLink.title=word('title')+' · '+number(data.quantity);headerLink.setAttribute('aria-label',headerLink.title);headerLink.setAttribute('aria-controls',page.id);
    if(wordmark)wordmark.dataset.cart=String(hasItems);
    for(const [item,row]of rows)if(!cart.items.includes(item)){row.el.remove();rows.delete(item);}
    data.rows.forEach(({item,unit:unitPrice,total:rowTotal},index)=>{
      const row=rowFor(item),product=item.product||{};
      row.name.textContent=product.name||'';row.tier.textContent=word('tier')+' '+item.tier;row.unit.textContent=money(unitPrice)+' / '+word('unit');
      row.dimensions.textContent=product.dimensions||'';row.dimensions.hidden=!product.dimensions;
      const src=typeof product.image==='string'?product.image:'';
      if(row.image.getAttribute('src')!==src){if(src)row.image.setAttribute('src',src);else row.image.removeAttribute('src');row.image.hidden=!src;row.fallback.hidden=!!src;}
      row.amount.textContent=number(item.qty);row.price.textContent=money(rowTotal);row.minus.disabled=item.qty<=1;
      for(const [button,key]of [[row.minus,'decrease'],[row.plus,'increase'],[row.remove,'remove']]){button.title=word(key)+' · '+(product.name||'');button.setAttribute('aria-label',button.title);}
      row.controls.setAttribute('aria-label',word('quantity')+' · '+(product.name||''));
      if(list.children[index]!==row.el)list.insertBefore(row.el,list.children[index]||null);
    });
    const signature=[locale(),pending,data.rows.length,data.quantity,data.total].join('|');
    if(signature!==lastState){lastState=signature;root.dispatchEvent(new CustomEvent('wf-cart-state',{detail:{count:data.quantity,lines:data.rows.length,empty:!hasItems}}));}
  }
  const oldUpdate=root.qblUpdateCartUI;
  root.qblUpdateCartUI=function(...args){const value=oldUpdate?.apply(this,args);render();return value;};
  root.qblRenderCartList=render;
  root.qblCloseCart=closeLegacy;
  root.qblOpenCart=root.qblToggleCart=function(){closeLegacy();root.showPage('cart');render();};
  const oldLoad=root.qblCartLoad;
  if(typeof oldLoad==='function')root.qblCartLoad=function(...args){try{return oldLoad.apply(this,args);}finally{restoring=false;render();}};
  document.documentElement.classList.add('wf-cart-page-enabled');
  new MutationObserver(render).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
  root.WFCartPage=Object.freeze({render,open:root.qblOpenCart});render();
})(typeof window==='undefined'?globalThis:window);
