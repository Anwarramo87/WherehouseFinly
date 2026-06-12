# TODO - Payroll consistency fixes (Frontend)

- [x] app/(dashboard)/salaries/timeTable/page.tsx
  - [x] توحيد فلترة الموظفين: استبعاد terminated/resigned فقط (نفس سياسة /employees)
  - [x] تحديث calcEarnedSalary لإضافة overtimeRegularMinutes و overtimeWeekendDays باستخدام مضاعفات مشتركة
  - [x] توحيد مصدر دقائق التأخير: حذف calcLateMinutes المحلي والاعتماد على autoDeductions.delayMinutes من الباك
  - [ ] إضافة Tooltip/عمود تفصيلي معادلة الراتب لمطابقة PayrollItem بعد تشغيل الرواتب
- [x] التأكد في pages الأخرى (timeTable uses startDate/endDate) أن requests تعتمد على نفس تصحيح الباك دون تعديلات.
- [ ] تشغيل typecheck/lint وتجربة شهر واحد عبر:
  - [ ] /employees
  - [ ] /salaries/timeTable
  - [ ] /salaries/payroll/[month]
  - [ ] مقارنة التطابق بالأرقام
