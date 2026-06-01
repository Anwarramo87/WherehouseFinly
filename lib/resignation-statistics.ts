/**
 * ResignationStatisticsService
 *
 * Calculates statistics and generates reports for resigned/terminated employees.
 * Implements business logic for Requirements 10.1, 10.2, 10.3, 10.4
 */

import apiClient from './api-client';
import type { Employee } from '@/types/employee';
import type { ResignedEmployeesStatistics } from '@/types/resignation';

// ============================================================================
// Types and Interfaces
// ============================================================================

/**
 * Statistics broken down by department
 */
export interface DepartmentStatistics {
  department: string;
  total: number;
  resignations: number;
  terminations: number;
  pendingSettlement: number;
  completedSettlement: number;
}

/**
 * Statistics broken down by termination type
 */
export interface TypeStatistics {
  resignations: number;
  terminations: number;
  resignationPercentage: number;
  terminationPercentage: number;
}

/**
 * Monthly report entry for a single month
 */
export interface MonthlyReportEntry {
  /** Month in YYYY-MM format */
  month: string;
  /** Human-readable label (e.g. "مايو 2026") */
  label: string;
  total: number;
  resignations: number;
  terminations: number;
  pendingSettlement: number;
  completedSettlement: number;
}

/**
 * Full monthly resignation report covering a date range
 */
export interface MonthlyResignationReport {
  /** ISO date string for the start of the report period */
  periodStart: string;
  /** ISO date string for the end of the report period */
  periodEnd: string;
  months: MonthlyReportEntry[];
  totals: {
    total: number;
    resignations: number;
    terminations: number;
    pendingSettlement: number;
    completedSettlement: number;
  };
}

/**
 * Comprehensive dashboard statistics for HR management
 */
export interface DashboardStatistics extends ResignedEmployeesStatistics {
  /** Breakdown by department */
  byDepartment: DepartmentStatistics[];
  /** Breakdown by termination type with percentages */
  byType: TypeStatistics;
  /** Monthly trend for the last N months */
  monthlyTrend: MonthlyReportEntry[];
  /** Timestamp when these statistics were calculated */
  calculatedAt: Date;
}

/**
 * Options for generating a monthly report
 */
export interface MonthlyReportOptions {
  /** Number of months to include (default: 12) */
  months?: number;
  /** End month in YYYY-MM format (default: current month) */
  endMonth?: string;
}

/**
 * Error class for statistics service operations
 */
export class ResignationStatisticsError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500
  ) {
    super(message);
    this.name = 'ResignationStatisticsError';
  }
}

// ============================================================================
// Error Codes
// ============================================================================

export const STATISTICS_ERROR_CODES = {
  API_ERROR: 'STATISTICS_API_ERROR',
  INVALID_DATE_RANGE: 'INVALID_DATE_RANGE',
  INVALID_MONTH_FORMAT: 'INVALID_MONTH_FORMAT',
  NO_DATA: 'STATISTICS_NO_DATA',
} as const;

// ============================================================================
// ResignationStatisticsService Class
// ============================================================================

/**
 * Service class for calculating resignation statistics and generating reports.
 *
 * Handles:
 * - Total resigned employees by type and department (Req 10.1, 10.2, 10.3)
 * - Monthly resignation reports (Req 10.4)
 * - Dashboard statistics for HR management (Req 10.1–10.4)
 *
 * All calculation methods are pure functions that accept an employee array so
 * they can be used both client-side (with already-fetched data) and in tests
 * without any network calls.  The `fetch*` methods handle data retrieval.
 */
export class ResignationStatisticsService {
  // ============================================================================
  // Public Calculation Methods (pure – no network calls)
  // ============================================================================

  /**
   * Calculate core statistics from a list of resigned/terminated employees.
   *
   * Counts:
   * - Total resigned employees
   * - Current-month vs previous-months split
   * - Resignations vs terminations
   * - Pending vs completed financial settlements
   *
   * @param employees - Array of resigned/terminated employees
   * @returns ResignedEmployeesStatistics
   *
   * Validates: Requirements 10.1, 10.2
   */
  calculateCoreStatistics(employees: Employee[]): ResignedEmployeesStatistics {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    let currentMonthCount = 0;
    let previousMonthsCount = 0;
    let resignationsCount = 0;
    let terminationsCount = 0;
    let pendingSettlementCount = 0;
    let completedSettlementCount = 0;

    for (const emp of employees) {
      // ── Month split ──────────────────────────────────────────────────────
      if (emp.terminationDate) {
        const termDate = new Date(emp.terminationDate);
        if (
          termDate.getMonth() === currentMonth &&
          termDate.getFullYear() === currentYear
        ) {
          currentMonthCount++;
        } else {
          previousMonthsCount++;
        }
      } else {
        previousMonthsCount++;
      }

      // ── Type split ───────────────────────────────────────────────────────
      if (
        emp.status === 'resigned' ||
        emp.terminationType === 'resignation'
      ) {
        resignationsCount++;
      } else {
        terminationsCount++;
      }

      // ── Financial status split ───────────────────────────────────────────
      if (
        emp.isSettled ||
        emp.isFinanciallySettled ||
        emp.financialSettlementStatus === 'completed'
      ) {
        completedSettlementCount++;
      } else {
        pendingSettlementCount++;
      }
    }

    return {
      currentMonth: currentMonthCount,
      previousMonths: previousMonthsCount,
      resignations: resignationsCount,
      terminations: terminationsCount,
      pendingSettlement: pendingSettlementCount,
      completedSettlement: completedSettlementCount,
      totalResigned: employees.length,
    };
  }

