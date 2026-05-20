# 📊 Detailed Frontend API Calls Mapping Report
**Factory Management System - Frontend Data Flow**

---

## Quick Summary

| Metric | Count |
|--------|-------|
| **Total Hooks with API Calls** | 22 |
| **HTTP Methods Used** | GET, POST, PUT, DELETE, PATCH |
| **Primary HTTP Client** | Axios (apiClient) |
| **Caching Solution** | React Query (@tanstack/react-query) |
| **Total Endpoints Documented** | 50+ |
| **Pages/Routes** | 15+ |

---

## 1. PAGE BY PAGE API MAPPING

### 🏠 HOME / DASHBOARD
**File Path**: `app/(dashboard)/home/page.tsx`

**API Calls Made**:
```typescript
// Dashboard Statistics (KPIs)
GET /employees/stats                    → Employee count & department breakdown
GET /attendance                         → Today's attendance records (date param)
GET /attendance/stats                   → Attendance metrics (late, absent, etc)
GET /salary/summary                     → Total payroll summary
GET /inventory/stats                    → Inventory counts
GET /payroll/summary                    → Payroll KPIs
```

**Components Using Hooks**:
- `useDashboard()` → Aggregates all statistics
- `useEmployees()` → Employee stats
- `useAttendance()` → Attendance stats
- `useSalaries()` → Salary aggregations
- `usePayroll()` → Payroll summary

**Data Freshness**:
- staleTime: 5 minutes
- gcTime: 10 minutes
- Real-time updates: Optional polling

---

### 👥 EMPLOYEES MANAGEMENT
**File Path**: `app/(dashboard)/employees/page.tsx`

**API Endpoints**:
| Action | Method | Endpoint | Query Params |
|--------|--------|----------|--------------|
| List Employees | GET | `/employees` | `page, limit, department, search, status` |
| Create Employee | POST | `/employees` | - |
| Update Employee | PUT | `/employees/{employeeId}` | - |
| Delete Employee | DELETE | `/employees/{employeeId}` | - |
| Get Single | GET | `/employees/{employeeId}` | - |

**Payload Example (POST/PUT)**:
```typescript
{
  employeeId: "EMP001",
  name: "أحمد محمد",
  birthDate: "1990-05-15",
  mobile: "0963xxx",
  gender: "male",
  department: "HR",
  jobTitle: "Manager",
  roleId: "admin" | "staff",
  monthlySalary: 150000,
  scheduledStart: "08:00",
  scheduledEnd: "17:00"
}
```

**Hook Used**: `useEmployees(options?)`
```typescript
const { data: employees, isLoading, createMutation, updateMutation, deleteMutation } = 
  useEmployees({ 
    status: "active", 
    department: "HR", 
    search: "أحمد",
    includeTerminated: false 
  });
```

---

### 💰 SALARIES MANAGEMENT
**File Path**: `app/(dashboard)/salaries/page.tsx`

**API Endpoints**:
| Action | Method | Endpoint | Purpose |
|--------|--------|----------|---------|
| List All Salaries | GET | `/salary` | Bulk salary data |
| Get Single Salary | GET | `/salary/{employeeId}` | Individual record |
| Update/Upsert | PUT | `/salary/{employeeId}` | Save salary record |
| Delete Salary | DELETE | `/salary/{employeeId}` | Remove record |

**Canonical Field Names** (Must Match Backend DTO):
```typescript
{
  baseSalary: 150000,              // ✅ Main salary
  lumpSumSalary: 50000,            // ✅ Fixed additional
  livingAllowance: 30000,          // ✅ COL allowance
  responsibilityAllowance: 20000,  // ✅ Position allowance
  extraEffortAllowance: 15000,     // ✅ Overtime allowance (NOT extraEffort)
  productionIncentive: 10000,      // ✅ Production bonus
  profession: "Engineer"           // ✅ Job title
}
```

**Hook Used**: `useSalaries()`
```typescript
const { 
  data: salaries, 
  useEmployeeSalary,
  updateSalary,
  deleteSalary 
} = useSalaries();

// For single employee
const singleSalary = useEmployeeSalary("EMP001");
```

---

### 🕒 ATTENDANCE TRACKING
**File Path**: `app/(dashboard)/attendance/page.tsx`

