# Calculation Formulas Reference

This file documents the currently traced calculation formulas in the Factory frontend and Backend NestJS service.
It is a code-based reference, not a business-specification document.

## Frontend

### 1) Salary configuration modal live total
- File: `app/(dashboard)/salaries/salariesSetting/page.tsx`
- Formula: `monthlyFixedTotal = base + lumpSum + living + responsibility + extraEffort + production + transport - insurance`
- Inputs:
  - `base` from `salary.baseSalary` or `employee.hourlyRate`
  - `lumpSum` from `salary.lumpSumSalary`
  - `living` from `salary.livingAllowance` or employee fallback
  - `responsibility` from `salary.responsibilityAllowance`
  - `extraEffort` from `salary.extraEffortAllowance` or legacy `extraEffort`
  - `production` from `salary.productionIncentive`
  - `transport` from `salary.transportAllowance`
  - `insurance` from `salary.insuranceAmount` or legacy `insurances`
- Meaning: the table shows the fixed monthly total as a sum of salary components minus insurance.

### 2) Salary configuration page row display
- File: `app/(dashboard)/salaries/salariesSetting/page.tsx`
- Formula used for the displayed monthly salary cell: same `monthlyFixedTotal` as above.
- Special fallback behavior:
  - If no employee name is found, the UI now shows `employeeId` instead of `موظف غير معروف`.

### 3) Salary editor modal summary
- File: `components/ManageSalaryModal.tsx`
- Live formula:
  - `netTotal = baseSalary + livingAllowance + transportAllowance - insuranceAmount`
- Submission payload:
  - `baseSalary` is rounded with `Math.round`
  - `lumpSumSalary`, `responsibilityAllowance`, `extraEffortAllowance`, `productionIncentive` are sent as `0` in the current modal flow
- Validation rule:
  - `livingAllowance <= baseSalary`

### 4) Payroll report display
- File: `app/(dashboard)/salaries/payroll/page.tsx`
- Formula for the visual fixed earnings subtotal:
  - `fixedEarnings = baseSalary + lumpSumSalary + livingAllowance + transportAllowance`
- Formula for variable earnings:
  - `variableEarnings = sum(bonusAmount) + sum(assistanceAmount)`
- Formula for the displayed net pay:
  - `netPay = (fixedEarnings + variableEarnings) - (fixedDeductions + variableDeductions)`
- Notes:
  - `fixedDeductions = insuranceAmount`
  - `variableDeductions = advancesDeduction + attendancePenalty`

### 5) Employee payslip / drilldown page
- File: `app/(dashboard)/employees/[id]/page.tsx`
- Formula:
  - `totalDues = baseSalary + totalBonuses - totalDeductions - totalAdvances`
- Fallback base salary:
  - `fallbackBase = baseSalary || salary || hourlyRate`

### 6) Vouchers page display
- File: `app/(dashboard)/vouchers/page.tsx`
- Formula:
  - `fixedEarnings = baseSalary + lumpSumSalary + livingAllowance + transportAllowance`
  - `fixedDeductions = insuranceAmount`
  - `variableEarnings = sum(bonusAmount) + sum(assistanceAmount)`
  - `variableDeductions = advancesDeduction + attendancePenalty`
  - `netPay = (fixedEarnings + variableEarnings) - (fixedDeductions + variableDeductions)`

### 7) Employee detail compensation estimate
- File: `components/FireEmployeeModal.tsx`
- Formula:
  - `baseSalary = employee.baseSalary || hourlyRate * 8 * 30`
  - `daysWorkedThisMonth = new Date(fireDate).getDate()`
  - `dueSalary = (baseSalary / 30) * daysWorkedThisMonth`
  - `totalDues = dueSalary + bonus`

## Backend

### 8) Payroll run calculation
- File: `src/payroll/payroll.service.ts`
- Employee base inputs:
  - `fallbackBaseSalary = hourlyRate * hoursPerDay * workDays`
  - `baseSalary = salaryRecord.baseSalary || employee.baseSalary || fallbackBaseSalary`
  - `livingAllowance`, `lumpSumSalary`, `responsibilityAllowance`, `extraEffortAllowance`, `productionIncentive` are read from salary records
- Core salary bundle:
  - `g3 = baseSalary + livingAllowance + lumpSumSalary + responsibilityAllowance + extraEffortAllowance + productionIncentive`