  /**
   * Calculate statistics grouped by department.
   *
   * @param employees - Array of resigned/terminated employees
   * @returns Array of DepartmentStatistics sorted by total (descending)
   *
   * Validates: Requirement 10.3
   */
  calculateDepartmentStatistics(employees: Employee[]): DepartmentStatistics[] {
    const map = new Map<string, DepartmentStatistics>();

    for (const emp of employees) {
      const dept = emp.department || 'غير محدد';

      if (!map.has(dept)) {
        map.set(dept, {
          department: dept,
          total: 0,
          resignations: 0,
          terminations: 0,
          pendingSettlement: 0,
          completedSettlement: 0,
        });
      }

      const entry = map.get(dept)!;
      entry.total++;

      if (emp.status === 'resigned' || emp.terminationType === 'resignation') {
        entry.resignations++;
      } else {
        entry.terminations++;
      }

      if (
        emp.isSettled ||
        emp.isFinanciallySettled ||
        emp.financialSettlementStatus === 'completed'
      ) {
        entry.completedSettlement++;
      } else {
        entry.pendingSettlement++;
      }
    }

    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }

  /**
   * Calculate type statistics with percentages.
   *
   * @param employees - Array of resigned/terminated employees
   * @returns TypeStatistics
   *
   * Validates: Requirement 10.2
   */
  calculateTypeStatistics(employees: Employee[]): TypeStatistics {
    const total = employees.length;
    let resignations = 0;
    let terminations = 0;

    for (const emp of employees) {
      if (emp.status === 'resigned' || emp.terminationType === 'resignation') {
        resignations++;
      } else {
        terminations++;
      }
    }

    return {
      resignations,
      terminations,
      resignationPercentage: total > 0 ? Math.round((resignations / total) * 100) : 0,
      terminationPercentage: total > 0 ? Math.round((terminations / total) * 100) : 0,
    };
  }

  /**
   * Generate a monthly resignation report from a list of employees.
   *
   * Groups employees by their termination month and produces a report
   * covering the requested date range.  Months with no resignations are
   * included with zero counts so the caller always gets a complete series.
   *
   * @param employees - Array of resigned/terminated employees
   * @param options - Report options (number of months, end month)
   * @returns MonthlyResignationReport
   *
   * Validates: Requirement 10.4
   */
  generateMonthlyReport(
    employees: Employee[],
    options: MonthlyReportOptions = {}
  ): MonthlyResignationReport {
    const { months: monthCount = 12, endMonth } = options;

    // Determine the end month
    const end = endMonth ? this.parseYearMonth(endMonth) : new Date();
    end.setDate(1);
    end.setHours(0, 0, 0, 0);

    // Build the list of months to include (oldest → newest)
    const monthKeys: string[] = [];
    for (let i = monthCount - 1; i >= 0; i--) {
      const d = new Date(end.getFullYear(), end.getMonth() - i, 1);
      monthKeys.push(this.formatYearMonth(d));
    }

    // Bucket employees by month
    const buckets = new Map<string, MonthlyReportEntry>();
    for (const key of monthKeys) {
      buckets.set(key, {
        month: key,
        label: this.formatMonthLabel(key),
        total: 0,
        resignations: 0,
        terminations: 0,
        pendingSettlement: 0,
        completedSettlement: 0,
      });
    }

    for (const emp of employees) {
      if (!emp.terminationDate) continue;

      const key = this.formatYearMonth(new Date(emp.terminationDate));
      if (!buckets.has(key)) continue; // outside the requested range

      const entry = buckets.get(key)!;
      entry.total++;

      if (emp.status === 'resigned' || emp.terminationType === 'resignation') {
        entry.resignations++;
      } else {
        entry.terminations++;
      }

      if (
        emp.isSettled ||
        emp.isFinanciallySettled ||
        emp.financialSettlementStatus === 'completed'
      ) {
        entry.completedSettlement++;
      } else {
        entry.pendingSettlement++;
      }
    }

    const monthsArray = Array.from(buckets.values());

    // Aggregate totals
    const totals = monthsArray.reduce(
      (acc, m) => ({
        total: acc.total + m.total,
        resignations: acc.resignations + m.resignations,
        terminations: acc.terminations + m.terminations,
        pendingSettlement: acc.pendingSettlement + m.pendingSettlement,
        completedSettlement: acc.completedSettlement + m.completedSettlement,
      }),
      {
        total: 0,
        resignations: 0,
        terminations: 0,
        pendingSettlement: 0,
        completedSettlement: 0,
      }
    );

    const periodStart = new Date(end.getFullYear(), end.getMonth() - (monthCount - 1), 1);

    return {
      periodStart: periodStart.toISOString(),
      periodEnd: end.toISOString(),
      months: monthsArray,
      totals,
    };
  }

