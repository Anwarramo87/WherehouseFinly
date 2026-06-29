/**
 * usePermissions Hook Tests
 * 
 * Tests for the client-side permission checking hook.
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

  describe("when user is not authenticated", () => {
    beforeEach(() => {
      (useAuthStore as unknown as Mock).mockReturnValue({
        user: null,
        hasAnyRole: () => false,
      });
    });

    it("should return no permissions", () => {
      const { result } = renderHook(() => usePermissions());
      
      expect(result.current.user).toBeNull();
      expect(result.current.userRole).toBeNull();
      expect(result.current.isAdmin).toBe(false);
      expect(result.current.permissions).toEqual([]);
    });

    it("should not have any specific permissions", () => {
      const { result } = renderHook(() => usePermissions());
      
      expect(result.current.canTerminateEmployee()).toBe(false);
      expect(result.current.canRehireEmployee()).toBe(false);
      expect(result.current.canProcessSettlement()).toBe(false);
      expect(result.current.canViewResignedEmployees()).toBe(false);
    });
  });

  describe("when user is authenticated as admin", () => {
    beforeEach(() => {
      (useAuthStore as unknown as Mock).mockReturnValue({
        user: { id: "1", name: "Admin", role: "admin" },
        hasAnyRole: () => true,
      });
    });

    it("should identify user as admin", () => {
      const { result } = renderHook(() => usePermissions());
      
      expect(result.current.isAdmin).toBe(true);
      expect(result.current.userRole).toBe("admin");
    });

    it("should have all permissions", () => {
      const { result } = renderHook(() => usePermissions());
      
      expect(result.current.canTerminateEmployee()).toBe(true);
      expect(result.current.canRehireEmployee()).toBe(true);
      expect(result.current.canProcessSettlement()).toBe(true);
      expect(result.current.canViewResignedEmployees()).toBe(true);
      expect(result.current.canExportResignedList()).toBe(true);
    });
  });

  describe("when user is authenticated as HR manager", () => {
    beforeEach(() => {
      (useAuthStore as unknown as Mock).mockReturnValue({
        user: { id: "2", name: "HR Manager", role: "hr_manager" },
        hasAnyRole: () => true,
      });
    });

    it("should not be admin", () => {
      const { result } = renderHook(() => usePermissions());
      
      expect(result.current.isAdmin).toBe(false);
    });

    it("should have termination and rehire permissions", () => {
      const { result } = renderHook(() => usePermissions());
      
      expect(result.current.canTerminateEmployee()).toBe(true);
      expect(result.current.canRehireEmployee()).toBe(true);
      expect(result.current.canViewResignedEmployees()).toBe(true);
    });

    it("should not have settlement process permission", () => {
      const { result } = renderHook(() => usePermissions());
      
      expect(result.current.canProcessSettlement()).toBe(false);
    });
  });

  describe("when user is authenticated as accountant", () => {
    beforeEach(() => {
      (useAuthStore as unknown as Mock).mockReturnValue({
        user: { id: "3", name: "Accountant", role: "accountant" },
        hasAnyRole: () => true,
      });
    });

    it("should not be admin", () => {
      const { result } = renderHook(() => usePermissions());
      
      expect(result.current.isAdmin).toBe(false);
    });

    it("should have settlement permissions", () => {
      const { result } = renderHook(() => usePermissions());
      
      expect(result.current.canProcessSettlement()).toBe(true);
      expect(result.current.canViewSettlement()).toBe(true);
    });

    it("should not have termination permission", () => {
      const { result } = renderHook(() => usePermissions());
      
      expect(result.current.canTerminateEmployee()).toBe(false);
    });

    it("should not have rehire permission", () => {
      const { result } = renderHook(() => usePermissions());
      
      expect(result.current.canRehireEmployee()).toBe(false);
    });
  });

  describe("when user has multiple roles", () => {
    beforeEach(() => {
      (useAuthStore as unknown as Mock).mockReturnValue({
        user: { id: "4", name: "Multi Role User", roles: ["hr_manager", "accountant"] },
        hasAnyRole: () => true,
      });
    });

    it("should combine permissions from all roles", () => {
      const { result } = renderHook(() => usePermissions());
      
      // HR manager permissions
      expect(result.current.canTerminateEmployee()).toBe(true);
      expect(result.current.canRehireEmployee()).toBe(true);
      
      // Accountant permissions
      expect(result.current.canProcessSettlement()).toBe(true);
    });
  });

  describe("hasPermission function", () => {
    beforeEach(() => {
      (useAuthStore as unknown as Mock).mockReturnValue({
        user: { id: "5", name: "Test User", role: "hr_manager", permissions: ["edit_employees"] },
        hasAnyRole: () => true,
      });
    });

    it("should return true for granted permission", () => {
      const { result } = renderHook(() => usePermissions());
      
      expect(result.current.hasPermission("edit_employees")).toBe(true);
    });

    it("should return false for denied permission", () => {
      const { result } = renderHook(() => usePermissions());
      
      expect(result.current.hasPermission("approve_payroll")).toBe(false);
    });
  });

  describe("hasAnyPermission function", () => {
    beforeEach(() => {
      (useAuthStore as unknown as Mock).mockReturnValue({
        user: { id: "6", name: "Test User", role: "manager", permissions: ["edit_employees"] },
        hasAnyRole: () => true,
      });
    });

    it("should return true when user has any of the permissions", () => {
      const { result } = renderHook(() => usePermissions());
      
      expect(result.current.hasAnyPermission(["edit_employees", "approve_payroll"])).toBe(true);
    });

    it("should return false when user has none of the permissions", () => {
      const { result } = renderHook(() => usePermissions());
      
      expect(result.current.hasAnyPermission(["view_payroll", "approve_payroll"])).toBe(false);
    });
  });

  describe("canPerform function", () => {
    beforeEach(() => {
      (useAuthStore as unknown as Mock).mockReturnValue({
        user: { id: "7", name: "Test User", role: "hr_manager", permissions: ["edit_employees"] },
        hasAnyRole: () => true,
      });
    });

    it("should return true for permitted operation", () => {
      const { result } = renderHook(() => usePermissions());
      
      expect(result.current.canTerminateEmployee()).toBe(true);
      expect(result.current.canRehireEmployee()).toBe(true);
    });

    it("should return false for non-permitted operation", () => {
      const { result } = renderHook(() => usePermissions());
      
      expect(result.current.canProcessSettlement()).toBe(false);
    });
  });
});