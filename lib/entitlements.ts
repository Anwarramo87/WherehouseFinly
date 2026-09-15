/**
 * What this factory has been sold.
 *
 * The sidebar and the middleware both read from here so the menu and the API
 * agree on one source of truth. The catalogue itself lives on the backend
 * (src/common/entitlements/catalogue.ts) — duplicating it here is exactly the
 * drift this endpoint exists to prevent.
 *
 * Hiding a link is a courtesy, not a control: the API refuses a disabled page
 * regardless, so a stale cache here is a cosmetic problem rather than a hole.
 */

export interface EntitlementPage {
  key: string;
  route: string;
  label: string;
  enabled: boolean;
}

export interface EntitlementModule {
  key: string;
  label: string;
  description: string;
  state: "all" | "none" | "partial";
  pages: EntitlementPage[];
}

export interface EntitlementsResponse {
  tenantId: string | null;
  enabledPages: string[];
  alwaysAvailable: string[];
  modules: EntitlementModule[];
}

const normalise = (route: string) => route.replace(/\/+$/, "") || "/";

/**
 * Whether a route may be opened, given the pages this factory holds.
 *
 * Longest route wins, so `/inventory/batches` is judged on its own entitlement
 * rather than inheriting `/inventory`'s.
 */
export function isRouteEnabled(
  route: string,
  entitlements: EntitlementsResponse | null | undefined,
): boolean {
  // Unknown entitlements means the request has not resolved yet. Allowing the
  // route keeps the UI from flickering into "forbidden" on every cold load;
  // the API is still the thing that decides.
  if (!entitlements) return true;

  const path = normalise(route);

  if (entitlements.alwaysAvailable?.some((r) => normalise(r) === path)) return true;

  let match: EntitlementPage | null = null;
  // Named `group`, not `module`: Next forbids shadowing the CommonJS `module`
  // binding, and the rule fires even on a block-scoped loop variable.
  for (const group of entitlements.modules) {
    for (const page of group.pages) {
      const pageRoute = normalise(page.route);
      if (path === pageRoute || path.startsWith(`${pageRoute}/`)) {
        if (!match || pageRoute.length > normalise(match.route).length) match = page;
      }
    }
  }

  // A route the catalogue does not describe is not a sellable page — /home,
  // /login and anything new that has not been added yet. Not gated.
  return match ? match.enabled : true;
}
