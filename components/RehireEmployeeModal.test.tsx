import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import RehireEmployeeModal from './RehireEmployeeModal';
import type { Employee } from '@/types/employee';

// Mock createPortal to render directly
vi.mock('react-dom', async () => {
  const actual = await vi.importActual('react-dom');
  return {
    ...actual,
    createPortal: (node: React.ReactNode) => node,
  };
});

describe('RehireEmployeeModal', () => {
  const mockEmployee: Employee = {
    id: '123',
    employeeId: 'EMP001',
    name: 'أحمد محمد علي',
    mobile: '0912345678',
    department: 'قسم القص',
    profession: 'حويص',
    status: 'resigned',
    scheduledStart: '08:00',
    scheduledEnd: '16:00',
    roleId: 'role-123',
  };

  const mockOnClose = vi.fn();
  const mockOnConfirm = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should not render when isOpen is false', () => {
      render(
        <RehireEmployeeModal
          employee={mockEmployee}
          isOpen={false}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          isPending={false}
        />
      );

      expect(screen.queryByText('إعادة تعيين الموظف')).not.toBeInTheDocument();
    });

    it('should render when isOpen is true', () => {
      render(
        <RehireEmployeeModal
          employee={mockEmployee}
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          isPending={false}
        />
      );

      // Use getAllByText since the text appears in both header and info banner
      const titles = screen.getAllByText('إعادة تعيين الموظف');
      expect(titles.length).toBeGreaterThan(0);
    });

    it('should display employee name and ID', () => {
      render(
        <RehireEmployeeModal
          employee={mockEmployee}
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          isPending={false}
        />
      );

      expect(screen.getByText(/أحمد محمد علي/)).toBeInTheDocument();
      expect(screen.getByText(/EMP001/)).toBeInTheDocument();
    });

    it('should render all form fields', () => {
      render(
        <RehireEmployeeModal
          employee={mockEmployee}
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          isPending={false}
        />
      );

      expect(screen.getByLabelText(/تاريخ إعادة التعيين/)).toBeInTheDocument();
      expect(screen.getByText(/استعادة الإعدادات السابقة/)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/أي ملاحظات إضافية حول إعادة التعيين/)).toBeInTheDocument();
    });

    it('should display info banner', () => {
      render(
        <RehireEmployeeModal
          employee={mockEmployee}
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          isPending={false}
        />
      );

      expect(screen.getByText(/سيتم إرجاع الموظف إلى حالة النشاط/)).toBeInTheDocument();
    });
  });

  describe('Form Interactions', () => {
    it('should update rehire date when changed', () => {
      render(
        <RehireEmployeeModal
          employee={mockEmployee}
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          isPending={false}
        />
      );

      const dateInput = screen.getByLabelText(/تاريخ إعادة التعيين/) as HTMLInputElement;
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);
      const futureDateString = futureDate.toISOString().split('T')[0];

      fireEvent.change(dateInput, { target: { value: futureDateString } });

      expect(dateInput.value).toBe(futureDateString);
    });

    it('should toggle restore previous settings checkbox', () => {
      render(
        <RehireEmployeeModal
          employee={mockEmployee}
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          isPending={false}
        />
      );

      const checkbox = screen.getByRole('checkbox') as HTMLInputElement;
      
      // Should be checked by default
      expect(checkbox.checked).toBe(true);

      // Click to uncheck
      fireEvent.click(checkbox);
      expect(checkbox.checked).toBe(false);

      // Click to check again
      fireEvent.click(checkbox);
      expect(checkbox.checked).toBe(true);
    });

    it('should update notes when changed', () => {
      render(
        <RehireEmployeeModal
          employee={mockEmployee}
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          isPending={false}
        />
      );

      const notesTextarea = screen.getByPlaceholderText(/أي ملاحظات إضافية حول إعادة التعيين/) as HTMLTextAreaElement;
      const testNotes = 'ملاحظات اختبارية';

      fireEvent.change(notesTextarea, { target: { value: testNotes } });

      expect(notesTextarea.value).toBe(testNotes);
    });

    it('should display character count for notes', () => {
      render(
        <RehireEmployeeModal
          employee={mockEmployee}
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          isPending={false}
        />
      );

      const notesTextarea = screen.getByPlaceholderText(/أي ملاحظات إضافية حول إعادة التعيين/);
      const testNotes = 'ملاحظات اختبارية';

      fireEvent.change(notesTextarea, { target: { value: testNotes } });

      expect(screen.getByText(`${testNotes.length}/1000`)).toBeInTheDocument();
    });

    it('should enforce max length on notes field', () => {
      render(
        <RehireEmployeeModal
          employee={mockEmployee}
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          isPending={false}
        />
      );

      const notesTextarea = screen.getByPlaceholderText(/أي ملاحظات إضافية حول إعادة التعيين/) as HTMLTextAreaElement;

      expect(notesTextarea.maxLength).toBe(1000);
    });
  });

  describe('Date Validation', () => {
    it('should have min attribute set to today', () => {
      render(
        <RehireEmployeeModal
          employee={mockEmployee}
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          isPending={false}
        />
      );

      const dateInput = screen.getByLabelText(/تاريخ إعادة التعيين/) as HTMLInputElement;
      const today = new Date().toISOString().split('T')[0];

      expect(dateInput.min).toBe(today);
    });

    it('should display helper text about past dates', () => {
      render(
        <RehireEmployeeModal
          employee={mockEmployee}
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          isPending={false}
        />
      );

      expect(screen.getByText(/لا يمكن اختيار تاريخ في الماضي/)).toBeInTheDocument();
    });

    it('should accept today or future dates', async () => {
      render(
        <RehireEmployeeModal
          employee={mockEmployee}
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          isPending={false}
        />
      );

      const dateInput = screen.getByLabelText(/تاريخ إعادة التعيين/);
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);
      const futureDateString = futureDate.toISOString().split('T')[0];

      fireEvent.change(dateInput, { target: { value: futureDateString } });

      const submitButton = screen.getByRole('button', { name: /تأكيد إعادة التعيين/ });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockOnConfirm).toHaveBeenCalled();
      }, { timeout: 3000 });
    });
  });

  describe('Form Submission', () => {
    it('should call onConfirm with correct data when form is valid', async () => {
      render(
        <RehireEmployeeModal
          employee={mockEmployee}
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          isPending={false}
        />
      );

      const dateInput = screen.getByLabelText(/تاريخ إعادة التعيين/);
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);
      const futureDateString = futureDate.toISOString().split('T')[0];

      fireEvent.change(dateInput, { target: { value: futureDateString } });

      const notesTextarea = screen.getByPlaceholderText(/أي ملاحظات إضافية حول إعادة التعيين/);
      fireEvent.change(notesTextarea, { target: { value: 'ملاحظات الاختبار' } });

      const submitButton = screen.getByRole('button', { name: /تأكيد إعادة التعيين/ });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockOnConfirm).toHaveBeenCalledWith({
          rehireDate: futureDateString,
          restorePreviousSettings: true,
          notes: 'ملاحظات الاختبار',
        });
      });
    });

    it('should submit with restorePreviousSettings as false when unchecked', async () => {
      render(
        <RehireEmployeeModal
          employee={mockEmployee}
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          isPending={false}
        />
      );

      const checkbox = screen.getByRole('checkbox');
      fireEvent.click(checkbox); // Uncheck

      const submitButton = screen.getByRole('button', { name: /تأكيد إعادة التعيين/ });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockOnConfirm).toHaveBeenCalledWith(
          expect.objectContaining({
            restorePreviousSettings: false,
          })
        );
      });
    });

    it('should submit with empty notes when not provided', async () => {
      render(
        <RehireEmployeeModal
          employee={mockEmployee}
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          isPending={false}
        />
      );

      const submitButton = screen.getByRole('button', { name: /تأكيد إعادة التعيين/ });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockOnConfirm).toHaveBeenCalledWith(
          expect.objectContaining({
            notes: '',
          })
        );
      });
    });
  });

  describe('Modal Controls', () => {
    it('should call onClose when close button is clicked', () => {
      render(
        <RehireEmployeeModal
          employee={mockEmployee}
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          isPending={false}
        />
      );

      const closeButton = screen.getAllByRole('button').find(btn => 
        btn.querySelector('svg') && btn.className.includes('hover:text-rose-400')
      );
      
      if (closeButton) {
        fireEvent.click(closeButton);
        expect(mockOnClose).toHaveBeenCalled();
      }
    });

    it('should call onClose when cancel button is clicked', () => {
      render(
        <RehireEmployeeModal
          employee={mockEmployee}
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          isPending={false}
        />
      );

      const cancelButton = screen.getByRole('button', { name: /إلغاء/ });
      fireEvent.click(cancelButton);

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should disable buttons when isPending is true', () => {
      render(
        <RehireEmployeeModal
          employee={mockEmployee}
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          isPending={true}
        />
      );

      const cancelButton = screen.getByRole('button', { name: /إلغاء/ });
      const submitButton = screen.getByRole('button', { name: /جاري إعادة التعيين/ });

      expect(cancelButton).toBeDisabled();
      expect(submitButton).toBeDisabled();
    });

    it('should show loading state when isPending is true', () => {
      render(
        <RehireEmployeeModal
          employee={mockEmployee}
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          isPending={true}
        />
      );

      expect(screen.getByText(/جاري إعادة التعيين/)).toBeInTheDocument();
    });
  });

  describe('Form Reset', () => {
    it('should reset form when modal is reopened', async () => {
      const { rerender } = render(
        <RehireEmployeeModal
          employee={mockEmployee}
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          isPending={false}
        />
      );

      // Fill in the form
      const notesTextarea = screen.getByPlaceholderText(/أي ملاحظات إضافية حول إعادة التعيين/) as HTMLTextAreaElement;
      fireEvent.change(notesTextarea, { target: { value: 'ملاحظات اختبارية' } });

      const checkbox = screen.getByRole('checkbox') as HTMLInputElement;
      fireEvent.click(checkbox); // Uncheck

      expect(notesTextarea.value).toBe('ملاحظات اختبارية');
      expect(checkbox.checked).toBe(false);

      // Close modal
      rerender(
        <RehireEmployeeModal
          employee={mockEmployee}
          isOpen={false}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          isPending={false}
        />
      );

      // Reopen modal
      rerender(
        <RehireEmployeeModal
          employee={mockEmployee}
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          isPending={false}
        />
      );

      await waitFor(() => {
        const resetNotesTextarea = screen.getByPlaceholderText(/أي ملاحظات إضافية حول إعادة التعيين/) as HTMLTextAreaElement;
        const resetCheckbox = screen.getByRole('checkbox') as HTMLInputElement;

        expect(resetNotesTextarea.value).toBe('');
        expect(resetCheckbox.checked).toBe(true);
      });
    });

    it('should set default date to today when modal opens', () => {
      render(
        <RehireEmployeeModal
          employee={mockEmployee}
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          isPending={false}
        />
      );

      const dateInput = screen.getByLabelText(/تاريخ إعادة التعيين/) as HTMLInputElement;
      const today = new Date().toISOString().split('T')[0];

      expect(dateInput.value).toBe(today);
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(
        <RehireEmployeeModal
          employee={mockEmployee}
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          isPending={false}
        />
      );

      expect(screen.getByLabelText(/تاريخ إعادة التعيين/)).toBeInTheDocument();
    });

    it('should mark required fields with asterisk', () => {
      render(
        <RehireEmployeeModal
          employee={mockEmployee}
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          isPending={false}
        />
      );

      const dateLabel = screen.getByText(/تاريخ إعادة التعيين/);
      expect(dateLabel.parentElement?.textContent).toContain('*');
    });

    it('should have proper form structure', () => {
      render(
        <RehireEmployeeModal
          employee={mockEmployee}
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          isPending={false}
        />
      );

      const form = document.getElementById('rehireForm');
      expect(form).toBeInTheDocument();
      expect(form?.tagName).toBe('FORM');
    });
  });

  describe('RTL Support', () => {
    it('should render with RTL direction', () => {
      render(
        <RehireEmployeeModal
          employee={mockEmployee}
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          isPending={false}
        />
      );

      // Use getAllByText to handle multiple instances and check the first one
      const modalTitles = screen.getAllByText('إعادة تعيين الموظف');
      const modalContainer = modalTitles[0].closest('[dir="rtl"]');
      expect(modalContainer).toBeInTheDocument();
    });
  });
});
