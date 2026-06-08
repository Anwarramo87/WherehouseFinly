"use client";

import React from "react";
import { createPortal } from "react-dom";
import { Trash2 } from "lucide-react";

type Passenger = {
  id?: string;
  employeeId: string;
  name?: string;
  paidAmount?: number;
  isManual?: boolean;
};

export default function PassengerDetailModal({
  passenger,
  busId,
  displayAmount,
  onClose,
  onRemove,
}: {
  passenger: Passenger | null;
  busId: string | null;
  displayAmount?: number;
  onClose: () => void;
  onRemove: (busId: string, employeeId: string) => void;
}) {
  if (!passenger) return null;
  if (typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-[#1a2530] rounded-2xl shadow-xl p-6 w-105 rtl text-right border border-[#C89355]/40">
        <h3 className="text-lg font-black mb-2 text-[#C89355]">تفاصيل المشترك</h3>
        <p className="text-sm text-slate-400 mb-4">الكود: <span className="font-mono text-[#C89355] font-bold">{passenger.employeeId}</span></p>
        <p className="text-sm text-white font-bold mb-2">{passenger.name || passenger.employeeId}</p>
        <p className="text-sm text-slate-300 mb-4">المبلغ: {typeof displayAmount === 'number' ? <span className="text-[#C89355] font-bold">{displayAmount.toLocaleString()} ل.س</span> : '—'}</p>

        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-lg bg-[#263544] hover:bg-[#2f3f4d] font-bold text-white transition-colors">إغلاق</button>
          {busId && (
            <button
              onClick={() => {
                if (!confirm('هل أنت متأكد من إزالة هذا الموظف من الباص؟')) return;
                onRemove(busId, passenger.employeeId);
                onClose();
              }}
              className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-black flex items-center gap-2 transition-colors"
            >
              <Trash2 size={16} /> إزالة
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
