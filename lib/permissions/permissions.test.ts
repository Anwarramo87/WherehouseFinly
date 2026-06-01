/**
 * Unit Tests for Role-Based Access Control (RBAC) System
 * 
 * Tests the permission types, role permissions, and helper functions
 * for the employee resignation management system.
 */

import {
  ROLE_PERMISSIONS,
  OPERATION_PERMISSIONS,
  roleHasPermission,
  roleHasAnyPermission,
  canPerformOperation,
  getRolePermissions,
  getOperationPermissions,
  isPermission,
  isRole,
  type Permission,
} from "./types";

describe("Permission Types", () => {
  describe("isPermission", () => {
    it("should return true for valid permissions", () => {
      expect(isPermission("termination:create")).toBe(true);
      expect(isPermission("rehire:process")).toBe(true);
      expect(isPermission("settlement:view")).toBe(true);
      expect(isPermission("export:resigned")).toBe(true);
    });

    it("should return false for invalid permissions", () => {
      expect(isPermission("invalid:permission")).toBe(false);
      expect(isPermission("")).toBe(false);
      expect(isPermission("admin")).toBe(false);
    });
  });

  describe("isRole", () => {
    it("should return true for valid roles", () => {
      expect(isRole("admin")).toBe(true);
      expect(isRole("hr_manager")).toBe(true);
      expect(isRole("accountant")).toBe(true);
      expect(isRole("manager")).toBe(true);
    });

    it("should return false for invalid roles", () => {
      expect(isRole("superuser")).toBe(false);
      expect(isRole("")).toBe(false);
      expect(isRole("hr manager")).toBe(false);
    });
  });
});

describe("Role Permissions", () => {
  describe("Admin Role", () => {
    const adminRole = ROLE_PERMISSIONS.admin;

    it("should have all termination permissions", () => {
      expect(adminRole["termination:view"]).toBe(true);
      expect(adminRole["termination:create"]).toBe(true);
      expect(adminRole["termination:process"]).toBe(true);
    });

    it("should have all rehire permissions", () => {
      expect(adminRole["rehire:view"]).toBe(true);
      expect(adminRole["rehire:process"]).toBe(true);
    });

    it("should have all settlement permissions", () => {
      expect(adminRole["settlement:view"]).toBe(true);
      expect(adminRole["settlement:process"]).toBe(true);
    });

    it("should have all export permissions", () => {
      expect(adminRole["export:resigned"]).toBe(true);
      expect(adminRole["export:payroll"]).toBe(true);
    });
  });

  describe("HR Manager Role", () => {
    const hrManagerRole = ROLE_PERMISSIONS.hr_manager;

    it("should have termination permissions", () => {
      expect(hrManagerRole["termination:view"]).toBe(true);
      expect(hrManagerRole["termination:create"]).toBe(true);
      expect(hrManagerRole["termination:process"]).toBe(true);
    });

    it("should have rehire permissions", () => {
      expect(hrManagerRole["rehire:view"]).toBe(true);
      expect(hrManagerRole["rehire:process"]).toBe(true);
    });

    it("should have settlement view permission but not process", () => {
      expect(hrManagerRole["settlement:view"]).toBe(true);
      expect(hrManagerRole["settlement:process"]).toBeUndefined();
    });

    it("should have export permissions", () => {
      expect(hrManagerRole["export:resigned"]).toBe(true);
      expect(hrManagerRole["export:payroll"]).toBeUndefined();
    });
  });

  describe("Accountant Role", () => {
    const accountantRole = ROLE_PERMISSIONS.accountant;

    it("should have settlement permissions", () => {
      expect(accountantRole["settlement:view"]).toBe(true);
      expect(accountantRole["settlement:process"]).toBe(true);
    });

    it("should have termination view permission but not create", () => {
      expect(accountantRole["termination:view"]).toBe(true);
      expect(accountantRole["termination:create"]).toBeUndefined();
    });

    it("should have rehire view permission but not process", () => {
      expect(accountantRole["rehire:view"]).toBe(true);
      expect(accountantRole["rehire:process"]).toBeUndefined();
    });

    it("should have payroll export permission", () => {
      expect(accountantRole["export:payroll"]).toBe(true);
      expect(accountantRole["export:resigned"]).toBeUndefined();
    });
  });

  describe("Manager Role", () => {
    const managerRole = ROLE_PERMISSIONS.manager;

    it("should have termination create permission", () => {
      expect(managerRole["termination:create"]).toBe(true);
    });

    it("should have view permissions for all areas", () => {
      expect(managerRole["termination:view"]).toBe(true);
      expect(managerRole["rehire:view"]).toBe(true);
      expect(managerRole["settlement:view"]).toBe(true);
    });

    it("should not have process permissions", () => {
      expect(managerRole["termination:process"]).toBeUndefined();
      expect(managerRole["rehire:process"]).toBeUndefined();
      expect(managerRole["settlement:process"]).toBeUndefined();
    });
  });

  describe("Employee Role", () => {
    const employeeRole = ROLE_PERMISSIONS.employee;

    it("should only have employee view permission", () => {
      expect(employeeRole["employee:view"]).toBe(true);
    });

    it("should not have any termination, rehire, or settlement permissions", () => {
      expect(employeeRole["termination:view"]).toBeUndefined();
      expect(employeeRole["termination:create"]).toBeUndefined();
      expect(employeeRole["rehire:view"]).toBeUndefined();
      expect(employeeRole["rehire:process"]).toBeUndefined();
      expect(employeeRole["settlement:view"]).toBeUndefined();
      expect(employeeRole["settlement:process"]).toBeUndefined();
    });
  });
});

