
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
  status?: 'active' | 'inactive' | 'on_leave' | 'terminated';
  // الراتب يأتي من الباك إند كـ Decimal، وغالباً يصل للفرونت كـ string أو كائن
  hourlyRate?: number | string | { $numberDecimal: string };
  monthlySalary?: number | string;
  livingAllowance?: number | string;
  insurances?: number | string;
  scheduledStart?: string;
  scheduledEnd?: string;
  avatar?: string;
  currency?: string;
  createdAt?: string;
  updatedAt?: string;
}
