/**
 * ExcelExportService
 *
 * Handles Excel export for the resigned employees list with proper Arabic text
 * formatting, RTL layout, column widths, and filtering support.
 *
 * Implements Requirement 10.5: Export resigned employees list to Excel.
 */

import * as XLSX from 'xlsx';
import type { Employee } from '@/types/employee';
import type { FilterOptions } from '@/types/resignation';

// ============================================================================
// Types and Interfaces
// ============================================================================

/**
 * A single row in the exported Excel sheet.
 * Keys are Arabic column headers.
 */
export interface ResignedEmployeeExportRow {
  'رقم الموظف': string;
  'الاسم': string;
  'القسم': string;
  'الوظيفة': string;
  'نوع الإنهاء': string;
  'تاريخ الإنهاء': string;
  'الحالة المالية': string;
  'سبب الإنهاء': string;
  'ملاحظات': string;
}

/**
 * Options for the Excel export.
 */
export interface ExcelExportOptions {
  /**
   * Active filter state to embed in the export metadata sheet.
   * When provided, a second "الفلاتر المطبقة" sheet is added.
   */
  filters?: {
    searchQuery?: string;
    department?: string;
    terminationType?: 'resignation' | 'termination' | 'all';
    financialStatus?: 'pending' | 'completed' | 'all';
  };
  /**
   * Override the default file name (without extension).
   * Defaults to "الموظفين_المستقيلين_YYYY-MM-DD".
   */
  fileName?: string;
  /**
   * Sheet name for the main data sheet.
   * Defaults to "الموظفين المستقيلين".
   */
  sheetName?: string;
}

/**
 * Result returned by the export function.
 */
export interface ExcelExportResult {
  success: boolean;
  fileName: string;
  rowCount: number;
  /** Error message if success is false */
  error?: string;
}

/**
 * Error class for Excel export operations.
 */
export class ExcelExportError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500
  ) {
    super(message);
    this.name = 'ExcelExportError';
  }
}

// ============================================================================
// Error Codes
// ============================================================================

export const EXCEL_EXPORT_ERROR_CODES = {
  NO_DATA: 'EXCEL_NO_DATA',
  BUILD_ERROR: 'EXCEL_BUILD_ERROR',
  WRITE_ERROR: 'EXCEL_WRITE_ERROR',
} as const;

// ============================================================================
// Column Configuration
// ============================================================================

/**
 * Column width configuration (in characters).
 * Order must match the keys in ResignedEmployeeExportRow.
 */
const COLUMN_WIDTHS: XLSX.ColInfo[] = [
  { wch: 14 }, // رقم الموظف
  { wch: 30 }, // الاسم
  { wch: 20 }, // القسم
  { wch: 22 }, // الوظيفة
  { wch: 14 }, // نوع الإنهاء
  { wch: 16 }, // تاريخ الإنهاء
  { wch: 16 }, // الحالة المالية
  { wch: 35 }, // سبب الإنهاء
  { wch: 35 }, // ملاحظات
];

// ============================================================================
// ExcelExportService Class
// ============================================================================

/**
 * Service class for exporting resigned employees data to Excel.
 *
 * Handles:
 * - Converting employee data to Arabic-labelled rows
 * - Applying active filters before export
 * - Setting column widths and RTL sheet direction
 * - Embedding applied-filter metadata in a second sheet
 * - Generating a timestamped file name
 *
 * Validates: Requirement 10.5
 */
export class ExcelExportService {
  // ============================================================================
  // Public Methods
  // ============================================================================

