# Fields Catalog — Frontend & Backend

> Generated from: `warehouse/factory/types` + `Backend2/werehouse/backend-nest/prisma/schema.prisma`

---

## FRONTEND ENTITIES

### 1. Employee  (types/employee.ts)
| Field | Type | Required? | Notes |
|---|---|---|---|
| id | string | Optional | |
| _id | string | Optional | Legacy |
| employeeId | string | Required | e.g. EMP001 |
| name | string | Required | |
| email | string | Optional | |
| phone | string | Optional | Legacy |
| mobile | string \| null | Optional | |
| nationalId | string \| null | Optional | |
| employmentStartDate | string \| null | Optional | |
| terminationDate | string \| null | Optional | |
| birthDate | string \| null | Optional | Legacy |
| dateOfBirth | string \| null | Optional | Actual DB field name |
| gender | string \| null | Optional | |
| department | string | Optional | |
| profession | string | Optional | |
| jobTitle | string | Optional | |
| roleId | string | Optional | |
| status | 'active' \| 'inactive' \| 'terminated' \| 'resigned' | Optional | |
| isSettled | boolean | Optional | |
| terminationType | 'resignation' \| 'termination' \| null | Optional | |
| terminationReason | string \| null | Optional | |
| terminationNotes | string \| null | Optional | |
| financialSettlementStatus | 'pending' \| 'completed' | Optional | |
| financialSettlementDate | string \| null | Optional | |
| rehireDate | string \| null | Optional | |
| isFinanciallySettled | boolean | Optional | |
| hourlyRate | number \| string \| DecimalLike | Optional | |
| baseSalary | number \| string \| DecimalLike \| null | Optional | |
| lumpSumSalary | number \| string \| DecimalLike \| null | Optional | |
| monthlySalary | number \| string | Optional | |
| livingAllowance | number \| string \| null | Optional | |
| insurances | number \| string | Optional | |
| residence | string \| null | Optional | |
| scheduledStart | string | Optional | e.g. "08:00" |
| scheduledEnd | string | Optional | e.g. "16:00" |
| gracePeriodMinutes | number | Optional | |
| workDaysInPeriod | number | Optional | |
| hoursPerDay | number | Optional | |
| avatar | string | Optional | |
| currency | string | Optional | |
| createdAt | string | Optional | |
| updatedAt | string | Optional | |

### 2. Salary  (types/salary.ts)
| Field | Type | Required? | Notes |
|---|---|---|---|
| id | string | Required | |
| employeeId | string | Required | |
| profession | string | Optional | Job title |
| baseSalary | number | Required | Main salary |
| lumpSumSalary | number | Optional | |
| livingAllowance | number | Optional | |
| responsibilityAllowance | number | Required | |
| extraEffortAllowance | number | Optional | |
| productionIncentive | number | Required | |
| transportAllowance | number | Required | |
| insuranceAmount | number | Optional | Deduction |
| roundingDifference | number | Optional | |
| extraEffort | number | Deprecated | Use extraEffortAllowance |
| insurances | number | Deprecated | Use insuranceAmount |

### 3. SalaryInput  (types/salary.ts)
| Field | Type | Required? |
|---|---|---|
| employeeId | string | Required |
| profession | string | Optional |
| baseSalary | number | Required |
| lumpSumSalary | number | Optional |
| livingAllowance | number | Optional |
| responsibilityAllowance | number | Optional |
| extraEffortAllowance | number | Optional |
| productionIncentive | number | Optional |
| insuranceAmount | number | Optional |
| transportAllowance | number | Optional |

### 4. Advance  (types/advance.ts)
| Field | Type | Required? | Notes |
|---|---|---|---|
| id | string | Required | |
| employeeId | string | Required | |
| advanceType | "salary" \| "clothing" \| "other" | Required | |
| totalAmount | number \| string \| DecimalLike | Required | |
| installmentAmount | number \| string \| DecimalLike | Required | |
| remainingAmount | number \| string \| DecimalLike | Required | |
| notes | string \| null | Optional | |
| issueDate | string | Required | |
| createdAt | string | Required | |
| updatedAt | string | Required | |

### 5. AdvanceInput  (types/advance.ts)
| Field | Type | Required? |
|---|---|---|
| employeeId | string | Required |
| advanceType | "salary" \| "clothing" \| "other" | Optional |
| totalAmount | number \| string | Required |
| installmentAmount | number \| string | Optional |
| remainingAmount | number \| string | Optional |
| notes | string | Optional |

