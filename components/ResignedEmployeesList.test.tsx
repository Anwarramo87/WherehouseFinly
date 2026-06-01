import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ResignedEmployeesList from "./ResignedEmployeesList";
import type { Employee } from "@/types/employee";
import type { ResignedEmployeesStatistics, PaginationInfo } from "@/types/resignation";

// Mock employees data
vi.mock("@/stores/auth-store", () => ({
  useAuthStore: vi.fn(() => ({
    user: { id: "1", name: "Admin", role: "admin" },
    hasAnyRole: () => true,
  })),
}));

const createMockEmployee = (overrides: Partial<Employee> = {}): Employee => ({
  employeeId: "EMP001",
  name: "أحمد محمد",
  department: "قسم القص",
  jobTitle: "حويص",
  status: "resigned",
  terminationType: "resignation",
  terminationDate: new Date().toISOString(),
  financialSettlementStatus: "pending",
  isSettled: false,
  ...overrides
});

const mockCurrentMonthEmployees: Employee[] = [
  createMockEmployee({
    employeeId: "EMP001",
    name: "أحمد محمد",
    status: "resigned",
    terminationType: "resignation",
    terminationDate: new Date().toISOString(),
  }),
  createMockEmployee({
    employeeId: "EMP002",
    name: "محمد علي",
    status: "terminated",
    terminationType: "termination",
    terminationDate: new Date().toISOString(),
  }),
];

const mockPreviousMonthsEmployees: Employee[] = [
  createMockEmployee({
    employeeId: "EMP003",
    name: "خالد أحمد",
    status: "resigned",
    terminationType: "resignation",
    terminationDate: new Date(2024, 0, 15).toISOString(), // January 2024
    isSettled: true,
    financialSettlementStatus: "completed",
  }),
];

const mockStatistics: ResignedEmployeesStatistics = {
  currentMonth: 2,
  previousMonths: 1,
  resignations: 2,
  terminations: 1,
  pendingSettlement: 2,
  completedSettlement: 1,
  totalResigned: 3,
};

