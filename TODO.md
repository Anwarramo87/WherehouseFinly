# TODO - إصلاح home (الموظفون الغائبون اليوم) + الأقسام (إضافة/تعديل/حذف) + إضافة موظف

## الخطوة 1
- [ ] قراءة `Factory/hooks/useDashboard.ts` لمعرفة شكل `absentEmployees` القادمة من الـ hook.
- [ ] قراءة `Factory/components/DataDrilldownModal.tsx` لمعرفة expected props وأنواع الحقول.
- [ ] تحديد سبب عرض “الموظفون الغائبون اليوم” بشكل خاطئ في `Factory/app/(dashboard)/home/page.tsx`.

## الخطوة 2
- [ ] قراءة صفحة/كومبوننتات الأقسام داخل `Factory/app/(dashboard)/settings/**`.
- [ ] قراءة `Factory/hooks/useDepartments.ts`.
- [ ] قراءة `Factory/components/AddDepartmentModal.tsx`.
- [ ] العثور على UI الخاصة بـ (تعديل/حذف) إن كانت موجودة، أو إضافتها.

## الخطوة 3
- [ ] قراءة `Factory/components/AddEmployeeModal.tsx` لمعرفة كيف يتم اختيار/إرسال القسم.
- [ ] التأكد من استخدام `departmentId`/`department` بالشكل الصحيح.

## الخطوة 4
- [ ] تنفيذ الإصلاحات في الملفات المطلوبة.
- [ ] تأكيد refresh بعد إضافة/تعديل/حذف (invalidate queries على نفس queryKey).

## الخطوة 5
- [ ] تشغيل التطبيق والتحقق:
  - [ ] `/home` -> مودال “الموظفون الغائبون اليوم” يعرض حقول صحيحة (دوام مجدول/آخر حضور).
  - [ ] `/settings` أو صفحة الأقسام -> إضافة قسم تعمل.
  - [ ] تعديل/حذف قسم يعمل.
  - [ ] إضافة موظف مع اختيار القسم تعمل بدون مشاكل.

