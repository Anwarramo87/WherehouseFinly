export interface Reward {
  id?: string;
  _id?: string;
  employeeId: string;
  employeeName?: string | null;
  type: string;
  amount: number | string | { $numberDecimal: string };
  date?: string | null;
  notes?: string | null;
  allEmployees?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface RewardInput {
  employeeId: string;
  type: string;
  amount: number | string;
  date: string;
  notes?: string;
  allEmployees?: boolean;
}
