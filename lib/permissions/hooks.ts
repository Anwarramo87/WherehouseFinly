"use client";

import { useCallback, useMemo } from "react";
import { useAuthStore } from "@/stores/auth-store";
import type { Permission } from "./types";
import { isPermission } from "./types";

/**
 * Hook to check permissions for the current user.
 * Permissions come from the backend's /auth/me endpoint via the auth store.
 */
export function usePermissions() {
  const { user } = useAuthStore();

  const userRole = useMemo(() => {
    return user?.role ? String(user.role).toLowerCase() : null;
  }, [user]);

  const userPermissions = useMemo(() => {
    return (user?.permissions && Array.isArray(user.permissions)) ? user.permissions : [];
  }, [user]);

  const isAdmin = useMemo(() => {
    return userRole === "admin";
  }, [userRole]);

  /**
   * Check if the current user has a specific permission.
   */
  const hasPermission = useCallback((permission: Permission): boolean => {
    if (!user) return false;
    
    // Admin has all permissions
    if (isAdmin) return true;
    
    // Check if permission is in user's permission list from backend
    return userPermissions.includes(permission);
  }, [user, userPermissions, isAdmin]);

  /**
   * Check if the current user has any of the specified permissions.
   */
  const hasAnyPermission = useCallback((permissions: Permission[]): boolean => {
    if (!user) return false;
    
    // Admin has all permissions
    if (isAdmin) return true;
    
    // Check if any permission is in user's list
    return permissions.some(perm => userPermissions.includes(perm));
  }, [user, userPermissions, isAdmin]);

  /**
   * Get all permissions for the current user.
   */
  const permissions = useMemo((): Permission[] => {
    if (!user) return [];
    return userPermissions.filter(isPermission);
  }, [user, userPermissions]);

  /**
   * Check if the user can view employees (termination-related).
   */
  const canViewResignedEmployees = useCallback((): boolean => {
    return hasPermission("view_employees");
  }, [hasPermission]);

  /**
   * Check if the user can edit employees (termination-related).
   */
  const canTerminateEmployee = useCallback((): boolean => {
    return hasPermission("edit_employees");
  }, [hasPermission]);

  /**
   * Check if the user can process settlements (financial).
   */
  const canProcessSettlement = useCallback((): boolean => {
    return hasPermission("approve_payroll");
  }, [hasPermission]);

  /**
   * Check if the user can view payroll/settlements.
   */
  const canViewSettlement = useCallback((): boolean => {
    return hasPermission("view_payroll");
  }, [hasPermission]);

  /**
   * Check if the user can rehire employees.
   */
  const canRehireEmployee = useCallback((): boolean => {
    return hasPermission("edit_employees");
  }, [hasPermission]);

  /**
   * Check if the user can export payroll/employee lists.
   */
  const canExportResignedList = useCallback((): boolean => {
    return hasPermission("view_employees");
  }, [hasPermission]);

  return {
    user,
    userRole,
    isAdmin,
    permissions,
    hasPermission,
    hasAnyPermission,
    // Specific operation checks
    canViewResignedEmployees,
    canTerminateEmployee,
    canRehireEmployee,
    canProcessSettlement,
    canViewSettlement,
    canExportResignedList,
  };
}

/**
 * Hook to require a specific permission for a component.
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