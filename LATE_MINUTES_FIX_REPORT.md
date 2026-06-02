# تقرير إصلاح نظام عرض دقائق التأخير

## التاريخ: 2026-06-01
## الحالة: قيد الإصلاح

---

## 📋 المشاكل المكتشفة

### 1. 🔴 صفحة Home - `totalLateMinutesToday` دائماً صفر

**الموقع:** `werehouse/backend-nest/src/dashboard/dashboard.service.ts` - سطر 81-88

**المشكلة:**
```typescript
// الكود الحالي (خاطئ)
for (const rec of todayAttendanceRecords) {
  if (rec.type !== 'IN') continue;
  const shiftPair = rec.shiftPair as Record<string, unknown> | null;
  const minutesLate = Number(shiftPair?.minutesLate ?? 0);  // ❌ يعتمد على shiftPair فقط
  if (minutesLate > 0) {
    // ...
  }
}
```

**السبب:**
- عند تسجيل الدخول يدوياً من صفحة attendance، يُنشأ سجل جديد بدون `shiftPair.minutesLate`
- الـ `shiftPair` يُملأ فقط عند معالجة أزواج IN/OUT معاً
- إذا لم يكن موجوداً، النظام يُرجع صفراً

**الحل المطلوب:**
- استخدام `resolveMinutesLate()` الموجودة في `attendance.service.ts` (سطر 190-203)
- حساب التأخير من وقت الدخول الفعلي مقارنة بـ `scheduledStart`
- مثل ما يفعل `/attendance/alerts` endpoint

---

### 2. 🟡 صفحة Home - Modal المتأخرين قد لا يعرض جميع الموظفين

**الموقع:** `factory/app/(dashboard)/home/page.tsx` - سطر 277-330

**المشكلة:**
```typescript
// الكود الحالي
const alertsRes = await apiClient.get("/attendance/alerts", { params: { date: today } });
const alerts: AttendanceAlert[] = Array.isArray(alertsRes.data?.alerts) 
  ? alertsRes.data.alerts 
  : [];

if (type === 'late') {
  const lateData: LateEmployeeDetail[] = alerts
    .filter((alert) => alert.status === "late")  // ✅ هذا جيد
    .map((alert) => ({
      // ...
      minutesLate: alert.minutesLate,  // ✅ البيانات موجودة
    }));
  setModalData(lateData);
}
```

**السبب:**
- الكود نفسه صحيح
- لكن `/attendance/alerts` قد لا يُرجع جميع المتأخرين إذا كان `lateThresholdMinutes` كبيراً جداً
- الافتراضي 15 دقيقة (في `DEFAULT_LATE_THRESHOLD_MINUTES`)
- يجب التأكد من أن threshold يُمرر بشكل صحيح

**الحل المطلوب:**
- التأكد من أن `/attendance/alerts` يُستدعى بدون threshold أو threshold=0 لرؤية جميع المتأخرين
- أو تمرير threshold واضح من الفرونت إند

---

### 3. 🔴 صفحة attendance - لا تعرض دقائق التأخير

**الموقع:** `factory/app/(dashboard)/attendance/page.tsx`

**المشكلة الحالية:**
- الجدول يعرض فقط حالة "متأخر" أو "حاضر" بدون عدد الدقائق
- العمود الحالي: "الحالة"
- لا يوجد عمود منفصل لدقائق التأخير

**الحل المطلوب:**
1. إضافة عمود جديد: "دقائق التأخير"
2. حساب دقائق التأخير من `checkIn` و `scheduledStart`
3. عرض عدد الدقائق للموظفين المتأخرين فقط

---

### 4. ✅ صفحة timeTable - تعمل لكن تحتاج تحسين

**الموقع:** `factory/app/(dashboard)/salaries/timeTable/page.tsx` - سطر 79-92

**الحالة الحالية:**
```typescript
// الكود الحالي (يعمل بشكل صحيح)
const autoInput = autoDeductions.find(
  (d: AttendanceDeductionBreakdown) => d.employeeId === selectedEmployeeId
);
const lateMinutes = hasManualInput
  ? (manualInput.lateMinutes ?? 0)
  : (autoInput?.delayMinutes ?? 0);  // ✅ يستخدم delayMinutes بشكل صحيح
```

**الملاحظات:**
- الكود يعمل بشكل صحيح
- يعرض `totalDelayMinutes` في الجدول
- يستخدم `calculate-deductions` endpoint الذي يحسب التأخير بشكل صحيح

**تحسينات مقترحة:**
- إضافة tooltip لشرح كيفية حساب التأخير
- إضافة رابط للتفاصيل اليومية

---

## 🔧 التعديلات المطلوبة

### Backend (werehouse/backend-nest)

