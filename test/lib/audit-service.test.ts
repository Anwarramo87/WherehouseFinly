/**
 * AuditService Unit Tests
 * 
 * Tests for the centralized audit logging service.
 * Validates Requirement 9.4: Audit trail for all termination and rehire operations.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { AuditUserContext } from '@/types/audit';

describe('AuditService', () => {
  // Create a fresh instance for each test
  let service: typeof import('@/lib/audit-service').auditService;
  let mockPost: ReturnType<typeof vi.fn>;
  let mockGet: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    // Clear module cache to get fresh instance
    vi.resetModules();
    
    // Create mock functions
    mockPost = vi.fn().mockResolvedValue({ data: { success: true } });
    mockGet = vi.fn().mockResolvedValue({
      data: {
        success: true,
        auditLogs: [],
        pagination: { total: 0, page: 1, limit: 50, totalPages: 0 },
      },
    });

    // Mock the api-client module
    vi.doMock('@/lib/api-client', () => ({
      default: {
        post: mockPost,
        get: mockGet,
      },
    }));

    // Import the service after mocking
    const moduleImport = await import('@/lib/audit-service');
    service = moduleImport.auditService;
    service.clearInMemoryLog();
  });

  describe('logTermination', () => {
    it('should create audit log entry for employee termination', async () => {
      const userContext: AuditUserContext = {
        userId: 'user-123',
        userName: 'John Doe',
        userRole: 'hr_manager',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
      };

      const details = {
        terminationType: 'resignation' as const,
        reason: 'Personal reasons',
        terminationDate: new Date('2024-01-15'),
        notes: 'Voluntary resignation',
      };

      await service.logTermination('emp-456', 'Jane Smith', userContext, details);

      // The durable trail is written server-side by the endpoint that performs
      // the termination. This service no longer posts one: the route it used to
      // call authorised on a header the client never sent, so every write was
      // rejected and swallowed. What it still owes is the in-session record the
      // screens read back immediately.
      expect(mockPost).not.toHaveBeenCalled();
      expect(service.getRecentEntries()).toContainEqual(
        expect.objectContaining({
          action: 'EMPLOYEE_TERMINATED',
          employeeId: 'emp-456',
          employeeName: 'Jane Smith',
          performedBy: 'user-123',
        }),
      );
    });

    it('should handle termination without optional details', async () => {
      const userContext: AuditUserContext = {
        userId: 'user-123',
        userName: 'John Doe',
        userRole: 'hr_manager',
      };

      await service.logTermination('emp-456', 'Jane Smith', userContext);

      expect(service.getRecentEntries()).toHaveLength(1);
    });
  });

  describe('logRehire', () => {
    it('should create audit log entry for employee rehire', async () => {
      const userContext: AuditUserContext = {
        userId: 'user-123',
        userName: 'John Doe',
        userRole: 'hr_manager',
        ipAddress: '192.168.1.1',
      };

      const details = {
        rehireDate: new Date('2024-02-01'),
        restorePreviousSettings: true,
        previousTerminationDate: new Date('2024-01-15'),
      };

      await service.logRehire('emp-456', 'Jane Smith', userContext, details);

      expect(service.getRecentEntries()).toContainEqual(
        expect.objectContaining({
          action: 'EMPLOYEE_REHIRED',
          employeeId: 'emp-456',
          employeeName: 'Jane Smith',
          performedBy: 'user-123',
        }),
      );
    });
  });

  describe('logFinancialSettlement', () => {
    it('should create audit log entry for financial settlement', async () => {
      const userContext: AuditUserContext = {
        userId: 'user-789',
        userName: 'Alice Johnson',
        userRole: 'accountant',
        ipAddress: '192.168.1.2',
      };

      const details = {
        settlementAmount: 5000,
        finalSalaryAmount: 3000,
        deductions: 500,
        bonuses: 2500,
        settlementDate: new Date('2024-01-20'),
      };

      await service.logFinancialSettlement('emp-456', 'Jane Smith', userContext, details);

      expect(service.getRecentEntries()).toContainEqual(
        expect.objectContaining({
          action: 'FINANCIAL_SETTLEMENT_COMPLETED',
          employeeId: 'emp-456',
          employeeName: 'Jane Smith',
          performedBy: 'user-789',
        }),
      );
    });
  });

  describe('getEmployeeAuditTrail', () => {
    it('should return audit logs for specific employee', async () => {
      // The backend's own row shape: it audits every kind of change, so it
      // speaks actor/target rather than this module's HR vocabulary.
      const createdAt = new Date('2026-01-15T10:00:00.000Z');
      mockGet.mockResolvedValueOnce({
        data: {
          success: true,
          auditLogs: [
            {
              id: 'audit-1',
              action: 'employee.terminate',
              actorId: 'user-123',
              actorUsername: 'John Doe',
              targetType: 'employee',
              targetId: 'emp-456',
              ipAddress: '192.168.1.1',
              userAgent: 'Mozilla/5.0',
              metadata: { employeeName: 'Jane Smith', userRole: 'hr_manager' },
              createdAt: createdAt.toISOString(),
            },
          ],
          pagination: { total: 1, page: 1, limit: 50, totalPages: 1 },
        },
      });

      const result = await service.getEmployeeAuditTrail('emp-456');

      // An employee filter has to go out as the backend's (targetType, targetId)
      // pair: its DTO whitelists query parameters, so `employeeId` would be a
      // 400 rather than a filter it quietly ignored.
      expect(mockGet).toHaveBeenCalledWith('/audit-log', {
        params: expect.objectContaining({
          targetType: 'employee',
          targetId: 'emp-456',
          limit: 50,
          sortBy: 'timestamp',
          sortOrder: 'desc',
        }),
      });
      expect(result).toEqual([
        {
          id: 'audit-1',
          action: 'EMPLOYEE_TERMINATED',
          employeeId: 'emp-456',
          employeeName: 'Jane Smith',
          performedBy: 'user-123',
          performedByName: 'John Doe',
          userRole: 'hr_manager',
          timestamp: createdAt,
          details: { employeeName: 'Jane Smith', userRole: 'hr_manager' },
          notes: undefined,
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
        },
      ]);
    });

    it('should return in-memory logs when API fails', async () => {
      mockGet.mockRejectedValueOnce(new Error('API error'));

      // Add some in-memory logs first
      service.clearInMemoryLog();
      await service.logTermination('emp-456', 'Jane Smith', {
        userId: 'user-123',
        userName: 'John Doe',
        userRole: 'hr_manager',
      });

      const result = await service.getEmployeeAuditTrail('emp-456');

      expect(result.length).toBeGreaterThan(0);
      expect(result[0].employeeId).toBe('emp-456');
    });
  });

  describe('getRecentEntries', () => {
    it('should return recent audit log entries', async () => {
      // Add some entries with a small delay to ensure different timestamps
      await service.logTermination('emp-1', 'Employee 1', {
        userId: 'user-1',
        userName: 'User 1',
        userRole: 'hr_manager',
      });

      // Small delay to ensure different timestamp
      await new Promise(resolve => setTimeout(resolve, 10));

      await service.logTermination('emp-2', 'Employee 2', {
        userId: 'user-2',
        userName: 'User 2',
        userRole: 'hr_manager',
      });

      const recent = service.getRecentEntries(10);

      expect(recent.length).toBe(2);
      // Should be sorted by timestamp descending (most recent first)
      expect(recent[0].employeeName).toBe('Employee 2');
    });

    it('should respect limit parameter', async () => {
      // Add 5 entries
      for (let i = 0; i < 5; i++) {
        await service.logTermination(`emp-${i}`, `Employee ${i}`, {
          userId: 'user-1',
          userName: 'User 1',
          userRole: 'hr_manager',
        });
      }

      const recent = service.getRecentEntries(3);

      expect(recent.length).toBe(3);
    });
  });

  describe('createAuditUserContextWithData', () => {
    it('should create user context with provided data', async () => {
      const { createAuditUserContextWithData } = await import('@/lib/audit-service');
      const context = createAuditUserContextWithData('user-123', 'John Doe', 'hr_manager');

      expect(context.userId).toBe('user-123');
      expect(context.userName).toBe('John Doe');
      expect(context.userRole).toBe('hr_manager');
      expect(context.ipAddress).toBe('client');
      expect(context.userAgent).toBeDefined();
    });
  });

  describe('error handling', () => {
    it('should not throw when API call fails', async () => {
      mockPost.mockRejectedValueOnce(new Error('Network error'));

      // Should not throw
      await expect(
        service.logTermination('emp-456', 'Jane Smith', {
          userId: 'user-123',
          userName: 'John Doe',
          userRole: 'hr_manager',
        })
      ).resolves.not.toThrow();
    });

    it('should still store in memory when API fails', async () => {
      mockPost.mockRejectedValue(new Error('Network error'));

      await service.logTermination('emp-456', 'Jane Smith', {
        userId: 'user-123',
        userName: 'John Doe',
        userRole: 'hr_manager',
      });

      const recent = service.getRecentEntries(1);
      expect(recent.length).toBe(1);
      expect(recent[0].employeeId).toBe('emp-456');
    });
  });
});