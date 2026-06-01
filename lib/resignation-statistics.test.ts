/**
 * Unit tests for ResignationStatisticsService
 *
 * Tests cover:
 * - Core statistics calculation (Req 10.1, 10.2)
 * - Department statistics (Req 10.3)
 * - Type statistics with percentages (Req 10.2)
 * - Monthly report generation (Req 10.4)
 * - Dashboard statistics aggregation (Req 10.1–10.4)
 * - Edge cases: empty arrays, missing fields, boundary months
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  ResignationStatisticsService,
  ResignationStatisticsError,
  STATISTICS_ERROR_CODES,
} from './resignation-statistics';
import type { Employee } from '@/types/employee';

// ============================================================================
// Test Helpers
// ============================================================================

function makeEmployee(overrides: Partial<Employee> = {}): Employee {
  return {
    employeeId: 'EMP001',
    name: 'موظف تجريبي',
    status: 'resigned',
    terminationType: 'resignation',
    terminationDate: '2026-05-10',
    department: 'الإنتاج',
    financialSettlementStatus: 'pending',
    isSettled: false,
    isFinanciallySettled: false,
    ...overrides,
  };
}

/** Build a date string for the 10th of a given YYYY-MM month */
function dateInMonth(yearMonth: string): string {
  return `${yearMonth}-10`;
}

// ============================================================================
// Test Suite
// ============================================================================

