/**
 * TypeScript interfaces and types for Employee Resignation Management System
 * 
 * This file contains all the type definitions for managing employee termination,
 * rehiring, and financial settlement processes.
 */

import type { Employee } from './employee';

// ============================================================================
// Core Resignation Management Types
// ============================================================================

/**
 * Termination record interface for tracking employee termination details
 */
export interface TerminationRecord {
  id: string;
  employeeId: string;
  terminationDate: Date;
  terminationType: 'resignation' | 'termination';
  reason: string;
  notes?: string;
  processedBy: string;
  createdAt: Date;
}

/**
 * Financial settlement interface for tracking employee financial clearance
 */
export interface FinancialSettlement {
  id: string;
  employeeId: string;
  settlementDate: Date;
  processedBy: string;
  finalSalaryAmount: number;
  deductions: number;
  bonuses: number;
  totalSettlement: number;
  status: 'pending' | 'completed';
  notes?: string;
  createdAt: Date;
}

/**
 * Rehire record interface for tracking employee rehiring history
 */
export interface RehireRecord {
  id: string;
  employeeId: string;
  rehireDate: Date;
  processedBy: string;
  previousTerminationId: string;
  notes?: string;
  createdAt: Date;
}

// ============================================================================
// API Request/Response Types
// ============================================================================

/**
 * Request body for employee termination API
 */
export interface TerminateEmployeeRequest {
  employeeId: string;
  terminationDate: string; // ISO date string
  terminationType: 'resignation' | 'termination';
  reason: string;
  notes?: string;
}

/**
 * Response for employee termination API
 */
export interface TerminateEmployeeResponse {
  success: boolean;
  message: string;
  employee: Employee;
  terminationRecord: TerminationRecord;
}

/**
 * Request body for employee rehire API
 */
export interface RehireEmployeeRequest {
  employeeId: string;
  rehireDate: string; // ISO date string
  notes?: string;
  restorePreviousSettings: boolean;
}

/**
 * Response for employee rehire API
 */
export interface RehireEmployeeResponse {
  success: boolean;
  message: string;
  employee: Employee;
  rehireRecord: RehireRecord;
}

/**
 * Request body for financial settlement API
 */
export interface FinancialSettlementRequest {
  employeeId: string;
  settlementDate: string; // ISO date string
  finalSalaryAmount: number;
  deductions: number;
  bonuses: number;
  notes?: string;
}

/**
 * Response for financial settlement API
 */
export interface FinancialSettlementResponse {
  success: boolean;
  message: string;
  settlement: FinancialSettlement;
}

/**
 * Query parameters for resigned employees API
 */
export interface ResignedEmployeesQuery {
  month?: string; // 'current' or 'YYYY-MM'
  type?: 'resignation' | 'termination';
  department?: string;
  financialStatus?: 'pending' | 'completed';
  search?: string;
  page?: number;
  limit?: number;
}

/**
 * Statistics for resigned employees
 */
export interface ResignedEmployeesStatistics {
  currentMonth: number;
  previousMonths: number;
  resignations: number;
  terminations: number;
  pendingSettlement: number;
  completedSettlement: number;
  totalResigned: number;
}

/**
 * Pagination information
 */
export interface PaginationInfo {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Response for resigned employees query API
 */
export interface ResignedEmployeesResponse {
  success: boolean;
  employees: Employee[];
  pagination: PaginationInfo;
  statistics: ResignedEmployeesStatistics;
}

// ============================================================================
// UI Component Props Types
// ============================================================================

/**
 * Data structure for termination form
 */
export interface TerminationData {
  terminationDate: Date;
  terminationType: 'resignation' | 'termination';
  reason: string;
  notes?: string;
}

/**
 * Props for TerminateEmployeeModal component
 */
export interface TerminateEmployeeModalProps {
  employee: Employee;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: TerminationData) => void;
}

/**
 * Data structure for rehire form
 */
export interface RehireData {
  rehireDate: Date;
  notes?: string;
  restorePreviousSettings: boolean;
}

/**
 * Props for RehireEmployeeModal component
 */
export interface RehireEmployeeModalProps {
  employee: Employee;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: RehireData) => void;
}

/**
 * Data structure for financial settlement form
 */
export interface SettlementData {
  settlementDate: Date;
  finalSalaryAmount: number;
  deductions: number;
  bonuses: number;
  notes?: string;
}

/**
 * Props for FinancialSettlementModal component
 */
export interface FinancialSettlementModalProps {
  employee: Employee;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: SettlementData) => void;
}

/**
 * Filter options for resigned employees list
 */
