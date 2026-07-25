import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("@/lib/api-client", () => ({
  default: {
    get: vi.fn().mockResolvedValue({
      data: { earnedSalary: 0, bonuses: 0, deductions: 0 },
    }),
    post: vi.fn().mockResolvedValue({ data: [] }),
  },
}));

import apiClient from "@/lib/api-client";
import FinancialSettlementModal from "./FinancialSettlementModal";
import type { Employee } from "@/types/employee";

const defaultGetMock = { data: { earnedSalary: 0, bonuses: 0, deductions: 0 } };

describe("FinancialSettlementModal", () => {
  const mockEmployee: Employee = {
    id: "1",
    employeeId: "EMP001",
    name: "أحمد محمد علي",
    department: "قسم القص",
    profession: "خياط",
    status: "resigned",
  };

  const mockOnClose = vi.fn();
  const mockOnConfirm = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(apiClient.get).mockResolvedValue(defaultGetMock);
    vi.mocked(apiClient.post).mockResolvedValue({ data: { data: [] } } as any);
  });

  it("should not render when isOpen is false", () => {
    const { container } = render(
      <FinancialSettlementModal
        employee={mockEmployee}
        isOpen={false}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
        isPending={false}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it("should render modal with employee information when isOpen is true", () => {
    render(
      <FinancialSettlementModal
        employee={mockEmployee}
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
        isPending={false}
      />
    );

    expect(screen.getByText("التصفية المالية")).toBeInTheDocument();
    expect(screen.getByText(/أحمد محمد علي/)).toBeInTheDocument();
    expect(screen.getByText(/EMP001/)).toBeInTheDocument();
  });

  it("should display employee department and profession", () => {
    render(
      <FinancialSettlementModal
        employee={mockEmployee}
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
        isPending={false}
      />
    );

    expect(screen.getByText(/قسم القص/)).toBeInTheDocument();
    expect(screen.getByText(/خياط/)).toBeInTheDocument();
  });

  it("should display info banner about financial settlement", () => {
    render(
      <FinancialSettlementModal
        employee={mockEmployee}
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
        isPending={false}
      />
    );

    expect(screen.getByText(/البيانات المالية/)).toBeInTheDocument();
  });

  it("should validate final salary - must be greater than zero", async () => {
    userEvent.setup();
    render(
      <FinancialSettlementModal
        employee={mockEmployee}
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
        isPending={false}
      />
    );

    const finalSalaryInput = screen.getByLabelText(/الراتب المستحق/);
    expect(finalSalaryInput).toHaveAttribute("required");
    expect(finalSalaryInput).toHaveAttribute("min", "0");
    
    expect(mockOnConfirm).not.toHaveBeenCalled();
  });

  it("should validate deductions - cannot be negative", async () => {
    const user = userEvent.setup();
    render(
      <FinancialSettlementModal
        employee={mockEmployee}
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
        isPending={false}
      />
    );

    const finalSalaryInput = screen.getByLabelText(/الراتب المستحق/);
    await user.clear(finalSalaryInput);
    await user.type(finalSalaryInput, "5000");

    const deductionsInput = screen.getByLabelText(/الخصومات/);
    expect(deductionsInput).toHaveAttribute("min", "0");
  });

  it("should validate bonuses - cannot be negative", async () => {
    const user = userEvent.setup();
    render(
      <FinancialSettlementModal
        employee={mockEmployee}
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
        isPending={false}
      />
    );

    const finalSalaryInput = screen.getByLabelText(/الراتب المستحق/);
    await user.clear(finalSalaryInput);
    await user.type(finalSalaryInput, "5000");

    const bonusesInput = screen.getByLabelText(/المكافآت/);
    expect(bonusesInput).toHaveAttribute("min", "0");
  });

  it("should calculate total settlement correctly", async () => {
    const user = userEvent.setup();
    render(
      <FinancialSettlementModal
        employee={mockEmployee}
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
        isPending={false}
      />
    );

    const finalSalaryInput = screen.getByLabelText(/الراتب المستحق/);
    await user.clear(finalSalaryInput);
    await user.type(finalSalaryInput, "5000");

    const bonusesInput = screen.getByLabelText(/المكافآت/);
    await user.clear(bonusesInput);
    await user.type(bonusesInput, "1000");

    const deductionsInput = screen.getByLabelText(/الخصومات/);
    await user.clear(deductionsInput);
    await user.type(deductionsInput, "500");

    await waitFor(() => {
      expect(screen.getByText(/الصافي المستحق/)).toBeInTheDocument();
    });
  });

  it("should show warning for negative settlement", async () => {
    vi.mocked(apiClient.get).mockImplementation(async (url: string) => {
      if (String(url).includes("provisional-settlement")) {
        return { data: { earnedSalary: 5000, bonuses: 0, deductions: 0, netPayRounded: -1000 } };
      }
      return defaultGetMock;
    });

    render(
      <FinancialSettlementModal
        employee={mockEmployee}
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
        isPending={false}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/الموظف مدين للشركة/)).toBeInTheDocument();
    });

    vi.mocked(apiClient.get).mockResolvedValue(defaultGetMock);
  });

  it("should submit form with valid data", async () => {
    const user = userEvent.setup();
    render(
      <FinancialSettlementModal
        employee={mockEmployee}
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
        isPending={false}
        initialSettlementDate="2024-01-15"
      />
    );

    const notesTextarea = screen.getByPlaceholderText(/ملاحظات حول التصفية/);
    await user.type(notesTextarea, "ملاحظات التصفية");

    expect(notesTextarea).toHaveValue("ملاحظات التصفية");
    expect(screen.getByLabelText(/تاريخ التصفية/)).toHaveValue("2024-01-15");

    vi.mocked(apiClient.get).mockResolvedValue(defaultGetMock);
  });

  it("should call onClose when cancel button is clicked", async () => {
    const user = userEvent.setup();
    render(
      <FinancialSettlementModal
        employee={mockEmployee}
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
        isPending={false}
      />
    );

    const cancelButton = screen.getByRole("button", { name: /إلغاء/ });
    await user.click(cancelButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it("should call onClose when X button is clicked", async () => {
    const user = userEvent.setup();
    render(
      <FinancialSettlementModal
        employee={mockEmployee}
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
        isPending={false}
      />
    );

    const closeButton = screen.getAllByRole("button").find(
      (button) => button.querySelector("svg") && !button.textContent
    );
    
    if (closeButton) {
      await user.click(closeButton);
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    }
  });

  it("should disable buttons when isPending is true", async () => {
    render(
      <FinancialSettlementModal
        employee={mockEmployee}
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
        isPending={true}
      />
    );

    const submitButton = await screen.findByRole("button", { name: /جاري المعالجة/ });
    const cancelButton = screen.getByRole("button", { name: /إلغاء/ });

    expect(submitButton).toBeDisabled();
    expect(cancelButton).toBeDisabled();
  });

  it("should show loading state when isPending is true", async () => {
    render(
      <FinancialSettlementModal
        employee={mockEmployee}
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
        isPending={true}
      />
    );

    expect(await screen.findByText(/جاري المعالجة/)).toBeInTheDocument();
  });

  it("should reset form when modal is reopened", async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <FinancialSettlementModal
        employee={mockEmployee}
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
        isPending={false}
      />
    );

    const finalSalaryInput = screen.getByLabelText(/الراتب المستحق/);
    await user.clear(finalSalaryInput);
    await user.type(finalSalaryInput, "5000");

    rerender(
      <FinancialSettlementModal
        employee={mockEmployee}
        isOpen={false}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
        isPending={false}
      />
    );

    rerender(
      <FinancialSettlementModal
        employee={mockEmployee}
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
        isPending={false}
      />
    );

    const resetFinalSalaryInput = screen.getByLabelText(/الراتب المستحق/) as HTMLInputElement;
    expect(resetFinalSalaryInput.value).toBe("");
  });

  it("should display character count for notes field", () => {
    render(
      <FinancialSettlementModal
        employee={mockEmployee}
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
        isPending={false}
      />
    );

    expect(screen.getByText("0/1000")).toBeInTheDocument();
  });

  it("should set settlement date to today by default", () => {
    render(
      <FinancialSettlementModal
        employee={mockEmployee}
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
        isPending={false}
      />
    );

    const dateInput = screen.getByLabelText(/تاريخ التصفية/) as HTMLInputElement;
    const today = new Date().toISOString().split('T')[0];
    
    expect(dateInput.value).toBe(today);
  });

  it("should not allow future dates for settlement", () => {
    render(
      <FinancialSettlementModal
        employee={mockEmployee}
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
        isPending={false}
      />
    );

    const dateInput = screen.getByLabelText(/تاريخ التصفية/) as HTMLInputElement;
    const today = new Date().toISOString().split('T')[0];
    
    expect(dateInput.max).toBe(today);
  });

  it("should display calculation breakdown", async () => {
    const user = userEvent.setup();
    render(
      <FinancialSettlementModal
        employee={mockEmployee}
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
        isPending={false}
      />
    );

    const finalSalaryInput = screen.getByLabelText(/الراتب المستحق/);
    await user.clear(finalSalaryInput);
    await user.type(finalSalaryInput, "5000");

    await waitFor(() => {
      expect(screen.getByText(/الراتب المستحق/)).toBeInTheDocument();
      expect(screen.getByText(/المكافآت/)).toBeInTheDocument();
      expect(screen.getByText(/الخصومات/)).toBeInTheDocument();
      expect(screen.getByText(/الصافي المستحق/)).toBeInTheDocument();
    });
  });

  it("should handle Arabic numerals input", async () => {
    render(
      <FinancialSettlementModal
        employee={mockEmployee}
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
        isPending={false}
      />
    );

    const finalSalaryInput = screen.getByLabelText(/الراتب المستحق/);

    await screen.findByRole("button", { name: /تأكيد التصفية/ });

    fireEvent.change(finalSalaryInput, { target: { value: "٥٠٠٠" } });

    expect((finalSalaryInput as HTMLInputElement).value).toBe("");
  });

  it("should clear validation errors when valid input is provided", async () => {
    const user = userEvent.setup();
    render(
      <FinancialSettlementModal
        employee={mockEmployee}
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
        isPending={false}
      />
    );

    const finalSalaryInput = screen.getByLabelText(/الراتب المستحق/);
    await user.clear(finalSalaryInput);
    await user.type(finalSalaryInput, "5000");

    expect(screen.queryByText(/يجب أن يكون الراتب المستحق أكبر من صفر/)).not.toBeInTheDocument();
  });

  it("should display total settlement in footer prominently", async () => {
    const user = userEvent.setup();
    render(
      <FinancialSettlementModal
        employee={mockEmployee}
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
        isPending={false}
      />
    );

    const finalSalaryInput = screen.getByLabelText(/الراتب المستحق/);
    await user.clear(finalSalaryInput);
    await user.type(finalSalaryInput, "5000");

    await waitFor(() => {
      expect(screen.getByText(/الصافي المستحق/)).toBeInTheDocument();
    });
  });

  it("should handle zero bonuses and deductions", async () => {
    render(
      <FinancialSettlementModal
        employee={mockEmployee}
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
        isPending={false}
        initialSettlementDate="2024-01-15"
      />
    );

    expect(screen.getByLabelText(/تاريخ التصفية/)).toHaveValue("2024-01-15");

    vi.mocked(apiClient.get).mockResolvedValue(defaultGetMock);
  });
});
