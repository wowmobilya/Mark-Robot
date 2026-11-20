/* Product sections share the existing settings backup and product type IDs.
   Product writes, invoice snapshots and camera actions remain with their owners. */
(() => {
  'use strict';
  const locales=['ar','en','tr','fr','ru'];
  const own=(object,key)=>Object.prototype.hasOwnProperty.call(object||{},key);
  const maxImageLength=720000;
  const defaults=[
    {id:'coffee_table',labels:{ar:'طاولة قهوة',en:'Coffee Table',tr:'Orta Sehpa',fr:'Table basse',ru:'Журнальный столик'}},
    {id:'dresser',labels:{ar:'مدخل',en:'Dresser',tr:'DRESUAR',fr:'Commode',ru:'Комод'}},
    {id:'side_table',labels:{ar:'طاولة جانبية',en:'Side Table',tr:'Yan Sehpa',fr:'Table d’appoint',ru:'Приставной столик'}},
    {id:'tv_table',labels:{ar:'طاولة تلفاز',en:'TV Table',tr:'TV Ünitesi',fr:'Meuble TV',ru:'Тумба под телевизор'}}
  ];
  const temporaryImages={
    coffee_table:{url:'https://image-ikea.mncdn.com/urunler/500_500/PE746803.jpg',author:'IKEA',site:'IKEA Türkiye',product:'LACK 90×55 cm',source:'https://www.ikea.com.tr/p90449905'},
    side_table:{url:'https://image-ikea.mncdn.com/urunler/500_500/PE724345.jpg',author:'IKEA',site:'IKEA Türkiye',product:'LACK 55×55 cm',source:'https://www.ikea.com.tr/urun/lack-beyaz-55x55-cm-yan-sehpa-30449908'},
    dresser:{url:'https://image-ikea.mncdn.com/urunler/500_500/PE554244.jpg',author:'IKEA',site:'IKEA Türkiye',product:'LACK 140×39 cm',source:'https://www.ikea.com.tr/p10257448'},
    tv_table:{url:'https://image-ikea.mncdn.com/urunler/500_500/PE803708.jpg',author:'IKEA',site:'IKEA Türkiye',product:'LACK 160×35×36 cm',source:'https://www.ikea.com.tr/urun/lack-beyaz-160x35x36-cm-tv-sehpasi-30498927'}
  };
  const validId=id=>typeof id==='string'&&/^[a-zA-Z0-9][a-zA-Z0-9_.:-]{0,79}$/.test(id)&&!['constructor','prototype','__proto__'].includes(id);
  const cleanText=(value,max)=>typeof value==='string'?value.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g,'').trim().slice(0,max):'';
  function cleanImage(value){
    if(value==null||value==='')return '';
    if(typeof value!=='string')return null;
    const source=value.trim();
    if(/^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/]+=*$/.test(source))return source.length<=maxImageLength?source:null;
    if(/^(?:\.\/)?assets\/[a-zA-Z0-9_/-]+\.(?:png|jpe?g|webp)$/.test(source))return source;
    if(source.length>2048)return null;
    try{const url=new URL(source);return url.protocol==='https:'&&!url.username&&!url.password?url.href:null;}catch(_){return null;}
  }
  function languageMap(value,max){
    const result={};for(const lang of locales){const text=cleanText(value?.[lang],max);if(text)result[lang]=text;}return result;
  }
  function records(settings){
    const payload=settings?.productCategories;
    if(payload?.version!==1||!Array.isArray(payload.categories))return [];
    const seen=new Set();
    return payload.categories.slice(0,100).flatMap(raw=>{
      if(!raw||!validId(raw.id)||seen.has(raw.id))return [];seen.add(raw.id);
      const record={id:raw.id,name:cleanText(raw.name,80),labels:languageMap(raw.labels,80),descriptions:languageMap(raw.descriptions,240),archived:raw.archived===true};
      if(own(raw,'image'))record.image=cleanImage(raw.image)||'';
      return [record];
    });
  }
  const label=(category,lang='en')=>category?.labels?.[lang]||category?.name||category?.labels?.en||category?.id||'';
  function all(settings,products=[],invoices=[],images={}){
    const map=new Map(defaults.map(base=>[base.id,{...base,labels:{...base.labels},name:base.labels.en,descriptions:{},image:cleanImage(images[base.id])||'',archived:false,builtin:true,count:0,references:0}]));
    for(const record of records(settings)){
      const base=map.get(record.id)||{id:record.id,labels:{},descriptions:{},image:'',builtin:false,count:0,references:0};
      map.set(record.id,{...base,...record,labels:{...base.labels,...record.labels},descriptions:{...base.descriptions,...record.descriptions}});
    }
    const register=type=>{
      const id=type||'other';if(!validId(id))return null;
      if(!map.has(id))map.set(id,{id,name:id==='other'?'Other':id,labels:id==='other'?{ar:'أخرى',en:'Other',tr:'Diğer',fr:'Autre',ru:'Другое'}:{},descriptions:{},image:'',archived:false,builtin:false,recovered:true,count:0,references:0});
      return map.get(id);
    };
    for(const product of products||[]){const category=register(product?.type);if(category)category.count++;}
    for(const invoice of invoices||[])for(const item of invoice?.items||[]){const category=register(item?.type||item?.productSnapshot?.type);if(category)category.references++;}
    return [...map.values()];
  }
  function validateFile(file){
    if(!file||!['image/jpeg','image/png','image/webp'].includes(file.type))throw new Error('imageType');
    if(!file.size||file.size>5*1024*1024)throw new Error('imageSize');
  }
  function createManager({getState,read,write,images={},idFactory=()=>globalThis.crypto?.randomUUID?.()||Date.now().toString(36)+'_'+Math.random().toString(36).slice(2)}){
    let pending=false;
    const list=()=>{const state=getState();return all(state.settings,state.products,state.invoices,images);};
    async function commit(change){
      if(pending)throw new Error('busy');pending=true;
      try{
        const state=getState(),stored=await read();
        const base={...state.settings,...(stored||{})};
        const categories=change(base,all(base,state.products,state.invoices,images));
        const payload={version:1,categories};
        await write({...base,id:'main',productCategories:payload});
        // Publish only after IndexedDB confirms the complete transaction.
        state.settings.productCategories=payload;
        return payload;
      }finally{pending=false;}
    }
    const rowFrom=category=>({id:category.id,name:category.name,labels:{...category.labels},descriptions:{...category.descriptions},image:category.image||'',archived:!!category.archived});
    return {
      list,
      get busy(){return pending;},
      async save(input,lang='en'){
        if(!locales.includes(lang))lang='en';
        let savedId;
        await commit((base,categories)=>{
          const existing=input.id?categories.find(category=>category.id===input.id):null;
          if(input.id&&!existing)throw new Error('missing');
          const name=typeof input.labels?.[lang]==='string'?input.labels[lang].trim():'';
          if(!name||name.length>80)throw new Error('nameRequired');
          for(const value of Object.values(input.labels||{}))if(typeof value!=='string'||value.length>80)throw new Error('nameRequired');
          for(const value of Object.values(input.descriptions||{}))if(typeof value!=='string'||value.length>240)throw new Error('descriptionLong');
          if(categories.some(category=>category.id!==existing?.id&&label(category,lang).normalize('NFKC').toLocaleLowerCase()===name.normalize('NFKC').toLocaleLowerCase()))throw new Error('duplicate');
          const image=cleanImage(input.image);if(image===null)throw new Error('imageURL');
          savedId=existing?.id||'wfcat_'+idFactory().replace(/[^a-zA-Z0-9_-]/g,'');
          if(!validId(savedId)||(!existing&&categories.some(category=>category.id===savedId)))throw new Error('invalid');
          const labels={...existing?.labels},descriptions={...existing?.descriptions};
          for(const locale of locales){
            if(own(input.labels,locale)){const value=cleanText(input.labels[locale],80);if(value)labels[locale]=value;else delete labels[locale];}
            if(own(input.descriptions,locale)){const value=cleanText(input.descriptions[locale],240);if(value)descriptions[locale]=value;else delete descriptions[locale];}
          }
          const next=records(base),record={id:savedId,name:cleanText(name,80),labels,descriptions,image,archived:existing?.archived===true};
          const index=next.findIndex(category=>category.id===savedId);
          if(index<0){if(next.length>=100)throw new Error('limit');next.push(record);}else next[index]=record;
          return next;
        });
        return savedId;
      },
      async archive(id,archived){
        return commit((base,categories)=>{
          const category=categories.find(item=>item.id===id);if(!category)throw new Error('missing');
          const next=records(base),record={...rowFrom(category),archived:!!archived};
          const index=next.findIndex(item=>item.id===id);
          if(index<0){if(next.length>=100)throw new Error('limit');next.push(record);}else next[index]=record;
          return next;
        });
      }
    };
  }
  const core={defaults,temporaryImages,validId,cleanImage,records,label,all,validateFile,createManager};
  if(typeof module==='object'&&module.exports)module.exports=core;
  if(typeof document==='undefined')return;
  if(window.WFProductCategories)return;
  const state=()=>typeof S==='object'?S:{settings:{},products:[],invoices:[],lang:'en'};
  const root=document.documentElement;
  const currentLanguage=()=>locales.includes(state().lang)?state().lang:'en';
  const copy={
    title:['أقسام المنتجات','Product categories','Ürün kategorileri','Catégories de produits','Категории товаров'],
    hint:['أضف الأقسام وصورها. الأرشفة تخفي القسم من الإضافة وتُبقي منتجاته وفواتيره.','Add categories and their images. Archiving hides a category from new products and keeps its products and invoices.','Kategoriler ve görseller ekleyin. Arşivleme yeni ürünlerden gizler; mevcut ürün ve faturalar korunur.','Ajoutez des catégories et leurs images. L’archivage masque les nouveaux ajouts et conserve les produits et factures.','Добавляйте категории и изображения. Архив скрывает категорию при добавлении, сохраняя товары и счета.'],
    add:['إضافة قسم','Add category','Kategori ekle','Ajouter une catégorie','Добавить категорию'],
    edit:['تعديل','Edit','Düzenle','Modifier','Изменить'],
    editTitle:['تعديل القسم','Edit category','Kategoriyi düzenle','Modifier la catégorie','Изменить категорию'],
    name:['اسم القسم','Category name','Kategori adı','Nom de catégorie','Название категории'],
    language:['لغة الاسم والوصف','Name and description language','Ad ve açıklama dili','Langue du nom et de la description','Язык названия и описания'],
    description:['الوصف (اختياري)','Description (optional)','Açıklama (isteğe bağlı)','Description (facultative)','Описание (необязательно)'],
    photo:['صورة القسم','Category image','Kategori görseli','Image de catégorie','Изображение категории'],
    upload:['اختيار صورة','Choose image','Görsel seç','Choisir une image','Выбрать изображение'],
    imageHint:['JPG أو PNG أو WebP، حتى 5 ميغابايت. تُحفظ نسخة مصغّرة مع النسخة الاحتياطية.','JPG, PNG or WebP, up to 5 MB. An optimized copy is included in backups.','JPG, PNG veya WebP, en çok 5 MB. Küçültülmüş kopya yedeğe eklenir.','JPG, PNG ou WebP, 5 Mo maximum. Une copie optimisée est incluse dans les sauvegardes.','JPG, PNG или WebP, до 5 МБ. Уменьшенная копия включается в резервные копии.'],
    imageURLLabel:['رابط صورة HTTPS (اختياري)','HTTPS image URL (optional)','HTTPS görsel bağlantısı (isteğe bağlı)','URL HTTPS de l’image (facultative)','HTTPS-ссылка на изображение (необязательно)'],
    removeImage:['إزالة الصورة','Remove image','Görseli kaldır','Retirer l’image','Убрать изображение'],
    save:['حفظ القسم','Save category','Kategoriyi kaydet','Enregistrer la catégorie','Сохранить категорию'],
    cancel:['إلغاء التعديل','Cancel editing','Düzenlemeyi iptal et','Annuler la modification','Отменить изменения'],
    archive:['أرشفة','Archive','Arşivle','Archiver','В архив'],
    restore:['إعادة التفعيل','Reactivate','Etkinleştir','Réactiver','Восстановить'],
    archived:['مؤرشف','Archived','Arşivlendi','Archivée','В архиве'],
    products:['منتج','products','ürün','produits','товаров'],
    all:['الكل','All','Tümü','Tous','Все'],
    select:['اختيار','Select','Seç','Choisir','Выбрать'],
    selected:['القسم المختار','Selected category','Seçilen kategori','Catégorie sélectionnée','Выбранная категория'],
    change:['تغيير القسم','Change category','Kategoriyi değiştir','Changer de catégorie','Сменить категорию'],
    productDetails:['املأ بيانات المنتج','Fill in product details','Ürün bilgilerini doldurun','Renseignez les détails du produit','Заполните данные товара'],
    choose:['اختر قسم المنتج للمتابعة','Choose a product category to continue','Devam etmek için ürün kategorisini seçin','Choisissez une catégorie pour continuer','Выберите категорию товара'],
    noActive:['لا توجد أقسام مفعّلة. أضف قسمًا أو أعد تفعيله من الإعدادات.','No active categories. Add or reactivate one in Settings.','Etkin kategori yok. Ayarlardan ekleyin veya etkinleştirin.','Aucune catégorie active. Ajoutez-en une ou réactivez-la dans les réglages.','Нет активных категорий. Добавьте или восстановите их в настройках.'],
    saved:['تم حفظ القسم.','Category saved.','Kategori kaydedildi.','Catégorie enregistrée.','Категория сохранена.'],
    archiveSaved:['تم تحديث حالة القسم، مع الاحتفاظ بالمنتجات والفواتير.','Category status updated; products and invoices are preserved.','Kategori durumu güncellendi; ürün ve faturalar korundu.','État mis à jour ; produits et factures conservés.','Статус обновлён; товары и счета сохранены.'],
    saving:['جارٍ الحفظ…','Saving…','Kaydediliyor…','Enregistrement…','Сохранение…'],
    imageLoading:['جارٍ تجهيز الصورة…','Preparing image…','Görsel hazırlanıyor…','Préparation de l’image…','Подготовка изображения…'],
    imageSources:['مصادر صور الأقسام','Category image sources','Kategori görsel kaynakları','Sources des images de catégories','Источники изображений категорий'],
    nameRequired:['اكتب اسمًا للقسم من 1 إلى 80 حرفًا.','Enter a category name between 1 and 80 characters.','1–80 karakterlik kategori adı girin.','Saisissez un nom de 1 à 80 caractères.','Введите название длиной от 1 до 80 символов.'],
    descriptionLong:['الوصف يجب ألا يتجاوز 240 حرفًا.','Description must be at most 240 characters.','Açıklama en fazla 240 karakter olabilir.','La description est limitée à 240 caractères.','Описание должно содержать не более 240 символов.'],
    duplicate:['يوجد قسم بهذا الاسم. اختر اسمًا آخر.','A category already uses this name. Choose another name.','Bu adla bir kategori var. Başka bir ad seçin.','Ce nom existe déjà. Choisissez un autre nom.','Категория с таким названием уже существует.'],
    imageType:['اختر صورة JPG أو PNG أو WebP.','Choose a JPG, PNG or WebP image.','JPG, PNG veya WebP seçin.','Choisissez une image JPG, PNG ou WebP.','Выберите изображение JPG, PNG или WebP.'],
    imageSize:['حجم الصورة الأقصى 5 ميغابايت.','Maximum image size is 5 MB.','En büyük görsel boyutu 5 MB.','Taille maximale : 5 Mo.','Максимальный размер изображения — 5 МБ.'],
    imageURL:['استخدم رابط صورة HTTPS صالحًا.','Use a valid HTTPS image URL.','Geçerli bir HTTPS görsel bağlantısı kullanın.','Utilisez une URL HTTPS valide.','Используйте действительную HTTPS-ссылку.'],
    imageInvalid:['تعذّر قراءة الصورة. اختر صورة أخرى.','Could not read the image. Choose another one.','Görsel okunamadı. Başka bir görsel seçin.','Image illisible. Choisissez-en une autre.','Не удалось прочитать изображение. Выберите другое.'],
    limit:['الحد الأقصى 100 قسم محفوظ.','Up to 100 categories can be stored.','En fazla 100 kategori saklanabilir.','Vous pouvez enregistrer 100 catégories.','Можно сохранить до 100 категорий.'],
    failed:['تعذّر الحفظ. بقيت البيانات السابقة كما هي؛ حاول مجددًا.','Could not save. Previous data is preserved; try again.','Kaydedilemedi. Önceki veriler korundu; tekrar deneyin.','Enregistrement impossible. Les données précédentes sont conservées ; réessayez.','Не удалось сохранить. Прежние данные сохранены; повторите попытку.']
  };
  const t=key=>copy[key]?.[locales.indexOf(currentLanguage())]||copy[key]?.[1]||key;
  const initialImages={};
  for(const item of defaults){
    const source=own(window.WF_CATEGORY_IMAGES,item.id)?window.WF_CATEGORY_IMAGES[item.id]:temporaryImages[item.id].url;
    initialImages[item.id]=cleanImage(source)||'';
  }
  const manager=createManager({getState:state,read:()=>dbGet('settings','main'),write:value=>dbPut('settings',value),images:initialImages});
  const create=(tag,className,text)=>{const el=document.createElement(tag);if(className)el.className=className;if(text!=null)el.textContent=text;return el;};
  const text=(tag,key,className)=>{const el=create(tag,className,t(key));el.dataset.wfCategoryText=key;return el;};
  const button=(key,handler,className='')=>{const el=text('button',key,className);el.type='button';el.addEventListener('click',handler);return el;};
  function photo(category,className='wf-category-photo'){
    const wrap=create('span',className);wrap.setAttribute('aria-hidden','true');
    const fallback=create('span','wf-category-placeholder','▦');
    // Keep the app's SVG icon inside its own shell so icon refreshes cannot
    // replace a loaded photograph, and a failed image reveals the same icon.
    fallback.dataset.wfProductType=defaults.some(item=>item.id===category?.id)?category.id:'other';wrap.append(fallback);
    const source=cleanImage(category?.image);
    if(source){const img=create('img');img.src=source;img.alt='';img.loading='lazy';img.decoding='async';if(Object.values(temporaryImages).some(reference=>reference.url===source))img.style.objectFit='contain';img.addEventListener('error',()=>img.remove(),{once:true});wrap.append(img);}
    window.wfRefreshIcons?.();return wrap;
  }
  const usedCategories=()=>manager.list().filter(category=>!category.archived||category.count>0||category.id===state().prTabFilter);
  function renderChooser(){
    const host=document.getElementById('prTypeStepCards');if(!host)return;
    const grid=create('div','wf-category-chooser'),items=manager.list().filter(category=>!category.archived);
    for(const category of items){
      const tile=create('button','wf-category-choice');tile.type='button';tile.dataset.categoryId=category.id;
      tile.append(photo(category),create('strong','',label(category,currentLanguage())));
      const description=category.descriptions[currentLanguage()]||category.descriptions.en||'';
      if(description)tile.append(create('small','wf-category-description',description));
      tile.append(create('small','wf-category-count',category.count+' '+t('products')),create('span','wf-category-select',t('select')));
      tile.addEventListener('click',event=>window.selectPrTypeAndContinue(category.id,event));grid.append(tile);
    }
    if(!items.length)grid.append(create('p','wf-category-empty',t('noActive')));
    host.replaceChildren(grid);
    const title=document.getElementById('apt-title');
    if(title&&typeof APT_TEXTS==='object')title.textContent=(APT_TEXTS[currentLanguage()]||APT_TEXTS.en).title;
    const subtitle=document.getElementById('apt-subtitle');if(subtitle)subtitle.textContent=t('choose');
  }
  function updateBanner(type){
    const category=manager.list().find(item=>item.id===(type||state().prType));if(!category)return;
    const icon=document.getElementById('prSelectedTypeIcon');if(icon)icon.replaceChildren(photo(category));
    for(const [id,value] of [['prSelectedTypeName',label(category,currentLanguage())],['prSelectedTypeLabel',t('selected')],['changePrTypeBtn',t('change')],['addPrSubtitle',t('productDetails')]]){const el=document.getElementById(id);if(el)el.textContent=value;}
  }
  function renderFilters(){
    const bar=document.getElementById('prStatsBar');if(!bar)return;
    bar.dataset.wfCategories='true';
    const entries=[{id:'all',name:t('all'),count:state().products.length,image:''},...usedCategories()];
    const badges={all:'badge-pr-all',coffee_table:'badge-pr-coffee',dresser:'badge-pr-dresser',side_table:'badge-pr-side',tv_table:'badge-pr-tv'};
    const focused=bar.contains(document.activeElement)?document.activeElement.closest('[data-category-id]')?.dataset.categoryId:null;
    const nodes=entries.map(category=>{
      const el=create('button','co-stat-pill');el.type='button';
      el.dataset.categoryId=category.id;
      // Retain the original filter signature for the desktop context bar.
      el.setAttribute('onclick',"setPrTab('"+category.id+"')");
      el.append(photo(category,'csp-icon wf-category-filter-photo'),create('span','',category.id==='all'?t('all'):label(category,currentLanguage())));
      const count=create('span','csp-num',String(category.count));if(badges[category.id])count.id=badges[category.id];el.append(count);
      const selected=state().prTabFilter===category.id;el.classList.toggle('active',selected);el.setAttribute('aria-pressed',String(selected));return el;
    });
    bar.replaceChildren(...nodes);
    if(focused)nodes.find(node=>node.dataset.categoryId===focused)?.focus({preventScroll:true});
  }
  function patchCatalog(){
    const categories=new Map(manager.list().map(item=>[item.id,item]));
    for(const product of state().products){
      const host=document.getElementById('prCardImg-'+product.id),category=categories.get(product.type||'other');if(!host||!category)continue;
      const badge=host.querySelector('.pr-card-type-badge');if(badge)badge.textContent=label(category,currentLanguage());
      const placeholder=host.querySelector('.wf-catalog-placeholder');
      if(!product.image&&placeholder&&category.image)placeholder.replaceWith(photo(category,'wf-category-product-fallback'));
    }
  }
  function renderBarcodeTabs(){
    const host=document.getElementById('qblDdTabs');if(!host)return;host.dataset.wfCategories='true';
    const active=typeof qblActiveType==='string'?qblActiveType:null;
    host.replaceChildren(...usedCategories().map(category=>{
      const el=create('button','wf-category-barcode-tab');el.type='button';el.id='qblTab_'+category.id;el.dataset.categoryId=category.id;el.setAttribute('aria-pressed',String(active===category.id));
      const name=create('strong','',label(category,currentLanguage()));name.id='qblTabLbl_'+category.id;
      const count=create('span','wf-category-count',String(category.count));count.id='qblTabCount_'+category.id;
      const image=photo(category);image.id='qblTabImg_'+category.id;el.append(name,count,image);
      el.addEventListener('click',()=>window.qblSelectType(category.id));return el;
    }));
  }
  function syncBarcodeSelection(){
    const active=typeof qblActiveType==='string'?qblActiveType:null;
    document.querySelectorAll('#qblDdTabs [data-category-id]').forEach(el=>el.setAttribute('aria-pressed',String(el.dataset.categoryId===active)));
  }
  function patchBarcodeResult(product){
    if(!product)return;const category=manager.list().find(item=>item.id===(product.type||'other'));if(!category)return;
    const name=label(category,currentLanguage()),type=document.getElementById('qblFinalTypeLbl');if(type)type.textContent=name;
    const image=document.getElementById('qblFinalImg'),badge=image?.querySelector(':scope > div');if(badge)badge.textContent=name;
    if(image&&!product.image&&category.image&&image.firstElementChild?.tagName==='SPAN')image.firstElementChild.replaceWith(photo(category,'wf-category-product-fallback'));
  }
  function patchChart(host){
    const chart=host?.querySelector('.wf-catalog-total')?.closest('.wf-insight-card');if(!chart)return;
    chart.querySelectorAll('.wf-catalog-row').forEach(row=>row.remove());
    const categories=usedCategories(),max=Math.max(1,...categories.map(category=>category.count));
    for(const category of categories){const row=create('div','wf-catalog-row'),track=create('i'),bar=create('em');bar.style.width=(category.count/max*100)+'%';track.append(bar);row.append(create('span','',label(category,currentLanguage())),track,create('b','',String(category.count)));chart.append(row);}
  }
  function hook(name,after){const original=window[name];if(typeof original!=='function')return;window[name]=function(...args){const result=original.apply(this,args);after(...args);return result;};}
  window.renderPrTypeStepCards=renderChooser;
  window.qblBuildTabs=renderBarcodeTabs;
  hook('updatePrSelectedTypeBanner',updateBanner);
  hook('renderPr',()=>{renderFilters();patchCatalog();});
  hook('qblSelectType',syncBarcodeSelection);
  hook('qblBuildResult',patchBarcodeResult);
  hook('wfRenderDashboardIntelligence',(_total,host=document.getElementById('dashIntelligence'))=>patchChart(host));

  let panel,form,fieldset,list,status,formTitle,nameField,descriptionField,languageField,urlField,fileField,preview,draft,draftBaseline,saveButton,cancelButton;
  let editingLanguage=currentLanguage(),busy=false,fileLoading=false,uploadVersion=0,urlDirty=false,statusKey='',statusError=false;
  function renderStatus(){if(!status)return;status.textContent=statusKey?t(statusKey):'';status.classList.toggle('is-error',statusError);status.setAttribute('role',statusError?'alert':'status');}
  function announce(key,error=false){statusKey=key;statusError=!!key&&error;renderStatus();}
  function updateBusy(){if(!fieldset)return;fieldset.disabled=busy;saveButton.disabled=busy||fileLoading;panel.setAttribute('aria-busy',String(busy||fileLoading));list.querySelectorAll('button').forEach(el=>el.disabled=busy);const add=panel.querySelector('.wf-category-new');if(add)add.disabled=busy;window.dispatchEvent(new CustomEvent('wf-settings-actions-change'));}
  function renderPreview(){if(preview)preview.replaceChildren(photo(draft,'wf-category-editor-photo'));}
  function setDraft(category){
    uploadVersion++;fileLoading=false;urlDirty=false;
    draft=category?{id:category.id,labels:{...category.labels},descriptions:{...category.descriptions},image:category.image||'',archived:category.archived}: {id:null,labels:{},descriptions:{},image:'',archived:false};
    editingLanguage=currentLanguage();languageField.value=editingLanguage;
    nameField.value=draft.labels[editingLanguage]||category?.name||'';
    descriptionField.value=draft.descriptions[editingLanguage]||'';
    urlField.value=/^https:/.test(draft.image)?draft.image:'';fileField.value='';
    draftBaseline={labels:{...draft.labels,[editingLanguage]:nameField.value},descriptions:{...draft.descriptions,[editingLanguage]:descriptionField.value},image:draft.image};
    announce('');
    formTitle.textContent=t(draft.id?'editTitle':'add');renderPreview();renderList();updateBusy();
  }
  function rememberFields(){draft.labels[editingLanguage]=nameField.value;draft.descriptions[editingLanguage]=descriptionField.value;}
  function draftSignature(value){
    return JSON.stringify(locales.map(lang=>[cleanText(value.labels[lang],80),cleanText(value.descriptions[lang],240)]));
  }
  function getSettingsActions(){
    if(!panel||!draft||!document.getElementById('page-settings')?.classList.contains('active')||panel.hidden||panel.style.display==='none')return null;
    const host=document.getElementById('wfSettingsDialog');
    if(host&&!host.open)return null;
    const values={labels:{...draft.labels,[editingLanguage]:nameField.value},descriptions:{...draft.descriptions,[editingLanguage]:descriptionField.value},
      image:urlDirty?(cleanImage(urlField.value)??urlField.value.trim()):draft.image};
    return {key:'product-categories:'+(draft.id||'new'),scope:panel,save:saveButton,cancel:cancelButton,
      dirty:(values.image||'')!==(draftBaseline.image||'')||draftSignature(values)!==draftSignature(draftBaseline),busy:busy||fileLoading};
  }
  function renderList(){
    if(!list)return;
    list.replaceChildren(...manager.list().map(category=>{
      const row=create('div','wf-category-row');row.classList.toggle('is-archived',category.archived);
      const edit=button('edit',()=>{setDraft(category);nameField.focus();},'wf-category-edit');edit.replaceChildren(photo(category),create('span','wf-category-row-name',label(category,currentLanguage())));edit.setAttribute('aria-label',t('edit')+' '+label(category,currentLanguage()));edit.setAttribute('aria-pressed',String(category.id===draft?.id));
      const meta=create('span','wf-category-meta',category.count+' '+t('products')+(category.archived?' · '+t('archived'):''));
      const toggle=button(category.archived?'restore':'archive',async()=>{
        if(busy)return;busy=true;updateBusy();announce('saving');
        try{await manager.archive(category.id,!category.archived);refresh();announce('archiveSaved');}
        catch(error){announce(copy[error.message]?error.message:'failed',true);}finally{busy=false;updateBusy();}
      },'wf-category-archive');row.append(edit,meta,toggle);return row;
    }));
  }
  async function readImage(file){
    validateFile(file);const url=URL.createObjectURL(file);
    try{
      const img=new Image();await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=()=>reject(new Error('imageInvalid'));img.src=url;});
      if(!img.naturalWidth||!img.naturalHeight||img.naturalWidth*img.naturalHeight>24000000)throw new Error('imageInvalid');
      const scale=Math.min(1,720/Math.max(img.naturalWidth,img.naturalHeight)),canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(img.naturalWidth*scale));canvas.height=Math.max(1,Math.round(img.naturalHeight*scale));
      const context=canvas.getContext('2d');if(!context)throw new Error('imageInvalid');context.drawImage(img,0,0,canvas.width,canvas.height);
      let output=canvas.toDataURL('image/webp',.82);
      if(output.length>maxImageLength)output=canvas.toDataURL('image/jpeg',.72);
      if(!cleanImage(output))throw new Error('imageInvalid');return output;
    }finally{URL.revokeObjectURL(url);}
  }
  function buildSettings(){
    const workspace=document.querySelector('#page-settings .wf-settings-workspace'),tabs=workspace?.querySelector('.tabs'),content=workspace?.querySelector('.wf-settings-content');if(!tabs||!content)return;
    const tab=create('button','tab-btn'),caption=text('span','title');tab.id='wf-settings-tab-product-categories';tab.type='button';tab.setAttribute('onclick',"switchTab('product-categories')");tab.setAttribute('aria-controls','stab-product-categories');tab.append(create('span','','▦'),caption);tabs.append(tab);
    panel=create('section','wf-category-settings');panel.id='stab-product-categories';panel.style.display='none';panel.setAttribute('role','tabpanel');panel.setAttribute('aria-labelledby',tab.id);
    const heading=create('div','wf-category-settings-head');heading.append(text('p','hint'),button('add',()=>{setDraft(null);nameField.focus();},'wf-category-new'));
    list=create('div','wf-category-list');list.setAttribute('aria-label',t('title'));
    form=create('form','wf-category-form');formTitle=text('h3','add');formTitle.id='wfCategoryEditorTitle';form.setAttribute('aria-labelledby',formTitle.id);fieldset=create('fieldset');
    const field=(key,input)=>{const wrapper=create('label','wf-category-field');wrapper.append(text('span',key),input);return wrapper;};
    languageField=create('select');languageField.id='wfCategoryLanguage';
    for(const [value,caption] of [['ar','العربية'],['en','English'],['tr','Türkçe'],['fr','Français'],['ru','Русский']]){const option=create('option','',caption);option.value=value;languageField.append(option);}
    nameField=create('input');nameField.id='wfCategoryName';nameField.type='text';nameField.required=true;nameField.maxLength=80;nameField.autocomplete='off';
    descriptionField=create('textarea');descriptionField.id='wfCategoryDescription';descriptionField.rows=2;descriptionField.maxLength=240;
    const names=create('div','wf-category-name-grid');names.append(field('language',languageField),field('name',nameField));
    preview=create('div','wf-category-preview');const imageBlock=create('div','wf-category-image-block');
    const uploadLabel=text('label','upload','wf-category-upload');uploadLabel.htmlFor='wfCategoryImage';fileField=create('input');fileField.id='wfCategoryImage';fileField.type='file';fileField.accept='image/jpeg,image/png,image/webp';
    const imageHint=text('small','imageHint');imageHint.id='wfCategoryImageHint';fileField.setAttribute('aria-describedby',imageHint.id);
    const imageControls=create('div','wf-category-image-controls');imageControls.append(uploadLabel,fileField,imageHint,button('removeImage',()=>{uploadVersion++;fileLoading=false;draft.image='';urlField.value='';urlDirty=false;fileField.value='';renderPreview();updateBusy();},'wf-category-remove-image'));imageBlock.append(preview,imageControls);
    urlField=create('input');urlField.type='url';urlField.inputMode='url';urlField.maxLength=2048;urlField.placeholder='https://';urlField.dir='ltr';
    const actions=create('div','wf-category-form-actions');saveButton=text('button','save','wf-category-save');saveButton.type='submit';cancelButton=button('cancel',()=>setDraft(null));actions.append(saveButton,cancelButton);
    fieldset.append(names,field('description',descriptionField),text('h4','photo'),imageBlock,field('imageURLLabel',urlField),actions);form.append(formTitle,fieldset);
    status=create('p','wf-category-status');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
    const credits=create('details','wf-category-credits');credits.append(text('summary','imageSources'));
    const creditList=create('ul');
    for(const source of Object.values(temporaryImages)){const item=create('li'),link=create('a','',source.site+' · '+source.product);link.href=source.source;link.target='_blank';link.rel='noopener noreferrer';item.append(link);creditList.append(item);}
    credits.append(creditList);panel.append(heading,list,form,status,credits);content.append(panel);
    nameField.addEventListener('input',rememberFields);descriptionField.addEventListener('input',rememberFields);
    languageField.addEventListener('change',()=>{rememberFields();editingLanguage=languageField.value;nameField.value=draft.labels[editingLanguage]||'';descriptionField.value=draft.descriptions[editingLanguage]||'';});
    urlField.addEventListener('input',()=>urlDirty=true);
    urlField.addEventListener('change',()=>{const value=cleanImage(urlField.value);if(value===null){announce('imageURL',true);return;}draft.image=value;urlDirty=false;renderPreview();});
    fileField.addEventListener('change',async()=>{
      const file=fileField.files?.[0];if(!file)return;const version=++uploadVersion;fileLoading=true;updateBusy();announce('imageLoading');
      try{const image=await readImage(file);if(version!==uploadVersion)return;draft.image=image;urlField.value='';urlDirty=false;renderPreview();announce('');}
      catch(error){if(version===uploadVersion)announce(copy[error.message]?error.message:'imageInvalid',true);}
      finally{if(version===uploadVersion){fileLoading=false;fileField.value='';updateBusy();}}
    });
    form.addEventListener('submit',async event=>{
      event.preventDefault();if(busy||fileLoading||!form.reportValidity())return;rememberFields();
      if(urlDirty){const image=cleanImage(urlField.value);if(image===null){announce('imageURL',true);return;}draft.image=image;urlDirty=false;}
      busy=true;updateBusy();announce('saving');
      try{const id=await manager.save(draft,editingLanguage);refresh();setDraft(manager.list().find(category=>category.id===id));announce('saved');}
      catch(error){announce(copy[error.message]?error.message:'failed',true);}finally{busy=false;updateBusy();}
    });
    setDraft(null);
    hook('switchTab',key=>{panel.style.display=key==='product-categories'?'block':'none';tab.classList.toggle('active',key==='product-categories');if(key==='product-categories'){renderList();translateSettings();}});
  }
  function translateSettings(){
    document.querySelectorAll('[data-wf-category-text]').forEach(el=>el.textContent=t(el.dataset.wfCategoryText));
    renderStatus();
    if(formTitle)formTitle.textContent=t(draft?.id?'editTitle':'add');
    if(list){list.setAttribute('aria-label',t('title'));renderList();}
  }
  function refresh(){
    renderChooser();renderFilters();patchCatalog();renderBarcodeTabs();updateBanner(state().prType);translateSettings();
    if(typeof QBL==='object')patchBarcodeResult(QBL.currentProduct);
    for(const id of ['dashIntelligence','wfReportsOverview'])patchChart(document.getElementById(id));
  }
  buildSettings();
  hook('applyTr',refresh);
  hook('loadSettingsToForm',()=>{translateSettings();renderList();});
  window.WFProductCategories={list:()=>manager.list(),label:(id,lang=currentLanguage())=>label(manager.list().find(category=>category.id===id),lang),refresh,getSettingsActions};
  refresh();
})();
