# 📋 تقرير شامل لجميع استدعاءات API والـ Fetch في الفرونت إند
**Factory Management System - نظام إدارة المصنع**

---

## 📌 ملخص تنفيذي
- **العدد الكلي للـ Hooks**: 22 hook رئيسية
- **طريقة الاستدعاء الرئيسية**: Axios Client (`apiClient`) عبر React Query (`@tanstack/react-query`)
- **نقطة الوكيل المركزية**: `/app/api/[...path]/route.ts` (Next.js Proxy)
- **Caching Strategy**: React Query مع `queryKeys` مركزية

---

## 🔗 البنية الكلية للـ API

```
Frontend (Next.js)
    ↓
    └─→ /app/api/[...path]/route.ts (Proxy)
        ↓
        └─→ BACKEND_API_URL
            ├─ Local: http://localhost:5001/api
            └─ Remote: https://werehouse-production-dabe.up.railway.app/api
```

---

## 📚 تفصيل جميع الـ API Calls حسب الصفحات والـ Hooks

### ✅ 1️⃣ **Employees Module (الموظفين)**

#### 📄 الملف: `hooks/useEmployees.ts`
**المسار**: `c:\Users\Abd al Rhman ky\Desktop\Next\factory\hooks\useEmployees.ts`

**الوصف**: إدارة قائمة الموظفين (CRUD)

| رقم | العملية | الـ Endpoint | Method | المُدخلات | المُخرجات | الحالة |
|-----|---------|-------------|--------|----------|----------|--------|
| 1.1 | جلب جميع الموظفين | `/employees` | GET | `params: { status?, department?, search?, page?, limit? }` | `{ employees: Employee[], pagination: {} }` | ✅ |
| 1.2 | إضافة موظف جديد | `/employees` | POST | `{ employeeId, name, hourlyRate, department, ... }` | `{ employee: Employee }` | ✅ |
| 1.3 | تعديل بيانات موظف | `/employees/{id}` | PUT | `{ data: Partial<Employee> }` | `{ employee: Employee }` | ✅ |
| 1.4 | حذف موظف | `/employees/{id}` | DELETE | - | `{ message: string }` | ✅ |
| 1.5 | الحصول على موظف واحد | `/employees/{id}` | GET | - | `{ employee: Employee }` | ✅ |

**Query Keys Used**:
- `["employees", status, terminated, department, search, page, limit, fetchAll]`

**Mutations**:
- `createMutation` → إضافة موظف جديد
- `updateMutation` → تعديل بيانات الموظف
- `deleteMutation` → حذف موظف

**Error Handling**: 
- رسائل خطأ مخصصة بالعربية
- التحقق من صيغة `employeeId` (EMP + أرقام)

---

#### 📄 الملف: `app/(dashboard)/employees/page.tsx`
**المسار**: `c:\Users\Abd al Rhman ky\Desktop\Next\factory\app\(dashboard)\employees\page.tsx`

**الاستخدامات**:
- عرض قائمة الموظفين مع الفلترة والبحث
- إضافة/تعديل/حذف الموظفين

---

### ✅ 2️⃣ **Salaries Module (الرواتب)**

#### 📄 الملف: `hooks/useSalaries.ts`
**المسار**: `c:\Users\Abd al Rhman ky\Desktop\Next\factory\hooks\useSalaries.ts`

**الوصف**: إدارة بيانات الرواتب والمكافآت

| رقم | العملية | الـ Endpoint | Method | المُدخلات | المُخرجات |
|-----|---------|-------------|--------|----------|----------|
| 2.1 | جلب جميع الرواتب | `/salary` | GET | - | `{ salaries: Salary[] }` |
| 2.2 | جلب راتب موظف واحد | `/salary/{employeeId}` | GET | - | `{ salary: Salary \| null }` |
| 2.3 | تحديث/إنشاء راتب | `/salary/{employeeId}` | PUT | `{ baseSalary, lumpSumSalary, livingAllowance, ... }` | `{ salary: Salary }` |
| 2.4 | حذف سجل الراتب | `/salary/{employeeId}` | DELETE | - | `{ message: string }` |

**Canonical Field Names**:
- `baseSalary` ✅
- `lumpSumSalary` (الراتب المقطوع)
- `livingAllowance` (بدل غلاء المعيشة)
- `extraEffortAllowance` ✅ (NOT `extraEffort`)
- `responsibilityAllowance`
- `productionIncentive`

