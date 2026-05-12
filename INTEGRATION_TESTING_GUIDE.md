# دليل اختبار التكامل الكامل
## Integration Testing Guide (AR/EN)

---

## 1️⃣ إعداد بيئة الاختبار

### المرحلة 1: تثبيت Mock API

```bash
# نسخ وتشغيل Mock API
bash setup-mock-api.sh
cd mock-api
npm install
npm start

# الخرج المتوقع:
# ✅ Mock API Server running on http://localhost:3001
# 📝 Test Token: eyJhbGc...
```

### المرحلة 2: تكوين بيئة التطوير

```bash
# إضافة إلى .env.local
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_AUTH_TOKEN=YOUR_TEST_TOKEN_HERE
```

### المرحلة 3: تشغيل Frontend مع Mock API

```bash
npm run dev

# في متصفح جديد:
# http://localhost:3000
```

---

## 2️⃣ حالات الاختبار الرئيسية

### ✅ اختبار 1: تحميل صفحة Dashboard

**الهدف**: التحقق من تحميل بيانات الإحصائيات الرئيسية

**الخطوات**:
1. افتح `http://localhost:3000/dashboard/home`
2. راقب Console للأخطاء
3. تحقق من ظهور:
   - عدد الموظفين الكلي ✅
   - الموظفين النشطين اليوم ✅
   - الغائبين ✅
   - المتأخرين ✅
   - ساعات العمل الإضافي ✅

**النتيجة المتوقعة**:
```json
{
  "kpis": {
    "totalEmployees": 3,
    "activeToday": 2,
    "totalAbsentToday": 0,
    "totalLateMinutesToday": 30,
    "totalOvertimeMinutesToday": 15,
    "totalDueSalaries": "410000000.00"
  },
  "isLoading": false
}
```

---

### ✅ اختبار 2: فتح Modal الموظفين الحاضرين

**الهدف**: التحقق من جلب البيانات عند النقر على البطاقة

**الخطوات**:
1. في Dashboard Home انقر على بطاقة "الحاضرين" (Present)
2. انتظر ظهور Modal
3. تحقق من ظهور قائمة الموظفين

**النتيجة المتوقعة**:
```
Modal Title: "الموظفين الحاضرين (2)"
- أحمد محمود | الإنتاج | 08:05
- سارة علي | الإدارة | 08:45
```

**ملاحظات**:
- يجب أن تظهر بيانات من `/api/attendance` مع `type=IN`
- يجب عرض الوقت بصيغة HH:mm
- يجب أن يختفي Modal عند الضغط على X أو خارج الـ Modal

---

### ✅ اختبار 3: فتح Modal الموظفين المتأخرين

**الهدف**: التحقق من معالجة البيانات المفلترة

**الخطوات**:
1. انقر على "المتأخرين" (Late)
2. انتظر جلب البيانات من `/api/attendance/alerts`
3. تحقق من عرض معلومات التأخير

**النتيجة المتوقعة**:
```
Modal Title: "الموظفين المتأخرين (1)"
- سارة علي | الإدارة | 30 دقيقة
  وقت الدوام: 08:30 | حضور: 09:00
```

---

### ✅ اختبار 4: تحميل قائمة الموظفين

**الهدف**: اختبار pagination والتصفية

**الخطوات**:
1. افتح صفحة الموظفين: `/dashboard/employees`
2. تحقق من ظهور 3 موظفين في الجدول
3. حاول البحث عن "أحمد"
4. حاول التصفية حسب القسم

**النتيجة المتوقعة**:
```
جدول بـ 3 صفوف:
1. EMP001 | أحمد محمود | الإنتاج | نشط | 150.00 SYP
2. EMP002 | سارة علي | الإدارة | نشط | 120.00 SYP
3. EMP003 | علي حسن | التوزيع | في إجازة | 140.00 SYP
```

**الوظائف المتوقعة**:
- البحث يقلل النتائج ✅
- التصفية حسب القسم ✅
- Pagination للصفحات الأخرى ✅

---

### ✅ اختبار 5: إنشاء موظف جديد

**الهدف**: اختبار Form validation والـ POST request

**الخطوات**:
1. انقر على زر "إضافة موظف جديد"
2. ملأ النموذج:
   ```
   رقم الموظف: EMP004
   الاسم: محمود علي
   البريد: mahmoud@factory.com
   المسمى الوظيفي: عامل جودة
   القسم: الجودة
   الراتب بالساعة: 160.00
   ```
3. انقر "إضافة"