describe("ResignedEmployeesList", () => {
  it("renders loading state correctly", () => {
    render(
      <ResignedEmployeesList
        employees={[]}
        loading={true}
      />
    );

    expect(screen.getByText(/جاري تحميل سجل المغادرين/i)).toBeInTheDocument();
  });

  it("renders error state correctly", () => {
    const error = new Error("فشل في تحميل البيانات");
    render(
      <ResignedEmployeesList
        employees={[]}
        error={error}
        loading={false}
      />
    );

    expect(screen.getByText(/حدث خطأ في تحميل البيانات/i)).toBeInTheDocument();
    expect(screen.getByText(/فشل في تحميل البيانات/i)).toBeInTheDocument();
  });

  it("renders empty state when no employees", () => {
    render(
      <ResignedEmployeesList
        employees={[]}
        loading={false}
      />
    );

    expect(screen.getByText(/لا يوجد موظفون مقالون أو مستقيلون حاليًا/i)).toBeInTheDocument();
  });

  it("displays statistics correctly", () => {
    render(
      <ResignedEmployeesList
        employees={[...mockCurrentMonthEmployees, ...mockPreviousMonthsEmployees]}
        statistics={mockStatistics}
        loading={false}
      />
    );

    expect(screen.getByText(/الإجمالي: 3/i)).toBeInTheDocument();
    expect(screen.getByText(/استقالات: 2/i)).toBeInTheDocument();
    expect(screen.getByText(/إقالات: 1/i)).toBeInTheDocument();
  });

  it("separates current month and previous months employees", () => {
    render(
      <ResignedEmployeesList
        employees={[...mockCurrentMonthEmployees, ...mockPreviousMonthsEmployees]}
        loading={false}
      />
    );

    expect(screen.getByText(/موظفين مستقيلين هذا الشهر/i)).toBeInTheDocument();
    expect(screen.getByText(/موظفين مستقيلين قدماء/i)).toBeInTheDocument();
  });

  it("displays employee information correctly", () => {
    render(
      <ResignedEmployeesList
        employees={mockCurrentMonthEmployees}
        loading={false}
      />
    );

    // Check employee names
    expect(screen.getByText("أحمد محمد")).toBeInTheDocument();
    expect(screen.getByText("محمد علي")).toBeInTheDocument();

    // Check employee IDs
    expect(screen.getByText("EMP001")).toBeInTheDocument();
    expect(screen.getByText("EMP002")).toBeInTheDocument();
  });

  it("displays termination type with correct color coding", () => {
    render(
      <ResignedEmployeesList
        employees={mockCurrentMonthEmployees}
        loading={false}
      />
    );

    const resignationBadges = screen.getAllByText("استقالة");
    const terminationBadges = screen.getAllByText("إقالة");

    expect(resignationBadges.length).toBeGreaterThan(0);
    expect(terminationBadges.length).toBeGreaterThan(0);

    // Check color classes
    expect(resignationBadges[0]).toHaveClass("text-blue-600");
    expect(terminationBadges[0]).toHaveClass("text-rose-600");
  });

  it("displays financial settlement status correctly", () => {
    render(
      <ResignedEmployeesList
        employees={[...mockCurrentMonthEmployees, ...mockPreviousMonthsEmployees]}
        loading={false}
      />
    );

    // Pending settlement
    expect(screen.getAllByText(/قيد التصفية/i).length).toBeGreaterThan(0);

    // Completed settlement
    expect(screen.getAllByText(/تمت التصفية/i).length).toBeGreaterThan(0);
  });

  it("shows settle button only for unsettled employees", () => {
    render(
      <ResignedEmployeesList
        employees={[...mockCurrentMonthEmployees, ...mockPreviousMonthsEmployees]}
        loading={false}
      />
    );

    const settleButtons = screen.getAllByText(/اعتماد التصفية/i);
    
    // Should have 2 settle buttons (for the 2 unsettled employees)
    expect(settleButtons).toHaveLength(2);
  });

  it("calls onSettle when settle button is clicked", async () => {
    const mockOnSettle = vi.fn();
    
    // Mock window.confirm to return true
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    render(
      <ResignedEmployeesList
        employees={mockCurrentMonthEmployees}
        onSettle={mockOnSettle}
        loading={false}
      />
    );

    const settleButtons = screen.getAllByText(/اعتماد التصفية/i);
    fireEvent.click(settleButtons[0]);

    await waitFor(() => {
      expect(mockOnSettle).toHaveBeenCalledWith("EMP001");
    });
  });

  it("does not call onSettle when confirm is cancelled", async () => {
    const mockOnSettle = vi.fn();
    
    // Mock window.confirm to return false
    vi.spyOn(window, 'confirm').mockReturnValue(false);

    render(
      <ResignedEmployeesList
        employees={mockCurrentMonthEmployees}
        onSettle={mockOnSettle}
        loading={false}
      />
    );

    const settleButtons = screen.getAllByText(/اعتماد التصفية/i);
    fireEvent.click(settleButtons[0]);

    await waitFor(() => {
      expect(mockOnSettle).not.toHaveBeenCalled();
    });
  });

  it("toggles filters panel when filter button is clicked", () => {
    render(
      <ResignedEmployeesList
        employees={mockCurrentMonthEmployees}
        loading={false}
      />
    );

    const filterButton = screen.getByText(/فلاتر البحث/i);
    
    // Filters should not be visible initially
    expect(screen.queryByPlaceholderText(/اسم أو رقم الموظف/i)).not.toBeInTheDocument();

    // Click to show filters
    fireEvent.click(filterButton);
    expect(screen.getByPlaceholderText(/اسم أو رقم الموظف/i)).toBeInTheDocument();

    // Click to hide filters
    fireEvent.click(filterButton);
    expect(screen.queryByPlaceholderText(/اسم أو رقم الموظف/i)).not.toBeInTheDocument();
  });

  it("calls onSearch when search input changes", async () => {
    const mockOnSearch = vi.fn();

    render(
      <ResignedEmployeesList
        employees={mockCurrentMonthEmployees}
        onSearch={mockOnSearch}
        loading={false}
      />
    );

    // Open filters
    const filterButton = screen.getByText(/فلاتر البحث/i);
    fireEvent.click(filterButton);

    const searchInput = screen.getByPlaceholderText(/اسم أو رقم الموظف/i);
    fireEvent.change(searchInput, { target: { value: "أحمد" } });

    await waitFor(() => {
      expect(mockOnSearch).toHaveBeenCalledWith("أحمد");
    });
  });

  it("calls onFilterDepartment when department filter changes", async () => {
    const mockOnFilterDepartment = vi.fn();

    render(
      <ResignedEmployeesList
        employees={mockCurrentMonthEmployees}
        onFilterDepartment={mockOnFilterDepartment}
        departments={["قسم القص", "قسم الخياطة"]}
        loading={false}
      />
    );

    // Open filters
    const filterButton = screen.getByText(/فلاتر البحث/i);
    fireEvent.click(filterButton);

    // Find all select elements
    const selects = screen.getAllByRole('combobox');
    // The department select should be the first one (after search input)
    const departmentSelect = selects[0];
    
    fireEvent.change(departmentSelect, { target: { value: "قسم القص" } });

    await waitFor(() => {
      expect(mockOnFilterDepartment).toHaveBeenCalledWith("قسم القص");
    });
  });

  it("calls onFilterDateRange when date range changes", async () => {
    const mockOnFilterDateRange = vi.fn();

    render(
      <ResignedEmployeesList
        employees={mockCurrentMonthEmployees}
        onFilterDateRange={mockOnFilterDateRange}
        loading={false}
      />
    );

    // Open filters
    const filterButton = screen.getByText(/فلاتر البحث/i);
    fireEvent.click(filterButton);

    // Find date inputs
    const startDateInput = screen.getByLabelText(/من تاريخ/i);
    const endDateInput = screen.getByLabelText(/إلى تاريخ/i);

    // Change start date
    fireEvent.change(startDateInput, { target: { value: "2024-01-01" } });

    await waitFor(() => {
      expect(mockOnFilterDateRange).toHaveBeenCalledWith("2024-01-01", "");
    });

    // Change end date
    fireEvent.change(endDateInput, { target: { value: "2024-12-31" } });

    await waitFor(() => {
      expect(mockOnFilterDateRange).toHaveBeenCalledWith("2024-01-01", "2024-12-31");
    });
  });

  it("displays date range filter inputs in filters panel", () => {
    render(
      <ResignedEmployeesList
        employees={mockCurrentMonthEmployees}
        loading={false}
      />
    );

    // Open filters
    const filterButton = screen.getByText(/فلاتر البحث/i);
    fireEvent.click(filterButton);

    // Check for date inputs
    expect(screen.getByLabelText(/من تاريخ/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/إلى تاريخ/i)).toBeInTheDocument();
  });

  it("calls onFilterDateRange only when at least one date is provided", async () => {
    const mockOnFilterDateRange = vi.fn();

    render(
      <ResignedEmployeesList
        employees={mockCurrentMonthEmployees}
        onFilterDateRange={mockOnFilterDateRange}
        loading={false}
      />
    );

    // Open filters
    const filterButton = screen.getByText(/فلاتر البحث/i);
    fireEvent.click(filterButton);

    const startDateInput = screen.getByLabelText(/من تاريخ/i);

    // Change to empty value should not call the callback
    fireEvent.change(startDateInput, { target: { value: "" } });

    await waitFor(() => {
      expect(mockOnFilterDateRange).not.toHaveBeenCalled();
    });

    // Change to a valid date should call the callback
    fireEvent.change(startDateInput, { target: { value: "2024-01-01" } });

    await waitFor(() => {
      expect(mockOnFilterDateRange).toHaveBeenCalledWith("2024-01-01", "");
    });
  });

  it("renders pagination when multiple pages exist", () => {
    const mockPaginationMultiPage: PaginationInfo = {
      total: 30,
      page: 1,
      limit: 10,
      totalPages: 3,
    };

    render(
      <ResignedEmployeesList
        employees={mockCurrentMonthEmployees}
        pagination={mockPaginationMultiPage}
        loading={false}
      />
    );

    // Should show page numbers - use getAllByText since numbers might appear in statistics too
    const page1Buttons = screen.getAllByText("1");
    const page2Buttons = screen.getAllByText("2");
    const page3Buttons = screen.getAllByText("3");
    
    expect(page1Buttons.length).toBeGreaterThan(0);
    expect(page2Buttons.length).toBeGreaterThan(0);
    expect(page3Buttons.length).toBeGreaterThan(0);
  });

  it("calls onPageChange when pagination button is clicked", async () => {
    const mockOnPageChange = vi.fn();
    const mockPaginationMultiPage: PaginationInfo = {
      total: 30,
      page: 1,
      limit: 10,
      totalPages: 3,
    };

    render(
      <ResignedEmployeesList
        employees={mockCurrentMonthEmployees}
        pagination={mockPaginationMultiPage}
        onPageChange={mockOnPageChange}
        loading={false}
      />
    );

    // Get all buttons with text "2" and find the pagination button
    const page2Buttons = screen.getAllByText("2");
    const paginationButton = page2Buttons.find(btn => 
      btn.tagName === 'BUTTON' && btn.className.includes('rounded-xl')
    );
    
    expect(paginationButton).toBeDefined();
    fireEvent.click(paginationButton!);

    await waitFor(() => {
      expect(mockOnPageChange).toHaveBeenCalledWith(2);
    });
  });

  it("disables previous button on first page", () => {
    const mockPaginationMultiPage: PaginationInfo = {
      total: 30,
      page: 1,
      limit: 10,
      totalPages: 3,
    };

    render(
      <ResignedEmployeesList
        employees={mockCurrentMonthEmployees}
        pagination={mockPaginationMultiPage}
        loading={false}
      />
    );

    const buttons = screen.getAllByRole("button");
    const prevButton = buttons.find(btn => btn.querySelector('svg') && (btn as HTMLButtonElement).disabled);
    
    expect(prevButton).toBeDefined();
  });

  it("displays department and job title correctly", () => {
    render(
      <ResignedEmployeesList
        employees={mockCurrentMonthEmployees}
        loading={false}
      />
    );

    expect(screen.getAllByText("قسم القص").length).toBeGreaterThan(0);
    expect(screen.getAllByText("حويص").length).toBeGreaterThan(0);
  });

  it("formats termination date correctly", () => {
    const employee = createMockEmployee({
      terminationDate: new Date(2024, 0, 15).toISOString(),
    });

    render(
      <ResignedEmployeesList
        employees={[employee]}
        loading={false}
      />
    );

    // Check that date is displayed - Arabic locale formats dates differently
    // The date "15/1/2024" appears as "١٥‏/١‏/٢٠٢٤" in Arabic
    expect(screen.getByText(/٢٠٢٤/)).toBeInTheDocument();
  });
});
