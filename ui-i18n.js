// Only authored UI bindings are translated. Product names, notes, inputs and records are never traversed.
(function(root){'use strict';
const COPY={
  "Close": {
    "en": "Close",
    "ar": "إغلاق",
    "tr": "Kapat",
    "fr": "Fermer",
    "ru": "Закрыть"
  },
  "Restore Backup": {
    "en": "Restore Backup",
    "ar": "استعادة النسخة الاحتياطية",
    "tr": "Yedeği Geri Yükle",
    "fr": "Restaurer une sauvegarde",
    "ru": "Восстановить копию"
  },
  "Current data will be replaced with the backup.": {
    "ar": "سيتم استبدال البيانات الحالية بالنسخة الاحتياطية.",
    "en": "Current data will be replaced with the backup.",
    "tr": "Mevcut veriler yedekle değiştirilecek.",
    "fr": "Les données actuelles seront remplacées par la sauvegarde.",
    "ru": "Текущие данные будут заменены копией."
  },
  "Last backup": {
    "en": "Last backup",
    "ar": "آخر نسخة",
    "tr": "Son yedek",
    "fr": "Dernière sauvegarde",
    "ru": "Последняя копия"
  },
  "⚠️ Current clients, products, invoices and payments will be replaced.": {
    "en": "⚠️ Current clients, products, invoices and payments will be replaced.",
    "ar": "⚠️ سيتم استبدال العملاء والمنتجات والفواتير والدفعات الحالية.",
    "tr": "⚠️ Mevcut müşteriler, ürünler, faturalar ve ödemeler değiştirilecek.",
    "fr": "⚠️ Les clients, produits, factures et paiements actuels seront remplacés.",
    "ru": "⚠️ Текущие клиенты, товары, счета и платежи будут заменены."
  },
  "Restoring…": {
    "ar": "جارٍ الاستعادة…",
    "en": "Restoring…",
    "tr": "Geri yükleniyor…",
    "fr": "Restauration…",
    "ru": "Восстановление…"
  },
  "Cancel": {
    "en": "Cancel",
    "ar": "إلغاء",
    "tr": "İptal",
    "fr": "Annuler",
    "ru": "Отмена"
  },
  "Restore Now": {
    "en": "Restore Now",
    "ar": "استعادة الآن",
    "tr": "Şimdi Geri Yükle",
    "fr": "Restaurer maintenant",
    "ru": "Восстановить сейчас"
  },
  "Choose another account": {
    "en": "Choose another account",
    "ar": "اختيار حساب آخر",
    "tr": "Başka hesap seç",
    "fr": "Choisir un autre compte",
    "ru": "Выбрать другой аккаунт"
  },
  "Continue to the app": {
    "en": "Continue to the app",
    "ar": "الدخول إلى البرنامج",
    "tr": "Uygulamaya devam et",
    "fr": "Continuer vers l’application",
    "ru": "Перейти в приложение"
  },
  "Confirm Delete": {
    "en": "Confirm Delete",
    "ar": "تأكيد الحذف",
    "tr": "Silmeyi Onayla",
    "fr": "Confirmer la suppression",
    "ru": "Подтвердить удаление"
  },
  "This action cannot be undone": {
    "en": "This action cannot be undone",
    "ar": "هذا الإجراء لا يمكن التراجع عنه",
    "tr": "Bu işlem geri alınamaz",
    "fr": "Cette action est irréversible",
    "ru": "Это действие нельзя отменить"
  },
  "This item will be permanently deleted": {
    "en": "This item will be permanently deleted",
    "ar": "سيتم حذف هذا العنصر نهائياً",
    "tr": "Bu öğe kalıcı olarak silinecek",
    "fr": "Cet élément sera supprimé définitivement",
    "ru": "Этот элемент будет удалён навсегда"
  },
  "Type the confirmation word:": {
    "ar": "اكتب \"حذف\" للتأكيد:",
    "en": "Type the confirmation word:",
    "tr": "Onay sözcüğünü yazın:",
    "fr": "Saisissez le mot de confirmation :",
    "ru": "Введите слово подтверждения:"
  },
  "Type:": {
    "en": "Type:",
    "ar": "اكتب:",
    "tr": "Yazın:",
    "fr": "Saisissez :",
    "ru": "Введите:"
  },
  "Delete": {
    "en": "Delete",
    "ar": "حذف",
    "tr": "Sil",
    "fr": "Supprimer",
    "ru": "Удалить"
  },
  "🗑️ Delete": {
    "en": "🗑️ Delete",
    "ar": "🗑️ حذف",
    "tr": "🗑️ Sil",
    "fr": "🗑️ Supprimer",
    "ru": "🗑️ Удалить"
  },
  "Confirm": {
    "en": "Confirm",
    "ar": "تأكيد",
    "tr": "Onayla",
    "fr": "Confirmer",
    "ru": "Подтвердить"
  },
  "invoices": {
    "en": "invoices",
    "ar": "فاتورة",
    "tr": "fatura",
    "fr": "factures",
    "ru": "счетов"
  },
  "Clear Cart": {
    "en": "Clear Cart",
    "ar": "مسح السلة",
    "tr": "Sepeti Temizle",
    "fr": "Vider le panier",
    "ru": "Очистить корзину"
  },
  "Quick Barcode": {
    "en": "Quick Barcode",
    "ar": "باركود سريع",
    "tr": "Hızlı Barkod",
    "fr": "Lecture rapide de code-barres",
    "ru": "Быстрый сканер штрихкодов"
  },
  "Invoice management — WOW Furniture": {
    "ar": "نظام إدارة الفواتير — WOW Furniture",
    "en": "Invoice management — WOW Furniture",
    "tr": "Fatura yönetimi — WOW Furniture",
    "fr": "Gestion des factures — WOW Furniture",
    "ru": "Управление счетами — WOW Furniture"
  },
  "✨ AI": {
    "en": "✨ AI",
    "ar": "✨ ذكاء اصطناعي",
    "tr": "✨ Yapay zekâ",
    "fr": "✨ IA",
    "ru": "✨ ИИ"
  },
  "Today's Tip": {
    "en": "Today's Tip",
    "ar": "نصيحة اليوم",
    "tr": "Günün İpucu",
    "fr": "Conseil du jour",
    "ru": "Совет дня"
  },
  "Sunday": {
    "en": "Sunday",
    "ar": "الأحد",
    "tr": "Pazar",
    "fr": "Dimanche",
    "ru": "Воскресенье"
  },
  "Refresh": {
    "ar": "تحديث",
    "en": "Refresh",
    "tr": "Yenile",
    "fr": "Actualiser",
    "ru": "Обновить"
  },
  "USD → TRY": {
    "en": "USD → TRY",
    "ar": "USD → TRY",
    "tr": "USD → TRY",
    "fr": "USD → TRY",
    "ru": "USD → TRY"
  },
  "LIVE": {
    "en": "LIVE",
    "ar": "مباشر",
    "tr": "Canlı",
    "fr": "EN DIRECT",
    "ru": "В ЭФИРЕ"
  },
  "EUR → USD": {
    "en": "EUR → USD",
    "ar": "EUR → USD",
    "tr": "EUR → USD",
    "fr": "EUR → USD",
    "ru": "EUR → USD"
  },
  "TRY → USD": {
    "en": "TRY → USD",
    "ar": "TRY → USD",
    "tr": "TRY → USD",
    "fr": "TRY → USD",
    "ru": "TRY → USD"
  },
  "USD → EUR": {
    "en": "USD → EUR",
    "ar": "USD → EUR",
    "tr": "USD → EUR",
    "fr": "USD → EUR",
    "ru": "USD → EUR"
  },
  "EUR → TRY": {
    "en": "EUR → TRY",
    "ar": "EUR → TRY",
    "tr": "EUR → TRY",
    "fr": "EUR → TRY",
    "ru": "EUR → TRY"
  },
  "TRY → EUR": {
    "en": "TRY → EUR",
    "ar": "TRY → EUR",
    "tr": "TRY → EUR",
    "fr": "TRY → EUR",
    "ru": "TRY → EUR"
  },
  "Account Statement": {
    "ar": "كشف الحساب",
    "en": "Account Statement",
    "tr": "Hesap Ekstresi",
    "fr": "Relevé de compte",
    "ru": "Выписка по счёту"
  },
  "Back": {
    "en": "Back",
    "ar": "رجوع",
    "tr": "Geri",
    "fr": "Retour",
    "ru": "Назад"
  },
  "👤 Add Client": {
    "en": "👤 Add Client",
    "ar": "👤 إضافة عميل",
    "tr": "👤 Müşteri Ekle",
    "fr": "Ajouter un client",
    "ru": "Добавить клиента"
  },
  "Choose client type to continue": {
    "en": "Choose client type to continue",
    "ar": "اختر نوع العميل للمتابعة",
    "tr": "Devam etmek için müşteri tipini seçin",
    "fr": "Choisissez le type de client pour continuer",
    "ru": "Выберите тип клиента, чтобы продолжить"
  },
  "External": {
    "en": "External",
    "ar": "خارجي",
    "tr": "Dış",
    "fr": "Export",
    "ru": "Экспорт"
  },
  "International client — Dollar & Euro invoice": {
    "en": "International client — Dollar & Euro invoice",
    "ar": "عميل دولي — فاتورة بالدولار واليورو",
    "tr": "Uluslararası müşteri — Dolar ve Euro faturası",
    "fr": "Client international — facturation en dollars américains et en euros",
    "ru": "Международный клиент — счета в долларах США и евро"
  },
  "Internal Retail": {
    "en": "Internal Retail",
    "ar": "داخلي مفرق",
    "tr": "İç Perakende",
    "fr": "Vente au détail locale",
    "ru": "Розница внутри страны"
  },
  "Local retail client — Turkish Lira invoice": {
    "en": "Local retail client — Turkish Lira invoice",
    "ar": "عميل محلي مفرق — فاتورة بالليرة التركية",
    "tr": "Yerel perakende müşteri — Türk Lirası faturası",
    "fr": "Client local au détail — facturation en livres turques",
    "ru": "Розничный клиент внутри страны — счета в турецких лирах"
  },
  "Internal Wholesale": {
    "en": "Internal Wholesale",
    "ar": "داخلي جملة",
    "tr": "İç Toptan",
    "fr": "Vente en gros locale",
    "ru": "Опт внутри страны"
  },
  "Local wholesale client — Turkish Lira invoice": {
    "en": "Local wholesale client — Turkish Lira invoice",
    "ar": "عميل محلي جملة — فاتورة بالليرة التركية",
    "tr": "Yerel toptan müşteri — Türk Lirası faturası",
    "fr": "Client local en gros — facturation en livres turques",
    "ru": "Оптовый клиент внутри страны — счета в турецких лирах"
  },
  "Fill in client information": {
    "en": "Fill in client information",
    "ar": "املأ بيانات العميل",
    "tr": "Müşteri bilgilerini doldurun",
    "fr": "Renseignez les informations du client",
    "ru": "Заполните данные клиента"
  },
  "🌍 External": {
    "en": "🌍 External",
    "ar": "🌍 خارجي",
    "tr": "🌍 Dış Müşteri",
    "fr": "🌍 Export",
    "ru": "🌍 Экспорт"
  },
  "STAR Furniture": {
    "en": "STAR Furniture",
    "ar": "النجم موبيليا",
    "tr": "STAR Mobilya",
    "fr": "WOW Furniture",
    "ru": "WOW Furniture"
  },
  "Ahmed Al-Rashid": {
    "en": "Ahmed Al-Rashid",
    "ar": "أحمد الراشد",
    "tr": "Ahmet Yılmaz",
    "fr": "Marie Dupont",
    "ru": "Иван Иванов"
  },
  "Riyadh": {
    "en": "Riyadh",
    "ar": "أنقرة شارع السرور C/2 ",
    "tr": "İstanbul",
    "fr": "Paris",
    "ru": "Москва"
  },
  "+966 5x xxx xxxx": {
    "en": "+966 5x xxx xxxx",
    "ar": "+966 5x xxx xxxx",
    "tr": "+90 5xx xxx xxxx",
    "fr": "+90 5xx xxx xxxx",
    "ru": "+90 5xx xxx xxxx"
  },
  "info@company.com": {
    "en": "info@company.com",
    "ar": "info@company.com",
    "tr": "info@sirket.com",
    "fr": "info@company.com",
    "ru": "info@company.com"
  },
  "www.company.com": {
    "en": "www.company.com",
    "ar": "www.company.com",
    "tr": "www.sirket.com",
    "fr": "www.company.com",
    "ru": "www.company.com"
  },
  "Save Company": {
    "en": "Save Company",
    "ar": "حفظ الشركة",
    "tr": "Şirketi Kaydet",
    "fr": "Enregistrer la société",
    "ru": "Сохранить компанию"
  },
  "Reset": {
    "en": "Reset",
    "ar": "إعادة تعيين",
    "tr": "Sıfırla",
    "fr": "Réinitialiser",
    "ru": "Сбросить"
  },
  "📦 Add Product": {
    "en": "📦 Add Product",
    "ar": "📦 إضافة منتج",
    "tr": "📦 Ürün Ekle",
    "fr": "Ajouter un produit",
    "ru": "Добавить товар"
  },
  "Choose product type to continue": {
    "en": "Choose product type to continue",
    "ar": "اختر نوع القطعة للمتابعة",
    "tr": "Devam etmek için ürün tipini seçin",
    "fr": "Choisissez le type de produit pour continuer",
    "ru": "Выберите тип товара, чтобы продолжить"
  },
  "Save": {
    "en": "Save",
    "ar": "حفظ",
    "tr": "Kaydet",
    "fr": "Enregistrer",
    "ru": "Сохранить"
  },
  "Clear": {
    "en": "Clear",
    "ar": "تفريغ",
    "tr": "Temizle",
    "fr": "Effacer",
    "ru": "Очистить"
  },
  "Selected Type": {
    "en": "Selected Type",
    "ar": "النوع المختار",
    "tr": "Seçilen Tip",
    "fr": "Type sélectionné",
    "ru": "Выбранный тип"
  },
  "🔄 Change": {
    "en": "🔄 Change",
    "ar": "🔄 تغيير",
    "tr": "🔄 Değiştir",
    "fr": "🔄 Changer",
    "ru": "🔄 Изменить"
  },
  "Delete Image": {
    "en": "Delete Image",
    "ar": "حذف الصورة",
    "tr": "Görseli Sil",
    "fr": "Supprimer l’image",
    "ru": "Удалить изображение"
  },
  "A": {
    "en": "A",
    "ar": "أ",
    "tr": "A",
    "fr": "A",
    "ru": "A"
  },
  "B": {
    "en": "B",
    "ar": "ب",
    "tr": "B",
    "fr": "B",
    "ru": "B"
  },
  "C": {
    "en": "C",
    "ar": "ج",
    "tr": "C",
    "fr": "C",
    "ru": "C"
  },
  "Product Name": {
    "en": "Product Name",
    "ar": "اسم القطعة",
    "tr": "Ürün Adı",
    "fr": "Nom du produit",
    "ru": "Название товара"
  },
  "HS Code": {
    "en": "HS Code",
    "ar": "كود HS",
    "tr": "HS Kodu",
    "fr": "Code SH",
    "ru": "Код ТН ВЭД"
  },
  "Select HS code...": {
    "en": "Select HS code...",
    "ar": "اختر كود HS...",
    "tr": "HS kodu seçin...",
    "fr": "Sélectionner un code SH…",
    "ru": "Выберите код ТН ВЭД…"
  },
  "Description": {
    "en": "Description",
    "ar": "الوصف",
    "tr": "Açıklama",
    "fr": "Description",
    "ru": "Описание"
  },
  "Select description...": {
    "en": "Select description...",
    "ar": "اختر الوصف...",
    "tr": "Açıklama seçin...",
    "fr": "Sélectionner une description…",
    "ru": "Выберите описание…"
  },
  "Weight (kg)": {
    "en": "Weight (kg)",
    "ar": "الوزن (كجم)",
    "tr": "Ağırlık (kg)",
    "fr": "Poids (kg)",
    "ru": "Вес (кг)"
  },
  "Auto": {
    "en": "Auto",
    "ar": "تلقائي",
    "tr": "Otomatik",
    "fr": "Auto",
    "ru": "Авто"
  },
  "Packet Count": {
    "en": "Packet Count",
    "ar": "عدد الباكيت",
    "tr": "Paket Sayısı",
    "fr": "Nombre de colis",
    "ru": "Количество упаковок"
  },
  "CBM Volume": {
    "en": "CBM Volume",
    "ar": "حجم CBM",
    "tr": "CBM Hacmi",
    "fr": "Volume (m³)",
    "ru": "Объём (м³)"
  },
  "Color": {
    "en": "Color",
    "ar": "اللون",
    "tr": "Renk",
    "fr": "Couleur",
    "ru": "Цвет"
  },
  "Dimensions (cm)": {
    "en": "Dimensions (cm)",
    "ar": "الأبعاد (سم)",
    "tr": "Boyutlar (cm)",
    "fr": "Dimensions (cm)",
    "ru": "Размеры (см)"
  },
  "Shipping Package Dimensions (cm)": {
    "en": "Shipping Package Dimensions (cm)",
    "ar": "أبعاد الباكيت للشحن (سم)",
    "tr": "Kargo Paketi Boyutları (cm)",
    "fr": "Dimensions du colis (cm)",
    "ru": "Размеры упаковки (см)"
  },
  "Add Package": {
    "en": "Add Package",
    "ar": "إضافة باكيت",
    "tr": "Paket Ekle",
    "fr": "Ajouter un colis",
    "ru": "Добавить упаковку"
  },
  "Total CBM": {
    "en": "Total CBM",
    "ar": "CBM الإجمالي",
    "tr": "Toplam CBM",
    "fr": "Volume total (m³)",
    "ru": "Общий объём (м³)"
  },
  "Total Weight": {
    "en": "Total Weight",
    "ar": "الوزن الإجمالي",
    "tr": "Toplam Ağırlık",
    "fr": "Poids total",
    "ru": "Общий вес"
  },
  "Archive": {
    "en": "Archive",
    "ar": "أرشيف",
    "tr": "Arşiv",
    "fr": "Archives",
    "ru": "Архив"
  },
  "Clear Filter": {
    "en": "Clear Filter",
    "ar": "إلغاء الفلتر",
    "tr": "Filtreyi Kaldır",
    "fr": "Effacer le filtre",
    "ru": "Сбросить фильтр"
  },
  "✏️ Create Invoice": {
    "en": "✏️ Create Invoice",
    "ar": "✏️ إنشاء فاتورة",
    "tr": "✏️ Yeni Fatura",
    "fr": "Créer une facture",
    "ru": "Создать счёт"
  },
  "Choose invoice type to continue": {
    "en": "Choose invoice type to continue",
    "ar": "اختر نوع الفاتورة للمتابعة",
    "tr": "Devam etmek için fatura tipini seçin",
    "fr": "Choisissez le type de facture pour continuer",
    "ru": "Выберите тип счёта, чтобы продолжить"
  },
  "International invoice — Dollar & Euro": {
    "en": "International invoice — Dollar & Euro",
    "ar": "فاتورة دولية — بالدولار واليورو",
    "tr": "Uluslararası fatura — Dolar ve Euro",
    "fr": "Facture internationale — dollars américains et euros",
    "ru": "Международный счёт — доллары США и евро"
  },
  "Local retail invoice — Turkish Lira": {
    "en": "Local retail invoice — Turkish Lira",
    "ar": "فاتورة محلية مفرق — بالليرة التركية",
    "tr": "Yerel perakende fatura — Türk Lirası",
    "fr": "Facture locale au détail — livres turques",
    "ru": "Счёт для розничной продажи внутри страны — турецкие лиры"
  },
  "Local wholesale invoice — Turkish Lira": {
    "en": "Local wholesale invoice — Turkish Lira",
    "ar": "فاتورة محلية جملة — بالليرة التركية",
    "tr": "Yerel toptan fatura — Türk Lirası",
    "fr": "Facture locale en gros — livres turques",
    "ru": "Счёт для оптовой продажи внутри страны — турецкие лиры"
  },
  "Invoice Details": {
    "en": "Invoice Details",
    "ar": "تفاصيل الفاتورة",
    "tr": "Fatura Detayları",
    "fr": "Détails de la facture",
    "ru": "Данные счёта"
  },
  "Invoice No": {
    "en": "Invoice No",
    "ar": "رقم الفاتورة",
    "tr": "Fatura No",
    "fr": "N° de facture",
    "ru": "Номер счёта"
  },
  "Company": {
    "en": "Company",
    "ar": "الشركة",
    "tr": "Şirket",
    "fr": "Société",
    "ru": "Компания"
  },
  "Country": {
    "en": "Country",
    "ar": "الدولة",
    "tr": "Ülke",
    "fr": "Pays",
    "ru": "Страна"
  },
  "Province": {
    "en": "Province",
    "ar": "المحافظة",
    "tr": "İl",
    "fr": "Région",
    "ru": "Регион"
  },
  "Registration Date": {
    "en": "Registration Date",
    "ar": "تاريخ التسجيل",
    "tr": "Kayıt Tarihi",
    "fr": "Date d’enregistrement",
    "ru": "Дата регистрации"
  },
  "Currency": {
    "ar": "العملة",
    "en": "Currency",
    "tr": "Para birimi",
    "fr": "Devise",
    "ru": "Валюта"
  },
  "Loading Date": {
    "en": "Loading Date",
    "ar": "تاريخ التحميل",
    "tr": "Yükleme Tarihi",
    "fr": "Date de chargement",
    "ru": "Дата погрузки"
  },
  "SHIPPING": {
    "en": "SHIPPING",
    "ar": "الشحن",
    "tr": "KARGO",
    "fr": "TRANSPORT",
    "ru": "ДОСТАВКА"
  },
  "👤 Buyer pays shipping costs": {
    "en": "👤 Buyer pays shipping costs",
    "ar": "👤 يدفع العميل تكلفة الشحن",
    "tr": "👤 Nakliye alıcıya ait",
    "fr": "👤 Transport à la charge du client",
    "ru": "👤 Доставка за счёт клиента"
  },
  "🏢 Company covers shipping costs": {
    "en": "🏢 Company covers shipping costs",
    "ar": "🏢 تتحمل الشركة تكاليف الشحن",
    "tr": "🏢 WOW Furniture nakliyeyi üstlenir",
    "fr": "🏢 Transport à la charge de la société",
    "ru": "🏢 Доставка за счёт компании"
  },
  "Plate Number": {
    "en": "Plate Number",
    "ar": "رقم اللوحة",
    "tr": "Plaka No",
    "fr": "Immatriculation",
    "ru": "Номерной знак"
  },
  "Truck Number": {
    "en": "Truck Number",
    "ar": "رقم الشاحنة",
    "tr": "Kamyon No",
    "fr": "N° du camion",
    "ru": "Номер грузовика"
  },
  "💵 Cash": {
    "en": "💵 Cash",
    "ar": "💵 نقداً",
    "tr": "💵 Nakit",
    "fr": "💵 Espèces",
    "ru": "💵 Наличные"
  },
  "🏦 Bank Transfer": {
    "en": "🏦 Bank Transfer",
    "ar": "🏦 تحويل بنكي",
    "tr": "🏦 Banka Transferi",
    "fr": "🏦 Virement bancaire",
    "ru": "🏦 Банковский перевод"
  },
  "💳 Credit Card": {
    "en": "💳 Credit Card",
    "ar": "💳 بطاقة ائتمان",
    "tr": "💳 Kredi Kartı",
    "fr": "💳 Carte bancaire",
    "ru": "💳 Банковская карта"
  },
  "📝 Check": {
    "en": "📝 Check",
    "ar": "📝 شيك",
    "tr": "📝 Çek",
    "fr": "📝 Chèque",
    "ru": "📝 Чек"
  },
  "📅 Installment": {
    "en": "📅 Installment",
    "ar": "📅 أقساط",
    "tr": "📅 Taksit",
    "fr": "📅 Paiement échelonné",
    "ru": "📅 Рассрочка"
  },
  "🌐 Western Union": {
    "en": "🌐 Western Union",
    "ar": "🌐 Western Union",
    "tr": "🌐 Western Union",
    "fr": "🌐 Western Union",
    "ru": "🌐 Western Union"
  },
  "📜 Letter of Credit": {
    "en": "📜 Letter of Credit",
    "ar": "📜 اعتماد مستندي",
    "tr": "📜 Akreditif",
    "fr": "📜 Crédit documentaire",
    "ru": "📜 Аккредитив"
  },
  "⏳ Deferred": {
    "en": "⏳ Deferred",
    "ar": "⏳ آجل",
    "tr": "⏳ Vadeli",
    "fr": "⏳ Paiement différé",
    "ru": "⏳ Отсрочка платежа"
  },
  "Notes": {
    "ar": "ملاحظات",
    "en": "Notes",
    "tr": "Notlar",
    "fr": "Notes",
    "ru": "Примечания"
  },
  "Edit": {
    "en": "Edit",
    "ar": "تعديل",
    "tr": "Düzenle",
    "fr": "Modifier",
    "ru": "Изменить"
  },
  "0 items": {
    "ar": "0 قطعة",
    "en": "0 items",
    "tr": "0 ürün",
    "fr": "0 article",
    "ru": "0 позиций"
  },
  "🔍 Search for a product...": {
    "en": "🔍 Search for a product...",
    "ar": "🔍 ابحث عن منتج...",
    "tr": "🔍 Ürün ara...",
    "fr": "🔍 Rechercher un produit…",
    "ru": "🔍 Поиск товара…"
  },
  "Search": {
    "ar": "بحث",
    "en": "Search",
    "tr": "Ara",
    "fr": "Rechercher",
    "ru": "Поиск"
  },
  "Search products": {
    "ar": "ابحث في المنتجات",
    "en": "Search products",
    "tr": "Ürünlerde ara",
    "fr": "Rechercher des produits",
    "ru": "Поиск товаров"
  },
  "Search clients": {
    "ar": "ابحث في العملاء",
    "en": "Search clients",
    "tr": "Müşterilerde ara",
    "fr": "Rechercher des clients",
    "ru": "Поиск клиентов"
  },
  "Search invoices": {
    "ar": "ابحث في الفواتير",
    "en": "Search invoices",
    "tr": "Faturalarda ara",
    "fr": "Rechercher des factures",
    "ru": "Поиск счетов"
  },
  "Scan barcode": {
    "ar": "مسح الباركود",
    "en": "Scan barcode",
    "tr": "Barkod tara",
    "fr": "Scanner un code-barres",
    "ru": "Сканировать штрихкод"
  },
  "CBM": {
    "en": "CBM",
    "ar": "CBM",
    "tr": "CBM",
    "fr": "CBM",
    "ru": "CBM"
  },
  "SUMMARY": {
    "en": "SUMMARY",
    "ar": "الملخص",
    "tr": "ÖZET",
    "fr": "RÉCAPITULATIF",
    "ru": "ИТОГИ"
  },
  "VAT": {
    "en": "VAT",
    "ar": "الضريبة",
    "tr": "KDV",
    "fr": "TVA",
    "ru": "НДС"
  },
  "PAYMENTS": {
    "en": "PAYMENTS",
    "ar": "الدفعات",
    "tr": "ÖDEMELER",
    "fr": "PAIEMENTS",
    "ru": "ПЛАТЕЖИ"
  },
  "EQUIVALENTS": {
    "en": "EQUIVALENTS",
    "ar": "معادلات",
    "tr": "EŞDEĞERLİKLER",
    "fr": "ÉQUIVALENTS",
    "ru": "ЭКВИВАЛЕНТЫ"
  },
  "TRY": {
    "en": "TRY",
    "ar": "TRY",
    "tr": "TRY",
    "fr": "TRY",
    "ru": "TRY"
  },
  "EUR": {
    "en": "EUR",
    "ar": "EUR",
    "tr": "EUR",
    "fr": "EUR",
    "ru": "EUR"
  },
  "PKTS": {
    "en": "PKTS",
    "ar": "طرود",
    "tr": "PAKET",
    "fr": "COLIS",
    "ru": "УПАКОВКИ"
  },
  "💵 USD — Dollar": {
    "en": "💵 USD — Dollar",
    "ar": "💵 USD — دولار",
    "tr": "💵 USD — Dolar",
    "fr": "💵 USD — Dollar",
    "ru": "💵 USD — Доллар"
  },
  "💶 EUR — Euro": {
    "en": "💶 EUR — Euro",
    "ar": "💶 EUR — يورو",
    "tr": "💶 EUR — Avro",
    "fr": "💶 EUR — Euro",
    "ru": "💶 EUR — Евро"
  },
  "🇹🇷 TRY — Türk Lirası": {
    "en": "🇹🇷 TRY — Türk Lirası",
    "ar": "🇹🇷 TRY — ليرة تركية",
    "tr": "🇹🇷 TRY — Türk Lirası",
    "fr": "🇹🇷 TRY — Livre turque",
    "ru": "🇹🇷 TRY — Турецкая лира"
  },
  "Currency differs from invoice": {
    "en": "Currency differs from invoice",
    "ar": "عملة مختلفة عن الفاتورة",
    "tr": "Fatura para biriminden farklı",
    "fr": "La devise diffère de celle de la facture",
    "ru": "Валюта отличается от валюты счёта"
  },
  "Accept & Convert": {
    "en": "Accept & Convert",
    "ar": "قبول وتحويل",
    "tr": "Kabul Et ve Dönüştür",
    "fr": "Accepter et convertir",
    "ru": "Принять и конвертировать"
  },
  "Accept": {
    "ar": "قبول",
    "en": "Accept",
    "tr": "Kabul et",
    "fr": "Accepter",
    "ru": "Принять"
  },
  "Keep original currency": {
    "ar": "إبقاء العملة الأصلية",
    "en": "Keep original currency",
    "tr": "Orijinal para birimini koru",
    "fr": "Conserver la devise d’origine",
    "ru": "Сохранить исходную валюту"
  },
  "Cash": {
    "en": "Cash",
    "ar": "نقداً",
    "tr": "Nakit",
    "fr": "Espèces",
    "ru": "Наличные"
  },
  "Bank Transfer": {
    "en": "Bank Transfer",
    "ar": "تحويل بنكي",
    "tr": "Banka Transferi",
    "fr": "Virement bancaire",
    "ru": "Банковский перевод"
  },
  "Credit Card": {
    "en": "Credit Card",
    "ar": "بطاقة ائتمان",
    "tr": "Kredi Kartı",
    "fr": "Carte bancaire",
    "ru": "Банковская карта"
  },
  "Check": {
    "en": "Check",
    "ar": "شيك",
    "tr": "Çek",
    "fr": "Chèque",
    "ru": "Чек"
  },
  "Installment": {
    "en": "Installment",
    "ar": "أقساط",
    "tr": "Taksit",
    "fr": "Paiement échelonné",
    "ru": "Рассрочка"
  },
  "Western Union": {
    "en": "Western Union",
    "ar": "Western Union",
    "tr": "Western Union",
    "fr": "Western Union",
    "ru": "Western Union"
  },
  "Deferred": {
    "en": "Deferred",
    "ar": "آجل",
    "tr": "Vadeli",
    "fr": "Paiement différé",
    "ru": "Отсрочка платежа"
  },
  "Exchange": {
    "en": "Exchange",
    "ar": "صراف",
    "tr": "Dövizci",
    "fr": "Bureau de change",
    "ru": "Обменный пункт"
  },
  "Other": {
    "en": "Other",
    "ar": "أخرى",
    "tr": "Diğer",
    "fr": "Autre",
    "ru": "Другое"
  },
  "Currency Calculator": {
    "en": "Currency Calculator",
    "ar": "حاسبة العملات",
    "tr": "Döviz hesaplayıcı",
    "fr": "Convertisseur de devises",
    "ru": "Конвертер валют"
  },
  "FROM": {
    "en": "FROM",
    "ar": "من",
    "tr": "GİRİŞ",
    "fr": "DE",
    "ru": "ИЗ"
  },
  "USD": {
    "en": "USD",
    "ar": "USD",
    "tr": "USD",
    "fr": "USD",
    "ru": "USD"
  },
  "TO": {
    "en": "TO",
    "ar": "إلى",
    "tr": "SONUÇ",
    "fr": "VERS",
    "ru": "В"
  },
  "QUICK AMOUNTS": {
    "en": "QUICK AMOUNTS",
    "ar": "مبالغ سريعة",
    "tr": "Hızlı tutarlar",
    "fr": "MONTANTS RAPIDES",
    "ru": "БЫСТРЫЕ СУММЫ"
  },
  "📷 Quick Barcode": {
    "en": "📷 Quick Barcode",
    "ar": "📷 باركود سريع",
    "tr": "📷 Hızlı Barkod",
    "fr": "📷 Lecture rapide de code-barres",
    "ru": "📷 Быстрый сканер штрихкодов"
  },
  "Scan barcode or search by model name": {
    "en": "Scan barcode or search by model name",
    "ar": "امسح الباركود أو ابحث باسم الموديل",
    "tr": "Barkodu tarayın veya model adını yazın",
    "fr": "Scannez le code-barres ou recherchez le modèle",
    "ru": "Сканируйте штрихкод или найдите модель"
  },
  "Point camera at barcode": {
    "en": "Point camera at barcode",
    "ar": "وجّه الكاميرا نحو الباركود",
    "tr": "Kamerayı barkoda doğrultun",
    "fr": "Orientez la caméra vers le code-barres",
    "ru": "Наведите камеру на штрихкод"
  },
  "Model name or barcode...": {
    "en": "Model name or barcode...",
    "ar": "اسم الموديل أو الباركود...",
    "tr": "Model adı veya barkod...",
    "fr": "Nom du modèle ou code-barres…",
    "ru": "Название модели или штрихкод…"
  },
  "Product found": {
    "en": "Product found",
    "ar": "تم العثور على المنتج",
    "tr": "Ürün bulundu",
    "fr": "Produit trouvé",
    "ru": "Товар найден"
  },
  "Choose a Price Tier": {
    "en": "Choose a Price Tier",
    "ar": "اختر إحدى الفئات",
    "tr": "Fiyat Kademesini Seçin",
    "fr": "Choisissez une catégorie de prix",
    "ru": "Выберите категорию цены"
  },
  "✕ Cancel": {
    "en": "✕ Cancel",
    "ar": "✕ إلغاء",
    "tr": "✕ İptal",
    "fr": "✕ Annuler",
    "ru": "✕ Отмена"
  },
  "Qty": {
    "en": "Qty",
    "ar": "الكمية",
    "tr": "Miktar",
    "fr": "Qté",
    "ru": "Кол-во"
  },
  "Total": {
    "en": "Total",
    "ar": "الإجمالي",
    "tr": "Toplam",
    "fr": "Total",
    "ru": "Итого"
  },
  "Add to Cart": {
    "en": "Add to Cart",
    "ar": "أضف للسلة",
    "tr": "Sepete Ekle",
    "fr": "Ajouter au panier",
    "ru": "Добавить в корзину"
  },
  "Change Tier": {
    "en": "Change Tier",
    "ar": "تغيير الفئة",
    "tr": "Kademeyi Değiştir",
    "fr": "Changer la catégorie",
    "ru": "Изменить категорию"
  },
  "Scan another": {
    "ar": "مسح آخر",
    "en": "Scan another",
    "tr": "Başka ürün tara",
    "fr": "Scanner un autre produit",
    "ru": "Сканировать другой товар"
  },
  "Product not found": {
    "en": "Product not found",
    "ar": "لم يُعثر على المنتج",
    "tr": "Ürün bulunamadı",
    "fr": "Produit introuvable",
    "ru": "Товар не найден"
  },
  "Check the model name or barcode": {
    "en": "Check the model name or barcode",
    "ar": "تأكد من اسم الموديل أو الباركود",
    "tr": "Model adını veya barkodu kontrol edin",
    "fr": "Vérifiez le nom du modèle ou le code-barres",
    "ru": "Проверьте название модели или штрихкод"
  },
  "📷 Scan another": {
    "en": "📷 Scan another",
    "ar": "📷 مسح منتج آخر",
    "tr": "📷 Başka ürün tara",
    "fr": "📷 Scanner un autre produit",
    "ru": "📷 Сканировать другой товар"
  },
  "🌐 Language": {
    "en": "🌐 Language",
    "ar": "🌐 اللغة",
    "tr": "🌐 Dil",
    "fr": "🌐 Langue",
    "ru": "🌐 Язык"
  },
  "App language": {
    "en": "App language",
    "ar": "لغة البرنامج",
    "tr": "Uygulama dili",
    "fr": "Langue de l’application",
    "ru": "Язык приложения"
  },
  "Choose the interface language. Your choice is saved on this device.": {
    "en": "Choose the interface language. Your choice is saved on this device.",
    "ar": "اختر لغة الواجهة. تتغير اللغة فورًا وتُحفظ على هذا الجهاز.",
    "tr": "Arayüz dilini seçin. Seçiminiz bu cihazda saklanır.",
    "fr": "Votre choix est enregistré sur cet appareil.",
    "ru": "Выбранный язык сохраняется на этом устройстве."
  },
  "Syrian flag": {
    "ar": "علم سوريا",
    "en": "Syrian flag",
    "tr": "Suriye bayrağı",
    "fr": "Drapeau syrien",
    "ru": "Флаг Сирии"
  },
  "WOW Furniture": {
    "en": "WOW Furniture",
    "ar": "واو موبيليا",
    "tr": "WOW Mobilya",
    "fr": "WOW Furniture",
    "ru": "WOW Furniture"
  },
  "Protect App Data": {
    "en": "Protect App Data",
    "ar": "حماية بيانات البرنامج",
    "tr": "Program Verilerini Koru",
    "fr": "Protéger les données",
    "ru": "Защита данных"
  },
  "Export a complete backup of clients, products, invoices, payments and settings, then restore it when needed.": {
    "en": "Export a complete backup of clients, products, invoices, payments and settings, then restore it when needed.",
    "ar": "تصدير نسخة كاملة من العملاء والمنتجات والفواتير والدفعات والإعدادات، واستعادتها عند الحاجة.",
    "tr": "Müşteriler, ürünler, faturalar, ödemeler ve ayarların tamamını yedekleyin ve gerektiğinde geri yükleyin.",
    "fr": "Exportez une sauvegarde complète des clients, produits, factures, paiements et paramètres, puis restaurez-la au besoin.",
    "ru": "Экспортируйте полную резервную копию клиентов, товаров, счетов, платежей и настроек и восстановите её при необходимости."
  },
  "Clients": {
    "en": "Clients",
    "ar": "العملاء",
    "tr": "Müşteriler",
    "fr": "Clients",
    "ru": "Клиенты"
  },
  "Products": {
    "en": "Products",
    "ar": "المنتجات",
    "tr": "Ürünler",
    "fr": "Produits",
    "ru": "Товары"
  },
  "Invoices": {
    "en": "Invoices",
    "ar": "الفواتير",
    "tr": "Faturalar",
    "fr": "Factures",
    "ru": "Счета"
  },
  "Payments": {
    "en": "Payments",
    "ar": "الدفعات",
    "tr": "Ödemeler",
    "fr": "Paiements",
    "ru": "Платежи"
  },
  "Backup": {
    "ar": "النسخ الاحتياطي",
    "en": "Backup",
    "tr": "Yedekleme",
    "fr": "Sauvegarde",
    "ru": "Резервная копия"
  },
  "Export Full Backup": {
    "en": "Export Full Backup",
    "ar": "تصدير نسخة كاملة",
    "tr": "Tam Yedek Dışa Aktar",
    "fr": "Exporter une sauvegarde complète",
    "ru": "Экспортировать полную копию"
  },
  "Restore a backup": {
    "ar": "استعادة نسخة",
    "en": "Restore a backup",
    "tr": "Yedeği geri yükle",
    "fr": "Restaurer une sauvegarde",
    "ru": "Восстановить копию"
  },
  "The backup includes core data and app settings. Restore starts only after your confirmation.": {
    "en": "The backup includes core data and app settings. Restore starts only after your confirmation.",
    "ar": "النسخة تشمل البيانات الأساسية وإعدادات البرنامج. الاستعادة لا تبدأ إلا بعد تأكيدك.",
    "tr": "Yedek temel verileri ve uygulama ayarlarını içerir. Geri yükleme yalnızca onayınızdan sonra başlar.",
    "fr": "La sauvegarde comprend les données principales et les paramètres. La restauration ne commence qu’après votre confirmation.",
    "ru": "Копия содержит основные данные и настройки. Восстановление начнётся только после подтверждения."
  },
  "Last backup: —": {
    "ar": "آخر نسخة: —",
    "en": "Last backup: —",
    "tr": "Son yedek: —",
    "fr": "Dernière sauvegarde : —",
    "ru": "Последняя копия: —"
  },
  "Google Drive Backup": {
    "en": "Google Drive Backup",
    "ar": "النسخ الاحتياطي على Google Drive",
    "tr": "Google Drive Yedekleme",
    "fr": "Sauvegarde Google Drive",
    "ru": "Резервная копия в Google Диске"
  },
  "One backup file is updated on the schedule you choose.": {
    "en": "One backup file is updated on the schedule you choose.",
    "ar": "نسخة واحدة يتم تحديثها حسب الجدول الذي تختاره.",
    "tr": "Seçtiğiniz programa göre tek bir yedek dosyası güncellenir.",
    "fr": "Un seul fichier est mis à jour selon la fréquence choisie.",
    "ru": "Один файл обновляется по выбранному расписанию."
  },
  "Not connected": {
    "en": "Not connected",
    "ar": "غير متصل",
    "tr": "Bağlı değil",
    "fr": "Non connecté",
    "ru": "Не подключено"
  },
  "Connect Google Account": {
    "en": "Connect Google Account",
    "ar": "ربط حساب Google",
    "tr": "Google Hesabını Bağla",
    "fr": "Connecter un compte Google",
    "ru": "Подключить аккаунт Google"
  },
  "Connect your account once. The account chooser will not appear when opening the app.": {
    "ar": "اربط الحساب مرة واحدة فقط. لن تظهر نافذة اختيار الحساب عند فتح البرنامج.",
    "en": "Connect your account once. The account chooser will not appear when opening the app.",
    "tr": "Hesabınızı bir kez bağlayın. Uygulama açılırken hesap seçimi gösterilmez.",
    "fr": "Connectez votre compte une fois. Le choix du compte ne s’affichera plus à l’ouverture.",
    "ru": "Подключите аккаунт один раз. Выбор аккаунта не будет появляться при открытии приложения."
  },
  "Size": {
    "en": "Size",
    "ar": "الحجم",
    "tr": "Boyut",
    "fr": "Taille",
    "ru": "Размер"
  },
  "Backup frequency": {
    "en": "Backup frequency",
    "ar": "تكرار النسخ",
    "tr": "Yedekleme sıklığı",
    "fr": "Fréquence des sauvegardes",
    "ru": "Частота копирования"
  },
  "Only one file is kept and updated.": {
    "en": "Only one file is kept and updated.",
    "ar": "يتم الاحتفاظ بملف واحد فقط وتحديثه.",
    "tr": "Yalnızca tek dosya tutulur ve güncellenir.",
    "fr": "Un seul fichier est conservé et mis à jour.",
    "ru": "Хранится и обновляется один файл."
  },
  "Daily": {
    "en": "Daily",
    "ar": "يومي",
    "tr": "Günlük",
    "fr": "Chaque jour",
    "ru": "Ежедневно"
  },
  "Weekly": {
    "en": "Weekly",
    "ar": "أسبوعي",
    "tr": "Haftalık",
    "fr": "Chaque semaine",
    "ru": "Еженедельно"
  },
  "Monthly": {
    "en": "Monthly",
    "ar": "شهري",
    "tr": "Aylık",
    "fr": "Chaque mois",
    "ru": "Ежемесячно"
  },
  "Only when I tap": {
    "en": "Only when I tap",
    "ar": "عند الضغط فقط",
    "tr": "Yalnızca dokununca",
    "fr": "Uniquement à ma demande",
    "ru": "Только по запросу"
  },
  "Back Up Now": {
    "en": "Back Up Now",
    "ar": "نسخ الآن",
    "tr": "Şimdi Yedekle",
    "fr": "Sauvegarder maintenant",
    "ru": "Создать копию сейчас"
  },
  "Restore backup": {
    "ar": "استعادة النسخة",
    "en": "Restore backup",
    "tr": "Yedeği geri yükle",
    "fr": "Restaurer la sauvegarde",
    "ru": "Восстановить копию"
  },
  "Open Google Drive": {
    "en": "Open Google Drive",
    "ar": "فتح Google Drive",
    "tr": "Google Drive’ı Aç",
    "fr": "Ouvrir Google Drive",
    "ru": "Открыть Google Диск"
  },
  "Disconnect Account": {
    "en": "Disconnect Account",
    "ar": "فصل الحساب",
    "tr": "Hesabı Ayır",
    "fr": "Déconnecter le compte",
    "ru": "Отключить аккаунт"
  },
  "Storage Status": {
    "en": "Storage Status",
    "ar": "حالة التخزين",
    "tr": "Depolama Durumu",
    "fr": "État du stockage",
    "ru": "Состояние хранилища"
  },
  "Storage used": {
    "en": "Storage used",
    "ar": "المساحة المستخدمة",
    "tr": "Kullanılan alan",
    "fr": "Espace utilisé",
    "ru": "Использовано места"
  },
  "Check Data Integrity": {
    "en": "Check Data Integrity",
    "ar": "فحص سلامة البيانات",
    "tr": "Veri Bütünlüğünü Kontrol Et",
    "fr": "Vérifier l’intégrité des données",
    "ru": "Проверить целостность данных"
  },
  "Company Logo": {
    "en": "Company Logo",
    "ar": "لوجو الشركة",
    "tr": "Şirket Logosu",
    "fr": "Logo de la société",
    "ru": "Логотип компании"
  },
  "WOW FURNITURE": {
    "en": "WOW FURNITURE",
    "ar": "واو فيرنيتشر",
    "tr": "WOW MOBİLYA",
    "fr": "WOW FURNITURE",
    "ru": "WOW FURNITURE"
  },
  "Version 2.0.0": {
    "en": "Version 2.0.0",
    "ar": "الإصدار 2.0.0",
    "tr": "Sürüm 2.0.0",
    "fr": "Version 2.0.0",
    "ru": "Версия 2.0.0"
  },
  "Invoice language": {
    "en": "Invoice language",
    "ar": "لغة الفاتورة",
    "tr": "Fatura dili",
    "fr": "Langue de la facture",
    "ru": "Язык счёта"
  },
  "Arabic": {
    "ar": "العربية",
    "en": "Arabic",
    "tr": "Arapça",
    "fr": "Arabe",
    "ru": "Арабский"
  },
  "Print": {
    "en": "Print",
    "ar": "طباعة",
    "tr": "Yazdır",
    "fr": "Imprimer",
    "ru": "Печать"
  },
  "Or enter the barcode manually…": {
    "ar": "أو أدخل الباركود يدوياً...",
    "en": "Or enter the barcode manually…",
    "tr": "Veya barkodu elle girin…",
    "fr": "Ou saisissez le code-barres…",
    "ru": "Или введите штрихкод вручную…"
  },
  "Close (Esc)": {
    "ar": "إغلاق (Esc)",
    "en": "Close (Esc)",
    "tr": "Kapat (Esc)",
    "fr": "Fermer (Échap)",
    "ru": "Закрыть (Esc)"
  },
  "Preview": {
    "en": "Preview",
    "ar": "معاينة",
    "tr": "Önizle",
    "fr": "Aperçu",
    "ru": "Предпросмотр"
  },
  "Cart": {
    "en": "Cart",
    "ar": "السلة",
    "tr": "Sepet",
    "fr": "Panier",
    "ru": "Корзина"
  },
  "Create Invoice": {
    "ar": "إنشاء الفاتورة",
    "en": "Create Invoice",
    "tr": "Fatura oluştur",
    "fr": "Créer une facture",
    "ru": "Создать счёт"
  },
  "Print & Share Options": {
    "en": "Print & Share Options",
    "ar": "خيارات الطباعة والمشاركة",
    "tr": "Yazdırma ve Paylaşım Seçenekleri",
    "fr": "Impression et partage",
    "ru": "Печать и отправка"
  },
  "🌐 Invoice Language": {
    "en": "🌐 Invoice Language",
    "ar": "🌐 لغة الفاتورة",
    "tr": "🌐 Fatura Dili",
    "fr": "🌐 Langue de la facture",
    "ru": "🌐 Язык счёта"
  },
  "Changes invoice text only — app and button language stays unchanged": {
    "en": "Changes invoice text only — app and button language stays unchanged",
    "ar": "تغيّر نص الفاتورة فقط — لغة البرنامج والأزرار لا تتغير",
    "tr": "Yalnızca fatura metni değişir — program ve düğme dili değişmez",
    "fr": "Seul le texte de la facture change ; la langue de l’application et des boutons reste inchangée",
    "ru": "Меняется только текст счёта; язык приложения и кнопок остаётся прежним"
  },
  "🔒 UI stays separate": {
    "en": "🔒 UI stays separate",
    "ar": "🔒 واجهة مستقلة",
    "tr": "🔒 Bağımsız arayüz",
    "fr": "🔒 Langue de l’interface indépendante",
    "ru": "🔒 Язык интерфейса задаётся отдельно"
  },
  "👁️ Show / Hide in Invoice": {
    "en": "👁️ Show / Hide in Invoice",
    "ar": "👁️ إظهار / إخفاء في الفاتورة",
    "tr": "👁️ Faturada Göster / Gizle",
    "fr": "👁️ Afficher ou masquer sur la facture",
    "ru": "👁️ Показать или скрыть в счёте"
  },
  "💱 Invoice Currency & Exchange Rates": {
    "en": "💱 Invoice Currency & Exchange Rates",
    "ar": "💱 عملة الفاتورة وأسعار الصرف",
    "tr": "💱 Fatura Para Birimi ve Döviz Kurları",
    "fr": "💱 Devise et taux de change de la facture",
    "ru": "💱 Валюта и курсы счёта"
  },
  "💵 Invoice Display Currency": {
    "en": "💵 Invoice Display Currency",
    "ar": "💵 عملة عرض الفاتورة",
    "tr": "💵 Fatura Görüntüleme Para Birimi",
    "fr": "💵 Devise d’affichage de la facture",
    "ru": "💵 Валюта отображения счёта"
  },
  "Choose currencies to show in the PDF exchange-rate section.": {
    "ar": "حدد العملات التي تريد ظهورها في قسم أسعار الصرف داخل PDF.",
    "en": "Choose currencies to show in the PDF exchange-rate section.",
    "tr": "PDF döviz kuru bölümünde gösterilecek para birimlerini seçin.",
    "fr": "Choisissez les devises à afficher dans les taux de change du PDF.",
    "ru": "Выберите валюты для раздела курсов в PDF."
  },
  "Currencies shown in exchange rates": {
    "en": "Currencies shown in exchange rates",
    "ar": "العملات الظاهرة في أسعار الصرف",
    "tr": "Kur bölümünde gösterilecek para birimleri",
    "fr": "Devises affichées dans les taux de change",
    "ru": "Валюты в разделе курсов"
  },
  "Share invoice": {
    "en": "Share invoice",
    "ar": "مشاركة الفاتورة",
    "tr": "Faturayı paylaş",
    "fr": "Partager la facture",
    "ru": "Поделиться счётом"
  },
  "Choose the file type, then use system sharing": {
    "ar": "اختر نوع الملف ثم شاركه من نافذة النظام",
    "en": "Choose the file type, then use system sharing",
    "tr": "Dosya türünü seçin, ardından sistem paylaşımını kullanın",
    "fr": "Choisissez le format, puis utilisez le partage système",
    "ru": "Выберите тип файла и используйте системную отправку"
  },
  "Ready to send and print": {
    "ar": "جاهز للإرسال والطباعة",
    "en": "Ready to send and print",
    "tr": "Göndermeye ve yazdırmaya hazır",
    "fr": "Prêt à envoyer et imprimer",
    "ru": "Готово к отправке и печати"
  },
  "Preparing…": {
    "en": "Preparing…",
    "ar": "جاري التجهيز…",
    "tr": "Hazırlanıyor…",
    "fr": "Préparation…",
    "ru": "Подготовка…"
  },
  "Fully editable": {
    "ar": "قابل للتعديل بالكامل",
    "en": "Fully editable",
    "tr": "Tamamen düzenlenebilir",
    "fr": "Entièrement modifiable",
    "ru": "Полностью редактируемый"
  },
  "No download. The system share window opens directly.": {
    "ar": "لن يتم تنزيل الملف. سيُفتح مربع مشاركة النظام مباشرة.",
    "en": "No download. The system share window opens directly.",
    "tr": "İndirme yapılmaz. Sistem paylaşım penceresi doğrudan açılır.",
    "fr": "Sans téléchargement. La fenêtre de partage système s’ouvre directement.",
    "ru": "Без скачивания. Откроется системное окно отправки."
  },
  "⚠️ Camera unavailable — enter the barcode manually": {
    "ar": "⚠️ تعذّر فتح الكاميرا — استخدم الإدخال اليدوي",
    "en": "⚠️ Camera unavailable — enter the barcode manually",
    "tr": "⚠️ Kamera açılamadı — barkodu elle girin",
    "fr": "⚠️ Caméra indisponible — saisissez le code-barres",
    "ru": "⚠️ Камера недоступна — введите штрихкод вручную"
  },
  "⚠️ Enter the barcode manually": {
    "ar": "⚠️ استخدم الإدخال اليدوي",
    "en": "⚠️ Enter the barcode manually",
    "tr": "⚠️ Barkodu elle girin",
    "fr": "⚠️ Saisissez le code-barres",
    "ru": "⚠️ Введите штрихкод вручную"
  },
  "✏️ Edit mode enabled": {
    "ar": "✏️ وضع التعديل نشط",
    "en": "✏️ Edit mode enabled",
    "tr": "✏️ Düzenleme modu etkin",
    "fr": "✏️ Mode modification activé",
    "ru": "✏️ Режим редактирования включён"
  },
  "Disabled": {
    "ar": "غير مفعّل",
    "en": "Disabled",
    "tr": "Kapalı",
    "fr": "Désactivé",
    "ru": "Отключено"
  },
  "In Turkish lira": {
    "ar": "بالليرة التركية",
    "en": "In Turkish lira",
    "tr": "Türk lirası olarak",
    "fr": "En livres turques",
    "ru": "В турецких лирах"
  },
  "In euros": {
    "ar": "باليورو",
    "en": "In euros",
    "tr": "Avro olarak",
    "fr": "En euros",
    "ru": "В евро"
  },
  "In US dollars": {
    "ar": "بالدولار",
    "en": "In US dollars",
    "tr": "ABD doları olarak",
    "fr": "En dollars américains",
    "ru": "В долларах США"
  },
  "In lira": {
    "ar": "بالليرة",
    "en": "In lira",
    "tr": "Lira olarak",
    "fr": "En livres turques",
    "ru": "В лирах"
  },
  "Unarchive": {
    "ar": "إلغاء الأرشيف",
    "en": "Unarchive",
    "tr": "Arşivden çıkar",
    "fr": "Désarchiver",
    "ru": "Вернуть из архива"
  },
  "No results": {
    "ar": "لا توجد نتائج",
    "en": "No results",
    "tr": "Sonuç yok",
    "fr": "Aucun résultat",
    "ru": "Ничего не найдено"
  },
  "Click to enlarge the image": {
    "ar": "انقر لتكبير الصورة",
    "en": "Click to enlarge the image",
    "tr": "Görseli büyütmek için tıklayın",
    "fr": "Cliquer pour agrandir l’image",
    "ru": "Нажмите для увеличения изображения"
  },
  "⚠️ Backup failed": {
    "ar": "⚠️ فشل النسخ الاحتياطي",
    "en": "⚠️ Backup failed",
    "tr": "⚠️ Yedekleme başarısız",
    "fr": "⚠️ Échec de la sauvegarde",
    "ru": "⚠️ Не удалось создать копию"
  },
  "PROFORMA  ·  EDITABLE EXCEL COPY": {
    "ar": "فاتورة أولية · نسخة Excel قابلة للتعديل",
    "en": "PROFORMA  ·  EDITABLE EXCEL COPY",
    "tr": "PROFORMA · DÜZENLENEBİLİR EXCEL KOPYASI",
    "fr": "PRO FORMA · COPIE EXCEL MODIFIABLE",
    "ru": "ПРОФОРМА · РЕДАКТИРУЕМАЯ КОПИЯ EXCEL"
  },
  "CONTROLLED WORKING COPY": {
    "ar": "نسخة عمل للمراجعة",
    "en": "CONTROLLED WORKING COPY",
    "tr": "KONTROLLÜ ÇALIŞMA KOPYASI",
    "fr": "COPIE DE TRAVAIL CONTRÔLÉE",
    "ru": "КОНТРОЛИРУЕМАЯ РАБОЧАЯ КОПИЯ"
  },
  "SYSTEM GENERATED": {
    "ar": "أُنشئ بواسطة النظام",
    "en": "SYSTEM GENERATED",
    "tr": "SİSTEM TARAFINDAN OLUŞTURULDU",
    "fr": "GÉNÉRÉ PAR LE SYSTÈME",
    "ru": "СОЗДАНО СИСТЕМОЙ"
  },
  "WOW DIGITAL DOCUMENT ENGINE": {
    "ar": "محرك مستندات WOW الرقمي",
    "en": "WOW DIGITAL DOCUMENT ENGINE",
    "tr": "WOW DİJİTAL BELGE MOTORU",
    "fr": "MOTEUR DOCUMENTAIRE NUMÉRIQUE WOW",
    "ru": "СИСТЕМА ЦИФРОВЫХ ДОКУМЕНТОВ WOW"
  },
  "TECHNICAL EXPORT MODULE  •  XLSX DOCUMENT PIPELINE": {
    "ar": "وحدة تصدير مستندات XLSX",
    "en": "TECHNICAL EXPORT MODULE  •  XLSX DOCUMENT PIPELINE",
    "tr": "TEKNİK DIŞA AKTARMA MODÜLÜ • XLSX BELGE İŞLEME",
    "fr": "MODULE D’EXPORT • TRAITEMENT DES DOCUMENTS XLSX",
    "ru": "МОДУЛЬ ЭКСПОРТА • ОБРАБОТКА ДОКУМЕНТОВ XLSX"
  },
  "DOCUMENT REFERENCE": {
    "ar": "مرجع المستند",
    "en": "DOCUMENT REFERENCE",
    "tr": "BELGE REFERANSI",
    "fr": "RÉFÉRENCE DU DOCUMENT",
    "ru": "НОМЕР ДОКУМЕНТА"
  },
  "EXPORT STATUS": {
    "ar": "حالة التصدير",
    "en": "EXPORT STATUS",
    "tr": "DIŞA AKTARMA DURUMU",
    "fr": "ÉTAT DE L’EXPORT",
    "ru": "СОСТОЯНИЕ ЭКСПОРТА"
  },
  "SOURCE DATA  →  XLSX": {
    "ar": "البيانات الأصلية → XLSX",
    "en": "SOURCE DATA  →  XLSX",
    "tr": "KAYNAK VERİLER → XLSX",
    "fr": "DONNÉES SOURCES → XLSX",
    "ru": "ИСХОДНЫЕ ДАННЫЕ → XLSX"
  },
  "PROFORMA / DATE": {
    "ar": "الفاتورة الأولية / التاريخ",
    "en": "PROFORMA / DATE",
    "tr": "PROFORMA / TARİH",
    "fr": "PRO FORMA / DATE",
    "ru": "ПРОФОРМА / ДАТА"
  },
  "GENERATED BY WOW TECH SYSTEM": {
    "ar": "أُنشئ بواسطة نظام WOW التقني",
    "en": "GENERATED BY WOW TECH SYSTEM",
    "tr": "WOW TEKNOLOJİ SİSTEMİ İLE OLUŞTURULDU",
    "fr": "GÉNÉRÉ PAR LE SYSTÈME TECHNIQUE WOW",
    "ru": "СОЗДАНО ТЕХНИЧЕСКОЙ СИСТЕМОЙ WOW"
  },
  "Digital document export • Editable XLSX • Source-controlled proforma workflow": {
    "ar": "تصدير مستند رقمي · XLSX قابل للتعديل · فاتورة أولية مرجعية محفوظة",
    "en": "Digital document export • Editable XLSX • Source-controlled proforma workflow",
    "tr": "Dijital belge dışa aktarma • Düzenlenebilir XLSX • Kayıtlı kaynak proforma",
    "fr": "Export numérique • XLSX modifiable • Pro forma source conservée",
    "ru": "Цифровой экспорт • Редактируемый XLSX • Сохранённая исходная проформа"
  },
  "NEXT WORKSHEET  →  EDITABLE INVOICE": {
    "ar": "الورقة التالية ← الفاتورة القابلة للتعديل",
    "en": "NEXT WORKSHEET  →  EDITABLE INVOICE",
    "tr": "SONRAKİ SAYFA → DÜZENLENEBİLİR FATURA",
    "fr": "FEUILLE SUIVANTE → FACTURE MODIFIABLE",
    "ru": "СЛЕДУЮЩИЙ ЛИСТ → РЕДАКТИРУЕМЫЙ СЧЁТ"
  },
  "WOW NOTICE": {
    "ar": "تنبيه WOW",
    "en": "WOW NOTICE",
    "tr": "WOW BİLGİLENDİRME",
    "fr": "AVIS WOW",
    "ru": "УВЕДОМЛЕНИЕ WOW"
  },
  "OFFICIAL NOTICE — EDITABLE EXCEL COPY": {
    "ar": "تنبيه رسمي بشأن نسخة Excel القابلة للتعديل",
    "en": "OFFICIAL NOTICE — EDITABLE EXCEL COPY",
    "tr": "RESMÎ BİLGİ — DÜZENLENEBİLİR EXCEL KOPYASI",
    "fr": "AVIS OFFICIEL — COPIE EXCEL MODIFIABLE",
    "ru": "ОФИЦИАЛЬНОЕ УВЕДОМЛЕНИЕ — РЕДАКТИРУЕМАЯ КОПИЯ EXCEL"
  },
  "This workbook is an editable copy of the WOW Furniture Proforma Invoice, generated for review and data work. Any later change to prices, images, quantities, specifications, customer details or other information is made solely by the recipient and is not approved, certified or automatically recorded by WOW Furniture. The reference copy is the original raw Proforma issued directly by WOW Furniture and stored in our systems.": {
    "en": "This workbook is an editable copy of the WOW Furniture Proforma Invoice, generated for review and data work. Any later change to prices, images, quantities, specifications, customer details or other information is made solely by the recipient and is not approved, certified or automatically recorded by WOW Furniture. The reference copy is the original raw Proforma issued directly by WOW Furniture and stored in our systems.",
    "ar": "هذه نسخة Excel قابلة للتعديل من فاتورة WOW Furniture الأولية (Proforma Invoice)، تم إنشاؤها لتسهيل المراجعة والعمل على البيانات. أي تعديل لاحق على الأسعار أو الصور أو الكميات أو المواصفات أو بيانات العميل أو أي معلومات أخرى يتم من طرف المستلم فقط، ولا يُعد معتمداً أو مصدقاً من WOW Furniture، ولا يتم تحديثه أو تثبيته تلقائياً في أنظمة الشركة. المرجع المعتمد هو النسخة الأصلية الخام الصادرة مباشرة من WOW Furniture والمحفوظة ضمن أنظمتنا.",
    "tr": "Bu çalışma kitabı, inceleme ve veri düzenleme amacıyla oluşturulan WOW Furniture Proforma Faturasının düzenlenebilir bir kopyasıdır. Fiyatlar, görseller, adetler, teknik bilgiler, müşteri bilgileri veya diğer veriler üzerinde sonradan yapılan değişiklikler yalnızca alıcı tarafından yapılmış sayılır; WOW Furniture tarafından onaylanmış, tasdik edilmiş veya şirket sistemlerine otomatik olarak kaydedilmiş sayılmaz. Esas alınacak nüsha, WOW Furniture tarafından doğrudan düzenlenen ve sistemlerimizde kayıtlı olan orijinal ham Proforma nüshasıdır.",
    "fr": "Ce classeur est une copie modifiable de la facture pro forma WOW Furniture, créée pour la vérification et le traitement des données. Toute modification ultérieure des prix, images, quantités, caractéristiques, coordonnées du client ou autres informations relève uniquement du destinataire et n’est ni approuvée, ni certifiée, ni enregistrée automatiquement par WOW Furniture. La référence est la facture pro forma originale émise directement par WOW Furniture et conservée dans nos systèmes.",
    "ru": "Эта книга — редактируемая копия счёта-проформы WOW Furniture, созданная для проверки и работы с данными. Любые последующие изменения цен, изображений, количества, характеристик, данных клиента и других сведений выполняются исключительно получателем и не считаются одобренными, заверенными или автоматически учтёнными WOW Furniture. Эталоном служит исходная проформа, выпущенная непосредственно WOW Furniture и сохранённая в наших системах."
  },
  "1": {
    "en": "1",
    "ar": "1",
    "tr": "1",
    "fr": "1",
    "ru": "1"
  },
  "✅ Data is healthy; no duplicate IDs found.": {
    "en": "✅ Data is healthy; no duplicate IDs found.",
    "ar": "✅ البيانات سليمة ولا توجد معرفات مكررة.",
    "tr": "✅ Veriler sağlam; yinelenen kimlik bulunamadı.",
    "fr": "✅ Données valides, aucun identifiant en double.",
    "ru": "✅ Данные исправны, повторяющихся идентификаторов нет."
  },
  "⚠️ Duplicate IDs were found in one or more datasets.": {
    "en": "⚠️ Duplicate IDs were found in one or more datasets.",
    "ar": "⚠️ تم العثور على مشكلة في تكرار بعض المعرفات.",
    "tr": "⚠️ Bazı yinelenen kimlikler bulundu.",
    "fr": "⚠️ Des identifiants en double ont été trouvés.",
    "ru": "⚠️ Найдены повторяющиеся идентификаторы."
  },
  "Current data will be replaced by the backup contents. Continue?": {
    "en": "Current data will be replaced by the backup contents. Continue?",
    "ar": "سيتم استبدال البيانات الحالية بمحتوى النسخة الاحتياطية. هل تريد المتابعة؟",
    "tr": "Mevcut veriler yedek içeriğiyle değiştirilecek. Devam edilsin mi?",
    "fr": "Les données actuelles seront remplacées par la sauvegarde. Continuer ?",
    "ru": "Текущие данные будут заменены данными копии. Продолжить?"
  },
  "⚠️ Invalid backup file": {
    "en": "⚠️ Invalid backup file",
    "ar": "⚠️ ملف النسخة الاحتياطية غير صالح",
    "tr": "⚠️ Geçersiz yedek dosyası",
    "fr": "⚠️ Fichier de sauvegarde invalide",
    "ru": "⚠️ Неверный файл копии"
  },
  "✅ Data restored successfully": {
    "en": "✅ Data restored successfully",
    "ar": "✅ تمت استعادة البيانات بنجاح",
    "tr": "✅ Veriler başarıyla geri yüklendi",
    "fr": "✅ Données restaurées",
    "ru": "✅ Данные восстановлены"
  },
  "✅ Backup created": {
    "en": "✅ Backup created",
    "ar": "✅ تم إنشاء النسخة الاحتياطية",
    "tr": "✅ Yedek oluşturuldu",
    "fr": "✅ Sauvegarde créée",
    "ru": "✅ Копия создана"
  },
  "Choose your account to look for a previous backup before starting uploads.": {
    "en": "Choose your account to look for a previous backup before starting uploads.",
    "ar": "اختر حسابك للبحث عن نسخة سابقة قبل بدء النسخ الاحتياطي.",
    "tr": "Yedeklemeye başlamadan önce önceki yedeği bulmak için hesabınızı seçin.",
    "fr": "Choisissez votre compte pour rechercher une sauvegarde avant tout envoi.",
    "ru": "Выберите аккаунт для поиска предыдущей копии перед загрузкой."
  },
  "Connected": {
    "en": "Connected",
    "ar": "متصل",
    "tr": "Bağlı",
    "fr": "Connecté",
    "ru": "Подключено"
  },
  "Backing up…": {
    "en": "Backing up…",
    "ar": "جارٍ النسخ…",
    "tr": "Yedekleniyor…",
    "fr": "Sauvegarde en cours…",
    "ru": "Создание копии…"
  },
  "No internet": {
    "en": "No internet",
    "ar": "لا يوجد إنترنت",
    "tr": "İnternet yok",
    "fr": "Pas de connexion Internet",
    "ru": "Нет подключения к интернету"
  },
  "Could not access Google Drive": {
    "en": "Could not access Google Drive",
    "ar": "تعذر الوصول إلى Google Drive",
    "tr": "Google Drive’a erişilemiyor",
    "fr": "Accès à Google Drive impossible",
    "ru": "Нет доступа к Google Диску"
  },
  "✅ Backup updated": {
    "en": "✅ Backup updated",
    "ar": "✅ تم تحديث النسخة الاحتياطية",
    "tr": "✅ Yedek güncellendi",
    "fr": "✅ Sauvegarde mise à jour",
    "ru": "✅ Копия обновлена"
  },
  "✅ Backup is up to date": {
    "en": "✅ Backup is up to date",
    "ar": "✅ النسخة الاحتياطية محدثة",
    "tr": "✅ Yedek güncel",
    "fr": "✅ Sauvegarde à jour",
    "ru": "✅ Копия актуальна"
  },
  "Backup schedule updated": {
    "en": "Backup schedule updated",
    "ar": "تم تحديث جدول النسخ الاحتياطي",
    "tr": "Yedekleme planı güncellendi",
    "fr": "Fréquence de sauvegarde mise à jour",
    "ru": "Расписание обновлено"
  },
  "Disconnect Google Drive from this device? The backup in Drive will not be deleted.": {
    "en": "Disconnect Google Drive from this device? The backup in Drive will not be deleted.",
    "ar": "فصل حساب Google Drive عن هذا الجهاز؟ النسخة الموجودة في Drive لن تُحذف.",
    "tr": "Google Drive hesabı bu cihazdan ayrılsın mı? Drive’daki yedek silinmez.",
    "fr": "Déconnecter Google Drive sur cet appareil ? La sauvegarde ne sera pas supprimée.",
    "ru": "Отключить Google Диск на этом устройстве? Копия не будет удалена."
  },
  "Google Drive disconnected": {
    "en": "Google Drive disconnected",
    "ar": "تم فصل حساب Google Drive",
    "tr": "Google Drive bağlantısı kesildi",
    "fr": "Google Drive déconnecté",
    "ru": "Google Диск отключён"
  },
  "Check Google Drive API and account permission.": {
    "en": "Check Google Drive API and account permission.",
    "ar": "تحقق من Google Drive API وصلاحية الحساب.",
    "tr": "Google Drive API ve hesap iznini kontrol edin.",
    "fr": "Vérifiez l’API Google Drive et les autorisations du compte.",
    "ru": "Проверьте API Google Диска и разрешения аккаунта."
  },
  "Open the app from an HTTPS URL": {
    "en": "Open the app from an HTTPS URL",
    "ar": "يجب فتح البرنامج من رابط HTTPS",
    "tr": "Uygulamayı HTTPS adresinden açın",
    "fr": "Ouvrez l’application depuis une adresse HTTPS",
    "ru": "Откройте приложение по адресу HTTPS"
  },
  "Google Drive is not configured in this build.": {
    "en": "Google Drive is not configured in this build.",
    "ar": "إعداد Google Drive غير مكتمل في هذه النسخة.",
    "tr": "Bu sürümde Google Drive ayarı eksik.",
    "fr": "Google Drive n’est pas configuré dans cette version.",
    "ru": "Google Диск не настроен в этой версии."
  },
  "Google permission needs renewal. Tap Back Up Now or Restore.": {
    "en": "Google permission needs renewal. Tap Back Up Now or Restore.",
    "ar": "يحتاج Google إلى تجديد الإذن. اضغط نسخ الآن أو استعادة.",
    "tr": "Google izni yenilenmeli. Şimdi Yedekle veya Geri Yükle’ye dokunun.",
    "fr": "Renouvelez l’autorisation Google en appuyant sur Sauvegarder maintenant ou Restaurer.",
    "ru": "Обновите разрешение Google, нажав «Создать копию сейчас» или «Восстановить»."
  },
  "Old backups cleaned; only one file is kept.": {
    "en": "Old backups cleaned; only one file is kept.",
    "ar": "تم تنظيف النسخ القديمة والاحتفاظ بملف واحد فقط.",
    "tr": "Eski yedekler temizlendi; yalnızca tek dosya bırakıldı.",
    "fr": "Anciennes sauvegardes nettoyées ; un seul fichier est conservé.",
    "ru": "Старые копии удалены; оставлен один файл."
  },
  "Current app data will be replaced with the backup stored in Google Drive.": {
    "en": "Current app data will be replaced with the backup stored in Google Drive.",
    "ar": "سيتم استبدال بيانات البرنامج بالنسخة المحفوظة في Google Drive.",
    "tr": "Mevcut uygulama verileri Google Drive’daki yedekle değiştirilecek.",
    "fr": "Les données actuelles seront remplacées par la sauvegarde de Google Drive.",
    "ru": "Текущие данные будут заменены копией из Google Диска."
  },
  "Current app data will be replaced with the backup you selected.": {
    "en": "Current app data will be replaced with the backup you selected.",
    "ar": "سيتم استبدال بيانات البرنامج بالنسخة التي اخترتها.",
    "tr": "Mevcut uygulama verileri seçtiğiniz yedekle değiştirilecek.",
    "fr": "Les données actuelles seront remplacées par la sauvegarde choisie.",
    "ru": "Текущие данные будут заменены выбранной копией."
  },
  "Checking and restoring backup…": {
    "en": "Checking and restoring backup…",
    "ar": "جارٍ التحقق والاستعادة…",
    "tr": "Yedek doğrulanıyor ve geri yükleniyor…",
    "fr": "Vérification et restauration…",
    "ru": "Проверка и восстановление…"
  },
  "Restore complete": {
    "en": "Restore complete",
    "ar": "اكتملت الاستعادة",
    "tr": "Geri yükleme tamamlandı",
    "fr": "Restauration terminée",
    "ru": "Восстановление завершено"
  },
  "The app will reload now.": {
    "en": "The app will reload now.",
    "ar": "سيتم إعادة تحميل البرنامج الآن.",
    "tr": "Uygulama şimdi yeniden yüklenecek.",
    "fr": "L’application va se recharger.",
    "ru": "Приложение будет перезагружено."
  },
  "The backup file is invalid.": {
    "en": "The backup file is invalid.",
    "ar": "ملف النسخة الاحتياطية غير صالح.",
    "tr": "Yedek dosyası geçersiz.",
    "fr": "Le fichier de sauvegarde est invalide.",
    "ru": "Неверный файл резервной копии."
  },
  "Restore failed. Your current data was kept.": {
    "en": "Restore failed. Your current data was kept.",
    "ar": "تعذرت الاستعادة. بقيت بياناتك الحالية كما هي.",
    "tr": "Geri yükleme başarısız. Mevcut verileriniz korundu.",
    "fr": "Échec de la restauration. Les données actuelles ont été conservées.",
    "ru": "Не удалось восстановить. Текущие данные сохранены."
  },
  "Bring your data with you": {
    "en": "Bring your data with you",
    "ar": "بياناتك ترجع معك",
    "tr": "Verileriniz sizinle gelir",
    "fr": "Retrouvez vos données",
    "ru": "Перенесите свои данные"
  },
  "Used WOW before? Connect the same Google account to find your backup.": {
    "en": "Used WOW before? Connect the same Google account to find your backup.",
    "ar": "هل استخدمت WOW من قبل؟ اتصل بحساب Google نفسه للبحث عن نسختك الاحتياطية.",
    "tr": "WOW’u daha önce kullandınız mı? Yedeğinizi bulmak için aynı Google hesabına bağlanın.",
    "fr": "Vous avez déjà utilisé WOW ? Connectez le même compte Google pour retrouver votre sauvegarde.",
    "ru": "Уже использовали WOW? Подключите тот же аккаунт Google, чтобы найти копию."
  },
  "Connect Google Drive": {
    "en": "Connect Google Drive",
    "ar": "الاتصال بـ Google Drive",
    "tr": "Google Drive’a Bağlan",
    "fr": "Connecter Google Drive",
    "ru": "Подключить Google Диск"
  },
  "Later": {
    "en": "Later",
    "ar": "لاحقًا",
    "tr": "Daha sonra",
    "fr": "Plus tard",
    "ru": "Позже"
  },
  "Your existing backup stays unchanged until you choose.": {
    "en": "Your existing backup stays unchanged until you choose.",
    "ar": "لن نغيّر أي نسخة محفوظة قبل اختيارك.",
    "tr": "Seçiminizden önce mevcut yedeğe dokunulmaz.",
    "fr": "La sauvegarde existante reste inchangée jusqu’à votre choix.",
    "ru": "Существующая копия не изменится до вашего решения."
  },
  "Looking for your backup": {
    "en": "Looking for your backup",
    "ar": "جارٍ البحث عن نسختك",
    "tr": "Yedeğiniz aranıyor",
    "fr": "Recherche de votre sauvegarde",
    "ru": "Поиск вашей копии"
  },
  "Checking saved backups in your selected account.": {
    "en": "Checking saved backups in your selected account.",
    "ar": "نتحقق من النسخ المحفوظة في الحساب الذي اخترته.",
    "tr": "Seçtiğiniz hesaptaki yedekler kontrol ediliyor.",
    "fr": "Vérification des sauvegardes dans le compte choisi.",
    "ru": "Проверка копий в выбранном аккаунте."
  },
  "Previous backup found": {
    "en": "Previous backup found",
    "ar": "توجد نسخة احتياطية سابقة",
    "tr": "Önceki yedek bulundu",
    "fr": "Sauvegarde précédente trouvée",
    "ru": "Найдена предыдущая копия"
  },
  "Restore your data and pick up where you left off.": {
    "en": "Restore your data and pick up where you left off.",
    "ar": "يمكنك استعادة بياناتك ومتابعة العمل من حيث توقفت.",
    "tr": "Verilerinizi geri yükleyip kaldığınız yerden devam edin.",
    "fr": "Restaurez vos données et reprenez votre travail.",
    "ru": "Восстановите данные и продолжайте работу."
  },
  "Canceling does not delete or replace your backup. You can restore it later in Settings.": {
    "en": "Canceling does not delete or replace your backup. You can restore it later in Settings.",
    "ar": "إلغاء الاستعادة لا يحذف النسخة ولا يستبدلها. يمكنك استعادتها لاحقًا من الإعدادات.",
    "tr": "İptal etmek yedeği silmez veya değiştirmez. Ayarlardan daha sonra geri yükleyebilirsiniz.",
    "fr": "Annuler ne supprime ni ne remplace votre sauvegarde. Vous pourrez la restaurer dans les paramètres.",
    "ru": "Отмена не удаляет и не заменяет копию. Её можно восстановить позже в настройках."
  },
  "Backups paused": {
    "en": "Backups paused",
    "ar": "النسخ متوقف مؤقتًا",
    "tr": "Yedekleme duraklatıldı",
    "fr": "Sauvegardes suspendues",
    "ru": "Копирование приостановлено"
  },
  "The connection timed out. Check your internet connection and try again.": {
    "en": "The connection timed out. Check your internet connection and try again.",
    "ar": "انتهت مهلة الاتصال. تحقق من الإنترنت وأعد المحاولة.",
    "tr": "Bağlantı zaman aşımına uğradı. İnterneti kontrol edip tekrar deneyin.",
    "fr": "Délai de connexion dépassé. Vérifiez votre connexion et réessayez.",
    "ru": "Время подключения истекло. Проверьте интернет и повторите попытку."
  },
  "Previous backup preserved": {
    "en": "Previous backup preserved",
    "ar": "نسخة سابقة محفوظة",
    "tr": "Önceki yedek korundu",
    "fr": "Sauvegarde précédente conservée",
    "ru": "Предыдущая копия сохранена"
  },
  "Uploads from this device are paused to protect your previous backup. Restore it or choose to start a new backup.": {
    "en": "Uploads from this device are paused to protect your previous backup. Restore it or choose to start a new backup.",
    "ar": "أوقفنا رفع بيانات هذا الجهاز لحماية نسختك السابقة. استعدها أو اختر بدء نسخة جديدة.",
    "tr": "Eski yedeği korumak için bu cihazdan yükleme duraklatıldı. Geri yükleyin veya yeni bir yedek başlatın.",
    "fr": "Les envois de cet appareil sont suspendus pour protéger votre ancienne sauvegarde. Restaurez-la ou créez-en une nouvelle.",
    "ru": "Загрузка с устройства приостановлена для защиты предыдущей копии. Восстановите её или создайте новую."
  },
  "Start a new backup": {
    "en": "Start a new backup",
    "ar": "بدء نسخة جديدة",
    "tr": "Yeni yedek başlat",
    "fr": "Créer une nouvelle sauvegarde",
    "ru": "Создать новую копию"
  },
  "Your previous Google Drive backup will be replaced with the data on this device. The previous backup will no longer be restorable from this app. Continue?": {
    "en": "Your previous Google Drive backup will be replaced with the data on this device. The previous backup will no longer be restorable from this app. Continue?",
    "ar": "سيتم استبدال النسخة السابقة في Google Drive ببيانات هذا الجهاز. لن تتمكن من استعادة النسخة السابقة من داخل البرنامج بعد ذلك. هل تريد المتابعة؟",
    "tr": "Google Drive’daki önceki yedek bu cihazın verileriyle değiştirilecek. Önceki yedek artık uygulamadan geri yüklenemez. Devam edilsin mi?",
    "fr": "La sauvegarde Google Drive précédente sera remplacée par les données de cet appareil et ne pourra plus être restaurée depuis cette application. Continuer ?",
    "ru": "Предыдущая копия в Google Диске будет заменена данными этого устройства. Восстановить прежнюю копию из приложения будет невозможно. Продолжить?"
  },
  "Account connected — no backup found": {
    "en": "Account connected — no backup found",
    "ar": "الحساب متصل — لا توجد نسخة سابقة",
    "tr": "Hesap bağlandı — yedek bulunamadı",
    "fr": "Compte connecté — aucune sauvegarde trouvée",
    "ru": "Аккаунт подключён — копия не найдена"
  },
  "We could not find a backup for this app in the selected account. Choose another account or start with the data on this device.": {
    "en": "We could not find a backup for this app in the selected account. Choose another account or start with the data on this device.",
    "ar": "لم نجد نسخة محفوظة لهذا البرنامج في الحساب الذي اخترته. يمكنك اختيار حساب آخر أو البدء ببيانات هذا الجهاز.",
    "tr": "Bu hesapta bu uygulamanın yedeğini bulamadık. Başka hesap seçebilir veya bu cihazın verileriyle başlayabilirsiniz.",
    "fr": "Aucune sauvegarde de cette application dans ce compte. Choisissez un autre compte ou utilisez les données de cet appareil.",
    "ru": "В выбранном аккаунте копий приложения нет. Выберите другой аккаунт или используйте данные устройства."
  },
  "Start backing up": {
    "en": "Start backing up",
    "ar": "بدء النسخ الاحتياطي",
    "tr": "Yedeklemeyi başlat",
    "fr": "Démarrer les sauvegardes",
    "ru": "Начать копирование"
  },
  "Try again": {
    "en": "Try again",
    "ar": "إعادة المحاولة",
    "tr": "Tekrar dene",
    "fr": "Réessayer",
    "ru": "Повторить"
  },
  "Could not search for a backup": {
    "en": "Could not search for a backup",
    "ar": "تعذر البحث عن النسخة",
    "tr": "Yedek aranamadı",
    "fr": "Recherche de sauvegarde impossible",
    "ru": "Не удалось найти копию"
  },
  "No Google Drive files were changed. Check your connection and permission, then try again.": {
    "en": "No Google Drive files were changed. Check your connection and permission, then try again.",
    "ar": "لم نغيّر أي ملف في Google Drive. تحقق من الإنترنت والإذن ثم أعد المحاولة.",
    "tr": "Google Drive’da hiçbir dosya değiştirilmedi. İnterneti ve izni kontrol edip tekrar deneyin.",
    "fr": "Aucun fichier Google Drive n’a été modifié. Vérifiez la connexion et les autorisations, puis réessayez.",
    "ru": "Файлы Google Диска не изменены. Проверьте подключение и разрешения и повторите попытку."
  },
  "Downloading backup": {
    "en": "Downloading backup",
    "ar": "تنزيل النسخة",
    "tr": "Yedek indiriliyor",
    "fr": "Téléchargement de la sauvegarde",
    "ru": "Загрузка копии"
  },
  "Checking your data": {
    "en": "Checking your data",
    "ar": "التحقق من البيانات",
    "tr": "Veriler doğrulanıyor",
    "fr": "Vérification des données",
    "ru": "Проверка данных"
  },
  "Saving to this device": {
    "en": "Saving to this device",
    "ar": "حفظ البيانات على الجهاز",
    "tr": "Cihaza kaydediliyor",
    "fr": "Enregistrement sur cet appareil",
    "ru": "Сохранение на устройстве"
  },
  "Restoring your data": {
    "en": "Restoring your data",
    "ar": "نستعيد بياناتك",
    "tr": "Verileriniz geri yükleniyor",
    "fr": "Restauration des données",
    "ru": "Восстановление данных"
  },
  "Keep this screen open until the restore finishes.": {
    "en": "Keep this screen open until the restore finishes.",
    "ar": "أبقِ هذه الشاشة مفتوحة حتى اكتمال الاستعادة.",
    "tr": "Geri yükleme bitene kadar bu ekranı açık tutun.",
    "fr": "Gardez cet écran ouvert jusqu’à la fin de la restauration.",
    "ru": "Не закрывайте экран до завершения восстановления."
  },
  "You’re all set": {
    "en": "You’re all set",
    "ar": "كل شيء جاهز",
    "tr": "Her şey hazır",
    "fr": "Tout est prêt",
    "ru": "Всё готово"
  },
  "Your data was restored successfully. You can continue working now.": {
    "en": "Your data was restored successfully. You can continue working now.",
    "ar": "تمت استعادة بياناتك بنجاح. يمكنك الآن العودة إلى العمل.",
    "tr": "Verileriniz başarıyla geri yüklendi. Çalışmaya devam edebilirsiniz.",
    "fr": "Vos données ont été restaurées. Vous pouvez continuer à travailler.",
    "ru": "Данные восстановлены. Можно продолжать работу."
  },
  "clients": {
    "en": "clients",
    "ar": "عميل",
    "tr": "müşteri",
    "fr": "clients",
    "ru": "клиентов"
  },
  "products": {
    "en": "products",
    "ar": "منتج",
    "tr": "ürün",
    "fr": "produits",
    "ru": "товаров"
  },
  "payments": {
    "en": "payments",
    "ar": "دفعة",
    "tr": "ödeme",
    "fr": "paiements",
    "ru": "платежей"
  },
  "Wait for the current operation to finish and try again.": {
    "en": "Wait for the current operation to finish and try again.",
    "ar": "انتظر اكتمال العملية الحالية ثم حاول مجددًا.",
    "tr": "İşlemin tamamlanmasını bekleyip yeniden deneyin.",
    "fr": "Attendez la fin de l’opération en cours et réessayez.",
    "ru": "Дождитесь завершения текущей операции и повторите попытку."
  },
  "Account selection timed out. Please try again.": {
    "en": "Account selection timed out. Please try again.",
    "ar": "انتهت مهلة اختيار الحساب. اضغط إعادة المحاولة.",
    "tr": "Hesap seçimi zaman aşımına uğradı. Tekrar deneyin.",
    "fr": "Délai de sélection du compte dépassé. Réessayez.",
    "ru": "Время выбора аккаунта истекло. Повторите попытку."
  },
  "This backup is no longer available in this account. Search again or choose the correct account.": {
    "en": "This backup is no longer available in this account. Search again or choose the correct account.",
    "ar": "لم تعد النسخة متاحة في هذا الحساب. أعد البحث أو اختر الحساب الصحيح.",
    "tr": "Yedek bu hesapta artık bulunamıyor. Yeniden arayın veya doğru hesabı seçin.",
    "fr": "Cette sauvegarde n’est plus disponible dans ce compte. Relancez la recherche ou choisissez le bon compte.",
    "ru": "Эта копия больше недоступна в аккаунте. Повторите поиск или выберите нужный аккаунт."
  },
  "Google Drive backup": {
    "en": "Google Drive backup",
    "ar": "نسخة Google Drive",
    "tr": "Google Drive yedeği",
    "fr": "Sauvegarde Google Drive",
    "ru": "Копия в Google Диске"
  },
  "Backup from this device": {
    "en": "Backup from this device",
    "ar": "نسخة من الجهاز",
    "tr": "Cihazdaki yedek",
    "fr": "Sauvegarde de cet appareil",
    "ru": "Копия с этого устройства"
  },
  "Restore did not finish. Your device data and cloud backup were preserved.": {
    "en": "Restore did not finish. Your device data and cloud backup were preserved.",
    "ar": "لم تكتمل الاستعادة. بقيت بيانات الجهاز والنسخة السحابية محفوظة.",
    "tr": "Geri yükleme tamamlanamadı. Cihaz verileri ve bulut yedeği korundu.",
    "fr": "La restauration n’a pas abouti. Les données de l’appareil et la sauvegarde en ligne ont été conservées.",
    "ru": "Восстановление не завершено. Данные устройства и облачная копия сохранены."
  },
  "Dollar → Lira": {
    "en": "Dollar → Lira",
    "ar": "حاسبة الدولار ← الليرة",
    "tr": "Dolar → Lira",
    "fr": "Dollar → Livre turque",
    "ru": "Доллар → Лира"
  },
  "Dollar → Euro": {
    "en": "Dollar → Euro",
    "ar": "حاسبة الدولار ← اليورو",
    "tr": "Dolar → Euro",
    "fr": "Dollar → Euro",
    "ru": "Доллар → Евро"
  },
  "Lira → Dollar": {
    "en": "Lira → Dollar",
    "ar": "حاسبة الليرة ← الدولار",
    "tr": "Lira → Dolar",
    "fr": "Livre turque → Dollar",
    "ru": "Лира → Доллар"
  },
  "Euro → Dollar": {
    "en": "Euro → Dollar",
    "ar": "حاسبة اليورو ← الدولار",
    "tr": "Euro → Dolar",
    "fr": "Euro → Dollar",
    "ru": "Евро → Доллар"
  },
  "Euro → Lira": {
    "en": "Euro → Lira",
    "ar": "حاسبة اليورو ← الليرة",
    "tr": "Euro → Lira",
    "fr": "Euro → Livre turque",
    "ru": "Евро → Лира"
  },
  "Lira → Euro": {
    "en": "Lira → Euro",
    "ar": "حاسبة الليرة ← اليورو",
    "tr": "Lira → Euro",
    "fr": "Livre turque → Euro",
    "ru": "Лира → Евро"
  },
  "QUICK": {
    "en": "QUICK",
    "ar": "مبالغ سريعة",
    "tr": "HIZLI",
    "fr": "RAPIDE",
    "ru": "БЫСТРО"
  },
  "Menu": {
    "en": "Menu",
    "ar": "القائمة",
    "tr": "Menü",
    "fr": "Menu",
    "ru": "Меню"
  },
  "Dashboard": {
    "en": "Dashboard",
    "ar": "لوحة التحكم",
    "tr": "Panel",
    "fr": "Tableau de bord",
    "ru": "Панель управления"
  },
  "Actions": {
    "en": "Actions",
    "ar": "إجراءات",
    "tr": "İşlemler",
    "fr": "Actions",
    "ru": "Действия"
  },
  "Add Client": {
    "en": "Add Client",
    "ar": "إضافة عميل",
    "tr": "Müşteri Ekle",
    "fr": "Ajouter un client",
    "ru": "Добавить клиента"
  },
  "Add Product": {
    "en": "Add Product",
    "ar": "إضافة منتج",
    "tr": "Ürün Ekle",
    "fr": "Ajouter un produit",
    "ru": "Добавить товар"
  },
  "Companies": {
    "en": "Companies",
    "ar": "الشركات",
    "tr": "Şirketler",
    "fr": "Sociétés",
    "ru": "Компании"
  },
  "Total Sales": {
    "en": "Total Sales",
    "ar": "إجمالي المبيعات",
    "tr": "Toplam Satış",
    "fr": "Total des ventes",
    "ru": "Общий объём продаж"
  },
  "Quick Actions": {
    "en": "Quick Actions",
    "ar": "إجراءات سريعة",
    "tr": "Hızlı İşlemler",
    "fr": "Actions rapides",
    "ru": "Быстрые действия"
  },
  "Recent Invoices": {
    "en": "Recent Invoices",
    "ar": "آخر الفواتير",
    "tr": "Son Faturalar",
    "fr": "Factures récentes",
    "ru": "Последние счета"
  },
  "View All": {
    "en": "View All",
    "ar": "عرض الكل",
    "tr": "Tümünü Gör",
    "fr": "Tout afficher",
    "ru": "Показать все"
  },
  "👥 Clients": {
    "en": "👥 Clients",
    "ar": "👥 العملاء",
    "tr": "👥 Müşteriler",
    "fr": "Clients",
    "ru": "Клиенты"
  },
  "All": {
    "en": "All",
    "ar": "الكل",
    "tr": "Tümü",
    "fr": "Tous",
    "ru": "Все"
  },
  "Client Type": {
    "en": "Client Type",
    "ar": "نوع الزبون",
    "tr": "Müşteri Tipi",
    "fr": "Type de client",
    "ru": "Тип клиента"
  },
  "Company Info": {
    "en": "Company Info",
    "ar": "معلومات الشركة",
    "tr": "Şirket Bilgileri",
    "fr": "Informations sur la société",
    "ru": "Данные компании"
  },
  "Company Name": {
    "en": "Company Name",
    "ar": "اسم الشركة",
    "tr": "Şirket Adı",
    "fr": "Nom de la société",
    "ru": "Название компании"
  },
  "Buyer Name": {
    "en": "Buyer Name",
    "ar": "اسم المشتري",
    "tr": "Alıcı Adı",
    "fr": "Nom de l’acheteur",
    "ru": "Имя покупателя"
  },
  "City": {
    "en": "City",
    "ar": "المدينة",
    "tr": "Şehir",
    "fr": "Ville",
    "ru": "Город"
  },
  "Phone": {
    "en": "Phone",
    "ar": "الهاتف",
    "tr": "Telefon",
    "fr": "Téléphone",
    "ru": "Телефон"
  },
  "Email": {
    "en": "Email",
    "ar": "البريد",
    "tr": "E-posta",
    "fr": "Courriel",
    "ru": "Эл. почта"
  },
  "Website": {
    "en": "Website",
    "ar": "الموقع",
    "tr": "Web Sitesi",
    "fr": "Site web",
    "ru": "Веб-сайт"
  },
  "Showrooms": {
    "en": "Showrooms",
    "ar": "المعارض",
    "tr": "Mağaza",
    "fr": "Salles d’exposition",
    "ru": "Выставочные залы"
  },
  "🛋️ Products": {
    "en": "🛋️ Products",
    "ar": "🛋️ المنتجات",
    "tr": "🛋️ Ürünler",
    "fr": "Produits",
    "ru": "Товары"
  },
  "Keep Original": {
    "en": "Keep Original",
    "ar": "إبقاء كما هو",
    "tr": "Orijinal Tut",
    "fr": "Conserver la devise d’origine",
    "ru": "Сохранить исходную валюту"
  },
  "Receipt Type": {
    "en": "Receipt Type",
    "ar": "نوع الاستلام",
    "tr": "Alım Türü",
    "fr": "Mode de réception",
    "ru": "Способ получения"
  },
  "Smart Details": {
    "en": "Smart Details",
    "ar": "تفاصيل ذكية",
    "tr": "Akıllı Detaylar",
    "fr": "Détails du paiement",
    "ru": "Детали платежа"
  },
  "Invoice Currency": {
    "en": "Invoice Currency",
    "ar": "عملة الفاتورة",
    "tr": "Fatura Para Birimi",
    "fr": "Devise de la facture",
    "ru": "Валюта счёта"
  },
  "Payment Progress": {
    "en": "Payment Progress",
    "ar": "تقدم الدفع",
    "tr": "Ödeme İlerlemesi",
    "fr": "Avancement des paiements",
    "ru": "Прогресс оплаты"
  },
  "Add New Payment": {
    "en": "Add New Payment",
    "ar": "إضافة دفعة جديدة",
    "tr": "Yeni Ödeme Ekle",
    "fr": "Ajouter un paiement",
    "ru": "Добавить платёж"
  },
  "Payment History": {
    "en": "Payment History",
    "ar": "سجل الدفعات",
    "tr": "Ödeme Geçmişi",
    "fr": "Historique des paiements",
    "ru": "История платежей"
  },
  "No payments yet": {
    "en": "No payments yet",
    "ar": "لا توجد دفعات بعد",
    "tr": "Henüz ödeme yok",
    "fr": "Aucun paiement pour le moment",
    "ru": "Платежей пока нет"
  },
  "Invoice Total": {
    "en": "Invoice Total",
    "ar": "إجمالي الفاتورة",
    "tr": "Fatura Toplamı",
    "fr": "Total de la facture",
    "ru": "Сумма счёта"
  },
  "Paid": {
    "en": "Paid",
    "ar": "المدفوع",
    "tr": "Ödenen",
    "fr": "Payé",
    "ru": "Оплачено"
  },
  "Remaining": {
    "en": "Remaining",
    "ar": "المتبقي",
    "tr": "Kalan",
    "fr": "Solde restant",
    "ru": "Остаток к оплате"
  },
  "Amount": {
    "en": "Amount",
    "ar": "المبلغ",
    "tr": "Tutar",
    "fr": "Montant",
    "ru": "Сумма"
  },
  "Date": {
    "en": "Date",
    "ar": "التاريخ",
    "tr": "Tarih",
    "fr": "Date",
    "ru": "Дата"
  },
  "Note": {
    "en": "Note",
    "ar": "ملاحظة",
    "tr": "Not",
    "fr": "Notes",
    "ru": "Примечания"
  },
  "Add": {
    "en": "Add",
    "ar": "إضافة",
    "tr": "Ekle",
    "fr": "Ajouter un paiement",
    "ru": "Добавить платёж"
  },
  "Conversion accepted": {
    "en": "Conversion accepted",
    "ar": "تم قبول التحويل",
    "tr": "Dönüşüm kabul edildi",
    "fr": "Conversion acceptée",
    "ru": "Конвертация принята"
  },
  "Converted to": {
    "en": "Converted to",
    "ar": "تم التحويل إلى",
    "tr": "Dönüştürüldü",
    "fr": "Converti en",
    "ru": "Конвертировано в"
  },
  "Received": {
    "en": "Received",
    "ar": "استُلم",
    "tr": "Alındı",
    "fr": "Reçu",
    "ru": "Получено"
  },
  "via": {
    "en": "via",
    "ar": "بطريقة",
    "tr": "yöntemiyle",
    "fr": "par",
    "ru": "через"
  },
  "on": {
    "en": "on",
    "ar": "بتاريخ",
    "tr": "tarihinde",
    "fr": "le",
    "ru": "дата"
  },
  "from": {
    "en": "from",
    "ar": "من",
    "tr": "firmasından",
    "fr": "de",
    "ru": "от"
  },
  "Client Invoices": {
    "en": "Client Invoices",
    "ar": "فواتير العميل",
    "tr": "Müşteri Faturaları",
    "fr": "Factures du client",
    "ru": "Счета клиента"
  },
  "invoice": {
    "en": "invoice",
    "ar": "فاتورة",
    "tr": "fatura",
    "fr": "facture(s)",
    "ru": "счёт(ов)"
  },
  "Show All Invoices": {
    "en": "Show All Invoices",
    "ar": "عرض كل الفواتير",
    "tr": "Tüm Faturaları Göster",
    "fr": "Afficher toutes les factures",
    "ru": "Показать все счета"
  },
  "Panel": {
    "en": "Panel",
    "ar": "لوحة",
    "tr": "Ana sayfa",
    "fr": "Tableau de bord",
    "ru": "Панель управления"
  },
  "Barcode": {
    "en": "Barcode",
    "ar": "الباركود",
    "tr": "Barkod",
    "fr": "Code-barres",
    "ru": "Штрихкод"
  },
  "Print Settings": {
    "en": "Print Settings",
    "ar": "إعدادات الطباعة",
    "tr": "Yazdırma Ayarları",
    "fr": "Paramètres d’impression",
    "ru": "Настройки печати"
  },
  "Subtotal": {
    "en": "Subtotal",
    "ar": "المجموع الفرعي",
    "tr": "Ara Toplam",
    "fr": "Sous-total",
    "ru": "Промежуточный итог"
  },
  "Discount": {
    "en": "Discount",
    "ar": "الخصم",
    "tr": "İndirim",
    "fr": "Remise",
    "ru": "Скидка"
  },
  "Grand Total": {
    "en": "Grand Total",
    "ar": "المجموع النهائي",
    "tr": "Genel Toplam",
    "fr": "Total général",
    "ru": "Общая сумма"
  },
  "Deposit": {
    "en": "Deposit",
    "ar": "العربون",
    "tr": "Depozito",
    "fr": "Acompte",
    "ru": "Аванс"
  },
  "Total Paid": {
    "en": "Total Paid",
    "ar": "إجمالي المدفوع",
    "tr": "Toplam Ödenen",
    "fr": "Total payé",
    "ru": "Всего оплачено"
  },
  "Balance Due": {
    "en": "Balance Due",
    "ar": "المتبقي",
    "tr": "Kalan Tutar",
    "fr": "Solde restant",
    "ru": "Остаток к оплате"
  },
  "Restore Default": {
    "en": "Restore Default",
    "ar": "استعادة الافتراضي",
    "tr": "Varsayılana Dön",
    "fr": "Rétablir le logo par défaut",
    "ru": "Восстановить исходный логотип"
  },
  "✅ Default logo restored": {
    "en": "✅ Default logo restored",
    "ar": "✅ تم استعادة اللوجو الافتراضي",
    "tr": "✅ Varsayılan logo geri yüklendi",
    "fr": "✅ Logo par défaut restauré",
    "ru": "✅ Логотип по умолчанию восстановлен"
  },
  "Coffee Table": {
    "en": "Coffee Table",
    "ar": "طاولة قهوة",
    "tr": "Orta Sehpa",
    "fr": "Table basse",
    "ru": "Журнальный столик"
  },
  "Dresser": {
    "en": "Dresser",
    "ar": "مدخل",
    "tr": "DRESUAR",
    "fr": "Commode",
    "ru": "Комод"
  },
  "Side Table": {
    "en": "Side Table",
    "ar": "طاولة جانبية",
    "tr": "Yan Sehpa",
    "fr": "Table d’appoint",
    "ru": "Приставной столик"
  },
  "TV Table": {
    "en": "TV Table",
    "ar": "طاولة تلفاز",
    "tr": "TV Ünitesi",
    "fr": "Meuble TV",
    "ru": "Тумба под телевизор"
  },
  "External Sequence (A)": {
    "en": "External Sequence (A)",
    "ar": "تسلسل الخارجي (A)",
    "tr": "Dış Fatura Serisi (A)",
    "fr": "Numérotation export (A)",
    "ru": "Нумерация экспорта (A)"
  },
  "Retail Sequence (B)": {
    "en": "Retail Sequence (B)",
    "ar": "تسلسل المفرق (B)",
    "tr": "Perakende Serisi (B)",
    "fr": "Numérotation au détail (B)",
    "ru": "Нумерация розницы (B)"
  },
  "Wholesale Sequence (C)": {
    "en": "Wholesale Sequence (C)",
    "ar": "تسلسل الجملة (C)",
    "tr": "Toptan Serisi (C)",
    "fr": "Numérotation en gros (C)",
    "ru": "Нумерация опта (C)"
  },
  "Rate:": {
    "en": "Rate:",
    "ar": "النسبة:",
    "tr": "Oran:",
    "fr": "Taux :",
    "ru": "Ставка:"
  },
  "Share": {
    "en": "Share",
    "ar": "مشاركة",
    "tr": "Paylaş",
    "fr": "Partager",
    "ru": "Поделиться"
  },
  "Download PDF": {
    "en": "Download PDF",
    "ar": "تحميل PDF",
    "tr": "PDF İndir",
    "fr": "Télécharger le PDF",
    "ru": "Скачать PDF"
  },
  "Print Invoice": {
    "en": "Print Invoice",
    "ar": "طباعة الفاتورة",
    "tr": "Faturayı Yazdır",
    "fr": "Imprimer la facture",
    "ru": "Распечатать счёт"
  },
  "Send WhatsApp": {
    "en": "Send WhatsApp",
    "ar": "إرسال WhatsApp",
    "tr": "WhatsApp Gönder",
    "fr": "Envoyer via WhatsApp",
    "ru": "Отправить через WhatsApp"
  },
  "Send Email": {
    "en": "Send Email",
    "ar": "إرسال Email",
    "tr": "E-posta Gönder",
    "fr": "Envoyer par courriel",
    "ru": "Отправить по электронной почте"
  },
  "Bank": {
    "en": "Bank",
    "ar": "البنك",
    "tr": "Banka",
    "fr": "Banque",
    "ru": "Банк"
  },
  "Invoice Settings": {
    "en": "Invoice Settings",
    "ar": "إعدادات الفواتير",
    "tr": "Fatura Ayarları",
    "fr": "Paramètres des factures",
    "ru": "Настройки счетов"
  },
  "Data": {
    "en": "Data",
    "ar": "البيانات",
    "tr": "Veriler",
    "fr": "Données",
    "ru": "Данные"
  },
  "About App": {
    "en": "About App",
    "ar": "عن البرنامج",
    "tr": "Hakkında",
    "fr": "À propos",
    "ru": "О программе"
  },
  "Smart Invoice Management System": {
    "en": "Smart Invoice Management System",
    "ar": "نظام إدارة الفواتير الذكي",
    "tr": "Akıllı Fatura Yönetim Sistemi",
    "fr": "Système de gestion des factures",
    "ru": "Система управления счетами"
  },
  "An advanced system for smart and fast management of invoices, clients, and products. Specially designed to streamline furniture export and trade.": {
    "en": "An advanced system for smart and fast management of invoices, clients, and products. Specially designed to streamline furniture export and trade.",
    "ar": "نظام متطور لإدارة الفواتير، العملاء، والمنتجات بذكاء وسرعة. مصمم خصيصاً لتسهيل أعمال تصدير وتجارة الأثاث بأعلى معايير الدقة والاحترافية.",
    "tr": "Fatura, müşteri ve ürünleri akıllı ve hızlı bir şekilde yönetmek için gelişmiş sistem. Mobilya ihracatı ve ticareti için özel olarak tasarlanmıştır.",
    "fr": "Un système de gestion rapide des factures, des clients et des produits, conçu pour faciliter le commerce et l’exportation de meubles.",
    "ru": "Система для быстрого управления счетами, клиентами и товарами, разработанная для торговли и экспорта мебели."
  },
  "Developing software architecture, designing interactive user interfaces, and building databases to ensure fast and reliable performance.": {
    "en": "Developing software architecture, designing interactive user interfaces, and building databases to ensure fast and reliable performance.",
    "ar": "تطوير الهيكلة البرمجية، تصميم واجهات المستخدم التفاعلية، وبناء قواعد البيانات لضمان أداء سريع وموثوق.",
    "tr": "Hızlı ve güvenilir performans sağlamak için yazılım mimarisinin geliştirilmesi, etkileşimli kullanıcı arayüzlerinin tasarımı ve veritabanlarının oluşturulması.",
    "fr": "Développement de l’architecture logicielle, conception d’interfaces interactives et création de bases de données pour assurer des performances rapides et fiables.",
    "ru": "Разработка архитектуры программного обеспечения, интерактивных интерфейсов и баз данных для быстрой и надёжной работы."
  },
  "Reviewing financial operations, auditing invoice outputs, and ensuring full compliance with accounting and commercial standards.": {
    "en": "Reviewing financial operations, auditing invoice outputs, and ensuring full compliance with accounting and commercial standards.",
    "ar": "مراجعة العمليات الحسابية، تدقيق مخرجات الفواتير، وضمان التوافق التام مع المعايير المحاسبية والتجارية.",
    "tr": "Hesaplama işlemlerinin incelenmesi, fatura çıktılarının denetlenmesi ve muhasebe ile ticari standartlara tam uyumun sağlanması.",
    "fr": "Contrôle des opérations financières, vérification des factures et conformité aux normes comptables et commerciales.",
    "ru": "Проверка финансовых операций и счетов, обеспечение соответствия бухгалтерским и коммерческим стандартам."
  },
  "The Team": {
    "en": "The Team",
    "ar": "فريق العمل",
    "tr": "Ekip",
    "fr": "L’équipe",
    "ru": "Команда"
  },
  "Programming & Development": {
    "en": "Programming & Development",
    "ar": "برمجة وتطوير",
    "tr": "Yazılım & Geliştirme",
    "fr": "Programmation et développement",
    "ru": "Программирование и разработка"
  },
  "Auditing & Review": {
    "en": "Auditing & Review",
    "ar": "تدقيق ومراجعة",
    "tr": "Denetim & İnceleme",
    "fr": "Audit et vérification",
    "ru": "Аудит и проверка"
  },
  "Eng. Mutez Billah Haj Shaban": {
    "en": "Eng. Mutez Billah Haj Shaban",
    "ar": "م. معتز بالله حاج شعبان",
    "tr": "Müh. Mutez Billah Haj Shaban",
    "fr": "Ing. Mutez Billah Haj Shaban",
    "ru": "Инж. Мутаз Биллах Хадж Шаабан"
  },
  "Mr. Hasan Al-Helou": {
    "en": "Mr. Hasan Al-Helou",
    "ar": "أ. حسن الحلو",
    "tr": "Sn. Hasan Al-Helou",
    "fr": "M. Hasan Al-Helou",
    "ru": "Г-н Хасан Аль-Хелу"
  },
  "Product Type": {
    "en": "Product Type",
    "ar": "نوع القطعة",
    "tr": "Ürün Tipi",
    "fr": "Type de produit",
    "ru": "Тип товара"
  },
  "Product Info": {
    "en": "Product Info",
    "ar": "معلومات القطعة",
    "tr": "Ürün Bilgileri",
    "fr": "Informations sur le produit",
    "ru": "Данные товара"
  },
  "Pricing": {
    "en": "Pricing",
    "ar": "التسعير",
    "tr": "Fiyatlandırma",
    "fr": "Tarification",
    "ru": "Цены"
  },
  "Base currency: USD": {
    "en": "Base currency: USD",
    "ar": "العملة الأساسية: USD",
    "tr": "Temel para birimi: USD",
    "fr": "Devise de base : USD",
    "ru": "Основная валюта: USD"
  },
  "Active Display Tier": {
    "en": "Active Display Tier",
    "ar": "التسعير النشط للعرض",
    "tr": "Aktif Fiyat Kademesi",
    "fr": "Catégorie de prix affichée",
    "ru": "Отображаемая категория цены"
  },
  "Price A (USD)": {
    "en": "Price A (USD)",
    "ar": "سعر أ (دولار)",
    "tr": "A Fiyatı (USD)",
    "fr": "Prix A (USD)",
    "ru": "Цена A (USD)"
  },
  "Price B (USD)": {
    "en": "Price B (USD)",
    "ar": "سعر ب (دولار)",
    "tr": "B Fiyatı (USD)",
    "fr": "Prix B (USD)",
    "ru": "Цена B (USD)"
  },
  "Price C (USD)": {
    "en": "Price C (USD)",
    "ar": "سعر ج (دولار)",
    "tr": "C Fiyatı (USD)",
    "fr": "Prix C (USD)",
    "ru": "Цена C (USD)"
  },
  "Dimensions": {
    "en": "Dimensions",
    "ar": "الأبعاد",
    "tr": "Boyut",
    "fr": "Dimensions",
    "ru": "Размеры"
  },
  "Dimensions (L × W × H) cm": {
    "en": "Dimensions (L × W × H) cm",
    "ar": "الأبعاد (ط × ع × ا) سم",
    "tr": "Boyutlar (U × G × Y) cm",
    "fr": "Dimensions (L × l × H), cm",
    "ru": "Размеры (Д × Ш × В), см"
  },
  "Product Image": {
    "en": "Product Image",
    "ar": "صورة القطعة",
    "tr": "Ürün Görseli",
    "fr": "Image du produit",
    "ru": "Фото товара"
  },
  "Drag image here": {
    "en": "Drag image here",
    "ar": "اسحب الصورة هنا",
    "tr": "Görseli sürükleyin",
    "fr": "Glissez l’image ici",
    "ru": "Перетащите изображение сюда"
  },
  "Save Product": {
    "en": "Save Product",
    "ar": "حفظ القطعة",
    "tr": "Ürünü Kaydet",
    "fr": "Enregistrer le produit",
    "ru": "Сохранить товар"
  },
  "📄 Invoices": {
    "en": "📄 Invoices",
    "ar": "📄 الفواتير",
    "tr": "📄 Faturalar",
    "fr": "Factures",
    "ru": "Счета"
  },
  "Invoice Pricing Tier": {
    "en": "Invoice Pricing Tier",
    "ar": "تسعير الفاتورة",
    "tr": "Fatura Fiyat Kademesi",
    "fr": "Catégorie de prix de la facture",
    "ru": "Категория цены счёта"
  },
  "Choose the tier applied to all products in this invoice": {
    "en": "Choose the tier applied to all products in this invoice",
    "ar": "اختر التسعير الذي سيُطبَّق على جميع المنتجات",
    "tr": "Bu faturadaki tüm ürünlere uygulanacak kademeyi seçin",
    "fr": "Choisissez la catégorie appliquée à tous les produits de cette facture",
    "ru": "Выберите категорию цены для всех товаров этого счёта"
  },
  "Standard": {
    "en": "Standard",
    "ar": "قياسي",
    "tr": "Standart",
    "fr": "Standard",
    "ru": "Стандартная"
  },
  "Wholesale": {
    "en": "Wholesale",
    "ar": "جملة",
    "tr": "Toptan",
    "fr": "Vente en gros",
    "ru": "Оптовая"
  },
  "Special": {
    "en": "Special",
    "ar": "خاص",
    "tr": "Özel",
    "fr": "Spécial",
    "ru": "Специальная"
  },
  "Payment Method": {
    "en": "Payment Method",
    "ar": "طريقة الدفع",
    "tr": "Ödeme Yöntemi",
    "fr": "Mode de paiement",
    "ru": "Способ оплаты"
  },
  "Crypto": {
    "en": "Crypto",
    "fr": "Cryptomonnaie",
    "ru": "Криптовалюта",
    "ar": "كريبتو",
    "tr": "Kripto"
  },
  "Letter of Credit": {
    "en": "Letter of Credit",
    "ar": "اعتماد مستندي",
    "tr": "Akreditif",
    "fr": "Crédit documentaire",
    "ru": "Аккредитив"
  },
  "Add Items": {
    "en": "Add Items",
    "ar": "إضافة قطع",
    "tr": "Ürün Ekle",
    "fr": "Ajouter des articles",
    "ru": "Добавить позиции"
  },
  "Invoice Items": {
    "en": "Invoice Items",
    "ar": "قطع الفاتورة",
    "tr": "Fatura Kalemleri",
    "fr": "Articles de la facture",
    "ru": "Позиции счёта"
  },
  "Invoice Summary": {
    "en": "Invoice Summary",
    "ar": "ملخص الفاتورة",
    "tr": "Fatura Özeti",
    "fr": "Récapitulatif",
    "ru": "Сводка по счёту"
  },
  "Save Invoice": {
    "en": "Save Invoice",
    "ar": "حفظ الفاتورة",
    "tr": "Faturayı Kaydet",
    "fr": "Enregistrer la facture",
    "ru": "Сохранить счёт"
  },
  "Name": {
    "en": "Name",
    "ar": "الاسم",
    "tr": "Ad",
    "fr": "Nom",
    "ru": "Название"
  },
  "Price": {
    "en": "Price",
    "ar": "السعر",
    "tr": "Fiyat",
    "fr": "Prix",
    "ru": "Цена"
  },
  "Invoice Preview": {
    "en": "Invoice Preview",
    "ar": "معاينة الفاتورة",
    "tr": "Fatura Önizleme",
    "fr": "Aperçu de la facture",
    "ru": "Предпросмотр счёта"
  },
  "Scan Barcode": {
    "en": "Scan Barcode",
    "ar": "مسح باركود",
    "tr": "Barkod Tara",
    "fr": "Scanner un code-barres",
    "ru": "Сканировать штрихкод"
  },
  "Settings": {
    "en": "Settings",
    "ar": "الإعدادات",
    "tr": "Ayarlar",
    "fr": "Paramètres",
    "ru": "Настройки"
  },
  "Change Logo": {
    "en": "Change Logo",
    "ar": "تغيير اللوجو",
    "tr": "Logo Değiştir",
    "fr": "Changer le logo",
    "ru": "Изменить логотип"
  },
  "Address": {
    "en": "Address",
    "ar": "العنوان",
    "tr": "Adres",
    "fr": "Adresse",
    "ru": "Адрес"
  },
  "Bank Name": {
    "en": "Bank Name",
    "ar": "البنك",
    "tr": "Banka",
    "fr": "Nom de la banque",
    "ru": "Название банка"
  },
  "Beneficiary": {
    "en": "Beneficiary",
    "ar": "المستفيد",
    "tr": "Lehdar",
    "fr": "Bénéficiaire",
    "ru": "Получатель"
  },
  "Account No": {
    "en": "Account No",
    "ar": "رقم الحساب",
    "tr": "Hesap No",
    "fr": "N° de compte",
    "ru": "Номер счёта"
  },
  "Next Invoice No": {
    "en": "Next Invoice No",
    "ar": "رقم الفاتورة التالي",
    "tr": "Sonraki Fatura No",
    "fr": "Prochain n° de facture",
    "ru": "Следующий номер счёта"
  },
  "Authorized Person": {
    "en": "Authorized Person",
    "ar": "الشخص المخوّل",
    "tr": "Yetkili",
    "fr": "Personne habilitée",
    "ru": "Уполномоченное лицо"
  },
  "Default Notes": {
    "en": "Default Notes",
    "ar": "ملاحظات افتراضية",
    "tr": "Varsayılan Notlar",
    "fr": "Notes par défaut",
    "ru": "Примечания по умолчанию"
  },
  "Save Settings": {
    "en": "Save Settings",
    "ar": "حفظ الإعدادات",
    "tr": "Ayarları Kaydet",
    "fr": "Enregistrer les paramètres",
    "ru": "Сохранить настройки"
  },
  "No clients found": {
    "en": "No clients found",
    "ar": "لا يوجد عملاء",
    "tr": "Müşteri bulunamadı",
    "fr": "Aucun client trouvé",
    "ru": "Клиенты не найдены"
  },
  "No clients in this category": {
    "en": "No clients in this category",
    "ar": "لا يوجد عملاء في هذه الفئة",
    "tr": "Bu kategoride müşteri yok",
    "fr": "Aucun client dans cette catégorie",
    "ru": "В этой категории нет клиентов"
  },
  "Add your first client": {
    "en": "Add your first client",
    "ar": "ابدأ بإضافة أول عميل",
    "tr": "İlk müşteriyi ekleyin",
    "fr": "Ajoutez votre premier client",
    "ru": "Добавьте первого клиента"
  },
  "No products": {
    "en": "No products",
    "ar": "لا توجد منتجات",
    "tr": "Ürün yok",
    "fr": "Aucun produit",
    "ru": "Нет товаров"
  },
  "No invoices": {
    "en": "No invoices",
    "ar": "لا توجد فواتير",
    "tr": "Fatura yok",
    "fr": "Aucune facture",
    "ru": "Нет счетов"
  },
  "✅ Company saved": {
    "en": "✅ Company saved",
    "ar": "✅ تم حفظ الشركة",
    "tr": "✅ Şirket kaydedildi",
    "fr": "Société enregistrée",
    "ru": "Компания сохранена"
  },
  "✅ Product saved": {
    "en": "✅ Product saved",
    "ar": "✅ تم حفظ المنتج",
    "tr": "✅ Ürün kaydedildi",
    "fr": "Produit enregistré",
    "ru": "Товар сохранён"
  },
  "✅ Invoice saved": {
    "en": "✅ Invoice saved",
    "ar": "✅ تم حفظ الفاتورة",
    "tr": "✅ Fatura kaydedildi",
    "fr": "Facture enregistrée",
    "ru": "Счёт сохранён"
  },
  "✅ Invoice updated": {
    "en": "✅ Invoice updated",
    "ar": "✅ تم تحديث الفاتورة",
    "tr": "✅ Fatura güncellendi",
    "fr": "Facture mise à jour",
    "ru": "Счёт обновлён"
  },
  "🗑️ Deleted": {
    "en": "🗑️ Deleted",
    "ar": "🗑️ تم الحذف",
    "tr": "🗑️ Silindi",
    "fr": "🗑️ Supprimé",
    "ru": "🗑️ Удалено"
  },
  "⚠️ Fill required fields": {
    "en": "⚠️ Fill required fields",
    "ar": "⚠️ يرجى ملء الحقول المطلوبة",
    "tr": "⚠️ Zorunlu alanları doldurun",
    "fr": "Remplissez les champs obligatoires",
    "ru": "Заполните обязательные поля"
  },
  "⚠️ Add items first": {
    "en": "⚠️ Add items first",
    "ar": "⚠️ أضف قطعاً للفاتورة",
    "tr": "⚠️ Ürün ekleyin",
    "fr": "Ajoutez des articles",
    "ru": "Добавьте позиции"
  },
  "⚠️ Select a company": {
    "en": "⚠️ Select a company",
    "ar": "⚠️ اختر شركة",
    "tr": "⚠️ Şirket seçin",
    "fr": "Sélectionnez une société",
    "ru": "Выберите компанию"
  },
  "✅ Rate updated": {
    "en": "✅ Rate updated",
    "ar": "✅ تم تحديث سعر الصرف",
    "tr": "✅ Kur güncellendi",
    "fr": "✅ Taux de change mis à jour",
    "ru": "✅ Курс валют обновлён"
  },
  "⚠️ Could not update rate": {
    "en": "⚠️ Could not update rate",
    "ar": "⚠️ تعذّر تحديث سعر الصرف",
    "tr": "⚠️ Kur güncellenemedi",
    "fr": "⚠️ Impossible de mettre à jour le taux de change",
    "ru": "⚠️ Не удалось обновить курс валют"
  },
  "✅ Barcode read": {
    "en": "✅ Barcode read",
    "ar": "✅ تم قراءة الباركود",
    "tr": "✅ Barkod okundu",
    "fr": "✅ Code-barres lu",
    "ru": "✅ Штрихкод считан"
  },
  "⚠️ Product not found": {
    "en": "⚠️ Product not found",
    "ar": "⚠️ لم يُعثر على منتج",
    "tr": "⚠️ Ürün bulunamadı",
    "fr": "⚠️ Produit introuvable",
    "ru": "⚠️ Товар не найден"
  },
  "✅ Settings saved": {
    "en": "✅ Settings saved",
    "ar": "✅ تم حفظ الإعدادات",
    "tr": "✅ Ayarlar kaydedildi",
    "fr": "Paramètres enregistrés",
    "ru": "Настройки сохранены"
  },
  "added to invoice": {
    "en": "added to invoice",
    "ar": "أُضيف للفاتورة",
    "tr": "faturaya eklendi",
    "fr": "ajouté à la facture",
    "ru": "добавлено в счёт"
  },
  "Good Morning": {
    "en": "Good Morning",
    "ar": "صباح الخير",
    "tr": "Günaydın",
    "fr": "Bonjour",
    "ru": "Доброе утро"
  },
  "Good Afternoon": {
    "en": "Good Afternoon",
    "ar": "يومك سعيد",
    "tr": "İyi günler",
    "fr": "Bon après-midi",
    "ru": "Добрый день"
  },
  "Good Evening": {
    "en": "Good Evening",
    "ar": "مساء الخير",
    "tr": "İyi akşamlar",
    "fr": "Bonsoir",
    "ru": "Добрый вечер"
  },
  "Good Night": {
    "en": "Good Night",
    "ar": "تصبح على خير",
    "tr": "İyi geceler",
    "fr": "Bonne nuit",
    "ru": "Доброй ночи"
  },
  "KDV Tax": {
    "en": "KDV Tax",
    "ar": "ضريبة KDV",
    "tr": "KDV Vergisi",
    "fr": "TVA (KDV)",
    "ru": "НДС (KDV)"
  },
  "Enable KDV on Invoice": {
    "en": "Enable KDV on Invoice",
    "ar": "تفعيل KDV في الفاتورة",
    "tr": "Faturada KDV Uygula",
    "fr": "Appliquer la TVA à la facture",
    "ru": "Применить НДС к счёту"
  },
  "KDV Rate (%)": {
    "en": "KDV Rate (%)",
    "ar": "نسبة KDV (%)",
    "tr": "KDV Oranı (%)",
    "fr": "Taux de TVA (%)",
    "ru": "Ставка НДС (%)"
  },
  "Current Exchange Rates": {
    "en": "Current Exchange Rates",
    "ar": "أسعار الصرف الحالية",
    "tr": "Güncel Döviz Kurları",
    "fr": "Taux de change actuels",
    "ru": "Текущие курсы валют"
  },
  "Update Rates": {
    "en": "Update Rates",
    "ar": "تحديث الأسعار",
    "tr": "Kurları Güncelle",
    "fr": "Actualiser les taux",
    "ru": "Обновить курсы"
  },
  "USD/TRY Manual": {
    "en": "USD/TRY Manual",
    "ar": "USD/TRY يدوي",
    "tr": "USD/TRY Manuel",
    "fr": "Taux USD/TRY manuel",
    "ru": "Курс USD/TRY вручную"
  },
  "USD/EUR Manual": {
    "en": "USD/EUR Manual",
    "ar": "USD/EUR يدوي",
    "tr": "USD/EUR Manuel",
    "fr": "Taux USD/EUR manuel",
    "ru": "Курс USD/EUR вручную"
  },
  "Leave empty to use automatic rates": {
    "en": "Leave empty to use automatic rates",
    "ar": "اتركها فارغة لاستخدام الأسعار التلقائية",
    "tr": "Otomatik kur için boş bırakın",
    "fr": "Laissez vide pour utiliser les taux automatiques",
    "ru": "Оставьте пустым для автоматического курса"
  },
  "Payment Management": {
    "en": "Payment Management",
    "ar": "إدارة الدفعات",
    "tr": "Ödeme Yönetimi",
    "fr": "Gestion des paiements",
    "ru": "Управление платежами"
  },
  "Currency Equivalents": {
    "en": "Currency Equivalents",
    "ar": "معادلات العملات",
    "tr": "Döviz Karşılıkları",
    "fr": "Équivalents en devises",
    "ru": "Эквиваленты в других валютах"
  },
  "Quick Standard Mode": {
    "en": "Quick Standard Mode",
    "ar": "الوضع القياسي السريع",
    "tr": "Hızlı Standart Mod",
    "fr": "Réglages standard rapides",
    "ru": "Быстрые стандартные настройки"
  },
  "Click to apply recommended default settings automatically": {
    "en": "Click to apply recommended default settings automatically",
    "ar": "انقر لتطبيق الإعدادات الافتراضية الموصى بها تلقائياً",
    "tr": "Önerilen varsayılan ayarları otomatik uygula",
    "fr": "Cliquez pour appliquer automatiquement les réglages recommandés",
    "ru": "Нажмите, чтобы применить рекомендуемые настройки"
  },
  "Apply": {
    "en": "Apply",
    "ar": "تطبيق",
    "tr": "Uygula",
    "fr": "Appliquer",
    "ru": "Применить"
  },
  "✅ Standard mode applied": {
    "en": "✅ Standard mode applied",
    "ar": "✅ تم تطبيق الوضع القياسي",
    "tr": "✅ Standart mod uygulandı",
    "fr": "✅ Réglages standard appliqués",
    "ru": "✅ Стандартные настройки применены"
  },
  "Customize": {
    "en": "Customize",
    "ar": "تخصيص",
    "tr": "Özelleştir",
    "fr": "Personnaliser",
    "ru": "Настроить"
  },
  "Print Language": {
    "en": "Print Language",
    "ar": "لغة الطباعة",
    "tr": "Yazdırma Dili",
    "fr": "Langue d’impression",
    "ru": "Язык печати"
  },
  "Show / Hide in Invoice": {
    "en": "Show / Hide in Invoice",
    "ar": "إظهار / إخفاء في الفاتورة",
    "tr": "Faturada Göster / Gizle",
    "fr": "Afficher ou masquer sur la facture",
    "ru": "Показать или скрыть в счёте"
  },
  "Images": {
    "en": "Images",
    "ar": "الصور",
    "tr": "Görseller",
    "fr": "Images",
    "ru": "Изображения"
  },
  "Weights": {
    "en": "Weights",
    "ar": "الأوزان",
    "tr": "Ağırlıklar",
    "fr": "Poids",
    "ru": "Вес"
  },
  "Signatures": {
    "en": "Signatures",
    "ar": "التوقيعات",
    "tr": "İmzalar",
    "fr": "Signatures",
    "ru": "Подписи"
  },
  "Bank Info": {
    "en": "Bank Info",
    "ar": "البنك",
    "tr": "Banka",
    "fr": "Coordonnées bancaires",
    "ru": "Банковские реквизиты"
  },
  "Exchange Rates": {
    "en": "Exchange Rates",
    "ar": "أسعار الصرف",
    "tr": "Döviz Kurları",
    "fr": "Taux de change",
    "ru": "Курсы валют"
  },
  "💰 Add Payment": {
    "en": "💰 Add Payment",
    "ar": "💰 إضافة دفعة",
    "tr": "💰 Ödeme Ekle",
    "fr": "Ajouter un paiement",
    "ru": "Добавить платёж"
  },
  "Good Morning! A new day full of opportunities 🌟": {
    "en": "Good Morning! A new day full of opportunities 🌟",
    "ar": "صباح النور! يوم جديد مليء بالفرص 🌟",
    "tr": "Günaydın! Yeni bir gün, yeni fırsatlar 🌟",
    "fr": "Bonjour ! Une nouvelle journée pleine de possibilités 🌟",
    "ru": "Доброе утро! Новый день — новые возможности 🌟"
  },
  "Good Morning! Ready for amazing invoices? ✨": {
    "en": "Good Morning! Ready for amazing invoices? ✨",
    "ar": "صباح الخير! جاهز لإنشاء فواتير رائعة؟ ✨",
    "tr": "Günaydın! Harika faturalar için hazır mısınız? ✨",
    "fr": "Bonjour ! Prêt à créer vos factures ? ✨",
    "ru": "Доброе утро! Готовы создавать счета? ✨"
  },
  "Great start! Morning is achievement time 💪": {
    "en": "Great start! Morning is achievement time 💪",
    "ar": "بداية رائعة! الصباح وقت الإنجاز 💪",
    "tr": "Harika bir başlangıç! 💪",
    "fr": "Une belle matinée pour avancer 💪",
    "ru": "Отличное утро для новых достижений 💪"
  },
  "Good Afternoon! How is work going? 😊": {
    "en": "Good Afternoon! How is work going? 😊",
    "ar": "يومك سعيد! كيف يسير العمل؟ 😊",
    "tr": "İyi günler! İşler nasıl gidiyor? 😊",
    "fr": "Bon après-midi ! Comment avance le travail ? 😊",
    "ru": "Добрый день! Как продвигается работа? 😊"
  },
  "Productive noon! Invoices are waiting 📄": {
    "en": "Productive noon! Invoices are waiting 📄",
    "ar": "نهار مثمر! الفواتير في انتظارك 📄",
    "tr": "Verimli bir öğle! 📄",
    "fr": "Un après-midi productif ! Les factures vous attendent 📄",
    "ru": "Продуктивного дня! Счета ждут 📄"
  },
  "Peak time! Let us achieve together 🚀": {
    "en": "Peak time! Let us achieve together 🚀",
    "ar": "وقت الذروة! لنُنجز معاً 🚀",
    "tr": "Birlikte başaralım 🚀",
    "fr": "Continuons à avancer ensemble 🚀",
    "ru": "Продолжим работать вместе 🚀"
  },
  "Good Evening! Time to review your work 📊": {
    "en": "Good Evening! Time to review your work 📊",
    "ar": "مساء الخير! وقت مراجعة الأعمال 📊",
    "tr": "İyi akşamlar! İşleri gözden geçirme vakti 📊",
    "fr": "Bonsoir ! C’est le moment de faire le point 📊",
    "ru": "Добрый вечер! Время подвести итоги 📊"
  },
  "Good Evening! How was your day? 🌆": {
    "en": "Good Evening! How was your day? 🌆",
    "ar": "مساء النور! كيف كان يومك؟ 🌆",
    "tr": "İyi akşamlar! 🌆",
    "fr": "Bonsoir ! Comment s’est passée votre journée ? 🌆",
    "ru": "Добрый вечер! Как прошёл ваш день? 🌆"
  },
  "A quiet evening for focused work 💼": {
    "en": "A quiet evening for focused work 💼",
    "ar": "أمسية هادئة للعمل بتركيز 💼",
    "tr": "Odaklanmak için sakin bir akşam 💼",
    "fr": "Une soirée calme pour travailler sereinement 💼",
    "ru": "Спокойный вечер для сосредоточенной работы 💼"
  },
  "Good Night! Do not forget to rest 🌙": {
    "en": "Good Night! Do not forget to rest 🌙",
    "ar": "ليلة طيبة! لا تنسَ الراحة 🌙",
    "tr": "İyi geceler! Dinlenmeyi unutmayın 🌙",
    "fr": "Bonne nuit ! Pensez à vous reposer 🌙",
    "ru": "Доброй ночи! Не забывайте отдыхать 🌙"
  },
  "Night work needs coffee ☕": {
    "en": "Night work needs coffee ☕",
    "ar": "العمل في الليل يحتاج قهوة ☕",
    "tr": "Gece çalışmak kahve ister ☕",
    "fr": "Un café pour le travail de nuit ☕",
    "ru": "Для ночной работы нужен кофе ☕"
  },
  "A quiet and productive night 🌟": {
    "en": "A quiet and productive night 🌟",
    "ar": "ليلة هادئة ومثمرة 🌟",
    "tr": "Sakin ve verimli bir gece 🌟",
    "fr": "Une nuit calme et productive 🌟",
    "ru": "Спокойной и продуктивной ночи 🌟"
  },
  "Always check the exchange rate before issuing any invoice to avoid financial losses.": {
    "en": "Always check the exchange rate before issuing any invoice to avoid financial losses.",
    "ar": "تحقق دائماً من سعر صرف الدولار قبل إصدار أي فاتورة لتجنب الخسائر.",
    "tr": "Fatura düzenlemeden önce her zaman döviz kurunu kontrol edin.",
    "fr": "Vérifiez le taux de change avant de créer une facture.",
    "ru": "Проверяйте курс валют перед созданием счёта."
  },
  "Add clear, high-quality photos to products to help clients identify them easily.": {
    "en": "Add clear, high-quality photos to products to help clients identify them easily.",
    "ar": "أضف صوراً واضحة وعالية الجودة للمنتجات لتسهيل التعرف عليها من قِبل العملاء.",
    "tr": "Ürünlerinize net ve yüksek kaliteli fotoğraflar ekleyin.",
    "fr": "Utilisez des photos claires pour présenter vos produits.",
    "ru": "Используйте чёткие фотографии товаров."
  },
  "Use the quick barcode feature to add products in seconds and save valuable time.": {
    "en": "Use the quick barcode feature to add products in seconds and save valuable time.",
    "ar": "استخدم خاصية الباركود السريع لإضافة المنتجات في ثوانٍ وتوفير الوقت.",
    "tr": "Barkod özelliğini kullanarak ürünleri saniyeler içinde ekleyin.",
    "fr": "Vérifiez les dimensions pour calculer le volume avec précision.",
    "ru": "Проверяйте размеры для точного расчёта объёма."
  },
  "Regularly back up all invoices by exporting them as PDF files.": {
    "en": "Regularly back up all invoices by exporting them as PDF files.",
    "ar": "احتفظ بنسخة احتياطية من جميع الفواتير بتصديرها كملفات PDF دورياً.",
    "tr": "Tüm faturaları PDF olarak düzenli aralıklarla yedekleyin.",
    "fr": "Enregistrez chaque paiement avec sa date et son mode de réception.",
    "ru": "Записывайте дату и способ получения каждого платежа."
  },
  "Add clear and detailed notes to every invoice to prevent misunderstandings with clients.": {
    "en": "Add clear and detailed notes to every invoice to prevent misunderstandings with clients.",
    "ar": "أضف ملاحظات واضحة ومفصّلة في كل فاتورة لتجنب أي سوء فهم مع العميل.",
    "tr": "Yanlış anlaşılmaları önlemek için her faturaya ayrıntılı notlar ekleyin.",
    "fr": "Vérifiez les coordonnées du client avant l’expédition.",
    "ru": "Проверяйте данные клиента перед отгрузкой."
  },
  "Verify product dimensions carefully for accurate CBM calculations and smooth shipping.": {
    "en": "Verify product dimensions carefully for accurate CBM calculations and smooth shipping.",
    "ar": "تأكد من صحة أبعاد المنتجات لحساب CBM بدقة وتجنب مشاكل الشحن.",
    "tr": "Doğru CBM hesabı için ürün boyutlarını eksiksiz girin.",
    "fr": "Prévisualisez la facture avant de l’imprimer.",
    "ru": "Проверяйте счёт перед печатью."
  },
  "Collecting a deposit upfront secures client commitment and protects your business.": {
    "en": "Collecting a deposit upfront secures client commitment and protects your business.",
    "ar": "العربون المسبق يضمن التزام العميل ويحمي حقوقك التجارية.",
    "tr": "Peşinat almak müşteri bağlılığını güçlendirir ve sizi korur.",
    "fr": "Conservez une sauvegarde régulière de vos données.",
    "ru": "Регулярно создавайте резервную копию данных."
  },
  "DELETE": {
    "en": "DELETE",
    "ar": "حذف",
    "tr": "SİL",
    "fr": "SUPPRIMER",
    "ru": "УДАЛИТЬ"
  },
  "Type to confirm:": {
    "en": "Type to confirm:",
    "ar": "اكتب للتأكيد:",
    "tr": "Onaylamak için yazın:",
    "fr": "Saisissez le mot de confirmation :",
    "ru": "Введите слово для подтверждения:"
  },
  "Invoice System": {
    "en": "Invoice System",
    "ar": "نظام الفواتير",
    "tr": "Fatura Sistemi",
    "fr": "Gestion des factures",
    "ru": "Система счетов"
  },
  "Monday": {
    "en": "Monday",
    "ar": "الاثنين",
    "tr": "Pazartesi",
    "fr": "Lundi",
    "ru": "Понедельник"
  },
  "Tuesday": {
    "en": "Tuesday",
    "ar": "الثلاثاء",
    "tr": "Salı",
    "fr": "Mardi",
    "ru": "Вторник"
  },
  "Wednesday": {
    "en": "Wednesday",
    "ar": "الأربعاء",
    "tr": "Çarşamba",
    "fr": "Mercredi",
    "ru": "Среда"
  },
  "Thursday": {
    "en": "Thursday",
    "ar": "الخميس",
    "tr": "Perşembe",
    "fr": "Jeudi",
    "ru": "Четверг"
  },
  "Friday": {
    "en": "Friday",
    "ar": "الجمعة",
    "tr": "Cuma",
    "fr": "Vendredi",
    "ru": "Пятница"
  },
  "Saturday": {
    "en": "Saturday",
    "ar": "السبت",
    "tr": "Cumartesi",
    "fr": "Samedi",
    "ru": "Суббота"
  },
  "Save Client": {
    "en": "Save Client",
    "ar": "حفظ العميل",
    "tr": "Müşteriyi Kaydet",
    "fr": "Enregistrer le client",
    "ru": "Сохранить клиента"
  },
  "🏠 Internal Retail": {
    "en": "🏠 Internal Retail",
    "ar": "🏠 داخلي مفرق",
    "tr": "🏠 İç Perakende",
    "fr": "🏠 Vente au détail locale",
    "ru": "🏠 Розница внутри страны"
  },
  "📦 Internal Wholesale": {
    "en": "📦 Internal Wholesale",
    "ar": "📦 داخلي جملة",
    "tr": "📦 İç Toptan",
    "fr": "📦 Vente en gros locale",
    "ru": "📦 Опт внутри страны"
  },
  "— Select —": {
    "en": "— Select —",
    "ar": "— اختر —",
    "tr": "— Seçiniz —",
    "fr": "— Sélectionner —",
    "ru": "— Выберите —"
  },
  "— Select Province —": {
    "en": "— Select Province —",
    "ar": "— اختر المحافظة —",
    "tr": "— İl Seçiniz —",
    "fr": "— Sélectionner une région —",
    "ru": "— Выберите регион —"
  },
  "items": {
    "en": "items",
    "ar": "قطعة",
    "tr": "ürün",
    "fr": "articles",
    "ru": "позиций"
  },
  "Adana": {
    "en": "Adana",
    "ar": "أضنة",
    "tr": "Adana",
    "fr": "Adana",
    "ru": "Adana"
  },
  "Adıyaman": {
    "en": "Adıyaman",
    "ar": "أديامان",
    "tr": "Adıyaman",
    "fr": "Adıyaman",
    "ru": "Adıyaman"
  },
  "Afyonkarahisar": {
    "en": "Afyonkarahisar",
    "ar": "أفيون قره حصار",
    "tr": "Afyonkarahisar",
    "fr": "Afyonkarahisar",
    "ru": "Afyonkarahisar"
  },
  "Ağrı": {
    "en": "Ağrı",
    "ar": "أغري",
    "tr": "Ağrı",
    "fr": "Ağrı",
    "ru": "Ağrı"
  },
  "Aksaray": {
    "en": "Aksaray",
    "ar": "أقسراي",
    "tr": "Aksaray",
    "fr": "Aksaray",
    "ru": "Aksaray"
  },
  "Amasya": {
    "en": "Amasya",
    "ar": "أماسيا",
    "tr": "Amasya",
    "fr": "Amasya",
    "ru": "Amasya"
  },
  "Ankara": {
    "en": "Ankara",
    "ar": "أنقرة",
    "tr": "Ankara",
    "fr": "Ankara",
    "ru": "Ankara"
  },
  "Antalya": {
    "en": "Antalya",
    "ar": "أنطاليا",
    "tr": "Antalya",
    "fr": "Antalya",
    "ru": "Antalya"
  },
  "Ardahan": {
    "en": "Ardahan",
    "ar": "أردهان",
    "tr": "Ardahan",
    "fr": "Ardahan",
    "ru": "Ardahan"
  },
  "Artvin": {
    "en": "Artvin",
    "ar": "أرتفين",
    "tr": "Artvin",
    "fr": "Artvin",
    "ru": "Artvin"
  },
  "Aydın": {
    "en": "Aydın",
    "ar": "أيدين",
    "tr": "Aydın",
    "fr": "Aydın",
    "ru": "Aydın"
  },
  "Balıkesir": {
    "en": "Balıkesir",
    "ar": "بالق أسير",
    "tr": "Balıkesir",
    "fr": "Balıkesir",
    "ru": "Balıkesir"
  },
  "Bartın": {
    "en": "Bartın",
    "ar": "بارتين",
    "tr": "Bartın",
    "fr": "Bartın",
    "ru": "Bartın"
  },
  "Batman": {
    "en": "Batman",
    "ar": "باتمان",
    "tr": "Batman",
    "fr": "Batman",
    "ru": "Batman"
  },
  "Bayburt": {
    "en": "Bayburt",
    "ar": "بايبورت",
    "tr": "Bayburt",
    "fr": "Bayburt",
    "ru": "Bayburt"
  },
  "Bilecik": {
    "en": "Bilecik",
    "ar": "بيله جيك",
    "tr": "Bilecik",
    "fr": "Bilecik",
    "ru": "Bilecik"
  },
  "Bingöl": {
    "en": "Bingöl",
    "ar": "بينغول",
    "tr": "Bingöl",
    "fr": "Bingöl",
    "ru": "Bingöl"
  },
  "Bitlis": {
    "en": "Bitlis",
    "ar": "بدليس",
    "tr": "Bitlis",
    "fr": "Bitlis",
    "ru": "Bitlis"
  },
  "Bolu": {
    "en": "Bolu",
    "ar": "بولو",
    "tr": "Bolu",
    "fr": "Bolu",
    "ru": "Bolu"
  },
  "Burdur": {
    "en": "Burdur",
    "ar": "بوردور",
    "tr": "Burdur",
    "fr": "Burdur",
    "ru": "Burdur"
  },
  "Bursa": {
    "en": "Bursa",
    "ar": "بورصة",
    "tr": "Bursa",
    "fr": "Bursa",
    "ru": "Bursa"
  },
  "Çanakkale": {
    "en": "Çanakkale",
    "ar": "جناق قلعة",
    "tr": "Çanakkale",
    "fr": "Çanakkale",
    "ru": "Çanakkale"
  },
  "Çankırı": {
    "en": "Çankırı",
    "ar": "جانكيري",
    "tr": "Çankırı",
    "fr": "Çankırı",
    "ru": "Çankırı"
  },
  "Çorum": {
    "en": "Çorum",
    "ar": "جوروم",
    "tr": "Çorum",
    "fr": "Çorum",
    "ru": "Çorum"
  },
  "Denizli": {
    "en": "Denizli",
    "ar": "دنيزلي",
    "tr": "Denizli",
    "fr": "Denizli",
    "ru": "Denizli"
  },
  "Diyarbakır": {
    "en": "Diyarbakır",
    "ar": "ديار بكر",
    "tr": "Diyarbakır",
    "fr": "Diyarbakır",
    "ru": "Diyarbakır"
  },
  "Düzce": {
    "en": "Düzce",
    "ar": "دوزجة",
    "tr": "Düzce",
    "fr": "Düzce",
    "ru": "Düzce"
  },
  "Edirne": {
    "en": "Edirne",
    "ar": "أدرنة",
    "tr": "Edirne",
    "fr": "Edirne",
    "ru": "Edirne"
  },
  "Elazığ": {
    "en": "Elazığ",
    "ar": "إيلازيغ",
    "tr": "Elazığ",
    "fr": "Elazığ",
    "ru": "Elazığ"
  },
  "Erzincan": {
    "en": "Erzincan",
    "ar": "أرزينجان",
    "tr": "Erzincan",
    "fr": "Erzincan",
    "ru": "Erzincan"
  },
  "Erzurum": {
    "en": "Erzurum",
    "ar": "أرضروم",
    "tr": "Erzurum",
    "fr": "Erzurum",
    "ru": "Erzurum"
  },
  "Eskişehir": {
    "en": "Eskişehir",
    "ar": "إسكي شهير",
    "tr": "Eskişehir",
    "fr": "Eskişehir",
    "ru": "Eskişehir"
  },
  "Gaziantep": {
    "en": "Gaziantep",
    "ar": "غازي عنتاب",
    "tr": "Gaziantep",
    "fr": "Gaziantep",
    "ru": "Gaziantep"
  },
  "Giresun": {
    "en": "Giresun",
    "ar": "غيرسون",
    "tr": "Giresun",
    "fr": "Giresun",
    "ru": "Giresun"
  },
  "Gümüşhane": {
    "en": "Gümüşhane",
    "ar": "غوموش هانه",
    "tr": "Gümüşhane",
    "fr": "Gümüşhane",
    "ru": "Gümüşhane"
  },
  "Hakkari": {
    "en": "Hakkari",
    "ar": "هكاري",
    "tr": "Hakkari",
    "fr": "Hakkari",
    "ru": "Hakkari"
  },
  "Hatay": {
    "en": "Hatay",
    "ar": "هاتاي",
    "tr": "Hatay",
    "fr": "Hatay",
    "ru": "Hatay"
  },
  "Iğdır": {
    "en": "Iğdır",
    "ar": "إغدير",
    "tr": "Iğdır",
    "fr": "Iğdır",
    "ru": "Iğdır"
  },
  "Isparta": {
    "en": "Isparta",
    "ar": "إسبارطة",
    "tr": "Isparta",
    "fr": "Isparta",
    "ru": "Isparta"
  },
  "Istanbul": {
    "en": "Istanbul",
    "ar": "إسطنبول",
    "tr": "İstanbul",
    "fr": "Istanbul",
    "ru": "Istanbul"
  },
  "İzmir": {
    "en": "İzmir",
    "ar": "إزمير",
    "tr": "İzmir",
    "fr": "İzmir",
    "ru": "İzmir"
  },
  "Kahramanmaraş": {
    "en": "Kahramanmaraş",
    "ar": "قهرمان مرعش",
    "tr": "Kahramanmaraş",
    "fr": "Kahramanmaraş",
    "ru": "Kahramanmaraş"
  },
  "Karabük": {
    "en": "Karabük",
    "ar": "قرابوك",
    "tr": "Karabük",
    "fr": "Karabük",
    "ru": "Karabük"
  },
  "Karaman": {
    "en": "Karaman",
    "ar": "قرامان",
    "tr": "Karaman",
    "fr": "Karaman",
    "ru": "Karaman"
  },
  "Kars": {
    "en": "Kars",
    "ar": "قارص",
    "tr": "Kars",
    "fr": "Kars",
    "ru": "Kars"
  },
  "Kastamonu": {
    "en": "Kastamonu",
    "ar": "قسطموني",
    "tr": "Kastamonu",
    "fr": "Kastamonu",
    "ru": "Kastamonu"
  },
  "Kayseri": {
    "en": "Kayseri",
    "ar": "قيصري",
    "tr": "Kayseri",
    "fr": "Kayseri",
    "ru": "Kayseri"
  },
  "Kırıkkale": {
    "en": "Kırıkkale",
    "ar": "كيريق قلعة",
    "tr": "Kırıkkale",
    "fr": "Kırıkkale",
    "ru": "Kırıkkale"
  },
  "Kırklareli": {
    "en": "Kırklareli",
    "ar": "قيرق لارلي",
    "tr": "Kırklareli",
    "fr": "Kırklareli",
    "ru": "Kırklareli"
  },
  "Kırşehir": {
    "en": "Kırşehir",
    "ar": "قير شهير",
    "tr": "Kırşehir",
    "fr": "Kırşehir",
    "ru": "Kırşehir"
  },
  "Kilis": {
    "en": "Kilis",
    "ar": "كيليس",
    "tr": "Kilis",
    "fr": "Kilis",
    "ru": "Kilis"
  },
  "Kocaeli": {
    "en": "Kocaeli",
    "ar": "كوجاإيلي",
    "tr": "Kocaeli",
    "fr": "Kocaeli",
    "ru": "Kocaeli"
  },
  "Konya": {
    "en": "Konya",
    "ar": "قونية",
    "tr": "Konya",
    "fr": "Konya",
    "ru": "Konya"
  },
  "Kütahya": {
    "en": "Kütahya",
    "ar": "كوتاهيا",
    "tr": "Kütahya",
    "fr": "Kütahya",
    "ru": "Kütahya"
  },
  "Malatya": {
    "en": "Malatya",
    "ar": "ملاطية",
    "tr": "Malatya",
    "fr": "Malatya",
    "ru": "Malatya"
  },
  "Manisa": {
    "en": "Manisa",
    "ar": "مانيسا",
    "tr": "Manisa",
    "fr": "Manisa",
    "ru": "Manisa"
  },
  "Mardin": {
    "en": "Mardin",
    "ar": "ماردين",
    "tr": "Mardin",
    "fr": "Mardin",
    "ru": "Mardin"
  },
  "Mersin": {
    "en": "Mersin",
    "ar": "مرسين",
    "tr": "Mersin",
    "fr": "Mersin",
    "ru": "Mersin"
  },
  "Muğla": {
    "en": "Muğla",
    "ar": "موغلا",
    "tr": "Muğla",
    "fr": "Muğla",
    "ru": "Muğla"
  },
  "Muş": {
    "en": "Muş",
    "ar": "موش",
    "tr": "Muş",
    "fr": "Muş",
    "ru": "Muş"
  },
  "Nevşehir": {
    "en": "Nevşehir",
    "ar": "نيف شهير",
    "tr": "Nevşehir",
    "fr": "Nevşehir",
    "ru": "Nevşehir"
  },
  "Niğde": {
    "en": "Niğde",
    "ar": "نيغده",
    "tr": "Niğde",
    "fr": "Niğde",
    "ru": "Niğde"
  },
  "Ordu": {
    "en": "Ordu",
    "ar": "أوردو",
    "tr": "Ordu",
    "fr": "Ordu",
    "ru": "Ordu"
  },
  "Osmaniye": {
    "en": "Osmaniye",
    "ar": "عثمانية",
    "tr": "Osmaniye",
    "fr": "Osmaniye",
    "ru": "Osmaniye"
  },
  "Rize": {
    "en": "Rize",
    "ar": "ريزة",
    "tr": "Rize",
    "fr": "Rize",
    "ru": "Rize"
  },
  "Sakarya": {
    "en": "Sakarya",
    "ar": "سكاريا",
    "tr": "Sakarya",
    "fr": "Sakarya",
    "ru": "Sakarya"
  },
  "Samsun": {
    "en": "Samsun",
    "ar": "سامسون",
    "tr": "Samsun",
    "fr": "Samsun",
    "ru": "Samsun"
  },
  "Siirt": {
    "en": "Siirt",
    "ar": "سيرت",
    "tr": "Siirt",
    "fr": "Siirt",
    "ru": "Siirt"
  },
  "Sinop": {
    "en": "Sinop",
    "ar": "سينوب",
    "tr": "Sinop",
    "fr": "Sinop",
    "ru": "Sinop"
  },
  "Sivas": {
    "en": "Sivas",
    "ar": "سيواس",
    "tr": "Sivas",
    "fr": "Sivas",
    "ru": "Sivas"
  },
  "Şanlıurfa": {
    "en": "Şanlıurfa",
    "ar": "شانلي أورفا",
    "tr": "Şanlıurfa",
    "fr": "Şanlıurfa",
    "ru": "Şanlıurfa"
  },
  "Şırnak": {
    "en": "Şırnak",
    "ar": "شرناق",
    "tr": "Şırnak",
    "fr": "Şırnak",
    "ru": "Şırnak"
  },
  "Tekirdağ": {
    "en": "Tekirdağ",
    "ar": "تكيرداغ",
    "tr": "Tekirdağ",
    "fr": "Tekirdağ",
    "ru": "Tekirdağ"
  },
  "Tokat": {
    "en": "Tokat",
    "ar": "توقات",
    "tr": "Tokat",
    "fr": "Tokat",
    "ru": "Tokat"
  },
  "Trabzon": {
    "en": "Trabzon",
    "ar": "طرابزون",
    "tr": "Trabzon",
    "fr": "Trabzon",
    "ru": "Trabzon"
  },
  "Tunceli": {
    "en": "Tunceli",
    "ar": "تونجلي",
    "tr": "Tunceli",
    "fr": "Tunceli",
    "ru": "Tunceli"
  },
  "Uşak": {
    "en": "Uşak",
    "ar": "أوشاق",
    "tr": "Uşak",
    "fr": "Uşak",
    "ru": "Uşak"
  },
  "Van": {
    "en": "Van",
    "ar": "وان",
    "tr": "Van",
    "fr": "Van",
    "ru": "Van"
  },
  "Yalova": {
    "en": "Yalova",
    "ar": "يالوفا",
    "tr": "Yalova",
    "fr": "Yalova",
    "ru": "Yalova"
  },
  "Yozgat": {
    "en": "Yozgat",
    "ar": "يوزغات",
    "tr": "Yozgat",
    "fr": "Yozgat",
    "ru": "Yozgat"
  },
  "Zonguldak": {
    "en": "Zonguldak",
    "ar": "زونغولداق",
    "tr": "Zonguldak",
    "fr": "Zonguldak",
    "ru": "Zonguldak"
  },
  "🇸🇦 Saudi Arabia": {
    "en": "🇸🇦 Saudi Arabia",
    "ar": "🇸🇦 المملكة العربية السعودية",
    "tr": "🇸🇦 Suudi Arabistan",
    "fr": "🇸🇦 Arabie saoudite",
    "ru": "🇸🇦 Саудовская Аравия"
  },
  "🇦🇪 United Arab Emirates": {
    "en": "🇦🇪 United Arab Emirates",
    "ar": "🇦🇪 الإمارات العربية المتحدة",
    "tr": "🇦🇪 Birleşik Arap Emirlikleri",
    "fr": "🇦🇪 Émirats arabes unis",
    "ru": "🇦🇪 ОАЭ"
  },
  "🇰🇼 Kuwait": {
    "en": "🇰🇼 Kuwait",
    "ar": "🇰🇼 الكويت",
    "tr": "🇰🇼 Kuveyt",
    "fr": "🇰🇼 Koweït",
    "ru": "🇰🇼 Кувейт"
  },
  "🇶🇦 Qatar": {
    "en": "🇶🇦 Qatar",
    "ar": "🇶🇦 قطر",
    "tr": "🇶🇦 Katar",
    "fr": "🇶🇦 Qatar",
    "ru": "🇶🇦 Катар"
  },
  "🇧🇭 Bahrain": {
    "en": "🇧🇭 Bahrain",
    "ar": "🇧🇭 البحرين",
    "tr": "🇧🇭 Bahreyn",
    "fr": "🇧🇭 Bahreïn",
    "ru": "🇧🇭 Бахрейн"
  },
  "🇴🇲 Oman": {
    "en": "🇴🇲 Oman",
    "ar": "🇴🇲 عُمان",
    "tr": "🇴🇲 Umman",
    "fr": "🇴🇲 Oman",
    "ru": "🇴🇲 Оман"
  },
  "🇮🇶 Iraq": {
    "en": "🇮🇶 Iraq",
    "ar": "🇮🇶 العراق",
    "tr": "🇮🇶 Irak",
    "fr": "🇮🇶 Irak",
    "ru": "🇮🇶 Ирак"
  },
  "🇸🇾 Syria": {
    "en": "🇸🇾 Syria",
    "ar": "🇸🇾 سوريا",
    "tr": "🇸🇾 Suriye",
    "fr": "🇸🇾 Syrie",
    "ru": "🇸🇾 Сирия"
  },
  "🇱🇧 Lebanon": {
    "en": "🇱🇧 Lebanon",
    "ar": "🇱🇧 لبنان",
    "tr": "🇱🇧 Lübnan",
    "fr": "🇱🇧 Liban",
    "ru": "🇱🇧 Ливан"
  },
  "🇯🇴 Jordan": {
    "en": "🇯🇴 Jordan",
    "ar": "🇯🇴 الأردن",
    "tr": "🇯🇴 Ürdün",
    "fr": "🇯🇴 Jordanie",
    "ru": "🇯🇴 Иордания"
  },
  "🇵🇸 Palestine": {
    "en": "🇵🇸 Palestine",
    "ar": "🇵🇸 فلسطين",
    "tr": "🇵🇸 Filistin",
    "fr": "🇵🇸 Territoires palestiniens",
    "ru": "🇵🇸 Палестинские территории"
  },
  "🇾🇪 Yemen": {
    "en": "🇾🇪 Yemen",
    "ar": "🇾🇪 اليمن",
    "tr": "🇾🇪 Yemen",
    "fr": "🇾🇪 Yémen",
    "ru": "🇾🇪 Йемен"
  },
  "🇪🇬 Egypt": {
    "en": "🇪🇬 Egypt",
    "ar": "🇪🇬 مصر",
    "tr": "🇪🇬 Mısır",
    "fr": "🇪🇬 Égypte",
    "ru": "🇪🇬 Египет"
  },
  "🇱🇾 Libya": {
    "en": "🇱🇾 Libya",
    "ar": "🇱🇾 ليبيا",
    "tr": "🇱🇾 Libya",
    "fr": "🇱🇾 Libye",
    "ru": "🇱🇾 Ливия"
  },
  "🇹🇳 Tunisia": {
    "en": "🇹🇳 Tunisia",
    "ar": "🇹🇳 تونس",
    "tr": "🇹🇳 Tunus",
    "fr": "🇹🇳 Tunisie",
    "ru": "🇹🇳 Тунис"
  },
  "🇩🇿 Algeria": {
    "en": "🇩🇿 Algeria",
    "ar": "🇩🇿 الجزائر",
    "tr": "🇩🇿 Cezayir",
    "fr": "🇩🇿 Algérie",
    "ru": "🇩🇿 Алжир"
  },
  "🇲🇦 Morocco": {
    "en": "🇲🇦 Morocco",
    "ar": "🇲🇦 المغرب",
    "tr": "🇲🇦 Fas",
    "fr": "🇲🇦 Maroc",
    "ru": "🇲🇦 Марокко"
  },
  "🇲🇷 Mauritania": {
    "en": "🇲🇷 Mauritania",
    "ar": "🇲🇷 موريتانيا",
    "tr": "🇲🇷 Moritanya",
    "fr": "🇲🇷 Mauritanie",
    "ru": "🇲🇷 Мавритания"
  },
  "🇸🇩 Sudan": {
    "en": "🇸🇩 Sudan",
    "ar": "🇸🇩 السودان",
    "tr": "🇸🇩 Sudan",
    "fr": "🇸🇩 Soudan",
    "ru": "🇸🇩 Судан"
  },
  "🇸🇴 Somalia": {
    "en": "🇸🇴 Somalia",
    "ar": "🇸🇴 الصومال",
    "tr": "🇸🇴 Somali",
    "fr": "🇸🇴 Somalie",
    "ru": "🇸🇴 Сомали"
  },
  "🇩🇯 Djibouti": {
    "en": "🇩🇯 Djibouti",
    "ar": "🇩🇯 جيبوتي",
    "tr": "🇩🇯 Cibuti",
    "fr": "🇩🇯 Djibouti",
    "ru": "🇩🇯 Джибути"
  },
  "🇰🇲 Comoros": {
    "en": "🇰🇲 Comoros",
    "ar": "🇰🇲 جزر القمر",
    "tr": "🇰🇲 Komorlar",
    "fr": "🇰🇲 Comores",
    "ru": "🇰🇲 Коморы"
  },
  "🇹🇷 Turkey": {
    "en": "🇹🇷 Turkey",
    "ar": "🇹🇷 تركيا",
    "tr": "🇹🇷 Türkiye",
    "fr": "🇹🇷 Turquie",
    "ru": "🇹🇷 Турция"
  },
  "🇮🇷 Iran": {
    "en": "🇮🇷 Iran",
    "ar": "🇮🇷 إيران",
    "tr": "🇮🇷 İran",
    "fr": "🇮🇷 Iran",
    "ru": "🇮🇷 Иран"
  },
  "🇦🇫 Afghanistan": {
    "en": "🇦🇫 Afghanistan",
    "ar": "🇦🇫 أفغانستان",
    "tr": "🇦🇫 Afganistan",
    "fr": "🇦🇫 Afghanistan",
    "ru": "🇦🇫 Афганистан"
  },
  "🇵🇰 Pakistan": {
    "en": "🇵🇰 Pakistan",
    "ar": "🇵🇰 باكستان",
    "tr": "🇵🇰 Pakistan",
    "fr": "🇵🇰 Pakistan",
    "ru": "🇵🇰 Пакистан"
  },
  "🇩🇪 Germany": {
    "en": "🇩🇪 Germany",
    "ar": "🇩🇪 ألمانيا",
    "tr": "🇩🇪 Almanya",
    "fr": "🇩🇪 Allemagne",
    "ru": "🇩🇪 Германия"
  },
  "🇫🇷 France": {
    "en": "🇫🇷 France",
    "ar": "🇫🇷 فرنسا",
    "tr": "🇫🇷 Fransa",
    "fr": "🇫🇷 France",
    "ru": "🇫🇷 Франция"
  },
  "🇬🇧 United Kingdom": {
    "en": "🇬🇧 United Kingdom",
    "ar": "🇬🇧 المملكة المتحدة",
    "tr": "🇬🇧 Birleşik Krallık",
    "fr": "🇬🇧 Royaume-Uni",
    "ru": "🇬🇧 Великобритания"
  },
  "🇮🇹 Italy": {
    "en": "🇮🇹 Italy",
    "ar": "🇮🇹 إيطاليا",
    "tr": "🇮🇹 İtalya",
    "fr": "🇮🇹 Italie",
    "ru": "🇮🇹 Италия"
  },
  "🇪🇸 Spain": {
    "en": "🇪🇸 Spain",
    "ar": "🇪🇸 إسبانيا",
    "tr": "🇪🇸 İspanya",
    "fr": "🇪🇸 Espagne",
    "ru": "🇪🇸 Испания"
  },
  "🇵🇹 Portugal": {
    "en": "🇵🇹 Portugal",
    "ar": "🇵🇹 البرتغال",
    "tr": "🇵🇹 Portekiz",
    "fr": "🇵🇹 Portugal",
    "ru": "🇵🇹 Португалия"
  },
  "🇳🇱 Netherlands": {
    "en": "🇳🇱 Netherlands",
    "ar": "🇳🇱 هولندا",
    "tr": "🇳🇱 Hollanda",
    "fr": "🇳🇱 Pays-Bas",
    "ru": "🇳🇱 Нидерланды"
  },
  "🇧🇪 Belgium": {
    "en": "🇧🇪 Belgium",
    "ar": "🇧🇪 بلجيكا",
    "tr": "🇧🇪 Belçika",
    "fr": "🇧🇪 Belgique",
    "ru": "🇧🇪 Бельгия"
  },
  "🇨🇭 Switzerland": {
    "en": "🇨🇭 Switzerland",
    "ar": "🇨🇭 سويسرا",
    "tr": "🇨🇭 İsviçre",
    "fr": "🇨🇭 Suisse",
    "ru": "🇨🇭 Швейцария"
  },
  "🇦🇹 Austria": {
    "en": "🇦🇹 Austria",
    "ar": "🇦🇹 النمسا",
    "tr": "🇦🇹 Avusturya",
    "fr": "🇦🇹 Autriche",
    "ru": "🇦🇹 Австрия"
  },
  "🇸🇪 Sweden": {
    "en": "🇸🇪 Sweden",
    "ar": "🇸🇪 السويد",
    "tr": "🇸🇪 İsveç",
    "fr": "🇸🇪 Suède",
    "ru": "🇸🇪 Швеция"
  },
  "🇳🇴 Norway": {
    "en": "🇳🇴 Norway",
    "ar": "🇳🇴 النرويج",
    "tr": "🇳🇴 Norveç",
    "fr": "🇳🇴 Norvège",
    "ru": "🇳🇴 Норвегия"
  },
  "🇩🇰 Denmark": {
    "en": "🇩🇰 Denmark",
    "ar": "🇩🇰 الدنمارك",
    "tr": "🇩🇰 Danimarka",
    "fr": "🇩🇰 Danemark",
    "ru": "🇩🇰 Дания"
  },
  "🇫🇮 Finland": {
    "en": "🇫🇮 Finland",
    "ar": "🇫🇮 فنلندا",
    "tr": "🇫🇮 Finlandiya",
    "fr": "🇫🇮 Finlande",
    "ru": "🇫🇮 Финляндия"
  },
  "🇵🇱 Poland": {
    "en": "🇵🇱 Poland",
    "ar": "🇵🇱 بولندا",
    "tr": "🇵🇱 Polonya",
    "fr": "🇵🇱 Pologne",
    "ru": "🇵🇱 Польша"
  },
  "🇨🇿 Czech Republic": {
    "en": "🇨🇿 Czech Republic",
    "ar": "🇨🇿 التشيك",
    "tr": "🇨🇿 Çekya",
    "fr": "🇨🇿 Tchéquie",
    "ru": "🇨🇿 Чехия"
  },
  "🇸🇰 Slovakia": {
    "en": "🇸🇰 Slovakia",
    "ar": "🇸🇰 سلوفاكيا",
    "tr": "🇸🇰 Slovakya",
    "fr": "🇸🇰 Slovaquie",
    "ru": "🇸🇰 Словакия"
  },
  "🇭🇺 Hungary": {
    "en": "🇭🇺 Hungary",
    "ar": "🇭🇺 المجر",
    "tr": "🇭🇺 Macaristan",
    "fr": "🇭🇺 Hongrie",
    "ru": "🇭🇺 Венгрия"
  },
  "🇷🇴 Romania": {
    "en": "🇷🇴 Romania",
    "ar": "🇷🇴 رومانيا",
    "tr": "🇷🇴 Romanya",
    "fr": "🇷🇴 Roumanie",
    "ru": "🇷🇴 Румыния"
  },
  "🇧🇬 Bulgaria": {
    "en": "🇧🇬 Bulgaria",
    "ar": "🇧🇬 بلغاريا",
    "tr": "🇧🇬 Bulgaristan",
    "fr": "🇧🇬 Bulgarie",
    "ru": "🇧🇬 Болгария"
  },
  "🇬🇷 Greece": {
    "en": "🇬🇷 Greece",
    "ar": "🇬🇷 اليونان",
    "tr": "🇬🇷 Yunanistan",
    "fr": "🇬🇷 Grèce",
    "ru": "🇬🇷 Греция"
  },
  "🇭🇷 Croatia": {
    "en": "🇭🇷 Croatia",
    "ar": "🇭🇷 كرواتيا",
    "tr": "🇭🇷 Hırvatistan",
    "fr": "🇭🇷 Croatie",
    "ru": "🇭🇷 Хорватия"
  },
  "🇷🇸 Serbia": {
    "en": "🇷🇸 Serbia",
    "ar": "🇷🇸 صربيا",
    "tr": "🇷🇸 Sırbistan",
    "fr": "🇷🇸 Serbie",
    "ru": "🇷🇸 Сербия"
  },
  "🇧🇦 Bosnia & Herzegovina": {
    "en": "🇧🇦 Bosnia & Herzegovina",
    "ar": "🇧🇦 البوسنة والهرسك",
    "tr": "🇧🇦 Bosna Hersek",
    "fr": "🇧🇦 Bosnie-Herzégovine",
    "ru": "🇧🇦 Босния и Герцеговина"
  },
  "🇦🇱 Albania": {
    "en": "🇦🇱 Albania",
    "ar": "🇦🇱 ألبانيا",
    "tr": "🇦🇱 Arnavutluk",
    "fr": "🇦🇱 Albanie",
    "ru": "🇦🇱 Албания"
  },
  "🇲🇰 North Macedonia": {
    "en": "🇲🇰 North Macedonia",
    "ar": "🇲🇰 مقدونيا الشمالية",
    "tr": "🇲🇰 Kuzey Makedonya",
    "fr": "🇲🇰 Macédoine du Nord",
    "ru": "🇲🇰 Северная Македония"
  },
  "🇲🇪 Montenegro": {
    "en": "🇲🇪 Montenegro",
    "ar": "🇲🇪 الجبل الأسود",
    "tr": "🇲🇪 Karadağ",
    "fr": "🇲🇪 Monténégro",
    "ru": "🇲🇪 Черногория"
  },
  "🇸🇮 Slovenia": {
    "en": "🇸🇮 Slovenia",
    "ar": "🇸🇮 سلوفينيا",
    "tr": "🇸🇮 Slovenya",
    "fr": "🇸🇮 Slovénie",
    "ru": "🇸🇮 Словения"
  },
  "🇺🇦 Ukraine": {
    "en": "🇺🇦 Ukraine",
    "ar": "🇺🇦 أوكرانيا",
    "tr": "🇺🇦 Ukrayna",
    "fr": "🇺🇦 Ukraine",
    "ru": "🇺🇦 Украина"
  },
  "🇷🇺 Russia": {
    "en": "🇷🇺 Russia",
    "ar": "🇷🇺 روسيا",
    "tr": "🇷🇺 Rusya",
    "fr": "🇷🇺 Russie",
    "ru": "🇷🇺 Россия"
  },
  "🇧🇾 Belarus": {
    "en": "🇧🇾 Belarus",
    "ar": "🇧🇾 بيلاروسيا",
    "tr": "🇧🇾 Belarus",
    "fr": "🇧🇾 Biélorussie",
    "ru": "🇧🇾 Беларусь"
  },
  "🇲🇩 Moldova": {
    "en": "🇲🇩 Moldova",
    "ar": "🇲🇩 مولدوفا",
    "tr": "🇲🇩 Moldova",
    "fr": "🇲🇩 Moldavie",
    "ru": "🇲🇩 Молдова"
  },
  "🇱🇹 Lithuania": {
    "en": "🇱🇹 Lithuania",
    "ar": "🇱🇹 ليتوانيا",
    "tr": "🇱🇹 Litvanya",
    "fr": "🇱🇹 Lituanie",
    "ru": "🇱🇹 Литва"
  },
  "🇱🇻 Latvia": {
    "en": "🇱🇻 Latvia",
    "ar": "🇱🇻 لاتفيا",
    "tr": "🇱🇻 Letonya",
    "fr": "🇱🇻 Lettonie",
    "ru": "🇱🇻 Латвия"
  },
  "🇪🇪 Estonia": {
    "en": "🇪🇪 Estonia",
    "ar": "🇪🇪 إستونيا",
    "tr": "🇪🇪 Estonya",
    "fr": "🇪🇪 Estonie",
    "ru": "🇪🇪 Эстония"
  },
  "🇮🇪 Ireland": {
    "en": "🇮🇪 Ireland",
    "ar": "🇮🇪 أيرلندا",
    "tr": "🇮🇪 İrlanda",
    "fr": "🇮🇪 Irlande",
    "ru": "🇮🇪 Ирландия"
  },
  "🇮🇸 Iceland": {
    "en": "🇮🇸 Iceland",
    "ar": "🇮🇸 آيسلندا",
    "tr": "🇮🇸 İzlanda",
    "fr": "🇮🇸 Islande",
    "ru": "🇮🇸 Исландия"
  },
  "🇱🇺 Luxembourg": {
    "en": "🇱🇺 Luxembourg",
    "ar": "🇱🇺 لوكسمبورغ",
    "tr": "🇱🇺 Lüksemburg",
    "fr": "🇱🇺 Luxembourg",
    "ru": "🇱🇺 Люксембург"
  },
  "🇲🇹 Malta": {
    "en": "🇲🇹 Malta",
    "ar": "🇲🇹 مالطا",
    "tr": "🇲🇹 Malta",
    "fr": "🇲🇹 Malte",
    "ru": "🇲🇹 Мальта"
  },
  "🇨🇾 Cyprus": {
    "en": "🇨🇾 Cyprus",
    "ar": "🇨🇾 قبرص",
    "tr": "🇨🇾 Kıbrıs",
    "fr": "🇨🇾 Chypre",
    "ru": "🇨🇾 Кипр"
  },
  "🇦🇿 Azerbaijan": {
    "en": "🇦🇿 Azerbaijan",
    "ar": "🇦🇿 أذربيجان",
    "tr": "🇦🇿 Azerbaycan",
    "fr": "🇦🇿 Azerbaïdjan",
    "ru": "🇦🇿 Азербайджан"
  },
  "🇬🇪 Georgia": {
    "en": "🇬🇪 Georgia",
    "ar": "🇬🇪 جورجيا",
    "tr": "🇬🇪 Gürcistan",
    "fr": "🇬🇪 Géorgie",
    "ru": "🇬🇪 Грузия"
  },
  "🇦🇲 Armenia": {
    "en": "🇦🇲 Armenia",
    "ar": "🇦🇲 أرمينيا",
    "tr": "🇦🇲 Ermenistan",
    "fr": "🇦🇲 Arménie",
    "ru": "🇦🇲 Армения"
  },
  "🇰🇿 Kazakhstan": {
    "en": "🇰🇿 Kazakhstan",
    "ar": "🇰🇿 كازاخستان",
    "tr": "🇰🇿 Kazakistan",
    "fr": "🇰🇿 Kazakhstan",
    "ru": "🇰🇿 Казахстан"
  },
  "🇺🇿 Uzbekistan": {
    "en": "🇺🇿 Uzbekistan",
    "ar": "🇺🇿 أوزبكستان",
    "tr": "🇺🇿 Özbekistan",
    "fr": "🇺🇿 Ouzbékistan",
    "ru": "🇺🇿 Узбекистан"
  },
  "🇹🇲 Turkmenistan": {
    "en": "🇹🇲 Turkmenistan",
    "ar": "🇹🇲 تركمانستان",
    "tr": "🇹🇲 Türkmenistan",
    "fr": "🇹🇲 Turkménistan",
    "ru": "🇹🇲 Туркменистан"
  },
  "🇰🇬 Kyrgyzstan": {
    "en": "🇰🇬 Kyrgyzstan",
    "ar": "🇰🇬 قيرغيزستان",
    "tr": "🇰🇬 Kırgızistan",
    "fr": "🇰🇬 Kirghizstan",
    "ru": "🇰🇬 Киргизия"
  },
  "🇹🇯 Tajikistan": {
    "en": "🇹🇯 Tajikistan",
    "ar": "🇹🇯 طاجيكستان",
    "tr": "🇹🇯 Tacikistan",
    "fr": "🇹🇯 Tadjikistan",
    "ru": "🇹🇯 Таджикистан"
  },
  "🇮🇳 India": {
    "en": "🇮🇳 India",
    "ar": "🇮🇳 الهند",
    "tr": "🇮🇳 Hindistan",
    "fr": "🇮🇳 Inde",
    "ru": "🇮🇳 Индия"
  },
  "🇧🇩 Bangladesh": {
    "en": "🇧🇩 Bangladesh",
    "ar": "🇧🇩 بنغلاديش",
    "tr": "🇧🇩 Bangladeş",
    "fr": "🇧🇩 Bangladesh",
    "ru": "🇧🇩 Бангладеш"
  },
  "🇱🇰 Sri Lanka": {
    "en": "🇱🇰 Sri Lanka",
    "ar": "🇱🇰 سريلانكا",
    "tr": "🇱🇰 Sri Lanka",
    "fr": "🇱🇰 Sri Lanka",
    "ru": "🇱🇰 Шри-Ланка"
  },
  "🇳🇵 Nepal": {
    "en": "🇳🇵 Nepal",
    "ar": "🇳🇵 نيبال",
    "tr": "🇳🇵 Nepal",
    "fr": "🇳🇵 Népal",
    "ru": "🇳🇵 Непал"
  },
  "🇲🇲 Myanmar": {
    "en": "🇲🇲 Myanmar",
    "ar": "🇲🇲 ميانمار",
    "tr": "🇲🇲 Myanmar",
    "fr": "🇲🇲 Myanmar (Birmanie)",
    "ru": "🇲🇲 Мьянма (Бирма)"
  },
  "🇹🇭 Thailand": {
    "en": "🇹🇭 Thailand",
    "ar": "🇹🇭 تايلاند",
    "tr": "🇹🇭 Tayland",
    "fr": "🇹🇭 Thaïlande",
    "ru": "🇹🇭 Таиланд"
  },
  "🇻🇳 Vietnam": {
    "en": "🇻🇳 Vietnam",
    "ar": "🇻🇳 فيتنام",
    "tr": "🇻🇳 Vietnam",
    "fr": "🇻🇳 Viêt Nam",
    "ru": "🇻🇳 Вьетнам"
  },
  "🇮🇩 Indonesia": {
    "en": "🇮🇩 Indonesia",
    "ar": "🇮🇩 إندونيسيا",
    "tr": "🇮🇩 Endonezya",
    "fr": "🇮🇩 Indonésie",
    "ru": "🇮🇩 Индонезия"
  },
  "🇲🇾 Malaysia": {
    "en": "🇲🇾 Malaysia",
    "ar": "🇲🇾 ماليزيا",
    "tr": "🇲🇾 Malezya",
    "fr": "🇲🇾 Malaisie",
    "ru": "🇲🇾 Малайзия"
  },
  "🇸🇬 Singapore": {
    "en": "🇸🇬 Singapore",
    "ar": "🇸🇬 سنغافورة",
    "tr": "🇸🇬 Singapur",
    "fr": "🇸🇬 Singapour",
    "ru": "🇸🇬 Сингапур"
  },
  "🇵🇭 Philippines": {
    "en": "🇵🇭 Philippines",
    "ar": "🇵🇭 الفلبين",
    "tr": "🇵🇭 Filipinler",
    "fr": "🇵🇭 Philippines",
    "ru": "🇵🇭 Филиппины"
  },
  "🇰🇭 Cambodia": {
    "en": "🇰🇭 Cambodia",
    "ar": "🇰🇭 كمبوديا",
    "tr": "🇰🇭 Kamboçya",
    "fr": "🇰🇭 Cambodge",
    "ru": "🇰🇭 Камбоджа"
  },
  "🇱🇦 Laos": {
    "en": "🇱🇦 Laos",
    "ar": "🇱🇦 لاوس",
    "tr": "🇱🇦 Laos",
    "fr": "🇱🇦 Laos",
    "ru": "🇱🇦 Лаос"
  },
  "🇨🇳 China": {
    "en": "🇨🇳 China",
    "ar": "🇨🇳 الصين",
    "tr": "🇨🇳 Çin",
    "fr": "🇨🇳 Chine",
    "ru": "🇨🇳 Китай"
  },
  "🇯🇵 Japan": {
    "en": "🇯🇵 Japan",
    "ar": "🇯🇵 اليابان",
    "tr": "🇯🇵 Japonya",
    "fr": "🇯🇵 Japon",
    "ru": "🇯🇵 Япония"
  },
  "🇰🇷 South Korea": {
    "en": "🇰🇷 South Korea",
    "ar": "🇰🇷 كوريا الجنوبية",
    "tr": "🇰🇷 Güney Kore",
    "fr": "🇰🇷 Corée du Sud",
    "ru": "🇰🇷 Республика Корея"
  },
  "🇰🇵 North Korea": {
    "en": "🇰🇵 North Korea",
    "ar": "🇰🇵 كوريا الشمالية",
    "tr": "🇰🇵 Kuzey Kore",
    "fr": "🇰🇵 Corée du Nord",
    "ru": "🇰🇵 КНДР"
  },
  "🇹🇼 Taiwan": {
    "en": "🇹🇼 Taiwan",
    "ar": "🇹🇼 تايوان",
    "tr": "🇹🇼 Tayvan",
    "fr": "🇹🇼 Taïwan",
    "ru": "🇹🇼 Тайвань"
  },
  "🇲🇳 Mongolia": {
    "en": "🇲🇳 Mongolia",
    "ar": "🇲🇳 منغوليا",
    "tr": "🇲🇳 Moğolistan",
    "fr": "🇲🇳 Mongolie",
    "ru": "🇲🇳 Монголия"
  },
  "🇭🇰 Hong Kong": {
    "en": "🇭🇰 Hong Kong",
    "ar": "🇭🇰 هونغ كونغ",
    "tr": "🇭🇰 Hong Kong",
    "fr": "🇭🇰 R.A.S. chinoise de Hong Kong",
    "ru": "🇭🇰 Гонконг (САР)"
  },
  "🇺🇸 United States": {
    "en": "🇺🇸 United States",
    "ar": "🇺🇸 الولايات المتحدة",
    "tr": "🇺🇸 Amerika Birleşik Devletleri",
    "fr": "🇺🇸 États-Unis",
    "ru": "🇺🇸 Соединенные Штаты"
  },
  "🇨🇦 Canada": {
    "en": "🇨🇦 Canada",
    "ar": "🇨🇦 كندا",
    "tr": "🇨🇦 Kanada",
    "fr": "🇨🇦 Canada",
    "ru": "🇨🇦 Канада"
  },
  "🇲🇽 Mexico": {
    "en": "🇲🇽 Mexico",
    "ar": "🇲🇽 المكسيك",
    "tr": "🇲🇽 Meksika",
    "fr": "🇲🇽 Mexique",
    "ru": "🇲🇽 Мексика"
  },
  "🇬🇹 Guatemala": {
    "en": "🇬🇹 Guatemala",
    "ar": "🇬🇹 غواتيمالا",
    "tr": "🇬🇹 Guatemala",
    "fr": "🇬🇹 Guatemala",
    "ru": "🇬🇹 Гватемала"
  },
  "🇭🇳 Honduras": {
    "en": "🇭🇳 Honduras",
    "ar": "🇭🇳 هندوراس",
    "tr": "🇭🇳 Honduras",
    "fr": "🇭🇳 Honduras",
    "ru": "🇭🇳 Гондурас"
  },
  "🇸🇻 El Salvador": {
    "en": "🇸🇻 El Salvador",
    "ar": "🇸🇻 السلفادور",
    "tr": "🇸🇻 El Salvador",
    "fr": "🇸🇻 Salvador",
    "ru": "🇸🇻 Сальвадор"
  },
  "🇳🇮 Nicaragua": {
    "en": "🇳🇮 Nicaragua",
    "ar": "🇳🇮 نيكاراغوا",
    "tr": "🇳🇮 Nikaragua",
    "fr": "🇳🇮 Nicaragua",
    "ru": "🇳🇮 Никарагуа"
  },
  "🇨🇷 Costa Rica": {
    "en": "🇨🇷 Costa Rica",
    "ar": "🇨🇷 كوستاريكا",
    "tr": "🇨🇷 Kosta Rika",
    "fr": "🇨🇷 Costa Rica",
    "ru": "🇨🇷 Коста-Рика"
  },
  "🇵🇦 Panama": {
    "en": "🇵🇦 Panama",
    "ar": "🇵🇦 بنما",
    "tr": "🇵🇦 Panama",
    "fr": "🇵🇦 Panama",
    "ru": "🇵🇦 Панама"
  },
  "🇨🇺 Cuba": {
    "en": "🇨🇺 Cuba",
    "ar": "🇨🇺 كوبا",
    "tr": "🇨🇺 Küba",
    "fr": "🇨🇺 Cuba",
    "ru": "🇨🇺 Куба"
  },
  "🇩🇴 Dominican Republic": {
    "en": "🇩🇴 Dominican Republic",
    "ar": "🇩🇴 الدومينيكان",
    "tr": "🇩🇴 Dominik Cumhuriyeti",
    "fr": "🇩🇴 République dominicaine",
    "ru": "🇩🇴 Доминиканская Республика"
  },
  "🇭🇹 Haiti": {
    "en": "🇭🇹 Haiti",
    "ar": "🇭🇹 هايتي",
    "tr": "🇭🇹 Haiti",
    "fr": "🇭🇹 Haïti",
    "ru": "🇭🇹 Гаити"
  },
  "🇯🇲 Jamaica": {
    "en": "🇯🇲 Jamaica",
    "ar": "🇯🇲 جامايكا",
    "tr": "🇯🇲 Jamaika",
    "fr": "🇯🇲 Jamaïque",
    "ru": "🇯🇲 Ямайка"
  },
  "🇧🇷 Brazil": {
    "en": "🇧🇷 Brazil",
    "ar": "🇧🇷 البرازيل",
    "tr": "🇧🇷 Brezilya",
    "fr": "🇧🇷 Brésil",
    "ru": "🇧🇷 Бразилия"
  },
  "🇦🇷 Argentina": {
    "en": "🇦🇷 Argentina",
    "ar": "🇦🇷 الأرجنتين",
    "tr": "🇦🇷 Arjantin",
    "fr": "🇦🇷 Argentine",
    "ru": "🇦🇷 Аргентина"
  },
  "🇨🇱 Chile": {
    "en": "🇨🇱 Chile",
    "ar": "🇨🇱 تشيلي",
    "tr": "🇨🇱 Şili",
    "fr": "🇨🇱 Chili",
    "ru": "🇨🇱 Чили"
  },
  "🇨🇴 Colombia": {
    "en": "🇨🇴 Colombia",
    "ar": "🇨🇴 كولومبيا",
    "tr": "🇨🇴 Kolombiya",
    "fr": "🇨🇴 Colombie",
    "ru": "🇨🇴 Колумбия"
  },
  "🇵🇪 Peru": {
    "en": "🇵🇪 Peru",
    "ar": "🇵🇪 بيرو",
    "tr": "🇵🇪 Peru",
    "fr": "🇵🇪 Pérou",
    "ru": "🇵🇪 Перу"
  },
  "🇻🇪 Venezuela": {
    "en": "🇻🇪 Venezuela",
    "ar": "🇻🇪 فنزويلا",
    "tr": "🇻🇪 Venezuela",
    "fr": "🇻🇪 Venezuela",
    "ru": "🇻🇪 Венесуэла"
  },
  "🇪🇨 Ecuador": {
    "en": "🇪🇨 Ecuador",
    "ar": "🇪🇨 الإكوادور",
    "tr": "🇪🇨 Ekvador",
    "fr": "🇪🇨 Équateur",
    "ru": "🇪🇨 Эквадор"
  },
  "🇧🇴 Bolivia": {
    "en": "🇧🇴 Bolivia",
    "ar": "🇧🇴 بوليفيا",
    "tr": "🇧🇴 Bolivya",
    "fr": "🇧🇴 Bolivie",
    "ru": "🇧🇴 Боливия"
  },
  "🇵🇾 Paraguay": {
    "en": "🇵🇾 Paraguay",
    "ar": "🇵🇾 باراغواي",
    "tr": "🇵🇾 Paraguay",
    "fr": "🇵🇾 Paraguay",
    "ru": "🇵🇾 Парагвай"
  },
  "🇺🇾 Uruguay": {
    "en": "🇺🇾 Uruguay",
    "ar": "🇺🇾 أوروغواي",
    "tr": "🇺🇾 Uruguay",
    "fr": "🇺🇾 Uruguay",
    "ru": "🇺🇾 Уругвай"
  },
  "🇬🇾 Guyana": {
    "en": "🇬🇾 Guyana",
    "ar": "🇬🇾 غيانا",
    "tr": "🇬🇾 Guyana",
    "fr": "🇬🇾 Guyana",
    "ru": "🇬🇾 Гайана"
  },
  "🇸🇷 Suriname": {
    "en": "🇸🇷 Suriname",
    "ar": "🇸🇷 سورينام",
    "tr": "🇸🇷 Surinam",
    "fr": "🇸🇷 Suriname",
    "ru": "🇸🇷 Суринам"
  },
  "🇳🇬 Nigeria": {
    "en": "🇳🇬 Nigeria",
    "ar": "🇳🇬 نيجيريا",
    "tr": "🇳🇬 Nijerya",
    "fr": "🇳🇬 Nigeria",
    "ru": "🇳🇬 Нигерия"
  },
  "🇪🇹 Ethiopia": {
    "en": "🇪🇹 Ethiopia",
    "ar": "🇪🇹 إثيوبيا",
    "tr": "🇪🇹 Etiyopya",
    "fr": "🇪🇹 Éthiopie",
    "ru": "🇪🇹 Эфиопия"
  },
  "🇰🇪 Kenya": {
    "en": "🇰🇪 Kenya",
    "ar": "🇰🇪 كينيا",
    "tr": "🇰🇪 Kenya",
    "fr": "🇰🇪 Kenya",
    "ru": "🇰🇪 Кения"
  },
  "🇹🇿 Tanzania": {
    "en": "🇹🇿 Tanzania",
    "ar": "🇹🇿 تنزانيا",
    "tr": "🇹🇿 Tanzanya",
    "fr": "🇹🇿 Tanzanie",
    "ru": "🇹🇿 Танзания"
  },
  "🇺🇬 Uganda": {
    "en": "🇺🇬 Uganda",
    "ar": "🇺🇬 أوغندا",
    "tr": "🇺🇬 Uganda",
    "fr": "🇺🇬 Ouganda",
    "ru": "🇺🇬 Уганда"
  },
  "🇬🇭 Ghana": {
    "en": "🇬🇭 Ghana",
    "ar": "🇬🇭 غانا",
    "tr": "🇬🇭 Gana",
    "fr": "🇬🇭 Ghana",
    "ru": "🇬🇭 Гана"
  },
  "🇨🇮 Ivory Coast": {
    "en": "🇨🇮 Ivory Coast",
    "ar": "🇨🇮 ساحل العاج",
    "tr": "🇨🇮 Fildişi Sahili",
    "fr": "🇨🇮 Côte d’Ivoire",
    "ru": "🇨🇮 Кот-д’Ивуар"
  },
  "🇸🇳 Senegal": {
    "en": "🇸🇳 Senegal",
    "ar": "🇸🇳 السنغال",
    "tr": "🇸🇳 Senegal",
    "fr": "🇸🇳 Sénégal",
    "ru": "🇸🇳 Сенегал"
  },
  "🇨🇲 Cameroon": {
    "en": "🇨🇲 Cameroon",
    "ar": "🇨🇲 الكاميرون",
    "tr": "🇨🇲 Kamerun",
    "fr": "🇨🇲 Cameroun",
    "ru": "🇨🇲 Камерун"
  },
  "🇿🇦 South Africa": {
    "en": "🇿🇦 South Africa",
    "ar": "🇿🇦 جنوب أفريقيا",
    "tr": "🇿🇦 Güney Afrika",
    "fr": "🇿🇦 Afrique du Sud",
    "ru": "🇿🇦 Южно-Африканская Республика"
  },
  "🇿🇼 Zimbabwe": {
    "en": "🇿🇼 Zimbabwe",
    "ar": "🇿🇼 زيمبابوي",
    "tr": "🇿🇼 Zimbabve",
    "fr": "🇿🇼 Zimbabwe",
    "ru": "🇿🇼 Зимбабве"
  },
  "🇿🇲 Zambia": {
    "en": "🇿🇲 Zambia",
    "ar": "🇿🇲 زامبيا",
    "tr": "🇿🇲 Zambiya",
    "fr": "🇿🇲 Zambie",
    "ru": "🇿🇲 Замбия"
  },
  "🇲🇿 Mozambique": {
    "en": "🇲🇿 Mozambique",
    "ar": "🇲🇿 موزمبيق",
    "tr": "🇲🇿 Mozambik",
    "fr": "🇲🇿 Mozambique",
    "ru": "🇲🇿 Мозамбик"
  },
  "🇲🇬 Madagascar": {
    "en": "🇲🇬 Madagascar",
    "ar": "🇲🇬 مدغشقر",
    "tr": "🇲🇬 Madagaskar",
    "fr": "🇲🇬 Madagascar",
    "ru": "🇲🇬 Мадагаскар"
  },
  "🇦🇴 Angola": {
    "en": "🇦🇴 Angola",
    "ar": "🇦🇴 أنغولا",
    "tr": "🇦🇴 Angola",
    "fr": "🇦🇴 Angola",
    "ru": "🇦🇴 Ангола"
  },
  "🇨🇩 DR Congo": {
    "en": "🇨🇩 DR Congo",
    "ar": "🇨🇩 الكونغو الديمقراطية",
    "tr": "🇨🇩 Kongo Demokratik Cumhuriyeti",
    "fr": "🇨🇩 Congo-Kinshasa",
    "ru": "🇨🇩 Конго - Киншаса"
  },
  "🇨🇬 Congo": {
    "en": "🇨🇬 Congo",
    "ar": "🇨🇬 الكونغو",
    "tr": "🇨🇬 Kongo",
    "fr": "🇨🇬 Congo-Brazzaville",
    "ru": "🇨🇬 Конго - Браззавиль"
  },
  "🇷🇼 Rwanda": {
    "en": "🇷🇼 Rwanda",
    "ar": "🇷🇼 رواندا",
    "tr": "🇷🇼 Ruanda",
    "fr": "🇷🇼 Rwanda",
    "ru": "🇷🇼 Руанда"
  },
  "🇧🇮 Burundi": {
    "en": "🇧🇮 Burundi",
    "ar": "🇧🇮 بوروندي",
    "tr": "🇧🇮 Burundi",
    "fr": "🇧🇮 Burundi",
    "ru": "🇧🇮 Бурунди"
  },
  "🇲🇱 Mali": {
    "en": "🇲🇱 Mali",
    "ar": "🇲🇱 مالي",
    "tr": "🇲🇱 Mali",
    "fr": "🇲🇱 Mali",
    "ru": "🇲🇱 Мали"
  },
  "🇧🇫 Burkina Faso": {
    "en": "🇧🇫 Burkina Faso",
    "ar": "🇧🇫 بوركينا فاسو",
    "tr": "🇧🇫 Burkina Faso",
    "fr": "🇧🇫 Burkina Faso",
    "ru": "🇧🇫 Буркина-Фасо"
  },
  "🇳🇪 Niger": {
    "en": "🇳🇪 Niger",
    "ar": "🇳🇪 النيجر",
    "tr": "🇳🇪 Nijer",
    "fr": "🇳🇪 Niger",
    "ru": "🇳🇪 Нигер"
  },
  "🇹🇩 Chad": {
    "en": "🇹🇩 Chad",
    "ar": "🇹🇩 تشاد",
    "tr": "🇹🇩 Çad",
    "fr": "🇹🇩 Tchad",
    "ru": "🇹🇩 Чад"
  },
  "🇨🇫 Central African Republic": {
    "en": "🇨🇫 Central African Republic",
    "ar": "🇨🇫 أفريقيا الوسطى",
    "tr": "🇨🇫 Orta Afrika Cumhuriyeti",
    "fr": "🇨🇫 République centrafricaine",
    "ru": "🇨🇫 Центрально-Африканская Республика"
  },
  "🇸🇸 South Sudan": {
    "en": "🇸🇸 South Sudan",
    "ar": "🇸🇸 جنوب السودان",
    "tr": "🇸🇸 Güney Sudan",
    "fr": "🇸🇸 Soudan du Sud",
    "ru": "🇸🇸 Южный Судан"
  },
  "🇪🇷 Eritrea": {
    "en": "🇪🇷 Eritrea",
    "ar": "🇪🇷 إريتريا",
    "tr": "🇪🇷 Eritre",
    "fr": "🇪🇷 Érythrée",
    "ru": "🇪🇷 Эритрея"
  },
  "🇲🇼 Malawi": {
    "en": "🇲🇼 Malawi",
    "ar": "🇲🇼 مالاوي",
    "tr": "🇲🇼 Malavi",
    "fr": "🇲🇼 Malawi",
    "ru": "🇲🇼 Малави"
  },
  "🇧🇯 Benin": {
    "en": "🇧🇯 Benin",
    "ar": "🇧🇯 بنين",
    "tr": "🇧🇯 Benin",
    "fr": "🇧🇯 Bénin",
    "ru": "🇧🇯 Бенин"
  },
  "🇹🇬 Togo": {
    "en": "🇹🇬 Togo",
    "ar": "🇹🇬 توغو",
    "tr": "🇹🇬 Togo",
    "fr": "🇹🇬 Togo",
    "ru": "🇹🇬 Того"
  },
  "🇬🇳 Guinea": {
    "en": "🇬🇳 Guinea",
    "ar": "🇬🇳 غينيا",
    "tr": "🇬🇳 Gine",
    "fr": "🇬🇳 Guinée",
    "ru": "🇬🇳 Гвинея"
  },
  "🇬🇼 Guinea-Bissau": {
    "en": "🇬🇼 Guinea-Bissau",
    "ar": "🇬🇼 غينيا بيساو",
    "tr": "🇬🇼 Gine-Bissau",
    "fr": "🇬🇼 Guinée-Bissau",
    "ru": "🇬🇼 Гвинея-Бисау"
  },
  "🇸🇱 Sierra Leone": {
    "en": "🇸🇱 Sierra Leone",
    "ar": "🇸🇱 سيراليون",
    "tr": "🇸🇱 Sierra Leone",
    "fr": "🇸🇱 Sierra Leone",
    "ru": "🇸🇱 Сьерра-Леоне"
  },
  "🇱🇷 Liberia": {
    "en": "🇱🇷 Liberia",
    "ar": "🇱🇷 ليبيريا",
    "tr": "🇱🇷 Liberya",
    "fr": "🇱🇷 Liberia",
    "ru": "🇱🇷 Либерия"
  },
  "🇬🇲 Gambia": {
    "en": "🇬🇲 Gambia",
    "ar": "🇬🇲 غامبيا",
    "tr": "🇬🇲 Gambiya",
    "fr": "🇬🇲 Gambie",
    "ru": "🇬🇲 Гамбия"
  },
  "🇨🇻 Cape Verde": {
    "en": "🇨🇻 Cape Verde",
    "ar": "🇨🇻 الرأس الأخضر",
    "tr": "🇨🇻 Yeşil Burun Adaları",
    "fr": "🇨🇻 Cap-Vert",
    "ru": "🇨🇻 Кабо-Верде"
  },
  "🇸🇹 São Tomé & Príncipe": {
    "en": "🇸🇹 São Tomé & Príncipe",
    "ar": "🇸🇹 ساو تومي وبرينسيبي",
    "tr": "🇸🇹 Sao Tome ve Principe",
    "fr": "🇸🇹 Sao Tomé-et-Principe",
    "ru": "🇸🇹 Сан-Томе и Принсипи"
  },
  "🇬🇶 Equatorial Guinea": {
    "en": "🇬🇶 Equatorial Guinea",
    "ar": "🇬🇶 غينيا الاستوائية",
    "tr": "🇬🇶 Ekvator Ginesi",
    "fr": "🇬🇶 Guinée équatoriale",
    "ru": "🇬🇶 Экваториальная Гвинея"
  },
  "🇬🇦 Gabon": {
    "en": "🇬🇦 Gabon",
    "ar": "🇬🇦 الغابون",
    "tr": "🇬🇦 Gabon",
    "fr": "🇬🇦 Gabon",
    "ru": "🇬🇦 Габон"
  },
  "🇳🇦 Namibia": {
    "en": "🇳🇦 Namibia",
    "ar": "🇳🇦 ناميبيا",
    "tr": "🇳🇦 Namibya",
    "fr": "🇳🇦 Namibie",
    "ru": "🇳🇦 Намибия"
  },
  "🇧🇼 Botswana": {
    "en": "🇧🇼 Botswana",
    "ar": "🇧🇼 بوتسوانا",
    "tr": "🇧🇼 Botsvana",
    "fr": "🇧🇼 Botswana",
    "ru": "🇧🇼 Ботсвана"
  },
  "🇱🇸 Lesotho": {
    "en": "🇱🇸 Lesotho",
    "ar": "🇱🇸 ليسوتو",
    "tr": "🇱🇸 Lesoto",
    "fr": "🇱🇸 Lesotho",
    "ru": "🇱🇸 Лесото"
  },
  "🇸🇿 Eswatini": {
    "en": "🇸🇿 Eswatini",
    "ar": "🇸🇿 إسواتيني",
    "tr": "🇸🇿 Esvatini",
    "fr": "🇸🇿 Eswatini",
    "ru": "🇸🇿 Эсватини"
  },
  "🇲🇺 Mauritius": {
    "en": "🇲🇺 Mauritius",
    "ar": "🇲🇺 موريشيوس",
    "tr": "🇲🇺 Mauritius",
    "fr": "🇲🇺 Maurice",
    "ru": "🇲🇺 Маврикий"
  },
  "🇸🇨 Seychelles": {
    "en": "🇸🇨 Seychelles",
    "ar": "🇸🇨 سيشيل",
    "tr": "🇸🇨 Seyşeller",
    "fr": "🇸🇨 Seychelles",
    "ru": "🇸🇨 Сейшельские о-ва"
  },
  "🇦🇺 Australia": {
    "en": "🇦🇺 Australia",
    "ar": "🇦🇺 أستراليا",
    "tr": "🇦🇺 Avustralya",
    "fr": "🇦🇺 Australie",
    "ru": "🇦🇺 Австралия"
  },
  "🇳🇿 New Zealand": {
    "en": "🇳🇿 New Zealand",
    "ar": "🇳🇿 نيوزيلندا",
    "tr": "🇳🇿 Yeni Zelanda",
    "fr": "🇳🇿 Nouvelle-Zélande",
    "ru": "🇳🇿 Новая Зеландия"
  },
  "🇫🇯 Fiji": {
    "en": "🇫🇯 Fiji",
    "ar": "🇫🇯 فيجي",
    "tr": "🇫🇯 Fiji",
    "fr": "🇫🇯 Fidji",
    "ru": "🇫🇯 Фиджи"
  },
  "🇵🇬 Papua New Guinea": {
    "en": "🇵🇬 Papua New Guinea",
    "ar": "🇵🇬 بابوا غينيا الجديدة",
    "tr": "🇵🇬 Papua Yeni Gine",
    "fr": "🇵🇬 Papouasie-Nouvelle-Guinée",
    "ru": "🇵🇬 Папуа — Новая Гвинея"
  },
  "🇼🇸 Samoa": {
    "en": "🇼🇸 Samoa",
    "ar": "🇼🇸 ساموا",
    "tr": "🇼🇸 Samoa",
    "fr": "🇼🇸 Samoa",
    "ru": "🇼🇸 Самоа"
  },
  "🇹🇴 Tonga": {
    "en": "🇹🇴 Tonga",
    "ar": "🇹🇴 تونغا",
    "tr": "🇹🇴 Tonga",
    "fr": "🇹🇴 Tonga",
    "ru": "🇹🇴 Тонга"
  },
  "🌐 Other": {
    "en": "🌐 Other",
    "ar": "🌐 أخرى",
    "tr": "🌐 Diğer",
    "fr": "🌐 Autre",
    "ru": "🌐 Другая"
  },
  "— Select Country —": {
    "en": "— Select Country —",
    "ar": "— اختر الدولة —",
    "tr": "— Ülke Seçiniz —",
    "fr": "— Sélectionner un pays —",
    "ru": "— Выберите страну —"
  },
  "Details": {
    "en": "Details",
    "ar": "التفاصيل",
    "tr": "Detaylar",
    "fr": "Détails",
    "ru": "Подробности"
  },
  "💵 A": {
    "en": "💵 A",
    "ar": "💵 أ",
    "tr": "💵 A",
    "fr": "💵 A",
    "ru": "💵 A"
  },
  "💵 B": {
    "en": "💵 B",
    "ar": "💵 ب",
    "tr": "💵 B",
    "fr": "💵 B",
    "ru": "💵 B"
  },
  "💵 C": {
    "en": "💵 C",
    "ar": "💵 ج",
    "tr": "💵 C",
    "fr": "💵 C",
    "ru": "💵 C"
  },
  "🗑️ Image deleted": {
    "en": "🗑️ Image deleted",
    "ar": "🗑️ تم حذف الصورة",
    "tr": "🗑️ Görsel silindi",
    "fr": "🗑️ Image supprimée",
    "ru": "🗑️ Изображение удалено"
  },
  "Add Size": {
    "en": "Add Size",
    "ar": "إضافة قياس",
    "tr": "Ölçü Ekle",
    "fr": "Ajouter des dimensions",
    "ru": "Добавить размеры"
  },
  "Length": {
    "en": "Length",
    "ar": "الطول",
    "tr": "Uzunluk",
    "fr": "Longueur",
    "ru": "Длина"
  },
  "Width": {
    "en": "Width",
    "ar": "العرض",
    "tr": "Genişlik",
    "fr": "Largeur",
    "ru": "Ширина"
  },
  "Height": {
    "en": "Height",
    "ar": "الارتفاع",
    "tr": "Yükseklik",
    "fr": "Hauteur",
    "ru": "Высота"
  },
  "↩ Back": {
    "en": "↩ Back",
    "ar": "↩ رجوع",
    "tr": "↩ Geri",
    "fr": "↩ Retour",
    "ru": "↩ Назад"
  },
  "Show Details": {
    "en": "Show Details",
    "ar": "عرض التفاصيل",
    "tr": "Detayları Göster",
    "fr": "Afficher les détails",
    "ru": "Показать подробности"
  },
  "Dims": {
    "en": "Dims",
    "ar": "الأبعاد",
    "tr": "Boyut",
    "fr": "Dimensions",
    "ru": "Размеры"
  },
  "Weight": {
    "en": "Weight",
    "ar": "الوزن",
    "tr": "Ağırlık",
    "fr": "Poids",
    "ru": "Вес"
  },
  "Product information in this proforma has updates. Review them before applying.": {
    "en": "Product information in this proforma has updates. Review them before applying.",
    "ar": "توجد تحديثات لمعلومات قطع هذه البروفرما. راجعها قبل تطبيقها.",
    "tr": "Bu proformadaki ürün bilgilerinde güncellemeler var. Uygulamadan önce inceleyin.",
    "fr": "Des informations produit de cette pro forma ont changé. Vérifiez-les avant de les appliquer.",
    "ru": "Данные товаров в этой проформе обновлены. Проверьте изменения перед применением."
  },
  "Review updates": {
    "en": "Review updates",
    "ar": "مراجعة التحديثات",
    "tr": "Güncellemeleri incele",
    "fr": "Examiner les modifications",
    "ru": "Проверить изменения"
  },
  "Update product information": {
    "en": "Update product information",
    "ar": "تحديث معلومات القطع",
    "tr": "Ürün bilgilerini güncelle",
    "fr": "Mettre à jour les produits",
    "ru": "Обновить данные товаров"
  },
  "Compare current and new values. The proforma changes only after you apply and save.": {
    "en": "Compare current and new values. The proforma changes only after you apply and save.",
    "ar": "قارن المعلومات الحالية بالمعلومات الجديدة. لن تتغير البروفرما إلا بعد موافقتك وحفظها.",
    "tr": "Mevcut ve yeni bilgileri karşılaştırın. Proforma yalnızca onaylayıp kaydettiğinizde değişir.",
    "fr": "Comparez les valeurs actuelles et les nouvelles valeurs. La pro forma ne change qu’après application et enregistrement.",
    "ru": "Сравните текущие и новые значения. Проформа изменится только после применения и сохранения."
  },
  "Current": {
    "en": "Current",
    "ar": "الحالي",
    "tr": "Mevcut",
    "fr": "Actuel",
    "ru": "Текущее"
  },
  "New": {
    "en": "New",
    "ar": "الجديد",
    "tr": "Yeni",
    "fr": "Nouveau",
    "ru": "Новое"
  },
  "Apply updates": {
    "en": "Apply updates",
    "ar": "تطبيق التحديثات",
    "tr": "Güncellemeleri uygula",
    "fr": "Appliquer les modifications",
    "ru": "Применить изменения"
  },
  "Keep proforma unchanged": {
    "en": "Keep proforma unchanged",
    "ar": "إبقاء البروفرما كما هي",
    "tr": "Proformayı olduğu gibi tut",
    "fr": "Garder la pro forma inchangée",
    "ru": "Оставить проформу без изменений"
  },
  "Updates applied. Save the proforma to keep them.": {
    "en": "Updates applied. Save the proforma to keep them.",
    "ar": "تم تطبيق التحديثات. احفظ البروفرما لتثبيتها.",
    "tr": "Güncellemeler uygulandı. Proformayı kaydedin.",
    "fr": "Modifications appliquées. Enregistrez la pro forma.",
    "ru": "Изменения применены. Сохраните проформу."
  },
  "Image changed": {
    "en": "Image changed",
    "ar": "تغيرت الصورة",
    "tr": "Görsel değişti",
    "fr": "Image modifiée",
    "ru": "Изображение изменено"
  },
  "Dimension details": {
    "en": "Dimension details",
    "ar": "تفاصيل الأبعاد",
    "tr": "Ölçü detayları",
    "fr": "Détail des dimensions",
    "ru": "Размеры по элементам"
  },
  "CBM per item": {
    "en": "CBM per item",
    "ar": "CBM للقطعة",
    "tr": "Birim CBM",
    "fr": "CBM par article",
    "ru": "CBM на единицу"
  },
  "Packages": {
    "en": "Packages",
    "ar": "عدد الطرود",
    "tr": "Paket sayısı",
    "fr": "Colis",
    "ru": "Упаковки"
  },
  "Image": {
    "en": "Image",
    "ar": "الصورة",
    "tr": "Görsel",
    "fr": "Image",
    "ru": "Изображение"
  },
  "Type": {
    "en": "Type",
    "ar": "النوع",
    "tr": "Tür",
    "fr": "Type",
    "ru": "Тип"
  },
  "HS code": {
    "en": "HS code",
    "ar": "رمز HS",
    "tr": "HS kodu",
    "fr": "Code SH",
    "ru": "Код ТН ВЭД"
  },
  "USD price": {
    "en": "USD price",
    "ar": "السعر بالدولار",
    "tr": "USD fiyatı",
    "fr": "Prix en USD",
    "ru": "Цена в USD"
  },
  "Payment": {
    "en": "Payment",
    "ar": "تقدم الدفع",
    "tr": "Ödeme",
    "fr": "Paiement",
    "ru": "Платёж"
  },
  "Left": {
    "en": "Left",
    "ar": "متبقي",
    "tr": "Kalan",
    "fr": "Solde",
    "ru": "Остаток"
  },
  "Deliver ✅": {
    "en": "Deliver ✅",
    "ar": "تسليم ✅",
    "tr": "Teslim ✅",
    "fr": "Livrer ✅",
    "ru": "Отметить доставку ✅"
  },
  "pkt": {
    "en": "pkt",
    "ar": "طرد",
    "tr": "Paket",
    "fr": "colis",
    "ru": "упак."
  },
  "Preparing invoice pages and checking images…": {
    "en": "Preparing invoice pages and checking images…",
    "ar": "جارٍ تجهيز صفحات الفاتورة والتحقق من الصور…",
    "tr": "Fatura sayfaları ve görseller hazırlanıyor…",
    "fr": "Préparation des pages et vérification des images…",
    "ru": "Подготовка страниц и проверка изображений…"
  },
  "Export stopped rather than saving an incomplete PDF. ": {
    "en": "Export stopped rather than saving an incomplete PDF. ",
    "ar": "توقّف التصدير بدل حفظ ملف ناقص. ",
    "tr": "Eksik PDF kaydedilmedi. ",
    "fr": "Exportation interrompue pour éviter un PDF incomplet. ",
    "ru": "Экспорт остановлен, чтобы не сохранять неполный PDF. "
  },
  "An image could not be loaded. Upload it from your device: ": {
    "en": "An image could not be loaded. Upload it from your device: ",
    "ar": "تعذّر تحميل صورة. أعد رفعها من جهازك ثم أعد التصدير: ",
    "tr": "Görsel yüklenemedi. Cihazınızdan yeniden yükleyin: ",
    "fr": "Une image n’a pas pu être chargée. Importez-la depuis votre appareil : ",
    "ru": "Не удалось загрузить изображение. Загрузите его с устройства: "
  },
  "A section is taller than one page. Shorten the notes or payment history.": {
    "en": "A section is taller than one page. Shorten the notes or payment history.",
    "ar": "هناك قسم أكبر من صفحة. قلّل طول الملاحظات أو سجل الدفعات قبل التصدير.",
    "tr": "Bir bölüm sayfadan uzun. Notları veya ödeme geçmişini kısaltın.",
    "fr": "Une section dépasse la hauteur d’une page. Raccourcissez les notes ou l’historique des paiements.",
    "ru": "Раздел не помещается на странице. Сократите примечания или историю платежей."
  },
  "PDF ready. Tap share again to choose the application.": {
    "en": "PDF ready. Tap share again to choose the application.",
    "ar": "ملف PDF جاهز. اضغط المشاركة مرة أخرى لاختيار التطبيق.",
    "tr": "PDF hazır. Uygulamayı seçmek için tekrar paylaşın.",
    "fr": "PDF prêt. Appuyez de nouveau sur Partager pour choisir l’application.",
    "ru": "PDF готов. Нажмите «Поделиться» ещё раз для выбора приложения."
  },
  "This browser cannot share files directly; the PDF was downloaded for attachment.": {
    "en": "This browser cannot share files directly; the PDF was downloaded for attachment.",
    "ar": "هذا المتصفح لا يدعم مشاركة الملفات مباشرة؛ تم تنزيل PDF لإرفاقه.",
    "tr": "Tarayıcı dosya paylaşımını desteklemiyor; PDF eklenmek üzere indirildi.",
    "fr": "Ce navigateur ne permet pas le partage direct de fichiers ; le PDF a été téléchargé pour être joint.",
    "ru": "Браузер не поддерживает прямую отправку файлов; PDF скачан для прикрепления."
  },
  "No invoice to export.": {
    "en": "No invoice to export.",
    "ar": "لا توجد فاتورة للتصدير.",
    "tr": "Dışa aktarılacak fatura yok.",
    "fr": "Aucune facture à exporter.",
    "ru": "Нет счёта для экспорта."
  },
  "The full QR payload cannot be encoded. Shorten it or disable QR in print options.": {
    "en": "The full QR payload cannot be encoded. Shorten it or disable QR in print options.",
    "ar": "تعذّر إنشاء QR حقيقي لكل البيانات. قلّل تفاصيل الرمز أو أخفه من خيارات الطباعة.",
    "tr": "QR verisi çok uzun; QR seçeneğini kapatın veya veriyi kısaltın.",
    "fr": "Les données QR sont trop longues. Raccourcissez-les ou désactivez le QR dans les options d’impression.",
    "ru": "Данные QR слишком длинные. Сократите их или отключите QR в настройках печати."
  },
  "This browser could not render the page. Use Print to save PDF, or open in Chrome/Edge.": {
    "en": "This browser could not render the page. Use Print to save PDF, or open in Chrome/Edge.",
    "ar": "تعذّر الرسم في هذا المتصفح. استخدم زر الطباعة لحفظ PDF، أو افتح الملف بمتصفح Chrome أو Edge.",
    "tr": "Bu tarayıcı görüntüyü oluşturamadı. Yazdır düğmesini veya Chrome/Edge kullanın.",
    "fr": "Ce navigateur n’a pas pu afficher la page. Utilisez Imprimer pour enregistrer un PDF ou ouvrez Chrome/Edge.",
    "ru": "Браузер не смог отобразить страницу. Сохраните PDF через печать или откройте Chrome/Edge."
  },
  "INVOICE CONTINUED": {
    "en": "INVOICE CONTINUED",
    "ar": "متابعة الفاتورة",
    "tr": "Fatura devamı",
    "fr": "SUITE DE LA FACTURE",
    "ru": "ПРОДОЛЖЕНИЕ СЧЁТА"
  },
  "Invoice": {
    "en": "Invoice",
    "ar": "فاتورة",
    "tr": "Fatura",
    "fr": "Facture",
    "ru": "Счёт"
  },
  "QR payload is too long. Disable the QR option or shorten its data.": {
    "en": "QR payload is too long. Disable the QR option or shorten its data.",
    "ar": "بيانات الرمز أطول من سعة QR. قلّل تفاصيل الرمز أو أخفِه من خيارات الطباعة.",
    "tr": "QR verisi çok uzun. Yazdırma seçeneklerinden QR kodunu kapatın.",
    "fr": "Données QR trop longues. Désactivez le QR ou raccourcissez ses données.",
    "ru": "Данные QR слишком длинные. Отключите QR или сократите данные."
  },
  "PROFORMA INVOICE": {
    "en": "PROFORMA INVOICE",
    "ar": "فاتورة مبدئية",
    "tr": "PROFORMA FATURA",
    "fr": "FACTURE PRO FORMA",
    "ru": "СЧЁТ-ПРОФОРМА"
  },
  "COMPANY NAME": {
    "en": "COMPANY NAME",
    "ar": "اسم الشركة",
    "tr": "FİRMA ADI",
    "fr": "NOM DE LA SOCIÉTÉ",
    "ru": "НАЗВАНИЕ КОМПАНИИ"
  },
  "ORDER DATE": {
    "en": "ORDER DATE",
    "ar": "التاريخ",
    "tr": "SİPARİŞ TARİHİ",
    "fr": "DATE DE COMMANDE",
    "ru": "ДАТА ЗАКАЗА"
  },
  "COUNTRY": {
    "en": "COUNTRY",
    "ar": "الدولة",
    "tr": "ÜLKE",
    "fr": "PAYS",
    "ru": "СТРАНА"
  },
  "PROVINCE": {
    "en": "PROVINCE",
    "ar": "المحافظة",
    "tr": "İL",
    "fr": "RÉGION",
    "ru": "РЕГИОН"
  },
  "CITY": {
    "en": "CITY",
    "ar": "المدينة",
    "tr": "ŞEHİR",
    "fr": "VILLE",
    "ru": "ГОРОД"
  },
  "INVOICE": {
    "en": "INVOICE",
    "ar": "الفاتورة",
    "tr": "FATURA",
    "fr": "FACTURE",
    "ru": "СЧЁТ"
  },
  "SELLER": {
    "en": "SELLER",
    "ar": "البائع",
    "tr": "SATICI",
    "fr": "VENDEUR",
    "ru": "ПРОДАВЕЦ"
  },
  "BUYER": {
    "en": "BUYER",
    "ar": "المشتري",
    "tr": "ALICI",
    "fr": "ACHETEUR",
    "ru": "ПОКУПАТЕЛЬ"
  },
  "INVOICE NO": {
    "en": "INVOICE NO",
    "ar": "رقم الفاتورة",
    "tr": "FATURA NO",
    "fr": "N° DE FACTURE",
    "ru": "НОМЕР СЧЁТА"
  },
  "LOADING DATE": {
    "en": "LOADING DATE",
    "ar": "تاريخ التحميل",
    "tr": "YÜKLEME TARİHİ",
    "fr": "DATE DE CHARGEMENT",
    "ru": "ДАТА ПОГРУЗКИ"
  },
  "PLATE NUMBER": {
    "en": "PLATE NUMBER",
    "ar": "رقم اللوحة",
    "tr": "PLAKA NO",
    "fr": "IMMATRICULATION",
    "ru": "НОМЕРНОЙ ЗНАК"
  },
  "TRUCK NUMBER": {
    "en": "TRUCK NUMBER",
    "ar": "رقم الشاحنة",
    "tr": "KAMYON NO",
    "fr": "N° DU CAMION",
    "ru": "НОМЕР ГРУЗОВИКА"
  },
  "#": {
    "en": "#",
    "ar": "#",
    "tr": "#",
    "fr": "#",
    "ru": "№"
  },
  "Unit Price": {
    "en": "Unit Price",
    "ar": "سعر الوحدة",
    "tr": "Birim Fiyat",
    "fr": "Prix unitaire",
    "ru": "Цена за единицу"
  },
  "GRAND TOTAL": {
    "en": "GRAND TOTAL",
    "ar": "المجموع النهائي",
    "tr": "GENEL TOPLAM",
    "fr": "TOTAL GÉNÉRAL",
    "ru": "ИТОГО"
  },
  "BANK INFORMATION": {
    "en": "BANK INFORMATION",
    "ar": "معلومات البنك",
    "tr": "BANKA BİLGİLERİ",
    "fr": "COORDONNÉES BANCAIRES",
    "ru": "БАНКОВСКИЕ РЕКВИЗИТЫ"
  },
  "IBAN USD": {
    "en": "IBAN USD",
    "ar": "IBAN USD",
    "tr": "IBAN USD",
    "fr": "IBAN USD",
    "ru": "IBAN USD"
  },
  "IBAN TRY": {
    "en": "IBAN TRY",
    "ar": "IBAN TRY",
    "tr": "IBAN TRY",
    "fr": "IBAN TRY",
    "ru": "IBAN TRY"
  },
  "IBAN EUR": {
    "en": "IBAN EUR",
    "ar": "IBAN EUR",
    "tr": "IBAN EUR",
    "fr": "IBAN EUR",
    "ru": "IBAN EUR"
  },
  "SWIFT": {
    "en": "SWIFT",
    "ar": "SWIFT",
    "tr": "SWIFT",
    "fr": "SWIFT",
    "ru": "SWIFT"
  },
  "Delivery and Sales Terms": {
    "en": "Delivery and Sales Terms",
    "ar": "شروط التسليم والبيع",
    "tr": "Teslimat ve Satış Şartları",
    "fr": "Conditions de livraison et de vente",
    "ru": "Условия доставки и продажи"
  },
  "Seller Signature": {
    "en": "Seller Signature",
    "ar": "توقيع البائع",
    "tr": "Satıcı İmzası",
    "fr": "Signature du vendeur",
    "ru": "Подпись продавца"
  },
  "Buyer Signature": {
    "en": "Buyer Signature",
    "ar": "توقيع المشتري",
    "tr": "Alıcı İmzası",
    "fr": "Signature de l’acheteur",
    "ru": "Подпись покупателя"
  },
  "Stamp": {
    "en": "Stamp",
    "ar": "الختم",
    "tr": "Mühür",
    "fr": "Cachet",
    "ru": "Печать"
  },
  "This invoice was issued by WOW Furniture — www.wowmobilya.net": {
    "en": "This invoice was issued by WOW Furniture — www.wowmobilya.net",
    "ar": "هذه الفاتورة صادرة من WOW Furniture — www.wowmobilya.net",
    "tr": "Bu fatura WOW Furniture tarafından düzenlenmiştir — www.wowmobilya.net",
    "fr": "Facture émise par WOW Furniture — www.wowmobilya.net",
    "ru": "Счёт выдан WOW Furniture — www.wowmobilya.net"
  },
  "Price Tier": {
    "en": "Price Tier",
    "ar": "درجة التسعير",
    "tr": "Fiyat Kademesi",
    "fr": "Catégorie de prix",
    "ru": "Категория цены"
  },
  "Packets": {
    "en": "Packets",
    "ar": "الباكيتات",
    "tr": "Paket",
    "fr": "Colis",
    "ru": "Упаковки"
  },
  "Mersis No": {
    "en": "Mersis No",
    "ar": "رقم Mersis",
    "tr": "Mersis No",
    "fr": "N° Mersis",
    "ru": "Номер Mersis"
  },
  "PayPal": {
    "en": "PayPal",
    "fr": "PayPal",
    "ru": "PayPal",
    "ar": "PayPal",
    "tr": "PayPal"
  },
  "": {
    "en": "",
    "ar": "",
    "tr": "",
    "fr": "",
    "ru": ""
  },
  "-------------------": {
    "en": "-------------------",
    "ar": "-------------------",
    "tr": "-------------------",
    "fr": "-------------------",
    "ru": "-------------------"
  },
  "TOTAL AMOUNT": {
    "en": "TOTAL AMOUNT",
    "ar": "المبلغ الإجمالي",
    "tr": "TOPLAM TUTAR",
    "fr": "MONTANT TOTAL",
    "ru": "ОБЩАЯ СУММА"
  },
  "--------------------": {
    "en": "--------------------",
    "ar": "--------------------",
    "tr": "--------------------",
    "fr": "--------------------",
    "ru": "--------------------"
  },
  "- - - - - - - - - -": {
    "en": "- - - - - - - - - -",
    "ar": "- - - - - - - - - -",
    "tr": "- - - - - - - - - -",
    "fr": "- - - - - - - - - -",
    "ru": "- - - - - - - - - -"
  },
  "COLOR": {
    "en": "COLOR",
    "ar": "اللون",
    "tr": "RENK",
    "fr": "COULEUR",
    "ru": "ЦВЕТ"
  },
  "QTY": {
    "en": "QTY",
    "ar": "الكمية",
    "tr": "ADET",
    "fr": "QTÉ",
    "ru": "КОЛ-ВО"
  },
  "UNIT PRICE": {
    "en": "UNIT PRICE",
    "ar": "السعر",
    "tr": "BİRİM FİYAT",
    "fr": "PRIX UNITAIRE",
    "ru": "ЦЕНА ЗА ЕДИНИЦУ"
  },
  "TOTAL": {
    "en": "TOTAL",
    "ar": "المجموع",
    "tr": "TOPLAM",
    "fr": "TOTAL",
    "ru": "ИТОГО"
  },
  "SUBTOTAL": {
    "en": "SUBTOTAL",
    "ar": "المجموع الفرعي",
    "tr": "ARA TOPLAM",
    "fr": "SOUS-TOTAL",
    "ru": "ПРОМЕЖУТОЧНЫЙ ИТОГ"
  },
  "DISCOUNT": {
    "en": "DISCOUNT",
    "ar": "الخصم",
    "tr": "İSKONTO",
    "fr": "REMISE",
    "ru": "СКИДКА"
  },
  "DEPOSIT": {
    "en": "DEPOSIT",
    "ar": "العربون",
    "tr": "DEPOZİTO",
    "fr": "ACOMPTE",
    "ru": "АВАНС"
  },
  "TOTAL PAID": {
    "en": "TOTAL PAID",
    "ar": "المدفوع",
    "tr": "ÖDENEN",
    "fr": "TOTAL PAYÉ",
    "ru": "ВСЕГО ОПЛАЧЕНО"
  },
  "REMAINING": {
    "en": "REMAINING",
    "ar": "المتبقي",
    "tr": "KALAN",
    "fr": "SOLDE RESTANT",
    "ru": "ОСТАТОК"
  },
  "PICTURE": {
    "en": "PICTURE",
    "ar": "الصورة",
    "tr": "FOTOĞRAF",
    "fr": "PHOTO",
    "ru": "ФОТО"
  },
  "ITEM\nNAME": {
    "en": "ITEM\nNAME",
    "ar": "اسم\nالمنتج",
    "tr": "ÜRÜN\nADI",
    "fr": "DÉSIGNATION",
    "ru": "НАИМЕНОВАНИЕ"
  },
  "HS\nCODE": {
    "en": "HS\nCODE",
    "ar": "كود\nHS",
    "tr": "HS\nKODU",
    "fr": "CODE\nSH",
    "ru": "КОД\nТН ВЭД"
  },
  "DIMENSIONS\n(cm)": {
    "en": "DIMENSIONS\n(cm)",
    "ar": "الأبعاد\n(سم)",
    "tr": "BOYUTLAR\n(cm)",
    "fr": "DIMENSIONS\n(cm)",
    "ru": "РАЗМЕРЫ\n(см)"
  },
  "COLOUR": {
    "en": "COLOUR",
    "ar": "اللون",
    "tr": "RENK",
    "fr": "COULEUR",
    "ru": "ЦВЕТ"
  },
  "SET /\nPCS": {
    "en": "SET /\nPCS",
    "ar": "طقم /\nقطعة",
    "tr": "TAKIM /\nPARÇA",
    "fr": "ENSEMBLE /\nPIÈCES",
    "ru": "КОМПЛЕКТ /\nШТ."
  },
  "UNIT\nPRICE": {
    "en": "UNIT\nPRICE",
    "ar": "سعر\nالوحدة",
    "tr": "BİRİM\nFİYAT",
    "fr": "PRIX\nUNITAIRE",
    "ru": "ЦЕНА ЗА\nЕДИНИЦУ"
  },
  "TOTAL\nPRICE": {
    "en": "TOTAL\nPRICE",
    "ar": "الإجمالي",
    "tr": "TOPLAM\nFİYAT",
    "fr": "PRIX\nTOTAL",
    "ru": "ОБЩАЯ\nСТОИМОСТЬ"
  },
  "PKT\nCOUNT": {
    "en": "PKT\nCOUNT",
    "ar": "عدد\nالباكيت",
    "tr": "PAKET\nSAYISI",
    "fr": "NB DE\nCOLIS",
    "ru": "КОЛ-ВО\nУПАКОВОК"
  },
  "TOTAL\nPKT": {
    "en": "TOTAL\nPKT",
    "ar": "إجمالي\nالباكيت",
    "tr": "TOPLAM\nPAKET",
    "fr": "TOTAL\nCOLIS",
    "ru": "ВСЕГО\nУПАКОВОК"
  },
  "UNIT\nCBM (m³)": {
    "en": "UNIT\nCBM (m³)",
    "ar": "CBM\nللوحدة",
    "tr": "BİRİM\nCBM (m³)",
    "fr": "VOLUME\nUNITAIRE (m³)",
    "ru": "ОБЪЁМ\nЕДИНИЦЫ (м³)"
  },
  "TOTAL\nCBM (m³)": {
    "en": "TOTAL\nCBM (m³)",
    "ar": "CBM\nالإجمالي",
    "tr": "TOPLAM\nCBM (m³)",
    "fr": "VOLUME\nTOTAL (m³)",
    "ru": "ОБЩИЙ\nОБЪЁМ (м³)"
  },
  "UNIT\nWT (Kg)": {
    "en": "UNIT\nWT (Kg)",
    "ar": "وزن\nالوحدة",
    "tr": "BİRİM\nAĞIRLIK",
    "fr": "POIDS\nUNITAIRE (kg)",
    "ru": "ВЕС\nЕДИНИЦЫ (кг)"
  },
  "TOTAL\nWT (Kg)": {
    "en": "TOTAL\nWT (Kg)",
    "ar": "الوزن\nالإجمالي",
    "tr": "TOPLAM\nAĞIRLIK",
    "fr": "POIDS\nTOTAL (kg)",
    "ru": "ОБЩИЙ\nВЕС (кг)"
  },
  "TOTAL PER: QUANTITY / PRICE / PACKET / CBM / KG": {
    "en": "TOTAL PER: QUANTITY / PRICE / PACKET / CBM / KG",
    "ar": "الإجمالي: الكمية / السعر / الباكيت / م³ / كجم",
    "tr": "TOPLAM: MİKTAR / FİYAT / PAKET / CBM / KG",
    "fr": "TOTAUX : QUANTITÉ / PRIX / COLIS / VOLUME / POIDS",
    "ru": "ИТОГИ: КОЛИЧЕСТВО / ЦЕНА / УПАКОВКИ / ОБЪЁМ / ВЕС"
  },
  "Method": {
    "en": "Method",
    "ar": "الطريقة",
    "tr": "Yöntem",
    "fr": "Mode",
    "ru": "Способ"
  },
  "Original": {
    "en": "Original",
    "ar": "الأصلي",
    "tr": "Orijinal",
    "fr": "D’origine",
    "ru": "Исходная сумма"
  },
  "DELIVERY AND SALES TERMS": {
    "en": "DELIVERY AND SALES TERMS",
    "ar": "شروط التسليم والبيع",
    "tr": "TESLİMAT VE SATIŞ ŞARTLARI",
    "fr": "CONDITIONS DE LIVRAISON ET DE VENTE",
    "ru": "УСЛОВИЯ ДОСТАВКИ И ПРОДАЖИ"
  },
  "AMOUNT PAYABLE IN WORDS": {
    "en": "AMOUNT PAYABLE IN WORDS",
    "ar": "المبلغ المستحق كتابةً",
    "tr": "ÖDENECEK TUTAR YAZIYLA",
    "fr": "MONTANT À PAYER EN LETTRES",
    "ru": "СУММА К ОПЛАТЕ ПРОПИСЬЮ"
  },
  "TOTAL PAID IN WORDS": {
    "en": "TOTAL PAID IN WORDS",
    "ar": "إجمالي المدفوع كتابةً",
    "tr": "ÖDENEN TUTAR YAZIYLA",
    "fr": "TOTAL PAYÉ EN LETTRES",
    "ru": "ОПЛАЧЕННАЯ СУММА ПРОПИСЬЮ"
  },
  "TOTAL INCLUDING TAXES IN WORDS": {
    "en": "TOTAL INCLUDING TAXES IN WORDS",
    "ar": "المجموع الشامل للضرائب كتابةً",
    "tr": "VERGİLER DAHİL TOPLAM YAZIYLA",
    "fr": "TOTAL TTC EN LETTRES",
    "ru": "СУММА С НАЛОГАМИ ПРОПИСЬЮ"
  },
  "GRAND TOTAL IN WORDS": {
    "en": "GRAND TOTAL IN WORDS",
    "ar": "المجموع النهائي كتابةً",
    "tr": "GENEL TOPLAM YAZIYLA",
    "fr": "TOTAL GÉNÉRAL EN LETTRES",
    "ru": "ИТОГОВАЯ СУММА ПРОПИСЬЮ"
  },
  "Length (cm)": {
    "en": "Length (cm)",
    "ar": "الطول (سم)",
    "tr": "Uzunluk (cm)",
    "fr": "Longueur (cm)",
    "ru": "Длина (см)"
  },
  "Width (cm)": {
    "en": "Width (cm)",
    "ar": "العرض (سم)",
    "tr": "Genişlik (cm)",
    "fr": "Largeur (cm)",
    "ru": "Ширина (см)"
  },
  "Height (cm)": {
    "en": "Height (cm)",
    "ar": "الارتفاع (سم)",
    "tr": "Yükseklik (cm)",
    "fr": "Hauteur (cm)",
    "ru": "Высота (см)"
  },
  "Type color manually...": {
    "en": "Type color manually...",
    "ar": "اكتب اللون يدوياً...",
    "tr": "Rengi manuel yazın...",
    "fr": "Saisir la couleur…",
    "ru": "Введите цвет…"
  },
  "Example: W400": {
    "en": "Example: W400",
    "ar": "مثال: W400",
    "tr": "Örnek: W400",
    "fr": "Exemple : W400",
    "ru": "Пример: W400"
  },
  "Save Edit": {
    "en": "Save Edit",
    "ar": "حفظ التعديل",
    "tr": "Değişiklikleri Kaydet",
    "fr": "Enregistrer les modifications",
    "ru": "Сохранить изменения"
  },
  "✏️ Edit Product": {
    "en": "✏️ Edit Product",
    "ar": "✏️ تعديل منتج",
    "tr": "✏️ Ürün Düzenle",
    "fr": "✏️ Modifier le produit",
    "ru": "✏️ Изменить товар"
  },
  "✏️ Edit Invoice": {
    "en": "✏️ Edit Invoice",
    "ar": "✏️ تعديل الفاتورة",
    "tr": "✏️ Faturayı Düzenle",
    "fr": "✏️ Modifier la facture",
    "ru": "✏️ Изменить счёт"
  },
  "Delivery today!": {
    "en": "Delivery today!",
    "ar": "اليوم موعد التسليم!",
    "tr": "Bugün teslimat!",
    "fr": "Livraison aujourd’hui !",
    "ru": "Доставка сегодня!"
  },
  "Confirm Delivery": {
    "en": "Confirm Delivery",
    "ar": "تأكيد التسليم",
    "tr": "Teslimi Onayla",
    "fr": "Confirmer la livraison",
    "ru": "Подтвердить доставку"
  },
  "Are you sure you want to mark this invoice as delivered?": {
    "en": "Are you sure you want to mark this invoice as delivered?",
    "ar": "هل أنت متأكد من تسليم هذه الفاتورة؟",
    "tr": "Bu faturayı teslim edildi olarak işaretlemek istiyor musunuz?",
    "fr": "Confirmer que cette facture a été livrée ?",
    "ru": "Отметить этот счёт как доставленный?"
  },
  "The invoice will be automatically moved to archive after confirmation.": {
    "en": "The invoice will be automatically moved to archive after confirmation.",
    "ar": "سيتم نقل الفاتورة تلقائياً إلى الأرشيف بعد التأكيد.",
    "tr": "Onaylandıktan sonra fatura otomatik olarak arşive taşınacak.",
    "fr": "La facture sera automatiquement archivée après confirmation.",
    "ru": "После подтверждения счёт будет перемещён в архив."
  },
  "🗂️": {
    "en": "🗂️",
    "ar": "🗂️",
    "tr": "🗂️",
    "fr": "🗂️",
    "ru": "🗂️"
  },
  "✅ Confirm Delivery": {
    "en": "✅ Confirm Delivery",
    "ar": "✅ تأكيد التسليم",
    "tr": "✅ Teslimi Onayla",
    "fr": "✅ Confirmer la livraison",
    "ru": "✅ Подтвердить доставку"
  },
  "✅ Delivered & archived successfully": {
    "en": "✅ Delivered & archived successfully",
    "ar": "✅ تم التسليم ونقل الفاتورة للأرشيف",
    "tr": "✅ Teslim edildi ve arşivlendi",
    "fr": "✅ Livraison confirmée et facture archivée",
    "ru": "✅ Доставка подтверждена, счёт в архиве"
  },
  "Unarchive Invoice": {
    "en": "Unarchive Invoice",
    "ar": "إلغاء الأرشفة",
    "tr": "Arşivi Kaldır",
    "fr": "Désarchiver la facture",
    "ru": "Вернуть счёт из архива"
  },
  "Do you want to move this invoice back to the active list?": {
    "en": "Do you want to move this invoice back to the active list?",
    "ar": "هل تريد إعادة هذه الفاتورة إلى القائمة النشطة؟",
    "tr": "Bu faturayı aktif listeye geri döndürmek istiyor musunuz?",
    "fr": "Remettre cette facture dans la liste active ?",
    "ru": "Вернуть этот счёт в активный список?"
  },
  "Delivery status will be reset and the invoice will return to active invoices.": {
    "en": "Delivery status will be reset and the invoice will return to active invoices.",
    "ar": "سيتم إلغاء التسليم وإعادة الفاتورة إلى الفواتير النشطة.",
    "tr": "Teslimat iptal edilecek ve fatura aktif faturalara geri dönecek.",
    "fr": "Le statut de livraison sera réinitialisé et la facture redeviendra active.",
    "ru": "Статус доставки будет сброшен, счёт вернётся в активные."
  },
  "🔄": {
    "en": "🔄",
    "ar": "🔄",
    "tr": "🔄",
    "fr": "🔄",
    "ru": "🔄"
  },
  "🔄 Unarchive": {
    "en": "🔄 Unarchive",
    "ar": "🔄 إلغاء الأرشفة",
    "tr": "🔄 Arşivi Kaldır",
    "fr": "🔄 Désarchiver",
    "ru": "🔄 Вернуть из архива"
  },
  "🔄 Unarchived & moved back to active": {
    "en": "🔄 Unarchived & moved back to active",
    "ar": "🔄 تم إلغاء الأرشفة وإعادة الفاتورة للقائمة النشطة",
    "tr": "🔄 Arşiv kaldırıldı, fatura aktife alındı",
    "fr": "🔄 Facture désarchivée et remise dans la liste active",
    "ru": "🔄 Счёт возвращён из архива в активные"
  },
  "Elegant coffee table": {
    "en": "Elegant coffee table",
    "ar": "طاولة قهوة أنيقة",
    "tr": "Zarif sehpa",
    "fr": "Table basse élégante",
    "ru": "Элегантный журнальный столик"
  },
  "Best Seller": {
    "en": "Best Seller",
    "ar": "الأكثر مبيعاً",
    "tr": "En çok satan",
    "fr": "Meilleure vente",
    "ru": "Хит продаж"
  },
  "Mirror & drawers unit": {
    "en": "Mirror & drawers unit",
    "ar": "تسريحة بمرآة وأدراج",
    "tr": "Aynalı şifonyer",
    "fr": "Meuble avec miroir et tiroirs",
    "ru": "Мебель с зеркалом и ящиками"
  },
  "Top Demand": {
    "en": "Top Demand",
    "ar": "الأكثر طلباً",
    "tr": "Çok talep gören",
    "fr": "Très demandé",
    "ru": "Высокий спрос"
  },
  "Versatile side table": {
    "en": "Versatile side table",
    "ar": "طاولة جانبية متعددة الاستخدام",
    "tr": "Çok amaçlı yan sehpa",
    "fr": "Table d’appoint polyvalente",
    "ru": "Универсальный приставной столик"
  },
  "Light & Practical": {
    "en": "Light & Practical",
    "ar": "خفيف وعملي",
    "tr": "Hafif & pratik",
    "fr": "Léger et pratique",
    "ru": "Лёгкий и практичный"
  },
  "TV & entertainment unit": {
    "en": "TV & entertainment unit",
    "ar": "وحدة تلفاز وترفيه",
    "tr": "TV & eğlence ünitesi",
    "fr": "Meuble TV et multimédia",
    "ru": "Тумба для телевизора и мультимедиа"
  },
  "Full Unit": {
    "en": "Full Unit",
    "ar": "وحدة متكاملة",
    "tr": "Tam ünite",
    "fr": "Meuble complet",
    "ru": "Полный комплект"
  },
  "Select": {
    "en": "Select",
    "ar": "اختيار",
    "tr": "Seç",
    "fr": "Sélectionner",
    "ru": "Выбрать"
  },
  "Fill in product details": {
    "en": "Fill in product details",
    "ar": "املأ بيانات المنتج",
    "tr": "Ürün bilgilerini doldurun",
    "fr": "Renseignez les détails du produit",
    "ru": "Заполните данные товара"
  },
  "Hide Details": {
    "en": "Hide Details",
    "ar": "إخفاء التفاصيل",
    "tr": "Gizle",
    "fr": "Masquer les détails",
    "ru": "Скрыть подробности"
  },
  "⚠️ Camera failed — use search": {
    "en": "⚠️ Camera failed — use search",
    "ar": "⚠️ تعذّر فتح الكاميرا — استخدم البحث",
    "tr": "⚠️ Kamera açılamadı — arama kullanın",
    "fr": "⚠️ Caméra indisponible — utilisez la recherche",
    "ru": "⚠️ Камера недоступна — используйте поиск"
  },
  "✅ Product found": {
    "en": "✅ Product found",
    "ar": "✅ تم العثور على المنتج",
    "tr": "✅ Ürün bulundu",
    "fr": "✅ Produit trouvé",
    "ru": "✅ Товар найден"
  },
  "Select a category above": {
    "en": "Select a category above",
    "ar": "اختر فئة من الأعلى",
    "tr": "Yukarıdan kategori seçin",
    "fr": "Sélectionnez une catégorie ci-dessus",
    "ru": "Выберите категорию выше"
  },
  "🛒 Add to Cart": {
    "en": "🛒 Add to Cart",
    "ar": "🛒 أضف للسلة",
    "tr": "🛒 Sepete Ekle",
    "fr": "🛒 Ajouter au panier",
    "ru": "🛒 Добавить в корзину"
  },
  "Added to cart": {
    "en": "Added to cart",
    "ar": "أُضيف للسلة",
    "tr": "Sepete eklendi",
    "fr": "Ajouté au panier",
    "ru": "Добавлено в корзину"
  },
  "✅ Cart sent to invoice": {
    "en": "✅ Cart sent to invoice",
    "ar": "✅ تم نقل السلة للفاتورة",
    "tr": "✅ Sepet faturaya aktarıldı",
    "fr": "✅ Panier transféré vers la facture",
    "ru": "✅ Корзина перенесена в счёт"
  },
  "Cart is empty": {
    "en": "Cart is empty",
    "ar": "السلة فارغة",
    "tr": "Sepet boş",
    "fr": "Le panier est vide",
    "ru": "Корзина пуста"
  },
  "Clear the cart?": {
    "en": "Clear the cart?",
    "ar": "هل تريد مسح السلة؟",
    "tr": "Sepeti temizlemek istiyor musunuz?",
    "fr": "Vider le panier ?",
    "ru": "Очистить корзину?"
  },
  "Choose which currencies appear in the PDF exchange-rate section. Unselected currencies are hidden.": {
    "en": "Choose which currencies appear in the PDF exchange-rate section. Unselected currencies are hidden.",
    "ar": "حدد العملات التي تريد ظهورها في قسم أسعار الصرف داخل PDF. أي عملة غير محددة تختفي من هذا القسم.",
    "tr": "PDF içindeki döviz kuru bölümünde görmek istediğiniz para birimlerini seçin. Seçilmeyen para birimi gizlenir.",
    "fr": "Choisissez les devises affichées dans la section des taux de change du PDF. Les autres seront masquées.",
    "ru": "Выберите валюты для раздела курсов в PDF. Невыбранные валюты будут скрыты."
  },
  "💵 US Dollar — USD": {
    "en": "💵 US Dollar — USD",
    "ar": "💵 دولار أمريكي — USD",
    "tr": "💵 Amerikan Doları — USD",
    "fr": "💵 Dollar américain — USD",
    "ru": "💵 Доллар США — USD"
  },
  "💶 Euro — EUR": {
    "en": "💶 Euro — EUR",
    "ar": "💶 يورو أوروبي — EUR",
    "tr": "💶 Avro — EUR",
    "fr": "💶 Euro — EUR",
    "ru": "💶 Евро — EUR"
  },
  "🇹🇷 Turkish Lira — TRY": {
    "en": "🇹🇷 Turkish Lira — TRY",
    "ar": "🇹🇷 ليرة تركية — TRY",
    "tr": "🇹🇷 Türk Lirası — TRY",
    "fr": "🇹🇷 Livre turque — TRY",
    "ru": "🇹🇷 Турецкая лира — TRY"
  },
  "Immediate Delivery": {
    "en": "Immediate Delivery",
    "ar": "تسليم فوري",
    "tr": "Hemen Teslim",
    "fr": "Livraison immédiate",
    "ru": "Немедленная доставка"
  },
  "Delivery after 15 days": {
    "en": "Delivery after 15 days",
    "ar": "التسليم بعد 15 يوماً",
    "tr": "15 gün sonra teslimat",
    "fr": "Livraison après 15 jours",
    "ru": "Доставка через 15 дней"
  },
  "Delivery after 30 days": {
    "en": "Delivery after 30 days",
    "ar": "التسليم بعد 30 يوماً",
    "tr": "30 gün sonra teslimat",
    "fr": "Livraison après 30 jours",
    "ru": "Доставка через 30 дней"
  },
  "Delivery after 45 days": {
    "en": "Delivery after 45 days",
    "ar": "التسليم بعد 45 يوماً",
    "tr": "45 gün sonra teslimat",
    "fr": "Livraison après 45 jours",
    "ru": "Доставка через 45 дней"
  },
  "Delivery after 50 days": {
    "en": "Delivery after 50 days",
    "ar": "التسليم بعد 50 يوماً",
    "tr": "50 gün sonra teslimat",
    "fr": "Livraison après 50 jours",
    "ru": "Доставка через 50 дней"
  },
  "Shipping on buyer": {
    "en": "Shipping on buyer",
    "ar": "الشحن على المشتري",
    "tr": "Nakliye alıcıya ait",
    "fr": "Transport à la charge de l’acheteur",
    "ru": "Доставка за счёт покупателя"
  },
  "Free shipping / Covered by company": {
    "en": "Free shipping / Covered by company",
    "ar": "الشحن مجاني / على حساب الشركة",
    "tr": "Ücretsiz nakliye / Şirket öder",
    "fr": "Transport gratuit / à la charge de la société",
    "ru": "Бесплатная доставка / за счёт компании"
  },
  "Prices are valid for 15 days from the invoice date": {
    "en": "Prices are valid for 15 days from the invoice date",
    "ar": "الأسعار صالحة لمدة 15 يوماً من تاريخ الفاتورة",
    "tr": "Fiyatlar fatura tarihinden itibaren 15 gün geçerlidir",
    "fr": "Les prix sont valables 15 jours à compter de la date de la facture",
    "ru": "Цены действительны в течение 15 дней с даты выставления счёта"
  },
  "Sold goods cannot be returned or exchanged": {
    "en": "Sold goods cannot be returned or exchanged",
    "ar": "البضاعة المباعة لا ترد ولا تستبدل",
    "tr": "Satılan ürünler iade edilemez veya değiştirilemez",
    "fr": "Les marchandises vendues ne sont ni reprises ni échangées",
    "ru": "Проданные товары не подлежат возврату или обмену"
  },
  "Full amount must be paid before shipping": {
    "en": "Full amount must be paid before shipping",
    "ar": "يجب دفع كامل المبلغ قبل الشحن",
    "tr": "Sevkiyattan önce tüm tutar ödenmelidir",
    "fr": "Le montant total doit être payé avant l’expédition",
    "ru": "Полная сумма должна быть оплачена до отгрузки"
  },
  "The company is not responsible for damages caused by misuse or incorrect installation": {
    "en": "The company is not responsible for damages caused by misuse or incorrect installation",
    "ar": "الشركة غير مسؤولة عن أي أضرار ناتجة عن سوء الاستخدام أو التركيب الخاطئ",
    "tr": "Şirket, yanlış kullanım veya hatalı kurulumdan kaynaklanan hasarlardan sorumlu değildir",
    "fr": "La société décline toute responsabilité pour les dommages causés par une mauvaise utilisation ou installation",
    "ru": "Компания не несёт ответственности за ущерб, вызванный неправильным использованием или установкой"
  },
  "Any claims regarding damage or shortage must be reported within 3 days of receipt": {
    "en": "Any claims regarding damage or shortage must be reported within 3 days of receipt",
    "ar": "أي مطالبات بخصوص التلف أو النقص يجب الإبلاغ عنها خلال 3 أيام من الاستلام",
    "tr": "Hasar veya eksiklik ile ilgili talepler teslimattan sonraki 3 gün içinde bildirilmelidir",
    "fr": "Toute réclamation pour dommage ou article manquant doit être signalée dans les 3 jours suivant la réception",
    "ru": "О повреждениях или недостаче необходимо сообщить в течение 3 дней после получения"
  },
  "✏️ Custom Date": {
    "en": "✏️ Custom Date",
    "ar": "✏️ تاريخ مخصص",
    "tr": "✏️ Özel Tarih",
    "fr": "✏️ Date personnalisée",
    "ru": "✏️ Другая дата"
  },
  "✅ Terms selected": {
    "en": "✅ Terms selected",
    "ar": "✅ تم اختيار الشروط",
    "tr": "✅ Şartlar seçildi",
    "fr": "✅ Conditions sélectionnées",
    "ru": "✅ Условия выбраны"
  },
  "— Select a template —": {
    "en": "— Select a template —",
    "ar": "— اختر ملاحظة جاهزة —",
    "tr": "— Hazır not seçin —",
    "fr": "— Choisir un modèle —",
    "ru": "— Выберите шаблон —"
  },
  "📝 Terms & date updated": {
    "en": "📝 Terms & date updated",
    "ar": "📝 تم تحديث الشروط والتاريخ",
    "tr": "📝 Şartlar ve tarih güncellendi",
    "fr": "📝 Conditions et date mises à jour",
    "ru": "📝 Условия и дата обновлены"
  },
  "Delivery Date": {
    "en": "Delivery Date",
    "ar": "موعد التسليم",
    "tr": "Teslimat Tarihi",
    "fr": "Date de livraison",
    "ru": "Дата доставки"
  },
  "45 Days": {
    "en": "45 Days",
    "ar": "45 يوم",
    "tr": "45 Gün",
    "fr": "45 jours",
    "ru": "45 дней"
  },
  "Manual Date": {
    "en": "Manual Date",
    "ar": "تاريخ يدوي",
    "tr": "Manuel Tarih",
    "fr": "Date manuelle",
    "ru": "Указать дату"
  },
  "Plate No": {
    "en": "Plate No",
    "ar": "رقم اللوحة",
    "tr": "Plaka No",
    "fr": "Immatriculation",
    "ru": "Номерной знак"
  },
  "Truck No": {
    "en": "Truck No",
    "ar": "رقم الشاحنة",
    "tr": "Kamyon No",
    "fr": "N° du camion",
    "ru": "Номер грузовика"
  },
  "Shipping": {
    "en": "Shipping",
    "ar": "الشحن",
    "tr": "Nakliye",
    "fr": "Transport",
    "ru": "Доставка"
  },
  "Choose who bears the shipping cost": {
    "en": "Choose who bears the shipping cost",
    "ar": "اختر من يتحمل تكلفة الشحن",
    "tr": "Nakliye masrafını kimin üstleneceğini seçin",
    "fr": "Choisissez qui prend en charge les frais de transport",
    "ru": "Выберите, кто оплачивает доставку"
  },
  "Shipping on Buyer": {
    "en": "Shipping on Buyer",
    "ar": "الشحن على العميل",
    "tr": "Alıcı Öder",
    "fr": "Transport à la charge du client",
    "ru": "Доставка за счёт клиента"
  },
  "Buyer pays all shipping costs": {
    "en": "Buyer pays all shipping costs",
    "ar": "يدفع العميل تكلفة الشحن",
    "tr": "Nakliye masrafı alıcıya aittir",
    "fr": "Le client paie les frais de transport",
    "ru": "Клиент оплачивает доставку"
  },
  "Shipping on Company": {
    "en": "Shipping on Company",
    "ar": "الشحن على الشركة",
    "tr": "Şirket Öder",
    "fr": "Transport à la charge de la société",
    "ru": "Доставка за счёт компании"
  },
  "WOW Furniture covers shipping": {
    "en": "WOW Furniture covers shipping",
    "ar": "WOW Furniture تتحمل الشحن",
    "tr": "WOW Furniture nakliyeyi üstlenir",
    "fr": "WOW Furniture prend en charge le transport",
    "ru": "WOW Furniture оплачивает доставку"
  },
  "Quick Templates": {
    "en": "Quick Templates",
    "ar": "صيغ جاهزة",
    "tr": "Hazır Şablonlar",
    "fr": "Modèles prédéfinis",
    "ru": "Готовые шаблоны"
  },
  "Manual": {
    "en": "Manual",
    "ar": "يدوي",
    "tr": "Manuel",
    "fr": "Manuel",
    "ru": "Вручную"
  },
  "👤 Buyer Pays": {
    "en": "👤 Buyer Pays",
    "ar": "👤 على العميل",
    "tr": "👤 Alıcı Öder",
    "fr": "👤 À la charge du client",
    "ru": "👤 За счёт клиента"
  },
  "🏢 Company Pays": {
    "en": "🏢 Company Pays",
    "ar": "🏢 على الشركة",
    "tr": "🏢 Şirket Öder",
    "fr": "🏢 À la charge de la société",
    "ru": "🏢 За счёт компании"
  },
  "STANDARD": {
    "en": "STANDARD",
    "ar": "STANDARD",
    "tr": "STANDARD",
    "fr": "STANDARD",
    "ru": "STANDARD"
  },
  "⭐ Standard (Default)": {
    "en": "⭐ Standard (Default)",
    "ar": "⭐ ستاندر (افتراضي)",
    "tr": "⭐ Standart (Varsayılan)",
    "fr": "⭐ Standard (par défaut)",
    "ru": "⭐ Стандартный (по умолчанию)"
  },
  "default": {
    "en": "default",
    "ar": "default",
    "tr": "default",
    "fr": "default",
    "ru": "default"
  },
  "CUSTOM": {
    "en": "CUSTOM",
    "ar": "CUSTOM",
    "tr": "CUSTOM",
    "fr": "CUSTOM",
    "ru": "CUSTOM"
  },
  "✏️ Custom (Type Manually)": {
    "en": "✏️ Custom (Type Manually)",
    "ar": "✏️ مخصص (اكتب يدوياً)",
    "tr": "✏️ Özel (Manuel Yaz)",
    "fr": "✏️ Personnalisé (saisie manuelle)",
    "ru": "✏️ Другой (ввести вручную)"
  },
  "TURKISH_WALNUT": {
    "en": "TURKISH_WALNUT",
    "ar": "TURKISH_WALNUT",
    "tr": "TURKISH_WALNUT",
    "fr": "TURKISH_WALNUT",
    "ru": "TURKISH_WALNUT"
  },
  "🌰 Turkish Walnut": {
    "en": "🌰 Turkish Walnut",
    "ar": "🌰 جوز تركي",
    "tr": "🌰 Türk Cevizi",
    "fr": "🌰 Noyer turc",
    "ru": "🌰 Турецкий орех"
  },
  "walnut": {
    "en": "walnut",
    "ar": "walnut",
    "tr": "walnut",
    "fr": "walnut",
    "ru": "walnut"
  },
  "AMERICAN_WALNUT": {
    "en": "AMERICAN_WALNUT",
    "ar": "AMERICAN_WALNUT",
    "tr": "AMERICAN_WALNUT",
    "fr": "AMERICAN_WALNUT",
    "ru": "AMERICAN_WALNUT"
  },
  "🟫 American Walnut": {
    "en": "🟫 American Walnut",
    "ar": "🟫 جوز أمريكي",
    "tr": "🟫 Amerikan Cevizi",
    "fr": "🟫 Noyer américain",
    "ru": "🟫 Американский орех"
  },
  "STRIPED_WALNUT": {
    "en": "STRIPED_WALNUT",
    "ar": "STRIPED_WALNUT",
    "tr": "STRIPED_WALNUT",
    "fr": "STRIPED_WALNUT",
    "ru": "STRIPED_WALNUT"
  },
  "🪵 Striped Walnut": {
    "en": "🪵 Striped Walnut",
    "ar": "🪵 جوز مقلَّم",
    "tr": "🪵 Çizgili Ceviz",
    "fr": "🪵 Noyer rayé",
    "ru": "🪵 Полосатый орех"
  },
  "INLAID_WALNUT": {
    "en": "INLAID_WALNUT",
    "ar": "INLAID_WALNUT",
    "tr": "INLAID_WALNUT",
    "fr": "INLAID_WALNUT",
    "ru": "INLAID_WALNUT"
  },
  "✨ Inlaid Walnut": {
    "en": "✨ Inlaid Walnut",
    "ar": "✨ جوز معرَّق",
    "tr": "✨ Damarlı Ceviz",
    "fr": "✨ Noyer incrusté",
    "ru": "✨ Орех с инкрустацией"
  },
  "DARK_WALNUT": {
    "en": "DARK_WALNUT",
    "ar": "DARK_WALNUT",
    "tr": "DARK_WALNUT",
    "fr": "DARK_WALNUT",
    "ru": "DARK_WALNUT"
  },
  "🌑 Dark Walnut": {
    "en": "🌑 Dark Walnut",
    "ar": "🌑 جوز غامق",
    "tr": "🌑 Koyu Ceviz",
    "fr": "🌑 Noyer foncé",
    "ru": "🌑 Тёмный орех"
  },
  "LIGHT_WALNUT": {
    "en": "LIGHT_WALNUT",
    "ar": "LIGHT_WALNUT",
    "tr": "LIGHT_WALNUT",
    "fr": "LIGHT_WALNUT",
    "ru": "LIGHT_WALNUT"
  },
  "🌕 Light Walnut": {
    "en": "🌕 Light Walnut",
    "ar": "🌕 جوز فاتح",
    "tr": "🌕 Açık Ceviz",
    "fr": "🌕 Noyer clair",
    "ru": "🌕 Светлый орех"
  },
  "SMOKED_WALNUT": {
    "en": "SMOKED_WALNUT",
    "ar": "SMOKED_WALNUT",
    "tr": "SMOKED_WALNUT",
    "fr": "SMOKED_WALNUT",
    "ru": "SMOKED_WALNUT"
  },
  "🌫️ Smoked Walnut": {
    "en": "🌫️ Smoked Walnut",
    "ar": "🌫️ جوز مدخَّن",
    "tr": "🌫️ Füme Ceviz",
    "fr": "🌫️ Noyer fumé",
    "ru": "🌫️ Дымчатый орех"
  },
  "GOLDEN_WALNUT": {
    "en": "GOLDEN_WALNUT",
    "ar": "GOLDEN_WALNUT",
    "tr": "GOLDEN_WALNUT",
    "fr": "GOLDEN_WALNUT",
    "ru": "GOLDEN_WALNUT"
  },
  "🥇 Golden Walnut": {
    "en": "🥇 Golden Walnut",
    "ar": "🥇 جوز ذهبي",
    "tr": "🥇 Altın Ceviz",
    "fr": "🥇 Noyer doré",
    "ru": "🥇 Золотистый орех"
  },
  "NATURAL_OAK": {
    "en": "NATURAL_OAK",
    "ar": "NATURAL_OAK",
    "tr": "NATURAL_OAK",
    "fr": "NATURAL_OAK",
    "ru": "NATURAL_OAK"
  },
  "🌿 Natural Oak": {
    "en": "🌿 Natural Oak",
    "ar": "🌿 بلوط طبيعي",
    "tr": "🌿 Doğal Meşe",
    "fr": "🌿 Chêne naturel",
    "ru": "🌿 Натуральный дуб"
  },
  "oak": {
    "en": "oak",
    "ar": "oak",
    "tr": "oak",
    "fr": "oak",
    "ru": "oak"
  },
  "WHITE_OAK": {
    "en": "WHITE_OAK",
    "ar": "WHITE_OAK",
    "tr": "WHITE_OAK",
    "fr": "WHITE_OAK",
    "ru": "WHITE_OAK"
  },
  "⬜ White Oak": {
    "en": "⬜ White Oak",
    "ar": "⬜ بلوط أبيض",
    "tr": "⬜ Beyaz Meşe",
    "fr": "⬜ Chêne blanc",
    "ru": "⬜ Белый дуб"
  },
  "SMOKED_OAK": {
    "en": "SMOKED_OAK",
    "ar": "SMOKED_OAK",
    "tr": "SMOKED_OAK",
    "fr": "SMOKED_OAK",
    "ru": "SMOKED_OAK"
  },
  "🌫️ Smoked Oak": {
    "en": "🌫️ Smoked Oak",
    "ar": "🌫️ بلوط مدخَّن",
    "tr": "🌫️ Füme Meşe",
    "fr": "🌫️ Chêne fumé",
    "ru": "🌫️ Дымчатый дуб"
  },
  "GOLDEN_OAK": {
    "en": "GOLDEN_OAK",
    "ar": "GOLDEN_OAK",
    "tr": "GOLDEN_OAK",
    "fr": "GOLDEN_OAK",
    "ru": "GOLDEN_OAK"
  },
  "🟡 Golden Oak": {
    "en": "🟡 Golden Oak",
    "ar": "🟡 بلوط ذهبي",
    "tr": "🟡 Altın Meşe",
    "fr": "🟡 Chêne doré",
    "ru": "🟡 Золотистый дуб"
  },
  "DARK_OAK": {
    "en": "DARK_OAK",
    "ar": "DARK_OAK",
    "tr": "DARK_OAK",
    "fr": "DARK_OAK",
    "ru": "DARK_OAK"
  },
  "🟤 Dark Oak": {
    "en": "🟤 Dark Oak",
    "ar": "🟤 بلوط غامق",
    "tr": "🟤 Koyu Meşe",
    "fr": "🟤 Chêne foncé",
    "ru": "🟤 Тёмный дуб"
  },
  "NATURAL_BEECH": {
    "en": "NATURAL_BEECH",
    "ar": "NATURAL_BEECH",
    "tr": "NATURAL_BEECH",
    "fr": "NATURAL_BEECH",
    "ru": "NATURAL_BEECH"
  },
  "🌱 Natural Beech": {
    "en": "🌱 Natural Beech",
    "ar": "🌱 زان طبيعي",
    "tr": "🌱 Doğal Kayın",
    "fr": "🌱 Hêtre naturel",
    "ru": "🌱 Натуральный бук"
  },
  "beech": {
    "en": "beech",
    "ar": "beech",
    "tr": "beech",
    "fr": "beech",
    "ru": "beech"
  },
  "DARK_BEECH": {
    "en": "DARK_BEECH",
    "ar": "DARK_BEECH",
    "tr": "DARK_BEECH",
    "fr": "DARK_BEECH",
    "ru": "DARK_BEECH"
  },
  "🟫 Dark Beech": {
    "en": "🟫 Dark Beech",
    "ar": "🟫 زان غامق",
    "tr": "🟫 Koyu Kayın",
    "fr": "🟫 Hêtre foncé",
    "ru": "🟫 Тёмный бук"
  },
  "MATTE_WHITE": {
    "en": "MATTE_WHITE",
    "ar": "MATTE_WHITE",
    "tr": "MATTE_WHITE",
    "fr": "MATTE_WHITE",
    "ru": "MATTE_WHITE"
  },
  "⬜ Matte White": {
    "en": "⬜ Matte White",
    "ar": "⬜ أبيض مطفي",
    "tr": "⬜ Mat Beyaz",
    "fr": "⬜ Blanc mat",
    "ru": "⬜ Матовый белый"
  },
  "solid": {
    "en": "solid",
    "ar": "solid",
    "tr": "solid",
    "fr": "solid",
    "ru": "solid"
  },
  "GLOSS_WHITE": {
    "en": "GLOSS_WHITE",
    "ar": "GLOSS_WHITE",
    "tr": "GLOSS_WHITE",
    "fr": "GLOSS_WHITE",
    "ru": "GLOSS_WHITE"
  },
  "✨ Gloss White": {
    "en": "✨ Gloss White",
    "ar": "✨ أبيض لامع",
    "tr": "✨ Parlak Beyaz",
    "fr": "✨ Blanc brillant",
    "ru": "✨ Глянцевый белый"
  },
  "MATTE_BLACK": {
    "en": "MATTE_BLACK",
    "ar": "MATTE_BLACK",
    "tr": "MATTE_BLACK",
    "fr": "MATTE_BLACK",
    "ru": "MATTE_BLACK"
  },
  "⬛ Matte Black": {
    "en": "⬛ Matte Black",
    "ar": "⬛ أسود مطفي",
    "tr": "⬛ Mat Siyah",
    "fr": "⬛ Noir mat",
    "ru": "⬛ Матовый чёрный"
  },
  "GLOSS_BLACK": {
    "en": "GLOSS_BLACK",
    "ar": "GLOSS_BLACK",
    "tr": "GLOSS_BLACK",
    "fr": "GLOSS_BLACK",
    "ru": "GLOSS_BLACK"
  },
  "🖤 Gloss Black": {
    "en": "🖤 Gloss Black",
    "ar": "🖤 أسود لامع",
    "tr": "🖤 Parlak Siyah",
    "fr": "🖤 Noir brillant",
    "ru": "🖤 Глянцевый чёрный"
  },
  "ANTHRACITE": {
    "en": "ANTHRACITE",
    "ar": "ANTHRACITE",
    "tr": "ANTHRACITE",
    "fr": "ANTHRACITE",
    "ru": "ANTHRACITE"
  },
  "🩶 Anthracite": {
    "en": "🩶 Anthracite",
    "ar": "🩶 أنثراسيت",
    "tr": "🩶 Antrasit",
    "fr": "🩶 Anthracite",
    "ru": "🩶 Антрацит"
  },
  "CHAMPAGNE": {
    "en": "CHAMPAGNE",
    "ar": "CHAMPAGNE",
    "tr": "CHAMPAGNE",
    "fr": "CHAMPAGNE",
    "ru": "CHAMPAGNE"
  },
  "🥂 Champagne": {
    "en": "🥂 Champagne",
    "ar": "🥂 شامبانيا",
    "tr": "🥂 Şampanya",
    "fr": "🥂 Champagne",
    "ru": "🥂 Шампань"
  },
  "GOLD": {
    "en": "GOLD",
    "ar": "GOLD",
    "tr": "GOLD",
    "fr": "GOLD",
    "ru": "GOLD"
  },
  "🥇 Gold": {
    "en": "🥇 Gold",
    "ar": "🥇 ذهبي",
    "tr": "🥇 Altın",
    "fr": "🥇 Or",
    "ru": "🥇 Золотой"
  },
  "SILVER": {
    "en": "SILVER",
    "ar": "SILVER",
    "tr": "SILVER",
    "fr": "SILVER",
    "ru": "SILVER"
  },
  "🪙 Silver": {
    "en": "🪙 Silver",
    "ar": "🪙 فضي",
    "tr": "🪙 Gümüş",
    "fr": "🪙 Argent",
    "ru": "🪙 Серебряный"
  },
  "CREAM": {
    "en": "CREAM",
    "ar": "CREAM",
    "tr": "CREAM",
    "fr": "CREAM",
    "ru": "CREAM"
  },
  "🍦 Cream": {
    "en": "🍦 Cream",
    "ar": "🍦 كريمي",
    "tr": "🍦 Krem",
    "fr": "🍦 Crème",
    "ru": "🍦 Кремовый"
  },
  "BEIGE": {
    "en": "BEIGE",
    "ar": "BEIGE",
    "tr": "BEIGE",
    "fr": "BEIGE",
    "ru": "BEIGE"
  },
  "🏜️ Beige": {
    "en": "🏜️ Beige",
    "ar": "🏜️ بيج",
    "tr": "🏜️ Bej",
    "fr": "🏜️ Beige",
    "ru": "🏜️ Бежевый"
  },
  "GRAY": {
    "en": "GRAY",
    "ar": "GRAY",
    "tr": "GRAY",
    "fr": "GRAY",
    "ru": "GRAY"
  },
  "🩶 Gray": {
    "en": "🩶 Gray",
    "ar": "🩶 رمادي",
    "tr": "🩶 Gri",
    "fr": "🩶 Gris",
    "ru": "🩶 Серый"
  },
  "DARK_GRAY": {
    "en": "DARK_GRAY",
    "ar": "DARK_GRAY",
    "tr": "DARK_GRAY",
    "fr": "DARK_GRAY",
    "ru": "DARK_GRAY"
  },
  "🌑 Dark Gray": {
    "en": "🌑 Dark Gray",
    "ar": "🌑 رمادي غامق",
    "tr": "🌑 Koyu Gri",
    "fr": "🌑 Gris foncé",
    "ru": "🌑 Тёмно-серый"
  },
  "BROWN": {
    "en": "BROWN",
    "ar": "BROWN",
    "tr": "BROWN",
    "fr": "BROWN",
    "ru": "BROWN"
  },
  "🟫 Brown": {
    "en": "🟫 Brown",
    "ar": "🟫 بني",
    "tr": "🟫 Kahverengi",
    "fr": "🟫 Marron",
    "ru": "🟫 Коричневый"
  },
  "DARK_BROWN": {
    "en": "DARK_BROWN",
    "ar": "DARK_BROWN",
    "tr": "DARK_BROWN",
    "fr": "DARK_BROWN",
    "ru": "DARK_BROWN"
  },
  "🌑 Dark Brown": {
    "en": "🌑 Dark Brown",
    "ar": "🌑 بني غامق",
    "tr": "🌑 Koyu Kahverengi",
    "fr": "🌑 Marron foncé",
    "ru": "🌑 Тёмно-коричневый"
  },
  "LACQUERED": {
    "en": "LACQUERED",
    "ar": "LACQUERED",
    "tr": "LACQUERED",
    "fr": "LACQUERED",
    "ru": "LACQUERED"
  },
  "💎 Lacquered Gloss": {
    "en": "💎 Lacquered Gloss",
    "ar": "💎 ملمَّع (لاكيه)",
    "tr": "💎 Parlak Lake",
    "fr": "💎 Laqué brillant",
    "ru": "💎 Глянцевый лак"
  },
  "finish": {
    "en": "finish",
    "ar": "finish",
    "tr": "finish",
    "fr": "finish",
    "ru": "finish"
  },
  "MATTE_LACQUERED": {
    "en": "MATTE_LACQUERED",
    "ar": "MATTE_LACQUERED",
    "tr": "MATTE_LACQUERED",
    "fr": "MATTE_LACQUERED",
    "ru": "MATTE_LACQUERED"
  },
  "🔲 Matte Lacquered": {
    "en": "🔲 Matte Lacquered",
    "ar": "🔲 لاكيه مطفي",
    "tr": "🔲 Mat Lake",
    "fr": "🔲 Laqué mat",
    "ru": "🔲 Матовый лак"
  },
  "BRUSHED": {
    "en": "BRUSHED",
    "ar": "BRUSHED",
    "tr": "BRUSHED",
    "fr": "BRUSHED",
    "ru": "BRUSHED"
  },
  "🪮 Brushed": {
    "en": "🪮 Brushed",
    "ar": "🪮 مصقول (برَّاش)",
    "tr": "🪮 Fırçalı",
    "fr": "🪮 Brossé",
    "ru": "🪮 Брашированный"
  },
  "AGED": {
    "en": "AGED",
    "ar": "AGED",
    "tr": "AGED",
    "fr": "AGED",
    "ru": "AGED"
  },
  "🏺 Aged / Antique": {
    "en": "🏺 Aged / Antique",
    "ar": "🏺 معتَّق (أنتيك)",
    "tr": "🏺 Antika (Eskitme)",
    "fr": "🏺 Vieilli / antique",
    "ru": "🏺 Состаренный / антик"
  },
  "RUSTIC": {
    "en": "RUSTIC",
    "ar": "RUSTIC",
    "tr": "RUSTIC",
    "fr": "RUSTIC",
    "ru": "RUSTIC"
  },
  "🪵 Rustic": {
    "en": "🪵 Rustic",
    "ar": "🪵 ريفي (رستيك)",
    "tr": "🪵 Rustik",
    "fr": "🪵 Rustique",
    "ru": "🪵 Рустикальный"
  },
  "NATURAL": {
    "en": "NATURAL",
    "ar": "NATURAL",
    "tr": "NATURAL",
    "fr": "NATURAL",
    "ru": "NATURAL"
  },
  "🌿 Natural": {
    "en": "🌿 Natural",
    "ar": "🌿 طبيعي",
    "tr": "🌿 Doğal",
    "fr": "🌿 Naturel",
    "ru": "🌿 Натуральный"
  },
  "⭐ Basic Options": {
    "en": "⭐ Basic Options",
    "ar": "⭐ الخيارات الأساسية",
    "tr": "⭐ Temel Seçenekler",
    "fr": "⭐ Options de base",
    "ru": "⭐ Основные варианты"
  },
  "🌰 Walnut Colors": {
    "en": "🌰 Walnut Colors",
    "ar": "🌰 ألوان الجوز",
    "tr": "🌰 Ceviz Renkleri",
    "fr": "🌰 Teintes de noyer",
    "ru": "🌰 Оттенки ореха"
  },
  "🌿 Oak Colors": {
    "en": "🌿 Oak Colors",
    "ar": "🌿 ألوان البلوط",
    "tr": "🌿 Meşe Renkleri",
    "fr": "🌿 Teintes de chêne",
    "ru": "🌿 Оттенки дуба"
  },
  "🌱 Beech Colors": {
    "en": "🌱 Beech Colors",
    "ar": "🌱 ألوان الزان",
    "tr": "🌱 Kayın Renkleri",
    "fr": "🌱 Teintes de hêtre",
    "ru": "🌱 Оттенки бука"
  },
  "🎨 Core Furniture Colors": {
    "en": "🎨 Core Furniture Colors",
    "ar": "🎨 ألوان الموبيليا الأساسية",
    "tr": "🎨 Temel Mobilya Renkleri",
    "fr": "🎨 Couleurs de mobilier",
    "ru": "🎨 Основные цвета мебели"
  },
  "✨ Special Finishes": {
    "en": "✨ Special Finishes",
    "ar": "✨ تشطيبات خاصة",
    "tr": "✨ Özel Yüzeyler",
    "fr": "✨ Finitions spéciales",
    "ru": "✨ Особая отделка"
  },
  "🎨 Select item color (Invoice only)": {
    "en": "🎨 Select item color (Invoice only)",
    "ar": "🎨 اختر لون القطعة (للفاتورة فقط)",
    "tr": "🎨 Ürün rengini seçin (Sadece fatura)",
    "fr": "🎨 Couleur de l’article (uniquement sur la facture)",
    "ru": "🎨 Цвет товара (только в счёте)"
  },
  "Package": {
    "en": "Package",
    "ar": "باكيت",
    "tr": "Paket",
    "fr": "Colis",
    "ru": "Упаковка"
  },
  "Weight kg": {
    "en": "Weight kg",
    "ar": "الوزن كجم",
    "tr": "Ağırlık kg",
    "fr": "Poids (kg)",
    "ru": "Вес (кг)"
  },
  "Delete this package?": {
    "en": "Delete this package?",
    "ar": "حذف هذا الباكيت؟",
    "tr": "Bu paketi sil?",
    "fr": "Supprimer ce colis ?",
    "ru": "Удалить эту упаковку?"
  },
  "⚠️ At least one package must remain": {
    "en": "⚠️ At least one package must remain",
    "ar": "⚠️ يجب أن يبقى باكيت واحد على الأقل",
    "tr": "⚠️ En az bir paket kalmalıdır",
    "fr": "⚠️ Conservez au moins un colis",
    "ru": "⚠️ Должна остаться хотя бы одна упаковка"
  },
  "✏️ Custom": {
    "en": "✏️ Custom",
    "ar": "✏️ مخصص",
    "tr": "✏️ Özel",
    "fr": "✏️ Personnalisé",
    "ru": "✏️ Другой"
  },
  "Type Manually": {
    "en": "Type Manually",
    "ar": "اكتب يدوياً",
    "tr": "Manuel Yaz",
    "fr": "Saisir manuellement",
    "ru": "Ввести вручную"
  },
  "🛋️ Coffee Tables": {
    "en": "🛋️ Coffee Tables",
    "ar": "🛋️ طاولات وسط",
    "tr": "🛋️ Orta Sehpa",
    "fr": "🛋️ Tables basses",
    "ru": "🛋️ Журнальные столики"
  },
  "9403.60.90.90.00": {
    "en": "9403.60.90.90.00",
    "ar": "9403.60.90.90.00",
    "tr": "9403.60.90.90.00",
    "fr": "9403.60.90.90.00",
    "ru": "9403.60.90.90.00"
  },
  "9403.20.80.00.00": {
    "en": "9403.20.80.00.00",
    "ar": "9403.20.80.00.00",
    "tr": "9403.20.80.00.00",
    "fr": "9403.20.80.00.00",
    "ru": "9403.20.80.00.00"
  },
  "9403.89.00.00.00": {
    "en": "9403.89.00.00.00",
    "ar": "9403.89.00.00.00",
    "tr": "9403.89.00.00.00",
    "fr": "9403.89.00.00.00",
    "ru": "9403.89.00.00.00"
  },
  "🪑 Side Tables": {
    "en": "🪑 Side Tables",
    "ar": "🪑 طاولات جانبية",
    "tr": "🪑 Yan Sehpa",
    "fr": "🪑 Tables d’appoint",
    "ru": "🪑 Приставные столики"
  },
  "9403.60.10.00.00": {
    "en": "9403.60.10.00.00",
    "ar": "9403.60.10.00.00",
    "tr": "9403.60.10.00.00",
    "fr": "9403.60.10.00.00",
    "ru": "9403.60.10.00.00"
  },
  "9403.20.20.00.00": {
    "en": "9403.20.20.00.00",
    "ar": "9403.20.20.00.00",
    "tr": "9403.20.20.00.00",
    "fr": "9403.20.20.00.00",
    "ru": "9403.20.20.00.00"
  },
  "📺 TV Tables": {
    "en": "📺 TV Tables",
    "ar": "📺 طاولات تلفزيون",
    "tr": "📺 TV Ünitesi",
    "fr": "📺 Meubles TV",
    "ru": "📺 Тумбы под телевизор"
  },
  "9403.60.30.00.00": {
    "en": "9403.60.30.00.00",
    "ar": "9403.60.30.00.00",
    "tr": "9403.60.30.00.00",
    "fr": "9403.60.30.00.00",
    "ru": "9403.60.30.00.00"
  },
  "9403.60.90.10.00": {
    "en": "9403.60.90.10.00",
    "ar": "9403.60.90.10.00",
    "tr": "9403.60.90.10.00",
    "fr": "9403.60.90.10.00",
    "ru": "9403.60.90.10.00"
  },
  "🪞 Dresser / Console": {
    "en": "🪞 Dresser / Console",
    "ar": "🪞 درسوار / مدخل",
    "tr": "🪞 Dresuar / Konsol",
    "fr": "🪞 Console / meuble avec miroir",
    "ru": "🪞 Консоль / комод с зеркалом"
  },
  "9403.50.00.00.00": {
    "en": "9403.50.00.00.00",
    "ar": "9403.50.00.00.00",
    "tr": "9403.50.00.00.00",
    "fr": "9403.50.00.00.00",
    "ru": "9403.50.00.00.00"
  },
  "9403.60.50.00.00": {
    "en": "9403.60.50.00.00",
    "ar": "9403.60.50.00.00",
    "tr": "9403.60.50.00.00",
    "fr": "9403.60.50.00.00",
    "ru": "9403.60.50.00.00"
  },
  "9403.60.70.00.00": {
    "en": "9403.60.70.00.00",
    "ar": "9403.60.70.00.00",
    "tr": "9403.60.70.00.00",
    "fr": "9403.60.70.00.00",
    "ru": "9403.60.70.00.00"
  },
  "✏️": {
    "en": "✏️",
    "ar": "✏️",
    "tr": "✏️",
    "fr": "✏️",
    "ru": "✏️"
  },
  "SET": {
    "en": "SET",
    "ar": "SET",
    "tr": "SET",
    "fr": "SET",
    "ru": "SET"
  },
  "Set": {
    "en": "Set",
    "ar": "طقم",
    "tr": "Takım",
    "fr": "Ensemble",
    "ru": "Комплект"
  },
  "📦": {
    "en": "📦",
    "ar": "📦",
    "tr": "📦",
    "fr": "📦",
    "ru": "📦"
  },
  "PCS": {
    "en": "PCS",
    "ar": "قطعة",
    "tr": "Parça",
    "fr": "Pièces",
    "ru": "Шт."
  },
  "🔢": {
    "en": "🔢",
    "ar": "🔢",
    "tr": "🔢",
    "fr": "🔢",
    "ru": "🔢"
  },
  "1+2": {
    "en": "1+2",
    "ar": "1+2",
    "tr": "1+2",
    "fr": "1+2",
    "ru": "1+2"
  },
  "🛋️": {
    "en": "🛋️",
    "ar": "🛋️",
    "tr": "🛋️",
    "fr": "🛋️",
    "ru": "🛋️"
  },
  "1+1": {
    "en": "1+1",
    "ar": "1+1",
    "tr": "1+1",
    "fr": "1+1",
    "ru": "1+1"
  },
  "2+2": {
    "en": "2+2",
    "ar": "2+2",
    "tr": "2+2",
    "fr": "2+2",
    "ru": "2+2"
  },
  "2+3": {
    "en": "2+3",
    "ar": "2+3",
    "tr": "2+3",
    "fr": "2+3",
    "ru": "2+3"
  },
  "1+4": {
    "en": "1+4",
    "ar": "1+4",
    "tr": "1+4",
    "fr": "1+4",
    "ru": "1+4"
  },
  "3+2+1": {
    "en": "3+2+1",
    "ar": "3+2+1",
    "tr": "3+2+1",
    "fr": "3+2+1",
    "ru": "3+2+1"
  },
  "3+3": {
    "en": "3+3",
    "ar": "3+3",
    "tr": "3+3",
    "fr": "3+3",
    "ru": "3+3"
  },
  "2+2+1": {
    "en": "2+2+1",
    "ar": "2+2+1",
    "tr": "2+2+1",
    "fr": "2+2+1",
    "ru": "2+2+1"
  },
  "Type HS code...": {
    "en": "Type HS code...",
    "ar": "اكتب كود HS يدوياً...",
    "tr": "HS kodunu yazın...",
    "fr": "Saisir le code SH…",
    "ru": "Введите код ТН ВЭД…"
  },
  "Type description...": {
    "en": "Type description...",
    "ar": "اكتب الوصف يدوياً...",
    "tr": "Açıklama yazın...",
    "fr": "Saisir la description…",
    "ru": "Введите описание…"
  },
  "App storage is full. Export a backup and free device space.": {
    "en": "App storage is full. Export a backup and free device space.",
    "ar": "المساحة المسموح بها لهذا البرنامج ممتلئة. صدّر نسخة احتياطية ووفّر مساحة على الجهاز.",
    "tr": "Uygulamanın depolama kotası doldu. Yedek alıp cihazda yer açın.",
    "fr": "Le stockage est plein. Exportez une sauvegarde et libérez de l’espace sur l’appareil.",
    "ru": "Хранилище приложения заполнено. Экспортируйте копию и освободите место на устройстве."
  },
  "This file viewer blocks storage. Open the app directly in Chrome, outside file preview and private mode.": {
    "en": "This file viewer blocks storage. Open the app directly in Chrome, outside file preview and private mode.",
    "ar": "المتصفح يمنع التخزين في طريقة فتح الملف الحالية. افتح البرنامج مباشرة في Chrome، خارج معاينة الملفات والوضع الخفي.",
    "tr": "Dosyanın açıldığı ortam depolamayı engelliyor. Programı dosya önizlemesi veya gizli mod dışında doğrudan Chrome ile açın.",
    "fr": "Cet aperçu de fichier bloque le stockage. Ouvrez l’application directement dans Chrome, hors aperçu et navigation privée.",
    "ru": "Просмотрщик файлов блокирует хранилище. Откройте приложение в Chrome вне предпросмотра и приватного режима."
  },
  "Close other open copies of WOW, then save again.": {
    "en": "Close other open copies of WOW, then save again.",
    "ar": "أغلق النسخ الأخرى المفتوحة من برنامج WOW، ثم اضغط حفظ مجددًا.",
    "tr": "Diğer açık WOW sekmelerini kapatıp yeniden kaydedin.",
    "fr": "Fermez les autres onglets WOW, puis enregistrez à nouveau.",
    "ru": "Закройте другие вкладки WOW и сохраните снова."
  },
  "Storage disconnected. Try again; reopen the app if it persists.": {
    "en": "Storage disconnected. Try again; reopen the app if it persists.",
    "ar": "انقطع اتصال التخزين. أعد المحاولة؛ وإذا استمر الخطأ أعد فتح البرنامج.",
    "tr": "Depolama bağlantısı kesildi. Tekrar deneyin; sorun sürerse programı yeniden açın.",
    "fr": "Connexion au stockage interrompue. Réessayez ; si le problème persiste, rouvrez l’application.",
    "ru": "Соединение с хранилищем потеряно. Повторите попытку; при повторении откройте приложение заново."
  },
  "Download Excel": {
    "en": "Download Excel",
    "ar": "تنزيل Excel",
    "tr": "Excel İndir",
    "fr": "Télécharger Excel",
    "ru": "Скачать Excel"
  },
  "Share Excel": {
    "en": "Share Excel",
    "ar": "مشاركة Excel",
    "tr": "Excel Paylaş",
    "fr": "Partager Excel",
    "ru": "Поделиться Excel"
  },
  "INVOICE DATA": {
    "en": "INVOICE DATA",
    "ar": "بيانات الفاتورة",
    "tr": "FATURA VERİLERİ",
    "fr": "DONNÉES DE LA FACTURE",
    "ru": "ДАННЫЕ СЧЁТА"
  },
  "Preparing Excel with all invoice pages…": {
    "en": "Preparing Excel with all invoice pages…",
    "ar": "جارٍ تجهيز Excel بكامل صفحات الفاتورة…",
    "tr": "Tüm fatura sayfaları Excel için hazırlanıyor…",
    "fr": "Préparation du fichier Excel avec toutes les pages…",
    "ru": "Подготовка Excel со всеми страницами…"
  },
  "Excel file is ready to share": {
    "en": "Excel file is ready to share",
    "ar": "ملف Excel جاهز للمشاركة",
    "tr": "Excel dosyası paylaşılmaya hazır",
    "fr": "Fichier Excel prêt à partager",
    "ru": "Файл Excel готов к отправке"
  },
  "Excel downloaded. Attach it in your preferred application.": {
    "en": "Excel downloaded. Attach it in your preferred application.",
    "ar": "تم تنزيل ملف Excel؛ يمكنك إرفاقه في التطبيق الذي تريده.",
    "tr": "Excel dosyası indirildi. İstediğiniz uygulamaya ekleyebilirsiniz.",
    "fr": "Excel téléchargé. Joignez-le dans votre application.",
    "ru": "Excel скачан. Прикрепите его в нужном приложении."
  },
  "Excel could not be created. ": {
    "en": "Excel could not be created. ",
    "ar": "تعذّر تجهيز Excel. ",
    "tr": "Excel oluşturulamadı. ",
    "fr": "Création du fichier Excel impossible. ",
    "ru": "Не удалось создать Excel. "
  },
  "Excel: PDF page layout, one worksheet per page, editable cells and automatic totals. Review the amount in words and QR after edits; they do not update automatically.": {
    "en": "Excel: PDF page layout, one worksheet per page, editable cells and automatic totals. Review the amount in words and QR after edits; they do not update automatically.",
    "ar": "Excel بتنسيق صفحات PDF؛ كل صفحة في ورقة، بخلايا قابلة للتعديل ومجاميع تلقائية. راجع المبلغ كتابةً ورمز QR بعد التعديل؛ لا يتحدثان تلقائيًا.",
    "tr": "Excel: PDF sayfa düzeni; her sayfa ayrı bir çalışma sayfasında, düzenlenebilir hücreler ve otomatik toplamlar. Değişiklikten sonra yazıyla tutarı ve QR kodunu kontrol edin; otomatik güncellenmezler.",
    "fr": "Excel : mise en page du PDF, une feuille par page, cellules modifiables et totaux automatiques. Vérifiez le montant en lettres et le QR après modification ; ils ne se mettent pas à jour automatiquement.",
    "ru": "Excel: макет PDF, отдельный лист на страницу, редактируемые ячейки и автоматические итоги. После изменений проверьте сумму прописью и QR: они не обновляются автоматически."
  },
  "PAGE": {
    "en": "PAGE",
    "ar": "صفحة",
    "tr": "SAYFA",
    "fr": "PAGE",
    "ru": "СТРАНИЦА"
  },
  "Choose PDF or Excel, then select an app in the device share sheet": {
    "en": "Choose PDF or Excel, then select an app in the device share sheet",
    "ar": "اختر PDF أو Excel ثم اختر التطبيق من نافذة الجهاز",
    "tr": "PDF veya Excel seçin, sonra cihazın paylaşım penceresinden uygulamayı seçin",
    "fr": "Choisissez PDF ou Excel, puis une application dans la fenêtre de partage de l’appareil",
    "ru": "Выберите PDF или Excel, затем приложение в окне отправки устройства"
  },
  "Original PDF — ready to send or print": {
    "en": "Original PDF — ready to send or print",
    "ar": "PDF الأصلي — جاهز للإرسال والطباعة",
    "tr": "Orijinal PDF — gönderme ve yazdırma için hazır",
    "fr": "PDF original — prêt à envoyer ou imprimer",
    "ru": "Исходный PDF — готов к отправке и печати"
  },
  "Original XLSX — fully editable": {
    "en": "Original XLSX — fully editable",
    "ar": "Excel XLSX الأصلي — قابل للتعديل بالكامل",
    "tr": "Orijinal XLSX — tamamen düzenlenebilir",
    "fr": "XLSX original — entièrement modifiable",
    "ru": "Исходный XLSX — полностью редактируемый"
  },
  "Preparing file…": {
    "en": "Preparing file…",
    "ar": "جاري تجهيز الملف…",
    "tr": "Dosya hazırlanıyor…",
    "fr": "Préparation du fichier…",
    "ru": "Подготовка файла…"
  },
  "XLSX ready to share": {
    "en": "XLSX ready to share",
    "ar": "XLSX جاهز للمشاركة",
    "tr": "XLSX paylaşmaya hazır",
    "fr": "XLSX prêt à partager",
    "ru": "XLSX готов к отправке"
  },
  "Chrome on this device blocks direct XLSX file sharing. The file was not converted to HTML or CSV.": {
    "en": "Chrome on this device blocks direct XLSX file sharing. The file was not converted to HTML or CSV.",
    "ar": "Chrome على هذا الجهاز يمنع مشاركة ملف XLSX مباشرة. لم يتم تحويل الملف إلى HTML أو CSV.",
    "tr": "Bu cihazdaki Chrome XLSX dosyasını doğrudan paylaşmayı engelliyor. Dosya HTML veya CSV biçimine dönüştürülmedi.",
    "fr": "Chrome bloque ici le partage direct de fichiers XLSX. Le fichier n’a pas été converti en HTML ou CSV.",
    "ru": "Chrome на этом устройстве блокирует прямую отправку XLSX. Файл не преобразован в HTML или CSV."
  },
  "Trying another XLSX compatibility mode…": {
    "en": "Trying another XLSX compatibility mode…",
    "ar": "جاري تجربة توافق XLSX آخر…",
    "tr": "Başka bir XLSX uyumluluğu deneniyor…",
    "fr": "Essai d’un autre mode de compatibilité XLSX…",
    "ru": "Проверка другого режима совместимости XLSX…"
  },
  "Could not prepare XLSX": {
    "en": "Could not prepare XLSX",
    "ar": "تعذر تجهيز ملف XLSX",
    "tr": "XLSX hazırlanamadı",
    "fr": "Préparation du XLSX impossible",
    "ru": "Не удалось подготовить XLSX"
  },
  "Excel is shared as a real XLSX only. No HTML/CSV conversion and no automatic download.": {
    "en": "Excel is shared as a real XLSX only. No HTML/CSV conversion and no automatic download.",
    "ar": "Excel هنا XLSX حقيقي فقط. لا يوجد تحويل إلى HTML أو CSV ولا تنزيل تلقائي.",
    "tr": "Excel yalnızca gerçek XLSX olarak paylaşılır. HTML/CSV dönüşümü ve otomatik indirme yoktur.",
    "fr": "Excel est partagé uniquement en véritable XLSX. Aucune conversion HTML/CSV ni aucun téléchargement automatique.",
    "ru": "Excel отправляется только как настоящий XLSX. Без преобразования в HTML/CSV и автоматического скачивания."
  },
  "No invoice is ready to share.": {
    "en": "No invoice is ready to share.",
    "ar": "لا توجد فاتورة جاهزة للمشاركة.",
    "tr": "Paylaşılacak hazır fatura yok.",
    "fr": "Aucune facture prête à partager.",
    "ru": "Нет счёта, готового к отправке."
  },
  "Share / Save invoice": {
    "en": "Share / Save invoice",
    "ar": "مشاركة وحفظ الفاتورة",
    "tr": "Faturayı paylaş / kaydet",
    "fr": "Partager / enregistrer la facture",
    "ru": "Отправить / сохранить счёт"
  },
  "PDF shares directly — Excel downloads to the device": {
    "en": "PDF shares directly — Excel downloads to the device",
    "ar": "PDF للمشاركة مباشرة — Excel يتم تنزيله إلى الجهاز",
    "tr": "PDF doğrudan paylaşılır — Excel cihaza indirilir",
    "fr": "Partage direct du PDF — téléchargement d’Excel sur l’appareil",
    "ru": "PDF отправляется напрямую — Excel скачивается на устройство"
  },
  "Original PDF — direct system share": {
    "en": "Original PDF — direct system share",
    "ar": "PDF الأصلي — مشاركة مباشرة من نافذة الجهاز",
    "tr": "Orijinal PDF — cihaz paylaşım penceresiyle doğrudan paylaşım",
    "fr": "PDF original — partage système direct",
    "ru": "Исходный PDF — прямая отправка через систему"
  },
  "Preparing PDF…": {
    "en": "Preparing PDF…",
    "ar": "جاري تجهيز PDF…",
    "tr": "PDF hazırlanıyor…",
    "fr": "Préparation du PDF…",
    "ru": "Подготовка PDF…"
  },
  "Ready to share": {
    "en": "Ready to share",
    "ar": "جاهز للمشاركة",
    "tr": "Paylaşıma hazır",
    "fr": "Prêt à partager",
    "ru": "Готово к отправке"
  },
  "PDF sharing is unavailable on this device": {
    "en": "PDF sharing is unavailable on this device",
    "ar": "تعذر فتح مشاركة PDF على هذا الجهاز",
    "tr": "Bu cihazda PDF paylaşımı açılamadı",
    "fr": "Partage de PDF indisponible sur cet appareil",
    "ru": "Отправка PDF недоступна на этом устройстве"
  },
  "Editable real XLSX — direct download": {
    "en": "Editable real XLSX — direct download",
    "ar": "Excel XLSX قابل للتعديل — تنزيل مباشر",
    "tr": "Düzenlenebilir gerçek XLSX — doğrudan indirme",
    "fr": "Véritable XLSX modifiable — téléchargement direct",
    "ru": "Настоящий редактируемый XLSX — прямое скачивание"
  },
  "Tap to download to Downloads": {
    "en": "Tap to download to Downloads",
    "ar": "اضغط لتنزيله إلى مجلد التنزيلات",
    "tr": "Downloads klasörüne indirmek için dokunun",
    "fr": "Appuyez pour télécharger dans Téléchargements",
    "ru": "Нажмите для сохранения в «Загрузки»"
  },
  "Preparing the large Excel file…": {
    "en": "Preparing the large Excel file…",
    "ar": "جاري تجهيز ملف Excel الكبير…",
    "tr": "Büyük Excel dosyası hazırlanıyor…",
    "fr": "Préparation du fichier Excel volumineux…",
    "ru": "Подготовка большого файла Excel…"
  },
  "Excel downloaded to the Downloads folder": {
    "en": "Excel downloaded to the Downloads folder",
    "ar": "تم تنزيل ملف Excel في مجلد التنزيلات (Downloads)",
    "tr": "Excel dosyası Downloads klasörüne indirildi",
    "fr": "Excel enregistré dans Téléchargements",
    "ru": "Excel скачан в папку «Загрузки»"
  },
  "For reliable use of the large Excel file on desktop, tablet and phone, the real XLSX is downloaded directly. PDF continues to use the system share sheet.": {
    "en": "For reliable use of the large Excel file on desktop, tablet and phone, the real XLSX is downloaded directly. PDF continues to use the system share sheet.",
    "ar": "لضمان ثبات ملف Excel الكبير على الكمبيوتر والتابلت والهاتف، يتم تنزيل XLSX الحقيقي مباشرة. PDF يبقى للمشاركة النظامية.",
    "tr": "Büyük Excel dosyasının bilgisayar, tablet ve telefonda güvenilir olması için gerçek XLSX doğrudan indirilir. PDF sistem paylaşımıyla açılır.",
    "fr": "Pour un fonctionnement fiable sur ordinateur, tablette et téléphone, le véritable XLSX est téléchargé directement. Le PDF utilise le partage système.",
    "ru": "Для надёжной работы на компьютере, планшете и телефоне XLSX скачивается напрямую. PDF отправляется через системное окно."
  },
  "No invoice is ready.": {
    "en": "No invoice is ready.",
    "ar": "لا توجد فاتورة جاهزة.",
    "tr": "Hazır fatura yok.",
    "fr": "Aucune facture prête.",
    "ru": "Нет готового счёта."
  },
  "Excel was downloaded to the Downloads folder. The first worksheet contains the WOW official notice; the editable invoice starts on the next worksheet.": {
    "en": "Excel was downloaded to the Downloads folder. The first worksheet contains the WOW official notice; the editable invoice starts on the next worksheet.",
    "ar": "تم تنزيل ملف Excel في مجلد التنزيلات (Downloads). الصفحة الأولى تحتوي على تنبيه WOW الرسمي، والفاتورة تبدأ من الورقة التالية.",
    "tr": "Excel dosyası Downloads klasörüne indirildi. İlk sayfada WOW resmî bilgi notu vardır; fatura sonraki çalışma sayfasından başlar.",
    "fr": "Excel enregistré dans Téléchargements. La première feuille contient l’avis officiel WOW ; la facture modifiable commence sur la suivante.",
    "ru": "Excel скачан в «Загрузки». Первый лист содержит официальное уведомление WOW, редактируемый счёт начинается со следующего листа."
  },
  "Excel could not be downloaded.": {
    "en": "Excel could not be downloaded.",
    "ar": "تعذر تنزيل ملف Excel.",
    "tr": "Excel dosyası indirilemedi.",
    "fr": "Téléchargement d’Excel impossible.",
    "ru": "Не удалось скачать Excel."
  },
  "Send invoice": {
    "en": "Send invoice",
    "ar": "إرسال الفاتورة",
    "tr": "Faturayı gönder",
    "fr": "Envoyer la facture",
    "ru": "Отправить счёт"
  },
  "Choose the original or a review copy before approval": {
    "en": "Choose the original or a review copy before approval",
    "ar": "اختر النسخة الأصلية أو نسخة المراجعة قبل الاعتماد",
    "tr": "Onaydan önce orijinal veya kontrol kopyasını seçin",
    "fr": "Choisissez l’original ou une copie de vérification avant validation",
    "ru": "Выберите оригинал или копию для проверки до утверждения"
  },
  "Direct share through the device share sheet": {
    "en": "Direct share through the device share sheet",
    "ar": "مشاركة مباشرة من نافذة الجهاز",
    "tr": "Cihazın paylaşım penceresiyle doğrudan paylaşım",
    "fr": "Partage direct via la fenêtre système de l’appareil",
    "ru": "Прямая отправка через системное окно устройства"
  },
  "Real editable XLSX — download": {
    "en": "Real editable XLSX — download",
    "ar": "ملف XLSX حقيقي قابل للتعديل — تنزيل",
    "tr": "Gerçek ve düzenlenebilir XLSX — indirme",
    "fr": "Véritable XLSX modifiable — téléchargement",
    "ru": "Настоящий редактируемый XLSX — скачивание"
  },
  "ORIGINAL": {
    "en": "ORIGINAL",
    "ar": "النسخة الأصلية",
    "tr": "ORİJİNAL",
    "fr": "ORIGINAL",
    "ru": "ОРИГИНАЛ"
  },
  "Clean final copy": {
    "en": "Clean final copy",
    "ar": "نهائية ونظيفة",
    "tr": "Temiz nihai kopya",
    "fr": "Copie finale sans filigrane",
    "ru": "Чистовая копия"
  },
  "No review watermark": {
    "en": "No review watermark",
    "ar": "بدون علامة مراجعة",
    "tr": "Kontrol işareti yok",
    "fr": "Sans filigrane de vérification",
    "ru": "Без отметки проверки"
  },
  "REVIEW COPY": {
    "en": "REVIEW COPY",
    "ar": "نسخة للمراجعة",
    "tr": "KONTROL KOPYASI",
    "fr": "COPIE POUR VÉRIFICATION",
    "ru": "КОПИЯ ДЛЯ ПРОВЕРКИ"
  },
  "Transparent mark — not final": {
    "en": "Transparent mark — not final",
    "ar": "بعلامة شفافة — غير نهائية",
    "tr": "Şeffaf işaretli — nihai değildir",
    "fr": "Filigrane transparent — non définitif",
    "ru": "Прозрачная отметка — не окончательный вариант"
  },
  "NOT FINAL": {
    "en": "NOT FINAL",
    "ar": "غير نهائية",
    "tr": "NİHAİ DEĞİLDİR",
    "fr": "NON DÉFINITIF",
    "ru": "НЕ ОКОНЧАТЕЛЬНЫЙ ВАРИАНТ"
  },
  "FOR REVIEW BEFORE APPROVAL": {
    "en": "FOR REVIEW BEFORE APPROVAL",
    "ar": "للمراجعة فقط قبل الاعتماد",
    "tr": "ONAY ÖNCESİ KONTROL İÇİNDİR",
    "fr": "POUR VÉRIFICATION AVANT VALIDATION",
    "ru": "ДЛЯ ПРОВЕРКИ ДО УТВЕРЖДЕНИЯ"
  },
  "Ready": {
    "en": "Ready",
    "ar": "جاهز",
    "tr": "Hazır",
    "fr": "Prêt",
    "ru": "Готово"
  },
  "Download": {
    "en": "Download",
    "ar": "تنزيل",
    "tr": "İndir",
    "fr": "Télécharger",
    "ru": "Скачать"
  },
  "Preparing Excel…": {
    "en": "Preparing Excel…",
    "ar": "جاري تجهيز Excel…",
    "tr": "Excel hazırlanıyor…",
    "fr": "Préparation d’Excel…",
    "ru": "Подготовка Excel…"
  },
  "File downloaded to Downloads": {
    "en": "File downloaded to Downloads",
    "ar": "تم تنزيل الملف إلى Downloads",
    "tr": "Dosya Downloads klasörüne indirildi",
    "fr": "Fichier enregistré dans Téléchargements",
    "ru": "Файл скачан в «Загрузки»"
  },
  "Excel file could not be created": {
    "en": "Excel file could not be created",
    "ar": "تعذر إنشاء ملف Excel",
    "tr": "Excel dosyası oluşturulamadı",
    "fr": "Création d’Excel impossible",
    "ru": "Не удалось создать файл Excel"
  },
  "Send the review copy first when the buyer may request changes to price, images or data; send the clean original after approval.": {
    "en": "Send the review copy first when the buyer may request changes to price, images or data; send the clean original after approval.",
    "ar": "أرسل نسخة المراجعة للمشتري أولاً عند الحاجة إلى تصحيح سعر أو صورة أو بيانات، ثم أرسل النسخة الأصلية بعد الاعتماد.",
    "tr": "Fiyat, görsel veya veri düzeltmeleri gerekiyorsa önce kontrol kopyasını alıcıya gönderin; onaydan sonra orijinal kopyayı gönderin.",
    "fr": "Envoyez d’abord la copie de vérification si l’acheteur peut demander des modifications de prix, d’images ou de données ; envoyez l’original après validation.",
    "ru": "Сначала отправьте копию для проверки, если покупатель может изменить цены, изображения или данные; после утверждения отправьте оригинал."
  },
  "Invoices, payments and running balance": {
    "en": "Invoices, payments and running balance",
    "fr": "Factures, paiements et évolution du solde",
    "ru": "Счета, платежи и текущий остаток",
    "ar": "الفواتير والدفعات وحركة الرصيد",
    "tr": "Faturalar, ödemeler ve bakiye hareketleri"
  },
  "Client": {
    "en": "Client",
    "fr": "Client",
    "ru": "Клиент",
    "ar": "العميل",
    "tr": "Müşteri"
  },
  "From date": {
    "en": "From date",
    "fr": "Date de début",
    "ru": "Начальная дата",
    "ar": "من تاريخ",
    "tr": "Başlangıç"
  },
  "To date": {
    "en": "To date",
    "fr": "Date de fin",
    "ru": "Конечная дата",
    "ar": "إلى تاريخ",
    "tr": "Bitiş"
  },
  "Period": {
    "en": "Period",
    "fr": "Période",
    "ru": "Период",
    "ar": "الفترة",
    "tr": "Dönem"
  },
  "All records": {
    "en": "All records",
    "fr": "Tout l’historique",
    "ru": "Все записи",
    "ar": "كل السجل",
    "tr": "Tüm kayıtlar"
  },
  "This month": {
    "en": "This month",
    "fr": "Ce mois-ci",
    "ru": "Этот месяц",
    "ar": "هذا الشهر",
    "tr": "Bu ay"
  },
  "Last 30 days": {
    "en": "Last 30 days",
    "fr": "Les 30 derniers jours",
    "ru": "Последние 30 дней",
    "ar": "آخر 30 يومًا",
    "tr": "Son 30 gün"
  },
  "Custom period": {
    "en": "Custom period",
    "fr": "Période personnalisée",
    "ru": "Выбранный период",
    "ar": "فترة محددة",
    "tr": "Özel dönem"
  },
  "Invoice currency": {
    "en": "Invoice currency",
    "fr": "Devise des factures",
    "ru": "Валюта счетов",
    "ar": "عملة الفواتير",
    "tr": "Fatura para birimi"
  },
  "All currencies": {
    "en": "All currencies",
    "fr": "Toutes les devises",
    "ru": "Все валюты",
    "ar": "جميع العملات",
    "tr": "Tüm para birimleri"
  },
  "Statement and export language": {
    "en": "Statement and export language",
    "fr": "Langue du relevé et de l’export",
    "ru": "Язык выписки и экспорта",
    "ar": "لغة الكشف والتصدير",
    "tr": "Ekstre ve dışa aktarım dili"
  },
  "Preview PDF": {
    "en": "Preview PDF",
    "fr": "Aperçu PDF",
    "ru": "Предпросмотр PDF",
    "ar": "معاينة PDF",
    "tr": "PDF önizleme"
  },
  "Share PDF": {
    "en": "Share PDF",
    "fr": "Partager le PDF",
    "ru": "Поделиться PDF",
    "ar": "مشاركة PDF",
    "tr": "PDF paylaş"
  },
  "Include item details in PDF": {
    "en": "Include item details in PDF",
    "fr": "Inclure le détail des articles dans le PDF",
    "ru": "Включить сведения о товарах в PDF",
    "ar": "تضمين تفاصيل الأصناف في PDF",
    "tr": "PDF içine ürün ayrıntılarını ekle"
  },
  "Account movements": {
    "en": "Account movements",
    "fr": "Mouvements du compte",
    "ru": "Движение по счёту",
    "ar": "حركة الحساب",
    "tr": "Hesap hareketleri"
  },
  "Summary and checks": {
    "en": "Summary and checks",
    "fr": "Résumé et vérifications",
    "ru": "Сводка и проверка",
    "ar": "ملخص وتدقيق",
    "tr": "Özet ve kontrol"
  },
  "Opening balance": {
    "en": "Opening balance",
    "fr": "Solde initial",
    "ru": "Начальный остаток",
    "ar": "الرصيد الافتتاحي",
    "tr": "Açılış bakiyesi"
  },
  "Period invoices": {
    "en": "Period invoices",
    "fr": "Factures de la période",
    "ru": "Счета за период",
    "ar": "فواتير الفترة",
    "tr": "Dönem faturaları"
  },
  "Period receipts": {
    "en": "Period receipts",
    "fr": "Encaissements de la période",
    "ru": "Поступления за период",
    "ar": "دفعات الفترة",
    "tr": "Dönem ödemeleri"
  },
  "Closing balance": {
    "en": "Closing balance",
    "fr": "Solde final",
    "ru": "Конечный остаток",
    "ar": "الرصيد الختامي",
    "tr": "Kapanış bakiyesi"
  },
  "Accounting basis: USD": {
    "en": "Accounting basis: USD",
    "fr": "Base comptable : USD",
    "ru": "Валюта учёта: USD",
    "ar": "الأساس المحاسبي: USD",
    "tr": "Muhasebe temeli: USD"
  },
  "Due from client": {
    "en": "Due from client",
    "fr": "Dû par le client",
    "ru": "Долг клиента",
    "ar": "مستحق على العميل",
    "tr": "Müşteriden alacak"
  },
  "Credit in client’s favor": {
    "en": "Credit in client’s favor",
    "fr": "Solde en faveur du client",
    "ru": "Остаток в пользу клиента",
    "ar": "رصيد لصالح العميل",
    "tr": "Müşteri lehine bakiye"
  },
  "Account settled": {
    "en": "Account settled",
    "fr": "Compte soldé",
    "ru": "Расчёты завершены",
    "ar": "الحساب مسدد",
    "tr": "Hesap kapalı"
  },
  "Reference": {
    "en": "Reference",
    "fr": "Référence",
    "ru": "Основание",
    "ar": "المرجع",
    "tr": "Referans"
  },
  "Debit USD": {
    "en": "Debit USD",
    "fr": "Débit USD",
    "ru": "Дебет USD",
    "ar": "مدين USD",
    "tr": "Borç USD"
  },
  "Credit USD": {
    "en": "Credit USD",
    "fr": "Crédit USD",
    "ru": "Кредит USD",
    "ar": "دائن USD",
    "tr": "Alacak USD"
  },
  "Balance USD": {
    "en": "Balance USD",
    "fr": "Solde USD",
    "ru": "Остаток USD",
    "ar": "الرصيد USD",
    "tr": "Bakiye USD"
  },
  "Credit note": {
    "en": "Credit note",
    "fr": "Avoir",
    "ru": "Кредитовое уведомление",
    "ar": "إشعار دائن",
    "tr": "Alacak belgesi"
  },
  "Refund to client": {
    "en": "Refund to client",
    "fr": "Remboursement au client",
    "ru": "Возврат клиенту",
    "ar": "مبلغ معاد للعميل",
    "tr": "Müşteriye iade"
  },
  "Payment on account": {
    "en": "Payment on account",
    "fr": "Paiement sur compte",
    "ru": "Платёж на счёт",
    "ar": "دفعة على الحساب",
    "tr": "Hesaba ödeme"
  },
  "Payment method": {
    "en": "Payment method",
    "fr": "Mode de paiement",
    "ru": "Способ оплаты",
    "ar": "طريقة الدفع",
    "tr": "Ödeme yöntemi"
  },
  "Original amount": {
    "en": "Original amount",
    "fr": "Montant d’origine",
    "ru": "Исходная сумма",
    "ar": "المبلغ الأصلي",
    "tr": "Asıl tutar"
  },
  "Original currency": {
    "en": "Original currency",
    "fr": "Devise d’origine",
    "ru": "Исходная валюта",
    "ar": "العملة الأصلية",
    "tr": "Asıl para birimi"
  },
  "Amount USD": {
    "en": "Amount USD",
    "fr": "Montant USD",
    "ru": "Сумма USD",
    "ar": "القيمة USD",
    "tr": "Tutar USD"
  },
  "Invoice no.": {
    "en": "Invoice no.",
    "fr": "N° de facture",
    "ru": "Номер счёта",
    "ar": "رقم الفاتورة",
    "tr": "Fatura no"
  },
  "Subtotal USD": {
    "en": "Subtotal USD",
    "fr": "Sous-total USD",
    "ru": "Промежуточный итог USD",
    "ar": "المجموع الفرعي USD",
    "tr": "Ara toplam USD"
  },
  "Discount USD": {
    "en": "Discount USD",
    "fr": "Remise USD",
    "ru": "Скидка USD",
    "ar": "الخصم USD",
    "tr": "İndirim USD"
  },
  "Tax USD": {
    "en": "Tax USD",
    "fr": "Taxe USD",
    "ru": "Налог USD",
    "ar": "الضريبة USD",
    "tr": "Vergi USD"
  },
  "Invoice total USD": {
    "en": "Invoice total USD",
    "fr": "Total de la facture USD",
    "ru": "Сумма счёта USD",
    "ar": "إجمالي الفاتورة USD",
    "tr": "Fatura toplamı USD"
  },
  "Paid through period end USD": {
    "en": "Paid through period end USD",
    "fr": "Payé jusqu’à la fin de période USD",
    "ru": "Оплачено на конец периода USD",
    "ar": "المدفوع حتى نهاية الفترة USD",
    "tr": "Dönem sonuna kadar ödenen USD"
  },
  "Recorded deposit USD": {
    "en": "Recorded deposit USD",
    "fr": "Acompte enregistré USD",
    "ru": "Учтённый аванс USD",
    "ar": "العربون المسجل USD",
    "tr": "Kayıtlı peşinat USD"
  },
  "Invoice age (days)": {
    "en": "Invoice age (days)",
    "fr": "Ancienneté de la facture (jours)",
    "ru": "Возраст счёта (дней)",
    "ar": "عمر الفاتورة بالأيام",
    "tr": "Fatura yaşı (gün)"
  },
  "Payment due date": {
    "en": "Payment due date",
    "fr": "Échéance de paiement",
    "ru": "Срок оплаты",
    "ar": "تاريخ استحقاق الدفع",
    "tr": "Ödeme vadesi"
  },
  "Overdue days": {
    "en": "Overdue days",
    "fr": "Jours de retard",
    "ru": "Дней просрочки",
    "ar": "أيام التأخير",
    "tr": "Gecikme (gün)"
  },
  "Status": {
    "en": "Status",
    "fr": "État",
    "ru": "Статус",
    "ar": "الحالة",
    "tr": "Durum"
  },
  "Archived": {
    "en": "Archived",
    "fr": "Archivée",
    "ru": "В архиве",
    "ar": "مؤرشفة",
    "tr": "Arşivlenmiş"
  },
  "Delivered": {
    "en": "Delivered",
    "fr": "Livrée",
    "ru": "Доставлен",
    "ar": "مسلّمة",
    "tr": "Teslim edilmiş"
  },
  "Active": {
    "en": "Active",
    "fr": "Active",
    "ru": "Активен",
    "ar": "قائمة",
    "tr": "Aktif"
  },
  "Not recorded": {
    "en": "Not recorded",
    "fr": "Non enregistré",
    "ru": "Не записано",
    "ar": "غير مسجل",
    "tr": "Kaydedilmedi"
  },
  "Not calculated": {
    "en": "Not calculated",
    "fr": "Non calculé",
    "ru": "Не рассчитано",
    "ar": "غير محسوب",
    "tr": "Hesaplanmadı"
  },
  "Reference date": {
    "en": "Reference date",
    "fr": "Date indicative",
    "ru": "Ориентировочная дата",
    "ar": "التاريخ مرجعي",
    "tr": "Referans tarih"
  },
  "No movements match this period.": {
    "en": "No movements match this period.",
    "fr": "Aucun mouvement pour cette période.",
    "ru": "За этот период операций нет.",
    "ar": "لا توجد حركات مطابقة لهذه الفترة.",
    "tr": "Bu döneme uyan hareket yok."
  },
  "No invoices are recorded for this client.": {
    "en": "No invoices are recorded for this client.",
    "fr": "Aucune facture enregistrée pour ce client.",
    "ru": "Для этого клиента счетов нет.",
    "ar": "لا توجد فواتير مسجلة لهذا العميل.",
    "tr": "Bu müşteri için kayıtlı fatura yok."
  },
  "No payments recorded through period end.": {
    "en": "No payments recorded through period end.",
    "fr": "Aucun paiement enregistré jusqu’à la fin de période.",
    "ru": "До конца периода платежей нет.",
    "ar": "لا توجد دفعات مسجلة حتى نهاية الفترة.",
    "tr": "Dönem sonuna kadar kayıtlı ödeme yok."
  },
  "Add a client before opening a statement.": {
    "en": "Add a client before opening a statement.",
    "fr": "Ajoutez un client avant d’ouvrir un relevé.",
    "ru": "Добавьте клиента перед открытием выписки.",
    "ar": "أضف عميلًا أولًا لعرض كشفه.",
    "tr": "Ekstre için önce bir müşteri ekleyin."
  },
  "Next": {
    "en": "Next",
    "fr": "Suivant",
    "ru": "Далее",
    "ar": "التالي",
    "tr": "Sonraki"
  },
  "Previous": {
    "en": "Previous",
    "fr": "Précédent",
    "ru": "Назад",
    "ar": "السابق",
    "tr": "Önceki"
  },
  "Exports include every row, not just the displayed page.": {
    "en": "Exports include every row, not just the displayed page.",
    "fr": "L’export comprend toutes les lignes, pas seulement la page affichée.",
    "ru": "Экспорт включает все строки, а не только текущую страницу.",
    "ar": "التصدير يشمل كل الصفوف، وليس الصفحة المعروضة فقط.",
    "tr": "Dışa aktarım yalnızca görünen sayfayı değil tüm satırları içerir."
  },
  "rows": {
    "en": "rows",
    "fr": "lignes",
    "ru": "строк",
    "ar": "صفوف",
    "tr": "satır"
  },
  "Items": {
    "en": "Items",
    "fr": "Articles",
    "ru": "Товары",
    "ar": "الأصناف",
    "tr": "Ürünler"
  },
  "Item": {
    "en": "Item",
    "fr": "Article",
    "ru": "Товар",
    "ar": "الصنف",
    "tr": "Ürün"
  },
  "Quantity": {
    "en": "Quantity",
    "fr": "Quantité",
    "ru": "Количество",
    "ar": "الكمية",
    "tr": "Adet"
  },
  "Unit price USD": {
    "en": "Unit price USD",
    "fr": "Prix unitaire USD",
    "ru": "Цена за единицу USD",
    "ar": "سعر الوحدة USD",
    "tr": "Birim fiyat USD"
  },
  "Total USD": {
    "en": "Total USD",
    "fr": "Total USD",
    "ru": "Итого USD",
    "ar": "المجموع USD",
    "tr": "Toplam USD"
  },
  "Product / HS code": {
    "en": "Product / HS code",
    "fr": "Code produit / SH",
    "ru": "Код товара / ТН ВЭД",
    "ar": "رمز الصنف / HS",
    "tr": "Ürün / HS kodu"
  },
  "Unit volume m³": {
    "en": "Unit volume m³",
    "fr": "Volume unitaire m³",
    "ru": "Объём единицы м³",
    "ar": "حجم الوحدة m³",
    "tr": "Birim hacim m³"
  },
  "Unit weight kg": {
    "en": "Unit weight kg",
    "fr": "Poids unitaire kg",
    "ru": "Вес единицы кг",
    "ar": "وزن الوحدة kg",
    "tr": "Birim ağırlık kg"
  },
  "Total volume m³": {
    "en": "Total volume m³",
    "fr": "Volume total m³",
    "ru": "Общий объём м³",
    "ar": "الحجم الإجمالي m³",
    "tr": "Toplam hacim m³"
  },
  "Total weight kg": {
    "en": "Total weight kg",
    "fr": "Poids total kg",
    "ru": "Общий вес кг",
    "ar": "الوزن الإجمالي kg",
    "tr": "Toplam ağırlık kg"
  },
  "Loading date": {
    "en": "Loading date",
    "fr": "Date de chargement",
    "ru": "Дата погрузки",
    "ar": "تاريخ التحميل",
    "tr": "Yükleme tarihi"
  },
  "Delivery date": {
    "en": "Delivery date",
    "fr": "Date de livraison",
    "ru": "Дата доставки",
    "ar": "تاريخ التسليم",
    "tr": "Teslim tarihi"
  },
  "Price tier": {
    "en": "Price tier",
    "fr": "Catégorie de prix",
    "ru": "Категория цены",
    "ar": "درجة التسعير",
    "tr": "Fiyat kademesi"
  },
  "Plate": {
    "en": "Plate",
    "fr": "Immatriculation",
    "ru": "Номерной знак",
    "ar": "رقم اللوحة",
    "tr": "Plaka"
  },
  "Truck": {
    "en": "Truck",
    "fr": "Camion",
    "ru": "Грузовик",
    "ar": "الشاحنة",
    "tr": "Kamyon"
  },
  "Invoice total in its own currency": {
    "en": "Invoice total in its own currency",
    "fr": "Total dans la devise de la facture",
    "ru": "Сумма счёта в его валюте",
    "ar": "إجمالي الفاتورة بعملتها",
    "tr": "Faturanın kendi para birimindeki toplamı"
  },
  "Period refunds": {
    "en": "Period refunds",
    "fr": "Remboursements de la période",
    "ru": "Возвраты за период",
    "ar": "مبالغ معادة خلال الفترة",
    "tr": "Dönem iadeleri"
  },
  "Period credit notes": {
    "en": "Period credit notes",
    "fr": "Avoirs de la période",
    "ru": "Кредитовые уведомления за период",
    "ar": "إشعارات دائنة خلال الفترة",
    "tr": "Dönem alacak belgeleri"
  },
  "Period invoice count": {
    "en": "Period invoice count",
    "fr": "Nombre de factures de la période",
    "ru": "Количество счетов за период",
    "ar": "عدد فواتير الفترة",
    "tr": "Dönem fatura sayısı"
  },
  "Payment movement count": {
    "en": "Payment movement count",
    "fr": "Nombre de mouvements de paiement",
    "ru": "Количество платёжных операций",
    "ar": "عدد حركات الدفع",
    "tr": "Ödeme hareket sayısı"
  },
  "Receivables aging by recorded payment due date": {
    "en": "Receivables aging by recorded payment due date",
    "fr": "Ancienneté des créances selon les échéances enregistrées",
    "ru": "Возраст долга по записанным срокам оплаты",
    "ar": "تحليل المستحقات حسب تاريخ الاستحقاق المسجل",
    "tr": "Kayıtlı vadeye göre alacak yaşlandırma"
  },
  "Not yet due": {
    "en": "Not yet due",
    "fr": "Non échu",
    "ru": "Срок не наступил",
    "ar": "لم تستحق بعد",
    "tr": "Vadesi gelmedi"
  },
  "1–30 days overdue": {
    "en": "1–30 days overdue",
    "fr": "Retard de 1 à 30 jours",
    "ru": "Просрочка 1–30 дней",
    "ar": "متأخرة 1–30 يومًا",
    "tr": "1–30 gün gecikmiş"
  },
  "31–60 days overdue": {
    "en": "31–60 days overdue",
    "fr": "Retard de 31 à 60 jours",
    "ru": "Просрочка 31–60 дней",
    "ar": "متأخرة 31–60 يومًا",
    "tr": "31–60 gün gecikmiş"
  },
  "Over 60 days overdue": {
    "en": "Over 60 days overdue",
    "fr": "Retard de plus de 60 jours",
    "ru": "Просрочка более 60 дней",
    "ar": "متأخرة أكثر من 60 يومًا",
    "tr": "60 günden fazla gecikmiş"
  },
  "No due date": {
    "en": "No due date",
    "fr": "Sans échéance",
    "ru": "Без срока оплаты",
    "ar": "دون تاريخ استحقاق",
    "tr": "Vade tarihi yok"
  },
  "Statement needs review": {
    "en": "Statement needs review",
    "fr": "Relevé à vérifier",
    "ru": "Выписка требует проверки",
    "ar": "كشف يحتاج مراجعة",
    "tr": "Kontrol gerektiren ekstre"
  },
  "Review the notices below. An incomplete or estimated-conversion balance is not presented as a confirmed balance.": {
    "en": "Review the notices below. An incomplete or estimated-conversion balance is not presented as a confirmed balance.",
    "fr": "Consultez les avertissements ci-dessous. Un solde incomplet ou converti de façon estimative n’est pas présenté comme confirmé.",
    "ru": "Проверьте уведомления ниже. Неполный остаток или остаток с оценочным пересчётом не считается подтверждённым.",
    "ar": "راجع التنبيهات أدناه. لا يُقدَّم الرصيد الناقص أو المحوّل تقديريًا كرصيد مؤكد.",
    "tr": "Aşağıdaki uyarıları inceleyin. Eksik veya tahmini kurla hesaplanan bakiye kesin bakiye değildir."
  },
  "Balance calculated from available data": {
    "en": "Balance calculated from available data",
    "fr": "Solde calculé à partir des données disponibles",
    "ru": "Остаток по имеющимся данным",
    "ar": "الرصيد المحسوب من البيانات المتاحة",
    "tr": "Mevcut verilere göre hesaplanan bakiye"
  },
  "Data checks": {
    "en": "Data checks",
    "fr": "Vérification des données",
    "ru": "Проверка данных",
    "ar": "ملاحظات التدقيق",
    "tr": "Kontrol notları"
  },
  "No notices for the data read.": {
    "en": "No notices for the data read.",
    "fr": "Aucun avertissement sur les données lues.",
    "ru": "Предупреждений по прочитанным данным нет.",
    "ar": "لا توجد تنبيهات على البيانات المقروءة.",
    "tr": "Okunan veriler için uyarı yok."
  },
  "Amounts are consolidated using the program’s recorded USD basis. Original payment currencies are shown separately. Today’s exchange rate is never used to revalue historical payments.": {
    "en": "Amounts are consolidated using the program’s recorded USD basis. Original payment currencies are shown separately. Today’s exchange rate is never used to revalue historical payments.",
    "fr": "Les montants sont regroupés selon les valeurs USD enregistrées. Les devises d’origine des paiements sont affichées séparément. Le taux actuel ne sert jamais à réévaluer les anciens paiements.",
    "ru": "Суммы объединяются по сохранённым значениям в USD. Исходные валюты платежей показаны отдельно. Текущий курс не используется для пересчёта прошлых платежей.",
    "ar": "تُجمع المبالغ على أساس الدولار المحفوظ في البرنامج. تظهر عملة الدفعة الأصلية منفصلة، ولا يُستخدم سعر الصرف الحالي لإعادة تقييم الدفعات القديمة.",
    "tr": "Tutarlar programdaki kayıtlı USD temeline göre toplanır. Ödemenin asıl para birimi ayrıca gösterilir. Eski ödemeler bugünkü kurla yeniden değerlenmez."
  },
  "Archived invoices are included. Entered names and notes remain as recorded and are not automatically translated.": {
    "en": "Archived invoices are included. Entered names and notes remain as recorded and are not automatically translated.",
    "fr": "Les factures archivées sont incluses. Les noms et notes saisis restent inchangés et ne sont pas traduits automatiquement.",
    "ru": "Архивные счета включены. Введённые имена и примечания сохраняются без автоматического перевода.",
    "ar": "يشمل الكشف الفواتير المؤرشفة. الأسماء والملاحظات المدخلة تبقى كما سُجلت ولا تُترجم تلقائيًا.",
    "tr": "Arşivlenen faturalar dahildir. Girilen adlar ve notlar kaydedildiği gibi kalır; otomatik çevrilmez."
  },
  "The deposit is a total field on the invoice, not a separate dated receipt. Where no deposit date exists, the invoice date is used as a flagged reference.": {
    "en": "The deposit is a total field on the invoice, not a separate dated receipt. Where no deposit date exists, the invoice date is used as a flagged reference.",
    "fr": "L’acompte est un champ global de la facture, pas un encaissement daté distinct. Sans date d’acompte, la date de facture est utilisée avec un avertissement.",
    "ru": "Аванс — итоговое поле счёта, а не отдельное датированное поступление. При отсутствии даты аванса используется дата счёта с предупреждением.",
    "ar": "العربون حقل إجمالي في الفاتورة، وليس سجلًا مستقلًا بتاريخ مؤكد؛ عند غياب تاريخه يُستخدم تاريخ الفاتورة مع تنبيه.",
    "tr": "Peşinat fatura üzerindeki toplam alandır; kesin tarihli ayrı bir kayıt değildir. Tarihi yoksa fatura tarihi referans alınır ve uyarı verilir."
  },
  "Through": {
    "en": "Through",
    "fr": "Jusqu’au",
    "ru": "По дату",
    "ar": "حتى",
    "tr": "İtibarıyla"
  },
  "Issued at": {
    "en": "Issued at",
    "fr": "Émis le",
    "ru": "Дата выпуска",
    "ar": "تاريخ الإصدار",
    "tr": "Oluşturulma tarihi"
  },
  "Page": {
    "en": "Page",
    "fr": "Page",
    "ru": "Страница",
    "ar": "صفحة",
    "tr": "Sayfa"
  },
  "of": {
    "en": "of",
    "fr": "sur",
    "ru": "из",
    "ar": "من",
    "tr": "/"
  },
  "Summary": {
    "en": "Summary",
    "fr": "Résumé",
    "ru": "Сводка",
    "ar": "الملخص",
    "tr": "Özet"
  },
  "Conversion source": {
    "en": "Conversion source",
    "fr": "Source de conversion",
    "ru": "Источник пересчёта",
    "ar": "مصدر التحويل",
    "tr": "Kur kaynağı"
  },
  "Rate saved with payment": {
    "en": "Rate saved with payment",
    "fr": "Taux enregistré avec le paiement",
    "ru": "Курс, сохранённый с платежом",
    "ar": "سعر محفوظ مع الدفعة",
    "tr": "Ödemeyle kayıtlı kur"
  },
  "Invoice rate — estimated for payment": {
    "en": "Invoice rate — estimated for payment",
    "fr": "Taux de facture — estimation pour le paiement",
    "ru": "Курс счёта — оценка для платежа",
    "ar": "سعر الفاتورة — تقديري للدفعة",
    "tr": "Fatura kuru — ödeme için tahmini"
  },
  "Recorded USD amount": {
    "en": "Recorded USD amount",
    "fr": "Montant USD enregistré",
    "ru": "Сохранённая сумма USD",
    "ar": "قيمة دولار محفوظة",
    "tr": "Kayıtlı USD tutarı"
  },
  "Source": {
    "en": "Source",
    "fr": "Source",
    "ru": "Источник",
    "ar": "المصدر",
    "tr": "Kaynak"
  },
  "Payment store": {
    "en": "Payment store",
    "fr": "Registre des paiements",
    "ru": "Журнал платежей",
    "ar": "سجل الدفعات",
    "tr": "Ödeme kayıtları"
  },
  "Invoice payment snapshot": {
    "en": "Invoice payment snapshot",
    "fr": "Paiements inclus dans la facture",
    "ru": "Платежи внутри счёта",
    "ar": "الدفعات داخل الفاتورة",
    "tr": "Fatura içindeki ödemeler"
  },
  "In period": {
    "en": "In period",
    "fr": "Dans la période",
    "ru": "В периоде",
    "ar": "ضمن الفترة",
    "tr": "Dönem içinde"
  },
  "Yes": {
    "en": "Yes",
    "fr": "Oui",
    "ru": "Да",
    "ar": "نعم",
    "tr": "Evet"
  },
  "No": {
    "en": "No",
    "fr": "Non",
    "ru": "Нет",
    "ar": "لا",
    "tr": "Hayır"
  },
  "Charged through period end USD": {
    "en": "Charged through period end USD",
    "fr": "Montant comptabilisé en fin de période USD",
    "ru": "Начислено на конец периода USD",
    "ar": "المحتسب حتى نهاية الفترة USD",
    "tr": "Dönem sonu borçlandırma USD"
  },
  "USD equivalent per original unit": {
    "en": "USD equivalent per original unit",
    "fr": "Équivalent USD par unité d’origine",
    "ru": "Эквивалент USD за исходную единицу",
    "ar": "المكافئ USD لكل وحدة أصلية",
    "tr": "Asıl birim başına USD karşılığı"
  },
  "Recorded 1 USD = TRY": {
    "en": "Recorded 1 USD = TRY",
    "fr": "Taux enregistré : 1 USD = TRY",
    "ru": "Сохранённый курс: 1 USD = TRY",
    "ar": "1 USD = TRY المحفوظ",
    "tr": "Kayıtlı 1 USD = TRY"
  },
  "Recorded 1 USD = EUR": {
    "en": "Recorded 1 USD = EUR",
    "fr": "Taux enregistré : 1 USD = EUR",
    "ru": "Сохранённый курс: 1 USD = EUR",
    "ar": "1 USD = EUR المحفوظ",
    "tr": "Kayıtlı 1 USD = EUR"
  },
  "Excluded documents (draft/cancelled)": {
    "en": "Excluded documents (draft/cancelled)",
    "fr": "Documents exclus (brouillons/annulés)",
    "ru": "Исключённые документы (черновики/отменённые)",
    "ar": "مستندات مستبعدة (مسودة/ملغاة)",
    "tr": "Hariç belgeler (taslak/iptal)"
  },
  "Check the dates; the start cannot be after the end.": {
    "en": "Check the dates; the start cannot be after the end.",
    "fr": "Vérifiez les dates ; le début ne peut pas dépasser la fin.",
    "ru": "Проверьте даты: начало не может быть позже конца.",
    "ar": "تأكد من صحة التواريخ وأن البداية لا تتجاوز النهاية.",
    "tr": "Tarihleri kontrol edin; başlangıç bitişten sonra olamaz."
  },
  "Creating PDF pages": {
    "en": "Creating PDF pages",
    "fr": "Création des pages PDF",
    "ru": "Создание страниц PDF",
    "ar": "جارٍ إنشاء صفحات PDF",
    "tr": "PDF sayfaları oluşturuluyor"
  },
  "File ready. Press Share to open the device’s apps.": {
    "en": "File ready. Press Share to open the device’s apps.",
    "fr": "Fichier prêt. Appuyez sur Partager pour choisir une application.",
    "ru": "Файл готов. Нажмите «Поделиться» для выбора приложения.",
    "ar": "الملف جاهز. اضغط المشاركة لفتح تطبيقات الجهاز.",
    "tr": "Dosya hazır. Cihaz uygulamalarını açmak için Paylaş’a basın."
  },
  "Download prepared.": {
    "en": "Download prepared.",
    "fr": "Téléchargement préparé.",
    "ru": "Скачивание подготовлено.",
    "ar": "تم تجهيز التنزيل.",
    "tr": "İndirme hazırlandı."
  },
  "A complete file could not be created. No partial file was saved.": {
    "en": "A complete file could not be created. No partial file was saved.",
    "fr": "Impossible de créer un fichier complet. Aucun fichier incomplet n’a été enregistré.",
    "ru": "Не удалось создать полный файл. Неполный файл не сохранён.",
    "ar": "تعذر إنشاء ملف كامل. لم يُحفظ ملف ناقص.",
    "tr": "Tam dosya oluşturulamadı. Eksik dosya kaydedilmedi."
  },
  "Direct sharing is unavailable for this file on your device. Download it and attach it instead.": {
    "en": "Direct sharing is unavailable for this file on your device. Download it and attach it instead.",
    "fr": "Le partage direct est indisponible pour ce fichier sur votre appareil. Téléchargez-le puis joignez-le.",
    "ru": "Прямая отправка этого файла недоступна. Скачайте его и прикрепите.",
    "ar": "المشاركة المباشرة غير متاحة لهذا الملف على جهازك. استخدم زر التنزيل ثم أرفقه.",
    "tr": "Cihaz bu dosyayı doğrudan paylaşamıyor. İndirip ek olarak gönderin."
  },
  "Sharing did not complete. The file is ready to download or retry.": {
    "en": "Sharing did not complete. The file is ready to download or retry.",
    "fr": "Partage non terminé. Le fichier reste prêt à télécharger ou à renvoyer.",
    "ru": "Отправка не завершена. Файл готов к скачиванию или повторной отправке.",
    "ar": "لم تكتمل المشاركة. الملف جاهز للتنزيل أو لإعادة المحاولة.",
    "tr": "Paylaşım tamamlanmadı. Dosyayı indirebilir veya yeniden deneyebilirsiniz."
  },
  "Back to statement": {
    "en": "Back to statement",
    "fr": "Retour au relevé",
    "ru": "Вернуться к выписке",
    "ar": "العودة للكشف",
    "tr": "Ekstreye dön"
  },
  "File preparation cancelled.": {
    "en": "File preparation cancelled.",
    "fr": "Préparation du fichier annulée.",
    "ru": "Подготовка файла отменена.",
    "ar": "أُلغي تجهيز الملف.",
    "tr": "Dosya hazırlama iptal edildi."
  },
  "Working": {
    "en": "Working",
    "fr": "Traitement en cours",
    "ru": "Выполняется",
    "ar": "جارٍ العمل",
    "tr": "İşleniyor"
  },
  "This is an editable statement file; workbook edits do not automatically change the app.": {
    "en": "This is an editable statement file; workbook edits do not automatically change the app.",
    "fr": "Ce relevé est modifiable ; les modifications du fichier ne changent pas automatiquement l’application.",
    "ru": "Файл выписки редактируется; изменения в нём не меняют данные приложения автоматически.",
    "ar": "هذا ملف كشف قابل للتعديل؛ تعديلاته لا تُكتب تلقائيًا داخل البرنامج.",
    "tr": "Bu düzenlenebilir bir ekstre dosyasıdır; buradaki değişiklikler programa otomatik yazılmaz."
  },
  "A positive balance is due from the client; a negative balance is a client credit.": {
    "en": "A positive balance is due from the client; a negative balance is a client credit.",
    "fr": "Un solde positif est dû par le client ; un solde négatif est en sa faveur.",
    "ru": "Положительный остаток — долг клиента, отрицательный — остаток в его пользу.",
    "ar": "الرصيد الموجب مستحق على العميل، والسالب رصيد لصالحه.",
    "tr": "Pozitif bakiye müşterinin borcudur; negatif bakiye müşteri lehinedir."
  },
  "Unresolved": {
    "en": "Unresolved",
    "fr": "Non résolu",
    "ru": "Не определено",
    "ar": "غير محسوم",
    "tr": "Çözümlenmedi"
  },
  "Recorded data": {
    "en": "Recorded data",
    "fr": "Données enregistrées",
    "ru": "Сохранённые данные",
    "ar": "بيانات مقروءة",
    "tr": "Okunan veriler"
  },
  "Invalid amount; not included in the calculation.": {
    "en": "Invalid amount; not included in the calculation.",
    "fr": "Montant invalide, exclu du calcul.",
    "ru": "Неверная сумма, исключена из расчёта.",
    "ar": "قيمة مبلغ غير صالحة؛ لم تُحتسب.",
    "tr": "Geçersiz tutar; hesaplamaya alınmadı."
  },
  "Historical exchange rate missing; amount not included in the USD balance.": {
    "en": "Historical exchange rate missing; amount not included in the USD balance.",
    "fr": "Taux historique absent ; montant exclu du solde USD.",
    "ru": "Исторический курс отсутствует; сумма не включена в остаток USD.",
    "ar": "سعر الصرف التاريخي مفقود؛ المبلغ غير محتسب في رصيد الدولار.",
    "tr": "Geçmiş döviz kuru eksik; tutar USD bakiyesine alınmadı."
  },
  "A legacy non-USD payment has no payment-time rate. The saved invoice rate was used; this conversion is an estimate.": {
    "en": "A legacy non-USD payment has no payment-time rate. The saved invoice rate was used; this conversion is an estimate.",
    "fr": "Un ancien paiement hors USD ne dispose pas de son taux historique. Le taux enregistré dans la facture a été utilisé à titre estimatif.",
    "ru": "У старого платежа не в USD отсутствует курс на дату оплаты. Использован сохранённый курс счёта; пересчёт оценочный.",
    "ar": "دفعة قديمة بعملة غير الدولار؛ استُخدم سعر الفاتورة المحفوظ لغياب سعر الدفعة. التحويل تقديري.",
    "tr": "Eski döviz ödemesinin kendi kuru yok; kayıtlı fatura kuru kullanıldı. Dönüşüm tahminidir."
  },
  "Stored paid total differs from deposit and receipt records. The actual records were used without inventing a payment.": {
    "en": "Stored paid total differs from deposit and receipt records. The actual records were used without inventing a payment.",
    "fr": "Le total payé enregistré diffère de l’acompte et du registre des paiements. Les écritures réelles sont utilisées, sans créer de paiement fictif.",
    "ru": "Сохранённый итог оплаты не совпадает с авансом и журналом платежей. Использованы фактические записи без добавления вымышленного платежа.",
    "ar": "الإجمالي المدفوع المخزن لا يطابق سجل الدفعات والعربون. اعتمد الكشف السجل الفعلي دون اختراع دفعة.",
    "tr": "Kayıtlı ödenen toplamı, peşinat ve ödeme kayıtlarıyla uyuşmuyor. Hayali ödeme oluşturulmadan asıl kayıtlar kullanıldı."
  },
  "No separate deposit date exists; invoice date is shown as a reference.": {
    "en": "No separate deposit date exists; invoice date is shown as a reference.",
    "fr": "Pas de date distincte pour l’acompte ; la date de facture est indiquée à titre de référence.",
    "ru": "Отдельной даты аванса нет; дата счёта показана как ориентировочная.",
    "ar": "لا يوجد تاريخ مستقل للعربون؛ عُرض بتاريخ الفاتورة كمرجع.",
    "tr": "Ayrı peşinat tarihi yok; fatura tarihi referans gösterildi."
  },
  "Transaction date is missing or ambiguous. Included for all records; excluded from a custom period because its timing is unknown.": {
    "en": "Transaction date is missing or ambiguous. Included for all records; excluded from a custom period because its timing is unknown.",
    "fr": "Date d’opération absente ou ambiguë. Incluse dans l’historique complet, exclue d’une période précise faute de date connue.",
    "ru": "Дата операции отсутствует или неоднозначна. Операция включена во все записи, но исключена из выбранного периода из-за неизвестной даты.",
    "ar": "تاريخ العملية غير متاح أو ملتبس. تُحتسب في كشف كل السجل، وتُستبعد من الفترة المحددة لعدم معرفة موقعها الزمني.",
    "tr": "İşlem tarihi eksik veya belirsiz. Tüm kayıtlarda hesaba katılır; özel tarih aralığında dönemi bilinmediği için hariç tutulur."
  },
  "Different copies of the same payment ID exist; the main payment record was used once.": {
    "en": "Different copies of the same payment ID exist; the main payment record was used once.",
    "fr": "Des versions différentes portent le même identifiant de paiement ; l’enregistrement principal a été compté une seule fois.",
    "ru": "Найдены разные версии платежа с одним идентификатором; основная запись учтена один раз.",
    "ar": "نسختان مختلفتان لدفعة تحمل المعرف نفسه؛ اعتمد السجل الرئيسي مرة واحدة.",
    "tr": "Aynı kimlikli ödemenin farklı kopyaları var; ana kayıt bir kez kullanıldı."
  },
  "Duplicate invoice ID; counted once and requires review.": {
    "en": "Duplicate invoice ID; counted once and requires review.",
    "fr": "Identifiant de facture en double ; compté une fois, à vérifier.",
    "ru": "Повторный идентификатор счёта; учтён один раз, требуется проверка.",
    "ar": "فاتورة بمعرف مكرر؛ احتُسبت مرة واحدة وتحتاج مراجعة.",
    "tr": "Tekrarlı fatura kimliği; bir kez sayıldı ve kontrol gerekiyor."
  },
  "The deposit field differs from receipts marked as deposits; check the source.": {
    "en": "The deposit field differs from receipts marked as deposits; check the source.",
    "fr": "L’acompte diffère des paiements marqués comme acomptes ; vérifiez la source.",
    "ru": "Поле аванса не совпадает с платежами, отмеченными как аванс; проверьте источник.",
    "ar": "قيمة العربون لا تطابق الدفعات المعلَّمة عربونًا؛ راجع المصدر.",
    "tr": "Peşinat alanı, peşinat işaretli ödemelerle uyuşmuyor; kaynağı kontrol edin."
  },
  "Payment refers to a missing invoice; it was not assigned to another invoice.": {
    "en": "Payment refers to a missing invoice; it was not assigned to another invoice.",
    "fr": "Le paiement renvoie à une facture absente ; il n’a pas été attribué à une autre.",
    "ru": "Платёж ссылается на отсутствующий счёт и не отнесён к другому.",
    "ar": "دفعة تشير إلى فاتورة غير موجودة؛ لم تُنسب إلى فاتورة أخرى.",
    "tr": "Ödemenin bağlı faturası yok; başka bir faturaya atanmadı."
  },
  "Download ready file": {
    "en": "Download ready file",
    "fr": "Télécharger le fichier prêt",
    "ru": "Скачать готовый файл",
    "ar": "تنزيل الملف الجاهز",
    "tr": "Hazır dosyayı indir"
  },
  "Open invoice": {
    "en": "Open invoice",
    "fr": "Ouvrir la facture",
    "ru": "Открыть счёт",
    "ar": "فتح الفاتورة",
    "tr": "Faturayı aç"
  },
  "Manage payments": {
    "en": "Manage payments",
    "fr": "Gérer les paiements",
    "ru": "Управлять платежами",
    "ar": "إدارة الدفعات",
    "tr": "Ödemeleri yönet"
  },
  "Saved data only; viewing a statement never changes a record.": {
    "en": "Saved data only; viewing a statement never changes a record.",
    "fr": "Données enregistrées uniquement ; la consultation ne modifie aucun enregistrement.",
    "ru": "Только сохранённые данные; просмотр выписки не меняет записи.",
    "ar": "البيانات المحفوظة فقط؛ لا يغيّر عرض الكشف أي سجل.",
    "tr": "Yalnızca kayıtlı veriler; ekstre görüntüleme hiçbir kaydı değiştirmez."
  },
  "notices": {
    "en": "notices",
    "fr": "avertissements",
    "ru": "предупреждений",
    "ar": "تنبيهات",
    "tr": "uyarı"
  },
  "Loading and delivery dates are not treated as payment due dates.": {
    "en": "Loading and delivery dates are not treated as payment due dates.",
    "fr": "Les dates de chargement et de livraison ne sont pas des échéances de paiement.",
    "ru": "Даты погрузки и доставки не считаются сроками оплаты.",
    "ar": "لا نعتبر تاريخ التحميل أو التسليم تاريخًا لاستحقاق الدفع.",
    "tr": "Yükleme veya teslim tarihini ödeme vadesi olarak kabul etmeyiz."
  },
  "Enter a positive amount, valid date and valid exchange rate.": {
    "en": "Enter a positive amount, valid date and valid exchange rate.",
    "fr": "Saisissez un montant positif, une date et un taux de change valides.",
    "ru": "Введите положительную сумму, правильную дату и курс валют.",
    "ar": "أدخل مبلغًا موجبًا وتاريخًا صالحًا وسعر صرف صحيحًا.",
    "tr": "Pozitif bir tutar, geçerli tarih ve doğru döviz kuru girin."
  },
  "Accept the currency conversion first, or select the invoice currency.": {
    "en": "Accept the currency conversion first, or select the invoice currency.",
    "fr": "Acceptez d’abord la conversion ou choisissez la devise de la facture.",
    "ru": "Сначала примите пересчёт валюты или выберите валюту счёта.",
    "ar": "اقبل تحويل العملة أولًا أو اختر عملة الفاتورة.",
    "tr": "Önce dönüşümü onaylayın veya faturanın para birimini seçin."
  },
  "A field is too long to split safely.": {
    "en": "A field is too long to split safely.",
    "fr": "Un champ est trop long pour être divisé correctement.",
    "ru": "Поле слишком длинное для безопасного разделения.",
    "ar": "يوجد حقل طويل جدًا لا يمكن تقسيمه بأمان.",
    "tr": "Bir alan güvenli bölünemeyecek kadar uzun."
  },
  "Statement data changed; prepare the file again.": {
    "en": "Statement data changed; prepare the file again.",
    "fr": "Les données du relevé ont changé ; préparez à nouveau le fichier.",
    "ru": "Данные выписки изменились; подготовьте файл заново.",
    "ar": "تغيرت بيانات الكشف؛ أعد تجهيز الملف.",
    "tr": "Ekstre verileri değişti; dosyayı yeniden hazırlayın."
  },
  "Bank transfer": {
    "en": "Bank transfer",
    "fr": "Virement bancaire",
    "ru": "Банковский перевод",
    "ar": "تحويل بنكي",
    "tr": "Banka havalesi"
  },
  "Credit card": {
    "en": "Credit card",
    "fr": "Carte bancaire",
    "ru": "Банковская карта",
    "ar": "بطاقة ائتمان",
    "tr": "Kredi kartı"
  },
  "Cheque": {
    "en": "Cheque",
    "fr": "Chèque",
    "ru": "Чек",
    "ar": "شيك",
    "tr": "Çek"
  },
  "Exchange office": {
    "en": "Exchange office",
    "fr": "Bureau de change",
    "ru": "Обменный пункт",
    "ar": "صراف",
    "tr": "Döviz bürosu"
  },
  "Cryptocurrency": {
    "en": "Cryptocurrency",
    "fr": "Cryptomonnaie",
    "ru": "Криптовалюта",
    "ar": "عملة رقمية",
    "tr": "Kripto"
  },
  "Card": {
    "en": "Card",
    "fr": "Carte",
    "ru": "Карта",
    "ar": "بطاقة",
    "tr": "Kart"
  },
  "Letter of credit": {
    "en": "Letter of credit",
    "fr": "Crédit documentaire",
    "ru": "Аккредитив",
    "ar": "اعتماد مستندي",
    "tr": "Akreditif"
  },
  "Chrome storage quota is full. Export a backup and free device space.": {
    "en": "Chrome storage quota is full. Export a backup and free device space.",
    "fr": "Le stockage Chrome est plein. Exportez une sauvegarde et libérez de l’espace.",
    "ru": "Хранилище Chrome заполнено. Экспортируйте копию и освободите место.",
    "ar": "وصل تخزين Chrome إلى الحد المتاح. صدّر نسخة احتياطية ووفّر مساحة على الجهاز.",
    "tr": "Chrome depolama kotası doldu. Yedek alın ve cihazda boş alan açın."
  },
  "Persistent storage enabled": {
    "en": "Persistent storage enabled",
    "fr": "Stockage persistant activé",
    "ru": "Постоянное хранение включено",
    "ar": "تخزين دائم مفعّل",
    "tr": "Kalıcı depolama etkin"
  },
  "Best effort — persistence will be retried": {
    "en": "Best effort — persistence will be retried",
    "fr": "Stockage non garanti — nouvelle demande de persistance prévue",
    "ru": "Хранение не гарантировано — постоянное хранение будет запрошено снова",
    "ar": "أفضل جهد — سيعاد طلب التخزين الدائم",
    "tr": "En iyi çaba — kalıcı depolama tekrar istenecek"
  },
  "Product saved. Reload the page to refresh the display.": {
    "en": "Product saved. Reload the page to refresh the display.",
    "fr": "Produit enregistré. Rechargez la page pour actualiser l’affichage.",
    "ru": "Товар сохранён. Перезагрузите страницу для обновления.",
    "ar": "تم حفظ المنتج. أعد تحميل الصفحة لتحديث العرض.",
    "tr": "Ürün kaydedildi. Görünümü yenilemek için sayfayı yeniden yükleyin."
  },
  "Goods Total": {
    "en": "Goods Total",
    "fr": "Total des marchandises",
    "ru": "Сумма товаров",
    "ar": "إجمالي السلع ",
    "tr": "Mal Toplam Tutarı"
  },
  "Total Discount": {
    "en": "Total Discount",
    "fr": "Remise totale",
    "ru": "Общая скидка",
    "ar": "إجمالي الخصم",
    "tr": "Toplam İskonto"
  },
  "Total Including Taxes": {
    "en": "Total Including Taxes",
    "fr": "Total TTC",
    "ru": "Итого с налогами",
    "ar": "المجموع الشامل للضرائب",
    "tr": "Vergiler Dahil Toplam Tutar"
  },
  "Amount Payable": {
    "en": "Amount Payable",
    "fr": "Montant à payer",
    "ru": "К оплате",
    "ar": "المبلغ المستحق",
    "tr": "Ödenecek Tutar"
  },
  "The app could not start. Please refresh the page.": {
    "en": "The app could not start. Please refresh the page.",
    "fr": "L’application n’a pas démarré. Actualisez la page.",
    "ru": "Не удалось запустить приложение. Обновите страницу.",
    "ar": "تعذر تشغيل البرنامج. يرجى تحديث الصفحة.",
    "tr": "Program başlatılamadı. Sayfayı yenileyin."
  },
  "Keep your input and share the error code below.": {
    "en": "Keep your input and share the error code below.",
    "fr": "Conservez votre saisie et communiquez le code d’erreur ci-dessous.",
    "ru": "Сохраните введённые данные и сообщите код ошибки ниже.",
    "ar": "احتفظ ببيانات الإدخال وأرسل لي رمز الخطأ الظاهر.",
    "tr": "Bilgileri koruyun ve aşağıdaki hata kodunu paylaşın."
  },
  "One file · continues while the app is closed.": {
    "en": "One file · continues while the app is closed.",
    "fr": "Un seul fichier · fonctionne même application fermée.",
    "ru": "Один файл · работает при закрытом приложении.",
    "ar": "ملف واحد فقط · يعمل حتى لو كان التطبيق مغلقاً.",
    "tr": "Tek dosya · uygulama kapalıyken de çalışır."
  },
  "en-US": {
    "en": "en-US",
    "ar": "ar-SA",
    "tr": "tr-TR",
    "fr": "fr-FR",
    "ru": "ru-RU"
  }
};
const aliases=Object.create(null);
for(const [key,copy] of Object.entries(COPY))for(const value of Object.values(copy))aliases[value]=key;
root.wfUiText=function(source,language){
 const lang=language||document.documentElement.lang||'ar';
 const copy=COPY[source]||COPY[aliases[source]];
 return copy?.[lang]??source;
};
root.wfTranslateStaticUI=function(){
 document.querySelectorAll('[data-wf-toast-copy]').forEach(el=>{el.textContent=root.wfUiText(el.dataset.wfToastCopy);});
 document.querySelectorAll('[data-wf-ui]').forEach(el=>{el.textContent=root.wfUiText(el.dataset.wfUi);});
 for(const attribute of ['placeholder','title','aria-label','alt']){
  document.querySelectorAll('[data-wf-ui-'+attribute+']').forEach(el=>{el.setAttribute(attribute,root.wfUiText(el.getAttribute('data-wf-ui-'+attribute)));});
 }
};
root.WOWUICopy=COPY;
})(window);
window.wfItemCount=function(n,language){
 const lang=language||document.documentElement.lang;
 const forms={ar:{one:'منتج',other:'منتجات'},tr:{other:'ürün'},en:{one:'item',other:'items'},fr:{one:'article',other:'articles'},ru:{one:'позиция',few:'позиции',many:'позиций',other:'позиции'}};
 const words=forms[lang]||forms.en;
 return new Intl.NumberFormat(lang).format(n)+' '+(words[new Intl.PluralRules(lang).select(n)]||words.other);
};
window.wfProductColorLabel=function(value,language){
 const lang=language||document.documentElement.lang;
 const choices=FURNITURE_COLORS[lang]||FURNITURE_COLORS.en;
 let key=value;
 for(const entries of Object.values(FURNITURE_COLORS)){
  const item=entries.find(c=>c.val===value||c.label===value);
  if(item){key=item.val;break;}
 }
 return choices.find(c=>c.val===key)?.label||value;
};
