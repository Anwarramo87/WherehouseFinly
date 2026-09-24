export const queryKeys = {
  employees: {
    all: ["employees"] as const,
    list: (params?: Record<string, unknown>) =>
      [...queryKeys.employees.all, "list", params] as const,
    stats: () => [...queryKeys.employees.all, "stats"] as const,
    detail: (id: string) => [...queryKeys.employees.all, "detail", id] as const,
  },
  attendance: {
    all: ["attendance"] as const,
    list: (date?: string) => [...queryKeys.attendance.all, "list", date ?? null] as const,
    dailyView: (date?: string) => [...queryKeys.attendance.all, "daily-view", date] as const,
    stats: (startDate?: string, endDate?: string) =>
      [...queryKeys.attendance.all, "stats", startDate ?? null, endDate ?? null] as const,
    alerts: (date?: string) => [...queryKeys.attendance.all, "alerts", date ?? null] as const,
  },
  inventory: {
    all: ["inventory"] as const,
    products: (params?: Record<string, unknown>) =>
      [...queryKeys.inventory.all, "products", params] as const,
    movements: (params?: Record<string, unknown>) =>
      [...queryKeys.inventory.all, "movements", params] as const,
    warehouses: () => [...queryKeys.inventory.all, "warehouses"] as const,
    categories: () => [...queryKeys.inventory.all, "categories"] as const,
    stats: () => [...queryKeys.inventory.all, "stats"] as const,
  },
  salaries: {
    all: ["salaries"] as const,
    list: () => [...queryKeys.salaries.all, "list"] as const,
    detail: (employeeId: string) => [...queryKeys.salaries.all, "detail", employeeId] as const,
  },
  advances: {
    all: ["advances"] as const,
    list: (employeeId?: string, period?: string) =>
      [...queryKeys.advances.all, employeeId ?? "all", period ?? "current"] as const,
  },
  bonuses: {
    all: ["bonuses"] as const,
    list: (employeeId?: string, period?: string) =>
      [...queryKeys.bonuses.all, employeeId ?? "all", period ?? "all-periods"] as const,
  },
  leaves: {
    all: ["leaves"] as const,
    list: (params?: Record<string, unknown>) => [...queryKeys.leaves.all, params] as const,
  },
  buses: {
    all: ["buses"] as const,
    detail: (busId: string) => [...queryKeys.buses.all, "detail", busId] as const,
  },
  discounts: {
    all: ["discounts"] as const,
  },
  departments: {
    all: ["departments"] as const,
  },
  roles: {
    all: ["roles"] as const,
  },
  dashboard: {
    all: ["dashboard"] as const,
    home: () => [...queryKeys.dashboard.all, "home"] as const,
  },
  penalties: {
    all: ["penalties"] as const,
  },
  insurance: {
    all: ["insurance"] as const,
  },
  payroll: {
    all: ["payroll"] as const,
    receipts: (month?: string) => [...queryKeys.payroll.all, "receipts", month ?? null] as const,
  },
  "attendance-deductions": {
    all: ["attendance-deductions"] as const,
    list: (
      periodStart?: string,
      periodEnd?: string,
      gracePeriodMinutes?: number,
      employeeId?: string,
    ) =>
      [
        ...queryKeys["attendance-deductions"].all,
        periodStart ?? null,
        periodEnd ?? null,
        gracePeriodMinutes ?? null,
        employeeId ?? null,
      ] as const,
  },
  notifications: {
    all: ["notifications"] as const,
    list: (params?: Record<string, unknown>) => [...queryKeys.notifications.all, params] as const,
    unreadCount: () => [...queryKeys.notifications.all, "unread-count"] as const,
  },

  // --------------------------------------------------------- WMS extension
  batches: {
    all: ["batches"] as const,
    list: (params?: Record<string, unknown>) => [...queryKeys.batches.all, "list", params] as const,
    detail: (id: string) => [...queryKeys.batches.all, "detail", id] as const,
    label: (id: string) => [...queryKeys.batches.all, "label", id] as const,
  },
  expiry: {
    all: ["expiry"] as const,
    dashboard: (horizonDays?: number) =>
      [...queryKeys.expiry.all, "dashboard", horizonDays ?? null] as const,
    rules: () => [...queryKeys.expiry.all, "rules"] as const,
  },
  pricing: {
    all: ["pricing"] as const,
    taxRates: () => [...queryKeys.pricing.all, "tax-rates"] as const,
    tiers: () => [...queryKeys.pricing.all, "tiers"] as const,
    productPrices: (params?: Record<string, unknown>) =>
      [...queryKeys.pricing.all, "product-prices", params] as const,
  },
  purchasing: {
    all: ["purchasing"] as const,
    suppliers: (params?: Record<string, unknown>) =>
      [...queryKeys.purchasing.all, "suppliers", params] as const,
    orders: (params?: Record<string, unknown>) =>
      [...queryKeys.purchasing.all, "orders", params] as const,
    order: (id: string) => [...queryKeys.purchasing.all, "order", id] as const,
    invoices: (params?: Record<string, unknown>) =>
      [...queryKeys.purchasing.all, "invoices", params] as const,
    invoice: (id: string) => [...queryKeys.purchasing.all, "invoice", id] as const,
  },
  salesDomain: {
    all: ["sales"] as const,
    customers: (params?: Record<string, unknown>) =>
      [...queryKeys.salesDomain.all, "customers", params] as const,
    orders: (params?: Record<string, unknown>) =>
      [...queryKeys.salesDomain.all, "orders", params] as const,
    order: (id: string) => [...queryKeys.salesDomain.all, "order", id] as const,
    invoices: (params?: Record<string, unknown>) =>
      [...queryKeys.salesDomain.all, "invoices", params] as const,
    invoice: (id: string) => [...queryKeys.salesDomain.all, "invoice", id] as const,
    deliveryNotes: (params?: Record<string, unknown>) =>
      [...queryKeys.salesDomain.all, "delivery-notes", params] as const,
  },
  locations: {
    all: ["locations"] as const,
    zones: (warehouseId?: string) =>
      [...queryKeys.locations.all, "zones", warehouseId ?? null] as const,
    bins: (params?: Record<string, unknown>) => [...queryKeys.locations.all, "bins", params] as const,
    occupancy: (warehouseId?: string) =>
      [...queryKeys.locations.all, "occupancy", warehouseId ?? null] as const,
    putaway: (params?: Record<string, unknown>) =>
      [...queryKeys.locations.all, "putaway", params] as const,
  },
  cycleCounts: {
    all: ["cycle-counts"] as const,
    list: (params?: Record<string, unknown>) => [...queryKeys.cycleCounts.all, "list", params] as const,
    detail: (id: string) => [...queryKeys.cycleCounts.all, "detail", id] as const,
    variances: (id: string) => [...queryKeys.cycleCounts.all, "variances", id] as const,
  },
  quality: {
    all: ["quality"] as const,
    list: (params?: Record<string, unknown>) => [...queryKeys.quality.all, "list", params] as const,
    pending: () => [...queryKeys.quality.all, "pending"] as const,
  },
  fulfillment: {
    all: ["fulfillment"] as const,
    pickLists: (params?: Record<string, unknown>) =>
      [...queryKeys.fulfillment.all, "pick-lists", params] as const,
    pickList: (id: string) => [...queryKeys.fulfillment.all, "pick-list", id] as const,
    carriers: () => [...queryKeys.fulfillment.all, "carriers"] as const,
    shipments: (params?: Record<string, unknown>) =>
      [...queryKeys.fulfillment.all, "shipments", params] as const,
    shipment: (id: string) => [...queryKeys.fulfillment.all, "shipment", id] as const,
    performance: (days?: number) =>
      [...queryKeys.fulfillment.all, "performance", days ?? null] as const,
  },
  wmsAnalytics: {
    all: ["wms-analytics"] as const,
    kpis: (days?: number) => [...queryKeys.wmsAnalytics.all, "kpis", days ?? null] as const,
    forecast: (params?: Record<string, unknown>) =>
      [...queryKeys.wmsAnalytics.all, "forecast", params] as const,
    suppliers: (days?: number) =>
      [...queryKeys.wmsAnalytics.all, "suppliers", days ?? null] as const,
  },
  integrations: {
    all: ["integrations"] as const,
    connections: () => [...queryKeys.integrations.all, "connections"] as const,
    connection: (id: string) => [...queryKeys.integrations.all, "connection", id] as const,
    webhooks: () => [...queryKeys.integrations.all, "webhooks"] as const,
  },
  manufacturing: {
    all: ["manufacturing"] as const,
    bom: (sku: string) => [...queryKeys.manufacturing.all, "bom", sku] as const,
    bomHistory: (sku: string) => [...queryKeys.manufacturing.all, "bom-history", sku] as const,
    bomCost: (id: string) => [...queryKeys.manufacturing.all, "bom-cost", id] as const,
    orders: (params?: Record<string, unknown>) =>
      [...queryKeys.manufacturing.all, "orders", params] as const,
    order: (id: string) => [...queryKeys.manufacturing.all, "order", id] as const,
    summary: () => [...queryKeys.manufacturing.all, "summary"] as const,
  },
  representatives: {
    all: ["representatives"] as const,
    list: (params?: Record<string, unknown>) =>
      [...queryKeys.representatives.all, "list", params] as const,
    detail: (repId: string) =>
      [...queryKeys.representatives.all, "detail", repId] as const,
    stock: (repId: string) =>
      [...queryKeys.representatives.all, "stock", repId] as const,
    movements: (repId: string, params?: Record<string, unknown>) =>
      [...queryKeys.representatives.all, "movements", repId, params] as const,
    sales: (repId: string, params?: Record<string, unknown>) =>
      [...queryKeys.representatives.all, "sales", repId, params] as const,
    collections: (repId: string, params?: Record<string, unknown>) =>
      [...queryKeys.representatives.all, "collections", repId, params] as const,
    returns: (repId: string, params?: Record<string, unknown>) =>
      [...queryKeys.representatives.all, "returns", repId, params] as const,
    settlements: (repId: string) =>
      [...queryKeys.representatives.all, "settlements", repId] as const,
    summary: (repId: string) =>
      [...queryKeys.representatives.all, "summary", repId] as const,
    myProfile: () => [...queryKeys.representatives.all, "my-profile"] as const,
  },
  wmsSetup: {
    all: ["wms-setup"] as const,
    state: () => [...queryKeys.wmsSetup.all, "state"] as const,
    completed: () => [...queryKeys.wmsSetup.all, "completed"] as const,
  },
  systemSettings: {
    all: ["system-settings"] as const,
    settings: () => [...queryKeys.systemSettings.all, "settings"] as const,
  },
} as const;
