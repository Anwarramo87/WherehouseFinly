"use client";

import { useQueryClient } from "@tanstack/react-query";
import { Building2, X } from "lucide-react";
import { useFactoryScopeStore } from "@/stores/factory-scope-store";

/**
 * Shown whenever the overseer is looking at one factory's data.
 *
 * Without it the screens are indistinguishable from the platform-wide view —
 * same pages, same layout, different rows — and it becomes genuinely easy to
 * edit the wrong factory's payroll. The banner is deliberately loud and
 * deliberately always dismissible.
 */
export default function FactoryScopeBanner() {
  const factoryId = useFactoryScopeStore((state) => state.factoryId);
  const factoryName = useFactoryScopeStore((state) => state.factoryName);
  const leave = useFactoryScopeStore((state) => state.leave);
  const queryClient = useQueryClient();

  if (!factoryId) return null;

  const exitFactory = () => {
    leave();
    // Every cached query was fetched under the old factory's scope. Keeping any
    // of it would show one factory's rows under another's name.
    queryClient.clear();
  };

  return (
    <div
      role="status"
      className="sticky top-0 z-30 flex flex-wrap items-center justify-between gap-3 border-b border-[#C89355] bg-[#263544] px-4 py-2.5 text-white print:hidden"
      dir="rtl"
    >
      <span className="flex items-center gap-2 text-sm font-bold">
        <Building2 size={16} aria-hidden="true" className="text-[#C89355]" />
        تتصفح بيانات مصنع:
        <span className="text-[#C89355]">{factoryName ?? factoryId}</span>
      </span>

      <button
        type="button"
        onClick={exitFactory}
        className="flex items-center gap-1.5 rounded-lg border border-white/30 px-3 py-1 text-xs font-bold transition-colors hover:border-[#C89355] hover:text-[#C89355]"
      >
        <X size={13} aria-hidden="true" />
        العودة للعرض العام
      </button>
    </div>
  );
}
