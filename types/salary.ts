/**
 * Canonical Salary record — matches the backend `employeeSalary` Prisma model
 * and `UpsertSalaryDto` field names.
 */
export interface Salary {
  id: string;
  employeeId: string; // e.g. EMP001

  /** المهنة / الوظيفة */
  profession?: string;

  /** الراتب الأساسي الكلي */
  baseSalary: number;

  /** الراتب المقطوع */
  lumpSumSalary?: number;

  /** بدل غلاء معيشة */
  livingAllowance?: number;

  /** تعويض مسؤولية (50% من الفرق) — Canonical */
  responsibilityAllowance: number;

  /** تعويض جهد إضافي (30% من الفرق) — Canonical */
  extraEffortAllowance?: number;

  /** حوافز إنتاجية (20% من الفرق) */
  productionIncentive: number;

  /** بدل النقل */
  transportAllowance: number;

  /** التأمينات (خصم) — Canonical */
  insuranceAmount?: number;

  /** فرق التقريب (إختياري) - الفرق بين صافي الراتب المحسوب وصافي الراتب المقرب */
  roundingDifference?: number;

  /** الراتب الشهري المحسوب من الباك إند (baseSalary + livingAllowance + allowances) */
  monthlySalary?: number;
}

/**
 * The input type sent to `PUT /api/salary/:employeeId`.
 * Uses canonical DTO field names.
 */
export interface SalaryInput {
  employeeId: string;
  profession?: string;
  baseSalary: number;
  lumpSumSalary?: number;
  livingAllowance?: number;
  responsibilityAllowance?: number;
  extraEffortAllowance?: number;
  productionIncentive?: number;
  insuranceAmount?: number;
  transportAllowance?: number;
}