**Query Keys**:
- `["salaries"]` → جميع الرواتب
- `["salary", employeeId]` → راتب فردي

---

#### 📄 الملف: `app/(dashboard)/salaries/page.tsx`
**المسار**: `c:\Users\Abd al Rhman ky\Desktop\Next\factory\app\(dashboard)\salaries\page.tsx`

**الاستخدامات**:
- عرض قائمة الرواتب
- تحديث بيانات الراتب

---

### ✅ 3️⃣ **Attendance Module (الحضور)**

#### 📄 الملف: `hooks/useAttendance.ts`
**المسار**: `c:\Users\Abd al Rhman ky\Desktop\Next\factory\hooks\useAttendance.ts` (546 سطر)

**الوصف**: إدارة سجلات الحضور والغياب

| رقم | العملية | الـ Endpoint | Method | المُدخلات | الملاحظات |
|-----|---------|-------------|--------|----------|----------|
| 3.1 | جلب سجلات الحضور | `/attendance` | GET | `{ date?, employeeId?, page?, limit? }` | دعم Pagination |
| 3.2 | تسجيل حضور يدوي | `/attendance` | POST | `{ employeeId, timestamp, type: "IN"\|"OUT" }` | Mark attendance |
| 3.3 | تحديث سجل حضور | `/attendance/{id}` | PUT | `{ timestamp?, verified? }` | تعديل الوقت |
| 3.4 | حذف سجل حضور | `/attendance/{id}` | DELETE | - | - |
| 3.5 | جلب السجلات اليومية | `/attendance/daily-summary` | GET | `{ date, employeeId? }` | ملخص اليوم |

**Query Keys**:
- `["attendance", date, employeeId, page]`
- `["attendance-daily"]`

---

#### 📄 الملف: `app/(dashboard)/attendance/page.tsx`

**الاستخدامات**:
- عرض سجلات الحضور اليومية
- تسجيل حضور يدوي
- تصحيح الأوقات

---

### ✅ 4️⃣ **Advances Module (السلف)**

#### 📄 الملف: `hooks/useAdvances.ts`
**المسار**: `c:\Users\Abd al Rhman ky\Desktop\Next\factory\hooks\useAdvances.ts`

**الوصف**: إدارة سلف الموظفين

| رقم | العملية | الـ Endpoint | Method | المُدخلات |
|-----|---------|-------------|--------|----------|
| 4.1 | جلب السلف | `/advances` | GET | `{ employeeId? }` |
| 4.2 | إضافة سلفة جديدة | `/advances` | POST | `{ employeeId, advanceType, totalAmount, installmentAmount }` |
| 4.3 | تحديث السلفة | `/advances/{id}` | PUT | `{ remainingAmount?, installmentAmount?, notes? }` |
| 4.4 | حذف السلفة | `/advances/{id}` | DELETE | - |

**Advance Types**:
- `"salary"` (سلفة راتب)
- `"clothing"` (بدل ملابس)
- `"other"` (أخرى)

---

### ✅ 5️⃣ **Bonuses Module (المكافآت والمساعدات)**

#### 📄 الملف: `hooks/useBonuses.ts`
**المسار**: `c:\Users\Abd al Rhman ky\Desktop\Next\factory\hooks\useBonuses.ts`

**الوصف**: إدارة المكافآت والمساعدات

| رقم | العملية | الـ Endpoint | Method | المُدخلات |
|-----|---------|-------------|--------|----------|
| 5.1 | جلب المكافآت | `/bonuses` | GET | `{ employeeId?, period? }` |
| 5.2 | إضافة مكافأة | `/bonuses` | POST | `{ employeeId, bonusAmount, assistanceAmount, period }` |
| 5.3 | تحديث المكافأة | `/bonuses/{id}` | PUT | `{ bonusAmount?, assistanceAmount? }` |
| 5.4 | حذف المكافأة | `/bonuses/{id}` | DELETE | - |

---

### ✅ 6️⃣ **Dashboard Module (لوحة التحكم)**

#### 📄 الملف: `hooks/useDashboard.ts`
**المسار**: `c:\Users\Abd al Rhman ky\Desktop\Next\factory\hooks\useDashboard.ts` (230 سطر)

**الوصف**: جلب إحصائيات لوحة التحكم

