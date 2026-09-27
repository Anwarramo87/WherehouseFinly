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

  it("gates the newly saleable pages by their own module keys", () => {
    const entitled = build({
      modules: [
        {
          key: "production",
          label: "الإنتاج والتصنيع",
          description: "",
          state: "all",
          pages: [
            {
              key: "production.orders",
              route: "/wms/production",
              label: "أوامر الإنتاج",
              enabled: true,
            },
            {
              key: "production.bom",
              route: "/wms/production/bom",
              label: "قوائم المواد (BOM)",
              enabled: false,
            },
          ],
        },
      ],
    });

    // Whole page enabled → route (and its children) open.
    expect(isRouteEnabled("/wms/production", entitled)).toBe(true);
    expect(isRouteEnabled("/wms/production/orders/AB-1", entitled)).toBe(true);
    // BOM sold separately and held off → its own route is refused.
    expect(isRouteEnabled("/wms/production/bom", entitled)).toBe(false);
  });

  it("gates the representatives, WMS-setup and files routes like any sellable page", () => {
    const closed = build({
      modules: [
        {
          key: "reps",
          label: "المندوبون",
          description: "",
          state: "none",
          pages: [
            {
              key: "reps.management",
              route: "/representatives",
              label: "إدارة المندوبين",
              enabled: false,
            },
            {
              key: "reps.workspace",
              route: "/representatives/workspace",
              label: "مساحة المندوب",
              enabled: false,
            },
          ],
        },
        {
          key: "wms",
          label: "إعداد WMS",
          description: "",
          state: "none",
          pages: [
            { key: "wms.setup", route: "/wms/setup", label: "إعداد WMS", enabled: false },
          ],
        },
        {
          key: "imports",
          label: "استيراد البيانات",
          description: "",
          state: "partial",
          pages: [
            {
              key: "imports.data",
              route: "/importData",
              label: "استيراد البيانات",
              enabled: true,
            },
            { key: "imports.files", route: "/files", label: "الملفات", enabled: false },
          ],
        },
      ],
    });

    expect(isRouteEnabled("/representatives", closed)).toBe(false);
    expect(isRouteEnabled("/representatives/workspace", closed)).toBe(false);
    expect(isRouteEnabled("/wms/setup", closed)).toBe(false);
    expect(isRouteEnabled("/files", closed)).toBe(false);
    expect(isRouteEnabled("/importData", closed)).toBe(true);
  });
});
