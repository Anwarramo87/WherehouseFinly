/**
 * Role-Based Access Control (RBAC) System for Employee Resignation Management
 * 
 * This module defines the permission matrix and types for controlling access
 * to termination, rehire, and financial settlement operations.
 */

// ============================================================================
// Permission Definitions
// ============================================================================

export type Permission =
  // Employee management permissions
  | 'employee:view'
  | 'employee:create'
  | 'employee:edit'
  | 'employee:delete'
  
  // Termination permissions
  | 'termination:view'
  | 'termination:create'
  | 'termination:process'
  
  // Rehire permissions
  | 'rehire:view'
  | 'rehire:process'
  
  // Financial settlement permissions
  | 'settlement:view'
  | 'settlement:process'
  
  // Export permissions
  | 'export:resigned'
  | 'export:payroll'
  
  // Audit and reporting
  | 'audit:view'
  | 'reports:view'
  | 'reports:generate';

// ============================================================================
// Role Definitions
// ============================================================================

export type Role = 
  | 'admin'
  | 'hr_manager'
  | 'accountant'
  | 'manager'
  | 'supervisor'
  | 'employee';

// ============================================================================
// Permission Matrix
// ============================================================================

export interface PermissionMatrix {
  [role: string]: {
    [permission in Permission]?: boolean;
  };
}

/**
 * Permission matrix defining which roles have which permissions.
 * This is the central configuration for access control.
 */
export const ROLE_PERMISSIONS: PermissionMatrix = {
  admin: {
    // Full access to everything
    'employee:view': true,
    'employee:create': true,
    'employee:edit': true,
    'employee:delete': true,
    'termination:view': true,
    'termination:create': true,
    'termination:process': true,
    'rehire:view': true,
    'rehire:process': true,
    'settlement:view': true,
    'settlement:process': true,
    'export:resigned': true,
    'export:payroll': true,
    'audit:view': true,
    'reports:view': true,
    'reports:generate': true,
  },
  
  hr_manager: {
    // HR managers can manage employees and terminations
    'employee:view': true,
    'employee:create': true,
    'employee:edit': true,
    'termination:view': true,
    'termination:create': true,
    'termination:process': true,
    'rehire:view': true,
    'rehire:process': true,
    'settlement:view': true,
    'export:resigned': true,
    'reports:view': true,
    'reports:generate': true,
  },
  
  accountant: {
    // Accountants can view and process settlements
    'employee:view': true,
    'termination:view': true,
    'rehire:view': true,
    'settlement:view': true,
    'settlement:process': true,
    'export:payroll': true,
    'reports:view': true,
  },
  
  manager: {
    // Managers can view and request terminations
    'employee:view': true,
    'termination:view': true,
    'termination:create': true, // Can request, but needs approval
    'rehire:view': true,
    'settlement:view': true,
    'reports:view': true,
  },
  
  supervisor: {
    // Supervisors have limited view access
    'employee:view': true,
    'termination:view': true,
    'rehire:view': true,
    'settlement:view': true,
  },
  
  employee: {
    // Regular employees have minimal access
    'employee:view': true, // View own profile
  },
};

// ============================================================================
// Operation Permission Requirements
// ============================================================================

export interface OperationPermission {
  operation: string;
  requiredPermissions: Permission[];
  description: string;
}

/**
 * Define which permissions are required for each termination-related operation.
 */
export const OPERATION_PERMISSIONS: OperationPermission[] = [
  {
    operation: 'terminate_employee',
    requiredPermissions: ['termination:create'],
    description: 'إنهاء خدمة موظف (استقالة أو إقالة)',
  },
  {
    operation: 'view_resigned_employees',
    requiredPermissions: ['termination:view'],
    description: 'عرض قائمة الموظفين المغادرين',
  },
  {
    operation: 'rehire_employee',
    requiredPermissions: ['rehire:process'],
    description: 'إعادة تعيين موظف مغادر',
  },
  {
    operation: 'process_financial_settlement',
    requiredPermissions: ['settlement:process'],
    description: 'معالجة التصفية المالية لموظف مغادر',
  },
  {
    operation: 'view_financial_settlement',
    requiredPermissions: ['settlement:view'],
    description: 'عرض حالة التصفية المالية',
  },
  {
    operation: 'export_resigned_list',
    requiredPermissions: ['export:resigned'],
    description: 'تصدير قائمة المستقيلين',
  },
  {
    operation: 'view_audit_logs',
    requiredPermissions: ['audit:view'],
    description: 'عرض سجل التدقيق',
  },
];

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Check if a role has a specific permission.
 */
export function roleHasPermission(role: string, permission: Permission): boolean {
  const rolePermissions = ROLE_PERMISSIONS[role as Role];
  if (!rolePermissions) {
    return false;
  }
  return rolePermissions[permission] === true;
}

/**
 * Check if a role has any of the specified permissions.
 */
export function roleHasAnyPermission(role: string, permissions: Permission[]): boolean {
  return permissions.some(permission => roleHasPermission(role, permission));
}

/**
 * Get all permissions for a specific role.
 */
export function getRolePermissions(role: string): Permission[] {
  const rolePermissions = ROLE_PERMISSIONS[role as Role];
  if (!rolePermissions) {
    return [];
  }
  return Object.entries(rolePermissions)
    .filter(([, hasPermission]) => hasPermission)
    .map(([permission]) => permission as Permission);
}

/**
 * Get the required permissions for a specific operation.
 */
export function getOperationPermissions(operation: string): Permission[] {
  const op = OPERATION_PERMISSIONS.find(o => o.operation === operation);
  return op?.requiredPermissions || [];
}

/**
 * Check if a role can perform a specific operation.
 */
export function canPerformOperation(role: string, operation: string): boolean {
  const requiredPermissions = getOperationPermissions(operation);
  if (requiredPermissions.length === 0) {
    return false;
  }
  return roleHasAnyPermission(role, requiredPermissions);
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Type guard to check if a string is a valid permission.
 */
export function isPermission(value: string): value is Permission {
  const validPermissions: Permission[] = [
    'employee:view', 'employee:create', 'employee:edit', 'employee:delete',
    'termination:view', 'termination:create', 'termination:process',
    'rehire:view', 'rehire:process',
    'settlement:view', 'settlement:process',
    'export:resigned', 'export:payroll',
    'audit:view', 'reports:view', 'reports:generate',
  ];
  return validPermissions.includes(value as Permission);
}

/**
 * Type guard to check if a string is a valid role.
 */
export function isRole(value: string): value is Role {
  const validRoles: Role[] = ['admin', 'hr_manager', 'accountant', 'manager', 'supervisor', 'employee'];
  return validRoles.includes(value as Role);
}