### 6. Bonus  (types/bonus.ts)
| Field | Type | Required? | Notes |
|---|---|---|---|
| id | string | Required | |
| employeeId | string | Required | |
| bonusAmount | number \| string \| DecimalLike | Required | |
| bonusReason | string \| null | Optional | |
| assistanceAmount | number \| string \| DecimalLike | Required | |
| period | string \| null | Optional | e.g. "2026-04" |
| createdAt | string | Required | |
| updatedAt | string | Required | |

### 7. BonusInput  (types/bonus.ts)
| Field | Type | Required? |
|---|---|---|
| employeeId | string | Required |
| bonusAmount | number \| string | Optional |
| bonusReason | string | Optional |
| assistanceAmount | number \| string | Optional |
| period | string | Optional |

### 8. Penalty  (types/penalty.ts)
| Field | Type | Required? | Notes |
|---|---|---|---|
| id | string | Required | |
| employeeId | string | Required | |
| category | string | Required | e.g. restaurant, clothing, admin |
| amount | number \| string \| DecimalLike | Required | |
| reason | string \| null | Optional | |
| issueDate | string | Required | |
| createdAt | string | Optional | |
| updatedAt | string | Optional | |

### 9. Reward  (types/reward.ts)
| Field | Type | Required? | Notes |
|---|---|---|---|
| id | string | Optional | |
| _id | string | Optional | Legacy |
| employeeId | string | Required | |
| employeeName | string \| null | Optional | |
| type | string | Required | e.g. "performance", "attendance" |
| amount | number \| string \| DecimalLike | Required | |
| date | string \| null | Optional | |
| notes | string \| null | Optional | |
| allEmployees | boolean | Optional | Reward all? |
| createdAt | string | Optional | |
| updatedAt | string | Optional | |

### 10. DiscountRecord  (types/discount.ts)
| Field | Type | Required? | Notes |
|---|---|---|---|
| id | string | Required | |
| employeeId | string | Required | |
| type | string | Required | |
| amount | number | Required | |
| date | string | Required | |
| notes | string \| null | Optional | |
| kind | "advance" \| "assistance" | Required | |
| createdAt | string | Optional | |

### 11. Inventory Item  (types/inventory.ts)
| Field | Type | Required? | Notes |
|---|---|---|---|
| id | string | Required | |
| name | string | Required | |
| sku | string | Required | Stock Keeping Unit |
| category | string | Required | |
| quantity | number | Required | |
| unit | string | Required | |
| minStockLevel | number | Required | |
| unitPrice | number \| string | Optional | |
| costPrice | number \| string | Optional | |

### 12. StockMovement  (types/inventory.ts)
| Field | Type | Required? | Notes |
|---|---|---|---|
| type | "IN" \| "OUT" | Required | |
| quantity | number | Required | |
| date | string | Required | |
| note | string | Optional | |

### 13. PayrollRun  (types/payroll.ts)
| Field | Type | Required? | Notes |
|---|---|---|---|
| id | string | Required | |
| runId | string | Required | |
| periodStart | string | Required | |
| periodEnd | string | Required | |
| runDate | string | Required | |
| status | string | Required | e.g. "draft", "completed" |
| approvalStatus | string | Required | |
| totalEmployees | number | Required | |
| totalGrossPay | number \| string \| DecimalLike | Required | |
| totalDeductions | number \| string \| DecimalLike | Required | |
| totalNetPay | number \| string \| DecimalLike | Required | |
| notes | string \| null | Optional | |

### 14. PayrollItem  (types/payroll.ts)
| Field | Type | Required? | Notes |
|---|---|---|---|
| id | string | Required | |
| payrollRunId | string | Required | |
| employeeId | string | Required | |
| employeeName | string | Required | |
| department | string \| null | Optional | |
| hoursWorked | number \| string \| DecimalLike | Required | |
| hourlyRate | number \| string \| DecimalLike | Required | |
| grossPay | number \| string \| DecimalLike | Required | |
| totalDeductions | number \| string \| DecimalLike | Required | |
| netPay | number \| string \| DecimalLike | Required | |
| netPayRounded | number \| string \| DecimalLike | Required | |
| roundingDifference | number \| string \| DecimalLike | Required | |
| netPayWithAdvance | number \| string \| DecimalLike | Optional | |
| anomalies | string[] | Optional | |