  /**
   * Export a list of resigned employees to an Excel file and trigger a browser
   * download.
   *
   * The employees array should already be filtered/sorted by the caller (e.g.
   * the resigned page passes `filteredEmployees` directly).  The `options.filters`
   * object is used only to populate the metadata sheet — it does NOT re-filter
   * the data.
   *
   * @param employees - Pre-filtered array of resigned/terminated employees
   * @param options - Export options (filters metadata, file name, sheet name)
   * @returns ExcelExportResult
   * @throws ExcelExportError if the workbook cannot be built or written
   *
   * Validates: Requirement 10.5
   */
  exportResignedEmployees(
    employees: Employee[],
    options: ExcelExportOptions = {}
  ): ExcelExportResult {
    if (employees.length === 0) {
      throw new ExcelExportError(
        'لا توجد بيانات للتصدير',
        EXCEL_EXPORT_ERROR_CODES.NO_DATA,
        400
      );
    }

    const {
      fileName = this.buildDefaultFileName(),
      sheetName = 'الموظفين المستقيلين',
      filters,
    } = options;

    const fullFileName = `${fileName}.xlsx`;

    try {
      // 1. Build the workbook
      const workbook = XLSX.utils.book_new();

      // 2. Build and append the main data sheet
      const rows = this.buildExportRows(employees);
      const dataSheet = this.buildDataSheet(rows);
      XLSX.utils.book_append_sheet(workbook, dataSheet, sheetName);

      // 3. Optionally append a filters metadata sheet
      if (filters) {
        const filtersSheet = this.buildFiltersSheet(filters, employees.length);
        XLSX.utils.book_append_sheet(workbook, filtersSheet, 'الفلاتر المطبقة');
      }

      // 4. Write the file (triggers browser download)
      XLSX.writeFile(workbook, fullFileName);

      return {
        success: true,
        fileName: fullFileName,
        rowCount: employees.length,
      };
    } catch (error) {
      if (error instanceof ExcelExportError) {
        throw error;
      }
      const msg = error instanceof Error ? error.message : 'Unknown error';
      throw new ExcelExportError(
        `فشل تصدير ملف Excel: ${msg}`,
        EXCEL_EXPORT_ERROR_CODES.WRITE_ERROR,
        500
      );
    }
  }

  /**
   * Convert an array of employees to export rows without writing a file.
   * Useful for testing and for building previews.
   *
   * @param employees - Array of resigned/terminated employees
   * @returns Array of ResignedEmployeeExportRow
   *
   * Validates: Requirement 10.5
   */
  buildExportRows(employees: Employee[]): ResignedEmployeeExportRow[] {
    return employees.map((emp) => ({
      'رقم الموظف': emp.employeeId || '—',
      'الاسم': emp.name || '—',
      'القسم': emp.department || '—',
      'الوظيفة': emp.jobTitle || emp.profession || '—',
      'نوع الإنهاء': this.resolveTerminationType(emp),
      'تاريخ الإنهاء': this.formatDate(emp.terminationDate),
      'الحالة المالية': this.resolveFinancialStatus(emp),
      'سبب الإنهاء': emp.terminationReason || '—',
      'ملاحظات': emp.terminationNotes || '—',
    }));
  }

