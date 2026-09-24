"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import {
  Loader2,
  UserPlus,
  KeyRound,
  X,
  Shield,
  Search,
  Clock3,
  Mail,
  Crown,
  UserCheck,
  CalendarClock,
  Sparkles,
} from "lucide-react";
import { useAuthStore } from "@/stores/auth-store";
import apiClient from "@/lib/api-client";
import {
  useFactoryUserEntitlements,
  useToggleUserEntitlement,
} from "@/hooks/useSuperAdmin";

import { UserEntitlementsPanel } from "./UserEntitlementsPanel";
import { UserSubscriptionPanel } from "./UserSubscriptionPanel";

interface FactoryUser {
  id: string;
  username: string;
  email: string | null;
  status: string;
  lastLogin: string | null;
  role: { id: string; name: string } | null;
}

interface Role {
  id: string;
  name: string;
  description?: string | null;
}

/** Small helper: user initials for avatar */
function initials(name: string) {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function formatLastLogin(value: string | null) {
  if (!value) return "لم يدخل بعد";
  try {
    const d = new Date(value);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffH = Math.floor(diffMs / 3600000);
    if (diffH < 1) return "منذ دقائق";
    if (diffH < 24) return `منذ ${diffH} ساعة`;
    const diffD = Math.floor(diffH / 24);
    if (diffD < 7) return `منذ ${diffD} يوم`;
    return d.toLocaleDateString("ar", { year: "numeric", month: "short", day: "numeric" });
  } catch {
    return new Date(value).toLocaleDateString("ar");
  }
}

export default function FactoryUsersPanel({
  tenantId,
  factoryName,
}: {
  tenantId: string;
  factoryName: string;
}) {
  const queryClient = useQueryClient();
  const [isAdding, setIsAdding] = useState(false);
  const [entitlementsUserId, setEntitlementsUserId] = useState<string | null>(null);
  const [subscriptionUserId, setSubscriptionUserId] = useState<string | null>(null);
  const [form, setForm] = useState({ username: "", email: "", password: "", roleId: "" });

  const { data: userEntitlements } = useFactoryUserEntitlements(tenantId, entitlementsUserId);
  const toggleUserEntitlement = useToggleUserEntitlement(tenantId, entitlementsUserId);

  const { data: users = [], isLoading } = useQuery<FactoryUser[]>({
    queryKey: ["super-admin", "users", tenantId],
    queryFn: async () =>
      (await apiClient.get(`/admin/tenants/${tenantId}/users`)).data as FactoryUser[],
  });

  const { data: roles = [] } = useQuery<Role[]>({
    queryKey: ["super-admin", "roles"],
    queryFn: async () => (await apiClient.get("/auth/roles")).data as Role[],
  });

  const createUser = useMutation({
    mutationFn: async () =>
      apiClient.post("/auth/users", {
        username: form.username.trim(),
        email: form.email.trim() || undefined,
        password: form.password,
        roleId: form.roleId,
        tenantId,
      }),
    onSuccess: () => {
      toast.success("تم إنشاء الحساب");
      setForm({ username: "", email: "", password: "", roleId: "" });
      setIsAdding(false);
      void queryClient.invalidateQueries({ queryKey: ["super-admin", "users", tenantId] });
      void queryClient.invalidateQueries({ queryKey: ["super-admin", "factories"] });
    },
    onError: (error: unknown) => {
      const message =
        (error as { response?: { data?: { error?: { message?: string } } } })?.response?.data
          ?.error?.message ?? "تعذّر إنشاء الحساب";
      toast.error(message);
    },
  });

  const currentRoles = useAuthStore((s) => s.user?.roles);
  const currentRole = useAuthStore((s) => s.user?.role);
  const isSuperAdmin =
    currentRoles?.includes("superadmin") || currentRole === "superadmin";

  const canSubmit =
    form.username.trim().length > 0 &&
    form.email.trim().length > 0 &&
    form.password.length >= 8 &&
    form.roleId.length > 0;

  // Only admin-level roles are creatable from SuperAdmin.
  // Regular employees (role === "employee") must be added inside the
  // tenant's own HR module (/employees), not from here.
  const adminRoles = roles.filter((r) => {
    const name = (r.name ?? "").trim().toLowerCase();
    return name !== "employee" && name !== "staff";
  });

  /** حسابات السوبر أدمن لا تخضع للاشتراك — وصول مفتوح دائماً */
  const isSuperAdminAccount = (user: FactoryUser) => {
    const r = (user.role?.name ?? "").trim().toLowerCase();
    return r === "superadmin" || r === "super_admin" || r === "super admin";
  };

  const activeCount = users.filter((u) => u.status === "active").length;
  const selectedUser = entitlementsUserId ? users.find((u) => u.id === entitlementsUserId) : null;
  const selectedSubUser = subscriptionUserId
    ? users.find((u) => u.id === subscriptionUserId)
    : null;

  // Only one inline drawer at a time: opening one side closes the other.
  const toggleEntitlements = (id: string) => {
    setSubscriptionUserId(null);
    setEntitlementsUserId((current) => (current === id ? null : id));
  };
  const toggleSubscription = (id: string) => {
    setEntitlementsUserId(null);
    setSubscriptionUserId((current) => (current === id ? null : id));
  };

  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      {/* ── header ── */}
      <div className="relative border-b border-slate-100 bg-gradient-to-l from-[#263544]/[0.04] via-white to-white px-5 py-4 sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#263544] text-[#C89355] shadow-sm">
              <Shield size={18} aria-hidden="true" />
            </div>
            <div>
              <h3 className="flex items-center gap-2 text-[15px] font-black text-[#263544]">
                حسابات الدخول
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-600">
                  {users.length} حساب
                </span>
              </h3>
              <p className="mt-0.5 max-w-[42ch] text-xs leading-5 text-slate-500">
                من يستطيع الدخول إلى <span className="font-bold text-[#263544]">{factoryName}</span>
                {" · "}
                <span className="inline-flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
                  {activeCount} نشط
                </span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsAdding((open) => !open)}
            aria-expanded={isAdding}
            className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold shadow-sm transition-all ${
              isAdding
                ? "bg-white text-[#263544] border border-slate-200 hover:bg-slate-50"
                : "bg-[#263544] text-[#C89355] hover:bg-[#1e2a36] hover:shadow"
            }`}
          >
            {isAdding ? <X size={14} aria-hidden="true" /> : <UserPlus size={14} aria-hidden="true" />}
            {isAdding ? "إلغاء" : "إضافة حساب"}
          </button>
        </div>
      </div>

      {/* ── add-user form ── */}
      {isAdding && (
        <div className="border-b border-slate-100 bg-slate-50/70 px-5 py-4 sm:px-6">
          <div className="mb-3 flex items-center gap-2 text-xs font-bold text-[#263544]">
            <Sparkles size={13} className="text-[#C89355]" aria-hidden="true" />
            حساب جديد في {factoryName}
          </div>
          <form
            className="grid gap-3 sm:grid-cols-2"
            onSubmit={(event) => {
              event.preventDefault();
              if (canSubmit) createUser.mutate();
            }}
          >
            <Field
              id="new-username"
              label="اسم المستخدم"
              placeholder="مثال: anwar.hr"
              value={form.username}
              onChange={(value) => setForm((f) => ({ ...f, username: value }))}
              autoComplete="off"
            />
              <Field
                id="new-email"
                label={<><span className="text-rose-500">*</span> الإيميل</>}
                placeholder="anwar@factory.com"
                type="email"
                value={form.email}
                onChange={(value) => setForm((f) => ({ ...f, email: value }))}
                autoComplete="off"
              />
            <Field
              id="new-password"
              label="كلمة المرور (8 أحرف على الأقل)"
              placeholder="••••••••"
              type="password"
              value={form.password}
              onChange={(value) => setForm((f) => ({ ...f, password: value }))}
              autoComplete="new-password"
            />
            <div className="flex flex-col gap-1.5">
              <label htmlFor="new-role" className="text-xs font-bold text-slate-600">
                الدور
              </label>
              <div className="relative">
                <select
                  id="new-role"
                  value={form.roleId}
                  onChange={(event) => setForm((f) => ({ ...f, roleId: event.target.value }))}
                  className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-3 py-2.5 pr-9 text-sm outline-none transition-colors focus:border-[#263544] focus:ring-2 focus:ring-[#263544]/10"
                >
                  <option value="">اختر دوراً…</option>
                  {adminRoles.map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.name}
                    </option>
                  ))}
                </select>
                <Crown
                  size={14}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  aria-hidden="true"
                />
              </div>
            </div>

            <div className="sm:col-span-2 flex justify-end pt-1">
              <button
                type="submit"
                disabled={!canSubmit || createUser.isPending}
                aria-busy={createUser.isPending}
                className="inline-flex items-center gap-2 rounded-xl bg-[#263544] px-5 py-2.5 text-sm font-bold text-[#C89355] shadow-sm transition-all hover:bg-[#1e2a36] disabled:opacity-50 disabled:shadow-none"
              >
                {createUser.isPending && (
                  <Loader2 className="animate-spin" size={14} aria-hidden="true" />
                )}
                إنشاء الحساب
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── table ── */}
      <div className="px-2 sm:px-0">
        {isLoading && (
          <div className="flex items-center gap-3 px-6 py-8 text-sm text-slate-500">
            <Loader2 className="animate-spin" size={16} aria-hidden="true" />
            جارٍ تحميل الحسابات…
          </div>
        )}

        {!isLoading && users.length === 0 && (
          <div className="px-6 py-10 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
              <Search size={20} aria-hidden="true" />
            </div>
            <p className="text-sm font-bold text-slate-600">لا توجد حسابات لهذا المصنع بعد</p>
            <p className="mx-auto mt-1 max-w-sm text-xs leading-5 text-slate-500">
              أنشئ أول حساب ليتمكن فريقه من تسجيل الدخول وإدارة بياناته.
            </p>
          </div>
        )}

        {users.length > 0 && (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/60 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="whitespace-nowrap px-4 py-3 text-right sm:px-6">المستخدم</th>
                  <th className="whitespace-nowrap px-3 py-3 text-right">الدور</th>
                  <th className="whitespace-nowrap px-3 py-3 text-center">الحالة</th>
                  <th className="whitespace-nowrap px-3 py-3 text-center">الإعدادات</th>
                  <th className="whitespace-nowrap px-4 py-3 text-right sm:px-6">آخر دخول</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((user) => {
                  const isSelected =
                    entitlementsUserId === user.id || subscriptionUserId === user.id;
                  return (
                    <tr
                      key={user.id}
                      className={`group transition-colors ${
                        isSelected ? "bg-[#263544]/[0.04]" : "hover:bg-slate-50/70"
                      }`}
                    >
                      <td className="px-4 py-3 sm:px-6">
                        <div className="flex items-center gap-3">
                          <div
                            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-black shadow-sm ring-1 ${
                              isSelected
                                ? "bg-[#263544] text-[#C89355] ring-[#263544]"
                                : "bg-slate-100 text-slate-600 ring-slate-200 group-hover:bg-white"
                            }`}
                            aria-hidden="true"
                          >
                            {initials(user.username)}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="truncate text-sm font-bold text-[#263544]">
                                {user.username}
                              </span>
                              {user.role?.name?.toLowerCase().includes("admin") && (
                                <Crown size={12} className="shrink-0 text-[#C89355]" aria-hidden="true" />
                              )}
                            </div>
                            {user.email ? (
                              <span className="flex items-center gap-1 truncate text-xs text-slate-500">
                                <Mail size={11} className="shrink-0 opacity-60" aria-hidden="true" />
                                {user.email}
                              </span>
                            ) : (
                              <span className="text-xs text-slate-400">— بلا إيميل</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-3 py-3">
                        <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-slate-700">
                          <Shield size={11} className="text-slate-400" aria-hidden="true" />
                          {user.role?.name ?? "—"}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-center">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${
                            user.status === "active"
                              ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                              : "bg-slate-100 text-slate-600 ring-slate-200"
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              user.status === "active" ? "bg-emerald-500" : "bg-slate-400"
                            }`}
                            aria-hidden="true"
                          />
                          {user.status === "active" ? "نشط" : user.status}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-center">
                        <span className="inline-flex flex-wrap items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => toggleEntitlements(user.id)}
                            aria-expanded={entitlementsUserId === user.id}
                            aria-label={`صلاحيات ${user.username}`}
                            className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold shadow-sm ring-1 transition-all ${
                              entitlementsUserId === user.id
                                ? "bg-[#263544] text-white ring-[#263544] shadow"
                                : "bg-white text-[#263544] ring-slate-200 hover:border-[#C89355]/40 hover:bg-[#C89355]/10 hover:text-[#263544] hover:ring-[#C89355]/30"
                            }`}
                          >
                            <KeyRound size={13} aria-hidden="true" />
                            {entitlementsUserId === user.id ? "مفتوحة" : "الصلاحيات"}
                          </button>
                          {!isSuperAdminAccount(user) && (
                            <button
                              type="button"
                              onClick={() => toggleSubscription(user.id)}
                              aria-expanded={subscriptionUserId === user.id}
                              aria-label={`اشتراك ${user.username}`}
                              className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold shadow-sm ring-1 transition-all ${
                                subscriptionUserId === user.id
                                  ? "bg-[#263544] text-white ring-[#263544] shadow"
                                  : "bg-white text-[#263544] ring-slate-200 hover:border-[#C89355]/40 hover:bg-[#C89355]/10 hover:text-[#263544] hover:ring-[#C89355]/30"
                              }`}
                            >
                              <CalendarClock size={13} aria-hidden="true" />
                              {subscriptionUserId === user.id ? "مفتوحة" : "الاشتراك"}
                            </button>
                          )}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right sm:px-6">
                        <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                          <Clock3 size={12} className="opacity-60" aria-hidden="true" />
                          {formatLastLogin(user.lastLogin)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── per-admin entitlements drawer ── */}
      {entitlementsUserId && (
        <div className="border-t border-slate-100 bg-gradient-to-b from-slate-50/80 to-white px-4 py-4 sm:px-6">
          {selectedUser && (
            <div className="mb-3 flex items-center gap-2 text-xs text-slate-500">
              <span className="h-px flex-1 bg-slate-200" aria-hidden="true" />
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#263544]/10 bg-white px-3 py-1 font-bold text-[#263544] shadow-sm">
                <UserCheck size={12} className="text-[#C89355]" aria-hidden="true" />
                صلاحيات: {selectedUser.username}
                {selectedUser.email && (
                  <span className="font-normal text-slate-400">· {selectedUser.email}</span>
                )}
              </span>
              <span className="h-px flex-1 bg-slate-200" aria-hidden="true" />
            </div>
          )}
          <UserEntitlementsPanel
            tenantId={tenantId}
            userId={entitlementsUserId}
            onClose={() => setEntitlementsUserId(null)}
          />
        </div>
      )}

      {/* ── per-admin subscription drawer ── */}
      {subscriptionUserId && (
        <div className="border-t border-slate-100 bg-gradient-to-b from-slate-50/80 to-white px-4 py-4 sm:px-6">
          {selectedSubUser && (
            <div className="mb-3 flex items-center gap-2 text-xs text-slate-500">
              <span className="h-px flex-1 bg-slate-200" aria-hidden="true" />
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#263544]/10 bg-white px-3 py-1 font-bold text-[#263544] shadow-sm">
                <CalendarClock size={12} className="text-[#C89355]" aria-hidden="true" />
                اشتراك: {selectedSubUser.username}
                {selectedSubUser.email && (
                  <span className="font-normal text-slate-400">· {selectedSubUser.email}</span>
                )}
              </span>
              <span className="h-px flex-1 bg-slate-200" aria-hidden="true" />
            </div>
          )}
          <UserSubscriptionPanel
            tenantId={tenantId}
            userId={subscriptionUserId}
            onClose={() => setSubscriptionUserId(null)}
          />
        </div>
      )}
    </article>
  );
}

function Field({
  id,
  label,
  value,
  placeholder,
  onChange,
  type = "text",
  autoComplete,
}: {
  id: string;
  label: React.ReactNode;
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
  type?: string;
  autoComplete?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-xs font-bold text-slate-700">
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        placeholder={placeholder}
        autoComplete={autoComplete}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm placeholder:text-slate-400 outline-none transition-all focus:border-[#263544] focus:ring-2 focus:ring-[#263544]/10"
      />
    </div>
  );
}
