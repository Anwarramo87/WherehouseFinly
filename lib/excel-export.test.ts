/**
 * Unit tests for ExcelExportService
 *
 * Tests cover:
 * - buildExportRows: correct Arabic labels, fallbacks, date formatting
 * - applyFilters: search, department, type, financial status, date range, sorting
 * - exportResignedEmployees: error on empty array, correct result shape
 * - ExcelExportError: correct name, code, statusCode
 *
 * Note: XLSX.writeFile is mocked so no actual file I/O occurs in tests.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import * as XLSX from 'xlsx';
import {
  ExcelExportService,
  ExcelExportError,
  EXCEL_EXPORT_ERROR_CODES,
} from './excel-export';
import type { Employee } from '@/types/employee';

// ============================================================================
// Mock XLSX.writeFile so tests don't touch the filesystem
// ============================================================================

vi.mock('xlsx', async () => {
  const actual = await vi.importActual<typeof XLSX>('xlsx');
  return {
    ...actual,
    writeFile: vi.fn(),
  };
});

// ============================================================================
// Test Helpers
// ============================================================================

function makeEmployee(overrides: Partial<Employee> = {}): Employee {
  return {
    employeeId: 'EMP001',
    name: 'أحمد محمد',
    department: 'الإنتاج',
    jobTitle: 'مشغل آلات',
    profession: 'فني',
    status: 'resigned',
    terminationType: 'resignation',
    terminationDate: '2026-05-10',
    terminationReason: 'ظروف شخصية',
    terminationNotes: 'لا توجد ملاحظات',
    financialSettlementStatus: 'pending',
    isSettled: false,
    isFinanciallySettled: false,
    ...overrides,
  };
}

// ============================================================================
// Test Suite
// ============================================================================

describe('ExcelExportService', () => {
  let service: ExcelExportService;

  beforeEach(() => {
    service = new ExcelExportService();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // --------------------------------------------------------------------------
  // buildExportRows
  // --------------------------------------------------------------------------

  describe('buildExportRows', () => {
    it('maps all fields to Arabic column headers', () => {
      const emp = makeEmployee();
      const rows = service.buildExportRows([emp]);

      expect(rows).toHaveLength(1);
      const row = rows[0];

      expect(row['رقم الموظف']).toBe('EMP001');
      expect(row['الاسم']).toBe('أحمد محمد');
      expect(row['القسم']).toBe('الإنتاج');
      expect(row['الوظيفة']).toBe('مشغل آلات'); // jobTitle takes priority
      expect(row['نوع الإنهاء']).toBe('استقالة');
      expect(row['الحالة المالية']).toBe('قيد التصفية');
      expect(row['سبب الإنهاء']).toBe('ظروف شخصية');
      expect(row['ملاحظات']).toBe('لا توجد ملاحظات');
    });

    it('uses profession when jobTitle is absent', () => {
      const emp = makeEmployee({ jobTitle: undefined });
      const rows = service.buildExportRows([emp]);
      expect(rows[0]['الوظيفة']).toBe('فني');
    });

    it('falls back to "—" when both jobTitle and profession are absent', () => {
      const emp = makeEmployee({ jobTitle: undefined, profession: undefined });
      const rows = service.buildExportRows([emp]);
      expect(rows[0]['الوظيفة']).toBe('—');
    });

    it('labels terminated employees as "إقالة"', () => {
      const emp = makeEmployee({ status: 'terminated', terminationType: 'termination' });
      const rows = service.buildExportRows([emp]);
      expect(rows[0]['نوع الإنهاء']).toBe('إقالة');
    });

    it('labels resigned employees as "استقالة" even when status is "terminated"', () => {
      // terminationType overrides status for the label
      const emp = makeEmployee({ status: 'terminated', terminationType: 'resignation' });
      const rows = service.buildExportRows([emp]);
      expect(rows[0]['نوع الإنهاء']).toBe('استقالة');
    });

    it('labels financially settled employees correctly', () => {
      const emp = makeEmployee({ financialSettlementStatus: 'completed', isSettled: true });
      const rows = service.buildExportRows([emp]);
      expect(rows[0]['الحالة المالية']).toBe('تمت التصفية');
    });

    it('labels isFinanciallySettled=true as "تمت التصفية"', () => {
      const emp = makeEmployee({ isFinanciallySettled: true, financialSettlementStatus: 'pending' });
      const rows = service.buildExportRows([emp]);
      expect(rows[0]['الحالة المالية']).toBe('تمت التصفية');
    });

    it('formats the termination date in Arabic locale', () => {
      const emp = makeEmployee({ terminationDate: '2026-05-10' });
      const rows = service.buildExportRows([emp]);
      // Should be a non-empty string (locale formatting varies by environment)
      expect(rows[0]['تاريخ الإنهاء']).toBeTruthy();
      expect(rows[0]['تاريخ الإنهاء']).not.toBe('—');
    });

    it('returns "—" for null terminationDate', () => {
      const emp = makeEmployee({ terminationDate: null });
      const rows = service.buildExportRows([emp]);
      expect(rows[0]['تاريخ الإنهاء']).toBe('—');
    });

    it('returns "—" for missing optional fields', () => {
      const emp = makeEmployee({
        department: undefined,
        terminationReason: null,
        terminationNotes: null,
      });
      const rows = service.buildExportRows([emp]);
      expect(rows[0]['القسم']).toBe('—');
      expect(rows[0]['سبب الإنهاء']).toBe('—');
      expect(rows[0]['ملاحظات']).toBe('—');
    });

    it('handles an empty array', () => {
      expect(service.buildExportRows([])).toEqual([]);
    });

    it('processes multiple employees', () => {
      const employees = [
        makeEmployee({ employeeId: 'E1' }),
        makeEmployee({ employeeId: 'E2' }),
        makeEmployee({ employeeId: 'E3' }),
      ];
      const rows = service.buildExportRows(employees);
      expect(rows).toHaveLength(3);
      expect(rows.map(r => r['رقم الموظف'])).toEqual(['E1', 'E2', 'E3']);
    });
  });

  // --------------------------------------------------------------------------
  // applyFilters
  // --------------------------------------------------------------------------

  describe('applyFilters', () => {
    const employees: Employee[] = [
      makeEmployee({ employeeId: 'E1', name: 'أحمد محمد', department: 'الإنتاج', status: 'resigned', terminationType: 'resignation', financialSettlementStatus: 'pending', terminationDate: '2026-05-01' }),
      makeEmployee({ employeeId: 'E2', name: 'سارة علي', department: 'المحاسبة', status: 'terminated', terminationType: 'termination', financialSettlementStatus: 'completed', isSettled: true, terminationDate: '2026-04-15' }),
      makeEmployee({ employeeId: 'E3', name: 'محمد خالد', department: 'الإنتاج', status: 'resigned', terminationType: 'resignation', financialSettlementStatus: 'pending', terminationDate: '2026-03-20' }),
    ];

    it('returns all employees when no filters are applied', () => {
      const result = service.applyFilters(employees);
      expect(result).toHaveLength(3);
    });

    it('filters by name search query (case-insensitive)', () => {
      const result = service.applyFilters(employees, {}, 'أحمد');
      expect(result).toHaveLength(1);
      expect(result[0].employeeId).toBe('E1');
    });

    it('filters by employee ID search query', () => {
      const result = service.applyFilters(employees, {}, 'E2');
      expect(result).toHaveLength(1);
      expect(result[0].employeeId).toBe('E2');
    });

    it('returns empty array when search matches nothing', () => {
      const result = service.applyFilters(employees, {}, 'xyz_no_match');
      expect(result).toHaveLength(0);
    });

    it('filters by department', () => {
      const result = service.applyFilters(employees, { department: 'الإنتاج' });
      expect(result).toHaveLength(2);
      result.forEach(emp => expect(emp.department).toBe('الإنتاج'));
    });

    it('ignores department filter when value is "الكل"', () => {
      const result = service.applyFilters(employees, { department: 'الكل' });
      expect(result).toHaveLength(3);
    });

    it('filters by termination type: resignation', () => {
      const result = service.applyFilters(employees, { terminationType: 'resignation' });
      expect(result).toHaveLength(2);
      result.forEach(emp =>
        expect(emp.status === 'resigned' || emp.terminationType === 'resignation').toBe(true)
      );
    });

    it('filters by termination type: termination', () => {
      const result = service.applyFilters(employees, { terminationType: 'termination' });
      expect(result).toHaveLength(1);
      expect(result[0].employeeId).toBe('E2');
    });

    it('filters by financial status: pending', () => {
      const result = service.applyFilters(employees, { financialStatus: 'pending' });
      expect(result).toHaveLength(2);
      result.forEach(emp =>
        expect(emp.financialSettlementStatus).toBe('pending')
      );
    });

    it('filters by financial status: completed', () => {
      const result = service.applyFilters(employees, { financialStatus: 'completed' });
      expect(result).toHaveLength(1);
      expect(result[0].employeeId).toBe('E2');
    });

    it('filters by date range', () => {
      const result = service.applyFilters(employees, {
        dateRange: { start: new Date('2026-04-01'), end: new Date('2026-05-31') },
      });
      expect(result).toHaveLength(2);
      const ids = result.map(e => e.employeeId);
      expect(ids).toContain('E1');
      expect(ids).toContain('E2');
    });

    it('excludes employees without terminationDate from date range filter', () => {
      const empNoDate = makeEmployee({ employeeId: 'E4', terminationDate: null });
      const result = service.applyFilters(
        [...employees, empNoDate],
        { dateRange: { start: new Date('2026-01-01'), end: new Date('2026-12-31') } }
      );
      expect(result.find(e => e.employeeId === 'E4')).toBeUndefined();
    });

    it('combines multiple filters (AND logic)', () => {
      const result = service.applyFilters(
        employees,
        { department: 'الإنتاج', terminationType: 'resignation', financialStatus: 'pending' }
      );
      expect(result).toHaveLength(2);
    });

    it('sorts results by terminationDate descending (most recent first)', () => {
      const result = service.applyFilters(employees);
      expect(result[0].terminationDate! >= result[1].terminationDate!).toBe(true);
      expect(result[1].terminationDate! >= result[2].terminationDate!).toBe(true);
    });

    it('places employees without terminationDate at the end', () => {
      const empNoDate = makeEmployee({ employeeId: 'E_NODATE', terminationDate: null });
      const result = service.applyFilters([empNoDate, ...employees]);
      expect(result[result.length - 1].employeeId).toBe('E_NODATE');
    });
  });

  // --------------------------------------------------------------------------
  // exportResignedEmployees
  // --------------------------------------------------------------------------

  describe('exportResignedEmployees', () => {
    it('throws ExcelExportError with NO_DATA code for empty array', () => {
      expect(() => service.exportResignedEmployees([])).toThrow(ExcelExportError);

      try {
        service.exportResignedEmployees([]);
        expect.fail('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(ExcelExportError);
        expect((err as ExcelExportError).code).toBe(EXCEL_EXPORT_ERROR_CODES.NO_DATA);
        expect((err as ExcelExportError).statusCode).toBe(400);
      }
    });

    it('calls XLSX.writeFile with a .xlsx file name', () => {
      const emp = makeEmployee();
      service.exportResignedEmployees([emp]);

      expect(XLSX.writeFile).toHaveBeenCalledOnce();
      const [, fileName] = (XLSX.writeFile as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(fileName).toMatch(/\.xlsx$/);
    });

    it('returns a successful ExcelExportResult', () => {
      const employees = [makeEmployee({ employeeId: 'E1' }), makeEmployee({ employeeId: 'E2' })];
      service.exportResignedEmployees(employees);

      expect(XLSX.writeFile).toHaveBeenCalledOnce();
    });

    it('uses a custom fileName when provided', () => {
      const emp = makeEmployee();
      const result = service.exportResignedEmployees([emp], { fileName: 'تقرير_مخصص' });

      expect(result.fileName).toBe('تقرير_مخصص.xlsx');
      const [, fileName] = (XLSX.writeFile as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(fileName).toBe('تقرير_مخصص.xlsx');
    });

    it('includes a filters sheet when filters option is provided', () => {
      const emp = makeEmployee();
      service.exportResignedEmployees([emp], {
        filters: { department: 'الإنتاج', terminationType: 'resignation' },
      });

      // The workbook passed to writeFile should have 2 sheets
      const [workbook] = (XLSX.writeFile as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(workbook.SheetNames).toHaveLength(2);
      expect(workbook.SheetNames[1]).toBe('الفلاتر المطبقة');
    });

    it('does NOT include a filters sheet when filters option is omitted', () => {
      const emp = makeEmployee();
      service.exportResignedEmployees([emp]);

      const [workbook] = (XLSX.writeFile as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(workbook.SheetNames).toHaveLength(1);
    });

    it('uses a custom sheetName when provided', () => {
      const emp = makeEmployee();
      service.exportResignedEmployees([emp], { sheetName: 'تقرير مخصص' });

      const [workbook] = (XLSX.writeFile as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(workbook.SheetNames[0]).toBe('تقرير مخصص');
    });

    it('default file name contains today\'s date', () => {
      const emp = makeEmployee();
      const result = service.exportResignedEmployees([emp]);
      const today = new Date().toISOString().split('T')[0];
      expect(result.fileName).toContain(today);
    });

    it('the main sheet has RTL view set', () => {
      const emp = makeEmployee();
      service.exportResignedEmployees([emp]);

      const [workbook] = (XLSX.writeFile as ReturnType<typeof vi.fn>).mock.calls[0];
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      expect(sheet['!views']).toBeDefined();
      expect(sheet['!views'][0].rightToLeft).toBe(true);
    });

    it('the main sheet has column widths set', () => {
      const emp = makeEmployee();
      service.exportResignedEmployees([emp]);

      const [workbook] = (XLSX.writeFile as ReturnType<typeof vi.fn>).mock.calls[0];
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      expect(sheet['!cols']).toBeDefined();
      expect(Array.isArray(sheet['!cols'])).toBe(true);
      expect((sheet['!cols'] as XLSX.ColInfo[]).length).toBe(9); // 9 columns
    });
  });

  // --------------------------------------------------------------------------
  // ExcelExportError
  // --------------------------------------------------------------------------

  describe('ExcelExportError', () => {
    it('has the correct name, code, and statusCode', () => {
      const err = new ExcelExportError('test error', EXCEL_EXPORT_ERROR_CODES.BUILD_ERROR, 500);
      expect(err.name).toBe('ExcelExportError');
      expect(err.code).toBe(EXCEL_EXPORT_ERROR_CODES.BUILD_ERROR);
      expect(err.statusCode).toBe(500);
      expect(err.message).toBe('test error');
    });

    it('is an instance of Error', () => {
      const err = new ExcelExportError('test', 'CODE');
      expect(err).toBeInstanceOf(Error);
    });

    it('defaults statusCode to 500', () => {
      const err = new ExcelExportError('test', 'CODE');
      expect(err.statusCode).toBe(500);
    });
  });
});
