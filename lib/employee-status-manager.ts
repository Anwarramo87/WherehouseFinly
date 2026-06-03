/**
 * EmployeeStatusManager Service
 * 
 * Handles employee termination, rehiring, and status management operations.
 * Implements business logic for Requirements 1.3, 5.3, 5.5, 9.4
 */

import apiClient from './api-client';
import { auditService, createAuditUserContextWithData } from './audit-service';
import type { Employee } from '@/types/employee';
import type {
  TerminationData,
  RehireData,
  TerminationResult,
  RehireResult,
  TerminationRecord,
  RehireRecord,
} from '@/types/resignation';

// ============================================================================
// Types and Interfaces
// ============================================================================

/**
 * Activity log entry for audit trail (legacy interface for backward compatibility)
 */
interface ActivityLogEntry {
  action: 'EMPLOYEE_TERMINATED' | 'EMPLOYEE_REHIRED';
  employeeId: string;
  performedBy: string;
  timestamp: Date;
  details: Record<string, unknown>;
}

/**
 * Validation error for employee operations
 */
export class EmployeeStatusError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 400
  ) {
    super(message);
    this.name = 'EmployeeStatusError';
  }
}

// ============================================================================
// Error Codes
// ============================================================================

export const EMPLOYEE_STATUS_ERROR_CODES = {
  EMPLOYEE_NOT_FOUND: 'EMPLOYEE_NOT_FOUND',
  EMPLOYEE_NOT_ACTIVE: 'EMPLOYEE_NOT_ACTIVE',
  EMPLOYEE_ALREADY_TERMINATED: 'EMPLOYEE_ALREADY_TERMINATED',
  EMPLOYEE_NOT_ELIGIBLE_FOR_REHIRE: 'EMPLOYEE_NOT_ELIGIBLE_FOR_REHIRE',
  INVALID_TERMINATION_DATE: 'INVALID_TERMINATION_DATE',
  INVALID_REHIRE_DATE: 'INVALID_REHIRE_DATE',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  API_ERROR: 'API_ERROR',
} as const;

// ============================================================================
// EmployeeStatusManager Class
// ============================================================================

/**
 * Service class for managing employee status transitions
 * 
 * Handles:
 * - Employee termination (resignation/termination)
 * - Employee rehiring with data restoration
 * - Activity logging for audit trail
 */
export class EmployeeStatusManager {
  private activityLog: ActivityLogEntry[] = [];

  /**
   * Terminate an employee (resignation or termination)
   * 
   * Validates employee is active, updates status, creates termination record,
   * and logs activity for audit trail.
   * 
   * @param employeeId - The ID of the employee to terminate
   * @param terminationData - Termination details (date, type, reason, notes)
   * @param userId - ID of the user performing the termination
   * @returns Promise with updated employee and termination record
   * @throws EmployeeStatusError if validation fails or API error occurs
   * 
   * Validates: Requirements 1.3, 9.4
   */
  async terminateEmployee(
    employeeId: string,
    terminationData: TerminationData,
    userId: string
  ): Promise<TerminationResult> {
    // Validate input
    this.validateTerminationData(terminationData);

    try {
      // Get current employee to validate state
      const employee = await this.getEmployee(employeeId);

      // Validate employee is active
      if (employee.status !== 'active') {
        throw new EmployeeStatusError(
          'Employee is not active and cannot be terminated',
          EMPLOYEE_STATUS_ERROR_CODES.EMPLOYEE_NOT_ACTIVE,
          400
        );
      }

      // Call API to terminate employee
      const response = await apiClient.post('/employees/terminate', {
        employeeId,
        terminationDate: this.formatDate(terminationData.terminationDate),
        terminationType: terminationData.terminationType,
        reason: terminationData.reason,
        notes: terminationData.notes,
      });

      const result = response.data as TerminateEmployeeApiResponse;

      // Log activity for audit trail
      await this.logActivity('EMPLOYEE_TERMINATED', {
        employeeId,
        employeeName: result.employee?.name || 'Unknown Employee',
        terminationType: terminationData.terminationType,
        reason: terminationData.reason,
        terminationDate: terminationData.terminationDate,
        notes: terminationData.notes,
        processedBy: userId,
        userRole: 'hr_manager',
        timestamp: new Date(),
      });

      return {
        employee: result.employee,
        terminationRecord: result.terminationRecord,
      };
    } catch (error) {
      if (error instanceof EmployeeStatusError) {
        throw error;
      }

      // Handle API errors
      const apiError = error as { response?: { data?: { message?: string }; status?: number } };
      throw new EmployeeStatusError(
        apiError.response?.data?.message || 'Failed to terminate employee',
        EMPLOYEE_STATUS_ERROR_CODES.API_ERROR,
        apiError.response?.status || 500
      );
    }
  }

