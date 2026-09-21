/**
 * Payroll calculation utilities
 * Shared between payroll/page.tsx and timeTable/page.tsx
 */

export const STANDARD_WORK_DAYS = 26;
export const HOURS_PER_DAY = 8;
/** معامل أجر يوم الجمعة: كل دقيقة فعلية × 1.5 */
export const WEEKEND_MULTIPLIER = 1.5;

/**
 * حساب الراتب المستحق — نفس الصيغة المستخدمة في صفحة TimeTable بالضبط
 * الصيغة:
 *   (grossSalary / STANDARD_WORK_DAYS) * paidDays
 *   + إضافي عادي (دقائق × 1.5×)
 *   + دقائق الجمعة (دقائق فعلية × 1.5×)
 *   - خصم التأخير (دقائق × 1.5×)
 *   - خصم الخروج المبكر (دقائق × 1.0×)
 *
 * overtimeWeekendDays الآن = دقائق الجمعة الفعلية (ليس عدد الأيام)
 */
export const calcEarnedSalary = (
  grossSalary: number,
  presentDays: number,
  paidLeaveDays: number,
  lateMinutes: number,
  earlyLeaveMinutes = 0,
  overtimeMinutes = 0,
  overtimeWeekendDays = 0,
  hoursPerDay: number = HOURS_PER_DAY,
): number => {
  if (grossSalary <= 0) return 0;
  const effectiveHours = hoursPerDay > 0 ? hoursPerDay : HOURS_PER_DAY;
  const paidDays = Math.min(presentDays + paidLeaveDays, STANDARD_WORK_DAYS);
  const dailyRate = grossSalary / STANDARD_WORK_DAYS;
  const minuteRate = dailyRate / (effectiveHours * 60);
  const salaryFromDays = dailyRate * paidDays;
  const lateDeduction = lateMinutes * minuteRate * 1.5;
  const earlyLeaveDeduction = earlyLeaveMinutes * minuteRate;
  const overtimePay = overtimeMinutes * minuteRate * 1.5;
  // overtimeWeekendDays = دقائق الجمعة الفعلية × 1.5
  const weekendOvertimePay = overtimeWeekendDays * minuteRate * WEEKEND_MULTIPLIER;
  return Math.max(
    0,
    salaryFromDays - lateDeduction - earlyLeaveDeduction + overtimePay + weekendOvertimePay,
  );
};

/**
 * حساب الراتب المستحق على أساس الساعات الفعلية (نموذج بالساعات).
 *
 * - workedMinutes  → أجر كامل (معدل الساعة).
 * - sickRemainderMinutes → أجر بنصف المعدل (باقي يوم إجازة مرضية جزئية).
 * - أيام الإجازة الكاملة (sickLeaveDays/paidLeaveDays) تُضاف كأيام كاملة.
 * - overtimeWeekendDays = دقائق الجمعة الفعلية (من الباك إند) × 1.5×
 * - manualOverrides: تعديلات زر "تعديل المجاميع" اليدوية — عند تمريرها
 *   تُشتق أيام العمل المدفوعة من المجاميع اليدوية مباشرةً، فينعكس أي تعديل
 *   (زيادة/إنقاص/تصفير) فوراً على الراتب المحسوب.
 */
