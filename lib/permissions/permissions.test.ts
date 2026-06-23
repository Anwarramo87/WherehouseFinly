/**
 * Unit Tests for Permission-Based Access Control System
 * 
 * Tests that the permission types match backend permission strings
 * and that the permission checking logic works correctly.
 */

import {
  isPermission,
  type Permission,
} from "./types";

describe("Permission Types", () => {
  describe("isPermission type guard", () => {
    it("should return true for valid backend permission strings", () => {
      // Backend permission strings from @Permissions decorators
      expect(isPermission("view_employees")).toBe(true);
      expect(isPermission("edit_employees")).toBe(true);
      expect(isPermission("delete_employees")).toBe(true);
      expect(isPermission("view_attendance")).toBe(true);
      expect(isPermission("view_payroll")).toBe(true);
      expect(isPermission("manage_salary")).toBe(true);
      expect(isPermission("view_inventory")).toBe(true);
      expect(isPermission("manage_advances")).toBe(true);
      expect(isPermission("manage_bonuses")).toBe(true);
    });

    it("should return false for old colon-namespaced permissions", () => {
      // Old format from the previous role-based system (no longer used)
      expect(isPermission("termination:create")).toBe(false);
      expect(isPermission("rehire:process")).toBe(false);
      expect(isPermission("settlement:view")).toBe(false);
      expect(isPermission("employee:view")).toBe(false);
    });

    it("should return false for invalid/unknown permission strings", () => {
      expect(isPermission("invalid_permission")).toBe(false);
      expect(isPermission("")).toBe(false);
      expect(isPermission("admin")).toBe(false);
      expect(isPermission("staff")).toBe(false);
    });
  });

  describe("Backend permission strings", () => {
    it("should include all employee management permissions", () => {
      const permissions: Permission[] = [
        "view_employees",
        "edit_employees",
        "delete_employees",
      ];
      permissions.forEach(p => expect(isPermission(p)).toBe(true));
    });

    it("should include all attendance permissions", () => {
      const permissions: Permission[] = [
        "view_attendance",
        "edit_attendance",
      ];
      permissions.forEach(p => expect(isPermission(p)).toBe(true));
    });

    it("should include all payroll permissions", () => {
      const permissions: Permission[] = [
        "view_payroll",
        "run_payroll",
        "approve_payroll",
        "delete_payroll",
      ];
      permissions.forEach(p => expect(isPermission(p)).toBe(true));
    });

    it("should include all financial permissions", () => {
      const permissions: Permission[] = [
        "manage_advances",
        "manage_bonuses",
        "manage_penalties",
        "manage_insurance",
        "manage_salary",
      ];
      permissions.forEach(p => expect(isPermission(p)).toBe(true));
    });

    it("should include all admin permissions", () => {
      const permissions: Permission[] = [
        "manage_users",
        "manage_roles",
        "manage_trash",
        "manage_backups",
      ];
      permissions.forEach(p => expect(isPermission(p)).toBe(true));
    });
  });
});