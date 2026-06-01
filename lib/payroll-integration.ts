/**
 * PayrollIntegration Service
 * 
 * Handles payroll integration for resigned/terminated employees.
 * Implements business logic for Requirements 2.3, 8.1, 8.4, 8.5
 */

import apiClient from './api-client';
import type { Employee } from '@/types/employee';
import type { PayrollData } from '@/types/resignation';
import type { PayrollItem, PayrollReportResponse } from '@/types/payroll';

// ============================================================================
// Types and Interfaces
// ============================================================================

/**
 * Resigned employee payroll data with additional metadata
 */
export interface ResignedEmployeePayrollData {
  employee: Employee;
  payrollItem?: PayrollItem;
  isPendingSettlement: boolean;
  terminationDate: Date;
  terminationType: 'resignation' | 'termination';
}

/**
 * Payroll removal result
 */
export interface PayrollRemovalResult {
  success: boolean;
  employeeId: string;
  message: string;
  removedAt: Date;
}

/**
 * Enhanced payroll report with resigned employees section
 */
export interface EnhancedPayrollReport extends PayrollReportResponse {
  resignedEmployees: ResignedEmployeePayrollData[];
  resignedTotals: {
    totalGrossPay: number;
    totalDeductions: number;
    totalNetPay: number;
    count: number;
  };
}

/**
 * Validation error for payroll operations
 */
export class PayrollIntegrationError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 400
  ) {
    super(message);
    this.name = 'PayrollIntegrationError';
  }
}

// ============================================================================
// Error Codes
// ============================================================================

export const PAYROLL_INTEGRATION_ERROR_CODES = {
  EMPLOYEE_NOT_FOUND: 'EMPLOYEE_NOT_FOUND',
  EMPLOYEE_NOT_RESIGNED: 'EMPLOYEE_NOT_RESIGNED',
  EMPLOYEE_ALREADY_REMOVED: 'EMPLOYEE_ALREADY_REMOVED',
  INVALID_MONTH_FORMAT: 'INVALID_MONTH_FORMAT',
  PAYROLL_DATA_NOT_FOUND: 'PAYROLL_DATA_NOT_FOUND',
  API_ERROR: 'API_ERROR',
} as const;

// ============================================================================
// PayrollIntegration Class
// ============================================================================

/**
 * Service class for integrating resigned employees with payroll system
 * 
 * Handles:
 * - Getting resigned employees payroll data for a specific month
 * - Removing employees from payroll after financial settlement
 * - Integrating with existing payroll calculation logic
 * - Filtering payroll reports to separate active and resigned employees
 */
export class PayrollIntegration {
  /**
   * Get payroll data for a specific month, separated by active and resigned employees
   * 
   * Fetches payroll report and separates employees into active and resigned categories.
   * Only includes resigned employees who are pending financial settlement.
   * 
   * @param month - Month in YYYY-MM format
   * @returns Promise with separated payroll data
   * @throws PayrollIntegrationError if validation fails or API error occurs
   * 
   * Validates: Requirements 8.1, 8.2
   */
  async getPayrollData(month: string): Promise<PayrollData> {
    // Validate month format
    this.validateMonthFormat(month);

    try {
      // Fetch payroll report for the month
      const payrollReport = await this.fetchPayrollReport(month);

      // Fetch all resigned employees pending settlement
      const resignedEmployees = await this.fetchResignedEmployeesPendingSettlement();

      // Filter payroll items to separate active and resigned employees
      const activeEmployeeIds = new Set<string>();
      const resignedEmployeeIds = new Set(resignedEmployees.map(emp => emp.id));

      // Separate active employees (those not in resigned list)
      const activeEmployees = payrollReport.items
        .filter(item => !resignedEmployeeIds.has(item.employeeId))
        .map(item => {
          activeEmployeeIds.add(item.employeeId);
          return this.payrollItemToEmployee(item);
        });

      // Filter resigned employees to only those with payroll data
      const resignedWithPayroll = resignedEmployees.filter(emp => 
        payrollReport.items.some(item => item.employeeId === emp.id)
      );

      return {
        activeEmployees,
        resignedEmployees: resignedWithPayroll,
      };
    } catch (error) {
      if (error instanceof PayrollIntegrationError) {
        throw error;
      }

      const apiError = error as { response?: { data?: { message?: string }; status?: number } };
      throw new PayrollIntegrationError(
        apiError.response?.data?.message || 'Failed to fetch payroll data',
        PAYROLL_INTEGRATION_ERROR_CODES.API_ERROR,
        apiError.response?.status || 500
      );
    }
  }