#### 1. ملف: `src/dashboard/dashboard.service.ts`

**التعديل:**
```typescript
// الكود القديم (خاطئ)
for (const rec of todayAttendanceRecords) {
  if (rec.type !== 'IN') continue;
  const shiftPair = rec.shiftPair as Record<string, unknown> | null;
  const minutesLate = Number(shiftPair?.minutesLate ?? 0);
  if (minutesLate > 0) {
    // ...
  }
}

// الكود الجديد (صحيح) ✅
// حساب التأخير من الوقت الفعلي
const firstInMap = new Map<string, { checkIn: Date; employee: any }>();

// جمع أول دخول لكل موظف
for (const rec of todayAttendanceRecords) {
  if (rec.type === 'IN' && !firstInMap.has(rec.employeeId)) {
    firstInMap.set(rec.employeeId, {
      checkIn: rec.timestamp,
      employee: rec.employee,
    });
  }
}

// حساب التأخير لكل موظف
for (const [employeeId, { checkIn, employee }] of firstInMap) {
  const scheduledStart = employee.scheduledStart || '08:00';
  const scheduledMinutes = this.parseClockMinutes(scheduledStart);
  const actualMinutes = checkIn.getHours() * 60 + checkIn.getMinutes();
  
  const minutesLate = Math.max(0, actualMinutes - scheduledMinutes);
  
  // تطبيق grace period 15 دقيقة
  if (minutesLate > 15) {
    lateEmployees.push({
      employeeId,
      name: employee.name,
      minutesLate,
    });
    totalLateMinutes += minutesLate;
  }
}
```

**الدوال المساعدة المطلوبة:**
```typescript
private parseClockMinutes(timeStr: string): number {
  const match = /^(\d{1,2}):(\d{2})$/.exec(timeStr);
  if (!match) return 0;
  return Number(match[1]) * 60 + Number(match[2]);
}
```

---

### Frontend (factory)

#### 2. ملف: `app/(dashboard)/attendance/page.tsx`

**التعديل 1: إضافة دالة حساب دقائق التأخير:**
```typescript
// إضافة بعد دالة getStatus (حول سطر 60)
const getLateMinutes = (checkIn?: string, scheduledStart?: string): number => {
  if (!checkIn || !scheduledStart) return 0;
  
  const ci = toMinutes(checkIn);
  const sc = toMinutes(scheduledStart || "08:00");
  
  const diff = ci - sc - 15; // طرح grace period 15 دقيقة
  return diff > 0 ? diff : 0;
};
```

**التعديل 2: إضافة عمود دقائق التأخير في الجدول:**
```typescript
// في thead (حول سطر 330)
<th className="p-5 text-xs font-black text-[#263544] uppercase tracking-wider text-center">الموظف</th>
<th className="p-5 text-xs font-black text-[#263544] uppercase tracking-wider text-center">التاريخ</th>
<th className="p-5 text-xs font-black text-[#263544] uppercase tracking-wider text-center">الدخول</th>
<th className="p-5 text-xs font-black text-[#263544] uppercase tracking-wider text-center">الخروج</th>
<th className="p-5 text-xs font-black text-[#263544] uppercase tracking-wider text-center">الحالة</th>
<th className="p-5 text-xs font-black text-[#263544] uppercase tracking-wider text-center">دقائق التأخير</th>  {/* جديد */}
<th className="p-5 text-xs font-black text-[#263544] uppercase tracking-wider text-center">حالة الإجازة</th>
<th className="p-5 text-xs font-black text-[#263544] uppercase tracking-wider text-center">المصدر</th>
<th className="p-5 text-xs font-black text-[#263544] uppercase tracking-wider text-center">إجراءات</th>

// في tbody (حول سطر 380)
<td className="p-4 text-center">
  <span className={`px-4 py-1.5 rounded-xl text-[11px] font-black border ${statusUi[row.status].classes}`}>
    {statusUi[row.status].label}
  </span>
</td>
{/* العمود الجديد */}
<td className="p-4 text-center">
  {(() => {
    const lateMin = getLateMinutes(row.checkIn, row.scheduledStart);
    return lateMin > 0 ? (
      <span className="px-3 py-1.5 rounded-xl text-xs font-black bg-orange-100 text-orange-700 border border-orange-200">
        {lateMin} دقيقة
      </span>
    ) : (
      <span className="text-slate-400 font-bold">—</span>
    );
  })()}
</td>
```

#### 3. ملف: `app/(dashboard)/home/page.tsx`

**التعديل: إضافة threshold واضح عند استدعاء alerts:**
```typescript
// الكود الحالي (سطر 277)
const alertsRes = await apiClient.get("/attendance/alerts", { params: { date: today } });

// الكود الجديد ✅
const alertsRes = await apiClient.get("/attendance/alerts", { 
  params: { 
    date: today,
    lateThresholdMinutes: 15  // تحديد threshold بوضوح
  } 
});
```

