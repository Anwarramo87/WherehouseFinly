# تفاصيل Backend API Requirements
**النسخة:** 1.0  
**التاريخ:** 12 مايو 2026  
**اللغة:** عربي/إنجليزي  

---

## 📌 معلومات أساسية

### Base URL
```
Development:  http://localhost:3001/api
Staging:      https://staging-api.factory.com/api
Production:   https://api.factory.com/api
```

### Authentication
```
Header: Authorization: Bearer {jwt_token}
Format: JWT with 24h expiration
Refresh: POST /auth/refresh
```

### Response Status Codes
```
200 ✅ OK
201 ✅ Created
400 ❌ Bad Request
401 ❌ Unauthorized
403 ❌ Forbidden
404 ❌ Not Found
500 ❌ Server Error
```

---

## 🧑 1. Employees API

### 1.1 GET /employees
**الوصف:** الحصول على قائمة الموظفين

```
Endpoint:  GET /api/employees
Auth:      Required (Bearer Token)
Content:   JSON

Query Parameters:
  - status?:     "active" | "terminated" | "on-leave"
  - department?: string
  - search?:     string (Name or employeeId)
  - page?:       number (default: 1)
  - limit?:      number (default: 20, max: 200)
  - sort?:       "name" | "employeeId" | "createdAt"
  - order?:      "asc" | "desc"

Example Request:
  GET /api/employees?status=active&department=الإنتاج&page=1&limit=50

Response (200):
{
  "success": true,
  "data": [
    {
      "id": "507f1f77bcf86cd799439011",
      "employeeId": "EMP001",
      "name": "أحمد محمود",
      "email": "ahmad@factory.com",
      "phone": "+963912345678",
      "jobTitle": "عامل إنتاج",
      "department": "الإنتاج",
      "status": "active",
      "hourlyRate": { "$numberDecimal": "150.00" },
      "scheduledStart": "08:00",
      "scheduledEnd": "16:00",
      "hireDate": "2024-01-15T00:00:00Z",
      "createdAt": "2024-01-15T10:30:00Z",
      "updatedAt": "2026-05-12T14:00:00Z"
    }
  ],
  "pagination": {
    "current": 1,
    "pages": 3,
    "total": 150,
    "limit": 50
  }
}

Error Response (400):
{
  "success": false,
  "error": {
    "message": "فلتر غير صحيح",
    "code": "INVALID_FILTER"
  }
}
```

### 1.2 GET /employees/:id
**الوصف:** الحصول على بيانات موظف محدد

```
Endpoint:  GET /api/employees/EMP001
Auth:      Required
Response:  Single employee object (same as above)
```

### 1.3 POST /employees
**الوصف:** إضافة موظف جديد

```
Endpoint:  POST /api/employees
Auth:      Required
Content:   application/json

Body:
{
  "employeeId": "EMP150",      // Must: EMP + 3+ digits, Unique
  "name": "علي محمد",
  "email": "ali@factory.com",
  "phone": "+963912345678",
  "jobTitle": "عامل إنتاج",
  "department": "الإنتاج",
  "hourlyRate": "150.00",      // Accept as string, convert to Decimal
  "scheduledStart": "08:00",
  "scheduledEnd": "16:00",
  "hireDate": "2026-05-12"
}

Validation Rules:
  ✓ employeeId: /^EMP\d{3,}$/ (regex)
  ✓ email: valid email format & unique
  ✓ hourlyRate: > 0
  ✓ scheduledStart < scheduledEnd
  ✓ All required fields present

Success Response (201):
{
  "success": true,
  "data": {
    "id": "507f1f77bcf86cd799439999",
    "employeeId": "EMP150",
    "name": "علي محمد",
    ...
  }
}

Error Response (400):
{
  "success": false,
  "error": {
    "message": [
      "employeeId must match pattern: EMP + 3+ digits",
      "Email already exists"
    ],
    "code": "VALIDATION_ERROR"
  }
}
```

### 1.4 PUT /employees/:id
**الوصف:** تعديل بيانات موظف

```
Endpoint:  PUT /api/employees/EMP001
Auth:      Required
Body:      Partial employee object (any field can be updated)

Example:
{
  "jobTitle": "مشرف إنتاج",
  "department": "الجودة"
}

Response: Updated employee object (same as POST response)
```

### 1.5 DELETE /employees/:id
**الوصف:** حذف (تعطيل) موظف

