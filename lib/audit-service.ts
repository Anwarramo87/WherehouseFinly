/**
 * AuditService
 * 
 * Centralized audit logging service for tracking all sensitive operations
 * in the Employee Resignation Management System.
 * Implements Requirement 9.4: Audit trail for all termination and rehire operations.
 */

import apiClient from './api-client';
import type { AuditLog, AuditLogQuery, AuditLogResponse } from '@/types/audit';

// ============================================================================
// Types and Interfaces
// ============================================================================

/**
 * Audit action types for resignation management
 */
export type AuditAction =
  | 'EMPLOYEE_TERMINATED'
  | 'EMPLOYEE_REHIRED'
  | 'FINANCIAL_SETTLEMENT_COMPLETED'
  | 'EMPLOYEE_VIEWED'
  | 'RESIGNED_LIST_EXPORTED';

/**
 * Audit log entry for API requests
 */
export interface AuditLogEntry {
  action: AuditAction;
  employeeId?: string;
  employeeName?: string;
  details?: Record<string, unknown>;
  notes?: string;
}

/**
 * User context for audit logging
 */
export interface AuditUserContext {
  userId: string;
  userName: string;
  userRole: string;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Error class for audit service operations
 */
export class AuditServiceError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500
  ) {
    super(message);
    this.name = 'AuditServiceError';
  }
}

// ============================================================================
// Error Codes
// ============================================================================

export const AUDIT_SERVICE_ERROR_CODES = {
  API_ERROR: 'AUDIT_API_ERROR',
  INVALID_QUERY: 'INVALID_QUERY',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  ENTRY_NOT_FOUND: 'ENTRY_NOT_FOUND',
} as const;

// ============================================================================
// AuditService Class
// ============================================================================

/**
 * Service class for centralized audit logging
 * 
 * Handles:
 * - Logging termination, rehire, and financial settlement operations
 * - Recording user ID, timestamp, IP address, and action details
 * - Providing audit trail viewing functionality for administrators
 * 
 * Validates: Requirement 9.4
 */
export class AuditService {
  private static instance: AuditService;
  private inMemoryLog: AuditLog[] = [];

  /**
   * Get singleton instance
   */
  static getInstance(): AuditService {
    if (!AuditService.instance) {
      AuditService.instance = new AuditService();
    }
    return AuditService.instance;
  }

  /**
   * Log an audit entry for employee termination
   * 
   * @param employeeId - The ID of the terminated employee
   * @param employeeName - The name of the terminated employee
   * @param userContext - The user performing the action
   * @param details - Additional details about the termination
   * @returns Promise<void>
   * 
   * Validates: Requirement 9.4
   */
  async logTermination(
    employeeId: string,
    employeeName: string,
    userContext: AuditUserContext,
    details?: {
      terminationType: 'resignation' | 'termination';
      reason: string;
      terminationDate: Date;
      notes?: string;
    }
  ): Promise<void> {
    await this.log({
      action: 'EMPLOYEE_TERMINATED',
      employeeId,
      employeeName,
      details: {
        ...details,
        terminatedAt: new Date().toISOString(),
      },
    }, userContext);
  }

  /**
   * Log an audit entry for employee rehire
   * 
   * @param employeeId - The ID of the rehired employee
   * @param employeeName - The name of the rehired employee
   * @param userContext - The user performing the action
   * @param details - Additional details about the rehire
   * @returns Promise<void>
   * 
   * Validates: Requirement 9.4
   */
  async logRehire(
    employeeId: string,
    employeeName: string,
    userContext: AuditUserContext,
    details?: {
      rehireDate: Date;
      restorePreviousSettings: boolean;
      previousTerminationDate: Date;
      notes?: string;
    }
  ): Promise<void> {
    await this.log({
      action: 'EMPLOYEE_REHIRED',
      employeeId,
      employeeName,
      details: {
        ...details,
        rehiredAt: new Date().toISOString(),
      },
    }, userContext);
  }

  /**
   * Log an audit entry for financial settlement completion
   * 
   * @param employeeId - The ID of the employee
   * @param employeeName - The name of the employee
   * @param userContext - The user performing the action
   * @param details - Settlement details
   * @returns Promise<void>
   * 
   * Validates: Requirement 9.4
   */
  async logFinancialSettlement(
    employeeId: string,
    employeeName: string,
    userContext: AuditUserContext,
    details?: {
      settlementAmount: number;
      finalSalaryAmount: number;
      deductions: number;
      bonuses: number;
      settlementDate: Date;
      notes?: string;
    }
  ): Promise<void> {
    await this.log({
      action: 'FINANCIAL_SETTLEMENT_COMPLETED',
      employeeId,
      employeeName,
      details: {
        ...details,
        settledAt: new Date().toISOString(),
      },
    }, userContext);
  }

  /**
   * Log an audit entry for viewing employee data
   * 
   * @param employeeId - The ID of the viewed employee
   * @param employeeName - The name of the viewed employee
   * @param userContext - The user performing the action
   * @param details - Additional context
   * @returns Promise<void>
   * 
   * Validates: Requirement 9.4
   */
  async logEmployeeView(
    employeeId: string,
    employeeName: string,
    userContext: AuditUserContext,
    details?: Record<string, unknown>
  ): Promise<void> {
    await this.log({
      action: 'EMPLOYEE_VIEWED',
      employeeId,
      employeeName,
      details,
    }, userContext);
  }

