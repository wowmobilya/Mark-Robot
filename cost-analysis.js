(function (root) {
  'use strict';
  const ops = root.WFOperations, analysis = root.WFCostAnalysisCore, costs = root.WFCostCore;
  if (!ops || !analysis || !costs || root.WFCostAnalysis) return;

  const locales = ['ar','tr','en','fr','ru'];
  const copy = {
    title:['تحليل الكلفة والربح','Maliyet ve kâr analizi','Cost and profit analysis','Analyse des coûts et des bénéfices','Анализ себестоимости и прибыли'],
    subtitle:['ربحية الوحدة حسب سعر البيع المحفوظ لكل منتج.','Ürünlerin kayıtlı satış fiyatlarına göre birim kârlılığı.','Unit profitability at each product’s saved selling price.','Rentabilité unitaire selon les prix de vente enregistrés.','Прибыль на единицу по сохранённым ценам товаров.'],
    all:['كل المنتجات','Tüm ürünler','All products','Tous les produits','Все товары'],
    belowCost:['أقل من الكلفة','Maliyetin altında','Below cost','Prix inférieur au coût','Ниже себестоимости'],
    missingCost:['بدون كلفة','Maliyet eksik','Missing cost','Coût manquant','Нет себестоимости'],
    missingPrice:['بدون سعر للفئة','Kademe fiyatı eksik','Missing tier price','Prix du tarif manquant','Нет цены уровня'],
    filter:['تصفية المنتجات','Ürünleri filtrele','Filter products','Filtrer les produits','Фильтр товаров'],
    search:['بحث','Ara','Search','Rechercher','Поиск'],
    placeholder:['اسم المنتج أو الباركود','Ürün adı veya barkod','Product name or barcode','Nom ou code-barres','Название или штрихкод'],
    tier:['فئة السعر','Fiyat kademesi','Price tier','Tarif','Уровень цены'],
    currency:['عملة العرض','Görüntüleme para birimi','Display currency','Devise d’affichage','Валюта отображения'],
    sort:['ترتيب حسب','Sıralama','Sort by','Trier par','Сортировка'],
    nameAsc:['اسم المنتج','Ürün adı','Product name','Nom du produit','Название товара'],
    marginAsc:['أدنى هامش أولاً','En düşük marj','Lowest margin first','Marge croissante','Сначала низкая маржа'],
    marginDesc:['أعلى هامش أولاً','En yüksek marj','Highest margin first','Marge décroissante','Сначала высокая маржа'],
    profitDesc:['أعلى ربح للوحدة','En yüksek birim kâr','Highest unit profit','Bénéfice unitaire décroissant','Сначала высокая прибыль'],
    product:['المنتج','Ürün','Product','Produit','Товар'],
    cost:['كلفة الوحدة','Birim maliyet','Unit cost','Coût unitaire','Себестоимость единицы'],
    price:['سعر البيع','Satış fiyatı','Selling price','Prix de vente','Цена продажи'],
    profit:['ربح الوحدة','Birim kâr','Unit profit','Bénéfice unitaire','Прибыль на единицу'],
    margin:['هامش الربح','Kâr marjı','Margin','Marge','Маржа'],
    results:['نتائج المنتجات','Ürün sonuçları','Product results','Résultats par produit','Результаты по товарам'],
    showing:['عرض {shown} من {total}','{total} üründen {shown} tanesi gösteriliyor','Showing {shown} of {total}','{shown} sur {total} affichés','Показано {shown} из {total}'],
    more:['عرض المزيد','Daha fazla göster','Show more','Afficher plus','Показать ещё'],
    empty:['لا توجد منتجات محفوظة.','Kayıtlı ürün yok.','No saved products.','Aucun produit enregistré.','Нет сохранённых товаров.'],
    noMatch:['لا توجد منتجات مطابقة لهذا البحث والتصفية.','Arama ve filtreyle eşleşen ürün yok.','No products match this search and filter.','Aucun produit ne correspond à cette recherche et à ce filtre.','По этому запросу и фильтру товаров нет.'],
    unknown:['غير متوفر','Bilinmiyor','Unknown','Inconnu','Неизвестно'],
    zeroMargin:['لا يمكن حساب الهامش عندما يكون سعر البيع صفراً.','Satış fiyatı sıfırken marj hesaplanamaz.','Margin is undefined at a zero selling price.','La marge est indéfinie lorsque le prix est nul.','При нулевой цене продажи маржа не определена.'],
    savedCost:['بطاقة الكلفة','Maliyet kartı','Cost sheet','Fiche de coût','Калькуляция'],
    openCost:['فتح بطاقة كلفة {name}','{name} maliyet kartını aç','Open cost sheet for {name}','Ouvrir la fiche de coût de {name}','Открыть калькуляцию для {name}'],
    legacy:['سعر USD القديم','Önceki USD fiyatı','Legacy USD price','Ancien prix en USD','Прежняя цена в USD'],
    sources:['مصادر الأرقام','Hesaplama kaynakları','Sources and calculations','Sources et calculs','Источники и расчёт'],
    costSource:['تعتمد المقارنة على كلفة الوحدة المحفوظة بالدولار في بطاقة المنتج، وتشمل المواد والعمل والمصاريف الإضافية.','Karşılaştırma, ürünün maliyet kartına kaydedilen USD birim maliyetini kullanır. Bu tutar malzeme, işçilik ve genel giderleri kapsar.','Unit cost comes from the product’s saved USD cost sheet and includes materials, labor and overhead.','Le coût unitaire en USD provient de la fiche de coût enregistrée et comprend les matières, la main-d’œuvre et les frais généraux.','Себестоимость в USD берётся из сохранённой калькуляции и включает материалы, труд и накладные расходы.'],
    priceSource:['تظهر أسعار الفئات A وB وC كما حُفظت بالدولار. للمنتجات القديمة يمكن استخدام سعر USD لفئة A. قد يحفظ محرر المنتج الحقول الفارغة B أو C كصفر، وقد تستخدم الفاتورة سعر A في هذه الحالة.','A, B ve C için kayıtlı USD fiyatları gösterilir. Eski ürünlerde A için önceki USD fiyatı kullanılabilir. Ürün formu boş B veya C fiyatını sıfır kaydedebilir. Bu durumda fatura A fiyatını kullanabilir.','A, B and C show their saved USD prices. Older products can use their legacy USD price for A. The product editor can save blank B or C as zero. Invoices may use A when B or C is empty or zero.','Les tarifs A, B et C utilisent les prix enregistrés en USD. Un ancien prix en USD peut servir au tarif A. Le formulaire produit peut enregistrer un tarif B ou C vide à zéro. La facture peut alors appliquer le tarif A.','Для A, B и C берутся сохранённые цены в USD. Для A у старых товаров может использоваться прежняя цена в USD. Редактор товаров может сохранить пустую цену B или C как ноль. В этом случае в счёте может использоваться цена A.'],
    formula:['ربح الوحدة = سعر البيع − كلفة الوحدة. الهامش = ربح الوحدة ÷ سعر البيع.','Birim kâr = satış fiyatı − birim maliyet. Marj = birim kâr ÷ satış fiyatı.','Unit profit = selling price − unit cost. Margin = unit profit ÷ selling price.','Bénéfice unitaire = prix de vente − coût unitaire. Marge = bénéfice unitaire ÷ prix de vente.','Прибыль на единицу = цена продажи − себестоимость. Маржа = прибыль на единицу ÷ цена продажи.'],
    noRate:['لا يتوفر سعر صرف محفوظ لعرض المبالغ بعملة {currency}.','Tutarları {currency} olarak göstermek için kayıtlı kur yok.','No saved exchange rate is available to display amounts in {currency}.','Aucun taux enregistré pour afficher les montants en {currency}.','Нет сохранённого курса для отображения сумм в {currency}.'],
    manualRate:['سعر صرف يدوي','Manuel kur','Manual exchange rate','Taux manuel','Ручной курс'],
    savedRate:['سعر صرف محفوظ','Kayıtlı kur','Saved exchange rate','Taux enregistré','Сохранённый курс']
  };
  function text(key, values = {}) {
    const index = locales.indexOf(ops.locale());
    return copy[key][index < 0 ? 2 : index].replace(/\{(\w+)\}/g, (_,name) => values[name] ?? '');
  }
  const titles = key => Object.fromEntries(locales.map((locale,index) => [locale,copy[key][index]]));
  const make = (tag,cls,value) => ops.make(tag,cls,value);
  const filterKeys = ['all','belowCost','missingCost','missingPrice'];
  const sortKeys = ['nameAsc','marginAsc','marginDesc','profitDesc'];
  const columns = ['product','cost','price','profit','margin'];
  const state = {tier:'A',currency:'USD',sort:'nameAsc',search:'',filter:'all'};
  const controls = {}, words = [], filters = new Map();
  let quote = null, revision = 0, limit = 50, mounted = false;
  let page, table, body, empty, total, more, rateNote, filterBar;

  function fixed(tag,cls,key) {
    const node = make(tag,cls,text(key));
    words.push([node,key]);
    return node;
  }
  function control(key, values) {
    const field = make('label','wf-analysis-field'), label = fixed('span','',key);
    const input = make(values ? 'select' : 'input','fi');
    input.id = 'wfAnalysis'+key[0].toUpperCase()+key.slice(1);
    field.htmlFor = input.id;
    if (values) for (const value of values) {
      const option = key === 'sort' ? fixed('option','',value) : make('option','',value);
      option.value = value;
      input.append(option);
    }
    else { input.type='search'; input.autocomplete='off'; input.placeholder=text('placeholder'); }
    input.value = state[key];
    input.addEventListener(values ? 'change' : 'input', () => {
      state[key] = input.value;
      limit = 50;
      render();
    });
    controls[key] = input;
    field.append(label,input);
    return field;
  }
  function mount() {
    if (mounted) return;
    mounted = true;
    filterBar = make('div','wf-analysis-filters');
    filterBar.setAttribute('role','group');
    for (const key of filterKeys) {
      const button = make('button','wf-analysis-filter'), value = make('strong','');
      button.type = 'button';
      button.dataset.filter = key;
      button.append(fixed('span','',key),value);
      button.addEventListener('click', () => { state.filter=key; limit=50; render(); });
      filters.set(key,{button,value});
      filterBar.append(button);
    }
    const panel = make('section','wf-ops-card wf-analysis-panel');
    const toolbar = make('div','wf-analysis-controls');
    toolbar.append(control('search'),control('tier',['A','B','C']),control('currency',costs.currencies),control('sort',sortKeys));
    rateNote = make('p','wf-analysis-note');
    const heading = make('div','wf-analysis-results-heading');
    total = make('span','wf-analysis-count');
    total.setAttribute('role','status');
    heading.append(fixed('h2','','results'),total);
    table = make('table','wf-analysis-table');
    const head = make('thead'), header = make('tr');
    for (const key of columns) { const cell = fixed('th','',key); cell.scope='col'; header.append(cell); }
    head.append(header); body=make('tbody'); table.append(head,body);
    empty=make('p','wf-ops-empty'); more=fixed('button','btn btn-s wf-analysis-more','more'); more.type='button';
    more.addEventListener('click', () => {limit+=50;render();});
    const details=make('details','wf-analysis-sources');
    details.append(fixed('summary','','sources'),...['costSource','priceSource','formula'].map(key=>fixed('p','',key)));
    panel.append(toolbar,rateNote,heading,table,empty,more,details);
    page.body.append(filterBar,panel);
  }
  function render() {
    if (!mounted) return;
    const lang=ops.locale(), app=ops.state();
    const rates=analysis.savedRates(app.settings,quote);
    const result=analysis.analyze(app.products,{...state,locale:lang,rates});
    const numberFormat=new Intl.NumberFormat(lang);
    const moneyFormat=new Intl.NumberFormat(lang,{style:'currency',currency:state.currency,currencyDisplay:'code',maximumFractionDigits:2});
    const percentFormat=new Intl.NumberFormat(lang,{style:'percent',maximumFractionDigits:1});
    const dateFormat=new Intl.DateTimeFormat(lang,{year:'numeric',month:'short',day:'numeric'});
    function dateStamp(value) {
      if (!value) return '';
      const dt=new Date(value); return Number.isFinite(dt.getTime()) ? dateFormat.format(dt) : '';
    }
    for(const [key,{button,value}] of filters) {
      button.setAttribute('aria-pressed',String(state.filter===key));
      value.textContent=numberFormat.format(result.counts[key]);
    }
    const subset=result.rows.slice(0,limit);
    total.textContent=text('showing',{shown:numberFormat.format(subset.length),total:numberFormat.format(result.rows.length)});
    empty.hidden=Boolean(subset.length);
    empty.textContent=text(result.counts.all ? 'noMatch' : 'empty');
    table.hidden=!subset.length; more.hidden=result.rows.length<=limit;
    rateNote.hidden=state.currency==='USD';
    if (!rateNote.hidden) {
      const manual=costs.normalizeRates({usdTry:app.settings?.manualUsdTry,usdEur:app.settings?.manualUsdEur});
      const manuallySet=manual[state.currency==='TRY'?'usdTry':'usdEur']!==null;
      const quoteDate=manuallySet ? '' : dateStamp(quote?.updatedAt);
      rateNote.textContent=result.rate===null ? text('noRate',{currency:state.currency}) : [text(manuallySet?'manualRate':'savedRate'),`1 USD = ${new Intl.NumberFormat(lang,{maximumSignificantDigits:10}).format(result.rate)} ${state.currency}`,quoteDate].filter(Boolean).join(' · ');
    }
    const elements=subset.map(row => {
      const tr=make('tr',''), product=make('th','wf-analysis-product');
      product.scope='row';
      if(row.belowCost)tr.dataset.loss='true';
      const title=row.name || String(row.id ?? '—');
      if(row.id != null && typeof root.WFCosting?.open==='function') {
        const open=make('button','wf-analysis-open',title);
        open.type='button';open.setAttribute('aria-label',text('openCost',{name:title}));open.addEventListener('click',()=>root.WFCosting.open(row.id));
        product.append(open);
      } else product.append(make('span','',title));
      if(row.barcode && row.barcode!==title)product.append(make('bdi','wf-analysis-meta',row.barcode));
      tr.append(product);
      for(const key of columns.slice(1)) {
        const cell=make('td',''), value=row[key];
        cell.dataset.label=text(key);cell.dataset.measure=key;
        const output=make('bdi','wf-analysis-number',value===null?'—':(key==='margin'?percentFormat:moneyFormat).format(value));
        if(value===null) {
          const reason=key==='margin' && row.priceUSD===0 ? text('zeroMargin') : text('unknown');
          output.title=reason;output.setAttribute('aria-label',reason);
        }
        cell.append(output);
        if(key==='cost' && row.costUSD!==null) {
          const costSource=[text('savedCost'),row.costCurrency,dateStamp(row.costUpdatedAt)].filter(Boolean).join(' · ');
          cell.append(make('span','wf-analysis-meta',costSource));
        }
        if(key==='price' && row.priceSource==='priceUSD' && row.priceUSD!==null)cell.append(make('span','wf-analysis-meta',text('legacy')));
        tr.append(cell);
      }
      return tr;
    });
    body.replaceChildren(...elements);
  }
  function localize() {
    if(!mounted)return;
    for(const [node,key] of words)node.textContent=text(key);
    controls.search.placeholder=text('placeholder');
    filterBar.setAttribute('aria-label',text('filter'));
    table.setAttribute('aria-label',text('results'));
    render();
  }
  async function refresh() {
    mount();
    const generation=++revision;
    quote=null;
    localize();
    try {
      const saved=typeof dbGet==='function' ? await dbGet('settings','usdTry') : null;
      if(generation===revision) {quote=saved;render();}
    } catch (_) {
      // USD comparisons and individually saved manual rates remain available.
    }
  }
  page=ops.register({id:'cost-analysis',title:titles('title'),subtitle:titles('subtitle'),icon:'cost',parent:'products',onEnter:refresh,onLanguage:localize});
  root.WFCostAnalysis=Object.freeze({open:()=>ops.open('cost-analysis'),refresh});
})(typeof window==='object'?window:globalThis);
