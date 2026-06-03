/**
 * Unit tests for FinancialSettlementManager service
 * 
 * Tests the following functionality:
 * - Financial settlement processing with calculation logic
 * - Settlement validation and status updates
 * - Integration with payroll removal functionality
 * - Activity logging for audit trail
 * - Error handling and validation
 * 
 * Validates: Requirements 2.3, 6.5, 8.4
 */

import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  FinancialSettlementManager,
  FinancialSettlementError,
  FINANCIAL_SETTLEMENT_ERROR_CODES,
  financialSettlementManager,
} from "./financial-settlement-manager";
import type { Employee } from "@/types/employee";
import type { FinancialSettlement } from "@/types/resignation";

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
  status: "resigned",
  baseSalary: 5000,
  financialSettlementStatus: "pending",
  isFinanciallySettled: false,
  ...overrides,
});

const createMockSettlement = (
  employeeId: string,
  overrides: Partial<FinancialSettlement> = {}
): FinancialSettlement => ({
  id: "settlement-001",
  employeeId,
  settlementDate: new Date("2024-01-20"),
  processedBy: "user-001",
  finalSalaryAmount: 5000,
  deductions: 500,
  bonuses: 1000,
  totalSettlement: 5500,
  status: "completed",
  createdAt: new Date(),
  ...overrides,
});

// ============================================================================
// Test Suite
// ============================================================================

