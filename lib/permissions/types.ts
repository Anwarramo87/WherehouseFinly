/**
 * Permission-Based Access Control System
 * 
 * This module defines permission types and checks for authorization.
 * Permissions are based on the backend's permission system via the /auth/me endpoint.
 * The backend only issues role values of 'admin' or 'staff', which grant specific permissions.
 */

// ============================================================================
// Permission Definitions
// ============================================================================

/**
 * Backend permission strings (from @Permissions decorators in backend controllers).
 * These are the canonical permission values issued by the backend.
 * Permissions are case-sensitive and use underscore naming (e.g., view_employees, not view:employees).
 */
export type Permission =
  // Employee management
  | "view_employees"
  | "edit_employees"
  | "delete_employees"
  
  // Attendance
  | "view_attendance"
  | "edit_attendance"
  
  // Payroll
  | "view_payroll"
  | "run_payroll"
  | "approve_payroll"
  | "delete_payroll"
  
  // Inventory
  | "view_inventory"
  | "edit_inventory"
  
  // Imports
  | "view_imports"
  | "run_imports"
  
  // Device management
  | "view_devices"
  | "manage_devices"
  
  // Financial management
  | "manage_advances"
  | "manage_bonuses"
  | "manage_penalties"
  | "manage_insurance"
  | "manage_salary"
  
  // Admin functions
  | "manage_users"
  | "manage_roles"
  | "manage_trash"
  | "manage_backups";


// ============================================================================
// Permission Checking Helpers
// ============================================================================

/**
 * Check if a permission is valid (type guard).
 */
export function isPermission(value: string): value is Permission {
  const validPermissions: Permission[] = [
    "view_employees", "edit_employees", "delete_employees",
    "view_attendance", "edit_attendance",
    "view_payroll", "run_payroll", "approve_payroll", "delete_payroll",
    "view_inventory", "edit_inventory",
    "view_imports", "run_imports",
    "view_devices", "manage_devices",
    "manage_advances", "manage_bonuses", "manage_penalties", "manage_insurance", "manage_salary",
    "manage_users", "manage_roles", "manage_trash", "manage_backups",
  ];
  return validPermissions.includes(value as Permission);
}