```
Endpoint:  DELETE /api/employees/EMP001
Auth:      Required
Body:      None

Action: Set status to "terminated" (soft delete)

Response (200):
{
  "success": true,
  "message": "تم حذف الموظف بنجاح"
}
```

### 1.6 GET /employees/stats
**الوصف:** إحصائيات الموظفين (مهم جداً للـ Dashboard)

```
Endpoint:  GET /api/employees/stats
Auth:      Required
Query:
  - date?: YYYY-MM-DD (default: today)

Response (200):
{
  "success": true,
  "data": {
    "totalEmployees": 150,
    "activeEmployees": 145,
    "terminatedEmployees": 5,
    "onLeave": 3,
    
    "byDepartment": {
      "الإنتاج": 60,
      "الإدارة": 30,
      "التوزيع": 35,
      "الموارد البشرية": 25
    },
    
    "byJobTitle": {
      "عامل إنتاج": 80,
      "عامل توزيع": 35,
      "موظف إداري": 30,
      "مدير قسم": 5
    },
    
    "newHires": {
      "thisMonth": 5,
      "thisQuarter": 15,
      "thisYear": 45
    },
    
    "terminations": {
      "thisMonth": 1,
      "thisQuarter": 2,
      "thisYear": 3
    }
  }
}
```

---

## 📅 2. Attendance API

### 2.1 GET /attendance
**الوصف:** سجلات الحضور

```
Endpoint:  GET /api/attendance
Auth:      Required
Query:
  - date?:       YYYY-MM-DD
  - employeeId?: string
  - type?:       "IN" | "OUT"
  - page?:       number
  - limit?:      number

Response (200):
{
  "success": true,
  "data": {
    "records": [
      {
        "id": "507f1f77bcf86cd799439011",
        "employeeId": "EMP001",
        "type": "IN",
        "timestamp": "2026-05-12T08:05:30Z",
        "location": "Main Gate",
        "device": "Biometric Device #1"
      },
      {
        "id": "507f1f77bcf86cd799439012",
        "employeeId": "EMP001",
        "type": "OUT",
        "timestamp": "2026-05-12T16:15:45Z",
        "location": "Main Gate",
        "device": "Biometric Device #1"
      }
    ],
    "totalRecords": 285
  },
  "pagination": { "current": 1, "pages": 3, "limit": 100 }
}
```

### 2.2 POST /attendance
**الوصف:** تسجيل حضور/غياب جديد

```
Endpoint:  POST /api/attendance
Auth:      Required
Body:
{
  "employeeId": "EMP001",
  "type": "IN",           // "IN" or "OUT"
  "timestamp": "2026-05-12T08:05:00Z",
  "location": "Main Gate",
  "device": "Biometric"
}

Response: Created record (201)
```

### 2.3 GET /attendance/alerts
**الوصف:** التنبيهات (غياب، تأخير، عمل إضافي)

```
Endpoint:  GET /api/attendance/alerts
Auth:      Required
Query:
  - date?: YYYY-MM-DD (default: today)

Response (200):
{
  "success": true,
  "data": {
    "alerts": [
      {
        "employeeId": "EMP002",
        "name": "سارة علي",
        "department": "الإدارة",
        "status": "late",
        "scheduledStart": "08:00",
        "checkIn": "2026-05-12T08:25:00Z",
        "minutesLate": 25
      },
      {
        "employeeId": "EMP005",
        "name": "علي حسن",
        "department": "الإنتاج",
        "status": "absent",
        "scheduledStart": "08:00"
      },
      {
        "employeeId": "EMP010",
        "name": "فاطمة محمد",
        "department": "التوزيع",
        "status": "overtime",
        "scheduledEnd": "16:00",
        "actualCheckOut": "2026-05-12T17:45:00Z",
        "overtimeMinutes": 105
      }
    ],
    "summary": {
      "totalPresent": 142,
      "totalAbsent": 3,
      "totalLate": 5,
      "totalOvertimes": 8
    }
  }
}
```

### 2.4 DELETE /attendance/:id
**الوصف:** حذف سجل حضور (للتصحيحات)

```
Endpoint:  DELETE /api/attendance/507f1f77bcf86cd799439011
Auth:      Required (Admin only)
Response:  Success message
```

---

## 💰 3. Advances API (السلف المالية)

### 3.1 GET /advances
**الوصف:** جميع السلف