  /**
   * Get resigned employees payroll data for a specific month
   * 
   * Returns detailed payroll information for resigned employees who are
   * pending financial settlement, including their payroll items and metadata.
   * 
   * @param month - Month in YYYY-MM format
   * @returns Promise with array of resigned employee payroll data
   * @throws PayrollIntegrationError if validation fails or API error occurs
   * 
   * Validates: Requirements 2.3, 8.1
   */
  async getResignedEmployeesPayrollData(month: string): Promise<ResignedEmployeePayrollData[]> {
    // Validate month format
    this.validateMonthFormat(month);

    try {
      // Fetch payroll report for the month
      const payrollReport = await this.fetchPayrollReport(month);

      // Fetch all resigned employees pending settlement
      const resignedEmployees = await this.fetchResignedEmployeesPendingSettlement();

      // Map resigned employees to their payroll data
      const resignedPayrollData: ResignedEmployeePayrollData[] = resignedEmployees
        .map(employee => {
          // Find corresponding payroll item
          const payrollItem = payrollReport.items.find(
            item => item.employeeId === employee.id
          );

          // Only include if payroll item exists
          if (!payrollItem) {
            return null;
          }

          return {
            employee,
            payrollItem,
            isPendingSettlement: employee.financialSettlementStatus === 'pending',
            terminationDate: employee.terminationDate ? new Date(employee.terminationDate) : new Date(),
            terminationType: employee.terminationType || 'resignation',
          } as ResignedEmployeePayrollData;
        })
        .filter((data): data is ResignedEmployeePayrollData => data !== null);

      return resignedPayrollData;
    } catch (error) {
      if (error instanceof PayrollIntegrationError) {
        throw error;
      }

      const apiError = error as { response?: { data?: { message?: string }; status?: number } };
      throw new PayrollIntegrationError(
        apiError.response?.data?.message || 'Failed to fetch resigned employees payroll data',
        PAYROLL_INTEGRATION_ERROR_CODES.API_ERROR,
        apiError.response?.status || 500
      );
    }
  }

  /**
   * Get enhanced payroll report with resigned employees section
   * 
   * Returns a complete payroll report with active employees in the main section
   * and resigned employees (pending settlement) in a separate section with totals.
   * 
   * @param month - Month in YYYY-MM format
   * @returns Promise with enhanced payroll report
   * @throws PayrollIntegrationError if validation fails or API error occurs
   * 
   * Validates: Requirements 8.1, 8.2
   */
  async getEnhancedPayrollReport(month: string): Promise<EnhancedPayrollReport> {
    // Validate month format
    this.validateMonthFormat(month);

    try {
      // Fetch base payroll report
      const payrollReport = await this.fetchPayrollReport(month);

      // Get resigned employees payroll data
      const resignedPayrollData = await this.getResignedEmployeesPayrollData(month);

      // Calculate resigned employees totals
      const resignedTotals = this.calculateResignedTotals(resignedPayrollData);

      // Filter active employees from main report
      const resignedEmployeeIds = new Set(resignedPayrollData.map(data => data.employee.id));
      const activeItems = payrollReport.items.filter(
        item => !resignedEmployeeIds.has(item.employeeId)
      );

      // Recalculate active employees totals
      const activeTotals = this.calculateActiveTotals(activeItems);

      return {
        ...payrollReport,
        items: activeItems,
        totals: activeTotals,
        resignedEmployees: resignedPayrollData,
        resignedTotals,
      };
    } catch (error) {
      if (error instanceof PayrollIntegrationError) {
        throw error;
      }

      const apiError = error as { response?: { data?: { message?: string }; status?: number } };
      throw new PayrollIntegrationError(
        apiError.response?.data?.message || 'Failed to fetch enhanced payroll report',
        PAYROLL_INTEGRATION_ERROR_CODES.API_ERROR,
        apiError.response?.status || 500
      );
    }
  }

