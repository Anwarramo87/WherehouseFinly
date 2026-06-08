# 🔍 BACKEND GAP REPORT

**Date:** May 12, 2026  
**For:** NestJS/Prisma Backend Development Team  
**Status:** CRITICAL - ACTION REQUIRED

---

## 📌 EXECUTIVE SUMMARY

The frontend has been enhanced with two new modules:
1. **Department Management** - CRUD operations for departments
2. **Leave Request Management** - Leave request tracking and approval

This report identifies **missing backend endpoints** and **required data models** for full frontend-backend integration.

---

## 🚨 CRITICAL GAPS

### **1. DEPARTMENT MANAGEMENT MODULE** (Priority: HIGH)

#### **Missing Endpoints:**

```
Method    | Endpoint                      | Purpose
----------|-------------------------------|----------------------------------
GET       | /api/departments              | List all departments
GET       | /api/departments/:id          | Get single department details
POST      | /api/departments              | Create new department
PUT       | /api/departments/:id          | Update department
DELETE    | /api/departments/:id          | Delete department
GET       | /api/departments/:id/employees| Get employees in department
```

#### **Required Request/Response Models:**

**POST /api/departments - Create Department**
```typescript
// REQUEST
{
  name: string;              // "قسم التعبئة" (Department name)
  manager: string;           // "محمد الأحمد" (Manager name - optional)
  date: string;              // "2026-05-12" (Creation/establishment date)
}

// RESPONSE (201 Created)
{
  id: string;
  name: string;
  manager: string | null;
  date: string;
  createdAt: string;
  updatedAt: string;
  employeeCount: number;     // Number of employees in dept
}
```

**PUT /api/departments/:id - Update Department**
```typescript
// REQUEST
{
  name?: string;
  manager?: string | null;
  date?: string;
}

// RESPONSE (200 OK)
{
  id: string;
  name: string;
  manager: string | null;
  date: string;
  updatedAt: string;
  employeeCount: number;
}
```

**GET /api/departments - List All**
```typescript
// RESPONSE (200 OK)
{
  data: [
    {
      id: string;
      name: string;
      manager: string | null;
      date: string;
      employeeCount: number;
      createdAt: string;
    }
  ];
  total: number;
  page: number;
  pageSize: number;
}
```

#### **Prisma Data Model:**

```prisma
model Department {
  id        String   @id @default(cuid())
  name      String   @unique
  manager   String?
  date      DateTime
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Relations
  employees Employee[]

  @@map("departments")
}
```

#### **Database Migrations Needed:**
```sql
CREATE TABLE "departments" (
  "id" VARCHAR(255) NOT NULL,
  "name" VARCHAR(255) NOT NULL UNIQUE,
  "manager" VARCHAR(255),
  "date" DATETIME NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  PRIMARY KEY ("id")
);

CREATE INDEX "departments_name_idx" ON "departments"("name");
```

---

### **2. LEAVE REQUEST MANAGEMENT MODULE** (Priority: HIGH)

#### **Missing Endpoints:**

```
Method    | Endpoint                           | Purpose
----------|------------------------------------|--------------------------
GET       | /api/leaves                        | List all leave requests
GET       | /api/leaves/:id                    | Get leave details
POST      | /api/leaves                        | Submit leave request
PUT       | /api/leaves/:id                    | Update leave request
DELETE    | /api/leaves/:id                    | Cancel leave request
GET       | /api/leaves/employee/:employeeId  | Get leaves for employee
GET       | /api/leaves/pending                | Get pending approvals
PUT       | /api/leaves/:id/approve            | Approve leave request
PUT       | /api/leaves/:id/reject             | Reject leave request
GET       | /api/leaves/report                 | Leave usage report
```

#### **Required Request/Response Models:**

**POST /api/leaves - Submit Leave Request**
```typescript
// REQUEST
{
  employeeId: string;        // "EMP001" (Employee ID)
  startDate: string;         // "2026-05-20" (Leave start date)
  endDate: string;           // "2026-05-25" (Leave end date)
  leaveType: string;         // "إجازة مرضية" | "إجازة إدارية" | etc
  isPaid: boolean;           // true/false (Paid or unpaid leave)
  reason?: string;           // Leave reason (optional, for custom types)
}

// RESPONSE (201 Created)
{
  id: string;
  employeeId: string;
  employeeName: string;
  startDate: string;
  endDate: string;
  leaveType: string;
  daysRequested: number;     // Calculate end - start
  isPaid: boolean;
  reason: string | null;
  status: "pending" | "approved" | "rejected";
  approvedBy?: string;
  approvalDate?: string;
  notes?: string;
  createdAt: string;
}
```