  /**
   * Apply filter options to an employee array and return the filtered result.
   *
   * This mirrors the filtering logic in the resigned page so the service can
   * be used standalone (e.g. for server-side export or testing).
   *
   * @param employees - Full array of resigned/terminated employees
   * @param filters - Filter options to apply
   * @param searchQuery - Free-text search string (name or employee ID)
   * @returns Filtered and sorted array
   *
   * Validates: Requirement 10.5 (include filtering options in export)
   */
  applyFilters(
    employees: Employee[],
    filters: FilterOptions = {},
    searchQuery = ''
  ): Employee[] {
    let result = [...employees];

    // Free-text search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (emp) =>
          emp.name?.toLowerCase().includes(q) ||
          emp.employeeId?.toLowerCase().includes(q)
      );
    }

    // Department filter
    if (filters.department && filters.department !== 'الكل') {
      result = result.filter((emp) => emp.department === filters.department);
    }

    // Termination type filter
    if (filters.terminationType) {
      result = result.filter((emp) => {
        if (filters.terminationType === 'resignation') {
          return emp.status === 'resigned' || emp.terminationType === 'resignation';
        }
        return emp.status === 'terminated' || emp.terminationType === 'termination';
      });
    }

    // Financial status filter
    if (filters.financialStatus) {
      result = result.filter((emp) => {
        const isSettled =
          emp.isSettled ||
          emp.isFinanciallySettled ||
          emp.financialSettlementStatus === 'completed';
        return filters.financialStatus === 'completed' ? isSettled : !isSettled;
      });
    }

    // Date range filter
    if (filters.dateRange) {
      const { start, end } = filters.dateRange;
      result = result.filter((emp) => {
        if (!emp.terminationDate) return false;
        const d = new Date(emp.terminationDate);
        return d >= start && d <= end;
      });
    }

    // Sort: most recent first
    result.sort((a, b) => {
      const dateA = a.terminationDate ? new Date(a.terminationDate).getTime() : 0;
      const dateB = b.terminationDate ? new Date(b.terminationDate).getTime() : 0;
      return dateB - dateA;
    });

    return result;
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  /**
   * Build the main data worksheet from export rows.
   * Sets column widths and marks the sheet as RTL.
   */
  private buildDataSheet(rows: ResignedEmployeeExportRow[]): XLSX.WorkSheet {
    const sheet = XLSX.utils.json_to_sheet(rows);

    // Column widths
    sheet['!cols'] = COLUMN_WIDTHS;

    // RTL direction — stored in the sheet's view options
    sheet['!views'] = [{ rightToLeft: true }];

    return sheet;
  }

  /**
   * Build a metadata sheet listing the active filters and export timestamp.
   */
  private buildFiltersSheet(
    filters: NonNullable<ExcelExportOptions['filters']>,
    rowCount: number
  ): XLSX.WorkSheet {
    const typeLabel =
      filters.terminationType === 'resignation'
        ? 'استقالة'
        : filters.terminationType === 'termination'
        ? 'إقالة'
        : 'الكل';

    const financialLabel =
      filters.financialStatus === 'completed'
        ? 'تمت التصفية'
        : filters.financialStatus === 'pending'
        ? 'قيد التصفية'
        : 'الكل';

    const metaRows = [
      { 'البيان': 'تاريخ التصدير', 'القيمة': new Date().toLocaleDateString('ar-SY') },
      { 'البيان': 'عدد السجلات المصدرة', 'القيمة': String(rowCount) },
      { 'البيان': 'البحث النصي', 'القيمة': filters.searchQuery || '—' },
      { 'البيان': 'القسم', 'القيمة': filters.department || 'الكل' },
      { 'البيان': 'نوع الإنهاء', 'القيمة': typeLabel },
      { 'البيان': 'الحالة المالية', 'القيمة': financialLabel },
    ];

    const sheet = XLSX.utils.json_to_sheet(metaRows);
    sheet['!cols'] = [{ wch: 25 }, { wch: 30 }];
    sheet['!views'] = [{ rightToLeft: true }];
    return sheet;
  }

  /**
   * Resolve the Arabic termination type label for an employee.
   */
  private resolveTerminationType(emp: Employee): string {
    if (emp.status === 'resigned' || emp.terminationType === 'resignation') {
      return 'استقالة';
    }
    return 'إقالة';
  }

  /**
   * Resolve the Arabic financial status label for an employee.
   */
  private resolveFinancialStatus(emp: Employee): string {
    const settled =
      emp.isSettled ||
      emp.isFinanciallySettled ||
      emp.financialSettlementStatus === 'completed';
    return settled ? 'تمت التصفية' : 'قيد التصفية';
  }

  /**
   * Format a date string to Arabic locale (ar-SY).
   * Returns '—' for null/undefined/invalid dates.
   */
  private formatDate(dateStr: string | null | undefined): string {
    if (!dateStr) return '—';
    try {
      return new Date(dateStr).toLocaleDateString('ar-SY');
    } catch {
      return '—';
    }
  }

  /**
   * Build the default file name: "الموظفين_المستقيلين_YYYY-MM-DD"
   */
  private buildDefaultFileName(): string {
    const today = new Date().toISOString().split('T')[0];
    return `الموظفين_المستقيلين_${today}`;
  }
}

// ============================================================================
// Singleton Instance Export
// ============================================================================

/**
 * Singleton instance of ExcelExportService.
 * Use this for all Excel export operations.
 */
export const excelExportService = new ExcelExportService();

export default excelExportService;
