export interface Leave {
  id?: string;
  employeeId: string;
  leaveType?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
  isPaid?: boolean;
  notes?: string;
}
