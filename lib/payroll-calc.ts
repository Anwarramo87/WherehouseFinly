/**
 * Payroll calculation utilities
 * Shared between payroll/page.tsx and timeTable/page.tsx
 */

export const STANDARD_WORK_DAYS = 26;
export const HOURS_PER_DAY = 8;

/**
 * حساب الراتب المستحق — نفس الصيغة المستخدمة في صفحة TimeTable بالضبط
 * الصيغة:
 *   (grossSalary / STANDARD_WORK_DAYS) * paidDays
 *   + إضافي عادي (دقائق × 1.5×)
 *   + إضافي جمعة (أيام × dailyRate × 1.5×)
 *   - خصم التأخير (دقائق × 1.5×)
 *   - خصم الخروج المبكر (دقائق × 1.0×)
 */
export const calcEarnedSalary = (
  grossSalary: number,
  presentDays: number,
  paidLeaveDays: number,
  lateMinutes: number,
  earlyLeaveMinutes = 0,
  overtimeMinutes = 0,
  overtimeWeekendDays = 0,
): number => {
  if (grossSalary <= 0) return 0;
  const paidDays = Math.min(presentDays + paidLeaveDays, STANDARD_WORK_DAYS);
  const dailyRate = grossSalary / STANDARD_WORK_DAYS;
  const minuteRate = dailyRate / (HOURS_PER_DAY * 60);
  const salaryFromDays = dailyRate * paidDays;
  const lateDeduction = lateMinutes * minuteRate * 1.5;
  const earlyLeaveDeduction = earlyLeaveMinutes * minuteRate;
  const overtimePay = overtimeMinutes * minuteRate * 1.5;
  const weekendOvertimePay = dailyRate * overtimeWeekendDays * 1.5;
  return Math.max(
    0,
    salaryFromDays - lateDeduction - earlyLeaveDeduction + overtimePay + weekendOvertimePay,
  );
};

export const calcLateMinutes = (checkIn: string, scheduledStart: string, gracePeriod = 5): number => {
  if (!checkIn) return 0;
  const toMins = (t: string) => {
    const s = t.slice(0, 5);
    const [h, m] = s.split(":").map(Number);
    if (Number.isNaN(h) || Number.isNaN(m)) return null;
    return h * 60 + m;
  };
  const ci = toMins(checkIn);
  const sc = toMins(scheduledStart || "08:00");
  if (ci === null || sc === null) return 0;
  const diff = ci - sc - gracePeriod;
  return diff > 0 ? diff : 0;
};