| رقم | العملية | الـ Endpoint | Method | المُدخلات | التفاصيل |
|-----|---------|-------------|--------|----------|----------|
| 6.1 | إحصائيات الموظفين | `/employees/stats` | GET | - | Total, Active, By Department |
| 6.2 | إحصائيات الحضور | `/attendance/stats` | GET | `{ date }` | Present, Absent, Late |
| 6.3 | إحصائيات الرواتب | `/salary/summary` | GET | - | Total Payroll, KPIs |
| 6.4 | إحصائيات المخزون | `/inventory/stats` | GET | - | Products Count |

**KPIs Calculated**:
- `totalEmployees`
- `activeToday`
- `totalAbsentToday`
- `totalDueSalaries`
- `totalLateMinutesToday`
- `totalOvertimeMinutesToday`

**Query Keys**:
- `["dashboard-stats"]` (مع Fallbacks)

**استخدام المحرك**:
```tsx
app/(dashboard)/home/page.tsx
```

---

### ✅ 7️⃣ **Payroll Module (حسابات الرواتب)**

#### 📄 الملف: `hooks/usePayroll.ts`
**المسار**: `c:\Users\Abd al Rhman ky\Desktop\Next\factory\hooks\usePayroll.ts`

| رقم | العملية | الـ Endpoint | Method | المُدخلات |
|-----|---------|-------------|--------|----------|
| 7.1 | جلب ملخص كشوف الرواتب | `/payroll/summary` | GET | `{ period, employeeId? }` |
| 7.2 | إنشاء كشف راتب | `/payroll/generate` | POST | `{ period, employeeIds? }` |
| 7.3 | تصدير كشف الرواتب | `/payroll/export` | GET | `{ period, format: "xlsx"\|"pdf" }` |

---

#### 📄 الملف: `hooks/usePayrollReport.ts`
**المسار**: `c:\Users\Abd al Rhman ky\Desktop\Next\factory\hooks\usePayrollReport.ts`

| رقم | العملية | الـ Endpoint | Method | المُدخلات |
|-----|---------|-------------|--------|----------|
| 7.4 | جلب تقرير الرواتب | `/payroll/report` | GET | `{ startDate, endDate, format? }` |
| 7.5 | معالجة الرواتب | `/payroll/process` | POST | `{ period, employeeIds }` |

---

### ✅ 8️⃣ **Discounts Module (الخصومات)**

#### 📄 الملف: `hooks/useDiscounts.ts`
**المسار**: `c:\Users\Abd al Rhman ky\Desktop\Next\factory\hooks\useDiscounts.ts`

| رقم | العملية | الـ Endpoint | Method | المُدخلات | التفاصيل |
|-----|---------|-------------|--------|----------|----------|
| 8.1 | جلب الخصومات | `/discounts` | GET | `{ employeeId?, type? }` | - |
| 8.2 | إضافة خصم | `/discounts` | POST | `{ employeeId, amount, reason, discountType }` | - |
| 8.3 | تحديث الخصم | `/discounts/{id}` | PUT | `{ amount?, reason?, applied? }` | - |
| 8.4 | حذف الخصم | `/discounts/{id}` | DELETE | - | - |

**Discount Types**:
- `"absence"` (غياب)
- `"lateness"` (تأخير)
- `"other"` (أخرى)

---

### ✅ 9️⃣ **Other Modules**

#### 📄 `hooks/useAttendanceDeductions.ts`
- جلب حسابات الخصومات: `GET /attendance/deductions`
- إضافة خصم: `POST /attendance/deductions`

#### 📄 `hooks/usePenalties.ts`
- جلب العقوبات: `GET /penalties`
- تطبيق عقوبة: `POST /penalties`

#### 📄 `hooks/useRewards.ts`
- جلب المكافآت: `GET /rewards`
- إضافة مكافأة: `POST /rewards`

#### 📄 `hooks/useRoles.ts`
- جلب الأدوار: `GET /roles`
- إنشاء دور: `POST /roles`
- تحديث الأدوار: `PUT /roles/{id}`

#### 📄 `hooks/useInventory.ts`
- جلب المخزون: `GET /inventory`
- تحديث المخزون: `PUT /inventory/{sku}`

#### 📄 `hooks/useFiles.ts`
- تحميل الملفات: `POST /files/upload`
- حذف الملفات: `DELETE /files/{fileId}`

#### 📄 `hooks/useImports.ts`
- استيراد الموظفين: `POST /imports/employees`
- التحقق من صحة الملف: `POST /imports/validate`

---

## 🌍 الصفحات الرئيسية وAPI Calls المرتبطة

### 📄 الصفحة: Home/Dashboard
**المسار**: `app/(dashboard)/home/page.tsx`