### 15. AttendanceDeductionBreakdown  (types/attendance-deduction.ts)
| Field | Type | Required? | Notes |
|---|---|---|---|
| employeeId | string | Required | |
| presentDays | number | Required | |
| absentDays | number | Required | |
| absenceDeduction | number | Required | |
| delayMinutes | number | Required | |
| delayDeduction | number | Required | |
| totalAttendanceDeduction | number | Required | |
| elapsedWorkDays | number | Required | |
| periodStart | string | Required | |
| periodEnd | string | Required | |

### 16. TransportationDeductionBreakdown  (types/transportation-deduction.ts)
| Field | Type | Required? | Notes |
|---|---|---|---|
| employeeId | string | Required | |
| busId | string | Required | |
| busRoute | string | Optional | |
| transportCost | number | Required | |
| month | string | Required | |
| calculatedDate | string | Required | |

### 17. TerminationRecord  (types/resignation.ts)
| Field | Type | Required? | Notes |
|---|---|---|---|
| id | string | Required | |
| employeeId | string | Required | |
| terminationDate | Date | Required | |
| terminationType | 'resignation' \| 'termination' | Required | |
| reason | string | Required | |
| notes | string | Optional | |
| processedBy | string | Required | |
| createdAt | Date | Required | |

### 18. FinancialSettlement  (types/resignation.ts)
| Field | Type | Required? | Notes |
|---|---|---|---|
| id | string | Required | |
| employeeId | string | Required | |
| settlementDate | Date | Required | |
| processedBy | string | Required | |
| finalSalaryAmount | number | Required | |
| deductions | number | Required | |
| bonuses | number | Required | |
| totalSettlement | number | Required | |
| status | 'pending' \| 'completed' | Required | |
| notes | string | Optional | |
| createdAt | Date | Required | |

### 19. RehireRecord  (types/resignation.ts)
| Field | Type | Required? | Notes |
|---|---|---|---|
| id | string | Required | |
| employeeId | string | Required | |
| rehireDate | Date | Required | |
| processedBy | string | Required | |
| previousTerminationId | string | Required | |
| notes | string | Optional | |
| createdAt | Date | Required | |

### 20. AuditLog  (types/audit.ts)
| Field | Type | Required? | Notes |
|---|---|---|---|
| id | string | Required | |
| action | AuditAction | Required | |
| employeeId | string | Required | |
| employeeName | string | Required | |
| performedBy | string | Required | |
| performedByName | string | Required | |
| userRole | string | Required | |
| timestamp | Date \| string | Required | |
| details | Record<string, unknown> | Required | |
| notes | string | Optional | |
| ipAddress | string | Required | |
| userAgent | string | Required | |

### 21. DashboardKpis  (types/dashboard.ts)
| Field | Type | Required? | Notes |
|---|---|---|---|
| totalEmployees | number | Required | |
| activeToday | number | Required | |
| totalAbsentToday | number | Required | |
| totalDueSalaries | number | Required | |
| totalReceivedSalaries | number | Required | |
| totalLateMinutesToday | number | Required | |
| totalOvertimeMinutesToday | number | Required | |

### 22. AttendanceAlert  (types/dashboard.ts)
| Field | Type | Required? | Notes |
|---|---|---|---|
| status | "absent" \| "late" | Required | |
| employeeId | string | Required | |
| name | string | Required | |
| department | string | Required | |
| scheduledStart | string | Required | |
| checkIn | string \| null | Required | |
| minutesLate | number | Required | |

### 23. EmployeeProfileQuery / Response  (types/employee-profile.ts)
| Field | Type | Required? |
|---|---|---|
| startDate | string | Optional |
| endDate | string | Optional |
| period | string | Optional |
| attendanceLimit | number | Optional |
| advancesLimit | number | Optional |
| bonusesLimit | number | Optional |

### 24. EmployeeProfileSalary  (types/employee-profile.ts)
| Field | Type | Required? | Notes |
|---|---|---|---|
| id | string | Required | |
| employeeId | string | Required | |
| profession | string | Required | |
| baseSalary | DecimalLike | Required | |
| responsibilityAllowance | DecimalLike | Required | |
| productionIncentive | DecimalLike | Required | |
| transportAllowance | DecimalLike | Required | |
| createdAt | string | Required | |
| updatedAt | string | Required | |

