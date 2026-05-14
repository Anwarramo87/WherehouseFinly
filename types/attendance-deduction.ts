/**
 * Types for Attendance-based Deductions
 * خصومات الدوام (الغياب والتأخير)
 */

export interface AttendanceDeductionBreakdown {
  // معرّف الموظف
  employeeId: string;

  // أيام الغياب الكاملة
  absentDays: number;

  // الخصم المحسوب للغياب
  absenceDeduction: number;

  // إجمالي دقائق التأخير
  delayMinutes: number;

  // الخصم المحسوب للتأخير
  delayDeduction: number;

  // الإجمالي = غياب + تأخير
  totalAttendanceDeduction: number;

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
