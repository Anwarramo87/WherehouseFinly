/**
 * usePermissions Hook Tests
 *
 * Tests for the client-side permission checking hook.
 * Aligned to the current API in lib/permissions/hooks.ts:
 *   - userRole (string | null, singular)
 *   - isAdmin, permissions, hasPermission, hasAnyPermission
 *   - canTerminateEmployee, canRehireEmployee, canProcessSettlement,
 *     canViewResignedEmployees, canViewSettlement, canExportResignedList
 */

import { describe, it, expect, beforeEach, vi, type Mock } from "vitest";
import { renderHook } from "@testing-library/react";
import { usePermissions } from "@/lib/permissions/hooks";
import { useAuthStore } from "@/stores/auth-store";

// Mock the auth store
vi.mock("@/stores/auth-store", () => ({
  useAuthStore: vi.fn(),
}));

describe("usePermissions Hook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ---------------------------------------------------------------------------
  // Unauthenticated
  // ---------------------------------------------------------------------------
  describe("when user is not authenticated", () => {
    beforeEach(() => {
      (useAuthStore as unknown as Mock).mockReturnValue({ user: null });
    });

    it("should return null user and no role", () => {
      const { result } = renderHook(() => usePermissions());

      expect(result.current.user).toBeNull();
      expect(result.current.userRole).toBeNull();
      expect(result.current.isAdmin).toBe(false);
      expect(result.current.permissions).toEqual([]);
    });

    it("should deny all specific permission checks", () => {
      const { result } = renderHook(() => usePermissions());

      expect(result.current.canTerminateEmployee()).toBe(false);
      expect(result.current.canRehireEmployee()).toBe(false);
      expect(result.current.canProcessSettlement()).toBe(false);
      expect(result.current.canViewResignedEmployees()).toBe(false);
      expect(result.current.canViewSettlement()).toBe(false);
      expect(result.current.canExportResignedList()).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // Admin — role-based bypass (no explicit permissions array needed)
  // ---------------------------------------------------------------------------
  describe("when user is authenticated as admin", () => {
    beforeEach(() => {
      (useAuthStore as unknown as Mock).mockReturnValue({
        user: { id: "1", name: "Admin", role: "admin" },
      });
    });

    it("should identify user as admin with correct role", () => {
      const { result } = renderHook(() => usePermissions());

      expect(result.current.isAdmin).toBe(true);
      expect(result.current.userRole).toBe("admin");
    });

    it("should grant all permission checks via admin bypass", () => {
      const { result } = renderHook(() => usePermissions());

      expect(result.current.canTerminateEmployee()).toBe(true);
      expect(result.current.canRehireEmployee()).toBe(true);
      expect(result.current.canProcessSettlement()).toBe(true);
      expect(result.current.canViewResignedEmployees()).toBe(true);
      expect(result.current.canViewSettlement()).toBe(true);
      expect(result.current.canExportResignedList()).toBe(true);
    });

    it("should return true for hasPermission on any valid permission", () => {
      const { result } = renderHook(() => usePermissions());

      expect(result.current.hasPermission("edit_employees")).toBe(true);
      expect(result.current.hasPermission("approve_payroll")).toBe(true);
      expect(result.current.hasPermission("manage_backups")).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // Non-admin with explicit permissions array (staff / scoped user)
  // ---------------------------------------------------------------------------
  describe("when user is staff with edit_employees permission", () => {
    beforeEach(() => {
      (useAuthStore as unknown as Mock).mockReturnValue({
        user: {
          id: "2",
          name: "Staff",
          role: "staff",
          permissions: ["view_employees", "edit_employees"],
        },
      });
    });

    it("should not be admin", () => {
      const { result } = renderHook(() => usePermissions());

      expect(result.current.isAdmin).toBe(false);
      expect(result.current.userRole).toBe("staff");
    });

    it("should allow canTerminateEmployee and canRehireEmployee (require edit_employees)", () => {
      const { result } = renderHook(() => usePermissions());

      expect(result.current.canTerminateEmployee()).toBe(true);
      expect(result.current.canRehireEmployee()).toBe(true);
      expect(result.current.canViewResignedEmployees()).toBe(true);
      expect(result.current.canExportResignedList()).toBe(true);
    });

    it("should deny canProcessSettlement (requires approve_payroll)", () => {
      const { result } = renderHook(() => usePermissions());

      expect(result.current.canProcessSettlement()).toBe(false);
    });
  });

  describe("when user is staff with payroll permissions only", () => {
    beforeEach(() => {
      (useAuthStore as unknown as Mock).mockReturnValue({
        user: {
          id: "3",
          name: "Payroll Staff",
          role: "staff",
          permissions: ["view_payroll", "approve_payroll"],
        },
      });
    });

    it("should allow settlement-related checks", () => {
      const { result } = renderHook(() => usePermissions());

      expect(result.current.canProcessSettlement()).toBe(true);
      expect(result.current.canViewSettlement()).toBe(true);
    });

    it("should deny employee-management checks", () => {
      const { result } = renderHook(() => usePermissions());

      expect(result.current.canTerminateEmployee()).toBe(false);
      expect(result.current.canRehireEmployee()).toBe(false);
    });
  });

  describe("when user has no permissions array", () => {
    beforeEach(() => {
      (useAuthStore as unknown as Mock).mockReturnValue({
        user: { id: "4", name: "Limited", role: "staff" },
      });
    });

    it("should deny all specific permission checks gracefully", () => {
      const { result } = renderHook(() => usePermissions());

      expect(result.current.canTerminateEmployee()).toBe(false);
      expect(result.current.canProcessSettlement()).toBe(false);
      expect(result.current.canViewResignedEmployees()).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // hasPermission
  // ---------------------------------------------------------------------------
  describe("hasPermission", () => {
    it("should return true when user has the exact permission", () => {
      (useAuthStore as unknown as Mock).mockReturnValue({
        user: { id: "5", role: "staff", permissions: ["edit_employees"] },
      });
      const { result } = renderHook(() => usePermissions());

      expect(result.current.hasPermission("edit_employees")).toBe(true);
    });

    it("should return false when user does not have the permission", () => {
      (useAuthStore as unknown as Mock).mockReturnValue({
        user: { id: "5", role: "staff", permissions: ["view_employees"] },
      });
      const { result } = renderHook(() => usePermissions());

      expect(result.current.hasPermission("approve_payroll")).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // hasAnyPermission
  // ---------------------------------------------------------------------------
  describe("hasAnyPermission", () => {
    it("should return true when user has at least one of the permissions", () => {
      (useAuthStore as unknown as Mock).mockReturnValue({
        user: { id: "6", role: "staff", permissions: ["edit_employees"] },
      });
      const { result } = renderHook(() => usePermissions());

      expect(result.current.hasAnyPermission(["edit_employees", "approve_payroll"])).toBe(true);
    });

    it("should return false when user has none of the permissions", () => {
      (useAuthStore as unknown as Mock).mockReturnValue({
        user: { id: "6", role: "staff", permissions: ["view_inventory"] },
      });
      const { result } = renderHook(() => usePermissions());

      expect(result.current.hasAnyPermission(["edit_employees", "approve_payroll"])).toBe(false);
    });

    it("should return false for unauthenticated user", () => {
      (useAuthStore as unknown as Mock).mockReturnValue({ user: null });
      const { result } = renderHook(() => usePermissions());

      expect(result.current.hasAnyPermission(["view_employees"])).toBe(false);
    });
  });
});