### 25. EmployeeProfileAttendanceRecord  (types/employee-profile.ts)
| Field | Type | Required? | Notes |
|---|---|---|---|
| id | string | Required | |
| employeeId | string | Required | |
| timestamp | string | Required | |
| date | string | Required | |
| type | "IN" \| "OUT" | Required | |
| source | string | Optional | |
| verified | boolean | Optional | |
| deviceId | string | Optional | |
| location | string | Optional | |
| notes | string | Optional | |

### 26. EmployeeProfileAdvances  (types/employee-profile.ts)
| Field | Type | Required? |
|---|---|---|
| summary.totalAdvances | number | Required |
| summary.totalAmount | DecimalLike | Required |
| summary.remainingAmount | DecimalLike | Required |
| advances[].id | string | Required |
| advances[].employeeId | string | Required |
| advances[].totalAmount | DecimalLike | Required |
| advances[].installmentAmount | DecimalLike | Required |
| advances[].remainingAmount | DecimalLike | Required |
| advances[].issueDate | string | Required |
| advances[].notes | string \| null | Optional |
| advances[].createdAt | string | Required |
| advances[].updatedAt | string | Required |

### 27. EmployeeProfileBonuses  (types/employee-profile.ts)
| Field | Type | Required? |
|---|---|---|
| period | string \| null | Required |
| summary.totalRecords | number | Required |
| summary.totalBonus | DecimalLike | Required |
| summary.totalAssistance | DecimalLike | Required |
| bonuses[].id | string | Required |
| bonuses[].employeeId | string | Required |
| bonuses[].period | string \| null | Required |
| bonuses[].bonusAmount | DecimalLike | Required |
| bonuses[].assistanceAmount | DecimalLike | Required |
| bonuses[].bonusReason | string \| null | Optional |
| bonuses[].createdAt | string | Required |
| bonuses[].updatedAt | string | Required |

---

## BACKEND ENTITIES (Prisma Schema)

### 1. Role  (schema.prisma)
| Field | DB Type | Required? | Notes |
|---|---|---|---|
| id | UUID | Required (PK) | auto |
| name | String | Required | unique |
| description | String? | Optional | |
| permissions | String[] | Required | default [] |
| createdAt | DateTime | Required | auto |
| updatedAt | DateTime | Required | auto |

### 2. User  (schema.prisma)
| Field | DB Type | Required? | Notes |
|---|---|---|---|
| id | UUID | Required (PK) | auto |
| username | String | Required | unique |
| email | String? | Optional | unique |
| passwordHash | String | Required | |
| roleId | UUID? | Optional | FK → Role |
| status | String | Required | default "active" |
| failedLoginAttempts | Int | Required | default 0 |
| lockoutUntil | DateTime? | Optional | |
| lastLogin | DateTime? | Optional | |
| createdAt | DateTime | Required | auto |
| updatedAt | DateTime | Required | auto |

### 3. BiometricCredential  (schema.prisma)
| Field | DB Type | Required? | Notes |
|---|---|---|---|
| id | UUID | Required (PK) | auto |
| keyId | String | Required | |
| userId | UUID | Required | FK → User |
| publicKeyDer | Bytes | Required | |
| deviceName | String? | Optional | |
| createdAt | DateTime | Required | auto |
| revokedAt | DateTime? | Optional | |

### 4. Employee  (schema.prisma) — THE MAIN MODEL
| Field | DB Type | Required? | Notes |
|---|---|---|---|
| id | UUID | Required (PK) | auto |
| employeeId | String | Required | unique |
| biometricNumber | Int? | Optional | unique |
| name | String | Required | |
| userId | UUID? | Optional | unique, FK → User |
| mobile | String? | Optional | |
| residence | String? | Optional | VARCHAR(200) |
| nationalId | String? | Optional | unique |
| dateOfBirth | DateTime? | Optional | DATE |
| gender | String? | Optional | |
| jobTitle | String? | Optional | |
| profession | String? | Optional | |
| hourlyRate | Decimal(10,2) | Required | |
| dailyRate | Decimal(10,2) | Optional | |
| baseSalary | Decimal(14,2) | Optional | |
| livingAllowance | Decimal(14,2) | Optional | |
| currency | String | Required | default "SYP" |
| scheduledStart | String? | Optional | e.g. "08:00" |
| scheduledEnd | String? | Optional | e.g. "17:00" |
| employmentStartDate | DateTime? | Optional | DATE |
| terminationDate | DateTime? | Optional | DATE |
| terminationType | String? | Optional | resignation \| termination |
| terminationReason | String? | Optional | |
| terminationNotes | String? | Optional | |
| financialSettlementStatus | String | Required | default "pending" |
| financialSettlementDate | DateTime? | Optional | DATE |
| rehireDate | DateTime? | Optional | DATE |
| isSettled | Boolean | Required | default false |
| isFinanciallySettled | Boolean | Required | default false |
| department | String | Required | default "Warehouse" |
| departmentId | UUID? | Optional | FK → Department |
| roleId | UUID? | Optional | FK → Role |
| status | String | Required | default "active" |
| workDaysInPeriod | Int | Required | default 26 |
| hoursPerDay | Int | Required | default 8 |
| overtimeCalculation | Json? | Optional | |
| gracePeriodMinutes | Int | Required | default 15 |
| createdAt | DateTime | Required | auto |
| updatedAt | DateTime | Required | auto |

