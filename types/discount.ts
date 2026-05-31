export type DiscountKind = "advance" | "assistance";

export interface DiscountRecord {
  id: string;
  employeeId: string;
  type: string;
  amount: number;
  date: string;
  notes?: string | null;
  kind: DiscountKind;
  createdAt?: string;
}

export interface DiscountInput {
  employeeId: string;
  type: string;
  amount: number | string;
  date?: string;
  notes?: string;
  kind?: DiscountKind;
}