**API Endpoints**:
| Action | Method | Endpoint | Notes |
|--------|--------|----------|-------|
| List Records | GET | `/attendance` | Pagination, date filters |
| Create Manual Entry | POST | `/attendance` | Manual clock in/out |
| Update Record | PUT | `/attendance/{id}` | Correct time entry |
| Delete Record | DELETE | `/attendance/{id}` | Remove erroneous entry |
| Daily Summary | GET | `/attendance/daily-summary` | Per-day aggregation |
| Stats | GET | `/attendance/stats` | Late arrivals, absent counts |

**Payload (POST - Manual Entry)**:
```typescript
{
  employeeId: "EMP001",
  date: "2026-05-18",           // YYYY-MM-DD
  checkIn: "08:00",              // HH:mm
  checkOut: "17:30",             // HH:mm
  source: "manual" | "device",
  location: "Gate A",
  notes: "Late due to traffic"
}
```

**Hook Used**: `useAttendance()`
```typescript
const {
  data: records,
  markAttendance,      // POST - Manual entry
  updateAttendance,    // PUT - Edit
  deleteAttendance     // DELETE
} = useAttendance();
```

---

### 💳 ADVANCES (سلف الموظفين)
**File Path**: `app/(dashboard)/advances/page.tsx`

**API Endpoints**:
| Action | Method | Endpoint | Details |
|--------|--------|----------|---------|
| List | GET | `/advances` | Query by employeeId |
| Create | POST | `/advances` | New advance request |
| Update | PUT | `/advances/{id}` | Modify amount, installments |
| Delete | DELETE | `/advances/{id}` | Remove advance |

**Advance Types**:
- `"salary"` → Salary advance
- `"clothing"` → Clothing allowance
- `"other"` → Other advances

**Payload (POST)**:
```typescript
{
  employeeId: "EMP001",
  advanceType: "salary",
  totalAmount: 100000,
  installmentAmount: 10000,
  notes: "Emergency advance"
}
```

**Hook Used**: `useAdvances(employeeId?)`

---

### 🎁 BONUSES & ASSISTANCE
**File Path**: `app/(dashboard)/bonuses/page.tsx`

**API Endpoints**:
| Action | Method | Endpoint |
|--------|--------|----------|
| List | GET | `/bonuses` |
| Create | POST | `/bonuses` |
| Update | PUT | `/bonuses/{id}` |
| Delete | DELETE | `/bonuses/{id}` |

**Payload**:
```typescript
{
  employeeId: "EMP001",
  bonusAmount: 50000,
  assistanceAmount: 30000,
  period: "2026-05",
  notes: "Performance bonus"
}
```

---

### 📑 PAYROLL PROCESSING
**File Path**: `app/(dashboard)/payroll/page.tsx`

**API Endpoints**:
| Action | Method | Endpoint | Purpose |
|--------|--------|----------|---------|
| Summary | GET | `/payroll/summary` | Overall stats |
| Generate | POST | `/payroll/generate` | Create payslips |
| Export | GET | `/payroll/export` | Download Excel/PDF |
| Process | POST | `/payroll/process` | Finalize calculation |
| Report | GET | `/payroll/report` | Detailed breakdown |

**Query Parameters**:
```typescript
// GET /payroll/summary?period=2026-05&employeeId=EMP001
{
  period: "2026-05",        // YYYY-MM
  employeeId?: string,      // Optional filter
  format?: "xlsx" | "pdf"   // Export format
}
```

**Hook Used**: `usePayroll()` & `usePayrollReport()`

---

### ⚙️ SYSTEM CONFIGURATION
**File Path**: `app/(dashboard)/settings/page.tsx`

**API Endpoints**:
| Action | Method | Endpoint |
|--------|--------|----------|
| Get Settings | GET | `/settings` |
| Update Settings | PUT | `/settings` |
| Get Roles | GET | `/roles` |
| Create Role | POST | `/roles` |
| Update Role | PUT | `/roles/{id}` |
| Delete Role | DELETE | `/roles/{id}` |

---

## 2. HOOKS DIRECTORY MAPPING

