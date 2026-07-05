/**
 * Central export file for all TypeScript types and interfaces
 * 
 * This file provides a single entry point for importing types across the application.
 */

// Core entity types
export type { Employee } from './employee';
export type { Salary, SalaryInput } from './salary';
export type { Advance, AdvanceInput, AdvanceType } from './advance';
export type { Bonus, BonusInput } from './bonus';
export type { Penalty } from './penalty';
export type { Reward, RewardInput } from './reward';
export type { DiscountRecord, DiscountInput, DiscountKind } from './discount';
export type { InventoryItem, StockMovement, InventoryItemInput, AdjustStockInput } from './inventory';

// Payroll and attendance types
export type {
  PayrollInput,
  PayrollRun,
  PayrollItem,
  CalculatePayrollInput,
  PayrollReportTotals,
  PayrollReportResponse
} from './payroll';

export type { Leave } from './leave';

export type {
  AttendanceRecord,
  AttendanceDailyRecord,
  AttendanceQueryParams,
  AttendancePayload,
  MarkAttendanceInput,
  AttendanceType
} from '../hooks/useAttendance';

export type {
  DailyRecordInput,
  AttendanceMetrics,
  TableStatus
} from '../lib/attendance-metrics';

// Employee profile types
export type {
  EmployeeProfileQuery,
  EmployeeProfileAccess,
  EmployeeProfileSalary,
  EmployeeProfileAttendanceRecord,
  EmployeeProfileAttendance,
  EmployeeProfileAdvances,
  EmployeeProfileBonuses,
  EmployeeProfileResponse
} from './employee-profile';

// Dashboard and statistics types
export type {
  EmployeesStats,
  AttendanceStats,
  AttendanceAlert,
  AttendanceAlertsResponse,
  AttendanceAlertStatus,
  InventoryStats,
  DashboardKpis
} from './dashboard';

// Deduction types
export type {
  AttendanceDeductionBreakdown,
  AttendanceDeductionInput,
  AttendanceDeductionResponse
} from './attendance-deduction';

export type {
  TransportationDeductionBreakdown,
  TransportationDeductionInput,
  TransportationDeductionResponse
} from './transportation-deduction';

// ============================================================================
// Resignation Management Types
// ============================================================================

export type {
  // Core resignation interfaces
  TerminationRecord,
  FinancialSettlement,
  RehireRecord,
  
  // API request/response types
  TerminateEmployeeRequest,
  TerminateEmployeeResponse,
  RehireEmployeeRequest,
  RehireEmployeeResponse,
  FinancialSettlementRequest,
  FinancialSettlementResponse,
  ResignedEmployeesQuery,
  ResignedEmployeesStatistics,
  PaginationInfo,
  ResignedEmployeesResponse,
  
  // UI component props
  TerminationData,
  TerminateEmployeeModalProps,
  RehireData,
  RehireEmployeeModalProps,
  SettlementData,
  FinancialSettlementModalProps,
  FilterOptions,
  ResignedEmployeesListProps,
  
  // Business logic types
  TerminationResult,
  RehireResult,
  SettlementResult,
  PayrollData,
  PermissionMatrix,
  
  // Utility types
  EmployeeStatus,
  TerminationType,
  FinancialSettlementStatus
} from './resignation';

// Export resignation utility functions
export {
  isResignedEmployee,
  isEligibleForRehire,
  needsFinancialSettlement,
  RESIGNATION_ERROR_CODES,
  ResignationManagementError
} from './resignation';

// ============================================================================
// Audit Logging Types
// ============================================================================

export type {
  // Core audit types
  AuditAction,
  AuditLog,
  AuditLogEntry,

  // API request/response types
  AuditLogQuery,
  AuditLogResponse,
  CreateAuditLogRequest,
  AuditLogDetailResponse,

  // Statistics types
  AuditStatistics,
  AuditTrailSummary,

  // Filter and export types
  AuditFilterOptions,
  AuditExportOptions,
  AuditExportResponse,

  // User context types
  AuditUserContext,

  // Error types
  AUDIT_ERROR_CODES,
  AuditServiceError
} from './audit';

// Export audit utility functions
export {
  isTerminationAction,
  isRehireAction,
  isSettlementAction,
  getAuditActionLabel,
  getAuditActionIcon
} from './audit';