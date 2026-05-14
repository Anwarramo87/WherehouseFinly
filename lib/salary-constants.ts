/**
 * Salary Calculation Constants
 * هذه الثوابت تُستخدم في معادلة حساب الرواتب
 */

export const SALARY_CONSTANTS = {
  // أيام العمل الشهرية (افتراضي)
  WORKING_DAYS_PER_MONTH: 26,

  // ساعات العمل اليومية (قياسي)
  WORKING_HOURS_PER_DAY: 8,

  // معامل الإضافي (ساعة إضافية = 1.5x الراتب)
  OVERTIME_MULTIPLIER: 1.5,

  // دقائق السماح الافتراضية (قبل حساب الخصم)
  DEFAULT_GRACE_PERIOD_MINUTES: 5,

  // نسب البدلات المحسوبة من الفرق
  ALLOWANCE_PERCENTAGES: {
    extraEffort: 0.3,           // جهد إضافي 30%
    responsibility: 0.5,        // تعويض مسؤولية 50%
    productionIncentive: 0.2,   // حوافز إنتاجية 20%
  },
} as const;

// دالة مساعدة لحساب الراتب اليومي
export const calculateDailyRate = (baseSalary: number): number => {
  return baseSalary / SALARY_CONSTANTS.WORKING_DAYS_PER_MONTH;
};

// دالة مساعدة لحساب معدل الدقيقة
export const calculateMinuteRate = (
  baseSalary: number,
  workingHoursPerDay: number = SALARY_CONSTANTS.WORKING_HOURS_PER_DAY
): number => {
  const dailyRate = calculateDailyRate(baseSalary);
  const minutesPerDay = workingHoursPerDay * 60;
  return dailyRate / minutesPerDay;
};

// دالة مساعدة لحساب خصم الغياب
export const calculateAbsenceDeduction = (
  absentDays: number,
  baseSalary: number
): number => {
  const dailyRate = calculateDailyRate(baseSalary);
  return absentDays * dailyRate;
};

// دالة مساعدة لحساب خصم التأخير
export const calculateDelayDeduction = (
  delayMinutes: number,
  baseSalary: number,
  workingHoursPerDay: number = SALARY_CONSTANTS.WORKING_HOURS_PER_DAY
): number => {
  const minuteRate = calculateMinuteRate(baseSalary, workingHoursPerDay);
  return delayMinutes * minuteRate;
};
