"use client";

import { useState } from "react";
import { ChevronDown, Database, AlertTriangle, Loader2, Check } from "lucide-react";
import type { ToolStep } from "@/hooks/useAssistant";

/** Arabic labels for the tools, so the trace reads as prose rather than API names. */
const TOOL_LABEL: Record<string, string> = {
  search_employees: "بحث في الموظفين",
  get_employee_profile: "ملف موظف",
  get_attendance_summary: "ملخص الحضور",
  list_leave_requests: "طلبات الإجازة",
  search_products: "بحث في الأصناف",
  get_stock_levels: "أرصدة المخزون",
  list_stock_movements: "حركات المخزون",
  search_sales_orders: "طلبات البيع",
  search_customers: "العملاء",
  search_purchase_orders: "طلبات الشراء",
  search_suppliers: "الموردون",
  navigate: "الانتقال إلى صفحة",
};

const FILTER_LABEL: Record<string, string> = {
  nameContains: "الاسم يحتوي",
  employeeId: "الرقم الوظيفي",
  department: "القسم",
  jobTitle: "المسمى الوظيفي",
  status: "الحالة",
  salaryMin: "الراتب من",
  salaryMax: "الراتب إلى",
  absentDaysMin: "أيام الغياب لا تقل عن",
  absentDaysMax: "أيام الغياب لا تزيد عن",
  leaveDaysMin: "أيام الإجازة لا تقل عن",
  leaveDaysMax: "أيام الإجازة لا تزيد عن",
  periodFrom: "من تاريخ",
  periodTo: "إلى تاريخ",
  from: "من تاريخ",
  to: "إلى تاريخ",
  category: "الفئة",
  sku: "الرمز",
  state: "حالة المخزون",
  limit: "الحد الأقصى",
  route: "الصفحة",
};

/**
 * What the assistant actually queried.
 *
 * This is the difference between a number the user can check and a number they
 * have to take on faith -- it shows which filters were really applied, so a
 * misread question is visible rather than silent.
 */
export default function ToolTrace({ steps }: { steps: ToolStep[] }) {
  const [open, setOpen] = useState(false);
  if (steps.length === 0) return null;

  const running = steps.some((s) => s.status === "running");
  const failed = steps.some((s) => s.status === "error");

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className={`inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[11px] font-black transition-colors
          ${failed ? "text-rose-700 hover:bg-rose-50" : "text-[#263544]/55 hover:bg-[#263544]/5"}`}
      >
        {running ? (
          <Loader2 size={12} className="animate-spin" />
        ) : failed ? (
          <AlertTriangle size={12} />
        ) : (
          <Database size={12} />
        )}
        {running ? "يبحث في البيانات…" : `${steps.length} استعلام`}
        <ChevronDown
          size={12}
          className={`transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <ul className="mt-1.5 flex flex-col gap-1.5 border-r-2 border-[#C89355]/30 pr-3">
          {steps.map((step, i) => (
            <li key={i} className="text-[11px]">
              <div className="flex items-center gap-1.5 font-black text-[#263544]">
                {step.status === "running" && (
                  <Loader2 size={11} className="animate-spin text-[#C89355]" />
                )}
                {step.status === "done" && (
                  <Check size={11} className="text-emerald-600" />
                )}
                {step.status === "error" && (
                  <AlertTriangle size={11} className="text-rose-600" />
                )}
                {TOOL_LABEL[step.name] ?? step.name}
                {step.status === "done" && (
                  <span className="font-bold text-[#263544]/45">
                    · {step.rowCount} نتيجة · {step.ms} م.ث
                  </span>
                )}
              </div>

              {step.status === "error" ? (
                <p className="mt-0.5 font-bold text-rose-700">{step.message}</p>
              ) : (
                <div className="mt-0.5 flex flex-wrap gap-1">
                  {Object.entries(step.args)
                    .filter(([, v]) => v !== undefined && v !== null && v !== "")
                    .map(([key, value]) => (
                      <span
                        key={key}
                        className="rounded-md bg-[#263544]/5 px-1.5 py-0.5 font-bold text-[#263544]/70"
                      >
                        {FILTER_LABEL[key] ?? key}: {String(value)}
                      </span>
                    ))}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