**🌀 AGE FIELD — COMPUTED, NOT STORED IN DB**
The `age` field shown in the UI is **computed** from `dateOfBirth` using the `calculateAge()` function in `page.tsx:77`. It is NOT a database column.

### 5. Department  (schema.prisma)
| Field | DB Type | Required? | Notes |
|---|---|---|---|
| id | UUID | Required (PK) | auto |
| name | String | Required | unique |
| createdAt | DateTime | Required | auto |
| updatedAt | DateTime | Required | auto |

### 6. LeaveRequest  (schema.prisma)
| Field | DB Type | Required? | Notes |
|---|---|---|---|
| id | UUID | Required (PK) | auto |
| employeeId | String | Required | FK → Employee |
| leaveType | LeaveRequestType | Required | PAID, UNPAID, SICK, ADMIN, DEATH, OTHER |
| status | LeaveRequestStatus | Required | default PENDING |
| isPaid | Boolean | Required | default false |
| startDate | DateTime | Required | DATE |
| endDate | DateTime | Required | DATE |
| isHourly | Boolean | Required | default false |
| startTime | String? | Optional | HH:mm |
| endTime | String? | Optional | HH:mm |
| reason | String? | Optional | |
| notes | String? | Optional | |
| createdAt | DateTime | Required | auto |
| updatedAt | DateTime | Required | auto |

### 7. Device  (schema.prisma)
| Field | DB Type | Required? | Notes |
|---|---|---|---|
| id | UUID | Required (PK) | auto |
| deviceId | String | Required | unique |
| name | String | Required | |
| location | String | Required | |
| model | String | Required | default "ZK Teco" |
| ip | String? | Optional | |
| port | Int? | Optional | |
| status | String | Required | default "active" |
| lastSync | DateTime? | Optional | |
| createdAt | DateTime | Required | auto |
| updatedAt | DateTime | Required | auto |

### 8. AttendanceRecord  (schema.prisma)
| Field | DB Type | Required? | Notes |
|---|---|---|---|
| id | UUID | Required (PK) | auto |
| employeeId | String | Required | FK → Employee |
| timestamp | DateTime | Required | |
| type | String | Required | IN / OUT |
| deviceId | String? | Optional | |
| location | String? | Optional | |
| source | String | Required | default "device" |
| verified | Boolean | Required | default false |
| notes | String? | Optional | |
| date | String | Required | |
| shiftPair | Json? | Optional | |
| createdAt | DateTime | Required | auto |
| updatedAt | DateTime | Required | auto |

### 9. DailyAttendanceLog  (schema.prisma)
| Field | DB Type | Required? | Notes |
|---|---|---|---|
| id | UUID | Required (PK) | auto |
| employeeId | String | Required | FK → Employee |
| date | DateTime | Required | DATE |
| recordType | DailyRecordType | Required | ABSENCE, DELAY_MINUTES, OVERTIME_MINUTES, etc. |
| value | Decimal(10,2) | Required | e.g. 1 day or 120 minutes |
| notes | String? | Optional | TEXT |
| source | String | Required | default "manual" |
| createdBy | String? | Optional | |
| createdAt | DateTime | Required | auto |
| updatedAt | DateTime | Required | auto |

### 10. Product  (schema.prisma)
| Field | DB Type | Required? | Notes |
|---|---|---|---|
| id | UUID | Required (PK) | auto |
| sku | String | Required | unique |
| name | String | Required | |
| category | String | Required | |
| unitPrice | Decimal(12,2) | Required | |
| costPrice | Decimal(12,2) | Required | |
| reorderLevel | Int | Required | default 10 |
| status | String | Required | default "active" |
| createdAt | DateTime | Required | auto |
| updatedAt | DateTime | Required | auto |