  /**
   * Remove employee from payroll after financial settlement
   * 
   * Marks the employee as excluded from future payroll calculations.
   * This is called automatically after financial settlement is completed.
   * 
   * @param employeeId - The ID of the employee to remove from payroll
   * @returns Promise with removal result
   * @throws PayrollIntegrationError if validation fails or API error occurs
   * 
   * Validates: Requirements 2.3, 8.4
   */
  async removeFromPayroll(employeeId: string): Promise<PayrollRemovalResult> {
    try {
      // Validate employee exists and is resigned/terminated
      const employee = await this.getEmployee(employeeId);

      if (employee.status !== 'resigned' && employee.status !== 'terminated') {
        throw new PayrollIntegrationError(
          'Employee is not resigned or terminated. Only resigned/terminated employees can be removed from payroll.',
          PAYROLL_INTEGRATION_ERROR_CODES.EMPLOYEE_NOT_RESIGNED,
          400
        );
      }

      // Check if already removed (financially settled)
      if (employee.isFinanciallySettled) {
        throw new PayrollIntegrationError(
          'Employee has already been removed from payroll',
          PAYROLL_INTEGRATION_ERROR_CODES.EMPLOYEE_ALREADY_REMOVED,
          400
        );
      }

      // Call API to update payroll status
      // Note: This is typically handled by the financial settlement endpoint,
      // but we provide this method for explicit removal if needed
      const response = await apiClient.post('/payroll/remove-employee', {
        employeeId,
      });

      return {
        success: true,
        employeeId,
        message: response.data?.message || 'Employee removed from payroll successfully',
        removedAt: new Date(),
      };
    } catch (error) {
      if (error instanceof PayrollIntegrationError) {
        throw error;
      }

      const apiError = error as { response?: { data?: { message?: string }; status?: number } };
      
      if (apiError.response?.status === 404) {
        throw new PayrollIntegrationError(
          'Employee not found',
          PAYROLL_INTEGRATION_ERROR_CODES.EMPLOYEE_NOT_FOUND,
          404
        );
      }

      throw new PayrollIntegrationError(
        apiError.response?.data?.message || 'Failed to remove employee from payroll',
        PAYROLL_INTEGRATION_ERROR_CODES.API_ERROR,
        apiError.response?.status || 500
      );
    }
  }