**GET /api/leaves - List With Filters**
```typescript
// QUERY PARAMS
{
  page?: number;
  pageSize?: number;
  employeeId?: string;
  status?: "pending" | "approved" | "rejected";
  startDate?: string;        // From date
  endDate?: string;          // To date
  leaveType?: string;
}

// RESPONSE (200 OK)
{
  data: [
    {
      id: string;
      employeeId: string;
      employeeName: string;
      startDate: string;
      endDate: string;
      daysRequested: number;
      leaveType: string;
      isPaid: boolean;
      status: "pending" | "approved" | "rejected";
      approvalDate?: string;
      createdAt: string;
    }
  ];
  total: number;
  page: number;
  pageSize: number;
}
```

**PUT /api/leaves/:id/approve - Approve Leave**
```typescript
// REQUEST
{
  approvalDate: string;      // "2026-05-12"
  notes?: string;            // Approval notes (optional)
}

// RESPONSE (200 OK)
{
  id: string;
  status: "approved";
  approvedBy: string;        // Manager/Admin user ID
  approvalDate: string;
  notes: string | null;
  updatedAt: string;
}
```

#### **Prisma Data Model:**

```prisma
model LeaveRequest {
  id            String   @id @default(cuid())
  employeeId    String
  employee      Employee @relation(fields: [employeeId], references: [id], onDelete: Cascade)
  
  startDate     DateTime
  endDate       DateTime
  daysRequested Int
  leaveType     String   // "إجازة مرضية" | "إجازة إدارية" | ...
  isPaid        Boolean  @default(false)
  reason        String?
  
  status        String   @default("pending") // "pending" | "approved" | "rejected"
  approvedBy    String?  // User ID of approver
  approvalDate  DateTime?
  notes         String?
  
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@map("leave_requests")
}
```

#### **Database Migrations Needed:**
```sql
CREATE TABLE "leave_requests" (
  "id" VARCHAR(255) NOT NULL,
  "employeeId" VARCHAR(255) NOT NULL,
  "startDate" DATETIME NOT NULL,
  "endDate" DATETIME NOT NULL,
  "daysRequested" INT NOT NULL,
  "leaveType" VARCHAR(255) NOT NULL,
  "isPaid" BOOLEAN NOT NULL DEFAULT false,
  "reason" TEXT,
  "status" VARCHAR(50) NOT NULL DEFAULT 'pending',
  "approvedBy" VARCHAR(255),
  "approvalDate" DATETIME,
  "notes" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  PRIMARY KEY ("id"),
  FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE
);

CREATE INDEX "leave_requests_employeeId_idx" ON "leave_requests"("employeeId");
CREATE INDEX "leave_requests_status_idx" ON "leave_requests"("status");
CREATE INDEX "leave_requests_startDate_idx" ON "leave_requests"("startDate");
```

---

## 📊 INTEGRATION CHECKLIST

### **Department Module**
- [ ] Create Prisma model (`Department`)
- [ ] Create database migration
- [ ] Create NestJS controller (`DepartmentsController`)
- [ ] Create NestJS service (`DepartmentsService`)
- [ ] Implement GET all departments
- [ ] Implement GET single department
- [ ] Implement POST create department
- [ ] Implement PUT update department
- [ ] Implement DELETE department
- [ ] Add validation rules (name must be unique)
- [ ] Add authorization (admin only)
- [ ] Add pagination support
- [ ] Add error handling
- [ ] Write unit tests
- [ ] Write integration tests

### **Leave Request Module**
- [ ] Create Prisma model (`LeaveRequest`)
- [ ] Create database migration
- [ ] Create NestJS controller (`LeavesController`)
- [ ] Create NestJS service (`LeavesService`)
- [ ] Implement GET all leaves (with filters)
- [ ] Implement GET single leave
- [ ] Implement POST submit leave request
- [ ] Implement PUT update leave request
- [ ] Implement DELETE cancel leave request
- [ ] Implement PUT approve leave request
- [ ] Implement PUT reject leave request
- [ ] Add leave balance calculation
- [ ] Add conflict detection (overlapping leaves)
- [ ] Add authorization (employee, manager, admin roles)
- [ ] Add notification system (email/SMS on approval)
- [ ] Add leave report generation
- [ ] Write unit tests
- [ ] Write integration tests

---

## 🔗 FRONTEND INTEGRATION POINTS

### **AddDepartmentModal.tsx**
Currently has:
```typescript
const DEPARTMENTS_ENDPOINT = "/departments";
const USE_MOCK_API = true;
```

