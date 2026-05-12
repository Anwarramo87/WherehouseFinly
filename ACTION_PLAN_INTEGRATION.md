# خطة العمل الشاملة - Full Integration Action Plan
**بتاريخ:** 12 مايو 2026  
**الأولوية:** 🔴 حرجة  
**المسؤول:** فريق التطوير  

---

## 📊 ملخص الحالة الحالية

### ✅ ما هو مكتمل
- **Frontend UI**: 100% - جميع الصفحات والمودالات جاهزة
- **API Client**: 100% - مع interceptors والمصادقة
- **Data Hooks**: 100% - 38+ خطاف متخصص
- **Components**: 100% - جميع المكونات جاهزة
- **TypeScript Types**: 100% - جميع الأنواع معرفة

### ⚠️ ما يحتاج إصلاح/تحديث
- **Backend Endpoints**: ❌ 0% - لا توجد endpoints مطبقة
- **API Integration**: 95% - محتاج فقط verification من الـ backend
- **Error Handling**: ✅ جاهزة - لكن محتاج test مع أخطاء حقيقية

---

## 🎯 المهام الفورية (This Week)

### ✅ المهمة 1: توثيق Backend Requirements
**الحالة:** PENDING  
**المدة المتوقعة:** 2 ساعة  

```yaml
المطلوب:
  - ✅ تم: تحليل جميع API calls في الـ Frontend
  - ✅ تم: قائمة كاملة بـ 16 endpoint مفقود
  - ✅ تم: Prisma Schema يوضح البيانات المطلوبة
  - ⏳ قيد الانتظار: إرسال للفريق الخلفي

الملفات المرجعية:
  - INTEGRATION_STATUS_AR.md (جديد)
  - docs/DASHBOARD_EXPANSION_BACKEND_REQUIREMENTS.md (موجود)
```

---

### ✅ المهمة 2: إنشاء Backend Endpoints (NestJS)
**الحالة:** NOT STARTED  
**المدة المتوقعة:** 7-10 أيام  
**المسؤول:** Backend Team  

#### الـ Endpoints المطلوبة:

**1️⃣ Employees Endpoints**
```typescript
// ✅ يجب تطبيق:
GET    /api/employees                 // جلب جميع الموظفين
GET    /api/employees/:id             // جلب موظف معين
POST   /api/employees                 // إضافة موظف جديد
PUT    /api/employees/:id             // تعديل بيانات موظف
DELETE /api/employees/:id             // حذف موظف
GET    /api/employees/stats           // إحصائيات الموظفين (الأهم!)

// Query Parameters المدعومة:
- status: "active" | "terminated" | "on-leave"
- department: string
- search: string (اسم أو ID)
- page: number
- limit: number (max 200)
```

**2️⃣ Attendance Endpoints**
```typescript
GET    /api/attendance                // سجلات الحضور
GET    /api/attendance/:id            // سجل حضور معين
POST   /api/attendance                // تسجيل حضور/غياب جديد
DELETE /api/attendance/:id            // حذف سجل حضور
GET    /api/attendance/alerts         // تنبيهات: غياب، تأخير، عمل إضافي

// Params:
- date: YYYY-MM-DD
- type: "IN" | "OUT"
- limit: number
```

**3️⃣ Advances (السلف) Endpoints**
```typescript
GET    /api/advances                  // جميع السلف
POST   /api/advances                  // طلب سلفة جديدة
PATCH  /api/advances/:id              // تعديل حالة الطلب
DELETE /api/advances/:id              // حذف طلب سلفة

// Response يجب يتضمن:
- id, employeeId, totalAmount
- remainingAmount, issueDate
- status: "pending" | "approved" | "rejected"
```

**4️⃣ Penalties (العقوبات) Endpoints**
```typescript
GET    /api/penalties                 // جميع العقوبات
POST   /api/penalties                 // إضافة عقوبة
DELETE /api/penalties/:id             // حذف عقوبة

// Response:
- id, employeeId, amount, category
- reason, issueDate
```

**5️⃣ Departments (الأقسام) Endpoints**
```typescript
GET    /api/departments               // جميع الأقسام
POST   /api/departments               // إضافة قسم
PUT    /api/departments/:id           // تعديل قسم
DELETE /api/departments/:id           // حذف قسم
```

**6️⃣ Leaves (الإجازات) Endpoints**
```typescript
GET    /api/leaves                    // جميع الإجازات
POST   /api/leaves                    // طلب إجازة جديدة
PATCH  /api/leaves/:id                // الموافقة/الرفض
```

