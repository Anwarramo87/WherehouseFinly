"use client";

import { useCallback, useMemo } from "react";
import { useAuthStore } from "@/stores/auth-store";
import type { Permission } from "./types";
import {
  roleHasPermission,
  roleHasAnyPermission,
  canPerformOperation,
  getRolePermissions,
} from "./types";

/**
 * Hook to check permissions for the current user.
 * Provides utility functions for permission-based UI rendering.
 */
export function usePermissions() {
  const { user } = useAuthStore();

  const userRoles = useMemo(() => {
    if (!user) return [];
    
    // Support both single role and roles array
    if (user.role && typeof user.role === 'string') {
      return [user.role.toLowerCase()];
    }
    
    if (Array.isArray(user.roles)) {
      return user.roles.map(r => String(r).toLowerCase());
    }
    
    return [];
  }, [user]);

  const isAdmin = useMemo(() => {
    return userRoles.includes('admin');
  }, [userRoles]);

  /**
   * Check if the current user has a specific permission.
   */
  const hasPermission = useCallback((permission: Permission): boolean => {
    if (!user) return false;
    
    // Admin has all permissions
    if (isAdmin) return true;
    
    // Check if any of the user's roles have the permission
    return userRoles.some(role => roleHasPermission(role, permission));
  }, [user, userRoles, isAdmin]);

  /**
   * Check if the current user has any of the specified permissions.
   */
  const hasAnyPermission = useCallback((permissions: Permission[]): boolean => {
    if (!user) return false;
    
    // Admin has all permissions
    if (isAdmin) return true;
    
    // Check if any of the user's roles have any of the permissions
    return userRoles.some(role => roleHasAnyPermission(role, permissions));
  }, [user, userRoles, isAdmin]);

  /**
   * Check if the current user can perform a specific operation.
   */
  const canPerform = useCallback((operation: string): boolean => {
    if (!user) return false;
    
    // Admin can perform all operations
    if (isAdmin) return true;
    
    // Check if any of the user's roles can perform the operation
    return userRoles.some(role => canPerformOperation(role, operation));
  }, [user, userRoles, isAdmin]);

  /**
   * Get all permissions for the current user.
   */
  const permissions = useMemo((): Permission[] => {
    if (!user) return [];
    
    // Collect all permissions from all roles
    const allPermissions = new Set<Permission>();
    userRoles.forEach(role => {
      const rolePerms = getRolePermissions(role);
      rolePerms.forEach(perm => allPermissions.add(perm));
    });
    
    return Array.from(allPermissions);
  }, [user, userRoles]);

  /**
   * Check if the user can terminate an employee.
   */
  const canTerminateEmployee = useCallback((): boolean => {
    return hasPermission('termination:create');
  }, [hasPermission]);

  /**
   * Check if the user can view resigned employees.
   */
  const canViewResignedEmployees = useCallback((): boolean => {
    return hasPermission('termination:view');
  }, [hasPermission]);

  /**
   * Check if the user can rehire an employee.
   */
  const canRehireEmployee = useCallback((): boolean => {
    return hasPermission('rehire:process');
  }, [hasPermission]);

  /**
   * Check if the user can process financial settlements.
   */
  const canProcessSettlement = useCallback((): boolean => {
    return hasPermission('settlement:process');
  }, [hasPermission]);

  /**
   * Check if the user can view financial settlements.
   */
  const canViewSettlement = useCallback((): boolean => {
    return hasPermission('settlement:view');
  }, [hasPermission]);

  /**
   * Check if the user can export resigned employees list.
   */
  const canExportResignedList = useCallback((): boolean => {
    return hasPermission('export:resigned');
  }, [hasPermission]);

  /**
   * Check if the user can view audit logs.
   */
  const canViewAuditLogs = useCallback((): boolean => {
    return hasPermission('audit:view');
  }, [hasPermission]);

  return {
    user,
    userRoles,
    isAdmin,
    permissions,
    hasPermission,
    hasAnyPermission,
    canPerform,
    // Specific operation checks
    canTerminateEmployee,
    canViewResignedEmployees,
    canRehireEmployee,
    canProcessSettlement,
    canViewSettlement,
    canExportResignedList,
    canViewAuditLogs,
  };
}

/**
 * Hook to require specific permissions for a component.
 * Throws an error or returns false if permissions are not met.
 */
export function useRequiredPermission(permission: Permission): boolean {
  const { hasPermission } = usePermissions();
  return hasPermission(permission);
}

/**
 * Hook to require any of the specified permissions.
 */
export function useRequiredPermissions(permissions: Permission[]): boolean {
  const { hasAnyPermission } = usePermissions();
  return hasAnyPermission(permissions);
}