describe("Helper Functions", () => {
  describe("roleHasPermission", () => {
    it("should return true when role has permission", () => {
      expect(roleHasPermission("admin", "termination:create")).toBe(true);
      expect(roleHasPermission("hr_manager", "termination:create")).toBe(true);
      expect(roleHasPermission("accountant", "settlement:process")).toBe(true);
    });

    it("should return false when role does not have permission", () => {
      expect(roleHasPermission("employee", "termination:create")).toBe(false);
      expect(roleHasPermission("accountant", "rehire:process")).toBe(false);
      expect(roleHasPermission("manager", "settlement:process")).toBe(false);
    });

    it("should return false for unknown role", () => {
      expect(roleHasPermission("unknown_role", "termination:create")).toBe(false);
    });
  });

  describe("roleHasAnyPermission", () => {
    it("should return true when role has any of the permissions", () => {
      expect(roleHasAnyPermission("admin", ["termination:create", "settlement:process"])).toBe(true);
      expect(roleHasAnyPermission("hr_manager", ["termination:create", "settlement:process"])).toBe(true);
    });

    it("should return false when role has none of the permissions", () => {
      expect(roleHasAnyPermission("employee", ["termination:create", "settlement:process"])).toBe(false);
      expect(roleHasAnyPermission("supervisor", ["termination:create", "rehire:process"])).toBe(false);
    });
  });

  describe("canPerformOperation", () => {
    it("should return true when role can perform operation", () => {
      expect(canPerformOperation("admin", "terminate_employee")).toBe(true);
      expect(canPerformOperation("hr_manager", "rehire_employee")).toBe(true);
      expect(canPerformOperation("accountant", "process_financial_settlement")).toBe(true);
    });

    it("should return false when role cannot perform operation", () => {
      expect(canPerformOperation("employee", "terminate_employee")).toBe(false);
      expect(canPerformOperation("supervisor", "process_financial_settlement")).toBe(false);
    });

    it("should return false for unknown operation", () => {
      expect(canPerformOperation("admin", "unknown_operation")).toBe(false);
    });
  });

  describe("getRolePermissions", () => {
    it("should return all permissions for admin role", () => {
      const permissions = getRolePermissions("admin");
      expect(permissions).toContain("termination:create");
      expect(permissions).toContain("rehire:process");
      expect(permissions).toContain("settlement:process");
      expect(permissions).toContain("export:resigned");
    });

    it("should return limited permissions for employee role", () => {
      const permissions = getRolePermissions("employee");
      expect(permissions).toContain("employee:view");
      expect(permissions).not.toContain("termination:create");
    });

    it("should return empty array for unknown role", () => {
      const permissions = getRolePermissions("unknown_role");
      expect(permissions).toEqual([]);
    });
  });

  describe("getOperationPermissions", () => {
    it("should return required permissions for terminate_employee operation", () => {
      const permissions = getOperationPermissions("terminate_employee");
      expect(permissions).toContain("termination:create");
      expect(permissions.length).toBe(1);
    });

    it("should return required permissions for process_financial_settlement operation", () => {
      const permissions = getOperationPermissions("process_financial_settlement");
      expect(permissions).toContain("settlement:process");
      expect(permissions.length).toBe(1);
    });

    it("should return empty array for unknown operation", () => {
      const permissions = getOperationPermissions("unknown_operation");
      expect(permissions).toEqual([]);
    });
  });
});

