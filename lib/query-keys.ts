export const queryKeys = {
	employees: {
		all: ["employees"] as const,
		list: () => [...queryKeys.employees.all, "list"] as const,
		stats: () => [...queryKeys.employees.all, "stats"] as const,
	},
	attendance: {
		all: ["attendance"] as const,
		list: (date?: string) => [...queryKeys.attendance.all, "list", date ?? null] as const,
		stats: (startDate?: string, endDate?: string) =>
			[...queryKeys.attendance.all, "stats", startDate ?? null, endDate ?? null] as const,
		alerts: (date?: string) => [...queryKeys.attendance.all, "alerts", date ?? null] as const,
	},
	inventory: {
		all: ["inventory"] as const,
		stats: () => [...queryKeys.inventory.all, "stats"] as const,
	},
	salaries: {
		all: ["salaries"] as const,
		list: () => [...queryKeys.salaries.all, "list"] as const,
	},
} as const;


