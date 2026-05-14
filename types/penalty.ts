export interface PenaltyRecord {
  id: string;
  employeeId: string;
  category: string;
  amount: number | string | { $numberDecimal: string };
  reason?: string | null;
  issueDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface PenaltyInput {
  employeeId: string;
  category: string;
  amount: number | string;
  reason?: string;
  issueDate?: string;
}