  /**
   * Rehire a previously terminated employee
   * 
   * Validates employee is resigned/terminated, restores to active status,
   * preserves previous settings, and logs activity for audit trail.
   * 
   * @param employeeId - The ID of the employee to rehire
   * @param rehireData - Rehire details (date, notes, restore settings flag)
   * @param userId - ID of the user performing the rehire
   * @returns Promise with updated employee and rehire record
   * @throws EmployeeStatusError if validation fails or API error occurs
   * 
   * Validates: Requirements 5.3, 5.5, 9.4
   */
  async rehireEmployee(
    employeeId: string,
    rehireData: RehireData,
    userId: string
  ): Promise<RehireResult> {
    // Validate input
    this.validateRehireData(rehireData);

    try {
      // Get current employee to validate state
      const employee = await this.getEmployee(employeeId);

      // Validate employee is resigned or terminated
      if (employee.status !== 'resigned' && employee.status !== 'terminated') {
        throw new EmployeeStatusError(
          'Employee is not eligible for rehire. Only resigned or terminated employees can be rehired.',
          EMPLOYEE_STATUS_ERROR_CODES.EMPLOYEE_NOT_ELIGIBLE_FOR_REHIRE,
          400
        );
      }

      // Call API to rehire employee
      const response = await apiClient.post('/employees/rehire', {
        employeeId,
        rehireDate: this.formatDate(rehireData.rehireDate),
        notes: rehireData.notes,
        restorePreviousSettings: rehireData.restorePreviousSettings,
      });

      const result = response.data as RehireEmployeeApiResponse;

      // Log activity for audit trail
      await this.logActivity('EMPLOYEE_REHIRED', {
        employeeId,
        employeeName: result.employee?.name || 'Unknown Employee',
        rehireDate: rehireData.rehireDate,
        restorePreviousSettings: rehireData.restorePreviousSettings,
        previousTerminationDate: result.rehireRecord?.createdAt || new Date(),
        notes: rehireData.notes,
        processedBy: userId,
        userRole: 'hr_manager',
        timestamp: new Date(),
      });

      return {
        employee: result.employee,
        rehireRecord: result.rehireRecord,
      };
    } catch (error) {
      if (error instanceof EmployeeStatusError) {
        throw error;
      }

      // Handle API errors
      const apiError = error as { response?: { data?: { message?: string }; status?: number } };
      throw new EmployeeStatusError(
        apiError.response?.data?.message || 'Failed to rehire employee',
        EMPLOYEE_STATUS_ERROR_CODES.API_ERROR,
        apiError.response?.status || 500
      );
    }
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  /**
   * Get employee by ID
   * @throws EmployeeStatusError if employee not found
   */
  private async getEmployee(employeeId: string): Promise<Employee> {
    try {
      const response = await apiClient.get(`/employees/${employeeId}`);
      return response.data as Employee;
    } catch (error) {
      const apiError = error as { response?: { status?: number } };
      if (apiError.response?.status === 404) {
        throw new EmployeeStatusError(
          'Employee not found',
          EMPLOYEE_STATUS_ERROR_CODES.EMPLOYEE_NOT_FOUND,
          404
        );
      }
      throw new EmployeeStatusError(
        'Failed to fetch employee',
        EMPLOYEE_STATUS_ERROR_CODES.API_ERROR,
        apiError.response?.status || 500
      );
    }
  }

  /**
   * Validate termination data
   * @throws EmployeeStatusError if validation fails
   */
  private validateTerminationData(data: TerminationData): void {
    if (!data.terminationDate) {
      throw new EmployeeStatusError(
        'Termination date is required',
        EMPLOYEE_STATUS_ERROR_CODES.INVALID_TERMINATION_DATE,
        400
      );
    }

    // Ensure termination date is not in the future
    const today = new Date();
    today.setHours(23, 59, 59, 999); // End of today
    if (data.terminationDate > today) {
      throw new EmployeeStatusError(
        'Termination date cannot be in the future',
        EMPLOYEE_STATUS_ERROR_CODES.INVALID_TERMINATION_DATE,
        400
      );
    }

    if (!data.terminationType) {
      throw new EmployeeStatusError(
        'Termination type is required',
        EMPLOYEE_STATUS_ERROR_CODES.INVALID_TERMINATION_DATE,
        400
      );
    }

    if (!data.reason || data.reason.trim().length < 3) {
      throw new EmployeeStatusError(
        'Termination reason is required and must be at least 3 characters',
        EMPLOYEE_STATUS_ERROR_CODES.INVALID_TERMINATION_DATE,
        400
      );
    }
  }

  /**
   * Validate rehire data
   * @throws EmployeeStatusError if validation fails
   */
  private validateRehireData(data: RehireData): void {
    if (!data.rehireDate) {
      throw new EmployeeStatusError(
        'Rehire date is required',
        EMPLOYEE_STATUS_ERROR_CODES.INVALID_REHIRE_DATE,
        400
      );
    }

    // Rehire date should not be in the past (grace period of 1 day for practical reasons)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);
    
    if (data.rehireDate < yesterday) {
      throw new EmployeeStatusError(
        'Rehire date cannot be more than 1 day in the past',
        EMPLOYEE_STATUS_ERROR_CODES.INVALID_REHIRE_DATE,
        400
      );
    }
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
   * Validates: Requirement 9.4
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
      details.userRole as string || 'hr_manager'
    );

    // Log to centralized audit service
    try {
      if (action === 'EMPLOYEE_TERMINATED') {
        await auditService.logTermination(
          details.employeeId as string,
          details.employeeName as string || 'Unknown Employee',
          userContext,
          {
            terminationType: details.terminationType as 'resignation' | 'termination',
            reason: details.reason as string,
            terminationDate: details.terminationDate as Date,
            notes: details.notes as string,
          }
        );
      } else if (action === 'EMPLOYEE_REHIRED') {
        await auditService.logRehire(
          details.employeeId as string,
          details.employeeName as string || 'Unknown Employee',
          userContext,
          {
            rehireDate: details.rehireDate as Date,
            restorePreviousSettings: details.restorePreviousSettings as boolean,
            previousTerminationDate: details.previousTerminationDate as Date,
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
// API Response Types (Internal)
// ============================================================================

interface TerminateEmployeeApiResponse {
  success: boolean;
  message: string;
  employee: Employee;
  terminationRecord: TerminationRecord;
}

interface RehireEmployeeApiResponse {
  success: boolean;
  message: string;
  employee: Employee;
  rehireRecord: RehireRecord;
}

// ============================================================================
// Singleton Instance Export
// ============================================================================

/**
 * Singleton instance of EmployeeStatusManager
 * Use this for all employee status operations
 */
export const employeeStatusManager = new EmployeeStatusManager();

// Default export
export default employeeStatusManager;