  /**
   * Log an audit entry for exporting resigned employees list
   * 
   * @param userContext - The user performing the action
   * @param details - Export details
   * @returns Promise<void>
   * 
   * Validates: Requirement 9.4
   */
  async logResignedListExport(
    userContext: AuditUserContext,
    details?: {
      filters?: Record<string, unknown>;
      format: 'excel' | 'csv' | 'pdf';
      recordCount: number;
    }
  ): Promise<void> {
    await this.log({
      action: 'RESIGNED_LIST_EXPORTED',
      details,
    }, userContext);
  }

  /**
   * Get audit trail with filtering options for administrators
   * 
   * @param query - Query parameters for filtering
   * @returns Promise with audit log entries
   * @throws AuditServiceError if query is invalid or API error occurs
   * 
   * Validates: Requirement 9.4
   */
  async getAuditTrail(query: AuditLogQuery): Promise<AuditLogResponse> {
    try {
      const response = await apiClient.get('/audit-log', { params: query });
      return response.data as AuditLogResponse;
    } catch (error) {
      const apiError = error as { response?: { data?: { message?: string }; status?: number } };
      
      if (apiError.response?.status === 403) {
        throw new AuditServiceError(
          'You do not have permission to view audit trail',
          AUDIT_SERVICE_ERROR_CODES.PERMISSION_DENIED,
          403
        );
      }

      throw new AuditServiceError(
        apiError.response?.data?.message || 'Failed to fetch audit trail',
        AUDIT_SERVICE_ERROR_CODES.API_ERROR,
        apiError.response?.status || 500
      );
    }
  }

  /**
   * Get audit entries for a specific employee
   * 
   * @param employeeId - The employee ID to filter by
   * @param limit - Maximum number of entries to return
   * @returns Promise with audit log entries
   * 
   * Validates: Requirement 9.4
   */
  async getEmployeeAuditTrail(
    employeeId: string,
    limit: number = 50
  ): Promise<AuditLog[]> {
    try {
      const response = await this.getAuditTrail({
        employeeId,
        limit,
        sortBy: 'timestamp',
        sortOrder: 'desc',
      });
      return response.auditLogs;
    } catch {
      // Return in-memory fallback if API is not available
      return this.inMemoryLog.filter(
        (entry) => entry.employeeId === employeeId
      ).slice(0, limit);
    }
  }

  /**
   * Get recent audit entries (in-memory cache for client-side)
   * 
   * @param limit - Maximum number of entries to return
   * @returns Array of recent audit log entries
   */
  getRecentEntries(limit: number = 20): AuditLog[] {
    return [...this.inMemoryLog]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  }

  /**
   * Clear in-memory log (for testing purposes)
   */
  clearInMemoryLog(): void {
    this.inMemoryLog = [];
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  /**
   * Core logging method - sends audit entry to backend
   * 
   * @param entry - The audit entry to log
   * @param userContext - The user context
   */
  private async log(
    entry: AuditLogEntry,
    userContext: AuditUserContext
  ): Promise<void> {
    const auditEntry: AuditLog = {
      id: this.generateId(),
      action: entry.action,
      employeeId: entry.employeeId || '',
      employeeName: entry.employeeName || '',
      performedBy: userContext.userId,
      performedByName: userContext.userName,
      userRole: userContext.userRole,
      timestamp: new Date(),
      details: entry.details || {},
      notes: entry.notes,
      ipAddress: userContext.ipAddress || 'unknown',
      userAgent: userContext.userAgent || 'unknown',
    };

    // Store in memory for client-side access
    this.inMemoryLog.push(auditEntry);

    // Send to backend API
    try {
      await apiClient.post('/audit-log', auditEntry);
    } catch {
      // Silently fail - in-memory log still has the entry
      // Don't let audit logging failures affect main operations
    }
  }

  /**
   * Generate unique ID for audit entries
   */
  private generateId(): string {
    return `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// ============================================================================
// Singleton Instance Export
// ============================================================================

/**
 * Singleton instance of AuditService
 * Use this for all audit logging operations
 */
export const auditService = AuditService.getInstance();

// Default export
export default auditService;

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Create user context from available session data
 * 
 * @returns AuditUserContext with current user information
 */
export function createAuditUserContext(): AuditUserContext {
  // This would typically get data from auth session
  // For now, return a placeholder that can be filled by the caller
  return {
    userId: '',
    userName: '',
    userRole: '',
    ipAddress: 'client',
    userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'server',
  };
}

/**
 * Create user context with provided data
 * 
 * @param userId - User ID
 * @param userName - User name
 * @param userRole - User role
 * @returns AuditUserContext
 */
export function createAuditUserContextWithData(
  userId: string,
  userName: string,
  userRole: string
): AuditUserContext {
  return {
    userId,
    userName,
    userRole,
    ipAddress: 'client',
    userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'server',
  };
}