- Derived wage rates:
  - `dailyWage = g3 / STANDARD_WORK_DAYS`
  - `hourlyWage = dailyWage / STANDARD_HOURS_PER_DAY`
  - `minuteWage = hourlyWage / MINUTES_PER_HOUR`
- Attendance / overtime penalties and rewards:
  - `latePenalty = minuteWage * 1.5 * lateMinutes`
  - `earlyLeavePenalty = minuteWage * earlyLeaveMinutes`
  - `absencePenalty = dailyWage * absenceDays`
  - `sickLeavePenalty = dailyWage * sickLeaveDays * 0.5`
  - `unpaidLeavePenalty = dailyWage * unpaidLeaveDays`
  - `unpaidHoursPenalty = hourlyWage * unpaidHours`
  - `overtimeWeekendPay = dailyWage * overtimeWeekendDays * 2`
  - `overtimeRegularPay = minuteWage * 1.5 * overtimeRegularMinutes`
- Transport adjustment:
  - `transportAllowance = transportAllowanceBase / STANDARD_WORK_DAYS * max(0, 26 - leaveTotal)` when transportation deductions are enabled
- Gross and net pay:
  - `grossPay = g3 + overtimeWeekendPay + overtimeRegularPay + bonusAdjustment + transportAllowance`
  - `penaltyTotal = penaltyAmount + clothingDeduction`
  - `employeeDeductions = latePenalty + earlyLeavePenalty + absencePenalty + sickLeavePenalty + unpaidLeavePenalty + unpaidHoursPenalty + penaltyTotal + advanceAmount + insuranceAmount`
  - `netPay = grossPay - employeeDeductions`
  - `netPayRounded = roundUpToNearestThousand(netPay)`
  - `roundingDifference = netPayRounded - netPay`
  - `netPayWithAdvance = netPayRounded`
- Run totals:
  - `totalGross += grossPay`
  - `totalDeductions += employeeDeductions`
  - `totalNet += netPayRounded`

### 9) Attendance deduction calculation
- File: `src/attendance/attendance.service.ts`
- Formula per employee:
  - `presentDays = unique attendance dates`
  - `absentDays = max(0, workDaysInPeriod - presentDays)`
  - `totalDelayMinutes = sum(max(0, minutesLate - gracePeriodMinutes))`
  - `effectiveHourlyRate = hourlyRate || (baseSalary / (workDaysInPeriod * hoursPerDay))`
  - `dailyRate = effectiveHourlyRate * hoursPerDay`
  - `minuteRate = dailyRate / (hoursPerDay * 60)`
  - `absenceDeduction = absentDays * dailyRate`
  - `delayDeduction = totalDelayMinutes * minuteRate`
  - `totalAttendanceDeduction = absenceDeduction + delayDeduction`
- Summary totals:
  - `totalAbsenceDeduction = sum(absenceDeduction)`
  - `totalDelayDeduction = sum(delayDeduction)`
  - `totalAttendanceDeduction = totalAbsenceDeduction + totalDelayDeduction`

### 10) Discount / finance records
- File: `src/discounts/discounts.service.ts`
- Formula mapping:
  - Advances: `amount = remainingAmount || totalAmount`
  - Assistance / bonus deductions: `amount = assistanceAmount`
- Aggregation in list endpoints:
  - `advanceRecords + bonusRecords` merged and sorted by descending date

### 11) Advances update logic
- File: `src/advances/advances.service.ts`
- Formula used in update/create paths:
  - `remainingAmount` is treated as the payable balance
  - `deductible = min(installmentAmount, remainingAmount)` when building payroll deductions

### 12) Bonuses update logic
- File: `src/bonuses/bonuses.service.ts`
- Formula used in the list / summaries:
  - `totalBonus = sum(bonusAmount)`
  - `totalAssistance = sum(assistanceAmount)`
- Update math:
  - `bonusAmount` and `assistanceAmount` are stored as decimals and summed directly

## Notes

- The frontend has both display-only formulas and edit-time formulas. If a number looks "doubled", check whether the UI is summing several salary components rather than showing only the base salary.
- The backend payroll service is the authoritative source for final payroll numbers.
- Some pages still use legacy aliases such as `extraEffort` and `insurances`; the current code handles both.