**7️⃣ Salaries Endpoints**
```typescript
GET    /api/salaries                  // بيانات الرواتب
GET    /api/payroll/summary           // ملخص الرواتب
```

---

### Response Format المتوقع

#### ✅ Success Response (200)
```json
{
  "success": true,
  "data": {
    // البيانات المطلوبة
  },
  "pagination": {
    "current": 1,
    "pages": 5,
    "total": 100,
    "limit": 20
  }
}
```

#### ❌ Error Response (4xx/5xx)
```json
{
  "success": false,
  "error": {
    "message": "رسالة الخطأ بالعربية",
    "code": "ERROR_CODE"
  }
}
```

#### 🔐 Authentication Header
```
Authorization: Bearer {token}
```

---

## 📋 المهام الثانوية (Next 2 Weeks)

### ✅ المهمة 3: إنشاء Mock Data للاختبار
**الحالة:** PENDING  
**المدة:** 3 ساعات  

```typescript
// في lib/mock-data.ts
export const MOCK_EMPLOYEES = [
  {
    employeeId: "EMP001",
    name: "أحمد محمود",
    email: "ahmad@factory.com",
    jobTitle: "عامل إنتاج",
    department: "الإنتاج",
    status: "active",
    hourlyRate: { $numberDecimal: "150" },
    scheduledStart: "08:00",
    scheduledEnd: "16:00"
  },
  // ... 20+ موظف
];

export const MOCK_ATTENDANCE = [
  {
    employeeId: "EMP001",
    type: "IN",
    timestamp: "2026-05-12T08:05:00Z"
  },
  // ... 50+ سجل
];

// ... بيانات السلف، العقوبات، الإجازات
```

### ✅ المهمة 4: اختبار Integration
**الحالة:** PENDING  
**المدة:** 5 ساعات  

```bash
# اختبارات يجب تمريرها:
npm run test:integration

# الحالات المطلوب اختبارها:
✓ جلب بيانات الموظفين بنجاح
✓ عرض الإحصائيات في Dashboard
✓ فتح وإغلاق الموديالات
✓ معالجة الأخطاء (401, 404, 500)
✓ تحديث البيانات بعد العملية
✓ عرض رسائل نجاح/فشل
```

---

## 🚀 خطة الإطلاق (Release Plan)

### Phase 1: Soft Launch (للاختبار الداخلي)
```
Week 1:
- ✅ Deploy Backend إلى Staging
- ✅ اختبار جميع الـ Endpoints
- ✅ إصلاح الأخطاء
```

### Phase 2: Beta (مستخدمين محددين)
```
Week 2:
- ✅ Deploy Frontend مع Backend
- ✅ جمع ملاحظات المستخدمين
- ✅ إصلاح المشاكل العاجلة
```

### Phase 3: Production (الإطلاق الرسمي)
```
Week 3:
- ✅ النسخة النهائية
- ✅ توثيق شامل
- ✅ تدريب الموظفين
```

---

## 📝 Requirements تفصيلية للبيانات

### Employee Schema
```typescript
interface Employee {
  id: string;                    // MongoDB ObjectId
  employeeId: string;            // EMP + 3+ أرقام (فريد)
  name: string;                  // الاسم الكامل
  email: string;                 // البريد الإلكتروني (فريد)
  phone?: string;                // رقم الهاتف
  
  // معلومات الوظيفة
  jobTitle: string;              // المسمى الوظيفي
  department: string;            // القسم
  status: "active" | "terminated" | "on-leave";
  
  // بيانات الراتب والساعات
  hourlyRate: Decimal;           // أجر الساعة
  scheduledStart: string;        // HH:mm (مثال: "08:00")
  scheduledEnd: string;          // HH:mm (مثال: "16:00")
  
  // تواريخ
  hireDate: DateTime;
  terminationDate?: DateTime;
  
  // timestamps
  createdAt: DateTime;
  updatedAt: DateTime;
}
```

### Attendance Schema
```typescript
interface Attendance {
  id: string;
  employeeId: string;
  type: "IN" | "OUT";
  timestamp: DateTime;           // ISO 8601
  location?: string;             // اختياري: موقع التسجيل
  device?: string;               // اختياري: الجهاز المستخدم
  createdAt: DateTime;
}
```

### Advance Schema
```typescript
interface Advance {
  id: string;
  employeeId: string;
  totalAmount: Decimal;
  remainingAmount: Decimal;
  installments?: number;         // عدد الأقساط
  issueDate: DateTime;
  dueDate?: DateTime;
  status: "pending" | "approved" | "rejected";
  reason?: string;
  approvedBy?: string;           // User ID
  notes?: string;
  createdAt: DateTime;
  updatedAt: DateTime;
}
```

