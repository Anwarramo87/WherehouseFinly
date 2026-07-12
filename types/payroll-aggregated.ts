import type { Salary } from "./salary";
import type { Bonus } from "./bonus";
import type { DiscountRecord } from "@/hooks/useDiscounts";
import type { PenaltyRecord } from "@/hooks/usePenalties";

/**
 * One row in the payroll table.
 *
 * Financial totals (grossPay … roundingDifference) are ALWAYS sourced from the
 * backend payrollItem record.  The `fixedEarnings / variableEarnings /
 * fixedDeductions / variableDeductions` fields are display-only subtotals used
 * inside the payslip modal — they never override the server-authoritative figures.
 */
export interface AggregatedPayroll {
  employeeId: string;
  employeeName: string;
  /** From employee.department in the backend — NOT from salaryConfig.profession */
  department: string;

  // ✅ Server-authoritative figures — sourced from payrollItem
  grossPay: number;
  totalDeductions: number;
  netPay: number;
  netPayRounded: number;
  roundingDifference: number;
  anomalies: string[];
  attendanceBasedSalary: number;

  // 💰 Earned salary based on actual work days (hoursWorked × hourlyRate) — from attendance
  bonusesTotal: number;

  // ✂️ Total deductions from the discounts/advances page (advances + penalties + other)
  discountsTotal: number;

  // 📋 Visual-only subtotals for the payslip modal
  fixedEarnings: number;
  variableEarnings: number;
  fixedDeductions: number;
  variableDeductions: number;

  // 💰 Earned salary based on actual work days (hoursWorked × hourlyRate) — from attendance
  earnedSalary: number;

  // ✂️ Early leave / missing minutes deduction (from backend payroll run)
  totalEarlyLeaveMinutes: number;
  earlyLeaveDeduction: number;

  details: {
    salaryConfig: Salary | null;
    bonuses: Bonus[];
    deductions: (DiscountRecord | PenaltyRecord)[];
    attendance: null;
  };
}
