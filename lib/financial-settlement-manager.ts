/**
 * FinancialSettlementManager Service
 * 
 * Handles financial settlement processing for resigned/terminated employees.
 * Implements business logic for Requirements 2.3, 6.5, 8.4
 */

import apiClient from './api-client';
import { auditService, createAuditUserContextWithData } from './audit-service';
import type { Employee } from '@/types/employee';
import type {
  SettlementData,
  SettlementResult,
  FinancialSettlementRequest,
  FinancialSettlementResponse,
} from '@/types/resignation';

// ============================================================================
// Types and Interfaces
// ============================================================================

/**
 * Activity log entry for audit trail (legacy interface for backward compatibility)
 */
interface ActivityLogEntry {
  action: 'FINANCIAL_SETTLEMENT_COMPLETED';
  employeeId: string;
  performedBy: string;
  timestamp: Date;
  details: Record<string, unknown>;
}

/**
 * Validation error for financial settlement operations
 */
export class FinancialSettlementError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 400
  ) {
    super(message);
    this.name = 'FinancialSettlementError';
  }
}

// ============================================================================
// Error Codes
// ============================================================================

export const FINANCIAL_SETTLEMENT_ERROR_CODES = {
  EMPLOYEE_NOT_FOUND: 'EMPLOYEE_NOT_FOUND',
  EMPLOYEE_NOT_ELIGIBLE: 'EMPLOYEE_NOT_ELIGIBLE',
  SETTLEMENT_ALREADY_PROCESSED: 'SETTLEMENT_ALREADY_PROCESSED',
  INVALID_SETTLEMENT_DATE: 'INVALID_SETTLEMENT_DATE',
  INVALID_SETTLEMENT_AMOUNT: 'INVALID_SETTLEMENT_AMOUNT',
  NEGATIVE_TOTAL_SETTLEMENT: 'NEGATIVE_TOTAL_SETTLEMENT',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  API_ERROR: 'API_ERROR',
} as const;

// ============================================================================
// FinancialSettlementManager Class
// ============================================================================

/**
 * Service class for managing employee financial settlements
 * 
 * Handles:
 * - Financial settlement processing with calculation logic
 * - Settlement validation and status updates
 * - Integration with payroll removal functionality
 * - Activity logging for audit trail
 */
export class FinancialSettlementManager {
  private activityLog: ActivityLogEntry[] = [];

  /**
   * Process financial settlement for a resigned/terminated employee
   * 
   * Validates employee eligibility, calculates total settlement,
   * creates settlement record, updates employee financial status,
   * removes from payroll, and logs activity for audit trail.
   * 
   * @param employeeId - The ID of the employee to settle
   * @param settlementData - Settlement details (date, amounts, notes)
   * @param userId - ID of the user performing the settlement
   * @returns Promise with settlement record
   * @throws FinancialSettlementError if validation fails or API error occurs
   * 
   * Validates: Requirements 2.3, 6.5, 8.4
   */
  async processSettlement(
    employeeId: string,
    settlementData: SettlementData,
    userId: string
  ): Promise<SettlementResult> {
    // Validate input
    this.validateSettlementData(settlementData);

    try {
      // Get current employee to validate state
      const employee = await this.getEmployee(employeeId);

      // Validate employee is eligible for settlement
      this.validateEmployeeEligibility(employee);

      // Calculate total settlement
      const totalSettlement = this.calculateTotalSettlement(
        settlementData.finalSalaryAmount,
        settlementData.bonuses,
        settlementData.deductions
      );

      // Validate total settlement is not negative
      if (totalSettlement < 0) {
        throw new FinancialSettlementError(
          'Total settlement amount cannot be negative. Please adjust deductions or bonuses.',
          FINANCIAL_SETTLEMENT_ERROR_CODES.NEGATIVE_TOTAL_SETTLEMENT,
          400
        );
      }

      // Prepare API request
      const requestData: FinancialSettlementRequest = {
        employeeId,
        settlementDate: this.formatDate(settlementData.settlementDate),
        finalSalaryAmount: settlementData.finalSalaryAmount,
        deductions: settlementData.deductions,
        bonuses: settlementData.bonuses,
        notes: settlementData.notes,
      };

      // Call API to process settlement
      const response = await apiClient.post('/employees/financial-settlement', requestData);
      const result = response.data as FinancialSettlementResponse;

      // Log activity for audit trail
      await this.logActivity('FINANCIAL_SETTLEMENT_COMPLETED', {
        employeeId,
        employeeName: result.settlement?.employeeId || 'Unknown Employee',
        settlementAmount: totalSettlement,
        finalSalaryAmount: settlementData.finalSalaryAmount,
        deductions: settlementData.deductions,
        bonuses: settlementData.bonuses,
        settlementDate: settlementData.settlementDate,
        notes: settlementData.notes,
        processedBy: userId,
        userRole: 'accountant',
        timestamp: new Date(),
      });

      return {
        settlement: result.settlement,
      };
    } catch (error) {
      if (error instanceof FinancialSettlementError) {
        throw error;
      }

      // Handle API errors
      const apiError = error as { response?: { data?: { message?: string }; status?: number } };
      
      // Check for 404 error (employee not found)
      if (apiError.response?.status === 404) {
        throw new FinancialSettlementError(
          'Employee not found',
          FINANCIAL_SETTLEMENT_ERROR_CODES.EMPLOYEE_NOT_FOUND,
          404
        );
      }
      
      throw new FinancialSettlementError(
        apiError.response?.data?.message || 'Failed to process financial settlement',
        FINANCIAL_SETTLEMENT_ERROR_CODES.API_ERROR,
        apiError.response?.status || 500
      );
    }
  }