describe("Operation Permissions", () => {
  describe("terminate_employee operation", () => {
    const operation = OPERATION_PERMISSIONS.find(o => o.operation === "terminate_employee");

    it("should be defined", () => {
      expect(operation).toBeDefined();
    });

    it("should require termination:create permission", () => {
      expect(operation?.requiredPermissions).toContain("termination:create");
    });

    it("should have Arabic description", () => {
      expect(operation?.description).toContain("إنهاء خدمة موظف");
    });
  });

  describe("rehire_employee operation", () => {
    const operation = OPERATION_PERMISSIONS.find(o => o.operation === "rehire_employee");

    it("should be defined", () => {
      expect(operation).toBeDefined();
    });

    it("should require rehire:process permission", () => {
      expect(operation?.requiredPermissions).toContain("rehire:process");
    });
  });

  describe("process_financial_settlement operation", () => {
    const operation = OPERATION_PERMISSIONS.find(o => o.operation === "process_financial_settlement");

    it("should be defined", () => {
      expect(operation).toBeDefined();
    });

    it("should require settlement:process permission", () => {
      expect(operation?.requiredPermissions).toContain("settlement:process");
    });
  });

  describe("export_resigned_list operation", () => {
    const operation = OPERATION_PERMISSIONS.find(o => o.operation === "export_resigned_list");

    it("should be defined", () => {
      expect(operation).toBeDefined();
    });

    it("should require export:resigned permission", () => {
      expect(operation?.requiredPermissions).toContain("export:resigned");
    });
  });
});

describe("Permission Matrix Consistency", () => {
  it("should have all roles defined", () => {
    const expectedRoles = ["admin", "hr_manager", "accountant", "manager", "supervisor", "employee"];
    expectedRoles.forEach(role => {
      expect(ROLE_PERMISSIONS[role]).toBeDefined();
    });
  });

  it("should have all operations defined", () => {
    const expectedOperations = [
      "terminate_employee",
      "view_resigned_employees",
      "rehire_employee",
      "process_financial_settlement",
      "view_financial_settlement",
      "export_resigned_list",
      "view_audit_logs",
    ];
    expectedOperations.forEach(operation => {
      expect(OPERATION_PERMISSIONS.find(o => o.operation === operation)).toBeDefined();
    });
  });

  it("admin should have all permissions", () => {
    const allPermissions: Permission[] = [
      "employee:view", "employee:create", "employee:edit", "employee:delete",
      "termination:view", "termination:create", "termination:process",
      "rehire:view", "rehire:process",
      "settlement:view", "settlement:process",
      "export:resigned", "export:payroll",
      "audit:view", "reports:view", "reports:generate",
    ];

    allPermissions.forEach(permission => {
      expect(ROLE_PERMISSIONS.admin[permission]).toBe(true);
    });
  });
});