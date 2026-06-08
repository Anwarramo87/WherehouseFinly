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

export const ROUTE_ROLE_MAP: Record<string, string[]> = {
  "/employees": ["admin", "hr", "manager"],
  "/resigned": ["admin", "hr", "manager"],
  "/attendance": ["admin", "hr", "manager"],
  "/salaries": ["admin", "finance", "manager"],
  "/inventory": ["admin", "warehouse", "manager"],
  "/Transportation": ["admin", "warehouse", "manager"],
  "/importData": ["admin", "manager"],
  "/settings": ["admin"],
  "/payroll": ["admin", "finance", "manager"],
  "/finances": ["admin", "finance", "manager"],
  "/vouchers": ["admin", "finance", "manager"],
  "/advances": ["admin", "finance", "manager"],
  "/bonuses": ["admin", "finance", "manager"],
};

export const isProtectedRoute = (pathname: string) =>
  PROTECTED_ROUTE_PREFIXES.some((routePrefix) =>
    matchesRoutePrefix(pathname, routePrefix),
  );

export const getRequiredRolesForPath = (pathname: string): string[] | null => {
  const normalizedPath = normalizePathname(pathname);
  const sortedRouteKeys = Object.keys(ROUTE_ROLE_MAP).sort((a, b) => b.length - a.length);

  for (const routeKey of sortedRouteKeys) {
    if (matchesRoutePrefix(normalizedPath, routeKey)) {
      return ROUTE_ROLE_MAP[routeKey];
    }
  }

  return null;
};

export const hasAnyRequiredRole = (userRoles: string[], requiredRoles: string[]) => {
  const normalizedUserRoles = userRoles.map((role) => role.trim().toLowerCase());
  return requiredRoles.some((role) => normalizedUserRoles.includes(role.toLowerCase()));
};