```
hooks/
├── useEmployees.ts          (345 lines) → Employees CRUD
├── useDashboard.ts          (230 lines) → Dashboard stats
├── useAttendance.ts         (546 lines) → Attendance management
├── useSalaries.ts           (156 lines) → Salary operations
├── useAdvances.ts           (115 lines) → Advances management
├── useBonuses.ts            (~120)      → Bonuses & assistance
├── useDiscounts.ts          (~100)      → Discount tracking
├── usePayroll.ts            (~200)      → Payroll processing
├── usePayrollReport.ts      (~150)      → Payroll reports
├── useRoles.ts              (~80)       → Role management
├── useInventory.ts          (~100)      → Inventory tracking
├── useFiles.ts              (~90)       → File uploads
├── useImports.ts            (~120)      → Bulk imports
├── usePenalties.ts          (~100)      → Penalties
├── useRewards.ts            (~100)      → Rewards
├── useTransportation.ts     (~80)       → Transport deductions
├── useEmployeeDetails.ts    (~150)      → Detailed employee view
├── useEmployeeProfile.ts    (~200)      → Full employee profile
├── useAttendanceDeductions.ts(~110)     → Attendance-based deductions
└── usePayrollInputs.ts      (~150)      → Payroll input helpers
```

---

## 3. API CLIENT CONFIGURATION

### 📍 Location: `lib/api-client.ts`

**Initialization**:
```typescript
import axios, { AxiosInstance } from "axios";

const apiClient: AxiosInstance = axios.create({
  baseURL: "/api",           // Routes to Next.js proxy
  timeout: 30000,            // 30 seconds
  withCredentials: true,     // Send cookies
});

// Interceptor: Handle 401 (Session Expired)
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear auth & redirect
      useAuthStore.setState({ token: null, user: null });
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export default apiClient;
```

### 📍 Location: `lib/http/api.ts`

**Wrapper Functions**:
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

  patch: async <T>(url: string, body?: unknown, config?: AxiosRequestConfig): Promise<T> => {
    const response = await apiClient.patch<T>(url, body, config);
    return response.data;
  },

  delete: async <T>(url: string, config?: AxiosRequestConfig): Promise<T> => {
    const response = await apiClient.delete<T>(url, config);
    return response.data;
  },
};
```

---

## 4. REACT QUERY CONFIGURATION

### 📍 Location: `lib/query-keys.ts`

**Query Key Factory**:
```typescript
export const queryKeys = {
  employees: {
    all: () => ["employees"],
    list: (filters: any) => ["employees", filters],
    detail: (id: string) => ["employees", id],
    stats: () => ["employees", "stats"],
  },
  
  salary: {
    all: () => ["salaries"],
    detail: (employeeId: string) => ["salary", employeeId],
    summary: () => ["salary", "summary"],
  },
  
  attendance: {
    all: () => ["attendance"],
    by_date: (date: string) => ["attendance", date],
    daily: () => ["attendance", "daily"],
    stats: () => ["attendance", "stats"],
  },
  
  // ... 15+ more module keys
};
```

### 📍 Location: `lib/query-cache.ts`

**Caching Strategy**:
```typescript
export const QUERY_STALE_TIME = {
  INSTANT: 0,                    // Always fresh
  QUICK: 2 * 60 * 1000,          // 2 minutes
  STANDARD: 5 * 60 * 1000,       // 5 minutes
  RELAXED: 15 * 60 * 1000,       // 15 minutes
};

