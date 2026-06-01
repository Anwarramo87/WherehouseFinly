/**
 * TypeScript interfaces and types for Audit Logging System
 * 
 * This file contains all the type definitions for the audit logging
 * functionality required by Requirement 9.4.
 */

// ============================================================================
// Core Audit Types
// ============================================================================

/**
 * Audit action types for resignation management operations
 */
export type AuditAction =
  | 'EMPLOYEE_TERMINATED'
  | 'EMPLOYEE_REHIRED'
  | 'FINANCIAL_SETTLEMENT_COMPLETED'
  | 'EMPLOYEE_VIEWED'
  | 'RESIGNED_LIST_EXPORTED'
  | 'AUDIT_LOG_VIEWED';

/**
 * Complete audit log entry
 */
export interface AuditLog {
  id: string;
  action: AuditAction;
  employeeId: string;
  employeeName: string;
  performedBy: string;
  performedByName: string;
  userRole: string;
  timestamp: Date;
  details: Record<string, unknown>;
  notes?: string;
  ipAddress: string;
  userAgent: string;
}

/**
 * Audit log entry for API requests
 */
export interface AuditLogEntry {
  action: AuditAction;
  employeeId?: string;
  employeeName?: string;
  performedBy: string;
  performedByName: string;
  userRole: string;
  timestamp: string;
  details?: Record<string, unknown>;
  notes?: string;
  ipAddress: string;
  userAgent: string;
}

// ============================================================================
// API Request/Response Types
// ============================================================================

/**
 * Query parameters for audit trail API
 */
export interface AuditLogQuery {
  // Pagination
  page?: number;
  limit?: number;

  // Sorting
  sortBy?: 'timestamp' | 'action' | 'employeeId';
  sortOrder?: 'asc' | 'desc';

  // Filters
  action?: AuditAction;
  employeeId?: string;
  performedBy?: string;
  userRole?: string;
  startDate?: string; // ISO date string
  endDate?: string; // ISO date string

  // Search
  search?: string;
}

/**
 * Response for audit trail query API
 */
export interface AuditLogResponse {
  success: boolean;
  auditLogs: AuditLog[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

/**
 * Request body for creating audit log entry
 */
export interface CreateAuditLogRequest {
  action: AuditAction;
  employeeId?: string;
  employeeName?: string;
  details?: Record<string, unknown>;
  notes?: string;
}

/**
 * Response for single audit log entry
 */
export interface AuditLogDetailResponse {
  success: boolean;
  auditLog: AuditLog;
}

// ============================================================================
// Statistics Types
// ============================================================================

/**
 * Audit statistics for a specific time period
 */
export interface AuditStatistics {
  totalEntries: number;
  byAction: Record<AuditAction, number>;
  byUser: Array<{
    userId: string;
    userName: string;
    actionCount: number;
  }>;
  byDay: Array<{
    date: string;
    count: number;
  }>;
}

/**
 * Audit trail summary for dashboard
 */
export interface AuditTrailSummary {
  recentActions: AuditLog[];
  topActions: Array<{
    action: AuditAction;
    count: number;
  }>;
  activeUsers: Array<{
    userId: string;
    userName: string;
    actionCount: number;
  }>;
}

// ============================================================================
// Filter and Export Types
// ============================================================================

/**
 * Filter options for audit trail UI
 */
export interface AuditFilterOptions {
  action?: AuditAction;
  employeeId?: string;
  performedBy?: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
}

/**
 * Export options for audit trail
 */
export interface AuditExportOptions {
  format: 'excel' | 'csv' | 'pdf';
  filters?: AuditLogQuery;
  includeDetails?: boolean;
}

/**
 * Export response
 */
export interface AuditExportResponse {
  success: boolean;
  message: string;
  downloadUrl?: string;
  fileName?: string;
  expiresAt?: string;
}

// ============================================================================
// User Context Types
// ============================================================================

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

// ============================================================================
// Error Handling Types
// ============================================================================

/**
 * Error codes for audit service operations
 */
export const AUDIT_ERROR_CODES = {
  API_ERROR: 'AUDIT_API_ERROR',
  INVALID_QUERY: 'INVALID_QUERY',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  ENTRY_NOT_FOUND: 'ENTRY_NOT_FOUND',
  EXPORT_FAILED: 'EXPORT_FAILED',
} as const;

/**
 * Custom error class for audit service operations
 */
export class AuditServiceError extends Error {
  constructor(
    message: string,
    public code: keyof typeof AUDIT_ERROR_CODES,
    public statusCode: number = 500
  ) {
    super(message);
    this.name = 'AuditServiceError';
  }
}

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Type guard to check if action is a termination-related action
 */
export function isTerminationAction(action: AuditAction): boolean {
  return action === 'EMPLOYEE_TERMINATED';
}

/**
 * Type guard to check if action is a rehire-related action
 */
export function isRehireAction(action: AuditAction): boolean {
  return action === 'EMPLOYEE_REHIRED';
}

/**
 * Type guard to check if action is a settlement-related action
 */
export function isSettlementAction(action: AuditAction): boolean {
  return action === 'FINANCIAL_SETTLEMENT_COMPLETED';
}

/**
 * Get human-readable label for audit action
 */
export function getAuditActionLabel(action: AuditAction): string {
  const labels: Record<AuditAction, string> = {
    EMPLOYEE_TERMINATED: 'إنهاء خدمة موظف',
    EMPLOYEE_REHIRED: 'إعادة تعيين موظف',
    FINANCIAL_SETTLEMENT_COMPLETED: 'اكتمال التصفية المالية',
    EMPLOYEE_VIEWED: 'عرض بيانات موظف',
    RESIGNED_LIST_EXPORTED: 'تصدير قائمة المستقيلين',
    AUDIT_LOG_VIEWED: 'عرض سجل التدقيق',
  };
  return labels[action] || action;
}

/**
 * Get icon name for audit action (for UI)
 */
export function getAuditActionIcon(action: AuditAction): string {
  const icons: Record<AuditAction, string> = {
    EMPLOYEE_TERMINATED: 'user-x',
    EMPLOYEE_REHIRED: 'user-plus',
    FINANCIAL_SETTLEMENT_COMPLETED: 'dollar-sign',
    EMPLOYEE_VIEWED: 'eye',
    RESIGNED_LIST_EXPORTED: 'download',
    AUDIT_LOG_VIEWED: 'file-text',
  };
  return icons[action] || 'activity';
}