  /**
   * Calculate total settlement amount
   * 
   * Formula: Total = Final Salary + Bonuses - Deductions
   * 
   * @param finalSalaryAmount - Final salary amount to be paid
   * @param bonuses - Additional bonuses or benefits
   * @param deductions - Deductions (advances, penalties, etc.)
   * @returns Total settlement amount
   * 
   * Validates: Requirement 2.3
   */
  calculateTotalSettlement(
    finalSalaryAmount: number,
    bonuses: number,
    deductions: number
  ): number {
    return finalSalaryAmount + bonuses - deductions;
  }

  /**
   * Validate settlement data
   * 
   * Ensures all required fields are present and valid:
   * - Settlement date is provided and not in the future
   * - Final salary amount is non-negative
   * - Deductions are non-negative
   * - Bonuses are non-negative
   * 
   * @param data - Settlement data to validate
   * @throws FinancialSettlementError if validation fails
   * 
   * Validates: Requirement 6.5
   */
  private validateSettlementData(data: SettlementData): void {
    // Validate settlement date
    if (!data.settlementDate) {
      throw new FinancialSettlementError(
        'Settlement date is required',
        FINANCIAL_SETTLEMENT_ERROR_CODES.INVALID_SETTLEMENT_DATE,
        400
      );
    }

    // Ensure settlement date is not in the future
    const today = new Date();
    today.setHours(23, 59, 59, 999); // End of today
    if (data.settlementDate > today) {
      throw new FinancialSettlementError(
        'Settlement date cannot be in the future',
        FINANCIAL_SETTLEMENT_ERROR_CODES.INVALID_SETTLEMENT_DATE,
        400
      );
    }

    // Validate final salary amount
    if (data.finalSalaryAmount === undefined || data.finalSalaryAmount === null) {
      throw new FinancialSettlementError(
        'Final salary amount is required',
        FINANCIAL_SETTLEMENT_ERROR_CODES.INVALID_SETTLEMENT_AMOUNT,
        400
      );
    }

    if (data.finalSalaryAmount < 0) {
      throw new FinancialSettlementError(
        'Final salary amount cannot be negative',
        FINANCIAL_SETTLEMENT_ERROR_CODES.INVALID_SETTLEMENT_AMOUNT,
        400
      );
    }

    // Validate deductions
    if (data.deductions === undefined || data.deductions === null) {
      throw new FinancialSettlementError(
        'Deductions amount is required (use 0 if no deductions)',
        FINANCIAL_SETTLEMENT_ERROR_CODES.INVALID_SETTLEMENT_AMOUNT,
        400
      );
    }

    if (data.deductions < 0) {
      throw new FinancialSettlementError(
        'Deductions cannot be negative',
        FINANCIAL_SETTLEMENT_ERROR_CODES.INVALID_SETTLEMENT_AMOUNT,
        400
      );
    }

    // Validate bonuses
    if (data.bonuses === undefined || data.bonuses === null) {
      throw new FinancialSettlementError(
        'Bonuses amount is required (use 0 if no bonuses)',
        FINANCIAL_SETTLEMENT_ERROR_CODES.INVALID_SETTLEMENT_AMOUNT,
        400
      );
    }

    if (data.bonuses < 0) {
      throw new FinancialSettlementError(
        'Bonuses cannot be negative',
        FINANCIAL_SETTLEMENT_ERROR_CODES.INVALID_SETTLEMENT_AMOUNT,
        400
      );
    }
  }

