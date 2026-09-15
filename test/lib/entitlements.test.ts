import { describe, expect, it } from "vitest";
import { isRouteEnabled, type EntitlementsResponse } from "@/lib/entitlements";

const build = (overrides: Partial<EntitlementsResponse> = {}): EntitlementsResponse => ({
  tenantId: "t1",
  enabledPages: [],
  alwaysAvailable: ["/home", "/login", "/clear-cache"],
  modules: [
    {
      key: "inventory",
      label: "المخزن",
      description: "",
      state: "partial",
      pages: [
        { key: "inventory.products", route: "/inventory", label: "الأصناف", enabled: true },
        {
          key: "inventory.batches",
          route: "/inventory/batches",
          label: "الدفعات",
          enabled: false,
        },
      ],
    },
    {
      key: "hr",
      label: "الموارد البشرية",
      description: "",
      state: "all",
      pages: [
        { key: "hr.employees", route: "/employees", label: "الموظفون", enabled: true },
      ],
    },
  ],
  ...overrides,
});

describe("isRouteEnabled", () => {
  it("allows a page the factory holds", () => {
    expect(isRouteEnabled("/employees", build())).toBe(true);
  });

  it("refuses a page it does not", () => {
    expect(isRouteEnabled("/inventory/batches", build())).toBe(false);
  });

  it("judges a sub-page on its own entitlement, not its parent's", () => {
    // /inventory is enabled and /inventory/batches is not; the longer route wins.
    const entitlements = build();
    expect(isRouteEnabled("/inventory", entitlements)).toBe(true);
    expect(isRouteEnabled("/inventory/batches", entitlements)).toBe(false);
  });

  it("applies a page's verdict to routes nested beneath it", () => {
    expect(isRouteEnabled("/inventory/batches/BATCH-1", build())).toBe(false);
    expect(isRouteEnabled("/employees/EMP001", build())).toBe(true);
  });

  it("ignores a trailing slash", () => {
    expect(isRouteEnabled("/inventory/batches/", build())).toBe(false);
  });

  it("never gates the routes a refused user is sent to", () => {
    // /home is the redirect target for a forbidden page. Gating it would make a
    // misconfigured factory unreachable rather than merely limited.
    for (const route of ["/home", "/login", "/clear-cache"]) {
      expect(isRouteEnabled(route, build())).toBe(true);
    }
  });

  it("allows routes the catalogue does not describe", () => {
    // Not every screen is a sellable page; an unknown route is not a locked one.
    expect(isRouteEnabled("/some/new/screen", build())).toBe(true);
  });

  it("allows everything while entitlements are still loading", () => {
    // Avoids a flash of "forbidden" on every cold load. The API still refuses.
    expect(isRouteEnabled("/inventory/batches", null)).toBe(true);
    expect(isRouteEnabled("/inventory/batches", undefined)).toBe(true);
  });
});
