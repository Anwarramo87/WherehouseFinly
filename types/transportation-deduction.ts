/**
 * Types for Transportation Deductions
 * خصومات النقل (تكاليف الحافلات)
 */

export interface TransportationDeductionBreakdown {
  // معرّف الموظف
  employeeId: string;

  // معرّف الحافلة
  busId: string;

  // مسار الحافلة
  busRoute?: string;

  // تكلفة النقل الشهرية
  transportCost: number;

  // الفترة الزمنية
  month: string;

  // تاريخ الحساب
  calculatedDate: string;
}

export interface TransportationDeductionInput {
  periodStart: string;
  periodEnd: string;
  employeeId?: string; // إذا كنت تريد موظف معين فقط
}

export interface TransportationDeductionResponse {
  data: TransportationDeductionBreakdown[];
  summary?: {
    totalEmployeesAffected: number;
    totalTransportationDeduction: number;
  };
}
