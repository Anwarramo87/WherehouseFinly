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
  "/payroll",
  "/advances",
  "/bonuses",
  // The WMS screens, added later than the list itself.
  "/purchasing",
  "/sales",
  "/fulfillment",
  "/wms",
  "/trash",
  "/admin",
];

export const ROUTE_PERMISSION_MAP: Record<string, string[]> = {
  // Backend permissions extracted from @Permissions decorators in backend controllers
  // Source: werehouse/backend-nest/src/*/[controller].ts
  //
  // A route missing from this map is reachable by anyone with a session. The
  // API still refuses the data, so the page renders empty rather than leaking
  // anything — but showing someone a screen they cannot use is its own bug, so
  // every screen belongs here.
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
  // WMS screens. Batches, locations, QC and counting all sit under /inventory
  // and gate on view_inventory above, matching their controllers.
  "/purchasing": ["view_purchasing"],
  "/sales": ["view_sales"],
  "/fulfillment": ["view_sales"],
  "/wms": ["view_inventory", "view_purchasing"],
  "/trash": ["manage_trash"],
  // Super-admin only. No permission grants this: the middleware checks the role
  // directly, and the API is guarded by SuperAdminGuard rather than by a
  // permission that a factory admin's role could be edited to include.
  "/admin": ["__superadmin_only__"],
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

