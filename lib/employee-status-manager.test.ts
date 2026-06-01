/**
 * Unit tests for EmployeeStatusManager service
 * 
 * Tests the following functionality:
 * - Employee termination workflow with validation
 * - Employee rehire workflow with data restoration
 * - Activity logging for audit trail
 * - Error handling and validation
 * 
 * Validates: Requirements 1.3, 5.3, 5.5, 9.4
 */

import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  EmployeeStatusManager,
  EmployeeStatusError,
  EMPLOYEE_STATUS_ERROR_CODES,
  employeeStatusManager,
} from "./employee-status-manager";
import type { Employee } from "@/types/employee";
import type { TerminationRecord, RehireRecord } from "@/types/resignation";

// Mock the api-client module
vi.mock("./api-client", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

import apiClient from "./api-client";

// ============================================================================
// Test Fixtures
// ============================================================================

const createMockEmployee = (overrides: Partial<Employee> = {}): Employee => ({
  id: "emp-001",
  employeeId: "EMP001",
  name: "أحمد محمد",
  email: "ahmed@example.com",
  department: "الإنتاج",
  profession: "مهندس",
  status: "active",
  baseSalary: 5000,
  ...overrides,
});

const createMockTerminationRecord = (
  employeeId: string,
  type: "resignation" | "termination" = "resignation"
): TerminationRecord => ({
  id: "term-001",
  employeeId,
  terminationDate: new Date("2024-01-15"),
  terminationType: type,
  reason: "استقالة شخصية",
  processedBy: "user-001",
  createdAt: new Date(),
});

const createMockRehireRecord = (employeeId: string): RehireRecord => ({
  id: "rehire-001",
  employeeId,
  rehireDate: new Date("2024-02-01"),
  processedBy: "user-001",
  previousTerminationId: "term-001",
  createdAt: new Date(),
});

// ============================================================================
// Test Suite
// ============================================================================

describe("EmployeeStatusManager", () => {
  let manager: EmployeeStatusManager;

  beforeEach(() => {
    manager = new EmployeeStatusManager();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ==========================================================================
  // Termination Tests
  // ==========================================================================

  describe("terminateEmployee", () => {
    it("should successfully terminate an active employee", async () => {
      const mockEmployee = createMockEmployee();
      const mockTerminationRecord = createMockTerminationRecord(mockEmployee.id!);

      // Mock get employee
      vi.mocked(apiClient.get).mockResolvedValueOnce({
        data: mockEmployee,
      });

      // Mock terminate API call
      vi.mocked(apiClient.post).mockResolvedValueOnce({
        data: {
          success: true,
          message: "Employee terminated successfully",
          employee: { ...mockEmployee, status: "resigned" },
          terminationRecord: mockTerminationRecord,
        },
      });

      // Mock audit log call
      vi.mocked(apiClient.post).mockResolvedValueOnce({ data: {} });

      const result = await manager.terminateEmployee(
        mockEmployee.id!,
        {
          terminationDate: new Date("2024-01-15"),
          terminationType: "resignation",
          reason: "استقالة شخصية",
        },
        "user-001"
      );

      expect(result.employee.status).toBe("resigned");
      expect(result.terminationRecord.terminationType).toBe("resignation");
      expect(apiClient.post).toHaveBeenCalledWith("/employees/terminate", {
        employeeId: mockEmployee.id,
        terminationDate: "2024-01-15",
        terminationType: "resignation",
        reason: "استقالة شخصية",
        notes: undefined,
      });
    });

    it("should throw error when terminating non-active employee", async () => {
      const mockEmployee = createMockEmployee({ status: "resigned" });

      vi.mocked(apiClient.get).mockResolvedValueOnce({
        data: mockEmployee,
      });

      // Mock audit log call (won't be reached, but prevents errors)
      vi.mocked(apiClient.post).mockResolvedValue({ data: {} });

      try {
        await manager.terminateEmployee(
          mockEmployee.id!,
          {
            terminationDate: new Date(),
            terminationType: "resignation",
            reason: "Test reason",
          },
          "user-001"
        );
        expect.fail("Should have thrown an error");
      } catch (error) {
        expect(error).toBeInstanceOf(EmployeeStatusError);
        expect((error as EmployeeStatusError).code).toBe(
          EMPLOYEE_STATUS_ERROR_CODES.EMPLOYEE_NOT_ACTIVE
        );
      }
    });

    it("should throw error when employee not found", async () => {
      vi.mocked(apiClient.get).mockRejectedValueOnce({
        response: { status: 404 },
      });

      // Mock audit log call (won't be reached, but prevents errors)
      vi.mocked(apiClient.post).mockResolvedValue({ data: {} });

      try {
        await manager.terminateEmployee(
          "non-existent",
          {
            terminationDate: new Date(),
            terminationType: "resignation",
            reason: "Test reason",
          },
          "user-001"
        );
        expect.fail("Should have thrown an error");
      } catch (error) {
        expect(error).toBeInstanceOf(EmployeeStatusError);
        expect((error as EmployeeStatusError).code).toBe(
          EMPLOYEE_STATUS_ERROR_CODES.EMPLOYEE_NOT_FOUND
        );
      }
    });

    it("should validate termination date is not in the future", async () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);

      await expect(
        manager.terminateEmployee(
          "emp-001",
          {
            terminationDate: futureDate,
            terminationType: "resignation",
            reason: "Test reason",
          },
          "user-001"
        )
      ).rejects.toThrow(EmployeeStatusError);

      await expect(
        manager.terminateEmployee(
          "emp-001",
          {
            terminationDate: futureDate,
            terminationType: "resignation",
            reason: "Test reason",
          },
          "user-001"
        )
      ).rejects.toHaveProperty("code", EMPLOYEE_STATUS_ERROR_CODES.INVALID_TERMINATION_DATE);
    });

    it("should validate termination reason is required", async () => {
      const mockEmployee = createMockEmployee();
      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: mockEmployee });

      await expect(
        manager.terminateEmployee(
          mockEmployee.id!,
          {
            terminationDate: new Date(),
            terminationType: "resignation",
            reason: "",
          },
          "user-001"
        )
      ).rejects.toThrow("Termination reason is required");

      await expect(
        manager.terminateEmployee(
          mockEmployee.id!,
          {
            terminationDate: new Date(),
            terminationType: "resignation",
            reason: "ab",
          },
          "user-001"
        )
      ).rejects.toThrow("at least 3 characters");
    });

    it("should set status to 'terminated' for termination type", async () => {
      const mockEmployee = createMockEmployee();
      const mockTerminationRecord = createMockTerminationRecord(
        mockEmployee.id!,
        "termination"
      );

      vi.mocked(apiClient.get).mockResolvedValueOnce({
        data: mockEmployee,
      });

      vi.mocked(apiClient.post).mockResolvedValueOnce({
        data: {
          success: true,
          message: "Employee terminated successfully",
          employee: { ...mockEmployee, status: "terminated" },
          terminationRecord: mockTerminationRecord,
        },
      });

      vi.mocked(apiClient.post).mockResolvedValueOnce({ data: {} });

      const result = await manager.terminateEmployee(
        mockEmployee.id!,
        {
          terminationDate: new Date("2024-01-15"),
          terminationType: "termination",
          reason: "إخلاء طرف",
        },
        "user-001"
      );

      expect(result.employee.status).toBe("terminated");
      expect(result.terminationRecord.terminationType).toBe("termination");
    });

    it("should include notes in termination request when provided", async () => {
      const mockEmployee = createMockEmployee();
      const mockTerminationRecord = createMockTerminationRecord(mockEmployee.id!);

      vi.mocked(apiClient.get).mockResolvedValueOnce({
        data: mockEmployee,
      });

      vi.mocked(apiClient.post).mockResolvedValueOnce({
        data: {
          success: true,
          message: "Employee terminated successfully",
          employee: { ...mockEmployee, status: "resigned" },
          terminationRecord: mockTerminationRecord,
        },
      });

      vi.mocked(apiClient.post).mockResolvedValueOnce({ data: {} });

      await manager.terminateEmployee(
        mockEmployee.id!,
        {
          terminationDate: new Date("2024-01-15"),
          terminationType: "resignation",
          reason: "استقالة شخصية",
          notes: "ملاحظات إضافية",
        },
        "user-001"
      );

      expect(apiClient.post).toHaveBeenCalledWith("/employees/terminate", {
        employeeId: mockEmployee.id,
        terminationDate: "2024-01-15",
        terminationType: "resignation",
        reason: "استقالة شخصية",
        notes: "ملاحظات إضافية",
      });
    });
  });

  // ==========================================================================
  // Rehire Tests
  // ==========================================================================

  describe("rehireEmployee", () => {
    it("should successfully rehire a resigned employee", async () => {
      const mockEmployee = createMockEmployee({ status: "resigned" });
      const mockRehireRecord = createMockRehireRecord(mockEmployee.id!);
      
      // Use today's date for rehire to avoid validation errors
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];

      vi.mocked(apiClient.get).mockResolvedValueOnce({
        data: mockEmployee,
      });

      vi.mocked(apiClient.post).mockResolvedValueOnce({
        data: {
          success: true,
          message: "Employee rehired successfully",
          employee: { ...mockEmployee, status: "active", rehireDate: todayStr },
          rehireRecord: mockRehireRecord,
        },
      });

      vi.mocked(apiClient.post).mockResolvedValueOnce({ data: {} });

      const result = await manager.rehireEmployee(
        mockEmployee.id!,
        {
          rehireDate: today,
          restorePreviousSettings: true,
        },
        "user-001"
      );

      expect(result.employee.status).toBe("active");
      expect(result.rehireRecord.rehireDate).toEqual(new Date("2024-02-01"));
      expect(apiClient.post).toHaveBeenCalledWith("/employees/rehire", {
        employeeId: mockEmployee.id,
        rehireDate: todayStr,
        notes: undefined,
        restorePreviousSettings: true,
      });
    });

    it("should successfully rehire a terminated employee", async () => {
      const mockEmployee = createMockEmployee({ status: "terminated" });
      const mockRehireRecord = createMockRehireRecord(mockEmployee.id!);
      
      // Use today's date for rehire to avoid validation errors
      const today = new Date();

      vi.mocked(apiClient.get).mockResolvedValueOnce({
        data: mockEmployee,
      });

      vi.mocked(apiClient.post).mockResolvedValueOnce({
        data: {
          success: true,
          message: "Employee rehired successfully",
          employee: { ...mockEmployee, status: "active" },
          rehireRecord: mockRehireRecord,
        },
      });

      vi.mocked(apiClient.post).mockResolvedValueOnce({ data: {} });

      const result = await manager.rehireEmployee(
        mockEmployee.id!,
        {
          rehireDate: today,
          restorePreviousSettings: false,
        },
        "user-001"
      );

      expect(result.employee.status).toBe("active");
    });

    it("should throw error when rehiring active employee", async () => {
      const mockEmployee = createMockEmployee({ status: "active" });
      
      // Use today's date for rehire
      const today = new Date();

      // Mock for first call
      vi.mocked(apiClient.get).mockResolvedValueOnce({
        data: mockEmployee,
      });

      await expect(
        manager.rehireEmployee(
          mockEmployee.id!,
          {
            rehireDate: today,
            restorePreviousSettings: true,
          },
          "user-001"
        )
      ).rejects.toThrow(EmployeeStatusError);

      // Mock for second call
      vi.mocked(apiClient.get).mockResolvedValueOnce({
        data: mockEmployee,
      });

      await expect(
        manager.rehireEmployee(
          mockEmployee.id!,
          {
            rehireDate: today,
            restorePreviousSettings: true,
          },
          "user-001"
        )
      ).rejects.toHaveProperty(
        "code",
        EMPLOYEE_STATUS_ERROR_CODES.EMPLOYEE_NOT_ELIGIBLE_FOR_REHIRE
      );
    });

    it("should validate rehire date is not too far in the past", async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 5); // 5 days ago

      await expect(
        manager.rehireEmployee(
          "emp-001",
          {
            rehireDate: pastDate,
            restorePreviousSettings: true,
          },
          "user-001"
        )
      ).rejects.toThrow(EmployeeStatusError);

      await expect(
        manager.rehireEmployee(
          "emp-001",
          {
            rehireDate: pastDate,
            restorePreviousSettings: true,
          },
          "user-001"
        )
      ).rejects.toHaveProperty("code", EMPLOYEE_STATUS_ERROR_CODES.INVALID_REHIRE_DATE);
    });

    it("should allow rehire date up to 1 day in the past", async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(12, 0, 0, 0);

      const mockEmployee = createMockEmployee({ status: "resigned" });
      const mockRehireRecord = createMockRehireRecord(mockEmployee.id!);

      vi.mocked(apiClient.get).mockResolvedValueOnce({
        data: mockEmployee,
      });

      vi.mocked(apiClient.post).mockResolvedValueOnce({
        data: {
          success: true,
          message: "Employee rehired successfully",
          employee: { ...mockEmployee, status: "active" },
          rehireRecord: mockRehireRecord,
        },
      });

      vi.mocked(apiClient.post).mockResolvedValueOnce({ data: {} });

      // Should not throw
      const result = await manager.rehireEmployee(
        mockEmployee.id!,
        {
          rehireDate: yesterday,
          restorePreviousSettings: true,
        },
        "user-001"
      );

      expect(result.employee.status).toBe("active");
    });

    it("should include notes in rehire request when provided", async () => {
      const mockEmployee = createMockEmployee({ status: "resigned" });
      const mockRehireRecord = createMockRehireRecord(mockEmployee.id!);
      
      // Use today's date for rehire to avoid validation errors
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];

      vi.mocked(apiClient.get).mockResolvedValueOnce({
        data: mockEmployee,
      });

      vi.mocked(apiClient.post).mockResolvedValueOnce({
        data: {
          success: true,
          message: "Employee rehired successfully",
          employee: { ...mockEmployee, status: "active" },
          rehireRecord: mockRehireRecord,
        },
      });

      vi.mocked(apiClient.post).mockResolvedValueOnce({ data: {} });

      await manager.rehireEmployee(
        mockEmployee.id!,
        {
          rehireDate: today,
          restorePreviousSettings: true,
          notes: "إعادة تعيين بعد موافقة الإدارة",
        },
        "user-001"
      );

      expect(apiClient.post).toHaveBeenCalledWith("/employees/rehire", {
        employeeId: mockEmployee.id,
        rehireDate: todayStr,
        notes: "إعادة تعيين بعد موافقة الإدارة",
        restorePreviousSettings: true,
      });
    });
  });

  // ==========================================================================
  // Activity Logging Tests
  // ==========================================================================

  describe("activity logging", () => {
    it("should log termination activity", async () => {
      const mockEmployee = createMockEmployee();
      const mockTerminationRecord = createMockTerminationRecord(mockEmployee.id!);

      vi.mocked(apiClient.get).mockResolvedValueOnce({
        data: mockEmployee,
      });

      vi.mocked(apiClient.post).mockResolvedValueOnce({
        data: {
          success: true,
          message: "Employee terminated successfully",
          employee: { ...mockEmployee, status: "resigned" },
          terminationRecord: mockTerminationRecord,
        },
      });

      vi.mocked(apiClient.post).mockResolvedValueOnce({ data: {} });

      await manager.terminateEmployee(
        mockEmployee.id!,
        {
          terminationDate: new Date("2024-01-15"),
          terminationType: "resignation",
          reason: "استقالة شخصية",
        },
        "user-001"
      );

      const activityLog = manager.getActivityLog();
      expect(activityLog.length).toBe(1);
      expect(activityLog[0].action).toBe("EMPLOYEE_TERMINATED");
      expect(activityLog[0].employeeId).toBe(mockEmployee.id);
      expect(activityLog[0].performedBy).toBe("user-001");
    });

    it("should log rehire activity", async () => {
      const mockEmployee = createMockEmployee({ status: "resigned" });
      const mockRehireRecord = createMockRehireRecord(mockEmployee.id!);
      
      // Use today's date for rehire to avoid validation errors
      const today = new Date();

      vi.mocked(apiClient.get).mockResolvedValueOnce({
        data: mockEmployee,
      });

      vi.mocked(apiClient.post).mockResolvedValueOnce({
        data: {
          success: true,
          message: "Employee rehired successfully",
          employee: { ...mockEmployee, status: "active" },
          rehireRecord: mockRehireRecord,
        },
      });

      vi.mocked(apiClient.post).mockResolvedValueOnce({ data: {} });

      await manager.rehireEmployee(
        mockEmployee.id!,
        {
          rehireDate: today,
          restorePreviousSettings: true,
        },
        "user-001"
      );

      const activityLog = manager.getActivityLog();
      expect(activityLog.length).toBe(1);
      expect(activityLog[0].action).toBe("EMPLOYEE_REHIRED");
      expect(activityLog[0].employeeId).toBe(mockEmployee.id);
      expect(activityLog[0].performedBy).toBe("user-001");
    });

    it("should include details in activity log entries", async () => {
      const mockEmployee = createMockEmployee();
      const mockTerminationRecord = createMockTerminationRecord(mockEmployee.id!);

      vi.mocked(apiClient.get).mockResolvedValueOnce({
        data: mockEmployee,
      });

      vi.mocked(apiClient.post).mockResolvedValueOnce({
        data: {
          success: true,
          message: "Employee terminated successfully",
          employee: { ...mockEmployee, status: "resigned" },
          terminationRecord: mockTerminationRecord,
        },
      });

      vi.mocked(apiClient.post).mockResolvedValueOnce({ data: {} });

      await manager.terminateEmployee(
        mockEmployee.id!,
        {
          terminationDate: new Date("2024-01-15"),
          terminationType: "resignation",
          reason: "استقالة شخصية",
        },
        "user-001"
      );

      const activityLog = manager.getActivityLog();
      expect(activityLog[0].details).toHaveProperty("terminationType");
      expect(activityLog[0].details).toHaveProperty("reason");
      expect(activityLog[0].details).toHaveProperty("processedBy");
    });

    it("should clear activity log", async () => {
      const mockEmployee = createMockEmployee();
      const mockTerminationRecord = createMockTerminationRecord(mockEmployee.id!);

      vi.mocked(apiClient.get).mockResolvedValueOnce({
        data: mockEmployee,
      });

      vi.mocked(apiClient.post).mockResolvedValueOnce({
        data: {
          success: true,
          message: "Employee terminated successfully",
          employee: { ...mockEmployee, status: "resigned" },
          terminationRecord: mockTerminationRecord,
        },
      });

      vi.mocked(apiClient.post).mockResolvedValueOnce({ data: {} });

      await manager.terminateEmployee(
        mockEmployee.id!,
        {
          terminationDate: new Date("2024-01-15"),
          terminationType: "resignation",
          reason: "استقالة شخصية",
        },
        "user-001"
      );

      expect(manager.getActivityLog().length).toBe(1);
      manager.clearActivityLog();
      expect(manager.getActivityLog().length).toBe(0);
    });
  });

  // ==========================================================================
  // Error Handling Tests
  // ==========================================================================

  describe("error handling", () => {
    it("should handle API errors gracefully", async () => {
      vi.mocked(apiClient.get).mockRejectedValueOnce({
        response: {
          data: { message: "Internal server error" },
          status: 500,
        },
      });

      await expect(
        manager.terminateEmployee(
          "emp-001",
          {
            terminationDate: new Date(),
            terminationType: "resignation",
            reason: "Test reason",
          },
          "user-001"
        )
      ).rejects.toThrow(EmployeeStatusError);
    });

    it("should preserve API error message in thrown error", async () => {
      vi.mocked(apiClient.get).mockResolvedValueOnce({
        data: createMockEmployee(),
      });

      vi.mocked(apiClient.post).mockRejectedValueOnce({
        response: {
          data: { message: "Employee has pending advances" },
          status: 400,
        },
      });

      await expect(
        manager.terminateEmployee(
          "emp-001",
          {
            terminationDate: new Date(),
            terminationType: "resignation",
            reason: "Test reason",
          },
          "user-001"
        )
      ).rejects.toThrow("Employee has pending advances");
    });

    it("should throw error for missing termination date", async () => {
      await expect(
        manager.terminateEmployee(
          "emp-001",
          {
            terminationDate: undefined as unknown as Date,
            terminationType: "resignation",
            reason: "Test reason",
          },
          "user-001"
        )
      ).rejects.toThrow("Termination date is required");
    });

    it("should throw error for missing rehire date", async () => {
      await expect(
        manager.rehireEmployee(
          "emp-001",
          {
            rehireDate: undefined as unknown as Date,
            restorePreviousSettings: true,
          },
          "user-001"
        )
      ).rejects.toThrow("Rehire date is required");
    });
  });

  // ==========================================================================
  // Singleton Instance Tests
  // ==========================================================================

  describe("singleton instance", () => {
    it("should export a singleton instance", () => {
      expect(employeeStatusManager).toBeInstanceOf(EmployeeStatusManager);
    });

    it("should have all methods available on singleton", () => {
      expect(typeof employeeStatusManager.terminateEmployee).toBe("function");
      expect(typeof employeeStatusManager.rehireEmployee).toBe("function");
      expect(typeof employeeStatusManager.getActivityLog).toBe("function");
      expect(typeof employeeStatusManager.clearActivityLog).toBe("function");
    });
  });
});
