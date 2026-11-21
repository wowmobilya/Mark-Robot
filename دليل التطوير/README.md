# دليل Mark Robot للمطور

هذا الفهرس يرشدك إلى الملفات الأصلية؛ لا توجد نسخ إضافية للتطبيق هنا. فرع الإصدار السحابي لم يُدمج بعد، لذا تشير روابطه إلى `feat/wow-cloud-211`.

## الواجهة المنشورة

- [الصفحة الرئيسية ونقطة الدخول](../index.html)
- [الحسابات والصلاحيات](../accounts-core.js) · [واجهة الدخول وتبديل الحساب](../accounts-access.js)
- [المظهر والموارد](../assets/) · [الاختبارات الحالية](../tests/)

## وحدات الإصدار السحابي قيد التجهيز

- [لوحة إدارة السيرفر](https://github.com/wowmobilya/Mark-Robot/tree/feat/wow-cloud-211/modules/server)
- [المعرض](https://github.com/wowmobilya/Mark-Robot/tree/feat/wow-cloud-211/modules/gallery) · [المحادثات](https://github.com/wowmobilya/Mark-Robot/tree/feat/wow-cloud-211/modules/chat) · [الملفات](https://github.com/wowmobilya/Mark-Robot/tree/feat/wow-cloud-211/modules/files)
- [المالية](https://github.com/wowmobilya/Mark-Robot/tree/feat/wow-cloud-211/modules/finance) · [المراسلات](https://github.com/wowmobilya/Mark-Robot/tree/feat/wow-cloud-211/modules/communications) · [المساعد](https://github.com/wowmobilya/Mark-Robot/tree/feat/wow-cloud-211/modules/assistant)
- [الاتصال والمزامنة](https://github.com/wowmobilya/Mark-Robot/tree/feat/wow-cloud-211/modules/platform) · [السجل المشترك للوحدات](https://github.com/wowmobilya/Mark-Robot/blob/feat/wow-cloud-211/modules/platform/registry.js)
- [قاعدة البيانات](https://github.com/wowmobilya/Mark-Robot/tree/feat/wow-cloud-211/supabase/modules) · [خدمة السيرفر](https://github.com/wowmobilya/Mark-Robot/tree/feat/wow-cloud-211/supabase/functions/wow-cloud) · [ترتيب الترقية](https://github.com/wowmobilya/Mark-Robot/blob/feat/wow-cloud-211/supabase/release.json)
- [دليل التشغيل والاستعادة](https://github.com/wowmobilya/Mark-Robot/blob/feat/wow-cloud-211/docs/production-operations.md) · [دفتر القبول](https://github.com/wowmobilya/Mark-Robot/blob/feat/wow-cloud-211/docs/release-acceptance.md)

عند إضافة وحدة أو تعديلها، حافظ على المسارات المرتبطة من الواجهة وعلى صلاحيات الحسابات، واختبر الوظائف قبل الدمج. قبل إزالة وحدة أو تعديل قاعدة مشتركة، حدد ملكية بياناتها وخذ نسخة واختبر استعادتها. لا تنقل ملفات التشغيل لمجرد تغيير أسماء المجلدات: مساراتها جزء من النشر.