export const calcEarnedSalaryHourly = (
  grossSalary: number,
  workDaysInPeriod: number,
  hoursPerDay: number,
  workedMinutes: number,
  sickRemainderMinutes: number,
  sickLeaveDays = 0,
  paidLeaveDays = 0,
  overtimeMinutes = 0,
  lateMinutes = 0,
  earlyLeaveMinutes = 0,
  overtimeWeekendDays = 0,
  manualOverrides?: {
    absenceDays?: number | null;
    unpaidLeaveDays?: number | null;
    sickLeaveDays?: number | null;
    paidLeaveDays?: number | null;
    lateMinutes?: number | null;
    earlyLeaveMinutes?: number | null;
    overtimeMinutes?: number | null;
    weekendOvertimeMinutes?: number | null;
    unpaidHours?: number | null;
  },
): number => {
  if (grossSalary <= 0) return 0;
  const effectiveWorkDays = workDaysInPeriod > 0 ? workDaysInPeriod : STANDARD_WORK_DAYS;
  const effectiveHours = hoursPerDay > 0 ? hoursPerDay : HOURS_PER_DAY;

  const dailyRate = grossSalary / effectiveWorkDays;
  const hourlyRate = dailyRate / effectiveHours;
  const minuteRate = hourlyRate / 60;

  // التعديلات اليدوية تُقدَّم دائماً: أي قيمة عدّلها المدير في المودال هي
  // مصدر الحقيقة لذلك البُعد، والبيانات الآلية تُستخدم فقط عند غياب التعديل.
  const ov = manualOverrides;
  const effSickDays = ov?.sickLeaveDays != null ? Math.max(0, ov.sickLeaveDays) : sickLeaveDays;
  const effPaidDays = ov?.paidLeaveDays != null ? Math.max(0, ov.paidLeaveDays) : paidLeaveDays;
  const effOvertime = ov?.overtimeMinutes != null ? Math.max(0, ov.overtimeMinutes) : overtimeMinutes;
  const effWeekendOt =
    ov?.weekendOvertimeMinutes != null ? Math.max(0, ov.weekendOvertimeMinutes) : overtimeWeekendDays;
  const effLate = ov?.lateMinutes != null ? Math.max(0, ov.lateMinutes) : lateMinutes;
  const effEarly =
    ov?.earlyLeaveMinutes != null ? Math.max(0, ov.earlyLeaveMinutes) : earlyLeaveMinutes;

  // أيام العمل المدفوعة: عند وجود تعديل يدوي تُشتق من المجاميع اليدوية
  // (أيام العمل − غياب − بدون أجر − مرضية − مدفوعة) حتى ينعكس تعديل أيام
  // الدوام/الغياب على الراتب، وإلا تُشتق من دقائق العمل الفعلية كالسابق.
  let effectiveWorkedMinutes = workedMinutes;
  if (ov != null) {
    const absenceDays = Math.max(0, ov.absenceDays ?? 0);
    const unpaidDays = Math.max(0, ov.unpaidLeaveDays ?? 0);
    const unpaidMinutes = Math.max(0, ov.unpaidHours ?? 0) * 60;
    const presentDays = Math.max(
      0,
      effectiveWorkDays - absenceDays - unpaidDays - effSickDays - effPaidDays,
    );
    effectiveWorkedMinutes = Math.max(0, presentDays * effectiveHours * 60 - unpaidMinutes);
  }

  // Cap workedMinutes at effectiveWorkDays × hoursPerDay × 60 to prevent overpayment
  const maxContractualMinutes = effectiveWorkDays * effectiveHours * 60;
  const cappedWorkedMinutes = Math.min(effectiveWorkedMinutes, maxContractualMinutes);

  const workedPay = minuteRate * cappedWorkedMinutes;
  const sickRemainderPay = minuteRate * sickRemainderMinutes * 0.5;
  const fullSickPay = dailyRate * effSickDays * 0.5;
  const paidLeavePay = dailyRate * effPaidDays;
  const overtimePay = minuteRate * effOvertime * 1.5;
  // overtimeWeekendDays = دقائق الجمعة الفعلية × 1.5
  const weekendOvertimePay = minuteRate * effWeekendOt * WEEKEND_MULTIPLIER;
  const lateDeduction = minuteRate * effLate * 1.5;
  const earlyLeaveDeduction = minuteRate * effEarly;

  return Math.max(
    0,
    workedPay +
      sickRemainderPay +
      fullSickPay +
      paidLeavePay +
      overtimePay +
      weekendOvertimePay -
      lateDeduction -
      earlyLeaveDeduction,
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