describe("FinancialSettlementManager", () => {
  let manager: FinancialSettlementManager;

  beforeEach(() => {
    manager = new FinancialSettlementManager();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ==========================================================================
  // Settlement Processing Tests
  // ==========================================================================

  describe("processSettlement", () => {
    it("should successfully process settlement for resigned employee", async () => {
      const mockEmployee = createMockEmployee();
      const mockSettlement = createMockSettlement(mockEmployee.id!);

      // Mock get employee
      vi.mocked(apiClient.get).mockResolvedValueOnce({
        data: mockEmployee,
      });

      // Mock settlement API call
      vi.mocked(apiClient.post).mockResolvedValueOnce({
        data: {
          success: true,
          message: "Financial settlement processed successfully",
          settlement: mockSettlement,
        },
      });

      // Mock audit log call
      vi.mocked(apiClient.post).mockResolvedValueOnce({ data: {} });

      const result = await manager.processSettlement(
        mockEmployee.id!,
        {
          settlementDate: new Date("2024-01-20"),
          finalSalaryAmount: 5000,
          deductions: 500,
          bonuses: 1000,
        },
        "user-001"
      );

      expect(result.settlement.totalSettlement).toBe(5500);
      expect(result.settlement.status).toBe("completed");
      expect(apiClient.post).toHaveBeenCalledWith("/employees/financial-settlement", {
        employeeId: mockEmployee.id,
        settlementDate: "2024-01-20",
        finalSalaryAmount: 5000,
        deductions: 500,
        bonuses: 1000,
        notes: undefined,
      });
    });

    it("should successfully process settlement for terminated employee", async () => {
      const mockEmployee = createMockEmployee({ status: "terminated" });
      const mockSettlement = createMockSettlement(mockEmployee.id!);

      vi.mocked(apiClient.get).mockResolvedValueOnce({
        data: mockEmployee,
      });

      vi.mocked(apiClient.post).mockResolvedValueOnce({
        data: {
          success: true,
          message: "Financial settlement processed successfully",
          settlement: mockSettlement,
        },
      });

      vi.mocked(apiClient.post).mockResolvedValueOnce({ data: {} });

      const result = await manager.processSettlement(
        mockEmployee.id!,
        {
          settlementDate: new Date("2024-01-20"),
          finalSalaryAmount: 5000,
          deductions: 500,
          bonuses: 1000,
        },
        "user-001"
      );

      expect(result.settlement.status).toBe("completed");
    });

    it("should throw error when processing settlement for active employee", async () => {
      const mockEmployee = createMockEmployee({ status: "active" });

      vi.mocked(apiClient.get).mockResolvedValue({
        data: mockEmployee,
      });

      await expect(
        manager.processSettlement(
          mockEmployee.id!,
          {
            settlementDate: new Date(),
            finalSalaryAmount: 5000,
            deductions: 0,
            bonuses: 0,
          },
          "user-001"
        )
      ).rejects.toThrow(FinancialSettlementError);

      await expect(
        manager.processSettlement(
          mockEmployee.id!,
          {
            settlementDate: new Date(),
            finalSalaryAmount: 5000,
            deductions: 0,
            bonuses: 0,
          },
          "user-001"
        )
      ).rejects.toHaveProperty("code", FINANCIAL_SETTLEMENT_ERROR_CODES.EMPLOYEE_NOT_ELIGIBLE);
    });

    it("should throw error when settlement already processed", async () => {
      const mockEmployee = createMockEmployee({
        financialSettlementStatus: "completed",
        isFinanciallySettled: true,
      });

      vi.mocked(apiClient.get).mockResolvedValue({
        data: mockEmployee,
      });

      await expect(
        manager.processSettlement(
          mockEmployee.id!,
          {
            settlementDate: new Date(),
            finalSalaryAmount: 5000,
            deductions: 0,
            bonuses: 0,
          },
          "user-001"
        )
      ).rejects.toThrow("already been processed");

      await expect(
        manager.processSettlement(
          mockEmployee.id!,
          {
            settlementDate: new Date(),
            finalSalaryAmount: 5000,
            deductions: 0,
            bonuses: 0,
          },
          "user-001"
        )
      ).rejects.toHaveProperty(
        "code",
        FINANCIAL_SETTLEMENT_ERROR_CODES.SETTLEMENT_ALREADY_PROCESSED
      );
    });

    it("should throw error when employee not found", async () => {
      vi.mocked(apiClient.get).mockRejectedValue({
        response: { status: 404 },
      });

      await expect(
        manager.processSettlement(
          "non-existent",
          {
            settlementDate: new Date(),
            finalSalaryAmount: 5000,
            deductions: 0,
            bonuses: 0,
          },
          "user-001"
        )
      ).rejects.toThrow(FinancialSettlementError);

      await expect(
        manager.processSettlement(
          "non-existent",
          {
            settlementDate: new Date(),
            finalSalaryAmount: 5000,
            deductions: 0,
            bonuses: 0,
          },
          "user-001"
        )
      ).rejects.toHaveProperty("code", FINANCIAL_SETTLEMENT_ERROR_CODES.EMPLOYEE_NOT_FOUND);
    });

    it("should include notes in settlement request when provided", async () => {
      const mockEmployee = createMockEmployee();
      const mockSettlement = createMockSettlement(mockEmployee.id!);

      vi.mocked(apiClient.get).mockResolvedValueOnce({
        data: mockEmployee,
      });

      vi.mocked(apiClient.post).mockResolvedValueOnce({
        data: {
          success: true,
          message: "Financial settlement processed successfully",
          settlement: mockSettlement,
        },
      });

      vi.mocked(apiClient.post).mockResolvedValueOnce({ data: {} });

      await manager.processSettlement(
        mockEmployee.id!,
        {
          settlementDate: new Date("2024-01-20"),
          finalSalaryAmount: 5000,
          deductions: 500,
          bonuses: 1000,
          notes: "تصفية نهائية بعد خصم السلف",
        },
        "user-001"
      );

      expect(apiClient.post).toHaveBeenCalledWith("/employees/financial-settlement", {
        employeeId: mockEmployee.id,
        settlementDate: "2024-01-20",
        finalSalaryAmount: 5000,
        deductions: 500,
        bonuses: 1000,
        notes: "تصفية نهائية بعد خصم السلف",
      });
    });
  });

  // ==========================================================================
  // Calculation Tests
  // ==========================================================================

  describe("calculateTotalSettlement", () => {
    it("should correctly calculate total settlement with bonuses and deductions", () => {
      const total = manager.calculateTotalSettlement(5000, 1000, 500);
      expect(total).toBe(5500); // 5000 + 1000 - 500
    });

    it("should handle zero bonuses", () => {
      const total = manager.calculateTotalSettlement(5000, 0, 500);
      expect(total).toBe(4500); // 5000 + 0 - 500
    });

    it("should handle zero deductions", () => {
      const total = manager.calculateTotalSettlement(5000, 1000, 0);
      expect(total).toBe(6000); // 5000 + 1000 - 0
    });

    it("should handle zero bonuses and deductions", () => {
      const total = manager.calculateTotalSettlement(5000, 0, 0);
      expect(total).toBe(5000); // 5000 + 0 - 0
    });

    it("should handle large deductions", () => {
      const total = manager.calculateTotalSettlement(5000, 0, 3000);
      expect(total).toBe(2000); // 5000 + 0 - 3000
    });

    it("should allow negative total when deductions exceed salary", () => {
      const total = manager.calculateTotalSettlement(5000, 0, 6000);
      expect(total).toBe(-1000); // 5000 + 0 - 6000
    });

    it("should handle decimal amounts correctly", () => {
      const total = manager.calculateTotalSettlement(5000.50, 1000.25, 500.75);
      expect(total).toBe(5500); // 5000.50 + 1000.25 - 500.75
    });
  });

  // ==========================================================================
  // Validation Tests
  // ==========================================================================

  describe("settlement validation", () => {
    it("should validate settlement date is required", async () => {
      await expect(
        manager.processSettlement(
          "emp-001",
          {
            settlementDate: undefined as unknown as Date,
            finalSalaryAmount: 5000,
            deductions: 0,
            bonuses: 0,
          },
          "user-001"
        )
      ).rejects.toThrow("Settlement date is required");
    });

    it("should validate settlement date is not in the future", async () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);

      await expect(
        manager.processSettlement(
          "emp-001",
          {
            settlementDate: futureDate,
            finalSalaryAmount: 5000,
            deductions: 0,
            bonuses: 0,
          },
          "user-001"
        )
      ).rejects.toThrow("Settlement date cannot be in the future");

      await expect(
        manager.processSettlement(
          "emp-001",
          {
            settlementDate: futureDate,
            finalSalaryAmount: 5000,
            deductions: 0,
            bonuses: 0,
          },
          "user-001"
        )
      ).rejects.toHaveProperty("code", FINANCIAL_SETTLEMENT_ERROR_CODES.INVALID_SETTLEMENT_DATE);
    });

    it("should validate final salary amount is required", async () => {
      await expect(
        manager.processSettlement(
          "emp-001",
          {
            settlementDate: new Date(),
            finalSalaryAmount: undefined as unknown as number,
            deductions: 0,
            bonuses: 0,
          },
          "user-001"
        )
      ).rejects.toThrow("Final salary amount is required");
    });

    it("should validate final salary amount is not negative", async () => {
      await expect(
        manager.processSettlement(
          "emp-001",
          {
            settlementDate: new Date(),
            finalSalaryAmount: -1000,
            deductions: 0,
            bonuses: 0,
          },
          "user-001"
        )
      ).rejects.toThrow("Final salary amount cannot be negative");

      await expect(
        manager.processSettlement(
          "emp-001",
          {
            settlementDate: new Date(),
            finalSalaryAmount: -1000,
            deductions: 0,
            bonuses: 0,
          },
          "user-001"
        )
      ).rejects.toHaveProperty("code", FINANCIAL_SETTLEMENT_ERROR_CODES.INVALID_SETTLEMENT_AMOUNT);
    });

    it("should validate deductions are required", async () => {
      await expect(
        manager.processSettlement(
          "emp-001",
          {
            settlementDate: new Date(),
            finalSalaryAmount: 5000,
            deductions: undefined as unknown as number,
            bonuses: 0,
          },
          "user-001"
        )
      ).rejects.toThrow("Deductions amount is required");
    });

    it("should validate deductions are not negative", async () => {
      await expect(
        manager.processSettlement(
          "emp-001",
          {
            settlementDate: new Date(),
            finalSalaryAmount: 5000,
            deductions: -500,
            bonuses: 0,
          },
          "user-001"
        )
      ).rejects.toThrow("Deductions cannot be negative");
    });

    it("should validate bonuses are required", async () => {
      await expect(
        manager.processSettlement(
          "emp-001",
          {
            settlementDate: new Date(),
            finalSalaryAmount: 5000,
            deductions: 0,
            bonuses: undefined as unknown as number,
          },
          "user-001"
        )
      ).rejects.toThrow("Bonuses amount is required");
    });

    it("should validate bonuses are not negative", async () => {
      await expect(
        manager.processSettlement(
          "emp-001",
          {
            settlementDate: new Date(),
            finalSalaryAmount: 5000,
            deductions: 0,
            bonuses: -1000,
          },
          "user-001"
        )
      ).rejects.toThrow("Bonuses cannot be negative");
    });

    it("should reject negative total settlement", async () => {
      const mockEmployee = createMockEmployee();

      vi.mocked(apiClient.get).mockResolvedValueOnce({
        data: mockEmployee,
      });

      await expect(
        manager.processSettlement(
          mockEmployee.id!,
          {
            settlementDate: new Date(),
            finalSalaryAmount: 5000,
            deductions: 6000,
            bonuses: 0,
          },
          "user-001"
        )
      ).rejects.toThrow("Total settlement amount cannot be negative");

      vi.mocked(apiClient.get).mockResolvedValueOnce({
        data: mockEmployee,
      });

      await expect(
        manager.processSettlement(
          mockEmployee.id!,
          {
            settlementDate: new Date(),
            finalSalaryAmount: 5000,
            deductions: 6000,
            bonuses: 0,
          },
          "user-001"
        )
      ).rejects.toHaveProperty(
        "code",
        FINANCIAL_SETTLEMENT_ERROR_CODES.NEGATIVE_TOTAL_SETTLEMENT
      );
    });

    it("should allow zero final salary amount", async () => {
      const mockEmployee = createMockEmployee();
      const mockSettlement = createMockSettlement(mockEmployee.id!, {
        finalSalaryAmount: 0,
        deductions: 0,
        bonuses: 0,
        totalSettlement: 0,
      });

      vi.mocked(apiClient.get).mockResolvedValueOnce({
        data: mockEmployee,
      });

      vi.mocked(apiClient.post).mockResolvedValueOnce({
        data: {
          success: true,
          message: "Financial settlement processed successfully",
          settlement: mockSettlement,
        },
      });

      vi.mocked(apiClient.post).mockResolvedValueOnce({ data: {} });

      const result = await manager.processSettlement(
        mockEmployee.id!,
        {
          settlementDate: new Date(),
          finalSalaryAmount: 0,
          deductions: 0,
          bonuses: 0,
        },
        "user-001"
      );

      expect(result.settlement.totalSettlement).toBe(0);
    });
  });

  // ==========================================================================
  // Activity Logging Tests
  // ==========================================================================

  describe("activity logging", () => {
    it("should log settlement activity", async () => {
      const mockEmployee = createMockEmployee();
      const mockSettlement = createMockSettlement(mockEmployee.id!);

      vi.mocked(apiClient.get).mockResolvedValueOnce({
        data: mockEmployee,
      });

      vi.mocked(apiClient.post).mockResolvedValueOnce({
        data: {
          success: true,
          message: "Financial settlement processed successfully",
          settlement: mockSettlement,
        },
      });

      vi.mocked(apiClient.post).mockResolvedValueOnce({ data: {} });

      await manager.processSettlement(
        mockEmployee.id!,
        {
          settlementDate: new Date("2024-01-20"),
          finalSalaryAmount: 5000,
          deductions: 500,
          bonuses: 1000,
        },
        "user-001"
      );

      const activityLog = manager.getActivityLog();
      expect(activityLog.length).toBe(1);
      expect(activityLog[0].action).toBe("FINANCIAL_SETTLEMENT_COMPLETED");
      expect(activityLog[0].employeeId).toBe(mockEmployee.id);
      expect(activityLog[0].performedBy).toBe("user-001");
    });

    it("should include settlement details in activity log", async () => {
      const mockEmployee = createMockEmployee();
      const mockSettlement = createMockSettlement(mockEmployee.id!);

      vi.mocked(apiClient.get).mockResolvedValueOnce({
        data: mockEmployee,
      });

      vi.mocked(apiClient.post).mockResolvedValueOnce({
        data: {
          success: true,
          message: "Financial settlement processed successfully",
          settlement: mockSettlement,
        },
      });

      vi.mocked(apiClient.post).mockResolvedValueOnce({ data: {} });

      await manager.processSettlement(
        mockEmployee.id!,
        {
          settlementDate: new Date("2024-01-20"),
          finalSalaryAmount: 5000,
          deductions: 500,
          bonuses: 1000,
        },
        "user-001"
      );

      const activityLog = manager.getActivityLog();
      expect(activityLog[0].details).toHaveProperty("settlementAmount", 5500);
      expect(activityLog[0].details).toHaveProperty("finalSalaryAmount", 5000);
      expect(activityLog[0].details).toHaveProperty("deductions", 500);
      expect(activityLog[0].details).toHaveProperty("bonuses", 1000);
      expect(activityLog[0].details).toHaveProperty("processedBy", "user-001");
    });

    it("should clear activity log", async () => {
      const mockEmployee = createMockEmployee();
      const mockSettlement = createMockSettlement(mockEmployee.id!);

      vi.mocked(apiClient.get).mockResolvedValueOnce({
        data: mockEmployee,
      });

      vi.mocked(apiClient.post).mockResolvedValueOnce({
        data: {
          success: true,
          message: "Financial settlement processed successfully",
          settlement: mockSettlement,
        },
      });

      vi.mocked(apiClient.post).mockResolvedValueOnce({ data: {} });

      await manager.processSettlement(
        mockEmployee.id!,
        {
          settlementDate: new Date("2024-01-20"),
          finalSalaryAmount: 5000,
          deductions: 500,
          bonuses: 1000,
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
        manager.processSettlement(
          "emp-001",
          {
            settlementDate: new Date(),
            finalSalaryAmount: 5000,
            deductions: 0,
            bonuses: 0,
          },
          "user-001"
        )
      ).rejects.toThrow(FinancialSettlementError);
    });

    it("should preserve API error message in thrown error", async () => {
      vi.mocked(apiClient.get).mockResolvedValueOnce({
        data: createMockEmployee(),
      });

      vi.mocked(apiClient.post).mockRejectedValueOnce({
        response: {
          data: { message: "Database connection failed" },
          status: 500,
        },
      });

      await expect(
        manager.processSettlement(
          "emp-001",
          {
            settlementDate: new Date(),
            finalSalaryAmount: 5000,
            deductions: 0,
            bonuses: 0,
          },
          "user-001"
        )
      ).rejects.toThrow("Database connection failed");
    });

    it("should use default error message when API error has no message", async () => {
      vi.mocked(apiClient.get).mockResolvedValueOnce({
        data: createMockEmployee(),
      });

      vi.mocked(apiClient.post).mockRejectedValueOnce({
        response: {
          data: {},
          status: 500,
        },
      });

      await expect(
        manager.processSettlement(
          "emp-001",
          {
            settlementDate: new Date(),
            finalSalaryAmount: 5000,
            deductions: 0,
            bonuses: 0,
          },
          "user-001"
        )
      ).rejects.toThrow("Failed to process financial settlement");
    });
  });

  // ==========================================================================
  // Edge Cases Tests
  // ==========================================================================

  describe("edge cases", () => {
    it("should handle settlement on current date", async () => {
      const mockEmployee = createMockEmployee();
      const mockSettlement = createMockSettlement(mockEmployee.id!);
      const today = new Date();

      vi.mocked(apiClient.get).mockResolvedValueOnce({
        data: mockEmployee,
      });

      vi.mocked(apiClient.post).mockResolvedValueOnce({
        data: {
          success: true,
          message: "Financial settlement processed successfully",
          settlement: mockSettlement,
        },
      });

      vi.mocked(apiClient.post).mockResolvedValueOnce({ data: {} });

      const result = await manager.processSettlement(
        mockEmployee.id!,
        {
          settlementDate: today,
          finalSalaryAmount: 5000,
          deductions: 0,
          bonuses: 0,
        },
        "user-001"
      );

      expect(result.settlement).toBeDefined();
    });

    it("should handle very large settlement amounts", async () => {
      const mockEmployee = createMockEmployee();
      const mockSettlement = createMockSettlement(mockEmployee.id!, {
        finalSalaryAmount: 1000000,
        deductions: 50000,
        bonuses: 200000,
        totalSettlement: 1150000,
      });

      vi.mocked(apiClient.get).mockResolvedValueOnce({
        data: mockEmployee,
      });

      vi.mocked(apiClient.post).mockResolvedValueOnce({
        data: {
          success: true,
          message: "Financial settlement processed successfully",
          settlement: mockSettlement,
        },
      });

      vi.mocked(apiClient.post).mockResolvedValueOnce({ data: {} });

      const result = await manager.processSettlement(
        mockEmployee.id!,
        {
          settlementDate: new Date(),
          finalSalaryAmount: 1000000,
          deductions: 50000,
          bonuses: 200000,
        },
        "user-001"
      );

      expect(result.settlement.totalSettlement).toBe(1150000);
    });

    it("should handle settlement with only deductions (no bonuses)", async () => {
      const mockEmployee = createMockEmployee();
      const mockSettlement = createMockSettlement(mockEmployee.id!, {
        finalSalaryAmount: 5000,
        deductions: 1000,
        bonuses: 0,
        totalSettlement: 4000,
      });

      vi.mocked(apiClient.get).mockResolvedValueOnce({
        data: mockEmployee,
      });

      vi.mocked(apiClient.post).mockResolvedValueOnce({
        data: {
          success: true,
          message: "Financial settlement processed successfully",
          settlement: mockSettlement,
        },
      });

      vi.mocked(apiClient.post).mockResolvedValueOnce({ data: {} });

      const result = await manager.processSettlement(
        mockEmployee.id!,
        {
          settlementDate: new Date(),
          finalSalaryAmount: 5000,
          deductions: 1000,
          bonuses: 0,
        },
        "user-001"
      );

      expect(result.settlement.totalSettlement).toBe(4000);
    });

    it("should handle settlement with only bonuses (no deductions)", async () => {
      const mockEmployee = createMockEmployee();
      const mockSettlement = createMockSettlement(mockEmployee.id!, {
        finalSalaryAmount: 5000,
        deductions: 0,
        bonuses: 2000,
        totalSettlement: 7000,
      });

      vi.mocked(apiClient.get).mockResolvedValueOnce({
        data: mockEmployee,
      });

      vi.mocked(apiClient.post).mockResolvedValueOnce({
        data: {
          success: true,
          message: "Financial settlement processed successfully",
          settlement: mockSettlement,
        },
      });

      vi.mocked(apiClient.post).mockResolvedValueOnce({ data: {} });

      const result = await manager.processSettlement(
        mockEmployee.id!,
        {
          settlementDate: new Date(),
          finalSalaryAmount: 5000,
          deductions: 0,
          bonuses: 2000,
        },
        "user-001"
      );

      expect(result.settlement.totalSettlement).toBe(7000);
    });
  });

  // ==========================================================================
  // Singleton Instance Tests
  // ==========================================================================

  describe("singleton instance", () => {
    it("should export a singleton instance", () => {
      expect(financialSettlementManager).toBeInstanceOf(FinancialSettlementManager);
    });

    it("should have all methods available on singleton", () => {
      expect(typeof financialSettlementManager.processSettlement).toBe("function");
      expect(typeof financialSettlementManager.calculateTotalSettlement).toBe("function");
      expect(typeof financialSettlementManager.getActivityLog).toBe("function");
      expect(typeof financialSettlementManager.clearActivityLog).toBe("function");
    });
  });
});