### 11. StockLevel  (schema.prisma)
| Field | DB Type | Required? | Notes |
|---|---|---|---|
| id | UUID | Required (PK) | auto |
| sku | String | Required | FK → Product |
| location | String | Required | |
| quantity | Int | Required | default 0 |
| reserved | Int | Required | default 0 |
| available | Int | Required | default 0 |
| createdAt | DateTime | Required | auto |
| updatedAt | DateTime | Required | auto |

### 12. ImportJob  (schema.prisma)
| Field | DB Type | Required? | Notes |
|---|---|---|---|
| id | UUID | Required (PK) | auto |
| jobId | String | Required | unique |
| entity | String | Required | |
| fileName | String | Required | |
| uploadedBy | String | Required | |
| uploadedAt | DateTime | Required | auto |
| status | String | Required | default "pending" |
| totalRows | Int | Required | default 0 |
| successRows | Int | Required | default 0 |
| errorRows | Int | Required | default 0 |
| errors | Json | Required | default [] |
| createdAt | DateTime | Required | auto |
| updatedAt | DateTime | Required | auto |

### 13. PayrollRun  (schema.prisma)
| Field | DB Type | Required? | Notes |
|---|---|---|---|
| id | UUID | Required (PK) | auto |
| runId | String | Required | unique |
| periodStart | DateTime | Required | DATE |
| periodEnd | DateTime | Required | DATE |
| periodType | String | Required | default "monthly" |
| runDate | DateTime | Required | auto now |
| runBy | String? | Optional | |
| status | String | Required | default "draft" |
| approvalStatus | String | Required | default "pending" |
| approvedBy | String? | Optional | |
| approvalDate | DateTime? | Optional | |
| totalEmployees | Int | Required | default 0 |
| totalGrossPay | Decimal(14,2) | Required | default 0 |
| totalDeductions | Decimal(14,2) | Required | default 0 |
| totalNetPay | Decimal(14,2) | Required | default 0 |
| currency | String | Required | default "SYP" |
| notes | String? | Optional | |

### 14. PayrollItem  (schema.prisma)
| Field | DB Type | Required? | Notes |
|---|---|---|---|
| id | UUID | Required (PK) | auto |
| payrollRunId | UUID | Required | FK → PayrollRun |
| employeeId | String | Required | |
| employeeName | String | Required | |
| department | String? | Optional | |
| hoursWorked | Decimal(8,2) | Required | |
| hourlyRate | Decimal(10,2) | Required | |
| grossPay | Decimal(14,2) | Required | |
| totalDeductions | Decimal(14,2) | Required | |
| netPay | Decimal(14,2) | Required | |
| netPayRounded | Decimal(14,2) | Required | default 0 |
| roundingDifference | Decimal(14,2) | Required | default 0 |
| netPayWithAdvance | Decimal(14,2) | Required | default 0 |
| anomalies | String[] | Required | default [] |
| createdAt | DateTime | Required | auto |
| updatedAt | DateTime | Required | auto |

### 15. PayrollInput  (schema.prisma)
| Field | DB Type | Required? | Notes |
|---|---|---|---|
| id | UUID | Required (PK) | auto |
| employeeId | String | Required | |
| periodStart | DateTime | Required | DATE |
| periodEnd | DateTime | Required | DATE |
| lateMinutes | Int | Required | default 0 |
| earlyLeaveMinutes | Int | Required | default 0 |
| absenceDays | Int | Required | default 0 |
| sickLeaveDays | Int | Required | default 0 |
| adminLeaveDays | Int | Required | default 0 |
| unpaidLeaveDays | Int | Required | default 0 |
| deathLeaveDays | Int | Required | default 0 |
| unpaidHours | Decimal(8,2) | Required | default 0 |
| overtimeRegularMinutes | Int | Required | default 0 |
| overtimeWeekendDays | Decimal(6,2) | Required | default 0 |
| penaltyAmount | Decimal(14,2) | Required | default 0 |
| clothingDeduction | Decimal(14,2) | Required | default 0 |
| bonusAdjustment | Decimal(14,2) | Required | default 0 |
| advanceAmount | Decimal(14,2) | Required | default 0 |
| insuranceAmount | Decimal(14,2)? | Optional | |
| transportAllowanceOverride | Decimal(14,2)? | Optional | |
| notes | String? | Optional | |
| createdAt | DateTime | Required | auto |
| updatedAt | DateTime | Required | auto |