### Attendance Alert (للموديال)
```typescript
interface AttendanceAlert {
  employeeId: string;
  name: string;
  department: string;
  status: "present" | "absent" | "late";
  scheduledStart: string;        // HH:mm
  checkIn?: string;              // ISO Timestamp
  minutesLate?: number;
}
```

---

## 🔒 نقاط التحقق الأمنية

```yaml
Security Checklist:
  ✓ Bearer Token Validation
  ✓ CORS Configuration
  ✓ Rate Limiting (في الـ API Gateway)
  ✓ Input Validation & Sanitization
  ✓ SQL Injection Prevention (Prisma ORM)
  ✓ Logging & Monitoring
  ✓ Error Messages (لا توضح تفاصيل حساسة)
```

---

## 📊 Monitoring & Metrics

```yaml
KPIs للمراقبة:
  - API Response Time: < 500ms
  - Error Rate: < 1%
  - Uptime: > 99.5%
  - User Satisfaction: > 4.5/5

Logging يجب أن يتضمن:
  - Request/Response logs
  - Error traces
  - Performance metrics
  - User actions
```

---

## 🎓 Documentation Required

```bash
# تحديثات التوثيق المطلوبة:

1. API Documentation
   - OpenAPI/Swagger spec
   - كل endpoint مع examples

2. Database Schema
   - Prisma schema المحدث
   - Relationships و Constraints

3. Error Codes Reference
   - كل error code معروف
   - كيفية معالجته

4. Deployment Guide
   - خطوات البناء والنشر
   - متطلبات البيئة

5. User Manual (بالعربية)
   - شرح الميزات
   - خطوات الاستخدام
```

---

## ⚡ تعليمات المطورين

### للـ Backend Developer:
```bash
# 1. Clone the repo و اقرأ docs/
git clone ...
cat docs/INTEGRATION_STATUS_AR.md

# 2. استخدم الـ Requirements في هذا الملف
# 3. طبق الـ Endpoints بالترتيب:
#    - Employees (الأساسي)
#    - Attendance (الحضور)
#    - Advances (السلف)
#    - Penalties (العقوبات)

# 4. Test كل endpoint:
npm run test:e2e

# 5. Deploy إلى Staging:
npm run deploy:staging
```

### للـ Frontend Developer:
```bash
# 1. الـ Hooks جاهزة في hooks/
# 2. لا تحتاج تعديل كود Frontend
# 3. فقط تأكد من:
#    - API_URL صحيحة في .env
#    - Token authentication يعمل
#    - Error handling يعمل

# 4. Test:
npm run dev
# ثم navigate إلى /home وقم باختبار الموديالات
```

---

## 📞 نقاط التواصل

| الدور | الشخص | التواصل |
|------|------|---------|
| Frontend Lead | - | - |
| Backend Lead | - | - |
| QA Lead | - | - |
| Project Manager | - | - |

---

## ✅ Checklist للإطلاق النهائي

```yaml
Pre-Launch:
  ☐ جميع الـ Endpoints مطبقة
  ☐ جميع الاختبارات تمر
  ☐ 0 console errors/warnings
  ☐ Error handling يعمل
  ☐ Performance مقبول (< 2 sec load)
  ☐ Security checks تمر
  ☐ Documentation محدثة
  ☐ Staging tests تمر

Launch Day:
  ☐ Final sanity check
  ☐ Database migrations تمر
  ☐ Deploy Backend
  ☐ Deploy Frontend
  ☐ Monitor logs
  ☐ جاهز للـ user support

Post-Launch:
  ☐ جمع feedback
  ☐ إصلاح أي critical bugs
  ☐ تحسين الأداء إذا لزم
  ☐ توثيق lessons learned
```

---

## 🎯 Next Steps

**الآن:**
1. ✅ شارك هذا الملف مع الفريق الخلفي
2. ✅ اعقد اجتماع تخطيط مع الـ Backend team
3. ✅ ابدأ بتطوير الـ Endpoints

**غداً:**
1. أول Endpoints جاهزة
2. اختبار Endpoints
3. تحديث الـ Frontend إذا لزم

**هذا الأسبوع:**
1. جميع Endpoints جاهزة
2. Integration testing مكتمل
3. Staging deployment

---

**تم إعداده بواسطة:** AI Assistant  
**آخر تحديث:** 12 مايو 2026  
**النسخة:** 1.0
