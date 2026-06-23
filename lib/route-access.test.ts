import {
  getRequiredPermissionsForPath,
  hasAnyRequiredPermission,
  isProtectedRoute,
} from "@/lib/route-access";

describe("route-access", () => {
  it("detects protected routes with trailing slash", () => {
    expect(isProtectedRoute("/home/")).toBe(true);
    expect(isProtectedRoute("/employees/team")).toBe(true);
    expect(isProtectedRoute("/public")).toBe(false);
  });

  it("resolves required permissions using prefix matching", () => {
    expect(getRequiredPermissionsForPath("/settings")).toEqual(["manage_users"]);
    expect(getRequiredPermissionsForPath("/inventory/stock")).toEqual([
      "view_inventory",
    ]);
    expect(getRequiredPermissionsForPath("/payroll/2026-06")).toEqual([
      "view_payroll",
    ]);
  });

  it("matches permissions exactly (case-sensitive)", () => {
    expect(
      hasAnyRequiredPermission(["view_employees", "view_attendance"], [
        "view_employees",
      ])
    ).toBe(true);
    expect(
      hasAnyRequiredPermission(["view_employees"], [
        "view_payroll",
        "manage_salary",
      ])
    ).toBe(false);
  });

  it("staff user with minimal permissions cannot access restricted routes", () => {
    const staffPermissions = ["view_employees", "view_attendance"];
    const salariesRequired = getRequiredPermissionsForPath("/salaries") || [];
    expect(
      hasAnyRequiredPermission(staffPermissions, salariesRequired)
    ).toBe(false);
  });

  it("hasAnyRequiredPermission has no built-in admin bypass (bypass lives in proxy.ts)", () => {
    expect(hasAnyRequiredPermission([], ["view_payroll"])).toBe(false);
  });
});