describe('ResignationStatisticsService', () => {
  let service: ResignationStatisticsService;

  beforeEach(() => {
    service = new ResignationStatisticsService();
  });

  // --------------------------------------------------------------------------
  // calculateCoreStatistics
  // --------------------------------------------------------------------------

  describe('calculateCoreStatistics', () => {
    it('returns all-zero statistics for an empty array', () => {
      const stats = service.calculateCoreStatistics([]);
      expect(stats.totalResigned).toBe(0);
      expect(stats.currentMonth).toBe(0);
      expect(stats.previousMonths).toBe(0);
      expect(stats.resignations).toBe(0);
      expect(stats.terminations).toBe(0);
      expect(stats.pendingSettlement).toBe(0);
      expect(stats.completedSettlement).toBe(0);
    });

    it('counts a current-month resignation correctly', () => {
      const now = new Date();
      const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const emp = makeEmployee({ terminationDate: dateInMonth(currentMonthStr) });

      const stats = service.calculateCoreStatistics([emp]);
      expect(stats.currentMonth).toBe(1);
      expect(stats.previousMonths).toBe(0);
      expect(stats.totalResigned).toBe(1);
    });

    it('counts a previous-month resignation correctly', () => {
      const emp = makeEmployee({ terminationDate: '2020-01-10' });
      const stats = service.calculateCoreStatistics([emp]);
      expect(stats.previousMonths).toBe(1);
      expect(stats.currentMonth).toBe(0);
    });

    it('counts employees without a terminationDate as previous months', () => {
      const emp = makeEmployee({ terminationDate: null });
      const stats = service.calculateCoreStatistics([emp]);
      expect(stats.previousMonths).toBe(1);
      expect(stats.currentMonth).toBe(0);
    });

    it('distinguishes resignations from terminations', () => {
      const resigned = makeEmployee({ status: 'resigned', terminationType: 'resignation' });
      const terminated = makeEmployee({
        employeeId: 'EMP002',
        status: 'terminated',
        terminationType: 'termination',
      });

      const stats = service.calculateCoreStatistics([resigned, terminated]);
      expect(stats.resignations).toBe(1);
      expect(stats.terminations).toBe(1);
    });

    it('uses terminationType when status is ambiguous', () => {
      // status is "terminated" but terminationType says "resignation"
      const emp = makeEmployee({ status: 'terminated', terminationType: 'resignation' });
      const stats = service.calculateCoreStatistics([emp]);
      // The service checks status === 'resigned' OR terminationType === 'resignation'
      expect(stats.resignations).toBe(1);
      expect(stats.terminations).toBe(0);
    });

    it('counts pending and completed settlements', () => {
      const pending = makeEmployee({ financialSettlementStatus: 'pending', isSettled: false });
      const completed = makeEmployee({
        employeeId: 'EMP002',
        financialSettlementStatus: 'completed',
        isSettled: true,
      });

      const stats = service.calculateCoreStatistics([pending, completed]);
      expect(stats.pendingSettlement).toBe(1);
      expect(stats.completedSettlement).toBe(1);
    });

    it('treats isFinanciallySettled=true as completed', () => {
      const emp = makeEmployee({
        financialSettlementStatus: 'pending', // contradictory – isFinanciallySettled wins
        isFinanciallySettled: true,
      });
      const stats = service.calculateCoreStatistics([emp]);
      expect(stats.completedSettlement).toBe(1);
      expect(stats.pendingSettlement).toBe(0);
    });

    it('treats isSettled=true as completed', () => {
      const emp = makeEmployee({ isSettled: true, financialSettlementStatus: 'pending' });
      const stats = service.calculateCoreStatistics([emp]);
      expect(stats.completedSettlement).toBe(1);
    });

    it('sums totalResigned correctly for multiple employees', () => {
      const employees = Array.from({ length: 7 }, (_, i) =>
        makeEmployee({ employeeId: `EMP${i}` })
      );
      const stats = service.calculateCoreStatistics(employees);
      expect(stats.totalResigned).toBe(7);
    });
  });

  // --------------------------------------------------------------------------
  // calculateDepartmentStatistics
  // --------------------------------------------------------------------------

  describe('calculateDepartmentStatistics', () => {
    it('returns an empty array for no employees', () => {
      expect(service.calculateDepartmentStatistics([])).toEqual([]);
    });

    it('groups employees by department', () => {
      const employees = [
        makeEmployee({ employeeId: 'E1', department: 'الإنتاج' }),
        makeEmployee({ employeeId: 'E2', department: 'الإنتاج' }),
        makeEmployee({ employeeId: 'E3', department: 'المحاسبة' }),
      ];

      const stats = service.calculateDepartmentStatistics(employees);
      expect(stats).toHaveLength(2);

      const production = stats.find(s => s.department === 'الإنتاج');
      expect(production?.total).toBe(2);

      const accounting = stats.find(s => s.department === 'المحاسبة');
      expect(accounting?.total).toBe(1);
    });

    it('uses "غير محدد" for employees without a department', () => {
      const emp = makeEmployee({ department: undefined });
      const stats = service.calculateDepartmentStatistics([emp]);
      expect(stats[0].department).toBe('غير محدد');
    });

    it('sorts departments by total descending', () => {
      const employees = [
        makeEmployee({ employeeId: 'E1', department: 'أ' }),
        makeEmployee({ employeeId: 'E2', department: 'ب' }),
        makeEmployee({ employeeId: 'E3', department: 'ب' }),
        makeEmployee({ employeeId: 'E4', department: 'ب' }),
      ];

      const stats = service.calculateDepartmentStatistics(employees);
      expect(stats[0].department).toBe('ب');
      expect(stats[0].total).toBe(3);
      expect(stats[1].department).toBe('أ');
    });

    it('counts resignations and terminations per department', () => {
      const employees = [
        makeEmployee({ employeeId: 'E1', department: 'الإنتاج', status: 'resigned', terminationType: 'resignation' }),
        makeEmployee({ employeeId: 'E2', department: 'الإنتاج', status: 'terminated', terminationType: 'termination' }),
      ];

      const stats = service.calculateDepartmentStatistics(employees);
      const dept = stats.find(s => s.department === 'الإنتاج')!;
      expect(dept.resignations).toBe(1);
      expect(dept.terminations).toBe(1);
    });

    it('counts pending and completed settlements per department', () => {
      const employees = [
        makeEmployee({ employeeId: 'E1', department: 'الإنتاج', financialSettlementStatus: 'pending' }),
        makeEmployee({ employeeId: 'E2', department: 'الإنتاج', financialSettlementStatus: 'completed', isSettled: true }),
      ];

      const stats = service.calculateDepartmentStatistics(employees);
      const dept = stats.find(s => s.department === 'الإنتاج')!;
      expect(dept.pendingSettlement).toBe(1);
      expect(dept.completedSettlement).toBe(1);
    });
  });

  // --------------------------------------------------------------------------
  // calculateTypeStatistics
  // --------------------------------------------------------------------------

  describe('calculateTypeStatistics', () => {
    it('returns zeros and 0% for empty array', () => {
      const stats = service.calculateTypeStatistics([]);
      expect(stats.resignations).toBe(0);
      expect(stats.terminations).toBe(0);
      expect(stats.resignationPercentage).toBe(0);
      expect(stats.terminationPercentage).toBe(0);
    });

    it('calculates correct percentages', () => {
      const employees = [
        makeEmployee({ employeeId: 'E1', status: 'resigned', terminationType: 'resignation' }),
        makeEmployee({ employeeId: 'E2', status: 'resigned', terminationType: 'resignation' }),
        makeEmployee({ employeeId: 'E3', status: 'resigned', terminationType: 'resignation' }),
        makeEmployee({ employeeId: 'E4', status: 'terminated', terminationType: 'termination' }),
      ];

      const stats = service.calculateTypeStatistics(employees);
      expect(stats.resignations).toBe(3);
      expect(stats.terminations).toBe(1);
      expect(stats.resignationPercentage).toBe(75);
      expect(stats.terminationPercentage).toBe(25);
    });

    it('rounds percentages to nearest integer', () => {
      // 1 out of 3 = 33.33% → rounds to 33
      const employees = [
        makeEmployee({ employeeId: 'E1', status: 'resigned', terminationType: 'resignation' }),
        makeEmployee({ employeeId: 'E2', status: 'terminated', terminationType: 'termination' }),
        makeEmployee({ employeeId: 'E3', status: 'terminated', terminationType: 'termination' }),
      ];

      const stats = service.calculateTypeStatistics(employees);
      expect(stats.resignationPercentage).toBe(33);
      expect(stats.terminationPercentage).toBe(67);
    });

    it('handles 100% resignations', () => {
      const employees = [
        makeEmployee({ employeeId: 'E1', status: 'resigned' }),
        makeEmployee({ employeeId: 'E2', status: 'resigned' }),
      ];
      const stats = service.calculateTypeStatistics(employees);
      expect(stats.resignationPercentage).toBe(100);
      expect(stats.terminationPercentage).toBe(0);
    });
  });

  // --------------------------------------------------------------------------
  // generateMonthlyReport
  // --------------------------------------------------------------------------

  describe('generateMonthlyReport', () => {
    it('returns a report with the correct number of months', () => {
      const report = service.generateMonthlyReport([], { months: 6 });
      expect(report.months).toHaveLength(6);
    });

    it('defaults to 12 months when no options are provided', () => {
      const report = service.generateMonthlyReport([]);
      expect(report.months).toHaveLength(12);
    });

    it('includes months with zero counts for months with no resignations', () => {
      const report = service.generateMonthlyReport([], { months: 3 });
      for (const m of report.months) {
        expect(m.total).toBe(0);
      }
    });

    it('buckets employees into the correct month', () => {
      const emp = makeEmployee({ terminationDate: '2026-03-15' });
      const report = service.generateMonthlyReport([emp], {
        months: 12,
        endMonth: '2026-05',
      });

      const march = report.months.find(m => m.month === '2026-03');
      expect(march).toBeDefined();
      expect(march!.total).toBe(1);
    });

    it('ignores employees outside the requested date range', () => {
      // Employee terminated in 2020 – well outside a 12-month window ending 2026-05
      const emp = makeEmployee({ terminationDate: '2020-01-10' });
      const report = service.generateMonthlyReport([emp], {
        months: 12,
        endMonth: '2026-05',
      });

      const total = report.months.reduce((sum, m) => sum + m.total, 0);
      expect(total).toBe(0);
    });

    it('ignores employees without a terminationDate', () => {
      const emp = makeEmployee({ terminationDate: null });
      const report = service.generateMonthlyReport([emp], { months: 3 });
      const total = report.months.reduce((sum, m) => sum + m.total, 0);
      expect(total).toBe(0);
    });

    it('aggregates totals correctly', () => {
      const employees = [
        makeEmployee({ employeeId: 'E1', terminationDate: '2026-04-10', status: 'resigned', terminationType: 'resignation', financialSettlementStatus: 'pending' }),
        makeEmployee({ employeeId: 'E2', terminationDate: '2026-04-20', status: 'terminated', terminationType: 'termination', financialSettlementStatus: 'completed', isSettled: true }),
        makeEmployee({ employeeId: 'E3', terminationDate: '2026-03-05', status: 'resigned', terminationType: 'resignation', financialSettlementStatus: 'pending' }),
      ];

      const report = service.generateMonthlyReport(employees, {
        months: 12,
        endMonth: '2026-05',
      });

      expect(report.totals.total).toBe(3);
      expect(report.totals.resignations).toBe(2);
      expect(report.totals.terminations).toBe(1);
      expect(report.totals.pendingSettlement).toBe(2);
      expect(report.totals.completedSettlement).toBe(1);
    });

    it('months are ordered oldest to newest', () => {
      const report = service.generateMonthlyReport([], {
        months: 3,
        endMonth: '2026-05',
      });

      expect(report.months[0].month).toBe('2026-03');
      expect(report.months[1].month).toBe('2026-04');
      expect(report.months[2].month).toBe('2026-05');
    });

    it('throws ResignationStatisticsError for invalid endMonth format', () => {
      expect(() =>
        service.generateMonthlyReport([], { endMonth: '2026/05' })
      ).toThrow(ResignationStatisticsError);

      // Verify the error carries the correct code
      try {
        service.generateMonthlyReport([], { endMonth: '2026/05' });
        expect.fail('Expected an error to be thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(ResignationStatisticsError);
        expect((err as ResignationStatisticsError).code).toBe(
          STATISTICS_ERROR_CODES.INVALID_MONTH_FORMAT
        );
      }
    });

    it('includes periodStart and periodEnd in the report', () => {
      const report = service.generateMonthlyReport([], {
        months: 3,
        endMonth: '2026-05',
      });

      expect(report.periodStart).toBeDefined();
      expect(report.periodEnd).toBeDefined();
      // periodStart should be 3 months before end (2026-03)
      expect(new Date(report.periodStart).getMonth()).toBe(2); // March = index 2
    });

    it('each month entry has a non-empty Arabic label', () => {
      const report = service.generateMonthlyReport([], {
        months: 2,
        endMonth: '2026-05',
      });

      for (const m of report.months) {
        expect(m.label).toBeTruthy();
        expect(typeof m.label).toBe('string');
      }
    });
  });

  // --------------------------------------------------------------------------
  // buildDashboardStatistics
  // --------------------------------------------------------------------------

  describe('buildDashboardStatistics', () => {
    it('returns a complete DashboardStatistics object', () => {
      const employees = [
        makeEmployee({ employeeId: 'E1', terminationDate: '2026-05-01' }),
        makeEmployee({ employeeId: 'E2', terminationDate: '2026-04-01', department: 'المحاسبة', status: 'terminated', terminationType: 'termination' }),
      ];

      const dashboard = service.buildDashboardStatistics(employees, 6);

      // Core stats
      expect(dashboard.totalResigned).toBe(2);
      expect(dashboard.resignations).toBe(1);
      expect(dashboard.terminations).toBe(1);

      // Department breakdown
      expect(dashboard.byDepartment).toBeInstanceOf(Array);
      expect(dashboard.byDepartment.length).toBeGreaterThan(0);

      // Type breakdown
      expect(dashboard.byType.resignations).toBe(1);
      expect(dashboard.byType.terminations).toBe(1);

      // Monthly trend
      expect(dashboard.monthlyTrend).toHaveLength(6);

      // Timestamp
      expect(dashboard.calculatedAt).toBeInstanceOf(Date);
    });

    it('uses 6 months for the trend by default', () => {
      const dashboard = service.buildDashboardStatistics([]);
      expect(dashboard.monthlyTrend).toHaveLength(6);
    });

    it('respects a custom trendMonths value', () => {
      const dashboard = service.buildDashboardStatistics([], 3);
      expect(dashboard.monthlyTrend).toHaveLength(3);
    });

    it('handles an empty employee list gracefully', () => {
      const dashboard = service.buildDashboardStatistics([]);
      expect(dashboard.totalResigned).toBe(0);
      expect(dashboard.byDepartment).toEqual([]);
      expect(dashboard.byType.resignationPercentage).toBe(0);
    });
  });

  // --------------------------------------------------------------------------
  // ResignationStatisticsError
  // --------------------------------------------------------------------------

  describe('ResignationStatisticsError', () => {
    it('has the correct name and code', () => {
      const err = new ResignationStatisticsError('test', STATISTICS_ERROR_CODES.API_ERROR, 500);
      expect(err.name).toBe('ResignationStatisticsError');
      expect(err.code).toBe(STATISTICS_ERROR_CODES.API_ERROR);
      expect(err.statusCode).toBe(500);
      expect(err.message).toBe('test');
    });

    it('is an instance of Error', () => {
      const err = new ResignationStatisticsError('test', 'CODE');
      expect(err).toBeInstanceOf(Error);
    });
  });
});