```typescript
// Endpoints:
GET /employees/stats          // إحصائيات الموظفين
GET /attendance               // سجلات الحضور (مع date param)
GET /attendance/stats         // ملخص الحضور
GET /salary/summary           // ملخص الرواتب
GET /inventory/stats          // إحصائيات المخزون
```

---

### 📄 الصفحة: Employees
**المسار**: `app/(dashboard)/employees/page.tsx`

```typescript
// Endpoints:
GET /employees                // جلب الموظفين (مع pagination & filters)
POST /employees               // إضافة موظف
PUT /employees/{id}           // تعديل موظف
DELETE /employees/{id}        // حذف موظف
GET /employees/{id}           // الحصول على بيانات موظف
```

---

### 📄 الصفحة: Attendance
**المسار**: `app/(dashboard)/attendance/page.tsx`

```typescript
// Endpoints:
GET /attendance               // جلب سجلات الحضور
POST /attendance              // تسجيل حضور يدوي
PUT /attendance/{id}          // تعديل سجل
DELETE /attendance/{id}       // حذف سجل
GET /attendance/daily-summary // ملخص يومي
```

---

### 📄 الصفحة: Salaries
**المسار**: `app/(dashboard)/salaries/page.tsx`

```typescript
// Endpoints:
GET /salary                   // جلب جميع الرواتب
GET /salary/{employeeId}      // راتب موظف واحد
PUT /salary/{employeeId}      // تحديث الراتب
DELETE /salary/{employeeId}   // حذف سجل الراتب
```

---

### 📄 الصفحة: Payroll
**المسار**: `app/(dashboard)/payroll/page.tsx`

```typescript
// Endpoints:
GET /payroll/summary          // ملخص كشوف الرواتب
POST /payroll/generate        // إنشاء كشف راتب
GET /payroll/export           // تصدير إلى Excel/PDF
POST /payroll/process         // معالجة الرواتب
```

---

### 📄 الصفحة: Advances
**المسار**: `app/(dashboard)/advances/page.tsx`

```typescript
// Endpoints:
GET /advances                 // جلب السلف
POST /advances                // إضافة سلفة
PUT /advances/{id}            // تحديث السلفة
DELETE /advances/{id}         // حذف السلفة
```

---

## 🔧 API Client Configuration

### 📄 الملف: `lib/api-client.ts`
**المسار**: `c:\Users\Abd al Rhman ky\Desktop\Next\factory\lib\api-client.ts`

```typescript
import axios from "axios";

const apiClient = axios.create({
  baseURL: "/api",  // يرسل إلى الـ Proxy (Next.js)
  timeout: 30000,
  withCredentials: true,  // إرسال الـ Cookies
});

// Error handling & 401 redirect
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear session & redirect to login
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export default apiClient;
```

---

### 📄 الملف: `lib/http/api.ts`
**المسار**: `c:\Users\Abd al Rhman ky\Desktop\Next\factory\lib\http\api.ts`

```typescript
export const api = {
  get: async <T>(url: string, config?: AxiosRequestConfig): Promise<T> => {
    const response = await apiClient.get<T>(url, config);
    return response.data;
  },
  
  post: async <T>(url: string, body?: unknown, config?: AxiosRequestConfig): Promise<T> => {
    const response = await apiClient.post<T>(url, body, config);
    return response.data;
  },
  
  put: async <T>(url: string, body?: unknown, config?: AxiosRequestConfig): Promise<T> => {
    const response = await apiClient.put<T>(url, body, config);
    return response.data;
  },
  
  delete: async <T>(url: string, config?: AxiosRequestConfig): Promise<T> => {
    const response = await apiClient.delete<T>(url, config);
    return response.data;
  },
};
```

---

### 📄 الملف: `lib/query-keys.ts`
**المسار**: `c:\Users\Abd al Rhman ky\Desktop\Next\factory\lib\query-keys.ts`

```typescript
export const queryKeys = {
  employees: {
    all: () => ["employees"],
    list: (filters) => ["employees", filters],
    detail: (id) => ["employees", id],
  },
  salary: {
    all: () => ["salaries"],
    detail: (employeeId) => ["salary", employeeId],
  },
  attendance: {
    all: () => ["attendance"],
    by_date: (date) => ["attendance", date],
  },
  // ... أكثر من 20 module
};
```

---

## 🛡️ Proxy Route (Next.js)

### 📄 الملف: `app/api/[...path]/route.ts`
**المسار**: `c:\Users\Abd al Rhman ky\Desktop\Next\factory\app\api\[...path]\route.ts`