  /**
   * Check if employee should be included in payroll calculations
   * 
   * Determines if an employee should be included in payroll based on their
   * status and financial settlement status.
   * 
   * @param employee - Employee to check
   * @returns True if employee should be included in payroll
   * 
   * Validates: Requirement 8.5
   */
  shouldIncludeInPayroll(employee: Employee): boolean {
    // Active employees are always included
    if (employee.status === 'active') {
      return true;
    }

    // Resigned/terminated employees are included only if pending settlement
    if (employee.status === 'resigned' || employee.status === 'terminated') {
      return employee.financialSettlementStatus === 'pending' && !employee.isFinanciallySettled;
    }

    // All other statuses are excluded
    return false;
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  /**
   * Validate month format (YYYY-MM)
   * @throws PayrollIntegrationError if format is invalid
   */
  private validateMonthFormat(month: string): void {
    const monthRegex = /^\d{4}-(0[1-9]|1[0-2])$/;
    if (!monthRegex.test(month)) {
      throw new PayrollIntegrationError(
        'Invalid month format. Expected YYYY-MM (e.g., 2024-03)',
        PAYROLL_INTEGRATION_ERROR_CODES.INVALID_MONTH_FORMAT,
        400
      );
    }
  }

  /**
   * Fetch payroll report for a specific month
   */
  private async fetchPayrollReport(month: string): Promise<PayrollReportResponse> {
    try {
      const response = await apiClient.get(`/payroll/report/${month}`);
      const payload = response.data;

      return {
        month: payload?.month || month,
        period: {
          startDate: payload?.period?.startDate || `${month}-01`,
          endDate: payload?.period?.endDate || `${month}-31`,
        },
        runsCount: Number(payload?.runsCount || 0),
        latestRun: payload?.latestRun || null,
        totals: {
          totalGrossPay: Number(payload?.totals?.totalGrossPay || 0),
          totalDeductions: Number(payload?.totals?.totalDeductions || 0),
          totalNetPay: Number(payload?.totals?.totalNetPay || 0),
        },
        items: Array.isArray(payload?.items) ? payload.items : [],
      };
    } catch (error) {
      const apiError = error as { response?: { status?: number } };
      if (apiError.response?.status === 404) {
        throw new PayrollIntegrationError(
          'Payroll data not found for the specified month',
          PAYROLL_INTEGRATION_ERROR_CODES.PAYROLL_DATA_NOT_FOUND,
          404
        );
      }
      throw error;
    }
  }

  /**
   * Fetch resigned employees pending financial settlement
   */
  private async fetchResignedEmployeesPendingSettlement(): Promise<Employee[]> {
    const response = await apiClient.get('/employees/resigned', {
      params: {
        financialStatus: 'pending',
        limit: 1000, // Get all pending employees
      },
    });

    return Array.isArray(response.data?.employees) ? response.data.employees : [];
  }

  /**
   * Get employee by ID
   */
  private async getEmployee(employeeId: string): Promise<Employee> {
    const response = await apiClient.get(`/employees/${employeeId}`);
    return response.data as Employee;
  }

  /**
   * Convert payroll item to employee object (minimal data)
   */
  private payrollItemToEmployee(item: PayrollItem): Employee {
    return {
      id: item.employeeId,
      name: item.employeeName,
      department: item.department || undefined,
      status: 'active',
    } as Employee;
  }

  /**
   * Calculate totals for resigned employees
   */
  private calculateResignedTotals(resignedData: ResignedEmployeePayrollData[]): {
    totalGrossPay: number;
    totalDeductions: number;
    totalNetPay: number;
    count: number;
  } {
    const totals = resignedData.reduce(
      (acc, data) => {
        if (data.payrollItem) {
          acc.totalGrossPay += this.toNumber(data.payrollItem.grossPay);
          acc.totalDeductions += this.toNumber(data.payrollItem.totalDeductions);
          acc.totalNetPay += this.toNumber(data.payrollItem.netPay);
        }
        return acc;
      },
      { totalGrossPay: 0, totalDeductions: 0, totalNetPay: 0 }
    );

    return {
      ...totals,
      count: resignedData.length,
    };
  }

  /**
   * Calculate totals for active employees
   */
  private calculateActiveTotals(items: PayrollItem[]): {
    totalGrossPay: number;
    totalDeductions: number;
    totalNetPay: number;
  } {
    return items.reduce(
      (acc, item) => {
        acc.totalGrossPay += this.toNumber(item.grossPay);
        acc.totalDeductions += this.toNumber(item.totalDeductions);
        acc.totalNetPay += this.toNumber(item.netPay);
        return acc;
      },
      { totalGrossPay: 0, totalDeductions: 0, totalNetPay: 0 }
    );
  }

  /**
   * Convert various number formats to number
   */
  private toNumber(value: unknown): number {
    if (value && typeof value === 'object' && '$numberDecimal' in (value as Record<string, unknown>)) {
      return Number((value as { $numberDecimal: string }).$numberDecimal || 0);
    }
    return Number(value || 0);
  }
}

// ============================================================================
// Singleton Instance Export
// ============================================================================

/**
 * Singleton instance of PayrollIntegration
 * Use this for all payroll integration operations
 */
export const payrollIntegration = new PayrollIntegration();

// Default export
export default payrollIntegration;