**النتيجة المتوقعة**:
```json
POST /api/employees
{
  "employeeId": "EMP004",
  "name": "محمود علي",
  "email": "mahmoud@factory.com",
  "jobTitle": "عامل جودة",
  "department": "الجودة",
  "hourlyRate": 160.00
}

Response:
{
  "success": true,
  "data": { /* الموظف الجديد */ }
}

UI: رسالة نجاح "تم إضافة الموظف بنجاح" ✅
```

**Validation يجب اختباره**:
- ❌ رقم موظف فارغ → "هذا الحقل مطلوب"
- ❌ رقم موظف `ABC123` → "صيغة خاطئة: EMP + أرقام"
- ❌ بريد غير صحيح → "بريد إلكتروني غير صحيح"
- ✅ جميع الحقول ممتلئة بشكل صحيح → نجاح

---

### ✅ اختبار 6: جلب بيانات الرواتب والمستحقات

**الهدف**: اختبار تحويل Decimal من MongoDB

**الخطوات**:
1. افتح صفحة الرواتب: `/dashboard/salaries`
2. تحقق من عرض الأرقام الكبيرة بشكل صحيح

**النتيجة المتوقعة**:
```
الرواتب الأساسية: 450,000,000.00 SYP
ساعات إضافية: 15,000,000.00 SYP
السلفات المستحقة: 50,000,000.00 SYP
الخصومات: 5,000,000.00 SYP
صافي الرواتب: 410,000,000.00 SYP
```

**ملاحظات**:
- يجب تنسيق الأرقام مع الفواصل
- يجب عرض العملة (SYP)
- لا يجب عرض `.00000000` الزائدة

---

## 3️⃣ حالات اختبار الأخطاء

### 🔴 اختبار 1: 401 Unauthorized

**الهدف**: التحقق من معالجة عدم التفويض

**الخطوات**:
1. احذف Token من localStorage
2. أعد تحميل الصفحة
3. لاحظ السلوك

**السلوك المتوقع**:
- إعادة توجيه إلى صفحة تسجيل الدخول ✅
- رسالة: "انتهت صلاحية جلستك، يرجى إعادة تسجيل الدخول" ✅
- مسح localStorage ✅

---

### 🔴 اختبار 2: 404 Not Found

**الهدف**: التحقق من معالجة البيانات المفقودة

**الخطوات**:
1. ابحث عن موظف برقم `EMP999`
2. لاحظ الرد

**السلوك المتوقع**:
```
رسالة الخطأ:
"الموظف المطلوب غير موجود"

UI: ظهور صفحة فارغة مع:
- رسالة الخطأ
- زر للعودة
- نموذج للبحث مجددًا
```

---

### 🔴 اختبار 3: 500 Server Error

**الهدف**: التحقق من المرونة عند أخطاء الخادم

**الخطوات**:
1. عطل Mock API: `Ctrl+C`
2. جرّب جلب البيانات من UI
3. راقب معالجة الخطأ

**السلوك المتوقع**:
```
رسالة الخطأ:
"حدث خطأ في الاتصال بالخادم. يرجى المحاولة لاحقًا"

Retry Button: مرئي ✅
Console Error: رسالة تفصيلية للمطورين ✅
```

---

### 🔴 اختبار 4: Network Timeout

**الهدف**: التحقق من معالجة انقطاع الشبكة

**الخطوات**:
1. افتح DevTools → Network
2. اختر "Offline"
3. جرّب أي عملية

**السلوك المتوقع**:
```
في خلال 5 ثوان:
رسالة: "لا توجد اتصالية. تأكد من اتصالك بالإنترنت"
زر: "إعادة المحاولة"

عند استعادة الاتصال:
- الزر يعيد المحاولة تلقائيًا
- أو يظهر خيار يدوي
```

---

## 4️⃣ اختبار الأداء والتحميل

### 📊 اختبار 1: سرعة التحميل

**الهدف**: قياس LCP (Largest Contentful Paint)

**الخطوات**:
1. افتح DevTools → Lighthouse
2. اختر "Mobile"
3. انقر "Analyze page load"

**النتيجة المتوقعة**:
- ✅ FCP < 1.5 ثانية
- ✅ LCP < 2.5 ثانية
- ✅ CLS < 0.1
- ✅ Performance Score > 85

---

### 📊 اختبار 2: عدد الـ Requests

**الهدف**: التحقق من عدم الحمل الزائد على API

**الخطوات**:
1. DevTools → Network
2. أعد تحميل Dashboard
3. عد الـ Requests