---

## 📊 ملخص التغييرات

### Backend
| الملف | نوع التعديل | السبب |
|------|-------------|--------|
| `dashboard.service.ts` | تعديل منطق حساب التأخير | استخدام الوقت الفعلي بدلاً من shiftPair فقط |
| `dashboard.service.ts` | إضافة دالة `parseClockMinutes` | لحساب الدقائق من صيغة HH:mm |

### Frontend
| الملف | نوع التعديل | السبب |
|------|-------------|--------|
| `attendance/page.tsx` | إضافة دالة `getLateMinutes` | حساب دقائق التأخير |
| `attendance/page.tsx` | إضافة عمود "دقائق التأخير" | عرض التأخير بوضوح |
| `home/page.tsx` | إضافة threshold في params | ضمان رؤية جميع المتأخرين |

---

## 🧪 خطوات الاختبار

### 1. صفحة Home
```
1. افتح صفحة Home
2. تحقق من KPI "دقائق التأخير" - يجب أن يعرض رقماً إذا كان هناك متأخرون
3. اضغط على KPI "دقائق التأخير"
4. تأكد من ظهور قائمة الموظفين المتأخرين مع عدد دقائق كل موظف
```

### 2. صفحة Attendance
```
1. افتح صفحة Attendance
2. سجل دخول موظف متأخر (مثلاً الدخول 08:30 والمفترض 08:00)
3. تحقق من:
   - عمود "الحالة" يعرض "متأخر"
   - عمود "دقائق التأخير" يعرض "15 دقيقة" (30 - 15 grace period)
```

### 3. صفحة TimeTable
```
1. افتح صفحة TimeTable
2. اختر الشهر الحالي
3. تحقق من عمود "إجمالي التأخير (دقائق)"
4. يجب أن يعرض مجموع دقائق التأخير للشهر
```

---

## ⚠️ ملاحظات مهمة

### Grace Period
- النظام يستخدم grace period مدته **15 دقيقة**
- إذا دخل الموظف في الدقيقة 08:15 أو قبل، يُعتبر في الوقت
- إذا دخل في الدقيقة 08:16 أو بعد، يُعتبر متأخراً

### حساب التأخير
```
minutesLate = actualCheckInMinutes - scheduledStartMinutes - gracePeriodMinutes

مثال:
scheduledStart = 08:00 (480 دقيقة)
checkIn = 08:45 (525 دقيقة)  
gracePeriod = 15 دقيقة

minutesLate = 525 - 480 - 15 = 30 دقيقة
```

### عرض البيانات
- **Home**: إجمالي دقائق جميع المتأخرين + قائمة بالأسماء
- **Attendance**: دقائق التأخير لكل موظف في اليوم المحدد
- **TimeTable**: مجموع دقائق التأخير للشهر بالكامل

---

## 🚀 الخطوات التالية

1. ✅ تطبيق التعديلات على الباك إند
2. ✅ تطبيق التعديلات على الفرونت إند
3. ✅ اختبار جميع الحالات
4. ✅ التأكد من عدم وجود أخطاء في console
5. ✅ التأكد من صحة الحسابات

---

## 📝 أمثلة على الحالات

### Scenario 1: موظف متأخر 30 دقيقة
```
Employee: أحمد (EMP001)
Scheduled Start: 08:00
Actual Check-In: 08:30

النتيجة:
- Home KPI: +30 دقيقة للإجمالي
- Home Modal: "أحمد - 30 دقيقة"
- Attendance: Badge "متأخر" + "30 دقيقة"
- TimeTable (end of month): +30 دقيقة للإجمالي الشهري
```

### Scenario 2: موظف في الوقت (ضمن grace period)
```
Employee: محمد (EMP002)
Scheduled Start: 08:00
Actual Check-In: 08:12

النتيجة:
- Home KPI: +0 (لا يُضاف شيء)
- Home Modal: لا يظهر في القائمة
- Attendance: Badge "حاضر" + "—"
- TimeTable: +0 دقيقة
```

### Scenario 3: موظف غائب
```
Employee: علي (EMP003)
Scheduled Start: 08:00
Actual Check-In: —

النتيجة:
- Home KPI: +0 دقيقة تأخير
- Absence KPI: +1 غائب
- Attendance: Badge "غائب" + "—"
- TimeTable: +1 يوم غياب
```

---

**الحالة:** مستعد للتنفيذ  
**الوقت المتوقع:** 30-45 دقيقة  
**مستوى الخطورة:** منخفض (لا يؤثر على بيانات موجودة)
