/**
 * API Permission Guard
 * 
 * This module provides server-side permission checking for API routes.
 * It integrates with the existing authentication system to validate
 * permissions before allowing access to sensitive operations.
 */

import { headers } from "next/headers";
import type { Permission, Role } from "./types";
import {
  ROLE_PERMISSIONS,
  roleHasPermission,
  roleHasAnyPermission,
  canPerformOperation,
} from "./types";

// ============================================================================
// Types
// ============================================================================

export interface AuthenticatedUser {
  id: string;
  employeeId?: string;
  role?: string;
  roles?: string[];
  permissions?: string[];
}

export interface PermissionCheckResult {
  allowed: boolean;
  reason?: string;
  userPermissions: string[];
  requiredPermissions: Permission[];
}

// ============================================================================
// Server-Side Auth Extraction
// ============================================================================

/**
 * Extract authenticated user from request headers/cookies.
 * This simulates what the backend does for authentication.
 */
export async function getAuthenticatedUser(): Promise<AuthenticatedUser | null> {
  try {
    const headersList = await headers();
    const cookieHeader = headersList.get("cookie") || "";
    
    // Check for auth token in cookies
    const hasAuthCookie = cookieHeader.includes("auth_access_token");
    
    if (!hasAuthCookie) {
      return null;
    }

    // In a real implementation, we would decode the JWT token
    // For now, we'll return a mock user based on the role header
    const roleHeader = headersList.get("x-user-role");
    const userIdHeader = headersList.get("x-user-id");
    const employeeIdHeader = headersList.get("x-user-employee-id");
    
    if (!roleHeader) {
      return null;
    }

    return {
      id: userIdHeader || "unknown",
      employeeId: employeeIdHeader || undefined,
      role: roleHeader,
      roles: roleHeader ? [roleHeader] : [],
    };
  } catch {
    return null;
  }
}

// ============================================================================
// Permission Checking Functions
// ============================================================================

/**
 * Check if a user has a specific permission.
 */
export function checkPermission(
  user: AuthenticatedUser | null,
  permission: Permission
): PermissionCheckResult {
  if (!user) {
    return {
      allowed: false,
      reason: "Authentication required",
      userPermissions: [],
      requiredPermissions: [permission],
    };
  }

  const userRoles = getUserRoles(user);
  const isAdmin = userRoles.includes("admin");

  // Admin has all permissions
  if (isAdmin) {
    return {
      allowed: true,
      reason: "Admin bypass",
      userPermissions: ["*"],
      requiredPermissions: [permission],
    };
  }

  // Check if any role has the permission
  const hasPermission = userRoles.some(role => roleHasPermission(role, permission));

  if (hasPermission) {
    return {
      allowed: true,
      userPermissions: getUserPermissions(user),
      requiredPermissions: [permission],
    };
  }

  return {
    allowed: false,
    reason: `Permission denied: ${permission}`,
    userPermissions: getUserPermissions(user),
    requiredPermissions: [permission],
  };
}

/**
 * Check if a user has any of the specified permissions.
 */
export function checkAnyPermission(
  user: AuthenticatedUser | null,
  permissions: Permission[]
): PermissionCheckResult {
  if (!user) {
    return {
      allowed: false,
      reason: "Authentication required",
      userPermissions: [],
      requiredPermissions: permissions,
    };
  }

  const userRoles = getUserRoles(user);
  const isAdmin = userRoles.includes("admin");

  // Admin has all permissions
  if (isAdmin) {
    return {
      allowed: true,
      reason: "Admin bypass",
      userPermissions: ["*"],
      requiredPermissions: permissions,
    };
  }

  // Check if any role has any of the permissions
  const hasAny = userRoles.some(role => roleHasAnyPermission(role, permissions));

  if (hasAny) {
    return {
      allowed: true,
      userPermissions: getUserPermissions(user),
      requiredPermissions: permissions,
    };
  }

  return {
    allowed: false,
    reason: `Permission denied: requires one of ${permissions.join(", ")}`,
    userPermissions: getUserPermissions(user),
    requiredPermissions: permissions,
  };
}