  /**
   * Build comprehensive dashboard statistics from a list of employees.
   *
   * Combines core statistics, department breakdown, type breakdown, and a
   * monthly trend (last 6 months by default) into a single object ready for
   * display on the HR dashboard.
   *
   * @param employees - Array of resigned/terminated employees
   * @param trendMonths - Number of months to include in the trend (default: 6)
   * @returns DashboardStatistics
   *
   * Validates: Requirements 10.1, 10.2, 10.3, 10.4
   */
  buildDashboardStatistics(
    employees: Employee[],
    trendMonths: number = 6
  ): DashboardStatistics {
    const core = this.calculateCoreStatistics(employees);
    const byDepartment = this.calculateDepartmentStatistics(employees);
    const byType = this.calculateTypeStatistics(employees);
    const monthlyReport = this.generateMonthlyReport(employees, { months: trendMonths });

    return {
      ...core,
      byDepartment,
      byType,
      monthlyTrend: monthlyReport.months,
      calculatedAt: new Date(),
    };
  }

  // ============================================================================
  // Public Fetch Methods (network calls)
  // ============================================================================

  /**
   * Fetch all resigned/terminated employees from the API and calculate
   * comprehensive dashboard statistics.
   *
   * @returns Promise<DashboardStatistics>
   * @throws ResignationStatisticsError on API failure
   *
   * Validates: Requirements 10.1, 10.2, 10.3, 10.4
   */
  async fetchDashboardStatistics(): Promise<DashboardStatistics> {
    const employees = await this.fetchAllResignedEmployees();
    return this.buildDashboardStatistics(employees);
  }

  /**
   * Fetch resigned employees and generate a monthly report.
   *
   * @param options - Report options
   * @returns Promise<MonthlyResignationReport>
   * @throws ResignationStatisticsError on API failure
   *
   * Validates: Requirement 10.4
   */
  async fetchMonthlyReport(
    options: MonthlyReportOptions = {}
  ): Promise<MonthlyResignationReport> {
    const employees = await this.fetchAllResignedEmployees();
    return this.generateMonthlyReport(employees, options);
  }

  /**
   * Fetch resigned employees and calculate department statistics.
   *
   * @returns Promise<DepartmentStatistics[]>
   * @throws ResignationStatisticsError on API failure
   *
   * Validates: Requirement 10.3
   */
  async fetchDepartmentStatistics(): Promise<DepartmentStatistics[]> {
    const employees = await this.fetchAllResignedEmployees();
    return this.calculateDepartmentStatistics(employees);
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  /**
   * Fetch all resigned/terminated employees from the API.
   * Uses a high limit to retrieve the full dataset for statistics purposes.
   */
  private async fetchAllResignedEmployees(): Promise<Employee[]> {
    try {
      const response = await apiClient.get('/employees/resigned', {
        params: { limit: 10000 },
      });

      const data = response.data;

      // Support both { employees: [...] } and plain array responses
      if (Array.isArray(data)) {
        return data as Employee[];
      }
      if (Array.isArray(data?.employees)) {
        return data.employees as Employee[];
      }

      return [];
    } catch (error) {
      const apiError = error as {
        response?: { data?: { message?: string }; status?: number };
      };
      throw new ResignationStatisticsError(
        apiError.response?.data?.message ||
          'Failed to fetch resigned employees for statistics',
        STATISTICS_ERROR_CODES.API_ERROR,
        apiError.response?.status || 500
      );
    }
  }

  /**
   * Format a Date to "YYYY-MM" string.
   */
  private formatYearMonth(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  }

  /**
   * Parse a "YYYY-MM" string into a Date set to the 1st of that month.
   * @throws ResignationStatisticsError if the format is invalid
   */
  private parseYearMonth(yearMonth: string): Date {
    const regex = /^\d{4}-(0[1-9]|1[0-2])$/;
    if (!regex.test(yearMonth)) {
      throw new ResignationStatisticsError(
        `Invalid month format "${yearMonth}". Expected YYYY-MM.`,
        STATISTICS_ERROR_CODES.INVALID_MONTH_FORMAT,
        400
      );
    }
    const [year, month] = yearMonth.split('-').map(Number);
    return new Date(year, month - 1, 1);
  }

  /**
   * Format a "YYYY-MM" key into a human-readable Arabic month label.
   * Example: "2026-05" → "مايو 2026"
   */
  private formatMonthLabel(yearMonth: string): string {
    const [year, month] = yearMonth.split('-').map(Number);
    const date = new Date(year, month - 1, 1);
    return date.toLocaleDateString('ar-SA', { year: 'numeric', month: 'long' });
  }
}

// ============================================================================
// Singleton Instance Export
// ============================================================================

/**
 * Singleton instance of ResignationStatisticsService.
 * Use this for all statistics and reporting operations.
 */
export const resignationStatisticsService = new ResignationStatisticsService();

export default resignationStatisticsService;
