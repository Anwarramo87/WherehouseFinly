export interface Salary {
  id: string;
  employeeId: string; // e.g. EMP001
  profession: string;
  baseSalary: number;
  responsibilityAllowance: number;
  productionIncentive: number;
  transportAllowance: number;
  extraEffortAllowance?: number; // اسم Backend الرسمي
  extraEffort?: number; // للتوافقية مع الكود القديم
  insurances?: number;
}

export type SalaryInput = Omit<Salary, "id">;

