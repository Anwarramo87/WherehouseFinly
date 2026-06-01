import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import TerminateEmployeeModal from "./TerminateEmployeeModal";
import type { Employee } from "@/types/employee";

describe("TerminateEmployeeModal", () => {
  const mockEmployee: Employee = {
    id: "1",
    employeeId: "EMP001",
    name: "أحمد محمد علي",
    department: "قسم القص",
    status: "active",
  };

  const mockOnClose = vi.fn();
  const mockOnConfirm = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should not render when isOpen is false", () => {
    const { container } = render(
      <TerminateEmployeeModal
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
      <TerminateEmployeeModal
        employee={mockEmployee}
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
        isPending={false}
      />
    );

    expect(screen.getByText("إنهاء عمل الموظف")).toBeInTheDocument();
    expect(screen.getByText(/أحمد محمد علي/)).toBeInTheDocument();
    expect(screen.getByText(/EMP001/)).toBeInTheDocument();
  });

  it("should display warning message about irreversible action", () => {
    render(
      <TerminateEmployeeModal
        employee={mockEmployee}
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
        isPending={false}
      />
    );

    expect(screen.getByText(/تحذير: هذا الإجراء لا يمكن التراجع عنه/)).toBeInTheDocument();
  });

  it("should have resignation selected by default", () => {
    render(
      <TerminateEmployeeModal
        employee={mockEmployee}
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
        isPending={false}
      />
    );

    const resignationRadio = screen.getByRole("radio", { name: /استقالة/ });
    expect(resignationRadio).toBeChecked();
  });

  it("should allow switching between resignation and termination types", async () => {
    const user = userEvent.setup();
    render(
      <TerminateEmployeeModal
        employee={mockEmployee}
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
        isPending={false}
      />
    );

    const terminationRadio = screen.getByRole("radio", { name: /إقالة/ });
    await user.click(terminationRadio);

    expect(terminationRadio).toBeChecked();
  });

  it("should validate reason field - minimum length", async () => {
    const user = userEvent.setup();
    render(
      <TerminateEmployeeModal
        employee={mockEmployee}
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
        isPending={false}
      />
    );

    const reasonTextarea = screen.getByPlaceholderText(/اكتب سبب إنهاء الخدمة/);
    await user.type(reasonTextarea, "قصير");

    const submitButton = screen.getByRole("button", { name: /تأكيد إنهاء الخدمة/ });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/يجب أن يكون السبب 10 أحرف على الأقل/)).toBeInTheDocument();
    });

    expect(mockOnConfirm).not.toHaveBeenCalled();
  });

  it("should validate reason field - maximum length", async () => {
    const user = userEvent.setup();
    render(
      <TerminateEmployeeModal
        employee={mockEmployee}
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
        isPending={false}
      />
    );

    const reasonTextarea = screen.getByPlaceholderText(/اكتب سبب إنهاء الخدمة/);
    // Manually set value to bypass slow typing
    fireEvent.change(reasonTextarea, { target: { value: "أ".repeat(501) } });

    const submitButton = screen.getByRole("button", { name: /تأكيد إنهاء الخدمة/ });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/السبب طويل جداً/)).toBeInTheDocument();
    });

    expect(mockOnConfirm).not.toHaveBeenCalled();
  });

  it("should submit form with valid data", async () => {
    const user = userEvent.setup();
    render(
      <TerminateEmployeeModal
        employee={mockEmployee}
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
        isPending={false}
      />
    );

    const dateInput = screen.getByLabelText(/تاريخ الإنهاء/);
    await user.clear(dateInput);
    await user.type(dateInput, "2024-01-15");

    const terminationRadio = screen.getByRole("radio", { name: /إقالة/ });
    await user.click(terminationRadio);

    const reasonTextarea = screen.getByPlaceholderText(/اكتب سبب إنهاء الخدمة/);
    await user.type(reasonTextarea, "سبب إنهاء الخدمة الصحيح");

    const notesTextarea = screen.getByPlaceholderText(/أي ملاحظات إضافية/);
    await user.type(notesTextarea, "ملاحظات إضافية");

    const submitButton = screen.getByRole("button", { name: /تأكيد إنهاء الخدمة/ });
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockOnConfirm).toHaveBeenCalledWith({
        terminationDate: "2024-01-15",
        terminationType: "termination",
        reason: "سبب إنهاء الخدمة الصحيح",
        notes: "ملاحظات إضافية",
      });
    });
  });

  it("should call onClose when cancel button is clicked", async () => {
    const user = userEvent.setup();
    render(
      <TerminateEmployeeModal
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
      <TerminateEmployeeModal
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

  it("should disable buttons when isPending is true", () => {
    render(
      <TerminateEmployeeModal
        employee={mockEmployee}
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
        isPending={true}
      />
    );

    const submitButton = screen.getByRole("button", { name: /جاري الإنهاء/ });
    const cancelButton = screen.getByRole("button", { name: /إلغاء/ });

    expect(submitButton).toBeDisabled();
    expect(cancelButton).toBeDisabled();
  });

  it("should show loading state when isPending is true", () => {
    render(
      <TerminateEmployeeModal
        employee={mockEmployee}
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
        isPending={true}
      />
    );

    expect(screen.getByText(/جاري الإنهاء/)).toBeInTheDocument();
  });

  it("should reset form when modal is reopened", async () => {
    const { rerender } = render(
      <TerminateEmployeeModal
        employee={mockEmployee}
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
        isPending={false}
      />
    );

    const reasonTextarea = screen.getByPlaceholderText(/اكتب سبب إنهاء الخدمة/);
    await userEvent.type(reasonTextarea, "سبب الإنهاء");

    // Close modal
    rerender(
      <TerminateEmployeeModal
        employee={mockEmployee}
        isOpen={false}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
        isPending={false}
      />
    );

    // Reopen modal
    rerender(
      <TerminateEmployeeModal
        employee={mockEmployee}
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
        isPending={false}
      />
    );

    const resetReasonTextarea = screen.getByPlaceholderText(/اكتب سبب إنهاء الخدمة/);
    expect(resetReasonTextarea).toHaveValue("");
  });

  it("should display character count for reason field", () => {
    render(
      <TerminateEmployeeModal
        employee={mockEmployee}
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
        isPending={false}
      />
    );

    // Check that character count is displayed (initially 0/500)
    expect(screen.getByText("0/500")).toBeInTheDocument();
  });

  it("should display character count for notes field", () => {
    render(
      <TerminateEmployeeModal
        employee={mockEmployee}
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
        isPending={false}
      />
    );

    // Check that character count is displayed (initially 0/1000)
    expect(screen.getByText("0/1000")).toBeInTheDocument();
  });

  it("should set termination date to today by default", () => {
    render(
      <TerminateEmployeeModal
        employee={mockEmployee}
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
        isPending={false}
      />
    );

    const dateInput = screen.getByLabelText(/تاريخ الإنهاء/) as HTMLInputElement;
    const today = new Date().toISOString().split('T')[0];
    
    expect(dateInput.value).toBe(today);
  });

  it("should not allow future dates for termination", () => {
    render(
      <TerminateEmployeeModal
        employee={mockEmployee}
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
        isPending={false}
      />
    );

    const dateInput = screen.getByLabelText(/تاريخ الإنهاء/) as HTMLInputElement;
    const today = new Date().toISOString().split('T')[0];
    
    expect(dateInput.max).toBe(today);
  });
});