/**
 * Check if a user can perform a specific operation.
 */
export function checkOperation(
  user: AuthenticatedUser | null,
  operation: string
): PermissionCheckResult {
  if (!user) {
    return {
      allowed: false,
      reason: "Authentication required",
      userPermissions: [],
      requiredPermissions: [],
    };
  }

  const userRoles = getUserRoles(user);
  const isAdmin = userRoles.includes("admin");

  // Admin can perform all operations
  if (isAdmin) {
    return {
      allowed: true,
      reason: "Admin bypass",
      userPermissions: ["*"],
      requiredPermissions: [],
    };
  }

  // Check if any role can perform the operation
  const canPerform = userRoles.some(role => canPerformOperation(role, operation));

  if (canPerform) {
    return {
      allowed: true,
      userPermissions: getUserPermissions(user),
      requiredPermissions: [],
    };
  }

  return {
    allowed: false,
    reason: `Operation not permitted: ${operation}`,
    userPermissions: getUserPermissions(user),
    requiredPermissions: [],
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get all roles for a user.
 */
function getUserRoles(user: AuthenticatedUser): string[] {
  const roles: string[] = [];
  
  if (user.role) {
    roles.push(String(user.role).toLowerCase());
  }
  
  if (Array.isArray(user.roles)) {
    user.roles.forEach(r => {
      const role = String(r).toLowerCase();
      if (!roles.includes(role)) {
        roles.push(role);
      }
    });
  }
  
  return roles;
}

/**
 * Get all permissions for a user based on their roles.
 */
function getUserPermissions(user: AuthenticatedUser): string[] {
  const userRoles = getUserRoles(user);
  const permissions = new Set<string>();
  
  userRoles.forEach(role => {
    const rolePerms = ROLE_PERMISSIONS[role as Role];
    if (rolePerms) {
      Object.entries(rolePerms)
        .filter(([, has]) => has)
        .forEach(([perm]) => permissions.add(perm));
    }
  });
  
  return Array.from(permissions);
}

// ============================================================================
// Middleware Helper
// ============================================================================

/**
 * Create a permission error response.
 */
export function createPermissionDeniedResponse(
  permission: Permission,
  reason?: string
): Response {
  return new Response(
    JSON.stringify({
      error: "FORBIDDEN",
      message: "You do not have permission to perform this action",
      requiredPermission: permission,
      reason: reason || "Permission denied",
    }),
    {
      status: 403,
      headers: {
        "Content-Type": "application/json",
      },
    }
  );
}

/**
 * Create an authentication error response.
 */
export function createUnauthorizedResponse(): Response {
  return new Response(
    JSON.stringify({
      error: "UNAUTHORIZED",
      message: "Authentication required",
    }),
    {
      status: 401,
      headers: {
        "Content-Type": "application/json",
      },
    }
  );
}

// ============================================================================
// Termination-Specific Permission Checks
// ============================================================================

/**
 * Check if user can terminate an employee.
 */
export async function canTerminateEmployee(): Promise<PermissionCheckResult> {
  const user = await getAuthenticatedUser();
  return checkPermission(user, "termination:create");
}

/**
 * Check if user can rehire an employee.
 */
export async function canRehireEmployee(): Promise<PermissionCheckResult> {
  const user = await getAuthenticatedUser();
  return checkPermission(user, "rehire:process");
}

/**
 * Check if user can process financial settlement.
 */
export async function canProcessSettlement(): Promise<PermissionCheckResult> {
  const user = await getAuthenticatedUser();
  return checkPermission(user, "settlement:process");
}

/**
 * Check if user can view resigned employees.
 */
export async function canViewResignedEmployees(): Promise<PermissionCheckResult> {
  const user = await getAuthenticatedUser();
  return checkPermission(user, "termination:view");
}

/**
 * Check if user can export resigned list.
 */
export async function canExportResignedList(): Promise<PermissionCheckResult> {
  const user = await getAuthenticatedUser();
  return checkPermission(user, "export:resigned");
}