**Action Needed:** Change `USE_MOCK_API` to `false` once backend is ready

### **LeaveRequestModal.tsx**
Currently has:
```typescript
const LEAVES_ENDPOINT = "/leaves";
const USE_MOCK_API = true;
```

**Action Needed:** Change `USE_MOCK_API` to `false` once backend is ready

### **Attendance Page Integration**
Button for leave request is ready, just needs:
- ✅ Backend endpoint confirmation
- ✅ Employee data from API
- ✅ Success/error handling

---

## 🚀 IMPLEMENTATION TIMELINE

| Phase | Task | Duration | Priority |
|-------|------|----------|----------|
| 1 | Database setup (Prisma models) | 2 hours | CRITICAL |
| 2 | Department CRUD endpoints | 4 hours | HIGH |
| 3 | Leave request endpoints | 6 hours | HIGH |
| 4 | Authorization & validation | 3 hours | HIGH |
| 5 | Tests & documentation | 4 hours | MEDIUM |
| 6 | Integration testing | 3 hours | MEDIUM |
| **Total** | | **22 hours** | |

---

## ⚙️ TECHNICAL CONSIDERATIONS

### **Validation Rules Required:**

**Departments:**
- Name must be unique
- Name cannot be empty
- Manager name (if provided) should be valid
- Date must be valid and not in future

**Leaves:**
- Employee must exist in system
- Start date must be ≤ End date
- Cannot submit leave in the past (configurable)
- Cannot overlap with existing approved leaves
- Leave balance cannot go negative
- Only manager/admin can approve

### **Business Logic Needed:**

1. **Leave Balance Calculation**
   - Annual leave limit (configure per company)
   - Calculate remaining balance
   - Track used days

2. **Conflict Detection**
   - Check for overlapping leaves
   - Prevent double-booking
   - Consider weekends/holidays

3. **Approval Workflow**
   - Manager approves employee leaves
   - HR admin can override
   - Notifications on status change

4. **Reporting**
   - Leave usage by employee
   - Leave usage by department
   - Pending approvals dashboard

---

## 📝 ERROR HANDLING

### **Department Endpoints - Error Codes:**
```
400 Bad Request     - Invalid input
409 Conflict        - Department name already exists
404 Not Found       - Department not found
401 Unauthorized    - User not authenticated
403 Forbidden       - User lacks permission
500 Server Error    - Internal server error
```

### **Leave Request Endpoints - Error Codes:**
```
400 Bad Request     - Invalid dates or employee ID
404 Not Found       - Employee or leave request not found
409 Conflict        - Leave dates overlap with existing leave
401 Unauthorized    - User not authenticated
403 Forbidden       - User lacks permission
422 Unprocessable   - Leave balance insufficient
500 Server Error    - Internal server error
```

---

## 🔐 AUTHORIZATION REQUIREMENTS

### **Department Module:**
- ✅ GET endpoints: All authenticated users
- ✅ POST/PUT/DELETE: Admin role only

### **Leave Request Module:**
- ✅ POST (submit): Employees (own leaves)
- ✅ GET (list): Employees (own), Managers (team), Admin (all)
- ✅ PUT (update): Employees (pending only), Admin
- ✅ PUT (approve): Managers (team), Admin (all)
- ✅ DELETE: Admin only (cancellations)

---

## 📞 SUPPORT

### **Questions for Frontend Team:**
1. What pagination size is preferred? (default: 20 items/page)
2. Should leave balance be calculated automatically or manually?
3. What's the annual leave limit per employee?
4. Should system prevent past leaves or allow backdated entries?
5. Need email notifications on leave approval?

### **Questions for Product Team:**
1. What are leave types for your company?
2. Which leave types are paid vs unpaid?
3. Are there department-specific leave policies?
4. Who has authority to approve leaves?
5. Do you need leave reports/analytics?

---

## ✅ COMPLETION CHECKLIST

- [ ] Database models created
- [ ] Migrations executed
- [ ] Department endpoints implemented (6/6)
- [ ] Leave request endpoints implemented (10/10)
- [ ] Authorization & validation added
- [ ] Error handling implemented
- [ ] Unit tests written (80%+ coverage)
- [ ] Integration tests written
- [ ] Endpoint documentation updated
- [ ] Frontend integration tested
- [ ] Deployment ready
- [ ] Production verified

---

**Generated:** 2026-05-12  
**Status:** ⏳ AWAITING BACKEND DEVELOPMENT  
**Next Review:** After backend implementation