```
Endpoint:  GET /api/advances
Auth:      Required
Query:
  - status?:     "pending" | "approved" | "rejected"
  - employeeId?: string
  - month?:      YYYY-MM
  - page?:       number
  - limit?:      number

Response (200):
{
  "success": true,
  "data": [
    {
      "id": "507f1f77bcf86cd799439011",
      "employeeId": "EMP001",
      "name": "أحمد محمود",
      "totalAmount": { "$numberDecimal": "500000.00" },
      "remainingAmount": { "$numberDecimal": "250000.00" },
      "installments": 2,
      "issueDate": "2026-05-01T00:00:00Z",
      "dueDate": "2026-07-01T00:00:00Z",
      "status": "approved",
      "reason": "احتياجات شخصية",
      "approvedBy": "HR001",
      "notes": "موافقة مدير الموارد البشرية",
      "createdAt": "2026-05-01T10:00:00Z"
    }
  ],
  "pagination": { ... }
}
```

### 3.2 POST /advances
**الوصف:** طلب سلفة جديدة

```
Endpoint:  POST /api/advances
Auth:      Required (Employee can submit own, Admin can submit for others)
Body:
{
  "employeeId": "EMP001",
  "totalAmount": "500000",
  "reason": "احتياجات شخصية",
  "installments": 2,
  "requestedDate": "2026-05-01"
}

Response: Created advance (201)
```

### 3.3 PATCH /advances/:id
**الوصف:** تعديل حالة الطلب (موافقة/رفض)

```
Endpoint:  PATCH /api/advances/507f1f77bcf86cd799439011
Auth:      Required (Admin only)
Body:
{
  "status": "approved",           // or "rejected"
  "approvedBy": "HR001",
  "notes": "تمت الموافقة"
}

Response: Updated advance
```

### 3.4 DELETE /advances/:id
```
Endpoint:  DELETE /api/advances/507f1f77bcf86cd799439011
Auth:      Required (Admin only)
Response:  Success message
```

---

## ⚖️ 4. Penalties API (العقوبات)

### 4.1 GET /penalties
```
Endpoint:  GET /api/penalties
Auth:      Required
Query:     date?, employeeId?, category?, page?, limit?

Response:
{
  "success": true,
  "data": [
    {
      "id": "507f1f77bcf86cd799439011",
      "employeeId": "EMP002",
      "name": "سارة علي",
      "department": "الإدارة",
      "amount": { "$numberDecimal": "50000.00" },
      "category": "tardiness",
      "reason": "تأخير متكرر",
      "issueDate": "2026-05-10T00:00:00Z",
      "notes": "إنذار رسمي"
    }
  ]
}
```

### 4.2 POST /penalties
```
Endpoint:  POST /api/penalties
Auth:      Required (Admin only)
Body:
{
  "employeeId": "EMP002",
  "amount": "50000",
  "category": "tardiness",  // tardiness, absence, misconduct, etc
  "reason": "تأخير متكرر",
  "notes": "إنذار رسمي"
}
```

### 4.3 DELETE /penalties/:id
```
Endpoint:  DELETE /api/penalties/507f1f77bcf86cd799439011
Auth:      Required (Admin only)
Response:  Success message
```

---

## 🏢 5. Departments API

### 5.1 GET /departments
```
Endpoint:  GET /api/departments
Auth:      Required
Query:     page?, limit?

Response:
{
  "success": true,
  "data": [
    {
      "id": "507f1f77bcf86cd799439011",
      "name": "الإنتاج",
      "manager": "مدير الإنتاج",
      "managerEmployeeId": "EMP101",
      "employeeCount": 60,
      "budget": { "$numberDecimal": "500000.00" },
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ]
}
```

### 5.2 POST /departments
```
Endpoint:  POST /api/departments
Auth:      Required (Admin only)
Body:
{
  "name": "الجودة",
  "manager": "مدير الجودة",
  "managerEmployeeId": "EMP120",
  "budget": "300000"
}
```

### 5.3 PUT /departments/:id
```
Endpoint:  PUT /api/departments/507f1f77bcf86cd799439011
Auth:      Required (Admin only)
Body:      Partial department object
```

### 5.4 DELETE /departments/:id
```
Endpoint:  DELETE /api/departments/507f1f77bcf86cd799439011
Auth:      Required (Admin only)
Condition: Department must have 0 employees
```

---

## 🏖️ 6. Leaves API (الإجازات)