  /**
   * Validate employee eligibility for financial settlement
   * 
   * Checks:
   * - Employee is resigned or terminated
   * - Financial settlement has not already been processed
   * 
   * @param employee - Employee to validate
   * @throws FinancialSettlementError if employee is not eligible
   * 
   * Validates: Requirement 6.5
   */
  private validateEmployeeEligibility(employee: Employee): void {
    // Check if employee is resigned or terminated
    if (employee.status !== 'resigned' && employee.status !== 'terminated') {
      throw new FinancialSettlementError(
        'Employee is not eligible for financial settlement. Only resigned or terminated employees can be settled.',
        FINANCIAL_SETTLEMENT_ERROR_CODES.EMPLOYEE_NOT_ELIGIBLE,
        400
      );
    }

    // Check if settlement has already been processed
    if (employee.financialSettlementStatus === 'completed' || employee.isFinanciallySettled) {
      throw new FinancialSettlementError(
        'Financial settlement has already been processed for this employee',
        FINANCIAL_SETTLEMENT_ERROR_CODES.SETTLEMENT_ALREADY_PROCESSED,
        400
      );
    }
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  /**
   * Get employee by ID
   * @throws FinancialSettlementError if employee not found
   */
  private async getEmployee(employeeId: string): Promise<Employee> {
    const response = await apiClient.get(`/employees/${employeeId}`);
    return response.data as Employee;
  }

  /**
   * Format date to ISO string (YYYY-MM-DD)
   */
  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Log activity for audit trail
   * Creates an audit log entry for the specified action
   * 
   * Validates: Requirement 8.4 (Integration with payroll system)
   */
  private async logActivity(
    action: ActivityLogEntry['action'],
    details: Record<string, unknown>
  ): Promise<void> {
    const logEntry: ActivityLogEntry = {
      action,
      employeeId: details.employeeId as string,
      performedBy: details.processedBy as string,
      timestamp: new Date(),
      details,
    };

    // Store in memory (in a real implementation, this would be sent to an audit API)
    this.activityLog.push(logEntry);

    // Create user context for audit service
    const userContext = createAuditUserContextWithData(
      details.processedBy as string,
      details.processedByName as string || 'Unknown User',
      details.userRole as string || 'accountant'
    );

    // Log to centralized audit service
    try {
      if (action === 'FINANCIAL_SETTLEMENT_COMPLETED') {
        await auditService.logFinancialSettlement(
          details.employeeId as string,
          details.employeeName as string || 'Unknown Employee',
          userContext,
          {
            settlementAmount: details.settlementAmount as number,
            finalSalaryAmount: details.finalSalaryAmount as number,
            deductions: details.deductions as number,
            bonuses: details.bonuses as number,
            settlementDate: details.settlementDate as Date,
            notes: details.notes as string,
          }
        );
      }
    } catch {
      // Silently fail - don't let audit logging failures affect main operations
    }
  }

  /**
   * Get activity log entries (for debugging/testing)
   */
  getActivityLog(): ActivityLogEntry[] {
    return [...this.activityLog];
  }

  /**
   * Clear activity log (for testing)
   */
  clearActivityLog(): void {
    this.activityLog = [];
  }
}

// ============================================================================
// Singleton Instance Export
// ============================================================================

/**
 * Singleton instance of FinancialSettlementManager
 * Use this for all financial settlement operations
 */
export const financialSettlementManager = new FinancialSettlementManager();

// Default export
export default financialSettlementManager;
