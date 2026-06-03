/**
 * Role-Based Access Control (RBAC) Module
 * 
 * This module provides a complete permission system for controlling access
 * to termination, rehire, and financial settlement operations.
 * 
 * @example
 * import { usePermissions, PermissionGuard } from '@/lib/permissions';
 * 
 * function MyComponent() {
 *   const { canTerminateEmployee } = usePermissions();
 *   
 *   return (
 *     <PermissionGuard permission="termination:create">
 *       <TerminateButton />
 *     </PermissionGuard>
 *   );
 * }
 */

// Types and constants
export * from "./types";

// Hooks for client-side permission checking
export * from "./hooks";

// ============================================================================
// Quick Access Re-exports
// ============================================================================

// Most commonly used hooks
export {
  usePermissions,
  useRequiredPermission,
  useRequiredPermissions,
} from "./hooks";

// Most commonly used types
export type {
  Permission,
  Role,
  PermissionMatrix,
  OperationPermission,
} from "./types";

// Most commonly used functions
export {
  ROLE_PERMISSIONS,
  OPERATION_PERMISSIONS,
  roleHasPermission,
  roleHasAnyPermission,
  canPerformOperation,
  getRolePermissions,
  getOperationPermissions,
} from "./types";