**الوظيفة**: وسيط (Proxy) لجميع الطلبات من الفرونت إلى الباك إند

```typescript
export async function handler(request: NextRequest) {
  // 1. استخراج المسار
  const apiPath = extractPathAfterApi(request.nextUrl.pathname);
  
  // 2. بناء رابط الباك إند
  const backendUrl = new URL(BACKEND_API_URL);
  backendUrl.pathname = apiPath;
  backendUrl.search = request.nextUrl.search;
  
  // 3. إعادة توجيه الطلب
  const backendResponse = await fetch(backendUrl.toString(), {
    method: request.method,
    headers: prepareHeaders(request.headers),
    body: request.method !== "GET" ? await request.arrayBuffer() : null,
    credentials: "include",
  });
  
  // 4. معالجة CORS
  const responseHeaders = addCorsHeaders(backendResponse.headers);
  
  return new NextResponse(backendResponse.body, {
    status: backendResponse.status,
    headers: responseHeaders,
  });
}

// Handle all HTTP methods
export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const DELETE = handler;
export const PATCH = handler;
```

---

## 📊 ملخص الـ Endpoints

### Employees
- `GET /employees` → جلب قائمة
- `POST /employees` → إضافة
- `PUT /employees/{id}` → تعديل
- `DELETE /employees/{id}` → حذف

### Salary
- `GET /salary` → جميع الرواتب
- `GET /salary/{employeeId}` → راتب فردي
- `PUT /salary/{employeeId}` → تحديث
- `DELETE /salary/{employeeId}` → حذف

### Attendance
- `GET /attendance` → جلب السجلات
- `POST /attendance` → تسجيل يدوي
- `PUT /attendance/{id}` → تعديل
- `DELETE /attendance/{id}` → حذف
- `GET /attendance/stats` → الإحصائيات
- `GET /attendance/daily-summary` → ملخص يومي

### Advances
- `GET /advances` → جلب السلف
- `POST /advances` → إضافة سلفة
- `PUT /advances/{id}` → تحديث
- `DELETE /advances/{id}` → حذف

### Bonuses
- `GET /bonuses` → جلب المكافآت
- `POST /bonuses` → إضافة مكافأة
- `PUT /bonuses/{id}` → تحديث
- `DELETE /bonuses/{id}` → حذف

### Payroll
- `GET /payroll/summary` → الملخص
- `POST /payroll/generate` → إنشاء كشف
- `GET /payroll/export` → تصدير
- `POST /payroll/process` → معالجة

### Dashboard
- `GET /employees/stats`
- `GET /attendance/stats`
- `GET /salary/summary`
- `GET /inventory/stats`

---

## 🎯 ملاحظات مهمة

### 1. Caching Strategy
```typescript
staleTime: QUERY_STALE_TIME.STANDARD    // 5 دقائق
gcTime: QUERY_GC_TIME.RELAXED            // 10 دقائق
```

### 2. Error Handling
- استخدام `axios.isAxiosError()` للتحقق من نوع الخطأ
- عرض رسائل خطأ مخصصة بالعربية
- Retry logic للأخطاء الشبكية

### 3. Mutations
- تحديث الـ Cache تلقائياً بعد النجاح
- إظهار رسائل Toast للمستخدم
- معالجة الأخطاء بشكل دقيق

### 4. Authorization
- إرسال Token عبر `Authorization` header
- معالجة 401 (Session Expired) تلقائياً
- Redirect إلى Login صفحة

---

## 📝 ملخص الملفات الرئيسية

| الملف | السطور | الوظيفة |
|------|--------|---------|
| `hooks/useEmployees.ts` | 345 | إدارة الموظفين |
| `hooks/useDashboard.ts` | 230 | لوحة التحكم |
| `hooks/useAttendance.ts` | 546 | إدارة الحضور |
| `hooks/useSalaries.ts` | 156 | إدارة الرواتب |
| `hooks/useAdvances.ts` | 115 | إدارة السلف |
| `hooks/useBonuses.ts` | ~120 | المكافآت |
| `hooks/usePayroll.ts` | ~200 | كشوف الرواتب |
| `lib/api-client.ts` | ~30 | Axios Client |
| `lib/http/api.ts` | ~25 | API Wrappers |
| `app/api/[...path]/route.ts` | ~80 | Proxy Route |

---

**آخر تحديث**: 18 مايو 2026
**الحالة**: ✅ مكتمل
