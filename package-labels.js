/* Invoice-backed package label workspace. Physical artwork lives only in the
   isolated original renderer; this file controls selection, readiness and print. */
(function (root, factory) {
  'use strict';
  const helpers = factory();
  if (typeof module === 'object' && module.exports) module.exports = helpers;
  else { root.WFPackageLabelHelpers = helpers; mount(root, helpers); }

  function mount(window, helpers) {
    const document = window.document, ops = window.WFOperations, core = window.WFPackageLabelCore;
    if (!document || !ops || !core || window.WFPackageLabels) return;
    const words = {
      ar:{title:'إتيكيت الطرود',subtitle:'Tanex TW-2008 · من بيانات الفاتورة',choose:'اختر الفاتورة',search:'ابحث برقم الفاتورة أو العميل',all:'كل الفواتير',active:'النشطة',archived:'المؤرشفة',print:'طباعة الإتيكيت',preview:'معاينة الورقة',none:'اختر فاتورة محفوظة لتجهيز إتيكيت طرودها.',empty:'لا توجد فواتير مطابقة.',source:'الاسم والصورة واللون وعدد الطرود من بيانات الفاتورة المحفوظة.',profile:'القالب الأصلي المعتمد',stock:'Tanex TW-2008 · 8 ملصقات في ورقة A4',geometry:'رسم الإتيكيت 97 × 66.2 مم · ضبط القالب الأصلي محفوظ',stockSize:'مقاس ملصق Tanex الرسمي: 99.1 × 67.7 مم',labels:'ملصق',sheets:'ورقة A4',units:'قطعة',packets:'طرود / قطعة',previous:'الورقة السابقة',next:'الورقة التالية',of:'من',change:'تغيير الفاتورة',preparing:'جارٍ تجهيز الصور والباركود…',ready:'المعاينة جاهزة للطباعة بالمقاس الأصلي.',printing:'نافذة الطباعة مفتوحة. انتظر إغلاقها قبل طباعة دفعة أخرى.',printed:'أُغلقت نافذة الطباعة. يمكنك إعادة الطباعة عند الحاجة.',retry:'إعادة التجهيز',error:'تعذّر تجهيز الطباعة. تحقق من الصور ثم أعد المحاولة.',imageError:'تعذّر تحميل صورة أو شعار. الطباعة متوقفة حتى تكتمل الصور.',barcodeError:'تعذّر إنشاء باركود هذا الاسم. يجب أن يدعم الاسم رمز CODE128 دون تغيير بياناته.',blocked:'صحّح البيانات المحددة في الفاتورة قبل الطباعة.',review:'ملاحظات على البيانات',currentIdentity:'شعار الشركة الحالي؛ تثبت هويته عند حفظ الفاتورة أو أرشفتها.',savedIdentity:'هوية الطباعة محفوظة مع الفاتورة.',openInvoice:'فتح الفاتورة',showMore:'عرض المزيد',page:'الورقة',assetError:'لم تكتمل الصور أو الخطوط.',missingInvoice:'الفاتورة غير موجودة.',emptyInvoice:'الفاتورة لا تحتوي منتجات.',missingInvoiceNumber:'رقم الفاتورة ناقص.',missingProduct:'بيانات منتج الفاتورة غير متوفرة.',missingName:'اسم المنتج ناقص.',invalidQuantity:'كمية المنتج يجب أن تكون عددًا صحيحًا أكبر من صفر.',invalidPackets:'عدد الطرود يجب أن يكون عددًا صحيحًا أكبر من صفر.',tooManyLabels:'هذه الفاتورة تتجاوز 2000 ملصق؛ قسّمها إلى دفعات أصغر.',unsupportedBarcode:'اسم المنتج يحتوي أحرفًا لا يدعمها CODE128.',missingType:'نوع المنتج غير محفوظ.',missingImage:'لا توجد صورة محفوظة لهذا المنتج.',unsafeImage:'رابط الصورة غير مدعوم.',assumedPackets:'عدد الطرود غير محفوظ؛ سيُستخدم طرد واحد.',scale:'A4 عمودي · المقاس الفعلي 100% · دون ملاءمة للصفحة',reopen:'إعادة فتح الطباعة',variant:'بيانات الطرود',changed:'تغيّرت الفاتورة. أعد تجهيز المعاينة قبل الطباعة.'},
      tr:{title:'Koli etiketleri',subtitle:'Tanex TW-2008 · Fatura verilerinden',choose:'Fatura seçin',search:'Fatura numarası veya müşteri ara',all:'Tüm faturalar',active:'Aktif',archived:'Arşivlenen',print:'Etiketleri yazdır',preview:'Sayfa önizlemesi',none:'Koli etiketlerini hazırlamak için kayıtlı bir fatura seçin.',empty:'Eşleşen fatura yok.',source:'Ad, görsel, renk ve paket sayısı kayıtlı faturadan alınır.',profile:'Onaylı özgün şablon',stock:'Tanex TW-2008 · A4 başına 8 etiket',geometry:'Baskı alanı 97 × 66.2 mm · Özgün şablon ayarları korunur',stockSize:'Resmî Tanex etiket ölçüsü: 99.1 × 67.7 mm',labels:'etiket',sheets:'A4 sayfa',units:'adet',packets:'paket / adet',previous:'Önceki sayfa',next:'Sonraki sayfa',of:'/',change:'Faturayı değiştir',preparing:'Görseller ve barkodlar hazırlanıyor…',ready:'Önizleme özgün ölçüde yazdırılmaya hazır.',printing:'Yazdırma penceresi açık. Başka baskıdan önce kapanmasını bekleyin.',printed:'Yazdırma penceresi kapandı. Gerekirse yeniden yazdırabilirsiniz.',retry:'Yeniden hazırla',error:'Baskı hazırlanamadı. Görselleri kontrol edip tekrar deneyin.',imageError:'Bir görsel veya logo yüklenemedi. Görseller tamamlanana kadar baskı durduruldu.',barcodeError:'Bu ad için barkod üretilemedi. Ad, verileri değiştirilmeden CODE128 tarafından desteklenmelidir.',blocked:'Yazdırmadan önce faturadaki belirtilen verileri düzeltin.',review:'Veri notları',currentIdentity:'Güncel şirket logosu; fatura kaydedildiğinde veya arşivlendiğinde sabitlenir.',savedIdentity:'Baskı kimliği faturayla kaydedildi.',openInvoice:'Faturayı aç',showMore:'Daha fazla göster',page:'Sayfa',assetError:'Görseller veya yazı tipleri hazır değil.',missingInvoice:'Fatura bulunamadı.',emptyInvoice:'Faturada ürün yok.',missingInvoiceNumber:'Fatura numarası eksik.',missingProduct:'Fatura ürünü verileri bulunamıyor.',missingName:'Ürün adı eksik.',invalidQuantity:'Miktar sıfırdan büyük bir tam sayı olmalıdır.',invalidPackets:'Paket sayısı sıfırdan büyük bir tam sayı olmalıdır.',tooManyLabels:'Fatura 2000 etiketi aşıyor; daha küçük gruplara bölün.',unsupportedBarcode:'Ürün adında CODE128 tarafından desteklenmeyen karakter var.',missingType:'Ürün türü kayıtlı değil.',missingImage:'Bu ürünün kayıtlı görseli yok.',unsafeImage:'Görsel bağlantısı desteklenmiyor.',assumedPackets:'Paket sayısı kayıtlı değil; bir paket kullanılacak.',scale:'A4 dikey · Gerçek boyut %100 · Sayfaya sığdırma yok',reopen:'Yazdırmayı yeniden aç',variant:'Paket bilgileri',changed:'Fatura değişti. Yazdırmadan önce önizlemeyi yeniden hazırlayın.'},
      en:{title:'Package labels',subtitle:'Tanex TW-2008 · From your invoice',choose:'Choose an invoice',search:'Search invoice number or customer',all:'All invoices',active:'Active',archived:'Archived',print:'Print labels',preview:'Sheet preview',none:'Choose a saved invoice to prepare its package labels.',empty:'No matching invoices.',source:'Names, images, colors and package counts come from the saved invoice.',profile:'Approved original template',stock:'Tanex TW-2008 · 8 labels per A4 sheet',geometry:'Artwork 97 × 66.2 mm · Original template positioning preserved',stockSize:'Official Tanex label size: 99.1 × 67.7 mm',labels:'labels',sheets:'A4 sheets',units:'units',packets:'packages / unit',previous:'Previous sheet',next:'Next sheet',of:'of',change:'Change invoice',preparing:'Preparing images and barcodes…',ready:'The preview is ready to print at the original size.',printing:'The print dialog is open. Wait for it to close before printing another batch.',printed:'The print dialog closed. You can print again if needed.',retry:'Prepare again',error:'Printing could not be prepared. Check the images and retry.',imageError:'An image or logo could not load. Printing is paused until images are ready.',barcodeError:'This name could not be encoded. CODE128 must support the original data without changing it.',blocked:'Correct the indicated invoice data before printing.',review:'Data notes',currentIdentity:'Current company logo; captured when the invoice is saved or archived.',savedIdentity:'Print identity is saved with this invoice.',openInvoice:'Open invoice',showMore:'Show more',page:'Sheet',assetError:'Images or fonts are not ready.',missingInvoice:'Invoice not found.',emptyInvoice:'The invoice has no products.',missingInvoiceNumber:'Invoice number is missing.',missingProduct:'Invoice product data is unavailable.',missingName:'Product name is missing.',invalidQuantity:'Product quantity must be a positive whole number.',invalidPackets:'Package count must be a positive whole number.',tooManyLabels:'This invoice exceeds 2,000 labels; split it into smaller batches.',unsupportedBarcode:'The product name has characters unsupported by CODE128.',missingType:'Product type is not saved.',missingImage:'No saved image for this product.',unsafeImage:'The image address is unsupported.',assumedPackets:'Package count is not saved; one package will be used.',scale:'A4 portrait · Actual size 100% · No fit to page',reopen:'Reopen printing',variant:'Package details',changed:'The invoice changed. Prepare the preview again before printing.'},
      fr:{title:'Étiquettes de colis',subtitle:'Tanex TW-2008 · Depuis votre facture',choose:'Choisir une facture',search:'Numéro de facture ou client',all:'Toutes les factures',active:'Actives',archived:'Archivées',print:'Imprimer les étiquettes',preview:'Aperçu de la feuille',none:'Choisissez une facture enregistrée pour préparer ses étiquettes.',empty:'Aucune facture correspondante.',source:'Les noms, images, couleurs et nombres de colis proviennent de la facture enregistrée.',profile:'Modèle original approuvé',stock:'Tanex TW-2008 · 8 étiquettes par feuille A4',geometry:'Dessin 97 × 66.2 mm · Positionnement original conservé',stockSize:'Taille officielle Tanex : 99.1 × 67.7 mm',labels:'étiquettes',sheets:'feuilles A4',units:'unités',packets:'colis / unité',previous:'Feuille précédente',next:'Feuille suivante',of:'sur',change:'Changer de facture',preparing:'Préparation des images et codes-barres…',ready:'L’aperçu est prêt à être imprimé à sa taille originale.',printing:'La fenêtre d’impression est ouverte. Attendez sa fermeture avant une autre impression.',printed:'La fenêtre d’impression est fermée. Vous pouvez réimprimer si nécessaire.',retry:'Préparer à nouveau',error:'Impossible de préparer l’impression. Vérifiez les images puis réessayez.',imageError:'Une image ou un logo n’a pas pu être chargé. Impression suspendue en attendant les images.',barcodeError:'Ce nom ne peut pas être encodé. CODE128 doit accepter les données originales sans les modifier.',blocked:'Corrigez les données indiquées dans la facture avant d’imprimer.',review:'Remarques sur les données',currentIdentity:'Logo actuel de l’entreprise ; figé lors de l’enregistrement ou de l’archivage.',savedIdentity:'L’identité d’impression est enregistrée avec la facture.',openInvoice:'Ouvrir la facture',showMore:'Afficher plus',page:'Feuille',assetError:'Les images ou polices ne sont pas prêtes.',missingInvoice:'Facture introuvable.',emptyInvoice:'La facture ne contient aucun produit.',missingInvoiceNumber:'Le numéro de facture manque.',missingProduct:'Les données du produit sont indisponibles.',missingName:'Le nom du produit manque.',invalidQuantity:'La quantité doit être un entier strictement positif.',invalidPackets:'Le nombre de colis doit être un entier strictement positif.',tooManyLabels:'La facture dépasse 2 000 étiquettes ; répartissez-la en lots plus petits.',unsupportedBarcode:'Le nom contient des caractères non pris en charge par CODE128.',missingType:'Le type de produit n’est pas enregistré.',missingImage:'Aucune image enregistrée pour ce produit.',unsafeImage:'Adresse d’image non prise en charge.',assumedPackets:'Le nombre de colis n’est pas enregistré ; un colis sera utilisé.',scale:'A4 portrait · Taille réelle 100 % · Sans ajustement à la page',reopen:'Rouvrir l’impression',variant:'Détails des colis',changed:'La facture a changé. Préparez à nouveau l’aperçu avant d’imprimer.'},
      ru:{title:'Этикетки упаковок',subtitle:'Tanex TW-2008 · Из данных счёта',choose:'Выберите счёт',search:'Поиск по номеру счёта или клиенту',all:'Все счета',active:'Активные',archived:'Архивные',print:'Печать этикеток',preview:'Предпросмотр листа',none:'Выберите сохранённый счёт для подготовки этикеток.',empty:'Подходящих счетов нет.',source:'Названия, изображения, цвета и число упаковок берутся из сохранённого счёта.',profile:'Утверждённый исходный шаблон',stock:'Tanex TW-2008 · 8 этикеток на лист A4',geometry:'Рисунок 97 × 66.2 мм · Исходное расположение сохранено',stockSize:'Официальный размер Tanex: 99.1 × 67.7 мм',labels:'этикеток',sheets:'листов A4',units:'единиц',packets:'упаковок / единицу',previous:'Предыдущий лист',next:'Следующий лист',of:'из',change:'Выбрать другой счёт',preparing:'Подготовка изображений и штрихкодов…',ready:'Предпросмотр готов к печати в исходном размере.',printing:'Окно печати открыто. Дождитесь его закрытия перед следующей печатью.',printed:'Окно печати закрыто. При необходимости можно напечатать снова.',retry:'Подготовить снова',error:'Не удалось подготовить печать. Проверьте изображения и повторите попытку.',imageError:'Не удалось загрузить изображение или логотип. Печать приостановлена до загрузки.',barcodeError:'Не удалось создать штрихкод. CODE128 должен поддерживать исходные данные без изменений.',blocked:'Исправьте указанные данные счёта перед печатью.',review:'Замечания к данным',currentIdentity:'Текущий логотип компании; фиксируется при сохранении или архивации счёта.',savedIdentity:'Оформление печати сохранено со счётом.',openInvoice:'Открыть счёт',showMore:'Показать ещё',page:'Лист',assetError:'Изображения или шрифты не готовы.',missingInvoice:'Счёт не найден.',emptyInvoice:'В счёте нет товаров.',missingInvoiceNumber:'Номер счёта отсутствует.',missingProduct:'Данные товара в счёте недоступны.',missingName:'Название товара отсутствует.',invalidQuantity:'Количество должно быть положительным целым числом.',invalidPackets:'Число упаковок должно быть положительным целым числом.',tooManyLabels:'Счёт содержит более 2000 этикеток; разделите его на меньшие партии.',unsupportedBarcode:'Название содержит символы, не поддерживаемые CODE128.',missingType:'Тип товара не сохранён.',missingImage:'Для этого товара нет сохранённого изображения.',unsafeImage:'Адрес изображения не поддерживается.',assumedPackets:'Число упаковок не сохранено; будет использована одна упаковка.',scale:'A4 вертикально · Реальный размер 100% · Без подгонки',reopen:'Открыть печать снова',variant:'Данные упаковок',changed:'Счёт изменился. Подготовьте предпросмотр снова перед печатью.'}
    };
    const recoveryWords={
      ar:['أغلقت نافذة الطباعة','اضغط بعد إغلاق نافذة الطباعة فقط إذا بقي القسم مشغولًا.'],
      tr:['Yazdırma penceresini kapattım','Bölüm meşgul kalırsa yalnızca yazdırma penceresini kapattıktan sonra basın.'],
      en:['I closed the print dialog','Use only after closing the print dialog if this section remains busy.'],
      fr:['J’ai fermé la fenêtre d’impression','Utilisez uniquement après avoir fermé la fenêtre d’impression si cette section reste occupée.'],
      ru:['Окно печати закрыто','Нажмите только после закрытия окна печати, если раздел остаётся занят.']
    };
    for(const [locale,values] of Object.entries(recoveryWords))Object.assign(words[locale],{printRecovery:values[0],printRecoveryHint:values[1]});
    const profileWords = {
      ar:{subtitle:'من الفاتورة إلى إتيكيت الطرود تلقائيًا',profile:'قالب ورق الطباعة',remembered:'يتذكّر اختيار الورق، ويحسب الملصقات ويوزّعها تلقائيًا.',preferenceError:'سيُستخدم القالب الآن، لكن تعذّر حفظ الاختيار للطباعة التالية.',geometryLarge:'التصميم الأصلي مكبّر بالتناسب، مع ضبط الاتجاه تلقائيًا لاستغلال مساحة الملصق الكبير.',stockLarge:'Tanex TW-2004 · 4 ملصقات في ورقة A4',sizeLarge:'مقاس ملصق Tanex الرسمي: 99.1 × 139 مم',ready:'المعاينة جاهزة للطباعة وفق قالب الورق المختار.'},
      tr:{subtitle:'Faturadan koli etiketlerine, otomatik',profile:'Yazdırma kâğıdı şablonu',remembered:'Kâğıt seçimi hatırlanır; etiketler otomatik sayılır ve yerleştirilir.',preferenceError:'Şablon bu baskıda kullanılacak, ancak sonraki baskı için seçim kaydedilemedi.',geometryLarge:'Özgün tasarım orantılı büyütülür ve büyük etikete sığacak şekilde otomatik döndürülür.',stockLarge:'Tanex TW-2004 · A4 başına 4 etiket',sizeLarge:'Resmî Tanex etiket ölçüsü: 99.1 × 139 mm',ready:'Önizleme seçilen kâğıt şablonuyla yazdırılmaya hazır.'},
      en:{subtitle:'From invoice to package labels, automatically',profile:'Printing paper template',remembered:'Remembers your paper choice and counts and arranges labels automatically.',preferenceError:'This template will be used now, but the choice could not be saved for the next print.',geometryLarge:'The original artwork is enlarged proportionally with its orientation set automatically to fit the larger label.',stockLarge:'Tanex TW-2004 · 4 labels per A4 sheet',sizeLarge:'Official Tanex label size: 99.1 × 139 mm',ready:'The preview is ready to print on the selected paper template.'},
      fr:{subtitle:'De la facture aux étiquettes, automatiquement',profile:'Gabarit du papier',remembered:'Le choix du papier est mémorisé ; les étiquettes sont comptées et réparties automatiquement.',preferenceError:'Ce gabarit sera utilisé, mais le choix n’a pas pu être mémorisé pour la prochaine impression.',geometryLarge:'Le dessin original est agrandi proportionnellement et tourné automatiquement pour remplir la grande étiquette.',stockLarge:'Tanex TW-2004 · 4 étiquettes par feuille A4',sizeLarge:'Format officiel Tanex : 99.1 × 139 mm',ready:'L’aperçu est prêt pour le gabarit de papier choisi.'},
      ru:{subtitle:'От счёта к этикеткам — автоматически',profile:'Шаблон бумаги для печати',remembered:'Выбор бумаги запоминается; этикетки подсчитываются и размещаются автоматически.',preferenceError:'Шаблон будет использован сейчас, но сохранить выбор для следующей печати не удалось.',geometryLarge:'Исходный макет пропорционально увеличивается и автоматически поворачивается для большой этикетки.',stockLarge:'Tanex TW-2004 · 4 этикетки на листе A4',sizeLarge:'Официальный размер Tanex: 99.1 × 139 мм',ready:'Предпросмотр готов к печати на выбранном шаблоне бумаги.'}
    };
    for(const [locale,values] of Object.entries(profileWords))Object.assign(words[locale],values);
    const rollWords={
      ar:{stockRoll:'{brand} {size} مم · ملصق واحد لكل صفحة رول',sizeRoll:'مقاس الرول {size} مم',rollCapacity:'{count} ملصقًا في الرول',thermal:'رول حراري',square:'مربع',geometryRoll:'التصميم والمحتوى الأصليان محفوظان؛ يُضبط الحجم والاتجاه بالتناسب مع مقاس الرول.',rollPages:'صفحة رول',rollScale:'ورق {size} مم · المقاس الفعلي 100% · ملصق واحد لكل صفحة',rollOption:'رول'},
      tr:{stockRoll:'{brand} {size} mm · Her rulo sayfasında 1 etiket',sizeRoll:'Rulo etiketi {size} mm',rollCapacity:'Rulo başına {count} etiket',thermal:'Termal rulo',square:'Kare',geometryRoll:'Özgün tasarım ve içerik korunur; boyut ve yön rulo ölçüsüne orantılı olarak uyarlanır.',rollPages:'rulo sayfası',rollScale:'{size} mm kâğıt · Gerçek boyut %100 · Sayfa başına 1 etiket',rollOption:'Rulo'},
      en:{stockRoll:'{brand} {size} mm · 1 label per roll page',sizeRoll:'Roll label {size} mm',rollCapacity:'{count} labels per roll',thermal:'Thermal roll',square:'Square',geometryRoll:'The original artwork and content are preserved, with proportional sizing and orientation for the selected roll.',rollPages:'roll pages',rollScale:'{size} mm paper · Actual size 100% · 1 label per page',rollOption:'Roll'},
      fr:{stockRoll:'{brand} {size} mm · 1 étiquette par page de rouleau',sizeRoll:'Étiquette {size} mm',rollCapacity:'{count} étiquettes par rouleau',thermal:'Rouleau thermique',square:'Carré',geometryRoll:'Le dessin et le contenu d’origine sont conservés ; la taille et l’orientation sont adaptées proportionnellement au rouleau.',rollPages:'pages du rouleau',rollScale:'Papier {size} mm · Taille réelle 100% · 1 étiquette par page',rollOption:'Rouleau'},
      ru:{stockRoll:'{brand} {size} мм · 1 этикетка на страницу рулона',sizeRoll:'Этикетка {size} мм',rollCapacity:'{count} этикеток в рулоне',thermal:'Терморулон',square:'Квадрат',geometryRoll:'Исходный макет и содержание сохранены; размер и ориентация пропорционально адаптируются к выбранному рулону.',rollPages:'страниц рулона',rollScale:'Бумага {size} мм · Масштаб 100% · 1 этикетка на страницу',rollOption:'Рулон'}
    };
    for(const [locale,values] of Object.entries(rollWords))Object.assign(words[locale],values);
    const orientations={ar:['عمودي','أفقي','طابق مقاس الورق في إعدادات الطابعة مع القالب المختار.','يتطلب هذا الاتجاه طابعة تقبل ورقًا بعرض 150 مم.'],tr:['Dikey','Yatay','Yazıcıdaki kâğıt ölçüsünü seçilen şablonla eşleştirin.','Bu yön, 150 mm genişliğinde kâğıt kabul eden bir yazıcı gerektirir.'],en:['Portrait','Landscape','Match the printer’s paper size to the selected template.','This orientation requires a printer that accepts 150 mm wide media.'],fr:['Portrait','Paysage','Réglez le format du papier de l’imprimante sur le gabarit choisi.','Cette orientation exige une imprimante acceptant du papier de 150 mm de large.'],ru:['Портрет','Альбом','Установите в принтере размер бумаги, соответствующий шаблону.','Для этой ориентации нужен принтер, принимающий бумагу шириной 150 мм.']};
    for(const [locale,values] of Object.entries(orientations))Object.assign(words[locale],{portrait:values[0],landscape:values[1],printerSize:values[2],widePrinter:values[3]});
    const t = key => words[ops.locale()][key] || words.en[key] || key;
    const make = ops.make;
    let selectedId = '', query = '', filter = 'all', limit = 30, revision = 0, sheetIndex = 0;
    let batch = null, barcodeImages = new Map(), ready = false, busy = false, activePrint = null;
    let selectedRecord = null, selectedIssuer = '', previewFrame = null, errorKey = '', statusKey = '';
    let selectedSignature = '', pendingSelectedId = null, pendingRefresh = false;
    let profileId = core.defaultProfileId || 'tw2008';
    let preferenceSaved = true;
    // Paper choice belongs to this printing device, not to invoice identity.
    try { profileId=helpers.readProfilePreference(window.localStorage,core); } catch (_) {}
    const labels = [];
    const texts = [];
    function textNode(tag, className, key) { const node = make(tag, className, t(key)); texts.push({node,key}); return node; }
    function button(key, className, handler, symbol) {
      const node = make('button', className); node.type = 'button';
      if (symbol) { const glyph = make('span', 'wf-ops-icon'); glyph.innerHTML = ops.icon(symbol); node.append(glyph); }
      // Dynamic invoice-card buttons must not be retained in the static text list.
      const caption=make('span','',t(key));caption.dataset.wfPackageText=key;
      node.append(caption); node.addEventListener('click',handler); return node;
    }
    const page = ops.register({id:'package-labels',title:Object.fromEntries(Object.entries(words).map(([l,w])=>[l,w.title])),subtitle:Object.fromEntries(Object.entries(words).map(([l,w])=>[l,w.subtitle])),icon:'label',parent:'invoices',onEnter:enter,onLanguage:translate});
    const printButton = button('print','btn btn-p',print,'print'); printButton.id = 'wfPackagePrint'; printButton.disabled = true;
    page.actions.append(printButton);
    const profile = make('div','wf-package-profile');
    const badge = make('span','wf-package-stock'); badge.dir = 'ltr';
    const profileText = make('div','wf-package-profile-copy');
    const profileLabel=textNode('label','','profile');profileLabel.htmlFor='wfPackageProfile';
    const profileSelect=make('select','fi');profileSelect.id='wfPackageProfile';profileSelect.dir='ltr';
    for(const id of Object.keys(core.profiles)){
      const paper=core.profiles?.[id];if(!paper)continue;
      const option=make('option');option.value=id;profileSelect.append(option);
    }
    profileSelect.value=profileId;profileSelect.addEventListener('change',()=>changeProfile(profileSelect.value));
    const stockText=make('p'),preferenceHint=make('p','wf-package-preference'),printerHint=make('p','wf-package-preference');preferenceHint.setAttribute('role','status');
    profileText.append(profileLabel,profileSelect,stockText,preferenceHint,printerHint);
    profile.append(badge,profileText);
    const layout = make('div','wf-package-layout');
    const chooser = make('details','wf-package-chooser wf-ops-card'); chooser.open = true;
    chooser.append(textNode('summary','wf-package-chooser-title','choose'));
    const searchLabel = textNode('label','wf-ops-muted','search'); searchLabel.htmlFor = 'wfPackageInvoiceSearch';
    const search = make('input','fi'); search.id = 'wfPackageInvoiceSearch'; search.type = 'search'; search.autocomplete = 'off';
    search.addEventListener('input',()=>{query=search.value;limit=30;renderList();});
    const filters = make('div','wf-package-filters');
    for (const value of ['all','active','archived']) {
      const control = button(value,'btn btn-s',()=>{filter=value;limit=30;renderList();}); control.dataset.filter = value; filters.append(control);
    }
    const list = make('div','wf-package-invoice-list'); list.id = 'wfPackageInvoiceList';
    const more = button('showMore','btn btn-s',()=>{limit+=30;renderList();});
    chooser.append(searchLabel,search,filters,list,more);
    const content = make('div','wf-package-content');
    const empty = textNode('div','wf-ops-card wf-ops-empty','none');
    const detail = make('section','wf-ops-card wf-package-detail'); detail.hidden = true;
    const infoHeading = make('div','wf-package-info-heading'), invoiceTitle = make('h2'), customerName = make('p','wf-ops-muted');
    const change = button('change','btn btn-s',()=>{chooser.open = true;search.focus();},'search');
    infoHeading.append(invoiceTitle,change); detail.append(infoHeading,customerName);
    const counts = make('div','wf-package-counts');
    const summary = make('p','wf-ops-muted');
    const identity = make('p','wf-ops-muted');
    const issues = make('details','wf-package-issues'); issues.hidden = true; issues.append(textNode('summary','','review'));
    const issueList = make('ul'); issues.append(issueList);
    const status = make('p','wf-ops-status'); status.setAttribute('role','status'); status.setAttribute('aria-live','polite'); status.hidden=true;
    const actions = make('div','wf-ops-row');
    const retry = button('retry','btn btn-s',()=>prepare(true),'restore');
    const viewInvoice = button('openInvoice','btn btn-s',()=>{if(selectedId) window.previewSaved?.(selectedRecord?.id??selectedId);},'invoice');
    const printRecovery=button('printRecovery','btn btn-s',recoverPrint,'check');printRecovery.hidden=true;
    const printRecoveryHint=textNode('p','wf-ops-muted','printRecoveryHint');printRecoveryHint.hidden=true;
    actions.append(retry,viewInvoice,printRecovery);
    detail.append(counts,summary,identity,issues,status,actions,printRecoveryHint);
    const preview = make('section','wf-package-preview wf-ops-card'); preview.hidden = true;
    const previewHeading = make('div','wf-package-preview-heading');
    previewHeading.append(textNode('h2','','preview'));
    const paging = make('div','wf-package-paging');
    const previous = button('previous','btn btn-s',()=>changeSheet(-1));
    const next = button('next','btn btn-s',()=>changeSheet(1));
    const counter = make('output'); counter.setAttribute('aria-live','polite');
    paging.append(previous,counter,next); previewHeading.append(paging);
    const stage = make('div','wf-package-stage'); stage.id = 'wfPackagePreview';
    const geometryNote = make('p','wf-ops-muted'),stockSizeNote=make('p','wf-ops-muted'),scaleNote=make('p','wf-package-scale-note');
    preview.append(previewHeading,stage,geometryNote,stockSizeNote,scaleNote);
    content.append(empty,detail,preview); layout.append(chooser,content); page.body.append(profile,layout);

    function renderList() {
      const term = normalize(query);
      const invoices = (ops.state().invoices || []).slice().reverse().filter(invoice => {
        if (filter==='active' && invoice.archived || filter==='archived' && !invoice.archived) return false;
        return normalize([invoice.invNo,invoice.companyName,invoice.buyerName].join(' ')).includes(term);
      });
      list.replaceChildren();
      for (const invoice of invoices.slice(0,limit)) {
        const item = make('button','wf-package-invoice'); item.type='button'; item.dataset.invoiceId=String(invoice.id);
        item.disabled=Boolean(activePrint);
        item.setAttribute('aria-pressed',String(String(invoice.id)===selectedId));
        const top = make('span','wf-package-invoice-top'); top.append(make('strong','',String(invoice.invNo||'—')));
        if (invoice.archived) top.append(make('span','wf-package-archive-tag',t('archived')));
        const name = make('span','wf-package-invoice-name',String(invoice.companyName||'—'));
        const date = make('span','wf-package-invoice-date',String(invoice.regDate||invoice.date||''));
        item.append(top,name,date);
        item.addEventListener('click',()=>{if(chooseInvoice(invoice.id)){renderList();prepare(true);}if(window.matchMedia('(max-width:800px)').matches)chooser.open=false;});
        list.append(item);
      }
      if (!invoices.length) list.append(make('p','wf-ops-empty',t('empty')));
      more.hidden=invoices.length<=limit;
      for(const control of filters.children) control.setAttribute('aria-pressed',String(control.dataset.filter===filter));
    }
    function normalize(value) { return String(value||'').normalize('NFKD').replace(/\p{M}/gu,'').replace(/[أإآٱ]/g,'ا').toLowerCase().trim(); }
    function renderProfile() {
      const paper=core.profiles[profileId],large=profileId==='tw2004',roll=paper?.mediaType==='roll';
      const brand=profileId.startsWith('thermal')?t('thermal'):'Zebra';
      const size=paper.stockWidthMM+' × '+paper.stockHeightMM,copy=key=>t(key).replace('{size}',size).replace('{brand}',brand);
      badge.textContent=roll?brand+' '+size:large?'TANEX TW-2004':'TANEX TW-2008';
      for(const option of profileSelect.children){
        const item=core.profiles[option.value],isRoll=item.mediaType==='roll';
        const name=isRoll?(item.id.startsWith('thermal')?t('thermal'):'Zebra'):item.name;
        option.textContent=name+' · '+(item.stockWidthMM||item.cardWidthMM)+' × '+(item.stockHeightMM||item.cardHeightMM)+' mm · '+(isRoll?t('rollOption')+' '+t(item.pageWidthMM===item.pageHeightMM?'square':item.pageWidthMM>item.pageHeightMM?'landscape':'portrait'):(item.columns*item.rows)+' / A4');
      }
      profileSelect.value=profileId;profileSelect.disabled=Boolean(activePrint);
      stockText.textContent=copy(roll?'stockRoll':large?'stockLarge':'stock');
      geometryNote.textContent=t(roll?'geometryRoll':large?'geometryLarge':'geometry');
      stockSizeNote.textContent=copy(roll?'sizeRoll':large?'sizeLarge':'stockSize');
      if(roll&&paper.labelsPerRoll)stockSizeNote.textContent+=' · '+t('rollCapacity').replace('{count}',paper.labelsPerRoll);
      scaleNote.textContent=copy(roll?'rollScale':'scale');
      printerHint.hidden=!roll;printerHint.textContent=roll?t(profileId==='zebra150x100'?'widePrinter':'printerSize'):'';
      preferenceHint.textContent=t(preferenceSaved?'remembered':'preferenceError');
    }
    function changeProfile(next) {
      if(activePrint||!Object.prototype.hasOwnProperty.call(core.profiles||{},next)){renderProfile();return false;}
      if(next===profileId)return true;
      profileId=next;sheetIndex=0;
      try{preferenceSaved=helpers.writeProfilePreference(window.localStorage,next,core);}catch(_){preferenceSaved=false;}
      renderProfile();
      if(selectedId)prepare(true);
      return true;
    }
    function enter() { renderList(); if(selectedId) prepare(false); }
    function translate() {
      for(const entry of texts) entry.node.textContent=t(entry.key);
      for(const node of document.querySelectorAll('[data-wf-package-text]'))node.textContent=t(node.dataset.wfPackageText);
      for(const node of document.querySelectorAll('[data-wf-ops-label="invoice-archive"]'))node.textContent=ops.label('invoice-archive');
      search.placeholder=t('search'); search.setAttribute('aria-label',t('search'));
      renderProfile();renderList(); renderMeta();
    }
    function registerGuard() {
      window.WFAppUpdates?.registerGuard?.('package-label-print',()=>Boolean(busy||activePrint));
    }
    function updateControls() {
      const locked=Boolean(busy||activePrint);
      profileSelect.disabled=Boolean(activePrint);
      printButton.disabled=!ready||locked||Boolean(errorKey);
      printButton.setAttribute('aria-busy',String(locked));
      page.page?.setAttribute('aria-busy',String(locked));
      retry.disabled=locked;change.disabled=Boolean(activePrint);viewInvoice.disabled=Boolean(activePrint);
      previous.disabled=locked||sheetIndex<=0;next.disabled=locked||!batch||sheetIndex>=batch.pageCount-1;
      for(const item of list.children)if(item.dataset.invoiceId)item.disabled=Boolean(activePrint);
      registerGuard();
    }
    function renderMeta() {
      updateControls();
      if(!selectedRecord || !batch)return;
      invoiceTitle.textContent=String(selectedRecord.invNo||'—');
      customerName.textContent=String(selectedRecord.companyName||'—');
      counts.replaceChildren();
      for(const [number,key] of [[batch.labelCount,'labels'],[batch.pageCount,core.profiles[profileId]?.mediaType==='roll'?'rollPages':'sheets']]) {
        const chip=make('div','wf-package-count');chip.append(make('strong','',String(number)),make('span','',t(key)));counts.append(chip);
      }
      summary.textContent=t('source');
      identity.textContent=t(Object.prototype.hasOwnProperty.call(selectedRecord,'packageLabelSnapshot')?'savedIdentity':'currentIdentity');
      issueList.replaceChildren();
      for(const issue of batch.issues) {
        const name=issue.lineIndex===undefined?'':batch.model.items[issue.lineIndex]?.name||String(issue.lineIndex+1);
        const row=make('li','', (name?name+' · ':'')+t(issue.code));row.dataset.kind=issue.severity;issueList.append(row);
      }
      issues.hidden=!batch.issues.length;
      if(batch.issues.some(issue=>issue.severity==='error'))issues.open=true;
      counter.textContent=t('page')+' '+Math.min(sheetIndex+1,batch.pageCount)+' '+t('of')+' '+batch.pageCount;
      status.hidden=!statusKey&&!errorKey;status.textContent=t(errorKey||statusKey);
      status.dataset.kind=errorKey?'error':ready?'success':'info';
    }
    function absoluteImage(value) {
      const safe=core.safeImageSource(value);if(!safe)return '';
      try{return /^(?:data|blob):/i.test(safe)?safe:new URL(safe,document.baseURI).href;}catch(_){return '';}
    }
    function currentCompanyLogo() {
      const stored=ops.state().settings?.logo||'';
      return typeof window.wfCompanyLogo==='function'?window.wfCompanyLogo(stored):stored;
    }
    function captureInvoiceIdentity(invoice) {
      return helpers.captureIdentity(invoice,Object.prototype.hasOwnProperty.call(invoice||{},'packageLabelSnapshot')?'':currentCompanyLogo());
    }
    function captureSource() {
      const source=helpers.resolveInvoiceSource(ops.state(),selectedId);
      const snapshot=source.record.packageLabelSnapshot;
      const captured=Object.prototype.hasOwnProperty.call(source.record,'packageLabelSnapshot');
      if(!captured)source.companyLogo=currentCompanyLogo();
      const historical=Boolean(source.record.archived||captured);
      const model=core.normalizeInvoice(source.invoice,{companyLogo:source.companyLogo,products:historical?[]:ops.state().products||[]});
      const resolved={...model,customerLogo:absoluteImage(model.customerLogo),companyLogo:absoluteImage(model.companyLogo),
        items:model.items.map(item=>({...item,image:absoluteImage(item.image)})),
        // A supplied asset rejected by the safe renderer is lost content, not an
        // optional absent logo. Keep the core diagnostic and block this print.
        issues:model.issues.map(issue=>issue.code==='unsafeImage'?{...issue,severity:'error'}:issue)};
      const signature=JSON.stringify([profileId,resolved.invoiceId,resolved.invNo,resolved.customerLogo,resolved.companyLogo,
        resolved.items.map(item=>[item.productId,item.name,item.type,item.color,item.qty,item.packets,item.image]),resolved.issues]);
      return {...source,model:resolved,signature};
    }
    function sourceIsCurrent(signature) {
      try{return captureSource().signature===signature;}catch(_){return false;}
    }
    function chooseInvoice(invoiceId) {
      const id=String(invoiceId);
      if(activePrint){pendingSelectedId=id;pendingRefresh=true;return false;}
      selectedId=id;sheetIndex=0;return true;
    }
    async function prepare(force) {
      if(activePrint){pendingRefresh=true;return;}
      const token=++revision;
      let source;
      try { source=captureSource(); }
      catch (_) {
        ready=false;busy=false;batch=null;selectedRecord=null;selectedIssuer='';selectedSignature='';barcodeImages=new Map();
        errorKey=selectedId?'missingInvoice':'';statusKey='';previewFrame=null;stage.replaceChildren();stage.style.height='auto';
        detail.hidden=true;preview.hidden=true;empty.hidden=false;empty.textContent=t(selectedId?'missingInvoice':'none');
        renderMeta();return;
      }
      if(!force && !busy && ready && !errorKey && selectedSignature===source.signature && batch) {selectedRecord=source.record;renderMeta();return;}
      ready=false;busy=true;errorKey='';statusKey='preparing';
      selectedRecord=source.record;selectedIssuer=source.companyLogo;selectedSignature=source.signature;sheetIndex=0;barcodeImages=new Map();
      batch=core.buildLabelBatch(source.model,{profileId});
      const capturedBatch=batch,capturedBarcodes=barcodeImages;
      empty.hidden=true;detail.hidden=false;preview.hidden=true;stage.replaceChildren();previewFrame=null;renderMeta();
      if(batch.issues.some(issue=>issue.severity==='error')){busy=false;errorKey='blocked';statusKey='';renderMeta();return;}
      try {
        const unique=[...new Set(capturedBatch.labels.map(label=>label.barcodeText))];
        for(let index=0;index<unique.length;index++){
          if(token!==revision)return;
          const code=helpers.barcodeBits(unique[index],window.JsBarcode);
          const canvas=document.createElement('canvas'), scale=4;
          canvas.width=(code.bits.length+code.quiet*2)*scale;canvas.height=180;
          const context=canvas.getContext('2d');if(!context)throw new Error('BARCODE');
          context.fillStyle='#ffffff';context.fillRect(0,0,canvas.width,canvas.height);
          context.fillStyle='#000000';
          for(let bit=0;bit<code.bits.length;bit++)if(code.bits[bit]==='1')context.fillRect((bit+code.quiet)*scale,0,scale,canvas.height);
          capturedBarcodes.set(unique[index],canvas.toDataURL('image/png'));
          if(index%15===14)await new Promise(resolve=>window.requestAnimationFrame(resolve));
        }
        if(token!==revision)return;
        await showSheet(token);
        if(token!==revision)return;
        // Validate all source images, including products only present on later sheets.
        const sources=[capturedBatch.customerLogo,capturedBatch.companyLogo,...capturedBatch.model.items.map(item=>item.image)].filter(Boolean);
        await Promise.all([...new Set(sources)].map(src=>{const img=new window.Image();img.src=src;return helpers.waitForImage(img);}));
        if(token!==revision)return;
        if(!sourceIsCurrent(source.signature))throw new Error('STALE');
        ready=true;statusKey='ready';
      } catch(error) {
        if(token!==revision)return;
        errorKey=error.message==='STALE'?'changed':/BARCODE/.test(error.message)?'barcodeError':/IMAGE/.test(error.message)?'imageError':'error';statusKey='';
      } finally { if(token===revision){busy=false;renderMeta();} }
    }
    function frameDocument(frame, html) {
      const doc=frame.contentDocument;if(!doc)throw new Error('FRAME');
      doc.open();doc.write(html);doc.close();return doc;
    }
    async function readyDocument(doc) {
      await helpers.withTimeout(Promise.all([...doc.images].map(image=>helpers.waitForImage(image))),15000,'IMAGE_TIMEOUT');
      if(doc.fonts?.ready)await helpers.withTimeout(doc.fonts.ready,5000,'FONT_TIMEOUT');
    }
    async function showSheet(token=revision) {
      if(token!==revision||!batch?.pages.length)return;
      preview.hidden=false;
      const frame=document.createElement('iframe');frame.className='wf-package-paper';frame.title=t('preview');
      // No scripts are inserted; the isolated document has only escaped source content.
      frame.setAttribute('sandbox','allow-same-origin');
      const single={...batch,pages:[batch.pages[sheetIndex]]};
      stage.replaceChildren(frame);previewFrame=frame;
      const doc=frameDocument(frame,core.renderDocument(single,{barcodeImages}));
      scalePreview();await readyDocument(doc);
      if(token!==revision||previewFrame!==frame)return;
      renderMeta();scalePreview();
    }
    function scalePreview() {
      if(!previewFrame)return;
      const paper=core.profiles[batch?.profileId||profileId]||core.profiles.tw2008;
      const width=paper.pageWidthMM*96/25.4,height=paper.pageHeightMM*96/25.4;
      const scale=Math.min(1,Math.max(0.1,(stage.clientWidth||width)/width));
      previewFrame.style.width=width+'px';previewFrame.style.height=height+'px';
      previewFrame.style.transform='scale('+scale+')';stage.style.height=height*scale+'px';
    }
    async function changeSheet(delta) {
      if(busy||activePrint||!batch)return;
      const token=revision;busy=true;renderMeta();
      sheetIndex=Math.max(0,Math.min(batch.pageCount-1,sheetIndex+delta));
      try{await showSheet(token);}catch(_){if(token===revision){ready=false;errorKey='imageError';}}
      finally{if(token===revision){busy=false;renderMeta();}}
    }
    function recoverPrint() {
      // Focus/visibility are not proof of native-dialog completion. Recovery is
      // an explicit user action, and is disabled while print media is active.
      if(activePrint&&!activePrint.media?.matches)activePrint.cleanup(true);
    }
    async function print() {
      if(!ready||busy||activePrint||!batch||errorKey)return;
      if(!sourceIsCurrent(selectedSignature)){errorKey='changed';ready=false;renderMeta();return;}
      const token=revision,signature=selectedSignature,capturedBatch=batch,capturedBarcodes=new Map(barcodeImages);
      const frame=document.createElement('iframe');frame.className='wf-package-print-frame';frame.title=t('print');frame.setAttribute('aria-hidden','true');
      const paper=core.profiles[capturedBatch.profileId]||core.profiles.tw2008;
      frame.style.width=paper.pageWidthMM+'mm';frame.style.height=paper.pageHeightMM+'mm';
      frame.tabIndex=-1;
      document.body.append(frame);
      let timer,media,view,entered=false,started=false;
      const job={frame,cleanup,media:null};activePrint=job;statusKey='preparing';renderMeta();
      function cleanup(completed=false) {
        if(activePrint!==job)return;
        clearTimeout(timer);view?.removeEventListener('afterprint',afterPrint);window.removeEventListener('afterprint',afterPrint);
        if(media?.removeEventListener)media.removeEventListener('change',mediaChanged);else media?.removeListener?.(mediaChanged);
        window.removeEventListener('focus',returned);document.removeEventListener('visibilitychange',visible);
        activePrint=null;frame.remove();printRecovery.hidden=true;printRecoveryHint.hidden=true;
        statusKey=completed?'printed':'';
        const refresh=pendingRefresh||pendingSelectedId!==null;
        if(pendingSelectedId!==null){selectedId=pendingSelectedId;sheetIndex=0;}
        pendingSelectedId=null;pendingRefresh=false;renderList();renderMeta();
        // Revalidate saved data after the sheet closes; an open(id) request must
        // not change the job currently owned by the native print dialog.
        if(completed||refresh)prepare(refresh);
      }
      function afterPrint(){cleanup(true);}
      function showRecovery(){if(activePrint!==job||!started)return;printRecovery.hidden=false;printRecoveryHint.hidden=false;printRecovery.disabled=Boolean(media?.matches);}
      function returned(){showRecovery();}
      function visible(){if(document.visibilityState==='visible')showRecovery();}
      function mediaChanged(event){if(event.matches){entered=true;printRecovery.disabled=true;}else if(entered)cleanup(true);}
      try {
        if(capturedBatch.pageCount>2)await new Promise(resolve=>window.requestAnimationFrame(resolve));
        if(activePrint!==job)return;
        const doc=frameDocument(frame,core.renderDocument(capturedBatch,{barcodeImages:capturedBarcodes}));
        await readyDocument(doc);
        if(activePrint!==job)return;
        if(token!==revision||!sourceIsCurrent(signature))throw new Error('STALE');
        if(doc.querySelectorAll('.page').length!==capturedBatch.pageCount||doc.querySelectorAll('.barcode').length!==capturedBatch.labelCount)throw new Error('PRINT_CONTENT');
        view=frame.contentWindow;if(typeof view?.print!=='function')throw new Error('PRINT');
        view.addEventListener('afterprint',afterPrint);window.addEventListener('afterprint',afterPrint);
        media=view.matchMedia?.('print');job.media=media;entered=Boolean(media?.matches);
        if(media?.addEventListener)media.addEventListener('change',mediaChanged);else media?.addListener?.(mediaChanged);
        window.addEventListener('focus',returned);document.addEventListener('visibilitychange',visible);
        timer=setTimeout(showRecovery,8000);
        statusKey='printing';renderMeta();
        view.focus();started=true;view.print();
        // Keep the print document alive for nonblocking mobile print sheets.
        // The guard clears only on actual afterprint/media completion.
      } catch(error) {
        cleanup(false);
        if(token!==revision)return;
        ready=false;errorKey=error.message==='STALE'?'changed':/IMAGE/.test(error.message)?'imageError':'error';statusKey='';renderMeta();
      }
    }
    function enhance() {
      for(const card of document.querySelectorAll('#invListContainer .inv-card[data-invoice-id]')) {
        const actions=card.querySelector('.inv-card-actions');if(!actions||actions.querySelector('[data-wf-package-action]'))continue;
        const id=card.dataset.invoiceId;
        const action=button('title','btn btn-s',event=>{event.stopPropagation();open(id);},'label');action.dataset.wfPackageAction='';actions.prepend(action);
        const archived=(ops.state().invoices||[]).find(item=>String(item.id)===id)?.archived;
        if(!archived){
          const archive=make('button','btn btn-s');archive.type='button';archive.dataset.wfArchiveAction='';archive.textContent=ops.label('invoice-archive');
          archive.dataset.wfOpsLabel='invoice-archive';
          archive.addEventListener('click',event=>{event.stopPropagation();window.WFInvoiceArchive?.archive(id);});actions.append(archive);
        }
      }
    }
    function open(invoiceId) {
      if(invoiceId!=null)chooseInvoice(invoiceId);
      ops.open('package-labels');
      if(selectedId&&window.matchMedia('(max-width:800px)').matches)chooser.open=false;
    }
    window.WFPackageLabels={open,print,refresh:()=>prepare(true),captureIdentity:captureInvoiceIdentity,enhance};
    const invList=document.getElementById('invListContainer');
    if(invList)new window.MutationObserver(enhance).observe(invList,{childList:true});
    const toolbar=document.querySelector('#page-invoices .wf-heading-actions')||document.querySelector('#page-invoices .co-toolbar-row');
    if(toolbar){
      const shortcut=button('title','btn btn-s',()=>open(),'label');shortcut.id='wfPackageLabelsOpen';toolbar.append(shortcut);
      const archive=make('button','btn btn-s');archive.type='button';archive.id='wfInvoiceArchiveOpen';archive.dataset.wfOpsLabel='invoice-archive';archive.textContent=ops.label('invoice-archive');archive.addEventListener('click',()=>window.WFInvoiceArchive?.open());toolbar.append(archive);
    }
    if(window.ResizeObserver)new window.ResizeObserver(scalePreview).observe(stage);
    window.addEventListener('resize',scalePreview,{passive:true});
    document.addEventListener('DOMContentLoaded',registerGuard,{once:true});window.addEventListener('load',registerGuard,{once:true});registerGuard();
    enhance();translate();
  }
})(typeof window==='object'?window:globalThis,function(){
  'use strict';
  const clone=value=>JSON.parse(JSON.stringify(value));
  const own=(value,key)=>Object.prototype.hasOwnProperty.call(value||{},key);
  function readProfilePreference(storage,core){
    const fallback=core.defaultProfileId||'tw2008';
    try{const id=storage?.getItem('wf_package_label_profile_v1');return own(core.profiles||{},id)?id:fallback;}catch(_){return fallback;}
  }
  function writeProfilePreference(storage,id,core){
    if(!own(core.profiles||{},id)||!storage?.setItem)return false;
    try{storage.setItem('wf_package_label_profile_v1',id);return true;}catch(_){return false;}
  }
  function captureIdentity(invoice,companyLogo,now=new Date().toISOString()){
    const result={...invoice};
    if(!own(result,'packageLabelSnapshot'))result.packageLabelSnapshot={version:1,companyLogo:companyLogo||'',customerLogo:invoice.companyLogo??null,capturedAt:now};
    return result;
  }
  function resolveInvoiceSource(state,id){
    const record=(state.invoices||[]).find(invoice=>String(invoice.id)===String(id));
    if(!record)throw new Error('MISSING_INVOICE');
    const invoice=clone(record),snapshot=record.packageLabelSnapshot;
    const companyLogo=own(record,'packageLabelSnapshot')?(snapshot&&own(snapshot,'companyLogo')?snapshot.companyLogo:''):state.settings?.logo||'';
    if(snapshot&&own(snapshot,'customerLogo'))invoice.companyLogo=snapshot.customerLogo;
    return {record,invoice,companyLogo};
  }
  function barcodeBits(value,encode){
    if(typeof value!=='string'||!value||!/^[\x20-\x7e]+$/.test(value)||typeof encode!=='function')throw new Error('BARCODE');
    const target={};
    try{encode(target,value,{format:'CODE128',displayValue:false,width:1,margin:10});}catch(_){throw new Error('BARCODE');}
    const bits=target.encodings?.map(part=>part.data).join('');
    if(!bits||!/^[01]+$/.test(bits))throw new Error('BARCODE');
    return {value,bits,quiet:10};
  }
  function withTimeout(promise,timeout,message){
    return new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>reject(new Error(message)),timeout);
      Promise.resolve(promise).then(value=>{clearTimeout(timer);resolve(value);},error=>{clearTimeout(timer);reject(error);});
    });
  }
  function waitForImage(image,timeout=12000){
    const loaded=new Promise((resolve,reject)=>{
      let timer;
      const finish=error=>{clearTimeout(timer);image.removeEventListener('load',ready);image.removeEventListener('error',failed);error?reject(error):resolve(image);};
      const ready=()=>finish(image.naturalWidth>0&&image.naturalHeight>0?null:new Error('IMAGE_LOAD'));
      const failed=()=>finish(new Error('IMAGE_LOAD'));
      if(image.complete){ready();return;}
      image.addEventListener('load',ready,{once:true});image.addEventListener('error',failed,{once:true});
      timer=setTimeout(()=>finish(new Error('IMAGE_TIMEOUT')),timeout);
    });
    return withTimeout(loaded.then(async item=>{if(typeof item.decode==='function'){try{await item.decode();}catch(_){throw new Error('IMAGE_LOAD');}}}),timeout,'IMAGE_TIMEOUT');
  }
  return {captureIdentity,resolveInvoiceSource,barcodeBits,waitForImage,withTimeout,readProfilePreference,writeProfilePreference};
});
