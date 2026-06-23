/**
 * API Permission Guard
 * 
 * This module provides server-side permission checking for API routes.
 * It integrates with the backend's permission system via /auth/me.
 */

import { headers } from "next/headers";
import type { Permission } from "./types";

// ============================================================================
// Types
// ============================================================================

export interface AuthenticatedUser {
  id: string;
  employeeId?: string;
  role?: string;
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
 */
export async function getAuthenticatedUser(): Promise<AuthenticatedUser | null> {
  try {
    const headersList = await headers();
    const cookieHeader = headersList.get("cookie") || "";
    
    // Check for auth token in cookies
    const hasAuthCookie = cookieHeader.includes("auth_access_token") || cookieHeader.includes("warehouse_access_token");
    
    if (!hasAuthCookie) {
      return null;
    }

    // Headers set by the backend or proxy
    const roleHeader = headersList.get("x-user-role");
    const userIdHeader = headersList.get("x-user-id");
    const employeeIdHeader = headersList.get("x-user-employee-id");
    const permissionsHeader = headersList.get("x-user-permissions");
    
    if (!userIdHeader) {
      return null;
    }

    const permissions = permissionsHeader ? permissionsHeader.split(",") : [];

    return {
      id: userIdHeader,
      employeeId: employeeIdHeader || undefined,
      role: roleHeader || undefined,
      permissions,
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

  const isAdmin = user.role === "admin";
  const userPermissions = user.permissions || [];

  // Admin has all permissions
  if (isAdmin) {
    return {
      allowed: true,
      reason: "Admin bypass",
      userPermissions: ["*"],
      requiredPermissions: [permission],
    };
  }

  // Check if permission is in user's permission list
  const hasPermission = userPermissions.includes(permission);

  if (hasPermission) {
    return {
      allowed: true,
      userPermissions,
      requiredPermissions: [permission],
    };
  }

  return {
    allowed: false,
    reason: `Permission denied: ${permission}`,
    userPermissions,
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

  const isAdmin = user.role === "admin";
  const userPermissions = user.permissions || [];

  // Admin has all permissions
  if (isAdmin) {
    return {
      allowed: true,
      reason: "Admin bypass",
      userPermissions: ["*"],
      requiredPermissions: permissions,
    };
  }

  // Check if any permission is in user's list
  const hasAny = permissions.some(perm => userPermissions.includes(perm));

  if (hasAny) {
    return {
      allowed: true,
      userPermissions,
      requiredPermissions: permissions,
    };
  }

  return {
    allowed: false,
    reason: `Permission denied: requires one of ${permissions.join(", ")}`,
    userPermissions,
    requiredPermissions: permissions,
  };
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
// Employee Management Permission Checks
// ============================================================================

/**
 * Check if user can view employees (required for terminated employee workflows).
 */
export async function canViewEmployees(): Promise<PermissionCheckResult> {
  const user = await getAuthenticatedUser();
  return checkPermission(user, "view_employees");
}

/**
 * Check if user can edit employees (required for termination/rehire workflows).
 */
export async function canEditEmployees(): Promise<PermissionCheckResult> {
  const user = await getAuthenticatedUser();
  return checkPermission(user, "edit_employees");
}

/**
 * Check if user can view payroll (required for financial settlement).
 */
export async function canViewPayroll(): Promise<PermissionCheckResult> {
  const user = await getAuthenticatedUser();
  return checkPermission(user, "view_payroll");
}

/**
 * Check if user can approve payroll (required for financial settlement).
 */
export async function canApprovePayroll(): Promise<PermissionCheckResult> {
  const user = await getAuthenticatedUser();
  return checkPermission(user, "approve_payroll");
}