### 16. EmployeeSalary  (schema.prisma)
| Field | DB Type | Required? | Notes |
|---|---|---|---|
| id | UUID | Required (PK) | auto |
| employeeId | String | Required | unique |
| profession | String? | Optional | |
| baseSalary | Decimal(14,2) | Required | |
| lumpSumSalary | Decimal(14,2) | Required | default 0 |
| livingAllowance | Decimal(14,2) | Required | default 0 |
| responsibilityAllowance | Decimal(14,2) | Required | default 0 |
| extraEffortAllowance | Decimal(14,2) | Required | default 0 |
| productionIncentive | Decimal(14,2) | Required | default 0 |
| insuranceAmount | Decimal(14,2) | Required | default 0 |
| transportAllowance | Decimal(14,2) | Required | default 0 |
| createdAt | DateTime | Required | auto |
| updatedAt | DateTime | Required | auto |

### 17. EmployeeAdvance  (schema.prisma)
| Field | DB Type | Required? | Notes |
|---|---|---|---|
| id | UUID | Required (PK) | auto |
| employeeId | String | Required | FK → Employee |
| advanceType | String | Required | default "salary" |
| totalAmount | Decimal(14,2) | Required | |
| installmentAmount | Decimal(14,2) | Required | default 0 |
| remainingAmount | Decimal(14,2) | Required | |
| notes | String? | Optional | |
| issueDate | DateTime | Required | auto now |
| createdAt | DateTime | Required | auto |
| updatedAt | DateTime | Required | auto |

### 18. EmployeeInsurance  (schema.prisma)
| Field | DB Type | Required? | Notes |
|---|---|---|---|
| id | UUID | Required (PK) | auto |
| employeeId | String | Required | unique |
| insuranceSalary | Decimal(14,2) | Required | |
| socialSecurityNumber | String? | Optional | |
| registrationDate | DateTime? | Optional | |
| createdAt | DateTime | Required | auto |
| updatedAt | DateTime | Required | auto |

### 19. EmployeeBonus  (schema.prisma)
| Field | DB Type | Required? | Notes |
|---|---|---|---|
| id | UUID | Required (PK) | auto |
| employeeId | String | Required | |
| bonusAmount | Decimal(14,2) | Required | default 0 |
| bonusReason | String? | Optional | |
| assistanceAmount | Decimal(14,2) | Required | default 0 |
| period | String? | Optional | e.g. "2026-04" |
| createdAt | DateTime | Required | auto |
| updatedAt | DateTime | Required | auto |

### 20. EmployeePenalty  (schema.prisma)
| Field | DB Type | Required? | Notes |
|---|---|---|---|
| id | UUID | Required (PK) | auto |
| employeeId | String | Required | |
| category | String | Required | |
| amount | Decimal(14,2) | Required | |
| reason | String? | Optional | |
| issueDate | DateTime | Required | auto now |
| createdAt | DateTime | Required | auto |
| updatedAt | DateTime | Required | auto |

### 21. TerminationRecord  (schema.prisma)
| Field | DB Type | Required? | Notes |
|---|---|---|---|
| id | UUID | Required (PK) | auto |
| employeeId | String | Required | FK → Employee |
| terminationDate | DateTime | Required | DATE |
| terminationType | String | Required | |
| reason | String | Required | |
| notes | String? | Optional | |
| processedBy | String | Required | |
| createdAt | DateTime | Required | auto |
| updatedAt | DateTime | Required | auto |

### 22. FinancialSettlement  (schema.prisma)
| Field | DB Type | Required? | Notes |
|---|---|---|---|
| id | UUID | Required (PK) | auto |
| employeeId | String | Required | FK → Employee |
| settlementDate | DateTime | Required | DATE |
| processedBy | String | Required | |
| finalSalaryAmount | Decimal(14,2) | Required | |
| deductions | Decimal(14,2) | Required | default 0 |
| bonuses | Decimal(14,2) | Required | default 0 |
| totalSettlement | Decimal(14,2) | Required | |
| status | String | Required | default "completed" |
| notes | String? | Optional | |
| createdAt | DateTime | Required | auto |
| updatedAt | DateTime | Required | auto |

### 23. RehireRecord  (schema.prisma)
| Field | DB Type | Required? | Notes |
|---|---|---|---|
| id | UUID | Required (PK) | auto |
| employeeId | String | Required | FK → Employee |
| rehireDate | DateTime | Required | DATE |
| processedBy | String | Required | |
| previousTerminationId | UUID? | Optional | FK → TerminationRecord |
| notes | String? | Optional | |
| createdAt | DateTime | Required | auto |
| updatedAt | DateTime | Required | auto |

