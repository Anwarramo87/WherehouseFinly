/**
 * Types for Attendance-based Deductions
 * خصومات الدوام (الغياب والتأخير)
 */

export interface AttendanceDeductionBreakdown {
  // معرّف الموظف
  employeeId: string;

  // أيام الحضور الفعلية (عدد الأيام التي بصم فيها الموظف)
  presentDays: number;

  // أيام الغياب = elapsedWorkDays - presentDays
  absentDays: number;

  // الخصم المحسوب للغياب
  absenceDeduction: number;

  // إجمالي دقائق التأخير للشهر
  delayMinutes: number;

  // الخصم المحسوب للتأخير
  delayDeduction: number;

  // الإجمالي = غياب + تأخير
  totalAttendanceDeduction: number;

  // دقائق الإضافي المحسوبة من وقت الخروج مقارنةً بـ scheduledEnd
  overtimeMinutes: number;

  // أيام إضافي العطلة (الجمعة) المحسوبة تلقائياً
  overtimeWeekendDays: number;

  // عدد أيام العمل التي مضت فعلاً في الفترة (يُحسب حتى اليوم الحالي)
  elapsedWorkDays: number;

  // الفترة الزمنية
  periodStart: string;
  periodEnd: string;
}

export interface AttendanceDeductionInput {
  periodStart: string;
  periodEnd: string;
  gracePeriodMinutes?: number;
  employeeId?: string; // إذا كنت تريد موظف معين فقط
}

export interface AttendanceDeductionResponse {
  data: AttendanceDeductionBreakdown[];
  summary?: {
    totalEmployeesAffected: number;
    totalAbsenceDeduction: number;
    totalDelayDeduction: number;
    totalAttendanceDeduction: number;
  };
}
