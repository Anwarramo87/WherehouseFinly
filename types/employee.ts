
export interface Employee {
  id?: string;
  _id?: string;
  employeeId: string; // مثل EMP001
  name: string;
  email?: string;
  phone?: string; // Legacy alias kept for backward compatibility.
  mobile?: string | null;
  nationalId?: string | null;
  employmentStartDate?: string | null;
  terminationDate?: string | null;
  birthDate?: string | null;
  gender?: string | null;
  department?: string;
  profession?: string;
  jobTitle?: string;
  roleId?: string;
  status?: 'active' | 'inactive' | 'terminated' | 'resigned';
  isSettled?: boolean; // تم تصفية حقوق الموظف (للموظفين المقالين/المستقيلين)
  // الراتب يأتي من الباك إند كـ Decimal، وغالباً يصل للفرونت كـ string أو كائن
  hourlyRate?: number | string | { $numberDecimal: string };
  baseSalary?: number | string | { $numberDecimal: string } | null;
  lumpSumSalary?: number | string | { $numberDecimal: string } | null;
  monthlySalary?: number | string;
  livingAllowance?: number | string | null;
  insurances?: number | string;
  residence?: string | null;
  scheduledStart?: string;
  scheduledEnd?: string;
  avatar?: string;
  currency?: string;
  createdAt?: string;
  updatedAt?: string;
}