### 24. Bus  (schema.prisma)
| Field | DB Type | Required? | Notes |
|---|---|---|---|
| id | UUID | Required (PK) | auto |
| busId | String | Required | unique |
| route | String | Required | |
| plateNumber | String | Required | unique |
| driverName | String | Required | |
| driverPhone | String | Required | |
| totalCost | Decimal(14,2) | Required | |
| companyDeductionPct | Decimal(5,2) | Required | |
| capacity | Int | Required | |
| employeeDeductionPct | Decimal(5,2) | Required | default 0 |
| status | String | Required | default "active" |
| createdAt | DateTime | Required | auto |
| updatedAt | DateTime | Required | auto |

### 25. BusPassenger  (schema.prisma)
| Field | DB Type | Required? | Notes |
|---|---|---|---|
| id | UUID | Required (PK) | auto |
| busId | UUID | Required | FK → Bus |
| employeeId | String | Required | |
| name | String? | Optional | |
| paidAmount | Decimal(12,2)? | Optional | |
| isManual | Boolean | Required | default false |
| joinDate | DateTime | Required | auto DATE |
| leaveDate | DateTime? | Optional | DATE |
| status | String | Required | default "active" |
| createdAt | DateTime | Required | auto |
| updatedAt | DateTime | Required | auto |

### 26. AuditLog  (schema.prisma)
| Field | DB Type | Required? | Notes |
|---|---|---|---|
| id | CUID | Required (PK) | |
| actorId | String? | Optional | userId |
| actorUsername | String? | Optional | |
| action | String | Required | |
| targetType | String? | Optional | |
| targetId | String? | Optional | |
| ipAddress | String? | Optional | |
| userAgent | String? | Optional | |
| metadata | Json? | Optional | |
| createdAt | DateTime | Required | auto |

### 27. DeletedRecordHistory  (schema.prisma)
| Field | DB Type | Required? | Notes |
|---|---|---|---|
| id | UUID | Required (PK) | auto |
| entityType | String | Required | |
| recordId | String | Required | |
| payload | Json | Required | |
| deletedBy | String? | Optional | |
| deletedAt | DateTime | Required | auto |
| restoredBy | String? | Optional | |
| restoredAt | DateTime? | Optional | |

---

## CROSS-MODULE FIELD MAPPING

| Concept | Frontend Field | Backend Field | DB Column |
|---|---|---|---|
| Employee number | `employeeId` | `employeeId` | `employeeId` (String) |
| Employee name | `name` | `name` | `name` (String) |
| Age | **COMPUTED** | — | from `dateOfBirth` |
| Phone/mobile | `mobile` | `mobile` | `mobile` (String?) |
| Birth date | `dateOfBirth` | — | `dateOfBirth` (DateTime) |
| Department | `department` | `department` | `department` (String) |
| Job title | `jobTitle` | `jobTitle` | `jobTitle` (String?) |
| Base salary | `baseSalary` | — | `baseSalary` (Decimal) |
| Attendance | — | — | `AttendanceRecord` |
| Bonuses | `bonusAmount`, `assistanceAmount` | — | `EmployeeBonus` |
| Advances | `totalAmount`, `remainingAmount` | — | `EmployeeAdvance` |
| Penalties | `amount` | — | `EmployeePenalty` |
| Payroll | `grossPay`, `netPay`, `totalDeductions` | — | `PayrollItem` |

---

## ENUMS

| Enum | Values |
|---|---|
| LeaveRequestType | PAID, UNPAID, SICK, ADMIN, DEATH, OTHER |
| LeaveRequestStatus | PENDING, APPROVED, REJECTED, CANCELLED |
| DailyRecordType | ABSENCE, DELAY_MINUTES, OVERTIME_MINUTES, PAID_LEAVE, UNPAID_LEAVE, SICK_LEAVE, ADMIN_LEAVE, DEATH_LEAVE, EARLY_LEAVE_MINUTES |
| AuditAction | EMPLOYEE_TERMINATED, EMPLOYEE_REHIRED, FINANCIAL_SETTLEMENT_COMPLETED, EMPLOYEE_VIEWED, RESIGNED_LIST_EXPORTED, AUDIT_LOG_VIEWED |
| AdvanceType | salary, clothing, other |
| DiscountKind | advance, assistance |