### 6.1 GET /leaves
```
Endpoint:  GET /api/leaves
Auth:      Required
Query:     status?, employeeId?, startDate?, endDate?

Response:
{
  "success": true,
  "data": [
    {
      "id": "507f1f77bcf86cd799439011",
      "employeeId": "EMP001",
      "name": "أحمد محمود",
      "startDate": "2026-05-15T00:00:00Z",
      "endDate": "2026-05-20T00:00:00Z",
      "type": "vacation",    // vacation, sick, personal, unpaid
      "status": "pending",   // pending, approved, rejected
      "reason": "إجازة صيفية",
      "days": 5,
      "isPaid": true,
      "requestedAt": "2026-05-12T10:00:00Z",
      "approvedBy": "HR001",
      "approvedAt": "2026-05-12T14:00:00Z"
    }
  ]
}
```

### 6.2 POST /leaves
```
Endpoint:  POST /api/leaves
Auth:      Required (Employee submits own)
Body:
{
  "employeeId": "EMP001",
  "startDate": "2026-05-15",
  "endDate": "2026-05-20",
  "type": "vacation",
  "reason": "إجازة صيفية",
  "isPaid": true
}

Validation:
  ✓ startDate < endDate
  ✓ No overlapping leaves
  ✓ Check available leave balance
  ✓ For sick leave: max 3 consecutive days
```

### 6.3 PATCH /leaves/:id
```
Endpoint:  PATCH /api/leaves/507f1f77bcf86cd799439011
Auth:      Required (Manager/Admin)
Body:
{
  "status": "approved",    // or "rejected"
  "approvedBy": "HR001",
  "notes": "تمت الموافقة"
}
```

---

## 💵 7. Salaries & Payroll API

### 7.1 GET /salaries
```
Endpoint:  GET /api/salaries
Auth:      Required
Query:     employeeId?, month?, status?

Response:
{
  "success": true,
  "data": [
    {
      "id": "507f1f77bcf86cd799439011",
      "employeeId": "EMP001",
      "name": "أحمد محمود",
      "month": "2026-05",
      "basicSalary": { "$numberDecimal": "3000000.00" },
      "overtimeAmount": { "$numberDecimal": "150000.00" },
      "advances": { "$numberDecimal": "500000.00" },
      "penalties": { "$numberDecimal": "50000.00" },
      "netSalary": { "$numberDecimal": "2600000.00" },
      "status": "paid",
      "paidDate": "2026-05-30T00:00:00Z"
    }
  ]
}
```

### 7.2 GET /payroll/summary
```
Endpoint:  GET /api/payroll/summary
Auth:      Required
Query:     month?, status?

Response:
{
  "success": true,
  "data": {
    "month": "2026-05",
    "totalEmployees": 150,
    "totalBasic": { "$numberDecimal": "450000000.00" },
    "totalOvertimes": { "$numberDecimal": "15000000.00" },
    "totalAdvances": { "$numberDecimal": "50000000.00" },
    "totalPenalties": { "$numberDecimal": "5000000.00" },
    "totalNetSalaries": { "$numberDecimal": "410000000.00" },
    "paid": 145,
    "pending": 5,
    "lastUpdated": "2026-05-30T00:00:00Z"
  }
}
```

---

## 🔍 8. Common Error Responses

```javascript
// 400 Bad Request
{
  "success": false,
  "error": {
    "message": "حقل مطلوب مفقود: employeeId",
    "code": "VALIDATION_ERROR"
  }
}

// 401 Unauthorized
{
  "success": false,
  "error": {
    "message": "توكن غير صحيح أو منتهي الصلاحية",
    "code": "UNAUTHORIZED"
  }
}

// 403 Forbidden
{
  "success": false,
  "error": {
    "message": "ليس لديك صلاحية للقيام بهذا الإجراء",
    "code": "FORBIDDEN"
  }
}

// 404 Not Found
{
  "success": false,
  "error": {
    "message": "الموظف غير موجود",
    "code": "NOT_FOUND"
  }
}

// 500 Internal Server Error
{
  "success": false,
  "error": {
    "message": "خطأ داخلي في الخادم",
    "code": "INTERNAL_ERROR"
  }
}
```

---

## ✅ Testing Checklist

```bash
# كل endpoint يجب أن يدعم:
☐ Valid request → 200/201 with data
☐ Missing required field → 400
☐ Invalid token → 401
☐ Insufficient permissions → 403
☐ Non-existent resource → 404
☐ Server error → 500 with proper message
☐ Pagination → correct page/total/pages
☐ Sorting → working correctly
☐ Filtering → working correctly
☐ Decimal numbers → correct precision
☐ Date formats → ISO 8601
☐ Arabic text → UTF-8 encoding
```

---

**آخر تحديث:** 12 مايو 2026  
**المعد:** AI Development Assistant
