"use client";

import React from "react";
import { useVirtualizer, VirtualItem } from "@tanstack/react-virtual";
import PayrollRow from "@/components/PayrollRow";
import type { AggregatedPayroll } from "@/types/payroll-aggregated";

interface PayrollVirtualTableProps {
  allRows: Array<AggregatedPayroll>;
  onSelectPayslip: (item: AggregatedPayroll) => void;
}

/**
 * Virtualized Payroll Table Wrapper
 * 
 * TanStack Virtual's `useVirtualizer` returns functions that cannot be memoized,
 * so we isolate it here to keep the rest of the page React Compiler compatible.
 */
export function PayrollVirtualTable({
  allRows,
  onSelectPayslip,
}: PayrollVirtualTableProps) {
  const parentRef = React.useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({ // eslint-disable-line react-hooks/incompatible-library
    count: allRows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 96,
    overscan: 5,
  });

  return (
    <div
      className="relative bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden"
      dir="rtl"
    >
      <div
        ref={parentRef}
        className="w-full overflow-x-auto custom-scrollbar relative z-10"
        style={{ height: "75vh", minHeight: "500px" }}
      >
        {/* Header */}
        <div className="flex w-full min-w-212.5 bg-slate-100 border-b border-slate-200 sticky top-0 z-20 shadow-sm">
          <div className="w-[15%] justify-center px-4 py-4 font-bold text-xs text-slate-700 flex items-center">
            الموظف
          </div>
          <div className="w-[15%] justify-center px-4 py-4 font-bold text-xs text-slate-700 border-r border-slate-200 flex items-center">
            الراتب المستحق
          </div>
          <div className="w-[14%] justify-center px-4 py-4 font-bold text-xs text-slate-700 border-r border-slate-200 flex items-center">
            المكافآت
          </div>
          <div className="w-[14%] justify-center px-4 py-4 font-bold text-xs text-slate-700 border-r border-slate-200 flex items-center">
            الخصومات
          </div>
          <div className="w-[15%] justify-center px-4 py-4 font-bold text-xs text-slate-700 border-r border-slate-200 flex items-center">
            المجموع
          </div>
          <div className="w-[10%] justify-center px-4 py-4 font-bold text-xs text-slate-700 bg-amber-50/50 border-r border-slate-200 flex items-center">
            الفرق
          </div>
          <div className="w-[17%] justify-center px-4 py-4 font-bold text-xs text-amber-700 bg-amber-50/50 border-r border-amber-200/50 flex items-center">
            الراتب المقبوض
          </div>
        </div>

        {/* Virtualized rows */}
        <div style={{ position: "relative", height: `${rowVirtualizer.getTotalSize()}px` }}>
          {rowVirtualizer.getVirtualItems().map((virtualItem: VirtualItem) => {
            const row = allRows[virtualItem.index];
            return (
              <PayrollRow
                key={virtualItem.index}
                item={row}
                onSelectPayslip={() => onSelectPayslip(row)}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: `${virtualItem.size}px`,
                  transform: `translateY(${virtualItem.start}px)`,
                }}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
