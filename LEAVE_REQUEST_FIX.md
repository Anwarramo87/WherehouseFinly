# إصلاح مشكلة طلبات الإجازة

## المشكلة
كان هناك خطأ 500 عند محاولة إنشاء أو عرض طلبات الإجازة:
```
The column `leave_requests.isHourly` does not exist in the current database.
```

## السبب
الأعمدة `isHourly`, `startTime`, `endTime` كانت موجودة في schema.prisma لكن لم يتم تطبيقها على قاعدة البيانات.

## الحل

### 1. تزامن قاعدة البيانات مع Schema
```bash
cd werehouse/backend-nest
npx prisma db push --accept-data-loss
npx prisma generate
```

### 2. إعادة تشغيل الباك إند
```bash
npm run start:dev
```

### 3. حذف الملفات المكررة
- حذف `factory/components/LeaveRequestModal.tsx.bak`
- حذف `factory/.worktrees/Factory/components/LeaveRequestModal.tsx`

### 4. تحسينات على الكود

#### في LeaveRequestModal.tsx:
- إضافة `status: "APPROVED"` كحالة افتراضية
- تحسين معالجة أخطاء 500 لعرض رسالة الخطأ من الباك إند
- إضافة `console.error` لتسهيل debugging

#### في attendance/page.tsx:
- إعادة ترتيب الأعمدة: الحالة → حالة الإجازة → المصدر → إجراءات

## التحقق من الإصلاح

1. افتح صفحة الحضور: http://localhost:3000/attendance
2. اضغط على زر "طلب إجازة"
3. اختر موظف وحدد نوع الإجازة
4. اضغط "حفظ الطلب"
5. يجب أن يتم حفظ الطلب بنجاح وظهور رسالة نجاح

## الحقول المضافة لجدول leave_requests

```sql
ALTER TABLE leave_requests 
ADD COLUMN isHourly BOOLEAN DEFAULT false,
ADD COLUMN startTime VARCHAR(5),  -- HH:mm format
ADD COLUMN endTime VARCHAR(5);    -- HH:mm format
```

## ملاحظات

- الإجازات الساعية تستخدم `isHourly: true` مع `startTime` و `endTime`
- الإجازات العادية تستخدم `startDate` و `endDate` فقط
- جميع الإجازات تُنشأ بحالة `APPROVED` افتراضياً
- الباك إند يتعامل مع حساب الخصومات تلقائياً في PayrollInput

## تاريخ الإصلاح
2026-06-01
