"use client";

import { useState } from "react";
import {
  CalendarCheck,
  CalendarClock,
  CalendarPlus,
  Infinity as InfinityIcon,
  Loader2,
  Lock,
  Power,
  Sparkles,
  X,
} from "lucide-react";
import {
  useAdminSubscription,
  useSetAdminSubscription,
} from "@/hooks/useSuperAdmin";

function planLabel(plan: string) {
  if (plan === "monthly") return "شهري";
  if (plan === "yearly") return "سنوي";
  if (plan === "lifetime") return "دائم";
  return "مخصص";
}

function formatDate(iso: string | null | undefined) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("ar", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

const presets = [
  { label: "شهر", months: 1 },
  { label: "3 أشهر", months: 3 },
  { label: "6 أشهر", months: 6 },
  { label: "سنة", months: 12 },
] as const;

export function UserSubscriptionPanel({
  tenantId,
  userId,
  onClose,
}: {
  tenantId: string;
  userId: string;
  onClose: () => void;
}) {
  const { data: subscription, isLoading } = useAdminSubscription(tenantId, userId);
  const setSubscription = useSetAdminSubscription(tenantId, userId);
  const [customMonths, setCustomMonths] = useState("");

  const pending = setSubscription.isPending;
  const expired = subscription?.status === "expired";
  const permanent = subscription?.permanent === true;

  const applyMonths = (months: number) => setSubscription.mutate({ months });
  const makePermanent = () => setSubscription.mutate({ permanent: true });
  const stopNow = () => setSubscription.mutate({ endsAt: new Date().toISOString() });

  const applyCustom = () => {
    const n = Math.floor(Number(customMonths));
    if (!Number.isFinite(n) || n < 1) return;
    applyMonths(n);
    setCustomMonths("");
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      {/* header — same rhythm as the entitlements panel */}
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 bg-gradient-to-l from-[#263544]/[0.06] via-slate-50 to-white px-4 py-3 sm:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#263544] text-[#C89355] shadow-sm">
            <CalendarClock size={16} aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h4 className="flex items-center gap-1.5 text-sm font-black text-[#263544]">
              اشتراك هذا الحساب
              <Sparkles size={12} className="text-[#C89355]" aria-hidden="true" />
            </h4>
            <p className="truncate text-xs text-slate-500">
              مدة الوصول الزمنية لهذا الآدمن فقط — لا تنطبق على باقي آدمن المصنع
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="إغلاق"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 shadow-sm transition-colors hover:bg-slate-50"
        >
          <X size={13} aria-hidden="true" />
          إغلاق
        </button>
      </div>

      <div className="p-3 sm:p-4">
        {isLoading && (
          <div className="flex items-center gap-2 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
            <Loader2 className="animate-spin" size={16} aria-hidden="true" />
            جارٍ تحميل الاشتراك…
          </div>
        )}

        {!isLoading && !subscription && (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-5">
            <p className="text-xs leading-5 text-slate-500">
              هذا الحساب يعمل بالوصول المفتوح حالياً — يرث ما توفره المصنع له.
              فعّل اشتراكاً زمنياً ليُغلق تلقائياً عند انتهاء مدته.
            </p>
            <div className="mt-3">
              <PlanActions
                pending={pending}
                customMonths={customMonths}
                onCustomMonths={setCustomMonths}
                onApplyCustom={applyCustom}
                onMonths={applyMonths}
                onPermanent={makePermanent}
              />
            </div>
          </div>
        )}

        {!isLoading && subscription && (
          <>
            <div
              className={`mb-4 rounded-2xl p-4 ring-1 ${
                expired ? "bg-rose-50/70 ring-rose-200" : "bg-emerald-50/60 ring-emerald-200"
              }`}
            >
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <span className="inline-flex items-center gap-1.5 text-sm font-black text-[#263544]">
                  {permanent && (
                    <InfinityIcon size={15} className="text-[#C89355]" aria-hidden="true" />
                  )}
                  {permanent
                    ? "اشتراك دائم — لا ينتهي"
                    : `${planLabel(subscription.plan)} · ينتهي ${formatDate(subscription.endsAt)}`}
                </span>
                {!expired && !permanent && (
                  <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-emerald-700 ring-1 ring-emerald-200 tabular-nums">
                    متبقي {subscription.daysLeft} يوم
                  </span>
                )}
                {expired && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600">
                    <Lock size={11} aria-hidden="true" />
                    الوحدات مغلقة لهذا الحساب
                  </span>
                )}
              </div>

              <dl className="mt-3 grid gap-x-6 gap-y-1.5 text-xs sm:grid-cols-2">
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-slate-500">البداية</dt>
                  <dd className="font-bold tabular-nums text-[#263544]">
                    {formatDate(subscription.startsAt)}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-slate-500">النهاية</dt>
                  <dd className="font-bold tabular-nums text-[#263544]">
                    {permanent ? "لا تنتهي" : formatDate(subscription.endsAt)}
                  </dd>
                </div>
              </dl>
            </div>

            {!permanent && (
              <>
                <p className="mb-2 text-xs font-bold text-[#263544]">تعديل الاشتراك</p>
                <PlanActions
                  pending={pending}
                  customMonths={customMonths}
                  onCustomMonths={setCustomMonths}
                  onApplyCustom={applyCustom}
                  onMonths={applyMonths}
                  onPermanent={makePermanent}
                />
              </>
            )}

            {!expired && (
              <button
                type="button"
                disabled={pending}
                onClick={stopNow}
                className="mt-3 inline-flex items-center gap-1.5 rounded-xl border border-rose-300 bg-white px-3.5 py-2 text-xs font-bold text-rose-700 shadow-sm transition-all hover:bg-rose-50 disabled:opacity-50"
              >
                <Power size={13} aria-hidden="true" />
                {permanent ? "إنهاء الاشتراك الدائم" : "إيقاف الآن"}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/** Preset durations + permanent + a custom months input, one shared action row. */
function PlanActions({
  pending,
  customMonths,
  onCustomMonths,
  onApplyCustom,
  onMonths,
  onPermanent,
}: {
  pending: boolean;
  customMonths: string;
  onCustomMonths: (value: string) => void;
  onApplyCustom: () => void;
  onMonths: (months: number) => void;
  onPermanent: () => void;
}) {
  const customValue = Number(customMonths);
  const customValid = Number.isFinite(customValue) && Math.floor(customValue) >= 1;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {presets.map((preset) => (
        <button
          key={preset.months}
          type="button"
          disabled={pending}
          onClick={() => onMonths(preset.months)}
          className="inline-flex items-center gap-1.5 rounded-xl bg-[#263544] px-3.5 py-2 text-xs font-bold text-[#C89355] shadow-sm transition-all hover:bg-[#1e2a36] hover:shadow disabled:opacity-50 disabled:shadow-none"
        >
          {preset.months === 1 ? (
            <CalendarPlus size={13} aria-hidden="true" />
          ) : (
            <CalendarCheck size={13} aria-hidden="true" />
          )}
          {preset.label}
        </button>
      ))}

      <button
        type="button"
        disabled={pending}
        onClick={onPermanent}
        className="inline-flex items-center gap-1.5 rounded-xl bg-[#263544] px-3.5 py-2 text-xs font-bold text-[#C89355] shadow-sm transition-all hover:bg-[#1e2a36] hover:shadow disabled:opacity-50 disabled:shadow-none"
      >
        <InfinityIcon size={13} aria-hidden="true" />
        دائم
      </button>

      <span className="flex items-center gap-2">
        <input
          type="number"
          min={1}
          value={customMonths}
          onChange={(event) => onCustomMonths(event.target.value)}
          placeholder="أشهر مخصصة"
          aria-label="عدد الأشهر المخصصة"
          className="w-28 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm placeholder:text-slate-400 outline-none transition-all focus:border-[#263544] focus:ring-2 focus:ring-[#263544]/10"
        />
        <button
          type="button"
          disabled={pending || !customValid}
          onClick={onApplyCustom}
          className="inline-flex items-center gap-1 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-sm transition-all hover:border-[#C89355]/50 hover:bg-[#C89355]/10 disabled:opacity-50"
        >
          تطبيق
        </button>
      </span>
    </div>
  );
}