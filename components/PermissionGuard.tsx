"use client";

import { ReactNode } from "react";
import { usePermissions } from "@/lib/permissions";
import type { Permission } from "@/lib/permissions";

interface PermissionGuardProps {
  /**
   * The permission required to render the children.
   */
  permission: Permission;
  
  /**
   * Optional: Render this when permission is denied.
   * If not provided, children will be hidden.
   */
  fallback?: ReactNode;
  
  /**
   * The children to render if permission is granted.
   */
  children: ReactNode;
  
  /**
   * Optional: Additional CSS class for the wrapper.
   */
  className?: string;
}

/**
 * PermissionGuard Component
 * 
 * Conditionally renders children based on whether the current user
 * has the required permission.
 * 
 * @example
 * <PermissionGuard permission="edit_employees">
 *   <button onClick={handleTerminate}>إنهاء الخدمة</button>
 * </PermissionGuard>
 */
export function PermissionGuard({
  permission,
  fallback = null,
  children,
  className,
}: PermissionGuardProps) {
  const { hasPermission } = usePermissions();
  const hasAccess = hasPermission(permission);

  if (!hasAccess) {
    return <>{fallback}</>;
  }

  if (className) {
    return <div className={className}>{children}</div>;
  }

  return <>{children}</>;
}

// ============================================================================
// Any Permission Guard
// ============================================================================

interface AnyPermissionGuardProps {
  /**
   * Any one of these permissions will grant access.
   */
  permissions: Permission[];
  
  /**
   * Optional: Render this when permission is denied.
   */
  fallback?: ReactNode;
  
  /**
   * The children to render if permission is granted.
   */
  children: ReactNode;
  
  /**
   * Optional: Additional CSS class for the wrapper.
   */
  className?: string;
}

/**
 * AnyPermissionGuard Component
 * 
 * Conditionally renders children if the user has ANY of the specified permissions.
 */
export function AnyPermissionGuard({
  permissions,
  fallback = null,
  children,
  className,
}: AnyPermissionGuardProps) {
  const { hasAnyPermission } = usePermissions();
  const hasAccess = hasAnyPermission(permissions);

  if (!hasAccess) {
    return <>{fallback}</>;
  }

  if (className) {
    return <div className={className}>{children}</div>;
  }

  return <>{children}</>;
}

// ============================================================================
// Role Guard
// ============================================================================

interface RoleGuardProps {
  /**
   * Any one of these roles will grant access.
   */
  roles: string[];
  
  /**
   * Optional: Render this when role check fails.
   */
  fallback?: ReactNode;
  
  /**
   * The children to render if role check passes.
   */
  children: ReactNode;
  
  /**
   * Optional: Additional CSS class for the wrapper.
   */
  className?: string;
}

/**
 * RoleGuard Component
 * 
 * Conditionally renders children if the user has ANY of the specified roles.
 */
export function RoleGuard({
  roles,
  fallback = null,
  children,
  className,
}: RoleGuardProps) {
  const { userRole } = usePermissions();
  const hasAccess = userRole !== null && roles.includes(userRole);

  if (!hasAccess) {
    return <>{fallback}</>;
  }

  if (className) {
    return <div className={className}>{children}</div>;
  }

  return <>{children}</>;
}

// ============================================================================
// Admin Guard
// ============================================================================

interface AdminGuardProps {
  /**
   * Optional: Render this when user is not an admin.
   */
  fallback?: ReactNode;
  
  /**
   * The children to render if user is an admin.
   */
  children: ReactNode;
  
  /**
   * Optional: Additional CSS class for the wrapper.
   */
  className?: string;
}

/**
 * AdminGuard Component
 * 
 * Conditionally renders children only if the user is an admin.
 */
export function AdminGuard({
  fallback = null,
  children,
  className,
}: AdminGuardProps) {
  const { isAdmin } = usePermissions();

  if (!isAdmin) {
    return <>{fallback}</>;
  }

  if (className) {
    return <div className={className}>{children}</div>;
  }

  return <>{children}</>;
}

// ============================================================================
// Operation Guard
// ============================================================================

interface OperationGuardProps {
  /**
   * The operation to check permissions for.
   */
  operation: string;
  
  /**
   * Optional: Render this when operation is not permitted.
   */
  fallback?: ReactNode;
  
  /**
   * The children to render if operation is permitted.
   */
  children: ReactNode;
  
  /**
   * Optional: Additional CSS class for the wrapper.
   */
  className?: string;
}

/**
 * OperationGuard Component
 * 
 * Conditionally renders children if the user can perform the specified operation.
 */
export function OperationGuard({
  operation,
  fallback = null,
  children,
  className,
}: OperationGuardProps) {
  const { hasPermission } = usePermissions();
  const hasAccess = hasPermission(operation as Permission);

  if (!hasAccess) {
    return <>{fallback}</>;
  }

  if (className) {
    return <div className={className}>{children}</div>;
  }

  return <>{children}</>;
}

// ============================================================================
// Termination-Specific Guards
// ============================================================================

interface TerminationGuardsProps {
  /**
   * Children to render for terminate action.
   */
  children: ReactNode;
  
  /**
   * Optional fallback for non-authorized users.
   */
  fallback?: ReactNode;
  
  /**
   * Optional className for wrapper.
   */
  className?: string;
}

/**
 * TerminateEmployeeGuard Component
 * 
 * Conditionally renders children if user can terminate an employee.
 */
export function TerminateEmployeeGuard({
  children,
  fallback = null,
  className,
}: TerminationGuardsProps) {
  const { canTerminateEmployee } = usePermissions();

  if (!canTerminateEmployee()) {
    return <>{fallback}</>;
  }

  if (className) {
    return <div className={className}>{children}</div>;
  }

  return <>{children}</>;
}

/**
 * RehireEmployeeGuard Component
 * 
 * Conditionally renders children if user can rehire an employee.
 */
export function RehireEmployeeGuard({
  children,
  fallback = null,
  className,
}: TerminationGuardsProps) {
  const { canRehireEmployee } = usePermissions();

  if (!canRehireEmployee()) {
    return <>{fallback}</>;
  }

  if (className) {
    return <div className={className}>{children}</div>;
  }

  return <>{children}</>;
}

/**
 * ProcessSettlementGuard Component
 * 
 * Conditionally renders children if user can process financial settlements.
 */
export function ProcessSettlementGuard({
  children,
  fallback = null,
  className,
}: TerminationGuardsProps) {
  const { canProcessSettlement } = usePermissions();

  if (!canProcessSettlement()) {
    return <>{fallback}</>;
  }

  if (className) {
    return <div className={className}>{children}</div>;
  }

  return <>{children}</>;
}

/**
 * ExportResignedListGuard Component
 * 
 * Conditionally renders children if user can export resigned employees list.
 */
export function ExportResignedListGuard({
  children,
  fallback = null,
  className,
}: TerminationGuardsProps) {
  const { canExportResignedList } = usePermissions();

  if (!canExportResignedList()) {
    return <>{fallback}</>;
  }

  if (className) {
    return <div className={className}>{children}</div>;
  }

  return <>{children}</>;
}