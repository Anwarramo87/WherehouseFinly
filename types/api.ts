/**
 * Common API types and interfaces for the Factory Management System
 * 
 * This file contains shared API response patterns and utility types
 * used across different modules including resignation management.
 */

// ============================================================================
// Generic API Response Types
// ============================================================================

/**
 * Standard API response wrapper
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
  timestamp?: string;
}

/**
 * API error response
 */
export interface ApiError {
  success: false;
  message: string;
  error: string;
  code?: string;
  statusCode?: number;
  timestamp: string;
}

/**
 * Pagination metadata
 */
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

/**
 * Paginated API response
 */
export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: PaginationMeta;
}

// ============================================================================
// Query and Filter Types
// ============================================================================

/**
 * Base query parameters for list endpoints
 */
export interface BaseQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Date range filter
 */
export interface DateRangeFilter {
  startDate?: string; // ISO date string
  endDate?: string; // ISO date string
}

/**
 * Common filter options
 */
export interface CommonFilters extends DateRangeFilter {
  department?: string;
  status?: string;
  employeeId?: string;
}

// ============================================================================
// Resignation Management API Types
// ============================================================================

/**
 * Extended query parameters for resigned employees
 */
export interface ResignedEmployeesApiQuery extends BaseQueryParams, CommonFilters {
  month?: string; // 'current' or 'YYYY-MM'
  terminationType?: 'resignation' | 'termination';
  financialStatus?: 'pending' | 'completed';
  includeSettled?: boolean;
}

/**
 * Bulk operation request
 */
export interface BulkOperationRequest {
  employeeIds: string[];
  operation: 'terminate' | 'rehire' | 'settle';
  data?: Record<string, unknown>;
}

/**
 * Bulk operation response
 */
export interface BulkOperationResponse {
  success: boolean;
  message: string;
  processed: number;
  failed: number;
  results: Array<{
    employeeId: string;
    success: boolean;
    message?: string;
    error?: string;
  }>;
}

// ============================================================================
// Statistics and Reporting Types
// ============================================================================

/**
 * Department statistics for resigned employees
 */
export interface DepartmentResignationStats {
  department: string;
  totalResigned: number;
  resignations: number;
  terminations: number;
  pendingSettlement: number;
  averageSettlementDays: number;
}

/**
 * Monthly resignation statistics
 */
export interface MonthlyResignationStats {
  month: string; // YYYY-MM
  totalResigned: number;
  resignations: number;
  terminations: number;
  newHires: number;
  netChange: number;
}

/**
 * Resignation trends report
 */
export interface ResignationTrendsReport {
  period: {
    startDate: string;
    endDate: string;
  };
  summary: {
    totalResigned: number;
    resignationRate: number; // percentage
    averageSettlementTime: number; // days
    topReasons: Array<{
      reason: string;
      count: number;
      percentage: number;
    }>;
  };
  byDepartment: DepartmentResignationStats[];
  byMonth: MonthlyResignationStats[];
}

/**
 * Export options for resigned employees data
 */
export interface ExportOptions {
  format: 'excel' | 'csv' | 'pdf';
  includeFields: string[];
  filters?: ResignedEmployeesApiQuery;
  groupBy?: 'department' | 'month' | 'terminationType';
}

/**
 * Export response
 */
export interface ExportResponse {
  success: boolean;
  message: string;
  downloadUrl?: string;
  fileName?: string;
  expiresAt?: string;
}

// ============================================================================
// Validation and Schema Types
// ============================================================================

/**
 * Field validation error
 */
export interface FieldError {
  field: string;
  message: string;
  code?: string;
}

/**
 * Validation error response
 */
export interface ValidationErrorResponse extends ApiError {
  errors: FieldError[];
}

/**
 * Request validation schema
 */
export interface ValidationSchema {
  [key: string]: {
    required?: boolean;
    type?: 'string' | 'number' | 'date' | 'email' | 'phone';
    minLength?: number;
    maxLength?: number;
    min?: number;
    max?: number;
    pattern?: string;
    enum?: string[];
  };
}

// ============================================================================
// Audit and Logging Types
// ============================================================================

/**
 * Activity log entry
 */
export interface ActivityLog {
  id: string;
  userId: string;
  userName: string;
  action: string;
  resource: string;
  resourceId: string;
  details?: Record<string, unknown>;
  ipAddress: string;
  userAgent: string;
  timestamp: string;
}

/**
 * Audit trail query parameters
 */
export interface AuditTrailQuery extends BaseQueryParams {
  userId?: string;
  action?: string;
  resource?: string;
  resourceId?: string;
  startDate?: string;
  endDate?: string;
}

// ============================================================================
// Permission and Security Types
// ============================================================================

/**
 * User permission
 */
export interface Permission {
  resource: string;
  action: string;
  granted: boolean;
  conditions?: Record<string, unknown>;
}

/**
 * Role definition
 */
export interface Role {
  id: string;
  name: string;
  description?: string;
  permissions: Permission[];
}

/**
 * User context for authorization
 */
export interface UserContext {
  userId: string;
  roles: string[];
  permissions: Permission[];
  department?: string;
}

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Type for API endpoint methods
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

/**
 * Type for API endpoint configuration
 */
export interface ApiEndpoint {
  method: HttpMethod;
  path: string;
  requiresAuth: boolean;
  permissions?: string[];
  rateLimit?: {
    requests: number;
    window: number; // seconds
  };
}

/**
 * Type for API client configuration
 */
export interface ApiClientConfig {
  baseUrl: string;
  timeout: number;
  retries: number;
  headers?: Record<string, string>;
}

// ============================================================================
// Type Guards and Utilities
// ============================================================================

/**
 * Type guard to check if response is an error
 */
export function isApiError(response: unknown): response is ApiError {
  return Boolean(response && typeof response === 'object' && 'success' in response && (response as Record<string, unknown>).success === false && 'error' in response && typeof (response as Record<string, unknown>).error === 'string');
}

/**
 * Type guard to check if response is paginated
 */
export function isPaginatedResponse<T>(response: unknown): response is PaginatedResponse<T> {
  return Boolean(response && typeof response === 'object' && 'pagination' in response && typeof (response as Record<string, unknown>).pagination === 'object');
}

/**
 * Type guard to check if response has validation errors
 */
export function hasValidationErrors(response: unknown): response is ValidationErrorResponse {
  return isApiError(response) && 'errors' in response && Array.isArray((response as ValidationErrorResponse).errors);
}