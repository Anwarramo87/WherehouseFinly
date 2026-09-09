"use client";

import { ReactNode } from "react";
import { Loader2 } from "lucide-react";
import type { Numeric } from "@/types/wms";
import { toNum } from "@/types/wms";

/**
 * The small pieces every WMS screen repeats: a glass panel, a stat tile, a
 * status pill, a table frame, an empty state. Defined once so thirteen pages
 * cannot drift into thirteen slightly different visual languages.
 */

export const fmtMoney = (value: Numeric | null | undefined, fractionDigits = 2) =>
  toNum(value).toLocaleString("ar-SY", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });

export const fmtInt = (value: Numeric | null | undefined) =>
  toNum(value).toLocaleString("ar-SY", { maximumFractionDigits: 0 });

export const fmtDate = (value: string | null | undefined) =>
  value ? new Date(value).toLocaleDateString("ar-SY", { year: "numeric", month: "2-digit", day: "2-digit" }) : "—";

export const fmtPercent = (value: number | null | undefined) =>
  value === null || value === undefined ? "—" : `${value.toLocaleString("ar-SY")}%`;

// --------------------------------------------------------------------- panel

export function Panel({
  title,
  icon,
  badge,
  actions,
  children,
  className = "",
}: {
  title?: string;
  icon?: ReactNode;
  badge?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`relative bg-white/60 backdrop-blur-2xl rounded-[2.5rem] shadow-[0_20px_50px_rgba(38,53,68,0.08)] border-2 border-white/90 overflow-hidden ${className}`}
    >
      <div className="absolute inset-1.5 rounded-[2.2rem] border border-dashed border-[#C89355]/30 pointer-events-none z-0" />
      <div className="relative z-10">
        {title ? (
          <div className="p-6 border-b border-white/80 bg-white/40 flex flex-wrap items-center justify-between gap-4">
            <h2 className="text-lg font-black text-[#263544] flex items-center gap-3">
              {icon ? <span className="text-[#C89355]">{icon}</span> : null}
              {title}
              {badge}
            </h2>
            {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
          </div>
        ) : null}
        {children}
      </div>
    </div>
  );
}

// ----------------------------------------------------------------- stat tile

const TONES = {
  neutral: "from-[#263544] to-[#1a2530] text-[#C89355]",
  danger: "from-[#7f1d1d] to-[#991b1b] text-red-100",
  warning: "from-[#78350f] to-[#92400e] text-amber-100",
  success: "from-[#14532d] to-[#166534] text-emerald-100",
  info: "from-[#1e3a5f] to-[#1e40af] text-sky-100",
} as const;

export type StatTone = keyof typeof TONES;

