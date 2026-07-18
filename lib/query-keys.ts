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
    stats: () => [...queryKeys.inventory.all, "stats"] as const,
  },
  salaries: {
    all: ["salaries"] as const,
    list: () => [...queryKeys.salaries.all, "list"] as const,
    detail: (employeeId: string) => ["salary", employeeId] as const,
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
    detail: (busId: string) => ["bus", busId] as const,
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
} as const;
