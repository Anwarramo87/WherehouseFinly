
export interface Employee {
  id?: string;
  _id?: string;
  employeeId: string; // مثل EMP001
  name: string;
  email?: string;
  mobile?: string | null;
  nationalId?: string | null;
  employmentStartDate?: string | null;
  terminationDate?: string | null;
  dateOfBirth?: string | null;
  gender?: string | null;
  department?: string;
  profession?: string;
  jobTitle?: string;
  roleId?: string;
  status?: 'active' | 'inactive' | 'terminated' | 'resigned';
  isSettled?: boolean;
  residence?: string | null;
  scheduledStart?: string;
  scheduledEnd?: string;
  gracePeriodMinutes?: number;
  workDaysInPeriod?: number;
  hoursPerDay?: number;
  avatar?: string;
  currency?: string;
  createdAt?: string;
  updatedAt?: string;
  
  // ============================================================================
  // Resignation Management Fields
  // ============================================================================
  
  /**
   * Type of termination (resignation or termination)
   */
  terminationType?: 'resignation' | 'termination' | null;
  
  /**
   * Reason for termination
   */
  terminationReason?: string | null;
  
  /**
   * Additional notes about termination
   */
  terminationNotes?: string | null;
  
  /**
   * Financial settlement status
   */
  financialSettlementStatus?: 'pending' | 'completed';
  
  /**
   * Date when financial settlement was completed
   */
  financialSettlementDate?: string | null;
  
  /**
   * Date when employee was rehired (if applicable)
   */
  rehireDate?: string | null;
  
  /**
   * Whether employee has been financially settled
   */
  isFinanciallySettled?: boolean;
  
  // ============================================================================
  // Salary and Financial Fields
  // ============================================================================
  
  hourlyRate?: number | string | { $numberDecimal: string };
  baseSalary?: number | string | { $numberDecimal: string } | null;
  lumpSumSalary?: number | string | { $numberDecimal: string } | null;
  livingAllowance?: number | string | null;
   transportAllowance?: number | string | null;
   insuranceAmount?: number | string | null;
  
  // ============================================================================
  // Authentication Fields (for frontend user management)
  // ============================================================================
  username?: string | null;
  password?: string | null;
}
