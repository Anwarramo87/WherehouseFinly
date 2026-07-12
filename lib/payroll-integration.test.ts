/**
 * Unit tests for PayrollIntegration Service
 * 
 * Tests business logic for Requirements 2.3, 8.1, 8.4, 8.5
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  PayrollIntegration,
  PayrollIntegrationError,
  PAYROLL_INTEGRATION_ERROR_CODES,
  type ResignedEmployeePayrollData,
  type PayrollRemovalResult,
  type EnhancedPayrollReport,
} from './payroll-integration';
import apiClient from './api-client';
import type { Employee } from '@/types/employee';
import type { PayrollData } from '@/types/resignation';
import type { PayrollReportResponse, PayrollItem } from '@/types/payroll';

// Mock the API client
vi.mock('./api-client');

describe('PayrollIntegration', () => {
  let payrollIntegration: PayrollIntegration;

  beforeEach(() => {
    payrollIntegration = new PayrollIntegration();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ============================================================================
  // Test Data Fixtures
  // ============================================================================

  const mockActiveEmployee: Employee = {
    id: 'emp-001',
    employeeId: 'emp-001',
    name: 'أحمد محمد',
    department: 'الإنتاج',
    status: 'active',
    financialSettlementStatus: 'pending',
    isFinanciallySettled: false,
  } as Employee;

  const mockResignedEmployee: Employee = {
    id: 'emp-002',
    employeeId: 'emp-002',
    name: 'محمد علي',
    department: 'المبيعات',
    status: 'resigned',
    terminationDate: new Date('2024-03-15').toISOString(),
    terminationType: 'resignation',
    terminationReason: 'استقالة شخصية',
    financialSettlementStatus: 'pending',
    isFinanciallySettled: false,
  } as Employee;

  const mockSettledEmployee: Employee = {
    id: 'emp-003',
    employeeId: 'emp-003',
    name: 'خالد أحمد',
    department: 'الصيانة',
    status: 'resigned',
    terminationDate: new Date('2024-02-20').toISOString(),
    terminationType: 'resignation',
    terminationReason: 'استقالة',
    financialSettlementStatus: 'completed',
    isFinanciallySettled: true,
    financialSettlementDate: new Date('2024-03-01').toISOString(),
  } as Employee;

  const mockPayrollItems: PayrollItem[] = [
    {
      id: 'payroll-001',
      payrollRunId: 'run-001',
      employeeId: 'emp-001',
      employeeName: 'أحمد محمد',
      department: 'الإنتاج',
      hoursWorked: 160,
      hourlyRate: 50,
      grossPay: 8000,
      totalBonuses: 0,
      totalDeductions: 500,
      attendanceBasedSalary: 8000,
      netPay: 7500,
      netPayRounded: 7500,
      roundingDifference: 0,
    },
    {
      id: 'payroll-002',
      payrollRunId: 'run-001',
      employeeId: 'emp-002',
      employeeName: 'محمد علي',
      department: 'المبيعات',
      hoursWorked: 120,
      hourlyRate: 60,
      grossPay: 7200,
      totalBonuses: 0,
      totalDeductions: 300,
      attendanceBasedSalary: 7200,
      netPay: 6900,
      netPayRounded: 7000,
      roundingDifference: 100,
    },
  ];

  const mockPayrollReport: PayrollReportResponse = {
    month: '2024-03',
    period: {
      startDate: '2024-03-01',
      endDate: '2024-03-31',
    },
    runsCount: 1,
    latestRun: null,
    totals: {
      totalGrossPay: 15200,
      totalDeductions: 800,
      totalNetPay: 14400,
    },
    items: mockPayrollItems,
  };

  // ============================================================================
  // getPayrollData Tests
  // ============================================================================

  describe('getPayrollData', () => {
    it('should separate active and resigned employees correctly', async () => {
      // Mock API responses
      vi.mocked(apiClient.get).mockImplementation((url: string) => {
        if (url === '/payroll/report/2024-03') {
          return Promise.resolve({ data: mockPayrollReport });
        }
        if (url === '/employees/resigned') {
          return Promise.resolve({ data: { employees: [mockResignedEmployee] } });
        }
        return Promise.reject(new Error('Unknown endpoint'));
      });

      const result: PayrollData = await payrollIntegration.getPayrollData('2024-03');

      expect(result.activeEmployees).toHaveLength(1);
      expect(result.resignedEmployees).toHaveLength(1);
      expect(result.activeEmployees[0].id).toBe('emp-001');
      expect(result.resignedEmployees[0].id).toBe('emp-002');
    });

    it('should throw error for invalid month format', async () => {
      await expect(payrollIntegration.getPayrollData('2024-3')).rejects.toThrow(
        PayrollIntegrationError
      );
      await expect(payrollIntegration.getPayrollData('2024-3')).rejects.toThrow(
        'Invalid month format'
      );
    });

    it('should handle empty payroll data', async () => {
      vi.mocked(apiClient.get).mockImplementation((url: string) => {
        if (url === '/payroll/report/2024-03') {
          return Promise.resolve({
            data: { ...mockPayrollReport, items: [] },
          });
        }
        if (url === '/employees/resigned') {
          return Promise.resolve({ data: { employees: [] } });
        }
        return Promise.reject(new Error('Unknown endpoint'));
      });

      const result = await payrollIntegration.getPayrollData('2024-03');

      expect(result.activeEmployees).toHaveLength(0);
      expect(result.resignedEmployees).toHaveLength(0);
    });

    it('should handle API errors gracefully', async () => {
      vi.mocked(apiClient.get).mockRejectedValue({
        response: { status: 500, data: { message: 'Server error' } },
      });

      await expect(payrollIntegration.getPayrollData('2024-03')).rejects.toThrow(
        PayrollIntegrationError
      );
    });
  });

  // ============================================================================
  // getResignedEmployeesPayrollData Tests
  // ============================================================================

  describe('getResignedEmployeesPayrollData', () => {
    it('should return resigned employees with payroll data', async () => {
      vi.mocked(apiClient.get).mockImplementation((url: string) => {
        if (url === '/payroll/report/2024-03') {
          return Promise.resolve({ data: mockPayrollReport });
        }
        if (url === '/employees/resigned') {
          return Promise.resolve({ data: { employees: [mockResignedEmployee] } });
        }
        return Promise.reject(new Error('Unknown endpoint'));
      });

      const result: ResignedEmployeePayrollData[] =
        await payrollIntegration.getResignedEmployeesPayrollData('2024-03');

      expect(result).toHaveLength(1);
      expect(result[0].employee.id).toBe('emp-002');
      expect(result[0].payrollItem).toBeDefined();
      expect(result[0].payrollItem?.employeeId).toBe('emp-002');
      expect(result[0].isPendingSettlement).toBe(true);
      expect(result[0].terminationType).toBe('resignation');
    });

    it('should exclude resigned employees without payroll data', async () => {
      const resignedWithoutPayroll: Employee = {
        ...mockResignedEmployee,
        id: 'emp-999',
      };

      vi.mocked(apiClient.get).mockImplementation((url: string) => {
        if (url === '/payroll/report/2024-03') {
          return Promise.resolve({ data: mockPayrollReport });
        }
        if (url === '/employees/resigned') {
          return Promise.resolve({
            data: { employees: [mockResignedEmployee, resignedWithoutPayroll] },
          });
        }
        return Promise.reject(new Error('Unknown endpoint'));
      });

      const result = await payrollIntegration.getResignedEmployeesPayrollData('2024-03');

      expect(result).toHaveLength(1);
      expect(result[0].employee.id).toBe('emp-002');
    });

    it('should throw error for invalid month format', async () => {
      await expect(
        payrollIntegration.getResignedEmployeesPayrollData('invalid-month')
      ).rejects.toThrow(PayrollIntegrationError);
    });
  });

  // ============================================================================
  // getEnhancedPayrollReport Tests
  // ============================================================================

  describe('getEnhancedPayrollReport', () => {
    it('should return enhanced report with separated sections', async () => {
      vi.mocked(apiClient.get).mockImplementation((url: string) => {
        if (url === '/payroll/report/2024-03') {
          return Promise.resolve({ data: mockPayrollReport });
        }
        if (url === '/employees/resigned') {
          return Promise.resolve({ data: { employees: [mockResignedEmployee] } });
        }
        return Promise.reject(new Error('Unknown endpoint'));
      });

      const result: EnhancedPayrollReport =
        await payrollIntegration.getEnhancedPayrollReport('2024-03');

      expect(result.items).toHaveLength(1); // Only active employees
      expect(result.items[0].employeeId).toBe('emp-001');
      expect(result.resignedEmployees).toHaveLength(1);
      expect(result.resignedEmployees[0].employee.id).toBe('emp-002');
      expect(result.resignedTotals.count).toBe(1);
      expect(result.resignedTotals.totalGrossPay).toBe(7200);
      expect(result.resignedTotals.totalDeductions).toBe(300);
      expect(result.resignedTotals.totalNetPay).toBe(6900);
    });

    it('should recalculate active totals correctly', async () => {
      vi.mocked(apiClient.get).mockImplementation((url: string) => {
        if (url === '/payroll/report/2024-03') {
          return Promise.resolve({ data: mockPayrollReport });
        }
        if (url === '/employees/resigned') {
          return Promise.resolve({ data: { employees: [mockResignedEmployee] } });
        }
        return Promise.reject(new Error('Unknown endpoint'));
      });

      const result = await payrollIntegration.getEnhancedPayrollReport('2024-03');

      // Active totals should only include emp-001
      expect(result.totals.totalGrossPay).toBe(8000);
      expect(result.totals.totalDeductions).toBe(500);
      expect(result.totals.totalNetPay).toBe(7500);
    });

    it('should handle $numberDecimal format correctly', async () => {
      const payrollWithDecimal = {
        ...mockPayrollReport,
        items: [
          {
            ...mockPayrollItems[1],
            grossPay: { $numberDecimal: '7200.50' },
            totalDeductions: { $numberDecimal: '300.25' },
            netPay: { $numberDecimal: '6900.25' },
          },
        ],
      };

      vi.mocked(apiClient.get).mockImplementation((url: string) => {
        if (url === '/payroll/report/2024-03') {
          return Promise.resolve({ data: payrollWithDecimal });
        }
        if (url === '/employees/resigned') {
          return Promise.resolve({ data: { employees: [mockResignedEmployee] } });
        }
        return Promise.reject(new Error('Unknown endpoint'));
      });

      const result = await payrollIntegration.getEnhancedPayrollReport('2024-03');

      expect(result.resignedTotals.totalGrossPay).toBe(7200.5);
      expect(result.resignedTotals.totalDeductions).toBe(300.25);
      expect(result.resignedTotals.totalNetPay).toBe(6900.25);
    });
  });

  // ============================================================================
  // removeFromPayroll Tests
  // ============================================================================

  describe('removeFromPayroll', () => {
    it('should successfully remove resigned employee from payroll', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: mockResignedEmployee });
      vi.mocked(apiClient.post).mockResolvedValue({
        data: { success: true, message: 'Employee removed successfully' },
      });

      const result: PayrollRemovalResult = await payrollIntegration.removeFromPayroll('emp-002');

      expect(result.success).toBe(true);
      expect(result.employeeId).toBe('emp-002');
      expect(result.message).toContain('removed');
      expect(vi.mocked(apiClient.post)).toHaveBeenCalledWith('/payroll/remove-employee', {
        employeeId: 'emp-002',
      });
    });

    it('should throw error if employee is not resigned', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: mockActiveEmployee });

      await expect(payrollIntegration.removeFromPayroll('emp-001')).rejects.toThrow(
        PayrollIntegrationError
      );
      await expect(payrollIntegration.removeFromPayroll('emp-001')).rejects.toThrow(
        'not resigned or terminated'
      );
    });

    it('should throw error if employee already removed', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: mockSettledEmployee });

      await expect(payrollIntegration.removeFromPayroll('emp-003')).rejects.toThrow(
        PayrollIntegrationError
      );
      await expect(payrollIntegration.removeFromPayroll('emp-003')).rejects.toThrow(
        'already been removed'
      );
    });

    it('should throw error if employee not found', async () => {
      vi.mocked(apiClient.get).mockRejectedValue({
        response: { status: 404, data: { message: 'Employee not found' } },
      });

      await expect(payrollIntegration.removeFromPayroll('emp-999')).rejects.toThrow(
        PayrollIntegrationError
      );
      await expect(payrollIntegration.removeFromPayroll('emp-999')).rejects.toThrow(
        'not found'
      );
    });
  });

  // ============================================================================
  // shouldIncludeInPayroll Tests
  // ============================================================================

  describe('shouldIncludeInPayroll', () => {
    it('should include active employees', () => {
      const result = payrollIntegration.shouldIncludeInPayroll(mockActiveEmployee);
      expect(result).toBe(true);
    });

    it('should include resigned employees pending settlement', () => {
      const result = payrollIntegration.shouldIncludeInPayroll(mockResignedEmployee);
      expect(result).toBe(true);
    });

    it('should exclude resigned employees with completed settlement', () => {
      const result = payrollIntegration.shouldIncludeInPayroll(mockSettledEmployee);
      expect(result).toBe(false);
    });

    it('should exclude terminated employees with completed settlement', () => {
      const terminatedSettled: Employee = {
        ...mockSettledEmployee,
        status: 'terminated',
        terminationType: 'termination',
      };

      const result = payrollIntegration.shouldIncludeInPayroll(terminatedSettled);
      expect(result).toBe(false);
    });

    it('should include terminated employees pending settlement', () => {
      const terminatedPending: Employee = {
        ...mockResignedEmployee,
        status: 'terminated',
        terminationType: 'termination',
      };

      const result = payrollIntegration.shouldIncludeInPayroll(terminatedPending);
      expect(result).toBe(true);
    });

    it('should exclude inactive employees', () => {
      const inactiveEmployee: Employee = {
        ...mockActiveEmployee,
        status: 'inactive',
      } as Employee;

      const result = payrollIntegration.shouldIncludeInPayroll(inactiveEmployee);
      expect(result).toBe(false);
    });
  });

  // ============================================================================
  // Error Handling Tests
  // ============================================================================

  describe('Error Handling', () => {
    it('should throw PayrollIntegrationError with correct error code', async () => {
      try {
        await payrollIntegration.getPayrollData('invalid');
      } catch (error) {
        expect(error).toBeInstanceOf(PayrollIntegrationError);
        expect((error as PayrollIntegrationError).code).toBe(
          PAYROLL_INTEGRATION_ERROR_CODES.INVALID_MONTH_FORMAT
        );
        expect((error as PayrollIntegrationError).statusCode).toBe(400);
      }
    });

    it('should handle 404 errors for payroll data not found', async () => {
      vi.mocked(apiClient.get).mockRejectedValue({
        response: { status: 404 },
      });

      await expect(payrollIntegration.getPayrollData('2024-03')).rejects.toThrow(
        PayrollIntegrationError
      );
    });

    it('should handle network errors', async () => {
      vi.mocked(apiClient.get).mockRejectedValue(new Error('Network error'));

      await expect(payrollIntegration.getPayrollData('2024-03')).rejects.toThrow(
        PayrollIntegrationError
      );
    });
  });

  // ============================================================================
  // Edge Cases Tests
  // ============================================================================

  describe('Edge Cases', () => {
    it('should handle empty resigned employees list', async () => {
      vi.mocked(apiClient.get).mockImplementation((url: string) => {
        if (url === '/payroll/report/2024-03') {
          return Promise.resolve({ data: mockPayrollReport });
        }
        if (url === '/employees/resigned') {
          return Promise.resolve({ data: { employees: [] } });
        }
        return Promise.reject(new Error('Unknown endpoint'));
      });

      const result = await payrollIntegration.getEnhancedPayrollReport('2024-03');

      expect(result.resignedEmployees).toHaveLength(0);
      expect(result.resignedTotals.count).toBe(0);
      expect(result.resignedTotals.totalGrossPay).toBe(0);
    });

    it('should handle month boundaries correctly', async () => {
      const validMonths = ['2024-01', '2024-12', '2023-06'];

      for (const month of validMonths) {
        vi.mocked(apiClient.get).mockImplementation((url: string) => {
          if (url === `/payroll/report/${month}`) {
            return Promise.resolve({ data: { ...mockPayrollReport, month } });
          }
          if (url === '/employees/resigned') {
            return Promise.resolve({ data: { employees: [] } });
          }
          return Promise.reject(new Error('Unknown endpoint'));
        });

        await expect(payrollIntegration.getPayrollData(month)).resolves.toBeDefined();
      }
    });

    it('should reject invalid month values', async () => {
      const invalidMonths = ['2024-00', '2024-13', '2024-1', '24-01', '2024/01'];

      for (const month of invalidMonths) {
        await expect(payrollIntegration.getPayrollData(month)).rejects.toThrow(
          PayrollIntegrationError
        );
      }
    });
  });
});