export function Stat({
  label,
  value,
  hint,
  tone = "neutral",
  icon,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  tone?: StatTone;
  icon?: ReactNode;
}) {
  return (
    <div
      className={`relative rounded-3xl p-5 bg-gradient-to-br ${TONES[tone]} shadow-[0_15px_30px_rgba(38,53,68,0.25)] border border-white/10 overflow-hidden`}
    >
      <div className="absolute inset-1.5 rounded-[1.35rem] border border-dashed border-white/15 pointer-events-none" />
      <div className="relative z-10">
        <div className="flex items-start justify-between gap-3">
          <p className="text-[11px] font-black uppercase tracking-wide opacity-75">{label}</p>
          {icon ? <span className="opacity-70">{icon}</span> : null}
        </div>
        <p className="text-2xl font-black mt-2 tabular-nums">{value}</p>
        {hint ? <p className="text-[11px] font-bold opacity-70 mt-1">{hint}</p> : null}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------- pill

const PILL_TONES: Record<string, string> = {
  green: "bg-emerald-50 text-emerald-700 border-emerald-200",
  red: "bg-red-50 text-red-700 border-red-200",
  amber: "bg-amber-50 text-amber-700 border-amber-200",
  slate: "bg-slate-100 text-slate-700 border-slate-200",
  blue: "bg-sky-50 text-sky-700 border-sky-200",
  gold: "bg-[#C89355]/10 text-[#8a5f2a] border-[#C89355]/30",
};

export function Pill({ tone = "slate", children }: { tone?: keyof typeof PILL_TONES; children: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-[11px] font-black border ${PILL_TONES[tone]}`}
    >
      {children}
    </span>
  );
}

/** Maps every status enum the API returns onto an Arabic label and a colour. */
export const STATUS_META: Record<string, { label: string; tone: keyof typeof PILL_TONES }> = {
  // batches
  AVAILABLE: { label: "متاحة", tone: "green" },
  QUARANTINE: { label: "محجورة", tone: "amber" },
  NEAR_EXPIRY: { label: "قاربت الانتهاء", tone: "amber" },
  EXPIRED: { label: "منتهية", tone: "red" },
  CONSUMED: { label: "مستهلكة", tone: "slate" },
  REJECTED: { label: "مرفوضة", tone: "red" },
  // documents
  DRAFT: { label: "مسودة", tone: "slate" },
  POSTED: { label: "مُرحّلة", tone: "blue" },
  PARTIALLY_PAID: { label: "مدفوعة جزئياً", tone: "amber" },
  PAID: { label: "مدفوعة", tone: "green" },
  CANCELLED: { label: "ملغاة", tone: "red" },
  // counts and picks
  IN_PROGRESS: { label: "جارٍ", tone: "blue" },
  REVIEW: { label: "قيد المراجعة", tone: "amber" },
  COMPLETED: { label: "مكتمل", tone: "green" },
  PENDING: { label: "بالانتظار", tone: "slate" },
  ASSIGNED: { label: "مُسنَد", tone: "blue" },
  COUNTED: { label: "مجرود", tone: "blue" },
  RECOUNT: { label: "إعادة جرد", tone: "amber" },
  APPROVED: { label: "معتمد", tone: "green" },
  // quality
  PASSED: { label: "ناجح", tone: "green" },
  FAILED: { label: "راسب", tone: "red" },
  PARTIAL: { label: "جزئي", tone: "amber" },
  // shipments
  LABELED: { label: "مُلصَقة", tone: "blue" },
  DISPATCHED: { label: "خرجت", tone: "blue" },
  IN_TRANSIT: { label: "في الطريق", tone: "blue" },
  DELIVERED: { label: "سُلّمت", tone: "green" },
  RETURNED: { label: "مرتجعة", tone: "red" },
};

export function StatusPill({ status }: { status: string }) {
  const meta = STATUS_META[status] ?? { label: status, tone: "slate" as const };
  return <Pill tone={meta.tone}>{meta.label}</Pill>;
}

// --------------------------------------------------------------------- table

export function TableFrame({ head, children }: { head: ReactNode; children: ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-right">
        <thead className="bg-[#1a2530] text-[#C89355]">
          <tr className="[&>th]:px-4 [&>th]:py-3 [&>th]:font-black [&>th]:text-xs [&>th]:whitespace-nowrap">
            {head}
          </tr>
        </thead>
        <tbody className="divide-y divide-white/70">{children}</tbody>
      </table>
    </div>
  );
}

export function Empty({ message }: { message: string }) {
  return (
    <div className="py-16 text-center text-sm font-bold text-[#263544]/50">{message}</div>
  );
}

export function Loading({ label = "جارٍ التحميل..." }: { label?: string }) {
  return (
    <div className="py-16 flex items-center justify-center gap-3 text-sm font-bold text-[#263544]/60">
      <Loader2 size={18} className="animate-spin text-[#C89355]" />
      {label}
    </div>
  );
}

// -------------------------------------------------------------------- inputs

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-black text-[#263544]/70 mb-1.5">{label}</label>
      {children}
    </div>
  );
}

export const inputClass =
  "w-full px-4 py-2.5 rounded-2xl bg-white/80 border border-white text-sm font-bold text-[#263544] outline-none focus:border-[#C89355]/60 focus:ring-2 focus:ring-[#C89355]/20 transition-all";

export function Button({
  children,
  variant = "primary",
  loading = false,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost" | "danger";
  loading?: boolean;
}) {
  const styles = {
    primary:
      "bg-[#1a2530] text-[#C89355] border border-[#C89355]/40 shadow-[0_10px_20px_rgba(38,53,68,0.35)] hover:bg-[#263544]",
    ghost:
      "bg-white/70 text-[#263544] border border-white hover:bg-white hover:border-[#C89355]/30 shadow-sm",
    danger: "bg-red-600 text-white border border-red-500 shadow-sm hover:bg-red-700",
  } as const;

  return (
    <button
      {...props}
      disabled={props.disabled || loading}
      className={`inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-black transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${styles[variant]} ${props.className ?? ""}`}
    >
      {loading ? <Loader2 size={16} className="animate-spin" /> : null}
      {children}
    </button>
  );
}