export interface FilterOptions {
  terminationType?: 'resignation' | 'termination';
  department?: string;
  dateRange?: { start: Date; end: Date };
  financialStatus?: 'pending' | 'completed';
}

/**
 * Props for ResignedEmployeesList component
 */
export interface ResignedEmployeesListProps {
  employees: Employee[];
  onRehire: (employeeId: string) => void;
  onFinancialSettlement: (employeeId: string) => void;
  onSearch: (query: string) => void;
  onFilter: (filters: FilterOptions) => void;
  loading?: boolean;
  statistics?: ResignedEmployeesStatistics;
}

// ============================================================================
// Business Logic Types
// ============================================================================

/**
 * Result type for termination operations
 */
export interface TerminationResult {
  employee: Employee;
  terminationRecord: TerminationRecord;
}

/**
 * Result type for rehire operations
 */
export interface RehireResult {
  employee: Employee;
  rehireRecord: RehireRecord;
}

/**
 * Result type for settlement operations
 */
export interface SettlementResult {
  settlement: FinancialSettlement;
}

/**
 * Payroll data structure for resigned employees
 */
export interface PayrollData {
  activeEmployees: Employee[];
  resignedEmployees: Employee[];
}

/**
 * Audit log entry for resignation management operations
 */
export interface AuditLog {
  id: string;
  action: 'EMPLOYEE_TERMINATED' | 'EMPLOYEE_REHIRED' | 'FINANCIAL_SETTLEMENT_COMPLETED';
  employeeId: string;
  performedBy: string;
  timestamp: Date;
  details: Record<string, unknown>;
  ipAddress: string;
}

/**
 * Permission matrix for role-based access control
 */
export interface PermissionMatrix {
  hr_manager: {
    terminateEmployee: boolean;
    rehireEmployee: boolean;
    viewResignedEmployees: boolean;
    exportResignedList: boolean;
  };
  accountant: {
    processFinancialSettlement: boolean;
    viewPayrollReports: boolean;
    viewResignedEmployees: boolean;
  };
  admin: {
    terminateEmployee: boolean;
    rehireEmployee: boolean;
    processFinancialSettlement: boolean;
    viewResignedEmployees: boolean;
    exportResignedList: boolean;
    viewPayrollReports: boolean;
  };
}

// ============================================================================
// Error Handling Types
// ============================================================================

/**
 * Error codes for resignation management operations
 */
export const RESIGNATION_ERROR_CODES = {
  EMPLOYEE_NOT_FOUND: 'EMPLOYEE_NOT_FOUND',
  EMPLOYEE_NOT_ACTIVE: 'EMPLOYEE_NOT_ACTIVE',
  EMPLOYEE_ALREADY_TERMINATED: 'EMPLOYEE_ALREADY_TERMINATED',
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',
  INVALID_TERMINATION_DATE: 'INVALID_TERMINATION_DATE',
  FINANCIAL_SETTLEMENT_ALREADY_PROCESSED: 'FINANCIAL_SETTLEMENT_ALREADY_PROCESSED',
  EMPLOYEE_NOT_ELIGIBLE_FOR_REHIRE: 'EMPLOYEE_NOT_ELIGIBLE_FOR_REHIRE',
  INVALID_SETTLEMENT_AMOUNT: 'INVALID_SETTLEMENT_AMOUNT',
} as const;

/**
 * Custom error class for resignation management operations
 */
export class ResignationManagementError extends Error {
  constructor(
    message: string,
    public code: keyof typeof RESIGNATION_ERROR_CODES,
    public statusCode: number = 400
  ) {
    super(message);
    this.name = 'ResignationManagementError';
  }
}

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Employee status type with resignation-specific statuses
 */
export type EmployeeStatus = 'active' | 'resigned' | 'terminated' | 'inactive';

/**
 * Termination type
 */
export type TerminationType = 'resignation' | 'termination';

/**
 * Financial settlement status
 */
export type FinancialSettlementStatus = 'pending' | 'completed';

/**
 * Type guard to check if employee is resigned or terminated
 */
export function isResignedEmployee(employee: Employee): boolean {
  return employee.status === 'resigned' || employee.status === 'terminated';
}

/**
 * Type guard to check if employee is eligible for rehire
 */
export function isEligibleForRehire(employee: Employee): boolean {
  return isResignedEmployee(employee) && employee.financialSettlementStatus !== 'completed';
}

/**
 * Type guard to check if employee needs financial settlement
 */
export function needsFinancialSettlement(employee: Employee): boolean {
  return isResignedEmployee(employee) && employee.financialSettlementStatus === 'pending';
}