**النتيجة المتوقعة**:
```
API Calls المتوقعة:
1. GET /api/employees → 1 request
2. GET /api/employees/stats → 1 request
3. GET /api/attendance/stats → 1 request
4. GET /api/attendance → 1 request
5. GET /api/attendance/alerts → 1 request
6. GET /api/salaries → 1 request
7. GET /api/advances → 1 request
8. GET /api/penalties → 1 request

المجموع: ~8 requests (قابل للتحسين إلى 3-4 مع aggregation)
```

---

## 5️⃣ اختبار التوافقية

### 🌐 المتصفحات المدعومة

```
✅ Chrome 120+
✅ Firefox 121+
✅ Safari 17+
✅ Edge 120+
❌ IE 11 (غير مدعوم)
```

### 📱 الأجهزة

```
✅ Desktop (1920x1080)
✅ Tablet (768x1024)
⚠️  Mobile (375x667) - يحتاج responsive design
```

---

## 6️⃣ الاختبارات التلقائية (Unit Tests)

### تثبيت المتطلبات

```bash
npm install --save-dev vitest @testing-library/react @testing-library/jest-dom msw
```

### إنشاء ملف اختبار

**`__tests__/hooks/useDashboard.test.ts`**:

```typescript
import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { useDashboard } from '@/hooks/useDashboard';

const server = setupServer(
  http.get('/api/employees/stats', () => {
    return HttpResponse.json({
      success: true,
      data: {
        totalEmployees: 3,
        activeEmployees: 2,
        byDepartment: { "الإنتاج": 1, "الإدارة": 1, "التوزيع": 1 }
      }
    });
  }),

  http.get('/api/attendance/stats', () => {
    return HttpResponse.json({
      success: true,
      data: {
        totalPresent: 2,
        totalAbsent: 0,
        totalLate: 1,
        totalOvertimes: 1
      }
    });
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('useDashboard Hook', () => {
  it('يجب أن يجلب بيانات KPI بنجاح', async () => {
    const { result } = renderHook(() => useDashboard());

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.kpis).toEqual({
      totalEmployees: 3,
      activeToday: 2,
      totalAbsentToday: 0,
      totalLateMinutesToday: 30,
      totalOvertimeMinutesToday: 15
    });
  });

  it('يجب أن يتعامل مع الأخطاء بشكل صحيح', async () => {
    server.use(
      http.get('/api/employees/stats', () => {
        return HttpResponse.json(
          { success: false, error: { message: 'Server Error' } },
          { status: 500 }
        );
      })
    );

    const { result } = renderHook(() => useDashboard());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // يجب أن تكون هناك قيم افتراضية
    expect(result.current.kpis.totalEmployees).toBeDefined();
  });
});
```

### تشغيل الاختبارات

```bash
npm run test

# Output:
# ✅ useDashboard Hook
#   ✓ يجب أن يجلب بيانات KPI بنجاح (250ms)
#   ✓ يجب أن يتعامل مع الأخطاء بشكل صحيح (150ms)
#
# Tests: 2 passed, 2 total
```

---

## 7️⃣ قائمة التحقق النهائية

### قبل الإطلاق في Production

- [ ] ✅ تم اختبار جميع 6 حالات اختبار رئيسية
- [ ] ✅ تم اختبار جميع 4 حالات أخطاء
- [ ] ✅ الأداء مقبول (LCP < 2.5s)
- [ ] ✅ عدد الـ requests محسّن
- [ ] ✅ التوافقية مع المتصفحات الرئيسية ✅
- [ ] ✅ الترجمة والـ RTL تعمل بشكل صحيح
- [ ] ✅ الوحدات/الكسور العشرية تُعرض بشكل صحيح
- [ ] ✅ التواريخ والأوقات بتنسيق صحيح
- [ ] ✅ لا توجد تحذيرات في Console
- [ ] ✅ تم توثيق جميع المشاكل المكتشفة

---

## 🚀 الخطوات التالية

1. **في الأسبوع الأول**: تنفيذ جميع حالات الاختبار اليدوية
2. **في الأسبوع الثاني**: نقل الـ Mock API إلى Staging مع بيانات حقيقية
3. **في الأسبوع الثالث**: الاختبار الشامل مع Backend الحقيقي
4. **في الأسبوع الرابع**: الإطلاق في Production مع مراقبة الأداء

---

**آخر تحديث**: 12 مايو 2026  
**الحالة**: جاهز للتطبيق  
**المسؤول**: فريق QA والمطورين
