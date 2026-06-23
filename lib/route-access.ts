const normalizePathname = (pathname: string) => {
  const trimmed = pathname.replace(/\/+$/, "");
  return trimmed || "/";
};

const matchesRoutePrefix = (pathname: string, routePrefix: string) => {
  const normalizedPath = normalizePathname(pathname);
  const normalizedPrefix = normalizePathname(routePrefix);

  return (
    normalizedPath === normalizedPrefix ||
    normalizedPath.startsWith(`${normalizedPrefix}/`)
  );
};

export const PROTECTED_ROUTE_PREFIXES = [
  "/dashboard",
  "/home",
  "/employees",
  "/resigned",
  "/attendance",
  "/salaries",
  "/finances",
  "/vouchers",
  "/inventory",
  "/Transportation",
  "/importData",
  "/settings",
  "/biometric",
  "/payroll",
  "/advances",
  "/bonuses",
];

export const ROUTE_PERMISSION_MAP: Record<string, string[]> = {
  // Backend permissions extracted from @Permissions decorators in backend controllers
  // Source: werehouse/backend-nest/src/*/[controller].ts
  "/employees": ["view_employees"],
  "/resigned": ["view_employees"],
  "/attendance": ["view_attendance"],
  "/salaries": ["manage_salary"],
  "/inventory": ["view_inventory"],
  "/Transportation": ["view_employees"],
  "/importData": ["run_imports"],
  "/settings": ["manage_users"], // Admin-only settings
  "/payroll": ["view_payroll"],
  "/finances": ["view_payroll"],
  "/vouchers": ["view_payroll"],
  "/advances": ["manage_advances"],
  "/bonuses": ["manage_bonuses"],
  "/biometric": ["view_attendance"],
};

export const isProtectedRoute = (pathname: string) =>
  PROTECTED_ROUTE_PREFIXES.some((routePrefix) =>
    matchesRoutePrefix(pathname, routePrefix),
  );

export const getRequiredPermissionsForPath = (pathname: string): string[] | null => {
  const normalizedPath = normalizePathname(pathname);
  const sortedRouteKeys = Object.keys(ROUTE_PERMISSION_MAP).sort((a, b) => b.length - a.length);

  for (const routeKey of sortedRouteKeys) {
    if (matchesRoutePrefix(normalizedPath, routeKey)) {
      return ROUTE_PERMISSION_MAP[routeKey];
    }
  }

  return null;
};

export const hasAnyRequiredPermission = (userPermissions: string[], requiredPermissions: string[]) => {
  return requiredPermissions.some((permission) =>
    userPermissions.includes(permission),
  );
};

