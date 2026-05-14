export interface Penalty {
  id: string;
  employeeId: string;
  category: string;
  amount: number | string | { $numberDecimal: string };
  reason?: string | null;
  issueDate: string;
  createdAt?: string;
  updatedAt?: string;
}
