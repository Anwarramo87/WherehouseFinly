import React from 'react';
import { Eye } from "lucide-react";

import type { AggregatedPayroll } from '@/types/payroll-aggregated';

interface PayrollRowProps {
  item: AggregatedPayroll;
  onSelectPayslip: (item: AggregatedPayroll) => void;
  style: React.CSSProperties;
}

const areEqual = (prevProps: PayrollRowProps, nextProps: PayrollRowProps) => {
  // For virtualization, style prop changes on every scroll, so we ignore it.
  // We only care if the actual item data has changed.
  return prevProps.item.employeeId === nextProps.item.employeeId &&
         prevProps.item.netPayRounded === nextProps.item.netPayRounded &&
         (prevProps.item.anomalies ?? []).length === (nextProps.item.anomalies ?? []).length;
};

const PayrollRow: React.FC<PayrollRowProps> = ({ item, onSelectPayslip, style }) => {
  return (
    <div
      style={style}
      onClick={() => onSelectPayslip(item)}
      className="flex w-full min-w-270 bg-white hover:bg-slate-50 transition-colors duration-150 group/row border-b border-slate-200 cursor-pointer"
    >
      {/* الموظف - Employee */}
      <div className="w-[14%] flex items-center justify-center p-4 align-middle border-l border-slate-200">
        <div className="flex flex-col gap-1.5 min-w-0">
          <span className="text-sm font-semibold text-slate-800 truncate max-w-40" title={item.employeeName}>
            {item.employeeName}
          </span>
          <span className="text-[11px] text-slate-500 font-mono">
            {item.employeeId}
          </span>
        </div>
      </div>

      {/* الراتب المستحق - Due Salary */}
      <div className="w-[12%] flex items-center justify-center p-4 align-middle border-l border-slate-200">
        <div className="flex flex-col items-center gap-1">
          <span className="text-sm font-bold text-slate-800 font-mono">
            {Number(item.attendanceBasedSalary).toLocaleString()}
          </span>
          <span className="text-[10px] text-slate-500 font-medium">
            ل.س
          </span>
        </div>
      </div>

      {/* المكافآت - Bonuses */}
      <div className="w-[11%] flex items-center justify-center p-4 align-middle border-l border-slate-200">
        {Number(item.bonusesTotal) > 0 ? (
          <span className="text-sm font-semibold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-full">
            +{Number(item.bonusesTotal).toLocaleString()}
          </span>
        ) : (
          <span className="text-sm text-slate-400">—</span>
        )}
      </div>

      {/* التأمينات - Insurance (new column) */}
      <div className="w-[11%] flex items-center justify-center p-4 align-middle border-l border-slate-200">
        {Number(item.fixedDeductions) > 0 ? (
          <span className="text-sm font-semibold text-rose-600 bg-rose-50/50 px-2 py-1 rounded-full">
            -{Number(item.fixedDeductions).toLocaleString()}
          </span>
        ) : (
          <span className="text-sm text-slate-400">—</span>
        )}
      </div>

      {/* الخصومات - Deductions (العادية + الباص منفصلاً) */}
      <div className="w-[11%] flex flex-col items-center justify-center p-4 gap-1 border-l border-slate-200">
        {/* الخصم العادي */}
        {(Number(item.discountsTotal) - (Number(item.busDeduction ?? 0))) > 0 ? (
          <span className="text-sm font-semibold text-rose-700 bg-rose-50 px-2 py-1 rounded-full">
            -{(Number(item.discountsTotal) - (Number(item.busDeduction ?? 0))).toLocaleString()}
          </span>
        ) : Number(item.discountsTotal) > 0 && (Number(item.busDeduction ?? 0)) === 0 ? (
          <span className="text-sm font-semibold text-rose-700 bg-rose-50 px-2 py-1 rounded-full">
            -{Number(item.discountsTotal).toLocaleString()}
          </span>
        ) : null}
        {/* خصم الباص بالأزرق */}
        {(Number(item.busDeduction ?? 0)) > 0 && (
          <span className="text-[11px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200 flex items-center gap-0.5">
            🚌 -{Number(item.busDeduction ?? 0).toLocaleString()}
          </span>
        )}
        {Number(item.discountsTotal) === 0 && (
          <span className="text-sm text-slate-400">—</span>
        )}
      </div>

      {/* المجموع - Total */}
      <div className="w-[12%] flex items-center justify-center p-4 align-middle border-l border-slate-200">
        <span className="text-sm font-bold text-slate-800 font-mono">
          {Number(item.netPay).toLocaleString()}
        </span>
      </div>

      {/* الفرق - Difference */}
      <div className="w-[7%] flex items-center justify-center p-4 align-middle border-l border-slate-200">
        <span className="text-xs font-bold text-amber-600 font-mono">
          {Number(item.roundingDifference).toLocaleString()}
        </span>
      </div>

      {/* الراتب المقبوض - Net Salary (highlighted) */}
      <div className="w-[14%] flex items-center justify-center p-4 align-middle border-l border-slate-200">
        <span className="bg-amber-50 text-amber-900 border border-amber-200 rounded-xl px-4 py-2 font-bold inline-block w-fit mx-auto">
          {item.netPayRounded.toLocaleString()}
        </span>
        <span className="text-[10px] text-slate-500 font-medium">
          ل.س
        </span>
      </div>

      {/* وصل القبض - Payslip button */}
      <div className="w-[8%] flex items-center justify-center p-4 align-middle">
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onSelectPayslip(item); }}
          className="p-2 rounded-lg bg-slate-100 hover:bg-[#C89355]/20 hover:text-[#C89355] text-slate-400 transition-all active:scale-90"
          title="عرض وصل القبض"
        >
          <Eye size={18} />
        </button>
      </div>
    </div>
  );
};

export default React.memo(PayrollRow, areEqual);