export const QUERY_GC_TIME = {
  QUICK: 3 * 60 * 1000,          // 3 minutes
  STANDARD: 5 * 60 * 1000,       // 5 minutes
  RELAXED: 10 * 60 * 1000,       // 10 minutes
};
```

---

## 5. NEXT.JS PROXY ROUTE

### 📍 Location: `app/api/[...path]/route.ts`

**Purpose**: Intercept all `/api/*` requests and forward to backend

**Flow**:
```
Frontend Request
    ↓
/api/[...path]/route.ts (Handler)
    ↓
Extract path & parameters
    ↓
Construct backend URL (LOCAL or RAILWAY)
    ↓
Forward request with headers
    ↓
Return response with CORS headers
    ↓
Frontend receives
```

**Key Features**:
- ✅ Handles all HTTP methods (GET, POST, PUT, DELETE, PATCH)
- ✅ CORS headers properly set
- ✅ Cookie forwarding (`credentials: include`)
- ✅ Authorization header passthrough
- ✅ Error handling & logging

---

## 6. ENVIRONMENT CONFIGURATION

### 📍 `.env.local` or `.env.production`

```env
# Backend API URL
NEXT_PUBLIC_API_URL=http://localhost:5001/api
# OR for production:
NEXT_PUBLIC_API_URL=https://werehouse-production-dabe.up.railway.app/api

# Optional: API timeout
NEXT_PUBLIC_API_TIMEOUT=30000

# Optional: Mock API flag
NEXT_PUBLIC_USE_MOCK_API=false
```

---

## 7. DATA FLOW DIAGRAM

```
┌─────────────────────────────────────────────────────────────┐
│                     FRONTEND (React/Next.js)                 │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  Page Component (e.g., /employees)                     │  │
│  │    ↓                                                    │  │
│  │  Hook (useEmployees)                                  │  │
│  │    ↓                                                    │  │
│  │  apiClient.get("/employees")                          │  │
│  └────────────────────────────────────────────────────────┘  │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ↓
         ┌─────────────────────┐
         │  /api/[...path]     │
         │  (Next.js Proxy)    │
         │  ├─ Extract path    │
         │  ├─ Add headers     │
         │  └─ Forward to      │
         │     backend         │
         └─────────────────────┘
                   │
                   ↓
    ┌──────────────────────────────────┐
    │   BACKEND (NestJS/Railway)       │
    │  ├─ /api/employees               │
    │  ├─ /api/salary                  │
    │  ├─ /api/attendance              │
    │  └─ ... (50+ endpoints)          │
    └──────────────────────────────────┘
                   │
                   ↓
         Response forwarded back
```

---

## 8. COMMON PATTERNS

### Pattern 1: Simple Query
```typescript
const query = useQuery({
  queryKey: ["employees"],
  queryFn: () => apiClient.get("/employees"),
  staleTime: QUERY_STALE_TIME.STANDARD,
});
```

### Pattern 2: Query with Parameters
```typescript
const query = useQuery({
  queryKey: ["salary", employeeId],
  queryFn: () => apiClient.get(`/salary/${employeeId}`),
  enabled: !!employeeId,  // Only run if ID exists
});
```

### Pattern 3: Mutation with Cache Invalidation
```typescript
const mutation = useMutation({
  mutationFn: (data) => apiClient.post("/employees", data),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["employees"] });
    toast.success("Created successfully!");
  },
  onError: (error) => {
    toast.error(getErrorMessage(error));
  },
});
```

### Pattern 4: Dependent Queries
```typescript
const employeesQuery = useQuery({
  queryKey: ["employees"],
  queryFn: () => apiClient.get("/employees"),
});

const salaryQuery = useQuery({
  queryKey: ["salary", employeesQuery.data?.[0].id],
  queryFn: () => apiClient.get(`/salary/${employeesQuery.data[0].id}`),
  enabled: !!employeesQuery.data?.[0]?.id,
});
```

---

## 9. ERROR HANDLING

### Standard Error Handler
```typescript
const getErrorMessage = (error: unknown, fallback: string): string => {
  if (axios.isAxiosError(error)) {
    const message = error.response?.data?.error?.message 
                 ?? error.response?.data?.message;
    if (typeof message === "string" && message.trim()) {
      return message;
    }
  }
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }
  return fallback;
};
```

### Usage in Mutation
```typescript
onError: (error: unknown) => {
  const message = getErrorMessage(error, "خطأ غير متوقع");
  toast.error(message, { duration: 5000 });
}
```

---

## 10. AUTHENTICATION FLOW

### Token Management
```typescript
// Token sent in every request via Axios interceptor
apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

### 401 Handling
```typescript
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.setState({ token: null });
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);
```

---

## Summary Table

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Component** | React | UI rendering |
| **State Management** | React Query + Zustand | Data caching & persistence |
| **HTTP Client** | Axios | HTTP requests |
| **API Route** | Next.js | Proxy to backend |
| **Backend** | NestJS | Business logic & DB |

---

**Report Generated**: May 18, 2026  
**Status**: ✅ Complete  
**Total API Endpoints Documented**: 50+
