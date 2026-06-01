'use client';

import { useEffect } from 'react';
import { useAuditLog, useAuditFilters } from '@/hooks/useAuditLog';
import type { AuditAction } from '@/types/audit';
import { getAuditActionLabel } from '@/types/audit';

/**
 * AuditTrailViewer Component
 * 
 * Provides a UI for administrators to view and filter audit logs.
 * Implements Requirement 9.4: Audit trail viewing functionality.
 */
interface AuditTrailViewerProps {
  employeeId?: string;
  showFilters?: boolean;
  showExport?: boolean;
  className?: string;
}

export function AuditTrailViewer({
  employeeId,
  showFilters = true,
  className = '',
}: AuditTrailViewerProps) {
  const { auditLogs, loading, error, pagination, fetchAuditTrail, clearError } = useAuditLog();
  const { filters, setActionFilter, setDateRangeFilter, setSearchFilter, resetFilters } =
    useAuditFilters();

  // Fetch audit trail on mount and when filters change
  useEffect(() => {
    const query = {
      ...filters,
      ...(employeeId && { employeeId }),
    };
    fetchAuditTrail(query);
  }, [filters, employeeId, fetchAuditTrail]);

  // Action type options
  const actionOptions: AuditAction[] = [
    'EMPLOYEE_TERMINATED',
    'EMPLOYEE_REHIRED',
    'FINANCIAL_SETTLEMENT_COMPLETED',
    'EMPLOYEE_VIEWED',
    'RESIGNED_LIST_EXPORTED',
  ];

  // Format date for display
  const formatDate = (date: Date | string): string => {
    const d = new Date(date);
    return d.toLocaleDateString('ar-SA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Get action badge color
  const getActionColor = (action: AuditAction): string => {
    const colors: Record<AuditAction, string> = {
      EMPLOYEE_TERMINATED: 'bg-red-100 text-red-800',
      EMPLOYEE_REHIRED: 'bg-green-100 text-green-800',
      FINANCIAL_SETTLEMENT_COMPLETED: 'bg-blue-100 text-blue-800',
      EMPLOYEE_VIEWED: 'bg-gray-100 text-gray-800',
      RESIGNED_LIST_EXPORTED: 'bg-purple-100 text-purple-800',
      AUDIT_LOG_VIEWED: 'bg-yellow-100 text-yellow-800',
    };
    return colors[action] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className={`audit-trail-viewer ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">سجل التدقيق</h2>
        <span className="text-sm text-gray-500">
          {pagination.total} سجل
        </span>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="bg-gray-50 p-4 rounded-lg mb-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                بحث
              </label>
              <input
                type="text"
                placeholder="البحث في السجلات..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                value={filters.search || ''}
                onChange={(e) => setSearchFilter(e.target.value || undefined)}
              />
            </div>

            {/* Action Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                نوع الإجراء
              </label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                value={filters.action || ''}
                onChange={(e) =>
                  setActionFilter((e.target.value as AuditAction) || undefined)
                }
              >
                <option value="">جميع الإجراءات</option>
                {actionOptions.map((action) => (
                  <option key={action} value={action}>
                    {getAuditActionLabel(action)}
                  </option>
                ))}
              </select>
            </div>

            {/* Date Range */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                الفترة
              </label>
              <div className="flex gap-2">
                <input
                  type="date"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  value={filters.startDate || ''}
                  onChange={(e) =>
                    setDateRangeFilter(e.target.value || undefined, filters.endDate)
                  }
                />
                <input
                  type="date"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  value={filters.endDate || ''}
                  onChange={(e) =>
                    setDateRangeFilter(filters.startDate, e.target.value || undefined)
                  }
                />
              </div>
            </div>
          </div>

          {/* Reset Filters */}
          <div className="mt-4 flex justify-end">
            <button
              onClick={resetFilters}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              إعادة تعيين الفلاتر
            </button>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
          <div className="flex justify-between items-center">
            <span>{error}</span>
            <button onClick={clearError} className="text-red-500 hover:text-red-700">
              ×
            </button>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex justify-center items-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      )}

      {/* Audit Log Table */}
      {!loading && !error && (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  الإجراء
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  الموظف
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  بواسطة
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  التفاصيل
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  التاريخ
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {auditLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                    لا توجد سجلات تدقيق
                  </td>
                </tr>
              ) : (
                auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getActionColor(
                          log.action
                        )}`}
                      >
                        {getAuditActionLabel(log.action)}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      {log.employeeName || '-'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      {log.performedByName || log.performedBy}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 max-w-xs truncate">
                      {log.notes || JSON.stringify(log.details).substring(0, 50)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(log.timestamp)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 mt-4">
          <button
            onClick={() => fetchAuditTrail({ ...filters, page: pagination.page - 1 })}
            disabled={pagination.page === 1 || loading}
            className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50"
          >
            السابق
          </button>
          <span className="text-sm text-gray-600">
            صفحة {pagination.page} من {pagination.totalPages}
          </span>
          <button
            onClick={() => fetchAuditTrail({ ...filters, page: pagination.page + 1 })}
            disabled={pagination.page === pagination.totalPages || loading}
            className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50"
          >
            التالي
          </button>
        </div>
      )}
    </div>
  );
}

export default AuditTrailViewer;